import type { ButtonInteraction, Guild, Message, Snowflake, TextBasedChannels } from "discord.js";
import { getPrettyTimeRemaining } from "../dailyReset";
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
	repChange: number;
	lifetimeChange?: {
		upvote: number;
		downvote: number;
	};
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
			repChange: 0,
		};
	}

	if (voteType == VoteStatus.UPVOTE) {
		// already upvoted
		if (voteStatus === VoteStatus.UPVOTE) {
			messageData.upvotes = messageData.upvotes.filter(upvote => upvote != userId);
			repChange -= 1; // -1 for removal of upvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully removed upvote.",
				repChange,
				lifetimeChange: {
					upvote: -1,
					downvote: 0,
				},
			};
		}

		// adding upvote - downvote
		if (voteStatus === VoteStatus.DOWNVOTE) {
			messageData.downvotes = messageData.downvotes.filter(downvote => downvote != userId);
			messageData.upvotes.push(userId);
			repChange += 2; // +1 for removal of downvote, +1 for new upvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully upvoted!",
				repChange,
				lifetimeChange: {
					upvote: 1,
					downvote: -1,
				},
			};
		}

		// adding upvote - novote
		if (voteStatus === VoteStatus.NOVOTE) {
			messageData.upvotes.push(userId);
			repChange += 1; // +1 for new upvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully upvoted!",
				repChange,
				lifetimeChange: {
					upvote: 1,
					downvote: 0,
				},
			};
		}
	}

	if (voteType == VoteStatus.DOWNVOTE) {
		// already downvoted
		if (voteStatus === VoteStatus.DOWNVOTE) {
			messageData.downvotes = messageData.downvotes.filter(downvote => downvote != userId);
			repChange += 1; // +1 for removal of downvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully removed downvote.",
				repChange,
				lifetimeChange: {
					upvote: 0,
					downvote: -1,
				},
			};
		}

		// adding downvote -- upvote
		if (voteStatus === VoteStatus.UPVOTE) {
			messageData.upvotes = messageData.upvotes.filter(upvote => upvote != userId);
			messageData.downvotes.push(userId);
			repChange -= 2; // -1 for removal of upvote, -1 for new downvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully downvoted!",
				repChange,
				lifetimeChange: {
					upvote: -1,
					downvote: 1,
				},
			};
		}

		// adding downvote - novote
		if (voteStatus === VoteStatus.NOVOTE) {
			messageData.downvotes.push(userId);
			repChange -= 1; // -1 for new downvote
			returnData.push(messageData);
			return {
				result: true,
				updatedMessages: returnData,
				message: "Successfully downvoted!",
				repChange,
				lifetimeChange: {
					upvote: 0,
					downvote: 1,
				},
			};
		}
	}

	return {
		result: false,
		updatedMessages: returnData,
		message: `Failed to cast vote.`,
		repChange,
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
	// Handle fetchOrCreate for UserData that is voting
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

	// Handle check of vote availabilty
	const pool = votingUserData.pool;
	const count = voteType === VoteStatus.UPVOTE ? pool.upvotes : pool.downvotes;

	if (count <= 0) {
		await interaction.update({
			content: `Your daily pool is empty. Please wait ${getPrettyTimeRemaining()} for it to be refilled.`,
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

	// Find associated answer
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
		content: `Processing ${voteType === VoteStatus.UPVOTE ? "upvote" : "downvote"}.`,
		embeds: [],
		components: [],
	});

	// Update answer votes
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

	// Update voting user UserData for daily votes
	await updateUserData(guildData.guildId, interaction.user.id, { pool });

	// fetchOrCreate UserData for Answering User
	const userData = (await fetchUserData(guildData.guildId, repData.memberId)).userData;

	if (!userData) {
		await createUserData(guildData.guildId, repData.memberId, repData.channelId, updateResult.repChange);
	} else {
		let oldReputation = 0;

		const channelData = userData.reputation.find(channel => channel.channelId === repData.channelId);
		if (channelData) {
			oldReputation = channelData.reputation;
		}

		await updateUserData(guildData.guildId, repData.memberId, {
			channelId: repData.channelId,
			newReputation: oldReputation + updateResult.repChange,
		});

		const lifetime = userData.lifetime;
		let lifetimeUpdate = updateResult.lifetimeChange;

		if (!lifetimeUpdate) {
			lifetimeUpdate = {
				upvote: voteType === VoteStatus.UPVOTE ? 1 : 0,
				downvote: voteType === VoteStatus.DOWNVOTE ? 1 : 0,
			};
		}

		lifetime.upvotes += lifetimeUpdate.upvote;
		lifetime.downvotes += lifetimeUpdate.downvote;

		await updateUserData(guildData.guildId, repData.memberId, {
			lifetime,
		});
	}

	// Update global GuildData with new UserData
	const updatedData = await updateGuildData(guild.id, undefined, undefined, updateResult.updatedMessages);
	const channel = interaction.channel;
	if (channel) await rerenderVotes(updatedData, channel, answerIdField.value);

	await interaction.editReply({
		content: updateResult.message,
		embeds: [],
		components: [],
	});
}
