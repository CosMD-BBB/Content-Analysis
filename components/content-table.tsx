import Link from "next/link";
import type { ContentRow } from "@/src/content/service";
import { FORMAT_LABEL } from "@/src/i18n/th";
import { formatThai } from "@/src/lib/time";
import { ChannelBadges, StatusPill, WorkTypeChip } from "./badges";
import { FavoriteButton } from "./content-actions";
import { Cover } from "./cover";

export function ContentTable({ projectId, rows, empty, workTypes, pillars, views }: {
  projectId: string; rows: ContentRow[]; empty: string;
  workTypes: { id: string; name: string }[]; pillars: { id: string; name: string; color: string }[];
  views?: Map<string, number>;
}) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead><tr><th style={{ width: 36 }} /><th>คอนเทนต์</th><th>ประเภทงาน</th><th>ช่องทาง</th><th>ผู้รับผิดชอบ</th><th>วันลง</th><th>สถานะ</th>{views && <th className="r">ยอดวิว</th>}</tr></thead>
        <tbody>
          {rows.map((c) => {
            const pillar = pillars.find((p) => p.id === c.pillarId);
            const href = `/p/${projectId}/content/${c.id}`;
            return (
              <tr key={c.id} className="row-link">
                <td><FavoriteButton projectId={projectId} contentId={c.id} on={c.favorite} /></td>
                <td>
                  <Link href={href} className="t-cell">
                    <Cover c={{ title: c.title, format: c.format, pillarColor: pillar?.color, thumbKey: c.cover?.thumbKey, kind: c.cover?.kind }} size="sm" />
                    <span><span className="t-title">{c.title}</span><br /><span className="small muted">{FORMAT_LABEL[c.format]}{pillar ? ` · ${pillar.name}` : ""}</span></span>
                  </Link>
                </td>
                <td><WorkTypeChip name={workTypes.find((w) => w.id === c.workTypeId)?.name} /></td>
                <td><ChannelBadges list={c.channels.map((x) => x.platform)} /></td>
                <td>{c.ownerName}</td>
                <td className="num">{formatThai(c.scheduledAt, "short")}</td>
                <td><StatusPill s={c.status} /></td>
                {views && <td className="r num">{c.status === "published" ? (views.get(c.id) ?? 0).toLocaleString() : "–"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
