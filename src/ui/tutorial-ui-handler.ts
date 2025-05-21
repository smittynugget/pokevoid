import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { Mode } from "./ui";
import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
import i18next from "i18next";
import { Button } from "../enums/buttons";
import { OptionSelectConfig, OptionSelectItem } from "./abstact-option-select-ui-handler";
import { TutorialService } from "./tutorial-service";
import { TutorialRegistry, EnhancedTutorial } from "./tutorial-registry";
import { Tutorial } from "../tutorial";
import { getPokemonSpecies } from "../data/pokemon-species";
import { Species } from "../enums/species";

export interface TutorialConfig {
    title: string;
    stages: TutorialStage[];
    onComplete?: () => void;
    isTipActive?: boolean;
    isFromMenu?: boolean; 
}

export interface TutorialStage {
    sprites: TutorialSprite[];
    text: string;
    title?: string;
}

export interface TutorialSprite {
    key: string;
    frame?: string | number;
    scale?: number;
    x?: number;
    y?: number;
    alpha?: number;
    animation?: string;
    spriteType?: 'pokemon' | 'icon' | 'glitch' | 'smitty_logo' | 'item' | 'egg' | 'save';
    speciesId?: number;
    glitchFormName?: string;
    smittyLogoId?: number;
    shiny?: boolean;
    variant?: number;
    itemId?: string;
    eggStage?: number;
    flipX?: boolean;
}

export default class TutorialUiHandler extends ModalUiHandler {
    protected uiContainer: Phaser.GameObjects.Container;
    protected tutorialConfig: TutorialConfig;
    protected currentStageIndex: number;
    protected stageNavigationContainer: Phaser.GameObjects.Container;
    protected textContainer: Phaser.GameObjects.Container;
    protected spritesContainer: Phaser.GameObjects.Container;
    protected textDisplay: Phaser.GameObjects.Text;
    protected sprites: Phaser.GameObjects.Sprite[] = [];
    protected buttonIndex: number = 0;
    protected texturesLoaded: boolean = false;
    
    protected nextAction: Function | null = null;
    protected backAction: Function | null = null;
    protected cancelAction: Function | null = null;

    protected hubContainer: Phaser.GameObjects.Container;
    protected tutorialContainer: Phaser.GameObjects.Container;
    protected isHubMode: boolean = false;
    protected selectedCategoryIndex: number = 0;
    protected categories: {id: string, name: string}[] = [];
    protected hubButtonIndex: number = 0;
    protected categoryMap: Record<string, {title: string, tutorials: (Tutorial | EnhancedTutorial)[]}> = {
        essentials: {
            title: i18next.t("tutorial:titles.essentials"),
            tutorials: [
                EnhancedTutorial.MENU_ACCESS,
                EnhancedTutorial.SAVING_1,
                EnhancedTutorial.STATS,
                EnhancedTutorial.RUN_HISTORY_1
            ]
        },
        gameModes: {
            title: i18next.t("tutorial:titles.gameModes"),
            tutorials: [
                EnhancedTutorial.JOURNEY_1,
                EnhancedTutorial.ROGUE_MODE,
                EnhancedTutorial.NUZLOCKE,
                EnhancedTutorial.NUZLIGHT,
                EnhancedTutorial.UNLOCK_JOURNEY,
                EnhancedTutorial.ENDGAME,
                EnhancedTutorial.MODE_UNLOCKS,
                EnhancedTutorial.FIRST_VICTORY
            ]
        },
        specialPokemon: {
            title: i18next.t("tutorial:titles.specialPokemon"),
            tutorials: [
                EnhancedTutorial.LEGENDARY_POKEMON_1,
                EnhancedTutorial.FUSION_POKEMON_1,
                EnhancedTutorial.TRAINER_POKEMON_1,
                EnhancedTutorial.EGGS_1,
                EnhancedTutorial.EGG_SWAP_1
            ]
        },
        progression: {
            title: i18next.t("tutorial:titles.progression"),
            tutorials: [
                EnhancedTutorial.RIVALS_1,
                EnhancedTutorial.GLITCH_RIVALS_1,
                EnhancedTutorial.RIVAL_QUESTS,
                EnhancedTutorial.THE_VOID_UNLOCKED,
                EnhancedTutorial.THE_VOID_OVERTAKEN,
                EnhancedTutorial.NEW_QUESTS
            ]
        },
        permanentFeatures: {
            title: i18next.t("tutorial:titles.permanentFeatures"),
            tutorials: [
                EnhancedTutorial.PERMA_MONEY_1,
                EnhancedTutorial.BOUNTIES_1,
                EnhancedTutorial.DAILY_BOUNTY,
                EnhancedTutorial.SMITTY_ITEMS_1
            ]
        },
        glitchSystem: {
            title: i18next.t("tutorial:titles.glitchSystem"),
            tutorials: [
                EnhancedTutorial.GLITCH_ITEMS_1,
                EnhancedTutorial.ABILITY_SWITCHER,
                EnhancedTutorial.TYPE_SWITCHER,
                EnhancedTutorial.PRIMARY_SWITCHER,
                EnhancedTutorial.SECONDARY_SWITCHER,
                EnhancedTutorial.RELEASE_ITEMS_1,
                EnhancedTutorial.ANY_TMS,
                EnhancedTutorial.ANY_ABILITIES,
                EnhancedTutorial.STAT_SWITCHERS
            ]
        },
        battleMechanics: {
            title: i18next.t("tutorial:titles.battleMechanics"),
            tutorials: [
                EnhancedTutorial.ABILITIES_1,
                EnhancedTutorial.PASSIVE_ABILITIES_1,
                EnhancedTutorial.PARTY_ABILITY_1,
                EnhancedTutorial.BUG_TYPES_1,
                EnhancedTutorial.MOVE_UPGRADES_1,
                EnhancedTutorial.FIRST_MOVE_UPGRADE_1
            ]
        },
        formChanges: {
            title: i18next.t("tutorial:titles.formChanges"),
            tutorials: [
                EnhancedTutorial.NEW_FORMS_1,
                EnhancedTutorial.SMITTY_FORMS_1,
                EnhancedTutorial.SMITTY_FORM_UNLOCKED_1,
                EnhancedTutorial.MEGA_DYNAMAX_1
            ]
        },
        communityFeatures: {
            title: i18next.t("tutorial:titles.communityFeatures"),
            tutorials: [
                EnhancedTutorial.DISCORD,
                EnhancedTutorial.SMITOM
            ]
        }
    };

    protected tutorialService: TutorialService;

    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
        this.currentStageIndex = 0;
        this.tutorialService = new TutorialService(scene);
    }

    /**
     * Gets only the completed tutorials for a specific category
     * @param categoryId The category ID to filter tutorials for
     * @returns Array of completed tutorials for the category
     */
    protected getCategoryCompletedTutorials(categoryId: string): (Tutorial | EnhancedTutorial)[] {
        if (!this.categoryMap[categoryId]) {
            return [];
        }
        
        return this.categoryMap[categoryId].tutorials.filter(tutorial => 
            this.tutorialService.isTutorialCompleted(tutorial)
        );
    }

    getModalTitle(config?: ModalConfig): string {
        if (this.isHubMode && !this.tutorialConfig) {
            return i18next.t("tutorial:hubTitle", "Tutorial Hub");
        }
        
        if (this.tutorialConfig?.stages && 
            Array.isArray(this.tutorialConfig.stages) && 
            this.currentStageIndex >= 0 && 
            this.currentStageIndex < this.tutorialConfig.stages.length) {
            const currentStage = this.tutorialConfig.stages[this.currentStageIndex];
            if (currentStage.title) {
                return currentStage.title;
            }
        }
        return this.tutorialConfig?.title || i18next.t("tutorial:defaultTitle");
    }

    getWidth(config?: ModalConfig): number {
        return this.tutorialConfig?.isFromMenu ? 280 : 240;
    }

    getHeight(config?: ModalConfig): number {
        return 135;
    }

    getMargin(config?: ModalConfig): [number, number, number, number] {
        return [0, 0, 16, 0];
    }

    getAllPossibleButtonLabels(): string[] {
        return [
            i18next.t("settings:back"),
            i18next.t("menu:continue"),
            i18next.t("menu:buttonCancel")
        ];
    }

    getButtonLabels(config?: ModalConfig): string[] {
        if (!this.tutorialConfig?.stages || !Array.isArray(this.tutorialConfig.stages)) {
            return this.getAllPossibleButtonLabels();
        }

        return [];
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) {
            return false;
        }

        const tutorialConfig = args[args.length - 1] as TutorialConfig;
        
        if (!tutorialConfig) {
            this.isHubMode = true;
            this.tutorialConfig = null;
            
            if (super.show(args)) {
                this.setupHub();
                return true;
            }
            return false;
        }
        
        if (!tutorialConfig || !tutorialConfig.stages || !Array.isArray(tutorialConfig.stages)) {
            console.error("Invalid tutorial configuration", tutorialConfig);
            return false;
        }
        
        this.tutorialConfig = tutorialConfig;
        this.currentStageIndex = 0;
        this.isHubMode = tutorialConfig.isFromMenu === true;

        if (super.show(args)) {
            if (this.titleText) {
                this.titleText.setText(this.getModalTitle());
            }
            
            this.uiContainer = this.scene.add.container(0, 0);
            this.modalContainer.add(this.uiContainer);
            this.uiContainer.setAlpha(0);

            if (this.isHubMode) {
                this.setupHubWithTutorial();
            } else {
                this.setupUI().catch(error => {
                    console.error('[TutorialUI] Error during setup:', error);
                    this.handleUIError();
                });
            }
            
            this.fadeInUI();
            
            this.updateButtonsForStage();
            this.initializeButtonHighlight();
            return true;
        }
        return false;
    }

    protected initializeButtonHighlight(): void {
        if (!this.buttonContainers || !this.buttonBgs) return;
        
        const currentStageLabels = this.getButtonLabels();
        const allPossibleLabels = this.getAllPossibleButtonLabels();
        
        const visibleButtonIndices: number[] = [];
        currentStageLabels.forEach(label => {
            const index = allPossibleLabels.indexOf(label);
            if (index !== -1) {
                visibleButtonIndices.push(index);
            }
        });
        
        if (visibleButtonIndices.length > 0) {
            this.setButtonIndex(visibleButtonIndices[0]);
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

    protected async setupUI(): Promise<void> {
        this.stageNavigationContainer = this.scene.add.container(0, 0);
        this.spritesContainer = this.scene.add.container(this.getWidth() / 2, this.getHeight() / 2 - 15);
        this.textContainer = this.scene.add.container(this.getWidth() / 2, this.getHeight() - 30);

        this.uiContainer.add([
            this.stageNavigationContainer,
            this.spritesContainer,
            this.textContainer
        ]);

        this.textDisplay = addTextObject(
            this.scene,
            0,
            0,
            "",
            TextStyle.WINDOW,
            { 
                fontSize: '50px',
                wordWrap: { width: (this.getWidth() - 20) * 6, useAdvancedWrap: true },
                align: 'center'
            }
        );
        this.textDisplay.setOrigin(0.5, 0);
        this.textContainer.add(this.textDisplay);

        this.updateStageNavigation();

        try {
            await this.updateStageContent();
        } catch (error) {
            console.error('[TutorialUI] Error setting up initial stage:', error);
            this.handleUIError();
        }

        this.nextAction = () => this.navigateStage(1);
        this.backAction = () => this.navigateStage(-1);
        this.cancelAction = () => {
            this.clear();
            this.scene.ui.revertMode();
        };

        this.updateButtonsForStage();
    }

    private updateButtonsForStage(): void {
        if (!this.buttonContainers || !this.buttonBgs) return;

        const currentStageLabels = this.getButtonLabels();
        const allPossibleLabels = this.getAllPossibleButtonLabels();
        
        const visibleButtonIndices: number[] = [];
        currentStageLabels.forEach(label => {
            const index = allPossibleLabels.indexOf(label);
            if (index !== -1) {
                visibleButtonIndices.push(index);
            }
        });

        this.buttonContainers.forEach((container, index) => {
            if (!container) return;
            
            const isVisible = visibleButtonIndices.includes(index);
            container.setVisible(isVisible);
            this.buttonBgs[index].setVisible(isVisible);
        });

        const visibleContainers = visibleButtonIndices.map(index => this.buttonContainers[index])
            .filter(container => container && container.visible);
        
        const width = this.getWidth();
        
        if (visibleContainers.length === 0) return;
        
        if (visibleContainers.length === 1) {
            const buttonContainer = visibleContainers[0];
            const buttonIndex = this.buttonContainers.indexOf(buttonContainer);
            buttonContainer.setPosition(
                width / 2, 
                this.modalBg.height - (this.buttonBgs[buttonIndex].height + 8)
            );
        } else {
            const buttonPadding = 15; 
            const totalButtonWidth = visibleContainers.reduce((total, container, idx) => {
                const buttonIndex = this.buttonContainers.indexOf(container);
                return total + this.buttonBgs[buttonIndex].width;
            }, 0);
            
            const totalSpacing = (visibleContainers.length - 1) * buttonPadding;
            const totalWidth = totalButtonWidth + totalSpacing;
            const startX = (width - totalWidth) / 2;
            
            let currentX = startX;
            for (let i = 0; i < this.buttonContainers.length; i++) {
                const container = this.buttonContainers[i];
                if (container && container.visible) {
                    const buttonWidth = this.buttonBgs[i].width;
                    container.setPosition(
                        currentX + (buttonWidth / 2),
                        this.modalBg.height - (this.buttonBgs[i].height + 8)
                    );
                    currentX += buttonWidth + buttonPadding;
                }
            }
        }
    }

    private async navigateStage(direction: number): Promise<void> {
        if (!this.tutorialConfig?.stages || !Array.isArray(this.tutorialConfig.stages)) {
            return;
        }
        
        const newStageIndex = this.currentStageIndex + direction;
        
        if (newStageIndex >= 0 && newStageIndex < this.tutorialConfig.stages.length) {
            this.currentStageIndex = newStageIndex;
            
            const loadingIndicator = this.showLoadingIndicator();
            
            try {
                await this.updateStageContent();
                this.updateStageNavigation();
                this.updateButtonsForStage();
                this.initializeButtonHighlight();
                
                if (this.titleText) {
                    this.titleText.setText(this.getModalTitle());
                }
                
                this.scene.ui.playSelect();
            } catch (error) {
                console.error('[TutorialUI] Error during stage navigation:', error);
                this.handleUIError();
            } finally {
                if (loadingIndicator) {
                    loadingIndicator.destroy();
                }
            }
        } else if (newStageIndex >= this.tutorialConfig.stages.length) {
            this.completeHandler();
        }
    }
    
    /**
     * Shows a loading indicator while content is being loaded
     */
    private showLoadingIndicator(): Phaser.GameObjects.Container | null {
        if (!this.spritesContainer) return null;
        
        const container = this.scene.add.container(0, 0);
        
        const bg = this.scene.add.rectangle(
            0, 0, 
            40, 40, 
            0x000000, 0.5
        );
        
        const text = this.scene.add.text(
            0, 0,
            i18next.t('pokedex:loading'),
            { fontSize: '12px', color: '#ffffff' }
        );
        text.setOrigin(0.5);
        
        container.add([bg, text]);
        container.setPosition(0, 0);
        this.spritesContainer.add(container);
        
        return container;
    }

    /**
     * Loads all textures needed for the current stage sprites
     * Returns a promise that resolves when all textures are loaded
     */
    private async loadTexturesForStage(): Promise<void> {
        if (!this.tutorialConfig?.stages || 
            this.currentStageIndex < 0 || 
            this.currentStageIndex >= this.tutorialConfig.stages.length) {
            return Promise.resolve();
        }

        const stage = this.tutorialConfig.stages[this.currentStageIndex];
        if (!stage.sprites || !stage.sprites.length) {
            return Promise.resolve();
        }

        const loadPromises: Promise<void>[] = [];

        for (const spriteConfig of stage.sprites) {
            if (spriteConfig.spriteType === 'pokemon' && spriteConfig.speciesId) {
                const spriteKey = `pkmn__${spriteConfig.speciesId}`;
                if (!this.scene.textures.exists(spriteKey)) {
                    loadPromises.push(this.loadTexture(spriteKey, `images/pokemon/${spriteConfig.speciesId}.png`));
                }
            } 
            else if (spriteConfig.spriteType === 'glitch' && spriteConfig.glitchFormName) {
                const spriteKey = `pkmn__glitch__${spriteConfig.glitchFormName}`;
                if (!this.scene.textures.exists(spriteKey)) {
                    loadPromises.push(this.loadTexture(spriteKey, `images/pokemon/glitch/${spriteConfig.glitchFormName}.png`));
                }
            }
            else if (spriteConfig.spriteType === 'smitty_logo' && spriteConfig.smittyLogoId !== undefined) {
                const textureKey = `smittyLogo_${spriteConfig.smittyLogoId}`;
                if (!this.scene.textures.exists(textureKey)) {
                    console.warn(`Smitty logo ${spriteConfig.smittyLogoId} not loaded, attempting to load it...`);
                    const logoId = spriteConfig.smittyLogoId;
                    loadPromises.push(this.loadSmittyLogo(logoId));
                }
            }
            else if (spriteConfig.spriteType === 'item') {
                const itemKey = spriteConfig.itemId || spriteConfig.key;
                if (itemKey && !this.scene.textures.exists(itemKey)) {
                    loadPromises.push(this.loadTexture(itemKey, `images/items/${itemKey}.png`));
                }
            }
            else if (spriteConfig.spriteType === 'egg') {
                const textureKey = "egg"; 
                if (!this.scene.textures.exists(textureKey)) {
                    loadPromises.push(this.loadTexture(textureKey, "images/egg.png"));
                }
            }
            else if (spriteConfig.spriteType === 'save') {
                const textureKey = "saving_icon"; 
                if (!this.scene.textures.exists(textureKey)) {
                    loadPromises.push(this.loadTexture(textureKey, "images/saving_icon.png"));
                }
            }
            else if (spriteConfig.key && !this.scene.textures.exists(spriteConfig.key)) {
                loadPromises.push(this.loadTexture(spriteConfig.key, `images/${spriteConfig.key}.png`));
            }
        }

        if (loadPromises.length > 0) {
            try {
                await Promise.all(loadPromises);
                this.texturesLoaded = true;
            } catch (error) {
                console.error('[TutorialUI] Error loading textures:', error);
                this.texturesLoaded = false;
                throw error;
            }
        } else {
            this.texturesLoaded = true;
        }
    }

    /**
     * Special method to load a Smitty logo
     */
    private loadSmittyLogo(logoId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const textureKey = `smittyLogo_${logoId}`;
            
            if (this.scene.textures.exists(textureKey)) {
                console.log(`[TutorialUI] SmittyLogo ${logoId} already loaded as ${textureKey}`);
                resolve();
                return;
            }
            
            this.scene.load.image(textureKey, `images/smitty_logos/${logoId}.png`);

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                console.log(`[TutorialUI] Successfully loaded SmittyLogo: ${logoId} as ${textureKey}`);
                resolve();
            });

            this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                console.error(`[TutorialUI] Failed to load SmittyLogo: ${logoId}`);
                reject(new Error(`Failed to load SmittyLogo: ${logoId}`));
            });

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    /**
     * Helper method to load a single texture
     */
    private loadTexture(key: string, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!key || typeof key !== 'string') {
                console.error(`[TutorialUI] Invalid texture key: ${key}`);
                return;
            }
            
            if (!path || typeof path !== 'string') {
                console.error(`[TutorialUI] Invalid texture path for key ${key}: ${path}`);
                return;
            }

            if (this.scene.textures.exists(key)) {
                resolve();
                return;
            }

            this.scene.load.embeddedAtlas(key, path);

            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                resolve();
            });

            try {
                this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                    console.error(`[TutorialUI] Failed to load texture: ${file.key}`);
                });
            } catch (error) {
                console.error('[TutorialUI] Error setting up texture load error handler:', error);
            }

            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private async updateStageContent(): Promise<void> {
        if (!this.tutorialConfig?.stages || !Array.isArray(this.tutorialConfig.stages) || 
            this.currentStageIndex < 0 || this.currentStageIndex >= this.tutorialConfig.stages.length) {
            this.textDisplay?.setText("Error: Invalid tutorial stage");
            return;
        }

        const stage = this.tutorialConfig.stages[this.currentStageIndex];
        
        this.textDisplay.setText(stage.text || "");
        
        if (this.tutorialConfig.isFromMenu) {
            this.textContainer.setPosition(this.textContainer.x, this.getHeight() - 55);
        } else {
            this.textContainer.setPosition(this.getWidth() / 2, this.getHeight() - 50);
        }
        
        this.sprites.forEach(sprite => sprite.destroy());
        this.sprites = [];
        
        this.texturesLoaded = false;
        
        try {
            await this.loadTexturesForStage();
            this.setupSprites(stage);
        } catch (error) {
            console.error('[TutorialUI] Error setting up sprites:', error);
            this.handleUIError();
        }
    }
    
    /**
     * Create sprites for the current stage after textures are loaded
     */
    private setupSprites(stage: TutorialStage): void {
        if (!stage.sprites || !stage.sprites.length || !this.texturesLoaded) {
            return;
        }
        
        const spriteCount = stage.sprites.length;
        const spacing = 40; 
        const totalWidth = (spriteCount - 1) * spacing;
        const startX = -totalWidth / 2;
        
        stage.sprites.forEach((spriteConfig, index) => {
            const x = spriteConfig.x !== undefined ? spriteConfig.x : (startX + (index * spacing));
            const y = spriteConfig.y !== undefined ? spriteConfig.y : 0;
            
            let sprite: Phaser.GameObjects.Sprite;
            
            try {
                if (spriteConfig.spriteType === 'pokemon' && spriteConfig.speciesId) {
                    const spriteKey = `pkmn__${spriteConfig.speciesId}`;
                    sprite = (this.scene as BattleScene).addPokemonSprite(
                        null,
                        x,
                        y,
                        spriteKey,
                        undefined,
                        false,
                        true
                    );
                    
                    if (this.scene.spritePipeline) {
                        if (spriteConfig.shiny) {
                            sprite.setPipelineData("shiny", true);
                        }
                        if (spriteConfig.variant !== undefined) {
                            sprite.setPipelineData("variant", spriteConfig.variant);
                        }
                    }
                } 
                else if (spriteConfig.spriteType === 'glitch' && spriteConfig.glitchFormName) {
                    const spriteKey = `pkmn__glitch__${spriteConfig.glitchFormName}`;
                    sprite = (this.scene as BattleScene).addPokemonSprite(
                        null,
                        x,
                        y,
                        spriteKey,
                        undefined,
                        false,
                        true
                    );
                }
                else if (spriteConfig.spriteType === 'icon' && spriteConfig.speciesId) {
                    const species = getPokemonSpecies(spriteConfig.speciesId);
                    if (species) {
                        sprite = this.scene.add.sprite(x, y, species.getIconAtlasKey());
                        sprite.setFrame(species.getIconId(spriteConfig.shiny || false));
                    } else {
                        sprite = this.scene.add.sprite(x, y, spriteConfig.key, spriteConfig.frame);
                    }
                }
                else if (spriteConfig.spriteType === 'smitty_logo' && spriteConfig.smittyLogoId !== undefined) {
                    try {
                        const textureKey = `smittyLogo_${spriteConfig.smittyLogoId}`;
                        
                        if (!this.scene.textures.exists(textureKey)) {
                            console.error(`[TutorialUI] SmittyLogo texture ${textureKey} not available`);
                            sprite = this.scene.add.sprite(x, y, "error_texture");
                        } else {
                            sprite = this.scene.add.sprite(x, y, textureKey);
                        }
                    } catch (error) {
                        console.error('[TutorialUI] Error creating SmittyLogo sprite:', error);
                        sprite = this.scene.add.sprite(x, y, "error_texture");
                    }
                }
                else if (spriteConfig.spriteType === 'item') {
                    const itemKey = spriteConfig.itemId || spriteConfig.key;
                    sprite = this.scene.add.sprite(x, y, itemKey, spriteConfig.frame);
                }
                else if (spriteConfig.spriteType === 'egg') {
                    const eggStage = spriteConfig.eggStage !== undefined ? spriteConfig.eggStage : 0;
                    
                    if (this.scene.textures.exists("egg")) {
                        try {
                            sprite = this.scene.add.sprite(x, y, "egg", `egg_${eggStage}`);
                        } catch (error) {
                            console.error('[TutorialUI] Error creating egg sprite with frame:', error);
                            sprite = this.scene.add.sprite(x, y, "egg");
                        }
                    } else {
                        console.error('[TutorialUI] Egg texture not found, using placeholder');
                        sprite = this.scene.add.sprite(x, y, "error_texture");
                    }
                }
                else if (spriteConfig.spriteType === 'save') {
                    if (this.scene.textures.exists("saving_icon")) {
                        try {
                            sprite = this.scene.add.sprite(x, y, "saving_icon", spriteConfig.frame);
                        } catch (error) {
                            console.error('[TutorialUI] Error creating saving_icon sprite with frame:', error);
                            sprite = this.scene.add.sprite(x, y, "saving_icon");
                        }
                    } else {
                        console.error('[TutorialUI] Saving icon texture not found, using placeholder');
                        sprite = this.scene.add.sprite(x, y, "error_texture");
                    }
                }
                else {
                    sprite = this.scene.add.sprite(x, y, spriteConfig.key, spriteConfig.frame);
                }
                
                if (spriteConfig.scale !== undefined) {
                    sprite.setScale(spriteConfig.scale);
                } else {
                    sprite.setScale(0.75); 
                }
                
                if (spriteConfig.alpha !== undefined) {
                    sprite.setAlpha(spriteConfig.alpha);
                    if (Math.abs(spriteConfig.alpha - 0.85) < 0.01) {
                        sprite.setTint(0x000000);
                    }
                }
                
                if (spriteConfig.flipX) {
                    sprite.setFlipX(true);
                }
                
                if (spriteConfig.animation && sprite.anims.exists(spriteConfig.animation)) {
                    sprite.play(spriteConfig.animation);
                } else if (sprite.texture.frameTotal > 1) {
                    sprite.play(sprite.texture.key);
                }
                
                this.sprites.push(sprite);
                this.spritesContainer.add(sprite);
            } catch (error) {
                console.error('[TutorialUI] Error creating sprite:', error, spriteConfig);
            }
        });
    }

    private updateStageNavigation(): void {
        this.stageNavigationContainer.removeAll(true);

        if (!this.tutorialConfig?.stages || this.tutorialConfig.stages.length <= 1) return;

        const hubWidth = this.isHubMode ? this.getWidth() / 5 : 0;
        const tutorialWidth = this.isHubMode ? this.getWidth() - hubWidth : this.getWidth();
        const centerX = hubWidth + (tutorialWidth / 2);
        const bottomY = this.getHeight() - 18; 

        if (this.currentStageIndex > 0 || (this.isHubMode && this.selectedCategoryIndex > 0)) {
            const backArrow = this.scene.add.sprite(centerX - 20, bottomY, 'cursor_reverse');
            backArrow.setScale(0.75);
            backArrow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 6, 10), Phaser.Geom.Rectangle.Contains);

            backArrow.on('pointerup', () => {
                if (this.currentStageIndex > 0) {
                    this.navigateStage(-1);
                } else if (this.isHubMode && this.selectedCategoryIndex > 0) {
                    this.selectedCategoryIndex--;
                    this.updateHubSelection();
                    const prevCategory = this.categories[this.selectedCategoryIndex];
                    this.loadCategoryTutorial(prevCategory.id);
                }
            });

            if (backArrow.anims.exists('cursor_reverse')) {
                backArrow.play('cursor_reverse');
            }

            this.stageNavigationContainer.add(backArrow);
        }

        if (this.currentStageIndex < this.tutorialConfig.stages.length - 1 || 
            (this.isHubMode && this.selectedCategoryIndex < this.categories.length - 1) ||
            this.currentStageIndex === this.tutorialConfig.stages.length - 1) {
            const forwardArrow = this.scene.add.sprite(centerX + 20, bottomY, 'cursor');
            forwardArrow.setScale(0.75);
            forwardArrow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 6, 10), Phaser.Geom.Rectangle.Contains);

            forwardArrow.on('pointerup', () => {
                if (this.currentStageIndex < this.tutorialConfig.stages.length - 1) {
                    this.navigateStage(1);
                } else if (this.isHubMode && this.selectedCategoryIndex < this.categories.length - 1) {
                    this.selectedCategoryIndex++;
                    this.updateHubSelection();
                    const nextCategory = this.categories[this.selectedCategoryIndex];
                    this.loadCategoryTutorial(nextCategory.id);
                }
            });

            if (forwardArrow.anims.exists('cursor')) {
                forwardArrow.play('cursor');
            }

            this.stageNavigationContainer.add(forwardArrow);
        }
    }

    protected async setupHub(): Promise<void> {
        this.uiContainer = this.scene.add.container(0, 0);
        this.modalContainer.add(this.uiContainer);
        
        this.categories = Object.keys(this.categoryMap)
            .filter(id => {
                return this.getCategoryCompletedTutorials(id).length > 0;
            })
            .map(id => ({
                id,
                name: this.categoryMap[id].title
            }));
        
        this.setupHubUI();
        this.fadeInUI();
    }
    
    protected setupHubUI(): void {
        this.hubContainer = this.scene.add.container(0, 0);
        this.uiContainer.add(this.hubContainer);
        
        const width = this.getWidth();
        const height = this.getHeight();
        
        const startY = 25;
        const lineHeight = 12;
        
        this.categories.forEach((category, index) => {
            const textObj = addTextObject(
                this.scene,
                width / 2,
                startY + (index * lineHeight),
                category.name,
                TextStyle.WINDOW,
                { fontSize: '45px' }
            );
            textObj.setOrigin(0.5, 0);
            
            const highlight = this.scene.add.rectangle(
                width / 2,
                startY + (index * lineHeight) + 6,
                width - 40,
                lineHeight,
                0xffff00,
                0
            );
            highlight.setOrigin(0.5, 0.5);
            
            textObj.setData('highlight', highlight);
            
            this.hubContainer.add([highlight, textObj]);
        });
        
        const instructionsText = addTextObject(
            this.scene,
            width / 2,
            height - 25,
            "Select a category to view tutorials",
            TextStyle.WINDOW,
            { fontSize: '40px' }
        );
        instructionsText.setOrigin(0.5, 0.5);
        this.hubContainer.add(instructionsText);
        
        this.updateHubSelection();
    }
    
    protected updateHubSelection(): void {
        const textObjects = this.hubContainer.getAll().filter(obj => obj.type === 'Text');
        
        textObjects.forEach((textObj, index) => {
            if (index < this.categories.length) {
                const highlight = textObj.getData('highlight');
                if (highlight) {
                    if (index === this.selectedCategoryIndex) {
                        highlight.setFillStyle(0xffff00, 0.3);
                        (textObj as Phaser.GameObjects.Text).setColor('#ffff00');
                    } else {
                        highlight.setFillStyle(0xffffff, 0);
                        (textObj as Phaser.GameObjects.Text).setColor('#ffffff');
                    }
                }
            }
        });
    }
    
    protected async setupHubWithTutorial(): Promise<void> {
        this.hubContainer = this.scene.add.container(0, 0);
        this.tutorialContainer = this.scene.add.container(0, 0);
        
        this.uiContainer.add([this.hubContainer, this.tutorialContainer]);
        
        const hubWidth = this.getWidth() / 5;
        
        this.categories = Object.keys(this.categoryMap)
            .filter(id => {
                return this.getCategoryCompletedTutorials(id).length > 0;
            })
            .map(id => ({
                id,
                name: this.categoryMap[id].title
            }));
        
        const startY = 25;
        const lineHeight = 10; 
        
        this.categories.forEach((category, index) => {
            const textObj = addTextObject(
                this.scene,
                hubWidth / 2,
                startY + (index * lineHeight),
                category.name,
                TextStyle.WINDOW,
                { fontSize: '42px' } 
            );
            textObj.setOrigin(0.5, 0);
            
            const highlight = this.scene.add.rectangle(
                hubWidth / 2,
                startY + (index * lineHeight) + 5,
                hubWidth - 6, 
                lineHeight,
                0xffff00,
                0
            );
            highlight.setOrigin(0.5, 0.5);
            
            textObj.setData('highlight', highlight);
            
            this.hubContainer.add([highlight, textObj]);
        });
        
        const divider = this.scene.add.graphics();
        divider.lineStyle(2, 0xffffff, 0.5);
        divider.beginPath();
        divider.moveTo(hubWidth + 2, 20);
        divider.lineTo(hubWidth + 2, this.getHeight() - 20);
        divider.closePath();
        divider.strokePath();
        
        this.hubContainer.add(divider);
        
        this.updateHubSelection();
        
        if (this.categories.length > 0) {
            this.selectedCategoryIndex = 0;
            this.updateHubSelection();
            try {
                await this.loadCategoryTutorial(this.categories[0].id);
            } catch (error) {
                console.error('[TutorialUI] Error loading initial category:', error);
                this.handleUIError();
            }
        }
    }
    
    private async loadCategoryTutorial(categoryId: string): Promise<void> {
        if (this.tutorialContainer) {
            this.tutorialContainer.removeAll(true);
        }
        
        const hubWidth = this.getWidth() / 5;
        const tutorialWidth = this.getWidth() - hubWidth;
        const tutorialCenterX = hubWidth + (tutorialWidth / 2);
        
        const loadingText = addTextObject(
            this.scene,
            tutorialCenterX,
            this.getHeight() / 2,
            "Loading...",
            TextStyle.WINDOW,
            { fontSize: '45px' }
        );
        loadingText.setOrigin(0.5, 0.5);
        this.tutorialContainer.add(loadingText);
        
        try {
            const registry = TutorialRegistry.getInstance();
            
            if (this.categoryMap.hasOwnProperty(categoryId)) {
                const categoryData = this.categoryMap[categoryId];
                
                const completedTutorials = this.getCategoryCompletedTutorials(categoryId);
                
                const combinedConfig = registry.combineTutorials(
                    categoryData.title, 
                    completedTutorials,
                    () => {
                        this.currentStageIndex = 0;
                    },
                    false, 
                    true 
                );
                
                this.tutorialConfig = combinedConfig;
                this.currentStageIndex = 0;
                
                this.tutorialContainer.removeAll(true);
                
                await this.setupTutorialUI();
                
                if (this.titleText) {
                    this.titleText.setText(this.getModalTitle());
                }
                
                this.updateButtonsForStage();
            } else {
                this.tutorialContainer.removeAll(true);
                const errorText = addTextObject(
                    this.scene,
                    tutorialCenterX,
                    this.getHeight() / 2,
                    "Category not found",
                    TextStyle.WINDOW,
                    { fontSize: '45px' }
                );
                errorText.setOrigin(0.5, 0.5);
                this.tutorialContainer.add(errorText);
            }
        } catch (error) {
            console.error('[TutorialUI] Error loading category tutorial:', error);
            
            this.tutorialContainer.removeAll(true);
            const errorText = addTextObject(
                this.scene,
                tutorialCenterX,
                this.getHeight() / 2,
                "Error loading tutorial",
                TextStyle.WINDOW,
                { fontSize: '45px' }
            );
            errorText.setOrigin(0.5, 0.5);
            this.tutorialContainer.add(errorText);
        }
    }
    
    protected async setupTutorialUI(): Promise<void> {
        const hubWidth = this.getWidth() / 5;
        const tutorialWidth = this.getWidth() - hubWidth;
        
        this.stageNavigationContainer = this.scene.add.container(0, 0);
        this.spritesContainer = this.scene.add.container(tutorialWidth / 2 + hubWidth, this.getHeight() / 2 - 20);
        this.textContainer = this.scene.add.container(tutorialWidth / 2 + hubWidth, this.getHeight() - 50);

        this.tutorialContainer.add([
            this.stageNavigationContainer,
            this.spritesContainer,
            this.textContainer
        ]);

        this.textDisplay = addTextObject(
            this.scene,
            0,
            0,
            "",
            TextStyle.WINDOW,
            { 
                fontSize: '46px',
                wordWrap: { width: (tutorialWidth - 30) * 6, useAdvancedWrap: true },
                align: 'center'
            }
        );
        this.textDisplay.setOrigin(0.5, 0);
        this.textContainer.add(this.textDisplay);

        this.updateStageNavigation();

        try {
            await this.updateStageContent();
        } catch (error) {
            console.error('[TutorialUI] Error setting up tutorial stage:', error);
            throw error;
        }

        this.nextAction = () => this.navigateStage(1);
        this.backAction = () => this.navigateStage(-1);
        this.cancelAction = () => {
            this.clear();
            this.scene.ui.revertMode();
        };
    }

    processInput(button: Button): boolean {
        const ui = this.getUi();
        
        const handleAsyncNavigation = (asyncFunc: () => Promise<void>) => {
            asyncFunc().catch(error => {
                console.error('[TutorialUI] Navigation error:', error);
                this.handleUIError();
            });
            ui.playSelect();
            return true;
        };

        if (this.isHubMode) {
            switch (button) {
                case Button.UP:
                    if (this.selectedCategoryIndex > 0) {
                        this.selectedCategoryIndex--;
                        this.updateHubSelection();
                        
                        if (this.tutorialConfig) {
                            const selectedCategory = this.categories[this.selectedCategoryIndex];
                            return handleAsyncNavigation(() => this.loadCategoryTutorial(selectedCategory.id));
                        }
                        
                        ui.playSelect();
                        return true;
                    }
                    break;
                    
                case Button.DOWN:
                    if (this.selectedCategoryIndex < this.categories.length - 1) {
                        this.selectedCategoryIndex++;
                        this.updateHubSelection();
                        
                        if (this.tutorialConfig) {
                            const selectedCategory = this.categories[this.selectedCategoryIndex];
                            return handleAsyncNavigation(() => this.loadCategoryTutorial(selectedCategory.id));
                        }
                        
                        ui.playSelect();
                        return true;
                    }
                    break;
                    
                case Button.SUBMIT:
                case Button.ACTION:
                    const selectedCategory = this.categories[this.selectedCategoryIndex];
                    if (selectedCategory) {
                        if (this.tutorialConfig) {
                            return handleAsyncNavigation(() => this.loadCategoryTutorial(selectedCategory.id));
                        } else {
                            ui.revertMode();
                            
                            setTimeout(() => {
                                this.tutorialService.showTutorialsByCategory(selectedCategory.id, true)
                                    .then(() => {
                                        setTimeout(() => {
                                            this.scene.ui.setOverlayMode(Mode.TUTORIAL, {}, {
                                                isFromMenu: true,
                                                title: "Tutorial Hub",
                                                stages: [],
                                                isTipActive: false
                                            });
                                        }, 300);
                                    });
                            }, 300);
                            
                            ui.playSelect();
                            return true;
                        }
                    }
                    break;
                    
                case Button.CANCEL:
                    this.cancelInMenuMode();
                    ui.playSelect();
                    return true;
                    
                case Button.LEFT:
                    if (this.tutorialConfig && this.currentStageIndex > 0) {
                        return handleAsyncNavigation(() => this.navigateStage(-1));
                    } else if (this.tutorialConfig && this.currentStageIndex === 0 && this.selectedCategoryIndex > 0) {
                        this.selectedCategoryIndex--;
                        this.updateHubSelection();
                        const prevCategory = this.categories[this.selectedCategoryIndex];
                        
                        return handleAsyncNavigation(async () => {
                            await this.loadCategoryTutorial(prevCategory.id);
                            
                            if (this.tutorialConfig?.stages && this.tutorialConfig.stages.length > 0) {
                                this.currentStageIndex = this.tutorialConfig.stages.length - 1;
                                await this.updateStageContent();
                                this.updateStageNavigation();
                                
                                if (this.titleText) {
                                    this.titleText.setText(this.getModalTitle());
                                }
                            }
                        });
                    }
                    break;
                    
                case Button.RIGHT:
                    if (this.tutorialConfig && this.currentStageIndex < this.tutorialConfig.stages.length - 1) {
                        return handleAsyncNavigation(() => this.navigateStage(1));
                    } else if (this.tutorialConfig && this.currentStageIndex === this.tutorialConfig.stages.length - 1) {
                        if (this.selectedCategoryIndex < this.categories.length - 1) {
                            this.selectedCategoryIndex++;
                            this.updateHubSelection();
                            const nextCategory = this.categories[this.selectedCategoryIndex];
                            return handleAsyncNavigation(() => this.loadCategoryTutorial(nextCategory.id));
                        }
                    }
                    break;
            }
        } else {
            switch (button) {
                case Button.LEFT:
                    if (this.currentStageIndex > 0) {
                        return handleAsyncNavigation(() => this.navigateStage(-1));
                    }
                    break;

                case Button.RIGHT:
                case Button.ACTION:
                case Button.SUBMIT:
                    if (this.currentStageIndex < this.tutorialConfig.stages.length - 1) {
                        return handleAsyncNavigation(() => this.navigateStage(1));
                    } else if (this.currentStageIndex === this.tutorialConfig.stages.length - 1) {
                        this.completeHandler();
                        ui.playSelect();
                        return true;
                    }
                    break;

                case Button.CANCEL:
                    if (this.tutorialConfig.isFromMenu) {
                        this.cancelInMenuMode();
                    } else {
                        this.cancelAction();
                    }
                    ui.playSelect();
                    return true;
                    break;
            }
        }

        return false;
    }

    protected completeHandler(): void {
        if (this.tutorialConfig.onComplete) {
            this.tutorialConfig.onComplete();
        }
        
        if (this.isHubMode) {
            this.clear();
            this.scene.ui.revertMode();
        } else {
            this.clear();
            this.scene.ui.revertMode();
        }
    }

    protected cancelInMenuMode(): void {
        this.clear();
        this.scene.ui.revertMode();
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
            i18next.t("ui:error"),
            TextStyle.WINDOW,
            { fontSize: '60px' }
        );
        errorText.setOrigin(0.5, 0.5);
        this.uiContainer.add(errorText);
        this.uiContainer.setAlpha(1);
    }

    protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {
        if (!this.tutorialConfig?.stages || !Array.isArray(this.tutorialConfig.stages)) {
            if (config.buttonActions && config.buttonActions.length > 0) {
                config.buttonActions[0] = () => {
                    this.clear();
                    this.scene.ui.revertMode();
                };
            }
            return config;
        }
        
        const currentStageLabels = this.getButtonLabels();
        const allPossibleLabels = this.getAllPossibleButtonLabels();
        
        for (let i = 0; i < allPossibleLabels.length; i++) {
            const label = allPossibleLabels[i];
            
            if (!currentStageLabels.includes(label) || i >= config.buttonActions.length) {
                continue;
            }
            
            if (label === i18next.t("menu:continue")) {
                const isLastStage = this.currentStageIndex === this.tutorialConfig.stages.length - 1;
                if (isLastStage && i > 0) {
                    config.buttonActions[i] = () => this.completeHandler();
                } else {
                    config.buttonActions[i] = () => this.nextAction();
                }
            } else if (label === i18next.t("settings:back")) {
                config.buttonActions[i] = () => this.backAction();
            } else if (label === i18next.t("settings:buttonCancel")) {
                config.buttonActions[i] = () => this.cancelAction();
            }
        }
        
        return config;
    }

    clear(): void {
        if (this.uiContainer) {
            this.sprites.forEach(sprite => sprite.destroy());
            this.sprites = [];
            
            this.uiContainer.destroy();
            this.uiContainer = null;
        }
        
        this.hubContainer = null;
        this.tutorialContainer = null;
        this.isHubMode = false;
        this.selectedCategoryIndex = 0;
        this.hubButtonIndex = 0;
        
        this.nextAction = null;
        this.backAction = null;
        this.cancelAction = null;
        
        super.clear();
    }

    updateContainer(config?: ModalConfig): void {
        const [ marginTop, marginRight, marginBottom, marginLeft ] = this.getMargin(config);

        const [ width, height ] = [ this.getWidth(config), this.getHeight(config) ];
        this.modalContainer.setPosition(
            (((this.scene.game.canvas.width / 6) - (width + (marginRight - marginLeft))) / 2), 
            (((-this.scene.game.canvas.height / 6) - (height + (marginBottom - marginTop))) / 2)
        );

        this.modalBg.setSize(width, height);

        const title = this.getModalTitle(config);

        this.titleText.setText(title);
        
        if (this.isHubMode) {
            const hubWidth = width / 5;
            const tutorialWidth = width - hubWidth;
            this.titleText.setX(hubWidth + (tutorialWidth / 2));
        } else {
            this.titleText.setX(width / 2);
        }
        
        this.titleText.setVisible(!!title);

    }
} 