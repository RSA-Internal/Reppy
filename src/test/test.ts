import { readFileSync } from "fs";
import { connect } from "mongoose";
import { resetPools } from "../dailyReset";
import {
	createGuildData,
	createUserData,
	deleteGuildData,
	deleteUserData,
	fetchGuildData,
	fetchUserData,
	updateGuildData,
	updateUserData,
} from "../daos/GuildDataDAO";
import { DetectionType, isMessageQuestion } from "../util";

const { dbUri } = JSON.parse(readFileSync("token.json", "utf-8")) as { token: string; dbUri: string };
// Connect to the database.
connect(dbUri, {
	ssl: true,
	useCreateIndex: true,
	useFindAndModify: false,
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).catch(console.warn.bind(console));

let passed = 0;
let failed = 0;

interface AssertTest {
	name: string;
	expectedValue: unknown;
	gotValue: unknown;
}

function verify(testName: string, asserts: AssertTest[]): boolean {
	let isPassing = true;
	console.log(`Testing: ${testName}`);

	for (const assert of asserts) {
		if (assert.expectedValue === assert.gotValue) {
			passed += 1;
		} else {
			console.warn(`\t(${assert.name})[Expected: ${assert.expectedValue}, Got: ${assert.gotValue}]`);
			isPassing = false;
			failed += 1;
		}
	}

	console.info(`${testName} ${isPassing ? "PASSED" : "FAILED"}.\n`);
	return isPassing;
}

async function resetDB(): Promise<void> {
	console.log("Resetting DB");
	await deleteGuildData("165202235226062848");
	await deleteGuildData("848412523526488114");
	console.log("Reset DB");
}

async function main(): Promise<void> {
	let daoTest = await createGuildData("165202235226062848");
	verify("createBaseGuildData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully created guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await createGuildData("165202235226062848");
	verify("createBaseGuildDataPreExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "guildData already exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await createGuildData("848412523526488114", ["871596364327448617", "871596399773503528"]);
	verify("createPopulatedGuildData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully created guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await createUserData("848412523526488114", "169208961533345792");
	verify("createBaseUserData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully created userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await createUserData("848412523526488114", "169208961533345792");
	verify("createBaseUserDataPreExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "userData already exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await createUserData("848412523526488114", "454873852254617601", "871596364327448617", 10);
	verify("createPopulatedUserData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully created userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await fetchGuildData("165202235226062848");
	verify("fetchGuildData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully fetched guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await fetchGuildData("-1");
	verify("fetchGuildDataNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await fetchUserData("848412523526488114", "169208961533345792");
	verify("fetchUserData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully fetched userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await fetchUserData("848412523526488114", "-1");
	verify("fetchUserDataNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No userData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateGuildData("848412523526488114", []);
	verify("updateGuildDataValidChannels", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully updated guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateGuildData("-1", []);
	verify("updateGuildDataValidChannelsNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateGuildData("848412523526488114", undefined, "12345");
	verify("updateGuildDataReportChannel", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully updated guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateGuildData("-1", undefined, undefined);
	verify("updateGuildDataReportChannelNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateGuildData(
		"848412523526488114",
		["180763895592386560", "165226280118255616"],
		"843935056997253170"
	);
	verify("updateGuildDataMultipleField", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully updated guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateUserData("848412523526488114", "454873852254617601", {
		channelId: "871596364327448617",
		reputationChange: 4,
	});
	verify("updateUserDataGain4Rep", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully updated userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
		{
			name: "reputation is fourteen",
			expectedValue: 14,
			gotValue: daoTest.userData?.reputation.find(channel => channel.channelId === "871596364327448617")
				?.reputation,
		},
	]);

	daoTest = await updateUserData("-1", "454873852254617601", {
		channelId: "871596364327448617",
		reputationChange: 4,
	});
	verify("updateUserDataNoGuild", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateUserData("848412523526488114", "-1", {
		channelId: "-1",
		reputationChange: 4,
	});
	verify("updateUserDataNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No userData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await updateUserData("848412523526488114", "454873852254617601", {
		pool: { upvotes: 0, downvotes: 0 },
	});
	verify("updateUserDataPools", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully updated userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
		{ name: "upvotes is zero", expectedValue: 0, gotValue: daoTest.userData?.pool.upvotes },
		{ name: "downvotes is zero", expectedValue: 0, gotValue: daoTest.userData?.pool.downvotes },
	]);

	await resetPools(["848412523526488114"]);

	daoTest = await fetchUserData("848412523526488114", "454873852254617601");
	verify("fetchUserDataPoolsAfterReset", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully fetched userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: true, gotValue: daoTest.userData != undefined },
		{ name: "upvotes is five", expectedValue: 5, gotValue: daoTest.userData?.pool.upvotes },
		{ name: "downvotes is five", expectedValue: 5, gotValue: daoTest.userData?.pool.downvotes },
	]);

	daoTest = await deleteGuildData("165202235226062848");
	verify("deleteGuildData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully deleted guildData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await deleteGuildData("165202235226062848");
	verify("deleteGuildDataNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await deleteUserData("848412523526488114", "169208961533345792");
	verify("deleteUserData", [
		{ name: "DAO Result", expectedValue: true, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "Successfully deleted userData.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await deleteUserData("848412523526488114", "-1");
	verify("deleteUserDataNoExist", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No userData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: true, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	daoTest = await deleteUserData("-1", "169208961533345792");
	verify("deleteUserDataNoGuild", [
		{ name: "DAO Result", expectedValue: false, gotValue: daoTest.result },
		{ name: "DAO Message", expectedValue: "No guildData exists.", gotValue: daoTest.message },
		{ name: "DAO has guildData", expectedValue: false, gotValue: daoTest.guildData != undefined },
		{ name: "DAO has userData", expectedValue: false, gotValue: daoTest.userData != undefined },
	]);

	let utilTest = isMessageQuestion(DetectionType.MESSAGE, "This is not a question.");
	verify("messageMessagePhase1", [
		{ name: "is Question", expectedValue: false, gotValue: utilTest.isQuestion },
		{ name: "Score", expectedValue: 1, gotValue: utilTest.score },
	]);

	utilTest = isMessageQuestion(
		DetectionType.MESSAGE,
		"This should be marked as a valid question? ```fake codeblock```"
	);
	verify("messageMessagePhase2", [
		{ name: "is Question", expectedValue: true, gotValue: utilTest.isQuestion },
		{ name: "Score", expectedValue: 7, gotValue: utilTest.score },
	]);

	utilTest = isMessageQuestion(DetectionType.MESSAGE, "This is marked as valid question? ```fake codeblock```");
	verify("messageMessagePhase3", [
		{ name: "is Question", expectedValue: true, gotValue: utilTest.isQuestion },
		{ name: "Score", expectedValue: 7, gotValue: utilTest.score },
	]);

	utilTest = isMessageQuestion(
		DetectionType.MESSAGE,
		"Is this going to be marked as a valid question and how do I know?"
	);
	verify("messageMessagePhase4", [
		{ name: "is Question", expectedValue: true, gotValue: utilTest.isQuestion },
		{ name: "Score", expectedValue: 7, gotValue: utilTest.score },
	]);

	utilTest = isMessageQuestion(
		DetectionType.MESSAGE,
		"how is this a valid codeblock, please tell ```fake codeblock```"
	);
	verify("messageMessagePhase5", [
		{ name: "is Question", expectedValue: true, gotValue: utilTest.isQuestion },
		{ name: "Score", expectedValue: 7, gotValue: utilTest.score },
	]);

	console.log("");
	console.log(`TESTS: ${passed + failed}`);
	console.log(`PASSED: ${passed}`);
	console.log(`FAILED: ${failed}`);

	await resetDB();

	process.exit();
}

main().catch(console.error.bind(console));
