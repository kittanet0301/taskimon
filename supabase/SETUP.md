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
9. [`010_battle_sessions.sql`](migrations/010_battle_sessions.sql) — ห้องต่อสู้, sessions, turns, RPCs
10. [`011_rename_nature_to_neutral.sql`](migrations/011_rename_nature_to_neutral.sql) — ธาตุ `nature` → `neutral`
11. [`012_fix_battle_rls.sql`](migrations/012_fix_battle_rls.sql) — RLS recursion fix, SECURITY DEFINER RPCs
12. [`013_battle_energy.sql`](migrations/013_battle_energy.sql) — พลังท่าไม้ตาย 0–100%
13. [`014_reset_battle_rooms.sql`](migrations/014_reset_battle_rooms.sql) — ล้างระบบรวมห้องต่อสู้
14. [`015_remove_battle_challenge.sql`](migrations/015_remove_battle_challenge.sql)
15. [`016_birth_date_password_reset.sql`](migrations/016_birth_date_password_reset.sql) — วันเกิดบน profiles (legacy reset RPC)
16. [`017_delete_accounts_without_birth_date.sql`](migrations/017_delete_accounts_without_birth_date.sql)
17. [`018_remove_elements_dino_characters.sql`](migrations/018_remove_elements_dino_characters.sql)
18. [`019_chat_rooms.sql`](migrations/019_chat_rooms.sql) — ห้องแชท lobby
19. [`020_chat_room_fix_get_members.sql`](migrations/020_chat_room_fix_get_members.sql)
20. [`021_chat_room_fix_ambiguous_gender.sql`](migrations/021_chat_room_fix_ambiguous_gender.sql)
21. [`022_db_audit_cleanup.sql`](migrations/022_db_audit_cleanup.sql)
22. [`023_drop_legacy_rls_cleanup.sql`](migrations/023_drop_legacy_rls_cleanup.sql)
23. [`024_pet_collection_slots.sql`](migrations/024_pet_collection_slots.sql)
24. [`025_chat_room_random_spawn.sql`](migrations/025_chat_room_random_spawn.sql)
25. [`026_disable_birth_date_password_reset.sql`](migrations/026_disable_birth_date_password_reset.sql) — ปิด RPC รีเซ็ตรหัสเป็นวันเกิด

หรือใช้ Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

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

จำเป็นสำหรับยืนยันอีเมล / OAuth / recovery email — `signInWithPassword` มักใช้ได้แม้ยังไม่ตั้ง แต่ควรตั้งให้ครบก่อน deploy

> **สถานะ:** ตั้งค่าแล้ว — login ที่ [taskimon.vercel.app](https://taskimon.vercel.app) ใช้งานได้

## 6. ตั้ง SMTP และ rate limits

- Supabase built-in email provider เหมาะกับการทดลองเท่านั้น
- ถ้าจะใช้ **Forgot password** หรือ email confirmations จริง ควรตั้ง **Custom SMTP**
- ตรวจค่าจำกัดการส่งอีเมลและ recovery cooldown ได้ที่ **Authentication → Rate Limits**

## 7. รันแอป

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
| `battles` | ประวัติต่อสู้ (สรุปหลังจบดวล) |
| `battle_rooms` | ห้องต่อสู้ (รหัสห้อง, เจ้าของ, session ที่กำลังเล่น) |
| `battle_room_members` | สมาชิกในห้อง (สถานะ waiting / in_battle) |
| `battle_sessions` | ดวลที่กำลังเล่น (HP, พลังท่าไม้ตาย, ตาปัจจุบัน) |
| `battle_turns` | log แต่ละเทิร์น |

## RPC สำคัญ (ต่อสู้)

| RPC | ใช้ทำอะไร |
|---|---|
| `room_create` / `room_join` / `room_leave` | จัดการห้อง |
| `room_start_duel` | เจ้าของห้องเริ่มดวล 1v1 |
| `battle_submit_action` | โจมตี / ป้องกัน / หลบหนี / ท่าไม้ตาย |
| `battle_list_for_user` | รายการดวลของผู้เล่น |
| `reset_all_game_data` | ล้างระบบ (รวมห้องต่อสู้ + sessions) |

## การทำงาน

- **ยังไม่ login (desktop)** → สัตว์บนจอเป็นไข่, tray ไม่แสดง HP/คลิก/พิมพ์, ไม่นับ activity
- **Login แล้ว** → โหลดข้อมูลจาก DB, บันทึกอัตโนมัติทุก ~1.5 วินาที, แสดงสัตว์และสถิติจริง
- **ยังไม่ login** → ใช้ไฟล์ `pet-save.json` ในเครื่อง (desktop) หรือ `localStorage` (web) เป็น cache
- **Login ครั้งแรก** → ย้ายข้อมูล local ขึ้น DB อัตโนมัติ
- **ล้างข้อมูลของฉัน** → ลบเกมของบัญชีตัวเอง (เก็บ login, เพื่อน, แชท)
- **ล้างระบบ** → ลบเกมทุกคน + ห้องต่อสู้ (เก็บ login, เพื่อน, แชท) — ต้องใส่ PIN
