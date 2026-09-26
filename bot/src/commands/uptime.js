import { SlashCommandBuilder, version as djsVersion } from 'discord.js'

function formatUptime(seconds) {
  const total = Math.floor(seconds || 0)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d) return `${d}d ${h}h ${m}m`
  if (h) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

export default {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('แสดง uptime และสถานะการเชื่อมต่อของบอท'),
  async execute(interaction) {
    const client = interaction.client

    await interaction.deferReply()

    // Measure a real REST round trip rather than trusting a cached value
    const rest = `${Math.round(client.ws.ping)}ms`
    let api = 'n/a'
    try {
      const started = Date.now()
      await client.rest.get(`/applications/${client.user.id}`)
      api = `${Date.now() - started}ms`
    } catch {
      /* keep n/a */
    }

    const fields = [
      { name: '⏱️ Uptime', value: formatUptime(process.uptime()), inline: true },
      { name: '🏓 Gateway', value: rest, inline: true },
      { name: '🌐 REST API', value: api, inline: true },
      { name: '📡 WebSocket', value: `${client.ws.shard?.count ?? 1} shard(s)`, inline: true },
      { name: '💾 Memory', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, inline: true },
      { name: '📚 discord.js', value: djsVersion, inline: true },
    ]

    if (process.uptime() < 60) {
      fields.push({ name: '⚠️ หมายเหตุ', value: 'เพิ่งสตาร์ท — ค่า ping อาจยังไม่นิ่ง' })
    }

    await interaction.editReply({
      embeds: [
        {
          color: 0x8b5cf6,
          title: 'Bot Status',
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },
}
