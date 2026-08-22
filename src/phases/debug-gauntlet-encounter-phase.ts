import { BattlePhase } from "./battle-phase";
import { BattleType } from "#app/battle";
import { NextEncounterPhase } from "./next-encounter-phase";
import { DUELMON_SPECIES } from "#app/data/duelmon-rankups";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import * as Utils from "#app/utils";
import { PlayerPokemon } from "#app/field/pokemon.js";
export class DebugGauntletEncounterPhase extends BattlePhase {
  start() {
    super.start();
    const scene = this.scene;
    const lastBattle = scene.currentBattle;
    const nextWave = lastBattle.waveIndex + 1;
    lastBattle.enemyParty.length = 0;

    scene.newBattle(nextWave, BattleType.WILD);
    scene.currentBattle.enemyLevels = [250];

    const newLead = this.swapPlayerLeadDuelmon();

    const proceed = () => {
      scene.updateModifiers(false);
      scene.setFieldScale(1);
      if (scene.arenaPlayer.x !== 0) {
        scene.arenaPlayer.setX(0);
      }

      scene.pushPhase(new NextEncounterPhase(scene));
      this.end();
    };
    if (newLead) {
      newLead.loadAssets().then(proceed);
    } else {
      proceed();
    }
  }
  private swapPlayerLeadDuelmon(): PlayerPokemon | null {
    const scene = this.scene;
    const party = scene.getParty();
    const shown = scene.debugGauntletShownPlayerDuelmons;
    if (!shown || !party.length) {
      return null;
    }

    const unseen = DUELMON_SPECIES.filter(s => !shown.has(s));
    const pool = unseen.length > 0 ? unseen : DUELMON_SPECIES;
    const speciesId = pool[Utils.randSeedInt(pool.length)];
    shown.add(speciesId);

    const newLead = scene.addPlayerPokemon(getPokemonSpecies(speciesId), 250);
    newLead.setVisible(false);
    scene.replacePlayerPokemon(0, newLead);
    return newLead;
  }
}