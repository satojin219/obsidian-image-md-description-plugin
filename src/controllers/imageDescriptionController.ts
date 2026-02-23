import { ReaderWriter } from "files/readerWriter";
import {
	Component,
	FileView,
	MarkdownRenderChild,
	MarkdownRenderer,
	Notice,
	Plugin,
	TFile,
} from "obsidian";
import { createImageDescriptionModel } from "models/imageDescriptionModel";
import { createMarkdownLinkSuggestController } from "controllers/markdownLinkSuggestController";
import { createImageDescriptionView } from "ui/imageDescriptionView";

let activeControlsSession: Component | null = null;
let mountSequence = 0;

export async function mountImageDescriptionControls(
	plugin: Plugin,
	readerWriter: ReaderWriter,
	file: TFile
): Promise<void> {
	const sequence = ++mountSequence;
	const view = plugin.app.workspace.getActiveViewOfType(FileView);

	if (!view) {
		clearActiveControlsSession(plugin);
		return;
	}

	const viewContent = view.containerEl.querySelector(".view-content");

	if (!(viewContent instanceof HTMLElement)) {
		clearActiveControlsSession(plugin);
		return;
	}

	try {
		clearActiveControlsSession(plugin);
		const model = await createImageDescriptionModel(readerWriter, file);
		if (sequence !== mountSequence) {
			return;
		}

		// 既存のコントロールを削除
		viewContent.querySelector(".image-metadata-controls")?.remove();

		if (!model) {
			return;
		}

		const viewUi = createImageDescriptionView(
			viewContent,
			model.loadDescription()
		);

		const session = new Component();
		plugin.addChild(session);
		activeControlsSession = session;

		const linkSuggestController = createMarkdownLinkSuggestController(
			plugin.app,
			viewUi.input
		);
		session.register(() => linkSuggestController.destroy());
		session.register(() => viewUi.remove());
		session.register(() => {
			if (activeControlsSession === session) {
				activeControlsSession = null;
			}
		});

		const renderChild = new MarkdownRenderChild(viewUi.preview);
		session.addChild(renderChild);

		const setPreviewState = (isPreview: boolean) => {
			const label = isPreview ? "Edit" : "Preview";
			if (isPreview) {
				viewUi.input.hide();
				viewUi.preview.show();
			} else {
				viewUi.preview.hide();
				viewUi.input.show();
			}
			viewUi.toggleLabel.setText(label);
			viewUi.toggleButton.setAttribute("aria-label", label);
			viewUi.toggleButton.setAttribute(
				"data-preview",
				isPreview ? "on" : "off"
			);
			viewUi.toggleButton.setAttribute(
				"aria-pressed",
				isPreview ? "true" : "false"
			);
		};

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
		if (viewUi.input.value.trim().length > 0) {
			await renderPreview();
			setPreviewState(true);
		} else {
			setPreviewState(false);
		}

		session.registerDomEvent(viewUi.preview, "click", (event) => {
			const target = event.target as HTMLElement | null;
			const link = target?.closest("a");
			if (!link) {
				if (viewUi.preview.isShown()) {
					setPreviewState(false);
				}
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

		session.registerDomEvent(viewUi.input, "input", () => {
			model.setDescription(viewUi.input.value);
			if (!viewUi.preview.isShown()) {
				return;
			}
			void renderPreview();
		});

		session.registerDomEvent(viewUi.input, "blur", async () => {
			try {
				await model.save();
				new Notice("Description saved successfully");
				await renderPreview();
				setPreviewState(true);
			} catch (error) {
				new Notice("Failed to save description");
				console.error("Failed to save metadata:", error);
			}
		});

		session.registerDomEvent(viewUi.toggleButton, "click", async () => {
			if (viewUi.preview.isShown()) {
				setPreviewState(false);
				return;
			}
			await renderPreview();
			setPreviewState(true);
		});
	} catch (error) {
		new Notice(
			`Failed to read image metadata: ${error instanceof Error ? error.message : String(error)}`
		);
		console.error("Failed to read image:", error);
	}
}

function clearActiveControlsSession(plugin: Plugin): void {
	if (!activeControlsSession) {
		return;
	}
	plugin.removeChild(activeControlsSession);
	activeControlsSession = null;
}
