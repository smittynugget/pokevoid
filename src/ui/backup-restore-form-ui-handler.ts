import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { Mode } from "./ui";
import { TextStyle, addTextObject } from "./text";
import { addWindow, WindowVariant } from "./ui-theme";
import i18next from "i18next";
import BattleScene from "../battle-scene";
import { BackupInfo } from "../system/game-data";
import { createSporadicPattern } from "../utils";

export default class BackupRestoreFormUiHandler extends ModalUiHandler {
    private backupListContainer: Phaser.GameObjects.Container | null = null;
    private backupItems: Phaser.GameObjects.Container[] = [];
    private selectedBackupIndex: number = 0;
    private availableBackups: BackupInfo[] = [];
    private warningText: Phaser.GameObjects.Text | null = null;
    private noBackupsText: Phaser.GameObjects.Text | null = null;
    private fullscreenBackdrop: Phaser.GameObjects.Rectangle | null = null;
    private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
    private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
    private modalBorder: Phaser.GameObjects.Graphics | null = null;
    private selectionCursor: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
    }

    getModalTitle(config?: ModalConfig): string {
        return i18next.t("menu:backupRestore.title");
    }

    getWidth(config?: ModalConfig): number {
        return 280;
    }

    getHeight(config?: ModalConfig): number {
        return 140;
    }

    getMargin(config?: ModalConfig): [number, number, number, number] {
        return [0, 0, 0, 0];
    }

    getButtonLabels(config?: ModalConfig): string[] {
        return [i18next.t("menu:backupRestore.restore"), i18next.t("menu:backupRestore.clearCache"), i18next.t("menu:cancel")];
    }

    setup(): void {
        super.setup();
        const width = this.getWidth();

        this.warningText = addTextObject(
            this.scene,
            width / 2,
            24,
            i18next.t("menu:backupRestore.warning"),
            TextStyle.TOOLTIP_CONTENT,
            { fontSize: "38px" }
        );
        this.warningText.setOrigin(0.5, 0);
        this.warningText.setColor("#ff6666");
        this.modalContainer.add(this.warningText);

        this.backupListContainer = this.scene.add.container(10, 42);
        this.modalContainer.add(this.backupListContainer);

        this.noBackupsText = addTextObject(
            this.scene,
            width / 2,
            70,
            i18next.t("menu:backupRestore.noBackups"),
            TextStyle.TOOLTIP_CONTENT,
            { fontSize: "42px" }
        );
        this.noBackupsText.setOrigin(0.5, 0.5);
        this.noBackupsText.setVisible(false);
        this.modalContainer.add(this.noBackupsText);

        this.selectionCursor = this.scene.add.graphics();
        this.selectionCursor.lineStyle(1, 0xffff00, 1);
        this.backupListContainer.add(this.selectionCursor);
    }

    show(args: any[]): boolean {
        if (super.show(args)) {
            this.loadBackups();
            this.updateBackupList();
            this.setupButtonActions();
            return true;
        }
        return false;
    }

    private loadBackups(): void {
        this.availableBackups = this.scene.gameData.getAvailableBackups();
        this.selectedBackupIndex = 0;
    }

    private updateBackupList(): void {
        this.backupItems.forEach(item => item.destroy());
        this.backupItems = [];

        if (this.availableBackups.length === 0) {
            this.noBackupsText?.setVisible(true);
            this.selectionCursor?.setVisible(false);
            return;
        }

        this.noBackupsText?.setVisible(false);
        this.selectionCursor?.setVisible(true);

        const width = this.getWidth() - 20;
        const itemHeight = 18;

        this.availableBackups.forEach((backup, index) => {
            const itemContainer = this.scene.add.container(0, index * itemHeight);

            const bg = addWindow(
                this.scene,
                0, 0,
                width, itemHeight - 2,
                false, false, 0, 0,
                WindowVariant.XTHIN
            );
            bg.setOrigin(0, 0);
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => {
                this.selectedBackupIndex = index;
                this.updateCursor();
            });

            const text = addTextObject(
                this.scene,
                4,
                itemHeight / 2 - 1,
                backup.displayName,
                TextStyle.TOOLTIP_CONTENT,
                { fontSize: "38px" }
            );
            text.setOrigin(0, 0.5);

            itemContainer.add([bg, text]);
            this.backupListContainer?.add(itemContainer);
            this.backupItems.push(itemContainer);
        });

        this.updateCursor();
    }

    private updateCursor(): void {
        if (!this.selectionCursor || this.availableBackups.length === 0) return;
        const itemHeight = 18;
        const width = this.getWidth() - 20;
        this.selectionCursor.clear();
        this.selectionCursor.lineStyle(1, 0xffff00, 1);
        this.selectionCursor.strokeRect(-1, this.selectedBackupIndex * itemHeight - 1, width + 2, itemHeight);
    }

    private setupButtonActions(): void {
        if (this.buttonBgs.length >= 3) {
            this.buttonBgs[0].off("pointerdown");
            this.buttonBgs[0].on("pointerdown", () => {
                this.handleRestore();
            });

            this.buttonBgs[1].off("pointerdown");
            this.buttonBgs[1].on("pointerdown", () => {
                this.handleClearCache();
            });

            this.buttonBgs[2].off("pointerdown");
            this.buttonBgs[2].on("pointerdown", () => {
                this.scene.ui.revertMode();
            });
        }
    }

    private handleRestore(): void {
        if (this.availableBackups.length === 0) {
            return;
        }

        const selectedBackup = this.availableBackups[this.selectedBackupIndex];

        const confirmMessage = i18next.t("menu:backupRestore.confirmMessage", {
            version: selectedBackup.version
        });

        if (confirm(confirmMessage)) {
            const success = this.scene.gameData.revertToBackup(selectedBackup);
            if (success) {
                window.location.reload();
            } else {
                this.scene.ui.showText(i18next.t("menu:backupRestore.restoreFailed"), null, () => {
                    this.scene.ui.revertMode();
                }, 3000);
            }
        }
    }

    private handleClearCache(): void {
        const confirmMessage = i18next.t("menu:backupRestore.clearCacheConfirm");

        if (confirm(confirmMessage)) {
            this.performCacheClear();
        }
    }

    private async performCacheClear(): Promise<void> {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            window.location.reload();
        } catch (error) {
            this.scene.ui.showText(i18next.t("menu:backupRestore.clearCacheFailed"), null, () => {
                this.scene.ui.revertMode();
            }, 3000);
        }
    }

    updateContainer(config?: ModalConfig): void {
        const [marginTop, marginRight, marginBottom, marginLeft] = this.getMargin(config);
        const [width, height] = [this.getWidth(config), this.getHeight(config)];

        this.modalContainer.setPosition(
            ((this.scene.game.canvas.width / 6) - width) / 2,
            ((-this.scene.game.canvas.height / 6) - height) / 2
        );
        this.modalContainer.setDepth(10000);

        this.modalBg.setVisible(false);
        this.modalBg.setSize(width, height);

        if (!this.fullscreenBackdrop) {
            const ui = this.getUi();
            this.fullscreenBackdrop = this.scene.add.rectangle(
                0,
                -this.scene.game.canvas.height / 6,
                this.scene.game.canvas.width / 6,
                this.scene.game.canvas.height / 6,
                0x000000,
                0.9
            );
            this.fullscreenBackdrop.setOrigin(0, 0);
            this.fullscreenBackdrop.setDepth(9999);
            ui.add(this.fullscreenBackdrop);
        }

        if (!this.modalBackgroundImage) {
            this.modalBackgroundImage = this.scene.add.image(0, 0, "tutorial_bg");
            this.modalBackgroundImage.setOrigin(0, 0);
            this.modalContainer.addAt(this.modalBackgroundImage, 1);
        }

        if (this.modalBackgroundImage) {
            this.modalBackgroundImage.setPosition(this.modalBg.x, this.modalBg.y);
            this.modalBackgroundImage.setDisplaySize(this.modalBg.width, this.modalBg.height);
        }

        if (!this.modalPatternOverlay) {
            this.modalPatternOverlay = this.scene.add.container(0, 0);
            this.modalContainer.addAt(this.modalPatternOverlay, 2);
            createSporadicPattern(this.scene, this.modalPatternOverlay, { width, height });
        }

        if (this.modalPatternOverlay) {
            this.modalPatternOverlay.setPosition(this.modalBg.x, this.modalBg.y);
        }

        if (!this.modalBorder) {
            this.modalBorder = this.scene.add.graphics();
            this.modalContainer.add(this.modalBorder);
        }

        if (this.modalBorder) {
            this.modalBorder.clear();
            this.modalBorder.lineStyle(0.3, 0xffffff, 0.9);
            this.modalBorder.strokeRoundedRect(this.modalBg.x, this.modalBg.y, width, height, 4);
        }

        const title = this.getModalTitle(config);
        this.titleText.setText(title);
        this.titleText.setStyle({ fontSize: "51px" });
        this.titleText.setX(width / 2);
        this.titleText.setVisible(!!title);

        for (let b = 0; b < this.buttonContainers.length; b++) {
            const sliceWidth = width / (this.buttonContainers.length + 1);
            this.buttonContainers[b].setPosition(sliceWidth * (b + 1), this.modalBg.height - (this.buttonBgs[b].height + 3));
            this.buttonContainers[b].setScale(0.92);
        }
    }

    clear(): void {
        super.clear();

        if (this.fullscreenBackdrop) {
            const ui = this.getUi();
            ui.remove(this.fullscreenBackdrop);
            this.fullscreenBackdrop.destroy();
            this.fullscreenBackdrop = null;
        }

        if (this.modalBackgroundImage) {
            this.modalBackgroundImage.destroy();
            this.modalBackgroundImage = null;
        }

        if (this.modalPatternOverlay) {
            this.modalPatternOverlay.destroy();
            this.modalPatternOverlay = null;
        }

        if (this.modalBorder) {
            this.modalBorder.destroy();
            this.modalBorder = null;
        }

        this.backupItems.forEach(item => item.destroy());
        this.backupItems = [];
    }
}