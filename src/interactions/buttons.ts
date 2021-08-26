import type { ButtonInteraction, Guild, Message, TextBasedChannels } from "discord.js";
import { IDAOResult, updateGuildData } from "../daos/GuildDataDAO";
import type { IGuildData, IMessageData } from "../models/guildData.model";

async function rerenderVotes(updatedData: IDAOResult, channel: TextBasedChannels, messageId: string): Promise<void> {
	const guildData = updatedData.guildData;

	if (guildData) {
		const allMessageData = guildData.messageData;
		const messageData = allMessageData.find(savedData => savedData.messageId === messageId);

		if (messageData && channel) {
			const answerMessage = await channel.messages.fetch(messageId);

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

	return;
}

interface IUpdateResult {
	updatedMessages?: IMessageData[];
	result: boolean;
	message?: string;
}

export enum VoteStatus {
	NOVOTE,
	UPVOTE,
	DOWNVOTE,
}

function updateMessageData(
	userId: string,
	voteType: VoteStatus,
	voteStatus: VoteStatus,
	allMessages: IMessageData[],
	answerId: string
): IUpdateResult {
	const returnData = allMessages.filter(savedData => savedData.messageId != answerId);
	const messageData = allMessages.find(savedData => savedData.messageId === answerId);

	if (!messageData) {
		return {
			result: false,
			message: "This is not a valid answer to vote on.",
		};
	}

	if (voteStatus === VoteStatus.UPVOTE && voteType === VoteStatus.UPVOTE) {
		return {
			result: false,
			message: "You have already upvoted this answer.",
		};
	}

	if (voteStatus === VoteStatus.UPVOTE && voteType === VoteStatus.DOWNVOTE) {
		messageData.upvotes = messageData.upvotes.filter(upvote => upvote != userId);
	}

	if (voteStatus === VoteStatus.DOWNVOTE && voteType === VoteStatus.UPVOTE) {
		messageData.downvotes = messageData.downvotes.filter(downvote => downvote != userId);
	}

	if (voteStatus === VoteStatus.DOWNVOTE && voteType === VoteStatus.DOWNVOTE) {
		return {
			result: false,
			message: "You have already downvoted this answer.",
		};
	}

	if (voteType === VoteStatus.UPVOTE) {
		messageData.upvotes.push(userId);
	} else {
		messageData.downvotes.push(userId);
	}

	returnData.push(messageData);

	return {
		result: true,
		updatedMessages: returnData,
	};
}

export async function handleVote(
	interaction: ButtonInteraction,
	guild: Guild,
	guildData: IGuildData,
	message: Message,
	voteType: VoteStatus
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

	const allMessageData = guildData.messageData;
	const hasUpvoted = buttons.find(button => button.customId === "upvote")?.disabled ?? false;
	const hasDownvoted = buttons.find(button => button.customId === "downvote")?.disabled ?? false;

	const voteStatus = hasUpvoted ? VoteStatus.UPVOTE : hasDownvoted ? VoteStatus.DOWNVOTE : VoteStatus.NOVOTE;

	const updateResult = updateMessageData(
		interaction.user.id,
		voteType,
		voteStatus,
		allMessageData,
		answerIdField.value
	);

	if (!updateResult.result) {
		await interaction.editReply({
			content: `Failed to ${voteType}. [${updateResult.message}]`,
			embeds: [],
			components: [],
		});
		return;
	}

	const updatedData = await updateGuildData(guild.id, undefined, undefined, updateResult.updatedMessages);
	const channel = interaction.channel;
	if (channel) await rerenderVotes(updatedData, channel, answerIdField.value);

	await interaction.editReply({
		content: "Successfully upvoted!",
		embeds: [],
		components: [],
	});
}
