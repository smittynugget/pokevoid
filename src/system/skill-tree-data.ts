import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { QuestUnlockables, QuestUnlockData } from "#app/system/game-data.js";

export interface ActiveSkillTreeData {
  championId: string;
  runtimeType1?: Type;
  runtimeType2?: Type;
  treeLevel: number;
  maxVisibleDepth: number;
  depth1BountyPresent?: boolean;
  unlockedNodes: Set<string>;
  skillEffects: Map<string, any>;
  seed: number;
  selectedPokemon: { signature?: Species; general?: Species };
  selectedPokemonPicks?: Array<{ species: Species; isSignature: boolean }>;
  unlockedGlitchForms: string[];
  sessionQuestUnlockables?: Partial<Record<QuestUnlockables, { questUnlockData?: QuestUnlockData }>>;
  sessionModFormsUnlocked?: string[];
  sessionUniSmittyUnlocks?: string[];
  unlockedBranches: Set<string>;
  skillPoints: number;
  tokens: number;
  starterPokemon?: Species;
  catchRateBonusByType?: Partial<Record<Type, number>>;
  reviveChanceByType?: Partial<Record<Type, number>>;
  reviveChanceBySpecies?: Partial<Record<Species, number>>;
  essenceTypeWeights?: Partial<Record<Type, number>>;
  fusionPriorityChanceByType?: Partial<Record<Type, number>>;
  fusionPriorityChanceBySpecies?: Partial<Record<Species, number>>;
  legendaryEncounterChanceBySpecies?: Partial<Record<Species, number>>;
}

export interface SkillTreeNode {
  id: string;
  depth: number;
  position: { x: number; y: number };
  dependencies: string[];
  rarity: SkillTreeRarity;
  state: SkillTreeNodeState;
  rewardData: SkillTreeReward;
  name: string;
  description: string;
  cost: number;
  isLegendary: boolean;
  unlocked: boolean;
  isLevelLocked?: boolean;
  requiredUnlockLevel?: number;
  branchUnlockCost?: number;
  pendingRewardData?: SkillTreeReward;
  ringIndex?: number;
  ringSize?: number;
}

export enum SkillTreeRarity {
  COMMON = "common",
  GREAT = "great",
  ULTRA = "ultra",
  ROGUE = "rogue",
  MASTER = "master",
  LEGENDARY = "legendary"
}

export enum SkillTreeNodeState {
  LOCKED_HIDDEN = "locked-hidden",
  LOCKED_VISIBLE = "locked-visible",
  LOCKED_DETAILS = "locked-details",
  UNLOCKED = "unlocked"
}

export enum SkillTreeRewardType {

  SIGNATURE_POKEMON = "signature_pokemon",
  GENERAL_POKEMON = "general_pokemon",
  LEGENDARY_POKEMON = "legendary_pokemon",
  TM_FILTERED = "tm_filtered",
  XM_FILTERED = "xm_filtered",
  ABILITY_GRANT = "ability_grant",
  TRAINER_BOND_ABILITY = "trainer_bond_ability",
  TERA_ABILITY = "tera_ability",
  SMITTY_ABILITY = "smitty_ability",
  PASSIVE_ABILITY_GRANT = "passive_ability_grant",
  MOVE_UPGRADE_SPECIFIC = "move_upgrade_specific",
  STAT_BOOST = "stat_boost",
  MOVE_UPGRADE = "move_upgrade",
  MEGA_STONE = "mega_stone",
  DYNA_MUSHROOM = "dyna_mushroom",
  GLITCH_CHANGE = "glitch_change",
  TYPE_SWITCHER = "type_switcher",
  TYPE_BALL_FILTERED = "type_ball_filtered",
  TYPE_BOOSTER_ITEM = "type_booster_item",
  POKEMON_ALT_BUILD = "pokemon_alt_build",
  GLITCH_FORM_UNLOCK = "glitch_form_unlock",
  RANDOM_GLITCH_FORMS_FOR_RUN = "random_glitch_forms_for_run",
  PERMA_ITEM = "perma_item",
  ESSENCE_BUNDLE = "essence_bundle",
  ESSENCE_TYPE_WEIGHT = "essence_type_weight",
  FUSION_SECONDARY_PRIORITY = "fusion_secondary_priority",
  GOLDEN_POKEBALL = "golden_pokeball",
  MASTER_BALL = "master_ball",
  VOID_BALL = "void_ball",
  ROGUEBALL_RARITY_SELECT = "rogueball_rarity_select",
  MASTERBALL_RARITY_SELECT = "masterball_rarity_select",
  EGG_VOUCHER = "egg_voucher",
  MONEY_REWARD = "money_reward",
  PERMA_MONEY = "perma_money",

  HEALING_ITEMS = "healing_items",
  MEMORY_MUSHROOM = "memory_mushroom",
  BERRY_ITEMS = "berry_items",
  ABILITY_SWITCHER = "ability_switcher",
  GENERAL_ITEMS = "general_items",
  BATON_ITEM = "baton_item",
  PP_MAX_ITEM = "pp_max_item",
  ROGUE_BALL = "rogue_ball",
  SKILL_POINTS = "skill_points",
  SKILL_TREE_TOKENS = "skill_tree_tokens",
  CATCH_RATE_BONUS = "catch_rate_bonus",
  REVIVE_BOOST = "revive_boost",
  TERA_TYPE = "tera_type",
  PARTY_ABILITY_GRANT = "party_ability_grant",

  BOUNTY_SELECT = "bounty_select"
}

export interface SkillTreeReward {
  type: SkillTreeRewardType;
  data: any;
  immediate: boolean;
}

export interface RewardTooltipSections {
  summary: string;
  detail?: string;
  detailHeaderKey?: string;
  lore?: string;
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
  SKILL_TREE_STARTER_NODES = "skillTreeStarterNodes"
}