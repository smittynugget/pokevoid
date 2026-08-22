import BattleScene from "../battle-scene";
import PokemonSpecies, { getPokemonSpecies, speciesStarters } from "./pokemon-species";
import { VariantTier } from "../enums/variant-tiers";
import * as Utils from "../utils";
import Overrides from "#app/overrides";
import { pokemonPrevolutions } from "./pokemon-evolutions";
import { PlayerPokemon } from "#app/field/pokemon";
import i18next from "i18next";
import { EggTier } from "#enums/egg-type";
import { Species } from "#enums/species";
import { EggSourceType } from "#app/enums/egg-source-types.js";
import { shouldRejectDuelmonSpecies } from "./duelmon-spawn-utils";

export const EGG_SEED = 1073741824;
const DEFAULT_SHINY_RATE = 128;
const GACHA_SHINY_UP_SHINY_RATE = 64;
const SAME_SPECIES_EGG_SHINY_RATE = 24;
const SAME_SPECIES_EGG_HA_RATE = 8;
const MANAPHY_EGG_MANAPHY_RATE = 8;
const GACHA_EGG_HA_RATE = 192;
const DEFAULT_RARE_EGGMOVE_RATE = 6;
const SAME_SPECIES_EGG_RARE_EGGMOVE_RATE = 3;
const GACHA_MOVE_UP_RARE_EGGMOVE_RATE = 3;
export interface IEggOptions {

  id?: number;

  timestamp?: number;

  pulled?: boolean;

  sourceType?: EggSourceType;

  scene?: BattleScene;

  tier?: EggTier;

  hatchWaves?: number;

  species?: Species;

  isShiny?: boolean;

  variantTier?: VariantTier;

  eggMoveIndex?: number;

  overrideHiddenAbility?: boolean
}

export class Egg {

  private _id: number;
  private _tier: EggTier;
  private _sourceType: EggSourceType | undefined;
  private _hatchWaves: number;
  private _timestamp: number;

  private _species: Species;
  private _isShiny: boolean;
  private _variantTier: VariantTier;
  private _eggMoveIndex: number;

  private _overrideHiddenAbility: boolean;

  get id(): number {
    return this._id;
  }

  get tier(): EggTier {
    return this._tier;
  }

  get sourceType(): EggSourceType | undefined {
    return this._sourceType;
  }

  get hatchWaves(): number {
    return this._hatchWaves;
  }

  set hatchWaves(value: number) {
    this._hatchWaves = value;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get species(): Species {
    return this._species;
  }

  get isShiny(): boolean {
    return this._isShiny;
  }

  get variantTier(): VariantTier {
    return this._variantTier;
  }

  get eggMoveIndex(): number {
    return this._eggMoveIndex;
  }

  get overrideHiddenAbility(): boolean {
    return this._overrideHiddenAbility;
  }
  constructor(eggOptions?: IEggOptions) {
    this._sourceType = eggOptions?.sourceType!;

    this._tier = eggOptions?.tier ?? (Overrides.EGG_TIER_OVERRIDE ?? this.rollEggTier());

    if (eggOptions?.pulled) {

      this.checkForPityTierOverrides(eggOptions.scene!);
  }

    this._id = eggOptions?.id ?? Utils.randInt(EGG_SEED, EGG_SEED * this._tier);

    this._sourceType = eggOptions?.sourceType ?? undefined;
    this._hatchWaves = eggOptions?.hatchWaves ?? this.getEggTierDefaultHatchWaves();
    this._timestamp = eggOptions?.timestamp ?? new Date().getTime();
    this._isShiny = eggOptions?.isShiny ?? (Overrides.EGG_SHINY_OVERRIDE || this.rollShiny());
    this._variantTier = eggOptions?.variantTier ?? (Overrides.EGG_VARIANT_OVERRIDE ?? this.rollVariant());
    this._species = eggOptions?.species ?? this.rollSpecies(eggOptions!.scene!)!;

    this._overrideHiddenAbility = eggOptions?.overrideHiddenAbility ?? false;
    if (eggOptions?.species) {
      this._tier = this.getEggTierFromSpeciesStarterValue();
      this._hatchWaves = eggOptions.hatchWaves ?? this.getEggTierDefaultHatchWaves();
    }
    if (this._species && !getPokemonSpecies(this._species).hasVariants()) {
      this._variantTier = VariantTier.COMMON;
    }

    this._eggMoveIndex = eggOptions?.eggMoveIndex ?? this.rollEggMoveIndex();
    if (eggOptions?.pulled) {
      this.increasePullStatistic(eggOptions.scene!);
      this.addEggToGameData(eggOptions.scene!);
    }
  }

  public isManaphyEgg(): boolean {
    return (this._species === Species.PHIONE || this._species === Species.MANAPHY) ||
       this._tier === EggTier.COMMON && !(this._id % 204) && !this._species;
  }

  public getKey(): string {
    if (this.isManaphyEgg()) {
      return "manaphy";
    }
    return this._tier.toString();
  }
  public generatePlayerPokemon(scene: BattleScene): PlayerPokemon {

    if (!this._species) {
      this._isShiny = this.rollShiny();
      this._species = this.rollSpecies(scene!)!;
    }

    let pokemonSpecies = getPokemonSpecies(this._species);

    if (this._species === Species.PHIONE) {
      pokemonSpecies = getPokemonSpecies(Utils.randSeedInt(MANAPHY_EGG_MANAPHY_RATE) ? Species.PHIONE : Species.MANAPHY);
    }
    let abilityIndex: number | undefined = undefined;
    const sameSpeciesEggHACheck = (this._sourceType === EggSourceType.SAME_SPECIES_EGG && !Utils.randSeedInt(SAME_SPECIES_EGG_HA_RATE));
    const gachaEggHACheck = (!(this._sourceType === EggSourceType.SAME_SPECIES_EGG) && !Utils.randSeedInt(GACHA_EGG_HA_RATE));
    if (pokemonSpecies.abilityHidden && (this._overrideHiddenAbility || sameSpeciesEggHACheck || gachaEggHACheck)) {
      abilityIndex = 2;
  }
    const ret: PlayerPokemon = scene.addPlayerPokemon(pokemonSpecies, 1, abilityIndex, undefined, undefined, false);
    ret.shiny = this._isShiny;
    ret.variant = this._variantTier;

    const secondaryIvs = Utils.getIvsFromId(Utils.randSeedInt(4294967295));

    for (let s = 0; s < ret.ivs.length; s++) {
      ret.ivs[s] = Math.max(ret.ivs[s], secondaryIvs[s]);
}

    return ret;
  }
  public addEggToGameData(scene: BattleScene): void {
    scene.gameData.eggs.push(this);
}

  public getEggDescriptor(): string {
    if (this.isManaphyEgg()) {
    return "Manaphy";
  }
    switch (this.tier) {
    case EggTier.GREAT:
      return i18next.t("egg:greatTier");
    case EggTier.ULTRA:
      return i18next.t("egg:ultraTier");
    case EggTier.MASTER:
      return i18next.t("egg:masterTier");
    default:
      return i18next.t("egg:defaultTier");
  }
}

  public getEggHatchWavesMessage(): string {
    if (this.hatchWaves <= 5) {
    return i18next.t("egg:hatchWavesMessageSoon");
  }
    if (this.hatchWaves <= 15) {
    return i18next.t("egg:hatchWavesMessageClose");
  }
    if (this.hatchWaves <= 50) {
    return i18next.t("egg:hatchWavesMessageNotClose");
  }
  return i18next.t("egg:hatchWavesMessageLongTime");
}

  public getEggTypeDescriptor(scene: BattleScene): string {
    switch (this.sourceType) {
    case EggSourceType.SAME_SPECIES_EGG:
      return i18next.t("egg:sameSpeciesEgg", { species: getPokemonSpecies(this._species).getName()});
    case EggSourceType.GACHA_LEGENDARY:
      return `${i18next.t("egg:gachaTypeLegendary")} (${getPokemonSpecies(getLegendaryGachaSpeciesForTimestamp(scene, this.timestamp)).getName()})`;
    case EggSourceType.GACHA_SHINY:
      return i18next.t("egg:gachaTypeShiny");
    case EggSourceType.GACHA_MOVE:
      return i18next.t("egg:gachaTypeMove");
    default:
      console.warn("getEggTypeDescriptor case not defined. Returning default empty string");
      return "";
    }
  }

  private rollEggMoveIndex() {
    let baseChance = DEFAULT_RARE_EGGMOVE_RATE;
    switch (this._sourceType) {
    case EggSourceType.SAME_SPECIES_EGG:
      baseChance = SAME_SPECIES_EGG_RARE_EGGMOVE_RATE;
      break;
    case EggSourceType.GACHA_MOVE:
      baseChance = GACHA_MOVE_UP_RARE_EGGMOVE_RATE;
      break;
    default:
      break;
    }

    return Utils.randSeedInt(baseChance * Math.pow(2, 3 - this.tier)) ? Utils.randSeedInt(3) : 3;
  }

  private getEggTierDefaultHatchWaves(eggTier?: EggTier): number {
    if (this._species === Species.PHIONE || this._species === Species.MANAPHY) {
      return 50;
    }

    switch (eggTier ?? this._tier) {
    case EggTier.COMMON:
      return 10;
    case EggTier.GREAT:
      return 25;
    case EggTier.ULTRA:
      return 50;
    }
    return 100;
  }

  private rollEggTier(): EggTier {
    const tierValueOffset = this._sourceType === EggSourceType.GACHA_LEGENDARY ? 1 : 0;
    const tierValue = Utils.randInt(512);
    return tierValue >= 96 + tierValueOffset ? EggTier.COMMON : tierValue >= 8 + tierValueOffset ? EggTier.GREAT : tierValue >= 1 + tierValueOffset ? EggTier.ULTRA : EggTier.MASTER;
  }

  private rollSpecies(scene: BattleScene): Species | null {
    if (!scene) {
      return null;
    }

    if (this.isManaphyEgg()) {
      const rand = Utils.randSeedInt(MANAPHY_EGG_MANAPHY_RATE);
      return rand ? Species.PHIONE : Species.MANAPHY;
    } else if (this.tier === EggTier.MASTER
      && this._sourceType === EggSourceType.GACHA_LEGENDARY) {
      if (!Utils.randSeedInt(2)) {
        return getLegendaryGachaSpeciesForTimestamp(scene, this.timestamp);
      }
    }

    let minStarterValue: integer;
    let maxStarterValue: integer;

    switch (this.tier) {
    case EggTier.GREAT:
      minStarterValue = 4;
      maxStarterValue = 5;
      break;
    case EggTier.ULTRA:
      minStarterValue = 6;
      maxStarterValue = 7;
      break;
    case EggTier.MASTER:
      minStarterValue = 8;
      maxStarterValue = 9;
      break;
    default:
      minStarterValue = 1;
      maxStarterValue = 3;
      break;
    }

    const ignoredSpecies = [Species.PHIONE, Species.MANAPHY, Species.ETERNATUS];

    let speciesPool = Object.keys(speciesStarters)
      .filter(s => speciesStarters[s] >= minStarterValue && speciesStarters[s] <= maxStarterValue)
      .map(s => parseInt(s) as Species)
      .filter(s => !pokemonPrevolutions.hasOwnProperty(s) && getPokemonSpecies(s).isObtainable() && ignoredSpecies.indexOf(s) === -1 && (scene!.duelmonsEnabledForRun || getPokemonSpecies(s).generation !== 20));
    if (scene.gameData.unlockPity[this.tier] >= 9) {
      const lockedPool = speciesPool.filter(s => !scene.gameData.dexData[s].caughtAttr && !scene.gameData.eggs.some(e => e.species === s));
      if (lockedPool.length) {
        speciesPool = lockedPool;
      }
    }
    if (this.variantTier && (this.variantTier === VariantTier.RARE || this.variantTier === VariantTier.EPIC)) {
      speciesPool = speciesPool.filter(s => getPokemonSpecies(s).hasVariants());
    }
    let totalWeight = 0;
    const speciesWeights : number[] = [];
    for (const speciesId of speciesPool) {
      let weight = Math.floor((((maxStarterValue - speciesStarters[speciesId]) / ((maxStarterValue - minStarterValue) + 1)) * 1.5 + 1) * 100);
      const species = getPokemonSpecies(speciesId);
      if (species.isRegional()) {
        weight = Math.floor(weight / 2);
  }
      speciesWeights.push(totalWeight + weight);
      totalWeight += weight;
}

    let species: Species;

    for (let attempt = 0; attempt < 10; attempt++) {
      const rand = Utils.randSeedInt(totalWeight);
      let picked: Species | undefined;
      for (let s = 0; s < speciesWeights.length; s++) {
        if (rand < speciesWeights[s]) {
          picked = speciesPool[s];
          break;
        }
      }
      species = picked!;
      if (getPokemonSpecies(species).generation !== 20 || !shouldRejectDuelmonSpecies(scene)) {
        break;
      }
    }

    if (!!scene.gameData.dexData[species].caughtAttr || scene.gameData.eggs.some(e => e.species === species)) {
      scene.gameData.unlockPity[this.tier] = Math.min(scene.gameData.unlockPity[this.tier] + 1, 10);
    } else {
      scene.gameData.unlockPity[this.tier] = 0;
    }

    return species;
  }
  private rollShiny(): boolean {
    let shinyChance = DEFAULT_SHINY_RATE;
    switch (this._sourceType) {
    case EggSourceType.GACHA_SHINY:
      shinyChance = GACHA_SHINY_UP_SHINY_RATE;
      break;
    case EggSourceType.SAME_SPECIES_EGG:
      shinyChance = SAME_SPECIES_EGG_SHINY_RATE;
      break;
    default:
      break;
    }

    return !Utils.randSeedInt(shinyChance);
  }
  private rollVariant(): VariantTier {
    if (!this.isShiny) {
      return VariantTier.COMMON;
    }

    const rand = Utils.randSeedInt(10);
    if (rand >= 4) {
      return VariantTier.COMMON;
    } else if (rand >= 1) {
      return VariantTier.RARE;
    } else {
      return VariantTier.EPIC;
    }
  }

  private checkForPityTierOverrides(scene: BattleScene): void {
    const tierValueOffset = this._sourceType === EggSourceType.GACHA_LEGENDARY ? 1 : 0;
    scene.gameData.eggPity[EggTier.GREAT] += 1;
    scene.gameData.eggPity[EggTier.ULTRA] += 1;
    scene.gameData.eggPity[EggTier.MASTER] += 1 + tierValueOffset;

    if (scene.gameData.eggPity[EggTier.MASTER] >= 412 && this._tier === EggTier.COMMON) {
      this._tier = EggTier.MASTER;
    } else if (scene.gameData.eggPity[EggTier.ULTRA] >= 59 && this._tier === EggTier.COMMON) {
      this._tier = EggTier.ULTRA;
    } else if (scene.gameData.eggPity[EggTier.GREAT] >= 9 && this._tier === EggTier.COMMON) {
      this._tier = EggTier.GREAT;
    }
    scene.gameData.eggPity[this._tier] = 0;
  }

  private increasePullStatistic(scene: BattleScene): void {
    scene.gameData.gameStats.eggsPulled++;
    if (this.isManaphyEgg()) {
      scene.gameData.gameStats.manaphyEggsPulled++;
      this._hatchWaves = this.getEggTierDefaultHatchWaves(EggTier.ULTRA);
      return;
    }
    switch (this.tier) {
    case EggTier.GREAT:
      scene.gameData.gameStats.rareEggsPulled++;
      break;
    case EggTier.ULTRA:
      scene.gameData.gameStats.epicEggsPulled++;
      break;
    case EggTier.MASTER:
      scene.gameData.gameStats.legendaryEggsPulled++;
      break;
    }
  }

  private getEggTierFromSpeciesStarterValue(): EggTier {
    const speciesStartValue = speciesStarters[this.species];
    if (speciesStartValue >= 1 && speciesStartValue <= 3) {
      return EggTier.COMMON;
    }
    if (speciesStartValue >= 4 && speciesStartValue <= 5) {
      return EggTier.GREAT;
    }
    if (speciesStartValue >= 6 && speciesStartValue <= 7) {
      return EggTier.ULTRA;
    }
    if (speciesStartValue >= 8) {
      return EggTier.MASTER;
    }

    return EggTier.COMMON;
  }

}

export function getLegendaryGachaSpeciesForTimestamp(scene: BattleScene, timestamp: number): Species {
  const legendarySpecies = Object.entries(speciesStarters)
      .filter(s => s[1] >= 8 && s[1] <= 9)
      .map(s => parseInt(s[0]))
      .filter(s => getPokemonSpecies(s).isObtainable());

  let ret: Species;
  const timeDate = new Date(timestamp);
  const dayTimestamp = timeDate.getTime();
  const offset = Math.floor(Math.floor(dayTimestamp / 86400000) / legendarySpecies.length);
  const index = Math.floor(dayTimestamp / 86400000) % legendarySpecies.length;

  scene.executeWithSeedOffset(() => {
    ret = Phaser.Math.RND.shuffle(legendarySpecies)[index];
  }, offset, EGG_SEED.toString());
  ret = ret!;

  return ret;
}

export function logNext30DaysLegendaryGachaSpecies(scene: BattleScene): void {
  const legendarySpecies = Object.entries(speciesStarters)
    .filter(s => s[1] >= 8 && s[1] <= 9)
    .map(s => parseInt(s[0]))
    .filter(s => getPokemonSpecies(s).isObtainable());

  console.log("Next 30 Days Legendary Gacha Schedule:");
  console.log("=====================================");

  const currentDate = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i);
    const timestamp = date.getTime();

    let featuredSpecies: Species;
    scene.executeWithSeedOffset(() => {
      const dayTimestamp = date.getTime();
      const offset = Math.floor(Math.floor(dayTimestamp / 86400000) / legendarySpecies.length);
      const index = Math.floor(dayTimestamp / 86400000) % legendarySpecies.length;
      featuredSpecies = Phaser.Math.RND.shuffle(legendarySpecies)[index];
    }, 0, EGG_SEED.toString());

    console.log(`${date.toDateString()}: ${getPokemonSpecies(featuredSpecies!).getName()}`);
  }
}
export function getEggTierForSpecies(pokemonSpecies :PokemonSpecies): EggTier {
  const speciesBaseValue = speciesStarters[pokemonSpecies.getRootSpeciesId()];
  if (speciesBaseValue <= 3) {
    return EggTier.COMMON;
  } else if (speciesBaseValue <= 5) {
    return EggTier.GREAT;
  } else if (speciesBaseValue <= 7) {
    return EggTier.ULTRA;
  }
  return EggTier.MASTER;
}