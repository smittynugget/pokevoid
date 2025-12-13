import * as Utils from "../utils";
import i18next from "i18next";
import { defaultStarterSpecies, DexAttrProps, GameData } from "#app/system/game-data.js";
import PokemonSpecies, { getPokemonSpecies, getPokemonSpeciesForm, speciesStarters } from "./pokemon-species";
import Pokemon, { PokemonMove } from "#app/field/pokemon.js";
import { BattleType, FixedBattleConfig } from "#app/battle.js";
import Trainer, { TrainerVariant } from "#app/field/trainer.js";
import { GameMode } from "#app/game-mode.js";
import { Type } from "./type";
import { Challenges } from "#enums/challenges";
import { Species } from "#enums/species";
import { TrainerType } from "#enums/trainer-type";
import { Nature } from "./nature";
import { Moves } from "#app/enums/moves.js";
import { TypeColor, TypeShadow } from "#app/enums/color.js";
import { Gender } from "./gender";
import { pokemonEvolutions } from "./pokemon-evolutions";
import { pokemonFormChanges } from "./pokemon-forms";
const DEFAULT_PARTY_MAX_COST = 10;
export enum ChallengeType {

  STARTER_CHOICE,

  STARTER_POINTS,

  STARTER_COST,

  STARTER_MODIFY,

  POKEMON_IN_BATTLE,

  FIXED_BATTLES,

  TYPE_EFFECTIVENESS,

  AI_LEVEL,

  AI_MOVE_SLOTS,

  PASSIVE_ACCESS,

  GAME_MODE_MODIFY,

  MOVE_ACCESS,

  MOVE_WEIGHT,
}
export enum MoveSourceType {
  LEVEL_UP,
  RELEARNER,
  COMMON_TM,
  GREAT_TM,
  ULTRA_TM,
  COMMON_EGG,
  RARE_EGG
}
export abstract class Challenge {
  public id: Challenges;

  public value: integer;
  public maxValue: integer;
  public severity: integer;
  public maxSeverity: integer;

  public conditions: ChallengeCondition[];
  constructor(id: Challenges, maxValue: integer = Number.MAX_SAFE_INTEGER) {
    this.id = id;

    this.value = 0;
    this.maxValue = maxValue;
    this.severity = 0;
    this.maxSeverity = 0;
    this.conditions = [];
  }
  reset(): void {
    this.value = 0;
    this.severity = 0;
  }
  geti18nKey(): string {
    return Challenges[this.id].split("_").map((f, i) => i ? `${f[0]}${f.slice(1).toLowerCase()}` : f.toLowerCase()).join("");
  }
  isUnlocked(data: GameData): boolean {
    return this.conditions.every(f => f(data));
  }
  condition(condition: ChallengeCondition): Challenge {
    this.conditions.push(condition);

    return this;
  }
  getName(): string {
    return i18next.t(`challenges:${this.geti18nKey()}.name`);
  }
  getValue(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    return i18next.t(`challenges:${this.geti18nKey()}.value.${this.value}`);
  }
  getDescription(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    return `${i18next.t([`challenges:${this.geti18nKey()}.desc.${this.value}`, `challenges:${this.geti18nKey()}.desc`])}`;
  }
  increaseValue(): boolean {
    if (this.value < this.maxValue) {
      this.value = Math.min(this.value + 1, this.maxValue);
      return true;
    }
    return false;
  }
  decreaseValue(): boolean {
    if (this.value > 0) {
      this.value = Math.max(this.value - 1, 0);
      return true;
    }
    return false;
  }
  hasSeverity(): boolean {
    return this.value !== 0 && this.maxSeverity > 0;
  }
  decreaseSeverity(): boolean {
    if (this.severity > 0) {
      this.severity = Math.max(this.severity - 1, 0);
      return true;
    }
    return false;
  }
  increaseSeverity(): boolean {
    if (this.severity < this.maxSeverity) {
      this.severity = Math.min(this.severity + 1, this.maxSeverity);
      return true;
    }
    return false;
  }
  getDifficulty(): integer {
    return this.value;
  }
  getMinDifficulty(): integer {
    return 0;
  }
  static loadChallenge(source: Challenge | any): Challenge {
    throw new Error("Method not implemented! Use derived class");
  }
  applyStarterChoice(pokemon: PokemonSpecies, valid: Utils.BooleanHolder, dexAttr: DexAttrProps, soft: boolean = false): boolean {
    return false;
  }
  applyStarterPoints(points: Utils.NumberHolder): boolean {
    return false;
  }
  applyStarterCost(species: Species, cost: Utils.NumberHolder): boolean {
    return false;
  }
  applyStarterModify(pokemon: Pokemon): boolean {
    return false;
  }
  applyPokemonInBattle(pokemon: Pokemon, valid: Utils.BooleanHolder): boolean {
    return false;
  }
  applyFixedBattle(waveIndex: Number, battleConfig: FixedBattleConfig): boolean {
    return false;
  }
  applyTypeEffectiveness(effectiveness: Utils.NumberHolder): boolean {
    return false;
  }
  applyLevelChange(level: Utils.IntegerHolder, levelCap: number, isTrainer: boolean, isBoss: boolean): boolean {
    return false;
  }
  applyMoveSlot(pokemon: Pokemon, moveSlots: Utils.IntegerHolder): boolean {
    return false;
  }
  applyPassiveAccess(pokemon: Pokemon, hasPassive: Utils.BooleanHolder): boolean {
    return false;
  }
  applyGameModeModify(gameMode: GameMode): boolean {
    return false;
  }
  applyMoveAccessLevel(pokemon: Pokemon, moveSource: MoveSourceType, move: Moves, level: Utils.IntegerHolder): boolean {
    return false;
  }
  applyMoveWeight(pokemon: Pokemon, moveSource: MoveSourceType, move: Moves, level: Utils.IntegerHolder): boolean {
    return false;
  }
}

type ChallengeCondition = (data: GameData) => boolean;
export class SingleGenerationChallenge extends Challenge {
  constructor() {
    super(Challenges.SINGLE_GENERATION, 9);
    }

  applyStarterChoice(pokemon: PokemonSpecies, valid: Utils.BooleanHolder, dexAttr: DexAttrProps, soft: boolean = false): boolean {
    const generations = [pokemon.generation];
    if (soft) {
      const speciesToCheck = [pokemon.speciesId];
          while (speciesToCheck.length) {
            const checking = speciesToCheck.pop();
        if (checking && pokemonEvolutions.hasOwnProperty(checking)) {
              pokemonEvolutions[checking].forEach(e => {
                speciesToCheck.push(e.speciesId);
                generations.push(getPokemonSpecies(e.speciesId).generation);
              });
            }
          }
        }
        if (!generations.includes(this.value)) {
      valid.value = false;
          return true;
        }
    return false;
  }

  applyPokemonInBattle(pokemon: Pokemon, valid: Utils.BooleanHolder): boolean {
        const baseGeneration = pokemon.species.speciesId === Species.VICTINI ? 5 : getPokemonSpecies(pokemon.species.speciesId).generation;
    const fusionGeneration = pokemon.isFusion() ? pokemon.fusionSpecies?.speciesId === Species.VICTINI ? 5 : getPokemonSpecies(pokemon.fusionSpecies!.speciesId).generation : 0;
        if (pokemon.isPlayer() && (baseGeneration !== this.value || (pokemon.isFusion() && fusionGeneration !== this.value))) {
      valid.value = false;
          return true;
        }
    return false;
  }

  applyFixedBattle(waveIndex: Number, battleConfig: FixedBattleConfig): boolean {
        let trainerTypes: TrainerType[] = [];
        switch (waveIndex) {
          case 182:
            trainerTypes = [ TrainerType.LORELEI, TrainerType.WILL, TrainerType.SIDNEY, TrainerType.AARON, TrainerType.SHAUNTAL, TrainerType.MALVA, Utils.randSeedItem([ TrainerType.HALA, TrainerType.MOLAYNE ]),TrainerType.MARNIE_ELITE, TrainerType.RIKA ];
            break;
          case 184:
            trainerTypes = [ TrainerType.BRUNO, TrainerType.KOGA, TrainerType.PHOEBE, TrainerType.BERTHA, TrainerType.MARSHAL, TrainerType.SIEBOLD, TrainerType.OLIVIA, TrainerType.NESSA_ELITE, TrainerType.POPPY ];
            break;
          case 186:
            trainerTypes = [ TrainerType.AGATHA, TrainerType.BRUNO, TrainerType.GLACIA, TrainerType.FLINT, TrainerType.GRIMSLEY, TrainerType.WIKSTROM, TrainerType.ACEROLA, Utils.randSeedItem([TrainerType.BEA_ELITE,TrainerType.ALLISTER_ELITE]), TrainerType.LARRY_ELITE ];
            break;
          case 188:
            trainerTypes = [ TrainerType.LANCE, TrainerType.KAREN, TrainerType.DRAKE, TrainerType.LUCIAN, TrainerType.CAITLIN, TrainerType.DRASNA, TrainerType.KAHILI, TrainerType.RAIHAN_ELITE, TrainerType.HASSEL ];
            break;
          case 190:
            trainerTypes = [ TrainerType.BLUE, Utils.randSeedItem([ TrainerType.RED, TrainerType.LANCE_CHAMPION ]), Utils.randSeedItem([ TrainerType.STEVEN, TrainerType.WALLACE ]), TrainerType.CYNTHIA, Utils.randSeedItem([ TrainerType.ALDER, TrainerType.IRIS ]), TrainerType.DIANTHA, TrainerType.HAU, TrainerType.LEON, Utils.randSeedItem([ TrainerType.GEETA, TrainerType.NEMONA ]) ];
            break;
        }
        if (trainerTypes.length === 0) {
          return false;
        } else {
          battleConfig.setBattleType(BattleType.TRAINER).setGetTrainerFunc(scene => new Trainer(scene, trainerTypes[this.value - 1], TrainerVariant.DEFAULT));
          return true;
        }
    }
  getDifficulty(): number {
    return this.value > 0 ? 1 : 0;
  }
  getValue(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    if (this.value === 0) {
      return i18next.t("settings:off");
    }
    return i18next.t(`starterSelectUiHandler:gen${this.value}`);
  }
  getDescription(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    if (this.value === 0) {
      return i18next.t("challenges:singleGeneration.desc_default");
    }
    return i18next.t("challenges:singleGeneration.desc", { gen: i18next.t(`challenges:singleGeneration.gen_${this.value}`) });
  }
  static loadChallenge(source: SingleGenerationChallenge | any): SingleGenerationChallenge {
    const newChallenge = new SingleGenerationChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }
}

interface monotypeOverride {

  species: Species;

  type: Type;

  fusion: boolean;
}
export class SingleTypeChallenge extends Challenge {
  private static TYPE_OVERRIDES: monotypeOverride[] = [
    {species: Species.MELOETTA, type: Type.PSYCHIC, fusion: true},
    {species: Species.CASTFORM, type: Type.NORMAL, fusion: false},
  ];

  constructor() {
    super(Challenges.SINGLE_TYPE, 18);
    }

  applyStarterChoice(pokemon: PokemonSpecies, valid: Utils.BooleanHolder, dexAttr: DexAttrProps, soft: boolean = false): boolean {
    const speciesForm = getPokemonSpeciesForm(pokemon.speciesId, dexAttr.formIndex);
        const types = [speciesForm.type1, speciesForm.type2];
    if (soft) {
      const speciesToCheck = [pokemon.speciesId];
          while (speciesToCheck.length) {
            const checking = speciesToCheck.pop();
        if (checking && pokemonEvolutions.hasOwnProperty(checking)) {
              pokemonEvolutions[checking].forEach(e => {
                speciesToCheck.push(e.speciesId);
                types.push(getPokemonSpecies(e.speciesId).type1, getPokemonSpecies(e.speciesId).type2);
              });
            }
        if (checking && pokemonFormChanges.hasOwnProperty(checking)) {
              pokemonFormChanges[checking].forEach(f1 => {
                getPokemonSpecies(checking).forms.forEach(f2 => {
                  if (f1.formKey === f2.formKey) {
                    types.push(f2.type1, f2.type2);
                  }
                });
              });
            }
          }
        }
        if (!types.includes(this.value - 1)) {
      valid.value = false;
          return true;
        }
    return false;
  }

  applyPokemonInBattle(pokemon: Pokemon, valid: Utils.BooleanHolder): boolean {
        if (pokemon.isPlayer() && !pokemon.isOfType(this.value - 1, false, false, true)
      && !SingleTypeChallenge.TYPE_OVERRIDES.some(o => o.type === (this.value - 1) && (pokemon.isFusion() && o.fusion ? pokemon.fusionSpecies! : pokemon.species).speciesId === o.species)) {
      valid.value = false;
          return true;
        }
    return false;
  }
  getDifficulty(): number {
    return this.value > 0 ? 1 : 0;
  }
  getValue(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    return Type[this.value - 1].toLowerCase();
  }
  getDescription(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    const type = i18next.t(`pokemonInfo:Type.${Type[this.value - 1]}`);
    const typeColor = `[color=${TypeColor[Type[this.value-1]]}][shadow=${TypeShadow[Type[this.value-1]]}]${type}[/shadow][/color]`;
    const defaultDesc = i18next.t("challenges:singleType.desc_default");
    const typeDesc = i18next.t("challenges:singleType.desc", {type: typeColor});
    return this.value === 0 ? defaultDesc : typeDesc;
  }

  static loadChallenge(source: SingleTypeChallenge | any): SingleTypeChallenge {
    const newChallenge = new SingleTypeChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }
}
export class FreshStartChallenge extends Challenge {
  constructor() {
    super(Challenges.FRESH_START, 1);
  }

  applyStarterChoice(pokemon: PokemonSpecies, valid: Utils.BooleanHolder): boolean {
    if (!defaultStarterSpecies.includes(pokemon.speciesId)) {
      valid.value = false;
      return true;
    }
      return false;
    }

  applyStarterCost(species: Species, cost: Utils.NumberHolder): boolean {
    if (defaultStarterSpecies.includes(species)) {
      cost.value = speciesStarters[species];
          return true;
        }
    return false;
  }

  applyStarterModify(pokemon: Pokemon): boolean {
    pokemon.abilityIndex = 0;
    pokemon.passive = false;
    pokemon.nature = Nature.HARDY;
    pokemon.moveset = pokemon.species.getLevelMoves().filter(m => m[0] <= 5).map(lm => lm[1]).slice(0, 4).map(m => new PokemonMove(m));
    pokemon.luck = 0;
    pokemon.shiny = false;
    pokemon.variant = 0;
    pokemon.gender = Gender.MALE;
    pokemon.formIndex = 0;
    pokemon.ivs = [10, 10, 10, 10, 10, 10];
    return true;
  }

  override getDifficulty(): number {
    return 0;
  }

  static loadChallenge(source: FreshStartChallenge | any): FreshStartChallenge {
    const newChallenge = new FreshStartChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }
}
export class InverseBattleChallenge extends Challenge {
  constructor() {
    super(Challenges.INVERSE_BATTLE, 1);
  }

  static loadChallenge(source: InverseBattleChallenge | any): InverseBattleChallenge {
    const newChallenge = new InverseBattleChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }

  override getDifficulty(): number {
    return 0;
  }

  applyTypeEffectiveness(effectiveness: Utils.NumberHolder): boolean {
    if (effectiveness.value < 1) {
      effectiveness.value = 2;
      return true;
    } else if (effectiveness.value > 1) {
      effectiveness.value = 0.5;
      return true;
    }

    return false;
  }
}
export class LowerStarterMaxCostChallenge extends Challenge {
  constructor() {
    super(Challenges.LOWER_MAX_STARTER_COST, 9);
  }
  getValue(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    return (DEFAULT_PARTY_MAX_COST - overrideValue).toString();
    }

  applyStarterChoice(pokemon: PokemonSpecies, valid: Utils.BooleanHolder): boolean {
    if (speciesStarters[pokemon.speciesId] > DEFAULT_PARTY_MAX_COST - this.value) {
      valid.value = false;
          return true;
        }
    return false;
  }

  static loadChallenge(source: LowerStarterMaxCostChallenge | any): LowerStarterMaxCostChallenge {
    const newChallenge = new LowerStarterMaxCostChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }
}
export class LowerStarterPointsChallenge extends Challenge {
  constructor() {
    super(Challenges.LOWER_STARTER_POINTS, 9);
  }
  getValue(overrideValue?: integer): string {
    if (overrideValue === undefined) {
      overrideValue = this.value;
    }
    return (DEFAULT_PARTY_MAX_COST - overrideValue).toString();
    }

  applyStarterPoints(points: Utils.NumberHolder): boolean {
        points.value -= this.value;
        return true;
    }

  static loadChallenge(source: LowerStarterPointsChallenge | any): LowerStarterPointsChallenge {
    const newChallenge = new LowerStarterPointsChallenge();
    newChallenge.value = source.value;
    newChallenge.severity = source.severity;
    return newChallenge;
  }
}
export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.STARTER_CHOICE, pokemon: PokemonSpecies, valid: Utils.BooleanHolder, dexAttr: DexAttrProps, soft: boolean): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.STARTER_POINTS, points: Utils.NumberHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.STARTER_COST, species: Species, cost: Utils.NumberHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.STARTER_MODIFY, pokemon: Pokemon): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.POKEMON_IN_BATTLE, pokemon: Pokemon, valid: Utils.BooleanHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.FIXED_BATTLES, waveIndex: Number, battleConfig: FixedBattleConfig): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.TYPE_EFFECTIVENESS, effectiveness: Utils.NumberHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.AI_LEVEL, level: Utils.IntegerHolder, levelCap: number, isTrainer: boolean, isBoss: boolean): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.AI_MOVE_SLOTS, pokemon: Pokemon, moveSlots: Utils.IntegerHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.PASSIVE_ACCESS, pokemon: Pokemon, hasPassive: Utils.BooleanHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.GAME_MODE_MODIFY): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.MOVE_ACCESS, pokemon: Pokemon, moveSource: MoveSourceType, move: Moves, level: Utils.IntegerHolder): boolean;

export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType.MOVE_WEIGHT, pokemon: Pokemon, moveSource: MoveSourceType, move: Moves, weight: Utils.IntegerHolder): boolean;
export function applyChallenges(gameMode: GameMode, challengeType: ChallengeType, ...args: any[]): boolean {
  let ret = false;
  gameMode.challenges.forEach(c => {
    if (c.value !== 0) {
      switch (challengeType) {
      case ChallengeType.STARTER_CHOICE:
        ret ||= c.applyStarterChoice(args[0], args[1], args[2], args[3]);
        break;
      case ChallengeType.STARTER_POINTS:
        ret ||= c.applyStarterPoints(args[0]);
        break;
      case ChallengeType.STARTER_COST:
        ret ||= c.applyStarterCost(args[0], args[1]);
        break;
      case ChallengeType.STARTER_MODIFY:
        ret ||= c.applyStarterModify(args[0]);
        break;
      case ChallengeType.POKEMON_IN_BATTLE:
        ret ||= c.applyPokemonInBattle(args[0], args[1]);
        break;
      case ChallengeType.FIXED_BATTLES:
        ret ||= c.applyFixedBattle(args[0], args[1]);
        break;
      case ChallengeType.TYPE_EFFECTIVENESS:
        ret ||= c.applyTypeEffectiveness(args[0]);
        break;
      case ChallengeType.AI_LEVEL:
        ret ||= c.applyLevelChange(args[0], args[1], args[2], args[3]);
        break;
      case ChallengeType.AI_MOVE_SLOTS:
        ret ||= c.applyMoveSlot(args[0], args[1]);
        break;
      case ChallengeType.PASSIVE_ACCESS:
        ret ||= c.applyPassiveAccess(args[0], args[1]);
        break;
      case ChallengeType.GAME_MODE_MODIFY:
        ret ||= c.applyGameModeModify(gameMode);
        break;
      case ChallengeType.MOVE_ACCESS:
        ret ||= c.applyMoveAccessLevel(args[0], args[1], args[2], args[3]);
        break;
      case ChallengeType.MOVE_WEIGHT:
        ret ||= c.applyMoveWeight(args[0], args[1], args[2], args[3]);
        break;
      }
    }
  });
  return ret;
}
export function copyChallenge(source: Challenge | any): Challenge {
  switch (source.id) {
    case Challenges.SINGLE_GENERATION:
      return SingleGenerationChallenge.loadChallenge(source);
    case Challenges.SINGLE_TYPE:
      return SingleTypeChallenge.loadChallenge(source);
    case Challenges.LOWER_MAX_STARTER_COST:
      return LowerStarterMaxCostChallenge.loadChallenge(source);
    case Challenges.LOWER_STARTER_POINTS:
      return LowerStarterPointsChallenge.loadChallenge(source);
  case Challenges.FRESH_START:
    return FreshStartChallenge.loadChallenge(source);
  case Challenges.INVERSE_BATTLE:
    return InverseBattleChallenge.loadChallenge(source);
  }
  throw new Error("Unknown challenge copied");
}

export const allChallenges: Challenge[] = [];

export function initChallenges() {
  allChallenges.push(
      new SingleGenerationChallenge(),
      new SingleTypeChallenge(),
    new FreshStartChallenge(),
    new InverseBattleChallenge(),
  );
}