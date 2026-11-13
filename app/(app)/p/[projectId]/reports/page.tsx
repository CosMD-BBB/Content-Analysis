import Link from "next/link";
import { ChannelBadge } from "@/components/badges";
import { Cover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { MetricsForm } from "@/components/metrics-form";
import { PageHead } from "@/components/page-head";
import { CATALOG } from "@/src/channels/catalog";
import { getDb } from "@/src/db/client";
import { listMedia } from "@/src/media/service";
import { addDaysKey, bangkokDayKey, formatThai, fromBangkokInput } from "@/src/lib/time";
import { bestTimes, engagement, groupBy, loadReportRows, summarize, type ReportRow } from "@/src/reports/aggregate";
import { projectPage } from "@/src/server/context";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const n = (x: number) => x.toLocaleString("en-US");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DOW = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

function Delta({ cur, prev, points }: { cur: number; prev: number; points?: boolean }) {
  if (!prev) return <span className="faint">ไม่มีข้อมูลช่วงก่อน</span>;
  const d = points ? (cur - prev) * 100 : ((cur - prev) / prev) * 100;
  return <><span className={d >= 0 ? "up" : "down"}>{d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(points ? 1 : 0)}{points ? " จุด" : "%"}</span> เทียบช่วงก่อน</>;
}

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ days?: string; sort?: string }> }) {
  const { projectId } = await params;
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const ctx = await projectPage(projectId);
  if (!ctx.can("reports")) return <div className="banner">บทบาทของคุณดูรายงานไม่ได้</div>;
  const all = await loadReportRows(getDb(), ctx.user.id, projectId);
  const now = new Date();
  const range = { from: new Date(now.getTime() - days * 864e5), to: new Date(now.getTime() + 60_000) };
  const prevRange = { from: new Date(now.getTime() - 2 * days * 864e5), to: range.from };
  const cur = summarize(all, range), prev = summarize(all, prevRange);
  const rows = all.filter((r) => r.publishedAt >= range.from && r.publishedAt < range.to);
  const byPlatform = groupBy(rows, "platform");
  const byWorkType = groupBy(rows, "workTypeId");
  const byPillar = groupBy(rows, "pillarId");
  const heat = bestTimes(all.filter((r) => r.publishedAt >= new Date(now.getTime() - 90 * 864e5)));
  const heatMax = Math.max(0, ...heat.flat().map((v) => v ?? 0));
  const missing = rows.filter((r) => !r.source && (r.publishState === "posted" || r.publishState === "manual_done"));

  // ยอดวิวตามวันที่โพสต์ (ระยะ 1 ยังไม่มีสถิติรายวันจาก API)
  const today = bangkokDayKey(now);
  const dayKeys = Array.from({ length: days }, (_, i) => addDaysKey(today, i - days + 1));
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(bangkokDayKey(r.publishedAt), (byDay.get(bangkokDayKey(r.publishedAt)) ?? 0) + (r.views ?? 0));
  const maxDay = Math.max(1, ...byDay.values());

  // ตารางรายคอนเทนต์
  const byContent = new Map<string, ReportRow[]>();
  for (const r of rows) byContent.set(r.contentId, [...(byContent.get(r.contentId) ?? []), r]);
  const contentsList = [...byContent.values()].map((list) => {
    const views = list.reduce((s, r) => s + (r.views ?? 0), 0), eng = list.reduce((s, r) => s + engagement(r), 0);
    return { first: list[0], list, views, eng, er: views ? eng / views : 0 };
  }).sort((a, b) => (sp.sort === "er" ? b.er - a.er : sp.sort === "date" ? +b.first.publishedAt - +a.first.publishedAt : b.views - a.views));
  const thumbs = new Map<string, string | null>();
  await Promise.all(contentsList.map(async (c) => thumbs.set(c.first.contentId, (await listMedia(getDb(), c.first.contentId))[0]?.thumbKey ?? null)));
  const pillarColor = (id: string | null) => ctx.pillars.find((p) => p.id === id)?.color;
  const maxP = Math.max(1, ...byPlatform.map((g) => g.views));
  const link = (o: Record<string, string | number>) => `?${new URLSearchParams({ days: String(days), ...(sp.sort ? { sort: sp.sort } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;
  const groupTable = (title: string, groups: ReturnType<typeof groupBy>, label: (k: string) => string) => (
    <section className="card" style={{ padding: "6px 8px" }}>
      <div className="card-head" style={{ padding: "10px 10px 0" }}><h2>{title}</h2></div>
      {groups.length ? (
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 420 }}>
            <thead><tr><th>{title.replace("แยกตาม", "")}</th><th className="r">โพสต์</th><th className="r">ยอดวิว</th><th className="r">ER</th></tr></thead>
            <tbody>{groups.map((g) => <tr key={g.key} style={{ cursor: "default" }}><td>{label(g.key)}</td><td className="r num">{g.count}</td><td className="r num">{n(g.views)}</td><td className="r num">{g.views ? pct(g.er) : "–"}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="empty">ยังไม่มีข้อมูล</div>}
    </section>
  );

  return (
    <>
      <PageHead
        eyebrow="ผลลัพธ์จากทุกช่องทาง"
        title="รายงานผล"
        sub="ระยะนี้ตัวเลขมาจากการกรอกเอง เมื่อเชื่อมต่อช่องทางแล้ว ระบบจะดึงจาก API ให้ทุก 6 ชั่วโมง"
        actions={
          <>
            <div className="seg">{[7, 30, 90].map((d) => <Link key={d} className="seg-a" aria-pressed={d === days} href={link({ days: d })}>{d} วัน</Link>)}</div>
            <a className="btn" href={`/api/p/${projectId}/reports.csv?days=${days}`}><Icon name="download" size="sm" />ดาวน์โหลด CSV</a>
          </>
        }
      />
      <div className="kpis">
        <div className="tile"><span className="eyebrow">ยอดวิวรวม</span><span className="k-val">{n(cur.views)}</span><span className="k-sub"><Delta cur={cur.views} prev={prev.views} /></span></div>
        <div className="tile"><span className="eyebrow">Engagement</span><span className="k-val">{n(cur.engagement)}</span><span className="k-sub"><Delta cur={cur.engagement} prev={prev.engagement} /></span></div>
        <div className="tile"><span className="eyebrow">Engagement rate</span><span className="k-val">{pct(cur.er)}</span><span className="k-sub"><Delta cur={cur.er} prev={prev.er} points /></span></div>
        <div className="tile"><span className="eyebrow">ชิ้นที่เผยแพร่</span><span className="k-val">{cur.count}</span><span className="k-sub">ตัวเลข: <span className="src api">API {cur.bySource.api}</span> <span className="src manual">กรอกเอง {cur.bySource.manual}</span> <span className="src miss">ขาด {cur.bySource.missing}</span></span></div>
      </div>
      {missing.length > 0 && ctx.can("metrics") && (
        <section className="card">
          <div className="card-head"><h2>ตัวเลขที่ยังขาด</h2><span className="pill t-warn plain">{missing.length}</span><span className="sp small muted">ช่องทางที่ยังดึงสถิติอัตโนมัติไม่ได้ เปิดหน้าสถิติในแอปแล้วกรอกตัวเลขล่าสุด</span></div>
          <div className="list">
            {missing.map((r) => (
              <div className="pub-row" key={r.contentChannelId}>
                <ChannelBadge p={r.platform} lg />
                <div className="what">
                  <div className="line1"><Link href={`/p/${projectId}/content/${r.contentId}`}><b>{r.title}</b></Link><span className="small muted">{CATALOG[r.platform].name} · โพสต์เมื่อ {formatThai(r.publishedAt, "short")}</span></div>
                  <MetricsForm projectId={projectId} ccId={r.contentChannelId} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="cols">
        <section className="card">
          <div className="card-head"><h2>ยอดวิวตามวันที่โพสต์</h2><span className="sp small muted">ยอดวิวล่าสุดของโพสต์ รวมตามวันที่ลง</span></div>
          <div className="scroll-x">
            <div className="daybars" style={{ gridTemplateColumns: `repeat(${days}, minmax(${days > 30 ? 6 : 14}px, 1fr))` }} role="img" aria-label="กราฟแท่งยอดวิวตามวันที่โพสต์">
              {dayKeys.map((d) => {
                const v = byDay.get(d) ?? 0;
                return <div key={d} className="daybar" title={`${formatThai(fromBangkokInput(d, "12:00"), "short")} · ${n(v)} วิว`}><i style={{ height: `${(v / maxDay) * 100}%` }} /></div>;
              })}
            </div>
            <div className="daybar-axis"><span>{formatThai(fromBangkokInput(dayKeys[0], "12:00"), "short")}</span><span>สูงสุด {n(maxDay === 1 && !byDay.size ? 0 : maxDay)} วิว/วัน</span><span>{formatThai(now, "short")}</span></div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>แยกตามช่องทาง</h2></div>
          {byPlatform.length ? (
            <div className="bars">
              {byPlatform.map((g) => (
                <div className="bar-row" key={g.key}>
                  <div className="nm"><ChannelBadge p={g.key as never} /><span>{CATALOG[g.key as keyof typeof CATALOG].name}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div className="bar-track"><div className={`bar-fill${g.manual > g.api ? " manual" : ""}`} style={{ width: `${(g.views / maxP) * 100}%` }} /></div>
                    <div className="small faint">{g.api > 0 && <span className="src api">API {g.api}</span>} {g.manual > 0 && <span className="src manual">กรอกเอง {g.manual}</span>} {g.missing > 0 && <span className="src miss">ขาด {g.missing}</span>} · ER {g.views ? pct(g.er) : "–"}</div>
                  </div>
                  <b className="num" style={{ textAlign: "right" }}>{n(g.views)}</b>
                </div>
              ))}
            </div>
          ) : <div className="empty">ยังไม่มีโพสต์ในช่วงนี้</div>}
        </section>
      </div>
      <div className="cols">
        {groupTable("แยกตามประเภทงาน", byWorkType, (k) => ctx.workTypes.find((w) => w.id === k)?.name ?? "ไม่ระบุ")}
        {groupTable("แยกตามหมวด", byPillar, (k) => ctx.pillars.find((p) => p.id === k)?.name ?? "ไม่ระบุ")}
      </div>
      <section className="card">
        <div className="card-head"><h2>ช่วงเวลาที่โพสต์แล้วได้ผลดี</h2><span className="sp small muted">ER เฉลี่ยตามวันและชั่วโมงที่โพสต์ (90 วันล่าสุด) · สีเข้ม = ดีกว่า</span></div>
        <div className="scroll-x">
          <table className="heat" aria-label="ตาราง ER ตามวันและชั่วโมง">
            <thead><tr><th />{HOURS.map((h) => <th key={h}>{h % 3 === 0 ? h : ""}</th>)}</tr></thead>
            <tbody>
              {heat.map((rowv, d) => (
                <tr key={d}><th>{DOW[d]}</th>{rowv.map((v, h) => (
                  <td key={h} title={v == null ? `${DOW[d]} ${h}:00 · ไม่มีโพสต์` : `${DOW[d]} ${h}:00 · ER ${pct(v)}`} style={v == null ? undefined : { background: `color-mix(in srgb, var(--accent) ${Math.round(15 + (heatMax ? v / heatMax : 0) * 85)}%, var(--surface-2))` }} />
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" style={{ padding: "6px 8px" }}>
        <div className="card-head" style={{ padding: "10px 10px 0" }}>
          <h2>ผลรายคอนเทนต์</h2>
          <div className="seg sp">
            <Link className="seg-a" aria-pressed={!sp.sort || sp.sort === "views"} href={link({ sort: "views" })}>ยอดวิว</Link>
            <Link className="seg-a" aria-pressed={sp.sort === "er"} href={link({ sort: "er" })}>ER</Link>
            <Link className="seg-a" aria-pressed={sp.sort === "date"} href={link({ sort: "date" })}>ล่าสุด</Link>
          </div>
        </div>
        {contentsList.length ? (
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>คอนเทนต์</th><th>ช่องทาง</th><th className="r">ยอดวิว</th><th className="r">Engagement</th><th className="r">ER</th><th>ที่มาของตัวเลข</th></tr></thead>
              <tbody>
                {contentsList.map(({ first, list, views, eng, er }) => (
                  <tr key={first.contentId} className="row-link">
                    <td><Link href={`/p/${projectId}/content/${first.contentId}`} className="t-cell"><Cover c={{ title: first.title, format: first.format as never, pillarColor: pillarColor(first.pillarId), thumbKey: thumbs.get(first.contentId) }} size="sm" /><span><span className="t-title">{first.title}</span><br /><span className="small muted">{formatThai(first.publishedAt, "short")}</span></span></Link></td>
                    <td><span className="chs">{list.map((r) => <ChannelBadge key={r.platform} p={r.platform} />)}</span></td>
                    <td className="r num">{n(views)}</td><td className="r num">{n(eng)}</td><td className="r num">{views ? pct(er) : "–"}</td>
                    <td>
                      {list.some((r) => r.source === "api") && <span className="src api">API {list.filter((r) => r.source === "api").length}</span>}{" "}
                      {list.some((r) => r.source === "manual") && <span className="src manual">กรอกเอง {list.filter((r) => r.source === "manual").length}</span>}{" "}
                      {list.some((r) => !r.source) && <span className="src miss">ขาด {list.filter((r) => !r.source).length}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">ยังไม่มีคอนเทนต์ที่เผยแพร่ในช่วงนี้</div>}
      </section>
    </>
  );
}
