import type { Snowflake } from "discord.js";
import guildDataModel, {
	IChannelData,
	IGuildData,
	IMessageData,
	IPoolData,
	IUserData,
} from "../models/guildData.model";

export interface IDAOResult {
	readonly result: boolean;
	readonly message: string;
	readonly guildData?: IGuildData;
	readonly userData?: IUserData;
}

export enum UserUpdateType {
	REPUTATION,
	POOL,
}

export interface UserUpdateData {
	[UserUpdateType.REPUTATION]: { channelId: string; reputationChange: number };
	[UserUpdateType.POOL]: { pool: IPoolData };
}

function isReputation(x: UserUpdateData[UserUpdateType]): x is UserUpdateData[UserUpdateType.REPUTATION] {
	return "channelId" in x && "reputationChange" in x;
}

function isPool(x: UserUpdateData[UserUpdateType]): x is UserUpdateData[UserUpdateType.POOL] {
	return "pool" in x;
}

/**
 * createGuildData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function createGuildData(
	guildId: Snowflake,
	validChannels?: string[],
	reportChannelId?: string
): Promise<IDAOResult> {
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
							reportChannelId: reportChannelId ?? "",
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
							pool: {
								upvotes: 5,
								downvotes: 3,
							},
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
export async function updateGuildData(
	guildId: Snowflake,
	validChannels?: string[],
	reportChannelId?: string,
	messageData?: IMessageData[]
): Promise<IDAOResult> {
	return new Promise(resolve => {
		fetchGuildData(guildId)
			.then(res => {
				const guildData = res.guildData;

				if (guildData) {
					const updateQuery: Partial<IGuildData> = {};

					if (validChannels != undefined) {
						guildData.validChannels = validChannels;

						updateQuery.validChannels = validChannels;
					}

					if (reportChannelId != undefined) {
						guildData.reportChannelId = reportChannelId;

						updateQuery.reportChannelId = reportChannelId;
					}

					if (messageData != undefined) {
						guildData.messageData = messageData;

						updateQuery.messageData = messageData;
					}

					guildDataModel
						.updateOne({ guildId }, updateQuery)
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

//updateUserData<UserDataType.POOL>(...)

/**
 * updateUserData is intended to be an intermediary between bot
 * and MongoDB. This will reduce the amount of DB constructive
 * calls outside of DB related locations.
 */
export async function updateUserData<T extends UserUpdateType>(
	guildId: Snowflake,
	userId: Snowflake,
	updateData: UserUpdateData[T]
): Promise<IDAOResult> {
	const guildDataResult = await fetchGuildData(guildId);

	if (!guildDataResult.result)
		return Promise.resolve({ result: guildDataResult.result, message: guildDataResult.message });

	const guildData = guildDataResult.guildData;

	if (!guildData) return Promise.resolve({ result: false, message: "No guildData exists." });

	const userDataResult = await fetchUserData(guildId, userId);

	if (!userDataResult.result)
		return Promise.resolve({ result: userDataResult.result, message: userDataResult.message, guildData });

	const userData = userDataResult.userData;

	if (!userData) return Promise.resolve({ result: false, message: "No userData exists.", guildData });

	let newUserData: IUserData;

	if (isReputation(updateData)) {
		const newReputationData = userData.reputation.filter(channel => channel.channelId != updateData.channelId);
		const oldChannelData = userData.reputation.find(channel => channel.channelId === updateData.channelId);
		const newChannelData: IChannelData = {
			channelId: updateData.channelId,
			reputation: (oldChannelData != undefined ? oldChannelData.reputation : 0) + updateData.reputationChange,
		};

		newReputationData.push(newChannelData);

		newUserData = {
			userId: userData.userId,
			reputation: newReputationData,
			pool: userData.pool,
		};
	} else if (isPool(updateData)) {
		newUserData = {
			userId: userData.userId,
			reputation: userData.reputation,
			pool: updateData.pool,
		};
	} else {
		return Promise.resolve({ result: false, message: "Failed to create newUserData.", guildData });
	}

	const newGuildUserData = guildData.userData.filter(savedData => savedData.userId != newUserData.userId);
	newGuildUserData.push(newUserData);

	try {
		await guildDataModel.updateOne({ guildId }, { userData: newGuildUserData });
		return Promise.resolve({
			result: true,
			message: "Successfully updated userData.",
			guildData,
			userData: newUserData,
		});
	} catch (err) {
		return Promise.resolve({
			result: false,
			message: (err as Error).message,
			guildData,
			userData: userData,
		});
	}
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
