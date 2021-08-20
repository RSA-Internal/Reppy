import { ApplicationCommandData, ApplicationCommandPermissionData, Client, Intents, Permissions } from "discord.js";
import { readFileSync } from "fs";
import { connect } from "mongoose";
import {
	contextAcceptAnswer,
	contextConvertToAnswer,
	contextConvertToQuestion,
	contextFlag,
} from "./interactions/contextMenus";
import { slashCommandUpdate } from "./interactions/slashCommands";

function main(client: Client, dbUri: string) {
	client.once("ready", () => {
		console.log("Client logged in.");

		const context_convert_to_answer = { name: "Convert to Answer", type: 3 };
		const context_convert_to_question = { name: "Convert to Question", type: 3 };
		const context_accept_answer = { name: "Accept Answer", type: 3 };
		const context_flag = { name: "Flag", type: 3 };

		/**
		 * Slash command impl for add / remove channels
		 *
		 * update [channelIds]
		 *
		 * If the DB contains the ID, remove it
		 * If the DB does not contain the ID, add it
		 *
		 * Permission: MANAGE_GUILD
		 *
		 * Permission Check: Iterate each Role, check if has MANAGE_GUILD and add to permission list
		 */

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

		const command_application_payload = [
			context_convert_to_answer,
			context_convert_to_question,
			context_accept_answer,
			context_flag,
			slash_command_update,
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
										const slash_command = commandData.find(
											commandObject => commandObject.name === "update"
										);

										if (slash_command) {
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
																	id: slash_command.id,
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

	/**
	 	Needed Events

		messageCreate
		- question inference

		interactionCreate
		- buttons
		  + upvote
		  + downvote
		- context_menus
		  + convert_to_answer
		  + convert_to_question
		  + accept_answer
		  + flag
		    * spam
		    * broad
			* other
	*/

	client.on("messageCreate", () => {
		console.log("Message received.");

		// check if message is in valid channel for guild
	});

	client.on("interactionCreate", interaction => {
		if (interaction.isCommand()) {
			if (interaction.commandName === "update") {
				slashCommandUpdate(interaction);
			} else {
				interaction
					.reply({ ephemeral: true, content: "Invalid interactionData received." })
					.catch(console.error.bind(console));
			}
		} else if (interaction.isContextMenu()) {
			if (interaction.commandName === "Convert to Answer") {
				contextConvertToAnswer(interaction);
			} else if (interaction.commandName === "Convert to Question") {
				contextConvertToQuestion(interaction);
			} else if (interaction.commandName === "Accept Answer") {
				contextAcceptAnswer(interaction);
			} else if (interaction.commandName === "Flag") {
				contextFlag(interaction);
			} else {
				interaction
					.reply({ ephemeral: true, content: "Invalid interactionData received." })
					.catch(console.error.bind(console));
			}
		}
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

try {
	const { token, dbUri } = JSON.parse(readFileSync("token.json", "utf-8")) as { token: string; dbUri: string };

	if (token.length === 0) {
		throw new Error("Invalid token provided. Please be sure that `token.json` contains your bot token.");
	}

	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	client
		.login(token)
		.then(() => main(client, dbUri))
		.catch(console.error.bind(console));
} catch (e) {
	console.error(e);
}
