export type ImageDescriptionView = {
	root: HTMLDivElement;
	input: HTMLTextAreaElement;
	preview: HTMLDivElement;
	toggleButton: HTMLButtonElement;
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

	const toggleButton = root.createEl("button", {
		text: "Preview",
	});

	return {
		root,
		input,
		preview,
		toggleButton,
		remove: () => root.remove(),
	};
}
