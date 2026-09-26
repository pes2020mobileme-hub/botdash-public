import 'dotenv/config'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Client, GatewayIntentBits, Collection, Events, Routes } from 'discord.js'
import express from 'express'
import cors from 'cors'
import { readdirSync } from 'fs'
import config from './config/index.js'
import { deployCommands, commandData } from './services/deployCommands.js'
import { requireAuth, authEnabled, extractToken, isValidToken } from './middleware/auth.js'
import { logger, logStream } from './services/logger.js'
import {
  resolveGuild,
  guildStructure,
  botPermissions,
  createChannel,
  createRole,
  deleteChannels,
  deleteRoles,
  applyTemplate,
} from './services/builder.js'
import { TEMPLATES, getTemplate } from './services/templates.js'
import { saveConfig, applyConfig, getConfig, loadConfig } from './config/persist.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const TEMPLATES_FILE = join(DATA_DIR, 'custom_templates.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')

async function loadCustomTemplates() {
  if (!existsSync(TEMPLATES_FILE)) return []
  try {
    const data = JSON.parse(await readFile(TEMPLATES_FILE, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error(`อ่าน custom_templates.json ไม่สำเร็จ: ${error.message}`)
    return []
  }
}


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
  // data/config.json overrides win over .env
  await applyConfig(c)

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

// Bot config — env values merged with any dashboard overrides
app.get('/api/config', (_req, res) => {
  res.json({
    prefix: getConfig().prefix,
    status: getConfig().status,
    activity: getConfig().activity,
    owners: getConfig().owners,
  })
})

// ─── Server Builder ───────────────────────────────────────────

/** Wraps an async route so thrown errors become clean JSON responses. */
function guard(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      const status = error.status ?? 500
      if (status >= 500) logger.error(`${req.method} ${req.path} — ${error.message}`)
      res.status(status).json({ success: false, error: error.message })
    }
  }
}

function requireReady(res) {
  if (client.isReady()) return true
  res.status(503).json({ error: 'Bot not ready' })
  return false
}

function guildIdFrom(req) {
  return req.params.guildId ?? req.body?.guild_id
}

// Full structure: categories, channels, roles + bot permissions
app.get(
  '/api/guilds/:guildId/structure',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))
    res.json(guildStructure(guild))
  }),
)

// Create one channel
app.post(
  '/api/guilds/:guildId/channels',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))

    const created = await createChannel(guild, req.body ?? {})
    logger.success(`สร้างห้อง ${created.name} ใน ${guild.name}`)
    res.json({ success: true, channel: created })
  }),
)

// Create one role
app.post(
  '/api/guilds/:guildId/roles',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))

    const created = await createRole(guild, req.body ?? {})
    logger.success(`สร้างโรล ${created.name} ใน ${guild.name}`)
    res.json({ success: true, role: created })
  }),
)

// Delete channels in bulk — partial success is reported per id
app.post(
  '/api/guilds/:guildId/channels/delete',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))

    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ต้องส่ง ids เป็น array' })
    }

    logger.warn(`กำลังลบ ${ids.length} ห้องจาก ${guild.name}...`)
    const result = await deleteChannels(guild, ids)
    logger.success(`ลบห้องสำเร็จ ${result.deleted.length}/${ids.length}`)

    res.json({ success: true, ...result })
  }),
)

app.post(
  '/api/guilds/:guildId/roles/delete',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))

    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ต้องส่ง ids เป็น array' })
    }

    const result = await deleteRoles(guild, ids)
    logger.success(`ลบโรลสำเร็จ ${result.deleted.length}/${ids.length}`)
    res.json({ success: true, ...result })
  }),
)

// Built-in + custom templates
app.get(
  '/api/templates',
  guard(async (_req, res) => {
    res.json({ templates: [...TEMPLATES, ...(await loadCustomTemplates())] })
  }),
)

app.get(
  '/api/templates/:id',
  guard(async (req, res) => {
    const custom = await loadCustomTemplates()
    const found = getTemplate(req.params.id) ?? custom.find((t) => t.id === req.params.id)

    if (!found) return res.status(404).json({ error: 'ไม่พบ template นี้' })
    res.json(found)
  }),
)

app.post(
  '/api/templates',
  guard(async (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    const categories = req.body?.categories

    if (!name) return res.status(400).json({ success: false, error: 'ต้องตั้งชื่อ template' })
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ success: false, error: 'template ต้องมีอย่างน้อย 1 หมวดหมู่' })
    }

    const id = `custom_${randomUUID().slice(0, 8)}`
    const custom = await loadCustomTemplates()
    custom.push({
      id,
      name,
      description: String(req.body?.description ?? 'สร้างเอง'),
      roles: Array.isArray(req.body?.roles) ? req.body.roles : [],
      categories,
    })

    try {
      await mkdir(DATA_DIR, { recursive: true })
      await writeFile(TEMPLATES_FILE, JSON.stringify(custom, null, 2), 'utf8')
    } catch (error) {
      return res.status(500).json({ success: false, error: `บันทึกไฟล์ไม่สำเร็จ: ${error.message}` })
    }

    logger.success(`บันทึก template "${name}"`)
    res.json({ success: true, id })
  }),
)

app.delete(
  '/api/templates/:id',
  guard(async (req, res) => {
    const custom = await loadCustomTemplates()
    const remaining = custom.filter((t) => t.id !== req.params.id)

    if (remaining.length === custom.length) {
      return res.status(404).json({ success: false, error: 'ลบได้เฉพาะ template ที่สร้างเอง' })
    }

    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(TEMPLATES_FILE, JSON.stringify(remaining, null, 2), 'utf8')
    logger.success(`ลบ template ${req.params.id}`)
    res.json({ success: true })
  }),
)

// Apply a template to a guild — the long one, Discord rate limits it hard
app.post(
  '/api/guilds/:guildId/apply',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    const guild = resolveGuild(client, guildIdFrom(req))

    const templateId = req.body?.template_id
    const custom = templateId ? await loadCustomTemplates() : []
    const template = templateId
      ? (getTemplate(templateId) ?? custom.find((t) => t.id === templateId))
      : req.body?.template

    if (!template) {
      return res.status(404).json({ success: false, error: 'ไม่พบ template นี้' })
    }

    const perms = botPermissions(guild)
    if (perms && !perms.administrator && !perms.manageChannels) {
      return res.status(403).json({
        success: false,
        error: 'บอทไม่มีสิทธิ์ Manage Channels ในเซิร์ฟเวอร์นี้',
      })
    }

    logger.info(`กำลังสร้างโครงสร้าง "${template.name}" ใน ${guild.name}...`)

    const report = await applyTemplate(guild, template, (step) => logger.info(step))

    logger.success(
      `เสร็จแล้ว: หมวดหมู่ ${report.categories.length}, ห้อง ${report.channels.length}, โรล ${report.roles.length}, พัง ${report.failed.length}`,
    )

    res.json({ success: true, template: template.name, ...report })
  }),
)

// ─── Bot controls ─────────────────────────────────────────────

app.post(
  '/api/bot/restart',
  guard(async (_req, res) => {
    if (!requireReady(res)) return
    await restartBot()
    res.json({ success: true, message: 'restart บอทแล้ว' })
  }),
)

app.post(
  '/api/bot/leave-all',
  guard(async (req, res) => {
    if (!requireReady(res)) return
    if (req.body?.confirm !== 'LEAVE_ALL') {
      return res.status(400).json({
        success: false,
        error: 'ต้องส่ง confirm: "LEAVE_ALL" เพื่อยืนยัน (การกระทำนี้ย้อนกลับไม่ได้)',
      })
    }

    const guilds = [...client.guilds.cache.values()]
    logger.warn(`กำลังออกจากทุกเซิร์ฟเวอร์ (${guilds.length} เซิร์ฟเวอร์)...`)

    const result = { left: [], failed: [] }
    for (const guild of guilds) {
      try {
        await guild.leave()
        result.left.push({ id: guild.id, name: guild.name })
      } catch (error) {
        result.failed.push({ id: guild.id, name: guild.name, error: error.message })
      }
    }

    logger.success(`ออกจาก ${result.left.length}/${guilds.length} เซิร์ฟเวอร์`)
    res.json({ success: true, ...result })
  }),
)

// Persist editable settings to a JSON file the config module reads at startup
app.post(
  '/api/config',
  guard(async (req, res) => {
    const patch = {}

    if (typeof req.body?.prefix === 'string') {
      const prefix = req.body.prefix.trim()
      if (!prefix) return res.status(400).json({ success: false, error: 'prefix ห้ามว่าง' })
      if (prefix.length > 5) return res.status(400).json({ success: false, error: 'prefix ยาวเกิน 5 ตัว' })
      patch.prefix = prefix
    }

    const statuses = ['online', 'idle', 'dnd', 'invisible']
    if (req.body?.status !== undefined) {
      if (!statuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, error: `status ต้องเป็น ${statuses.join(', ')}` })
      }
      patch.status = req.body.status
    }

    if (typeof req.body?.activity === 'string') {
      const activity = req.body.activity.trim().slice(0, 128)
      if (!activity) return res.status(400).json({ success: false, error: 'activity ห้ามว่าง' })
      patch.activity = activity
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีค่าที่จะบันทึก' })
    }

    try {
      await saveConfig(patch)
      await applyConfig(client)
      logger.info(`อัปเดต config: ${JSON.stringify(patch)}`)
      res.json({ success: true, config: getConfig() })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }),
)

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API รันที่ http://localhost:${PORT}`)
})

// ─── Login ────────────────────────────────────────────────────
await loadConfig()
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

