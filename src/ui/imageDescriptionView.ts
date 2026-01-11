export type ImageDescriptionView = {
	root: HTMLDivElement;
	input: HTMLTextAreaElement;
	preview: HTMLDivElement;
	toggleButton: HTMLButtonElement;
	toggleLabel: HTMLSpanElement;
	remove: () => void;
};

export function createImageDescriptionView(
	container: HTMLElement,
	initialText: string
): ImageDescriptionView {
	const root = container.createDiv({
		cls: "image-metadata-controls",
	});

	const input = root.createEl("textarea", {
		cls: "image-metadata__tag-value",
		value: initialText,
	});
	input.value = initialText;

	const preview = root.createDiv({
		cls: "image-metadata__markdown-preview",
	});
	preview.hide();

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

	return {
		root,
		input,
		preview,
		toggleButton,
		toggleLabel,
		remove: () => root.remove(),
	};
}
