import BattleScene from "#app/battle-scene.js";
import { ArenaTagType } from "#app/enums/arena-tag-type.js";
import { MoneyMultiplierModifier } from "#app/modifier/modifier.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import {RewardObtainDisplayPhase} from "#app/phases/reward-obtain-display-phase";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";

export class MoneyRewardPhase extends BattlePhase {
  private moneyMultiplier: number;

  constructor(scene: BattleScene, moneyMultiplier: number) {
    super(scene);

    this.moneyMultiplier = moneyMultiplier;
  }

  start() {


    
    const moneyAmount = new Utils.IntegerHolder(this.scene.getWaveMoneyAmount(this.moneyMultiplier));

    this.scene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    if (this.scene.arena.getTag(ArenaTagType.HAPPY_HOUR)) {
      moneyAmount.value *= 2;
    }


    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
        this.scene,
        {
          type: RewardObtainedType.MONEY,
          amount: moneyAmount.value
        }, () => {
          this.scene.addMoney(moneyAmount.value);
        }
    ));
    this.end();
  }
}
