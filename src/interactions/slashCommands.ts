import {
	CommandInteractionOption,
	Guild,
	GuildChannel,
	MessageEmbed,
	MessagePayload,
	WebhookEditMessageOptions,
} from "discord.js";
import { updateGuildData } from "../daos/GuildDataDAO";
import type { IGuildData } from "../models/guildData.model";

export async function slashCommandUpdate(
	guild: Guild,
	guildData: IGuildData,
	args: CommandInteractionOption[]
): Promise<string> {
	return new Promise(resolve => {
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
			return resolve("No channels to update.");
		}

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

		updateGuildData(guild.id, newValidChannels)
			.then(result => {
				if (result.result) {
					return resolve(`Successfully updated guildData.`);
				} else {
					return resolve(result.message);
				}
			})
			.catch((err: Error) => resolve(err.message));
	});
}

export async function slashCommandView(
	guildData: IGuildData
): Promise<string | MessagePayload | WebhookEditMessageOptions> {
	return new Promise(resolve => {
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
		if (right.length > 0) embedReply.addField("\u200b", right.join(""), true);

		resolve({ embeds: [embedReply] });
	});
}

export async function slashCommandSet(guild: Guild, args: CommandInteractionOption[]): Promise<string> {
	return new Promise(resolve => {
		const channel = args[0].channel as GuildChannel;

		if (channel && channel.isText()) {
			updateGuildData(guild.id, undefined, channel.id)
				.then(result => {
					if (result.result) {
						resolve("Successfully updated guildData.");
					} else {
						resolve(result.message);
					}
				})
				.catch((err: Error) => resolve(err.message));
		} else {
			resolve("Invalid channel provided.");
		}
	});
}
