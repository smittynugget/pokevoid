import BattleScene from "#app/battle-scene.js";
import { Moves, isYuMove } from "#enums/moves";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { getDuelmonYuMoves } from "#app/data/yu-duelmon-moveset-map.js";
import { allMoves } from "#app/data/move.js";
import { Type } from "#app/data/type.js";
import * as Utils from "#app/utils.js";

export function getYuMoveRange(scene: BattleScene): -1 | 0 | 1 | 2 {
  const cap = scene.getMaxExpLevel();
  if (cap < 24) return -1;
  if (cap < 38) return 0;
  if (cap < 56) return 1;
  return 2;
}

export function getEligibleYuMoves(pokemon: PlayerPokemon): Moves[] {
  const speciesId = pokemon.species.speciesId;
  const allYuMoves = getDuelmonYuMoves(speciesId);
  const known = new Set(pokemon.getMoveset().filter(m => m).map(m => m!.moveId));

  return allYuMoves.filter(id =>
    !known.has(id)
    && allMoves[id]
    && !allMoves[id].name.endsWith(" (N)")
  );
}

export function pickTwoRandomYuMoves(
  scene: BattleScene, pokemon: PlayerPokemon
): Moves[] {
  let choices: Moves[] = [];
  scene.executeWithSeedOffset(() => {
    const pool = getEligibleYuMoves(pokemon);
    choices = Utils.randSeedShuffle([...pool]).slice(0, 2);
  }, pokemon.id, scene.waveSeed);
  return choices;
}

let _cachedGlobalYuPool: Moves[] | null = null;

export function getAllRegisteredYuMoves(): Moves[] {
  if (_cachedGlobalYuPool) return _cachedGlobalYuPool;
  _cachedGlobalYuPool = (Utils.getEnumValues(Moves) as Moves[]).filter((m: Moves) =>
    isYuMove(m)
    && allMoves[m]
    && !allMoves[m].name.endsWith(" (N)")
  );
  return _cachedGlobalYuPool;
}

function pickRandomGlobalYuMove(
  excludeKnown: Set<Moves>,
  excludeChosen: Set<Moves>,
  pokemonTypes: Type[],
  preferSameType: boolean
): Moves | null {
  const globalPool = getAllRegisteredYuMoves().filter(id =>
    !excludeKnown.has(id) && !excludeChosen.has(id)
  );
  if (!globalPool.length) return null;

  if (preferSameType && pokemonTypes.length > 0) {
    const sameType = globalPool.filter(id => pokemonTypes.includes(allMoves[id].type));
    if (sameType.length > 0) {
      return sameType[Utils.randSeedInt(sameType.length)];
    }
  }
  return globalPool[Utils.randSeedInt(globalPool.length)];
}

export function pickThreeYuMovesWithFallback(
  scene: BattleScene, pokemon: PlayerPokemon
): Moves[] {
  let choices: Moves[] = [];
  scene.executeWithSeedOffset(() => {
    const ownPool = getEligibleYuMoves(pokemon);
    const known = new Set(pokemon.getMoveset().filter(m => m).map(m => m!.moveId));
    const pokemonTypes = [pokemon.species.type1, pokemon.species.type2].filter(
      (t): t is Type => t != null && t !== Type.UNKNOWN
    );

    if (ownPool.length >= 1) {
      const shuffledOwn = Utils.randSeedShuffle([...ownPool]);
      const ownChoices = shuffledOwn.slice(0, 2);
      const thirdMove = pickRandomGlobalYuMove(known, new Set(ownChoices), pokemonTypes, true);
      choices = thirdMove ? [...ownChoices, thirdMove] : ownChoices;
    } else {
      const move1 = pickRandomGlobalYuMove(known, new Set(), pokemonTypes, true);
      const exclude1 = new Set<Moves>(move1 ? [move1] : []);
      const move2 = pickRandomGlobalYuMove(known, exclude1, pokemonTypes, true);
      const exclude2 = new Set<Moves>([...exclude1, ...(move2 ? [move2] : [])]);
      const move3 = pickRandomGlobalYuMove(known, exclude2, pokemonTypes, false);
      choices = [move1, move2, move3].filter((m): m is Moves => m !== null);
    }
  }, pokemon.id, scene.waveSeed);
  return choices;
}

export { getDuelmonBstLimitForWave, isDuelmonEligibleForWave, getEligibleDuelmonSpeciesForWave } from "./duelmon-bst-utils";