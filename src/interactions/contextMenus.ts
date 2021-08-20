import type { ContextMenuInteraction } from "discord.js";

export function contextConvertToAnswer(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextConvertToAnswer" }).catch(console.error.bind(console));
}

export function contextConvertToQuestion(interaction: ContextMenuInteraction): void {
	interaction
		.reply({ ephemeral: true, content: "NYI - contextConvertToQuestion" })
		.catch(console.error.bind(console));
}

export function contextAcceptAnswer(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextAcceptAnswer" }).catch(console.error.bind(console));
}

export function contextFlag(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextFlag" }).catch(console.error.bind(console));
}
