import { Species } from "#enums/species";
import { Stat } from "#enums/stat";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Type } from "#app/data/type";

export enum PokemonAltBuildId {
  ONIX_CRYSTAL_LEVIATHAN = "onix_crystal_leviathan",

  ONIX_BROCK_SIGNATURE = "onix_brock_signature",
  GEODUDE_BROCK_SIGNATURE = "geodude_brock_signature",

  STARYU_MISTY_SIGNATURE = "staryu_misty_signature",
  PSYDUCK_MISTY_SIGNATURE = "psyduck_misty_signature",
  MAGIKARP_MISTY_SIGNATURE = "magikarp_misty_signature",
  POLIWAG_MISTY_SIGNATURE = "poliwag_misty_signature",
  AZURILL_MISTY_SIGNATURE = "azurill_misty_signature",
  GOLDEEN_MISTY_SIGNATURE = "goldeen_misty_signature",
  HORSEA_MISTY_SIGNATURE = "horsea_misty_signature",
  TOGEPI_MISTY_SIGNATURE = "togepi_misty_signature",
  CORSOLA_MISTY_SIGNATURE = "corsola_misty_signature",
  LUVDISC_MISTY_SIGNATURE = "luvdisc_misty_signature",
  CLAUNCHER_MISTY_SIGNATURE = "clauncher_misty_signature",

  STARYU_CHRONOS_GEAR = "staryu_chronos_gear",
  MAGIKARP_SPLASH_TYRANT = "magikarp_splash_tyrant",
  PSYDUCK_KAPPA_QUACK = "psyduck_kappa_quack",
  POLIWAG_LIGHTNING_DRUM = "poliwag_lightning_drum",
  AZURILL_BOUNCE_CHAMPION = "azurill_bounce_champion",
  GOLDEEN_PIERCING_STINGER = "goldeen_piercing_stinger",
  HORSEA_FIREBALL_SEAHORSE = "horsea_fireball_seahorse",
  TOGEPI_EGGSHELL_FORTRESS = "togepi_eggshell_fortress",
  CORSOLA_TOXIC_CORAL = "corsola_toxic_coral",
  LUVDISC_HEARTBREAKER = "luvdisc_heartbreaker",
  CLAUNCHER_BUSTER_DRAGON_BLASTER = "clauncher_buster_dragon_blaster",

  VULPIX_BROCK_SIGNATURE = "vulpix_brock_signature",
  ZUBAT_BROCK_SIGNATURE = "zubat_brock_signature",
  BONSLY_BROCK_SIGNATURE = "bonsly_brock_signature",
  MUDKIP_BROCK_SIGNATURE = "mudkip_brock_signature",
  PINECO_BROCK_SIGNATURE = "pineco_brock_signature",
  CROAGUNK_BROCK_SIGNATURE = "croagunk_brock_signature",
  HAPPINY_BROCK_SIGNATURE = "happiny_brock_signature",
  LOTAD_BROCK_SIGNATURE = "lotad_brock_signature",
  COMFEY_BROCK_SIGNATURE = "comfey_brock_signature",

  GEODUDE_PHANTOM_FIST = "geodude_phantom_fist",
  VULPIX_FLAMING_FOREST_SPIRIT = "vulpix_flaming_forest_spirit",
  ZUBAT_VAMPIRIC_FIEND = "zubat_vampiric_fiend",
  BONSLY_TEAR_DROP = "bonsly_tear_drop",
  MUDKIP_STONE_SKINNED_SALAMANDER = "mudkip_stone_skinned_salamander",
  PINECO_IRON_PLATED_GRENADE = "pineco_iron_plated_grenade",
  CROAGUNK_JESTER_OF_PESTILENCE = "croagunk_jester_of_pestilence",
  HAPPINY_PINK_FORTRESS = "happiny_pink_fortress",
  LOTAD_SHADOW_LILY = "lotad_shadow_lily",
  COMFEY_AQUA_BLOOM = "comfey_aqua_bloom",

  RIOLU_APOLLO_DIANA_SIGNATURE = "riolu_apollo_diana_signature",
  SOLROCK_APOLLO_DIANA_SIGNATURE = "solrock_apollo_diana_signature",
  LUNATONE_APOLLO_DIANA_SIGNATURE = "lunatone_apollo_diana_signature",
  LARVESTA_APOLLO_DIANA_SIGNATURE = "larvesta_apollo_diana_signature",
  SWABLU_APOLLO_DIANA_SIGNATURE = "swablu_apollo_diana_signature",
  CASTFORM_APOLLO_DIANA_SIGNATURE = "castform_apollo_diana_signature",
  LITWICK_APOLLO_DIANA_SIGNATURE = "litwick_apollo_diana_signature",
  EEVEE_APOLLO_DIANA_SIGNATURE = "eevee_apollo_diana_signature",
  TEDDIURSA_APOLLO_DIANA_SIGNATURE = "teddiursa_apollo_diana_signature",
  CLEFFA_APOLLO_DIANA_SIGNATURE = "cleffa_apollo_diana_signature",
  SUNKERN_APOLLO_DIANA_SIGNATURE = "sunkern_apollo_diana_signature",

  RIOLU_SHADOW_WARRIOR = "riolu_shadow_warrior",
  SOLROCK_VOID_CONSTELLATION = "solrock_void_constellation",
  LUNATONE_DREAM_WEAVER = "lunatone_dream_weaver",
  LARVESTA_TOXIC_SPINNER = "larvesta_toxic_spinner",
  SWABLU_FROST_NIMBUS = "swablu_frost_nimbus",
  CASTFORM_DUST_DEVIL = "castform_dust_devil",
  LITWICK_WYRMFLAME = "litwick_wyrmflame",
  EEVEE_UNTAMED_SPIRIT = "eevee_untamed_spirit",
  TEDDIURSA_SWEET_TOOTH = "teddiursa_sweet_tooth",
  CLEFFA_METEORIC_CORE = "cleffa_meteoric_core",
  SUNKERN_PLASMA_SPROUT = "sunkern_plasma_sprout",

  VOLTORB_SURGE_SIGNATURE = "voltorb_surge_signature",
  PIKACHU_SURGE_SIGNATURE = "pikachu_surge_signature",
  ELECTABUZZ_SURGE_SIGNATURE = "electabuzz_surge_signature"
}

export interface AltBuildColorPalette {
  targetPalette: string[];
  darkPalette?: string[];
  blendMode?: 'replace' | 'overlay' | 'multiply' | 'grayscale_overlay';
  rankProgression?: {
    hueShift?: number;
    saturationScale?: number;
    lightnessAdjust?: number;
    type?: 'linear' | 'exponential' | 'milestone';
  };
}

export interface PokemonAltBuildDefinition {
  id: PokemonAltBuildId;
  species?: Species;
  rank?: number;
  statFocus: [Stat, Stat] | [Stat, Stat, Stat];
  abilityChanges: [Abilities?, Abilities?, Abilities?];
  passiveAbilityChange?: Abilities;
  finalAbilityReplacements?: [Abilities?, Abilities?, Abilities?];
  finalPassive?: Abilities;
  moveReplacements: Partial<Record<number, Moves>>;
  typeChanges?: [Type?, Type?];
  preventEvolution?: boolean;
  prerequisiteBuilds?: PokemonAltBuildId[];
  spriteVariant?: string;
  spriteColorPalette?: AltBuildColorPalette;
}

export const POKEMON_ALT_BUILDS: Record<PokemonAltBuildId, PokemonAltBuildDefinition> = {
  [PokemonAltBuildId.ONIX_CRYSTAL_LEVIATHAN]: {
    id: PokemonAltBuildId.ONIX_CRYSTAL_LEVIATHAN,
    species: Species.ONIX,
    rank: 1,
    statFocus: [Stat.HP, Stat.SPDEF],
    abilityChanges: [Abilities.ICE_SCALES, Abilities.REFRIGERATE, Abilities.ICE_BODY],
    passiveAbilityChange: Abilities.SNOW_WARNING,
    finalAbilityReplacements: [Abilities.ICE_SCALES, Abilities.REFRIGERATE, Abilities.MADE_OF_ICE],
    moveReplacements: {
      1: Moves.BIND,
      2: Moves.TACKLE,
      3: Moves.ROCK_THROW,
      5: Moves.POWDER_SNOW,
      8: Moves.HARDEN,
      10: Moves.ICY_WIND,
      13: Moves.ROCK_TOMB,
      15: Moves.MIST,
      18: Moves.ANCIENT_POWER,
      20: Moves.AURORA_BEAM,
      23: Moves.IRON_DEFENSE,
      25: Moves.ROCK_SLIDE,
      28: Moves.ICE_BEAM,
      30: Moves.REFLECT,
      33: Moves.STONE_EDGE,
      35: Moves.BODY_SLAM,
      38: Moves.BLIZZARD,
      40: Moves.RECOVER,
      43: Moves.FREEZE_DRY,
      45: Moves.DIAMOND_STORM,
      48: Moves.SHEER_COLD,
      50: Moves.EXPLOSION,
      53: Moves.ICICLE_CRASH,
      55: Moves.HEAD_SMASH,
      60: Moves.GLACIAL_LANCE
    },
    typeChanges: [Type.ICE, Type.ROCK],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.ONIX_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: [
        "#4A90E2",
        "#87CEEB",
        "#1E90FF",
        "#B0E0E6"
      ],
      darkPalette: [
        "#2A5A8E",
        "#5599BB",
        "#1260CC",
        "#7AABBF"
      ],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.ONIX_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.ONIX_BROCK_SIGNATURE,
    species: Species.ONIX,
    rank: 0,
    statFocus: [Stat.DEF, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.GEODUDE_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.GEODUDE_BROCK_SIGNATURE,
    species: Species.GEODUDE,
    rank: 0,
    statFocus: [Stat.DEF, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.STARYU_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.STARYU_MISTY_SIGNATURE,
    species: Species.STARYU,
    rank: 0,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.PSYDUCK_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.PSYDUCK_MISTY_SIGNATURE,
    species: Species.PSYDUCK,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPDEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.MAGIKARP_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.MAGIKARP_MISTY_SIGNATURE,
    species: Species.MAGIKARP,
    rank: 0,
    statFocus: [Stat.ATK, Stat.HP],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.POLIWAG_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.POLIWAG_MISTY_SIGNATURE,
    species: Species.POLIWAG,
    rank: 0,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.AZURILL_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.AZURILL_MISTY_SIGNATURE,
    species: Species.AZURILL,
    rank: 0,
    statFocus: [Stat.HP, Stat.DEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.GOLDEEN_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.GOLDEEN_MISTY_SIGNATURE,
    species: Species.GOLDEEN,
    rank: 0,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.HORSEA_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.HORSEA_MISTY_SIGNATURE,
    species: Species.HORSEA,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.TOGEPI_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.TOGEPI_MISTY_SIGNATURE,
    species: Species.TOGEPI,
    rank: 0,
    statFocus: [Stat.DEF, Stat.HP],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.CORSOLA_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.CORSOLA_MISTY_SIGNATURE,
    species: Species.CORSOLA,
    rank: 0,
    statFocus: [Stat.SPDEF, Stat.HP],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.LUVDISC_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.LUVDISC_MISTY_SIGNATURE,
    species: Species.LUVDISC,
    rank: 0,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.CLAUNCHER_MISTY_SIGNATURE]: {
    id: PokemonAltBuildId.CLAUNCHER_MISTY_SIGNATURE,
    species: Species.CLAUNCHER,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.VULPIX_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.VULPIX_BROCK_SIGNATURE,
    species: Species.VULPIX,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.ZUBAT_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.ZUBAT_BROCK_SIGNATURE,
    species: Species.ZUBAT,
    rank: 0,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.BONSLY_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.BONSLY_BROCK_SIGNATURE,
    species: Species.BONSLY,
    rank: 0,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.MUDKIP_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.MUDKIP_BROCK_SIGNATURE,
    species: Species.MUDKIP,
    rank: 0,
    statFocus: [Stat.DEF, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.PINECO_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.PINECO_BROCK_SIGNATURE,
    species: Species.PINECO,
    rank: 0,
    statFocus: [Stat.DEF, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.CROAGUNK_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.CROAGUNK_BROCK_SIGNATURE,
    species: Species.CROAGUNK,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.HAPPINY_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.HAPPINY_BROCK_SIGNATURE,
    species: Species.HAPPINY,
    rank: 0,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.LOTAD_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.LOTAD_BROCK_SIGNATURE,
    species: Species.LOTAD,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.COMFEY_BROCK_SIGNATURE]: {
    id: PokemonAltBuildId.COMFEY_BROCK_SIGNATURE,
    species: Species.COMFEY,
    rank: 0,
    statFocus: [Stat.SPDEF, Stat.HP],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE,
    species: Species.RIOLU,
    rank: 0,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE,
    species: Species.SOLROCK,
    rank: 0,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE,
    species: Species.LUNATONE,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPDEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE,
    species: Species.LARVESTA,
    rank: 0,
    statFocus: [Stat.DEF, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE,
    species: Species.SWABLU,
    rank: 0,
    statFocus: [Stat.SPDEF, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE,
    species: Species.CASTFORM,
    rank: 0,
    statFocus: [Stat.SPD, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE,
    species: Species.LITWICK,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.ATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE,
    species: Species.EEVEE,
    rank: 0,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE,
    species: Species.TEDDIURSA,
    rank: 0,
    statFocus: [Stat.ATK, Stat.HP],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE,
    species: Species.CLEFFA,
    rank: 0,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE]: {
    id: PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE,
    species: Species.SUNKERN,
    rank: 0,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [undefined, undefined, undefined],
    moveReplacements: {}
  },

  [PokemonAltBuildId.STARYU_CHRONOS_GEAR]: {
    id: PokemonAltBuildId.STARYU_CHRONOS_GEAR,
    species: Species.STARYU,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPATK],
    abilityChanges: [Abilities.RAIN_DISH, Abilities.FILTER, Abilities.LIGHTNING_ROD],
    finalAbilityReplacements: [Abilities.RAIN_DISH, Abilities.NEW_ADAPTION, Abilities.LIGHTNING_ROD],
    passiveAbilityChange: Abilities.DRIZZLE,
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.RAPID_SPIN,
      8: Moves.CONFUSE_RAY,
      10: Moves.MIRROR_SHOT,
      13: Moves.BUBBLE_BEAM,
      15: Moves.IRON_DEFENSE,
      18: Moves.PSYBEAM,
      20: Moves.FLASH_CANNON,
      23: Moves.BRINE,
      25: Moves.LIGHT_SCREEN,
      28: Moves.STEEL_BEAM,
      30: Moves.COSMIC_POWER,
      33: Moves.SCALD,
      35: Moves.TRICK_ROOM,
      38: Moves.POWER_GEM,
      40: Moves.RECOVER,
      43: Moves.HYDRO_PUMP,
      45: Moves.AUTOTOMIZE,
      48: Moves.METEOR_BEAM,
      50: Moves.RAIN_DANCE,
      53: Moves.FLASH_CANNON,
      55: Moves.DOOM_DESIRE,
      60: Moves.STEEL_ROLLER
    },
    typeChanges: [Type.STEEL, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.STARYU_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#C0C0C0", "#B8B8B8", "#A8A8A8", "#D0D0D0"],
      darkPalette: ["#808080", "#787878", "#686868", "#909090"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.2,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.MAGIKARP_SPLASH_TYRANT]: {
    id: PokemonAltBuildId.MAGIKARP_SPLASH_TYRANT,
    species: Species.MAGIKARP,
    rank: 1,
    statFocus: [Stat.ATK, Stat.HP],
    abilityChanges: [Abilities.SCRAPPY, Abilities.MOXIE, Abilities.TORRENT],
    passiveAbilityChange: Abilities.INTIMIDATE,
    finalAbilityReplacements: [Abilities.CONQUEROR_HAKI, Abilities.MOXIE, Abilities.TORRENT],
    moveReplacements: {
      1: Moves.SPLASH,
      5: Moves.ROCK_SMASH,
      8: Moves.LOW_KICK,
      10: Moves.SWIFT,
      13: Moves.REVENGE,
      15: Moves.WATERFALL,
      18: Moves.DETECT,
      20: Moves.BULK_UP,
      23: Moves.BRICK_BREAK,
      25: Moves.AQUA_TAIL,
      28: Moves.DRAIN_PUNCH,
      30: Moves.LIQUIDATION,
      33: Moves.COACHING,
      35: Moves.DOUBLE_EDGE,
      38: Moves.AURA_SPHERE,
      40: Moves.WAVE_CRASH,
      43: Moves.HIGH_JUMP_KICK,
      45: Moves.BELLY_DRUM,
      48: Moves.SUPERPOWER,
      50: Moves.FLIP_TURN,
      53: Moves.CLOSE_COMBAT,
      55: Moves.HEAD_SMASH,
      60: Moves.FINAL_GAMBIT
    },
    typeChanges: [Type.WATER, Type.FIGHTING],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.MAGIKARP_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#4169E1", "#FF8C00", "#1E90FF", "#FFA500"],
      darkPalette: ["#1E3A8A", "#CC7000", "#0D4A8A", "#CC8400"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.PSYDUCK_KAPPA_QUACK]: {
    id: PokemonAltBuildId.PSYDUCK_KAPPA_QUACK,
    species: Species.PSYDUCK,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.PICKPOCKET, Abilities.SHADOW_TAG, Abilities.SAP_SIPPER],
    passiveAbilityChange: Abilities.HEALTHY_SOAK,
    finalAbilityReplacements: [Abilities.PICKPOCKET, Abilities.DEADLY_BRINE, Abilities.SAP_SIPPER],
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.CONFUSION,
      8: Moves.SHADOW_SNEAK,
      10: Moves.CONFUSE_RAY,
      13: Moves.WATER_PULSE,
      15: Moves.HEX,
      18: Moves.PSYBEAM,
      20: Moves.SHADOW_BALL,
      23: Moves.SOAK,
      25: Moves.SURF,
      28: Moves.NASTY_PLOT,
      30: Moves.NIGHT_SHADE,
      33: Moves.PSYCHIC,
      35: Moves.PHANTOM_FORCE,
      38: Moves.HYDRO_PUMP,
      40: Moves.DESTINY_BOND,
      43: Moves.MOONGEIST_BEAM,
      45: Moves.TRICK_ROOM,
      48: Moves.WILL_O_WISP,
      50: Moves.POLTERGEIST,
      53: Moves.SHADOW_FORCE,
      55: Moves.PERISH_SONG,
      60: Moves.ASTRAL_BARRAGE
    },
    typeChanges: [Type.WATER, Type.GHOST],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.PSYDUCK_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#228B22", "#32CD32", "#90EE90", "#00FA9A"],
      darkPalette: ["#0F5F0F", "#1A8A1A", "#4D9F4D", "#00A060"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.POLIWAG_LIGHTNING_DRUM]: {
    id: PokemonAltBuildId.POLIWAG_LIGHTNING_DRUM,
    species: Species.POLIWAG,
    rank: 1,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [Abilities.GALVANIZE, Abilities.SWIFT_SWIM, Abilities.MOTOR_DRIVE],
    passiveAbilityChange: Abilities.REGENERATOR,
    finalAbilityReplacements: [Abilities.GALVANIZE, Abilities.SWIFT_SWIM, Abilities.RAPPING_RAMPAGE],
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.CHARGE,
      8: Moves.THUNDER_SHOCK,
      10: Moves.BODY_SLAM,
      13: Moves.CHARGE_BEAM,
      15: Moves.BUBBLE_BEAM,
      18: Moves.TRI_ATTACK,
      20: Moves.THUNDERBOLT,
      23: Moves.ROUND,
      25: Moves.DISCHARGE,
      28: Moves.WEATHER_BALL,
      30: Moves.RAIN_DANCE,
      33: Moves.SURF,
      35: Moves.PARABOLIC_CHARGE,
      38: Moves.HYPER_VOICE,
      40: Moves.HYDRO_PUMP,
      43: Moves.VOLT_SWITCH,
      45: Moves.RISING_VOLTAGE,
      48: Moves.THUNDER,
      50: Moves.BOOMBURST,
      53: Moves.EXPLOSION,
      55: Moves.HYPER_BEAM,
      60: Moves.GIGA_IMPACT
    },
    typeChanges: [Type.ELECTRIC, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.POLIWAG_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#FFD700", "#FFFF00", "#F0E68C", "#FFF44F"],
      darkPalette: ["#CCA700", "#CCCC00", "#C0B66C", "#CCC43F"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.AZURILL_BOUNCE_CHAMPION]: {
    id: PokemonAltBuildId.AZURILL_BOUNCE_CHAMPION,
    species: Species.AZURILL,
    rank: 1,
    statFocus: [Stat.HP, Stat.DEF],
    abilityChanges: [Abilities.AERILATE, Abilities.PIXILATE, Abilities.CHAMPION],
    passiveAbilityChange: Abilities.HUGE_POWER,
    finalAbilityReplacements: [Abilities.AERILATE, Abilities.BOUNCE_BACK, Abilities.CHAMPION],
    moveReplacements: {
      1: Moves.TACKLE,
      5: Moves.DEFENSE_CURL,
      8: Moves.BOUNCE,
      10: Moves.BODY_SLAM,
      13: Moves.PLAY_ROUGH,
      15: Moves.ROLLOUT,
      18: Moves.FACADE,
      20: Moves.CHARM,
      23: Moves.DOUBLE_EDGE,
      25: Moves.WISH,
      28: Moves.ACROBATICS,
      30: Moves.MOONBLAST,
      33: Moves.HYPER_VOICE,
      35: Moves.BRAVE_BIRD,
      38: Moves.SPIRIT_BREAK,
      40: Moves.RETURN,
      43: Moves.BODY_PRESS,
      45: Moves.DAZZLING_GLEAM,
      48: Moves.BOOMBURST,
      50: Moves.DUAL_WINGBEAT,
      53: Moves.LAST_RESORT,
      55: Moves.EXPLOSION,
      60: Moves.GIGA_IMPACT
    },
    typeChanges: [Type.FLYING, Type.FAIRY],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.AZURILL_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#87CEEB", "#FFB6C1", "#ADD8E6", "#FFC0CB"],
      darkPalette: ["#5799BB", "#CC86A1", "#7DA8B6", "#CC909B"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.GOLDEEN_PIERCING_STINGER]: {
    id: PokemonAltBuildId.GOLDEEN_PIERCING_STINGER,
    species: Species.GOLDEEN,
    rank: 1,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [Abilities.SHEER_FORCE, Abilities.SWARM, Abilities.TECHNICIAN],
    passiveAbilityChange: Abilities.SNIPER,
    finalAbilityReplacements: [Abilities.SHEER_FORCE, Abilities.INSECT_INFUSION, Abilities.TECHNICIAN],
    moveReplacements: {
      1: Moves.PECK,
      5: Moves.TWINEEDLE,
      8: Moves.FURY_ATTACK,
      10: Moves.PIN_MISSILE,
      13: Moves.AQUA_JET,
      15: Moves.FELL_STINGER,
      18: Moves.PSYBEAM,
      20: Moves.WATERFALL,
      23: Moves.X_SCISSOR,
      25: Moves.DRILL_RUN,
      28: Moves.POISON_JAB,
      30: Moves.AQUA_TAIL,
      33: Moves.MEGAHORN,
      35: Moves.SMART_STRIKE,
      38: Moves.LIQUIDATION,
      40: Moves.LEECH_LIFE,
      43: Moves.FIRST_IMPRESSION,
      45: Moves.SWORDS_DANCE,
      48: Moves.ICICLE_SPEAR,
      50: Moves.HYDRO_PUMP,
      53: Moves.THROAT_CHOP,
      55: Moves.HORN_DRILL,
      60: Moves.SKITTER_SMACK
    },
    typeChanges: [Type.WATER, Type.BUG],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.GOLDEEN_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#228B22", "#90EE90", "#32CD32", "#98FB98"],
      darkPalette: ["#0F5F0F", "#609060", "#1A8A1A", "#689868"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.HORSEA_FIREBALL_SEAHORSE]: {
    id: PokemonAltBuildId.HORSEA_FIREBALL_SEAHORSE,
    species: Species.HORSEA,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.STEAM_ENGINE, Abilities.INK_BLINDNESS, Abilities.GRIM_NEIGH],
    passiveAbilityChange: Abilities.STORM_DRAIN,
    finalPassive: Abilities.MORPHING_BLAZE,
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.TWISTER,
      8: Moves.FLAME_WHEEL,
      10: Moves.BUBBLE_BEAM,
      13: Moves.SMOKESCREEN,
      15: Moves.SCALD,
      18: Moves.FIRE_SPIN,
      20: Moves.DRAGON_BREATH,
      23: Moves.FLAMETHROWER,
      25: Moves.SURF,
      28: Moves.LAVA_PLUME,
      30: Moves.WEATHER_BALL,
      33: Moves.HYDRO_PUMP,
      35: Moves.NASTY_PLOT,
      38: Moves.FIRE_BLAST,
      40: Moves.FLASH_CANNON,
      43: Moves.STEAM_ERUPTION,
      45: Moves.DRAGON_PULSE,
      48: Moves.SCORCHING_SANDS,
      50: Moves.OVERHEAT,
      53: Moves.WATER_SPOUT,
      55: Moves.BLUE_FLARE,
      60: Moves.ERUPTION
    },
    typeChanges: [Type.WATER, Type.FIRE],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.HORSEA_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#FF4500", "#FF6347", "#FF7F50", "#FFA07A"],
      darkPalette: ["#CC3700", "#CC4F37", "#CC6540", "#CC805A"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.TOGEPI_EGGSHELL_FORTRESS]: {
    id: PokemonAltBuildId.TOGEPI_EGGSHELL_FORTRESS,
    species: Species.TOGEPI,
    rank: 1,
    statFocus: [Stat.DEF, Stat.HP],
    abilityChanges: [Abilities.SERENE_GRACE, Abilities.REGENERATOR, Abilities.ROCK_FORTRESS],
    passiveAbilityChange: Abilities.ROCKY_PAYLOAD,
    finalAbilityReplacements: [Abilities.SERENE_GRACE, Abilities.REGENERATOR, Abilities.ROCK_CONTROL],
    moveReplacements: {
      1: Moves.TACKLE,
      5: Moves.DEFENSE_CURL,
      8: Moves.ANCIENT_POWER,
      10: Moves.ROLLOUT,
      13: Moves.BODY_SLAM,
      15: Moves.ROCK_TOMB,
      18: Moves.STEALTH_ROCK,
      20: Moves.HEADBUTT,
      23: Moves.ROCK_SLIDE,
      25: Moves.WISH,
      28: Moves.ZEN_HEADBUTT,
      30: Moves.RECOVER,
      33: Moves.STONE_EDGE,
      35: Moves.IRON_HEAD,
      38: Moves.METEOR_BEAM,
      40: Moves.SOFTBOILED,
      43: Moves.HEAD_SMASH,
      45: Moves.COSMIC_POWER,
      48: Moves.ROCK_WRECKER,
      50: Moves.DOUBLE_EDGE,
      53: Moves.DIAMOND_STORM,
      55: Moves.METEOR_ASSAULT,
      60: Moves.GIGA_IMPACT
    },
    typeChanges: [Type.NORMAL, Type.ROCK],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.TOGEPI_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#8B4513", "#A0522D", "#D2691E", "#CD853F"],
      darkPalette: ["#5B3513", "#70421D", "#A2491E", "#9D653F"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.2,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.CORSOLA_TOXIC_CORAL]: {
    id: PokemonAltBuildId.CORSOLA_TOXIC_CORAL,
    species: Species.CORSOLA,
    rank: 1,
    statFocus: [Stat.SPDEF, Stat.HP],
    abilityChanges: [Abilities.POISON_HEAL, Abilities.MERCILESS, Abilities.TOXIC_BOOST],
    passiveAbilityChange: Abilities.TOXIC_DEBRIS,
    finalAbilityReplacements: [Abilities.POISON_HEAL, Abilities.DEEP_SEA_VIRUS, Abilities.TOXIC_BOOST],
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.TOXIC_SPIKES,
      8: Moves.RECOVER,
      10: Moves.BUBBLE_BEAM,
      13: Moves.TOXIC,
      15: Moves.VENOSHOCK,
      18: Moves.ACID_SPRAY,
      20: Moves.SURF,
      23: Moves.SLUDGE,
      25: Moves.CURSE,
      28: Moves.VENOM_DRENCH,
      30: Moves.SLUDGE_BOMB,
      33: Moves.BANEFUL_BUNKER,
      35: Moves.LIQUIDATION,
      38: Moves.GUNK_SHOT,
      40: Moves.AQUA_RING,
      43: Moves.SLUDGE_WAVE,
      45: Moves.COIL,
      48: Moves.HYDRO_PUMP,
      50: Moves.SHELL_SMASH,
      53: Moves.POISON_JAB,
      55: Moves.ACID_SPRAY,
      60: Moves.BELCH
    },
    typeChanges: [Type.POISON, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.CORSOLA_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#9370DB", "#8A2BE2", "#9932CC", "#BA55D3"],
      darkPalette: ["#6340AB", "#5A1BB2", "#69229C", "#8A35A3"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.LUVDISC_HEARTBREAKER]: {
    id: PokemonAltBuildId.LUVDISC_HEARTBREAKER,
    species: Species.LUVDISC,
    rank: 1,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [Abilities.AFTERMATH, Abilities.PRANKSTER, Abilities.CUTE_CHARM],
    passiveAbilityChange: Abilities.BEADS_OF_RUIN,
    finalAbilityReplacements: [Abilities.UNJUSTIFIED, Abilities.PRANKSTER, Abilities.CUTE_CHARM],
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.BITE,
      8: Moves.SWEET_KISS,
      10: Moves.WATER_PULSE,
      13: Moves.TAUNT,
      15: Moves.FEINT_ATTACK,
      18: Moves.DRAINING_KISS,
      20: Moves.DARK_PULSE,
      23: Moves.ATTRACT,
      25: Moves.SURF,
      28: Moves.KNOCK_OFF,
      30: Moves.FOUL_PLAY,
      33: Moves.HYDRO_PUMP,
      35: Moves.NASTY_PLOT,
      38: Moves.NIGHT_DAZE,
      40: Moves.CAPTIVATE,
      43: Moves.SUCKER_PUNCH,
      45: Moves.THROAT_CHOP,
      48: Moves.DARK_VOID,
      50: Moves.MOONBLAST,
      53: Moves.PARTING_SHOT,
      55: Moves.HYPER_BEAM,
      60: Moves.RUINATION
    },
    typeChanges: [Type.DARK, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.LUVDISC_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#2F4F4F", "#1C1C1C", "#3C3C3C", "#000000"],
      darkPalette: ["#1F3F3F", "#0C0C0C", "#2C2C2C", "#000000"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.1,
        lightnessAdjust: -0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.CLAUNCHER_BUSTER_DRAGON_BLASTER]: {
    id: PokemonAltBuildId.CLAUNCHER_BUSTER_DRAGON_BLASTER,
    species: Species.CLAUNCHER,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.ATK],
    abilityChanges: [Abilities.DRAGONS_MAW, Abilities.SPEED_BOOST, Abilities.SHEER_FORCE],
    passiveAbilityChange: Abilities.MEGA_LAUNCHER,
    finalAbilityReplacements: [Abilities.DRAGON_KING, Abilities.SPEED_BOOST, Abilities.SHEER_FORCE],
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.WATER_PULSE,
      8: Moves.DRAGON_BREATH,
      10: Moves.DRAGON_RAGE,
      13: Moves.AQUA_JET,
      15: Moves.DRAGON_PULSE,
      18: Moves.DARK_PULSE,
      20: Moves.AURA_SPHERE,
      23: Moves.CRABHAMMER,
      25: Moves.DUAL_CHOP,
      28: Moves.TERRAIN_PULSE,
      30: Moves.ORIGIN_PULSE,
      33: Moves.DRAGON_CLAW,
      35: Moves.BREAKING_SWIPE,
      38: Moves.FLASH_CANNON,
      40: Moves.HYDRO_PUMP,
      43: Moves.DRACO_METEOR,
      45: Moves.DRAGON_DANCE,
      48: Moves.OUTRAGE,
      50: Moves.HEAL_PULSE,
      53: Moves.CLANGING_SCALES,
      55: Moves.SPACIAL_REND,
      60: Moves.ROAR_OF_TIME
    },
    typeChanges: [Type.WATER, Type.DRAGON],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.CLAUNCHER_MISTY_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#9370DB", "#FFD700", "#8A2BE2", "#F0E68C"],
      darkPalette: ["#6340AB", "#CCA700", "#5A1BB2", "#C0B66C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.GEODUDE_PHANTOM_FIST]: {
    id: PokemonAltBuildId.GEODUDE_PHANTOM_FIST,
    species: Species.GEODUDE,
    rank: 1,
    statFocus: [Stat.ATK, Stat.DEF],
    abilityChanges: [Abilities.SHADOW_TAG, Abilities.TOUGH_CLAWS, Abilities.LEVITATE],
    passiveAbilityChange: Abilities.IRON_FIST,
    finalAbilityReplacements: [Abilities.HAUNTING_ECHO, Abilities.TOUGH_CLAWS, Abilities.LEVITATE],
    moveReplacements: {
      1: Moves.ROCK_THROW,
      5: Moves.ASTONISH,
      8: Moves.MEGA_PUNCH,
      10: Moves.ROCK_SMASH,
      13: Moves.SHADOW_SNEAK,
      15: Moves.THUNDER_PUNCH,
      18: Moves.ROCK_TOMB,
      20: Moves.SHADOW_CLAW,
      23: Moves.FIRE_PUNCH,
      25: Moves.ROCK_SLIDE,
      28: Moves.ICE_PUNCH,
      30: Moves.POLTERGEIST,
      33: Moves.HAMMER_ARM,
      35: Moves.STONE_EDGE,
      38: Moves.PHANTOM_FORCE,
      40: Moves.DRAIN_PUNCH,
      43: Moves.SKY_UPPERCUT,
      45: Moves.METEOR_MASH,
      48: Moves.SHADOW_BONE,
      50: Moves.ROCK_WRECKER,
      53: Moves.FOCUS_PUNCH,
      55: Moves.RAGE_FIST,
      60: Moves.SHADOW_FORCE
    },
    typeChanges: [Type.ROCK, Type.GHOST],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.GEODUDE_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#9370DB", "#2F4F4F", "#8A2BE2", "#1C1C1C"],
      darkPalette: ["#6340AB", "#1F3F3F", "#5A1BB2", "#0C0C0C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: -0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.VULPIX_FLAMING_FOREST_SPIRIT]: {
    id: PokemonAltBuildId.VULPIX_FLAMING_FOREST_SPIRIT,
    species: Species.VULPIX,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.SERENE_GRACE, Abilities.CHLOROPHYLL, Abilities.PIXILATE],
    passiveAbilityChange: Abilities.GRASSY_SURGE,
    finalAbilityReplacements: [Abilities.SERENE_GRACE, Abilities.CHLOROPHYLL, Abilities.FOREST_FURY],
    moveReplacements: {
      1: Moves.EMBER,
      5: Moves.LEECH_SEED,
      8: Moves.FLAME_WHEEL,
      10: Moves.RAZOR_LEAF,
      13: Moves.FIRE_SPIN,
      15: Moves.MEGA_DRAIN,
      18: Moves.SYNTHESIS,
      20: Moves.FLAMETHROWER,
      23: Moves.GIGA_DRAIN,
      25: Moves.GRASSY_TERRAIN,
      28: Moves.LAVA_PLUME,
      30: Moves.ENERGY_BALL,
      33: Moves.FIRE_BLAST,
      35: Moves.WOOD_HAMMER,
      38: Moves.SEED_BOMB,
      40: Moves.MORNING_SUN,
      43: Moves.SOLAR_BEAM,
      45: Moves.ERUPTION,
      48: Moves.LEAF_STORM,
      50: Moves.INFERNO,
      53: Moves.POWER_WHIP,
      55: Moves.OVERHEAT,
      60: Moves.FRENZY_PLANT
    },
    typeChanges: [Type.GRASS, Type.FIRE],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.VULPIX_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#228B22", "#FF4500", "#32CD32", "#FF6347"],
      darkPalette: ["#0F5F0F", "#CC3700", "#1A8A1A", "#CC4F37"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.ZUBAT_VAMPIRIC_FIEND]: {
    id: PokemonAltBuildId.ZUBAT_VAMPIRIC_FIEND,
    species: Species.ZUBAT,
    rank: 1,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [Abilities.MOXIE, Abilities.CURSED_BODY, Abilities.AERILATE],
    passiveAbilityChange: Abilities.STRONG_JAW,
    finalAbilityReplacements: [Abilities.MOXIE, Abilities.PUPPET_MASTER, Abilities.AERILATE],
    moveReplacements: {
      1: Moves.BITE,
      5: Moves.SUPERSONIC,
      8: Moves.WING_ATTACK,
      10: Moves.SHADOW_SNEAK,
      13: Moves.CRUNCH,
      15: Moves.LEECH_LIFE,
      18: Moves.POISON_FANG,
      20: Moves.SHADOW_CLAW,
      23: Moves.AIR_CUTTER,
      25: Moves.NIGHT_SLASH,
      28: Moves.PSYCHIC_FANGS,
      30: Moves.PHANTOM_FORCE,
      33: Moves.SUPER_FANG,
      35: Moves.BRAVE_BIRD,
      38: Moves.JAW_LOCK,
      40: Moves.SHADOW_BONE,
      43: Moves.HYPER_FANG,
      45: Moves.ACROBATICS,
      48: Moves.GIGA_DRAIN,
      50: Moves.POLTERGEIST,
      53: Moves.FISHIOUS_REND,
      55: Moves.HYPER_BEAM,
      60: Moves.BOLT_BEAK
    },
    typeChanges: [Type.DARK, Type.GHOST],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.ZUBAT_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#2F4F4F", "#8B0000", "#1C1C1C", "#DC143C"],
      darkPalette: ["#1F3F3F", "#5B0000", "#0C0C0C", "#AC142C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: -0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.BONSLY_TEAR_DROP]: {
    id: PokemonAltBuildId.BONSLY_TEAR_DROP,
    species: Species.BONSLY,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [Abilities.SKILL_LINK, Abilities.WATER_COMPACTION, Abilities.STAMINA],
    passiveAbilityChange: Abilities.REGENERATOR,
    finalPassive: Abilities.REGENERATOR_PLUS,
    moveReplacements: {
      1: Moves.WATER_GUN,
      5: Moves.DEFENSE_CURL,
      8: Moves.ROCK_BLAST,
      10: Moves.WATER_PULSE,
      13: Moves.BULLET_SEED,
      15: Moves.ROLLOUT,
      18: Moves.ANCIENT_POWER,
      20: Moves.ICICLE_SPEAR,
      23: Moves.ROCK_TOMB,
      25: Moves.SURF,
      28: Moves.PIN_MISSILE,
      30: Moves.ROCK_SLIDE,
      33: Moves.SHELL_SMASH,
      35: Moves.WATER_SHURIKEN,
      38: Moves.STONE_EDGE,
      40: Moves.RECOVER,
      43: Moves.SCALE_SHOT,
      45: Moves.COSMIC_POWER,
      48: Moves.HYDRO_PUMP,
      50: Moves.TAIL_SLAP,
      53: Moves.ROCK_WRECKER,
      55: Moves.POPULATION_BOMB,
      60: Moves.SPIKE_CANNON
    },
    typeChanges: [Type.ROCK, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.BONSLY_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#4169E1", "#87CEEB", "#1E90FF", "#B0E0E6"],
      darkPalette: ["#1E3A8A", "#5799BB", "#0D4A8A", "#7AABBF"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.MUDKIP_STONE_SKINNED_SALAMANDER]: {
    id: PokemonAltBuildId.MUDKIP_STONE_SKINNED_SALAMANDER,
    species: Species.MUDKIP,
    rank: 1,
    statFocus: [Stat.DEF, Stat.ATK],
    abilityChanges: [Abilities.GUTS, Abilities.SAND_STREAM, Abilities.MOLD_BREAKER],
    passiveAbilityChange: Abilities.MARVEL_SCALE,
    finalAbilityReplacements: [Abilities.GUTS, Abilities.SAND_STREAM, Abilities.SCALE_ARMOR],
    moveReplacements: {
      1: Moves.TACKLE,
      5: Moves.DRAGON_TAIL,
      8: Moves.ROCK_SMASH,
      10: Moves.TWISTER,
      13: Moves.ROCK_TOMB,
      15: Moves.DRAGON_BREATH,
      18: Moves.ANCIENT_POWER,
      20: Moves.PROTECT,
      23: Moves.BREAKING_SWIPE,
      25: Moves.ROCK_SLIDE,
      28: Moves.DRAGON_CLAW,
      30: Moves.SANDSTORM,
      33: Moves.DRAGON_DANCE,
      35: Moves.STONE_EDGE,
      38: Moves.EARTHQUAKE,
      40: Moves.OUTRAGE,
      43: Moves.HEAD_SMASH,
      45: Moves.SCALE_SHOT,
      48: Moves.ROCK_WRECKER,
      50: Moves.DUAL_CHOP,
      53: Moves.CLANGING_SCALES,
      55: Moves.DRAGON_RUSH,
      60: Moves.ROAR_OF_TIME
    },
    typeChanges: [Type.ROCK, Type.DRAGON],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.MUDKIP_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#8B4513", "#2F4F4F", "#A0522D", "#1C1C1C"],
      darkPalette: ["#5B3513", "#1F3F3F", "#70421D", "#0C0C0C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.2,
        lightnessAdjust: -0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.PINECO_IRON_PLATED_GRENADE]: {
    id: PokemonAltBuildId.PINECO_IRON_PLATED_GRENADE,
    species: Species.PINECO,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPATK],
    abilityChanges: [Abilities.AFTERMATH, Abilities.FLAME_BODY, Abilities.STAKEOUT],
    passiveAbilityChange: Abilities.IRON_BARBS,
    finalAbilityReplacements: [Abilities.INDUSTRIAL_POWER, Abilities.FLAME_BODY, Abilities.STAKEOUT],
    moveReplacements: {
      1: Moves.EMBER,
      5: Moves.SELF_DESTRUCT,
      8: Moves.METAL_SOUND,
      10: Moves.FLAME_WHEEL,
      13: Moves.GYRO_BALL,
      15: Moves.MIRROR_SHOT,
      18: Moves.SPIKES,
      20: Moves.FLAMETHROWER,
      23: Moves.IRON_DEFENSE,
      25: Moves.FLASH_CANNON,
      28: Moves.LAVA_PLUME,
      30: Moves.STEALTH_ROCK,
      33: Moves.FIRE_BLAST,
      35: Moves.IRON_HEAD,
      38: Moves.STEEL_BEAM,
      40: Moves.TOXIC_SPIKES,
      43: Moves.OVERHEAT,
      45: Moves.HEAVY_SLAM,
      48: Moves.METEOR_BEAM,
      50: Moves.ERUPTION,
      53: Moves.MAGNET_BOMB,
      55: Moves.INFERNO,
      60: Moves.EXPLOSION
    },
    typeChanges: [Type.FIRE, Type.STEEL],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.PINECO_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#228B22", "#C0C0C0", "#2F4F4F", "#A8A8A8"],
      darkPalette: ["#0F5F0F", "#808080", "#1F3F3F", "#787878"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.CROAGUNK_JESTER_OF_PESTILENCE]: {
    id: PokemonAltBuildId.CROAGUNK_JESTER_OF_PESTILENCE,
    species: Species.CROAGUNK,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.PIXILATE, Abilities.CORROSION, Abilities.NEUTRALIZING_GAS],
    passiveAbilityChange: Abilities.TABLETS_OF_RUIN,
    finalAbilityReplacements: [Abilities.PIXILATE, Abilities.CORROSION, Abilities.PLAGUE_PSYCHE],
    moveReplacements: {
      1: Moves.POUND,
      5: Moves.TAUNT,
      8: Moves.POISON_STING,
      10: Moves.HYPER_VOICE,
      13: Moves.TOXIC,
      15: Moves.VENOSHOCK,
      18: Moves.DRAINING_KISS,
      20: Moves.DAZZLING_GLEAM,
      23: Moves.ACID_SPRAY,
      25: Moves.SLUDGE,
      28: Moves.NASTY_PLOT,
      30: Moves.MOONBLAST,
      33: Moves.SLUDGE_BOMB,
      35: Moves.PLAY_ROUGH,
      38: Moves.GUNK_SHOT,
      40: Moves.MISTY_EXPLOSION,
      43: Moves.SLUDGE_WAVE,
      45: Moves.SPIRIT_BREAK,
      48: Moves.BOOMBURST,
      50: Moves.SHELL_SMASH,
      53: Moves.BELCH,
      55: Moves.HYPER_BEAM,
      60: Moves.LIGHT_OF_RUIN
    },
    typeChanges: [Type.POISON, Type.FAIRY],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.CROAGUNK_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#228B22", "#FFB6C1", "#9370DB", "#FF69B4"],
      darkPalette: ["#0F5F0F", "#CC86A1", "#6340AB", "#CC4984"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.HAPPINY_PINK_FORTRESS]: {
    id: PokemonAltBuildId.HAPPINY_PINK_FORTRESS,
    species: Species.HAPPINY,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [Abilities.FILTER, Abilities.MAGIC_GUARD, Abilities.WELL_BAKED_BODY],
    passiveAbilityChange: Abilities.RIPEN,
    finalAbilityReplacements: [Abilities.METEOR_PROOF, Abilities.MAGIC_GUARD, Abilities.WELL_BAKED_BODY],
    moveReplacements: {
      1: Moves.POUND,
      3: Moves.CHARM,
      5: Moves.HEAL_PULSE,
      7: Moves.FAIRY_WIND,
      9: Moves.CONFUSION,
      11: Moves.LIFE_DEW,
      13: Moves.LIGHT_SCREEN,
      15: Moves.DRAINING_KISS,
      18: Moves.WISH,
      20: Moves.PSYBEAM,
      23: Moves.REFLECT,
      25: Moves.AROMATHERAPY,
      28: Moves.DAZZLING_GLEAM,
      30: Moves.CALM_MIND,
      33: Moves.PSYCHIC,
      35: Moves.SOFT_BOILED,
      38: Moves.MOONBLAST,
      40: Moves.HEALING_WISH,
      43: Moves.BATON_PASS,
      45: Moves.TRICK_ROOM,
      48: Moves.FUTURE_SIGHT,
      50: Moves.MOONLIGHT,
      53: Moves.MISTY_TERRAIN,
      55: Moves.STORED_POWER,
      60: Moves.LUNAR_BLESSING
    },
    typeChanges: [Type.FAIRY, Type.STEEL],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.HAPPINY_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#C0C0C0", "#FFB6C1", "#B8B8B8", "#FFC0CB"],
      darkPalette: ["#808080", "#CC86A1", "#787878", "#CC909B"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.LOTAD_SHADOW_LILY]: {
    id: PokemonAltBuildId.LOTAD_SHADOW_LILY,
    species: Species.LOTAD,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.BAD_DREAMS, Abilities.RATTLED, Abilities.MOODY],
    passiveAbilityChange: Abilities.SUPREME_OVERLORD,
    finalAbilityReplacements: [Abilities.BAD_DREAMS, Abilities.DARK_SEED, Abilities.MOODY],
    moveReplacements: {
      1: Moves.ASTONISH,
      3: Moves.WATER_GUN,
      5: Moves.ABSORB,
      7: Moves.MIST,
      9: Moves.BUBBLE_BEAM,
      11: Moves.MEGA_DRAIN,
      13: Moves.RAIN_DANCE,
      15: Moves.AQUA_RING,
      18: Moves.GIGA_DRAIN,
      20: Moves.TEETER_DANCE,
      23: Moves.SCALD,
      25: Moves.LEECH_SEED,
      28: Moves.SYNTHESIS,
      30: Moves.ENERGY_BALL,
      33: Moves.SURF,
      35: Moves.ZEN_HEADBUTT,
      38: Moves.RECOVER,
      40: Moves.SOLAR_BEAM,
      43: Moves.HYDRO_PUMP,
      45: Moves.WEATHER_BALL,
      48: Moves.LEAF_STORM,
      50: Moves.BRINE,
      53: Moves.WATER_SPOUT,
      55: Moves.GRASSY_TERRAIN,
      60: Moves.ORIGIN_PULSE
    },
    typeChanges: [Type.GRASS, Type.DARK],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.LOTAD_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#2F4F4F", "#1C1C1C", "#228B22", "#000000"],
      darkPalette: ["#1F3F3F", "#0C0C0C", "#0F5F0F", "#000000"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.2,
        lightnessAdjust: -0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.COMFEY_AQUA_BLOOM]: {
    id: PokemonAltBuildId.COMFEY_AQUA_BLOOM,
    species: Species.COMFEY,
    rank: 1,
    statFocus: [Stat.SPDEF, Stat.HP],
    abilityChanges: [Abilities.DRIZZLE, Abilities.COTTON_DOWN, Abilities.WATER_BUBBLE],
    passiveAbilityChange: Abilities.SEED_SOWER,
    finalAbilityReplacements: [Abilities.DRIZZLE, Abilities.COTTON_DOWN, Abilities.SUNBATHER],
    moveReplacements: {
      1: Moves.VINE_WHIP,
      3: Moves.FLOWER_SHIELD,
      5: Moves.FAIRY_WIND,
      7: Moves.LEECH_SEED,
      9: Moves.DRAINING_KISS,
      11: Moves.AROMATHERAPY,
      13: Moves.MAGICAL_LEAF,
      15: Moves.SYNTHESIS,
      18: Moves.DAZZLING_GLEAM,
      20: Moves.GIGA_DRAIN,
      23: Moves.FLORAL_HEALING,
      25: Moves.CALM_MIND,
      28: Moves.ENERGY_BALL,
      30: Moves.MOONBLAST,
      33: Moves.PETAL_BLIZZARD,
      35: Moves.DRAINING_KISS,
      38: Moves.POLLEN_PUFF,
      40: Moves.GRASSY_TERRAIN,
      43: Moves.LEAF_STORM,
      45: Moves.MOONLIGHT,
      48: Moves.PLAY_ROUGH,
      50: Moves.SOLAR_BEAM,
      53: Moves.HEALING_WISH,
      55: Moves.BATON_PASS,
      60: Moves.POWER_WHIP
    },
    typeChanges: [Type.GRASS, Type.WATER],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.COMFEY_BROCK_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#4169E1", "#90EE90", "#87CEEB", "#98FB98"],
      darkPalette: ["#1E3A8A", "#609060", "#5799BB", "#689868"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.RIOLU_SHADOW_WARRIOR]: {
    id: PokemonAltBuildId.RIOLU_SHADOW_WARRIOR,
    species: Species.RIOLU,
    rank: 1,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [Abilities.STURDY, Abilities.MOXIE, Abilities.TECHNICIAN],
    passiveAbilityChange: Abilities.INTIMIDATE,
    finalAbilityReplacements: [Abilities.SLAYER_SENSEI, Abilities.MOXIE, Abilities.TECHNICIAN],
    moveReplacements: {
      1: Moves.FEINT,
      3: Moves.SHADOW_SNEAK,
      5: Moves.QUICK_ATTACK,
      7: Moves.LOW_KICK,
      9: Moves.FORCE_PALM,
      11: Moves.SHADOW_PUNCH,
      13: Moves.SCREECH,
      15: Moves.REVERSAL,
      18: Moves.SHADOW_CLAW,
      20: Moves.MACH_PUNCH,
      23: Moves.DRAIN_PUNCH,
      25: Moves.CURSE,
      28: Moves.SHADOW_BONE,
      30: Moves.BRICK_BREAK,
      33: Moves.AURA_SPHERE,
      35: Moves.PHANTOM_FORCE,
      38: Moves.CLOSE_COMBAT,
      40: Moves.SWORDS_DANCE,
      43: Moves.POLTERGEIST,
      45: Moves.BULK_UP,
      48: Moves.FINAL_GAMBIT,
      50: Moves.SHADOW_BALL,
      53: Moves.FOCUS_BLAST,
      55: Moves.SPECTRAL_THIEF,
      60: Moves.LAST_RESPECTS
    },
    typeChanges: [Type.GHOST, Type.FIGHTING],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#2F4F4F", "#9370DB", "#1C1C1C", "#8A2BE2"],
      darkPalette: ["#1F3F3F", "#6340AB", "#0C0C0C", "#5A1BB2"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: -0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.SOLROCK_VOID_CONSTELLATION]: {
    id: PokemonAltBuildId.SOLROCK_VOID_CONSTELLATION,
    species: Species.SOLROCK,
    rank: 1,
    statFocus: [Stat.ATK, Stat.SPD],
    abilityChanges: [Abilities.DESOLATE_LAND, Abilities.SAND_STREAM, Abilities.ARENA_TRAP],
    passiveAbilityChange: Abilities.CONTRARY,
    finalAbilityReplacements: [Abilities.DESOLATE_LAND, Abilities.SAND_STREAM, Abilities.EERIE_LIGHT],
    moveReplacements: {
      1: Moves.TACKLE,
      3: Moves.EMBER,
      5: Moves.ROCK_THROW,
      7: Moves.SUNNY_DAY,
      9: Moves.FIRE_SPIN,
      11: Moves.ROCK_TOMB,
      13: Moves.ZEN_HEADBUTT,
      15: Moves.FLAME_CHARGE,
      18: Moves.ROCK_SLIDE,
      20: Moves.COSMIC_POWER,
      23: Moves.FLAMETHROWER,
      25: Moves.MORNING_SUN,
      28: Moves.POWER_GEM,
      30: Moves.SOLAR_BEAM,
      33: Moves.STONE_EDGE,
      35: Moves.CALM_MIND,
      38: Moves.LAVA_PLUME,
      40: Moves.STEALTH_ROCK,
      43: Moves.FIRE_BLAST,
      45: Moves.EXPLOSION,
      48: Moves.OVERHEAT,
      50: Moves.HEAD_SMASH,
      53: Moves.SOLAR_BLADE,
      55: Moves.METEOR_BEAM,
      60: Moves.ERUPTION
    },
    typeChanges: [Type.DARK, Type.ROCK],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#2F4F4F", "#9370DB", "#8B0000", "#1C1C1C"],
      darkPalette: ["#1F3F3F", "#6340AB", "#5B0000", "#0C0C0C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: -0.15,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.LUNATONE_DREAM_WEAVER]: {
    id: PokemonAltBuildId.LUNATONE_DREAM_WEAVER,
    species: Species.LUNATONE,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPDEF],
    abilityChanges: [Abilities.BAD_DREAMS, Abilities.SOUL_HEART, Abilities.NEUROFORCE],
    passiveAbilityChange: Abilities.PSYCHIC_SURGE,
    finalAbilityReplacements: [Abilities.BAD_DREAMS, Abilities.SOUL_HEART, Abilities.NIGHTMARE_EMERALD],
    moveReplacements: {
      1: Moves.TACKLE,
      3: Moves.POWDER_SNOW,
      5: Moves.CONFUSION,
      7: Moves.HAIL,
      9: Moves.ICY_WIND,
      11: Moves.PSYBEAM,
      13: Moves.MIST,
      15: Moves.MOONLIGHT,
      18: Moves.ICE_BEAM,
      20: Moves.COSMIC_POWER,
      23: Moves.PSYCHIC,
      25: Moves.AURORA_VEIL,
      28: Moves.FREEZE_DRY,
      30: Moves.CALM_MIND,
      33: Moves.BLIZZARD,
      35: Moves.LUNAR_BLESSING,
      38: Moves.FUTURE_SIGHT,
      40: Moves.HAZE,
      43: Moves.GLACIATE,
      45: Moves.TRICK_ROOM,
      48: Moves.STORED_POWER,
      50: Moves.SHEER_COLD,
      53: Moves.EXPLOSION,
      55: Moves.PSYCHO_BOOST,
      60: Moves.ICE_BURN
    },
    typeChanges: [Type.PSYCHIC, Type.FAIRY],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#9370DB", "#FFD700", "#FFB6C1", "#F0E68C"],
      darkPalette: ["#6340AB", "#CCA700", "#CC86A1", "#C0B66C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.LARVESTA_TOXIC_SPINNER]: {
    id: PokemonAltBuildId.LARVESTA_TOXIC_SPINNER,
    species: Species.LARVESTA,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPATK],
    abilityChanges: [Abilities.TOXIC_CHAIN, Abilities.ROUGH_SKIN, Abilities.TINTED_LENS],
    passiveAbilityChange: Abilities.CORROSION,
    finalAbilityReplacements: [Abilities.TOXIC_CHAIN, Abilities.ROUGH_SKIN, Abilities.UNSTOPPABLE_POISON],
    moveReplacements: {
      1: Moves.EMBER,
      3: Moves.WATER_GUN,
      5: Moves.STRING_SHOT,
      7: Moves.FLAME_CHARGE,
      9: Moves.BUBBLE_BEAM,
      11: Moves.BUG_BITE,
      13: Moves.SCALD,
      15: Moves.FLAME_WHEEL,
      18: Moves.AQUA_RING,
      20: Moves.LEECH_LIFE,
      23: Moves.FLAMETHROWER,
      25: Moves.RAIN_DANCE,
      28: Moves.SURF,
      30: Moves.WILL_O_WISP,
      33: Moves.HEAT_WAVE,
      35: Moves.HYDRO_PUMP,
      38: Moves.QUIVER_DANCE,
      40: Moves.FIRE_BLAST,
      43: Moves.STEAM_ERUPTION,
      45: Moves.BUG_BUZZ,
      48: Moves.OVERHEAT,
      50: Moves.WATER_SPOUT,
      53: Moves.ORIGIN_PULSE,
      55: Moves.BURN_UP,
      60: Moves.BLUE_FLARE
    },
    typeChanges: [Type.BUG, Type.POISON],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#9370DB", "#2F4F4F", "#8A2BE2", "#1C1C1C"],
      darkPalette: ["#6340AB", "#1F3F3F", "#5A1BB2", "#0C0C0C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: -0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.SWABLU_FROST_NIMBUS]: {
    id: PokemonAltBuildId.SWABLU_FROST_NIMBUS,
    species: Species.SWABLU,
    rank: 1,
    statFocus: [Stat.SPDEF, Stat.SPATK],
    abilityChanges: [Abilities.FLUFFY, Abilities.SLUSH_RUSH, Abilities.REFRIGERATE],
    passiveAbilityChange: Abilities.SNOW_WARNING,
    finalAbilityReplacements: [Abilities.PERMAFROST_ARMOR, Abilities.SLUSH_RUSH, Abilities.REFRIGERATE],
    moveReplacements: {
      1: Moves.PECK,
      3: Moves.POWDER_SNOW,
      5: Moves.GROWL,
      7: Moves.DISARMING_VOICE,
      9: Moves.ICY_WIND,
      11: Moves.MIST,
      13: Moves.ROUND,
      15: Moves.ICE_SHARD,
      18: Moves.SAFEGUARD,
      20: Moves.AURORA_BEAM,
      23: Moves.ICE_BEAM,
      25: Moves.COTTON_GUARD,
      28: Moves.MOONBLAST,
      30: Moves.HAIL,
      33: Moves.BLIZZARD,
      35: Moves.ROOST,
      38: Moves.FREEZE_DRY,
      40: Moves.PERISH_SONG,
      43: Moves.DRAGON_PULSE,
      45: Moves.HAZE,
      48: Moves.HYPER_VOICE,
      50: Moves.SHEER_COLD,
      53: Moves.HURRICANE,
      55: Moves.ICICLE_CRASH,
      60: Moves.ICE_BURN
    },
    typeChanges: [Type.ICE, Type.FLYING],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#F0F8FF", "#E0FFFF", "#F5F5F5", "#FFFFFF"],
      darkPalette: ["#B0C8CF", "#A0CFCF", "#C5C5C5", "#D0D0D0"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.2,
        lightnessAdjust: 0.3,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.CASTFORM_DUST_DEVIL]: {
    id: PokemonAltBuildId.CASTFORM_DUST_DEVIL,
    species: Species.CASTFORM,
    rank: 1,
    statFocus: [Stat.SPD, Stat.ATK],
    abilityChanges: [Abilities.STORM_DRAIN, Abilities.AERILATE, Abilities.SHEER_FORCE],
    passiveAbilityChange: Abilities.DELTA_STREAM,
    finalAbilityReplacements: [Abilities.STORM_DRAIN, Abilities.AERILATE, Abilities.TERA_FORCE],
    moveReplacements: {
      1: Moves.TACKLE,
      3: Moves.WATER_GUN,
      5: Moves.EMBER,
      7: Moves.POWDER_SNOW,
      9: Moves.HEADBUTT,
      11: Moves.RAIN_DANCE,
      13: Moves.SUNNY_DAY,
      15: Moves.HAIL,
      18: Moves.WEATHER_BALL,
      20: Moves.WATER_PULSE,
      23: Moves.FIRE_BLAST,
      25: Moves.BLIZZARD,
      28: Moves.HYDRO_PUMP,
      30: Moves.SOLAR_BEAM,
      33: Moves.HURRICANE,
      35: Moves.THUNDER,
      38: Moves.SCALD,
      40: Moves.FLAMETHROWER,
      43: Moves.ICE_BEAM,
      45: Moves.SANDSTORM,
      48: Moves.ORIGIN_PULSE,
      50: Moves.ERUPTION,
      53: Moves.GLACIATE,
      55: Moves.MOONBLAST,
      60: Moves.PRISMATIC_LASER
    },
    typeChanges: [Type.FLYING, Type.GROUND],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#8B4513", "#F5F5F5", "#A0522D", "#E0E0E0"],
      darkPalette: ["#5B3513", "#C5C5C5", "#70421D", "#B0B0B0"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.LITWICK_WYRMFLAME]: {
    id: PokemonAltBuildId.LITWICK_WYRMFLAME,
    species: Species.LITWICK,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.ATK],
    abilityChanges: [Abilities.ADAPTABILITY, Abilities.LEVITATE, Abilities.INTIMIDATE],
    passiveAbilityChange: Abilities.SHADOW_TAG,
    finalAbilityReplacements: [Abilities.ADAPTABILITY, Abilities.LEVITATE, Abilities.SOUL_BURN],
    moveReplacements: {
      1: Moves.ASTONISH,
      3: Moves.EMBER,
      5: Moves.MINIMIZE,
      7: Moves.SMOG,
      9: Moves.FIRE_SPIN,
      11: Moves.CONFUSE_RAY,
      13: Moves.NIGHT_SHADE,
      15: Moves.WILL_O_WISP,
      18: Moves.FLAME_BURST,
      20: Moves.HEX,
      23: Moves.CURSE,
      25: Moves.FLAMETHROWER,
      28: Moves.SHADOW_BALL,
      30: Moves.MEMENTO,
      33: Moves.INFERNO,
      35: Moves.PAIN_SPLIT,
      38: Moves.HEAT_WAVE,
      40: Moves.POLTERGEIST,
      43: Moves.FIRE_BLAST,
      45: Moves.DESTINY_BOND,
      48: Moves.OVERHEAT,
      50: Moves.PHANTOM_FORCE,
      53: Moves.BURNING_JEALOUSY,
      55: Moves.TRICK_ROOM,
      60: Moves.ASTRAL_BARRAGE
    },
    typeChanges: [Type.FIRE, Type.DRAGON],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#FF4500", "#9370DB", "#FF6347", "#8A2BE2"],
      darkPalette: ["#CC3700", "#6340AB", "#CC4F37", "#5A1BB2"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.EEVEE_UNTAMED_SPIRIT]: {
    id: PokemonAltBuildId.EEVEE_UNTAMED_SPIRIT,
    species: Species.EEVEE,
    rank: 1,
    statFocus: [Stat.SPD, Stat.SPATK],
    abilityChanges: [Abilities.SUPER_LUCK, Abilities.SERENE_GRACE, Abilities.NORMALIZE],
    passiveAbilityChange: Abilities.PRISM_ARMOR,
    finalAbilityReplacements: [Abilities.ULTIMATE_ADAPTATION, Abilities.SERENE_GRACE, Abilities.NORMALIZE],
    moveReplacements: {
      1: Moves.SWIFT,
      3: Moves.TACKLE,
      5: Moves.TAIL_WHIP,
      7: Moves.SAND_ATTACK,
      9: Moves.QUICK_ATTACK,
      11: Moves.BABY_DOLL_EYES,
      13: Moves.BITE,
      15: Moves.COPYCAT,
      18: Moves.BATON_PASS,
      20: Moves.TAKE_DOWN,
      23: Moves.CHARM,
      25: Moves.DOUBLE_EDGE,
      28: Moves.TRUMP_CARD,
      30: Moves.LAST_RESORT,
      33: Moves.HYPER_VOICE,
      35: Moves.STORED_POWER,
      38: Moves.EXTREME_SPEED,
      40: Moves.CALM_MIND,
      43: Moves.PROTECT,
      45: Moves.WEATHER_BALL,
      48: Moves.DOUBLE_TEAM,
      50: Moves.BATON_PASS,
      53: Moves.BODY_SLAM,
      55: Moves.ENCORE,
      60: Moves.REVELATION_DANCE
    },
    typeChanges: [Type.NORMAL, Type.NORMAL],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#F5F5F5", "#E0E0E0", "#FFFFFF", "#D0D0D0"],
      darkPalette: ["#C5C5C5", "#B0B0B0", "#D0D0D0", "#A0A0A0"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.1,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.TEDDIURSA_SWEET_TOOTH]: {
    id: PokemonAltBuildId.TEDDIURSA_SWEET_TOOTH,
    species: Species.TEDDIURSA,
    rank: 1,
    statFocus: [Stat.ATK, Stat.HP],
    abilityChanges: [Abilities.HONEY_GATHER, Abilities.MISTY_SURGE, Abilities.PURE_POWER],
    passiveAbilityChange: Abilities.HARVEST,
    finalPassive: Abilities.SUPER_HUNGRY,
    moveReplacements: {
      1: Moves.SCRATCH,
      3: Moves.LICK,
      5: Moves.BABY_DOLL_EYES,
      7: Moves.FAIRY_WIND,
      9: Moves.FURY_SWIPES,
      11: Moves.DRAINING_KISS,
      13: Moves.FAKE_TEARS,
      15: Moves.CHARM,
      18: Moves.SLASH,
      20: Moves.PLAY_ROUGH,
      23: Moves.REST,
      25: Moves.SNORE,
      28: Moves.DAZZLING_GLEAM,
      30: Moves.CRUNCH,
      33: Moves.MOONBLAST,
      35: Moves.THRASH,
      38: Moves.BODY_SLAM,
      40: Moves.MISTY_TERRAIN,
      43: Moves.PLAY_ROUGH,
      45: Moves.SWORDS_DANCE,
      48: Moves.DOUBLE_EDGE,
      50: Moves.MOONLIGHT,
      53: Moves.SPIRIT_BREAK,
      55: Moves.SUPERPOWER,
      60: Moves.LIGHT_OF_RUIN
    },
    typeChanges: [Type.FAIRY, Type.FAIRY],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#FFB6C1", "#FFC0CB", "#FF69B4", "#FFE4E1"],
      darkPalette: ["#CC86A1", "#CC909B", "#CC4984", "#CCB4B1"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.4,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.CLEFFA_METEORIC_CORE]: {
    id: PokemonAltBuildId.CLEFFA_METEORIC_CORE,
    species: Species.CLEFFA,
    rank: 1,
    statFocus: [Stat.DEF, Stat.SPDEF],
    abilityChanges: [Abilities.FLAME_BODY, Abilities.MAGIC_GUARD, Abilities.HEATPROOF],
    passiveAbilityChange: Abilities.SOLID_ROCK,
    finalPassive: Abilities.MADE_TO_LAST,
    moveReplacements: {
      1: Moves.POUND,
      3: Moves.CHARM,
      5: Moves.ENCORE,
      7: Moves.SING,
      9: Moves.DISARMING_VOICE,
      11: Moves.DEFENSE_CURL,
      13: Moves.DRAINING_KISS,
      15: Moves.FOLLOW_ME,
      18: Moves.MINIMIZE,
      20: Moves.DAZZLING_GLEAM,
      23: Moves.COSMIC_POWER,
      25: Moves.WISH,
      28: Moves.MOONBLAST,
      30: Moves.METEOR_BEAM,
      33: Moves.LIGHT_SCREEN,
      35: Moves.REFLECT,
      38: Moves.MOONLIGHT,
      40: Moves.METRONOME,
      43: Moves.LUCKY_CHANT,
      45: Moves.MISTY_TERRAIN,
      48: Moves.STORED_POWER,
      50: Moves.METEOR_MASH,
      53: Moves.COSMIC_POWER,
      55: Moves.HEALING_WISH,
      60: Moves.LUNAR_BLESSING
    },
    typeChanges: [Type.FAIRY, Type.STEEL],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#8B0000", "#DC143C", "#A52A2A", "#CD5C5C"],
      darkPalette: ["#5B0000", "#AC142C", "#75221A", "#9D4C4C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.3,
        lightnessAdjust: -0.1,
        type: 'milestone'
      }
    }
  },

  [PokemonAltBuildId.SUNKERN_PLASMA_SPROUT]: {
    id: PokemonAltBuildId.SUNKERN_PLASMA_SPROUT,
    species: Species.SUNKERN,
    rank: 1,
    statFocus: [Stat.SPATK, Stat.SPD],
    abilityChanges: [Abilities.GALVANIZE, Abilities.CHLOROPHYLL, Abilities.SOLAR_POWER_PLUS],
    passiveAbilityChange: Abilities.ELECTRIC_SURGE,
    moveReplacements: {
      1: Moves.ABSORB,
      3: Moves.THUNDER_SHOCK,
      5: Moves.GROWTH,
      7: Moves.MEGA_DRAIN,
      9: Moves.THUNDER_WAVE,
      11: Moves.INGRAIN,
      13: Moves.SPARK,
      15: Moves.LEECH_SEED,
      18: Moves.GIGA_DRAIN,
      20: Moves.CHARGE,
      23: Moves.ENERGY_BALL,
      25: Moves.THUNDERBOLT,
      28: Moves.SYNTHESIS,
      30: Moves.SOLAR_BEAM,
      33: Moves.DISCHARGE,
      35: Moves.SUNNY_DAY,
      38: Moves.THUNDER,
      40: Moves.LEAF_STORM,
      43: Moves.AGILITY,
      45: Moves.ELECTRIC_TERRAIN,
      48: Moves.POWER_WHIP,
      50: Moves.PARABOLIC_CHARGE,
      53: Moves.GRASSY_TERRAIN,
      55: Moves.ZAP_CANNON,
      60: Moves.BOLT_STRIKE
    },
    typeChanges: [Type.ELECTRIC, Type.GRASS],
    preventEvolution: true,
    prerequisiteBuilds: [PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE],
    spriteColorPalette: {
      targetPalette: ["#4169E1", "#FFD700", "#228B22", "#F0E68C"],
      darkPalette: ["#1E3A8A", "#CCA700", "#0F5F0F", "#C0B66C"],
      blendMode: 'grayscale_overlay',
      rankProgression: {
        saturationScale: 1.5,
        lightnessAdjust: 0.2,
        type: 'milestone'
      }
    }
  }
};