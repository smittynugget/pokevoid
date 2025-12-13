import { Type } from "#app/data/type";
import { TrainerType } from "#enums/trainer-type";
import { Species } from "#enums/species";
import { Abilities } from "#enums/abilities";
import { QuestUnlockables } from "#app/system/game-data";
import { FormChangeItem } from "#enums/form-change-items";
import { UpgradePath } from "#enums/upgrade-path";
import { Moves } from "#enums/moves";
import { PermaType } from "#app/modifier/perma-modifiers";
import { VoucherType } from "#app/system/voucher";
import { modifierTypes } from "#app/modifier/modifier-type";
import { PokemonAltBuildId } from "#app/data/pokemon-alt-buid";
import { SkillTreeRewardType } from "#app/system/skill-tree-data";

export type ChampionStatBoostId = string;

export interface ChampionUnlockRequirement {
  essenceRequirements: Array<{ type: Type; amount: number }>;
  totalEssenceRequirement: number;
  description: string | (() => string);
}

export interface ChampionSkillDef {
  category: SkillCategory;
  rewardType: SkillTreeRewardType;
  unlockLevel: number;
  prerequisites: {
    all?: string[];
    any?: string[];
  };
  unlockableId: number | string | ChampionStatBoostId | PokemonAltBuildId | UpgradePath | Abilities | FormChangeItem | Species | Moves;
  descriptionKey: string;
  requiredEssenceWeights?: Array<{ type: Type | Type[]; percent?: number; amount?: number }>;
}

export interface SkillUnlock {
  skillId: string;
  unlockedAt: number;
  level: number;
}

export interface ChampionLevelUpData {
  skill: ChampionSkillDef;
  level: number;
  timestamp: number;
}

export enum SkillCategory {
  TMS = "tms",
  XMS = "xms",
  MEGA_STONES = "megaStones",
  DYNA_MUSHROOMS = "dynaMushrooms",
  PERMA_ITEMS = "permaItems",
  GLITCH_FORMS = "glitchForms",
  ABILITY_POOL = "abilityPool",
  SMITTY_ABILITIES = "smittyAbilities",
  TRAINER_BOND_ABILITIES = "trainerBondAbilities",
  POKEMON_ALT_BUILDS = "pokemonAltBuilds",
  TERA_ABILITIES = "teraAbilities",
  MOVE_UPGRADES = "moveUpgrades",
  MOVE_UPGRADES_SPECIFIC = "moveUpgradesSpecific",
  SIGNATURE_POKEMON = "signaturePokemon",
  LEGENDARY_POKEMON = "legendaryPokemon",
  GENERAL_POKEMON = "generalPokemon",
  TYPE_SWITCHERS = "typeSwitchers",
  STAT_BOOSTS = "statBoosts",
  ESSENCE_BUNDLES = "essenceBundles",
  SKILL_POINTS = "skillPoints",
  SKILL_TREE_TOKENS = "skillTreeTokens",
  TYPE_BOOSTERS = "typeBoosters",
  POKEBALLS = "pokeballs",
  VOUCHERS = "vouchers",
  CATCHING = "catching",
  FUSION = "fusion",
  REVIVAL = "revival",
  PERMA_MONEY = "permaMoney",
  TERA_TYPES = "teraTypes",
  PASSIVE_ABILITIES = "passiveAbilities",
  RARITY_SELECT_ROGUE = "raritySelectRogue",
  RARITY_SELECT_MASTER = "raritySelectMaster",
  MONEY_REWARDS = "moneyRewards",
  ESSENCE_TYPE_WEIGHTS = "essenceTypeWeights",
  FUSION_PRIORITIES = "fusionPriorities",
  TERA_TYPE_REWARDS = "teraTypeRewards",
  GLITCH_CHANGE = "glitchChange",
  SKILL_TREE_STARTER_NODES = "skillTreeStarterNodes",
  HEALING_ITEMS = "healingItems",
  BERRY_ITEMS = "berryItems",
  MEMORY_MUSHROOM = "memoryMushroom",
  ABILITY_SWITCHER = "abilitySwitcher",
  PP_MAX_ITEM = "ppMaxItem",
  GENERAL_ITEMS = "generalItems",
  BATON_ITEM = "batonItem",
  ROGUE_BALL = "rogueBall",
}

export interface PlayableChampionData {
  id: string;
  level: number;
  levelEssence?: Partial<Record<Type, number>>;
  type1?: Type;
  type2?: Type;
  trainerType?: TrainerType;

  signaturePokemon: Species[];
  legendaryPokemon: Species[];
  pokemonGenerationFilter: number[];

  lockedSkills: Record<string, ChampionSkillDef>;
  unlockedSkills: Record<string, SkillUnlock>;

  unlockRequirements: ChampionUnlockRequirement;

  unlockedTMs: Moves[];
  unlockedXMs: Moves[];
  unlockedAbilities: Abilities[];
  unlockedSmittyAbilities: Abilities[];
  unlockedMegaStones: FormChangeItem[];
  unlockedMaxMushrooms?: boolean;
  unlockedTypeSwitchers: Type[];
  unlockedEssenceBundles: Type[];
  unlockedPermaItems: PermaType[];
  unlockedStatBoosts: ChampionStatBoostId[];
  unlockedAltBuilds: PokemonAltBuildId[];
  unlockedGlitchForms: string[];
  glitchFormUnlockableIds?: Record<string, QuestUnlockables>;
  unlockedConditionalAbilities: Abilities[];
  unlockedMoveUpgrades: UpgradePath[];
  unlockedMoveAttrUpgrades?: string[];
  unlockedTypesMoveUpgrade?: Type[];

  starterNodeUpgradesUnlocked?: number;

  unlockedTypeBoosters?: Type[];
  unlockedVoucherTiers?: VoucherType[];
  unlockedSpecificPermaModifiers?: (keyof typeof modifierTypes)[];

  preferredFusionSecondary?: { types?: Type[]; species?: Species[] };
  preferredEssenceWeights?: Partial<Record<Type, number>>;
  preferredTeraTypes?: Type[];
  additiveCatchRateBonusByType?: Partial<Record<Type, number>>;
  reviveBoostTargets?: { types?: Type[]; species?: Species[]; amount?: number };

  unlockedBallRaritySelect?: { rogue?: boolean; master?: boolean };
  unlockedGoldenPokeball?: boolean;
  unlockedMasterBall?: boolean;
  unlockedMoneyReward?: boolean;
  unlockedPermaMoney?: boolean;
  unlockedCatchRateTypes?: Type[];
  unlockedEssenceWeightTypes?: Type[];
  unlockedTeraTypes?: Type[];

  unlockedHealingItems?: boolean;
  unlockedMemoryMushroom?: boolean;
  unlockedBerries?: boolean;
  unlockedAbilitySwitchers?: boolean;
  unlockedGeneralItems?: boolean;
  unlockedBaton?: boolean;
  unlockedPPMax?: boolean;
  unlockedRogueBall?: boolean;

  isUnlocked?: boolean;
  unlockCommit?: Partial<Record<Type, number>>;
}