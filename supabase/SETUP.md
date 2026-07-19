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

ใน Supabase Dashboard → **SQL Editor** → รัน**ทุกไฟล์**ใน `supabase/migrations/` ตามลำดับชื่อไฟล์  
หรือใช้ CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### รายการไฟล์ (สรุป)

| ช่วง | เนื้อหาหลัก |
|---|---|
| `001`–`009` | schema เริ่มต้น, activity, reset policies, missions, friendships |
| `010`–`015` | battle rooms / sessions / energy / cleanup |
| `016`–`018` | birth_date legacy reset → ปิดภายหลัง; ลบธาตุเก่าบน dino |
| `019`–`025` | chat rooms, collection slots, spawn |
| `026` | ปิด RPC รีเซ็ตรหัสเป็นวันเกิด |
| `027` | quick item slots |
| `028`–`030` | minigame scores / state; creature ember-sail / garden |
| `032`–`036` | gems, gifts, battle actions expanded, claim gifts |
| `037`–`038` | active pet id + cloud save |
| `039`–`043` | drop/clear reset helpers, signup availability, battle shield |
| **`044`** | **RPG:** rename care → `health`/`emotion`/`evolution`; STR/DEX/INT/CON; skill loadout; growth offers; battle Attack/Skill/Item/Defend/Flee; **`breed_pets`** |
| **`045`** | **ชั่วคราว:** `breed_pets` บังคับธาตุ pure (คู่กับ `FORCE_PURE_ELEMENTS` ใน client) |

รายการไฟล์ทั้งหมด:

1. [`001_initial.sql`](migrations/001_initial.sql)
2. [`002_player_activity.sql`](migrations/002_player_activity.sql)
3. [`003_reset_delete_policies.sql`](migrations/003_reset_delete_policies.sql)
4. [`004_system_reset_delete_policies.sql`](migrations/004_system_reset_delete_policies.sql)
5. [`005_fix_reset_all_game_data_where.sql`](migrations/005_fix_reset_all_game_data_where.sql)
6. [`006_reset_all_game_data_bootstrap.sql`](migrations/006_reset_all_game_data_bootstrap.sql)
7. [`008_last_daily_mission_day.sql`](migrations/008_last_daily_mission_day.sql)
8. [`009_friendships_unique_pair.sql`](migrations/009_friendships_unique_pair.sql)
9. [`010_battle_sessions.sql`](migrations/010_battle_sessions.sql)
10. [`011_rename_nature_to_neutral.sql`](migrations/011_rename_nature_to_neutral.sql)
11. [`012_fix_battle_rls.sql`](migrations/012_fix_battle_rls.sql)
12. [`013_battle_energy.sql`](migrations/013_battle_energy.sql)
13. [`014_reset_battle_rooms.sql`](migrations/014_reset_battle_rooms.sql)
14. [`015_remove_battle_challenge.sql`](migrations/015_remove_battle_challenge.sql)
15. [`016_birth_date_password_reset.sql`](migrations/016_birth_date_password_reset.sql)
16. [`017_delete_accounts_without_birth_date.sql`](migrations/017_delete_accounts_without_birth_date.sql)
17. [`018_remove_elements_dino_characters.sql`](migrations/018_remove_elements_dino_characters.sql)
18. [`019_chat_rooms.sql`](migrations/019_chat_rooms.sql)
19. [`020_chat_room_fix_get_members.sql`](migrations/020_chat_room_fix_get_members.sql)
20. [`021_chat_room_fix_ambiguous_gender.sql`](migrations/021_chat_room_fix_ambiguous_gender.sql)
21. [`022_db_audit_cleanup.sql`](migrations/022_db_audit_cleanup.sql)
22. [`023_drop_legacy_rls_cleanup.sql`](migrations/023_drop_legacy_rls_cleanup.sql)
23. [`024_pet_collection_slots.sql`](migrations/024_pet_collection_slots.sql)
24. [`025_chat_room_random_spawn.sql`](migrations/025_chat_room_random_spawn.sql)
25. [`026_disable_birth_date_password_reset.sql`](migrations/026_disable_birth_date_password_reset.sql)
26. [`027_quick_item_slots.sql`](migrations/027_quick_item_slots.sql)
27. [`028_minigame_scores.sql`](migrations/028_minigame_scores.sql)
28. [`029_creature_ember_sail.sql`](migrations/029_creature_ember_sail.sql)
29. [`030_creature_garden.sql`](migrations/030_creature_garden.sql)
30. [`030_minigame_state.sql`](migrations/030_minigame_state.sql)
31. [`032_gems.sql`](migrations/032_gems.sql)
32. [`033_gifts.sql`](migrations/033_gifts.sql)
33. [`034_battle_actions_expanded.sql`](migrations/034_battle_actions_expanded.sql)
34. [`035_claim_pending_gifts.sql`](migrations/035_claim_pending_gifts.sql)
35. [`036_fix_claim_gifts_ambiguous.sql`](migrations/036_fix_claim_gifts_ambiguous.sql)
36. [`037_active_pet_id.sql`](migrations/037_active_pet_id.sql)
37. [`038_fix_active_pet_cloud_save.sql`](migrations/038_fix_active_pet_cloud_save.sql)
38. [`039_drop_reset_all_game_data.sql`](migrations/039_drop_reset_all_game_data.sql)
39. [`040_clear_my_data_gifts_scores.sql`](migrations/040_clear_my_data_gifts_scores.sql)
40. [`041_signup_availability_no_birthdate.sql`](migrations/041_signup_availability_no_birthdate.sql)
41. [`042_drop_unused_columns.sql`](migrations/042_drop_unused_columns.sql)
42. [`043_battle_shield_consume.sql`](migrations/043_battle_shield_consume.sql)
43. [`044_rpg_battle_stats_skills_breeding.sql`](migrations/044_rpg_battle_stats_skills_breeding.sql) — **RPG + breed**
44. [`045_force_pure_elements.sql`](migrations/045_force_pure_elements.sql) — **pure elements (ชั่วคราว)**
45. [`046_profiles_role.sql`](migrations/046_profiles_role.sql) — **admin/user roles + admin RPCs**

ตั้ง admin ด้วย SQL (หลังรัน 046):

```sql
update public.profiles set role = 'admin' where username = 'YOUR_NAME';
```

> **หมายเหตุ:** ไม่มีไฟล์ `007` / `031` ใน repo — ข้ามได้ตามรายการด้านบน

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
| `pets` | สัตว์เลี้ยง: care (`health`/`emotion`/`evolution`), ธาตุ, STR/DEX/INT/CON, skill loadout, growth offers, breeding cooldown |
| `player_activity` | คลิก, พิมพ์, เวลาเล่น, `evolution_this_hour`, ภารกิจรายวัน |
| `inventory` | ไอเทม (รวม nest / skill forget / battle shield ฯลฯ) |
| `mission_progress` | ความคืบหน้าภารกิจ |
| `friendships` | เพื่อน |
| `messages` | แชท |
| `gifts` | ของขวัญรอรับ |
| `minigame_scores` / state | คะแนนและสถานะมินิเกม |
| `battles` | ประวัติต่อสู้ (สรุปหลังจบดวล) |
| `battle_rooms` | ห้องต่อสู้ (รหัสห้อง, เจ้าของ, session ที่กำลังเล่น) |
| `battle_room_members` | สมาชิกในห้อง (สถานะ waiting / in_battle) |
| `battle_sessions` | ดวลที่กำลังเล่น (HP/MP/TP, ตาปัจจุบัน) |
| `battle_turns` | log แต่ละเทิร์น (+ `skill_id`) |

### คอลัมน์ RPG บน `pets` (ตั้งแต่ `044`)

| คอลัมน์ | ความหมาย |
|---|---|
| `health` / `emotion` / `evolution` | care (เดิม hp / mood / dev_points) |
| `element_primary` / `element_secondary` | ธาตุ (secondary เป็น null = pure) |
| `str` / `dex` / `int` / `con` | ค่าพลังหลัก |
| `skill_loadout` | JSON โหลดเอาต์สกิล |
| `skill_upgrade_points` | แต้มอัปแรงค์หลังเลเวลอัพ |
| `pending_growth_offers` | การ์ดเติบโตรอเลือก (กลุ่มละ 3) |
| `last_bred_at` | cooldown ผสมพันธุ์ |

## RPC สำคัญ

| RPC | ใช้ทำอะไร |
|---|---|
| `room_create` / `room_join` / `room_leave` | จัดการห้อง |
| `room_start_duel` | เจ้าของห้องเริ่มดวล 1v1 |
| `battle_submit_action` | Attack / Skill / Item / Defend / Flee |
| `battle_list_for_user` | รายการดวลของผู้เล่น |
| `breed_pets` | ผสมพันธุ์ → ได้ไข่ใหม่ (`045` บังคับ pure ชั่วคราว) |
| clear-my-data helpers | ล้างข้อมูลเกมของบัญชี (ดู migrations `039`–`040`) |

## การทำงาน

- **ยังไม่ login (desktop)** → สัตว์บนจอเป็นไข่, tray ไม่แสดง Health/คลิก/พิมพ์, ไม่นับ activity
- **Login แล้ว** → โหลดข้อมูลจาก DB, บันทึกอัตโนมัติทุก ~1.5 วินาที, แสดงสัตว์และสถิติจริง
- **ยังไม่ login** → ใช้ไฟล์ `pet-save.json` ในเครื่อง (desktop) หรือ `localStorage` (web) เป็น cache
- **Login ครั้งแรก** → ย้ายข้อมูล local ขึ้น DB อัตโนมัติ
- **เลเวลอัพ** → ได้ Growth Card offers + skill upgrade points (client + cloud save)
- **ล้างข้อมูลของฉัน** → ลบเกมของบัญชีตัวเอง (เก็บ login, เพื่อน, แชท)
