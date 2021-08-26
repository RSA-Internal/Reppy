import type { ButtonInteraction, Guild, Message, Snowflake, TextBasedChannels } from "discord.js";
import { createUserData, fetchUserData, IDAOResult, updateGuildData, updateUserData } from "../daos/GuildDataDAO";
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
	repDelta: number;
}

export interface ReputationHolder {
	memberId: Snowflake;
	channelId: Snowflake;
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
	let repChange = 0;

	if (!messageData) {
		return {
			result: false,
			message: "This is not a valid answer to vote on.",
			repDelta: 0,
		};
	}

	if (voteStatus === VoteStatus.UPVOTE && voteType === VoteStatus.UPVOTE) {
		messageData.upvotes = messageData.upvotes.filter(upvote => upvote != userId);
		repChange -= 1;
		returnData.push(messageData);
		return {
			result: true,
			updatedMessages: returnData,
			message: "Successfully removed upvote",
			repDelta: repChange,
		};
	}

	if (voteStatus === VoteStatus.UPVOTE && voteType === VoteStatus.DOWNVOTE) {
		messageData.upvotes = messageData.upvotes.filter(upvote => upvote != userId);
		repChange -= 1;
	}

	if (voteStatus === VoteStatus.DOWNVOTE && voteType === VoteStatus.UPVOTE) {
		messageData.downvotes = messageData.downvotes.filter(downvote => downvote != userId);
		repChange += 1;
	}

	if (voteStatus === VoteStatus.DOWNVOTE && voteType === VoteStatus.DOWNVOTE) {
		messageData.downvotes = messageData.downvotes.filter(downvote => downvote != userId);
		repChange += 1;
		returnData.push(messageData);
		return {
			result: true,
			updatedMessages: returnData,
			message: "Successfully removed downvote",
			repDelta: repChange,
		};
	}

	if (voteType === VoteStatus.UPVOTE) {
		messageData.upvotes.push(userId);
		repChange += 1;
	} else {
		messageData.downvotes.push(userId);
		repChange -= 1;
	}

	returnData.push(messageData);

	return {
		result: true,
		updatedMessages: returnData,
		message: `Successfully ${voteType === VoteStatus.UPVOTE ? "upvoted" : "downvoted"}`,
		repDelta: repChange,
	};
}

export async function handleVote(
	interaction: ButtonInteraction,
	guild: Guild,
	guildData: IGuildData,
	message: Message,
	voteType: VoteStatus,
	repData: ReputationHolder
): Promise<void> {
	let votingUserData = (await fetchUserData(guildData.guildId, interaction.user.id)).userData;

	if (!votingUserData) {
		const createResult = await createUserData(guildData.guildId, interaction.user.id);
		votingUserData = createResult.userData;

		if (!votingUserData) {
			await interaction.update({
				content: createResult.message,
				embeds: [],
				components: [],
			});
			return;
		}
	}

	const pool = votingUserData.pool;
	const count = voteType === VoteStatus.UPVOTE ? pool.upvotes : pool.downvotes;

	if (count <= 0) {
		await interaction.update({
			content: "Your daily pool is empty. Please wait ${timeFormatInHours} for it to be refilled.",
			embeds: [],
			components: [],
		});
		return;
	}

	if (voteType === VoteStatus.UPVOTE) {
		pool.upvotes = pool.upvotes - 1;
	} else if (voteType === VoteStatus.DOWNVOTE) {
		pool.downvotes = pool.downvotes - 1;
	}

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
		content: `Processing ${voteType === VoteStatus.UPVOTE ? "upvoted" : "downvoted"}.`,
		embeds: [],
		components: [],
	});

	const allMessageData = guildData.messageData;
	const messageData = allMessageData.find(savedData => savedData.messageId === answerIdField.value);

	let voteStatus = VoteStatus.NOVOTE;

	if (messageData) {
		const hasUpvoted = messageData.upvotes.includes(interaction.user.id);
		const hasDownvoted = messageData.downvotes.includes(interaction.user.id);

		voteStatus = hasUpvoted ? VoteStatus.UPVOTE : hasDownvoted ? VoteStatus.DOWNVOTE : VoteStatus.NOVOTE;
	}

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

	await updateUserData(guildData.guildId, interaction.user.id, { pool });

	const userData = (await fetchUserData(guildData.guildId, repData.memberId)).userData;

	if (!userData) {
		await createUserData(guildData.guildId, repData.memberId, repData.channelId, updateResult.repDelta);
	} else {
		await updateUserData(guildData.guildId, repData.memberId, {
			channelId: repData.channelId,
			reputationChange: updateResult.repDelta,
		});
	}

	const updatedData = await updateGuildData(guild.id, undefined, undefined, updateResult.updatedMessages);
	const channel = interaction.channel;
	if (channel) await rerenderVotes(updatedData, channel, answerIdField.value);

	await interaction.editReply({
		content: updateResult.message,
		embeds: [],
		components: [],
	});
}
