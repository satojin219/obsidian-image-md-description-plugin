export interface FileFormat {
	get imageDescription(): string;
	set imageDescription(body: string);

	toBuffer(): Buffer;
}
