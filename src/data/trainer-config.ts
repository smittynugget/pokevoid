import BattleScene, {startingWave} from "../battle-scene";
import {ModifierTypeFunc, modifierTypes} from "../modifier/modifier-type";
import {EnemyPokemon} from "../field/pokemon";
import * as Utils from "../utils";
import {PokeballType} from "./pokeball";
import {pokemonEvolutions, pokemonPrevolutions} from "./pokemon-evolutions";
import PokemonSpecies, {getPokemonSpecies, PokemonSpeciesFilter, SpeciesFormKey} from "./pokemon-species";
import {tmSpecies} from "./tms";
import {Type} from "./type";
import {doubleBattleDialogue, DynamicRivalDialogue} from "./dialogue";
import {PersistentModifier} from "../modifier/modifier";
import {TrainerVariant} from "../field/trainer";
import {getIsInitialized, initI18n} from "#app/plugins/i18n";
import i18next from "i18next";
import {Moves} from "#enums/moves";
import {PartyMemberStrength} from "#enums/party-member-strength";
import {Species} from "#enums/species";
import {TrainerType} from "#enums/trainer-type";
import {Gender} from "./gender";
import {randSeedInt, randSeedItem} from "../utils";
import {GameData} from "#app/system/game-data";
import {Unlockables} from "#app/system/unlockables";
import {applyUniversalSmittyForm, pokemonFormChanges, SmittyFormTrigger} from "#app/data/pokemon-forms";

export enum TrainerPoolTier {
  COMMON,
  UNCOMMON,
  RARE,
  SUPER_RARE,
  ULTRA_RARE
}

export interface TrainerTierPools {
  [key: integer]: Species[]
}

export enum TrainerSlot {
  NONE,
  TRAINER,
  TRAINER_PARTNER
}

export class TrainerPartyTemplate {  public size: integer;
  public strength: PartyMemberStrength;
  public sameSpecies: boolean;
  public balanced: boolean;

  constructor(size: integer, strength: PartyMemberStrength, sameSpecies?: boolean, balanced?: boolean) {
    this.size = size;
    this.strength = strength;
    this.sameSpecies = !!sameSpecies;
    this.balanced = !!balanced;
  }

  getStrength(index: integer): PartyMemberStrength {
    return this.strength;
  }

  isSameSpecies(index: integer): boolean {
    return this.sameSpecies;
  }

  isBalanced(index: integer): boolean {
    return this.balanced;
  }
}

export class TrainerPartyCompoundTemplate extends TrainerPartyTemplate {
  public templates: TrainerPartyTemplate[];

  constructor(...templates: TrainerPartyTemplate[]) {
    super(templates.reduce((total: integer, template: TrainerPartyTemplate) => {
      total += template.size;
      
      // if(total <= 2) total++;
      return total;
    }, 0), PartyMemberStrength.AVERAGE);
    this.templates = templates;
  }

  getStrength(index: integer): PartyMemberStrength {
    let t = 0;
    for (const template of this.templates) {
      if (t + template.size > index) {
        return template.getStrength(index - t);
      }
      t += template.size;
    }

    return super.getStrength(index);
  }

  isSameSpecies(index: integer): boolean {
    let t = 0;
    for (const template of this.templates) {
      if (t + template.size > index) {
        return template.isSameSpecies(index - t);
      }
      t += template.size;
    }

    return super.isSameSpecies(index);
  }

  isBalanced(index: integer): boolean {
    let t = 0;
    for (const template of this.templates) {
      if (t + template.size > index) {
        return template.isBalanced(index - t);
      }
      t += template.size;
    }

    return super.isBalanced(index);
  }
}

export const trainerPartyTemplates = {
  ONE_WEAK_ONE_STRONG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.WEAK), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  ONE_AVG: new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE),
  ONE_AVG_ONE_STRONG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  ONE_STRONG: new TrainerPartyTemplate(1, PartyMemberStrength.STRONG),
  ONE_STRONGER: new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER),
  TWO_WEAKER: new TrainerPartyTemplate(2, PartyMemberStrength.WEAKER),
  TWO_WEAK: new TrainerPartyTemplate(2, PartyMemberStrength.WEAK),
  TWO_WEAK_ONE_AVG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.WEAK), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)),
  TWO_WEAK_SAME_ONE_AVG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.WEAK, true), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)),
  TWO_WEAK_SAME_TWO_WEAK_SAME: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.WEAK, true), new TrainerPartyTemplate(2, PartyMemberStrength.WEAK, true)),
  TWO_WEAK_ONE_STRONG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.WEAK), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  TWO_AVG: new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE),
  TWO_AVG_ONE_STRONG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  TWO_AVG_SAME_ONE_AVG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE, true), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)),
  TWO_AVG_SAME_ONE_STRONG: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE, true), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  TWO_AVG_SAME_TWO_AVG_SAME: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE, true), new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE, true)),
  TWO_STRONG: new TrainerPartyTemplate(2, PartyMemberStrength.STRONG),
  THREE_WEAK: new TrainerPartyTemplate(3, PartyMemberStrength.WEAK),
  THREE_WEAK_SAME: new TrainerPartyTemplate(3, PartyMemberStrength.WEAK, true),
  THREE_AVG: new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE),
  THREE_AVG_SAME: new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE, true),
  THREE_WEAK_BALANCED: new TrainerPartyTemplate(3, PartyMemberStrength.WEAK, false, true),
  FOUR_WEAKER: new TrainerPartyTemplate(4, PartyMemberStrength.WEAKER),
  FOUR_WEAKER_SAME: new TrainerPartyTemplate(4, PartyMemberStrength.WEAKER, true),
  FOUR_WEAK: new TrainerPartyTemplate(4, PartyMemberStrength.WEAK),
  FOUR_WEAK_SAME: new TrainerPartyTemplate(4, PartyMemberStrength.WEAK, true),
  FOUR_WEAK_BALANCED: new TrainerPartyTemplate(4, PartyMemberStrength.WEAK, false, true),
  FIVE_WEAKER: new TrainerPartyTemplate(5, PartyMemberStrength.WEAKER),
  FIVE_WEAK: new TrainerPartyTemplate(5, PartyMemberStrength.WEAK),
  FIVE_WEAK_BALANCED: new TrainerPartyTemplate(5, PartyMemberStrength.WEAK, false, true),
  SIX_WEAKER: new TrainerPartyTemplate(6, PartyMemberStrength.WEAKER),
  SIX_WEAKER_SAME: new TrainerPartyTemplate(6, PartyMemberStrength.WEAKER, true),
  SIX_WEAK_SAME: new TrainerPartyTemplate(6, PartyMemberStrength.WEAK, true),
  SIX_WEAK_BALANCED: new TrainerPartyTemplate(6, PartyMemberStrength.WEAK, false, true),

  GYM_LEADER_1: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  GYM_LEADER_2: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)),
  GYM_LEADER_3: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)),
  GYM_LEADER_4: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)),
  GYM_LEADER_5: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(2, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)),

  ELITE_FOUR: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(3, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)),

  CHAMPION: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER), new TrainerPartyTemplate(5, PartyMemberStrength.STRONG, false, true)),

  RIVAL: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)),
  RIVAL_2: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.WEAK, false, true)),
  RIVAL_3: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE, false, true), new TrainerPartyTemplate(1, PartyMemberStrength.WEAK, false, true)),
  RIVAL_4: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE, false, true), new TrainerPartyTemplate(1, PartyMemberStrength.WEAK, false, true)),
  RIVAL_5: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE, false, true), new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)),
  RIVAL_6: new TrainerPartyCompoundTemplate(new TrainerPartyTemplate(1, PartyMemberStrength.STRONG), new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE), new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE, false, true), new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER))
};

type PartyTemplateFunc = (scene: BattleScene) => TrainerPartyTemplate;
type PartyMemberFunc = (scene: BattleScene, level: integer, strength: PartyMemberStrength) => EnemyPokemon;
type GenModifiersFunc = (party: EnemyPokemon[]) => PersistentModifier[];

export interface PartyMemberFuncs {
  [key: integer]: PartyMemberFunc
}

export class TrainerConfig {
  public trainerType: TrainerType;
  public trainerTypeDouble: TrainerType;
  public name: string;
  public nameFemale: string;
  public nameDouble: string;
  public title: string;
  public titleDouble: string;
  public hasGenders: boolean = false;
  public hasDouble: boolean = false;
  public hasCharSprite: boolean = false;
  public doubleOnly: boolean = false;
  public moneyMultiplier: number = 1;
  public isBoss: boolean = false;
  public hasStaticParty: boolean = false;
  public useSameSeedForAllMembers: boolean = false;
  public mixedBattleBgm: string;
  public battleBgm: string;
  public encounterBgm: string;
  public femaleEncounterBgm: string;
  public doubleEncounterBgm: string;
  public victoryBgm: string;
  public genModifiersFunc: GenModifiersFunc;
  public modifierRewardFuncs: ModifierTypeFunc[] = [];
  public partyTemplates: TrainerPartyTemplate[];
  public partyTemplateFunc: PartyTemplateFunc;
  public partyMemberFuncs: PartyMemberFuncs = {};
  public speciesPools: TrainerTierPools;
  public speciesFilter: PokemonSpeciesFilter;
  public specialtyTypes: Type[] = [];
  public hasVoucher: boolean = false;

  public encounterMessages: string[] = [];
  public victoryMessages: string[] = [];
  public defeatMessages: string[] = [];

  public femaleEncounterMessages: string[];
  public femaleVictoryMessages: string[];
  public femaleDefeatMessages: string[];

  public doubleEncounterMessages: string[];
  public doubleVictoryMessages: string[];
  public doubleDefeatMessages: string[];

  public smittyVariantIndex?: number;
  public isCorrupted: boolean = false;

  constructor(trainerType: TrainerType, allowLegendaries?: boolean) {
    this.trainerType = trainerType;
    this.name = Utils.toReadableString(TrainerType[this.getDerivedType()]);
    this.battleBgm = "battle_trainer";
    this.mixedBattleBgm = "battle_trainer";
    this.victoryBgm = "victory_trainer";
    this.partyTemplates = [trainerPartyTemplates.TWO_AVG];
    this.speciesFilter = species => (allowLegendaries || (!species.legendary && !species.subLegendary && !species.mythical)) && !species.isTrainerForbidden();
  }

  getKey(): string {
    return TrainerType[this.getDerivedType()].toString().toLowerCase();
  }

  getSpriteKey(female?: boolean,isDouble: boolean = false): string {

    if (this.trainerType === TrainerType.SMITTY && this.smittyVariantIndex !== undefined) {
      // Just return the frame number since they're distinct images
      return `${this.smittyVariantIndex + 1}`;  // Maps to the actual image number
    }

    let ret = this.getKey();
    if (this.hasGenders) {
      ret += `_${female ? "f" : "m"}`;
    }
    // If a special double trainer class was set, set it as the sprite key
    if (this.trainerTypeDouble && female && isDouble) {
      // Get the derived type for the double trainer since the sprite key is based on the derived type
      ret = TrainerType[this.getDerivedType(this.trainerTypeDouble)].toString().toLowerCase();
    }
    return ret;
  }

  setName(name: string): TrainerConfig {
    if (name === "Finn") {
      // Give the rival a localized name
      // First check if i18n is initialized
      if (!getIsInitialized()) {
        initI18n();
      }
      // This is only the male name, because the female name is handled in a different function (setHasGenders)
      if (name === "Finn") {
        name = i18next.t("trainerNames:rival");
      }
    }
    this.name = name;
    return this;
  }

  /**
   * Sets if a boss trainer will have a voucher or not.
   * @param hasVoucher - If the boss trainer will have a voucher.
   */
  setHasVoucher(hasVoucher: boolean): void {
    this.hasVoucher = hasVoucher;
  }

  setTitle(title: string): TrainerConfig {
    // First check if i18n is initialized
    if (!getIsInitialized()) {
      initI18n();
    }

    // Make the title lowercase and replace spaces with underscores
    title = title.toLowerCase().replace(/\s/g, "_");

    // Get the title from the i18n file
    this.title = i18next.t(`titles:${title}`);


    return this;
  }


  /**
   * Returns the derived trainer type for a given trainer type.
   * @param trainerTypeToDeriveFrom - The trainer type to derive from. (If null, the this.trainerType property will be used.)
   * @returns {TrainerType} - The derived trainer type.
   */
  getDerivedType(trainerTypeToDeriveFrom: TrainerType | null = null): TrainerType {
    let trainerType = trainerTypeToDeriveFrom ? trainerTypeToDeriveFrom : this.trainerType;
    switch (trainerType) {
      case TrainerType.RIVAL_2:
      case TrainerType.RIVAL_3:
      case TrainerType.RIVAL_4:
      case TrainerType.RIVAL_5:
      case TrainerType.RIVAL_6:
        trainerType = TrainerType.RIVAL;
        break;
      case TrainerType.LANCE_CHAMPION:
        trainerType = TrainerType.LANCE;
        break;
      case TrainerType.LARRY_ELITE:
        trainerType = TrainerType.LARRY;
        break;
      case TrainerType.ROCKET_BOSS_GIOVANNI_1:
      case TrainerType.ROCKET_BOSS_GIOVANNI_2:
        trainerType = TrainerType.GIOVANNI;
        break;
      case TrainerType.MAXIE_2:
        trainerType = TrainerType.MAXIE;
        break;
      case TrainerType.ARCHIE_2:
        trainerType = TrainerType.ARCHIE;
        break;
      case TrainerType.CYRUS_2:
        trainerType = TrainerType.CYRUS;
        break;
      case TrainerType.GHETSIS_2:
        trainerType = TrainerType.GHETSIS;
        break;
      case TrainerType.LYSANDRE_2:
        trainerType = TrainerType.LYSANDRE;
        break;
      case TrainerType.LUSAMINE_2:
        trainerType = TrainerType.LUSAMINE;
        break;
      case TrainerType.GUZMA_2:
        trainerType = TrainerType.GUZMA;
        break;
      case TrainerType.ROSE_2:
        trainerType = TrainerType.ROSE;
        break;
      case TrainerType.MARNIE_ELITE:
        trainerType = TrainerType.MARNIE;
        break;
      case TrainerType.NESSA_ELITE:
        trainerType = TrainerType.NESSA;
        break;
      case TrainerType.BEA_ELITE:
        trainerType = TrainerType.BEA;
        break;
      case TrainerType.ALLISTER_ELITE:
        trainerType = TrainerType.ALLISTER;
        break;
      case TrainerType.RAIHAN_ELITE:
        trainerType = TrainerType.RAIHAN;
        break;
    }

    return trainerType;
  }

  /**
   * Sets the configuration for trainers with genders, including the female name and encounter background music (BGM).
   * @param {string} [nameFemale] - The name of the female trainer. If 'Ivy', a localized name will be assigned.
   * @param {TrainerType | string} [femaleEncounterBgm] - The encounter BGM for the female trainer, which can be a TrainerType or a string.
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   **/
  setHasGenders(nameFemale?: string, femaleEncounterBgm?: TrainerType | string): TrainerConfig {
    // If the female name is 'Ivy' (the rival), assign a localized name.
    if (nameFemale === "Ivy") {
      // Check if the internationalization (i18n) system is initialized.
      if (!getIsInitialized()) {
        // Initialize the i18n system if it is not already initialized.
        initI18n();
      }
      // Set the localized name for the female rival.
      this.nameFemale = i18next.t("trainerNames:rival_female");
    } else {
      // Otherwise, assign the provided female name.
      this.nameFemale = nameFemale!; // TODO: is this bang correct?
    }

    // Indicate that this trainer configuration includes genders.
    this.hasGenders = true;

    // If a female encounter BGM is provided.
    if (femaleEncounterBgm) {
      // If the BGM is a TrainerType (number), convert it to a string, replace underscores with spaces, and convert to lowercase.
      // Otherwise, assign the provided string as the BGM.
      this.femaleEncounterBgm = typeof femaleEncounterBgm === "number"
          ? TrainerType[femaleEncounterBgm].toString().replace(/_/g, " ").toLowerCase()
          : femaleEncounterBgm;
    }

    // Return the updated TrainerConfig instance.
    return this;
  }

  /**
   * Sets the configuration for trainers with double battles, including the name of the double trainer and the encounter BGM.
   * @param nameDouble - The name of the double trainer (e.g., "Ace Duo" for Trainer Class Doubles or "red_blue_double" for NAMED trainer doubles).
   * @param doubleEncounterBgm - The encounter BGM for the double trainer, which can be a TrainerType or a string.
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   */
  setHasDouble(nameDouble: string, doubleEncounterBgm?: TrainerType | string): TrainerConfig {
    // this.hasDouble = true;
    // this.nameDouble = nameDouble;
    // if (doubleEncounterBgm) {
    //   this.doubleEncounterBgm = typeof doubleEncounterBgm === "number" ? TrainerType[doubleEncounterBgm].toString().replace(/\_/g, " ").toLowerCase() : doubleEncounterBgm;
    // }
    return this;
  }

  /**
   * Sets the trainer type for double battles.
   * @param trainerTypeDouble - The TrainerType of the partner in a double battle.
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   */
  setDoubleTrainerType(trainerTypeDouble: TrainerType): TrainerConfig {
    this.trainerTypeDouble = trainerTypeDouble;
    this.setDoubleMessages(this.nameDouble);
    return this;
  }

  /**
   * Sets the encounter and victory messages for double trainers.
   * @param nameDouble - The name of the pair (e.g. "red_blue_double").
   */
  setDoubleMessages(nameDouble: string) {
    // Check if there is double battle dialogue for this trainer
    if (doubleBattleDialogue[nameDouble]) {
      // Set encounter and victory messages for double trainers
      this.doubleEncounterMessages = doubleBattleDialogue[nameDouble].encounter;
      this.doubleVictoryMessages = doubleBattleDialogue[nameDouble].victory;
      this.doubleDefeatMessages = doubleBattleDialogue[nameDouble].defeat;
    }
  }

  /**
   * Sets the title for double trainers
   * @param titleDouble - the key for the title in the i18n file. (e.g., "champion_double").
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   */
  setDoubleTitle(titleDouble: string): TrainerConfig {
    // First check if i18n is initialized
    if (!getIsInitialized()) {
      initI18n();
    }

    // Make the title lowercase and replace spaces with underscores
    titleDouble = titleDouble.toLowerCase().replace(/\s/g, "_");

    // Get the title from the i18n file
    this.titleDouble = i18next.t(`titles:${titleDouble}`);

    return this;
  }

  setHasCharSprite(): TrainerConfig {
    this.hasCharSprite = true;
    return this;
  }

  setDoubleOnly(): TrainerConfig {
    this.doubleOnly = true;
    return this;
  }

  setMoneyMultiplier(moneyMultiplier: number): TrainerConfig {
    this.moneyMultiplier = moneyMultiplier;
    return this;
  }

  setBoss(): TrainerConfig {
    this.isBoss = true;
    return this;
  }

  setStaticParty(): TrainerConfig {
    this.hasStaticParty = true;
    return this;
  }

  setUseSameSeedForAllMembers(): TrainerConfig {
    this.useSameSeedForAllMembers = true;
    return this;
  }

  setMixedBattleBgm(mixedBattleBgm: string): TrainerConfig {
    this.mixedBattleBgm = mixedBattleBgm;
    return this;
  }

  setBattleBgm(battleBgm: string): TrainerConfig {
    this.battleBgm = battleBgm;
    return this;
  }

  setEncounterBgm(encounterBgm: TrainerType | string): TrainerConfig {
    this.encounterBgm = typeof encounterBgm === "number" ? TrainerType[encounterBgm].toString().toLowerCase() : encounterBgm;
    return this;
  }

  setVictoryBgm(victoryBgm: string): TrainerConfig {
    this.victoryBgm = victoryBgm;
    return this;
  }

  setPartyTemplates(...partyTemplates: TrainerPartyTemplate[]): TrainerConfig {
    this.partyTemplates = partyTemplates;
    return this;
  }

  setPartyTemplateFunc(partyTemplateFunc: PartyTemplateFunc): TrainerConfig {
    this.partyTemplateFunc = partyTemplateFunc;
    return this;
  }

  setPartyMemberFunc(slotIndex: integer, partyMemberFunc: PartyMemberFunc): TrainerConfig {
    this.partyMemberFuncs[slotIndex] = partyMemberFunc;
    return this;
  }

  setSpeciesPools(speciesPools: TrainerTierPools | Species[]): TrainerConfig {
    this.speciesPools = (Array.isArray(speciesPools) ? {[TrainerPoolTier.COMMON]: speciesPools} : speciesPools) as unknown as TrainerTierPools;
    return this;
  }

  setSpeciesFilter(speciesFilter: PokemonSpeciesFilter, allowLegendaries?: boolean): TrainerConfig {
    const baseFilter = this.speciesFilter;
    this.speciesFilter = allowLegendaries ? speciesFilter : species => speciesFilter(species) && baseFilter(species);
    return this;
  }

  setSpecialtyTypes(...specialtyTypes: Type[]): TrainerConfig {
    this.specialtyTypes = specialtyTypes;
    return this;
  }

  setGenModifiersFunc(genModifiersFunc: GenModifiersFunc): TrainerConfig {
    this.genModifiersFunc = genModifiersFunc;
    return this;
  }

  setModifierRewardFuncs(...modifierTypeFuncs: (() => ModifierTypeFunc)[]): TrainerConfig {
    this.modifierRewardFuncs = modifierTypeFuncs.map(func => () => {
      const modifierTypeFunc = func();
      const modifierType = modifierTypeFunc();
      modifierType.withIdFromFunc(modifierTypeFunc);
      return modifierType;
    });
    return this;
  }

  /**
   * Returns the pool of species for an evil team admin
   * @param team - The evil team the admin belongs to.
   * @returns {TrainerTierPools}
   */
  speciesPoolPerEvilTeamAdmin(team): TrainerTierPools {
    team = team.toLowerCase();
    switch (team) {
      case "rocket": {
        return {
          [TrainerPoolTier.COMMON]: [Species.RATTATA, Species.KOFFING, Species.EKANS, Species.GYARADOS, Species.TAUROS, Species.SCYTHER, Species.CUBONE, Species.GROWLITHE, Species.MURKROW, Species.GASTLY, Species.EXEGGCUTE, Species.VOLTORB],
          [TrainerPoolTier.UNCOMMON]: [Species.PORYGON, Species.ALOLA_SANDSHREW, Species.ALOLA_MEOWTH, Species.ALOLA_GRIMER, Species.ALOLA_GEODUDE],
          [TrainerPoolTier.RARE]: [Species.DRATINI, Species.LARVITAR]
        };
      }
      case "magma": {
        return {
          [TrainerPoolTier.COMMON]: [Species.NUMEL, Species.POOCHYENA, Species.SLUGMA, Species.SOLROCK, Species.HIPPOPOTAS, Species.SANDACONDA, Species.PHANPY, Species.ROLYCOLY, Species.GLIGAR],
          [TrainerPoolTier.UNCOMMON]: [Species.TRAPINCH, Species.HEATMOR],
          [TrainerPoolTier.RARE]: [Species.CAPSAKID, Species.CHARCADET]
        };
      }
      case "aqua": {
        return {
          [TrainerPoolTier.COMMON]: [Species.CARVANHA, Species.CORPHISH, Species.ZIGZAGOON, Species.CLAMPERL, Species.CHINCHOU, Species.WOOPER, Species.WINGULL, Species.TENTACOOL, Species.QWILFISH],
          [TrainerPoolTier.UNCOMMON]: [Species.MANTINE, Species.BASCULEGION, Species.REMORAID, Species.ARROKUDA],
          [TrainerPoolTier.RARE]: [Species.DONDOZO]
        };
      }
      case "galactic": {
        return {
          [TrainerPoolTier.COMMON]: [Species.GLAMEOW, Species.STUNKY, Species.BRONZOR, Species.CARNIVINE, Species.GROWLITHE, Species.QWILFISH, Species.SNEASEL],
          [TrainerPoolTier.UNCOMMON]: [Species.HISUI_GROWLITHE, Species.HISUI_QWILFISH, Species.HISUI_SNEASEL],
          [TrainerPoolTier.RARE]: [Species.HISUI_ZORUA, Species.HISUI_SLIGGOO]
        };
      }
      case "plasma": {
        return {
          [TrainerPoolTier.COMMON]: [Species.SCRAFTY, Species.LILLIPUP, Species.PURRLOIN, Species.FRILLISH, Species.VENIPEDE, Species.GOLETT, Species.TIMBURR, Species.DARUMAKA, Species.AMOONGUSS],
          [TrainerPoolTier.UNCOMMON]: [Species.PAWNIARD, Species.VULLABY, Species.ZORUA, Species.DRILBUR, Species.KLINK],
          [TrainerPoolTier.RARE]: [Species.DRUDDIGON, Species.BOUFFALANT, Species.AXEW, Species.DEINO, Species.DURANT]
        };
      }
      case "flare": {
        return {
          [TrainerPoolTier.COMMON]: [Species.FLETCHLING, Species.LITLEO, Species.INKAY, Species.HELIOPTILE, Species.ELECTRIKE, Species.SKRELP, Species.GULPIN, Species.PURRLOIN, Species.POOCHYENA, Species.SCATTERBUG],
          [TrainerPoolTier.UNCOMMON]: [Species.LITWICK, Species.SNEASEL, Species.PANCHAM, Species.PAWNIARD],
          [TrainerPoolTier.RARE]: [Species.NOIVERN, Species.DRUDDIGON]
        };
      }
      case "aether": {
        return {
          [TrainerPoolTier.COMMON]: [ Species.BRUXISH, Species.SLOWPOKE, Species.BALTOY, Species.EXEGGCUTE, Species.ABRA, Species.ALOLA_RAICHU, Species.ELGYEM, Species.NATU],
          [TrainerPoolTier.UNCOMMON]: [Species.GALAR_SLOWKING, Species.MEDITITE, Species.BELDUM, Species.ORANGURU, Species.HATTERENE, Species.INKAY, Species.RALTS],
          [TrainerPoolTier.RARE]: [Species.ARMAROUGE, Species.GIRAFARIG, Species.PORYGON]
        };
      }
      case "skull": {
        return {
          [TrainerPoolTier.COMMON]: [ Species.MAREANIE, Species.ALOLA_GRIMER, Species.GASTLY, Species.ZUBAT, Species.LURANTIS, Species.VENIPEDE, Species.BUDEW, Species.KOFFING],
          [TrainerPoolTier.UNCOMMON]: [Species.GALAR_SLOWBRO, Species.SKORUPI, Species.PALDEA_WOOPER, Species.NIDORAN_F, Species.CROAGUNK, Species.MANDIBUZZ],
          [TrainerPoolTier.RARE]: [Species.DRAGALGE, Species.HISUI_SNEASEL]
        };
      }
      case "macro": {
        return {
          [TrainerPoolTier.COMMON]: [ Species.HATTERENE, Species.MILOTIC, Species.TSAREENA, Species.SALANDIT, Species.GALAR_PONYTA, Species.GOTHITA, Species.FROSLASS],
          [TrainerPoolTier.UNCOMMON]: [Species.MANDIBUZZ, Species.MAREANIE, Species.ALOLA_VULPIX, Species.TOGEPI, Species.GALAR_CORSOLA, Species.SINISTEA, Species.APPLIN],
          [TrainerPoolTier.RARE]: [Species.TINKATINK, Species.HISUI_LILLIGANT]
        };
      }
    }

    console.warn(`Evil team admin for ${team} not found. Returning empty species pools.`);
    return [];
  }

  /**
   * Initializes the trainer configuration for an evil team admin.
   * @param title - The title of the evil team admin.
   * @param poolName - The evil team the admin belongs to.
   * @param {Species | Species[]} signatureSpecies - The signature species for the evil team leader.
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   * **/
  initForEvilTeamAdmin(title: string, poolName: string, signatureSpecies: (Species | Species[])[],): TrainerConfig {
    if (!getIsInitialized()) {
      initI18n();
    }
    this.setPartyTemplates(trainerPartyTemplates.RIVAL_5);

    // Set the species pools for the evil team admin.
    this.speciesPools = this.speciesPoolPerEvilTeamAdmin(poolName);

    signatureSpecies.forEach((speciesPool, s) => {
      if (!Array.isArray(speciesPool)) {
        speciesPool = [speciesPool];
      }
      this.setPartyMemberFunc(-(s + 1), getRandomPartyMemberFunc(speciesPool));
    });

    const nameForCall = this.name.toLowerCase().replace(/\s/g, "_");
    this.name = i18next.t(`trainerNames:${nameForCall}`);
    this.setHasVoucher(false);
    this.setTitle(title);
    this.setMoneyMultiplier(1.5);
    this.setBoss();
    this.setStaticParty();
    this.setBattleBgm("battle_plasma_boss");
    this.setVictoryBgm("victory_team_plasma");

    return this;
  }

  /**
   * Initializes the trainer configuration for an evil team leader. Temporarily hardcoding evil leader teams though.
   * @param {Species | Species[]} signatureSpecies - The signature species for the evil team leader.
   * @param {Type[]} specialtyTypes - The specialty types for the evil team Leader.
   * @param boolean whether or not this is the rematch fight
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   * **/
  initForEvilTeamLeader(title: string, signatureSpecies: (Species | Species[])[], rematch: boolean = false, ...specialtyTypes: Type[]): TrainerConfig {
    if (!getIsInitialized()) {
      initI18n();
    }
    if (rematch) {
      this.setPartyTemplates(trainerPartyTemplates.ELITE_FOUR);
    } else {
      this.setPartyTemplates(trainerPartyTemplates.RIVAL_5);
    }
    signatureSpecies.forEach((speciesPool, s) => {
      if (!Array.isArray(speciesPool)) {
        speciesPool = [speciesPool];
      }
      this.setPartyMemberFunc(-(s + 1), getRandomPartyMemberFunc(speciesPool));
    });
    if (specialtyTypes.length) {
      this.setSpeciesFilter(p => specialtyTypes.find(t => p.isOfType(t)) !== undefined);
      this.setSpecialtyTypes(...specialtyTypes);
    }
    const nameForCall = this.name.toLowerCase().replace(/\s/g, "_");
    this.name = i18next.t(`trainerNames:${nameForCall}`);
    this.setTitle(title);
    this.setMoneyMultiplier(2.5);
    this.setBoss();
    this.setStaticParty();
    this.setHasVoucher(true);
    this.setBattleBgm("battle_plasma_boss");
    this.setVictoryBgm("victory_team_plasma");

    return this;
  }

  /**
   * Initializes the trainer configuration for a Gym Leader.
   * @param {Species | Species[]} signatureSpecies - The signature species for the Gym Leader.
   * @param {Type[]} specialtyTypes - The specialty types for the Gym Leader.
   * @param isMale - Whether the Gym Leader is Male or Not (for localization of the title).
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   * **/
  initForGymLeader(signatureSpecies: (Species | Species[])[],isMale:boolean, ...specialtyTypes: Type[]): TrainerConfig {
    // Check if the internationalization (i18n) system is initialized.
    if (!getIsInitialized()) {
      initI18n();
    }

    // Set the function to generate the Gym Leader's party template.
    this.setPartyTemplateFunc(getGymLeaderPartyTemplate);

    // Set up party members with their corresponding species.
    signatureSpecies.forEach((speciesPool, s) => {
      // Ensure speciesPool is an array.
      if (!Array.isArray(speciesPool)) {
        speciesPool = [speciesPool];
      }
      // Set a function to get a random party member from the species pool.
      this.setPartyMemberFunc(-(s + 1), getRandomPartyMemberFunc(speciesPool));
    });

    // If specialty types are provided, set species filter and specialty types.
    if (specialtyTypes.length) {
      this.setSpeciesFilter(p => specialtyTypes.find(t => p.isOfType(t)) !== undefined);
      this.setSpecialtyTypes(...specialtyTypes);
    }

    // Localize the trainer's name by converting it to lowercase and replacing spaces with underscores.
    const nameForCall = this.name.toLowerCase().replace(/\s/g, "_");
    this.name = i18next.t(`trainerNames:${nameForCall}`);

    // Set the title to "gym_leader". (this is the key in the i18n file)
    this.setTitle("gym_leader");
    if (!isMale) {
      this.setTitle("gym_leader_female");
    }

    // Configure various properties for the Gym Leader.
    this.setMoneyMultiplier(2.5);
    this.setBoss();
    this.setStaticParty();
    this.setHasVoucher(true);
    this.setBattleBgm("battle_unova_gym");
    this.setVictoryBgm("victory_gym");
    this.setGenModifiersFunc(party => {
      const waveIndex = party[0].scene.currentBattle.waveIndex;
      return getRandomTeraModifiers(party, waveIndex >= 100 ? 1 : 0, specialtyTypes.length ? specialtyTypes : undefined);
    });

    return this;
  }

  /**
   * Initializes the trainer configuration for an Elite Four member.
   * @param {Species | Species[]} signatureSpecies - The signature species for the Elite Four member.
   * @param {Type[]} specialtyTypes - The specialty types for the Elite Four member.
   * @param isMale - Whether the Elite Four Member is Male or Female (for localization of the title).
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   **/
  initForEliteFour(signatureSpecies: (Species | Species[])[],isMale: boolean, ...specialtyTypes: Type[]): TrainerConfig {
    // Check if the internationalization (i18n) system is initialized.
    if (!getIsInitialized()) {
      initI18n();
    }

    // Set the party templates for the Elite Four.
    this.setPartyTemplates(trainerPartyTemplates.ELITE_FOUR);

    // Set up party members with their corresponding species.
    signatureSpecies.forEach((speciesPool, s) => {
      // Ensure speciesPool is an array.
      if (!Array.isArray(speciesPool)) {
        speciesPool = [speciesPool];
      }
      // Set a function to get a random party member from the species pool.
      this.setPartyMemberFunc(-(s + 1), getRandomPartyMemberFunc(speciesPool));
    });

    // Set species filter and specialty types if provided, otherwise filter by base total.
    if (specialtyTypes.length) {
      this.setSpeciesFilter(p => specialtyTypes.some(t => p.isOfType(t)) && p.baseTotal >= 450);
      this.setSpecialtyTypes(...specialtyTypes);
    } else {
      this.setSpeciesFilter(p => p.baseTotal >= 450);
    }

    // Localize the trainer's name by converting it to lowercase and replacing spaces with underscores.
    const nameForCall = this.name.toLowerCase().replace(/\s/g, "_");
    this.name = i18next.t(`trainerNames:${nameForCall}`);

    // Set the title to "elite_four". (this is the key in the i18n file)
    this.setTitle("elite_four");
    if (!isMale) {
      this.setTitle("elite_four_female");
    }

    // Configure various properties for the Elite Four member.
    this.setMoneyMultiplier(3.25);
    this.setBoss();
    this.setStaticParty();
    this.setHasVoucher(true);
    this.setBattleBgm("battle_unova_elite");
    this.setVictoryBgm("victory_gym");
    this.setGenModifiersFunc(party => getRandomTeraModifiers(party, 2, specialtyTypes.length ? specialtyTypes : undefined));

    return this;
  }

  /**
   * Initializes the trainer configuration for a Champion.
   * @param {Species | Species[]} signatureSpecies - The signature species for the Champion.
   * @param isMale - Whether the Champion is Male or Female (for localization of the title).
   * @returns {TrainerConfig} - The updated TrainerConfig instance.
   **/
  initForChampion(signatureSpecies: (Species | Species[])[],isMale: boolean): TrainerConfig {
    // Check if the internationalization (i18n) system is initialized.
    if (!getIsInitialized()) {
      initI18n();
    }

    // Set the party templates for the Champion.
    this.setPartyTemplates(trainerPartyTemplates.CHAMPION);

    // Set up party members with their corresponding species.
    signatureSpecies.forEach((speciesPool, s) => {
      // Ensure speciesPool is an array.
      if (!Array.isArray(speciesPool)) {
        speciesPool = [speciesPool];
      }
      // Set a function to get a random party member from the species pool.
      this.setPartyMemberFunc(-(s + 1), getRandomPartyMemberFunc(speciesPool));
    });

    // Set species filter to only include species with a base total of 470 or higher.
    this.setSpeciesFilter(p => p.baseTotal >= 470);

    // Localize the trainer's name by converting it to lowercase and replacing spaces with underscores.
    const nameForCall = this.name.toLowerCase().replace(/\s/g, "_");
    this.name = i18next.t(`trainerNames:${nameForCall}`);

    // Set the title to "champion". (this is the key in the i18n file)
    this.setTitle("champion");
    if (!isMale) {
      this.setTitle("champion_female");
    }


    // Configure various properties for the Champion.
    this.setMoneyMultiplier(10);
    this.setBoss();
    this.setStaticParty();
    this.setHasVoucher(true);
    this.setBattleBgm("battle_champion_alder");
    this.setVictoryBgm("victory_champion");
    this.setGenModifiersFunc(party => getRandomTeraModifiers(party, 3));

    return this;
  }

  /**
   * Retrieves the title for the trainer based on the provided trainer slot and variant.
   * @param {TrainerSlot} trainerSlot - The slot to determine which title to use. Defaults to TrainerSlot.NONE.
   * @param {TrainerVariant} variant - The variant of the trainer to determine the specific title.
   * @returns {string} - The title of the trainer.
   **/
  getTitle(trainerSlot: TrainerSlot = TrainerSlot.NONE, variant: TrainerVariant): string {
    const ret = this.name;

    // Check if the variant is double and the name for double exists
    if (!trainerSlot && variant === TrainerVariant.DOUBLE && this.nameDouble) {
      return this.nameDouble;
    }

    // Female variant
    if (this.hasGenders) {
      // If the name is already set
      if (this.nameFemale) {
        // Check if the variant is either female or this is for the partner in a double battle
        if (variant === TrainerVariant.FEMALE || (variant === TrainerVariant.DOUBLE && trainerSlot === TrainerSlot.TRAINER_PARTNER)) {
          return this.nameFemale;
        }
      } else
          // Check if !variant is true, if so return the name, else return the name with _female appended
      if (variant) {
        if (!getIsInitialized()) {
          initI18n();
        }
        // Check if the female version exists in the i18n file
        if (i18next.exists(`trainerClasses:${this.name.toLowerCase()}`)) {
          // If it does, return
          return ret + "_female";
        } else {
          // If it doesn't, we do not do anything and go to the normal return
          // This is to prevent the game from displaying an error if a female version of the trainer does not exist in the localization
        }
      }
    }

    return ret;
  }

  loadAssets(scene: BattleScene, variant: TrainerVariant): Promise<void> {
    return new Promise(resolve => {
      const isDouble = variant === TrainerVariant.DOUBLE;

      if (this.trainerType === TrainerType.SMITTY) {
        resolve();
        return;
      }

      const trainerKey = this.getSpriteKey(variant === TrainerVariant.FEMALE, false);
      const partnerTrainerKey = this.getSpriteKey(true,true);
      scene.loadAtlas(trainerKey, "trainer");
      if (isDouble) {
        scene.loadAtlas(partnerTrainerKey, "trainer");
      }
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const originalWarn = console.warn;
        // Ignore warnings for missing frames, because there will be a lot
        console.warn = () => {
        };
        const frameNames = scene.anims.generateFrameNames(trainerKey, {zeroPad: 4,suffix: ".png",start: 1,end: 128});
        const partnerFrameNames = isDouble
            ? scene.anims.generateFrameNames(partnerTrainerKey, {
              zeroPad: 4,
              suffix: ".png",
              start: 1,
              end: 128
            })
            : "";
        console.warn = originalWarn;
        if (!(scene.anims.exists(trainerKey))) {
          scene.anims.create({
            key: trainerKey,
            frames: frameNames,
            frameRate: 24,
            repeat: -1
          });
        }
        if (isDouble && !(scene.anims.exists(partnerTrainerKey))) {
          scene.anims.create({
            key: partnerTrainerKey,
            frames: partnerFrameNames,
            frameRate: 24,
            repeat: -1
          });
        }
        resolve();
      });
      if (!scene.load.isLoading()) {
        scene.load.start();
      }
    });
  }
}

let t = 0;

interface TrainerConfigs {
  [key: integer]: TrainerConfig
}

/**
 * The function to get variable strength grunts
 * @param scene the singleton scene being passed in
 * @returns the correct TrainerPartyTemplate
 */
function getEvilGruntPartyTemplate(scene: BattleScene): TrainerPartyTemplate {
  const waveIndex = scene.currentBattle?.waveIndex;
  if (waveIndex >= 60) {
    return trainerPartyTemplates.GYM_LEADER_5; // 3 avg 2 strong 1 stronger
  } else if (waveIndex >= 45) {
    return trainerPartyTemplates.GYM_LEADER_4; // 3avg 1 strong 1 stronger
  } else if (waveIndex >= 30) {
    return trainerPartyTemplates.TWO_AVG_ONE_STRONG;
  } else if (waveIndex >= 15) {
    return trainerPartyTemplates.THREE_AVG;
  } else {
    return trainerPartyTemplates.TWO_AVG;
  }
}

function getWavePartyTemplate(scene: BattleScene, ...templates: TrainerPartyTemplate[]) {
  return templates[Math.min(Math.max(Math.ceil((scene.gameMode.getWaveForDifficulty(scene.currentBattle?.waveIndex || startingWave, true) - 20) / 30), 0), templates.length - 1)];
}

function getGymLeaderPartyTemplate(scene: BattleScene) {
  return getWavePartyTemplate(scene, trainerPartyTemplates.GYM_LEADER_1, trainerPartyTemplates.GYM_LEADER_2, trainerPartyTemplates.GYM_LEADER_3, trainerPartyTemplates.GYM_LEADER_4, trainerPartyTemplates.GYM_LEADER_5);
}

export function getRandomPartyMemberFunc(speciesPool: Species[], trainerSlot: TrainerSlot = TrainerSlot.TRAINER, ignoreEvolution: boolean = false, postProcess?: (enemyPokemon: EnemyPokemon) => void): PartyMemberFunc {
  return (scene: BattleScene, level: integer, strength: PartyMemberStrength) => {
    let species = Utils.randSeedItem(speciesPool);
    if (!ignoreEvolution) {
      species = getPokemonSpecies(species).getTrainerSpeciesForLevel(level, true, strength, scene.currentBattle.waveIndex, scene.gameMode.isNightmare);
    }
    return scene.addEnemyPokemon(getPokemonSpecies(species), level, trainerSlot, undefined, undefined, postProcess);
  };
}

export function getSpeciesFilterRandomPartyMemberFunc(speciesFilter: PokemonSpeciesFilter, trainerSlot: TrainerSlot = TrainerSlot.TRAINER, allowLegendaries?: boolean, postProcess?: (EnemyPokemon: EnemyPokemon) => void): PartyMemberFunc {
  const originalSpeciesFilter = speciesFilter;
  speciesFilter = (species: PokemonSpecies) => (allowLegendaries || (!species.legendary && !species.subLegendary && !species.mythical)) && !species.isTrainerForbidden() && originalSpeciesFilter(species);
  return (scene: BattleScene, level: integer, strength: PartyMemberStrength) => {
    const ret = scene.addEnemyPokemon(getPokemonSpecies(scene.randomSpecies(scene.currentBattle.waveIndex, level, false, speciesFilter).getTrainerSpeciesForLevel(level, true, strength, scene.currentBattle.waveIndex, scene.gameMode.isNightmare)), level, trainerSlot, undefined, undefined, postProcess);
    return ret;
  };
}

function getRandomTeraModifiers(party: EnemyPokemon[], count: integer, types?: Type[]): PersistentModifier[] {
  const ret: PersistentModifier[] = [];
  const partyMemberIndexes = new Array(party.length).fill(null).map((_, i) => i);
  for (let t = 0; t < Math.min(count, party.length); t++) {
    const randomIndex = Utils.randSeedItem(partyMemberIndexes);
    partyMemberIndexes.splice(partyMemberIndexes.indexOf(randomIndex), 1);
    ret.push(modifierTypes.TERA_SHARD().generateType([], [Utils.randSeedItem(types ? types : party[randomIndex].getTypes())])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(party[randomIndex]) as PersistentModifier); // TODO: is the bang correct?
  }
  return ret;
}

type SignatureSpecies = {
  [key in string]: (Species | Species[])[];
};

/*
 * The signature species for each Gym Leader, Elite Four member, and Champion.
 * The key is the trainer type, and the value is an array of Species or Species arrays.
 * This is in a separate const so it can be accessed from other places and not just the trainerConfigs
 */
export const signatureSpecies: SignatureSpecies = {
  BROCK: [Species.GEODUDE, Species.ONIX],
  MISTY: [Species.STARYU, Species.PSYDUCK],
  LT_SURGE: [Species.VOLTORB, Species.PIKACHU, Species.ELECTABUZZ],
  ERIKA: [Species.ODDISH, Species.BELLSPROUT, Species.TANGELA, Species.HOPPIP],
  JANINE: [Species.VENONAT, Species.SPINARAK, Species.ZUBAT],
  SABRINA: [Species.ABRA, Species.MR_MIME, Species.ESPEON],
  BLAINE: [Species.GROWLITHE, Species.PONYTA, Species.MAGMAR],
  GIOVANNI: [Species.SANDILE, Species.MURKROW, Species.NIDORAN_M, Species.NIDORAN_F],
  FALKNER: [Species.PIDGEY, Species.HOOTHOOT, Species.DODUO],
  BUGSY: [Species.SCYTHER, Species.HERACROSS, Species.SHUCKLE, Species.PINSIR],
  WHITNEY: [Species.GIRAFARIG, Species.MILTANK],
  MORTY: [Species.GASTLY, Species.MISDREAVUS, Species.SABLEYE],
  CHUCK: [Species.POLIWRATH, Species.MANKEY],
  JASMINE: [Species.MAGNEMITE, Species.STEELIX],
  PRYCE: [Species.SEEL, Species.SWINUB],
  CLAIR: [Species.DRATINI, Species.HORSEA, Species.GYARADOS],
  ROXANNE: [Species.GEODUDE, Species.NOSEPASS],
  BRAWLY: [Species.MACHOP, Species.MAKUHITA],
  WATTSON: [Species.MAGNEMITE, Species.VOLTORB, Species.ELECTRIKE],
  FLANNERY: [Species.SLUGMA, Species.TORKOAL, Species.NUMEL],
  NORMAN: [Species.SLAKOTH, Species.SPINDA, Species.CHANSEY, Species.KANGASKHAN],
  WINONA: [Species.SWABLU, Species.WINGULL, Species.TROPIUS, Species.SKARMORY],
  TATE: [Species.SOLROCK, Species.NATU, Species.CHIMECHO, Species.GALLADE],
  LIZA: [Species.LUNATONE, Species.SPOINK, Species.BALTOY, Species.GARDEVOIR],
  JUAN: [Species.HORSEA, Species.BARBOACH, Species.SPHEAL, Species.RELICANTH],
  ROARK: [Species.CRANIDOS, Species.LARVITAR, Species.GEODUDE],
  GARDENIA: [Species.ROSELIA, Species.TANGELA, Species.TURTWIG],
  MAYLENE: [Species.LUCARIO, Species.MEDITITE, Species.CHIMCHAR],
  CRASHER_WAKE: [Species.BUIZEL, Species.MAGIKARP, Species.PIPLUP],
  FANTINA: [Species.MISDREAVUS, Species.DRIFLOON, Species.SPIRITOMB],
  BYRON: [Species.SHIELDON, Species.BRONZOR, Species.AGGRON],
  CANDICE: [Species.SNEASEL, Species.SNOVER, Species.SNORUNT],
  VOLKNER: [Species.SHINX, Species.CHINCHOU, Species.ROTOM],
  CILAN: [Species.PANSAGE, Species.COTTONEE, Species.PETILIL],
  CHILI: [Species.PANSEAR, Species.DARUMAKA, Species.HEATMOR],
  CRESS: [Species.PANPOUR, Species.BASCULIN, Species.TYMPOLE],
  CHEREN: [Species.LILLIPUP, Species.MINCCINO, Species.PATRAT],
  LENORA: [Species.KANGASKHAN, Species.DEERLING, Species.AUDINO],
  ROXIE: [Species.VENIPEDE, Species.TRUBBISH, Species.SKORUPI],
  BURGH: [Species.SEWADDLE, Species.SHELMET, Species.KARRABLAST],
  ELESA: [Species.EMOLGA, Species.BLITZLE, Species.JOLTIK],
  CLAY: [Species.DRILBUR, Species.SANDILE, Species.GOLETT],
  SKYLA: [Species.DUCKLETT, Species.WOOBAT, Species.RUFFLET],
  BRYCEN: [Species.CRYOGONAL, Species.VANILLITE, Species.CUBCHOO],
  DRAYDEN: [Species.DRUDDIGON, Species.AXEW, Species.DEINO],
  MARLON: [Species.WAILMER, Species.FRILLISH, Species.TIRTOUGA],
  VIOLA: [Species.SURSKIT, Species.SCATTERBUG],
  GRANT: [Species.AMAURA, Species.TYRUNT],
  KORRINA: [Species.HAWLUCHA, Species.LUCARIO, Species.MIENFOO],
  RAMOS: [Species.SKIDDO, Species.HOPPIP, Species.BELLSPROUT],
  CLEMONT: [Species.HELIOPTILE, Species.MAGNEMITE, Species.EMOLGA],
  VALERIE: [Species.SYLVEON, Species.MAWILE, Species.MR_MIME],
  OLYMPIA: [Species.ESPURR, Species.SIGILYPH, Species.SLOWKING],
  WULFRIC: [Species.BERGMITE, Species.SNOVER, Species.CRYOGONAL],
  MILO: [Species.GOSSIFLEUR, Species.APPLIN, Species.BOUNSWEET],
  NESSA: [Species.CHEWTLE, Species.ARROKUDA, Species.WIMPOD],
  KABU: [Species.SIZZLIPEDE, Species.VULPIX, Species.TORKOAL],
  BEA: [Species.GALAR_FARFETCHD, Species.MACHOP, Species.CLOBBOPUS],
  ALLISTER: [Species.GALAR_YAMASK, Species.GALAR_CORSOLA, Species.GASTLY],
  OPAL: [Species.MILCERY, Species.TOGETIC, Species.GALAR_WEEZING],
  BEDE: [Species.HATENNA, Species.GALAR_PONYTA, Species.GARDEVOIR],
  GORDIE: [Species.ROLYCOLY, Species.STONJOURNER, Species.BINACLE],
  MELONY: [Species.SNOM, Species.GALAR_DARUMAKA, Species.GALAR_MR_MIME],
  PIERS: [Species.GALAR_ZIGZAGOON, Species.SCRAGGY, Species.INKAY],
  MARNIE: [Species.IMPIDIMP, Species.PURRLOIN, Species.MORPEKO],
  RAIHAN: [Species.DURALUDON, Species.TURTONATOR, Species.GOOMY],
  KATY: [Species.NYMBLE, Species.TAROUNTULA, Species.HERACROSS],
  BRASSIUS: [Species.SMOLIV, Species.SHROOMISH, Species.ODDISH],
  IONO: [Species.TADBULB, Species.WATTREL, Species.VOLTORB],
  KOFU: [Species.VELUZA, Species.WIGLETT, Species.WINGULL],
  LARRY: [Species.STARLY, Species.DUNSPARCE, Species.KOMALA],
  RYME: [Species.GREAVARD, Species.SHUPPET, Species.MIMIKYU],
  TULIP: [Species.GIRAFARIG, Species.FLITTLE, Species.RALTS],
  GRUSHA: [Species.CETODDLE, Species.ALOLA_VULPIX, Species.CUBCHOO],
  LORELEI: [Species.JYNX, [Species.SLOWBRO, Species.GALAR_SLOWBRO], Species.LAPRAS, [Species.ALOLA_SANDSLASH, Species.CLOYSTER]],
  BRUNO: [Species.MACHAMP, Species.HITMONCHAN, Species.HITMONLEE, [Species.ALOLA_GOLEM, Species.GOLEM]],
  AGATHA: [Species.GENGAR, [Species.ARBOK, Species.WEEZING], Species.CROBAT, Species.ALOLA_MAROWAK],
  LANCE: [Species.DRAGONITE, Species.GYARADOS, Species.AERODACTYL, Species.ALOLA_EXEGGUTOR],
  WILL: [Species.XATU, Species.JYNX, [Species.SLOWBRO, Species.SLOWKING], Species.EXEGGUTOR],
  KOGA: [[Species.WEEZING, Species.MUK], [Species.VENOMOTH, Species.ARIADOS], Species.CROBAT, Species.TENTACRUEL],
  KAREN: [Species.UMBREON, Species.HONCHKROW, Species.HOUNDOOM, Species.WEAVILE],
  SIDNEY: [[Species.SHIFTRY, Species.CACTURNE], [Species.SHARPEDO, Species.CRAWDAUNT], Species.ABSOL, Species.MIGHTYENA],
  PHOEBE: [Species.SABLEYE, Species.DUSKNOIR, Species.BANETTE, [Species.MISMAGIUS, Species.DRIFBLIM]],
  GLACIA: [Species.GLALIE, Species.WALREIN, Species.FROSLASS, Species.ABOMASNOW],
  DRAKE: [Species.ALTARIA, Species.SALAMENCE, Species.FLYGON, Species.KINGDRA],
  AARON: [[Species.SCIZOR, Species.KLEAVOR], Species.HERACROSS, [Species.VESPIQUEN, Species.YANMEGA], Species.DRAPION],
  BERTHA: [Species.WHISCASH, Species.HIPPOWDON, Species.GLISCOR, Species.RHYPERIOR],
  FLINT: [[Species.FLAREON, Species.RAPIDASH], Species.MAGMORTAR, [Species.STEELIX, Species.LOPUNNY], Species.INFERNAPE],
  LUCIAN: [Species.MR_MIME, Species.GALLADE, Species.BRONZONG, [Species.ALAKAZAM, Species.ESPEON]],
  SHAUNTAL: [Species.COFAGRIGUS, Species.CHANDELURE, Species.GOLURK, Species.JELLICENT],
  MARSHAL: [Species.CONKELDURR, Species.MIENSHAO, Species.THROH, Species.SAWK],
  GRIMSLEY: [Species.LIEPARD, Species.KINGAMBIT, Species.SCRAFTY, Species.KROOKODILE],
  CAITLIN: [Species.MUSHARNA, Species.GOTHITELLE, Species.SIGILYPH, Species.REUNICLUS],
  MALVA: [Species.PYROAR, Species.TORKOAL, Species.CHANDELURE, Species.TALONFLAME],
  SIEBOLD: [Species.CLAWITZER, Species.GYARADOS, Species.BARBARACLE, Species.STARMIE],
  WIKSTROM: [Species.KLEFKI, Species.PROBOPASS, Species.SCIZOR, Species.AEGISLASH],
  DRASNA: [Species.DRAGALGE, Species.DRUDDIGON, Species.ALTARIA, Species.NOIVERN],
  HALA: [Species.HARIYAMA, Species.BEWEAR, Species.CRABOMINABLE, [Species.POLIWRATH, Species.ANNIHILAPE]],
  MOLAYNE: [Species.KLEFKI, Species.MAGNEZONE, Species.METAGROSS, Species.ALOLA_DUGTRIO],
  OLIVIA: [Species.RELICANTH, Species.CARBINK, Species.ALOLA_GOLEM, Species.LYCANROC],
  ACEROLA: [[Species.BANETTE, Species.DRIFBLIM], Species.MIMIKYU, Species.DHELMISE, Species.PALOSSAND],
  KAHILI: [[Species.BRAVIARY, Species.MANDIBUZZ], Species.HAWLUCHA, Species.ORICORIO, Species.TOUCANNON],
  MARNIE_ELITE: [Species.MORPEKO, Species.LIEPARD, [Species.TOXICROAK, Species.SCRAFTY], Species.GRIMMSNARL],
  NESSA_ELITE: [Species.GOLISOPOD, [Species.PELIPPER, Species.QUAGSIRE], Species.TOXAPEX, Species.DREDNAW],
  BEA_ELITE: [Species.HAWLUCHA, [Species.GRAPPLOCT, Species.SIRFETCHD], Species.FALINKS, Species.MACHAMP],
  ALLISTER_ELITE:[Species.DUSKNOIR, [Species.POLTEAGEIST, Species.RUNERIGUS], Species.CURSOLA, Species.GENGAR],
  RAIHAN_ELITE: [Species.GOODRA, [Species.TORKOAL, Species.TURTONATOR], Species.FLYGON, Species.ARCHALUDON],
  RIKA: [Species.WHISCASH, [Species.DONPHAN, Species.DUGTRIO], Species.CAMERUPT, Species.CLODSIRE],
  POPPY: [Species.COPPERAJAH, Species.BRONZONG, Species.CORVIKNIGHT, Species.TINKATON],
  LARRY_ELITE: [Species.STARAPTOR, Species.FLAMIGO, Species.ALTARIA, Species.TROPIUS],
  HASSEL: [Species.NOIVERN, [Species.FLAPPLE, Species.APPLETUN], Species.DRAGALGE, Species.BAXCALIBUR],
  CRISPIN: [Species.TALONFLAME, Species.CAMERUPT, Species.MAGMORTAR, Species.BLAZIKEN],
  AMARYS: [Species.SKARMORY, Species.EMPOLEON, Species.SCIZOR, Species.METAGROSS],
  LACEY: [Species.EXCADRILL, Species.PRIMARINA, [Species.ALCREMIE, Species.GRANBULL], Species.WHIMSICOTT],
  DRAYTON: [Species.DRAGONITE, Species.ARCHALUDON, Species.HAXORUS, Species.SCEPTILE],
  BLUE: [[Species.GYARADOS, Species.EXEGGUTOR, Species.ARCANINE], Species.HO_OH, [Species.RHYPERIOR, Species.MAGNEZONE]], // Alakazam lead, Mega Pidgeot
  RED: [Species.LUGIA, Species.SNORLAX, [Species.ESPEON, Species.UMBREON, Species.SYLVEON]], // GMax Pikachu lead, Mega gen 1 starter
  LANCE_CHAMPION: [Species.DRAGONITE, Species.KINGDRA, Species.ALOLA_EXEGGUTOR], // Aerodactyl lead, Mega Latias/Latios
  STEVEN: [Species.AGGRON, [Species.ARMALDO, Species.CRADILY], Species.DIALGA], // Skarmory lead, Mega Metagross
  WALLACE: [Species.MILOTIC, Species.PALKIA, Species.LUDICOLO], // Pelipper lead, Mega Swampert
  CYNTHIA: [Species.GIRATINA, Species.LUCARIO, Species.TOGEKISS], // Spiritomb lead, Mega Garchomp
  ALDER: [Species.VOLCARONA, Species.ZEKROM, [Species.ACCELGOR, Species.ESCAVALIER], Species.KELDEO], // Bouffalant/Braviary lead
  IRIS: [Species.HAXORUS, Species.RESHIRAM, Species.ARCHEOPS], // Druddigon lead, Gmax Lapras
  DIANTHA: [Species.HAWLUCHA, Species.XERNEAS, Species.GOODRA], // Gourgeist lead, Mega Gardevoir
  HAU: [[Species.SOLGALEO, Species.LUNALA], Species.NOIVERN, [Species.DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA], [Species.TAPU_BULU, Species.TAPU_FINI, Species.TAPU_KOKO, Species.TAPU_LELE]], // Alola Raichu lead
  LEON: [Species.DRAGAPULT, [Species.ZACIAN, Species.ZAMAZENTA], Species.AEGISLASH], // Rillaboom/Cinderace/Inteleon lead, GMax Charizard
  GEETA: [Species.MIRAIDON, [Species.ESPATHRA, Species.VELUZA], [Species.AVALUGG, Species.HISUI_AVALUGG], Species.KINGAMBIT], // Glimmora lead
  NEMONA: [Species.KORAIDON, Species.PAWMOT, [Species.DUDUNSPARCE, Species.ORTHWORM], [Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL]], // Lycanroc lead
  KIERAN: [[Species.GRIMMSNARL, Species.INCINEROAR, Species.PORYGON_Z], Species.OGERPON, Species.TERAPAGOS, Species.HYDRAPPLE], // Poliwrath/Politoed lead
};

export const trainerConfigs: TrainerConfigs = {
  [TrainerType.UNKNOWN]: new TrainerConfig(0).setHasGenders(),
  [TrainerType.ACE_TRAINER]: new TrainerConfig(++t).setHasGenders("Ace Trainer Female").setHasDouble("Ace Duo").setMoneyMultiplier(2.25).setEncounterBgm(TrainerType.ACE_TRAINER)
      .setPartyTemplateFunc(scene => getWavePartyTemplate(scene, trainerPartyTemplates.THREE_WEAK_BALANCED, trainerPartyTemplates.FOUR_WEAK_BALANCED, trainerPartyTemplates.FIVE_WEAK_BALANCED, trainerPartyTemplates.SIX_WEAK_BALANCED)),
  [TrainerType.ARTIST]: new TrainerConfig(++t).setEncounterBgm(TrainerType.RICH).setPartyTemplates(trainerPartyTemplates.ONE_STRONG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.THREE_AVG)
      .setSpeciesPools([Species.SMEARGLE]),
  [TrainerType.BACKPACKER]: new TrainerConfig(++t).setHasGenders("Backpacker Female").setHasDouble("Backpackers").setSpeciesFilter(s => s.isOfType(Type.FLYING) || s.isOfType(Type.ROCK)).setEncounterBgm(TrainerType.BACKPACKER)
      .setPartyTemplates(trainerPartyTemplates.ONE_STRONG, trainerPartyTemplates.ONE_WEAK_ONE_STRONG, trainerPartyTemplates.ONE_AVG_ONE_STRONG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.RHYHORN, Species.AIPOM, Species.MAKUHITA, Species.MAWILE, Species.NUMEL, Species.LILLIPUP, Species.SANDILE, Species.WOOLOO],
        [TrainerPoolTier.UNCOMMON]: [Species.GIRAFARIG, Species.ZANGOOSE, Species.SEVIPER, Species.CUBCHOO, Species.PANCHAM, Species.SKIDDO, Species.MUDBRAY],
        [TrainerPoolTier.RARE]: [Species.TAUROS, Species.STANTLER, Species.DARUMAKA, Species.BOUFFALANT, Species.DEERLING, Species.IMPIDIMP],
        [TrainerPoolTier.SUPER_RARE]: [Species.GALAR_DARUMAKA, Species.TEDDIURSA]
      }),
  [TrainerType.BAKER]: new TrainerConfig(++t).setEncounterBgm(TrainerType.CLERK).setMoneyMultiplier(1.35).setSpeciesFilter(s => s.isOfType(Type.GRASS) || s.isOfType(Type.FIRE)),
  [TrainerType.BEAUTY]: new TrainerConfig(++t).setMoneyMultiplier(1.55).setEncounterBgm(TrainerType.PARASOL_LADY),
  [TrainerType.BIKER]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setEncounterBgm(TrainerType.ROUGHNECK).setSpeciesFilter(s => s.isOfType(Type.POISON)),
  [TrainerType.BLACK_BELT]: new TrainerConfig(++t).setHasGenders("Battle Girl", TrainerType.PSYCHIC).setHasDouble("Crush Kin").setEncounterBgm(TrainerType.ROUGHNECK).setSpecialtyTypes(Type.FIGHTING)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK_ONE_AVG, trainerPartyTemplates.TWO_WEAK_ONE_AVG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_WEAK_ONE_STRONG, trainerPartyTemplates.THREE_AVG, trainerPartyTemplates.TWO_AVG_ONE_STRONG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.NIDORAN_F, Species.NIDORAN_M, Species.MACHOP, Species.MAKUHITA, Species.MEDITITE, Species.CROAGUNK, Species.TIMBURR],
        [TrainerPoolTier.UNCOMMON]: [Species.MANKEY, Species.POLIWRATH, Species.TYROGUE, Species.BRELOOM, Species.SCRAGGY, Species.MIENFOO, Species.PANCHAM, Species.STUFFUL, Species.CRABRAWLER],
        [TrainerPoolTier.RARE]: [Species.HERACROSS, Species.RIOLU, Species.THROH, Species.SAWK, Species.PASSIMIAN, Species.CLOBBOPUS],
        [TrainerPoolTier.SUPER_RARE]: [Species.HITMONTOP, Species.INFERNAPE, Species.GALLADE, Species.HAWLUCHA, Species.HAKAMO_O],
        [TrainerPoolTier.ULTRA_RARE]: [Species.KUBFU]
      }),
  [TrainerType.BREEDER]: new TrainerConfig(++t).setMoneyMultiplier(1.325).setEncounterBgm(TrainerType.POKEFAN).setHasGenders("Breeder Female").setHasDouble("Breeders")
      .setPartyTemplateFunc(scene => getWavePartyTemplate(scene, trainerPartyTemplates.FOUR_WEAKER, trainerPartyTemplates.FIVE_WEAKER, trainerPartyTemplates.SIX_WEAKER))
      .setSpeciesFilter(s => s.baseTotal < 450),
  [TrainerType.CLERK]: new TrainerConfig(++t).setHasGenders("Clerk Female").setHasDouble("Colleagues").setEncounterBgm(TrainerType.CLERK)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK, trainerPartyTemplates.THREE_WEAK, trainerPartyTemplates.ONE_AVG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_WEAK_ONE_AVG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.MEOWTH, Species.PSYDUCK, Species.BUDEW, Species.PIDOVE, Species.CINCCINO, Species.LITLEO],
        [TrainerPoolTier.UNCOMMON]: [Species.JIGGLYPUFF, Species.MAGNEMITE, Species.MARILL, Species.COTTONEE, Species.SKIDDO],
        [TrainerPoolTier.RARE]: [Species.BUIZEL, Species.SNEASEL, Species.KLEFKI, Species.INDEEDEE]
      }),
  [TrainerType.CYCLIST]: new TrainerConfig(++t).setMoneyMultiplier(1.3).setHasGenders("Cyclist Female").setHasDouble("Cyclists").setEncounterBgm(TrainerType.CYCLIST)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK, trainerPartyTemplates.ONE_AVG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.PICHU, Species.STARLY, Species.TAILLOW, Species.BOLTUND],
        [TrainerPoolTier.UNCOMMON]: [Species.DODUO, Species.ELECTRIKE, Species.BLITZLE, Species.WATTREL],
        [TrainerPoolTier.RARE]: [Species.YANMA, Species.NINJASK, Species.WHIRLIPEDE, Species.EMOLGA],
        [TrainerPoolTier.SUPER_RARE]: [Species.ACCELGOR, Species.DREEPY]
      }),
  [TrainerType.DANCER]: new TrainerConfig(++t).setMoneyMultiplier(1.55).setEncounterBgm(TrainerType.CYCLIST)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK, trainerPartyTemplates.ONE_AVG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_WEAK_SAME_TWO_WEAK_SAME)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.RALTS, Species.SPOINK, Species.LOTAD, Species.BUDEW],
        [TrainerPoolTier.UNCOMMON]: [Species.SPINDA, Species.SWABLU, Species.MARACTUS,],
        [TrainerPoolTier.RARE]: [Species.BELLOSSOM, Species.HITMONTOP, Species.MIME_JR, Species.ORICORIO],
        [TrainerPoolTier.SUPER_RARE]: [Species.POPPLIO]
      }),
  [TrainerType.DEPOT_AGENT]: new TrainerConfig(++t).setMoneyMultiplier(1.45).setEncounterBgm(TrainerType.CLERK),
  [TrainerType.DOCTOR]: new TrainerConfig(++t).setHasGenders("Nurse", "lass").setHasDouble("Medical Team").setMoneyMultiplier(3).setEncounterBgm(TrainerType.CLERK)
      .setSpeciesFilter(s => !!s.getLevelMoves().find(plm => plm[1] === Moves.HEAL_PULSE)),
  [TrainerType.FIREBREATHER]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setEncounterBgm(TrainerType.ROUGHNECK)
      .setSpeciesFilter(s => !!s.getLevelMoves().find(plm => plm[1] === Moves.SMOG) || s.isOfType(Type.FIRE)),
  [TrainerType.FISHERMAN]: new TrainerConfig(++t).setMoneyMultiplier(1.25).setEncounterBgm(TrainerType.BACKPACKER).setSpecialtyTypes(Type.WATER)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK_SAME_ONE_AVG, trainerPartyTemplates.ONE_AVG, trainerPartyTemplates.THREE_WEAK_SAME, trainerPartyTemplates.ONE_STRONG, trainerPartyTemplates.SIX_WEAKER)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.TENTACOOL, Species.MAGIKARP, Species.GOLDEEN, Species.STARYU, Species.REMORAID, Species.SKRELP, Species.CLAUNCHER, Species.ARROKUDA],
        [TrainerPoolTier.UNCOMMON]: [Species.POLIWAG, Species.SHELLDER, Species.KRABBY, Species.HORSEA, Species.CARVANHA, Species.BARBOACH, Species.CORPHISH, Species.FINNEON, Species.TYMPOLE, Species.BASCULIN, Species.FRILLISH, Species.INKAY],
        [TrainerPoolTier.RARE]: [Species.CHINCHOU, Species.CORSOLA, Species.WAILMER, Species.BARBOACH, Species.CLAMPERL, Species.LUVDISC, Species.MANTYKE, Species.ALOMOMOLA, Species.TATSUGIRI, Species.VELUZA],
        [TrainerPoolTier.SUPER_RARE]: [Species.LAPRAS, Species.FEEBAS, Species.RELICANTH, Species.DONDOZO]
      }),
  [TrainerType.GUITARIST]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.ROUGHNECK).setSpecialtyTypes(Type.ELECTRIC).setSpeciesFilter(s => s.isOfType(Type.ELECTRIC)),
  [TrainerType.HARLEQUIN]: new TrainerConfig(++t).setEncounterBgm(TrainerType.PSYCHIC).setSpeciesFilter(s => tmSpecies[Moves.TRICK_ROOM].indexOf(s.speciesId) > -1),
  [TrainerType.HIKER]: new TrainerConfig(++t).setEncounterBgm(TrainerType.BACKPACKER)
      .setPartyTemplates(trainerPartyTemplates.TWO_AVG_SAME_ONE_AVG, trainerPartyTemplates.TWO_AVG_SAME_ONE_STRONG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.FOUR_WEAK, trainerPartyTemplates.ONE_STRONG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.SANDSHREW, Species.DIGLETT, Species.GEODUDE, Species.MACHOP, Species.ARON, Species.ROGGENROLA, Species.DRILBUR, Species.NACLI],
        [TrainerPoolTier.UNCOMMON]: [Species.ZUBAT, Species.RHYHORN, Species.ONIX, Species.CUBONE, Species.WOOBAT, Species.SWINUB, Species.NOSEPASS, Species.HIPPOPOTAS, Species.DWEBBLE, Species.KLAWF, Species.TOEDSCOOL],
        [TrainerPoolTier.RARE]: [Species.TORKOAL, Species.TRAPINCH, Species.BARBOACH, Species.GOLETT, Species.ALOLA_DIGLETT, Species.ALOLA_GEODUDE, Species.GALAR_STUNFISK, Species.PALDEA_WOOPER],
        [TrainerPoolTier.SUPER_RARE]: [Species.MAGBY, Species.LARVITAR]
      }),
  [TrainerType.HOOPSTER]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.CYCLIST),
  [TrainerType.INFIELDER]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.CYCLIST),
  [TrainerType.JANITOR]: new TrainerConfig(++t).setMoneyMultiplier(1.1).setEncounterBgm(TrainerType.CLERK),
  [TrainerType.LINEBACKER]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.CYCLIST),
  [TrainerType.MAID]: new TrainerConfig(++t).setMoneyMultiplier(1.6).setEncounterBgm(TrainerType.RICH),
  [TrainerType.MUSICIAN]: new TrainerConfig(++t).setEncounterBgm(TrainerType.ROUGHNECK).setSpeciesFilter(s => !!s.getLevelMoves().find(plm => plm[1] === Moves.SING)),
  [TrainerType.HEX_MANIAC]: new TrainerConfig(++t).setMoneyMultiplier(1.5).setEncounterBgm(TrainerType.PSYCHIC)
      .setPartyTemplates(trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.ONE_AVG_ONE_STRONG, trainerPartyTemplates.TWO_AVG_SAME_ONE_AVG, trainerPartyTemplates.THREE_AVG, trainerPartyTemplates.TWO_STRONG)
      .setSpeciesFilter(s => s.isOfType(Type.GHOST)),
  [TrainerType.NURSERY_AIDE]: new TrainerConfig(++t).setMoneyMultiplier(1.3).setEncounterBgm("lass"),
  [TrainerType.OFFICER]: new TrainerConfig(++t).setMoneyMultiplier(1.55).setEncounterBgm(TrainerType.CLERK)
      .setPartyTemplates(trainerPartyTemplates.ONE_AVG, trainerPartyTemplates.ONE_STRONG, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_WEAK_SAME_ONE_AVG)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.VULPIX, Species.GROWLITHE, Species.SNUBBULL, Species.POOCHYENA, Species.ELECTRIKE, Species.LILLIPUP, Species.YAMPER, Species.FIDOUGH],
        [TrainerPoolTier.UNCOMMON]: [Species.HOUNDOUR, Species.ROCKRUFF, Species.MASCHIFF],
        [TrainerPoolTier.RARE]: [Species.JOLTEON, Species.RIOLU],
        [TrainerPoolTier.SUPER_RARE]: [],
        [TrainerPoolTier.ULTRA_RARE]: [Species.ENTEI, Species.SUICUNE, Species.RAIKOU]
      }),
  [TrainerType.PARASOL_LADY]: new TrainerConfig(++t).setMoneyMultiplier(1.55).setEncounterBgm(TrainerType.PARASOL_LADY).setSpeciesFilter(s => s.isOfType(Type.WATER)),
  [TrainerType.PILOT]: new TrainerConfig(++t).setEncounterBgm(TrainerType.CLERK).setSpeciesFilter(s => tmSpecies[Moves.FLY].indexOf(s.speciesId) > -1),
  [TrainerType.POKEFAN]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setName("PokéFan").setHasGenders("PokéFan Female").setHasDouble("PokéFan Family").setEncounterBgm(TrainerType.POKEFAN)
      .setPartyTemplates(trainerPartyTemplates.SIX_WEAKER, trainerPartyTemplates.FOUR_WEAK, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.ONE_STRONG, trainerPartyTemplates.FOUR_WEAK_SAME, trainerPartyTemplates.FIVE_WEAK, trainerPartyTemplates.SIX_WEAKER_SAME),
  [TrainerType.PRESCHOOLER]: new TrainerConfig(++t).setMoneyMultiplier(0.2).setEncounterBgm(TrainerType.YOUNGSTER).setHasGenders("Preschooler Female", "lass").setHasDouble("Preschoolers")
      .setPartyTemplates(trainerPartyTemplates.THREE_WEAK, trainerPartyTemplates.FOUR_WEAKER, trainerPartyTemplates.TWO_WEAK_SAME_ONE_AVG, trainerPartyTemplates.FIVE_WEAKER)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.CATERPIE, Species.PICHU, Species.SANDSHREW, Species.LEDYBA, Species.BUDEW, Species.BURMY, Species.WOOLOO, Species.PAWMI, Species.SMOLIV],
        [TrainerPoolTier.UNCOMMON]: [Species.EEVEE, Species.CLEFFA, Species.IGGLYBUFF, Species.SWINUB, Species.WOOPER, Species.DRIFLOON, Species.DEDENNE, Species.STUFFUL],
        [TrainerPoolTier.RARE]: [Species.RALTS, Species.RIOLU, Species.JOLTIK, Species.TANDEMAUS],
        [TrainerPoolTier.SUPER_RARE]: [Species.DARUMAKA, Species.TINKATINK],
      }),
  [TrainerType.PSYCHIC]: new TrainerConfig(++t).setHasGenders("Psychic Female").setHasDouble("Psychics").setMoneyMultiplier(1.4).setEncounterBgm(TrainerType.PSYCHIC)
      .setPartyTemplates(trainerPartyTemplates.TWO_WEAK, trainerPartyTemplates.TWO_AVG, trainerPartyTemplates.TWO_WEAK_SAME_ONE_AVG, trainerPartyTemplates.TWO_WEAK_SAME_TWO_WEAK_SAME, trainerPartyTemplates.ONE_STRONGER)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.ABRA, Species.DROWZEE, Species.RALTS, Species.SPOINK, Species.GOTHITA, Species.SOLOSIS, Species.BLIPBUG, Species.ESPURR, Species.HATENNA],
        [TrainerPoolTier.UNCOMMON]: [Species.MIME_JR, Species.EXEGGCUTE, Species.MEDITITE, Species.NATU, Species.EXEGGCUTE, Species.WOOBAT, Species.INKAY, Species.ORANGURU],
        [TrainerPoolTier.RARE]: [Species.ELGYEM, Species.SIGILYPH, Species.BALTOY, Species.GIRAFARIG, Species.MEOWSTIC],
        [TrainerPoolTier.SUPER_RARE]: [Species.BELDUM, Species.ESPEON, Species.STANTLER],
      }),
  [TrainerType.RANGER]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setName("Pokémon Ranger").setEncounterBgm(TrainerType.BACKPACKER).setHasGenders("Pokémon Ranger Female").setHasDouble("Pokémon Rangers")
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.PICHU, Species.GROWLITHE, Species.PONYTA, Species.ZIGZAGOON, Species.SEEDOT, Species.BIDOOF, Species.RIOLU, Species.SEWADDLE, Species.SKIDDO, Species.SALANDIT, Species.YAMPER],
        [TrainerPoolTier.UNCOMMON]: [Species.AZURILL, Species.TAUROS, Species.MAREEP, Species.FARFETCHD, Species.TEDDIURSA, Species.SHROOMISH, Species.ELECTRIKE, Species.BUDEW, Species.BUIZEL, Species.MUDBRAY, Species.STUFFUL],
        [TrainerPoolTier.RARE]: [Species.EEVEE, Species.SCYTHER, Species.KANGASKHAN, Species.RALTS, Species.MUNCHLAX, Species.ZORUA, Species.PALDEA_TAUROS, Species.TINKATINK, Species.CYCLIZAR, Species.FLAMIGO],
        [TrainerPoolTier.SUPER_RARE]: [Species.LARVESTA],
      }),
  [TrainerType.RICH]: new TrainerConfig(++t).setMoneyMultiplier(5).setName("Gentleman").setHasGenders("Madame").setHasDouble("Rich Couple"),
  [TrainerType.RICH_KID]: new TrainerConfig(++t).setMoneyMultiplier(3.75).setName("Rich Boy").setHasGenders("Lady").setHasDouble("Rich Kids").setEncounterBgm(TrainerType.RICH),
  [TrainerType.ROUGHNECK]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setEncounterBgm(TrainerType.ROUGHNECK).setSpeciesFilter(s => s.isOfType(Type.DARK)),
  [TrainerType.SAILOR]: new TrainerConfig(++t).setMoneyMultiplier(1.4).setEncounterBgm(TrainerType.BACKPACKER).setSpeciesFilter(s => s.isOfType(Type.WATER) || s.isOfType(Type.FIGHTING)),
  [TrainerType.SCIENTIST]: new TrainerConfig(++t).setHasGenders("Scientist Female").setHasDouble("Scientists").setMoneyMultiplier(1.7).setEncounterBgm(TrainerType.SCIENTIST)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.MAGNEMITE, Species.GRIMER, Species.DROWZEE, Species.VOLTORB, Species.KOFFING],
        [TrainerPoolTier.UNCOMMON]: [Species.BALTOY, Species.BRONZOR, Species.FERROSEED, Species.KLINK, Species.CHARJABUG, Species.BLIPBUG, Species.HELIOPTILE],
        [TrainerPoolTier.RARE]: [Species.ABRA, Species.DITTO, Species.PORYGON, Species.ELEKID, Species.SOLOSIS, Species.GALAR_WEEZING],
        [TrainerPoolTier.SUPER_RARE]: [Species.OMANYTE, Species.KABUTO, Species.AERODACTYL, Species.LILEEP, Species.ANORITH, Species.CRANIDOS, Species.SHIELDON, Species.TIRTOUGA, Species.ARCHEN, Species.ARCTOVISH, Species.ARCTOZOLT, Species.DRACOVISH, Species.DRACOZOLT],
        [TrainerPoolTier.ULTRA_RARE]: [Species.ROTOM, Species.MELTAN]
      }),
  [TrainerType.SMASHER]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.CYCLIST),
  [TrainerType.SNOW_WORKER]: new TrainerConfig(++t).setName("Worker").setHasGenders("Worker Female").setHasDouble("Workers").setMoneyMultiplier(1.7).setEncounterBgm(TrainerType.CLERK).setSpeciesFilter(s => s.isOfType(Type.ICE) || s.isOfType(Type.STEEL)),
  [TrainerType.STRIKER]: new TrainerConfig(++t).setMoneyMultiplier(1.2).setEncounterBgm(TrainerType.CYCLIST),
  [TrainerType.SCHOOL_KID]: new TrainerConfig(++t).setMoneyMultiplier(0.75).setEncounterBgm(TrainerType.YOUNGSTER).setHasGenders("School Kid Female", "lass").setHasDouble("School Kids")
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.ODDISH, Species.EXEGGCUTE, Species.TEDDIURSA, Species.WURMPLE, Species.RALTS, Species.SHROOMISH, Species.FLETCHLING],
        [TrainerPoolTier.UNCOMMON]: [Species.VOLTORB, Species.WHISMUR, Species.MEDITITE, Species.MIME_JR, Species.NYMBLE],
        [TrainerPoolTier.RARE]: [Species.TANGELA, Species.EEVEE, Species.YANMA],
        [TrainerPoolTier.SUPER_RARE]: [Species.TADBULB]
      }),
  [TrainerType.SWIMMER]: new TrainerConfig(++t).setMoneyMultiplier(1.3).setEncounterBgm(TrainerType.PARASOL_LADY).setHasGenders("Swimmer Female").setHasDouble("Swimmers").setSpecialtyTypes(Type.WATER).setSpeciesFilter(s => s.isOfType(Type.WATER)),

  [TrainerType.VETERAN]: new TrainerConfig(++t).setHasGenders("Veteran Female").setHasDouble("Veteran Duo").setMoneyMultiplier(2.5).setEncounterBgm(TrainerType.ACE_TRAINER).setSpeciesFilter(s => s.isOfType(Type.DRAGON)),
  [TrainerType.WAITER]: new TrainerConfig(++t).setHasGenders("Waitress").setHasDouble("Restaurant Staff").setMoneyMultiplier(1.5).setEncounterBgm(TrainerType.CLERK)
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.CLEFFA, Species.CHATOT, Species.PANSAGE, Species.PANSEAR, Species.PANPOUR, Species.MINCCINO],
        [TrainerPoolTier.UNCOMMON]: [Species.TROPIUS, Species.PETILIL, Species.BOUNSWEET, Species.INDEEDEE],
        [TrainerPoolTier.RARE]: [Species.APPLIN, Species.SINISTEA, Species.POLTCHAGEIST]
      }),
  [TrainerType.WORKER]: new TrainerConfig(++t).setHasGenders("Worker Female").setHasDouble("Workers").setEncounterBgm(TrainerType.CLERK).setMoneyMultiplier(1.7).setSpeciesFilter(s => s.isOfType(Type.ROCK) || s.isOfType(Type.STEEL)),
  [TrainerType.YOUNGSTER]: new TrainerConfig(++t).setMoneyMultiplier(0.5).setEncounterBgm(TrainerType.YOUNGSTER).setHasGenders("Lass", "lass").setHasDouble("Beginners").setPartyTemplates(trainerPartyTemplates.TWO_WEAKER)
      .setSpeciesPools(
          [Species.CATERPIE, Species.WEEDLE, Species.SENTRET, Species.POOCHYENA, Species.ZIGZAGOON, Species.WURMPLE, Species.BIDOOF, Species.PATRAT, Species.LILLIPUP]
      ),
  [TrainerType.ROCKET_GRUNT]: new TrainerConfig(++t).setHasGenders("Rocket Grunt Female").setHasDouble("Rocket Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_rocket_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.WEEDLE, Species.EKANS, Species.SANDSHREW, Species.ZUBAT, Species.GEODUDE, Species.KOFFING, Species.GRIMER, Species.ODDISH],
        [TrainerPoolTier.UNCOMMON]: [Species.GYARADOS, Species.TAUROS, Species.SCYTHER, Species.CUBONE, Species.GROWLITHE, Species.MURKROW, Species.GASTLY, Species.EXEGGCUTE, Species.VOLTORB],
        [TrainerPoolTier.RARE]: [Species.PORYGON, Species.ALOLA_SANDSHREW, Species.ALOLA_MEOWTH, Species.ALOLA_GRIMER, Species.ALOLA_GEODUDE],
        [TrainerPoolTier.SUPER_RARE]: [Species.DRATINI, Species.LARVITAR]
      }),
  [TrainerType.ARCHER]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("rocket_admin", "rocket", [Species.HOUNDOOM]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_rocket_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.ARIANA]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("rocket_admin_female", "rocket", [Species.ARBOK]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_rocket_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.PROTON]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("rocket_admin", "rocket", [Species.CROBAT]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_rocket_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.PETREL]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("rocket_admin", "rocket", [Species.WEEZING]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_rocket_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.MAGMA_GRUNT]: new TrainerConfig(++t).setHasGenders("Magma Grunt Female").setHasDouble("Magma Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.SLUGMA, Species.POOCHYENA, Species.NUMEL, Species.ZIGZAGOON, Species.DIGLETT, Species.MAGBY, Species.TORKOAL, Species.BALTOY, Species.BARBOACH],
        [TrainerPoolTier.UNCOMMON]: [Species.SOLROCK, Species.HIPPOPOTAS, Species.SANDACONDA, Species.PHANPY, Species.ROLYCOLY, Species.GLIGAR],
        [TrainerPoolTier.RARE]: [Species.TRAPINCH, Species.HEATMOR],
        [TrainerPoolTier.SUPER_RARE]: [Species.CAPSAKID, Species.CHARCADET]
      }),
  [TrainerType.TABITHA]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("magma_admin", "magma", [Species.CAMERUPT]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.COURTNEY]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("magma_admin_female", "magma", [Species.CAMERUPT]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.AQUA_GRUNT]: new TrainerConfig(++t).setHasGenders("Aqua Grunt Female").setHasDouble("Aqua Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.CARVANHA, Species.WAILMER, Species.ZIGZAGOON, Species.LOTAD, Species.CORPHISH, Species.SPHEAL],
        [TrainerPoolTier.UNCOMMON]: [Species.CLAMPERL, Species.CHINCHOU, Species.WOOPER, Species.WINGULL, Species.TENTACOOL, Species.QWILFISH],
        [TrainerPoolTier.RARE]: [Species.MANTINE, Species.BASCULEGION, Species.REMORAID, Species.ARROKUDA],
        [TrainerPoolTier.SUPER_RARE]: [Species.DONDOZO]
      }),
  [TrainerType.MATT]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("aqua_admin", "aqua", [Species.SHARPEDO]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.SHELLY]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("aqua_admin_female", "aqua", [Species.SHARPEDO]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aqua_magma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.GALACTIC_GRUNT]: new TrainerConfig(++t).setHasGenders("Galactic Grunt Female").setHasDouble("Galactic Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_galactic_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.GLAMEOW, Species.STUNKY, Species.CROAGUNK, Species.SHINX, Species.WURMPLE, Species.BRONZOR, Species.DRIFLOON, Species.BURMY],
        [TrainerPoolTier.UNCOMMON]: [Species.CARNIVINE, Species.GROWLITHE, Species.QWILFISH, Species.SNEASEL],
        [TrainerPoolTier.RARE]: [Species.HISUI_GROWLITHE, Species.HISUI_QWILFISH, Species.HISUI_SNEASEL],
        [TrainerPoolTier.SUPER_RARE]: [Species.HISUI_ZORUA, Species.HISUI_SLIGGOO]
      }),
  [TrainerType.JUPITER]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("galactic_commander_female", "galactic", [Species.SKUNTANK]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_galactic_admin").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.MARS]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("galactic_commander_female", "galactic", [Species.PURUGLY]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_galactic_admin").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.SATURN]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("galactic_commander", "galactic", [Species.TOXICROAK]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_galactic_admin").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.PLASMA_GRUNT]: new TrainerConfig(++t).setHasGenders("Plasma Grunt Female").setHasDouble("Plasma Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_plasma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.PATRAT, Species.LILLIPUP, Species.PURRLOIN, Species.SCRAFTY, Species.WOOBAT, Species.VANILLITE, Species.SANDILE, Species.TRUBBISH],
        [TrainerPoolTier.UNCOMMON]: [Species.FRILLISH, Species.VENIPEDE, Species.GOLETT, Species.TIMBURR, Species.DARUMAKA, Species.AMOONGUSS],
        [TrainerPoolTier.RARE]: [Species.PAWNIARD, Species.VULLABY, Species.ZORUA, Species.DRILBUR, Species.KLINK],
        [TrainerPoolTier.SUPER_RARE]: [Species.DRUDDIGON, Species.BOUFFALANT, Species.AXEW, Species.DEINO, Species.DURANT]
      }),
  [TrainerType.ZINZOLIN]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("plasma_sage", "plasma", [Species.CRYOGONAL]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_plasma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.ROOD]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("plasma_sage", "plasma", [Species.SWOOBAT]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_plasma_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.FLARE_GRUNT]: new TrainerConfig(++t).setHasGenders("Flare Grunt Female").setHasDouble("Flare Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_flare_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [Species.FLETCHLING, Species.LITLEO, Species.PONYTA, Species.INKAY, Species.HOUNDOUR, Species.SKORUPI, Species.SCRAFTY, Species.CROAGUNK],
        [TrainerPoolTier.UNCOMMON]: [Species.HELIOPTILE, Species.ELECTRIKE, Species.SKRELP, Species.GULPIN, Species.PURRLOIN, Species.POOCHYENA, Species.SCATTERBUG],
        [TrainerPoolTier.RARE]: [Species.LITWICK, Species.SNEASEL, Species.PANCHAM, Species.PAWNIARD],
        [TrainerPoolTier.SUPER_RARE]: [Species.NOIVERN, Species.DRUDDIGON]
      }),
  [TrainerType.BRYONY]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("flare_admin_female", "flare", [Species.LIEPARD]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_flare_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.XEROSIC]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("flare_admin", "flare", [Species.MALAMAR]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_flare_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.AETHER_GRUNT]: new TrainerConfig(++t).setHasGenders("Aether Grunt Female").setHasDouble("Aether Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aether_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [ Species.PIKIPEK, Species.ROCKRUFF, Species.ALOLA_DIGLETT, Species.YUNGOOS, Species.CORSOLA, Species.ALOLA_GEODUDE, Species.BOUNSWEET, Species.LILLIPUP],
        [TrainerPoolTier.UNCOMMON]: [ Species.POLIWAG, Species.STUFFUL,Species.PORYGON, Species.JANGMO_O, Species.CRABRAWLER, Species.CUTIEFLY, Species.ORICORIO, Species.MUDBRAY],
        [TrainerPoolTier.RARE]: [ Species.ORANGURU, Species.PASSIMIAN, Species.GALAR_CORSOLA, Species.ALOLA_SANDSHREW, Species.ALOLA_VULPIX, Species.TURTONATOR, Species.DRAMPA],
        [TrainerPoolTier.SUPER_RARE]: [Species.ALOLA_EXEGGUTOR, Species.ALOLA_RAICHU,Species.ALOLA_MAROWAK]
      }),
  [TrainerType.FABA]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("aether_admin", "aether", [Species.HYPNO]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_aether_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.SKULL_GRUNT]: new TrainerConfig(++t).setHasGenders("Skull Grunt Female").setHasDouble("Skull Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_skull_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [ Species.SALANDIT, Species.ALOLA_MEOWTH, Species.SCRAGGY, Species.KOFFING, Species.ALOLA_GRIMER, Species.MAREANIE, Species.SPINARAK, Species.TRUBBISH],
        [TrainerPoolTier.UNCOMMON]: [ Species.FOMANTIS, Species.SABLEYE, Species.SANDILE, Species.PANCHAM, Species.DROWZEE, Species.ZUBAT, Species.VENIPEDE, Species.VULLABY],
        [TrainerPoolTier.RARE]: [Species.SANDYGAST, Species.PAWNIARD, Species.MIMIKYU, Species.DHELMISE, Species.GASTLY, Species.WISHIWASHI],
        [TrainerPoolTier.SUPER_RARE]: [Species.GRUBBIN, Species.DEWPIDER, Species.ALOLA_MAROWAK]
      }),
  [TrainerType.PLUMERIA]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("skull_admin", "skull", [Species.SALAZZLE]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_skull_admin").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),
  [TrainerType.MACRO_GRUNT]: new TrainerConfig(++t).setHasGenders("Macro Grunt Female").setHasDouble("Macro Grunts").setMoneyMultiplier(1.0).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_macro_grunt").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene))
      .setSpeciesPools({
        [TrainerPoolTier.COMMON]: [ Species.CUFANT, Species.GALAR_MEOWTH, Species.KLINK, Species.ROOKIDEE, Species.CRAMORANT, Species.GALAR_ZIGZAGOON, Species.SKWOVET, Species.STEELIX, Species.MAWILE, Species.FERROSEED],
        [TrainerPoolTier.UNCOMMON]: [ Species.DRILBUR, Species.MAGNEMITE, Species.HATENNA, Species.ARROKUDA, Species.APPLIN, Species.GALAR_PONYTA, Species.GALAR_YAMASK, Species.SINISTEA, Species.RIOLU],
        [TrainerPoolTier.RARE]: [Species.FALINKS, Species.BELDUM, Species.GALAR_FARFETCHD, Species.GALAR_MR_MIME, Species.HONEDGE, Species.SCIZOR, Species.GALAR_DARUMAKA],
        [TrainerPoolTier.SUPER_RARE]: [Species.DURALUDON, Species.DREEPY]
      }),
  [TrainerType.OLEANA]: new TrainerConfig(++t).setMoneyMultiplier(1.5).initForEvilTeamAdmin("macro_admin", "macro", [Species.GARBODOR]).setEncounterBgm(TrainerType.PLASMA_GRUNT).setBattleBgm("battle_plasma_grunt").setMixedBattleBgm("battle_oleana").setVictoryBgm("victory_team_plasma").setPartyTemplateFunc(scene => getEvilGruntPartyTemplate(scene)),

  [TrainerType.BROCK]: new TrainerConfig((t = TrainerType.BROCK)).initForGymLeader(signatureSpecies["BROCK"],true, Type.ROCK).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.MISTY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MISTY"],false, Type.WATER).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.LT_SURGE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["LT_SURGE"],true, Type.ELECTRIC).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.ERIKA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["ERIKA"],false, Type.GRASS).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.JANINE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["JANINE"],false, Type.POISON).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.SABRINA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["SABRINA"],false, Type.PSYCHIC).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.BLAINE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BLAINE"],true, Type.FIRE).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.GIOVANNI]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["GIOVANNI"],true, Type.DARK).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.FALKNER]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["FALKNER"],true, Type.FLYING).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.BUGSY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BUGSY"],true, Type.BUG).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.WHITNEY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["WHITNEY"],false, Type.NORMAL).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.MORTY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MORTY"],true, Type.GHOST).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.CHUCK]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CHUCK"],true, Type.FIGHTING).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.JASMINE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["JASMINE"],false, Type.STEEL).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.PRYCE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["PRYCE"],true, Type.ICE).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.CLAIR]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CLAIR"],false, Type.DRAGON).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.ROXANNE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["ROXANNE"],false, Type.ROCK).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.BRAWLY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BRAWLY"],true, Type.FIGHTING).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.WATTSON]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["WATTSON"],true, Type.ELECTRIC).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.FLANNERY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["FLANNERY"],false, Type.FIRE).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.NORMAN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["NORMAN"],true, Type.NORMAL).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.WINONA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["WINONA"],false, Type.FLYING).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.TATE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["TATE"],true, Type.PSYCHIC).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym").setHasDouble("tate_liza_double").setDoubleTrainerType(TrainerType.LIZA).setDoubleTitle("gym_leader_double"),
  [TrainerType.LIZA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["LIZA"],false, Type.PSYCHIC).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym").setHasDouble("liza_tate_double").setDoubleTrainerType(TrainerType.TATE).setDoubleTitle("gym_leader_double"),
  [TrainerType.JUAN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["JUAN"],true, Type.WATER).setBattleBgm("battle_hoenn_gym").setMixedBattleBgm("battle_hoenn_gym"),
  [TrainerType.ROARK]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["ROARK"],true, Type.ROCK).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.GARDENIA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["GARDENIA"],false, Type.GRASS).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.MAYLENE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MAYLENE"],false, Type.FIGHTING).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.CRASHER_WAKE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CRASHER_WAKE"],true, Type.WATER).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.FANTINA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["FANTINA"],false, Type.GHOST).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.BYRON]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BYRON"],true, Type.STEEL).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.CANDICE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CANDICE"],false, Type.ICE).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.VOLKNER]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["VOLKNER"],true, Type.ELECTRIC).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.CILAN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CILAN"],true, Type.GRASS).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.CHILI]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CHILI"],true, Type.FIRE).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.CRESS]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CRESS"],true, Type.WATER).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.CHEREN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CHEREN"],true, Type.NORMAL).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.LENORA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["LENORA"],false, Type.NORMAL).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.ROXIE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["ROXIE"],false, Type.POISON).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.BURGH]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BURGH"],true, Type.BUG).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.ELESA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["ELESA"],false, Type.ELECTRIC).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.CLAY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CLAY"],true, Type.GROUND).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.SKYLA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["SKYLA"],false, Type.FLYING).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.BRYCEN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BRYCEN"],true, Type.ICE).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.DRAYDEN]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["DRAYDEN"],true, Type.DRAGON).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.MARLON]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MARLON"],true, Type.WATER).setMixedBattleBgm("battle_unova_gym"),
  [TrainerType.VIOLA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["VIOLA"],false, Type.BUG).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.GRANT]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["GRANT"],true, Type.ROCK).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.KORRINA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["KORRINA"],false, Type.FIGHTING).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.RAMOS]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["RAMOS"],true, Type.GRASS).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.CLEMONT]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["CLEMONT"],true, Type.ELECTRIC).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.VALERIE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["VALERIE"],false, Type.FAIRY).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.OLYMPIA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["OLYMPIA"],false, Type.PSYCHIC).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.WULFRIC]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["WULFRIC"],true, Type.ICE).setMixedBattleBgm("battle_kalos_gym"),
  [TrainerType.MILO]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MILO"],true, Type.GRASS).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.NESSA]: new TrainerConfig(++t).setName("Nessa").initForGymLeader(signatureSpecies["NESSA"],false, Type.WATER).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.KABU]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["KABU"],true, Type.FIRE).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.BEA]: new TrainerConfig(++t).setName("Bea").initForGymLeader(signatureSpecies["BEA"],false, Type.FIGHTING).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.ALLISTER]: new TrainerConfig(++t).setName("Allister").initForGymLeader(signatureSpecies["ALLISTER"],true, Type.GHOST).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.OPAL]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["OPAL"],false, Type.FAIRY).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.BEDE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BEDE"],true, Type.FAIRY).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.GORDIE]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["GORDIE"],true, Type.ROCK).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.MELONY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["MELONY"],false, Type.ICE).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.PIERS]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["PIERS"],true, Type.DARK).setHasDouble("piers_marnie_double").setDoubleTrainerType(TrainerType.MARNIE).setDoubleTitle("gym_leader_double").setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.MARNIE]: new TrainerConfig(++t).setName("Marnie").initForGymLeader(signatureSpecies["MARNIE"],false, Type.DARK).setHasDouble("marnie_piers_double").setDoubleTrainerType(TrainerType.PIERS).setDoubleTitle("gym_leader_double").setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.RAIHAN]: new TrainerConfig(++t).setName("Raihan").initForGymLeader(signatureSpecies["RAIHAN"],true, Type.DRAGON).setMixedBattleBgm("battle_galar_gym"),
  [TrainerType.KATY]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["KATY"],false, Type.BUG).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.BRASSIUS]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["BRASSIUS"],true, Type.GRASS).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.IONO]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["IONO"],false, Type.ELECTRIC).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.KOFU]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["KOFU"],true, Type.WATER).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.LARRY]: new TrainerConfig(++t).setName("Larry").initForGymLeader(signatureSpecies["LARRY"],true, Type.NORMAL).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.RYME]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["RYME"],false, Type.GHOST).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.TULIP]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["TULIP"],false, Type.PSYCHIC).setMixedBattleBgm("battle_paldea_gym"),
  [TrainerType.GRUSHA]: new TrainerConfig(++t).initForGymLeader(signatureSpecies["GRUSHA"],true, Type.ICE).setMixedBattleBgm("battle_paldea_gym"),

  [TrainerType.LORELEI]: new TrainerConfig((t = TrainerType.LORELEI)).initForEliteFour(signatureSpecies["LORELEI"],false, Type.ICE).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.BRUNO]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["BRUNO"], true, Type.FIGHTING).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.AGATHA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["AGATHA"], false,Type.GHOST).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.LANCE]: new TrainerConfig(++t).setName("Lance").initForEliteFour(signatureSpecies["LANCE"],true, Type.DRAGON).setBattleBgm("battle_kanto_gym").setMixedBattleBgm("battle_kanto_gym"),
  [TrainerType.WILL]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["WILL"],true, Type.PSYCHIC).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.KOGA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["KOGA"], true, Type.POISON).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.KAREN]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["KAREN"],false, Type.DARK).setBattleBgm("battle_johto_gym").setMixedBattleBgm("battle_johto_gym"),
  [TrainerType.SIDNEY]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["SIDNEY"],true, Type.DARK).setMixedBattleBgm("battle_hoenn_elite"),
  [TrainerType.PHOEBE]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["PHOEBE"],false, Type.GHOST).setMixedBattleBgm("battle_hoenn_elite"),
  [TrainerType.GLACIA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["GLACIA"],false, Type.ICE).setMixedBattleBgm("battle_hoenn_elite"),
  [TrainerType.DRAKE]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["DRAKE"],true, Type.DRAGON).setMixedBattleBgm("battle_hoenn_elite"),
  [TrainerType.AARON]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["AARON"],true, Type.BUG).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.BERTHA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["BERTHA"],false, Type.GROUND).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.FLINT]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["FLINT"],true, Type.FIRE).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.LUCIAN]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["LUCIAN"], true,Type.PSYCHIC).setBattleBgm("battle_sinnoh_gym").setMixedBattleBgm("battle_sinnoh_gym"),
  [TrainerType.SHAUNTAL]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["SHAUNTAL"],false, Type.GHOST).setMixedBattleBgm("battle_unova_elite"),
  [TrainerType.MARSHAL]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["MARSHAL"],true, Type.FIGHTING).setMixedBattleBgm("battle_unova_elite"),
  [TrainerType.GRIMSLEY]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["GRIMSLEY"],true, Type.DARK).setMixedBattleBgm("battle_unova_elite"),
  [TrainerType.CAITLIN]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["CAITLIN"],false, Type.PSYCHIC).setMixedBattleBgm("battle_unova_elite"),
  [TrainerType.MALVA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["MALVA"], false,Type.FIRE).setMixedBattleBgm("battle_kalos_elite"),
  [TrainerType.SIEBOLD]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["SIEBOLD"], true,Type.WATER).setMixedBattleBgm("battle_kalos_elite"),
  [TrainerType.WIKSTROM]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["WIKSTROM"],true, Type.STEEL).setMixedBattleBgm("battle_kalos_elite"),
  [TrainerType.DRASNA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["DRASNA"],false, Type.DRAGON).setMixedBattleBgm("battle_kalos_elite"),
  [TrainerType.HALA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["HALA"],true, Type.FIGHTING).setMixedBattleBgm("battle_alola_elite"),
  [TrainerType.MOLAYNE]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["MOLAYNE"],true, Type.STEEL).setMixedBattleBgm("battle_alola_elite"),
  [TrainerType.OLIVIA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["OLIVIA"],false, Type.ROCK).setMixedBattleBgm("battle_alola_elite"),
  [TrainerType.ACEROLA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["ACEROLA"],false, Type.GHOST).setMixedBattleBgm("battle_alola_elite"),
  [TrainerType.KAHILI]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["KAHILI"],false, Type.FLYING).setMixedBattleBgm("battle_alola_elite"),
  [TrainerType.MARNIE_ELITE]: new TrainerConfig(++t).setName("Marnie").initForEliteFour(signatureSpecies["MARNIE_ELITE"],false, Type.DARK).setMixedBattleBgm("battle_galar_elite"),
  [TrainerType.NESSA_ELITE]: new TrainerConfig(++t).setName("Nessa").initForEliteFour(signatureSpecies["NESSA_ELITE"],false, Type.WATER).setMixedBattleBgm("battle_galar_elite"),
  [TrainerType.BEA_ELITE]: new TrainerConfig(++t).setName("Bea").initForEliteFour(signatureSpecies["BEA_ELITE"],false, Type.FIGHTING).setMixedBattleBgm("battle_galar_elite"),
  [TrainerType.ALLISTER_ELITE]: new TrainerConfig(++t).setName("Allister").initForEliteFour(signatureSpecies["ALLISTER_ELITE"],true, Type.GHOST).setMixedBattleBgm("battle_galar_elite"),
  [TrainerType.RAIHAN_ELITE]: new TrainerConfig(++t).setName("Raihan").initForEliteFour(signatureSpecies["RAIHAN_ELITE"],true, Type.DRAGON).setMixedBattleBgm("battle_galar_elite"),
  [TrainerType.RIKA]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["RIKA"],false, Type.GROUND).setMixedBattleBgm("battle_paldea_elite"),
  [TrainerType.POPPY]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["POPPY"],false, Type.STEEL).setMixedBattleBgm("battle_paldea_elite"),
  [TrainerType.LARRY_ELITE]: new TrainerConfig(++t).setName("Larry").initForEliteFour(signatureSpecies["LARRY_ELITE"],true, Type.NORMAL, Type.FLYING).setMixedBattleBgm("battle_paldea_elite"),
  [TrainerType.HASSEL]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["HASSEL"],true, Type.DRAGON).setMixedBattleBgm("battle_paldea_elite"),
  [TrainerType.CRISPIN]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["CRISPIN"],true, Type.FIRE).setMixedBattleBgm("battle_bb_elite"),
  [TrainerType.AMARYS]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["AMARYS"],false, Type.STEEL).setMixedBattleBgm("battle_bb_elite"),
  [TrainerType.LACEY]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["LACEY"],false, Type.FAIRY).setMixedBattleBgm("battle_bb_elite"),
  [TrainerType.DRAYTON]: new TrainerConfig(++t).initForEliteFour(signatureSpecies["DRAYTON"],true, Type.DRAGON).setMixedBattleBgm("battle_bb_elite"),

  [TrainerType.BLUE]: new TrainerConfig((t = TrainerType.BLUE)).initForChampion(signatureSpecies["BLUE"],true).setBattleBgm("battle_kanto_champion").setMixedBattleBgm("battle_kanto_champion").setHasDouble("blue_red_double").setDoubleTrainerType(TrainerType.RED).setDoubleTitle("champion_double")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.ALAKAZAM], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.PIDGEOT], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.RED]: new TrainerConfig(++t).initForChampion(signatureSpecies["RED"],true).setBattleBgm("battle_johto_champion").setMixedBattleBgm("battle_johto_champion").setHasDouble("red_blue_double").setDoubleTrainerType(TrainerType.BLUE).setDoubleTitle("champion_double")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.PIKACHU], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 8;
        p.generateAndPopulateMoveset();
        p.generateName();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.LANCE_CHAMPION]: new TrainerConfig(++t).setName("Lance").initForChampion(signatureSpecies["LANCE_CHAMPION"],true).setBattleBgm("battle_johto_champion").setMixedBattleBgm("battle_johto_champion")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.AERODACTYL], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.LATIAS, Species.LATIOS], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.STEVEN]: new TrainerConfig(++t).initForChampion(signatureSpecies["STEVEN"], true).setBattleBgm("battle_hoenn_champion_g5").setMixedBattleBgm("battle_hoenn_champion_g6").setHasDouble("steven_wallace_double").setDoubleTrainerType(TrainerType.WALLACE).setDoubleTitle("champion_double")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.SKARMORY], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.METAGROSS], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.WALLACE]: new TrainerConfig(++t).initForChampion(signatureSpecies["WALLACE"], true).setBattleBgm("battle_hoenn_champion_g5").setMixedBattleBgm("battle_hoenn_champion_g6").setHasDouble("wallace_steven_double").setDoubleTrainerType(TrainerType.STEVEN).setDoubleTitle("champion_double")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.PELIPPER], TrainerSlot.TRAINER, true, p => {
        p.abilityIndex = 1; // Drizzle
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.SWAMPERT], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.CYNTHIA]: new TrainerConfig(++t).initForChampion(signatureSpecies["CYNTHIA"],false).setBattleBgm("battle_sinnoh_champion").setMixedBattleBgm("battle_sinnoh_champion")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.SPIRITOMB], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.GARCHOMP], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.ALDER]: new TrainerConfig(++t).initForChampion(signatureSpecies["ALDER"],true).setHasDouble("alder_iris_double").setDoubleTrainerType(TrainerType.IRIS).setDoubleTitle("champion_double").setBattleBgm("battle_champion_alder").setMixedBattleBgm("battle_champion_alder")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.BOUFFALANT, Species.BRAVIARY], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.IRIS]: new TrainerConfig(++t).initForChampion(signatureSpecies["IRIS"],false).setBattleBgm("battle_champion_iris").setMixedBattleBgm("battle_champion_iris").setHasDouble("iris_alder_double").setDoubleTrainerType(TrainerType.ALDER).setDoubleTitle("champion_double")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.DRUDDIGON], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.LAPRAS], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.DIANTHA]: new TrainerConfig(++t).initForChampion(signatureSpecies["DIANTHA"],false).setMixedBattleBgm("battle_kalos_champion")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.GOURGEIST], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.GARDEVOIR], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 1;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.HAU]: new TrainerConfig(++t).initForChampion(signatureSpecies["HAU"],true).setMixedBattleBgm("battle_alola_champion")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.ALOLA_RAICHU], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.LEON]: new TrainerConfig(++t).initForChampion(signatureSpecies["LEON"],true).setMixedBattleBgm("battle_galar_champion")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.RILLABOOM, Species.CINDERACE, Species.INTELEON], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.CHARIZARD], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 3;
        p.generateAndPopulateMoveset();
        p.generateName();
      })),
  [TrainerType.GEETA]: new TrainerConfig(++t).initForChampion(signatureSpecies["GEETA"],false).setMixedBattleBgm("battle_champion_geeta")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.GLIMMORA], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.NEMONA]: new TrainerConfig(++t).initForChampion(signatureSpecies["NEMONA"],false).setMixedBattleBgm("battle_champion_nemona")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.LYCANROC], TrainerSlot.TRAINER, true, p => {
        p.formIndex = 0; // Midday form
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.KIERAN]: new TrainerConfig(++t).initForChampion(signatureSpecies["KIERAN"],true).setMixedBattleBgm("battle_champion_kieran")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.POLIWRATH, Species.POLITOED], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
      })),

  
  [TrainerType.RIVAL]: new TrainerConfig((t = TrainerType.RIVAL)).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setStaticParty().setEncounterBgm(TrainerType.RIVAL).setBattleBgm("battle_rival").setMixedBattleBgm("battle_rival").setPartyTemplates(trainerPartyTemplates.RIVAL)
      .setModifierRewardFuncs(() => modifierTypes.SUPER_EXP_CHARM, () => modifierTypes.EXP_SHARE)

      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.HORSEA, Species.KECLEON, Species.MIME_JR, Species.RALTS, Species.LITWICK, Species.HONEDGE, Species.IMPIDIMP, Species.TEDDIURSA, Species.PORYGON, Species.DRATINI, Species.TOGEPI, Species.NIDORAN_M, Species.PIKACHU, Species.RIOLU, Species.ELEKID, Species.SCYTHER, Species.MAREEP, Species.BAGON, Species.BELDUM, Species.ARON, Species.LARVITAR, Species.MAGBY, Species.GASTLY, Species.ABRA, Species.MACHOP, Species.MUNCHLAX, Species.BULBASAUR, Species.CHARMANDER, Species.SQUIRTLE, Species.CHIKORITA, Species.CYNDAQUIL, Species.TOTODILE, Species.TREECKO, Species.TORCHIC, Species.MUDKIP, Species.TURTWIG, Species.CHIMCHAR, Species.PIPLUP, Species.SNIVY, Species.TEPIG, Species.OSHAWOTT, Species.CHESPIN, Species.FENNEKIN, Species.FROAKIE, Species.ROWLET, Species.LITTEN, Species.POPPLIO, Species.GROOKEY, Species.SCORBUNNY, Species.SOBBLE, Species.SPRIGATITO, Species.FUECOCO, Species.QUAXLY, Species.GRIMER, Species.TAUROS, Species.GLIGAR, Species.CUBONE, Species.NOIBAT,
        Species.LICKITUNG, Species.GASTLY, Species.PIKACHU, Species.KOFFING, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.REMORAID,
        Species.SLAKOTH, Species.BONSLY ], TrainerSlot.TRAINER, true))

      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFFA, Species.ZUBAT, Species.MANKEY, Species.POLIWAG, Species.GEODUDE, Species.ALOLA_GEODUDE, Species.SLOWPOKE, Species.SHELLDER, Species.ONIX, Species.RHYHORN, Species.KOFFING, Species.MAGIKARP, Species.MARILL, Species.NINCADA, Species.AIPOM, Species.SABLEYE, Species.MAWILE, Species.ELECTRIKE, Species.MEDITITE, Species.CARVANHA, Species.NUMEL, Species.GLIGAR, Species.FEEBAS, Species.HERACROSS, Species.DUSKULL, Species.CRANIDOS, Species.SHIELDON, Species.GOOMY, Species.MASCHIFF, Species.FLITTLE, Species.WISHIWASHI, Species.SALANDIT, Species.MAREANIE, Species.PHANTUMP, Species.TOXEL, Species.PUMPKABOO,  Species.HAPPINY, Species.DRILBUR, Species.TIMBURR, Species.VENIPEDE, Species.TINKATINK, Species.DARUMAKA, Species.TIRTOUGA, Species.GREAVARD, Species.ARCHEN, Species.SNEASEL, Species.KARRABLAST, Species.MIENFOO, Species.STUFFUL,Species.HATENNA,Species.IMPIDIMP, Species.GALAR_ZIGZAGOON, Species.GALAR_CORSOLA, Species.CAPSAKID, Species.SHROODLE, Species.GALAR_YAMASK, Species.DREEPY,Species.NYMBLE, Species.CHEWTLE, Species.TYPE_NULL,Species.JANGMO_O, Species.MIMIKYU, Species.WIMPOD, Species.MUDBRAY, Species.PAWNIARD, Species.TYRUNT, Species.AMAURA, Species.GOLETT, Species.RUFFLET, Species.VULLABY, Species.DEINO, Species.SHELMET, Species.LARVESTA, Species.GOTHITA, Species.SWINUB, Species.MAREEP, Species.PIDGEY, Species.HOOTHOOT, Species.TAILLOW, Species.STARLY, Species.PIDOVE, Species.FLETCHLING, Species.PIKIPEK, Species.ROOKIDEE, Species.WATTREL, Species.HORSEA, Species.KECLEON, Species.MIME_JR, Species.RALTS, Species.LITWICK, Species.HONEDGE, Species.IMPIDIMP, Species.TEDDIURSA, Species.PORYGON, Species.DRATINI, Species.TOGEPI, Species.NIDORAN_M, Species.PIKACHU, Species.RIOLU, Species.ELEKID, Species.SCYTHER, Species.MAREEP, Species.BAGON, Species.BELDUM, Species.ARON, Species.LARVITAR, Species.MAGBY, Species.GASTLY, Species.ABRA, Species.MACHOP, Species.MUNCHLAX, Species.BULBASAUR, Species.CHARMANDER, Species.SQUIRTLE, Species.CHIKORITA, Species.CYNDAQUIL, Species.TOTODILE, Species.TREECKO, Species.TORCHIC, Species.MUDKIP, Species.TURTWIG, Species.CHIMCHAR, Species.PIPLUP, Species.SNIVY, Species.TEPIG, Species.OSHAWOTT, Species.CHESPIN, Species.FENNEKIN, Species.FROAKIE, Species.ROWLET, Species.LITTEN, Species.POPPLIO, Species.GROOKEY, Species.SCORBUNNY, Species.SOBBLE, Species.SPRIGATITO, Species.FUECOCO, Species.QUAXLY, Species.GRIMER, Species.TAUROS, Species.CUBONE, Species.NOIBAT,
        Species.LICKITUNG, Species.GASTLY, Species.PIKACHU, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.REMORAID,
        Species.SLAKOTH, Species.BONSLY ], TrainerSlot.TRAINER, true)),
  
  // .setPartyMemberFunc(1, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450,  TrainerSlot.TRAINER, false)),

  [TrainerType.RIVAL_2]: new TrainerConfig(++t).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setStaticParty().setMoneyMultiplier(1.25).setEncounterBgm(TrainerType.RIVAL).setBattleBgm("battle_rival").setMixedBattleBgm("battle_rival").setPartyTemplates(trainerPartyTemplates.RIVAL_2)
      .setModifierRewardFuncs(() => modifierTypes.EXP_SHARE)

      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.HORSEA, Species.KECLEON, Species.MR_MIME, Species.KIRLIA, Species.LAMPENT, Species.DOUBLADE, Species.MORGREM, Species.TEDDIURSA, Species.PORYGON, Species.DRATINI, Species.TOGETIC, Species.NIDORINO, Species.PIKACHU, Species.RIOLU, Species.ELECTABUZZ, Species.SCYTHER, Species.FLAAFFY, Species.SHELGON, Species.METANG, Species.LAIRON, Species.PUPITAR, Species.MAGMAR, Species.HAUNTER, Species.KADABRA, Species.MACHOKE, Species.MUNCHLAX, Species.IVYSAUR, Species.CHARMELEON, Species.WARTORTLE, Species.BAYLEEF, Species.QUILAVA, Species.CROCONAW, Species.GROVYLE, Species.COMBUSKEN, Species.MARSHTOMP, Species.GROTLE, Species.MONFERNO, Species.PRINPLUP, Species.SERVINE, Species.PIGNITE, Species.DEWOTT, Species.QUILLADIN, Species.BRAIXEN, Species.FROGADIER, Species.DARTRIX, Species.TORRACAT, Species.BRIONNE, Species.THWACKEY, Species.RABOOT, Species.DRIZZILE, Species.FLORAGATO, Species.CROCALOR, Species.QUAXWELL, Species.GRIMER, Species.TAUROS, Species.GLIGAR, Species.CUBONE, Species.NOIBAT,
        Species.LICKITUNG, Species.GASTLY, Species.PIKACHU, Species.KOFFING, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.REMORAID,
        Species.VIGOROTH, Species.SUDOWOODO ], TrainerSlot.TRAINER, true))

      //.setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.PIDGEOTTO, Species.HOOTHOOT, Species.TAILLOW, Species.STARAVIA, Species.TRANQUILL, Species.FLETCHINDER, Species.TRUMBEAK, Species.CORVISQUIRE, Species.WATTREL ], TrainerSlot.TRAINER, true))
      
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFAIRY, Species.GOLBAT, Species.PRIMEAPE, Species.POLIWHIRL, Species.GRAVELER, Species.ALOLA_GRAVELER, Species.SLOWPOKE, Species.SHELLDER, Species.ONIX, Species.RHYDON, Species.KOFFING, Species.MAGIKARP, Species.MARILL, Species.NINCADA, Species.AIPOM, Species.SABLEYE, Species.MAWILE, Species.ELECTRIKE, Species.MEDITITE, Species.CARVANHA, Species.NUMEL, Species.GLIGAR, Species.FEEBAS, Species.HERACROSS, Species.DUSCLOPS, Species.CRANIDOS, Species.SHIELDON, Species.SLIGGOO, Species.MASCHIFF, Species.FLITTLE, Species.WISHIWASHI, Species.SALANDIT, Species.MAREANIE, Species.PHANTUMP, Species.TOXTRICITY, Species.PUMPKABOO, Species.HAPPINY, Species.DRILBUR, Species.GURDURR, Species.WHIRLIPEDE, Species.TINKATUFF, Species.DARUMAKA, Species.TIRTOUGA, Species.GREAVARD, Species.ARCHEN, Species.SNEASEL, Species.KARRABLAST, Species.MIENFOO, Species.STUFFUL, Species.HATTREM, Species.MORGREM, Species.GALAR_LINOONE, Species.GALAR_CORSOLA, Species.CAPSAKID, Species.SHROODLE, Species.GALAR_YAMASK, Species.DRAKLOAK, Species.NYMBLE, Species.CHEWTLE, Species.SILVALLY, Species.HAKAMO_O, Species.MIMIKYU, Species.WIMPOD, Species.MUDBRAY, Species.BISHARP, Species.TYRUNT, Species.AMAURA, Species.GOLETT, Species.RUFFLET, Species.VULLABY, Species.ZWEILOUS, Species.SHELMET, Species.LARVESTA, Species.GOTHORITA, Species.PILOSWINE, Species.FLAAFFY, Species.PIDGEOTTO, Species.HOOTHOOT, Species.TAILLOW, Species.STARAVIA, Species.TRANQUILL, Species.FLETCHINDER, Species.TRUMBEAK, Species.CORVISQUIRE, Species.WATTREL, Species.HORSEA, Species.KECLEON, Species.MR_MIME, Species.KIRLIA, Species.LAMPENT, Species.DOUBLADE, Species.MORGREM, Species.TEDDIURSA, Species.PORYGON, Species.DRATINI, Species.TOGETIC, Species.NIDORINO, Species.PIKACHU, Species.RIOLU, Species.ELECTABUZZ, Species.SCYTHER, Species.FLAAFFY, Species.SHELGON, Species.METANG, Species.LAIRON, Species.PUPITAR, Species.MAGMAR, Species.HAUNTER, Species.KADABRA, Species.MACHOKE, Species.MUNCHLAX, Species.IVYSAUR, Species.CHARMELEON, Species.WARTORTLE, Species.BAYLEEF, Species.QUILAVA, Species.CROCONAW, Species.GROVYLE, Species.COMBUSKEN, Species.MARSHTOMP, Species.GROTLE, Species.MONFERNO, Species.PRINPLUP, Species.SERVINE, Species.PIGNITE, Species.DEWOTT, Species.QUILLADIN, Species.BRAIXEN, Species.FROGADIER, Species.DARTRIX, Species.TORRACAT, Species.BRIONNE, Species.THWACKEY, Species.RABOOT, Species.DRIZZILE, Species.FLORAGATO, Species.CROCALOR, Species.QUAXWELL, Species.MUK, Species.TAUROS, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GENGAR, Species.PIKACHU, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY,
        Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true))

      .setPartyMemberFunc(2, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450)),
  [TrainerType.RIVAL_3]: new TrainerConfig(++t).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setStaticParty().setMoneyMultiplier(1.5).setEncounterBgm(TrainerType.RIVAL).setBattleBgm("battle_rival").setMixedBattleBgm("battle_rival").setPartyTemplates(trainerPartyTemplates.RIVAL_3)

      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.SEADRA, Species.KECLEON, Species.MR_MIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSARING, Species.PORYGON2, Species.DRAGONAIR, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.GLISCOR, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GASTLY, Species.PIKACHU, Species.WEEZING, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY,
        Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true))

      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFABLE, Species.CROBAT, Species.ANNIHILAPE, Species.POLIWRATH, Species.GOLEM, Species.ALOLA_GOLEM, Species.SLOWBRO, Species.CLOYSTER, Species.STEELIX, Species.RHYPERIOR, Species.WEEZING, Species.GYARADOS, Species.AZUMARILL, Species.NINJASK, Species.AMBIPOM, Species.SABLEYE, Species.MAWILE, Species.MANECTRIC, Species.MEDICHAM, Species.SHARPEDO, Species.CAMERUPT, Species.GLISCOR, Species.MILOTIC, Species.HERACROSS, Species.DUSKNOIR, Species.RAMPARDOS, Species.BASTIODON, Species.GOODRA, Species.MASCHIFF, Species.ESPATHRA, Species.WISHIWASHI, Species.SALAZZLE, Species.TOXAPEX, Species.TREVENANT, Species.TOXTRICITY, Species.GOURGEIST, Species.BLISSEY, Species.EXCADRILL, Species.CONKELDURR, Species.SCOLIPEDE, Species.TINKATON, Species.DARMANITAN, Species.CARRACOSTA, Species.HOUNDSTONE, Species.ARCHEOPS, Species.WEAVILE, Species.ESCAVALIER, Species.MIENSHAO, Species.BEWEAR, Species.HATTERENE, Species.GRIMMSNARL, Species.OBSTAGOON, Species.CURSOLA, Species.SCOVILLAIN, Species.GRAFAIAI, Species.RUNERIGUS, Species.DRAGAPULT, Species.NYMBLE, Species.DREDNAW, Species.SILVALLY, Species.KOMMO_O, Species.MIMIKYU, Species.GOLISOPOD, Species.MUDSDALE, Species.KINGAMBIT, Species.TYRANTRUM, Species.AURORUS, Species.GOLURK, Species.BRAVIARY, Species.MANDIBUZZ, Species.HYDREIGON, Species.ACCELGOR, Species.VOLCARONA, Species.GOTHITELLE, Species.MAMOSWINE, Species.AMPHAROS, Species.PIDGEOT, Species.NOCTOWL, Species.SWELLOW, Species.STARAPTOR, Species.UNFEZANT, Species.TALONFLAME, Species.TOUCANNON, Species.CORVIKNIGHT, Species.KILOWATTREL, Species.SEADRA, Species.KECLEON, Species.MR_MIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSARING, Species.PORYGON2, Species.DRAGONAIR, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.MAROWAK, Species.NOIVERN,
        Species.LICKILICKY, Species.GENGAR, Species.PIKACHU, Species.HITMONCHAN,
        Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE,
        Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY,
        Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true))

      
      // .setPartyMemberFunc(1, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450,  TrainerSlot.TRAINER, false))

      .setPartyMemberFunc(2, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450))
      .setSpeciesFilter(species => species.baseTotal >= 540),
  [TrainerType.RIVAL_4]: new TrainerConfig(++t).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setBoss().setStaticParty().setMoneyMultiplier(1.75).setEncounterBgm(TrainerType.RIVAL).setBattleBgm("battle_rival_2").setMixedBattleBgm("battle_rival_2").setPartyTemplates(trainerPartyTemplates.RIVAL_4)

      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.GLISCOR, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GASTLY, Species.PIKACHU, Species.WEEZING, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true,
          p => p.setBoss(true, 2)))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFABLE, Species.CROBAT, Species.ANNIHILAPE, Species.POLIWRATH, Species.GOLEM, Species.ALOLA_GOLEM, Species.SLOWBRO, Species.CLOYSTER, Species.STEELIX, Species.RHYPERIOR, Species.WEEZING, Species.GYARADOS, Species.AZUMARILL, Species.NINJASK, Species.AMBIPOM, Species.SABLEYE, Species.MAWILE, Species.MANECTRIC, Species.MEDICHAM, Species.SHARPEDO, Species.CAMERUPT, Species.GLISCOR, Species.MILOTIC, Species.HERACROSS, Species.DUSKNOIR, Species.RAMPARDOS, Species.BASTIODON, Species.GOODRA, Species.MASCHIFF, Species.ESPATHRA, Species.WISHIWASHI, Species.SALAZZLE, Species.TOXAPEX, Species.TREVENANT, Species.TOXTRICITY, Species.GOURGEIST, Species.BLISSEY, Species.EXCADRILL, Species.CONKELDURR, Species.SCOLIPEDE, Species.TINKATON, Species.DARMANITAN, Species.CARRACOSTA, Species.HOUNDSTONE, Species.ARCHEOPS, Species.WEAVILE, Species.ESCAVALIER, Species.MIENSHAO, Species.BEWEAR, Species.HATTERENE, Species.GRIMMSNARL, Species.OBSTAGOON, Species.CURSOLA, Species.SCOVILLAIN, Species.GRAFAIAI, Species.RUNERIGUS, Species.DRAGAPULT, Species.NYMBLE, Species.DREDNAW, Species.SILVALLY, Species.KOMMO_O, Species.MIMIKYU, Species.GOLISOPOD, Species.MUDSDALE, Species.KINGAMBIT, Species.TYRANTRUM, Species.AURORUS, Species.GOLURK, Species.BRAVIARY, Species.MANDIBUZZ, Species.HYDREIGON, Species.ACCELGOR, Species.VOLCARONA, Species.GOTHITELLE, Species.MAMOSWINE, Species.AMPHAROS, Species.PIDGEOT, Species.NOCTOWL, Species.SWELLOW, Species.STARAPTOR, Species.UNFEZANT, Species.TALONFLAME, Species.TOUCANNON, Species.CORVIKNIGHT, Species.KILOWATTREL, Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GENGAR, Species.PIKACHU, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true))
      
      // .setPartyMemberFunc(1, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450,  TrainerSlot.TRAINER, false))

      .setPartyMemberFunc(2, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450))
      .setSpeciesFilter(species => species.baseTotal >= 540)
      .setGenModifiersFunc(party => {
        const starter = party[0];
        return [modifierTypes.TERA_SHARD().generateType([], [starter.species.type1])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(starter) as PersistentModifier]; // TODO: is the bang correct?
      }),
  [TrainerType.RIVAL_5]: new TrainerConfig(++t).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setBoss().setStaticParty().setMoneyMultiplier(2.25).setEncounterBgm(TrainerType.RIVAL).setBattleBgm("battle_rival_3").setMixedBattleBgm("battle_rival_3").setPartyTemplates(trainerPartyTemplates.RIVAL_5)

      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING,Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.GLISCOR, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GASTLY, Species.PIKACHU, Species.WEEZING, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true,
          p => {
            p.setBoss(true, 2);
            if (p.species.forms.length > 1) {
              p.formIndex = Utils.randSeedInt(p.species.forms.length, 1);
            }
          }
      ))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFABLE, Species.CROBAT, Species.ANNIHILAPE, Species.POLIWRATH, Species.GOLEM, Species.ALOLA_GOLEM, Species.SLOWBRO, Species.CLOYSTER, Species.STEELIX, Species.RHYPERIOR, Species.WEEZING, Species.GYARADOS, Species.AZUMARILL, Species.NINJASK, Species.AMBIPOM, Species.SABLEYE, Species.MAWILE, Species.MANECTRIC, Species.MEDICHAM, Species.SHARPEDO, Species.CAMERUPT, Species.GLISCOR, Species.MILOTIC, Species.HERACROSS, Species.DUSKNOIR, Species.RAMPARDOS, Species.BASTIODON, Species.GOODRA, Species.MASCHIFF, Species.ESPATHRA, Species.WISHIWASHI, Species.SALAZZLE, Species.TOXAPEX, Species.TREVENANT, Species.TOXTRICITY, Species.GOURGEIST, Species.BLISSEY, Species.EXCADRILL, Species.CONKELDURR, Species.SCOLIPEDE, Species.TINKATON, Species.DARMANITAN, Species.CARRACOSTA, Species.HOUNDSTONE, Species.ARCHEOPS, Species.WEAVILE, Species.ESCAVALIER, Species.MIENSHAO, Species.BEWEAR, Species.HATTERENE, Species.GRIMMSNARL, Species.OBSTAGOON, Species.CURSOLA, Species.SCOVILLAIN, Species.GRAFAIAI, Species.RUNERIGUS, Species.DRAGAPULT, Species.NYMBLE, Species.DREDNAW, Species.SILVALLY, Species.KOMMO_O, Species.MIMIKYU, Species.GOLISOPOD, Species.MUDSDALE, Species.KINGAMBIT, Species.TYRANTRUM, Species.AURORUS, Species.GOLURK, Species.BRAVIARY, Species.MANDIBUZZ, Species.HYDREIGON, Species.ACCELGOR, Species.VOLCARONA, Species.GOTHITELLE, Species.MAMOSWINE, Species.AMPHAROS, Species.PIDGEOT, Species.NOCTOWL, Species.SWELLOW, Species.STARAPTOR, Species.UNFEZANT, Species.TALONFLAME, Species.TOUCANNON, Species.CORVIKNIGHT, Species.KILOWATTREL, Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GENGAR, Species.PIKACHU, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true,
          p => {
            // p.setBoss(true, 2);
            if (p.species.forms.length > 1) {
              p.formIndex = Utils.randSeedInt(p.species.forms.length, 1);
            }
          }))
      
      // .setPartyMemberFunc(1, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450,  TrainerSlot.TRAINER, false))
      .setPartyMemberFunc(2, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450))
      .setSpeciesFilter(species => species.baseTotal >= 540)
      
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.RAYQUAZA, Species.MEWTWO, Species.GROUDON, Species.BUZZWOLE, Species.GUZZLORD, Species.URSHIFU, Species.THUNDURUS, Species.PALKIA, Species.ENTEI, Species.LUGIA, Species.REGICE, Species.CELEBI, Species.HEATRAN  ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 3);
        p.pokeball = PokeballType.MASTER_BALL;
        p.shiny = true;
        p.variant = 1;
      }))
      .setGenModifiersFunc(party => {
        const starter = party[0];
        return [modifierTypes.TERA_SHARD().generateType([], [starter.species.type1])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(starter) as PersistentModifier]; //TODO: is the bang correct?
      }),
  [TrainerType.RIVAL_6]: new TrainerConfig(++t).setName("Finn").setHasGenders("Ivy").setHasCharSprite().setTitle("Rival").setBoss().setStaticParty().setMoneyMultiplier(3).setEncounterBgm("final").setBattleBgm("battle_rival_3").setMixedBattleBgm("battle_rival_3").setPartyTemplates(trainerPartyTemplates.RIVAL_6)
      
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.GLISCOR, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GASTLY, Species.PIKACHU, Species.WEEZING, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO
          ], TrainerSlot.TRAINER, true,
          p => {
            p.setBoss(true, 2);
            p.generateAndPopulateMoveset();
            if (p.species.forms.length > 1) {
              p.formIndex = Utils.randSeedInt(p.species.forms.length, 1);
            }
          }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CLEFABLE, Species.CROBAT, Species.ANNIHILAPE, Species.POLIWRATH, Species.GOLEM, Species.ALOLA_GOLEM, Species.SLOWBRO, Species.CLOYSTER, Species.STEELIX, Species.RHYPERIOR, Species.WEEZING, Species.GYARADOS, Species.AZUMARILL, Species.NINJASK, Species.AMBIPOM, Species.SABLEYE, Species.MAWILE, Species.MANECTRIC, Species.MEDICHAM, Species.SHARPEDO, Species.CAMERUPT, Species.GLISCOR, Species.MILOTIC, Species.HERACROSS, Species.DUSKNOIR, Species.RAMPARDOS, Species.BASTIODON, Species.GOODRA, Species.MASCHIFF, Species.ESPATHRA, Species.WISHIWASHI, Species.SALAZZLE, Species.TOXAPEX, Species.TREVENANT, Species.TOXTRICITY, Species.GOURGEIST, Species.BLISSEY, Species.EXCADRILL, Species.CONKELDURR, Species.SCOLIPEDE, Species.TINKATON, Species.DARMANITAN, Species.CARRACOSTA, Species.HOUNDSTONE, Species.ARCHEOPS, Species.WEAVILE, Species.ESCAVALIER, Species.MIENSHAO, Species.BEWEAR, Species.HATTERENE, Species.GRIMMSNARL, Species.OBSTAGOON, Species.CURSOLA, Species.SCOVILLAIN, Species.GRAFAIAI, Species.RUNERIGUS, Species.DRAGAPULT, Species.NYMBLE, Species.DREDNAW, Species.SILVALLY, Species.KOMMO_O, Species.MIMIKYU, Species.GOLISOPOD, Species.MUDSDALE, Species.KINGAMBIT, Species.TYRANTRUM, Species.AURORUS, Species.GOLURK, Species.BRAVIARY, Species.MANDIBUZZ, Species.HYDREIGON, Species.ACCELGOR, Species.VOLCARONA, Species.GOTHITELLE, Species.MAMOSWINE, Species.AMPHAROS, Species.PIDGEOT, Species.NOCTOWL, Species.SWELLOW, Species.STARAPTOR, Species.UNFEZANT, Species.TALONFLAME, Species.TOUCANNON, Species.CORVIKNIGHT, Species.KILOWATTREL, Species.KINGDRA, Species.KECLEON, Species.MR_RIME, Species.GALLADE, Species.CHANDELURE, Species.AEGISLASH, Species.GRIMMSNARL, Species.URSALUNA, Species.PORYGON_Z, Species.DRAGONITE, Species.TOGEKISS, Species.NIDOKING, Species.RAICHU, Species.LUCARIO, Species.ELECTIVIRE, Species.SCIZOR, Species.AMPHAROS, Species.SALAMENCE, Species.METAGROSS, Species.AGGRON, Species.TYRANITAR, Species.MAGMORTAR, Species.GENGAR, Species.ALAKAZAM, Species.MACHAMP, Species.SNORLAX, Species.VENUSAUR, Species.CHARIZARD, Species.BLASTOISE, Species.MEGANIUM, Species.HISUI_TYPHLOSION, Species.FERALIGATR, Species.SCEPTILE, Species.BLAZIKEN, Species.SWAMPERT, Species.TORTERRA, Species.INFERNAPE, Species.EMPOLEON, Species.SERPERIOR, Species.EMBOAR, Species.HISUI_SAMUROTT, Species.CHESNAUGHT, Species.DELPHOX, Species.GRENINJA, Species.HISUI_DECIDUEYE, Species.INCINEROAR, Species.PRIMARINA, Species.RILLABOOM, Species.CINDERACE, Species.INTELEON, Species.MEOWSCARADA, Species.SKELEDIRGE, Species.QUAQUAVAL, Species.MUK, Species.TAUROS, Species.MAROWAK, Species.NOIVERN, Species.LICKILICKY, Species.GENGAR, Species.PIKACHU, Species.HITMONCHAN, Species.HITMONLEE, Species.KANGASKHAN, Species.LAPRAS, Species.EEVEE, Species.AMBIPOM, Species.UNOWN, Species.MILTANK, Species.SOLROCK, Species.ROTOM, Species.OCTILLERY, Species.SLAKING, Species.SUDOWOODO ], TrainerSlot.TRAINER, true,
          p => {
            p.setBoss(true, 2);
            p.generateAndPopulateMoveset();
            if (p.species.forms.length > 1) {
              p.formIndex = Utils.randSeedInt(p.species.forms.length, 1);
            }
          }))
      .setPartyMemberFunc(2, getSpeciesFilterRandomPartyMemberFunc((species: PokemonSpecies) => !pokemonEvolutions.hasOwnProperty(species.speciesId) && !pokemonPrevolutions.hasOwnProperty(species.speciesId) && species.baseTotal >= 450))
      .setSpeciesFilter(species => species.baseTotal >= 540)
      
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.RAYQUAZA, Species.MEWTWO, Species.GROUDON, Species.BUZZWOLE, Species.GUZZLORD, Species.URSHIFU, Species.THUNDURUS, Species.PALKIA, Species.ENTEI, Species.LUGIA, Species.REGICE, Species.CELEBI, Species.HEATRAN ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
        p.shiny = true;
        p.variant = 1;
        if (p.species.forms.length > 1) {
          p.formIndex = Utils.randSeedInt(p.species.forms.length, 1);
        }
        p.generateName();
      }))
      .setGenModifiersFunc(party => {
        const starter = party[0];
        return [modifierTypes.TERA_SHARD().generateType([], [starter.species.type1])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(starter) as PersistentModifier]; // TODO: is the bang correct?
      }),

  [TrainerType.ROCKET_BOSS_GIOVANNI_1]: new TrainerConfig(t = TrainerType.ROCKET_BOSS_GIOVANNI_1).setName("Giovanni").initForEvilTeamLeader("Rocket Boss", []).setMixedBattleBgm("battle_rocket_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.PERSIAN , Species.ALOLA_PERSIAN]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.NIDOKING , Species.NIDOQUEEN ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.RHYPERIOR ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.DUGTRIO, Species.ALOLA_DUGTRIO ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.MAROWAK , Species.ALOLA_MAROWAK]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.KANGASKHAN ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      })),
  [TrainerType.ROCKET_BOSS_GIOVANNI_2]: new TrainerConfig(++t).setName("Giovanni").initForEvilTeamLeader("Rocket Boss", [], true).setMixedBattleBgm("battle_rocket_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.TYRANITAR , Species.IRON_THORNS], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.HIPPOWDON]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([Species.EXCADRILL]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.KANGASKHAN ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.GASTRODON]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.MEWTWO ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.MAXIE]: new TrainerConfig(++t).setName("Maxie").initForEvilTeamLeader("Magma Boss", []).setMixedBattleBgm("battle_aqua_magma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.MIGHTYENA ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CROBAT, Species.GLISCOR ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.WEEZING, Species.GALAR_WEEZING ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.MAGMORTAR, Species.TORKOAL ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.FLYGON]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.CAMERUPT ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      })),
  [TrainerType.MAXIE_2]: new TrainerConfig(++t).setName("Maxie").initForEvilTeamLeader("Magma Boss", [], true).setMixedBattleBgm("battle_aqua_magma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.SOLROCK, Species.TYPHLOSION], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.TORKOAL, Species.NINETALES], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 2; // DROUGHT
      }))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SHIFTRY, Species.SCOVILLAIN ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 0; // Chlorophyll
      }))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([Species.GREAT_TUSK]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([Species.CAMERUPT], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([Species.GROUDON], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.ARCHIE]: new TrainerConfig(++t).setName("Archie").initForEvilTeamLeader("Aqua Boss", []).setMixedBattleBgm("battle_aqua_magma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.LINOONE ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.CROBAT, Species.PELIPPER ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.MUK, Species.ALOLA_MUK ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.TENTACRUEL ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.RELICANTH, Species.WAILORD ]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.SHARPEDO ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      })),
  [TrainerType.ARCHIE_2]: new TrainerConfig(++t).setName("Archie").initForEvilTeamLeader("Aqua Boss", [], true).setMixedBattleBgm("battle_aqua_magma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.EMPOLEON, Species.LUDICOLO], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.POLITOED, Species.PELIPPER], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 2; // Drizzle
      }))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([Species.BEARTIC, Species.ARMALDO], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 2; // Swift Swim
      }))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.OVERQWIL ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 1; // Swift Swim
      }))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([Species.SHARPEDO], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([Species.KYOGRE], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.CYRUS]: new TrainerConfig(++t).setName("Cyrus").initForEvilTeamLeader("Galactic Boss", []).setMixedBattleBgm("battle_galactic_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.GYARADOS ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.HONCHKROW, Species.HISUI_BRAVIARY ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.CROBAT, Species.GLISCOR ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.AZELF, Species.UXIE, Species.MESPRIT ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.HOUNDOOM ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.WEAVILE ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      })),
  [TrainerType.CYRUS_2]: new TrainerConfig(++t).setName("Cyrus").initForEvilTeamLeader("Galactic Boss", [], true).setMixedBattleBgm("battle_galactic_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.AZELF, Species.UXIE, Species.MESPRIT ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.ELECTRODE, Species.HISUI_ELECTRODE ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SALAMENCE, Species.ROARING_MOON ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([Species.HOUNDOOM], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([Species.WEAVILE], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([Species.DARKRAI], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.GHETSIS]: new TrainerConfig(++t).setName("Ghetsis").initForEvilTeamLeader("Plasma Boss", []).setMixedBattleBgm("battle_plasma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.COFAGRIGUS, Species.RUNERIGUS ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.BOUFFALANT ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SEISMITOAD, Species.CARRACOSTA ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.EELEKTROSS, Species.GALVANTULA ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.VOLCARONA ]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.HYDREIGON ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      })),
  [TrainerType.GHETSIS_2]: new TrainerConfig(++t).setName("Ghetsis").initForEvilTeamLeader("Plasma Boss", [], true).setMixedBattleBgm("battle_plasma_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.GENESECT ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
        p.formIndex = Utils.randSeedInt(5);
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.BASCULEGION, Species.JELLICENT ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.gender = Gender.MALE;
        p.formIndex = 1;
      }))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.KINGAMBIT ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.VOLCARONA, Species.SLITHER_WING ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.HYDREIGON, Species.IRON_JUGULIS ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([Species.KYUREM], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.LYSANDRE]: new TrainerConfig(++t).setName("Lysandre").initForEvilTeamLeader("Flare Boss", []).setMixedBattleBgm("battle_flare_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.MIENSHAO ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.HONCHKROW, Species.TALONFLAME ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.PYROAR ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.gender = Gender.MALE;
      }))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.CLAWITZER, Species.DRAGALGE ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.HELIOLISK, Species.MALAMAR ]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.GYARADOS ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      })),
  [TrainerType.LYSANDRE_2]: new TrainerConfig(++t).setName("Lysandre").initForEvilTeamLeader("Flare Boss", [], true).setMixedBattleBgm("battle_flare_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.SCREAM_TAIL, Species.FLUTTER_MANE ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.PYROAR ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.gender = Gender.MALE;
      }))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.IRON_MOTH ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.GOODRA, Species.HISUI_GOODRA ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.GYARADOS ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.ULTRA_BALL;
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([Species.YVELTAL], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.LUSAMINE]: new TrainerConfig(++t).setName("Lusamine").initForEvilTeamLeader("Aether Boss", []).setMixedBattleBgm("battle_aether_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.CLEFABLE ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.LILLIGANT, Species.HISUI_LILLIGANT ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.MILOTIC, Species.PRIMARINA ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.GALAR_SLOWBRO, Species.GALAR_SLOWKING ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.BEWEAR ]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.NIHILEGO ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.LUSAMINE_2]: new TrainerConfig(++t).setName("Lusamine").initForEvilTeamLeader("Aether Boss", [], true).setMixedBattleBgm("battle_aether_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.CLEFABLE ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.MILOTIC, Species.PRIMARINA ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.PHEROMOSA ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      }))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.STAKATAKA, Species.CELESTEELA, Species.GUZZLORD ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      }))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.NIHILEGO ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.NECROZMA ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.GUZMA]: new TrainerConfig(++t).setName("Guzma").initForEvilTeamLeader("Skull Boss", []).setMixedBattleBgm("battle_skull_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.LOKIX, Species.YANMEGA ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.HERACROSS ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SCIZOR, Species.KLEAVOR ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.GALVANTULA, Species.VIKAVOLT]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.PINSIR ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.GOLISOPOD ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
      })),
  [TrainerType.GUZMA_2]: new TrainerConfig(++t).setName("Guzma").initForEvilTeamLeader("Skull Boss", [], true).setMixedBattleBgm("battle_skull_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.GOLISOPOD ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.abilityIndex = 2; //Anticipation
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.HISUI_SAMUROTT, Species.CRAWDAUNT ], TrainerSlot.TRAINER, true, p => {
        p.abilityIndex = 2; //Sharpness, Adaptability
      }))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SCIZOR, Species.KLEAVOR ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.PINSIR ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.formIndex = 1;
        p.generateName();
      }))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.BUZZWOLE ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.XURKITREE ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      })),
  [TrainerType.ROSE]: new TrainerConfig(++t).setName("Rose").initForEvilTeamLeader("Macro Boss", []).setMixedBattleBgm("battle_macro_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.ARCHALUDON ]))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.FERROTHORN, Species.ESCAVALIER ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.SIRFETCHD, Species.MR_RIME ]))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.CORVIKNIGHT ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.PERRSERKER, Species.KLINKLANG ]))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.COPPERAJAH ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.formIndex = 1;
        p.generateName();
      })),
  [TrainerType.ROSE_2]: new TrainerConfig(++t).setName("Rose").initForEvilTeamLeader("Macro Boss", [], true).setMixedBattleBgm("battle_macro_boss").setVictoryBgm("victory_team_plasma")
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([ Species.ARCHALUDON ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
      }))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([ Species.AEGISLASH, Species.GHOLDENGO ]))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc([ Species.DRACOVISH, Species.DRACOZOLT ], TrainerSlot.TRAINER, true, p => {
        p.generateAndPopulateMoveset();
        p.abilityIndex = 1; //Strong Jaw, Hustle
      }))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc([ Species.MELMETAL ]))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc([ Species.GALAR_ARTICUNO, Species.GALAR_ZAPDOS, Species.GALAR_MOLTRES ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.pokeball = PokeballType.MASTER_BALL;
      }))
      .setPartyMemberFunc(5, getRandomPartyMemberFunc([ Species.COPPERAJAH ], TrainerSlot.TRAINER, true, p => {
        p.setBoss(true, 2);
        p.generateAndPopulateMoveset();
        p.formIndex = 1;
        p.generateName();
      })),

  [TrainerType.DYNAMIC_RIVAL]: new TrainerConfig(TrainerType.DYNAMIC_RIVAL)
      .setName("Dynamic Rival")
      .setTitle("Rival")
      .setHasCharSprite()
      .setBattleBgm("battle_rival")
      .setMixedBattleBgm("battle_rival")
      .setGenModifiersFunc(party => {
        const starter = party[0];
        return [modifierTypes.TERA_SHARD().generateType([], [starter.species.type1])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(starter) as PersistentModifier];
      }),
  [TrainerType.SMITTY]: (() => {
    const config = new TrainerConfig(TrainerType.SMITTY);
    config.setName("Smitty")
        .setTitle("The Creator")
        .setHasCharSprite()
        .setBattleBgm("battle_rival")
        .setMixedBattleBgm("battle_rival");
    config.smittyVariantIndex = 0;
    return config;
  })()
};

function evolvePokemon(pokemon: EnemyPokemon, waveIndex: number): void {
  const newSpecies = pokemon.species.getSpeciesForLevel(
      pokemon.level,
      true,
      true,
      PartyMemberStrength.AVERAGE,
      waveIndex,
      pokemon.scene.gameMode?.isNightmare
  );
  pokemon.species = getPokemonSpecies(newSpecies);
}

export type RivalTrainerType =
    | TrainerType.BLUE
    | TrainerType.LANCE
    | TrainerType.CYNTHIA
    | TrainerType.GIOVANNI
    | TrainerType.RED
    | TrainerType.BROCK
    | TrainerType.STEVEN
    | TrainerType.CYRUS
    | TrainerType.LT_SURGE
    | TrainerType.HAU
    | TrainerType.LARRY
    | TrainerType.WALLACE
    | TrainerType.ALDER
    | TrainerType.MISTY
    | TrainerType.BLAINE
    | TrainerType.ARCHIE
    | TrainerType.MAXIE
    | TrainerType.GHETSIS
    | TrainerType.LYSANDRE
    | TrainerType.ROSE
    | TrainerType.GUZMA
    | TrainerType.LUSAMINE
    | TrainerType.NEMONA
    | TrainerType.NORMAN
    | TrainerType.ALLISTER
    | TrainerType.IRIS
    | TrainerType.ROXIE
    | TrainerType.SABRINA


export interface RivalStage {
  trainer: RivalTrainerType;
  stage: number;
}

export const trainerPokemonPools: Record<RivalTrainerType, Species[][]> = {
    [TrainerType.BLUE]: [
      [Species.SQUIRTLE],
      [Species.EXEGGCUTE, Species.GROWLITHE, Species.ABRA, Species.MACHOP, Species.TENTACOOL, Species.PONYTA, Species.SLOWPOKE, Species.MAGNEMITE, Species.SEEL, Species.GRIMER, Species.SHELLDER, Species.DROWZEE, Species.VAPOREON, Species.JOLTEON, Species.FLAREON],
      [Species.RHYHORN, Species.TANGELA, Species.HORSEA, Species.SCYTHER, Species.PINSIR, Species.TAUROS, Species.MAGIKARP, Species.LAPRAS, Species.PORYGON, Species.VAPOREON, Species.JOLTEON, Species.FLAREON],
      [Species.AERODACTYL, Species.SNORLAX, Species.DRATINI, Species.LICKITUNG, Species.KANGASKHAN, Species.DITTO, Species.OMANYTE, Species.KABUTO, Species.VAPOREON, Species.JOLTEON, Species.FLAREON],
      [Species.NIDORAN_M, Species.PIDGEY, Species.POLIWAG, Species.ABRA, Species.GEODUDE, Species.GASTLY, Species.ONIX, Species.KRABBY],
      [Species.VAPOREON, Species.JOLTEON, Species.FLAREON],
      [Species.NIDORAN_M, Species.PIDGEY, Species.GROWLITHE, Species.POLIWAG, Species.ABRA, Species.RHYHORN, Species.VAPOREON, Species.JOLTEON, Species.FLAREON,],
      [Species.ARTICUNO, Species.ZAPDOS, Species.MOLTRES, Species.MEW, Species.MEWTWO],
    ],
    [TrainerType.LANCE]: [
        [Species.DRATINI],
        [Species.BAGON, Species.GIBLE, Species.AXEW, Species.GOOMY, Species.JANGMO_O, Species.TRAPINCH, Species.SWABLU, Species.NOIBAT, Species.PIDGEY, Species.SPEAROW, Species.ZUBAT],
        [Species.LARVITAR, Species.BELDUM, Species.DEINO, Species.DREEPY, Species.DRUDDIGON, Species.SKARMORY, Species.AERODACTYL, Species.MAGIKARP, Species.HORSEA, Species.SWABLU, Species.BAGON, Species.TRAPINCH],
        [Species.CHARMANDER, Species.HORSEA, Species.MAGIKARP, Species.EXEGGCUTE, Species.RHYHORN, Species.MAGBY, Species.PINSIR, Species.LAPRAS, Species.SNORLAX, Species.SCYTHER, Species.TAUROS, Species.DITTO],
        [Species.BAGON, Species.GIBLE, Species.DEINO, Species.GOOMY, Species.JANGMO_O, Species.TRAPINCH, Species.SWABLU, Species.NOIBAT, Species.AXEW, Species.DREEPY, Species.DRUDDIGON],
        [Species.HORSEA, Species.BAGON, Species.GIBLE, Species.DEINO, Species.GOOMY],
        [Species.GROWLITHE, Species.SEEL, Species.PICHU, Species.LARVITAR, Species.BELDUM, Species.GIBLE],
        [Species.RAYQUAZA, Species.LATIAS, Species.LATIOS, Species.DIALGA, Species.PALKIA, Species.GIRATINA, Species.RESHIRAM, Species.ZEKROM, Species.KYUREM, Species.YVELTAL, Species.LUGIA, Species.HO_OH],


    ],
    [TrainerType.CYNTHIA]: [
        [Species.GIBLE],
        [Species.TURTWIG, Species.CHIMCHAR, Species.PIPLUP, Species.STARLY, Species.SHINX, Species.BIDOOF, Species.KRICKETOT, Species.BUDEW, Species.CHERUBI, Species.BUNEARY, Species.GLAMEOW, Species.CHATOT],
        [Species.CRANIDOS, Species.SHIELDON, Species.BURMY, Species.COMBEE, Species.PACHIRISU, Species.BUIZEL, Species.SHELLOS, Species.DRIFLOON, Species.BRONZOR, Species.RIOLU, Species.HIPPOPOTAS],
        [Species.SPIRITOMB, Species.RIOLU, Species.TOGEPI, Species.FEEBAS, Species.BUDEW, Species.SHELLOS, Species.ROTOM, Species.SNOVER, Species.SNEASEL, Species.MAGNEMITE, Species.PORYGON],
        [Species.UNOWN, Species.SPIRITOMB, Species.ROTOM, Species.DRIFLOON, Species.CHINGLING, Species.BRONZOR],
        [Species.JOLTEON, Species.TOGEPI, Species.BONSLY, Species.MIME_JR, Species.HAPPINY],
        [Species.RELICANTH, Species.SPIRITOMB, Species.BRONZOR, Species.BONSLY, Species.CRANIDOS, Species.SHIELDON],
      [Species.UXIE, Species.MESPRIT, Species.AZELF, Species.DIALGA, Species.PALKIA, Species.HEATRAN, Species.REGIGIGAS, Species.GIRATINA, Species.CRESSELIA, Species.PHIONE, Species.MANAPHY, Species.SHAYMIN],
    ],
    [TrainerType.GIOVANNI]: [
        [Species.RHYHORN],
        [Species.SANDSHREW, Species.DIGLETT, Species.GEODUDE, Species.ONIX, Species.CUBONE, Species.WOOPER, Species.GLIGAR, Species.PHANPY, Species.LARVITAR, Species.NINCADA, Species.TRAPINCH],
        [Species.EKANS, Species.ZUBAT, Species.KOFFING, Species.GRIMER, Species.BELLSPROUT, Species.TENTACOOL, Species.GASTLY, Species.VOLTORB, Species.LICKITUNG, Species.TANGELA, Species.HORSEA, Species.MAGIKARP],
        [Species.SANDILE, Species.GOLETT, Species.VULLABY, Species.PAWNIARD, Species.DEINO, Species.INKAY, Species.SALANDIT, Species.MUDBRAY, Species.SANDYGAST, Species.MIMIKYU, Species.JANGMO_O, Species.STUNKY],
        [Species.MEOWTH, Species.WOBBUFFET, Species.BELLSPROUT, Species.KOFFING, Species.EKANS, Species.LICKITUNG],
        [Species.NIDORAN_M, Species.NIDORAN_F, Species.KANGASKHAN, Species.ONIX, Species.DIGLETT],
        [Species.MEOWTH, Species.MURKROW, Species.NIDORAN_M, Species.NIDORAN_F, Species.KANGASKHAN],
        [Species.MEWTWO, Species.LUGIA, Species.GROUDON, Species.KYOGRE, Species.RAYQUAZA, Species.DEOXYS,
          Species.GIRATINA, Species.DARKRAI, Species.YVELTAL, Species.NECROZMA, Species.ETERNATUS],
    ],
    [TrainerType.RED]: [
        [Species.PIKACHU],
        [Species.BULBASAUR, Species.CHARMANDER, Species.SQUIRTLE, Species.NIDORAN_M, Species.NIDORAN_F, Species.CLEFFA, Species.PINSIR, Species.CATERPIE],
        [Species.VULPIX, Species.DIGLETT, Species.MANKEY, Species.CHARMANDER, Species.BULBASAUR, Species.SQUIRTLE, Species.ABRA, Species.MACHOP, Species.GASTLY],
        [Species.TENTACOOL, Species.SLOWPOKE, Species.MAGNEMITE, Species.GRIMER, Species.SHELLDER, Species.SNORLAX, Species.ONIX, Species.KRABBY, Species.KANGASKHAN],
        [Species.HITMONLEE, Species.HITMONCHAN, Species.LICKITUNG, Species.CHANSEY, Species.TANGELA, Species.KANGASKHAN, Species.HORSEA, Species.SCYTHER],
        [Species.MAGIKARP, Species.DRATINI, Species.AERODACTYL, Species.SNORLAX, Species.GEODUDE, Species.LAPRAS],
        [Species.SNORLAX, Species.LAPRAS, Species.BULBASAUR, Species.CHARMANDER, Species.SQUIRTLE, Species.TAUROS],
        [Species.DRATINI, Species.MAGIKARP, Species.PORYGON, Species.OMANYTE, Species.KABUTO],
        [Species.MEWTWO, Species.MEW, Species.ARTICUNO, Species.ZAPDOS, Species.MOLTRES, Species.LUGIA, Species.HO_OH, Species.CELEBI, Species.DEOXYS, Species.ARCEUS, Species.VICTINI, Species.MELTAN],
    ],
    [TrainerType.BROCK]: [
        [Species.ONIX],
        [Species.GEODUDE, Species.RHYHORN, Species.ARON, Species.LARVITAR, Species.BONSLY, Species.ROGGENROLA, Species.DWEBBLE, Species.ROCKRUFF, Species.ROLYCOLY, Species.STONJOURNER, Species.NOSEPASS, Species.LILEEP],
        [Species.OMANYTE, Species.KABUTO, Species.ANORITH, Species.LILEEP, Species.CRANIDOS, Species.SHIELDON, Species.TIRTOUGA, Species.ARCHEN, Species.TYRUNT, Species.AMAURA, Species.AERODACTYL, Species.RELICANTH],
        [Species.SANDSHREW, Species.DIGLETT, Species.CUBONE, Species.MAGNEMITE, Species.SWINUB, Species.PHANPY, Species.NUMEL, Species.BALTOY, Species.BELDUM, Species.BRONZOR, Species.GIBLE, Species.DRILBUR],
        [Species.BONSLY, Species.SHUCKLE, Species.SLUGMA, Species.CORSOLA, Species.LUNATONE, Species.SOLROCK, Species.LILEEP, Species.ANORITH, Species.REGIROCK, Species.LARVITAR, Species.CARBINK, Species.ROCKRUFF],
        [Species.GEODUDE, Species.SANDSHREW, Species.ZUBAT, Species.PARAS, Species.DIGLETT, Species.RHYHORN],
        [Species.GEODUDE, Species.RHYHORN, Species.ARON, Species.LARVITAR, Species.ROGGENROLA, Species.TYRUNT],
        [Species.OMANYTE, Species.KABUTO, Species.AERODACTYL, Species.LILEEP, Species.ANORITH, Species.CRANIDOS],
        [Species.REGIROCK, Species.REGIGIGAS, Species.TERRAKION, Species.LANDORUS, Species.DIANCIE, Species.NIHILEGO, Species.STAKATAKA, Species.GENESECT],
    ],
    [TrainerType.STEVEN]: [
        [Species.BELDUM],
        [Species.ARON, Species.MAGNEMITE, Species.MAWILE, Species.SKARMORY, Species.BRONZOR, Species.PAWNIARD, Species.HONEDGE, Species.CUFANT, Species.MELTAN, Species.KLINK, Species.FERROSEED, Species.TOGEDEMARU],
        [Species.NOSEPASS, Species.LARVITAR, Species.ANORITH, Species.LILEEP, Species.CRANIDOS, Species.SHIELDON, Species.ROGGENROLA, Species.TIRTOUGA, Species.ARCHEN, Species.CARBINK, Species.ROCKRUFF, Species.BINACLE],
        [Species.SPHEAL, Species.TRAPINCH, Species.BAGON, Species.FEEBAS, Species.TROPIUS, Species.ABSOL, Species.SNORUNT, Species.CORPHISH, Species.BALTOY, Species.BARBOACH, Species.CLAMPERL, Species.RELICANTH],
        [Species.ARON, Species.ANORITH, Species.LILEEP, Species.SABLEYE, Species.MAWILE, Species.TRAPINCH, Species.BAGON, Species.RELICANTH, Species.REGIROCK, Species.REGICE, Species.REGISTEEL],
        [Species.SKARMORY, Species.ARON, Species.LILEEP, Species.ANORITH, Species.BALTOY],
        [Species.SABLEYE, Species.MAWILE, Species.LUNATONE, Species.SOLROCK, Species.BALTOY],
        [Species.RELICANTH, Species.BALTOY, Species.NOSEPASS, Species.ARON, Species.ANORITH, Species.LILEEP],
      [Species.REGISTEEL, Species.REGIROCK, Species.REGICE, Species.REGIGIGAS, Species.JIRACHI, Species.DIALGA, Species.HEATRAN, Species.COBALION, Species.TERRAKION, Species.VIRIZION, Species.KELDEO, Species.DIANCIE],
    ],
    [TrainerType.CYRUS]: [
        [Species.SNEASEL],
        [Species.MURKROW, Species.HOUNDOUR, Species.SABLEYE, Species.SHUPPET, Species.DUSKULL, Species.STUNKY, Species.SPIRITOMB, Species.YAMASK, Species.ZORUA, Species.PHANTUMP, Species.MIMIKYU, Species.IMPIDIMP],
        [Species.ABRA, Species.VOLTORB, Species.PORYGON, Species.UNOWN, Species.NATU, Species.RALTS, Species.MEDITITE, Species.LUNATONE, Species.SOLROCK, Species.BALTOY, Species.CHINGLING, Species.ELGYEM],
        [Species.GLAMEOW, Species.CHATOT, Species.BUIZEL, Species.SHELLOS, Species.DRIFLOON, Species.BUNEARY, Species.HIPPOPOTAS, Species.SKORUPI, Species.CROAGUNK, Species.FINNEON, Species.SNOVER, Species.ROTOM],
        [Species.ZUBAT, Species.BRONZOR, Species.STUNKY, Species.GLAMEOW, Species.MURKROW, Species.HOUNDOUR],
        [Species.UNOWN, Species.SPIRITOMB, Species.ROTOM, Species.PORYGON, Species.MISDREAVUS, Species.SNORUNT],
        [Species.UNOWN, Species.SPIRITOMB, Species.ROTOM, Species.CHINGLING, Species.BRONZOR, Species.RIOLU],
        [Species.DIALGA, Species.PALKIA, Species.GIRATINA, Species.UXIE, Species.MESPRIT, Species.AZELF, Species.HEATRAN, Species.REGIGIGAS, Species.CRESSELIA, Species.DARKRAI, Species.ARCEUS, Species.DEOXYS],
    ],
    [TrainerType.LT_SURGE]: [
        [Species.PIKACHU],
        [Species.VOLTORB, Species.MAGNEMITE, Species.ELEKID, Species.JOLTEON, Species.CHINCHOU, Species.MAREEP, Species.PLUSLE, Species.MINUN, Species.SHINX, Species.PACHIRISU, Species.BLITZLE, Species.TYNAMO],
        [Species.ROTOM, Species.EMOLGA, Species.JOLTIK, Species.TYNAMO, Species.HELIOPTILE, Species.DEDENNE, Species.TOGEDEMARU, Species.MORPEKO, Species.PINCURCHIN, Species.YAMPER, Species.TOXEL, Species.PAWMI],
        [Species.BLITZLE, Species.STUNFISK, Species.HELIOPTILE, Species.DEDENNE, Species.TOGEDEMARU, Species.PINCURCHIN, Species.DRACOZOLT, Species.ARCTOZOLT],
        [Species.VOLTORB, Species.MAGNEMITE, Species.ELEKID, Species.JOLTEON, Species.ELECTABUZZ],
        [Species.PLUSLE, Species.MINUN, Species.PACHIRISU, Species.EMOLGA],
      [Species.ZAPDOS, Species.RAIKOU, Species.REGIELEKI, Species.ZERAORA, Species.TAPU_KOKO, Species.ZEKROM,
        Species.THUNDURUS, Species.XURKITREE],
    ],
    [TrainerType.HAU]: [
        [Species.PIKACHU, Species.ALOLA_RAICHU],
        [Species.ROWLET, Species.LITTEN, Species.POPPLIO, Species.PIKIPEK, Species.YUNGOOS, Species.GRUBBIN, Species.HAPPINY, Species.MUNCHLAX, Species.BONSLY, Species.ALOLA_MEOWTH],
        [Species.ALOLA_MAROWAK, Species.ALOLA_SANDSHREW, Species.ALOLA_VULPIX, Species.ALOLA_DIGLETT, Species.ALOLA_MEOWTH, Species.ALOLA_GEODUDE, Species.ALOLA_GRIMER, Species.ORICORIO, Species.ROCKRUFF, Species.WISHIWASHI, Species.MAREANIE, Species.MUDBRAY],
        [Species.KOMALA, Species.TURTONATOR, Species.TOGEDEMARU, Species.MIMIKYU, Species.BRUXISH, Species.DRAMPA, Species.DHELMISE, Species.JANGMO_O, Species.WIMPOD, Species.SANDYGAST, Species.PYUKUMUKU, Species.MINIOR],
        [Species.ROWLET, Species.LITTEN, Species.POPPLIO, Species.PIKIPEK, Species.YUNGOOS, Species.GRUBBIN, Species.CRABRAWLER, Species.CUTIEFLY, Species.FOMANTIS, Species.SALANDIT, Species.STUFFUL, Species.TAPU_KOKO],
        [Species.YUNGOOS, Species.WISHIWASHI, Species.SALANDIT, Species.FOMANTIS, Species.GRUBBIN, Species.MIMIKYU],
        [Species.SLURPUFF, Species.MUNCHLAX, Species.STUFFUL, Species.KOMALA, Species.BOUNSWEET, Species.ORANGURU],
        [Species.ORICORIO, Species.COMFEY, Species.CUTIEFLY, Species.FOMANTIS, Species.MORELULL, Species.BOUNSWEET],
        [Species.SOLGALEO, Species.LUNALA, Species.NECROZMA, Species.TAPU_KOKO, Species.TAPU_LELE, Species.TAPU_BULU, Species.TAPU_FINI, Species.MAGEARNA, Species.MARSHADOW, Species.ZERAORA, Species.MELTAN, Species.MELMETAL],
    ],
  [TrainerType.LARRY]: [
    [Species.KOMALA],
    [Species.PIDGEY, Species.MEOWTH, Species.DITTO, Species.EEVEE, Species.SENTRET, Species.DUNSPARCE, Species.ZIGZAGOON, Species.SLAKOTH, Species.BIDOOF, Species.PATRAT, Species.BUNNELBY],
    [Species.TANDEMAUS, Species.FIDOUGH, Species.LECHONK, Species.STUFFUL, Species.WOOLOO, Species.SKWOVET, Species.YUNGOOS, Species.GALAR_MEOWTH, Species.GALAR_ZIGZAGOON, Species.GALAR_FARFETCHD, Species.WYRDEER, Species.GALAR_STUNFISK],
    [Species.GIRAFARIG, Species.STANTLER, Species.SMEARGLE, Species.ZANGOOSE, Species.KECLEON, Species.CASTFORM, Species.ABSOL, Species.BUNEARY, Species.HAPPINY, Species.MUNCHLAX, Species.MINCCINO, Species.DEERLING],
    [Species.KANGASKHAN, Species.TAUROS, Species.PALDEA_TAUROS, Species.PORYGON, Species.CHANSEY, Species.MILTANK, Species.AUDINO, Species.FURFROU, Species.DRAMPA, Species.INDEEDEE, Species.GALAR_DARUMAKA],
    [Species.LECHONK, Species.TANDEMAUS, Species.DUNSPARCE, Species.GIRAFARIG, Species.STANTLER, Species.FURFROU],
    [Species.SNORLAX, Species.SLAKOTH, Species.MUNNA, Species.DROWZEE, Species.JIGGLYPUFF, Species.TEDDIURSA],
    [Species.EEVEE, Species.DITTO, Species.SMEARGLE, Species.CASTFORM, Species.KECLEON, Species.PORYGON],
    [Species.ARCEUS, Species.REGIGIGAS, Species.MELOETTA, Species.TYPE_NULL, Species.SILVALLY, Species.SHAYMIN, Species.MEW],
  ],
  [TrainerType.WALLACE]: [
    [Species.FEEBAS],
    [Species.LUVDISC, Species.CLAMPERL, Species.SPHEAL, Species.CORPHISH, Species.BARBOACH, Species.CARVANHA, Species.WAILMER, Species.WINGULL, Species.SURSKIT, Species.LOTAD, Species.AZURILL, Species.MAGIKARP],
    [Species.MUDKIP, Species.RELICANTH, Species.CHINCHOU, Species.QWILFISH, Species.CORSOLA, Species.REMORAID, Species.MANTINE, Species.SKITTY, Species.ELECTRIKE, Species.VOLBEAT, Species.ILLUMISE, Species.WHISCASH],
    [Species.LUVDISC, Species.CASTFORM, Species.SWABLU, Species.SKITTY, Species.WURMPLE, Species.SEEDOT, Species.SHROOMISH, Species.WHISMUR, Species.MAKUHITA, Species.AZURILL, Species.MEDITITE, Species.ROSELIA],
    [Species.PIPLUP, Species.OSHAWOTT, Species.FROAKIE, Species.POPPLIO, Species.SOBBLE, Species.QUAXLY, Species.DUCKLETT, Species.FRILLISH, Species.SKRELP, Species.CLAUNCHER, Species.WISHIWASHI, Species.BRUXISH],
    [Species.LUVDISC, Species.SURSKIT, Species.LOTAD, Species.CORPHISH, Species.WAILMER, Species.WHISCASH],
    [Species.LUVDISC, Species.CASTFORM, Species.SKITTY, Species.POOCHYENA, Species.WURMPLE, Species.TAILLOW],
    [Species.MAGIKARP, Species.GOLDEEN, Species.BARBOACH, Species.CARVANHA, Species.RELICANTH, Species.LUVDISC],
    [Species.KYOGRE, Species.PALKIA, Species.SUICUNE, Species.MANAPHY, Species.PHIONE, Species.KELDEO, Species.VOLCANION, Species.TAPU_FINI, Species.LUGIA, Species.LATIOS, Species.LATIAS, Species.MANAPHY],
  ],
    [TrainerType.ALDER]: [
        [Species.LARVESTA],
        [Species.LARVITAR, Species.BELDUM, Species.SCYTHER, Species.PINSIR, Species.SPINARAK, Species.YANMA, Species.PINECO, Species.SHUCKLE, Species.HERACROSS],
        [Species.SEWADDLE, Species.VENIPEDE, Species.DWEBBLE, Species.JOLTIK, Species.KARRABLAST, Species.SHELMET, Species.DURANT],
        [Species.DRUDDIGON, Species.VANILLITE, Species.TIMBURR, Species.BOUFFALANT, Species.RUFFLET, Species.VULLABY, Species.AXEW, Species.DEINO, Species.GOLETT, Species.PAWNIARD, Species.SHELMET],
        [Species.DRUDDIGON, Species.VANILLITE, Species.BOUFFALANT, Species.RUFFLET],
        [Species.VICTINI, Species.KELDEO, Species.MELOETTA, Species.RESHIRAM, Species.ZEKROM, Species.KYUREM, Species.GENESECT, Species.COBALION, Species.TERRAKION],
    ],
    [TrainerType.MISTY]: [
        [Species.STARYU],
        [Species.GOLDEEN, Species.POLIWAG, Species.HORSEA, Species.MAGIKARP, Species.PSYDUCK, Species.KRABBY, Species.SHELLDER, Species.SEEL, Species.TENTACOOL, Species.SLOWPOKE, Species.CHINCHOU, Species.WOOPER],
        [Species.AZURILL, Species.WOOPER, Species.QWILFISH, Species.REMORAID, Species.MANTINE, Species.CORSOLA, Species.LUVDISC, Species.FEEBAS, Species.CLAMPERL, Species.RELICANTH, Species.FINNEON, Species.BUIZEL],
        [Species.LAPRAS, Species.DRATINI, Species.CHINCHOU, Species.WOOPER, Species.QWILFISH, Species.MANTINE, Species.LOTAD, Species.SURSKIT, Species.CARVANHA, Species.WAILMER, Species.BARBOACH, Species.CORPHISH],
        [Species.GOLDEEN, Species.HORSEA, Species.PSYDUCK, Species.POLIWAG, Species.SEEL, Species.PIPLUP, Species.OSHAWOTT, Species.FROAKIE, Species.POPPLIO, Species.SOBBLE, Species.QUAXLY],
        [Species.MAGIKARP, Species.POLIWAG, Species.TENTACOOL, Species.HORSEA, Species.KRABBY],
      [Species.KYOGRE, Species.PALKIA, Species.SUICUNE, Species.MANAPHY, Species.PHIONE, Species.KELDEO,
        Species.VOLCANION, Species.TAPU_FINI, Species.URSHIFU, Species.MANAPHY],
    ],
    [TrainerType.BLAINE]: [
        [Species.GROWLITHE],
        [Species.PONYTA, Species.VULPIX, Species.MAGBY, Species.EEVEE, Species.CHARMANDER, Species.CYNDAQUIL, Species.SLUGMA, Species.NUMEL, Species.TORKOAL, Species.CHIMCHAR, Species.TEPIG, Species.FENNEKIN],
        [Species.MAGBY, Species.HOUNDOUR, Species.DARUMAKA, Species.LITWICK, Species.LARVESTA, Species.FLETCHLING, Species.LITLEO, Species.SALANDIT, Species.TURTONATOR, Species.SIZZLIPEDE, Species.ROLYCOLY, Species.CARKOL],
        [Species.LITTEN, Species.SCORBUNNY, Species.FUECOCO, Species.PANSEAR, Species.DARUMAKA, Species.HEATMOR, Species.FLETCHLING, Species.ORICORIO, Species.TURTONATOR, Species.SIZZLIPEDE, Species.CLOBBOPUS],
        [Species.PONYTA, Species.VULPIX, Species.MAGBY, Species.SLUGMA, Species.NUMEL],
        [Species.MAGBY, Species.SLUGMA, Species.NUMEL, Species.TORKOAL, Species.TURTONATOR, Species.CARKOL],
        [Species.LITWICK, Species.FLETCHLING, Species.SALANDIT, Species.SIZZLIPEDE, Species.ROLYCOLY, Species.CHARCADET],
      [Species.MOLTRES, Species.ENTEI, Species.HO_OH, Species.GROUDON, Species.HEATRAN, Species.VICTINI,
        Species.VOLCANION, Species.SOLGALEO, Species.BLACEPHALON, Species.MAGEARNA],
    ],
    [TrainerType.ARCHIE]: [
        [Species.CARVANHA],
        [Species.TENTACOOL, Species.WINGULL, Species.CORPHISH, Species.FEEBAS, Species.SPHEAL, Species.CLAMPERL, Species.RELICANTH, Species.LUVDISC, Species.WAILMER, Species.BARBOACH, Species.MAGIKARP, Species.HORSEA],
        [Species.MURKROW, Species.SNEASEL, Species.HOUNDOUR, Species.NUZLEAF, Species.SABLEYE, Species.ABSOL, Species.POOCHYENA, Species.ZORUA, Species.PAWNIARD, Species.VULLABY, Species.INKAY, Species.IMPIDIMP],
        [Species.LOTAD, Species.SEEDOT, Species.SURSKIT, Species.CORPHISH, Species.FEEBAS, Species.CLAMPERL, Species.RELICANTH, Species.LUVDISC, Species.POOCHYENA, Species.SABLEYE, Species.TRAPINCH, Species.CACNEA],
        [Species.WINGULL, Species.CLAMPERL, Species.RELICANTH, Species.WAILMER, Species.CORSOLA, Species.CHINCHOU],
        [Species.TENTACOOL, Species.CORPHISH, Species.BARBOACH, Species.FEEBAS, Species.HUNTAIL, Species.WISHIWASHI],
        [Species.KYOGRE, Species.LUGIA, Species.MANAPHY, Species.PHIONE, Species.TAPU_FINI, Species.PALKIA,
        Species.SUICUNE, Species.KELDEO, Species.VOLCANION],
    ],
    [TrainerType.MAXIE]: [
        [Species.NUMEL],
        [Species.BALTOY, Species.GEODUDE, Species.TORKOAL, Species.TRAPINCH, Species.BARBOACH, Species.RHYHORN, Species.SANDSHREW, Species.DIGLETT, Species.CUBONE, Species.ONIX, Species.PHANPY, Species.GLIGAR],
        [Species.SLUGMA, Species.HOUNDOUR, Species.GROWLITHE, Species.VULPIX, Species.PONYTA, Species.MAGBY, Species.FLAREON, Species.DARUMAKA, Species.LITWICK, Species.LARVESTA, Species.FLETCHLING, Species.LITLEO],
        [Species.SOLROCK, Species.LUNATONE, Species.TORKOAL, Species.TRAPINCH, Species.BALTOY, Species.BARBOACH, Species.CORPHISH, Species.LILEEP, Species.ANORITH, Species.FEEBAS, Species.CASTFORM, Species.SPINDA],
        [Species.ZUBAT, Species.POOCHYENA, Species.NUMEL, Species.MIGHTYENA, Species.GOLBAT, Species.CAMERUPT],
        [Species.TORKOAL, Species.SLUGMA, Species.SPOINK, Species.SPINDA, Species.TRAPINCH],
        [Species.VULPIX, Species.TORKOAL, Species.HIPPOPOTAS, Species.CHERUBI, Species.MARACTUS, Species.LARVESTA],
        [Species.GROUDON, Species.HEATRAN, Species.ENTEI, Species.HO_OH, Species.REGIROCK, Species.REGISTEEL, Species.LANDORUS, Species.VOLCANION, Species.TURTONATOR],
    ],
    [TrainerType.GHETSIS]: [
        [Species.DEINO],
        [Species.PAWNIARD, Species.SCRAGGY, Species.PURRLOIN, Species.SANDILE, Species.VULLABY, Species.ZORUA, Species.INKAY, Species.POOCHYENA, Species.MURKROW, Species.HOUNDOUR, Species.SNEASEL],
        [Species.DRATINI, Species.BAGON, Species.GIBLE, Species.AXEW, Species.GOOMY, Species.JANGMO_O, Species.APPLIN, Species.DREEPY, Species.NOIBAT, Species.DRUDDIGON, Species.DRAMPA, Species.TURTONATOR],
        [Species.PATRAT, Species.WOOBAT, Species.TRUBBISH, Species.YAMASK, Species.FRILLISH, Species.ELGYEM, Species.CUBCHOO, Species.STUNFISK, Species.MIENFOO, Species.DRUDDIGON, Species.GOLURK, Species.BOUFFALANT],
        [Species.PURRLOIN, Species.SANDILE, Species.SCRAGGY, Species.VENIPEDE, Species.TIMBURR, Species.TYMPOLE],
        [Species.VICTINI, Species.COBALION, Species.TERRAKION, Species.VIRIZION, Species.TORNADUS, Species.THUNDURUS],
        [Species.ZORUA, Species.YAMASK, Species.COFAGRIGUS, Species.GOTHITA, Species.SOLOSIS, Species.LITWICK],
        [Species.KYUREM, Species.ZEKROM, Species.RESHIRAM, Species.GIRATINA, Species.YVELTAL, Species.GUZZLORD, Species.NAGANADEL, Species.ETERNATUS, Species.RAYQUAZA, Species.DIALGA, Species.PALKIA, Species.NECROZMA],
    ],
    [TrainerType.LYSANDRE]: [
        [Species.LITLEO],
        [Species.HOUNDOUR, Species.SLUGMA, Species.NUMEL, Species.MAGBY, Species.GROWLITHE, Species.VULPIX, Species.PONYTA, Species.CHARMANDER, Species.CYNDAQUIL, Species.TORCHIC, Species.CHIMCHAR, Species.FENNEKIN],
        [Species.MURKROW, Species.SNEASEL, Species.POOCHYENA, Species.PURRLOIN, Species.PAWNIARD, Species.VULLABY, Species.DEINO, Species.INKAY, Species.ZORUA, Species.SANDILE, Species.SCRAGGY, Species.IMPIDIMP],
        [Species.MIENFOO, Species.INKAY, Species.NOIBAT, Species.SKRELP, Species.CLAUNCHER, Species.HELIOPTILE, Species.PANCHAM, Species.BINACLE, Species.HONEDGE, Species.ESPURR, Species.SWIRLIX, Species.SPRITZEE],
        [Species.HOUNDOUR, Species.SCRAGGY, Species.MIGHTYENA, Species.GOLBAT, Species.SNEASEL, Species.MURKROW],
        [Species.FLETCHLING, Species.SCATTERBUG, Species.FLABEBE, Species.SKIDDO, Species.PANCHAM, Species.ESPURR],
        [Species.ABSOL, Species.SPIRITOMB, Species.SIGILYPH, Species.UNOWN, Species.BRONZOR, Species.SOLOSIS],
        [Species.HEATRAN, Species.VOLCANION, Species.VICTINI, Species.HOOPA, Species.MARSHADOW, Species.ZARUDE, Species.GLASTRIER, Species.SPECTRIER, Species.KUBFU, Species.URSHIFU, Species.CALYREX, Species.ENAMORUS],
    ],
    [TrainerType.ROSE]: [
        [Species.CUFANT],
        [Species.MAGNEMITE, Species.BRONZOR, Species.KLINK, Species.PAWNIARD, Species.HONEDGE, Species.BELDUM, Species.ARON, Species.MAWILE, Species.SKARMORY, Species.FERROSEED, Species.MELTAN],
        [Species.ROLYCOLY, Species.SILICOBRA, Species.ROOKIDEE, Species.NICKIT, Species.WOOLOO, Species.YAMPER, Species.CLOBBOPUS, Species.SINISTEA, Species.HATENNA, Species.IMPIDIMP, Species.MILCERY, Species.SNOM],
        [Species.PINECO, Species.NOSEPASS, Species.SHIELDON, Species.BONSLY, Species.RIOLU, Species.TOGEDEMARU, Species.JANGMO_O, Species.WIMPOD, Species.DHELMISE, Species.CARBINK, Species.MINIOR, Species.SANDYGAST],
        [Species.HATENNA, Species.IMPIDIMP, Species.ROLYCOLY, Species.TOXEL, Species.SNOM],
        [Species.DRACOZOLT, Species.ARCTOZOLT, Species.DRACOVISH, Species.ARCTOVISH, Species.TYRUNT, Species.AMAURA],
        [Species.VOLTORB, Species.MAGNEMITE, Species.ELEKID, Species.ROTOM, Species.TYNAMO, Species.HELIOPTILE],
        [Species.REGISTEEL, Species.JIRACHI, Species.DIALGA, Species.MAGEARNA, Species.STAKATAKA, Species.MELTAN, Species.DURALUDON, Species.SOLGALEO, Species.NECROZMA, Species.KARTANA, Species.CELESTEELA, Species.GENESECT, Species.GALAR_ARTICUNO, Species.GALAR_ZAPDOS, Species.GALAR_MOLTRES],
    ],
    [TrainerType.GUZMA]: [
        [Species.WIMPOD],
        [Species.CATERPIE, Species.WEEDLE, Species.PARAS, Species.VENONAT, Species.SCYTHER, Species.PINSIR, Species.LEDYBA, Species.SPINARAK, Species.YANMA, Species.PINECO, Species.SHUCKLE, Species.HERACROSS],
        [Species.GRUBBIN, Species.CUTIEFLY, Species.DEWPIDER, Species.FOMANTIS, Species.MORELULL, Species.BOUNSWEET, Species.WIMPOD, Species.JANGMO_O, Species.COSMOG, Species.CRABRAWLER, Species.ORICORIO, Species.YUNGOOS],
        [Species.ZUBAT, Species.DROWZEE, Species.MEOWTH, Species.GRIMER, Species.SPINARAK, Species.MAREANIE, Species.SALANDIT, Species.TRUBBISH, Species.STUNKY, Species.CROAGUNK, Species.SCRAGGY],
        [Species.SCYTHER, Species.PINSIR, Species.HERACROSS, Species.VOLBEAT, Species.ILLUMISE, Species.KRICKETOT, Species.BURMY, Species.COMBEE, Species.SEWADDLE, Species.VENIPEDE, Species.DWEBBLE, Species.JOLTIK],
        [Species.PYUKUMUKU, Species.SANDYGAST, Species.CRABRAWLER, Species.WINGULL, Species.PIKIPEK],
        [Species.SCYTHER, Species.PINSIR, Species.HERACROSS, Species.SKORUPI, Species.DWEBBLE, Species.KARRABLAST],
        [Species.GENESECT, Species.VOLCANION, Species.MAGEARNA, Species.TAPU_KOKO, Species.TAPU_LELE, Species.TAPU_BULU, Species.TAPU_FINI, Species.NIHILEGO, Species.BUZZWOLE, Species.PHEROMOSA, Species.XURKITREE, Species.KARTANA],
    ],
  [TrainerType.LUSAMINE]: [
    [Species.CLEFFA],
    [Species.PETILIL, Species.MISDREAVUS, Species.FEEBAS, Species.BUNEARY, Species.STUFFUL, Species.BOUNSWEET, Species.COMFEY, Species.ORANGURU, Species.DRAMPA, Species.JANGMO_O, Species.COSMOG],
    [Species.PICHU, Species.VULPIX, Species.SANDSHREW, Species.CUBONE, Species.EXEGGCUTE, Species.GRIMER, Species.CRABRAWLER, Species.ORICORIO, Species.ROCKRUFF, Species.WISHIWASHI, Species.MAREANIE, Species.FOMANTIS],
    [Species.COSMOG, Species.COSMOEM, Species.TAPU_KOKO, Species.TAPU_LELE, Species.TAPU_BULU, Species.TAPU_FINI, Species.ZYGARDE, Species.MAGEARNA, Species.MARSHADOW, Species.ZERAORA, Species.MELTAN, Species.MELMETAL],
    [Species.TYPE_NULL, Species.PORYGON, Species.DITTO, Species.EEVEE, Species.ROTOM, Species.CARBINK],
    [Species.ALOLA_SANDSHREW, Species.ALOLA_VULPIX, Species.ALOLA_DIGLETT, Species.ALOLA_MEOWTH, Species.ALOLA_GEODUDE],
    [Species.ELGYEM, Species.SOLOSIS, Species.POIPOLE, Species.COSMOG, Species.MINIOR],
    [Species.NIHILEGO, Species.BUZZWOLE, Species.PHEROMOSA, Species.XURKITREE, Species.CELESTEELA, Species.KARTANA, Species.GUZZLORD, Species.POIPOLE, Species.BLACEPHALON, Species.STAKATAKA, Species.NECROZMA, Species.ETERNATUS],
  ],
  [TrainerType.NEMONA]: [
    [Species.PAWMI],
    [Species.SPRIGATITO, Species.FUECOCO, Species.QUAXLY, Species.LECHONK, Species.TAROUNTULA, Species.NYMBLE, Species.FIDOUGH, Species.SMOLIV, Species.NACLI, Species.CHARCADET, Species.MASCHIFF],
    [Species.TANDEMAUS, Species.CETODDLE, Species.FRIGIBAX, Species.TINKATINK, Species.FINIZEN, Species.WIGLETT, Species.FLITTLE, Species.SHROODLE, Species.BRAMBLIN, Species.TOEDSCOOL, Species.CAPSAKID, Species.RELLOR],
    [Species.CYCLIZAR, Species.ORTHWORM, Species.GLIMMET, Species.GREAVARD, Species.FLAMIGO, Species.VELUZA, Species.TATSUGIRI, Species.KLAWF, Species.WATTREL, Species.BELLIBOLT, Species.VAROOM, Species.TADBULB],
    [Species.SPRIGATITO, Species.FUECOCO, Species.QUAXLY, Species.FIDOUGH, Species.MASCHIFF, Species.SHROODLE],
    [Species.LECHONK, Species.SMOLIV, Species.NACLI, Species.CHARCADET, Species.FRIGIBAX, Species.TINKATINK],
    [Species.GIMMIGHOUL, Species.GREAVARD, Species.BRAMBLIN, Species.FLITTLE, Species.TANDEMAUS, Species.FINIZEN],
    [Species.KORAIDON, Species.MIRAIDON, Species.TING_LU, Species.CHIEN_PAO, Species.WO_CHIEN, Species.CHI_YU, Species.ROARING_MOON, Species.IRON_VALIANT, Species.GREAT_TUSK, Species.SCREAM_TAIL, Species.FLUTTER_MANE, Species.SLITHER_WING],
  ],
  [TrainerType.NORMAN]: [
    [Species.SLAKOTH],
    [Species.ZIGZAGOON, Species.TAILLOW, Species.SKITTY, Species.WHISMUR, Species.AZURILL, Species.SPINDA, Species.SWABLU, Species.ZANGOOSE, Species.CASTFORM, Species.KECLEON, Species.DELCATTY, Species.LINOONE],
    [Species.PIDGEY, Species.MEOWTH, Species.LICKITUNG, Species.DITTO, Species.EEVEE, Species.PORYGON, Species.SENTRET, Species.AIPOM, Species.DUNSPARCE, Species.TEDDIURSA, Species.STANTLER],
    [Species.SMEARGLE, Species.MILTANK, Species.HAPPINY, Species.IGGLYBUFF, Species.TOGEPI, Species.CLEFFA, Species.BIDOOF, Species.BUNEARY, Species.MINCCINO, Species.BUNNELBY],
    [Species.KANGASKHAN, Species.TAUROS, Species.SNORLAX, Species.GIRAFARIG, Species.FARFETCHD, Species.CHANSEY, Species.AUDINO, Species.BOUFFALANT, Species.FURFROU, Species.PIKIPEK, Species.YUNGOOS, Species.SKWOVET],
    [Species.VIGOROTH, Species.SPINDA, Species.WHISMUR, Species.ZIGZAGOON, Species.SKITTY, Species.LINOONE],
    [Species.HAPPINY, Species.IGGLYBUFF, Species.CLEFFA, Species.AZURILL, Species.MUNCHLAX],
    [Species.EEVEE, Species.DITTO, Species.SMEARGLE, Species.CASTFORM, Species.KECLEON, Species.PORYGON],
    [Species.DRAMPA, Species.ORANGURU, Species.KOMALA, Species.STUFFUL, Species.WOOLOO],
    [Species.REGIGIGAS, Species.ARCEUS, Species.MELOETTA, Species.SILVALLY, Species.SLAKING],
  ],
  [TrainerType.ALLISTER]: [
    [Species.MIMIKYU],
    [Species.GASTLY, Species.MISDREAVUS, Species.SHUPPET, Species.DUSKULL, Species.DRIFLOON, Species.SPIRITOMB, Species.YAMASK, Species.LITWICK, Species.PHANTUMP, Species.PUMPKABOO, Species.SINISTEA, Species.DREEPY],
    [Species.CORSOLA, Species.YAMASK, Species.PONYTA, Species.ZIGZAGOON, Species.MEOWTH, Species.FARFETCHD, Species.STUNFISK, Species.SLOWPOKE, Species.DARUMAKA, Species.ZORUA, Species.BASCULIN, Species.RUNERIGUS],
    [Species.ROTOM, Species.FRILLISH, Species.GOLETT, Species.HONEDGE, Species.SANDYGAST, Species.DHELMISE, Species.SABLEYE, Species.MAWILE, Species.SHEDINJA, Species.NINCADA, Species.DITTO, Species.CUBONE],
    [Species.NATU, Species.MURKROW, Species.ABSOL, Species.SNORUNT, Species.ZORUA, Species.GOTHITA, Species.PAWNIARD, Species.DEINO, Species.NOIBAT, Species.IMPIDIMP, Species.HATENNA, Species.SNOM],
    [Species.SINISTEA, Species.YAMASK, Species.PUMPKABOO, Species.PHANTUMP, Species.DREEPY, Species.CORSOLA],
    [Species.PHANTUMP, Species.PUMPKABOO, Species.SHUPPET, Species.MISDREAVUS, Species.GASTLY, Species.DUSKULL],
    [Species.SINISTEA, Species.HONEDGE, Species.LITWICK, Species.ROTOM, Species.YAMASK, Species.SANDYGAST],
    [Species.GIRATINA, Species.LUNALA, Species.MARSHADOW, Species.HOOPA, Species.DARKRAI, Species.CRESSELIA, Species.YVELTAL, Species.XERNEAS, Species.SOLGALEO, Species.NECROZMA, Species.CALYREX, Species.SPECTRIER],
  ],
  [TrainerType.IRIS]: [
    [Species.AXEW],
    [Species.DRATINI, Species.BAGON, Species.GIBLE, Species.DEINO, Species.GOOMY, Species.JANGMO_O, Species.APPLIN, Species.DREEPY, Species.DRUDDIGON, Species.DRAMPA, Species.TURTONATOR, Species.NOIBAT],
    [Species.DEINO, Species.DRUDDIGON, Species.TIRTOUGA, Species.ARCHEN, Species.DRATINI, Species.TRAPINCH, Species.SWABLU, Species.BAGON, Species.GIBLE, Species.GOOMY, Species.NOIBAT],
    [Species.CHARMANDER, Species.HORSEA, Species.MAGIKARP, Species.LARVITAR, Species.TRAPINCH, Species.FEEBAS, Species.BELDUM, Species.GIBLE, Species.DEINO, Species.GOOMY, Species.JANGMO_O, Species.DREEPY],
    [Species.DRATINI, Species.LARVITAR, Species.BELDUM, Species.GIBLE, Species.DEINO, Species.GOOMY, Species.JANGMO_O, Species.DREEPY, Species.BAGON, Species.TRAPINCH, Species.NOIBAT],
    [Species.DEINO, Species.DRUDDIGON, Species.TRAPINCH, Species.SWABLU, Species.DRATINI],
    [Species.DRATINI, Species.BAGON, Species.GIBLE, Species.DEINO, Species.GOOMY, Species.JANGMO_O],
    [Species.HORSEA, Species.TRAPINCH, Species.NOIBAT, Species.APPLIN, Species.DREEPY],
    [Species.RAYQUAZA, Species.LATIAS, Species.LATIOS, Species.GIRATINA, Species.DIALGA, Species.PALKIA, Species.ZEKROM, Species.RESHIRAM, Species.KYUREM, Species.ZYGARDE, Species.NECROZMA, Species.ETERNATUS],
  ],
  [TrainerType.ROXIE]: [
    [Species.KOFFING],
    [Species.GRIMER, Species.EKANS, Species.ZUBAT, Species.NIDORAN_F, Species.NIDORAN_M, Species.ODDISH, Species.BELLSPROUT, Species.TENTACOOL, Species.GASTLY, Species.SPINARAK, Species.GULPIN],
    [Species.TRUBBISH, Species.VENIPEDE, Species.FOONGUS, Species.STUNKY, Species.SKORUPI, Species.CROAGUNK, Species.SEVIPER, Species.PURRLOIN, Species.WOOBAT, Species.YAMASK, Species.FRILLISH, Species.PAWNIARD],
    [Species.BULBASAUR, Species.WEEDLE, Species.VENONAT, Species.SLOWPOKE, Species.MAGNEMITE, Species.TANGELA, Species.HORSEA, Species.GOLDEEN, Species.STARYU, Species.SCYTHER, Species.PINSIR, Species.POLIWAG],
    [Species.QWILFISH, Species.SNEASEL, Species.SLUGMA, Species.CORSOLA, Species.REMORAID, Species.SURSKIT, Species.SHROOMISH, Species.NINCADA, Species.WHISMUR, Species.MAKUHITA, Species.SKITTY, Species.SABLEYE],
    [Species.VENIPEDE, Species.TRUBBISH, Species.CROAGUNK, Species.STUNKY, Species.SKORUPI],
    [Species.TOXEL, Species.ZIGZAGOON, Species.SCRAGGY, Species.NOIBAT, Species.IMPIDIMP],
    [Species.GRIMER, Species.TRUBBISH, Species.GULPIN, Species.STUNKY, Species.SALANDIT],
    [Species.NIHILEGO, Species.NAGANADEL, Species.ETERNATUS, Species.ZARUDE, Species.KELDEO, Species.MELOETTA, Species.ZERAORA, Species.REGIELEKI, Species.REGIDRAGO, Species.GLASTRIER],
  ],
  [TrainerType.SABRINA]: [
    [Species.ABRA],
    [Species.DROWZEE, Species.NATU, Species.RALTS, Species.SPOINK, Species.BELDUM, Species.CHINGLING, Species.MUNNA, Species.GOTHITA, Species.SOLOSIS, Species.ESPURR, Species.HATENNA, Species.MIME_JR],
    [Species.SLOWPOKE, Species.EXEGGCUTE, Species.STARYU, Species.PSYDUCK, Species.MR_MIME, Species.JYNX, Species.PORYGON, Species.DITTO, Species.EEVEE, Species.OMANYTE, Species.KABUTO, Species.DRATINI],
    [Species.WOBBUFFET, Species.GIRAFARIG, Species.LUNATONE, Species.SOLROCK, Species.BALTOY, Species.CHIMECHO, Species.WYNAUT, Species.BRONZOR, Species.ELGYEM, Species.INKAY, Species.ESPURR, Species.MEDITITE],
    [Species.UNOWN, Species.SIGILYPH, Species.YAMASK, Species.LITWICK, Species.GOLETT, Species.HONEDGE, Species.PHANTUMP, Species.BERGMITE, Species.NOIBAT, Species.PUMPKABOO, Species.CARBINK, Species.MIMIKYU],
    [Species.DROWZEE, Species.SLOWPOKE, Species.EXEGGCUTE, Species.STARYU, Species.PSYDUCK],
    [Species.NATU, Species.RALTS, Species.BELDUM, Species.SOLOSIS, Species.ESPURR],
    [Species.UNOWN, Species.SIGILYPH, Species.ELGYEM, Species.GOTHITA, Species.HATENNA],
    [Species.MEWTWO, Species.MEW, Species.CELEBI, Species.JIRACHI, Species.UXIE, Species.MESPRIT, Species.AZELF, Species.CRESSELIA, Species.VICTINI, Species.HOOPA, Species.TAPU_LELE, Species.LUNALA],
  ],
};

function shuffleArray<T>(array: T[]): T[] {
  const fourthElement = array[3];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Utils.randSeedInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  if (array[0] === fourthElement) {
    for (let i = 1; i < array.length; i++) {
      if (array[i] !== fourthElement) {
        [array[0], array[i]] = [array[i], array[0]];
        break;
      }
    }
  }

  return array;
}

const rivalPool: RivalTrainerType[] = [TrainerType.BLUE, TrainerType.RED];
const championPool: RivalTrainerType[] = [TrainerType.LANCE, TrainerType.CYNTHIA, TrainerType.STEVEN, TrainerType.ALDER, TrainerType.IRIS];
const evilTeamAdminPool: RivalTrainerType[] = [TrainerType.GIOVANNI, TrainerType.CYRUS, TrainerType.GHETSIS, TrainerType.ARCHIE, TrainerType.MAXIE, TrainerType.LYSANDRE, TrainerType.GUZMA, TrainerType.ROSE];
const gymLeaderPool: RivalTrainerType[] = [TrainerType.BROCK, TrainerType.MISTY, TrainerType.LT_SURGE, TrainerType.BLAINE, TrainerType.SABRINA, TrainerType.ROXIE, TrainerType.ALLISTER, TrainerType.NORMAN];
const otherTrainerPool: RivalTrainerType[] = [TrainerType.LARRY, TrainerType.WALLACE, TrainerType.LUSAMINE, TrainerType.NEMONA, TrainerType.HAU, ];

let selectedRivalType: RivalTrainerType | null = null;

function getRandomTrainer(trainerPool: RivalTrainerType[]): RivalTrainerType {
  return trainerPool[Utils.randSeedInt(trainerPool.length)];
}

export function getAllRivalTrainerTypes(): RivalTrainerType[] {
  return [...rivalPool, ...championPool, ...evilTeamAdminPool, ...gymLeaderPool, ...otherTrainerPool];
}

export function getDynamicRivalType(rivalStage: number, gameData: GameData, scene: BattleScene): RivalTrainerType {
    if (rivalStage === 1 || gameData.playerRival === null) {
    const allPools = getAllRivalTrainerTypes();
        const availableRivals = allPools.filter(rival => !gameData.defeatedRivals.includes(rival));

        if (availableRivals.length > 0) {
            gameData.playerRival = Utils.randSeedItem(availableRivals);
        } else if (gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            gameData.playerRival = Utils.randSeedItem(allPools);
       }
    }

    if (gameData.playerRival === null) {
        throw new Error("Failed to initialize player rival");
    }

    return gameData.playerRival;

}

export function getDynamicRival(rivalStage: number, gameData: GameData, scene: BattleScene): TrainerConfig {
    return getDynamicRivalConfig(rivalStage, getDynamicRivalType(rivalStage, gameData, scene), scene);

}

export function getDynamicRivalConfig(rivalStage: number, playerRival: RivalTrainerType, scene: BattleScene): TrainerConfig {
  const baseConfig = trainerConfigs[playerRival];
  if (!baseConfig) {
    throw new Error(`No trainer config found for rival type: ${playerRival}`);
  }

  let rivalStageDialogueIndex = rivalStage;

  if (scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN] && !scene.gameMode.isNightmare) {
    rivalStageDialogueIndex = 6 + rivalStage;
    rivalStageDialogueIndex = Math.max(7, Math.min(12, rivalStageDialogueIndex  ));
  }

  const scaledConfig = scaleTrainerParty(baseConfig, rivalStage, playerRival, scene);

  const dialogues = DynamicRivalDialogue[playerRival]?.[0];
  if (dialogues) {
    let encounterMessage = dialogues.encounter[rivalStageDialogueIndex - 1] ?? "";
    let victoryMessage = dialogues.victory[rivalStageDialogueIndex - 1] ?? "";
    let defeatMessage = dialogues.defeat[rivalStageDialogueIndex - 1] ?? "";


    scaledConfig.encounterMessages = [encounterMessage];
    scaledConfig.victoryMessages = [victoryMessage];
    scaledConfig.defeatMessages = [defeatMessage];
  }

  scaledConfig.trainerType = playerRival;

  const rivalTemplateKey = `RIVAL${rivalStage > 1 ? "_" + rivalStage : ""}` as keyof typeof trainerPartyTemplates;
  scaledConfig.setPartyTemplates(trainerPartyTemplates[rivalTemplateKey]);

  return scaledConfig;
}

export function glitchText(text: string, intense: boolean = false): string {
  const glitchChars = ['§', '∆', 'π', 'Ω'];

  return text.split('').map(char => {
    if (randSeedInt(100) < 30) {
      let glitchedChar = randSeedItem(glitchChars);

      if (randSeedInt(100) < 70) {
          let randomInt = randSeedInt(2);
          if (randomInt === 0) {
            glitchedChar = '▮';
          } else if (randomInt === 1) {
            glitchedChar = '▯';
          } 
      }
        
      return glitchedChar;
    }
    return char;
  }).join('');
}


export function scaleTrainerParty(config: TrainerConfig, rivalStage: number, trainerType: RivalTrainerType, scene: BattleScene, assignDialogueFromConfig:boolean = false): TrainerConfig {
  const scaledConfig = new TrainerConfig(config.trainerType);

  scaledConfig.name = config.name;
  scaledConfig.title = config.title;
  scaledConfig.hasCharSprite = config.hasCharSprite;
  scaledConfig.setStaticParty();

  scaledConfig.setMoneyMultiplier(1 + (rivalStage * 0.25));

  if(assignDialogueFromConfig) {
    scaledConfig.encounterMessages = config.encounterMessages;
    scaledConfig.victoryMessages = config.victoryMessages;
    scaledConfig.defeatMessages = config.defeatMessages;
  }


  let selectedBgm = "battle_rival";

  if (rivalStage >= 5) {
    const rivalBgmOptions = ["battle_bb_elite", "battle_aether_boss", "battle_aether_boss", "battle_legendary_giratina", "battle_legendary_deoxys", "battle_legendary_kanto", "battle_legendary_regis", "battle_legendary_arceus", "battle_final", "battle_skull_boss", "battle_rocket_boss", "battle_legendary_gro_kyo", "battle_legendary_kyurem", "battle_legendary_origin_forme", "battle_legendary_dusk_dawn", "battle_galactic_boss", "battle_legendary_glas_spec", "battle_legendary_zac_zam", "battle_rival_3"];
    selectedBgm = rivalBgmOptions[Utils.randSeedInt(rivalBgmOptions.length)];
  } else if (rivalStage >= 3) {
    selectedBgm = "battle_rival_2";
  }
  scaledConfig.setBattleBgm(selectedBgm);
  scaledConfig.setMixedBattleBgm(selectedBgm);
  scaledConfig.setHasCharSprite();

  const pokemonPools = trainerPokemonPools[trainerType];

  const partySize = Math.min(1 + rivalStage, 6);

  const partyMemberFuncs: ((scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => EnemyPokemon)[] = [];

  let signaturePool = pokemonPools[0]

  partyMemberFuncs.push((scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
    const waveIndex = scene.currentBattle.waveIndex;
    const levels = scene.currentBattle.trainer.getPartyLevels(waveIndex);
    const level = levels[0] || levels[levels.length - 1];


    if (pokemonPools[0].length > 1 && rivalStage >= 3) {
      signaturePool = [pokemonPools[0][1]];
    }
    else {
      signaturePool = [pokemonPools[0][0]];
    }
    
    const pokemon = getRandomPartyMemberFunc(signaturePool, TrainerSlot.TRAINER, trainerType == TrainerType.RED)(scene, level, strength);
    return pokemon;
  });

  const getUniqueRandomPokemon = (usedSpecies: Set<Species>, pokemonPools: Species[][]) => {
    return (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
      const waveIndex = scene.currentBattle.waveIndex;
      const levels = scene.currentBattle.trainer.getPartyLevels(waveIndex);
      const level = levels[partyMemberFuncs.length - 1] || levels[levels.length - 1];

      const middlePools = pokemonPools.slice(1, -1);
      let availableSpecies = middlePools.flatMap(pool => pool.filter(species => !usedSpecies.has(species)));

      if (availableSpecies.length === 0) {
        availableSpecies = middlePools.flat();
      }

      const randomIndex = randSeedInt(availableSpecies.length);
      const randomSpecies = availableSpecies[randomIndex];
      usedSpecies.add(randomSpecies);

      return getRandomPartyMemberFunc([randomSpecies], TrainerSlot.TRAINER)(scene, level, strength);
    };
  };

  const usedSpecies = new Set<Species>([signaturePool[0]]); 

  for (let i = 1; i < Math.min(4, partySize); i++) {
    partyMemberFuncs.push(getUniqueRandomPokemon(usedSpecies, pokemonPools));
  }

    if (partySize >= 5) {
    partyMemberFuncs.push((scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
      const waveIndex = scene.currentBattle.waveIndex;
      const levels = scene.currentBattle.trainer.getPartyLevels(waveIndex);
      const level = levels[4] || levels[levels.length - 1];
      const lastPool = pokemonPools[pokemonPools.length - 1];
      const uniqueLastPool = lastPool.filter(species => !usedSpecies.has(species));
      return getRandomPartyMemberFunc(uniqueLastPool.length > 0 ? uniqueLastPool : lastPool, TrainerSlot.TRAINER)(scene, level, strength);
    });
    }

  if (partySize === 6) {
    partyMemberFuncs.push(getUniqueRandomPokemon(usedSpecies, pokemonPools));
  }

  for (let i = 0; i < partyMemberFuncs.length; i++) {
    scaledConfig.setPartyMemberFunc(i, partyMemberFuncs[i]);
  }

  if (scene.gameMode.isNightmare && scene.currentBattle && scene.currentBattle.waveIndex >= 430) {
    const pokemonWithSmittyForms: { index: number, formIndices: number[] }[] = [];

    partyMemberFuncs.forEach((originalFunc, index) => {
      scaledConfig.setPartyMemberFunc(index, (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
        const pokemon = originalFunc(scene, slot, strength);

        const smittyFormIndices = pokemon.species.forms
            .map((form, idx) => form.formKey === SpeciesFormKey.SMITTY ? idx : -1)
            .filter(idx => idx !== -1);

        if (smittyFormIndices.length > 0) {
          pokemonWithSmittyForms.push({ index, formIndices: smittyFormIndices });
        }

        return pokemon;
      });
    });

    const numSmittyFormsNeeded = scene.currentBattle.waveIndex > 450 ? 2 : 1;
    const availablePartyIndices = new Set(Array.from({ length: partyMemberFuncs.length }, (_, i) => i));

    while (pokemonWithSmittyForms.length > 0 && availablePartyIndices.size > 0 && pokemonWithSmittyForms.length + (numSmittyFormsNeeded - pokemonWithSmittyForms.length) <= numSmittyFormsNeeded) {
      const selectedPokemonIndex = Utils.randSeedInt(pokemonWithSmittyForms.length);
      const selectedPokemon = pokemonWithSmittyForms[selectedPokemonIndex];
      const selectedFormIndex = selectedPokemon.formIndices[Utils.randSeedInt(selectedPokemon.formIndices.length)];

      const originalFunc = partyMemberFuncs[selectedPokemon.index];
      scaledConfig.setPartyMemberFunc(selectedPokemon.index, (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
        const pokemon = originalFunc(scene, slot, strength);
        pokemon.formIndex = selectedFormIndex;
        return pokemon;
      });

      availablePartyIndices.delete(selectedPokemon.index);
      pokemonWithSmittyForms.splice(selectedPokemonIndex, 1);
    }

    const remainingFormsNeeded = numSmittyFormsNeeded - (partyMemberFuncs.length - availablePartyIndices.size);
    if (remainingFormsNeeded > 0) {
      const universalSmittyForms = pokemonFormChanges[Species.NONE] || [];

      if (universalSmittyForms.length > 0) {
        const remainingIndices = Array.from(availablePartyIndices);

        for (let i = 0; i < remainingFormsNeeded && remainingIndices.length > 0; i++) {
          const randomIndexPosition = Utils.randSeedInt(remainingIndices.length);
          const randomPartyIndex = remainingIndices[randomIndexPosition];
          const randomUniversalForm = universalSmittyForms[Utils.randSeedInt(universalSmittyForms.length)];
          const originalFunc = partyMemberFuncs[randomPartyIndex];

          scaledConfig.setPartyMemberFunc(randomPartyIndex, (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
            const pokemon = originalFunc(scene, slot, strength);
            const trigger = randomUniversalForm.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
            if (trigger) {
              applyUniversalSmittyForm(trigger.name, pokemon);
              pokemon.formIndex = pokemon.species.forms.length - 1; 
              pokemon.generateName();
              pokemon.toggleShadow(false);
            }
            return pokemon;
          });

          remainingIndices.splice(randomIndexPosition, 1);
        }
      }
    }
  }

  if (rivalStage >= 4) {

    let bossIndices: number[] = [];
    if (rivalStage === 4) {
      bossIndices = [0]; 
    } else if (rivalStage === 5) {
      bossIndices = [0, 4]; 
    } else if (rivalStage >= 6) {
      bossIndices = [0, 4]; 
      let randomIndex;
      do {
        randomIndex = Utils.randSeedInt(partySize);
      } while (randomIndex === 0 || randomIndex === 4);
      bossIndices.push(randomIndex);
    }

    bossIndices.forEach((index, i) => {
      const originalFunc = scaledConfig.partyMemberFuncs[index];
      scaledConfig.setPartyMemberFunc(index, (scene: BattleScene, slot: TrainerSlot, strength: PartyMemberStrength) => {
        const pokemon = originalFunc(scene, slot, strength);
        if(rivalStage >= 4) {
          if (rivalStage === 4) {
            pokemon.setBoss(true, 3);
          } else if (rivalStage === 5) {
            pokemon.setBoss(true, index === 0 ? 3 : 2); 
          } else if (rivalStage >= 6) {
            pokemon.setBoss(true, index === 0 ? 4 : index === 4 ? 3 : 2); 
          }
          pokemon.initBattleInfo();
        }
        return pokemon;
      });
    });

    const teraIndices = Utils.getRandomUniqueIndices(partySize, rivalStage >= 6 ? 2 : 1);
    scaledConfig.setGenModifiersFunc(party => {
      return teraIndices.map(index => {
        const pokemon = party[index];
        return modifierTypes.TERA_SHARD().generateType([], [pokemon.species.type1])!.withIdFromFunc(modifierTypes.TERA_SHARD).newModifier(pokemon) as PersistentModifier;
      });
    });
  }

  return scaledConfig;
}

export function getNightmarePartyTemplate(waveIndex: number, isChampion: boolean): TrainerPartyTemplate {
  const createChampionStrongTemplate = (size: number): TrainerPartyTemplate => {
    return new TrainerPartyTemplate(size, PartyMemberStrength.STRONG, false, true);
  };

  if (waveIndex <= 10) {
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)
    );
  } else if (waveIndex <= 20) {
    if (isChampion) {
      return new TrainerPartyCompoundTemplate(
          createChampionStrongTemplate(2),
          new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)
      );
    }
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(1, PartyMemberStrength.STRONG)
    );
  } else if (waveIndex <= 45) {
    if (isChampion) {
      return new TrainerPartyCompoundTemplate(
          createChampionStrongTemplate(3),
          new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE)
      );
    }
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(2, PartyMemberStrength.STRONG)
    );
  } else if (waveIndex <= 60) {
    if (isChampion) {
      return createChampionStrongTemplate(5);
    }
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(3, PartyMemberStrength.STRONG)
    );
  } else if (waveIndex <= 70) {
    if (isChampion) {
      return createChampionStrongTemplate(6);
    }
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(2, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(4, PartyMemberStrength.STRONG)
    );
  } else {
    if (isChampion) {
      return new TrainerPartyCompoundTemplate(
          createChampionStrongTemplate(5),
          new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)
      );
    }
    return new TrainerPartyCompoundTemplate(
        new TrainerPartyTemplate(1, PartyMemberStrength.AVERAGE),
        new TrainerPartyTemplate(4, PartyMemberStrength.STRONG),
        new TrainerPartyTemplate(1, PartyMemberStrength.STRONGER)
    );
  }
}

