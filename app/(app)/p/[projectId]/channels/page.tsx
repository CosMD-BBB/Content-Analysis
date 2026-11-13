import { ChannelBadge } from "@/components/badges";
import { ConnectWizard } from "@/components/connect-wizard";
import { Icon } from "@/components/icon";
import { PageHead } from "@/components/page-head";
import { CAP_LABEL, CATALOG } from "@/src/channels/catalog";
import { GUIDES } from "@/src/channels/guides";
import { PLATFORMS } from "@/src/db/constants";
import { projectPage } from "@/src/server/context";

const POST_NOTE = {
  facebook: "โพสต์ข้อความ รูป อัลบั้ม วิดีโอ และ Reels ลงเพจ ทันทีหรือตั้งเวลา",
  instagram: "โพสต์รูป อัลบั้ม และ Reels (บทความยาวไม่รองรับ)",
  youtube: "อัปโหลดวิดีโอและ Shorts พร้อมตั้งเวลา (รองรับเฉพาะวิดีโอ)",
  tiktok: "ถ้าแอปผ่านการตรวจของ TikTok จะโพสต์ตรงได้ ถ้ายังไม่ผ่าน คลิปจะไปรอใน Inbox ของแอป TikTok ให้กดโพสต์เอง",
  x: "โพสต์ข้อความ รูป และวิดีโอ แต่ต้องใช้แพ็กเกจ API แบบเสียเงิน",
  lemon8: "ไม่มี API ต้องโพสต์เองในแอป ระบบสร้างงานพร้อมแคปชันให้คัดลอก",
  line: "บรอดแคสต์ข้อความ รูป และการ์ดลิงก์ถึงผู้ติดตาม",
  web: "สร้างบทความบนเว็บไซต์ WordPress พร้อมตั้งเวลาเผยแพร่",
} as const;
const STATS_NOTE = {
  facebook: "Reach ยอดดู รีแอค คอมเมนต์ แชร์ คลิกลิงก์",
  instagram: "ยอดดู reach ไลก์ คอมเมนต์ แชร์ เซฟ",
  youtube: "ยอดวิว เวลารับชม ไลก์ คอมเมนต์ ผู้ติดตามที่เพิ่ม",
  tiktok: "ยอดวิว ไลก์ คอมเมนต์ แชร์ (ไม่มีเวลารับชมและแหล่งที่มาผู้ชม)",
  x: "Impressions ไลก์ รีโพสต์ ตอบกลับ คลิก (บางค่าดูย้อนหลังได้จำกัด)",
  lemon8: "ต้องกรอกตัวเลขเองในหน้ารายงาน",
  line: "ยอดส่ง ยอดเปิดอ่าน คลิก ต่อข้อความ (สถิติแบบรวม)",
  web: "Pageviews ผู้ใช้ เวลาบนหน้า จาก Google Analytics 4",
} as const;

export default async function ChannelsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const admin = ctx.can("channels");
  const connected = ctx.channels.filter((c) => c.status === "connected").length;
  return (
    <>
      <PageHead
        eyebrow="การเชื่อมต่อ API"
        title="ช่องทางที่เชื่อมต่อ"
        sub={`เชื่อมต่อแล้ว ${connected} จาก ${PLATFORMS.length - 1} ช่องทางที่มี API · ช่องทางที่โพสต์อัตโนมัติไม่ได้ ระบบจะสร้างงาน “ต้องโพสต์เอง” ให้ทันทีที่กดเผยแพร่`}
      />
      <div className="banner"><Icon name="info" /><div><b>ระยะที่ 1:</b> ทุกช่องทางยังทำงานแบบโพสต์เองและกรอกผลเอง ปุ่มเชื่อมต่อจะเปิดใช้ทีละช่องทางเมื่อแต่ละแพลตฟอร์มอนุมัติแอป ระหว่างนี้อ่านคู่มือและเตรียมบัญชีตามเช็กลิสต์ไว้ก่อนได้{!admin && " · การเชื่อมต่อทำได้เฉพาะผู้ดูแลโปรเจกต์"}</div></div>
      <div className="legend"><span><span className="cap yes">ได้</span> ทำผ่าน API ได้เต็มที่</span><span><span className="cap partial">บางส่วน</span> ทำได้แต่มีเงื่อนไข</span><span><span className="cap no">ไม่ได้</span> ต้องทำเอง</span></div>
      <div className="ch-grid">
        {PLATFORMS.map((p) => {
          const c = CATALOG[p], g = GUIDES[p], st = ctx.channels.find((x) => x.platform === p);
          const status = c.post === "no" ? <span className="pill t-warn">ไม่มี API · โพสต์เอง</span>
            : st?.status === "connected" ? <span className="pill t-ok">เชื่อมต่อแล้ว</span>
            : <span className="pill t-neutral">เร็วๆ นี้ · {g.waitingFor}</span>;
          return (
            <section className="card ch-card" key={p}>
              <div className="ch-top">
                <ChannelBadge p={p} lg />
                <div className="grow"><h2>{c.name}</h2><div className="small muted">{c.api}</div>{st?.accountName && <div className="small">บัญชี: <b>{st.accountName}</b></div>}</div>
                {status}
              </div>
              <div>
                <div className="capline"><span className="k">โพสต์อัตโนมัติ</span><div className="v"><span><span className={`cap ${c.post}`}>{CAP_LABEL[c.post]}</span></span><span>{POST_NOTE[p]}</span></div></div>
                <div className="capline"><span className="k">ดึงสถิติ</span><div className="v"><span><span className={`cap ${c.stats}`}>{CAP_LABEL[c.stats]}</span></span><span>{STATS_NOTE[p]}</span></div></div>
              </div>
              {g.availability === "coming_soon" && (
                <div className="req"><b>เตรียมไว้ก่อน:</b><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{g.prepare.map((x) => <li key={x}>{x}</li>)}</ul></div>
              )}
              <div className="ch-foot">
                <ConnectWizard name={c.name} badge={<ChannelBadge p={p} lg />} guide={g} canConnect={admin} />
                <a className="btn ghost sm" href={c.url} target="_blank" rel="noopener"><Icon name="ext" size="sm" />เปิด {c.name}</a>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
