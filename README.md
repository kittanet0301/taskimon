# Taskimon

Tamagotchi-style desktop pet game with elemental RPG — desktop (Electron) + web.

## Features

- Transparent always-on-top pet window on desktop
- Random egg hatch → species, element (5 types), gender
- Growth: Egg → Baby → Adult
- Stats: HP, mood, development points
- Global click/keyboard activity tracking for development
- Items, daily/weekly missions (local + cloud sync)
- Friends, turn-based elemental battles, chat, profile viewing (with Supabase)

## Quick Start

```bash
pnpm install
pnpm dev
```

## Environment (Database)

ดูคู่มือเต็ม: [supabase/SETUP.md](supabase/SETUP.md)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

รัน SQL ตามลำดับใน `supabase/migrations/` แล้ว login ที่แท็บ **บัญชี** — ข้อมูลจะบันทึกลง DB อัตโนมัติ

## Web Version

เวอร์ชันเบราว์เซอร์ใช้ UI และ game logic ร่วมกับ desktop (`src/hub/`, `src/shared/`) แต่ไม่มี pet overlay บนจอ / global input / system tray

```bash
npm run dev:web    # http://localhost:5174
npm run build:web  # output → dist-web/
```

ใช้ `.env` เดียวกัน (อ่าน `VITE_SUPABASE_URL` และ key) — login แล้ว sync DB เหมือน desktop

**ความต่างจาก desktop:**
- นับคลิก/พิมพ์เฉพาะในหน้าเว็บ (ไม่ track ทั้งเครื่อง)
- ไม่มีสัตว์เลี้ยงลอยบนจอ
- เก็บ offline cache ใน `localStorage`

**Deploy ขึ้นเว็บจริง:** ดู [web/DEPLOY.md](web/DEPLOY.md) — แนะนำ Vercel/Netlify (ฟรี)

## Build

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

## Demo Milestones

- **Demo 1 (Jul 20):** Offline core — pet on desktop, egg, growth, stats, items, missions, save/load
- **Demo 2 (Aug 7):** Online — auth, friends, battle, chat, profile sync

## macOS Note

Global input tracking requires **Accessibility** permission in System Settings.

## Project Structure

- `electron/main/` — Main process, windows, tray, activity tracker, Supabase
- `src/hub/` — Hub UI (React)
- `src/pet/` — Desktop pet canvas renderer
- `src/shared/` — Game logic shared across processes
