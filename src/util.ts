const keywords = ["what", "when", "why", "which", "who", "how", "is"];
const expectedWordCount = 10;

export enum DetectionType {
	MESSAGE = 7,
	CONTEXT = 4,
}

const scoreGenerators = {
	scoreWordCount: (content: string): number => {
		return content.split(" ").length > expectedWordCount ? 1 : 0;
	},
	scoreQMark: (content: string): number => {
		return content.includes("?") ? 3 : 0;
	},
	scoreCodeblock: (content: string): number => {
		return content.includes("```") ? 3 : 0;
	},
	scoreStartingKeyword: (content: string): number => {
		return keywords.includes(content.split(" ")[0]) ? 2 : 0;
	},
	scoreIncludingKeywords: (content: string): number => {
		content
			.split(" ")
			.slice(1)
			.forEach(word => {
				if (keywords.includes(word)) return 1;
			});
		return 0;
	},
};

function generateScore(content: string): number {
	let scoreGenerator = 0;

	for (const generator of Object.values(scoreGenerators)) {
		scoreGenerator += generator(content);
	}

	return scoreGenerator;
}

export function isMessageQuestion(type: DetectionType, content: string): boolean {
	return generateScore(content) >= type.valueOf();
}
