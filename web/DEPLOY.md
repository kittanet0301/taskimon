# Deploy เวอร์ชัน Web

Build แล้วได้ไฟล์ static ใน `dist-web/` — อัปโหลดไป hosting ไหนก็ได้

## Production (ปัจจุบัน)

| รายการ | ค่า |
|---|---|
| **URL** | [https://taskimon.vercel.app](https://taskimon.vercel.app) |
| **Vercel project** | `taskimon` (เชื่อม GitHub repo `kittanet0301/taskimon`) |
| **Deploy** | Auto deploy เมื่อ push ไป `main` |
| **Build** | `npm run build:web` → `dist-web/` (จาก `vercel.json`) |
| **Env** | `VITE_SUPABASE_*` จาก `.env.production` ใน repo |

หลัง deploy ต้องตั้ง Supabase Auth URL — ดู [supabase/SETUP.md §5](../supabase/SETUP.md)

## ตัวเลือก hosting (ฟรี)

| แพลตฟอร์ม | เหมาะกับ | ราคา |
|---|---|---|
| [Vercel](https://vercel.com) | ง่ายสุด, auto deploy จาก GitHub | ฟรี |
| [Netlify](https://netlify.com) | เหมือน Vercel | ฟรี |
| [Cloudflare Pages](https://pages.cloudflare.com) | เร็ว, CDN ดี | ฟรี |

---

## วิธีที่ 1: Vercel (แนะนำ)

### A. ผ่าน GitHub (ที่ใช้อยู่)

1. Push โปรเจกต์ขึ้น **GitHub**
2. ไป [vercel.com](https://vercel.com) → **Add New Project** → Import repo
3. ตั้งค่า (Vercel อ่านจาก `vercel.json` อัตโนมัติ):
   - **Build Command:** `npm run build:web`
   - **Output Directory:** `dist-web`
4. **Environment Variables** → เพิ่ม (หรือใช้ `.env.production` ใน repo สำหรับ `VITE_*`):
   ```
   VITE_SUPABASE_URL=https://novdkkhgztlskcnjzott.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
5. กด **Deploy** — commit ใหม่บน `main` จะ trigger deploy อัตโนมัติ

### B. อัปโหลดไฟล์ build ตรงๆ (ไม่มี Git)

```bash
npm run build:web
```

แล้วลากโฟลเดอร์ `dist-web/` ไปที่ [vercel.com/new](https://vercel.com/new) → **Deploy without Git**

---

## วิธีที่ 2: Netlify

1. Import จาก GitHub หรือ drag & drop โฟลเดอร์ `dist-web/`
2. ตั้ง env เหมือน Vercel (`VITE_SUPABASE_*`)
3. Netlify อ่านค่าจาก `netlify.toml` อัตโนมัติ

---

## สำคัญ: ตั้งค่า Supabase Auth

หลังได้ URL จริง เช่น `https://taskimon.vercel.app`

ไป **Supabase Dashboard** → **Authentication** → **URL Configuration**:

| ช่อง | ค่า |
|---|---|
| **Site URL** | `https://taskimon.vercel.app` |
| **Redirect URLs** | `https://taskimon.vercel.app/**` |
| (dev) | `http://localhost:5174/**` |

ถ้าไม่ตั้ง login อาจ redirect ผิดหรือ session ไม่ทำงาน

---

## Build ทดสอบในเครื่อง

```bash
npm run build:web
npm run preview:web   # เปิด http://localhost:4173
```

---

## สิ่งที่ deploy ได้ vs ไม่ได้

| Deploy ได้ | ไม่รวม (desktop only) |
|---|---|
| Hub UI ทุกแท็บ | Pet ลอยบนจอ |
| Login + DB sync | Global click tracker |
| เพื่อน / แชท / ต่อสู้ | System tray |

ข้อมูลเกมใช้ Supabase ร่วมกับแอป desktop — login บัญชีเดียวกัน เห็นสัตว์เดียวกัน
