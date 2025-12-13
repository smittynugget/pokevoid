
import { Moves } from "./moves";

export enum UpgradePath {

  POWER_1 = "POWER_1",
  POWER_2 = "POWER_2",
  POWER_3 = "POWER_3",
  POWER_4 = "POWER_4",
  POWER_5 = "POWER_5",
  POWER_6 = "POWER_6",
  POWER_7 = "POWER_7",
  POWER_8 = "POWER_8",
  ACCURACY_1 = "ACCURACY_1",
  ACCURACY_2 = "ACCURACY_2",
  ACCURACY_3 = "ACCURACY_3",
  ACCURACY_4 = "ACCURACY_4",
  ACCURACY_5 = "ACCURACY_5",
  ACCURACY_6 = "ACCURACY_6",
  ACCURACY_7 = "ACCURACY_7",
  HIT_HEAL_1 = "HIT_HEAL_1",
  HIT_HEAL_2 = "HIT_HEAL_2",
  HIT_HEAL_3 = "HIT_HEAL_3",
  HIT_HEAL_4 = "HIT_HEAL_4",
  HIT_HEAL_5 = "HIT_HEAL_5",
  HIT_HEAL_6 = "HIT_HEAL_6",
  HIT_HEAL_7 = "HIT_HEAL_7",
  HIT_HEAL_8 = "HIT_HEAL_8",
  EFFECT_CHANCE_1 = "EFFECT_CHANCE_1",
  EFFECT_CHANCE_2 = "EFFECT_CHANCE_2",
  EFFECT_CHANCE_3 = "EFFECT_CHANCE_3",
  EFFECT_CHANCE_4 = "EFFECT_CHANCE_4",
  EFFECT_CHANCE_5 = "EFFECT_CHANCE_5",
  EFFECT_CHANCE_6 = "EFFECT_CHANCE_6",
  EFFECT_CHANCE_7 = "EFFECT_CHANCE_7",
  EFFECT_CHANCE_8 = "EFFECT_CHANCE_8",
  CRIT_1 = "CRIT_1",
  CRIT_2 = "CRIT_2",
  CRIT_3 = "CRIT_3",
  CRIT_4 = "CRIT_4",
  RECOIL_ADD_1 = "RECOIL_ADD_1",
  RECOIL_ADD_2 = "RECOIL_ADD_2",
  RECOIL_ADD_3 = "RECOIL_ADD_3",
  RECOIL_ADD_4 = "RECOIL_ADD_4",
  RECOIL_ADD_5 = "RECOIL_ADD_5",
  RECOIL_ADD_6 = "RECOIL_ADD_6",
  RECOIL_ADD_7 = "RECOIL_ADD_7",
  RECOIL_DECREASE_1 = "RECOIL_DECREASE_1",
  RECOIL_DECREASE_2 = "RECOIL_DECREASE_2",
  RECOIL_DECREASE_3 = "RECOIL_DECREASE_3",
  SACRIFICIAL_1 = "SACRIFICIAL_1",
  SACRIFICIAL_2 = "SACRIFICIAL_2",
  SACRIFICIAL_3 = "SACRIFICIAL_3",
  CHARGE_MOVE_1 = "CHARGE_MOVE_1",
  CHARGE_MOVE_2 = "CHARGE_MOVE_2",
  MULTI_HIT_1 = "MULTI_HIT_1",
  MULTI_HIT_2 = "MULTI_HIT_2",
  MULTI_HIT_3 = "MULTI_HIT_3",
  MULTI_HIT_4 = "MULTI_HIT_4",
  MULTI_HIT_5 = "MULTI_HIT_5",
  POSITIVE_PRIORITY_1 = "POSITIVE_PRIORITY_1",
  POSITIVE_PRIORITY_2 = "POSITIVE_PRIORITY_2",
  POSITIVE_PRIORITY_3 = "POSITIVE_PRIORITY_3",

  NEGATIVE_PRIORITY_1 = "NEGATIVE_PRIORITY_1",
  NEGATIVE_PRIORITY_2 = "NEGATIVE_PRIORITY_2",
  NEGATIVE_PRIORITY_3 = "NEGATIVE_PRIORITY_3",
  ITEM_INTERACTION_1 = "ITEM_INTERACTION_1",
  ITEM_INTERACTION_2 = "ITEM_INTERACTION_2",
  ITEM_INTERACTION_3 = "ITEM_INTERACTION_3",
  STATUS_CHANGE_1 = "STATUS_CHANGE_1",
  STATUS_CHANGE_2 = "STATUS_CHANGE_2",
  STATUS_CHANGE_3 = "STATUS_CHANGE_3",
  STATUS_CHANGE_4 = "STATUS_CHANGE_4",
  STATUS_CHANGE_5 = "STATUS_CHANGE_5",
  STAT_BOOST_SELF_1 = "STAT_BOOST_SELF_1",
  STAT_BOOST_SELF_2 = "STAT_BOOST_SELF_2",
  STAT_BOOST_SELF_3 = "STAT_BOOST_SELF_3",
  STAT_BOOST_SELF_4 = "STAT_BOOST_SELF_4",
  STAT_BOOST_SELF_5 = "STAT_BOOST_SELF_5",
  STAT_BOOST_SELF_6 = "STAT_BOOST_SELF_6",
  STAT_BOOST_SELF_7 = "STAT_BOOST_SELF_7",
  STAT_BOOST_SELF_8 = "STAT_BOOST_SELF_8",
  STAT_BOOST_SELF_9 = "STAT_BOOST_SELF_9",
  STAT_LOWER_TARGET_1 = "STAT_LOWER_TARGET_1",
  STAT_LOWER_TARGET_2 = "STAT_LOWER_TARGET_2",
  STAT_LOWER_TARGET_3 = "STAT_LOWER_TARGET_3",
  STAT_LOWER_TARGET_4 = "STAT_LOWER_TARGET_4",
  STAT_LOWER_TARGET_5 = "STAT_LOWER_TARGET_5",
  STAT_LOWER_TARGET_6 = "STAT_LOWER_TARGET_6",
  GROUNDING_1 = "GROUNDING_1",
  GROUNDING_2 = "GROUNDING_2"
}
export class UpgradePathUtils {

  static getPathType(path: UpgradePath): string {
    return path.split('_').slice(0, -1).join('_');
  }
  static getTier(path: UpgradePath): number {
    const parts = path.split('_');
    return parseInt(parts[parts.length - 1], 10);
  }
  static getNextTier(path: UpgradePath): UpgradePath | null {
    const pathType = this.getPathType(path);
    const currentTier = this.getTier(path);
    const nextPath = `${pathType}_${currentTier + 1}` as UpgradePath;
    return Object.values(UpgradePath).includes(nextPath) ? nextPath : null;
  }
  static isPathType(path: UpgradePath, pathType: string): boolean {
    return this.getPathType(path) === pathType;
  }
  static getPathsOfType(pathType: string): UpgradePath[] {
    return Object.values(UpgradePath).filter(path => this.isPathType(path, pathType));
  }
  static getFirstTier(pathType: string): UpgradePath | null {
    const firstPath = `${pathType}_1` as UpgradePath;
    return Object.values(UpgradePath).includes(firstPath) ? firstPath : null;
  }
  static canAddUpgradePath(moveId: Moves, targetPath: UpgradePath, existingUpgrades: { upgradePathEnum?: UpgradePath, moveId: Moves }[]): boolean {

    const moveUpgrades = existingUpgrades.filter(upgrade => upgrade.moveId === moveId);
    const existingPathUpgrade = moveUpgrades.find(upgrade => upgrade.upgradePathEnum);

    if (!existingPathUpgrade) {

      return true;
    }
    const existingPathType = this.getPathType(existingPathUpgrade.upgradePathEnum!);
    const targetPathType = this.getPathType(targetPath);
    return existingPathType === targetPathType;
  }
  static getNextUpgradePath(moveId: Moves, pathType: string, existingUpgrades: { upgradePathEnum?: UpgradePath, moveId: Moves }[]): UpgradePath | null {

    const moveUpgrades = existingUpgrades.filter(upgrade => upgrade.moveId === moveId);

    const existingPathUpgrade = moveUpgrades.find(upgrade =>
      upgrade.upgradePathEnum && this.isPathType(upgrade.upgradePathEnum, pathType)
    );

    if (existingPathUpgrade) {

      return this.getNextTier(existingPathUpgrade.upgradePathEnum!);
    } else {

      return this.getFirstTier(pathType);
    }
  }
}