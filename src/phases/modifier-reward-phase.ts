import BattleScene from "#app/battle-scene.js";
import { ModifierType, ModifierTypeFunc, getModifierType, modifierTypes, PermaModifierTypeGenerator } from "#app/modifier/modifier-type.js";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import { PersistentModifier } from "#app/modifier/modifier.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase";
import { RewardObtainedType, RewardConfig } from "#app/ui/reward-obtained-ui-handler";
import * as Utils from '#app/utils';
import {PermaType} from "#app/modifier/perma-modifiers";
import {ModifierTypeGenerator} from "#app/modifier/modifier-type";
import { Type } from "#app/data/type";

export class ModifierRewardPhase extends BattlePhase {
  protected modifierType: ModifierType;
  protected isPerma: boolean;
  private onComplete: () => void;
  private isRivalTrainer: boolean;
  protected isPermaItemNode: boolean;
  private skillTreeRarity?: string;
  constructor(scene: BattleScene, modifierTypeFunc: ModifierTypeFunc, isPerma: boolean = false, onComplete?: () => void, isRivalTrainer: boolean = false, isPermaItemNode: boolean = false, skillTreeRarity?: string) {
    super(scene);

    this.modifierType = modifierTypeFunc ? getModifierType(modifierTypeFunc) : null;
    this.isPerma = isPerma;
    this.onComplete = onComplete
    this.isRivalTrainer = isRivalTrainer;
    this.isPermaItemNode = isPermaItemNode;
    this.skillTreeRarity = skillTreeRarity;
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
            modifierType: this.modifierType,
            isInverted: this.modifierType.isInverted,
            skillTreeRarity: this.skillTreeRarity
          },
          [() => {
            this.scene.ui.getHandler().clear();
            if (this.isPerma) {
              const key = this.modifierType?.id as keyof typeof modifierTypes;
              if (key && modifierTypes[key]) {
                this.scene.gameData.addPermaModifier(key);
              } else {
                const newModifier = this.modifierType?.newModifier();
                if (newModifier) this.scene.addModifier(newModifier);
              }
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
    } else if (this.onComplete) {
      this.onComplete();
    }
    this.end();
  }

  private handlePermaModifierReward(): ModifierType {
    const rand = this.isPermaItemNode ? 100 : Utils.randSeedInt(100);

    if (rand < 50) {
      return this.getModifierFromKey(this.getRandomPermaMoneyKey(), false);
    } else if (rand < 75) {
      return this.getModifierFromKey(this.getRandomEggVoucher(), false);
    } else if (rand < 85) {
      this.queueEssenceBundleReward();
      return null;
    } else if (rand < 92) {
      if (this.canGiveSkillTreeReward()) {
        this.queueSkillPointsReward();
        return null;
      }
      return this.getModifierFromKey(this.getRandomPermaMoneyKey(), false);
    } else if (rand < 98) {
      if (this.canGiveSkillTreeReward()) {
        this.queueSkillTokensReward();
        return null;
      }
      return this.getModifierFromKey(this.getRandomPermaMoneyKey(), false);
    } else {
      return this.getModifierFromKey(getRandomPermaModifierKey(), true);
    }
  }

  private getModifierFromKey(modifierKey: string, keepPerma: boolean): ModifierType {
    if (!keepPerma) {
      this.isPerma = false;
    }
    const modifierTypeFunc = modifierTypes[modifierKey];
    const generator = getModifierType(modifierTypeFunc);
    if (generator instanceof ModifierTypeGenerator) {
      return generator.generateType([]);
    }
    return generator;
  }

  private canGiveSkillTreeReward(): boolean {
    return !!(this.scene.currentBattle && this.scene.gameData.activeSkillTree);
  }

  private queueEssenceBundleReward(): void {
    const validTypes = [
      Type.NORMAL, Type.FIGHTING, Type.FLYING, Type.POISON, Type.GROUND,
      Type.ROCK, Type.BUG, Type.GHOST, Type.STEEL, Type.FIRE,
      Type.WATER, Type.GRASS, Type.ELECTRIC, Type.PSYCHIC, Type.ICE,
      Type.DRAGON, Type.DARK, Type.FAIRY
    ];
    const essenceRewards: Type[] = [];
    for (let i = 0; i < 3; i++) {
      const randomType = validTypes[Utils.randSeedInt(validTypes.length)];
      essenceRewards.push(randomType);
    }
    const typeNames = essenceRewards.map(t => Type[t]).join(", ");
    const reward: RewardConfig = {
      type: RewardObtainedType.ESSENCE_BUNDLE,
      name: i18next.t("rewardObtainedUi:saveReward.essenceBundle", {
        types: typeNames,
        defaultValue: `3 Essence: ${typeNames}`
      }),
      amount: 3
    };
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
      this.scene,
      reward,
      [() => {
        for (const type of essenceRewards) {
          this.scene.gameData.addEssence(type, 1);
        }
        if (this.onComplete) {
          this.onComplete();
        }
      }]
    ));
  }

  private queueSkillPointsReward(): void {
    const amount = 1;
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (activeSkillTree) {
      const oldPoints = activeSkillTree.skillPoints || 0;
      activeSkillTree.skillPoints = Math.max(0, oldPoints + amount);
    }
    const reward: RewardConfig = {
      type: RewardObtainedType.SKILL_POINTS,
      amount,
      name: i18next.t("skillTree:rewards.skillPoints", { amount, source: "save_reward" })
    };
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
      this.scene,
      reward,
      [() => {
        if (this.onComplete) {
          this.onComplete();
        }
      }]
    ));
  }

  private queueSkillTokensReward(): void {
    const amount = 1;
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (activeSkillTree) {
      const oldTokens = activeSkillTree.tokens || 0;
      activeSkillTree.tokens = Math.max(0, oldTokens + amount);
    }
    const reward: RewardConfig = {
      type: RewardObtainedType.SKILL_TREE_TOKENS,
      amount,
      name: i18next.t("skillTree:rewards.tokens", { amount, source: "save_reward" })
    };
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(
      this.scene,
      reward,
      [() => {
        if (this.onComplete) {
          this.onComplete();
        }
      }]
    ));
  }

  private getRandomPermaMoneyKey(): string {
    const moneyRand = Utils.randSeedInt(500);

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

  private getRandomEggVoucher(): string {
    const voucherRand = Utils.randSeedInt(500);

      if (voucherRand < 425) {
        return 'VOUCHER';
      } else if (voucherRand < 490) {
        return 'VOUCHER_PLUS';
      } else {
        return 'VOUCHER_PREMIUM';
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