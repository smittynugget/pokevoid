import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyPostSummonAbAttrs, PostSummonAbAttr, PostFoeSummonAbAttr } from "#app/data/ability.js";
import { ArenaTrapTag } from "#app/data/arena-tag.js";
import { StatusEffect } from "#app/enums/status-effect.js";
import { PokemonPhase } from "./pokemon-phase";

export class PostSummonPhase extends PokemonPhase {
  constructor(scene: BattleScene, battlerIndex: BattlerIndex) {
    super(scene, battlerIndex);
  }

  start() {
    super.start();

    const pokemon = this.getPokemon();

    if (pokemon.species?.generation === 20) {
      const s = pokemon.getSprite();
      if (s && !s.visible) {
        s.setVisible(true);
      }
      pokemon.applySpriteState();
      pokemon.applyYuBackFlip();
    }

    if (pokemon.status?.effect === StatusEffect.TOXIC) {
      pokemon.status.turnCount = 0;
    }
    this.scene.arena.applyTags(ArenaTrapTag, pokemon);
    applyPostSummonAbAttrs(PostSummonAbAttr, pokemon)
      .catch(err => console.error(`[POST-SUMMON ERROR] PostSummonAbAttr:`, err))
      .then(() => {
        const foes = pokemon.isPlayer() ? this.scene.getEnemyField() : this.scene.getPlayerField();
        const foeSummonPromises = foes
          .filter(foe => foe && !foe.isFainted())
          .map(foe => applyPostSummonAbAttrs(PostFoeSummonAbAttr, foe, false, pokemon)
            .catch(err => console.error(`[POST-SUMMON ERROR] PostFoeSummonAbAttr:`, err)));
        Promise.allSettled(foeSummonPromises).then(() => this.end());
      });
  }
}