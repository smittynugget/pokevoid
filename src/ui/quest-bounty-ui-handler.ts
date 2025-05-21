import BountyUiHandler from "./bounty-ui-handler";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { QUEST_CONSOLE_CODES } from "../modifier/modifier-type";
import { Species } from "#enums/species";
import { PermaRunQuestModifier } from "../modifier/modifier";
import { addTextObject, TextStyle } from "./text";
import {ModalConfig} from "#app/ui/modal-ui-handler";
import i18next from "i18next";
import {randSeedInt} from "../utils";
import {Button} from "#enums/buttons";
import {addWindow} from "#app/ui/ui-theme";


export default class QuestBountyUiHandler extends BountyUiHandler {
    protected questSprite: Phaser.GameObjects.Sprite;
    protected replacementContainer: Phaser.GameObjects.Container;
    protected selectedBountyToReplace: PermaRunQuestModifier | null = null;
    protected originalSubmitAction: Function | null = null;
    protected currentReplaceBtnIndex: number = 0;
    protected bountyButtons: Phaser.GameObjects.Container[] = [];
    protected cancelButton: Phaser.GameObjects.Container;

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
    }

    getModalTitle(): string {
        return i18next.t("questUi:bounty.quest.modalTitle");
    }

    protected formatBountyTarget(target: string | Species): string {
        if (!target) return "";

        const speciesName = typeof target === 'number' ?
            Species[target] :
            target;

        return speciesName.split('_')
            .map((word, index) => {
                return index === 0 ?
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() :
                    word.toLowerCase();
            })
            .join(' ');
    }

    protected async loadTexture(): Promise<void> {
    if (!this.bountyTarget && !this.questModifier?.questUnlockData?.questSpriteId) {
            this.textureLoaded = true;
            return;
        }

    let spriteSource = this.questModifier?.questUnlockData?.questSpriteId || Species[this.bountyTarget];

    if (spriteSource == 201) {
        spriteSource = "201-a";
    }

    const spriteKey = `pkmn__${spriteSource}`;

        if (this.scene.textures.exists(spriteKey)) {
            console.log(`[QuestBountyUI] Texture ${spriteKey} already loaded`);
            this.textureLoaded = true;
            return;
        }

        console.log(`[QuestBountyUI] Loading texture for ${spriteKey}`);

       return new Promise((resolve, reject) => {
            this.scene.load.embeddedAtlas(
            spriteKey,
            `images/pokemon/${spriteSource}.png`
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                console.log(`[QuestBountyUI] Texture loaded successfully: ${spriteKey}`);
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                console.error(`[QuestBountyUI] Failed to load texture: ${file.key}`);
                reject(new Error(`Failed to load texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    protected setupSprite(): void {
    let spriteSource = this.questModifier?.questUnlockData?.questSpriteId || Species[this.bountyTarget];
    if (spriteSource == 201) {
        spriteSource = "201-a";
    }
    if (!spriteSource) {
            return;
        }

        try {
            if (!this.textureLoaded) {
                throw new Error('Texture not loaded yet. Call loadTexture first.');
            }

            if (this.questSprite) {
                console.log('[QuestBountyUI] Cleaning up existing sprite');
                this.questSprite.destroy();
            }

        const spriteKey = `pkmn__${spriteSource}`; 

            console.log(`[QuestBountyUI] Attempting to create sprite with key: ${spriteKey}`);

            if (!this.scene.textures.exists(spriteKey)) {
                throw new Error(`Required texture not found: ${spriteKey}`);
            }

            try {
                this.questSprite = (this.scene as BattleScene).addPokemonSprite(
                    null,
                    60,
                    55,
                    spriteKey,
                    undefined,
                    false,
                    true
                );
                console.log('[QuestBountyUI] Successfully created sprite using BattleScene.addPokemonSprite');
            } catch (createError) {
                throw new Error(`Failed to create Pokemon sprite: ${createError.message}`);
            }

            this.questSprite.setScale(0.7);
            this.uiContainer.add(this.questSprite);

            if (this.questSprite.texture.frameTotal > 1) {
                this.questSprite.play(spriteKey);
            }

            if (this.scene.spritePipeline) {
                this.questSprite.setPipeline(this.scene.spritePipeline);
            }

        } catch (error) {
            console.error('[QuestBountyUI] Critical error in setupSprite:', error);
            if (this.questSprite) {
                this.questSprite.destroy();
                this.questSprite = null;
            }
            throw error;
        }
    }
    
    protected getRewardChances(): string {
        return i18next.t("questUi:bounty.quest.rewards.default");
    }

    protected getTaskText(): string {
        return this.questModifier?.task || i18next.t("questUi:bounty.quest.invalidTask");
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) {
            return false;
        }
        this.originalSubmitAction = args[0].buttonActions[0]
        return super.show(args);
    }

    protected assignBountyTarget(): void {
        if (this.questModifier?.questUnlockData?.rewardId) {
            const rewardId = this.questModifier.questUnlockData.rewardId;

            if (Array.isArray(rewardId)) {
                const randomIndex = randSeedInt(rewardId.length);
                this.bountyTarget = Species[rewardId[randomIndex]];
            } else {
                this.bountyTarget = Species[rewardId];
            }
        }
        else {
            console.error('[QuestBountyUI] No reward ID found in quest modifier');
            this.bountyTarget = null;
        }
    }


    protected setupSpecificUI(config: any): void {
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

    protected hasConsoleCode(modifier:PermaRunQuestModifier):boolean {
        return this.consoleCode != null && this.consoleCode != "" ? modifier.consoleCode != "" : modifier.consoleCode == ""
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
        this.scene.gameData.permaModifiers.isQuestBountyQuest(m.questUnlockData?.questId)
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

        this.setReplaceBountyIndex(this.currentReplaceBtnIndex)
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
                        this.scene.gameData.permaModifiers.isQuestBountyQuest(m.questUnlockData?.questId)
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
            this.scene.gameData.permaModifiers.removeModifier(this.selectedBountyToReplace, this.selectedBountyToReplace.consoleCode == "", this.scene);
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


    clear(): void {
        if (this.questSprite) {
            console.log('[QuestBountyUI] Cleaning up sprite');
            try {
                this.questSprite.destroy();
                this.questSprite = null;
            } catch (error) {
                console.error('[QuestBountyUI] Error during cleanup:', error);
            }
        }
        this.questModifier = null;
        this.cleanupReplacementUI();

        super.clear();
    }
}