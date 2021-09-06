import {
	ContextMenuInteraction,
	Guild,
	Message,
	MessageActionRow,
	MessageButton,
	MessageEmbed,
	TextBasedChannels,
	WebhookEditMessageOptions,
} from "discord.js";
import { calculateTotalRep, fetchUserData, updateGuildData, updateUserData } from "../daos/GuildDataDAO";
import type { IGuildData, IMessageData } from "../models/guildData.model";
import { DetectionType, isMessageQuestion } from "../util";

export async function contextConvertToAnswer(
	interaction: ContextMenuInteraction,
	guild: Guild,
	guildData: IGuildData,
	message: Message,
	channel: TextBasedChannels
): Promise<string> {
	return new Promise(resolve => {
		if (channel.isThread()) {
			const parent = channel.parentId;

			if (parent && guildData.validChannels.includes(parent)) {
				const author = message.author.id;

				if (interaction.user.id === author) {
					// convert to answer.
					if (message.embeds.length > 0) {
						return resolve("This message is already an answer.");
					} else {
						const content = message.content;
						guild.members
							.fetch(author)
							.then(member => {
								channel
									.send({
										embeds: [
											new MessageEmbed()
												.setTitle("Answer")
												.setAuthor(member.displayName)
												.addField("\u200b", content, true)
												.setFooter("Upvotes: 0 | Downvotes: 0"),
										],
									})
									.then(answerMessage => {
										const messageData = guildData.messageData;
										const newAnswerData: IMessageData = {
											messageId: answerMessage.id,
											posterId: message.author.id,
											upvotes: [],
											downvotes: [],
										};

										messageData.push(newAnswerData);

										updateGuildData(guildData.guildId, undefined, undefined, messageData).catch(
											console.error.bind(console)
										);

										message
											.delete()
											.then(() => {
												return resolve("Message successfully converted to an answer.");
											})
											.catch((err: Error) => resolve(err.message));
									})
									.catch((err: Error) => resolve(err.message));
							})
							.catch((err: Error) => resolve(err.message));
					}
				} else {
					return resolve("You are not allowed to convert another member's message to a answer.");
				}
			} else {
				return resolve("This channel is not under valid reputation gainable channel.");
			}
		} else {
			return resolve("This is not a valid location to convert a message to an answer.");
		}
	});
}

export async function contextConvertToQuestion(
	interaction: ContextMenuInteraction,
	guildData: IGuildData,
	message: Message,
	channel: TextBasedChannels
): Promise<string> {
	return new Promise(resolve => {
		if (guildData.validChannels.includes(channel.id)) {
			const author = message.author.id;

			if (interaction.user.id === author) {
				// convert to question.
				if (!message.hasThread) {
					const messageGrade = isMessageQuestion(DetectionType.CONTEXT, message.content);

					if (!messageGrade.isQuestion)
						return resolve(
							`This message did not qualify as a valid question. [Score: ${messageGrade.score}]`
						);

					message
						.startThread({
							name: message.content
								.substring(0, message.content.indexOf("?") || message.content.indexOf("."))
								.substring(0, 50),
							autoArchiveDuration: 1440,
							reason: `contextConvertToQuestion by ${interaction.user.username}`,
						})
						.then(() => {
							return resolve("Successfully converted message to question.");
						})
						.catch((err: Error) => resolve(err.message));
				} else {
					return resolve(`This message already has an existing question. <#${message.thread?.id}>`);
				}
			} else {
				return resolve("You are not allowed to convert another member's message to a question.");
			}
		} else {
			return resolve("This channel is not a valid reputation gainable channel.");
		}
	});
}

export async function contextAcceptAnswer(
	interaction: ContextMenuInteraction,
	guildData: IGuildData,
	message: Message,
	channel: TextBasedChannels
): Promise<string> {
	if (!channel.isThread()) return Promise.resolve("This is not a valid channel to accept an answer in.");
	const parent = channel.parent;

	if (!parent || !guildData.validChannels.includes(parent.id))
		return Promise.resolve("This channel is not a valid reputation gainable channel.");

	const startMessage = await parent.messages.fetch(channel.id);

	if (!startMessage) return Promise.resolve("Could not fetch start message. Please try again.");

	const messageData = guildData.messageData.find(storedMessage => storedMessage.messageId === message.id);

	const threadAuthor = startMessage.author.id;
	// Fetch answer author, or assign to thread author to prevent potential rep manipulation
	const answerAuthor = messageData ? messageData.posterId : threadAuthor;

	if (interaction.user.id != threadAuthor)
		return Promise.resolve("You are not allowed to accept an answer for another member's question.");

	const answerEmbed = message.embeds[0];

	if (!answerEmbed) return Promise.resolve("That is not a valid answer to accept.");

	// TODO: Implement check for already accepted answers.
	answerEmbed.setTitle("<:author_accepted:869447434089160710> Answer");

	// TODO: Add +1 Rep and +1 Accepted answer to answerAuthor if not threadAuthor
	if (answerAuthor != threadAuthor) {
		const userData = (await fetchUserData(guildData.guildId, answerAuthor)).userData;

		if (!userData)
			return Promise.resolve(
				`Failed to apply answer reputation to user. Please notify send a member of staff the following message: {${answerAuthor}:1:${message.id}}`
			);

		const channelData = userData.reputation.find(channel => channel.channelId === parent.id);
		let currentChannelRep = 1;
		if (channelData) {
			currentChannelRep += channelData.reputation;
		}

		await updateUserData(guildData.guildId, answerAuthor, { acceptedAnswers: userData.acceptedAnswers + 1 });
		await updateUserData(guildData.guildId, answerAuthor, {
			channelId: parent.id,
			newReputation: currentChannelRep,
		});
	}

	await message.edit({ embeds: [answerEmbed], components: message.components }).catch(console.error.bind(console));

	return Promise.resolve("NYI - Accept Answer");
}

export async function contextFlag(
	interaction: ContextMenuInteraction,
	guild: Guild,
	guildData: IGuildData,
	message: Message
): Promise<string> {
	return new Promise(resolve => {
		const reportChannelId = guildData.reportChannelId;

		if (!message.channel.isThread()) {
			return resolve("Cannot flag this message.");
		}

		if (reportChannelId) {
			guild.channels
				.fetch(reportChannelId)
				.then(async reportChannel => {
					if (reportChannel && reportChannel.isText()) {
						reportChannel
							.send({
								embeds: [
									new MessageEmbed()
										.setTitle("Flagged Content")
										.setDescription(
											`Flagged by ${(await guild.members.fetch(interaction.user.id)).displayName}`
										)
										.addField("Thread", `<#${message.channel.id}>`, false)
										.addField("Jump Link", message.url, false),
								],
							})
							.then(() => {
								return resolve("Successfully flagged message.");
							})
							.catch((err: Error) => resolve(err.message));
					} else {
						return resolve(
							"This guild does not have a valid report channel. Please tell someone to update it."
						);
					}
				})
				.catch((err: Error) => resolve(err.message));
		} else {
			return resolve("This guild does not have a report channel. Please tell someone to set it.");
		}
	});
}

export async function contextVote(
	interaction: ContextMenuInteraction,
	guildData: IGuildData,
	message: Message
): Promise<WebhookEditMessageOptions> {
	return new Promise(resolve => {
		if (!message.channel.isThread()) {
			return resolve({ content: "Cannot vote on this message." });
		}

		// validate message is Answer
		if (message.embeds.length === 0) return resolve({ content: "This is not a valid answer." });

		// Check if User has up/down voted already
		const messageData = guildData.messageData.find(storedMessage => storedMessage.messageId === message.id);

		const buttonData: MessageButton[] = [];

		let posterId = "";

		if (messageData) {
			posterId = messageData.posterId;
		}

		if (posterId === interaction.user.id) return resolve({ content: "You can not vote on your own answers." });

		buttonData.push(new MessageButton().setCustomId("upvote").setLabel("Upvote").setStyle("PRIMARY"));
		buttonData.push(new MessageButton().setCustomId("downvote").setLabel("Downvote").setStyle("DANGER"));

		resolve({
			embeds: [
				new MessageEmbed()
					.setTitle("Rep Voting")
					.addField("Answer Poster", `<@${posterId}>`, false)
					.addField("Answer ID", message.id, false)
					.addField("Answer", message.embeds[0].fields[0].value, false),
			],
			components: [new MessageActionRow().addComponents(buttonData)],
		});
	});
}

export async function contextViewRep(
	interaction: ContextMenuInteraction,
	guild: Guild
): Promise<WebhookEditMessageOptions> {
	const guildId = guild.id;
	const userId = interaction.targetId;

	const member = await guild.members.fetch(userId);

	const userDataResult = await fetchUserData(guildId, userId);

	if (!userDataResult || !userDataResult.result) return Promise.resolve({ content: userDataResult.message });

	const userData = userDataResult.userData;

	if (!userData) return Promise.resolve({ content: "No userData exists." });

	const channelMapping: { [index: string]: string } = {};

	(await guild.channels.fetch()).map(channel => {
		if (channel.isText()) {
			channelMapping[channel.id] = channel.name;
		}
	});

	return Promise.resolve({
		embeds: [
			new MessageEmbed()
				.setTitle(`Reputation for ${member.displayName}`)
				.setDescription(`Total Reputation: ${calculateTotalRep(userData.reputation)}`)
				.addField(
					"\u200b",
					userData.reputation
						.map(channelData => {
							return `${channelMapping[channelData.channelId]}: ${String(channelData.reputation)}`;
						})
						.join("\n"),
					true
				)
				.setFooter(
					`Accepted Answers: ${userData.acceptedAnswers}\nLifetime Upvotes: ${
						userData.lifetime.upvotes ?? 0
					}\nLifetime Downvotes: ${userData.lifetime.downvotes ?? 0}`
				),

			/**
				 * {
					name: "\u200b",
					value: ;
					}).join("\n"),
					inline: true
				}
				 */
		],
	});
}
