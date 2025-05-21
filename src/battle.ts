import BattleScene from "./battle-scene";
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

export enum BattleType {
    WILD,
    TRAINER,
    CLEAR
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

    if (this.gameMode.isBoss(waveIndex) || this.gameMode.isWavePreFinal(this.scene, waveIndex)) {

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


    // const userLocale = navigator.language || "en-US";
    // const formattedMoneyAmount = moneyAmount.value.toLocaleString(userLocale);
    // const message = i18next.t("battle:moneyPickedUp", { moneyAmount: formattedMoneyAmount });
    // scene.queueMessage(message, undefined, true);

    if(scene.currentBattle.battleType == BattleType.TRAINER) {
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
    console.log(`Battle Score: ${finalBattleScore} (${this.turn - 1} Turns x${Math.floor(turnMultiplier * 100) / 100})`);
    console.log(`Total Score: ${scene.score}`);
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
      console.log("Battle Seed:", this.battleSeed);
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

export function createSmittyBattle(scene: BattleScene, seed: number): FixedBattleConfig {
    
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

           
            pokemon.setBoss(true, specificFormSlots.has(i) ? 4 : 3);
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
            gruntPlacement: getUniqueHash('_etg'),
            adminPlacement: getUniqueHash('_eta'),
            bossPlacement: getUniqueHash('_etb'),
            trainerGeneration: getUniqueHash('_ett')
        }
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
            const primaryRival = getDynamicRivalType(1, scene.gameData, scene);
            
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
