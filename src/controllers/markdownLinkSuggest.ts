import { AbstractInputSuggest, App, TFile } from "obsidian";

type LinkQuery = {
	start: number;
	end: number;
	text: string;
};

export class MarkdownLinkSuggest extends AbstractInputSuggest<TFile> {
	private inputEl: HTMLTextAreaElement;
	private file: TFile;

	constructor(app: App, inputEl: HTMLTextAreaElement, file: TFile) {
		// AbstractInputSuggest only types input/div, but textarea works in practice.
		super(app, inputEl as unknown as HTMLInputElement);
		this.inputEl = inputEl;
		this.file = file;
	}

	protected getSuggestions(_query: string): TFile[] {
		const query = this.getLinkQuery();
		if (!query) {
			return [];
		}
		const lower = query.text.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => {
				const path = file.path.replace(/\.md$/i, "");
				const basename = file.basename;
				return (
					path.toLowerCase().includes(lower) ||
					basename.toLowerCase().includes(lower)
				);
			})
			.slice(0, this.limit);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		const path = file.path.replace(/\.md$/i, "");
		el.createDiv({ text: file.basename });
		el.createDiv({ text: path, cls: "image-metadata__suggest-path" });
	}

	selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		const query = this.getLinkQuery();
		if (!query) {
			return;
		}
		const linkText = file.path.replace(/\.md$/i, "");
		const value = this.inputEl.value;
		const closeIndex = value.indexOf("]]", query.start);
		const replaceEnd = closeIndex === -1 ? query.end : closeIndex + 2;
		const before = value.slice(0, query.start);
		const after = value.slice(replaceEnd);

		this.inputEl.value = `${before}[[${linkText}]]${after}`;
		const newCursor = before.length + 2 + linkText.length;
		this.inputEl.setSelectionRange(newCursor, newCursor);
		this.inputEl.dispatchEvent(new Event("input"));
	}

	private getLinkQuery(): LinkQuery | null {
		const value = this.inputEl.value;
		const cursor = this.inputEl.selectionStart ?? value.length;
		const start = value.lastIndexOf("[[", cursor - 1);
		if (start === -1) {
			return null;
		}
		const sinceStart = value.slice(start + 2, cursor);
		if (sinceStart.includes("]]")) {
			return null;
		}
		if (sinceStart.includes("|")) {
			return null;
		}
		return {
			start,
			end: cursor,
			text: sinceStart,
		};
	}
}
