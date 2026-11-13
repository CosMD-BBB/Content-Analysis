# Content Studio ระยะ 1 Implementation Plan

> **For agentic workers:** Implement this plan task-by-task (subagent-driven or inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบ Content Studio ระยะ 1 ที่ใช้งานจริงได้บนเซิร์ฟเวอร์: สมัคร/ล็อกอิน, หลายโปรเจกต์, สิทธิ์, คอนเทนต์พร้อมรูป, ปฏิทินลากได้, อนุมัติ, เผยแพร่แบบโพสต์เอง, แจ้งเตือน, รายงาน และหน้าช่องทางพร้อมคู่มือเชื่อมต่อ

**Architecture:** Next.js (App Router) แอปเดียวทำทั้งหน้าเว็บและ server actions คุยกับ PostgreSQL ผ่าน Drizzle ORM มี worker แยก (pg-boss) สำหรับโพสต์ตามเวลาและส่งแจ้งเตือน ตรรกะธุรกิจอยู่ใน `src/` เป็นฟังก์ชันที่ทดสอบได้โดยไม่ต้องมีหน้าเว็บ ทุก action ผ่าน guard ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM 0.45 + drizzle-kit 0.31, postgres (postgres.js), bcryptjs 3, zod 4, pg-boss 12, sharp, @aws-sdk/client-s3, nodemailer, @dnd-kit/core 6, Vitest 4, @playwright/test

**Spec:** `docs/specs/2026-11-13-content-studio-design.md` (ระยะ 1 ในหัวข้อ 9) · ต้นแบบหน้าตา: `prototype/content-studio.html`

## Global Constraints

- เขตเวลา Asia/Bangkok สำหรับทุกการแสดงผลและการรับค่า; เก็บในฐานข้อมูลเป็น `timestamptz`
- รูปไม่เกิน 20 MB (JPG, PNG, WebP), วิดีโอไม่เกิน 500 MB (MP4, MOV)
- รหัสผ่านอย่างน้อย 8 ตัว เข้ารหัสด้วย bcrypt; อีเมลเทียบแบบไม่สนตัวพิมพ์เล็กใหญ่
- คนแรกที่สมัครเป็นเจ้าของระบบ (`isSuperAdmin = true`); คนอื่นที่สมัครเองไม่เห็นข้อมูลจนกว่าจะถูกเพิ่มเข้าโปรเจกต์
- ไม่มีบทบาทลูกค้า; บทบาทต่อโปรเจกต์: `admin`, `manager`, `creator`, `analyst`
- ระบบต้องไม่โพสต์คอนเทนต์ที่ไม่ได้อยู่ในสถานะ `approved` หรือ `scheduled`
- ข้อมูลของโปรเจกต์หนึ่งต้องอ่านหรือแก้จากผู้ใช้ที่ไม่ได้เป็นสมาชิกโปรเจกต์นั้นไม่ได้ (เจ้าของระบบยกเว้น)
- token / ค่าลับ ไม่ส่งไปหน้าเว็บ; ไม่ commit `.env`
- ข้อความบนหน้าเว็บเป็นภาษาไทย เก็บไว้ใน `src/i18n/th.ts`
- ระยะ 1 ทุกช่องทางทำงานแบบ "ต้องโพสต์เอง" และปุ่มเชื่อมต่อแสดง "เร็วๆ นี้"
- สำรองฐานข้อมูลอัตโนมัติทุกวัน เก็บ 7 วัน (ตั้งที่ผู้ให้บริการ เขียนวิธีไว้ในคู่มือ deploy)

## Review Focus

1. **สมัครแล้วยังไม่มีโปรเจกต์**: ต้องเห็นหน้า "รอแอดมินเพิ่มคุณเข้าโปรเจกต์" ไม่ใช่ error และไม่เห็นโปรเจกต์ของคนอื่น → test ใน Task 4
2. **แก้คอนเทนต์ที่ตั้งเวลาไว้แล้ว**: ต้องกลับเป็น "รออนุมัติ" และ worker ต้องไม่โพสต์ → test ใน Task 5 และ Task 9
3. **เขตเวลา**: เซิร์ฟเวอร์จริงรันเป็น UTC; งานที่กรอก 19:00 ต้องแสดง 19:00 และอยู่ในช่องวันถูกต้องในปฏิทิน แม้ใกล้เที่ยงคืน → test ใน Task 1 และ Task 8
4. **ไฟล์จาก iPhone (HEIC) / ไฟล์ใหญ่เกิน**: ต้องได้ข้อความภาษาไทยบอกชนิดไฟล์ที่รองรับและขนาดสูงสุด ไม่ใช่ error 500 → test ใน Task 6
5. **สองคนแก้ชิ้นเดียวกันพร้อมกัน**: คนที่บันทึกทีหลังต้องเห็นข้อความ "มีคนแก้งานนี้ไปแล้ว โหลดใหม่ก่อนบันทึก" แทนการทับงานเงียบๆ → test ใน Task 5

---

## โครงไฟล์

```
app/
  (auth)/login/page.tsx, (auth)/register/page.tsx, (auth)/invite/[token]/page.tsx
  (app)/layout.tsx                      ต้องล็อกอิน
  (app)/projects/page.tsx               ทุกโปรเจกต์ + สร้างโปรเจกต์ (เจ้าของระบบ)
  (app)/waiting/page.tsx                ยังไม่มีโปรเจกต์
  (app)/p/[projectId]/layout.tsx        sidebar + สลับโปรเจกต์ + กระดิ่ง
  (app)/p/[projectId]/page.tsx          ภาพรวม
  (app)/p/[projectId]/{calendar,library,approvals,reports,favorites,channels,team,settings}/page.tsx
  (app)/p/[projectId]/content/[contentId]/page.tsx
  (app)/account/page.tsx                เปลี่ยนรหัสผ่าน + ตั้งค่าแจ้งเตือน
  api/upload/route.ts, api/health/route.ts, api/p/[projectId]/reports.csv/route.ts
src/
  db/schema.ts, db/client.ts
  lib/time.ts
  i18n/th.ts
  auth/password.ts, auth/session.ts, auth/service.ts
  access/permissions.ts, access/guard.ts
  projects/service.ts, projects/defaults.ts
  content/state.ts, content/service.ts, content/validation.ts
  media/storage.ts, media/service.ts
  channels/catalog.ts, channels/guides.ts
  publish/service.ts
  notify/service.ts, notify/email.ts
  reports/aggregate.ts, reports/csv.ts
  worker/index.ts
components/   (ui, content-card, cover, platform-preview, calendar, pin-comments, wizard)
tests/        unit/*.test.ts, integration/*.test.ts, setup.ts
e2e/          happy-path.spec.ts
```

ตรรกะทั้งหมดอยู่ใน `src/` และรับ `db` เป็นพารามิเตอร์แรก (ฟังก์ชัน service) เพื่อให้ test ใช้ฐานข้อมูลทดสอบได้ หน้าเว็บและ server actions เป็นเปลือกบางๆ ที่เรียก guard แล้วเรียก service

---

### Task 1: ตั้งโปรเจกต์ + ฐานข้อมูล + ตัวช่วยเวลา

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `drizzle.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`, `docker-compose.yml` (postgres 16 + minio), `scripts/test-db.sh`
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/lib/time.ts`, `src/i18n/th.ts`
- Test: `tests/setup.ts`, `tests/unit/time.test.ts`, `tests/integration/schema.test.ts`

**Interfaces:**
- Produces:
  - `db` type `DB` (Drizzle instance) จาก `src/db/client.ts`; `createDb(url: string): DB`
  - ตารางใน `schema.ts`: `users(id, email unique lower, name, passwordHash, isSuperAdmin, createdAt)`, `sessions(id, userId, expiresAt)`, `passwordResets(tokenHash, userId, expiresAt, usedAt)`, `projects(id, name, color, archivedAt)`, `memberships(projectId, userId, role, unique(projectId,userId))`, `invites(token, projectId, role, email nullable, expiresAt, usedAt)`, `workTypes(id, projectId, name, sortOrder, manualOnly bool)`, `pillars(id, projectId, name, color)`, `channels(id, projectId, platform, status: 'not_connected'|'connected'|'coming_soon', accountName)`, `contents(id, projectId, title, workTypeId, format, pillarId, scheduledAt timestamptz, ownerId, status, caption, assetLink, version int, createdAt, updatedAt)`, `contentChannels(id, contentId, platform, captionOverride nullable, publishState: 'pending'|'posted'|'manual_todo'|'manual_done'|'failed', postUrl, reason, postedAt, postedBy)`, `media(id, contentId, kind:'image'|'video', storageKey, thumbKey, width, height, sizeBytes, sortOrder)`, `comments(id, contentId, userId, body, mediaId nullable, pinX real nullable, pinY real nullable, resolvedAt, createdAt)`, `favorites(userId, contentId, pk)`, `contentVersions(id, contentId, version, userId, snapshot jsonb, createdAt)`, `metrics(id, contentChannelId, day date, views, likes, comments, shares, clicks, source:'api'|'manual', enteredBy, unique(contentChannelId, day))`, `notifications(id, userId, projectId, kind, contentId, readAt, createdAt)`, `notificationPrefs(userId, email bool, inApp bool)`, `activity(id, projectId, userId, text, contentId, createdAt)`
  - types/consts ที่ export จาก `schema.ts` ให้ทุก task ใช้: `PLATFORMS = ['facebook','instagram','youtube','tiktok','x','lemon8','line','web'] as const`, `type Platform`, `type Format = 'reel'|'video'|'image'|'carousel'|'article'`, `type ContentStatus = 'idea'|'draft'|'review'|'changes'|'approved'|'scheduled'|'published'`, `type Role = 'admin'|'manager'|'creator'|'analyst'`
  - `src/lib/time.ts`: `TZ = 'Asia/Bangkok'`; `fromBangkokInput(date: string /*YYYY-MM-DD*/, time: string /*HH:mm*/): Date`; `bangkokDayKey(d: Date): string /*YYYY-MM-DD*/`; `formatThai(d: Date, style: 'date'|'datetime'|'short'): string` (ปี พ.ศ., ชื่อเดือนย่อไทย เช่น `13 พ.ย. 2569 · 19:00 น.`)

- [ ] **Step 1:** สร้างโปรเจกต์ Next.js 16 (TypeScript, App Router, Tailwind 4, ไม่มี `src/app` → ใช้ `app/` ที่ราก) และติดตั้งแพ็กเกจตาม Tech Stack; scripts: `dev`, `build`, `start`, `worker` (`tsx src/worker/index.ts`), `db:generate`, `db:migrate`, `test` (`vitest run`), `e2e`
- [ ] **Step 2:** `scripts/test-db.sh` เริ่ม Postgres 16 ชั่วคราวใน `.tmp/pg` ด้วย `initdb`/`pg_ctl` ที่ port 54329 ถ้าไม่มี Docker แล้ว export `TEST_DATABASE_URL`; `tests/setup.ts` รัน migration หนึ่งครั้ง และ `TRUNCATE ... CASCADE` ทุกตารางก่อนแต่ละ test ไฟล์ integration
- [ ] **Step 3: เขียน test ที่ล้มเหลว** `tests/unit/time.test.ts`
  ```ts
  test('19:00 Bangkok is 12:00 UTC', () => expect(fromBangkokInput('2026-11-13','19:00').toISOString()).toBe('2026-11-13T12:00:00.000Z'))
  test('00:30 Bangkok stays on its own day', () => expect(bangkokDayKey(fromBangkokInput('2026-11-14','00:30'))).toBe('2026-11-14'))
  test('thai format', () => expect(formatThai(new Date('2026-11-13T12:00:00Z'),'datetime')).toBe('13 พ.ย. 2569 · 19:00 น.'))
  ```
  และ `tests/integration/schema.test.ts`: insert membership ซ้ำ (projectId,userId) เดิม → throw; insert user อีเมล `A@x.com` แล้ว `a@x.com` → throw
- [ ] **Step 4:** รัน `TZ=UTC npm test` → FAIL
- [ ] **Step 5:** เขียน schema, client, time helpers; `npm run db:generate` ได้ไฟล์ใน `drizzle/`
- [ ] **Step 6:** รัน `TZ=UTC npm test` → PASS และ `npm run build` → สำเร็จ
- [ ] **Step 7:** Commit `feat: scaffold app, database schema and Bangkok time helpers`

### Task 2: สมัคร ล็อกอิน และ session

**Files:**
- Create: `src/auth/password.ts`, `src/auth/session.ts`, `src/auth/service.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/account/page.tsx`, `middleware.ts`
- Test: `tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: `DB`, ตาราง `users`, `sessions`
- Produces:
  - `register(db, { name, email, password }): Promise<{ ok: true; userId: string } | { ok: false; error: 'email_taken' | 'weak_password' | 'invalid_email' }>`
  - `login(db, { email, password }): Promise<{ ok: true; sessionId: string } | { ok: false; error: 'invalid_credentials' }>`
  - `getUserBySession(db, sessionId): Promise<User | null>` (หมดอายุ → null; อายุ session 30 วัน ต่ออายุเมื่อเหลือน้อยกว่า 15 วัน)
  - `logout(db, sessionId): Promise<void>`
  - `changePassword(db, userId, oldPw, newPw)`, `adminResetPassword(db, actorId, targetUserId): Promise<string /*รหัสชั่วคราว*/>` (เฉพาะเจ้าของระบบ)
  - `requestPasswordReset(db, email): Promise<void>` (ส่งลิงก์ทางอีเมล อายุ 1 ชม.; อีเมลไม่มีในระบบ → ไม่บอกผู้ใช้ว่าไม่มี), `resetPassword(db, token, newPw): Promise<{ ok: boolean }>`; หน้า `app/(auth)/reset/page.tsx`
  - `currentUser(): Promise<User | null>` ใน `session.ts` (อ่าน cookie `cs_session`, httpOnly, secure ใน production, sameSite lax)

- [ ] **Step 1: เขียน test ที่ล้มเหลว**
  ```ts
  test('first user becomes super admin, second does not')
  test('email is case-insensitive: register A@x.com then a@x.com → email_taken')
  test('password shorter than 8 → weak_password')
  test('wrong password → invalid_credentials (same error as unknown email)')
  test('expired session → getUserBySession returns null')
  test('logout deletes the session')
  test('adminResetPassword by non-super-admin throws forbidden')
  test('reset token works once and expires after 1 hour')
  ```
- [ ] **Step 2:** รัน `npm test tests/integration/auth.test.ts` → FAIL
- [ ] **Step 3:** เขียน service (bcrypt cost 12), หน้า login/register ตามสไตล์ prototype, `middleware.ts` ส่งคนที่ไม่มี cookie ไป `/login`
- [ ] **Step 4:** รัน test → PASS
- [ ] **Step 5:** Commit `feat: email registration, login and sessions`

### Task 3: สิทธิ์ตามบทบาท

**Files:**
- Create: `src/access/permissions.ts`, `src/access/guard.ts`
- Test: `tests/unit/permissions.test.ts`, `tests/integration/guard.test.ts`

**Interfaces:**
- Produces:
  - `Role`, `ContentStatus` มาจาก `src/db/schema.ts` (Task 1)
  - `type Perm = 'create'|'editAny'|'assign'|'approve'|'publish'|'manual'|'metrics'|'reports'|'channels'|'team'`
  - `can(role: Role, perm: Perm): boolean` ตามตาราง `PERMS` ใน prototype (`prototype/content-studio.html`, ค้นหา `const PERMS`)
  - `canEditContent(role: Role, isOwner: boolean, status: ContentStatus): boolean`: `editAny` แก้ได้ทุกสถานะยกเว้น `published`; creator แก้ได้เมื่อเป็นเจ้าของและสถานะเป็น `idea|draft|changes`
  - `requireMember(db, userId, projectId): Promise<{ role: Role; isSuperAdmin: boolean }>` (ไม่เป็นสมาชิก → throw `ForbiddenError`; เจ้าของระบบได้สิทธิ์ `admin` ทุกโปรเจกต์)
  - `requirePerm(db, userId, projectId, perm): Promise<Role>`

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: ตารางทุกบทบาท × ทุกสิทธิ์ ตรงกับ README (เช่น `can('creator','approve') === false`, `can('analyst','metrics') === true`, `can('manager','channels') === false`); `canEditContent('creator', false, 'draft') === false`; `canEditContent('creator', true, 'review') === false`; `canEditContent('manager', false, 'published') === false`; integration: ผู้ใช้ไม่เป็นสมาชิก → `requireMember` throw
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: role permissions and project guards`

### Task 4: โปรเจกต์ สมาชิก และการเชิญ

**Files:**
- Create: `src/projects/defaults.ts`, `src/projects/service.ts`, `app/(app)/projects/page.tsx`, `app/(app)/waiting/page.tsx`, `app/(app)/p/[projectId]/layout.tsx`, `app/(app)/p/[projectId]/team/page.tsx`, `app/(app)/p/[projectId]/settings/page.tsx`, `app/(auth)/invite/[token]/page.tsx`, `components/project-switcher.tsx`, `components/sidebar.tsx`
- Test: `tests/integration/projects.test.ts`

**Interfaces:**
- Consumes: `requireMember`, `requirePerm`, `register`
- Produces:
  - `DEFAULT_WORK_TYPES = ['โพสต์ทั่วไป','VDO','Broadcast','Ads','Live','บทความ / SEO','KOL / Influencer','อื่นๆ']` โดย `Ads` และ `KOL / Influencer` มี `manualOnly = true`
  - `DEFAULT_PILLARS = ['ความรู้','รีวิวสินค้า','โปรโมชัน','เบื้องหลัง','เสียงลูกค้า']`
  - `createProject(db, actorId, { name, color }): Promise<Project>` (เฉพาะเจ้าของระบบ; สร้าง work types, pillars, และ `channels` 8 แถวตาม `PLATFORMS` จาก Task 1 สถานะ `coming_soon` ยกเว้น lemon8 = `not_connected`; ผู้สร้างเป็น `admin`); `archiveProject(db, actorId, projectId)` เจ้าของระบบเท่านั้น โปรเจกต์ที่ปิดแล้วไม่แสดงในตัวสลับ
  - `listMyProjects(db, userId): Promise<Array<Project & { role: Role; pendingApprovals: number; manualTodo: number }>>`
  - `addMemberByEmail(db, actorId, projectId, email, role)` → `{ ok: false, error: 'not_registered' }` ถ้ายังไม่สมัคร
  - `createInvite(db, actorId, projectId, role): Promise<string /*token*/>` อายุ 7 วัน; `acceptInvite(db, userId, token)`
  - `changeRole(db, actorId, projectId, userId, role)`; ห้ามลด admin คนสุดท้ายของโปรเจกต์ → `{ ok: false, error: 'last_admin' }`
  - `updateWorkTypes(db, actorId, projectId, list)`, `updatePillars(...)` (ต้องมีสิทธิ์ `team`)
  - cookie `cs_last_project` จำโปรเจกต์ล่าสุด; หลังล็อกอิน: ไม่มีโปรเจกต์ → `/waiting`, มี → โปรเจกต์ล่าสุด

- [ ] **Step 1: เขียน test ที่ล้มเหลว**
  ```ts
  test('non super admin cannot create project')
  test('new project has 8 work types, 5 pillars, 8 channels, creator is admin')
  test('user with no membership: listMyProjects → []')        // Review Focus 1
  test('member of A cannot requireMember on B')
  test('invite token works once and expires after 7 days')
  test('cannot demote the last admin')
  ```
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียน service และหน้าเว็บ; หน้า `/waiting` แสดง "บัญชีของคุณพร้อมแล้ว รอแอดมินเพิ่มคุณเข้าโปรเจกต์ หรือเปิดลิงก์เชิญที่ได้รับ"; ตัวสลับโปรเจกต์อยู่บนสุดของ sidebar
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: projects, members, invites and project switcher`

### Task 5: คอนเทนต์และขั้นตอนสถานะ

**Files:**
- Create: `src/content/state.ts`, `src/content/validation.ts`, `src/content/service.ts`
- Test: `tests/unit/content-state.test.ts`, `tests/integration/content.test.ts`

**Interfaces:**
- Consumes: `requirePerm`, `canEditContent`, `fromBangkokInput`
- Produces:
  - `type ContentAction = 'start'|'submit'|'withdraw'|'approve'|'requestChanges'|'schedule'|'unschedule'|'publish'`
  - `nextStatus(status, action, role, isOwner): ContentStatus | null` (null = ทำไม่ได้). ตาราง: start: idea→draft (แก้ได้); submit: idea|draft|changes→review (เจ้าของหรือ editAny); withdraw: review→draft (เจ้าของ); approve: review→approved (approve); requestChanges: review→changes (approve, ต้องมีคอมเมนต์); schedule: approved→scheduled (publish, เวลาต้องอยู่ในอนาคต); unschedule: scheduled→approved; publish: approved|scheduled→published (publish)
  - `contentInput` (zod): title 1–200 ตัว, workTypeId, format `'reel'|'video'|'image'|'carousel'|'article'`, pillarId, date, time, ownerId, platforms (อย่างน้อย 1), caption, captionOverrides `Record<Platform,string>`, assetLink (URL หรือว่าง)
  - `captionWarnings(caption, overrides, platforms): string[]` เช่น X เกิน 280 ตัว → `'X: เกิน 280 ตัวอักษร'`
  - `createContent(db, actorId, projectId, input): Promise<Content>` (ครีเอเตอร์ ownerId ต้องเป็นตัวเอง ไม่งั้น forbidden)
  - `updateContent(db, actorId, contentId, input, expectedVersion: number): Promise<{ ok: true } | { ok: false; error: 'stale' | 'forbidden' }>`: เพิ่ม `version`, บันทึก `contentVersions`; ถ้าสถานะเดิม `approved|scheduled` → เปลี่ยนเป็น `review`
  - `applyAction(db, actorId, contentId, action, opts?: { comment?: string }): Promise<{ ok: true; status } | { ok: false; error }>`; บันทึก `activity`
  - `moveContent(db, actorId, contentId, newDayKey): Promise<...>` (คงเวลาเดิม เปลี่ยนวัน; ห้ามถ้า `published`; ถ้า `scheduled` → กลับเป็น `review`)
  - `toggleFavorite(db, userId, contentId): Promise<boolean>`

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: ตาราง `nextStatus` ทุกคู่ที่สำคัญ (เช่น creator approve → null, requestChanges ไม่มีคอมเมนต์ → error `comment_required`, schedule เวลาผ่านไปแล้ว → `time_in_past`); integration:
  ```ts
  test('editing a scheduled content sends it back to review')           // Review Focus 2
  test('update with old version → stale, nothing written')             // Review Focus 5
  test('creator cannot create content owned by someone else')
  test('every update writes a contentVersions row')
  test('move published content → forbidden')
  ```
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: content lifecycle, versions and validation`

### Task 6: อัปโหลดรูป/วิดีโอ และรูปย่อ

**Files:**
- Create: `src/media/storage.ts`, `src/media/service.ts`, `app/api/upload/route.ts`, `components/media-uploader.tsx`, `components/cover.tsx`
- Test: `tests/unit/media.test.ts`, `tests/integration/media.test.ts`, `tests/fixtures/sample.jpg`, `tests/fixtures/sample.heic`

**Interfaces:**
- Produces:
  - `interface Storage { put(key: string, body: Buffer, contentType: string): Promise<void>; url(key: string): Promise<string>; delete(key: string): Promise<void> }`; `s3Storage(env)` (R2/MinIO/S3 ผ่าน `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`), `localStorage(dir)` สำหรับ dev/test; `getStorage()` เลือกจาก env
  - `checkUpload(mime: string, size: number): { ok: true; kind: 'image'|'video' } | { ok: false; message: string }`. ข้อความ: ชนิดไม่รองรับ → `'รองรับเฉพาะรูป JPG, PNG, WebP และวิดีโอ MP4, MOV'`; รูปใหญ่เกิน → `'รูปต้องไม่เกิน 20 MB'`; วิดีโอใหญ่เกิน → `'วิดีโอต้องไม่เกิน 500 MB'`
  - `addMedia(db, storage, actorId, contentId, file: { buffer, mime, name }, cover?: Buffer): Promise<Media>`: รูป → sharp ทำ thumb กว้าง 480px WebP; วิดีโอ → thumb จาก `cover` (หน้าเว็บจับเฟรมแรกด้วย `<video>` + canvas แล้วส่งมา) ถ้าไม่มี cover ใช้ปกกราฟิก
  - `reorderMedia`, `removeMedia` (สิทธิ์เดียวกับแก้คอนเทนต์)
  - `<Cover content={...} size="sm"|"md"|"lg" />`: มีรูป → รูปย่อแรก; ไม่มี → ปกกราฟิก สีตามหมวด + ไอคอนรูปแบบงาน + ชื่องาน 2 บรรทัด
  - อัปโหลดวิดีโอใหญ่: route รับ stream ตรงไป storage (ไม่โหลดเข้าหน่วยความจำทั้งไฟล์); ตั้ง body size limit ของ Next ให้รองรับ 500 MB

- [ ] **Step 1: เขียน test ที่ล้มเหลว**
  ```ts
  test('heic is rejected with Thai message')              // Review Focus 4
  test('21 MB jpeg → รูปต้องไม่เกิน 20 MB')
  test('501 MB mp4 → วิดีโอต้องไม่เกิน 500 MB')
  test('jpeg upload stores original and a 480px-wide webp thumb')
  test('creator cannot add media to someone else\'s content')
  ```
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด; uploader รองรับลากวางหลายไฟล์ แสดงความคืบหน้า และแสดงข้อความ error ใต้ไฟล์นั้น
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: media uploads with thumbnails and generated covers`

### Task 7: หน้าเว็บหลัก: ภาพรวม คลัง รายละเอียด ฟอร์ม และตัวอย่างตามแพลตฟอร์ม

**Files:**
- Create: `app/(app)/p/[projectId]/page.tsx`, `library/page.tsx`, `favorites/page.tsx`, `content/[contentId]/page.tsx`, `components/content-form.tsx`, `components/content-card.tsx`, `components/platform-preview.tsx`, `components/status-pill.tsx`, `components/channel-badge.tsx`, `src/content/preview.ts`
- Test: `tests/unit/preview.test.ts`

**Interfaces:**
- Consumes: service ทั้งหมดของ Task 4–6, `<Cover>`
- Produces:
  - `previewFrame(platform: Platform, format: Format): { ratio: '9:16'|'4:5'|'1:1'|'16:9'; layout: 'vertical'|'feed'|'youtube'|'line_card'|'article' }`: reel บน tiktok/instagram/facebook/youtube → 9:16 vertical; image/carousel บน instagram → 4:5 feed; image บน facebook/x → 1:1 feed; video บน youtube → 16:9 youtube; ทุก format บน line → line_card; article บน web → article
  - หน้า: ภาพรวม (งานของฉัน, 7 วันข้างหน้าแบบมีรูปย่อ, ผลงานดีสุด, ความเคลื่อนไหว) · คลัง (ตารางมีรูปย่อ, ป้ายประเภทงาน, กรองตามสถานะ/ช่องทาง/ประเภทงาน/คน, ค้นหา, ดาว) · รายการโปรด · รายละเอียด (แกลเลอรีรูป, แท็บตัวอย่างต่อช่องทาง ใช้ caption ของช่องทางนั้นถ้ามี, ช่องทางและสถานะการโพสต์, ปุ่มตามสิทธิ์จาก `nextStatus`, ประวัติเวอร์ชัน) · ฟอร์มสร้าง/แก้ (ฟิลด์ตาม `contentInput`, แท็บแคปชันแยกช่องทาง, `captionWarnings`, ส่ง `expectedVersion`)
  - สไตล์ตาม prototype: tokens สีใน `app/globals.css` (คัดจาก `:root` ของ prototype), ฟอนต์ Anuphan + IBM Plex Sans Thai ผ่าน `next/font/google`

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: `previewFrame` ทุกคู่ข้างบน
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียน `preview.ts` แล้วสร้างหน้าและคอมโพเนนต์
- [ ] **Step 4:** รัน test → PASS; `npm run build` → สำเร็จ; เปิด `npm run dev` ดูทุกหน้าด้วยบัญชี admin และ creator
- [ ] **Step 5:** Commit `feat: overview, library, content detail with platform previews`

### Task 8: ปฏิทินลากย้ายวันได้

**Files:**
- Create: `app/(app)/p/[projectId]/calendar/page.tsx`, `components/calendar/month-grid.tsx`, `components/calendar/week-grid.tsx`, `src/content/calendar.ts`
- Test: `tests/unit/calendar.test.ts`

**Interfaces:**
- Consumes: `moveContent`, `bangkokDayKey`, `<Cover size="sm">`
- Produces:
  - `monthGrid(year: number, month0: number): string[] /*dayKeys เริ่มวันจันทร์ ครบทุกสัปดาห์*/`
  - `groupByDay(items: { scheduledAt: Date }[]): Record<string, T[]>` ใช้ `bangkokDayKey`
  - มุมมองเดือน/สัปดาห์; กรองตามช่องทาง สถานะ ประเภทงาน ผู้รับผิดชอบ; แต่ละงานมีรูปย่อเล็ก + เวลา + ชื่อ; ลาก (dnd-kit) ไปวันอื่นเรียก `moveContent`; งานที่ลากไม่ได้ (ไม่มีสิทธิ์/เผยแพร่แล้ว) ไม่มี handle; มือถือแสดงจุดสีและรายการของวันที่เลือก

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: `monthGrid(2026, 10)` เริ่ม `'2026-10-26'` จบ `'2026-12-06'`; `groupByDay` วางงาน `2026-11-13T17:30:00Z` (00:30 ของวันที่ 14 เวลาไทย) ใน `'2026-11-14'` (Review Focus 3)
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: drag-and-drop calendar`

### Task 9: อนุมัติ เผยแพร่ worker และงานต้องโพสต์เอง

**Files:**
- Create: `src/channels/catalog.ts`, `src/publish/service.ts`, `src/worker/index.ts`, `app/(app)/p/[projectId]/approvals/page.tsx`, `components/manual-post-row.tsx`
- Test: `tests/unit/publish-mode.test.ts`, `tests/integration/publish.test.ts`

**Interfaces:**
- Consumes: `applyAction`, `nextStatus`
- Produces:
  - `CATALOG: Record<Platform, { name; badge; color; post: 'yes'|'partial'|'no'; stats: 'yes'|'partial'|'no'; formats: Format[]; url }>` คัดค่าจาก `CH` ใน prototype
  - `publishMode(channel: { platform; status }, format, workType: { manualOnly }): { mode: 'auto'|'manual'; reason: string }`: ระยะ 1 ทุกกรณีเป็น `manual`; เหตุผลเรียงตามลำดับ: `workType.manualOnly` → `'งานประเภทนี้ต้องทำในระบบของแพลตฟอร์มเอง'`; `post === 'no'` → `'แพลตฟอร์มไม่มี API สำหรับโพสต์'`; status ไม่ใช่ `connected` → `'ยังไม่ได้เชื่อมต่อบัญชี'`; format ไม่อยู่ใน `formats` → `'API ไม่รองรับรูปแบบนี้'`
  - `interface PublishAdapter { publish(content, channelRow): Promise<{ url: string }> }`; `adapters: Partial<Record<Platform, PublishAdapter>>` (ระยะ 1 ว่าง)
  - `publishNow(db, actorId, contentId)`: ตรวจสิทธิ์ `publish` และสถานะ `approved|scheduled` ไม่งั้น error; ตั้งสถานะ `published`; แต่ละ contentChannel → `auto` ใส่คิว `publish-channel` / `manual` → `manual_todo` + reason
  - worker jobs: `scan-scheduled` ทุก 1 นาที (หา `scheduled` ที่ `scheduledAt <= now` แล้วเรียก `publishNow` ในนามผู้อนุมัติล่าสุด); `publish-channel` retry 3 ครั้ง (backoff 1, 5, 15 นาที) แล้วตั้ง `failed` → `manual_todo` พร้อมเหตุผล
  - `confirmManualPost(db, actorId, contentChannelId, url)`: ต้องมีสิทธิ์ `manual` และ url ขึ้นต้น `https://` ไม่งั้น `{ ok:false, error:'invalid_url' }`
  - หน้าอนุมัติ: 3 แท็บ (รออนุมัติ / พร้อมเผยแพร่ / ต้องโพสต์เอง) การ์ดมีรูปใหญ่ + ตัวอย่างช่องทาง + ปุ่มตามสิทธิ์; แท็บต้องโพสต์เองมี คัดลอกแคปชัน (ของช่องทางนั้น), ดาวน์โหลดไฟล์, เปิดแพลตฟอร์ม, วางลิงก์, ปุ่ม "โพสต์แล้ว"

- [ ] **Step 1: เขียน test ที่ล้มเหลว**
  ```ts
  test('Ads work type → manual with ad reason even if channel connected')
  test('lemon8 → manual: no API')
  test('publishNow on draft content → error, nothing posted')            // anti-goal
  test('scan-scheduled publishes due items only')
  test('content edited after scheduling (now review) is not published by scan')  // Review Focus 2
  test('adapter failing 3 times → manual_todo with reason')              // ใช้ fake adapter
  test('confirmManualPost rejects non-https url')
  ```
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด (worker ใช้ pg-boss บนฐานข้อมูลเดียวกัน)
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: approvals, publishing worker and manual posting queue`

### Task 10: คอมเมนต์ปักหมุดบนรูป และแจ้งเตือน

**Files:**
- Create: `src/notify/service.ts`, `src/notify/email.ts`, `components/pin-comments.tsx`, `components/bell.tsx`, ส่วนแจ้งเตือนใน `app/(app)/account/page.tsx`
- Modify: `src/content/service.ts` (เรียก `notify` หลัง action), `src/publish/service.ts`
- Test: `tests/integration/notify.test.ts`, `tests/integration/comments.test.ts`

**Interfaces:**
- Produces:
  - `addComment(db, actorId, contentId, { body, mediaId?, pinX?, pinY? })` (pin เป็นสัดส่วน 0–1; ต้องมีครบทั้ง mediaId/pinX/pinY หรือไม่มีเลย); `resolveComment(...)`
  - `type NotifyKind = 'submitted'|'changes_requested'|'approved'|'published'|'publish_failed'|'manual_todo'|'due_soon'`
  - `recipients(db, kind, content): Promise<string[] /*userIds*/>`: submitted → manager+admin ของโปรเจกต์; changes_requested/approved → เจ้าของงาน; published → เจ้าของงาน; publish_failed/manual_todo → เจ้าของงาน + manager; due_soon → เจ้าของงาน; ไม่รวมคนที่ทำ action เอง
  - `notify(db, kind, contentId, actorId)`: เขียน `notifications` และส่งอีเมลผ่าน `sendEmail(to, subject, html)` ถ้า `notificationPrefs.email` และตั้ง SMTP ไว้ (ไม่ได้ตั้ง → ข้ามอย่างเงียบและ log)
  - worker job `due-soon` ทุกวัน 09:00 เวลาไทย: งาน `idea|draft|changes` ที่กำหนดลงภายใน 2 วัน

- [ ] **Step 1: เขียน test ที่ล้มเหลว**
  ```ts
  test('submit notifies managers and admins, not the submitter')
  test('recipients never include members of other projects')
  test('email pref off → in-app only')
  test('pin without mediaId → validation error')
  ```
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด; คลิกบนรูปในหน้ารายละเอียดเพื่อปักหมุด แสดงเลขหมุดบนรูปและในรายการคอมเมนต์
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: pinned image comments and notifications`

### Task 11: รายงานผล และกรอกตัวเลขเอง

**Files:**
- Create: `src/reports/aggregate.ts`, `src/reports/csv.ts`, `app/(app)/p/[projectId]/reports/page.tsx`, `app/api/p/[projectId]/reports.csv/route.ts`, `components/charts/*.tsx`
- Test: `tests/unit/reports.test.ts`, `tests/integration/metrics.test.ts`

**Interfaces:**
- Produces:
  - `enterMetrics(db, actorId, contentChannelId, { views, likes, comments, shares, clicks })`: สิทธิ์ `metrics`; ค่าติดลบ → error; เก็บเป็นแถวของวันนี้ (เวลาไทย) `source='manual'`
  - `latestMetrics(rows)`: ค่าล่าสุดต่อ contentChannel
  - `summarize(rows, range: { from: Date; to: Date }): { views; engagement; er; count; bySource: { api; manual; missing } }` โดย engagement = likes + comments + shares, er = engagement / views (views = 0 → 0)
  - `groupBy(rows, key: 'platform'|'workType'|'pillar')`
  - `bestTimes(rows): number[7][24]` ER เฉลี่ยตามวันในสัปดาห์ (จ.=0) × ชั่วโมง ตามเวลาไทยที่โพสต์
  - `toCsv(rows): string` (UTF-8 พร้อม BOM ให้ Excel อ่านภาษาไทยได้; escape `"`, `,`, ขึ้นบรรทัดใหม่)
  - หน้ารายงาน: ช่วง 7/30/90 วัน, ตัวเลขสรุป, กราฟรายวัน, แยกช่องทาง / ประเภทงาน / หมวด, heatmap ช่วงเวลา, ตารางรายคอนเทนต์พร้อมรูปย่อและป้ายที่มาข้อมูล, รายการ "ตัวเลขที่ยังขาด", ปุ่มดาวน์โหลด CSV

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: summarize ตัวอย่างที่คำนวณมือ; views 0 → er 0; `bestTimes` โพสต์ 2026-11-13T12:00Z ไปอยู่ ศ.(4) ชั่วโมง 19; `toCsv` ชื่อ `ลด 30%, "ทั้งร้าน"` ถูก escape และขึ้นต้นด้วย BOM; analyst กรอกได้, creator กรอกไม่ได้
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนโค้ด (กราฟเขียนเป็น SVG เองตามแบบ prototype ไม่ใช้ไลบรารีกราฟ)
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: reports, manual metrics and CSV export`

### Task 12: หน้าช่องทางพร้อมตัวช่วยเชื่อมต่อ

**Files:**
- Create: `src/channels/guides.ts`, `app/(app)/p/[projectId]/channels/page.tsx`, `components/connect-wizard.tsx`
- Test: `tests/unit/guides.test.ts`

**Interfaces:**
- Consumes: `CATALOG`, `PLATFORMS`
- Produces:
  - `GUIDES: Record<Platform, { prepare: string[] /*เช็กลิสต์ก่อนเริ่ม*/; steps: { title: string; body: string }[] /*5 ขั้นตามสเปก 8.7*/; canDo: string[]; cannotDo: string[]; troubleshooting: { q: string; a: string }[]; settingsUrl: string; availability: 'coming_soon'|'manual_only'; waitingFor?: string }>`
  - การ์ดช่องทาง: สถานะ, ได้/บางส่วน/ไม่ได้ (โพสต์, ดึงสถิติ), ปุ่ม "เชื่อมต่อ" เปิด wizard; ระยะ 1 wizard แสดงขั้น "เตรียมก่อนเริ่ม" ครบ และขั้นล็อกอินแสดง "เร็วๆ นี้ · รอ {waitingFor}"; lemon8 แสดง "ไม่ต้องเชื่อมต่อ"
  - ข้อความในคู่มือเขียนสำหรับคนไม่เขียนโค้ด ตรวจกับเอกสารล่าสุดของแพลตฟอร์มตอนเขียน

- [ ] **Step 1: เขียน test ที่ล้มเหลว**: ทุก platform มี guide; ทุก guide ที่ `coming_soon` มี `prepare.length >= 2`, `steps.length === 5`, `troubleshooting.length >= 2`, `waitingFor`; lemon8 เป็น `manual_only`
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนเนื้อหาและหน้าเว็บ (ปุ่มเชื่อมต่อแสดงเฉพาะคนที่มีสิทธิ์ `channels`)
- [ ] **Step 4:** รัน → PASS
- [ ] **Step 5:** Commit `feat: channels page with connection guides`

### Task 13: Docker, คู่มือขึ้นเซิร์ฟเวอร์ และทดสอบทั้งระบบ

**Files:**
- Create: `Dockerfile` (multi-stage, Next standalone; image เดียวรันได้ทั้ง `web` และ `worker`), `app/api/health/route.ts`, `docs/deploy.md`, `e2e/happy-path.spec.ts`, `playwright.config.ts`
- Modify: `README.md` (วิธีรันในเครื่อง, ลิงก์คู่มือ deploy), `docker-compose.yml` (เพิ่ม web + worker)

**Interfaces:**
- Produces: `GET /api/health` → `200 {"ok":true,"db":true}`; คำสั่ง migrate ตอนเริ่ม container (`node dist/migrate.js` ก่อน `server.js`)

- [ ] **Step 1: เขียน e2e** `e2e/happy-path.spec.ts` (Playwright ใช้ Chromium ที่ติดตั้งไว้ `executablePath: '/opt/pw-browsers/chromium'` เมื่อมี): สมัครคนแรก → สร้างโปรเจกต์ → สร้างคอนเทนต์พร้อมอัปโหลด `tests/fixtures/sample.jpg` → เห็นรูปย่อในคลังและปฏิทิน → ส่งอนุมัติ → อนุมัติ → เผยแพร่ → แท็บต้องโพสต์เองมีงาน → วางลิงก์ปิดงาน → กรอกตัวเลข → รายงานแสดงยอดวิวที่กรอก; สมัครคนที่สองแล้วเห็นหน้ารอแอดมิน
- [ ] **Step 2:** รัน `npm run e2e` → FAIL จนกว่าทุกส่วนเชื่อมกัน; แก้จนผ่าน
- [ ] **Step 3:** เขียน Dockerfile และ health route; `docker compose up` ถ้า Docker ใช้ได้ ไม่งั้นรัน `npm run build && npm start` + `npm run worker` แล้ว `curl localhost:3000/api/health` → `{"ok":true,"db":true}`
- [ ] **Step 4:** เขียน `docs/deploy.md` ภาษาไทยทีละขั้นสำหรับ **Hostinger VPS** (เลือกแผน, ติดตั้ง Docker, `docker-compose.prod.yml` รัน web + worker + postgres + caddy สำหรับ HTTPS, ตั้งโดเมน, GitHub Actions `.github/workflows/deploy.yml` ssh เข้าไป `git pull && docker compose up -d --build` เมื่อ push เข้า `main`, สำรองฐานข้อมูลรายวันด้วย cron `pg_dump` เก็บ 7 วัน); ตาราง env ทั้งหมดจาก `.env.example`
- [ ] **Step 5:** รัน `TZ=UTC npm test && npm run build && npm run e2e` → ผ่านทั้งหมด
- [ ] **Step 6:** Commit `chore: docker, deploy guide and end-to-end test`
