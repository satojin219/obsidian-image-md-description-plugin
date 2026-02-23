import { Component } from "obsidian";

type ImageDescriptionViewHandlers = {
	onPreviewClick: (event: MouseEvent) => void;
	onInput: (value: string) => void;
	onBlur: () => void | Promise<void>;
	onToggleClick: () => void | Promise<void>;
};

export type ImageDescriptionView = {
	root: HTMLDivElement;
	getInputEl: () => HTMLTextAreaElement;
	getPreviewEl: () => HTMLDivElement;
	getValue: () => string;
	setPreviewMode: (isPreview: boolean) => void;
	isPreviewMode: () => boolean;
	// 要素にイベントを登録する
	bind: (session: Component, handlers: ImageDescriptionViewHandlers) => void;
	remove: () => void;
};

export function createImageDescriptionView(
	container: HTMLElement,
	initialText: string
): ImageDescriptionView {
	const root = container.createDiv({
		cls: "image-metadata-controls",
	});

	const toggleWrap = root.createDiv({
		cls: "image-metadata__toggle-wrap",
	});

	const toggleButton = toggleWrap.createEl("button", {
		cls: "image-metadata__toggle",
	});
	toggleButton.setAttribute("type", "button");
	toggleButton.setAttribute("aria-pressed", "false");
	toggleButton.setAttribute("data-preview", "off");

	const toggleLabel = toggleWrap.createSpan({
		cls: "image-metadata__toggle-label",
		text: "Preview",
	});

	const editorContainer = root.createDiv({
		cls: "image-metadata__editor-container",
	});

	const input = editorContainer.createEl("textarea", {
		cls: "image-metadata__tag-value",
		value: initialText,
	});
	input.value = initialText;

	const preview = editorContainer.createDiv({
		cls: "image-metadata__markdown-preview",
	});
	preview.hide();

	const setPreviewMode = (isPreview: boolean) => {
		const label = isPreview ? "Edit" : "Preview";
		if (isPreview) {
			input.hide();
			preview.show();
		} else {
			preview.hide();
			input.show();
		}
		toggleLabel.setText(label);
		toggleButton.setAttribute("aria-label", label);
		toggleButton.setAttribute("data-preview", isPreview ? "on" : "off");
		toggleButton.setAttribute("aria-pressed", isPreview ? "true" : "false");
	};

	const bind = (session: Component, handlers: ImageDescriptionViewHandlers) => {
		session.registerDomEvent(preview, "click", handlers.onPreviewClick);
		session.registerDomEvent(input, "input", () => {
			handlers.onInput(input.value);
		});
		session.registerDomEvent(input, "blur", () => {
			void handlers.onBlur();
		});
		session.registerDomEvent(toggleButton, "click", () => {
			void handlers.onToggleClick();
		});
	};

	return {
		root,
		getInputEl: () => input,
		getPreviewEl: () => preview,
		getValue: () => input.value,
		setPreviewMode,
		isPreviewMode: () => preview.isShown(),
		bind,
		remove: () => root.remove(),
	};
}
