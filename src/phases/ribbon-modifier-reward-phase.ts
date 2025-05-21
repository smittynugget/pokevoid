import BattleScene from "#app/battle-scene.js";
import PokemonSpecies from "#app/data/pokemon-species.js";
import { ModifierTypeFunc } from "#app/modifier/modifier-type.js";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { ModifierRewardPhase } from "./modifier-reward-phase";

export class RibbonModifierRewardPhase extends ModifierRewardPhase {
  private species: PokemonSpecies;

  constructor(scene: BattleScene, modifierTypeFunc: ModifierTypeFunc, species: PokemonSpecies) {
    super(scene, modifierTypeFunc);
    this.species = species;
  }

  doReward(): void {
    const newModifier = this.modifierType.newModifier();
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
      this.scene,
      {
        type: RewardObtainedType.RIBBON_MODIFIER,
        name: this.modifierType.name,
        modifierType: this.modifierType
      },
      [() => {
        this.scene.addModifier(newModifier);
        this.scene.arenaBg.setVisible(true);
      }]
    ));
    this.end();
  }
}
