const keywords = ["what", "when", "why", "which", "who", "how", "is"];
const expectedWordCount = 10;

export enum DetectionType {
	MESSAGE = 7,
	CONTEXT = 4,
}

export interface MessageGrade {
	isQuestion: boolean;
	score: number;
}

const scoreGenerators = {
	scoreWordCount: (content: string): number => {
		return content.split(" ").length >= expectedWordCount ? 1 : 0;
	},
	scoreQMark: (content: string): number => {
		return content.includes("?") ? 3 : 0;
	},
	scoreCodeblock: (content: string): number => {
		return content.includes("```") ? 3 : 0;
	},
	scoreStartingKeyword: (content: string): number => {
		return keywords.includes(content.split(" ")[0].toLowerCase()) ? 2 : 0;
	},
	scoreIncludingKeywords: (content: string): number => {
		let result = 0;
		content
			.split(" ")
			.slice(1)
			.forEach(word => {
				if (keywords.includes(word.toLowerCase())) result = 1;
			});
		return result;
	},
};

function generateScore(content: string): number {
	let scoreGenerator = 0;

	for (const generator of Object.values(scoreGenerators)) {
		scoreGenerator += generator(content);
	}

	return scoreGenerator;
}

export function isMessageQuestion(type: DetectionType, content: string): MessageGrade {
	const score = generateScore(content);

	return {
		isQuestion: score >= type.valueOf(),
		score,
	};
}
