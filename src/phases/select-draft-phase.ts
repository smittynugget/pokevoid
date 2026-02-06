import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import {Phase} from "../phase";
import {getPokemonSpecies} from "../data/pokemon-species";
import Battle, {BattleType} from "../battle";
import {GameModes, getGameMode} from "../game-mode";
import {Species} from "../enums/species";
import { SelectModifierPhase } from "./select-modifier-phase";
import { ShowRewards } from "#app/utils/show-rewards.js";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import { GlitchPieceModifierType, PathNodeTypeFilter } from "#app/modifier/modifier-type";
import { CollectedTypeShopPhase } from "./collected-type-shop-phase";
export class SelectDraftPhase extends Phase {

  private isTestMod: boolean;
  constructor(scene: BattleScene, isTestMod: boolean = false) {
    super(scene);
    this.isTestMod = isTestMod;
  }

  start() {
    super.start();

    const party = this.scene.getParty();
    const loadPokemonAssets: Promise<void>[] = [];

    const addPokemon = (species: Species) => {
      const tempPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(species), 5, undefined, undefined, undefined, false);
      tempPokemon.setVisible(false);
      party.push(tempPokemon);
      loadPokemonAssets.push(tempPokemon.loadAssets());
    };

    const isChaosRouge = this.scene.gameMode.isChaosMode;

    if (this.isTestMod) {
      this.scene.gameData.testSpeciesForMod.forEach(species => {
        addPokemon(species);
      });
    } else {
      const active: any = this.scene.gameData?.activeSkillTree;
      const sel = active?.selectedPokemon || {};
      const sig = sel.signature as Species | undefined;
      const gen = sel.general as Species | undefined;
      const startLevel = this.scene.gameMode.getStartingLevel();
      if (typeof sig === "number" || typeof gen === "number") {
        const addReal = (sp: Species | undefined) => {
          if (typeof sp !== "number") {
            return;
          }
          const tempPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(sp), startLevel, undefined, undefined, undefined, false);
          tempPokemon.setVisible(false);
          party.push(tempPokemon);
          loadPokemonAssets.push(tempPokemon.loadAssets());
        };
        addReal(sig);
        addReal(gen);
      } else {
        addPokemon(Species.UNOWN);
        addPokemon(Species.ONIX);
      }
    }
    this.scene.currentBattle = new Battle(getGameMode(isChaosRouge ? GameModes.CHAOS_ROGUE : GameModes.DRAFT), 1, BattleType.WILD, null, false, this.scene);

    if (!this.isTestMod) {

      this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
          const first = party[0];
          if (first && first.species?.speciesId === Species.UNOWN) {
            const placeholder = party.splice(0, 1)[0];
            placeholder.destroy();
          }

          const newPokemon = party[0];
          newPokemon.visible = false;
          const loadPokemonAssets: Promise<void>[] = [];
          loadPokemonAssets.push(newPokemon.loadAssets());
          this.scene.currentBattle = null;
          this.scene.newBattle();
          this.scene.arena.init();
          this.scene.sessionPlayTime = 0;
          this.scene.lastSavePlayTime = 0;
          this.scene.moveUpgradesEnabledForRun = !this.scene.disableMoveUpgrades;
          this.scene.resetRunEndSummaryRunData();

        }, PathNodeTypeFilter.NONE));
      }, PathNodeTypeFilter.NONE));
    } else {
      this.scene.currentBattle = null;
      this.scene.newBattle();
      this.scene.arena.init();
      this.scene.sessionPlayTime = 0;
      this.scene.lastSavePlayTime = 0;
      this.scene.moveUpgradesEnabledForRun = !this.scene.disableMoveUpgrades;
      this.scene.resetRunEndSummaryRunData();

      if (this.isTestMod) {

        this.scene.pushPhase(new ModifierRewardPhase(this.scene, () => new GlitchPieceModifierType(10)));
      }
    }
    this.end();
  }
}
