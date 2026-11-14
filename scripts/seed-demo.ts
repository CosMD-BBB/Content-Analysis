/**
 * ใส่ข้อมูลตัวอย่างสำหรับสาธิต (ใช้กับฐานข้อมูลว่างเท่านั้น)
 * ใช้: DATABASE_URL=... UPLOAD_DIR=... npx tsx scripts/seed-demo.ts
 * บัญชีทั้งหมดใช้รหัสผ่าน demo1234
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { count, eq } from "drizzle-orm";
import sharp from "sharp";
import { register } from "../src/auth/service";
import { addComment } from "../src/content/comments";
import { applyAction, createContent } from "../src/content/service";
import { createDb } from "../src/db/client";
import { contentChannels, contents, favorites, memberships, users, type Format, type Platform } from "../src/db/schema";
import { addDaysKey, bangkokDayKey, bangkokTime } from "../src/lib/time";
import { addMedia } from "../src/media/service";
import { getStorage } from "../src/media/storage";
import { createProject, getProjectContext } from "../src/projects/service";
import { confirmManualPost, publishNow } from "../src/publish/service";
import { enterMetrics } from "../src/reports/aggregate";

const db = createDb(process.env.DATABASE_URL!);
const storage = getStorage();
const tmp = mkdtempSync(path.join(os.tmpdir(), "cs-seed-"));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** รูปสินค้าแบบกราฟิก (ขวดสกินแคร์ / แก้วกาแฟ) บนพื้นไล่สี */
async function art(kind: "bottle" | "jar" | "tube" | "cup" | "beans", c1: string, c2: string, w: number, h: number) {
  const cx = w / 2, cy = h * 0.56, s = Math.min(w, h);
  const shapes: Record<string, string> = {
    bottle: `<rect x="${cx - s * 0.11}" y="${cy - s * 0.26}" width="${s * 0.22}" height="${s * 0.46}" rx="${s * 0.05}" fill="#fff" fill-opacity=".92"/><rect x="${cx - s * 0.045}" y="${cy - s * 0.36}" width="${s * 0.09}" height="${s * 0.11}" rx="${s * 0.015}" fill="${c2}"/><rect x="${cx - s * 0.08}" y="${cy - s * 0.08}" width="${s * 0.16}" height="${s * 0.12}" rx="${s * 0.01}" fill="${c1}" fill-opacity=".55"/>`,
    jar: `<rect x="${cx - s * 0.2}" y="${cy - s * 0.1}" width="${s * 0.4}" height="${s * 0.25}" rx="${s * 0.05}" fill="#fff" fill-opacity=".94"/><rect x="${cx - s * 0.21}" y="${cy - s * 0.17}" width="${s * 0.42}" height="${s * 0.09}" rx="${s * 0.03}" fill="${c2}"/>`,
    tube: `<path d="M${cx - s * 0.12} ${cy - s * 0.3} h${s * 0.24} l${-s * 0.04} ${s * 0.5} h${-s * 0.16} z" fill="#fff" fill-opacity=".93"/><rect x="${cx - s * 0.06}" y="${cy + s * 0.2}" width="${s * 0.12}" height="${s * 0.07}" rx="${s * 0.01}" fill="${c2}"/>`,
    cup: `<path d="M${cx - s * 0.2} ${cy - s * 0.18} h${s * 0.4} l${-s * 0.05} ${s * 0.38} h${-s * 0.3} z" fill="#fff" fill-opacity=".94"/><path d="M${cx + s * 0.18} ${cy - s * 0.1} q${s * 0.14} 0 ${s * 0.1} ${s * 0.12} q${-s * 0.03} ${s * 0.08} ${-s * 0.13} ${s * 0.06}" fill="none" stroke="#fff" stroke-width="${s * 0.03}"/><ellipse cx="${cx}" cy="${cy - s * 0.18}" rx="${s * 0.2}" ry="${s * 0.035}" fill="${c2}"/>`,
    beans: [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${cx + (i - 2) * s * 0.13}" cy="${cy + ((i % 2) - 0.5) * s * 0.12}" rx="${s * 0.07}" ry="${s * 0.1}" transform="rotate(${i * 25} ${cx + (i - 2) * s * 0.13} ${cy})" fill="${c2}"/>`).join(""),
  };
  const dots = Array.from({ length: 6 }, () => `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${s * (0.03 + rnd() * 0.08)}" fill="#fff" fill-opacity=".18"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${dots}<ellipse cx="${cx}" cy="${cy + s * 0.27}" rx="${s * 0.28}" ry="${s * 0.04}" fill="#000" fill-opacity=".12"/>${shapes[kind]}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

function videoFrom(jpg: Buffer, w: number, h: number) {
  const inp = path.join(tmp, `f${Date.now()}${rnd()}.jpg`), out = inp.replace(".jpg", ".mp4");
  writeFileSync(inp, jpg);
  execFileSync("ffmpeg", ["-loglevel", "error", "-loop", "1", "-i", inp, "-t", "3", "-vf", `scale=${w}:${h},zoompan=z='min(zoom+0.0015,1.2)':d=75:s=${w}x${h}`, "-pix_fmt", "yuv420p", "-r", "25", out]);
  return readFileSync(out);
}

/** ไม่มี ffmpeg ในเครื่อง → ใช้รูปแทนวิดีโอ */
function tryVideo(jpg: Buffer, w: number, h: number): Buffer | null {
  try { return videoFrom(jpg, w, h); } catch { return null; }
}

const dims: Record<Format, [number, number]> = { reel: [720, 1280], video: [1280, 720], image: [1080, 1350], carousel: [1080, 1350], article: [1280, 720] };

type Spec = {
  title: string; format: Format; work: string; pillar: number; off: number; time: string; owner: "ton" | "mind" | "pim";
  platforms: Platform[]; status: "idea" | "draft" | "review" | "changes" | "approved" | "scheduled" | "published"; art: Parameters<typeof art>[0]; colors: [string, string];
  caption: string; images?: number; fav?: boolean;
};

async function main() {
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) throw new Error("ฐานข้อมูลมีข้อมูลอยู่แล้ว ใช้กับฐานข้อมูลว่างเท่านั้น");
  const mk = async (name: string, email: string) => {
    const r = await register(db, { name, email, password: "demo1234" });
    if (!r.ok) throw new Error(r.error);
    return r.userId;
  };
  const owner = await mk("กานต์", "demo@contentstudio.local");
  const pim = await mk("พิม", "pim@contentstudio.local");
  const ton = await mk("ต้น", "ton@contentstudio.local");
  const mind = await mk("มายด์", "mind@contentstudio.local");
  const boss = await mk("บอส", "boss@contentstudio.local");
  const who = { ton, mind, pim };

  const A = await createProject(db, owner, { name: "Glow Lab Skincare", color: "#3E4FE0" });
  const B = await createProject(db, owner, { name: "Bean Corner Café", color: "#A35F00" });
  for (const [uid, role] of [[pim, "manager"], [ton, "creator"], [mind, "creator"], [boss, "analyst"]] as const) {
    await db.insert(memberships).values({ projectId: A.id, userId: uid, role });
  }
  await db.insert(memberships).values({ projectId: B.id, userId: pim, role: "admin" });

  const today = bangkokDayKey(new Date());
  const now = new Date();
  void now;
  const soon = new Date(now.getTime() + 3 * 3600e3);
  soon.setUTCMinutes(0, 0, 0);

  const specs: Spec[] = [
    { title: "5 สัญญาณว่าผิวคุณกำลังขาดน้ำ", format: "reel", work: "VDO", pillar: 0, off: -24, time: "19:00", owner: "ton", platforms: ["facebook", "instagram", "tiktok", "youtube"], status: "published", art: "bottle", colors: ["#9ED8F0", "#3E7FD6"], caption: "ผิวตึง ลอก หมองง่าย? เช็ก 5 สัญญาณนี้ก่อน แล้วคอมเมนต์บอกเราว่าเจอข้อไหนบ้าง 💧\n\n#ผิวขาดน้ำ #สกินแคร์", fav: true },
    { title: "รีวิวเซรั่มวิตามินซี ใช้จริง 30 วัน", format: "video", work: "VDO", pillar: 1, off: -21, time: "18:00", owner: "ton", platforms: ["youtube", "facebook", "web"], status: "published", art: "bottle", colors: ["#FFD39A", "#F08A24"], caption: "ใช้จริงทุกวัน 30 วัน ถ่ายหน้าสดก่อน-หลังให้ดูชัดๆ" },
    { title: "ลำดับการทาสกินแคร์ เช้า–เย็น", format: "carousel", work: "โพสต์ทั่วไป", pillar: 0, off: -18, time: "12:00", owner: "mind", platforms: ["instagram", "facebook", "lemon8"], status: "published", art: "jar", colors: ["#F6D5E5", "#C2557E"], caption: "เซฟไว้เลย! ลำดับทาที่ถูกต้อง เช้า 5 ขั้น เย็น 6 ขั้น", images: 3, fav: true },
    { title: "Q&A: ทากันแดดซ้ำยังไงไม่ให้หน้าเยิ้ม", format: "reel", work: "VDO", pillar: 0, off: -15, time: "20:00", owner: "ton", platforms: ["tiktok", "instagram", "facebook"], status: "published", art: "tube", colors: ["#FFF1A8", "#F2B705"], caption: "ทริกทากันแดดซ้ำระหว่างวัน แบบไม่ต้องล้างหน้า" },
    { title: "ไนอะซินาไมด์ใช้คู่กับอะไรได้บ้าง", format: "article", work: "บทความ / SEO", pillar: 0, off: -13, time: "10:00", owner: "mind", platforms: ["web", "facebook", "line"], status: "published", art: "bottle", colors: ["#D7F2E3", "#2E9E6A"], caption: "สรุปครบ ใช้คู่กับอะไรได้ อะไรควรเลี่ยง พร้อมตารางเทียบ" },
    { title: "โปรฯ 11.11 ลด 30% ทั้งร้าน", format: "image", work: "Broadcast", pillar: 2, off: -2, time: "11:11", owner: "mind", platforms: ["facebook", "instagram", "line", "x", "lemon8"], status: "published", art: "jar", colors: ["#FFB3B3", "#D7263D"], caption: "11.11 ลด 30% ทั้งร้าน วันเดียวเท่านั้น!" },
    { title: "ผิวแพ้ง่ายเลือกโทนเนอร์ยังไง", format: "video", work: "VDO", pillar: 0, off: -6, time: "19:00", owner: "ton", platforms: ["youtube", "tiktok", "facebook"], status: "published", art: "bottle", colors: ["#E3DFFF", "#6B4FC8"], caption: "เช็กส่วนผสม 4 ตัวที่คนผิวแพ้ง่ายควรเลี่ยง", fav: true },
    { title: "รีวิวจากลูกค้าจริง: สิวผดหายใน 2 สัปดาห์", format: "carousel", work: "โพสต์ทั่วไป", pillar: 4, off: -4, time: "12:30", owner: "mind", platforms: ["instagram", "facebook", "lemon8"], status: "published", art: "tube", colors: ["#CFF4F7", "#0B7E8C"], caption: "ขอบคุณคุณแพรที่แชร์ประสบการณ์ 💙", images: 2 },
    { title: "ทริกล้างหน้าให้สะอาดใน 60 วินาที", format: "reel", work: "VDO", pillar: 0, off: 0, time: "SOON", owner: "ton", platforms: ["tiktok", "instagram", "facebook"], status: "scheduled", art: "tube", colors: ["#BFE6FF", "#2763C4"], caption: "60 วิ หน้าสะอาด ไม่แห้งตึง" },
    { title: "วิธีอ่านฉลากสกินแคร์ให้เป็น", format: "carousel", work: "โพสต์ทั่วไป", pillar: 0, off: 1, time: "12:00", owner: "mind", platforms: ["instagram", "facebook", "lemon8"], status: "review", art: "jar", colors: ["#FBE7C6", "#C9822B"], caption: "ฉลากบอกอะไรเราบ้าง? ดู 6 จุดนี้ก่อนซื้อ", images: 2 },
    { title: "รีวิวมอยส์เจอไรเซอร์สูตรใหม่", format: "video", work: "VDO", pillar: 1, off: 2, time: "19:00", owner: "ton", platforms: ["youtube", "facebook", "tiktok"], status: "review", art: "jar", colors: ["#E8F5D0", "#6AA121"], caption: "เนื้อเจลบางเบา ซึมไว ทดสอบ 7 วัน" },
    { title: "นับถอยหลัง 12.12 เปิดตัวเซ็ตของขวัญ", format: "image", work: "Ads", pillar: 2, off: 3, time: "10:00", owner: "mind", platforms: ["facebook", "instagram"], status: "approved", art: "jar", colors: ["#FFD6E0", "#E63E6D"], caption: "เซ็ตของขวัญปลายปี เปิดจอง 12.12" },
    { title: "สกินแคร์สำหรับผู้ชาย 3 ขั้นตอน", format: "reel", work: "VDO", pillar: 0, off: 4, time: "19:30", owner: "ton", platforms: ["tiktok", "instagram", "youtube"], status: "changes", art: "bottle", colors: ["#D0D7E2", "#3A4A63"], caption: "ผู้ชายก็ดูแลผิวง่ายๆ ได้ แค่ 3 ขั้น" },
    { title: "กรดผลัดผิว AHA กับ BHA ต่างกันยังไง", format: "article", work: "บทความ / SEO", pillar: 0, off: 6, time: "10:00", owner: "mind", platforms: ["web", "facebook", "x"], status: "draft", art: "bottle", colors: ["#FFE9B8", "#E08E0B"], caption: "" },
    { title: "หน้าหนาวผิวลอกเป็นขุย แก้ยังไง", format: "reel", work: "VDO", pillar: 0, off: 7, time: "19:00", owner: "ton", platforms: ["tiktok", "instagram", "facebook", "youtube"], status: "draft", art: "jar", colors: ["#DCEBFF", "#5B8DEF"], caption: "" },
    { title: "ไลฟ์ถามตอบกับเภสัชกร", format: "video", work: "Live", pillar: 3, off: 9, time: "20:00", owner: "pim", platforms: ["facebook", "youtube"], status: "idea", art: "bottle", colors: ["#EEE", "#888"], caption: "" },
    { title: "ชวนแชร์รูทีนผิวฉ่ำ ลุ้นรับเซ็ตของขวัญ", format: "image", work: "KOL / Influencer", pillar: 4, off: 10, time: "12:00", owner: "mind", platforms: ["instagram", "tiktok"], status: "idea", art: "tube", colors: ["#F0E", "#90F"], caption: "" },
  ];

  const ctx = await getProjectContext(db, owner, A.id);
  const wt = (name: string) => ctx.workTypes.find((w) => w.name === name)!.id;
  for (const s of specs) {
    const ownerId = who[s.owner];
    const c = await createContent(db, pim, A.id, {
      title: s.title, workTypeId: wt(s.work), format: s.format, pillarId: ctx.pillars[s.pillar].id, date: s.time === "SOON" ? bangkokDayKey(soon) : addDaysKey(today, s.off), time: s.time === "SOON" ? bangkokTime(soon) : s.time,
      ownerId, platforms: s.platforms, caption: s.caption, captionOverrides: s.platforms.includes("x") ? { x: s.title } : {}, assetLink: "",
    }, { asIdea: s.status === "idea" });
    if (s.status !== "idea") {
      const [w, h] = dims[s.format];
      for (let i = 0; i < (s.images ?? 1); i++) {
        const shift = i ? ([s.colors[1], s.colors[0]] as [string, string]) : s.colors;
        const jpg = await art(s.art, shift[0], shift[1], w, h);
        const mp4 = (s.format === "reel" || s.format === "video") && i === 0 ? tryVideo(jpg, w, h) : null;
        if (mp4) {
          await addMedia(db, storage, ownerId, c.id, { body: mp4, mime: "video/mp4", size: mp4.length }, jpg);
        } else await addMedia(db, storage, ownerId, c.id, { body: jpg, mime: "image/jpeg", size: jpg.length });
      }
    }
    if (["review", "changes", "approved", "scheduled", "published"].includes(s.status)) await applyAction(db, ownerId, c.id, "submit");
    if (s.status === "changes") await applyAction(db, pim, c.id, "requestChanges", { comment: "ช่วงเปิดยาวไป ตัดให้เข้าเรื่องใน 3 วินาทีแรก และเปลี่ยนเพลงเป็นเพลงที่ใช้เชิงพาณิชย์ได้" });
    if (["approved", "scheduled", "published"].includes(s.status)) await applyAction(db, pim, c.id, "approve");
    if (s.status === "scheduled") await applyAction(db, pim, c.id, "schedule");
    if (s.status === "published") {
      await publishNow(db, pim, c.id);
      const ccs = await db.select().from(contentChannels).where(eq(contentChannels.contentId, c.id));
      for (const cc of ccs) {
        if (s.off > -3 && (cc.platform === "x" || cc.platform === "lemon8")) continue; // ยังรอโพสต์เอง
        await confirmManualPost(db, pim, cc.id, `${cc.platform === "web" ? "https://glowlab.example.com/blog/" : "https://www.example.com/"}${cc.platform}/${c.id.slice(0, 8)}`);
        if (cc.platform === "lemon8" && s.off > -6) continue; // ยังไม่กรอกตัวเลข
        const base = { tiktok: 21000, instagram: 9200, facebook: 7400, youtube: 6100, web: 2300, x: 1900, line: 5200, lemon8: 2700 }[cc.platform];
        const views = Math.round(base * (0.5 + rnd() * 1.3));
        const likes = Math.round(views * (0.025 + rnd() * 0.06));
        await enterMetrics(db, boss, cc.id, { views, likes, comments: Math.round(likes * 0.08), shares: Math.round(likes * 0.12), clicks: Math.round(views * 0.015) });
      }
    }
    if (s.fav) await db.insert(favorites).values({ userId: owner, contentId: c.id });
    if (s.status === "review" && s.images) {
      const m = (await db.query.media.findMany({ where: (t, { eq }) => eq(t.contentId, c.id) }))[0];
      await addComment(db, pim, c.id, { body: "ตัวหนังสือบนรูปนี้เล็กไป ขยายอีกนิด", mediaId: m.id, pinX: 0.5, pinY: 0.3 });
    }
  }
  // งานของบริษัทที่สอง
  const ctxB = await getProjectContext(db, owner, B.id);
  const cB = await createContent(db, owner, B.id, { title: "เมนูใหม่ เอสเย็นมะพร้าว", workTypeId: ctxB.workTypes[0].id, format: "image", pillarId: ctxB.pillars[2].id, date: addDaysKey(today, 2), time: "09:00", ownerId: owner, platforms: ["facebook", "instagram", "line"], caption: "เมนูใหม่ประจำเดือน" });
  const jpg = await art("cup", "#F3E1C7", "#7A4A1E", 1080, 1350);
  await addMedia(db, storage, owner, cB.id, { body: jpg, mime: "image/jpeg", size: jpg.length });
  const [{ total }] = await db.select({ total: count() }).from(contents);
  console.log(`seeded ${total} contents · login demo@contentstudio.local / demo1234`);
  await db.$client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
