# ตั้งค่า Supabase Database

## 1. สร้างโปรเจกต์ Supabase

1. ไปที่ [https://supabase.com](https://supabase.com) → New Project
2. จด **Project URL** และ **anon public key**

## 2. สร้างไฟล์ `.env`

คัดลอกจาก `.env.example`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 3. รัน SQL Migrations

ใน Supabase Dashboard → **SQL Editor** → รันตามลำดับ:

1. [`supabase/migrations/001_initial.sql`](migrations/001_initial.sql)
2. [`supabase/migrations/002_player_activity.sql`](migrations/002_player_activity.sql)

## 4. เปิด Email Auth

Dashboard → **Authentication** → **Providers** → เปิด **Email**

(ถ้าต้องการทดสอบเร็ว: ปิด "Confirm email" ใน Auth settings)

## 6. ตั้ง Auth URL สำหรับ Web (Vercel)

หลัง deploy ที่ `https://taskimon.vercel.app` ไปที่:

[Authentication → URL Configuration](https://supabase.com/dashboard/project/novdkkhgztlskcnjzott/auth/url-configuration)

| ช่อง | ค่า |
|------|-----|
| **Site URL** | `https://taskimon.vercel.app` |
| **Redirect URLs** | `https://taskimon.vercel.app/**` |
| (dev) | `http://localhost:5174/**` |

Preview deploy บน Vercel (ถ้าใช้): `https://*-kittanet.vercel.app/**`

จำเป็นสำหรับยืนยันอีเมล / OAuth — login ด้วยรหัสผ่าน (`signInWithPassword`) มักใช้ได้แม้ยังไม่ตั้ง แต่ควรตั้งให้ครบ

## 7. รันแอป

```bash
npm run dev
```

→ แท็บ **บัญชี** → สมัคร/เข้าสู่ระบบ

## ตารางในฐานข้อมูล

| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | ชื่อผู้ใช้, รหัสเพื่อน |
| `pets` | สัตว์เลี้ยง (ธาตุ, stage, HP, อารมณ์, พัฒนาร่าง) |
| `player_activity` | คลิก, พิมพ์, เวลาเล่น, ภารกิจรายวัน |
| `inventory` | ไอเทม |
| `mission_progress` | ความคืบหน้าภารกิจ |
| `friendships` | เพื่อน |
| `messages` | แชท |
| `battles` | ประวัติต่อสู้ |

## การทำงาน

- **Login แล้ว** → โหลดข้อมูลจาก DB, บันทึกอัตโนมัติทุก ~1.5 วินาที
- **ยังไม่ login** → ใช้ไฟล์ `pet-save.json` ในเครื่อง (offline cache)
- **Login ครั้งแรก** → ย้ายข้อมูล local ขึ้น DB อัตโนมัติ
