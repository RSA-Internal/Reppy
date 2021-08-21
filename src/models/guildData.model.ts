import type { Snowflake } from "discord.js";
import { model, Schema } from "mongoose";

export interface IGuildData extends Document {
	readonly guildId: Snowflake;
	validChannels: string[];
	userData: IUserData[];
	reportChannelId: Snowflake;
}

export interface IUserData {
	readonly userId: Snowflake;
	readonly reputation: readonly IChannelData[];
}

export interface IChannelData {
	readonly channelId: Snowflake;
	readonly reputation: number;
}

export default model<IGuildData>(
	"GuildData",
	new Schema({
		guildId: { type: String, index: true, required: true },
		validChannels: { type: [String], default: [] },
		userData: {
			type: [{ userId: String, reputation: [{ channelId: String, reputation: Number }] }],
			index: true,
			default: [],
		},
		reportChannelId: { type: String, default: "" },
	})
);
