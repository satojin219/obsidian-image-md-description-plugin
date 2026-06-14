import type { App, TFile } from "obsidian";
import type { FileFormat } from "./type";
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

	public supports(file: TFile): boolean {
		return (this.extensions as ReadonlyArray<string>).includes(
			file.extension
		);
	}

	public async readFile(file: TFile): Promise<FileFormat | null> {
		if (!this.supports(file)) {
			return null;
		}
		const extension = file.extension as ImageExtensions;
		const data = Buffer.from(await this.app.vault.readBinary(file));

		switch (extension) {
			case "jpg":
			case "jpeg":
				return new JpgFile(data);
			case "png":
				return new PngFile(data);
			default: {
				// supports() で事前に弾いているので到達不可。
				// 将来 extensions に追加して case の書き忘れがあれば型エラーになる。
				const _exhaustiveCheck: never = extension;
				void _exhaustiveCheck;
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
}
