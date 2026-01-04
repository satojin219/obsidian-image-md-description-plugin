import { ReaderWriter } from "files/readerWriter";
import { Plugin } from "obsidian";

export default class ImageMdDescriptionPlugin extends Plugin {
	private readerWriter: ReaderWriter | undefined;

	async onload() {
		this.readerWriter = new ReaderWriter(this.app);

		if (!this.readerWriter.isWriteable) {
			return;
		}

		this.registerEvent(
			this.app.workspace.on("file-open", this.onFileOpen.bind(this))
		);
	}

	onunload () {
		void this.readerWriter?.dispose();
	}

	async onFileOpen() {
		const file = this.app.workspace.getActiveFile();

		if (!file) {
			return;
		}
	}
}
