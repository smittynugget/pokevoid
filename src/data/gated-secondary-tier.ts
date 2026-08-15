import { BattleStat } from "./battle-stat";
import Pokemon from "../field/pokemon";
import { BattlerTagType } from "#enums/battler-tag-type";
import { StatusEffect } from "./status-effect";

export type GatedSecondaryTierKey = "confuse" | "counter" | "curse" | "disable" | "flinch" | "trap" | "aquaRing" | "saltCure" | "multiHit" | "multiStatus" | "stat" | "status" | "hitHeal" | "selfHeal" | "bonusHeal" | "crit" | "arenaTag" | "resetTailwind" | "resetWeather" | "resetTerrain" | "resetGravity" | "randomStatDrop" | "randomStatBoostAll" | "hpCost" | `stat:${BattleStat}` | `status:${StatusEffect}`;

export function statusTierKey(effect: StatusEffect): `status:${StatusEffect}` {
  return `status:${effect}`;
}

export function statTierKey(stat: BattleStat): `stat:${BattleStat}` {
  return `stat:${stat}`;
}

export function battlerTagTierKey(tagType: BattlerTagType): GatedSecondaryTierKey | null {
  if (tagType === BattlerTagType.CONFUSED) {
    return "confuse";
  }
  if (tagType === BattlerTagType.FLINCHED) {
    return "flinch";
  }
  if (tagType === BattlerTagType.AQUA_RING) {
    return "aquaRing";
  }
  if (tagType === BattlerTagType.SALT_CURED) {
    return "saltCure";
  }
  if (tagType === BattlerTagType.WRAP
    || tagType === BattlerTagType.TRAPPED
    || tagType === BattlerTagType.CLAMP
    || tagType === BattlerTagType.FIRE_SPIN
    || tagType === BattlerTagType.SAND_TOMB
    || tagType === BattlerTagType.WHIRLPOOL
    || tagType === BattlerTagType.MAGMA_STORM
    || tagType === BattlerTagType.SNAP_TRAP
    || tagType === BattlerTagType.INFESTATION
    || tagType === BattlerTagType.THUNDER_CAGE
    || tagType === BattlerTagType.BIND) {
    return "trap";
  }
  return null;
}

export function shouldSkipBaseSecondaryTier(user: Pokemon, key: GatedSecondaryTierKey): boolean {
  return user.turnData.secondaryTierResolved?.[key] === "gated";
}

export function shouldSkipGatedSecondaryTier(user: Pokemon, key: GatedSecondaryTierKey): boolean {
  return user.turnData.secondaryTierResolved?.[key] === "base";
}

export function setSecondaryTier(user: Pokemon, key: GatedSecondaryTierKey, gatePass: boolean): void {
  if (!user.turnData.secondaryTierResolved) {
    user.turnData.secondaryTierResolved = {};
  }
  if (gatePass) {
    user.turnData.secondaryTierResolved[key] = "gated";
  } else if (user.turnData.secondaryTierResolved[key] !== "gated") {
    user.turnData.secondaryTierResolved[key] = "base";
  }
}

export function clearSecondaryTiers(user: Pokemon): void {
  user.turnData.secondaryTierResolved = {};
  user.turnData.secondaryFamilyApplied = {};
}