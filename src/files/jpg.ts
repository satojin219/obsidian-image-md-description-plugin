import * as piexifjs from "piexifjs";
import { FileFormat } from "./type";

export class JpgFile implements FileFormat {
	private readonly metadata: piexifjs.ExifDict;
	private readonly dataUrl: string;

	constructor(data: Buffer) {
		this.dataUrl = `data:image/jpeg;base64,${data.toString("base64")}`;
		this.metadata = piexifjs.load(this.dataUrl);
	}

	public get imageDescription(): string {
		if (!this.metadata["0th"]) {
			return "";
		}
		const desc = this.metadata["0th"][piexifjs.ImageIFD.ImageDescription] as string;
		return Buffer.from(
			desc,
			"latin1"
		).toString("utf-8");
	}

	public set imageDescription(s: string) {
		if (s !== "" && this.metadata["0th"]) {
			this.metadata["0th"][piexifjs.ImageIFD.ImageDescription] =
				Buffer.from(s).toString("latin1");
		} else {
			delete this.metadata["0th"]?.[piexifjs.ImageIFD.ImageDescription];
		}
	}

	public toBuffer(): Buffer {
		const updatedImageDataUrl = piexifjs.insert(
			piexifjs.dump(this.metadata),
			this.dataUrl
		);
		return Buffer.from(updatedImageDataUrl.split(",")[1] as string, "base64");
	}
}
