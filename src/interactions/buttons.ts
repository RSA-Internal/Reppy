import type { ButtonInteraction, Guild, Message, TextChannel, User } from "discord.js";
import { updateGuildData } from "../daos/GuildDataDAO";
import type { IGuildData } from "../models/guildData.model";

export async function buttonUpvote(
	interaction: ButtonInteraction,
	guild: Guild,
	guildData: IGuildData,
	channelForReputation: TextChannel,
	userForReputation: User,
	message: Message
): Promise<void> {
	const answerIdField = message.embeds[0].fields.find(field => field.name === "Answer ID");

	if (!answerIdField) {
		await interaction.update({
			content: "There was no associated answer id on that interaction.",
			embeds: [],
			components: [],
		});
		return;
	}

	const buttons = message.components[0].components;

	if (!buttons) {
		await interaction.update({
			content: "There were no valid buttons on that interaction.",
			embeds: [],
			components: [],
		});
		return;
	}

	await interaction.update({
		content: "Processing upvote.",
		embeds: [],
		components: [],
	});

	let allMessageData = guildData.messageData;
	let messageData = allMessageData.find(savedData => savedData.messageId === answerIdField.value);

	if (!messageData) {
		await interaction.editReply({
			content: "This is not a valid answer to vote on.",
			embeds: [],
			components: [],
		});
		return;
	}

	const hasUpvoted = buttons.find(button => button.customId === "upvote")?.disabled ?? false;
	const hasDownvoted = buttons.find(button => button.customId === "downvote")?.disabled ?? false;

	if (hasUpvoted) {
		await interaction.editReply({
			content: "You have already upvoted this answer.",
			embeds: [],
			components: [],
		});
		return;
	}
	if (hasDownvoted) {
		// remove downvote from log
		messageData.downvotes = messageData.downvotes.filter(downvote => downvote != interaction.user.id);
	}

	// add upvote to log
	messageData.upvotes.push(interaction.user.id);

	allMessageData = allMessageData.filter(savedData => savedData.messageId != answerIdField.value);
	allMessageData.push(messageData);

	const updatedData = await updateGuildData(guild.id, undefined, undefined, allMessageData);
	const guildData2 = updatedData.guildData;

	if (guildData2) {
		allMessageData = guildData2.messageData;
		messageData = allMessageData.find(savedData => savedData.messageId === answerIdField.value);

		if (messageData) {
			const channel = interaction.channel;

			if (channel) {
				const answerMessage = await channel.messages.fetch(answerIdField.value);

				if (answerMessage) {
					const answerEmbed = answerMessage.embeds[0];
					answerEmbed.setFooter(
						`Upvotes: ${messageData.upvotes.length} | Downvotes: ${messageData.downvotes.length}`
					);

					await answerMessage.edit({
						embeds: [answerEmbed],
					});
				}
			}
		}
	}

	//resolve("NYI - buttonUpvote");
	await interaction.editReply({
		content: "Successfully upvoted!",
		embeds: [],
		components: [],
	});
}

export async function buttonDownvote(
	interaction: ButtonInteraction,
	guild: Guild,
	guildData: IGuildData,
	channelForReputation: TextChannel,
	userForReputation: User,
	message: Message
): Promise<void> {
	const answerIdField = message.embeds[0].fields.find(field => field.name === "Answer ID");

	if (!answerIdField) {
		await interaction.update({
			content: "There was no associated answer id on that interaction.",
			embeds: [],
			components: [],
		});
		return;
	}

	const buttons = message.components[0].components;

	if (!buttons) {
		await interaction.update({
			content: "There were no valid buttons on that interaction.",
			embeds: [],
			components: [],
		});
		return;
	}

	await interaction.update({
		content: "Processing downvote.",
		embeds: [],
		components: [],
	});

	let allMessageData = guildData.messageData;
	let messageData = allMessageData.find(savedData => savedData.messageId === answerIdField.value);

	if (!messageData) {
		await interaction.editReply({
			content: "This is not a valid answer to vote on.",
			embeds: [],
			components: [],
		});
		return;
	}

	const hasUpvoted = buttons.find(button => button.customId === "upvote")?.disabled ?? false;
	const hasDownvoted = buttons.find(button => button.customId === "downvote")?.disabled ?? false;

	if (hasUpvoted) {
		// remove downvote from log
		messageData.upvotes = messageData.upvotes.filter(upvote => upvote != interaction.user.id);
	}
	if (hasDownvoted) {
		await interaction.editReply({
			content: "You have already dowmvoted this answer.",
			embeds: [],
			components: [],
		});
		return;
	}

	// add downvote to log
	messageData.downvotes.push(interaction.user.id);

	allMessageData = allMessageData.filter(savedData => savedData.messageId != answerIdField.value);
	allMessageData.push(messageData);

	const updatedData = await updateGuildData(guild.id, undefined, undefined, allMessageData);
	const guildData2 = updatedData.guildData;

	if (guildData2) {
		allMessageData = guildData2.messageData;
		messageData = allMessageData.find(savedData => savedData.messageId === answerIdField.value);

		if (messageData) {
			const channel = interaction.channel;

			if (channel) {
				const answerMessage = await channel.messages.fetch(answerIdField.value);

				if (answerMessage) {
					const answerEmbed = answerMessage.embeds[0];
					answerEmbed.setFooter(
						`Upvotes: ${messageData.upvotes.length} | Downvotes: ${messageData.downvotes.length}`
					);

					await answerMessage.edit({
						embeds: [answerEmbed],
					});
				}
			}
		}
	}

	//resolve("NYI - buttonUpvote");
	await interaction.editReply({
		content: "Successfully downvoted!",
		embeds: [],
		components: [],
	});
}
