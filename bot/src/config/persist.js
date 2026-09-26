/**
 * Runtime config overrides.
 *
 * .env is read once at startup, so editing it in the dashboard would do nothing
 * without a restart. Settings saved here live in data/config.json and take
 * precedence over the environment, which makes the Settings page actually work.
 */

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import envConfig from './index.js'

const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'config.json')

let overrides = {}

export async function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    const data = JSON.parse(await readFile(CONFIG_FILE, 'utf8'))
    overrides = data && typeof data === 'object' ? data : {}
  } catch {
    overrides = {}
  }
  return overrides
}

export async function saveConfig(patch) {
  const current = await loadConfig()
  const next = { ...current, ...patch }

  await mkdir(dirname(CONFIG_FILE), { recursive: true })

  // Write-then-rename so a crash mid-write cannot leave a truncated file
  const tmp = `${CONFIG_FILE}.tmp`
  await writeFile(tmp, JSON.stringify(next, null, 2), 'utf8')
  await rename(tmp, CONFIG_FILE)

  overrides = next
  return next
}

/** Push overrides onto the live config object and mirror them to Discord. */
export async function applyConfig(client) {
  Object.assign(envConfig, overrides)

  if (!client) return envConfig
  if (!client.isReady()) return envConfig

  const user = client.user
  if (user && (overrides.status || overrides.activity)) {
    await user.setPresence({
      status: overrides.status ?? envConfig.status,
      activities: [{ name: overrides.activity ?? envConfig.activity }],
    })
  }

  return envConfig
}

export function getConfig() {
  return { ...envConfig, ...overrides }
}
