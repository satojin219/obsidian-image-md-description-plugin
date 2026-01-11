import { ReaderWriter } from "files/readerWriter";
import {
	FileView,
	MarkdownRenderChild,
	MarkdownRenderer,
	Notice,
	Plugin,
	TFile,
} from "obsidian";
import { createImageDescriptionModel } from "models/imageDescriptionModel";
import { createImageDescriptionView } from "ui/imageDescriptionView";

export async function showImageDescriptionControls(
	plugin: Plugin,
	readerWriter: ReaderWriter,
	file: TFile
): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(FileView);

	if (!view) {
		return;
	}

	const viewContent = view.containerEl.querySelector(".view-content") ;

	if (!viewContent) {
		return;
	}

	try {
		const model = await createImageDescriptionModel(readerWriter, file);

		// 既存のコントロールを削除
		viewContent.querySelector(".image-metadata-controls")?.remove();

		if (!model) {
			return;
		}

		const viewUi = createImageDescriptionView(
			viewContent as HTMLElement,
			model.loadDescription()
		);

		const renderChild = new MarkdownRenderChild(viewUi.preview);
		plugin.addChild(renderChild);

		const renderPreview = async () => {
			viewUi.preview.empty();
			await MarkdownRenderer.render(
				plugin.app,
				viewUi.input.value,
				viewUi.preview,
				file.path,
				renderChild
			);
		};

		plugin.registerDomEvent(viewUi.preview, "click", (event) => {
			const target = event.target as HTMLElement | null;
			const link = target?.closest("a");
			if (!link) {
				return;
			}
			if (link.classList.contains("internal-link")) {
				const href =
					link.getAttribute("data-href") ?? link.getAttribute("href");
				if (!href) {
					return;
				}
				event.preventDefault();
				void plugin.app.workspace.openLinkText(
					href,
					file.path,
					event.metaKey || event.ctrlKey
				);
			}
		});

		plugin.registerDomEvent(viewUi.input, "input", () => {
			model.setDescription(viewUi.input.value);
			if (!viewUi.preview.isShown()) {
				return;
			}
			void renderPreview();
		});

		plugin.registerDomEvent(viewUi.input, "blur", async () => {
			try {
				await model.save();
				new Notice("Description saved successfully");
			} catch (error) {
				new Notice("Failed to save description");
				console.error("Failed to save metadata:", error);
			}
		});

		plugin.registerDomEvent(viewUi.toggleButton, "click", async () => {
			if (viewUi.preview.isShown()) {
				viewUi.preview.hide();
				viewUi.input.show();
				viewUi.toggleButton.setText("Preview");
				return;
			}
			await renderPreview();
			viewUi.input.hide();
			viewUi.preview.show();
			viewUi.toggleButton.setText("Edit");
		});
	} catch (error) {
		new Notice(
			`Failed to read image metadata: ${error instanceof Error ? error.message : String(error)}`
		);
		console.error("Failed to read image:", error);
	}
}
