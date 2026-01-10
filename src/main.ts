import { ReaderWriter } from "files/readerWriter";
import { FileView, Plugin, TFile, Notice } from "obsidian";

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

		await this.addControls(file);
	}

	private async addControls(file: TFile) {
		const view = this.app.workspace.getActiveViewOfType(FileView);

		if (!view) {
			return;
		}

		const viewContent = view.containerEl.querySelector(".view-content");

		if (!viewContent) {
			return;
		}

		try {
			const image = await this.readerWriter!.readFile(file);

			// 既存のコントロールを削除
			viewContent.querySelector(".image-metadata-controls")?.remove();

			if (!image) {
				return;
			}

			// メタデータコントロールコンテナ
			const controlsContainer = viewContent.createDiv({
				cls: "image-metadata-controls",
			});

			controlsContainer.createDiv({
				cls: "image-metadata__tag-name",
				text: "Description",
			});

			console.log("Current description:", image.imageDescription);
			const descriptionInput = controlsContainer.createEl("textarea", {
				cls: "image-metadata__tag-value",
				value: image.imageDescription,
			});
			descriptionInput.value = image.imageDescription;
			descriptionInput.style.width = "100%";
			descriptionInput.style.minHeight = "60px";
			descriptionInput.style.marginBottom = "10px";

			// 変更時の処理
			descriptionInput.addEventListener("input", () => {
				image.imageDescription = descriptionInput.value;
			});

			// フォーカスが外れた時に保存
			descriptionInput.addEventListener("blur", async () => {
				try {
					await this.readerWriter!.writeFile(file, image);
					new Notice("Description saved successfully");
				} catch (error) {
					new Notice(`Failed to save description`);
					console.error("Failed to save metadata:", error);
				}
			});

			// 保存ボタン
			const saveButton = controlsContainer.createEl("button", {
				text: "Save Description",
				cls: "mod-cta",
			});

			saveButton.addEventListener("click", async () => {
				try {
					image.imageDescription = descriptionInput.value;
					await this.readerWriter!.writeFile(file, image);
					new Notice("Description saved successfully");
				} catch (error) {
					new Notice(
						`Failed to save description: ${error instanceof Error ? error.message : String(error)}`
					);
					console.error("Failed to save metadata:", error);
				}
			});
		} catch (error) {
			new Notice(
				`Failed to read image metadata: ${error instanceof Error ? error.message : String(error)}`
			);
			console.error("Failed to read image:", error);
		}
	}
}
