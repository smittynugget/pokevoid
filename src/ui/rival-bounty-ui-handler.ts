import BountyUiHandler from "./bounty-ui-handler";
import { Mode } from "./ui";
import BattleScene from "../battle-scene";
import { RIVAL_CONSOLE_CODES } from "../modifier/modifier-type";
import { addTextObject, TextStyle } from "./text";
import { TrainerType } from "#enums/trainer-type";
import {RivalTrainerType} from "#app/data/trainer-config";
import { toReadableString } from "../utils";
import i18next from "i18next";
import { getIsInitialized, initI18n } from "#app/plugins/i18n";
import { trainerConfigs } from "../data/trainer-config";
import { TrainerVariant } from "../field/trainer";
import { PermaRunQuestModifier } from "../modifier/modifier";
import {ModalConfig} from "#app/ui/modal-ui-handler";
import {Button} from "#enums/buttons";
import {addWindow} from "#app/ui/ui-theme";

export default class RivalBountyUiHandler extends BountyUiHandler {
    private trainerType: RivalTrainerType;
    private trainerSprite: Phaser.GameObjects.Sprite;
    private trainerTintSprite: Phaser.GameObjects.Sprite;
    private spriteKey: string;
    protected replacementContainer: Phaser.GameObjects.Container;
    protected selectedBountyToReplace: PermaRunQuestModifier | null = null;
    protected originalSubmitAction: Function | null = null;
    protected currentReplaceBtnIndex: number = 0;
    protected bountyButtons: Phaser.GameObjects.Container[] = [];
    protected cancelButton: Phaser.GameObjects.Container;

    getModalTitle(): string {
        return i18next.t("questUi:bounty.rival.modalTitle");
    }

     protected getMaxStages(): number {
        return 5; 
    }

    protected getTaskText(): string {
        const trainerInfo = this.getBaseTrainerInfo();
        if (!trainerInfo) return i18next.t("questUi:bounty.rival.invalidTrainer");

        const trainerName = this.formatBountyTarget(TrainerType[trainerInfo]);
        return i18next.t("questUi:bounty.rival.task", {
            trainerName,
            stage: this.currentStageView
        });
    }

    protected formatBountyTarget(target: string): string {
        if (!getIsInitialized()) {
            initI18n();
        }

        const trainerKey = `trainerClasses:${target.toLowerCase()}`;
        if (i18next.exists(trainerKey)) {
            return i18next.t(trainerKey);
        }
        return toReadableString(target);
    }

    protected getBaseTrainerInfo(): RivalTrainerType | null {
        const trainerType = Number(Object.entries(RIVAL_CONSOLE_CODES)
            .find(([_, code]) => code === this.consoleCode)?.[0]);
        return isNaN(trainerType) ? null : trainerType;
    }

    protected async loadTexture(): Promise<void> {
        try {
            const trainerInfo = this.getBaseTrainerInfo();
            if (!trainerInfo) {
                throw new Error('Invalid trainer type');
            }

            const config = trainerConfigs[trainerInfo];
            this.spriteKey = config.getSpriteKey(false, false);


            console.log(`[RivalBountyUI] Loading trainer texture: ${this.spriteKey}`);

            return new Promise((resolve, reject) => {
                this.scene.load.atlas(
                    this.spriteKey,
                    `images/trainer/${this.spriteKey}.png`,
                    `images/trainer/${this.spriteKey}.json`
                );

                this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                    console.log(`[RivalBountyUI] Trainer texture loaded: ${this.spriteKey}`);
                    this.textureLoaded = true;
                    resolve();
                });

                this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                    console.error(`[RivalBountyUI] Failed to load trainer texture: ${file.key}`);
                    reject(new Error(`Failed to load trainer texture: ${file.key}`));
                });

                if (!this.scene.load.isLoading()) {
                    this.scene.load.start();
                }
            });
        } catch (error) {
            console.error('[RivalBountyUI] Error in loadTexture:', error);
            throw error;
        }
    }

    protected setupSprite(): void {
        if (!this.textureLoaded || !this.scene.textures.exists(this.spriteKey)) {
            throw new Error('Invalid trainer texture state');
        }

        this.cleanup();

        try {
            const getSprite = (hasShadow?: boolean) => {
                const sprite = (this.scene as BattleScene).addFieldSprite(0, 0, this.spriteKey);
                sprite.setOrigin(0.5, 1);
                sprite.setScale(0.85);
                return sprite;
            };

            const container = new Phaser.GameObjects.Container(this.scene, 65, 85);
            container.setName("container-rival-trainer");

            this.trainerSprite = getSprite(true);
            this.trainerSprite.setName("sprite-rival-trainer");

            this.trainerTintSprite = getSprite(false);
            this.trainerTintSprite.setName("sprite-rival-trainer-tint");
            this.trainerTintSprite.setVisible(false);

            container.add([this.trainerSprite, this.trainerTintSprite]);
            this.uiContainer.add(container);

            if (this.trainerSprite.texture.frameTotal > 1) {
                const animConfig = {
                    key: this.spriteKey,
                    repeat: -1,
                    frameRate: 24
                };
                this.trainerSprite.play(animConfig);
                this.trainerTintSprite.play(animConfig);
            }

        } catch (error) {
            this.cleanup();
            console.error('[RivalBountyUI] Sprite setup failed:', error);
            throw error;
        }
    }

    private cleanup(): void {
                if (this.trainerSprite) {
                    this.trainerSprite.destroy();
                    this.trainerSprite = null;
                }
                if (this.trainerTintSprite) {
                    this.trainerTintSprite.destroy();
                    this.trainerTintSprite = null;
                }
        }

    protected getRewardChances(): string {
        return i18next.t(`questUi:bounty.rival.rewards.stage${this.currentStageView}`);
    }

    protected setupSpecificUI(config: any): void {
        const trainerInfo = this.getBaseTrainerInfo();
        if (!trainerInfo) return;

        const questStatus = this.getQuestStatus();
        const currentStage = questStatus.stage || 1;
        const maxStage = this.getMaxStages();

        const progressContainer = this.scene.add.container(120, 80);
        this.uiContainer.add(progressContainer);

        const progressText = addTextObject(
            this.scene,
            0,
            0,
            i18next.t("questUi:bounty.rival.progress.title"),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        progressContainer.add(progressText);

        const stageText = addTextObject(
            this.scene,
            0,
            10,
            i18next.t("questUi:bounty.rival.progress.count", {
                current: currentStage,
                max: maxStage
            }),
            TextStyle.WINDOW,
            { fontSize: '40px' }
        );
        progressContainer.add(stageText);
    }

    protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {
        const viewOnly = args[3] ?? false;
        this.originalSubmitAction = [...config.buttonActions][0];

        if (!this.hasActiveBountyOfSameType()) {
            config.buttonActions[0] = this.originalSubmitAction;
            return config;
        }
        else if (!viewOnly && this.hasActiveBountyOfSameType()) {
            config.buttonActions[0] = () => {
                this.showReplacementSelection();
            };
        }

        return config;
    }

    protected hasConsoleCode(modifier: PermaRunQuestModifier): boolean {
        return this.consoleCode != null && this.consoleCode != "" ? modifier.consoleCode != "" : modifier.consoleCode == "";
    }

    protected showReplacementSelection(): void {
        this.replacementContainer = this.scene.add.container(0, 0);
        this.modalContainer.add(this.replacementContainer);

        const bg = this.scene.add.rectangle(
            0,  
            0, 
            this.scene.game.canvas.width,
            this.scene.game.canvas.height,
            0x000000,
            0.6
        );
        bg.setOrigin(0.5, 0.5); 
        this.replacementContainer.add(bg);

        const bountyListContainer = this.scene.add.container(
            this.getWidth() / 2,
            this.getHeight() / 2
        );
        this.replacementContainer.add(bountyListContainer);

        const existingBounties = this.scene.gameData.permaModifiers.findModifiers(m =>
            m instanceof PermaRunQuestModifier &&
            this.scene.gameData.permaModifiers.isRivalBountyQuest(m.questUnlockData?.questId)
            && this.hasConsoleCode(m)
        ) as PermaRunQuestModifier[];

        const title = addTextObject(
            this.scene,
            7,
            7,
            i18next.t("questUi:bounty.quest.replacement.title"),
            TextStyle.WINDOW,
            { fontSize: "40px" }
        );
        bountyListContainer.add(title);

        let currentY = 18; 
        this.bountyButtons = [];

        existingBounties.forEach((bounty) => {
            const button = this.createBountyOption(bounty, currentY);
            bountyListContainer.add(button);
            this.bountyButtons.push(button);
            currentY += 10;
        });

        this.cancelButton = this.createCancelButton(currentY + 4);
        bountyListContainer.add(this.cancelButton);
        this.bountyButtons.push(this.cancelButton);

        const windowHeight = currentY + 20; 
        const windowWidth = 65; 

        const bountyListBg = addWindow(
            this.scene,
            0, 
            0, 
            windowWidth,
            windowHeight
        );
        bountyListContainer.addAt(bountyListBg, 0);

        if (this.bountyButtons.length > 0) {
            this.setReplaceBountyIndex(0);
        }

        this.modalContainer.add(this.replacementContainer);
    }

    public processInput(button: Button): boolean {
        if (!this.replacementContainer) {
            return super.processInput(button);
        }

        let success = false;

        switch (button) {
            case Button.UP:
                if (this.currentReplaceBtnIndex > -1) {
                    success = this.setReplaceBountyIndex(this.currentReplaceBtnIndex - 1);
                }
                break;

            case Button.DOWN:
                if (this.currentReplaceBtnIndex < this.bountyButtons.length) {
                    success = this.setReplaceBountyIndex(this.currentReplaceBtnIndex + 1);
                }
                break;

            case Button.SUBMIT:
            case Button.ACTION:
                if (this.currentReplaceBtnIndex >= 0) {
                    if (this.currentReplaceBtnIndex === this.bountyButtons.length - 1) {
                        this.cancelReplacement();
                        success = true;
                    } else {
                        const existingBounties = this.scene.gameData.permaModifiers.findModifiers(m =>
                            m instanceof PermaRunQuestModifier &&
                            this.scene.gameData.permaModifiers.isRivalBountyQuest(m.questUnlockData?.questId)
                            && this.hasConsoleCode(m)
                        ) as PermaRunQuestModifier[];

                        if (existingBounties[this.currentReplaceBtnIndex]) {
                            this.selectedBountyToReplace = existingBounties[this.currentReplaceBtnIndex];
                            this.handleReplacementSubmit();
                            success = true;
                        }
                    }
                }
                break;

            case Button.CANCEL:
                this.cancelReplacement();
                success = true;
        }

        return success;
    }

    protected setReplaceBountyIndex(index: number): boolean {
        if (index < -1 || index >= this.bountyButtons.length) {
            return false;
        }

        if (this.currentReplaceBtnIndex >= 0) {
            if (this.currentReplaceBtnIndex === this.bountyButtons.length - 1) {
                const cancelBg = this.cancelButton.getAt(0) as Phaser.GameObjects.Rectangle;
                cancelBg.setFillStyle(0x444444);
            } else {
                const currentButton = this.bountyButtons[this.currentReplaceBtnIndex].getAt(0) as Phaser.GameObjects.Rectangle;
                currentButton.setFillStyle(0x444444);
            }
        }

        this.currentReplaceBtnIndex = index;

        if (this.currentReplaceBtnIndex >= 0) {
            if (this.currentReplaceBtnIndex === this.bountyButtons.length - 1) {
                const cancelBg = this.cancelButton.getAt(0) as Phaser.GameObjects.Rectangle;
                cancelBg.setFillStyle(0x666666);
            } else {
                const newButton = this.bountyButtons[this.currentReplaceBtnIndex].getAt(0) as Phaser.GameObjects.Rectangle;
                newButton.setFillStyle(0x666666);
            }
        }

        return true;
    }

    protected createBountyOption(bounty: PermaRunQuestModifier, yPosition: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, yPosition);

        const bg = this.scene.add.rectangle(
            32, 
            3,
            55, 
            10,
            0x444444
        );
        bg.setInteractive();

        const text = addTextObject(
            this.scene,
            5,
            0,
            bounty.type.name,
            TextStyle.MONEY,
            { fontSize: "40px" }
        );

        container.add([bg, text]);

        bg.on('pointerup', () => {
            this.selectedBountyToReplace = bounty;
            this.handleReplacementSubmit();
        });

        return container;
    }

    protected createCancelButton(yPosition: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, yPosition);

        const bg = this.scene.add.rectangle(
            32,
            3,
            55,
            10,
            0x444444
        );
        bg.setInteractive();

        const text = addTextObject(
            this.scene,
            5,
            0,
            i18next.t("questUi:bounty.quest.replacement.cancel"),
            TextStyle.MONEY,
            { fontSize: "40px" }
        );

        container.add([bg, text]);

        bg.on('pointerup', () => this.cancelReplacement());

        return container;
    }

    protected handleReplacementSubmit(): void {
        if (this.selectedBountyToReplace) {
            this.scene.gameData.permaModifiers.removeModifier(this.selectedBountyToReplace, this.consoleCode == "", this.scene);

            this.originalSubmitAction();

            this.cleanupReplacementUI();
        }
    }

    protected cancelReplacement(): void {
        this.cleanupReplacementUI();
        this.buttonContainers?.forEach(container => container.setVisible(true));
    }

    protected cleanupReplacementUI(): void {
        if (this.replacementContainer) {
            this.replacementContainer.destroy();
            this.replacementContainer = null;
        }
        this.selectedBountyToReplace = null;
    }

    protected assignBountyTarget(): void {
        const trainerType = this.getBaseTrainerInfo();
        if (trainerType) {
            this.bountyTarget = TrainerType[trainerType];
            this.trainerType = trainerType;
        } else {
            this.bountyTarget = "";
        }
    }

    clear(): void {
        if (this.trainerSprite) {
            this.trainerSprite.destroy();
            this.trainerSprite = null;
        }
        if (this.trainerTintSprite) {
            this.trainerTintSprite.destroy();
            this.trainerTintSprite = null;
        }
        this.cleanupReplacementUI();
        super.clear();
    }
}