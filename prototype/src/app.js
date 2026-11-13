(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const toLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parse = s => { const [a, b = '00:00'] = s.split('T'); const [y, m, d] = a.split('-').map(Number); const [h, mi] = b.split(':').map(Number); return new Date(y, m - 1, d, h, mi); };
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const fmtD = s => { const d = typeof s === 'string' ? parse(s) : s; return `${d.getDate()} ${TH_M[d.getMonth()]}`; };
const fmtDT = s => { const d = parse(s); return `${TH_D[d.getDay()]} ${d.getDate()} ${TH_M[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())} น.`; };
const fmtN = n => n == null ? '–' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString('en-US');
const pct = x => (x * 100).toFixed(1) + '%';
const ago = iso => { const m = Math.round((Date.now() - parse(iso)) / 6e4); if (m < 1) return 'เมื่อสักครู่'; if (m < 60) return `${m} นาทีที่แล้ว`; const h = Math.round(m / 60); if (h < 24) return `${h} ชม.ที่แล้ว`; return `${Math.round(h / 24)} วันที่แล้ว`; };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngOf = seed => { let a = hash(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const uid = () => 'c' + Math.random().toString(36).slice(2, 8);
const ICONS = __ICONS__;
const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- product art (stands in for real photos) ---------- */
const artCache = new Map();
function artURI(kind, c1, c2, seed) {
  const key = kind + c1 + c2 + seed;
  if (artCache.has(key)) return artCache.get(key);
  const w = 800, h = 1000, cx = w / 2, cy = h * 0.56, s = w, r = rngOf(seed);
  const shapes = {
    bottle: `<rect x="${cx - s * .11}" y="${cy - s * .26}" width="${s * .22}" height="${s * .46}" rx="${s * .05}" fill="#fff" fill-opacity=".92"/><rect x="${cx - s * .045}" y="${cy - s * .36}" width="${s * .09}" height="${s * .11}" rx="${s * .015}" fill="${c2}"/><rect x="${cx - s * .08}" y="${cy - s * .08}" width="${s * .16}" height="${s * .12}" rx="${s * .01}" fill="${c1}" fill-opacity=".55"/>`,
    jar: `<rect x="${cx - s * .2}" y="${cy - s * .1}" width="${s * .4}" height="${s * .25}" rx="${s * .05}" fill="#fff" fill-opacity=".94"/><rect x="${cx - s * .21}" y="${cy - s * .17}" width="${s * .42}" height="${s * .09}" rx="${s * .03}" fill="${c2}"/>`,
    tube: `<path d="M${cx - s * .12} ${cy - s * .3} h${s * .24} l${-s * .04} ${s * .5} h${-s * .16} z" fill="#fff" fill-opacity=".93"/><rect x="${cx - s * .06}" y="${cy + s * .2}" width="${s * .12}" height="${s * .07}" rx="${s * .01}" fill="${c2}"/>`,
    cup: `<path d="M${cx - s * .2} ${cy - s * .18} h${s * .4} l${-s * .05} ${s * .38} h${-s * .3} z" fill="#fff" fill-opacity=".94"/><path d="M${cx + s * .18} ${cy - s * .1} q${s * .14} 0 ${s * .1} ${s * .12} q${-s * .03} ${s * .08} ${-s * .13} ${s * .06}" fill="none" stroke="#fff" stroke-width="${s * .03}"/><ellipse cx="${cx}" cy="${cy - s * .18}" rx="${s * .2}" ry="${s * .035}" fill="${c2}"/>`,
    beans: [0, 1, 2, 3, 4].map(i => `<ellipse cx="${cx + (i - 2) * s * .13}" cy="${cy + ((i % 2) - .5) * s * .12}" rx="${s * .07}" ry="${s * .1}" transform="rotate(${i * 25} ${cx + (i - 2) * s * .13} ${cy})" fill="${c2}"/>`).join(''),
  };
  const dots = Array.from({ length: 6 }, () => `<circle cx="${r() * w}" cy="${r() * h}" r="${s * (.03 + r() * .08)}" fill="#fff" fill-opacity=".18"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${dots}<ellipse cx="${cx}" cy="${cy + s * .27}" rx="${s * .28}" ry="${s * .04}" fill="#000" fill-opacity=".12"/>${shapes[kind] || shapes.bottle}</svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  artCache.set(key, uri);
  return uri;
}
const mediaSrc = (c, i = 0) => { const m = c.media[i]; if (!m) return null; return m.src || artURI(m.art, m.c1, m.c2, c.id + i); };

/* ---------- domain ---------- */
const ROLES = {
  admin:   { label: 'ผู้ดูแลโปรเจกต์', desc: 'ทำได้ทุกอย่าง รวมถึงเชื่อมต่อช่องทางและกำหนดสิทธิ์ทีม' },
  manager: { label: 'หัวหน้าคอนเทนต์', desc: 'วางตาราง มอบหมายงาน อนุมัติ และกดเผยแพร่' },
  creator: { label: 'ครีเอเตอร์', desc: 'สร้างและแก้คอนเทนต์ของตัวเอง แล้วส่งให้หัวหน้าอนุมัติ' },
  analyst: { label: 'ฝ่ายวิเคราะห์', desc: 'ดูตารางและรายงานผล กรอกตัวเลขของช่องทางที่ไม่มี API' },
};
const PERMS = [
  ['create', 'สร้างคอนเทนต์ใหม่', ['admin', 'manager', 'creator']],
  ['editAny', 'แก้ไขคอนเทนต์ของทุกคน', ['admin', 'manager']],
  ['assign', 'มอบหมายงานให้คนอื่น', ['admin', 'manager']],
  ['approve', 'อนุมัติ / ขอแก้ไข', ['admin', 'manager']],
  ['publish', 'กดเผยแพร่ / ตั้งเวลาโพสต์', ['admin', 'manager']],
  ['manual', 'ยืนยันงานที่ต้องโพสต์เอง', ['admin', 'manager', 'creator']],
  ['metrics', 'กรอกตัวเลขผลลัพธ์เอง', ['admin', 'manager', 'analyst']],
  ['reports', 'ดูรายงานผล', ['admin', 'manager', 'creator', 'analyst']],
  ['channels', 'เชื่อมต่อ / ตัดการเชื่อมต่อช่องทาง', ['admin']],
  ['team', 'จัดการทีมและสิทธิ์', ['admin']],
];
const TYPES = { reel: 'คลิปสั้น', video: 'วิดีโอยาว', image: 'รูปเดี่ยว', carousel: 'อัลบั้ม/คารูเซล', article: 'บทความ' };
const WORKS = [
  { name: 'โพสต์ทั่วไป' }, { name: 'VDO' }, { name: 'Broadcast' }, { name: 'Ads', manual: true }, { name: 'Live' },
  { name: 'บทความ / SEO' }, { name: 'KOL / Influencer', manual: true }, { name: 'อื่นๆ' },
];
const workOf = name => WORKS.find(w => w.name === name) || WORKS[0];
const PILLARS = [
  { name: 'ความรู้', color: '#2763C4' }, { name: 'รีวิวสินค้า', color: '#C2313B' }, { name: 'โปรโมชัน', color: '#A35F00' },
  { name: 'เบื้องหลัง', color: '#0B7E8C' }, { name: 'เสียงลูกค้า', color: '#6B4FC8' },
];
const pillarColor = n => (PILLARS.find(p => p.name === n) || { color: '#5A6077' }).color;
const ST = {
  idea: { label: 'ไอเดีย', tone: 'neutral' }, draft: { label: 'กำลังทำ', tone: 'info' }, review: { label: 'รออนุมัติ', tone: 'warn' },
  changes: { label: 'ขอแก้ไข', tone: 'bad' }, approved: { label: 'อนุมัติแล้ว', tone: 'accent' }, scheduled: { label: 'ตั้งเวลาแล้ว', tone: 'teal' },
  published: { label: 'เผยแพร่แล้ว', tone: 'ok' },
};
const FIELDS = { views: 'ยอดวิว', likes: 'ไลก์', comments: 'คอมเมนต์', shares: 'แชร์', clicks: 'คลิก' };
const CH = {
  facebook:  { name: 'Facebook', s: 'f', bg: '#1877F2', fg: '#fff', post: 'yes', stats: 'yes', api: 'Meta Graph API (Pages)', types: ['reel', 'video', 'image', 'carousel', 'article'], fields: ['views', 'likes', 'comments', 'shares', 'clicks'], postNote: 'โพสต์ข้อความ รูป อัลบั้ม วิดีโอ และ Reels ลงเพจ ทันทีหรือตั้งเวลา', statsNote: 'Reach ยอดดู รีแอค คอมเมนต์ แชร์ คลิกลิงก์', url: 'https://www.facebook.com/' },
  instagram: { name: 'Instagram', s: 'IG', bg: '#D6246E', fg: '#fff', post: 'yes', stats: 'yes', api: 'Instagram Graph API', types: ['reel', 'video', 'image', 'carousel'], fields: ['views', 'likes', 'comments', 'shares'], postNote: 'โพสต์รูป อัลบั้ม และ Reels (บทความยาวไม่รองรับ)', statsNote: 'ยอดดู reach ไลก์ คอมเมนต์ แชร์ เซฟ', url: 'https://www.instagram.com/' },
  youtube:   { name: 'YouTube', s: 'YT', bg: '#E62117', fg: '#fff', post: 'yes', stats: 'yes', api: 'YouTube Data API v3 + Analytics API', types: ['video', 'reel'], fields: ['views', 'likes', 'comments', 'shares'], postNote: 'อัปโหลดวิดีโอและ Shorts พร้อมตั้งเวลา (รองรับเฉพาะวิดีโอ)', statsNote: 'ยอดวิว เวลารับชม ไลก์ คอมเมนต์ ผู้ติดตามที่เพิ่ม', url: 'https://studio.youtube.com/' },
  tiktok:    { name: 'TikTok', s: 'TT', bg: '#111111', fg: '#fff', post: 'partial', stats: 'partial', api: 'TikTok Content Posting API + Display API', types: ['reel', 'video', 'image', 'carousel'], fields: ['views', 'likes', 'comments', 'shares'], postNote: 'ถ้าแอปผ่านการตรวจของ TikTok จะโพสต์ตรงได้ ถ้ายังไม่ผ่าน คลิปจะไปรอใน Inbox ของแอป ให้กดโพสต์เอง', statsNote: 'ยอดวิว ไลก์ คอมเมนต์ แชร์ (ไม่มีเวลารับชมและแหล่งที่มาผู้ชม)', url: 'https://www.tiktok.com/' },
  x:         { name: 'X', s: 'X', bg: '#000000', fg: '#fff', post: 'partial', stats: 'partial', api: 'X API v2', types: ['reel', 'video', 'image', 'carousel', 'article'], fields: ['views', 'likes', 'comments', 'shares', 'clicks'], postNote: 'โพสต์ข้อความ รูป และวิดีโอ แต่ต้องใช้แพ็กเกจ API แบบเสียเงิน', statsNote: 'Impressions ไลก์ รีโพสต์ ตอบกลับ คลิก', url: 'https://x.com/' },
  lemon8:    { name: 'Lemon8', s: 'L8', bg: '#F5DC3B', fg: '#1A1A1A', post: 'no', stats: 'no', api: 'ไม่มี API สาธารณะ', types: [], fields: ['views', 'likes', 'comments', 'shares'], postNote: 'ไม่มี API ต้องโพสต์เองในแอป ระบบสร้างงานพร้อมแคปชันให้คัดลอก', statsNote: 'ต้องกรอกตัวเลขเองในหน้ารายงาน', url: 'https://www.lemon8-app.com/' },
  line:      { name: 'LINE OA', s: 'LN', bg: '#06C755', fg: '#fff', post: 'yes', stats: 'partial', api: 'LINE Messaging API', types: ['reel', 'video', 'image', 'carousel', 'article'], fields: ['views', 'clicks'], postNote: 'บรอดแคสต์ข้อความ รูป และการ์ดลิงก์ถึงผู้ติดตาม', statsNote: 'ยอดส่ง ยอดเปิดอ่าน คลิก ต่อข้อความ (สถิติแบบรวม)', url: 'https://manager.line.biz/' },
  web:       { name: 'เว็บไซต์', s: 'W', bg: '#4B5571', fg: '#fff', post: 'yes', stats: 'yes', api: 'WordPress REST API + GA4 Data API', types: ['reel', 'video', 'image', 'carousel', 'article'], fields: ['views', 'comments', 'clicks'], postNote: 'สร้างบทความบนเว็บไซต์ WordPress พร้อมตั้งเวลาเผยแพร่', statsNote: 'Pageviews ผู้ใช้ เวลาบนหน้า จาก Google Analytics 4', url: 'https://wordpress.com/' },
};
const CH_ORDER = ['facebook', 'instagram', 'youtube', 'tiktok', 'x', 'lemon8', 'line', 'web'];
const GUIDES = __GUIDES__;
const chb = (id, lg = false) => { const c = CH[id]; return `<span class="chb${lg ? ' lg' : ''}" style="background:${c.bg};color:${c.fg}" title="${esc(c.name)}">${c.s}</span>`; };
const chbs = ids => `<span class="chs">${ids.map(id => chb(id)).join('')}</span>`;
const capLabel = v => v === 'yes' ? 'ได้' : v === 'partial' ? 'บางส่วน' : 'ไม่ได้';

/* how a post to channel ch goes out for content c */
function publishMode(ch, c) {
  const k = CH[ch], st = CHS()[ch];
  if (workOf(c.work).manual) return { mode: 'manual', reason: 'งานประเภทนี้ต้องทำในระบบของแพลตฟอร์มเอง' };
  if (k.post === 'no') return { mode: 'manual', reason: 'แพลตฟอร์มไม่มี API สำหรับโพสต์' };
  if (!st.connected) return { mode: 'manual', reason: 'ยังไม่ได้เชื่อมต่อบัญชี' };
  if (!k.types.includes(c.type)) return { mode: 'manual', reason: `API ไม่รองรับ${TYPES[c.type]}` };
  if (ch === 'tiktok' && !st.audited) return { mode: 'draft', reason: 'ส่งเข้า Inbox ในแอป TikTok ต้องกดโพสต์เอง' };
  return { mode: 'auto', reason: 'โพสต์อัตโนมัติผ่าน API' };
}
const MODE_UI = { auto: { label: 'โพสต์อัตโนมัติ', icon: 'bolt', tone: 'ok' }, draft: { label: 'ส่งเป็นแบบร่าง', icon: 'inbox', tone: 'warn' }, manual: { label: 'ต้องโพสต์เอง', icon: 'hand', tone: 'bad' } };
const modeChip = (ch, c) => { const m = publishMode(ch, c), u = MODE_UI[m.mode]; return `<span class="mode" title="${esc(m.reason)}">${chb(ch)}<span style="color:var(--${u.tone})">${ic(u.icon, 'sm')}</span>${u.label}</span>`; };
const statsOk = ch => CH[ch].stats !== 'no' && CHS()[ch].connected;

/* preview frame per platform/format */
function previewFrame(p, f) {
  if (p === 'line') return { ratio: '1 / 1', layout: 'line', label: 'การ์ด LINE' };
  if (f === 'article') return { ratio: '16 / 9', layout: 'article', label: 'บทความ' };
  if (f === 'reel' || p === 'tiktok') return { ratio: '9 / 16', layout: 'vertical', label: 'แนวตั้ง 9:16' };
  if (p === 'youtube') return { ratio: '16 / 9', layout: 'youtube', label: 'แนวนอน 16:9' };
  if (p === 'instagram' || p === 'lemon8') return { ratio: '4 / 5', layout: 'feed', label: '4:5' };
  if (f === 'video') return { ratio: '16 / 9', layout: 'feed', label: 'แนวนอน 16:9' };
  return { ratio: '1 / 1', layout: 'feed', label: 'สี่เหลี่ยมจัตุรัส 1:1' };
}

/* ---------- seed ---------- */
const NOW = () => new Date();
function genMetrics(c, ch, rnd, age) {
  const base = { tiktok: 21000, instagram: 9200, facebook: 7400, youtube: 6100, web: 2300, x: 1900, line: 5200, lemon8: 2700 }[ch];
  const tf = { reel: 1.3, video: 1, image: .7, carousel: .9, article: .6 }[c.type];
  const views = Math.round(base * tf * (.45 + rnd() * 1.3) * Math.min(1, .35 + age / 10));
  const likes = Math.round(views * (.025 + rnd() * .06));
  const m = { views, likes, comments: Math.round(likes * (.05 + rnd() * .09)), shares: Math.round(likes * (.06 + rnd() * .16)), clicks: Math.round(views * (.008 + rnd() * .025)) };
  for (const k of Object.keys(FIELDS)) if (!CH[ch].fields.includes(k)) m[k] = null;
  return m;
}
function seed() {
  const now = NOW();
  const users = [
    { id: 'u1', name: 'กานต์ ศรีสุข', nick: 'กานต์', title: 'Digital Lead', color: '#3E4FE0' },
    { id: 'u2', name: 'พิมพ์ชนก วงศ์ดี', nick: 'พิม', title: 'Content Manager', color: '#0B7E8C' },
    { id: 'u3', name: 'ต้นกล้า มีสุข', nick: 'ต้น', title: 'Video Creator', color: '#C2313B' },
    { id: 'u4', name: 'มายด์ ธนพร', nick: 'มายด์', title: 'Graphic & Copywriter', color: '#A35F00' },
    { id: 'u5', name: 'บอส ปกรณ์', nick: 'บอส', title: 'Marketing Analyst', color: '#6B4FC8' },
  ];
  const projects = [
    { id: 'p1', name: 'Glow Lab Skincare', color: '#3E4FE0', roles: { u1: 'admin', u2: 'manager', u3: 'creator', u4: 'creator', u5: 'analyst' } },
    { id: 'p2', name: 'Bean Corner Café', color: '#A35F00', roles: { u1: 'admin', u2: 'admin', u4: 'creator', u5: 'analyst' } },
  ];
  const chans = {
    p1: { facebook: { connected: true, account: 'Glow Lab Skincare' }, instagram: { connected: true, account: '@glowlab.th' }, youtube: { connected: true, account: 'Glow Lab TH' },
      tiktok: { connected: true, account: '@glowlab', audited: false }, x: { connected: false }, lemon8: { connected: false }, line: { connected: true, account: 'LINE OA @glowlab' }, web: { connected: true, account: 'glowlab.co.th/blog' } },
    p2: Object.fromEntries(CH_ORDER.map(k => [k, { connected: false }])),
  };
  const S0 = { v: 2, uid: null, pid: 'p1', users, projects, chans, content: [], log: [] };
  S = S0;
  const at = (off, t) => { const d = addDays(startOfDay(now), off); const [h, m] = t.split(':').map(Number); d.setHours(h, m); return toLocal(d); };
  // off, time, title, type, work, channels, owner, status, pillar, art, c1, c2, nImages, caption
  const rows = [
    ['p1', -24, '19:00', '5 สัญญาณว่าผิวคุณกำลังขาดน้ำ', 'reel', 'VDO', ['facebook', 'instagram', 'tiktok', 'youtube'], 'u3', 'published', 0, 'bottle', '#9ED8F0', '#3E7FD6', 1, 'ผิวตึง ลอก หมองง่าย? เช็ก 5 สัญญาณนี้ก่อน แล้วคอมเมนต์บอกเราว่าเจอข้อไหนบ้าง 💧\n\n#ผิวขาดน้ำ #สกินแคร์'],
    ['p1', -21, '18:00', 'รีวิวเซรั่มวิตามินซี ใช้จริง 30 วัน', 'video', 'VDO', ['youtube', 'facebook', 'web'], 'u3', 'published', 1, 'bottle', '#FFD39A', '#F08A24', 1, 'ใช้จริงทุกวัน 30 วัน ถ่ายหน้าสดก่อน-หลังให้ดูชัดๆ'],
    ['p1', -18, '12:00', 'ลำดับการทาสกินแคร์ เช้า–เย็น', 'carousel', 'โพสต์ทั่วไป', ['instagram', 'facebook', 'lemon8'], 'u4', 'published', 0, 'jar', '#F6D5E5', '#C2557E', 3, 'เซฟไว้เลย! ลำดับทาที่ถูกต้อง เช้า 5 ขั้น เย็น 6 ขั้น'],
    ['p1', -15, '20:00', 'Q&A: ทากันแดดซ้ำยังไงไม่ให้หน้าเยิ้ม', 'reel', 'VDO', ['tiktok', 'instagram', 'facebook'], 'u3', 'published', 0, 'tube', '#FFF1A8', '#F2B705', 1, 'ทริกทากันแดดซ้ำระหว่างวัน แบบไม่ต้องล้างหน้า'],
    ['p1', -13, '10:00', 'ไนอะซินาไมด์ใช้คู่กับอะไรได้บ้าง', 'article', 'บทความ / SEO', ['web', 'facebook', 'line', 'x'], 'u4', 'published', 0, 'bottle', '#D7F2E3', '#2E9E6A', 1, 'สรุปครบ ใช้คู่กับอะไรได้ อะไรควรเลี่ยง พร้อมตารางเทียบ'],
    ['p1', -9, '11:11', 'โปรฯ 11.11 ลด 30% ทั้งร้าน', 'image', 'Broadcast', ['facebook', 'instagram', 'line', 'x', 'lemon8'], 'u4', 'published', 2, 'jar', '#FFB3B3', '#D7263D', 1, '11.11 ลด 30% ทั้งร้าน วันเดียวเท่านั้น!'],
    ['p1', -6, '19:00', 'ผิวแพ้ง่ายเลือกโทนเนอร์ยังไง', 'video', 'VDO', ['youtube', 'tiktok', 'facebook'], 'u3', 'published', 0, 'bottle', '#E3DFFF', '#6B4FC8', 1, 'เช็กส่วนผสม 4 ตัวที่คนผิวแพ้ง่ายควรเลี่ยง'],
    ['p1', -4, '12:30', 'รีวิวจากลูกค้าจริง: สิวผดหายใน 2 สัปดาห์', 'carousel', 'โพสต์ทั่วไป', ['instagram', 'facebook', 'lemon8'], 'u4', 'published', 4, 'tube', '#CFF4F7', '#0B7E8C', 2, 'ขอบคุณคุณแพรที่แชร์ประสบการณ์ 💙'],
    ['p1', -2, '20:00', 'Myth vs Fact: อยู่ในร่มต้องทากันแดดไหม', 'reel', 'VDO', ['tiktok', 'instagram', 'youtube', 'x'], 'u3', 'published', 0, 'tube', '#FFE0B2', '#E8730C', 1, 'อยู่ในร่มก็โดน UVA ได้นะ!'],
    ['p1', 0, 'NEXT', 'ทริกล้างหน้าให้สะอาดใน 60 วินาที', 'reel', 'VDO', ['tiktok', 'instagram', 'facebook'], 'u3', 'scheduled', 0, 'tube', '#BFE6FF', '#2763C4', 1, '60 วิ หน้าสะอาด ไม่แห้งตึง'],
    ['p1', 1, '12:00', 'วิธีอ่านฉลากสกินแคร์ให้เป็น', 'carousel', 'โพสต์ทั่วไป', ['instagram', 'facebook', 'lemon8'], 'u4', 'review', 0, 'jar', '#FBE7C6', '#C9822B', 2, 'ฉลากบอกอะไรเราบ้าง? ดู 6 จุดนี้ก่อนซื้อ'],
    ['p1', 2, '19:00', 'รีวิวมอยส์เจอไรเซอร์สูตรใหม่', 'video', 'VDO', ['youtube', 'facebook', 'tiktok'], 'u3', 'review', 1, 'jar', '#E8F5D0', '#6AA121', 1, 'เนื้อเจลบางเบา ซึมไว ทดสอบ 7 วัน'],
    ['p1', 3, '10:00', 'นับถอยหลัง 12.12 เปิดตัวเซ็ตของขวัญ', 'image', 'Ads', ['facebook', 'instagram'], 'u4', 'approved', 2, 'jar', '#FFD6E0', '#E63E6D', 1, 'เซ็ตของขวัญปลายปี เปิดจอง 12.12'],
    ['p1', 4, '19:30', 'สกินแคร์สำหรับผู้ชาย 3 ขั้นตอน', 'reel', 'VDO', ['tiktok', 'instagram', 'youtube'], 'u3', 'changes', 0, 'bottle', '#D0D7E2', '#3A4A63', 1, 'ผู้ชายก็ดูแลผิวง่ายๆ ได้ แค่ 3 ขั้น'],
    ['p1', 6, '10:00', 'กรดผลัดผิว AHA กับ BHA ต่างกันยังไง', 'article', 'บทความ / SEO', ['web', 'facebook', 'x'], 'u4', 'draft', 0, 'bottle', '#FFE9B8', '#E08E0B', 1, ''],
    ['p1', 7, '19:00', 'หน้าหนาวผิวลอกเป็นขุย แก้ยังไง', 'reel', 'VDO', ['tiktok', 'instagram', 'facebook', 'youtube'], 'u3', 'draft', 0, 'jar', '#DCEBFF', '#5B8DEF', 1, ''],
    ['p1', 9, '20:00', 'ไลฟ์ถามตอบกับเภสัชกร', 'video', 'Live', ['facebook', 'youtube'], 'u2', 'idea', 3, '', '', '', 0, ''],
    ['p1', 10, '12:00', 'ชวนแชร์รูทีนผิวฉ่ำ ลุ้นรับเซ็ตของขวัญ', 'image', 'KOL / Influencer', ['instagram', 'tiktok'], 'u4', 'idea', 4, '', '', '', 0, ''],
    ['p2', -8, '08:00', 'เปิดร้านสาขาใหม่ อารีย์', 'image', 'โพสต์ทั่วไป', ['facebook', 'instagram', 'line'], 'u4', 'published', 3, 'cup', '#F3E1C7', '#7A4A1E', 1, 'สาขาใหม่ใกล้ BTS อารีย์ เปิดแล้ววันนี้'],
    ['p2', 2, '09:00', 'เมนูใหม่ เอสเย็นมะพร้าว', 'image', 'โพสต์ทั่วไป', ['facebook', 'instagram', 'line'], 'u4', 'review', 2, 'cup', '#E9F5F2', '#2E8B74', 1, 'เมนูใหม่ประจำเดือน หอมมะพร้าว ไม่หวานมาก'],
    ['p2', 5, '10:00', 'รู้จักเมล็ดกาแฟคั่วกลาง', 'carousel', 'โพสต์ทั่วไป', ['instagram', 'lemon8'], 'u4', 'draft', 0, 'beans', '#FBEBD3', '#6B3E12', 2, ''],
  ];
  rows.forEach((r, i) => {
    const [project, off, t, title, type, work, chs, owner, status, pillar, art, c1, c2, nImg, caption] = r;
    const date = t === 'NEXT' ? (() => { const d = new Date(now.getTime() + 3 * 36e5); d.setMinutes(0); return toLocal(d); })() : at(off, t);
    const media = Array.from({ length: nImg }, (_, k) => k ? { art, c1: c2, c2: c1 } : { art, c1, c2 });
    const c = { id: 'c' + (i + 1), project, title, type, work, channels: chs, owner, status, pillar: PILLARS[pillar].name, date, caption, media,
      overrides: chs.includes('x') ? { x: title } : {}, fav: [], comments: [], results: {}, metrics: {} };
    S0.content.push(c);
    if (status === 'published') {
      S.pid = project;
      const rnd = rngOf(c.id); const age = Math.max(1, daysBetween(parse(date), now));
      for (const ch of chs) {
        const m = publishMode(ch, c);
        if (m.mode === 'auto') c.results[ch] = { state: 'posted', url: CH[ch].url, at: date };
        else if (off > -3 && (ch === 'x' || ch === 'lemon8')) { c.results[ch] = { state: 'manual-todo', reason: m.reason }; continue; }
        else c.results[ch] = { state: 'manual-done', url: CH[ch].url, at: date, by: owner };
        if (ch === 'lemon8' && off > -6) continue;
        c.metrics[ch] = { ...genMetrics(c, ch, rnd, age), src: statsOk(ch) ? 'api' : 'manual', at: toLocal(now) };
      }
      S.pid = 'p1';
    }
  });
  const C = id => S0.content.find(c => c.id === id);
  C('c1').fav = ['u1', 'u2']; C('c3').fav = ['u1']; C('c7').fav = ['u1', 'u5'];
  C('c14').comments = [
    { uid: 'u3', text: 'ส่งให้ตรวจครับ ไฟล์อยู่ในโฟลเดอร์ week 46', at: toLocal(addDays(now, -2)) },
    { uid: 'u2', text: 'ช่วงเปิดยาวไป ตัดให้เข้าเรื่องใน 3 วินาทีแรก และเปลี่ยนเพลงเป็นเพลงที่ใช้เชิงพาณิชย์ได้', at: toLocal(addDays(now, -1)) },
  ];
  C('c11').comments = [{ uid: 'u2', text: 'ตัวหนังสือบนรูปนี้เล็กไป ขยายอีกนิด', at: toLocal(now), mi: 0, x: .5, y: .3 }];
  S0.log = [
    { pid: 'p1', at: toLocal(now), uid: 'u4', text: 'ส่งคอนเทนต์ให้อนุมัติ', cid: 'c11' },
    { pid: 'p1', at: toLocal(now), uid: 'u3', text: 'ส่งคอนเทนต์ให้อนุมัติ', cid: 'c12' },
    { pid: 'p1', at: toLocal(addDays(now, -1)), uid: 'u2', text: 'ขอแก้ไข', cid: 'c14' },
    { pid: 'p1', at: toLocal(addDays(now, -1)), uid: 'u2', text: 'อนุมัติ', cid: 'c13' },
    { pid: 'p1', at: toLocal(addDays(now, -2)), uid: 'u2', text: 'เผยแพร่', cid: 'c9' },
    { pid: 'p2', at: toLocal(now), uid: 'u4', text: 'ส่งคอนเทนต์ให้อนุมัติ', cid: 'c20' },
  ];
  S0.uid = null; S0.pid = 'p1';
  return S0;
}

/* ---------- state ---------- */
const KEY = 'content-studio-demo-v2';
let S = null;
try { const raw = localStorage.getItem(KEY); const s = raw && JSON.parse(raw); S = s && s.v === 2 ? s : null; } catch (e) { S = null; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* อาจเต็มเพราะรูปที่อัปโหลด: ยังใช้งานต่อได้ในหน้านี้ */ } }
const UI = { drawer: null, modal: null, anim: false, menu: false, cal: null, calDay: null, calCh: 'all', calSt: 'all', calWork: 'all', calMine: false,
  libQ: '', libSt: 'all', libCh: 'all', libWork: 'all', range: 30, sort: 'views', apTab: 'review', pv: null, pin: null, pvIdx: 0, switcher: false };
const CHS = () => S.chans[S.pid];
const P = () => S.projects.find(p => p.id === S.pid);
const PC = () => S.content.filter(c => c.project === S.pid);
const me = () => S.users.find(u => u.id === S.uid);
const roleOf = (u = S.uid) => P().roles[u];
const user = id => S.users.find(u => u.id === id) || { nick: '?', name: '?', color: '#888' };
const getC = id => S.content.find(c => c.id === id);
const can = p => { const d = PERMS.find(x => x[0] === p); return !!(d && d[2].includes(roleOf())); };
const canEdit = c => c.status !== 'published' && (can('editAny') || (can('create') && c.owner === S.uid && ['idea', 'draft', 'changes'].includes(c.status)));
const isFav = c => c.fav.includes(S.uid);
const av = (id, lg) => { const u = user(id); return `<span class="av${lg ? ' lg' : ''}" style="background:${u.color}" title="${esc(u.name)}">${esc(u.nick.slice(0, 1))}</span>`; };
const statusPill = s => `<span class="pill t-${ST[s].tone}">${ST[s].label}</span>`;
const workChip = w => `<span class="wt-chip">${esc(w)}</span>`;
const log = (text, cid) => { S.log.unshift({ pid: S.pid, at: toLocal(NOW()), uid: S.uid, text, cid }); S.log = S.log.slice(0, 80); };
const totals = c => { let v = 0, e = 0; for (const m of Object.values(c.metrics)) { v += m.views || 0; e += (m.likes || 0) + (m.comments || 0) + (m.shares || 0); } return { views: v, eng: e, er: v ? e / v : 0 }; };
const manualQueue = () => { const out = []; for (const c of PC()) if (c.status === 'published') for (const [ch, r] of Object.entries(c.results)) if (r.state === 'manual-todo' || r.state === 'draft-sent') out.push({ c, ch, r }); return out; };
const missingMetrics = () => { const out = []; for (const c of PC()) if (c.status === 'published') for (const [ch, r] of Object.entries(c.results)) if ((r.state === 'manual-done' || r.state === 'posted') && !c.metrics[ch] && !statsOk(ch)) out.push({ c, ch }); return out; };
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600); }
const myProjects = () => S.projects.filter(p => p.roles[S.uid]);
if (!S) S = seed();

function cover(c, size = 'sm', ratio) {
  const src = mediaSrc(c);
  const st = ratio ? ` style="aspect-ratio:${ratio}"` : '';
  if (src) return `<span class="cover cover-${size}"${st}><img src="${src}" alt="" loading="lazy">${['reel', 'video'].includes(c.type) ? `<span class="cover-play">${ic('video', 'sm')}</span>` : ''}</span>`;
  const big = size === 'md' || size === 'lg';
  const fi = { reel: 'video', video: 'video', image: 'image', carousel: 'layers', article: 'pen' }[c.type];
  return `<span class="cover cover-${size} cover-gen" style="--cv:${pillarColor(c.pillar)};${ratio ? `aspect-ratio:${ratio}` : ''}">${ic(fi, 'sm')}${big ? `<span class="cover-title">${esc(c.title)}</span><span class="cover-fmt">${TYPES[c.type]}</span>` : ''}</span>`;
}

/* ---------- routing ---------- */
const VIEWS = {
  overview:  { label: 'ภาพรวม', icon: 'home', render: viewOverview },
  calendar:  { label: 'ปฏิทินคอนเทนต์', icon: 'calendar', render: viewCalendar },
  library:   { label: 'คลังคอนเทนต์', icon: 'layers', render: viewLibrary },
  approvals: { label: 'อนุมัติ & เผยแพร่', icon: 'approve', render: viewApprovals },
  reports:   { label: 'รายงานผล', icon: 'chart', render: viewReports },
  favorites: { label: 'รายการโปรด', icon: 'star', render: viewFavorites },
  channels:  { label: 'ช่องทางที่เชื่อมต่อ', icon: 'link', render: viewChannels },
  team:      { label: 'ทีมและสิทธิ์', icon: 'users', render: viewTeam },
};
const currentView = () => { const h = location.hash.slice(1); return VIEWS[h] ? h : 'overview'; };

/* ---------- render ---------- */
function render() {
  const app = $('#app');
  const db = $('.d-body'); const keep = db ? db.scrollTop : 0;
  if (!me()) { app.innerHTML = viewLogin(); return; }
  if (!roleOf()) S.pid = myProjects()[0].id;
  const v = currentView();
  app.innerHTML = `<div class="shell">${sidebar(v)}<main class="main">${topbar(v)}<div class="page">${VIEWS[v].render()}</div></main></div>
    ${UI.menu ? '<div class="scrim" data-act="menu" style="z-index:44"></div>' : ''}${drawerHTML()}${modalHTML()}`;
  const nb = $('.d-body'); if (nb && !UI.anim) nb.scrollTop = keep;
  UI.anim = false;
  bindChart();
}

function sidebar(v) {
  const pend = PC().filter(c => c.status === 'review').length + manualQueue().length;
  const link = k => `<a href="#${k}" ${k === v ? 'aria-current="page"' : ''}>${ic(VIEWS[k].icon)}<span>${VIEWS[k].label}</span>${k === 'approvals' && pend ? `<span class="count">${pend}</span>` : ''}</a>`;
  const p = P();
  return `<aside class="side${UI.menu ? ' open' : ''}">
    <div class="switcher" style="position:relative">
      <button type="button" class="sw-btn" data-act="switcher" aria-expanded="${UI.switcher}"><span class="brand-mark" style="background:${p.color}">${esc(p.name[0])}</span><span class="sw-name"><b>${esc(p.name)}</b><small>${ROLES[roleOf()].label}</small></span>${ic('right', 'sm sw-chev')}</button>
      ${UI.switcher ? `<div class="sw-menu"><div class="nav-label">สลับบริษัท / โปรเจกต์</div>${myProjects().map(x => `<a href="javascript:void 0" data-act="project:${x.id}" class="${x.id === S.pid ? 'on' : ''}"><span class="dot" style="background:${x.color}"></span>${esc(x.name)}<span class="small faint" style="margin-left:auto">${ROLES[x.roles[S.uid]].label}</span></a>`).join('')}</div>` : ''}
    </div>
    <nav class="nav nav-group"><div class="nav-label">Workspace</div>${['overview', 'calendar', 'library', 'approvals', 'reports', 'favorites'].map(link).join('')}</nav>
    <nav class="nav nav-group"><div class="nav-label">ตั้งค่า</div>${['channels', 'team'].map(link).join('')}</nav>
    <div class="side-foot">
      <div class="demo-note">ตัวอย่างนี้ใช้ข้อมูลจำลอง การเชื่อมต่อและการโพสต์เป็นการจำลองขั้นตอน สิ่งที่ทำจะเก็บไว้ในเบราว์เซอร์นี้</div>
      <button class="btn sm ghost" data-act="reset">${ic('undo', 'sm')}รีเซ็ตข้อมูลตัวอย่าง</button>
    </div>
  </aside>`;
}

function topbar(v) {
  const u = me(); const dark = effectiveTheme() === 'dark';
  return `<header class="topbar">
    <button class="btn icon ghost menu-btn" data-act="menu" aria-label="เปิดเมนู">${ic('menu')}</button>
    <div class="crumb"><span class="hide-sm">${esc(P().name)}</span><span class="hide-sm faint">/</span><b>${VIEWS[v].label}</b></div>
    <div class="top-actions">
      ${can('create') ? `<button class="btn primary sm" data-act="new">${ic('plus', 'sm')}<span class="hide-sm">สร้างคอนเทนต์</span></button>` : ''}
      <button class="btn icon ghost" data-act="theme" aria-label="สลับธีม">${ic(dark ? 'sun' : 'moon')}</button>
      <button class="me-chip" data-act="logout" title="สลับผู้ใช้">${av(u.id)}<span class="who"><b>${esc(u.nick)}</b><small>${ROLES[roleOf()].label}</small></span>${ic('logout', 'sm')}</button>
    </div>
  </header>`;
}
const effectiveTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const pageHead = (eyebrow, title, sub, actions = '') => `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;

/* ---------- login ---------- */
function viewLogin() {
  const bullets = {
    u1: ['ผู้ดูแลทั้ง 2 บริษัท', 'เชื่อมต่อ Facebook, YouTube, TikTok ฯลฯ', 'กำหนดบทบาทให้สมาชิกทีม'],
    u2: ['อนุมัติหรือขอแก้คอนเทนต์', 'กดเผยแพร่ / ตั้งเวลาโพสต์', 'เป็นผู้ดูแลของ Bean Corner Café'],
    u3: ['สร้างคอนเทนต์และส่งให้อนุมัติ', 'แก้ไขได้เฉพาะงานของตัวเอง', 'ยืนยันงานที่ต้องโพสต์เอง'],
    u4: ['ครีเอเตอร์ของทั้ง 2 บริษัท', 'สลับบริษัทได้ที่มุมซ้ายบน', 'แก้ไขได้เฉพาะงานของตัวเอง'],
    u5: ['ดูปฏิทินและรายงานผล', 'กรอกตัวเลขช่องทางที่ไม่มี API', 'แก้ไขคอนเทนต์ไม่ได้'],
  };
  return `<div class="login"><div class="login-box">
    <div class="brand"><div class="brand-mark">C</div><div><div class="brand-name">Content Studio</div><div class="brand-sub">ตัวอย่างระบบจัดการคอนเทนต์</div></div></div>
    <div style="display:flex;flex-direction:column;gap:6px"><h1>เลือกบัญชีเพื่อเข้าสู่ระบบ</h1>
    <p class="muted">แต่ละบทบาทเห็นเมนูและปุ่มไม่เหมือนกัน ลองเข้าทีละบัญชีเพื่อเทียบได้ ระบบจริงสมัครและล็อกอินด้วยอีเมล</p></div>
    <div class="login-users">${S.users.map(u => `<button class="ucard" data-act="login:${u.id}">
      <div class="row" style="gap:10px">${av(u.id, true)}<div><b>${esc(u.name)}</b><div class="small muted">${esc(u.title)}</div></div></div>
      <span class="pill t-accent plain" style="align-self:flex-start">${ROLES[S.projects[0].roles[u.id]].label}</span>
      <ul>${bullets[u.id].map(b => `<li>${b}</li>`).join('')}</ul></button>`).join('')}</div>
  </div></div>`;
}

/* ---------- overview ---------- */
function myTasks() {
  const u = me(), t = [];
  const push = (tone, icon, text, c, sub) => t.push({ tone, icon, text, c, sub });
  if (can('approve')) PC().filter(c => c.status === 'review').forEach(c => push('warn', 'approve', `อนุมัติ: ${c.title}`, c, `ส่งโดย ${user(c.owner).nick} · ลงวันที่ ${fmtD(c.date)}`));
  if (can('publish')) PC().filter(c => c.status === 'approved').forEach(c => push('accent', 'send', `ตั้งเวลา/เผยแพร่: ${c.title}`, c, `กำหนดลง ${fmtDT(c.date)}`));
  PC().filter(c => c.status === 'changes' && (c.owner === u.id || can('editAny'))).forEach(c => push('bad', 'pen', `แก้ตามคอมเมนต์: ${c.title}`, c, c.comments.length ? `“${c.comments[c.comments.length - 1].text.slice(0, 60)}…”` : ''));
  if (can('manual')) manualQueue().filter(q => q.c.owner === u.id || can('editAny')).forEach(q => push('bad', 'hand', `โพสต์เองที่ ${CH[q.ch].name}: ${q.c.title}`, q.c, q.r.reason || ''));
  if (roleOf() === 'creator') PC().filter(c => c.owner === u.id && ['idea', 'draft'].includes(c.status) && daysBetween(NOW(), parse(c.date)) <= 7).forEach(c => push('info', 'clock', `ทำให้เสร็จก่อน ${fmtD(c.date)}: ${c.title}`, c, ST[c.status].label));
  if (can('metrics')) missingMetrics().forEach(q => push('warn', 'chart', `กรอกผลลัพธ์ ${CH[q.ch].name}: ${q.c.title}`, q.c, 'ช่องทางนี้ดึงสถิติผ่าน API ไม่ได้'));
  return t;
}
function viewsInWindow(fromDaysAgo, toDaysAgo) {
  const now = NOW(); let v = 0, e = 0, n = 0;
  for (const c of PC()) { if (c.status !== 'published') continue; const d = daysBetween(parse(c.date), now); if (d >= toDaysAgo && d < fromDaysAgo) { const t = totals(c); v += t.views; e += t.eng; n++; } }
  return { v, e, n };
}
function delta(cur, prev) { if (!prev) return '<span class="faint">ไม่มีข้อมูลช่วงก่อน</span>'; const d = (cur - prev) / prev; return `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toFixed(0)}%</span> เทียบช่วงก่อน`; }
function chipHTML(c, drag) {
  const d = parse(c.date);
  return `<div class="chip cal-chip s-${ST[c.status].tone}" data-act="open:${c.id}" ${drag && canEdit(c) ? `draggable="true" data-drag="${c.id}"` : ''} title="${esc(c.title)} · ${ST[c.status].label}">${drag && canEdit(c) ? `<span class="grip">${ic('grip', 'sm')}</span>` : ''}${cover(c, 'xs')}<span class="tm">${pad(d.getHours())}:${pad(d.getMinutes())}</span><span class="tt">${esc(c.title)}</span></div>`;
}
function viewOverview() {
  const u = me(), now = NOW();
  const pend = PC().filter(c => c.status === 'review');
  const ready = PC().filter(c => ['approved', 'scheduled'].includes(c.status));
  const man = manualQueue();
  const cur = viewsInWindow(30, 0), prev = viewsInWindow(60, 30);
  const tasks = myTasks();
  const week = [...Array(7)].map((_, i) => addDays(startOfDay(now), i));
  const top = PC().filter(c => c.status === 'published' && daysBetween(parse(c.date), now) < 30).sort((a, b) => totals(b).views - totals(a).views).slice(0, 5);
  const hour = now.getHours();
  const greet = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  return `${pageHead(`${TH_D[now.getDay()]} ${now.getDate()} ${TH_MF[now.getMonth()]} ${now.getFullYear() + 543}`, `${greet}, ${esc(u.nick)}`, `บทบาท <b>${ROLES[roleOf()].label}</b> ใน ${esc(P().name)} · ${ROLES[roleOf()].desc}`)}
  <div class="kpis">
    <a class="tile${pend.length ? ' warn' : ''}" href="#approvals" data-act="aptab:review"><span class="eyebrow">รออนุมัติ</span><span class="k-val">${pend.length}</span><span class="k-sub">งานที่ส่งมาให้หัวหน้าตรวจ</span></a>
    <a class="tile" href="#approvals" data-act="aptab:ready"><span class="eyebrow">พร้อมเผยแพร่</span><span class="k-val">${ready.length}</span><span class="k-sub">ตั้งเวลาแล้ว ${ready.filter(c => c.status === 'scheduled').length}</span></a>
    <a class="tile${man.length ? ' bad' : ''}" href="#approvals" data-act="aptab:manual"><span class="eyebrow">ต้องโพสต์เอง</span><span class="k-val">${man.length}</span><span class="k-sub">ช่องทางที่ระบบโพสต์ให้ไม่ได้</span></a>
    <a class="tile" href="#reports"><span class="eyebrow">ยอดวิว 30 วัน</span><span class="k-val">${fmtN(cur.v)}</span><span class="k-sub">${delta(cur.v, prev.v)}</span></a>
  </div>
  <div class="cols">
    <section class="card"><div class="card-head"><h2>งานของฉัน</h2><span class="pill t-neutral plain">${tasks.length}</span></div>
      ${tasks.length ? `<div class="list">${tasks.slice(0, 8).map(t => `<div class="li" data-act="open:${t.c.id}">${cover(t.c, 'sm')}<div class="grow"><div class="title">${esc(t.text)}</div>${t.sub ? `<div class="sub">${esc(t.sub)}</div>` : ''}</div><span class="task-ico t-${t.tone}">${ic(t.icon, 'sm')}</span></div>`).join('')}</div>` : '<div class="empty">ไม่มีงานค้าง</div>'}
    </section>
    <section class="card"><div class="card-head"><h2>ความเคลื่อนไหวล่าสุด</h2></div>
      <div class="list">${S.log.filter(l => l.pid === S.pid).slice(0, 7).map(l => { const c = getC(l.cid); return `<div class="li" ${c ? `data-act="open:${c.id}"` : ''}>${av(l.uid)}<div class="grow"><div class="title"><b>${esc(user(l.uid).nick)}</b> ${esc(l.text)}${c ? ` · ${esc(c.title)}` : ''}</div><div class="sub">${ago(l.at)}</div></div></div>`; }).join('') || '<div class="empty">ยังไม่มีความเคลื่อนไหว</div>'}</div>
    </section>
  </div>
  <section class="card"><div class="card-head"><h2>7 วันข้างหน้า</h2><a class="sp small" href="#calendar">เปิดปฏิทิน</a></div>
    <div class="scroll-x"><div class="week">${week.map(d => { const items = PC().filter(c => parse(c.date).toDateString() === d.toDateString()).sort((a, b) => a.date.localeCompare(b.date));
      return `<div class="wday${d.toDateString() === now.toDateString() ? ' today' : ''}"><div class="wd">${TH_D[d.getDay()]} ${d.getDate()} ${TH_M[d.getMonth()]}</div>${items.map(c => chipHTML(c)).join('') || '<span class="small faint">ว่าง</span>'}</div>`; }).join('')}</div></div>
  </section>
  <section class="card"><div class="card-head"><h2>ผลงานดีสุด 30 วัน</h2><a class="sp small" href="#reports">ดูรายงาน</a></div>
    ${top.length ? `<div class="list">${top.map((c, i) => { const t = totals(c); return `<div class="li" data-act="open:${c.id}"><span class="num faint" style="width:18px">${i + 1}</span>${cover(c, 'sm')}<div class="grow"><div class="title">${esc(c.title)}</div><div class="sub">${fmtD(c.date)} · ER ${pct(t.er)}</div></div>${chbs(c.channels)}<b class="num">${fmtN(t.views)}</b></div>`; }).join('')}</div>` : '<div class="empty">ยังไม่มีผลงานที่เผยแพร่ใน 30 วันนี้</div>'}
  </section>`;
}

/* ---------- calendar ---------- */
function calFilter(c) {
  if (UI.calCh !== 'all' && !c.channels.includes(UI.calCh)) return false;
  if (UI.calSt !== 'all' && c.status !== UI.calSt) return false;
  if (UI.calWork !== 'all' && c.work !== UI.calWork) return false;
  if (UI.calMine && c.owner !== S.uid) return false;
  return true;
}
function viewCalendar() {
  const now = NOW();
  if (!UI.cal) UI.cal = { y: now.getFullYear(), m: now.getMonth() };
  const { y, m } = UI.cal;
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const end = addDays(last, (7 - last.getDay()) % 7);
  const byDay = {}; for (const c of PC().filter(calFilter)) (byDay[c.date.slice(0, 10)] ||= []).push(c);
  Object.values(byDay).forEach(a => a.sort((p, q) => p.date.localeCompare(q.date)));
  if (!UI.calDay) UI.calDay = dayKey(now);
  let cells = '';
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const k = dayKey(d), list = byDay[k] || [];
    cells += `<div class="${['cell', d.getMonth() !== m ? 'out' : '', k === dayKey(now) ? 'today' : '', k === UI.calDay ? 'sel' : ''].join(' ')}" data-act="calday:${k}" data-day="${k}">
      <div class="dn"><span>${d.getDate()}</span>${can('create') ? `<button class="add" data-act="new:${k}" aria-label="เพิ่มคอนเทนต์วันที่ ${d.getDate()}">${ic('plus', 'sm')}</button>` : ''}</div>
      ${list.slice(0, 3).map(c => chipHTML(c, true)).join('')}${list.length > 3 ? `<span class="more">+ อีก ${list.length - 3}</span>` : ''}
      <div class="dots">${list.map(c => `<span class="dot d-${ST[c.status].tone}"></span>`).join('')}</div></div>`;
  }
  const sel = byDay[UI.calDay] || [];
  const selD = parse(UI.calDay + 'T00:00');
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  return `${pageHead('ตารางงานทีม', 'ปฏิทินคอนเทนต์', 'ลากงานไปวางวันอื่นเพื่อย้ายวัน (เวลาเดิม) · งานที่อนุมัติแล้วถ้าย้ายวันจะกลับไปรออนุมัติใหม่')}
  <div class="cal-bar">
    <button class="btn icon" data-act="calmove:-1" aria-label="เดือนก่อน">${ic('left')}</button>
    <div class="cal-title">${TH_MF[m]} ${y + 543}</div>
    <button class="btn icon" data-act="calmove:1" aria-label="เดือนถัดไป">${ic('right')}</button>
    <button class="btn sm" data-act="calmove:0">วันนี้</button>
  </div>
  <div class="filters">
    <select class="select" id="cal-ch" data-change="calCh" aria-label="กรองช่องทาง">${opt('all', UI.calCh, 'ทุกช่องทาง')}${CH_ORDER.map(k => opt(k, UI.calCh, CH[k].name)).join('')}</select>
    <select class="select" id="cal-st" data-change="calSt" aria-label="กรองสถานะ">${opt('all', UI.calSt, 'ทุกสถานะ')}${Object.keys(ST).map(k => opt(k, UI.calSt, ST[k].label)).join('')}</select>
    <select class="select" id="cal-wk" data-change="calWork" aria-label="กรองประเภทงาน">${opt('all', UI.calWork, 'ทุกประเภทงาน')}${WORKS.map(w => opt(w.name, UI.calWork, w.name)).join('')}</select>
    <label class="check"><input type="checkbox" id="cal-mine" data-change="calMine" ${UI.calMine ? 'checked' : ''}>เฉพาะงานของฉัน</label>
  </div>
  <div class="legend">${Object.values(ST).map(s => `<span><i class="dot d-${s.tone}"></i>${s.label}</span>`).join('')}</div>
  <div class="cal">${['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>
  <section class="card"><div class="card-head"><h2>${TH_D[selD.getDay()]} ${selD.getDate()} ${TH_MF[selD.getMonth()]}</h2><span class="pill t-neutral plain">${sel.length} ชิ้น</span>${can('create') ? `<button class="btn sm sp" data-act="new:${UI.calDay}">${ic('plus', 'sm')}เพิ่มงานวันนี้</button>` : ''}</div>
    ${sel.length ? `<div class="list">${sel.map(rowLI).join('')}</div>` : '<div class="empty">ยังไม่มีคอนเทนต์ในวันนี้</div>'}
  </section>`;
}
function rowLI(c) {
  const d = parse(c.date);
  return `<div class="li" data-act="open:${c.id}"><span class="num muted" style="width:44px">${pad(d.getHours())}:${pad(d.getMinutes())}</span>${cover(c, 'sm')}<div class="grow"><div class="title">${esc(c.title)}</div><div class="sub">${esc(c.work)} · ${esc(user(c.owner).nick)}</div></div>${chbs(c.channels)}${statusPill(c.status)}</div>`;
}

/* ---------- library ---------- */
function libRows(list, emptyText) {
  if (!list.length) return `<div class="empty">${emptyText}</div>`;
  return `<div class="scroll-x"><table class="tbl"><thead><tr><th style="width:36px"></th><th>คอนเทนต์</th><th>ประเภทงาน</th><th>ช่องทาง</th><th>ผู้รับผิดชอบ</th><th>วันลง</th><th>สถานะ</th><th class="r">ยอดวิว</th></tr></thead><tbody>
  ${list.map(c => { const t = totals(c); return `<tr data-act="open:${c.id}">
    <td><button class="star${isFav(c) ? ' on' : ''}" data-act="fav:${c.id}" aria-label="รายการโปรด">${ic('star', isFav(c) ? 'filled' : '')}</button></td>
    <td><span class="t-cell">${cover(c, 'sm')}<span><span class="t-title">${esc(c.title)}</span><br><span class="small muted">${TYPES[c.type]} · ${esc(c.pillar)}</span></span></span></td>
    <td>${workChip(c.work)}</td><td>${chbs(c.channels)}</td><td><span class="row" style="gap:8px;flex-wrap:nowrap">${av(c.owner)}${esc(user(c.owner).nick)}</span></td>
    <td class="num">${fmtD(c.date)}</td><td>${statusPill(c.status)}</td><td class="r num">${c.status === 'published' ? fmtN(t.views) : '–'}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function libList() {
  const q = UI.libQ.trim().toLowerCase();
  return PC().filter(c => (!q || c.title.toLowerCase().includes(q) || c.caption.toLowerCase().includes(q))
    && (UI.libSt === 'all' || c.status === UI.libSt) && (UI.libCh === 'all' || c.channels.includes(UI.libCh)) && (UI.libWork === 'all' || c.work === UI.libWork))
    .sort((a, b) => b.date.localeCompare(a.date));
}
function viewLibrary() {
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  return `${pageHead('ทุกชิ้นงาน', 'คลังคอนเทนต์', 'ค้นหา กรอง และกดดาวเก็บงานที่อยากกลับมาดูเป็นรายการโปรด')}
  <div class="filters">
    <input class="input" id="lib-q" type="search" placeholder="ค้นหาชื่อหรือแคปชัน" value="${esc(UI.libQ)}" data-input="libQ" aria-label="ค้นหา">
    <select class="select" id="lib-st" data-change="libSt" aria-label="สถานะ">${opt('all', UI.libSt, 'ทุกสถานะ')}${Object.keys(ST).map(k => opt(k, UI.libSt, ST[k].label)).join('')}</select>
    <select class="select" id="lib-wk" data-change="libWork" aria-label="ประเภทงาน">${opt('all', UI.libWork, 'ทุกประเภทงาน')}${WORKS.map(w => opt(w.name, UI.libWork, w.name)).join('')}</select>
    <select class="select" id="lib-ch" data-change="libCh" aria-label="ช่องทาง">${opt('all', UI.libCh, 'ทุกช่องทาง')}${CH_ORDER.map(k => opt(k, UI.libCh, CH[k].name)).join('')}</select>
  </div>
  <section class="card" style="padding:6px 8px"><div id="lib-list">${libRows(libList(), 'ไม่พบคอนเทนต์ที่ตรงกับตัวกรอง')}</div></section>`;
}

/* ---------- approvals ---------- */
function viewApprovals() {
  const review = PC().filter(c => c.status === 'review').sort((a, b) => a.date.localeCompare(b.date));
  const ready = PC().filter(c => ['approved', 'scheduled'].includes(c.status)).sort((a, b) => a.date.localeCompare(b.date));
  const man = manualQueue();
  const tab = UI.apTab;
  const tabBtn = (k, label, n) => `<button role="tab" aria-selected="${tab === k}" data-act="aptab:${k}">${label}<span class="n">${n}</span></button>`;
  let body = '';
  if (tab === 'review') {
    body = (!can('approve') ? `<div class="banner">${ic('info')}<div>คุณดูคิวได้ แต่การอนุมัติทำได้เฉพาะหัวหน้าคอนเทนต์และผู้ดูแลโปรเจกต์</div></div>` : '') +
      (review.length ? review.map(c => qCard(c, can('approve') ? `<button class="btn ok" data-act="approve:${c.id}">${ic('check', 'sm')}อนุมัติ</button><button class="btn bad" data-act="open:${c.id}:changes">${ic('pen', 'sm')}ขอแก้ไข</button>` : '')).join('') : '<div class="card empty">ไม่มีงานรออนุมัติ</div>');
  } else if (tab === 'ready') {
    body = (!can('publish') ? `<div class="banner">${ic('info')}<div>การกดเผยแพร่ทำได้เฉพาะหัวหน้าคอนเทนต์และผู้ดูแลโปรเจกต์</div></div>` : '') +
      (ready.length ? ready.map(c => qCard(c, can('publish') ? (c.status === 'approved'
        ? `<button class="btn primary" data-act="publish:${c.id}">${ic('send', 'sm')}เผยแพร่ตอนนี้</button><button class="btn" data-act="schedule:${c.id}">${ic('clock', 'sm')}ตั้งเวลาตามปฏิทิน</button>`
        : `<button class="btn primary" data-act="publish:${c.id}">${ic('send', 'sm')}เผยแพร่ตอนนี้</button><button class="btn" data-act="unschedule:${c.id}">ยกเลิกตั้งเวลา</button>`) : '')).join('') : '<div class="card empty">ยังไม่มีงานที่อนุมัติแล้ว</div>');
  } else {
    body = `<div class="banner warn">${ic('hand')}<div>ช่องทางที่ระบบโพสต์ให้ไม่ได้ (ไม่มี API, ยังไม่ได้เชื่อมต่อ, API ไม่รองรับ หรือเป็นงานที่ต้องทำเองเช่น Ads) คัดลอกแคปชันไปโพสต์ แล้ววางลิงก์โพสต์เพื่อปิดงาน</div></div>` +
      (man.length ? `<section class="card"><div class="list">${man.map(({ c, ch, r }) => `<div class="pub-row">${cover(c, 'sm')}<div class="what">
        <div class="line1">${chb(ch)}<b>${esc(c.title)}</b><span class="pill t-${r.state === 'draft-sent' ? 'warn' : 'bad'}">${r.state === 'draft-sent' ? 'แบบร่างรออยู่ในแอป' : 'ต้องโพสต์เอง'}</span></div>
        <div class="small muted">${CH[ch].name} · ${esc(r.reason || '')} · ผู้รับผิดชอบ ${esc(user(c.owner).nick)}</div>
        ${manualBox(c, ch)}</div></div>`).join('')}</div></section>` : '<div class="card empty">ไม่มีงานที่ต้องโพสต์เอง</div>');
  }
  return `${pageHead('ขั้นตอนก่อนขึ้นโพสต์', 'อนุมัติ & เผยแพร่', 'ครีเอเตอร์ส่งงาน → หัวหน้าอนุมัติ → กดเผยแพร่ ระบบโพสต์ให้ทุกช่องทางที่ทำได้ และแจ้งช่องทางที่ต้องโพสต์เอง')}
  <div class="tabs" role="tablist">${tabBtn('review', 'รออนุมัติ', review.length)}${tabBtn('ready', 'พร้อมเผยแพร่', ready.length)}${tabBtn('manual', 'ต้องโพสต์เอง', man.length)}</div>${body}`;
}
function qCard(c, actions) {
  return `<section class="card qcard2"><span class="q-cover" data-act="open:${c.id}" style="cursor:pointer">${cover(c, 'md')}</span><div style="min-width:0;display:flex;flex-direction:column;gap:8px">
    <div class="row" style="gap:8px">${statusPill(c.status)}${workChip(c.work)}<span class="small muted">${TYPES[c.type]} · ${esc(c.pillar)}</span></div>
    <h3 style="cursor:pointer" data-act="open:${c.id}">${esc(c.title)}</h3>
    <div class="small muted row" style="gap:8px">${av(c.owner)}${esc(user(c.owner).nick)} · ${c.status === 'scheduled' ? 'จะโพสต์' : 'กำหนดลง'} ${fmtDT(c.date)}</div>
    ${c.caption ? `<div class="caption-box" style="max-height:110px">${esc(c.caption)}</div>` : ''}
    <div class="cap-row">${c.channels.map(ch => modeChip(ch, c)).join('')}</div>
    <div class="act-bar">${actions}<button class="btn ghost" data-act="open:${c.id}">ดูรายละเอียด</button></div>
  </div></section>`;
}
function manualBox(c, ch) {
  if (!can('manual') || (!can('editAny') && c.owner !== S.uid)) return '<div class="small faint">รอผู้รับผิดชอบโพสต์และยืนยัน</div>';
  return `<div class="manual-box"><button class="btn sm" data-act="copy:${c.id}:${ch}">${ic('copy', 'sm')}คัดลอกแคปชัน</button>
    <a class="btn sm" href="${CH[ch].url}" target="_blank" rel="noopener">${ic('ext', 'sm')}เปิด ${CH[ch].name}</a></div>
    <div class="manual-box"><input class="input" id="url-${c.id}-${ch}" placeholder="วางลิงก์โพสต์ที่โพสต์แล้ว (https://…)" aria-label="ลิงก์โพสต์">
    <button class="btn sm ok" data-act="mdone:${c.id}:${ch}">${ic('check', 'sm')}โพสต์แล้ว</button></div>`;
}

/* ---------- reports ---------- */
const DECAY = [.30, .18, .12, .09, .07, .06, .05, .04, .03, .02, .015, .01, .008, .007];
function dailySeries(days) {
  const now = startOfDay(NOW()); const start = addDays(now, -(days - 1));
  const arr = [...Array(days)].map((_, i) => ({ d: addDays(start, i), v: 0 }));
  for (const c of PC()) { if (c.status !== 'published') continue; const v = totals(c).views; const p = daysBetween(start, parse(c.date));
    DECAY.forEach((w, i) => { const idx = p + i; if (idx >= 0 && idx < days) arr[idx].v += v * w; }); }
  return arr;
}
function niceMax(m) { if (m <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(m))); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function areaChart(series) {
  const W = 760, H = 240, L = 48, R = 14, T = 14, B = 28, n = series.length;
  const max = niceMax(Math.max(...series.map(s => s.v)) * 1.05);
  const x = i => L + (W - L - R) * (n === 1 ? .5 : i / (n - 1)), y = v => T + (H - T - B) * (1 - v / max);
  let grid = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="lbl" x="${L - 8}" y="${yy + 4}" text-anchor="end">${fmtN(v)}</text>`; }
  const step = Math.ceil(n / 6);
  let xl = ''; series.forEach((s, i) => { if ((n - 1 - i) % step === 0) xl += `<text class="lbl" x="${x(i)}" y="${H - 8}" text-anchor="${i === n - 1 ? 'end' : 'middle'}">${fmtD(s.d)}</text>`; });
  const line = 'M' + series.map((s, i) => `${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join('L'), area = `${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  return `<div class="chart-wrap" id="trend" data-series='${JSON.stringify(series.map(s => [fmtD(s.d), Math.round(s.v)]))}' data-geo="${[W, H, L, R, T, B, max].join(',')}">
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="ยอดวิวรายวัน">${grid}${xl}<path class="area" d="${area}"/><path class="line" d="${line}"/>
    <circle class="end" cx="${x(n - 1)}" cy="${y(series[n - 1].v)}" r="4.5"/><line class="guide" id="g-line" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><circle class="end" id="g-dot" r="4" visibility="hidden"/>
    <rect id="g-hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg><div class="tip" id="g-tip" hidden></div></div>`;
}
function bindChart() {
  const w = $('#trend'); if (!w) return;
  const data = JSON.parse(w.dataset.series); const [W, H, L, R, T, B, max] = w.dataset.geo.split(',').map(Number);
  const svg = $('svg', w), hit = $('#g-hit'), gl = $('#g-line'), gd = $('#g-dot'), tip = $('#g-tip'); const n = data.length;
  hit.addEventListener('pointermove', ev => { const r = svg.getBoundingClientRect(); const sx = (ev.clientX - r.left) / r.width * W; const i = Math.max(0, Math.min(n - 1, Math.round((sx - L) / (W - L - R) * (n - 1))));
    const xx = L + (W - L - R) * (n === 1 ? .5 : i / (n - 1)), yy = T + (H - T - B) * (1 - data[i][1] / max);
    gl.setAttribute('x1', xx); gl.setAttribute('x2', xx); gl.setAttribute('visibility', 'visible'); gd.setAttribute('cx', xx); gd.setAttribute('cy', yy); gd.setAttribute('visibility', 'visible');
    tip.hidden = false; tip.style.left = (xx / W * r.width) + 'px'; tip.style.top = (yy / H * r.height) + 'px'; tip.textContent = `${data[i][0]} · ${data[i][1].toLocaleString('en-US')} วิว`; });
  hit.addEventListener('pointerleave', () => { gl.setAttribute('visibility', 'hidden'); gd.setAttribute('visibility', 'hidden'); tip.hidden = true; });
}
function viewReports() {
  const days = UI.range, now = NOW();
  const inRange = PC().filter(c => c.status === 'published' && daysBetween(parse(c.date), now) < days);
  const cur = viewsInWindow(days, 0), prev = viewsInWindow(days * 2, days);
  const er = cur.v ? cur.e / cur.v : 0;
  const byCh = {}; for (const ch of CH_ORDER) byCh[ch] = { v: 0, e: 0, api: 0, man: 0, miss: 0 };
  const byWork = {};
  for (const c of inRange) {
    const t = totals(c); const w = (byWork[c.work] ||= { v: 0, e: 0, n: 0 }); w.v += t.views; w.e += t.eng; w.n++;
    for (const ch of c.channels) { const m = c.metrics[ch], b = byCh[ch]; if (!m) { if (c.results[ch] && !['manual-todo', 'draft-sent'].includes(c.results[ch].state)) b.miss++; continue; } b.v += m.views || 0; b.e += (m.likes || 0) + (m.comments || 0) + (m.shares || 0); m.src === 'api' ? b.api++ : b.man++; }
  }
  const chs = CH_ORDER.filter(ch => byCh[ch].v || byCh[ch].miss).sort((a, b) => byCh[b].v - byCh[a].v);
  const maxV = Math.max(1, ...chs.map(ch => byCh[ch].v));
  const sorted = [...inRange].sort((a, b) => UI.sort === 'er' ? totals(b).er - totals(a).er : UI.sort === 'date' ? b.date.localeCompare(a.date) : totals(b).views - totals(a).views);
  const miss = missingMetrics();
  const rangeBtn = d => `<button aria-pressed="${days === d}" data-act="range:${d}">${d} วัน</button>`;
  return `${pageHead('ผลลัพธ์จากทุกช่องทาง', 'รายงานผล', 'ช่องทางที่เชื่อมต่อแล้วดึงตัวเลขจาก API อัตโนมัติทุก 6 ชั่วโมง ที่เหลือกรอกเอง',
    `<div class="seg">${rangeBtn(7)}${rangeBtn(30)}${rangeBtn(90)}</div><button class="btn" data-act="sync">${ic('refresh', 'sm')}ดึงข้อมูลล่าสุด</button>`)}
  <div class="kpis">
    <div class="tile"><span class="eyebrow">ยอดวิวรวม</span><span class="k-val">${fmtN(cur.v)}</span><span class="k-sub">${delta(cur.v, prev.v)}</span></div>
    <div class="tile"><span class="eyebrow">Engagement</span><span class="k-val">${fmtN(cur.e)}</span><span class="k-sub">${delta(cur.e, prev.e)}</span></div>
    <div class="tile"><span class="eyebrow">Engagement rate</span><span class="k-val">${pct(er)}</span><span class="k-sub">ไลก์ + คอมเมนต์ + แชร์ ÷ ยอดวิว</span></div>
    <div class="tile"><span class="eyebrow">ชิ้นที่เผยแพร่</span><span class="k-val">${cur.n}</span><span class="k-sub">${prev.n ? `ช่วงก่อน ${prev.n} ชิ้น` : '<span class="faint">ไม่มีข้อมูลช่วงก่อน</span>'}</span></div>
  </div>
  ${miss.length ? `<section class="card"><div class="card-head"><h2>ตัวเลขที่ยังขาด</h2><span class="pill t-warn plain">${miss.length}</span><span class="sp small muted">ช่องทางที่ดึงสถิติอัตโนมัติไม่ได้ ต้องกรอกเอง</span></div>
    <div class="list">${miss.map(({ c, ch }) => `<div class="li" data-act="open:${c.id}">${cover(c, 'sm')}${chb(ch)}<div class="grow"><div class="title">${esc(c.title)}</div><div class="sub">${CH[ch].name} · โพสต์เมื่อ ${fmtD(c.date)}</div></div>${can('metrics') ? `<button class="btn sm" data-act="metrics:${c.id}:${ch}">${ic('pen', 'sm')}กรอกตัวเลข</button>` : ''}</div>`).join('')}</div></section>` : ''}
  <div class="cols">
    <section class="card"><div class="card-head"><h2>ยอดวิวรายวัน</h2><span class="sp small muted">รวมทุกช่องทาง</span></div>${areaChart(dailySeries(days))}</section>
    <section class="card"><div class="card-head"><h2>แยกตามช่องทาง</h2></div>
      <div class="bars">${chs.map(ch => { const b = byCh[ch]; return `<div class="bar-row"><div class="nm">${chb(ch)}<span>${CH[ch].name}</span></div><div style="display:flex;flex-direction:column;gap:3px;min-width:0"><div class="bar-track"><div class="bar-fill${b.man > b.api ? ' manual' : ''}" style="width:${(b.v / maxV * 100).toFixed(1)}%"></div></div><div class="small faint">${b.api ? `<span class="src api">API ${b.api}</span> ` : ''}${b.man ? `<span class="src manual">กรอกเอง ${b.man}</span> ` : ''}${b.miss ? `<span class="src miss">ขาด ${b.miss}</span>` : ''} · ER ${b.v && CH[ch].fields.includes('likes') ? pct(b.e / b.v) : '–'}</div></div><b class="num" style="text-align:right">${fmtN(b.v)}</b></div>`; }).join('') || '<div class="empty">ยังไม่มีข้อมูลในช่วงนี้</div>'}</div>
    </section>
  </div>
  <section class="card" style="padding:6px 8px"><div class="card-head" style="padding:10px 10px 0"><h2>แยกตามประเภทงาน</h2></div>
    ${Object.keys(byWork).length ? `<div class="scroll-x"><table class="tbl" style="min-width:420px"><thead><tr><th>ประเภทงาน</th><th class="r">ชิ้น</th><th class="r">ยอดวิว</th><th class="r">ER</th></tr></thead><tbody>${Object.entries(byWork).sort((a, b) => b[1].v - a[1].v).map(([k, w]) => `<tr style="cursor:default"><td>${workChip(k)}</td><td class="r num">${w.n}</td><td class="r num">${fmtN(w.v)}</td><td class="r num">${w.v ? pct(w.e / w.v) : '–'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">ยังไม่มีข้อมูล</div>'}
  </section>
  <section class="card" style="padding:6px 8px"><div class="card-head" style="padding:10px 10px 0"><h2>ผลรายคอนเทนต์</h2>
    <select class="select sp" id="rep-sort" data-change="sort" style="width:auto" aria-label="เรียงตาม"><option value="views" ${UI.sort === 'views' ? 'selected' : ''}>เรียงตามยอดวิว</option><option value="er" ${UI.sort === 'er' ? 'selected' : ''}>เรียงตาม ER</option><option value="date" ${UI.sort === 'date' ? 'selected' : ''}>ล่าสุดก่อน</option></select></div>
    ${sorted.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th style="width:36px"></th><th>คอนเทนต์</th><th>ช่องทาง</th><th class="r">ยอดวิว</th><th class="r">Engagement</th><th class="r">ER</th><th>ที่มาของข้อมูล</th></tr></thead><tbody>
    ${sorted.map(c => { const t = totals(c); const api = c.channels.filter(ch => c.metrics[ch]?.src === 'api').length, mn = c.channels.filter(ch => c.metrics[ch]?.src === 'manual').length, ms = c.channels.filter(ch => !c.metrics[ch]).length;
      return `<tr data-act="open:${c.id}"><td><button class="star${isFav(c) ? ' on' : ''}" data-act="fav:${c.id}" aria-label="รายการโปรด">${ic('star', isFav(c) ? 'filled' : '')}</button></td>
      <td><span class="t-cell">${cover(c, 'sm')}<span><span class="t-title">${esc(c.title)}</span><br><span class="small muted">${fmtD(c.date)} · ${esc(c.work)}</span></span></span></td><td>${chbs(c.channels)}</td>
      <td class="r num">${fmtN(t.views)}</td><td class="r num">${fmtN(t.eng)}</td><td class="r num">${pct(t.er)}</td>
      <td>${api ? `<span class="src api">API ${api}</span> ` : ''}${mn ? `<span class="src manual">กรอกเอง ${mn}</span> ` : ''}${ms ? `<span class="src miss">ขาด ${ms}</span>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="empty">ยังไม่มีคอนเทนต์ที่เผยแพร่ในช่วงนี้</div>'}
  </section>`;
}

/* ---------- favorites ---------- */
function viewFavorites() {
  const list = PC().filter(isFav).sort((a, b) => b.date.localeCompare(a.date));
  return `${pageHead('เก็บไว้ดูภายหลัง', 'รายการโปรด', 'กดดาวที่คอนเทนต์ใดก็ได้เพื่อเก็บไว้ที่นี่ รายการโปรดแยกตามผู้ใช้แต่ละคน')}
  <section class="card" style="padding:6px 8px">${libRows(list, 'ยังไม่มีรายการโปรด กดดาวในคลังคอนเทนต์หรือรายงานผลเพื่อเพิ่ม')}</section>`;
}

/* ---------- channels ---------- */
function viewChannels() {
  const conn = CH_ORDER.filter(ch => CH[ch].post !== 'no' && CHS()[ch].connected).length;
  const adm = can('channels');
  return `${pageHead('การเชื่อมต่อ API', 'ช่องทางที่เชื่อมต่อ', `${esc(P().name)} เชื่อมต่อแล้ว ${conn} จาก 7 ช่องทางที่มี API · ช่องทางที่โพสต์อัตโนมัติไม่ได้ ระบบจะสร้างงาน "ต้องโพสต์เอง" ให้ทันทีที่กดเผยแพร่`)}
  ${adm ? '' : `<div class="banner">${ic('info')}<div>การเชื่อมต่อทำได้เฉพาะผู้ดูแลโปรเจกต์ คุณเปิดดูคู่มือแต่ละช่องทางได้</div></div>`}
  <div class="legend"><span><span class="cap yes">ได้</span> ทำผ่าน API ได้เต็มที่</span><span><span class="cap partial">บางส่วน</span> ทำได้แต่มีเงื่อนไข</span><span><span class="cap no">ไม่ได้</span> ต้องทำเอง</span></div>
  <div class="ch-grid">${CH_ORDER.map(ch => { const c = CH[ch], st = CHS()[ch], g = GUIDES[ch];
    const status = c.post === 'no' ? '<span class="pill t-warn">ไม่มี API · โพสต์เอง</span>' : st.connected ? '<span class="pill t-ok">เชื่อมต่อแล้ว</span>' : '<span class="pill t-neutral">ยังไม่เชื่อมต่อ</span>';
    return `<section class="card ch-card">
      <div class="ch-top">${chb(ch, true)}<div class="grow"><h2>${c.name}</h2><div class="small muted">${c.api}</div>${st.connected ? `<div class="small">บัญชี: <b>${esc(st.account)}</b></div>` : ''}</div>${status}</div>
      <div>
        <div class="capline"><span class="k">โพสต์อัตโนมัติ</span><div class="v"><span><span class="cap ${c.post}">${capLabel(c.post)}</span></span><span>${c.postNote}</span></div></div>
        <div class="capline"><span class="k">ดึงสถิติ</span><div class="v"><span><span class="cap ${c.stats}">${capLabel(c.stats)}</span></span><span>${c.statsNote}</span></div></div>
      </div>
      ${g.availability !== 'manual_only' && !st.connected ? `<div class="req"><b>เตรียมไว้ก่อน:</b><ul style="margin:4px 0 0;padding-left:18px">${g.prepare.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${ch === 'tiktok' && st.connected ? `<label class="check"><span class="switch"><input type="checkbox" id="tt-audit" data-change="audit" ${st.audited ? 'checked' : ''} ${adm ? '' : 'disabled'}><span></span></span>แอปผ่าน TikTok audit แล้ว (เปิดเพื่อจำลองการโพสต์ตรง)</label>` : ''}
      <div class="ch-foot">${c.post === 'no' ? `<button class="btn" data-act="wizard:${ch}">${ic('hand', 'sm')}ดูวิธีโพสต์เองและบันทึกผล</button>`
        : st.connected ? `<button class="btn" data-act="disconnect:${ch}" ${adm ? '' : 'disabled'}>ตัดการเชื่อมต่อ</button><button class="btn ghost" data-act="wizard:${ch}">${ic('info', 'sm')}คู่มือ</button>`
        : `<button class="btn${adm ? ' primary' : ''}" data-act="wizard:${ch}">${ic('link', 'sm')}${adm ? 'เชื่อมต่อบัญชี' : 'ดูวิธีเชื่อมต่อ'}</button>`}
        <a class="btn ghost sm" href="${c.url}" target="_blank" rel="noopener">${ic('ext', 'sm')}เปิด ${c.name}</a></div>
    </section>`; }).join('')}</div>`;
}

/* ---------- team ---------- */
function viewTeam() {
  const adm = can('team'), myRole = roleOf();
  const members = S.users.filter(u => P().roles[u.id]);
  return `${pageHead('สิทธิ์การใช้งาน', 'ทีมและสิทธิ์', `สมาชิกของ ${esc(P().name)} · คนเดียวมีบทบาทต่างกันในแต่ละบริษัทได้`)}
  <section class="card" style="padding:6px 8px"><div class="scroll-x"><table class="tbl" style="min-width:620px"><thead><tr><th>สมาชิก</th><th>ตำแหน่ง</th><th>บทบาท</th><th class="r">งานที่ถืออยู่</th></tr></thead><tbody>
  ${members.map(u => `<tr style="cursor:default"><td><span class="row" style="gap:10px;flex-wrap:nowrap">${av(u.id)}<b>${esc(u.name)}</b>${u.id === S.uid ? '<span class="pill t-accent plain">คุณ</span>' : ''}</span></td><td class="muted">${esc(u.title)}</td>
    <td>${adm && u.id !== S.uid ? `<select class="select" style="width:auto" id="role-${u.id}" data-change="role:${u.id}" aria-label="บทบาทของ ${esc(u.nick)}">${Object.keys(ROLES).map(r => `<option value="${r}" ${r === P().roles[u.id] ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select>` : `<span class="pill t-neutral plain">${ROLES[P().roles[u.id]].label}</span>`}</td>
    <td class="r num">${PC().filter(c => c.owner === u.id && c.status !== 'published').length}</td></tr>`).join('')}
  </tbody></table></div></section>
  <section class="card" style="padding:6px 8px"><div class="card-head" style="padding:10px 10px 0"><h2>สิทธิ์ของแต่ละบทบาท</h2></div><div class="scroll-x"><table class="tbl" style="min-width:620px"><thead><tr><th>สิ่งที่ทำได้</th>${Object.keys(ROLES).map(r => `<th class="r" style="${r === myRole ? 'color:var(--accent)' : ''}">${ROLES[r].label}</th>`).join('')}</tr></thead><tbody>
  ${PERMS.map(p => `<tr style="cursor:default"><td>${p[1]}</td>${Object.keys(ROLES).map(r => `<td class="r">${p[2].includes(r) ? `<span style="color:var(--ok)">${ic('check', 'sm')}</span>` : '<span class="faint">–</span>'}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div></section>
  <section class="card"><div class="card-head"><h2>ประเภทงานของโปรเจกต์นี้</h2><span class="sp small muted">ระบบจริงแก้รายการได้ในหน้าตั้งค่าโปรเจกต์</span></div>
    <div class="row" style="gap:6px">${WORKS.map(w => `${workChip(w.name)}${w.manual ? '<span class="small faint">(ทำเองเสมอ)</span>' : ''}`).join(' ')}</div></section>`;
}

/* ---------- drawer ---------- */
function preview(c) {
  const tab = c.channels.includes(UI.pv) ? UI.pv : c.channels[0];
  if (!tab) return '<div class="empty">ยังไม่ได้เลือกช่องทาง</div>';
  const f = previewFrame(tab, c.type);
  const cap = (c.overrides && c.overrides[tab]) || c.caption;
  const idx = Math.min(UI.pvIdx, Math.max(0, c.media.length - 1));
  const src = mediaSrc(c, idx);
  const vis = src ? `<img class="pv-media" style="aspect-ratio:${f.ratio}" src="${src}" alt="">` : cover(c, 'lg', f.ratio);
  const dots = c.media.length > 1 ? `<div class="pv-dots">${c.media.map((_, i) => `<button class="${i === idx ? 'on' : ''}" data-act="pvidx:${i}" aria-label="ไฟล์ที่ ${i + 1}"></button>`).join('')}</div>` : '';
  const name = esc(CHS()[tab]?.account || P().name);
  let stage = '';
  if (f.layout === 'vertical') stage = `<div class="pv-phone">${vis}<div class="pv-overlay"><b>@${name}</b><p>${esc(cap || c.title)}</p></div><div class="pv-side">${ic('star')}${ic('send')}${ic('copy')}</div>${dots}</div>`;
  else if (f.layout === 'feed') stage = `<div class="pv-feed"><div class="pv-head">${chb(tab)}<b>${name}</b><span class="faint small">· ตัวอย่าง</span></div>${vis}${dots}<p class="pv-cap">${esc(cap) || '<span class="faint">ยังไม่มีแคปชัน</span>'}</p></div>`;
  else if (f.layout === 'youtube') stage = `<div class="pv-yt">${vis}${dots}<b class="pv-yt-title">${esc(c.title)}</b><span class="small muted">${name}</span><p class="pv-cap small">${esc(cap)}</p></div>`;
  else if (f.layout === 'line') stage = `<div class="pv-line"><div class="pv-line-bubble">${vis}<div style="padding:10px 12px"><b>${esc(c.title)}</b><p class="pv-cap small" style="padding:4px 0 0">${esc(cap)}</p></div><div class="pv-line-btn">ดูรายละเอียด</div></div></div>`;
  else stage = `<div class="pv-article">${vis}<h3 style="font-size:20px">${esc(c.title)}</h3><p class="pv-cap">${esc(cap)}</p></div>`;
  return `<div class="pv"><div class="tabs" role="tablist">${c.channels.map(p => `<button role="tab" aria-selected="${p === tab}" data-act="pvtab:${p}">${chb(p)}${CH[p].name}</button>`).join('')}</div>
    <div class="pv-stage">${stage}</div><p class="small faint" style="text-align:center">ตัวอย่างโดยประมาณ · ${f.label}</p></div>`;
}
function pinStage(c) {
  if (!c.media.length) return '';
  const idx = Math.min(UI.pvIdx, c.media.length - 1);
  const pins = c.comments.map((m, i) => ({ ...m, n: i + 1 })).filter(m => m.mi === idx && m.x != null);
  return `<div class="pin-stage" data-pin="${c.id}"><img src="${mediaSrc(c, idx)}" alt="รูปสำหรับปักหมุดความคิดเห็น">
    ${pins.map(p => `<span class="pin${p.done ? ' done' : ''}" style="left:${p.x * 100}%;top:${p.y * 100}%" title="${esc(p.text)}">${p.n}</span>`).join('')}
    ${UI.pin && UI.pin.cid === c.id ? `<span class="pin new" style="left:${UI.pin.x * 100}%;top:${UI.pin.y * 100}%">+</span>` : ''}</div>
    <p class="small faint">คลิกบนรูปตรงจุดที่อยากให้แก้ แล้วพิมพ์ความคิดเห็นด้านล่าง</p>`;
}
function drawerHTML() {
  if (!UI.drawer) return '';
  const c = getC(UI.drawer.id); if (!c) return '';
  const order = ['idea', 'draft', 'review', 'approved', 'published'];
  const curIdx = c.status === 'changes' ? 2 : c.status === 'scheduled' ? 3 : order.indexOf(c.status);
  const steps = order.map((s, i) => { const alert = c.status === 'changes' && i === 2; const label = alert ? 'ขอแก้ไข' : s === 'approved' && c.status === 'scheduled' ? 'ตั้งเวลาแล้ว' : ST[s].label;
    return `<div class="step ${alert ? 'alert' : i < curIdx ? 'done' : i === curIdx ? 'cur' : ''}"><div class="bar"></div>${label}</div>`; }).join('');
  const pub = c.status === 'published';
  const editable = canEdit(c);
  const chRows = c.channels.map(ch => {
    let right;
    if (pub) { const r = c.results[ch] || {};
      right = r.state === 'posted' ? `<span class="pill t-ok">โพสต์อัตโนมัติแล้ว</span> <a class="small" href="${esc(r.url)}" target="_blank" rel="noopener">เปิดโพสต์</a>`
        : r.state === 'manual-done' ? `<span class="pill t-ok">โพสต์เองแล้ว</span> <a class="small" href="${esc(r.url)}" target="_blank" rel="noopener">เปิดโพสต์</a>`
        : r.state === 'draft-sent' ? `<span class="pill t-warn">แบบร่างรออยู่ในแอป ${CH[ch].name}</span>`
        : `<span class="pill t-bad">ต้องโพสต์เอง</span> <span class="small muted">${esc(r.reason || '')}</span>`;
      if (r.state === 'manual-todo' || r.state === 'draft-sent') right += manualBox(c, ch);
    } else { const m = publishMode(ch, c), u = MODE_UI[m.mode]; right = `<span class="pill t-${u.tone}">${u.label}</span> <span class="small muted">${esc(m.reason)}</span>`; }
    return `<div class="pub-row">${chb(ch, true)}<div class="what"><div class="line1"><b>${CH[ch].name}</b>${c.overrides && c.overrides[ch] ? '<span class="wt-chip">แคปชันแยก</span>' : ''}</div><div class="line1">${right}</div></div></div>`;
  }).join('');
  const metrics = pub ? `<section><div class="card-head" style="margin-bottom:8px"><h3>ผลลัพธ์</h3></div>
    <div class="scroll-x"><table class="mtable"><thead><tr><th>ช่องทาง</th>${Object.values(FIELDS).map(f => `<th>${f}</th>`).join('')}<th>ที่มา</th></tr></thead><tbody>
    ${c.channels.map(ch => { const m = c.metrics[ch]; return `<tr><td><span class="row" style="gap:6px;flex-wrap:nowrap">${chb(ch)}${CH[ch].name}</span></td>${Object.keys(FIELDS).map(k => `<td>${m ? fmtN(m[k]) : '–'}</td>`).join('')}
      <td>${m ? `<span class="src ${m.src}">${m.src === 'api' ? 'API' : 'กรอกเอง'}</span>` : can('metrics') && c.results[ch] && !['manual-todo', 'draft-sent'].includes(c.results[ch].state) ? `<button class="btn sm" data-act="metrics:${c.id}:${ch}">กรอก</button>` : '<span class="src miss">ยังไม่มี</span>'}</td></tr>`; }).join('')}
    </tbody></table></div></section>` : '';
  const a = [];
  const owner = c.owner === S.uid;
  if (editable) a.push(`<button class="btn" data-act="edit:${c.id}">${ic('pen', 'sm')}แก้ไข</button>`);
  if (['idea', 'draft', 'changes'].includes(c.status) && (owner || can('editAny')) && can('create')) a.push(`<button class="btn primary" data-act="submit:${c.id}">${ic('send', 'sm')}ส่งให้อนุมัติ</button>`);
  if (c.status === 'review' && can('approve')) { a.push(`<button class="btn ok" data-act="approve:${c.id}">${ic('check', 'sm')}อนุมัติ</button>`); a.push(`<button class="btn bad" data-act="reqchanges:${c.id}">ขอแก้ไข</button>`); }
  if (c.status === 'approved' && can('publish')) { a.push(`<button class="btn primary" data-act="publish:${c.id}">${ic('send', 'sm')}เผยแพร่ตอนนี้</button>`); a.push(`<button class="btn" data-act="schedule:${c.id}">${ic('clock', 'sm')}ตั้งเวลา ${fmtD(c.date)}</button>`); }
  if (c.status === 'scheduled' && can('publish')) { a.push(`<button class="btn primary" data-act="publish:${c.id}">${ic('send', 'sm')}เผยแพร่ตอนนี้</button>`); a.push(`<button class="btn" data-act="unschedule:${c.id}">ยกเลิกตั้งเวลา</button>`); }
  if (pub) a.push(`<button class="btn" data-act="sync:${c.id}">${ic('refresh', 'sm')}ดึงสถิติล่าสุด</button>`);
  const asking = UI.drawer.focus === 'changes';
  return `<div class="scrim" data-act="close"></div><aside class="drawer${UI.anim ? ' enter' : ''}" role="dialog" aria-label="${esc(c.title)}">
    <div class="d-head">${statusPill(c.status)}${workChip(c.work)}<span class="small muted">${TYPES[c.type]}</span><span style="margin-left:auto"></span>
      <button class="star${isFav(c) ? ' on' : ''}" data-act="fav:${c.id}" aria-label="รายการโปรด">${ic('star', isFav(c) ? 'filled' : '')}</button>
      <button class="btn icon ghost" data-act="close" aria-label="ปิด">${ic('x')}</button></div>
    <div class="d-body">
      <div style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:20px">${esc(c.title)}</h2><div class="steps">${steps}</div></div>
      <dl class="meta">
        <dt>${pub ? 'เผยแพร่เมื่อ' : c.status === 'scheduled' ? 'ตั้งเวลาโพสต์' : 'กำหนดลง'}</dt><dd>${fmtDT(c.date)}</dd>
        <dt>ผู้รับผิดชอบ</dt><dd>${av(c.owner)}${esc(user(c.owner).name)}</dd>
        <dt>ประเภทงาน</dt><dd>${esc(c.work)}${workOf(c.work).manual ? ' <span class="small muted">(ทำเองเสมอ)</span>' : ''}</dd>
        <dt>หมวด</dt><dd>${esc(c.pillar)}</dd>
      </dl>
      <section style="display:flex;flex-direction:column;gap:8px"><h3>ตัวอย่างโพสต์</h3>${preview(c)}</section>
      <section style="display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between"><h3>รูปและวิดีโอ <span class="pill t-neutral plain">${c.media.length}</span></h3>${editable ? `<label class="btn sm">${ic('upload', 'sm')}เพิ่มรูป<input type="file" accept="image/*" multiple hidden data-upload="${c.id}"></label>` : ''}</div>
        ${c.media.length ? `<div class="gallery">${c.media.map((m, i) => `<div class="gitem"><span data-act="pvidx:${i}" style="cursor:pointer">${`<span class="cover cover-md"><img src="${mediaSrc(c, i)}" alt=""></span>`}</span>${editable ? `<button class="btn sm icon gdel" data-act="rmmedia:${c.id}:${i}" aria-label="ลบไฟล์">${ic('trash', 'sm')}</button>` : ''}</div>`).join('')}</div>` : `<p class="small muted">ยังไม่มีรูปหรือวิดีโอ${editable ? ' กด “เพิ่มรูป” เพื่ออัปโหลด' : ''}</p>`}
      </section>
      <section><h3 style="margin-bottom:4px">ช่องทาง & การโพสต์</h3>${chRows}</section>
      ${metrics}
      <section style="display:flex;flex-direction:column;gap:10px"><h3>ความคิดเห็น</h3>
        ${pinStage(c)}
        <form data-form="comment" data-id="${c.id}" class="row" style="flex-wrap:nowrap"><input class="input" id="cmt-${c.id}" name="text" placeholder="${asking ? 'บอกสิ่งที่ต้องแก้ แล้วกด “ขอแก้ไข” ด้านล่าง' : UI.pin && UI.pin.cid === c.id ? 'ตรงนี้ต้องแก้อะไร' : 'พิมพ์ความคิดเห็น'}" aria-label="ความคิดเห็น"><button class="btn" type="submit" aria-label="ส่ง">${ic('send', 'sm')}</button></form>
        ${c.comments.map((m, i) => `<div class="comment" style="${m.done ? 'opacity:.55' : ''}">${av(m.uid)}<div class="bubble"><div class="small row" style="gap:6px">${m.x != null ? `<span class="pin inline">${i + 1}</span>` : ''}<b>${esc(user(m.uid).nick)}</b> <span class="faint">${ago(m.at)}</span>${m.x != null ? `<button class="btn sm ghost" style="margin-left:auto" data-act="pindone:${c.id}:${i}">${m.done ? 'เปิดอีกครั้ง' : 'แก้แล้ว'}</button>` : ''}</div>${esc(m.text)}</div></div>`).join('') || '<p class="small muted">ยังไม่มีความคิดเห็น</p>'}
      </section>
    </div>
    ${a.length ? `<div class="d-foot">${a.join('')}</div>` : ''}
  </aside>`;
}

/* ---------- modals ---------- */
function modalHTML() {
  if (!UI.modal) return '';
  const M = UI.modal; let inner = '';
  if (M.kind === 'editor') inner = editorHTML(M);
  if (M.kind === 'wizard') inner = wizardHTML(M);
  if (M.kind === 'metrics') inner = metricsHTML(M);
  if (M.kind === 'publishing') inner = publishingHTML(M);
  if (M.kind === 'reset') inner = `<div class="m-head"><h2>รีเซ็ตข้อมูลตัวอย่าง?</h2></div><div class="m-body"><p>ทุกอย่างที่ลองทำไว้ในเบราว์เซอร์นี้จะหายไป และกลับไปเป็นข้อมูลตั้งต้น</p></div><div class="m-foot"><button class="btn" data-act="mclose">ยกเลิก</button><button class="btn primary" data-act="doreset">รีเซ็ต</button></div>`;
  const wide = M.kind === 'wizard' ? 'width:min(720px,100%)' : '';
  return `<div class="modal-wrap"><div class="scrim" data-act="${M.kind === 'publishing' && !M.done ? '' : 'mclose'}"></div><div class="modal${UI.anim ? ' enter' : ''}" role="dialog" aria-modal="true" style="z-index:51;${wide}">${inner}</div></div>`;
}
function chOptions(c, selected) {
  return CH_ORDER.map(ch => { const m = publishMode(ch, c), u = MODE_UI[m.mode];
    return `<label class="ch-opt"><input type="checkbox" name="ch" value="${ch}" ${selected.includes(ch) ? 'checked' : ''}>${chb(ch)}<span class="t"><b>${CH[ch].name}</b><span class="small" style="color:var(--${u.tone})">${u.label}</span><span class="small faint">${esc(m.reason)}</span></span></label>`; }).join('');
}
function editorHTML(M) {
  const c = M.id ? getC(M.id) : { title: '', type: 'reel', work: 'VDO', pillar: PILLARS[0].name, date: (M.date || dayKey(addDays(NOW(), 1))) + 'T19:00', owner: S.uid, channels: ['facebook', 'instagram', 'tiktok'], caption: '', overrides: {}, media: [] };
  const [d, t] = c.date.split('T');
  const owners = can('assign') ? S.users.filter(u => P().roles[u.id] && P().roles[u.id] !== 'analyst') : [me()];
  const draft = { type: M.type || c.type, work: M.work || c.work };
  return `<form data-form="editor"><div class="m-head"><h2>${M.id ? 'แก้ไขคอนเทนต์' : 'สร้างคอนเทนต์ใหม่'}</h2><button type="button" class="btn icon ghost" data-act="mclose" style="margin-left:auto" aria-label="ปิด">${ic('x')}</button></div>
  <div class="m-body">
    ${M.id && ['approved', 'scheduled'].includes(c.status) ? `<div class="banner warn">${ic('info')}<div>งานนี้อนุมัติแล้ว ถ้าบันทึกการแก้ไข งานจะกลับไปรออนุมัติใหม่</div></div>` : ''}
    <div class="field"><label for="f-title">ชื่อคอนเทนต์</label><input class="input" id="f-title" name="title" required value="${esc(c.title)}" placeholder="เช่น รีวิวกันแดดสูตรใหม่ ใช้จริง 7 วัน"></div>
    <div class="grid2">
      <div class="field"><label for="f-work">ประเภทงาน</label><select class="select" id="f-work" name="work">${WORKS.map(w => `<option ${w.name === draft.work ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-type">รูปแบบ</label><select class="select" id="f-type" name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === draft.type ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="f-pillar">หมวด</label><select class="select" id="f-pillar" name="pillar">${PILLARS.map(p => `<option ${p.name === c.pillar ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
      <div class="field"><label for="f-owner">ผู้รับผิดชอบ</label><select class="select" id="f-owner" name="owner" ${owners.length < 2 ? 'disabled' : ''}>${owners.map(u => `<option value="${u.id}" ${u.id === c.owner ? 'selected' : ''}>${esc(u.nick)} · ${esc(u.title)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-date">วันที่ลง</label><input class="input" type="date" id="f-date" name="date" required value="${d}"></div>
      <div class="field"><label for="f-time">เวลา</label><input class="input" type="time" id="f-time" name="time" required value="${t}"></div>
    </div>
    <div class="field"><span class="lbl">รูปหรือภาพปก</span>
      <label class="uploader" style="cursor:pointer">${ic('upload')}<span>เลือกรูปจากเครื่อง (เลือกได้หลายรูป)</span><span class="small faint">ในตัวอย่างนี้รองรับเฉพาะรูป ระบบจริงรองรับวิดีโอ MP4, MOV ด้วย</span><input type="file" accept="image/*" multiple hidden data-upload="editor"></label>
      ${(M.pending || []).length ? `<div class="gallery">${M.pending.map(src => `<span class="cover cover-md"><img src="${src}" alt=""></span>`).join('')}</div>` : ''}</div>
    <div class="field"><span class="lbl">ช่องทาง</span><span class="hint">ป้ายสีบอกว่าระบบจะโพสต์ให้อัตโนมัติ หรือต้องโพสต์เอง ตามการเชื่อมต่อและประเภทงาน</span><div class="ch-pick" id="f-chs">${chOptions(draft, M.channels || c.channels)}</div></div>
    <div class="field"><label for="f-cap">แคปชันหลัก</label><textarea class="textarea" id="f-cap" name="caption" placeholder="แคปชันที่ใช้ร่วมทุกช่องทาง">${esc(c.caption)}</textarea><span class="hint" id="f-cap-hint"></span></div>
    <div class="field"><label for="f-capx">แคปชันแยกสำหรับ X (ถ้าต้องการ)</label><input class="input" id="f-capx" name="capx" maxlength="280" value="${esc((c.overrides || {}).x || '')}" placeholder="เว้นว่าง = ใช้แคปชันหลัก · สูงสุด 280 ตัวอักษร"></div>
    <p class="small" id="f-err" style="color:var(--bad)" hidden></p>
  </div>
  <div class="m-foot"><button type="button" class="btn" data-act="mclose">ยกเลิก</button>${M.id ? '' : '<button type="submit" class="btn" name="as" value="idea">บันทึกเป็นไอเดีย</button>'}<button type="submit" class="btn primary" name="as" value="save">${M.id ? 'บันทึก' : 'สร้างและเริ่มทำ'}</button></div></form>`;
}
function wizardHTML(M) {
  const ch = M.ch, g = GUIDES[ch], c = CH[ch], st = CHS()[ch];
  const manual = g.availability === 'manual_only';
  const step = M.step, s = g.steps[step];
  const ticks = M.ticks || g.prepare.map(() => false);
  const ready = manual || ticks.every(Boolean);
  let extra = '';
  if (step === 0 && !manual) extra = `<div class="wiz-check"><b class="small">เช็กให้ครบทุกข้อก่อนไปขั้นถัดไป</b>${g.prepare.map((p, i) => `<label class="check"><input type="checkbox" data-change="tick:${i}" ${ticks[i] ? 'checked' : ''}>${esc(p)}</label>`).join('')}<a class="small" href="${g.settingsUrl}" target="_blank" rel="noopener">เปิด${esc(g.settingsLabel)} ${ic('ext', 'sm')}</a></div>`;
  if (step === 1 && !manual) extra = M.loggedIn ? `<div class="banner">${ic('check')}<div>เข้าสู่ระบบ ${c.name} แล้ว (จำลอง) กด “ถัดไป”</div></div>`
    : `<div><button type="button" class="btn primary" data-act="wizlogin" ${can('channels') ? '' : 'disabled'}>${ic('link', 'sm')}เข้าสู่ระบบ ${c.name}</button>${can('channels') ? '<span class="small faint" style="margin-left:8px">ตัวอย่างนี้จำลองหน้าต่างล็อกอิน</span>' : '<span class="small faint" style="margin-left:8px">เฉพาะผู้ดูแลโปรเจกต์</span>'}</div>`;
  if (step === 2 && !manual) extra = `<div class="field"><label for="wz-acc">บัญชี / เพจที่จะใช้กับ ${esc(P().name)}</label><input class="input" id="wz-acc" value="${esc(M.account || P().name)}" data-input="wizacc"></div>`;
  if (step === 3 && !manual) extra = `<div class="wiz-check">${['อ่านข้อมูลบัญชีได้', 'สิทธิ์โพสต์', 'สิทธิ์อ่านสถิติ'].map(x => `<span class="row" style="gap:8px"><span style="color:var(--ok)">${ic('check', 'sm')}</span>${x}</span>`).join('')}</div>`;
  if (step === 4 && !manual && st.connected) extra = `<div class="banner">${ic('check')}<div>${c.name} เชื่อมต่อแล้ว งานที่เผยแพร่ไป ${c.name} หลังจากนี้จะโพสต์ให้อัตโนมัติ (ตามข้อจำกัดของแพลตฟอร์ม)</div></div>`;
  const canNext = step === 0 ? ready : step === 1 && !manual ? !!M.loggedIn : true;
  return `<div class="m-head">${chb(ch, true)}<h2>${manual ? `${c.name}: โพสต์เองและบันทึกผล` : `เชื่อมต่อ ${c.name}`}</h2><button type="button" class="btn icon ghost" data-act="mclose" style="margin-left:auto" aria-label="ปิด">${ic('x')}</button></div>
  <div class="m-body">
    <ol class="wiz-steps">${g.steps.map((x, i) => `<li class="${i === step ? 'cur' : i < step ? 'done' : ''}"><button type="button" ${i <= (M.maxStep || 0) ? `data-act="wizstep:${i}"` : 'disabled'}><span class="wiz-n">${i < step ? '✓' : i + 1}</span>${esc(x.title)}</button></li>`).join('')}</ol>
    <div class="wiz-body"><h3>${step + 1}. ${esc(s.title)}</h3><p>${esc(s.body)}</p>${extra}</div>
    <details class="wiz-faq"><summary>ปัญหาที่พบบ่อย (${g.troubleshooting.length})</summary>${g.troubleshooting.map(t => `<div class="faq-item"><b>${esc(t.q)}</b><p class="small muted">${esc(t.a)}</p></div>`).join('')}</details>
  </div>
  <div class="m-foot">${step > 0 ? '<button type="button" class="btn" data-act="wizprev">ย้อนกลับ</button>' : ''}
    ${step < 4 ? `<button type="button" class="btn primary" data-act="wiznext" ${canNext ? '' : 'disabled'} title="${step === 0 && !ready ? 'ติ๊กเช็กลิสต์ให้ครบก่อน' : ''}">ถัดไป</button>` : '<button type="button" class="btn primary" data-act="mclose">เสร็จสิ้น</button>'}</div>`;
}
function metricsHTML(M) {
  const c = getC(M.id), ch = M.ch, m = c.metrics[ch] || {};
  return `<form data-form="metrics"><div class="m-head">${chb(ch, true)}<div><h2>กรอกผลลัพธ์ ${CH[ch].name}</h2><div class="small muted">${esc(c.title)}</div></div><button type="button" class="btn icon ghost" data-act="mclose" style="margin-left:auto" aria-label="ปิด">${ic('x')}</button></div>
  <div class="m-body"><p class="small muted">${CH[ch].name} ไม่มี API ให้ดึงสถิติ เปิดหน้าสถิติในแอปแล้วกรอกตัวเลขล่าสุด ระบบจะติดป้ายว่า “กรอกเอง” ในรายงาน</p>
    <div class="grid2">${CH[ch].fields.map(k => `<div class="field"><label for="mt-${k}">${FIELDS[k]}</label><input class="input num" type="number" min="0" id="mt-${k}" name="${k}" value="${m[k] ?? ''}" required></div>`).join('')}</div></div>
  <div class="m-foot"><button type="button" class="btn" data-act="mclose">ยกเลิก</button><button type="submit" class="btn primary">บันทึกตัวเลข</button></div></form>`;
}
function publishingHTML(M) {
  const c = getC(M.id);
  const rows = c.channels.map((ch, i) => { const r = c.results[ch]; let st;
    if (i >= M.step) st = '<span class="faint"><span class="spin"></span> กำลังส่ง…</span>';
    else st = r.state === 'posted' ? '<span style="color:var(--ok)">โพสต์สำเร็จ</span>' : r.state === 'draft-sent' ? '<span style="color:var(--warn)">ส่งเป็นแบบร่างในแอป</span>' : `<span style="color:var(--bad)">ต้องโพสต์เอง · ${esc(r.reason)}</span>`;
    return `<div class="prog-row">${chb(ch)}<b>${CH[ch].name}</b><span class="st">${st}</span></div>`; }).join('');
  const vals = Object.values(c.results); const nAuto = vals.filter(r => r.state === 'posted').length, nMan = vals.length - nAuto;
  return `<div class="m-head"><h2>${M.done ? 'เผยแพร่แล้ว' : 'กำลังเผยแพร่…'}</h2></div>
  <div class="m-body"><div class="row" style="gap:10px;flex-wrap:nowrap">${cover(c, 'sm')}<b>${esc(c.title)}</b></div><div>${rows}</div>
  ${M.done ? `<div class="banner${nMan ? ' warn' : ''}">${ic(nMan ? 'hand' : 'check')}<div>โพสต์อัตโนมัติ ${nAuto} ช่องทาง${nMan ? ` · อีก ${nMan} ช่องทางต้องโพสต์เอง ระบบสร้างงานไว้ในแท็บ “ต้องโพสต์เอง” แล้ว` : ''}</div></div>` : ''}</div>
  ${M.done ? `<div class="m-foot">${nMan ? '<button class="btn" data-act="gomanual">ไปที่งานโพสต์เอง</button>' : ''}<button class="btn primary" data-act="mclose">เสร็จสิ้น</button></div>` : ''}`;
}

/* ---------- mutations ---------- */
function doPublish(c, silent) {
  c.status = 'published';
  if (parse(c.date) > NOW()) c.date = toLocal(NOW());
  c.results = {}; c.metrics = {};
  for (const ch of c.channels) { const m = publishMode(ch, c);
    c.results[ch] = m.mode === 'auto' ? { state: 'posted', url: CH[ch].url, at: toLocal(NOW()) } : { state: m.mode === 'draft' ? 'draft-sent' : 'manual-todo', reason: m.reason }; }
  if (!silent) log('เผยแพร่', c.id);
}
function syncMetrics(only) {
  let n = 0;
  for (const c of PC()) { if (c.status !== 'published' || (only && c.id !== only)) continue;
    const rnd = rngOf(c.id + Date.now()); const age = Math.max(1, daysBetween(parse(c.date), NOW()));
    for (const ch of c.channels) { const r = c.results[ch]; if (!r || !['posted', 'manual-done'].includes(r.state) || !statsOk(ch)) continue;
      const m = c.metrics[ch];
      if (m && m.src === 'api') { for (const k of Object.keys(FIELDS)) if (m[k] != null) m[k] = Math.round(m[k] * (1 + rnd() * .05)); }
      else c.metrics[ch] = { ...genMetrics(c, ch, rnd, age), src: 'api', at: toLocal(NOW()) };
      n++; } }
  return n;
}
function runScheduled() {
  let n = 0; const keep = S.pid;
  for (const c of S.content) if (c.status === 'scheduled' && parse(c.date) <= NOW()) { S.pid = c.project; doPublish(c, true); n++; }
  S.pid = keep;
  if (n) { save(); toast(`โพสต์ตามเวลาที่ตั้งไว้ ${n} ชิ้น`); render(); }
}
function moveTo(id, day) {
  const c = getC(id); if (!c || !canEdit(c)) return;
  const t = c.date.split('T')[1]; if (c.date.slice(0, 10) === day) return;
  c.date = `${day}T${t}`;
  const back = ['approved', 'scheduled'].includes(c.status);
  if (back) c.status = 'review';
  log('ย้ายวันลงงาน', c.id); save(); toast(back ? 'ย้ายวันแล้ว งานกลับไปรออนุมัติใหม่' : 'ย้ายวันแล้ว'); render();
}
function readImages(files) {
  return Promise.all([...files].filter(f => f.type.startsWith('image/')).slice(0, 6).map(f => new Promise(res => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => { const scale = Math.min(1, 900 / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', .82)); };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  }))).then(a => a.filter(Boolean));
}

/* ---------- actions ---------- */
const ACT = {
  login(_, id) { S.uid = id; if (!roleOf()) S.pid = myProjects()[0].id; save(); location.hash = '#overview'; render(); window.scrollTo(0, 0); },
  logout() { S.uid = null; UI.drawer = null; UI.modal = null; save(); render(); },
  theme() { document.documentElement.dataset.theme = effectiveTheme() === 'dark' ? 'light' : 'dark'; render(); },
  menu() { UI.menu = !UI.menu; render(); },
  switcher() { UI.switcher = !UI.switcher; render(); },
  project(_, id) { S.pid = id; UI.switcher = false; UI.drawer = null; UI.cal = null; save(); toast(`สลับไป ${P().name}`); render(); },
  open(_, id, focus) { UI.drawer = { id, focus }; UI.pv = null; UI.pvIdx = 0; UI.pin = null; UI.anim = true; render(); if (focus === 'changes') setTimeout(() => $(`#cmt-${id}`)?.focus(), 50); },
  close() { UI.drawer = null; UI.pin = null; render(); },
  mclose() { UI.modal = null; render(); },
  pvtab(_, p) { UI.pv = p; render(); },
  pvidx(_, i) { UI.pvIdx = +i; UI.pin = null; render(); },
  fav(_, id) { const c = getC(id); const i = c.fav.indexOf(S.uid); i >= 0 ? c.fav.splice(i, 1) : c.fav.push(S.uid); save(); toast(i >= 0 ? 'นำออกจากรายการโปรดแล้ว' : 'เพิ่มในรายการโปรดแล้ว'); render(); },
  new(_, date) { UI.modal = { kind: 'editor', date, pending: [] }; UI.anim = true; render(); $('#f-title')?.focus(); updateCapHint(); },
  edit(_, id) { UI.modal = { kind: 'editor', id, pending: [] }; UI.anim = true; render(); updateCapHint(); },
  submit(_, id) { const c = getC(id); c.status = 'review'; log('ส่งคอนเทนต์ให้อนุมัติ', id); save(); toast('ส่งให้หัวหน้าอนุมัติแล้ว'); render(); },
  approve(_, id) { const c = getC(id); c.status = 'approved'; log('อนุมัติ', id); save(); toast('อนุมัติแล้ว กดเผยแพร่หรือตั้งเวลาได้เลย'); render(); },
  reqchanges(_, id) { const inp = $(`#cmt-${id}`); const text = inp?.value.trim();
    if (!text) { inp?.focus(); toast('พิมพ์สิ่งที่ต้องแก้ในช่องความคิดเห็นก่อน'); return; }
    const c = getC(id); c.comments.push({ uid: S.uid, text, at: toLocal(NOW()) }); c.status = 'changes'; log('ขอแก้ไข', id); save(); toast(`ส่งกลับให้ ${user(c.owner).nick} แก้แล้ว`); render(); },
  schedule(_, id) { const c = getC(id); if (parse(c.date) <= NOW()) { toast('เวลาที่กำหนดผ่านไปแล้ว แก้วันเวลาก่อน หรือกดเผยแพร่ตอนนี้'); return; } c.status = 'scheduled'; log(`ตั้งเวลาโพสต์ ${fmtDT(c.date)}`, id); save(); toast(`ตั้งเวลาแล้ว ระบบจะโพสต์ ${fmtDT(c.date)}`); render(); },
  unschedule(_, id) { const c = getC(id); c.status = 'approved'; log('ยกเลิกการตั้งเวลา', id); save(); render(); },
  publish(_, id) { const c = getC(id); doPublish(c); save(); UI.modal = { kind: 'publishing', id, step: 0, done: false }; UI.anim = true; render();
    const tick = () => { if (!UI.modal || UI.modal.id !== id) return; UI.modal.step++; if (UI.modal.step >= c.channels.length) UI.modal.done = true; render(); if (!UI.modal.done) setTimeout(tick, 550); };
    setTimeout(tick, 650); },
  gomanual() { UI.modal = null; UI.drawer = null; UI.apTab = 'manual'; location.hash = '#approvals'; render(); },
  aptab(_, t) { UI.apTab = t; if (currentView() === 'approvals') render(); },
  copy(_, id, ch) { const c = getC(id); const text = (c.overrides && c.overrides[ch]) || c.caption;
    try { navigator.clipboard.writeText(text).then(() => toast('คัดลอกแคปชันแล้ว'), () => toast('คัดลอกไม่ได้ ลองเลือกข้อความเอง')); } catch (e) { toast('คัดลอกไม่ได้ ลองเลือกข้อความเอง'); } },
  mdone(_, id, ch) { const inp = $(`#url-${id}-${ch}`); const url = inp?.value.trim();
    if (!url || !/^https:\/\//.test(url)) { inp?.focus(); toast('วางลิงก์โพสต์ที่ขึ้นต้นด้วย https:// เพื่อปิดงาน'); return; }
    const c = getC(id); c.results[ch] = { state: 'manual-done', url, at: toLocal(NOW()), by: S.uid };
    if (statsOk(ch)) c.metrics[ch] = { ...genMetrics(c, ch, rngOf(id + ch), 1), src: 'api', at: toLocal(NOW()) };
    log(`ยืนยันโพสต์เองที่ ${CH[ch].name}`, id); save(); toast('ปิดงานแล้ว'); render(); },
  metrics(_, id, ch) { UI.modal = { kind: 'metrics', id, ch }; UI.anim = true; render(); },
  sync(_, id) { const n = syncMetrics(id); save(); toast(`อัปเดตสถิติจาก API แล้ว ${n} ช่องทาง`); render(); },
  range(_, d) { UI.range = +d; render(); },
  calmove(_, d) { const n = +d; const now = NOW(); if (!n) { UI.cal = { y: now.getFullYear(), m: now.getMonth() }; UI.calDay = dayKey(now); } else { const t = new Date(UI.cal.y, UI.cal.m + n, 1); UI.cal = { y: t.getFullYear(), m: t.getMonth() }; } render(); },
  calday(_, k) { UI.calDay = k; render(); },
  wizard(_, ch) { UI.modal = { kind: 'wizard', ch, step: 0, maxStep: 0 }; UI.anim = true; render(); },
  wizstep(_, i) { UI.modal.step = +i; render(); },
  wiznext() { const M = UI.modal; M.step = Math.min(4, M.step + 1); M.maxStep = Math.max(M.maxStep, M.step);
    if (M.step === 4 && GUIDES[M.ch].availability !== 'manual_only' && can('channels') && M.loggedIn) { const st = CHS()[M.ch]; st.connected = true; st.account = M.account || P().name; log(`เชื่อมต่อ ${CH[M.ch].name}`); save(); toast(`เชื่อมต่อ ${CH[M.ch].name} แล้ว`); }
    render(); },
  wizprev() { UI.modal.step = Math.max(0, UI.modal.step - 1); render(); },
  wizlogin() { UI.modal.loggedIn = true; render(); },
  disconnect(_, ch) { const st = CHS()[ch]; st.connected = false; st.account = ''; log(`ตัดการเชื่อมต่อ ${CH[ch].name}`); save(); toast(`ตัดการเชื่อมต่อ ${CH[ch].name} แล้ว โพสต์ใหม่ไปช่องทางนี้จะกลายเป็นงานโพสต์เอง`); render(); },
  rmmedia(_, id, i) { const c = getC(id); c.media.splice(+i, 1); UI.pvIdx = 0; save(); toast('ลบไฟล์แล้ว'); render(); },
  pindone(_, id, i) { const m = getC(id).comments[+i]; m.done = !m.done; save(); render(); },
  reset() { UI.modal = { kind: 'reset' }; UI.anim = true; render(); },
  doreset() { const keep = S.uid; S = seed(); S.uid = keep; UI.modal = null; UI.drawer = null; save(); toast('รีเซ็ตข้อมูลตัวอย่างแล้ว'); render(); },
};
const FORMS = {
  comment(f) { const text = f.elements.text.value.trim(); if (!text) return; const c = getC(f.dataset.id);
    const pin = UI.pin && UI.pin.cid === c.id ? { mi: UI.pvIdx, x: UI.pin.x, y: UI.pin.y } : {};
    c.comments.push({ uid: S.uid, text, at: toLocal(NOW()), ...pin }); UI.pin = null; save(); toast('ส่งความคิดเห็นแล้ว'); render(); },
  editor(f, submitter) {
    const fd = new FormData(f); const chs = fd.getAll('ch'); const err = $('#f-err');
    const title = (fd.get('title') || '').trim();
    if (!title) { err.hidden = false; err.textContent = 'ใส่ชื่อคอนเทนต์ก่อนบันทึก'; return; }
    if (!chs.length) { err.hidden = false; err.textContent = 'เลือกอย่างน้อย 1 ช่องทาง'; return; }
    const M = UI.modal; const capx = (fd.get('capx') || '').trim();
    const data = { title, type: fd.get('type'), work: fd.get('work'), pillar: fd.get('pillar'), date: `${fd.get('date')}T${fd.get('time')}`, owner: fd.get('owner') || S.uid,
      channels: CH_ORDER.filter(c => chs.includes(c)), caption: fd.get('caption') || '', overrides: capx ? { x: capx } : {} };
    const pending = (M.pending || []).map(src => ({ src }));
    if (M.id) { const c = getC(M.id); Object.assign(c, data); c.media.push(...pending); if (['approved', 'scheduled'].includes(c.status)) c.status = 'review'; log('แก้ไขคอนเทนต์', M.id); toast('บันทึกแล้ว'); }
    else { const c = { id: uid(), project: S.pid, ...data, media: pending, status: submitter?.value === 'idea' ? 'idea' : 'draft', fav: [], comments: [], results: {}, metrics: {} }; S.content.push(c); log('สร้างคอนเทนต์ใหม่', c.id); UI.drawer = { id: c.id }; UI.pvIdx = 0; toast('สร้างคอนเทนต์แล้ว'); }
    UI.modal = null; save(); render();
  },
  metrics(f) { const { id, ch } = UI.modal; const c = getC(id); const m = { views: null, likes: null, comments: null, shares: null, clicks: null };
    for (const k of CH[ch].fields) m[k] = Math.max(0, Number(f.elements[k].value) || 0);
    c.metrics[ch] = { ...m, src: 'manual', at: toLocal(NOW()) }; log(`กรอกผลลัพธ์ ${CH[ch].name}`, id); UI.modal = null; save(); toast('บันทึกตัวเลขแล้ว'); render(); },
};
const CHANGE = {
  calCh: v => UI.calCh = v, calSt: v => UI.calSt = v, calWork: v => UI.calWork = v, calMine: (v, el) => UI.calMine = el.checked, sort: v => UI.sort = v,
  libSt: v => { UI.libSt = v; return 'lib'; }, libCh: v => { UI.libCh = v; return 'lib'; }, libWork: v => { UI.libWork = v; return 'lib'; },
  audit: (v, el) => { CHS().tiktok.audited = el.checked; save(); toast(el.checked ? 'TikTok: โพสต์ตรงได้แล้ว' : 'TikTok: กลับไปส่งเป็นแบบร่างใน Inbox'); },
  role: (v, el, id) => { const admins = Object.values(P().roles).filter(r => r === 'admin').length; if (P().roles[id] === 'admin' && v !== 'admin' && admins <= 1) { toast('ต้องมีผู้ดูแลโปรเจกต์อย่างน้อย 1 คน'); return; } P().roles[id] = v; save(); toast(`${user(id).nick} เป็น${ROLES[v].label}แล้ว`); },
  tick: (v, el, i) => { const M = UI.modal; M.ticks = M.ticks || GUIDES[M.ch].prepare.map(() => false); M.ticks[+i] = el.checked; },
};
function updateCapHint() {
  const ta = $('#f-cap'), h = $('#f-cap-hint'); if (!ta || !h) return;
  const n = [...ta.value].length; const chs = $$('#f-chs input:checked').map(i => i.value);
  h.textContent = `${n} ตัวอักษร` + (chs.includes('x') && n > 280 && !$('#f-capx').value.trim() ? ' · เกิน 280 ตัวอักษรของ X เขียนแคปชันแยกสำหรับ X ด้านล่าง' : '');
  h.style.color = chs.includes('x') && n > 280 && !$('#f-capx').value.trim() ? 'var(--warn)' : '';
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const stage = e.target.closest('.pin-stage');
  if (stage) { const r = stage.getBoundingClientRect(); UI.pin = { cid: stage.dataset.pin, x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; render(); setTimeout(() => $(`#cmt-${stage.dataset.pin}`)?.focus(), 30); return; }
  const el = e.target.closest('[data-act]'); if (!el || !el.dataset.act) return;
  const [a, ...args] = el.dataset.act.split(':');
  if (!ACT[a]) return;
  if (el.tagName !== 'A' || el.getAttribute('href')?.startsWith('javascript')) e.preventDefault();
  e.stopPropagation();
  ACT[a](el, ...args);
});
document.addEventListener('submit', e => { e.preventDefault(); const f = e.target; FORMS[f.dataset.form]?.(f, e.submitter); });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.upload) {
    readImages(el.files).then(list => {
      if (!list.length) { toast('เลือกได้เฉพาะไฟล์รูป'); return; }
      if (el.dataset.upload === 'editor') { UI.modal.pending = [...(UI.modal.pending || []), ...list]; snapshotEditor(); render(); }
      else { const c = getC(el.dataset.upload); c.media.push(...list.map(src => ({ src }))); save(); toast(`เพิ่มรูปแล้ว ${list.length} รูป`); render(); }
    });
    return;
  }
  if (el.closest('#f-chs') || el.id === 'f-type' || el.id === 'f-work') {
    if (el.id === 'f-type' || el.id === 'f-work') { const sel = $$('#f-chs input:checked').map(i => i.value); $('#f-chs').innerHTML = chOptions({ type: $('#f-type').value, work: $('#f-work').value }, sel); }
    updateCapHint(); return;
  }
  const key = el.dataset.change; if (!key) return;
  const [k, arg] = key.split(':');
  const res = CHANGE[k]?.(el.value, el, arg);
  if (res === 'lib') { $('#lib-list').innerHTML = libRows(libList(), 'ไม่พบคอนเทนต์ที่ตรงกับตัวกรอง'); return; }
  render();
});
/* เก็บค่าที่พิมพ์ในฟอร์มไว้ก่อน render ใหม่ (ตอนเพิ่มรูป) */
function snapshotEditor() {
  const f = $('form[data-form="editor"]'); if (!f) return;
  const M = UI.modal; const fd = new FormData(f);
  const tmp = M.id ? getC(M.id) : null;
  M.type = fd.get('type'); M.work = fd.get('work'); M.channels = fd.getAll('ch');
  M.draftVals = { title: fd.get('title'), caption: fd.get('caption'), date: fd.get('date'), time: fd.get('time'), capx: fd.get('capx') };
  void tmp;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.input === 'libQ') { UI.libQ = el.value; $('#lib-list').innerHTML = libRows(libList(), 'ไม่พบคอนเทนต์ที่ตรงกับตัวกรอง'); }
  if (el.dataset.input === 'wizacc') UI.modal.account = el.value;
  if (el.id === 'f-cap' || el.id === 'f-capx') updateCapHint();
});
document.addEventListener('dragstart', e => { const id = e.target.closest?.('[data-drag]')?.dataset.drag; if (id) { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => { const cell = e.target.closest?.('.cal .cell'); if (cell) { e.preventDefault(); $$('.cal .cell.over').forEach(x => x !== cell && x.classList.remove('over')); cell.classList.add('over'); } });
document.addEventListener('dragleave', e => { const cell = e.target.closest?.('.cal .cell'); if (cell && !cell.contains(e.relatedTarget)) cell.classList.remove('over'); });
document.addEventListener('drop', e => { const cell = e.target.closest?.('.cal .cell'); if (!cell) return; e.preventDefault(); cell.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, cell.dataset.day); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (UI.modal && !(UI.modal.kind === 'publishing' && !UI.modal.done)) { UI.modal = null; render(); } else if (UI.drawer) { UI.drawer = null; render(); } else if (UI.menu || UI.switcher) { UI.menu = false; UI.switcher = false; render(); } } });
window.addEventListener('hashchange', () => { UI.menu = false; UI.switcher = false; UI.drawer = null; render(); window.scrollTo(0, 0); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => render());

/* restore typed editor values after a re-render triggered by adding photos */
const _editorHTML = editorHTML;
editorHTML = M => {
  let html = _editorHTML(M);
  if (M.draftVals) setTimeout(() => { const f = $('form[data-form="editor"]'); if (!f) return; for (const [k, v] of Object.entries(M.draftVals)) if (f.elements[k] && v != null) f.elements[k].value = v; updateCapHint(); }, 0);
  return html;
};

runScheduled();
setInterval(runScheduled, 30000);
render();
})();
