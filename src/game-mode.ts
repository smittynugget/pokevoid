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
  CHAOS_INFINITE_ROGUE
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

  /**
   * Helper function to see if a GameMode has a specific challenge type
   * @param challenge the Challenges it looks for
   * @returns true if the game mode has that challenge
   */
  hasChallenge(challenge: Challenges): boolean {
    return this.challenges.some(c => c.id === challenge && c.value !== 0);
  }

  /**
   * Helper function to see if the game mode is using fresh start
   * @returns true if a fresh start challenge is being applied
   */
  isFreshStartChallenge(): boolean {
    return this.hasChallenge(Challenges.FRESH_START);
  }

  /**
   * @returns either:
   * - override from overrides.ts
   * - 20 for Daily Runs
   * - 5 for all other modes
   */
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

  /**
   * @returns either:
   * - override from overrides.ts
   * - 1000
   */
  getStartingMoney(scene?: BattleScene): integer {
  let startingMoney = 1000;

  if(scene) {
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

  /**
   * @param scene current BattleScene
   * @returns either:
   * - random biome for Daily mode
   * - override from overrides.ts
   * - Town
   */
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

  /**
   * Determines whether or not to generate a trainer
   * @param waveIndex the current floor the player is on (trainer sprites fail to generate on X1 floors)
   * @param arena the arena that contains the scene and functions
   * @returns true if a trainer should be generated, false otherwise
   */
  isWaveTrainer(waveIndex: integer, arena: Arena): boolean {
    /**
     * Daily spawns trainers on floors 5, 15, 20, 25, 30, 35, 40, and 45
     */
    if (this.isDaily) {
      return waveIndex % 10 === 5 || (!(waveIndex % 10) && waveIndex > 10 && !this.isWaveFinal(waveIndex));
    }
    if(this.isWavePreFinal(arena.scene, waveIndex)) {
      return false;
    }
    if ((waveIndex % 30) === (arena.scene.offsetGym ? 0 : 20) && !this.isWaveFinal(waveIndex)) {
      return true;
    } else if (waveIndex % 10 !== 1 && waveIndex % 10 || arena.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {
      /**
       * Do not check X1 floors since there's a bug that stops trainer sprites from appearing
       * after a X0 full party heal
       */

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
      const allFinalBossSpecies = allSpecies.filter(s =>
          s.baseTotal >= 540
      && pokemonFormChanges.hasOwnProperty(s.speciesId)
    );
      return Utils.randSeedItem(allFinalBossSpecies);
    }

    return null;
  }

  /**
   * Checks if wave provided is the final for current or specified game mode
   * @param waveIndex
   * @param modeId game mode
   * @returns if the current wave is final for classic or daily OR a minor boss in endless
   */
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
      case GameModes.CHAOS_ROGUE:
      case GameModes.CHAOS_JOURNEY:
        return waveIndex === 500;
      case GameModes.CHAOS_VOID:
      case GameModes.CHAOS_ROGUE_VOID:
        return waveIndex === 1000;
      case GameModes.CHAOS_INFINITE:
      case GameModes.CHAOS_INFINITE_ROGUE:
        return waveIndex === 100000;
      case GameModes.TEST_MOD:
        return waveIndex === 2;
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
      case GameModes.CHAOS_ROGUE:
      case GameModes.CHAOS_JOURNEY:
        return 90;
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
        return scene.majorBossWave == wave;
    }
  }

  isBoss(waveIndex: integer): boolean {
    return waveIndex % 10 === 0;
  }

  /**
   * Every 50 waves of an Endless mode is a boss
   * At this time it is paradox pokemon
   * @returns true if waveIndex is a multiple of 50 in Endless
   */
  isEndlessBoss(waveIndex: integer): boolean {
    return !!(waveIndex % 50) &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Every 250 waves of an Endless mode is a minor boss
   * At this time it is Eternatus
   * @returns true if waveIndex is a multiple of 250 in Endless
   */
  isEndlessMinorBoss(waveIndex: integer): boolean {
    return waveIndex % 250 === 0 &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Every 1000 waves of an Endless mode is a major boss
   * At this time it is Eternamax Eternatus
   * @returns true if waveIndex is a multiple of 1000 in Endless
   */
  isEndlessMajorBoss(waveIndex: integer): boolean {
    return waveIndex % 1000 === 0 &&
        (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Checks whether there is a fixed battle on this gamemode on a given wave.
   * @param {integer} waveIndex The wave to check.
   * @returns {boolean} If this game mode has a fixed battle on this wave
   */
  isFixedBattle(waveIndex: integer): boolean {
    const dummyConfig = new FixedBattleConfig();
    return this.battleConfig.hasOwnProperty(waveIndex) || applyChallenges(this, ChallengeType.FIXED_BATTLES, waveIndex, dummyConfig);

  }

  /**
   * Returns the config for the fixed battle for a particular wave.
   * @param {integer} waveIndex The wave to check.
   * @returns {boolean} The fixed battle for this wave.
   */
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
  }
}
