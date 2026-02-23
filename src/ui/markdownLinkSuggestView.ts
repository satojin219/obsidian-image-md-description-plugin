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
	const linkText = file.path.replace(/\.md$/i, "");
	const value = inputEl.value;
	const closeIndex = value.indexOf("]]", range.start);
	const replaceEnd = closeIndex === -1 ? range.end : closeIndex + 2;
	const before = value.slice(0, range.start);
	const after = value.slice(replaceEnd);

	inputEl.value = `${before}[[${linkText}]]${after}`;
	const newCursor = before.length + 2 + linkText.length;
	inputEl.setSelectionRange(newCursor, newCursor);
	inputEl.dispatchEvent(new Event("input"));
}
