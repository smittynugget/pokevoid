// Imports for enhanced functionality
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

/**
 * Utility class for working with UpgradeCategory enums and tiers
 */
export class UpgradeCategoryUtils {

  /**
   * Check if a tier is valid for a specific category
   * @param category The upgrade category
   * @param tier The tier number to check
   * @param lowTierUpgrade Whether to use low tier upgrade limit (max 3)
   * @returns True if the tier is valid for the category
   */
  static isValidTier(category: UpgradeCategory, tier: number, lowTierUpgrade: boolean = false): boolean {
    const maxTier = lowTierUpgrade ? 3 : this.getMoveUpgradeMaxTier(category);
    return tier >= 1 && tier <= maxTier;
  }
  
  /**
   * Get the next tier for a category
   * @param category The upgrade category
   * @param currentTier The current tier
   * @param lowTierUpgrade Whether to use low tier upgrade limit (max 3)
   * @returns The next tier number or null if no next tier exists
   */
  static getNextTier(category: UpgradeCategory, currentTier: number, lowTierUpgrade: boolean = false): number | null {
    const nextTier = currentTier + 1;
    return this.isValidTier(category, nextTier, lowTierUpgrade) ? nextTier : null;
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
      return 1;
    }
  }
} 