import StarterSelectUiHandler, { OptionItem, Starter } from "./starter-select-ui-handler";
import BattleScene from "../battle-scene";
import { Mode } from "./mode";
import i18next from "i18next";
import Pokemon from "../field/pokemon";
import { Nature } from "../data/nature";
import { PlayerPokemon, PokemonMove } from "../field/pokemon";
import { StarterMoveset, StarterAttributes } from "../system/game-data";
import { PokemonIconAnimMode } from "./pokemon-icon-anim-handler";
import { applyTypeSwitcherIconRecolor } from "../utils/type-switcher-icon-recolor";
import { Gender } from "../data/gender";
import { EnhancedTutorial } from "./tutorial-registry";
import { Button } from "#enums/buttons";
import PokemonSpecies, { adjustDuelmonIconScale } from "../data/pokemon-species";
import { addTextObject, TextStyle } from "./text";
export type EggStarterSelectCallback = (selected: Starter | null, released: Pokemon | null) => void;

export default class eggStarterUi extends StarterSelectUiHandler {
    private hatchedPokemon: PlayerPokemon[] = [];
    private selectedPartyPokemonIndex: number = -1;
    private eggStarterSelectCallback: EggStarterSelectCallback | null = null;
    private legendaryEnabled: boolean = false;
    private currentParty: Pokemon[] = [];
    private _selectedHatchedSpecies: PokemonSpecies | null = null;
    private titleText: Phaser.GameObjects.Text;
    private titleBg: Phaser.GameObjects.Rectangle;
    private newTitleBg: Phaser.GameObjects.Rectangle;
    private tipText: Phaser.GameObjects.Text;

    constructor(scene: BattleScene, mode: Mode = Mode.EGG_STARTER_SELECT) {
        super(scene, mode);
    }
    setup() {
        super.setup();

        const gameWidth = this.scene.game.canvas.width / 6;
        const startX = gameWidth * 0.32;
        const width = gameWidth * 0.68;
        const bgHeight = 17.5;
        const bgCenterY = 1.67 + bgHeight / 2;

        this.titleBg = this.scene.add.rectangle(
            startX + width / 2,
            1.67,
            width,
            bgHeight,
            0x151515,
            0.90
        );
        this.titleBg.setOrigin(0.5, 0);

        const newBgStartX = gameWidth * 0.15;
        const newBgWidth = gameWidth * 0.18;
        const newBgHeight = bgHeight * 0.76;
        const newBgCenterX = newBgStartX + newBgWidth / 2;
        const newBgCenterY = 1.67 + newBgHeight / 2;

        this.newTitleBg = this.scene.add.rectangle(
            newBgCenterX,
            1.67,
            newBgWidth,
            newBgHeight,
            0x151515,
            0.90
        );
        this.newTitleBg.setOrigin(0.5, 0);

        const titleTextCenterX = newBgCenterX;

        this.titleText = addTextObject(this.scene, Math.round(titleTextCenterX), Math.round(newBgCenterY),
            i18next.t("eggStarterUi:hatchAndSwap", { defaultValue: "Hatch & Swap" }),
            TextStyle.WINDOW, { fontSize: "40px", color: "#ffffff", align: "center" });
        this.titleText.setOrigin(0.5, 0.5);

        this.tipText = addTextObject(this.scene, Math.round(startX + 5.83), Math.round(bgCenterY),
            i18next.t("eggStarterUi:tooltip", {
                defaultValue: "Check hatched Pokémon and swap 1 for another (if you want).\nLegendaries can only be swapped with legendaries/mega/dyna."
            }),
            TextStyle.WINDOW, { fontSize: "30px", color: "#ffffff", align: "left" });
        this.tipText.setOrigin(0, 0.5);

        this.starterSelectContainer.add(this.titleBg);
        this.starterSelectContainer.add(this.newTitleBg);
        this.starterSelectContainer.add(this.titleText);
        this.starterSelectContainer.add(this.tipText);

        this.titleBg.setVisible(false);
        this.newTitleBg.setVisible(false);
        this.titleText.setVisible(false);
        this.tipText.setVisible(false);
    }

    show(args: any[]): boolean {
        this._selectedHatchedSpecies = null;
        this.titleBg.setVisible(true);
        this.newTitleBg.setVisible(true);
        this.titleText.setVisible(true);
        this.tipText.setVisible(true);

        if (args.length >= 1) {
                        const hatchedPokemon = args[0] as PlayerPokemon[];

                        if (args.length >= 2 && args[1] instanceof Function) {
                this.eggStarterSelectCallback = args[1] as EggStarterSelectCallback;
            } else {
                this.eggStarterSelectCallback = null;
            }

            const speciesMap = new Map<number, PlayerPokemon>();

            for (const pokemon of hatchedPokemon) {
                const speciesId = pokemon.species.speciesId;
                const existingPokemon = speciesMap.get(speciesId);

                if (!existingPokemon || pokemon.shiny) {
                    speciesMap.set(speciesId, pokemon);
                }
            }

            this.hatchedPokemon = Array.from(speciesMap.values());

            const partyPokemon = this.scene.getParty();
            this.currentParty = partyPokemon;

            this.legendaryEnabled = [...partyPokemon].some(pokemon => pokemon.species.isLegendSubOrMystical() || pokemon.isMax() || pokemon.isMega());

            this.customizeUIForEggSelection();

            const result = super.show([this.dummyCallback.bind(this)]);

            this.displayPartyInStarterIcons(partyPokemon);

            this.populateHatchedPokemon();
            return result;
        }

        return false;
    }

    private customizeUIForEggSelection(): void {
        if (this.valueLimitLabel) {
            this.valueLimitLabel.setVisible(false);
        }

        if (this.filterBarContainer) {
            this.filterBarContainer.setVisible(false);
            this.filterInstructionsContainer.setVisible(false);
        }

        this.setFilterMode(false);

        if (this.fusionsButtonBg) this.fusionsButtonBg.setVisible(false);
        if (this.fusionsButtonIcon) this.fusionsButtonIcon.setVisible(false);
        if (this.fusionsButtonLabel) this.fusionsButtonLabel.setVisible(false);
        if (this.fusionsCursorObj) this.fusionsCursorObj.setVisible(false);
        this.fusionsFilterActive = false;

        const eggTeamY = 18;
        const eggTeamH = 132;
        if (this.teamWindow) {
            this.teamWindow.setPosition(285, eggTeamY);
            this.teamWindow.setSize(34, eggTeamH);
        }

        const eggSpacing = eggTeamH / 7;
        const eggFirstY = eggTeamY + eggSpacing / 2;
        for (let i = 0; i < this.starterIcons.length; i++) {
            this.starterIcons[i].setY(Math.round(eggFirstY + eggSpacing * i));
        }
    }

    private displayPartyInStarterIcons(partyPokemon: Pokemon[]): void {
                for (let i = 0; i < this.starterIcons.length; i++) {
            this.starterIcons[i].setTexture("pokemon_icons_0");
            this.starterIcons[i].setFrame("unknown");
            this.starterIcons[i].setVisible(false);
            }

                for (let i = 0; i < partyPokemon.length; i++) {
            if (i < this.starterIcons.length) {
                const pokemon = partyPokemon[i];
                const speciesId = pokemon.species.speciesId;
                const formIndex = pokemon.formIndex;
                const isFemale = pokemon.isFemale();
                const shiny = pokemon.shiny;
                const variant = pokemon.variant;

                if (i >= this.starterSpecies.length) {
                    const moveset = pokemon.getMoveset()
                        .filter((m): m is PokemonMove => m != null)
                        .map(m => m.moveId)
                        .slice(0, 4) as StarterMoveset;
                    this.addToParty(
                        pokemon.species,
                        this.getCurrentDexProps(pokemon.species.speciesId),
                        pokemon.abilityIndex,
                        pokemon.nature,
                        moveset,
                        pokemon.fusionFormIndex || -1
                    );
                } else {
                    this.starterSpecies[i] = pokemon.species;
                    const moveset = pokemon.getMoveset()
                        .filter((m): m is PokemonMove => m != null)
                        .map(m => m.moveId)
                        .slice(0, 4) as StarterMoveset;
                    if (i < this.starterMovesets.length) {
                        this.starterMovesets[i] = moveset;
                    }
                    if (i < this.starterAbilityIndexes.length) {
                        this.starterAbilityIndexes[i] = pokemon.abilityIndex;
                    }
                    if (i < this.starterNatures.length) {
                        this.starterNatures[i] = pokemon.nature;
                    }
                }

                const speciesForm = pokemon.getSpeciesForm();
                this.starterIcons[i].setTexture(speciesForm.getIconAtlasKey(formIndex, shiny, variant));
                this.starterIcons[i].setFrame(speciesForm.getIconId(isFemale, formIndex, shiny, variant));
                this.checkIconId(this.starterIcons[i], speciesForm as any, isFemale, formIndex, shiny, variant);
                const isGen20 = pokemon.species.generation === 20;
                this.starterIcons[i].setScale(isGen20 ? adjustDuelmonIconScale(0.5, 20) * 0.8 : 0.5);
                this.starterIcons[i].setVisible(true);
                applyTypeSwitcherIconRecolor(this.scene as BattleScene, pokemon, this.starterIcons[i], false);
                if (this.iconAnimHandler) {
                    this.iconAnimHandler.addOrUpdate(this.starterIcons[i], PokemonIconAnimMode.PASSIVE);
                }
            }
        }
    }

    private populateHatchedPokemon(): void {
                this.filteredStarterContainers = [];

                this.scrollCursor = 0;

                this.starterContainers.forEach(container => {
            container.setVisible(false);
        });

                const hatchedSpecies = this.hatchedPokemon.map(p => p.species);

                hatchedSpecies.forEach(species => {
                        const container = this.starterContainers.find(c => c.species.speciesId === species.speciesId);
            if (container) {
                                this.filteredStarterContainers.push(container);

                                container.icon.setAlpha(species.isLegendSubOrMystical() && !this.legendaryEnabled ? 0.375 : 1);
                                if(species.isLegendSubOrMystical() && !this.legendaryEnabled) {
                                    container.icon.setTint(0x808080);
                                } else {
                                    container.icon.clearTint();
                                }

            }
        });

                this.updateScroll();

                if (this.filteredStarterContainers.length > 0) {
                        this.setSpecies(this.filteredStarterContainers[0].species);
                        this.setCursor(0);
                }
    }

    updateStarters = (): void => {};

    resetFilters(): void {}

    processInput(button: Button): boolean {
        if (button === Button.SUBMIT) {
            return false;
        }
        return super.processInput(button);
    }

        getPokemonSelectedOptions(): OptionItem[] {
        const ui = this.getUi();
        const options: OptionItem[] = [];

        if (this.isEggModePartyPokemonSelected()) {
            return null;
        }

        if (!this.lastSpecies) {
            return options;
        }

        this._selectedHatchedSpecies = this.lastSpecies;

        const isLegendary = this.lastSpecies.isLegendSubOrMystical();
        const onlyOnePokemon = this.currentParty.length == 1;
        const canAddToParty = this.currentParty.length < 6 && !isLegendary;
        if (canAddToParty) {
            options.push({
                label: i18next.t("eggStarterUi:addToParty",
                    { defaultValue: "Add to Party" }),
                handler: () => {
                    this.showAddToPartyConfirmation();
                    return true;
                }
            });
        }

                if (isLegendary && !this.legendaryEnabled) {
                        options.push({
                label: i18next.t("eggStarterUi:legendaryDisabled",
                    { defaultValue: "Need Legendary/Mega/Dyna in Party" }),
                handler: () => {
                    ui.playError();
                    this.showText(i18next.t("eggStarterUi:legendaryDisabled",
                        { defaultValue: "You need to swap a legendary/mega/dyna for this Pokémon." }));
                    return false;
                }
            });
        }
        else if (onlyOnePokemon) {
            options.push({
                label: i18next.t("eggStarterUi:onlyOnePokemon",
                    { defaultValue: "Can't Swap: Only One Party Member" }),
                handler: () => {
                    ui.playError();
                    this.showText(i18next.t("eggStarterUi:onlyOnePokemon",
                        { defaultValue: "You can't swap with only one party member." }));
                    return false;
                }
            });
        }
        else {
                        options.push({
                label: i18next.t("eggStarterUi:swapWithParty",
                    { defaultValue: "Swap with party member" }),
                handler: () => {
                    this.showSwapOptions();
                    return true;
                }
            });
        }

                const parentOptions = super.getPokemonSelectedOptions();
        const filteredParentOptions = parentOptions.filter(option => {
            const label = option.label;
            return !label.includes(i18next.t("starterSelectUiHandler:addToParty")) &&
                   !label.includes(i18next.t("starterSelectUiHandler:removeFromParty"));
        });

                options.push(...filteredParentOptions);

        return options;
    }

    private showSwapOptions(): void {
        const ui = this.getUi();
        this._isSwapSelecting = true;
        this.blockInput = true;

        const selectedHatchedPokemon = this._selectedHatchedSpecies || this.lastSpecies;
        const starterPrefs = this.starterPreferences[selectedHatchedPokemon.speciesId] || {};

        const hasPassive = this.isPassiveAvailable(selectedHatchedPokemon.speciesId);
        const hasPokerus = this.pokerusSpecies.some(s => s.speciesId === selectedHatchedPokemon.speciesId);

        const hatchedMon = this.hatchedPokemon.find(p => p.species.speciesId === selectedHatchedPokemon.speciesId);

        const hatchedMoveset = (() => {
            if (hatchedMon) {
                const moves = hatchedMon.getMoveset().filter((m): m is PokemonMove => m != null).map(m => m.moveId).slice(0, 4) as StarterMoveset;
                return moves.length > 0 ? moves : this.starterMoveset;
            }
            return this.starterMoveset;
        })();

        const selectedStarter: Starter = {
            species: selectedHatchedPokemon,
            dexAttr: this.getCurrentDexProps(selectedHatchedPokemon.speciesId),
            abilityIndex: hatchedMon?.abilityIndex ?? this.abilityCursor,
            fusionIndex: hatchedMon?.fusionFormIndex ?? this.fusionCursor,
            passive: hasPassive,
            nature: hatchedMon?.nature ?? this.natureCursor as unknown as Nature,
            moveset: hatchedMoveset,
            pokerus: hasPokerus,
            nickname: starterPrefs.nickname
        };

        ui.setMode(this.getMode()).then(() => {
            const isLegendary = selectedHatchedPokemon.isLegendSubOrMystical();
            const messageKey = isLegendary ? "eggStarterUi:selectLegendaryPartyMember" : "eggStarterUi:selectPartyMember";
            const defaultMessage = isLegendary ? "Select a legendary/mega/dyna to swap with selected." : "Select a party member to swap with the hatched Pokémon.";

            ui.showText(i18next.t(messageKey, { defaultValue: defaultMessage }), null, () => {

                const eligiblePokemon = this.currentParty
                    .map((pokemon, originalIndex) => ({ pokemon, originalIndex }))
                    .filter(({ pokemon }) => !isLegendary || pokemon.species.isLegendSubOrMystical() || pokemon.isMega() || pokemon.isMax());

                const options = eligiblePokemon.map(({ pokemon, originalIndex }) => {
                    const speciesName = pokemon.species.getName();
                    const nameToRender = pokemon.getNameToRender();
                    const label = pokemon.nickname && (nameToRender === speciesName || nameToRender.startsWith(`${speciesName} (`))
                        ? nameToRender
                        : pokemon.nickname
                            ? `${speciesName} (${nameToRender})`
                            : speciesName;
                    return {
                        label,
                        handler: () => {
                            this.blockInput = true;
                            ui.setMode(this.getMode()).then(() => {
                                ui.showText(i18next.t("eggStarterUi:confirmSwapMessage", {
                                    defaultValue: "Swap {{hatchedPokemon}} with {{partyPokemon}}?",
                                    hatchedPokemon: selectedHatchedPokemon.name,
                                    partyPokemon: pokemon.species.name
                                }), null, () => {
                                    ui.setModeWithoutClear(Mode.CONFIRM, () => {
                                        if (this.eggStarterSelectCallback) {
                                            this._isSwapSelecting = false;
                                            this.clear();

                                            this.scene.ui.showText("", 0);

                                            this.eggStarterSelectCallback(selectedStarter, pokemon);
                                        }
                                    }, () => {
                                        this.showSwapOptions();
                                    });
                                });
                                this.blockInput = false;
                            });
                            return true;
                        },
                        onHover: () => {
                            this.starterIconsCursorIndex = originalIndex;
                            this.starterIconsCursorObj.setVisible(true);
                            this.moveStarterIconsCursor(originalIndex);
                        }
                    };
                });

                options.push({
                    label: i18next.t("menu:cancel"),
                    handler: () => {
                        this._isSwapSelecting = false;
                        this.clearText();
                        this.starterIconsCursorObj.setVisible(false);
                        ui.setMode(this.getMode());
                        this.blockInput = false;
                        return true;
                    },
                    onHover: () => {
                        this.starterIconsCursorObj.setVisible(false);
                    }
                });

                ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                    options: options,
                    supportHover: true,
                    maxOptions: 8,
                    yOffset: 19
                });

                if (eligiblePokemon.length > 0) {
                    this.starterIconsCursorIndex = eligiblePokemon[0].originalIndex;
                    this.starterIconsCursorObj.setVisible(true);
                    this.moveStarterIconsCursor(eligiblePokemon[0].originalIndex);
                }

                this.blockInput = false;
            });
        });
    }

    updateInstructions(): void {
        this.instructionsContainer.removeAll();
        this.instructionRowX = 0;
        this.instructionRowY = 0;

        super.updateInstructions();
    }

    private showAddToPartyConfirmation(): void {
        const ui = this.getUi();
        this.blockInput = true;

        const selectedHatchedPokemon = this._selectedHatchedSpecies || this.lastSpecies;
        const starterPrefs = this.starterPreferences[selectedHatchedPokemon.speciesId] || {};

        const hasPassive = this.isPassiveAvailable(selectedHatchedPokemon.speciesId);
        const hasPokerus = this.pokerusSpecies.some(s => s.speciesId === selectedHatchedPokemon.speciesId);

        const hatchedMon = this.hatchedPokemon.find(p => p.species.speciesId === selectedHatchedPokemon.speciesId);

        const hatchedMoveset = (() => {
            if (hatchedMon) {
                const moves = hatchedMon.getMoveset().filter((m): m is PokemonMove => m != null).map(m => m.moveId).slice(0, 4) as StarterMoveset;
                return moves.length > 0 ? moves : this.starterMoveset;
            }
            return this.starterMoveset;
        })();

        const selectedStarter: Starter = {
            species: selectedHatchedPokemon,
            dexAttr: this.getCurrentDexProps(selectedHatchedPokemon.speciesId),
            abilityIndex: hatchedMon?.abilityIndex ?? this.abilityCursor,
            fusionIndex: hatchedMon?.fusionFormIndex ?? this.fusionCursor,
            passive: hasPassive,
            nature: hatchedMon?.nature ?? this.natureCursor as unknown as Nature,
            moveset: hatchedMoveset,
            pokerus: hasPokerus,
            nickname: starterPrefs.nickname
        };

        ui.setMode(this.getMode()).then(() => {
            ui.showText(i18next.t("eggStarterUi:confirmAddMessage", {
                defaultValue: "Add {{hatchedPokemon}} to your party?",
                hatchedPokemon: selectedHatchedPokemon.name
            }), null, () => {
                ui.setModeWithoutClear(Mode.CONFIRM, () => {
                    if (this.eggStarterSelectCallback) {

                        this.clear();
                        this.scene.ui.showText("", 0);
                        this.eggStarterSelectCallback(selectedStarter, null);
                    }
                }, () => {

                    ui.setMode(this.getMode());
                    this.blockInput = false;
                });
            });
            this.blockInput = false;
        });
    }

    private dummyCallback(_starters: Starter[]): void {}

    isPartyValid(): boolean {
        return false;
    }

    protected getMode(): Mode {
        return Mode.EGG_STARTER_SELECT;
    }

    setFilterMode(filterMode: boolean): boolean {
                if (filterMode === true) {
            return false;
        }

        return super.setFilterMode(false);
    }

    getValueLimit(): integer {
        return 1000;
    }
    clear() {
        super.clear();
        this._selectedHatchedSpecies = null;

        this.titleBg.setVisible(false);
        this.newTitleBg.setVisible(false);
        this.titleText.setVisible(false);
        this.tipText.setVisible(false);
    }

    exitStarterSelect(): void {
        this.clear();
        this.scene.ui.showText("", 0);
        this.clearText();
        this.scene.getCurrentPhase()?.end();
    }
}