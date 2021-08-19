/**
	 	Data points - Per Guild

		User Reputation
		Valid Channels

		guildData [
			{
				guildId: "-1",
				validChannels: {
					"1234",
					"5678"
				},
				userData: [
					{
						userId: "169208961533345792",
						reputation: [
							{
								"channelId": "1234",
								"reputation": 345
							},
							{
								"channelId": 5678",
								"reputation": 12
							}
						]
					},
					{
						userId: "454873852254617601",
						reputation: [
							{
								"channelId": "1234",
								"reputation": 345
							},
							{
								"channelId": 5678",
								"reputation": 12
							}
						]
					}
				]
			}
		]
	 */

import type { Snowflake } from "discord.js";
import { model, Schema } from "mongoose";

export interface IGuildData extends Document {
	readonly guildId: Snowflake;
	readonly validChannels: readonly string[];
	readonly userData: readonly IUserData[];
}

export interface IUserData extends Document {
	readonly userId: Snowflake;
	readonly reputation: readonly IChannelData[];
}

export interface IChannelData extends Document {
	readonly channelId: Snowflake;
	readonly reputation: number;
}

export default model<IGuildData>(
	"GuildData",
	new Schema({
		guildId: { type: String, index: true, required: true },
		validChannels: { type: [String], default: [] },
		userData: { type: [{ userId: String, reputation: [{ channelId: String, reputation: Number }] }], index: true, default: [] },
	})
);
