import { TFile } from "obsidian";

type LinkReplaceRange = {
	start: number;
	end: number;
};

export function renderMarkdownLinkSuggestion(
	file: TFile,
	el: HTMLElement
): void {
	const path = file.path.replace(/\.md$/i, "");
	el.createDiv({ text: file.basename });
	el.createDiv({ text: path, cls: "image-metadata__suggest-path" });
}

export function applyMarkdownLinkSuggestion(
	inputEl: HTMLTextAreaElement,
	file: TFile,
	range: LinkReplaceRange
): void {
	const linkText = file.basename;
	const value = inputEl.value;
	const before = value.slice(0, range.start);

	inputEl.value = `${before}[[${linkText}]]`;
	const newCursor = before.length + 2 + linkText.length;
	inputEl.setSelectionRange(newCursor, newCursor);
	inputEl.dispatchEvent(new Event("input"));
}
