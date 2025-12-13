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
import {PersistentModifier, PokemonHeldItemModifier, Modifier} from "#app/modifier/modifier";
import {ChampionUtils} from "#app/system/champion-utils";
import { PlayerGender } from "#enums/player-gender";

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
    const chance = Math.round(this.bonusActivationChance * 100);
    return Utils.randSeedInt(100) < chance;
  }

  clone(): TrainerBondAbilityModifier {
    return new TrainerBondAbilityModifier(this.type, this.championId, this.ability, this.bonusActivationChance);
  }

  getMaxStackCount(): integer {
    return 1 as unknown as integer;
  }

  getArgs(): any[] { return [this.championId, this.ability, this.bonusActivationChance]; }
}

export class TrainerBondAbilityModifierType extends ModifierType {
  private championId: string;
  private ability: Abilities;
  private bonusChance: number;

  constructor(championId: string, ability: Abilities, bonusChance: number = 0.15) {
    const iconKey = ChampionUtils.getChampionSpriteKey(championId, PlayerGender.UNSET) || "player_m";
    super("modifierType:trainerBondAbility", iconKey, (type: ModifierType) => new TrainerBondAbilityModifier(type, championId, ability, bonusChance), "trainer");
    this.championId = championId;
    this.ability = ability;
    this.bonusChance = bonusChance;
  }

  get name(): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const abilityName = allAbilities[this.ability].name;

    return i18next.t("championModifiers:modifierType.trainerBondAbility.name", {
      champion: championName,
      ability: abilityName
    });
  }

  getDescription(scene: BattleScene): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const abilityName = allAbilities[this.ability].name;
    const abilityDescription = allAbilities[this.ability].description;
    const chanceText = (this.bonusChance * 100).toFixed(0);

    return i18next.t("championModifiers:modifierType.trainerBondAbility.description", {
      champion: championName,
      ability: abilityName,
      abilityDescription: abilityDescription,
      chance: chanceText
    });
  }

  getPregenArgs(): any[] { return [this.championId, this.ability, this.bonusChance]; }
}

export class TrainerBondAbilityModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length >= 2) {
        const [championId, abilityId, activationChance] = pregenArgs as [string, Abilities, number?];
        return new TrainerBondAbilityModifierType(championId, abilityId, activationChance ?? 0.15);
      }
      const scene = party?.[0]?.scene as BattleScene;
      const championId = (scene as any)?.gameData?.selectedChampionId as string | undefined;
      const champData = (scene as any)?.gameData?.activeSkillTree?.championData as PlayableChampionData | undefined;
      if (!championId || !champData) return null;
      const abilityId = SkillTreeSelectors.pickTrainerBondAbility(champData);
      if (abilityId == null) return null;
      return new TrainerBondAbilityModifierType(championId, abilityId, 0.15);
    });
  }
}

export class ChampionStatBoosterModifierType extends ModifierType {
  private championId: string;
  private stats: Stat[];
  private boostPercent: number;

  constructor(championId: string, stats: Stat[], boostPercent: number = 0.01) {
    super("modifierType:championStatBooster", "champion_stat_boost", (type: ModifierType) => new ChampionStatBoosterModifier(type, championId, stats, boostPercent), "champion");
    this.championId = championId;
    this.stats = stats;
    this.boostPercent = boostPercent;
  }

  get name(): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const statNames = this.stats.map(stat => getStatName(stat)).join(", ");
    const percentText = (this.boostPercent * 100).toFixed(1);

    return i18next.t("modifierType:championStatBooster.name", {
      champion: championName,
      stats: statNames,
      percent: percentText
    });
  }

  getDescription(scene: BattleScene): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const statNames = this.stats.map(stat => getStatName(stat)).join(", ");
    const percentText = (this.boostPercent * 100).toFixed(1);

    return i18next.t("modifierType:championStatBooster.description", {
      champion: championName,
      stats: statNames,
      percent: percentText
    });
  }

  getPregenArgs(): any[] { return [this.championId, this.stats, this.boostPercent]; }
}

export class ChampionStatBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length >= 2) {
        const [championId, stats, boostPercent] = pregenArgs as [string, Stat[], number?];
        return new ChampionStatBoosterModifierType(championId, stats, boostPercent ?? 0.01);
      }
      const scene = party?.[0]?.scene as BattleScene;
      const championId = (scene as any)?.gameData?.selectedChampionId as string | undefined;
      const champData = (scene as any)?.gameData?.activeSkillTree?.championData as PlayableChampionData | undefined;
      if (!championId || !champData) return null;
      const picked = SkillTreeSelectors.pickStatBoostStats(champData);
      return new ChampionStatBoosterModifierType(championId, picked[0], picked[1]);
    });
  }
}

export class ChampionTmModifierTypeGenerator extends ModifierTypeGenerator {
  private championData: PlayableChampionData;
  constructor(championData: PlayableChampionData) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs[0] in Moves) {
        return new TmModifierType(pregenArgs[0] as Moves);
      }
      const selectedTM = SkillTreeSelectors.pickChampionTM(this.championData);
      return selectedTM != null ? new TmModifierType(selectedTM) : null;
    });
    this.championData = championData;
  }
}

export class ChampionXmModifierTypeGenerator extends ModifierTypeGenerator {
  private championData: PlayableChampionData;
  constructor(championData: PlayableChampionData) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs[0] in Moves) {
        return modifierTypes.ANYTM_GREAT().generateType(party, [pregenArgs[0] as Moves]);
      }
      const selectedXM = SkillTreeSelectors.pickChampionXM(this.championData);
      if (selectedXM != null) {
        return modifierTypes.ANYTM_GREAT().generateType(party, [selectedXM]);
      }
      return null;
    });
    this.championData = championData;
  }
}

export class ChampionAbilityModifierTypeGenerator extends ModifierTypeGenerator {
  private championData: PlayableChampionData;
  constructor(championData: PlayableChampionData) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs[0] in Abilities) {
        return new AnyAbilityModifierType(pregenArgs[0] as Abilities);
      }
      const selectedAbility = SkillTreeSelectors.pickChampionAbility(this.championData);
      return selectedAbility != null ? new AnyAbilityModifierType(selectedAbility) : null;
    });
    this.championData = championData;
  }
}

export class ChampionSmittyAbilityModifierTypeGenerator extends ModifierTypeGenerator {
  private championData: PlayableChampionData;
  constructor(championData: PlayableChampionData) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs[0] in Abilities) {
        return new AnyAbilityModifierType(pregenArgs[0] as Abilities);
      }
      const ability = SkillTreeSelectors.pickSmittyAbility(this.championData);
      return ability != null ? new AnyAbilityModifierType(ability) : null;
    });
    this.championData = championData;
  }
}

export class ChampionPokemonModifierTypeGenerator extends ModifierTypeGenerator {
  private championData: PlayableChampionData;
  private isSignature: boolean;
  constructor(championData: PlayableChampionData, isSignature: boolean = false) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      const scene = party[0]?.scene as BattleScene;
      if (!scene) return null;

      let speciesId: Species;
      if (pregenArgs && pregenArgs.length > 0 && typeof pregenArgs[0] === 'number') {
        speciesId = pregenArgs[0] as Species;
      } else {
        const selectedSpecies = this.isSignature
          ? SkillTreeSelectors.pickSignaturePokemon(this.championData)
          : SkillTreeSelectors.pickGeneralPokemon(this.championData);
        if (selectedSpecies == null) return null;
        speciesId = selectedSpecies;
      }
      const pokemonSpecies = getPokemonSpecies(speciesId);
      const newPokemon = scene.addPlayerPokemon(pokemonSpecies, 50, undefined, undefined, undefined, false);
      return new AddPokemonModifierType(newPokemon, false);
    });
    this.championData = championData;
    this.isSignature = isSignature;
  }
}

export interface PokemonAltBuildDefinition {
  id: PokemonAltBuildId;
  species?: Species;
  rank?: number;
  statReplacements: Partial<Record<Stat, number>>;
  abilityChanges: [Abilities?, Abilities?, Abilities?];
  moveReplacements: Partial<Record<number, Moves>>;
  typeChanges?: [Type?, Type?];
  preventEvolution?: boolean;
  prerequisiteBuilds?: PokemonAltBuildId[];
  spriteVariant?: string;
}

export const POKEMON_ALT_BUILDS: Record<PokemonAltBuildId, PokemonAltBuildDefinition> = {
  [PokemonAltBuildId.ONIX_CRYSTAL_LEVIATHAN]: {
    id: PokemonAltBuildId.ONIX_CRYSTAL_LEVIATHAN,
    species: Species.ONIX,
    rank: 1,
    statReplacements: {
      [Stat.ATK]: 120,
      [Stat.SPD]: 90
    },
    abilityChanges: [Abilities.STRONG_JAW, Abilities.TOUGH_CLAWS, Abilities.SAND_RUSH],
    moveReplacements: {
      1: Moves.BITE,
      6: Moves.CRUNCH,
      11: Moves.IRON_TAIL,
      16: Moves.EARTHQUAKE,
      21: Moves.STONE_EDGE,
      26: Moves.DRAGON_TAIL,
      31: Moves.HEAD_SMASH,
      36: Moves.OUTRAGE
    },
    typeChanges: [Type.ROCK, Type.GROUND],
    preventEvolution: true,
    prerequisiteBuilds: []
  },

  [PokemonAltBuildId.ONIX_STONE_DEFENDER]: {
    id: PokemonAltBuildId.ONIX_STONE_DEFENDER,
    species: Species.ONIX,
    rank: 1,
    statReplacements: {
      [Stat.DEF]: 200,
      [Stat.HP]: 80
    },
    abilityChanges: [Abilities.SOLID_ROCK, Abilities.STURDY, Abilities.SAND_VEIL],
    moveReplacements: {
      1: Moves.TACKLE,
      6: Moves.DEFENSE_CURL,
      11: Moves.ROCK_THROW,
      16: Moves.IRON_DEFENSE,
      21: Moves.ROLLOUT,
      26: Moves.EARTHQUAKE,
      31: Moves.STONE_EDGE,
      36: Moves.EXPLOSION
    },
    typeChanges: [Type.ROCK, Type.STEEL],
    preventEvolution: true,
    prerequisiteBuilds: []
  },

  [PokemonAltBuildId.GEODUDE_TANK_MODE]: {
    id: PokemonAltBuildId.GEODUDE_TANK_MODE,
    species: Species.GEODUDE,
    rank: 1,
    statReplacements: {
      [Stat.HP]: 120,
      [Stat.DEF]: 180
    },
    abilityChanges: [Abilities.SOLID_ROCK, Abilities.STURDY, Abilities.SAND_VEIL],
    moveReplacements: {
      1: Moves.TACKLE,
      6: Moves.DEFENSE_CURL,
      11: Moves.ROCK_THROW,
      16: Moves.MAGNITUDE,
      21: Moves.ROLLOUT,
      26: Moves.IRON_DEFENSE,
      31: Moves.EARTHQUAKE,
      36: Moves.STONE_EDGE
    },
    typeChanges: [Type.ROCK, Type.GROUND],
    preventEvolution: true,
    prerequisiteBuilds: []
  },

  [PokemonAltBuildId.GEODUDE_SPEED_FORM]: {
    id: PokemonAltBuildId.GEODUDE_SPEED_FORM,
    species: Species.GEODUDE,
    rank: 2,
    statReplacements: {
      [Stat.SPD]: 150,
      [Stat.ATK]: 100
    },
    abilityChanges: [Abilities.SAND_RUSH, Abilities.MOTOR_DRIVE, Abilities.UNBURDEN],
    moveReplacements: {
      1: Moves.QUICK_ATTACK,
      6: Moves.ROCK_SMASH,
      11: Moves.ACCELEROCK,
      16: Moves.BULLDOZE,
      21: Moves.ROCK_SLIDE,
      26: Moves.HIGH_HORSEPOWER,
      31: Moves.STONE_EDGE,
      36: Moves.ROCK_WRECKER
    },
    typeChanges: [Type.ROCK, Type.ELECTRIC],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.GEODUDE_TANK_MODE]
  },

  [PokemonAltBuildId.RHYHORN_RAMPAGE]: {
    id: PokemonAltBuildId.RHYHORN_RAMPAGE,
    species: Species.RHYHORN,
    rank: 1,
    statReplacements: {
      [Stat.ATK]: 160,
      [Stat.HP]: 110
    },
    abilityChanges: [Abilities.RECKLESS, Abilities.ROCK_HEAD, Abilities.SHEER_FORCE],
    moveReplacements: {
      1: Moves.HORN_ATTACK,
      6: Moves.STOMP,
      11: Moves.DRILL_RUN,
      16: Moves.HORN_DRILL,
      21: Moves.MEGAHORN,
      26: Moves.EARTHQUAKE,
      31: Moves.HEAD_SMASH,
      36: Moves.GIGA_IMPACT
    },
    typeChanges: [Type.GROUND, Type.FIGHTING],
    preventEvolution: true,
    prerequisiteBuilds: []
  }
};

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

export class PokemonAltBuildModifierType extends PokemonModifierType {
  private altBuild: PokemonAltBuildDefinition;

  constructor(altBuild: PokemonAltBuildDefinition) {
    const localeKey = "modifierType:pokemonAltBuild";
    const iconImage = "pokemon_alt_build";

    super(localeKey, iconImage, (type: ModifierType, pokemonId: integer) =>
        new PokemonAltBuildModifier(type, pokemonId, altBuild), "pokemonAltBuild");

    this.altBuild = altBuild;
  }

  get name(): string {
    return i18next.t("modifierType:pokemonAltBuild.name", { buildName: this.altBuild.name });
  }

  getDescription(scene: BattleScene): string {
    return i18next.t("modifierType:pokemonAltBuild.description", {
      buildName: this.altBuild.name,
      description: this.altBuild.description
    });
  }
  getPregenArgs(): any[] { return [this.altBuild.id]; }
}

export class PokemonAltBuildModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length > 0) {
        const [altBuildId] = pregenArgs as [PokemonAltBuildId];
        const altBuild = POKEMON_ALT_BUILDS[altBuildId];
        if (!altBuild) return null;
        return new PokemonAltBuildModifierType(altBuild);
      }

      const scene = party?.[0]?.scene as BattleScene;
      const champData = scene?.gameData?.activeSkillTree?.championData as PlayableChampionData | undefined;
      const pool = (champData?.unlockedAltBuilds || []) as PokemonAltBuildId[];
      if (!champData || pool.length === 0) return null;
      const altBuildId = SkillTreeSelectors.pickAltBuildId(champData);
      const altBuild = POKEMON_ALT_BUILDS[altBuildId];
      if (!altBuild) return null;
      return new PokemonAltBuildModifierType(altBuild);
    });
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

export class TeraAbilityModifierType extends ModifierType implements GeneratedPersistentModifierType {
  private championId: string;
  private abilityId: Abilities;

  constructor(championId: string, abilityId: Abilities) {
    super("modifierType:teraAbility", "stellar_tera_shard", (type: ModifierType) => new TeraAbilityModifier(type, championId, abilityId), "champion");
    this.championId = championId;
    this.abilityId = abilityId;
  }

  get name(): string {
    return i18next.t("modifierType:teraAbility.name", { ability: allAbilities[this.abilityId].name });
  }

  getDescription(scene: BattleScene): string {
    return i18next.t("modifierType:teraAbility.description", { ability: allAbilities[this.abilityId].name });
  }

  getPregenArgs(): any[] { return [this.championId, this.abilityId]; }
}

export class TeraAbilityModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs) {
        const [championId, abilityId] = pregenArgs as [string, Abilities];
        return new TeraAbilityModifierType(championId, abilityId);
      }

      const scene = party?.[0]?.scene as BattleScene;
      const champData = scene?.gameData?.activeSkillTree?.championData as PlayableChampionData | undefined;
      const championId = scene?.gameData?.selectedChampionId;
      if (!championId || !champData) return null;
      const abilityId = SkillTreeSelectors.pickTeraAbility(champData);
      if (abilityId == null) return null;
      return new TeraAbilityModifierType(championId, abilityId);
    });
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

export class ChampionPokemonStatBoosterModifierType extends PokemonModifierType {
  private championId: string;
  private stats: Stat[];
  private boostPercent: number;

  constructor(championId: string, stats: Stat[], boostPercent: number = 0.01) {
    const localeKey = "modifierType:championPokemonStatBooster";
    const iconImage = "protein";

    super(localeKey, iconImage, (_type, args) =>
        new ChampionPokemonStatBoosterModifier(this, (args[0] as Pokemon).id, championId, stats, boostPercent), "champion");

    this.championId = championId;
    this.stats = stats;
    this.boostPercent = boostPercent;
  }

  get name(): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const statNames = this.stats.map(stat => getStatName(stat)).join(", ");
    const percentText = (this.boostPercent * 100).toFixed(1);

    return i18next.t("championModifiers:modifierType.championPokemonStatBooster.name", {
      champion: championName,
      stats: statNames,
      percent: percentText
    });
  }

  getDescription(scene: BattleScene): string {
    const championName = ChampionUtils.getChampionDisplayName(this.championId);
    const statNames = this.stats.map(stat => getStatName(stat)).join(", ");
    const percentText = (this.boostPercent * 100).toFixed(1);

    return i18next.t("championModifiers:modifierType.championPokemonStatBooster.description", {
      champion: championName,
      stats: statNames,
      percent: percentText
    });
  }

  getPregenArgs(): any[] { return [this.championId, this.stats, this.boostPercent]; }
}

export class ChampionPokemonStatBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length >= 2) {
        const [championId, stats, boostPercent] = pregenArgs as [string, Stat[], number?];
        return new ChampionPokemonStatBoosterModifierType(championId, stats, boostPercent ?? 0.01);
      }
      const scene = party?.[0]?.scene as BattleScene;
      const championId = (scene as any)?.gameData?.selectedChampionId as string | undefined;
      const champData = (scene as any)?.gameData?.activeSkillTree?.championData as PlayableChampionData | undefined;
      if (!championId || !champData) return null;
      const picked = SkillTreeSelectors.pickStatBoostStats(champData);
      return new ChampionPokemonStatBoosterModifierType(championId, picked[0], picked[1]);
    });
  }
}
export const championModifierTypes = {
  CHAMPION_TM: (championData: PlayableChampionData) => new ChampionTmModifierTypeGenerator(championData),
  CHAMPION_XM: (championData: PlayableChampionData) => new ChampionXmModifierTypeGenerator(championData),
  CHAMPION_ABILITY: (championData: PlayableChampionData) => new ChampionAbilityModifierTypeGenerator(championData),
  CHAMPION_SIGNATURE_POKEMON: (championData: PlayableChampionData) => new ChampionPokemonModifierTypeGenerator(championData, true),
  CHAMPION_GENERAL_POKEMON: (championData: PlayableChampionData) => new ChampionPokemonModifierTypeGenerator(championData, false),
  CHAMPION_SMITTY_ABILITY: (championData: PlayableChampionData) =>
      new ChampionSmittyAbilityModifierTypeGenerator(championData),
  CHAMPION_POKEMON_STAT_BOOST: () => new ChampionPokemonStatBoosterModifierTypeGenerator(),
};