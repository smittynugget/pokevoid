import {ModalConfig, ModalUiHandler} from "./modal-ui-handler";
import {Mode} from "./ui";
import BattleScene from "../battle-scene";
import {addTextObject, TextStyle} from "./text";
import {ModifierType, modifierTypes} from "../modifier/modifier-type";
import i18next from "i18next";
import {Species} from "#enums/species";
import {Button} from "#enums/buttons";
import Pokemon from "#app/field/pokemon";
import { Unlockables } from "#app/system/unlockables";
import {QuestUnlockData} from "#app/system/game-data";
import {RivalTrainerType} from "#app/data/trainer-config";
import { trainerConfigs } from "../data/trainer-config";
import {GameModes} from "../game-mode";
import {getPokemonSpecies} from "#app/data/pokemon-species";
import { modStorage } from "../system/mod-storage";
import { getModPokemonName } from "../data/mod-glitch-form-utils";

export enum RewardObtainedType {
    MODIFIER,
    GAMEOVER_MODIFIER,
    RIBBON_MODIFIER,
    POKEMON,
    FUSION,
    MONEY,
    UNLOCK,
    FORM, 
    QUEST_UNLOCK,
    RIVAL_TO_VOID,
    NIGHTMARE_MODE_CHANGE,
}

export interface RewardConfig {
    type: RewardObtainedType;
    name?: string;
    pokemon?: Pokemon;
    modifierType?: ModifierType;
    amount?: number;
    unlockable?: Unlockables;
    questUnlockable?: QuestUnlockData;
    questSpriteId?: Species;
    rivalType?: RivalTrainerType;
    gameMode?: GameModes;
    isGlitch?: boolean;
    isMod?: boolean;
    isInitialQuestUnlock?: boolean;
    sprite?: string;
    isModeUnlock?: boolean;
    isLevelUp?: boolean;
}

export default class RewardObtainedUiHandler extends ModalUiHandler {
    protected rewardConfig: RewardConfig;
    protected rewardSprite: Phaser.GameObjects.Sprite;
    protected rewardBG: Phaser.GameObjects.Sprite;
    protected uiContainer: Phaser.GameObjects.Container;
    protected textureLoaded: boolean = false;
    private modalBackground: Phaser.GameObjects.Rectangle;
    private buttonActions: (() => void)[];

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
        this.rewardBG = null;
    }

    getModalTitle(): string {
        switch (this.rewardConfig.type) {
            case RewardObtainedType.POKEMON:
                return i18next.t("rewardObtainedUi:titles.newPokemon");
            case RewardObtainedType.FUSION:
                return i18next.t("rewardObtainedUi:titles.newFusion");
            case RewardObtainedType.MODIFIER:
                return i18next.t("rewardObtainedUi:titles.newItem");
            case RewardObtainedType.GAMEOVER_MODIFIER:
                return i18next.t("rewardObtainedUi:titles.newGameOverItem");
            case RewardObtainedType.RIBBON_MODIFIER:
                return i18next.t("rewardObtainedUi:titles.newRibbonItem");
            case RewardObtainedType.MONEY:
                return i18next.t("rewardObtainedUi:titles.moneyObtained");
            case RewardObtainedType.UNLOCK:
            case RewardObtainedType.QUEST_UNLOCK:
                return this.rewardConfig.isInitialQuestUnlock ? i18next.t("rewardObtainedUi:titles.newShopUnlock") : i18next.t("rewardObtainedUi:titles.newUnlock");
            case RewardObtainedType.FORM:
                if(this.rewardConfig.isGlitch) {
                    return i18next.t("rewardObtainedUi:titles.newForm");
                }
                else {
                    return i18next.t("rewardObtainedUi:titles.newSmittyForm");
                }
            case RewardObtainedType.RIVAL_TO_VOID:
                return i18next.t("rewardObtainedUi:titles.rivalLost");
            case RewardObtainedType.NIGHTMARE_MODE_CHANGE:
                return i18next.t("rewardObtainedUi:titles.modeChange");
            default:
                return i18next.t("rewardObtainedUi:titles.rewardObtained");
        }
    }

    getWidth(): number {
        return 120;
    }

    getHeight(): number {
        return 105;
    }

    getMargin(): [number, number, number, number] {
        return [0, 0, 16, 0];
    }

    getButtonLabels(): string[] {
        return [i18next.t("menu:confirm")];
    }

    protected async loadTexture(): Promise<void> {
        if (!this.needsSprite() || this.rewardConfig.modifierType) {
            this.textureLoaded = true;
            return;
        }

        if (this.rewardConfig.pokemon) {
            return this.loadPokemonTexture();
        }

        if (this.rewardConfig.type === RewardObtainedType.UNLOCK && this.rewardConfig.isModeUnlock) {
            return this.loadFormTexture();
        }

        if (this.rewardConfig.type === RewardObtainedType.QUEST_UNLOCK && this.rewardConfig.questSpriteId) {
                return this.loadQuestTexture();
        }

        if (this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID && this.rewardConfig.rivalType) {
            return this.loadRivalTexture();
        }

        if (this.rewardConfig.type === RewardObtainedType.FORM && this.rewardConfig.name) {
            return this.loadFormTexture();
        }

        if (this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE && this.rewardConfig.gameMode) {
            return this.loadGameModeTexture();
        }

        return this.loadItemTexture();
    }

    private needsSprite(): boolean {
        return !!(this.rewardConfig.pokemon ||
            this.rewardConfig.type === RewardObtainedType.FORM ||
            this.rewardConfig.modifierType ||
            this.rewardConfig.type === RewardObtainedType.MONEY ||
            this.rewardConfig.type === RewardObtainedType.UNLOCK ||
            this.rewardConfig.type === RewardObtainedType.QUEST_UNLOCK ||
            this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID ||
            this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE);
    }

    private async loadPokemonTexture(): Promise<void> {
        const pokemon = this.rewardConfig.pokemon;
        if (!pokemon) return;

        try {
            await pokemon.loadAssets(this.scene);
            this.textureLoaded = true;
        } catch (error) {
            console.error('[RewardObtainedUI] Failed to load Pokemon texture:', error);
            throw error;
        }
    }

    private async loadItemTexture(): Promise<void> {
                    if (!this.scene.textures.exists('items')) {
            return new Promise((resolve, reject) => {
                this.scene.load.spritesheet('items', 'images/items.png', {
                    frameWidth: 32,
                    frameHeight: 32
                });

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                    reject(new Error(`Failed to load items texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

        this.textureLoaded = true;
    }

    private async loadQuestTexture(): Promise<void> {
        if (!this.rewardConfig.questSpriteId) {
            this.textureLoaded = true;
            return;
        }

        const spriteSource = this.rewardConfig.questSpriteId;
        const spriteKey = `pkmn__${spriteSource}`;

        if (this.scene.textures.exists(spriteKey)) {
            this.textureLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            this.scene.load.embeddedAtlas(
                spriteKey,
                `images/pokemon/${spriteSource}.png`
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                reject(new Error(`Failed to load texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private async loadRivalTexture(): Promise<void> {
        if (!this.rewardConfig.rivalType) {
            this.textureLoaded = true;
            return;
        }

        const config = trainerConfigs[this.rewardConfig.rivalType];
        const spriteKey = config.getSpriteKey(false, false);

        if (this.scene.textures.exists(spriteKey)) {
            this.textureLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            this.scene.load.atlas(
                spriteKey,
                `images/trainer/${spriteKey}.png`,
                `images/trainer/${spriteKey}.json`
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                reject(new Error(`Failed to load trainer texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private async loadFormTexture(): Promise<void> {
        const pokeName = this.rewardConfig.isModeUnlock ? this.rewardConfig.sprite : this.rewardConfig.name;
        let spriteKey;
        let imagePath;

        if (this.rewardConfig.isMod) {
            // For mod forms, use a special sprite key pattern
            spriteKey = `pkmn__glitch__${pokeName.toLowerCase()}`;
            
            // Check if the sprite is already loaded
            if (this.scene.textures.exists(spriteKey)) {
                // Even if sprite is loaded, ensure mod icon is loaded too
                this.textureLoaded = true;
                return;
            }
            
            // For mod forms, sprite data should be retrieved from mod storage
            try {
                const modId = `${this.rewardConfig.pokemon?.speciesId || ''}_${pokeName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const storedMod = await modStorage.getMod(modId);
                
                if (storedMod && storedMod.spriteData) {
                    
                    // Use data URL or base64 string for the sprite
                    return new Promise((resolve, reject) => {
                        let spriteData = storedMod.spriteData;
                        let objectUrl: string;
                        
                        if (typeof spriteData === 'string') {
                            if (spriteData.startsWith('data:')) {
                                objectUrl = spriteData;
                            } else {
                                objectUrl = `data:image/png;base64,${spriteData}`;
                            }
                        }
                        
                        this.scene.load.image(spriteKey, objectUrl);
                        
                        this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                            // Create animation for the sprite
                            if (this.scene.anims && typeof this.scene.anims.create === 'function' && !this.scene.anims.exists(spriteKey)) {
                                this.scene.anims.create({
                                    key: spriteKey,
                                    frames: [{ key: spriteKey }],
                                    frameRate: 1,
                                    repeat: -1
                                });
                            }
                            
                            this.textureLoaded = true;
                            resolve();
                        });
                        
                        this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                            reject(new Error(`Failed to load texture from mod storage: ${file.key}`));
                        });
                        
                        if (!this.scene.load.isLoading()) {
                            this.scene.load.start();
                        }
                    });
                } else {
                    console.error(`Mod ${pokeName} not found in storage`);
                    // Fallback to standard glitch form as a placeholder
                    imagePath = `images/pokemon/glitch/missingno.png`;
                }
            } catch (error) {
                console.error(`Error loading mod ${pokeName} from storage:`, error);
                // Fallback to standard glitch form as a placeholder
                imagePath = `images/pokemon/glitch/missingno.png`;
            }
        } else if (this.rewardConfig.isGlitch) {
            spriteKey = `pkmn__glitch__${pokeName}`;
            imagePath = `images/pokemon/glitch/${pokeName}.png`;
        } else {
            spriteKey = `pkmn__smitty__${pokeName}`;
            imagePath = `images/pokemon/smitty/${pokeName}.png`;
        }

        if (this.scene.textures.exists(spriteKey)) {
            this.textureLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            this.scene.load.embeddedAtlas(
                spriteKey,
                imagePath
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                reject(new Error(`Failed to load texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private async loadGameModeTexture(): Promise<void> {
        if (!this.rewardConfig.gameMode) {
            this.textureLoaded = true;
            return;
        }

        if (this.rewardConfig.gameMode === GameModes.DRAFT) {
            this.textureLoaded = true;
            return;
        }

        const spriteKey = this.getGameModeSpriteKey();
        if (this.scene.textures.exists(spriteKey)) {
            this.textureLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            let imagePath: string;

            switch (this.rewardConfig.gameMode) {
                case GameModes.NUZLOCKE:
                case GameModes.NUZLIGHT:
                    imagePath = `images/pokemon/${spriteKey.replace('pkmn__', '')}.png`;
                    break;
                case GameModes.NIGHTMARE:
                    imagePath = `images/pokemon/glitch/tengale.png`;
                    break;
            }

            this.scene.load.embeddedAtlas(
                spriteKey,
                imagePath
            );

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.textureLoaded = true;
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                reject(new Error(`Failed to load game mode texture: ${file.key}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private getGameModeSpriteKey(): string {
        switch (this.rewardConfig.gameMode) {
            case GameModes.NUZLOCKE:
                return `pkmn__${Species.SHIFTRY}`;
            case GameModes.NUZLIGHT:
                return `pkmn__${Species.NUZLEAF}`;
            case GameModes.NIGHTMARE:
                return 'pkmn__glitch__tengale';
            default:
                return 'default';
        }
    }

    private getGameModeDescription(): string {
        switch (this.rewardConfig.gameMode) {
            case GameModes.NUZLOCKE:
                return i18next.t("rewardObtainedUi:gameModes.nuzlocke.description");
            case GameModes.DRAFT:
                return i18next.t("rewardObtainedUi:gameModes.draft.description");
            case GameModes.NUZLIGHT:
                return i18next.t("rewardObtainedUi:gameModes.nuzlight.description");
            case GameModes.NIGHTMARE:
                return i18next.t("rewardObtainedUi:gameModes.nightmare.description");
            default:
                return i18next.t("rewardObtainedUi:gameModes.default.description");
        }
    }

    private setupQuestSprite(): void {
        if (!this.rewardConfig.questSpriteId) {
            return;
        }

        try {
            if (!this.textureLoaded) {
                throw new Error('Texture not loaded yet. Call loadTexture first.');
            }

            if (this.rewardSprite) {
                this.rewardSprite.destroy();
            }


            if(this.rewardConfig.isInitialQuestUnlock){
                this.rewardBG = this.scene.add.sprite(this.modalBg.width / 2, this.modalBg.height / 2, "smitems_192", "quest");
                this.rewardBG.setScale(0.3);
                this.uiContainer.add(this.rewardBG);
            }

                const pokemon = getPokemonSpecies(this.rewardConfig.questSpriteId);

                this.rewardSprite = this.scene.add.sprite(
                    this.modalBg.width / 2,
                    this.modalBg.height / 2 - 5,
                    pokemon.getIconAtlasKey()
                );

                this.rewardSprite.setFrame(pokemon.getIconId(false));

                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
            this.uiContainer.add(this.rewardSprite);


        } catch (error) {
            if (this.rewardSprite) {
                this.rewardSprite.destroy();
                this.rewardSprite = null;
            }
            throw error;
        }
    }

    protected setupSprite(): void {
        if (!this.textureLoaded) return;

        try {
            if (this.rewardSprite) {
                this.rewardSprite.destroy();
                this.rewardSprite = null;
            }

            if (this.rewardConfig.pokemon) {
                this.setupPokemonSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.QUEST_UNLOCK && this.rewardConfig.questSpriteId) {
                this.setupQuestSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID && this.rewardConfig.rivalType) {
                this.setupRivalSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.FORM) {
                this.setupFormSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE && this.rewardConfig.gameMode) {
                this.setupGameModeSprite();
            } else if (this.rewardConfig.modifierType) {
                this.setupModifierSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.MONEY) {
                this.setupMoneySprite();
            } else if (this.rewardConfig.type === RewardObtainedType.UNLOCK) {
                if(this.rewardConfig.isModeUnlock) {
                    this.setupFormSprite();
                }
                else {
                    this.setupUnlockSprite();
                }
            }

            if (this.rewardSprite) {
                this.uiContainer.add(this.rewardSprite);
            }
        } catch (error) {
            throw error;
        }
    }

    private calculateSpriteScale(sprite: Phaser.GameObjects.Sprite): number {
        const width = this.getWidth();
        const height = this.getHeight();
        
        const spriteWidth = sprite.width;
        const spriteHeight = sprite.height;
        
        let scaleBy = 0.65;
        if(this.rewardConfig.type === RewardObtainedType.FORM || this.rewardConfig.gameMode === GameModes.NIGHTMARE) {
            scaleBy = 0.45;
        }
        else if(this.rewardConfig.modifierType || this.rewardConfig.amount) {
            scaleBy = 0.5;
        }
        else if(this.rewardConfig.questSpriteId || this.rewardConfig.pokemon || this.rewardConfig.gameMode) {
            scaleBy = 0.45;
        }

        const targetSize = Math.min(width, height) * scaleBy;
        
        const scale = targetSize / Math.max(spriteWidth, spriteHeight);
        
        return scale;
    }

    private getSpritePosition(xOffset: number = 0, yOffset: number = 0): { x: number, y: number } {
        return {
            x: this.modalBg.width / 2 + xOffset,
            y: this.modalBg.height / 2 + yOffset
        };
    }

    private setupPokemonSprite(): void {
        const pokemon = this.rewardConfig.pokemon;
        if (!pokemon) return;

        const position = this.getSpritePosition();
        this.rewardSprite = this.scene.addPokemonSprite(
            pokemon,
            position.x,
            position.y,
            pokemon.getSpriteKey(),
            undefined,
            false,
            true
        );
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));

        if (this.rewardSprite.texture.frameTotal > 1) {
            this.rewardSprite.play(pokemon.getSpriteKey());
        }

            if (this.scene.spritePipeline) {
                this.rewardSprite.setPipeline(this.scene.spritePipeline);
            if (pokemon.isFusion()) {
                this.rewardSprite.setPipelineData("spriteColors", pokemon.getSprite().pipelineData.spriteColors);
                this.rewardSprite.setPipelineData("fusionSpriteColors", pokemon.getSprite().pipelineData.fusionSpriteColors);
            }
            this.rewardSprite.setPipelineData("shiny", pokemon.shiny);
            this.rewardSprite.setPipelineData("variant", pokemon.variant);
        }
    }

    private setupModifierSprite(): void {
        if (!this.rewardConfig.modifierType) return;

        const position = this.getSpritePosition();
        let itemAtlas = this.rewardConfig.modifierType.group === "glitch" || this.rewardConfig.modifierType.group === "perma" ? "smitems_192" : "items"
        this.rewardSprite = this.scene.add.sprite(position.x, position.y, itemAtlas);
        this.rewardSprite.setFrame(this.rewardConfig.isLevelUp ? this.rewardConfig.sprite : this.rewardConfig.modifierType.iconImage);
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
    }

    private setupMoneySprite(): void {
        const position = this.getSpritePosition();
        this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'smitems_192');
        this.rewardSprite.setFrame("battleMoney");
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
    }

    private setupUnlockSprite(): void {
        const position = this.getSpritePosition();
        this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'items');
        if(this.rewardConfig.sprite) {
            this.rewardSprite.setFrame(this.rewardConfig.sprite);
        }
        else {
            this.rewardSprite.setFrame(1);
        }
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
    }

    private setupFormSprite(): void {
        const pokeName = this.rewardConfig.isModeUnlock ? this.rewardConfig.sprite : this.rewardConfig.name;
        let spriteKey;
        
        if (this.rewardConfig.isMod) {
            spriteKey = `pkmn__glitch__${pokeName.toLowerCase()}`;
        } else if (this.rewardConfig.isGlitch) {
            spriteKey = `pkmn__glitch__${pokeName}`;
        } else {
            spriteKey = `pkmn__smitty__${pokeName}`;
        }
        
        const position = this.getSpritePosition(0, 0);
        this.rewardSprite = this.scene.addPokemonSprite(
            null,
            position.x,
            position.y,
            spriteKey,
            undefined,
            false,
            true
        );
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));

        if (this.rewardSprite.texture.frameTotal > 1) {
            this.rewardSprite.play(spriteKey);
        }

        if (this.scene.spritePipeline) {
            this.rewardSprite.setPipeline(this.scene.spritePipeline);
        }
    }

    private setupRivalSprite(): void {
        if (!this.rewardConfig.rivalType) return;

        const config = trainerConfigs[this.rewardConfig.rivalType];
        const spriteKey = config.getSpriteKey(false, false);

        const position = this.getSpritePosition();
        this.rewardSprite = (this.scene as BattleScene).addFieldSprite(
            position.x,
            position.y - 5,
            spriteKey
        );
        this.rewardSprite.setOrigin(0.5, 0.5);
        this.rewardSprite.setScale(0.8);

        if (this.rewardSprite.texture.frameTotal > 1) {
            const animConfig = {
                key: spriteKey,
                repeat: -1,
                frameRate: 24
            };
            this.rewardSprite.play(animConfig);
        }

        this.scene.tweens.add({
            targets: this.rewardSprite,
            alpha: 0,
            duration: 15000,
            ease: 'Power2',
            delay: 4500
        });
    }

    private setupGameModeSprite(): void {
        if (!this.rewardConfig.gameMode) return;

        const position = this.getSpritePosition();
        const spriteKey = this.getGameModeSpriteKey();

        switch (this.rewardConfig.gameMode) {
            case GameModes.DRAFT:
                this.rewardSprite = this.scene.add.sprite(
                position.x,
                position.y - 5,
                'smitems_192',
                'draftMode'
                );
                this.rewardSprite.setOrigin(0.5, 0.5);
                this.rewardSprite.setScale(0.3);
                break;

            case GameModes.NUZLOCKE:
            case GameModes.NUZLIGHT:
                this.rewardSprite = (this.scene as BattleScene).addPokemonSprite(
                    null,
                    position.x,
                    position.y,
                    spriteKey,
                    undefined,
                    false,
                    true
                );
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
                break;

            case GameModes.NIGHTMARE:
                this.rewardSprite = (this.scene as BattleScene).addPokemonSprite(
                    null,
                    position.x,
                    position.y,
                    spriteKey,
                    undefined,
                    false,
                    true
                );
                this.rewardSprite.setOrigin(0.5, 0.5);
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
                break;

            default:
                this.rewardSprite = this.scene.add.sprite(position.x, position.y, spriteKey);
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
        }

        if (this.rewardSprite.texture.frameTotal > 1) {
            const animConfig = {
                key: this.rewardSprite.texture.key,
                repeat: -1,
                frameRate: 24
            };
            this.rewardSprite.play(animConfig);
        }

        if ((this.rewardConfig.gameMode === GameModes.NUZLOCKE || 
             this.rewardConfig.gameMode === GameModes.NUZLIGHT ||
             this.rewardConfig.gameMode === GameModes.NIGHTMARE) && 
            this.scene.spritePipeline) {
            this.rewardSprite.setPipeline(this.scene.spritePipeline);
        }

        this.scene.tweens.add({
            targets: this.rewardSprite,
            scale: this.rewardSprite.scale * 0.9,
            duration: 1500,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) return false;

        if (args.length >= 2 && "buttonActions" in args[0]) {
            this.rewardConfig = args[1] as RewardConfig;
            if (super.show(args)) {
                const config = args[0] as ModalConfig;
                this.buttonActions = config.buttonActions;

                this.uiContainer = this.scene.add.container(0, 0);
                this.modalContainer.add(this.uiContainer);
                this.uiContainer.setAlpha(0);

                this.loadTexture()
                    .then(() => {
                        this.setupSprite();
                        this.setupUI();
                        this.fadeInUI();
                    })
                    .catch(error => {
                        console.error('[RewardObtainedUI] Error:', error);
                        this.handleUIError();
                    });

                return true;
            }
        }
        return false;
    }

    protected setupUI(): void {
        const priorToGameover = this.scene.currentBattle ? this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex) : false;
        this.modalBackground = this.scene.add.rectangle(
            0,
            0,
            this.scene.game.canvas.width,
            this.scene.game.canvas.height,
        priorToGameover ? 0x000000 :
            this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID ? 0x000000 :
            this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE ? 0x800080 : 0xFFD700,
            priorToGameover ? 1.0 : 0.65 * this.scene.gameData.rewardOverlayOpacity
        );
        this.modalBackground.setDepth(9998);
        this.modalContainer.addAt(this.modalBackground, 0);

        const getTextPosition = () => {
            const sprite = this.rewardBG ? this.rewardBG : this.rewardSprite;
            const spriteHeight = sprite.height * sprite.scale;
            const textY = sprite.y + (spriteHeight / 2) + 5;
            return {
                x: this.modalBg.width / 2,
                y: textY
            };
        };

        if (this.rewardConfig.type === RewardObtainedType.MONEY && this.rewardConfig.amount) {
            const textPos = getTextPosition();
            const amountText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                `${this.rewardConfig.amount}`,
                TextStyle.MONEY,
                {fontSize: '60px'}
            );
            amountText.setOrigin(0.5);
            this.uiContainer.add(amountText);
        } else if (this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID) {
            const textPos = getTextPosition();
            const nameText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                i18next.t("rewardObtainedUi:ui.rivalVoid", { name: this.rewardConfig.name }),
                TextStyle.MONEY,
                {fontSize: '50px'}
            );
            nameText.setOrigin(0.5);
            this.uiContainer.add(nameText);
        } else if (this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE && this.rewardConfig.gameMode) {
            const textPos = getTextPosition();
            const modeText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                this.getGameModeDescription(),
                TextStyle.MONEY,
                {fontSize: '50px'}
            );
            modeText.setOrigin(0.5);
            this.uiContainer.add(modeText);
        } else if (this.rewardConfig.type === RewardObtainedType.FORM) {
            const textPos = getTextPosition();
            let formName;
            
            if (this.rewardConfig.isGlitch) {
                formName = i18next.t(`glitchNames:${this.rewardConfig.name.toLowerCase()}.name`);
            } else if (this.rewardConfig.isMod) {
                formName = this.rewardConfig.name;
            } else {
                formName = i18next.t(`smittyNames:${this.rewardConfig.name.toLowerCase()}.name`);
            }
            
            const nameText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                formName,
                TextStyle.MONEY,
                {fontSize: '50px'}
            );
            nameText.setOrigin(0.5);
            this.uiContainer.add(nameText);
        } else {
            const textPos = getTextPosition();
            const nameText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                this.rewardConfig.name,
                TextStyle.MONEY,
                {fontSize: '50px'}
            );
            nameText.setOrigin(0.5);
            this.uiContainer.add(nameText);
        }
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
            i18next.t("rewardObtainedUi:ui.error"),
            TextStyle.WINDOW,
            {fontSize: '60px'}
        );
        errorText.setOrigin(0.5, 0.5);
        this.uiContainer.add(errorText);
        this.uiContainer.setAlpha(1);
    }

    protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {
        if (config.buttonActions?.[0]) {
            const originalAction = config.buttonActions[0];
            config.buttonActions[0] = () => {
                this.scene.ui.playSelect();
                this.clear();
                originalAction();
            };
        }
        return config;
    }

    processInput(button: Button): boolean {
        switch (button) {
            case Button.SUBMIT:
            case Button.ACTION:
            case Button.CANCEL:
                if (this.buttonActions?.[0]) {
                    this.buttonActions[0]();
                    return true;
                }
                break;
        }

        return false;
    }

    public updateContainer(config?: ModalConfig): void {
        super.updateContainer(config);

        this.buttonContainers.forEach((container, index) => {
            const buttonBg = this.buttonBgs[index];
            if (buttonBg) {
                buttonBg.setSize(buttonBg.width * 0.8, buttonBg.height * 0.9);

                container.setPosition(
                    container.x,
                    this.modalBg.height - (buttonBg.height - 6)
                );
            }
            const buttonLabel = container.list[1] as Phaser.GameObjects.Text;
            if (buttonLabel) {
                buttonLabel.setFontSize('50px');
            }
        });
    }

    clear(): void {
        if (this.uiContainer) {
            this.uiContainer.removeAll(true);
            this.uiContainer.destroy();
            this.uiContainer = null;
        }

        if (this.rewardSprite) {
            this.rewardSprite.destroy();
            this.rewardSprite = null;
        }

        if (this.rewardBG) {
            this.rewardBG.destroy();
            this.rewardBG = null;
        }

        if (this.modalBackground) {
            this.modalBackground.destroy();
            this.modalBackground = null;
        }

        this.textureLoaded = false;
        this.buttonActions = null;
        
        super.clear();
    }

    public getPokemonName(target: Species): string {
        if (!target) return "";

        const speciesName = Species[target]

        return speciesName.split('_')
            .map((word, index) => {
                return index === 0 ?
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() :
                    word.toLowerCase();
            })
            .join(' ');
    }
} 