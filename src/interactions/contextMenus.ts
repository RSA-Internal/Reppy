import { ContextMenuInteraction, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { fetchGuildData } from "../daos/GuildDataDAO";

export async function contextConvertToAnswer(interaction: ContextMenuInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const guild = interaction.guild;

	if (guild) {
		const fetchResult = await fetchGuildData(guild.id);
		const guildData = fetchResult.guildData;

		if (guildData) {
			const message = interaction.options["_hoistedOptions"][0].message as Message;

			if (message) {
				const channel = message.channel;

				if (channel && channel.isThread()) {
					const parent = channel.parentId;

					if (parent && guildData.validChannels.includes(parent)) {
						const author = message.author.id;

						if (interaction.user.id === author) {
							// convert to answer.
							if (message.embeds.length > 0) {
								await interaction.editReply("This message is already an answer.");
							} else {
								const content = message.content;
								const member = await guild.members.fetch(author);

								await channel.send({
									embeds: [
										new MessageEmbed()
											.setTitle("Answer")
											.setAuthor(member.displayName)
											.addField("\u200b", content, true)
											.setFooter("Upvotes: 0 | Downvotes: 0"),
									],
									components: [
										new MessageActionRow().addComponents([
											new MessageButton()
												.setCustomId("upvote")
												.setLabel("Upvote")
												.setStyle("PRIMARY"),
											new MessageButton()
												.setCustomId("downvote")
												.setLabel("Downvote")
												.setStyle("DANGER"),
										]),
									],
								});

								await message.delete();
								await interaction.editReply("Message successfully converted to an answer.");
							}
						} else {
							await interaction.editReply(
								"You are not allowed to convert another member's message to a answer."
							);
						}
					} else {
						await interaction.editReply("This channel is not under valid reputation gainable channel.");
					}
				} else {
					await interaction.editReply("This is not a valid location to convert a message to an answer.");
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

export async function contextAcceptAnswer(interaction: ContextMenuInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const guild = interaction.guild;

	if (guild) {
		const fetchResult = await fetchGuildData(guild.id);
		const guildData = fetchResult.guildData;

		if (guildData) {
			const message = interaction.options["_hoistedOptions"][0].message as Message;

			if (message) {
				const channel = message.channel;

				if (channel && channel.isThread()) {
					const parent = channel.parent;

					if (parent && guildData.validChannels.includes(parent.id)) {
						const startMessage = await parent.messages.fetch(channel.id);

						if (startMessage) {
							const threadAuthor = startMessage.author.id;

							if (interaction.user.id === threadAuthor) {
								if (message.embeds.length > 0) {
									const updatedEmbed = message.embeds[0];
									updatedEmbed.setTitle("<:author_accepted:869447434089160710> Answer");

									await message.edit({ embeds: [updatedEmbed], components: message.components });
									await interaction.editReply("You have successfully accepted an answer.");
								} else {
									await interaction.editReply("That is not a valid answer to accept.");
								}
							} else {
								await interaction.editReply(
									"You are not allowed to accept an answer for another member's question."
								);
							}
						} else {
							await interaction.editReply("Could not fetch start message. Please try again.");
						}
					} else {
						await interaction.editReply("This channel is not under valid reputation gainable channel.");
					}
				} else {
					await interaction.editReply("This is not a valid location to convert a message to an answer.");
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

export async function contextFlag(interaction: ContextMenuInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const guild = interaction.guild;

	if (guild) {
		const fetchResult = await fetchGuildData(guild.id);
		const guildData = fetchResult.guildData;

		if (guildData) {
			const message = interaction.options["_hoistedOptions"][0].message as Message;
			const reportChannelId = guildData.reportChannelId;

			if (!message.channel.isThread()) {
				await interaction.editReply("Cannot flag this message.");
				return;
			}

			if (reportChannelId) {
				const reportChannel = await guild.channels.fetch(reportChannelId);

				if (reportChannel && reportChannel.isText()) {
					await reportChannel.send({
						embeds: [
							new MessageEmbed()
								.setTitle("Flagged Content")
								.setDescription(
									`Flagged by ${(await guild.members.fetch(interaction.user.id)).displayName}`
								)
								.addField("Thread", `<#${message.channel.id}>`, false)
								.addField("Jump Link", message.url, false),
						],
					});

					await interaction.editReply("Successfully flagged message.");
				} else {
					await interaction.editReply(
						"This guild does not have a valid report channel. Please tell someone to update it."
					);
				}
			} else {
				await interaction.editReply(
					"This guild does not have a report channel. Please tell someone to set it."
				);
			}
		} else {
			await interaction.editReply(fetchResult.message);
		}
	} else {
		await interaction.editReply("Failed to fetch guildId from interaction.");
	}

	return;
}
