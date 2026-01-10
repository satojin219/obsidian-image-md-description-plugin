import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import { FileFormat } from "./type";

type PngChunk = {
	name: string;
	data: Buffer | Uint8Array;
};

const DESCRIPTION_KEYWORDS = ["Description", "ImageDescription"] as const;
const PRIMARY_KEYWORD = "Description";

function isDescriptionKeyword(keyword: string): boolean {
	return DESCRIPTION_KEYWORDS.includes(
		keyword as (typeof DESCRIPTION_KEYWORDS)[number]
	);
}

function parseTextChunk(
	chunk: PngChunk
): { keyword: string; text: string } | null {
	if (!chunk.data) {
		return null;
	}
	const data = Buffer.isBuffer(chunk.data)
		? chunk.data
		: Buffer.from(chunk.data);
	if (chunk.name === "tEXt") {
		const sepIndex = data.indexOf(0x00);
		if (sepIndex === -1) {
			return null;
		}
		const keyword = data.subarray(0, sepIndex).toString("latin1");
		const text = data.subarray(sepIndex + 1).toString("latin1");
		return { keyword, text };
	}

	if (chunk.name === "iTXt") {
		let offset = 0;
		const keywordEnd = data.indexOf(0x00, offset);
		if (keywordEnd === -1) {
			return null;
		}
		const keyword = data.subarray(offset, keywordEnd).toString("latin1");
		offset = keywordEnd + 1;

		const compressionFlag = data[offset];
		offset += 1;
		const compressionMethod = data[offset];
		offset += 1;

		const languageTagEnd = data.indexOf(0x00, offset);
		if (languageTagEnd === -1) {
			return null;
		}
		offset = languageTagEnd + 1;

		const translatedKeywordEnd = data.indexOf(0x00, offset);
		if (translatedKeywordEnd === -1) {
			return null;
		}
		offset = translatedKeywordEnd + 1;

		if (compressionFlag === 1 && compressionMethod === 0) {
			return null;
		}

		const text = data.subarray(offset).toString("utf8");
		return { keyword, text };
	}

	return null;
}

function findDescription(chunks: PngChunk[]): string {
	for (const chunk of chunks) {
		if (chunk.name !== "iTXt") {
			continue;
		}
		const parsed = parseTextChunk(chunk);
		if (parsed && isDescriptionKeyword(parsed.keyword)) {
			return parsed.text;
		}
	}

	for (const chunk of chunks) {
		if (chunk.name !== "tEXt") {
			continue;
		}
		const parsed = parseTextChunk(chunk);
		if (parsed && isDescriptionKeyword(parsed.keyword)) {
			return parsed.text;
		}
	}

	return "";
}

function isDescriptionChunk(chunk: PngChunk): boolean {
	if (chunk.name !== "tEXt" && chunk.name !== "iTXt") {
		return false;
	}
	const parsed = parseTextChunk(chunk);
	return parsed ? isDescriptionKeyword(parsed.keyword) : false;
}

function buildITXtChunk(text: string): PngChunk {
	const safeText = text ?? "";
	const data = Buffer.concat([
		Buffer.from(PRIMARY_KEYWORD, "latin1"),
		Buffer.from([0x00]),
		Buffer.from([0x00]),
		Buffer.from([0x00]),
		Buffer.from([0x00]),
		Buffer.from([0x00]),
		Buffer.from(safeText, "utf8"),
	]);
	return { name: "iTXt", data };
}

function upsertDescriptionChunk(chunks: PngChunk[], text: string): PngChunk[] {
	const safeText = text ?? "";
	const sanitized = chunks.filter((chunk) => !isDescriptionChunk(chunk));
	if (safeText.trim() === "") {
		return sanitized;
	}
	const insertIndex = sanitized.findIndex((chunk) => chunk.name === "IEND");
	const descriptionChunk = buildITXtChunk(safeText);
	if (insertIndex === -1) {
		return [...sanitized, descriptionChunk];
	}
	return [
		...sanitized.slice(0, insertIndex),
		descriptionChunk,
		...sanitized.slice(insertIndex),
	];
}

export class PngFile implements FileFormat {
	private readonly chunks: PngChunk[];
	private description: string;

	constructor(data: Buffer) {
		this.chunks = extract(data) as PngChunk[];
		this.description = findDescription(this.chunks);
	}

	public get imageDescription(): string {
		return this.description;
	}

	public set imageDescription(body: string) {
		this.description = body ?? "";
	}

	public toBuffer(): Buffer {
		const updatedChunks = upsertDescriptionChunk(
			this.chunks,
			this.description
		);
		return Buffer.from(encode(updatedChunks));
	}
}
