import Move, {
  AddArenaTagAttr, AddArenaTagChanceAttr, AddArenaTrapTagAttr, AddBattlerTagAttr, AnyTypeMultiplierAttr, AttackMove, ChangeTypeAttr, ConfuseAttr, CounterDamageAttr, CurseAttr, DelayedAttackAttr, DestinyBondAttr, DisableMoveAttr, FaintCountdownAttr, FlinchAttr, ForceSwitchOutAttr, JawLockAttr, MoveCategory, MoveEffectTrigger, MoveTarget, HealAttr, HealStatusEffectAttr, HighCritAttr, HitHealAttr, HpSplitAttr, IgnoreAccuracyAttr, IgnoreOpponentStatChangesAttr, IncrementMovePriorityAttr, LowHpPowerAttr, MatchUserTypeAttr, MovePowerMultiplierAttr, MultiHitAttr, MultiHitPowerIncrementAttr, MultiHitType, PartyStatusCureAttr, PostVictoryStatChangeAttr, ProtectAttr, RecoilAttr, ReducePpMoveAttr, RemoveHeldItemAttr, RemoveScreensAttr, ResetStatsAttr, SacrificialAttr, SacrificialAttrOnHit, SelfStatusMove, StatChangeAttr, StatChangeCountPowerAttr, StatusEffectAttr, StatusMove, StealHeldItemChanceAttr, SuppressAbilitiesAttr, TrapAttr, TypelessAttr,
} from "./move";
import { ChargeAnim } from "./battle-anims";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Moves } from "#enums/moves";
import {
  AbilityRecoilToHealAttr, AbilityTriggerCountPowerAttr, AddMovePowerAttr, AddSecondaryResistTypeAttr, AllyStatChangeAttr, AlternativeBreathGatedAllStatDropAttr, BerryConsumeCountPowerAttr, BerryHeldTypeOverrideAttr, BindingMoveTagAttr, BonusRandomMoveAfterAttr, BranchStatChangeByGateAttr, BreakSubstituteAttr, BypassAbilityAttr, BypassProtectAttr, ChanceCurseAttr, ChanceDisableMoveAttr, ChanceMultiHitAttr, ChangeFoePrimaryTypeAttr, ChargeMoveAttr, ChipDamageAttr, ClearAllNegativeStatsAndHealAttr, ClearHazardsAttr, ClearPositiveStatsAttr, ClimateShiftToggleAttr, CoinFlipDamageOrHealAttr, CoinFlipPowerAttr, CombatDepthStatDropAttr, ConditionalAddArenaTagAttr, ConditionalAddArenaTrapTagAttr, ConditionalAddBattlerTagAttr, ConditionalBonusHealIfTargetHasTagAttr, ConditionalConfuseAttr, ConditionalCounterDamageAttr, ConditionalDisableMoveAttr, ConditionalFinalHitFlinchAttr, ConditionalFinalHitStatChangeAttr, ConditionalFinalHitStatusEffectAttr, ConditionalFinalHitTrapAttr, ConditionalFlinchAttr, ConditionalForceSwitchOutAttr, ConditionalHealAttr, ConditionalHighCritAttr, ConditionalHitHealAttr, ConditionalInvertStatsAttr, ConditionalMultiHitAttr, ConditionalMultiStatusEffectAttr, ConditionalPartyStatusCureAttr, ConditionalPostAttackStatChangeAttr, ConditionalRandomStatChangeAttr, ConditionalSelfHealAttr, ConditionalStatChangeAttr, ConditionalStatusEffectAttr, ConditionalTrapAttr, ConfuseOnHitAttr, ConfuseOnReflectedHitAttr, ConsecutiveUseCapPowerAttr, ConsecutiveUsePowerAttr, ConsumeBoostsBpAndHealAttr, ConsumeBoostsForHazardAttr, ConsumeBoostsForPowerAttr, ConsumeUserBerryAttr, ContactStatDropAttr, ConvertBurnToFreezeAttr, ConvertFreezeToBurnAttr, CopyFoeStatStagesAttr, CopyFoeTypesAttr, CritProtectAttr, CritSnapshotAttr, CritTriggeredLowerHighestStatAttr, DamagedThisTurnMultiplierAttr, DefSpDefStagePowerAttr, DefStageCountPowerAttr, DefStagesScaledStatChangeAttr, DelayedRepeatAttackAttr, DelayedTrapAttr, DigChargeAttr, DistinctBoostHistoryPowerAttr, DoubleToxicSpikesLayersAttr, DualModePulseAttr, DualTypeMultiHitAttr, EncoreOrDisableAttr, EruptionStyleHpPowerAttr, EscalatingReusePowerAttr, ExtendArenaTagAttr, ExtendTerrainDurationAttr, ExtendWeatherDurationAttr, FailIfHasTransferableItemsAttr, FailUnlessFirstTurnOnlyAttr, FailUnlessHasSubstituteAttr, FailUnlessNightBiomeAttr, FailUnlessTotalStagesGte3Attr, FaintedAllyCountHealAttr, FaintedAllyCountPowerAttr, FinalHitAddBattlerTagAttr, FinalHitCritAttr, FinalHitFlinchAttr, FinalHitGatedAlwaysHitAttr, FinalHitStatChangeAttr, FinalHitStatusEffectAttr, FinalHitTrapAttr, FixedChanceSelfConfuseAttr, FlinchOrParalysisAttr, FlinchOrParalysisPerHitAttr, FoeDisableMoveAttr, FoeEvaDropCountPowerAttr, FoeLowHpPowerAttr, ForceSuperEffectiveAttr, ForesightAttr, FreeSubstituteAttr, GatedAbilityCopyAttr, GatedAddArenaTagAttr, GatedAddArenaTrapTagAttr, GatedAddBattlerTagAttr, GatedAllFaintCountdownAttr, GatedAlwaysHitAttr, GatedChangeTypeAttr, GatedClearHazardsAttr, GatedClearPositiveStatsAttr, GatedConditionalPriorityAttr, GatedConsecutiveUsePowerAttr, GatedConsumeUserBerryAttr, GatedCritOnlyAttr, GatedCureFoeStatusAttr, GatedCurseAttr, GatedDelayedAttackAttr, GatedDestinyBondAttr, GatedFutureSightOnHitAttr, GatedDisableMoveAttr, GatedEndureAttr, GatedFaintCountdownAttr, GatedFinalHitAddBattlerTagAttr, GatedFlatPowerBonusAttr, GatedForceSwitchOutAttr, GatedHealStatusEffectAttr, GatedFinalHitHitHealAttr, GatedHitHealAttr, GatedHpSplitAttr, GatedMatchFoeHpToUserAttr, GatedIgnoreAccuracyAttr, GatedIgnoreDefensesAndResistancesAttr, GatedIgnoreOpponentStatChangesAttr, GatedIncrementMovePriorityAttr, GatedInvertPositiveStatsAttr, GatedInvertStatsAttr, GatedMatchHpAttr, GatedMovePowerMultiplierAttr, GatedMultiHitAttr, GatedNeutralDamageAgainstFlyingTypeMultiplierAttr, GatedOverrideBasePowerAttr, GatedProtectAttr, GatedRecoilNegateAttr, GatedRemoveHeldItemAttr, GatedRemoveHeldItemChanceAttr, GatedResetStatsAttr, GatedSubstituteAttr, GatedSuperEffectiveVsTypesAttr, GatedSuppressAbilitiesAttr, GatedTargetStatusCureAttr, GenerateRandomBerriesAttr, GrantPendingMovePowerBonusAttr, GravityAccuracyAttr, HealBlockAttr, HealIfNotHitThisTurnAttr, HealOnAbilityDoubleHitAttr, HealOnKoAttr, HealPerGhostMovePartyAttr, HighestBoostTypeAttr, HighestBoostedStatAtkAttr, HighestPositiveStagePowerAttr, HighestStageVariableDamageAttr, HighestStatChangeAttr, HpLostPercentPowerAttr, HpScaledPowerAttr, IgnoreAllDefensesResistAbilitiesAttr, IgnoreDefensiveStagesAttr, IgnoreImmunitiesAttr, IgnoreSpDefAttr, IgnoreTypeResistancesAttr, IncomingAllyHealOnEntryAttr, IncomingAllyStatBoostAttr, IncomingAllyStatusCureOnEntryAttr, IncomingStatBoostTagAttr, IncomingStatChangeAttr, InvertResistToWeakAttr, ItemBlockAttr, KnowledgeDrainStatStealAttr, LastRespectsAttr, LivingAmmunitionAttr, LowerDefSpDefBoostAttr, LowerHighestStatAttr, MatchFoeHpToUserAttr, MirrorStatStagesAttr, MutualTrapAttr, NegativeStatStagePowerAttr, NoWakeOnHitAttr, PartyDarkMagicCountBpAttr, PartyDarkMagicPercentPowerAttr, PartyTagCountPowerAttr, PartyTypeCountPowerAttr, PerHitStatChangeAttr, PermafrostBonusDamageAttr, PhoenixBarkAttr, PositiveStageCountPowerAttr, PostHitRandomStatUpDownAttr, PostKoHealAttr, PostVictoryHealAttr, PostVictoryRandomStatBoostAttr, PostVictoryStatBoostAttr, PreApplyStatSwapAttr, PreserveConsecutiveChainAttr, PursuitSwitchMultiplierAttr, RandomAbilityReplaceAttr, RandomCategoryHigherOffenseAttr, RandomPreyTypeAttr, RandomSelfFoeStatusAttr, RandomStatBoostAllAttr, RandomStatBoostAttr, RandomStatChangeAttr, RandomStatDropAttr, RandomStatDropBothSidesAttr, RandomStatUpDownAttr, RandomStatusReplaceAttr, RandomTerrainAttr, RandomTypeResistanceAttr, RedirectAbilityRecoilAttr, ReduceLastMovePpAttr, RemoveArenaTagAttr, RemoveArenaTagChanceAttr, RemoveFlyingTypeAttr, RemoveNegativeStatAttr, RemoveOrStealHeldItemAttr, ResetArenaTagAttr, ResetGravityFromStartAttr, ResetTailwindFromStartAttr, ResetTerrainFromStartAttr, ResetWeatherFromStartAttr, ResistPunishPowerAttr, RetainSubstituteForAllyAttr, RetriggerEntryAbilityAttr, ScreenBreakAttr, SecondHitCritIfFirstCritAttr, SelfHpCostAttr, SelfStatusAfterKoAttr, SetBiomeNightAttr, ShedTailSubstituteAttr, SpAtkStageCountPowerAttr, StageScaledPowerAttr, StatChangeBothSideAttr, StatCompareTypeAttr, StatusByMoveTypeAttr, StatusShedTransferAttr, StatusTransferToFoeAttr, StealHeldItemAttr, StealHeldItemOnSwitchAttr, StealHighestOffenseStageAttr, StealHighestStatStageAttr, StealRandomPositiveStatAttr, SuperEffectiveTypeMorphAttr, SuperEffectiveTypeOverrideAttr, SuperEffectiveVsGrassAttr, SuperEffectiveVsGroundAttr, SuperEffectiveVsTypesAttr, SwitchHealBlockAttr, TerrainMatchTypeAttr, ThawAndDoubleFrozenAttr, ToonImmunityAttr, TransferNegativeStagesAttr, TransferStatusToFoeAttr, TriTypeFieldResetAttr, TriTypeSimultaneousStrikeAttr, TriggerAbilityImmediatelyAttr, TriggerDualCoreBootAttr, TriggerIngrainAttr, TriggerPartnerAbilityFlipAttr, TriggerReviveAttr, TriggerWishAttr, TripleAccelHitHealAttr, TripleAccelMultiHitAttr, TripleAccelPerHitPowerAttr, TrophyBladePermanentBpAttr, TurnsOnFieldPowerAttr, TwoTurnMoveAttr, TypeBoostVsDarkPsychicAttr, TypeMorphAttr, TypeOverrideAttr, UseDefenseStatAsAttackAttr, UseFoeAttackStatAttr, UseFoeHighestStatOffenseAttr, UseHigherOffenseStatAttr, UseHighestStatOffenseAttr, UseLowerDefenseStatAttr, UserFaintCurseAttr, UserHpCostAttr, UserStatusTypeOverrideAttr, VariableHighestBoostTypeAttr, WakeAndStatDropAttr, WeakToFoePrimaryTypeAttr, WeaknessTypeOverrideAttr,
} from "./yu-move-attrs";
import { DefGeAtkGate, DefGeAtkIncomingGate, YuGateFunc, abilityContactProcGate, abilityDoubleHitGate, abilityProcGate, abilityRecoilGate, above75HpGate, allHitsLandGate, allStatsGte1Gate, alwaysTrueGate, allyFaintedGate, allyFaintedLastTurnGate, allyFaintedThisBattleGate, alreadyTrappedGate, andGate, anyFoeBurnedGate, anyFoeBurnedOrCursedGate, anyFoeSeededGate, anyNegativeStageGate, aquaRingActiveGate, aquaRingGate, at1HpGate, atkGtDefPlusSpeGate, atkStageGte2Gate, atkStageGte3Gate, atkStagesGtSpAtkGate, atkStagesGte2Gate, auroraVeilActiveGate, barrageHit1Gate, barrageHit2Gate, barrageHit3Gate, below25HpGate, below30HpGate, below30HpWithSubGate, below33HpGate, below50HpAndStagesGte2Gate, below50HpGate, below70HpGate, below75HpGate, belowHalfHpFoeGate, berryConsumedThisTurnGate, boostsGte3Gate, boostsIn3DifferentStatsGate, boundGate, burnedAndCursedGate, burnedAndTrappedGate, burnedGate, burnedNotCursedGate, chargeReleaseTurnGate, chargeReleasedLastTurnGate, chargedGate, chargingGate, confusedGate, consecutiveUseGate, copiedAbilityGate, critFinalHitGate, critThisMoveGate, cursedGate, foeCursedGate, cursedNotBurnedGate, defSpDefTotalGte3Gate, defSpDefTotalGte6Gate, defStagesGte2Gate, desertSandTombGate, doubleSeGate, dragonKoGate, dragonSwitchInGate, dragonTypeGate, dualExtremeStatsGate, electricTerrainGate, entryAfterFaintGate, evasionGte1Gate, evasionGte2Gate, evasionGte3Gate, evasionStageGte2Gate, faintedAlliesGte3Gate, firstTurnAndSameStatBoostGate, firstTurnOnlyGate, foeAbove50HpGate, foeAbove60HpGate, foeAccNegativeGate, foeAirborneGate, foeAsleepGate, foeAsleepOrConfusedGate, foeAtkLtSpAtkGate, foeAtkNegativeGate, foeAtkSpAtkMinus2Gate, foeAtkSwappedGate, foeBelow30HpGate, foeBelow33HpGate, foeBelow40HpGate, foeBelow50HpGate, foeBstHigherGate, foeConfusedOrParalyzedGate, foeDarkTypeGate, foeDefBelowAtkGate, foeDefGtAtkGate, foeDefLtAtkGate, foeDefNegativeGate, foeDragonBurnedGate, foeDragonTypeGate, foeEvaLteMinus2Gate, foeEvaNegativeGate, foeFlyingTypeGate, foeGhostTypeGate, foeGroundRockTypeGate, foeHasItemGate, foeHitUserSeThisTurnGate, foeIsSteelGate, foeMoveDisabledGate, foeMovedFirstGate, foeNegativeAtkGate, foeNegativeDefGate, foeNegativeSpeGate, foeNegativeStagesGate, foeNotAbove60HpGate, foeNotDarkTypeGate, foeNotRockTypeGate, foeNotSwappedGate, foePoisonedGate, foePoisonedLastHitGate, foePositiveStagesGate, foePrevMoveMissedGate, foeRockTypeGate, foeSpAtkGtSpDefGate, foeSpAtkNegativeGate, foeSpDefLtSpAtkGate, foeSpDefNegativeGate, foeSpdLoweredGate, foeSpdNegativeGate, foeSpdStageLteMinus2Gate, foeSpdStageLteMinus3Gate, foeSpeLoweredGate, foeSpeNegativeGate, foeSpikesGate, foeStatLteMinus2Gate, foeStealthRockGate, foeSwitchingGate, foeTeamHasDragonGate, foeTeamHasGroundRockGate, foeTormentGate, foeTotalStagesLteMinus3Gate, foeTotalStagesLteMinus4Gate, foeUnderEncoreOrDisableGate, foeUsedContactLastTurnGate, foeUsedNonSeThisTurnGate, foeUsedSpecialLastTurnGate, foeUsedSpecialThisTurnGate, foeUsedStatusLastTurnGate, foeUsedStatusRecentGate, foeUsedStatusThisTurnGate, foeVolatileStateGate, foeWeakToMoveGate, foeWhirlpoolGate, foeWouldResistGate, foeWrappedAnyGate, frozenGate, fullHpGate, fullParaLastTurnGate, gateTriadActiveGate, grassAllyFaintedGate, grassyTerrainGate, gravityActiveGate, gravityInactiveGate, hailGate, hasSubstituteGate, highestBoostGte3Gate, holdsBerryGate, infatuatedGate, foeInfatuatedGate, ingrainGate, itemlessAndDisabledGate, itemlessAndSuppressedGate, itemlessGate, lastHitOnlyGate, lastMoveBitingGate, lastMoveDarkGate, lastMoveFireGate, lastMoveSlicingGate, lastPartyMonGate, lightScreenActiveGate, magnetAndSpAtkGte3Gate, mistyTerrainGate, moveIsSeGate, moveIsSeNotDoubleGate, movedLastGate, multiHitLastTurnGate, netStatTotalGte3Gate, netStatTotalLteMinus2Gate, nightBiomeGate, noAtkBoostsGate, noAuroraVeilGate, noRainGate, noSubstituteGate, notMovedThisTurnGate, ojamaLastHitGate, onCritGate, onKoGate, paralyzedGate, partyFainted2Gate, partyFainted3Gate, partyFaintedGate, phase2AndAtkBoostGate, prevMoveMissedGate, preyKoFireGate, preyKoGroundGate, preyKoWaterGate, preyTypeGate, psychicTerrainGate, rainGate, reflectActiveGate, retaliateGate, revivalSustainTier2Gate, revivalSustainTriadGate, saltCureGate, sameAbilityAsFoeGate, sameTypeGate, seededAndAsleepGate, seededGate, snowGate, soleSurvivorGate, spAtkBoostedGate, spAtkGtSpDefGate, spAtkStagesGte3Gate, spDefGtSpAtkGate, speBoostsGte2Gate, speedBoostedGate, speedStageGte2Gate, speedStageGte3Gate, statAtMinus2Gate, statusedAndSuppressedGate, statusedAndThreeNegativesGate, statusedAndTwoNegativesGate, statusedGate, subAndRingGate, subBrokenThisTurnGate, sunChargeReleaseGate, sunGate, superEffectiveGate, suppressedGate, switchedInThisTurnGate, tailwindActiveGate, tailwindActiveUserGate, terrainActiveGate, totalStagesGte3Gate, totalStagesGte4Gate, trappedAndSeededGate, trappedGate, trappedOrDrowsyGate, turn1OutAndParaGate, turnsOnFieldGte3Gate, typeDiffFromLastAttackGate, usedLastTurnGate, usedSameMoveLastTurnGate, usedStatusLastTurnGate, usedSteelLastTurnGate, userAnyStatGte2Gate, userAtkPositiveGate, userAtkStageGte2Gate, userAtkStageGte3Gate, userCausedFlinchLastTurnGate, userConfusedGate, userCursedGate, userDamagedThisTurnGate, userDefBoostGate, userDefPositiveGate, userDefStageGte2Gate, userEvaPositiveGate, userExactlyOneBerryGate, userHpLtFoeGate, userItemlessGate, userMovedFirstGate, userNegativeStageGate, userNotStatusedGate, userPositiveStageGate, userRevivedGate, userSpAtkPositiveGate, userSpdPositiveGate, userStagesGte2Gate, userStagesGte3Gate, userStatGte2Gate, userStatusedGate, userSwitchedInThisTurnGate, userUndamagedThisTurnGate, weatherActiveGate, windChargeGate, wishActiveGate, wishPendingGate, magnetGate2, ghostMoveGate3, timeMoveGate2, unionGate2, unionGate3, darkMagicMoveGate2, fairyFaintedGate1, fairyFaintedGate2, gadgetMoveGate2, flyingAllyGate3, ojamaMoveGate3 } from "./yu-gates";
import i18next from "i18next";
import { Abilities } from "#enums/abilities";
import { BattleStat } from "./battle-stat";
import { StatusEffect } from "./status-effect";
import { Type } from "./type";

const yuMove = (move: Move, anim: Moves): Move => {
  move.animationProxy = anim;
  return move;
};

const yuGadgetMove = (move: Move, anim: Moves): Move => {
  move.animationProxy = anim;
  move.gadgetMove();
  return move;
};

const yuMaskMove = (move: Move, anim: Moves): Move => {
  move.animationProxy = anim;
  move.maskMove();
  return move;
};

const yuTimeMove = (move: Move, anim: Moves): Move => {
  move.animationProxy = anim;
  move.timeMove();
  return move;
};

const yuToonMove = (move: Move, anim: Moves): Move => {
  move.animationProxy = anim;
  move.toonMove();
  return move;
};

const FOE_MAIN_STATS = [
  BattleStat.ATK,
  BattleStat.DEF,
  BattleStat.SPATK,
  BattleStat.SPDEF,
  BattleStat.SPD,
] as const;
export function registerYuDuelmonEntry1(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SPORE_BURST, Type.BUG, MoveCategory.PHYSICAL, 40, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.ATTACK_ORDER),
    yuMove(new AttackMove(Moves.YU_PARASITIC_LUNGE, Type.BUG, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(StealRandomPositiveStatAttr), Moves.LEECH_LIFE),
    yuMove(new AttackMove(Moves.YU_SWARM_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalBonusHealIfTargetHasTagAttr, BattlerTagType.SEEDED, 0.125, seededGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_INFECTION_PULSE, Type.POISON, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, statusedGate, 100), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_SPAWN_WAVE, Type.BUG, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, statusedGate, 100), Moves.PIN_MISSILE),
    yuMove(new AttackMove(Moves.YU_TOXIC_GRASP, Type.POISON, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, confusedGate, 1.4), Moves.POISON_JAB),
    yuMove(new SelfStatusMove(Moves.YU_MOLT_SHIELD, Type.BUG, -1, 10, -1, 0, 9)
      .attr(StatusShedTransferAttr), Moves.AROMATHERAPY),
    yuMove(new AttackMove(Moves.YU_EMERGENCY_SPAWN, Type.BUG, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.FIRST_IMPRESSION),
  );
}
export function registerYuDuelmonEntry2(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PREDATORS_LOCK, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.BIND, 50, preyTypeGate), Moves.PURSUIT),
    yuMove(new AttackMove(Moves.YU_ELEMENTAL_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(WeaknessTypeOverrideAttr, preyTypeGate, [Type.WATER, Type.GROUND, Type.FIRE]), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_BYPASS_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 70, 100, 10, -1, 1, 9)
      .attr(GatedForceSwitchOutAttr, false, true, preyTypeGate), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_TORRENT_FANG, Type.WATER, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, preyTypeGate), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_TECTONIC_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(IgnoreOpponentStatChangesAttr), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_SURGE_CUTTER, Type.ELECTRIC, MoveCategory.SPECIAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2), Moves.DISCHARGE),
    yuMove(new StatusMove(Moves.YU_PREDATORS_ROAR, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true, null, true, false, MoveEffectTrigger.POST_APPLY)
      .attr(GatedForceSwitchOutAttr, false, true, preyTypeGate), Moves.SCREECH),
    yuMove(new AttackMove(Moves.YU_PREY_CONVERSION, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(RandomPreyTypeAttr), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_AMBUSH_INSTINCT, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, switchedInThisTurnGate, 1.44), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_EVOLUTIONARY_FEED, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.SPDEF, 1, true, preyKoWaterGate))
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.DEF, 1, true, preyKoGroundGate))
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.SPD, 1, true, preyKoFireGate)), Moves.LEECH_LIFE),
    yuMove(new AttackMove(Moves.YU_PREDATORS_CONVERGENCE, Type.DRAGON, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(AnyTypeMultiplierAttr, Type.WATER)
      .attr(AnyTypeMultiplierAttr, Type.GROUND)
      .attr(AnyTypeMultiplierAttr, Type.FIRE), Moves.DRAGON_CLAW),
  );
}
export function registerYuDuelmonEntry3(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GEAR_PIVOT, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.ANCHOR_SHOT),
    yuMove(new AttackMove(Moves.YU_SALVAGE_SLAM, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userSwitchedInThisTurnGate, 1.75), Moves.METAL_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_EMERGENCY_RETROFIT, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatusCureOnEntryAttr), Moves.REFRESH),
    yuMove(new AttackMove(Moves.YU_QUICK_PIVOT, Type.STEEL, MoveCategory.PHYSICAL, 50, 100, 10, -1, 1, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_OVERCLOCKED_PIVOT, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyHealOnEntryAttr, 0.25, below25HpGate)
      .attr(IncomingAllyStatBoostAttr, "DEF", 1, below25HpGate), Moves.SMART_STRIKE),
    yuMove(new SelfStatusMove(Moves.YU_HAZARD_DEPLOY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ForceSwitchOutAttr, true, false), Moves.STEALTH_ROCK),
  );
}
export function registerYuDuelmonEntry4(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PHASE_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(DualModePulseAttr, 0, 0.25)
      .attr(GatedMovePowerMultiplierAttr, spAtkGtSpDefGate, 1.5), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_TIDAL_SHIFT, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(PreApplyStatSwapAttr, BattleStat.SPATK, BattleStat.SPDEF), Moves.WATER_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_BARK_ARMOR, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, spDefGtSpAtkGate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_SAP_CANNON, Type.GRASS, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.5)
      .attr(IncrementMovePriorityAttr, () => true, -1), Moves.MATCHA_GOTCHA),
    yuMove(new AttackMove(Moves.YU_DOUBLE_EXHALE, Type.GRASS, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(PreApplyStatSwapAttr, BattleStat.SPATK, BattleStat.SPDEF), Moves.LEAF_STORM),
    yuMove(new AttackMove(Moves.YU_ROOT_SURGE, Type.GRASS, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, spAtkGtSpDefGate, 1.22)
      .attr(GatedHitHealAttr, 0.25, spDefGtSpAtkGate), Moves.ENERGY_BALL),
    yuMove(new AttackMove(Moves.YU_SEASONAL_ROTATION, Type.GRASS, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(StatCompareTypeAttr, Type.FIRE, Type.ICE), Moves.LEAF_TORNADO),
    yuMove(new AttackMove(Moves.YU_DEEP_GROUNDWATER, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, turnsOnFieldGte3Gate, 1.38)
      .attr(ConditionalHealAttr, 0.25, turnsOnFieldGte3Gate), Moves.SCALD),
  );
}
export function registerYuDuelmonEntry5(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FLIP_HEX, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(CoinFlipDamageOrHealAttr, 1.5, 0.25), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_ASTRAL_INVESTMENT, Type.PSYCHIC, MoveCategory.SPECIAL, 50, 100, 10, -1, 0, 9)
      .attr(SpAtkStageCountPowerAttr, 10), Moves.FUTURE_SIGHT),
    yuMove(new AttackMove(Moves.YU_QUICK_STAR, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.DAZZLING_GLEAM),
    yuMove(new AttackMove(Moves.YU_FATES_ACCUMULATION, Type.PSYCHIC, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(AbilityTriggerCountPowerAttr, 5), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_ARCANA_CASCADE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(TriggerPartnerAbilityFlipAttr), Moves.PSYCHIC),
  );
}
export function registerYuDuelmonEntry6(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MAGNETIC_BARRAGE, Type.ELECTRIC, MoveCategory.PHYSICAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_3)
      .attr(ConditionalMultiHitAttr, MultiHitType._2_TO_3, MultiHitType._2_TO_4, magnetGate2)
      .magnetMove(), Moves.THUNDER_PUNCH),
    yuMove(new AttackMove(Moves.YU_MAGNETITE_CANNON, Type.ELECTRIC, MoveCategory.PHYSICAL, 105, 90, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .magnetMove(), Moves.THUNDER_FANG),
    yuMove(new AttackMove(Moves.YU_ATTRACT_POLARITY, Type.ELECTRIC, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true)
      .magnetMove(), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_PETRIFYING_BOLT, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.BIND)
      .attr(ConditionalTrapAttr, BattlerTagType.BIND, 50, magnetGate2)
      .magnetMove(), Moves.ICE_BEAM),
    yuMove(new AttackMove(Moves.YU_MAGNETIC_RESONANCE, Type.ELECTRIC, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(PartyTagCountPowerAttr, "MAGNET", 10)
      .magnetMove(), Moves.STONE_EDGE),
  );
}
export function registerYuDuelmonEntry7(allMoves: Move[]): void {
  allMoves.push(
    yuGadgetMove(new AttackMove(Moves.YU_GEAR_ROULETTE, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(HighestBoostedStatAtkAttr), Moves.GEAR_GRIND),
    yuGadgetMove(new AttackMove(Moves.YU_ASSEMBLY_STRIKE, Type.STEEL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(PartyTagCountPowerAttr, "GADGET", 10), Moves.SMART_STRIKE),
    yuGadgetMove(new AttackMove(Moves.YU_ANCIENT_GEAR, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.BULLET_PUNCH),
    yuGadgetMove(new SelfStatusMove(Moves.YU_REROLL_PROTOCOL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(RetriggerEntryAbilityAttr), Moves.METAL_SOUND),
    yuGadgetMove(new AttackMove(Moves.YU_GADGET_SYNERGY, Type.STEEL, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedFlatPowerBonusAttr, 30, boostsIn3DifferentStatsGate), Moves.FLASH_CANNON),
    yuGadgetMove(new AttackMove(Moves.YU_OVERCHARGE_BEAM, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 90, 10, -1, 0, 9)
      .attr(ConsumeBoostsForPowerAttr, 20), Moves.CHARGE_BEAM),
    yuGadgetMove(new AttackMove(Moves.YU_JACKPOT_PROTOCOL, Type.STEEL, MoveCategory.PHYSICAL, 120, 85, 10, -1, 0, 9)
      .attr(FailUnlessFirstTurnOnlyAttr)
      .attr(GatedFlatPowerBonusAttr, 50, firstTurnAndSameStatBoostGate), Moves.METEOR_MASH),
  );
}
export function registerYuDuelmonEntry8(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SCAVENGE_SLAM, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, itemlessGate, 1.5), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_RUST_SHOT, Type.STEEL, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalPostAttackStatChangeAttr, BattleStat.DEF, -1, false, abilityProcGate, 100), Moves.MIRROR_SHOT),
    yuMove(new AttackMove(Moves.YU_STRIP_MINE, Type.GROUND, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalPostAttackStatChangeAttr, BattleStat.ATK, 1, true, abilityProcGate, 100), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_QUICK_DRILL, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_COMPONENT_THEFT, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(RandomStatBoostAttr, 1, 100, abilityProcGate, MoveEffectTrigger.POST_ATTACK), Moves.ANCHOR_SHOT),
    yuMove(new AttackMove(Moves.YU_EXPOSED_TARGET, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(IgnoreDefensiveStagesAttr, itemlessGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_GRINDING_ASSAULT, Type.STEEL, MoveCategory.PHYSICAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2), Moves.GEAR_GRIND),
    yuMove(new AttackMove(Moves.YU_EMERGENCY_SCRAP, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, itemlessGate, 1.43)
      .attr(ConditionalSelfHealAttr, 0, 0.125, itemlessGate), Moves.SMART_STRIKE),
    yuMove(new AttackMove(Moves.YU_TOTAL_DISASSEMBLY, Type.STEEL, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(GatedSuppressAbilitiesAttr, itemlessGate, 100, 3), Moves.GIGATON_HAMMER),
    yuMove(new AttackMove(Moves.YU_MOVE_LOCKDOWN, Type.STEEL, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(GatedDisableMoveAttr, itemlessAndSuppressedGate), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_SYSTEMATIC_SHUTDOWN, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, itemlessAndDisabledGate, 100), Moves.METAL_CLAW),
  );
}
export function registerYuDuelmonEntry9(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BEHEMOTH_RUSH, Type.STEEL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1), Moves.HEAVY_SLAM),
    yuMove(new AttackMove(Moves.YU_ARMOR_PIERCE, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(IgnoreOpponentStatChangesAttr), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_TREMOR_CLAW, Type.GROUND, MoveCategory.PHYSICAL, 75, 95, 10, 30, 0, 9)
      .attr(FlinchAttr), Moves.DRAGON_CLAW),
    yuMove(new AttackMove(Moves.YU_RELENTLESS_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 50, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3), Moves.FURY_ATTACK),
    yuMove(new AttackMove(Moves.YU_QUICK_IMPACT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_RESISTANCE_PUNISHER, Type.STEEL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ResistPunishPowerAttr, 1.2, foeWouldResistGate), Moves.ANCHOR_SHOT),
    yuMove(new AttackMove(Moves.YU_ARMOR_CRACKER, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.BRICK_BREAK),
    yuMove(new AttackMove(Moves.YU_SIEGE_RAM, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConsecutiveUseCapPowerAttr, 10, 3), Moves.METAL_CLAW),
    yuMove(new AttackMove(Moves.YU_CRUSHING_GRIP, Type.ROCK, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.SAND_TOMB), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_CONTACT_SURGE, Type.STEEL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2), Moves.GEAR_GRIND),
    yuMove(new AttackMove(Moves.YU_INVERTED_RESISTANCE, Type.STEEL, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(InvertResistToWeakAttr, foeWouldResistGate), Moves.BULLET_PUNCH),
  );
}
export function registerYuDuelmonEntry10(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_KNIGHTS_GAMBIT, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(FailUnlessFirstTurnOnlyAttr)
      .attr(GatedProtectAttr, firstTurnOnlyGate)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true), Moves.ENDURE),
    yuMove(new AttackMove(Moves.YU_PHASE2_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.FEINT),
    yuMove(new AttackMove(Moves.YU_POWER_DRIVE, Type.NORMAL, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, phase2AndAtkBoostGate, 100), Moves.SECRET_POWER),
    yuMove(new AttackMove(Moves.YU_ZERO_TURN_BOOT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(TriggerDualCoreBootAttr), Moves.RETURN),
  );
}
export function registerYuDuelmonEntry11(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_EMPEROR_DECREE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_ROYAL_FLUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(ConsumeBoostsBpAndHealAttr, 15, 0.03), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_EMPERORS_MANDATE, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedIgnoreOpponentStatChangesAttr, totalStagesGte3Gate), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_ACCUMULATED_MIGHT, Type.FIGHTING, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(DistinctBoostHistoryPowerAttr, 10, 50), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_ROYAL_TAXATION, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr, spAtkStagesGte3Gate), Moves.THIEF),
  );
}
export function registerYuDuelmonEntry12(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GRAVITY_WELL, Type.PSYCHIC, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ExtendArenaTagAttr, ArenaTagType.GRAVITY, 2), Moves.GRAVITY),
    yuMove(new AttackMove(Moves.YU_DREAMCATCHER, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepGate, 1.53), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_VOID_STEP, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 1, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.BIND, 30, gravityActiveGate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_GRAVITY_CRUSH, Type.DARK, MoveCategory.SPECIAL, 105, 75, 10, -1, 0, 9)
      .attr(GravityAccuracyAttr, gravityActiveGate), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_MOON_NIGHTMARE, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeAsleepGate, 100), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_WELL_STRIKE, Type.DARK, MoveCategory.SPECIAL, 95, 85, 10, -1, 0, 9)
      .attr(GatedNeutralDamageAgainstFlyingTypeMultiplierAttr, gravityActiveGate), Moves.HEX),
    yuMove(new AttackMove(Moves.YU_GRAVITATIONAL_COMPRESSION, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, gravityActiveGate, 100), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_LUNAR_FEEDING, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0, 0.5, foeAsleepGate), Moves.DREAM_EATER),
  );
}
export function registerYuDuelmonEntry13(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DEVOTION_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, infatuatedGate), Moves.PARABOLIC_CHARGE),
    yuMove(new SelfStatusMove(Moves.YU_LOVE_SHIELD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeInfatuatedGate, 100), Moves.CRAFTY_SHIELD),
    yuMove(new AttackMove(Moves.YU_QUICK_KISS, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.DRAINING_KISS),
    yuMove(new AttackMove(Moves.YU_OBSESSIVE_BARRAGE, Type.FAIRY, MoveCategory.SPECIAL, 40, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_PASSION_BURST, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, infatuatedGate, 1.5), Moves.DAZZLING_GLEAM),
    yuMove(new StatusMove(Moves.YU_LOVES_DEMAND, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalMultiStatusEffectAttr, [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON], foeInfatuatedGate, 100), Moves.CHARM),
    yuMove(new AttackMove(Moves.YU_BINDING_AFFECTION, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, infatuatedGate), Moves.ALLURING_VOICE),
  );
}
export function registerYuDuelmonEntry14(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RECKLESS_COMMAND, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, abilityRecoilGate, 100), Moves.ARM_THRUST),
    yuMove(new AttackMove(Moves.YU_SACRIFICIAL_STRIKE, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RedirectAbilityRecoilAttr, abilityRecoilGate), Moves.ASTONISH),
    yuMove(new AttackMove(Moves.YU_TYRANT_DECREE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_PAIN_DECREE, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .addAttr(new HighestStatChangeAttr(-1, 30)), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_BLOOD_TOLL, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(AbilityRecoilToHealAttr, 0.1, abilityRecoilGate), Moves.TAKE_DOWN),
    yuMove(new AttackMove(Moves.YU_RUTHLESS_DECREE, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(HealOnAbilityDoubleHitAttr, 0.25, abilityDoubleHitGate), Moves.BEAT_UP),
  );
}
export function registerYuDuelmonEntry15(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FOOLS_ERRAND, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(TypelessAttr), Moves.HIDDEN_POWER),
    yuMove(new StatusMove(Moves.YU_TOXIC_STUMBLE, Type.POISON, -1, 10, 100, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.TOXIC),
    yuMove(new AttackMove(Moves.YU_QUICK_LUCK, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.DISARMING_VOICE),
    yuMove(new AttackMove(Moves.YU_LUCKY_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, abilityProcGate), Moves.PARABOLIC_CHARGE),
    yuMove(new AttackMove(Moves.YU_PROBABILITY_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr, abilityProcGate)
      .attr(ConditionalHealAttr, 0.125, abilityProcGate), Moves.FOUL_PLAY),
  );
}
export function registerYuDuelmonEntry16(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PHANTOM_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_SOUL_REAVE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.4), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_LICH_CLAW, Type.NORMAL, MoveCategory.PHYSICAL, 40, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.DRAGON_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_UNDYING_FORTIFY, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(HealAttr, 0.25), Moves.CURSE),
    yuMove(new AttackMove(Moves.YU_HOLLOW_SCREAM, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, 100, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_GRAVE_ABSORPTION, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(HealOnKoAttr, 0.33, onKoGate), Moves.BIDE),
    yuMove(new AttackMove(Moves.YU_DECAY_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 85, 90, 10, 50, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_FLESH_HARVEST, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, belowHalfHpFoeGate), Moves.LEECH_LIFE),
  );
}
export function registerYuDuelmonEntry17(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SCALED_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9)
      .attr(GatedIncrementMovePriorityAttr, speBoostsGte2Gate, 3), Moves.EXTREME_SPEED),
    yuMove(new SelfStatusMove(Moves.YU_IRON_PLATING, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(DefStagesScaledStatChangeAttr, BattleStat.SPDEF, BattleStat.DEF, 2, 0), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_RELENTLESS_PRESSURE, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(ConditionalFlinchAttr, 35, atkGtDefPlusSpeGate), Moves.CLOSE_COMBAT),
    yuMove(new AttackMove(Moves.YU_VETERANS_BITE, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, boostsGte3Gate, 1)
      .attr(GatedMovePowerMultiplierAttr, boostsGte3Gate, 1.27), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_EXPERIENCE_OVERFLOW, Type.NORMAL, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(ConsumeBoostsForPowerAttr, 15, 90), Moves.BODY_PRESS),
    yuMove(new AttackMove(Moves.YU_MOMENTUM_CRASH, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, speedBoostedGate, 1)
      .attr(GatedMovePowerMultiplierAttr, speedBoostedGate, 1.22), Moves.MAGICAL_TORQUE),
    yuMove(new AttackMove(Moves.YU_ADAPTIVE_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(HighestBoostTypeAttr), Moves.MULTI_ATTACK),
  );
}
export function registerYuDuelmonEntry18(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DISCARD_OVERLOAD, Type.DRAGON, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(BerryConsumeCountPowerAttr, 10, 80), Moves.OUTRAGE),
    yuMove(new AttackMove(Moves.YU_WINDBOLT_SNIPE, Type.ELECTRIC, MoveCategory.PHYSICAL, 105, 85, 10, -1, 0, 9)
      .attr(GatedIgnoreAccuracyAttr, belowHalfHpFoeGate), Moves.THUNDER_FANG),
    yuMove(new AttackMove(Moves.YU_BERRY_STAND, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedFlatPowerBonusAttr, 60, userExactlyOneBerryGate)
      .attr(GatedConsumeUserBerryAttr, userExactlyOneBerryGate)
      .attr(ChipDamageAttr, 0.2, userExactlyOneBerryGate), Moves.LAST_RESORT),
  );
}
export function registerYuDuelmonEntry19(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WINDSTORM_LARIAT, Type.FLYING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_SCALDING_WIND, Type.FLYING, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, abilityProcGate, 100), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_LIVING_AMMUNITION, Type.DRAGON, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(LivingAmmunitionAttr, 0.2, 2.5, userItemlessGate), Moves.SCALE_SHOT),
  );
}
export function registerYuDuelmonEntry20(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CHAOS_DRAW, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, -1, 0, 9)
      .attr(PositiveStageCountPowerAttr, 10, 60), Moves.TRUMP_CARD),
    yuMove(new AttackMove(Moves.YU_CHAOTIC_BEAM, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(VariableHighestBoostTypeAttr), Moves.TWIN_BEAM),
    yuMove(new AttackMove(Moves.YU_ENTROPY_BLAST, Type.GHOST, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(NegativeStatStagePowerAttr, 12, undefined, 84, false), Moves.ICE_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_AVARICE_POT, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetStatsAttr, true)
      .attr(RandomStatBoostAttr, 3, 1, 100), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_ADAPTIVE_RUSH, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, atkStagesGtSpAtkGate, 1), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_SURGE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedFlatPowerBonusAttr, 20, spAtkBoostedGate), Moves.STORED_POWER),
    yuMove(new AttackMove(Moves.YU_WILD_CARD, Type.NORMAL, MoveCategory.SPECIAL, 80, 90, 10, -1, 0, 9)
      .attr(CoinFlipPowerAttr), Moves.ROUND),
    yuMove(new AttackMove(Moves.YU_VARIANCE_CANNON, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(HighestStageVariableDamageAttr), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_REALITY_FRACTURE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedIgnoreDefensesAndResistancesAttr, dualExtremeStatsGate), Moves.EERIE_SPELL),
  );
}
export function registerYuDuelmonEntry21(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RAGE_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .slicingMove()
      .attr(IgnoreOpponentStatChangesAttr)
      .attr(FlinchAttr), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_QUICK_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .slicingMove(), Moves.SLASH),
    yuMove(new SelfStatusMove(Moves.YU_ADRENALINE_SURGE, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.HOWL),
    yuMove(new AttackMove(Moves.YU_DISARMING_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(RemoveHeldItemAttr, false), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_BERSERKER_CHAIN, Type.NORMAL, MoveCategory.PHYSICAL, 65, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(ConditionalMultiHitAttr, MultiHitType._2, MultiHitType._2, userCausedFlinchLastTurnGate), Moves.DOUBLE_HIT),
    yuMove(new AttackMove(Moves.YU_ARMOR_SHATTER, Type.NORMAL, MoveCategory.PHYSICAL, 80, 90, 10, 50, 0, 9)
      .slicingMove()
      .attr(StatChangeAttr, BattleStat.DEF, -2, false), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_UNSTOPPABLE_SWING, Type.NORMAL, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .slicingMove()
      .attr(IgnoreOpponentStatChangesAttr)
      .attr(SuppressAbilitiesAttr)
      .attr(IgnoreTypeResistancesAttr), Moves.GIGA_IMPACT),
    yuMove(new AttackMove(Moves.YU_PP_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(ReducePpMoveAttr, 2), Moves.CUT),
    yuMove(new AttackMove(Moves.YU_SUSTAINED_CARNAGE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .slicingMove()
      .attr(HealAttr, 0.2), Moves.POPULATION_BOMB),
  );
}
export function registerYuDuelmonEntry22(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TEMPORAL_CHARGE, Type.DRAGON, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(ConsecutiveUseCapPowerAttr, 15, 5)
      .timeMove(), Moves.DRAGON_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_CHRONO_SHIELD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, timeMoveGate2, 100)
      .timeMove(), Moves.COSMIC_POWER),
    yuMove(new AttackMove(Moves.YU_BLESSING_BEAM, Type.FAIRY, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.125)
      .timeMove(), Moves.DAZZLING_GLEAM),
    yuMove(new AttackMove(Moves.YU_ANCIENT_ROAR, Type.DRAGON, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, totalStagesGte3Gate, 1)
      .timeMove(), Moves.FIRST_IMPRESSION),
    yuMove(new AttackMove(Moves.YU_WIZARD_SIP, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, timeMoveGate2)
      .timeMove(), Moves.CLANGING_SCALES),
    yuMove(new AttackMove(Moves.YU_ADOLESCENT_WRATH, Type.DRAGON, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, totalStagesGte4Gate, 1.22)
      .attr(ConditionalFlinchAttr, 35, totalStagesGte4Gate)
      .timeMove(), Moves.OUTRAGE),
    yuMove(new AttackMove(Moves.YU_FUTURE_ECHO, Type.DRAGON, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(DelayedRepeatAttackAttr, 2)
      .timeMove(), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_CHRONO_HARVEST, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, timeMoveGate2)
      .attr(TriggerAbilityImmediatelyAttr, timeMoveGate2)
      .timeMove(), Moves.SYNCHRONOISE),
  );
}
export function registerYuDuelmonEntry23(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BERRY_BOMB, Type.GRASS, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(ConsumeUserBerryAttr), Moves.SEED_BOMB),
    yuMove(new AttackMove(Moves.YU_FERMENTED_SHOT, Type.POISON, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, berryConsumedThisTurnGate, 100), Moves.GUNK_SHOT),
    yuMove(new AttackMove(Moves.YU_ROOT_STRIKE, Type.GRASS, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, holdsBerryGate), Moves.HORN_LEECH),
    yuMove(new AttackMove(Moves.YU_COMPOST_CANNON, Type.GRASS, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(BerryConsumeCountPowerAttr, 10, 50, true), Moves.WOOD_HAMMER),
    yuMove(new AttackMove(Moves.YU_SEASONAL_BURST, Type.GRASS, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(BerryHeldTypeOverrideAttr), Moves.LEAF_BLADE),
  );
}
export function registerYuDuelmonEntry24(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TIDAL_PIVOT, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.FLIP_TURN),
    yuMove(new SelfStatusMove(Moves.YU_DAM_REINFORCEMENT, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, hasSubstituteGate, 100), Moves.AQUA_RING),
    yuMove(new AttackMove(Moves.YU_FLOOD_RELEASE, Type.WATER, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, subBrokenThisTurnGate, 1.75), Moves.CRABHAMMER),
    yuMove(new AttackMove(Moves.YU_TORRENT_CRASH, Type.WATER, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, aquaRingActiveGate, 100), Moves.AQUA_CUTTER),
    yuMove(new StatusMove(Moves.YU_WATERLOG, Type.WATER, -1, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true), Moves.LIFE_DEW),
    yuMove(new SelfStatusMove(Moves.YU_LODGE_CONSTRUCTION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, hasSubstituteGate, 100), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_GNAW, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, hasSubstituteGate, 1.53), Moves.SUPER_FANG),
    yuMove(new AttackMove(Moves.YU_CASCADE_ARCHITECTURE, Type.WATER, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, subAndRingGate, 1.5)
      .attr(ConditionalHitHealAttr, 0, 0.5, subAndRingGate), Moves.AQUA_TAIL),
  );
}
export function registerYuDuelmonEntry25(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DOMINION_ROAR, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, 50, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_STAMPEDE, Type.GROUND, MoveCategory.PHYSICAL, 85, 85, 10, -1, 1, 9), Moves.BULLDOZE),
    yuMove(new AttackMove(Moves.YU_CROWN_SLAM, Type.STEEL, MoveCategory.PHYSICAL, 95, 85, 10, 30, 0, 9)
      .attr(FlinchAttr), Moves.HEAVY_SLAM),
    yuMove(new AttackMove(Moves.YU_CRUSHING_AUTHORITY, Type.GROUND, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(NegativeStatStagePowerAttr, 10, undefined, 60), Moves.BONEMERANG),
    yuMove(new AttackMove(Moves.YU_LIONS_PURSUIT, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(PursuitSwitchMultiplierAttr, 2), Moves.PURSUIT),
    yuMove(new AttackMove(Moves.YU_AVENGERS_WRATH, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(FaintedAllyCountPowerAttr, 15, 60), Moves.CLOSE_COMBAT),
    yuMove(new AttackMove(Moves.YU_REGAL_ROAR, Type.NORMAL, MoveCategory.PHYSICAL, 85, 90, 10, 50, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_EXTINCTION_ROAR, Type.NORMAL, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(IgnoreAllDefensesResistAbilitiesAttr, foeTotalStagesLteMinus4Gate), Moves.GIGA_IMPACT),
    yuMove(new AttackMove(Moves.YU_INESCAPABLE_VERDICT, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(GatedIgnoreAccuracyAttr, foeNegativeStagesGate)
      .attr(BypassProtectAttr, foeNegativeStagesGate)
      .attr(ConditionalTrapAttr, BattlerTagType.BIND, 30, foeNegativeStagesGate), Moves.SUBMISSION),
    yuMove(new AttackMove(Moves.YU_CASCADING_SUBJUGATION, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeTotalStagesLteMinus3Gate, 1.47), Moves.KNOCK_OFF),
  );
}
export function registerYuDuelmonEntry26(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VANGUARD_CHARGE, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(StatChangeBothSideAttr, "DEF", -1), Moves.PURSUIT),
    yuMove(new AttackMove(Moves.YU_SHATTERED_PRIDE, Type.DARK, MoveCategory.PHYSICAL, 105, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, true)
      .attr(StatChangeAttr, BattleStat.DEF, -1, true), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_SACRIFICE_PULSE, Type.GHOST, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(StatChangeBothSideAttr, "SPDEF", -1)
      .attr(HitHealAttr, 0.25), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_RECKLESS_ASSAULT, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, true), Moves.METEOR_ASSAULT),
    yuMove(new AttackMove(Moves.YU_OVERBURN_CANNON, Type.FIRE, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -2, true), Moves.LAVA_PLUME),
    yuMove(new AttackMove(Moves.YU_UNYIELDING_ADVANCE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(StatChangeBothSideAttr, "SPD", -1), Moves.CLOSE_COMBAT),
  );
}
export function registerYuDuelmonEntry27(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CURSED_VOLLEY, Type.NORMAL, MoveCategory.PHYSICAL, 30, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_4), Moves.SPIKE_CANNON),
    yuMove(new AttackMove(Moves.YU_KINDLING_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, trappedGate, 100), Moves.HEAD_CHARGE),
    yuMove(new AttackMove(Moves.YU_PYRE_FEAST, Type.FIRE, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedAndTrappedGate), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_CURSED_SPRINT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_HELLFIRE_BREATH, Type.FIRE, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, trappedGate, 1.5), Moves.ARMOR_CANNON),
    yuMove(new AttackMove(Moves.YU_FLAME_CONSUMPTION, Type.FIRE, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.3)
      .attr(GatedHitHealAttr, 0.5, burnedGate), Moves.FLAMETHROWER),
  );
}
export function registerYuDuelmonEntry28(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STAMPEDE_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 90, 95, 10, -1, 0, 9), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_CHARGING_HORNS, Type.NORMAL, MoveCategory.PHYSICAL, 40, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.HORN_ATTACK),
    yuMove(new AttackMove(Moves.YU_GUARD_BREAK, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.CHIP_AWAY),
    yuMove(new AttackMove(Moves.YU_TACKLE_THROUGH, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.ATK, 1, true, onKoGate)), Moves.TACKLE),
    yuMove(new AttackMove(Moves.YU_HORN_TOSS, Type.NORMAL, MoveCategory.PHYSICAL, 70, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true), Moves.HORN_ATTACK),
    yuMove(new AttackMove(Moves.YU_PARALYZING_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 70, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS), Moves.HEAD_CHARGE),
    yuMove(new AttackMove(Moves.YU_MOMENTUM_DRIVE, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(ConsecutiveUseCapPowerAttr, 60, 1), Moves.BIDE),
    yuMove(new AttackMove(Moves.YU_PURSUIT_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(PursuitSwitchMultiplierAttr, 1.625), Moves.SLAM),
    yuMove(new AttackMove(Moves.YU_BULLS_REVENGE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, retaliateGate, 1.67), Moves.RAGING_BULL),
    yuMove(new AttackMove(Moves.YU_ABSOLUTE_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(GatedSuppressAbilitiesAttr, atkStagesGte2Gate)
      .attr(BypassProtectAttr, atkStagesGte2Gate)
      .attr(IgnoreTypeResistancesAttr, atkStagesGte2Gate), Moves.DOUBLE_EDGE),
  );
}
export function registerYuDuelmonEntry29(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MARTYRS_BLAZE, Type.FIRE, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, below25HpGate, 1.33)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below25HpGate, 100), Moves.BLAZE_KICK),
    yuMove(new AttackMove(Moves.YU_DEFIANT_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userHpLtFoeGate, 1.35), Moves.CLOSE_COMBAT),
    yuMove(new AttackMove(Moves.YU_RECKLESS_DIVE, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 95, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.33), Moves.TAKE_DOWN),
    yuMove(new AttackMove(Moves.YU_DESPERATE_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, below50HpGate, 1), Moves.HEAD_CHARGE),
    yuMove(new SelfStatusMove(Moves.YU_PARTING_HAZARDS, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES, 1), Moves.STEALTH_ROCK),
    yuMove(new AttackMove(Moves.YU_ZEALOTS_FLAME, Type.FIRE, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(HpLostPercentPowerAttr, 5, 50), Moves.FLAMETHROWER),
  );
}
export function registerYuDuelmonEntry30(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BUDDY_BOMB, Type.NORMAL, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .unionMove()
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingStatBoostTagAttr, "ATK", 1), Moves.EGG_BOMB),
    yuMove(new AttackMove(Moves.YU_UNION_GALE, Type.FLYING, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .unionMove()
      .attr(ResetTailwindFromStartAttr, -1, unionGate2), Moves.HURRICANE),
    yuMove(new AttackMove(Moves.YU_SONIC_DIVE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 85, 10, 30, 0, 9)
      .unionMove()
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, unionGate2, 50), Moves.HYPER_FANG),
    yuMove(new SelfStatusMove(Moves.YU_FORMATION_GUARD, Type.FLYING, -1, 10, -1, 0, 9)
      .unionMove()
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, unionGate2, 100), Moves.DEFENSE_CURL),
    yuMove(new SelfStatusMove(Moves.YU_COMPANIONS_REST, Type.NORMAL, -1, 10, -1, 0, 9)
      .unionMove()
      .attr(ConditionalSelfHealAttr, 0.5, 0.75, unionGate2)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, unionGate2), Moves.WISH),
    yuMove(new AttackMove(Moves.YU_UNITED_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .unionMove()
      .attr(GatedMovePowerMultiplierAttr, unionGate2, 1.24), Moves.HEAD_CHARGE),
    yuMove(new AttackMove(Moves.YU_JOURNEYS_BOND, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .unionMove()
      .attr(GatedMovePowerMultiplierAttr, unionGate3, 1.38)
      .attr(GatedHitHealAttr, 0.5, unionGate3), Moves.STRENGTH),
  );
}
export function registerYuDuelmonEntry31(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PARASITIC_GRASP, Type.BUG, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .makesContact()
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate), Moves.LEECH_LIFE),
    yuMove(new SelfStatusMove(Moves.YU_INFECTION_SPIKE, Type.POISON, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES, 2), Moves.TOXIC_SPIKES),
    yuMove(new AttackMove(Moves.YU_VIRAL_BURST, Type.POISON, MoveCategory.SPECIAL, 80, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, statusedGate, 1.25), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_DRAIN_PULSE, Type.BUG, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate), Moves.BUG_BUZZ),
    yuMove(new AttackMove(Moves.YU_NEURAL_OVERRIDE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalConfuseAttr, 100, statusedAndTwoNegativesGate), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_HOST_CONSUMPTION, Type.BUG, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, statusedAndThreeNegativesGate, 50), Moves.LUNGE),
    yuMove(new SelfStatusMove(Moves.YU_MUTATING_STRAIN, Type.POISON, -1, 10, -1, 0, 9)
      .attr(RandomStatusReplaceAttr, statusedGate), Moves.TOXIC),
    yuMove(new AttackMove(Moves.YU_TYPEBITE, Type.BUG, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(SuperEffectiveTypeOverrideAttr, statusedGate), Moves.X_SCISSOR),
  );
}
export function registerYuDuelmonEntry32(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SUPPRESS_WAVE, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(RemoveOrStealHeldItemAttr, statusedGate), Moves.BADDY_BAD),
    yuMove(new StatusMove(Moves.YU_TOXIC_LOCK, Type.POISON, 90, 10, 100, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(StatusEffectAttr, StatusEffect.TOXIC), Moves.TOXIC),
    yuMove(new AttackMove(Moves.YU_MIMIC_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedAbilityCopyAttr, suppressedGate), Moves.PARABOLIC_CHARGE),
    yuMove(new AttackMove(Moves.YU_SUPPRESS_PULSE, Type.DARK, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(IgnoreTypeResistancesAttr, suppressedGate), Moves.SNARL),
    yuMove(new SelfStatusMove(Moves.YU_VIRAL_SPORES, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES, 2), Moves.SPORE),
    yuMove(new AttackMove(Moves.YU_MIND_CRUSH, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, suppressedGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, suppressedGate, 100), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_BEAM, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, statusedGate, 1.31), Moves.CHARGE_BEAM),
    yuMove(new AttackMove(Moves.YU_EXPLOITATION_BEAM, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, statusedGate, 1.3), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_ABSORPTION_PULSE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.4, 0.6, statusedGate), Moves.FIERY_WRATH),
    yuMove(new StatusMove(Moves.YU_IDENTITY_ERASURE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(GatedChangeTypeAttr, Type.NORMAL, statusedAndSuppressedGate), Moves.NASTY_PLOT),
  );
}
export function registerYuDuelmonEntry33(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ELECTRO_PIVOT, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .magnetMove()
      .attr(ForceSwitchOutAttr, true, false), Moves.WILD_CHARGE),
    yuMove(new AttackMove(Moves.YU_ALLOY_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .magnetMove()
      .attr(ConditionalHighCritAttr, magnetGate2, 50), Moves.AIR_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_IRON_CURTAIN, Type.STEEL, -1, 10, -1, 0, 9)
      .magnetMove()
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, magnetGate2, 100), Moves.METAL_SOUND),
    yuMove(new AttackMove(Moves.YU_CHARGED_SLAM, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .magnetMove()
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, magnetGate2, 50), Moves.SPARK),
    yuMove(new AttackMove(Moves.YU_STEEL_TEMPEST, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .magnetMove()
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, magnetGate2, 100), Moves.STEEL_ROLLER),
    yuMove(new StatusMove(Moves.YU_MAGNETIC_PULL, Type.STEEL, -1, 10, 30, 0, 9)
      .magnetMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ChangeTypeAttr, Type.ROCK), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_MAGNETIC_SINGULARITY, Type.ELECTRIC, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .magnetMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, magnetGate2)
      .attr(IgnoreSpDefAttr, magnetAndSpAtkGte3Gate), Moves.AURA_WHEEL),
    yuMove(new AttackMove(Moves.YU_RESONANCE_STRIKE, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .magnetMove()
      .attr(GatedMovePowerMultiplierAttr, usedSteelLastTurnGate, 1.3), Moves.SUNSTEEL_STRIKE),
  );
}
export function registerYuDuelmonEntry34(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AMBUSH_CLAW, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, turn1OutAndParaGate, 1.75), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SCARE_TACTICS, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_PANIC_STRIKE, Type.GHOST, MoveCategory.PHYSICAL, 85, 90, 10, -1, 1, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, below50HpGate), Moves.ASTONISH),
    yuMove(new AttackMove(Moves.YU_HAUNTING_WAIL, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, paralyzedGate, 100)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.PHANTOM_FORCE),
    yuMove(new AttackMove(Moves.YU_COMMITTED_FURY, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(TurnsOnFieldPowerAttr, 10, 50), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_SACRIFICE_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, below25HpGate, 1.4)
      .attr(GatedIncrementMovePriorityAttr, below25HpGate, 1), Moves.SHADOW_SNEAK),
  );
}
export function registerYuDuelmonEntry35(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_LOCKJAW, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .bitingMove()
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.JAW_LOCK),
    yuMove(new AttackMove(Moves.YU_JAW_FANG, Type.POISON, MoveCategory.PHYSICAL, 75, 95, 10, 50, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.POISON), Moves.POISON_FANG),
    yuMove(new AttackMove(Moves.YU_FROST_FANG, Type.ICE, MoveCategory.PHYSICAL, 80, 95, 10, 20, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.FREEZE), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_CRUSHING_BITE, Type.ROCK, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .bitingMove()
      .attr(IgnoreOpponentStatChangesAttr), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_IRON_SNAP, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .bitingMove(), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_PREDATORS_FEAST, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .bitingMove()
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_DEEP_BITE, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .bitingMove()
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.ASSURANCE),
    yuMove(new AttackMove(Moves.YU_APEX_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .bitingMove()
      .attr(GatedSuppressAbilitiesAttr, atkStagesGte2Gate), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_JAW_CLAMP, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .bitingMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.HEAL_BLOCKED, 100, trappedGate), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_RESIST_BITE, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .bitingMove()
      .attr(AddSecondaryResistTypeAttr), Moves.THUNDER_FANG),
    yuMove(new AttackMove(Moves.YU_INSATIABLE_BITE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .bitingMove()
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.ATK, 1, true, onKoGate))
      .addAttr(new PostVictoryStatChangeAttr(BattleStat.SPD, 1, true, onKoGate)), Moves.THROAT_CHOP),
  );
}
export function registerYuDuelmonEntry36(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CARNIVORE_BIND, Type.GRASS, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .makesContact()
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 100, abilityContactProcGate), Moves.LEAF_BLADE),
    yuMove(new AttackMove(Moves.YU_PREDATORY_LUNGE, Type.BUG, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .makesContact()
      .attr(GatedMovePowerMultiplierAttr, trappedGate, 1.5), Moves.PIN_MISSILE),
    yuMove(new AttackMove(Moves.YU_DIGESTIVE_ACID, Type.POISON, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, trappedGate, 100), Moves.ACID),
    yuMove(new AttackMove(Moves.YU_THORN_LASH, Type.GRASS, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .makesContact()
      .attr(GatedMovePowerMultiplierAttr, alreadyTrappedGate, 2), Moves.SNAP_TRAP),
    yuMove(new AttackMove(Moves.YU_ACID_LASH, Type.POISON, MoveCategory.PHYSICAL, 70, 95, 10, 50, 0, 9)
      .makesContact()
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, trappedGate, 100), Moves.GUNK_SHOT),
    yuMove(new AttackMove(Moves.YU_CARNIVOROUS_EMBRACE, Type.GRASS, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .makesContact()
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate), Moves.HORN_LEECH),
    yuMove(new AttackMove(Moves.YU_SYMBIOTIC_PRISON, Type.GRASS, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .makesContact()
      .attr(GatedAddBattlerTagAttr, BattlerTagType.INGRAIN, 100, trappedGate), Moves.BRANCH_POKE),
  );
}
export function registerYuDuelmonEntry37(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_EMBER_PIVOT, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.FLAME_CHARGE),
    yuMove(new AttackMove(Moves.YU_CHARGE_DETONATION, Type.FIRE, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, chargedGate, 50), Moves.MIND_BLOWN),
    yuMove(new AttackMove(Moves.YU_IGNITION_RUSH, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.INCINERATE),
    yuMove(new AttackMove(Moves.YU_DARK_EMBER, Type.DARK, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, chargedGate, 1.38), Moves.HEAT_WAVE),
  );
}
export function registerYuDuelmonEntry38(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TWILIGHT_BEAM, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedHitHealAttr, 0.5, superEffectiveGate), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_LUSTER_BLADE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 80, 10, -1, 1, 9), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_DUALITY_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, typeDiffFromLastAttackGate, 1.5), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_BLADE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(IgnoreTypeResistancesAttr, foeAsleepGate), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_GRACEFUL_DEVASTATION, Type.NORMAL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAtkSpAtkMinus2Gate), Moves.HYPER_VOICE),
    yuMove(new AttackMove(Moves.YU_DUAL_EDGE, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(DualTypeMultiHitAttr, Type.DARK, Type.FAIRY), Moves.DOUBLE_EDGE),
    yuMove(new AttackMove(Moves.YU_UNCONSCIOUS_JUDGMENT, Type.FAIRY, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(WakeAndStatDropAttr, foeAsleepGate), Moves.PLAY_ROUGH),
  );
}
export function registerYuDuelmonEntry39(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_REQUIEM_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9), Moves.BEAT_UP),
    yuMove(new SelfStatusMove(Moves.YU_REVIVAL_SUSTAIN, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(ConditionalSelfHealAttr, 0.33, 0.5, revivalSustainTier2Gate)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, revivalSustainTriadGate), Moves.WISH),
    yuMove(new SelfStatusMove(Moves.YU_SACRIFICE_SHIELD, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, allyFaintedThisBattleGate, 100), Moves.CURSE),
    yuMove(new AttackMove(Moves.YU_ASCENDING_PRIORITY, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 1, 9), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_APOTHEOSIS_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, soleSurvivorGate, 1.56), Moves.AXE_KICK),
  );
}
export function registerYuDuelmonEntry40(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CHAOS_BOLT, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, confusedGate, 50), Moves.ICE_BEAM),
    yuMove(new AttackMove(Moves.YU_MOODY_SURGE, Type.DARK, MoveCategory.SPECIAL, 50, 100, 10, -1, 0, 9)
      .attr(HighestPositiveStagePowerAttr, 10, 60), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_CHAOTIC_BARRAGE, Type.NORMAL, MoveCategory.SPECIAL, 40, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.UPROAR),
    yuMove(new AttackMove(Moves.YU_ARCANE_PRIORITY, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_ENTROPY_WAVE, Type.GHOST, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(PositiveStageCountPowerAttr, 5, 60), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_CHANNELED_CHAOS, Type.DARK, MoveCategory.SPECIAL, 80, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, highestBoostGte3Gate, 1.38)
      .attr(IgnoreTypeResistancesAttr, highestBoostGte3Gate), Moves.FIERY_WRATH),
  );
}
export function registerYuDuelmonEntry41(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ROSE_WHIP, Type.GRASS, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3), Moves.BULLET_SEED),
    yuMove(new AttackMove(Moves.YU_THORN_SCATTER, Type.GRASS, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES, 1), Moves.WOOD_HAMMER),
    yuMove(new SelfStatusMove(Moves.YU_GARDENS_EMBRACE, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, grassyTerrainGate), Moves.LEECH_SEED),
    yuMove(new SelfStatusMove(Moves.YU_BRIAR_WALL, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, grassyTerrainGate, 100), Moves.GRASSY_TERRAIN),
    yuMove(new AttackMove(Moves.YU_ROSE_SURGE, Type.GRASS, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ExtendTerrainDurationAttr), Moves.LEAF_STORM),
    yuMove(new AttackMove(Moves.YU_ROSE_TEMPEST, Type.GRASS, MoveCategory.SPECIAL, 100, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, grassyTerrainGate), Moves.ENERGY_BALL),
    yuMove(new AttackMove(Moves.YU_PARASITIC_BLOOM, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr), Moves.POWER_WHIP),
    yuMove(new SelfStatusMove(Moves.YU_ETERNAL_BLOOM, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(HealAttr, 0.25), Moves.AROMATHERAPY),
  );
}
export function registerYuDuelmonEntry42(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PREDATORS_CRUNCH, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedIgnoreOpponentStatChangesAttr, DefGeAtkGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_SEISMIC_HUNT, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, DefGeAtkGate), Moves.EARTHQUAKE),
    yuMove(new StatusMove(Moves.YU_TERRITORIAL_ROAR, Type.NORMAL, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(IncomingStatBoostTagAttr, "ATK", 1, DefGeAtkIncomingGate), Moves.NOBLE_ROAR),
    yuMove(new AttackMove(Moves.YU_PREDATORS_RUSH, Type.ROCK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 1, 9), Moves.ACCELEROCK),
    yuMove(new AttackMove(Moves.YU_SHELL_REND, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, DefGeAtkGate, 100), Moves.BEHEMOTH_BLADE),
    yuMove(new AttackMove(Moves.YU_STALKING_LUNGE, Type.BUG, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false), Moves.X_SCISSOR),
    yuMove(new AttackMove(Moves.YU_BONE_CRUSHER, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, DefGeAtkGate), Moves.BONE_CLUB),
    yuMove(new AttackMove(Moves.YU_TECTONIC_AMBUSH, Type.GROUND, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, switchedInThisTurnGate, 1.59), Moves.BONE_RUSH),
    yuMove(new AttackMove(Moves.YU_PRIMORDIAL_IMPACT, Type.ROCK, MoveCategory.PHYSICAL, 110, 80, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(StealHeldItemAttr, 100, DefGeAtkGate), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_FOSSIL_JAW, Type.ROCK, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .bitingMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, DefGeAtkGate), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_ADAPTIVE_JAWS, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(SuperEffectiveTypeMorphAttr, DefGeAtkGate), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_TERRITORIAL_LOCKDOWN, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, DefGeAtkGate)
      .attr(HealBlockAttr, DefGeAtkGate), Moves.JAW_LOCK),
  );
}
export function registerYuDuelmonEntry43(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_KNIGHTS_HONOR, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, faintedAlliesGte3Gate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_BLADE_CASCADE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_AVENGERS_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(FaintedAllyCountPowerAttr, 20), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_MOURNING_BLADE, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(FaintedAllyCountPowerAttr, 10), Moves.PHANTOM_FORCE),
    yuMove(new SelfStatusMove(Moves.YU_BLADE_MEND, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(FaintedAllyCountHealAttr, 0.125), Moves.METAL_SOUND),
    yuMove(new AttackMove(Moves.YU_ESCALATING_FURY, Type.FIGHTING, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(EscalatingReusePowerAttr, 60, 20, 160), Moves.BRICK_BREAK),
    yuMove(new SelfStatusMove(Moves.YU_UNDYING_RESOLVE, Type.STEEL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr, BattlerTagType.ENDURING)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, faintedAlliesGte3Gate, 100), Moves.HOWL),
  );
}
export function registerYuDuelmonEntry44(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WILDFIRE_TRAP, Type.GRASS, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.BRANCH_POKE),
    yuMove(new SelfStatusMove(Moves.YU_CHARCOAL_GUARD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, burnedGate, 100), Moves.SAFEGUARD),
    yuMove(new AttackMove(Moves.YU_EMBER_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.APPLE_ACID),
    yuMove(new StatusMove(Moves.YU_SMOKE_SCREEN, Type.NORMAL, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -2, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, burnedGate, 100), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_BARK_CANNON, Type.GRASS, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(IgnoreSpDefAttr, burnedGate), Moves.LEAF_STORM),
    yuMove(new AttackMove(Moves.YU_BLAZING_PRIORITY, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_ROOTED_INFERNO, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.INGRAIN, true), Moves.ENERGY_BALL),
    yuMove(new AttackMove(Moves.YU_COMBUSTION_WAVE, Type.GRASS, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, burnedGate, 100), Moves.HEAT_WAVE),
    yuMove(new SelfStatusMove(Moves.YU_PHOENIX_BARK, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(PhoenixBarkAttr), Moves.AROMATHERAPY),
    yuMove(new AttackMove(Moves.YU_EVERBURN_LANCE, Type.NORMAL, MoveCategory.PHYSICAL, 110, 80, 10, -1, 0, 9)
      .attr(GatedIgnoreAccuracyAttr, burnedAndTrappedGate), Moves.HORN_ATTACK),
    yuMove(new AttackMove(Moves.YU_FUEL_SACRIFICE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.1)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.2)
      .attr(GatedRecoilNegateAttr, below50HpGate), Moves.TAKE_DOWN),
  );
}
export function registerYuDuelmonEntry45(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_HAILSTORM_GENESIS, Type.ICE, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "HAIL"), Moves.AURORA_VEIL),
    yuMove(new AttackMove(Moves.YU_FROST_WING, Type.FLYING, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, frozenGate, 100), Moves.BRAVE_BIRD),
    yuMove(new AttackMove(Moves.YU_PERMAFROST_TOMB, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(PermafrostBonusDamageAttr, frozenGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GLACIAL_BREATH, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.DRAGON_BREATH),
    yuMove(new AttackMove(Moves.YU_AVALANCHE_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_HOARFROST_BREATH, Type.DRAGON, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, foeSpeLoweredGate, 35), Moves.DRACO_METEOR),
    yuMove(new AttackMove(Moves.YU_SHATTER_STRIKE, Type.ICE, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(ThawAndDoubleFrozenAttr, frozenGate), Moves.ICICLE_SPEAR),
    yuMove(new AttackMove(Moves.YU_DEEP_FREEZE, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, hailGate, 35), Moves.WEATHER_BALL),
    yuMove(new StatusMove(Moves.YU_ABSOLUTE_CHILL, Type.ICE, 85, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -2, false)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false)
      .attr(GatedClearPositiveStatsAttr, hailGate), Moves.HAIL),
    yuMove(new AttackMove(Moves.YU_POLAR_VORTEX, Type.NORMAL, MoveCategory.SPECIAL, 95, 85, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "HAIL"), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FROZEN_CASCADE, Type.DRAGON, MoveCategory.SPECIAL, 55, 95, 10, -1, 0, 9)
      .attr(ConditionalMultiHitAttr, MultiHitType._1, MultiHitType._2, hailGate), Moves.CLANGING_SCALES),
  );
}
export function registerYuDuelmonEntry46(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STEEL_CAGE, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, abilityProcGate), Moves.METAL_CLAW),
    yuMove(new AttackMove(Moves.YU_IRON_ROULETTE, Type.STEEL, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(RandomStatBoostAttr, 2, 1, 30), Moves.STEEL_BEAM),
    yuMove(new AttackMove(Moves.YU_JACKPOT_BREAK, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(GatedOverrideBasePowerAttr, abilityProcGate, 140), Moves.KNOCK_OFF),
    yuMove(new AttackMove(Moves.YU_BLOWBACK_SLAM, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedForceSwitchOutAttr, false, true, foeSpeNegativeGate), Moves.BRUTAL_SWING),
    yuMove(new AttackMove(Moves.YU_ALLOY_STORM, Type.STEEL, MoveCategory.SPECIAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2), Moves.MIRROR_SHOT),
    yuMove(new AttackMove(Moves.YU_REINFORCED_IMPACT, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(NegativeStatStagePowerAttr, 5, undefined, 60), Moves.DOUBLE_IRON_BASH),
    yuMove(new AttackMove(Moves.YU_ALL_IN, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(RandomStatDropBothSidesAttr), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_TARGETED_EXPLOITATION, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, foeNegativeDefGate, 10)
      .attr(GatedIncrementMovePriorityAttr, foeNegativeSpeGate, 1)
      .attr(GatedHitHealAttr, 0.2, foeNegativeAtkGate), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_COMPOUNDING_INTEREST, Type.DARK, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(NegativeStatStagePowerAttr, 5, undefined, 60), Moves.RUINATION),
  );
}
export function registerYuDuelmonEntry47(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_DRAGON_CHARGE, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.DRAGON_DANCE),
    yuMove(new AttackMove(Moves.YU_ELECTRO_SNARE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.THUNDER_CAGE),
    yuMove(new AttackMove(Moves.YU_CHARGE_DRAIN, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, paralyzedGate), Moves.PARABOLIC_CHARGE),
    yuMove(new AttackMove(Moves.YU_ALTERNATIVE_BREATH, Type.DRAGON, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, [BattleStat.ATK, BattleStat.SPATK], -1, false)
      .attr(AlternativeBreathGatedAllStatDropAttr, paralyzedGate, 30), Moves.DRACO_METEOR),
    yuMove(new AttackMove(Moves.YU_BURST_CHAIN, Type.DRAGON, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, usedStatusLastTurnGate, 2), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_RESONANCE_WAVE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, paralyzedGate, 100), Moves.SHOCK_WAVE),
  );
}
export function registerYuDuelmonEntry48(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MAX_PRIORITY, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SHATTERING_BLOW, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(RemoveScreensAttr), Moves.CIRCLE_THROW),
    yuMove(new AttackMove(Moves.YU_DOMINION_PULSE, Type.DRAGON, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, DefGeAtkGate, 100), Moves.DRAGON_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_NULL_CLEANSE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ClearAllNegativeStatsAndHealAttr, 0.25), Moves.HEAL_BELL),
    yuMove(new AttackMove(Moves.YU_CHAOS_BREAKER, Type.DARK, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(BypassAbilityAttr), Moves.FOUL_PLAY),
  );
}
export function registerYuDuelmonEntry49(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TOON_SCRAMBLE, Type.DRAGON, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, confusedGate, 100), Moves.CLANGING_SCALES),
    yuMove(new AttackMove(Moves.YU_FAIRY_PRANK, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, confusedGate), Moves.DAZZLING_GLEAM),
    yuMove(new AttackMove(Moves.YU_WACKY_BEAM, Type.DRAGON, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(SuperEffectiveTypeOverrideAttr), Moves.FICKLE_BEAM),
    yuMove(new AttackMove(Moves.YU_SPARKLE_SLAP, Type.FAIRY, MoveCategory.PHYSICAL, 65, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, confusedGate), Moves.PLAY_ROUGH),
    yuMove(new AttackMove(Moves.YU_PIXIE_DISRUPTION, Type.FAIRY, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(RandomStatChangeAttr, -1, 20), Moves.FAIRY_WIND),
    yuMove(new AttackMove(Moves.YU_TOON_RAMPAGE, Type.DRAGON, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, confusedGate, 100), Moves.OUTRAGE),
    yuMove(new AttackMove(Moves.YU_LOONEY_LOOP, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HealIfNotHitThisTurnAttr, 0.25), Moves.DRACO_METEOR),
    yuMove(new SelfStatusMove(Moves.YU_TOON_IMMUNITY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ToonImmunityAttr, 3), Moves.RECOVER),
  );
}
export function registerYuDuelmonEntry50(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TRI_HEAD_BLAST, Type.DRAGON, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(HighCritAttr), Moves.DOOM_DESIRE),
    yuMove(new AttackMove(Moves.YU_TRIPLE_THUNDER, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS), Moves.THUNDER),
    yuMove(new AttackMove(Moves.YU_TRIPLE_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.4), Moves.SEED_FLARE),
    yuMove(new AttackMove(Moves.YU_ULTIMATE_BARRAGE, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, lastHitOnlyGate, 100), Moves.TECHNO_BLAST),
    yuMove(new AttackMove(Moves.YU_BLAZING_TRI_BEAM, Type.FIRE, MoveCategory.SPECIAL, 80, 95, 10, 20, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_TRI_FORCE_REND, Type.FIGHTING, MoveCategory.SPECIAL, 85, 90, 10, 10, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.AURA_SPHERE),
    yuMove(new AttackMove(Moves.YU_TRIPLE_FROSTBITE, Type.ICE, MoveCategory.SPECIAL, 75, 100, 10, 20, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.POWDER_SNOW),
    yuMove(new AttackMove(Moves.YU_ABSOLUTE_BARRAGE, Type.NORMAL, MoveCategory.SPECIAL, 100, 90, 10, 30, 0, 9)
      .attr(TripleAccelMultiHitAttr)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, barrageHit1Gate, 30)
      .attr(ConditionalFlinchAttr, 20, barrageHit2Gate)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, barrageHit3Gate, 30), Moves.ECHOED_VOICE),
  );
}
export function registerYuDuelmonEntry51(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOLT_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, paralyzedGate, 100)
      .attr(GatedMovePowerMultiplierAttr, paralyzedGate, 1.25), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_DRAGON_TORRENT, Type.DRAGON, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(HighCritAttr), Moves.DRAGON_BREATH),
    yuMove(new AttackMove(Moves.YU_LIGHTNING_CRASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.CONSTRICT),
    yuMove(new AttackMove(Moves.YU_DRAGON_DEVASTATION, Type.DRAGON, MoveCategory.SPECIAL, 95, 85, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, onCritGate, 100), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_BOLT_CHAIN, Type.NORMAL, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, paralyzedGate, 2), Moves.FLASH_CANNON),
    yuMove(new AttackMove(Moves.YU_CRITICAL_THUNDER, Type.DRAGON, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(HighCritAttr), Moves.DUAL_CHOP),
    yuMove(new AttackMove(Moves.YU_SURGE_DRAIN, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, paralyzedGate), Moves.DISCHARGE),
    yuMove(new AttackMove(Moves.YU_ABSOLUTE_THUNDER, Type.NORMAL, MoveCategory.SPECIAL, 110, 80, 10, -1, 0, 9)
      .attr(IgnoreTypeResistancesAttr, paralyzedGate), Moves.HIDDEN_POWER),
    yuMove(new AttackMove(Moves.YU_LIGHTNING_RECURSION, Type.ELECTRIC, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalMultiHitAttr, MultiHitType._1, MultiHitType._2, fullParaLastTurnGate), Moves.VOLT_SWITCH),
  );
}
export function registerYuDuelmonEntry52(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_KNOWLEDGE_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.4)
      .attr(KnowledgeDrainStatStealAttr, 30), Moves.ESPER_WING),
    yuMove(new StatusMove(Moves.YU_ANCIENT_WARD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeIsSteelGate, 100), Moves.CALM_MIND),
    yuMove(new AttackMove(Moves.YU_RUNE_STRIKE, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.ALLURING_VOICE),
    yuMove(new AttackMove(Moves.YU_UNWRITTEN_SPELL, Type.FAIRY, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(RandomAbilityReplaceAttr), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_SPELLWEAVE, Type.FAIRY, MoveCategory.SPECIAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, superEffectiveGate, 100), Moves.DAZZLING_GLEAM),
  );
}
export function registerYuDuelmonEntry53(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BLADE_PIVOT, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.BEHEMOTH_BLADE),
    yuMove(new AttackMove(Moves.YU_PRIORITY_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_WARDING_EDGE, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr), Moves.GIGATON_HAMMER),
    yuMove(new AttackMove(Moves.YU_CURSE_TRANSFER, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatusTransferToFoeAttr), Moves.SHADOW_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_REFORGED_BLADE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userStatusedGate, 100), Moves.AUTOTOMIZE),
    yuMove(new AttackMove(Moves.YU_SPELL_CASCADE, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(SelfStatusAfterKoAttr, [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC], onKoGate), Moves.FLASH_CANNON),
  );
}
export function registerYuDuelmonEntry54(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MONSTER_TRAP, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.JAW_LOCK),
    yuMove(new AttackMove(Moves.YU_TROPHY_BLADE, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(TrophyBladePermanentBpAttr, 20), Moves.COVET),
    yuMove(new SelfStatusMove(Moves.YU_PREDATORS_SENSE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalHighCritAttr, foeTeamHasDragonGate, 100), Moves.SWORDS_DANCE),
    yuMove(new AttackMove(Moves.YU_PURSUIT_SLASH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .slicingMove(), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_DRAIN_SLASH, Type.GRASS, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, dragonTypeGate), Moves.LEAF_BLADE),
    yuMove(new AttackMove(Moves.YU_EXTINCTION_EDGE, Type.FAIRY, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .slicingMove()
      .attr(PostVictoryStatChangeAttr, BattleStat.SPD, 1, true, dragonKoGate), Moves.PLAY_ROUGH),
    yuMove(new AttackMove(Moves.YU_COUNTER_CLEAVE, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(GatedMovePowerMultiplierAttr, dragonSwitchInGate, 1.625), Moves.COUNTER),
    yuMove(new AttackMove(Moves.YU_ANNIHILATION_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .slicingMove()
      .attr(RemoveHeldItemAttr, false), Moves.NIGHT_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_SHARPENED_RESOLVE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.DEFENSE_CURL),
  );
}
export function registerYuDuelmonEntry55(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOID_PURSUIT, Type.NORMAL, MoveCategory.SPECIAL, 90, 100, 10, -1, 0, 9)
      .attr(StealHeldItemOnSwitchAttr, foeSwitchingGate), Moves.HYPER_BEAM),
    yuMove(new AttackMove(Moves.YU_MONARCHS_DECREE, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, itemlessGate, 100), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_SHADOW_TRAP, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.FIRE_SPIN), Moves.THUNDER_CAGE),
    yuMove(new SelfStatusMove(Moves.YU_DARK_AUTHORITY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, entryAfterFaintGate, 100), Moves.HONE_CLAWS),
    yuMove(new AttackMove(Moves.YU_VOID_STRIKE, Type.NORMAL, MoveCategory.SPECIAL, 85, 95, 10, -1, 1, 9), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_BANISH_SIP, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, itemlessGate), Moves.JUDGMENT),
  );
}
export function registerYuDuelmonEntry56(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_OVERCHARGE_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(GatedCritOnlyAttr, atkStageGte3Gate), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_POWER_PRIORITY, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, atkStageGte2Gate, 1.27), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_ATTRITION_DRIVE, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.GYRO_BALL),
    yuMove(new AttackMove(Moves.YU_HARVEST_SLAM, Type.GRASS, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, berryConsumedThisTurnGate, 1.38), Moves.WOOD_HAMMER),
    yuMove(new SelfStatusMove(Moves.YU_FUEL_INFUSION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(GenerateRandomBerriesAttr, 3), Moves.RECYCLE),
    yuMove(new AttackMove(Moves.YU_RHYTHM_BREAK, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedConditionalPriorityAttr, noAtkBoostsGate, 2), Moves.UPPER_HAND),
  );
}
export function registerYuDuelmonEntry57(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ILLUSORY_WALL, Type.DARK, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalConfuseAttr, 100, defSpDefTotalGte3Gate), Moves.BADDY_BAD),
    yuMove(new SelfStatusMove(Moves.YU_SHADOW_FORTIFICATION, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.WILL_O_WISP),
    yuMove(new AttackMove(Moves.YU_PHANTOM_BARRIER, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, defSpDefTotalGte3Gate, 100), Moves.NIGHT_SHADE),
    yuMove(new AttackMove(Moves.YU_ILLUSION_SHATTER, Type.GHOST, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, defSpDefTotalGte6Gate, 2)
      .attr(GatedMovePowerMultiplierAttr, defSpDefTotalGte6Gate, 1.44), Moves.SHADOW_BALL),
    yuMove(new SelfStatusMove(Moves.YU_DARK_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalHealAttr, 0.25, defSpDefTotalGte3Gate), Moves.DARK_VOID),
    yuMove(new AttackMove(Moves.YU_CREEPING_DREAD, Type.GHOST, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(DefSpDefStagePowerAttr, 5), Moves.ASTRAL_BARRAGE),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_GRIP, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, trappedGate), Moves.SPECTRAL_THIEF),
    yuMove(new StatusMove(Moves.YU_DARK_LABYRINTH, Type.DARK, 90, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalConfuseAttr, 100, alwaysTrueGate), Moves.SUPERSONIC),
  );
}
export function registerYuDuelmonEntry58(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VERDANT_RUSH, Type.GRASS, MoveCategory.PHYSICAL, 85, 95, 10, -1, 1, 9), Moves.GRASSY_GLIDE),
    yuMove(new AttackMove(Moves.YU_GUARDIAN_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(MultiHitAttr, MultiHitType._2), Moves.PSYCHO_CUT),
    yuMove(new SelfStatusMove(Moves.YU_TERRAIN_ANCHOR, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY"), Moves.GRASSY_TERRAIN),
    yuMove(new AttackMove(Moves.YU_BLADE_DANCE, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .slicingMove()
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, grassyTerrainGate, 100), Moves.COLLISION_COURSE),
    yuMove(new AttackMove(Moves.YU_NATURES_WRATH, Type.GRASS, MoveCategory.PHYSICAL, 95, 85, 10, 30, 0, 9)
      .slicingMove()
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, grassyTerrainGate, 30), Moves.LEAF_BLADE),
  );
}
export function registerYuDuelmonEntry59(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOID_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SACRIFICE_CHAIN, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, retaliateGate, 1.47), Moves.CEASELESS_EDGE),
    yuMove(new AttackMove(Moves.YU_ENVOYS_WRATH, Type.DARK, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(FaintedAllyCountPowerAttr, 10), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_DEATH_SURGE, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.33), Moves.KNOCK_OFF),
  );
}
export function registerYuDuelmonEntry60(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_REACH_BIND, Type.GHOST, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(BindingMoveTagAttr), Moves.SHADOW_CLAW),
    yuMove(new AttackMove(Moves.YU_VENOM_GRIP, Type.POISON, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(BindingMoveTagAttr)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, boundGate, 50), Moves.GUNK_SHOT),
    yuMove(new AttackMove(Moves.YU_TIDAL_SNARE, Type.WATER, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(BindingMoveTagAttr)
      .attr(HealBlockAttr, boundGate), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_IRON_VICE, Type.STEEL, MoveCategory.PHYSICAL, 90, 95, 10, -1, 0, 9)
      .attr(BindingMoveTagAttr)
      .attr(ItemBlockAttr, boundGate), Moves.HARD_PRESS),
    yuMove(new AttackMove(Moves.YU_CRUSHING_PRESSURE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, alreadyTrappedGate, 1.35), Moves.SUBMISSION),
  );
}
export function registerYuDuelmonEntry61(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ACID_TORRENT, Type.NORMAL, MoveCategory.SPECIAL, 95, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, foePoisonedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_CORRODING_DELUGE, Type.POISON, MoveCategory.SPECIAL, 40, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_3)
      .attr(PerHitStatChangeAttr, 20), Moves.VENOSHOCK),
    yuMove(new AttackMove(Moves.YU_CLOUDBURST_CANNON, Type.WATER, MoveCategory.SPECIAL, 80, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, rainGate, 1.5)
      .attr(GatedRemoveHeldItemAttr, rainGate), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_STORM_SHIFT, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, rainGate), Moves.RELIC_SONG),
    yuMove(new AttackMove(Moves.YU_ACID_PRIORITY, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.ACID),
    yuMove(new AttackMove(Moves.YU_TOXIC_DOWNPOUR, Type.POISON, MoveCategory.SPECIAL, 80, 85, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.4, 0.6, rainGate), Moves.SLUDGE_BOMB),
    yuMove(new SelfStatusMove(Moves.YU_RAIN_RENEWAL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true), Moves.RAIN_DANCE),
    yuMove(new StatusMove(Moves.YU_ACID_FOG, Type.POISON, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -2, false)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, rainGate, 30), Moves.ACID_ARMOR),
  );
}
export function registerYuDuelmonEntry62(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TYPHOON_SLAM, Type.WATER, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeDefLtAtkGate, 1.4), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_TRIPLE_GUST, Type.FLYING, MoveCategory.PHYSICAL, 30, 95, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FlinchAttr), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_STORM_EYE, Type.FLYING, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(ConfuseOnHitAttr, 100, foeSpDefLtSpAtkGate), Moves.BLEAKWIND_STORM),
    yuMove(new AttackMove(Moves.YU_EXPLOIT_WEAKNESS, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeDefLtAtkGate, 1.5), Moves.FEINT_ATTACK),
    yuMove(new AttackMove(Moves.YU_GALE_DRAIN, Type.FLYING, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpDefLtSpAtkGate), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_TAILWIND_STRIKE, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_REARRANGING_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedSuppressAbilitiesAttr, foeSpAtkGtSpDefGate), Moves.EXTRASENSORY),
    yuMove(new SelfStatusMove(Moves.YU_CALM_CENTER, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.COSMIC_POWER),
    yuMove(new AttackMove(Moves.YU_DEGRADATION_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(BranchStatChangeByGateAttr, foeSpDefLtSpAtkGate, BattleStat.SPDEF, BattleStat.SPATK, -1), Moves.PSYSHOCK),
  );
}
export function registerYuDuelmonEntry63(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PHANTOM_VOLLEY, Type.GHOST, MoveCategory.SPECIAL, 30, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.BITTER_MALICE),
    yuMove(new AttackMove(Moves.YU_SOUL_FEAST, Type.GHOST, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, cursedGate), Moves.INFERNAL_PARADE),
    yuMove(new AttackMove(Moves.YU_MIST_BIND, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.MOONGEIST_BEAM),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_BARRAGE, Type.GHOST, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(ConditionalMultiHitAttr, MultiHitType._1, MultiHitType._2, cursedGate), Moves.ASTRAL_BARRAGE),
    yuMove(new AttackMove(Moves.YU_FADING_STRIKE, Type.GHOST, MoveCategory.SPECIAL, 70, 100, 10, -1, 1, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, userCursedGate, 100), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_WITHER_PULSE, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, cursedGate, 30), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_TOXIC_MIST, Type.POISON, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.HEAL_BLOCKED, 100, cursedGate), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_FOG_VORTEX, Type.GHOST, MoveCategory.SPECIAL, 110, 80, 10, -1, 0, 9)
      .attr(IgnoreTypeResistancesAttr, cursedGate), Moves.OMINOUS_WIND),
  );
}
export function registerYuDuelmonEntry64(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STORM_FURY, Type.FLYING, MoveCategory.PHYSICAL, 130, 50, 10, -1, 0, 9), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_FOG_BLAST, Type.FLYING, MoveCategory.PHYSICAL, 85, 70, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, prevMoveMissedGate, 1.35), Moves.BEAK_BLAST),
    yuMove(new AttackMove(Moves.YU_HAZE_CANNON, Type.ICE, MoveCategory.PHYSICAL, 90, 60, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, prevMoveMissedGate, 35), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_VENGEFUL_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, prevMoveMissedGate, 1), Moves.COMBAT_TORQUE),
    yuMove(new AttackMove(Moves.YU_MIST_SHROUD, Type.GHOST, MoveCategory.PHYSICAL, 80, 70, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(ConditionalConfuseAttr, 50, prevMoveMissedGate), Moves.SHADOW_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_FOG_MANTLE, Type.FLYING, -1, 10, -1, 4, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(CritProtectAttr), Moves.DEFOG),
    yuMove(new SelfStatusMove(Moves.YU_NIMBUS_GAMBIT, Type.NORMAL, 50, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.SWORDS_DANCE),
  );
}
export function registerYuDuelmonEntry65(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SILENT_KILL, Type.DARK, MoveCategory.SPECIAL, 70, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, allStatsGte1Gate, 1.64), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_SHADOW_STRIKE, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, evasionGte2Gate), Moves.NIGHT_DAZE),
    yuMove(new SelfStatusMove(Moves.YU_ASSASSIN_VANISH, Type.GHOST, -1, 10, -1, 4, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ProtectAttr), Moves.CONFUSE_RAY),
    yuMove(new AttackMove(Moves.YU_DETONATION_FIST, Type.FIGHTING, MoveCategory.SPECIAL, 60, 100, 10, -1, 0, 9)
      .attr(ConsumeBoostsForPowerAttr, 15, 6), Moves.AURA_SPHERE),
    yuMove(new AttackMove(Moves.YU_MIST_DAGGER, Type.GHOST, MoveCategory.SPECIAL, 80, 95, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, evasionGte1Gate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_PHANTOM_AMBUSH, Type.GHOST, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foePrevMoveMissedGate, 1.5), Moves.NIGHT_SHADE),
    yuMove(new AttackMove(Moves.YU_COILING_SMOKE, Type.POISON, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, allStatsGte1Gate, 100), Moves.SLUDGE_BOMB),
    yuMove(new SelfStatusMove(Moves.YU_MIST_CLOAK, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(GatedSubstituteAttr, 0.25, evasionGte3Gate, 0.15), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_SMOKE_EXPLOSION, Type.POISON, MoveCategory.SPECIAL, 80, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, evasionGte3Gate, 50), Moves.VENOSHOCK),
  );
}
export function registerYuDuelmonEntry66(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FOG_CANNON, Type.NORMAL, MoveCategory.PHYSICAL, 35, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_4), Moves.SPIKE_CANNON),
    yuMove(new AttackMove(Moves.YU_TIDAL_TRAP, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.CONSTRICT),
    yuMove(new AttackMove(Moves.YU_HYDRO_PRIORITY, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_DRAGONS_MIST, Type.DRAGON, MoveCategory.SPECIAL, 95, 90, 10, 50, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_FOG_BREATH, Type.NORMAL, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeEvaNegativeGate), Moves.REVELATION_DANCE),
    yuMove(new AttackMove(Moves.YU_GALE_TORRENT, Type.FLYING, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr), Moves.BRAVE_BIRD),
    yuMove(new AttackMove(Moves.YU_DROWNING_WAVE, Type.NORMAL, MoveCategory.SPECIAL, 120, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.2)
      .attr(GatedIgnoreOpponentStatChangesAttr, foeEvaLteMinus2Gate)
      .attr(GatedSuppressAbilitiesAttr, foeEvaLteMinus2Gate), Moves.ROUND),
    yuMove(new SelfStatusMove(Moves.YU_RAIN_ROAR, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true), Moves.RAIN_DANCE),
    yuMove(new SelfStatusMove(Moves.YU_MIST_VEIL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, rainGate, 100), Moves.RAIN_DANCE),
    yuMove(new AttackMove(Moves.YU_CONCENTRATED_BREATH, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(FoeEvaDropCountPowerAttr, 15), Moves.SONIC_BOOM),
    yuMove(new AttackMove(Moves.YU_VISIBILITY_STRIP, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false), Moves.CRUSH_GRIP),
  );
}
export function registerYuDuelmonEntry67(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COLOSSAL_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 95, 90, 10, -1, 0, 9)
      .attr(PartyTypeCountPowerAttr, 10, 50), Moves.SUPERPOWER),
    yuMove(new AttackMove(Moves.YU_SOUL_BURST, Type.FIGHTING, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConsumeBoostsForPowerAttr, 15, 6), Moves.VACUUM_WAVE),
    yuMove(new AttackMove(Moves.YU_LAST_STAND, Type.FIGHTING, MoveCategory.PHYSICAL, 200, 95, 10, -1, 0, 9)
      .attr(SacrificialAttr), Moves.CROSS_CHOP),
    yuMove(new AttackMove(Moves.YU_COMRADES_FURY, Type.NORMAL, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, allyFaintedThisBattleGate, 1.4), Moves.SNORE),
    yuMove(new AttackMove(Moves.YU_SEISMIC_CHARGE, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.BULLDOZE),
    yuMove(new SelfStatusMove(Moves.YU_SOUL_BULWARK, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, faintedAlliesGte3Gate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_COLLECTIVE_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 1, 9)
      .attr(PartyTypeCountPowerAttr, +5, 50), Moves.MACH_PUNCH),
  );
}
export function registerYuDuelmonEntry68(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COPY_PIVOT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.CUT),
    yuMove(new AttackMove(Moves.YU_THRONE_LEECH, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedSuppressAbilitiesAttr, copiedAbilityGate)
      .attr(GatedHitHealAttr, 0.5, copiedAbilityGate), Moves.DREAM_EATER),
    yuMove(new AttackMove(Moves.YU_DOPPELGANGER_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, sameAbilityAsFoeGate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_MIRROR_LOOP, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(LowerHighestStatAttr, -1, sameAbilityAsFoeGate), Moves.DIZZY_PUNCH),
    yuMove(new AttackMove(Moves.YU_IDENTITY_SHATTER, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedSuppressAbilitiesAttr, sameAbilityAsFoeGate)
      .attr(GatedMovePowerMultiplierAttr, sameAbilityAsFoeGate, 1.3), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_DOPPELGANGER_STRIKE, Type.GHOST, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(ConditionalMultiHitAttr, MultiHitType._1, MultiHitType._2, sameAbilityAsFoeGate), Moves.SHADOW_PUNCH),
  );
}
export function registerYuDuelmonEntry69(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AQUA_RUSH, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_ANCIENT_GEYSER, Type.WATER, MoveCategory.SPECIAL, 130, 75, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.2)
      .attr(GatedRecoilNegateAttr, totalStagesGte4Gate), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_FROST_CARAPACE, Type.ICE, MoveCategory.SPECIAL, 85, 95, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, rainGate, 35), Moves.AURORA_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_RAIN_PRAYER, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(ExtendWeatherDurationAttr), Moves.RAIN_DANCE),
    yuMove(new SelfStatusMove(Moves.YU_RAIN_BLESSING, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, rainGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, rainGate, 100), Moves.SOAK),
    yuMove(new AttackMove(Moves.YU_RITUAL_STORM, Type.WATER, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.AQUA_RING, true, true, rainGate, 50), Moves.SCALD),
  );
}
export function registerYuDuelmonEntry70(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MAMMOTH_STOMP, Type.NORMAL, MoveCategory.PHYSICAL, 105, 85, 10, 30, 0, 9)
      .attr(FlinchAttr), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_SEISMIC_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 30, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_4), Moves.COMET_PUNCH),
    yuMove(new AttackMove(Moves.YU_QUAKE_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_TECTONIC_TRAP, Type.GROUND, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.SAND_TOMB), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_HORN, Type.ICE, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(FlinchAttr), Moves.ICE_PUNCH),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.4), Moves.PARABOLIC_CHARGE),
    yuMove(new AttackMove(Moves.YU_SHATTERING_STEP, Type.NORMAL, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false), Moves.DOUBLE_SLAP),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_DRIVE, Type.ICE, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeFlyingTypeGate, 1.2)
      .attr(RemoveFlyingTypeAttr, foeFlyingTypeGate), Moves.ICICLE_SPEAR),
  );
}
export function registerYuDuelmonEntry71(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SHELL_CRUSH, Type.STEEL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, defStagesGte2Gate, 100), Moves.STEEL_BEAM),
    yuMove(new AttackMove(Moves.YU_EMERALD_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, defStagesGte2Gate), Moves.ENERGY_BALL),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_WAVE, Type.ROCK, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, defStagesGte2Gate, 30), Moves.POWER_GEM),
    yuMove(new AttackMove(Moves.YU_TORTOISE_GRIP, Type.ROCK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.ANCIENT_POWER),
    yuMove(new AttackMove(Moves.YU_JADE_EDGE, Type.GRASS, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(HighCritAttr, 10)
      .attr(ConditionalHighCritAttr, movedLastGate, 30), Moves.LEAF_STORM),
    yuMove(new SelfStatusMove(Moves.YU_IRON_SURGE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(HealAttr, 0.25), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_WEIGHT_DROP, Type.GROUND, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(DefStageCountPowerAttr, 5, 30), Moves.EARTH_POWER),
    yuMove(new AttackMove(Moves.YU_EMERALD_COUNTER, Type.ROCK, MoveCategory.PHYSICAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_QUAKE, Type.GROUND, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, movedLastGate, 1.3), Moves.MUD_SHOT),
    yuMove(new AttackMove(Moves.YU_EMERALD_AEGIS, Type.STEEL, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalHitHealAttr, 0, 0.15, defStagesGte2Gate), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_PERMAFROST_SHELL, Type.ICE, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, notMovedThisTurnGate, 30), Moves.POWDER_SNOW),
  );
}
export function registerYuDuelmonEntry72(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RUBY_BURST, Type.FAIRY, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_CARBUNCLE_RADIANCE, Type.FAIRY, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, hasSubstituteGate, 100), Moves.DAZZLING_GLEAM),
    yuMove(new AttackMove(Moves.YU_MOONLIGHT_PIERCE, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_GEM_NEEDLE, Type.STEEL, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, hasSubstituteGate, 30), Moves.MIRROR_SHOT),
    yuMove(new AttackMove(Moves.YU_CRIMSON_RUSH, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.SPIRIT_BREAK),
    yuMove(new SelfStatusMove(Moves.YU_GEM_SHIELD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(GatedSubstituteAttr, 0.25, fullHpGate, 0.15), Moves.FLOWER_SHIELD),
    yuMove(new SelfStatusMove(Moves.YU_RUBY_RESONANCE, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, hasSubstituteGate, 100), Moves.AROMATIC_MIST),
    yuMove(new AttackMove(Moves.YU_CRIMSON_SURGE, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, hasSubstituteGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, subBrokenThisTurnGate, 100), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_MOONLIGHT_TRAP, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.THUNDER_CAGE),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_SHATTER, Type.STEEL, MoveCategory.SPECIAL, 95, 90, 10, -1, 0, 9)
      .attr(IgnoreTypeResistancesAttr, hasSubstituteGate), Moves.FLASH_CANNON),
  );
}
export function registerYuDuelmonEntry73(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DRAIN_CLAW, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below33HpGate), Moves.CRUNCH),
    yuMove(new AttackMove(Moves.YU_TOPAZ_RUSH, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(RecoilAttr, false, 0.15), Moves.SPARK),
    yuMove(new AttackMove(Moves.YU_ESCALATION_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5), Moves.FURY_ATTACK),
    yuMove(new AttackMove(Moves.YU_AMBER_POUNCE, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, below30HpGate), Moves.EARTHQUAKE),
    yuMove(new AttackMove(Moves.YU_TOPAZ_FLARE, Type.FIRE, MoveCategory.PHYSICAL, 95, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.FIRE_FANG),
    yuMove(new SelfStatusMove(Moves.YU_FERAL_ROAR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TAUNTED, 100, alwaysTrueGate), Moves.ROAR),
    yuMove(new SelfStatusMove(Moves.YU_TERMINAL_ACCELERATION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 2, true)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(SelfHpCostAttr, 0.2), Moves.HOWL),
  );
}
export function registerYuDuelmonEntry74(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_HEX_FLAME, Type.GHOST, MoveCategory.SPECIAL, 85, 95, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.5), Moves.HEX),
    yuMove(new AttackMove(Moves.YU_CURSE_PYRE, Type.FIRE, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.MAGMA_STORM)
      .attr(GatedMovePowerMultiplierAttr, cursedGate, 1.18), Moves.MAGMA_STORM),
    yuMove(new AttackMove(Moves.YU_FLAME_SPIRIT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 50, 0, 9)
      .attr(ChanceCurseAttr, 1)
      .attr(ConditionalConfuseAttr, 50, cursedGate), Moves.ENDEAVOR),
    yuMove(new AttackMove(Moves.YU_DUAL_BLAZE, Type.NORMAL, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(AnyTypeMultiplierAttr, Type.FIRE)
      .attr(AnyTypeMultiplierAttr, Type.GHOST), Moves.SONIC_BOOM),
    yuMove(new SelfStatusMove(Moves.YU_CURSED_BARRIER, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, anyFoeBurnedOrCursedGate, 100), Moves.WILL_O_WISP),
    yuMove(new AttackMove(Moves.YU_CONVERGENT_FLAME, Type.FIRE, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(TypeMorphAttr, Type.GHOST, burnedNotCursedGate)
      .attr(TypeMorphAttr, Type.FIRE, cursedNotBurnedGate)
      .attr(ForceSuperEffectiveAttr, burnedAndCursedGate), Moves.FLAMETHROWER),
  );
}
export function registerYuDuelmonEntry75(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WILDFIRE_BARRAGE, Type.FIRE, MoveCategory.SPECIAL, 30, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._1_TO_4), Moves.FIRE_BLAST),
    yuMove(new AttackMove(Moves.YU_SCORCHING_RUSH, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.INCINERATE),
    yuMove(new AttackMove(Moves.YU_ASH_STORM, Type.FIRE, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, burnedGate, 30), Moves.MAGMA_STORM),
    yuMove(new AttackMove(Moves.YU_CINDER_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.LAVA_PLUME),
    yuMove(new AttackMove(Moves.YU_MAGMA_QUAKE, Type.GROUND, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, terrainActiveGate, 30), Moves.EARTH_POWER),
    yuMove(new SelfStatusMove(Moves.YU_TERRAIN_IGNITION, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.SUNNY_DAY),
    yuMove(new SelfStatusMove(Moves.YU_PHOENIX_CYCLE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(RandomTerrainAttr)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true), Moves.WILL_O_WISP),
  );
}
export function registerYuDuelmonEntry76(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PURSUIT_PROTOCOL, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, switchedInThisTurnGate, 1.25), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SENSOR_BARRAGE, Type.STEEL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.TAIL_SLAP),
    yuMove(new SelfStatusMove(Moves.YU_HUNT_PROTOCOL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, switchedInThisTurnGate, 100), Moves.SWORDS_DANCE),
    yuMove(new SelfStatusMove(Moves.YU_ADAPTIVE_PLATING, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalSelfHealAttr, 0, 0.25, speedStageGte3Gate), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_SIGNAL_JAM, Type.ELECTRIC, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.WILD_CHARGE),
    yuMove(new AttackMove(Moves.YU_OVERCLOCK_BURST, Type.STEEL, MoveCategory.PHYSICAL, 120, 80, 10, -1, 0, 9)
      .attr(GatedAlwaysHitAttr, speedStageGte3Gate), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_SONIC_SCREECH, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeWeakToMoveGate, 50), Moves.THUNDER_FANG),
  );
}
export function registerYuDuelmonEntry77(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_REACTOR_LANCE, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 1, 9), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_SIPHON_ARRAY, Type.DARK, MoveCategory.PHYSICAL, 40, 90, 10, -1, 0, 9)
      .attr(TripleAccelMultiHitAttr)
      .attr(TripleAccelPerHitPowerAttr, [40, 65, 100])
      .attr(TripleAccelHitHealAttr, 0.4), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_AFTERBURN_STRIKE, Type.FIRE, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, multiHitLastTurnGate, 1.375), Moves.FIRE_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_TARGETING_CALIBRATION, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.ACC, 1, true), Moves.GEAR_UP),
    yuMove(new AttackMove(Moves.YU_EMERGENCY_BEAM, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHealAttr, 0.25, prevMoveMissedGate)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, prevMoveMissedGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, 1, true, prevMoveMissedGate, 100), Moves.HARD_PRESS),
  );
}
export function registerYuDuelmonEntry78(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WRECKING_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_SYSTEM_PURGE, Type.POISON, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, above75HpGate, 50), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_COMPONENT_HARVEST, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveOrStealHeldItemAttr, abilityProcGate), Moves.IRON_TAIL),
    yuMove(new SelfStatusMove(Moves.YU_HOLLOW_VICTORY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(FailIfHasTransferableItemsAttr)
      .attr(StatChangeAttr, BattleStat.ATK, 3, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.NASTY_PLOT),
  );
}
export function registerYuDuelmonEntry79(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BUSTER_PULSE, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, 20, 0, 9)
      .pulseMove()
      .attr(FlinchAttr), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_AURA_CANNON, Type.FIGHTING, MoveCategory.SPECIAL, 85, -1, 10, -1, 0, 9)
      .auraMove()
      .attr(IgnoreAccuracyAttr), Moves.FOCUS_BLAST),
    yuMove(new AttackMove(Moves.YU_CANNON_PULSE, Type.WATER, MoveCategory.SPECIAL, 80, 95, 10, 20, 0, 9)
      .pulseMove()
      .attr(ConfuseAttr), Moves.WATER_PULSE),
    yuMove(new AttackMove(Moves.YU_DRAGON_MK_II, Type.DRAGON, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .pulseMove(), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_VOLT_PULSE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 95, 10, 10, 0, 9)
      .pulseMove()
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS), Moves.THUNDERBOLT),
    yuMove(new AttackMove(Moves.YU_TERRAIN_MK_II, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .pulseMove()
      .attr(TerrainMatchTypeAttr), Moves.TERRAIN_PULSE),
    yuMove(new AttackMove(Moves.YU_PULSE_BARRAGE, Type.DARK, MoveCategory.SPECIAL, 30, 95, 10, -1, 0, 9)
      .pulseMove()
      .attr(MultiHitAttr, MultiHitType._3), Moves.BULLET_SEED),
    yuMove(new SelfStatusMove(Moves.YU_CANNON_FORTIFY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(HealAttr, 0.25), Moves.KINGS_SHIELD),
    yuMove(new AttackMove(Moves.YU_PSYCHO_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .pulseMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.PSYCHO_BOOST),
    yuMove(new AttackMove(Moves.YU_THERMAL_OVERLOAD, Type.FIRE, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .pulseMove()
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_LASER_NULL, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .pulseMove()
      .attr(SuppressAbilitiesAttr), Moves.SNARL),
  );
}
export function registerYuDuelmonEntry80(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FANG_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .bitingMove()
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_DIVE_BITE, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .bitingMove(), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_CHROME_CRUNCH, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .bitingMove()
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.MAGNET_BOMB),
    yuMove(new AttackMove(Moves.YU_THERMAL_FANG, Type.FIRE, MoveCategory.PHYSICAL, 85, 95, 10, 20, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.FIRE_FANG),
    yuMove(new SelfStatusMove(Moves.YU_CHROME_PLATING, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(HealAttr, 0.25), Moves.SHELTER),
    yuMove(new AttackMove(Moves.YU_SOVEREIGNS_DESCENT, Type.FLYING, MoveCategory.PHYSICAL, 110, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(TwoTurnMoveAttr, "FLY"), Moves.FLY),
    yuMove(new AttackMove(Moves.YU_ALTERNATING_FANG, Type.STEEL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .bitingMove()
      .attr(GatedMovePowerMultiplierAttr, lastMoveSlicingGate, 1.5), Moves.METEOR_MASH),
    yuMove(new AttackMove(Moves.YU_ALTERNATING_BLADE, Type.FLYING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(GatedMovePowerMultiplierAttr, lastMoveBitingGate, 1.5), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_THUNDER_MK_II, Type.ELECTRIC, MoveCategory.PHYSICAL, 85, 95, 10, 40, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS), Moves.THUNDER_FANG),
  );
}
export function registerYuDuelmonEntry81(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CORE_RUSH, Type.DRAGON, MoveCategory.PHYSICAL, 70, 100, 10, -1, 1, 9)
      .attr(RandomSelfFoeStatusAttr), Moves.DRAGON_RUSH),
    yuMove(new AttackMove(Moves.YU_TWIN_DRAIN, Type.DRAGON, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStatusedGate), Moves.CORE_ENFORCER),
    yuMove(new SelfStatusMove(Moves.YU_STATUS_EMBRACE, Type.POISON, -1, 10, 100, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true), Moves.POISON_GAS),
    yuMove(new SelfStatusMove(Moves.YU_TWIN_SYNCHRONIZE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalHealAttr, 0.25, userStatusedGate), Moves.SWORDS_DANCE),
    yuMove(new AttackMove(Moves.YU_AFFLICTION_MORPH, Type.DRAGON, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(UserStatusTypeOverrideAttr), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_WITHDRAWAL_SHOCK, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(GatedMultiHitAttr, MultiHitType._2, userNotStatusedGate)
      .attr(RandomSelfFoeStatusAttr, 100, userNotStatusedGate, true), Moves.COMEUPPANCE),
  );
}
export function registerYuDuelmonEntry82(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PORTAL_WHIP, Type.DRAGON, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true), Moves.DRAGON_CLAW),
    yuMove(new AttackMove(Moves.YU_PHASE_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9)
      .attr(GatedForceSwitchOutAttr, true, false, totalStagesGte3Gate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_PORTAL_LEECH, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedMovePowerMultiplierAttr, switchedInThisTurnGate, 1.3), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_DIMENSIONAL_BARRAGE, Type.GHOST, MoveCategory.SPECIAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5)
      .attr(IgnoreTypeResistancesAttr, totalStagesGte4Gate), Moves.ASTRAL_BARRAGE),
    yuMove(new AttackMove(Moves.YU_PORTAL_PIVOT, Type.FLYING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.AERIAL_ACE),
    yuMove(new SelfStatusMove(Moves.YU_DIMENSIONAL_SURGE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, switchedInThisTurnGate, 100), Moves.HOWL),
    yuMove(new AttackMove(Moves.YU_DIMENSIONAL_EXILE, Type.GHOST, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(IncomingStatChangeAttr, "SPD", -1), Moves.HEX),
    yuMove(new SelfStatusMove(Moves.YU_RIFT_COLLAPSE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(FailUnlessTotalStagesGte3Attr)
      .attr(ConsumeBoostsForHazardAttr, totalStagesGte3Gate), Moves.STEALTH_ROCK),
  );
}
export function registerYuDuelmonEntry83(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PARALLEL_BLADE, Type.PSYCHIC, MoveCategory.PHYSICAL, 95, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeAtkSwappedGate), Moves.PSYCHO_CUT),
    yuMove(new AttackMove(Moves.YU_INVERTED_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(UseLowerDefenseStatAttr), Moves.DARKEST_LARIAT),
    yuMove(new AttackMove(Moves.YU_MIRROR_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeAtkLtSpAtkGate, 1.3), Moves.X_SCISSOR),
    yuMove(new AttackMove(Moves.YU_DIMENSIONAL_LOCK, Type.PSYCHIC, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.ZEN_HEADBUTT),
    yuMove(new AttackMove(Moves.YU_REALITY_PIVOT, Type.FLYING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.BRAVE_BIRD),
    yuMove(new SelfStatusMove(Moves.YU_PARALLEL_FORTIFY, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StealHighestOffenseStageAttr, foeAtkSwappedGate), Moves.COSMIC_POWER),
    yuMove(new AttackMove(Moves.YU_E083_MIRROR_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(UseFoeHighestStatOffenseAttr), Moves.SPIN_OUT),
    yuMove(new AttackMove(Moves.YU_PARALLEL_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeNotSwappedGate, 1.5), Moves.DOUBLE_KICK),
  );
}
export function registerYuDuelmonEntry84(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOID_CUTTER, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .slicingMove()
      .attr(MultiHitAttr, MultiHitType._2_TO_5), Moves.FURY_SWIPES),
    yuMove(new AttackMove(Moves.YU_DIMENSION_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .slicingMove(), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_RIFT_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .slicingMove()
      .attr(HitHealAttr, 0.4)
      .attr(IgnoreTypeResistancesAttr), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_HAZARD_RIFT, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .slicingMove()
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.STEALTH_ROCK),
    yuMove(new SelfStatusMove(Moves.YU_DIMENSIONAL_WARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ClearPositiveStatsAttr), Moves.DEFENSE_CURL),
    yuMove(new AttackMove(Moves.YU_JUDGMENT_SLASH, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .slicingMove()
      .attr(GatedForceSwitchOutAttr, false, true, foeBelow50HpGate), Moves.ASSURANCE),
    yuMove(new AttackMove(Moves.YU_FINAL_EXILE, Type.DARK, MoveCategory.PHYSICAL, 130, 75, 10, -1, 0, 9)
      .slicingMove()
      .attr(ForceSwitchOutAttr, false, true)
      .attr(RecoilAttr, false, 0.33), Moves.TAKE_DOWN),
    yuMove(new AttackMove(Moves.YU_VOID_EDGE, Type.ICE, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .slicingMove()
      .attr(StatusEffectAttr, StatusEffect.FREEZE), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_DIMENSIONAL_COUNTER, Type.DARK, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .slicingMove()
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2), Moves.METAL_BURST),
  );
}
export function registerYuDuelmonEntry85(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COTTON_CANNON, Type.GRASS, MoveCategory.SPECIAL, 95, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, hasSubstituteGate, 1.3), Moves.PETAL_BLIZZARD),
    yuMove(new AttackMove(Moves.YU_SEED_STORM, Type.GRASS, MoveCategory.SPECIAL, 85, 95, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, hasSubstituteGate, 30), Moves.SEED_FLARE),
    yuMove(new AttackMove(Moves.YU_LIONS_CHARGE, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, hasSubstituteGate, 1), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_POLLEN_RUSH, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 1, 9)
      .attr(ConditionalStatusEffectAttr, StatusEffect.SLEEP, hasSubstituteGate, 30), Moves.DRAINING_KISS),
    yuMove(new AttackMove(Moves.YU_COTTON_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 30, hasSubstituteGate), Moves.MAGICAL_LEAF),
    yuMove(new AttackMove(Moves.YU_FLUFFY_IMPACT, Type.GRASS, MoveCategory.SPECIAL, 140, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.5)
      .attr(BreakSubstituteAttr, true, hasSubstituteGate)
      .attr(GatedRecoilNegateAttr, hasSubstituteGate), Moves.LEAF_STORM),
    yuMove(new AttackMove(Moves.YU_THORNED_COTTON, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(FailUnlessHasSubstituteAttr)
      .attr(BreakSubstituteAttr, true)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.APPLE_ACID),
    yuMove(new AttackMove(Moves.YU_WILT_BLOOM, Type.GRASS, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, below30HpWithSubGate, 2), Moves.CHLOROBLAST),
    yuMove(new AttackMove(Moves.YU_THORN_VOLLEY, Type.POISON, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, hasSubstituteGate, 50), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_POLLEN_CLOUD, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(ConditionalStatusEffectAttr, StatusEffect.SLEEP, hasSubstituteGate, 35), Moves.FLEUR_CANNON),
  );
}
export function registerYuDuelmonEntry86(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WILD_SWING, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(RandomCategoryHigherOffenseAttr), Moves.DYNAMIC_PUNCH),
    yuMove(new AttackMove(Moves.YU_BIGFOOT_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, speedStageGte3Gate, 1.5), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_DISCARD_FLURRY, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(PostHitRandomStatUpDownAttr), Moves.DOUBLE_SLAP),
    yuMove(new AttackMove(Moves.YU_FERAL_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, netStatTotalLteMinus2Gate), Moves.PARABOLIC_CHARGE),
    yuMove(new SelfStatusMove(Moves.YU_DANGER_ZONE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(RandomStatUpDownAttr, 2), Moves.TAUNT),
    yuMove(new SelfStatusMove(Moves.YU_RISKY_STOCKPILE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(RandomStatUpDownAttr, 1)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.STOCKPILE),
    yuMove(new AttackMove(Moves.YU_RISK_ASSESSMENT, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(UseHighestStatOffenseAttr), Moves.PSYCHO_CUT),
    yuMove(new SelfStatusMove(Moves.YU_REROLL, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetStatsAttr, true)
      .attr(RandomStatUpDownAttr, 3), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_DANGER_INSTINCT, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, statAtMinus2Gate, 1)
      .attr(GatedMovePowerMultiplierAttr, statAtMinus2Gate, 1.3), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_LUCKY_CHARM, Type.FAIRY, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, netStatTotalGte3Gate), Moves.PLAY_ROUGH),
  );
}
export function registerYuDuelmonEntry87(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ERADICATION_BOLT, Type.ELECTRIC, MoveCategory.SPECIAL, 90, 90, 10, 20, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalHighCritAttr, paralyzedGate, 50), Moves.THUNDERBOLT),
    yuMove(new AttackMove(Moves.YU_ERADICATOR_SIP, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedMovePowerMultiplierAttr, statusedGate, 1.3)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate)
      .attr(GatedTargetStatusCureAttr, statusedGate), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_ANTI_MAGIC_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeUsedSpecialLastTurnGate, 1.5), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_DOMAIN_RUSH, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, statusedGate), Moves.SUCKER_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_WARLOCKS_FORTRESS, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(HealAttr, 0.25), Moves.SHIFT_GEAR),
    yuMove(new AttackMove(Moves.YU_SPELL_CORRUPTION, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedCurseAttr, foeUsedSpecialThisTurnGate, 1), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_ARCANE_ABSORPTION, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHealAttr, 0.125, foeUsedStatusThisTurnGate), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_SILENCE_SLASH, Type.STEEL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedDisableMoveAttr, statusedGate), Moves.PSYCHO_CUT),
    yuMove(new AttackMove(Moves.YU_CORRUPTED_MIASMA, Type.POISON, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, statusedGate), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_ERADICATION_WAVE, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, statusedGate, 30), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_MANA_BURN, Type.PSYCHIC, MoveCategory.SPECIAL, 150, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.5), Moves.EXPANDING_FORCE),
  );
}
export function registerYuDuelmonEntry88(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ILLUSION_RUSH, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepOrConfusedGate, 1.5), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_MIND_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeVolatileStateGate), Moves.PSYCHIC),
    yuMove(new SelfStatusMove(Moves.YU_ILLUSIONISTS_VEIL, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, foeVolatileStateGate, 100), Moves.TAUNT),
    yuMove(new StatusMove(Moves.YU_ENTHRALL, Type.PSYCHIC, 80, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.INFATUATED)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.ENCORE),
    yuMove(new AttackMove(Moves.YU_NEURAL_SHOCK, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, confusedGate, 50)
      .attr(ConditionalConfuseAttr, 50, paralyzedGate), Moves.THUNDER_SHOCK),
    yuMove(new AttackMove(Moves.YU_ENTRANCING_PIVOT, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(AllyStatChangeAttr, BattleStat.SPATK, 1, statusedGate), Moves.BITTER_MALICE),
  );
}
export function registerYuDuelmonEntry89(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DARK_SORCERY, Type.DARK, MoveCategory.SPECIAL, 95, 90, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(GatedMovePowerMultiplierAttr, hasSubstituteGate, 1.3), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_SHADOW_VOLLEY, Type.GHOST, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, hasSubstituteGate, 30), Moves.NIGHT_SHADE),
    yuMove(new AttackMove(Moves.YU_ARCANE_RUSH, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .darkMagicMove()
      .attr(ConditionalConfuseAttr, 30, hasSubstituteGate), Moves.PSYCHIC),
    yuMove(new AttackMove(Moves.YU_SPELL_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.EERIE_SPELL),
    yuMove(new AttackMove(Moves.YU_DARK_CURTAIN, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(FreeSubstituteAttr, 30, noSubstituteGate), Moves.NIGHT_DAZE),
    yuMove(new SelfStatusMove(Moves.YU_DARK_RESONANCE, Type.DARK, -1, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, hasSubstituteGate, 100), Moves.DARK_VOID),
    yuMove(new AttackMove(Moves.YU_FORBIDDEN_RITUAL, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(FailUnlessHasSubstituteAttr)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_DARK_CATALYST, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(WeaknessTypeOverrideAttr, hasSubstituteGate), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_SORCERERS_GAMBIT, Type.DARK, MoveCategory.SPECIAL, 130, 70, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(BreakSubstituteAttr, true, hasSubstituteGate)
      .attr(GatedIgnoreAccuracyAttr, hasSubstituteGate), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_LIQUID_ILLUSION, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 30, hasSubstituteGate), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_PHANTOM_PIVOT, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(ForceSwitchOutAttr, true, false)
      .attr(RetainSubstituteForAllyAttr, hasSubstituteGate), Moves.PHANTOM_FORCE),
  );
}
export function registerYuDuelmonEntry90(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ARCANE_BARRAGE, Type.NORMAL, MoveCategory.SPECIAL, 25, 95, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.ROUND),
    yuMove(new AttackMove(Moves.YU_ARTS_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 1, 9)
      .darkMagicMove()
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_DARK_SNARE, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(GatedMovePowerMultiplierAttr, alreadyTrappedGate, 1.5), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_ARCANE_COVERAGE, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalConfuseAttr, 30, alreadyTrappedGate), Moves.SPIT_UP),
    yuMove(new AttackMove(Moves.YU_SPELL_SHACKLE, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(GatedDisableMoveAttr, alreadyTrappedGate), Moves.FIERY_WRATH),
    yuMove(new SelfStatusMove(Moves.YU_ARCANE_WARD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeWrappedAnyGate, 100), Moves.COSMIC_POWER),
    yuMove(new AttackMove(Moves.YU_ADAPTIVE_HEX, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, alreadyTrappedGate, 30), Moves.TECHNO_BLAST),
    yuMove(new AttackMove(Moves.YU_DARK_IMPLOSION, Type.DARK, MoveCategory.SPECIAL, 110, 80, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(GatedIgnoreAccuracyAttr, alreadyTrappedGate), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_VENOMOUS_BINDING, Type.POISON, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(StatusEffectAttr, StatusEffect.POISON), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_SHADOW_LEECH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate), Moves.LASH_OUT),
  );
}
export function registerYuDuelmonEntry91(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FAIRY_BARRAGE, Type.FAIRY, MoveCategory.SPECIAL, 25, 95, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_GRIMOIRE_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, darkMagicMoveGate2), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_ENCHANTED_SIPHON, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(HitHealAttr, 0.33)
      .attr(StealHighestStatStageAttr, fairyFaintedGate2), Moves.LIGHT_OF_RUIN),
    yuMove(new AttackMove(Moves.YU_LEGACY_BURST, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(PartyDarkMagicPercentPowerAttr, 0.1)
      .attr(PostKoHealAttr, 0.25), Moves.FIERY_WRATH),
    yuMove(new SelfStatusMove(Moves.YU_HEIRS_RESOLVE, Type.FAIRY, -1, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, allyFaintedGate, 100), Moves.CHARM),
    yuMove(new SelfStatusMove(Moves.YU_ANCESTRAL_SHIELD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(HealAttr, 0.25)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, darkMagicMoveGate2, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_BLOODLINE_SURGE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(PartyDarkMagicCountBpAttr, 15), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_SACRIFICES_REWARD, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(HitHealAttr, 0.33)
      .attr(GatedIncrementMovePriorityAttr, allyFaintedLastTurnGate, 1)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, allyFaintedLastTurnGate), Moves.MISTY_EXPLOSION),
    yuMove(new AttackMove(Moves.YU_GRIMOIRE_OVERLOAD, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 85, 10,30, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, darkMagicMoveGate2, 30), Moves.EXTRASENSORY),
    yuMove(new AttackMove(Moves.YU_INHERITED_THUNDER, Type.ELECTRIC, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .darkMagicMove()
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, darkMagicMoveGate2, 50), Moves.THUNDERBOLT),
    yuMove(new AttackMove(Moves.YU_TEARFALL_TORRENT, Type.WATER, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(ConditionalHitHealAttr, 0.33, 0.5, fairyFaintedGate1), Moves.SURF),
    yuMove(new SelfStatusMove(Moves.YU_MOURNING_VEIL, Type.FAIRY, -1, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, allyFaintedGate, 100), Moves.MOONLIGHT),
    yuMove(new AttackMove(Moves.YU_REFORGED_SPELL, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .darkMagicMove()
      .attr(StealHighestStatStageAttr, "SPATK"), Moves.FUTURE_SIGHT),
  );
}
export function registerYuDuelmonEntry92(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CURSED_GRASP, Type.GHOST, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, cursedGate)
      .attr(SwitchHealBlockAttr, cursedGate), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_HORROR_RUSH, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, cursedGate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SOUL_REND, Type.GHOST, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(WeakToFoePrimaryTypeAttr)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, cursedGate), Moves.DREAM_EATER),
    yuMove(new AttackMove(Moves.YU_WEAKNESS_BAIT, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, -1, 1, 9)
      .attr(WeakToFoePrimaryTypeAttr), Moves.UPROAR),
    yuMove(new AttackMove(Moves.YU_CURSE_LINK, Type.GHOST, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(ChanceCurseAttr, 100)
      .attr(UserHpCostAttr, 0.25), Moves.HEX),
    yuMove(new SelfStatusMove(Moves.YU_HAUNTED_SHELL, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, foeCursedGate, 100), Moves.DEFENSE_CURL),
    yuMove(new AttackMove(Moves.YU_WITHERING_TOUCH, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(LowerHighestStatAttr, -1, cursedGate), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_DREAD_REVERSAL, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedMovePowerMultiplierAttr, foeUsedNonSeThisTurnGate, 1.3), Moves.DARK_PULSE),
    yuMove(new AttackMove(Moves.YU_CREEPING_CURSE, Type.GRASS, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 100, cursedGate), Moves.ENERGY_BALL),
    yuMove(new AttackMove(Moves.YU_CURSE_PULSE, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ChanceCurseAttr, 30)
      .attr(GatedMovePowerMultiplierAttr, cursedGate, 1.3), Moves.WATER_PULSE),
    yuMove(new AttackMove(Moves.YU_SPITE_SHACKLE, Type.STEEL, MoveCategory.SPECIAL, 95, 85, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, foeHitUserSeThisTurnGate, 100), Moves.MIRROR_SHOT),
  );
}
export function registerYuDuelmonEntry93(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PALADINS_EDGE, Type.FIGHTING, MoveCategory.SPECIAL, 95, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeUsedStatusLastTurnGate), Moves.FOCUS_BLAST),
    yuMove(new AttackMove(Moves.YU_SPELL_REAVER, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, userStagesGte3Gate, 30), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_HOLY_RUSH, Type.FIGHTING, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, foeUsedStatusLastTurnGate, 1.3), Moves.VACUUM_WAVE),
    yuMove(new AttackMove(Moves.YU_ARCANE_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeUsedStatusThisTurnGate), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_JUDGMENT_CLEAVE, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedRemoveHeldItemAttr, foeUsedStatusLastTurnGate), Moves.FIERY_WRATH),
    yuMove(new SelfStatusMove(Moves.YU_SPELL_BARRIER, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userStagesGte2Gate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_MAGE_SLAYER, Type.FIGHTING, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(TypeBoostVsDarkPsychicAttr)
      .attr(GatedSuppressAbilitiesAttr, foeUsedStatusRecentGate), Moves.AURA_SPHERE),
    yuMove(new AttackMove(Moves.YU_PURIFYING_BLADE, Type.FIGHTING, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.FINAL_GAMBIT),
    yuMove(new AttackMove(Moves.YU_FUSION_ONSLAUGHT, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(UseHigherOffenseStatAttr)
      .attr(UseLowerDefenseStatAttr, foeUsedStatusThisTurnGate), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_DRACONIC_VERDICT, Type.DRAGON, MoveCategory.SPECIAL, 100, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeUsedSpecialLastTurnGate), Moves.DRAGON_ENERGY),
    yuMove(new AttackMove(Moves.YU_SPELL_SIPHON, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr, "SPATK"), Moves.EERIE_SPELL),
    yuMove(new AttackMove(Moves.YU_ANTI_MAGIC_SLAM, Type.DARK, MoveCategory.SPECIAL, 95, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeUsedSpecialLastTurnGate), Moves.SNARL),
  );
}
export function registerYuDuelmonEntry94(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SONIC_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_DISSONANT_WAIL, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeAsleepGate), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_TOLL, Type.GHOST, MoveCategory.SPECIAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepGate, 1.5), Moves.HEX),
    yuMove(new AttackMove(Moves.YU_CHIME_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 1, 9)
      .attr(FlinchAttr), Moves.SUCKER_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_DISSONANT_SHIELD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(ConditionalHealAttr, 0.25, foeAsleepOrConfusedGate), Moves.SUPERSONIC),
    yuMove(new AttackMove(Moves.YU_SUBSONIC_PULSE, Type.GHOST, MoveCategory.SPECIAL, 50, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(ConditionalStatusEffectAttr, StatusEffect.SLEEP, confusedGate, 50), Moves.WATER_PULSE),
    yuMove(new AttackMove(Moves.YU_FEEDBACK_LOOP, Type.DARK, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(ChanceMultiHitAttr, MultiHitType._2, 50)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepOrConfusedGate, 1.3), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_ENCHANTING_TOLL, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, confusedGate, 50), Moves.NATURES_MADNESS),
    yuMove(new AttackMove(Moves.YU_DARK_PRESSURE, Type.FLYING, MoveCategory.SPECIAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAsleepOrConfusedGate), Moves.HURRICANE),
    yuMove(new AttackMove(Moves.YU_DEEP_FREQUENCY, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepGate, 1.5)
      .attr(NoWakeOnHitAttr, foeAsleepGate), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_SONIC_DRAIN, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAsleepOrConfusedGate), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_HARMONIC_PIVOT, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "SPATK", 1, foeAsleepOrConfusedGate), Moves.FIERY_WRATH),
  );
}
export function registerYuDuelmonEntry95(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_LUNAR_SLASH, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, nightBiomeGate), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_MISCHIEF_BOLT, Type.ELECTRIC, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, nightBiomeGate, 50), Moves.BOLT_BEAK),
    yuMove(new AttackMove(Moves.YU_MOON_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, nightBiomeGate, 100), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_SHADOW_POUNCE, Type.GHOST, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, nightBiomeGate), Moves.SHADOW_SNEAK),
    yuMove(new SelfStatusMove(Moves.YU_LUNAR_VEIL, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(FailUnlessNightBiomeAttr)
      .attr(AddArenaTagAttr, ArenaTagType.AURORA_VEIL, null, false, true), Moves.AROMATIC_MIST),
    yuMove(new SelfStatusMove(Moves.YU_MOONPHASE_SHIFT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(SetBiomeNightAttr, nightBiomeGate), Moves.REFLECT),
    yuMove(new AttackMove(Moves.YU_ECLIPSE_DASH, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(GatedIncrementMovePriorityAttr, nightBiomeGate, 1), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_TIDAL_MISCHIEF, Type.WATER, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(TypeOverrideAttr, Type.FAIRY, nightBiomeGate), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_STARFALL_TRAP, Type.FAIRY, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(DelayedTrapAttr, nightBiomeGate), Moves.MAGICAL_TORQUE),
    yuMove(new AttackMove(Moves.YU_FROST_MOON, Type.ICE, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, nightBiomeGate, 35), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_BURROW_RUSH, Type.GROUND, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, nightBiomeGate, 1), Moves.HEADLONG_RUSH),
    yuMove(new AttackMove(Moves.YU_CRESCENT_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, nightBiomeGate), Moves.ASSURANCE),
  );
}
export function registerYuDuelmonEntry96(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SOUL_TAX, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, foeBelow50HpGate, 1.3), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_DEATH_DECREE, Type.GHOST, MoveCategory.SPECIAL, 95, 90, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(IgnoreTypeResistancesAttr, foeBelow50HpGate), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_UNDERWORLD_CHAINS, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, alreadyTrappedGate, 30), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_OPPRESSIVE_WAVE, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeBelow50HpGate, 50), Moves.HEAT_WAVE),
    yuMove(new AttackMove(Moves.YU_HELLFIRE_DECREE, Type.FIRE, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, burnedGate, 100), Moves.BLAST_BURN),
    yuMove(new AttackMove(Moves.YU_STYGIAN_TORRENT, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeBelow50HpGate, 50), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_TOXIC_DECREE, Type.POISON, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, foeBelow50HpGate, 50), Moves.SLUDGE_BOMB),
    yuMove(new AttackMove(Moves.YU_TAX_HARVEST, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeBelow50HpGate), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_OPPRESSIVE_PIVOT, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "SPATK", 1, foeBelow50HpGate), Moves.SNARL),
  );
}
export function registerYuDuelmonEntry97(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_WARP_RUSH, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_TIMELINE_SIP, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeUsedSpecialLastTurnGate), Moves.FREEZING_GLARE),
    yuMove(new AttackMove(Moves.YU_CHRONO_PULSE, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, foeUsedSpecialLastTurnGate, 50), Moves.THUNDERBOLT),
    yuMove(new SelfStatusMove(Moves.YU_TEMPORAL_SHIELD, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(LowerDefSpDefBoostAttr)
      .attr(HealAttr, 0.25), Moves.KINGS_SHIELD),
    yuMove(new AttackMove(Moves.YU_CAUSAL_INVERSION, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeWouldResistGate, 1.5)
      .attr(IgnoreTypeResistancesAttr, foeWouldResistGate), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_FATE_WEAVE, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(RandomStatChangeAttr, -1, 30)
      .attr(ConditionalRandomStatChangeAttr, -1, 30, 50, foeUsedSpecialLastTurnGate), Moves.SPARKLY_SWIRL),
    yuMove(new AttackMove(Moves.YU_ENCHANTED_RECURSION, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, usedLastTurnGate, 1.5)
      .attr(GatedIgnoreAccuracyAttr, usedLastTurnGate), Moves.DAZZLING_GLEAM),
  );
}
export function registerYuDuelmonEntry98(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BRIAR_LASH, Type.GRASS, MoveCategory.PHYSICAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, alreadyTrappedGate, 50), Moves.SNAP_TRAP),
    yuMove(new AttackMove(Moves.YU_UNDERWORLD_BIND, Type.GRASS, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 100, alreadyTrappedGate), Moves.BRANCH_POKE),
    yuMove(new AttackMove(Moves.YU_UNDERGROWTH_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, alreadyTrappedGate, 50), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_TOXIC_SPORE, Type.POISON, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, alreadyTrappedGate, 100), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_THORN_SHIELD, Type.GRASS, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL, 1.5)
      .attr(ConditionalCounterDamageAttr, (m: Move) => m.category === MoveCategory.PHYSICAL, 1.5, trappedGate, 3), Moves.BULLET_SEED),
    yuMove(new StatusMove(Moves.YU_CREEPING_UNDERGROWTH, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, alreadyTrappedGate, 100)
      .target(MoveTarget.ENEMY_SIDE), Moves.LEECH_SEED),
    yuMove(new AttackMove(Moves.YU_PARASITIC_ROOT, Type.GRASS, MoveCategory.PHYSICAL, 75, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 100, foeBelow50HpGate), Moves.POWER_WHIP),
    yuMove(new AttackMove(Moves.YU_DECOMPOSITION, Type.POISON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatChangeAttr, [BattleStat.DEF,BattleStat.SPDEF], -1, false, trappedAndSeededGate, 100), Moves.BARB_BARRAGE),
    yuMove(new AttackMove(Moves.YU_THICKET_SURGE, Type.GRASS, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalHealAttr, 0.25, sunGate), Moves.WOOD_HAMMER),
  );
}
export function registerYuDuelmonEntry99(allMoves: Move[]): void {
  allMoves.push(

    yuMove(new AttackMove(Moves.YU_SHADOW_PYRE, Type.DARK, MoveCategory.SPECIAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, moveIsSeGate, 50), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_FLAME_RUSH, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, moveIsSeGate, 100), Moves.FLAME_CHARGE),
    yuMove(new AttackMove(Moves.YU_DARKFIRE_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5)
      .attr(GatedMovePowerMultiplierAttr, moveIsSeGate, 1.25), Moves.POPULATION_BOMB),
    yuMove(new AttackMove(Moves.YU_SHADOWFIRE_DRAIN, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, moveIsSeGate), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_CURSED_CLAW, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 100, foeGhostTypeGate), Moves.FALSE_SURRENDER),
    yuMove(new SelfStatusMove(Moves.YU_ASHEN_WARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, moveIsSeGate, 100), Moves.EMBARGO),
    yuMove(new AttackMove(Moves.YU_SHADOW_EMBER, Type.DARK, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ChipDamageAttr, 0.125, moveIsSeGate), Moves.EMBER),
    yuMove(new AttackMove(Moves.YU_DARKFIRE_CASCADE, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, moveIsSeNotDoubleGate, 1.25)
      .attr(GatedMovePowerMultiplierAttr, doubleSeGate, 1.5), Moves.FIRE_BLAST),
    yuMove(new AttackMove(Moves.YU_ECLIPSE_FLARE, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, sunGate, 1.3), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_MOLTEN_DIVE, Type.GROUND, MoveCategory.PHYSICAL, 95, 85, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, lastMoveFireGate, 50), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_SHADOW_FORGE, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, lastMoveDarkGate, 50), Moves.STEEL_ROLLER),
    yuMove(new AttackMove(Moves.YU_MAGMA_ERUPTION, Type.GROUND, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, burnedGate, 100), Moves.EARTH_POWER),
    yuMove(new AttackMove(Moves.YU_TECTONIC_CRASH, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "ATK", 1, moveIsSeGate), Moves.BULLDOZE),
  );
}
export function registerYuDuelmonEntry100(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_UNDEAD_RAMPAGE, Type.GHOST, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.2)
      .attr(IgnoreTypeResistancesAttr, foeBelow50HpGate), Moves.TAKE_DOWN),
    yuMove(new AttackMove(Moves.YU_GRAVE_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 95, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeBelow50HpGate, 50), Moves.EARTHQUAKE),
    yuMove(new AttackMove(Moves.YU_ZOMBIE_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_CORPSE_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeBelow50HpGate), Moves.CRUNCH),
    yuMove(new AttackMove(Moves.YU_DECAY_SLAM, Type.POISON, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, foeBelow50HpGate, 50), Moves.POISON_FANG),
    yuMove(new AttackMove(Moves.YU_SACRIFICIAL_BLOW, Type.FIGHTING, MoveCategory.PHYSICAL, 150, 80, 10, -1, 0, 9)
      .attr(SacrificialAttr)
      .attr(TriggerReviveAttr), Moves.FLYING_PRESS),
    yuMove(new AttackMove(Moves.YU_HORROR_CHARGE, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userRevivedGate, 1.5), Moves.FEINT_ATTACK),
    yuMove(new SelfStatusMove(Moves.YU_COLOSSUS_WILL, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(GatedEndureAttr, below25HpGate), Moves.BULK_UP),
    yuMove(new SelfStatusMove(Moves.YU_GRAVE_SHIELD, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, foeBelow50HpGate, 100), Moves.CURSE),
    yuMove(new AttackMove(Moves.YU_CARRION_SWARM, Type.GHOST, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2), Moves.LAST_RESPECTS),
    yuMove(new SelfStatusMove(Moves.YU_DECOMPOSE, Type.POISON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, true)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(StatChangeAttr, BattleStat.SPD, 2, true), Moves.TOXIC),
    yuMove(new AttackMove(Moves.YU_TOMBSTONE_HURL, Type.ROCK, MoveCategory.PHYSICAL, 95, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_BURIAL_AVALANCHE, Type.ROCK, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeBelow50HpGate), Moves.DIAMOND_STORM),
  );
}
export function registerYuDuelmonEntry101(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_IRON_BASTION, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userDefBoostGate, 50), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_GRINDING_IMPACT, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeSpdLoweredGate, 50), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_COUNTER_BASTION, Type.FIGHTING, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2), Moves.COUNTER),
    yuMove(new AttackMove(Moves.YU_ATTRITION_SLAM, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.HEAVY_SLAM),
    yuMove(new AttackMove(Moves.YU_KINETIC_SHIELD, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConsecutiveUsePowerAttr, 15), Moves.FOCUS_PUNCH),
    yuMove(new AttackMove(Moves.YU_IRONCLAD_SWEEP, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, above75HpGate), Moves.STEEL_WING),
  );
}
export function registerYuDuelmonEntry102(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PLASMA_DRAIN, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStagesGte2Gate), Moves.DARK_PULSE),
    yuMove(new AttackMove(Moves.YU_DOMAIN_SIPHON, Type.GHOST, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(StealHighestStatStageAttr), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_EQUALIZER, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, foeBstHigherGate, 1.3), Moves.HAMMER_ARM),
    yuMove(new AttackMove(Moves.YU_CRYO_NULLIFICATION, Type.ICE, MoveCategory.SPECIAL, 90, 90, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, moveIsSeGate, 35), Moves.BLIZZARD),
  );
}
export function registerYuDuelmonEntry103(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_HUNTERS_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, foeDragonTypeGate, 1.5), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_SEARING_BLADE, Type.FIRE, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 100, foeDragonBurnedGate), Moves.BITTER_BLADE),
    yuMove(new AttackMove(Moves.YU_SLAYER_DRAIN, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeDragonTypeGate), Moves.SUNSTEEL_STRIKE),
    yuMove(new AttackMove(Moves.YU_ANNIHILATION_EDGE, Type.STEEL, MoveCategory.PHYSICAL, 130, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(IgnoreTypeResistancesAttr, foeDragonTypeGate), Moves.TAKE_DOWN),
    yuMove(new SelfStatusMove(Moves.YU_SLAYERS_OATH, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeTeamHasDragonGate, 100), Moves.BULK_UP),
    yuMove(new AttackMove(Moves.YU_WYRM_HUNTER, Type.ICE, MoveCategory.PHYSICAL, 90, 85, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeDragonTypeGate, 50), Moves.ICE_PUNCH),
    yuMove(new AttackMove(Moves.YU_SCALE_BREAKER, Type.STEEL, MoveCategory.PHYSICAL, 85, 90, 10,30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDragonTypeGate, 100), Moves.DOUBLE_IRON_BASH),
    yuMove(new AttackMove(Moves.YU_VENOMOUS_EDGE, Type.POISON, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, foeDragonTypeGate, 50), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_WYRM_STRIKE, Type.FLYING, MoveCategory.PHYSICAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeDragonTypeGate), Moves.BRAVE_BIRD),
    yuMove(new SelfStatusMove(Moves.YU_HUNTERS_PREPARATION, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalHighCritAttr, foeTeamHasDragonGate, 100), Moves.SWORDS_DANCE),
  );
}
export function registerYuDuelmonEntry104(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PURIFYING_BEAM, Type.DRAGON, MoveCategory.SPECIAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, moveIsSeGate), Moves.FICKLE_BEAM),
    yuMove(new AttackMove(Moves.YU_LUMINOUS_RUSH, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAtkNegativeGate), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_CLEANSING_BEAM, Type.FAIRY, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(RemoveNegativeStatAttr, BattleStat.ATK, foeAtkNegativeGate), Moves.SPRINGTIDE_STORM),
    yuMove(new SelfStatusMove(Moves.YU_SPIRIT_VEIL, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(HealAttr, 0.25), Moves.CHARM),
    yuMove(new AttackMove(Moves.YU_ETHEREAL_RETURN, Type.FLYING, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false), Moves.HURRICANE),
    yuMove(new AttackMove(Moves.YU_SACRED_LANCE, Type.DRAGON, MoveCategory.PHYSICAL, 95, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalFlinchAttr, 35, moveIsSeGate), Moves.OUTRAGE),
    yuMove(new AttackMove(Moves.YU_THUNDER_PURGE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAtkNegativeGate), Moves.THUNDERBOLT),
  );
}
export function registerYuDuelmonEntry105(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PLAGUE_EXHALE, Type.POISON, MoveCategory.PHYSICAL, 95, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedMovePowerMultiplierAttr, foePoisonedGate, 1.3), Moves.MORTAL_SPIN),
    yuMove(new AttackMove(Moves.YU_ROT_BREATH, Type.DRAGON, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, moveIsSeGate, 50), Moves.DUAL_CHOP),
    yuMove(new AttackMove(Moves.YU_CONTAGION_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foePoisonedGate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_TOXIC_DRAIN, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foePoisonedGate), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_DECAY_WAVE, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foePoisonedGate, 50), Moves.THOUSAND_WAVES),
    yuMove(new AttackMove(Moves.YU_PLAGUED_PIVOT, Type.FLYING, MoveCategory.PHYSICAL, 70, 95, 10, 50, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, below70HpGate, 50), Moves.BRAVE_BIRD),
    yuMove(new SelfStatusMove(Moves.YU_ZOMBIE_RESILIENCE, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, below70HpGate, 100), Moves.CLANGOROUS_SOUL),
    yuMove(new StatusMove(Moves.YU_PLAGUE_WARD, Type.POISON, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foePoisonedGate, 100)
      .target(MoveTarget.ENEMY_SIDE), Moves.POISON_GAS),
    yuMove(new AttackMove(Moves.YU_CORPSE_GAS, Type.POISON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foePoisonedGate, 100), Moves.POISON_FANG),
    yuMove(new AttackMove(Moves.YU_VIRULENT_CLAW, Type.DRAGON, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foePoisonedGate), Moves.DRAGON_CLAW),
    yuMove(new AttackMove(Moves.YU_FUNGAL_BURST, Type.GRASS, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.SEEDED, false, true, foePoisonedGate, 50), Moves.LEAF_BLADE),
    yuMove(new AttackMove(Moves.YU_FEVER_FLARE, Type.FIRE, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foePoisonedGate, 50), Moves.FLARE_BLITZ),
  );
}
export function registerYuDuelmonEntry106(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SPIKE_RUSH, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, foeGroundRockTypeGate, 2), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_CORE_DRILL, Type.STEEL, MoveCategory.PHYSICAL, 110, 80, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeGroundRockTypeGate, 30)
      .attr(GatedMovePowerMultiplierAttr, foeGroundRockTypeGate, 2), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_EXCAVATION_DRAIN, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeGroundRockTypeGate), Moves.GIGATON_HAMMER),
    yuMove(new AttackMove(Moves.YU_SHRAPNEL_BURST, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeGroundRockTypeGate, 30), Moves.EXPLOSION),
    yuMove(new AttackMove(Moves.YU_TECTONIC_IMPACT, Type.GROUND, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(FlinchAttr)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.EARTHQUAKE),
    yuMove(new SelfStatusMove(Moves.YU_TITANIUM_SHELL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeTeamHasGroundRockGate, 100), Moves.AUTOTOMIZE),
    yuMove(new AttackMove(Moves.YU_GEODE_SHATTER, Type.ROCK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, foeRockTypeGate, 50), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_MINING_STRIKE, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(GatedRemoveHeldItemAttr, foeHasItemGate)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, foeHasItemGate, 100), Moves.SMART_STRIKE),
    yuMove(new AttackMove(Moves.YU_SPINNING_UPPERCUT, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9), Moves.SKY_UPPERCUT),
  );
}
export function registerYuDuelmonEntry107(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SOLAR_TORRENT, Type.WATER, MoveCategory.SPECIAL, 95, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, rainGate, 1.3)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, sunGate, 30), Moves.MUDDY_WATER),
    yuMove(new AttackMove(Moves.YU_FLAME_DELUGE, Type.FIRE, MoveCategory.SPECIAL, 95, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, sunGate, 1.3)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, rainGate, 50), Moves.FLAME_BURST),
    yuMove(new AttackMove(Moves.YU_CLIMATE_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, weatherActiveGate), Moves.EXTREME_SPEED),
    yuMove(new AttackMove(Moves.YU_WEATHER_DRAIN, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, weatherActiveGate), Moves.WEATHER_BALL),
    yuMove(new SelfStatusMove(Moves.YU_CLIMATE_SHIFT, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ClimateShiftToggleAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, weatherActiveGate, 100), Moves.POWER_SHIFT),
    yuMove(new SelfStatusMove(Moves.YU_SUNLIT_FORGE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, sunGate, 100), Moves.WILL_O_WISP),
    yuMove(new SelfStatusMove(Moves.YU_TIDAL_VEIL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalHealAttr, 0.25, rainGate), Moves.WATER_SPORT),
    yuMove(new AttackMove(Moves.YU_EVAPORATION, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(AddArenaTagChanceAttr, ArenaTagType.LIGHT_SCREEN, 5, 30, false, true)
      .attr(ConditionalAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, sunGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_CONDENSATION, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(AddArenaTagChanceAttr, ArenaTagType.REFLECT, 5, 30, false, true)
      .attr(ConditionalAddArenaTagAttr, ArenaTagType.REFLECT, 5, rainGate, 100, false, true), Moves.FIRE_BLAST),
    yuMove(new AttackMove(Moves.YU_SCORCHING_RAIN, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, rainGate, 50), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_FREEZING_SUN, Type.FIRE, MoveCategory.SPECIAL, 90, 90, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, sunGate, 35), Moves.HEAT_WAVE),
    yuMove(new AttackMove(Moves.YU_PRISMATIC_BURST, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(RandomStatChangeAttr, -1, 30)
      .attr(ConditionalRandomStatChangeAttr, -1, 30, 50, weatherActiveGate, 2), Moves.STRANGE_STEAM),
  );
}
export function registerYuDuelmonEntry108(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_EARTHBOUND_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(GatedMovePowerMultiplierAttr, rainGate, 1.3), Moves.SLAM),
    yuMove(new AttackMove(Moves.YU_CURSED_RUSH, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, rainGate, 1.3), Moves.AQUA_JET),
    yuMove(new SelfStatusMove(Moves.YU_ANCIENT_BULWARK, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, rainGate, 100), Moves.SPIKES),
    yuMove(new SelfStatusMove(Moves.YU_IMMORTALS_DECREE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TAUNTED, 100, burnedGate), Moves.TAUNT),
    yuMove(new AttackMove(Moves.YU_BOILING_ERUPTION, Type.WATER, MoveCategory.SPECIAL, 110, 80, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, rainGate, 50), Moves.STEAM_ERUPTION),
    yuMove(new AttackMove(Moves.YU_EARTHEN_PRISON, Type.GROUND, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, rainGate, 50), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_PRIMORDIAL_WRATH, Type.GROUND, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(IgnoreImmunitiesAttr, burnedGate), Moves.EARTH_POWER),
    yuMove(new AttackMove(Moves.YU_SCALDING_MUD, Type.GROUND, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, rainGate, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, rainGate, 30), Moves.MUD_SHOT),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_MAELSTROM, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, rainGate), Moves.CONFUSION),
  );
}
export function registerYuDuelmonEntry109(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ABSORBING_TOUCH, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, above75HpGate), Moves.CROSS_POISON),
    yuMove(new AttackMove(Moves.YU_SLIME_BREAKER, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, above75HpGate, 50), Moves.GLITZY_GLOW),
    yuMove(new SelfStatusMove(Moves.YU_AMORPHOUS_SHELL, Type.POISON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 2, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false, above75HpGate, 100), Moves.ACID_ARMOR),
    yuMove(new AttackMove(Moves.YU_ENGULF, Type.POISON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, above75HpGate), Moves.DIRE_CLAW),
    yuMove(new AttackMove(Moves.YU_CORROSIVE_OVERFLOW, Type.POISON, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, above75HpGate, 50), Moves.ACID_SPRAY),
    yuMove(new AttackMove(Moves.YU_ASSIMILATE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(RandomStatBoostAttr, 1, 100, aquaRingGate), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_OOZE_REFLECTION, Type.POISON, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false, above75HpGate, 50), Moves.METAL_BURST),
  );
}
export function registerYuDuelmonEntry110(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GOLDEN_EDGE, Type.NORMAL, MoveCategory.PHYSICAL, 95, 90, 10, 10, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, critThisMoveGate), Moves.DOUBLE_EDGE),
    yuMove(new AttackMove(Moves.YU_BLADE_FLURRY, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_DRAINING_BLADE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, critThisMoveGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_EXECUTION_SLASH, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalHighCritAttr, foeBelow33HpGate, 100), Moves.SHADOW_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_BLADE_HONING, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalHighCritAttr, userStagesGte2Gate, 100), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_THOUSAND_CUTS, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(SecondHitCritIfFirstCritAttr, 50), Moves.FALSE_SWIPE),
    yuMove(new AttackMove(Moves.YU_RUIN_EDGE, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(FlinchAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, critThisMoveGate, 100), Moves.CEASELESS_EDGE),
    yuMove(new AttackMove(Moves.YU_PARRYING_COUNTER, Type.STEEL, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.CRIT_BOOST, 100, below50HpGate)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_CRIMSON_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, critThisMoveGate), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_PERFECT_CUT, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(IgnoreAccuracyAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, critThisMoveGate, 50), Moves.GYRO_BALL),
    yuMove(new AttackMove(Moves.YU_GLACIAL_THRUST, Type.ICE, MoveCategory.PHYSICAL, 95, 85, 10, 10, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, critThisMoveGate, 35), Moves.GLACIAL_LANCE),
    yuMove(new AttackMove(Moves.YU_DIAMOND_SLASH, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(CritSnapshotAttr)
      .attr(FlinchAttr)
      .attr(ConditionalRandomStatChangeAttr, -1, 50, 100, critThisMoveGate, 2), Moves.ICICLE_SPEAR),
  );
}
export function registerYuDuelmonEntry111(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_THERMAL_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.HEAT_WAVE),
    yuMove(new AttackMove(Moves.YU_ERUPTION_CLAW, Type.FIRE, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalTrapAttr, BattlerTagType.FIRE_SPIN, 50, burnedGate), Moves.FIRE_SPIN),
    yuMove(new AttackMove(Moves.YU_MAGMA_SURGE, Type.GROUND, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, burnedGate, 50), Moves.MUD_BOMB),
    yuMove(new SelfStatusMove(Moves.YU_FLAME_VEIL, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalHealAttr, 0.25, below50HpGate), Moves.BURNING_BULWARK),
    yuMove(new AttackMove(Moves.YU_BOILING_RAIN, Type.WATER, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.3), Moves.SCALD),
    yuMove(new AttackMove(Moves.YU_FLASH_IGNITION, Type.FIRE, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.FIRE_FANG),
    yuMove(new AttackMove(Moves.YU_DYING_STAR, Type.FIRE, MoveCategory.SPECIAL, 150, 70, 10, 30, 0, 9)
      .attr(SacrificialAttr)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(IgnoreTypeResistancesAttr, burnedGate), Moves.BLUE_FLARE),
    yuMove(new AttackMove(Moves.YU_NOVA_FLARE, Type.DRAGON, MoveCategory.SPECIAL, 95, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.3), Moves.DRAGON_RAGE),
    yuMove(new AttackMove(Moves.YU_THERMAL_HALLUCINATION, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, burnedGate), Moves.CONFUSION),
  );
}
export function registerYuDuelmonEntry112(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CLAY_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.COMET_PUNCH),
    yuMove(new AttackMove(Moves.YU_EARTHEN_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalHighCritAttr, foeSpdStageLteMinus2Gate, 100), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_GRANITE_RUSH, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, foeSpdStageLteMinus2Gate), Moves.ACCELEROCK),
    yuMove(new AttackMove(Moves.YU_SINKHOLE, Type.GROUND, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 50, foeSpdStageLteMinus3Gate), Moves.EARTHQUAKE),
    yuMove(new AttackMove(Moves.YU_GEOLOGICAL_PRESSURE, Type.GROUND, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(GatedConsecutiveUsePowerAttr, 20, consecutiveUseGate), Moves.BULLDOZE),
    yuMove(new AttackMove(Moves.YU_EROSION_WAVE, Type.GROUND, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeSpdStageLteMinus3Gate, 50), Moves.THOUSAND_WAVES),
  );
}
export function registerYuDuelmonEntry113(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_JUSTICE_FLARE, Type.FIRE, MoveCategory.SPECIAL, 95, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, burnedGate, 30), Moves.FUSION_FLARE),
    yuMove(new AttackMove(Moves.YU_WING_SLASH, Type.FLYING, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.WING_ATTACK),
    yuMove(new AttackMove(Moves.YU_VERDICT_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_VERDICT, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, burnedGate, 50), Moves.BUZZY_BUZZ),
    yuMove(new SelfStatusMove(Moves.YU_PHOENIX_GUARD, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, anyFoeBurnedGate, 100, false, true), Moves.REFLECT),
    yuMove(new AttackMove(Moves.YU_JUDGMENT_CHAIN, Type.FIRE, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalMultiHitAttr, MultiHitType._1, MultiHitType._2, burnedGate), Moves.BURNING_JEALOUSY),
    yuMove(new AttackMove(Moves.YU_SPONTANEOUS_COMBUSTION, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, 50, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.WRING_OUT),
  );
}
export function registerYuDuelmonEntry114(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MARTYRDOM_RUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, below25HpGate, 1.5), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SACRIFICE_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.3), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_LAST_RITES, Type.DARK, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(LowerHighestStatAttr, -1)
      .attr(LowerHighestStatAttr, -2, below50HpGate), Moves.FLING),
    yuMove(new AttackMove(Moves.YU_HAUNTING_BLOW, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(UserFaintCurseAttr), Moves.SHADOW_CLAW),
    yuMove(new AttackMove(Moves.YU_DESPERATE_STRUGGLE, Type.FIGHTING, MoveCategory.PHYSICAL, 60, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, below25HpGate, 2), Moves.HIGH_JUMP_KICK),
    yuMove(new StatusMove(Moves.YU_MEMENTO_FADE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(SacrificialAttrOnHit)
      .attr(StatChangeAttr, BattleStat.ATK, -2, false)
      .attr(StatChangeAttr, BattleStat.SPATK, -2, false), Moves.MEMENTO),
    yuMove(new AttackMove(Moves.YU_BURIAL_IMPACT, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.3), Moves.BONEMERANG),
    yuMove(new AttackMove(Moves.YU_NECROTIC_SLASH, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, below25HpGate, 50), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_CORRUPTED_BLESSING, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.LICK),
    yuMove(new SelfStatusMove(Moves.YU_GRAVE_PREPARATION, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(HealAttr, 0.25)
      .attr(ConditionalSelfHealAttr, 0, 0.5, below50HpGate), Moves.STEALTH_ROCK),
  );
}
export function registerYuDuelmonEntry115(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COSMIC_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 95, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, statusedGate), Moves.FLAIL),
    yuMove(new AttackMove(Moves.YU_STAR_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, statusedGate), Moves.FEINT),
    yuMove(new AttackMove(Moves.YU_STELLAR_COVERAGE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(MatchUserTypeAttr), Moves.FRUSTRATION),
    yuMove(new SelfStatusMove(Moves.YU_STELLAR_REGENERATION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(RandomStatBoostAttr, 1, 100, statusedGate), Moves.ACUPRESSURE),
    yuMove(new AttackMove(Moves.YU_SINGULARITY, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, sameTypeGate, 2)
      .attr(IgnoreTypeResistancesAttr, sameTypeGate), Moves.HYPERSPACE_FURY),
    yuMove(new AttackMove(Moves.YU_GALACTIC_FIST, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, sameTypeGate), Moves.MACH_PUNCH),
  );
}
export function registerYuDuelmonEntry116(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STELLAR_RAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 30, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.3), Moves.HYPERSPACE_HOLE),
    yuMove(new AttackMove(Moves.YU_SUPERNOVA_RUSH, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, below50HpGate, 1.3), Moves.INCINERATE),
    yuMove(new AttackMove(Moves.YU_DIMENSION_SHIFT, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(SuperEffectiveTypeMorphAttr, below50HpGate), Moves.LUMINA_CRASH),
    yuMove(new AttackMove(Moves.YU_EVENT_HORIZON, Type.DARK, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 100, below25HpGate)
      .attr(HealBlockAttr, below25HpGate), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_TIDAL_AWAKENING, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, below50HpAndStagesGte2Gate, 50), Moves.BOUNCY_BUBBLE),
    yuMove(new AttackMove(Moves.YU_COSMIC_OVERGROWTH, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.FRENZY_PLANT),
    yuMove(new AttackMove(Moves.YU_PLANETARY_IMPACT, Type.GRASS, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, below25HpGate, 1.5), Moves.BULLET_SEED),
  );
}
export function registerYuDuelmonEntry117(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SPARK_RUSH, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.DISCHARGE),
    yuMove(new AttackMove(Moves.YU_THUNDER_DRAIN, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStagesGte2Gate), Moves.ECHOED_VOICE),
    yuMove(new AttackMove(Moves.YU_STATIC_WAVE, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatChangeAttr, [BattleStat.ACC,BattleStat.ATK,BattleStat.DEF], 1, true, paralyzedGate, 50), Moves.SHOCK_WAVE),
    yuMove(new AttackMove(Moves.YU_MAGNETIC_GRAPPLE, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.THUNDER_CAGE)
      .attr(ConditionalTrapAttr, BattlerTagType.THUNDER_CAGE, 50, paralyzedGate), Moves.THUNDER_CAGE),
    yuMove(new AttackMove(Moves.YU_CRYO_BOLT, Type.ICE, MoveCategory.SPECIAL, 90, 90, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, paralyzedGate, 35), Moves.ICE_BEAM),
  );
}
export function registerYuDuelmonEntry118(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GALE_RUSH, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, tailwindActiveGate), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_JET_STRIKE, Type.FLYING, MoveCategory.PHYSICAL, 70, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, false), Moves.BRAVE_BIRD),
    yuMove(new AttackMove(Moves.YU_RISING_UPPERCUT, Type.FIGHTING, MoveCategory.PHYSICAL, 95, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, foeAirborneGate, 2), Moves.SKY_UPPERCUT),
    yuMove(new SelfStatusMove(Moves.YU_CYCLONE_FORGE, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true, tailwindActiveGate), Moves.BULK_UP),
    yuMove(new AttackMove(Moves.YU_VORTEX_TRAP, Type.FLYING, MoveCategory.PHYSICAL, 80, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, tailwindActiveGate), Moves.ACROBATICS),
    yuMove(new AttackMove(Moves.YU_DOWNDRAFT_SLAM, Type.FLYING, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, tailwindActiveGate, 30), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_AERIAL_SUPERIORITY, Type.FLYING, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userMovedFirstGate, 1.3), Moves.BRAVE_BIRD),
    yuMove(new AttackMove(Moves.YU_WINDSHEAR_COUNTER, Type.FLYING, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(ConditionalCounterDamageAttr, (m: Move) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2, tailwindActiveGate, 2.25)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.METAL_BURST),
  );
}
export function registerYuDuelmonEntry119(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BLIND_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(FixedChanceSelfConfuseAttr, 30)
      .attr(ConditionalFlinchAttr, 35, userConfusedGate), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_RAGE_SPIKE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(FixedChanceSelfConfuseAttr, 30)
      .attr(ConditionalFlinchAttr, 35, userConfusedGate), Moves.RAGE),
    yuMove(new AttackMove(Moves.YU_CONFUSION_SPREAD, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 50, 0, 9)
      .attr(FixedChanceSelfConfuseAttr, 30)
      .attr(ConfuseAttr)
      .attr(ConfuseOnHitAttr, 100, userConfusedGate), Moves.JAW_LOCK),
    yuMove(new SelfStatusMove(Moves.YU_RAGING_WINDS, Type.FLYING, -1, 10, 100, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConfuseAttr, true), Moves.HOWL),
  );
}
export function registerYuDuelmonEntry120(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SHADOW_ROOT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, ingrainGate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_PARASITIC_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, seededGate), Moves.MATCHA_GOTCHA),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_POLLEN, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(GatedMovePowerMultiplierAttr, foeAsleepGate, 1.5), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_CORRUPTED_GROUND, Type.POISON, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, seededGate, 50), Moves.BELCH),
    yuMove(new StatusMove(Moves.YU_ROOT_NETWORK, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(TriggerIngrainAttr, seededGate), Moves.LEECH_SEED),
    yuMove(new SelfStatusMove(Moves.YU_VINE_SHIELD, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalHealAttr, 0.25, ingrainGate), Moves.SPIKY_SHIELD),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_ROOT, Type.DARK, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedMovePowerMultiplierAttr, seededAndAsleepGate, 2), Moves.RUINATION),
    yuMove(new AttackMove(Moves.YU_SPORE_CLOUD, Type.GRASS, MoveCategory.SPECIAL, 65, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, ingrainGate), Moves.ENERGY_BALL),
    yuMove(new SelfStatusMove(Moves.YU_DARK_PHOTOSYNTHESIS, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(TriggerIngrainAttr, anyFoeSeededGate), Moves.HONE_CLAWS),
    yuMove(new AttackMove(Moves.YU_CORRUPTED_CANOPY, Type.GRASS, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, sunGate, 50), Moves.PETAL_DANCE),
    yuMove(new AttackMove(Moves.YU_SOPORIFIC_WAVE, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(ConditionalStatusEffectAttr, StatusEffect.SLEEP, seededGate, 50), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_NIGHT_GARDEN, Type.GRASS, MoveCategory.SPECIAL, 150, 70, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, ingrainGate)
      .attr(GatedAlwaysHitAttr, ingrainGate), Moves.LEAF_STORM),
    yuMove(new AttackMove(Moves.YU_STEEL_THORN, Type.STEEL, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, seededGate)
      .attr(TriggerIngrainAttr, seededGate), Moves.METAL_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_IRON_CANOPY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(TriggerIngrainAttr, anyFoeSeededGate), Moves.IRON_DEFENSE),
  );
}
export function registerYuDuelmonEntry121(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VENGEANCE_RUSH, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, partyFainted2Gate, 1.3), Moves.ASSURANCE),
    yuMove(new AttackMove(Moves.YU_BLIGHT_WAVE, Type.POISON, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, partyFainted2Gate, 50), Moves.SLUDGE_WAVE),
    yuMove(new AttackMove(Moves.YU_SHADOW_WAIL, Type.GHOST, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, partyFainted2Gate), Moves.NIGHT_SHADE),
    yuMove(new SelfStatusMove(Moves.YU_DARK_EMPOWERMENT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true, partyFainted2Gate), Moves.NASTY_PLOT),
    yuMove(new SelfStatusMove(Moves.YU_CORRUPTED_SHELL, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(HealAttr, 0.25)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true, partyFainted2Gate), Moves.FAKE_TEARS),
    yuMove(new AttackMove(Moves.YU_MARTYRS_FURY, Type.DARK, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, allyFaintedLastTurnGate, 1)
      .attr(GatedMovePowerMultiplierAttr, partyFainted3Gate, 1.3), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_REQUIEM, Type.GHOST, MoveCategory.SPECIAL, 90, 85, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(IgnoreTypeResistancesAttr, lastPartyMonGate), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_NECRO_HARVEST_SALAMANDRA, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(PostVictoryRandomStatBoostAttr, 1, 2, onKoGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_SORROW_DELUGE, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, partyFainted2Gate, 50), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_VENGEFUL_TOMB, Type.ROCK, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(PostVictoryHealAttr, 0.25, onKoGate), Moves.ROCK_TOMB),
  );
}
export function registerYuDuelmonEntry122(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_UNBOUND_SIP, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, at1HpGate), Moves.INFERNAL_PARADE),
    yuMove(new AttackMove(Moves.YU_FORBIDDEN_CLAW, Type.DARK, MoveCategory.SPECIAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, at1HpGate), Moves.SHADOW_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_FORBIDDEN_AWAKENING, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true, (u, t, m) => !at1HpGate(u, t, m))
      .attr(StatChangeAttr, BattleStat.SPATK, 3, true, at1HpGate), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_ABSOLUTE_ZERO, Type.ICE, MoveCategory.SPECIAL, 100, 85, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, at1HpGate, 35), Moves.POWDER_SNOW),
  );
}
export function registerYuDuelmonEntry123(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOID_VOLLEY, Type.DARK, MoveCategory.PHYSICAL, 25, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_5), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_NECRO_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.FOUL_PLAY),
    yuMove(new SelfStatusMove(Moves.YU_REALITY_CORRUPTION, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STICKY_WEB, below50HpGate), Moves.STEALTH_ROCK),
    yuMove(new AttackMove(Moves.YU_CHAOTIC_REFLECTION, Type.GHOST, MoveCategory.SPECIAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5)
      .attr(ConfuseOnReflectedHitAttr, 30, below50HpGate)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_SEISMIC_VOID, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, below50HpGate, 50), Moves.BULLDOZE),
  );
}
export function registerYuDuelmonEntry124(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CHAIN_TAP, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_INFINITY_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 40, 100, 10, -1, 1, 9), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_COSMIC_TAP, Type.PSYCHIC, MoveCategory.SPECIAL, 50, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeBelow50HpGate, 50), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_BINDING_SPARK, Type.ELECTRIC, MoveCategory.SPECIAL, 55, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, trappedGate, 50), Moves.DISCHARGE),
    yuMove(new AttackMove(Moves.YU_ETERNAL_CHAIN, Type.GHOST, MoveCategory.PHYSICAL, 50, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, trappedGate), Moves.POLTERGEIST),
  );
}
export function registerYuDuelmonEntry125(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FORBIDDEN_FIST, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, consecutiveUseGate), Moves.DYNAMIC_PUNCH),
    yuMove(new AttackMove(Moves.YU_CHAIN_LIGHTNING, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, consecutiveUseGate, 50), Moves.VOLT_SWITCH),
    yuMove(new SelfStatusMove(Moves.YU_FORBIDDEN_ACCUMULATION, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(PreserveConsecutiveChainAttr), Moves.TAUNT),
  );
}
export function registerYuDuelmonEntry126(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TUNDRA_REND, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .bitingMove()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, snowGate), Moves.FALSE_SURRENDER),
    yuMove(new AttackMove(Moves.YU_GLACIAL_SNAP, Type.ICE, MoveCategory.PHYSICAL, 55, 100, 10, 10, 0, 9)
      .bitingMove()
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, snowGate, 35), Moves.GLACIAL_LANCE),
    yuMove(new AttackMove(Moves.YU_BLIZZARD_AMBUSH, Type.ICE, MoveCategory.PHYSICAL, 70, 100, 10, -1, 1, 9)
      .bitingMove()
      .attr(ResetWeatherFromStartAttr, "SNOW", 30), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_FROZEN_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, snowGate, 50), Moves.EARTHQUAKE),
    yuMove(new SelfStatusMove(Moves.YU_RAGNAROK_HOWL, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(StatChangeAttr, BattleStat.ATK, 1, true), Moves.SWORDS_DANCE),
    yuMove(new AttackMove(Moves.YU_APEX_PREDATOR, Type.ICE, MoveCategory.PHYSICAL, 110, 85, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(GatedMovePowerMultiplierAttr, frozenGate, 1.2)
      .attr(ResetWeatherFromStartAttr, "SNOW", 100, frozenGate), Moves.ICICLE_SPEAR),
    yuMove(new AttackMove(Moves.YU_SHATTER_JAW, Type.ICE, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .bitingMove()
      .attr(ConditionalHighCritAttr, frozenGate, 100), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_PHANTOM_PURSUIT, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(PursuitSwitchMultiplierAttr, 1.5), Moves.PHANTOM_FORCE),
    yuMove(new AttackMove(Moves.YU_GLACIAL_LOCKJAW, Type.ICE, MoveCategory.PHYSICAL, 95, 90, 10, 30, 0, 9)
      .bitingMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, snowGate, 35), Moves.AVALANCHE),
  );
}
export function registerYuDuelmonEntry127(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MOONLIGHT_STAB, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, nightBiomeGate), Moves.KOWTOW_CLEAVE),
    yuMove(new AttackMove(Moves.YU_UMBRAL_VENOM, Type.POISON, MoveCategory.PHYSICAL, 75, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, nightBiomeGate, 50), Moves.GUNK_SHOT),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_POUNCE, Type.DARK, MoveCategory.PHYSICAL, 90, 85, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, nightBiomeGate, 50), Moves.SUCKER_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_NOCTURNAL_MENDING, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, nightBiomeGate), Moves.AFTER_YOU),
    yuMove(new AttackMove(Moves.YU_PREEMPTIVE_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, nightBiomeGate, 1.3), Moves.JUMP_KICK),
    yuMove(new AttackMove(Moves.YU_NIGHT_TERROR, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -2, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, nightBiomeGate, 50), Moves.LASH_OUT),
    yuMove(new AttackMove(Moves.YU_LETHAL_PATIENCE, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(ConsecutiveUsePowerAttr, 1.2), Moves.PAYBACK),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_VERDICT, Type.DARK, MoveCategory.PHYSICAL, 110, 80, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeBelow30HpGate, 1.5), Moves.WICKED_BLOW),
  );
}
export function registerYuDuelmonEntry128(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ABYSSAL_SURGE, Type.WATER, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeWhirlpoolGate, 50), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_CRUSHING_COIL, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(GatedMovePowerMultiplierAttr, foeWhirlpoolGate, 1.3), Moves.FURY_ATTACK),
    yuMove(new AttackMove(Moves.YU_INK_CLOUD, Type.DARK, MoveCategory.SPECIAL, 65, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, foeWhirlpoolGate, 30), Moves.FIERY_WRATH),
    yuMove(new AttackMove(Moves.YU_TIDAL_EMBRACE, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalHighCritAttr, foeWhirlpoolGate, 30), Moves.CLAMP),
    yuMove(new AttackMove(Moves.YU_STRANGLING_TIDE, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(ConditionalFlinchAttr, 35, foeWhirlpoolGate), Moves.FURY_SWIPES),
    yuMove(new AttackMove(Moves.YU_CONSUMING_VORTEX, Type.WATER, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeWhirlpoolGate), Moves.BRINE),
  );
}
export function registerYuDuelmonEntry129(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DEMONS_EDGE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(CritSnapshotAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, critThisMoveGate, 100)
      .attr(RandomStatDropAttr, 1, 100, critThisMoveGate), Moves.DOUBLE_EDGE),
    yuMove(new AttackMove(Moves.YU_RAZOR_TEMPEST, Type.NORMAL, MoveCategory.PHYSICAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(SecondHitCritIfFirstCritAttr, 50), Moves.GUILLOTINE),
    yuMove(new AttackMove(Moves.YU_MALICE_SPIKE, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 1, 9)
      .attr(FlinchAttr), Moves.FEINT),
    yuMove(new AttackMove(Moves.YU_BLOODTHIRST_EDGE, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(CritSnapshotAttr)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, critThisMoveGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_PHANTOM_RIPOSTE, Type.GHOST, MoveCategory.PHYSICAL, 80, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalHighCritAttr, foeMovedFirstGate, 50), Moves.PHANTOM_FORCE),
    yuMove(new AttackMove(Moves.YU_SOUL_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 95, 85, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(CritSnapshotAttr)
      .attr(CritTriggeredLowerHighestStatAttr, -2, critThisMoveGate), Moves.NIGHT_SLASH),
  );
}
export function registerYuDuelmonEntry130(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TECTONIC_HEADBUTT, Type.ROCK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeNotRockTypeGate), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_AMBER_PRISON, Type.ROCK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeNotRockTypeGate), Moves.HEAD_SMASH),
    yuMove(new AttackMove(Moves.YU_ANCIENT_JUDGMENT, Type.NORMAL, MoveCategory.PHYSICAL, 110, 80, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, foeNotRockTypeGate, 1.3), Moves.HEADBUTT),
  );
}
export function registerYuDuelmonEntry131(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MARROW_SPIKE, Type.GROUND, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, foeDefBelowAtkGate, 50), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_RELIC_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, foeDefBelowAtkGate, 1.3), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_FOSSIL_DRAIN, Type.GROUND, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeDefBelowAtkGate), Moves.EARTH_POWER),
    yuMove(new AttackMove(Moves.YU_ANATOMICAL_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 95, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(ConditionalHighCritAttr, foeDefBelowAtkGate, 50), Moves.KARATE_CHOP),
    yuMove(new AttackMove(Moves.YU_KINGS_GAMBIT, Type.FIGHTING, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(IgnoreTypeResistancesAttr, foeDefBelowAtkGate), Moves.LOW_SWEEP),
  );
}
export function registerYuDuelmonEntry132(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PYROGLACIAL_STREAM, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConvertBurnToFreezeAttr, 30, burnedGate), Moves.WEATHER_BALL),
    yuMove(new AttackMove(Moves.YU_CONTRADICTION_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConvertFreezeToBurnAttr, 50, frozenGate), Moves.ORIGIN_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_THERMAL_EQUILIBRIUM, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, burnedGate, 100), Moves.ASSIST),
    yuMove(new AttackMove(Moves.YU_FROST_JET, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, 10, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConvertBurnToFreezeAttr, 30, burnedGate), Moves.INCINERATE),
    yuMove(new AttackMove(Moves.YU_SCORCHING_BLIZZARD, Type.ICE, MoveCategory.SPECIAL, 100, 80, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.3), Moves.BLIZZARD),
    yuMove(new AttackMove(Moves.YU_ENTROPY_BREATH, Type.NORMAL, MoveCategory.SPECIAL, 95, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(IgnoreTypeResistancesAttr, burnedGate), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_BURNING_GLACIER, Type.ICE, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatChangeAttr, [BattleStat.DEF, BattleStat.SPDEF], -1, false, burnedGate, 30), Moves.FREEZE_DRY),
  );
}
export function registerYuDuelmonEntry133(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_BLIZZARD_SHELL, Type.ICE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(ConditionalHealAttr, 0.25, snowGate), Moves.CHILLY_RECEPTION),
    yuMove(new AttackMove(Moves.YU_EROSION_SPIKE, Type.ROCK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, snowGate, 50), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_ARCTIC_TRAP, Type.ICE, MoveCategory.PHYSICAL, 60, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, snowGate), Moves.FREEZE_SHOCK),
    yuMove(new SelfStatusMove(Moves.YU_GLACIAL_ROAR, Type.ICE, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, snowGate, 100), Moves.AURORA_VEIL),
    yuMove(new AttackMove(Moves.YU_GLACIAL_MOMENTUM, Type.ICE, MoveCategory.PHYSICAL, 80, 90, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, snowGate, 1.3), Moves.ICE_SHARD),
  );
}
export function registerYuDuelmonEntry134(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SACRED_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 70, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ChangeFoePrimaryTypeAttr, "DARK", 50, foeNotDarkTypeGate), Moves.UPPER_HAND),
    yuMove(new AttackMove(Moves.YU_RADIANT_STRIKE, Type.FAIRY, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeDarkTypeGate, 50), Moves.PLAY_ROUGH),
    yuMove(new SelfStatusMove(Moves.YU_VALOR_SHIELD, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, foeDarkTypeGate, 100)
      .attr(ChangeFoePrimaryTypeAttr, "DARK", 50, foeNotDarkTypeGate), Moves.BULK_UP),
    yuMove(new AttackMove(Moves.YU_JUSTICE_PURSUIT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(PursuitSwitchMultiplierAttr, 1.5)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDarkTypeGate, 30), Moves.PURSUIT),
    yuMove(new AttackMove(Moves.YU_EXPANDED_VERDICT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeDarkTypeGate), Moves.HOLD_BACK),
  );
}
export function registerYuDuelmonEntry135(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SPIRAL_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeDefNegativeGate, 50), Moves.RAPID_SPIN),
    yuMove(new AttackMove(Moves.YU_SPIRAL_PIERCE, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.HORN_DRILL),
    yuMove(new SelfStatusMove(Moves.YU_SPIRAL_GUARD, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, foeDefNegativeGate, 100, false, true), Moves.QUICK_GUARD),
    yuMove(new AttackMove(Moves.YU_DEEPENING_SPIRAL, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, foeDefNegativeGate, 1.3), Moves.HYPER_DRILL),
    yuMove(new AttackMove(Moves.YU_PENETRATING_ROAR, Type.DRAGON, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeDefNegativeGate, 50), Moves.DUAL_CHOP),
    yuMove(new AttackMove(Moves.YU_RELENTLESS_JOUST, Type.NORMAL, MoveCategory.PHYSICAL, 80, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedMovePowerMultiplierAttr, foeDefNegativeGate, 1.3), Moves.MULTI_ATTACK),
    yuMove(new AttackMove(Moves.YU_SPIRAL_CONSUMPTION, Type.DRAGON, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalHealAttr, 0.25, foeDefNegativeGate), Moves.DRAGON_CLAW),
  );
}
export function registerYuDuelmonEntry136(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GALLOPING_LANCE, Type.FLYING, MoveCategory.PHYSICAL, 120, 90, 10, -1, 0, 9)
      .attr(ChargeMoveAttr), Moves.BOUNCE),
    yuMove(new AttackMove(Moves.YU_SOLAR_GALLOP, Type.GRASS, MoveCategory.SPECIAL, 120, 100, 10, -1, 0, 9)
      .attr(ChargeMoveAttr)
      .attr(GatedAlwaysHitAttr, sunChargeReleaseGate), Moves.SOLAR_BEAM),
    yuMove(new AttackMove(Moves.YU_METEOR_DESCENT, Type.ROCK, MoveCategory.SPECIAL, 120, 90, 10, -1, 0, 9)
      .attr(ChargeMoveAttr)
      .attr(ConditionalFlinchAttr, 30, chargeReleaseTurnGate), Moves.METEOR_BEAM),
    yuMove(new AttackMove(Moves.YU_QUICK_LANCE, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, chargeReleasedLastTurnGate), Moves.LOW_KICK),
    yuMove(new SelfStatusMove(Moves.YU_LANCE_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, chargeReleasedLastTurnGate), Moves.ATTRACT),
    yuMove(new AttackMove(Moves.YU_MOMENTUM_BASH, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(GatedIncrementMovePriorityAttr, chargeReleasedLastTurnGate, 1)
      .attr(GatedMovePowerMultiplierAttr, chargeReleasedLastTurnGate, 1.3), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_DOUBLE_CHARGE, Type.STEEL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(ChargeMoveAttr)
      .attr(RandomStatBoostAttr, 2, 1, 100, chargingGate), Moves.DOUBLE_IRON_BASH),
  );
}
export function registerYuDuelmonEntry137(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_IRON_PULSE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .magnetMove()
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, magnetGate2, 50), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_RADIATION_SPIKE, Type.POISON, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .magnetMove()
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, magnetGate2, 50), Moves.POISON_FANG),
    yuMove(new SelfStatusMove(Moves.YU_GAMMA_MEND, Type.STEEL, -1, 10, -1, 0, 9)
      .magnetMove()
      .attr(HealAttr, 0.5)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, magnetGate2), Moves.GEAR_UP),
    yuMove(new AttackMove(Moves.YU_REPULSION_FIELD, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .magnetMove()
      .attr(GatedMovePowerMultiplierAttr, foeUsedContactLastTurnGate, 1.3)
      .attr(ConditionalFlinchAttr, 35, magnetGate2), Moves.HARD_PRESS),
    yuMove(new AttackMove(Moves.YU_IRONCLAD_COUNTER, Type.STEEL, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .magnetMove()
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER)
      .attr(RandomStatBoostAttr, 1, 100, magnetGate2), Moves.IRON_TAIL),
    yuMove(new AttackMove(Moves.YU_INERTIA_BOMB, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .magnetMove()
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, magnetGate2, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, true, magnetGate2, 100), Moves.POPULATION_BOMB),
  );
}
export function registerYuDuelmonEntry138(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VANISHING_BLOW, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, evasionStageGte2Gate), Moves.SUCKER_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_SPECTRAL_GRACE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true), Moves.CURSE),
    yuMove(new SelfStatusMove(Moves.YU_FADING_MIST, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 2, true)
      .attr(HealAttr, 0.25), Moves.MISTY_TERRAIN),
    yuMove(new AttackMove(Moves.YU_ELUSIVE_COUNTER, Type.FIGHTING, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.COUNTER),
    yuMove(new AttackMove(Moves.YU_MYTHICAL_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, evasionStageGte2Gate, 1.3), Moves.HEAD_CHARGE),
    yuMove(new AttackMove(Moves.YU_DIMENSIONAL_RIFT, Type.GHOST, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, evasionStageGte2Gate, 1.3)
      .attr(ConditionalFlinchAttr, 35, foePrevMoveMissedGate), Moves.RAGE_FIST),
  );
}
export function registerYuDuelmonEntry139(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BLESSED_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, below50HpGate, 50), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_SHIMMERING_IMPACT, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedIncrementMovePriorityAttr, below50HpGate, 1)
      .attr(ConditionalFlinchAttr, 35, below50HpGate), Moves.FEINT),
    yuMove(new AttackMove(Moves.YU_TWIN_STARLIGHT, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, below50HpGate, 50), Moves.PLAY_ROUGH),
    yuMove(new AttackMove(Moves.YU_HARMONIOUS_CHIME, Type.NORMAL, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, below50HpGate, 50), Moves.HIDDEN_POWER),
    yuMove(new AttackMove(Moves.YU_RADIANT_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.5), Moves.DRAINING_KISS),
    yuMove(new SelfStatusMove(Moves.YU_DUAL_BLESSING, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.SLEEP, StatusEffect.FREEZE), Moves.REVIVAL_BLESSING),
    yuMove(new AttackMove(Moves.YU_BLESSED_CASCADE, Type.FAIRY, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, below50HpGate, 50), Moves.DISARMING_VOICE),
    yuMove(new SelfStatusMove(Moves.YU_WISH_CASCADE, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(TriggerWishAttr, below50HpGate), Moves.WISH),
  );
}
export function registerYuDuelmonEntry140(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CITRINE_LANCE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TAUNTED, 100, burnedGate), Moves.NATURAL_GIFT),
    yuMove(new AttackMove(Moves.YU_SEARING_FACET, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 100, burnedGate), Moves.BLAZING_TORQUE),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_CRASH, Type.ROCK, MoveCategory.PHYSICAL, 90, 85, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, burnedGate, 100), Moves.DIAMOND_STORM),
    yuMove(new AttackMove(Moves.YU_MOLTEN_RUSH, Type.FIRE, MoveCategory.PHYSICAL, 70, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, burnedGate, 100), Moves.FLAME_CHARGE),
    yuMove(new SelfStatusMove(Moves.YU_CRYSTAL_BASTION, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, burnedGate, 100), Moves.ROCK_POLISH),
    yuMove(new AttackMove(Moves.YU_GEM_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.POWER_GEM),
    yuMove(new AttackMove(Moves.YU_GEM_STORM, Type.NORMAL, MoveCategory.SPECIAL, 80, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 30, burnedGate), Moves.HYPER_BEAM),
    yuMove(new AttackMove(Moves.YU_FACETED_INCISION, Type.ROCK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, burnedGate, 100), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_SCORCHED_EROSION, Type.FIRE, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalTrapAttr, BattlerTagType.FIRE_SPIN, 50, burnedGate), Moves.FIRE_SPIN),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_SPIRE, Type.ROCK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, burnedGate, 1.3), Moves.MIGHTY_CLEAVE),
  );
}
export function registerYuDuelmonEntry141(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FACETED_BLUDGEON, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, statusedGate, 30), Moves.PAY_DAY),
    yuMove(new AttackMove(Moves.YU_PRISM_SCATTER, Type.NORMAL, MoveCategory.PHYSICAL, 30, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(ConditionalConfuseAttr, 50, statusedGate), Moves.TAIL_SLAP),
    yuMove(new SelfStatusMove(Moves.YU_GEMSTONE_FORMATION, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalHealAttr, 0.25, statusedGate), Moves.SANDSTORM),
    yuMove(new AttackMove(Moves.YU_SAPPHIRE_PULSE, Type.ROCK, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, statusedGate, 50), Moves.POWER_GEM),
    yuMove(new AttackMove(Moves.YU_DIAMOND_EDGE, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, statusedGate, 30), Moves.POWER_UP_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_FACET_GUARD, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, statusedGate, 100), Moves.WIDE_GUARD),
    yuMove(new AttackMove(Moves.YU_FRACTURE_POINT, Type.ROCK, MoveCategory.PHYSICAL, 110, 80, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedAlwaysHitAttr, statusedGate), Moves.ROCK_SLIDE),
    yuMove(new SelfStatusMove(Moves.YU_SANDSTORM_FORTRESS, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SAND")
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, statusedGate, 100), Moves.TAR_SHOT),
    yuMove(new AttackMove(Moves.YU_GEM_TAUNT, Type.ROCK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(ConditionalConfuseAttr, 50, statusedGate), Moves.ANCIENT_POWER),
    yuMove(new AttackMove(Moves.YU_UNYIELDING_GEM, Type.ROCK, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate), Moves.DIAMOND_STORM),
  );
}
export function registerYuDuelmonEntry142(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AIRLIFT_SLASH, Type.FLYING, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "SPD", 1), Moves.DRAGON_ASCENT),
    yuMove(new AttackMove(Moves.YU_GRAND_AIRLIFT, Type.FLYING, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "ATK", 1), Moves.ACROBATICS),
    yuMove(new AttackMove(Moves.YU_ARRIVAL_IMPACT, Type.FLYING, MoveCategory.PHYSICAL, 75, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, userSwitchedInThisTurnGate), Moves.DRILL_PECK),
    yuMove(new AttackMove(Moves.YU_SLIPSTREAM_SURGE, Type.FLYING, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, userSwitchedInThisTurnGate, 100), Moves.BRAVE_BIRD),
    yuMove(new SelfStatusMove(Moves.YU_SWEPT_RUNWAY, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(ClearHazardsAttr)
      .attr(HealAttr, 0.25)
      .attr(ConditionalSelfHealAttr, 0, 0.5, userSwitchedInThisTurnGate), Moves.ROOST),
    yuMove(new SelfStatusMove(Moves.YU_CARRIER_SHIELD, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, userSwitchedInThisTurnGate, 100), Moves.KINGS_SHIELD),
    yuMove(new AttackMove(Moves.YU_IRON_FUSELAGE, Type.STEEL, MoveCategory.PHYSICAL, 80, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userSwitchedInThisTurnGate, 100), Moves.STEEL_WING),
    yuMove(new SelfStatusMove(Moves.YU_ROOST_RECALIBRATION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalSelfHealAttr, 0, 0.66, userSwitchedInThisTurnGate), Moves.BATON_PASS),
    yuMove(new AttackMove(Moves.YU_CROSSWIND_BLADE, Type.FLYING, MoveCategory.PHYSICAL, 85, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedIncrementMovePriorityAttr, userSwitchedInThisTurnGate, 1), Moves.FACADE),
    yuMove(new AttackMove(Moves.YU_TAILWIND_RUSH, Type.FLYING, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(GatedIncrementMovePriorityAttr, userSwitchedInThisTurnGate, 1), Moves.AERIAL_ACE),
    yuMove(new SelfStatusMove(Moves.YU_SUPPLY_DROP, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalHealAttr, 0.25, userSwitchedInThisTurnGate), Moves.WISH),
    yuMove(new AttackMove(Moves.YU_TURBULENCE_BLAST, Type.FLYING, MoveCategory.PHYSICAL, 65, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, userSwitchedInThisTurnGate), Moves.DOOM_DESIRE),
    yuMove(new AttackMove(Moves.YU_PARTING_DEBUFF, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, userSwitchedInThisTurnGate, 100), Moves.POUND),
  );
}
export function registerYuDuelmonEntry143(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COFFIN_FLOORSTEP, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .ghostMove()
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, ghostMoveGate3, 100), Moves.PRESENT),
    yuMove(new AttackMove(Moves.YU_INVITATION_WRIT, Type.GHOST, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .ghostMove()
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(ChangeFoePrimaryTypeAttr, "GHOST", 100, ghostMoveGate3), Moves.SHADOW_BONE),
    yuMove(new AttackMove(Moves.YU_LAST_DIVE, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, -1, 9)
      .ghostMove()
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(FaintCountdownAttr)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(SelfHpCostAttr, 0.1, ghostMoveGate3, 0.05), Moves.LAST_RESORT),
    yuMove(new AttackMove(Moves.YU_AFTERPARTY_DROWSE, Type.GHOST, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .ghostMove()
      .attr(AddBattlerTagAttr, BattlerTagType.DROWSY, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, ghostMoveGate3, 50), Moves.ASTONISH),
    yuMove(new StatusMove(Moves.YU_GUESTLIST_COVENANT, Type.GHOST, -1, 10, -1, -1, 9)
      .ghostMove()
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HpSplitAttr)
      .attr(AddArenaTagAttr, ArenaTagType.SAFEGUARD, 5, true, true)
      .attr(ConditionalHealAttr, 0.25, ghostMoveGate3), Moves.PAIN_SPLIT),
    yuMove(new SelfStatusMove(Moves.YU_ROLLCALL_BENEDICTION, Type.GHOST, -1, 10, -1, 0, 9)
      .ghostMove()
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(StatChangeAttr, BattleStat.DEF, -1, true)
      .attr(ConditionalHealAttr, 0.25, ghostMoveGate3), Moves.WISH),
    yuMove(new AttackMove(Moves.YU_CANDLE_VERDICT, Type.FAIRY, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .ghostMove()
      .attr(AddBattlerTagAttr, BattlerTagType.HEAL_BLOCKED, false, false, 5)
      .attr(GatedClearPositiveStatsAttr, ghostMoveGate3), Moves.SPIRIT_BREAK),
    yuMove(new AttackMove(Moves.YU_BOUNCERS_VERDICT, Type.GHOST, MoveCategory.PHYSICAL, 75, 95, 10, -1, -1, 9)
      .ghostMove()
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, ghostMoveGate3, 50), Moves.SHADOW_FORCE),
    yuMove(new AttackMove(Moves.YU_GRAVEGARDEN_BITE, Type.GHOST, MoveCategory.PHYSICAL, 70, 95, 10, 30, 0, 9)
      .ghostMove()
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.SEEDED, false, false, ghostMoveGate3, 50), Moves.LAST_RESPECTS),
    yuMove(new AttackMove(Moves.YU_HOUSE_FINALE, Type.GHOST, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .ghostMove()
      .attr(HealPerGhostMovePartyAttr, 0.05)
      .attr(ResetTailwindFromStartAttr, 50, ghostMoveGate3), Moves.SHADOW_CLAW),
  );
}
export function registerYuDuelmonEntry144(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SARCOPHAGUS_STRIKE, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, trappedGate, 50), Moves.SHADOW_CLAW),
    yuMove(new AttackMove(Moves.YU_SHROUDLINE_FLURRY, Type.GHOST, MoveCategory.PHYSICAL, 25, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitCritAttr, 30, trappedGate), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_CANOPIC_DRAIN, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate)
      .attr(GatedResetStatsAttr, false, trappedGate), Moves.SHADOW_PUNCH),
    yuMove(new AttackMove(Moves.YU_RELIC_SHEAR, Type.GHOST, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, trappedGate, 50), Moves.RAGE_FIST),
    yuMove(new AttackMove(Moves.YU_DESERT_LARIAT, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SAND", 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, trappedGate, 50), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_COFFIN_LULL, Type.GHOST, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.DROWSY, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, alwaysTrueGate, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, trappedGate, 50), Moves.LICK),
    yuMove(new AttackMove(Moves.YU_DUST_MORTAR, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, trappedGate, 50), Moves.POLTERGEIST),
    yuMove(new AttackMove(Moves.YU_SEPULCHER_BREAKER, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 95, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, true)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, true)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, trappedGate, 50), Moves.REVENGE),
    yuMove(new AttackMove(Moves.YU_LINEN_NOOSE, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, trappedOrDrowsyGate, 30), Moves.SHADOW_BONE),
    yuMove(new StatusMove(Moves.YU_EMBALMERS_BINDING, Type.GHOST, 90, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, trappedGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new SelfStatusMove(Moves.YU_DUNE_SNAREWORKS, Type.GHOST, 90, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(ResetWeatherFromStartAttr, "SAND", 30), Moves.DESTINY_BOND),
    yuMove(new StatusMove(Moves.YU_REWRAP_REPRIEVE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, trappedGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, trappedGate, 100), Moves.CURSE),
    yuMove(new SelfStatusMove(Moves.YU_RITUAL_CURSEWORKS, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(CurseAttr)
      .attr(ResetWeatherFromStartAttr, "SAND", 30)
      .target(MoveTarget.CURSE), Moves.CONFUSE_RAY),
    yuMove(new AttackMove(Moves.YU_CRYPT_CONVEYANCE, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyHealOnEntryAttr, 0.2, trappedGate), Moves.LAST_RESPECTS),
  );
}
export function registerYuDuelmonEntry145(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RECEIPT_RATTLE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, foeUnderEncoreOrDisableGate, 50), Moves.PULVERIZING_PANCAKE),
    yuMove(new AttackMove(Moves.YU_AUDIT_HOWL, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeUnderEncoreOrDisableGate), Moves.JUDGMENT),
    yuMove(new AttackMove(Moves.YU_CLERKS_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 90, 10, 35, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FlinchAttr)
      .attr(ReduceLastMovePpAttr, 2, 100, allHitsLandGate), Moves.TAIL_SLAP),
    yuMove(new StatusMove(Moves.YU_GRAVE_WITNESS, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(ForesightAttr)
      .attr(EncoreOrDisableAttr, 50), Moves.FORESIGHT),
    yuMove(new StatusMove(Moves.YU_REPETITION_WARRANT, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true)
      .attr(ReduceLastMovePpAttr, 3), Moves.ENCORE),
    yuMove(new AttackMove(Moves.YU_DEBT_DRINKER, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeUnderEncoreOrDisableGate), Moves.SHADOW_PUNCH),
    yuMove(new AttackMove(Moves.YU_EERIE_WRIT, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ReduceLastMovePpAttr, 3)
      .attr(ConfuseAttr)
      .attr(EncoreOrDisableAttr, 50), Moves.MOONGEIST_BEAM),
    yuMove(new AttackMove(Moves.YU_NULLIFICATION_HAMMER, Type.GHOST, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(GatedMovePowerMultiplierAttr, foeUnderEncoreOrDisableGate, 1.3), Moves.HAMMER_ARM),
    yuMove(new AttackMove(Moves.YU_GRAVEFINE_UPPERCUT, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 95, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(EncoreOrDisableAttr, 50), Moves.SKY_UPPERCUT),
    yuMove(new SelfStatusMove(Moves.YU_BACKPAY_RITUAL, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(ReduceLastMovePpAttr, 4)
      .attr(ConditionalSelfHealAttr, 0, 0.5, foeUnderEncoreOrDisableGate), Moves.DISABLE),
    yuMove(new AttackMove(Moves.YU_FORECLOSURE_SHOT, Type.GHOST, MoveCategory.SPECIAL, 90, 95, 10, -1, 0, 9)
      .attr(AddMovePowerAttr, 40, foeUnderEncoreOrDisableGate), Moves.BITTER_MALICE),
    yuMove(new AttackMove(Moves.YU_SUMMONS_NOTICE, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ReducePpMoveAttr, 2)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(IncomingAllyStatBoostAttr, "ATK", 1, foeUnderEncoreOrDisableGate), Moves.SINISTER_ARROW_RAID),
  );
}
export function registerYuDuelmonEntry146(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STITCHED_LIGHTNING, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, electricTerrainGate, 50), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_NEURAL_SURGE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, electricTerrainGate, 50), Moves.HEADBUTT),
    yuMove(new AttackMove(Moves.YU_CAPACITOR_RATTLE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, electricTerrainGate, 50), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_OVERVOLT_CRASH, Type.NORMAL, MoveCategory.PHYSICAL, 105, 90, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "ELECTRIC", 30)
      .attr(ResetTerrainFromStartAttr, "ELECTRIC", 50, paralyzedGate), Moves.RAPID_SPIN),
    yuMove(new AttackMove(Moves.YU_QUICKBREAKER_JAB, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, electricTerrainGate), Moves.QUICK_ATTACK),
    yuMove(new AttackMove(Moves.YU_ARC_LEECH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, electricTerrainGate), Moves.PARABOLIC_CHARGE),
    yuMove(new AttackMove(Moves.YU_GRAVEGROUND_APPARITION, Type.GHOST, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ResetTerrainFromStartAttr, "ELECTRIC", 30, paralyzedGate), Moves.SPIRIT_SHACKLE),
    yuMove(new AttackMove(Moves.YU_FROST_CIRCUIT, Type.ICE, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, electricTerrainGate, 50), Moves.ICE_SHARD),
    yuMove(new SelfStatusMove(Moves.YU_REANIMATION_SPARK, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(AddBattlerTagAttr, BattlerTagType.CHARGED, true, false)
      .attr(ConditionalSelfHealAttr, 0, 0.5, electricTerrainGate), Moves.ELECTRIC_TERRAIN),
    yuMove(new AttackMove(Moves.YU_ROOT_CONDUIT, Type.GRASS, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalHealAttr, 0.25, electricTerrainGate), Moves.POWER_WHIP),
    yuMove(new AttackMove(Moves.YU_LIVEWIRE_SPRINT, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, electricTerrainGate, 50), Moves.CHIP_AWAY),
    yuMove(new AttackMove(Moves.YU_GUIDED_ARC, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, electricTerrainGate, 50), Moves.BIDE),
    yuMove(new AttackMove(Moves.YU_CAPACITOR_BITE, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.CHARGED, true, false, electricTerrainGate, 30), Moves.RETALIATE),
  );
}
export function registerYuDuelmonEntry147(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AURORA_MAUL, Type.ICE, MoveCategory.PHYSICAL, 90, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, auroraVeilActiveGate, 35), Moves.FREEZE_SHOCK),
    yuMove(new AttackMove(Moves.YU_GLACIER_SPRINT, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, auroraVeilActiveGate, 50), Moves.AVALANCHE),
    yuMove(new AttackMove(Moves.YU_PERMAFROST_VERDICT, Type.ICE, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedIncrementMovePriorityAttr, auroraVeilActiveGate, 1), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_WHITEOUT_SWEEP, Type.ICE, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ClearHazardsAttr)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(ConditionalHealAttr, 0.25, auroraVeilActiveGate), Moves.ICE_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_COLDFRONT_EXIT, Type.ICE, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(ForceSwitchOutAttr, true, false), Moves.HAZE),
    yuMove(new AttackMove(Moves.YU_SPECTER_RIME, Type.GHOST, MoveCategory.PHYSICAL, 80, 95, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, auroraVeilActiveGate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_AURORA_SIPHON, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, auroraVeilActiveGate), Moves.ICE_BALL),
    yuMove(new AttackMove(Moves.YU_SNOWGUIDED_LANCE, Type.ICE, MoveCategory.PHYSICAL, 85, 90, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, auroraVeilActiveGate, 30), Moves.GLACIAL_LANCE),
    yuMove(new AttackMove(Moves.YU_SHIELDBREAKER_SUNDER, Type.ICE, MoveCategory.PHYSICAL, 95, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, auroraVeilActiveGate), Moves.ICE_HAMMER),
    yuMove(new AttackMove(Moves.YU_RIME_CAGE, Type.ICE, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, auroraVeilActiveGate, 35), Moves.ICE_SPINNER),
    yuMove(new AttackMove(Moves.YU_FROSTBOUND_UPPERCUT, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, auroraVeilActiveGate, 50), Moves.SKY_UPPERCUT),
    yuMove(new SelfStatusMove(Moves.YU_AFTER_VEIL_AEGIS, Type.ICE, -1, 10, -1, 0, 9)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, noAuroraVeilGate, 100, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, noAuroraVeilGate, 100, false, true), Moves.REFLECT),
  );
}
export function registerYuDuelmonEntry148(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BLIGHT_CLEAVER, Type.DARK, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, usedSameMoveLastTurnGate, 50), Moves.POWER_TRIP),
    yuMove(new AttackMove(Moves.YU_CORRUPTION_UPPERCUT, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, usedSameMoveLastTurnGate, 50), Moves.SKY_UPPERCUT),
    yuMove(new AttackMove(Moves.YU_RUIN_DRAG, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, usedSameMoveLastTurnGate, 50), Moves.PUNISHMENT),
    yuMove(new AttackMove(Moves.YU_SANGUINE_CORRUPTION, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, usedSameMoveLastTurnGate), Moves.CRUNCH),
    yuMove(new AttackMove(Moves.YU_OATHBREAKER_CRASH, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 95, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(GatedMovePowerMultiplierAttr, usedSameMoveLastTurnGate, 1.3), Moves.REVERSAL),
    yuMove(new AttackMove(Moves.YU_RUSTSTEEL_REND, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, usedSameMoveLastTurnGate), Moves.MAGNET_BOMB),
    yuMove(new AttackMove(Moves.YU_GRAVEGROUND_SPLITTER, Type.GROUND, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, usedSameMoveLastTurnGate, 50), Moves.BULLDOZE),
    yuMove(new AttackMove(Moves.YU_BLACK_VOW, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, usedSameMoveLastTurnGate)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, usedSameMoveLastTurnGate, 50), Moves.FALSE_SURRENDER),
    yuMove(new SelfStatusMove(Moves.YU_FELL_REBOOT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.NASTY_PLOT),
    yuMove(new SelfStatusMove(Moves.YU_BLACKENED_VIGOR, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(HealAttr, 0.2), Moves.FLATTER),
    yuMove(new SelfStatusMove(Moves.YU_ENDLESS_SPITE, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr, BattlerTagType.ENDURING)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.HONE_CLAWS),
    yuMove(new AttackMove(Moves.YU_RITE_JAB, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 1, 9)
      .attr(ConditionalHighCritAttr, below30HpGate, 30), Moves.SUCKER_PUNCH),
  );
}
export function registerYuDuelmonEntry149(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TRIARCH_BEAM, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, gateTriadActiveGate, 50), Moves.HYPER_BEAM),
    yuMove(new AttackMove(Moves.YU_WARDENSPEAR_JAB, Type.NORMAL, MoveCategory.PHYSICAL, 90, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, gateTriadActiveGate, 50), Moves.ROCK_CLIMB),
    yuMove(new AttackMove(Moves.YU_LIGHTNING_GATE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, gateTriadActiveGate, 50), Moves.ELECTROWEB),
    yuMove(new AttackMove(Moves.YU_WINDGATE_SLICE, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, gateTriadActiveGate, 50), Moves.DUAL_WINGBEAT),
    yuMove(new SelfStatusMove(Moves.YU_SENTINEL_SHELTER, Type.NORMAL, -1, 10, 30, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, true, true)
      .attr(ConditionalAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, gateTriadActiveGate, 50, true, true), Moves.SAFEGUARD),
    yuMove(new SelfStatusMove(Moves.YU_SKYWARD_RALLY, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.TAILWIND),
    yuMove(new SelfStatusMove(Moves.YU_RAINWIRED_CHARGE, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true), Moves.RAIN_DANCE),
    yuMove(new SelfStatusMove(Moves.YU_CIRCUIT_DOMINION, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "ELECTRIC")
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.ELECTRIC_TERRAIN),
    yuMove(new SelfStatusMove(Moves.YU_ELEMENTAL_ABSORPTION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalSelfHealAttr, 0.25, 0.4, gateTriadActiveGate), Moves.BELLY_DRUM),
    yuMove(new AttackMove(Moves.YU_GATE_COUNTERMAND, Type.NORMAL, MoveCategory.PHYSICAL, 85, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedIncrementMovePriorityAttr, gateTriadActiveGate, 1)
      .attr(GatedResetStatsAttr, false, gateTriadActiveGate), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_FROST_GATEBREAK, Type.ICE, MoveCategory.SPECIAL, 85, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, gateTriadActiveGate, 35), Moves.AURORA_BEAM),
    yuMove(new AttackMove(Moves.YU_TRIAD_JUDGMENT, Type.NORMAL, MoveCategory.SPECIAL, 95, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, gateTriadActiveGate), Moves.JUDGMENT),
    yuMove(new AttackMove(Moves.YU_ELEMENTAL_CLAMP, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, rainGate), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_THUNDERHEAD_LIFT, Type.ELECTRIC, MoveCategory.PHYSICAL, 75, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedIncrementMovePriorityAttr, tailwindActiveGate, 1)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, tailwindActiveGate, 30), Moves.SPARK),
    yuMove(new AttackMove(Moves.YU_TRIUNE_DECREE, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(TriTypeFieldResetAttr), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry150(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TRAILHEAD_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, below50HpGate, 50), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_MAPMAKER_GUST, Type.FLYING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ResetTailwindFromStartAttr, 50, below50HpGate), Moves.FLOATY_FALL),
    yuMove(new SelfStatusMove(Moves.YU_RATION_RAMPART, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(AddArenaTagChanceAttr, ArenaTagType.REFLECT, 5, 30, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, below50HpGate, 50, false, true), Moves.REVIVAL_BLESSING),
    yuMove(new SelfStatusMove(Moves.YU_HEROS_HYPE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalHighCritAttr, below50HpGate, 100), Moves.BESTOW),
    yuMove(new SelfStatusMove(Moves.YU_DUNGEON_DODGE, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, below50HpGate, 100), Moves.BLOCK),
    yuMove(new AttackMove(Moves.YU_LUCK_UPPERCUT, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalFlinchAttr, 35, below50HpGate), Moves.METEOR_MASH),
    yuMove(new AttackMove(Moves.YU_THRESHOLD_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, below50HpGate), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_DOOR_KICK_EJECT, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, below50HpGate, 50), Moves.HIGH_JUMP_KICK),
    yuMove(new AttackMove(Moves.YU_GRAVITY_SPIKE, Type.ROCK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ResetGravityFromStartAttr, 30)
      .attr(ResetGravityFromStartAttr, 50, below50HpGate), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_BACKTRACK_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(AddArenaTagChanceAttr, ArenaTagType.MIST, 5, 30, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.MIST, 5, below50HpGate, 50, false, true), Moves.SLASH),
    yuMove(new SelfStatusMove(Moves.YU_VETERANS_CHARM, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(AddArenaTagAttr, ArenaTagType.NO_CRIT, 5, true, true)
      .attr(ConditionalHealAttr, 0.25, below50HpGate), Moves.CONVERSION),
    yuMove(new SelfStatusMove(Moves.YU_RELIC_TWIST, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetArenaTagAttr, below50HpGate), Moves.TEATIME),
    yuMove(new AttackMove(Moves.YU_QUESTLINE_VERDICT, Type.NORMAL, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedDisableMoveAttr, below50HpGate)
      .attr(ReduceLastMovePpAttr, 2, 50, below50HpGate), Moves.SCRATCH),
  );
}
export function registerYuDuelmonEntry151(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_REND_DUO, Type.DRAGON, MoveCategory.PHYSICAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(GatedIncrementMovePriorityAttr, below25HpGate, 1), Moves.DUAL_CHOP),
    yuMove(new AttackMove(Moves.YU_FERAL_TRIPLET, Type.FIGHTING, MoveCategory.PHYSICAL, 35, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(IgnoreDefensiveStagesAttr), Moves.TRIPLE_KICK),
    yuMove(new AttackMove(Moves.YU_SPEEDLINE_CRUSH, Type.DRAGON, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, totalStagesGte3Gate), Moves.BREAKING_SWIPE),
    yuMove(new AttackMove(Moves.YU_POWERLINE_BREAK, Type.FIGHTING, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, totalStagesGte3Gate), Moves.BRICK_BREAK),
    yuMove(new AttackMove(Moves.YU_RAMPAGE_NULL, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(GatedMovePowerMultiplierAttr, totalStagesGte3Gate, 1.3), Moves.BONEMERANG),
    yuMove(new AttackMove(Moves.YU_RAZOR_SPIRAL, Type.NORMAL, MoveCategory.PHYSICAL, 20, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3_TO_4), Moves.SELF_DESTRUCT),
    yuMove(new AttackMove(Moves.YU_ION_TWIN, Type.DRAGON, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(GatedRemoveHeldItemChanceAttr, totalStagesGte3Gate, 50), Moves.DRAGON_DARTS),
    yuMove(new AttackMove(Moves.YU_ABYSS_INITIATIVE, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userPositiveStageGate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SHRAPNEL_STAMPEDE, Type.ROCK, MoveCategory.PHYSICAL, 25, 85, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5), Moves.ROCK_BLAST),
    yuMove(new AttackMove(Moves.YU_BLOOD_SIPHON, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userPositiveStageGate), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_LAST_THRESHOLD, Type.DRAGON, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, below25HpGate, 30)
      .attr(GatedAlwaysHitAttr, below25HpGate), Moves.OUTRAGE),
    yuMove(new AttackMove(Moves.YU_MOMENTUM_CRUSH, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, totalStagesGte3Gate, 50), Moves.CRUSH_GRIP),
    yuMove(new AttackMove(Moves.YU_TOTAL_RUIN, Type.DRAGON, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, userPositiveStageGate), Moves.DRAGON_CLAW),
  );
}
export function registerYuDuelmonEntry152(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AURUM_RAY, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, foeMoveDisabledGate, 50), Moves.JUDGMENT),
    yuMove(new AttackMove(Moves.YU_MARBLE_CENSURE, Type.NORMAL, MoveCategory.SPECIAL, 85, 95, 10, 30, 0, 9)
      .attr(ResetTerrainFromStartAttr, "PSYCHIC", 30)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, psychicTerrainGate, 50), Moves.RELIC_SONG),
    yuMove(new AttackMove(Moves.YU_STATUES_WEIGHT, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 95, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeMoveDisabledGate), Moves.LUSTER_PURGE),
    yuMove(new AttackMove(Moves.YU_GOLDEN_LAPSE, Type.PSYCHIC, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(ResetTerrainFromStartAttr, "PSYCHIC"), Moves.STORED_POWER),
    yuMove(new SelfStatusMove(Moves.YU_FACSIMILE_IDOL, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, psychicTerrainGate, 100), Moves.TRICK_ROOM),
    yuMove(new SelfStatusMove(Moves.YU_PSYCHIC_DOMAIN, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "PSYCHIC")
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, foeMoveDisabledGate, 100), Moves.PSYCHIC_TERRAIN),
    yuMove(new AttackMove(Moves.YU_SCRIBED_OMEN, Type.PSYCHIC, MoveCategory.SPECIAL, 120, 100, 10, -1, 0, 9)
      .attr(DelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }))
      .attr(ReduceLastMovePpAttr, 3, 100, foeMoveDisabledGate), Moves.FUTURE_SIGHT),
    yuMove(new AttackMove(Moves.YU_DOOMED_INSCRIPTION, Type.STEEL, MoveCategory.SPECIAL, 120, 100, 10, 10, 0, 9)
      .attr(DelayedAttackAttr, ArenaTagType.DOOM_DESIRE, ChargeAnim.DOOM_DESIRE_CHARGING, i18next.t("moveTriggers:choseDoomDesireAsDestiny", { pokemonName: "{USER}" }))
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, psychicTerrainGate), Moves.DOOM_DESIRE),
    yuMove(new AttackMove(Moves.YU_GILDED_DOUBLET, Type.NORMAL, MoveCategory.SPECIAL, 55, 95, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(ConditionalConfuseAttr, 25, foeMoveDisabledGate), Moves.REVELATION_DANCE),
    yuMove(new AttackMove(Moves.YU_MARBLE_REPULSION, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 95, 10, -1, 0, 9)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, psychicTerrainGate, 30)
      .attr(GatedForceSwitchOutAttr, false, false, psychicTerrainGate), Moves.EXPANDING_FORCE),
    yuMove(new SelfStatusMove(Moves.YU_GOLDEN_REALLOCATION, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(MirrorStatStagesAttr)
      .attr(ResetStatsAttr, false), Moves.CALM_MIND),
  );
}
export function registerYuDuelmonEntry153(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_GRAVEKNIFE_OPENER, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, foeHasItemGate), Moves.FEINT),
    yuMove(new AttackMove(Moves.YU_STOLEN_SWING, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(UseFoeAttackStatAttr)
      .attr(StealHeldItemAttr, 100, foeHasItemGate), Moves.THIEF),
    yuMove(new AttackMove(Moves.YU_SHROUDSTEP_DOUBLET, Type.NORMAL, MoveCategory.PHYSICAL, 55, 95, 10, 15, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeHasItemGate, 30), Moves.DOUBLE_SLAP),
    yuMove(new AttackMove(Moves.YU_RELIC_CRACKDOWN, Type.DARK, MoveCategory.PHYSICAL, 110, 90, 10, -1, 0, 9)
      .attr(StealHeldItemChanceAttr, 1)
      .attr(ConditionalHighCritAttr, itemlessGate, 30), Moves.THROAT_CHOP),
    yuMove(new AttackMove(Moves.YU_UNARMORED_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(IgnoreDefensiveStagesAttr)
      .attr(GatedMovePowerMultiplierAttr, foeHasItemGate, 1.3), Moves.WICKED_BLOW),
    yuMove(new SelfStatusMove(Moves.YU_PILFERED_WARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(RandomTypeResistanceAttr), Moves.NASTY_PLOT),
    yuMove(new AttackMove(Moves.YU_DEBT_COLLECTOR, Type.DARK, MoveCategory.PHYSICAL, 50, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, consecutiveUseGate), Moves.WICKED_TORQUE),
    yuMove(new AttackMove(Moves.YU_GRAVE_THEFT, Type.DARK, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(StealHeldItemChanceAttr, 1)
      .attr(CopyFoeTypesAttr), Moves.KNOCK_OFF),
  );
}
export function registerYuDuelmonEntry154(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CROWNSPORE_SALUTE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, statusedGate, 50), Moves.ROUND),
    yuMove(new AttackMove(Moves.YU_SCEPTERWING_SCOURGE, Type.BUG, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(GatedRemoveHeldItemAttr, statusedGate), Moves.LUNGE),
    yuMove(new AttackMove(Moves.YU_PROBOSCIS_DRAIN, Type.BUG, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate), Moves.INFESTATION),
    yuMove(new AttackMove(Moves.YU_AFFLICTION_LEVERAGE, Type.POISON, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, statusedGate), Moves.CLEAR_SMOG),
    yuMove(new AttackMove(Moves.YU_PLAGUE_DRAFT, Type.NORMAL, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES), Moves.SNORE),
    yuMove(new SelfStatusMove(Moves.YU_SILKEN_QUORUM, Type.BUG, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STICKY_WEB)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, statusedGate, 100), Moves.STICKY_WEB),
    yuMove(new StatusMove(Moves.YU_QUARANTINE_WRIT, Type.POISON, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.INFESTATION, 100, statusedGate), Moves.WHIRLPOOL),
    yuMove(new SelfStatusMove(Moves.YU_MOLTED_MIRAGE, Type.BUG, -1, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, statusedGate, 50), Moves.SUBSTITUTE),
    yuMove(new SelfStatusMove(Moves.YU_ADAPTIVE_CARAPACE, Type.BUG, -1, 10, -1, 0, 9)
      .attr(RandomTypeResistanceAttr), Moves.DEFEND_ORDER),
    yuMove(new StatusMove(Moves.YU_ROYAL_PARASITE, Type.BUG, 90, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, statusedGate, 100), Moves.LEECH_SEED),
    yuMove(new SelfStatusMove(Moves.YU_ROYAL_POWDERGUARD, Type.BUG, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ResetTailwindFromStartAttr, 50, statusedGate), Moves.HEAL_ORDER),
    yuMove(new AttackMove(Moves.YU_CINDER_POLLEN, Type.FIRE, MoveCategory.SPECIAL, 90, 95, 10, 30, 0, 9)
      .attr(ClearHazardsAttr)
      .attr(StatusEffectAttr, StatusEffect.TOXIC), Moves.FIRE_BLAST),
  );
}
export function registerYuDuelmonEntry155(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SALTWAKE_BITE, Type.WATER, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeAbove50HpGate, 50), Moves.CRABHAMMER),
    yuMove(new AttackMove(Moves.YU_OPEN_WATER_CRASH, Type.WATER, MoveCategory.PHYSICAL, 120, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, foeAbove50HpGate), Moves.WAVE_CRASH),
    yuMove(new AttackMove(Moves.YU_BLOODLINE_CUT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveOrStealHeldItemAttr, foeBelow40HpGate), Moves.BEAT_UP),
    yuMove(new SelfStatusMove(Moves.YU_CHUMLINE_SPIRAL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false), Moves.RAIN_DANCE),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_TETHER, Type.WATER, MoveCategory.SPECIAL, 60, 90, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, foeBelow50HpGate), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_UNDERTOW_NULL, Type.WATER, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeAbove50HpGate, 50), Moves.SCALD),
    yuMove(new AttackMove(Moves.YU_RIPTIDE_REPEL, Type.WATER, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(ClearHazardsAttr), Moves.LIQUIDATION),
    yuMove(new AttackMove(Moves.YU_SALTWATER_SCAR, Type.WATER, MoveCategory.PHYSICAL, 60, 100, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SALT_CURED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 50, foeBelow50HpGate), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_FROSTWAKE_LUNGE, Type.ICE, MoveCategory.PHYSICAL, 85, 95, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, foeNotAbove60HpGate, 10)
      .attr(ConditionalHighCritAttr, foeAbove60HpGate, 30), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_CIRCLING_WITHDRAWAL, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 30, foeBelow40HpGate), Moves.BRUTAL_SWING),
    yuMove(new SelfStatusMove(Moves.YU_COLD_BLOOD_FOCUS, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(AddArenaTagAttr, ArenaTagType.NO_CRIT, 5, true, true), Moves.HONE_CLAWS),
  );
}
export function registerYuDuelmonEntry156(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SAPRUNNER_FEINT, Type.GRASS, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, grassAllyFaintedGate), Moves.POUNCE),
    yuMove(new AttackMove(Moves.YU_BRIAR_SPLITTER, Type.GRASS, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ScreenBreakAttr)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 30, grassAllyFaintedGate), Moves.LEAF_BLADE),
    yuMove(new SelfStatusMove(Moves.YU_GROVE_OATH, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true), Moves.GRASSY_TERRAIN),
    yuMove(new SelfStatusMove(Moves.YU_BARKBOUND_GUARD, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(AddBattlerTagAttr, BattlerTagType.INGRAIN), Moves.INGRAIN),
    yuMove(new AttackMove(Moves.YU_SUNBREAK_STAMP, Type.GROUND, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SUN")
      .attr(FlinchAttr), Moves.EARTHQUAKE),
    yuMove(new AttackMove(Moves.YU_GRAVEMOSS_SLING, Type.ROCK, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 50, grassAllyFaintedGate), Moves.POWER_GEM),
    yuMove(new SelfStatusMove(Moves.YU_GROVE_RALLY, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, grassAllyFaintedGate), Moves.SWORDS_DANCE),
    yuMove(new AttackMove(Moves.YU_ANCESTRAL_BARKFALL, Type.GRASS, MoveCategory.PHYSICAL, 70, 90, 10, -1, -1, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(ConditionalHighCritAttr, grassAllyFaintedGate, 30), Moves.WOOD_HAMMER),
    yuMove(new AttackMove(Moves.YU_CANOPY_COUNTERMARCH, Type.GRASS, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(ClearHazardsAttr), Moves.SEED_BOMB),
  );
}
export function registerYuDuelmonEntry157(allMoves: Move[]): void {
  allMoves.push(
    yuGadgetMove(new AttackMove(Moves.YU_EMERALD_RATCHET, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(GatedMultiHitAttr, MultiHitType._2, gadgetMoveGate2)
      .attr(GatedRemoveHeldItemAttr, gadgetMoveGate2), Moves.GEAR_GRIND),
    yuGadgetMove(new AttackMove(Moves.YU_GREENCIRCUIT_QUICKSTEP, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 30, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 30)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(GatedIncrementMovePriorityAttr, grassyTerrainGate, 1), Moves.GRASSY_GLIDE),
    yuGadgetMove(new AttackMove(Moves.YU_CHLOROSTEEL_WELD, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, grassyTerrainGate), Moves.STEEL_BEAM),
    yuGadgetMove(new AttackMove(Moves.YU_GEARJACK_HAMMER, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(RecoilAttr, false, 0.25)
      .attr(ConditionalFlinchAttr, 35, grassyTerrainGate)
      .attr(GatedRecoilNegateAttr, grassyTerrainGate), Moves.HAMMER_ARM),
    yuGadgetMove(new AttackMove(Moves.YU_RED_GEAR_IGNITION, Type.FIRE, MoveCategory.SPECIAL, 80, 95, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SUN")
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, gadgetMoveGate2, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, gadgetMoveGate2, 100), Moves.FIRE_BLAST),
    yuGadgetMove(new SelfStatusMove(Moves.YU_HEAT_SINK_BLOOM, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(StatChangeAttr, BattleStat.SPDEF, -2, true), Moves.GRASSY_TERRAIN),
    yuGadgetMove(new AttackMove(Moves.YU_PHYTOMETAL_TETHER, Type.GRASS, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 30, grassyTerrainGate), Moves.SNAP_TRAP),
    yuGadgetMove(new AttackMove(Moves.YU_EJECTOR_LUNGE, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 50, moveIsSeGate), Moves.METEOR_MASH),
  );
}
export function registerYuDuelmonEntry158(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STONEPLUME_SLASH, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, userDamagedThisTurnGate, 50), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_HIDEHOOK_REND, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr)
      .attr(ConditionalHealAttr, 0.25, userDamagedThisTurnGate), Moves.FALSE_SURRENDER),
    yuMove(new AttackMove(Moves.YU_BASALT_WINGBREAK, Type.ROCK, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, userDamagedThisTurnGate, 50), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_PELTBREAKER_PRESS, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(UseDefenseStatAsAttackAttr)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userDamagedThisTurnGate), Moves.BODY_PRESS),
    yuMove(new AttackMove(Moves.YU_RICOCHET_RIPOSTE, Type.STEEL, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5)
      .attr(ResetTailwindFromStartAttr, 30)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.SPIN_OUT),
    yuMove(new SelfStatusMove(Moves.YU_MIRRORHIDE_STANCE, Type.STEEL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr, BattlerTagType.KINGS_SHIELD)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPD, -1, true), Moves.KINGS_SHIELD),
    yuMove(new SelfStatusMove(Moves.YU_MOLTED_DECOY, Type.NORMAL, -1, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.EVA, 2, true, userDamagedThisTurnGate, 50), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_SHRAPNEL_WAKE, Type.ROCK, MoveCategory.PHYSICAL, 70, 95, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(SelfHpCostAttr, 0.125), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_GALEBACK_SHOVE, Type.FLYING, MoveCategory.PHYSICAL, 65, 95, 10, -1, -1, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(HealAttr, 0.125)
      .attr(ConditionalSelfHealAttr, 0.125, 0.25, userDamagedThisTurnGate), Moves.PECK),
    yuMove(new AttackMove(Moves.YU_GLANCING_COUNTERBLOW, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3), Moves.SKULL_BASH),
    yuMove(new StatusMove(Moves.YU_WEAPON_JAM, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true, null, true, false, MoveEffectTrigger.POST_APPLY), Moves.DISABLE),
    yuMove(new AttackMove(Moves.YU_DUSTWAKE_CRY, Type.ROCK, MoveCategory.SPECIAL, 75, 95, 10, 30, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SAND", 30)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, userDamagedThisTurnGate, 50), Moves.ANCIENT_POWER),
    yuMove(new AttackMove(Moves.YU_TALON_LATCH, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(MutualTrapAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userDamagedThisTurnGate, 50), Moves.THROAT_CHOP),
    yuMove(new AttackMove(Moves.YU_SEAMFINDER_TALON, Type.STEEL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, userUndamagedThisTurnGate, 10)
      .attr(ConditionalHighCritAttr, userDamagedThisTurnGate, 30)
      .attr(IgnoreDefensiveStagesAttr), Moves.STEEL_ROLLER),
  );
}
export function registerYuDuelmonEntry159(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_AXISBREAKER_CLEAVE, Type.GROUND, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(ResetGravityFromStartAttr), Moves.BONE_RUSH),
    yuMove(new AttackMove(Moves.YU_JOINTLINE_FLICKER, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHighCritAttr, gravityInactiveGate, 10)
      .attr(ConditionalHighCritAttr, gravityActiveGate, 30), Moves.BONE_CLUB),
    yuMove(new AttackMove(Moves.YU_FALLING_KEYSTONE, Type.ROCK, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(FlinchAttr)
      .attr(AddMovePowerAttr, 40, gravityActiveGate), Moves.ROCK_BLAST),
    yuMove(new AttackMove(Moves.YU_SIGHTLINE_RUIN, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, gravityActiveGate, 50), Moves.BULLDOZE),
    yuMove(new AttackMove(Moves.YU_SANDGRIP_CARVE, Type.GROUND, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.SAND_TOMB)
      .attr(ConditionalTrapAttr, BattlerTagType.SAND_TOMB, 50, gravityActiveGate), Moves.DIG),
    yuMove(new AttackMove(Moves.YU_STRAPBREAK_HOOK, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, gravityActiveGate, 50), Moves.STEEL_WING),
    yuMove(new AttackMove(Moves.YU_QUARRY_SIPHON, Type.GROUND, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, gravityActiveGate), Moves.EARTH_POWER),
    yuMove(new AttackMove(Moves.YU_COUNTERWEIGHT_BURST, Type.STEEL, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL, 2.5)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.METAL_BURST),
    yuMove(new AttackMove(Moves.YU_PLUMBLINE_SIGHT, Type.PSYCHIC, MoveCategory.SPECIAL, 90, 100, 10, -1, 0, 9)
      .attr(ResetGravityFromStartAttr)
      .attr(StatChangeAttr, BattleStat.ACC, 1, true), Moves.FUTURE_SIGHT),
    yuMove(new AttackMove(Moves.YU_AXIS_DRAG, Type.GROUND, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, gravityActiveGate, 100), Moves.MUD_SHOT),
    yuMove(new AttackMove(Moves.YU_SINGULARITY_CLEAVE, Type.GROUND, MoveCategory.PHYSICAL, 130, 50, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedAlwaysHitAttr, gravityActiveGate), Moves.HIGH_HORSEPOWER),
    yuMove(new AttackMove(Moves.YU_STONEWARD_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(AddArenaTagChanceAttr, ArenaTagType.REFLECT, 5, 30, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, gravityActiveGate, 100, false, true), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_LIDWEIGHT_LASH, Type.GROUND, MoveCategory.PHYSICAL, 75, 95, 10, 30, 0, 9)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.DROWSY, false, true, gravityInactiveGate, 30)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.DROWSY, false, true, gravityActiveGate, 50), Moves.BONEMERANG),
    yuMove(new AttackMove(Moves.YU_APEX_DOWNFALL, Type.GROUND, MoveCategory.PHYSICAL, 100, 90, 10, 30, -1, 9)
      .attr(ResetGravityFromStartAttr)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false), Moves.DRILL_RUN),
  );
}
export function registerYuDuelmonEntry160(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_JETFEINT_NEEDLE, Type.FLYING, MoveCategory.PHYSICAL, 65, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, windChargeGate, 50), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_CROSSWIND_REND, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedMovePowerMultiplierAttr, windChargeGate, 1.3), Moves.PLUCK),
    yuMove(new AttackMove(Moves.YU_BAROMETRIC_SLASH, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ResetTailwindFromStartAttr, 50, windChargeGate), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_WAKE_TURBINE_HOOK, Type.FLYING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(RemoveOrStealHeldItemAttr, windChargeGate), Moves.SKY_ATTACK),
    yuMove(new AttackMove(Moves.YU_SHEARWALL_GUST, Type.FLYING, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, windChargeGate, 50), Moves.GUST),
    yuMove(new AttackMove(Moves.YU_SWELLSTEP_LUNGE, Type.FLYING, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, windChargeGate, 30), Moves.SKY_DROP),
    yuMove(new AttackMove(Moves.YU_PRESSUREFRONT_CRASH, Type.NORMAL, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.EVA, -1, false, windChargeGate, 50), Moves.SMELLING_SALTS),
    yuMove(new AttackMove(Moves.YU_GRAVELCLOUD_STRIKE, Type.ROCK, MoveCategory.PHYSICAL, 75, 95, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.ROCK_THROW),
    yuMove(new AttackMove(Moves.YU_UNDERTOW_CROSSCURRENT, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, windChargeGate), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_THUNDERHEAD_SNAP, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -1, false, windChargeGate, 50), Moves.ELECTRO_BALL),
    yuMove(new AttackMove(Moves.YU_BLINDSIDE_CONVECTIVE, Type.FLYING, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, foeAccNegativeGate, 1.3), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_RETURNWIND_DECREE, Type.FLYING, MoveCategory.SPECIAL, 90, 95, 10, 30, -1, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(StatChangeAttr, BattleStat.ACC, -2, false)
      .attr(GatedForceSwitchOutAttr, false, false, windChargeGate), Moves.HURRICANE),
  );
}
export function registerYuDuelmonEntry161(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ESCALATING_WINDCUTTER, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 30, 0, 9)
      .attr(ConsecutiveUsePowerAttr, 15)
      .attr(ForceSwitchOutAttr, false, false), Moves.STRUGGLE),
    yuMove(new AttackMove(Moves.YU_SLIPSTREAM_LANCER, Type.NORMAL, MoveCategory.PHYSICAL, 65, 100, 10, -1, 1, 9)
      .attr(GatedMovePowerMultiplierAttr, tailwindActiveGate, 1.3), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_TRENCHLINE_CARVE, Type.GROUND, MoveCategory.PHYSICAL, 80, 95, 10, 30, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(ConditionalAddArenaTrapTagAttr, ArenaTagType.SPIKES, 50, tailwindActiveGate), Moves.FISSURE),
    yuMove(new AttackMove(Moves.YU_CAPSTONE_BOMBARDMENT, Type.ROCK, MoveCategory.PHYSICAL, 75, 95, 10, 30, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ConditionalAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, 50, tailwindActiveGate), Moves.ROCK_WRECKER),
    yuMove(new AttackMove(Moves.YU_DEBRIS_SCHEDULING, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, -1, 0, 9)
      .attr(DelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }))
      .attr(GatedForceSwitchOutAttr, false, false, tailwindActiveGate, 30), Moves.FUTURE_SIGHT),
    yuMove(new AttackMove(Moves.YU_CHOKEPOINT_COMPRESSION, Type.NORMAL, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, tailwindActiveGate), Moves.SUPER_FANG),
    yuMove(new SelfStatusMove(Moves.YU_TAILGUST_BANNER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES), Moves.TAILWIND),
    yuMove(new AttackMove(Moves.YU_STANCE_VOID_CUTTER, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(IgnoreDefensiveStagesAttr), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_COUNTERGUST_RIPOSTE, Type.STEEL, MoveCategory.PHYSICAL, -1, -1, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(HealAttr, 0.125)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.SUNSTEEL_STRIKE),
    yuMove(new AttackMove(Moves.YU_VORTEX_LOCKDOWN, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ConditionalDisableMoveAttr, tailwindActiveGate, 50), Moves.THRASH),
  );
}
export function registerYuDuelmonEntry162(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DIVECALL_STINGER, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, flyingAllyGate3, 30), Moves.AERIAL_ACE),
    yuMove(new AttackMove(Moves.YU_PLUME_DRAIN, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, 50, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, flyingAllyGate3), Moves.DYNAMAX_CANNON),
    yuMove(new AttackMove(Moves.YU_SKYCROWN_SLAM, Type.FLYING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, flyingAllyGate3, 50), Moves.BRAVE_BIRD),
    yuMove(new AttackMove(Moves.YU_PINION_RELAY, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, tailwindActiveGate, 1.3)
      .attr(GatedForceSwitchOutAttr, false, false, flyingAllyGate3, 30), Moves.BEAK_BLAST),
    yuMove(new StatusMove(Moves.YU_WINGWALL_MANDATE, Type.FLYING, -1, 10, -1, -1, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ResetTailwindFromStartAttr, 50, flyingAllyGate3), Moves.TAILWIND),
    yuMove(new StatusMove(Moves.YU_CHORUS_TAILGUST, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, flyingAllyGate3), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_FEATHERBLADE_ARC, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, flyingAllyGate3), Moves.BEHEMOTH_BLADE),
    yuMove(new AttackMove(Moves.YU_AERIE_DECREE, Type.FLYING, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(ResetTailwindFromStartAttr, 50, flyingAllyGate3), Moves.DRAGON_ASCENT),
  );
}
export function registerYuDuelmonEntry163(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_HOLLOW_SABERLINE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, userDefStageGte2Gate, 50), Moves.METAL_CLAW),
    yuMove(new AttackMove(Moves.YU_VOID_LANCET_THRUST, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(AddMovePowerAttr, 40, userDefStageGte2Gate), Moves.SHADOW_FORCE),
    yuMove(new AttackMove(Moves.YU_CUIRASS_IMPACT, Type.STEEL, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(UseDefenseStatAsAttackAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userDefStageGte2Gate, 50), Moves.BEHEMOTH_BLADE),
    yuMove(new SelfStatusMove(Moves.YU_SPECTRAL_CURSE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(CurseAttr)
      .target(MoveTarget.CURSE), Moves.CURSE),
    yuMove(new AttackMove(Moves.YU_ECTOPLASMIC_RIPOSTE, Type.GHOST, MoveCategory.SPECIAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, userDefStageGte2Gate, 30)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.OMINOUS_WIND),
    yuMove(new AttackMove(Moves.YU_HAUNTED_ADDITION, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ChangeFoePrimaryTypeAttr, "GHOST", 100)
      .attr(AddMovePowerAttr, 40, userDefStageGte2Gate), Moves.SHADOW_CLAW),
    yuMove(new StatusMove(Moves.YU_HOLLOW_EQUALIZATION, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(MatchFoeHpToUserAttr), Moves.LAST_RESPECTS),
    yuMove(new AttackMove(Moves.YU_COFFIN_PLATE_CRASH, Type.STEEL, MoveCategory.PHYSICAL, 120, 90, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userDefStageGte2Gate), Moves.GEAR_GRIND),
    yuMove(new AttackMove(Moves.YU_VISOR_LOCK_DISABLE, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(DisableMoveAttr)
      .attr(AddMovePowerAttr, 40, userDefStageGte2Gate), Moves.PHANTOM_FORCE),
    yuMove(new SelfStatusMove(Moves.YU_PLATE_REASSEMBLY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.SHELTER),
    yuMove(new AttackMove(Moves.YU_GAUNTLET_TORMENT, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, alwaysTrueGate, 30), Moves.LICK),
    yuMove(new AttackMove(Moves.YU_DREAD_PERIMETER, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ResetGravityFromStartAttr)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, userDefStageGte2Gate), Moves.WHIRLPOOL),
  );
}
export function registerYuDuelmonEntry164(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BRACKETING_QUAKESTEP, Type.GROUND, MoveCategory.PHYSICAL, 30, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3), Moves.BONE_RUSH),
    yuMove(new AttackMove(Moves.YU_SINGLE_LENS_FOCUS, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalHighCritAttr, paralyzedGate, 30), Moves.VEEVEE_VOLLEY),
    yuMove(new AttackMove(Moves.YU_KILOCALORIE_HAYMAKER, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(RecoilAttr, false, 0.125), Moves.TAKE_DOWN),
    yuMove(new AttackMove(Moves.YU_NAPALM_CALIBRATION, Type.FIRE, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(RecoilAttr, false, 0.25), Moves.FLARE_BLITZ),
    yuMove(new AttackMove(Moves.YU_COLOSSUS_CLOBBER, Type.ELECTRIC, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchOrParalysisPerHitAttr, 5, paralyzedGate), Moves.BOLT_STRIKE),
    yuMove(new AttackMove(Moves.YU_SEISMIC_DEBIT, Type.GROUND, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(FlinchOrParalysisAttr, 30)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3), Moves.BULLDOZE),
    yuMove(new AttackMove(Moves.YU_FLATTEN_DIRECTIVE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, 30, 0, 9)
      .attr(ForceSwitchOutAttr, false, false), Moves.VISE_GRIP),
    yuMove(new AttackMove(Moves.YU_STONEBIND_SNARE, Type.ROCK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .addAttr(Object.assign(new PartyStatusCureAttr(i18next.t("moveTriggers:bellChimed"), Abilities.NONE), { selfTarget: true })), Moves.ROLLOUT),
    yuMove(new SelfStatusMove(Moves.YU_LENS_WIDE_ROAR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, 1, true)
      .attr(AddBattlerTagAttr, BattlerTagType.CRIT_BOOST, true, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.NOBLE_ROAR),
    yuMove(new AttackMove(Moves.YU_TITANIC_RELAY, Type.WATER, MoveCategory.PHYSICAL, 70, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, paralyzedGate, 50), Moves.JET_PUNCH),
    yuMove(new AttackMove(Moves.YU_NULLIFYING_CLUTCH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, paralyzedGate, 50), Moves.CONSTRICT),
    yuMove(new AttackMove(Moves.YU_SKYLINE_DROPKICK, Type.FLYING, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(TriTypeSimultaneousStrikeAttr, [Type.FLYING,Type.FIGHTING]), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_APEX_SIMPLIFIER, Type.NORMAL, MoveCategory.PHYSICAL, 120, 80, 10, -1, 0, 9)
      .attr(ChangeFoePrimaryTypeAttr, "NORMAL", 100)
      .attr(SuppressAbilitiesAttr)
      .attr(StatChangeAttr, BattleStat.SPD, -1, true)
      .attr(StatChangeAttr, BattleStat.ATK, -1, true), Moves.HYPER_FANG),
  );
}
export function registerYuDuelmonEntry165(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MORASS_FANG, Type.POISON, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, trappedGate, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, trappedGate, 30), Moves.POISON_FANG),
    yuMove(new StatusMove(Moves.YU_ADHESIVE_WRIT, Type.POISON, -1, 10, 100, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(StatusEffectAttr, StatusEffect.POISON), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_CAUSTIC_SKEWER, Type.POISON, MoveCategory.PHYSICAL, 95, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.INFESTATION)
      .attr(SuperEffectiveVsGroundAttr, [Type.GROUND], trappedGate), Moves.POISON_JAB),
    yuMove(new AttackMove(Moves.YU_OSMOTIC_JET, Type.POISON, MoveCategory.SPECIAL, 80, 100, 10, -1, 1, 9)
      .attr(TypeOverrideAttr, Type.WATER), Moves.VENOSHOCK),
    yuMove(new AttackMove(Moves.YU_GEL_DRIVER, Type.ICE, MoveCategory.PHYSICAL, 90, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, trappedGate, 35), Moves.AVALANCHE),
    yuMove(new AttackMove(Moves.YU_PRIORITY_NIBBLE, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate), Moves.CROSS_POISON),
    yuMove(new AttackMove(Moves.YU_CRYOADHESIVE_BURST, Type.ICE, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, trappedGate, 50), Moves.ICE_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_BILE_COUNTER, Type.POISON, -1, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(DoubleToxicSpikesLayersAttr, userDamagedThisTurnGate), Moves.TOXIC_SPIKES),
  );
}
export function registerYuDuelmonEntry166(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SHARD_HARPOON, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ChanceCurseAttr, 1)
      .attr(GatedCurseAttr, confusedGate, 5), Moves.SHADOW_PUNCH),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_SKEWER, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalHighCritAttr, confusedGate, 30), Moves.COMEUPPANCE),
    yuMove(new AttackMove(Moves.YU_GRAVE_LAMENT, Type.GHOST, MoveCategory.PHYSICAL, 50, 100, 10, 30, 0, 9)
      .attr(LastRespectsAttr)
      .attr(ConfuseAttr), Moves.LAST_RESPECTS),
    yuMove(new AttackMove(Moves.YU_SOUL_SIPHON, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(RandomStatBoostAllAttr, 1, 10)
      .attr(RandomStatBoostAllAttr, 1, 20, confusedGate), Moves.NIGHT_SHADE),
    yuMove(new AttackMove(Moves.YU_HAUNTED_BURST, Type.GHOST, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, confusedGate, 50), Moves.INFERNAL_PARADE),
    yuMove(new AttackMove(Moves.YU_GRAVE_RELAY, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ChangeFoePrimaryTypeAttr, "GHOST", 100)
      .attr(ConfuseAttr), Moves.PHANTOM_FORCE),
    yuMove(new AttackMove(Moves.YU_GASPING_DOOM, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(PursuitSwitchMultiplierAttr, 2), Moves.NIGHT_DAZE),
  );
}
export function registerYuDuelmonEntry167(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FREEZER_FANG, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, speedStageGte2Gate, 50), Moves.ICE_FANG),
    yuMove(new AttackMove(Moves.YU_BROIL_FANG, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .bitingMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalFlinchAttr, 35, speedStageGte2Gate), Moves.FIRE_FANG),
    yuMove(new AttackMove(Moves.YU_TOXIN_GULP, Type.POISON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .bitingMove()
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(GatedMovePowerMultiplierAttr, foePoisonedGate, 2), Moves.POISON_FANG),
    yuMove(new AttackMove(Moves.YU_GULP_DASH, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, speedStageGte2Gate), Moves.AQUA_JET),
    yuMove(new SelfStatusMove(Moves.YU_DELUXE_3, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.CAMOUFLAGE),
    yuMove(new AttackMove(Moves.YU_JAW_LOCK, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .bitingMove()
      .attr(JawLockAttr), Moves.JAW_LOCK),
    yuMove(new AttackMove(Moves.YU_DEVOURING_SLAM, Type.DARK, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .bitingMove()
      .attr(PostVictoryHealAttr, 0.5), Moves.DARKEST_LARIAT),
    yuMove(new AttackMove(Moves.YU_DRIVE_THROUGH_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, speedStageGte2Gate, 100), Moves.CRUSH_GRIP),
    yuMove(new AttackMove(Moves.YU_WRAPPER_TOSS, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(GatedForceSwitchOutAttr, false, false, speedStageGte2Gate, 50), Moves.COVET),
    yuMove(new AttackMove(Moves.YU_ALL_YOU_CAN_EAT, Type.DARK, MoveCategory.PHYSICAL, 20, 90, 10, -1, 0, 9)
      .bitingMove()
      .attr(TripleAccelMultiHitAttr)
      .attr(MultiHitPowerIncrementAttr, 3), Moves.BEAT_UP),
  );
}
export function registerYuDuelmonEntry168(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TORRENT_CLAW, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.SHADOW_CLAW),
    yuMove(new AttackMove(Moves.YU_HYDRO_SAW, Type.WATER, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(SuperEffectiveVsTypesAttr, [Type.STEEL, Type.GRASS]), Moves.AQUA_STEP),
    yuMove(new AttackMove(Moves.YU_CLONE_PRESSURE, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(FreeSubstituteAttr, 30), Moves.AQUA_CUTTER),
    yuMove(new AttackMove(Moves.YU_DELUGE_DRIVER, Type.WATER, MoveCategory.PHYSICAL, 100, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, hasSubstituteGate, 50), Moves.AQUA_TAIL),
    yuMove(new AttackMove(Moves.YU_MAELSTROM_GRIP, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, hasSubstituteGate), Moves.LIQUIDATION),
    yuMove(new AttackMove(Moves.YU_CLONE_RUSH, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FreeSubstituteAttr, 10)
      .attr(GatedMovePowerMultiplierAttr, below30HpGate, 1.3), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_CLONE_WAVE, Type.WATER, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(SuperEffectiveVsGrassAttr)
      .attr(BreakSubstituteAttr, true, hasSubstituteGate)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, hasSubstituteGate, 100), Moves.WAVE_CRASH),
    yuMove(new SelfStatusMove(Moves.YU_REGENERATION_POOL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.3)
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false), Moves.AQUA_RING),
    yuMove(new AttackMove(Moves.YU_WHIRLPOOL_SEAL, Type.WATER, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 100, hasSubstituteGate), Moves.CRABHAMMER),
    yuMove(new AttackMove(Moves.YU_TSUNAMI_REAVER, Type.DRAGON, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 2), Moves.WATER_SPOUT),
  );
}
export function registerYuDuelmonEntry169(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CRYSTAL_EDGE, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatusByMoveTypeAttr, 35, 35), Moves.SONIC_BOOM),
    yuMove(new AttackMove(Moves.YU_SALT_CRUSH, Type.ROCK, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, saltCureGate, 30), Moves.POWER_GEM),
    yuMove(new AttackMove(Moves.YU_GROUND_FRACTURE, Type.NORMAL, MoveCategory.SPECIAL, 90, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(RecoilAttr, false, 0.5), Moves.SPIT_UP),
    yuMove(new AttackMove(Moves.YU_GLACIAL_DRAIN, Type.ICE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, frozenGate), Moves.ICICLE_SPEAR),
    yuMove(new AttackMove(Moves.YU_PERMAFROST_BREATH, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(EruptionStyleHpPowerAttr), Moves.DRAGON_BREATH),
    yuMove(new AttackMove(Moves.YU_CRYSTAL_RUSH, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true), Moves.QUICK_ATTACK),
  );
}
export function registerYuDuelmonEntry170(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_HAMMER_SLAM, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false), Moves.ICE_HAMMER),
    yuMove(new AttackMove(Moves.YU_GROUND_CHARGE, Type.GROUND, MoveCategory.PHYSICAL, 95, 100, 10, -1, 0, 9)
      .attr(DigChargeAttr)
      .attr(HighCritAttr), Moves.LANDS_WRATH),
    yuMove(new AttackMove(Moves.YU_SPIKE_HAMMER_DROP, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(PostVictoryStatBoostAttr, onKoGate), Moves.HAMMER_ARM),
    yuMove(new SelfStatusMove(Moves.YU_HAZARD_SCATTER, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.SPIKES),
    yuMove(new AttackMove(Moves.YU_CONCUSSION_STRIKE, Type.ELECTRIC, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, foeBelow50HpGate, 50), Moves.BOLT_STRIKE),
  );
}
export function registerYuDuelmonEntry171(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOID_BLAST, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ReduceLastMovePpAttr, 3, 100, foeConfusedOrParalyzedGate), Moves.TECHNO_BLAST),
    yuMove(new AttackMove(Moves.YU_SHADOW_PULSE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalFlinchAttr, 35, foeConfusedOrParalyzedGate), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_MIND_REND, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(GatedDisableMoveAttr, foeConfusedOrParalyzedGate), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_PHANTOM_TENDRIL, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(DelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }))
      .attr(GatedSuppressAbilitiesAttr, foeConfusedOrParalyzedGate), Moves.FUTURE_SIGHT),
    yuMove(new SelfStatusMove(Moves.YU_VEILED_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, true, true)
      .attr(StatChangeAttr, BattleStat.SPD, 2, true), Moves.LIGHT_SCREEN),
    yuMove(new SelfStatusMove(Moves.YU_MIND_FORTRESS, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.CALM_MIND),
    yuMove(new AttackMove(Moves.YU_FACELESS_GAZE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 100, foeConfusedOrParalyzedGate), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_MIND_BIND, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 30, foeConfusedOrParalyzedGate), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_WARP_REVERSAL, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3)
      .attr(GatedInvertStatsAttr, foeConfusedOrParalyzedGate), Moves.MIRROR_COAT),
  );
}
export function registerYuDuelmonEntry172(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CYBER_PULSE, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, paralyzedGate), Moves.ELECTRO_DRIFT),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalDisableMoveAttr, paralyzedGate, 50), Moves.MIST_BALL),
    yuMove(new AttackMove(Moves.YU_QUICK_CIRCUIT, Type.ELECTRIC, MoveCategory.SPECIAL, 60, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.VOLT_SWITCH),
    yuMove(new SelfStatusMove(Moves.YU_SYSTEM_BOOT, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(AddBattlerTagAttr, BattlerTagType.CRIT_BOOST, true, true), Moves.THUNDER_WAVE),
    yuMove(new AttackMove(Moves.YU_DARK_SIGNAL, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StealHeldItemAttr, 30)
      .attr(ConditionalHitHealAttr, 0, 0.5, paralyzedGate), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_EMP_BURST, Type.PSYCHIC, MoveCategory.SPECIAL, 130, 50, 5, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(GatedSuppressAbilitiesAttr, paralyzedGate), Moves.MYSTICAL_POWER),
    yuMove(new AttackMove(Moves.YU_INTERFERENCE_WAVE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.ACC, -2, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, paralyzedGate, 50), Moves.PSYWAVE),
    yuMove(new AttackMove(Moves.YU_DISRUPTION_FIELD, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ChanceDisableMoveAttr, 30)
      .attr(ConditionalDisableMoveAttr, paralyzedGate, 50), Moves.DISCHARGE),
    yuMove(new AttackMove(Moves.YU_OVERLOAD_BLAST, Type.ELECTRIC, MoveCategory.SPECIAL, -1, 100, 5, 20, 0, 9)
      .attr(HpScaledPowerAttr)
      .attr(FlinchAttr), Moves.DOOM_DESIRE),
    yuMove(new AttackMove(Moves.YU_ANTI_ORGANIC_BEAM, Type.POISON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(SuperEffectiveVsTypesAttr, [Type.NORMAL, Type.WATER, Type.GRASS, Type.FIGHTING]), Moves.MALIGNANT_CHAIN),
  );
}
export function registerYuDuelmonEntry173(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_JUNK_PUNCH, Type.FIGHTING, MoveCategory.PHYSICAL, 40, 100, 10, -1, 1, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, tailwindActiveGate, 50), Moves.MACH_PUNCH),
    yuMove(new AttackMove(Moves.YU_SCRAP_BULLET, Type.STEEL, MoveCategory.PHYSICAL, 40, 100, 10, -1, 1, 9)
      .attr(ConditionalHighCritAttr, tailwindActiveGate, 30), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_SHARD_SALVAGE, Type.ICE, MoveCategory.PHYSICAL, 40, 100, 10, 10, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, tailwindActiveGate, 35), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_AQUA_SCRAP, Type.WATER, MoveCategory.PHYSICAL, 40, 100, 10, -1, 1, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, tailwindActiveGate), Moves.AQUA_JET),
    yuMove(new AttackMove(Moves.YU_SCRAPYARD_GALE, Type.NORMAL, MoveCategory.PHYSICAL, 45, 100, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, tailwindActiveGate, 50), Moves.CUT),
    yuMove(new AttackMove(Moves.YU_SALVAGE_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 40, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalFlinchAttr, 35, tailwindActiveGate), Moves.CRUSH_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_PARTS_RECLAIM, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ShedTailSubstituteAttr), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_JUNKYARD_AMBUSH, Type.DARK, MoveCategory.PHYSICAL, 40, 100, 10, -1, 1, 9)
      .attr(ResetTailwindFromStartAttr, 30)
      .attr(GatedRemoveHeldItemChanceAttr, tailwindActiveGate, 50), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_PLUG_JAB, Type.POISON, MoveCategory.PHYSICAL, 40, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, tailwindActiveGate, 30), Moves.SPARK),
    yuMove(new AttackMove(Moves.YU_JUNK_GRENADE, Type.GROUND, MoveCategory.PHYSICAL, 40, 100, 10, 100, 0, 9)
      .attr(TrapAttr, BattlerTagType.SAND_TOMB)
      .attr(GatedConsecutiveUsePowerAttr, 15, andGate(tailwindActiveGate, consecutiveUseGate)), Moves.MAGNITUDE),
  );
}
export function registerYuDuelmonEntry174(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CYCLONE_SLASH, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagChanceAttr, ArenaTagType.REFLECT, false, 30)
      .attr(ConditionalHighCritAttr, foeBelow30HpGate, 50), Moves.PSYCHO_CUT),
    yuMove(new AttackMove(Moves.YU_WIND_RUSH, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 1, 9)
      .attr(ConditionalFlinchAttr, 35, reflectActiveGate), Moves.GUST),
    yuMove(new SelfStatusMove(Moves.YU_TAILWIND_BURST, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, reflectActiveGate, 100), Moves.TAILWIND),
    yuMove(new AttackMove(Moves.YU_UPDRAFT_DRAIN, Type.FLYING, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(SuperEffectiveVsTypesAttr, [Type.NORMAL, Type.ICE, Type.WATER, Type.FIRE]), Moves.AEROBLAST),
    yuMove(new AttackMove(Moves.YU_DRAGON_GUST, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(AddMovePowerAttr, 40, reflectActiveGate), Moves.DRAGON_PULSE),
    yuMove(new AttackMove(Moves.YU_TEMPEST_FANG, Type.FLYING, MoveCategory.SPECIAL, 25, 100, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(AddArenaTagChanceAttr, ArenaTagType.REFLECT, 5, 30, false, true), Moves.HURRICANE),
    yuMove(new SelfStatusMove(Moves.YU_ATMOSPHERIC_HEAL, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(TransferStatusToFoeAttr), Moves.ROOST),
    yuMove(new AttackMove(Moves.YU_SONIC_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ConsecutiveUsePowerAttr, 15), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_COUNTER_GALE, Type.FLYING, MoveCategory.PHYSICAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.BOUNCE),
  );
}
export function registerYuDuelmonEntry175(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BONE_SLASH, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .servantMove()
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(HighCritAttr)
      .attr(FoeLowHpPowerAttr, 60, userAnyStatGte2Gate), Moves.SHADOW_BONE),
    yuMove(new AttackMove(Moves.YU_DARK_COMMAND, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .servantMove()
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalFlinchAttr, 10, alwaysTrueGate)
      .attr(ConditionalDisableMoveAttr, userAnyStatGte2Gate, 50), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_SERVANT_SIP, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .servantMove()
      .attr(HitHealAttr, 0.33)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAnyStatGte2Gate), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_CRYPT_VOLLEY, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .servantMove()
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(GatedDelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }), userAnyStatGte2Gate, 50), Moves.BONE_RUSH),
    yuMove(new SelfStatusMove(Moves.YU_SOVEREIGN_GUARD, Type.GHOST, -1, 10, -1, 4, 9)
      .servantMove()
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.GRUDGE),
    yuMove(new SelfStatusMove(Moves.YU_NECROMANTIC_SURGE, Type.DARK, -1, 10, -1, 0, 9)
      .servantMove()
      .attr(HealAttr, 0.33)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.OBSTRUCT),
    yuMove(new AttackMove(Moves.YU_SERVANT_RUSH, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, 30, 1, 9)
      .servantMove()
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StealRandomPositiveStatAttr, 50, userAnyStatGte2Gate), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_DEATHGRIP, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, 100, 0, 9)
      .servantMove()
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ReduceLastMovePpAttr, 4, 50, userAnyStatGte2Gate), Moves.SINISTER_ARROW_RAID),
    yuMove(new AttackMove(Moves.YU_REGAL_TORMENT, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .servantMove()
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, userAnyStatGte2Gate, 50), Moves.FEINT_ATTACK),
    yuMove(new AttackMove(Moves.YU_CROWN_CRUSH, Type.DARK, MoveCategory.PHYSICAL, 110, 80, 10, -1, 0, 9)
      .servantMove()
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedMatchHpAttr, userAnyStatGte2Gate), Moves.FLING),
  );
}
export function registerYuDuelmonEntry176(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SKY_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .unionMove()
      .attr(FlinchAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, alwaysTrueGate, 30)
      .attr(IgnoreDefensiveStagesAttr, unionGate2), Moves.CRUSH_GRIP),
    yuMove(new AttackMove(Moves.YU_SONIC_CRY, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .unionMove()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalFlinchAttr, 35, unionGate2), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_BREEZE_SLASH, Type.FLYING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .unionMove()
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, unionGate2, 30), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_GROUND_DIVE, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .unionMove()
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(AddMovePowerAttr, 40, unionGate2), Moves.PRECIPICE_BLADES),
    yuMove(new AttackMove(Moves.YU_COMPANION_RALLY, Type.FLYING, MoveCategory.PHYSICAL, 20, 100, 10, 10, 0, 9)
      .unionMove()
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(GatedFinalHitHitHealAttr, 0.5, unionGate2), Moves.FEATHER_DANCE),
    yuMove(new AttackMove(Moves.YU_ICE_WING, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .unionMove()
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, unionGate2, 35), Moves.ICE_FANG),
    yuMove(new SelfStatusMove(Moves.YU_HEALING_WIND, Type.FLYING, -1, 10, -1, 0, 9)
      .unionMove()
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP)
      .attr(ConditionalHealAttr, 0.66, unionGate2), Moves.REFRESH),
    yuMove(new AttackMove(Moves.YU_TEMPEST_REND, Type.FLYING, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .unionMove()
      .attr(ScreenBreakAttr)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, unionGate2), Moves.WHIRLPOOL),
    yuMove(new SelfStatusMove(Moves.YU_TAILWIND_FORMATION, Type.FLYING, -1, 10, -1, 0, 9)
      .unionMove()
      .attr(ResetTailwindFromStartAttr)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedIncrementMovePriorityAttr, unionGate2, 1), Moves.TAILWIND),
  );
}
export function registerYuDuelmonEntry177(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ACID_FLASK, Type.POISON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(GatedSuppressAbilitiesAttr, foePoisonedGate, 50), Moves.ACID_SPRAY),
    yuMove(new AttackMove(Moves.YU_VOLTAGE_SPIKE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, alwaysTrueGate, 30)
      .attr(ReduceLastMovePpAttr, 2, 100, foePoisonedGate), Moves.RISING_VOLTAGE),
    yuMove(new AttackMove(Moves.YU_UNSTABLE_PUNCH, Type.FIGHTING, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(HighCritAttr)
      .attr(StageScaledPowerAttr, 10, foePoisonedGate), Moves.AURA_SPHERE),
    yuMove(new AttackMove(Moves.YU_QUICK_INJECTION, Type.POISON, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalDisableMoveAttr, foePoisonedGate, 50), Moves.POISON_STING),
    yuMove(new AttackMove(Moves.YU_EXPERIMENT_SURGE, Type.POISON, MoveCategory.SPECIAL, 50, 100, 10, -1, 0, 9)
      .attr(StageScaledPowerAttr)
      .attr(CopyFoeStatStagesAttr, foePoisonedGate), Moves.BELCH),
    yuMove(new SelfStatusMove(Moves.YU_LAB_FORTIFICATION, Type.POISON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, foePoisonedGate, 50, false, true), Moves.SAFEGUARD),
    yuMove(new StatusMove(Moves.YU_SCIENCE_INFUSION, Type.POISON, -1, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(TransferNegativeStagesAttr, userNegativeStageGate), Moves.POISON_GAS),
    yuMove(new AttackMove(Moves.YU_DARK_MATTER, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(TransferNegativeStagesAttr, userNegativeStageGate), Moves.RUINATION),
    yuMove(new StatusMove(Moves.YU_CHEMICAL_RECOVERY, Type.POISON, -1, 10, -1, 0, 9)
      .target(MoveTarget.PARTY)
      .attr(HealAttr, 0.33)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(TransferNegativeStagesAttr, userNegativeStageGate), Moves.HEAL_BELL),
    yuMove(new AttackMove(Moves.YU_CAUSTIC_BARRAGE, Type.POISON, MoveCategory.SPECIAL, 30, 90, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, lastHitOnlyGate, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, foePoisonedLastHitGate, 100), Moves.SHELL_SIDE_ARM),
    yuMove(new AttackMove(Moves.YU_NERVE_AGENT, Type.POISON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, foePoisonedGate, 100), Moves.MALIGNANT_CHAIN),
    yuMove(new AttackMove(Moves.YU_CATALYSIS, Type.POISON, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(DamagedThisTurnMultiplierAttr)
      .attr(GatedForceSwitchOutAttr, false, false, foePoisonedGate), Moves.VENOSHOCK),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_GAS, Type.POISON, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(TransferNegativeStagesAttr, userNegativeStageGate), Moves.SLUDGE),
  );
}
export function registerYuDuelmonEntry178(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FLUFFY_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.POUND),
    yuMove(new AttackMove(Moves.YU_MULTIPLY_PUFF, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(GatedForceSwitchOutAttr, false, false, hasSubstituteGate, 50), Moves.FEINT),
    yuMove(new SelfStatusMove(Moves.YU_MULTIPLY_GUARD, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.AFTER_YOU),
    yuMove(new SelfStatusMove(Moves.YU_FLUFFY_COAT, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, hasSubstituteGate, 100), Moves.ACUPRESSURE),
    yuMove(new AttackMove(Moves.YU_DARK_NIBBLE, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalFlinchAttr, 10, alwaysTrueGate)
      .attr(ReduceLastMovePpAttr, 2, 50, hasSubstituteGate), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_FIRE_PUFF, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, hasSubstituteGate, 50), Moves.FIRE_PLEDGE),
    yuMove(new AttackMove(Moves.YU_MULTIPLY_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 50, 100, 10, -1, 0, 9)
      .attr(StageScaledPowerAttr)
      .attr(CopyFoeStatStagesAttr, hasSubstituteGate), Moves.ORIGIN_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_STATIC_FUR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalAddArenaTrapTagAttr, ArenaTagType.SPIKES, 50, hasSubstituteGate), Moves.STEALTH_ROCK),
  );
}
export function registerYuDuelmonEntry179(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FLAME_LAMP, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, wishPendingGate, 50), Moves.TERRAIN_PULSE),
    yuMove(new AttackMove(Moves.YU_SHADOW_BLAZE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(GatedAddArenaTagAttr, ArenaTagType.WISH, 2, alwaysTrueGate, 30, false, true)
      .attr(ConditionalFlinchAttr, 35, wishPendingGate), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_INFERNO_SURGE, Type.FIRE, MoveCategory.SPECIAL, 90, 85, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, lastHitOnlyGate, 30)
      .attr(GatedAddArenaTagAttr, ArenaTagType.WISH, 2, burnedGate, 50, false, true), Moves.INFERNO),
    yuMove(new AttackMove(Moves.YU_GENIE_RUSH, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 1, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(GatedForceSwitchOutAttr, true, false, wishPendingGate, 50), Moves.WISH),
    yuMove(new SelfStatusMove(Moves.YU_MYSTICAL_SURGE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.REVIVAL_BLESSING),
    yuMove(new AttackMove(Moves.YU_GENIE_GRASP, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StealHeldItemAttr, 30)
      .attr(ReduceLastMovePpAttr, 2, 50, wishPendingGate), Moves.MOONGEIST_BEAM),
    yuMove(new AttackMove(Moves.YU_WISH_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, wishPendingGate), Moves.DRAINING_KISS),
    yuMove(new SelfStatusMove(Moves.YU_HAZARDOUS_SMOKE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(GatedDelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }), wishPendingGate, 50), Moves.FUTURE_SIGHT),
  );
}
export function registerYuDuelmonEntry180(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_LAVA_FIST, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, trappedGate, 50), Moves.LAVA_PLUME),
    yuMove(new AttackMove(Moves.YU_MOLTEN_SLAM, Type.FIRE, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(IgnoreDefensiveStagesAttr, trappedGate), Moves.MAGMA_STORM),
    yuMove(new AttackMove(Moves.YU_ROCK_CRUSH, Type.ROCK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, trappedGate, 100), Moves.ANCIENT_POWER),
    yuMove(new SelfStatusMove(Moves.YU_SHACKLE_BULWARK, Type.FIRE, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(ConditionalTrapAttr, BattlerTagType.SAND_TOMB, 100, trappedGate), Moves.SAND_TOMB),
    yuMove(new StatusMove(Moves.YU_MOLTEN_INFUSION, Type.POISON, -1, 10, 100, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.POISON_GAS),
    yuMove(new AttackMove(Moves.YU_EARTHQUAKE_SLAM, Type.GROUND, MoveCategory.SPECIAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(FoeLowHpPowerAttr, 60, trappedGate), Moves.MUD_SHOT),
    yuMove(new AttackMove(Moves.YU_LAVA_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_ERUPTION_COUNTER, Type.FIRE, MoveCategory.PHYSICAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL, 2)
      .attr(HealAttr, 0.125)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.COUNTER),
    yuMove(new SelfStatusMove(Moves.YU_HAZARD_MELT, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(GatedMatchFoeHpToUserAttr, trappedGate), Moves.STEALTH_ROCK),
  );
}
export function registerYuDuelmonEntry181(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PRECISION_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2)
      .attr(CritSnapshotAttr)
      .attr(FoeLowHpPowerAttr, 60, critFinalHitGate), Moves.SLASH),
    yuMove(new AttackMove(Moves.YU_RIPOSTE_CUT, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(CritSnapshotAttr)
      .attr(GatedFutureSightOnHitAttr, critThisMoveGate, 100, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" })), Moves.FAKE_OUT),
    yuMove(new AttackMove(Moves.YU_STEEL_CLEAVE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(CritSnapshotAttr)
      .attr(GatedInvertStatsAttr, critThisMoveGate), Moves.BEHEMOTH_BLADE),
    yuMove(new AttackMove(Moves.YU_SHADOW_SLASH, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(UseFoeAttackStatAttr)
      .attr(CritSnapshotAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 100, critThisMoveGate), Moves.NIGHT_SLASH),
    yuMove(new AttackMove(Moves.YU_ARMOR_PIERCER, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false)
      .attr(CritSnapshotAttr)
      .attr(CombatDepthStatDropAttr, 50, critThisMoveGate), Moves.DIZZY_PUNCH),
    yuMove(new AttackMove(Moves.YU_BLADE_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(CritSnapshotAttr)
      .attr(ConditionalFlinchAttr, 35, critFinalHitGate), Moves.FURY_CUTTER),
  );
}
export function registerYuDuelmonEntry182(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TIDAL_CANNON, Type.WATER, MoveCategory.SPECIAL, 100, 85, 5, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, null, 30)
      .attr(ResetWeatherFromStartAttr, "RAIN", 30, noRainGate), Moves.HYDRO_CANNON),
    yuMove(new AttackMove(Moves.YU_STORM_SURGE, Type.WATER, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HpScaledPowerAttr)
      .attr(GatedIgnoreOpponentStatChangesAttr, rainGate), Moves.ORIGIN_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_RAIN_SUMMON, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false), Moves.RAIN_DANCE),
    yuMove(new AttackMove(Moves.YU_TIDE_LANCE, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedDelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }), rainGate, 50), Moves.ETERNABEAM),
    yuMove(new AttackMove(Moves.YU_ICE_TORRENT, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, rainGate, 35), Moves.BLIZZARD),
    yuMove(new AttackMove(Moves.YU_THUNDER_CALL, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, rainGate, 50), Moves.THUNDER),
    yuMove(new SelfStatusMove(Moves.YU_OCEANIC_RECOVERY, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ResetWeatherFromStartAttr, "RAIN"), Moves.LIFE_DEW),
    yuMove(new SelfStatusMove(Moves.YU_AQUA_FORTIFICATION, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, rainGate, 100), Moves.AQUA_RING),
    yuMove(new AttackMove(Moves.YU_WHIRLPOOL_GRIP, Type.WATER, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.ENCORE, false, true, rainGate, 50), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_LEVIATHANS_ROAR, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .soundBased()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, null, 30)
      .attr(GatedSuppressAbilitiesAttr, rainGate), Moves.ROAR_OF_TIME),
    yuMove(new SelfStatusMove(Moves.YU_HAZARDOUS_CURRENT, Type.WATER, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, rainGate, 100), Moves.WITHDRAW),
  );
}
export function registerYuDuelmonEntry183(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DRAGON_MELODY, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .soundBased()
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 100, foeAsleepGate), Moves.DRAGON_BREATH),
    yuMove(new AttackMove(Moves.YU_HARMONIC_ROAR, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .soundBased()
      .attr(FlinchAttr)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.NIGHTMARE, false, true, foeAsleepGate, 30), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_QUICK_NOTE, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .soundBased()
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(GatedDisableMoveAttr, foeAsleepGate), Moves.CHATTER),
    yuMove(new SelfStatusMove(Moves.YU_FORTISSIMO, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.CAPTIVATE),
    yuMove(new AttackMove(Moves.YU_LULLABY_WALTZ, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.FAIRY_WIND),
    yuMove(new AttackMove(Moves.YU_WHISPERING_ECHO, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 50, foeAsleepGate), Moves.OMINOUS_WIND),
    yuMove(new SelfStatusMove(Moves.YU_HEALING_MELODY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE), Moves.REFRESH),
    yuMove(new AttackMove(Moves.YU_DISSONANT_CHORD, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .soundBased()
      .attr(RemoveHeldItemAttr, false)
      .attr(ReduceLastMovePpAttr, 3, 100, foeAsleepGate), Moves.ROUND),
    yuMove(new AttackMove(Moves.YU_SILENCING_WAVE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .soundBased()
      .attr(SuppressAbilitiesAttr)
      .attr(GatedResetStatsAttr, false, foeAsleepGate), Moves.TRUMP_CARD),
    yuMove(new SelfStatusMove(Moves.YU_DRAGONS_ANTHEM, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, true, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, foeAsleepGate, 100, false, true), Moves.DRAGON_CHEER),
  );
}
export function registerYuDuelmonEntry184(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ARCANE_BOLT, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_SHADOW_WEAVE, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(ReduceLastMovePpAttr, 3, 100, hasSubstituteGate), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_ILLUSORY_STRIKE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, alwaysTrueGate, 30)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.UPROAR),
    yuMove(new AttackMove(Moves.YU_QUICK_THREAD, Type.PSYCHIC, MoveCategory.SPECIAL, 60, 100, 10, -1, 1, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, hasSubstituteGate, 50), Moves.PHOTON_GEYSER),
    yuMove(new AttackMove(Moves.YU_BEWILDERING_FLASH, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, hasSubstituteGate, 100), Moves.DREAM_EATER),
    yuMove(new StatusMove(Moves.YU_FABRIC_REDIRECT, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, true), Moves.ENCORE),
    yuMove(new AttackMove(Moves.YU_MIND_SHATTER, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 100, hasSubstituteGate), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_CONFOUNDING_ILLUSION, Type.PSYCHIC, MoveCategory.SPECIAL, 20, 100, 10, 50, 0, 9)
      .attr(StatChangeCountPowerAttr)
      .attr(ConditionalInvertStatsAttr, hasSubstituteGate, 50), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_MIRROR_TRICK, Type.PSYCHIC, MoveCategory.SPECIAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m: Move) => m.category === MoveCategory.SPECIAL, 2)
      .attr(ConditionalCounterDamageAttr, (m: Move) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5, hasSubstituteGate)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.MIRROR_COAT),
    yuMove(new AttackMove(Moves.YU_PHANTOM_THREAD, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(FreeSubstituteAttr, 30)
      .attr(GatedDelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }), hasSubstituteGate, 50), Moves.FUTURE_SIGHT),
    yuMove(new AttackMove(Moves.YU_CHAOS_WEAVE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3)
      .attr(AddMovePowerAttr, 40, hasSubstituteGate), Moves.PRISMATIC_LASER),
    yuMove(new AttackMove(Moves.YU_BURNING_EMBROIDERY, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, hasSubstituteGate, 50), Moves.BURNING_JEALOUSY),
    yuMove(new AttackMove(Moves.YU_MIRAGE_EXODUS, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 80, 10, -1, -1, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ForceSwitchOutAttr, false, false)
      .attr(ConditionalStatChangeAttr, [...FOE_MAIN_STATS], -1, false, hasSubstituteGate, 50), Moves.PSYBEAM),
  );
}
export function registerYuDuelmonEntry185(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FLUFF_BLAST, Type.FAIRY, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalHighCritAttr, fullHpGate, 50), Moves.FLEUR_CANNON),
    yuMove(new AttackMove(Moves.YU_SPARKLE_BEAM, Type.FAIRY, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, fullHpGate, 50), Moves.LIGHT_OF_RUIN),
    yuMove(new AttackMove(Moves.YU_PIVOT_DASH, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(GatedForceSwitchOutAttr, false, false, fullHpGate), Moves.DOUBLE_SLAP),
    yuMove(new AttackMove(Moves.YU_FLUFF_PUFF, Type.FAIRY, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, fullHpGate), Moves.FAIRY_WIND),
    yuMove(new SelfStatusMove(Moves.YU_MAGIC_SHIELD, Type.FAIRY, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(HealAttr, 0.25), Moves.CRAFTY_SHIELD),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_PUFF, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, fullHpGate, 50), Moves.ELECTRO_SHOT),
    yuMove(new AttackMove(Moves.YU_STORED_SPARKLE, Type.FAIRY, MoveCategory.SPECIAL, 20, 100, 10, -1, 0, 9)
      .attr(StatChangeCountPowerAttr)
      .attr(GatedConditionalPriorityAttr, fullHpGate, 1), Moves.STORED_POWER),
    yuMove(new AttackMove(Moves.YU_FAIRY_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, fullHpGate), Moves.DAZZLING_GLEAM),
    yuMove(new SelfStatusMove(Moves.YU_WISH_WEAVE, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, true, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(GatedHealStatusEffectAttr, fullHpGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.WISH),
  );
}
export function registerYuDuelmonEntry186(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DARK_RITUAL, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, 1, 0, 9)
      .attr(ChanceCurseAttr, 1)
      .attr(GatedCurseAttr, trappedGate, 5), Moves.DARKEST_LARIAT),
    yuMove(new AttackMove(Moves.YU_SHADOW_DRAIN, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, trappedGate), Moves.HEX),
    yuMove(new SelfStatusMove(Moves.YU_MASK_CURSE, Type.GHOST, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(ChangeFoePrimaryTypeAttr, "GHOST", 100)
      .attr(GatedDestinyBondAttr, trappedGate), Moves.CURSE),
    yuMove(new StatusMove(Moves.YU_RECOVERY_RITUAL, Type.GHOST, -1, 10, -1, -1, 9)
      .attr(HpSplitAttr)
      .attr(ConditionalHealAttr, 0.25, trappedGate), Moves.PAIN_SPLIT),
    yuMove(new AttackMove(Moves.YU_GROUND_RUPTURE, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, 0, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, trappedGate, 30), Moves.SAND_TOMB),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_TOUCH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, trappedGate), Moves.SPECTRAL_THIEF),
    yuMove(new AttackMove(Moves.YU_DOOM_BIND, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, trappedGate, 30), Moves.LICK),
    yuMove(new AttackMove(Moves.YU_MASK_GRASP, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SALT_CURED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 30, trappedGate), Moves.ASTRAL_BARRAGE),
    yuMove(new AttackMove(Moves.YU_MASK_TORMENT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, trappedGate), Moves.LASH_OUT),
    yuMove(new AttackMove(Moves.YU_REVERSAL_MASK, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3)
      .attr(ReduceLastMovePpAttr, 3, 100, trappedGate), Moves.SPIRIT_SHACKLE),
    yuMove(new AttackMove(Moves.YU_DEATH_WHISPER, Type.GHOST, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(UserHpCostAttr, 0.25)
      .attr(GatedFaintCountdownAttr, trappedGate), Moves.PERISH_SONG),
    yuMove(new SelfStatusMove(Moves.YU_HAZARDOUS_RITUAL, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(AddArenaTagAttr, ArenaTagType.SAFEGUARD, 5, true, true), Moves.PARTING_SHOT),
  );
}
export function registerYuDuelmonEntry187(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_QUICK_JAB, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.DIZZY_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_RING_ENTRANCE, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ResetArenaTagAttr), Moves.COACHING),
    yuMove(new AttackMove(Moves.YU_FOEWEIGHT_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(UseFoeAttackStatAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userMovedFirstGate, 50), Moves.STOMPING_TANTRUM),
    yuMove(new SelfStatusMove(Moves.YU_IRON_GUARD, Type.FIGHTING, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true), Moves.QUICK_GUARD),
    yuMove(new SelfStatusMove(Moves.YU_RECOVERY_HOP, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true), Moves.REVIVAL_BLESSING),
  );
}
export function registerYuDuelmonEntry188(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_METEOR_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitAddBattlerTagAttr, BattlerTagType.SALT_CURED, 10)
      .attr(GatedFinalHitAddBattlerTagAttr, BattlerTagType.SALT_CURED, 30, consecutiveUseGate), Moves.TAIL_SLAP),
    yuMove(new AttackMove(Moves.YU_ASTEROID_CRASH, Type.ROCK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitStatusEffectAttr, StatusEffect.BURN, 30)
      .attr(ConditionalFinalHitStatusEffectAttr, StatusEffect.BURN, consecutiveUseGate, 50), Moves.ACCELEROCK),
    yuMove(new AttackMove(Moves.YU_SOLAR_FRAGMENT, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitStatChangeAttr, BattleStat.SPDEF, -1, false, 30)
      .attr(ConditionalFinalHitStatChangeAttr, BattleStat.SPDEF, -1, false, consecutiveUseGate, 50), Moves.HEAT_WAVE),
    yuMove(new AttackMove(Moves.YU_QUICK_SHARD, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitFlinchAttr, 10)
      .attr(ConditionalFinalHitFlinchAttr, 35, consecutiveUseGate), Moves.TRIPLE_KICK),
    yuMove(new SelfStatusMove(Moves.YU_SOLAR_FLARE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ResetGravityFromStartAttr), Moves.GRAVITY),
    yuMove(new StatusMove(Moves.YU_METEORITE_SHIELD, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(StatChangeAttr, BattleStat.EVA, -1, false)
      .attr(AddBattlerTagAttr, BattlerTagType.DROWSY, false, true), Moves.ROCK_POLISH),
    yuMove(new AttackMove(Moves.YU_GRAVITON_FALL, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._3)
      .attr(FinalHitTrapAttr, BattlerTagType.WRAP, 30)
      .attr(ConditionalFinalHitTrapAttr, BattlerTagType.WRAP, 50, consecutiveUseGate), Moves.BIND),
    yuMove(new AttackMove(Moves.YU_EMBER_RAIN, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.EMBER),
  );
}
export function registerYuDuelmonEntry189(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VENOM_STRIKE, Type.POISON, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, userPositiveStageGate, 50), Moves.GUNK_SHOT),
    yuMove(new AttackMove(Moves.YU_SCORPION_SLAM, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(FoeLowHpPowerAttr, 60, userPositiveStageGate), Moves.CRUNCH),
    yuMove(new AttackMove(Moves.YU_QUICK_STING, Type.BUG, MoveCategory.PHYSICAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalFlinchAttr, 35, userPositiveStageGate), Moves.QUICK_ATTACK),
    yuMove(new SelfStatusMove(Moves.YU_EXOSKELETON_GUARD, Type.BUG, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ForesightAttr), Moves.FORESIGHT),
    yuMove(new SelfStatusMove(Moves.YU_REGENERATION, Type.POISON, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(AddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false), Moves.PROTECT),
    yuMove(new AttackMove(Moves.YU_EARTH_STINGER, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.INFESTATION, false, false, userPositiveStageGate, 30), Moves.INFESTATION),
    yuMove(new AttackMove(Moves.YU_STEEL_TAIL, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.SEEDED, false, false, userPositiveStageGate, 30), Moves.IRON_TAIL),
    yuMove(new AttackMove(Moves.YU_SHADOW_STING, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SALT_CURED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 30, userPositiveStageGate), Moves.SHADOW_SNEAK),
    yuMove(new StatusMove(Moves.YU_DESERT_SETUP, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.SAND_TOMB, false, false, desertSandTombGate, 30), Moves.MUD_SPORT),
    yuMove(new AttackMove(Moves.YU_EXECUTION_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 120, 75, 10, -1, -1, 9)
      .attr(HitHealAttr, 0.33)
      .attr(GatedAlwaysHitAttr, userPositiveStageGate), Moves.BITE),
  );
}
export function registerYuDuelmonEntry190(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SHIELD_BASH, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userDefPositiveGate, 50), Moves.WEATHER_BALL),
    yuMove(new AttackMove(Moves.YU_FORTRESS_SLAM, Type.ROCK, MoveCategory.SPECIAL, 100, 85, 10, 10, 0, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, alwaysTrueGate, 30)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userDefPositiveGate), Moves.ANCIENT_POWER),
    yuMove(new AttackMove(Moves.YU_GUARD_RUSH, Type.FAIRY, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, userDefPositiveGate), Moves.MISTY_EXPLOSION),
    yuMove(new SelfStatusMove(Moves.YU_STONE_WALL, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(AddArenaTagAttr, ArenaTagType.NO_CRIT, 5, true, true), Moves.ROCK_POLISH),
    yuMove(new SelfStatusMove(Moves.YU_SHIELD_RECOVERY, Type.FAIRY, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ChangeFoePrimaryTypeAttr, "ROCK", 100), Moves.FLOWER_SHIELD),
    yuMove(new AttackMove(Moves.YU_AEGIS_BASH, Type.STEEL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(UseDefenseStatAsAttackAttr)
      .attr(GatedHitHealAttr, 0.5, userDefPositiveGate), Moves.MAKE_IT_RAIN),
    yuMove(new AttackMove(Moves.YU_FAIRY_SLAM, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true), Moves.FAIRY_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_WALL, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(CounterDamageAttr, (m: Move) => m.category === MoveCategory.PHYSICAL, 2)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userDefPositiveGate, 30)
      .redirectCounter().makesContact(false).target(MoveTarget.ATTACKER), Moves.WRING_OUT),
    yuMove(new SelfStatusMove(Moves.YU_UNBREAKABLE_GUARD, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(FoeDisableMoveAttr)
      .attr(HealBlockAttr, alwaysTrueGate)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, userDefPositiveGate, 100, false, true), Moves.LIGHT_SCREEN),
  );
}
export function registerYuDuelmonEntry191(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_JAR_SMASH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, below50HpGate), Moves.EGG_BOMB),
    yuMove(new AttackMove(Moves.YU_MORPHIC_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalInvertStatsAttr, below50HpGate, 30), Moves.PSYCHIC_NOISE),
    yuMove(new AttackMove(Moves.YU_QUICK_MORPH, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FinalHitAddBattlerTagAttr, BattlerTagType.CONFUSED, 30)
      .attr(GatedFinalHitAddBattlerTagAttr, BattlerTagType.CONFUSED, 50, below50HpGate), Moves.FURY_SWIPES),
    yuMove(new StatusMove(Moves.YU_RESHAPE, Type.PSYCHIC, -1, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ForesightAttr), Moves.FORESIGHT),
    yuMove(new SelfStatusMove(Moves.YU_REVERSAL_SURGE, Type.FIGHTING, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(GatedSubstituteAttr, 0.25), Moves.REVERSAL),
    yuMove(new AttackMove(Moves.YU_FIRE_MORPH, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.ENCORE, 50, below50HpGate), Moves.MYSTICAL_FIRE),
    yuMove(new StatusMove(Moves.YU_CURSED_MORPH, Type.GHOST, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ChanceCurseAttr, 10)
      .attr(GatedCurseAttr, below50HpGate, 30), Moves.NIGHTMARE),
  );
}
export function registerYuDuelmonEntry192(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MASS_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HpScaledPowerAttr)
      .attr(ConditionalHighCritAttr, below75HpGate, 100), Moves.ENDEAVOR),
    yuMove(new AttackMove(Moves.YU_AVALANCHE_MASS, Type.ROCK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(SuperEffectiveVsGroundAttr, [Type.ICE, Type.ROCK, Type.STEEL], below75HpGate), Moves.ACCELEROCK),
    yuMove(new AttackMove(Moves.YU_QUICK_MASS, Type.NORMAL, MoveCategory.PHYSICAL, 55, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, below75HpGate), Moves.BODY_SLAM),
    yuMove(new StatusMove(Moves.YU_GROWTH_SURGE, Type.ROCK, -1, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below75HpGate, 50)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.ROCK_POLISH),
    yuMove(new SelfStatusMove(Moves.YU_SANDSTORM_CALL, Type.ROCK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ResetWeatherFromStartAttr, "SAND"), Moves.SANDSTORM),
    yuMove(new AttackMove(Moves.YU_GROUND_TREMOR, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, below75HpGate), Moves.THOUSAND_ARROWS),
    yuMove(new AttackMove(Moves.YU_SAND_BURST, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.SMACK_DOWN),
    yuMove(new SelfStatusMove(Moves.YU_MASS_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.33)
      .attr(ConditionalHealAttr, 0.5, below75HpGate), Moves.RECOVER),
    yuMove(new AttackMove(Moves.YU_PETRIFY_TOUCH, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SALT_CURED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SALT_CURED, 30, below75HpGate), Moves.STONE_EDGE),
    yuMove(new AttackMove(Moves.YU_DUST_DEVIL, Type.GROUND, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.DIG),
  );
}
export function registerYuDuelmonEntry193(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ZOMBIE_SMASH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalInvertStatsAttr, foeNegativeStagesGate, 30), Moves.EXPLOSION),
    yuMove(new AttackMove(Moves.YU_GOLEM_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalHighCritAttr, foeNegativeStagesGate, 30), Moves.FALSE_SWIPE),
    yuMove(new StatusMove(Moves.YU_RECONSTRUCTION, Type.FIGHTING, -1, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ForesightAttr), Moves.MACH_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_TERROR_ROAR, Type.GHOST, -1, 10, 100, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(DestinyBondAttr), Moves.SPITE),
    yuMove(new AttackMove(Moves.YU_CRATER_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 30, foeNegativeStagesGate), Moves.EARTHQUAKE),
    yuMove(new AttackMove(Moves.YU_STITCHED_GRASP, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, foeNegativeStagesGate, 50), Moves.POLTERGEIST),
    yuMove(new AttackMove(Moves.YU_DREAD_SLAM, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(GatedHitHealAttr, 0.5, foeNegativeStagesGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_COUNTER_STITCH, Type.FIGHTING, MoveCategory.PHYSICAL, -1, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .attr(ConditionalInvertStatsAttr, foeNegativeStagesGate, 30)
      .redirectCounter().makesContact(false).target(MoveTarget.ATTACKER), Moves.COUNTER),
  );
}
export function registerYuDuelmonEntry194(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FURY_FIST, Type.FIGHTING, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(FoeLowHpPowerAttr, 40, foeBelow40HpGate), Moves.ROCK_SMASH),
    yuMove(new AttackMove(Moves.YU_GOD_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow40HpGate), Moves.SLAM),
    yuMove(new AttackMove(Moves.YU_SOUL_CRUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.ENCORE, 50, foeBelow40HpGate), Moves.KOWTOW_CLEAVE),
    yuMove(new AttackMove(Moves.YU_THUNDER_FIST, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(GatedForceSwitchOutAttr, false, false, foeBelow40HpGate), Moves.THUNDER_PUNCH),
    yuMove(new AttackMove(Moves.YU_FIRE_FIST, Type.FIRE, MoveCategory.PHYSICAL, 80, 50, 10, 50, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedAlwaysHitAttr, foeBelow40HpGate), Moves.FIRE_FANG),
    yuMove(new AttackMove(Moves.YU_EARTHQUAKE_FIST, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(DamagedThisTurnMultiplierAttr)
      .attr(GatedAlwaysHitAttr, foeBelow40HpGate), Moves.BONEMERANG),
    yuMove(new AttackMove(Moves.YU_EXTINCTION_FIST, Type.FIGHTING, MoveCategory.PHYSICAL, 110, 80, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedDelayedAttackAttr, ArenaTagType.DOOM_DESIRE, ChargeAnim.DOOM_DESIRE_CHARGING, i18next.t("moveTriggers:choseDoomDesireAsDestiny", { pokemonName: "{USER}" }), foeBelow40HpGate), Moves.DOOM_DESIRE),
  );
}
export function registerYuDuelmonEntry195(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TIDAL_CRASH, Type.WATER, MoveCategory.SPECIAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeSpdNegativeGate, 50), Moves.BUBBLE),
    yuMove(new AttackMove(Moves.YU_DRAGON_TSUNAMI, Type.DRAGON, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalFlinchAttr, 35, foeSpdNegativeGate), Moves.DRAGON_BREATH),
    yuMove(new AttackMove(Moves.YU_QUICK_CURRENT, Type.WATER, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(GatedDisableMoveAttr, foeSpdNegativeGate), Moves.WATER_SHURIKEN),
    yuMove(new SelfStatusMove(Moves.YU_DOMAIN_CONTROL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalAddBattlerTagAttr, BattlerTagType.AQUA_RING, true, false, foeSpdNegativeGate, 100), Moves.RAIN_DANCE),
    yuMove(new AttackMove(Moves.YU_WHIRLPOOL_STRIKE, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, foeSpdNegativeGate), Moves.WHIRLPOOL),
    yuMove(new AttackMove(Moves.YU_DRAGON_WHIP, Type.DRAGON, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(GatedDelayedAttackAttr, ArenaTagType.FUTURE_SIGHT, ChargeAnim.FUTURE_SIGHT_CHARGING, i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }), foeSpdNegativeGate), Moves.DRAGON_TAIL),
  );
}
export function registerYuDuelmonEntry196(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_OJAMA_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TORMENT, 30, ojamaMoveGate3), Moves.HYPER_FANG).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_OJAMA_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 25, 85, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(ConditionalConfuseAttr, 30, lastHitOnlyGate)
      .attr(ConditionalConfuseAttr, 50, ojamaLastHitGate), Moves.SLAM).ojamaMove(),
    yuMove(new StatusMove(Moves.YU_OJAMA_CHANT, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.INFATUATED)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.LUCKY_CHANT).ojamaMove(),
    yuMove(new SelfStatusMove(Moves.YU_OJAMA_RAY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(HealStatusEffectAttr, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.DROWSY, 100, alwaysTrueGate), Moves.SUPERSONIC).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_OJAMA_DISABLE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true)
      .attr(GatedDisableMoveAttr, ojamaMoveGate3), Moves.FLAIL).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_OJAMA_COUNTER, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.ENCORE, 50, ojamaMoveGate3), Moves.FRUSTRATION).ojamaMove(),
  );
}
export function registerYuDuelmonEntry197(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_LOCKDOWN_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(HealBlockAttr, ojamaMoveGate3), Moves.SLAM).ojamaMove(),
  );
}
export function registerYuDuelmonEntry198(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SOLIDARITY_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TAUNTED)
      .attr(GatedClearHazardsAttr, ojamaMoveGate3), Moves.FURY_ATTACK).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_KNIGHTS_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedIncrementMovePriorityAttr, ojamaMoveGate3, 1), Moves.EXTREME_SPEED).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_SEAL_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.ENCORE, 50, ojamaMoveGate3), Moves.FURY_SWIPES).ojamaMove(),
    yuMove(new SelfStatusMove(Moves.YU_KNIGHTS_SHIELD, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES), Moves.SPIKES).ojamaMove(),
    yuMove(new AttackMove(Moves.YU_KNIGHTS_DISARM, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(UseFoeAttackStatAttr)
      .attr(GatedRemoveHeldItemAttr, ojamaMoveGate3), Moves.LASH_OUT).ojamaMove(),
  );
}
export function registerYuDuelmonEntry199(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PREHISTORIC_SLAM, Type.ROCK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedSuperEffectiveVsTypesAttr, [Type.FLYING, Type.BUG, Type.GRASS], below50HpGate), Moves.STONE_AXE),
    yuMove(new StatusMove(Moves.YU_VENOM_LAYER, Type.POISON, -1, 10, -1, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.TOXIC)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(AddArenaTagAttr, ArenaTagType.SAFEGUARD, 5, true, true), Moves.VENOM_DRENCH),
    yuMove(new SelfStatusMove(Moves.YU_EVOLUTION_STANCE, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ChangeFoePrimaryTypeAttr, "DRAGON"), Moves.DRAGON_DANCE),
    yuMove(new AttackMove(Moves.YU_EVOLUTION_FANG, Type.POISON, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.125)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES, below50HpGate), Moves.POISON_FANG),
    yuMove(new AttackMove(Moves.YU_ANCIENT_TORMENT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_SERPENT_SPRAY, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.TAUNTED, 30, below50HpGate), Moves.CROSS_POISON),
    yuMove(new SelfStatusMove(Moves.YU_LEGACY_SPIKES, Type.POISON, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(GatedAllFaintCountdownAttr, below50HpGate), Moves.TOXIC_SPIKES),
  );
}
export function registerYuDuelmonEntry200(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_COMBUSTION_DIVE, Type.FLYING, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userMovedFirstGate, 50), Moves.HURRICANE),
    yuMove(new AttackMove(Moves.YU_QUICK_BURST, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow40HpGate), Moves.BOOMBURST),
    yuMove(new AttackMove(Moves.YU_TAILWIND_IGNITION, Type.FLYING, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HpScaledPowerAttr)
      .attr(ResetTailwindFromStartAttr, 30, userMovedFirstGate), Moves.GUST),
    yuMove(new StatusMove(Moves.YU_VOLATILE_SETUP, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ResetTailwindFromStartAttr, 50, userMovedFirstGate), Moves.TAILWIND),
  );
}
export function registerYuDuelmonEntry201(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CURSED_BLADE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(FoeLowHpPowerAttr, 40, foeBelow40HpGate), Moves.BEAT_UP),
    yuMove(new AttackMove(Moves.YU_DRAGON_SLASH, Type.DRAGON, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow40HpGate), Moves.DRAGON_CLAW),
    yuMove(new SelfStatusMove(Moves.YU_CURSED_ARMOR, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(DestinyBondAttr), Moves.QUASH),
    yuMove(new AttackMove(Moves.YU_GROUND_CLEAVE, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.125)
      .attr(ConditionalStatusEffectAttr, StatusEffect.TOXIC, foeBelow40HpGate, 30), Moves.DRILL_RUN),
    yuMove(new AttackMove(Moves.YU_DRAIN_BLADE, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeBelow40HpGate), Moves.SPECTRAL_THIEF),
    yuMove(new AttackMove(Moves.YU_CURSED_GRIP, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeBelow40HpGate), Moves.PAYBACK),
    yuMove(new AttackMove(Moves.YU_DISABLE_BLADE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.ENCORE, 50, foeBelow40HpGate), Moves.POWER_TRIP),
  );
}
export function registerYuDuelmonEntry202(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DRAGON_LANCE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(GatedIgnoreOpponentStatChangesAttr, foeDefGtAtkGate), Moves.DRAGON_RUSH),
    yuMove(new AttackMove(Moves.YU_HOLY_BLADE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeDefGtAtkGate), Moves.ROLLING_KICK),
  );
}
export function registerYuDuelmonEntry203(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SAVAGE_CLAW, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalFlinchAttr, 35, userMovedFirstGate), Moves.DRAGON_CLAW),
    yuMove(new AttackMove(Moves.YU_BEAST_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(StageScaledPowerAttr, 10, userMovedFirstGate), Moves.GIGA_IMPACT),
    yuMove(new AttackMove(Moves.YU_PREDATORS_POUNCE, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 30, userMovedFirstGate), Moves.PRESENT),
    yuMove(new AttackMove(Moves.YU_CLAW_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FinalHitGatedAlwaysHitAttr, userMovedFirstGate), Moves.FURY_SWIPES),
    yuMove(new SelfStatusMove(Moves.YU_GLADIATORS_FURY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConfuseAttr, true), Moves.SUPERSONIC),
    yuMove(new SelfStatusMove(Moves.YU_PREDATORS_GUARD, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(GatedDestinyBondAttr, userMovedFirstGate), Moves.CONVERSION_2),
    yuMove(new AttackMove(Moves.YU_REVERSAL_FANG, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .redirectCounter()
      .target(MoveTarget.ATTACKER)
      .attr(ConditionalFlinchAttr, 35, userMovedFirstGate), Moves.SUPER_FANG),
    yuMove(new StatusMove(Moves.YU_LAST_ROAR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(UserHpCostAttr, 0.25)
      .attr(FaintCountdownAttr)
      .target(MoveTarget.ALL)
      .ignoresProtect()
      .soundBased(), Moves.ROAR),
  );
}
export function registerYuDuelmonEntry204(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_INCENDIARY_SHELL, Type.FIRE, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userMovedFirstGate, 50), Moves.FIRE_FANG),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_ROUND, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(GatedSuppressAbilitiesAttr, userMovedFirstGate), Moves.GIGATON_HAMMER),
  );
}
export function registerYuDuelmonEntry205(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new SelfStatusMove(Moves.YU_TERRAIN_SEED, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.COTTON_GUARD),
    yuMove(new SelfStatusMove(Moves.YU_CORNFIELD_GUARD, Type.GRASS, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(AddBattlerTagAttr, BattlerTagType.INGRAIN), Moves.INGRAIN),
    yuMove(new StatusMove(Moves.YU_ENTANGLING_GROWTH, Type.GRASS, 100, 10, 30, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 50, grassyTerrainGate), Moves.GRASSY_TERRAIN),
    yuMove(new AttackMove(Moves.YU_CORN_BARRAGE, Type.GRASS, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 30)
      .attr(GatedFinalHitAddBattlerTagAttr, BattlerTagType.INFESTATION, 30, grassyTerrainGate), Moves.SNAP_TRAP),
    yuMove(new AttackMove(Moves.YU_ROOT_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, grassyTerrainGate)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 30), Moves.GRASS_KNOT),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_STALK, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY", 30)
      .attr(GatedSuppressAbilitiesAttr, grassyTerrainGate), Moves.ENERGY_BALL),
    yuMove(new StatusMove(Moves.YU_HARVEST_WISH, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(HpSplitAttr)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalHealAttr, 0.25, grassyTerrainGate), Moves.STRENGTH_SAP),
    yuMove(new SelfStatusMove(Moves.YU_PHOTOSYNTHESIS_PULSE, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ChangeFoePrimaryTypeAttr, "GRASS", 100, grassyTerrainGate), Moves.SYNTHESIS),
  );
}
export function registerYuDuelmonEntry206(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PLAGUE_TOUCH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.INFESTATION, false, false)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.INFESTATION, 30, foeBelow50HpGate), Moves.INFESTATION),
    yuMove(new AttackMove(Moves.YU_ROT_CLAW, Type.POISON, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(ChanceCurseAttr, 1)
      .attr(GatedCurseAttr, foeBelow50HpGate, 5), Moves.DIRE_CLAW),
  );
}
export function registerYuDuelmonEntry207(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DARK_SHOT, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .ballBombMove()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_DRAW_PULSE, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .pulseMove()
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeBelow50HpGate), Moves.WATER_PULSE),
    yuMove(new AttackMove(Moves.YU_VOLT_BALL, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .ballBombMove()
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, foeBelow50HpGate, 50), Moves.THUNDERBOLT),
  );
}
export function registerYuDuelmonEntry208(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SOLAR_LANCE, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DIVINE_FLAME, Type.FIRE, MoveCategory.SPECIAL, 90, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_RADIANCE, Type.FIRE, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_BLAST, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, below50HpGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SACRIFICIAL_BLAZE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, below50HpGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_RAS_SHIELD, Type.FIRE, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, below50HpGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GROUND_PULSE, Type.GROUND, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(SelfHpCostAttr, 0.125)
      .attr(AddMovePowerAttr, 40, below50HpGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SOLAR_RECOVERY, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, below50HpGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RADIANT_BARRAGE, Type.FIRE, MoveCategory.SPECIAL, 30, 90, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_RECKONING, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.125)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true)
      .attr(AddMovePowerAttr, 40, below50HpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAIN_RADIANCE, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BINDING_FLAME, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_PHOENIX_FLARE, Type.FIRE, -1, 10, -1, 4, 9)
      .attr(ProtectAttr, BattlerTagType.ENDURING)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, below50HpGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_RADIANCE, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(AddMovePowerAttr, 40, below50HpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_IMMOLATING_SACRIFICE, Type.FIRE, MoveCategory.SPECIAL, 120, 100, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25, below50HpGate, 0.125), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_FLAME, Type.FIGHTING, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_IMMOLATION, Type.FIRE, MoveCategory.SPECIAL, 90, 100, 10, 30, 0, 9)
      .attr(SelfHpCostAttr, 0.125)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DISABLE_FLAME, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SOLAR_RENEWAL, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RAS_JUDGMENT, Type.FIRE, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(SelfHpCostAttr, 0.125)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry209(allMoves: Move[]): void {
  allMoves.push(
    yuGadgetMove(new AttackMove(Moves.YU_FLAME_GEAR, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_STEEL_SPARK, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_QUICK_IGNITION, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GRASS_CIRCUIT, Type.GRASS, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_GADGET_SHIELD, Type.STEEL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeStealthRockGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_OVERCLOCK, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, foeStealthRockGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_DEPLOY_QUAKE, Type.GROUND, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(RecoilAttr, true, 0.125), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_MACHINE_REPAIR, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, foeStealthRockGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_VOLT_BARRAGE, Type.NORMAL, MoveCategory.SPECIAL, 25, 100, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_NETWORK_DRAIN, Type.NORMAL, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_MAGNETIC_CAGE, Type.ELECTRIC, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_TORMENT_SPARK, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_ENCORE_CIRCUIT, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_E209_SUPPRESSION_PULSE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_REVERSAL_SPARK, Type.FIGHTING, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(DamagedThisTurnMultiplierAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeStealthRockGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_SHRAPNEL_DEPLOY, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_NETWORK_OVERLOAD, Type.NORMAL, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeStealthRockGate), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_HAZARD_SETUP, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_NETWORK_ERASURE, Type.NORMAL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_CRIMSON_FINALE, Type.NORMAL, MoveCategory.SPECIAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(ConditionalHitHealAttr, 0, 0.5, foeStealthRockGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry210(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ABYSSAL_BLAZE, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_INFERNO, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_EMBER, Type.FIRE, MoveCategory.SPECIAL, 60, 100, 10, -1, 1, 9), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SHADOW_FLAME, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_DRAGONS_SHIELD, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, burnedGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ABYSSAL_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, burnedGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_GROUND_FLAME, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ABYSSAL_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FLAME_BARRAGE, Type.FIRE, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAGON_PULSE, Type.DRAGON, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_INFERNAL_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_BIND, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TORMENT_FLAME, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ENCORE_FLAME, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_FLAME, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_INFERNO, Type.FIGHTING, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(GatedMovePowerMultiplierAttr, userDamagedThisTurnGate, 1.3)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, burnedGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_INFERNO, Type.FIRE, MoveCategory.SPECIAL, 100, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_SEAL, Type.FIRE, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_ERASURE, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RED_EYES_INFERNO, Type.FIRE, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, burnedGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry211(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_NEGATION_PULSE, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAGON_NEGATE, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_NEGATE, Type.DARK, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_DRAGOONS_GUARD, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeSpAtkNegativeGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_NEGATION_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, foeSpAtkNegativeGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FIRE_NEGATE, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_NEGATION_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_BARRAGE, Type.DARK, MoveCategory.SPECIAL, 30, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAGON_DRAIN, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GROUND_NEGATION, Type.GROUND, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TORMENT_NEGATE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_NEGATE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BINDING_NEGATE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GROUND_BURST, Type.GROUND, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ENCORE_NEGATE, Type.DARK, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_NEGATION_CATACLYSM, Type.DARK, MoveCategory.SPECIAL, 120, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DISABLE_NEGATE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_NEGATION_ERASURE, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_DRAGOONS_DECREE, Type.DARK, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, foeSpAtkNegativeGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry212(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MILLENNIUM_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GHOST_ABSORPTION, Type.GHOST, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, hasSubstituteGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_ABSORB, Type.DARK, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_ABSORPTION, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ABSORBED_CONSTRUCT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_MILLENNIUM_SHIELD, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, hasSubstituteGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_GROUND_ABSORPTION, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ABSORPTION_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ConditionalSelfHealAttr, 0.5, 0.66, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SHADOW_BARRAGE, Type.GHOST, MoveCategory.SPECIAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TORMENT_ABSORPTION, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_PHANTOM_CONSTRUCT, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ENCORE_ABSORPTION, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_EYE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BINDING_EYE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ESSENCE_THEFT, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABSORPTION_CATACLYSM, Type.DARK, MoveCategory.SPECIAL, 100, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DISABLE_EYE, Type.DARK, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MILLENNIUM_ERASURE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RELINQUISHED_SENTENCE, Type.DARK, MoveCategory.SPECIAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, hasSubstituteGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry213(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VENGEANCE_BLADE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SLAYERS_RUSH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, partyFaintedGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_VENGEANCE, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GHOST_CLEAVE, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_AVENGERS_RESOLVE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, partyFaintedGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_AVENGERS_GUARD, Type.DARK, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, partyFaintedGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_AVENGERS_QUAKE, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_UNDYING_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ConditionalHealAttr, 0.66, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VENGEANCE_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DEATH_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TORMENT_BLADE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BINDING_VENGEANCE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ENCORE_VENGEANCE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.ENCORE, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPPRESSION_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_VENGEANCE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(DamagedThisTurnMultiplierAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, partyFaintedGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_E213_STEEL_CLEAVE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VENGEANCE_EXECUTION, Type.DARK, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, partyFaintedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SILENCING_BLADE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_AVENGERS_ERASURE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FINAL_VENGEANCE, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, partyFaintedGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry214(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_STEEL_ROCKET, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_AERIAL_BURST, Type.FLYING, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_MISSILE, Type.STEEL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DISRUPTION_BLAST, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ROCKET_SHIELD, Type.STEEL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, foeTormentGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ROCKET_CALIBRATION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, foeTormentGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_GROUND_ROCKET, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_FIELD_REPAIR, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(PartyStatusCureAttr, null, Abilities.NONE)
      .attr(ConditionalHealAttr, 0.66, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MISSILE_BARRAGE, Type.STEEL, MoveCategory.PHYSICAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ROCKET_DRAIN, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DEBILITATING_STRIKE, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.TORMENT, false, true), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_WARHEAD_EXECUTION, Type.STEEL, MoveCategory.PHYSICAL, 100, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeTormentGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FINAL_PAYLOAD, Type.STEEL, MoveCategory.PHYSICAL, 100, 80, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, foeTormentGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry215(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_IAI_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, fullHpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_CROSS_SLASH, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, fullHpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_DRAW, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, fullHpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_WATER_BLADE, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, fullHpGate, 50), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SAMURAIS_GUARD, Type.NORMAL, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, fullHpGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BLADE_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, fullHpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAINING_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, fullHpGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_SLASH, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(DamagedThisTurnMultiplierAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, fullHpGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RONINS_LAST_STAND, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, fullHpGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry216(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PHANTOM_SLASH, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_ROCK, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpikesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_PHANTOM, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpikesGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_ARSENAL_DEPLOY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_PHANTOM_GUARD, Type.GHOST, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(ContactStatDropAttr, "ATK", -1)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeSpikesGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ARSENAL_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpikesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GHOST_DRAIN, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpikesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PHANTOM_EXECUTION, Type.GHOST, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpikesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PHANTOM_ARSENAL_FINALE, Type.GHOST, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, foeSpikesGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry217(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_THUNDER_LANCE, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, userSpAtkPositiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_THUNDER, Type.ELECTRIC, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SANGAS_MANDATE, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, userSpAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_THUNDER_BARRAGE, Type.ELECTRIC, MoveCategory.SPECIAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_LIGHTNING_DRAIN, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABSOLUTE_CATACLYSM, Type.ELECTRIC, MoveCategory.SPECIAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SANGAS_ABSOLUTE_DECREE, Type.ELECTRIC, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, userSpAtkPositiveGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry218(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SILENT_SLASH, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SHADOW_STEP, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeAccNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_VANISH, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAccNegativeGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SAMURAIS_MEDITATION, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, foeAccNegativeGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SILENT_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 90, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAccNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PHANTOM_DRAIN, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAccNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SILENT_EXECUTION, Type.DARK, MoveCategory.PHYSICAL, 100, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAccNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SASUKES_FINAL_CUT, Type.DARK, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(GatedHitHealAttr, 0.5, foeAccNegativeGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry219(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SKULL_SLAM, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpdPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BONE_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userSpdPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_SKULL, Type.GHOST, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpdPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SKULL_BARRAGE, Type.GHOST, MoveCategory.PHYSICAL, 25, 90, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, userSpdPositiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SKULL_DRAIN, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpdPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SKULL_EXECUTION, Type.GHOST, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpdPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PRIDE_OF_THE_WEAK, Type.GHOST, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpdPositiveGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry220(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_JUDGMENT_BOLT, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_THUNDER_OF_HEAVEN, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeAtkNegativeGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_JUDGMENT, Type.ELECTRIC, MoveCategory.SPECIAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FIRE_OF_HEAVEN, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foeAtkNegativeGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DRAGON_BARRAGE, Type.DRAGON, MoveCategory.SPECIAL, 25, 90, 10, 30, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foeAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_HEAVEN_DRAIN, Type.DRAGON, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAtkNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SLIFERS_SKY_JUDGMENT, Type.DRAGON, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAtkNegativeGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry221(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PERMAFROST_CRUNCH, Type.ICE, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalHighCritAttr, frozenGate, 30), Moves.ICICLE_CRASH),
    yuMove(new AttackMove(Moves.YU_FROST_DRAIN, Type.ICE, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, frozenGate), Moves.ICE_SHARD),
    yuMove(new AttackMove(Moves.YU_ABOMINABLE_SLAM, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(UseFoeAttackStatAttr)
      .attr(GatedAlwaysHitAttr, frozenGate), Moves.FOUL_PLAY),
    yuMove(new AttackMove(Moves.YU_DEVOURING_MAW, Type.ICE, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, frozenGate), Moves.MOUNTAIN_GALE),
    yuMove(new AttackMove(Moves.YU_AGE_BURIAL, Type.ICE, MoveCategory.PHYSICAL, 95, 90, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(FoeLowHpPowerAttr, 60, frozenGate), Moves.ICICLE_SPEAR),
    yuMove(new SelfStatusMove(Moves.YU_SNOWSTORM_HOWL, Type.ICE, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.WISH, 2, frozenGate, 100, false, true), Moves.HEALING_WISH),
    yuMove(new SelfStatusMove(Moves.YU_HOARFROST_CLOAK, Type.ICE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, frozenGate), Moves.MIST),
    yuMove(new AttackMove(Moves.YU_TUNDRA_FANG, Type.ICE, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, frozenGate, 50), Moves.ICE_FANG),
    yuMove(new SelfStatusMove(Moves.YU_ENDLESS_WINTER, Type.ICE, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "SNOW")
      .attr(HealBlockAttr, frozenGate), Moves.HEAL_BLOCK),
  );
}
export function registerYuDuelmonEntry222(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CHAOS_BLADE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(BonusRandomMoveAfterAttr), Moves.MAGICAL_TORQUE),
    yuMove(new AttackMove(Moves.YU_CHAOS_GUARD, Type.FAIRY, MoveCategory.PHYSICAL, -1, 100, 10, -1, 0, 4)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 1.5)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER)
      .attr(GatedDestinyBondAttr, above75HpGate)
      .attr(BonusRandomMoveAfterAttr, above75HpGate), Moves.BABY_DOLL_EYES),
    yuMove(new AttackMove(Moves.YU_JUDGMENT_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(MovePowerMultiplierAttr, (user) => 1 + Math.min(user.isPlayer() ? user.scene.currentBattle.playerFaints : user.scene.currentBattle.enemyFaints, 100))
      .attr(GatedResetStatsAttr, false, above75HpGate), Moves.LAST_RESPECTS),
    yuMove(new AttackMove(Moves.YU_GIANT_KILLER, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(SuperEffectiveVsTypesAttr, [Type.DRAGON, Type.STEEL, Type.DARK])
      .attr(GatedForceSwitchOutAttr, false, false, above75HpGate), Moves.GUILLOTINE),
  );
}
export function registerYuDuelmonEntry223(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SOUL_REAP, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, statusedGate), Moves.RAGE_FIST),
    yuMove(new AttackMove(Moves.YU_SPIRIT_TOXIN, Type.GHOST, MoveCategory.PHYSICAL, 75, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ChangeFoePrimaryTypeAttr, "GHOST", 100, statusedGate), Moves.SPIRIT_SHACKLE),
    yuMove(new AttackMove(Moves.YU_DARK_HARVEST, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SEEDED)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SEEDED, 30, statusedGate), Moves.DARKEST_LARIAT),
    yuMove(new AttackMove(Moves.YU_CURSED_FLAME, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ChangeFoePrimaryTypeAttr, "FIRE", 100, statusedGate), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_SOUL_CHILL, Type.ICE, MoveCategory.PHYSICAL, 70, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ChangeFoePrimaryTypeAttr, "ICE", 100, statusedGate), Moves.TRIPLE_AXEL),
    yuMove(new AttackMove(Moves.YU_SPECTRAL_SLASH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, statusedGate), Moves.SHADOW_SNEAK),
    yuMove(new AttackMove(Moves.YU_HEX_BOLT, Type.GHOST, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ChangeFoePrimaryTypeAttr, "ELECTRIC", 100, statusedGate), Moves.HEX),
    yuMove(new StatusMove(Moves.YU_SPECTRAL_RECOVERY, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(HpSplitAttr)
      .attr(ForesightAttr)
      .attr(GatedCureFoeStatusAttr, statusedGate)
      .attr(RandomStatBoostAttr, 3, 1, 100, statusedGate), Moves.PAIN_SPLIT),
  );
}
export function registerYuDuelmonEntry224(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MACH_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VELOCITY_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MACH_QUICK_BURST, Type.FIGHTING, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, reflectActiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GHOST_RUSH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SONIC_BLADE, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_VELOCITY_BARRIER, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_AFTERBURN_SLAM, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, reflectActiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VANISHING_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, 50, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -1, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TERMINAL_VELOCITY, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, reflectActiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SPEED_SHIELD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MACH_BARRAGE, Type.FIGHTING, MoveCategory.PHYSICAL, 25, 100, 10, -1, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FinalHitStatChangeAttr, BattleStat.DEF, -1, false, 30)
      .attr(ConditionalFinalHitStatChangeAttr, BattleStat.DEF, -1, false, reflectActiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_KINETIC_WALL, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPERSONIC_DIVE, Type.FLYING, MoveCategory.PHYSICAL, 80, 95, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MACH_DRAIN, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, reflectActiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_MACH_GUARD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, reflectActiveGate, 100, false, true), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_COMBAT_STANCE, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SPEED_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, reflectActiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_RAPID_DEPLOY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, reflectActiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_MACH_EXECUTION, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, reflectActiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VELOCITY_CATACLYSM, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(ConditionalHitHealAttr, 0, 0.5, reflectActiveGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry225(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_QUICK_IRON, Type.STEEL, MoveCategory.PHYSICAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userDefPositiveGate, 50), Moves.METAL_CLAW),
    yuMove(new AttackMove(Moves.YU_MECH_QUAKE, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.SAND_TOMB)
      .attr(ConditionalTrapAttr, BattlerTagType.SAND_TOMB, 50, userDefPositiveGate), Moves.EARTHQUAKE),
    yuMove(new SelfStatusMove(Moves.YU_IRON_FORTRESS, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, userDefPositiveGate, 100), Moves.METAL_SOUND),
    yuMove(new AttackMove(Moves.YU_ARMOR_CRUSH, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(SuppressAbilitiesAttr)
      .attr(GatedInvertPositiveStatsAttr, userDefPositiveGate), Moves.GYRO_BALL),
    yuMove(new SelfStatusMove(Moves.YU_IRON_RAMPART, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, userDefPositiveGate), Moves.SHIFT_GEAR),
    yuMove(new AttackMove(Moves.YU_GROTTO_SMASH, Type.ROCK, MoveCategory.PHYSICAL, 90, 90, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userDefPositiveGate), Moves.HEAD_SMASH),
    yuMove(new AttackMove(Moves.YU_TITANIC_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(CounterDamageAttr, (m) => m.category === MoveCategory.PHYSICAL || m.category === MoveCategory.SPECIAL, 2)
      .redirectCounter()
      .makesContact(false)
      .target(MoveTarget.ATTACKER), Moves.SACRED_SWORD),
    yuMove(new SelfStatusMove(Moves.YU_COLOSSUS_ARMOR, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(UserHpCostAttr, 0.25)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(GatedSubstituteAttr, 0.25, userDefPositiveGate), Moves.SUBSTITUTE),
    yuMove(new SelfStatusMove(Moves.YU_GROTTO_FORTIFY, Type.ROCK, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.SPIKES)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STICKY_WEB, userDefPositiveGate), Moves.SPIKES),
    yuMove(new AttackMove(Moves.YU_COLOSSUS_GRIP, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, userDefPositiveGate), Moves.HARD_PRESS),
  );
}
export function registerYuDuelmonEntry226(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TIDAL_STRIKE, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, rainGate, 50), Moves.CRABHAMMER),
    yuMove(new AttackMove(Moves.YU_TORRENT_PULSE, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, rainGate), Moves.WATER_PULSE),
    yuMove(new AttackMove(Moves.YU_OCEAN_SURGE, Type.WATER, MoveCategory.SPECIAL, 90, 100, 10, -1, 0, 9)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, rainGate), Moves.SURF),
    yuMove(new AttackMove(Moves.YU_DROWNING_CURRENT, Type.WATER, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WHIRLPOOL)
      .attr(ConditionalTrapAttr, BattlerTagType.WHIRLPOOL, 50, rainGate), Moves.BUBBLE_BEAM),
    yuMove(new AttackMove(Moves.YU_SUIJINS_WRATH, Type.WATER, MoveCategory.SPECIAL, 95, 90, 10, -1, 0, 9)
      .attr(DisableMoveAttr), Moves.DISABLE),
    yuMove(new AttackMove(Moves.YU_ICE_COVERAGE, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, rainGate, 35), Moves.ICE_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_TORRENTIAL_PRAYER, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(TriggerWishAttr, rainGate), Moves.RAIN_DANCE),
    yuMove(new AttackMove(Moves.YU_TSUNAMI, Type.WATER, MoveCategory.SPECIAL, 100, 85, 10, 30, -1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, rainGate, 50), Moves.HYDRO_PUMP),
    yuMove(new SelfStatusMove(Moves.YU_SUIJINS_SHIELD, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, rainGate, 100, false, true), Moves.LIGHT_SCREEN),
  );
}
export function registerYuDuelmonEntry227(allMoves: Move[]): void {
  allMoves.push(
    yuGadgetMove(new AttackMove(Moves.YU_VOLT_GEAR, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GOLDEN_SPARK, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_QUICK_PULSE, Type.ELECTRIC, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, tailwindActiveUserGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GOLDEN_CIRCUIT, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_FIRE_PULSE, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, tailwindActiveUserGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_GADGET_ACCELERATION, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GOLDEN_OVERLOAD, Type.ELECTRIC, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GOLDEN_SNARE, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(AddMovePowerAttr, 40, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GADGET_DRAIN, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_CLOCKWORK_DEPLOY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_THUNDER_GEAR, Type.ELECTRIC, MoveCategory.SPECIAL, 95, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, tailwindActiveUserGate, 50), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_MACHINE_WIND, Type.FLYING, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GEAR_DOWNSHIFT, Type.GROUND, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_VOLT_SALVO, Type.ELECTRIC, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_VOLT_OVERDRIVE, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_GADGET_MAINTENANCE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_NETWORK_MANDATE, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, tailwindActiveUserGate, 100), Moves.RAZOR_WIND),
    yuGadgetMove(new SelfStatusMove(Moves.YU_GEAR_STORM, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(ResetTailwindFromStartAttr)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_CIRCUIT_BREAK, Type.ELECTRIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(AddMovePowerAttr, 40, tailwindActiveUserGate), Moves.RAZOR_WIND),
    yuGadgetMove(new AttackMove(Moves.YU_GOLDEN_NETWORK_FINALE, Type.ELECTRIC, MoveCategory.SPECIAL, 100, 90, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, tailwindActiveUserGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry228(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_THUNDER_STOMP, Type.ELECTRIC, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PRIMAL_CHARGE, Type.ROCK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_JOLT, Type.ELECTRIC, MoveCategory.PHYSICAL, 60, 100, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, speedStageGte2Gate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SEISMIC_SLAM, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VOLT_FANG, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, speedStageGte2Gate, 50), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_CONDUCTORS_SURGE, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FOSSIL_RUSH, Type.ROCK, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DISCHARGE_SLAM, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TYRANNO_BARRAGE, Type.ELECTRIC, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_CHARGE_CIRCUIT, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_PREHISTORIC_CRUNCH, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_DYNAMO_BOOST, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_LIGHTNING_EXECUTION, Type.ELECTRIC, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_TAIL_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(AddMovePowerAttr, 40, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_STATIC_SHIELD, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(GatedSubstituteAttr, 0.25, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VOLT_DRAIN, Type.ELECTRIC, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_NEURAL_ACCELERATE, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, speedStageGte2Gate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_CONDUCTORS_RECOVERY, Type.ELECTRIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_CONDUCTOR_IMPACT, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, speedStageGte2Gate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SUPERCONDUCTOR_ANNIHILATION, Type.ELECTRIC, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true)
      .attr(AddMovePowerAttr, 40, speedStageGte2Gate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry229(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RUIN_BLADE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foePositiveStagesGate, 100), Moves.RAZOR_WIND),
    yuMove(new StatusMove(Moves.YU_KINGS_GIFT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2)
      .attr(StatChangeAttr, BattleStat.SPD, 1, false, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARK_EXECUTION, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RUIN_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RUIN_SHADOW_PULSE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foePositiveStagesGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ARMAGEDDON_SLAM, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new StatusMove(Moves.YU_FALSE_EMPOWERMENT, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2)
      .attr(StatChangeAttr, BattleStat.ATK, 1, false, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_CORRUPTION_WAVE, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr)
      .attr(ConditionalConfuseAttr, 50, foePositiveStagesGate),  Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_RUIN, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new StatusMove(Moves.YU_CORRUPTING_EMBRACE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, false, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RUIN_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_KINGS_DECREE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foePositiveStagesGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_RUIN_TRAP, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(AddMovePowerAttr, 40, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new StatusMove(Moves.YU_POISONED_CROWN, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 2)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.TOXIC_SPIKES, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 50, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foePositiveStagesGate, 100), Moves.RAZOR_WIND),
    yuMove(new StatusMove(Moves.YU_TAINTED_OFFERING, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 2)
      .attr(StatChangeAttr, BattleStat.DEF, 1, false, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_RUIN_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SUPREME_DECREE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_DARKNESS_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(AddMovePowerAttr, 40, foePositiveStagesGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ARMAGEDDONS_END, Type.DARK, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ResetStatsAttr, false)
      .attr(AddMovePowerAttr, 40, foePositiveStagesGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry230(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BLESSED_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_HOLY_FANG, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_QUICK_BLESSING, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_SACRED_WATER, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FLAME_BLESSING, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userAtkPositiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_LANDSTARS_PRAYER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BLESSED_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_STEEL_BLESSING, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_BLESSED_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_SWORDSMANS_FOCUS, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_ICE_BLESSING, Type.ICE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, userAtkPositiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_DIVINE_STRENGTH, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(GatedSubstituteAttr, 0.25, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_THUNDER_BLESSING, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, userAtkPositiveGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FIGHTING_SPIRIT, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_BLESSED_GUARD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_REVERSAL_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(LowHpPowerAttr)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_BLESSED_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_LANDSTARS_FORTIFY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, userAtkPositiveGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_GHOST_BLESSING, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userAtkPositiveGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_LANDSTARS_JUDGMENT, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkPositiveGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry231(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DIVINE_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, wishActiveGate), Moves.HEADBUTT),
    yuMove(new AttackMove(Moves.YU_CREATION_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, wishActiveGate, 100), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_QUICK_CREATION, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, wishActiveGate), Moves.SECRET_POWER),
    yuMove(new AttackMove(Moves.YU_FAIRY_LIGHT, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, wishActiveGate, 100), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_CREATION_BOLT, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, wishActiveGate, 50), Moves.THUNDERBOLT),
    yuMove(new SelfStatusMove(Moves.YU_CREATORS_PRAYER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, wishActiveGate, 100), Moves.ACUPRESSURE),
    yuMove(new AttackMove(Moves.YU_DIVINE_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 120, 80, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, wishActiveGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_CREATION_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, wishActiveGate), Moves.DRAINING_KISS),
    yuMove(new AttackMove(Moves.YU_SACRED_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, wishActiveGate), Moves.LAST_RESORT),
    yuMove(new SelfStatusMove(Moves.YU_FORTITUDE_PRAYER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, wishActiveGate, 100), Moves.AFTER_YOU),
    yuMove(new AttackMove(Moves.YU_CREATION_STORM, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, wishActiveGate, 100), Moves.ECHOED_VOICE),
    yuMove(new SelfStatusMove(Moves.YU_DIVINE_PLEA, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, wishActiveGate, 100), Moves.AROMATIC_MIST),
    yuMove(new AttackMove(Moves.YU_SACRED_FLAME, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, wishActiveGate, 50), Moves.FLAMETHROWER),
    yuMove(new SelfStatusMove(Moves.YU_CREATORS_SHIELD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, wishActiveGate, 100), Moves.WISH),
    yuMove(new SelfStatusMove(Moves.YU_RESURRECTION_PRAYER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(PartyStatusCureAttr, null, Abilities.NONE), Moves.ATTRACT),
    yuMove(new AttackMove(Moves.YU_BINDING_LIGHT, Type.FAIRY, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.BIND), Moves.MAGICAL_TORQUE),
    yuMove(new SelfStatusMove(Moves.YU_DIVINE_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalPartyStatusCureAttr, null, Abilities.NONE, wishActiveGate), Moves.REVIVAL_BLESSING),
    yuMove(new SelfStatusMove(Moves.YU_CREATION_MANDATE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.WISH, 2, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, wishActiveGate, 100), Moves.ASSIST),
    yuMove(new AttackMove(Moves.YU_CELESTIAL_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveScreensAttr, false), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_LIFE_EXCHANGE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, wishActiveGate), Moves.LEECH_LIFE),
  );
}
const tripleBite = (move: AttackMove): AttackMove =>
  move.attr(MultiHitAttr, MultiHitType._3).checkAllHits();

export function registerYuDuelmonEntry232(allMoves: Move[]): void {
  allMoves.push(
    yuMove(tripleBite(new AttackMove(Moves.YU_CERBERUS_CRUNCH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9))
      .attr(HighCritAttr)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.PUNISHMENT),
    yuMove(tripleBite(new AttackMove(Moves.YU_FLAME_FANG, Type.FIRE, MoveCategory.PHYSICAL, 70, 100, 10, 20, 0, 9))
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, burnedGate, 50), Moves.FLAME_CHARGE),
    yuMove(tripleBite(new AttackMove(Moves.YU_SHADOW_FANG, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 10, 0, 9))
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.CRUNCH),
    yuMove(tripleBite(new AttackMove(Moves.YU_TRIPLE_EXECUTION, Type.DARK, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9))
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.WICKED_BLOW),
    yuMove(tripleBite(new AttackMove(Moves.YU_INFERNO_BITE, Type.FIRE, MoveCategory.PHYSICAL, 65, 100, 10, 30, 0, 9))
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, burnedGate, 50), Moves.BLAZE_KICK),
    yuMove(tripleBite(new AttackMove(Moves.YU_DARK_DEVOUR, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9))
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_SCORCHING_SNAP, Type.FIRE, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.BURN_UP),
    yuMove(new SelfStatusMove(Moves.YU_PACK_HOWL, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true), Moves.TAUNT),
    yuMove(new AttackMove(Moves.YU_CERBERUS_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.THIEF),
    yuMove(new SelfStatusMove(Moves.YU_HELL_GUARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true), Moves.SNATCH),
    yuMove(new AttackMove(Moves.YU_FIRE_BREATH, Type.FIRE, MoveCategory.SPECIAL, 75, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.FIRE_PLEDGE),
    yuMove(tripleBite(new AttackMove(Moves.YU_DARKNESS_GRIP, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9))
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.THROAT_CHOP),
    yuMove(tripleBite(new AttackMove(Moves.YU_IRON_FANG, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9))
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, burnedGate), Moves.IRON_TAIL),
    yuMove(tripleBite(new AttackMove(Moves.YU_EMBER_SNAP, Type.FIRE, MoveCategory.PHYSICAL, 55, 100, 10, 20, 0, 9))
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.FIRE_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_TRIPLE_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, burnedGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.HEAL_BELL),
    yuMove(new AttackMove(Moves.YU_HELL_SURGE, Type.FIRE, MoveCategory.SPECIAL, 85, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN), Moves.ARMOR_CANNON),
    yuMove(new SelfStatusMove(Moves.YU_FANG_BARRIER, Type.DARK, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25), Moves.SUBSTITUTE),
    yuMove(new SelfStatusMove(Moves.YU_CERBERUS_SHIELD, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK), Moves.KINGS_SHIELD),
    yuMove(tripleBite(new AttackMove(Moves.YU_TRIHEAD_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9))
      .attr(RemoveScreensAttr, false), Moves.CEASELESS_EDGE),
    yuMove(tripleBite(new AttackMove(Moves.YU_CERBERUS_CATACLYSM, Type.DARK, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9))
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.CRUNCH),
  );
}
export function registerYuDuelmonEntry233(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CORRUPT_TUSK, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userAtkStageGte2Gate, 50), Moves.SPIRIT_BREAK),
    yuMove(new AttackMove(Moves.YU_DARK_STOMP, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, userAtkStageGte2Gate, 50), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_QUICK_CHARGE, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkStageGte2Gate), Moves.WILD_CHARGE),
    yuMove(new AttackMove(Moves.YU_FAIRY_CRUSH, Type.FAIRY, MoveCategory.PHYSICAL, 90, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false), Moves.PLAY_ROUGH),
    yuMove(new AttackMove(Moves.YU_CORRUPT_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkStageGte2Gate), Moves.DRAINING_KISS),
    yuMove(new SelfStatusMove(Moves.YU_ELEPHANTS_RAGE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkStageGte2Gate, 100), Moves.EXTREME_EVOBOOST),
    yuMove(new AttackMove(Moves.YU_ELEPHANT_STOMP, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.BONE_CLUB),
    yuMove(new SelfStatusMove(Moves.YU_CORRUPT_RESOLVE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(GatedSubstituteAttr, 0.25, userAtkStageGte2Gate), Moves.TOPSY_TURVY),
    yuMove(new AttackMove(Moves.YU_TUSK_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkStageGte2Gate), Moves.MAGICAL_TORQUE),
    yuMove(new SelfStatusMove(Moves.YU_BERSERK_TRAMPLE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, userAtkStageGte2Gate, 100), Moves.CELEBRATE),
    yuMove(new AttackMove(Moves.YU_CORRUPT_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkStageGte2Gate), Moves.MAGICAL_TORQUE),
    yuMove(new SelfStatusMove(Moves.YU_WAR_CRY, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, userAtkStageGte2Gate, 100), Moves.HOWL),
    yuMove(new AttackMove(Moves.YU_STAMPEDE_GRIP, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.BIND),
    yuMove(new AttackMove(Moves.YU_CORRUPT_PULSE, Type.FAIRY, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userAtkStageGte2Gate, 100), Moves.NATURES_MADNESS),
    yuMove(new SelfStatusMove(Moves.YU_PACHYDERMS_WILL, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, userAtkStageGte2Gate, 100), Moves.ACUPRESSURE),
    yuMove(new AttackMove(Moves.YU_DARK_FANG, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkStageGte2Gate), Moves.WICKED_BLOW),
    yuMove(new SelfStatusMove(Moves.YU_CORRUPT_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, userAtkStageGte2Gate, 100), Moves.CONFIDE),
    yuMove(new SelfStatusMove(Moves.YU_RAMPAGE_FORTIFY, Type.GROUND, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkStageGte2Gate, 100), Moves.MUD_SPORT),
    yuMove(new AttackMove(Moves.YU_TUSK_CLEAVE, Type.FAIRY, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveScreensAttr, false), Moves.BEAT_UP),
    yuMove(new AttackMove(Moves.YU_GANASHIAS_WRATH, Type.FAIRY, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkStageGte2Gate), Moves.OUTRAGE),
  );
}
export function registerYuDuelmonEntry234(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TRICK_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeAccNegativeGate, 50), Moves.SLASH),
    yuMove(new AttackMove(Moves.YU_ILLUSORY_MIST, Type.GHOST, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, foeAccNegativeGate, 100), Moves.BITTER_MALICE),
    yuMove(new AttackMove(Moves.YU_ILLUSORY_SLASH, Type.GHOST, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(ConditionalFlinchAttr, 30, alwaysTrueGate)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeAccNegativeGate, 50), Moves.AIR_SLASH),
    yuMove(new AttackMove(Moves.YU_TRICK_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAccNegativeGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_BLINDING_FLASH, Type.ELECTRIC, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, foeAccNegativeGate, 100), Moves.OVERDRIVE),
    yuMove(new SelfStatusMove(Moves.YU_SLEIGHT_FORTIFY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, foeAccNegativeGate, 100), Moves.COPYCAT),
    yuMove(new AttackMove(Moves.YU_SMOKESCREEN_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, foeAccNegativeGate, 100), Moves.WICKED_TORQUE),
    yuMove(new SelfStatusMove(Moves.YU_MIRAGE_SHIELD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.EVA, 2, true, foeAccNegativeGate, 100), Moves.SUBSTITUTE),
    yuMove(new AttackMove(Moves.YU_TRICK_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAccNegativeGate), Moves.TAIL_SLAP),
    yuMove(new SelfStatusMove(Moves.YU_ILLUSION_WALL, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, foeAccNegativeGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_FOG_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false), Moves.PSYSTRIKE),
    yuMove(new AttackMove(Moves.YU_TRICK_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAccNegativeGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_SPIRIT_PRESS, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.BODY_PRESS),
    yuMove(new AttackMove(Moves.YU_DAZZLE, Type.FAIRY, MoveCategory.SPECIAL, 65, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ACC, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ACC, -2, false, foeAccNegativeGate, 100), Moves.SPARKLY_SWIRL),
    yuMove(new SelfStatusMove(Moves.YU_PHANTOM_RECOVERY, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeAccNegativeGate, 100), Moves.CURSE),
    yuMove(new AttackMove(Moves.YU_TRICK_TRAP, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.CONSTRICT),
    yuMove(new SelfStatusMove(Moves.YU_MIRROR_STEP, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, foeAccNegativeGate, 100), Moves.COURT_CHANGE),
    yuMove(new SelfStatusMove(Moves.YU_TRICK_SCREEN, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, true, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, foeAccNegativeGate, 100, false, true), Moves.REFLECT),
    yuMove(new AttackMove(Moves.YU_ILLUSION_VANISH, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(ForceSwitchOutAttr, true, false)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false), Moves.HOLD_BACK),
    yuMove(new AttackMove(Moves.YU_STAGE_MIRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAccNegativeGate), Moves.BODY_SLAM),
  );
}
export function registerYuDuelmonEntry235(allMoves: Move[]): void {
  allMoves.push(
    yuMaskMove(new AttackMove(Moves.YU_MASKED_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, mistyTerrainGate, 50), Moves.BRUTAL_SWING),
    yuMaskMove(new AttackMove(Moves.YU_SHADOW_MASK, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, mistyTerrainGate, 50), Moves.NIGHT_SHADE),
    yuMaskMove(new AttackMove(Moves.YU_QUICK_MASK, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, mistyTerrainGate), Moves.SUCKER_PUNCH),
    yuMaskMove(new AttackMove(Moves.YU_MASK_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, mistyTerrainGate), Moves.BITE),
    yuMaskMove(new AttackMove(Moves.YU_PSYCHIC_MASK, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(ConfuseAttr), Moves.CONFUSION),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASK_INVOCATION, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "MISTY")
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, mistyTerrainGate, 100), Moves.AROMATIC_MIST),
    yuMaskMove(new AttackMove(Moves.YU_MASKED_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, mistyTerrainGate), Moves.KOWTOW_CLEAVE),
    yuMaskMove(new AttackMove(Moves.YU_MASK_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, mistyTerrainGate), Moves.COMEUPPANCE),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASKED_GUARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, mistyTerrainGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, mistyTerrainGate, 100), Moves.TORMENT),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASK_FOG, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "MISTY")
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, mistyTerrainGate, 100), Moves.BABY_DOLL_EYES),
    yuMaskMove(new AttackMove(Moves.YU_MASKED_SLASH, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, mistyTerrainGate, 100), Moves.NIGHT_SLASH),
    yuMaskMove(new SelfStatusMove(Moves.YU_SACRED_FOG, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "MISTY")
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, mistyTerrainGate, 100), Moves.MISTY_TERRAIN),
    yuMaskMove(new AttackMove(Moves.YU_MASK_TRAP, Type.GHOST, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.BIND),
    yuMaskMove(new AttackMove(Moves.YU_MASK_PULSE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, mistyTerrainGate), Moves.ESPER_WING),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASKED_REALM, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "MISTY")
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, mistyTerrainGate, 100), Moves.CHARM),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASK_RECOVERY, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, mistyTerrainGate, 100), Moves.TRICK_ROOM),
    yuMaskMove(new SelfStatusMove(Moves.YU_MASKED_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, mistyTerrainGate, 100), Moves.HONE_CLAWS),
    yuMaskMove(new SelfStatusMove(Moves.YU_PHANTOM_FOG, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "MISTY")
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, mistyTerrainGate), Moves.TRICK_OR_TREAT),
    yuMaskMove(new AttackMove(Moves.YU_MASK_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.KNOCK_OFF),
    yuMaskMove(new AttackMove(Moves.YU_MASK_GOD, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, mistyTerrainGate), Moves.KNOCK_OFF),
  );
}
export function registerYuDuelmonEntry236(allMoves: Move[]): void {
  allMoves.push(
    yuTimeMove(new AttackMove(Moves.YU_TIME_SLASH, Type.DRAGON, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeStatLteMinus2Gate, 50), Moves.DRAGON_HAMMER),
    yuTimeMove(new AttackMove(Moves.YU_EROSION_PULSE, Type.DRAGON, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeStatLteMinus2Gate, 100), Moves.DRAGON_PULSE),
    yuTimeMove(new AttackMove(Moves.YU_QUICK_DECAY, Type.DRAGON, MoveCategory.PHYSICAL, 60, 100, 10, 10, 1, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeStatLteMinus2Gate), Moves.DRAGON_BREATH),
    yuTimeMove(new AttackMove(Moves.YU_MILLENNIUM_SIP, Type.DRAGON, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeStatLteMinus2Gate), Moves.GLAIVE_RUSH),
    yuTimeMove(new AttackMove(Moves.YU_AGING_TOUCH, Type.GHOST, MoveCategory.SPECIAL, 65, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, foeStatLteMinus2Gate, 50), Moves.INFERNAL_PARADE),
    yuTimeMove(new SelfStatusMove(Moves.YU_ANCIENT_MANDATE, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, foeStatLteMinus2Gate, 100), Moves.CLANGOROUS_SOUL),
    yuTimeMove(new AttackMove(Moves.YU_TEMPORAL_EROSION, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeStatLteMinus2Gate, 50), Moves.ECHOED_VOICE),
    yuTimeMove(new SelfStatusMove(Moves.YU_MILLENNIUM_GUARD, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, foeStatLteMinus2Gate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeStatLteMinus2Gate, 100), Moves.DRAGON_DANCE),
    yuTimeMove(new AttackMove(Moves.YU_TIME_BARRAGE, Type.DRAGON, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeStatLteMinus2Gate), Moves.SCALE_SHOT),
    yuTimeMove(new AttackMove(Moves.YU_AGE_TRAP, Type.DRAGON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeStatLteMinus2Gate), Moves.ORDER_UP),
    yuTimeMove(new AttackMove(Moves.YU_DECAY_BREATH, Type.DRAGON, MoveCategory.SPECIAL, 80, 95, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeStatLteMinus2Gate, 50), Moves.DRACO_METEOR),
    yuTimeMove(new AttackMove(Moves.YU_MILLENNIUM_EXECUTION, Type.DRAGON, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeStatLteMinus2Gate), Moves.OUTRAGE),
    yuTimeMove(new AttackMove(Moves.YU_GROUND_CRUSH, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, foeStatLteMinus2Gate, 50), Moves.FISSURE),
    yuTimeMove(new AttackMove(Moves.YU_WITHERING_GAZE, Type.PSYCHIC, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -1, false, foeStatLteMinus2Gate, 50), Moves.EXTRASENSORY),
    yuTimeMove(new SelfStatusMove(Moves.YU_ANCIENT_RECOVERY, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, foeStatLteMinus2Gate, 100), Moves.DRAGON_CHEER),
    yuTimeMove(new SelfStatusMove(Moves.YU_TIME_SHIELD, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, false, true)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, foeStatLteMinus2Gate, 100), Moves.SUBSTITUTE),
    yuTimeMove(new AttackMove(Moves.YU_FOSSIL_SLAM, Type.ROCK, MoveCategory.PHYSICAL, 85, 90, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeStatLteMinus2Gate, 50), Moves.STONE_EDGE),
    yuTimeMove(new SelfStatusMove(Moves.YU_TEMPORAL_FORTIFY, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, foeStatLteMinus2Gate, 100), Moves.CLANGOROUS_SOUL),
    yuTimeMove(new AttackMove(Moves.YU_DARK_DECAY, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeStatLteMinus2Gate, 100), Moves.FOUL_PLAY),
    yuTimeMove(new AttackMove(Moves.YU_MILLENNIUM_CATACLYSM, Type.DRAGON, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeStatLteMinus2Gate), Moves.BREAKING_SWIPE),
  );
}
export function registerYuDuelmonEntry237(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_RESTRICTING_GAZE, Type.PSYCHIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userStatGte2Gate, 100), Moves.FREEZING_GLARE),
    yuMove(new AttackMove(Moves.YU_DARK_LOCK, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userStatGte2Gate, 100), Moves.JAW_LOCK),
    yuMove(new AttackMove(Moves.YU_QUICK_SEAL, Type.PSYCHIC, MoveCategory.SPECIAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userStatGte2Gate, 100), Moves.GLITZY_GLOW),
    yuMove(new AttackMove(Moves.YU_GAZE_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStatGte2Gate), Moves.HYPERSPACE_HOLE),
    yuMove(new AttackMove(Moves.YU_SHADOW_BIND, Type.GHOST, MoveCategory.SPECIAL, 70, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, userStatGte2Gate, 100), Moves.MOONGEIST_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_ALL_SEEING_FOCUS, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userStatGte2Gate, 100), Moves.AGILITY),
    yuMove(new AttackMove(Moves.YU_RESTRICT_EXECUTION, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStatGte2Gate), Moves.LUMINA_CRASH),
    yuMove(new AttackMove(Moves.YU_EYE_BARRAGE, Type.PSYCHIC, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userStatGte2Gate), Moves.LUSTER_PURGE),
    yuMove(new AttackMove(Moves.YU_BINDING_GAZE, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, userStatGte2Gate), Moves.FEINT_ATTACK),
    yuMove(new SelfStatusMove(Moves.YU_HORRORS_RESOLVE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, userStatGte2Gate, 100), Moves.FAKE_TEARS),
    yuMove(new AttackMove(Moves.YU_THOUSAND_EYE_BLAST, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userStatGte2Gate, 100), Moves.MIST_BALL),
    yuMove(new SelfStatusMove(Moves.YU_RESTRICT_FORTIFY, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 2, true, userStatGte2Gate, 100), Moves.CALM_MIND),
    yuMove(new AttackMove(Moves.YU_ICE_GAZE, Type.ICE, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -1, false, userStatGte2Gate, 50), Moves.BLIZZARD),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_LOCK, Type.ELECTRIC, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, userStatGte2Gate, 50), Moves.PIKA_PAPOW),
    yuMove(new SelfStatusMove(Moves.YU_RESTRICT_RECOVERY, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, userStatGte2Gate, 100), Moves.AMNESIA),
    yuMove(new AttackMove(Moves.YU_SEAL_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.NIGHT_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_THOUSAND_EYE_SHIELD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, userStatGte2Gate, 100), Moves.MIRACLE_EYE),
    yuMove(new AttackMove(Moves.YU_HORRORS_WRATH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, userStatGte2Gate, 100), Moves.HYPERSPACE_FURY),
    yuMove(new AttackMove(Moves.YU_RESTRICT_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, userStatGte2Gate, 100), Moves.SEISMIC_TOSS),
    yuMove(new AttackMove(Moves.YU_THOUSAND_EYES_JUDGMENT, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 100, 10, -1, 0, 9)
      .attr(IncrementMovePriorityAttr, () => true, -1)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userStatGte2Gate), Moves.MYSTICAL_POWER),
  );
}
export function registerYuDuelmonEntry238(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ROULETTE_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, below50HpGate, 100), Moves.HORN_ATTACK),
    yuMove(new AttackMove(Moves.YU_DARK_GAMBIT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, below50HpGate, 100), Moves.THIEF),
    yuMove(new AttackMove(Moves.YU_QUICK_ROLL, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, below50HpGate, 100), Moves.STOMP),
    yuMove(new AttackMove(Moves.YU_DESPERATE_SURGE, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.REVERSAL),
    yuMove(new AttackMove(Moves.YU_TIME_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.PHOTON_GEYSER),
    yuMove(new SelfStatusMove(Moves.YU_GAMBLERS_FOCUS, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, below50HpGate, 100), Moves.FOCUS_ENERGY),
    yuMove(new AttackMove(Moves.YU_COIN_FLIP_CRASH, Type.NORMAL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.STRENGTH),
    yuMove(new SelfStatusMove(Moves.YU_FORTUNE_BARRIER, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, below50HpGate, 100), Moves.DOODLE),
    yuMove(new AttackMove(Moves.YU_RECKLESS_BLAZE, Type.FIRE, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(RecoilAttr, true, 0.10)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, below50HpGate, 50), Moves.ERUPTION),
    yuMove(new SelfStatusMove(Moves.YU_TIME_GUARD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, below50HpGate, 100), Moves.BARRIER),
    yuMove(new AttackMove(Moves.YU_ROULETTE_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, below50HpGate), Moves.COMET_PUNCH),
    yuMove(new AttackMove(Moves.YU_ALL_IN_SLAM, Type.FIGHTING, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.LEECH_LIFE),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_GAMBLE, Type.ELECTRIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, below50HpGate, 100), Moves.THUNDERCLAP),
    yuMove(new SelfStatusMove(Moves.YU_LUCKY_STAR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 2, true, below50HpGate, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, below50HpGate, 100), Moves.DOUBLE_TEAM),
    yuMove(new SelfStatusMove(Moves.YU_TIME_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 2, true, below50HpGate, 100), Moves.TEATIME),
    yuMove(new AttackMove(Moves.YU_GHOST_GAMBLE, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, below50HpGate, 100), Moves.OMINOUS_WIND),
    yuMove(new SelfStatusMove(Moves.YU_WIZARDS_MANDATE, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, below50HpGate, 100), Moves.AGILITY),
    yuMove(new AttackMove(Moves.YU_RECOIL_RUSH, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_ICE_GAMBLE, Type.ICE, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, below50HpGate, 50), Moves.POWDER_SNOW),
    yuMove(new AttackMove(Moves.YU_FINAL_SPIN, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, below50HpGate), Moves.BODY_SLAM),
  );
}
export function registerYuDuelmonEntry239(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_SPIKE_SLAM, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userDefPositiveGate, 100), Moves.BODY_SLAM),
    yuMove(new AttackMove(Moves.YU_SPIKE_SHOT, Type.STEEL, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userDefPositiveGate, 100), Moves.MIRROR_SHOT),
    yuMove(new AttackMove(Moves.YU_QUICK_SPIKE, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userDefPositiveGate, 100), Moves.SPIKE_CANNON),
    yuMove(new AttackMove(Moves.YU_SPIKE_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userDefPositiveGate), Moves.STRENGTH),
    yuMove(new AttackMove(Moves.YU_BODY_PRESS, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(UseDefenseStatAsAttackAttr)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, userDefPositiveGate, 100), Moves.FLYING_PRESS),
    yuMove(new SelfStatusMove(Moves.YU_SHELL_HARDEN, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, userDefPositiveGate, 100), Moves.AUTOTOMIZE),
    yuMove(new AttackMove(Moves.YU_ROCK_BARRAGE, Type.ROCK, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userDefPositiveGate), Moves.ROCK_BLAST),
    yuMove(new SelfStatusMove(Moves.YU_SPIKE_WALL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userDefPositiveGate, 100), Moves.GEAR_UP),
    yuMove(new AttackMove(Moves.YU_SHELL_TRAP, Type.NORMAL, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, userDefPositiveGate), Moves.HORN_DRILL),
    yuMove(new SelfStatusMove(Moves.YU_IRON_SHELL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, userDefPositiveGate, 100), Moves.SHELTER),
    yuMove(new AttackMove(Moves.YU_POISON_SPIKE, Type.POISON, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.POISON)
      .attr(ConditionalStatusEffectAttr, StatusEffect.POISON, userDefPositiveGate, 50), Moves.CROSS_POISON),
    yuMove(new SelfStatusMove(Moves.YU_SHELL_RESTORE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalHealAttr, 0.5, userDefPositiveGate), Moves.SHELL_SMASH),
    yuMove(new AttackMove(Moves.YU_SPIKE_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, true, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userDefPositiveGate), Moves.SPIKE_CANNON),
    yuMove(new AttackMove(Moves.YU_GROUND_SPIKE, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userDefPositiveGate, 100), Moves.HEADLONG_RUSH),
    yuMove(new SelfStatusMove(Moves.YU_SPIKE_GUARD, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, userDefPositiveGate, 100), Moves.KINGS_SHIELD),
    yuMove(new SelfStatusMove(Moves.YU_SHELL_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 2, true, userDefPositiveGate, 100), Moves.ENDURE),
    yuMove(new AttackMove(Moves.YU_SPIKE_STORM, Type.STEEL, MoveCategory.SPECIAL, 75, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userDefPositiveGate, 100), Moves.STEEL_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_FORTRESS_MODE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userDefPositiveGate, 100), Moves.SHIFT_GEAR),
    yuMove(new AttackMove(Moves.YU_SPIKE_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.CRUSH_CLAW),
    yuMove(new AttackMove(Moves.YU_SHELL_CATACLYSM, Type.NORMAL, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userDefPositiveGate), Moves.BODY_SLAM),
  );
}
export function registerYuDuelmonEntry240(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_LOVE_STRIKE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(FlinchAttr), Moves.FLING),
    yuMove(new AttackMove(Moves.YU_TWISTED_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeBelow50HpGate, 100), Moves.LEECH_LIFE),
    yuMove(new AttackMove(Moves.YU_QUICK_TORMENT, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeBelow50HpGate, 100), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_PULSE, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeBelow50HpGate, 100), Moves.SHADOW_BALL),
    yuMove(new AttackMove(Moves.YU_DARK_FLAME, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foeBelow50HpGate, 50), Moves.FLAMETHROWER),
    yuMove(new SelfStatusMove(Moves.YU_TWISTED_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeBelow50HpGate, 100), Moves.NASTY_PLOT),
    yuMove(new AttackMove(Moves.YU_LOVE_BARRAGE, Type.DARK, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.NIGHT_DAZE),
    yuMove(new SelfStatusMove(Moves.YU_YUBELS_GUARD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, foeBelow50HpGate, 100), Moves.OBSTRUCT),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_LOVE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeBelow50HpGate), Moves.MIST_BALL),
    yuMove(new AttackMove(Moves.YU_TORMENT_BIND, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeBelow50HpGate), Moves.JAW_LOCK),
    yuMove(new AttackMove(Moves.YU_DARK_THUNDER, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeBelow50HpGate, 100), Moves.THUNDERBOLT),
    yuMove(new SelfStatusMove(Moves.YU_TWISTED_SCREEN, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, foeBelow50HpGate, 100), Moves.REFLECT),
    yuMove(new AttackMove(Moves.YU_LOVE_EXECUTION, Type.DARK, MoveCategory.SPECIAL, 110, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeBelow50HpGate), Moves.BADDY_BAD),
    yuMove(new AttackMove(Moves.YU_NIGHTMARE_SLASH, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, foeBelow50HpGate, 100), Moves.SHADOW_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_TWISTED_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeBelow50HpGate, 100), Moves.EMBARGO),
    yuMove(new AttackMove(Moves.YU_DARK_ICE, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, foeBelow50HpGate, 50), Moves.BLIZZARD),
    yuMove(new StatusMove(Moves.YU_YUBELS_CURSE, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(ChanceCurseAttr, 100)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, foeBelow50HpGate, 100)
      .target(MoveTarget.CURSE), Moves.CURSE),
    yuMove(new SelfStatusMove(Moves.YU_LOVE_SCREEN, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, foeBelow50HpGate, 100), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_TWISTED_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.KOWTOW_CLEAVE),
    yuMove(new AttackMove(Moves.YU_ETERNAL_LOVE, Type.DARK, MoveCategory.SPECIAL, 100, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, foeBelow50HpGate, 100), Moves.FIERY_WRATH),
  );
}
export function registerYuDuelmonEntry241(allMoves: Move[]): void {
  allMoves.push(

    yuMove(new AttackMove(Moves.YU_DARK_POTENTIAL, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userAtkStageGte3Gate, 100), Moves.DARKEST_LARIAT),
    yuMove(new AttackMove(Moves.YU_CURSED_FANG, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkStageGte3Gate), Moves.THROAT_CHOP),
    yuMove(new AttackMove(Moves.YU_QUICK_CURSE, Type.DARK, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userAtkStageGte3Gate, 100), Moves.SUCKER_PUNCH),
    yuMove(new AttackMove(Moves.YU_CURSED_DRAIN, Type.DARK, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkStageGte3Gate), Moves.BITE),
    yuMove(new AttackMove(Moves.YU_GHOST_STRIKE, Type.GHOST, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, userAtkStageGte3Gate, 100), Moves.SINISTER_ARROW_RAID),
    yuMove(new SelfStatusMove(Moves.YU_CURSED_SURGE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkStageGte3Gate, 100), Moves.TAUNT),
    yuMove(new AttackMove(Moves.YU_CURSED_SPIRIT, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userAtkStageGte3Gate, 100), Moves.BODY_PRESS),
    yuMove(new AttackMove(Moves.YU_CURSED_BARRAGE, Type.DARK, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkStageGte3Gate), Moves.LASH_OUT),
    yuMove(new AttackMove(Moves.YU_DARK_TRAP, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, userAtkStageGte3Gate), Moves.JAW_LOCK),
    yuMove(new SelfStatusMove(Moves.YU_DARK_RESOLVE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userAtkStageGte3Gate, 100), Moves.DARK_VOID),
    yuMove(new AttackMove(Moves.YU_CURSED_EXECUTION, Type.DARK, MoveCategory.PHYSICAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userAtkStageGte3Gate), Moves.NIGHT_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_UNDYING_WILL, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, userAtkStageGte3Gate, 100), Moves.DETECT),
    yuMove(new AttackMove(Moves.YU_ROCK_SMASH, Type.ROCK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userAtkStageGte3Gate, 100), Moves.MIGHTY_CLEAVE),
    yuMove(new SelfStatusMove(Moves.YU_CURSED_SHIELD, Type.DARK, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userAtkStageGte3Gate, 100), Moves.FLATTER),
    yuMove(new SelfStatusMove(Moves.YU_DARK_RESTORATION, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(HealAttr, 0.25)
      .attr(ConditionalHealAttr, 0.5, userAtkStageGte3Gate), Moves.HONE_CLAWS),
    yuMove(new AttackMove(Moves.YU_GROUND_SLASH, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userAtkStageGte3Gate, 100), Moves.AIR_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_CURSED_RECOVERY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, userAtkStageGte3Gate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.REFRESH),
    yuMove(new SelfStatusMove(Moves.YU_ZOMBYRAS_FURY, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, userAtkStageGte3Gate, 100), Moves.PARTING_SHOT),
    yuMove(new AttackMove(Moves.YU_DARK_CLEAVE, Type.DARK, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.BRUTAL_SWING),
    yuMove(new AttackMove(Moves.YU_FINAL_STAND, Type.DARK, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, userAtkStageGte3Gate)
      .attr(GatedHitHealAttr, 0.33, userAtkStageGte3Gate), Moves.KNOCK_OFF),
  );
}
export function registerYuDuelmonEntry242(allMoves: Move[]): void {
  allMoves.push(

    yuMove(new AttackMove(Moves.YU_FOREST_SLASH, Type.GRASS, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, grassyTerrainGate, 100), Moves.LEAF_BLADE),
    yuMove(new AttackMove(Moves.YU_FAIRY_BLOOM, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, grassyTerrainGate, 100), Moves.DAZZLING_GLEAM),
    yuMove(new AttackMove(Moves.YU_QUICK_VINE, Type.GRASS, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, grassyTerrainGate, 100), Moves.POWER_WHIP),
    yuMove(new AttackMove(Moves.YU_SPRITE_DRAIN, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, grassyTerrainGate), Moves.GIGA_DRAIN),
    yuMove(new AttackMove(Moves.YU_THORN_WHIP, Type.GRASS, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, grassyTerrainGate, 100), Moves.VINE_WHIP),
    yuMove(new SelfStatusMove(Moves.YU_FOREST_INVOCATION, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(ResetTerrainFromStartAttr, "GRASSY")
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, grassyTerrainGate, 100), Moves.AROMATHERAPY),
    yuMove(new AttackMove(Moves.YU_FAIRY_EXECUTION, Type.FAIRY, MoveCategory.SPECIAL, 100, 85, 10, -1, 0, 9)
      .attr(RecoilAttr, false, 0.25)
      .attr(GatedHitHealAttr, 0.5, grassyTerrainGate), Moves.MOONBLAST),
    yuMove(new AttackMove(Moves.YU_SPRITE_BARRAGE, Type.GRASS, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, grassyTerrainGate), Moves.BULLET_SEED),
    yuMove(new AttackMove(Moves.YU_VINE_TRAP, Type.GRASS, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, grassyTerrainGate), Moves.SNAP_TRAP),
    yuMove(new SelfStatusMove(Moves.YU_WOODLAND_GUARD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, grassyTerrainGate, 100), Moves.BABY_DOLL_EYES),
    yuMove(new AttackMove(Moves.YU_LEAF_STORM, Type.GRASS, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, grassyTerrainGate, 100), Moves.LEAF_STORM),
    yuMove(new SelfStatusMove(Moves.YU_SPRITE_MANDATE, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, grassyTerrainGate, 100), Moves.CRAFTY_SHIELD),
    yuMove(new AttackMove(Moves.YU_GROUND_ROOT, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, grassyTerrainGate, 100), Moves.LANDS_WRATH),
    yuMove(new AttackMove(Moves.YU_POLLEN_BURST, Type.GRASS, MoveCategory.SPECIAL, 75, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, grassyTerrainGate, 50), Moves.ENERGY_BALL),
    yuMove(new SelfStatusMove(Moves.YU_FOREST_RECOVERY, Type.GRASS, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, grassyTerrainGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.FORESTS_CURSE),
    yuMove(new SelfStatusMove(Moves.YU_FAIRY_SHIELD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, grassyTerrainGate, 100), Moves.FAIRY_LOCK),
    yuMove(new AttackMove(Moves.YU_FIRE_THORN, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, grassyTerrainGate, 50), Moves.MYSTICAL_FIRE),
    yuMove(new SelfStatusMove(Moves.YU_SPRITE_SCREEN, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, grassyTerrainGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_WOODLAND_CLEAVE, Type.GRASS, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.BRANCH_POKE),
    yuMove(new AttackMove(Moves.YU_FOREST_CATACLYSM, Type.GRASS, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, grassyTerrainGate)
      .attr(GatedHitHealAttr, 0.5, grassyTerrainGate), Moves.HORN_LEECH),
  );
}
export function registerYuDuelmonEntry243(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_OCEAN_STRIKE, Type.WATER, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeSpDefNegativeGate, 100), Moves.BOUNCY_BUBBLE),
    yuMove(new AttackMove(Moves.YU_TIDAL_EROSION, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeSpDefNegativeGate, 100), Moves.BRINE),
    yuMove(new AttackMove(Moves.YU_QUICK_WAVE, Type.WATER, MoveCategory.SPECIAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeSpDefNegativeGate, 100), Moves.WATER_SHURIKEN),
    yuMove(new AttackMove(Moves.YU_DRAGON_SURGE, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpDefNegativeGate), Moves.DRACO_METEOR),
    yuMove(new AttackMove(Moves.YU_CORROSION_PULSE, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeSpDefNegativeGate, 100), Moves.WATER_PULSE),
    yuMove(new SelfStatusMove(Moves.YU_DRAGON_MANDATE, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeSpDefNegativeGate, 100), Moves.DRAGON_DANCE),
    yuMove(new AttackMove(Moves.YU_ICE_EROSION, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeSpDefNegativeGate, 100), Moves.ICE_BEAM),
    yuMove(new AttackMove(Moves.YU_HYDRO_DRAIN, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpDefNegativeGate), Moves.HYDRO_PUMP),
    yuMove(new AttackMove(Moves.YU_OCEAN_BARRAGE, Type.WATER, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeSpDefNegativeGate), Moves.SCALD),
    yuMove(new SelfStatusMove(Moves.YU_DRAGON_GUARD, Type.DRAGON, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, foeSpDefNegativeGate, 100), Moves.DRAGON_CHEER),
    yuMove(new AttackMove(Moves.YU_ABYSSAL_PULSE, Type.WATER, MoveCategory.SPECIAL, 85, 95, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeSpDefNegativeGate, 100), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_OCEAN_EXECUTION, Type.WATER, MoveCategory.SPECIAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, foeSpDefNegativeGate), Moves.BUBBLE),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_SURGE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, foeSpDefNegativeGate, 100), Moves.DISCHARGE),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_WAVE, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeSpDefNegativeGate, 100), Moves.STORED_POWER),
    yuMove(new SelfStatusMove(Moves.YU_OCEAN_RECOVERY, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, foeSpDefNegativeGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.HEAL_BELL),
    yuMove(new AttackMove(Moves.YU_DRAGON_TRAP, Type.DRAGON, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, foeSpDefNegativeGate), Moves.DRAGON_DARTS),
    yuMove(new SelfStatusMove(Moves.YU_TIDAL_SHIELD, Type.WATER, -1, 10, -1, 0, 9)
      .attr(AddBattlerTagAttr, BattlerTagType.SUBSTITUTE, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeSpDefNegativeGate, 100), Moves.SOAK),
    yuMove(new SelfStatusMove(Moves.YU_OCEAN_SCREEN, Type.WATER, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, foeSpDefNegativeGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_DRAGON_CLEAVE, Type.DRAGON, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.DRAGON_RUSH),
    yuMove(new AttackMove(Moves.YU_PRIMORDIAL_DELUGE, Type.WATER, MoveCategory.SPECIAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, foeSpDefNegativeGate)
      .attr(GatedHitHealAttr, 0.5, foeSpDefNegativeGate), Moves.CHILLING_WATER),
  );
}
export function registerYuDuelmonEntry244(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CLUSTER_STRIKE, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, rainGate, 100), Moves.SURGING_STRIKES),
    yuMove(new AttackMove(Moves.YU_SWARM_PULSE, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, rainGate, 100), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_QUICK_SPLASH, Type.WATER, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, rainGate, 100), Moves.JET_PUNCH),
    yuMove(new AttackMove(Moves.YU_CLUSTER_DRAIN, Type.WATER, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, rainGate), Moves.SCALD),
    yuMove(new AttackMove(Moves.YU_RAIN_BREAK, Type.DRAGON, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, rainGate, 100), Moves.SPACIAL_REND),
    yuMove(new SelfStatusMove(Moves.YU_RAINSTORM, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, rainGate, 100), Moves.WATER_SPORT),
    yuMove(new AttackMove(Moves.YU_CLUSTER_EXECUTION, Type.WATER, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, rainGate), Moves.SURF),
    yuMove(new AttackMove(Moves.YU_SWARM_BARRAGE, Type.WATER, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, rainGate), Moves.DIVE),
    yuMove(new AttackMove(Moves.YU_ICE_BURST, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, rainGate, 35), Moves.ICE_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_MONSOON_CALL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, rainGate, 100), Moves.AQUA_RING),
    yuMove(new AttackMove(Moves.YU_TIDAL_SLAM, Type.WATER, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, rainGate, 100), Moves.FISHIOUS_REND),
    yuMove(new SelfStatusMove(Moves.YU_STORM_INVOCATION, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, rainGate, 100), Moves.SOAK),
    yuMove(new AttackMove(Moves.YU_GROUND_WAVE, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, rainGate, 100), Moves.MAGNITUDE),
    yuMove(new AttackMove(Moves.YU_CLUSTER_TRAP, Type.WATER, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(ConditionalTrapAttr, BattlerTagType.WRAP, 50, rainGate), Moves.CLAMP),
    yuMove(new SelfStatusMove(Moves.YU_STORM_SHIELD, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(GatedAddBattlerTagAttr, BattlerTagType.SUBSTITUTE, 100, rainGate), Moves.WITHDRAW),
    yuMove(new SelfStatusMove(Moves.YU_SWARM_RECOVERY, Type.WATER, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, rainGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.REFRESH),
    yuMove(new SelfStatusMove(Moves.YU_CLUSTER_MANDATE, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, rainGate, 100), Moves.ACUPRESSURE),
    yuMove(new SelfStatusMove(Moves.YU_DELUGE_CALL, Type.WATER, -1, 10, -1, 0, 9)
      .attr(ResetWeatherFromStartAttr, "RAIN")
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, rainGate), Moves.STEALTH_ROCK),
    yuMove(new AttackMove(Moves.YU_SWARM_CLEAVE, Type.WATER, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.AQUA_CUTTER),
    yuMove(new AttackMove(Moves.YU_CLUSTER_CATACLYSM, Type.WATER, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, rainGate)
      .attr(GatedHitHealAttr, 0.5, rainGate), Moves.CRABHAMMER),
  );
}
export function registerYuDuelmonEntry245(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_BULLET_BLAZE, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, -1, 1, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userSpdPositiveGate, 100), Moves.BITTER_BLADE),
    yuMove(new AttackMove(Moves.YU_FLAME_SHOT, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userSpdPositiveGate, 100), Moves.FIRE_BLAST),
    yuMove(new AttackMove(Moves.YU_QUICK_IGNITE, Type.FIRE, MoveCategory.PHYSICAL, 60, 100, 10, -1, 2, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userSpdPositiveGate, 100), Moves.BLAZE_KICK),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_DRAIN, Type.FIRE, MoveCategory.PHYSICAL, 75, 100, 10, -1, 1, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userSpdPositiveGate), Moves.FLAME_WHEEL),
    yuMove(new AttackMove(Moves.YU_STEEL_SHOT, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userSpdPositiveGate, 100), Moves.ANCHOR_SHOT),
    yuMove(new SelfStatusMove(Moves.YU_VELOCITY_BOOST, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, userSpdPositiveGate, 100), Moves.HOWL),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_EXECUTION, Type.FIRE, MoveCategory.PHYSICAL, 110, 85, 10, -1, 1, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, userSpdPositiveGate), Moves.HEAT_CRASH),
    yuMove(new AttackMove(Moves.YU_BULLET_BARRAGE, Type.FIRE, MoveCategory.PHYSICAL, 25, 100, 10, 10, 1, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpdPositiveGate), Moves.BLAZING_TORQUE),
    yuMove(new AttackMove(Moves.YU_GROUND_BLAST, Type.GROUND, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userSpdPositiveGate), Moves.PRECIPICE_BLADES),
    yuMove(new SelfStatusMove(Moves.YU_PYRO_HARDEN, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userSpdPositiveGate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_INFERNO_SHOT, Type.FIRE, MoveCategory.SPECIAL, 80, 90, 10, 30, 1, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userSpdPositiveGate, 50), Moves.INCINERATE),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_CATACLYSM, Type.FIRE, MoveCategory.PHYSICAL, 100, 90, 10, -1, 1, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, userSpdPositiveGate)
      .attr(GatedHitHealAttr, 0.5, userSpdPositiveGate), Moves.FLARE_BLITZ),
  );
}
export function registerYuDuelmonEntry246(allMoves: Move[]): void {
  allMoves.push(

    yuMove(new AttackMove(Moves.YU_ZANY_CHOMP, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userEvaPositiveGate, 100), Moves.SPIRIT_BREAK),
    yuMove(new AttackMove(Moves.YU_SPLASH_PULSE, Type.WATER, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userEvaPositiveGate, 100), Moves.ORIGIN_PULSE),
    yuMove(new AttackMove(Moves.YU_ZANY_SPLASH, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userEvaPositiveGate, 100), Moves.AQUA_CUTTER),
    yuMove(new AttackMove(Moves.YU_TOON_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, userEvaPositiveGate), Moves.SPRINGTIDE_STORM),
    yuMove(new AttackMove(Moves.YU_DARK_CHOMP, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userEvaPositiveGate), Moves.PAYBACK),
    yuMove(new SelfStatusMove(Moves.YU_SLIPPERY_DANCE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userEvaPositiveGate, 100), Moves.SWORDS_DANCE),
    yuMove(new AttackMove(Moves.YU_TOON_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, userEvaPositiveGate), Moves.MAGICAL_TORQUE),
    yuMove(new AttackMove(Moves.YU_SPLASH_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userEvaPositiveGate), Moves.DOUBLE_HIT),
    yuMove(new AttackMove(Moves.YU_WATER_TRAP, Type.WATER, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.WATERFALL),
    yuMove(new SelfStatusMove(Moves.YU_ZANY_EVASION, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, userEvaPositiveGate, 100), Moves.ENTRAINMENT),
    yuMove(new AttackMove(Moves.YU_ZANY_SQUALL, Type.FAIRY, MoveCategory.SPECIAL, 85, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, userEvaPositiveGate, 100), Moves.STRANGE_STEAM),
    yuMove(new SelfStatusMove(Moves.YU_ZANY_GUARD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userEvaPositiveGate, 100), Moves.DECORATE),
    yuMove(new AttackMove(Moves.YU_GROUND_CHOMP, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userEvaPositiveGate), Moves.STOMPING_TANTRUM),
    yuMove(new AttackMove(Moves.YU_TOON_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userEvaPositiveGate, 100), Moves.NIGHT_SLASH),
    yuMove(new SelfStatusMove(Moves.YU_SPLASH_SHIELD, Type.WATER, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.EVA, 1, true)
      .attr(GatedSubstituteAttr, 0.25, userEvaPositiveGate), Moves.SUBSTITUTE),
    yuMove(new SelfStatusMove(Moves.YU_ZANY_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, userEvaPositiveGate, true,
        StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC,
        StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.HEAL_BELL),
    yuMove(new SelfStatusMove(Moves.YU_ZANY_MANDATE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userEvaPositiveGate, 100), Moves.FILLET_AWAY),
    yuMove(new SelfStatusMove(Moves.YU_SPLASH_SCREEN, Type.WATER, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, userEvaPositiveGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_ZANY_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.AQUA_STEP),
    yuMove(new AttackMove(Moves.YU_ZANY_CATACLYSM, Type.NORMAL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, userEvaPositiveGate)
      .attr(GatedHitHealAttr, 0.5, userEvaPositiveGate), Moves.PLAY_ROUGH),
  );
}
export function registerYuDuelmonEntry247(allMoves: Move[]): void {
  allMoves.push(

    yuMove(new AttackMove(Moves.YU_GEAR_POUND, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false), Moves.GEAR_GRIND),
    yuMove(new AttackMove(Moves.YU_FAIRY_SMASH, Type.FAIRY, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeDefNegativeGate, 100), Moves.SPIRIT_BREAK),
    yuMove(new AttackMove(Moves.YU_TOON_GEAR, Type.STEEL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeDefNegativeGate, 100), Moves.BEHEMOTH_BASH),
    yuMove(new AttackMove(Moves.YU_GEAR_DRAIN, Type.STEEL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeDefNegativeGate), Moves.MAGNET_BOMB),
    yuMove(new AttackMove(Moves.YU_POUND_DOWN, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDefNegativeGate, 100), Moves.THOUSAND_ARROWS),
    yuMove(new SelfStatusMove(Moves.YU_GOLEM_MANDATE, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeDefNegativeGate, 100), Moves.SHIFT_GEAR),
    yuMove(new AttackMove(Moves.YU_TOON_SLAM, Type.FAIRY, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDefNegativeGate, 100), Moves.MAGICAL_TORQUE),
    yuMove(new AttackMove(Moves.YU_GEAR_BARRAGE, Type.STEEL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeDefNegativeGate), Moves.BULLET_PUNCH),
    yuMove(new AttackMove(Moves.YU_GEAR_TRAP, Type.STEEL, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.METEOR_MASH),
    yuMove(new SelfStatusMove(Moves.YU_POUND_GUARD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, foeDefNegativeGate, 100), Moves.DEFENSE_CURL),
    yuMove(new AttackMove(Moves.YU_IRON_SLAM, Type.STEEL, MoveCategory.PHYSICAL, 90, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDefNegativeGate, 100), Moves.ANCHOR_SHOT),
    yuMove(new AttackMove(Moves.YU_GEAR_EXECUTION, Type.STEEL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, foeDefNegativeGate), Moves.SMART_STRIKE),
    yuMove(new AttackMove(Moves.YU_FIGHTING_GEAR, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeDefNegativeGate, 100), Moves.STORM_THROW),
    yuMove(new AttackMove(Moves.YU_ROCK_POUND, Type.ROCK, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeDefNegativeGate, 100), Moves.ROCK_SLIDE),
    yuMove(new SelfStatusMove(Moves.YU_GOLEM_RECOVERY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, foeDefNegativeGate, true,
        StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC,
        StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.REFRESH),
    yuMove(new SelfStatusMove(Moves.YU_TOON_SHIELD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, foeDefNegativeGate, 100), Moves.FLOWER_SHIELD),
    yuMove(new SelfStatusMove(Moves.YU_GEAR_SCREEN, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, foeDefNegativeGate, 100, false, true), Moves.GEAR_UP),
    yuMove(new SelfStatusMove(Moves.YU_GEAR_FORTIFY, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, foeDefNegativeGate, 100), Moves.AUTOTOMIZE),
    yuMove(new AttackMove(Moves.YU_POUND_CLEAVE, Type.FAIRY, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.COVET),
    yuMove(new AttackMove(Moves.YU_GOLEM_CATACLYSM, Type.STEEL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, foeDefNegativeGate)
      .attr(GatedHitHealAttr, 0.5, foeDefNegativeGate), Moves.SPIN_OUT),
  );
}
export function registerYuDuelmonEntry248(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_HOLSTER_SHOT, Type.FIRE, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, reflectActiveGate, 100), Moves.FLARE_BLITZ),
    yuMove(new AttackMove(Moves.YU_BARREL_SHOT, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, reflectActiveGate, 100), Moves.POWER_TRIP),
    yuMove(new AttackMove(Moves.YU_RAPID_FIRE, Type.FIRE, MoveCategory.PHYSICAL, 60, 100, 10, -1, 2, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, reflectActiveGate, 100), Moves.SACRED_FIRE),
    yuMove(new AttackMove(Moves.YU_FIRE_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, reflectActiveGate), Moves.FLAMETHROWER),
    yuMove(new AttackMove(Moves.YU_HOLSTER_STEEL, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, reflectActiveGate), Moves.BULLET_PUNCH),
    yuMove(new SelfStatusMove(Moves.YU_BUILD_BARRICADE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, reflectActiveGate, 100), Moves.FLASH),
    yuMove(new AttackMove(Moves.YU_BARREL_EXECUTION, Type.FIRE, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, reflectActiveGate), Moves.PYRO_BALL),
    yuMove(new AttackMove(Moves.YU_VOLLEY_FIRE, Type.FIRE, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, reflectActiveGate), Moves.FIRE_LASH),
    yuMove(new AttackMove(Moves.YU_TRAP_SHOT, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, -1, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.PUNISHMENT),
    yuMove(new SelfStatusMove(Moves.YU_FORTIFY_POSITION, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, reflectActiveGate, 100), Moves.IRON_DEFENSE),
    yuMove(new AttackMove(Moves.YU_INFERNO_ROUND, Type.FIRE, MoveCategory.SPECIAL, 90, 90, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, reflectActiveGate, 50), Moves.OVERHEAT),
    yuMove(new SelfStatusMove(Moves.YU_SHIELD_WALL, Type.STEEL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, reflectActiveGate, 100), Moves.KINGS_SHIELD),
    yuMove(new AttackMove(Moves.YU_FIGHTING_SHOT, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, reflectActiveGate, 100), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_SHOT, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, reflectActiveGate, 50), Moves.ELECTRO_SHOT),
    yuMove(new SelfStatusMove(Moves.YU_BARRICADE_RESTORE, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(ConditionalHealAttr, 0.25, reflectActiveGate), Moves.REFLECT),
    yuMove(new SelfStatusMove(Moves.YU_GUN_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, reflectActiveGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.FOLLOW_ME),
    yuMove(new SelfStatusMove(Moves.YU_GUNSLINGER_MANDATE, Type.DARK, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, reflectActiveGate, 100), Moves.BELLY_DRUM),
    yuMove(new SelfStatusMove(Moves.YU_COVER_FIRE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(GatedAddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK, reflectActiveGate), Moves.BURNING_BULWARK),
    yuMove(new AttackMove(Moves.YU_BARREL_CLEAVE, Type.FIRE, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.RAGING_FURY),
    yuMove(new AttackMove(Moves.YU_BARREL_CATACLYSM, Type.FIRE, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, reflectActiveGate)
      .attr(GatedHitHealAttr, 0.5, reflectActiveGate), Moves.SIZZLY_SLIDE),
  );
}
export function registerYuDuelmonEntry249(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_CHAOS_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, foeAtkNegativeGate, 100), Moves.SUBMISSION),
    yuMove(new AttackMove(Moves.YU_DARK_SUPPRESSION, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foeAtkNegativeGate, 100), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_QUICK_CHAOS, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, -1, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeAtkNegativeGate, 100), Moves.UPPER_HAND),
    yuMove(new AttackMove(Moves.YU_CHAOS_DRAIN, Type.FIGHTING, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeAtkNegativeGate), Moves.FORCE_PALM),
    yuMove(new AttackMove(Moves.YU_LUSTER_STRIKE, Type.FIGHTING, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foeAtkNegativeGate, 100), Moves.THUNDEROUS_KICK),
    yuMove(new SelfStatusMove(Moves.YU_CHAOS_MANDATE, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeAtkNegativeGate, 100), Moves.MAT_BLOCK),
    yuMove(new AttackMove(Moves.YU_DARK_CRUSH, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foeAtkNegativeGate, 100), Moves.THROAT_CHOP),
    yuMove(new AttackMove(Moves.YU_RIOT_SPRAY, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, foeAtkNegativeGate), Moves.TRIPLE_ARROWS),
    yuMove(new AttackMove(Moves.YU_CHAOS_TRAP, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP), Moves.FOUL_PLAY),
    yuMove(new SelfStatusMove(Moves.YU_LUSTER_GUARD, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, foeAtkNegativeGate, 100), Moves.QUICK_GUARD),
    yuMove(new AttackMove(Moves.YU_GROUND_CHAOS, Type.GROUND, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foeAtkNegativeGate, 100), Moves.BIDE),
    yuMove(new AttackMove(Moves.YU_CHAOS_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(GatedHitHealAttr, 0.5, foeAtkNegativeGate), Moves.CLOSE_COMBAT),
    yuMove(new AttackMove(Moves.YU_ROCK_CHAOS, Type.ROCK, MoveCategory.PHYSICAL, 80, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, foeAtkNegativeGate, 100), Moves.ROCK_SLIDE),
    yuMove(new AttackMove(Moves.YU_STEEL_SLASH, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, -2, false, foeAtkNegativeGate, 100), Moves.STEEL_ROLLER),
    yuMove(new SelfStatusMove(Moves.YU_CHAOS_RECOVERY, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, foeAtkNegativeGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.HEAL_BELL),
    yuMove(new SelfStatusMove(Moves.YU_LUSTER_SHIELD, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, foeAtkNegativeGate, 100), Moves.NO_RETREAT),
    yuMove(new AttackMove(Moves.YU_CHAOS_STORM, Type.DARK, MoveCategory.PHYSICAL, 90, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, foeAtkNegativeGate, 100), Moves.WICKED_BLOW),
    yuMove(new SelfStatusMove(Moves.YU_LUSTER_SCREEN, Type.FIGHTING, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.REFLECT, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, foeAtkNegativeGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new AttackMove(Moves.YU_CHAOS_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false), Moves.AXE_KICK),
    yuMove(new AttackMove(Moves.YU_LUSTER_CATACLYSM, Type.NORMAL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, foeAtkNegativeGate)
      .attr(GatedHitHealAttr, 0.5, foeAtkNegativeGate), Moves.FOCUS_PUNCH),
  );
}
export function registerYuDuelmonEntry250(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ILLUSION_STRIKE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, hasSubstituteGate, 100), Moves.CONFUSION),
    yuMove(new AttackMove(Moves.YU_MIRAGE_DEFLATE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, hasSubstituteGate, 100), Moves.NIGHT_DAZE),
    yuMove(new AttackMove(Moves.YU_QUICK_CAST, Type.PSYCHIC, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, hasSubstituteGate, 50), Moves.PRISMATIC_LASER),
    yuMove(new AttackMove(Moves.YU_ILLUSION_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.PSYSHOCK),
    yuMove(new AttackMove(Moves.YU_ILLUSION_BEAM, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, hasSubstituteGate, 100), Moves.PSYBEAM),
    yuMove(new SelfStatusMove(Moves.YU_ILLUSION_WEAVE, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, hasSubstituteGate, 100), Moves.AFTER_YOU),
    yuMove(new AttackMove(Moves.YU_ILLUSION_EXECUTION, Type.PSYCHIC, MoveCategory.SPECIAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, hasSubstituteGate), Moves.EERIE_SPELL),
    yuMove(new AttackMove(Moves.YU_MIRAGE_BARRAGE, Type.PSYCHIC, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, hasSubstituteGate), Moves.TWIN_BEAM),
    yuMove(new AttackMove(Moves.YU_DARK_BIND, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(AddMovePowerAttr, 40, hasSubstituteGate), Moves.JAW_LOCK),
    yuMove(new SelfStatusMove(Moves.YU_DECOY_MIRROR, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, hasSubstituteGate, 100), Moves.ACUPRESSURE),
    yuMove(new AttackMove(Moves.YU_GHOST_MAGIC, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, hasSubstituteGate, 100), Moves.ASTRAL_BARRAGE),
    yuMove(new SelfStatusMove(Moves.YU_MAGICIANS_MANDATE, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, hasSubstituteGate, 100), Moves.BATON_PASS),
    yuMove(new AttackMove(Moves.YU_FIGHTING_CAST, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, hasSubstituteGate, 100), Moves.VITAL_THROW),
    yuMove(new AttackMove(Moves.YU_ICE_MAGIC, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, hasSubstituteGate, 35), Moves.ICE_BEAM),
    yuMove(new SelfStatusMove(Moves.YU_DARK_ILLUSION, Type.DARK, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, hasSubstituteGate, 100), Moves.ATTRACT),
    yuMove(new SelfStatusMove(Moves.YU_MAGICIANS_RECOVERY, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, hasSubstituteGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.ALLY_SWITCH),
    yuMove(new SelfStatusMove(Moves.YU_TOON_BARRIER, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(GatedAddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, hasSubstituteGate, 100, false, true), Moves.FLORAL_HEALING),
    yuMove(new SelfStatusMove(Moves.YU_PHANTASM, Type.GHOST, -1, 10, -1, 0, 9)
      .attr(GatedSubstituteAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, 1, true, hasSubstituteGate, 100), Moves.ASSIST),
    yuMove(new AttackMove(Moves.YU_ILLUSION_CLEAVE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(AddMovePowerAttr, 40, hasSubstituteGate), Moves.PSYCHIC_NOISE),
    yuMove(new AttackMove(Moves.YU_PHANTASM_PIVOT, Type.PSYCHIC, MoveCategory.SPECIAL, 100, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true), Moves.PSYCHO_BOOST),
  );
}
export function registerYuDuelmonEntry251(allMoves: Move[]): void {
  allMoves.push(
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_BURST, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, lightScreenActiveGate, 100), Moves.ALLURING_VOICE),
    yuToonMove(new AttackMove(Moves.YU_SCREEN_DEFLATE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, lightScreenActiveGate, 100), Moves.ECHOED_VOICE),
    yuToonMove(new AttackMove(Moves.YU_QUICK_SPELL, Type.NORMAL, MoveCategory.SPECIAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, lightScreenActiveGate, 50), Moves.DISARMING_VOICE),
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_DRAIN, Type.FAIRY, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, lightScreenActiveGate), Moves.FLEUR_CANNON),
    yuToonMove(new AttackMove(Moves.YU_VEIL_BREAK, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, lightScreenActiveGate, 100), Moves.PSYSTRIKE),
    yuToonMove(new SelfStatusMove(Moves.YU_MAGICAL_SHIELD, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, lightScreenActiveGate, 100), Moves.CRAFTY_SHIELD),
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_EXECUTION, Type.NORMAL, MoveCategory.SPECIAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, lightScreenActiveGate), Moves.LIGHT_OF_RUIN),
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_BARRAGE, Type.FAIRY, MoveCategory.SPECIAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, lightScreenActiveGate), Moves.MISTY_EXPLOSION),
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_BIND, Type.PSYCHIC, MoveCategory.SPECIAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(AddMovePowerAttr, 40, lightScreenActiveGate), Moves.WHIRLPOOL),
    yuToonMove(new SelfStatusMove(Moves.YU_TEAM_SHIELD, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, lightScreenActiveGate, 100), Moves.REFLECT),
    yuToonMove(new AttackMove(Moves.YU_TOON_SQUALL, Type.FAIRY, MoveCategory.SPECIAL, 90, 90, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, lightScreenActiveGate, 100), Moves.NATURES_MADNESS),
    yuToonMove(new SelfStatusMove(Moves.YU_SYNERGY_BARRIER, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedSubstituteAttr, 0.25, lightScreenActiveGate), Moves.SAFEGUARD),
    yuToonMove(new AttackMove(Moves.YU_FIRE_MAGIC, Type.FIRE, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, lightScreenActiveGate, 50), Moves.FIRE_PLEDGE),
    yuToonMove(new AttackMove(Moves.YU_ICE_SPELL, Type.ICE, MoveCategory.SPECIAL, 80, 100, 10, 10, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.FREEZE)
      .attr(ConditionalStatusEffectAttr, StatusEffect.FREEZE, lightScreenActiveGate, 35), Moves.ICE_BEAM),
    yuToonMove(new SelfStatusMove(Moves.YU_TOON_MAGIC, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, lightScreenActiveGate, 100), Moves.AURORA_VEIL),
    yuToonMove(new SelfStatusMove(Moves.YU_SYNERGY_RECOVERY, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, lightScreenActiveGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.AFTER_YOU),
    yuToonMove(new SelfStatusMove(Moves.YU_GIRLS_MANDATE, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, lightScreenActiveGate, 100), Moves.BELLY_DRUM),
    yuToonMove(new SelfStatusMove(Moves.YU_PROTECTIVE_SPELL, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, lightScreenActiveGate, 100, false, true), Moves.MISTY_TERRAIN),
    yuToonMove(new AttackMove(Moves.YU_SYNERGY_CLEAVE, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(AddMovePowerAttr, 40, lightScreenActiveGate), Moves.SPARKLY_SWIRL),
    yuToonMove(new AttackMove(Moves.YU_GRAND_SYNERGY, Type.NORMAL, MoveCategory.SPECIAL, 100, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true), Moves.U_TURN),
  );
}
export function registerYuDuelmonEntry252(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_FORTUNE_SLASH, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, above75HpGate, 100), Moves.PSYCHO_CUT),
    yuMove(new AttackMove(Moves.YU_DARK_FORTUNE, Type.DARK, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, above75HpGate, 100), Moves.SNARL),
    yuMove(new AttackMove(Moves.YU_DRAW_SHOT, Type.NORMAL, MoveCategory.PHYSICAL, 60, 100, 10, 30, 1, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -1, false, above75HpGate, 50), Moves.ZEN_HEADBUTT),
    yuMove(new AttackMove(Moves.YU_FORTUNE_DRAIN, Type.PSYCHIC, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, above75HpGate), Moves.PSYWAVE),
    yuMove(new AttackMove(Moves.YU_PSYCHIC_FORTUNE, Type.PSYCHIC, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, -2, false, above75HpGate, 100), Moves.FUTURE_SIGHT),
    yuMove(new SelfStatusMove(Moves.YU_LUCKY_HEAL, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(ConditionalStatChangeAttr, BattleStat.SPATK, 1, true, above75HpGate, 100), Moves.LUCKY_CHANT),
    yuMove(new AttackMove(Moves.YU_FORTUNE_EXECUTION, Type.NORMAL, MoveCategory.PHYSICAL, 110, 85, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.25)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, above75HpGate), Moves.HEART_STAMP),
    yuMove(new AttackMove(Moves.YU_FORTUNE_BARRAGE, Type.NORMAL, MoveCategory.PHYSICAL, 25, 100, 10, 10, 0, 9)
      .attr(MultiHitAttr, MultiHitType._2_TO_5)
      .checkAllHits()
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, above75HpGate), Moves.PSYBLADE),
    yuMove(new AttackMove(Moves.YU_LASSO_BIND, Type.DARK, MoveCategory.PHYSICAL, 70, 100, 10, 30, 0, 9)
      .attr(TrapAttr, BattlerTagType.WRAP)
      .attr(AddMovePowerAttr, 40, above75HpGate), Moves.WICKED_TORQUE),
    yuMove(new SelfStatusMove(Moves.YU_FORTUNES_BLESSING, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, above75HpGate, 100), Moves.REVIVAL_BLESSING),
    yuMove(new AttackMove(Moves.YU_GHOST_FORTUNE, Type.GHOST, MoveCategory.SPECIAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPDEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPDEF, -2, false, above75HpGate, 100), Moves.BITTER_MALICE),
    yuMove(new SelfStatusMove(Moves.YU_FORTUNE_MANDATE, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, above75HpGate, 100), Moves.GUARD_SPLIT),
    yuMove(new AttackMove(Moves.YU_FIGHTING_FORTUNE, Type.FIGHTING, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, above75HpGate, 100), Moves.WAKE_UP_SLAP),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_FORTUNE, Type.ELECTRIC, MoveCategory.SPECIAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, above75HpGate, 50), Moves.ECHOED_VOICE),
    yuMove(new SelfStatusMove(Moves.YU_FORTUNE_SHIELD, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.25)
      .attr(GatedSubstituteAttr, 0.25, above75HpGate), Moves.GLARE),
    yuMove(new SelfStatusMove(Moves.YU_SORCERERS_REST, Type.NORMAL, -1, 10, -1, 0, 9)
      .attr(HealAttr, 0.5)
      .attr(GatedHealStatusEffectAttr, above75HpGate, true, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.SLEEP), Moves.REFRESH),
    yuMove(new SelfStatusMove(Moves.YU_FORTUNE_SCREEN, Type.PSYCHIC, -1, 10, -1, 0, 9)
      .attr(AddArenaTagAttr, ArenaTagType.LIGHT_SCREEN, 5, false, true)
      .attr(GatedAddArenaTagAttr, ArenaTagType.REFLECT, 5, above75HpGate, 100, false, true), Moves.LIGHT_SCREEN),
    yuMove(new SelfStatusMove(Moves.YU_DRAW_BULWARK, Type.FAIRY, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 1, true, above75HpGate, 100), Moves.GEOMANCY),
    yuMove(new AttackMove(Moves.YU_FORTUNE_CLEAVE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, -1, 0, 9)
      .attr(RemoveArenaTagAttr, ArenaTagType.REFLECT, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.LIGHT_SCREEN, false)
      .attr(RemoveArenaTagAttr, ArenaTagType.AURORA_VEIL, false)
      .attr(AddMovePowerAttr, 40, above75HpGate), Moves.PSYCHIC_FANGS),
    yuMove(new AttackMove(Moves.YU_GRAND_FORTUNE, Type.NORMAL, MoveCategory.PHYSICAL, 100, 90, 10, -1, 0, 9)
      .attr(ForceSwitchOutAttr, false, true), Moves.PSYSHIELD_BASH),
  );
}
export function registerYuDuelmonEntry253(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TIDAL_SLAP, Type.WATER, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, foeSpdNegativeGate, 50), Moves.ATTRACT),
    yuMove(new AttackMove(Moves.YU_CARTOON_SPLASH, Type.WATER, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeSpdNegativeGate), Moves.RAZOR_WIND),
    yuMove(new SelfStatusMove(Moves.YU_NARRATIVE_SHIELD, Type.WATER, -1, 10, -1, 4, 9)
      .attr(ProtectAttr)
      .attr(GrantPendingMovePowerBonusAttr, 40, foeSpdNegativeGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_FINAL_SCRIPT, Type.WATER, MoveCategory.SPECIAL, 100, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, foeSpdNegativeGate, 50), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry254(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_THUNDER_CLAW, Type.ELECTRIC, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, paralyzedGate, 50), Moves.THUNDER_PUNCH),
    yuMove(new AttackMove(Moves.YU_SHADOW_CLAW, Type.DARK, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StealHeldItemChanceAttr, 0.3)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, paralyzedGate), Moves.ASSURANCE),
    yuMove(new AttackMove(Moves.YU_ARCHFIENDS_DRAIN, Type.DARK, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, paralyzedGate), Moves.GIGA_DRAIN),
    yuMove(new AttackMove(Moves.YU_DARK_LIGHTNING, Type.DARK, MoveCategory.SPECIAL, 85, 100, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, paralyzedGate, 50), Moves.DARK_PULSE),
  );
}
export function registerYuDuelmonEntry255(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_PREHISTORIC_BITE, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, foeDefNegativeGate, 50), Moves.HYPER_DRILL),
    yuMove(new AttackMove(Moves.YU_JAW_DRAIN, Type.NORMAL, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, foeDefNegativeGate), Moves.HYPER_FANG),
    yuMove(new AttackMove(Moves.YU_REX_CATACLYSM, Type.GROUND, MoveCategory.PHYSICAL, 100, 100, 10, -1, 0, 9)
      .attr(ConditionalForceSwitchOutAttr, false, true, foeDefNegativeGate)
      .attr(GatedHitHealAttr, 0.5, foeDefNegativeGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry256(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_TITAN_PUNCH, Type.STEEL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(BypassAbilityAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, userAtkPositiveGate, 100), Moves.METEOR_MASH),
    yuMove(new AttackMove(Moves.YU_ABILITY_CRUSH, Type.STEEL, MoveCategory.PHYSICAL, 80, 100, 10, -1, 0, 9)
      .attr(BypassAbilityAttr)
      .attr(SuppressAbilitiesAttr)
      .attr(AddMovePowerAttr, 40, userAtkPositiveGate), Moves.STEEL_WING),
    yuMove(new AttackMove(Moves.YU_TITANS_ANNIHILATION, Type.STEEL, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(BypassAbilityAttr)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userAtkPositiveGate, 50), Moves.HARD_PRESS),
  );
}
export function registerYuDuelmonEntry257(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_MAGNETIC_STRIKE, Type.NORMAL, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(StatChangeAttr, BattleStat.SPD, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, -2, false, userPositiveStageGate, 100), Moves.BOLT_STRIKE),
    yuMove(new AttackMove(Moves.YU_ELECTRIC_LANCE, Type.ELECTRIC, MoveCategory.PHYSICAL, 85, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.PARALYSIS)
      .attr(ConditionalStatusEffectAttr, StatusEffect.PARALYSIS, userPositiveStageGate, 50), Moves.NUZZLE),
    yuMove(new AttackMove(Moves.YU_VALKYRIONS_JUDGMENT, Type.NORMAL, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, userPositiveStageGate, 50), Moves.THUNDER_FANG),
  );
}
export function registerYuDuelmonEntry258(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_DOOMFIRE_BLAST, Type.NORMAL, MoveCategory.SPECIAL, 85, 100, 10, -1, 0, 9)
      .attr(DelayedAttackAttr, ArenaTagType.DOOM_DESIRE, ChargeAnim.DOOM_DESIRE_CHARGING, i18next.t("moveTriggers:choseDoomDesireAsDestiny", { pokemonName: "{USER}" }))
      .attr(GatedAlwaysHitAttr, foeBelow50HpGate), Moves.TECHNO_BLAST),
    yuMove(new AttackMove(Moves.YU_INFERNO_WAVE, Type.FIRE, MoveCategory.SPECIAL, 90, 95, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(ConditionalStatusEffectAttr, StatusEffect.BURN, burnedGate, 50), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_APOCALYPTIC_DRAIN, Type.FIRE, MoveCategory.SPECIAL, 75, 100, 10, -1, 0, 9)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_DOOMFIRE, Type.FIRE, MoveCategory.SPECIAL, 110, 80, 10, 30, 0, 9)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(AddMovePowerAttr, 40, burnedGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry259(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_ROCKET_FLARE, Type.FIRE, MoveCategory.PHYSICAL, 80, 100, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false, null, 30)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -2, false, burnedGate, 100), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_ROCKET_DRAIN, Type.FIRE, MoveCategory.PHYSICAL, 75, 100, 10, -1, 0, 9)
      .attr(HighCritAttr)
      .attr(HitHealAttr, 0.33)
      .attr(ConditionalHitHealAttr, 0.33, 0.5, burnedGate), Moves.RAZOR_WIND),
    yuMove(new AttackMove(Moves.YU_VOLCANIC_ROCKET, Type.FIRE, MoveCategory.PHYSICAL, 100, 85, 10, 30, 0, 9)
      .attr(HighCritAttr)
      .attr(StatusEffectAttr, StatusEffect.BURN)
      .attr(AddMovePowerAttr, 40, burnedGate), Moves.RAZOR_WIND),
  );
}
export function registerYuDuelmonEntry260(allMoves: Move[]): void {
  allMoves.push(
    yuMove(new AttackMove(Moves.YU_VOLCANIC_HAMMER, Type.NORMAL, MoveCategory.PHYSICAL, 85, 100, 10, 30, 0, 9)
      .attr(RemoveHeldItemAttr, false)
      .attr(StatChangeAttr, BattleStat.DEF, -1, false)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, -1, false, userAtkPositiveGate, 50), Moves.HAMMER_ARM),
    yuMove(new AttackMove(Moves.YU_MAGMA_SLAM, Type.FIRE, MoveCategory.PHYSICAL, 90, 95, 10, 10, 0, 9)
      .attr(FlinchAttr)
      .attr(ConditionalFlinchAttr, 35, userAtkPositiveGate), Moves.FLARE_BLITZ),
    yuMove(new SelfStatusMove(Moves.YU_CORE_CHARGE, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.ATK, 2, true)
      .attr(ConditionalStatChangeAttr, BattleStat.SPD, 1, true, userAtkPositiveGate, 100), Moves.WILL_O_WISP),
    yuMove(new SelfStatusMove(Moves.YU_CORE_BULWARK, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(StatChangeAttr, BattleStat.DEF, 1, true)
      .attr(StatChangeAttr, BattleStat.SPDEF, 1, true)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(GatedAddBattlerTagAttr, BattlerTagType.INGRAIN, 100, userAtkPositiveGate), Moves.INGRAIN),
    yuMove(new SelfStatusMove(Moves.YU_HAZARD_HAMMER, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(AddArenaTrapTagAttr, ArenaTagType.STEALTH_ROCK)
      .attr(ClearHazardsAttr)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.DEF, 1, true, userAtkPositiveGate, 100), Moves.SUNNY_DAY),
    yuMove(new SelfStatusMove(Moves.YU_VOLCANIC_FORTIFY, Type.FIRE, -1, 10, -1, 0, 9)
      .attr(SelfHpCostAttr, 0.125)
      .attr(StatChangeAttr, BattleStat.ATK, 1, true)
      .attr(ConditionalStatChangeAttr, BattleStat.ATK, 2, true, userAtkPositiveGate, 100), Moves.SWORDS_DANCE),
  );
}
export function registerYuDuelmonCookbookMoves(allMoves: Move[]): void {
  const prePushLen = allMoves.length;
  registerYuDuelmonEntry1(allMoves);
  registerYuDuelmonEntry2(allMoves);
  registerYuDuelmonEntry3(allMoves);
  registerYuDuelmonEntry4(allMoves);
  registerYuDuelmonEntry5(allMoves);
  registerYuDuelmonEntry6(allMoves);
  registerYuDuelmonEntry7(allMoves);
  registerYuDuelmonEntry8(allMoves);
  registerYuDuelmonEntry9(allMoves);
  registerYuDuelmonEntry10(allMoves);
  registerYuDuelmonEntry11(allMoves);
  registerYuDuelmonEntry12(allMoves);
  registerYuDuelmonEntry13(allMoves);
  registerYuDuelmonEntry14(allMoves);
  registerYuDuelmonEntry15(allMoves);
  registerYuDuelmonEntry16(allMoves);
  registerYuDuelmonEntry17(allMoves);
  registerYuDuelmonEntry18(allMoves);
  registerYuDuelmonEntry19(allMoves);
  registerYuDuelmonEntry20(allMoves);
  registerYuDuelmonEntry21(allMoves);
  registerYuDuelmonEntry22(allMoves);
  registerYuDuelmonEntry23(allMoves);
  registerYuDuelmonEntry24(allMoves);
  registerYuDuelmonEntry25(allMoves);
  registerYuDuelmonEntry26(allMoves);
  registerYuDuelmonEntry27(allMoves);
  registerYuDuelmonEntry28(allMoves);
  registerYuDuelmonEntry29(allMoves);
  registerYuDuelmonEntry30(allMoves);
  registerYuDuelmonEntry31(allMoves);
  registerYuDuelmonEntry32(allMoves);
  registerYuDuelmonEntry33(allMoves);
  registerYuDuelmonEntry34(allMoves);
  registerYuDuelmonEntry35(allMoves);
  registerYuDuelmonEntry36(allMoves);
  registerYuDuelmonEntry37(allMoves);
  registerYuDuelmonEntry38(allMoves);
  registerYuDuelmonEntry39(allMoves);
  registerYuDuelmonEntry40(allMoves);
  registerYuDuelmonEntry41(allMoves);
  registerYuDuelmonEntry42(allMoves);
  registerYuDuelmonEntry43(allMoves);
  registerYuDuelmonEntry44(allMoves);
  registerYuDuelmonEntry45(allMoves);
  registerYuDuelmonEntry46(allMoves);
  registerYuDuelmonEntry47(allMoves);
  registerYuDuelmonEntry48(allMoves);
  registerYuDuelmonEntry49(allMoves);
  registerYuDuelmonEntry50(allMoves);
  registerYuDuelmonEntry51(allMoves);
  registerYuDuelmonEntry52(allMoves);
  registerYuDuelmonEntry53(allMoves);
  registerYuDuelmonEntry54(allMoves);
  registerYuDuelmonEntry55(allMoves);
  registerYuDuelmonEntry56(allMoves);
  registerYuDuelmonEntry57(allMoves);
  registerYuDuelmonEntry58(allMoves);
  registerYuDuelmonEntry59(allMoves);
  registerYuDuelmonEntry60(allMoves);
  registerYuDuelmonEntry61(allMoves);
  registerYuDuelmonEntry62(allMoves);
  registerYuDuelmonEntry63(allMoves);
  registerYuDuelmonEntry64(allMoves);
  registerYuDuelmonEntry65(allMoves);
  registerYuDuelmonEntry66(allMoves);
  registerYuDuelmonEntry67(allMoves);
  registerYuDuelmonEntry68(allMoves);
  registerYuDuelmonEntry69(allMoves);
  registerYuDuelmonEntry70(allMoves);
  registerYuDuelmonEntry71(allMoves);
  registerYuDuelmonEntry72(allMoves);
  registerYuDuelmonEntry73(allMoves);
  registerYuDuelmonEntry74(allMoves);
  registerYuDuelmonEntry75(allMoves);
  registerYuDuelmonEntry76(allMoves);
  registerYuDuelmonEntry77(allMoves);
  registerYuDuelmonEntry78(allMoves);
  registerYuDuelmonEntry79(allMoves);
  registerYuDuelmonEntry80(allMoves);
  registerYuDuelmonEntry81(allMoves);
  registerYuDuelmonEntry82(allMoves);
  registerYuDuelmonEntry83(allMoves);
  registerYuDuelmonEntry84(allMoves);
  registerYuDuelmonEntry85(allMoves);
  registerYuDuelmonEntry86(allMoves);
  registerYuDuelmonEntry87(allMoves);
  registerYuDuelmonEntry88(allMoves);
  registerYuDuelmonEntry89(allMoves);
  registerYuDuelmonEntry90(allMoves);
  registerYuDuelmonEntry91(allMoves);
  registerYuDuelmonEntry92(allMoves);
  registerYuDuelmonEntry93(allMoves);
  registerYuDuelmonEntry94(allMoves);
  registerYuDuelmonEntry95(allMoves);
  registerYuDuelmonEntry96(allMoves);
  registerYuDuelmonEntry97(allMoves);
  registerYuDuelmonEntry98(allMoves);
  registerYuDuelmonEntry99(allMoves);
  registerYuDuelmonEntry100(allMoves);
  registerYuDuelmonEntry101(allMoves);
  registerYuDuelmonEntry102(allMoves);
  registerYuDuelmonEntry103(allMoves);
  registerYuDuelmonEntry104(allMoves);
  registerYuDuelmonEntry105(allMoves);
  registerYuDuelmonEntry106(allMoves);
  registerYuDuelmonEntry107(allMoves);
  registerYuDuelmonEntry108(allMoves);
  registerYuDuelmonEntry109(allMoves);
  registerYuDuelmonEntry110(allMoves);
  registerYuDuelmonEntry111(allMoves);
  registerYuDuelmonEntry112(allMoves);
  registerYuDuelmonEntry113(allMoves);
  registerYuDuelmonEntry114(allMoves);
  registerYuDuelmonEntry115(allMoves);
  registerYuDuelmonEntry116(allMoves);
  registerYuDuelmonEntry117(allMoves);
  registerYuDuelmonEntry118(allMoves);
  registerYuDuelmonEntry119(allMoves);
  registerYuDuelmonEntry120(allMoves);
  registerYuDuelmonEntry121(allMoves);
  registerYuDuelmonEntry122(allMoves);
  registerYuDuelmonEntry123(allMoves);
  registerYuDuelmonEntry124(allMoves);
  registerYuDuelmonEntry125(allMoves);
  registerYuDuelmonEntry126(allMoves);
  registerYuDuelmonEntry127(allMoves);
  registerYuDuelmonEntry128(allMoves);
  registerYuDuelmonEntry129(allMoves);
  registerYuDuelmonEntry130(allMoves);
  registerYuDuelmonEntry131(allMoves);
  registerYuDuelmonEntry132(allMoves);
  registerYuDuelmonEntry133(allMoves);
  registerYuDuelmonEntry134(allMoves);
  registerYuDuelmonEntry135(allMoves);
  registerYuDuelmonEntry136(allMoves);
  registerYuDuelmonEntry137(allMoves);
  registerYuDuelmonEntry138(allMoves);
  registerYuDuelmonEntry139(allMoves);
  registerYuDuelmonEntry140(allMoves);
  registerYuDuelmonEntry141(allMoves);
  registerYuDuelmonEntry142(allMoves);
  registerYuDuelmonEntry143(allMoves);
  registerYuDuelmonEntry144(allMoves);
  registerYuDuelmonEntry145(allMoves);
  registerYuDuelmonEntry146(allMoves);
  registerYuDuelmonEntry147(allMoves);
  registerYuDuelmonEntry148(allMoves);
  registerYuDuelmonEntry149(allMoves);
  registerYuDuelmonEntry150(allMoves);
  registerYuDuelmonEntry151(allMoves);
  registerYuDuelmonEntry152(allMoves);
  registerYuDuelmonEntry153(allMoves);
  registerYuDuelmonEntry154(allMoves);
  registerYuDuelmonEntry155(allMoves);
  registerYuDuelmonEntry156(allMoves);
  registerYuDuelmonEntry157(allMoves);
  registerYuDuelmonEntry158(allMoves);
  registerYuDuelmonEntry159(allMoves);
  registerYuDuelmonEntry160(allMoves);
  registerYuDuelmonEntry161(allMoves);
  registerYuDuelmonEntry162(allMoves);
  registerYuDuelmonEntry163(allMoves);
  registerYuDuelmonEntry164(allMoves);
  registerYuDuelmonEntry165(allMoves);
  registerYuDuelmonEntry166(allMoves);
  registerYuDuelmonEntry167(allMoves);
  registerYuDuelmonEntry168(allMoves);
  registerYuDuelmonEntry169(allMoves);
  registerYuDuelmonEntry170(allMoves);
  registerYuDuelmonEntry171(allMoves);
  registerYuDuelmonEntry172(allMoves);
  registerYuDuelmonEntry173(allMoves);
  registerYuDuelmonEntry174(allMoves);
  registerYuDuelmonEntry175(allMoves);
  registerYuDuelmonEntry176(allMoves);
  registerYuDuelmonEntry177(allMoves);
  registerYuDuelmonEntry178(allMoves);
  registerYuDuelmonEntry179(allMoves);
  registerYuDuelmonEntry180(allMoves);
  registerYuDuelmonEntry181(allMoves);
  registerYuDuelmonEntry182(allMoves);
  registerYuDuelmonEntry183(allMoves);
  registerYuDuelmonEntry184(allMoves);
  registerYuDuelmonEntry185(allMoves);
  registerYuDuelmonEntry186(allMoves);
  registerYuDuelmonEntry187(allMoves);
  registerYuDuelmonEntry188(allMoves);
  registerYuDuelmonEntry189(allMoves);
  registerYuDuelmonEntry190(allMoves);
  registerYuDuelmonEntry191(allMoves);
  registerYuDuelmonEntry192(allMoves);
  registerYuDuelmonEntry193(allMoves);
  registerYuDuelmonEntry194(allMoves);
  registerYuDuelmonEntry195(allMoves);
  registerYuDuelmonEntry196(allMoves);
  registerYuDuelmonEntry197(allMoves);
  registerYuDuelmonEntry198(allMoves);
  registerYuDuelmonEntry199(allMoves);
  registerYuDuelmonEntry200(allMoves);
  registerYuDuelmonEntry201(allMoves);
  registerYuDuelmonEntry202(allMoves);
  registerYuDuelmonEntry203(allMoves);
  registerYuDuelmonEntry204(allMoves);
  registerYuDuelmonEntry205(allMoves);
  registerYuDuelmonEntry206(allMoves);
  registerYuDuelmonEntry207(allMoves);
  registerYuDuelmonEntry208(allMoves);
  registerYuDuelmonEntry209(allMoves);
  registerYuDuelmonEntry210(allMoves);
  registerYuDuelmonEntry211(allMoves);
  registerYuDuelmonEntry212(allMoves);
  registerYuDuelmonEntry213(allMoves);
  registerYuDuelmonEntry214(allMoves);
  registerYuDuelmonEntry215(allMoves);
  registerYuDuelmonEntry216(allMoves);
  registerYuDuelmonEntry217(allMoves);
  registerYuDuelmonEntry218(allMoves);
  registerYuDuelmonEntry219(allMoves);
  registerYuDuelmonEntry220(allMoves);
  registerYuDuelmonEntry221(allMoves);
  registerYuDuelmonEntry222(allMoves);
  registerYuDuelmonEntry223(allMoves);
  registerYuDuelmonEntry224(allMoves);
  registerYuDuelmonEntry225(allMoves);
  registerYuDuelmonEntry226(allMoves);
  registerYuDuelmonEntry227(allMoves);
  registerYuDuelmonEntry228(allMoves);
  registerYuDuelmonEntry229(allMoves);
  registerYuDuelmonEntry230(allMoves);
  registerYuDuelmonEntry231(allMoves);
  registerYuDuelmonEntry232(allMoves);
  registerYuDuelmonEntry233(allMoves);
  registerYuDuelmonEntry234(allMoves);
  registerYuDuelmonEntry235(allMoves);
  registerYuDuelmonEntry236(allMoves);
  registerYuDuelmonEntry237(allMoves);
  registerYuDuelmonEntry238(allMoves);
  registerYuDuelmonEntry239(allMoves);
  registerYuDuelmonEntry240(allMoves);
  registerYuDuelmonEntry241(allMoves);
  registerYuDuelmonEntry242(allMoves);
  registerYuDuelmonEntry243(allMoves);
  registerYuDuelmonEntry244(allMoves);
  registerYuDuelmonEntry245(allMoves);
  registerYuDuelmonEntry246(allMoves);
  registerYuDuelmonEntry247(allMoves);
  registerYuDuelmonEntry248(allMoves);
  registerYuDuelmonEntry249(allMoves);
  registerYuDuelmonEntry250(allMoves);
  registerYuDuelmonEntry251(allMoves);
  registerYuDuelmonEntry252(allMoves);
  registerYuDuelmonEntry253(allMoves);
  registerYuDuelmonEntry254(allMoves);
  registerYuDuelmonEntry255(allMoves);
  registerYuDuelmonEntry256(allMoves);
  registerYuDuelmonEntry257(allMoves);
  registerYuDuelmonEntry258(allMoves);
  registerYuDuelmonEntry259(allMoves);
  registerYuDuelmonEntry260(allMoves);

  const pushed = allMoves.splice(prePushLen);
  for (const m of pushed) {
    if (m) {
      allMoves[m.id] = m;
    }
  }
}