# ลองรัน Content Studio บนเครื่อง Mac

ใช้ลองระบบทั้งหมด (เว็บ + ฐานข้อมูล + ตัวโพสต์ตามเวลา) บน Mac ของตัวเองก่อนขึ้นเซิร์ฟเวอร์จริง
ใช้ได้ทั้ง Mac ชิป Apple (M1–M4) และ Intel · ข้อมูลอยู่ในเครื่องนี้เท่านั้น คนอื่นเข้าไม่ได้

## วิธีที่ 1: ใช้ Docker Desktop (แนะนำ ไม่ต้องติดตั้งอย่างอื่น)

### 1. ติดตั้งโปรแกรม (ครั้งเดียว)

1. **Docker Desktop:** ดาวน์โหลดจาก https://www.docker.com/products/docker-desktop/ เลือกให้ตรงกับชิปของเครื่อง (ดูได้ที่  > About This Mac) ติดตั้งแล้วเปิดโปรแกรมทิ้งไว้ ให้ไอคอนวาฬขึ้นที่แถบเมนูด้านบน
2. **GitHub Desktop:** ดาวน์โหลดจาก https://desktop.github.com/ แล้วล็อกอินบัญชี GitHub ที่เข้าถึง repository นี้ได้

### 2. ดึงโค้ดลงเครื่อง

1. ใน GitHub Desktop: **File > Clone Repository** เลือก `CosMD-BBB/Content-Analysis` แล้วกด Clone
2. มุมซ้ายบน **Current Branch** เลือก `main` (ถ้ายังไม่ได้ merge Pull Request ให้เลือก `claude/intelligent-gates-ozt93b`)

### 3. เปิดระบบ

เปิดโปรแกรม **Terminal** (กด ⌘ + Space พิมพ์ Terminal) แล้วพิมพ์ทีละบรรทัด:

```bash
cd ~/Documents/GitHub/Content-Analysis
```

```bash
docker compose -f docker-compose.local.yml up -d --build
```

ครั้งแรกใช้เวลา 5–10 นาที (ดาวน์โหลดและสร้างระบบ) ครั้งต่อไปไม่กี่วินาที

### 4. ใช้งาน

เปิดเบราว์เซอร์ไปที่ **http://localhost:3000** แล้วสมัครบัญชีแรก (คนแรกเป็นเจ้าของระบบ)

ถ้าอยากเห็นข้อมูลตัวอย่างแบบที่เคยส่งภาพให้ดู ให้รันคำสั่งนี้ **ก่อนสมัครบัญชี** (ใช้ได้กับฐานข้อมูลที่ยังว่างเท่านั้น):

```bash
docker compose -f docker-compose.local.yml exec web node dist/scripts/seed-demo.mjs
```

แล้วเข้าสู่ระบบด้วย `demo@contentstudio.local` รหัส `demo1234`
บัญชีอื่นในข้อมูลตัวอย่าง (รหัสเดียวกัน): `pim@` หัวหน้าคอนเทนต์, `ton@` และ `mind@` ครีเอเตอร์, `boss@` ฝ่ายวิเคราะห์ (ต่อท้ายด้วย `contentstudio.local`) ลองเข้าทีละบัญชีเพื่อดูว่าแต่ละบทบาทเห็นต่างกันอย่างไร

### 5. ปิด / เปิดใหม่ / ล้างข้อมูล

ปิดระบบ (ข้อมูลยังอยู่):

```bash
docker compose -f docker-compose.local.yml down
```

เปิดอีกครั้ง: ใช้คำสั่งในขั้นที่ 3

ล้างข้อมูลทั้งหมดแล้วเริ่มใหม่:

```bash
docker compose -f docker-compose.local.yml down -v
```

อัปเดตเป็นโค้ดล่าสุด: ใน GitHub Desktop กด **Fetch origin** แล้ว **Pull** จากนั้นรันคำสั่งในขั้นที่ 3 อีกครั้ง

### ข้อจำกัดเมื่อรันในเครื่อง

- **ไม่ส่งอีเมล:** ลืมรหัสผ่านให้เจ้าของระบบรีเซ็ตให้ในหน้า "ทีมและสิทธิ์"
- **เปิดได้เฉพาะเครื่องนี้:** ถ้าอยากให้คนในออฟฟิศเครือข่ายเดียวกันลองด้วย เปิด `http://IP-ของ-Mac:3000` (ดู IP ที่  > System Settings > Wi-Fi > Details) แต่การดาวน์โหลดไฟล์บางอย่างอาจไม่ทำงานเพราะไม่ใช่ https
- **ข้อมูลตัวอย่างใช้รูปแทนวิดีโอ:** เพราะในระบบไม่มีโปรแกรมสร้างวิดีโอ ส่วนวิดีโอที่อัปโหลดเองใช้ได้ปกติ

## วิธีที่ 2: ไม่ใช้ Docker (สำหรับผู้พัฒนา)

ต้องมี [Homebrew](https://brew.sh/) ก่อน แล้วติดตั้ง Node.js 22 และ PostgreSQL 16:

```bash
brew install node@22 postgresql@16 ffmpeg
```

```bash
brew services start postgresql@16
```

```bash
createdb content_studio
```

ในโฟลเดอร์โค้ด:

```bash
cp .env.example .env
```

แก้ `.env` บรรทัด `DATABASE_URL` เป็น `postgres://localhost:5432/content_studio` แล้ว:

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run seed:demo
```

```bash
npm run dev
```

เปิดอีกหน้าต่าง Terminal สำหรับตัวโพสต์ตามเวลา:

```bash
npm run worker
```

เปิด http://localhost:3000

## ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `docker: command not found` หรือ `Cannot connect to the Docker daemon` | เปิดโปรแกรม Docker Desktop ก่อน รอให้ไอคอนวาฬหยุดขยับ แล้วลองใหม่ |
| `port is already allocated` (พอร์ต 3000 หรือ 5432 ถูกใช้) | ปิดโปรแกรมอื่นที่ใช้พอร์ตนั้น หรือแก้เลข `"3000:3000"` ใน `docker-compose.local.yml` เป็น `"3001:3000"` แล้วเปิด http://localhost:3001 |
| `ฐานข้อมูลมีข้อมูลอยู่แล้ว` ตอนใส่ข้อมูลตัวอย่าง | ข้อมูลตัวอย่างใส่ได้เฉพาะตอนฐานข้อมูลว่าง ล้างด้วยคำสั่ง `down -v` แล้วเปิดใหม่ |
| หน้าเว็บขึ้น error | ดู log: `docker compose -f docker-compose.local.yml logs web` |
| เครื่องช้า / พื้นที่เต็ม | Docker Desktop > Settings > Resources ปรับ RAM อย่างน้อย 4 GB · ลบของเก่า: `docker system prune` |
