import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Species } from "../enums/species";
import { Abilities } from "../enums/abilities";
import { Type } from "../data/type";
import { Stat } from "../enums/stat";
import { Button } from "../enums/buttons";
import PokemonSpecies, { getPokemonSpecies, SpeciesFormKey } from "../data/pokemon-species";
import { pokemonSpeciesLevelMoves} from "../data/pokemon-level-moves";
import { speciesEggMoves } from "../data/egg-moves";
import { addWindow } from "./ui-theme";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { REMOVED_ABILITIES } from "../modifier/modifier-type";
import { allMoves } from "../data/move";
import { Moves } from "../enums/moves";
import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { RewardType } from "../system/game-data";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import Pokemon, { EnemyPokemon } from "#app/field/pokemon.js";
import { pokemonEvolutions } from "../data/pokemon-evolutions";
enum PokedexDisplayMode {
    ABILITIES,
    MOVES
}

export default class PokedexModalUiHandler extends ModalUiHandler {
    private spriteContainer: Phaser.GameObjects.Container;
    private infoContainer: Phaser.GameObjects.Container;
    private typingContainer: Phaser.GameObjects.Container;
    private statsContainer: Phaser.GameObjects.Container;
    
    private abilitiesContainer: Phaser.GameObjects.Container;
    private movesContainer: Phaser.GameObjects.Container;
    private eggMovesContainer: Phaser.GameObjects.Container;
    private moveScrollContainer: Phaser.GameObjects.Container;
    
    private selectionDropdown: HTMLSelectElement;
    private formSelectionDropdown: HTMLSelectElement;
    private pokemonSprite: Phaser.GameObjects.Sprite;
    private type1Icon: Phaser.GameObjects.Sprite;
    private type2Icon: Phaser.GameObjects.Sprite;
    
    private navLeftButton: Phaser.GameObjects.Sprite;
    private navRightButton: Phaser.GameObjects.Sprite;
    
    private currentDisplay: PokedexDisplayMode = PokedexDisplayMode.ABILITIES;
    private selectedSpeciesId: Species;
    private selectedFormIndex: number = 0;
    private scrollPosition: number = 0;
    private readonly MAX_VISIBLE_MOVES = 9;
    
    private readonly CONTAINER_WIDTH = 300;
    private readonly CONTAINER_HEIGHT = 170;
    private readonly MARGIN_TOP = 5;
    private readonly MARGIN_LEFT = 0;
    private readonly TAB_HEIGHT = 50;
    private enemyPokemon: EnemyPokemon = null;
    
    constructor(scene: BattleScene) {
        super(scene, Mode.POKEDEX);
    }
    
    getModalTitle(): string {
        return i18next.t("pokedex:voidex");
    }
    
    getWidth(): number {
        return this.CONTAINER_WIDTH;
    }
    
    getHeight(): number {
        return this.CONTAINER_HEIGHT;
    }
    
    getMargin(): [number, number, number, number] {
        return [this.MARGIN_TOP, 0, 0, this.MARGIN_LEFT];
    }
    
    getButtonLabels(): string[] {
        return [i18next.t("menu:close")];
    }
    
    setup(): void {
        super.setup();
        
        this.setupContainers();
        
    }
    
    show(args: any[]): boolean {
        if (this.active) {
            return false;
        }
        
        const config: ModalConfig = {
            buttonActions: [() => {
                this.clear();
                this.scene.ui.revertMode();
            }]
        };
        
        if (this.scene.currentBattle) {
            const enemyPokemon = this.scene.getEnemyField();
            if (enemyPokemon && enemyPokemon.length > 0) {
                this.enemyPokemon = enemyPokemon[0];
                this.selectedSpeciesId = enemyPokemon[0].getSpeciesForm().speciesId;
            } 
            else if (args.length > 0 && typeof args[0] === 'number') {
                this.selectedSpeciesId = args[0];
            } else {
                const speciesValues = Object.values(Species).filter(value => typeof value === 'number') as number[];
                const randomIndex = Math.floor(Math.random() * speciesValues.length);
                this.selectedSpeciesId = speciesValues[randomIndex] as Species;
            }
        } else if (args.length > 0 && typeof args[0] === 'number') {
            this.selectedSpeciesId = args[0];
        } else {
            const speciesValues = Object.values(Species).filter(value => typeof value === 'number') as number[];
            const randomIndex = Math.floor(Math.random() * speciesValues.length);
            this.selectedSpeciesId = speciesValues[randomIndex] as Species;
        }
        
        if (super.show([config])) {
            
            this.createPokemonDropdown();
            
            if (this.selectionDropdown) {
                if (!this.enemyPokemon) {
                    this.selectionDropdown.value = this.selectedSpeciesId.toString();
                }
                this.navLeftButton?.setVisible(true);
                this.navRightButton?.setVisible(true);
            } else {
                 this.navLeftButton?.setVisible(false);
                 this.navRightButton?.setVisible(false);
            }
            
            this.loadPokemonData(this.selectedSpeciesId);
            
            
            return true;
        }
        
        return false;
    }
    
    clear(): void {
        if (this.selectionDropdown) {
            try {
                if (this.selectionDropdown.parentNode) {
                    this.selectionDropdown.parentNode.removeChild(this.selectionDropdown);
                }
            } catch (e) {
                
            }
            this.selectionDropdown = null;
        }
        
        if (this.formSelectionDropdown) {
            try {
                if (this.formSelectionDropdown.parentNode) {
                    this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
                }
            } catch (e) {
                
            }
            this.formSelectionDropdown = null;
        }
        
        if (this.navLeftButton) {
            this.navLeftButton.off('pointerup');
        }
        
        if (this.navRightButton) {
            this.navRightButton.off('pointerup');
        }
        
        if (this.spriteContainer) {
            this.spriteContainer.removeAll(true);
        }
        
        if (this.typingContainer) {
            this.typingContainer.removeAll(true);
        }
        
        if (this.statsContainer) {
            this.statsContainer.removeAll(true);
        }
        
        if (this.abilitiesContainer) {
            this.abilitiesContainer.removeAll(true);
        }
        
        if (this.movesContainer) {
            this.movesContainer.removeAll(true);
        }

        if (this.eggMovesContainer) {
            this.eggMovesContainer.removeAll(true);
        }

        this.selectedFormIndex = 0;
        
        super.clear();
        
    }
    
    
    private createPokemonDropdown(): void {
        const dropdown = document.createElement('select');
        dropdown.style.position = 'absolute';

        const canvasRect = this.scene.game.canvas.getBoundingClientRect();

        const screenScaleX = canvasRect.width / this.scene.game.canvas.width;
        const screenScaleY = canvasRect.height / this.scene.game.canvas.height;

        const gameWidth = this.scene.game.canvas.width;
        const gameHeight = this.scene.game.canvas.height;

        const modalX = (gameWidth / 2) - (this.getWidth() / 2) + 20;
        const modalY = (gameHeight / 2) - (this.getHeight() / 2) + 20;

        const windowX = canvasRect.left + ((modalX / 6) * screenScaleX);
        const windowY = canvasRect.top + ((modalY / 6) * screenScaleY);

        dropdown.style.left = `${windowX}px`;
        dropdown.style.top = `${windowY}px`;
        dropdown.style.width = '120px';
        dropdown.style.zIndex = '10000';
        dropdown.style.backgroundColor = '#334455';
        dropdown.style.color = '#ffffff';
        dropdown.style.border = '1px solid #6688aa';
        dropdown.style.borderRadius = '3px';
        dropdown.style.padding = '2px';
        dropdown.style.fontSize = '12px';

        let initialSpeciesId: Species | null = null;
        let addedBattleOptions = false;

        if (this.scene.currentBattle) {
            const enemyPokemon = this.scene.getEnemyField();
            if (enemyPokemon && enemyPokemon.length > 0) {
                const firstEnemyPokemon = enemyPokemon[0];
                const enemySpecies = firstEnemyPokemon.getSpeciesForm().speciesId;
                const enemyOption = document.createElement('option');
                enemyOption.value = `enemy:${enemySpecies.toString()}`;
                const speciesKey = Object.keys(Species).find(key => Species[key] === enemySpecies);
                enemyOption.text = `${i18next.t('pokedex:enemyPrefix')}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t('pokemon:unknown')} (${enemySpecies})`}`;
                dropdown.add(enemyOption);
                addedBattleOptions = true;
                if (this.enemyPokemon && this.enemyPokemon.getSpeciesForm().speciesId === enemySpecies) {
                    enemyOption.selected = true;
                    initialSpeciesId = enemySpecies;
                }
            }

            const playerParty = this.scene.getParty();
            if (playerParty && playerParty.length > 0) {
                playerParty.forEach((pokemon, index) => {
                    if (pokemon) {
                        const speciesId = pokemon.getSpeciesForm().speciesId;
                        const option = document.createElement('option');
                        option.value = `party:${index}:${speciesId.toString()}`;
                        const speciesKey = Object.keys(Species).find(key => Species[key] === speciesId);
                        option.text = `${i18next.t('pokedex:partyPrefix')} ${index + 1}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t('pokemon:unknown')} (${speciesId})`}`;
                        dropdown.add(option);
                         addedBattleOptions = true;
                        if (this.selectedSpeciesId === speciesId && !initialSpeciesId) {
                             option.selected = true;
                             initialSpeciesId = speciesId;
                        }
                    }
                });
            }

            const pokemonToAddEvolutionsFor: Species[] = [];
            if (enemyPokemon && enemyPokemon.length > 0) {
                pokemonToAddEvolutionsFor.push(enemyPokemon[0].getSpeciesForm().speciesId);
            }
            if (playerParty && playerParty.length > 0) {
                playerParty.forEach(pokemon => {
                    if (pokemon) {
                        pokemonToAddEvolutionsFor.push(pokemon.getSpeciesForm().speciesId);
                    }
                });
            }

            const addedEvolutionSpecies = new Set<Species>();

            const addEvolutionsToDropdown = (speciesId: Species, addedSet: Set<Species>) => {
                 const evolutions = pokemonEvolutions[speciesId] || [];
                 for (const evolution of evolutions) {
                     if (!addedSet.has(evolution.speciesId)) {
                         const evolutionSpeciesId = evolution.speciesId;
                         const evolutionSpeciesData = getPokemonSpecies(evolutionSpeciesId);
                         if (evolutionSpeciesData) {
                              const evolutionOption = document.createElement('option');
                             evolutionOption.value = `evolution:${evolutionSpeciesId.toString()}`;
                             const speciesKey = Object.keys(Species).find(key => Species[key] === evolutionSpeciesId);
                             evolutionOption.text = `${i18next.t('pokedex:evolutionPrefix')}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t('pokemon:unknown')} (${evolutionSpeciesId})`}`;
                             dropdown.add(evolutionOption);
                             addedBattleOptions = true;
                             addedSet.add(evolutionSpeciesId);

                             addEvolutionsToDropdown(evolutionSpeciesId, addedSet);
                         }
                     }
                 }
             };

            pokemonToAddEvolutionsFor.forEach(speciesId => {
                 addEvolutionsToDropdown(speciesId, addedEvolutionSpecies);
            });

            if (addedBattleOptions) {
                const separatorOption = document.createElement('option');
                separatorOption.value = 'separator';
                separatorOption.text = i18next.t('pokedex:allOtherPokemon');
                separatorOption.disabled = true;
                dropdown.add(separatorOption);
            }
        }

        Object.entries(Species)
            .filter(([key, value]) => typeof value === 'number' && value > 0 && isNaN(Number(key)))
            .sort((a, b) => (a[1] as number) - (b[1] as number))
            .forEach(([key, value]) => {
                const speciesId = value as Species;
                const isAlreadyAdded = dropdown.options.length > 0 && Array.from(dropdown.options).some(opt => {
                     const optValue = opt.value;
                     if (optValue === speciesId.toString()) return true;
                     if (optValue.startsWith('enemy:') || optValue.startsWith('party:')) {
                         const parts = optValue.split(':');
                         if (parts.length >= 2 && parseInt(parts[parts.length - 1], 10) === speciesId) {
                             return true;
                         }
                     }
                     return false;
                });


                if (!isAlreadyAdded) {
                    try {
                        const option = document.createElement('option');
                        option.value = speciesId.toString(); 
                        try {
                            option.text = i18next.t(`pokemon:${key.toLowerCase()}`);
                        } catch (e) {
                            option.text = key;
                        }
                        if (this.selectedSpeciesId === speciesId && !initialSpeciesId) {
                            option.selected = true;
                            initialSpeciesId = speciesId;
                        }
                        dropdown.add(option);
                    } catch (e) {

                    }
                }
            });

        if (!initialSpeciesId && dropdown.options.length > 0) {
             const firstValidOption = Array.from(dropdown.options).find(opt => !opt.disabled);
             if (firstValidOption) {
                firstValidOption.selected = true;
                 const selectedValue = firstValidOption.value;
                 if (selectedValue.startsWith('enemy:')) {
                     const enemyPokemon = this.scene.getEnemyField();
                     if (enemyPokemon && enemyPokemon.length > 0) {
                         this.loadPokemonData(enemyPokemon[0]);
                     }
                 } else if (selectedValue.startsWith('party:')) {
                     const parts = selectedValue.split(':');
                     const partyIndex = parseInt(parts[1], 10);
                     const playerParty = this.scene.getParty();
                     if (playerParty && playerParty.length > partyIndex && playerParty[partyIndex]) {
                         this.loadPokemonData(playerParty[partyIndex]);
                     }
                 } else {
                     this.loadPokemonData(Number(selectedValue) as Species);
                 }
             }
         } else if (initialSpeciesId) {
              const selectedOption = Array.from(dropdown.options).find(opt => opt.selected);
              if (selectedOption) {
                  if (selectedOption.value.startsWith('enemy:')) {
                      if (this.enemyPokemon) {
                          this.loadPokemonData(this.enemyPokemon);
                      } 
                  } else if (selectedOption.value.startsWith('party:')) {
                      const parts = selectedOption.value.split(':');
                      const partyIndex = parseInt(parts[1], 10);
                      const playerParty = this.scene.getParty();
                      if (playerParty && playerParty.length > partyIndex && playerParty[partyIndex]) {
                          this.loadPokemonData(playerParty[partyIndex]);
                      }
                  } else if (selectedOption.value.startsWith('evolution:')) {
                       const parts = selectedOption.value.split(':');
                       const evolutionSpeciesId = parseInt(parts[1], 10) as Species;
                       this.loadPokemonData(evolutionSpeciesId);
                       this.loadPokemonData(Number(selectedOption.value) as Species);
                  }
              }
         }


        dropdown.addEventListener('change', () => {
            const selectedValue = dropdown.value;

            if (this.formSelectionDropdown && this.formSelectionDropdown.parentNode) {
                this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
                this.formSelectionDropdown = null;
            }
            this.selectedFormIndex = 0;


            if (selectedValue.startsWith('enemy:')) {
                const enemyPokemon = this.scene.getEnemyField();
                 if (enemyPokemon && enemyPokemon.length > 0) {
                     this.loadPokemonData(enemyPokemon[0]);
                 }

            } else if (selectedValue.startsWith('party:')) {
                const parts = selectedValue.split(':');
                const partyIndex = parseInt(parts[1], 10);
                const playerParty = this.scene.getParty();
                if (playerParty && playerParty.length > partyIndex && playerParty[partyIndex]) {
                    this.loadPokemonData(playerParty[partyIndex]);
                }
            } else if (selectedValue.startsWith('evolution:')) {
                 const parts = selectedValue.split(':');
                 const evolutionSpeciesId = parseInt(parts[1], 10) as Species;
                 this.loadPokemonData(evolutionSpeciesId);
            } else if (selectedValue !== 'separator') {
                 const selectedSpeciesId = Number(selectedValue) as Species;
                this.loadPokemonData(selectedSpeciesId);
            }
        });

        document.body.appendChild(dropdown);
        this.selectionDropdown = dropdown;
        this.navLeftButton?.setVisible(true);
        this.navRightButton?.setVisible(true);
    }

    private createFormSelectionDropdown(speciesId: Species): void {
        const speciesData = getPokemonSpecies(speciesId);
        if (!speciesData || !speciesData.forms || speciesData.forms.length <= 1) {
            return;
        }

        const validFormsWithIndices = speciesData.forms
            .map((form, originalIndex) => ({ form, originalIndex }))
            .filter(({ form }) => {
                const formKey = (form as any).formKey as SpeciesFormKey | undefined;
                const formName = (form as any).formName as string | undefined;

                if (!formKey || !formName) {
                    return true;
                }

                if (formKey.includes('smitty')) {
                    return this.scene.gameData.isUniSmittyFormUnlocked(formName);
                } else if (formKey.includes('glitch')) {
                    if (getModPokemonName(speciesId, formName)) {
                        return true;
                    } else {
                        const rewardTypeMap: { [key in SpeciesFormKey]?: RewardType } = {
                            [SpeciesFormKey.GLITCH]: RewardType.GLITCH_FORM_A,
                            [SpeciesFormKey.GLITCH_B]: RewardType.GLITCH_FORM_B,
                            [SpeciesFormKey.GLITCH_C]: RewardType.GLITCH_FORM_C,
                            [SpeciesFormKey.GLITCH_D]: RewardType.GLITCH_FORM_D,
                            [SpeciesFormKey.GLITCH_E]: RewardType.GLITCH_FORM_E,
                            [SpeciesFormKey.SMITTY]: RewardType.SMITTY_FORM,
                            [SpeciesFormKey.SMITTY_B]: RewardType.SMITTY_FORM_B,
                        };
                        const rewardType = rewardTypeMap[formKey];
                        return rewardType !== undefined && this.scene.gameData.canUseGlitchOrSmittyForm(speciesId, rewardType);
                    }
                }
                return true;
            });

        if (validFormsWithIndices.length <= 1) {
            return;
        }

        if (this.formSelectionDropdown && this.formSelectionDropdown.parentNode) {
            this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
            this.formSelectionDropdown = null;
        }

        const dropdown = document.createElement('select');
        dropdown.style.position = 'absolute';

        const canvasRect = this.scene.game.canvas.getBoundingClientRect();
        const screenScaleX = canvasRect.width / this.scene.game.canvas.width;
        const screenScaleY = canvasRect.height / this.scene.game.canvas.height;
        const gameWidth = this.scene.game.canvas.width;
        const gameHeight = this.scene.game.canvas.height;
        const modalX = (gameWidth / 2) - (this.getWidth() / 2) + 20;
        const modalY = (gameHeight / 2) - (this.getHeight() / 2) + 20;
        const windowX = canvasRect.left + ((modalX / 6) * screenScaleX) + 140;
        const windowY = canvasRect.top + ((modalY / 6) * screenScaleY);

        dropdown.style.left = `${windowX}px`;
        dropdown.style.top = `${windowY}px`;
        dropdown.style.width = '120px';
        dropdown.style.zIndex = '10000';
        dropdown.style.backgroundColor = '#334455';
        dropdown.style.color = '#ffffff';
        dropdown.style.border = '1px solid #6688aa';
        dropdown.style.borderRadius = '3px';
        dropdown.style.padding = '2px';
        dropdown.style.fontSize = '12px';

        validFormsWithIndices.forEach(({ form, originalIndex }) => {
            const option = document.createElement('option');
            option.value = originalIndex.toString();
            
            let localizedName = form.formName;
            const formKey = (form as any).formKey as SpeciesFormKey | undefined;
            
            if (formKey) {
                if (formKey.includes('glitch')) {
                    const modName = getModPokemonName(speciesId, form.formName);
                    localizedName = modName || i18next.t(`glitchNames:${form.formName.toLowerCase()}.name`);
                } else if (formKey.includes('smitty')) {
                    localizedName = i18next.t(`smittyNames:${form.formName}.name`);
                } else if (formKey === SpeciesFormKey.MEGA || 
                           formKey === SpeciesFormKey.PRIMAL || 
                           formKey === SpeciesFormKey.ETERNAMAX || 
                           formKey === SpeciesFormKey.MEGA_X || 
                           formKey === SpeciesFormKey.MEGA_Y ||
                           formKey.includes(SpeciesFormKey.GIGANTAMAX)) {
                    localizedName = i18next.t(`battlePokemonForm:${formKey}`, {pokemonName: speciesData.name});
                } else {
                    const formKeyLower = formKey.toLowerCase();
                    if (i18next.exists(`pokemon-form:${formKeyLower}`)) {
                        localizedName = i18next.t(`pokemon-form:${formKeyLower}`);
                    }
                }
            }

            option.text = localizedName;
            option.selected = originalIndex === this.selectedFormIndex;
            dropdown.add(option);
        });

        dropdown.addEventListener('change', () => {
            this.selectedFormIndex = parseInt(dropdown.value, 10);
            this.updatePokemonDisplay(speciesId, this.selectedFormIndex);
        });

        document.body.appendChild(dropdown);
        this.formSelectionDropdown = dropdown;
    }

    
    private loadPokemonData(pokemonData: Species | Pokemon): void {

        let speciesData: PokemonSpecies;
        let pokemonInstance: Pokemon | EnemyPokemon | null = null;

        if (pokemonData instanceof Pokemon) {
            this.selectedSpeciesId = pokemonData.species.speciesId;
            speciesData = pokemonData.species;
            pokemonInstance = pokemonData;
        }
        else {
            this.selectedSpeciesId = pokemonData;       
            speciesData = getPokemonSpecies(this.selectedSpeciesId);
        }

        this.spriteContainer.removeAll(true);
        this.typingContainer.removeAll(true);
        this.statsContainer.removeAll(true);
        this.abilitiesContainer.removeAll(true);
        this.movesContainer.removeAll(true);
        this.eggMovesContainer.removeAll(true);


        if (!speciesData) {
            const errorText = addTextObject(
                this.scene,
                0, 0,
                i18next.t('pokedex:pokemonDataNotFound'),
                TextStyle.WINDOW
            );
            errorText.setOrigin(0.5, 0.5);
            this.spriteContainer.add(errorText);
            return;
        }

        if (speciesData.forms && speciesData.forms.length > 1) {
            this.createFormSelectionDropdown(this.selectedSpeciesId);
            let initialFormIndex = this.selectedFormIndex;
            if (pokemonInstance) {
                const instanceForm = pokemonInstance.getSpeciesForm();
                 const foundIndex = speciesData.forms.findIndex(form => form === instanceForm);
                 if(foundIndex !== -1) {
                     initialFormIndex = foundIndex;
                     this.selectedFormIndex = initialFormIndex;
                 }
            }
            this.updatePokemonDisplay(this.selectedSpeciesId, initialFormIndex);
        } else {
            this.selectedFormIndex = 0;
            this.loadPokemonSprite(this.selectedSpeciesId, 0);
            this.setTypeIcons(speciesData.type1, speciesData.type2);
            this.displayStats(speciesData.baseStats);
            this.displayAbilities(speciesData.ability1, speciesData.ability2, speciesData.abilityHidden);
            this.displayLearnableMoves(this.selectedSpeciesId);
            this.displayEggMoves(this.selectedSpeciesId);
        }
    }

    private updatePokemonDisplay(speciesId: Species, formIndex: number): void {
        const speciesData = getPokemonSpecies(speciesId);
        if (!speciesData) return;

        const form = formIndex < speciesData.forms.length ? speciesData.forms[formIndex] : speciesData;

        this.loadPokemonSprite(speciesId, formIndex);
        this.setTypeIcons(form.type1, form.type2);
        this.displayStats(form.baseStats);
        this.displayAbilities(form.ability1, form.ability2, form.abilityHidden);
        this.displayLearnableMoves(speciesId);
        this.displayEggMoves(speciesId);
    }
    
    private async loadPokemonSprite(speciesId: Species, formIndex: number = 0): Promise<void> {

        this.spriteContainer.removeAll(true);

        const speciesData = getPokemonSpecies(speciesId);

        if (!speciesData) {
            const errorText = addTextObject(
                this.scene,
                0, 0,
                i18next.t('pokedex:pokemonDataNotFound'),
                TextStyle.WINDOW
            );
            errorText.setOrigin(0.5, 0.5);
            this.spriteContainer.add(errorText);
            return;
        }

        const form = formIndex < speciesData.forms.length ? speciesData.forms[formIndex] : speciesData;

        let isGlitchOrSmittyForm = false;
        let formKey = null;
        let formName = null;

        if (form !== speciesData && typeof (form as any).formKey === 'string' && typeof (form as any).formName === 'string') {
             formKey = (form as any).formKey as SpeciesFormKey;
             formName = (form as any).formName as string;
             isGlitchOrSmittyForm = formKey?.includes('glitch') || formKey?.includes('smitty');
        }


        const loadingText = addTextObject(
            this.scene,
            0, 0,
            i18next.t('pokedex:loading'),
            TextStyle.WINDOW,
            { fontSize: '35px' }
        );
        loadingText.setOrigin(0.5, 0.5);
        this.spriteContainer.add(loadingText);


        try {
            let spriteKey;
            if (isGlitchOrSmittyForm && formName) {
                const sanitizedFormName = formName.toLowerCase().replace(/[^a-z0-9]/g, '');
                spriteKey = `pkmn__glitch__${sanitizedFormName}`;

                if (!this.scene.textures.exists(spriteKey)) {
                     await new Promise<void>((resolve, reject) => {
                        this.scene.load.embeddedAtlas(
                            spriteKey,
                            `images/pokemon/glitch/${sanitizedFormName}.png`
                        );

                        this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                            if (this.scene.anims && typeof this.scene.anims.create === 'function' && !this.scene.anims.exists(spriteKey)) {
                                if (this.scene.textures.get(spriteKey).getFrameNames().length > 1) {
                                     this.scene.anims.create({
                                        key: spriteKey,
                                        frames: this.scene.anims.generateFrameNames(spriteKey),
                                        frameRate: 24,
                                        repeat: -1
                                    });
                                } else {
                                     this.scene.anims.create({
                                        key: spriteKey,
                                        frames: [{ key: spriteKey }],
                                        frameRate: 1,
                                        repeat: -1
                                    });
                                }
                            }
                            resolve();
                        });

                        this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
                            reject(new Error(`Failed to load glitch texture: ${file.key}`));
                        });

                        if (!this.scene.load.isLoading()) {
                            this.scene.load.start();
                        }
                     });
                }

            } else {
                await speciesData.loadAssets(this.scene, false, formIndex, false, 0, true);
                spriteKey = speciesData.getSpriteKey(false, formIndex, false, 0);
            }


            const pokemonSprite = (this.scene as BattleScene).addPokemonSprite(
                null,
                0,
                0,
                spriteKey,
                undefined,
                false,
                true
            );
            pokemonSprite.setOrigin(0.5, 0.5);

            const MAX_SIZE = 64;
            const textureWidth = pokemonSprite.width;
            const textureHeight = pokemonSprite.height;

            if (textureWidth > MAX_SIZE || textureHeight > MAX_SIZE) {
                const scale = MAX_SIZE / Math.max(textureWidth, textureHeight);
                pokemonSprite.setScale(scale);
            }

            this.spriteContainer.removeAll(true);
            this.spriteContainer.add(pokemonSprite);
            this.pokemonSprite = pokemonSprite;

             if (this.pokemonSprite.texture.frameTotal > 1 && this.scene.anims.exists(this.pokemonSprite.texture.key)) {
                this.pokemonSprite.play(this.pokemonSprite.texture.key);
            }

            if (!isGlitchOrSmittyForm && this.scene.spritePipeline) {
                this.pokemonSprite.setPipeline(this.scene.spritePipeline);
                 this.pokemonSprite.setPipelineData("shiny", false);
                 this.pokemonSprite.setPipelineData("variant", 0);
            }

        } catch (e) {
            console.error("Failed to load or add pokemon sprite:", e);
            this.spriteContainer.removeAll(true);
            const errorText = addTextObject(
                this.scene,
                0, 0,
                i18next.t('pokedex:errorLoadingSprite'),
                TextStyle.WINDOW
            );
            errorText.setOrigin(0.5, 0.5);
            this.spriteContainer.add(errorText);
        }
    }
    
    private setTypeIcons(type1: Type, type2: Type | null): void {
        
        this.type1Icon = this.scene.add.sprite(3, 0, Utils.getLocalizedSpriteKey("types"));
        this.type1Icon.setFrame(Type[type1].toLowerCase());
        this.type1Icon.setOrigin(0, 0.5);
        this.type1Icon.setScale(0.5);
        this.typingContainer.add(this.type1Icon);
        
        if (type2 !== null && type2 !== type1) {
            this.type2Icon = this.scene.add.sprite(23, 0, Utils.getLocalizedSpriteKey("types"));
            this.type2Icon.setFrame(Type[type2].toLowerCase());
            this.type2Icon.setOrigin(0, 0.5);
            this.type2Icon.setScale(0.5);
            this.typingContainer.add(this.type2Icon);
            
        } else {
             
        }
    }
    
    private displayStats(baseStats: number[]): void {
        
        this.statsContainer.removeAll(true);
        const statNames = [i18next.t('pokemonInfo:Stat.HPStat'), i18next.t('pokemonInfo:Stat.ATKshortened'), i18next.t('pokemonInfo:Stat.DEFshortened'), i18next.t('pokemonInfo:Stat.SPATKshortened'), i18next.t('pokemonInfo:Stat.SPDEFshortened'), i18next.t('pokemonInfo:Stat.SPDshortened')];
        const statColors = [0x4a90e2, 0xff5555, 0xffaa33, 0xaa55ff, 0x55aa55, 0xff55aa];

        const startY = 0;
        const lineSpacing = 8;
        const labelX = 0;
        const valueX = 22;
        const barX = 25;
        const barHeight = 4;

        for (let i = 0; i < baseStats.length; i++) {
            const statValue = baseStats[i];
            const y = startY + i * lineSpacing;
            
            const label = addTextObject(
                this.scene,
                labelX,
                y,
                statNames[i],
                TextStyle.WINDOW,
                { fontSize: '35px', fontStyle: 'bold' }
            );
            label.setOrigin(0, 0);
            
            const valueText = addTextObject(
                this.scene,
                valueX,
                y,
                statValue.toString(),
                TextStyle.WINDOW,
                { fontSize: '35px' }
            );
            valueText.setOrigin(1, 0);
            
            
            const maxWidth = 50;
            const barWidth = Math.max(3, Math.min(maxWidth, (statValue / 255) * maxWidth));
            const bar = this.scene.add.rectangle(barX, y + 1, barWidth, barHeight, statColors[i]);
            bar.setOrigin(0, 0);
            
            this.statsContainer.add([label, valueText, bar]);
        }
        
        const totalValue = baseStats.reduce((sum, val) => sum + val, 0);
        const totalY = startY + baseStats.length * lineSpacing + lineSpacing / 2;
        const totalLabel = addTextObject(
            this.scene,
            labelX,
            totalY,
            i18next.t('pokemonInfo:Stat.Total'),
            TextStyle.WINDOW,
            { fontSize: '35px' }
        );
        totalLabel.setOrigin(0, 0);
        
        const totalValueText = addTextObject(
            this.scene,
            valueX,
            totalY,
            totalValue.toString(),
            TextStyle.WINDOW,
            { fontSize: '35px' }
        );
        totalValueText.setOrigin(1, 0);
        
        this.statsContainer.add([totalLabel, totalValueText]);
        
    }
    
    private displayAbilities(ability1: Abilities, ability2: Abilities, abilityHidden: Abilities): void {
        
        this.abilitiesContainer.removeAll(true);
        
        
        const abilities = [
            { name: ability1, hidden: false },
            { name: ability2, hidden: false },
            { name: abilityHidden, hidden: true }
        ].filter(a => a.name !== Abilities.NONE);
        
        
        
        const title = addTextObject(
            this.scene,
            -70,
            0,
            i18next.t("pokedex:abilities"),
            TextStyle.WINDOW,
            { fontSize: '50px', fontStyle: 'bold' }
        );
        title.setOrigin(0, 0);
        this.abilitiesContainer.add(title);
        
        
        let yOffset = 10;
        const abilitySpacing = 5;
        
        abilities.forEach((ability, index) => {
            
            const abilityKey = Object.keys(Abilities).find(key => Abilities[key] === ability.name);
            const abilityI18nKey = abilityKey.split("_").filter(f => f).map((f, i) =>
                i ? `${f[0]}${f.slice(1).toLowerCase()}` : f.toLowerCase()
            ).join("");
            
            
            const namePrefix = ability.hidden ? "H: " : index + 1 + ": ";
            const nameText = addTextObject(
                this.scene,
                -70,
                yOffset,
                namePrefix + i18next.t(`ability:${abilityI18nKey}.name`),
                TextStyle.WINDOW,
                { fontSize: '45px', fontStyle: 'bold' }
            );
            nameText.setOrigin(0, 0);
            
            
            const descText = addTextObject(
                this.scene,
                -70,
                yOffset + 8,
                i18next.t(`ability:${abilityI18nKey}.description`),
                TextStyle.WINDOW,
                { 
                    fontSize: '35px',
                    wordWrap: { width: 500 }
                }
            );
            descText.setOrigin(0, 0);
            
            this.abilitiesContainer.add([nameText, descText]);
            
            yOffset += (descText.height / 6) + 8 + abilitySpacing;
        });
        
    }
    

    private displayLearnableMoves(speciesId: Species): number {
        
        const levelMoves = pokemonSpeciesLevelMoves[speciesId] || [];
        
        const movesByLevel: { [level: number]: Moves[] } = {};
        levelMoves.filter(move => move[0] >= -1).sort((a, b) => a[0] - b[0]).forEach(([level, moveId]) => {
            if (!movesByLevel[level]) {
                movesByLevel[level] = [];
            }
            movesByLevel[level].push(moveId);
        });

        const levels = Object.keys(movesByLevel).map(Number).sort((a, b) => a - b);

        const levelMovesTitle = addTextObject(
            this.scene,
            -70,
            0,
            i18next.t("pokedex:learnableMoves"),
            TextStyle.WINDOW,
            { fontSize: '50px', fontStyle: 'bold' }
        );
        levelMovesTitle.setOrigin(0, 0);
        this.movesContainer.add(levelMovesTitle);
        
        let yOffset = 10;
        const moveSpacing = 7;
        const moveStartX = -70;
        const column2StartX = moveStartX + 160;
        const MAX_LINES_PER_COLUMN = 16;
        let currentColumn = 1;
        let linesInCurrentColumn = 0;
        let currentX = moveStartX;

        levels.forEach(level => {
            const moves = movesByLevel[level];
            const moveNames = moves.map(moveId => this.getMoveName(moveId));
            const movesText = moveNames.join(", ");

            if (linesInCurrentColumn >= MAX_LINES_PER_COLUMN) {
                currentColumn = 2;
                currentX = column2StartX;
                yOffset = 10;
                linesInCurrentColumn = 0;
            }
            
            const levelText = addTextObject(
                this.scene,
                currentX,
                yOffset,
                `Lv ${level}: ${movesText}`,
                TextStyle.WINDOW,
                { 
                    fontSize: '35px',
                    wordWrap: { width: 300 }
                }
            );
            levelText.setOrigin(0, 0);
            this.movesContainer.add(levelText);
            
            const textHeight = levelText.height;
            yOffset += textHeight / 6;
            linesInCurrentColumn++;
        });
        
        return yOffset;
    }

    private displayEggMoves(speciesId: Species): number {
        
        const speciesData = getPokemonSpecies(speciesId);
        const rootSpeciesId = speciesData.getRootSpeciesId(false);
        
        const eggMoves = speciesEggMoves[rootSpeciesId] || [];
        const moveSpacing = 7;
        const eggMovesTitleY = 0;
        const eggMovesTitle = addTextObject(
            this.scene,
            -70,
            eggMovesTitleY,
            i18next.t("pokedex:eggMoves"),
            TextStyle.WINDOW,
            { fontSize: '50px', fontStyle: 'bold' }
        );
        eggMovesTitle.setOrigin(0, 0);
        this.eggMovesContainer.add(eggMovesTitle);

        
        let yOffset = eggMovesTitleY + moveSpacing + 5;
        const moveStartX = -70;

        eggMoves.forEach((moveId) => {
            const moveName = this.getMoveName(moveId);
            const moveText = addTextObject(
                this.scene,
                moveStartX,
                yOffset,
                `• ${moveName}`,
                TextStyle.WINDOW,
                { fontSize: '40px' }
            );
            moveText.setOrigin(0, 0);
            this.eggMovesContainer.add(moveText);
            yOffset += moveSpacing;
        });
        

        return yOffset;
    }
    
    private getMoveName(moveId: Moves): string {
        const move = allMoves[moveId];
        if (!move) return i18next.t('moves:unknown');

        return move.name;
        
    }

    processInput(button: Button): boolean {

        switch (button) {
        case Button.CANCEL:
        case Button.MENU:
        case Button.VOIDEX:
            this.clear();
            this.scene.ui.revertMode();
            this.scene.ui.playSelect();
            return true;

        case Button.LEFT:
            if (this.selectionDropdown) {
                let currentIndex = this.selectionDropdown.selectedIndex;
                let newIndex = currentIndex - 1;

                while (newIndex >= 0 && this.selectionDropdown.options[newIndex].disabled) {
                    newIndex--;
                }

                if (newIndex < 0) {
                    newIndex = this.selectionDropdown.options.length - 1;
                     while (newIndex >= 0 && this.selectionDropdown.options[newIndex].disabled) {
                         newIndex--;
                     }
                     if (newIndex < 0) newIndex = currentIndex;
                }

                if (newIndex !== currentIndex) {
                    this.selectionDropdown.selectedIndex = newIndex;
                    this.selectionDropdown.dispatchEvent(new Event('change'));
                    this.scene.ui.playSelect();
                    return true;
                }
            }
            break;

        case Button.RIGHT:
             if (this.selectionDropdown) {
                let currentIndex = this.selectionDropdown.selectedIndex;
                let newIndex = currentIndex + 1;

                while (newIndex < this.selectionDropdown.options.length && this.selectionDropdown.options[newIndex].disabled) {
                    newIndex++;
                }

                if (newIndex >= this.selectionDropdown.options.length) {
                    newIndex = 0;
                     while (newIndex < this.selectionDropdown.options.length && this.selectionDropdown.options[newIndex].disabled) {
                         newIndex++;
                     }
                     if (newIndex >= this.selectionDropdown.options.length) newIndex = currentIndex;
                }

                if (newIndex !== currentIndex) {
                    this.selectionDropdown.selectedIndex = newIndex;
                    this.selectionDropdown.dispatchEvent(new Event('change'));
                    this.scene.ui.playSelect();
                    return true;
                }
            }
            break;

        case Button.UP:
             if (this.formSelectionDropdown) {
                let currentIndex = this.formSelectionDropdown.selectedIndex;
                let newIndex = currentIndex - 1;

                if (newIndex < 0) {
                    newIndex = this.formSelectionDropdown.options.length - 1;
                }

                if (newIndex !== currentIndex) {
                    this.formSelectionDropdown.selectedIndex = newIndex;
                    this.formSelectionDropdown.dispatchEvent(new Event('change'));
                    this.scene.ui.playSelect();
                    return true;
                }
            }
            break;

        case Button.DOWN:
             if (this.formSelectionDropdown) {
                let currentIndex = this.formSelectionDropdown.selectedIndex;
                let newIndex = currentIndex + 1;

                if (newIndex >= this.formSelectionDropdown.options.length) {
                    newIndex = 0;
                }

                if (newIndex !== currentIndex) {
                    this.formSelectionDropdown.selectedIndex = newIndex;
                    this.formSelectionDropdown.dispatchEvent(new Event('change'));
                    this.scene.ui.playSelect();
                    return true;
                }
            }
            break;
        }

        return false;
    }
    
    private setupContainers(): void {
        const containerWidth = this.getWidth();
        const containerHeight = this.getHeight();
        
        const halfHeight = containerHeight / 2;
        const spriteY = halfHeight * 0.55;
        const typingY = containerHeight * 0.45;
        const infoY = halfHeight * 0.55;
        const statsY = containerHeight * 0.52;
        const abilitiesMovesY = halfHeight * 0.35;

        const sectionWidth = containerWidth / 4;
        
        const section1X = containerWidth * 0.05; 
        
        const section2X = sectionWidth * 2.2;
        
        const section3X = sectionWidth * 3.45;

        const section4X = sectionWidth * 4.25;
        
        this.spriteContainer = this.scene.add.container(section1X + 30, spriteY);
        this.spriteContainer.setName("spriteContainer");
        this.modalContainer.add(this.spriteContainer);
        
        
        this.typingContainer = this.scene.add.container(section1X + 10, typingY);
        this.typingContainer.setName("typingContainer");
        this.modalContainer.add(this.typingContainer);
        
        
        this.infoContainer = this.scene.add.container(section1X, infoY);
        this.infoContainer.setName("infoContainer");
        this.modalContainer.add(this.infoContainer);
        
        
        this.statsContainer = this.scene.add.container(section1X, statsY);
        this.statsContainer.setName("statsContainer");
        this.modalContainer.add(this.statsContainer);
        
        
        this.abilitiesContainer = this.scene.add.container(section2X, abilitiesMovesY);
        this.abilitiesContainer.setName("abilitiesContainer");
        this.abilitiesContainer.setVisible(true);
        this.modalContainer.add(this.abilitiesContainer);
        
        
        this.movesContainer = this.scene.add.container(section3X, abilitiesMovesY);
        this.movesContainer.setName("movesContainer");
        this.movesContainer.setVisible(true);
        this.modalContainer.add(this.movesContainer);

        
        this.eggMovesContainer = this.scene.add.container(section4X, abilitiesMovesY);
        this.eggMovesContainer.setName("eggMovesContainer");
        this.eggMovesContainer.setVisible(true);
        this.modalContainer.add(this.eggMovesContainer);
        
        this.navLeftButton = this.scene.add.sprite(-4, halfHeight, 'cursor_reverse');
        this.navLeftButton.setScale(0.75);
        this.navLeftButton.setInteractive({ useHandCursor: true });
        this.navLeftButton.setName("navLeftButton");
        this.navLeftButton.setVisible(false);
        this.modalContainer.add(this.navLeftButton);

        this.navRightButton = this.scene.add.sprite(containerWidth + 4, halfHeight, 'cursor');
        this.navRightButton.setScale(0.75);
        this.navRightButton.setInteractive({ useHandCursor: true });
        this.navRightButton.setName("navRightButton");
        this.navRightButton.setVisible(false);
        this.modalContainer.add(this.navRightButton);

        this.navLeftButton.on('pointerup', () => {
            this.processInput(Button.LEFT);
        });

        this.navRightButton.on('pointerup', () => {
            this.processInput(Button.RIGHT);
        });
    }
} 