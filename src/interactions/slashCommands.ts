import { CommandInteraction, GuildChannel, MessageEmbed } from "discord.js";
import { createGuildData, fetchGuildData, updateGuildData } from "../daos/GuildDataDAO";

export async function slashCommandUpdate(interaction: CommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const args = interaction.options["_hoistedOptions"];
	const invalidChannels: string[] = [];
	const channelsToUpdate: string[] = [];

	args.forEach(channelArg => {
		if (channelArg.channel) {
			if (channelArg.channel.type === "GUILD_TEXT") {
				channelsToUpdate.push(channelArg.channel.id);
			} else {
				invalidChannels.push(channelArg.channel.id);
			}
		}
	});

	if (channelsToUpdate.length == 0) {
		await interaction.editReply("No channels to update.");
		return;
	}

	const guildId = interaction.guildId;

	if (guildId) {
		const guildDataResult = await fetchGuildData(guildId);
		const guildData = guildDataResult.guildData;

		if (guildData) {
			const savedValidChannels = guildData.validChannels;
			const channelsToRemove: string[] = [];
			const newValidChannels: string[] = [];

			savedValidChannels.forEach(channelId => {
				if (channelsToUpdate.includes(channelId)) {
					channelsToRemove.push(channelId);
				} else {
					newValidChannels.push(channelId);
				}
			});

			channelsToUpdate.forEach(channelId => {
				if (!channelsToRemove.includes(channelId)) {
					newValidChannels.push(channelId);
				}
			});

			const updateResult = await updateGuildData(guildId, newValidChannels);

			if (updateResult.result) {
				await interaction.editReply(`Successfully updated guildData.`);
			} else {
				await interaction.editReply(updateResult.message);
			}

			return;
		} else {
			const createResult = await createGuildData(guildId, channelsToUpdate);

			if (createResult.result) {
				await interaction.editReply(`Successfully created guildData, and applied validChannels.`);
			} else {
				await interaction.editReply(createResult.message);
			}
			return;
		}
	} else {
		await interaction.editReply("Could not fetch guildId from interaction.");
		return;
	}
}

export async function slashCommandView(interaction: CommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const guild = interaction.guild;

	if (guild) {
		const fetchResult = await fetchGuildData(guild.id);
		const guildData = fetchResult.guildData;

		if (guildData) {
			const validChannels = guildData.validChannels.map(channelId => `<#${channelId}>\n`);
			const reportChannelId = guildData.reportChannelId;

			const embedReply = new MessageEmbed().setTitle("Reputation Gainable Channels");

			let index = 0;
			const left: string[] = [];
			const middle: string[] = [];
			const right: string[] = [];

			validChannels.forEach(channel => {
				if (index === 0) {
					left.push(channel);
					index = 1;
				} else if (index === 1) {
					middle.push(channel);
					index = 2;
				} else if (index === 2) {
					right.push(channel);
					index = 0;
				}
			});

			embedReply.addField(
				"Report Channel",
				reportChannelId.length > 0 ? `<#${reportChannelId}>` : "Not yet set.",
				false
			);

			if (left.length > 0) embedReply.addField("\u200b", left.join(""), true);
			if (middle.length > 0) embedReply.addField("\u200b", middle.join(""), true);
			if (middle.length > 0) embedReply.addField("\u200b", right.join(""), true);

			await interaction.editReply({ embeds: [embedReply] });
		} else {
			await interaction.editReply(fetchResult.message);
		}
	} else {
		await interaction.editReply("Could not fetch guildId from interaction.");
	}
	return;
}

export async function slashCommandSet(interaction: CommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const channel = interaction.options["_hoistedOptions"][0].channel as GuildChannel;

	if (channel && channel.isText()) {
		const guildId = interaction.guildId;

		if (guildId) {
			const guildDataResult = await fetchGuildData(guildId);
			const guildData = guildDataResult.guildData;

			if (guildData) {
				const updateResult = await updateGuildData(guildId, undefined, channel.id);

				if (updateResult.result) {
					await interaction.editReply("Successfully updated guildData.");
				} else {
					await interaction.editReply(updateResult.message);
				}
			} else {
				const createResult = await createGuildData(guildId, [], channel.id);

				if (createResult.result) {
					await interaction.editReply(`Successfully created guildData, and applied validChannels.`);
				} else {
					await interaction.editReply(createResult.message);
				}
				return;
			}
		} else {
			await interaction.editReply("Could not fetch guildId from interaction.");
		}
	} else {
		await interaction.editReply("Invalid channel provided.");
	}

	return;
}
