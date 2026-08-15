import { getPokemonSpecies } from "./pokemon-species";

export function getDuelmonBstLimitForWave(waveIndex: number): number {
  if (waveIndex <= 10) return 500;
  if (waveIndex < 20) return 520;
  if (waveIndex < 30) return 530;
  if (waveIndex < 50) return 540;
  return 560;
}

export function isDuelmonEligibleForWave(speciesId: number, waveIndex: number): boolean {
  const species = getPokemonSpecies(speciesId);
  if (!species || species.generation !== 20) return true;
  return species.baseTotal <= getDuelmonBstLimitForWave(waveIndex);
}

export function getEligibleDuelmonSpeciesForWave(duelmonPool: number[], waveIndex: number): number[] {
  const limit = getDuelmonBstLimitForWave(waveIndex);
  const eligible = duelmonPool.filter(id => {
    const species = getPokemonSpecies(id);
    return species && species.baseTotal <= limit;
  });
  return eligible.length > 0 ? eligible : duelmonPool;
}