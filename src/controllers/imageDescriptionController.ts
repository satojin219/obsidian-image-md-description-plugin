import { ReaderWriter } from "files/readerWriter";
import { Component, FileView, Notice, Plugin, TFile } from "obsidian";
import { createImageDescriptionSession } from "controllers/imageDescriptionSession";

// 現在表示中のコントロールセッション（次回 file-open で差し替える）。
let activeControlsSession: Component | null = null;
// 非同期処理の競合を防ぐための連番。最新の mount 呼び出しだけを有効化する。
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
		const session = await createImageDescriptionSession({
			plugin,
			readerWriter,
			file,
			viewContent,
			isStale: () => sequence !== mountSequence,
		});
		if (!session) {
			return;
		}
		if (sequence !== mountSequence) {
			session.unload();
			return;
		}
		plugin.addChild(session);
		activeControlsSession = session;
		session.register(() => {
			// unload 時に現在セッションへの参照を解放する。
			// 比較ガードを入れて、古い session の後処理で新しい参照を消さないようにする。
			if (activeControlsSession === session) {
				activeControlsSession = null;
			}
		});
	} catch (error) {
		new Notice(
			`Failed to read image metadata: ${error instanceof Error ? error.message : String(error)}`
		);
		console.error("Failed to read image:", error);
	}
}

// file-open ごとに前回セッションを確実に unload して、イベント/child の積み上がりを防ぐ。
function clearActiveControlsSession(plugin: Plugin): void {
	if (!activeControlsSession) {
		return;
	}

	plugin.removeChild(activeControlsSession);
	activeControlsSession = null;
}
