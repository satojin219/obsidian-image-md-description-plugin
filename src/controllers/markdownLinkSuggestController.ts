import { App, TFile } from "obsidian";
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
	const container = document.body.createDiv({
		cls: "suggestion-container image-metadata__suggest-container",
	});
	const suggestionListEl = container.createDiv({
		cls: "suggestion image-metadata__suggest-list",
	});
	container.hide();

	let suggestions: TFile[] = [];
	let selectedIndex = 0;
	let isOpen = false;
	let isDestroyed = false;
	let inputDetachObserver: MutationObserver | null = null;

	const updatePosition = () => {
		const rect = inputEl.getBoundingClientRect();
		container.style.left = `${rect.left}px`;
		container.style.top = `${rect.bottom + 4}px`;
		container.style.width = `${rect.width}px`;
	};

	const close = () => {
		suggestions = [];
		selectedIndex = 0;
		suggestionListEl.empty();
		container.hide();
		isOpen = false;
	};

	const destroy = () => {
		if (isDestroyed) {
			return;
		}
		isDestroyed = true;
		close();
		inputDetachObserver?.disconnect();
		inputEl.removeEventListener("input", onInput);
		inputEl.removeEventListener("focus", onFocus);
		inputEl.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("resize", onResize);
		window.removeEventListener("scroll", onResize, true);
		document.removeEventListener("mousedown", onDocumentClick);
		container.remove();
	};

	const renderSuggestions = (query: LinkQuery) => {
		suggestions = findMarkdownLinkSuggestions(app, query.text);

		if (!suggestions.length) {
			close();
			return;
		}

		if (selectedIndex >= suggestions.length) {
			selectedIndex = 0;
		}

		suggestionListEl.empty();
		for (const [index, candidate] of suggestions.entries()) {
			const item = suggestionListEl.createDiv({
				cls: "suggestion-item image-metadata__suggest-item",
			});

			if (index === selectedIndex) {
				item.addClass("is-selected");
			}

			renderMarkdownLinkSuggestion(candidate, item);
			item.addEventListener("mouseenter", () => {
				selectedIndex = index;
				refreshSelection();
			});
			item.addEventListener("mousedown", (event) => {
				event.preventDefault();
				applyMarkdownLinkSuggestion(inputEl, candidate, query);
				close();
			});
		}

		if (!isOpen) {
			container.show();
			isOpen = true;
		}
		updatePosition();
	};

	const refreshSelection = () => {
		const children = Array.from(suggestionListEl.children);
		for (const [index, child] of children.entries()) {
			if (!(child instanceof HTMLElement)) {
				continue;
			}
			child.toggleClass("is-selected", index === selectedIndex);
		}
	};

	const updateSuggestions = () => {
		const query = getLinkQuery(inputEl);
		if (!query) {
			close();
			return;
		}
		renderSuggestions(query);
	};

	const selectCurrentSuggestion = () => {
		if (!suggestions.length) {
			return;
		}
		const query = getLinkQuery(inputEl);
		if (!query) {
			close();
			return;
		}
		const current = suggestions[selectedIndex];
		if (!current) {
			return;
		}
		applyMarkdownLinkSuggestion(inputEl, current, query);
		close();
	};

	const onInput = () => updateSuggestions();
	const onFocus = () => updateSuggestions();
	const onResize = () => {
		if (isOpen) {
			updatePosition();
		}
	};
	const onDocumentClick = (event: MouseEvent) => {
		const target = event.target as Node | null;
		if (!target) {
			close();
			return;
		}
		if (target === inputEl || inputEl.contains(target)) {
			return;
		}
		if (target === container || container.contains(target)) {
			return;
		}
		close();
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (!isOpen) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
			refreshSelection();
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			selectedIndex =
				(selectedIndex - 1 + suggestions.length) % suggestions.length;
			refreshSelection();
			return;
		}

		if (event.key === "Enter" || event.key === "Tab") {
			event.preventDefault();
			selectCurrentSuggestion();
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			close();
		}
	};

	inputEl.addEventListener("input", onInput);
	inputEl.addEventListener("focus", onFocus);
	inputEl.addEventListener("keydown", onKeyDown);
	window.addEventListener("resize", onResize);
	window.addEventListener("scroll", onResize, true);
	document.addEventListener("mousedown", onDocumentClick);

	inputDetachObserver = new MutationObserver(() => {
		if (!inputEl.isConnected) {
			destroy();
		}
	});
	inputDetachObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return { destroy, close };
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
