/**
 * In-memory log buffer with an SSE fan-out.
 *
 * Logs live in a bounded ring buffer so a restart cannot grow memory without
 * limit, and so a dashboard that connects late still sees recent history
 * instead of an empty screen.
 */

import { EventEmitter } from 'node:events'

const MAX_ENTRIES = 500

class LogBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(0) // one listener per connected dashboard tab
    this.entries = []
    this.nextId = 1
  }

  push(level, message, meta) {
    const entry = {
      id: this.nextId++,
      level,
      message: String(message),
      time: new Date().toISOString(),
      ...(meta ? { meta } : {}),
    }

    this.entries.push(entry)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES)
    }

    this.emit('entry', entry)
    return entry
  }

  /** Entries newer than the given id — lets a reconnecting client catch up. */
  since(id) {
    if (!Number.isFinite(id)) return this.entries.slice()
    const index = this.entries.findIndex((e) => e.id > id)
    return index === -1 ? [] : this.entries.slice(index)
  }
}

export const logBus = new LogBus()

const stamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false })

export const logger = {
  info: (msg, meta) => {
    const line = `${stamp()}  ℹ️  ${msg}`
    console.log(line)
    return logBus.push('info', msg, meta)
  },
  success: (msg, meta) => {
    const line = `${stamp()}  ✅  ${msg}`
    console.log(line)
    return logBus.push('success', msg, meta)
  },
  warn: (msg, meta) => {
    const line = `${stamp()}  ⚠️  ${msg}`
    console.warn(line)
    return logBus.push('warn', msg, meta)
  },
  error: (msg, meta) => {
    const line = `${stamp()}  ❌  ${msg}`
    console.error(line)
    return logBus.push('error', msg, meta)
  },
}

/** Express response wired to the bus as a Server-Sent Events stream. */
export function logStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const send = (entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`)
  }

  // Backfill so a fresh connection is not blank
  const lastId = Number(req.headers['last-event-id'] ?? req.query.since)
  const backlog = logBus.since(lastId)
  if (backlog.length === 0 && !Number.isFinite(lastId)) {
    res.write(`data: ${JSON.stringify({ level: 'info', message: '— log stream connected —' })}\n\n`)
  } else {
    backlog.forEach(send)
  }

  logBus.on('entry', send)

  // Keep intermediaries from closing an idle connection
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(heartbeat)
    logBus.off('entry', send)
  })
}
