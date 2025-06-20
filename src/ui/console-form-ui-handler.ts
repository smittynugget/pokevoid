import {FormModalConfig, FormModalUiHandler} from "./form-modal-ui-handler";
import {ModalConfig} from "./modal-ui-handler";
import {Mode} from "./ui";
import {addTextInputObject, addTextObject, TextStyle} from "./text";
import i18next from "i18next";
import {smittyFormQuestModifiers, rivalQuestModifiers, QUEST_CONSOLE_CODES} from "../modifier/modifier-type";
import BattleScene from "#app/battle-scene";
import {addWindow} from "./ui-theme";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import Pokemon from "#app/field/pokemon";
import {PermaRunQuestModifier, PersistentModifier} from "#app/modifier/modifier";
import * as Utils from "../utils";
import {Button} from "#enums/buttons";
import {QuestState, QuestUnlockables} from "#app/system/game-data";

const DEBUG_UI = false;

function logGameObject(obj: any, depth: number = 0): any {
    if (!obj) return null;
    const indent = '  '.repeat(depth);
    const base = {
        name: obj.name || '(unnamed)',
        type: obj.type,
        visible: obj.visible,
        depth: obj.depth,
        position: { x: obj.x, y: obj.y },
        alpha: obj.alpha,
    };

    if (obj.list) {
        return {
            ...base,
            children: obj.list.map((child: any) => logGameObject(child, depth + 1))
        };
    }

    if (obj.text !== undefined) {
        return {
            ...base,
            text: obj.text
        };
    }

    return base;
}

export default class ConsoleFormUiHandler extends FormModalUiHandler {
    private formContainer: Phaser.GameObjects.Container;
    private bountyListContainer: Phaser.GameObjects.Container;
    private modalBackground: Phaser.GameObjects.Rectangle;
    protected cancelAction: Function | null;
    private currentBountyIndex: number = 0;
    private bountyButtonContainers: Phaser.GameObjects.Container[] = [];
    private activeBountyCount: number = 0;

    private questListContainer: Phaser.GameObjects.Container;
    private currentQuestIndex: number = 0;
    private questButtonContainers: Phaser.GameObjects.Container[] = [];
    private activeQuestCount: number = 0;
    private activeContainer: 'input' | 'bounty' | 'quest' | 'console' = 'input';
    private currentConsoleButtonIndex: number = -1;

    private activeBounties: {
        rival: PermaRunQuestModifier[];
        smitty: PermaRunQuestModifier[];
        quest: PermaRunQuestModifier[];
    };

    private toggleContainer: Phaser.GameObjects.Container;

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
    }

    getModalTitle(): string {
        return "";
    }

    getFields(): string[] {
        return [""];
    }

    getWidth(): number {
        return 100;
    }

    getHeight(): number {
        return 55;
    }

    getMargin(): [number, number, number, number] {
        return [0, 70, 48, 0];
    }

    getButtonLabels(): string[] {
        return [i18next.t("questUi:console.submit"), i18next.t("questUi:console.cancel")];
    }

    getReadableErrorMessage(error: string): string {
        switch (error) {
            case "invalid_code":
                return i18next.t("questUi:console.invalidConsoleCode");
            case "code_already_used":
                return i18next.t("questUi:console.consoleCodeAlreadyUsed");
            default:
                return super.getReadableErrorMessage(error);
        }
    }

    protected getInputConfig(field: string): InputText.IConfig {
        return {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: 'white',
            backgroundColor: 'transparent',
            width: this.getWidth() - 20,
            align: 'left',
            type: 'text',
            maxLength: 6
        };
    }

    protected getInputPosition(): { x: number, y: number } {
        const inputWidth = this.getWidth() - 20;
        return {
            x: (this.getWidth() - inputWidth) / 2,
            y: (this.getHeight() / 2) + 8
        };
    }

    setup(): void {
        if (DEBUG_UI) {
            console.log("Setting up ConsoleFormUiHandler");
            console.log("Active UI Elements:", {
                scene: {
                    children: this.scene.children.list
                        .filter(child => child.visible)
                        .map(child => logGameObject(child))
                },
                ui: logGameObject(this.getUi())
            });
        }

        super.setup();

        if (DEBUG_UI) {
            console.log("Modal Container Hierarchy:", logGameObject(this.modalContainer));
            console.log("Form Elements:", {
                inputs: this.inputs.map(input => ({
                    exists: !!input,
                    visible: input?.visible,
                    text: input?.text,
                    position: input ? { x: input.x, y: input.y } : null,
                    focused: input?.isOpened
                })),
                buttons: this.buttonBgs.map((bg, index) => ({
                    exists: !!bg,
                    visible: bg?.visible,
                    position: bg ? { x: bg.x, y: bg.y } : null,
                    tint: bg?.tintTopLeft,
                    text: this.buttonContainers[index]?.list?.[1]?.text
                }))
            });
        }

        this.bountyButtonContainers = [];
        this.activeBountyCount = 0;
        this.currentBountyIndex = 0;

        if (this.inputs[0]) {
            this.inputs[0].on('click', () => {
                this.activeContainer = 'input';
                this.deselectCurrentContainer();
                this.inputs[0].setFocus();
            });
            
            this.inputs[0].on('textchange', (inputElement: any) => {
                if (inputElement.text) {
                    inputElement.setText(inputElement.text.toUpperCase());
                    if (inputElement.text.length === 6) {
                        this.activeContainer = 'console';
                        this.currentConsoleButtonIndex = 0;
                        this.selectCurrentContainer();
                    }
                }
            });
        }
        
        this.modalContainer.setPosition(
            (this.scene.game.canvas.width / 3),
            this.scene.game.canvas.height / 2
        );
        this.modalContainer.setDepth(9999);

        this.modalBackground = new Phaser.GameObjects.Rectangle(
            this.scene,
            0,
            0,
            this.scene.game.canvas.width,
            this.scene.game.canvas.height,
            0x000000,
            0.8
        );
        this.modalBackground.setDepth(9998);
        this.modalBackground.setVisible(false);
        this.modalContainer.addAt(this.modalBackground, 0);
        
        this.bountyListContainer = new Phaser.GameObjects.Container(
            this.scene,
            this.getWidth() + 10,
            0
        );

        this.bountyListContainer.setInteractive(new Phaser.Geom.Rectangle(
            this.getWidth() + 10, 0,
            60,
            100
        ), Phaser.Geom.Rectangle.Contains);

        this.bountyListContainer.setDepth(9999);
        this.modalContainer.add(this.bountyListContainer);
        this.bountyListContainer.setVisible(false);

        this.updateActiveBounties();

        this.questListContainer = new Phaser.GameObjects.Container(
            this.scene,
            this.getWidth() + 60 + 17,
            0
        );

        this.questListContainer.setInteractive(new Phaser.Geom.Rectangle(
            this.getWidth() + 60 + 17, 0,
            60,
            100
        ), Phaser.Geom.Rectangle.Contains);

        this.questListContainer.setDepth(9999);
        this.modalContainer.add(this.questListContainer);
        this.questListContainer.setVisible(false);

        this.updateActiveQuests();

        if (this.inputs[0]) {
            this.inputs[0].on('textchange', function (inputElement: any) {
                if (inputElement.text) {
                    inputElement.setText(inputElement.text.toUpperCase());
                }
            });
        }

        this.toggleContainer = this.scene.add.container(5, this.getHeight() + 3);
        this.toggleContainer.setVisible(false);
        this.modalContainer.add(this.toggleContainer);
    }

    show(args: any[]): boolean {
        if (DEBUG_UI) {
            console.log("Showing ConsoleFormUiHandler");
            console.log("UI Hierarchy:", {
                modalContainer: logGameObject(this.modalContainer),
                bountyList: logGameObject(this.bountyListContainer),
                questList: logGameObject(this.questListContainer),
                background: logGameObject(this.modalBackground)
            });
        }

        if (this.active) {
            return false;
        }

        if (super.show(args)) {
            if (DEBUG_UI) {
                console.log("Post-show UI State:", {
                    activeElements: this.scene.children.list
                        .filter(child => child.visible)
                        .map(child => ({
                            name: child.name,
                            type: child.type,
                            depth: child.depth,
                            position: { x: child.x, y: child.y }
                        })),
                    modalDepth: this.modalContainer?.depth,
                    uiDepth: this.getUi().depth,
                    modalHierarchy: logGameObject(this.modalContainer)
                });
            }

            this.activeContainer = 'input';
            this.currentBountyIndex = -1;
            this.currentQuestIndex = -1;
            this.currentConsoleButtonIndex = -1;

            const config = args[0] as ModalConfig;

            this.cancelAction = config.buttonActions.length > 1
                ? config.buttonActions[1]
                : null;

            this.modalBackground.setVisible(true);

            this.scene.tweens.add({
                targets: this.modalBackground,
                alpha: { from: 0, to: 0.8 },
                duration: 250,
                ease: 'Power2',
                onComplete: () => {
                    if (this.inputs[0]) {
                        this.inputs[0].setFocus();
                    }
                }
            });

            if (this.inputs[0]) {
                this.inputs[0].setFocus();
                this.inputs[0].setText(this.scene.gameData.dailyBountyCode || "");
            }

            this.submitAction = async () => {
                const consoleCode = this.inputs[0]?.text || '';

                if (!consoleCode || consoleCode.length !== 6) {
                    this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, Object.assign(config, {
                        errorMessage: "invalid_code"
                    }));
                    this.scene.ui.playError();
                    return;
                }

                const questModifierGenerator = smittyFormQuestModifiers[consoleCode] ||
                    rivalQuestModifiers[consoleCode] ||
                    QUEST_CONSOLE_CODES[consoleCode]?.();

                if (!questModifierGenerator) {
                    this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, Object.assign(config, {
                        errorMessage: "invalid_code"
                    }));
                    this.scene.ui.playError();
                    return;
                }

                const existingBounty = this.scene.gameData.permaModifiers.findModifier(m =>
                    m instanceof PermaRunQuestModifier &&
                    m.consoleCode === consoleCode
                ) as PermaRunQuestModifier;

                if (existingBounty) {
                    this.showBountyUI(existingBounty);
                }
                else {
                    try {
                        const party = this.scene.getParty() as Pokemon[];
                        const modifierType = questModifierGenerator.generateType(party);
                        
                        const questModifier = modifierType.newModifier();

                        if (!questModifier) {
                            throw new Error("Failed to create quest modifier");
                        }
                        
                        let bountyMode = Mode.SMITTY_POKEMON_BOUNTY;
                        if (QUEST_CONSOLE_CODES[consoleCode]) {
                            bountyMode = Mode.QUEST_BOUNTY;
                            (questModifier as PermaRunQuestModifier).consoleCode = consoleCode;
                        } else if (rivalQuestModifiers[consoleCode]) {
                            bountyMode = Mode.RIVAL_BOUNTY;
                        }
                        
                        this.scene.ui.setOverlayMode(bountyMode, {
                            buttonActions: [
                                async () => {
                                    try {
                                        await this.scene.gameData.permaModifiers.addModifier(this.scene, questModifier as PersistentModifier);
                                        this.scene.trackPermaModifierObtained(questModifier);
                                        this.scene.ui.revertMode();
                                        this.scene.ui.revertMode();
                                        this.scene.playSound("item_fanfare");
                                        this.scene.gameData.localSaveAll(this.scene);
                                        this.inputs[0].setVisible(true);

                                    } catch (error) {
                                        console.error("Error adding quest modifier:", error);
                                        this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, Object.assign(config, {
                                            errorMessage: "invalid_code"
                                        }));
                                        this.scene.ui.playError();
                                    }
                                },
                                () => {
                                    this.scene.ui.revertMode();
                                    if (this.inputs[0]) {
                                        this.inputs[0].setVisible(true);
                                    }
                                }
                            ]
                        }, consoleCode, questModifier);

                        if (this.inputs[0]) {
                            this.inputs[0].setVisible(false);
                        }

                    } catch (error) {
                        console.error("Error creating quest modifier:", error);
                        this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, Object.assign(config, {
                            errorMessage: "invalid_code"
                        }));
                        this.scene.ui.playError();
                    }
                }
            };
            
            this.updateActiveBounties();
            this.updateActiveQuests();

            const ui = this.getUi();
            ui.moveTo(this.modalContainer, ui.length - 1);

            if (this.inputs[0]) {
                this.inputs[0].setFocus();
            }

            this.bountyListContainer.setVisible(true);
            this.questListContainer.setVisible(true);

            const isNuzlightQuestCompleted = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
            
            if (isNuzlightQuestCompleted) { 
                
                this.toggleContainer.removeAll(true);
                const icon = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CONSOLE");
                const type = this.scene.inputController?.getLastSourceType() || "keyboard";
                const keySprite = this.scene.add.sprite(3, 3, type);
                if (icon) {
                    keySprite.setFrame(icon);
                }
                keySprite.setScale(.6);
                const toggleText = addTextObject(
                    this.scene, 
                    keySprite.x + (keySprite.displayWidth * keySprite.scaleX + .5),
                    0, 
                    i18next.t("questUi:console.toggleInfo"), 
                    TextStyle.PARTY, 
                    {fontSize: "25px"}
                );
                toggleText.setOrigin(0, 0);
                this.toggleContainer.add([keySprite, toggleText]);
                this.toggleContainer.setVisible(true);
                this.toggleContainer.setAlpha(0);

                this.scene.tweens.add({
                    targets: [this.toggleContainer],
                    alpha: 1,
                    duration: 250
                });
            }
            return true;
        }

        return false;
    }

    clear(): void {
        if (DEBUG_UI) {
            console.log("Pre-clear UI State:", {
                activeElements: this.scene.children.list
                    .filter(child => child.visible)
                    .map(child => ({
                        name: child.name,
                        type: child.type,
                        depth: child.depth
                    })),
                modalHierarchy: logGameObject(this.modalContainer),
                bountyList: logGameObject(this.bountyListContainer),
                questList: logGameObject(this.questListContainer)
            });
        }
        
        this.deselectCurrentContainer();
        this.currentBountyIndex = -1;
        this.currentQuestIndex = -1;
        this.currentConsoleButtonIndex = -1;
        this.activeContainer = 'input';

        this.bountyButtonContainers.forEach(container => {
            const button = container.getAt(0) as Phaser.GameObjects.Rectangle;
            button?.setFillStyle(0x444444);
        });

        this.questButtonContainers.forEach(container => {
            const button = container.getAt(0) as Phaser.GameObjects.Rectangle;
            button?.setFillStyle(0x444444);
        });

        super.clear();

        if (this.bountyListContainer) {
            this.bountyListContainer.setVisible(false);
            this.bountyListContainer.removeAll(true);
        }

        if (this.modalBackground) {
            this.modalBackground.setVisible(false);
            this.modalBackground.setAlpha(0.8); 
        }
    
        this.bountyButtonContainers = [];
        this.activeBountyCount = 0;

        if (this.toggleContainer?.visible) {
            this.scene.tweens.add({
                targets: this.toggleContainer,
                alpha: 0,
                duration: 250,
                ease: "Cubic.easeIn",
                onComplete: () => {
                    this.toggleContainer.setVisible(false);
                }
            });
        }

        if (DEBUG_UI) {
            console.log("Post-clear UI State:", {
                activeElements: this.scene.children.list
                    .filter(child => child.visible)
                    .map(child => ({
                        name: child.name,
                        type: child.type,
                        depth: child.depth
                    })),
                modalHierarchy: logGameObject(this.modalContainer)
            });
        }
    }

    private updateActiveBounties(): void {
        if (DEBUG_UI) {
            console.log("Updating Bounties - UI State:", {
                modalHierarchy: logGameObject(this.modalContainer),
                bountyList: logGameObject(this.bountyListContainer),
                activeModifiers: this.scene.gameData.permaModifiers.getModifiers()
                    .map(m => ({
                        type: m.type.name,
                        isQuest: m instanceof PermaRunQuestModifier
                    }))
            });
        }

        const permaModifiers = this.scene.gameData.permaModifiers;

        this.activeBounties = {
            rival: permaModifiers.findModifiers(m =>
                m instanceof PermaRunQuestModifier &&
                permaModifiers.isRivalBountyQuest(m.questUnlockData?.questId)
            ) as PermaRunQuestModifier[],

            smitty: permaModifiers.findModifiers(m =>
                m instanceof PermaRunQuestModifier &&
                permaModifiers.isSmittyBountyQuest(m.questUnlockData?.questId)
            ) as PermaRunQuestModifier[],

            quest: permaModifiers.findModifiers(m =>
                m instanceof PermaRunQuestModifier &&
                permaModifiers.isQuestBountyQuest(m.questUnlockData?.questId)
                && m.consoleCode
            ) as PermaRunQuestModifier[]
        };

        this.renderBountyList();
    }

    private renderBountyList(): void {
        if (DEBUG_UI) {
            console.log("Pre-render Bounty List:", {
                modalState: logGameObject(this.modalContainer),
                bountyListState: logGameObject(this.bountyListContainer),
                activeBounties: {
                    rival: this.activeBounties?.rival?.length || 0,
                    smitty: this.activeBounties?.smitty?.length || 0,
                    quest: this.activeBounties?.quest?.length || 0
                }
            });
        }

        this.bountyListContainer.removeAll(true)
        
        const title = addTextObject(
            this.scene,
            3,
            5,
            i18next.t("questUi:console.activeBounties"),
            TextStyle.WINDOW,
            { fontSize: "50px" }
        );
        this.bountyListContainer.add(title);

        let yOffset = 15;
        
        yOffset = this.renderBountySection(
            i18next.t("questUi:console.rivalBounties"),
            this.activeBounties.rival,
            3,
            yOffset
        );
        
        yOffset = this.renderBountySection(
            i18next.t("questUi:console.smittyBounties"),
            this.activeBounties.smitty,
            3,
            yOffset
        );

        this.renderBountySection(
            i18next.t("questUi:console.questBounties"),
            this.activeBounties.quest,
            5,
            yOffset
        );

        const totalBounties = this.activeBounties.rival.length +
            this.activeBounties.smitty.length +
            this.activeBounties.quest.length;
        const calculatedHeight = Math.min(100, 40 + (totalBounties * 10) + 10);
        
        const bountyListBg = addWindow(
            this.scene,
            -5,
            0,
            65,
            calculatedHeight
        );
        this.bountyListContainer.addAt(bountyListBg, 0);

    }

    private renderBountySection(
        title: string,
        bounties: PermaRunQuestModifier[],
        maxCount: number,
        startY: number
    ): number {
        
        const sectionTitle = addTextObject(
            this.scene,
            3,
            startY,
            i18next.t("questUi:console.bountiesCount", {
                title: title,
                current: bounties.length,
                max: maxCount
            }),
            TextStyle.WINDOW,
            { fontSize: "40px" }
        );
        this.bountyListContainer.add(sectionTitle);

        let currentY = startY + 10;

        
        bounties.forEach((bounty, index) => {
            const button = this.createBountyButton(
                bounty,
                0,
                currentY
            );
            this.bountyListContainer.add(button);
            currentY += 10;
            this.activeBountyCount++;
        });

        return currentY;

    }

    private createBountyButton(
        bounty: PermaRunQuestModifier,
        x: number,
        y: number
    ): Phaser.GameObjects.Container {
        const container = new Phaser.GameObjects.Container(this.scene, x, y);

        
        const bg = new Phaser.GameObjects.Rectangle(
            this.scene,
            25,
            3,
            55,
            10,
            0x444444
        );
        bg.setInteractive();

        
        const text = addTextObject(
            this.scene,
            3,
            0,
            bounty.type.name,
            TextStyle.MONEY,
            { fontSize: "40px" }
        );

        container.add([bg, text]);

        
        this.bountyButtonContainers.push(container);

        
        bg.on('pointerup', () => this.showBountyUI(bounty));

        return container;
    }

    private showBountyUI(bounty: PermaRunQuestModifier): void {
        if (DEBUG_UI) {
            console.log("Showing bounty UI for:", bounty.type.name);
            console.log("UI state:", {
                modalActive: this.active,
                input: {
                    exists: !!this.inputs[0],
                    visible: this.inputs[0]?.visible,
                    text: this.inputs[0]?.text
                },
                bountyList: {
                    visible: this.bountyListContainer?.visible,
                    children: this.bountyListContainer?.list?.length || 0
                }
            });
        }

        
        let bountyMode: Mode;

        if (this.scene.gameData.permaModifiers.isQuestBountyQuest(bounty.questUnlockData?.questId)) {
            bountyMode = Mode.QUEST_BOUNTY;
        } else if (this.scene.gameData.permaModifiers.isRivalBountyQuest(bounty.questUnlockData?.questId)) {
            bountyMode = Mode.RIVAL_BOUNTY;
        } else {
            bountyMode = Mode.SMITTY_POKEMON_BOUNTY;
        }

        
        this.scene.ui.setOverlayMode(bountyMode, {
            buttonActions: [
                () => {
                    this.scene.ui.revertMode();
                    if (this.inputs[0]) {
                        this.inputs[0].setVisible(true);
                    }
                }
            ]
        }, bounty.consoleCode, bounty, true);

        if (this.inputs[0]) {
            this.inputs[0].setVisible(false);
        }
    }

    public processInput(button: Button): boolean {
        if (DEBUG_UI) {
            console.log("Processing Input:", {
                button: Button[button],
                activeElements: this.scene.children.list
                    .filter(child => child.visible)
                    .map(child => ({
                        name: child.name,
                        type: child.type,
                        depth: child.depth
                    })),
                modalState: {
                    activeContainer: this.activeContainer,
                    indices: {
                        bounty: this.currentBountyIndex,
                        quest: this.currentQuestIndex,
                        console: this.currentConsoleButtonIndex
                    },
                    hierarchy: logGameObject(this.modalContainer)
                }
            });
        }

        
        if (!this.bountyListContainer?.visible && !this.questListContainer?.visible) {
            return super.processInput(button);
        }

        let handled = false;

        
        const hasBounties = this.bountyButtonContainers?.length > 0;
        const hasQuests = this.questButtonContainers?.length > 0;

        switch (button) {
            case Button.LEFT:
                switch (this.activeContainer) {
                    case 'quest':
                        if (hasBounties) {
                            this.activeContainer = 'bounty';
                            this.deselectCurrentContainer();
                            if (this.currentBountyIndex < 0) this.currentBountyIndex = 0;
                            this.selectCurrentContainer();
                            handled = true;
                        } else {
                            this.activeContainer = 'input';
                            this.deselectCurrentContainer();
                            if (this.inputs[0]) {
                                this.inputs[0].setFocus();
                            }
                            handled = true;
                        }
                        break;
                    case 'bounty':
                        this.activeContainer = 'input';
                        this.deselectCurrentContainer();
                        if (this.inputs[0]) {
                            this.inputs[0].setFocus();
                        }
                        handled = true;
                        break;
                    case 'console':
                        if (this.currentConsoleButtonIndex === 0) {
                            this.activeContainer = 'input';
                            this.deselectCurrentContainer();
                            if (this.inputs[0]) {
                                this.inputs[0].setFocus();
                            }
                            handled = true;
                        } else {
                            this.unhighlightConsoleButton(this.currentConsoleButtonIndex);
                            this.currentConsoleButtonIndex = 0;
                            this.highlightConsoleButton(this.currentConsoleButtonIndex);
                            handled = true;
                        }
                        break;
                }
                break;

            case Button.RIGHT:
                switch (this.activeContainer) {
                    case 'input':
                        
                        
                        
                        const isEmptyInput = this.inputs[0]?.text?.length === 0;
                        const isCompleteInput = this.inputs[0]?.text?.length === 6;
                        
                        if (isEmptyInput || isCompleteInput) {
                            this.activeContainer = 'console';
                            
                            
                            
                            if (isCompleteInput && this.inputs[0]) {
                                this.inputs[0].setBlur();
                            }
                            
                            this.currentConsoleButtonIndex = 0;
                            this.highlightConsoleButton(this.currentConsoleButtonIndex);
                            
                            
                            
                            if (isEmptyInput) {
                                return false;
                            }
                            
                            handled = true;
                        }
                        break;
                    case 'console':
                        if (this.currentConsoleButtonIndex === 0) {
                            this.unhighlightConsoleButton(this.currentConsoleButtonIndex);
                            this.currentConsoleButtonIndex = 1;
                            this.highlightConsoleButton(this.currentConsoleButtonIndex);
                            handled = true;
                        } else if (hasBounties || hasQuests) {
                            this.activeContainer = hasBounties ? 'bounty' : 'quest';
                            this.unhighlightConsoleButton(this.currentConsoleButtonIndex);
                            if (hasBounties && this.currentBountyIndex < 0) this.currentBountyIndex = 0;
                            if (hasQuests && this.currentQuestIndex < 0) this.currentQuestIndex = 0;
                            this.selectCurrentContainer();
                            handled = true;
                        }
                        break;
                    case 'bounty':
                        if (hasQuests) {
                            this.activeContainer = 'quest';
                            this.deselectCurrentContainer();
                            if (this.currentQuestIndex < 0) this.currentQuestIndex = 0;
                            this.selectCurrentContainer();
                            handled = true;
                        }
                        break;
                }
                break;

            case Button.UP:
                switch (this.activeContainer) {
                    case 'bounty':
                        handled = this.setBountyIndex(this.currentBountyIndex - 1);
                        break;
                    case 'quest':
                        handled = this.setQuestIndex(this.currentQuestIndex - 1);
                        break;
                    case 'console':
                        
                        this.activeContainer = 'input';
                        this.deselectCurrentContainer();
                        if (this.inputs[0]) {
                            this.inputs[0].setFocus();
                        }
                        handled = true;
                        break;
                }
                break;

            case Button.DOWN:
                switch (this.activeContainer) {
                    case 'bounty':
                        handled = this.setBountyIndex(this.currentBountyIndex + 1);
                        break;
                    case 'quest':
                        handled = this.setQuestIndex(this.currentQuestIndex + 1);
                        break;
                    case 'input':
                        
                        
                        
                        const isEmptyInput = this.inputs[0]?.text?.length === 0;
                        const isCompleteInput = this.inputs[0]?.text?.length === 6;
                        
                        if (isEmptyInput || isCompleteInput) {
                            this.activeContainer = 'console';
                            
                            
                            
                            if (isCompleteInput && this.inputs[0]) {
                                this.inputs[0].setBlur();
                            }
                            
                            this.currentConsoleButtonIndex = 0;
                            this.selectCurrentContainer();
                            
                            
                            
                            if (isEmptyInput) {
                                return false;
                            }
                            
                            handled = true;
                        }
                        break;
                }
                break;

            case Button.SUBMIT:
            case Button.ACTION:
                switch (this.activeContainer) {
                    case 'input':
                        if (this.submitAction && this.inputs[0]?.text?.length === 6) {
                            this.submitAction();
                            handled = true;
                        } else {
                            this.scene.ui.playError();
                            handled = true;
                        }
                        break;
                    case 'console':
                        if (this.currentConsoleButtonIndex === 0 && this.submitAction) {
                            this.submitAction();
                            handled = true;
                        } else if (this.currentConsoleButtonIndex === 1 && this.cancelAction) {
                            this.cancelAction();
                            handled = true;
                        }
                        break;
                    case 'bounty':
                        if (this.currentBountyIndex >= 0 && this.currentBountyIndex < this.bountyButtonContainers.length) {
                            const bounty = this.getAllActiveBounties()[this.currentBountyIndex];
                            if (bounty) {
                                this.showBountyUI(bounty);
                                handled = true;
                            }
                        }
                        break;
                    case 'quest':
                        if (this.currentQuestIndex >= 0 && this.currentQuestIndex < this.questButtonContainers.length) {
                            const quest = this.scene.gameData.permaModifiers.findModifiers(m =>
                                m instanceof PermaRunQuestModifier &&
                                !m.consoleCode &&
                                this.scene.gameData.permaModifiers.isQuestBountyQuest(m.questUnlockData?.questId)
                            )[this.currentQuestIndex] as PermaRunQuestModifier;

                            if (quest) {
                                this.showQuestUI(quest);
                                handled = true;
                            }
                        }
                        break;
                }
                break;
        }

        if (DEBUG_UI) {
            console.log("Input result:", {
                handled,
                newState: {
                    activeContainer: this.activeContainer,
                    indices: {
                        bounty: this.currentBountyIndex,
                        quest: this.currentQuestIndex,
                        console: this.currentConsoleButtonIndex
                    }
                }
            });
        }

        return handled || super.processInput(button);
    }

    private deselectCurrentContainer(): void {
        
        
        this.bountyButtonContainers.forEach(container => {
            const button = container.getAt(0) as Phaser.GameObjects.Rectangle;
            button?.setFillStyle(0x444444);
        });

        
        this.questButtonContainers.forEach(container => {
            const button = container.getAt(0) as Phaser.GameObjects.Rectangle;
            button?.setFillStyle(0x444444);
        });

        
        if (this.currentConsoleButtonIndex >= 0) {
            this.unhighlightConsoleButton(this.currentConsoleButtonIndex);
        }
    }

    private selectCurrentContainer(): void {
        
        switch (this.activeContainer) {
            case 'bounty':
                if (this.currentBountyIndex >= 0 && this.bountyButtonContainers[this.currentBountyIndex]) {
                    const button = this.bountyButtonContainers[this.currentBountyIndex].getAt(0) as Phaser.GameObjects.Rectangle;
                    button?.setFillStyle(0x666666);
                }
                break;
            case 'quest':
                if (this.currentQuestIndex >= 0 && this.questButtonContainers[this.currentQuestIndex]) {
                    const button = this.questButtonContainers[this.currentQuestIndex].getAt(0) as Phaser.GameObjects.Rectangle;
                    button?.setFillStyle(0x666666);
                }
                break;
            case 'console':
                if (this.currentConsoleButtonIndex >= 0) {
                    this.highlightConsoleButton(this.currentConsoleButtonIndex);
                }
                break;
            case 'input':
                
                this.deselectCurrentContainer();
                break;
        }
    }

    private highlightConsoleButton(index: number): void {
        if (index >= 0 && index < this.buttonBgs.length) {
            const buttonBg = this.buttonBgs[index];
            buttonBg.setTint(0xFFFF00);
        }
    }

    private unhighlightConsoleButton(index: number): void {
        if (index >= 0 && index < this.buttonBgs.length) {
            const buttonBg = this.buttonBgs[index];
            buttonBg.setTint(0x666666);
        }
    }

    private setBountyIndex(index: number): boolean {
        if (index <= -1 || index >= this.activeBountyCount) {
            return false;
        }

        
        if (this.currentBountyIndex >= 0) {
            const currentButton = this.bountyButtonContainers[this.currentBountyIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            currentButton.setFillStyle(0x444444);
        }

        this.currentBountyIndex = index;

        
        if (this.currentBountyIndex >= 0) {
            const newButton = this.bountyButtonContainers[this.currentBountyIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            newButton.setFillStyle(0x666666);
        }

        return true;
    }

    private getAllActiveBounties(): PermaRunQuestModifier[] {
        return [
            ...(this.activeBounties?.rival || []),
            ...(this.activeBounties?.smitty || []),
            ...(this.activeBounties?.quest || []),
        ];
    }

    private updateActiveQuests(): void {
        if (DEBUG_UI) {
            console.log("Updating active quests");
            console.log("Quest container state:", {
                visible: this.questListContainer?.visible,
                position: {
                    x: this.questListContainer?.x,
                    y: this.questListContainer?.y
                },
                children: this.questListContainer?.list.length
            });
        }

        const permaModifiers = this.scene.gameData.permaModifiers;

        
        const activeQuests = permaModifiers.findModifiers(m =>
            m instanceof PermaRunQuestModifier &&
            !m.consoleCode &&
            permaModifiers.isQuestBountyQuest(m.questUnlockData?.questId)
        ) as PermaRunQuestModifier[];

        this.renderQuestList(activeQuests);
    }

    private renderQuestList(quests: PermaRunQuestModifier[]): void {
        this.questListContainer.removeAll(true);

        
        const title = addTextObject(
            this.scene,
            3,
            5,
            i18next.t("questUi:console.activeQuests"),
            TextStyle.WINDOW,
            { fontSize: "50px" }
        );
        this.questListContainer.add(title);

        
        const countText = addTextObject(
            this.scene,
            3,
            15,
            i18next.t("questUi:console.questsCount", {
                current: quests.length,
                max: 5
            }),
            TextStyle.WINDOW,
            { fontSize: "40px" }
        );
        this.questListContainer.add(countText);

        let currentY = 25;
        this.questButtonContainers = [];
        this.activeQuestCount = 0;

        quests.forEach((quest) => {
            const button = this.createQuestButton(
                quest,
                0,
                currentY
            );
            this.questListContainer.add(button);
            currentY += 10;
            this.activeQuestCount++;
        });

        
        const questListBg = addWindow(
            this.scene,
            -5,
            0,
            65,
            Math.min(100, 20 + (quests.length * 10) + 10)
        );
        this.questListContainer.addAt(questListBg, 0);
    }

    private createQuestButton(
        quest: PermaRunQuestModifier,
        x: number,
        y: number
    ): Phaser.GameObjects.Container {
        const container = new Phaser.GameObjects.Container(this.scene, x, y);

        const bg = new Phaser.GameObjects.Rectangle(
            this.scene,
            25,
            3,
            55,
            10,
            0x444444
        );
        bg.setInteractive();

        const text = addTextObject(
            this.scene,
            3,
            0,
            quest.type.name,
            TextStyle.MONEY,
            { fontSize: "40px" }
        );

        container.add([bg, text]);
        this.questButtonContainers.push(container);

        bg.on('pointerup', () => this.showQuestUI(quest));

        return container;
    }

    private restoreInputVisibility(): void {
        this.scene.ui.revertMode();
        if (this.inputs[0]) {
            this.inputs[0].setVisible(true);
        }
    }

    private showQuestUI(quest: PermaRunQuestModifier): void {
        this.scene.ui.setOverlayMode(Mode.QUEST_ACTIVE, {
            buttonActions: [
                async () => {
                    if (!this.scene.gameData.permaModifiers.findModifier(m => m.match(quest))) {
                        this.scene.trackPermaModifierObtained(quest);
                        await this.scene.gameData.permaModifiers.addModifier(this.scene, quest);
                        this.scene.gameData.localSaveAll(this.scene);
                    }
                    this.restoreInputVisibility();
                },
                () => this.restoreInputVisibility()
            ]
        }, null, quest, true);

        if (this.inputs[0]) {
            this.inputs[0].setVisible(false);
        }
    }

    private setQuestIndex(index: number): boolean {
        if (index <= -1 || index >= this.activeQuestCount) {
            return false;
        }

        if (this.currentQuestIndex >= 0) {
            const currentButton = this.questButtonContainers[this.currentQuestIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            currentButton.setFillStyle(0x444444);
        }

        this.currentQuestIndex = index;

        if (this.currentQuestIndex >= 0) {
            const newButton = this.questButtonContainers[this.currentQuestIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            newButton.setFillStyle(0x666666);
        }

        return true;
    }
}