import type { Snowflake } from "discord.js";
import { model, Schema } from "mongoose";

export interface IGuildData extends Document {
	readonly guildId: Snowflake;
	validChannels: string[];
	userData: IUserData[];
	reportChannelId: Snowflake;
	messageData: IMessageData[];
}

export interface IUserData {
	readonly userId: Snowflake;
	readonly reputation: IChannelData[];
	readonly pool: IPoolData;
	readonly lifetime: IPoolData;
	readonly acceptedAnswers: number;
}

export interface IMessageData {
	readonly messageId: Snowflake;
	readonly posterId: Snowflake;
	threadAnswered: Snowflake;
	upvotes: Snowflake[];
	downvotes: Snowflake[];
}

export interface IChannelData {
	readonly channelId: Snowflake;
	reputation: number;
}

export interface IPoolData {
	upvotes: number;
	downvotes: number;
}

export default model<IGuildData>(
	"GuildData",
	new Schema({
		guildId: { type: String, index: true, required: true },
		validChannels: { type: [String], default: [] },
		userData: {
			type: [
				{
					userId: String,
					reputation: [{ channelId: String, reputation: Number }],
					pool: { upvotes: Number, downvotes: Number },
					lifetime: { upvotes: Number, downvotes: Number },
					acceptedAnswers: Number,
				},
			],
			index: true,
			default: [],
		},
		reportChannelId: { type: String, default: "" },
		messageData: {
			type: [
				{ messageId: String, posterId: String, threadAnswered: String, upvotes: [String], downvotes: [String] },
			],
			index: true,
			default: [],
		},
	})
);
