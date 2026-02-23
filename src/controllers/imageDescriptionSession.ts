import { ReaderWriter } from "files/readerWriter";
import {
	Component,
	MarkdownRenderChild,
	MarkdownRenderer,
	Notice,
	Plugin,
	TFile,
} from "obsidian";
import { createImageDescriptionModel } from "models/imageDescriptionModel";
import { createMarkdownLinkSuggestController } from "controllers/markdownLinkSuggestController";
import { createImageDescriptionView } from "ui/imageDescriptionView";

type SessionParams = {
	plugin: Plugin;
	readerWriter: ReaderWriter;
	file: TFile;
	viewContent: HTMLElement;
	isStale: () => boolean;
};

export async function createImageDescriptionSession(
	params: SessionParams
): Promise<Component | null> {
	const { plugin, readerWriter, file, viewContent, isStale } = params;
	const model = await createImageDescriptionModel(readerWriter, file);
	if (isStale()) {
		return null;
	}

	// 既存のコントロールを削除
	viewContent.querySelector(".image-metadata-controls")?.remove();
	if (!model) {
		return null;
	}

	const viewUi = createImageDescriptionView(viewContent, model.loadDescription());
	const session = new Component();
	const inputEl = viewUi.getInputEl();
	const previewEl = viewUi.getPreviewEl();

	const linkSuggestController = createMarkdownLinkSuggestController(
		plugin.app,
		inputEl
	);
	session.register(() => linkSuggestController.destroy());
	session.register(() => viewUi.remove());

	const renderChild = new MarkdownRenderChild(previewEl);
	session.addChild(renderChild);

	const renderPreview = async () => {
		previewEl.empty();
		await MarkdownRenderer.render(
			plugin.app,
			viewUi.getValue(),
			previewEl,
			file.path,
			renderChild
		);
	};

	// 初期描画時、値があるならpreview、なければeditで表示
	if (viewUi.getValue().trim().length > 0) {
		await renderPreview();
		if (isStale()) {
			session.unload();
			return null;
		}
		viewUi.setPreviewMode(true);
	} else {
		viewUi.setPreviewMode(false);
	}

	viewUi.bind(session, {
		onPreviewClick: (event) => {
			const target = event.target as HTMLElement | null;
			const link = target?.closest("a");
			if (!link) {
				if (viewUi.isPreviewMode()) {
					viewUi.setPreviewMode(false);
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
		},
		onInput: (value) => {
			model.setDescription(value);
			if (!viewUi.isPreviewMode()) {
				return;
			}
			void renderPreview();
		},
		onBlur: async () => {
			try {
				await model.save();
				new Notice("Description saved successfully");
				await renderPreview();
				viewUi.setPreviewMode(true);
			} catch (error) {
				new Notice("Failed to save description");
				console.error("Failed to save metadata:", error);
			}
		},
		onToggleClick: async () => {
			if (viewUi.isPreviewMode()) {
				viewUi.setPreviewMode(false);
				return;
			}
			await renderPreview();
			viewUi.setPreviewMode(true);
		},
	});

	return session;
}
