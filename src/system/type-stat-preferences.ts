import { Type } from "#app/data/type";
import { Stat } from "#enums/stat";
import * as Utils from "#app/utils";

export const TYPE_STAT_PREFERENCES: Record<Type, Stat[]> = {
  [Type.NORMAL]: [Stat.HP, Stat.ATK, Stat.SPD],
  [Type.FIRE]: [Stat.ATK, Stat.SPATK, Stat.SPD],
  [Type.WATER]: [Stat.SPATK, Stat.DEF, Stat.HP],
  [Type.GRASS]: [Stat.SPDEF, Stat.DEF, Stat.SPATK],
  [Type.ELECTRIC]: [Stat.SPD, Stat.SPATK, Stat.ATK],
  [Type.GROUND]: [Stat.ATK, Stat.DEF, Stat.HP],
  [Type.ROCK]: [Stat.DEF, Stat.ATK, Stat.HP],
  [Type.FIGHTING]: [Stat.ATK, Stat.DEF, Stat.HP],
  [Type.FLYING]: [Stat.SPD, Stat.ATK, Stat.SPATK],
  [Type.POISON]: [Stat.DEF, Stat.SPDEF, Stat.HP],
  [Type.BUG]: [Stat.ATK, Stat.SPD, Stat.DEF],
  [Type.GHOST]: [Stat.SPATK, Stat.SPD, Stat.SPDEF],
  [Type.STEEL]: [Stat.DEF, Stat.SPDEF, Stat.ATK],
  [Type.PSYCHIC]: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
  [Type.ICE]: [Stat.SPATK, Stat.ATK, Stat.SPD],
  [Type.DRAGON]: [Stat.ATK, Stat.SPATK, Stat.HP],
  [Type.DARK]: [Stat.ATK, Stat.SPD, Stat.SPDEF],
  [Type.FAIRY]: [Stat.SPDEF, Stat.SPATK, Stat.HP],
};

export function getTypeStatPreferences(type1: Type, type2?: Type): Stat[] {
  const prefs1 = TYPE_STAT_PREFERENCES[type1] || [Stat.HP, Stat.ATK, Stat.DEF];

  if (!type2 || type2 === Type.UNKNOWN) {
    return prefs1;
  }

  const prefs2 = TYPE_STAT_PREFERENCES[type2] || [];

  const combined = [...prefs1];
  for (const stat of prefs2) {
    if (!combined.includes(stat)) {
      combined.push(stat);
    }
  }

  return Utils.randSeedShuffle(combined).slice(0, 3);
}