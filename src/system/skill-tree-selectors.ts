import * as Utils from "#app/utils";
import { getDuelmonBstLimitForWave } from "#app/data/duelmon-bst-utils";
import { Moves, isYuMove } from "#enums/moves";
import { Abilities } from "#enums/abilities";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { Stat } from "#enums/stat";
import { allMoves } from "#app/data/move";
import { allSpecies, speciesStarters } from "#app/data/pokemon-species";
import { allAbilities } from "#app/data/ability";
import { FormChangeItem } from "#enums/form-change-items";
import { PlayableChampionData, PokemonAltBuildId } from "#app/system/playable-champions";
import { UpgradePath } from "#enums/upgrade-path";
import { PermaType } from "#app/modifier/perma-modifiers";
import BattleScene from "#app/battle-scene";
import { pokemonPrevolutions } from "#app/data/pokemon-evolutions";
import { getAbilitiesForTypes } from "#app/system/type-ability-mappings";
import { getTypeStatPreferences } from "#app/system/type-stat-preferences";
import { tmPoolTiers } from "#app/data/tms";
import { ModifierTier } from "#app/modifier/modifier-tier";

export class SkillTreeSelectors {
  private static readonly SMITTY_ABILITY_THRESHOLD = 311;

  static isSmittyAbility(abilityId: Abilities): boolean {
    return (abilityId as number) >= SkillTreeSelectors.SMITTY_ABILITY_THRESHOLD;
  }

  private static isImplementedAbility(abilityId: Abilities): boolean {
    const ab: any = (allAbilities as any)?.[abilityId];
    return !!ab && typeof ab.name === "string" && !ab.name.endsWith(" (N)");
  }

  private static getChampionTypes(champion: PlayableChampionData): Type[] {
    if (champion.id === "red" && champion.unlockedTypeBoosters?.length) {
      return champion.unlockedTypeBoosters.filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    }
    const realTypes = [champion.type1, champion.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    if (realTypes.length > 0) return realTypes;
    if (champion.id === "red") {
      const allTypes = (Utils.getEnumValues(Type) as Type[])
        .filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
      const t1 = Utils.randSeedItem(allTypes);
      const t2 = Utils.randSeedItem(allTypes.filter(t => t !== t1));
      const t3 = Utils.randSeedItem(allTypes.filter(t => t !== t1 && t !== t2));
      return [t1, t2, t3];
    }
    return realTypes;
  }

  static getAllNonSmittyAbilities(): Abilities[] {
    return Object.values(Abilities)
      .filter(v => typeof v === "number" && !this.isSmittyAbility(v as Abilities))
      .filter(v => this.isImplementedAbility(v as Abilities)) as Abilities[];
  }

  static pickChampionTM(champion: PlayableChampionData): Moves {
    const types = this.getChampionTypes(champion);
    const pool = (Object.values(Moves) as Moves[]).filter((m) => {
      if (isYuMove(m)) return false;
      const md: any = (allMoves as any)[m];
      if (!md || !types.includes(md.type) || (md.name as string)?.endsWith(" (N)")) {
        return false;
      }
      const tier = tmPoolTiers[m];
      return tier !== undefined && tier <= ModifierTier.ROGUE;
    });
    return Utils.randSeedItem(pool);
  }

  static pickChampionXM(champion: PlayableChampionData): Moves {
    if (champion.unlockedXMs?.length) {
      return Utils.randSeedItem(champion.unlockedXMs);
    }
    return this.pickChampionTM(champion);
  }

  static pickSignaturePokemon(champion: PlayableChampionData): Species {
    return Utils.randSeedItem(champion.signaturePokemon || []);
  }

  static pickGeneralPokemon(champion: PlayableChampionData, scene?: BattleScene): Species {
    const types = this.getChampionTypes(champion);

    const currentWave = scene?.currentBattle?.waveIndex ?? 1;
    const bstLimit = getDuelmonBstLimitForWave(currentWave);

    const allSpeciesArray = allSpecies.filter(s => s != null);

    let pool = allSpeciesArray.filter((sd) => {
      if (sd.legendary || sd.mythical || (sd as any).subLegendary) {
        return false;
      }
      if (sd.generation === 20 && scene && !scene.duelmonsEnabledForRun) {
        return false;
      }
      if (sd.generation === 20 && !speciesStarters.hasOwnProperty(sd.speciesId)) {
        return false;
      }

      const baseStatTotal = (sd.baseStats || []).reduce((sum: number, stat: number) => sum + stat, 0);
      if (baseStatTotal > bstLimit) {
        return false;
      }

      const okType = types.length === 0 || types.some((t) => sd.type1 === t || sd.type2 === t);
      const okGen = !champion.pokemonGenerationFilter?.length || champion.pokemonGenerationFilter.includes(sd.generation);
      const hasPrevolution = pokemonPrevolutions[sd.speciesId] !== undefined;
      const isBaseForm = !hasPrevolution;
      const isEvolutionAllowed = isBaseForm || currentWave >= 20;

      return okType && okGen && isEvolutionAllowed;
    });

    const selectedData = Utils.randSeedItem(pool);
    if (!selectedData) {
      const fallbackPool = allSpeciesArray.filter((sd) => {
        if (sd.legendary || sd.mythical || (sd as any).subLegendary) return false;
        if (sd.generation === 20 && !speciesStarters.hasOwnProperty(sd.speciesId)) return false;
        const baseStatTotal = (sd.baseStats || []).reduce((sum: number, stat: number) => sum + stat, 0);
        if (baseStatTotal > bstLimit) return false;
        const hasPrevolution = pokemonPrevolutions[sd.speciesId] !== undefined;
        const isBaseForm = !hasPrevolution;
        const isEvolutionAllowed = isBaseForm || currentWave >= 20;
        return isEvolutionAllowed;
      });
      const fallback = Utils.randSeedItem(fallbackPool);
      return fallback?.speciesId as Species;
    }

    return selectedData.speciesId as Species;
  }

  static pickLegendaryPokemon(champion: PlayableChampionData): Species {
    return Utils.randSeedItem(champion.legendaryPokemon || []);
  }

  static pickChampionAbility(champion: PlayableChampionData): Abilities {
    return this.pickStandardAbility(champion);
  }

  static pickConditionalAbility(champion: PlayableChampionData): Abilities | null {
    const pool = ((champion.unlockedConditionalAbilities || []) as Abilities[]).filter(a => this.isImplementedAbility(a));
    if (pool.length === 0) return null;
    return Utils.randSeedItem(pool);
  }

  static pickStandardAbility(champion: PlayableChampionData): Abilities {
    const types = this.getChampionTypes(champion);

    let pool: Abilities[] = [];

    if (types.length > 0) {
      pool = this.getChampionTypeAbilities(types);
    }

    if (pool.length === 0) {
      pool = this.getAllNonSmittyAbilities();
    }

    return Utils.randSeedItem(pool);
  }

  static pickTrainerBondAbility(champion: PlayableChampionData): Abilities {
    const pool = ((champion.unlockedConditionalAbilities || []) as Abilities[]).filter(a => this.isImplementedAbility(a));
    if (pool.length === 0) {
      return this.pickStandardAbility(champion);
    }

    const isApolloDiana = champion.id === "apollo" || champion.id === "diana" || champion.id === "apollo_diana";
    if (!isApolloDiana) {
      return Utils.randSeedItem(pool);
    }

    const types = this.getChampionTypes(champion);
    const typeAbilities = getAbilitiesForTypes(types).filter(a => this.isImplementedAbility(a));

    if (typeAbilities.length > 0 && Utils.randSeedInt(100) < 90) {
      return Utils.randSeedItem(typeAbilities);
    }

    return Utils.randSeedItem(pool);
  }

  static pickStatBoostStats(champion: PlayableChampionData): [Stat[], number] {
    const prefs = this.getChampionStatPreferences(champion);
    return [prefs, 0.03];
  }

  static pickMoveUpgradePath(): UpgradePath {
    return Utils.randSeedItem(Object.values(UpgradePath) as UpgradePath[]);
  }

  static pickMegaStone(champion: PlayableChampionData): FormChangeItem {
    return Utils.randSeedItem((champion.unlockedMegaStones || []) as FormChangeItem[]);
  }

  static pickDynaMushroomItem(): FormChangeItem {
    return FormChangeItem.MAX_MUSHROOMS;
  }

  static pickGlitchiGlitchiFruititem(): FormChangeItem {
    return FormChangeItem.GLITCHI_GLITCHI_FRUIT;
  }

  static pickTypeSwitcherTypes(champion: PlayableChampionData): Type[] {
    const types = this.getChampionTypes(champion);
    if (!types.length) return [];
    const first = Utils.randSeedItem(types);
    if (types.length > 1 && Utils.randSeedInt(100) < 10) {
      const second = Utils.randSeedItem(types.filter((t) => t !== first));
      return [first, second];
    }
    return [first];
  }

  static pickChampionTypeBallType(champion: PlayableChampionData): Type {
    const types = this.getChampionTypes(champion);
    if (!types.length) return Type.NORMAL;
    return Utils.randSeedItem(types);
  }

  static pickAltBuildId(champion: PlayableChampionData): PokemonAltBuildId {
    return Utils.randSeedItem((champion.unlockedAltBuilds || []) as PokemonAltBuildId[]);
  }

  static pickGlitchFormKey(championData: PlayableChampionData): string {
    const available = championData?.unlockedGlitchForms || [];
    return Utils.randSeedItem(available);
  }

  static pickPermaItemType(): string {
    const stringKeys = Object.keys(PermaType).filter(k => isNaN(Number(k)));
    return Utils.randSeedItem(stringKeys);
  }

  static pickEssenceBundle(champion: PlayableChampionData): { type: Type, amount: number } {
    const types = this.getChampionTypes(champion);
    const pool = types.length ? types : (Object.values(Type) as Type[]);
    const t = Utils.randSeedItem(pool);
    const roll = Utils.randSeedInt(100);
    const amount = roll < 70 ? 5 : roll < 90 ? 7 : 10;
    return { type: t, amount };
  }

  static pickSkillPoints(): number { return 1; }
  static pickSkillTreeTokens(): number { return (Utils.randSeedInt(2) + 1); }

  static pickTeraAbilityWithType(champion: PlayableChampionData): { type: Type; ability: Abilities } | null {
    const ability = this.pickConditionalAbility(champion);
    if (!ability) return null;

    const types = this.getChampionTypes(champion);
    if (types.length === 0) return null;

    const selectedType = Utils.randSeedItem(types);
    return { type: selectedType, ability };
  }
  static pickSmittyAbility(champion: PlayableChampionData): Abilities {
    const pool = (champion.unlockedSmittyAbilities || []) as Abilities[];
    return Utils.randSeedItem(pool);
  }

  static pickSpecificMoveUpgrade(champion?: PlayableChampionData): { filterUpgrades: { moveUpgrades?: UpgradePath[]; moveAttributes?: string[]; types?: Type[] } } {
    const allowedGroups: Array<"path" | "attr" | "type"> = ["path"];
    if (champion?.unlockedMoveAttrUpgrades?.length) allowedGroups.push("attr");
    if (champion?.unlockedTypesMoveUpgrade?.length) allowedGroups.push("type");
    const group = Utils.randSeedItem(allowedGroups);
    if (group === "type") return { filterUpgrades: { types: (champion!.unlockedTypesMoveUpgrade || []).slice() } };
    if (group === "attr") {
      const attrs = (champion!.unlockedMoveAttrUpgrades || []).slice();
      if (attrs.length > 0) return { filterUpgrades: { moveAttributes: [Utils.randSeedItem(attrs)] } };
    }
    const pool = (champion?.unlockedMoveUpgrades?.length ? champion.unlockedMoveUpgrades : (Object.values(UpgradePath) as UpgradePath[]));
    return { filterUpgrades: { moveUpgrades: [Utils.randSeedItem(pool)] } };
  }

  static pickPassiveAbility(champion: PlayableChampionData): Abilities {
    return this.pickStandardAbility(champion);
  }

  static pickTypeBoosterType(champion: PlayableChampionData): Type {
    const types = champion.unlockedTypeBoosters?.length ? champion.unlockedTypeBoosters : this.getChampionTypes(champion);
    const fallback = (Object.values(Type) as Type[]);
    return Utils.randSeedItem(types && types.length ? types : fallback);
  }
  static pickEssenceWeight(champion: PlayableChampionData): { type: Type; weight: number } {

    const championTypes = this.getChampionTypes(champion);
    const keys = (champion as any).preferredEssenceWeights
      ? Object.keys((champion as any).preferredEssenceWeights).map(k => parseInt(k) as unknown as Type)
      : championTypes.length > 0 ? championTypes : (Object.values(Type) as Type[]);
    const type = Utils.randSeedItem(keys);
    const weight = ((champion as any).preferredEssenceWeights?.[type] as number) ?? (Utils.randSeedInt(4) + 1);
    return { type, weight };
  }

  static pickFusionSecondaryPriority(champion: PlayableChampionData): { types?: Type[]; species?: Species[] } {
    const pref = (champion as any).preferredFusionSecondary;
    if (pref && (Array.isArray(pref.types) || Array.isArray(pref.species))) {
      return { types: pref.types?.slice() || undefined, species: pref.species?.slice() || undefined } as any;
    }
    const championTypes = [champion.type1, champion.type2].filter(t => t !== undefined && t !== null) as Type[];
    let selectedTypes: Type[];

    if (championTypes.length === 0) {
      selectedTypes = [];
    } else if (championTypes.length === 1) {
      selectedTypes = championTypes;
    } else {

      const roll = Utils.randSeedInt(100);
      if (roll < 45) {
        selectedTypes = [championTypes[0]];
      } else if (roll < 90) {
        selectedTypes = [championTypes[1]];
      } else {
        selectedTypes = championTypes;
      }
    }

    return { types: selectedTypes.length ? selectedTypes : undefined } as any;
  }

private static getChampionStatPreferences(championData: PlayableChampionData): Stat[] {
    switch (championData.id) {
      case "brock": return [Stat.DEF, Stat.HP, Stat.ATK];
      case "misty": return [Stat.SPD, Stat.SPATK, Stat.ATK];
      case "red": return [Stat.ATK, Stat.SPATK, Stat.SPD];
      case "apollo":
      case "diana":
        return getTypeStatPreferences(championData.type1, championData.type2);
      default: return [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    }
  }

  private static getChampionTypeAbilities(championTypes: Type[]): Abilities[] {
    let abilities = getAbilitiesForTypes(championTypes).filter(a => this.isImplementedAbility(a));
    if (abilities.length) return abilities;
    const allAbilityIds = (Object.values(Abilities).filter((v) => typeof v === "number" && (v as number) < 311) as Abilities[])
      .filter(a => this.isImplementedAbility(a));
    if (!allAbilityIds.length) {
      return [Abilities.OVERGROW];
    }
    return [Utils.randSeedItem(allAbilityIds)];
  }
}