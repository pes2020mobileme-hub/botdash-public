import { Events } from 'discord.js'
import config from '../config/index.js'

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[Event] Ready as ${client.user.tag}`)
    await client.user.setPresence({
      status: config.status,
      activities: [{ name: config.activity }],
    })
  },
}
