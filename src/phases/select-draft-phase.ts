import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import {Phase} from "../phase";
import {getPokemonSpecies} from "../data/pokemon-species";
import Battle, {BattleType} from "../battle";
import {GameModes, getGameMode} from "../game-mode";
import {Species} from "../enums/species";
import {SelectModifierPhase} from "./select-modifier-phase";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import { GlitchPieceModifierType } from "#app/modifier/modifier-type";


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
      const tempPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(species), 1, undefined, undefined, undefined, false);
      tempPokemon.setVisible(false);
      party.push(tempPokemon);
      loadPokemonAssets.push(tempPokemon.loadAssets());
    }

    if (this.isTestMod) {
      this.scene.gameData.testSpeciesForMod.forEach(species => {
        addPokemon(species);
      });
    }
    else {
      addPokemon(Species.UNOWN);
    }
    
        this.scene.currentBattle = new Battle(getGameMode(GameModes.DRAFT), 1, BattleType.WILD, null, false, this.scene);

    if (!this.isTestMod) {
       
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
           
                this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
                    const pokemon = party.splice(0, 1)[0];
                    pokemon.destroy();
                    
                    const newPokemon = party[0];
                        newPokemon.visible = false;
                        const loadPokemonAssets: Promise<void>[] = [];
                        loadPokemonAssets.push(newPokemon.loadAssets());
                            this.scene.currentBattle = null;
                            this.scene.newBattle();
                            this.scene.arena.init();
                            this.scene.sessionPlayTime = 0;
                            this.scene.lastSavePlayTime = 0;
          
      }));
                }));
    }
    else {
      this.scene.currentBattle = null;
      this.scene.newBattle();
      this.scene.arena.init();
      this.scene.pushPhase(new ModifierRewardPhase(this.scene, () => new GlitchPieceModifierType(10)));
    }
    this.end()
  }
}