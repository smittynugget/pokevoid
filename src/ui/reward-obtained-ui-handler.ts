import {ModalConfig, ModalUiHandler} from "./modal-ui-handler";
import { Mode } from "./ui";
import type BattleScene from "../battle-scene";
import {addTextObject, TextStyle} from "./text";
import {ModifierType, modifierTypes, AddPokeballModifierType, AddTypeBallModifierType} from "../modifier/modifier-type";
import { PokeballType } from "#enums/pokeball";
import { applyVoidBallRecolor, applyTypeBallRecolor } from "#app/data/pokeball";
import i18next from "i18next";
import {Species} from "#enums/species";
import {Button} from "#enums/buttons";
import { Device } from "#enums/devices";
import Pokemon from "#app/field/pokemon";
import { Unlockables } from "#app/system/unlockables";
import {QuestUnlockData} from "#app/system/game-data";
import {RivalTrainerType} from "#app/data/trainer-config";
import { trainerConfigs } from "../data/trainer-config";
import {GameModes} from "../game-mode";
import {getPokemonSpecies} from "#app/data/pokemon-species";
import { modStorage } from "../system/mod-storage";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { createSporadicPattern } from "#app/utils";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";

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
    SKILL_POINTS,
    SKILL_TREE_TOKENS,
    ESSENCE_BUNDLE,
    LEGENDARY_CATCHABLE,
}

export enum UnlockModePokeSpriteType {
    NORMAL = 1,
    GLITCH = 2,
    NORMAL_INVERTED = 3,
    GLITCH_INVERTED = 4,
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
    unlockableSpriteType?: UnlockModePokeSpriteType;
    isMaxStack?: boolean;
    customAtlas?: string;
    isInverted?: boolean;
    skillTreeRarity?: string;
    hideModalBackground?: boolean;
    cutsceneStyle?: boolean;
}

export default class RewardObtainedUiHandler extends ModalUiHandler {
    private static readonly CUTSCENE_TOOLTIP_ICON_SCALE_MULTIPLIER = 0.7;
    private static readonly USE_LEGACY_NON_CUTSCENE_STYLE = true;

    protected rewardConfig: RewardConfig;
    protected rewardSprite: Phaser.GameObjects.Sprite;
    protected rewardBG: Phaser.GameObjects.Sprite;
    protected uiContainer: Phaser.GameObjects.Container;
    protected textureLoaded: boolean = false;
    private modalBackground: Phaser.GameObjects.GameObject;
    private buttonActions: (() => void)[];
    private overlayPatternContainer: Phaser.GameObjects.Container | null = null;
    private prevPermaBarVisible: boolean | null = null;
    private prevPlayerBarVisible: boolean | null = null;
    private prevEnemyBarVisible: boolean | null = null;
    private baseTitleFontSize: number | null = null;
    private baseTitleY: number | null = null;
    private _tooltipPattern: ModalBackgroundHandle | null = null;

    private isTooltipStyle(): boolean {
        return !!this.rewardConfig?.cutsceneStyle || !RewardObtainedUiHandler.USE_LEGACY_NON_CUTSCENE_STYLE;
    }

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
                return this.rewardConfig.isMaxStack
                    ? i18next.t("rewardObtainedUi:titles.maxStackMoney")
                    : i18next.t("rewardObtainedUi:titles.moneyObtained");
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
            case RewardObtainedType.SKILL_POINTS:
                return i18next.t("rewardObtainedUi:titles.skillPoints");
            case RewardObtainedType.SKILL_TREE_TOKENS:
                return i18next.t("rewardObtainedUi:titles.skillTreeTokens");
            case RewardObtainedType.LEGENDARY_CATCHABLE:
                return i18next.t("rewardObtainedUi:titles.legendaryPower");
            default:
                return i18next.t("rewardObtainedUi:titles.rewardObtained");
        }
    }

    getWidth(): number {
        if (!this.isTooltipStyle()) {
            return 120;
        }
        const baseWidth = (625 / 6) * 0.6;
        const subtitle = this.normalizeCutsceneTooltipSubtitle(this.getCutsceneTooltipSubtitle());
        if (!subtitle) {
            return baseWidth;
        }
        const testText = addTextObject(this.scene, 0, 0, subtitle, TextStyle.WINDOW, { fontSize: "35px" });
        const padding = 6;
        const scaledSubtitleWidth = testText.displayWidth + (padding * 2);
        testText.destroy();
        return Math.max(baseWidth, scaledSubtitleWidth);
    }

    getHeight(): number {
        return this.isTooltipStyle() ? ((540 / 6) * 0.6) : 105;
    }

    getMargin(): [number, number, number, number] {
        return this.isTooltipStyle() ? [0, 0, 8, 0] : [0, 0, 16, 0];
    }

    getButtonLabels(): string[] {
        return [];
    }

    protected createModalBackground(): void {
        if (this.isTooltipStyle()) {
            this.clearModalBackgrounds();
            return;
        }
        super.createModalBackground();
    }

    protected async loadTexture(): Promise<void> {
        if (!this.needsSprite()) {
            this.textureLoaded = true;
            return;
        }

        if (this.rewardConfig.modifierType) {
            return this.loadModifierTexture();
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

        if (this.rewardConfig.type === RewardObtainedType.LEGENDARY_CATCHABLE && this.rewardConfig.questSpriteId) {
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
            this.rewardConfig.type === RewardObtainedType.LEGENDARY_CATCHABLE ||
            this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID ||
            this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE ||
            this.rewardConfig.type === RewardObtainedType.SKILL_POINTS ||
            this.rewardConfig.type === RewardObtainedType.SKILL_TREE_TOKENS);
    }

    private async loadPokemonTexture(): Promise<void> {
        const pokemon = this.rewardConfig.pokemon;
        if (!pokemon) return;

        try {
            await pokemon.loadAssets(this.scene);
            this.textureLoaded = true;
        } catch (error) {
            throw error;
        }
    }

    private async loadItemTexture(): Promise<void> {
        if (!this.scene.textures.exists('items')) {
            return new Promise((resolve, reject) => {
                this.scene.loadAtlas('items', '');

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

    private async loadModifierTexture(): Promise<void> {
        const mt = this.rewardConfig.modifierType;
        if (!mt) {
            this.textureLoaded = true;
            return;
        }

        if (mt.group === "trainer") {
            this.textureLoaded = true;
            return;
        }

        const atlasKey = mt.group === "glitch" || mt.group === "perma" ? "smitems" : "items";
        if (this.scene.textures.exists(atlasKey)) {
            this.textureLoaded = true;
            return;
        }

        const folder = atlasKey === "smitems" ? "smitems" : "";
        return new Promise((resolve, reject) => {
            this.scene.loadAtlas(atlasKey, folder);

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
            spriteKey = `pkmn__glitch__${pokeName.toLowerCase()}`;

            if (this.scene.textures.exists(spriteKey)) {
                this.textureLoaded = true;
                return;
            }

            try {
                const modId = `${this.rewardConfig.pokemon?.speciesId || ''}_${pokeName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const storedMod = await modStorage.getMod(modId);

                if (storedMod && storedMod.spriteData) {

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
                    imagePath = `images/pokemon/glitch/missingno.png`;
                }
            } catch (error) {
                console.error(`Error loading mod ${pokeName} from storage:`, error);
                imagePath = `images/pokemon/glitch/missingno.png`;
            }
        } else {
            const spriteType = this.rewardConfig.unlockableSpriteType || UnlockModePokeSpriteType.GLITCH;

            switch (spriteType) {
                case UnlockModePokeSpriteType.NORMAL:
                case UnlockModePokeSpriteType.NORMAL_INVERTED:
                    spriteKey = `pkmn__${pokeName}`;
                    imagePath = `images/pokemon/${pokeName}.png`;
                    break;
                case UnlockModePokeSpriteType.GLITCH:
                case UnlockModePokeSpriteType.GLITCH_INVERTED:
                default:
                    spriteKey = `pkmn__glitch__${pokeName}`;
                    imagePath = `images/pokemon/glitch/${pokeName}.png`;
                    break;
            }

            if (this.scene.textures.exists(spriteKey)) {
                this.textureLoaded = true;
                return;
            }
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
                this.rewardBG = this.scene.add.sprite(this.modalBg.width / 2, this.modalBg.height / 2, "smitems", "quest");
                this.rewardBG.setScale(0.6);
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
        if (!this.uiContainer) return;

        try {
            if (this.rewardSprite) {
                this.rewardSprite.destroy();
                this.rewardSprite = null;
            }

            if (this.rewardConfig.type === RewardObtainedType.SKILL_POINTS) {
                const position = this.getSpritePosition();
                this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'items');
                this.rewardSprite.setFrame('ribbon_gen9');
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
            } else if (this.rewardConfig.type === RewardObtainedType.SKILL_TREE_TOKENS) {
                const position = this.getSpritePosition();
                this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'smitems');
                this.rewardSprite.setFrame('permaMoreRevive');
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
            } else if (this.rewardConfig.type === RewardObtainedType.ESSENCE_BUNDLE) {
                const position = this.getSpritePosition();
                this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'smitems');
                this.rewardSprite.setFrame('modSoulCollected');

                if (this.rewardConfig.isInverted) {
                    this.applyInversionEffect();
                }
            } else if (this.rewardConfig.pokemon) {
                this.setupPokemonSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.QUEST_UNLOCK && this.rewardConfig.questSpriteId) {
                this.setupQuestSprite();
            } else if (this.rewardConfig.type === RewardObtainedType.LEGENDARY_CATCHABLE && this.rewardConfig.questSpriteId) {
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
                this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
            }
        } catch (error) {
            throw error;
        }
    }

    private applyInversionEffect(): void {
        if (!this.rewardSprite) return;

        try {
            if (this.rewardSprite.postFX && typeof this.rewardSprite.postFX.addColorMatrix === 'function') {
                const colorMatrix = this.rewardSprite.postFX.addColorMatrix();
                colorMatrix.negative();
            } else {
                this.rewardSprite.setTint(0xFF00FF);
                this.rewardSprite.setBlendMode(Phaser.BlendModes.SCREEN);
            }
        } catch (error) {
            this.rewardSprite.setTint(0xFF00FF);
            this.rewardSprite.setBlendMode(Phaser.BlendModes.NORMAL);
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
        else if(this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE && this.rewardConfig.gameMode === GameModes.DRAFT) {
            let draftScale = 0.3;
            return draftScale;
        }
        else if(this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID) {
            let rivalScale = 0.8;
            return rivalScale;
        }

        const targetSize = Math.min(width, height) * scaleBy;

        let scale = targetSize / Math.max(spriteWidth, spriteHeight);
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
        if (this.rewardConfig.modifierType.group === "trainer") {
            this.rewardSprite = this.scene.add.sprite(position.x, position.y, this.rewardConfig.modifierType.iconImage);

            this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
        } else {

            let itemAtlas = this.rewardConfig.modifierType.group === "glitch" || this.rewardConfig.modifierType.group === "perma" ? "smitems" : "items"
            this.rewardSprite = this.scene.add.sprite(position.x, position.y, itemAtlas);
            const targetFrame = this.rewardConfig.isLevelUp ? this.rewardConfig.sprite : this.rewardConfig.modifierType.iconImage;
            this.rewardSprite.setFrame(targetFrame);
            if (this.rewardSprite.frame && this.rewardSprite.frame.name !== targetFrame && targetFrame) {
              this.rewardSprite.setFrame("pb");
            }
            this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
        }

        if (this.rewardConfig.modifierType instanceof AddPokeballModifierType
            && this.rewardConfig.modifierType.pokeballType === PokeballType.VOID_BALL
            && this.rewardSprite) {
            try {
                applyVoidBallRecolor(this.scene as BattleScene, this.rewardSprite, true);
                this.rewardSprite.setAlpha(0.85);
            } catch (e) { }
        }

        if (this.rewardConfig.modifierType instanceof AddTypeBallModifierType
            && this.rewardSprite) {
            try {
                applyTypeBallRecolor(this.scene as BattleScene, this.rewardSprite, this.rewardConfig.modifierType.targetType, true);
            } catch (e) { }
        }

        if (this.rewardConfig.isInverted) {
            this.applyInversionEffect();
        }
    }

    private setupMoneySprite(): void {
        const position = this.getSpritePosition();
        this.rewardSprite = this.scene.add.sprite(position.x, position.y, 'smitems');
        this.rewardSprite.setFrame("battleMoney");
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));
    }

    private setupUnlockSprite(): void {
        const position = this.getSpritePosition();
        const atlas = this.rewardConfig.customAtlas || 'items';
        this.rewardSprite = this.scene.add.sprite(position.x, position.y, atlas);
        if (this.rewardConfig.sprite) {
            this.rewardSprite.setFrame(this.rewardConfig.sprite);
        } else if (atlas === "items" || atlas === "smitems") {
            this.rewardSprite.setFrame(1);
        }
        if ((this.rewardSprite.texture?.frameTotal || 0) > 1) {
            const key = atlas;
            if ((this.scene as any).anims?.exists?.(key)) {
                this.rewardSprite.play({ key, repeat: -1, frameRate: 24 });
            }
        }
        this.rewardSprite.setScale(this.calculateSpriteScale(this.rewardSprite));

        if (this.rewardConfig.isInverted) {
            this.applyInversionEffect();
        }
    }

    private setupFormSprite(): void {
        const pokeName = this.rewardConfig.isModeUnlock ? this.rewardConfig.sprite : this.rewardConfig.name;
        let spriteKey;

        const spriteType = this.rewardConfig.unlockableSpriteType || UnlockModePokeSpriteType.GLITCH;

        if (this.rewardConfig.isMod) {
            spriteKey = `pkmn__glitch__${pokeName.toLowerCase()}`;
        } else {
            switch (spriteType) {
                case UnlockModePokeSpriteType.NORMAL:
                case UnlockModePokeSpriteType.NORMAL_INVERTED:
                    spriteKey = `pkmn__${pokeName}`;
                    break;
                case UnlockModePokeSpriteType.GLITCH:
                case UnlockModePokeSpriteType.GLITCH_INVERTED:
                default:
                    spriteKey = `pkmn__glitch__${pokeName}`;
                    break;
            }
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

        if (spriteType === UnlockModePokeSpriteType.NORMAL_INVERTED ||
            spriteType === UnlockModePokeSpriteType.GLITCH_INVERTED) {
            try {
                if (this.rewardSprite.postFX && typeof this.rewardSprite.postFX.addColorMatrix === 'function') {
                    const colorMatrix = this.rewardSprite.postFX.addColorMatrix();
                    colorMatrix.negative();
                } else {
                    this.rewardSprite.setTint(0xFF00FF);
                    this.rewardSprite.setBlendMode(Phaser.BlendModes.SCREEN);
                }
            } catch (error) {
                this.rewardSprite.setTint(0xFF00FF);
                this.rewardSprite.setBlendMode(Phaser.BlendModes.NORMAL);
            }
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
                'smitems',
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

            if (this.rewardConfig?.cutsceneStyle) {
                this.scene.playSound("battle_anims/PRSFX- Oblivion Wing2");
            }

            if (super.show(args)) {
                const config = args[0] as ModalConfig;
                this.buttonActions = (config.buttonActions as unknown as Array<() => void>) || [];

                if (this.isTooltipStyle()) {
                    const uiAny: any = (this.scene as any).ui;
                    const perma = uiAny?.permaModifierBar;
                    this.prevPermaBarVisible = typeof perma?.visible === "boolean" ? perma.visible : null;
                    perma?.setVisible(false);

                    const bs: any = this.scene as any;
                    const playerBar = bs?.getModifierBar?.(false);
                    const enemyBar = bs?.getModifierBar?.(true);
                    this.prevPlayerBarVisible = typeof playerBar?.visible === "boolean" ? playerBar.visible : null;
                    this.prevEnemyBarVisible = typeof enemyBar?.visible === "boolean" ? enemyBar.visible : null;
                    playerBar?.setVisible(false);
                    enemyBar?.setVisible(false);
                }

                this.uiContainer = this.scene.add.container(0, 0);
                this.modalContainer.add(this.uiContainer);
                this.uiContainer.setAlpha(0);

                this.loadTexture()
                    .then(() => {
                        if (!this.active || !this.uiContainer) return;
                        this.setupSprite();
                        this.setupUI();
                        this.fadeInUI();
                    })
                    .catch(error => {
                        this.handleUIError();
                    });

                return true;
            }
        }
        return false;
    }

    protected setupUI(): void {
        if (!this.uiContainer || !this.modalContainer) return;
        const tooltipStyle = this.isTooltipStyle();
        if (tooltipStyle) {
            this.setupCutsceneTooltipStyle();
            return;
        }

        const cutsceneStyle = !!this.rewardConfig?.cutsceneStyle;
        const priorToGameover = this.scene.currentBattle ? this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex) : false;

        let w: number;
        let h: number;
        let bgX: number;
        let bgY: number;

        w = this.scene.game.canvas.width / 6;
        h = this.scene.game.canvas.height / 6;
        bgX = -this.modalContainer.x;
        bgY = -h - this.modalContainer.y;

        const hideModalBackground = !!this.rewardConfig.hideModalBackground;
        const isPurple = this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE;
        const isBlack = !hideModalBackground && (priorToGameover || this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID);

        if (isBlack) {
            this.modalBackground = this.scene.add.rectangle(bgX, bgY, w, h, 0x000000, 1.0);
            (this.modalBackground as any).setOrigin?.(0, 0);
        } else {
            const bgImage = this.scene.add.image(bgX, bgY, "modal_bg");
            bgImage.setOrigin(0, 0);
            bgImage.setDisplaySize(w, h);
            bgImage.setAlpha(hideModalBackground ? 0 : (0.65 * this.scene.gameData.rewardOverlayOpacity));

            if (isPurple) {
                try {
                    if (bgImage.postFX && typeof bgImage.postFX.addColorMatrix === 'function') {
                        const colorMatrix = bgImage.postFX.addColorMatrix();
                        colorMatrix.negative();
                    } else {
                        bgImage.setTint(0xFFFFFF);
                        bgImage.setBlendMode(Phaser.BlendModes.DIFFERENCE);
                    }
                } catch (error) {
                    bgImage.setTint(0x000000);
                    bgImage.setBlendMode(Phaser.BlendModes.SCREEN);
                }
            }

            this.modalBackground = bgImage as any;
        }
        this.modalContainer.addAt(this.modalBackground, 0);

        if (this.overlayPatternContainer) {
            this.overlayPatternContainer.removeAll(true);
            this.overlayPatternContainer.destroy();
            this.overlayPatternContainer = null;
        }
        this.overlayPatternContainer = this.scene.add.container(bgX, bgY);
        createSporadicPattern(this.scene, this.overlayPatternContainer, { width: w, height: h, iconAlpha: 0.25 });
        this.modalContainer.addAt(this.overlayPatternContainer, 1);

        const getTextPosition = () => {
            const sprite = this.rewardBG ? this.rewardBG : this.rewardSprite;
            const spriteHeight = sprite.height * sprite.scale;
            const textY = sprite.y + (spriteHeight / 2) + 5;
            return {
                x: this.modalBg.width / 2,
                y: textY
            };
        };

        const bodyFontSize = cutsceneStyle ? '45px' : '50px';
        const amountFontSize = cutsceneStyle ? '55px' : '60px';

        if (this.rewardConfig.type === RewardObtainedType.MONEY && this.rewardConfig.amount) {
            const textPos = getTextPosition();
            const amountText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                `${this.rewardConfig.amount}`,
                TextStyle.MONEY,
                { fontSize: amountFontSize }
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
                { fontSize: bodyFontSize }
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
                { fontSize: bodyFontSize }
            );
            modeText.setOrigin(0.5);
            this.uiContainer.add(modeText);
        } else if (this.rewardConfig.type === RewardObtainedType.SKILL_POINTS && this.rewardConfig.amount) {
            const textPos = getTextPosition();
            const spText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                i18next.t('skillTree:rewards.skillPoints', { amount: this.rewardConfig.amount }),
                TextStyle.MONEY,
                { fontSize: bodyFontSize }
            );
            spText.setOrigin(0.5);
            this.uiContainer.add(spText);
        } else if (this.rewardConfig.type === RewardObtainedType.SKILL_TREE_TOKENS && this.rewardConfig.amount) {
            const textPos = getTextPosition();
            const tkText = addTextObject(
                this.scene,
                textPos.x,
                textPos.y,
                i18next.t('skillTree:rewards.tokens', { amount: this.rewardConfig.amount }),
                TextStyle.MONEY,
                { fontSize: bodyFontSize }
            );
            tkText.setOrigin(0.5);
            this.uiContainer.add(tkText);
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
                { fontSize: bodyFontSize }
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
                { fontSize: bodyFontSize }
            );
            nameText.setOrigin(0.5);
            this.uiContainer.add(nameText);
        }

        try {
            const padding = 6;
            const buttonRowH = 10;
            const confirmRow = this.createCutsceneConfirmRow(this.modalBg.width, this.modalBg.height, padding, buttonRowH);
            confirmRow.y -= 3;
            this.uiContainer.add(confirmRow);
        } catch {
        }
    }

    private setupCutsceneTooltipStyle(): void {
        if (!this.uiContainer) return;

        const tooltipWidth = this.modalBg.width;
        const tooltipHeight = this.modalBg.height;

        const padding = 6;
        const titleBarH = 12;
        const rarityBarH = 6;
        const buttonRowH = 10;
        const barsH = titleBarH + rarityBarH;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 1.0);
        bg.fillRect(0, 0, tooltipWidth, tooltipHeight);
        bg.lineStyle(0.5, 0xffffff, 0.5);
        bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 0);

        const titleBar = this.scene.add.graphics();
        titleBar.fillStyle(0x111111, 0.9);
        titleBar.fillRect(0, 0, tooltipWidth, titleBarH);

        const rarityBar = this.scene.add.graphics();
        rarityBar.fillStyle(0x4d0000, 0.6);
        rarityBar.fillRect(0, titleBarH, tooltipWidth, rarityBarH);

        const titleText = addTextObject(
            this.scene,
            tooltipWidth / 2,
            titleBarH / 2,
            this.getModalTitle(),
            TextStyle.WINDOW,
            { fontSize: "40px", fontStyle: "bold" }
        );
        titleText.setOrigin(0.5, 0.5);

        const subtitleString = this.normalizeCutsceneTooltipSubtitle(this.getCutsceneTooltipSubtitle());
        const subtitleText = addTextObject(
            this.scene,
            tooltipWidth / 2,
            titleBarH + (rarityBarH / 2),
            subtitleString,
            TextStyle.WINDOW,
            { fontSize: "35px", align: "center" }
        );
        subtitleText.setOrigin(0.5, 0.5);
        subtitleText.setTint(0xffffff);
        subtitleText.setVisible(!!subtitleString);

        const bodyX = padding;
        const bodyY = barsH + padding;
        const bodyW = Math.max(0, tooltipWidth - (padding * 2));
        const bodyH = Math.max(0, tooltipHeight - bodyY - (padding * 2) - buttonRowH);

        const confirmRow = this.createCutsceneConfirmRow(tooltipWidth, tooltipHeight, padding, buttonRowH);

        this.uiContainer.addAt(bg, 0);
        this.uiContainer.addAt(titleBar, 1);
        this.uiContainer.addAt(rarityBar, 2);
        this.uiContainer.add(titleText);
        this.uiContainer.add(subtitleText);
        this.uiContainer.add(confirmRow);

        const cx = bodyX + (bodyW / 2);
        const cy = bodyY + (bodyH / 2);
        const iconYOffset = 3;

        if (this.rewardBG) {
            this.rewardBG.setPosition(cx, cy + iconYOffset);
            this.fitSpriteToBox(this.rewardBG, bodyW, bodyH);
        }
        if (this.rewardSprite) {
            this.rewardSprite.setPosition(cx, cy + iconYOffset);
            this.fitSpriteToBox(this.rewardSprite, bodyW, bodyH);
        }
    }

    private setupNonCutsceneTooltipStyleV2(): void {
        if (!this.uiContainer) return;

        const tooltipWidth = this.modalBg.width;
        const tooltipHeight = this.modalBg.height;

        const padding = 6;
        const titleBarH = 12;
        const subtitleBarH = 6;
        const buttonRowH = 10;
        const barsH = titleBarH + subtitleBarH;
        const hideModalBackground = !!this.rewardConfig.hideModalBackground;
        const overlayAlpha = hideModalBackground ? 0 : (this.scene.gameData.rewardOverlayOpacity ?? 1);

        const w = this.scene.game.canvas.width / 6;
        const h = this.scene.game.canvas.height / 6;
        const bgX = -this.modalContainer.x;
        const bgY = -h - this.modalContainer.y;

        const fullscreenBg = this.scene.add.image(bgX, bgY, "starter_container_bg");
        fullscreenBg.setOrigin(0, 0);
        fullscreenBg.setDisplaySize(w, h);
        fullscreenBg.setAlpha(overlayAlpha * 0.65);
        this.modalContainer.addAt(fullscreenBg, 0);
        this.modalBackground = fullscreenBg;

        if (this.overlayPatternContainer) {
            this.overlayPatternContainer.removeAll(true);
            this.overlayPatternContainer.destroy();
            this.overlayPatternContainer = null;
        }
        this.overlayPatternContainer = this.scene.add.container(bgX, bgY);
        createSporadicPattern(this.scene, this.overlayPatternContainer, { width: w, height: h, iconAlpha: 0.25 });
        this.overlayPatternContainer.setAlpha(overlayAlpha);
        this.modalContainer.addAt(this.overlayPatternContainer, 1);

        const bg = this.scene.add.graphics();
        this.drawTooltipGradientBackground(bg, 0, 0, tooltipWidth, tooltipHeight);
        bg.lineStyle(0.5, 0xffffff, 0.5);
        bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 0);
        bg.setAlpha(overlayAlpha);

        if (this._tooltipPattern) {
            this._tooltipPattern.clear();
            this._tooltipPattern = null;
        }
        this._tooltipPattern = attachModalBackground(
            this.scene,
            this.uiContainer,
            () => ({ bgX: 0, bgY: 0, bgWidth: tooltipWidth, bgHeight: tooltipHeight }),
            { mask: false, alphaMultiplier: overlayAlpha }
        );

        const borderGold = 0xFFD700;
        const bgGold = 0x4D3F00;

        const titleBar = this.scene.add.graphics();
        titleBar.fillStyle(borderGold, 0.65);
        titleBar.fillRect(0, 0, tooltipWidth, titleBarH);
        titleBar.setAlpha(overlayAlpha);

        const subtitleBar = this.scene.add.graphics();
        subtitleBar.fillStyle(bgGold, 0.7);
        subtitleBar.fillRect(0, titleBarH, tooltipWidth, subtitleBarH);
        subtitleBar.setAlpha(overlayAlpha);

        const titleText = addTextObject(
            this.scene,
            tooltipWidth / 2,
            titleBarH / 2,
            this.getModalTitle(),
            TextStyle.SUMMARY_GOLD,
            { fontSize: "45px", fontStyle: "bold" }
        );
        titleText.setOrigin(0.5, 0.5);
        titleText.setTint(0xffffff);

        const subtitleString = this.normalizeCutsceneTooltipSubtitle(this.getCutsceneTooltipSubtitle());
        const subtitleText = addTextObject(
            this.scene,
            tooltipWidth / 2,
            titleBarH + (subtitleBarH / 2),
            subtitleString,
            TextStyle.WINDOW,
            { fontSize: "40px", align: "center" }
        );
        subtitleText.setOrigin(0.5, 0.5);
        subtitleText.setTint(borderGold);
        subtitleText.setVisible(!!subtitleString);
        this.ellipsisTextToWidth(subtitleText, Math.max(0, tooltipWidth - (padding * 2)));

        const bodyX = padding;
        const bodyY = barsH + padding;
        const bodyW = Math.max(0, tooltipWidth - (padding * 2));
        const bodyH = Math.max(0, tooltipHeight - bodyY - (padding * 2) - buttonRowH);

        const confirmRow = this.createCutsceneConfirmRow(tooltipWidth, tooltipHeight, padding, buttonRowH);

        this.uiContainer.addAt(bg, 0);
        this.uiContainer.addAt(titleBar, 1);
        this.uiContainer.addAt(subtitleBar, 2);
        this.uiContainer.add(titleText);
        this.uiContainer.add(subtitleText);
        this.uiContainer.add(confirmRow);

        const cx = bodyX + (bodyW / 2);
        const cy = bodyY + (bodyH / 2);

        if (this.rewardBG) {
            this.rewardBG.setPosition(cx, cy);
            this.fitSpriteToBox(this.rewardBG, bodyW, bodyH);
        }
        if (this.rewardSprite) {
            this.rewardSprite.setPosition(cx, cy);
            this.fitSpriteToBox(this.rewardSprite, bodyW, bodyH);
        }
    }

    private ellipsisTextToWidth(text: Phaser.GameObjects.Text, maxWidth: number): void {
        const original = text.text ?? "";
        if (!original) return;
        if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;
        if (text.displayWidth <= maxWidth) return;

        const ellipsis = "…";
        let low = 0;
        let high = original.length;
        let best = "";

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = `${original.slice(0, mid)}${ellipsis}`;
            text.setText(candidate);
            if (text.displayWidth <= maxWidth) {
                best = candidate;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (best) {
            text.setText(best);
        } else {
            text.setText(ellipsis);
        }
    }

    private normalizeCutsceneTooltipSubtitle(text: string): string {
        const raw = String(text ?? "");
        return raw.replace(/\s+/g, " ").trim();
    }

    private getCutsceneTooltipSubtitle(): string {
        if (this.rewardConfig.type === RewardObtainedType.MONEY && this.rewardConfig.amount) {
            return `${this.rewardConfig.amount}`;
        }
        if (this.rewardConfig.type === RewardObtainedType.RIVAL_TO_VOID) {
            return i18next.t("rewardObtainedUi:ui.rivalVoid", { name: this.rewardConfig.name });
        }
        if (this.rewardConfig.type === RewardObtainedType.NIGHTMARE_MODE_CHANGE && this.rewardConfig.gameMode) {
            return this.getGameModeDescription();
        }
        if (this.rewardConfig.type === RewardObtainedType.SKILL_POINTS && this.rewardConfig.amount) {
            return i18next.t("skillTree:rewards.skillPoints", { amount: this.rewardConfig.amount });
        }
        if (this.rewardConfig.type === RewardObtainedType.SKILL_TREE_TOKENS && this.rewardConfig.amount) {
            return i18next.t("skillTree:rewards.tokens", { amount: this.rewardConfig.amount });
        }
        if (this.rewardConfig.type === RewardObtainedType.FORM) {
            if (this.rewardConfig.isGlitch) {
                return i18next.t(`glitchNames:${this.rewardConfig.name.toLowerCase()}.name`);
            }
            if (this.rewardConfig.isMod) {
                return this.rewardConfig.name;
            }
            return i18next.t(`smittyNames:${this.rewardConfig.name.toLowerCase()}.name`);
        }
        return this.rewardConfig.name || "";
    }

    private getSubmitIconInfo(): { gamepadType: string; iconPath: string; scale: number } {
        const controller = this.scene.inputController;
        let gamepadType = "keyboard";
        if (this.scene.inputMethod === "gamepad") {
            gamepadType = controller?.getConfig(controller.selectedDevice[Device.GAMEPAD])?.padType || "keyboard";
        } else if (this.scene.inputMethod === "touch") {
            gamepadType = "keyboard";
        } else {
            gamepadType = this.scene.inputMethod || "keyboard";
        }
        const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
        let iconPath = controller?.getIconForLatestInputRecorded("BUTTON_SUBMIT") || "";
        if (!iconPath) {
            iconPath = isGamepad ? "A.png" : "ENTER.png";
        }
        return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
    }

    private createCutsceneConfirmRow(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowH: number): Phaser.GameObjects.Container {
        const { gamepadType, iconPath, scale } = this.getSubmitIconInfo();
        const y = tooltipHeight - padding - (buttonRowH / 2) + (30 / 6);
        const container = this.scene.add.container(tooltipWidth / 2, y);

        const keySprite = this.scene.add.sprite(0, 0, gamepadType);
        keySprite.setFrame(iconPath);
        keySprite.setScale(scale);
        keySprite.setOrigin(0.5, 0.5);

        const label = addTextObject(this.scene, 0, 0, i18next.t("menu:confirm"), TextStyle.WINDOW, { fontSize: "35px" });
        label.setOrigin(0, 0.5);

        const gap = 4;
        const pw = keySprite.displayWidth;
        const tw = label.displayWidth;
        const startX = -((pw + gap + tw) / 2);
        keySprite.setPosition(startX + (pw / 2), 0);
        label.setPosition(startX + pw + gap, 0);

        container.add([keySprite, label]);
        container.setInteractive(new Phaser.Geom.Rectangle(-tooltipWidth / 2, -buttonRowH / 2, tooltipWidth, buttonRowH), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
            if (this.buttonActions?.[0]) {
                this.buttonActions[0]();
            }
        });
        return container;
    }

    private fitSpriteToBox(sprite: Phaser.GameObjects.Sprite, boxW: number, boxH: number): void {
        const maxDim = Math.max(sprite.width || 0, sprite.height || 0);
        if (!Number.isFinite(maxDim) || maxDim <= 0) {
            return;
        }
        const baseScale = this.calculateSpriteScale(sprite);
        let scale = baseScale;
        if (this.rewardConfig.cutsceneStyle) {
            scale = baseScale * RewardObtainedUiHandler.CUTSCENE_TOOLTIP_ICON_SCALE_MULTIPLIER;
        }
        sprite.setScale(scale);
    }

    private drawTooltipGradientBackground(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
        const topColor = { r: 34, g: 0, b: 68 };
        const bottomColor = { r: 0, g: 0, b: 0 };
        const gradientSteps = 48;
        for (let step = 0; step < gradientSteps; step++) {
            const stepY = y + (step / gradientSteps) * height;
            const stepHeight = height / gradientSteps;
            const rawFactor = step / (gradientSteps - 1);
            const factor = Math.pow(rawFactor, 2.5);
            const r = Math.floor(topColor.r * (1 - factor) + bottomColor.r * factor);
            const g = Math.floor(topColor.g * (1 - factor) + bottomColor.g * factor);
            const b = Math.floor(topColor.b * (1 - factor) + bottomColor.b * factor);
            const color = (r << 16) | (g << 8) | b;
            const remainingHeight = (y + height) - stepY;
            if (remainingHeight <= 0) continue;
            graphics.fillStyle(color, 0.98);
            graphics.fillRect(x, stepY, width, Math.min(stepHeight, remainingHeight));
        }
    }

    protected fadeInUI(): void {
        if (this.rewardConfig?.cutsceneStyle) {
            if (this.rewardConfig.type === RewardObtainedType.UNLOCK && this.rewardSprite) {
                this.rewardSprite.setAlpha(0);
            }
            this.uiContainer.setAlpha(1);
            if (this.rewardConfig.type === RewardObtainedType.UNLOCK && this.rewardSprite) {
                this.scene.tweens.add({
                    targets: this.rewardSprite,
                    alpha: 1,
                    duration: 10000,
                    ease: 'Power2',
                    delay: 5000
                });
            }
            return;
        }
        this.scene.tweens.add({
            targets: this.uiContainer,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    protected handleUIError(): void {
        if (!this.uiContainer) return;
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

        const cutsceneStyle = !!this.rewardConfig?.cutsceneStyle;
        const tooltipStyle = this.isTooltipStyle();
        this.modalBg.setAlpha(tooltipStyle ? 0 : 1);
        this.titleText.setVisible(!tooltipStyle);
        this.buttonContainers.forEach(container => container.setVisible(!tooltipStyle));
        if (this.baseTitleFontSize === null) {
            const anyStyle: any = (this.titleText as any)?.style;
            const raw = typeof anyStyle?.fontSize === "number" ? anyStyle.fontSize : parseInt(`${anyStyle?.fontSize ?? ""}`, 10);
            this.baseTitleFontSize = Number.isFinite(raw) ? raw : null;
        }
        if (this.baseTitleY === null) {
            this.baseTitleY = this.titleText?.y ?? null;
        }

        if (cutsceneStyle) {
            if (this.baseTitleFontSize !== null) {
                this.titleText.setFontSize(`${Math.max(1, this.baseTitleFontSize - 5)}px`);
            }
            if (this.baseTitleY !== null) {
                this.titleText.setY(this.baseTitleY - 2);
            }
        } else {
            if (this.baseTitleFontSize !== null) {
                this.titleText.setFontSize(`${this.baseTitleFontSize}px`);
            }
            if (this.baseTitleY !== null) {
                this.titleText.setY(this.baseTitleY);
            }
        }

        this.buttonContainers.forEach((container, index) => {
            const buttonBg = this.buttonBgs[index];
            if (buttonBg) {
                const w = Math.max(0, buttonBg.width * 0.8 - (cutsceneStyle ? 5 : 0));
                const h = Math.max(0, buttonBg.height * 0.9 - (cutsceneStyle ? 5 : 0));
                buttonBg.setSize(w, h);

                container.setPosition(
                    container.x,
                    this.modalBg.height - (buttonBg.height - 6)
                );
            }
            const buttonLabel = container.list[1] as Phaser.GameObjects.Text;
            if (buttonLabel) {
                buttonLabel.setFontSize(cutsceneStyle ? '45px' : '50px');
            }
        });
    }

    clear(): void {
        if (this.isTooltipStyle()) {
            const uiAny: any = (this.scene as any).ui;
            const perma = uiAny?.permaModifierBar;
            if (perma && this.prevPermaBarVisible !== null) {
                perma.setVisible(this.prevPermaBarVisible);
            }
            const bs: any = this.scene as any;
            const playerBar = bs?.getModifierBar?.(false);
            const enemyBar = bs?.getModifierBar?.(true);
            if (playerBar && this.prevPlayerBarVisible !== null) {
                playerBar.setVisible(this.prevPlayerBarVisible);
            }
            if (enemyBar && this.prevEnemyBarVisible !== null) {
                enemyBar.setVisible(this.prevEnemyBarVisible);
            }
            this.prevPermaBarVisible = null;
            this.prevPlayerBarVisible = null;
            this.prevEnemyBarVisible = null;
        }

        if (this._tooltipPattern) {
            this._tooltipPattern.clear();
            this._tooltipPattern = null;
        }

        if (this.overlayPatternContainer) {
            this.overlayPatternContainer.removeAll(true);
            this.overlayPatternContainer.destroy();
            this.overlayPatternContainer = null;
        }

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