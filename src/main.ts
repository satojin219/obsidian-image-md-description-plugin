import { ReaderWriter } from "files/readerWriter";
import { Plugin } from "obsidian";
import { ImageDescriptionControlsController } from "controllers/imageDescriptionController";

export default class ImageMdDescriptionPlugin extends Plugin {
	private imageDescriptionControls: ImageDescriptionControlsController | undefined;

	async onload() {
		const readerWriter = new ReaderWriter(this.app);
		this.imageDescriptionControls = new ImageDescriptionControlsController(
			this,
			readerWriter
		);

		this.registerEvent(
			this.app.workspace.on("file-open", this.onFileOpen.bind(this))
		);
	}

	onunload() {
		this.imageDescriptionControls?.unload();
		this.imageDescriptionControls = undefined;
	}

	async onFileOpen() {
		const file = this.app.workspace.getActiveFile();

		if (!file || !this.imageDescriptionControls) {
			return;
		}

		await this.imageDescriptionControls.mount(file);
	}
}
