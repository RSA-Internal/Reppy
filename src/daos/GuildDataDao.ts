/**
	Required Methods

	- Create Data
	- Fetch Data
	- Update Data
 */

/**
 * Testing data...
 *
 * if (message.content === "testDBSetup") {
			const channelId = message.channelId;

			guildDataModel
				.create({
					guildId: message.guildId,
					validChannels: [channelId],
					userData: [
						{
							userId: "142090816150568960",
							reputation: [
								{
									channelId: channelId,
									reputation: 24,
								},
								{
									channelId: "871596399773503528",
									reputation: 12,
								},
							],
						},
						{
							userId: "169208961533345792",
							reputation: [
								{
									channelId: channelId,
									reputation: 10,
								},
								{
									channelId: "871596399773503528",
									reputation: 20,
								},
							],
						},
					],
				})
				.catch(console.warn.bind(console));
		} else if (message.content === "fetchTestData") {
			guildDataModel
				.find({ guildId: message.guildId! })
				.then(guildData => {
					if (guildData) {
						const userData = guildData[0].userData;

						if (userData) {
							const userSpecific = userData.find(objs => objs.userId === message.author.id);

							if (userSpecific) {
								const reputation = userSpecific.reputation
									.map(channelData => `${channelData.channelId}: ${channelData.reputation}`)
									.join("\n");

								if (reputation.length > 0) {
									message.reply(reputation).catch(console.warn.bind(console));
								} else {
									message.reply("You do not have any test data.").catch(console.warn.bind(console));
								}
							} else {
								message.reply("You do not have any test data.").catch(console.warn.bind(console));
							}
						} else {
							message.reply("No data to fetch.").catch(console.warn.bind(console));
						}
					}
				})
				.catch(console.warn.bind(console));
		}
 */

/**
 * createGuildData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export function createGuildData(): void {
	console.log("NYI - Create Guild Data");
}

/**
 * createUserData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export function createUserData(): void {
	console.log("NYI - Create Guild Data");
}

/**
 * fetchGuildData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export function fetchGuildData(): void {
	console.log("NYI - Fetch Guild Data");
}

/**
 * fetchUserData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
 export function fetchUserData(): void {
	console.log("NYI - Fetch User Data");
}

/**
 * updateGuildData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export function updateGuildData(): void {
	console.log("NYI - Update Guild Data");
}

/**
 * updateUserData is inteded to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export function updateUserData(): void {
	console.log("NYI - Update User Data");
}
