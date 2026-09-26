import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('แสดงข้อมูลเซิร์ฟเวอร์นี้'),
  async execute(interaction) {
    const { guild, channel, member } = interaction
    if (!guild) {
      return interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น', ephemeral: true })
    }

    const owner = await guild.fetchOwner().catch(() => null)

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👑 เจ้าของ', value: owner ? `<@${owner.id}>` : 'ไม่ทราบ', inline: true },
        { name: '📅 สร้างเมื่อ', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 สมาชิก', value: `${guild.memberCount}`, inline: true },
        { name: '💬 ห้องข้อความ', value: `${guild.channels.cache.filter((c) => c.type === 0).size}`, inline: true },
        { name: '🔊 ห้องเสียง', value: `${guild.channels.cache.filter((c) => c.type === 2).size}`, inline: true },
        {
          name: '💎 โบสต์',
          value: `${guild.premiumTier ? `Tier ${guild.premiumTier} — ` : ''}${guild.premiumSubscriptionCount ?? 0}`,
          inline: true,
        },
      )
      .setFooter({ text: `คุณ: ${member?.user.tag ?? interaction.user.tag}` })
      .setTimestamp()

    if (channel?.name) embed.addFields({ name: '📍 ห้องที่พิมพ์', value: channel.name, inline: true })

    await interaction.reply({ embeds: [embed] })
  },
}
