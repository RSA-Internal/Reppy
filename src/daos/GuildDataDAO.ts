/* eslint-disable no-mixed-spaces-and-tabs */
/**
	Required Methods

	- Create Data
	- Fetch Data
	- Update Data
 */

import type { Snowflake } from "discord.js";
import guildDataModel, { IChannelData, IGuildData, IUserData } from "../models/guildData.model";

export interface IDAOResult {
	readonly result: boolean;
	readonly message: string;
	readonly guildData?: IGuildData;
	readonly userData?: IUserData;
}

/**
 * createGuildData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function createGuildData(guildId: Snowflake, validChannels?: string[]): Promise<IDAOResult> {
	return new Promise<IDAOResult>(resolve => {
		guildDataModel
			.findOne({ guildId })
			.then(guildData => {
				if (guildData) {
					resolve({ result: false, message: "guildData already exists.", guildData });
				} else {
					guildDataModel
						.create({
							guildId,
							validChannels: validChannels ?? [],
						})
						.then(guildData => {
							if (guildData) {
								resolve({
									result: true,
									message: "Successfully created guildData.",
									guildData,
								});
							}
						})
						.catch((err: Error) => resolve({ result: false, message: err.message }));
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * createUserData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function createUserData(
	guildId: Snowflake,
	userId: Snowflake,
	channelId?: Snowflake,
	reputation = 0
): Promise<IDAOResult> {
	return new Promise<IDAOResult>(resolve => {
		guildDataModel
			.findOne({ guildId })
			.then(guildData => {
				// TODO - Create guildData if does not exist.

				if (guildData) {
					const userData = guildData.userData;
					const guildValidChannels = guildData.validChannels;

					const userHasData = userData.find(userDataObject => userDataObject.userId === userId);
					let isValidChannel = false;

					if (channelId) {
						isValidChannel = guildValidChannels.includes(channelId);
					}

					if (!userHasData) {
						// create data
						const reputationData: IChannelData[] = [];

						if (channelId && isValidChannel) {
							reputationData.push({ channelId, reputation });
						}

						const userDataBase: IUserData = {
							userId,
							reputation: reputationData,
						};

						// update guild data in db
						userData.push(userDataBase);

						guildDataModel
							.updateOne({ guildId }, { userData })
							.then(() => {
								resolve({
									result: true,
									message: "Successfully created userData.",
									guildData,
									userData: userDataBase,
								});
							})
							.catch((err: Error) => resolve({ result: false, message: err.message, guildData }));
					} else {
						resolve({
							result: false,
							message: "userData already exists.",
							guildData,
							userData: userHasData,
						});
					}
				} else {
					resolve({ result: false, message: "Failed to fetch guildData." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * fetchGuildData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function fetchGuildData(guildId: Snowflake): Promise<IDAOResult> {
	return new Promise<IDAOResult>(resolve => {
		guildDataModel
			.findOne({ guildId })
			.then(guildData => {
				if (guildData) {
					resolve({ result: true, message: "Successfully fetched guildData.", guildData });
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * fetchUserData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function fetchUserData(guildId: Snowflake, userId: Snowflake): Promise<IDAOResult> {
	return new Promise<IDAOResult>(resolve => {
		guildDataModel
			.findOne({ guildId })
			.then(guildData => {
				if (guildData) {
					const userData = guildData.userData.find(userDataObject => userDataObject.userId === userId);

					if (userData) {
						resolve({
							result: true,
							message: "Successfully fetched userData.",
							guildData,
							userData,
						});
					} else {
						resolve({ result: false, message: "No userData exists.", guildData });
					}
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * updateGuildData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function updateGuildData(guildId: Snowflake, validChannels: string[]): Promise<IDAOResult> {
	return new Promise(resolve => {
		fetchGuildData(guildId)
			.then(res => {
				const guildData = res.guildData;

				if (guildData) {
					guildData.validChannels = validChannels;

					guildDataModel
						.updateOne({ guildId }, { validChannels })
						.then(res => {
							if (res.n === 0) {
								resolve({ result: false, message: "No guildData exists." });
							} else if (res.nModified === 0) {
								resolve({ result: false, message: "Failed to update guildData." });
							} else {
								resolve({
									result: true,
									message: "Successfully updated guildData.",
									guildData,
								});
							}
						})
						.catch((err: Error) => resolve({ result: false, message: err.message }));
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * updateUserData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function updateUserData(
	guildId: Snowflake,
	userId: Snowflake,
	channelId: Snowflake,
	reputation: number
): Promise<IDAOResult> {
	return new Promise(resolve => {
		fetchGuildData(guildId)
			.then(res => {
				const guildData = res.guildData;

				if (guildData) {
					const userData = guildData.userData;
					const userRepData = userData.find(userDataObject => userDataObject.userId === userId);

					if (userRepData) {
						const hasChannelData = userRepData.reputation.find(
							channelObject => channelObject.channelId === channelId
						);

						if (hasChannelData) {
							const newReputation: IChannelData = {
								channelId,
								reputation,
							};

							const newUserRepData = userRepData.reputation.filter(
								channelObject => channelObject.channelId != channelId
							);
							newUserRepData.push(newReputation);

							const newUserData = {
								userId,
								reputation: newUserRepData,
							};

							const newGuildUserData = userData.filter(userDataObject => userDataObject.userId != userId);
							newGuildUserData.push(newUserData);

							guildData.userData = newGuildUserData;

							guildDataModel
								.updateOne({ guildId }, { userData: newGuildUserData })
								.then(() =>
									resolve({
										result: true,
										message: "Successfully updated userData.",
										guildData,
										userData: newUserData,
									})
								)
								.catch((err: Error) => resolve({ result: false, message: err.message }));
						} else {
							resolve({
								result: false,
								message: "No channelData exists.",
								guildData,
								userData: userRepData,
							});
						}
					} else {
						resolve({ result: false, message: "No userData exists.", guildData });
					}
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * deleteGuildData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function deleteGuildData(guildId: Snowflake): Promise<IDAOResult> {
	return new Promise(resolve => {
		fetchGuildData(guildId)
			.then(guildData => {
				if (guildData.guildData) {
					guildDataModel
						.deleteOne({ guildId })
						.then(() => resolve({ result: true, message: "Successfully deleted guildData." }))
						.catch((err: Error) => resolve({ result: false, message: err.message }));
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}

/**
 * deleteUserData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function deleteUserData(guildId: Snowflake, userId: Snowflake): Promise<IDAOResult> {
	return new Promise(resolve => {
		fetchGuildData(guildId)
			.then(fetchedGuildData => {
				const guildData = fetchedGuildData.guildData;
				if (guildData) {
					const userData = guildData.userData;
					const savedUserData = userData.find(userDataObject => userDataObject.userId === userId);

					if (savedUserData) {
						const newUserData = userData.filter(userDataObject => userDataObject.userId != userId);

						guildData.userData = newUserData;

						guildDataModel
							.updateOne({ guildId }, { userData: newUserData })
							.then(() => resolve({ result: true, message: "Successfully deleted userData.", guildData }))
							.catch((err: Error) => resolve({ result: false, message: err.message }));
					} else {
						resolve({ result: false, message: "No userData exists.", guildData });
					}
				} else {
					resolve({ result: false, message: "No guildData exists." });
				}
			})
			.catch((err: Error) => resolve({ result: false, message: err.message }));
	});
}
