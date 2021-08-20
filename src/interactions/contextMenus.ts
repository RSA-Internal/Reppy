import type { ContextMenuInteraction, Message } from "discord.js";
import { fetchGuildData } from "../daos/GuildDataDAO";

export function contextConvertToAnswer(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextConvertToAnswer" }).catch(console.error.bind(console));
}

export async function contextConvertToQuestion(interaction: ContextMenuInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const guildId = interaction.guildId;

	if (guildId) {
		const fetchResult = await fetchGuildData(guildId);
		const guildData = fetchResult.guildData;

		if (guildData) {
			const message = interaction.options["_hoistedOptions"][0].message as Message;

			if (message) {
				const channel = message.channelId;

				if (guildData.validChannels.includes(channel)) {
					const author = message.author.id;

					if (interaction.user.id === author) {
						// convert to question.
						if (!message.hasThread) {
							await message.startThread({
								name: message.content.substring(
									0,
									message.content.indexOf("?") || message.content.indexOf(".")
								),
								autoArchiveDuration: 1440,
								reason: `contextConvertToQuestion by ${interaction.user.username}`,
							});

							await interaction.editReply("Successfully converted message to question.");
						} else {
							await interaction.editReply(
								`This message already has an existing question. <#${message.thread?.id}>`
							);
						}
					} else {
						await interaction.editReply(
							"You are not allowed to convert another member's message to a question."
						);
					}
				} else {
					await interaction.editReply("This channel is not a valid reputation gainable channel.");
				}
			}
		} else {
			await interaction.editReply(fetchResult.message);
		}
	} else {
		await interaction.editReply("Failed to fetch guildId from interaction.");
	}

	return;
}

export function contextAcceptAnswer(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextAcceptAnswer" }).catch(console.error.bind(console));
}

export function contextFlag(interaction: ContextMenuInteraction): void {
	interaction.reply({ ephemeral: true, content: "NYI - contextFlag" }).catch(console.error.bind(console));
}
