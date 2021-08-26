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
import { updateGuildData } from "../daos/GuildDataDAO";
import type { IGuildData, IMessageData } from "../models/guildData.model";

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
	guild: Guild,
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
					message
						.startThread({
							name: message.content.substring(
								0,
								message.content.indexOf("?") || message.content.indexOf(".")
							),
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
	guild: Guild,
	guildData: IGuildData,
	message: Message,
	channel: TextBasedChannels
): Promise<string> {
	return new Promise(resolve => {
		if (channel.isThread()) {
			const parent = channel.parent;

			if (parent && guildData.validChannels.includes(parent.id)) {
				parent.messages
					.fetch(channel.id)
					.then(startMessage => {
						if (startMessage) {
							const threadAuthor = startMessage.author.id;

							if (interaction.user.id === threadAuthor) {
								if (message.embeds.length > 0) {
									const updatedEmbed = message.embeds[0];
									updatedEmbed.setTitle("<:author_accepted:869447434089160710> Answer");

									message
										.edit({ embeds: [updatedEmbed], components: message.components })
										.then(() => {
											return resolve("You have successfully accepted an answer.");
										})
										.catch((err: Error) => resolve(err.message));
								} else {
									return resolve("That is not a valid answer to accept.");
								}
							} else {
								return resolve(
									"You are not allowed to accept an answer for another member's question."
								);
							}
						} else {
							return resolve("Could not fetch start message. Please try again.");
						}
					})
					.catch((err: Error) => resolve(err.message));
			} else {
				return resolve("This channel is not under valid reputation gainable channel.");
			}
		} else {
			return resolve("This is not a valid location to convert a message to an answer.");
		}
	});
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
	guild: Guild,
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

		let hasUpvoted = false;
		let hasDownvoted = false;
		let posterId = "";

		if (messageData) {
			hasUpvoted = messageData.upvotes.includes(interaction.user.id);
			hasDownvoted = messageData.downvotes.includes(interaction.user.id);
			posterId = messageData.posterId;
		}

		buttonData.push(
			new MessageButton().setCustomId("upvote").setLabel("Upvote").setStyle("PRIMARY").setDisabled(hasUpvoted)
		);
		buttonData.push(
			new MessageButton()
				.setCustomId("downvote")
				.setLabel("Downvote")
				.setStyle("DANGER")
				.setDisabled(hasDownvoted)
		);

		guild.members
			.fetch(posterId)
			.then(member => {
				resolve({
					embeds: [
						new MessageEmbed()
							.setTitle("Rep Voting")
							.addField("Answer Poster", member.displayName, false)
							.addField("Answer ID", message.id, false)
							.addField("Answer", message.embeds[0].fields[0].value, false),
					],
					components: [new MessageActionRow().addComponents(buttonData)],
				});
			})
			.catch((err: Error) => {
				console.error(err);

				resolve({
					embeds: [
						new MessageEmbed()
							.setTitle("Rep Voting")
							.addField("Answer Poster", posterId, false)
							.addField("Answer ID", message.id, false)
							.addField("Answer", message.embeds[0].fields[0].value, false),
					],
					components: [new MessageActionRow().addComponents(buttonData)],
				});
			});
	});
}
