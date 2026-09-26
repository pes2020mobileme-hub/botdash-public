import 'dotenv/config'
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js'
import express from 'express'
import cors from 'cors'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import config from './config/index.js'

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
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`)
  console.log(`📊 Serving ${c.guilds.cache.size} servers`)
})

// ─── Express API (for Dashboard) ──────────────────────────────
const app = express()
// เว้นว่าง = เปิดทุก origin (default) — ตั้ง CORS_ORIGIN เป็นโดเมน dashboard
// คั่นด้วย comma ได้ เช่น https://my-app.vercel.app,https://my-app-git-main.vercel.app
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) || true }))
app.use(express.json())

const PORT = process.env.API_PORT || 3001

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

// Bot config (read-only — บอทอ่านค่าจาก .env ตอน start)
app.get('/api/config', (_req, res) => {
  res.json({
    prefix: config.prefix,
    status: config.status,
    activity: config.activity,
    owners: config.owners,
  })
})

app.listen(PORT, () => {
  console.log(`🌐 API running on http://localhost:${PORT}`)
})

// ─── Login ────────────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN
if (!token) {
  console.warn('⚠️  DISCORD_TOKEN not set — bot will not connect. API still available.')
  console.warn('   Create a .env file with DISCORD_TOKEN=your_token')
} else {
  client.login(token)
}

export { client, app }
