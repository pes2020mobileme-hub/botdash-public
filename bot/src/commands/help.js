import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

const COMMANDS = [
  ['/ping', 'เช็ค latency ของบอท'],
  ['/serverinfo', 'ข้อมูลเซิร์ฟเวอร์นี้'],
  ['/help', 'รายการคำสั่งทั้งหมด'],
  ['/uptime', 'บอทออนไลน์มานานเท่าไร'],
]

function formatUptime(seconds) {
  const total = Math.floor(seconds || 0)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d) return `${d} วัน ${h} ชั่วโมง`
  if (h) return `${h} ชั่วโมง ${m} นาที`
  if (m) return `${m} นาที ${s} วินาที`
  return `${s} วินาที`
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('รายการคำสั่งของบอท'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('คำสั่งทั้งหมด')
      .setDescription(
        COMMANDS.map(([name, desc]) => `\`${name}\` — ${desc}`).join('\n'),
      )
      .addFields({
        name: 'จัดการเซิร์ฟเวอร์',
        value: 'เปิดแดชบอร์ดเพื่อสร้าง/ลบห้อง หมวดหมู่ และโรลได้',
      })
      .setFooter({ text: 'BotDash' })
      .setTimestamp()

    await interaction.reply({ embeds: [embed], ephemeral: true })
  },
}
