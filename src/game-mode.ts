import i18next from "i18next";
import {
  classicFixedBattles,
  FixedBattleConfig,
  FixedBattleConfigs,
  majorBossWaves,
  nightmareFixedBattles, rivalWaves, setupNightmareFixedBattles
} from "./battle";
import BattleScene, { RecoveryBossMode } from "./battle-scene";
import { allChallenges, applyChallenges, Challenge, ChallengeType, copyChallenge } from "./data/challenge";
import PokemonSpecies, { allSpecies } from "./data/pokemon-species";
import { Arena } from "./field/arena";
import Overrides from "#app/overrides";
import * as Utils from "./utils";
import { Biome } from "#enums/biome";
import { GameMechanicsID, GameMechanicsVersion } from "#enums/gameMechanicsID";

import { Species } from "#enums/species";
import { Challenges } from "./enums/challenges";

import { RunType } from "./enums/quest-type-conditions";
import {pokemonFormChanges} from "#app/data/pokemon-forms";
import {PermaType} from "#app/modifier/perma-modifiers";

export enum GameModes {
  CLASSIC,
  ENDLESS,
  SPLICED_ENDLESS,
  DAILY,
  CHALLENGE,
  NUZLOCKE,
  DRAFT,
  SHOP,
  NUZLIGHT,
  NIGHTMARE,
  NUZLIGHT_DRAFT,
  NUZLOCKE_DRAFT,
  TEST_MOD,
  CHAOS_ROGUE,
  CHAOS_JOURNEY,
  CHAOS_VOID,
  CHAOS_ROGUE_VOID,
  CHAOS_INFINITE,
  CHAOS_INFINITE_ROGUE,
  CHAOS_NUZLIGHT,
  CHAOS_NUZLOCKE,
  CHAOS_NUZLIGHT_DRAFT,
  CHAOS_NUZLOCKE_DRAFT,
  CHAOS_ROGUE_SHORT,
  CHAOS_JOURNEY_SHORT,
  CHAOS_VOID_SHORT,
  CHAOS_ROGUE_VOID_SHORT,
  CHAOS_NUZLIGHT_SHORT,
  CHAOS_NUZLOCKE_SHORT,
  CHAOS_NUZLIGHT_DRAFT_SHORT,
  CHAOS_NUZLOCKE_DRAFT_SHORT,
  CHAOS_ROGUE_FTL,
  CHAOS_JOURNEY_FTL,
  CHAOS_VOID_FTL,
  CHAOS_ROGUE_VOID_FTL,
  CHAOS_NUZLIGHT_FTL,
  CHAOS_NUZLOCKE_FTL,
  CHAOS_NUZLIGHT_DRAFT_FTL,
  CHAOS_NUZLOCKE_DRAFT_FTL,
}

interface GameModeConfig {
  isClassic?: boolean;
  isEndless?: boolean;
  isDaily?: boolean;
  hasTrainers?: boolean;
  hasNoShop?: boolean;
  hasShortBiomes?: boolean;
  hasRandomBiomes?: boolean;
  hasRandomBosses?: boolean;
  isSplicedOnly?: boolean;
  isChallenge?: boolean;
  isNuzlocke?: boolean;
  isDraft?: boolean;
  isShop?: boolean;
  isNuzlight?: boolean;
  isNightmare?: boolean;
  isTestMod?: boolean;
  isChaosMode?: boolean;
  isChaosVoid?: boolean;
  isChaosShort?: boolean;
  isChaosFTL?: boolean;
  isInfinite?: boolean;
  noExpGain?: boolean;
}

export class GameMode implements GameModeConfig {
  public modeId: GameModes;
  public isClassic: boolean;
  public isEndless: boolean;
  public isDaily: boolean;
  public isInfinite: boolean;
  public isChaosVoid: boolean;
  public hasTrainers: boolean;
  public hasNoShop: boolean;
  public hasShortBiomes: boolean;
  public hasRandomBiomes: boolean;
  public hasRandomBosses: boolean;
  public isSplicedOnly: boolean;
  public isChallenge: boolean;
  public challenges: Challenge[];
  private _battleConfig: FixedBattleConfigs;
  public get battleConfig(): FixedBattleConfigs {
    return this._battleConfig;
  }
  public set battleConfig(value: FixedBattleConfigs) {
    this._battleConfig = value;
  }
  public chaosBattleConfig: FixedBattleConfig;
  public isNuzlocke: boolean;
  public isDraft: boolean;
  public isNuzlight: boolean;
  public isNightmare: boolean;
  public isTestMod: boolean;
  public isChaosMode: boolean;
  public isChaosShort: boolean;
  public isChaosFTL: boolean;
  public noExpGain: boolean;
  constructor(modeId: GameModes, config: GameModeConfig, battleConfig?: FixedBattleConfigs) {
    this.modeId = modeId;
    this.challenges = [];
    Object.assign(this, config);
    if (this.isChallenge) {
      this.challenges = allChallenges.map(c => copyChallenge(c));
    }
    this.battleConfig = battleConfig || {};
  }
  hasChallenge(challenge: Challenges): boolean {
    return this.challenges.some(c => c.id === challenge && c.value !== 0);
  }
  isFreshStartChallenge(): boolean {
    return this.hasChallenge(Challenges.FRESH_START);
  }
  getStartingLevel(): integer {
    if (Overrides.STARTING_LEVEL_OVERRIDE) {
      return Overrides.STARTING_LEVEL_OVERRIDE;
    }
    switch (this.modeId) {
    case GameModes.DAILY:
      return 20;
    default:
      return 5;
    }
  }
  getStartingMoney(scene?: BattleScene): integer {
    let startingMoney = 1000;

    if (scene) {
      if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_MONEY_3)) {
        startingMoney = 3000;
      } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_MONEY_2)) {
        startingMoney = 2000;
      } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_MONEY_1)) {
        startingMoney = 1500;
      }

      scene.gameData.reducePermaModifierByType([
        PermaType.PERMA_START_MONEY_1,
        PermaType.PERMA_START_MONEY_2,
        PermaType.PERMA_START_MONEY_3
      ], scene);
    }

    return Overrides.STARTING_MONEY_OVERRIDE || startingMoney;
  }
  getStartingBiome(scene: BattleScene): Biome {
    return scene.generateRandomBiome(this.getWaveForDifficulty(1));
  }

  getWaveForDifficulty(waveIndex: integer, ignoreCurveChanges: boolean = false): integer {
    switch (this.modeId) {
    case GameModes.DAILY:
      return waveIndex + 30 + (!ignoreCurveChanges ? Math.floor(waveIndex / 5) : 0);
    default:
      return waveIndex;
    }
  }
  isWaveTrainer(waveIndex: integer, arena: Arena): boolean {

    if (this.isDaily) {
      return waveIndex % 10 === 5 || (!(waveIndex % 10) && waveIndex > 10 && !this.isWaveFinal(waveIndex));
    }
    if (this.isWavePreFinal(arena.scene, waveIndex)) {
      return false;
    }
    if ((waveIndex % 30) === (arena.scene.offsetGym ? 0 : 20) && !this.isWaveFinal(waveIndex)) {
      return true;
    } else if (waveIndex % 10 !== 1 && waveIndex % 10 || arena.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {
      const trainerChance = arena.getTrainerChance();
      let allowTrainerBattle = true;
      if (trainerChance) {
        const waveBase = Math.floor(waveIndex / 10) * 10;
        for (let w = Math.max(waveIndex - 3, waveBase + 2); w <= Math.min(waveIndex + 3, waveBase + 9); w++) {
          if (w === waveIndex) {
            continue;
          }
          if ((w % 30) === (arena.scene.offsetGym ? 0 : 20) || this.isFixedBattle(w)) {
            allowTrainerBattle = false;
            break;
          } else if (w < waveIndex) {
            arena.scene.executeWithSeedOffset(() => {
              const waveTrainerChance = arena.getTrainerChance();
              if (!Utils.randSeedInt(waveTrainerChance)) {
                allowTrainerBattle = false;
              }
            }, w);
            if (!allowTrainerBattle) {
              break;
            }
          }
        }
      }
      return Boolean(allowTrainerBattle && waveIndex % 4 === 0 && !this.isWavePreFinal(arena.scene, waveIndex));
    }
    return false;
  }

  isTrainerBoss(waveIndex: integer, biomeType: Biome, scene: BattleScene): boolean {
    switch (this.modeId) {
    case GameModes.DAILY:
      return waveIndex > 10 && waveIndex < 50 && !(waveIndex % 10);
    default:
      return !this.isWavePreFinal(scene, waveIndex) && (scene.recoveryBossMode == RecoveryBossMode.FACING_BOSS) || ((waveIndex % 7 === 0 || waveIndex % 10 === 0) && (biomeType !== Biome.END || this.isClassic || this.isWaveFinal(waveIndex)));
    }
  }

  getOverrideSpecies(scene: BattleScene, debugging = false, wave = -1): PokemonSpecies | null {
    if (this.isWavePreFinal(scene, wave) || debugging) {
      const effectiveWave = wave > -1 ? wave : (scene?.currentBattle?.waveIndex || 0);
      const allFinalBossSpecies = allSpecies.filter(s =>
        s.baseTotal >= 540
      && pokemonFormChanges.hasOwnProperty(s.speciesId)
      && !(s.speciesId === Species.ETERNATUS && effectiveWave <= 70)
      );
      return Utils.randSeedItem(allFinalBossSpecies);
    }

    return null;
  }
  isWaveFinal(waveIndex: integer, modeId: GameModes = this.modeId): boolean {
    switch (modeId) {
    case GameModes.CLASSIC:
    case GameModes.CHALLENGE:
    case GameModes.NUZLOCKE:
    case GameModes.DRAFT:
    case GameModes.NUZLIGHT:
    case GameModes.NUZLIGHT_DRAFT:
    case GameModes.NUZLOCKE_DRAFT:
      return waveIndex === 90;
    case GameModes.ENDLESS:
    case GameModes.SPLICED_ENDLESS:
      return !(waveIndex % 250);
    case GameModes.DAILY:
      return waveIndex === 50;
    case GameModes.NIGHTMARE:
      return waveIndex === 500;
    case GameModes.CHAOS_VOID_SHORT:
    case GameModes.CHAOS_ROGUE_VOID_SHORT:
      return waveIndex === 400;
    case GameModes.CHAOS_ROGUE:
    case GameModes.CHAOS_JOURNEY:
    case GameModes.CHAOS_NUZLIGHT:
    case GameModes.CHAOS_NUZLIGHT_DRAFT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT:
      return waveIndex === 500;
    case GameModes.CHAOS_JOURNEY_SHORT:
    case GameModes.CHAOS_ROGUE_SHORT:
    case GameModes.CHAOS_NUZLIGHT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_SHORT:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
      return waveIndex === 200;
    case GameModes.CHAOS_ROGUE_FTL:
    case GameModes.CHAOS_JOURNEY_FTL:
    case GameModes.CHAOS_NUZLIGHT_FTL:
    case GameModes.CHAOS_NUZLOCKE_FTL:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
      return waveIndex === 100;
    case GameModes.CHAOS_VOID_FTL:
    case GameModes.CHAOS_ROGUE_VOID_FTL:
      return waveIndex === 200;
    case GameModes.CHAOS_VOID:
    case GameModes.CHAOS_ROGUE_VOID:
      return waveIndex === 1000;
    case GameModes.CHAOS_INFINITE:
    case GameModes.CHAOS_INFINITE_ROGUE:
      return waveIndex === 100000;
    case GameModes.TEST_MOD:
      return waveIndex === 2;
    default:
      return waveIndex === 90;
    }
  }

  getFinalWave(modeId: GameModes = this.modeId): number {
    switch (modeId) {
    case GameModes.CLASSIC:
    case GameModes.CHALLENGE:
    case GameModes.NUZLOCKE:
    case GameModes.DRAFT:
    case GameModes.NUZLIGHT:
    case GameModes.NUZLIGHT_DRAFT:
    case GameModes.NUZLOCKE_DRAFT:
      return 90;
    case GameModes.CHAOS_ROGUE_SHORT:
    case GameModes.CHAOS_JOURNEY_SHORT:
    case GameModes.CHAOS_NUZLIGHT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_SHORT:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
      return 200;
    case GameModes.CHAOS_ROGUE_FTL:
    case GameModes.CHAOS_JOURNEY_FTL:
    case GameModes.CHAOS_NUZLIGHT_FTL:
    case GameModes.CHAOS_NUZLOCKE_FTL:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
      return 100;
    case GameModes.CHAOS_ROGUE:
    case GameModes.CHAOS_JOURNEY:
    case GameModes.CHAOS_NUZLIGHT:
    case GameModes.CHAOS_NUZLOCKE:
    case GameModes.CHAOS_NUZLIGHT_DRAFT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT:
      return 500;
    case GameModes.CHAOS_VOID_SHORT:
    case GameModes.CHAOS_ROGUE_VOID_SHORT:
      return 400;
    case GameModes.CHAOS_VOID_FTL:
    case GameModes.CHAOS_ROGUE_VOID_FTL:
      return 200;
    case GameModes.ENDLESS:
    case GameModes.SPLICED_ENDLESS:
      return 5000;
    case GameModes.DAILY:
      return 50;
    case GameModes.NIGHTMARE:
      return 500;
    case GameModes.CHAOS_VOID:
    case GameModes.CHAOS_ROGUE_VOID:
      return 1000;
    case GameModes.CHAOS_INFINITE:
    case GameModes.CHAOS_INFINITE_ROGUE:
      return 100000;
    case GameModes.TEST_MOD:
      return 2;
    default:
      return -1;
    }
  }

  isWavePreFinal(scene: BattleScene, specificWave = -1, modeId: GameModes = this.modeId): boolean {
    const wave = specificWave > -1 ? specificWave : scene.currentBattle.waveIndex;
    switch (modeId) {
    case GameModes.CLASSIC:
    case GameModes.CHALLENGE:
    case GameModes.NUZLOCKE:
    case GameModes.DRAFT:
    case GameModes.NUZLIGHT:
    case GameModes.NUZLIGHT_DRAFT:
    case GameModes.NUZLOCKE_DRAFT:
      return majorBossWaves.includes(wave);
    case GameModes.ENDLESS:
    case GameModes.SPLICED_ENDLESS:
      return !(wave % 250);
    case GameModes.DAILY:
      return wave === 50;
    case GameModes.NIGHTMARE:
      return majorBossWaves.includes(wave);
    case GameModes.CHAOS_ROGUE:
    case GameModes.CHAOS_JOURNEY:
    case GameModes.CHAOS_NUZLIGHT:
    case GameModes.CHAOS_NUZLOCKE:
    case GameModes.CHAOS_NUZLIGHT_DRAFT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT:
    case GameModes.CHAOS_ROGUE_SHORT:
    case GameModes.CHAOS_JOURNEY_SHORT:
    case GameModes.CHAOS_VOID_SHORT:
    case GameModes.CHAOS_ROGUE_VOID_SHORT:
    case GameModes.CHAOS_NUZLIGHT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_SHORT:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
    case GameModes.CHAOS_ROGUE_FTL:
    case GameModes.CHAOS_JOURNEY_FTL:
    case GameModes.CHAOS_VOID_FTL:
    case GameModes.CHAOS_ROGUE_VOID_FTL:
    case GameModes.CHAOS_NUZLIGHT_FTL:
    case GameModes.CHAOS_NUZLOCKE_FTL:
    case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
    case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
      return scene.majorBossWave == wave;
    }
  }

  isBoss(waveIndex: integer): boolean {
    const forceBossWave = Overrides.BOSS_WAVE_OVERRIDE || 0;
    if (forceBossWave > 0 && waveIndex === forceBossWave) {
      return true;
    }
    return waveIndex % 10 === 0;
  }
  isEndlessBoss(waveIndex: integer): boolean {
    return !!(waveIndex % 50) &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }
  isEndlessMinorBoss(waveIndex: integer): boolean {
    return waveIndex % 250 === 0 &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }
  isEndlessMajorBoss(waveIndex: integer): boolean {
    return waveIndex % 1000 === 0 &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }
  isFixedBattle(waveIndex: integer): boolean {
    const dummyConfig = new FixedBattleConfig();
    return this.battleConfig.hasOwnProperty(waveIndex) || applyChallenges(this, ChallengeType.FIXED_BATTLES, waveIndex, dummyConfig);

  }
  getFixedBattle(waveIndex: integer, isChaosMode: boolean = false): FixedBattleConfig {
    const challengeConfig = new FixedBattleConfig();
    if (applyChallenges(this, ChallengeType.FIXED_BATTLES, waveIndex, challengeConfig)) {
      return challengeConfig;
    } else {
      return isChaosMode && this.chaosBattleConfig ? this.chaosBattleConfig : this.battleConfig[waveIndex];
    }
  }

  setChaosBattleConfig(chaosBattleConfig: FixedBattleConfig) {
    this.chaosBattleConfig = chaosBattleConfig;
  }
  getClearScoreBonus(): integer {
    switch (this.modeId) {
    case GameModes.CLASSIC:
    case GameModes.CHALLENGE:
      return 5000;
    case GameModes.DAILY:
      return 2500;
    default:
      return 0;
    }
  }

  getEnemyModifierChance(isBoss: boolean): integer {
    switch (this.modeId) {
    case GameModes.CLASSIC:
    case GameModes.CHALLENGE:
    case GameModes.DAILY:
      return !isBoss ? 18 : 6;
    case GameModes.ENDLESS:
    case GameModes.SPLICED_ENDLESS:
      return !isBoss ? 12 : 4;
    }
  }

  getName(): string {
    switch (this.modeId) {
    case GameModes.CLASSIC:
      return i18next.t("gameMode:classic");
    case GameModes.ENDLESS:
      return i18next.t("gameMode:endless");
    case GameModes.SPLICED_ENDLESS:
      return i18next.t("gameMode:endlessSpliced");
    case GameModes.DAILY:
      return i18next.t("gameMode:dailyRun");
    case GameModes.CHALLENGE:
      return i18next.t("gameMode:challenge");
    case GameModes.NUZLOCKE:
      return i18next.t("gameMode:nuzlocke");
    case GameModes.DRAFT:
      return i18next.t("gameMode:draft");
    case GameModes.NUZLIGHT_DRAFT:
      return i18next.t("gameMode:nuzlightDraft");
    case GameModes.NUZLOCKE_DRAFT:
      return i18next.t("gameMode:nuzlockeDraft");
    case GameModes.NUZLIGHT:
      return i18next.t("gameMode:nuzlight");
    case GameModes.NIGHTMARE:
      return i18next.t("gameMode:nightmare");
    case GameModes.TEST_MOD:
      return i18next.t("gameMode:testMod");
    case GameModes.CHAOS_ROGUE:
      return i18next.t("gameMode:chaosRogue");
    case GameModes.CHAOS_JOURNEY:
      return i18next.t("gameMode:chaosJourney");
    case GameModes.CHAOS_VOID:
      return i18next.t("gameMode:chaosVoid");
    case GameModes.CHAOS_ROGUE_VOID:
      return i18next.t("gameMode:chaosRogueVoid");
    case GameModes.CHAOS_INFINITE:
      return i18next.t("gameMode:chaosInfinite");
    case GameModes.CHAOS_INFINITE_ROGUE:
      return i18next.t("gameMode:chaosInfiniteRogue");
    case GameModes.CHAOS_NUZLIGHT:
      return i18next.t("gameMode:chaosNuzlight");
    case GameModes.CHAOS_NUZLOCKE:
      return i18next.t("gameMode:chaosNuzlocke");
    case GameModes.CHAOS_NUZLIGHT_DRAFT:
      return i18next.t("gameMode:chaosNuzlightDraft");
    case GameModes.CHAOS_NUZLOCKE_DRAFT:
      return i18next.t("gameMode:chaosNuzlockeDraft");
    }
  }

  static getModeName(modeId: GameModes): string {
    switch (modeId) {
    case GameModes.CLASSIC:
      return i18next.t("gameMode:classic");
    case GameModes.ENDLESS:
      return i18next.t("gameMode:endless");
    case GameModes.SPLICED_ENDLESS:
      return i18next.t("gameMode:endlessSpliced");
    case GameModes.DAILY:
      return i18next.t("gameMode:dailyRun");
    case GameModes.CHALLENGE:
      return i18next.t("gameMode:challenge");
    case GameModes.NUZLOCKE:
      return i18next.t("gameMode:nuzlocke");
    case GameModes.DRAFT:
      return i18next.t("gameMode:draft");
    case GameModes.SHOP:
      return i18next.t("gameMode:shop");
    case GameModes.NUZLIGHT:
      return i18next.t("gameMode:nuzlight");
    case GameModes.NIGHTMARE:
      return i18next.t("gameMode:nightmare");
    case GameModes.TEST_MOD:
      return i18next.t("gameMode:testMod");
    case GameModes.NUZLIGHT_DRAFT:
      return i18next.t("gameMode:nuzlightDraft");
    case GameModes.NUZLOCKE_DRAFT:
      return i18next.t("gameMode:nuzlockeDraft");
    case GameModes.CHAOS_ROGUE:
      return `${i18next.t("gameMode:chaosRogue")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_JOURNEY:
      return `${i18next.t("gameMode:chaosJourney")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_VOID:
      return `${i18next.t("gameMode:chaosVoid")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_ROGUE_VOID:
      return `${i18next.t("gameMode:chaosRogueVoid")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_INFINITE:
      return `${i18next.t("gameMode:chaosInfinite")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_INFINITE_ROGUE:
      return `${i18next.t("gameMode:chaosInfiniteRogue")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_NUZLIGHT:
      return `${i18next.t("gameMode:chaosNuzlight")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_NUZLOCKE:
      return `${i18next.t("gameMode:chaosNuzlocke")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_NUZLIGHT_DRAFT:
      return `${i18next.t("gameMode:chaosNuzlightDraft")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_NUZLOCKE_DRAFT:
      return `${i18next.t("gameMode:chaosNuzlockeDraft")} ${i18next.t("gameMode:abyss")}`;
    case GameModes.CHAOS_ROGUE_SHORT:
      return `${i18next.t("gameMode:chaosRogue")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_JOURNEY_SHORT:
      return `${i18next.t("gameMode:chaosJourney")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_VOID_SHORT:
      return `${i18next.t("gameMode:chaosVoid")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_ROGUE_VOID_SHORT:
      return `${i18next.t("gameMode:chaosRogueVoid")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_NUZLIGHT_SHORT:
      return `${i18next.t("gameMode:chaosNuzlight")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_NUZLOCKE_SHORT:
      return `${i18next.t("gameMode:chaosNuzlocke")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
      return `${i18next.t("gameMode:chaosNuzlightDraft")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
      return `${i18next.t("gameMode:chaosNuzlockeDraft")} ${i18next.t("gameMode:midnight")}`;
    case GameModes.CHAOS_ROGUE_FTL:
      return `${i18next.t("gameMode:chaosRogue")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_JOURNEY_FTL:
      return `${i18next.t("gameMode:chaosJourney")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_VOID_FTL:
      return `${i18next.t("gameMode:chaosVoid")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_ROGUE_VOID_FTL:
      return `${i18next.t("gameMode:chaosRogueVoid")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_NUZLIGHT_FTL:
      return `${i18next.t("gameMode:chaosNuzlight")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_NUZLOCKE_FTL:
      return `${i18next.t("gameMode:chaosNuzlocke")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
      return `${i18next.t("gameMode:chaosNuzlightDraft")} ${i18next.t("gameMode:ftl")}`;
    case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
      return `${i18next.t("gameMode:chaosNuzlockeDraft")} ${i18next.t("gameMode:ftl")}`;
    default:
      return i18next.t("gameMode:unknown");
    }
  }
  isRunType(runType: RunType): boolean {
    switch (runType) {
    case RunType.ANY:
      return true;
    case RunType.CLASSIC:
      return this.isClassic;
    case RunType.NON_CLASSIC:
      return !this.isClassic;
    case RunType.NUZLOCKE:
      return this.isNuzlocke;
    case RunType.NIGHTMARE:
      return this.isNightmare;
    default:
      return false;
    }
  }
  checkIfRival(scene: BattleScene): boolean {
    const waveIndex = scene.currentBattle.waveIndex;
    return rivalWaves.includes(waveIndex) || scene.rivalWave === waveIndex;
  }

  hasShopCheck(scene: BattleScene): boolean {
    if (scene.dynamicMode?.isNuzlight || scene.dynamicMode?.isNightmare) {
      return false;
    }

    if (this.isNightmare) {
      const waveIndex = scene.currentBattle?.waveIndex ?? 0;
      if ((waveIndex >= 100 && waveIndex < 300) || (waveIndex >= 400 && waveIndex <= 500)) {
        return false;
      }
    }
    return !this.hasNoShop;
  }

  isNuzlockeActive(scene: BattleScene): boolean {
    if (scene.dynamicMode?.isNuzlocke || scene.dynamicMode?.isNightmare) {
      return true;
    }

    if (this.isNightmare) {
      const waveIndex = scene.currentBattle?.waveIndex ?? 0;
      if (waveIndex >= 300 && waveIndex <= 500) {
        return true;
      }
    }
    return this.isNuzlocke;
  }

  static getChaosBaseName(modeKey: string): string {
    switch (modeKey) {
    case "CHAOS_ROGUE":
      return i18next.t("gameMode:chaosRogue");
    case "CHAOS_JOURNEY":
      return i18next.t("gameMode:chaosJourney");
    case "CHAOS_NUZLIGHT":
      return i18next.t("gameMode:chaosNuzlight");
    case "CHAOS_NUZLOCKE":
      return i18next.t("gameMode:chaosNuzlocke");
    case "CHAOS_NUZLIGHT_DRAFT":
      return i18next.t("gameMode:chaosNuzlightDraft");
    case "CHAOS_NUZLOCKE_DRAFT":
      return i18next.t("gameMode:chaosNuzlockeDraft");
    case "CHAOS_VOID":
      return i18next.t("gameMode:chaosVoid");
    case "CHAOS_ROGUE_VOID":
      return i18next.t("gameMode:chaosRogueVoid");
    case "CHAOS_INFINITE":
      return i18next.t("gameMode:chaosInfinite");
    case "CHAOS_INFINITE_ROGUE":
      return i18next.t("gameMode:chaosInfiniteRogue");
    default:
      return i18next.t("gameMode:chaosMode");
    }
  }
}

export function getGameMode(gameMode: GameModes, scene?: BattleScene): GameMode {
  const baseConfig: GameModeConfig = {
    isClassic: false,
    isEndless: false,
    isInfinite: false,
    isDaily: false,
    hasTrainers: false,
    hasNoShop: false,
    hasShortBiomes: false,
    hasRandomBiomes: false,
    hasRandomBosses: false,
    isSplicedOnly: false,
    isChallenge: false,
    isNuzlocke: false,
    isDraft: false,
    isShop: false,
    isNuzlight: false,
    isNightmare: false,
    isTestMod: false,
    isChaosMode: false,
    isChaosVoid: false,
    isChaosShort: false,
    isChaosFTL: false,
    noExpGain: false
  };
  switch (gameMode) {
  case GameModes.CLASSIC:
    return new GameMode(GameModes.CLASSIC, { ...baseConfig, isClassic: true, hasTrainers: true }, classicFixedBattles);
  case GameModes.ENDLESS:
    return new GameMode(GameModes.ENDLESS, { ...baseConfig, isEndless: true, hasShortBiomes: true, hasRandomBosses: true });
  case GameModes.SPLICED_ENDLESS:
    return new GameMode(GameModes.SPLICED_ENDLESS, {
      ...baseConfig,
      isEndless: true,
      hasShortBiomes: true,
      hasRandomBosses: true,
      isSplicedOnly: true
    });
  case GameModes.DAILY:
    return new GameMode(GameModes.DAILY, { ...baseConfig, isDaily: true, hasTrainers: true, hasNoShop: true });
  case GameModes.CHALLENGE:
    return new GameMode(GameModes.CHALLENGE, { ...baseConfig, isClassic: true, hasTrainers: true, isChallenge: true }, classicFixedBattles);
  case GameModes.NUZLOCKE:
    return new GameMode(GameModes.NUZLOCKE, { ...baseConfig, isNuzlocke: true, hasTrainers: true }, classicFixedBattles);
  case GameModes.DRAFT:
    return new GameMode(GameModes.DRAFT, { ...baseConfig, isDraft: true, hasTrainers: true }, classicFixedBattles);
  case GameModes.NUZLIGHT_DRAFT:
    return new GameMode(GameModes.NUZLIGHT_DRAFT, { ...baseConfig, isNuzlight: true, isDraft: true, hasTrainers: true, hasNoShop: true }, classicFixedBattles);
  case GameModes.NUZLOCKE_DRAFT:
    return new GameMode(GameModes.NUZLOCKE_DRAFT, { ...baseConfig, isNuzlocke: true, isDraft: true, hasTrainers: true }, classicFixedBattles);
  case GameModes.SHOP:
    return new GameMode(GameModes.SHOP, { ...baseConfig, isShop: true, hasNoShop: true });
  case GameModes.NUZLIGHT:
    return new GameMode(GameModes.NUZLIGHT, { ...baseConfig, isNuzlight: true, hasTrainers: true, hasNoShop: true }, classicFixedBattles);
  case GameModes.NIGHTMARE:
    return new GameMode(GameModes.NIGHTMARE, { ...baseConfig, isNightmare: true, isDraft: true, hasTrainers: true }, nightmareFixedBattles);
  case GameModes.TEST_MOD:
    return new GameMode(GameModes.TEST_MOD, { ...baseConfig, isTestMod: true, hasTrainers: false, hasNoShop: true }, classicFixedBattles);
  case GameModes.CHAOS_ROGUE:
    return new GameMode(GameModes.CHAOS_ROGUE, { ...baseConfig, isChaosMode: true, isDraft: true, hasTrainers: true });
  case GameModes.CHAOS_JOURNEY:
    return new GameMode(GameModes.CHAOS_JOURNEY, { ...baseConfig, isChaosMode: true, isClassic: true, hasTrainers: true });
  case GameModes.CHAOS_VOID:
    return new GameMode(GameModes.CHAOS_VOID, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isClassic: true, hasTrainers: true });
  case GameModes.CHAOS_ROGUE_VOID:
    return new GameMode(GameModes.CHAOS_ROGUE_VOID, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isDraft: true, hasTrainers: true });
  case GameModes.CHAOS_INFINITE:
    return new GameMode(GameModes.CHAOS_INFINITE, { ...baseConfig, isInfinite: true, isChaosMode: true, isClassic: true, hasTrainers: true });
  case GameModes.CHAOS_INFINITE_ROGUE:
    return new GameMode(GameModes.CHAOS_INFINITE_ROGUE, { ...baseConfig, isInfinite: true, isChaosMode: true, isDraft: true, hasTrainers: true });
  case GameModes.CHAOS_NUZLIGHT:
    return new GameMode(GameModes.CHAOS_NUZLIGHT, { ...baseConfig, isChaosMode: true, isNuzlight: true, hasTrainers: true, hasNoShop: true });
  case GameModes.CHAOS_NUZLOCKE:
    return new GameMode(GameModes.CHAOS_NUZLOCKE, { ...baseConfig, isChaosMode: true, isNuzlocke: true, hasTrainers: true });
  case GameModes.CHAOS_NUZLIGHT_DRAFT:
    return new GameMode(GameModes.CHAOS_NUZLIGHT_DRAFT, { ...baseConfig, isChaosMode: true, isNuzlight: true, isDraft: true, hasTrainers: true, hasNoShop: true });
  case GameModes.CHAOS_NUZLOCKE_DRAFT:
    return new GameMode(GameModes.CHAOS_NUZLOCKE_DRAFT, { ...baseConfig, isChaosMode: true, isNuzlocke: true, isDraft: true, hasTrainers: true });
  case GameModes.CHAOS_ROGUE_SHORT:
    return new GameMode(GameModes.CHAOS_ROGUE_SHORT, { ...baseConfig, isChaosMode: true, isDraft: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_JOURNEY_SHORT:
    return new GameMode(GameModes.CHAOS_JOURNEY_SHORT, { ...baseConfig, isChaosMode: true, isClassic: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_VOID_SHORT:
    return new GameMode(GameModes.CHAOS_VOID_SHORT, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isClassic: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_ROGUE_VOID_SHORT:
    return new GameMode(GameModes.CHAOS_ROGUE_VOID_SHORT, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isDraft: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_NUZLIGHT_SHORT:
    return new GameMode(GameModes.CHAOS_NUZLIGHT_SHORT, { ...baseConfig, isChaosMode: true, isNuzlight: true, hasTrainers: true, hasNoShop: true, isChaosShort: true });
  case GameModes.CHAOS_NUZLOCKE_SHORT:
    return new GameMode(GameModes.CHAOS_NUZLOCKE_SHORT, { ...baseConfig, isChaosMode: true, isNuzlocke: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
    return new GameMode(GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT, { ...baseConfig, isChaosMode: true, isNuzlight: true, isDraft: true, hasTrainers: true, hasNoShop: true, isChaosShort: true });
  case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
    return new GameMode(GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT, { ...baseConfig, isChaosMode: true, isNuzlocke: true, isDraft: true, hasTrainers: true, isChaosShort: true });
  case GameModes.CHAOS_ROGUE_FTL:
    return new GameMode(GameModes.CHAOS_ROGUE_FTL, { ...baseConfig, isChaosMode: true, isDraft: true, hasTrainers: true, isChaosFTL: true });
  case GameModes.CHAOS_JOURNEY_FTL:
    return new GameMode(GameModes.CHAOS_JOURNEY_FTL, { ...baseConfig, isChaosMode: true, isClassic: true, hasTrainers: true, isChaosFTL: true });
  case GameModes.CHAOS_VOID_FTL:
    return new GameMode(GameModes.CHAOS_VOID_FTL, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isClassic: true, hasTrainers: true, isChaosFTL: true });
  case GameModes.CHAOS_ROGUE_VOID_FTL:
    return new GameMode(GameModes.CHAOS_ROGUE_VOID_FTL, { ...baseConfig, isChaosMode: true, isChaosVoid: true, isDraft: true, hasTrainers: true, isChaosFTL: true });
  case GameModes.CHAOS_NUZLIGHT_FTL:
    return new GameMode(GameModes.CHAOS_NUZLIGHT_FTL, { ...baseConfig, isChaosMode: true, isNuzlight: true, hasTrainers: true, hasNoShop: true, isChaosFTL: true });
  case GameModes.CHAOS_NUZLOCKE_FTL:
    return new GameMode(GameModes.CHAOS_NUZLOCKE_FTL, { ...baseConfig, isChaosMode: true, isNuzlocke: true, hasTrainers: true, isChaosFTL: true });
  case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
    return new GameMode(GameModes.CHAOS_NUZLIGHT_DRAFT_FTL, { ...baseConfig, isChaosMode: true, isNuzlight: true, isDraft: true, hasTrainers: true, hasNoShop: true, isChaosFTL: true });
  case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
    return new GameMode(GameModes.CHAOS_NUZLOCKE_DRAFT_FTL, { ...baseConfig, isChaosMode: true, isNuzlocke: true, isDraft: true, hasTrainers: true, isChaosFTL: true });
  }
}

export function isRogueMode(gameMode: GameMode): boolean {
  return gameMode.modeId === GameModes.CHAOS_ROGUE ||
         gameMode.modeId === GameModes.CHAOS_ROGUE_VOID ||
         gameMode.modeId === GameModes.CHAOS_INFINITE_ROGUE ||
         gameMode.modeId === GameModes.CHAOS_ROGUE_SHORT ||
         gameMode.modeId === GameModes.CHAOS_ROGUE_FTL ||
         gameMode.modeId === GameModes.CHAOS_ROGUE_VOID_FTL ||
         gameMode.isDraft;
}

export function getChampionMechanicsVersion(scene: BattleScene): GameMechanicsVersion {
  return scene.gameMechanicTracking?.[GameMechanicsID.CHAMPION_MODE] ?? GameMechanicsVersion.PRE_CHAMPION;
}
