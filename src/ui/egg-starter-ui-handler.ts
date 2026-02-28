import StarterSelectUiHandler, { OptionItem, Starter } from "./starter-select-ui-handler";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import i18next from "i18next";
import Pokemon from "../field/pokemon";
import { Nature } from "../data/nature";
import { PlayerPokemon } from "../field/pokemon";
import { StarterMoveset, StarterAttributes } from "../system/game-data";
import { PokemonIconAnimMode } from "./pokemon-icon-anim-handler";
import { TypeSwitcherModifier } from "../modifier/modifier";
import { getTypeRgb } from "../data/type";
import { Gender } from "../data/gender";
import { EnhancedTutorial } from "./tutorial-registry";
import { Button } from "#enums/buttons";
export type EggStarterSelectCallback = (selected: Starter | null, released: Pokemon | null) => void;

export default class eggStarterUi extends StarterSelectUiHandler {
    private hatchedPokemon: PlayerPokemon[] = [];
    private selectedPartyPokemonIndex: number = -1;
    private eggStarterSelectCallback: EggStarterSelectCallback | null = null;
    private legendaryEnabled: boolean = false;
    private currentParty: Pokemon[] = [];
    private titleText: Phaser.GameObjects.Text;
    private titleBg: Phaser.GameObjects.Rectangle;
    private newTitleBg: Phaser.GameObjects.Rectangle;
    private tipText: Phaser.GameObjects.Text;

    constructor(scene: BattleScene, mode: Mode = Mode.EGG_STARTER_SELECT) {
        super(scene, mode);
    }
    setup() {
        super.setup();

        const screenWidth = this.scene.game.canvas.width;
        const startX = screenWidth * 0.32;
        const width = screenWidth * 0.68;
        const bgHeight = 105;
        const bgCenterY = 10 + bgHeight / 2;

        this.titleBg = this.scene.add.rectangle(
            startX + width / 2,
            10,
            width,
            bgHeight,
            0x151515,
            0.90
        );
        this.titleBg.setOrigin(0.5, 0);
        this.titleBg.setDepth(999);
        this.titleBg.setScrollFactor(0);

        const newBgStartX = screenWidth * 0.15;
        const newBgWidth = screenWidth * 0.18;
        const newBgHeight = bgHeight * 0.76;
        const newBgCenterX = newBgStartX + newBgWidth / 2;
        const newBgCenterY = 10 + newBgHeight / 2;

        this.newTitleBg = this.scene.add.rectangle(
            newBgCenterX,
            10,
            newBgWidth,
            newBgHeight,
            0x151515,
            0.90
        );
        this.newTitleBg.setOrigin(0.5, 0);
        this.newTitleBg.setDepth(999);
        this.newTitleBg.setScrollFactor(0);

        const titleTextCenterX = newBgCenterX;

        this.titleText = this.scene.add.text(
            titleTextCenterX,
            newBgCenterY,
            i18next.t("eggStarterUi:hatchAndSwap", { defaultValue: "Hatch & Swap" }),
            {
                fontFamily: "emerald",
                fontSize: "40px",
                color: "#ffffff",
                align: "center"
            }
        );
        this.titleText.setOrigin(0.5, 0.5);
        this.titleText.setDepth(999);
        this.titleText.setScrollFactor(0);

        this.tipText = this.scene.add.text(
            startX + 35,
            bgCenterY,
            i18next.t("eggStarterUi:tooltip", {
                defaultValue: "Check hatched Pokémon and swap 1 for another (if you want).\nLegendaries can only be swapped with legendaries/mega/dyna."
            }),
            {
                fontFamily: "emerald",
                fontSize: "30px",
                color: "#ffffff",
                align: "left"
            }
        );
        this.tipText.setOrigin(0, 0.5);
        this.tipText.setDepth(999);
        this.tipText.setScrollFactor(0);

        this.titleBg.setVisible(false);
        this.newTitleBg.setVisible(false);
        this.titleText.setVisible(false);
        this.tipText.setVisible(false);
    }

    show(args: any[]): boolean {
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
                    this.addToParty(
                        pokemon.species,
                        this.getCurrentDexProps(pokemon.species.speciesId),
                        pokemon.abilityIndex,
                        pokemon.nature,
                        pokemon.moveset as StarterMoveset,
                        pokemon.fusionFormIndex || -1
                    );
                } else {
                    this.starterSpecies[i] = pokemon.species;
                }

                const speciesForm = pokemon.getSpeciesForm();
                this.starterIcons[i].setTexture(speciesForm.getIconAtlasKey(formIndex, shiny, variant));
                this.starterIcons[i].setFrame(speciesForm.getIconId(isFemale, formIndex, shiny, variant));
                this.checkIconId(this.starterIcons[i], speciesForm as any, isFemale, formIndex, shiny, variant);
                this.starterIcons[i].setVisible(true);
                const tsModifier = this.scene.findModifier(m =>
                    m instanceof TypeSwitcherModifier && (m as any).pokemonId === pokemon.id
                ) as TypeSwitcherModifier | undefined;
                if (tsModifier) {
                    const targetType = (tsModifier as any).newPrimaryType ?? (tsModifier as any).newSecondaryType;
                    if (targetType !== null && targetType !== undefined && targetType >= 0) {
                        const rgb = getTypeRgb(targetType);
                        if (rgb) {
                            this.starterIcons[i].setTint(Phaser.Display.Color.GetColor(rgb[0], rgb[1], rgb[2]));
                        }
                    }
                }
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
        this.blockInput = true;

        const selectedHatchedPokemon = this.lastSpecies;
        const starterPrefs = this.starterPreferences[selectedHatchedPokemon.speciesId] || {};

        const hasPassive = this.isPassiveAvailable(selectedHatchedPokemon.speciesId);
        const hasPokerus = this.pokerusSpecies.some(s => s.speciesId === selectedHatchedPokemon.speciesId);

        const selectedStarter: Starter = {
            species: selectedHatchedPokemon,
            dexAttr: this.dexAttrCursor,
            abilityIndex: this.abilityCursor,
            fusionIndex: this.fusionCursor,
            passive: hasPassive,
            nature: this.natureCursor as unknown as Nature,
            moveset: this.starterMoveset,
            pokerus: hasPokerus,
            nickname: starterPrefs.nickname
        };

        ui.setMode(this.getMode()).then(() => {
            const isLegendary = this.lastSpecies.isLegendSubOrMystical();
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

        const selectedHatchedPokemon = this.lastSpecies;
        const starterPrefs = this.starterPreferences[selectedHatchedPokemon.speciesId] || {};

        const hasPassive = this.isPassiveAvailable(selectedHatchedPokemon.speciesId);
        const hasPokerus = this.pokerusSpecies.some(s => s.speciesId === selectedHatchedPokemon.speciesId);

        const selectedStarter: Starter = {
            species: selectedHatchedPokemon,
            dexAttr: this.dexAttrCursor,
            abilityIndex: this.abilityCursor,
            fusionIndex: this.fusionCursor,
            passive: hasPassive,
            nature: this.natureCursor as unknown as Nature,
            moveset: this.starterMoveset,
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