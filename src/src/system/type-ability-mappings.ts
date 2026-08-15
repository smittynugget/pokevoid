import { Type } from "#app/data/type";
import { Abilities } from "#enums/abilities";

export const TYPE_ABILITY_MAP: Partial<Record<Type, Abilities[]>> = {
  [Type.NORMAL]: [
    Abilities.ADAPTABILITY, Abilities.TECHNICIAN, Abilities.SKILL_LINK, Abilities.NORMALIZE,
    Abilities.SCRAPPY, Abilities.PARENTAL_BOND, Abilities.PICKUP, Abilities.RUN_AWAY,
    Abilities.HUGE_POWER, Abilities.PURE_POWER, Abilities.HUSTLE, Abilities.EARLY_BIRD,
    Abilities.GLUTTONY, Abilities.ANGER_POINT, Abilities.UNAWARE, Abilities.SIMPLE,
    Abilities.MOODY, Abilities.FRIEND_GUARD, Abilities.CUTE_CHARM, Abilities.OWN_TEMPO,
    Abilities.OBLIVIOUS, Abilities.RIVALRY, Abilities.VICTORY_STAR, Abilities.TRUANT,
    Abilities.KLUTZ, Abilities.SLOW_START, Abilities.SERENE_GRACE, Abilities.THICK_FAT,
    Abilities.ILLUMINATE, Abilities.SUCTION_CUPS, Abilities.STICKY_HOLD, Abilities.SHED_SKIN,
    Abilities.TANGLED_FEET, Abilities.UNBURDEN, Abilities.FOREWARN, Abilities.ANTICIPATION,
    Abilities.QUICK_FEET, Abilities.HEALER, Abilities.SYMBIOSIS, Abilities.CHEEK_POUCH,
    Abilities.FUR_COAT, Abilities.GOOEY, Abilities.AERILATE, Abilities.PIXILATE,
    Abilities.BULLETPROOF, Abilities.COMPETITIVE, Abilities.RATTLED, Abilities.BALL_FETCH,
    Abilities.FLUFFY, Abilities.CUD_CHEW, Abilities.OPPORTUNIST, Abilities.SHEER_FORCE,
    Abilities.MOXIE, Abilities.GUTS, Abilities.INTIMIDATE
  ],
  [Type.FIRE]: [
    Abilities.BLAZE, Abilities.FLASH_FIRE, Abilities.FLAME_BODY, Abilities.DROUGHT,
    Abilities.DESOLATE_LAND, Abilities.SOLAR_POWER, Abilities.MAGMA_ARMOR, Abilities.WHITE_SMOKE,
    Abilities.STEAM_ENGINE, Abilities.THERMAL_EXCHANGE, Abilities.SHEER_FORCE, Abilities.RECKLESS,
    Abilities.MOLD_BREAKER, Abilities.IRON_FIST, Abilities.DRAGONS_MAW, Abilities.TURBOBLAZE,
    Abilities.SPEED_BOOST, Abilities.UNBURDEN, Abilities.GUTS, Abilities.RIVALRY,
    Abilities.ANGER_POINT, Abilities.JUSTIFIED, Abilities.DEFIANT, Abilities.COMPETITIVE,
    Abilities.PRESSURE, Abilities.INTIMIDATE, Abilities.UNNERVE, Abilities.INNER_FOCUS,
    Abilities.ROCK_HEAD, Abilities.AFTERMATH, Abilities.ORICHALCUM_PULSE
  ],
  [Type.WATER]: [
    Abilities.TORRENT, Abilities.WATER_ABSORB, Abilities.SWIFT_SWIM, Abilities.HYDRATION,
    Abilities.DRIZZLE, Abilities.PRIMORDIAL_SEA, Abilities.RAIN_DISH, Abilities.WATER_VEIL,
    Abilities.STORM_DRAIN, Abilities.DRY_SKIN, Abilities.WATER_COMPACTION, Abilities.WATER_BUBBLE,
    Abilities.DAMP, Abilities.LIQUID_VOICE, Abilities.SHELL_ARMOR, Abilities.BATTLE_ARMOR,
    Abilities.REGENERATOR, Abilities.CLEAR_BODY, Abilities.SHEER_FORCE, Abilities.STRONG_JAW,
    Abilities.MEGA_LAUNCHER, Abilities.SNIPER, Abilities.SKILL_LINK, Abilities.ADAPTABILITY,
    Abilities.TECHNICIAN, Abilities.SUCTION_CUPS, Abilities.STICKY_HOLD, Abilities.PROPELLER_TAIL,
    Abilities.COMMANDER, Abilities.GULP_MISSILE, Abilities.PRESSURE, Abilities.INTIMIDATE,
    Abilities.ROUGH_SKIN, Abilities.SCHOOLING
  ],
  [Type.GRASS]: [
    Abilities.OVERGROW, Abilities.CHLOROPHYLL, Abilities.SAP_SIPPER, Abilities.LEAF_GUARD,
    Abilities.GRASSY_SURGE, Abilities.HARVEST, Abilities.FLOWER_GIFT, Abilities.FLOWER_VEIL,
    Abilities.GRASS_PELT, Abilities.EFFECT_SPORE, Abilities.SEED_SOWER, Abilities.NATURAL_CURE,
    Abilities.REGENERATOR, Abilities.SOLAR_POWER, Abilities.RIPEN, Abilities.GLUTTONY,
    Abilities.THICK_FAT, Abilities.OVERCOAT, Abilities.BULLETPROOF, Abilities.WELL_BAKED_BODY,
    Abilities.COTTON_DOWN, Abilities.HEALER, Abilities.SYMBIOSIS, Abilities.AROMA_VEIL,
    Abilities.SWEET_VEIL, Abilities.SERENE_GRACE, Abilities.CONTRARY, Abilities.UNBURDEN,
    Abilities.TECHNICIAN, Abilities.SKILL_LINK, Abilities.INFILTRATOR, Abilities.MYCELIUM_MIGHT,
    Abilities.PROTOSYNTHESIS, Abilities.WIND_RIDER, Abilities.OWN_TEMPO
  ],
  [Type.ELECTRIC]: [
    Abilities.STATIC, Abilities.LIGHTNING_ROD, Abilities.VOLT_ABSORB, Abilities.MOTOR_DRIVE,
    Abilities.ELECTRIC_SURGE, Abilities.GALVANIZE, Abilities.SURGE_SURFER, Abilities.TRANSISTOR,
    Abilities.ELECTROMORPHOSIS, Abilities.WIND_POWER, Abilities.HADRON_ENGINE, Abilities.SPEED_BOOST,
    Abilities.QUICK_FEET, Abilities.UNBURDEN, Abilities.SHEER_FORCE, Abilities.MOLD_BREAKER,
    Abilities.TERAVOLT, Abilities.TURBOBLAZE, Abilities.ADAPTABILITY, Abilities.TECHNICIAN,
    Abilities.PLUS, Abilities.MINUS, Abilities.BATTERY, Abilities.DOWNLOAD, Abilities.MAGNET_PULL,
    Abilities.SOUNDPROOF, Abilities.STURDY, Abilities.CLEAR_BODY, Abilities.IRON_FIST,
    Abilities.PRESSURE, Abilities.RIVALRY, Abilities.INTIMIDATE, Abilities.COMPETITIVE,
    Abilities.DEFIANT, Abilities.QUARK_DRIVE
  ],
  [Type.GROUND]: [
    Abilities.SAND_STREAM, Abilities.SAND_FORCE, Abilities.ARENA_TRAP, Abilities.SAND_VEIL,
    Abilities.SAND_RUSH, Abilities.SAND_SPIT, Abilities.EARTH_EATER, Abilities.DRY_SKIN,
    Abilities.WATER_COMPACTION, Abilities.SOLID_ROCK, Abilities.STURDY, Abilities.BATTLE_ARMOR,
    Abilities.SHEER_FORCE, Abilities.HYPER_CUTTER, Abilities.IRON_FIST, Abilities.MOLD_BREAKER,
    Abilities.RECKLESS, Abilities.GUTS, Abilities.INTIMIDATE, Abilities.MOXIE, Abilities.ANGER_POINT,
    Abilities.FILTER, Abilities.WEAK_ARMOR, Abilities.ROUGH_SKIN, Abilities.PICKUP,
    Abilities.SHED_SKIN, Abilities.PRESSURE, Abilities.UNNERVE, Abilities.OVERCOAT
  ],
  [Type.ROCK]: [
    Abilities.SOLID_ROCK, Abilities.STURDY, Abilities.ROCK_HEAD, Abilities.ROCKY_PAYLOAD,
    Abilities.SAND_STREAM, Abilities.SAND_FORCE, Abilities.SAND_VEIL, Abilities.SAND_RUSH,
    Abilities.SAND_SPIT, Abilities.BATTLE_ARMOR, Abilities.SHELL_ARMOR, Abilities.FILTER,
    Abilities.WEAK_ARMOR, Abilities.HEAVY_METAL, Abilities.CLEAR_BODY, Abilities.WATER_COMPACTION,
    Abilities.SHEER_FORCE, Abilities.ANGER_POINT, Abilities.RECKLESS, Abilities.MOLD_BREAKER,
    Abilities.HYPER_CUTTER, Abilities.MAGNET_PULL, Abilities.IRON_BARBS, Abilities.ROUGH_SKIN,
    Abilities.PRESSURE, Abilities.UNNERVE, Abilities.INTIMIDATE, Abilities.STEADFAST,
    Abilities.POWER_CONSTRUCT, Abilities.SHIELDS_DOWN, Abilities.SCREEN_CLEANER, Abilities.DAUNTLESS_SHIELD,
    Abilities.ARMOR_TAIL, Abilities.TECHNICIAN
  ],
  [Type.FIGHTING]: [
    Abilities.GUTS, Abilities.NO_GUARD, Abilities.IRON_FIST, Abilities.STEADFAST,
    Abilities.INNER_FOCUS, Abilities.MOLD_BREAKER, Abilities.SCRAPPY, Abilities.LIMBER,
    Abilities.RECKLESS, Abilities.TECHNICIAN, Abilities.JUSTIFIED, Abilities.DEFIANT,
    Abilities.COMPETITIVE, Abilities.UNBURDEN, Abilities.SKILL_LINK, Abilities.HUGE_POWER,
    Abilities.PURE_POWER, Abilities.SHEER_FORCE, Abilities.HYPER_CUTTER, Abilities.STRONG_JAW,
    Abilities.TOUGH_CLAWS, Abilities.DOWNLOAD, Abilities.ANGER_POINT, Abilities.BATTLE_ARMOR,
    Abilities.STURDY, Abilities.STAMINA, Abilities.BULLETPROOF, Abilities.SOUNDPROOF,
    Abilities.GUARD_DOG, Abilities.INTREPID_SWORD, Abilities.DAUNTLESS_SHIELD, Abilities.UNSEEN_FIST,
    Abilities.TELEPATHY, Abilities.PRESSURE, Abilities.VITAL_SPIRIT, Abilities.GORILLA_TACTICS,
    Abilities.COSTAR, Abilities.SUPREME_OVERLORD, Abilities.SHARPNESS
  ],
  [Type.FLYING]: [
    Abilities.KEEN_EYE, Abilities.BIG_PECKS, Abilities.GALE_WINGS, Abilities.UNBURDEN,
    Abilities.AERILATE, Abilities.DEFIANT, Abilities.COMPETITIVE, Abilities.TANGLED_FEET,
    Abilities.EARLY_BIRD, Abilities.SWIFT_SWIM, Abilities.CLOUD_NINE, Abilities.AIR_LOCK,
    Abilities.SERENE_GRACE, Abilities.HYDRATION, Abilities.LEVITATE, Abilities.SHIELD_DUST,
    Abilities.COMPOUND_EYES, Abilities.SNIPER, Abilities.SUPER_LUCK, Abilities.UNAWARE,
    Abilities.TINTED_LENS, Abilities.FILTER, Abilities.MULTISCALE, Abilities.OVERCOAT,
    Abilities.LONG_REACH, Abilities.MIRROR_ARMOR, Abilities.COTTON_DOWN, Abilities.PROPELLER_TAIL,
    Abilities.WIND_RIDER, Abilities.WIND_POWER, Abilities.ADAPTABILITY, Abilities.TECHNICIAN,
    Abilities.SKILL_LINK, Abilities.BATTLE_ARMOR, Abilities.STURDY, Abilities.HYPER_CUTTER,
    Abilities.DOWNLOAD, Abilities.SOUNDPROOF, Abilities.FLUFFY, Abilities.DAZZLING,
    Abilities.SHEER_FORCE, Abilities.RECKLESS, Abilities.MOXIE, Abilities.STRONG_JAW,
    Abilities.TOUGH_CLAWS, Abilities.PRESSURE
  ],
  [Type.POISON]: [
    Abilities.POISON_POINT, Abilities.POISON_TOUCH, Abilities.CORROSION, Abilities.MERCILESS,
    Abilities.POISON_HEAL, Abilities.STENCH, Abilities.STICKY_HOLD, Abilities.LIQUID_OOZE,
    Abilities.TOXIC_BOOST, Abilities.TOXIC_DEBRIS, Abilities.TOXIC_CHAIN, Abilities.IMMUNITY,
    Abilities.REGENERATOR, Abilities.CLEAR_BODY, Abilities.SHED_SKIN, Abilities.WATER_VEIL,
    Abilities.OVERCOAT, Abilities.SHEER_FORCE, Abilities.MOLD_BREAKER, Abilities.ADAPTABILITY,
    Abilities.SNIPER, Abilities.TECHNICIAN, Abilities.INFILTRATOR, Abilities.LEVITATE,
    Abilities.UNBURDEN, Abilities.EFFECT_SPORE, Abilities.AFTERMATH, Abilities.PUNK_ROCK,
    Abilities.PASTEL_VEIL, Abilities.NEUTRALIZING_GAS, Abilities.PRESSURE, Abilities.BEAST_BOOST
  ],
  [Type.BUG]: [
    Abilities.SWARM, Abilities.COMPOUND_EYES, Abilities.SHIELD_DUST, Abilities.TINTED_LENS,
    Abilities.HONEY_GATHER, Abilities.SHED_SKIN, Abilities.EFFECT_SPORE, Abilities.GUTS,
    Abilities.SPEED_BOOST, Abilities.UNBURDEN, Abilities.INFILTRATOR, Abilities.QUICK_FEET,
    Abilities.TECHNICIAN, Abilities.SKILL_LINK, Abilities.MOXIE, Abilities.SHEER_FORCE,
    Abilities.ADAPTABILITY, Abilities.SNIPER, Abilities.STRONG_JAW, Abilities.IRON_FIST,
    Abilities.TOUGH_CLAWS, Abilities.BATTLE_ARMOR, Abilities.SHELL_ARMOR, Abilities.STURDY,
    Abilities.OVERCOAT, Abilities.ROUGH_SKIN, Abilities.IRON_BARBS, Abilities.EMERGENCY_EXIT,
    Abilities.WIMP_OUT, Abilities.BEAST_BOOST, Abilities.DOWNLOAD, Abilities.PRESSURE
  ],
  [Type.GHOST]: [
    Abilities.LEVITATE, Abilities.CURSED_BODY, Abilities.FRISK, Abilities.INSOMNIA,
    Abilities.INFILTRATOR, Abilities.SHADOW_TAG, Abilities.PERISH_BODY, Abilities.WANDERING_SPIRIT,
    Abilities.DISGUISE, Abilities.CLEAR_BODY, Abilities.UNAWARE, Abilities.TECHNICIAN,
    Abilities.ADAPTABILITY, Abilities.SHEER_FORCE, Abilities.AFTERMATH, Abilities.WEAK_ARMOR,
    Abilities.MUMMY, Abilities.PRESSURE, Abilities.UNNERVE, Abilities.FOREWARN,
    Abilities.ANTICIPATION, Abilities.STANCE_CHANGE, Abilities.AS_ONE_SPECTRIER, Abilities.GRIM_NEIGH,
    Abilities.PRISM_ARMOR, Abilities.MOXIE
  ],
  [Type.STEEL]: [
    Abilities.STURDY, Abilities.CLEAR_BODY, Abilities.BATTLE_ARMOR, Abilities.HEAVY_METAL,
    Abilities.LIGHT_METAL, Abilities.MAGNET_PULL, Abilities.STEELWORKER, Abilities.STEELY_SPIRIT,
    Abilities.IRON_BARBS, Abilities.IRON_FIST, Abilities.FILTER, Abilities.SOLID_ROCK,
    Abilities.SHELL_ARMOR, Abilities.BULLETPROOF, Abilities.SOUNDPROOF, Abilities.OVERCOAT,
    Abilities.MIRROR_ARMOR, Abilities.FULL_METAL_BODY, Abilities.PRISM_ARMOR, Abilities.SHADOW_SHIELD,
    Abilities.TECHNICIAN, Abilities.SHEER_FORCE, Abilities.ADAPTABILITY, Abilities.MOLD_BREAKER,
    Abilities.TOUGH_CLAWS, Abilities.STRONG_JAW, Abilities.SKILL_LINK, Abilities.SHARPNESS,
    Abilities.DOWNLOAD, Abilities.ANALYTIC, Abilities.HEATPROOF, Abilities.LEVITATE,
    Abilities.GUTS, Abilities.JUSTIFIED, Abilities.DEFIANT, Abilities.STANCE_CHANGE,
    Abilities.INTREPID_SWORD, Abilities.DAUNTLESS_SHIELD, Abilities.PRESSURE, Abilities.BEAST_BOOST
  ],
  [Type.PSYCHIC]: [
    Abilities.SYNCHRONIZE, Abilities.MAGIC_GUARD, Abilities.TELEPATHY, Abilities.PSYCHIC_SURGE,
    Abilities.INNER_FOCUS, Abilities.FOREWARN, Abilities.ANTICIPATION, Abilities.MAGIC_BOUNCE,
    Abilities.SHADOW_TAG, Abilities.ANALYTIC, Abilities.DOWNLOAD, Abilities.CONTRARY,
    Abilities.SIMPLE, Abilities.UNAWARE, Abilities.PRESSURE, Abilities.CLEAR_BODY,
    Abilities.FULL_METAL_BODY, Abilities.REGENERATOR, Abilities.OWN_TEMPO, Abilities.OBLIVIOUS,
    Abilities.TECHNICIAN, Abilities.SHEER_FORCE, Abilities.ADAPTABILITY, Abilities.SKILL_LINK,
    Abilities.MOXIE, Abilities.HEALER, Abilities.FRIEND_GUARD, Abilities.AROMA_VEIL,
    Abilities.SWEET_VEIL, Abilities.TRACE, Abilities.RECEIVER, Abilities.NEUROFORCE,
    Abilities.SOUL_HEART, Abilities.CUD_CHEW, Abilities.ARMOR_TAIL, Abilities.PRISM_ARMOR,
    Abilities.SHADOW_SHIELD, Abilities.AS_ONE_GLASTRIER, Abilities.AS_ONE_SPECTRIER
  ],
  [Type.ICE]: [
    Abilities.ICE_BODY, Abilities.SLUSH_RUSH, Abilities.SNOW_CLOAK, Abilities.SNOW_WARNING,
    Abilities.ICE_FACE, Abilities.ICE_SCALES, Abilities.REFRIGERATE, Abilities.CHILLING_NEIGH,
    Abilities.THERMAL_EXCHANGE, Abilities.THICK_FAT, Abilities.FILTER, Abilities.SOLID_ROCK,
    Abilities.FLUFFY, Abilities.STURDY, Abilities.BATTLE_ARMOR, Abilities.SHELL_ARMOR,
    Abilities.SHEER_FORCE, Abilities.STRONG_JAW, Abilities.TECHNICIAN, Abilities.SKILL_LINK,
    Abilities.MOXIE, Abilities.SWIFT_SWIM, Abilities.UNBURDEN, Abilities.QUICK_FEET,
    Abilities.DEFIANT, Abilities.COMPETITIVE, Abilities.PRESSURE, Abilities.INNER_FOCUS,
    Abilities.PROTOSYNTHESIS, Abilities.QUARK_DRIVE, Abilities.AS_ONE_GLASTRIER
  ],
  [Type.DRAGON]: [
    Abilities.MULTISCALE, Abilities.SHEER_FORCE, Abilities.MOLD_BREAKER, Abilities.ROUGH_SKIN,
    Abilities.DRAGONS_MAW, Abilities.INTIMIDATE, Abilities.MOXIE, Abilities.PRESSURE,
    Abilities.ADAPTABILITY, Abilities.TECHNICIAN, Abilities.SKILL_LINK, Abilities.STRONG_JAW,
    Abilities.TOUGH_CLAWS, Abilities.RECKLESS, Abilities.HUSTLE, Abilities.MARVEL_SCALE,
    Abilities.SHED_SKIN, Abilities.CLEAR_BODY, Abilities.BATTLE_ARMOR, Abilities.FILTER,
    Abilities.SOLID_ROCK, Abilities.DELTA_STREAM, Abilities.CLOUD_NINE, Abilities.AIR_LOCK,
    Abilities.HYDRATION, Abilities.UNAWARE, Abilities.UNBURDEN, Abilities.INFILTRATOR,
    Abilities.TURBOBLAZE, Abilities.TERAVOLT, Abilities.POWER_CONSTRUCT, Abilities.BEAST_BOOST,
    Abilities.NEUROFORCE
  ],
  [Type.DARK]: [
    Abilities.MOXIE, Abilities.INTIMIDATE, Abilities.UNNERVE, Abilities.DARK_AURA,
    Abilities.BAD_DREAMS, Abilities.PRANKSTER, Abilities.INFILTRATOR, Abilities.STENCH,
    Abilities.PICKPOCKET, Abilities.SHADOW_TAG, Abilities.DEFIANT, Abilities.COMPETITIVE,
    Abilities.SHEER_FORCE, Abilities.ADAPTABILITY, Abilities.TECHNICIAN, Abilities.SNIPER,
    Abilities.RECKLESS, Abilities.BATTLE_ARMOR, Abilities.ROUGH_SKIN, Abilities.IRON_BARBS,
    Abilities.FRISK, Abilities.FOREWARN, Abilities.ANTICIPATION, Abilities.KEEN_EYE,
    Abilities.SUPER_LUCK, Abilities.PRESSURE, Abilities.OBLIVIOUS, Abilities.SUPREME_OVERLORD,
    Abilities.BEAST_BOOST, Abilities.SWORD_OF_RUIN, Abilities.TABLETS_OF_RUIN, Abilities.VESSEL_OF_RUIN,
    Abilities.BEADS_OF_RUIN
  ],
  [Type.FAIRY]: [
    Abilities.PIXILATE, Abilities.FAIRY_AURA, Abilities.MISTY_SURGE, Abilities.CUTE_CHARM,
    Abilities.SWEET_VEIL, Abilities.FLOWER_VEIL, Abilities.FLOWER_GIFT, Abilities.AROMA_VEIL,
    Abilities.MAGIC_GUARD, Abilities.MAGIC_BOUNCE, Abilities.SERENE_GRACE, Abilities.HEALER,
    Abilities.FRIEND_GUARD, Abilities.SYMBIOSIS, Abilities.NATURAL_CURE, Abilities.OBLIVIOUS,
    Abilities.OWN_TEMPO, Abilities.COMPETITIVE, Abilities.ADAPTABILITY, Abilities.SHEER_FORCE,
    Abilities.SKILL_LINK, Abilities.HUGE_POWER, Abilities.GUTS, Abilities.INTREPID_SWORD,
    Abilities.SOUL_HEART, Abilities.DAZZLING, Abilities.QUEENLY_MAJESTY, Abilities.PASTEL_VEIL,
    Abilities.HOSPITALITY, Abilities.SUPERSWEET_SYRUP, Abilities.PRESSURE, Abilities.INTIMIDATE
  ],
};

export function getAbilitiesForTypes(types: Type[]): Abilities[] {
  const uniqueAbilities = new Set<Abilities>();
  for (const type of types) {
    if (TYPE_ABILITY_MAP[type]) {
      for (const ability of TYPE_ABILITY_MAP[type]!) {
        uniqueAbilities.add(ability);
      }
    }
  }
  return Array.from(uniqueAbilities);
}