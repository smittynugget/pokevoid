import Pokemon, { MoveResult } from "../field/pokemon";
import { Move, allMoves, MoveCategory, MoveFlags, MultiHitAttr } from "./move";
import { StatusEffect, isNonVolatileStatusEffect } from "./status-effect";
import { Type } from "./type";
import { Stat } from "./pokemon-stat";
import { BattleStat } from "./battle-stat";
import { BattlerTagType } from "#enums/battler-tag-type";
import { ArenaTagType } from "#enums/arena-tag-type";
import { ArenaTagSide } from "./arena-tag";
import { WeatherType } from "./weather";
import { TerrainType } from "./terrain";
import { Command } from "../ui/command-ui-handler";
import { TimeOfDay } from "#enums/time-of-day";
import { Abilities } from "#enums/abilities";
import { PokemonHeldItemModifier, BerryModifier } from "../modifier/modifier";

export type YuGateFunc = (user: Pokemon, target: Pokemon, move: Move) => boolean;

export const andGate = (...gates: YuGateFunc[]): YuGateFunc =>
  (u, t, m) => gates.every(g => g(u, t, m));
const userSide = (user: Pokemon) => user.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

const primaryOpponent = (user: Pokemon, target: Pokemon) => user.getOpponent(0) ?? target;
export const foeForGate = (user: Pokemon, target: Pokemon) => {
  const opponents = user.getOpponents();
  return opponents.includes(target) ? target : primaryOpponent(user, target);
};

const prevMoveMissedOrFailed = (pokemon: Pokemon) => {
  const prev = moveAtTurn(pokemon, 1);
  return prev?.turn === battleTurn(pokemon) - 1 && (prev?.result === MoveResult.MISS || prev?.result === MoveResult.FAIL);
};

const consecutiveSameMoveCount = (pokemon: Pokemon, move: Move) => {
  let count = 0;
  for (const entry of pokemon.getLastXMoves(99)) {
    if (entry.move !== move.id) {
      break;
    }
    count++;
  }
  return count;
};

const highestPositiveStage = (pokemon: Pokemon) =>
  Math.max(...pokemon.summonData.battleStats.slice(0, 7).map(v => Math.max(0, v)));
const switchedInThisTurn = (pokemon: Pokemon) => pokemon.battleSummonData?.turnCount === 1;
const foeSwitchedInThisTurn = (pokemon: Pokemon) => (pokemon.battleSummonData?.turnCount ?? 99) <= 1;

const battleTurn = (pokemon: Pokemon) => pokemon.scene.currentBattle.turn;

const moveAtTurn = (pokemon: Pokemon, offset: integer) => {
  const history = pokemon.getLastXMoves(offset + 2);
  return history.length > offset ? history[offset] : undefined;
};

const lastMoveOnTurn = (pokemon: Pokemon, turn: integer) =>
  pokemon.getLastXMoves(999).find(m => m.turn === turn);

const moveCategoryAt = (pokemon: Pokemon, turn: integer) => {
  const tm = lastMoveOnTurn(pokemon, turn);
  return tm ? allMoves[tm.move]?.category : undefined;
};

const sumPositiveStages = (pokemon: Pokemon) =>
  pokemon.summonData.battleStats.slice(0, 7).reduce((s, v) => s + (v > 0 ? v : 0), 0);
const sumPositiveDefSpDefStages = (pokemon: Pokemon) =>
  Math.max(0, pokemon.summonData.battleStats[BattleStat.DEF])
  + Math.max(0, pokemon.summonData.battleStats[BattleStat.SPDEF]);

const sumNegativeStages = (pokemon: Pokemon) =>
  pokemon.summonData.battleStats.slice(0, 7).reduce((s, v) => s + (v < 0 ? v : 0), 0);

const anyStatStageGte = (pokemon: Pokemon, threshold: integer) =>
  pokemon.summonData.battleStats.slice(0, 7).some(v => v >= threshold);

const anyStatStageLte = (pokemon: Pokemon, threshold: integer) =>
  pokemon.summonData.battleStats.slice(0, 7).some(v => v <= threshold);

const partyFaintedCount = (user: Pokemon) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.isFainted()).length;

const allyFaintedCount = (user: Pokemon) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.id !== user.id && p.isFainted()).length;

const activeWeather = (user: Pokemon) => user.scene.arena.weather?.weatherType;

const terrainIs = (user: Pokemon, terrain: TerrainType) =>
  user.scene.arena.getTerrainType() === terrain;

const sideHasTag = (user: Pokemon, tag: ArenaTagType) =>
  !!user.scene.arena.getTagOnSide(tag, userSide(user));

const foeHasType = (target: Pokemon, ...types: Type[]) =>
  target.getTypes(false).some(t => types.includes(t));

const usedMoveLastTurn = (pokemon: Pokemon, move: Move) => {
  const prev = moveAtTurn(pokemon, 1);
  return prev?.turn === battleTurn(pokemon) - 1 && prev?.move === move.id && prev?.result === MoveResult.SUCCESS;
};

const usedSameMoveLastTurn = (pokemon: Pokemon, move: Move) => {
  const prev = moveAtTurn(pokemon, 1);
  return prev?.turn === battleTurn(pokemon) - 1 && prev?.move === move.id;
};

const prevTurnMove = (pokemon: Pokemon) => {
  const prev = moveAtTurn(pokemon, 1);
  return prev?.turn === battleTurn(pokemon) - 1 ? prev : undefined;
};

const prevTurnMoveDef = (pokemon: Pokemon) => {
  const prev = prevTurnMove(pokemon);
  return prev ? allMoves[prev.move] : undefined;
};
const partyMonHasMoveFlag = (pokemon: Pokemon, flag: MoveFlags) =>
  pokemon.getMoveset(true).some(m => m?.getMove().hasFlag(flag));

const partyMoveFlagCount = (user: Pokemon, flag: MoveFlags, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => !p.isFainted() && partyMonHasMoveFlag(p, flag)).length >= minimum;
const partyMoveFlagCountIncludingFainted = (user: Pokemon, flag: MoveFlags, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => partyMonHasMoveFlag(p, flag)).length >= minimum;

const partyOtherMoveFlagCount = (user: Pokemon, flag: MoveFlags, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.id !== user.id && !p.isFainted() && partyMonHasMoveFlag(p, flag)).length >= minimum;

const hasTransferrableItem = (pokemon: Pokemon) =>
  !!pokemon.scene.findModifiers(
    m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id && (m as PokemonHeldItemModifier).isTransferrable,
    pokemon.isPlayer(),
  ).length;

const hasNoTransferrableItem = (pokemon: Pokemon) => !hasTransferrableItem(pokemon);

const anyActiveFoe = (user: Pokemon, predicate: (p: Pokemon) => boolean) =>
  user.getOpponents().some(predicate);

const partyFaintedTypeCount = (user: Pokemon, type: Type, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.isFainted() && (p.getType1() === type || p.getType2() === type)).length >= minimum;
const partyFaintedAllyTypeCount = (user: Pokemon, type: Type, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.id !== user.id && p.isFainted() && (p.getType1() === type || p.getType2() === type)).length >= minimum;

const partyAliveTypeCount = (user: Pokemon, type: Type, minimum: integer) =>
  user.scene.getParty(user.isPlayer()).filter(p => !p.isFainted() && (p.getType1() === type || p.getType2() === type)).length >= minimum;

const foeTrapped = (target: Pokemon) =>
  !!target.getTag(BattlerTagType.TRAPPED) ||
  !!target.getTag(BattlerTagType.YU_TRAPPED) ||
  !!target.getTag(BattlerTagType.THUNDER_CAGE) ||
  !!target.getTag(BattlerTagType.BIND) ||
  !!target.getTag(BattlerTagType.WRAP) ||
  !!target.getTag(BattlerTagType.FIRE_SPIN) ||
  !!target.getTag(BattlerTagType.WHIRLPOOL) ||
  !!target.getTag(BattlerTagType.CLAMP) ||
  !!target.getTag(BattlerTagType.SAND_TOMB) ||
  !!target.getTag(BattlerTagType.MAGMA_STORM) ||
  !!target.getTag(BattlerTagType.SNAP_TRAP) ||
  !!target.getTag(BattlerTagType.INFESTATION);

const preyKoTypeGate = (user: Pokemon, type: Type) =>
  user.battleSummonData?.lastKoFoeTypes?.includes(type) ?? false;

export const DefGeAtkGate: YuGateFunc = (_u, target) =>
  target.getStat(Stat.DEF) >= target.getStat(Stat.ATK);

export const DefGeAtkIncomingGate: YuGateFunc = (user, target) => {
  const battle = user.scene.currentBattle;
  const cmd = battle.turnCommands[target.getBattlerIndex()];
  if (cmd?.command !== Command.POKEMON || cmd.pokemonIndex == null) {
    return false;
  }
  const incoming = user.scene.getParty(!user.isPlayer())[cmd.pokemonIndex];
  return !!incoming && incoming.getStat(Stat.DEF) >= incoming.getStat(Stat.ATK);
};

export const abilityContactProcGate: YuGateFunc = (user) => (user.turnData.abilityContactProcsThisTurn ?? 0) > 0;

export const abilityDoubleHitGate: YuGateFunc = (user) =>
  user.turnData.coinFlipHeads === true
  && user.turnData.hitCount - user.turnData.hitsLeft + 1 >= 2;

const holdsBerry = (pokemon: Pokemon) => pokemon.getHeldItems().some(i => i instanceof BerryModifier);
export const abilityProcGate: YuGateFunc = (user) => !!user.turnData.abilityProcThisTurn;

export const abilityRecoilGate: YuGateFunc = (user) => (user.turnData.abilityRecoilThisTurn ?? 0) > 0;

export const above75HpGate: YuGateFunc = (user) => user.hp > user.getMaxHp() * 0.75;
export const allHitsLandGate: YuGateFunc = (user) => {
  const total = user.turnData.hitCount;
  if (total <= 1 || user.turnData.hitsLeft !== 1) {
    return false;
  }
  return (user.turnData.multiHitStrikesLanded ?? 0) >= total;
};

export const lastHitOnlyGate: YuGateFunc = (user) => user.turnData.hitsLeft === 1 && user.turnData.hitCount > 0;

export const allStatsGte1Gate: YuGateFunc = (user) => user.summonData.battleStats.slice(0, 5).every(v => v >= 1);

export const allyFaintedGate: YuGateFunc = (user) => allyFaintedCount(user) >= 1;

export const allyFaintedLastTurnGate: YuGateFunc = (user) => {
  const battle = user.scene.currentBattle;
  const last = user.isPlayer() ? battle.lastAllyFaintTurnPlayer : battle.lastAllyFaintTurnEnemy;
  return last === battle.turn - 1;
};
export const retaliateGate = allyFaintedLastTurnGate;

export const allyFaintedThisBattleGate: YuGateFunc = (user) => (user.battleData?.allyFaintsThisBattle ?? 0) >= 1;
export const allyKoLastTurnGate: YuGateFunc = (user) =>
  user.battleSummonData?.enteredFromKnockOut === true && (user.battleSummonData?.turnCount ?? 0) === 1;

export const alreadyTrappedGate: YuGateFunc = (user, target) => foeForGate(user, target).turnData.trappedAtMoveStart === true;

export function snapshotTargetTrapState(target: Pokemon): void {
  target.turnData.trappedAtMoveStart = foeTrapped(target);
}
export function snapshotTargetBindState(target: Pokemon): void {
  target.turnData.boundAtMoveStart = !!target.getTag(BattlerTagType.BIND);
}

export const anyFoeBurnedGate: YuGateFunc = (user) =>
  user.scene.getField(!user.isPlayer()).some(p => p.status?.effect === StatusEffect.BURN);

export const anyFoeBurnedOrCursedGate: YuGateFunc = (user) =>
  user.scene.getField(!user.isPlayer()).some(p =>
    p.status?.effect === StatusEffect.BURN || !!p.getTag(BattlerTagType.CURSED));

export const anyFoeSeededGate: YuGateFunc = (user) => anyActiveFoe(user, p => !!p.getTag(BattlerTagType.SEEDED));

export const anyNegativeStageGate: YuGateFunc = (user) =>
  user.scene.getField(!user.isPlayer()).some(p =>
    p.summonData.battleStats.slice(0, 7).some(v => v < 0));

export const aquaRingActiveGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.AQUA_RING);

export const aquaRingGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.AQUA_RING);

export const at1HpGate: YuGateFunc = (user) => user.hp === 1;

const boostOnly = (stage: integer) => Math.max(0, stage);

export const atkGtDefPlusSpeGate: YuGateFunc = (user) => {
  const s = user.summonData.battleStats;
  return boostOnly(s[BattleStat.ATK]) > boostOnly(s[BattleStat.DEF]) + boostOnly(s[BattleStat.SPD]);
};

export const atkStageGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] >= 2;

export const atkStageGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] >= 3;

export const atkStagesGtSpAtkGate: YuGateFunc = (user) =>
  user.summonData.battleStats[BattleStat.ATK] > user.summonData.battleStats[BattleStat.SPATK];

export const atkStagesGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] >= 2;

export const auroraVeilActiveGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.AURORA_VEIL);

const currentHitIndex = (user: Pokemon) => user.turnData.hitCount - user.turnData.hitsLeft + 1;

export const barrageHit1Gate: YuGateFunc = (user) => currentHitIndex(user) === 1;

export const barrageHit2Gate: YuGateFunc = (user) => currentHitIndex(user) === 2;

export const barrageHit3Gate: YuGateFunc = (user) => currentHitIndex(user) === 3;

export const below25HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() / 4);

export const below30HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() * 0.3);

export const below30HpWithSubGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() * 0.3) && !!user.getTag(BattlerTagType.SUBSTITUTE);

export const below33HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() * 0.33);

export const below50HpAndStagesGte2Gate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() / 2) && sumPositiveStages(user) >= 2;

export const below50HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() / 2);

export const below70HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() * 0.7);

export const below75HpGate: YuGateFunc = (user) => user.hp <= Math.floor(user.getMaxHp() * 0.75);

export const belowHalfHpFoeGate: YuGateFunc = (_u, target) => target.hp <= Math.floor(target.getMaxHp() / 2);

export const berryConsumedThisTurnGate: YuGateFunc = (user) => !!user.turnData.berryConsumedThisTurn;
export const boostClusterGate: YuGateFunc = (user) => highestPositiveStage(user) >= 3;

export const alwaysTrueGate: YuGateFunc = () => true;
export const desertSandTombGate: YuGateFunc = alwaysTrueGate;
export const sameStatBoostGte3Gate: YuGateFunc = (user) =>
  user.summonData.battleStats.slice(0, 5).some(v => v >= 3);

export const firstTurnGate: YuGateFunc = (user) => switchedInThisTurn(user);

export const firstTurnOnlyGate: YuGateFunc = (user) => switchedInThisTurn(user);

export const firstTurnAndBoostClusterGate: YuGateFunc = andGate(firstTurnGate, boostClusterGate);

export const firstTurnAndSameStatBoostGate: YuGateFunc = andGate(firstTurnGate, sameStatBoostGte3Gate);

export const boostsIn3DifferentStatsGate: YuGateFunc = (user) =>
  user.summonData.battleStats.slice(0, 5).filter(v => v > 0).length >= 3;

export const userHoldsBerryGate: YuGateFunc = (user) => holdsBerry(user);

export const userExactlyOneBerryGate: YuGateFunc = (user) => user.getHeldItems().filter(i => i instanceof BerryModifier).length === 1;

export const userMovedLastGate: YuGateFunc = (user, target) => {
  const foe = primaryOpponent(user, target);
  return !!foe && foe.turnData.acted && user.turnData.order > foe.turnData.order;
};

export const boostsGte3Gate: YuGateFunc = (user) => sumPositiveStages(user) >= 3;
export const boundGate: YuGateFunc = (_u, target) => target.turnData.boundAtMoveStart === true;

export const burnedAndCursedGate: YuGateFunc = (_u, target) => target.status?.effect === StatusEffect.BURN && !!target.getTag(BattlerTagType.CURSED);

export const burnedAndTrappedGate: YuGateFunc = (_u, target) => target.status?.effect === StatusEffect.BURN && foeTrapped(target);

export const burnedGate: YuGateFunc = (user, target) => foeForGate(user, target).status?.effect === StatusEffect.BURN;
export const burnedNotCursedGate: YuGateFunc = (_u, target) =>
  target.status?.effect === StatusEffect.BURN && !target.getTag(BattlerTagType.CURSED);
export const cursedNotBurnedGate: YuGateFunc = (_u, target) =>
  !!target.getTag(BattlerTagType.CURSED) && target.status?.effect !== StatusEffect.BURN;

export const burnedOrCursedGate: YuGateFunc = (_u, target) =>
  target.status?.effect === StatusEffect.BURN || !!target.getTag(BattlerTagType.CURSED);

export const chargeReleasedLastTurnGate: YuGateFunc = (user) =>
  !!user.battleSummonData?.chargeReleasedLastTurn;
export const chargeReleaseTurnGate: YuGateFunc = (user, _t, move) => {
  const lastMove = user.getLastXMoves().find(() => true);
  if (!lastMove || lastMove.move !== move.id) {
    return false;
  }
  if (lastMove.result === MoveResult.OTHER) {
    return true;
  }

  if (lastMove.result === MoveResult.SUCCESS && lastMove.turn === battleTurn(user)) {
    const hist = user.getMoveHistory();
    const prev = hist.length >= 2 ? hist[hist.length - 2] : undefined;
    return !!prev && prev.move === move.id && prev.result === MoveResult.OTHER;
  }
  return false;
};

export const chargedGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.CHARGED);

export const chargingGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.CHARGING);

export const confusedGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.CONFUSED);

export const consecutiveUseGate: YuGateFunc = (user, _t, move) => usedSameMoveLastTurn(user, move);

export const consecutiveMoveCountGteGate = (minimum: integer): YuGateFunc => (user, _t, move) =>
  consecutiveSameMoveCount(user, move) >= minimum;

export const consecutiveMoveCountGte2Gate: YuGateFunc = (user, _t, move) =>
  consecutiveSameMoveCount(user, move) >= 2;

export const copiedAbilityGate: YuGateFunc = (user) =>
  user.summonData.ability !== Abilities.NONE && user.summonData.ability !== user.getSpeciesForm().getAbility(user.abilityIndex);

export const critThisMoveGate: YuGateFunc = (user) => !!user.turnData.critApplied;

export const critFinalHitGate: YuGateFunc = andGate(critThisMoveGate, lastHitOnlyGate);

export const cursedGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.CURSED);

export const foeCursedGate: YuGateFunc = (user, target) => !!foeForGate(user, target).getTag(BattlerTagType.CURSED);
export const darkMagicMoveGate2: YuGateFunc = (user) => partyOtherMoveFlagCount(user, MoveFlags.DARK_MAGIC_MOVE, 2);

export const defSpDefTotalGte3Gate: YuGateFunc = (user) => sumPositiveDefSpDefStages(user) >= 3;

export const defSpDefTotalGte6Gate: YuGateFunc = (user) => sumPositiveDefSpDefStages(user) >= 6;

export const defStagesGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.DEF] >= 2;

export const doubleSeGate: YuGateFunc = (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 4;

export const dragonKoGate: YuGateFunc = (user) => preyKoTypeGate(user, Type.DRAGON);

export const dragonSwitchInGate: YuGateFunc = (_u, target) => switchedInThisTurn(target) && foeHasType(target, Type.DRAGON);

export const dragonTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.DRAGON);

export const dualExtremeStatsGate: YuGateFunc = (user) => {
  const s = user.summonData.battleStats.slice(0, 7);
  return s.filter(v => v >= 3).length >= 2 && s.filter(v => v <= -2).length >= 2;
};

export const electricTerrainGate: YuGateFunc = (user) => terrainIs(user, TerrainType.ELECTRIC);

export const entryAfterFaintGate: YuGateFunc = (user) =>
  user.battleSummonData?.enteredFromKnockOut === true && switchedInThisTurn(user);

export const evasionGte1Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] >= 1;

export const evasionGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] >= 2;

export const evasionGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] >= 3;

export const evasionStageGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] !== 0;

export const evasionStageGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] >= 2;

export const faintedAlliesGte3Gate: YuGateFunc = (user) =>
  user.scene.getParty(user.isPlayer()).filter(p => p !== user && p.isFainted()).length >= 3;

export const darkFaintedGate1: YuGateFunc = (user) => partyFaintedTypeCount(user, Type.DARK, 1);

export const fairyFaintedGate1: YuGateFunc = (user) => partyFaintedAllyTypeCount(user, Type.FAIRY, 1);

export const fairyFaintedGate2: YuGateFunc = (user) => partyFaintedAllyTypeCount(user, Type.FAIRY, 2);

export const firstHitCritGate: YuGateFunc = (user) => currentHitIndex(user) === 1 && !!user.turnData.critApplied;

export const flinchedFoeLastTurnGate: YuGateFunc = (_u, target) => !!target.battleSummonData?.flinchedLastTurn;

export const flyingAllyGate3: YuGateFunc = (user) => partyMoveFlagCount(user, MoveFlags.FLYING_MOVE, 3);

export const foeAbove50HpGate: YuGateFunc = (_u, target) => target.hp > Math.floor(target.getMaxHp() / 2);

export const foeAbove60HpGate: YuGateFunc = (_u, target) => target.hp > Math.floor(target.getMaxHp() * 0.6);
export const foeNotAbove60HpGate: YuGateFunc = (user, target, move) => !foeAbove60HpGate(user, target, move);

export const foeAccNegativeGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.battleStats[BattleStat.ACC] < 0;

export const foeAirborneGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.FLYING) || !!target.getTag(BattlerTagType.UNDERWATER) || !!target.getTag(BattlerTagType.UNDERGROUND);

export const foeAlreadyStatusedGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return !!foe.status?.effect && isNonVolatileStatusEffect(foe.status.effect);
};

export const foeAsleepGate: YuGateFunc = (user, target) =>
  foeForGate(user, target).status?.effect === StatusEffect.SLEEP;

export const foeAsleepOrConfusedGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return foe.status?.effect === StatusEffect.SLEEP || !!foe.getTag(BattlerTagType.CONFUSED);
};

export const foeAtkLtSpAtkGate: YuGateFunc = (_u, target) =>
  target.summonData.battleStats[BattleStat.ATK] < target.summonData.battleStats[BattleStat.SPATK];

export const foeAtkNegativeGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.battleStats[BattleStat.ATK] < 0;

export const foeAtkSpAtkMinus2Gate: YuGateFunc = (_u, target) =>
  target.summonData.battleStats[BattleStat.ATK] <= -2 || target.summonData.battleStats[BattleStat.SPATK] <= -2;

export const foeAtkSwappedGate: YuGateFunc = (user, target) =>
  foeForGate(user, target).summonData.atkSpAtkSwapped === true;

export const foeBelow30HpGate: YuGateFunc = (_u, target) => target.hp <= Math.floor(target.getMaxHp() * 0.3);

export const foeBelow33HpGate: YuGateFunc = (_u, target) => target.hp <= Math.floor(target.getMaxHp() * 0.33);

export const foeBelow40HpGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return foe.hp <= Math.floor(foe.getMaxHp() * 0.4);
};

export const foeBelow50HpGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return foe.hp <= Math.floor(foe.getMaxHp() / 2);
};

export const foeBstHigherGate: YuGateFunc = (user, target) => target.getSpeciesForm().baseTotal > user.getSpeciesForm().baseTotal;

export const foeConfusedOrParalyzedGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.CONFUSED) || target.status?.effect === StatusEffect.PARALYSIS;

export const foeDarkTypeGate: YuGateFunc = (user, target) => foeHasType(foeForGate(user, target), Type.DARK);

export const foeDefBelowAtkGate: YuGateFunc = (user, target) =>
  target.getBattleStat(Stat.DEF) < user.getBattleStat(Stat.ATK);

export const foeDefGtAtkGate: YuGateFunc = (_u, target) => target.getBattleStat(Stat.DEF) > target.getBattleStat(Stat.ATK);

export const foeDefLtAtkGate: YuGateFunc = (_u, target) =>
  target.getBattleStat(Stat.DEF) < target.getBattleStat(Stat.ATK);

export const foeDefNegativeGate: YuGateFunc = (user, target) =>
  foeForGate(user, target).summonData.battleStats[BattleStat.DEF] < 0;

export const foeDragonBurnedGate: YuGateFunc = (_u, target) => foeHasType(target, Type.DRAGON) && target.status?.effect === StatusEffect.BURN;

export const foeDragonTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.DRAGON);

export const foeDrowsyGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.DROWSY);

export const foeEvaLteMinus2Gate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.EVA] <= -2;

export const foeEvaNegativeGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.EVA] < 0;

export const foeFlyingTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.FLYING);

export const foeGhostTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.GHOST);

export const foeGroundRockTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.GROUND, Type.ROCK);

export const foeHasItemGate: YuGateFunc = (_u, target) => hasTransferrableItem(target);

export const foeHitUserSeThisTurnGate: YuGateFunc = (user, target) => user.turnData.attacksReceived.some(r => r.sourceId === target.id && r.damage > 0 && target.getAttackTypeEffectiveness(allMoves[r.move]?.type ?? Type.NORMAL, user) >= 2);

export const foeIsSteelGate: YuGateFunc = (user, target) => foeHasType(foeForGate(user, target), Type.STEEL);

export const foeMoveDisabledGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.disabledTurns > 0;

export const foeMovedFirstGate: YuGateFunc = (user, target) => target.turnData.acted && target.turnData.order < user.turnData.order;

export const foeNegativeAtkGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.ATK] < 0;

export const foeNegativeDefGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.DEF] < 0;

export const foeNegativeSpeGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] < 0;

export const foeNegativeStagesGate: YuGateFunc = (user, target) =>
  anyStatStageLte(foeForGate(user, target), -1);

export const foeNotDarkTypeGate: YuGateFunc = (user, target) => !foeHasType(foeForGate(user, target), Type.DARK);

export const foeNotRockTypeGate: YuGateFunc = (_u, target) => !foeHasType(target, Type.ROCK);

export const foeNotSwappedGate: YuGateFunc = (_u, target) =>
  !target.summonData.atkSpAtkSwapped;

export const foePoisonedGate: YuGateFunc = (user, target) => { const foe = foeForGate(user, target); return foe.status?.effect === StatusEffect.POISON || foe.status?.effect === StatusEffect.TOXIC; };

export const foePoisonedLastHitGate: YuGateFunc = andGate(foePoisonedGate, lastHitOnlyGate);

export const foePositiveStagesGate: YuGateFunc = (user, target) => sumPositiveStages(foeForGate(user, target)) > 0;

export const foePrevMoveMissedGate: YuGateFunc = (_u, target) => prevMoveMissedOrFailed(target);

export const foeRockTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.ROCK);

export const foeSpAtkGtSpDefGate: YuGateFunc = (_u, target) => target.getBattleStat(Stat.SPATK) > target.getBattleStat(Stat.SPDEF);

export const foeSpAtkNegativeGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.battleStats[BattleStat.SPATK] < 0;

export const foeSpDefGtSpAtkGate: YuGateFunc = (_u, target) => target.getBattleStat(Stat.SPDEF) > target.getBattleStat(Stat.SPATK);

export const foeSpDefLtSpAtkGate: YuGateFunc = (_u, target) => target.getBattleStat(Stat.SPDEF) < target.getBattleStat(Stat.SPATK);

export const foeSpDefNegativeGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.battleStats[BattleStat.SPDEF] < 0;

export const foeSpdLoweredGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] < 0;

export const foeSpdNegativeGate: YuGateFunc = (user, target) => foeForGate(user, target).summonData.battleStats[BattleStat.SPD] < 0;

export const foeSpdStageLteMinus2Gate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] <= -2;

export const foeSpdStageLteMinus3Gate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] <= -3;

export const foeSpeLoweredGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] < 0;

export const foeSpeNegativeGate: YuGateFunc = (_u, target) => target.summonData.battleStats[BattleStat.SPD] < 0;

export const foeSpikesGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return !!foe.scene.arena.getTagOnSide(ArenaTagType.SPIKES, userSide(foe));
};

export const foeStatLteMinus2Gate: YuGateFunc = (user, target) => anyStatStageLte(foeForGate(user, target), -2);

export const foeStealthRockGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return !!foe.scene.arena.getTagOnSide(ArenaTagType.STEALTH_ROCK, userSide(foe));
};

export const foeSwitchingGate: YuGateFunc = (user, target) => user.scene.currentBattle.turnCommands[target.getBattlerIndex()]?.command === Command.POKEMON;

export const foeTeamHasDragonGate: YuGateFunc = (user) => user.scene.getParty(!user.isPlayer()).some(p => foeHasType(p, Type.DRAGON));

export const foeTeamHasGroundRockGate: YuGateFunc = (user) =>
  user.scene.getParty(!user.isPlayer()).some(p => foeHasType(p, Type.GROUND, Type.ROCK));

export const foeTormentGate: YuGateFunc = (user, target) => !!foeForGate(user, target).getTag(BattlerTagType.TORMENT);

export const foeTotalStagesLteMinus3Gate: YuGateFunc = (_u, target) => sumNegativeStages(target) <= -3;

export const foeTotalStagesLteMinus4Gate: YuGateFunc = (_u, target) => sumNegativeStages(target) <= -4;

export const foeUnderEncoreOrDisableGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return !!foe.getTag(BattlerTagType.ENCORE) || foe.summonData.disabledTurns > 0;
};

export const foeUsedContactLastTurnGate: YuGateFunc = (_u, target) => !!prevTurnMoveDef(target)?.hasFlag(MoveFlags.MAKES_CONTACT);

export const foeUsedNonSeThisTurnGate: YuGateFunc = (user, target) => user.turnData.attacksReceived.some(r => r.sourceId === target.id && r.damage > 0 && target.getAttackTypeEffectiveness(allMoves[r.move]?.type ?? Type.NORMAL, user) < 2);

export const foeUsedSpecialLastTurnGate: YuGateFunc = (_u, target) => moveCategoryAt(target, battleTurn(target) - 1) === MoveCategory.SPECIAL;

export const foeUsedSpecialThisTurnGate: YuGateFunc = (_u, target) => moveCategoryAt(target, battleTurn(target)) === MoveCategory.SPECIAL;

export const foeUsedStatusLastTurnGate: YuGateFunc = (_u, target) => moveCategoryAt(target, battleTurn(target) - 1) === MoveCategory.STATUS;

export const foeUsedStatusRecentGate: YuGateFunc = (_u, target) => moveCategoryAt(target, battleTurn(target)) === MoveCategory.STATUS || moveCategoryAt(target, battleTurn(target) - 1) === MoveCategory.STATUS;

export const foeUsedStatusThisTurnGate: YuGateFunc = (_u, target) => moveCategoryAt(target, battleTurn(target)) === MoveCategory.STATUS;

export const foeVolatileStateGate: YuGateFunc = (user, target) => {
  const foe = foeForGate(user, target);
  return (!!foe.status?.effect && isNonVolatileStatusEffect(foe.status.effect)) || !!foe.getTag(BattlerTagType.CONFUSED) || !!foe.getTag(BattlerTagType.INFATUATED);
};

export const foeWeakToMoveGate: YuGateFunc = (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2;

export const foeWhirlpoolGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.WHIRLPOOL);

export const foeWouldResistGate: YuGateFunc = (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) < 1;

export const foeWrappedAnyGate: YuGateFunc = (user) => anyActiveFoe(user, p => foeTrapped(p));

export const frozenGate: YuGateFunc = (user, target) => foeForGate(user, target).status?.effect === StatusEffect.FREEZE;

export const fullHpGate: YuGateFunc = (user) => user.hp >= user.getMaxHp();

export const fullParaLastTurnGate: YuGateFunc = (_u, target) => !!target.battleSummonData?.fullParaLastTurn;

export const gadgetMoveGate2: YuGateFunc = (user) => partyMoveFlagCount(user, MoveFlags.GADGET_MOVE, 2);

export const gateTriadActiveGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.TAILWIND) || terrainIs(user, TerrainType.ELECTRIC) || (activeWeather(user) === WeatherType.RAIN || activeWeather(user) === WeatherType.HEAVY_RAIN);

export const ghostMoveGate3: YuGateFunc = (user) => partyMoveFlagCount(user, MoveFlags.GHOST_MOVE, 3);

export const grassAllyFaintedGate: YuGateFunc = (user) =>
  user.scene.getParty(user.isPlayer()).filter(p => p.id !== user.id && p.isFainted() && (p.getType1() === Type.GRASS || p.getType2() === Type.GRASS)).length >= 1;

export const grassyTerrainGate: YuGateFunc = (user) => terrainIs(user, TerrainType.GRASSY);

export const gravityActiveGate: YuGateFunc = (user) => !!user.scene.arena.getTag(ArenaTagType.GRAVITY);

export const hailGate: YuGateFunc = (user) => {
  const w = activeWeather(user);
  return w === WeatherType.HAIL || w === WeatherType.SNOW;
};

export const hasSubstituteGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.SUBSTITUTE);
export const highestBoostGte3Gate: YuGateFunc = (user) => highestPositiveStage(user) >= 3;

export const holdsBerryGate: YuGateFunc = (user) => holdsBerry(user);

export const infatuatedGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.INFATUATED);

export const foeInfatuatedGate: YuGateFunc = (user, target) => !!foeForGate(user, target).getTag(BattlerTagType.INFATUATED);

export const ingrainGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.INGRAIN);

export const itemlessAndDisabledGate: YuGateFunc = (_u, target) => hasNoTransferrableItem(target) && target.summonData.disabledTurns > 0;

export const itemlessAndSuppressedGate: YuGateFunc = (_u, target) => hasNoTransferrableItem(target) && target.summonData.abilitySuppressed;

export const itemlessGate: YuGateFunc = (_u, target) => hasNoTransferrableItem(target);

export const lastMoveBitingGate: YuGateFunc = (user) => !!prevTurnMoveDef(user)?.hasFlag(MoveFlags.BITING_MOVE);

export const lastMoveDarkGate: YuGateFunc = (user) => prevTurnMoveDef(user)?.type === Type.DARK;

export const lastMoveFireGate: YuGateFunc = (user) => prevTurnMoveDef(user)?.type === Type.FIRE;

export const lastMoveSlicingGate: YuGateFunc = (user) => !!prevTurnMoveDef(user)?.hasFlag(MoveFlags.SLICING_MOVE);

export const lastPartyMonGate: YuGateFunc = (user) => user.scene.getParty(user.isPlayer()).filter(p => p.isAllowedInBattle() && !p.isFainted()).length <= 1;

export const lightScreenActiveGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.LIGHT_SCREEN);

export const magnetGate2: YuGateFunc = (user) => partyOtherMoveFlagCount(user, MoveFlags.MAGNET_MOVE, 2);

export const mistyTerrainGate: YuGateFunc = (user) => terrainIs(user, TerrainType.MISTY);

export const moveIsSeGate: YuGateFunc = (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2;
export const moveIsSeNotDoubleGate: YuGateFunc = (user, target, move) => {
  const eff = target.getAttackTypeEffectiveness(move.type, user);
  return eff >= 2 && eff < 4;
};

export const moveTypeGate: YuGateFunc = (_u, _t, move) => move.type === Type.ICE || move.type === Type.ROCK;

export const movedLastGate: YuGateFunc = (user, target) => {
  const foe = primaryOpponent(user, target);
  return !!foe?.turnData.acted && user.turnData.order > foe.turnData.order;
};

export const multiHitLastTurnGate: YuGateFunc = (user) => !!prevTurnMoveDef(user)?.hasAttr(MultiHitAttr);

const netStatTotal = (pokemon: Pokemon) =>
  pokemon.summonData.battleStats.slice(0, 7).reduce((s, v) => s + v, 0);

export const netStatTotalGte3Gate: YuGateFunc = (user) => netStatTotal(user) >= 3;

export const netStatTotalLteMinus2Gate: YuGateFunc = (user) => netStatTotal(user) <= -2;

export const nightBiomeGate: YuGateFunc = (user) => user.battleData?.nightBiomeActive === true || user.scene.arena.getTimeOfDay() === TimeOfDay.NIGHT;

export const noAtkBoostsGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] <= 0;

export const noAuroraVeilGate: YuGateFunc = (user) => !sideHasTag(user, ArenaTagType.AURORA_VEIL);

export const noRainGate: YuGateFunc = (user) => { const w = activeWeather(user); return w !== WeatherType.RAIN && w !== WeatherType.HEAVY_RAIN; };

export const noSubstituteGate: YuGateFunc = (user) => !user.getTag(BattlerTagType.SUBSTITUTE);

export const notMovedThisTurnGate: YuGateFunc = (user) => !lastMoveOnTurn(user, battleTurn(user));

export const ojamaMoveGate3: YuGateFunc = (user) => partyMoveFlagCountIncludingFainted(user, MoveFlags.OJAMA_MOVE, 3);

export const ojamaLastHitGate: YuGateFunc = (user, target, move) =>
  ojamaMoveGate3(user, target, move) && lastHitOnlyGate(user, target, move);

export const onCritGate: YuGateFunc = (user) => !!user.turnData.critApplied;

export const onKoGate: YuGateFunc = (_u, target) => !target.hp || !!target.turnData?.willFaintThisTurn;

export const paralyzedGate: YuGateFunc = (user, target) => foeForGate(user, target).status?.effect === StatusEffect.PARALYSIS;

export const partyFainted2Gate: YuGateFunc = (user) => partyFaintedCount(user) >= 2;

export const partyFainted3Gate: YuGateFunc = (user) => partyFaintedCount(user) >= 3;

export const partyFaintedGate: YuGateFunc = (user) => partyFaintedCount(user) >= 1;

export const phase2AndAtkBoostGate: YuGateFunc = (user, target, move) =>
  (user.battleSummonData?.turnCount ?? 0) >= 2 && atkStageGte2Gate(user, target, move);

export const poisonedGate: YuGateFunc = (_u, target) => target.status?.effect === StatusEffect.POISON || target.status?.effect === StatusEffect.TOXIC;

export const prevMoveMissedGate: YuGateFunc = (user) => prevMoveMissedOrFailed(user);

export const preyKoFireGate: YuGateFunc = (user) => preyKoTypeGate(user, Type.FIRE);

export const preyKoGroundGate: YuGateFunc = (user) => preyKoTypeGate(user, Type.GROUND);

export const preyKoWaterGate: YuGateFunc = (user) => preyKoTypeGate(user, Type.WATER);

export const foeNotHitUserThisTurnGate: YuGateFunc = (user, target) =>
  !user.turnData.attacksReceived.some(r => r.sourceId === target.id && r.damage > 0);

export const foeScreensActiveGate: YuGateFunc = (_u, target) =>
  !!target.scene.arena.getTagOnSide(ArenaTagType.REFLECT, userSide(target)) ||
  !!target.scene.arena.getTagOnSide(ArenaTagType.LIGHT_SCREEN, userSide(target));

export const preyTypeGate: YuGateFunc = (_u, target) => foeHasType(target, Type.WATER, Type.GROUND, Type.FIRE);

export const psychicTerrainGate: YuGateFunc = (user) => terrainIs(user, TerrainType.PSYCHIC);

export const rainGate: YuGateFunc = (user) => { const w = activeWeather(user); return w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN; };

export const reflectActiveGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.REFLECT);

export const saltCureGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.SALT_CURED);

export const sameAbilityAsFoeGate: YuGateFunc = (user, target) => {
  const ua = user.getAbility().id;
  const ta = target.getAbility().id;
  return ua !== Abilities.NONE && ua === ta;
};

export const sameTypeGate: YuGateFunc = (user, target) => {
  const u = user.getTypes(true);
  const t = target.getTypes(true);
  return u.some(x => t.includes(x));
};

export const seededAndAsleepGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.SEEDED) && target.status?.effect === StatusEffect.SLEEP;

export const seededGate: YuGateFunc = (_u, target) => !!target.getTag(BattlerTagType.SEEDED);

export const snowGate: YuGateFunc = (user) => {
  const w = activeWeather(user);
  return w === WeatherType.SNOW || w === WeatherType.HAIL;
};

export const soleSurvivorGate: YuGateFunc = (user) => user.scene.getParty(user.isPlayer()).filter(p => p.isAllowedInBattle() && !p.isFainted()).length === 1;

export const spAtkBoostedGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPATK] > 0;

export const spAtkGtSpDefGate: YuGateFunc = (user) => user.getBattleStat(Stat.SPATK) > user.getBattleStat(Stat.SPDEF);

export const spAtkGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPATK] >= 3;

export const spAtkStagesGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPATK] >= 3;

export const spDefGtSpAtkGate: YuGateFunc = (user) => user.getBattleStat(Stat.SPDEF) > user.getBattleStat(Stat.SPATK);

export const speBoostsGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPD] >= 2;

export const speedBoostedGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPD] > 0;

export const speedStageGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPD] >= 2;

export const speedStageGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPD] >= 3;

export const statAtMinus2Gate: YuGateFunc = (user) => anyStatStageLte(user, -2);
const isTargetAbilitySuppressed = (user: Pokemon, target: Pokemon): boolean => {
  if (target.summonData.abilitySuppressed === true) {
    return true;
  }
  if (!target.status?.effect || !isNonVolatileStatusEffect(target.status.effect)) {
    return false;
  }
  return target.getOpponents().some(p => p?.isActive(true) && p.getAbility().id === Abilities.A_SUPPRESSION && p.canApplyAbility());
};

export const statusedAndSuppressedGate: YuGateFunc = (user, target) =>
  !!target.status?.effect && isNonVolatileStatusEffect(target.status.effect) && isTargetAbilitySuppressed(user, target);

export const statusedAndThreeNegativesGate: YuGateFunc = (_u, target) =>
  !!target.status?.effect && isNonVolatileStatusEffect(target.status.effect) && sumNegativeStages(target) <= -3;

export const statusedAndTwoNegativesGate: YuGateFunc = (_u, target) =>
  !!target.status?.effect && isNonVolatileStatusEffect(target.status.effect) &&
  target.summonData.battleStats.slice(0, 7).filter(v => v < 0).length >= 2;

export const statusedAndHasItemGate: YuGateFunc = (_u, target) =>
  !!target.status?.effect && isNonVolatileStatusEffect(target.status.effect) && !!target.getHeldItems().length;

export const darkAndFairyFaintedGate1: YuGateFunc = (user) =>
  partyFaintedTypeCount(user, Type.DARK, 1) && partyFaintedTypeCount(user, Type.FAIRY, 1);
export const lusterGenesisTriadFaintedGate1: YuGateFunc = (user) => {
  const fainted = user.scene.getParty(user.isPlayer()).filter(p => p.isFainted());
  const hasType = (p: Pokemon, type: Type) => p.isOfType(type, false);
  const isDarkFairy = (p: Pokemon) => hasType(p, Type.DARK) && hasType(p, Type.FAIRY);

  const dual = fainted.find(isDarkFairy);
  if (!dual) {
    return false;
  }
  const darkMon = fainted.find(p => p.id !== dual.id && hasType(p, Type.DARK));
  if (!darkMon) {
    return false;
  }
  const fairyMon = fainted.find(p => p.id !== dual.id && p.id !== darkMon.id && hasType(p, Type.FAIRY));
  return !!fairyMon;
};
export const faintedTypeCountGate = lusterGenesisTriadFaintedGate1;
export const revivalSustainTier2Gate = darkAndFairyFaintedGate1;
export const revivalSustainTriadGate = lusterGenesisTriadFaintedGate1;
export const bullsRevengeGate = allyFaintedLastTurnGate;
export const foeNoTransferrableItemGate: YuGateFunc = (_u, target) => hasNoTransferrableItem(target);

export const userCausedFlinchLastTurnGate: YuGateFunc = (user) => !!user.battleSummonData?.causedFlinchLastTurn;

export const below25HpOncePerBattleGate: YuGateFunc = (user) =>
  user.hp <= Math.floor(user.getMaxHp() / 4) && !user.battleData.phoenixBarkUsed;
export const statusedGate: YuGateFunc = foeAlreadyStatusedGate;

export const subAndRingGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.SUBSTITUTE) && !!user.getTag(BattlerTagType.AQUA_RING);

export const subBrokenThisTurnGate: YuGateFunc = (user) => !!user.turnData.subBrokenThisTurn;

export const sunGate: YuGateFunc = (user) => { const w = activeWeather(user); return w === WeatherType.SUNNY || w === WeatherType.HARSH_SUN; };

export const sunChargeReleaseGate: YuGateFunc = andGate(sunGate, chargeReleaseTurnGate);

export const superEffectiveGate: YuGateFunc = (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2;

export const suppressedGate: YuGateFunc = (user, target) => isTargetAbilitySuppressed(user, target);

export const switchedInThisTurnGate: YuGateFunc = (user, target) => foeSwitchedInThisTurn(foeForGate(user, target));

export const tailwindActiveGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.TAILWIND);
export const gateTriadFullGate: YuGateFunc = andGate(rainGate, electricTerrainGate, tailwindActiveGate);

export const tailwindActiveUserGate: YuGateFunc = (user) => sideHasTag(user, ArenaTagType.TAILWIND);

export const terrainActiveGate: YuGateFunc = (user) => user.scene.arena.getTerrainType() !== TerrainType.NONE;

export const servantMoveGate2: YuGateFunc = (user) => partyMoveFlagCount(user, MoveFlags.SERVANT_MOVE, 2);

export const timeMoveGate2: YuGateFunc = (user) => partyOtherMoveFlagCount(user, MoveFlags.TIME_MOVE, 2);

export const totalStagesGte3Gate: YuGateFunc = (user) => sumPositiveStages(user) >= 3;

export const totalStagesGte4Gate: YuGateFunc = (user) => sumPositiveStages(user) >= 4;

export const trappedAndSeededGate: YuGateFunc = (_u, target) => foeTrapped(target) && !!target.getTag(BattlerTagType.SEEDED);

export const trappedGate: YuGateFunc = (user, target) => foeTrapped(foeForGate(user, target));

export const trappedOrDrowsyGate: YuGateFunc = (_u, target) => foeTrapped(target) || !!target.getTag(BattlerTagType.DROWSY);

export const turn1OutAndParaGate: YuGateFunc = (user, target) =>
  switchedInThisTurn(user) && target.status?.effect === StatusEffect.PARALYSIS;

export const turnsOnFieldGte3Gate: YuGateFunc = (user) => (user.battleSummonData?.turnCount ?? 0) >= 3;

export const typeDiffFromLastAttackGate: YuGateFunc = (user, target, move) => { const prev = prevTurnMove(user); return !!prev && allMoves[prev.move]?.type !== move.type; };
export const unionGate2: YuGateFunc = (user) => partyOtherMoveFlagCount(user, MoveFlags.UNION_MOVE, 2);
export const unionGate3: YuGateFunc = (user) => partyOtherMoveFlagCount(user, MoveFlags.UNION_MOVE, 3);
export const magnetAndSpAtkGte3Gate: YuGateFunc = (user) => spAtkGte3Gate(user, user, null as any);

export const revengeSwitchInGate: YuGateFunc = (user) =>
  switchedInThisTurn(user) && allyFaintedLastTurnGate(user, user, null as any);

export const foeFaintedDragonCountGte1Gate: YuGateFunc = (user) =>
  user.scene.getParty(!user.isPlayer()).filter(p => p.isFainted() && (p.getType1() === Type.DRAGON || p.getType2() === Type.DRAGON)).length >= 1;

export const incomingFoeDefGeAtkGate: YuGateFunc = DefGeAtkIncomingGate;

export const usedLastTurnGate: YuGateFunc = (user, _t, move) => usedSameMoveLastTurn(user, move);

export const usedSameMoveLastTurnGate: YuGateFunc = (user, _t, move) => usedSameMoveLastTurn(user, move);

export const usedStatusLastTurnGate: YuGateFunc = (user) => prevTurnMoveDef(user)?.category === MoveCategory.STATUS;

export const usedSteelLastTurnGate: YuGateFunc = (user) => prevTurnMoveDef(user)?.type === Type.STEEL;

export const userAnyStatGte2Gate: YuGateFunc = (user) => anyStatStageGte(user, 2);

export const userAtkPositiveGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] > 0;

export const userAtkStageGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] >= 2;

export const userAtkStageGte3Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.ATK] >= 3;

export const userConfusedGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.CONFUSED);

export const userCursedGate: YuGateFunc = (user) => !!user.getTag(BattlerTagType.CURSED);

export const userDamagedThisTurnGate: YuGateFunc = (user) => user.turnData.damageTaken > 0;

export const userUndamagedThisTurnGate: YuGateFunc = (user, target, move) =>
  !userDamagedThisTurnGate(user, target, move);

export const gravityInactiveGate: YuGateFunc = (user) => !gravityActiveGate(user);

export const userDefBoostGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.DEF] > 0;

export const userDefPositiveGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.DEF] > 0;

export const userDefStageGte2Gate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.DEF] >= 2;

export const userEvaPositiveGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.EVA] > 0;

export const userFaintsThisTurnGate: YuGateFunc = (user) => user.isFainted();

export const userHpLtFoeGate: YuGateFunc = (user, target) => user.hp < target.hp;

export const userItemlessGate: YuGateFunc = (user) => hasNoTransferrableItem(user);

export const userHasItemGate: YuGateFunc = (user) => hasTransferrableItem(user);

export const userMovedFirstGate: YuGateFunc = (user, target) => {
  const foe = primaryOpponent(user, target);
  return !!foe && user.turnData.order < foe.turnData.order;
};

export const userNegativeStageGate: YuGateFunc = (user) => sumNegativeStages(user) < 0;

export const userNotStatusedGate: YuGateFunc = (user) => !user.status?.effect || !isNonVolatileStatusEffect(user.status.effect);

export const userPositiveStageGate: YuGateFunc = (user) => sumPositiveStages(user) > 0;

export const userRevivedGate: YuGateFunc = (user) => user.battleData.wasRevived || user.battleData.abilityReviveUsed;

export const userSpAtkPositiveGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPATK] > 0;

export const userSpdPositiveGate: YuGateFunc = (user) => user.summonData.battleStats[BattleStat.SPD] > 0;

export const userStagesGte2Gate: YuGateFunc = (user) => sumPositiveStages(user) >= 2;

export const userStagesGte3Gate: YuGateFunc = (user) => sumPositiveStages(user) >= 3;

export const userStatGte2Gate: YuGateFunc = (user) => anyStatStageGte(user, 2);

export const userStatusedGate: YuGateFunc = (user) => !!user.status?.effect && isNonVolatileStatusEffect(user.status.effect);

export const userSwitchedInThisTurnGate: YuGateFunc = (user) => switchedInThisTurn(user);

export const weatherActiveGate: YuGateFunc = (user) => {
  const w = activeWeather(user);
  return w === WeatherType.SUNNY || w === WeatherType.HARSH_SUN
    || w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN
    || w === WeatherType.SANDSTORM || w === WeatherType.SNOW
    || w === WeatherType.HAIL || w === WeatherType.FOG;
};

export const windChargeGate: YuGateFunc = (user) =>
  !!user.getTag(BattlerTagType.WIND_CHARGED);

export const wishPendingGate: YuGateFunc = (user) => {
  const t = user.scene.arena.getTagOnSide(ArenaTagType.WISH, userSide(user));
  return !!t && t.turnCount > 1;
};

export const wishActiveGate: YuGateFunc = (user) => {
  const t = user.scene.arena.getTagOnSide(ArenaTagType.WISH, userSide(user));
  return !!t && t.turnCount <= 1;
};

export const yuGateRegistry: Record<string, YuGateFunc> = {
  DefGeAtkGate,
  DefGeAtkIncomingGate,
  abilityContactProcGate,
  abilityDoubleHitGate,
  abilityProcGate,
  alwaysTrueGate,
  abilityRecoilGate,
  above75HpGate,
  allHitsLandGate,
  allStatsGte1Gate,
  allyFaintedGate,
  allyFaintedLastTurnGate,
  retaliateGate,
  revivalSustainTier2Gate,
  revivalSustainTriadGate,
  allyFaintedThisBattleGate,
  allyKoLastTurnGate,
  alreadyTrappedGate,
  anyFoeBurnedGate,
  anyFoeBurnedOrCursedGate,
  anyFoeSeededGate,
  anyNegativeStageGate,
  aquaRingActiveGate,
  aquaRingGate,
  at1HpGate,
  atkGtDefPlusSpeGate,
  atkStageGte2Gate,
  atkStageGte3Gate,
  atkStagesGtSpAtkGate,
  atkStagesGte2Gate,
  auroraVeilActiveGate,
  barrageHit1Gate,
  barrageHit2Gate,
  barrageHit3Gate,
  below25HpGate,
  below25HpOncePerBattleGate,
  darkAndFairyFaintedGate1,
  below30HpGate,
  below30HpWithSubGate,
  below33HpGate,
  below50HpAndStagesGte2Gate,
  below50HpGate,
  below70HpGate,
  below75HpGate,
  belowHalfHpFoeGate,
  berryConsumedThisTurnGate,
  boostClusterGate,
  firstTurnAndBoostClusterGate,
  firstTurnAndSameStatBoostGate,
  sameStatBoostGte3Gate,
  boostsIn3DifferentStatsGate,
  boostsGte3Gate,
  bullsRevengeGate,
  boundGate,
  burnedAndCursedGate,
  burnedAndTrappedGate,
  burnedGate,
  burnedNotCursedGate,
  burnedOrCursedGate,
  cursedNotBurnedGate,
  chargeReleasedLastTurnGate,
  chargeReleaseTurnGate,
  chargedGate,
  chargingGate,
  confusedGate,
  consecutiveUseGate,
  consecutiveMoveCountGte2Gate,
  copiedAbilityGate,
  critThisMoveGate,
  critFinalHitGate,
  cursedGate,
  foeCursedGate,
  darkAndFairyFaintedGate1,
  darkFaintedGate1,
  darkMagicMoveGate2,
  defSpDefTotalGte3Gate,
  defSpDefTotalGte6Gate,
  defStagesGte2Gate,
  desertSandTombGate,
  doubleSeGate,
  dragonKoGate,
  dragonSwitchInGate,
  dragonTypeGate,
  dualExtremeStatsGate,
  electricTerrainGate,
  entryAfterFaintGate,
  evasionGte1Gate,
  evasionGte2Gate,
  evasionGte3Gate,
  evasionStageGate,
  evasionStageGte2Gate,
  faintedAlliesGte3Gate,
  faintedTypeCountGate,
  fairyFaintedGate1,
  fairyFaintedGate2,
  firstHitCritGate,
  firstTurnGate,
  firstTurnOnlyGate,
  flinchedFoeLastTurnGate,
  flyingAllyGate3,
  foeAbove50HpGate,
  foeAbove60HpGate,
  foeNotAbove60HpGate,
  foeAccNegativeGate,
  foeAirborneGate,
  foeAlreadyStatusedGate,
  foeAsleepGate,
  foeAsleepOrConfusedGate,
  foeAtkLtSpAtkGate,
  foeAtkNegativeGate,
  foeAtkSpAtkMinus2Gate,
  foeAtkSwappedGate,
  foeBelow30HpGate,
  foeBelow33HpGate,
  foeBelow40HpGate,
  foeBelow50HpGate,
  foeBstHigherGate,
  foeConfusedOrParalyzedGate,
  foeDarkTypeGate,
  foeDefBelowAtkGate,
  foeDefGtAtkGate,
  foeDefLtAtkGate,
  foeDefNegativeGate,
  foeDragonBurnedGate,
  foeDragonTypeGate,
  foeDrowsyGate,
  foeEvaLteMinus2Gate,
  foeEvaNegativeGate,
  foeFlyingTypeGate,
  foeGhostTypeGate,
  foeGroundRockTypeGate,
  foeHasItemGate,
  foeHitUserSeThisTurnGate,
  foeIsSteelGate,
  foeMoveDisabledGate,
  foeMovedFirstGate,
  foeNegativeAtkGate,
  foeNegativeDefGate,
  foeNegativeSpeGate,
  foeNegativeStagesGate,
  foeNotDarkTypeGate,
  foeNotRockTypeGate,
  foeNotSwappedGate,
  foePoisonedGate,
  foePoisonedLastHitGate,
  foePositiveStagesGate,
  foePrevMoveMissedGate,
  foeNotHitUserThisTurnGate,
  foeRockTypeGate,
  foeScreensActiveGate,
  foeSpAtkGtSpDefGate,
  foeSpAtkNegativeGate,
  foeSpDefGtSpAtkGate,
  foeSpDefLtSpAtkGate,
  foeSpDefNegativeGate,
  foeSpdLoweredGate,
  foeSpdNegativeGate,
  foeSpdStageLteMinus2Gate,
  foeSpdStageLteMinus3Gate,
  foeSpeLoweredGate,
  foeSpeNegativeGate,
  foeSpikesGate,
  foeStatLteMinus2Gate,
  foeStealthRockGate,
  foeSwitchingGate,
  foeNoTransferrableItemGate,
  foeTeamHasDragonGate,
  foeFaintedDragonCountGte1Gate,
  foeTeamHasGroundRockGate,
  foeTormentGate,
  foeTotalStagesLteMinus3Gate,
  foeTotalStagesLteMinus4Gate,
  foeUnderEncoreOrDisableGate,
  foeUsedContactLastTurnGate,
  foeUsedNonSeThisTurnGate,
  foeUsedSpecialLastTurnGate,
  foeUsedSpecialThisTurnGate,
  foeUsedStatusLastTurnGate,
  foeUsedStatusRecentGate,
  foeUsedStatusThisTurnGate,
  foeVolatileStateGate,
  foeWeakToMoveGate,
  foeWhirlpoolGate,
  foeWouldResistGate,
  foeWrappedAnyGate,
  frozenGate,
  fullHpGate,
  fullParaLastTurnGate,
  gadgetMoveGate2,
  gateTriadActiveGate,
  gateTriadFullGate,
  ghostMoveGate3,
  grassAllyFaintedGate,
  grassyTerrainGate,
  gravityActiveGate,
  gravityInactiveGate,
  hailGate,
  hasSubstituteGate,
  highestBoostGte3Gate,
  holdsBerryGate,
  infatuatedGate,
  incomingFoeDefGeAtkGate,
  ingrainGate,
  itemlessAndDisabledGate,
  itemlessAndSuppressedGate,
  itemlessGate,
  lastMoveBitingGate,
  lastMoveDarkGate,
  lastMoveFireGate,
  lastMoveSlicingGate,
  lastPartyMonGate,
  lastHitOnlyGate,
  lightScreenActiveGate,
  lusterGenesisTriadFaintedGate1,
  magnetGate2,
  magnetAndSpAtkGte3Gate,
  mistyTerrainGate,
  moveIsSeGate,
  moveIsSeNotDoubleGate,
  moveTypeGate,
  movedLastGate,
  multiHitLastTurnGate,
  netStatTotalGte3Gate,
  netStatTotalLteMinus2Gate,
  nightBiomeGate,
  noAtkBoostsGate,
  noAuroraVeilGate,
  noRainGate,
  noSubstituteGate,
  notMovedThisTurnGate,
  ojamaMoveGate3,
  ojamaLastHitGate,
  onCritGate,
  onKoGate,
  paralyzedGate,
  partyFainted2Gate,
  partyFainted3Gate,
  partyFaintedGate,
  phase2AndAtkBoostGate,
  poisonedGate,
  prevMoveMissedGate,
  preyKoFireGate,
  preyKoGroundGate,
  preyKoWaterGate,
  preyTypeGate,
  psychicTerrainGate,
  rainGate,
  reflectActiveGate,
  revengeSwitchInGate,
  servantMoveGate2,
  saltCureGate,
  sameAbilityAsFoeGate,
  sameTypeGate,
  seededAndAsleepGate,
  seededGate,
  snowGate,
  soleSurvivorGate,
  spAtkBoostedGate,
  spAtkGtSpDefGate,
  spAtkGte3Gate,
  spAtkStagesGte3Gate,
  spDefGtSpAtkGate,
  speBoostsGte2Gate,
  speedBoostedGate,
  speedStageGte2Gate,
  speedStageGte3Gate,
  statAtMinus2Gate,
  statusedAndSuppressedGate,
  statusedAndThreeNegativesGate,
  statusedAndTwoNegativesGate,
  statusedAndHasItemGate,
  statusedGate,
  subAndRingGate,
  subBrokenThisTurnGate,
  sunGate,
  sunChargeReleaseGate,
  superEffectiveGate,
  suppressedGate,
  switchedInThisTurnGate,
  tailwindActiveGate,
  tailwindActiveUserGate,
  terrainActiveGate,
  timeMoveGate2,
  totalStagesGte3Gate,
  totalStagesGte4Gate,
  trappedAndSeededGate,
  trappedGate,
  trappedOrDrowsyGate,
  turn1OutAndParaGate,
  turnsOnFieldGte3Gate,
  typeDiffFromLastAttackGate,
  unionGate2,
  unionGate3,
  usedLastTurnGate,
  usedSameMoveLastTurnGate,
  usedStatusLastTurnGate,
  usedSteelLastTurnGate,
  userAnyStatGte2Gate,
  userAtkPositiveGate,
  userAtkStageGte2Gate,
  userAtkStageGte3Gate,
  userConfusedGate,
  userCausedFlinchLastTurnGate,
  userCursedGate,
  userDamagedThisTurnGate,
  userUndamagedThisTurnGate,
  userDefBoostGate,
  userDefPositiveGate,
  userDefStageGte2Gate,
  userEvaPositiveGate,
  userFaintsThisTurnGate,
  userHpLtFoeGate,
  userItemlessGate,
  userHasItemGate,
  userHoldsBerryGate,
  userExactlyOneBerryGate,
  userMovedFirstGate,
  userMovedLastGate,
  userNegativeStageGate,
  userNotStatusedGate,
  userPositiveStageGate,
  userRevivedGate,
  userSpAtkPositiveGate,
  userSpdPositiveGate,
  userStagesGte2Gate,
  userStagesGte3Gate,
  userStatGte2Gate,
  userStatusedGate,
  userSwitchedInThisTurnGate,
  weatherActiveGate,
  windChargeGate,
  wishActiveGate,
  wishPendingGate,
};

export function resolveYuGate(id: string): YuGateFunc | undefined {
  return yuGateRegistry[id];
}