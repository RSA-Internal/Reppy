import client from ".";
import { calculateTotalRep, fetchGuildData, updateUserData } from "./daos/GuildDataDAO";

const DAILY_MS = 24 * 60 * 60 * 1000;

export function init(): void {
	console.log("Setting up resetPool counter.");
	const msUntilMidnight = getMsUntilMidnight();
	setTimeout(() => {
		resetPools().catch(console.error.bind(console));
	}, msUntilMidnight);
}

export function getPrettyTimeRemaining(): string {
	const sec = getMsUntilMidnight() / 1000;

	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const seconds = Math.floor(sec % 60);

	const timeRemaining = [];

	if (hours > 0) timeRemaining.push(String(hours) + " hours");
	if (minutes > 0) timeRemaining.push(String(minutes) + " minutes");
	if (seconds > 0) timeRemaining.push(String(seconds) + " seconds");

	return timeRemaining.join(", ");
}

function getMsUntilMidnight(now = Date.now()): number {
	const roundUp = Math.ceil(now / DAILY_MS) * DAILY_MS;

	return roundUp - now;
}

export async function resetPools(guilds: string[] = []): Promise<void> {
	// handle resetting of pools
	if (!client) {
		return;
	}

	const o2Guilds = await client.guilds.fetch();
	if (guilds.length === 0) {
		for (const o2Guild of o2Guilds) {
			const guild = await o2Guild[1].fetch();
			guilds.push(guild.id);
		}
	}

	for (const guildId of guilds) {
		const fetchResult = await fetchGuildData(guildId);

		if (fetchResult.guildData) {
			const guildUserData = fetchResult.guildData.userData;

			for (const userData of guildUserData) {
				const totalRep = calculateTotalRep(userData.reputation);

				//upvotes
				//Math.min(5 + Math.floor(rep/20), 100)
				//max: 100 @ 2k rep

				//downovtes
				//min(3 + Math.floor(rep/5), 10)
				//max: 10 @ 35 rep
				await updateUserData(guildId, userData.userId, {
					pool: {
						upvotes: Math.min(5 + Math.floor(totalRep / 20), 100),
						downvotes: Math.min(3 + Math.floor(totalRep / 5), 10),
					},
				});
			}
		}
	}

	init();
	return;
}
