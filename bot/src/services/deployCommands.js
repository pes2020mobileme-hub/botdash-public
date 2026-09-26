/**
 * Deploy slash commands to Discord.
 *
 * Uses a bulk PUT, which is idempotent — anything NOT in this payload gets
 * removed from Discord. That is intentional: it keeps Discord in sync with the
 * files in src/commands, so deleting a file deletes the command.
 *
 * Set GUILD_ID to publish to a single guild. Guild commands propagate instantly,
 * global commands can take up to an hour.
 */

import { Routes } from 'discord.js'

export function commandData(client) {
  return [...client.commands.values()].map((command) => command.data)
}

export async function deployCommands(client) {
  const body = commandData(client)

  if (body.length === 0) {
    console.log('⚠️  No commands to deploy — src/commands is empty')
    return { count: 0, scope: null, names: [] }
  }

  const toGuild = Boolean(process.env.GUILD_ID)

  const route = toGuild
    ? Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID)
    : Routes.applicationCommands(client.user.id)

  const deployed = await client.rest.put(route, { body })

  const names = body.map((c) => `/${c.name}`).join(', ')

  console.log(
    `✅ Deployed ${deployed.length} command(s) to ${toGuild ? `guild ${process.env.GUILD_ID}` : 'all guilds'}: ${names}`,
  )

  if (!toGuild) {
    console.log('   ⏳ Global commands can take up to 1 hour to propagate')
  }

  return { count: deployed.length, scope: toGuild ? 'guild' : 'global', names: body.map((c) => c.name) }
}
