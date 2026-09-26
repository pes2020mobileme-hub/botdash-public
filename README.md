# BotDash — Discord Bot Dashboard

แดชบอร์ด React + Vite เชื่อมกับ Discord.js Bot ผ่าน REST API

```
┌─────────────────────┐
│   React + Vite      │
│   Dashboard         │
└──────────┬──────────┘
           │ REST API (/api)
           ▼
┌─────────────────────┐
│  Node.js + Express  │  ← อยู่ใน bot/
│  (API Server)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    discord.js       │
│    Bot              │
└──────────┬──────────┘
           │
           ▼
      Discord API
```

## โครงสร้างโปรเจกต์

```
project/
├─ dashboard/          # React + Vite Frontend
│  ├─ src/
│  │  ├─ components/   # Sidebar, Navbar, StatCard
│  │  ├─ pages/        # Dashboard, Servers, Settings
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ package.json
│  └─ vite.config.js
│
├─ bot/                # Discord.js Bot + Express API
│  ├─ src/
│  │  ├─ commands/     # Slash commands
│  │  ├─ events/       # Client events
│  │  ├─ services/     # Helper services
│  │  ├─ config/       # Config
│  │  └─ index.js      # Entry point (Bot + API)
│  └─ package.json
│
└─ README.md
```

## วิธีรัน

### 1. ตั้งค่า Bot

```bash
cd bot
cp .env.example .env
# แก้ไข .env ใส่ DISCORD_TOKEN ของคุณ
npm install
npm run dev
```

API จะรันที่ `http://localhost:3001`

### 2. รัน Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard จะรันที่ `http://localhost:5173`  
ตอน dev Vite จะ proxy `/api/*` ไปที่ `VITE_BOT_API_URL` (ค่าเริ่มต้น `http://localhost:3001`) ให้เอง
ถ้าอยาก override ให้คัดลอก `dashboard/.env.example` เป็น `dashboard/.env`

## API Endpoints

| Method | Path           | ต้องบอทออนไลน์ | Description                                        |
|--------|----------------|---------------|----------------------------------------------------|
| GET    | `/api/health`  | ไม่           | สถานะบอท, invite URL, uptime, ping                  |
| GET    | `/api/stats`   | ใช่           | สรุป servers / members / channels / uptime / ping   |
| GET    | `/api/servers` | ใช่           | รายการ servers พร้อม member + channel count         |
| GET    | `/api/config`  | ไม่           | ค่า config ที่บอทอ่านจาก `.env` (read-only)          |

`/api/stats` และ `/api/servers` จะคืน `503 {"error":"Bot not ready"}` ถ้าบอทยังไม่ login

## Deploy

รองรับทุกเจ้า — config อยู่ที่ root ของ repo

| เจ้า | ไฟล์ config | หมายเหตุ |
|------|-------------|----------|
| **Render** | `render.yaml` | Blueprint, มีทั้ง bot (web service) และ dashboard (static site) |
| **Railway** | `railway.json` | Nixpacks build |
| **Fly.io** | `fly.toml` + `Dockerfile` | ไม่ sleep, เหมาะกับบอทที่ต้องออนไลน์ตลอด |
| **Vercel** | `dashboard/vercel.json` | deploy เฉพาะ dashboard (Vercel ไม่รองรับ WebSocket ยาว ๆ ของบอท) |
| **Docker ทั่วไป** | `Dockerfile` | `docker build -t botdash-bot .` |

### ขั้นตอน (Render)

1. เข้า <https://dashboard.render.com> → **New → Blueprint**
2. เลือก repo `botdash-public`
3. Render จะอ่าน `render.yaml` แล้วสร้าง 2 services
4. ตั้ง env vars ที่ขึ้น `sync: false`:
   - `DISCORD_TOKEN` — **อย่า commit ลง git**
   - `CORS_ORIGIN` — origin ของ dashboard เช่น `https://xxx.vercel.app`
   - `VITE_API_URL` (ของ dashboard) — URL ของบอท เช่น `https://botdash-bot.onrender.com`
5. เสร็จแล้ว bot จะได้ `DISCORD_TOKEN` และขึ้น Discord อัตโนมัติ

### ⚠️ ข้อจำกัดของ Render Free

[เอกสาร Render](https://render.com/docs/free) ระบุตรง ๆ ว่า free tier
**"Do not use for production applications"**:

- spin down เมื่อไม่มี inbound traffic 15 นาที (ตื่นใช้เวลา ~1 นาที)
  `healthCheckPath: /api/health` ใน `render.yaml` ช่วยเป็นระยะ เพราะ health check
  คือ inbound HTTP request แต่ยังไม่การันตี 100%
- Render อาจ restart service ได้ตามการ — บอทจะ reconnect อัตโนมัติ (โค้ด login ครั้งเดียว
  discord.js จัดการเอง)
- มีโอกาสโดน suspend ถ้า outbound traffic สูงผิดปกติ
- 750 instance hours/เดือน (หมดแล้ว service ทั้งหมดจะถูก suspend จนหมดเดือน)

ถ้าต้องการให้บอทออนไลน์ตลอดแนะนำ **Fly.io** (`fly.toml` ตั้ง `min_machines_running = 1`)
หรือ **Render Starter** หรือ **Railway**

อีกทางคือใช้บริการ ping ภายนอก (UptimeRobot / cron-job.org) ยิง
`https://<bot-url>/api/health` ทุก 10 นาที — ช่วยกัน spin down ได้เช่นกัน

## Dashboard → Bot API

Dashboard อ่านค่า `VITE_API_URL` ตอน build:

- **Dev** — เว้นว่างไว้ ใช้ proxy ของ Vite
- **Production** — ต้องใส่ URL ของบอทที่ deploy ไว้ เช่น `https://botdash-bot.onrender.com`
  เพราะ proxy ของ Vite ไม่ทำงานหลัง build

> ปุ่ม Save Changes / Restart Bot / Leave All Servers ในหน้า Settings ยังไม่ได้เชื่อม endpoint
> ปุ่มถูก disable ไว้เพื่อไม่ให้ดูเหมือนทำงานแล้ว

## หมายเหตุ

- Dashboard ดึงข้อมูลจริงจาก API แล้ว (poll ทุก 10–30 วินาที) — ถ้าต่อ API ไม่ได้จะขึ้น
  ErrorState พร้อมปุ่มลองใหม่
- Bot ยังเป็นโครงเปล่า มีตัวอย่าง command `/ping` และ event `ready`
- WebSocket real-time จะเพิ่มภายหลังได้ตาม diagram
- บอทอ่าน `PORT` (PaaS) หรือ `API_PORT` (dev) และปิด gateway แบบ graceful เมื่อได้ SIGTERM



## Tech Stack

- **Frontend:** React 18, Vite, React Router, Lucide Icons
- **Backend:** Node.js, Express, discord.js v14
- **Style:** Dark theme แบบ Discord

## หมายเหตุเรื่องเวอร์ชัน discord.js

โปรเจกต์นี้อยู่บน `discord.js@14.27.0` (stable) แต่มี 2 จุดที่เขียนตาม
[แนวทาง v15](https://discordjs.guide/v15) ไว้ล่วงหน้า เพราะ v14 รองรับอยู่แล้ว:

- `bot/src/events/interactionCreate.js` ใช้ `flags: MessageFlags.Ephemeral`
  แทน `ephemeral: true` (v15 ถอดตัวเลือก `ephemeral` ออก)
- `bot/src/events/ready.js` `await client.user.setPresence(...)` — ใน v15
  `setPresence` คืน promise ใน v14 ไม่คืน `await` ทิ้งก็ยังทำงานถูก

ถ้าจะอัปเกรดเป็น v15 เต็มรูปแบบต้องแก้เพิ่ม 2 จุด:

| หัวข้อ | v14 | v15 |
|---------|-----|-----|
| Slash command builders | `new SlashCommandBuilder()` | plain object `{ name, description }` (Builders ถูกถอดออกจาก `discord.js`) |
| ดึง message ที่ reply | `interaction.reply({ fetchReply: true })` | `interaction.reply({ withResponse: true })` แล้วอ่าน `response.resource.message` |
| Ping | `client.ws.ping` | `client.ping` (เป็น `null` จนกว่าจะได้ heartbeat แรก) |
| Node | `>=18` | `>=24.17.0` |


