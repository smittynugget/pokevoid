import {ModalConfig, ModalUiHandler} from "./modal-ui-handler";
import { Mode } from "./ui";
import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
import { PermaRunQuestModifier } from "../modifier/modifier";
import i18next from "i18next";
import {Button} from "#enums/buttons";
import {Species} from "#enums/species";
import {RunDuration} from "#enums/quest-type-conditions";
import {QuestUnlockables} from "#app/system/game-data";

export default abstract class BountyUiHandler extends ModalUiHandler {
    protected consoleCode: string;
    protected bountyTarget: string
    protected textureLoaded: boolean = false;
    protected uiContainer: Phaser.GameObjects.Container;
    protected submitAction: Function | null = null;
    protected cancelAction: Function | null = null;
    protected currentStageView: number;
    protected stageNavigationContainer: Phaser.GameObjects.Container;
    protected statusText: Phaser.GameObjects.Text;
    protected taskContainer: Phaser.GameObjects.Container;
    protected rewardsContainer: Phaser.GameObjects.Container;
    protected questModifier: PermaRunQuestModifier;
    protected viewOnly: boolean = false;
    protected customButtonLabel: string | null = null;

    protected buttonIndex: number = 1;


    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
        this.currentStageView = 1;

    }

    protected abstract getTaskText(): string;
    protected abstract loadTexture(): Promise<void>;
    protected abstract setupSprite(): void;
    protected abstract setupSpecificUI(config: any): void;

    getModalTitle(): string {
        return i18next.t("questUi:bounty.modalTitle");
    }

    getWidth(): number {
        return 240;
    }

    getHeight(): number {
        return 135;
    }

    getMargin(): [number, number, number, number] {
        return [0, 0, 16, 0];
    }

    protected getSwapButtonLabel(): string {
        return i18next.t("questUi:bounty.buttons.swap");
    }

    protected getActivateButtonLabel(): string {
        return i18next.t("questUi:bounty.buttons.activate");
    }

    getButtonLabels(): string[] {

        if (this.customButtonLabel) {
            return [this.customButtonLabel];
        }
        

        if (this.viewOnly || !this.canModifyBounty() || this.isLocked()) {
            return [i18next.t("questUi:bounty.buttons.back")];
        } else if (this.hasActiveBountyOfSameType()) {
            return [this.getSwapButtonLabel(), i18next.t("questUi:bounty.buttons.cancel")];
        } else {
            return [this.getActivateButtonLabel(), i18next.t("questUi:bounty.buttons.cancel")];
        }
    }

    protected abstract formatBountyTarget(target: string): string;

    protected getQuestName(): string {
        return this.questModifier.type.name;
        if (!this.questModifier?.questUnlockData?.questId) {
            return "";
        }

        const questId = QuestUnlockables[this.questModifier.questUnlockData.questId] as string;
        if (!questId) {
            console.warn('[BountyUiHandler] Invalid quest ID:', this.questModifier.questUnlockData.questId);
            return "";
        }

        return questId.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    protected getQuestStatus(): { status: string, stage?: number } {
        if (this.scene.currentBattle) {
            const activeModifier = this.scene.gameData.permaModifiers.findModifiers(m =>
                m instanceof PermaRunQuestModifier &&
                m.consoleCode === this.consoleCode
            )[0] as PermaRunQuestModifier;

            if (activeModifier) {
                return {
                    status: i18next.t("questUi:bounty.common.status.active"),
                    stage: activeModifier.currentStageIndex
                };
            }
        }

        const permaModifier = this.scene.gameData.permaModifiers.findModifiers(m =>
            m instanceof PermaRunQuestModifier &&
            m.consoleCode === this.consoleCode
        );

        return {
            status: permaModifier 
                ? i18next.t("questUi:bounty.common.status.active")
                : i18next.t("questUi:bounty.common.status.inactive")
        };
    }

    protected getRewardChances(): string {
        return i18next.t("questUi:bounty.common.baseReward");
    }

    protected initializeButtonHighlight(): void {
        if (this.buttonContainers?.length > 0) {
            this.setButtonIndex(0);
        }
    }

    protected setButtonIndex(index: number): boolean {
        if (!this.buttonContainers || index < 0 || index >= this.buttonContainers.length) {
            return false;
        }

        if (this.buttonIndex >= 0 && this.buttonIndex < this.buttonContainers.length) {
            const currentBg = this.buttonBgs[this.buttonIndex];
            if (currentBg) {
                currentBg.setTint(0x666666);
            }
        }

        this.buttonIndex = index;

        if (this.buttonIndex >= 0) {
            const newBg = this.buttonBgs[this.buttonIndex];
            if (newBg) {
                newBg.setTint(0xFFFF00);
            }
        }

        return true;
    }

    protected abstract assignBountyTarget(): void;

    show(args: any[]): boolean {
        if (this.active || !args.length) {
            return false;
        }

        const config = args[0];
        this.consoleCode = args[1];

        this.questModifier = args[2] as PermaRunQuestModifier;
        this.viewOnly = args[3] ?? false;
        this.customButtonLabel = args[4] ?? null;

        this.assignBountyTarget();

        if (super.show(args)) {

            if (!this.questModifier) {
                console.error('[QuestBountyUI] No quest modifier provided');
                return false;
            }

            this.uiContainer = this.scene.add.container(0, 0);
            this.modalContainer.add(this.uiContainer);
            this.uiContainer.setAlpha(0);

            this.loadTexture()
                .then(() => {
                    try {
                        this.setupSprite();
                        this.setupUI(config);
                        this.fadeInUI();
                    } catch (error) {
                        console.error('[BountyUI] Error setting up UI:', error);
                        this.handleUIError();
                    }
                })
                .catch(error => {
                    console.error('[BountyUI] Error loading texture:', error);
                    this.handleUIError();
                });

            this.initializeButtonHighlight();
            return true;
        }
        return false;
    }

    private updateStageNavigation(): void {

        this.stageNavigationContainer.removeAll(true);

        const maxStage = this.getMaxStages();

        const leftX = 10;
        const rightX = this.getWidth() - 10;
        const centerY = this.getHeight() / 2;

        if (this.currentStageView > 1) {
            const backArrow = this.scene.add.sprite(leftX, centerY, 'cursor_reverse');
            backArrow.setScale(0.75);
        backArrow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 6, 10), Phaser.Geom.Rectangle.Contains);

        backArrow.on('pointerup', () => {
            if (this.currentStageView > 1) {
                this.navigateStage(-1);
                this.scene.ui.playSelect();
            }
        });

            if (backArrow.anims.exists('cursor_reverse')) {
                backArrow.play('cursor_reverse');
            }

            this.stageNavigationContainer.add(backArrow);
        }

        if (this.currentStageView < maxStage) {
            const forwardArrow = this.scene.add.sprite(rightX, centerY, 'cursor');
            forwardArrow.setScale(0.75);
        forwardArrow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 6, 10), Phaser.Geom.Rectangle.Contains);

        forwardArrow.on('pointerup', () => {
            if (this.currentStageView < maxStage) {
                this.navigateStage(1);
                this.scene.ui.playSelect();
            }
        });

            if (forwardArrow.anims.exists('cursor')) {
                forwardArrow.play('cursor');
            }

            this.stageNavigationContainer.add(forwardArrow);
        }
        this.stageNavigationContainer.setVisible(maxStage > 1);
    }

    processInput(button: Button): boolean {
        const ui = this.getUi();
        let success = false;

        if (button === Button.SUBMIT || button === Button.ACTION) {
            if (this.buttonContainers && this.buttonIndex >= 0) {
                if (this.buttonIndex === 0) {
                    if (!this.canModifyBounty()) {
                        this.cancelAction();
                    } else if (this.submitAction) {
                        this.submitAction();
                    }
                } else if (this.buttonIndex === 1) {
                    this.cancelAction();
                }
                success = true;
            }
        } else {
            const maxStage = this.getMaxStages();
        const isSingleButton = this.buttonContainers?.length === 1 || !this.buttonContainers[1].visible;

            switch (button) {
                case Button.LEFT:
                if (isSingleButton) {

                    if (this.currentStageView > 1) {
                        this.navigateStage(-1);
                        success = true;
                    }
                } else {

                if (this.buttonIndex === 0 && this.currentStageView > 1) {
                        this.navigateStage(-1);
                        success = true;
                        }
                else if (this.buttonIndex > 0) {
                        success = this.setButtonIndex(this.buttonIndex - 1);
                    }
                }
                    break;

                case Button.RIGHT:
                if (isSingleButton) {

                    if (this.currentStageView < maxStage) {
                        this.navigateStage(1);
                        success = true;
                    }
                } else {

                if (this.buttonIndex === (this.buttonContainers?.length - 1) && this.currentStageView < maxStage) {
                        this.navigateStage(1);
                        success = true;
                }
                else if (this.buttonIndex < (this.buttonContainers?.length - 1)) {
                        success = this.setButtonIndex(this.buttonIndex + 1);
                    }
                }
                    break;

                case Button.CANCEL:
                    this.cancelAction();
                    success = true;
                    break;
            }
        }

        if (success) {
            ui.playSelect();
        }

        return success;
    }

    protected canModifyBounty(): boolean {
        return true;
        const inBattle = !!this.scene.currentBattle;
        return !inBattle || this.mode === Mode.QUEST_BOUNTY;
    }

    protected isLocked(): boolean {
        return false;
    }

    protected avoidDuplicateConsoleBounty(modifier: PermaRunQuestModifier): boolean {
        return modifier.consoleCode !== this.consoleCode
    }

    protected hasActiveBountyOfSameType(): boolean {
        const existingBounties = this.scene.gameData.permaModifiers.findModifiers(m =>
            m instanceof PermaRunQuestModifier &&
            this.avoidDuplicateConsoleBounty(m) &&
            this.isSameBountyType(m)
        );

        if (this.mode === Mode.QUEST_BOUNTY) {
            return existingBounties.length >= 5;
        }
        else if (this.mode === Mode.QUEST_ACTIVE) {
            return existingBounties.length >= 5;
        }

        return existingBounties.length >= 3;
    }

    protected isSameBountyType(modifier: PermaRunQuestModifier): boolean {
        const permaModifiers = this.scene.gameData.permaModifiers;

        switch (this.mode) {
            case Mode.QUEST_BOUNTY:
                return permaModifiers.isQuestBountyQuest(modifier.questUnlockData?.questId) &&
                    !!modifier.consoleCode;
            case Mode.QUEST_ACTIVE:
                return permaModifiers.isQuestBountyQuest(modifier.questUnlockData?.questId) &&
                    !modifier.consoleCode;
            case Mode.SMITTY_POKEMON_BOUNTY:
                return permaModifiers.isSmittyBountyQuest(modifier.questUnlockData?.questId);
            case Mode.RIVAL_BOUNTY:
                return permaModifiers.isRivalBountyQuest(modifier.questUnlockData?.questId);
            default:
                return false;
        }
    }

    private setupStatusAndNavigation(): void {
        const questStatus = this.getQuestStatus();
        const maxStage = this.getMaxStages();
        this.currentStageView = questStatus.stage || 1;

        if (maxStage > 1) {
            this.stageNavigationContainer = this.scene.add.container(0, 0);
            this.uiContainer.add(this.stageNavigationContainer);
            this.updateStageNavigation();
        }
    }

    protected getMaxStages(): number {
        return 1;
    }

    private navigateStage(direction: number): void {
        const newStage = this.currentStageView + direction;
        if (newStage >= 1 && newStage <= this.getMaxStages()) {
            this.currentStageView = newStage;
            this.updateStageView();
        this.scene.ui.playSelect();
        }
    }

    protected updateStageView(): void {
        this.updateStageNavigation();
        this.updateTaskAndRewards();
    }

    protected getStageStatusText(stage: number, questStatus: { status: string, stage?: number }): string {
        if (questStatus.stage && stage < questStatus.stage) {
            return i18next.t("questUi:bounty.status.complete");
        }
        if (questStatus.stage && stage === questStatus.stage) {
            return i18next.t("questUi:bounty.status.activeStage", { stage });
        }
        if (questStatus.status === "ACTIVE") {
            return i18next.t("questUi:bounty.status.active");
        }
        return questStatus.status;
    }

    protected setupUI(config: any): void {
        const targetText = addTextObject(
            this.scene,
            35,
            87,
            this.getQuestName(),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        this.uiContainer.add(targetText);

        this.setupStatusAndNavigation();
        this.setupRewardsSection();
        this.setupTaskSection();
        this.setupSpecificUI(config);

        this.submitAction = config.buttonActions[0];
        this.cancelAction = config.buttonActions.length > 1 ? config.buttonActions[1]: config.buttonActions[0];

        this.updateButtonLabels();
    }

    private setupTaskSection(): void {
        if (!this.rewardsContainer) {
            console.error('Rewards container must be initialized before task section');
            return;
        }

        this.taskContainer = this.scene.add.container(120, 30);
        this.uiContainer.add(this.taskContainer);

        this.taskSection();

        this.updateLayout();
    }

    private setupRewardsSection(): void {
        this.rewardsContainer = this.scene.add.container(120, 55);
        this.uiContainer.add(this.rewardsContainer);
        this.rewardSection();
    }

    protected rewardSection(): void {
        const rewardsLabel = addTextObject(
            this.scene,
            0,
            0,
            i18next.t("questUi:bounty.sections.rewards.title"),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        this.rewardsContainer.add(rewardsLabel);

        const rewardsTextXPosition = 0;
        const availableWidth = (this.getWidth() - (this.rewardsContainer.x + rewardsTextXPosition + 20)) * 6;

        const rewardsText = addTextObject(
            this.scene,
            0,
            10,
            this.isLocked() ? i18next.t("questUi:bounty.sections.rewards.unknown") : this.getRewardChances(),
            TextStyle.WINDOW,
            {
                fontSize: '40px',
                wordWrap: { width: availableWidth, useAdvancedWrap: true }
            }
        );
        this.rewardsContainer.add(rewardsText);
    }

    private taskSection(): void {
        const taskLabel = addTextObject(
            this.scene,
            0,
            0,
            this.isLocked() ? 
                i18next.t("questUi:bounty.sections.task.title") :
                (this.questModifier?.runDuration === RunDuration.SINGLE_RUN ?
                    i18next.t("questUi:bounty.sections.task.singleRun") :
                    i18next.t("questUi:bounty.sections.task.multiRun")),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        this.taskContainer.add(taskLabel);

        const taskTextXPosition = 0;
        const GLOBAL_SCALE = 6;
        const availableWidth = (this.getWidth() - (this.taskContainer.x + taskTextXPosition + 20)) * GLOBAL_SCALE;

        const taskText = addTextObject(
            this.scene,
            0,
            10,
            this.isLocked() ?
                i18next.t("questUi:bounty.sections.task.locked", { target: this.formatBountyTarget(this.bountyTarget) }) :
                this.getTaskText(),
            TextStyle.WINDOW,
            {
                fontSize: '40px',
                wordWrap: { width: availableWidth, useAdvancedWrap: true }
            }
        );
        this.taskContainer.add(taskText);
    }

    protected updateTaskAndRewards(): void {
        this.taskContainer.removeAll(true);
        this.taskSection();
        this.rewardsContainer.removeAll(true);
        this.rewardSection();
        this.updateLayout();
    }

    protected updateLayout(): void {
        if (!this.taskContainer || !this.rewardsContainer) {
            console.warn('Cannot update layout: containers not initialized');
            return;
        }

        const taskLabel = this.taskContainer.list[0] as Phaser.GameObjects.Text;
        const taskText = this.taskContainer.list[1] as Phaser.GameObjects.Text;

        if (!taskLabel || !taskText) {
            console.warn('Task text elements not found');
            return;
        }

    const taskTextHeight = taskText.height;

    const newRewardsY = 30 + (taskTextHeight / 6) + 15;

    this.rewardsContainer.setY(newRewardsY);
    }

    protected updateButtonLabels(): void {

        if (!this.buttonContainers || !this.buttonBgs) return;


        let labels = this.getButtonLabels();
        let showSecondButton = labels.length > 1;


        this.buttonContainers.forEach((container, index) => {

            if (!container) return;

            const buttonLabel = container.list[1] as Phaser.GameObjects.Text;
            const buttonBg = this.buttonBgs[index];

            if (index === 0) {

                container.setVisible(true);
                buttonBg.setVisible(true);
                buttonLabel.setText(labels[0]);
            } else if (index === 1) {

                const visible = showSecondButton && labels[1];
                container.setVisible(visible);
                buttonBg.setVisible(visible);
                if (visible) {
                    buttonLabel.setText(labels[1]);
                }
            }
        });

        const width = this.getWidth();
        this.buttonContainers.forEach((container, index) => {
            if (container.visible) {
                const sliceWidth = width / (showSecondButton ? 3 : 2);
                container.setPosition(
                    sliceWidth * (index + 1),
                    this.modalBg.height - (this.buttonBgs[index].height + 8)
                );
            }
        });
    }

    protected fadeInUI(): void {
        this.scene.tweens.add({
            targets: this.uiContainer,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    protected handleUIError(): void {
        this.uiContainer.removeAll(true);
        const errorText = addTextObject(
            this.scene,
            this.getWidth() / 2,
            this.getHeight() / 2,
            i18next.t("questUi:bounty.error"),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        errorText.setOrigin(0.5, 0.5);
        this.uiContainer.add(errorText);
        this.uiContainer.setAlpha(1);
    }

    protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {

        if(this.isLocked()) {
            config.buttonActions[0] = () => {
                this.cancelAction();
            };
        }

        return config;
    }

    clear(): void {
        if (this.uiContainer) {
            this.uiContainer.destroy();
            this.uiContainer = null;
        }
        this.submitAction = null;
        this.textureLoaded = false;
        super.clear();
    }
}