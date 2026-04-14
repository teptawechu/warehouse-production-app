# Warehouse Project (KLL / WLMA Stock)

ระบบคลังอุปกรณ์ซ่อมท่อน้ำแบบพร้อมใช้งานจริง (`Frontend + Backend + MySQL`) สำหรับงาน:
- เบิกสินค้าให้กองงาน
- คืนสินค้าจากกองงาน
- คืนสินค้าจาก WLMA
- กระทบยอดจากไฟล์ Excel (2 โหมด: `กองงาน` และ `WLMA`)

เอกสารนี้สรุปให้ครบสำหรับ:
- ติดตั้งและเริ่มใช้งาน
- ตรวจสอบระบบก่อนขึ้น production
- ทดสอบระบบด้วยข้อมูลจริง/ข้อมูลสุ่ม
- แก้ปัญหาที่เจอบ่อยตอน deploy

## 1) สถาปัตยกรรมระบบ

- `frontend/` หน้าเว็บ (HTML/CSS/JS + Bootstrap, ไม่มี build step)
- `backend/` API (Node.js + Express)
- `backend/db/schema.sql` โครงสร้างฐานข้อมูลหลัก
- `docker-compose.yml` สำหรับรัน `MySQL + API`

หมายเหตุ: ระบบนี้เสิร์ฟ frontend ผ่าน backend โดยตรง เปิดใช้งานที่ `http://localhost:5000` ได้ทันที

## 2) ฟีเจอร์หลักที่มีในระบบ

- Login / session ด้วย JWT
- จัดการสินค้า + stock ต่อคลัง
- ดู stock ย้อนหลังตามเวลา (`as_of`)
- ดูจำนวนเคลื่อนไหวของสินค้าในวันนี้
- จัดการกองงาน (เพิ่ม/แก้ไข/ลบ เมื่อไม่มีบิลผูกอยู่)
- จัดการบิลคลัง 3 ประเภท
- ยกเลิกบิล / กู้คืนบิล / ลบถาวร (ตามสิทธิ์)
- หน้า Bills แบบ 2 panel (รายการ + รายละเอียด) และปรับสัดส่วนด้วย drag ได้
- กระทบยอด Excel โหมดกองงาน (legacy)
- กระทบยอด Excel โหมด WLMA
- Export Excel ได้ตามโหมด
- Audit log
- สิทธิ์ผู้ใช้ 3 ระดับ (`ADMIN`, `STOREKEEPER`, `VIEWER`)

## 3) ความต้องการระบบ (Prerequisites)

- Node.js 22+ (แนะนำ LTS ล่าสุด)
- MySQL Community Server 8.0+ (ฟรี)
- npm (มากับ Node.js)
- Git (แนะนำ)
- (ทางเลือก) Docker Desktop ถ้าจะใช้ `docker compose`

## 4) ติดตั้งและรันแบบ Local (แนะนำ)

### 4.1 ติดตั้ง dependencies

```powershell
cd C:\Users\stopp\Desktop\warehouse-project\backend
npm install
```

### 4.2 ตั้งค่า environment

```powershell
copy .env.example .env
```

แก้ค่าในไฟล์ `backend/.env` ให้ตรงกับ MySQL เครื่องจริง โดยเฉพาะ:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME` (ค่าเริ่มต้นคือ `warehouse_app`)

### 4.3 สร้างฐานข้อมูลและตาราง

```powershell
npm run db:init
```

### 4.4 seed ข้อมูลตั้งต้น

```powershell
npm run seed:all
```

สิ่งที่ได้:
- คลังเริ่มต้น `WH01`
- กองงานเริ่มต้น `KLL01-KLL30`, `HK01-HK10`
- ผู้ใช้แอดมินเริ่มต้นตามค่าใน `.env`

### 4.5 import master สินค้าจาก Excel

```powershell
npm run seed:excel -- "D:/Dowloads_2/MaterialPrice_2567_table_full.xlsx"
```

### 4.6 เพิ่ม index สำหรับงานจริง (แนะนำมาก)

```powershell
npm run db:indexes
```

### 4.7 รันระบบ

```powershell
npm run dev
```

เปิดเว็บที่:
- `http://localhost:5000`

## 5) รันแบบ Docker Compose

```powershell
cd C:\Users\stopp\Desktop\warehouse-project
docker compose up -d --build
```

จากนั้นเข้า container API หรือรันจากเครื่องเพื่อ import Excel เพิ่ม:

```powershell
cd C:\Users\stopp\Desktop\warehouse-project\backend
npm install
npm run seed:excel -- "D:/Dowloads_2/MaterialPrice_2567_table_full.xlsx"
```

หมายเหตุ: ควรแก้ค่ารหัสผ่าน/secret ใน `docker-compose.yml` ก่อนใช้จริง

## 6) บัญชีเริ่มต้น

ค่าเริ่มต้นจาก `.env.example`:
- Username: `admin01`
- Password: `admin123`
- Display Name: `Main Admin`

ค่าเหล่านี้ถูกใช้ตอนรัน `npm run seed:admin` หรือ `npm run seed:all`

## 7) Environment Variables

ไฟล์: `backend/.env`

| Variable | ตัวอย่าง | ความหมาย |
|---|---|---|
| `NODE_ENV` | `development`/`production` | โหมดรัน |
| `PORT` | `5000` | พอร์ต API+Frontend |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | ผู้ใช้ฐานข้อมูล |
| `DB_PASSWORD` | `your_password` | รหัสผ่านฐานข้อมูล |
| `DB_NAME` | `warehouse_app` | ชื่อฐานข้อมูล |
| `DB_CONN_LIMIT` | `12` | connection pool size |
| `JWT_SECRET` | `long-random-secret` | secret สำหรับ token |
| `JWT_EXPIRES_IN` | `12h` | อายุ token |
| `CORS_ORIGIN` | `http://localhost:5000` | origin ที่อนุญาต (คั่น comma ได้) |
| `ADMIN_USERNAME` | `admin01` | แอดมินเริ่มต้น |
| `ADMIN_PASSWORD` | `admin123` | รหัสผ่านแอดมินเริ่มต้น |
| `ADMIN_DISPLAY_NAME` | `Main Admin` | ชื่อแสดงผลแอดมินเริ่มต้น |
| `ENABLE_TEST_SEED_API` | `false` | เปิด/ปิด API สร้างบิลปลอม (ควร `false` บน production) |
| `TEST_SEED_API_KEY` | `your-strong-key` | คีย์สำหรับเรียก test seed API ผ่าน header `x-seed-key` |

## 8) กฎธุรกิจสำคัญที่ระบบใช้อยู่

- `Bill No` format: `KLLDDMMYYXXX`
- `XXX` วิ่งจาก `000-999` ตามลำดับในวันเดียวกัน
- ประเภทบิล:
- `ISSUE_TO_TEAM` = เบิกให้กองงาน
- `RETURN_FROM_TEAM` = คืนจากกองงาน
- `RETURN_FROM_WLMA` = คืนจาก WLMA
- บิลประเภท `RETURN_FROM_WLMA` จะบังคับผู้ส่ง (`sender_name`) เป็น `WLMA`
- ยกเลิกบิลต้องมีเหตุผล (`reason`) อย่างน้อย 1 ตัวอักษร
- ลบถาวรบิลได้เฉพาะบิลที่ `CANCELLED` และเฉพาะ `ADMIN`
- ปรับ stock manual (`adjust stock`) ต้องใส่หมายเหตุ (`remark`) และผู้บันทึกจะถูกใช้จากบัญชีที่ login

## 9) สิทธิ์ผู้ใช้ (Role Matrix)

| ฟังก์ชัน | ADMIN | STOREKEEPER | VIEWER |
|---|---|---|---|
| ดู Dashboard/Products/WorkUnits/Bills | ✅ | ✅ | ✅ |
| สร้าง/แก้สินค้า + ปรับ stock | ✅ | ✅ | ❌ |
| สร้าง/แก้/ลบกองงาน | ✅ | ดูได้ | ดูได้ |
| สร้าง/ยืนยัน/ยกเลิก/กู้คืนบิล | ✅ | ✅ | ❌ |
| ลบถาวรบิล | ✅ | ❌ | ❌ |
| Reconcile + Export | ✅ | ✅ | ❌ |
| Audit Log | ✅ | ✅ | ❌ |
| จัดการ Users | ✅ | ❌ | ❌ |

## 10) การใช้งาน Reconcile (สำคัญ)

รองรับ 2 โหมด:
- `legacy` = กระทบยอดกองงาน
- `wlma` = กระทบยอด WLMA

### 10.1 โหมดกระทบยอดกองงาน (`legacy`)

อ่านจากไฟล์ Excel (sheet แรก) โดยยึดคอลัมน์:
- ทีม: คอลัมน์ `I`
- รหัสวัสดุ WLMA (9 หลัก): คอลัมน์ `J`
- รายการ: คอลัมน์ `K`
- จำนวนระบบ: คอลัมน์ `L`

ระบบจะรวมข้อมูลและ export ได้ 3 แบบ:
- `source` → `_TEAM_01_SOURCE.xlsx`
- `dataset` → `_TEAM_02_DATASET.xlsx`
- `diff` → `_TEAM_03_RECONCILE.xlsx`

### 10.2 โหมด WLMA (`wlma`)

อ่านจากไฟล์ Excel (sheet แรก) โดยยึดคอลัมน์:
- รหัสวัสดุ WLMA: `J`
- จำนวนระบบ: `L`
- สถานะใบเบิก: `S`

เงื่อนไขสถานะ:
- `"ส่งไป CIS แล้ว"` จะถูกนับเป็นยอดระบบตั้งต้น
- `"ยังไม่ส่งไป CIS"` จะถูกนับแยกเป็น pending

ระบบจะดึงข้อมูลคืนจากฐานข้อมูลเฉพาะบิลประเภท `RETURN_FROM_WLMA` แล้ว export ได้ 3 แบบ:
- `source` → `_WLMA_01_SOURCE.xlsx`
- `dataset` → `_WLMA_02_RETURNS.xlsx`
- `diff` → `_WLMA_03_RECONCILE.xlsx`

ข้อจำกัด upload:
- ขนาดไฟล์สูงสุด `80MB`

## 11) API หลักที่ใช้บ่อย

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `POST` | `/api/auth/login` | login |
| `GET` | `/api/auth/me` | ข้อมูล session ปัจจุบัน |
| `GET` | `/api/health` | health check |
| `GET` | `/api/products` | รายการสินค้า (รองรับ `warehouse_id`, `status`, `search`, `as_of`) |
| `POST` | `/api/products` | สร้างสินค้า |
| `PATCH` | `/api/products/:id` | แก้สินค้า |
| `POST` | `/api/products/:id/adjust-stock` | ปรับ stock manual |
| `GET` | `/api/teams` | รายการกองงาน |
| `POST` | `/api/teams` | สร้างกองงาน (ADMIN) |
| `PATCH` | `/api/teams/:id` | แก้กองงาน (ADMIN) |
| `DELETE` | `/api/teams/:id` | ลบกองงาน (ADMIN, เฉพาะไม่มีบิลผูก) |
| `GET` | `/api/teams/:id/issues` | ดูรายการเบิกของกองงานตามช่วงเวลา |
| `GET` | `/api/bills` | รายการบิล (รองรับ pagination/filter/date) |
| `GET` | `/api/bills/:id` | รายละเอียดบิล 1 ใบ |
| `POST` | `/api/bills` | สร้างบิล |
| `POST` | `/api/bills/:id/confirm` | ยืนยันบิล |
| `POST` | `/api/bills/:id/cancel` | ยกเลิกบิล |
| `POST` | `/api/bills/:id/restore` | กู้คืนบิลที่ถูกยกเลิก |
| `DELETE` | `/api/bills/:id/permanent` | ลบถาวรบิลที่ยกเลิกแล้ว |
| `POST` | `/api/reconcile/upload` | อัปโหลดไฟล์กระทบยอด |
| `POST` | `/api/reconcile/export` | export Excel ตามโหมด |
| `GET` | `/api/reconcile/runs` | ประวัติกระทบยอด |
| `GET` | `/api/reconcile/runs/:id` | รายละเอียดรันกระทบยอด |
| `GET` | `/api/audits` | audit log |

## 12) สร้างข้อมูลบิลปลอมสำหรับเทส

สร้างบิลสุ่ม:

```powershell
cd C:\Users\stopp\Desktop\warehouse-project\backend
npm run seed:test:bills -- --warehouse 1 --count 120 --items 15 --from 2025-10-01 --to 2026-04-14
```

รายละเอียด:
- สุ่มกองงาน
- สุ่มทั้ง 3 ประเภทบิล
- ใน 1 บิลมีหลายรายการสินค้า
- สุ่มช่วงวันที่ให้
- ใส่ tag ใน `remarks` ด้วย prefix `[AUTO_TEST_RANDOM]`

ลบข้อมูลปลอม:

```powershell
npm run cleanup:test:bills -- --dry-run true
npm run cleanup:test:bills
```

## 13) วิธีลบบิลปลอมทั้งหมดและ reset `bill_id`

ใช้เมื่อแน่ใจว่าจะล้างข้อมูลบิลทั้งหมด (ไม่ควรทำบน production ที่มีข้อมูลจริง):

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE bill_items;
TRUNCATE TABLE bills;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE bills AUTO_INCREMENT = 1;
ALTER TABLE bill_items AUTO_INCREMENT = 1;
ALTER TABLE stock_movements AUTO_INCREMENT = 1;
```

ถ้าต้องการล้าง log ที่เกี่ยวกับบิลด้วย:

```sql
DELETE FROM audit_logs WHERE entity = 'bills';
```

## 14) เช็กลิสต์ก่อนขึ้น Deploy (Production Readiness)

### 14.1 Security

- เปลี่ยน `JWT_SECRET` เป็นค่าที่สุ่มยาวและปลอดภัย
- เปลี่ยนรหัสผ่าน admin เริ่มต้น
- จำกัด `CORS_ORIGIN` ให้เป็นโดเมนจริงเท่านั้น
- เปิดใช้ HTTPS ผ่าน reverse proxy

### 14.2 Database

- ยืนยันว่าใช้ `utf8mb4` ทั้งฐานข้อมูลและตาราง
- รัน `npm run db:indexes` แล้ว
- ตั้งระบบ backup (รายวันอย่างน้อย)
- ทดสอบ restore backup จริง 1 รอบ

### 14.3 App/Infra

- ตั้ง `NODE_ENV=production`
- เปิด service ให้ restart อัตโนมัติ (PM2/systemd/Docker restart policy)
- เช็กว่า port `5000` และ `3306` ไม่ชนกับ service อื่น
- เช็ก resource เครื่องเพียงพอ (RAM/CPU/Disk)

### 14.4 Functional smoke test

- เข้า `/api/health` แล้วได้ `{ "ok": true }`
- login ด้วย admin ได้
- ดูหน้า Products / Work Units / Bills / Reconcile ได้ครบ
- สร้างบิลทั้ง 3 ประเภท + confirm ได้
- cancel / restore / permanent delete ทำงานตามสิทธิ์
- Reconcile โหมด `legacy` และ `wlma` upload + export ได้ครบ
- ทดสอบ role `VIEWER` ว่าเข้า Reconcile/Audit ไม่ได้
- ภาษาไทยใน UI และไฟล์ export แสดงผลถูกต้อง

## 15) เช็กลิสต์หลัง Deploy (UAT / Go-live)

- ทดสอบจาก URL จริง (ไม่ใช่ localhost)
- เช็กเวลาในระบบตรง timezone ที่ต้องใช้
- ตรวจว่า Bill No ออกต่อเนื่องรูปแบบ `KLLDDMMYYXXX`
- เช็ก stock ไม่ติดลบผิดเงื่อนไข
- เช็กการ export Excel จากข้อมูลจริงอย่างน้อย 1 รอบ
- ตรวจ Audit log ว่าบันทึก action สำคัญครบ

## 16) ปัญหาที่เจอบ่อยและวิธีแก้

### `ER_ACCESS_DENIED_ERROR`

สาเหตุ: user/password ใน `.env` ไม่ตรงกับ MySQL  
วิธีแก้: แก้ `DB_USER`, `DB_PASSWORD` ให้ตรง แล้วรันใหม่

### `ECONNREFUSED 127.0.0.1:3306`

สาเหตุ: MySQL ยังไม่รันหรือพอร์ตไม่ตรง  
วิธีแก้: เปิด service MySQL และตรวจ `DB_PORT`

### `'mysql' is not recognized`

สาเหตุ: ยังไม่ได้เพิ่ม MySQL client ลง PATH  
วิธีแก้: ใช้ MySQL Workbench Query แทน หรือเพิ่ม path ของ `mysql.exe` ใน Environment Variables

### `MulterError: File too large`

สาเหตุ: ไฟล์เกิน `80MB`  
วิธีแก้: ลดขนาดไฟล์หรือแยกไฟล์ก่อนอัปโหลด

### ภาษาไทยเพี้ยน (mojibake)

เช็ก:
- ไฟล์โค้ดต้องเป็น UTF-8
- DB/table/collation เป็น `utf8mb4`
- client/connection ของ MySQL ใช้ utf8mb4

## 17) คำสั่งใช้งานรวบยอด

```powershell
cd C:\Users\stopp\Desktop\warehouse-project\backend
npm install
copy .env.example .env
npm run db:init
npm run seed:all
npm run seed:excel -- "D:/Dowloads_2/MaterialPrice_2567_table_full.xlsx"
npm run db:indexes
npm run dev
```

เปิดใช้งาน:
- [http://localhost:5000](http://localhost:5000)

## 18) คำสั่งเช็คก่อน Deploy (แนะนำ)

```powershell
cd C:\Users\stopp\Desktop\warehouse-project\backend
npm run check
npm run db:indexes
```

เช็ค health:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health
```

หมายเหตุ:
- โปรเจกต์นี้ยังไม่มี automated test suite (unit/integration)
- ควรใช้ checklist ในหัวข้อ 14 และ 15 เป็นหลักก่อนขึ้น production

## 19) Test Seed API (สร้าง/ล้างบิลปลอมผ่าน API)

เปิดใช้ก่อน (ค่าเริ่มต้นปิดไว้):

```env
ENABLE_TEST_SEED_API=true
TEST_SEED_API_KEY=your-strong-key
```

ข้อแนะนำ production:
- ปกติควรคง `ENABLE_TEST_SEED_API=false`
- เปิดเฉพาะช่วงทดสอบ, ใส่ `TEST_SEED_API_KEY` ที่เดายาก, และปิดกลับทันทีหลังเทสเสร็จ

API ใหม่:
- `POST /api/bills/tools/seed-random`
- `POST /api/bills/tools/cleanup-random`

สิทธิ์:
- ใช้ได้เฉพาะ `ADMIN`
- ถ้าตั้ง `TEST_SEED_API_KEY` ต้องส่ง header `x-seed-key`

ตัวอย่างยิงบิลปลอม:

```powershell
$token = "Bearer <admin_jwt_token>"
$headers = @{
  Authorization = $token
  "x-seed-key" = "your-strong-key"
  "Content-Type" = "application/json"
}

$body = @{
  warehouse_id = 1
  count = 120
  items_per_bill = 15
  from = "2026-01-01"
  to = "2026-04-14"
  tag = "[AUTO_TEST_RANDOM]"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://warehousekll-production.up.railway.app/api/bills/tools/seed-random" -Headers $headers -Body $body
```

ตัวอย่างล้างบิลปลอม:

```powershell
$token = "Bearer <admin_jwt_token>"
$headers = @{
  Authorization = $token
  "x-seed-key" = "your-strong-key"
  "Content-Type" = "application/json"
}

# dry run
Invoke-RestMethod -Method Post -Uri "https://warehousekll-production.up.railway.app/api/bills/tools/cleanup-random" -Headers $headers -Body (@{ tag="[AUTO_TEST_RANDOM]"; dry_run=$true } | ConvertTo-Json)

# cleanup จริง
Invoke-RestMethod -Method Post -Uri "https://warehousekll-production.up.railway.app/api/bills/tools/cleanup-random" -Headers $headers -Body (@{ tag="[AUTO_TEST_RANDOM]"; dry_run=$false } | ConvertTo-Json)
```
