# ตั้งค่า Supabase Database

โปรเจกต์ production: `https://novdkkhgztlskcnjzott.supabase.co`  
เว็บ: [https://taskimon.vercel.app](https://taskimon.vercel.app)

## 1. สร้างโปรเจกต์ Supabase

1. ไปที่ [https://supabase.com](https://supabase.com) → New Project
2. จด **Project URL** และ **anon public key** (หรือ publishable key รูปแบบ `sb_publishable_...`)

## 2. สร้างไฟล์ `.env`

คัดลอกจาก `.env.example`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # หรือ sb_publishable_...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

สำหรับ build production (Electron / Vercel) ใช้ `.env.production` ใน repo — มีเฉพาะ public keys

## 3. รัน SQL Migrations

ใน Supabase Dashboard → **SQL Editor** → รันตามลำดับ:

1. [`001_initial.sql`](migrations/001_initial.sql)
2. [`002_player_activity.sql`](migrations/002_player_activity.sql)
3. [`003_reset_delete_policies.sql`](migrations/003_reset_delete_policies.sql)
4. [`004_system_reset_delete_policies.sql`](migrations/004_system_reset_delete_policies.sql)
5. [`005_fix_reset_all_game_data_where.sql`](migrations/005_fix_reset_all_game_data_where.sql)
6. [`006_reset_all_game_data_bootstrap.sql`](migrations/006_reset_all_game_data_bootstrap.sql)
7. [`008_last_daily_mission_day.sql`](migrations/008_last_daily_mission_day.sql)
8. [`009_friendships_unique_pair.sql`](migrations/009_friendships_unique_pair.sql)

## 4. เปิด Email Auth

Dashboard → **Authentication** → **Providers** → เปิด **Email**

(ถ้าต้องการทดสอบเร็ว: ปิด "Confirm email" ใน Auth settings)

## 5. ตั้ง Auth URL สำหรับ Web

ไปที่ [Authentication → URL Configuration](https://supabase.com/dashboard/project/novdkkhgztlskcnjzott/auth/url-configuration)

| ช่อง | ค่า |
|------|-----|
| **Site URL** | `https://taskimon.vercel.app` |
| **Redirect URLs** | `https://taskimon.vercel.app/**` |
| (dev) | `http://localhost:5174/**` |

Preview deploy บน Vercel (ถ้าใช้): `https://*-kittanet.vercel.app/**`

จำเป็นสำหรับยืนยันอีเมล / OAuth — `signInWithPassword` มักใช้ได้แม้ยังไม่ตั้ง แต่ควรตั้งให้ครบก่อน deploy

> **สถานะ:** ตั้งค่าแล้ว — login ที่ [taskimon.vercel.app](https://taskimon.vercel.app) ใช้งานได้

## 6. รันแอป

**Desktop:**

```bash
npm run dev
```

**Web (dev):**

```bash
npm run dev:web   # http://localhost:5174
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
- **ยังไม่ login** → ใช้ไฟล์ `pet-save.json` ในเครื่อง (desktop) หรือ `localStorage` (web)
- **Login ครั้งแรก** → ย้ายข้อมูล local ขึ้น DB อัตโนมัติ
