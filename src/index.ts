import {
	ApplicationCommandData,
	ApplicationCommandPermissionData,
	Client,
	CommandInteraction,
	Intents,
	Message,
	MessagePayload,
	Permissions,
	TextChannel,
	WebhookEditMessageOptions,
} from "discord.js";
import { readFileSync } from "fs";
import { connect } from "mongoose";
import { init } from "./dailyReset";
import { createGuildData, fetchGuildData } from "./daos/GuildDataDAO";
import { handleVote, ReputationHolder, VoteStatus } from "./interactions/buttons";
import {
	contextAcceptAnswer,
	contextConvertToAnswer,
	contextConvertToQuestion,
	contextFlag,
	contextViewRep,
	contextVote,
} from "./interactions/contextMenus";
import { slashCommandSet, slashCommandUpdate, slashCommandView } from "./interactions/slashCommands";
import { DetectionType, isMessageQuestion } from "./util";

function main(client: Client, dbUri: string) {
	client.once("ready", () => {
		console.log("Client logged in.");
		init();

		const context_convert_to_answer = { name: "Convert to Answer", type: 3 };
		const context_convert_to_question = { name: "Convert to Question", type: 3 };
		const context_accept_answer = { name: "Accept Answer", type: 3 };
		const context_flag = { name: "Flag", type: 3 };
		const context_vote = { name: "Vote", type: 3 };

		const context_rep = { name: "View Rep", type: 2 };

		const slash_command_update: ApplicationCommandData = {
			name: "update",
			description: "Toggle a valid channel (up to 5) for this guild.",
			options: [
				{
					type: "CHANNEL",
					name: "channel-1",
					description: "Channel to toggle",
					required: true,
				},
				{
					type: "CHANNEL",
					name: "channel-2",
					description: "Channel to toggle",
				},
				{
					type: "CHANNEL",
					name: "channel-3",
					description: "Channel to toggle",
				},
				{
					type: "CHANNEL",
					name: "channel-4",
					description: "Channel to toggle",
				},
				{
					type: "CHANNEL",
					name: "channel-5",
					description: "Channel to toggle",
				},
			],
			defaultPermission: false,
		};

		const slash_command_view: ApplicationCommandData = {
			name: "view",
			description: "View valid channels in mentioned format.",
		};

		const slash_command_set: ApplicationCommandData = {
			name: "set",
			description: "Set the reportChannel",
			options: [
				{
					type: "CHANNEL",
					name: "reportchannel",
					description: "The channel flagged messages get sent to.",
					required: true,
				},
			],
			defaultPermission: false,
		};

		const command_application_payload = [
			context_convert_to_answer,
			context_convert_to_question,
			context_accept_answer,
			context_flag,
			context_vote,
			context_rep,
			slash_command_update,
			slash_command_view,
			slash_command_set,
		];

		client.guilds
			.fetch()
			.then(guilds => {
				guilds.forEach(oauthGuild => {
					oauthGuild
						.fetch()
						.then(guild => {
							const commands = guild.commands;
							if (commands) {
								commands
									.set(command_application_payload)
									.then(commandData => {
										const slash_command_update = commandData.find(
											commandObject => commandObject.name === "update"
										);
										const slash_command_set = commandData.find(
											commandObject => commandObject.name === "set"
										);

										if (slash_command_update && slash_command_set) {
											const permissibleRoles: ApplicationCommandPermissionData[] = [];

											guild.roles
												.fetch()
												.then(roles => {
													roles.forEach(role => {
														if (role.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
															permissibleRoles.push({
																id: role.id,
																type: "ROLE",
																permission: true,
															});
														}
													});
												})
												.then(() => {
													commands.permissions
														.set({
															fullPermissions: [
																{
																	id: slash_command_update.id,
																	permissions: permissibleRoles,
																},
																{
																	id: slash_command_set.id,
																	permissions: permissibleRoles,
																},
															],
														})
														.catch(console.warn.bind(console));
												})
												.catch(console.warn.bind(console));
										} else {
											console.error("Could not find slash_command_update");
										}
									})
									.catch(console.warn.bind(console));
							}
						})
						.catch(console.warn.bind(console));
				});
			})
			.catch(console.warn.bind(console));
	});

	client.on("messageCreate", async message => {
		const guild = message.guild;

		if (!guild) return;

		const fetchedResult = await fetchGuildData(guild.id);
		let guildData = fetchedResult.guildData;

		if (!guildData) guildData = (await createGuildData(guild.id)).guildData;
		if (!guildData) return;

		if (!guildData.validChannels.includes(message.channelId)) return;

		const messageGrade = isMessageQuestion(DetectionType.MESSAGE, message.content);
		if (messageGrade.isQuestion) {
			message
				.startThread({
					name: message.content.substring(0, message.content.indexOf("?") || message.content.indexOf(".")),
					autoArchiveDuration: 1440,
					reason: `contextConvertToQuestion by AutomatedCheck.`,
				})
				.catch(console.error.bind(console));
		}
	});

	client.on("interactionCreate", async interaction => {
		const guild = interaction.guild;

		if (!guild)
			return await (interaction as CommandInteraction).reply({
				ephemeral: true,
				content: "Failed to fetch guild.",
			});

		const fetchedResult = await fetchGuildData(guild.id);
		let guildData = fetchedResult.guildData;

		if (!guildData) guildData = (await createGuildData(guild.id)).guildData;
		if (!guildData)
			return await (interaction as CommandInteraction).reply({
				ephemeral: true,
				content: "Failed to fetch|create guildData.",
			});

		let result: string | MessagePayload | WebhookEditMessageOptions;

		if (interaction.isCommand()) {
			await interaction.deferReply({ ephemeral: true });
			const args = interaction.options["_hoistedOptions"];

			if (interaction.commandName === "update") {
				result = await slashCommandUpdate(guild, guildData, args);
			} else if (interaction.commandName === "view") {
				result = await slashCommandView(guildData);
			} else if (interaction.commandName === "set") {
				result = await slashCommandSet(guild, args);
			} else {
				result = "Invalid interactionData received.";
			}

			await interaction.editReply(result);
		} else if (interaction.isContextMenu()) {
			await interaction.deferReply({ ephemeral: true });
			const message = interaction.options["_hoistedOptions"][0].message as Message;

			if (interaction.commandName === "Convert to Answer") {
				result = await contextConvertToAnswer(interaction, guild, guildData, message, message.channel);
			} else if (interaction.commandName === "Convert to Question") {
				result = await contextConvertToQuestion(interaction, guildData, message, message.channel);
			} else if (interaction.commandName === "Accept Answer") {
				result = await contextAcceptAnswer(interaction, guildData, message, message.channel);
			} else if (interaction.commandName === "Flag") {
				result = await contextFlag(interaction, guild, guildData, message);
			} else if (interaction.commandName === "Vote") {
				result = await contextVote(interaction, guildData, message);
			} else if (interaction.commandName === "View Rep") {
				result = await contextViewRep(interaction, guild);
			} else {
				result = "Invalid interactionData received.";
			}

			await interaction.editReply(result);
		} else if (interaction.isButton()) {
			const channel = interaction.channel;

			result = "Invalid interactionData received.";

			if (channel && channel.isThread()) {
				const channelForReputation = channel.parent as TextChannel;
				const message = interaction.message as Message;
				const userForReputation = message.embeds[0].fields.find(field => field.name === "Answer Poster")?.value;

				const repData: ReputationHolder = {
					channelId: channelForReputation.id,
					memberId: userForReputation?.slice(2, userForReputation.length - 1) ?? "-1",
				};

				if (interaction.customId === "upvote") {
					await handleVote(interaction, guild, guildData, message, VoteStatus.UPVOTE, repData);
				} else if (interaction.customId === "downvote") {
					await handleVote(interaction, guild, guildData, message, VoteStatus.DOWNVOTE, repData);
				}
			}
		}
	});

	client.on("guildCreate", guild => {
		createGuildData(guild.id).catch(console.warn.bind(console));
	});

	// Connect to the database.
	connect(dbUri, {
		ssl: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useNewUrlParser: true,
		useUnifiedTopology: true,
	}).catch(console.warn.bind(console));
}

let client: Client | undefined;

try {
	const { token, dbUri } = JSON.parse(readFileSync("token.json", "utf-8")) as { token: string; dbUri: string };

	if (token.length === 0) {
		throw new Error("Invalid token provided. Please be sure that `token.json` contains your bot token.");
	}

	client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	if (client != undefined) {
		client
			.login(token)
			.then(() => main(client as Client, dbUri))
			.catch(console.error.bind(console));
	}
} catch (e) {
	console.error(e);
}

export default client;
