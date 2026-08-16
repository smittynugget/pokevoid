import { Abilities } from "#enums/abilities";
import { Biome } from "#enums/biome";
import { EggTier } from "#enums/egg-type";
import { Moves } from "#enums/moves";
import { PokeballType } from "#enums/pokeball";
import { Species } from "#enums/species";
import { StatusEffect } from "#enums/status-effect";
import { TimeOfDay } from "#enums/time-of-day";
import { VariantTier } from "#enums/variant-tiers";
import { WeatherType } from "#enums/weather-type";
import { type PokeballCounts } from "./battle-scene";
import { Gender } from "./data/gender";
import { Type } from "./data/type";
import { allSpecies } from "./data/pokemon-species";
import { Variant } from "./data/variant";
import { type ModifierOverride, modifierTypes } from "./modifier/modifier-type";
import { SkillTreeRewardType } from "./system/skill-tree-data";

export const DEBUG_BYPASS_CHAMPION_UNLOCK = false;
export const DEBUG_FORCE_LOCK_CHAMPIONS: string[] = [];
export const DEBUG_FORCE_TRAINER_CORRUPTED = false;
export const DEBUG_FORCE_MODIFIER_ITEMS_ENABLED = false;
export const DEBUG_FORCE_ALL_BATTLE_ICONS = false;
export const DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE = false;
export const DEBUG_TEST_SLIDESHOW_CUTSCENE = false;
export const DEBUG_TEST_RUN_END_SUMMARY = false;
export const DEBUG_FORCE_SMITOM_TUTORIAL = false;
export const DEBUG_YU_VISUAL_TUNING = false;
export const DEBUG_SKILL_TREE_FORCE_REWARD_TYPE: SkillTreeRewardType | undefined = undefined;
const overrides = {
  FORCE_DUELMON_RANK_UP_OVERRIDE: false,
  FORCE_RANDOM_RANK_UP_OVERRIDE: false,
  MODIFIER_SELECT_DEBUG_OVERRIDE: false,
  DEBUG_TUTORIAL_FLOW_OVERRIDE: false,
  DEBUG_PEGASUS_BATTLE_OVERRIDE: false,
  DEBUG_SMITTY_BATTLE_OVERRIDE: false,
  DEBUG_WAVE35_SMITOM_TIP_OVERRIDE: false,
  DEBUG_WAVE100_LEVEL1_OVERRIDE: false,
  OPP_ONE_POKEMON: false,
  MOVESET_OVERRIDE: [],
} satisfies Partial<InstanceType<typeof DefaultOverrides>>;
class DefaultOverrides {
  readonly SEED_OVERRIDE: string = "";
  readonly WEATHER_OVERRIDE: WeatherType = WeatherType.NONE;
  readonly BATTLE_TYPE_OVERRIDE: "double" | "single" | null = null;
  readonly STARTING_WAVE_OVERRIDE: number = 0;
  readonly STARTING_BATTLE_PATH_WAVE_OVERRIDE: number = 0;
  readonly STARTING_SELECTED_PATH_OVERRIDE: string = "";
  readonly WAIVE_ROLL_FEE_OVERRIDE: boolean = false;
  readonly WAIVE_SHOP_FEES_OVERRIDE: boolean = false;
  readonly STARTING_BIOME_OVERRIDE: Biome = Biome.TOWN;
  readonly BOSS_WAVE_OVERRIDE: number = 0;
  readonly ARENA_TINT_OVERRIDE: TimeOfDay | null = null;
  readonly XP_MULTIPLIER_OVERRIDE: number | null = null;
  readonly NEVER_CRIT_OVERRIDE: boolean = false;
  readonly STARTING_MONEY_OVERRIDE: number = 0;
  readonly FREE_CANDY_UPGRADE_OVERRIDE: boolean = false;
  readonly BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE: boolean = false;
  readonly FORCE_DUELMON_ENCOUNTERS_OVERRIDE: boolean = false;
  readonly STARTER_SELECT_TWEAK_TOOL_OVERRIDE: boolean = false;
  readonly FORCE_DUELMON_RANK_UP_OVERRIDE: boolean = false;
  readonly FORCE_RANDOM_RANK_UP_OVERRIDE: boolean = false;
  readonly RANDOM_RANK_UP_CHANCE_DENOMINATOR_OVERRIDE: number = 0;
  readonly SKILL_TREE_RANDOM_GLITCH_PREREQ_REQUIRED_COUNT_OVERRIDE: number = 0;
  readonly BYPASS_RANDOM_RANK_UP_BAND_OVERRIDE: boolean = false;
  readonly FORCE_EVOLUTION_OVERRIDE: boolean = false;
  readonly FORCE_YU_MOVE_FLAG_OVERRIDE: boolean = false;
  readonly FORCE_YU_MOVE_CHECK_OVERRIDE: boolean = false;
  readonly FORCE_COLLECTOR_SHOP_OVERRIDE: boolean = false;
  readonly POKEBALL_OVERRIDE: { active: boolean; pokeballs: PokeballCounts } = {
  active: false,
  pokeballs: {
    [PokeballType.POKEBALL]: 0,
    [PokeballType.GREAT_BALL]: 0,
    [PokeballType.ULTRA_BALL]: 5,
    [PokeballType.TYPE_BALL]: 0,
    [PokeballType.ROGUE_BALL]: 0,
    [PokeballType.MASTER_BALL]: 0,
    [PokeballType.VOID_BALL]: 0,
    },
};
  readonly TYPE_BALL_OVERRIDE: { active: boolean; typeBalls: { [typeId: number]: number } } = {
    active: false,
    typeBalls: {},
  };
  readonly STARTER_FORM_OVERRIDES: Partial<Record<Species, number>> = {};
  readonly STARTING_LEVEL_OVERRIDE: number = 0;

  readonly STARTER_SPECIES_OVERRIDE: Species | number = 0;
  readonly ABILITY_OVERRIDE: Abilities = Abilities.NONE;
  readonly PASSIVE_ABILITY_OVERRIDE: Abilities = Abilities.NONE;
  readonly STATUS_OVERRIDE: StatusEffect = StatusEffect.NONE;
  readonly GENDER_OVERRIDE: Gender | null = null;
  readonly MOVESET_OVERRIDE: Array<Moves> = [];
  readonly SHINY_OVERRIDE: boolean = false;
  readonly VARIANT_OVERRIDE: Variant = 0;
  readonly STARTER_FUSION_SPECIES_OVERRIDE: Species | number = 0;
  readonly OPP_SPECIES_OVERRIDE: Species | number = 0;
  readonly OPP_LEVEL_OVERRIDE: number = 0;
  readonly OPP_ONE_POKEMON: boolean = false;
  readonly OPP_ABILITY_OVERRIDE: Abilities = Abilities.NONE;
  readonly OPP_PASSIVE_ABILITY_OVERRIDE: Abilities = Abilities.NONE;
  readonly OPP_STATUS_OVERRIDE: StatusEffect = StatusEffect.NONE;
  readonly OPP_GENDER_OVERRIDE: Gender | null = null;
  readonly OPP_MOVESET_OVERRIDE: Array<Moves> = [];
  readonly OPP_SHINY_OVERRIDE: boolean = false;
  readonly OPP_VARIANT_OVERRIDE: Variant = 0;
  readonly OPP_IVS_OVERRIDE: number | number[] = [];
  readonly OPP_FORM_OVERRIDES: Partial<Record<Species, number>> = {};
  readonly OPP_FUSION_SPECIES_OVERRIDE: Species | number = 0;
  readonly EGG_IMMEDIATE_HATCH_OVERRIDE: boolean = false;
  readonly EGG_TIER_OVERRIDE: EggTier | null = null;
  readonly EGG_SHINY_OVERRIDE: boolean = false;
  readonly EGG_VARIANT_OVERRIDE: VariantTier | null = null;
  readonly EGG_FREE_GACHA_PULLS_OVERRIDE: boolean = false;
  readonly EGG_GACHA_PULL_COUNT_OVERRIDE: number = 0;
  readonly STARTING_EGGS_COUNT_OVERRIDE: number = 0;
  readonly STARTING_MODIFIER_OVERRIDE: ModifierOverride[] = [];

  readonly OPP_MODIFIER_OVERRIDE: ModifierOverride[] = [];
  readonly STARTING_HELD_ITEMS_OVERRIDE: ModifierOverride[] = [];

  readonly OPP_HELD_ITEMS_OVERRIDE: ModifierOverride[] = [];

  readonly ITEM_REWARD_OVERRIDE: ModifierOverride[] = [];

  readonly SMITTY_FINAL_BATTLE_CHANCE_OVERRIDE: number | null = null;
  readonly BATTLE_PATH_BYPASS_NODE_VALIDATION_OVERRIDE: boolean = false;
  readonly BATTLE_PATH_SHOW_ALL_WAVES_OVERRIDE: boolean = false;

  readonly FORCE_CHALLENGE_PATH_WAVE_OVERRIDE: number | null = null;

  readonly CHALLENGE_REWARD_OUTCOME_OVERRIDE: number = -1;

  readonly FORCE_TUTORIAL_SHOW_OVERRIDE: boolean = false;

  readonly FAKE_PREVIOUS_VERSION_OVERRIDE: boolean = false;

  readonly ALWAYS_SAVE_REWARD_OVERRIDE: boolean = false;
  readonly SKILL_TREE_DEBUG_CONTROLS_OVERRIDE: boolean = false;
  readonly SKILL_TREE_ZOOM_UI_OVERRIDE: boolean = false;
  readonly CHAMP_RECOLOR_FORCE_TYPES_OVERRIDE: { active: boolean; t1: Type; t2?: Type } = {
    active: false,
    t1: Type.STEEL,
    t2: Type.GHOST,
  };
  readonly DEBUG_IOS_MODE: boolean = false;
  readonly DEBUG_SAVE_TRACE: boolean = false;
  readonly HIDE_DRIVE_SETTINGS_OVERRIDE: boolean = true;
  readonly DEBUG_GRANT_ALL_ESSENCE: boolean = false;
  readonly DEBUG_GRANT_ALL_ESSENCE_AMOUNT: number = 0;
  readonly DEBUG_ESSENCE_TOOLTIP_GEN1_AMOUNT: number = 0;

  readonly FORCE_UNISMITTY_UNLOCK_ON_SMITTY_VICTORY: boolean = false;

  readonly DEBUG_SHOP_FORCE_ALL_ITEMS: boolean = false;
  readonly MODIFIER_SELECT_DEBUG_OVERRIDE: boolean = false;
  readonly DEBUG_TUTORIAL_FLOW_OVERRIDE: boolean = false;
  readonly DEBUG_PEGASUS_BATTLE_OVERRIDE: boolean = false;
  readonly DEBUG_SMITTY_BATTLE_OVERRIDE: boolean = false;
  readonly DEBUG_WAVE35_SMITOM_TIP_OVERRIDE: boolean = false;
  readonly DEBUG_WAVE100_LEVEL1_OVERRIDE: boolean = false;
  readonly SKIP_TO_STARTER_SELECT_OVERRIDE: boolean = false;

  readonly DEBUG_LOCALE_CYCLE_OVERRIDE: boolean = false;

  readonly FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE: boolean = false;
  readonly FORCE_BOUNTY_COMPLETION_OVERRIDE: boolean = false;
  readonly SKILL_TREE_DEFAULT_SKILL_POINTS_OVERRIDE: number | null = null;
  readonly DEBUG_EMULATE_FUSION: Species | 0 = 0;
  readonly DEBUG_EMULATE_SHINY: boolean = false;
  readonly DEBUG_EMULATE_DOUBLE_SHINY: boolean = false;
  readonly DEBUG_EMULATE_TERA_TYPE: Type | null = null;
  readonly DEBUG_EMULATE_RANK: number = 0;
  readonly DEBUG_EMULATE_GLITCH_FORM: boolean = false;
  readonly DEBUG_EMULATE_CAUGHT: boolean = false;
  readonly DEBUG_EMULATE_CHAMPION_RIBBON: boolean = false;
  readonly DEBUG_EMULATE_RANDOM_PARTY_COMBOS: boolean = false;
}

export const defaultOverrides = new DefaultOverrides();

export default {
  ...defaultOverrides,
  ...overrides
} satisfies InstanceType<typeof DefaultOverrides>;