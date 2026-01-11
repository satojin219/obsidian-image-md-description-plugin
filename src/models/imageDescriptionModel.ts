import { ReaderWriter } from "files/readerWriter";
import { TFile } from "obsidian";
import type { FileFormat } from "files/type";

export type ImageDescriptionModel = {
	readonly image: FileFormat;
	readonly file: TFile;
	loadDescription: () => string;
	setDescription: (text: string) => void;
	save: () => Promise<void>;
};

export async function createImageDescriptionModel(
	readerWriter: ReaderWriter,
	file: TFile
): Promise<ImageDescriptionModel | null> {
	const image = await readerWriter.readFile(file);
	if (!image) {
		return null;
	}

	return {
		image,
		file,
		loadDescription: () => image.imageDescription,
		setDescription: (text: string) => {
			image.imageDescription = text;
		},
		save: () => readerWriter.writeFile(file, image),
	};
}
