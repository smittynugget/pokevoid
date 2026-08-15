import { Type } from "./type";
import PokemonSpecies, { allSpecies } from "./pokemon-species";
import { Species } from "#enums/species";

type RngInt = (max: number) => integer;

const BST_TOLERANCE_STEPS = [30, 50, 100, 150, 250];

const getCatchableSpeciesPoolOfType = (type: Type): PokemonSpecies[] => {
  return allSpecies.filter(s => s.isCatchable() && s.isOfType(type));
};

const getAnyCatchablePool = (): PokemonSpecies[] => {
  return allSpecies.filter(s => s.isCatchable());
};

const getWeight = (s: PokemonSpecies): integer => {
  if (s.mythical || s.legendary) return 1 as integer;
  if (s.subLegendary) return 2 as integer;
  return 10 as integer;
};

const filterByBstWindow = (pool: PokemonSpecies[], sourceBst: number, excluded: Set<Species>): PokemonSpecies[] => {
  const clean = pool.filter(s => !excluded.has(s.speciesId));
  for (const tol of BST_TOLERANCE_STEPS) {
    const filtered = clean.filter(s => Math.abs(s.baseTotal - sourceBst) <= tol);
    if (filtered.length >= 2) return filtered;
  }
  return clean;
};

const pickWeightedSpeciesId = (pool: PokemonSpecies[], rngInt: RngInt, excluded: Set<Species>, sourceBst?: number): Species | null => {
  const filtered = sourceBst !== undefined ? filterByBstWindow(pool, sourceBst, excluded) : pool.filter(s => !excluded.has(s.speciesId));
  if (!filtered.length) return null;

  let total = 0;
  const weights = filtered.map(s => {
    const w = Math.max(1, getWeight(s));
    total += w;
    return w;
  });

  const roll = rngInt(total);
  let acc = 0;
  for (let i = 0; i < filtered.length; i++) {
    acc += weights[i]!;
    if (roll < acc) {
      return filtered[i]!.speciesId as Species;
    }
  }
  return filtered[filtered.length - 1]!.speciesId as Species;
};

export function pickRandomRankUpTypeCandidates(
  type1: Type,
  type2: Type | null,
  rngInt: RngInt,
  excludedSpeciesIds: Species[] = [],
  sourceBst?: number
): Species[] {
  const excluded = new Set<Species>(excludedSpeciesIds);

  const primaryPool = getCatchableSpeciesPoolOfType(type1);
  const primary = pickWeightedSpeciesId(primaryPool, rngInt, excluded, sourceBst)
    ?? pickWeightedSpeciesId(getAnyCatchablePool(), rngInt, excluded, sourceBst)
    ?? (excludedSpeciesIds[0] ?? Species.NONE);

  excluded.add(primary as Species);

  const secondaryType = type2 ?? type1;
  const secondaryPool = getCatchableSpeciesPoolOfType(secondaryType);
  const secondary = pickWeightedSpeciesId(secondaryPool, rngInt, excluded, sourceBst)
    ?? pickWeightedSpeciesId(primaryPool, rngInt, excluded, sourceBst)
    ?? pickWeightedSpeciesId(getAnyCatchablePool(), rngInt, excluded, sourceBst)
    ?? (excludedSpeciesIds[0] ?? Species.NONE);

  return [primary as Species, secondary as Species];
}