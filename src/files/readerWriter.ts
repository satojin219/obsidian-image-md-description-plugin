import { App, FileSystemAdapter, TFile } from "obsidian";
import { FileFormat } from "./type";
import { ExifTool } from "exiftool-vendored";

type ImageExtensions = "jpg" | "jpeg" | "png" | "webp" | "avif";

export class ReaderWriter {
	public readonly extensions: ReadonlyArray<ImageExtensions> = [
		"jpg",
		"jpeg",
		"png",
		"webp",
		"avif",
	] as const;
	private exiftool: ExifTool;

	constructor(private app: App) {
		this.exiftool = new ExifTool();
	}

	public async readFile(file: TFile): Promise<FileFormat> {
		const extension = file.extension as ImageExtensions;
		const filePath = this.app.vault.adapter.getResourcePath(file.path);

		switch (extension) {
			case "jpg":
			case "jpeg":
			case "png":
			case "webp":
			case "avif": {
				const metadata = await this.exiftool.read(filePath);
				const arrayBuffer = await this.app.vault.adapter.readBinary(
					file.path
				);

				return {
					get imageDescription() {
						return metadata["Description"] || "";
					},
					set imageDescription(body: string) {
						metadata["Description"] = body;
					},
					toBuffer() {
						return Buffer.from(arrayBuffer);
					},
				} as FileFormat;
			}
			default: {
				const exhaustiveCheck: never = extension;
				throw new Error(exhaustiveCheck);
			}
		}
	}

	public async writeFile(file: TFile, image: FileFormat): Promise<void> {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			throw new Error("FileSystemAdapter is not supported");
		}

		await this.exiftool.write(file.path, {
			Description: image.imageDescription,
		});

		const imageBuffer = image.toBuffer();
		const buffer = imageBuffer.buffer.slice(
			imageBuffer.byteOffset,
			imageBuffer.byteOffset + imageBuffer.byteLength
		);

		const arrayBuffer =
			buffer instanceof ArrayBuffer
				? buffer
				: new ArrayBuffer(buffer.byteLength as number);

		if (!(buffer instanceof ArrayBuffer)) {
			new Uint8Array(arrayBuffer).set(new Uint8Array(buffer));
		}

		await this.app.vault.adapter.writeBinary(file.path, arrayBuffer);
	}
	public get isWriteable(): boolean {
		return !(this.app.vault.adapter instanceof FileSystemAdapter);
	}
	public async dispose(): Promise<void> {
		await this.exiftool?.end();
	}
}
