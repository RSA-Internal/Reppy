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
	IDAOResult,
	updateGuildData,
	updateUserData,
} from "../daos/GuildDataDAO";

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

function verify(
	testName: string,
	result: IDAOResult,
	expectedResult: boolean,
	expectedMessage: string,
	expectGuildData?: boolean,
	expectUserData?: boolean,
	customAssert?: boolean
): boolean {
	let isPassing = true;
	console.log(`Testing: ${testName}`);
	if (result.result != expectedResult) {
		console.warn(`\t(RESULT)[Expected: ${expectedResult}, Got: ${result.result}]`);
		isPassing = false;
		failed += 1;
	} else {
		passed += 1;
	}
	if (result.message != expectedMessage) {
		console.warn(`\t(MESSAGE)[Expected: ${expectedMessage}, Got: ${result.message}]`);
		isPassing = false;
		failed += 1;
	} else {
		passed += 1;
	}
	if (expectGuildData && !result.guildData) {
		console.warn(`\t(GUILDDATA)[Expected: IGuildData Object, Got: undefined]`);
		console.log(`\t${String(result.guildData)}`);
		isPassing = false;
		failed += 1;
	} else {
		passed += 1;
	}
	if (expectUserData && !result.userData) {
		console.warn(`\t(USERDATA)[Expected: IUserData Object, Got: undefined]`);
		isPassing = false;
		failed += 1;
	} else {
		passed += 1;
	}

	if (customAssert != undefined) {
		if (customAssert) {
			passed += 1;
		} else {
			console.warn(`\t(CUSTOMASSERT)[Expected: ..., Got: ...]`);
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
	const res1 = await createGuildData("165202235226062848");
	verify("createBaseGuildData", res1, true, "Successfully created guildData.", true, false);

	const res2 = await createGuildData("165202235226062848");
	verify("createBaseGuildDataPreExist", res2, false, "guildData already exists.", true, false);

	const res3 = await createGuildData("848412523526488114", ["871596364327448617", "871596399773503528"]);
	verify("createPopulatedGuildData", res3, true, "Successfully created guildData.", true, false);

	const res4 = await createUserData("848412523526488114", "169208961533345792");
	verify("createBaseUserData", res4, true, "Successfully created userData.", true, true);

	const res5 = await createUserData("848412523526488114", "169208961533345792");
	verify("createBaseUserDataPreExist", res5, false, "userData already exists.", true, true);

	const res6 = await createUserData("848412523526488114", "454873852254617601", "871596364327448617", 10);
	verify("createPopulatedUserData", res6, true, "Successfully created userData.", true, true);

	const res7 = await fetchGuildData("165202235226062848");
	verify("fetchGuildData", res7, true, "Successfully fetched guildData.", true, false);

	const res8 = await fetchGuildData("-1");
	verify("fetchGuildDataNoExist", res8, false, "No guildData exists.", false, false);

	const res9 = await fetchUserData("848412523526488114", "169208961533345792");
	verify("fetchUserData", res9, true, "Successfully fetched userData.", true, true);

	const res10 = await fetchUserData("848412523526488114", "-1");
	verify("fetchUserDataNoExist", res10, false, "No userData exists.", true, false);

	const res11 = await updateGuildData("848412523526488114", []);
	verify("updateGuildDataValidChannels", res11, true, "Successfully updated guildData.", true, false);

	const res12 = await updateGuildData("-1", []);
	verify("updateGuildDataValidChannelsNoExist", res12, false, "No guildData exists.", false, false);

	const res22 = await updateGuildData("848412523526488114", undefined, "12345");
	verify("updateGuildDataReportChannel", res22, true, "Successfully updated guildData.", true, false);

	const res23 = await updateGuildData("-1", undefined, undefined);
	verify("updateGuildDataReportChannelNoExist", res23, false, "No guildData exists.", false, false);

	const res24 = await updateGuildData(
		"848412523526488114",
		["180763895592386560", "165226280118255616"],
		"843935056997253170"
	);
	verify("updateGuildDataMultipleField", res24, true, "Successfully updated guildData.", true, false);

	const res13 = await updateUserData("848412523526488114", "454873852254617601", {
		channelId: "871596364327448617",
		reputationChange: 4,
	});
	verify("updateUserDataGain4Rep", res13, true, "Successfully updated userData.", true, true);

	const res14 = await updateUserData("-1", "454873852254617601", {
		channelId: "871596364327448617",
		reputationChange: 4,
	});
	verify("updateUserDataNoGuild", res14, false, "No guildData exists.", false, false);

	const res16 = await updateUserData("848412523526488114", "-1", {
		channelId: "-1",
		reputationChange: 4,
	});
	verify("updateUserDataNoExist", res16, false, "No userData exists.", true, false);

	const res30a = await updateUserData("848412523526488114", "454873852254617601", {
		pool: { upvotes: 0, downvotes: 0 },
	});
	verify("updateUserDataPools", res30a, true, "Successfully updated userData.", true, true);
	await resetPools(["848412523526488114"]);
	const res30b = await fetchUserData("848412523526488114", "454873852254617601");
	verify(
		"fetchUserDataPoolsWithAssert",
		res30a,
		true,
		"Successfully updated userData.",
		true,
		true,
		res30b.userData?.pool.upvotes === 5
	);

	const res17 = await deleteGuildData("165202235226062848");
	verify("deleteGuildData", res17, true, "Successfully deleted guildData.", false, false);

	const res18 = await deleteGuildData("165202235226062848");
	verify("deleteGuildDataNoExist", res18, false, "No guildData exists.", false, false);

	const res19 = await deleteUserData("848412523526488114", "169208961533345792");
	verify("deleteUserData", res19, true, "Successfully deleted userData.", true, false);

	const res20 = await deleteUserData("848412523526488114", "-1");
	verify("deleteUserDataNoExist", res20, false, "No userData exists.", true, false);

	const res21 = await deleteUserData("-1", "169208961533345792");
	verify("deleteUserDataNoGuild", res21, false, "No guildData exists.", false, false);

	console.log("");
	console.log(`TESTS: ${passed + failed}`);
	console.log(`PASSED: ${passed}`);
	console.log(`FAILED: ${failed}`);

	await resetDB();

	process.exit();
}

main().catch(console.error.bind(console));
