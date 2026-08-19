import BattleScene from "../battle-scene";
import * as Utils from "../utils";

export enum DuelmonSpawnRarity {
  OFF = 0,
  DEFAULT = 1,
  RARE = 2,
  VERY_RARE = 3,
}

export function getDuelmonRejectBps(rarity: DuelmonSpawnRarity): number {
  switch (rarity) {
    case DuelmonSpawnRarity.OFF: return 10000;
    case DuelmonSpawnRarity.DEFAULT: return 9500;
    case DuelmonSpawnRarity.RARE: return 9750;
    case DuelmonSpawnRarity.VERY_RARE: return 9995;
  }
}

export function shouldRejectDuelmonSpecies(scene: BattleScene): boolean {
  const rarity = scene.duelmonSpawnRarity ?? DuelmonSpawnRarity.DEFAULT;
  if (rarity === DuelmonSpawnRarity.OFF) return true;
  const rejectBps = getDuelmonRejectBps(rarity);
  return Utils.randSeedInt(10000) < rejectBps;
}