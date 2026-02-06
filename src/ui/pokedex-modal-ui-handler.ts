import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Species } from "../enums/species";
import { Abilities } from "../enums/abilities";
import { Type } from "../data/type";
import { Stat } from "../enums/stat";
import { Button } from "../enums/buttons";
import PokemonSpecies, { UniversalSmittyForm, getFusedSpeciesName, getPokemonSpecies, universalSmittyForms } from "../data/pokemon-species";
import { SpeciesFormKey } from "../enums/species-form-key";
import { pokemonSpeciesLevelMoves} from "../data/pokemon-level-moves";
import { POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { speciesEggMoves } from "../data/egg-moves";
import { Gender } from "../data/gender";
import { addWindow } from "./ui-theme";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { REMOVED_ABILITIES } from "../modifier/modifier-type";
import { allMoves } from "../data/move";
import { Moves } from "../enums/moves";
import { Nature } from "../enums/nature";
import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { RewardType } from "../enums/reward-type";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { modGlitchFormData, getModFormSystemName } from "../data/mod-glitch-form-data";
import Pokemon, { EnemyPokemon, PlayerPokemon } from "#app/field/pokemon.js";
import {
  pokemonEvolutions,
  pokemonPrevolutions,
  SpeciesFormEvolution,
  EvolutionItem,
  SpeciesEvolutionCondition,
  SpeciesFriendshipEvolutionCondition
} from "../data/pokemon-evolutions";
import {
  pokemonFormChanges,
  SpeciesFormChange,
  SpeciesFormChangeItemTrigger,
  SpeciesFormChangeWeatherTrigger,
  SpeciesFormChangeCompoundTrigger,
  SpeciesFormChangeManualTrigger,
  GlitchPieceTrigger,
  SmittyFormTrigger,
  AltBuildTrigger
} from "../data/pokemon-forms";
import { FormChangeItem } from "../enums/form-change-items";
import { WeatherType } from "../enums/weather-type";
import { modStorage } from "../system/mod-storage";
import { AddPokemonModifierType } from "../modifier/modifier-type";
import ModifierSelectUiHandler from "./modifier-select-ui-handler";
import { getPokedexMethodDescription } from "./pokedex-method-description";
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
  private evolutionContainer: Phaser.GameObjects.Container;
  private universalSmittyEvolveByText: Phaser.GameObjects.Text | null = null;

  private section4X: number = 0;
  private abilitiesMovesY: number = 0;

  private selectionDropdown: HTMLSelectElement;
  private formSelectionDropdown: HTMLSelectElement;
  private selectionDropdownClickHandler: ((event: MouseEvent) => void) | null = null;
  private formDropdownClickHandler: ((event: MouseEvent) => void) | null = null;
  private pokemonSprite: Phaser.GameObjects.Sprite;
  private type1Icon: Phaser.GameObjects.Sprite;
  private type2Icon: Phaser.GameObjects.Sprite;

  private navLeftButton: Phaser.GameObjects.Sprite;
  private navRightButton: Phaser.GameObjects.Sprite;

  private currentDisplay: PokedexDisplayMode = PokedexDisplayMode.ABILITIES;
  private selectedSpeciesId: Species;
  private selectedFormIndex: number = 0;
  private selectedSpeciesData: PokemonSpecies | null = null;
  private selectedUniversalSmittyFormName: string | null = null;
  private pendingUniversalSmittyFormName: string | null = null;
  private isModifierPokemon: boolean = false;
  private isModifierPhaseNoneSelected: boolean = false;
  private scrollPosition: number = 0;
  private moveScrollTween: Phaser.Tweens.Tween | null = null;
  private moveScrollMaskTimer: Phaser.Time.TimerEvent | null = null;
  private readonly MAX_VISIBLE_MOVES = 9;

  private readonly CONTAINER_WIDTH = 300;
  private readonly CONTAINER_HEIGHT = 170;
  private readonly MARGIN_TOP = 5;
  private readonly MARGIN_LEFT = 0;
  private readonly TAB_HEIGHT = 50;
  private enemyPokemon: EnemyPokemon = null;
  private selectedPokemonInstance: Pokemon | EnemyPokemon | null = null;
  private prelistNav: any = null;
  private forcedShiny: boolean = false;
  private forcedVariant: number = 0;
  private ownedPokemonInstance: Pokemon | null = null;
  private onCloseCallback: (() => void) | null = null;

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

    const currentPhase = this.scene.getCurrentPhase();
    const isSelectModifierPhase = currentPhase?.constructor?.name === "SelectModifierPhase";

    const hasSpeciesArg = args.length > 0 && typeof args[0] === "number";
    const hasFormIndexArg = args.length > 1 && typeof args[1] === "number";
    const navArg = args.length > 2 ? args[2] : null;
    if (navArg && typeof navArg === "object" && typeof (navArg as any).onClose === "function") {
      this.onCloseCallback = (navArg as any).onClose;
    } else {
      this.onCloseCallback = null;
    }
    if (navArg && typeof navArg === "object" && Array.isArray((navArg as any).nav)) {
      this.prelistNav = navArg;
    } else {
      this.prelistNav = null;
    }
    if (navArg && typeof navArg === "object" && typeof (navArg as any).initialUniversalSmitty === "string") {
      this.pendingUniversalSmittyFormName = (navArg as any).initialUniversalSmitty;
    } else {
      this.pendingUniversalSmittyFormName = null;
    }
    this.isModifierPhaseNoneSelected = isSelectModifierPhase && !hasSpeciesArg;

    const isCommandPhase = currentPhase?.constructor?.name === "CommandPhase";
    if (this.scene.currentBattle) {
      if (hasSpeciesArg && isSelectModifierPhase) {
        this.selectedSpeciesId = args[0];
      } else {
        const enemyPokemon = this.scene.getEnemyField();
        const party = this.scene.getParty();
        if (hasSpeciesArg) {
          this.selectedSpeciesId = args[0];
        } else if (isCommandPhase && enemyPokemon && enemyPokemon.length > 0) {
          this.enemyPokemon = enemyPokemon[0];
          this.selectedSpeciesId = enemyPokemon[0].getSpeciesForm().speciesId;
        } else if (isSelectModifierPhase && party && party.length > 0) {
          this.selectedSpeciesId = party[0].getSpeciesForm().speciesId;
        } else {
          const speciesValues = Object.values(Species).filter(value => typeof value === "number") as number[];
          const randomIndex = Math.floor(Math.random() * speciesValues.length);
          this.selectedSpeciesId = speciesValues[randomIndex] as Species;
        }
      }
    } else if (hasSpeciesArg) {
      this.selectedSpeciesId = args[0];
    } else {
      const speciesValues = Object.values(Species).filter(value => typeof value === "number") as number[];
      const randomIndex = Math.floor(Math.random() * speciesValues.length);
      this.selectedSpeciesId = speciesValues[randomIndex] as Species;
    }

    this.selectedFormIndex = hasFormIndexArg ? Math.max(0, args[1] as number) : 0;

    if (super.show([config])) {

      this.createPokemonDropdown();
      this.updateNavButtonPositions();

      if (this.pendingUniversalSmittyFormName) {
        const formName = this.pendingUniversalSmittyFormName;
        this.pendingUniversalSmittyFormName = null;
        const targetValue = `unismitty:${formName}`;
        if (this.selectionDropdown) {
          const idx = Array.from(this.selectionDropdown.options).findIndex(o => o.value === targetValue);
          if (idx >= 0) {
            this.selectionDropdown.selectedIndex = idx;
            this.selectionDropdown.dispatchEvent(new Event("change"));
          } else {
            this.loadUniversalSmittyFormData(formName);
          }
        } else {
          this.loadUniversalSmittyFormData(formName);
        }
      }

      if (this.selectionDropdown) {
        if (!this.prelistNav && !this.enemyPokemon && !this.isModifierPokemon && !this.isModifierPhaseNoneSelected) {
          this.selectionDropdown.value = this.selectedSpeciesId.toString();
        }
        this.navLeftButton?.setVisible(true);
        this.navRightButton?.setVisible(true);
      } else {
        this.navLeftButton?.setVisible(false);
        this.navRightButton?.setVisible(false);
      }

      return true;
    }

    return false;
  }

  private updateNavButtonPositions(): void {
    const closeBtn = this.buttonContainers?.[0];
    const closeBg = this.buttonBgs?.[0];
    if (!closeBtn || !closeBg || !this.navLeftButton || !this.navRightButton) {
      return;
    }

    const centerY = closeBtn.y + (closeBg.height / 2);
    const gap = 10;
    const leftX = closeBtn.x - (closeBg.width / 2) - gap;
    const rightX = closeBtn.x + (closeBg.width / 2) + gap;

    this.navLeftButton.setPosition(leftX, centerY);
    this.navRightButton.setPosition(rightX, centerY);
    this.navLeftButton.setScale(1.0);
    this.navRightButton.setScale(1.0);
  }

  private appendUniversalSmittyOptions(dropdown: HTMLSelectElement): void {
    if (!universalSmittyForms || universalSmittyForms.length === 0) {
      return;
    }
    const smittySeparator = document.createElement("option");
    smittySeparator.value = "smitty_separator";
    smittySeparator.text = String((i18next.t as any)("pokedex:sortSmitty"));
    smittySeparator.disabled = true;
    dropdown.add(smittySeparator);
    const sortedUniversal = [...universalSmittyForms].sort((a, b) => a.formName.localeCompare(b.formName));
    sortedUniversal.forEach((form) => {
      const option = document.createElement("option");
      option.value = `unismitty:${form.formName}`;
      option.text = form.formName ? (form.formName.charAt(0).toUpperCase() + form.formName.slice(1)) : form.formName;
      const unlocked = !this.scene.gameData?.dataLoadAttempted || this.scene.gameData.isUniSmittyFormUnlocked(form.formName);
      if (!unlocked) {
        option.disabled = true;
      }
      dropdown.add(option);
    });
  }

  private destroyOwnedPokemonInstance(): void {
    if (this.ownedPokemonInstance) {
      try {
        this.ownedPokemonInstance.destroy();
      } catch {}
      this.ownedPokemonInstance = null;
    }
  }

  clear(): void {
    if (this.onCloseCallback) {
      try {
        this.onCloseCallback();
      } catch {}
    }
    this.onCloseCallback = null;
    this.destroyOwnedPokemonInstance();
    this.forcedShiny = false;
    this.forcedVariant = 0;
    if (this.selectionDropdown) {
      try {
        if (this.selectionDropdownClickHandler) {
          document.removeEventListener("mousedown", this.selectionDropdownClickHandler);
          this.selectionDropdownClickHandler = null;
        }

        if (this.selectionDropdown.parentNode) {
          this.selectionDropdown.parentNode.removeChild(this.selectionDropdown);
        }
      } catch (e) {

      }
      this.selectionDropdown = null;
    }

    if (this.formSelectionDropdown) {
      try {
        if (this.formDropdownClickHandler) {
          document.removeEventListener("mousedown", this.formDropdownClickHandler);
          this.formDropdownClickHandler = null;
        }

        if (this.formSelectionDropdown.parentNode) {
          this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
        }
      } catch (e) {

      }
      this.formSelectionDropdown = null;
    }

    if (this.navLeftButton) {
      this.navLeftButton.off("pointerup");
    }

    if (this.navRightButton) {
      this.navRightButton.off("pointerup");
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

    if (this.evolutionContainer) {
      this.evolutionContainer.removeAll(true);
    }

    if (this.universalSmittyEvolveByText) {
      this.universalSmittyEvolveByText.destroy();
      this.universalSmittyEvolveByText = null;
    }

    if (this.moveScrollContainer) {
      this.moveScrollContainer.removeAll(true);
      this.moveScrollContainer.setY(0);
      this.scrollPosition = 0;
      this.moveScrollContainer.clearMask();
      if (this.moveScrollTween) {
        this.moveScrollTween.stop();
        this.moveScrollTween.remove();
        this.moveScrollTween = null;
      }
      if (this.moveScrollMaskTimer) {
        this.moveScrollMaskTimer.remove();
        this.moveScrollMaskTimer = null;
      }
    }

    this.selectedFormIndex = 0;
    this.selectedSpeciesData = null;

    super.clear();

  }

  private loadFromNavEntry(entry: any): void {
    this.destroyOwnedPokemonInstance();
    this.forcedShiny = false;
    this.forcedVariant = 0;

    if (!entry) {
      return;
    }

    if (entry.kind === "universalSmitty" && typeof entry.formName === "string") {
      this.loadUniversalSmittyFormData(entry.formName);
      return;
    }

    if (entry.kind === "fusion" && typeof entry.primarySpeciesId === "number" && typeof entry.fusionSpeciesId === "number") {
      void this.loadFusionEntry(
                entry.primarySpeciesId as Species,
                entry.fusionSpeciesId as Species,
                typeof entry.primaryFormIndex === "number" ? entry.primaryFormIndex : 0,
                typeof entry.fusionFormIndex === "number" ? entry.fusionFormIndex : 0
      );
      return;
    }

    if (entry.kind === "shiny") {
      this.forcedShiny = true;
      this.forcedVariant = Math.max(0, Number(entry.variant) || 0);
    }

    this.selectedFormIndex = Math.max(0, Number(entry.formIndex) || 0);
    this.loadPokemonData(Number(entry.speciesId) as Species);
  }

  private computeNeutralFusionBaseStats(primaryBaseStats: number[], fusionBaseStats: number[]): number[] {
    const HP = 0;
    const SPD = 5;
    const firstPickStatType = HP;

    const assignedStats = new Set<number>();
    const finalBaseStats = primaryBaseStats.slice(0);

    const firstPickValue = Math.max(primaryBaseStats[firstPickStatType], fusionBaseStats[firstPickStatType]);
    finalBaseStats[firstPickStatType] = firstPickValue;
    assignedStats.add(firstPickStatType);

    const primaryFullRanked: Array<{ value: number; stat: number }> = [];
    const fusionFullRanked: Array<{ value: number; stat: number }> = [];
    for (let s = 0; s < 6; s++) {
      primaryFullRanked.push({ value: primaryBaseStats[s], stat: s });
      fusionFullRanked.push({ value: fusionBaseStats[s], stat: s });
    }
    primaryFullRanked.sort((a, b) => b.value - a.value);
    fusionFullRanked.sort((a, b) => b.value - a.value);

    const allStatsEqual =
            primaryFullRanked.every(s => s.value === primaryFullRanked[0].value) &&
            fusionFullRanked.every(s => s.value === fusionFullRanked[0].value) &&
            primaryFullRanked[0].value === fusionFullRanked[0].value;

    let secondPickStat: number;
    let secondPickValue: number;

    if (allStatsEqual) {
      secondPickStat = firstPickStatType === HP ? SPD : HP;
      secondPickValue = primaryBaseStats[secondPickStat];
    } else {
      const primaryMax = primaryFullRanked[0].value;
      const fusionMax = fusionFullRanked[0].value;

      const primarySecondHighest = primaryFullRanked.find(s => s.value < primaryMax) || primaryFullRanked[1];
      const fusionSecondHighest = fusionFullRanked.find(s => s.value < fusionMax) || fusionFullRanked[1];

      const primarySecondIsNatureStat = primarySecondHighest.stat === firstPickStatType;
      const fusionSecondIsNatureStat = fusionSecondHighest.stat === firstPickStatType;

      const primaryThirdCandidate =
                primaryFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== primaryFullRanked[0].stat) || null;
      const fusionThirdCandidate =
                fusionFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== fusionFullRanked[0].stat) || null;

      if (primarySecondIsNatureStat && fusionSecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (p.value > f.value) {
          secondPickStat = p.stat;
          secondPickValue = p.value;
        } else {
          secondPickStat = f.stat;
          secondPickValue = f.value;
        }
      } else if (primarySecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        if (p.value > fusionSecondHighest.value) {
          secondPickStat = p.stat;
          secondPickValue = p.value;
        } else {
          secondPickStat = fusionSecondHighest.stat;
          secondPickValue = fusionSecondHighest.value;
        }
      } else if (fusionSecondIsNatureStat) {
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (f.value > primarySecondHighest.value) {
          secondPickStat = f.stat;
          secondPickValue = f.value;
        } else {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        }
      } else {
        if (primarySecondHighest.value > fusionSecondHighest.value) {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        } else if (fusionSecondHighest.value > primarySecondHighest.value) {
          secondPickStat = fusionSecondHighest.stat;
          secondPickValue = fusionSecondHighest.value;
        } else {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        }
      }

      if (secondPickStat === firstPickStatType) {
        const primaryThird = primaryFullRanked.find(s => s.stat !== firstPickStatType);
        const fusionThird = fusionFullRanked.find(s => s.stat !== firstPickStatType);
        if (primaryThird && fusionThird) {
          if (primaryThird.value > fusionThird.value) {
            secondPickStat = primaryThird.stat;
            secondPickValue = primaryThird.value;
          } else {
            secondPickStat = fusionThird.stat;
            secondPickValue = fusionThird.value;
          }
        }
      }
    }

    finalBaseStats[secondPickStat] = secondPickValue;
    assignedStats.add(secondPickStat);

    for (let s = 0; s < 6; s++) {
      if (!assignedStats.has(s)) {
        finalBaseStats[s] = Math.ceil((primaryBaseStats[s] + fusionBaseStats[s]) / 2);
      }
    }

    return finalBaseStats.slice(0, 6);
  }

  private computeFusionTypes(primaryForm: any, fusionForm: any): [Type, Type | null] {
    const types: Type[] = [];
    const type1 = primaryForm?.type1 ?? Type.UNKNOWN;
    types.push(type1);
    if (fusionForm) {
      if (fusionForm.type2 !== null && fusionForm.type2 !== type1) {
        types.push(fusionForm.type2);
      } else if (fusionForm.type1 !== type1) {
        types.push(fusionForm.type1);
      }
    }
    if (types.length === 1 && primaryForm?.type2 !== null && primaryForm?.type2 !== undefined) {
      types.push(primaryForm.type2);
    }
    const t1 = types[0] ?? Type.UNKNOWN;
    const t2 = types[1] ?? null;
    return [t1, t2];
  }

  private async ensurePokemonAtlasLoaded(key: string, atlasPath: string): Promise<void> {
    if (this.scene.textures.exists(key)) {
      return;
    }
    (this.scene as BattleScene).loadPokemonAtlas(key, atlasPath);
    await new Promise<void>((resolve) => {
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private async ensureBackAtlasLoaded(speciesData: PokemonSpecies, formIndex: number, shiny: boolean, variant: number): Promise<void> {
    const backSpriteId = speciesData.getSpriteId(false, formIndex, shiny, variant, true).replace(/\_{2}/g, "/");
    const atlasPath = `${/_[1-3]$/.test(backSpriteId) ? "variant/" : ""}${backSpriteId}`;
    const key = `pkmn__${backSpriteId}`;
    await this.ensurePokemonAtlasLoaded(key, atlasPath);
  }

  private async loadFusionSprite(primarySpecies: PokemonSpecies, fusionSpecies: PokemonSpecies, abilityIndex: number, fusionOfLine?: string, primaryFormIndex: number = 0, fusionFormIndex: number = 0): Promise<void> {
    this.spriteContainer.removeAll(true);

    const loadingText = addTextObject(
      this.scene,
      0, 0,
      i18next.t("pokedex:loading"),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    loadingText.setOrigin(0.5, 0.5);
    this.spriteContainer.add(loadingText);

    try {
      const shiny = false;
      const variant = 0;

      const primarySpriteKey = primarySpecies.getSpriteKey(false, primaryFormIndex, shiny, variant);
      const fusionSpriteKey = fusionSpecies.getSpriteKey(false, fusionFormIndex, shiny, variant);

      if (!this.scene.textures.exists(primarySpriteKey)) {
        await primarySpecies.loadAssets(this.scene, false, primaryFormIndex, shiny, variant, true);
      }
      if (!this.scene.textures.exists(fusionSpriteKey)) {
        await fusionSpecies.loadAssets(this.scene, false, fusionFormIndex, shiny, variant, true);
      }
      await this.ensureBackAtlasLoaded(primarySpecies, primaryFormIndex, shiny, variant);
      await this.ensureBackAtlasLoaded(fusionSpecies, fusionFormIndex, shiny, variant);

      const pokemonSprite = (this.scene as BattleScene).addPokemonSprite(
        null,
        0,
        0,
        primarySpriteKey,
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

      if (pokemonSprite.texture.frameTotal > 1 && this.scene.anims.exists(pokemonSprite.texture.key)) {
        pokemonSprite.play(pokemonSprite.texture.key);
      }

      if (this.scene.spritePipeline) {
        pokemonSprite.setPipeline(this.scene.spritePipeline);
        pokemonSprite.setPipelineData("shiny", false);
        pokemonSprite.setPipelineData("variant", 0);
        pokemonSprite.setPipelineData("spriteKey", primarySpriteKey);
      }

      const tempPokemon = new PlayerPokemon(this.scene as BattleScene, primarySpecies, 1, abilityIndex, primaryFormIndex, Gender.MALE, false, 0, undefined, Nature.HARDY);
      tempPokemon.generateFusionViaSpeciesID(fusionSpecies.speciesId, false);
      tempPokemon.fusionGender = Gender.MALE;
      tempPokemon.fusionFormIndex = fusionFormIndex;

      const tempSprite = this.scene.add.sprite(0, 0, primarySpriteKey);
      tempSprite.setOrigin(0.5, 0.5);
      const tempTintSprite = this.scene.add.sprite(0, 0, primarySpriteKey);
      tempTintSprite.setOrigin(0.5, 0.5);
      tempTintSprite.setVisible(false);
      tempPokemon.addAt(tempSprite, 0);
      tempPokemon.addAt(tempTintSprite, 1);
      tempPokemon.updateFusionPalette();

      const srcData: any = tempSprite.pipelineData as any;
      pokemonSprite.setPipelineData("spriteColors", srcData["spriteColors"] || []);
      pokemonSprite.setPipelineData("fusionSpriteColors", srcData["fusionSpriteColors"] || []);

      try {
        tempPokemon.destroy(true);
      } catch {}

      this.spriteContainer.removeAll(true);
      this.spriteContainer.add(pokemonSprite);
      this.pokemonSprite = pokemonSprite;

      if (fusionOfLine) {
        const fusionText = addTextObject(
          this.scene,
          0,
          34,
          fusionOfLine,
          TextStyle.WINDOW,
          { fontSize: "30px", align: "center", wordWrap: { width: 140, useAdvancedWrap: true } as any }
        );
        fusionText.setOrigin(0.5, 0.5);
        this.spriteContainer.add(fusionText);
      }
    } catch (e) {
      console.error("Failed to load fusion sprite:", e);
      this.spriteContainer.removeAll(true);
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:errorLoadingSprite"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
    }
  }

  private async loadFusionEntry(primarySpeciesId: Species, fusionSpeciesId: Species, primaryFormIndex: number = 0, fusionFormIndex: number = 0): Promise<void> {
    this.destroyOwnedPokemonInstance();
    this.forcedShiny = false;
    this.forcedVariant = 0;
    this.selectedUniversalSmittyFormName = null;
    if (this.universalSmittyEvolveByText) {
      this.universalSmittyEvolveByText.destroy();
      this.universalSmittyEvolveByText = null;
    }
    this.movesContainer.setVisible(true);
    this.eggMovesContainer.setVisible(true);
    this.abilitiesContainer.setX((this.getWidth() / 4) * 2.2);

    if (this.formSelectionDropdown && this.formSelectionDropdown.parentNode) {
      this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
      this.formSelectionDropdown = null;
    }

    const primarySpecies = getPokemonSpecies(primarySpeciesId);
    const fusionSpecies = getPokemonSpecies(fusionSpeciesId);
    if (!primarySpecies || !fusionSpecies) {
      this.spriteContainer.removeAll(true);
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:pokemonDataNotFound"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
      return;
    }

    this.selectedSpeciesId = primarySpeciesId;
    this.selectedFormIndex = Math.max(0, primaryFormIndex);
    this.selectedSpeciesData = primarySpecies;

    this.spriteContainer.removeAll(true);
    this.typingContainer.removeAll(true);
    this.statsContainer.removeAll(true);
    this.abilitiesContainer.removeAll(true);
    this.movesContainer.removeAll(true);
    this.eggMovesContainer.removeAll(true);
    this.evolutionContainer.removeAll(true);
    this.evolutionContainer.setVisible(false);
    if (this.moveScrollContainer) {
      this.moveScrollContainer.removeAll(true);
      this.moveScrollContainer.setY(0);
      this.scrollPosition = 0;
      this.moveScrollContainer.clearMask();
      if (this.moveScrollTween) {
        this.moveScrollTween.stop();
        this.moveScrollTween.remove();
        this.moveScrollTween = null;
      }
      if (this.moveScrollMaskTimer) {
        this.moveScrollMaskTimer.remove();
        this.moveScrollMaskTimer = null;
      }
    }

    let abilityIndex = 0;
    try {
      abilityIndex = this.scene.gameData?.getStarterSpeciesDefaultAbilityIndex(primarySpecies) ?? 0;
    } catch {
      abilityIndex = 0;
    }

    void this.loadFusionSprite(primarySpecies, fusionSpecies, abilityIndex, undefined, this.selectedFormIndex, Math.max(0, fusionFormIndex));

    const primaryForms: any[] | null = primarySpecies.forms && primarySpecies.forms.length > 0 ? primarySpecies.forms : null;
    const fusionForms: any[] | null = fusionSpecies.forms && fusionSpecies.forms.length > 0 ? fusionSpecies.forms : null;
    const primaryForm: any = primaryForms ? (primaryForms[this.selectedFormIndex] ?? primaryForms[0] ?? primarySpecies) : primarySpecies;
    const fusionForm: any = fusionForms ? (fusionForms[Math.max(0, fusionFormIndex)] ?? fusionForms[0] ?? fusionSpecies) : fusionSpecies;

    const fusedBaseStats = this.computeNeutralFusionBaseStats(primaryForm.baseStats, fusionForm.baseStats);
    const [type1, type2] = this.computeFusionTypes(primaryForm, fusionForm);

    this.setTypeIcons(type1, type2);
    this.displayStats(fusedBaseStats);
    this.displayAbilities(fusionForm.ability1, fusionForm.ability2, fusionForm.abilityHidden);

    const fusionInstance = new PlayerPokemon(this.scene as BattleScene, primarySpecies, 1, abilityIndex, this.selectedFormIndex, Gender.MALE, false, 0, undefined, Nature.HARDY);
    fusionInstance.generateFusionViaSpeciesID(fusionSpeciesId, false);
    fusionInstance.fusionGender = Gender.MALE;
    fusionInstance.fusionFormIndex = Math.max(0, fusionFormIndex);
    this.selectedPokemonInstance = fusionInstance;
    this.ownedPokemonInstance = fusionInstance;

    this.displayLearnableMoves(primarySpeciesId);
    const eggMovesEndY = this.displayEggMoves(primarySpeciesId);
    this.evolutionContainer.setVisible(false);

    this.evolutionContainer.setY(this.abilitiesMovesY + eggMovesEndY + 10);
  }
  private createPokemonDropdown(): void {
    const dropdown = document.createElement("select");
    dropdown.style.position = "absolute";

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
    dropdown.style.width = "120px";
    dropdown.style.zIndex = "10000";
    dropdown.style.backgroundColor = "#334455";
    dropdown.style.color = "#ffffff";
    dropdown.style.border = "1px solid #6688aa";
    dropdown.style.borderRadius = "3px";
    dropdown.style.padding = "2px";
    dropdown.style.fontSize = "12px";

    if (this.prelistNav && Array.isArray((this.prelistNav as any).nav)) {
      const nav = (this.prelistNav as any).nav as any[];
      const buildPrefix = (entry: any) => {
        if (entry.bucket === "party") {
          return `${i18next.t("pokedex:partyPrefix")} ${((entry.partyIndex ?? 0) + 1)}:`;
        }
        if (entry.bucket === "enemy") {
          return `${i18next.t("pokedex:enemyPrefix")}:`;
        }
        if (entry.kind === "evolution") {
          return `${i18next.t("pokedex:evolutionPrefix")}:`;
        }
        return "";
      };
      nav.forEach((entry, i) => {
        const option = document.createElement("option");
        option.value = `nav:${i}`;
        const prefix = buildPrefix(entry);
        if (entry.kind === "universalSmitty" && typeof entry.formName === "string") {
          const nameKey = `smittyNames:${String(entry.formName).toLowerCase()}.name`;
          let formDisplayName = entry.formName;
          try {
            const localized = i18next.t(nameKey);
            if (localized && localized !== nameKey) {
              formDisplayName = localized;
            }
          } catch {}
          option.text = prefix ? `${prefix} ${formDisplayName}` : formDisplayName;
        } else if (entry.kind === "fusion" && typeof entry.primarySpeciesId === "number" && typeof entry.fusionSpeciesId === "number") {
          const a = getPokemonSpecies(entry.primarySpeciesId);
          const b = getPokemonSpecies(entry.fusionSpeciesId);
          const aFormIndex = typeof entry.primaryFormIndex === "number" ? entry.primaryFormIndex : 0;
          const bFormIndex = typeof entry.fusionFormIndex === "number" ? entry.fusionFormIndex : 0;
          const fusedName = a && b ? getFusedSpeciesName(a.getName(aFormIndex), b.getName(bFormIndex)) : `${i18next.t("pokemon:unknown")} (${entry.primarySpeciesId}+${entry.fusionSpeciesId})`;
          option.text = prefix ? `${prefix} ${fusedName}` : fusedName;
        } else {
          const speciesData = getPokemonSpecies(entry.speciesId);
          const name = speciesData ? speciesData.getName(entry.formIndex) : `${i18next.t("pokemon:unknown")} (${entry.speciesId})`;
          option.text = prefix ? `${prefix} ${name}` : name;
        }
        dropdown.add(option);
      });
      const navIndex = typeof (this.prelistNav as any).navIndex === "number" ? (this.prelistNav as any).navIndex : 0;
      dropdown.selectedIndex = Math.max(0, Math.min(navIndex, dropdown.options.length - 1));
      const initialEntry = nav[dropdown.selectedIndex];
      if (initialEntry) {
        this.loadFromNavEntry(initialEntry);
      }
      dropdown.addEventListener("change", () => {
        const selectedValue = dropdown.value;
        dropdown.blur();
        if (selectedValue.startsWith("unismitty:")) {
          const formName = selectedValue.split(":").slice(1).join(":");
          this.loadUniversalSmittyFormData(formName);
          return;
        }
        const parts = selectedValue.split(":");
        if (parts.length === 2) {
          const idx = parseInt(parts[1], 10);
          const e = nav[idx];
          if (e) {
            if (this.formSelectionDropdown && this.formSelectionDropdown.parentNode) {
              this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
              this.formSelectionDropdown = null;
            }
            (this.prelistNav as any).navIndex = idx;
            this.loadFromNavEntry(e);
          }
        }
      });
      this.selectionDropdownClickHandler = (event: MouseEvent) => {
        if (event.target !== dropdown && !dropdown.contains(event.target as Node)) {
          dropdown.blur();
        }
      };
      document.addEventListener("mousedown", this.selectionDropdownClickHandler);
      dropdown.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          dropdown.blur();
        }
      });
      document.body.appendChild(dropdown);
      this.selectionDropdown = dropdown;
      this.navLeftButton?.setVisible(true);
      this.navRightButton?.setVisible(true);
      return;
    }

    let initialSpeciesId: Species | null = null;
    let addedBattleOptions = false;

    const currentModifierPokemon: Pokemon[] = [];
    const currentModifierPokemonKeys = new Set<string>();
    const addedEvolutionSpecies = new Set<Species>();

    const addEvolutionsForPokemon = (speciesId: Species, dropdown: HTMLSelectElement, addedSet: Set<Species>) => {
      const evolutions = pokemonEvolutions[speciesId] || [];
      for (const evolution of evolutions) {
        if (!addedSet.has(evolution.speciesId)) {
          const evolutionSpeciesId = evolution.speciesId;
          const evolutionSpeciesData = getPokemonSpecies(evolutionSpeciesId);
          if (evolutionSpeciesData) {
            const evolutionOption = document.createElement("option");
            evolutionOption.value = `evolution:${evolutionSpeciesId.toString()}`;
            const speciesKey = Object.keys(Species).find(key => Species[key] === evolutionSpeciesId);
            evolutionOption.text = `${i18next.t("pokedex:evolutionPrefix")}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t("pokemon:unknown")} (${evolutionSpeciesId})`}`;
            dropdown.add(evolutionOption);
            addedBattleOptions = true;
            addedSet.add(evolutionSpeciesId);

            addEvolutionsForPokemon(evolutionSpeciesId, dropdown, addedSet);
          }
        }
      }
    };

    try {
      const currentPhase = this.scene.getCurrentPhase();
      if (currentPhase?.constructor?.name === "SelectModifierPhase") {
        const rewardOptions = (currentPhase as any).getCurrentRewardOptions();
        if (rewardOptions) {
          rewardOptions.forEach(option => {
            if (option.type instanceof AddPokemonModifierType) {
              const pokemon = option.type.getPokemon();
              const key = pokemon.isFusion() && pokemon.fusionSpecies
                ? `${pokemon.species.speciesId}:${pokemon.fusionSpecies.speciesId}`
                : `${pokemon.species.speciesId}`;
              if (!currentModifierPokemonKeys.has(key)) {
                currentModifierPokemonKeys.add(key);
                currentModifierPokemon.push(pokemon);
              }
            }
          });
        }

        const modifierSelectHandler = this.scene.ui.handlers[Mode.MODIFIER_SELECT] as ModifierSelectUiHandler;
        if (modifierSelectHandler && typeof modifierSelectHandler.getCurrentShopOptions === "function") {
          const shopOptions = modifierSelectHandler.getCurrentShopOptions();
          shopOptions.forEach(option => {
            if (option.type instanceof AddPokemonModifierType) {
              const pokemon = option.type.getPokemon();
              const key = pokemon.isFusion() && pokemon.fusionSpecies
                ? `${pokemon.species.speciesId}:${pokemon.fusionSpecies.speciesId}`
                : `${pokemon.species.speciesId}`;
              if (!currentModifierPokemonKeys.has(key)) {
                currentModifierPokemonKeys.add(key);
                currentModifierPokemon.push(pokemon);
              }
            }
          });
        }
        this.isModifierPokemon = currentModifierPokemon.length > 0;
        if (this.isModifierPokemon && this.isModifierPhaseNoneSelected) {
          const party = this.scene.getParty();
          if (party && party.length > 0) {
            this.selectedSpeciesId = party[0].getSpeciesForm().speciesId;
          } else {
            this.selectedSpeciesId = currentModifierPokemon[0].species.speciesId;
          }
          initialSpeciesId = this.selectedSpeciesId;
        }
      }
    } catch (e) {
      console.log("Could not access current phase or shop options:", e);
    }

    currentModifierPokemon.forEach((pokemon, idx) => {
      const speciesId = pokemon.species.speciesId;
      const modifierOption = document.createElement("option");
      modifierOption.value = `modifier:${idx}:${speciesId.toString()}`;
      if (pokemon.isFusion() && pokemon.fusionSpecies) {
        modifierOption.text = getFusedSpeciesName(pokemon.species.getName(pokemon.formIndex), pokemon.fusionSpecies.getName(pokemon.fusionFormIndex));
      } else {
        const speciesKey = Object.keys(Species).find(key => Species[key] === speciesId);
        modifierOption.text = `${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t("pokemon:unknown")} (${speciesId})`}`;
      }
      dropdown.add(modifierOption);
      addedBattleOptions = true;

      if (this.selectedSpeciesId === speciesId && !initialSpeciesId) {
        modifierOption.selected = true;
        initialSpeciesId = speciesId;
      }

      addEvolutionsForPokemon(speciesId, dropdown, addedEvolutionSpecies);
    });

    if (this.scene.currentBattle) {
      const currentPhase = this.scene.getCurrentPhase();
      const isCommandPhase = currentPhase?.constructor?.name === "CommandPhase";
      const enemyPokemon = this.scene.getEnemyField();
      if (isCommandPhase && enemyPokemon && enemyPokemon.length > 0) {
        const firstEnemyPokemon = enemyPokemon[0];
        const enemySpecies = firstEnemyPokemon.getSpeciesForm().speciesId;
        const enemyOption = document.createElement("option");
        enemyOption.value = `enemy:${enemySpecies.toString()}`;
        const speciesKey = Object.keys(Species).find(key => Species[key] === enemySpecies);
        enemyOption.text = `${i18next.t("pokedex:enemyPrefix")}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t("pokemon:unknown")} (${enemySpecies})`}`;
        dropdown.add(enemyOption);
        addedBattleOptions = true;
        if (this.enemyPokemon && this.enemyPokemon.getSpeciesForm().speciesId === enemySpecies && !initialSpeciesId) {
          enemyOption.selected = true;
          initialSpeciesId = enemySpecies;
        }

        addEvolutionsForPokemon(enemySpecies, dropdown, addedEvolutionSpecies);
      }

      const playerParty = this.scene.getParty();
      if (playerParty && playerParty.length > 0) {
        playerParty.forEach((pokemon, index) => {
          if (pokemon) {
            const speciesId = pokemon.getSpeciesForm().speciesId;
            const option = document.createElement("option");
            option.value = `party:${index}:${speciesId.toString()}`;
            const speciesKey = Object.keys(Species).find(key => Species[key] === speciesId);
            option.text = `${i18next.t("pokedex:partyPrefix")} ${index + 1}: ${speciesKey ? i18next.t(`pokemon:${speciesKey.toLowerCase()}`) : `${i18next.t("pokemon:unknown")} (${speciesId})`}`;
            dropdown.add(option);
            addedBattleOptions = true;
            if (this.selectedSpeciesId === speciesId && !initialSpeciesId) {
              option.selected = true;
              initialSpeciesId = speciesId;
            }

            addEvolutionsForPokemon(speciesId, dropdown, addedEvolutionSpecies);
          }
        });
      }
      this.appendUniversalSmittyOptions(dropdown);
      if (universalSmittyForms.length > 0) {
        addedBattleOptions = true;
      }
      if (addedBattleOptions) {
        const separatorOption = document.createElement("option");
        separatorOption.value = "separator";
        separatorOption.text = i18next.t("pokedex:allOtherPokemon");
        separatorOption.disabled = true;
        dropdown.add(separatorOption);
      }
    }
    if (!this.scene.currentBattle) {
      this.appendUniversalSmittyOptions(dropdown);
    }

    Object.entries(Species)
      .filter(([key, value]) => typeof value === "number" && value > 0 && isNaN(Number(key)))
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .forEach(([key, value]) => {
        const speciesId = value as Species;
        const isAlreadyAdded = dropdown.options.length > 0 && Array.from(dropdown.options).some(opt => {
          const optValue = opt.value;
          if (optValue === speciesId.toString()) {
            return true;
          }
          if (optValue.startsWith("enemy:") || optValue.startsWith("party:") || optValue.startsWith("modifier:") || optValue.startsWith("evolution:")) {
            const parts = optValue.split(":");
            if (parts.length >= 2 && parseInt(parts[parts.length - 1], 10) === speciesId) {
              return true;
            }
          }
          return false;
        });
        if (!isAlreadyAdded) {
          try {
            const option = document.createElement("option");
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
        if (selectedValue.startsWith("modifier:")) {
          const parts = selectedValue.split(":");
          const modifierIndex = parseInt(parts[1], 10);
          const pokemon = currentModifierPokemon[modifierIndex];
          if (pokemon) {
            this.loadPokemonData(pokemon);
          } else {
            const modifierSpeciesId = parseInt(parts[parts.length - 1], 10) as Species;
            this.loadPokemonData(modifierSpeciesId);
          }
        } else if (selectedValue.startsWith("enemy:")) {
          const enemyPokemon = this.scene.getEnemyField();
          if (enemyPokemon && enemyPokemon.length > 0) {
            this.loadPokemonData(enemyPokemon[0]);
          }
        } else if (selectedValue.startsWith("party:")) {
          const parts = selectedValue.split(":");
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
        if (selectedOption.value.startsWith("modifier:")) {
          const parts = selectedOption.value.split(":");
          const modifierIndex = parseInt(parts[1], 10);
          const pokemon = currentModifierPokemon[modifierIndex];
          if (pokemon) {
            this.loadPokemonData(pokemon);
          } else {
            const modifierSpeciesId = parseInt(parts[parts.length - 1], 10) as Species;
            this.loadPokemonData(modifierSpeciesId);
          }
        } else if (selectedOption.value.startsWith("enemy:")) {
          if (this.enemyPokemon) {
            this.loadPokemonData(this.enemyPokemon);
          }
        } else if (selectedOption.value.startsWith("party:")) {
          const parts = selectedOption.value.split(":");
          const partyIndex = parseInt(parts[1], 10);
          const playerParty = this.scene.getParty();
          if (playerParty && playerParty.length > partyIndex && playerParty[partyIndex]) {
            this.loadPokemonData(playerParty[partyIndex]);
          }
        } else if (selectedOption.value.startsWith("evolution:")) {
          const parts = selectedOption.value.split(":");
          const evolutionSpeciesId = parseInt(parts[1], 10) as Species;
          this.loadPokemonData(evolutionSpeciesId);
        } else {
          this.loadPokemonData(Number(selectedOption.value) as Species);
        }
      }
    }
    dropdown.addEventListener("change", () => {
      const selectedValue = dropdown.value;
      dropdown.blur();

      if (this.formSelectionDropdown && this.formSelectionDropdown.parentNode) {
        this.formSelectionDropdown.parentNode.removeChild(this.formSelectionDropdown);
        this.formSelectionDropdown = null;
      }
      this.selectedFormIndex = 0;

      if (selectedValue.startsWith("unismitty:")) {
        const parts = selectedValue.split(":");
        const formName = parts.slice(1).join(":");
        this.loadUniversalSmittyFormData(formName);
        return;
      }

      if (selectedValue.startsWith("modifier:")) {
        const parts = selectedValue.split(":");
        const modifierIndex = parseInt(parts[1], 10);
        const pokemon = currentModifierPokemon[modifierIndex];
        if (pokemon) {
          this.loadPokemonData(pokemon);
        } else {
          const modifierSpeciesId = parseInt(parts[parts.length - 1], 10) as Species;
          this.loadPokemonData(modifierSpeciesId);
        }
      } else if (selectedValue.startsWith("enemy:")) {
        const enemyPokemon = this.scene.getEnemyField();
        if (enemyPokemon && enemyPokemon.length > 0) {
          this.loadPokemonData(enemyPokemon[0]);
        }

      } else if (selectedValue.startsWith("party:")) {
        const parts = selectedValue.split(":");
        const partyIndex = parseInt(parts[1], 10);
        const playerParty = this.scene.getParty();
        if (playerParty && playerParty.length > partyIndex && playerParty[partyIndex]) {
          this.loadPokemonData(playerParty[partyIndex]);
        }
      } else if (selectedValue.startsWith("evolution:")) {
        const parts = selectedValue.split(":");
        const evolutionSpeciesId = parseInt(parts[1], 10) as Species;
        this.loadPokemonData(evolutionSpeciesId);
      } else if (selectedValue !== "separator") {
        const selectedSpeciesId = Number(selectedValue) as Species;
        this.loadPokemonData(selectedSpeciesId);
      }
    });

    this.selectionDropdownClickHandler = (event: MouseEvent) => {
      if (event.target !== dropdown && !dropdown.contains(event.target as Node)) {
        dropdown.blur();
      }
    };

    document.addEventListener("mousedown", this.selectionDropdownClickHandler);

    dropdown.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dropdown.blur();
      }
    });

    document.body.appendChild(dropdown);
    this.selectionDropdown = dropdown;
    this.navLeftButton?.setVisible(true);
    this.navRightButton?.setVisible(true);
  }

  private createFormSelectionDropdown(speciesId: Species): void {
    const speciesData = this.selectedSpeciesData || getPokemonSpecies(speciesId);
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

        if (formKey.includes("smitty")) {
          return this.scene.gameData.isUniSmittyFormUnlocked(formName);
        } else if (formKey.includes("glitch")) {
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

    const dropdown = document.createElement("select");
    dropdown.style.position = "absolute";

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
    dropdown.style.width = "120px";
    dropdown.style.zIndex = "10000";
    dropdown.style.backgroundColor = "#334455";
    dropdown.style.color = "#ffffff";
    dropdown.style.border = "1px solid #6688aa";
    dropdown.style.borderRadius = "3px";
    dropdown.style.padding = "2px";
    dropdown.style.fontSize = "12px";

    validFormsWithIndices.forEach(({ form, originalIndex }) => {
      const option = document.createElement("option");
      option.value = originalIndex.toString();

      let localizedName = form.formName;
      const formKey = (form as any).formKey as SpeciesFormKey | undefined;

      if (formKey) {
        if (formKey.includes("glitch")) {
          const modName = getModPokemonName(speciesId, form.formName);
          localizedName = modName || i18next.t(`glitchNames:${form.formName.toLowerCase()}.name`);
        } else if (formKey.includes("smitty")) {
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
          if (i18next.exists(`pokemonForm:${formKeyLower}`)) {
            localizedName = i18next.t(`pokemonForm:${formKeyLower}`);
          }
        }
      }

      option.text = localizedName;
      option.selected = originalIndex === this.selectedFormIndex;
      dropdown.add(option);
    });

    dropdown.addEventListener("change", () => {
      this.selectedFormIndex = parseInt(dropdown.value, 10);
      dropdown.blur();
      this.updatePokemonDisplay(speciesId, this.selectedFormIndex);
    });

    this.formDropdownClickHandler = (event: MouseEvent) => {
      if (event.target !== dropdown && !dropdown.contains(event.target as Node)) {
        dropdown.blur();
      }
    };

    document.addEventListener("mousedown", this.formDropdownClickHandler);

    dropdown.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dropdown.blur();
      }
    });

    document.body.appendChild(dropdown);
    this.formSelectionDropdown = dropdown;
  }
  private loadPokemonData(pokemonData: Species | Pokemon): void {

    this.destroyOwnedPokemonInstance();
    let speciesData: PokemonSpecies;
    let pokemonInstance: Pokemon | EnemyPokemon | null = null;
    this.selectedUniversalSmittyFormName = null;
    if (this.universalSmittyEvolveByText) {
      this.universalSmittyEvolveByText.destroy();
      this.universalSmittyEvolveByText = null;
    }
    this.movesContainer.setVisible(true);
    this.eggMovesContainer.setVisible(true);
    this.abilitiesContainer.setX((this.getWidth() / 4) * 2.2);

    if (pokemonData instanceof Pokemon) {
      if (pokemonData.isFusion() && pokemonData.fusionSpecies) {
        void this.loadFusionEntry(pokemonData.species.getRootSpeciesId(true), pokemonData.fusionSpecies.getRootSpeciesId(true));
        return;
      }
      this.selectedSpeciesId = pokemonData.species.speciesId;
      speciesData = pokemonData.species;
      pokemonInstance = pokemonData;
      this.selectedPokemonInstance = pokemonData;
    } else {
      this.selectedSpeciesId = pokemonData;
      speciesData = getPokemonSpecies(this.selectedSpeciesId);
      this.selectedPokemonInstance = null;
    }

    this.selectedSpeciesData = speciesData;

    this.spriteContainer.removeAll(true);
    this.typingContainer.removeAll(true);
    this.statsContainer.removeAll(true);
    this.abilitiesContainer.removeAll(true);
    this.movesContainer.removeAll(true);
    this.eggMovesContainer.removeAll(true);

    if (this.moveScrollContainer) {
      this.moveScrollContainer.removeAll(true);
      this.moveScrollContainer.setY(0);
      this.scrollPosition = 0;
      this.moveScrollContainer.clearMask();
      if (this.moveScrollTween) {
        this.moveScrollTween.stop();
        this.moveScrollTween.remove();
        this.moveScrollTween = null;
      }
      if (this.moveScrollMaskTimer) {
        this.moveScrollMaskTimer.remove();
        this.moveScrollMaskTimer = null;
      }
    }
    if (!speciesData) {
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:pokemonDataNotFound"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
      return;
    }

    if (speciesData.forms && speciesData.forms.length > 1) {
      this.selectedFormIndex = Math.min(this.selectedFormIndex, speciesData.forms.length - 1);
      this.createFormSelectionDropdown(this.selectedSpeciesId);
      let initialFormIndex = this.selectedFormIndex;
      if (pokemonInstance) {
        const instanceForm = pokemonInstance.getSpeciesForm();
        const foundIndex = speciesData.forms.findIndex(form => form === instanceForm);
        if (foundIndex !== -1) {
          initialFormIndex = foundIndex;
          this.selectedFormIndex = initialFormIndex;
        }
      }
      this.updatePokemonDisplay(this.selectedSpeciesId, initialFormIndex);
    } else {
      this.selectedFormIndex = 0;
      this.loadPokemonSprite(this.selectedSpeciesId, 0);

      const sourceForm = this.selectedPokemonInstance
        ? this.selectedPokemonInstance.getSpeciesForm()
        : speciesData;

      this.setTypeIcons(sourceForm.type1, sourceForm.type2);
      this.displayStats(sourceForm.baseStats);
      this.displayAbilities(sourceForm.ability1, sourceForm.ability2, sourceForm.abilityHidden);
      this.displayLearnableMoves(this.selectedSpeciesId);
      const eggMovesEndY = this.displayEggMoves(this.selectedSpeciesId);
      this.evolutionContainer.setY(this.abilitiesMovesY + eggMovesEndY + 10);
      this.displayEvolutionMethod(this.selectedSpeciesId, (sourceForm as any).formKey);
    }
  }

  private loadUniversalSmittyFormData(formName: string): void {
    const form = universalSmittyForms.find(f => f.formName === formName) as UniversalSmittyForm | undefined;

    this.spriteContainer.removeAll(true);
    this.typingContainer.removeAll(true);
    this.statsContainer.removeAll(true);
    this.abilitiesContainer.removeAll(true);
    this.movesContainer.removeAll(true);
    this.eggMovesContainer.removeAll(true);
    this.evolutionContainer.removeAll(true);
    this.evolutionContainer.setVisible(false);
    if (this.universalSmittyEvolveByText) {
      this.universalSmittyEvolveByText.destroy();
      this.universalSmittyEvolveByText = null;
    }
    this.movesContainer.setVisible(false);
    this.eggMovesContainer.setVisible(false);
    this.abilitiesContainer.setX((this.getWidth() / 4) * 2.2);

    if (this.moveScrollContainer) {
      this.moveScrollContainer.removeAll(true);
      this.moveScrollContainer.setY(0);
      this.scrollPosition = 0;
      this.moveScrollContainer.clearMask();
      if (this.moveScrollTween) {
        this.moveScrollTween.stop();
        this.moveScrollTween.remove();
        this.moveScrollTween = null;
      }
      if (this.moveScrollMaskTimer) {
        this.moveScrollMaskTimer.remove();
        this.moveScrollMaskTimer = null;
      }
    }

    this.selectedUniversalSmittyFormName = formName;
    this.selectedPokemonInstance = null;
    this.selectedSpeciesData = null;
    this.selectedFormIndex = 0;

    if (!form) {
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:pokemonDataNotFound"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
      return;
    }

    this.loadUniversalSmittySprite(form.formName);

    const type1 = form.primaryType !== null ? form.primaryType : Type.UNKNOWN;
    const type2 = form.secondaryType !== null ? form.secondaryType : null;
    this.setTypeIcons(type1, type2);

    const baseStats = [form.hp, form.attack, form.defense, form.spAttack, form.spDefense, form.speed];
    this.displayStats(baseStats);
    this.displayAbilities(form.ability1, form.ability2, form.abilityHidden, 1100);

    if (form.requiredItems && form.requiredItems.length >= 4) {
      const closeBtn = this.buttonContainers?.[0];
      const closeBg = this.buttonBgs?.[0];
      const baseY = closeBtn && closeBg ? (closeBtn.y + closeBg.height / 2) : 0;
      const baseX = this.navRightButton
        ? (this.navRightButton.x + this.navRightButton.displayWidth / 2 + 11)
        : (closeBtn && closeBg ? (closeBtn.x + closeBg.width / 2 + 11) : 0);
      const evolveBy = i18next.t("pokedex:evolveBy");
      const item1 = this.getLocalizedFormChangeItemName(form.requiredItems[0]);
      const item2 = this.getLocalizedFormChangeItemName(form.requiredItems[1]);
      const item3 = this.getLocalizedFormChangeItemName(form.requiredItems[2]);
      const item4 = this.getLocalizedFormChangeItemName(form.requiredItems[3]);
      const method = `${item1} + ${item2}\n${item3} + ${item4}`;
      this.universalSmittyEvolveByText = addTextObject(
        this.scene,
        baseX,
        baseY,
        `${evolveBy}: ${method}`,
        TextStyle.WINDOW,
        { fontSize: "35px" }
      );
      this.universalSmittyEvolveByText.setOrigin(0, 0.5);
      this.modalContainer.add(this.universalSmittyEvolveByText);
    }
  }

  private async loadUniversalSmittySprite(formName: string): Promise<void> {
    this.spriteContainer.removeAll(true);
    const loadingText = addTextObject(
      this.scene,
      0, 0,
      i18next.t("pokedex:loading"),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    loadingText.setOrigin(0.5, 0.5);
    this.spriteContainer.add(loadingText);

    try {
      const sanitizedFormName = formName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const spriteKey = `pkmn__glitch__${sanitizedFormName}`;
      if (!this.scene.textures.exists(spriteKey)) {
        await this.loadGlitchSpriteFromFile(sanitizedFormName, spriteKey);
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
        const anim = this.scene.anims.get(this.pokemonSprite.texture.key) as any;
        if (anim?.frames?.length) {
          this.pokemonSprite.play(this.pokemonSprite.texture.key);
        }
      }
    } catch (e) {
      this.spriteContainer.removeAll(true);
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:errorLoadingSprite"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
    }
  }

  private updatePokemonDisplay(speciesId: Species, formIndex: number): void {
    const speciesData = this.selectedSpeciesData || getPokemonSpecies(speciesId);
    if (!speciesData) {
      return;
    }

    const form = formIndex < speciesData.forms.length ? speciesData.forms[formIndex] : speciesData;

    this.loadPokemonSprite(speciesId, formIndex);

    const sourceForm = form;

    this.setTypeIcons(sourceForm.type1, sourceForm.type2);
    this.displayStats(sourceForm.baseStats);
    this.displayAbilities(sourceForm.ability1, sourceForm.ability2, sourceForm.abilityHidden);
    this.displayLearnableMoves(speciesId);
    const eggMovesEndY = this.displayEggMoves(speciesId);
    this.evolutionContainer.setY(this.abilitiesMovesY + eggMovesEndY + 10);
    this.displayEvolutionMethod(speciesId, (sourceForm as any).formKey);
  }

  private async loadPokemonSprite(speciesId: Species, formIndex: number = 0): Promise<void> {

    this.spriteContainer.removeAll(true);

    const speciesData = this.selectedSpeciesData || getPokemonSpecies(speciesId);

    if (!speciesData) {
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:pokemonDataNotFound"),
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

    if (form !== speciesData && typeof (form as any).formKey === "string" && typeof (form as any).formName === "string") {
      formKey = (form as any).formKey as SpeciesFormKey;
      formName = (form as any).formName as string;
      isGlitchOrSmittyForm = formKey?.includes("glitch") || formKey?.includes("smitty");
    }
    const loadingText = addTextObject(
      this.scene,
      0, 0,
      i18next.t("pokedex:loading"),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    loadingText.setOrigin(0.5, 0.5);
    this.spriteContainer.add(loadingText);
    try {
      let spriteKey;
      if (isGlitchOrSmittyForm && formName) {
        const sanitizedFormName = formName.toLowerCase().replace(/[^a-z0-9]/g, "");
        spriteKey = `pkmn__glitch__${sanitizedFormName}`;

        if (!this.scene.textures.exists(spriteKey)) {
          try {
            await this.loadGlitchSpriteFromFile(sanitizedFormName, spriteKey);
          } catch (fileLoadError) {
            console.warn(`Failed to load glitch sprite from file, trying data: ${fileLoadError.message}`);
            await this.loadGlitchSpriteFromData(speciesId, sanitizedFormName, spriteKey);
          }
        }

      } else {
        const shiny = this.selectedPokemonInstance ? !!(this.selectedPokemonInstance as any).shiny : this.forcedShiny;
        const variant = this.selectedPokemonInstance ? Number((this.selectedPokemonInstance as any).variant) || 0 : this.forcedVariant;
        await speciesData.loadAssets(this.scene, false, formIndex, shiny, variant, true);
        spriteKey = speciesData.getSpriteKey(false, formIndex, shiny, variant);
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
        const anim = this.scene.anims.get(this.pokemonSprite.texture.key) as any;
        if (anim?.frames?.length) {
          this.pokemonSprite.play(this.pokemonSprite.texture.key);
        }
      }

      if (!isGlitchOrSmittyForm && this.scene.spritePipeline) {
        this.pokemonSprite.setPipeline(this.scene.spritePipeline);
        const shiny = this.selectedPokemonInstance ? !!(this.selectedPokemonInstance as any).shiny : this.forcedShiny;
        const variant = this.selectedPokemonInstance ? Number((this.selectedPokemonInstance as any).variant) || 0 : this.forcedVariant;
        this.pokemonSprite.setPipelineData("shiny", shiny);
        this.pokemonSprite.setPipelineData("variant", variant);
        this.pokemonSprite.setPipelineData("spriteKey", spriteKey);
        this.pokemonSprite.setPipelineData("spriteColors", []);
        this.pokemonSprite.setPipelineData("fusionSpriteColors", []);
      }

      if (this.selectedPokemonInstance && this.selectedPokemonInstance.getSprite()) {
        const srcData = this.selectedPokemonInstance.getSprite().pipelineData as any;
        if (srcData["altBuildSpriteColors"] && srcData["altBuildTargetColors"]) {
          this.pokemonSprite.setPipelineData("altBuildSpriteColors", srcData["altBuildSpriteColors"]);
          this.pokemonSprite.setPipelineData("altBuildTargetColors", srcData["altBuildTargetColors"]);
          this.pokemonSprite.setPipelineData("altBuildBlendMode", srcData["altBuildBlendMode"]);
          this.pokemonSprite.setPipelineData("altBuildInversionFactor", srcData["altBuildInversionFactor"] || 0.0);
        }
      }

    } catch (e) {
      console.error("Failed to load or add pokemon sprite:", e);
      this.spriteContainer.removeAll(true);
      const errorText = addTextObject(
        this.scene,
        0, 0,
        i18next.t("pokedex:errorLoadingSprite"),
        TextStyle.WINDOW
      );
      errorText.setOrigin(0.5, 0.5);
      this.spriteContainer.add(errorText);
    }
  }

  private async loadGlitchSpriteFromFile(sanitizedFormName: string, spriteKey: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.scene.load.embeddedAtlas(
        spriteKey,
        `images/pokemon/glitch/${sanitizedFormName}.png`
      );

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.scene.anims && typeof this.scene.anims.create === "function" && !this.scene.anims.exists(spriteKey)) {
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

  private async loadGlitchSpriteFromData(speciesId: Species, sanitizedFormName: string, spriteKey: string): Promise<void> {
    try {
      const systemName = getModFormSystemName(speciesId, sanitizedFormName);
      let spriteData: string | null = null;

      if (modGlitchFormData[systemName] && modGlitchFormData[systemName].sprites && modGlitchFormData[systemName].sprites.front) {
        spriteData = modGlitchFormData[systemName].sprites.front as string;
      } else {
        const modId = `${speciesId}_${sanitizedFormName}`;
        const storedMod = await modStorage.getMod(modId);
        if (storedMod && storedMod.spriteData) {
          spriteData = storedMod.spriteData;
        }
      }

      if (!spriteData) {
        throw new Error(`No sprite data found for ${sanitizedFormName}`);
      }

      return new Promise<void>((resolve, reject) => {
        let objectUrl: string;

        if (typeof spriteData === "string") {
          if (spriteData.startsWith("data:")) {
            objectUrl = spriteData;
          } else {
            objectUrl = `data:image/png;base64,${spriteData}`;
          }
        } else {
          reject(new Error("Invalid sprite data format"));
          return;
        }

        this.scene.load.image(spriteKey, objectUrl);

        this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
          if (this.scene.anims && typeof this.scene.anims.create === "function" && !this.scene.anims.exists(spriteKey)) {
            this.scene.anims.create({
              key: spriteKey,
              frames: [{ key: spriteKey }],
              frameRate: 1,
              repeat: -1
            });
          }
          resolve();
        });

        this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
          reject(new Error(`Failed to load glitch sprite: ${file.key}`));
        });

        if (!this.scene.load.isLoading()) {
          this.scene.load.start();
        }
      });
    } catch (error) {
      console.error(`Error loading glitch sprite for ${sanitizedFormName}:`, error);
      throw error;
    }
  }

  private setTypeIcons(type1: Type, type2: Type | null): void {
    this.typingContainer.removeAll(true);
    this.type1Icon = this.scene.add.sprite(3, 0, Utils.getLocalizedSpriteKey("types"));
    this.type1Icon.setFrame(Type[type1].toLowerCase());
    this.type1Icon.setOrigin(0, 0.5);
    this.type1Icon.setScale(0.5);
    this.typingContainer.add(this.type1Icon);

    if (type2 !== null) {
      this.type2Icon = this.scene.add.sprite(23, 0, Utils.getLocalizedSpriteKey("types"));
      this.type2Icon.setFrame(Type[type2].toLowerCase());
      this.type2Icon.setOrigin(0, 0.5);
      this.type2Icon.setScale(0.5);
      this.typingContainer.add(this.type2Icon);

    } else if (this.type2Icon) {
      this.type2Icon.setVisible(false);
    }
  }

  private displayStats(baseStats: number[]): void {

    this.statsContainer.removeAll(true);
    const statNames = [i18next.t("pokemonInfo:Stat.HPStat"), i18next.t("pokemonInfo:Stat.ATKshortened"), i18next.t("pokemonInfo:Stat.DEFshortened"), i18next.t("pokemonInfo:Stat.SPATKshortened"), i18next.t("pokemonInfo:Stat.SPDEFshortened"), i18next.t("pokemonInfo:Stat.SPDshortened")];
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
        { fontSize: "35px", fontStyle: "bold" }
      );
      label.setOrigin(0, 0);

      const valueText = addTextObject(
        this.scene,
        valueX,
        y,
        statValue.toString(),
        TextStyle.WINDOW,
        { fontSize: "35px" }
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
      i18next.t("pokemonInfo:Stat.Total"),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    totalLabel.setOrigin(0, 0);

    const totalValueText = addTextObject(
      this.scene,
      valueX,
      totalY,
      totalValue.toString(),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    totalValueText.setOrigin(1, 0);

    this.statsContainer.add([totalLabel, totalValueText]);

  }

  private displayAbilities(ability1: Abilities, ability2: Abilities, abilityHidden: Abilities, descWrapWidth: number = 500): void {

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
      { fontSize: "50px", fontStyle: "bold" }
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
        { fontSize: "45px", fontStyle: "bold" }
      );
      nameText.setOrigin(0, 0);
      const descText = addTextObject(
        this.scene,
        -70,
        yOffset + 8,
        i18next.t(`ability:${abilityI18nKey}.description`),
        TextStyle.WINDOW,
        {
          fontSize: "35px",
          wordWrap: { width: descWrapWidth }
        }
      );
      descText.setOrigin(0, 0);

      this.abilitiesContainer.add([nameText, descText]);

      yOffset += (descText.height / 6) + 8 + abilitySpacing;
    });

  }
  private displayLearnableMoves(speciesId: Species): number {

    let overlayedMoves: [number, Moves][];

    const instance = this.selectedPokemonInstance as any;

    if (instance && typeof instance.getLevelMoves === "function") {
      overlayedMoves = instance.getLevelMoves(1, true, false, true, true) as [number, Moves][];
    } else {
      overlayedMoves = (pokemonSpeciesLevelMoves[speciesId] || []) as [number, Moves][];
    }

    const movesByLevel: { [level: number]: Moves[] } = {};
    overlayedMoves.filter(move => move[0] >= -1).sort((a, b) => a[0] - b[0]).forEach(([level, moveId]) => {
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
      { fontSize: "50px", fontStyle: "bold" }
    );
    levelMovesTitle.setOrigin(0, 0);
    this.movesContainer.add(levelMovesTitle);

    if (!this.moveScrollContainer || !this.moveScrollContainer.parentContainer) {
      this.moveScrollContainer = this.scene.add.container(0, 0);
      this.moveScrollContainer.setName("moveScrollContainer");
      this.movesContainer.add(this.moveScrollContainer);
    }

    this.moveScrollContainer.removeAll(true);
    this.moveScrollContainer.setY(0);
    this.scrollPosition = 0;

    let yOffset = 10;
    const moveStartX = -70;

    levels.forEach(level => {
      const moves = movesByLevel[level];
      const moveNames = moves.map(moveId => this.getMoveName(moveId));
      const movesText = moveNames.join(", ");

      const levelText = addTextObject(
        this.scene,
        moveStartX,
        yOffset,
        `Lv ${level}: ${movesText}`,
        TextStyle.WINDOW,
        {
          fontSize: "35px",
          wordWrap: { width: 300 }
        }
      );
      levelText.setOrigin(0, 0);
      this.moveScrollContainer.add(levelText);

      const textHeight = levelText.height;
      yOffset += textHeight / 6;
    });
    const viewportHeight = 100;

    if (yOffset > viewportHeight) {
      if (this.moveScrollMaskTimer) {
        this.moveScrollMaskTimer.remove();
        this.moveScrollMaskTimer = null;
      }

      this.moveScrollMaskTimer = this.scene.time.delayedCall(10, () => {
        const bounds = this.moveScrollContainer.getBounds();

        const expectedHeight = yOffset;
        const actualHeight = bounds.height;
        const scaleFactor = actualHeight / expectedHeight;
        const scaledViewportHeight = viewportHeight * scaleFactor;

        const maskRect = this.scene.make.graphics({});
        maskRect.setScale(6);
        maskRect.fillStyle(0xFFFFFF);
        maskRect.beginPath();
        const maskX = bounds.x / 6;
        const maskY = bounds.y / 6;
        const maskWidth = 300 / 6;
        const maskHeight = scaledViewportHeight / 6;
        maskRect.fillRect(maskX, maskY, maskWidth, maskHeight);

        const moveScrollMask = maskRect.createGeometryMask();
        this.moveScrollContainer.setMask(moveScrollMask);

        this.moveScrollMaskTimer = null;
      });

      if (this.moveScrollTween) {
        this.moveScrollTween.stop();
        this.moveScrollTween.remove();
        this.moveScrollTween = null;
      }

      const scrollDistance = yOffset - viewportHeight;
      const scrollDuration = scrollDistance * 400;

      this.moveScrollContainer.setY(0);

      this.moveScrollTween = this.scene.tweens.add({
        targets: this.moveScrollContainer,
        y: -scrollDistance,
        duration: scrollDuration,
        delay: 6000,
        hold: 8000,
        loop: -1,
        ease: "Linear",

      });
    }

    return yOffset;
  }

  private displayEggMoves(speciesId: Species): number {

    const speciesData = getPokemonSpecies(speciesId);
    const rootSpeciesId = speciesData.getRootSpeciesId(false);

    const eggMoves = (speciesEggMoves[rootSpeciesId] || []) as Moves[];
    const moveSpacing = 7;
    const eggMovesTitleY = 0;
    const eggMovesTitle = addTextObject(
      this.scene,
      -70,
      eggMovesTitleY,
      i18next.t("pokedex:eggMoves"),
      TextStyle.WINDOW,
      { fontSize: "50px", fontStyle: "bold" }
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
        { fontSize: "40px" }
      );
      moveText.setOrigin(0, 0);
      this.eggMovesContainer.add(moveText);
      yOffset += moveSpacing;
    });
    return yOffset;
  }

  private getMoveName(moveId: Moves): string {
    const move = allMoves[moveId];
    if (!move) {
      return i18next.t("moves:unknown");
    }

    return move.name;

  }

  private getEvolutionToThisPokemon(speciesId: Species): SpeciesFormEvolution | null {
    const preEvoSpecies = pokemonPrevolutions[speciesId];
    if (!preEvoSpecies) {
      return null;
    }
    const evolutions = pokemonEvolutions[preEvoSpecies];
    if (!evolutions) {
      return null;
    }
    return evolutions.find(ev => ev.speciesId === speciesId) || null;
  }

  private getFormChangeToThisPokemon(speciesId: Species, formKey: string): SpeciesFormChange | null {
    const formChanges = pokemonFormChanges[speciesId];
    if (!formChanges) {
      return null;
    }
    return formChanges.find(fc => fc.formKey === formKey) || null;
  }

  private getEvolutionDescription(evolution: SpeciesFormEvolution): string {
    const parts: string[] = [];
    if (evolution.level > 1) {
      parts.push(i18next.t("pokedex:levelUp", { level: evolution.level }));
    }
    const evolutionItem: any = (evolution as any).item;
    if (evolutionItem && evolutionItem !== EvolutionItem.NONE) {
      const itemKey = EvolutionItem[evolutionItem];
      const itemName = i18next.t(`modifierType:EvolutionItem.${itemKey}`, itemKey);
      if (parts.length > 0) {
        parts[0] += ` + ${itemName}`;
      } else {
        parts.push(i18next.t("pokedex:useItem", { item: itemName }));
      }
    }
    if (evolution.condition) {
      const conditionDesc = this.parseEvolutionCondition(evolution.condition, evolution.level);
      if (conditionDesc) {
        if (parts.length > 0) {
          parts.push(conditionDesc);
        } else {
          parts.push(conditionDesc);
        }
      }
    }
    return parts.join(" + ") || i18next.t("pokedex:levelUp", { level: evolution.level });
  }

  private parseEvolutionCondition(condition: SpeciesEvolutionCondition, level: number): string | null {
    if (condition instanceof SpeciesFriendshipEvolutionCondition) {
      const friendshipCond = condition as SpeciesFriendshipEvolutionCondition;
      const amount = friendshipCond.friendshipAmount.toString();
      if (friendshipCond.secondaryPredicate) {
        const secondaryStr = friendshipCond.secondaryPredicate.toString();
        if (secondaryStr.includes("TimeOfDay.DAY") || secondaryStr.includes("TimeOfDay.DAWN")) {
          return i18next.t("pokedex:friendshipAtTime", { amount, time: i18next.t("pokedex:timeDay") });
        }
        if (secondaryStr.includes("TimeOfDay.NIGHT") || secondaryStr.includes("TimeOfDay.DUSK")) {
          return i18next.t("pokedex:friendshipAtTime", { amount, time: i18next.t("pokedex:timeNight") });
        }
        if (secondaryStr.includes("Type.FAIRY")) {
          return i18next.t("pokedex:friendshipWithMoveType", { amount, type: "Fairy" });
        }
      }
      return i18next.t("pokedex:friendship", { amount });
    }
    const predicateStr = condition.predicate.toString();
    if (predicateStr.includes("getTimeOfDay")) {
      if (predicateStr.includes("TimeOfDay.DAWN")) {
        return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDawn") });
      } else if (predicateStr.includes("TimeOfDay.DAY")) {
        return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDay") });
      } else if (predicateStr.includes("TimeOfDay.DUSK")) {
        return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDusk") });
      } else if (predicateStr.includes("TimeOfDay.NIGHT")) {
        return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeNight") });
      }
    }
    if (predicateStr.includes("Gender.MALE")) {
      return i18next.t("pokedex:genderRequired", { gender: i18next.t("pokedex:male") });
    } else if (predicateStr.includes("Gender.FEMALE")) {
      return i18next.t("pokedex:genderRequired", { gender: i18next.t("pokedex:female") });
    }
    if (predicateStr.includes("stats[Stat.ATK]") && predicateStr.includes("stats[Stat.DEF]")) {
      let comparison = "=";
      if (/ATK\]\s*>\s*p/.test(predicateStr)) {
        comparison = ">";
      } else if (/ATK\]\s*<\s*p/.test(predicateStr)) {
        comparison = "<";
      }
      return i18next.t("pokedex:statComparison", { stat1: "ATK", comparison, stat2: "DEF" });
    }
    if (predicateStr.includes("biomeType")) {
      const biomeMatches = predicateStr.match(/Biome\.([A-Z_]+)/g);
      if (biomeMatches && biomeMatches.length > 0) {
        const biomeNames = biomeMatches.map(match => {
          const biomeName = match.replace("Biome.", "");
          return i18next.t(`biome:${biomeName}`, biomeName);
        });
        return i18next.t("pokedex:inBiome", { biome: biomeNames.join("/") });
      }
      return i18next.t("pokedex:inBiome", { biome: "specific biome" });
    }
    if (predicateStr.includes("WeatherType")) {
      if (predicateStr.includes("RAIN") || predicateStr.includes("FOG")) {
        return i18next.t("pokedex:duringWeather", { weather: i18next.t("pokedex:weatherRain") + "/" + i18next.t("pokedex:weatherFog") });
      }
      return i18next.t("pokedex:duringWeather", { weather: i18next.t("pokedex:weatherRain") });
    }
    if (predicateStr.includes("Type.DARK") && predicateStr.includes("getParty")) {
      return i18next.t("pokedex:partyHasType", { type: "Dark" });
    }
    if (predicateStr.includes("getParty().length < 6") && predicateStr.includes("pokeballCounts")) {
      return i18next.t("pokedex:partySpaceAndBall");
    }
    if (predicateStr.includes("dexData") && predicateStr.includes("caughtAttr")) {
      const speciesMatch = predicateStr.match(/Species\.(\w+)/);
      if (speciesMatch) {
        return i18next.t("pokedex:speciesCaught", { species: speciesMatch[1] });
      }
    }
    if (predicateStr.includes("moveset") || predicateStr.includes("moveId")) {
      const moveMatch = predicateStr.match(/Moves\.(\w+)/);
      if (moveMatch) {
        return i18next.t("pokedex:withMove", { move: moveMatch[1].replace(/_/g, " ") });
      }
    }
    if (predicateStr.includes("getMove().type") && predicateStr.includes("Type.STEEL")) {
      return i18next.t("pokedex:withMoveType", { type: "Steel" });
    }
    if (predicateStr.includes("Nature.")) {
      return i18next.t("pokedex:withNature", { nature: "specific" });
    }
    if (predicateStr.includes("randSeedInt")) {
      const percentMatch = predicateStr.match(/randSeedInt\((\d+)\)/);
      if (percentMatch) {
        const percent = Math.round(100 / parseInt(percentMatch[1]));
        return i18next.t("pokedex:randomChance", { percent });
      }
    }
    if (predicateStr.includes("formIndex")) {
      return i18next.t("pokedex:specificForm");
    }
    return null;
  }

  private getLocalizedFormChangeItemName(item: FormChangeItem): string {
    const itemKey = FormChangeItem[item];
    return i18next.t(`modifierType:FormChangeItem.${itemKey}`, itemKey);
  }

  private parseFormChangeTrigger(formChange: SpeciesFormChange): string {
    const trigger = formChange.trigger;

    if (trigger instanceof SpeciesFormChangeCompoundTrigger) {
      const triggers = trigger.triggers;
      const itemTrigger = triggers.find(t => t instanceof SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger | undefined;
      const glitchTrigger = triggers.find(t => t instanceof GlitchPieceTrigger) as GlitchPieceTrigger | undefined;

      if (glitchTrigger && itemTrigger) {
        const itemName = this.getLocalizedFormChangeItemName(itemTrigger.item);
        return i18next.t("pokedex:glitchForm", { count: 5, item: itemName });
      }

      if (itemTrigger) {
        const itemName = this.getLocalizedFormChangeItemName(itemTrigger.item);
        return i18next.t("pokedex:megaEvolution", { megaStone: itemName });
      }
    }

    if (trigger instanceof SpeciesFormChangeItemTrigger) {
      const itemKey = FormChangeItem[trigger.item];
      const itemName = this.getLocalizedFormChangeItemName(trigger.item);

      if (trigger.item === FormChangeItem.MAX_MUSHROOMS) {
        return i18next.t("pokedex:gigantamax");
      }

      if (trigger.item === FormChangeItem.BLUE_ORB) {
        return i18next.t("pokedex:primalReversion", { orb: itemName });
      }

      if (trigger.item === FormChangeItem.RED_ORB) {
        return i18next.t("pokedex:primalReversion", { orb: itemName });
      }

      if (itemKey && (itemKey.includes("ITE") || itemKey.includes("ite"))) {
        return i18next.t("pokedex:megaEvolution", { megaStone: itemName });
      }

      return i18next.t("pokedex:useItem", { item: itemName || "Special Item" });
    }

    if (trigger instanceof SpeciesFormChangeWeatherTrigger) {
      const weathers = trigger.weathers;
      const weatherNames = weathers.map(w => WeatherType[w]).join("/");
      return i18next.t("pokedex:weatherForm", { weather: weatherNames });
    }

    if (trigger instanceof GlitchPieceTrigger) {
      const glitchItem = this.getLocalizedFormChangeItemName(FormChangeItem.GLITCHI_GLITCHI_FRUIT);
      return i18next.t("pokedex:glitchForm", { count: 5, item: glitchItem });
    }

    if (trigger instanceof SmittyFormTrigger) {
      const items = trigger.requiredItems;
      if (items && items.length >= 4) {
        return i18next.t("pokedex:smittyForm", {
          item1: this.getLocalizedFormChangeItemName(items[0]),
          item2: this.getLocalizedFormChangeItemName(items[1]),
          item3: this.getLocalizedFormChangeItemName(items[2]),
          item4: this.getLocalizedFormChangeItemName(items[3])
        });
      }
      return i18next.t("pokedex:smittyForm", { item1: "?", item2: "?", item3: "?", item4: "?" });
    }

    if (trigger instanceof AltBuildTrigger) {
      return i18next.t("pokedex:altBuild");
    }

    if (trigger instanceof SpeciesFormChangeManualTrigger) {
      return i18next.t("pokedex:abilityForm");
    }

    return i18next.t("pokedex:useItem", { item: "Special Item" });
  }

  private displayEvolutionMethod(speciesId: Species, formKey?: string): void {
    this.evolutionContainer.removeAll(true);
    this.evolutionContainer.setVisible(false);
    const description = getPokedexMethodDescription(speciesId, formKey);
    if (!description) {
      return;
    }
    this.evolutionContainer.setVisible(true);
    const label = addTextObject(
      this.scene,
      -70,
      0,
      i18next.t("pokedex:evolveBy"),
      TextStyle.WINDOW,
      { fontSize: "50px", fontStyle: "bold" }
    );
    label.setOrigin(0, 0);
    this.evolutionContainer.add(label);
    const descText = addTextObject(
      this.scene,
      -70,
      12,
      description,
      TextStyle.WINDOW,
      { fontSize: "35px", wordWrap: { width: 275 } }
    );
    descText.setOrigin(0, 0);
    this.evolutionContainer.add(descText);
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
        const currentIndex = this.selectionDropdown.selectedIndex;
        let newIndex = currentIndex - 1;

        while (newIndex >= 0 && this.selectionDropdown.options[newIndex].disabled) {
          newIndex--;
        }

        if (newIndex < 0) {
          newIndex = this.selectionDropdown.options.length - 1;
          while (newIndex >= 0 && this.selectionDropdown.options[newIndex].disabled) {
            newIndex--;
          }
          if (newIndex < 0) {
            newIndex = currentIndex;
          }
        }

        if (newIndex !== currentIndex) {
          this.selectionDropdown.selectedIndex = newIndex;
          this.selectionDropdown.dispatchEvent(new Event("change"));
          this.scene.ui.playSelect();
          return true;
        }
      }
      break;

    case Button.RIGHT:
      if (this.selectionDropdown) {
        const currentIndex = this.selectionDropdown.selectedIndex;
        let newIndex = currentIndex + 1;

        while (newIndex < this.selectionDropdown.options.length && this.selectionDropdown.options[newIndex].disabled) {
          newIndex++;
        }

        if (newIndex >= this.selectionDropdown.options.length) {
          newIndex = 0;
          while (newIndex < this.selectionDropdown.options.length && this.selectionDropdown.options[newIndex].disabled) {
            newIndex++;
          }
          if (newIndex >= this.selectionDropdown.options.length) {
            newIndex = currentIndex;
          }
        }

        if (newIndex !== currentIndex) {
          this.selectionDropdown.selectedIndex = newIndex;
          this.selectionDropdown.dispatchEvent(new Event("change"));
          this.scene.ui.playSelect();
          return true;
        }
      }
      break;

    case Button.UP:
      if (this.formSelectionDropdown) {
        const currentIndex = this.formSelectionDropdown.selectedIndex;
        let newIndex = currentIndex - 1;

        if (newIndex < 0) {
          newIndex = this.formSelectionDropdown.options.length - 1;
        }

        if (newIndex !== currentIndex) {
          this.formSelectionDropdown.selectedIndex = newIndex;
          this.formSelectionDropdown.dispatchEvent(new Event("change"));
          this.scene.ui.playSelect();
          return true;
        }
      }
      break;

    case Button.DOWN:
      if (this.formSelectionDropdown) {
        const currentIndex = this.formSelectionDropdown.selectedIndex;
        let newIndex = currentIndex + 1;

        if (newIndex >= this.formSelectionDropdown.options.length) {
          newIndex = 0;
        }

        if (newIndex !== currentIndex) {
          this.formSelectionDropdown.selectedIndex = newIndex;
          this.formSelectionDropdown.dispatchEvent(new Event("change"));
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
    this.abilitiesMovesY = abilitiesMovesY;

    const sectionWidth = containerWidth / 4;

    const section1X = containerWidth * 0.05;

    const section2X = sectionWidth * 2.2;

    const section3X = sectionWidth * 3.45;

    const section4X = sectionWidth * 4.25;
    this.section4X = section4X;

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

    this.evolutionContainer = this.scene.add.container(section4X, abilitiesMovesY);
    this.evolutionContainer.setName("evolutionContainer");
    this.evolutionContainer.setVisible(false);
    this.modalContainer.add(this.evolutionContainer);

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

    this.navLeftButton = this.scene.add.sprite(-4, halfHeight, "cursor_reverse");
    this.navLeftButton.setScale(0.75);
    this.navLeftButton.setInteractive({ useHandCursor: true });
    this.navLeftButton.setName("navLeftButton");
    this.navLeftButton.setVisible(false);
    this.modalContainer.add(this.navLeftButton);

    this.navRightButton = this.scene.add.sprite(containerWidth + 4, halfHeight, "cursor");
    this.navRightButton.setScale(0.75);
    this.navRightButton.setInteractive({ useHandCursor: true });
    this.navRightButton.setName("navRightButton");
    this.navRightButton.setVisible(false);
    this.modalContainer.add(this.navRightButton);

    this.navLeftButton.on("pointerup", () => {
      this.processInput(Button.LEFT);
    });

    this.navRightButton.on("pointerup", () => {
      this.processInput(Button.RIGHT);
    });

    this.moveScrollContainer = this.scene.add.container(0, 0);
    this.moveScrollContainer.setName("moveScrollContainer");
    this.movesContainer.add(this.moveScrollContainer);
  }
}
