import type { ReaderWriter } from "files/readerWriter";
import { type Component, FileView, Notice, type Plugin, type TFile } from "obsidian";
import { createImageDescriptionSession } from "controllers/imageDescriptionSession";

export class ImageDescriptionControlsController {
	private activeControlsSession: Component | null = null;
	private mountSequence = 0;

	constructor(
		private readonly plugin: Plugin,
		private readonly readerWriter: ReaderWriter
	) {}

	public async mount(file: TFile): Promise<void> {
		const sequence = ++this.mountSequence;

		// 画像以外のファイルではバイナリ読み込みもUIマウントも行わない。
		if (!this.readerWriter.supports(file)) {
			this.clearActiveControlsSession();
			return;
		}

		const view = this.plugin.app.workspace.getActiveViewOfType(FileView);

		if (!view) {
			this.clearActiveControlsSession();
			return;
		}

		const viewContent = view.containerEl.querySelector(".view-content");

		if (!(viewContent instanceof HTMLElement)) {
			this.clearActiveControlsSession();
			return;
		}

		try {
			this.clearActiveControlsSession();
			const session = await createImageDescriptionSession({
				plugin: this.plugin,
				readerWriter: this.readerWriter,
				file,
				viewContent,
				isStale: () => sequence !== this.mountSequence,
			});
			if (!session) {
				return;
			}
			if (sequence !== this.mountSequence) {
				session.unload();
				return;
			}
			this.plugin.addChild(session);
			this.activeControlsSession = session;
			session.register(() => {
				// unload 時に現在セッションへの参照を解放する。
				// 比較ガードを入れて、古い session の後処理で新しい参照を消さないようにする。
				if (this.activeControlsSession === session) {
					this.activeControlsSession = null;
				}
			});
		} catch (error) {
			new Notice(
				`Failed to read image metadata: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	public unload(): void {
		this.mountSequence++;
		this.clearActiveControlsSession();
	}

	// file-open ごとに前回セッションを確実に unload して、イベント/child の積み上がりを防ぐ。
	private clearActiveControlsSession(): void {
		if (!this.activeControlsSession) {
			return;
		}

		this.plugin.removeChild(this.activeControlsSession);
		this.activeControlsSession = null;
	}
}
