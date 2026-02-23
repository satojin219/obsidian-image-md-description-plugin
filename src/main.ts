import { ReaderWriter } from "files/readerWriter";
import { Plugin } from "obsidian";
import { mountImageDescriptionControls } from "controllers/imageDescriptionController";

export default class ImageMdDescriptionPlugin extends Plugin {
	private readerWriter: ReaderWriter | undefined;

	async onload() {
		this.readerWriter = new ReaderWriter(this.app);

		this.registerEvent(
			this.app.workspace.on("file-open", this.onFileOpen.bind(this))
		);
	}

	onunload() {}

	async onFileOpen() {
		const file = this.app.workspace.getActiveFile();

		if (!file) {
			return;
		}

		await mountImageDescriptionControls(this, this.readerWriter!, file);
	}
}
