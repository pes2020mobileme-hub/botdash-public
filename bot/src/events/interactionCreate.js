import { Events, MessageFlags } from 'discord.js'

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)
    if (!command) return

    try {
      await command.execute(interaction)
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error)
      const reply = {
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      }
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply)
      } else {
        await interaction.reply(reply)
      }
    }
  },
}
