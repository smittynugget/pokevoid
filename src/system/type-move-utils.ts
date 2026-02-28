import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import { Type } from "../data/type";
import { Moves } from "../enums/moves";
import { allMoves, MoveFlags } from "../data/move";
import { tmPoolTiers } from "../data/tms";
import { ModifierTier } from "../modifier/modifier-tier";
import { PlayerPokemon, PokemonMove } from "../field/pokemon";

type WeightedMove = [Moves, number];

function buildWeightedPool(targetType: Type, excludedMoveIds: Moves[]): WeightedMove[] {
  const movePool = Utils.getEnumValues(Moves).filter((m: Moves) => {
    const move = allMoves[m];
    return move && m !== Moves.NONE
      && move.type === targetType
      && !move.hasFlag(MoveFlags.IGNORE_VIRTUAL)
      && !move.name.endsWith(" (N)")
      && !excludedMoveIds.includes(m);
  }) as Moves[];

  return movePool.map(m => {
    const tier = tmPoolTiers[m as integer];
    let weight: number;
    if (tier === undefined || tier <= ModifierTier.COMMON) weight = 40;
    else if (tier === ModifierTier.GREAT) weight = 30;
    else if (tier === ModifierTier.ULTRA) weight = 20;
    else if (tier === ModifierTier.ROGUE) weight = 10;
    else weight = Utils.randSeedInt(5000) === 0 ? 1 : 0;
    return [m, weight] as WeightedMove;
  }).filter(([, w]) => w > 0);
}

function selectWeightedMove(pool: WeightedMove[]): Moves {
  const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0);
  let rand = Utils.randSeedInt(totalWeight);
  for (const [moveId, weight] of pool) {
    if (rand < weight) return moveId;
    rand -= weight;
  }
  return pool[pool.length - 1][0];
}

export function assignTypeThemedMoves(_scene: BattleScene, pokemon: PlayerPokemon, types: Type[], useNormalSlot: boolean = false): void {
  if (!pokemon || !Array.isArray(types) || types.length === 0) return;

  const chosenTypes = types.filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
  if (chosenTypes.length === 0) return;

  let plan: Type[];
  if (useNormalSlot) {
    plan = chosenTypes.length > 1
      ? [chosenTypes[0], chosenTypes[1], Type.NORMAL]
      : [chosenTypes[0], Type.NORMAL];
  } else {
    plan = chosenTypes.length > 1
      ? [chosenTypes[0], chosenTypes[0], chosenTypes[1], chosenTypes[1]]
      : [chosenTypes[0], chosenTypes[0], chosenTypes[0]];
  }

  const currentMoveIds = pokemon.getMoveset().filter(pm => pm !== null).map(pm => pm!.moveId as Moves);
  const excluded: Moves[] = [...currentMoveIds];
  const selectedMoves: Moves[] = [];

  for (const t of plan) {
    let pool = buildWeightedPool(t, excluded);
    if (pool.length === 0) continue;
    const move = selectWeightedMove(pool);
    selectedMoves.push(move);
    excluded.push(move);
    pool = pool.filter(([m]) => m !== move);
  }

  if (selectedMoves.length === 0) return;

  const moveset = pokemon.getMoveset();
  const originalTypes = pokemon.species.type1 !== undefined
    ? [pokemon.species.type1, pokemon.species.type2].filter(t => t !== undefined && t !== Type.UNKNOWN)
    : [];

  let slotsToReplace: number[] = [];
  for (let i = moveset.length; i < 4; i++) {
    slotsToReplace.push(i);
  }

  if (slotsToReplace.length < selectedMoves.length) {
    const nonTypeSlots = moveset
      .map((m, i) => ({ move: m, index: i }))
      .filter(({ move, index }) =>
        move && !originalTypes.includes(allMoves[move.moveId].type)
        && !slotsToReplace.includes(index)
      )
      .map(({ index }) => index);
    slotsToReplace.push(...nonTypeSlots);
  }

  if (slotsToReplace.length < selectedMoves.length) {
    const remainingSlots = moveset
      .map((_, i) => i)
      .filter(i => !slotsToReplace.includes(i));
    for (let i = remainingSlots.length - 1; i > 0; i--) {
      const j = Utils.randSeedInt(i + 1);
      [remainingSlots[i], remainingSlots[j]] = [remainingSlots[j], remainingSlots[i]];
    }
    slotsToReplace.push(...remainingSlots);
  }

  for (let i = 0; i < selectedMoves.length && i < slotsToReplace.length; i++) {
    const slotIdx = slotsToReplace[i];
    if (slotIdx < moveset.length) {
      pokemon.moveset[slotIdx] = new PokemonMove(selectedMoves[i], 0, 0);
    } else {
      pokemon.moveset.push(new PokemonMove(selectedMoves[i], 0, 0));
    }
  }
}