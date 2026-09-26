import 'dotenv/config'
import { Client, GatewayIntentBits, Collection, Events, Routes } from 'discord.js'
import express from 'express'
import cors from 'cors'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import config from './config/index.js'
import { deployCommands, commandData } from './services/deployCommands.js'
import { requireAuth, authEnabled, extractToken, isValidToken, generateToken } from './middleware/auth.js'
import { logger, logStream } from './services/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Discord Client ───────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
})

client.commands = new Collection()

// ─── Load Commands (skeleton) ─────────────────────────────────
const commandsPath = join(__dirname, 'commands')
try {
  const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'))
  for (const file of commandFiles) {
    const command = await import(join(commandsPath, file))
    if (command.default?.data?.name) {
      client.commands.set(command.default.data.name, command.default)
    }
  }
} catch {
  // commands folder empty for now
}

// ─── Load Events (skeleton) ───────────────────────────────────
const eventsPath = join(__dirname, 'events')
try {
  const eventFiles = readdirSync(eventsPath).filter((f) => f.endsWith('.js'))
  for (const file of eventFiles) {
    const event = await import(join(eventsPath, file))
    if (event.default?.name) {
      if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args, client))
      } else {
        client.on(event.default.name, (...args) => event.default.execute(...args, client))
      }
    }
  }
} catch {
  // events folder empty for now
}

// Built-in ready event
client.once(Events.ClientReady, async (c) => {
  logger.success(`บอทออนไลน์แล้ว — ${c.user.tag}`)
  logger.info(`อยู่ใน ${c.guilds.cache.size} เซิร์ฟเวอร์`)

  if (!authEnabled()) {
    logger.warn('DASHBOARD_TOKEN ไม่ได้ตั้ง — API เปิดให้ทุกคนเรียกได้ (ตั้งค่าเพื่อป้องกัน)')
  }

  // Push slash commands to Discord — otherwise they exist in code only and
  // never show up in the Discord UI. Set DEPLOY_COMMANDS=false to skip.
  if (process.env.DEPLOY_COMMANDS !== 'false') {
    try {
      const result = await deployCommands(c)
      logger.success(`deploy slash commands แล้ว ${result.count} คำสั่ง (${result.scope})`)
    } catch (error) {
      // A failed deploy must not take the bot offline
      logger.error(`deploy slash commands ไม่สำเร็จ: ${error.message}`)
    }
  }
})

// ─── Express API (for Dashboard) ──────────────────────────────
const app = express()
// เว้นว่าง = เปิดทุก origin (default) — ตั้ง CORS_ORIGIN เป็นโดเมน dashboard
// คั่นด้วย comma ได้ เช่น https://my-app.vercel.app,https://my-app-git-main.vercel.app
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
// ต้องเช็คความยาว ไม่ใช่ truthiness — [] ก็เป็นค่า truthiy
// ถ้าไม่เช็คจะกลายเป็น allowlist ว่าง = ไม่มี origin ไหนผ่าน
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }))
app.use(express.json())

// ─── Auth ─────────────────────────────────────────────────────
// Everything under /api needs a bearer token except the two public auth routes.
// SSE clients (EventSource) cannot set headers, so ?token= is also accepted.
app.use('/api', requireAuth)

app.get('/api/auth/status', (_req, res) => {
  res.json({ required: authEnabled() })
})

app.post('/api/auth/verify', (req, res) => {
  const token = extractToken(req)
  if (!isValidToken(token)) {
    return res.status(401).json({ success: false, error: 'Token ไม่ถูกต้อง' })
  }
  res.json({ success: true, required: authEnabled() })
})

// ─── Log stream ───────────────────────────────────────────────
app.get('/api/logs', logStream)


// PaaS (Render/Railway/Fly) จะ inject PORT, ตอน dev ใช้ API_PORT
const PORT = Number(process.env.PORT || process.env.API_PORT || 3001)

// Root — ใช้เป็น health check ของ PaaS
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'botdash-bot', ready: client.isReady() })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ready: client.isReady(),
    bot: client.user ? client.user.tag : 'not ready',
    botId: client.user?.id ?? null,
    avatar: client.user?.displayAvatarURL({ size: 64 }) ?? null,
    inviteUrl: client.user
      ? `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=8`
      : null,
    guilds: client.guilds?.cache?.size ?? 0,
    uptime: process.uptime(),
    ping: client.isReady() ? client.ws.ping : null,
  })
})

// Stats for dashboard
app.get('/api/stats', (_req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' })
  }
  res.json({
    servers: client.guilds.cache.size,
    members: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
    channels: client.guilds.cache.reduce((acc, g) => acc + g.channels.cache.size, 0),
    uptime: process.uptime(),
    ping: client.ws.ping,
  })
})

// Servers list
app.get('/api/servers', (_req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' })
  }
  const servers = client.guilds.cache
    .map((g) => ({
      id: g.id,
      name: g.name,
      members: g.memberCount,
      channels: g.channels.cache.size,
      ownerId: g.ownerId,
      icon: g.iconURL({ size: 64 }),
    }))
    .sort((a, b) => b.members - a.members)
  res.json(servers)
})

// Slash commands currently registered on Discord
app.get('/api/commands', async (_req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' })
  }

  const toGuild = Boolean(process.env.GUILD_ID)
  const route = toGuild
    ? Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID)
    : Routes.applicationCommands(client.user.id)

  try {
    const registered = await client.rest.get(route)
    res.json({
      scope: toGuild ? 'guild' : 'global',
      registered: registered.map((c) => ({
        name: c.name,
        description: c.description,
        type: c.type,
      })),
      local: commandData(client).map((c) => c.name),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Deploy slash commands to Discord on demand
app.post('/api/commands/deploy', async (_req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' })
  }

  try {
    const result = await deployCommands(client)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('deploy failed:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bot config (read-only — บอทอ่านค่าจาก .env ตอน start)
app.get('/api/config', (_req, res) => {
  res.json({
    prefix: config.prefix,
    status: config.status,
    activity: config.activity,
    owners: config.owners,
  })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 API running on http://localhost:${PORT}`)
})

// ─── Login ────────────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN
if (!token) {
  logger.warn('DISCORD_TOKEN ไม่ได้ตั้ง — บอทจะไม่เชื่อมต่อ แต่ API ยังใช้ได้')
  logger.warn('สร้างไฟล์ .env แล้วใส่ DISCORD_TOKEN=<token ของคุณ>')
} else {
  client.login(token).catch((error) => {
    logger.error(`login ไม่สำเร็จ: ${error.message}`)
  })
}

// ─── Restart (ใช้จากปุ่มใน dashboard) ──────────────────────────
// ปิด gateway แล้ว login ใหม่ โดยไม่ต้องรีสตาร์ท process
let restarting = false
async function restartBot() {
  if (restarting) throw new Error('กำลัง restart อยู่')
  restarting = true

  try {
    logger.warn('กำลัง restart บอท...')
    await client.destroy()
    await client.login(token)
    logger.success('restart บอทสำเร็จ')
  } finally {
    restarting = false
  }
}

// ─── Graceful shutdown ────────────────────────────────────────
// PaaS จะส่ง SIGTERM ก่อน restart — ปิด gateway + server ให้เรียบร้อย
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    logger.info(`${signal} received — กำลังปิด...`)
    server.close()
    try {
      await client.destroy()
    } catch (error) {
      logger.error(`destroy ไม่สำเร็จ: ${error.message}`)
    }
    process.exit(0)
  })
}

process.on('unhandledRejection', (reason) => {
  logger.error(`unhandled rejection: ${reason?.message ?? reason}`)
})

// ─── Guild events → log stream ────────────────────────────────
client.on(Events.GuildCreate, (guild) => logger.info(`เข้าเซิร์ฟเวอร์ใหม่: ${guild.name} (${guild.id})`))
client.on(Events.GuildDelete, (guild) => logger.warn(`ออกจากเซิร์ฟเวอร์: ${guild.name} (${guild.id})`))
client.on(Events.Error, (error) => logger.error(`discord client error: ${error.message}`))

export { client, app, server, restartBot, config }

