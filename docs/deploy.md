# ขึ้นระบบจริงบน Hostinger VPS

คู่มือนี้พาตั้งแต่เช่าเซิร์ฟเวอร์จนเปิดใช้งานที่ `https://โดเมนของคุณ` และอัปเดตอัตโนมัติทุกครั้งที่โค้ดใน GitHub เปลี่ยน

ระบบประกอบด้วย 4 ส่วน รันด้วย Docker บนเครื่องเดียว:

| ส่วน | หน้าที่ |
|---|---|
| `web` | หน้าเว็บ Content Studio |
| `worker` | โพสต์ตามเวลาที่ตั้ง, เตือนงานใกล้กำหนด |
| `db` | ฐานข้อมูล PostgreSQL |
| `caddy` | รับคนเข้าเว็บ และขอใบรับรอง HTTPS ให้อัตโนมัติ |

> ทำไมต้อง VPS: แผน Node.js ของ Hostinger (Business/Cloud) รันเว็บ Next.js จาก GitHub ได้ แต่ไม่มี PostgreSQL และไม่รองรับ worker ที่ต้องทำงานตลอดเวลา

## 1. เช่า VPS

1. ใน Hostinger เลือก **VPS Hosting** แผน **KVM 2** (2 vCPU, RAM 8 GB) แนะนำสำหรับทีมหลายคนและมีวิดีโอ แผน KVM 1 ใช้ได้สำหรับเริ่มต้น
2. ตำแหน่งเซิร์ฟเวอร์: เลือกที่ใกล้ไทยที่สุดที่มีให้เลือก (เช่น มาเลเซีย หรือ สิงคโปร์)
3. ระบบปฏิบัติการ: เลือก **Ubuntu 24.04 with Docker** (ถ้าไม่มี เลือก Ubuntu 24.04 ธรรมดาแล้วติดตั้ง Docker ในขั้นที่ 4)
4. ตั้งรหัสผ่าน root และจด **IP ของเซิร์ฟเวอร์** ไว้

## 2. ชี้โดเมนมาที่เซิร์ฟเวอร์

ใน hPanel > **Domains** > เลือกโดเมน > **DNS / Nameservers** เพิ่มระเบียน:

| Type | Name | Points to |
|---|---|---|
| A | `content` (หรือชื่อที่ต้องการ) | IP ของ VPS |

ระบบจะใช้ที่อยู่ `https://content.โดเมนของคุณ` รอ 5–30 นาทีให้ DNS อัปเดต

## 3. เปิด firewall

hPanel > **VPS** > **Security** > **Firewall**: อนุญาตพอร์ต **22** (SSH), **80** และ **443** (เว็บ)

## 4. เข้าเซิร์ฟเวอร์และติดตั้ง Docker

เข้าผ่าน hPanel > VPS > **Browser terminal** หรือจากเครื่องตัวเอง:

```bash
ssh root@IP_ของ_VPS
```

ถ้าเลือก Ubuntu ธรรมดา ให้ติดตั้ง Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

## 5. ดึงโค้ดจาก GitHub

repository เป็นแบบส่วนตัว จึงต้องให้เซิร์ฟเวอร์มีกุญแจสำหรับอ่าน:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
```

```bash
cat ~/.ssh/github_deploy.pub
```

คัดลอกข้อความที่ได้ ไปที่ GitHub > repository **Content-Analysis** > **Settings** > **Deploy keys** > **Add deploy key** วาง แล้วบันทึก (ไม่ต้องติ๊ก Allow write access)

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n' >> ~/.ssh/config
```

```bash
git clone git@github.com:CosMD-BBB/Content-Analysis.git /opt/content-studio
```

## 6. ตั้งค่า

```bash
cd /opt/content-studio && cp .env.example .env && nano .env
```

แก้อย่างน้อย:

| ตัวแปร | ใส่อะไร |
|---|---|
| `DOMAIN` | `content.โดเมนของคุณ` |
| `APP_URL` | `https://content.โดเมนของคุณ` |
| `POSTGRES_PASSWORD` | รหัสยาวๆ ที่สุ่มขึ้นมา (สร้างได้ด้วย `openssl rand -hex 24`) |
| `SMTP_*`, `MAIL_FROM` | ถ้าใช้อีเมลของ Hostinger: `smtp.hostinger.com`, พอร์ต `465`, อีเมลและรหัสของกล่องนั้น |

กด `Ctrl+O` บันทึก `Ctrl+X` ออก

ไฟล์รูปและวิดีโอเก็บบนเซิร์ฟเวอร์เป็นค่าเริ่มต้น ถ้าต้องการย้ายไป Cloudflare R2 (ไม่กินพื้นที่ VPS) ให้ใส่ค่า `S3_*`

## 7. เปิดระบบ

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

ครั้งแรกใช้เวลา 3–8 นาที ตรวจว่าพร้อม:

```bash
curl https://content.โดเมนของคุณ/api/health
```

ต้องได้ `{"ok":true,"db":true}`

## 8. สร้างบัญชีเจ้าของระบบ

เปิด `https://content.โดเมนของคุณ/register` แล้วสมัคร **คนแรกที่สมัครจะเป็นเจ้าของระบบ** สร้างโปรเจกต์ของแต่ละบริษัทได้ จากนั้นเชิญทีมที่เมนู **ทีมและสิทธิ์**

ทำขั้นนี้ทันทีหลังเปิดระบบ เพื่อไม่ให้คนอื่นสมัครเป็นคนแรก

## 9. อัปเดตอัตโนมัติจาก GitHub

ไฟล์ `.github/workflows/deploy.yml` จะ ssh เข้า VPS แล้วอัปเดตระบบทุกครั้งที่มีโค้ดใหม่เข้า branch `main`

1. บนเครื่องตัวเอง (ไม่ใช่ VPS) สร้างกุญแจสำหรับ GitHub Actions:
   ```bash
   ssh-keygen -t ed25519 -f gha_deploy -N ""
   ```
2. นำ `gha_deploy.pub` ไปต่อท้ายไฟล์ `/root/.ssh/authorized_keys` บน VPS
3. GitHub > repository > **Settings** > **Secrets and variables** > **Actions** > **New repository secret** เพิ่ม 3 ค่า:

| Secret | ค่า |
|---|---|
| `VPS_HOST` | IP ของ VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | เนื้อหาไฟล์ `gha_deploy` ทั้งหมด (กุญแจส่วนตัว) |

4. merge โค้ดเข้า `main` แล้วดูผลที่แท็บ **Actions**

## 10. สำรองฐานข้อมูลทุกวัน

```bash
crontab -e
```

เพิ่มบรรทัดนี้ (สำรองทุกวัน 02:30 เก็บ 7 วัน ไฟล์อยู่ที่ `/opt/content-studio/backups`):

```
30 2 * * * /opt/content-studio/deploy/backup.sh >> /var/log/content-backup.log 2>&1
```

แนะนำให้เปิด **Snapshot/Backup** ของ VPS ใน hPanel เพิ่มด้วย เผื่อเครื่องเสียทั้งเครื่อง

กู้ข้อมูลจากไฟล์สำรอง:

```bash
gunzip -c backups/db-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U content content_studio
```

## ปัญหาที่พบบ่อย

| อาการ | วิธีดู / แก้ |
|---|---|
| เปิดเว็บไม่ได้ หรือ HTTPS ไม่ขึ้น | DNS ยังไม่ชี้มา (รอ) หรือ firewall ยังไม่เปิดพอร์ต 80/443 ดู log: `docker compose -f docker-compose.prod.yml logs caddy` |
| หน้าเว็บ error | `docker compose -f docker-compose.prod.yml logs -f web` |
| ตั้งเวลาแล้วไม่โพสต์ | ดูว่า worker ทำงาน: `docker compose -f docker-compose.prod.yml logs -f worker` ต้องเห็น `worker started` |
| ไม่ได้รับอีเมล | ตรวจค่า `SMTP_*` ใน `.env` แล้ว `docker compose -f docker-compose.prod.yml up -d` อีกครั้ง |
| ลืมรหัสผ่านและส่งอีเมลไม่ได้ | เจ้าของระบบเปิดเมนู **ทีมและสิทธิ์** แล้วกด “รีเซ็ตรหัส” ข้างชื่อคนนั้น จะได้รหัสชั่วคราวไปส่งให้ |
| พื้นที่เต็ม | ลบ image เก่า: `docker image prune -af` หรือย้ายไฟล์ไป Cloudflare R2 |
