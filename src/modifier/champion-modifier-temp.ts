import i18next from "i18next";
import BattleScene from "#app/battle-scene";
import Pokemon from "#app/field/pokemon";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { Stat, getStatName } from "#app/data/pokemon-stat";
import { allAbilities } from "#app/data/ability";
import * as Utils from "#app/utils";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { PlayableChampionData, PokemonAltBuildId } from "#app/system/playable-champions";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import {
  ModifierType,
  ModifierTypeGenerator,
  PokemonModifierType,
  modifierTypes,
  AddPokemonModifierType,
  AnyAbilityModifierType,
  TmModifierType, GeneratedPersistentModifierType,
} from "#app/modifier/modifier-type";
import {PersistentModifier, PokemonHeldItemModifier, Modifier, TerastallizeModifier} from "#app/modifier/modifier";
import {ChampionUtils} from "#app/system/champion-utils";
import { PlayerGender } from "#enums/player-gender";
import { PokemonAltBuildDefinition, POKEMON_ALT_BUILDS } from "#app/modifier/champion-modifier-type";

export class ChampionStatBoosterModifier extends PersistentModifier {
  private championId: string;
  private stats: Stat[];
  private boostPercent: number;

  constructor(type: ModifierType, championId: string, stats: Stat[], boostPercent: number = 0.01, stackCount?: integer) {
    super(type, stackCount);
    this.championId = championId;
    this.stats = stats;
    this.boostPercent = boostPercent;
  }

  match(modifier: any): boolean {
    return modifier instanceof ChampionStatBoosterModifier &&
      modifier.championId === this.championId &&
      JSON.stringify([...(modifier.stats || [])].sort()) === JSON.stringify([...(this.stats || [])].sort());
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const stat = args[1] as Stat;
    const statValue = args[2] as Utils.NumberHolder;
    const scene = pokemon.scene as BattleScene;
    if (scene.gameData.selectedChampionId !== this.championId || !pokemon.isPlayer()) {
      return false;
    }
    if (!this.stats?.includes(stat) || !statValue) {
      return false;
    }
    statValue.value *= (1 + (this.boostPercent * this.getStackCount()));
    return true;
  }

  clone(): ChampionStatBoosterModifier {
    return new ChampionStatBoosterModifier(this.type, this.championId, this.stats.slice(), this.boostPercent, this.stackCount);
  }

  getMaxStackCount(): integer { return 10 as unknown as integer; }
  getArgs(): any[] { return [this.championId, this.stats, this.boostPercent]; }
}

export class TrainerBondAbilityModifier extends PersistentModifier {
  public ability: Abilities;
  private bonusActivationChance: number;
  private championId: string;
  private activatedThisTurn: boolean = false;
  private lastCheckTurn: number = -1;

  constructor(type: ModifierType, championId: string, ability: Abilities, bonusChance: number = 0.15) {
    super(type, 1 as unknown as integer);
    this.ability = ability;
    this.bonusActivationChance = bonusChance;
    this.championId = championId;
  }

  match(modifier: any): boolean {
    return modifier instanceof TrainerBondAbilityModifier && modifier.championId === this.championId && modifier.ability === this.ability;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const scene = pokemon.scene as BattleScene;
    if (scene.gameData.selectedChampionId !== this.championId || !pokemon.isPlayer()) {
      return false;
    }

    const currentTurn = scene.currentBattle?.turn || 0;
    if (currentTurn !== this.lastCheckTurn) {
      this.lastCheckTurn = currentTurn;
      const chance = Math.round(this.bonusActivationChance * 100);
      this.activatedThisTurn = Utils.randSeedInt(100) < chance;
    }

    return this.activatedThisTurn;
  }

  clone(): TrainerBondAbilityModifier {
    return new TrainerBondAbilityModifier(this.type, this.championId, this.ability, this.bonusActivationChance);
  }

  getMaxStackCount(): integer {
    return 1 as unknown as integer;
  }

  getArgs(): any[] { return [this.championId, this.ability, this.bonusActivationChance]; }
}

export class PokemonAltBuildModifier extends PokemonHeldItemModifier {
  private altBuild: PokemonAltBuildDefinition;

  constructor(type: ModifierType, pokemonId: integer, altBuild: PokemonAltBuildDefinition) {
    super(type, pokemonId, 1);
    this.altBuild = altBuild;
  }

  match(modifier: Modifier): boolean {
    if (modifier instanceof PokemonAltBuildModifier) {
      return modifier.pokemonId === this.pokemonId && modifier.altBuild.id === this.altBuild.id;
    }
    return false;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    if (pokemon.id !== this.pokemonId) return false;

    this.applyAltBuildToPokemon(pokemon);
    return true;
  }

  private applyAltBuildToPokemon(pokemon: Pokemon): void {
    const species = pokemon.makeSpeciesUnique();

    if (this.altBuild.statReplacements) {
      const newBaseStats = [...species.baseStats];
      for (const [statStr, value] of Object.entries(this.altBuild.statReplacements)) {
        const stat = parseInt(statStr) as Stat;
        if (value !== undefined) newBaseStats[stat] = value;
      }
      species.baseStats = newBaseStats;
    }

    const [a1, a2, ah] = this.altBuild.abilityChanges;
    if (a1 !== undefined) species.ability1 = a1;
    if (a2 !== undefined) species.ability2 = a2;
    if (ah !== undefined) species.abilityHidden = ah;

    if (this.altBuild.typeChanges) {
      const [t1, t2] = this.altBuild.typeChanges;
      if (t1 !== undefined) species.type1 = t1;
      if (t2 !== undefined) species.type2 = t2;
    }

    pokemon.calculateStats();

    const baseName = pokemon.name || pokemon.species.name;
    const altBuildName = `${baseName} (${this.altBuild.name})`;
    pokemon.nickname = btoa(unescape(encodeURIComponent(altBuildName)));

    console.log(`Applied alt build "${this.altBuild.name}" to ${baseName}`);
    if (pokemon.scene && pokemon.getSprite()) {
      pokemon.updateSpritePipelineData();
    }
  }

  clone(): PokemonAltBuildModifier {
    return new PokemonAltBuildModifier(this.type, this.pokemonId, this.altBuild);
  }

  getArgs(): any[] {
    return [this.pokemonId, this.altBuild];
  }
}

export class TeraAbilityModifier extends PersistentModifier {
  public abilityId: Abilities;
  private championId: string;

  constructor(type: ModifierType, championId: string, abilityId: Abilities) {
    super(type, 1);
    this.championId = championId;
    this.abilityId = abilityId;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof TeraAbilityModifier &&
        modifier.abilityId === this.abilityId &&
        modifier.championId === this.championId;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    if (!pokemon.isPlayer()) return false;

    const scene = pokemon.scene as BattleScene;
    if (scene.gameData.selectedChampionId !== this.championId) return false;

    const teraActive = !!scene.findModifiers(m => (m as any).pokemonId === pokemon.id && m instanceof TerastallizeModifier).length;
    if (!teraActive) return false;

    const ability = allAbilities[this.abilityId];
    return !!ability;
  }

  clone(): TeraAbilityModifier {
    return new TeraAbilityModifier(this.type, this.championId, this.abilityId);
  }

  getArgs(): any[] {
    return [this.championId, this.abilityId];
  }
}

export class ChampionPokemonStatBoosterModifier extends PokemonHeldItemModifier {
  private championId: string;
  private stats: Stat[];
  private boostPercent: number;

  constructor(type: ModifierType, pokemonId: integer, championId: string, stats: Stat[], boostPercent: number = 0.01) {
    super(type, pokemonId, 1);
    this.championId = championId;
    this.stats = stats;
    this.boostPercent = boostPercent;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof ChampionPokemonStatBoosterModifier &&
      modifier.pokemonId === this.pokemonId &&
      modifier.championId === this.championId &&
      JSON.stringify([...(modifier.stats || [])].sort()) === JSON.stringify([...(this.stats || [])].sort());
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const stat = args[1] as Stat;
    const statValue = args[2] as Utils.NumberHolder;
    const scene = pokemon.scene as BattleScene;

    if (pokemon.id !== this.pokemonId) return false;
    if (scene.gameData.selectedChampionId !== this.championId || !pokemon.isPlayer()) {
      return false;
    }
    if (!this.stats?.includes(stat) || !statValue) {
      return false;
    }

    statValue.value *= (1 + (this.boostPercent * this.getStackCount()));
    return true;
  }

  clone(): ChampionPokemonStatBoosterModifier {
    return new ChampionPokemonStatBoosterModifier(this.type, this.pokemonId, this.championId, this.stats.slice(), this.boostPercent);
  }

  getMaxStackCount(): integer { return 5 as unknown as integer; }
  getArgs(): any[] { return [this.pokemonId, this.championId, this.stats, this.boostPercent]; }
}