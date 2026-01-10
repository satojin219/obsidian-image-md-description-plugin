import { App, FileSystemAdapter, TFile } from "obsidian";
import { FileFormat } from "./type";
import { JpgFile } from "./jpg";
import { PngFile } from "./png";

type ImageExtensions = "jpg" | "jpeg" | "png";

export class ReaderWriter {
	public readonly extensions: ReadonlyArray<ImageExtensions> = [
		"png",
		"jpg",
		"jpeg",
	];

	constructor(private app: App) {}

	public async readFile(file: TFile): Promise<FileFormat | null> {
		const extension = file.extension as ImageExtensions;
		const data = Buffer.from(await this.app.vault.readBinary(file));

		switch (extension) {
			case "jpg":
			case "jpeg":
				return new JpgFile(data);
			case "png":
				return new PngFile(data);
			default: {
				const exhaustiveCheck: never = extension;
				console.warn(
					`Unsupported file extension: ${exhaustiveCheck as unknown as string}`
				);
				return null;
			}
		}
	}

	public async writeFile(file: TFile, image: FileFormat): Promise<void> {
		const buffer = image.toBuffer();
		// SharedArrayBuffer の可能性があるため、ArrayBuffer にコピーして渡す
		const arrayBuffer = Uint8Array.from(buffer).buffer;
		await this.app.vault.modifyBinary(file, arrayBuffer);
	}
	public get isWriteable(): boolean {
		// FileSystemAdapterの場合はファイルシステムへの直接書き込みが必要なので対応していない
		// それ以外のアダプター（モバイル版など）では対応可能
		const isFileSystemAdapter =
			this.app.vault.adapter instanceof FileSystemAdapter;
		return !isFileSystemAdapter;
	}
}
