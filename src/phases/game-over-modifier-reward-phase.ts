import BattleScene from "#app/battle-scene.js";
import { ModifierTypeFunc } from "#app/modifier/modifier-type.js";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { ModifierRewardPhase } from "./modifier-reward-phase";

export class GameOverModifierRewardPhase extends ModifierRewardPhase {
  constructor(scene: BattleScene, modifierTypeFunc: ModifierTypeFunc) {
    super(scene, modifierTypeFunc);
  }

  doReward(): void {
    const newModifier = this.modifierType.newModifier();
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
      this.scene,
      {
        type: RewardObtainedType.GAMEOVER_MODIFIER,
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
