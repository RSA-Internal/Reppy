import { Client, Intents } from "discord.js";
import { readFileSync } from "fs";
import { connect } from "mongoose";

function main(client: Client, dbUri: string) {
	client.once("ready", () => {
		console.log("Client logged in.");

		const context_convert_to_answer = { name: "Convert to Answer", type: 3 };
		const context_convert_to_question = { name: "Convert to Question", type: 3 };
		const context_accept_answer = { name: "Accept Answer", type: 3 };
		const context_flag = { name: "Flag", type: 3 };

		const context_payload = [
			context_convert_to_answer,
			context_convert_to_question,
			context_accept_answer,
			context_flag,
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
								commands.set(context_payload).catch(console.warn.bind(console));
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

	client.on("interactionCreate", () => {
		console.log("Interaction received.");

		// check if message is in valid channel for guild
		// check if author of message
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
