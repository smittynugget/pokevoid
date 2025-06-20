import BattleScene, { RecoveryBossMode } from "./battle-scene";
import { EnemyPokemon, PlayerPokemon, QueuedMove } from "./field/pokemon";
import { Command } from "./ui/command-ui-handler";
import * as Utils from "./utils";
import Trainer, { TrainerVariant } from "./field/trainer";
import { GameMode, GameModes } from "./game-mode";
import {IncreasedMoneyBoostModifier, MoneyMultiplierModifier, PokemonHeldItemModifier} from "./modifier/modifier";
import { PokeballType } from "./data/pokeball";
import {
  getAllRivalTrainerTypes,
  getDynamicRival,
  getDynamicRivalConfig, getDynamicRivalType, getNightmarePartyTemplate, getRandomPartyMemberFunc, getSpeciesFilterRandomPartyMemberFunc,
  RivalTrainerType, TrainerConfig,
  trainerConfigs, trainerPartyTemplates, TrainerSlot
} from "./data/trainer-config";
import { ArenaTagType } from "./enums/arena-tag-type";
import { BattleSpec } from "./enums/battle-spec";
import { Moves } from "./enums/moves";
import { PlayerGender } from "./enums/player-gender";
import { Species } from "./enums/species";
import { TrainerType } from "./enums/trainer-type";
import i18next from "./plugins/i18n";
import {RewardObtainedType} from "./ui/reward-obtained-ui-handler";
import {Mode} from "./ui/ui";
import {RewardObtainDisplayPhase} from "./phases/reward-obtain-display-phase";
import {PartyMemberStrength} from "#enums/party-member-strength";
import {allSpecies, SpeciesFormKey, universalSmittyForms} from "#app/data/pokemon-species";
import {applyUniversalSmittyForm, pokemonFormChanges, SmittyFormTrigger} from "#app/data/pokemon-forms";
import {trainerTypeDialogue} from "#app/data/dialogue";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {TrainerVictoryPhase} from "#app/phases/trainer-victory-phase";
import { Unlockables } from "./system/unlockables";
import { Type } from "./data/type";

export enum BattleType {
  WILD,
  TRAINER,
  CLEAR
}

export enum DynamicModes {
  NONE,
  IS_NUZLOCKE,
  IS_NUZLIGHT,
  IS_NIGHTMARE,
  NO_EXP_GAIN,
  NO_CATCH,
  HAS_PASSIVE_ABILITY,
  INVERTED_TYPES,
  BOOSTED_TRAINER,
  MULTI_LEGENDARIES,
  MULTI_BOSS,
  NO_INITIAL_SWITCH,
  AUTO_PRESSURED,
  NO_STAT_BOOSTS,
  NO_STATUS_MOVES,
  NO_PHYSICAL_MOVES,
  NO_SPECIAL_MOVES,
  STAT_SWAP,
  EXTRA_DAMAGE_TO_TYPES,
  NO_STAB,
  TRICK_ROOM,
  NO_SWITCH,
  NO_RESISTANCES,
  NO_HEALING_ITEMS,
  AUTO_TORMENT,
  LEGENDARY_NERF,
  TYPE_EXTRA_DAMAGE,
  POKEMON_NERF
}

export enum BattlerIndex {
    ATTACKER = -1,
    PLAYER,
    PLAYER_2,
    ENEMY,
    ENEMY_2
}

export interface TurnCommand {
    command: Command;
    cursor?: integer;
    move?: QueuedMove;
    targets?: BattlerIndex[];
    skip?: boolean;
    args?: any[];
}

interface TurnCommands {
    [key: integer]: TurnCommand | null
}

export default class Battle {
  protected gameMode: GameMode;
  public waveIndex: integer;
  public battleType: BattleType;
  public battleSpec: BattleSpec;
  public trainer: Trainer | null;
  public enemyLevels: integer[] | undefined;
  public enemyParty: EnemyPokemon[];
  public seenEnemyPartyMemberIds: Set<integer>;
  public double: boolean;
  public started: boolean;
  public enemySwitchCounter: integer;
  public turn: integer;
  public turnCommands: TurnCommands;
  public playerParticipantIds: Set<integer>;
  public battleScore: integer;
  public postBattleLoot: PokemonHeldItemModifier[];
  public escapeAttempts: integer;
  public lastMove: Moves;
  public battleSeed: string;
  private battleSeedState: string | null;
  public moneyScattered: number;
  public lastUsedPokeball: PokeballType | null;
  public playerFaints: number; // The amount of times pokemon on the players side have fainted
  public enemyFaints: number; // The amount of times pokemon on the enemies side have fainted
  public scene: BattleScene;

  public switchedOutPokemon: Set<number> = new Set();


  private rngCounter: integer = 0;

  constructor(gameMode: GameMode, waveIndex: integer, battleType: BattleType, trainer?: Trainer, double?: boolean, scene?: BattleScene) {
    this.gameMode = gameMode;
    this.scene = scene;
    this.waveIndex = waveIndex;
    this.battleType = battleType;
    this.trainer = trainer ?? null;
    this.initBattleSpec();
    this.enemyLevels = battleType !== BattleType.TRAINER
      ? new Array(double ? 2 : 1).fill(null).map(() => this.getLevelForWave())
      : trainer?.getPartyLevels(this.waveIndex);
    this.enemyParty = [];
    this.seenEnemyPartyMemberIds = new Set<integer>();
    this.double = !!double;
    this.enemySwitchCounter = 0;
    this.turn = 0;
    this.playerParticipantIds = new Set<integer>();
    this.battleScore = 0;
    this.postBattleLoot = [];
    this.escapeAttempts = 0;
    this.started = false;
    this.battleSeed = Utils.randomString(16, true);
    this.battleSeedState = null;
    this.moneyScattered = 0;
    this.lastUsedPokeball = null;
    this.playerFaints = 0;
    this.enemyFaints = 0;
    this.switchedOutPokemon = new Set();
  }

  public initBattleSpec(): void {
    let spec = BattleSpec.DEFAULT;
    if (this.gameMode.isWavePreFinal(this.scene, this.waveIndex)) {
      spec = BattleSpec.FINAL_BOSS;
    }
    this.battleSpec = spec;
  }

  private getLevelForWave(): integer {

    let waveIndex = this.waveIndex;
    if (this.scene.gameMode.isNightmare) {
      const segment = Math.floor(this.waveIndex / 100);
      const remainder = this.waveIndex % 100;
      waveIndex = remainder === 0 ? 100 : remainder;
    }

    const levelWaveIndex = this.gameMode.getWaveForDifficulty(waveIndex);

    const baseLevel = 1 + levelWaveIndex / 2 + Math.pow(levelWaveIndex / 25, 2);
    const bossMultiplier = 1.2;

    if (this.gameMode.isBoss(waveIndex) || this.gameMode.isWavePreFinal(this.scene, waveIndex) || this.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {

      if(this.waveIndex >= 21) {
       const playerParty = this.scene.getParty();
        let highestPlayerLevel = 0;
        
        playerParty.forEach(pokemon => {
          if (pokemon.level > highestPlayerLevel) {
            highestPlayerLevel = pokemon.level;
          }
        });
        
        return highestPlayerLevel + 5;
      }

      let ret = Math.floor(baseLevel * bossMultiplier);
      if (this.battleSpec === BattleSpec.FINAL_BOSS || !(waveIndex % 250)) {
        return Math.ceil(ret / 25) * 25;
      }
      //@ts-ignore
      if (this.battleSpec === BattleSpec.FINAL_BOSS) {
        ret += 5;
      }
      return ret;
      let levelOffset = 0;
      if (!this.gameMode.isWaveFinal(this.waveIndex)) {
        levelOffset = Math.round(Phaser.Math.RND.realInRange(-1, 1) * Math.floor(levelWaveIndex / 10));
      }
      return ret + levelOffset;
    }

    let levelOffset = 0;

    const deviation = 10 / levelWaveIndex;
    levelOffset = Math.abs(this.randSeedGaussForLevel(deviation));

    return Math.max(Math.round(baseLevel + levelOffset), 1);
  }

  getLvlForWave(): integer {
    if ((this.waveIndex === 1 && this.gameMode.isDraft) ||
        (this.gameMode.isNightmare && (this.waveIndex === 1 || this.waveIndex % 100 === 1))) {
      return 5;
    }
    return this.getLevelForWave();
  }

  markPokemonAsSwitchedOut(pokemonId: number): void {
    this.switchedOutPokemon.add(pokemonId);
  }

  hasPokemonBeenSwitchedOut(pokemonId: number): boolean {
    return this.switchedOutPokemon.has(pokemonId);
  }

  randSeedGaussForLevel(value: number): number {
    let rand = 0;
    for (let i = value; i > 0; i--) {
      rand += Phaser.Math.RND.realInRange(0, 1);
    }
    return rand / value;
  }

  getBattlerCount(): integer {
    return this.double ? 2 : 1;
  }

  incrementTurn(scene: BattleScene): void {
    this.turn++;
    this.turnCommands = Object.fromEntries(Utils.getEnumValues(BattlerIndex).map(bt => [ bt, null ]));
    this.battleSeedState = null;
  }

  addParticipant(playerPokemon: PlayerPokemon): void {
    this.playerParticipantIds.add(playerPokemon.id);
  }

  removeFaintedParticipant(playerPokemon: PlayerPokemon): void {
    this.playerParticipantIds.delete(playerPokemon.id);
  }

  addPostBattleLoot(enemyPokemon: EnemyPokemon): void {
    this.postBattleLoot.push(...enemyPokemon.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.pokemonId === enemyPokemon.id && m.isTransferrable, false).map(i => {
      const ret = i as PokemonHeldItemModifier;
      ret.pokemonId = null;
      return ret;
    }));
  }

  pickUpScatteredMoney(scene: BattleScene): void {
    const moneyAmount = new Utils.IntegerHolder(scene.currentBattle.moneyScattered);
    scene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    if (scene.findModifier(m => m instanceof IncreasedMoneyBoostModifier)) {
      scene.applyModifiers(IncreasedMoneyBoostModifier, true, moneyAmount);
    }

    if (scene.arena.getTag(ArenaTagType.HAPPY_HOUR)) {
      moneyAmount.value *= 2;
    }

    if(scene.currentBattle.battleType == BattleType.TRAINER && !scene.gameMode.isChaosMode) {
      scene.addPhaseAfterTarget(new RewardObtainDisplayPhase(
          scene,
          {
            type: RewardObtainedType.MONEY,
            amount: moneyAmount.value
          }, () => {
            scene.addMoney(moneyAmount.value);
          }), TrainerVictoryPhase)
    }

    else {

      scene.unshiftPhase(new RewardObtainDisplayPhase(
          scene,
          {
            type: RewardObtainedType.MONEY,
            amount: moneyAmount.value
          }, () => {
            scene.addMoney(moneyAmount.value);
          }
      ));
    }

    scene.currentBattle.moneyScattered = 0;
  }

  addBattleScore(scene: BattleScene): void {
    let partyMemberTurnMultiplier = scene.getEnemyParty().length / 2 + 0.5;
    if (this.double) {
      partyMemberTurnMultiplier /= 1.5;
    }
    for (const p of scene.getEnemyParty()) {
      if (p.isBoss()) {
        partyMemberTurnMultiplier *= (p.bossSegments / 1.5) / scene.getEnemyParty().length;
      }
    }
    const turnMultiplier = Phaser.Tweens.Builders.GetEaseFunction("Sine.easeIn")(1 - Math.min(this.turn - 2, 10 * partyMemberTurnMultiplier) / (10 * partyMemberTurnMultiplier));
    const finalBattleScore = Math.ceil(this.battleScore * turnMultiplier);
    scene.score += finalBattleScore;
    scene.updateScoreText();
  }

  getBgmOverride(scene: BattleScene): string | null {
    const battlers = this.enemyParty.slice(0, this.getBattlerCount());
    if (this.battleType === BattleType.TRAINER) {
      if (!this.started && this.trainer?.config.encounterBgm && this.trainer?.getEncounterMessages()?.length) {
        return `encounter_${this.trainer?.getEncounterBgm()}`;
      }
      if (scene.musicPreference === 0) {
        return this.trainer?.getBattleBgm() ?? null;
      } else {
        return this.trainer?.getMixedBattleBgm() ?? null;
      }
    } else if (this.gameMode.isClassic && this.waveIndex > 115 && this.battleSpec !== BattleSpec.FINAL_BOSS) {
      return "end_summit";
    }
    for (const pokemon of battlers) {
      if (this.battleSpec === BattleSpec.FINAL_BOSS) {
        if (pokemon.formIndex) {
          return "battle_final";
        }
        return "battle_final_encounter";
      }
      if (pokemon.species.legendary || pokemon.species.subLegendary || pokemon.species.mythical) {
        if (scene.musicPreference === 0) {
        if (pokemon.species.speciesId === Species.REGIROCK || pokemon.species.speciesId === Species.REGICE || pokemon.species.speciesId === Species.REGISTEEL || pokemon.species.speciesId === Species.REGIGIGAS || pokemon.species.speciesId === Species.REGIELEKI || pokemon.species.speciesId === Species.REGIDRAGO) {
            return "battle_legendary_regis_g5";
        }
        if (pokemon.species.speciesId === Species.COBALION || pokemon.species.speciesId === Species.TERRAKION || pokemon.species.speciesId === Species.VIRIZION || pokemon.species.speciesId === Species.TORNADUS || pokemon.species.speciesId === Species.THUNDURUS || pokemon.species.speciesId === Species.LANDORUS || pokemon.species.speciesId === Species.KELDEO || pokemon.species.speciesId === Species.MELOETTA || pokemon.species.speciesId === Species.GENESECT) {
          return "battle_legendary_unova";
        }
          if (pokemon.species.speciesId === Species.KYUREM) {
            return "battle_legendary_kyurem";
          }
          if (pokemon.species.legendary) {
          return "battle_legendary_res_zek";
        }
          return "battle_legendary_unova";
        } else {
          if (pokemon.species.speciesId === Species.ARTICUNO || pokemon.species.speciesId === Species.ZAPDOS || pokemon.species.speciesId === Species.MOLTRES || pokemon.species.speciesId === Species.MEWTWO || pokemon.species.speciesId === Species.MEW) {
            return "battle_legendary_kanto";
          }
          if (pokemon.species.speciesId === Species.RAIKOU) {
            return "battle_legendary_raikou";
          }
          if (pokemon.species.speciesId === Species.ENTEI) {
            return "battle_legendary_entei";
          }
          if (pokemon.species.speciesId === Species.SUICUNE) {
            return "battle_legendary_suicune";
          }
          if (pokemon.species.speciesId === Species.LUGIA) {
            return "battle_legendary_lugia";
          }
          if (pokemon.species.speciesId === Species.HO_OH) {
            return "battle_legendary_ho_oh";
          }
          if (pokemon.species.speciesId === Species.REGIROCK || pokemon.species.speciesId === Species.REGICE || pokemon.species.speciesId === Species.REGISTEEL || pokemon.species.speciesId === Species.REGIGIGAS || pokemon.species.speciesId === Species.REGIELEKI || pokemon.species.speciesId === Species.REGIDRAGO) {
            return "battle_legendary_regis_g6";
          }
          if (pokemon.species.speciesId === Species.GROUDON || pokemon.species.speciesId === Species.KYOGRE) {
            return "battle_legendary_gro_kyo";
          }
          if (pokemon.species.speciesId === Species.RAYQUAZA) {
            return "battle_legendary_rayquaza";
          }
          if (pokemon.species.speciesId === Species.DEOXYS) {
            return "battle_legendary_deoxys";
          }
          if (pokemon.species.speciesId === Species.UXIE || pokemon.species.speciesId === Species.MESPRIT || pokemon.species.speciesId === Species.AZELF) {
            return "battle_legendary_lake_trio";
          }
          if (pokemon.species.speciesId === Species.HEATRAN || pokemon.species.speciesId === Species.CRESSELIA || pokemon.species.speciesId === Species.DARKRAI || pokemon.species.speciesId === Species.SHAYMIN) {
            return "battle_legendary_sinnoh";
          }
          if (pokemon.species.speciesId === Species.DIALGA || pokemon.species.speciesId === Species.PALKIA) {
            if (pokemon.getFormKey() === "") {
            return "battle_legendary_dia_pal";
          }
            if (pokemon.getFormKey() === "origin") {
              return "battle_legendary_origin_forme";
            }
          }
          if (pokemon.species.speciesId === Species.GIRATINA) {
            return "battle_legendary_giratina";
          }
          if (pokemon.species.speciesId === Species.ARCEUS) {
            return "battle_legendary_arceus";
          }
          if (pokemon.species.speciesId === Species.COBALION || pokemon.species.speciesId === Species.TERRAKION || pokemon.species.speciesId === Species.VIRIZION || pokemon.species.speciesId === Species.TORNADUS || pokemon.species.speciesId === Species.THUNDURUS || pokemon.species.speciesId === Species.LANDORUS || pokemon.species.speciesId === Species.KELDEO || pokemon.species.speciesId === Species.MELOETTA || pokemon.species.speciesId === Species.GENESECT) {
            return "battle_legendary_unova";
          }
        if (pokemon.species.speciesId === Species.KYUREM) {
          return "battle_legendary_kyurem";
        }
          if (pokemon.species.speciesId === Species.XERNEAS || pokemon.species.speciesId === Species.YVELTAL || pokemon.species.speciesId === Species.ZYGARDE) {
            return "battle_legendary_xern_yvel";
          }
          if (pokemon.species.speciesId === Species.TAPU_KOKO || pokemon.species.speciesId === Species.TAPU_LELE || pokemon.species.speciesId === Species.TAPU_BULU || pokemon.species.speciesId === Species.TAPU_FINI) {
            return "battle_legendary_tapu";
          }
          if ([ Species.COSMOG, Species.COSMOEM, Species.SOLGALEO, Species.LUNALA ].includes(pokemon.species.speciesId)) {
            return "battle_legendary_sol_lun";
          }
          if (pokemon.species.speciesId === Species.NECROZMA) {
            if (pokemon.getFormKey() === "") {
            return "battle_legendary_sol_lun";
          }
            if (pokemon.getFormKey() === "dusk-mane" || pokemon.getFormKey() === "dawn-wings") {
              return "battle_legendary_dusk_dawn";
            }
            if (pokemon.getFormKey() === "ultra") {
              return "battle_legendary_ultra_nec";
            }
          }
          if ([ Species.NIHILEGO, Species.BUZZWOLE, Species.PHEROMOSA, Species.XURKITREE, Species.CELESTEELA, Species.KARTANA, Species.GUZZLORD, Species.POIPOLE, Species.NAGANADEL, Species.STAKATAKA, Species.BLACEPHALON ].includes(pokemon.species.speciesId)) {
            return "battle_legendary_ub";
          }
          if (pokemon.species.speciesId === Species.ZACIAN || pokemon.species.speciesId === Species.ZAMAZENTA) {
            return "battle_legendary_zac_zam";
          }
          if (pokemon.species.speciesId === Species.GLASTRIER || pokemon.species.speciesId === Species.SPECTRIER) {
            return "battle_legendary_glas_spec";
          }
          if (pokemon.species.speciesId === Species.CALYREX) {
            if (pokemon.getFormKey() === "") {
            return "battle_legendary_calyrex";
          }
            if (pokemon.getFormKey() === "ice" || pokemon.getFormKey() === "shadow") {
              return "battle_legendary_riders";
            }
          }
          if (pokemon.species.speciesId === Species.GALAR_ARTICUNO || pokemon.species.speciesId === Species.GALAR_ZAPDOS || pokemon.species.speciesId === Species.GALAR_MOLTRES) {
            return "battle_legendary_birds_galar";
          }
          if (pokemon.species.speciesId === Species.WO_CHIEN || pokemon.species.speciesId === Species.CHIEN_PAO || pokemon.species.speciesId === Species.TING_LU || pokemon.species.speciesId === Species.CHI_YU) {
            return "battle_legendary_ruinous";
          }
          if (pokemon.species.speciesId === Species.KORAIDON || pokemon.species.speciesId === Species.MIRAIDON) {
            return "battle_legendary_kor_mir";
          }
          if (pokemon.species.speciesId === Species.OKIDOGI || pokemon.species.speciesId === Species.MUNKIDORI || pokemon.species.speciesId === Species.FEZANDIPITI) {
            return "battle_legendary_loyal_three";
          }
          if (pokemon.species.speciesId === Species.OGERPON) {
            return "battle_legendary_ogerpon";
          }
          if (pokemon.species.speciesId === Species.TERAPAGOS) {
            return "battle_legendary_terapagos";
          }
          if (pokemon.species.speciesId === Species.PECHARUNT) {
            return "battle_legendary_pecharunt";
          }
        if (pokemon.species.legendary) {
          return "battle_legendary_res_zek";
        }
        return "battle_legendary_unova";
      }
    }
    }

    if (scene.gameMode.isClassic && this.waveIndex <= 4) {
      return "battle_wild";
    }

    return null;
  }

  randSeedInt(scene: BattleScene, range: integer, min: integer = 0): integer {
    if (range <= 1) {
      return min;
    }
    const tempRngCounter = scene.rngCounter;
    const tempSeedOverride = scene.rngSeedOverride;
    const state = Phaser.Math.RND.state();
    if (this.battleSeedState) {
      Phaser.Math.RND.state(this.battleSeedState);
    } else {
      Phaser.Math.RND.sow([ Utils.shiftCharCodes(this.battleSeed, this.turn << 6) ]);
    }
    scene.rngCounter = this.rngCounter++;
    scene.rngSeedOverride = this.battleSeed;
    const ret = Utils.randSeedInt(range, min);
    this.battleSeedState = Phaser.Math.RND.state();
    Phaser.Math.RND.state(state);
    scene.rngCounter = tempRngCounter;
    scene.rngSeedOverride = tempSeedOverride;
    return ret;
  }

  isStage6RivalWave(): boolean {
    return this.waveIndex % 1000 !== 0 && this.waveIndex % 500 === 0;
  }
}

export class FixedBattle extends Battle {
  constructor(scene: BattleScene, waveIndex: integer, config: FixedBattleConfig) {
    super(scene.gameMode, waveIndex, config.battleType, config.battleType === BattleType.TRAINER ? config.getTrainer(scene) : undefined, config.double, scene);
    if (config.getEnemyParty) {
      this.enemyParty = config.getEnemyParty(scene);
    }
  }
}

type GetTrainerFunc = (scene: BattleScene) => Trainer;
type GetEnemyPartyFunc = (scene: BattleScene) => EnemyPokemon[];

export class FixedBattleConfig {
  public battleType: BattleType;
  public double: boolean;
  public getTrainer: GetTrainerFunc;
  public getEnemyParty: GetEnemyPartyFunc;
  public seedOffsetWaveIndex: integer;

  setBattleType(battleType: BattleType): FixedBattleConfig {
    this.battleType = battleType;
    return this;
  }

  setDouble(double: boolean): FixedBattleConfig {
    this.double = double;
    return this;
  }

  setGetTrainerFunc(getTrainerFunc: GetTrainerFunc): FixedBattleConfig {
    this.getTrainer = getTrainerFunc;
    return this;
  }

  setGetEnemyPartyFunc(getEnemyPartyFunc: GetEnemyPartyFunc): FixedBattleConfig {
    this.getEnemyParty = getEnemyPartyFunc;
    return this;
  }

  setSeedOffsetWave(seedOffsetWaveIndex: integer): FixedBattleConfig {
    this.seedOffsetWaveIndex = seedOffsetWaveIndex;
    return this;
  }
}


/**
 * Helper function to generate a random trainer for evil team trainers and the elite 4/champion
 * @param trainerPool The TrainerType or list of TrainerTypes that can possibly be generated
 * @param randomGender whether or not to randomly (50%) generate a female trainer (for use with evil team grunts)
 * @param seedOffset the seed offset to use for the random generation of the trainer
 * @returns the generated trainer
 */
function getRandomTrainerFunc(trainerPool: (TrainerType | TrainerType[])[], randomGender: boolean = false, seedOffset: number  = 0): GetTrainerFunc {
  return (scene: BattleScene) => {
    const rand = Utils.randSeedInt(trainerPool.length);
    const trainerTypes: TrainerType[] = [];

    scene.executeWithSeedOffset(() => {
    for (const trainerPoolEntry of trainerPool) {
      const trainerType = Array.isArray(trainerPoolEntry)
        ? Utils.randSeedItem(trainerPoolEntry)
        : trainerPoolEntry;
      trainerTypes.push(trainerType);
    }
    }, seedOffset);

    let trainerGender = TrainerVariant.DEFAULT;
    if (randomGender) {
      trainerGender = (Utils.randInt(2) === 0) ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT;
    }

    /* 1/3 chance for evil team grunts to be double battles */
    const evilTeamGrunts = [TrainerType.ROCKET_GRUNT, TrainerType.MAGMA_GRUNT, TrainerType.AQUA_GRUNT, TrainerType.GALACTIC_GRUNT, TrainerType.PLASMA_GRUNT, TrainerType.FLARE_GRUNT];

    return new Trainer(scene, trainerTypes[rand], trainerGender);
  };
}

export interface FixedBattleConfigs {
    [key: integer]: FixedBattleConfig
}

export const BATTLE_WAVES = {
  RIVAL: {
    FIRST: 8,
    SECOND: 15,
    THIRD: 35,
    FOURTH: 55,
    FIFTH: 75,
    FINAL: 110
  },
  GRUNT: {
    FIRST: 45,
    SECOND: 62,
    THIRD: 64
  },
  ADMIN: 66,
  BOSS: {
    FIRST: 70,
    SECOND: 95
  },
  ELITE_FOUR: {
    FIRST: 82,
    SECOND: 84,
    THIRD: 86,
    FOURTH: 88,
    CHAMPION: 90
  }
};

export const TRAINER_TYPES = {
  EVIL_TEAM_GRUNTS: [
  TrainerType.ROCKET_GRUNT,
  TrainerType.MAGMA_GRUNT,
  TrainerType.AQUA_GRUNT,
  TrainerType.GALACTIC_GRUNT,
  TrainerType.PLASMA_GRUNT,
  TrainerType.FLARE_GRUNT,
  TrainerType.AETHER_GRUNT,
  TrainerType.SKULL_GRUNT,
  TrainerType.MACRO_GRUNT
  ],

  EVIL_TEAM_ADMINS: [
      [TrainerType.ARCHER, TrainerType.ARIANA, TrainerType.PROTON, TrainerType.PETREL],
      [TrainerType.TABITHA, TrainerType.COURTNEY],
      [TrainerType.MATT, TrainerType.SHELLY],
      [TrainerType.JUPITER, TrainerType.MARS, TrainerType.SATURN],
      [TrainerType.ZINZOLIN, TrainerType.ROOD],
      [TrainerType.XEROSIC, TrainerType.BRYONY],
      TrainerType.FABA,
      TrainerType.PLUMERIA,
      TrainerType.OLEANA
  ],

  EVIL_TEAM_BOSSES: {
    FIRST: [
      TrainerType.ROCKET_BOSS_GIOVANNI_1,
      TrainerType.MAXIE,
      TrainerType.ARCHIE,
      TrainerType.CYRUS,
      TrainerType.GHETSIS,
      TrainerType.LYSANDRE
    ],
    SECOND: [
      TrainerType.ROCKET_BOSS_GIOVANNI_2,
      TrainerType.MAXIE_2,
      TrainerType.ARCHIE_2,
      TrainerType.CYRUS_2,
      TrainerType.GHETSIS_2,
      TrainerType.LYSANDRE_2,
      TrainerType.LUSAMINE_2,
      TrainerType.GUZMA_2,
      TrainerType.ROSE_2
    ]
  },

  ELITE_FOUR: {
    FIRST: [
      TrainerType.LORELEI,
      TrainerType.WILL,
      TrainerType.SIDNEY,
      TrainerType.AARON,
      TrainerType.SHAUNTAL,
      TrainerType.MALVA,
      TrainerType.HALA,
      TrainerType.MOLAYNE,
      TrainerType.MARNIE_ELITE,
      TrainerType.RIKA,
      TrainerType.CRISPIN
    ],
    SECOND: [
      TrainerType.BRUNO,
      TrainerType.KOGA,
      TrainerType.PHOEBE,
      TrainerType.BERTHA,
      TrainerType.MARSHAL,
      TrainerType.SIEBOLD,
      TrainerType.OLIVIA,
      TrainerType.NESSA_ELITE,
      TrainerType.POPPY,
      TrainerType.AMARYS
    ],
    THIRD: [
      TrainerType.AGATHA,
      TrainerType.BRUNO,
      TrainerType.GLACIA,
      TrainerType.FLINT,
      TrainerType.GRIMSLEY,
      TrainerType.WIKSTROM,
      TrainerType.ACEROLA,
      TrainerType.BEA_ELITE,
        TrainerType.ALLISTER_ELITE,
      TrainerType.LARRY_ELITE,
      TrainerType.LACEY
    ],
    FOURTH: [
      TrainerType.LANCE,
      TrainerType.KAREN,
      TrainerType.DRAKE,
      TrainerType.LUCIAN,
      TrainerType.CAITLIN,
      TrainerType.DRASNA,
      TrainerType.KAHILI,
      TrainerType.RAIHAN_ELITE,
      TrainerType.HASSEL,
      TrainerType.DRAYTON
    ],
    CHAMPION: [
      TrainerType.BLUE,
      TrainerType.RED,
        TrainerType.LANCE_CHAMPION,
      TrainerType.STEVEN,
        TrainerType.WALLACE,
      TrainerType.CYNTHIA,
      TrainerType.ALDER,
        TrainerType.IRIS,
      TrainerType.DIANTHA,
      TrainerType.HAU,
      TrainerType.LEON,
      TrainerType.GEETA,
      TrainerType.NEMONA,
      TrainerType.KIERAN
    ]
  }
};

const createRivalBattle = (rivalStage: number, playerRival?: RivalTrainerType, isCorrupted: boolean = false): FixedBattleConfig =>
  new FixedBattleConfig()
    .setBattleType(BattleType.TRAINER)
    .setGetTrainerFunc(scene => {
      const rivalConfig = playerRival 
        ? getDynamicRivalConfig(rivalStage, playerRival, scene)
        : getDynamicRival(rivalStage, scene.gameData, scene);
      return new Trainer(
        scene,
        TrainerType.DYNAMIC_RIVAL,
        Utils.randSeedInt(2) ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT,
        undefined,
        undefined,
        undefined,
        rivalConfig,
        rivalStage,
        isCorrupted
      );
    });

const createTrainerBattle = (
  trainerPool: (TrainerType | TrainerType[])[],
  seedOffset: number = 0,
  randomGender: boolean = false
): FixedBattleConfig => {
  const config = new FixedBattleConfig()
    .setBattleType(BattleType.TRAINER)
    .setGetTrainerFunc(getRandomTrainerFunc(trainerPool, randomGender));
  
  if (seedOffset) {
    config.setSeedOffsetWave(seedOffset);
  }
  
  return config;
};

const createEliteFourBattle = (
    trainerType: TrainerType | TrainerType[],
    isChampion: boolean = false,
    seedOffset: number = 0
): FixedBattleConfig => {
  const config = new FixedBattleConfig()
      .setBattleType(BattleType.TRAINER)
      .setGetTrainerFunc(scene => {
        const selectedType = Array.isArray(trainerType) 
            ? trainerType[Utils.randSeedInt(trainerType.length)]
            : trainerType;

        const trainer = new Trainer(
            scene,
            selectedType,
            TrainerVariant.DEFAULT,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            scene.gameMode.isNightmare && scene.currentBattle.waveIndex > 400
        );

        const template = getNightmarePartyTemplate(scene.currentBattle.waveIndex, isChampion);
        trainer.setNightmareTemplate(template);

        return trainer;
      });

  if (seedOffset) {
    config.setSeedOffsetWave(seedOffset);
  }

  return config;
};

export interface NightmareRivalInfo {
    stage: number;
    trainerType: RivalTrainerType;
    waveNumber: number;
}

export interface NightmareBattleSeeds {
    baseSeed: number;
    rivalSelection: number;
    rivalPlacement: { [hundred: number]: number };
    rivalPokemon: { [hundred: number]: number };
    eliteFour: {
        rangeSelection: { [hundred: number]: number };
        wavePlacement: { [hundred: number]: number };
        trainerGeneration: { [hundred: number]: number };
    };
    majorBoss: {
        wavePlacement: { [hundred: number]: number };
        bossGeneration: { [hundred: number]: number };
    };
    evilTeam: {
        rangeSelection: { [hundred: number]: number };
        wavePlacement: { [hundred: number]: number };
        gruntPlacement: { [hundred: number]: number };
        adminPlacement: { [hundred: number]: number };
        bossPlacement: { [hundred: number]: number };
        trainerGeneration: { [hundred: number]: number };
    };
    smittySeed: number;
}

function findEliteFourRange(startWave: number, endWave: number, generatedWaves: Set<number>): [number, number[]] {
    
    const validRanges: Array<[number, number[]]> = [];
    
    const segmentBase = Math.floor(startWave / 100) * 100;
    let firstRangeStart = Math.max(segmentBase + 31, Math.ceil(startWave / 10) * 10);

    if (firstRangeStart % 10 === 0) {
        firstRangeStart += 1;
    }
    
    for (let rangeStart = firstRangeStart; rangeStart <= endWave - 9; rangeStart += 10) {
        const availableWaves: number[] = [];
        
        for (let wave = rangeStart; wave < rangeStart + 10; wave++) {
            if (!generatedWaves.has(wave)) {
                availableWaves.push(wave);
            }
        }
        
        if (availableWaves.length >= 5) {
            validRanges.push([rangeStart, availableWaves]);
        }
    }
    
    if (validRanges.length > 0) {
        const selectedIndex = Utils.randSeedInt(validRanges.length);
        const [selectedStart, selectedWaves] = validRanges[selectedIndex];
        return [selectedStart, selectedWaves];
    }
    
    return [-1, []];
}

export let nightmareFixedBattles: FixedBattleConfigs = {};
export let classicFixedBattles: FixedBattleConfigs = {};
export let majorBossWaves: number[] = [];
export let eliteFourWaves: number[] = [];
export let rivalWaves: number[] = [];
export let evilTeamWaves = {
            grunts: [],
            admins: [],
            boss: null
};
export let remainingRivalWaves: number[] = [];
function generateUniqueSeeds(baseSeed: number): NightmareBattleSeeds {
    const usedHashes = new Set<number>();
    
    function getUniqueHash(suffix: string): number {
        let hash: number;
        let attempt = 0;
        do {
            hash = Utils.hashCode(baseSeed.toString() + suffix + (attempt ? `_${attempt}` : ''));
            attempt++;
        } while (usedHashes.has(hash));
        usedHashes.add(hash);
        return hash;
    }

    return {
        baseSeed,
        rivalSelection: getUniqueHash('_rival'),
        rivalPlacement: {
            0: getUniqueHash('_p0'),
            100: getUniqueHash('_p100'),
            200: getUniqueHash('_p200'),
            300: getUniqueHash('_p300'),
            400: getUniqueHash('_p400')
        },
        rivalPokemon: {
            0: getUniqueHash('_rp0'),
            100: getUniqueHash('_rp100'),
            200: getUniqueHash('_rp200'),
            300: getUniqueHash('_rp300'),
            400: getUniqueHash('_rp400')
        },
        eliteFour: {
            rangeSelection: {
                0: getUniqueHash('_e0'),
                100: getUniqueHash('_e100'),
                200: getUniqueHash('_e200'),
                300: getUniqueHash('_e300'),
                400: getUniqueHash('_e400')
            },
            wavePlacement: {
                0: getUniqueHash('_ew0'),
                100: getUniqueHash('_ew100'),
                200: getUniqueHash('_ew200'),
                300: getUniqueHash('_ew300'),
                400: getUniqueHash('_ew400')
            },
            trainerGeneration: {
                0: getUniqueHash('_et0'),
                100: getUniqueHash('_et100'),
                200: getUniqueHash('_et200'),
                300: getUniqueHash('_et300'),
                400: getUniqueHash('_et400')
            }
        },
        majorBoss: {
            wavePlacement: {
                0: getUniqueHash('_mb0'),
                100: getUniqueHash('_mb100'),
                200: getUniqueHash('_mb200'),
                300: getUniqueHash('_mb300'),
                400: getUniqueHash('_mb400')
            },
            bossGeneration: {
                0: getUniqueHash('_mbg0'),
                100: getUniqueHash('_mbg100'),
                200: getUniqueHash('_mbg200'),
                300: getUniqueHash('_mbg300'),
                400: getUniqueHash('_mbg400')
            }
        },
        evilTeam: {
            rangeSelection: {
                0: getUniqueHash('_et0'),
                100: getUniqueHash('_et100'),
                200: getUniqueHash('_et200'),
                300: getUniqueHash('_et300'),
                400: getUniqueHash('_et400'),
            },
            wavePlacement: {
                0: getUniqueHash('_ew0'),
                100: getUniqueHash('_ew100'),
                200: getUniqueHash('_ew200'),
                300: getUniqueHash('_ew300'),
                400: getUniqueHash('_ew400'),
            },
            gruntPlacement: {
                0: getUniqueHash('_eg0'),
                100: getUniqueHash('_eg100'),
                200: getUniqueHash('_eg200'),
                300: getUniqueHash('_eg300'),
                400: getUniqueHash('_eg400'),
            },
            adminPlacement: {
                0: getUniqueHash('_ea0'),
                100: getUniqueHash('_ea100'),
                200: getUniqueHash('_ea200'),
                300: getUniqueHash('_ea300'),
                400: getUniqueHash('_ea400'),
            },
            bossPlacement: {
                0: getUniqueHash('_eb0'),
                100: getUniqueHash('_eb100'),
                200: getUniqueHash('_eb200'),
                300: getUniqueHash('_eb300'),
                400: getUniqueHash('_eb400'),
            },
            trainerGeneration: {
                0: getUniqueHash('_et0'),
                100: getUniqueHash('_et100'),
                200: getUniqueHash('_et200'),
                300: getUniqueHash('_et300'),
                400: getUniqueHash('_et400'),
            }
        },
        smittySeed: getUniqueHash('_smitty')
    };
}

export function setupNightmareFixedBattles(scene: BattleScene) {
    try {
                
        if (!scene.gameData.nightmareBattleSeeds) {
              const baseSeed = Utils.randInt(1000000);
            scene.gameData.nightmareBattleSeeds = generateUniqueSeeds(baseSeed);
        }

        const seeds = scene.gameData.nightmareBattleSeeds;
                
        nightmareFixedBattles = {};
        majorBossWaves = [];
        eliteFourWaves = [];
        rivalWaves = [];
        remainingRivalWaves = [];
        const generatedWaves = new Set<number>();
        const rivalInfo: Record<number, NightmareRivalInfo> = {};

        const getStageRanges = (hundred: number, rivalIndex: number) => {
            const isNewestRival = rivalIndex === Math.floor(hundred / 100);
            const isFinalSegment = hundred === 400;
            return {
                2: { start: hundred + 1, end: hundred + 20 },
                3: { start: hundred + 21, end: hundred + 35 },
                4: { start: hundred + 36, end: hundred + 55 },
                5: { start: hundred + 56, end: hundred + 70 },
                6: { 
                    start: hundred + 71,
                    end: isNewestRival ? (isFinalSegment ? 499 : hundred + 100) : hundred + 95
                }
            };
        };

        

        try {
            scene.resetSeed(seeds.rivalSelection);
            const allRivalTypes = getAllRivalTrainerTypes();
            const selectedRivals: RivalTrainerType[] = [];
            while (selectedRivals.length < 5) {
                const randomRival = allRivalTypes[Utils.randSeedInt(allRivalTypes.length)];
                if (!selectedRivals.includes(randomRival)) {
                    selectedRivals.push(randomRival);
                }
            }
            
            for (let hundred = 0; hundred < 500; hundred += 100) {
                try {
                                        
                    if (hundred === 400) {
                        const wave500 = 500;
                      nightmareFixedBattles[wave500] = createSmittyBattle(scene, seeds.smittySeed);
                      generatedWaves.add(wave500);
                        rivalWaves.push(wave500);
                    }

                    scene.resetSeed(seeds.rivalPlacement[hundred]);
                    
                    const numRivalsToUse = Math.min(Math.floor(hundred / 100) + 1, 5);
                    const rivalsForSegment = selectedRivals.slice(0, numRivalsToUse);
                    scene.resetSeed(seeds.rivalPokemon[hundred]);

                    rivalsForSegment.forEach((rival, rivalIndex) => {
                        const stageRanges = getStageRanges(hundred, rivalIndex);
                        
                        for (let stage = 2; stage <= 6; stage++) {
                            try {
                                const { start: stageStartWave, end: stageEndWave } = stageRanges[stage];
                                const adjustedEndWave = hundred === 400 ? Math.min(stageEndWave, 499) : stageEndWave;
                                let waveNumber: number;
                                let attempts = 0;
                                const maxAttempts = 100;
                                let segmentRival = rivalIndex === Math.floor(hundred / 100);
                                
                                do {
                                    if (stage === 6 && segmentRival) {
                                        waveNumber = adjustedEndWave;
                                    } else {
                                        waveNumber = Utils.randSeedInt(adjustedEndWave - stageStartWave + 1) + stageStartWave;
                                    }
                                    attempts++;
                                    if (attempts >= maxAttempts) {
                                        throw new Error(`Failed to find available wave slot after ${maxAttempts} attempts`);
                                    }
                                } while (generatedWaves.has(waveNumber));
                                generatedWaves.add(waveNumber);
                                rivalWaves.push(waveNumber);

                                const battle = createRivalBattle(stage, rival, segmentRival == false);
                                nightmareFixedBattles[waveNumber] = battle;
                                rivalInfo[waveNumber] = {
                                    stage: stage,
                                    trainerType: rival,
                                    waveNumber: waveNumber
                                };
                            } catch (error) {
                              throw error;
                            }
                        }
                    });

                    try {
                        scene.resetSeed(seeds.eliteFour.rangeSelection[hundred]);
                        const [rangeStart, availableWaves] = findEliteFourRange(hundred, hundred + 99, generatedWaves);
                        
                        if (rangeStart !== -1 && availableWaves.length >= 5) {
                            scene.resetSeed(seeds.eliteFour.wavePlacement[hundred]);
                            const selectedWaves: number[] = [];
                            const wavesCopy = [...availableWaves];
                            
                            for (let i = 0; i < 5; i++) {
                                const index = Utils.randSeedInt(wavesCopy.length);
                                selectedWaves.push(wavesCopy[index]);
                                wavesCopy.splice(index, 1);
                            }

                            selectedWaves.sort((a, b) => a - b);
                            
                            eliteFourWaves.push(...selectedWaves);

                            scene.resetSeed(seeds.eliteFour.trainerGeneration[hundred]);
                            const seedOffset = seeds.eliteFour.trainerGeneration[hundred];
                            
                            nightmareFixedBattles[selectedWaves[0]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.FIRST, false, seedOffset);
                            nightmareFixedBattles[selectedWaves[1]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.SECOND, false, seedOffset);
                            nightmareFixedBattles[selectedWaves[2]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.THIRD, false, seedOffset);
                            nightmareFixedBattles[selectedWaves[3]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.FOURTH, false, seedOffset);
                            nightmareFixedBattles[selectedWaves[4]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, true, seedOffset);

                            selectedWaves.forEach(wave => {
                                generatedWaves.add(wave);
                            });

                            if (hundred === 0 ? true : hundred >= 100) {
                                try {
                                    scene.resetSeed(seeds.majorBoss.wavePlacement[hundred]);
                                    
                                    const availableBossWaves: number[] = [];
                                    const bossStartWave = hundred === 0 ? 50 : Math.max(hundred + 50, hundred);
                                    for (let wave = bossStartWave; wave < hundred + 100 && wave <= 499; wave++) {
                                        if (!generatedWaves.has(wave)) {
                                            availableBossWaves.push(wave);
                                        }
                                    }
                                    if (availableBossWaves.length > 0) {
                                        scene.resetSeed(seeds.majorBoss.bossGeneration[hundred]);
                                        const bossWaveIndex = Utils.randSeedInt(availableBossWaves.length);
                                        const bossWave = availableBossWaves[bossWaveIndex];
                                                                                majorBossWaves.push(bossWave);
                                        generatedWaves.add(bossWave);
                                    }
                                } catch (error) {
                                }
                            }
                        }
                    } catch (error) {
                      throw error;
                    }

                    try {
                    scene.resetSeed(seeds.evilTeam.rangeSelection[hundred]);
                    const [rangeStart, availableWaves] = findEliteFourRange(hundred, hundred + 99, generatedWaves);
                    
                    if (rangeStart !== -1 && availableWaves.length >= 5) {
                        scene.resetSeed(seeds.evilTeam.wavePlacement[hundred]);
                        const selectedWaves: number[] = [];
                        const wavesCopy = [...availableWaves];
                        
                        for (let i = 0; i < 5; i++) {
                            const index = Utils.randSeedInt(wavesCopy.length);
                            selectedWaves.push(wavesCopy[index]);
                            wavesCopy.splice(index, 1);
                        }

                        selectedWaves.sort((a, b) => a - b);

                        scene.resetSeed(seeds.evilTeam.gruntPlacement[hundred]);
                        nightmareFixedBattles[selectedWaves[0]] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_GRUNTS,
                            35,
                            false
                        );
                        evilTeamWaves.grunts.push(selectedWaves[0]);

                        nightmareFixedBattles[selectedWaves[1]] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_GRUNTS,
                            35,
                            false
                        );
                        evilTeamWaves.grunts.push(selectedWaves[1]);

                        scene.resetSeed(seeds.evilTeam.adminPlacement[hundred]);
                        nightmareFixedBattles[selectedWaves[2]] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_ADMINS,
                            35,
                            false
                        );
                        evilTeamWaves.admins.push(selectedWaves[2]);

                        nightmareFixedBattles[selectedWaves[3]] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_ADMINS,
                            35,
                            false
                        );
                        evilTeamWaves.admins.push(selectedWaves[3]);

                        scene.resetSeed(seeds.evilTeam.bossPlacement[hundred]);
                        nightmareFixedBattles[selectedWaves[4]] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND,
                            35,
                            false
                        );
                        evilTeamWaves.boss = selectedWaves[4];

                        selectedWaves.forEach(wave => generatedWaves.add(wave));
                    }
                } catch (error) {
                    throw error;
                }
                } catch (error) {
                  throw error;
                }
            }

             const distributeRemainingRivals = (scene: BattleScene, selectedRivals: RivalTrainerType[], generatedWaves: Set<number>) => {
             
              const allRivalTypes = getAllRivalTrainerTypes();
              const remainingRivals = allRivalTypes.filter(rival => !selectedRivals.includes(rival));
              const rivalsPerSegment = Math.floor(remainingRivals.length / 5);
             
              for (let hundred = 0; hundred < 500; hundred += 100) {
                 
                  const segmentRivals = remainingRivals.splice(0, rivalsPerSegment);
                  scene.resetSeed(seeds.rivalPlacement[hundred]);
                  
                  segmentRivals.forEach(rival => {
                      try {
                         
                          let waveNumber: number;
                          let attempts = 0;
                          const maxAttempts = 100;
                          
                          do {
                              waveNumber = Utils.randSeedInt(100) + hundred + 1;
                              attempts++;
                              if (attempts >= maxAttempts) {
                                  throw new Error(`Failed to find available wave slot for additional rival after ${maxAttempts} attempts`);
                              }
                          } while (generatedWaves.has(waveNumber));

                           const stageRanges = getStageRanges(hundred, 0);
                            let randomRivalStage = 2;
                            for (let s = 2; s <= 6; s++) {
                                if (waveNumber >= stageRanges[s].start && waveNumber <= stageRanges[s].end) {
                                    randomRivalStage = s;
                                    break;
                                }
                            }
                          
                          generatedWaves.add(waveNumber);
                          remainingRivalWaves.push(waveNumber);
                          
                          const battle = createRivalBattle(randomRivalStage, rival, true);
                          nightmareFixedBattles[waveNumber] = battle;
                          
                          rivalInfo[waveNumber] = {
                              stage: randomRivalStage,
                              trainerType: rival,
                              waveNumber: waveNumber
                          };
                          
                         
                          scene.resetSeed(seeds.rivalPokemon[hundred]);
                          
                      } catch (error) {
                          throw error;
                      }
                  });
              }
            };
            distributeRemainingRivals(scene, selectedRivals, generatedWaves);

        } catch (error) {
                        throw error;
        }

        scene.gameMode.battleConfig = nightmareFixedBattles;
        scene.gameData.nightmareRivalInfo = rivalInfo;

        return {
            battles: nightmareFixedBattles,
            rivalInfo: rivalInfo,
            eliteFourWaves: eliteFourWaves,
            rivalWaves: rivalWaves
        };
    } catch (error) {
                throw error;
    }
}

export function createSmittyBattle(scene: BattleScene, seed: number, isChaosMode: boolean = false): FixedBattleConfig {
    
    scene.resetSeed(seed);

   
    const smittyConfig = new TrainerConfig(TrainerType.SMITTY);
    smittyConfig.setName("SMITTY");
   
    smittyConfig.setHasCharSprite();
    smittyConfig.setMoneyMultiplier(2.5);
    const smittyBgmOptions = ["battle_bb_elite", "battle_aether_boss", "battle_aether_boss", "battle_legendary_giratina", "battle_legendary_deoxys", "battle_legendary_kanto", "battle_legendary_regis", "battle_legendary_arceus", "battle_final", "battle_skull_boss", "battle_rocket_boss", "battle_legendary_gro_kyo", "battle_legendary_kyurem", "battle_legendary_origin_forme", "battle_legendary_dusk_dawn", "battle_galactic_boss", "battle_legendary_glas_spec", "battle_legendary_zac_zam"];
    const selectedBgm = smittyBgmOptions[Utils.randSeedInt(smittyBgmOptions.length)];
    smittyConfig.setBattleBgm(selectedBgm);
    smittyConfig.setMixedBattleBgm(selectedBgm);
    smittyConfig.setPartyTemplates(trainerPartyTemplates.CHAMPION);
    smittyConfig.setBoss();
    smittyConfig.setStaticParty();

   
    const smittyDialogues = trainerTypeDialogue[TrainerType.SMITTY]?.[0];
    if (smittyDialogues) {
        const encounterMessages = smittyDialogues.encounter as string[];
        const victoryMessages = smittyDialogues.victory as string[];
        const defeatMessages = smittyDialogues.defeat as string[];

        let randomIndex = Utils.randSeedInt(encounterMessages.length, 0);
        smittyConfig.smittyVariantIndex = randomIndex == 30 || randomIndex == 39 ? 10 : randomIndex;

        smittyConfig.encounterMessages = [encounterMessages[randomIndex]];
        smittyConfig.victoryMessages = [victoryMessages[randomIndex]];
        smittyConfig.defeatMessages = [defeatMessages[randomIndex]];
    }

   
    const usedForms = new Set<string>();
    const specificFormSlots = new Set<number>();
    
    while (specificFormSlots.size < 2) {
        const randomSlot = Utils.randSeedInt(6);
        specificFormSlots.add(randomSlot);
    }

    const bossSlots = new Set<number>();
    const bossCount = isChaosMode ? 3 : 6;
    while (bossSlots.size < bossCount) {
        const randomSlot = Utils.randSeedInt(6);
        bossSlots.add(randomSlot);
    }

   
    for (let i = 0; i < 6; i++) {
        smittyConfig.setPartyMemberFunc(i, (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
            const waveIndex = scene.currentBattle.waveIndex;
            const levels = scene.currentBattle.trainer.getPartyLevels(waveIndex);
            const level = levels[i] || levels[levels.length - 1];

           
            const pokemon = getSpeciesFilterRandomPartyMemberFunc(
                species => species.baseTotal >= 540,
                TrainerSlot.TRAINER
            )(scene, level, strength);

           
            if (specificFormSlots.has(i)) {
                const universalSmittyFormNames = ["smitshade", "smitspect", "smitwraith", "smiternal"];
                let availableForms = universalSmittyFormNames.filter(form => !usedForms.has(form));
                if (availableForms.length === 0) {
                    availableForms = universalSmittyFormNames;
                }
                const selectedForm = availableForms[Utils.randSeedInt(availableForms.length)];
                usedForms.add(selectedForm);
                applyUniversalSmittyForm(selectedForm, pokemon);
                pokemon.formIndex = pokemon.species.forms.length - 1;
                pokemon.generateName();
                pokemon.toggleShadow(false);
            } else {
               
                const universalFormChanges = pokemonFormChanges[Species.NONE] || [];
                let availableUniversalForms = universalFormChanges.filter(fc => {
                    const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                    return trigger && !usedForms.has(trigger.name);
                });
                if (availableUniversalForms.length === 0) {
                    availableUniversalForms = universalFormChanges.filter(fc => {
                        const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                        return trigger;
                    });
                }
                if (availableUniversalForms.length > 0) {
                    const randomUniversalForm = availableUniversalForms[Utils.randSeedInt(availableUniversalForms.length)];
                    const trigger = randomUniversalForm.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                    if (trigger) {
                        usedForms.add(trigger.name);
                        applyUniversalSmittyForm(trigger.name, pokemon);
                        pokemon.formIndex = pokemon.species.forms.length - 1;
                        pokemon.species.forms[pokemon.formIndex].formKey = SpeciesFormKey.SMITTY;
                        pokemon.generateName();
                        pokemon.toggleShadow(false);
                    }
                }
            }

           
            if (bossSlots.has(i)) {
                pokemon.setBoss(true, isChaosMode ? 2 : specificFormSlots.has(i) ? 4 : 3);
            }
            pokemon.initBattleInfo();
            return pokemon;
        });
    }

    return new FixedBattleConfig()
        .setBattleType(BattleType.TRAINER)
        .setGetTrainerFunc(scene => new Trainer(
            scene,
            TrainerType.SMITTY,
            TrainerVariant.DEFAULT,
            undefined,
            undefined,
            undefined,
            smittyConfig,
            6
        ));
};



export const OldClassicFixedBattles: FixedBattleConfigs = {
 
  [BATTLE_WAVES.RIVAL.FIRST]: createRivalBattle(1),
  [BATTLE_WAVES.RIVAL.SECOND]: createRivalBattle(2),
  [BATTLE_WAVES.RIVAL.THIRD]: createRivalBattle(3),
  [BATTLE_WAVES.RIVAL.FOURTH]: createRivalBattle(4),
  [BATTLE_WAVES.RIVAL.FIFTH]: createRivalBattle(5),
  [BATTLE_WAVES.RIVAL.FINAL]: createRivalBattle(6),
 
  [BATTLE_WAVES.GRUNT.FIRST]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_GRUNTS, 0, true),
  [BATTLE_WAVES.GRUNT.SECOND]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_GRUNTS, 35, true),
  [BATTLE_WAVES.GRUNT.THIRD]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_GRUNTS, 35, true),
 
  [BATTLE_WAVES.ADMIN]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_ADMINS, 35, true),

  [BATTLE_WAVES.BOSS.FIRST]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_BOSSES.FIRST, 35),
  [BATTLE_WAVES.BOSS.SECOND]: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND, 35),
 
  [BATTLE_WAVES.ELITE_FOUR.FIRST]: createTrainerBattle(TRAINER_TYPES.ELITE_FOUR.FIRST),
  [BATTLE_WAVES.ELITE_FOUR.SECOND]: createTrainerBattle(TRAINER_TYPES.ELITE_FOUR.SECOND, 182),
  [BATTLE_WAVES.ELITE_FOUR.THIRD]: createTrainerBattle(TRAINER_TYPES.ELITE_FOUR.THIRD, 182),
  [BATTLE_WAVES.ELITE_FOUR.FOURTH]: createTrainerBattle(TRAINER_TYPES.ELITE_FOUR.FOURTH, 182),
  [BATTLE_WAVES.ELITE_FOUR.CHAMPION]: createTrainerBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, 182)
};

export interface FixedBattleSeeds {
    baseSeed: number;
    rivalSelection: number;
    rivalPlacement: number;
    rivalPokemon: number;
    eliteFour: {
        rangeSelection: number;
        wavePlacement: number;
        trainerGeneration: number;
    };
    majorBoss: {
        wavePlacement: number;
        bossGeneration: number;
    };
    evilTeam: {
        rangeSelection: number;
        gruntPlacement: number;
        adminPlacement: number;
        bossPlacement: number;
        trainerGeneration: number;
    };
    smittySeed: number;
}

function generateFixedSeeds(baseSeed: number): FixedBattleSeeds {
    const usedHashes = new Set<number>();
    
    function getUniqueHash(suffix: string): number {
        let hash: number;
        let attempt = 0;
        do {
            hash = Utils.hashCode(baseSeed.toString() + suffix + (attempt ? `_${attempt}` : ''));
            attempt++;
        } while (usedHashes.has(hash));
        usedHashes.add(hash);
        return hash;
    }

    return {
        baseSeed,
        rivalSelection: getUniqueHash('_rival'),
        rivalPlacement: getUniqueHash('_rp'),
        rivalPokemon: getUniqueHash('_rpk'),
        eliteFour: {
            rangeSelection: getUniqueHash('_er'),
            wavePlacement: getUniqueHash('_ew'),
            trainerGeneration: getUniqueHash('_et')
        },
        majorBoss: {
            wavePlacement: getUniqueHash('_mb'),
            bossGeneration: getUniqueHash('_mbg')
        },
        evilTeam: {
            rangeSelection: getUniqueHash('_etr'),
            gruntPlacement: getUniqueHash('_etg'),
            adminPlacement: getUniqueHash('_eta'),
            bossPlacement: getUniqueHash('_etb'),
            trainerGeneration: getUniqueHash('_ett')
        },
        smittySeed: getUniqueHash('_smitty')
    };
}

function getDefeatedDynamicRival(scene: BattleScene): RivalTrainerType | null {
    const defeatedRivals = scene.gameData.defeatedRivals || [];
    if (defeatedRivals.length === 0) {
        return null
    }
    const randomIndex = Utils.randSeedInt(defeatedRivals.length);
    return defeatedRivals[randomIndex];
}

export function setupFixedBattles(scene: BattleScene) {
    try {
        if (!scene.gameData.fixedBattleSeeds) {
            const baseSeed = Utils.randInt(1000000);
            scene.gameData.fixedBattleSeeds = generateFixedSeeds(baseSeed);
        }

        const seeds = scene.gameData.fixedBattleSeeds;
        const fixedBattles: FixedBattleConfigs = {};
        const generatedWaves = new Set<number>();

        const _rivalWaves: number[] = [];
        const _secondaryRivalWaves: number[] = [];
        const _eliteFourWaves: number[] = [];
        const _majorBossWaves: number[] = [];

        const getStageRanges = (rivalIndex: number) => {
            return {
                1: { start: 1, end: 15 },         
                2: { start: 16, end: 30 },        
                3: { start: 31, end: 45 },        
                4: { start: 46, end: 60 },        
                5: { start: 61, end: 75 },        
                6: { start: 76, end: rivalIndex === 0 ? 90 : 89 }
            };
        };

        try {
            scene.resetSeed(seeds.rivalSelection);
            const primaryRival = getDynamicRivalType(1, scene.gameData, false);
            
            let secondaryRivals = [];
            if (scene.gameData.defeatedRivals?.length > 0) {
               
                const defeatedRivals = [...scene.gameData.defeatedRivals];
                while (secondaryRivals.length < 5) {
                    const randomIndex = Utils.randSeedInt(defeatedRivals.length);
                    secondaryRivals.push(defeatedRivals[randomIndex]);
                }
            }
           
            scene.resetSeed(seeds.rivalPokemon);
            for (let stage = 1; stage <= 6; stage++) {
                const { start, end } = getStageRanges(0)[stage];
                let waveNumber: number;
                let attempts = 0;
                const maxAttempts = 100;

                do {
                    if (stage === 6) {
                        waveNumber = 90;
                    } else {
                        waveNumber = Utils.randSeedInt(end - start + 1) + start;
                    }
                    attempts++;
                    if (attempts >= maxAttempts) {
                        throw new Error(`Failed to find available wave slot for primary rival stage ${stage}`);
                    }
                } while (generatedWaves.has(waveNumber));

                generatedWaves.add(waveNumber);
                _rivalWaves.push(waveNumber);
                fixedBattles[waveNumber] = createRivalBattle(stage, primaryRival, false);
            }

            if (secondaryRivals.length > 0) {
                    for (let stage = 2; stage <= 6; stage++) {
                        const { start, end } = getStageRanges(1)[stage];
                        let waveNumber: number;
                        let attempts = 0;
                        const maxAttempts = 100;

                        do {
                            waveNumber = Utils.randSeedInt(end - start + 1) + start;
                            attempts++;
                            if (attempts >= maxAttempts) {
                                throw new Error(`Failed to find available wave slot for secondary rival stage ${stage}`);
                            }
                        } while (generatedWaves.has(waveNumber));

                        generatedWaves.add(waveNumber);
                        _secondaryRivalWaves.push(waveNumber);
                    const secondaryRival = secondaryRivals[stage - 2] || secondaryRivals[0];
                    fixedBattles[waveNumber] = createRivalBattle(stage, secondaryRival, !scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]);
                    }
            }

            scene.resetSeed(seeds.eliteFour.rangeSelection);
            let [rangeStart, availableWaves] = findEliteFourRange(30, 89, generatedWaves);

            if (rangeStart !== -1 && availableWaves.length >= 5) {
                scene.resetSeed(seeds.eliteFour.wavePlacement);
                const selectedWaves: number[] = [];
                const wavesCopy = [...availableWaves];

                for (let i = 0; i < 5; i++) {
                    const index = Utils.randSeedInt(wavesCopy.length);
                    selectedWaves.push(wavesCopy[index]);
                    wavesCopy.splice(index, 1);
                }

                selectedWaves.sort((a, b) => a - b);
                _eliteFourWaves.push(...selectedWaves);

                scene.resetSeed(seeds.eliteFour.trainerGeneration);
                const seedOffset = seeds.eliteFour.trainerGeneration;

                fixedBattles[selectedWaves[0]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.FIRST, false, seedOffset);
                fixedBattles[selectedWaves[1]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.SECOND, false, seedOffset);
                fixedBattles[selectedWaves[2]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.THIRD, false, seedOffset);
                fixedBattles[selectedWaves[3]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.FOURTH, false, seedOffset);
                fixedBattles[selectedWaves[4]] = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, true, seedOffset);

                selectedWaves.forEach(wave => generatedWaves.add(wave));
            }

            scene.resetSeed(seeds.majorBoss.wavePlacement);
            const availableBossWaves: number[] = [];
            
            for (let wave = 40; wave <= 90; wave++) {
                if (!generatedWaves.has(wave)) {
                    availableBossWaves.push(wave);
                }
            }

            if (availableBossWaves.length >= 1) {
                scene.resetSeed(seeds.majorBoss.bossGeneration);
                const firstBossIndex = Utils.randSeedInt(availableBossWaves.length);
                const firstBossWave = availableBossWaves[firstBossIndex];
                _majorBossWaves.push(firstBossWave);
                generatedWaves.add(firstBossWave);

                  const validSecondBossWaves = availableBossWaves.filter(wave => 
                      Math.abs(wave - firstBossWave) >= 20 && !generatedWaves.has(wave)
                  );

                  if (validSecondBossWaves.length > 0) {
                      const secondBossIndex = Utils.randSeedInt(validSecondBossWaves.length);
                      const secondBossWave = validSecondBossWaves[secondBossIndex];
                      _majorBossWaves.push(secondBossWave);
                      generatedWaves.add(secondBossWave);
                }
            }

            function placeEvilBattle(
                scene: BattleScene,
                seed: number,
                minWave: number,
                maxWave: number,
                generatedWaves: Set<number>,
                createBattle: (wave: number) => void,
                maxAttempts = 100
            ): number {
                scene.resetSeed(seed);
                let waveNumber: number;
                let attempts = 0;
                
                do {
                    waveNumber = Utils.randSeedInt(maxWave - minWave + 1) + minWave;
                    attempts++;
                    if (attempts >= maxAttempts) {
                        break;
                    }
                } while (generatedWaves.has(waveNumber));
                
                generatedWaves.add(waveNumber);
                scene.resetSeed(seeds.evilTeam.trainerGeneration);
                createBattle(waveNumber);
                return waveNumber;
            }

           
            const evilTeamWaves = {
                grunts1: [],
                admin1: null,
                boss1: null,
                grunts2: [],
                admin2: null,
                admin3: null,
                boss2: null
            };

           
            for (let i = 0; i < 3; i++) {
                const wave = placeEvilBattle(
                    scene,
                    seeds.evilTeam.gruntPlacement,
                    1,
                    25,
                    generatedWaves,
                    (wave) => {
                        fixedBattles[wave] = createTrainerBattle(
                            TRAINER_TYPES.EVIL_TEAM_GRUNTS,
                            35,
                            false
                        );
                        evilTeamWaves.grunts1.push(wave);
                    }
                );
            }

            evilTeamWaves.admin1 = placeEvilBattle(
                scene,
                seeds.evilTeam.adminPlacement,
                Math.max(...evilTeamWaves.grunts1) + 1,
                35,
                generatedWaves,
                (wave) => {
                    fixedBattles[wave] = createTrainerBattle(
                        TRAINER_TYPES.EVIL_TEAM_ADMINS,
                        35,
                        false
                    );
                }
            );

            evilTeamWaves.boss1 = placeEvilBattle(
                scene,
                seeds.evilTeam.bossPlacement,
                evilTeamWaves.admin1 + 1,
                40,
                generatedWaves,
                (wave) => {
                    fixedBattles[wave] = createTrainerBattle(
                        TRAINER_TYPES.EVIL_TEAM_BOSSES.FIRST,
                        35,
                        false
                    );
                }
            );

            scene.resetSeed(seeds.evilTeam.rangeSelection);
            [rangeStart, availableWaves] = findEliteFourRange(40, 89, generatedWaves);

            if (rangeStart !== -1 && availableWaves.length >= 5) {
                scene.resetSeed(seeds.evilTeam.gruntPlacement);
                const selectedWaves: number[] = [];
                const wavesCopy = [...availableWaves];

               
                for (let i = 0; i < 5; i++) {
                    const index = Utils.randSeedInt(wavesCopy.length);
                    selectedWaves.push(wavesCopy[index]);
                    wavesCopy.splice(index, 1);
                }

               
                selectedWaves.sort((a, b) => a - b);
                fixedBattles[selectedWaves[0]] = createTrainerBattle(
                    TRAINER_TYPES.EVIL_TEAM_GRUNTS,
                    35,
                    false
                );
                evilTeamWaves.grunts2.push(selectedWaves[0]);

                fixedBattles[selectedWaves[1]] = createTrainerBattle(
                    TRAINER_TYPES.EVIL_TEAM_GRUNTS,
                    35,
                    false
                );
                evilTeamWaves.grunts2.push(selectedWaves[1]);

                fixedBattles[selectedWaves[2]] = createTrainerBattle(
                    TRAINER_TYPES.EVIL_TEAM_ADMINS,
                    35,
                    false
                );
                evilTeamWaves.admin2 = selectedWaves[2];

                fixedBattles[selectedWaves[3]] = createTrainerBattle(
                    TRAINER_TYPES.EVIL_TEAM_ADMINS,
                    35,
                    false
                );

                evilTeamWaves.admin3 = selectedWaves[3];

                fixedBattles[selectedWaves[4]] = createTrainerBattle(
                    TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND,
                    35,
                    false
                );
                evilTeamWaves.boss2 = selectedWaves[4];

                selectedWaves.forEach(wave => generatedWaves.add(wave));
            }

           
            scene.gameMode.battleConfig = fixedBattles;
            classicFixedBattles = fixedBattles;
            rivalWaves = _rivalWaves;
            eliteFourWaves = _eliteFourWaves;
            majorBossWaves = _majorBossWaves;

            return {
                battles: fixedBattles,
                rivalWaves,
                eliteFourWaves,
                majorBossWaves
            };

        } catch (error) {
            throw error;
        }

    } catch (error) {
        throw error;
    }
}

function generateCombinedWaveChart(
    rivalWaves: number[],
    secondaryRivalWaves: number[],
    gruntWaves: number[],
    adminWaves: number[],
    bossWaves: number[],
    majorBossWaves: number[],
    eliteFourWaves: number[],
    maxWave: number
): string[] {
    const chart: string[] = [];
    const waveEvents: Map<number, string> = new Map();

    rivalWaves.forEach(wave => waveEvents.set(wave, 'R'));
    secondaryRivalWaves.forEach(wave => waveEvents.set(wave, 'S'));
    gruntWaves.forEach(wave => waveEvents.set(wave, 'G'));
    adminWaves.forEach(wave => waveEvents.set(wave, 'A'));
    bossWaves.forEach(wave => waveEvents.set(wave, 'B'));
    majorBossWaves.forEach(wave => waveEvents.set(wave, 'M'));
    eliteFourWaves.forEach(wave => waveEvents.set(wave, 'E'));

    for (let i = 1; i <= maxWave; i += 10) {
        const row: string[] = [];
        for (let j = i; j < i + 10; j++) {
            row.push(waveEvents.has(j) ? `[${waveEvents.get(j)}]` : '[ ]');
        }
        chart.push(`${i}-${i + 9}: ${row.join(' ')}`);
    }

    return chart;
}

function generateNightmareCombinedWaveChart(
    rivalWaves: number[],
    eliteFourWaves: number[],
    majorBossWaves: number[],
    evilTeamWaves: { grunts: number[], admins: number[], boss: number },
    remainingRivalWaves: number[],
    maxWave: number
): string[] {
    const chart: string[] = [];
    const waveEvents: Map<number, string> = new Map();

    rivalWaves.forEach(wave => waveEvents.set(wave, 'R'));
    eliteFourWaves.forEach(wave => waveEvents.set(wave, 'E'));
    majorBossWaves.forEach(wave => waveEvents.set(wave, 'M'));
    evilTeamWaves.grunts.forEach(wave => waveEvents.set(wave, 'G'));
    evilTeamWaves.admins.forEach(wave => waveEvents.set(wave, 'A'));
    if (evilTeamWaves.boss) {
        waveEvents.set(evilTeamWaves.boss, 'B');
    }
    remainingRivalWaves.forEach(wave => waveEvents.set(wave, 'S'));

    for (let i = 1; i <= maxWave; i += 10) {
        const row: string[] = [];
        for (let j = i; j < i + 10; j++) {
            row.push(waveEvents.has(j) ? `[${waveEvents.get(j)}]` : '[ ]');
        }
        chart.push(`${i}-${i + 9}: ${row.join(' ')}`);
    }

    return chart;
}



function generateWavePlacementChart(waves: number[], eventType: string, maxWave: number): string[] {
    const chart: string[] = [];
    for (let i = 1; i <= maxWave; i += 10) {
        const row: string[] = [];
        for (let j = i; j < i + 10; j++) {
            row.push(waves.includes(j) ? `[${eventType}]` : '[ ]');
        }
        chart.push(`${i}-${i + 9}: ${row.join(' ')}`);
    }
    return chart;
}

export enum PathNodeType {
  WILD_POKEMON,
  TRAINER_BATTLE,
  RIVAL_BATTLE,
  MAJOR_BOSS_BATTLE,
  RECOVERY_BOSS,
  EVIL_BOSS_BATTLE,
  ELITE_FOUR,
  CHAMPION,
  ITEM_GENERAL,
  ADD_POKEMON,
  ITEM_TM,
  ITEM_BERRY,
  MYSTERY_NODE,
  CONVERGENCE_POINT,
  SMITTY_BATTLE,
  EVIL_GRUNT_BATTLE,
  EVIL_ADMIN_BATTLE,
  RAND_PERMA_ITEM,
  PERMA_ITEMS,
  GOLDEN_POKEBALL,
  ROGUE_BALL_ITEMS,
  MASTER_BALL_ITEMS,
  ABILITY_SWITCHERS,
  STAT_SWITCHERS,
  GLITCH_PIECE,
  DNA_SPLICERS,
  MONEY,
  PERMA_MONEY,
  RELEASE_ITEMS,
  MINTS,
  EGG_VOUCHER,
  PP_MAX,
  COLLECTED_TYPE,
  EXP_SHARE,
  TYPE_SWITCHER,
  PASSIVE_ABILITY,
  ANY_TMS,
  CHALLENGE_BOSS,
  CHALLENGE_RIVAL,
  CHALLENGE_EVIL_BOSS,
  CHALLENGE_CHAMPION,
  CHALLENGE_REWARD
}

export interface PathNode {
  id: string;
  wave: number;
  nodeType: PathNodeType;
  battleConfig?: FixedBattleConfig;
  connections: string[];
  previousConnections: string[];
  position: { x: number; y: number };
  isRequired: boolean;
  dynamicMode?: DynamicMode;
  metadata?: {
    rivalStage?: number;
    rivalType?: RivalTrainerType;
    eliteType?: string;
    bossType?: string;
    evilTeamType?: 'grunt' | 'admin' | 'boss';
    dynamicModeCount?: number;
    challengeType?: 'nightmare' | 'nuzlocke' | 'nuzlight';
    challengeNodeIndex?: number;
    totalChallengeNodes?: number;
    challengeReward?: boolean;
    rewardType?: string;
    smittyVariantIndex?: number;
  };
}

export interface PathLayer {
  layerIndex: number;
  startWave: number;
  endWave: number;
  convergenceWave: number;
  nodes: PathNode[];
  branches: number;
}

export interface BattlePath {
  totalWaves: number;
  layers: PathLayer[];
  convergencePoints: number[];
  nodeMap: Map<string, PathNode>;
  waveToNodeMap: Map<number, PathNode[]>;
}

let currentBattlePath: BattlePath | null = null;

function generatePathNodeId(wave: number, branch: number = 0, type: string = ""): string {
  return `${wave}_${branch}_${type}`;
}

function generateNodePositions(nodeCount: number, wave: number = 0): number[] {
  const positions: number[] = [];
  const waveOffset = (wave * 7) % 100;
  
  switch (nodeCount) {
    case 1:
      positions.push((Utils.randSeedInt(4) + waveOffset) % 4);
      break;
    case 2:
      const spacing2 = (Utils.randSeedInt(4) + waveOffset) % 4;
      if (spacing2 === 0) {
        positions.push(0, 3);
      } else if (spacing2 === 1) {
        positions.push(1, 2);
      } else if (spacing2 === 2) {
        positions.push(0, 2);
      } else {
        positions.push(1, 3);
      }
      break;
    case 3:
      const spacing3 = (Utils.randSeedInt(3) + waveOffset) % 3;
      if (spacing3 === 0) {
        positions.push(0, 1, 3);
      } else if (spacing3 === 1) {
        positions.push(0, 2, 3);
      } else {
        positions.push(1, 2, 3);
      }
      break;
    case 4:
      positions.push(0, 1, 2, 3);
      break;
  }
  
  return [...new Set(positions)].sort((a, b) => a - b);
}

function validateNodePositions(nodes: PathNode[], wave: number): boolean {
  const positionsAtWave = nodes
    .filter(n => n.wave === wave)
    .map(n => n.position.x);
  
  const uniquePositions = new Set(positionsAtWave);
  
  if (positionsAtWave.length !== uniquePositions.size) {
    const duplicates = positionsAtWave.filter((pos, index) => 
      positionsAtWave.indexOf(pos) !== index
    );
    console.warn(`❌ Duplicate positions found at wave ${wave}: [${duplicates.join(', ')}]`);
    return false;
  }
  
  return true;
}

function resolvePositionConflicts(layer: PathLayer): void {
  const nodesByWave = new Map<number, PathNode[]>();
  
  for (const node of layer.nodes) {
    if (!nodesByWave.has(node.wave)) {
      nodesByWave.set(node.wave, []);
    }
    nodesByWave.get(node.wave)!.push(node);
  }
  
  for (const [wave, waveNodes] of nodesByWave) {
    const positionMap = new Map<number, PathNode[]>();
    
    for (const node of waveNodes) {
      if (!positionMap.has(node.position.x)) {
        positionMap.set(node.position.x, []);
      }
      positionMap.get(node.position.x)!.push(node);
    }
    
    for (const [position, nodesAtPosition] of positionMap) {
      if (nodesAtPosition.length > 1) {
        const availablePositions = [0, 1, 2, 3].filter(pos => 
          !positionMap.has(pos) || positionMap.get(pos)!.length === 0
        );
        
        for (let i = 1; i < nodesAtPosition.length; i++) {
          if (availablePositions.length > 0) {
            const newPosition = availablePositions.shift()!;
            nodesAtPosition[i].position.x = newPosition;
            nodesAtPosition[i].id = generatePathNodeId(wave, newPosition, PathNodeType[nodesAtPosition[i].nodeType].toLowerCase());
          } 
        }
      }
    }
  }
}

function validateConnectivity(battlePath: BattlePath): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  let isValid = true;
  
  const firstWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));
  
  for (const [wave, nodesAtWave] of battlePath.waveToNodeMap) {
    if (wave === firstWave) {
      continue;
    }
    
    for (const node of nodesAtWave) {
      if (!node.previousConnections || node.previousConnections.length === 0) {
        const issueText = `❌ Node ${node.id} at wave ${wave}:[${node.position.x}] has no incoming connections`;
        issues.push(issueText);
        isValid = false;
      } 
    }
  }
  
  return { isValid, issues };
}

function fixConnectivityIssues(battlePath: BattlePath): void {
  const { isValid, issues } = validateConnectivity(battlePath);
  
  if (isValid) {
    return;
  }
  
  const isChallengeNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_RIVAL ||
           node.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
           node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  const isFirstChallengeNode = (node: PathNode): boolean => {
    return isChallengeNode(node) && node.metadata?.challengeNodeIndex === 1;
  };
  
  const isChallengeRewardNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  const firstWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));
  const allWaves = Array.from(battlePath.waveToNodeMap.keys()).sort((a, b) => a - b);
  
  for (const wave of allWaves) {
    if (wave === firstWave) continue;
    
    const nodesAtWave = battlePath.waveToNodeMap.get(wave) || [];
    
    for (const node of nodesAtWave) {
      if (!node.previousConnections || node.previousConnections.length === 0) {
        
        if (isChallengeRewardNode(node)) {
          continue;
        }
        
        const prevWave = wave - 1;
        let prevNodes = battlePath.waveToNodeMap.get(prevWave) || [];
        
        if (prevNodes.length === 0 && !isChallengeRewardNode(node)) {
          continue;
        }
        
        const validPrevNodes = prevNodes.filter(prevNode => {
          if (isChallengeRewardNode(node)) {
            return isChallengeNode(prevNode) && !isChallengeRewardNode(prevNode);
          }
          
          if (isChallengeNode(node) && !isFirstChallengeNode(node)) {
            return isChallengeNode(prevNode) && !isChallengeRewardNode(prevNode);
          }
          
          return !isChallengeRewardNode(prevNode);
        });
        
        if (validPrevNodes.length > 0) {
          const bestConnector = validPrevNodes.reduce((best, prevNode) => {
            const bestDiff = Math.abs(best.position.x - node.position.x);
            const nodeDiff = Math.abs(prevNode.position.x - node.position.x);
            const bestConnections = best.connections ? best.connections.length : 0;
            const nodeConnections = prevNode.connections ? prevNode.connections.length : 0;
            
            if (nodeConnections < bestConnections) return prevNode;
            if (nodeConnections > bestConnections) return best;
            return nodeDiff < bestDiff ? prevNode : best;
          });
          
          if (!bestConnector.connections.includes(node.id)) {
            addBidirectionalConnection(bestConnector, node);
          } else {
          }
        } else {
        }
      }
    }
  }
  
  const finalValidation = validateConnectivity(battlePath);
  if (!finalValidation.isValid) {
  }
}

function getDynamicModeFromScene(scene: BattleScene, wave?: number): DynamicMode {
  const gameMode = scene.gameMode;
  const currentWave = wave || scene.currentBattle?.waveIndex || 0;
  
  return {
    isNuzlocke: gameMode.isNuzlockeActive ? gameMode.isNuzlockeActive(scene) : gameMode.isNuzlocke,
    isNuzlight: gameMode.isNuzlight,
    isNightmare: gameMode.isNightmare,
    noExpGain: gameMode.noExpGain
  };
}

function createPathNode(
  wave: number, 
  nodeType: PathNodeType, 
  branch: number = 0, 
  battleConfig?: FixedBattleConfig,
  metadata?: any,
  dynamicMode?: DynamicMode
): PathNode {
  const typeString = PathNodeType[nodeType].toLowerCase();
  return {
    id: generatePathNodeId(wave, branch, typeString),
    wave,
    nodeType,
    battleConfig,
    connections: [],
    previousConnections: [],
    position: { x: branch, y: wave },
    isRequired: nodeType === PathNodeType.RIVAL_BATTLE || nodeType === PathNodeType.MAJOR_BOSS_BATTLE || nodeType === PathNodeType.CONVERGENCE_POINT || nodeType === PathNodeType.SMITTY_BATTLE,
    dynamicMode,
    metadata
  };
}

function createConvergencePoint(wave: number): PathNode {
  return createPathNode(wave, PathNodeType.CONVERGENCE_POINT, 0);
}

interface SpecialBattleWaves {
  rivalWaves: number[];
  majorBossWaves: number[];
  recoveryBossWaves: number[];
  eliteFourWaves: number[];
  championWaves: number[];
  smittyWaves: number[];
  evilTeamWaves: {
    grunts: number[];
    admins: number[];
    bosses: number[];
  };
}


function generateSpecialBattleWaves(scene: BattleScene, seeds: any, totalWaves: number, waveOffset: number = 0): SpecialBattleWaves {
  const WAVE_THRESHOLDS = {
    SMALL_RUN: 500,
    MEDIUM_RUN: 1000,
    SEGMENT_SIZE: 500
  };

  const RIVAL_COUNTS = {
    SMALL_RUN: 5,
    MEDIUM_RUN: 10,
    LARGE_RUN: 10
  };

  const STAGE_PERCENTAGES = {
    STAGE_1_END: 0.2,
    STAGE_2_END: 0.35,
    STAGE_3_END: 0.5,
    STAGE_4_END: 0.65,
    STAGE_5_END: 0.8,
    STAGE_6_END: 0.99
  };

  const ELITE_FOUR_RANGES = {
    FIRST_MIN: 0.1,
    FIRST_MAX: 0.3,
    SECOND_MIN: 0.3,
    SECOND_MAX: 0.6,
    THIRD_MIN: 0.6,
    THIRD_MAX: 0.99
  };

  const EVIL_TEAM_RANGES = {
    FIRST_START: 0.01,
    FIRST_END: 0.07,
    ADMIN_START: 0.08,
    ADMIN_END: 0.15,
    BOSS_END: 0.25,
    FALLBACK_BOSS_START: 0.26,
    SECOND_MIN: 0.3,
    SECOND_MAX: 0.6,
    THIRD_MIN: 0.6,
    THIRD_MAX: 0.99
  };

  const MAJOR_BOSS_CONFIG = {
    WAVE_INTERVAL: 10,
    MIN_WAVE_PERCENTAGE: 0.3,
    MAX_WAVE_PERCENTAGE: 0.99,
    MIN_SEPARATION_PERCENTAGE: 0.13,
    FINAL_WAVE_THRESHOLD: 500
  };

  const RECOVERY_BOSS_CONFIG = {
    WAVE_INTERVAL: 30,
    MIN_WAVE_PERCENTAGE: 0.3,
    MAX_WAVE_PERCENTAGE: 0.99,
    MIN_SEPARATION_PERCENTAGE: 0.13,
    FINAL_WAVE_THRESHOLD: 500
  };

  const ATTEMPT_LIMITS = {
    MAX_ATTEMPTS: 100,
    PLACEMENT_ATTEMPTS: 100
  };

  const specialWaves: SpecialBattleWaves = {
    rivalWaves: [],
    majorBossWaves: [],
    recoveryBossWaves: [],
    eliteFourWaves: [],
    championWaves: [],
    smittyWaves: [],
    evilTeamWaves: {
      grunts: [],
      admins: [],
      bosses: []
    }
  };

  const globalGeneratedWaves = new Set<number>();

  const segments: Array<{start: number, end: number, segmentSize: number}> = [];
  
  for (let segmentStart = 1; segmentStart <= totalWaves; segmentStart += WAVE_THRESHOLDS.SEGMENT_SIZE) {
    const segmentEnd = Math.min(segmentStart + WAVE_THRESHOLDS.SEGMENT_SIZE - 1, totalWaves);
    const segmentSize = segmentEnd - segmentStart + 1;
    segments.push({start: segmentStart, end: segmentEnd, segmentSize});
  }

  const generateSegmentSpecialWaves = (segmentIndex: number, segmentStart: number, segmentEnd: number, segmentSize: number) => {
    const segmentWaveOffset = segmentStart - 1 + waveOffset;
    const generatedWaves = new Set<number>();

    const evilTeamThirdMinWave = Math.floor(segmentSize * EVIL_TEAM_RANGES.THIRD_MIN) + segmentWaveOffset;
    const evilTeamThirdMaxWave = Math.floor(segmentSize * EVIL_TEAM_RANGES.THIRD_MAX) + segmentWaveOffset;

    scene.resetSeed(seeds.evilTeam.rangeSelection + segmentWaveOffset + 2000);
    let [evilTeamThirdRangeStart, evilTeamThirdAvailableWaves] = findEliteFourRange(evilTeamThirdMinWave, evilTeamThirdMaxWave, generatedWaves);

    if (evilTeamThirdRangeStart !== -1 && evilTeamThirdAvailableWaves.length >= 10) {
      scene.resetSeed(seeds.evilTeam.gruntPlacement + segmentWaveOffset + 2000);
      
      const evilTeamThirdSelectedWaves = evilTeamThirdAvailableWaves.slice(0, 10);

      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[0]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[1]);
      specialWaves.evilTeamWaves.admins.push(evilTeamThirdSelectedWaves[2]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[3]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[4]);
      specialWaves.evilTeamWaves.admins.push(evilTeamThirdSelectedWaves[5]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[6]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamThirdSelectedWaves[7]);
      specialWaves.evilTeamWaves.admins.push(evilTeamThirdSelectedWaves[8]);
      specialWaves.evilTeamWaves.bosses.push(evilTeamThirdSelectedWaves[9]);

      evilTeamThirdSelectedWaves.forEach(wave => {
        generatedWaves.add(wave);
        globalGeneratedWaves.add(wave);
      });
    }

    scene.resetSeed(seeds.rivalSelection + segmentWaveOffset);
    let allRivalTypes = getAllRivalTrainerTypes ? getAllRivalTrainerTypes() : [];
    
    let numRivals: number;
    let finalWaveRivals: number[] = [];
    
    const isSmallRunSegment = segmentSize <= WAVE_THRESHOLDS.SMALL_RUN;
    const isMediumRunSegment = segmentSize <= WAVE_THRESHOLDS.MEDIUM_RUN;
    
    const segmentFinalWave = segmentEnd + waveOffset;
    const isSegmentBoundary500 = segmentEnd % WAVE_THRESHOLDS.SEGMENT_SIZE === 0;
    const isSegmentBoundary1000 = segmentEnd % WAVE_THRESHOLDS.MEDIUM_RUN === 0;
    
    if (isSmallRunSegment) {
      numRivals = RIVAL_COUNTS.SMALL_RUN;
      if (isSegmentBoundary500 && !isSegmentBoundary1000) {
        finalWaveRivals = [segmentFinalWave];
      }
    } else if (isMediumRunSegment) {
      numRivals = RIVAL_COUNTS.MEDIUM_RUN;
    } else {
      numRivals = RIVAL_COUNTS.LARGE_RUN;
    }

    for (const finalWave of finalWaveRivals) {
      generatedWaves.add(finalWave);
      globalGeneratedWaves.add(finalWave);
      specialWaves.rivalWaves.push(finalWave);
    }

    const getStageRanges = () => {
      return {
        1: { start: Math.floor(segmentSize * EVIL_TEAM_RANGES.FIRST_START) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_1_END) + segmentWaveOffset },
        2: { start: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_1_END) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_2_END) + segmentWaveOffset },
        3: { start: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_2_END) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_3_END) + segmentWaveOffset },
        4: { start: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_3_END) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_4_END) + segmentWaveOffset },
        5: { start: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_4_END) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_5_END) + segmentWaveOffset },
        6: { start: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_5_END) + 1 + segmentWaveOffset, end: Math.floor(segmentSize * STAGE_PERCENTAGES.STAGE_6_END) + segmentWaveOffset }
      };
    };

    const selectedRivals: any[] = [];
    while (selectedRivals.length < numRivals && allRivalTypes.length > 0) {
      const randomIndex = Utils.randSeedInt(allRivalTypes.length);
      const selectedRival = allRivalTypes[randomIndex];
      selectedRivals.push(selectedRival);
      allRivalTypes.splice(randomIndex, 1);
    }

    scene.resetSeed(seeds.rivalPokemon + segmentWaveOffset);
    
    for (let stage = 1; stage <= 6; stage++) {
      for (let rivalIndex = 0; rivalIndex < numRivals; rivalIndex++) {
        const rival = selectedRivals[rivalIndex];
        
        const { start, end } = getStageRanges()[stage];
        let waveNumber: number;
        let attempts = 0;

        do {
          if (stage === 6 && rivalIndex === 0 && finalWaveRivals.includes(segmentFinalWave)) {
            waveNumber = segmentFinalWave;
            break;
          } else {
            waveNumber = Utils.randSeedInt(end - start + 1) + start;
          }
          attempts++;
          if (attempts >= ATTEMPT_LIMITS.MAX_ATTEMPTS) {
            console.warn(`Failed to find available wave slot for rival stage ${stage} in segment ${segmentIndex}`);
            break;
          }
        } while (generatedWaves.has(waveNumber) || globalGeneratedWaves.has(waveNumber));

        if (attempts < ATTEMPT_LIMITS.MAX_ATTEMPTS && !(stage === 6 && rivalIndex === 0 && finalWaveRivals.includes(segmentFinalWave))) {
          generatedWaves.add(waveNumber);
          globalGeneratedWaves.add(waveNumber);
          specialWaves.rivalWaves.push(waveNumber);
        }
      }
    }

    const eliteFourMinWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.FIRST_MIN) + segmentWaveOffset;
    const eliteFourMaxWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.FIRST_MAX) + segmentWaveOffset;
    
    scene.resetSeed(seeds.eliteFour.rangeSelection + segmentWaveOffset);
    let [eliteFourRangeStart, eliteFourAvailableWaves] = findEliteFourRange(eliteFourMinWave, eliteFourMaxWave, generatedWaves);

    if (eliteFourRangeStart !== -1 && eliteFourAvailableWaves.length >= 5) {
      scene.resetSeed(seeds.eliteFour.wavePlacement + segmentWaveOffset);
      const eliteFourSelectedWaves: number[] = [];
      const eliteFourWavesCopy = [...eliteFourAvailableWaves];

      for (let i = 0; i < 5; i++) {
        const index = Utils.randSeedInt(eliteFourWavesCopy.length);
        eliteFourSelectedWaves.push(eliteFourWavesCopy[index]);
        eliteFourWavesCopy.splice(index, 1);
      }

      eliteFourSelectedWaves.sort((a, b) => a - b);
      
      for (let i = 0; i < 4; i++) {
        specialWaves.eliteFourWaves.push(eliteFourSelectedWaves[i]);
        generatedWaves.add(eliteFourSelectedWaves[i]);
        globalGeneratedWaves.add(eliteFourSelectedWaves[i]);
      }
      specialWaves.championWaves.push(eliteFourSelectedWaves[4]);
      generatedWaves.add(eliteFourSelectedWaves[4]);
      globalGeneratedWaves.add(eliteFourSelectedWaves[4]);
    }

    const secondEliteFourMinWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.SECOND_MIN) + segmentWaveOffset;
    const secondEliteFourMaxWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.SECOND_MAX) + segmentWaveOffset;
    
    scene.resetSeed(seeds.eliteFour.rangeSelection + segmentWaveOffset + 1000);
    let [secondEliteFourRangeStart, secondEliteFourAvailableWaves] = findEliteFourRange(secondEliteFourMinWave, secondEliteFourMaxWave, generatedWaves);

    if (secondEliteFourRangeStart !== -1 && secondEliteFourAvailableWaves.length >= 5) {
      scene.resetSeed(seeds.eliteFour.wavePlacement + segmentWaveOffset + 1000);
      const secondEliteFourSelectedWaves: number[] = [];
      const secondEliteFourWavesCopy = [...secondEliteFourAvailableWaves];

      for (let i = 0; i < 5; i++) {
        const index = Utils.randSeedInt(secondEliteFourWavesCopy.length);
        secondEliteFourSelectedWaves.push(secondEliteFourWavesCopy[index]);
        secondEliteFourWavesCopy.splice(index, 1);
      }

      secondEliteFourSelectedWaves.sort((a, b) => a - b);
      
      for (let i = 0; i < 4; i++) {
        specialWaves.eliteFourWaves.push(secondEliteFourSelectedWaves[i]);
        generatedWaves.add(secondEliteFourSelectedWaves[i]);
        globalGeneratedWaves.add(secondEliteFourSelectedWaves[i]);
      }
      specialWaves.championWaves.push(secondEliteFourSelectedWaves[4]);
      generatedWaves.add(secondEliteFourSelectedWaves[4]);
      globalGeneratedWaves.add(secondEliteFourSelectedWaves[4]);
    }

    const thirdEliteFourMinWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.THIRD_MIN) + segmentWaveOffset;
    const thirdEliteFourMaxWave = Math.floor(segmentSize * ELITE_FOUR_RANGES.THIRD_MAX) + segmentWaveOffset;
    
    scene.resetSeed(seeds.eliteFour.rangeSelection + segmentWaveOffset + 2000);
    let [thirdEliteFourRangeStart, thirdEliteFourAvailableWaves] = findEliteFourRange(thirdEliteFourMinWave, thirdEliteFourMaxWave, generatedWaves);

    if (thirdEliteFourRangeStart !== -1 && thirdEliteFourAvailableWaves.length >= 5) {
      scene.resetSeed(seeds.eliteFour.wavePlacement + segmentWaveOffset + 2000);
      const thirdEliteFourSelectedWaves: number[] = [];
      const thirdEliteFourWavesCopy = [...thirdEliteFourAvailableWaves];

      for (let i = 0; i < 5; i++) {
        const index = Utils.randSeedInt(thirdEliteFourWavesCopy.length);
        thirdEliteFourSelectedWaves.push(thirdEliteFourWavesCopy[index]);
        thirdEliteFourWavesCopy.splice(index, 1);
      }

      thirdEliteFourSelectedWaves.sort((a, b) => a - b);
      
      for (let i = 0; i < 4; i++) {
        specialWaves.eliteFourWaves.push(thirdEliteFourSelectedWaves[i]);
        generatedWaves.add(thirdEliteFourSelectedWaves[i]);
        globalGeneratedWaves.add(thirdEliteFourSelectedWaves[i]);
      }
      specialWaves.championWaves.push(thirdEliteFourSelectedWaves[4]);
      generatedWaves.add(thirdEliteFourSelectedWaves[4]);
      globalGeneratedWaves.add(thirdEliteFourSelectedWaves[4]);
    }

    function placeEvilBattle(
      scene: BattleScene,
      seed: number,
      minWave: number,
      maxWave: number,
      generatedWaves: Set<number>,
      maxAttempts = ATTEMPT_LIMITS.PLACEMENT_ATTEMPTS
    ): number {
      scene.resetSeed(seed);
      let waveNumber: number;
      let attempts = 0;
      
      do {
        waveNumber = Utils.randSeedInt(maxWave - minWave + 1) + minWave;
        attempts++;
        if (attempts >= maxAttempts) {
          return -1;
        }
      } while (generatedWaves.has(waveNumber) || globalGeneratedWaves.has(waveNumber));
      
      return waveNumber;
    }

    const evilFirstStart = Math.floor(segmentSize * EVIL_TEAM_RANGES.FIRST_START) + segmentWaveOffset;
    const evilFirstEnd = Math.floor(segmentSize * EVIL_TEAM_RANGES.FIRST_END) + segmentWaveOffset;

    const firstRoundGrunts: number[] = [];
    for (let i = 0; i < 3; i++) {
      const wave = placeEvilBattle(scene, seeds.evilTeam.gruntPlacement + segmentWaveOffset + i, evilFirstStart, evilFirstEnd, generatedWaves);
      if (wave !== -1) {
        specialWaves.evilTeamWaves.grunts.push(wave);
        firstRoundGrunts.push(wave);
        generatedWaves.add(wave);
        globalGeneratedWaves.add(wave);
      }
    }

    const adminStart = firstRoundGrunts.length > 0 ? 
      Math.max(...firstRoundGrunts) + 1 : 
      Math.floor(segmentSize * EVIL_TEAM_RANGES.ADMIN_START) + segmentWaveOffset;
    const adminEnd = Math.floor(segmentSize * EVIL_TEAM_RANGES.ADMIN_END) + segmentWaveOffset;
    const adminWave = placeEvilBattle(scene, seeds.evilTeam.adminPlacement + segmentWaveOffset, adminStart, adminEnd, generatedWaves);
    
    if (adminWave !== -1) {
      specialWaves.evilTeamWaves.admins.push(adminWave);
      generatedWaves.add(adminWave);
      globalGeneratedWaves.add(adminWave);

      const bossStart = adminWave + 1;
      const bossEnd = Math.floor(segmentSize * EVIL_TEAM_RANGES.BOSS_END) + segmentWaveOffset;
      const bossWave = placeEvilBattle(scene, seeds.evilTeam.bossPlacement + segmentWaveOffset, bossStart, bossEnd, generatedWaves);
      
      if (bossWave !== -1) {
        specialWaves.evilTeamWaves.bosses.push(bossWave);
        generatedWaves.add(bossWave);
        globalGeneratedWaves.add(bossWave);
      }
    } else {
      const fallbackBossStart = Math.floor(segmentSize * EVIL_TEAM_RANGES.FALLBACK_BOSS_START) + segmentWaveOffset;
      const fallbackBossEnd = Math.floor(segmentSize * EVIL_TEAM_RANGES.BOSS_END) + segmentWaveOffset;
      const fallbackBossWave = placeEvilBattle(scene, seeds.evilTeam.bossPlacement + segmentWaveOffset + 100, fallbackBossStart, fallbackBossEnd, generatedWaves);
      
      if (fallbackBossWave !== -1) {
        specialWaves.evilTeamWaves.bosses.push(fallbackBossWave);
        generatedWaves.add(fallbackBossWave);
        globalGeneratedWaves.add(fallbackBossWave);
      }
    }

    scene.resetSeed(seeds.majorBoss.wavePlacement + segmentWaveOffset);
    const majorBossMinWave = Math.floor(segmentSize * MAJOR_BOSS_CONFIG.MIN_WAVE_PERCENTAGE) + segmentWaveOffset;
    const majorBossMaxWave = Math.floor(segmentSize * MAJOR_BOSS_CONFIG.MAX_WAVE_PERCENTAGE) + segmentWaveOffset;
    const availableBossWaves: number[] = [];
    
    for (let wave = majorBossMinWave; wave <= majorBossMaxWave; wave++) {
      if (!generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)) {
        availableBossWaves.push(wave);
      }
    }

    if (availableBossWaves.length >= 1) {
      scene.resetSeed(seeds.majorBoss.bossGeneration + segmentWaveOffset);
      const firstBossIndex = Utils.randSeedInt(availableBossWaves.length);
      const firstBossWave = availableBossWaves[firstBossIndex];
      specialWaves.majorBossWaves.push(firstBossWave);
      generatedWaves.add(firstBossWave);
      globalGeneratedWaves.add(firstBossWave);

      const minSeparation = Math.max(MAJOR_BOSS_CONFIG.WAVE_INTERVAL, Math.floor(segmentSize * MAJOR_BOSS_CONFIG.MIN_SEPARATION_PERCENTAGE));
      const validSecondBossWaves = availableBossWaves.filter(wave => 
        Math.abs(wave - firstBossWave) >= minSeparation && !generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)
      );

      if (validSecondBossWaves.length > 0) {
        const secondBossIndex = Utils.randSeedInt(validSecondBossWaves.length);
        const secondBossWave = validSecondBossWaves[secondBossIndex];
        specialWaves.majorBossWaves.push(secondBossWave);
        generatedWaves.add(secondBossWave);
        globalGeneratedWaves.add(secondBossWave);

        const validThirdBossWaves = availableBossWaves.filter(wave => 
          Math.abs(wave - firstBossWave) >= minSeparation && 
          Math.abs(wave - secondBossWave) >= minSeparation && 
          !generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)
        );

        if (validThirdBossWaves.length > 0) {
          const thirdBossIndex = Utils.randSeedInt(validThirdBossWaves.length);
          const thirdBossWave = validThirdBossWaves[thirdBossIndex];
          specialWaves.majorBossWaves.push(thirdBossWave);
          generatedWaves.add(thirdBossWave);
          globalGeneratedWaves.add(thirdBossWave);

          const validFourthBossWaves = availableBossWaves.filter(wave => 
            Math.abs(wave - firstBossWave) >= minSeparation && 
            Math.abs(wave - secondBossWave) >= minSeparation && 
            Math.abs(wave - thirdBossWave) >= minSeparation && 
            !generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)
          );

          if (validFourthBossWaves.length > 0) {
            const fourthBossIndex = Utils.randSeedInt(validFourthBossWaves.length);
            const fourthBossWave = validFourthBossWaves[fourthBossIndex];
            specialWaves.majorBossWaves.push(fourthBossWave);
            generatedWaves.add(fourthBossWave);
            globalGeneratedWaves.add(fourthBossWave);

            const validFifthBossWaves = availableBossWaves.filter(wave => 
              Math.abs(wave - firstBossWave) >= minSeparation && 
              Math.abs(wave - secondBossWave) >= minSeparation && 
              Math.abs(wave - thirdBossWave) >= minSeparation && 
              Math.abs(wave - fourthBossWave) >= minSeparation && 
              !generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)
            );

            if (validFifthBossWaves.length > 0) {
              const fifthBossIndex = Utils.randSeedInt(validFifthBossWaves.length);
              const fifthBossWave = validFifthBossWaves[fifthBossIndex];
              specialWaves.majorBossWaves.push(fifthBossWave);
              generatedWaves.add(fifthBossWave);
              globalGeneratedWaves.add(fifthBossWave);
            }
          }
        }
      }
    }

    if (segmentSize >= MAJOR_BOSS_CONFIG.FINAL_WAVE_THRESHOLD && segmentWaveOffset === waveOffset) {
      const finalWave = segmentEnd + waveOffset;
      if (!specialWaves.rivalWaves.includes(finalWave)) {
        specialWaves.majorBossWaves.push(finalWave);
        globalGeneratedWaves.add(finalWave);
      }
    }

    const evilTeamSecondMinWave = Math.floor(segmentSize * EVIL_TEAM_RANGES.SECOND_MIN) + segmentWaveOffset;
    const evilTeamSecondMaxWave = Math.floor(segmentSize * EVIL_TEAM_RANGES.SECOND_MAX) + segmentWaveOffset;

    scene.resetSeed(seeds.evilTeam.rangeSelection + segmentWaveOffset);
    let [evilTeamRangeStart, evilTeamAvailableWaves] = findEliteFourRange(evilTeamSecondMinWave, evilTeamSecondMaxWave, generatedWaves);

    if (evilTeamRangeStart !== -1 && evilTeamAvailableWaves.length >= 5) {
      scene.resetSeed(seeds.evilTeam.gruntPlacement + segmentWaveOffset);
      const evilTeamSelectedWaves: number[] = [];
      const evilTeamWavesCopy = [...evilTeamAvailableWaves];

      for (let i = 0; i < 5; i++) {
        const index = Utils.randSeedInt(evilTeamWavesCopy.length);
        evilTeamSelectedWaves.push(evilTeamWavesCopy[index]);
        evilTeamWavesCopy.splice(index, 1);
      }

      evilTeamSelectedWaves.sort((a, b) => a - b);

      specialWaves.evilTeamWaves.grunts.push(evilTeamSelectedWaves[0]);
      specialWaves.evilTeamWaves.grunts.push(evilTeamSelectedWaves[1]);
      specialWaves.evilTeamWaves.admins.push(evilTeamSelectedWaves[2]);
      specialWaves.evilTeamWaves.admins.push(evilTeamSelectedWaves[3]);
      specialWaves.evilTeamWaves.bosses.push(evilTeamSelectedWaves[4]);

      evilTeamSelectedWaves.forEach(wave => {
        generatedWaves.add(wave);
        globalGeneratedWaves.add(wave);
      });
    }



    for (let wave = RECOVERY_BOSS_CONFIG.WAVE_INTERVAL + segmentWaveOffset; wave <= segmentEnd + waveOffset; wave += RECOVERY_BOSS_CONFIG.WAVE_INTERVAL) {
      if (wave % RECOVERY_BOSS_CONFIG.WAVE_INTERVAL === 0 && !generatedWaves.has(wave) && !globalGeneratedWaves.has(wave)) {
        specialWaves.recoveryBossWaves.push(wave);
        generatedWaves.add(wave);
        globalGeneratedWaves.add(wave);
      }
    }

    const finalWave = segmentEnd + waveOffset;
    if (finalWave % 1000 === 0) {
      specialWaves.smittyWaves.push(finalWave);
      generatedWaves.add(finalWave);
      globalGeneratedWaves.add(finalWave);
    }
  };

  segments.forEach((segment, index) => {
    generateSegmentSpecialWaves(index, segment.start, segment.end, segment.segmentSize);
  });

  return specialWaves;
}

interface WaveRange {
  start: number;
  end: number;
  probabilities: { [key in PathNodeType]?: number };
  dynamicMode?: DynamicMode;
}

interface NodeGenerationResult {
  nodeType: PathNodeType;
  battleConfig?: FixedBattleConfig;
  dynamicMode?: DynamicMode;
}



function getWaveRangeConfig(wave: number, dynamicMode?: DynamicMode): WaveRange {
  const configs: WaveRange[] = [
    {
      start: 1,
      end: 10000000,
      probabilities: {
        [PathNodeType.WILD_POKEMON]: 1000,
        [PathNodeType.TRAINER_BATTLE]: 1000,
        [PathNodeType.ITEM_BERRY]: 70,
        [PathNodeType.MONEY]: 70,
        [PathNodeType.MAJOR_BOSS_BATTLE]: 15,
        [PathNodeType.MYSTERY_NODE]: 35,
        [PathNodeType.MINTS]: 35,
        [PathNodeType.PP_MAX]: 35,
        [PathNodeType.ROGUE_BALL_ITEMS]: 5,
        [PathNodeType.COLLECTED_TYPE]: 60,
        [PathNodeType.ITEM_GENERAL]: 35,
        [PathNodeType.ABILITY_SWITCHERS]: 35,
        [PathNodeType.TYPE_SWITCHER]: 60,
        [PathNodeType.PASSIVE_ABILITY]: 35,
        [PathNodeType.EGG_VOUCHER]: 35,
        [PathNodeType.RELEASE_ITEMS]: 35,
        [PathNodeType.RAND_PERMA_ITEM]: 5,
        [PathNodeType.PERMA_ITEMS]: 3,
        [PathNodeType.PERMA_MONEY]: 25,
        [PathNodeType.GOLDEN_POKEBALL]: 1,
        [PathNodeType.MASTER_BALL_ITEMS]: 1,
        [PathNodeType.GLITCH_PIECE]: 70,
        [PathNodeType.EXP_SHARE]: 25,
        [PathNodeType.DNA_SPLICERS]: 25,
        [PathNodeType.ANY_TMS]: 35,
        [PathNodeType.ADD_POKEMON]: 25,
        [PathNodeType.STAT_SWITCHERS]: 35,
        [PathNodeType.RECOVERY_BOSS]: 15,
        [PathNodeType.ITEM_TM]: 60,
      }
    }
    // },
    // {
    //   start: 21,
    //   end: 50,
    //   probabilities: {
    //     [PathNodeType.WILD_POKEMON]: 22,
    //     [PathNodeType.TRAINER_BATTLE]: 18,
    //     [PathNodeType.ITEM_GENERAL]: 10,
    //     [PathNodeType.ADD_POKEMON]: 7,
    //     [PathNodeType.ITEM_TM]: 6,
    //     [PathNodeType.MYSTERY_NODE]: 4,
    //     [PathNodeType.MONEY]: 7,
    //     [PathNodeType.GOLDEN_POKEBALL]: 4,
    //     [PathNodeType.MINTS]: 3,
    //     [PathNodeType.EGG_VOUCHER]: 3,
    //     [PathNodeType.PP_MAX]: 2,
    //     [PathNodeType.ABILITY_SWITCHERS]: 1,
    //     [PathNodeType.COLLECTED_TYPE]: 1,
    //     [PathNodeType.EXP_SHARE]: 6,
    //     [PathNodeType.TYPE_SWITCHER]: 3,
    //     [PathNodeType.PASSIVE_ABILITY]: 2,
    //     [PathNodeType.ANY_TMS]: 1
    //   }
    // },
    // {
    //   start: 51,
    //   end: 70,
    //   probabilities: {
    //     [PathNodeType.WILD_POKEMON]: 18,
    //     [PathNodeType.TRAINER_BATTLE]: 16,
    //     [PathNodeType.ELITE_FOUR]: 11,
    //     [PathNodeType.ITEM_GENERAL]: 9,
    //     [PathNodeType.ADD_POKEMON]: 7,
    //     [PathNodeType.ITEM_TM]: 5,
    //     [PathNodeType.MYSTERY_NODE]: 3,
    //     [PathNodeType.MONEY]: 5,
    //     [PathNodeType.GOLDEN_POKEBALL]: 3,
    //     [PathNodeType.ROGUE_BALL_ITEMS]: 3,
    //     [PathNodeType.MINTS]: 3,
    //     [PathNodeType.PP_MAX]: 2,
    //     [PathNodeType.ABILITY_SWITCHERS]: 2,
    //     [PathNodeType.COLLECTED_TYPE]: 1,
    //     [PathNodeType.EXP_SHARE]: 5,
    //     [PathNodeType.TYPE_SWITCHER]: 3,
    //     [PathNodeType.PASSIVE_ABILITY]: 3,
    //     [PathNodeType.ANY_TMS]: 1
    //   }
    // },
    // {
    //   start: 55,
    //   end: 60,
    //   dynamicMode: { isNuzlocke: true },
    //   probabilities: {
    //     [PathNodeType.WILD_POKEMON]: 30,
    //     [PathNodeType.TRAINER_BATTLE]: 18,
    //     [PathNodeType.ITEM_GENERAL]: 13,
    //     [PathNodeType.MYSTERY_NODE]: 7,
    //     [PathNodeType.MONEY]: 4,
    //     [PathNodeType.RELEASE_ITEMS]: 7,
    //     [PathNodeType.MINTS]: 3,
    //     [PathNodeType.PP_MAX]: 3,
    //     [PathNodeType.EGG_VOUCHER]: 3,
    //     [PathNodeType.EXP_SHARE]: 6,
    //     [PathNodeType.TYPE_SWITCHER]: 3,
    //     [PathNodeType.PASSIVE_ABILITY]: 2,
    //     [PathNodeType.ANY_TMS]: 1
    //   }
    // },
    // {
    //   start: 71,
    //   end: 99,
    //   probabilities: {
    //     [PathNodeType.WILD_POKEMON]: 13,
    //     [PathNodeType.TRAINER_BATTLE]: 10,
    //     [PathNodeType.ELITE_FOUR]: 11,
    //     [PathNodeType.EVIL_BOSS_BATTLE]: 7,
    //     [PathNodeType.ITEM_GENERAL]: 7,
    //     [PathNodeType.ADD_POKEMON]: 5,
    //     [PathNodeType.ITEM_TM]: 3,
    //     [PathNodeType.MYSTERY_NODE]: 3,
    //     [PathNodeType.MONEY]: 4,
    //     [PathNodeType.PERMA_MONEY]: 3,
    //     [PathNodeType.GOLDEN_POKEBALL]: 4,
    //     [PathNodeType.ROGUE_BALL_ITEMS]: 3,
    //     [PathNodeType.MASTER_BALL_ITEMS]: 3,
    //     [PathNodeType.ABILITY_SWITCHERS]: 3,
    //     [PathNodeType.GLITCH_PIECE]: 2,
    //     [PathNodeType.DNA_SPLICERS]: 2,
    //     [PathNodeType.MINTS]: 2,
    //     [PathNodeType.PP_MAX]: 3,
    //     [PathNodeType.COLLECTED_TYPE]: 2,
    //     [PathNodeType.EXP_SHARE]: 4,
    //     [PathNodeType.TYPE_SWITCHER]: 3,
    //     [PathNodeType.PASSIVE_ABILITY]: 3,
    //     [PathNodeType.ANY_TMS]: 2
    //   }
    // },
    // {
    //   start: 100,
    //   end: 110,
    //   probabilities: {
    //     [PathNodeType.ELITE_FOUR]: 18,
    //     [PathNodeType.CHAMPION]: 9,
    //     [PathNodeType.MAJOR_BOSS_BATTLE]: 9,
    //     [PathNodeType.TRAINER_BATTLE]: 7,
    //     [PathNodeType.ADD_POKEMON]: 5,
    //     [PathNodeType.ITEM_TM]: 4,
    //     [PathNodeType.MYSTERY_NODE]: 3,
    //     [PathNodeType.RAND_PERMA_ITEM]: 7,
    //     [PathNodeType.PERMA_MONEY]: 4,
    //     [PathNodeType.MASTER_BALL_ITEMS]: 5,
    //     [PathNodeType.GLITCH_PIECE]: 3,
    //     [PathNodeType.DNA_SPLICERS]: 3,
    //     [PathNodeType.PP_MAX]: 3,
    //     [PathNodeType.COLLECTED_TYPE]: 3,
    //     [PathNodeType.ABILITY_SWITCHERS]: 2,
    //     [PathNodeType.MINTS]: 2,
    //     [PathNodeType.EXP_SHARE]: 5,
    //     [PathNodeType.TYPE_SWITCHER]: 4,
    //     [PathNodeType.PASSIVE_ABILITY]: 4,
    //     [PathNodeType.ANY_TMS]: 1
    //   }
    // },
    // {
    //   start: 111,
    //   end: 150,
    //   probabilities: {
    //     [PathNodeType.ELITE_FOUR]: 13,
    //     [PathNodeType.CHAMPION]: 10,
    //     [PathNodeType.MAJOR_BOSS_BATTLE]: 7,
    //     [PathNodeType.EVIL_BOSS_BATTLE]: 5,
    //     [PathNodeType.TRAINER_BATTLE]: 4,
    //     [PathNodeType.ADD_POKEMON]: 4,
    //     [PathNodeType.ITEM_TM]: 3,
    //     [PathNodeType.MYSTERY_NODE]: 2,
    //     [PathNodeType.RAND_PERMA_ITEM]: 9,
    //     [PathNodeType.PERMA_MONEY]: 7,
    //     [PathNodeType.MASTER_BALL_ITEMS]: 7,
    //     [PathNodeType.GLITCH_PIECE]: 5,
    //     [PathNodeType.DNA_SPLICERS]: 5,
    //     [PathNodeType.RELEASE_ITEMS]: 3,
    //     [PathNodeType.PP_MAX]: 2,
    //     [PathNodeType.COLLECTED_TYPE]: 1,
    //     [PathNodeType.EXP_SHARE]: 6,
    //     [PathNodeType.TYPE_SWITCHER]: 5,
    //     [PathNodeType.PASSIVE_ABILITY]: 5,
    //     [PathNodeType.ANY_TMS]: 3
    //   }
    // }
  ];

  for (const config of configs) {
    if (wave >= config.start && wave <= config.end) {
      if (config.dynamicMode && dynamicMode) {
        const matches = Object.entries(config.dynamicMode).every(([key, value]) => 
          dynamicMode[key as keyof DynamicMode] === value
        );
        if (matches) {
          return config;
        }
      } else if (!config.dynamicMode) {
        return config;
      }
    }
  }

  return configs[0];
}

function generateChallengeRanges(maxWave: number, waveOffset: number = 0): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  
  let currentStart = 50 + waveOffset;
  let rangeIndex = 0;
  
  while (currentStart < maxWave) {
    let rangeSize: number;
    
    if (rangeIndex === 0) {
      rangeSize = 50;
    } else if (rangeIndex === 1) {
      rangeSize = 75;
    } else {
      rangeSize = rangeIndex % 2 === 0 ? 50 : 75;
    }
    
    const currentEnd = Math.min(currentStart + rangeSize, maxWave);
    
    if (currentEnd > currentStart) {
      ranges.push({ start: currentStart, end: currentEnd });
    }
    
    currentStart = currentEnd;
    rangeIndex++;
  }
  
  return ranges;
}

function getChallengeRangeForWave(wave: number, maxWave: number, waveOffset: number = 0): { start: number; end: number } | null {
  const ranges = generateChallengeRanges(maxWave, waveOffset);
  
  for (const range of ranges) {
    if (wave >= range.start && wave <= range.end) {
      return range;
    }
  }
  
  return null;
}

function getChallengeRangeIndex(rangeStart: number, maxWave: number, waveOffset: number = 0): number {
  const ranges = generateChallengeRanges(maxWave, waveOffset);
  
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i].start === rangeStart) {
      return i;
    }
  }
  
  return 0;
}

function calculateAdditionalPropertiesCount(rangeStart: number, maxWave: number, waveOffset: number = 0): number {
  const rangeIndex = getChallengeRangeIndex(rangeStart, maxWave, waveOffset);
  return Math.max(0, rangeIndex - 1);
}

function createPathLayer(
  scene: BattleScene,
  layerIndex: number,
  startWave: number,
  endWave: number,
  convergenceWave: number,
  seeds: any,
  rivalWaves: number[],
  bossWaves: number[],
  specialWaves?: SpecialBattleWaves,
  totalWaves?: number,
  globalRivalAssignments?: Map<number, { stage: number; rival: any }>,
  globalChallengeRanges?: Set<number>
): PathLayer {
  const globalStartWave = Math.min(...(specialWaves?.rivalWaves || [startWave]));
  const waveOffset = globalStartWave > 1 ? globalStartWave - 1 : 0;
  const CHALLENGE_RANGES = generateChallengeRanges(totalWaves || 500, waveOffset);

  const LAYER_CONFIG = {
    DEFAULT_BRANCHES: 3,
    MIN_RANGE_SIZE: 5,
    CHALLENGE_BRANCH_FIRST: 2,
    CHALLENGE_BRANCH_OTHER: 3,
    SEED_MULTIPLIER: 7919
  };

  const NODE_GENERATION = {
    SINGLE_NODE_THRESHOLD: 2,
    TWO_NODE_THRESHOLD: 150,
    THREE_NODE_THRESHOLD: 700,
    MAX_ATTEMPTS: 100
  };

  const layer: PathLayer = {
    layerIndex,
    startWave,
    endWave,
    convergenceWave,
    nodes: [],
    branches: LAYER_CONFIG.DEFAULT_BRANCHES
  };

  const waveNodeTracker = new Map<number, Set<number>>();
  
  scene.resetSeed(seeds.baseSeed + layerIndex);

  if (specialWaves) {
    const allSpecialWaves = new Map<number, { type: PathNodeType; config?: FixedBattleConfig; metadata?: any; dynamicMode?: DynamicMode }>();
    
    scene.resetSeed(seeds.rivalSelection);
    const primaryRival = getDynamicRivalType ? getDynamicRivalType(1, scene.gameData, false) : null;
    
    let rivalCounter = 0;
    let eliteFourCounter = 0;
    let totalEliteFourWaves = specialWaves.eliteFourWaves.length;

    specialWaves.rivalWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const assignment = globalRivalAssignments?.get(wave);
      const rivalStage = assignment?.stage || Math.min(6, Math.floor(wave / 50) + 1);
      const rivalType = assignment?.rival || primaryRival;
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.RIVAL_BATTLE,
        config: createRivalBattle(rivalStage, rivalType, false),
        metadata: { 
          rivalStage, 
          rivalType,
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
      rivalCounter++;
    });

    specialWaves.eliteFourWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const eliteFourTypes = [
        TRAINER_TYPES.ELITE_FOUR.FIRST,
        TRAINER_TYPES.ELITE_FOUR.SECOND,
        TRAINER_TYPES.ELITE_FOUR.THIRD,
        TRAINER_TYPES.ELITE_FOUR.FOURTH
      ];
      const trainerType = eliteFourTypes[eliteFourCounter % 4];
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      const globalEliteFourIndex = specialWaves.eliteFourWaves.indexOf(wave);
      const isLastEliteFour = globalEliteFourIndex === totalEliteFourWaves - 1;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.ELITE_FOUR,
        config: createEliteFourBattle(trainerType, false, seeds.baseSeed),
        metadata: { 
          eliteType: ['first', 'second', 'third', 'fourth'][eliteFourCounter % 4],
          dynamicModeCount: (dynamicModeCount > 0 && isLastEliteFour) ? dynamicModeCount : undefined
        },
        dynamicMode
      });
      eliteFourCounter++;
    });

    specialWaves.championWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.CHAMPION,
        config: createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, true, seeds.baseSeed),
        metadata: {
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.majorBossWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.MAJOR_BOSS_BATTLE,
        metadata: {
          bossType: 'major',
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.recoveryBossWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.RECOVERY_BOSS,
        metadata: {
          bossType: 'recovery',
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.evilTeamWaves.grunts.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.EVIL_GRUNT_BATTLE,
        config: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_GRUNTS, 35, false),
        metadata: { 
          evilTeamType: 'grunt',
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.evilTeamWaves.admins.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.EVIL_ADMIN_BATTLE,
        config: createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_ADMINS, 35, false),
        metadata: { 
          evilTeamType: 'admin',
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.evilTeamWaves.bosses.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.EVIL_BOSS_BATTLE,
        config: createEvilBossBattle(scene, 35),
        metadata: { 
          evilTeamType: 'boss',
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined
        },
        dynamicMode
      });
    });

    specialWaves.smittyWaves.filter(w => w >= startWave && w <= endWave).forEach(wave => {
      const dynamicMode = generateDynamicModeForWave(wave, scene, seeds);
      const dynamicModeCount = dynamicMode ? Object.keys(dynamicMode).length : 0;
      const smittyBattleConfig = createSmittyBattle(scene, seeds.smittySeed || seeds.baseSeed, true);
      
      let smittyVariantIndex = 0;
      if (smittyBattleConfig.getTrainer) {
        const trainer = smittyBattleConfig.getTrainer(scene);
        if (trainer.config && trainer.config.smittyVariantIndex !== undefined) {
          smittyVariantIndex = trainer.config.smittyVariantIndex;
        }
      }
      
      allSpecialWaves.set(wave, {
        type: PathNodeType.SMITTY_BATTLE,
        config: smittyBattleConfig,
        metadata: {
          dynamicModeCount: dynamicModeCount > 0 ? dynamicModeCount : undefined,
          smittyVariantIndex: smittyVariantIndex
        },
        dynamicMode
      });
    });

    for (const [wave, specialData] of allSpecialWaves) {
      const branch = 2;
      const node = createPathNode(
        wave,
        specialData.type,
        branch,
        specialData.config,
        specialData.metadata,
        specialData.dynamicMode
      );
      layer.nodes.push(node);
      waveNodeTracker.set(wave, new Set([branch]));
    }
  }

  const existingWaves = new Set<number>();
  for (const node of layer.nodes) {
    existingWaves.add(node.wave);
  }

  const generatedChallengeRanges = globalChallengeRanges || new Set<number>();

  for (const range of CHALLENGE_RANGES) {
    if (range.end < startWave || range.start > endWave || generatedChallengeRanges.has(range.start)) {
      continue;
    }
    
    const layerRangeStart = Math.max(range.start, startWave);
    const layerRangeEnd = Math.min(range.end, endWave);
    
    if (layerRangeEnd - layerRangeStart < LAYER_CONFIG.MIN_RANGE_SIZE) {
      continue;
    }
    
    scene.resetSeed(seeds.baseSeed + range.start * LAYER_CONFIG.SEED_MULTIPLIER);
    
    const nodeCount = Utils.randSeedInt(3) + 3;
    
    let challengeType: 'nightmare' | 'nuzlocke' | 'nuzlight';
    if (nodeCount === 3) {
      challengeType = 'nightmare';
    } else if (nodeCount === 4) {
      challengeType = Utils.randSeedInt(100) < 80 ? 'nuzlocke' : 'nuzlight';
    } else {
      challengeType = Utils.randSeedInt(2) === 0 ? 'nuzlocke' : 'nuzlight';
    }
    
            const additionalPropertiesCount = calculateAdditionalPropertiesCount(range.start, totalWaves || 500, waveOffset);
    const additionalProperties: (keyof DynamicMode)[] = [];
    
    if (additionalPropertiesCount > 0) {
      const availableProperties: (keyof DynamicMode)[] = [
        'noCatch', 'noExpGain', 'hasPassiveAbility', 'invertedTypes',
        'boostedTrainer', 'multiLegendaries', 'multiBoss', 'noInitialSwitch',
        'autoPressured', 'noStatBoosts', 'noStatusMoves', 'noPhysicalMoves', 'noSpecialMoves', 'statSwap',
        'noSTAB', 'trickRoom', 'noSwitch',
        'noResistances', 'noHealingItems', 'autoTorment', 'legendaryNerf', 'typeExtraDamage', 'pokemonNerf'
      ];
      
      const propertiesToAdd = Math.min(additionalPropertiesCount, availableProperties.length);
      for (let i = 0; i < propertiesToAdd; i++) {
        const randomIndex = Utils.randSeedInt(availableProperties.length);
        additionalProperties.push(availableProperties[randomIndex]);
        availableProperties.splice(randomIndex, 1);
      }

      const moveRestrictionProperties = ['noStatusMoves', 'noPhysicalMoves', 'noSpecialMoves'];
      const activeMoveRestrictions = moveRestrictionProperties.filter(prop => additionalProperties.includes(prop));
      
      if (activeMoveRestrictions.length >= 2) {
        const keepIndex = Utils.randSeedInt(activeMoveRestrictions.length);
        const propertyToKeep = activeMoveRestrictions[keepIndex];
        const propertiesToRemove = activeMoveRestrictions.filter((_, index) => index !== keepIndex);
        
        propertiesToRemove.forEach(property => {
          const index = additionalProperties.indexOf(property);
          if (index !== -1) {
            additionalProperties.splice(index, 1);
          }
        });
        
        const remainingProperties = availableProperties.filter(prop => 
          !additionalProperties.includes(prop) && 
          !moveRestrictionProperties.includes(prop)
        );
        
        for (let i = 0; i < propertiesToRemove.length; i++) {
          if (remainingProperties.length > 0) {
            const randomIndex = Utils.randSeedInt(remainingProperties.length);
            const replacementProperty = remainingProperties[randomIndex];
            additionalProperties.push(replacementProperty);
            remainingProperties.splice(randomIndex, 1);
          }
        }
      }
    }
    
    
    debugChallengeSlotSearch(layerRangeStart, layerRangeEnd, nodeCount, waveNodeTracker, existingWaves);
    
    let challengePath: ChallengePathInfo | null = null;
    let foundStartWave: number | null = null;
    
    const maxSearchWave = layerRangeEnd - nodeCount;
    for (let potentialStart = layerRangeStart; potentialStart <= maxSearchWave; potentialStart++) {
      if (checkChallengeSlotAvailability(potentialStart, nodeCount, layerRangeEnd, waveNodeTracker, existingWaves)) {
        foundStartWave = potentialStart;
        
        scene.resetSeed(seeds.baseSeed + foundStartWave * 1337);
        
        const { nodes, rewardNode } = constructChallengePathNodes(
          scene,
          foundStartWave,
          nodeCount,
          challengeType,
          additionalProperties,
          seeds
        );
        
        challengePath = {
          startWave: foundStartWave,
          nodeCount,
          challengeType,
          additionalProperties,
          nodes,
          rewardNode
        };
        
        for (let i = 0; i <= nodeCount; i++) {
          existingWaves.add(foundStartWave + i);
        }
        
        break;
      }
    }
    
    if (challengePath && foundStartWave !== null) {
      challengePath.nodes.forEach((node, index) => {
        const existingBranches = waveNodeTracker.get(node.wave) || new Set();
        if (index === 0) {
          existingBranches.add(LAYER_CONFIG.CHALLENGE_BRANCH_FIRST);
        } else {
          existingBranches.add(LAYER_CONFIG.CHALLENGE_BRANCH_OTHER);
        }
        waveNodeTracker.set(node.wave, existingBranches);
        layer.nodes.push(node);
      });
      
      const rewardBranches = waveNodeTracker.get(challengePath.rewardNode.wave) || new Set();
      rewardBranches.add(LAYER_CONFIG.CHALLENGE_BRANCH_OTHER);
      waveNodeTracker.set(challengePath.rewardNode.wave, rewardBranches);
      layer.nodes.push(challengePath.rewardNode);
      
      generatedChallengeRanges.add(range.start);
      
    } else {
    }
  }

  for (let wave = startWave; wave <= endWave; wave++) {
    const hasSpecialBattle = waveNodeTracker.has(wave);
    
    if (hasSpecialBattle) {
      const existingNodes = layer.nodes.filter(n => n.wave === wave);
      const challengeNodes = existingNodes.filter(n => 
        n.nodeType === PathNodeType.CHALLENGE_BOSS ||
        n.nodeType === PathNodeType.CHALLENGE_RIVAL ||
        n.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
        n.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
        n.nodeType === PathNodeType.CHALLENGE_REWARD
      );
      
      if (challengeNodes.length > 0) {
        const isFirstChallengeNode = challengeNodes.some(n => n.metadata?.challengeNodeIndex === 1);
        if (isFirstChallengeNode) {
        } else {
        }
      } else {
      }
      
      const isFirstChallengeNode = challengeNodes.some(n => n.metadata?.challengeNodeIndex === 0);
      const isNonFirstChallengeNode = challengeNodes.length > 0 && !isFirstChallengeNode;
      const hasChallengeRewardNode = challengeNodes.some(n => n.nodeType === PathNodeType.CHALLENGE_REWARD);
      
      if (!isFirstChallengeNode && !isNonFirstChallengeNode) {
        continue;
      }
    }

    scene.resetSeed(seeds.baseSeed + wave * 1000);
    const rand = Utils.randSeedInt(1000);
    let nodesPerWave: number;
    
    const isFirstWaveOfLayer = wave === startWave && layerIndex > 0;
    
    if (isFirstWaveOfLayer) {
      nodesPerWave = Math.max(2, Math.floor(rand / 250) + 2);
    } else {
      if (rand < NODE_GENERATION.SINGLE_NODE_THRESHOLD) {
        nodesPerWave = 1;
      } else if (rand < NODE_GENERATION.TWO_NODE_THRESHOLD) {
        nodesPerWave = 2;
      } else if (rand < NODE_GENERATION.THREE_NODE_THRESHOLD) {
        nodesPerWave = 3;
      } else {
        nodesPerWave = 4;
      }
    }
    
    const usedPositions = waveNodeTracker.get(wave) || new Set();
    const availablePositions = [0, 1, 2, 3].filter(pos => !usedPositions.has(pos));
    
    nodesPerWave = Math.min(nodesPerWave, availablePositions.length);
    
    if (nodesPerWave === 0) {
      continue;
    }
    
    const positions = generateNodePositions(nodesPerWave, wave)
      .filter(pos => availablePositions.includes(pos))
      .slice(0, nodesPerWave);
    
    if (positions.length < nodesPerWave) {
      const extraPositions = availablePositions
        .filter(pos => !positions.includes(pos))
        .slice(0, nodesPerWave - positions.length);
      positions.push(...extraPositions);
    }
    
    waveNodeTracker.set(wave, new Set([...usedPositions, ...positions]));
    
    for (let nodeIndex = 0; nodeIndex < positions.length; nodeIndex++) {
      const branch = positions[nodeIndex];
      
      let nodeType: PathNodeType = PathNodeType.WILD_POKEMON;
      let battleConfig: FixedBattleConfig | undefined;

      const nodeResult = generateWaveBasedNode(wave, scene, seeds, nodeIndex);
      nodeType = nodeResult.nodeType;
      battleConfig = nodeResult.battleConfig;

      layer.nodes.push(createPathNode(wave, nodeType, branch, battleConfig));
    }
    
    const existingChallengeNodes = layer.nodes.filter(n => 
      n.wave === wave && (
        n.nodeType === PathNodeType.CHALLENGE_BOSS ||
        n.nodeType === PathNodeType.CHALLENGE_RIVAL ||
        n.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
        n.nodeType === PathNodeType.CHALLENGE_CHAMPION
      )
    );
    
    if (existingChallengeNodes.length > 0) {
      console.log(`🌊 Wave ${wave}: Regular nodes (${positions.length}) + Challenge node (${existingChallengeNodes.length}) - ${positions.map((_, i) => {
        const nodeResult = generateWaveBasedNode(wave, scene, seeds, i);
        return PathNodeType[nodeResult.nodeType];
      }).join(', ')} + ${existingChallengeNodes.map(n => PathNodeType[n.nodeType]).join(', ')}`);
    } else {
      console.log(`🌊 Wave ${wave}: Regular nodes (${positions.length}) - ${positions.map((_, i) => {
        const nodeResult = generateWaveBasedNode(wave, scene, seeds, i);
        return PathNodeType[nodeResult.nodeType];
      }).join(', ')}`);
    }
  }

  resolvePositionConflicts(layer);
  
  layer.nodes.sort((a, b) => a.wave - b.wave || a.position.x - b.position.x);
  
  for (let wave = startWave; wave <= endWave; wave++) {
    if (!validateNodePositions(layer.nodes, wave)) {
      console.warn(`❌ Position validation failed for wave ${wave} in layer ${layerIndex}`);
    }
  }
  
  return layer;
}

function connectPathNodes(layer: PathLayer, nextLayer?: PathLayer, seeds?: any): void {
  const currentNodes = layer.nodes;
  const nextNodes = nextLayer?.nodes || [];

  for (const node of currentNodes) {
    if (!node.connections) {
      node.connections = [];
    }
    if (!node.previousConnections) {
      node.previousConnections = [];
    }
  }
  for (const node of nextNodes) {
    if (!node.connections) {
      node.connections = [];
    }
    if (!node.previousConnections) {
      node.previousConnections = [];
    }
  }

  const regularNodes = currentNodes.filter(n => n.nodeType !== PathNodeType.CONVERGENCE_POINT);
  const nextRegularNodes = nextNodes.filter(n => n.nodeType !== PathNodeType.CONVERGENCE_POINT);

  const allLayerNodes = [...regularNodes, ...nextRegularNodes];
  const nodesByWave = new Map<number, PathNode[]>();
  
  for (const node of allLayerNodes) {
    if (node.nodeType !== PathNodeType.CONVERGENCE_POINT) {
      if (!nodesByWave.has(node.wave)) {
        nodesByWave.set(node.wave, []);
      }
      nodesByWave.get(node.wave)!.push(node);
    }
  }
  
  for (const [wave, waveNodes] of nodesByWave) {
    waveNodes.sort((a, b) => a.position.x - b.position.x);
  }

  processWaveConnections(regularNodes, nodesByWave, layer.convergenceWave, seeds);
  
  if (nextLayer) {
    ensurePathConnectivity(layer, nextLayer, seeds);
  }
  
  debugPathConnections(regularNodes, nodesByWave, []);
}

function processWaveConnections(currentNodes: PathNode[], nodesByWave: Map<number, PathNode[]>, convergenceWave: number, seeds?: any): void {
  const waves = Array.from(nodesByWave.keys()).sort((a, b) => a - b).filter(w => w <= convergenceWave);
  
  const isChallengeNode = (node: PathNode, includeReward: boolean = true): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_RIVAL ||
           node.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
           (includeReward && node.nodeType === PathNodeType.CHALLENGE_REWARD);
  };
  
  const isFirstChallengeNode = (node: PathNode): boolean => {
    return isChallengeNode(node) && node.metadata?.challengeNodeIndex === 1;
  };
  
  const isChallengeRewardNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  for (let i = 0; i < waves.length - 1; i++) {
    const currentWave = waves[i];
    const nextWave = waves[i + 1];
    
    if (nextWave - currentWave !== 1) {
      continue;
    }
    
    const allCurrentWaveNodes = nodesByWave.get(currentWave) || [];
    const allNextWaveNodes = nodesByWave.get(nextWave) || [];
    
    const currentWaveNodes = allCurrentWaveNodes.filter(node => !isChallengeNode(node) || isFirstChallengeNode(node));
    const nextWaveNodes = allNextWaveNodes.filter(node => !isChallengeNode(node) || (isFirstChallengeNode(node) && !isChallengeRewardNode(node)));
    
    if (currentWaveNodes.length === 0 || nextWaveNodes.length === 0) {
      continue;
    }
    
    currentWaveNodes.sort((a, b) => a.position.x - b.position.x);
    nextWaveNodes.sort((a, b) => a.position.x - b.position.x);
    
    const isConnectingToConvergenceWave = nextWave % 20 === 0;
    const isConnectingFromConvergenceWave = currentWave % 20 === 0;
    
    createNonCrossingConnections(currentWaveNodes, nextWaveNodes, seeds);
  }
  
  const filteredNodesByWave = new Map<number, PathNode[]>();
  for (const [wave, nodes] of nodesByWave) {
    const regularNodes = nodes.filter(node => !isChallengeNode(node, false) || (isFirstChallengeNode(node) && !isChallengeRewardNode(node)));
    if (regularNodes.length > 0) {
      filteredNodesByWave.set(wave, regularNodes);
    }
  }
  
  ensureAllNodesConnected(filteredNodesByWave, convergenceWave, seeds);
}

function createNonCrossingConnections(currentNodes: PathNode[], nextNodes: PathNode[], seeds?: any): void {
  
  for (const currentNode of currentNodes) {
    if (!currentNode.connections) {
      currentNode.connections = [];
    }
    if (!currentNode.previousConnections) {
      currentNode.previousConnections = [];
    }
  }
  
  for (const nextNode of nextNodes) {
    if (!nextNode.connections) {
      nextNode.connections = [];
    }
    if (!nextNode.previousConnections) {
      nextNode.previousConnections = [];
    }
  }

  if (nextNodes.length === 1) {
    const singleTarget = nextNodes[0];
    for (const currentNode of currentNodes) {
      addBidirectionalConnection(currentNode, singleTarget);
    }
    return;
  }

  if (currentNodes.length === 1) {
    const singleSource = currentNodes[0];
    for (const nextNode of nextNodes) {
      addBidirectionalConnection(singleSource, nextNode);
    }
    return;
  }
  
  const connectionMatrix: boolean[][] = [];
  for (let i = 0; i < currentNodes.length; i++) {
    connectionMatrix[i] = new Array(nextNodes.length).fill(false);
  }
  
  const currentWave = currentNodes.length > 0 ? currentNodes[0].wave : 0;
  const bias = seeds ? calculateConnectionBias(currentNodes, seeds, currentWave) : 'balanced';
  const randomSeed = seeds ? (seeds.baseSeed + currentWave * 311) : Math.floor(Math.random() * 1000);
  const processOrder = getDirectionalProcessOrder(currentNodes, bias, randomSeed);
  const processIndices = processOrder.map(node => currentNodes.indexOf(node));
  const connectedTargets = new Set<number>();
  
  for (const currentIndex of processIndices) {
    const currentNode = currentNodes[currentIndex];
    const currentPosition = currentNode.position.x;
    
    const validTargets: { index: number; distance: number }[] = [];
    for (let nextIndex = 0; nextIndex < nextNodes.length; nextIndex++) {
      const nextNode = nextNodes[nextIndex];
      const distance = Math.abs(currentPosition - nextNode.position.x);
      validTargets.push({ index: nextIndex, distance });
    }
    
    validTargets.sort((a, b) => a.distance - b.distance);
    
    let connectionsAdded = 0;
    const maxConnections = Math.min(2, nextNodes.length);
    
    for (const target of validTargets) {
      if (connectionsAdded >= maxConnections) break;
      
      const nextIndex = target.index;
      
      if (!wouldCreateCrossing(currentIndex, nextIndex, connectionMatrix)) {
        connectionMatrix[currentIndex][nextIndex] = true;
        addBidirectionalConnection(currentNode, nextNodes[nextIndex]);
        connectedTargets.add(nextIndex);
        connectionsAdded++;
      }
    }
    
    if (connectionsAdded === 0 && validTargets.length > 0) {
      const fallbackTarget = validTargets[0];
      const nextIndex = fallbackTarget.index;
      connectionMatrix[currentIndex][nextIndex] = true;
      addBidirectionalConnection(currentNode, nextNodes[nextIndex]);
      connectedTargets.add(nextIndex);
    }
  }
  
  for (let nextIndex = 0; nextIndex < nextNodes.length; nextIndex++) {
    if (!connectedTargets.has(nextIndex)) {
      let bestCurrentIndex = 0;
      let bestDistance = Math.abs(currentNodes[0].position.x - nextNodes[nextIndex].position.x);
      
      for (let currentIndex = 1; currentIndex < currentNodes.length; currentIndex++) {
        const distance = Math.abs(currentNodes[currentIndex].position.x - nextNodes[nextIndex].position.x);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCurrentIndex = currentIndex;
        }
      }
      
      if (!connectionMatrix[bestCurrentIndex][nextIndex]) {
        connectionMatrix[bestCurrentIndex][nextIndex] = true;
        addBidirectionalConnection(currentNodes[bestCurrentIndex], nextNodes[nextIndex]);
      }
    }
  }
}

function wouldCreateCrossing(currentIndex: number, nextIndex: number, connectionMatrix: boolean[][]): boolean {
  for (let i = 0; i < connectionMatrix.length; i++) {
    for (let j = 0; j < connectionMatrix[i].length; j++) {
      if (connectionMatrix[i][j]) {
        if ((i < currentIndex && j > nextIndex) || (i > currentIndex && j < nextIndex)) {
          return true;
        }
      }
    }
  }
  return false;
}

function ensureAllNodesConnected(nodesByWave: Map<number, PathNode[]>, convergenceWave: number, seeds?: any): void {
  const isChallengeNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_RIVAL ||
           node.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
           node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  const isFirstChallengeNode = (node: PathNode): boolean => {
    return isChallengeNode(node) && node.metadata?.challengeNodeIndex === 1;
  };
  
  const isChallengeRewardNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };

  const waves = Array.from(nodesByWave.keys()).sort((a, b) => a - b).filter(w => w <= convergenceWave);
  for (let i = 0; i < waves.length; i++) {
    const currentWave = waves[i];
    const currentNodes = nodesByWave.get(currentWave) || [];
    
    if (currentNodes.length === 0) continue;
    
    const bias = seeds ? calculateConnectionBias(currentNodes, seeds, currentWave) : 'balanced';
    const randomSeed = seeds ? (seeds.baseSeed + currentWave * 419) : Math.floor(Math.random() * 1000);
    const processOrder = getDirectionalProcessOrder(currentNodes, bias, randomSeed);
    
    for (const currentNode of processOrder) {
      if (currentNode.connections.length === 0) {
        let targetNode: PathNode | null = null;
        
        if (isChallengeRewardNode(currentNode)) {
          for (let j = i + 1; j < waves.length; j++) {
            const futureWave = waves[j];
            const futureNodes = nodesByWave.get(futureWave) || [];
            
            if (futureNodes.length > 0) {
              targetNode = findBestConnector(currentNode, futureNodes);
              break;
            }
          }
        } else {
          if (i + 1 < waves.length) {
            const nextWave = waves[i + 1];
            if (nextWave - currentWave === 1) {
              const nextNodes = nodesByWave.get(nextWave) || [];
              
              const validNextNodes = nextNodes.filter(node => {
                if (isChallengeNode(currentNode) && !isFirstChallengeNode(currentNode)) {
                  return isChallengeNode(node) && !isChallengeRewardNode(node);
                }
                
                return !isChallengeRewardNode(node);
              });
              
              if (validNextNodes.length > 0) {
                targetNode = findBestConnector(currentNode, validNextNodes);
              }
            }
          }
        }
        
        if (targetNode) {
          addBidirectionalConnection(currentNode, targetNode);
        } 
      }
    }
    
    if (i > 0) {
      const disconnectedNodes: PathNode[] = [];
      for (const currentNode of currentNodes) {
        if (!currentNode.previousConnections || currentNode.previousConnections.length === 0) {
          disconnectedNodes.push(currentNode);
        }
      }
      
      if (disconnectedNodes.length > 0) {
        for (const currentNode of disconnectedNodes) {
          let bestConnector: PathNode | null = null;
          
          if (isChallengeRewardNode(currentNode)) {
            for (let searchWave = i - 1; searchWave >= 0; searchWave--) {
              const searchWaveIndex = waves[searchWave];
              const prevNodes = nodesByWave.get(searchWaveIndex) || [];
              
              const validPrevNodes = prevNodes.filter(prevNode => {
                return isChallengeNode(prevNode) && !isChallengeRewardNode(prevNode);
              });
              
              if (validPrevNodes.length > 0) {
                bestConnector = findBestConnector(currentNode, validPrevNodes);
                break;
              }
            }
          } else {
            const prevWave = waves[i - 1];
            if (currentWave - prevWave === 1) {
              const prevNodes = nodesByWave.get(prevWave) || [];
              
              const validPrevNodes = prevNodes.filter(prevNode => {
                if (isChallengeNode(currentNode) && !isFirstChallengeNode(currentNode)) {
                  return isChallengeNode(prevNode) && !isChallengeRewardNode(prevNode);
                }
                
                return !isChallengeRewardNode(prevNode);
              });
              
              if (validPrevNodes.length > 0) {
                bestConnector = findBestConnector(currentNode, validPrevNodes);
              }
            }
          }
          
          if (bestConnector) {
            addBidirectionalConnection(bestConnector, currentNode);
          }
        }
      }
    }
  }
}

function findBestConnector(referenceNode: PathNode, candidateNodes: PathNode[]): PathNode | null {
  if (candidateNodes.length === 0) return null;
  
  const referencePosition = referenceNode.position.x;
  
  let bestConnector: PathNode | null = null;
  let bestScore = -1;
  
  for (const candidate of candidateNodes) {
    const distance = Math.abs(candidate.position.x - referencePosition);
    const connectionCount = candidate.connections ? candidate.connections.length : 0;
    const isAdjacent = distance <= 1;
    
    let score = 100;
    score -= distance * 15;
    score -= connectionCount * 10;
    if (isAdjacent) score += 25;
    if (connectionCount === 0) score -= 30;
    
    if (score > bestScore) {
      bestScore = score;
      bestConnector = candidate;
    }
  }
  
  return bestConnector;
}

function debugPathConnections(currentNodes: PathNode[], nodesByWave: Map<number, PathNode[]>, convergenceNodes: PathNode[]): void {
  const allNodes = [...currentNodes];
  for (const waveNodes of nodesByWave.values()) {
    allNodes.push(...waveNodes);
  }

  const nodesByWaveComplete = new Map<number, PathNode[]>();
  for (const node of allNodes) {
    if (!nodesByWaveComplete.has(node.wave)) {
      nodesByWaveComplete.set(node.wave, []);
    }
    nodesByWaveComplete.get(node.wave)!.push(node);
  }
  
  for (const [wave, nodes] of nodesByWaveComplete) {
    nodes.sort((a, b) => a.position.x - b.position.x);
  }
  
  const allWaves = Array.from(nodesByWaveComplete.keys()).sort((a, b) => a - b);
  
  const deadEnds = allNodes.filter(node => node.connections.length === 0);
  const unconnectedNodes = [];
  
  for (let i = 0; i < allWaves.length; i++) {
    const wave = allWaves[i];
    
    if (i < allWaves.length - 1) {
      const nextWave = allWaves[i + 1];
      const nextNodes = nodesByWaveComplete.get(nextWave) || [];
      
      const unconnectedNextNodes = nextNodes.filter(nextNode => {
        return !allNodes.some(prevNode => 
          prevNode.wave <= wave && prevNode.connections.includes(nextNode.id)
        );
      });
      
      if (unconnectedNextNodes.length > 0) {
        unconnectedNodes.push({
          wave: nextWave,
          nodes: unconnectedNextNodes.map(n => `[${n.position.x}]${PathNodeType[n.nodeType]}`).join(', ')
        });
      }
    }
  }
  
  if (deadEnds.length > 0 || unconnectedNodes.length > 0) {
    
    if (deadEnds.length > 0) {
      deadEnds.forEach(node => {
      });
    }
    
    if (unconnectedNodes.length > 0) {
      unconnectedNodes.forEach(issue => {
      });
    }
    
  }
}

function getValidConnections(currentPosition: number, nextWaveNodes: PathNode[]): PathNode[] {
  const adjacentTargets: PathNode[] = [];
  const nearbyTargets: PathNode[] = [];
  
  for (const node of nextWaveNodes) {
    const distance = Math.abs(currentPosition - node.position.x);
    if (distance <= 1) {
      adjacentTargets.push(node);
    } else if (distance <= 2) {
      nearbyTargets.push(node);
    }
  }
  
  if (adjacentTargets.length > 0) {
    const shuffled = [...adjacentTargets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Utils.randSeedInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  if (nearbyTargets.length > 0) {
    const shuffled = [...nearbyTargets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Utils.randSeedInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  const allTargets = [...nextWaveNodes];
  for (let i = allTargets.length - 1; i > 0; i--) {
    const j = Utils.randSeedInt(i + 1);
    [allTargets[i], allTargets[j]] = [allTargets[j], allTargets[i]];
  }
  return allTargets;
}



function ensurePathConnectivity(layer: PathLayer, nextLayer?: PathLayer, seeds?: any): void {
  if (!nextLayer) {
    return;
  }

  const isChallengeNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_RIVAL ||
           node.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
           node.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
           node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  const isFirstChallengeNode = (node: PathNode): boolean => {
    return isChallengeNode(node) && node.metadata?.challengeNodeIndex === 1;
  };
  
  const isChallengeRewardNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };

  const currentRegularNodes = layer.nodes.filter(n => n.nodeType !== PathNodeType.CONVERGENCE_POINT);
  const nextRegularNodes = nextLayer.nodes.filter(n => 
    n.nodeType !== PathNodeType.CONVERGENCE_POINT && 
    (!isChallengeNode(n) || (isFirstChallengeNode(n) && !isChallengeRewardNode(n)))
  );
  
  const connectedNextNodes = new Set<string>();
  
  for (const currentNode of currentRegularNodes) {
    for (const connectionId of currentNode.connections) {
      connectedNextNodes.add(connectionId);
    }
  }

  for (const currentNode of currentRegularNodes) {
    if (currentNode.connections.length === 0 && nextRegularNodes.length > 0) {
      const adjacentWaveNodes = nextRegularNodes.filter(node => 
        Math.abs(node.wave - currentNode.wave) === 1 || isChallengeRewardNode(currentNode)
      );
      
      if (adjacentWaveNodes.length > 0) {
        const currentBranch = currentNode.position.x;
        const adjacentTargets = adjacentWaveNodes.filter(node => {
          const targetBranch = node.position.x;
          return Math.abs(currentBranch - targetBranch) <= 1;
        });
        
        if (adjacentTargets.length > 0) {
          addBidirectionalConnection(currentNode, adjacentTargets[0]);
          connectedNextNodes.add(adjacentTargets[0].id);
        } else if (adjacentWaveNodes.length > 0) {
          const closest = adjacentWaveNodes.reduce((closest, node) => {
            const currentDiff = Math.abs(currentBranch - node.position.x);
            const closestDiff = Math.abs(currentBranch - closest.position.x);
            return currentDiff < closestDiff ? node : closest;
          });
          addBidirectionalConnection(currentNode, closest);
          connectedNextNodes.add(closest.id);
        }
      }
    }
  }

  const currentWave = nextRegularNodes.length > 0 ? nextRegularNodes[0].wave : 0;
  const bias = seeds ? calculateConnectionBias(currentRegularNodes, seeds, currentWave) : 'balanced';
  const randomSeed = seeds ? (seeds.baseSeed + currentWave * 503) : Math.floor(Math.random() * 1000);
  const processOrderNext = getDirectionalProcessOrder(nextRegularNodes, bias, randomSeed);

  for (const nextNode of processOrderNext) {
    if (!connectedNextNodes.has(nextNode.id)) {
      const adjacentWaveNodes = currentRegularNodes.filter(node => 
        (Math.abs(node.wave - nextNode.wave) === 1 || isChallengeRewardNode(node)) && 
        node.connections.length < 3
      );
      
      if (adjacentWaveNodes.length > 0) {
        const closest = adjacentWaveNodes.reduce((closest, node) => {
          const currentDiff = Math.abs(nextNode.position.x - node.position.x);
          const closestDiff = Math.abs(nextNode.position.x - closest.position.x);
          return currentDiff < closestDiff ? node : closest;
        });
        addBidirectionalConnection(closest, nextNode);
        connectedNextNodes.add(nextNode.id);
      }
    }
  }

  const lastWaveInLayer = Math.max(...currentRegularNodes.map(n => n.wave));
  const firstWaveInNextLayer = Math.min(...nextRegularNodes.map(n => n.wave));
  
  if (firstWaveInNextLayer === lastWaveInLayer + 1) {
    const lastWaveNodes = currentRegularNodes.filter(n => n.wave === lastWaveInLayer);
    const firstWaveNextNodes = nextRegularNodes.filter(n => n.wave === firstWaveInNextLayer);
    
    const bias = seeds ? calculateConnectionBias(lastWaveNodes, seeds, lastWaveInLayer) : 'balanced';
      const randomSeed = seeds ? (seeds.baseSeed + lastWaveInLayer * 709) : Math.floor(Math.random() * 1000);
      const processOrderLast = getDirectionalProcessOrder(lastWaveNodes, bias, randomSeed);
      
      for (const lastNode of processOrderLast) {
        if (lastNode.connections.length === 0 && firstWaveNextNodes.length > 0) {
          const currentBranch = lastNode.position.x;
          const adjacentTargets = firstWaveNextNodes.filter(node => 
            Math.abs(node.position.x - currentBranch) <= 1
          );
          
          if (adjacentTargets.length > 0) {
            addBidirectionalConnection(lastNode, adjacentTargets[0]);
          } else {
            const closest = firstWaveNextNodes.reduce((closest, node) => {
              const currentDiff = Math.abs(currentBranch - node.position.x);
              const closestDiff = Math.abs(currentBranch - closest.position.x);
              return currentDiff < closestDiff ? node : closest;
            });
            addBidirectionalConnection(lastNode, closest);
          }
        }
      }
  }
}

function debugBattlePathIntegrity(battlePath: BattlePath): void {
  
  let totalIssues = 0;
  const positionIssues: string[] = [];
  const connectivityIssues: string[] = [];
  const structuralIssues: string[] = [];
  const bidirectionalIssues: string[] = [];
  
  for (const [wave, nodesAtWave] of battlePath.waveToNodeMap) {
    const positions = nodesAtWave.map(n => n.position.x);
    const uniquePositions = new Set(positions);
    
    if (positions.length !== uniquePositions.size) {
      const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
      const issue = `Wave ${wave}: Duplicate positions [${duplicates.join(', ')}]`;
      positionIssues.push(issue);
      totalIssues++;
    }
    
    for (const node of nodesAtWave) {
      if (node.position.x < 0 || node.position.x > 3) {
        const issue = `Wave ${wave}: Node ${node.id} has invalid position ${node.position.x}`;
        structuralIssues.push(issue);
        totalIssues++;
      }
      
      if (!node.previousConnections) {
        const issue = `Wave ${wave}: Node ${node.id} missing previousConnections array`;
        structuralIssues.push(issue);
        totalIssues++;
      }
      
      for (const connectionId of node.connections) {
        const targetNode = battlePath.nodeMap.get(connectionId);
        if (targetNode && (!targetNode.previousConnections || !targetNode.previousConnections.includes(node.id))) {
          const issue = `Bidirectional mismatch: ${node.id} -> ${connectionId} (missing reverse connection)`;
          bidirectionalIssues.push(issue);
          totalIssues++;
        }
      }
    }
  }
  
  const { isValid: connectivityValid, issues: connIssues } = validateConnectivity(battlePath);
  connectivityIssues.push(...connIssues);
  totalIssues += connIssues.length;
  
  let totalNodes = 0;
  let totalConnections = 0;
  let totalPreviousConnections = 0;
  const disconnectedComponents: string[] = [];
  
  for (const [, node] of battlePath.nodeMap) {
    totalNodes++;
    totalConnections += node.connections.length;
    totalPreviousConnections += node.previousConnections ? node.previousConnections.length : 0;
    
    if (node.connections.length === 0) {
      const firstWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));
      const lastWave = Math.max(...Array.from(battlePath.waveToNodeMap.keys()));
      
      if (node.wave !== lastWave) {
        disconnectedComponents.push(`${node.id} (wave ${node.wave})`);
        totalIssues++;
      }
    }
  }
  
  
}

export function setupFixedBattlePaths(scene: BattleScene, startWave: number = 1): BattlePath {
  try {
    
    if (!scene.gameData.nightmareBattleSeeds) {
      const baseSeed = Utils.randInt(1000000);
      scene.gameData.nightmareBattleSeeds = generateUniqueSeeds(baseSeed);
    }

    const seeds = scene.gameData.nightmareBattleSeeds;
    const totalWaves = scene.gameMode.isChaosVoid || scene.gameMode.isInfinite ? 1000 : 500;
    const waveOffset = startWave - 1;
    
    const segmentSize = 500;
    const numSegments = Math.ceil(totalWaves / segmentSize);
    
    const combinedSpecialWaves: SpecialBattleWaves = {
      rivalWaves: [],
      majorBossWaves: [],
      recoveryBossWaves: [],
      eliteFourWaves: [],
      championWaves: [],
      smittyWaves: [],
      evilTeamWaves: {
        grunts: [],
        admins: [],
        bosses: []
      }
    };

    for (let segment = 0; segment < numSegments; segment++) {
      const segmentStart = segment * segmentSize + startWave;
      const segmentWaves = Math.min(segmentSize, totalWaves - segment * segmentSize);
      
      if (segmentWaves <= 0) break;
      
      const segmentSpecialWaves = generateSpecialBattleWaves(scene, seeds, segmentWaves, segmentStart - 1);
      
      combinedSpecialWaves.rivalWaves.push(...segmentSpecialWaves.rivalWaves);
      combinedSpecialWaves.majorBossWaves.push(...segmentSpecialWaves.majorBossWaves);
      combinedSpecialWaves.recoveryBossWaves.push(...segmentSpecialWaves.recoveryBossWaves);
      combinedSpecialWaves.eliteFourWaves.push(...segmentSpecialWaves.eliteFourWaves);
      combinedSpecialWaves.championWaves.push(...segmentSpecialWaves.championWaves);
      combinedSpecialWaves.smittyWaves.push(...segmentSpecialWaves.smittyWaves);
      combinedSpecialWaves.evilTeamWaves.grunts.push(...segmentSpecialWaves.evilTeamWaves.grunts);
      combinedSpecialWaves.evilTeamWaves.admins.push(...segmentSpecialWaves.evilTeamWaves.admins);
      combinedSpecialWaves.evilTeamWaves.bosses.push(...segmentSpecialWaves.evilTeamWaves.bosses);
    }
    
    scene.resetSeed(seeds.rivalSelection);
    // const primaryRival = getDynamicRivalType ? getDynamicRivalType(1, scene.gameData, scene) : null;
    
    const globalRivalAssignments = new Map<number, { stage: number; rival: any }>();
    const sortedRivalWaves = [...combinedSpecialWaves.rivalWaves].sort((a, b) => a - b);
    
    scene.resetSeed(seeds.rivalSelection);
    const allRivalTypes = getAllRivalTrainerTypes ? getAllRivalTrainerTypes() : [];
    const selectedRivals: any[] = [];
    while (selectedRivals.length < Math.min(6, allRivalTypes.length)) {
      const randomIndex = Utils.randSeedInt(allRivalTypes.length);
      const randomRival = allRivalTypes[randomIndex];
      if (!selectedRivals.includes(randomRival)) {
        selectedRivals.push(randomRival);
      }
    }
    
    const rivalsPerStage = Math.ceil(sortedRivalWaves.length / 6);
    for (let i = 0; i < sortedRivalWaves.length; i++) {
      const wave = sortedRivalWaves[i];
      const stage = startWave > 1000 ? 6 : Math.min(Math.floor(i / rivalsPerStage) + 1, 6);
      const rivalIndex = i % rivalsPerStage;
      
      const shuffledRivals = [...selectedRivals];
      scene.resetSeed(seeds.rivalSelection + stage * 1000);
      for (let j = shuffledRivals.length - 1; j > 0; j--) {
        const k = Utils.randSeedInt(j + 1);
        [shuffledRivals[j], shuffledRivals[k]] = [shuffledRivals[k], shuffledRivals[j]];
      }
      
      const selectedRival = shuffledRivals[rivalIndex % shuffledRivals.length];
      
      globalRivalAssignments.set(wave, { 
        stage: stage, 
        rival: selectedRival
      });
    }
    
    const layerSize = 20;
    const convergencePoints = [];
    for (let i = layerSize; i <= totalWaves; i += layerSize) {
      convergencePoints.push(i + waveOffset);
    }

    const battlePath: BattlePath = {
      totalWaves: startWave + totalWaves - 1,
      layers: [],
      convergencePoints,
      nodeMap: new Map(),
      waveToNodeMap: new Map()
    };

    const globalChallengeRanges = new Set<number>();

    let currentWave = startWave;
    for (let i = 0; i < convergencePoints.length; i++) {
      const convergenceWave = convergencePoints[i];
      const endWave = convergenceWave;
      
      if (currentWave > endWave) {
        continue;
      }

      const layer = createPathLayer(
        scene,
        i,
        currentWave,
        endWave,
        convergenceWave,
        seeds,
        combinedSpecialWaves.rivalWaves,
        combinedSpecialWaves.majorBossWaves,
        combinedSpecialWaves,
        startWave + totalWaves - 1,
        globalRivalAssignments,
        globalChallengeRanges
      );

      battlePath.layers.push(layer);
      currentWave = convergenceWave + 1;
    }

    for (let i = 0; i < battlePath.layers.length; i++) {
      const currentLayer = battlePath.layers[i];
      const nextLayer = battlePath.layers[i + 1];
      connectPathNodes(currentLayer, nextLayer, seeds);
    }

    for (const layer of battlePath.layers) {
      for (const node of layer.nodes) {
        battlePath.nodeMap.set(node.id, node);
        
        if (!battlePath.waveToNodeMap.has(node.wave)) {
          battlePath.waveToNodeMap.set(node.wave, []);
        }
        battlePath.waveToNodeMap.get(node.wave)!.push(node);
      }
    }

    fixConnectivityIssues(battlePath);
    
    let connectionIssues = 0;
    for (const [, node] of battlePath.nodeMap) {
      for (const connectionId of node.connections) {
        const targetNode = battlePath.nodeMap.get(connectionId);
        if (targetNode && !targetNode.previousConnections.includes(node.id)) {
          targetNode.previousConnections.push(node.id);
          connectionIssues++;
        }
      }
    }
    
    debugBattlePathIntegrity(battlePath);

    const fixedBattles: FixedBattleConfigs = {};
    for (const [, node] of battlePath.nodeMap) {
      if (node.battleConfig) {
        fixedBattles[node.wave] = node.battleConfig;
      }
    }

    // scene.gameMode.battleConfig = fixedBattles;
    scene.gameData.battlePath = battlePath;
    currentBattlePath = battlePath;

    outputAllWavesWithPaths(scene, battlePath);

    const challengeNodes = Array.from(battlePath.nodeMap.values()).filter(node => 
      node.nodeType === PathNodeType.CHALLENGE_BOSS ||
      node.nodeType === PathNodeType.CHALLENGE_RIVAL ||
      node.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
      node.nodeType === PathNodeType.CHALLENGE_CHAMPION ||
      node.nodeType === PathNodeType.CHALLENGE_REWARD
    );
    
    if (challengeNodes.length > 0) {
      challengeNodes.sort((a, b) => a.wave - b.wave);
      challengeNodes.forEach(node => {
        const dynamicModeCount = node.dynamicMode ? Object.keys(node.dynamicMode).filter(key => node.dynamicMode![key as keyof DynamicMode]).length : 0;
        const connections = node.connections.map(id => {
          const connectedNode = battlePath.nodeMap.get(id);
          return connectedNode ? `${connectedNode.wave}:${PathNodeType[connectedNode.nodeType]}` : id;
        }).join(', ');
      });
      
      const challengePathsByRange = new Map<string, PathNode[]>();
      challengeNodes.forEach(node => {
        if (node.nodeType !== PathNodeType.CHALLENGE_REWARD) {
          const range = getChallengeRangeForWave(node.wave, battlePath.totalWaves, waveOffset);
          if (range) {
            const rangeKey = `${range.start}-${range.end}`;
            if (!challengePathsByRange.has(rangeKey)) {
              challengePathsByRange.set(rangeKey, []);
            }
            challengePathsByRange.get(rangeKey)!.push(node);
          }
        }
      });
      
      challengePathsByRange.forEach((pathNodes, range) => {
        pathNodes.sort((a, b) => a.wave - b.wave);
        pathNodes.forEach((node, index) => {
          const isFirstNode = node.metadata?.challengeNodeIndex === 1;
          const connections = node.connections.map(id => {
            const connectedNode = battlePath.nodeMap.get(id);
            return connectedNode ? `${connectedNode.wave}:${PathNodeType[connectedNode.nodeType]}` : id;
          }).join(', ');
        });
      });
    } else {
    }

    const challengeRewardNodes = Array.from(battlePath.nodeMap.values()).filter(node => 
      node.nodeType === PathNodeType.CHALLENGE_REWARD
    );
    
    if (challengeRewardNodes.length > 0) {
      challengeRewardNodes.forEach(rewardNode => {
        
        if (rewardNode.previousConnections && rewardNode.previousConnections.length > 0) {
          console.log(`   ⬅️ Incoming connections (${rewardNode.previousConnections.length}):`);
          rewardNode.previousConnections.forEach(connectionId => {
            const sourceNode = battlePath.nodeMap.get(connectionId);
            if (sourceNode) {
              const isChallenge = sourceNode.nodeType === PathNodeType.CHALLENGE_BOSS ||
                                sourceNode.nodeType === PathNodeType.CHALLENGE_RIVAL ||
                                sourceNode.nodeType === PathNodeType.CHALLENGE_EVIL_BOSS ||
                                sourceNode.nodeType === PathNodeType.CHALLENGE_CHAMPION;
              const isRegular = !isChallenge && sourceNode.nodeType !== PathNodeType.CHALLENGE_REWARD;
              const status = isRegular ? "❌ INVALID" : "✅ Valid";
              
              if (isRegular) {
              }
            } else {
            }
          });
        } else {
        }
        
        const prevWave = rewardNode.wave - 1;
        const prevWaveNodes = battlePath.waveToNodeMap.get(prevWave) || [];
        console.log(`   📊 Wave ${prevWave} nodes (${prevWaveNodes.length}) - ALL CONNECTIONS:`);
        prevWaveNodes.forEach(prevNode => {
          const hasConnectionToReward = prevNode.connections.includes(rewardNode.id);
          const nodeStatus = hasConnectionToReward ? "🔗 CONNECTS TO REWARD" : "   ";
          console.log(`     ${nodeStatus} [${prevNode.position.x}] ${PathNodeType[prevNode.nodeType]} (${prevNode.id})`);
          console.log(`       All connections: [${prevNode.connections.map(id => {
            const target = battlePath.nodeMap.get(id);
            return target ? `${target.wave}:${PathNodeType[target.nodeType]}` : id;
          }).join(', ')}]`);
          if (hasConnectionToReward) {
          }
        });
        
        if (rewardNode.connections && rewardNode.connections.length > 0) {
          rewardNode.connections.forEach(connectionId => {
            const targetNode = battlePath.nodeMap.get(connectionId);
            if (targetNode) {
            } else {
            }
          });
        }
      });
    } else {
    }

    return battlePath;

  } catch (error) {
    throw error;
  }
}

export function getCurrentBattlePath(): BattlePath | null {
  return currentBattlePath;
}

export function getAvailablePathsFromWave(wave: number): PathNode[] {
  if (!currentBattlePath) {
    return [];
  }

  const currentNodes = currentBattlePath.waveToNodeMap.get(wave) || [];
  const availablePaths: PathNode[] = [];

  for (const node of currentNodes) {
    for (const connectionId of node.connections) {
      const connectedNode = currentBattlePath.nodeMap.get(connectionId);
      if (connectedNode) {
        availablePaths.push(connectedNode);
      }
    }
  }

  return availablePaths;
}

export function selectPath(scene: BattleScene, selectedNodeId: string): boolean {
  if (!currentBattlePath) {
    return false;
  }

  const selectedNode = currentBattlePath.nodeMap.get(selectedNodeId);
  if (!selectedNode) {
    return false;
  }

  scene.gameData.selectedPath = selectedNodeId;
  scene.gameData.currentPathPosition = selectedNode.wave;

  return true;
}

export function getPathVisualizationData(battlePath: BattlePath): any {
  const visualization = {
    layers: [],
    totalWaves: battlePath.totalWaves
  };

  for (const layer of battlePath.layers) {
    const layerData = {
      startWave: layer.startWave,
      endWave: layer.endWave,
      convergenceWave: layer.convergenceWave,
      nodes: layer.nodes.map(node => ({
        id: node.id,
        wave: node.wave,
        type: PathNodeType[node.nodeType],
        position: node.position,
        connections: node.connections,
        previousConnections: node.previousConnections,
        isRequired: node.isRequired,
        metadata: node.metadata
      }))
    };
    visualization.layers.push(layerData);
  }

  return visualization;
}


function getNodeTypeIcon(nodeType: PathNodeType): string {
  switch (nodeType) {
    case PathNodeType.WILD_POKEMON: return "🦎";
    case PathNodeType.TRAINER_BATTLE: return "⚔️";
    case PathNodeType.RIVAL_BATTLE: return "👑";
    case PathNodeType.MAJOR_BOSS_BATTLE: return "🏛️";
    case PathNodeType.RECOVERY_BOSS: return "🔟";
    case PathNodeType.EVIL_BOSS_BATTLE: return "😈";
    case PathNodeType.ELITE_FOUR: return "🏆";
    case PathNodeType.CHAMPION: return "👑";
    case PathNodeType.ITEM_GENERAL: return "🎁";
    case PathNodeType.ADD_POKEMON: return "🐾";
    case PathNodeType.ITEM_TM: return "💿";
    case PathNodeType.ITEM_BERRY: return "🍓";
    case PathNodeType.MYSTERY_NODE: return "❓";
    case PathNodeType.CONVERGENCE_POINT: return "🎯";
    case PathNodeType.SMITTY_BATTLE: return "✨";
    case PathNodeType.EVIL_GRUNT_BATTLE: return "🔴";
    case PathNodeType.EVIL_ADMIN_BATTLE: return "🟣";
    case PathNodeType.RAND_PERMA_ITEM: return "🪩";
    case PathNodeType.GOLDEN_POKEBALL: return "🟡";
    case PathNodeType.ROGUE_BALL_ITEMS: return "⚫";
    case PathNodeType.MASTER_BALL_ITEMS: return "🟣";
    case PathNodeType.ABILITY_SWITCHERS: return "🔄";
    case PathNodeType.STAT_SWITCHERS: return "📊";
    case PathNodeType.GLITCH_PIECE: return "🧩";
    case PathNodeType.DNA_SPLICERS: return "🧬";
    case PathNodeType.MONEY: return "💰";
    case PathNodeType.PERMA_MONEY: return "💎";
    case PathNodeType.RELEASE_ITEMS: return "🔓";
    case PathNodeType.MINTS: return "🌿";
    case PathNodeType.EGG_VOUCHER: return "🥚";
    case PathNodeType.PP_MAX: return "⚡";
    case PathNodeType.COLLECTED_TYPE: return "📋";
    case PathNodeType.EXP_SHARE: return "📈";
    case PathNodeType.TYPE_SWITCHER: return "🔀";
    case PathNodeType.PASSIVE_ABILITY: return "🌟";
    case PathNodeType.ANY_TMS: return "💽";
    case PathNodeType.CHALLENGE_BOSS: return "🎯👑";
    case PathNodeType.CHALLENGE_RIVAL: return "🎯⚔️";
    case PathNodeType.CHALLENGE_EVIL_BOSS: return "🎯💀";
    case PathNodeType.CHALLENGE_CHAMPION: return "🎯🏆";
    case PathNodeType.CHALLENGE_REWARD: return "🎯🎁";
    default: return "❓";
  }
}

export function logVisualBattlePath(battlePath: BattlePath): void {

  for (let layerIndex = 0; layerIndex < battlePath.layers.length; layerIndex++) {
    const layer = battlePath.layers[layerIndex];
    

    const nodesByWave = new Map<number, PathNode[]>();
    for (const node of layer.nodes) {
      if (!nodesByWave.has(node.wave)) {
        nodesByWave.set(node.wave, []);
      }
      nodesByWave.get(node.wave)!.push(node);
    }

    const sortedWaves = Array.from(nodesByWave.keys()).sort((a, b) => a - b);
    
    for (const wave of sortedWaves) {
      const nodesAtWave = nodesByWave.get(wave)!;
      
      const regularNodesAtWave = nodesAtWave.filter(n => n.nodeType !== PathNodeType.CONVERGENCE_POINT);
      
      const nodeCount = regularNodesAtWave.length;

      console.log(`\nWave ${wave.toString().padStart(3)} (${nodeCount} choices):`);
      
      const branches = ['A', 'B', 'C'];
      let lineOutput = "    ";
      
      for (let i = 0; i < 3; i++) {
        const node = regularNodesAtWave[i];
        if (node) {
          const typeIcon = getNodeTypeIcon(node.nodeType);
          const requiredStr = node.isRequired ? "🔥" : " ";
          const metaStr = node.metadata?.rivalStage ? ` R${node.metadata.rivalStage}` : "";
          lineOutput += `[${branches[i]}] ${typeIcon}${requiredStr}${metaStr}`.padEnd(20);
        } else {
          lineOutput += "                    ";
        }
        if (i < 2) lineOutput += " │ ";
      }
      
      
      if (nodeCount > 3) {
        let extraLineOutput = "    ";
        for (let i = 3; i < Math.min(6, nodeCount); i++) {
          const node = regularNodesAtWave[i];
          if (node) {
            const typeIcon = getNodeTypeIcon(node.nodeType);
            const requiredStr = node.isRequired ? "🔥" : " ";
            const metaStr = node.metadata?.rivalStage ? ` R${node.metadata.rivalStage}` : "";
            extraLineOutput += `[${branches[i % 3]}+] ${typeIcon}${requiredStr}${metaStr}`.padEnd(20);
          }
          if (i < Math.min(5, nodeCount - 1)) extraLineOutput += " │ ";
        }
      }
    }

    if (layerIndex < battlePath.layers.length - 1) {
    }
  }

}

function addBidirectionalConnection(fromNode: PathNode, toNode: PathNode): void {
  const isChallengeRewardNode = (node: PathNode): boolean => {
    return node.nodeType === PathNodeType.CHALLENGE_REWARD;
  };
  
  if (!isChallengeRewardNode(fromNode) && !isChallengeRewardNode(toNode)) {
    if (Math.abs(fromNode.wave - toNode.wave) !== 1) {
      return;
    }
  }
  
  // if ((fromNode.id.includes('challenge_reward') && !toNode.id.includes('challenge')) || 
  //     (toNode.id.includes('challenge_reward') && !fromNode.id.includes('challenge'))) {
  //   return;
  // }
  if (!fromNode.connections.includes(toNode.id)) {
    fromNode.connections.push(toNode.id);
  }
  if (!toNode.previousConnections.includes(fromNode.id)) {
    toNode.previousConnections.push(fromNode.id);
  }
}

interface ConnectionBias {
  leftHeavy: number;
  rightHeavy: number;
  centerHeavy: number;
  wavesSinceLastBias: number;
  lastBiasDirection: 'left' | 'right' | 'center' | 'none';
}

function calculateConnectionBias(prevWaveNodes: PathNode[], seeds: any, waveIndex: number): 'left' | 'right' | 'center' | 'balanced' {
  if (prevWaveNodes.length === 0) return 'balanced';
  
  const leftConnections = prevWaveNodes.filter(n => n.position.x <= 1).reduce((sum, n) => sum + n.connections.length, 0);
  const rightConnections = prevWaveNodes.filter(n => n.position.x >= 2).reduce((sum, n) => sum + n.connections.length, 0);
  const centerConnections = prevWaveNodes.filter(n => n.position.x === 1 || n.position.x === 2).reduce((sum, n) => sum + n.connections.length, 0);
  
  const total = leftConnections + rightConnections + centerConnections;
  if (total === 0) return 'balanced';
  
  const leftRatio = leftConnections / total;
  const rightRatio = rightConnections / total;
  
  const randomFactor = (seeds.baseSeed + waveIndex * 137) % 100 / 100.0;
  
  if (leftRatio > 0.6 + randomFactor * 0.2) {
    return 'right';
  } else if (rightRatio > 0.6 + randomFactor * 0.2) {
    return 'left';
  } else if (Math.abs(leftRatio - rightRatio) < 0.3) {
    return 'center';
  }
  
  return 'balanced';
}

function getDirectionalProcessOrder(nodes: PathNode[], bias: 'left' | 'right' | 'center' | 'balanced', randomSeed: number): PathNode[] {
  const processOrder = [...nodes];
  
  if (bias === 'left') {
    processOrder.sort((a, b) => a.position.x - b.position.x);
  } else if (bias === 'right') {
    processOrder.sort((a, b) => b.position.x - a.position.x);
  } else if (bias === 'center') {
    processOrder.sort((a, b) => Math.abs(1.5 - a.position.x) - Math.abs(1.5 - b.position.x));
  } else {
    if ((randomSeed % 3) === 0) {
      processOrder.sort((a, b) => a.position.x - b.position.x);
    } else if ((randomSeed % 3) === 1) {
      processOrder.sort((a, b) => b.position.x - a.position.x);
    } else {
      for (let i = processOrder.length - 1; i > 0; i--) {
        const j = (randomSeed + i) % (i + 1);
        [processOrder[i], processOrder[j]] = [processOrder[j], processOrder[i]];
      }
    }
  }
  
  return processOrder;
}

export function outputAllWavesWithPaths(scene: BattleScene, battlePath: BattlePath): void {
  
  const specialNodeTypes = [
    PathNodeType.MAJOR_BOSS_BATTLE,
    PathNodeType.RECOVERY_BOSS,
    PathNodeType.ELITE_FOUR,
    PathNodeType.CHAMPION,
    PathNodeType.RIVAL_BATTLE,
    PathNodeType.EVIL_BOSS_BATTLE,
    PathNodeType.EVIL_GRUNT_BATTLE,
    PathNodeType.EVIL_ADMIN_BATTLE,
    PathNodeType.SMITTY_BATTLE,
    PathNodeType.CHALLENGE_BOSS,
    PathNodeType.CHALLENGE_RIVAL,
    PathNodeType.CHALLENGE_EVIL_BOSS,
    PathNodeType.CHALLENGE_CHAMPION,
    PathNodeType.CHALLENGE_REWARD
  ];

  const getNodeTypeName = (node: PathNode): string => {
    switch (node.nodeType) {
      case PathNodeType.MAJOR_BOSS_BATTLE: return "MAJOR_BOSS";
      case PathNodeType.ELITE_FOUR: return "ELITE_FOUR";
      case PathNodeType.CHAMPION: return "CHAMPION";
      case PathNodeType.RIVAL_BATTLE: return "RIVAL";
      case PathNodeType.EVIL_BOSS_BATTLE: 
        return node.metadata?.evilTeamType === 'boss' ? "EVIL_BOSS" : "EVIL_ADMIN";
      case PathNodeType.EVIL_GRUNT_BATTLE: return "EVIL_GRUNT";
      case PathNodeType.EVIL_ADMIN_BATTLE: return "EVIL_ADMIN";
      case PathNodeType.RECOVERY_BOSS: return "RECOVERY_BOSS";
      case PathNodeType.SMITTY_BATTLE: return "SMITTY";
      case PathNodeType.CHALLENGE_BOSS: return "CHALLENGE_BOSS";
      case PathNodeType.CHALLENGE_RIVAL: return "CHALLENGE_RIVAL";
      case PathNodeType.CHALLENGE_EVIL_BOSS: return "CHALLENGE_EVIL_BOSS";
      case PathNodeType.CHALLENGE_CHAMPION: return "CHALLENGE_CHAMPION";
      case PathNodeType.CHALLENGE_REWARD: return "CHALLENGE_REWARD";
      default: return "OTHER";
    }
  };


  for (let wave = 1; wave <= battlePath.totalWaves; wave++) {
    const nodesForWave = battlePath.waveToNodeMap.get(wave);
    
    if (nodesForWave && nodesForWave.length > 0) {
      const relevantNodes = nodesForWave.filter(node => 
        specialNodeTypes.includes(node.nodeType)
      );
      
      if (relevantNodes.length > 0) {
        
        relevantNodes.forEach((node, index) => {
          const nodeTypeName = getNodeTypeName(node);
          let extraInfo = "";
          
          if (node.metadata) {
            if (node.metadata.rivalStage !== undefined) {
              extraInfo += ` (stage ${node.metadata.rivalStage})`;
            }
            if (node.metadata.rivalType !== undefined) {
              extraInfo += ` (${node.metadata.rivalType})`;
            }
            if (node.metadata.eliteType !== undefined) {
              extraInfo += ` (${node.metadata.eliteType})`;
            }
            if (node.metadata.bossType !== undefined) {
              extraInfo += ` (${node.metadata.bossType})`;
            }
            if (node.metadata.evilTeamType !== undefined) {
              extraInfo += ` (${node.metadata.evilTeamType})`;
            }
            if (node.metadata.dynamicModeCount !== undefined) {
              extraInfo += ` [${node.metadata.dynamicModeCount} dynamic modes]`;
            }
          }
          
          if (node.dynamicMode && Object.keys(node.dynamicMode).length > 0) {
            const activeModes = Object.entries(node.dynamicMode)
              .filter(([, value]) => value)
              .map(([key]) => key)
              .join(', ');
            extraInfo += ` {${activeModes}}`;
          }
          
        });
      }
    }
  }
  
  
  const specialBattleCounts = {
    MAJOR_BOSS: 0,
    ELITE_FOUR: 0,
    CHAMPION: 0,
    RIVAL: 0,
    EVIL_BOSS: 0,
    EVIL_GRUNT: 0,
    EVIL_ADMIN: 0,
    SMITTY: 0
  };
  
  const specialBattleDetails = {
    MAJOR_BOSS: [] as {wave: number, nodeCount: number}[],
    ELITE_FOUR: [] as {wave: number, nodeCount: number}[],
    CHAMPION: [] as {wave: number, nodeCount: number}[],
    RIVAL: [] as {wave: number, nodeCount: number, stage?: number, rival?: any}[],
    EVIL_BOSS: [] as {wave: number, nodeCount: number}[],
    EVIL_GRUNT: [] as {wave: number, nodeCount: number}[],
    EVIL_ADMIN: [] as {wave: number, nodeCount: number}[],
    SMITTY: [] as {wave: number, nodeCount: number}[]
  };

  for (const [, node] of battlePath.nodeMap) {
    const nodeTypeName = getNodeTypeName(node);
    if (nodeTypeName in specialBattleCounts) {
      specialBattleCounts[nodeTypeName as keyof typeof specialBattleCounts]++;
      
      const nodesAtWave = battlePath.waveToNodeMap.get(node.wave) || [];
      const nodeCount = nodesAtWave.length;
      
      if (nodeCount === 1) {
        if (nodeTypeName === 'RIVAL') {
          specialBattleDetails.RIVAL.push({
            wave: node.wave, 
            nodeCount, 
            stage: node.metadata?.rivalStage,
            rival: node.metadata?.rivalType
          });
        } else {
          specialBattleDetails[nodeTypeName as keyof typeof specialBattleDetails].push({
            wave: node.wave, 
            nodeCount
          });
        }
      }
    }
  }
  
  Object.entries(specialBattleCounts).forEach(([type, count]) => {
    const details = specialBattleDetails[type as keyof typeof specialBattleDetails];
    const singleNodeBattles = details.length;
    
    if (singleNodeBattles > 0) {
      if (type === 'RIVAL') {
        const rivalDetails = details as {wave: number, nodeCount: number, stage?: number, rival?: any}[];
        const rivalInfo = rivalDetails.map(d => 
          `wave ${d.wave} (${d.nodeCount} nodes, stage ${d.stage || '?'}, rival ${d.rival || '?'})`
        ).join(', ');
      } else {
        const waveInfo = details.map(d => 
          `wave ${d.wave} (${d.nodeCount} nodes)`
        ).join(', ');
      }
    }
  });
}

export function logWavesWithSpecialBattles(scene: BattleScene): string {
  const battlePath = setupFixedBattlePaths(scene);
  
  const specialNodeTypes = [
    PathNodeType.MAJOR_BOSS_BATTLE,
    PathNodeType.RECOVERY_BOSS,
    PathNodeType.ELITE_FOUR, 
    PathNodeType.CHAMPION,
    PathNodeType.RIVAL_BATTLE,
    PathNodeType.EVIL_BOSS_BATTLE,
    PathNodeType.EVIL_GRUNT_BATTLE,
    PathNodeType.EVIL_ADMIN_BATTLE
  ];
  
  const getNodeTypeName = (nodeType: PathNodeType): string => {
    switch (nodeType) {
      case PathNodeType.MAJOR_BOSS_BATTLE: return "MAJOR_BOSS";
      case PathNodeType.ELITE_FOUR: return "ELITE_FOUR";
      case PathNodeType.CHAMPION: return "CHAMPION";
      case PathNodeType.RIVAL_BATTLE: return "RIVAL";
      case PathNodeType.EVIL_BOSS_BATTLE: return "EVIL_BOSS";
      case PathNodeType.EVIL_GRUNT_BATTLE: return "EVIL_GRUNT";
      case PathNodeType.EVIL_ADMIN_BATTLE: return "EVIL_ADMIN";
      default: return "TRAINER";
    }
  };

  let output = "";
  
  for (let wave = 1; wave <= battlePath.totalWaves; wave++) {
    const nodesForWave = battlePath.waveToNodeMap.get(wave);
    
    if (nodesForWave && nodesForWave.length > 0) {
      const specialNodes = nodesForWave.filter(node => 
        specialNodeTypes.includes(node.nodeType)
      );
      
      if (specialNodes.length > 0) {
        output += `wave ${wave} (${specialNodes.length} nodes):\n`;
        
        specialNodes.forEach((node, index) => {
          const nodeTypeName = getNodeTypeName(node.nodeType);
          let extraInfo = "";
          
          if (node.metadata?.dynamicModeCount !== undefined) {
            extraInfo += ` [${node.metadata.dynamicModeCount} dynamic modes]`;
          }
          
          if (node.dynamicMode && Object.keys(node.dynamicMode).length > 0) {
            const activeModes = Object.entries(node.dynamicMode)
              .filter(([, value]) => value)
              .map(([key]) => key)
              .join(', ');
            extraInfo += ` {${activeModes}}`;
          }
          
          output += `  node ${index + 1}: ${nodeTypeName}${extraInfo}\n`;
        });
        output += "\n";
      }
    }
  }
  
  return output;
}

function createEvilBossBattle(scene: BattleScene, seedOffset: number = 35): FixedBattleConfig {
  const hasDefeatedEvilBoss = scene.gameData.gameStats?.trainersDefeated > 0 && 
    scene.gameData.gameStats?.battles > 20;
  
  const bossTypes = hasDefeatedEvilBoss ? 
    TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND : 
    TRAINER_TYPES.EVIL_TEAM_BOSSES.FIRST;
  
  return createTrainerBattle(bossTypes, seedOffset, false);
}

function generateWaveBasedNode(wave: number, scene: BattleScene, seeds: any, nodeIndex: number = 0): NodeGenerationResult {
  const config = getWaveRangeConfig(wave);
  const probabilities = config.probabilities;
  const dynamicMode = config.dynamicMode;

  scene.resetSeed(seeds.baseSeed + wave * 1000 + nodeIndex * 100);
  
  const nodeOutcomes = Object.entries(probabilities).map(([nodeTypeStr, weight]) => ({
    weight,
    nodeType: parseInt(nodeTypeStr) as PathNodeType
  }));
  
  const totalWeight = nodeOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  const randomValue = Utils.randSeedInt(totalWeight);
  let currentWeight = 0;
  
  for (const outcomeData of nodeOutcomes) {
    currentWeight += outcomeData.weight;
    if (randomValue < currentWeight) {
      let battleConfig: FixedBattleConfig | undefined;
      
      switch (outcomeData.nodeType) {
        case PathNodeType.TRAINER_BATTLE:
          battleConfig = undefined;
          break;
        case PathNodeType.ELITE_FOUR:
          const eliteFourTypes = [
            TRAINER_TYPES.ELITE_FOUR.FIRST,
            TRAINER_TYPES.ELITE_FOUR.SECOND,
            TRAINER_TYPES.ELITE_FOUR.THIRD,
            TRAINER_TYPES.ELITE_FOUR.FOURTH
          ];
          const randomEliteType = eliteFourTypes[Utils.randSeedInt(eliteFourTypes.length)];
          battleConfig = createEliteFourBattle(randomEliteType, false, seeds.baseSeed);
          break;
        case PathNodeType.CHAMPION:
          battleConfig = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, true, seeds.baseSeed);
          break;
        case PathNodeType.MAJOR_BOSS_BATTLE:
        case PathNodeType.RECOVERY_BOSS:
          battleConfig = undefined;
          break;
        case PathNodeType.EVIL_BOSS_BATTLE:
          battleConfig = createEvilBossBattle(scene, 35);
          break;
        case PathNodeType.MYSTERY_NODE:
          battleConfig = undefined;
          break;
        case PathNodeType.WILD_POKEMON:
        case PathNodeType.RIVAL_BATTLE:
        case PathNodeType.EVIL_GRUNT_BATTLE:
        case PathNodeType.EVIL_ADMIN_BATTLE:
        case PathNodeType.SMITTY_BATTLE:
        case PathNodeType.CONVERGENCE_POINT:
        case PathNodeType.ITEM_GENERAL:
        case PathNodeType.ADD_POKEMON:
        case PathNodeType.ITEM_TM:
        case PathNodeType.ITEM_BERRY:
        case PathNodeType.RAND_PERMA_ITEM:
        case PathNodeType.PERMA_ITEMS:
        case PathNodeType.GOLDEN_POKEBALL:
        case PathNodeType.ROGUE_BALL_ITEMS:
        case PathNodeType.MASTER_BALL_ITEMS:
        case PathNodeType.ABILITY_SWITCHERS:
        case PathNodeType.STAT_SWITCHERS:
        case PathNodeType.GLITCH_PIECE:
        case PathNodeType.DNA_SPLICERS:
        case PathNodeType.MONEY:
        case PathNodeType.PERMA_MONEY:
        case PathNodeType.RELEASE_ITEMS:
        case PathNodeType.MINTS:
        case PathNodeType.EGG_VOUCHER:
        case PathNodeType.PP_MAX:
        case PathNodeType.COLLECTED_TYPE:
        case PathNodeType.EXP_SHARE:
        case PathNodeType.TYPE_SWITCHER:
        case PathNodeType.PASSIVE_ABILITY:
        case PathNodeType.ANY_TMS:
        case PathNodeType.CHALLENGE_REWARD:
          battleConfig = undefined;
          break;
      }
      
      return {
        nodeType: outcomeData.nodeType,
        battleConfig,
        dynamicMode
      };
    }
  }
  
  return {
    nodeType: nodeOutcomes.length > 0 ? nodeOutcomes[0].nodeType : PathNodeType.WILD_POKEMON,
    dynamicMode
  };
}

export interface DynamicMode {
  isNuzlocke?: boolean;
  isNuzlight?: boolean;
  isNightmare?: boolean;
  noExpGain?: boolean;
  noCatch?: boolean;
  hasPassiveAbility?: boolean;
  invertedTypes?: boolean;
  boostedTrainer?: boolean;
  multiLegendaries?: boolean;
  multiBoss?: boolean;
  noInitialSwitch?: boolean;
  autoPressured?: boolean;
  noStatBoosts?: boolean;
  noStatusMoves?: boolean;
  noPhysicalMoves?: boolean;
  noSpecialMoves?: boolean;
  statSwap?: boolean;
  noSTAB?: boolean;
  trickRoom?: boolean;
  noSwitch?: boolean;
  noResistances?: boolean;
  noHealingItems?: boolean;
  autoTorment?: boolean;
  legendaryNerf?: boolean;
  typeExtraDamage?: Type | boolean;
  pokemonNerf?: Species | boolean;
}

interface WaveRange {
  start: number;
  end: number;
  probabilities: { [key in PathNodeType]?: number };
  dynamicMode?: DynamicMode;
}

interface NodeGenerationResult {
  nodeType: PathNodeType;
  battleConfig?: FixedBattleConfig;
  dynamicMode?: DynamicMode;
}

function generateDynamicModeForWave(wave: number, scene: BattleScene, seeds: any): DynamicMode | undefined {
  if (wave <= 150) {
    return undefined;
  }

  const dynamicModeProperties: (keyof DynamicMode)[] = [
    'isNuzlight',
    'noCatch',
    'noExpGain',
    'hasPassiveAbility',
    'invertedTypes',
    'boostedTrainer',
    'multiLegendaries',
    'multiBoss',
    'noInitialSwitch',
    'autoPressured',
    'noStatBoosts',
    'noStatusMoves',
    'noPhysicalMoves',
    'noSpecialMoves',
    'statSwap',
    'noSTAB',
    'trickRoom',
    'noSwitch',
    'noResistances',
    'noHealingItems',
    'autoTorment',
    'legendaryNerf',
    'typeExtraDamage',
    'pokemonNerf'
  ];

  const numPropertiesToAdd = Math.floor((wave - 150) / 150) + 1;
  const maxProperties = Math.min(numPropertiesToAdd, dynamicModeProperties.length);

  if (maxProperties <= 0) {
    return undefined;
  }

  scene.resetSeed(seeds.baseSeed + wave * 777);
  
  const selectedProperties: (keyof DynamicMode)[] = [];
  const availableProperties = [...dynamicModeProperties];

  for (let i = 0; i < maxProperties; i++) {
    if (availableProperties.length === 0) break;
    
    const randomIndex = Utils.randSeedInt(availableProperties.length);
    const selectedProperty = availableProperties[randomIndex];
    selectedProperties.push(selectedProperty);
    availableProperties.splice(randomIndex, 1);
  }

  const dynamicMode: DynamicMode = {};
  selectedProperties.forEach(property => {
    if (property === 'typeExtraDamage') {
      dynamicMode[property] = Type.NORMAL;
    } else if (property === 'pokemonNerf') {
      dynamicMode[property] = Species.BULBASAUR;
    } else {
      dynamicMode[property] = true;
    }
  });

  const moveRestrictionProperties = ['noStatusMoves', 'noPhysicalMoves', 'noSpecialMoves'];
  const activeMoveRestrictions = moveRestrictionProperties.filter(prop => dynamicMode[prop]);
  
  if (activeMoveRestrictions.length >= 2) {
    const keepIndex = Utils.randSeedInt(activeMoveRestrictions.length);
    const propertyToKeep = activeMoveRestrictions[keepIndex];
    const propertiesToRemove = activeMoveRestrictions.filter((_, index) => index !== keepIndex);
    
    propertiesToRemove.forEach(property => {
      delete dynamicMode[property];
    });
    
    const remainingProperties = dynamicModeProperties.filter(prop => 
      !selectedProperties.includes(prop) && 
      !moveRestrictionProperties.includes(prop)
    );
    
    for (let i = 0; i < propertiesToRemove.length; i++) {
      if (remainingProperties.length > 0) {
        const randomIndex = Utils.randSeedInt(remainingProperties.length);
        const replacementProperty = remainingProperties[randomIndex];
        if (replacementProperty === 'typeExtraDamage') {
          dynamicMode[replacementProperty] = Type.NORMAL;
        } else if (replacementProperty === 'pokemonNerf') {
          dynamicMode[replacementProperty] = Species.BULBASAUR;
        } else {
          dynamicMode[replacementProperty] = true;
        }
        remainingProperties.splice(randomIndex, 1);
      }
    }
  }

  return dynamicMode;
}

interface ChallengePathInfo {
  startWave: number;
  nodeCount: number;
  challengeType: 'nightmare' | 'nuzlocke' | 'nuzlight';
  additionalProperties: (keyof DynamicMode)[];
  nodes: PathNode[];
  rewardNode: PathNode;
}

function generateChallengePath(
  scene: BattleScene,
  startWave: number,
  waveRange: number,
  seeds: any,
  existingWaves: Set<number>
): ChallengePathInfo | null {
  const rangeStart = waveRange;
  const rangeEnd = rangeStart + 74;
  
  scene.resetSeed(seeds.baseSeed + startWave * 1337);
  
  const nodeCount = Utils.randSeedInt(100) < 40 ? 4 : (Utils.randSeedInt(100) < 70 ? 5 : 3);
  
  let challengeType: 'nightmare' | 'nuzlocke' | 'nuzlight';
  if (nodeCount === 3) {
    challengeType = 'nightmare';
  } else if (nodeCount === 4) {
    challengeType = Utils.randSeedInt(100) < 80 ? 'nuzlocke' : 'nuzlight';
  } else {
    challengeType = Utils.randSeedInt(2) === 0 ? 'nuzlocke' : 'nuzlight';
  }
  
  const additionalPropertiesCount = calculateAdditionalPropertiesCount(rangeStart, 999999);
  const additionalProperties: (keyof DynamicMode)[] = [];
  
  if (additionalPropertiesCount > 0) {
    const availableProperties: (keyof DynamicMode)[] = [
      'noCatch', 'noExpGain', 'hasPassiveAbility', 'invertedTypes',
      'boostedTrainer', 'multiLegendaries', 'multiBoss', 'noInitialSwitch',
      'autoPressured', 'noStatBoosts', 'noStatusMoves', 'noPhysicalMoves', 'noSpecialMoves', 'statSwap',
      'noSTAB', 'trickRoom', 'noSwitch',
      'noResistances', 'noHealingItems', 'autoTorment', 'legendaryNerf', 'typeExtraDamage', 'pokemonNerf'
    ];
    
    const propertiesToAdd = Math.min(additionalPropertiesCount, availableProperties.length);
    for (let i = 0; i < propertiesToAdd; i++) {
      const randomIndex = Utils.randSeedInt(availableProperties.length);
      additionalProperties.push(availableProperties[randomIndex]);
      availableProperties.splice(randomIndex, 1);
    }
  }
  
  const waveNodeTracker = new Map<number, Set<number>>();
  
  if (!checkChallengeSlotAvailability(startWave, nodeCount, rangeEnd, waveNodeTracker, existingWaves)) {
    return null;
  }
  
  for (let i = 0; i <= nodeCount; i++) {
    existingWaves.add(startWave + i);
  }
  
  const { nodes, rewardNode } = constructChallengePathNodes(
    scene,
    startWave,
    nodeCount,
    challengeType,
    additionalProperties,
    seeds
  );
  
  
  return {
    startWave,
    nodeCount,
    challengeType,
    additionalProperties,
    nodes,
    rewardNode
  };
}

export function testChallengePathGeneration(scene: BattleScene): void {
  
  const CHALLENGE_RANGES = generateChallengeRanges(500);
  
  const seeds = {
    baseSeed: 12345,
    rivalSelection: 67890,
    challengePath: 11111
  };
  
  const existingWaves = new Set<number>();
  
  for (const range of CHALLENGE_RANGES) {
    
    const challengePath = generateChallengePath(
      scene,
      range.start + 10,
      range.start,
      seeds,
      existingWaves
    );
    
    if (challengePath) {
      
      challengePath.nodes.forEach(node => {
        const dynamicModeCount = node.dynamicMode ? Object.keys(node.dynamicMode).length : 0;
        if (node.dynamicMode) {
          const activeProperties = Object.keys(node.dynamicMode).filter(key => node.dynamicMode![key as keyof DynamicMode]);
        }
      });
    } else {
    }
  }
  
}

function checkChallengeSlotAvailability(
  startWave: number,
  nodeCount: number,
  rangeEnd: number,
  waveNodeTracker: Map<number, Set<number>>,
  existingWaves: Set<number>
): boolean {
  const CHALLENGE_BRANCH_FIRST = 2;
  const CHALLENGE_BRANCH_OTHER = 3;
  
  const requiredWaves = nodeCount + 1;
  
  if (startWave + requiredWaves - 1 > rangeEnd) {
    return false;
  }
  
  for (let i = 0; i < requiredWaves; i++) {
    const wave = startWave + i;
    
    if (existingWaves.has(wave)) {
      return false;
    }
    
    const requiredBranch = i === 0 ? CHALLENGE_BRANCH_FIRST : CHALLENGE_BRANCH_OTHER;
    const occupiedBranches = waveNodeTracker.get(wave);
    
    if (occupiedBranches && occupiedBranches.has(requiredBranch)) {
      return false;
    }
  }
  
  return true;
}

function debugChallengeSlotSearch(
  layerRangeStart: number,
  layerRangeEnd: number,
  nodeCount: number,
  waveNodeTracker: Map<number, Set<number>>,
  existingWaves: Set<number>
): void {
  
  const maxSearchWave = layerRangeEnd - nodeCount;
  let availableSlots = 0;
  let conflictReasons: string[] = [];
  
  for (let wave = layerRangeStart; wave <= maxSearchWave; wave++) {
    const isAvailable = checkChallengeSlotAvailability(wave, nodeCount, layerRangeEnd, waveNodeTracker, existingWaves);
    
    if (isAvailable) {
      availableSlots++;
    } else {
      let reason = '';
      if (wave + nodeCount > layerRangeEnd) {
        reason = 'extends beyond range';
      } else {
        const conflicts = [];
        for (let i = 0; i <= nodeCount; i++) {
          const checkWave = wave + i;
          if (existingWaves.has(checkWave)) {
            conflicts.push(`W${checkWave}:existing`);
          } else {
            const requiredBranch = i === 0 ? 2 : 3;
            const occupiedBranches = waveNodeTracker.get(checkWave);
            if (occupiedBranches && occupiedBranches.has(requiredBranch)) {
              conflicts.push(`W${checkWave}:B${requiredBranch}`);
            }
          }
        }
        reason = conflicts.join(', ');
      }
      if (!conflictReasons.includes(reason)) {
        conflictReasons.push(reason);
      }
    }
  }
  
  if (conflictReasons.length > 0) {
  }
}

function constructChallengePathNodes(
  scene: BattleScene,
  startWave: number,
  nodeCount: number,
  challengeType: 'nightmare' | 'nuzlocke' | 'nuzlight',
  additionalProperties: (keyof DynamicMode)[],
  seeds: any
): { nodes: PathNode[]; rewardNode: PathNode } {
  const challengeNodeTypes = [
    PathNodeType.CHALLENGE_BOSS,
    PathNodeType.CHALLENGE_RIVAL,
    PathNodeType.CHALLENGE_EVIL_BOSS,
    PathNodeType.CHALLENGE_CHAMPION
  ];
  
  const nodes: PathNode[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const wave = startWave + i;
    const nodeType = challengeNodeTypes[Utils.randSeedInt(challengeNodeTypes.length)];
    
    const dynamicMode: DynamicMode = {};
    
    if (challengeType === 'nightmare') {
      dynamicMode.isNightmare = true;
    } else if (challengeType === 'nuzlocke') {
      dynamicMode.isNuzlocke = true;
    } else if (challengeType === 'nuzlight') {
      dynamicMode.isNuzlight = true;
    }
    
    additionalProperties.forEach(prop => {
      dynamicMode[prop] = true;
    });
    
    let battleConfig: FixedBattleConfig | undefined;
    let metadata: any = {
      challengeType,
      challengeNodeIndex: i + 1,
      totalChallengeNodes: nodeCount,
      dynamicModeCount: Object.keys(dynamicMode).length
    };
    
    switch (nodeType) {
      case PathNodeType.CHALLENGE_BOSS:
        battleConfig = undefined;
        metadata.bossType = 'challenge_major';
        break;
      case PathNodeType.CHALLENGE_RIVAL:
        const randomRival = getDynamicRivalType(6, scene.gameData, true);
        battleConfig = createRivalBattle(6, randomRival, Utils.randSeedInt(100) < 20);
        metadata.rivalStage = 6;
        metadata.rivalType = randomRival;
        break;
      case PathNodeType.CHALLENGE_EVIL_BOSS:
        battleConfig = createTrainerBattle(TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND, 35, false);
        metadata.evilTeamType = 'boss';
        break;
      case PathNodeType.CHALLENGE_CHAMPION:
        battleConfig = createEliteFourBattle(TRAINER_TYPES.ELITE_FOUR.CHAMPION, true, seeds.baseSeed);
        break;
    }
    
    const branch = i === 0 ? 3 : 4;
    
    const node = createPathNode(
      wave,
      nodeType,
      branch,
      battleConfig,
      metadata,
      dynamicMode
    );
    
    nodes.push(node);
  }
  
  const rewardWave = startWave + nodeCount;
  const rewardNodeType = Utils.randSeedInt(100) < 50 ? 'master_ball' : 'golden_pokeball';
  const rewardNode = createPathNode(
    rewardWave,
    PathNodeType.CHALLENGE_REWARD,
    4,
    undefined,
    {
      challengeReward: true,
      rewardType: rewardNodeType
    }
  );
  
  for (let i = 0; i < nodes.length - 1; i++) {
    addBidirectionalConnection(nodes[i], nodes[i + 1]);
  }
  addBidirectionalConnection(nodes[nodes.length - 1], rewardNode);
  
  return { nodes, rewardNode };
}

export function getDynamicModeLocalizedString(mode: DynamicModes): { name: string; description: string; formatted: string } | null {
  if (mode === DynamicModes.NONE) {
    return null;
  }

  const modeMap: { [key in DynamicModes]: string } = {
    [DynamicModes.NONE]: "",
    [DynamicModes.IS_NUZLOCKE]: "nodeMode:challenge:isNuzlocke",
    [DynamicModes.IS_NUZLIGHT]: "nodeMode:challenge:isNuzlight",
    [DynamicModes.IS_NIGHTMARE]: "nodeMode:challenge:isNightmare",
    [DynamicModes.NO_EXP_GAIN]: "nodeMode:challenge:noExpGain",
    [DynamicModes.NO_CATCH]: "nodeMode:challenge:noCatch",
    [DynamicModes.HAS_PASSIVE_ABILITY]: "nodeMode:challenge:hasPassiveAbility",
    [DynamicModes.INVERTED_TYPES]: "nodeMode:challenge:invertedTypes",
    [DynamicModes.BOOSTED_TRAINER]: "nodeMode:challenge:boostedTrainer",
    [DynamicModes.MULTI_LEGENDARIES]: "nodeMode:challenge:multiLegendaries",
    [DynamicModes.MULTI_BOSS]: "nodeMode:challenge:multiBoss",
    [DynamicModes.NO_INITIAL_SWITCH]: "nodeMode:challenge:noInitialSwitch",
    [DynamicModes.AUTO_PRESSURED]: "nodeMode:challenge:autoPressured",
    [DynamicModes.NO_STAT_BOOSTS]: "nodeMode:challenge:noStatBoosts",
    [DynamicModes.NO_STATUS_MOVES]: "nodeMode:challenge:noStatusMoves",
    [DynamicModes.NO_PHYSICAL_MOVES]: "nodeMode:challenge:noPhysicalMoves",
    [DynamicModes.NO_SPECIAL_MOVES]: "nodeMode:challenge:noSpecialMoves",
    [DynamicModes.STAT_SWAP]: "nodeMode:challenge:statSwap",
    [DynamicModes.NO_STAB]: "nodeMode:challenge:noStab",
    [DynamicModes.TRICK_ROOM]: "nodeMode:challenge:trickRoom",
    [DynamicModes.NO_SWITCH]: "nodeMode:challenge:noSwitch",
    [DynamicModes.NO_RESISTANCES]: "nodeMode:challenge:noResistances",
    [DynamicModes.NO_HEALING_ITEMS]: "nodeMode:challenge:noHealingItems",
    [DynamicModes.AUTO_TORMENT]: "nodeMode:challenge:autoTorment",
    [DynamicModes.LEGENDARY_NERF]: "nodeMode:challenge:legendaryNerf",
    [DynamicModes.TYPE_EXTRA_DAMAGE]: "nodeMode:challenge:typeExtraDamage",
    [DynamicModes.POKEMON_NERF]: "nodeMode:challenge:pokemonNerf"
  };

  const challengeKey = modeMap[mode];
  if (!challengeKey) {
    return null;
  }

  const name = i18next.t(`${challengeKey}.name`);
  const description = i18next.t(`${challengeKey}.description`);
  const challengeText = i18next.t(`nodeMode:challenge:chaosChallenge`);
  
  return {
    name,
    description,
    formatted: `${challengeText} ${name}: ${description}`
  };
}

export function resetBattlePathGlobalState(): void {
  currentBattlePath = null;
}

