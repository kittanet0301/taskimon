# Taskimon

Tamagotchi-style desktop pet game with elemental RPG — desktop (Electron) + web.

**เวอร์ชันเว็บ (production):** [https://taskimon.vercel.app](https://taskimon.vercel.app)

## Features

- Transparent always-on-top pet window on desktop
- **ก่อน login:** สัตว์แสดงเป็นไข่, tray ไม่โชว์สถิติ — **หลัง login** โหลดสัตว์จริงจาก cloud
- Random egg hatch → species, element (5 types), gender
- Growth: Egg → Baby → Adult
- Stats: HP, mood, development points
- Global click/keyboard activity tracking for development (desktop, หลัง login เท่านั้น)
- Items, daily/weekly missions (local + cloud sync)
- Friends, chat, profile viewing (with Supabase)
- **ต่อสู้ (PvP แบบ async):**
  - ห้องต่อสู้ — สร้าง/เข้าร่วมด้วยรหัส, 1v1 ในห้อง
  - ท้าเพื่อนโดยตรง (challenge)
  - การกระทำ: โจมตี, ป้องกัน, หลบหนี, ท่าไม้ตาย
  - **พลังท่าไม้ตาย** 0–100% — สะสมจากโจมตี/ป้องกัน (สุ่ม), ใช้ได้เมื่อครบ 100% แล้วรีเซ็ต
  - ธาตุ: ไฟ → ดิน → ลม → น้ำ → ไฟ (×2 / ×0.5), กลาง = ×1.0 ทุกคู่
  - จบดวล → popup ผลชนะ/แพ้ + กลับแท็บห้องอัตโนมัติ

## Quick Start

```bash
pnpm install
pnpm dev
```

เปิด Hub → แท็บ **บัญชี** → สมัคร/เข้าสู่ระบบ (หรือเล่น offline ก่อนได้ — สัตว์บนจอยังเป็นไข่จนกว่าจะ login)

## Environment (Database)

ดูคู่มือเต็ม: [supabase/SETUP.md](supabase/SETUP.md)

คัดลอก `.env.example` → `.env` (dev) หรือใช้ `.env.production` (build/deploy):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

รัน SQL ตามลำดับใน `supabase/migrations/` แล้ว login — ข้อมูลจะบันทึกลง DB อัตโนมัติ

## Web Version

เวอร์ชันเบราว์เซอร์ใช้ UI และ game logic ร่วมกับ desktop (`src/hub/`, `src/shared/`) แต่ไม่มี pet overlay บนจอ / global input / system tray

```bash
npm run dev:web    # http://localhost:5174
npm run build:web  # output → dist-web/
```

ใช้ env เดียวกัน (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — login แล้ว sync DB เหมือน desktop

**ความต่างจาก desktop:**

| Desktop | Web |
|---|---|
| นับคลิก/พิมพ์ทั้งเครื่อง (หลัง login) | นับเฉพาะในหน้าเว็บ |
| สัตว์เลี้ยงลอยบนจอ + system tray | Hub UI เท่านั้น |
| ก่อน login: ไข่ + tray ไม่โชว์สถิติ | ไม่มี pet overlay |
| เก็บ offline ใน `pet-save.json` | เก็บ offline ใน `localStorage` |

**Deploy:** [web/DEPLOY.md](web/DEPLOY.md) — production อยู่ที่ Vercel (auto deploy จาก `main`)

## Build (Desktop)

Requires **Node.js 18+**. Use the system Node binary if nvm shims conflict with npm.

```bash
npm install
npm run build
# Windows installer
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:win
# macOS (on Mac only)
npm run build:mac
```

Output: `dist/Taskimon Setup 0.1.0.exe` (Windows) or `.dmg` (macOS).

Installer อ่าน Supabase จาก `resources/.env` (bundle จาก `.env.production` ตอน build)

## Demo Milestones

- **Demo 1 (Jul 20):** Offline core — pet on desktop, egg, growth, stats, items, missions, save/load
- **Demo 2 (Aug 7):** Online — auth ✅, friends, battle rooms + async PvP ✅, chat ✅, profile sync ✅

## macOS Note

Global input tracking requires **Accessibility** permission in System Settings.

## Project Structure

- `electron/main/` — Main process, windows, tray, activity tracker, Supabase
- `src/hub/` — Hub UI (React)
- `src/hub/battle/` — ห้องต่อสู้, สนามดวล, ประวัติ, guard ออกจากห้อง
- `src/pet/` — Desktop pet canvas renderer
- `src/shared/` — Game logic shared across processes
- `src/shared/battle/` — Battle engine, damage, rewards, mappers
- `web/` — Vite config สำหรับเวอร์ชันเบราว์เซอร์
- `supabase/migrations/` — SQL schema + RLS + battle RPCs
