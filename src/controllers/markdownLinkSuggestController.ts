import { AbstractInputSuggest, App, TFile } from "obsidian";
import {
	applyMarkdownLinkSuggestion,
	renderMarkdownLinkSuggestion,
} from "ui/markdownLinkSuggestView";

type LinkQuery = {
	start: number;
	end: number;
	text: string;
};

type MarkdownLinkSuggestController = {
	destroy: () => void;
	close: () => void;
};

const SUGGESTION_LIMIT = 20;

export function createMarkdownLinkSuggestController(
	app: App,
	inputEl: HTMLTextAreaElement
): MarkdownLinkSuggestController {
	const suggest = new MarkdownLinkInputSuggest(app, inputEl);
	let isDestroyed = false;
	const inputDetachObserver = new MutationObserver(() => {
		if (!inputEl.isConnected) {
			destroy();
		}
	});

	inputDetachObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});

	const close = () => {
		suggest.close();
	};

	const destroy = () => {
		if (isDestroyed) {
			return;
		}
		isDestroyed = true;
		close();
		inputDetachObserver.disconnect();
	};

	return { destroy, close };
}

class MarkdownLinkInputSuggest extends AbstractInputSuggest<TFile> {
	private readonly inputElRef: HTMLTextAreaElement;

	constructor(app: App, inputEl: HTMLTextAreaElement) {
		super(app, inputEl as unknown as HTMLInputElement);
		this.inputElRef = inputEl;
		this.limit = SUGGESTION_LIMIT;
	}

	protected getSuggestions(_query: string): TFile[] {
		const query = getLinkQuery(this.inputElRef);
		if (!query) {
			return [];
		}
		return findMarkdownLinkSuggestions(this.app, query.text);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		renderMarkdownLinkSuggestion(file, el);
	}

	selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		const query = getLinkQuery(this.inputElRef);
		if (!query) {
			this.close();
			return;
		}
		applyMarkdownLinkSuggestion(this.inputElRef, file, query);
		this.close();
	}
}

function findMarkdownLinkSuggestions(app: App, queryText: string): TFile[] {
	const lower = queryText.toLowerCase();
	return app.vault
		.getMarkdownFiles()
		.filter((markdownFile) => {
			const path = markdownFile.path.replace(/\.md$/i, "");
			const basename = markdownFile.basename;
			return (
				path.toLowerCase().includes(lower) ||
				basename.toLowerCase().includes(lower)
			);
		})
		.slice(0, SUGGESTION_LIMIT);
}

function getLinkQuery(inputEl: HTMLTextAreaElement): LinkQuery | null {
	const value = inputEl.value;
	const cursor = inputEl.selectionStart ?? value.length;
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
