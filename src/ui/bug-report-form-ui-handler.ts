import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { Mode } from "./mode";
import { TextStyle, addTextObject, addTextInputObject } from "./text";
import { addWindow, WindowVariant } from "./ui-theme";
import i18next from "i18next";
import BattleScene from "../battle-scene";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { createSporadicPattern } from "../utils";

export default class BugReportFormUiHandler extends ModalUiHandler {
    private hasConsent: boolean = true;
    private consentCheckmark: Phaser.GameObjects.Text | null = null;
    private lastReportTime: number = 0;
    private readonly COOLDOWN = 60000;
    private descriptionInput: InputText | null = null;
    private inputContainer: Phaser.GameObjects.Container | null = null;
    private errorMessage: Phaser.GameObjects.Text | null = null;
    private submitAction: Function | null = null;
    private fullscreenBackdrop: Phaser.GameObjects.Rectangle | null = null;
    private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
    private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
    private modalBorder: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
    }

    getModalTitle(config?: ModalConfig): string {
        return i18next.t("menu:bugReport.title");
    }

    getWidth(config?: ModalConfig): number {
        return 220;
    }

    getHeight(config?: ModalConfig): number {
        return 140;
    }

    getMargin(config?: ModalConfig): [number, number, number, number] {
        return [0, 0, 0, 0];
    }

    getButtonLabels(config?: ModalConfig): string[] {
        return [i18next.t("menu:bugReport.submit"), i18next.t("menu:cancel")];
    }

    setup(): void {
        super.setup();

        const width = this.getWidth();

        const labelText = addTextObject(
            this.scene,
            10,
            28,
            i18next.t("menu:bugReport.describeIssue") + ":",
            TextStyle.TOOLTIP_CONTENT,
            { fontSize: "42px" }
        );
        this.modalContainer.add(labelText);

        this.inputContainer = this.scene.add.container(10, 42);
        this.inputContainer.setVisible(false);

        const inputBg = addWindow(this.scene, 0, 0, width - 20, 50, false, false, 0, 0, WindowVariant.XTHIN);

        this.descriptionInput = addTextInputObject(
            this.scene,
            4,
            2,
            (width - 28) * 6,
            280,
            TextStyle.WINDOW,
            {
                type: "textarea",
                maxLength: 500,
                fontSize: "36px"
            }
        );
        this.descriptionInput.setOrigin(0, 0);

        this.inputContainer.add(inputBg);
        this.inputContainer.add(this.descriptionInput);
        this.modalContainer.add(this.inputContainer);

        const checkboxY = 98;
        const checkboxContainer = this.scene.add.container(10, checkboxY);

        const box = this.scene.add.rectangle(0, 0, 10, 10, 0x333333);
        box.setStrokeStyle(1, 0xffffff);
        box.setOrigin(0, 0.5);
        box.setInteractive({ useHandCursor: true });

        this.consentCheckmark = addTextObject(this.scene, 2, 0, "✓", TextStyle.TOOLTIP_CONTENT, { fontSize: "32px" });
        this.consentCheckmark.setOrigin(0, 0.5);
        this.consentCheckmark.setVisible(this.hasConsent);

        const checkboxLabel = addTextObject(
            this.scene,
            15,
            0,
            i18next.t("menu:bugReport.consentRequired"),
            TextStyle.TOOLTIP_CONTENT,
            { fontSize: "42px" }
        );
        checkboxLabel.setOrigin(0, 0.5);

        checkboxContainer.add([box, this.consentCheckmark, checkboxLabel]);
        this.modalContainer.add(checkboxContainer);

        box.on("pointerdown", () => {
            this.hasConsent = !this.hasConsent;
            this.consentCheckmark?.setVisible(this.hasConsent);
        });

        const infoText = addTextObject(
            this.scene,
            10,
            checkboxY + 12,
            i18next.t("menu:bugReport.saveIncluded"),
            TextStyle.TOOLTIP_CONTENT,
            { fontSize: "38px" }
        );
        infoText.setAlpha(0.7);
        this.modalContainer.add(infoText);

        this.errorMessage = addTextObject(this.scene, 10, 18, "", TextStyle.TOOLTIP_CONTENT, { fontSize: "38px" });
        this.errorMessage.setColor("#ff6666");
        this.errorMessage.setVisible(false);
        this.modalContainer.add(this.errorMessage);
    }

    show(args: any[]): boolean {
        if (super.show(args)) {
            this.inputContainer?.setVisible(true);

            const config = args[0] as ModalConfig;

            this.submitAction = async () => {
                if (!this.canSubmit()) {
                    this.showError(i18next.t("menu:bugReport.rateLimited"));
                    return;
                }

                if (!this.hasConsent) {
                    this.showError(i18next.t("menu:bugReport.consentNeeded"));
                    return;
                }

                const description = this.descriptionInput?.text?.trim() || "";
                if (description.length < 10) {
                    this.showError(i18next.t("menu:bugReport.descriptionTooShort"));
                    return;
                }

                this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });

                try {
                    const saveBlob = await this.scene.gameData.getExportDataBlob();

                    if (!saveBlob) {
                        this.showError(i18next.t("menu:bugReport.saveError"));
                        this.scene.ui.setMode(Mode.BUG_REPORT_FORM, config);
                        return;
                    }

                    const success = await this.sendToDiscord(description, saveBlob);

                    if (success) {
                        this.lastReportTime = Date.now();
                        this.scene.ui.showText(i18next.t("menu:bugReport.success"), null, () => {
                            this.scene.ui.revertMode();
                            this.scene.ui.clearText();
                        }, 3000);
                    } else {
                        this.showFallback(description);
                    }
                } catch (error) {
                    console.error('Bug report error:', error);
                    this.showFallback(description);
                }
            };

            if (this.buttonBgs.length) {
                this.buttonBgs[0].off("pointerdown");
                this.buttonBgs[0].on("pointerdown", () => {
                    if (this.submitAction) {
                        this.submitAction();
                    }
                });
            }

            return true;
        }

        return false;
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
            this.modalBorder.strokeRoundedRect(
                this.modalBg.x,
                this.modalBg.y,
                width,
                height,
                4
            );
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

    private canSubmit(): boolean {
        return Date.now() - this.lastReportTime > this.COOLDOWN;
    }

    private showError(message: string): void {
        if (this.errorMessage) {
            this.errorMessage.setText(message);
            this.errorMessage.setVisible(true);
        }
        this.scene.ui.playError();
    }

    private async sendToDiscord(description: string, saveBlob: Blob): Promise<boolean> {
        try {
            const formData = new FormData();
            formData.append('description', description);

            if (saveBlob.size < 8 * 1024 * 1024) {
                const now = new Date();
                const filename = `bugreport_${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.prsv`;
                formData.append('save_file', saveBlob, filename);
            }

            const response = await fetch('/api/bug-report', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                return result.success === true;
            }
            const errorBody = await response.text();
            console.error('Bug report API error:', response.status, errorBody);
            return false;
        } catch (error) {
            console.error('Bug report error:', error);
            return false;
        }
    }

    private async showFallback(description: string): Promise<void> {
        const reportText =
            `=== PokéVoid Bug Report ===\n` +
            `Description: ${description}\n\n` +
            `Please export your save and attach it manually.`;

        try {
            await navigator.clipboard.writeText(reportText);
            this.scene.ui.showText(i18next.t("menu:bugReport.copiedFallback"), null, () => {
                window.open("https://discord.gg/xsQummMK3H", "_blank");
                this.scene.ui.revertMode();
                this.scene.ui.clearText();
            }, 3000);
        } catch (error) {
            this.scene.ui.showText(i18next.t("menu:bugReport.failed"), null, () => {
                this.scene.ui.revertMode();
                this.scene.ui.clearText();
            }, 3000);
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

        this.inputContainer?.setVisible(false);
        this.errorMessage?.setVisible(false);

        this.hasConsent = true;
        this.consentCheckmark?.setVisible(true);

        if (this.descriptionInput) {
            this.descriptionInput.text = "";
        }
    }
}