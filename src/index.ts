import { Client, Intents } from "discord.js";
import { readFileSync } from "fs";

function main(client: Client) {
	client.once("ready", () => console.log("Client logged in."));
}

try {
	const token = (JSON.parse(readFileSync("token.json", "utf-8")) as { token: string }).token;

	if (token.length === 0) {
		throw new Error("Invalid token provided. Please be sure that `token.json` contains your bot token.");
	}

	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	client
		.login(token)
		.then(() => main(client))
		.catch(console.error.bind(console));
} catch (e) {
	console.error(e);
}
