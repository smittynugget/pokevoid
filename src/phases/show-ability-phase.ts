import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { Ability } from "#app/data/ability.ts";
import { PokemonPhase } from "./pokemon-phase";

export class ShowAbilityPhase extends PokemonPhase {
  private passive: boolean;
  private ability?: Ability;
  constructor(scene: BattleScene, battlerIndex: BattlerIndex, passive: boolean = false, ability?: Ability) {
    super(scene, battlerIndex);

    this.passive = passive;
    this.ability = ability;
    this.getPokemon().partyAbility = null;
  }

  start() {
    super.start();

    const pokemon = this.getPokemon();

    if (pokemon) {
      this.scene.abilityBar.showAbility(pokemon, this.passive, this.ability);

      if (pokemon?.battleData) {
        pokemon.battleData.abilityRevealed = true;
      }
    }

    this.end();
  }
}
