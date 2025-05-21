import BountyUiHandler from "./bounty-ui-handler";
import { Mode } from "./ui";
import BattleScene from "../battle-scene";
import { SMITTY_CONSOLE_CODES } from "../modifier/modifier-type";
import { SMITTY_FORM_ITEMS } from "../data/pokemon-forms";
import { addTextObject, TextStyle } from "./text";
import { FormChangeItem } from "#enums/form-change-items";
import { Species } from "#enums/species";
import { pokemonSmittyForms } from "#app/data/pokemon-species";
import i18next from "i18next";
import { PermaRunQuestModifier } from "../modifier/modifier";
import { ModalConfig } from "#app/ui/modal-ui-handler";
import { Button } from "#enums/buttons";
import { addWindow } from "#app/ui/ui-theme";

export default class SmittyPokemonBountyUIHandler extends BountyUiHandler {
    private itemsContainer: Phaser.GameObjects.Container;
    private pokemonSprite: Phaser.GameObjects.Sprite;
    protected replacementContainer: Phaser.GameObjects.Container;
    protected selectedBountyToReplace: PermaRunQuestModifier | null = null;
    protected originalSubmitAction: Function | null = null;
    protected currentReplaceBtnIndex: number = 0;
    protected bountyButtons: Phaser.GameObjects.Container[] = [];
    protected cancelButton: Phaser.GameObjects.Container;

    getModalTitle(): string {
        return i18next.t("questUi:bounty.smitty.modalTitle");
    }

    protected formatItemName(enumValue: FormChangeItem): string {
        return i18next.t(`modifierType:FormChangeItem.${FormChangeItem[enumValue]}`);
    }

    protected formatBountyTarget(target: string | Species): string {
        if (typeof target === 'number') {
            const key = Species[target].toLowerCase();
            return i18next.t(`pokemon:${key}`);
        }
        return target.charAt(0).toUpperCase() + target.slice(1);
    }

    protected getBaseFormInfo(): Species | string {
        for (const [speciesId, forms] of pokemonSmittyForms) {
            const form = forms.find(f => f.formName === this.bountyTarget);
            if (form) {
                return speciesId;
            }
        }
        return i18next.t("questUi:bounty.smitty.common.any");
    }

    protected async loadTexture(): Promise<void> {
        const spriteKey = `pkmn__glitch__${this.bountyTarget}`;

        if (this.scene.textures.exists(spriteKey)) {
            console.log(`[PokemonBountyUI] Texture ${spriteKey} already loaded`);
            this.textureLoaded = true;
            return;
        }

        console.log(`[PokemonBountyUI] Loading texture for ${spriteKey}`);

        return new Promise((resolve, reject) => {
            this.scene.load.embeddedAtlas(
                spriteKey,
                `images/pokemon/glitch/${this.bountyTarget}.png`
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                console.log(`[PokemonBountyUI] Texture loaded successfully: ${spriteKey}`);


                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                console.error(`[PokemonBountyUI] Failed to load texture: ${file.key}`);
                reject(new Error(`Failed to load texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    protected setupSprite(): void {
        try {
            if (!this.textureLoaded) {
                throw new Error('Texture not loaded yet. Call loadTexture first.');
            }

            if (this.pokemonSprite) {
                console.log('[PokemonBountyUI] Cleaning up existing sprite');
                this.pokemonSprite.destroy();
            }

            const spriteKey = `pkmn__glitch__${this.bountyTarget}`;
            console.log(`[PokemonBountyUI] Attempting to create sprite with key: ${spriteKey}`);

            if (!this.scene.textures.exists(spriteKey)) {
                throw new Error(`Required texture not found: ${spriteKey}`);
            }

            try {
                this.pokemonSprite = (this.scene as BattleScene).addPokemonSprite(
                    null,
                    60,
                    55,
                    spriteKey,
                    undefined,
                    false,
                    true
                );
                if (this.isLocked()) {
                    this.pokemonSprite.setTint(0x000000);
                    this.pokemonSprite.setAlpha(0.85);
                }
                console.log('[PokemonBountyUI] Successfully created sprite using BattleScene.addPokemonSprite');
            } catch (createError) {
                throw new Error(`Failed to create Pokemon sprite: ${createError.message}`);
            }

            try {
                this.pokemonSprite.setScale(0.25);
            } catch (scaleError) {
                console.warn('[PokemonBountyUI] Warning: Could not set sprite scale:', scaleError);
            }

            try {
                this.uiContainer.add(this.pokemonSprite);
                console.log('[PokemonBountyUI] Added sprite to modal container');
            } catch (containerError) {
                throw new Error(`Failed to add sprite to container: ${containerError.message}`);
            }

            try {
                if (this.pokemonSprite.texture.frameTotal > 1) {
                    this.pokemonSprite.play(spriteKey);
                    console.log(`[PokemonBountyUI] Started animation with ${this.pokemonSprite.texture.frameTotal} frames`);
                } else {
                    console.log('[PokemonBountyUI] No animation frames found for sprite');
                }
            } catch (animError) {
                console.warn('[PokemonBountyUI] Warning: Could not setup animation:', animError);
            }

            try {
                if (this.scene.spritePipeline) {
                    this.pokemonSprite.setPipeline(this.scene.spritePipeline);
                    console.log('[PokemonBountyUI] Successfully set sprite pipeline');
                } else {
                    console.warn('[PokemonBountyUI] Warning: Scene.spritePipeline not found');
                }
            } catch (setPipelineError) {
                console.error('[PokemonBountyUI] Error setting sprite pipeline:', setPipelineError);
                throw setPipelineError;
            }

            console.log('[PokemonBountyUI] Sprite setup completed successfully');

        } catch (error) {
            console.error('[PokemonBountyUI] Critical error in setupPokemonSprite:', error);
            console.error('[PokemonBountyUI] Stack trace:', error.stack);

            if (this.pokemonSprite) {
                try {
                    this.pokemonSprite.destroy();
                    this.pokemonSprite = null;
                    console.log('[PokemonBountyUI] Cleaned up sprite after error');
                } catch (cleanupError) {
                    console.error('[PokemonBountyUI] Error during cleanup:', cleanupError);
                }
            }
        }
    }

    protected getRewardChances(): string {
        const hasSpecies = this.getBaseFormInfo() !== i18next.t("questUi:bounty.smitty.common.any");
        return i18next.t(hasSpecies 
            ? "questUi:bounty.smitty.rewards.withSpecies"
            : "questUi:bounty.smitty.rewards.withoutSpecies"
        );
    }

    protected getTaskText(): string {
        const baseForm = this.getBaseFormInfo();
        return baseForm === i18next.t("questUi:bounty.smitty.common.any")
            ? i18next.t("questUi:bounty.smitty.task.evolveAny", {
                formName: this.formatBountyTarget(this.bountyTarget)
            })
            : i18next.t("questUi:bounty.smitty.task.evolveSpecific", {
                basePokemon: this.formatBountyTarget(baseForm),
                formName: this.formatBountyTarget(this.bountyTarget)
            });
    }

    protected isLocked(): boolean {
        if (!this.bountyTarget) {
            this.assignBountyTarget();
        }
        const isUnlocked = !this.scene.gameData.dataLoadAttempted || this.scene.gameData.isUniSmittyFormUnlocked(this.bountyTarget);

        return !isUnlocked;
    }

    protected setupSpecificUI(config: any): void {
        if(!this.isLocked()) {
            this.setupItemsSection();
        }
    }

    protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {
        if (this.isLocked()) {
            return super.modifyButtonActions(config, ...args);
        }
        
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
            this.scene.gameData.permaModifiers.isSmittyBountyQuest(m.questUnlockData?.questId)
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
                            this.scene.gameData.permaModifiers.isSmittyBountyQuest(m.questUnlockData?.questId)
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

    private setupItemsSection(): void {
        this.itemsContainer = this.scene.add.container(120, 80);
        this.uiContainer.add(this.itemsContainer);

        const requiredItems = SMITTY_FORM_ITEMS[this.bountyTarget];
        if (requiredItems) {
            const itemsText = addTextObject(
                this.scene,
                0,
                0,
                i18next.t("questUi:bounty.smitty.items.title"),
                TextStyle.WINDOW,
                { fontSize: '60px' }
            );
            this.itemsContainer.add(itemsText);

            const itemsRow = addTextObject(
                this.scene,
                0,
                10,
                requiredItems.map(item => this.formatItemName(item)).join(' | '),
                TextStyle.WINDOW,
                { fontSize: '40px' }
            );
            this.itemsContainer.add(itemsRow);
        }
    }

    protected assignBountyTarget(): void {
        this.bountyTarget = Object.entries(SMITTY_CONSOLE_CODES)
            .find(([_, code]) => code === this.consoleCode)?.[0] || "";
    }

    clear(): void {
        if (this.itemsContainer) {
            this.itemsContainer.removeAll(true);
        }
        if (this.pokemonSprite) {
            try {
                this.pokemonSprite.destroy();
            } catch (destroyError) {
                console.error('[PokemonBountyUI] Error destroying sprite:', destroyError);
            }
        }
        this.cleanupReplacementUI();
        super.clear();
    }
}

