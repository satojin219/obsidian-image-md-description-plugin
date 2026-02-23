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
		const zerothIfd = this.metadata["0th"];
		if (!zerothIfd) {
			return "";
		}
		const rawDescription = zerothIfd[
			piexifjs.ImageIFD.ImageDescription
		] as unknown;
		if (typeof rawDescription !== "string" || rawDescription.length === 0) {
			return "";
		}
		return Buffer.from(rawDescription, "latin1").toString("utf-8");
	}

	public set imageDescription(s: string) {
		if (s !== "") {
			if (!this.metadata["0th"]) {
				this.metadata["0th"] = {} as piexifjs.ExifDict["0th"];
			}
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
