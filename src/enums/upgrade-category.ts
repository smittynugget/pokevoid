
import { Moves } from "./moves";
import { MoveUpgrade } from "../data/move-upgrade";
export enum UpgradeCategory {
  POWER = "POWER",
  ACCURACY = "ACCURACY",
  HIT_HEAL = "HIT_HEAL",
  EFFECT_CHANCE = "EFFECT_CHANCE",
  CRIT = "CRIT",
  RECOIL_ADD = "RECOIL_ADD",
  RECOIL_DECREASE = "RECOIL_DECREASE",
  SACRIFICIAL = "SACRIFICIAL",
  CHARGE_MOVE = "CHARGE_MOVE",
  MULTI_HIT = "MULTI_HIT",
  POSITIVE_PRIORITY = "POSITIVE_PRIORITY",
  NEGATIVE_PRIORITY = "NEGATIVE_PRIORITY",
  ITEM_INTERACTION = "ITEM_INTERACTION",
  STATUS_IMPROVE = "STATUS_IMPROVE",
  STATUS_DUAL = "STATUS_DUAL",
  STAT_BOOST_SELF = "STAT_BOOST_SELF",
  STAT_LOWER_TARGET = "STAT_LOWER_TARGET",
}
export class UpgradeCategoryUtils {
  static isValidTier(category: UpgradeCategory, tier: number, lowTierUpgrade: boolean = false): boolean {
    const maxTier = lowTierUpgrade ? 5 : this.getMoveUpgradeMaxTier(category);
    return tier >= 1 && tier <= maxTier;
  }
  static getNextTier(category: UpgradeCategory, currentTier: number, lowTierUpgrade: boolean = false): number | null {
    const availableTiers: number[] = [];
    for (let i = 2; i <= 4; i++) {
      const nextTier = currentTier + i;
      if (this.isValidTier(category, nextTier, lowTierUpgrade)) {
        availableTiers.push(nextTier);
      }
    }

    if (availableTiers.length === 0) {
      return null;
    }

    const random = Math.random();

    if (availableTiers.length === 1) {
      return availableTiers[0];
    } else if (availableTiers.length === 2) {
      return random < 0.5 ? availableTiers[0] : availableTiers[1];
    } else {
      if (random < 0.48) return availableTiers[0];
      if (random < 0.96) return availableTiers[1];
      return availableTiers[2];
    }
  }

  static getMoveUpgradeMaxTier(category: UpgradeCategory): number {
        switch (category) {
        case UpgradeCategory.POWER:
            return MoveUpgrade.POWER_PATH.length;
        case UpgradeCategory.ACCURACY:
            return MoveUpgrade.ACCURACY_PATH.length;
        case UpgradeCategory.HIT_HEAL:
            return MoveUpgrade.HIT_HEAL_PATH.length;
        case UpgradeCategory.EFFECT_CHANCE:
            return MoveUpgrade.EFFECT_CHANCE_PATH.length;
        case UpgradeCategory.CRIT:
            return MoveUpgrade.CRIT_PATH.length;
        case UpgradeCategory.RECOIL_ADD:
            return MoveUpgrade.RECOIL_ADD_PATH.length;
        case UpgradeCategory.RECOIL_DECREASE:
            return MoveUpgrade.RECOIL_DECREASE_PATH.length;
        case UpgradeCategory.SACRIFICIAL:
            return MoveUpgrade.SACRIFICIAL_PATH.length;
        case UpgradeCategory.CHARGE_MOVE:
            return MoveUpgrade.CHARGE_MOVE_PATH.length;
        case UpgradeCategory.MULTI_HIT:
            return MoveUpgrade.MULTI_HIT_PATH.length;
        case UpgradeCategory.POSITIVE_PRIORITY:
            return MoveUpgrade.POSITIVE_PRIORITY_PATH.length;
        case UpgradeCategory.NEGATIVE_PRIORITY:
            return MoveUpgrade.NEGATIVE_PRIORITY_PATH.length;
        case UpgradeCategory.ITEM_INTERACTION:
            return MoveUpgrade.ITEM_INTERACTION_PATH.length;
        case UpgradeCategory.STATUS_IMPROVE:
            return MoveUpgrade.STATUS_IMPROVE_PATH.length;
        case UpgradeCategory.STATUS_DUAL:
            return MoveUpgrade.STATUS_DUAL_PATH.length;
        case UpgradeCategory.STAT_BOOST_SELF:
            return MoveUpgrade.STAT_BOOST_SELF_PATH.length;
        case UpgradeCategory.STAT_LOWER_TARGET:
            return MoveUpgrade.STAT_LOWER_TARGET_PATH.length;
        default:
            return 1;
        }
  }

  static canAddUpgradeCategory(targetCategory: UpgradeCategory, existingUpgrades: { upgradeCategory?: UpgradeCategory, moveId: Moves }[]): boolean {

    const existingCategoryUpgrade = existingUpgrades.find(upgrade => upgrade.upgradeCategory);

    if (!existingCategoryUpgrade) {
      return true;
    }

    return existingCategoryUpgrade.upgradeCategory === targetCategory;
  }

  static getNextUpgradeTier(moveId: Moves, category: UpgradeCategory, existingUpgrades: { upgradeCategory?: UpgradeCategory, upgradeTier?: number, moveId: Moves }[], lowTierUpgrade: boolean = false): number | null {
    const moveUpgrades = existingUpgrades.filter(upgrade =>
      upgrade.moveId === moveId && upgrade.upgradeCategory === category
    );

    const existingCategoryUpgrade = moveUpgrades.find(upgrade => upgrade.upgradeCategory === category);

    if (existingCategoryUpgrade && existingCategoryUpgrade.upgradeTier) {
      return this.getNextTier(category, existingCategoryUpgrade.upgradeTier, lowTierUpgrade);
    } else {
      return this.getFirstUpgradeTier(category, lowTierUpgrade);
    }
  }

  private static getFirstUpgradeTier(category: UpgradeCategory, lowTierUpgrade: boolean = false): number {
    const pathLength = this.getMoveUpgradeMaxTier(category);

    const maxFirstTier = lowTierUpgrade ? Math.min(6, pathLength) : Math.min(6, pathLength);
    const availableTiers: number[] = [];

    for (let tier = 1; tier <= maxFirstTier; tier++) {
      if (!lowTierUpgrade || tier <= 6) {
        availableTiers.push(tier);
      }
    }

    const random = Math.random();

    if (availableTiers.length === 1) {
      return availableTiers[0];
    } else if (availableTiers.length === 2) {
      return random < 0.5 ? 1 : 2;
    } else if (availableTiers.length === 3) {
      if (random < 0.333) return 1;
      if (random < 0.666) return 2;
      return 3;
    } else if (availableTiers.length === 4) {
      if (random < 0.25) return 1;
      if (random < 0.5) return 2;
      if (random < 0.75) return 3;
      return 4;
    } else if (availableTiers.length === 5) {
      if (random < 0.2) return 1;
      if (random < 0.4) return 2;
      if (random < 0.6) return 3;
      if (random < 0.8) return 4;
      return 5;
    } else {
      if (random < 0.192) return 1;
      if (random < 0.384) return 2;
      if (random < 0.576) return 3;
      if (random < 0.768) return 4;
      if (random < 0.96) return 5;
      return 6;
    }
  }
}