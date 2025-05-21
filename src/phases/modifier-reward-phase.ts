import BattleScene from "#app/battle-scene.js";
import { ModifierType, ModifierTypeFunc, getModifierType, modifierTypes, PermaModifierTypeGenerator } from "#app/modifier/modifier-type.js";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import { PersistentModifier } from "#app/modifier/modifier.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import * as Utils from '#app/utils';
import {PermaType} from "#app/modifier/perma-modifiers";
import {ModifierTypeGenerator} from "#app/modifier/modifier-type";

export class ModifierRewardPhase extends BattlePhase {
  protected modifierType: ModifierType;
  protected isPerma: boolean;
  private onComplete: () => void;
  private isRivalTrainer: boolean;
  constructor(scene: BattleScene, modifierTypeFunc: ModifierTypeFunc, isPerma: boolean = false, onComplete?: () => void, isRivalTrainer: boolean = false) {
    super(scene);

    this.modifierType = modifierTypeFunc ? getModifierType(modifierTypeFunc) : null;
    this.isPerma = isPerma;
    this.onComplete = onComplete
    this.isRivalTrainer = isRivalTrainer;
  };

  start() {
    super.start();
    this.doReward();
  }

  doReward(): void {
    if (this.isPerma && !this.modifierType) {
      this.modifierType = this.handlePermaModifierReward();
    }

    if (this.modifierType) {
      this.scene.unshiftPhase(new RewardObtainDisplayPhase(
          this.scene,
          {
            type: RewardObtainedType.MODIFIER,
            name: this.modifierType.name,
            modifierType: this.modifierType
          },
          [() => {
            this.scene.ui.getHandler().clear();
            if (this.isPerma) {
              this.scene.gameData.addPermaModifier(this.modifierType.id as keyof typeof modifierTypes);
              this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
            } else {
              const newModifier = this.modifierType.newModifier();
              this.scene.addModifier(newModifier)
            }
            if(this.onComplete) {
              this.onComplete();
            }
            this.scene.arenaBg.setVisible(true);
          }]
      ));
    }
    this.end();
  }

  private handlePermaModifierReward(): ModifierType {
    const rand = Utils.randSeedInt(100);
    let modifierKey: string;


    if (rand < 95) {
      modifierKey = this.getRandomPermaMoneyKey();
      this.isPerma = false;
    } else {
      modifierKey = getRandomPermaModifierKey();
    }

    const modifierTypeFunc = modifierTypes[modifierKey];
    const generator = getModifierType(modifierTypeFunc);
    if (generator instanceof ModifierTypeGenerator) {
      return generator.generateType([]);
    }
    return generator;
  }

  private getRandomPermaMoneyKey(): string {
    const moneyRand = Utils.randSeedInt(500);
    console.log("moneyRand", moneyRand);
    
    if (this.isRivalTrainer) {
      if (moneyRand < 300) {
        return 'PERMA_MONEY_2';
      } else if (moneyRand < 400) {
        return 'PERMA_MONEY_3';
      } else if (moneyRand < 450) {
        return 'PERMA_MONEY_4';
      } else {
        return 'PERMA_MONEY_5';
      }
    } else {
      if (moneyRand < 300) {
        return 'PERMA_MONEY_1';
      } else if (moneyRand < 400) {
        return 'PERMA_MONEY_2';
      } else if (moneyRand < 450) {
        return 'PERMA_MONEY_3';
      } else if (moneyRand < 475) {
        return 'PERMA_MONEY_4';
      } else {
        return 'PERMA_MONEY_5';
      }
    }
  }
}

export function getPermaModifierRarity(key: string | PermaType): number {
  const keyStr = typeof key === 'string' ? key : PermaType[key];
  
  const lastDigit = parseInt(keyStr.slice(-1));
  if (!isNaN(lastDigit)) {
    return lastDigit;
  }
  switch (keyStr) {
    case 'PERMA_TRANSFER_TERA':
    case 'PERMA_NEW_NORMAL':
    case 'PERMA_METRONOME_LEVELUP':
      return 2;
    case 'PERMA_FREE_REROLL':
    case 'PERMA_NEW_ROUND_TERA':
    case 'PERMA_PARTY_ABILITY':
      return 3;
    default:
      return 3;
  }
}

export function getRandomPermaModifierKey(): string {
  const permaModifierKeys = Object.entries(modifierTypes)
      .filter(([key, factory]) => {
        const modifierType = factory();
        return key.startsWith('PERMA_') &&
            !(key.includes('MONEY')) &&
            modifierType instanceof PermaModifierTypeGenerator;
      })
      .map(([key]) => key);

  while (true) {
    const rand = Utils.randSeedInt(500);
    let selectedRarity;

    if (rand < 350) {
      selectedRarity = 1;
    } else if (rand < 490) {
      selectedRarity = 2;
    } else {
      selectedRarity = 3;
    }

    const eligibleKeys = permaModifierKeys.filter(key => getPermaModifierRarity(key) === selectedRarity);

    if (eligibleKeys.length > 0) {
      return Utils.randSeedItem(eligibleKeys);
    }
  }
}