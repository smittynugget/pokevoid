import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Species } from "../enums/species";
import { Abilities } from "../enums/abilities";
import { Type } from "../data/type";
import { Stat } from "../enums/stat";
import { Button } from "../enums/buttons";
import UiHandler from "./ui-handler";
import { getPokemonSpecies } from "../data/pokemon-species";
import { pokemonSpeciesLevelMoves } from "../data/pokemon-level-moves";
import { speciesEggMoves } from "../data/egg-moves";
import { addWindow } from "./ui-theme";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { REMOVED_ABILITIES } from "../modifier/modifier-type";
import { allMoves } from "../data/move";
import { Moves } from "../enums/moves";

enum PokedexDisplayMode {
    ABILITIES,
    MOVES
}

export default class PokedexUiHandler extends UiHandler {
    private pokedexContainer: Phaser.GameObjects.Container;
    private spriteContainer: Phaser.GameObjects.Container;
    private infoContainer: Phaser.GameObjects.Container;
    private typingContainer: Phaser.GameObjects.Container;
    private statsContainer: Phaser.GameObjects.Container;
    
    private abilitiesContainer: Phaser.GameObjects.Container;
    private movesContainer: Phaser.GameObjects.Container;
    private moveScrollContainer: Phaser.GameObjects.Container;
    
    private selectionDropdown: HTMLSelectElement;
    private pokemonSprite: Phaser.GameObjects.Sprite;
    private type1Icon: Phaser.GameObjects.Sprite;
    private type2Icon: Phaser.GameObjects.Sprite;
    
    private navLeftButton: Phaser.GameObjects.Sprite;
    private navRightButton: Phaser.GameObjects.Sprite;
    
    private currentDisplay: PokedexDisplayMode = PokedexDisplayMode.ABILITIES;
    private selectedSpeciesId: Species;
    private scrollPosition: number = 0;
    private readonly MAX_VISIBLE_MOVES = 9;
    
    // Layout constants
    private readonly CONTAINER_WIDTH = 240;
    private readonly CONTAINER_HEIGHT = 135;
    private readonly MARGIN_TOP = 10;
    private readonly MARGIN_LEFT = 10;
    private readonly TAB_HEIGHT = 50;
    
    constructor(scene: BattleScene) {
        super(scene, Mode.POKEDEX);
    }
    
    setup(): void {
        // Will be setup when show() is called
    }
    
    show(args: any[] = []): boolean {
        if (this.active) {
            return false;
        }
        
        this.active = true;
        console.log("Pokedex: show() started");
        
        // Check Phaser scene status
        this._checkSceneStatus();
        
        // Create main container - centered in the canvas
        this.pokedexContainer = new Phaser.GameObjects.Container(
            this.scene,
            this.scene.scaledCanvas.width / 2,
            this.scene.scaledCanvas.height / 2
        );
        this.pokedexContainer.setName("pokedexContainer");
        this.pokedexContainer.setVisible(true);
        this.pokedexContainer.setDepth(900); // Set a high depth to ensure it's on top
        
        // Create background window (centered in the pokedexContainer)
        const bg = addWindow(
            this.scene, 
            0, 0, // Center of pokedexContainer
            this.CONTAINER_WIDTH, 
            this.CONTAINER_HEIGHT
        );
        bg.setOrigin(0.5, 0.5);
        bg.setName("pokedexBackground");
        bg.setDepth(0); // Background should be at the lowest depth
        this.pokedexContainer.add(bg);
        
        console.log("Pokedex: background window created", {
            width: this.CONTAINER_WIDTH, 
            height: this.CONTAINER_HEIGHT,
            pokedexX: this.pokedexContainer.x,
            pokedexY: this.pokedexContainer.y,
            depth: this.pokedexContainer.depth + bg.depth
        });
        
        // Add title
        const title = addTextObject(
            this.scene,
            0,
            -this.CONTAINER_HEIGHT / 2 + this.MARGIN_TOP,
            i18next.t("pokemonInfo:pokedex"),
            TextStyle.WINDOW
        );
        title.setOrigin(0.5, 0.5);
        title.setDepth(1);
        title.setName("pokedexTitle");
        this.pokedexContainer.add(title);
        
        console.log("Pokedex: title created", {
            text: i18next.t("pokemonInfo:pokedex"),
            x: title.x,
            y: title.y,
            depth: this.pokedexContainer.depth + title.depth
        });
        
        // Setup containers with proper positioning
        this.setupContainers();
        console.log("Pokedex: containers setup complete");
        
        // Add the pokedexContainer to the UI
        this.scene.ui.add(this.pokedexContainer);
        console.log("Pokedex: main container added to UI with depth", this.pokedexContainer.depth);
        
        // Set initial default Pokémon (enemy's current Pokémon if available)
        if (this.scene.currentBattle) {
            const enemyPokemon = this.scene.getEnemyField();
            if (enemyPokemon && enemyPokemon.length > 0) {
                this.selectedSpeciesId = enemyPokemon[0].getSpeciesForm().speciesId;
                console.log("Pokedex: selected enemy pokemon", this.selectedSpeciesId);
            } else if (args.length > 0 && typeof args[0] === 'number') {
                this.selectedSpeciesId = args[0];
                console.log("Pokedex: selected pokemon from args", this.selectedSpeciesId);
            } else {
                this.selectedSpeciesId = Species.PIKACHU; // Default
                console.log("Pokedex: default to Pikachu (in battle)", this.selectedSpeciesId);
            }
        } else if (args.length > 0 && typeof args[0] === 'number') {
            this.selectedSpeciesId = args[0];
            console.log("Pokedex: selected pokemon from args (no battle)", this.selectedSpeciesId);
        } else {
            this.selectedSpeciesId = Species.PIKACHU; // Default
            console.log("Pokedex: default to Pikachu (no battle)", this.selectedSpeciesId);
        }
        
        // Create dropdown for Pokémon selection
        this.createPokemonDropdown();
        console.log("Pokedex: dropdown created");
        
        // Setup navigation buttons for abilities/moves
        this.setupNavigationButtons();
        console.log("Pokedex: navigation buttons setup");
        
        // Update the dropdown to reflect the selected Pokémon
        if (this.selectionDropdown) {
            this.selectionDropdown.value = this.selectedSpeciesId.toString();
            console.log("Pokedex: dropdown value set to", this.selectedSpeciesId);
        }
        
        // Load initial Pokémon data
        this.loadPokemonData(this.selectedSpeciesId);
        console.log("Pokedex: Pokemon data loaded for", this.selectedSpeciesId);
        
        // Ensure everything is visible
        this.switchDisplay(this.currentDisplay);
        console.log("Pokedex: display mode set to", this.currentDisplay);
        
        // Debug container visibility and contents
        this._debugContainers();
        
        // Log the UI hierarchy
        this._logUIHierarchy();
        
        // Check if container is in the scene's display list
        this._checkSceneDisplayList();
        
        return true;
    }
    
    private setupContainers(): void {
        // Half dimensions of our container for easier positioning
        const halfWidth = this.CONTAINER_WIDTH / 2;
        const halfHeight = this.CONTAINER_HEIGHT / 2;
        
        // Calculate positions for left and right sections within the container
        // Use simple fractions of the container width to position the sections
        const leftSectionX = -halfWidth / 2; // Left section at 1/4 from left edge
        const rightSectionX = halfWidth / 2;  // Right section at 3/4 from left edge
        
        // Create containers properly as children of the pokedexContainer
        // SPRITE SECTION - top of left section
        this.spriteContainer = new Phaser.GameObjects.Container(this.scene, leftSectionX, -halfHeight / 2);
        this.spriteContainer.setName("spriteContainer");
        this.pokedexContainer.add(this.spriteContainer);
        
        // TYPING SECTION - below sprite
        this.typingContainer = new Phaser.GameObjects.Container(this.scene, leftSectionX, -halfHeight / 4);
        this.typingContainer.setName("typingContainer");
        this.pokedexContainer.add(this.typingContainer);
        
        // INFO SECTION - middle of left section
        this.infoContainer = new Phaser.GameObjects.Container(this.scene, leftSectionX, 0);
        this.infoContainer.setName("infoContainer");
        this.pokedexContainer.add(this.infoContainer);
        
        // STATS SECTION - bottom of left section
        this.statsContainer = new Phaser.GameObjects.Container(this.scene, leftSectionX, halfHeight / 2);
        this.statsContainer.setName("statsContainer");
        this.pokedexContainer.add(this.statsContainer);
        
        // ABILITIES SECTION - right section
        this.abilitiesContainer = new Phaser.GameObjects.Container(this.scene, rightSectionX, 0);
        this.abilitiesContainer.setName("abilitiesContainer");
        this.abilitiesContainer.setVisible(this.currentDisplay === PokedexDisplayMode.ABILITIES);
        this.pokedexContainer.add(this.abilitiesContainer);
        
        // MOVES SECTION - right section (same position as abilities, toggled visibility)
        this.movesContainer = new Phaser.GameObjects.Container(this.scene, rightSectionX, 0);
        this.movesContainer.setName("movesContainer");
        this.movesContainer.setVisible(this.currentDisplay === PokedexDisplayMode.MOVES);
        this.pokedexContainer.add(this.movesContainer);
        
        // SCROLL CONTAINER - for scrollable content within moves
        this.moveScrollContainer = new Phaser.GameObjects.Container(this.scene, 0, 0);
        this.moveScrollContainer.setName("moveScrollContainer");
        this.movesContainer.add(this.moveScrollContainer);
        
        console.log("Pokedex: Container setup complete with positions", {
            mainContainerSize: { width: this.CONTAINER_WIDTH, height: this.CONTAINER_HEIGHT },
            spriteContainer: { x: this.spriteContainer.x, y: this.spriteContainer.y },
            typingContainer: { x: this.typingContainer.x, y: this.typingContainer.y },
            statsContainer: { x: this.statsContainer.x, y: this.statsContainer.y },
            abilitiesContainer: { x: this.abilitiesContainer.x, y: this.abilitiesContainer.y },
            movesContainer: { x: this.movesContainer.x, y: this.movesContainer.y }
        });
    }
    
    private createPokemonDropdown(): void {
        // Create HTML dropdown for Pokémon selection
        const dropdown = document.createElement('select');
        dropdown.style.position = 'absolute';
        
        // Get the canvas bounding rectangle
        const canvasRect = this.scene.game.canvas.getBoundingClientRect();
        
        // Calculate the absolute position of the dropdown
        // The pokedexContainer is centered, so we need to offset from its center
        // to position the dropdown in the top-left area of the pokedex UI
        
        // First get the absolute position of the pokedexContainer's top-left corner in canvas coordinates
        const pokedexLeft = this.pokedexContainer.x - this.CONTAINER_WIDTH / 2;
        const pokedexTop = this.pokedexContainer.y - this.CONTAINER_HEIGHT / 2;
        
        // Position the dropdown with appropriate margins
        const dropdownMargin = 20;
        const dropdownX = pokedexLeft + dropdownMargin;
        const dropdownY = pokedexTop + dropdownMargin;
        
        // The game is scaled by a factor of 6 when rendering
        const gameScaleFactor = 6;
        
        // Calculate the scaling factor between logical canvas size and displayed size
        const screenScaleX = canvasRect.width / this.scene.game.canvas.width;
        const screenScaleY = canvasRect.height / this.scene.game.canvas.height;
        
        // Convert the dropdown position to browser window coordinates
        const windowX = canvasRect.left + (dropdownX * screenScaleX * gameScaleFactor);
        const windowY = canvasRect.top + (dropdownY * screenScaleY * gameScaleFactor);
        
        // Apply the calculated position and styling
        dropdown.style.left = `${windowX}px`;
        dropdown.style.top = `${windowY}px`;
        dropdown.style.width = '100px';
        dropdown.style.zIndex = '1000';
        dropdown.style.backgroundColor = '#334455';
        dropdown.style.color = '#ffffff';
        dropdown.style.border = '1px solid #6688aa';
        dropdown.style.borderRadius = '3px';
        dropdown.style.padding = '2px';
        dropdown.style.fontSize = '12px';
        
        let hasAddedOptions = false;
        
        // Add entry for enemy Pokémon if in battle
        if (this.scene.currentBattle) {
            const enemyPokemon = this.scene.getEnemyField();
            if (enemyPokemon && enemyPokemon.length > 0) {
                const firstEnemyPokemon = enemyPokemon[0];
                const enemySpecies = firstEnemyPokemon.getSpeciesForm().speciesId;
                const enemyOption = document.createElement('option');
                enemyOption.value = enemySpecies.toString();
                const speciesKey = Object.keys(Species).find(key => Species[key] === enemySpecies);
                if (speciesKey) {
                    enemyOption.text = i18next.t(`pokemon:${speciesKey.toLowerCase()}`);
                } else {
                    enemyOption.text = `Unknown (${enemySpecies})`;
                }
                enemyOption.selected = enemySpecies === this.selectedSpeciesId;
                dropdown.add(enemyOption);
                hasAddedOptions = true;
            }
        }
        
        // Add entries for player's party Pokémon
        if (this.scene.currentBattle) {
            const playerParty = this.scene.getParty();
            if (playerParty && playerParty.length > 0) {
                playerParty.forEach(pokemon => {
                    if (pokemon) {
                        const speciesId = pokemon.getSpeciesForm().speciesId;
                        const option = document.createElement('option');
                        option.value = speciesId.toString();
                        const speciesKey = Object.keys(Species).find(key => Species[key] === speciesId);
                        if (speciesKey) {
                            option.text = i18next.t(`pokemon:${speciesKey.toLowerCase()}`);
                        } else {
                            option.text = `Unknown (${speciesId})`;
                        }
                        option.selected = speciesId === this.selectedSpeciesId;
                        dropdown.add(option);
                        hasAddedOptions = true;
                    }
                });
            }
        }
        
        // If no options have been added (no battle or empty party/enemy field), add all available Pokémon
        if (!hasAddedOptions) {
            // Get all species from the Species enum except NONE (0)
            Object.entries(Species)
                .filter(([key, value]) => typeof value === 'number' && value > 0 && isNaN(Number(key)))
                .sort((a, b) => (a[1] as number) - (b[1] as number))
                .forEach(([key, value]) => {
                    try {
                        const option = document.createElement('option');
                        option.value = value.toString();
                        try {
                            option.text = i18next.t(`pokemon:${key.toLowerCase()}`);
                        } catch (e) {
                            option.text = key;
                        }
                        option.selected = value === this.selectedSpeciesId;
                        dropdown.add(option);
                    } catch (e) {
                        console.error(`Pokedex: Failed to add option for ${key}:`, e);
                    }
                });
        }
        
        // Event listener for dropdown changes
        dropdown.addEventListener('change', () => {
            const selectedSpeciesId = Number(dropdown.value) as Species;
            this.loadPokemonData(selectedSpeciesId);
        });
        
        document.body.appendChild(dropdown);
        this.selectionDropdown = dropdown;
        
        console.log("Pokedex: Dropdown positioned at", {
            pokedexX: this.pokedexContainer.x,
            pokedexY: this.pokedexContainer.y,
            dropdownCanvasX: dropdownX,
            dropdownCanvasY: dropdownY,
            dropdownWindowX: windowX,
            dropdownWindowY: windowY
        });
    }
    
    private setupNavigationButtons(): void {
        // Navigation buttons should be at the top of the container
        // Position relative to the top center of the container
        const navY = -this.CONTAINER_HEIGHT / 2 + this.TAB_HEIGHT / 2;
        const spacing = 60;
        const leftX = -spacing / 2;
        const rightX = spacing / 2;
        
        // Left navigation button - create directly
        this.navLeftButton = this.scene.add.sprite(leftX, navY, 'cursor_reverse');
        this.navLeftButton.setScale(0.75);
        this.navLeftButton.setInteractive({ useHandCursor: true });
        this.navLeftButton.on('pointerup', () => {
            this.switchDisplay(PokedexDisplayMode.ABILITIES);
            this.scene.ui.playSelect();
        });
        if (this.navLeftButton.anims.exists('cursor_reverse')) {
            this.navLeftButton.play('cursor_reverse');
        }
        
        // Right navigation button - create directly
        this.navRightButton = this.scene.add.sprite(rightX, navY, 'cursor');
        this.navRightButton.setScale(0.75);
        this.navRightButton.setInteractive({ useHandCursor: true });
        this.navRightButton.on('pointerup', () => {
            this.switchDisplay(PokedexDisplayMode.MOVES);
            this.scene.ui.playSelect();
        });
        if (this.navRightButton.anims.exists('cursor')) {
            this.navRightButton.play('cursor');
        }
        
        // Add labels for the two displays
        const abilitiesLabel = addTextObject(
            this.scene,
            leftX - 20,
            navY,
            i18next.t("pokemonInfo:abilities"),
            TextStyle.WINDOW
        );
        abilitiesLabel.setOrigin(1, 0.5);
        
        const movesLabel = addTextObject(
            this.scene,
            rightX + 20,
            navY,
            i18next.t("pokemonInfo:moves"),
            TextStyle.WINDOW
        );
        movesLabel.setOrigin(0, 0.5);
        
        // Add all elements to the pokedexContainer
        this.pokedexContainer.add([this.navLeftButton, this.navRightButton, abilitiesLabel, movesLabel]);
        
        console.log("Pokedex: Navigation buttons positioned at", {
            leftButton: { x: leftX, y: navY },
            rightButton: { x: rightX, y: navY },
            abilitiesLabel: { x: leftX - 20, y: navY },
            movesLabel: { x: rightX + 20, y: navY }
        });
    }
    
    private loadPokemonData(speciesId: Species): void {
        this.selectedSpeciesId = speciesId;
        console.log("Pokedex: loadPokemonData started for", speciesId);
        
        // Clear existing content
        this.spriteContainer.removeAll(true);
        this.typingContainer.removeAll(true);
        this.statsContainer.removeAll(true);
        this.abilitiesContainer.removeAll(true);
        this.moveScrollContainer.removeAll(true);
        console.log("Pokedex: Cleared existing container contents");
        
        // Get species data
        const speciesData = getPokemonSpecies(speciesId);
        console.log("Pokedex: Retrieved species data", speciesData ? "successfully" : "failed");
        
        if (!speciesData) {
            // Handle case where species data isn't available
            const errorText = addTextObject(
                this.scene,
                0, 0,
                "Pokemon data not found",
                TextStyle.WINDOW
            );
            errorText.setOrigin(0.5, 0.5);
            this.spriteContainer.add(errorText);
            console.error("Pokedex: Species data not found for", speciesId);
            return;
        }
        
        // Load sprite
        this.loadPokemonSprite(speciesId);
        
        // Set type icons
        this.setTypeIcons(speciesData.type1, speciesData.type2);
        console.log("Pokedex: Set type icons", { type1: speciesData.type1, type2: speciesData.type2 });
        
        // Set stats
        this.displayStats(speciesData.baseStats);
        console.log("Pokedex: Set stats", speciesData.baseStats);
        
        // Set abilities
        this.displayAbilities(speciesData.ability1, speciesData.ability2, speciesData.abilityHidden);
        console.log("Pokedex: Set abilities");
        
        // Set moves
        this.displayMoves(speciesId);
        console.log("Pokedex: Set moves");
        
        // Set default display mode
        this.switchDisplay(this.currentDisplay);
        console.log("Pokedex: Display mode set in loadPokemonData");
        
        // Debug container contents after loading
        this._debugContainers();
    }
    
    private loadPokemonSprite(speciesId: Species): void {
        // Clear any existing sprites first
        this.spriteContainer.removeAll(true);
        
        const speciesKey = Object.keys(Species).find(key => Species[key] === speciesId);
        console.log("Pokedex: loadPokemonSprite for", speciesKey);
        
        if (!speciesKey) {
            // Create a placeholder if species key not found
            const placeholder = this.scene.add.rectangle(0, 0, 64, 64, 0x888888);
            placeholder.setOrigin(0.5, 0.5);
            this.spriteContainer.add(placeholder);
            console.error("Pokedex: Species key not found for", speciesId);
            return;
        }
        
        const spriteKey = `pkmn__${speciesKey.toLowerCase()}`;
        console.log("Pokedex: Using sprite key", spriteKey);
        
        // Add Pokemon sprite
        if (this.scene.textures.exists(spriteKey)) {
            console.log("Pokedex: Sprite texture exists, creating sprite");
            this.pokemonSprite = this.scene.add.sprite(0, 0, spriteKey);
            this.pokemonSprite.setOrigin(0.5, 0.5);
            
            // Ensure the sprite is appropriately sized
            const MAX_SIZE = 64;
            const textureWidth = this.pokemonSprite.width;
            const textureHeight = this.pokemonSprite.height;
            
            if (textureWidth > MAX_SIZE || textureHeight > MAX_SIZE) {
                const scale = MAX_SIZE / Math.max(textureWidth, textureHeight);
                this.pokemonSprite.setScale(scale);
                console.log("Pokedex: Scaling sprite", { 
                    scale, 
                    original: { width: textureWidth, height: textureHeight },
                    scaled: { width: textureWidth * scale, height: textureHeight * scale }
                });
            }
            
            this.spriteContainer.add(this.pokemonSprite);
            console.log("Pokedex: Sprite added with size", {
                width: this.pokemonSprite.width,
                height: this.pokemonSprite.height,
                scale: this.pokemonSprite.scale,
                displayWidth: this.pokemonSprite.displayWidth,
                displayHeight: this.pokemonSprite.displayHeight
            });
        } else {
            // Try to load the sprite
            console.log("Pokedex: Sprite texture not found, attempting to load");
            try {
                const path = `images/pokemon/${speciesKey.toLowerCase()}.png`;
                console.log("Pokedex: Loading sprite from path", path);
                this.scene.load.image(spriteKey, path);
                this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                    console.log("Pokedex: Sprite loaded successfully");
                    if (this.active) { // Check if UI is still active before adding sprite
                        this.pokemonSprite = this.scene.add.sprite(0, 0, spriteKey);
                        this.pokemonSprite.setOrigin(0.5, 0.5);
                        
                        // Ensure the sprite is appropriately sized
                        const MAX_SIZE = 64;
                        const textureWidth = this.pokemonSprite.width;
                        const textureHeight = this.pokemonSprite.height;
                        
                        if (textureWidth > MAX_SIZE || textureHeight > MAX_SIZE) {
                            const scale = MAX_SIZE / Math.max(textureWidth, textureHeight);
                            this.pokemonSprite.setScale(scale);
                            console.log("Pokedex: Scaling sprite after loading", { 
                                scale, 
                                original: { width: textureWidth, height: textureHeight },
                                scaled: { width: textureWidth * scale, height: textureHeight * scale }
                            });
                        }
                        
                        // Remove placeholder if it exists
                        this.spriteContainer.removeAll(true);
                        
                        this.spriteContainer.add(this.pokemonSprite);
                        console.log("Pokedex: Sprite added after loading with size", {
                            width: this.pokemonSprite.width,
                            height: this.pokemonSprite.height,
                            scale: this.pokemonSprite.scale,
                            displayWidth: this.pokemonSprite.displayWidth,
                            displayHeight: this.pokemonSprite.displayHeight
                        });
                    }
                });
                
                // Use Phaser's error event
                this.scene.load.once('loaderror', (fileObj: any) => {
                    console.error("Pokedex: Failed to load sprite:", fileObj);
                });
                
                this.scene.load.start();
            } catch (e) {
                console.error(`Pokedex: Failed to load sprite for ${speciesKey}:`, e);
            }
            
            // Placeholder until loaded
            console.log("Pokedex: Creating placeholder rectangle");
            const placeholder = this.scene.add.rectangle(0, 0, 64, 64, 0x888888);
            placeholder.setOrigin(0.5, 0.5);
            this.spriteContainer.add(placeholder);
        }
    }
    
    private setTypeIcons(type1: Type, type2: Type | null): void {
        // Add type icons
        this.type1Icon = this.scene.add.sprite(0, 0, Utils.getLocalizedSpriteKey("types"));
        this.type1Icon.setFrame(Type[type1].toLowerCase());
        this.type1Icon.setOrigin(0, 0.5);
        this.type1Icon.setScale(0.8); // Add scale to ensure visibility
        this.typingContainer.add(this.type1Icon);
        
        if (type2 !== null && type2 !== type1) {
            this.type2Icon = this.scene.add.sprite(20, 0, Utils.getLocalizedSpriteKey("types"));
            this.type2Icon.setFrame(Type[type2].toLowerCase());
            this.type2Icon.setOrigin(0, 0.5);
            this.type2Icon.setScale(0.8); // Add scale to ensure visibility
            this.typingContainer.add(this.type2Icon);
        }
        
        console.log("Pokedex: Type icons set", {
            type1: Type[type1],
            type2: type2 !== null ? Type[type2] : null,
            iconsAdded: type2 !== null && type2 !== type1 ? 2 : 1
        });
    }
    
    private displayStats(baseStats: number[]): void {
        // Clear any existing stats display
        this.statsContainer.removeAll(true);
        
        const statNames = ["HP", "ATK", "DEF", "SP.ATK", "SP.DEF", "SPD"];
        const statColors = [0x4a90e2, 0xff5555, 0xffaa33, 0xaa55ff, 0x55aa55, 0xff55aa];
        
        // Add stat labels and bars
        for (let i = 0; i < baseStats.length; i++) {
            const statValue = baseStats[i];
            const y = i * 6;
            
            // Stat label
            const label = addTextObject(
                this.scene,
                -35,
                y,
                statNames[i],
                TextStyle.WINDOW,
                { fontSize: '40px' }
            );
            label.setOrigin(0, 0);
            
            // Stat value
            const valueText = addTextObject(
                this.scene,
                -5,
                y,
                statValue.toString(),
                TextStyle.WINDOW,
                { fontSize: '40px' }
            );
            valueText.setOrigin(1, 0);
            
            // Stat bar
            const maxWidth = 50;
            const barWidth = Math.max(3, Math.min(maxWidth, (statValue / 255) * maxWidth));
            const bar = this.scene.add.rectangle(0, y + 2, barWidth, 3, statColors[i]);
            bar.setOrigin(0, 0);
            
            this.statsContainer.add([label, valueText, bar]);
        }
        
        // Add total stats
        const totalValue = baseStats.reduce((sum, val) => sum + val, 0);
        const totalLabel = addTextObject(
            this.scene,
            -35,
            baseStats.length * 6 + 3,
            "TOTAL",
            TextStyle.WINDOW,
            { fontSize: '40px' }
        );
        totalLabel.setOrigin(0, 0);
        
        const totalValueText = addTextObject(
            this.scene,
            25,
            baseStats.length * 6 + 3,
            totalValue.toString(),
            TextStyle.WINDOW,
            { fontSize: '40px' }
        );
        totalValueText.setOrigin(0.5, 0);
        
        this.statsContainer.add([totalLabel, totalValueText]);
        
        console.log("Pokedex: Stats display created with", baseStats.length, "stats and total", totalValue);
    }
    
    private displayAbilities(ability1: Abilities, ability2: Abilities, abilityHidden: Abilities): void {
        // Clear any existing abilities display
        this.abilitiesContainer.removeAll(true);
        
        const abilities = [
            { name: ability1, hidden: false },
            { name: ability2, hidden: false },
            { name: abilityHidden, hidden: true }
        ].filter(a => a.name !== Abilities.NONE && !REMOVED_ABILITIES.includes(a.name));
        
        // Title
        const title = addTextObject(
            this.scene,
            0,
            -30,
            i18next.t("pokemonInfo:abilities"),
            TextStyle.WINDOW,
            { fontSize: '60px', fontStyle: 'bold' }
        );
        title.setOrigin(0.5, 0.5);
        this.abilitiesContainer.add(title);
        
        // Display each ability with name and description
        let yOffset = 0;
        
        abilities.forEach((ability, index) => {
            // Format ability name from enum
            const abilityKey = Object.keys(Abilities).find(key => Abilities[key] === ability.name);
            const abilityI18nKey = abilityKey.split("_").filter(f => f).map((f, i) =>
                i ? `${f[0]}${f.slice(1).toLowerCase()}` : f.toLowerCase()
            ).join("");
            
            // Add ability name
            const namePrefix = ability.hidden ? "H: " : index + 1 + ": ";
            const nameText = addTextObject(
                this.scene,
                -50,
                yOffset,
                namePrefix + i18next.t(`ability:${abilityI18nKey}.name`),
                TextStyle.WINDOW,
                { fontSize: '45px', fontStyle: ability.hidden ? 'italic' : 'normal' }
            );
            nameText.setOrigin(0, 0.5);
            
            // Add ability description
            const descText = addTextObject(
                this.scene,
                -50,
                yOffset + 10,
                i18next.t(`ability:${abilityI18nKey}.description`),
                TextStyle.WINDOW,
                { 
                    fontSize: '35px',
                    wordWrap: { width: 100, useAdvancedWrap: true }
                }
            );
            descText.setOrigin(0, 0);
            
            this.abilitiesContainer.add([nameText, descText]);
            yOffset += 10 + descText.height / 6 + 5;
        });
    }
    
    private displayMoves(speciesId: Species): void {
        // Clear existing content
        this.moveScrollContainer.removeAll(true);
        
        // Get level-up moves for the species
        const levelMoves = pokemonSpeciesLevelMoves[speciesId] || [];
        
        // Get egg moves for the species
        const eggMoves = speciesEggMoves[speciesId] || [];
        
        // Title for level moves
        const levelMovesTitle = addTextObject(
            this.scene,
            0,
            -30,
            i18next.t("pokemonInfo:learnableMoves"),
            TextStyle.WINDOW,
            { fontSize: '60px', fontStyle: 'bold' }
        );
        levelMovesTitle.setOrigin(0.5, 0.5);
        this.moveScrollContainer.add(levelMovesTitle);
        
        // Display level-up moves
        let yOffset = 0;
        
        levelMoves.filter(move => move[0] > 0).sort((a, b) => a[0] - b[0]).forEach(([level, moveId]) => {
            const moveName = this.getMoveName(moveId);
            const levelText = addTextObject(
                this.scene,
                -50,
                yOffset,
                `Lv ${level}: ${moveName}`,
                TextStyle.WINDOW,
                { fontSize: '45px' }
            );
            levelText.setOrigin(0, 0.5);
            this.moveScrollContainer.add(levelText);
            yOffset += 10;
        });
        
        // Title for egg moves
        const eggMovesTitle = addTextObject(
            this.scene,
            0,
            yOffset + 5,
            i18next.t("pokemonInfo:eggMoves"),
            TextStyle.WINDOW,
            { fontSize: '60px', fontStyle: 'bold' }
        );
        eggMovesTitle.setOrigin(0.5, 0.5);
        this.moveScrollContainer.add(eggMovesTitle);
        
        // Display egg moves
        yOffset += 20;
        
        eggMoves.forEach((moveId) => {
            const moveName = this.getMoveName(moveId);
            const moveText = addTextObject(
                this.scene,
                -50,
                yOffset,
                `• ${moveName}`,
                TextStyle.WINDOW,
                { fontSize: '45px' }
            );
            moveText.setOrigin(0, 0.5);
            this.moveScrollContainer.add(moveText);
            yOffset += 10;
        });
        
        // Set the scrolling origin for the move list
        this.scrollPosition = 0;
        this.moveScrollContainer.y = 0;
    }
    
    private getMoveName(moveId: Moves): string {
        const move = allMoves[moveId];
        if (!move) return "Unknown";
        
        // Try to get localized move name
        const moveKey = Object.keys(Moves).find(key => Moves[key] === moveId);
        try {
            return i18next.t(`move:${moveKey.toLowerCase()}`);
        } catch (e) {
            return move.name;
        }
    }
    
    private switchDisplay(mode: PokedexDisplayMode): void {
        this.currentDisplay = mode;
        console.log("Pokedex: switchDisplay called with mode", mode);
        
        // Update UI based on current display mode
        switch (mode) {
            case PokedexDisplayMode.ABILITIES:
                this.abilitiesContainer.setVisible(true);
                this.movesContainer.setVisible(false);
                console.log("Pokedex: Switched to ABILITIES display");
                break;
            case PokedexDisplayMode.MOVES:
                this.abilitiesContainer.setVisible(false);
                this.movesContainer.setVisible(true);
                console.log("Pokedex: Switched to MOVES display");
                break;
        }
        
        // Check if containers are within view bounds
        this._checkContainerBounds();
    }
    
    // Add a check for container bounds to see if they're off-screen
    private _checkContainerBounds(): void {
        console.log("Pokedex: Checking container bounds");
        
        // Check the main container bounds relative to the canvas
        const checkContainer = (name: string, container: Phaser.GameObjects.Container) => {
            if (!container) return;
            
            // For the main container, check against canvas bounds
            if (container === this.pokedexContainer) {
                const isOutOfBounds = 
                    container.x < 0 || 
                    container.x > this.scene.scaledCanvas.width || 
                    container.y < 0 || 
                    container.y > this.scene.scaledCanvas.height;
                
                console.log(`Container ${name} bounds:`, {
                    x: container.x,
                    y: container.y,
                    outOfBounds: isOutOfBounds,
                    canvasWidth: this.scene.scaledCanvas.width,
                    canvasHeight: this.scene.scaledCanvas.height
                });
            } 
            // For child containers, just report their local position
            else {
                console.log(`Child container ${name} local position:`, {
                    x: container.x,
                    y: container.y,
                    parent: container.parentContainer?.name || "none"
                });
            }
        };
        
        checkContainer("main", this.pokedexContainer);
        checkContainer("sprite", this.spriteContainer);
        checkContainer("typing", this.typingContainer);
        checkContainer("stats", this.statsContainer);
        checkContainer("info", this.infoContainer);
        checkContainer("abilities", this.abilitiesContainer);
        checkContainer("moves", this.movesContainer);
    }
    
    scrollMoves(direction: number): void {
        const currentY = this.moveScrollContainer.y;
        const containerHeight = this.moveScrollContainer.height;
        const viewportHeight = 70; // Approximate visible height
        const scrollStep = 10;
        
        console.log("Scroll moves:", {
            direction,
            currentY,
            containerHeight,
            viewportHeight
        });
        
        if (direction < 0 && currentY < 0) {
            // Scroll up (show content higher up)
            this.moveScrollContainer.setY(Math.min(0, currentY + scrollStep));
            console.log("Scrolling up to:", this.moveScrollContainer.y);
        } else if (direction > 0 && containerHeight > viewportHeight && currentY > -(containerHeight - viewportHeight)) {
            // Scroll down (show content lower down)
            this.moveScrollContainer.setY(Math.max(-(containerHeight - viewportHeight), currentY - scrollStep));
            console.log("Scrolling down to:", this.moveScrollContainer.y);
        }
    }
    
    processInput(button: Button): boolean {
        let success = false;
        
        switch (button) {
            case Button.LEFT:
                if (this.currentDisplay === PokedexDisplayMode.MOVES) {
                    this.switchDisplay(PokedexDisplayMode.ABILITIES);
                    success = true;
                }
                break;
                
            case Button.RIGHT:
                if (this.currentDisplay === PokedexDisplayMode.ABILITIES) {
                    this.switchDisplay(PokedexDisplayMode.MOVES);
                    success = true;
                }
                break;
                
            case Button.UP:
                if (this.currentDisplay === PokedexDisplayMode.MOVES) {
                    this.scrollMoves(-1);
                    success = true;
                }
                break;
                
            case Button.DOWN:
                if (this.currentDisplay === PokedexDisplayMode.MOVES) {
                    this.scrollMoves(1);
                    success = true;
                }
                break;
                
            case Button.CANCEL:
                this.clear();
                this.scene.ui.revertMode();
                success = true;
                break;
        }
        
        if (success) {
            this.scene.ui.playSelect();
        }
        
        return success;
    }
    
    clear(): void {
        // Ensure dropdown is removed from the DOM
        if (this.selectionDropdown && this.selectionDropdown.parentNode) {
            this.selectionDropdown.parentNode.removeChild(this.selectionDropdown);
            this.selectionDropdown = null;
        }
        
        // Properly dispose of all containers and game objects
        if (this.pokedexContainer) {
            // Fade out animation before destroying
            this.scene.tweens.add({
                targets: this.pokedexContainer,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    if (this.pokedexContainer) {
                        // Make sure to use destroy(true) to destroy all children as well
                        this.pokedexContainer.destroy(true);
                        this.pokedexContainer = null;
                    }
                }
            });
        }
        
        // Clear references to child containers to prevent memory leaks
        this.spriteContainer = null;
        this.typingContainer = null;
        this.statsContainer = null;
        this.infoContainer = null;
        this.abilitiesContainer = null;
        this.movesContainer = null;
        this.moveScrollContainer = null;
        
        // Call parent clear method
        super.clear();
    }
    
    // Add a debug method to check all containers
    private _debugContainers(): void {
        console.log("Pokedex Debug - Container hierarchy:");
        
        const logContainerDetails = (container: Phaser.GameObjects.Container, name: string, isChild: boolean = false) => {
            if (!container) return;
            
            const prefix = isChild ? "  └─ " : "";
            console.log(`${prefix}${name}:`, {
                visible: container.visible,
                position: { x: container.x, y: container.y },
                children: container.list?.length || 0,
                parent: container.parentContainer?.name || "scene"
            });
            
            // Log child containers if any
            container.list?.forEach(child => {
                if (child instanceof Phaser.GameObjects.Container) {
                    logContainerDetails(child, child.name || "unnamed", true);
                }
            });
        };
        
        // Log the main container and its children
        logContainerDetails(this.pokedexContainer, "pokedexContainer");
    }
    
    // Log the UI hierarchy to understand parent-child relationships
    private _logUIHierarchy(): void {
        console.log("Pokedex: Logging UI hierarchy");
        
        const logContainer = (container: Phaser.GameObjects.Container, prefix: string = "") => {
            if (!container) return;
            
            console.log(`${prefix}Container (${container.name || "unnamed"}):`);
            console.log(`${prefix}- Position: x=${container.x}, y=${container.y}`);
            console.log(`${prefix}- Visible: ${container.visible}`);
            console.log(`${prefix}- Alpha: ${container.alpha}`);
            console.log(`${prefix}- Depth: ${container.depth}`);
            console.log(`${prefix}- Scale: x=${container.scaleX}, y=${container.scaleY}`);
            console.log(`${prefix}- Children: ${container.list.length}`);
            
            container.list.forEach((child, index) => {
                // Cast child to any to access common properties for debugging only
                const gameObj = child as any;
                console.log(`${prefix}  Child ${index}: ${gameObj.type} (${gameObj.name || "unnamed"})`);
                console.log(`${prefix}  - Visible: ${gameObj.visible !== undefined ? gameObj.visible : 'N/A'}`);
                console.log(`${prefix}  - Alpha: ${gameObj.alpha !== undefined ? gameObj.alpha : 'N/A'}`);
                console.log(`${prefix}  - Depth: ${gameObj.depth !== undefined ? gameObj.depth : 'N/A'}`);
                
                if (child instanceof Phaser.GameObjects.Container) {
                    logContainer(child, `${prefix}    `);
                }
            });
        };
        
        logContainer(this.pokedexContainer);
    }
    
    // Check if pokedex objects are properly in the scene's display list
    private _checkSceneDisplayList(): void {
        console.log("Pokedex: Checking scene display list");
        if (!this.scene.children) {
            console.log("Scene children not available");
            return;
        }
        
        console.log("Scene display list size:", this.scene.children.list.length);
        
        // Look for our container in the display list
        const pokedexInList = this.scene.children.list.find(obj => obj.name === "pokedexContainer");
        console.log("Pokedex container in scene display list:", !!pokedexInList);
        
        // Look for our debug marker
        const markerInList = this.scene.children.list.find(obj => obj.name === "pokedexDebugMarker");
        console.log("Debug marker in scene display list:", !!markerInList);
        
        // Check UI container and its children
        if (this.scene.ui) {
            try {
                // @ts-ignore - Accessing UI methods for debugging
                const uiContainer = this.scene.ui.getElement();
                if (uiContainer) {
                    console.log("UI container exists with", uiContainer.list ? uiContainer.list.length : 0, "children");
                    const pokedexInUI = uiContainer.list && uiContainer.list.find(obj => obj === this.pokedexContainer);
                    console.log("Pokedex container is child of UI container:", !!pokedexInUI);
                } else {
                    console.log("UI container not found");
                }
            } catch (e) {
                console.log("Could not access UI container:", e);
            }
        }
    }
    
    // Check Phaser scene status
    private _checkSceneStatus(): void {
        console.log("Pokedex: Checking Phaser scene status");
        console.log("Scene active:", this.scene.scene.isActive());
        console.log("Scene visible:", this.scene.scene.isVisible());
        console.log("Scene key:", this.scene.scene.key);
        console.log("Canvas dimensions:", {
            width: this.scene.game.canvas.width,
            height: this.scene.game.canvas.height,
            scaledWidth: this.scene.scaledCanvas.width,
            scaledHeight: this.scene.scaledCanvas.height
        });
        
        // Check if there are other UI modes active
        if (this.scene.ui) {
            // Use safer access for potentially private properties
            try {
                // @ts-ignore - Accessing private UI properties for debugging
                console.log("Current UI mode:", this.scene.ui.mode);
                // @ts-ignore - Accessing private UI properties for debugging
                console.log("Previous UI mode:", this.scene.ui.prevModes);
            } catch (e) {
                console.log("Could not access UI mode information");
            }
        }
        
        // Check if canvas is properly attached to DOM
        const canvasParent = this.scene.game.canvas.parentElement;
        console.log("Canvas in DOM:", !!canvasParent, canvasParent);
    }
} 