import type { CommandInteraction } from "discord.js";

export function slashCommandUpdate(interaction: CommandInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - Update Command" }).catch(console.error.bind(console));
}
