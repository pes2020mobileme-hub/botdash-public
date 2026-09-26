/**
 * Deploy slash commands without starting the bot's HTTP server.
 *
 *   npm run deploy:commands            # global (up to 1 hour to propagate)
 *   GUILD_ID=123 npm run deploy:commands  # single guild (instant)
 */

import 'dotenv/config'
import { Client, GatewayIntentBits, Collection } from 'discord.js'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deployCommands } from './services/deployCommands.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const token = process.env.DISCORD_TOKEN
if (!token) {
  console.error('❌ DISCORD_TOKEN not set — add it to bot/.env')
  process.exit(1)
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
client.commands = new Collection()

const commandsPath = join(__dirname, 'commands')
for (const file of readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = await import(join(commandsPath, file))
  if (command.default?.data?.name) {
    client.commands.set(command.default.data.name, command.default)
  }
}

client.once('ready', async () => {
  try {
    await deployCommands(client)
    process.exit(0)
  } catch (error) {
    console.error('❌ Deploy failed:', error.message)
    process.exit(1)
  }
})

client.once('error', (error) => {
  console.error('❌ Client error:', error.message)
  process.exit(1)
})

await client.login(token)
