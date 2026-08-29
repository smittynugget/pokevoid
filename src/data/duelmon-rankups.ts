import { Species } from "#enums/species";
import type BattleScene from "#app/battle-scene.js";
import type { PlayerPokemon } from "#app/field/pokemon.js";
import * as Utils from "#app/utils.js";
import { getPokemonSpecies } from "./pokemon-species";

export const DUELMON_GENERATION: integer = 20;

export const DUELMON_SPECIES: Species[] = [
  Species.ALIEN_MOTHER,
  Species.ALLIGATORS_SWORD_DRAGON,
  Species.ANCIENT_GEAR_BOX,
  Species.ANCIENT_TREE_OF_ENLIGHTENMENT,
  Species.ARCANA_FORCE_I_THE_MAGICIAN,
  Species.ALPHA_THE_MAGNET_WARRIOR,
  Species.ANCIENT_GEAR,
  Species.ANCIENT_GEAR_ENGINEER,
  Species.ANCIENT_GEAR_GOLEM,
  Species.ANCIENT_GEAR_KNIGHT,
  Species.ARCANA_FORCE_IV_THE_EMPEROR,
  Species.ARCANA_FORCE_XVIII_THE_MOON,
  Species.ARCANA_FORCE_VI_THE_LOVERS,
  Species.ARCANA_FORCE_EX_THE_DARK_RULER,
  Species.ARCANA_FORCE_0_THE_FOOL,
  Species.ARCHFIEND_ZOMBIE,
  Species.ARMED_DRAGON_LV3,
  Species.ARMED_DRAGON_LV5,
  Species.ARMED_DRAGON_LV7,
  Species.AVATAR_OF_THE_POT,
  Species.AXE_RAIDER,
  Species.BABY_DRAGON,
  Species.BEAN_SOLDIER,
  Species.BEAVER_WARRIOR,
  Species.BEHEMOTH_THE_KING_OF_ALL_ANIMALS,
  Species.BEIIGE_VANGUARD_OF_DARK_WORLD,
  Species.ABAKI,
  Species.ABARE_USHIONI,
  Species.AGIDO,
  Species.AITSU,
  Species.ALIEN_GREY,
  Species.ALIEN_MARS,
  Species.BETA_THE_MAGNET_WARRIOR,
  Species.BICKURIBOX,
  Species.BIG_JAWS,
  Species.BIO_PLANT,
  Species.BLACK_DRAGONS_CHICK,
  Species.BLACK_LUSTER_SOLDIER,
  Species.BLACK_LUSTER_SOLDIER_ENVOY_OF_THE_BEGINNING,
  Species.BLACK_MAGICIAN_OF_CHAOS,
  Species.BLACK_TYRANNO,
  Species.BLADE_KNIGHT,
  Species.BLAZING_INPACHI,
  Species.BLIZZARD_DRAGON,
  Species.BLOWBACK_DRAGON,
  Species.BLUE_EYES_ALTERNATIVE_WHITE_DRAGON,
  Species.BLUE_EYES_CHAOS_MAX_DRAGON,
  Species.BLUE_EYES_TOON_DRAGON_RENDER,
  Species.BLUE_EYES_ULTIMATE_DRAGON,
  Species.BLUE_EYES_WHITE_DRAGON,
  Species.BOO_KOO,
  Species.BREAKER_THE_MAGICAL_WARRIOR,
  Species.BUSTER_BLADER_DESTRUCTION_SWORDMASTER,
  Species.CAIUS_THE_SHADOW_MONARCH,
  Species.CARD_TROOPER,
  Species.CASTLE_OF_DARK_ILLUSIONS,
  Species.CELTIC_GUARDIAN,
  Species.CHAOS_EMPEROR_DRAGON_ENVOY_OF_THE_END,
  Species.CLAW_REACHER,
  Species.CLOUDIAN_ACID_CLOUD,
  Species.CLOUDIAN_EYE_OF_THE_TYPHOON,
  Species.CLOUDIAN_GHOST_FOG,
  Species.CLOUDIAN_NIMBUSMAN,
  Species.CLOUDIAN_SMOKE_BALL,
  Species.CLOUDIAN_STORM_DRAGON,
  Species.COLOSSAL_FIGHTER,
  Species.COPYCAT,
  Species.CRAB_TURTLE,
  Species.CRYSTAL_BEAST_AMBER_MAMMOTH,
  Species.CRYSTAL_BEAST_EMERALD_TORTOISE,
  Species.CRYSTAL_BEAST_RUBY_CARBUNCLE,
  Species.CRYSTAL_BEAST_TOPAZ_TIGER,
  Species.CURSE_OF_DRAGON,
  Species.CURSE_OF_DRAGONFIRE,
  Species.CYBER_DINOSAUR,
  Species.CYBER_END_DRAGON,
  Species.CYBER_OGRE,
  Species.CYBER_SAURUS,
  Species.CYBER_TECH_ALLIGATOR,
  Species.CYBER_TWIN_DRAGON,
  Species.D_D_CRAZY_BEAST,
  Species.D_D_TRAINER,
  Species.D_D_WARRIOR_LADY,
  Species.DANDYLION,
  Species.DANGER_BIGFOOT,
  Species.DARK_ERADICATOR_WARLOCK,
  Species.DARK_EYES_ILLUSIONIST,
  Species.DARK_MAGICIAN,
  Species.DARK_MAGICIAN_VARIANT_2,
  Species.DARK_MAGICIAN_GIRL_ALTERNATE,
  Species.DARK_NECROFEAR,
  Species.DARK_PALADIN,
  Species.DARK_RESONATOR,
  Species.DARK_RABBIT,
  Species.DARK_RULER_HA_DES,
  Species.DARK_SAGE,
  Species.DARK_WORLD_THORNS,
  Species.DARKFIRE_DRAGON,
  Species.DESPAIR_FROM_THE_DARK,
  Species.DESTINY_HERO_DEFENDER,
  Species.DESTINY_HERO_PLASMA,
  Species.DRAGON_DESTROYER_SWORDSMAN,
  Species.DRAGON_SPIRIT_OF_WHITE,
  Species.DRAGON_ZOMBIE,
  Species.DRILLAGO,
  Species.DUOTERION,
  Species.EARTHBOUND_IMMORTAL_CHACU_CHALLHUA,
  Species.EGYPTIAN_GOD_SLIME,
  Species.ELEMENTAL_HERO_BLADEDGE,
  Species.ELEMENTAL_HERO_BURSTINATRIX,
  Species.ELEMENTAL_HERO_CLAYMAN,
  Species.ELEMENTAL_HERO_FLAME_WINGMAN,
  Species.ELEMENTAL_HERO_NECROSHADE,
  Species.ELEMENTAL_HERO_NEOS_ALT_MASTER_DUEL,
  Species.ELEMENTAL_HERO_NEOS_ALIUS,
  Species.ELEMENTAL_HERO_SPARKMAN,
  Species.ELEMENTAL_HERO_STRATOS,
  Species.ENRAGED_BATTLE_OX,
  Species.EVILSWARM_MANDRAGORA,
  Species.EVILSWARM_SALAMANDRA,
  Species.EXODIA_FULL_BODY,
  Species.EXODIA_NECROSS,
  Species.EXODIA_THE_FORBIDDEN_EVOLUTION,
  Species.EXODIUS_THE_ULTIMATE_FORBIDDEN_LORD,
  Species.FENRIR,
  Species.FERAL_IMP,
  Species.FIEND_KRAKEN,
  Species.FIEND_SWORD,
  Species.FOSSIL_DYNA_PACHYCEPHALO,
  Species.FOSSIL_WARRIOR_SKULL_KING,
  Species.FROST_FLAME_DRAGON,
  Species.FROSTOSAURUS,
  Species.GAGAGIGO,
  Species.GAIA_THE_DRAGON_CHAMPION,
  Species.GAIA_THE_FIERCE_KNIGHT,
  Species.GAMMA_THE_MAGNET_WARRIOR,
  Species.GAZELLE_THE_KING_OF_MYTHICAL_BEASTS,
  Species.GELLENDUO,
  Species.GEM_KNIGHT_CITRINE,
  Species.GEM_KNIGHT_MASTER_DIAMOND,
  Species.GENEX_ALLY_BIRDMAN,
  Species.GHOSTRICK_GHOUL,
  Species.GHOSTRICK_MUMMY,
  Species.GHOSTRICK_SKELETON,
  Species.GHOSTRICK_STEIN,
  Species.GHOSTRICK_YETI,
  Species.GIGA_GAGAGIGO,
  Species.GATE_GUARDIAN,
  Species.GIGOBYTE,
  Species.GOGIGA_GAGAGIGO,
  Species.GOLDEN_EYES_IDOL,
  Species.GRAVEROBBER,
  Species.GREAT_MOTH,
  Species.GREAT_WHITE,
  Species.GREEN_BABOON_DEFENDER_OF_THE_FOREST,
  Species.GREEN_GADGET,
  Species.GRIFFORE,
  Species.GUARDIAN_GRARL,
  Species.HADE_HANE,
  Species.HANE_HANE,
  Species.HARPIES_PET_DRAGON,
  Species.HEADLESS_KNIGHT,
  Species.HITOTSU_ME_GIANT,
  Species.HUMANOID_SLIME,
  Species.HUNDRED_EYES_DRAGON,
  Species.HUNGRY_BURGER,
  Species.HYDROGEDDON,
  Species.HYOZANRYU,
  Species.HYPER_HAMMERHEAD,
  Species.ILLUSIONIST_FACELESS_MAGE,
  Species.JINZO_THE_MACHINE_MENACE,
  Species.JUNK_WARRIOR,
  Species.KAZEJIN,
  Species.KING_OF_THE_SKULL_SERVANTS,
  Species.KOITSU,
  Species.KOZAKY,
  Species.KURIBOH,
  Species.LA_JINN_THE_MYSTICAL_GENIE,
  Species.LAVA_GOLEM,
  Species.LEGENDARY_SWORDSMAN,
  Species.LEVIA_DRAGON_DAEDALUS,
  Species.LORD_OF_D,
  Species.MAGICIANS_ROBE,
  Species.MAGIKURIBOH,
  Species.MASKED_BEAST_DES_GARDIUS,
  Species.MASTER_OF_OZ,
  Species.METEOR_B_DRAGON,
  Species.MILLENNIUM_SCORPION,
  Species.MILLENNIUM_SHIELD,
  Species.MORPHING_JAR,
  Species.MUKA_MUKA,
  Species.NUMBER_22_ZOMBIESTEIN,
  Species.OBELISK_THE_TORMENTOR,
  Species.OCEAN_DRAGON_LORD_KAIRYU_SHIN,
  Species.OJAMA_BLACK_GREEN,
  Species.OJAMA_KING,
  Species.OJAMA_KNIGHT,
  Species.OVERTEX_QOATLUS,
  Species.OXYGEDDON,
  Species.PALADIN_OF_THE_CURSED_DRAGON,
  Species.PALADIN_OF_WHITE_DRAGON,
  Species.PANTHER_WARRIOR,
  Species.PANZER_DRAGON,
  Species.PAPA_CORN,
  Species.PLAGUESPREADER_ZOMBIE,
  Species.QUICKDRAW_SYNCHRON,
  Species.RELINQUISHED,
  Species.SNOWMAN_EATER,
  Species.SOLDIER_OF_CHAOS,
  Species.SOUL_HUNTER,
  Species.SPEED_WARRIOR,
  Species.STEEL_OGRE_GROTTO_1,
  Species.SUIJIN,
  Species.YELLOW_GADGET,
  Species.SUPREME_KING_OF_ARMAGEDDON,
  Species.THE_CREATOR,
  Species.THE_FABLED_CERBURREL,
  Species.THE_FABLED_GANASHIA,
  Species.THE_TRICKY,
  Species.THE_MASKED_BEAST,
  Species.THOUSAND_DRAGON,
  Species.THOUSAND_EYES_RESTRICT,
  Species.TIME_WIZARD_OF_TOMORROW,
  Species.TOGEX,
  Species.YUBEL,
  Species.ZOMBYRA_THE_DARK,
  Species.WOODLAND_SPRITE,
  Species.WATER_DRAGON,
  Species.WATER_DRAGON_CLUSTER,
  Species.VOLCANIC_SHELL,
  Species.TOON_ALLIGATOR,
  Species.TOON_ANCIENT_GEAR_GOLEM,
  Species.TOON_BARREL_DRAGON,
  Species.TOON_BLACK_LUSTER_SOLDIER,
  Species.TOON_DARK_MAGICIAN,
  Species.TOON_DARK_MAGICIAN_GIRL,
  Species.TOON_MASKED_SORCERER,
  Species.TOON_MERMAID,
  Species.TOON_SUMMONED_SKULL,
  Species.TWIN_HEADED_KING_REX,
  Species.ULTIMATE_ANCIENT_GEAR_GOLEM,
  Species.VALKYRION_THE_MAGNET_WARRIOR,
  Species.VOLCANIC_DOOMFIRE,
  Species.VOLCANIC_ROCKET,
  Species.VOLCANIC_HAMMERER,
];
export const DUELMON_SPECIES_IDS: Set<Species> = new Set<Species>(DUELMON_SPECIES);

let _alphabeticalCache: Species[] | null = null;
export function getAlphabeticalDuelmonSpecies(): Species[] {
  if (!_alphabeticalCache) {
    const familyMap = buildDuelmonFamilyMap(DUELMON_SPECIES);
    _alphabeticalCache = [...DUELMON_SPECIES].sort((a, b) => {
      const keyA = familyMap.get(a) ?? Species[a].toLowerCase();
      const keyB = familyMap.get(b) ?? Species[b].toLowerCase();
      if (keyA !== keyB) {
        return keyA.localeCompare(keyB, undefined, { sensitivity: "base" });
      }
      const statsA = getPokemonSpecies(a).baseStats;
      const statsB = getPokemonSpecies(b).baseStats;
      const offA = Math.max(statsA[1], statsA[3]);
      const offB = Math.max(statsB[1], statsB[3]);
      if (offA !== offB) return offA - offB;
      return Species[a].localeCompare(Species[b]);
    });
  }
  return _alphabeticalCache;
}

let _reshapeDebugCache: Species[] | null = null;
export function getReshapeDebugDuelmonSpecies(): Species[] {
  if (!_reshapeDebugCache) {
    _reshapeDebugCache = [...DUELMON_SPECIES].sort((a, b) => {
      const statsA = getPokemonSpecies(a).baseStats;
      const statsB = getPokemonSpecies(b).baseStats;
      const bandA = getDuelmonBstBand(getPokemonSpecies(a).baseTotal);
      const bandB = getDuelmonBstBand(getPokemonSpecies(b).baseTotal);
      if (bandA !== bandB) return bandA - bandB;
      const offA = Math.max(statsA[1], statsA[3]);
      const offB = Math.max(statsB[1], statsB[3]);
      if (offA !== offB) return offA - offB;
      return Species[a].localeCompare(Species[b], undefined, { sensitivity: "base" });
    });
  }
  return _reshapeDebugCache;
}

function buildDuelmonFamilyMap(speciesList: Species[]): Map<Species, string> {
  const result = new Map<Species, string>();
  const names = speciesList.map(s => ({ id: s, tokens: Species[s].toLowerCase().split("_") }));

  const prefixGroups = new Map<string, Species[]>();
  const suffixGroups = new Map<string, Species[]>();

  for (const { id, tokens } of names) {
    for (let k = 1; k < tokens.length; k++) {
      const prefixKey = tokens.slice(0, k).join("_");
      if (!prefixGroups.has(prefixKey)) prefixGroups.set(prefixKey, []);
      prefixGroups.get(prefixKey)!.push(id);
      const suffixKey = tokens.slice(tokens.length - k).join("_");
      if (!suffixGroups.has(suffixKey)) suffixGroups.set(suffixKey, []);
      suffixGroups.get(suffixKey)!.push(id);
    }
  }

  const GENERIC_BLOCKLIST = new Set(["the", "of", "black", "great", "green", "king",
    "dragon", "ancient", "knight", "zombie", "white", "slime", "hane",
    "swordsman", "beast", "golem", "soldier", "guardian"]);
  const MIN_PREFIX_1TOKEN = 3;
  const MAX_SINGLE_SUFFIX_MEMBERS = 6;
  const MIN_PARENT_TO_ABSORB = 4;

  const validPrefix = new Map<string, Species[]>();
  for (const [key, members] of prefixGroups) {
    const tc = key.split("_").length;
    if (members.length < 2) continue;
    if (tc === 1 && (GENERIC_BLOCKLIST.has(key) || members.length < MIN_PREFIX_1TOKEN)) continue;
    validPrefix.set(key, members);
  }
  const validSuffix = new Map<string, Species[]>();
  for (const [key, members] of suffixGroups) {
    const tc = key.split("_").length;
    if (members.length < 2) continue;
    if (tc === 1 && (GENERIC_BLOCKLIST.has(key) || members.length > MAX_SINGLE_SUFFIX_MEMBERS)) continue;
    validSuffix.set(key, members);
  }

  for (const { id, tokens } of names) {
    const myPrefixes: [string, number][] = [];
    for (let k = 1; k <= tokens.length; k++) {
      const key = tokens.slice(0, k).join("_");
      if (validPrefix.has(key)) myPrefixes.push([key, validPrefix.get(key)!.length]);
    }
    const mySuffixes: [string, number][] = [];
    for (let k = 1; k < tokens.length; k++) {
      const key = tokens.slice(tokens.length - k).join("_");
      if (validSuffix.has(key)) mySuffixes.push([key, validSuffix.get(key)!.length]);
    }
    let chosen: string | null = null;
    if (myPrefixes.length) {
      myPrefixes.sort((a, b) => b[1] - a[1] || b[0].split("_").length - a[0].split("_").length || a[0].localeCompare(b[0]));
      let best = myPrefixes[0];
      for (const [pk, ps] of myPrefixes) {
        if (ps >= MIN_PARENT_TO_ABSORB && ps > best[1]) best = [pk, ps];
      }
      chosen = best[0];
    } else if (mySuffixes.length) {
      mySuffixes.sort((a, b) => b[0].split("_").length - a[0].split("_").length || b[1] - a[1] || a[0].localeCompare(b[0]));
      chosen = mySuffixes[0][0];
    }
    if (chosen) result.set(id, chosen);
  }

  for (const { id, tokens } of names) {
    const currentKey = result.get(id);
    const currentSize = currentKey
      ? (validPrefix.get(currentKey)?.length ?? validSuffix.get(currentKey)?.length ?? 0)
      : 0;
    let bestInfixKey: string | null = null;
    let bestInfixSize = 0;
    for (const [fkey, fmembers] of validPrefix) {
      const ftoks = fkey.split("_");
      if (ftoks.length < 2 || fmembers.length <= currentSize || fmembers.length <= bestInfixSize) continue;
      for (let s = 0; s <= tokens.length - ftoks.length; s++) {
        if (tokens.slice(s, s + ftoks.length).join("_") === fkey) {
          bestInfixKey = fkey;
          bestInfixSize = fmembers.length;
          break;
        }
      }
    }
    if (bestInfixKey) result.set(id, bestInfixKey);
  }

  return result;
}

export type DuelmonRankUpDefinition = {
  rankUpLevels: integer[];
  tagsSelf: string[];
  tagsEvoBias: string[];
};

const DEFAULT_RANK_UP_LEVELS: integer[] = [20, 40, 60];

const BAND_LEVEL_RANGES: [number, number][] = [
  [15, 30],
  [20, 45],
  [30, 65],
];

const DUELMON_RANK_UP_BST_CAP = 800;

const DUELMON_RANK_UP_DEFS: Record<number, DuelmonRankUpDefinition> = {
  [Species.ALIEN_MOTHER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "bug", "alien", "mother", "hive", "brood", "parasitic", "telepathic", "queen"], tagsEvoBias: ["alien-mother", "hive", "brood", "parasitic"] },
  [Species.ALLIGATORS_SWORD_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "water", "alligator", "sword", "gator", "swamp", "slicing", "fusion", "predator"], tagsEvoBias: ["alligator", "gator", "swamp", "slicing"] },
  [Species.ANCIENT_GEAR_BOX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "psychic", "ancient", "gear", "box", "supply", "storage", "cache", "maintenance"], tagsEvoBias: ["gear-box", "supply", "storage", "cache"] },
  [Species.ANCIENT_TREE_OF_ENLIGHTENMENT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "psychic", "ancient", "tree", "sage", "enlightenment", "roots", "canopy", "wisdom"], tagsEvoBias: ["tree", "enlightenment", "sage", "roots"] },
  [Species.ARCANA_FORCE_I_THE_MAGICIAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "arcana", "tarot", "mage", "elemental", "magician", "arcane", "enchant"], tagsEvoBias: ["magician", "arcana", "elemental", "enchant"] },
  [Species.ALPHA_THE_MAGNET_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["electric", "steel", "magnet", "alpha", "rock", "field", "polarity", "formation", "commander"], tagsEvoBias: ["magnet", "alpha", "polarity", "formation"] },
  [Species.ANCIENT_GEAR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "ancient", "gear", "machine", "rust", "mechanism", "lock", "heritage", "rusted"], tagsEvoBias: ["ancient", "gear", "machine", "rust"] },
  [Species.ANCIENT_GEAR_ENGINEER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "ancient", "gear", "engineer", "combat", "demolition", "machine", "breaker"], tagsEvoBias: ["engineer", "ancient-gear", "combat", "demolition"] },
  [Species.ANCIENT_GEAR_GOLEM]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "earth", "ancient", "gear", "colossus", "siege", "golem", "machine", "mechanism"], tagsEvoBias: ["ancient", "gear", "golem", "siege"] },
  [Species.ANCIENT_GEAR_KNIGHT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "knight", "ancient", "gear", "blade", "lance", "clockwork", "squire"], tagsEvoBias: ["knight", "gear", "ancient", "clockwork"] },
  [Species.ARCANA_FORCE_IV_THE_EMPEROR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "psychic", "arcana", "tarot", "emperor", "sovereign", "crown", "decree", "dominion"], tagsEvoBias: ["emperor", "arcana", "sovereign", "crown"] },
  [Species.ARCANA_FORCE_XVIII_THE_MOON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fairy", "arcana", "tarot", "moon", "illusion", "deception", "night", "crescent"], tagsEvoBias: ["moon", "illusion", "deception", "night"] },
  [Species.ARCANA_FORCE_VI_THE_LOVERS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "arcana", "tarot", "lovers", "bond", "devotion", "heart", "healing"], tagsEvoBias: ["lovers", "bond", "devotion", "heart"] },
  [Species.ARCANA_FORCE_EX_THE_DARK_RULER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fairy", "arcana", "tarot", "fate", "cosmic", "ruler", "gambit", "decree"], tagsEvoBias: ["arcana-ex", "fate", "cosmic", "decree"] },
  [Species.ARCANA_FORCE_0_THE_FOOL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "arcana", "tarot", "trickster", "luck", "fool", "chaos", "gamble"], tagsEvoBias: ["fool", "tarot", "luck", "chaos"] },
  [Species.ARCHFIEND_ZOMBIE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "archfiend", "zombie", "grave", "rot", "fiend", "curse", "claw"], tagsEvoBias: ["archfiend", "zombie", "grave", "fiend"] },
  [Species.ARMED_DRAGON_LV3]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fighting", "armed", "spike", "juvenile", "lv3", "growth", "scales", "combat"], tagsEvoBias: ["armed", "lv3", "spike", "growth"] },
  [Species.ARMED_DRAGON_LV5]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fighting", "armed", "spike", "lv5", "evolved", "barrage", "discard", "buster"], tagsEvoBias: ["armed", "lv5", "buster", "discard"] },
  [Species.ARMED_DRAGON_LV7]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fighting", "armed", "level", "destroyer", "slicing", "armor", "might", "buster"], tagsEvoBias: ["armed-dragon", "lv7", "destroyer", "buster"] },
  [Species.AVATAR_OF_THE_POT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "psychic", "pot", "greed", "vessel", "sealed", "jar", "ancient", "avarice"], tagsEvoBias: ["pot", "greed", "vessel", "avarice"] },
  [Species.AXE_RAIDER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "fighting", "axe", "raider", "slicing", "berserker", "blade", "warrior", "cleave"], tagsEvoBias: ["axe", "raider", "slicing", "berserker"] },
  [Species.BABY_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fire", "baby", "hatchling", "growth", "time", "thousand", "breath", "joey"], tagsEvoBias: ["hatchling", "growth", "thousand", "time"] },
  [Species.BEAN_SOLDIER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "fighting", "bean", "soldier", "sprout", "blade", "seed", "harvest", "vine"], tagsEvoBias: ["bean", "soldier", "sprout", "harvest"] },
  [Species.BEAVER_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "fighting", "beaver", "gnaw", "dam", "fang", "pelt", "river", "timber"], tagsEvoBias: ["beaver", "gnaw", "dam", "timber"] },
  [Species.BEHEMOTH_THE_KING_OF_ALL_ANIMALS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "ground", "behemoth", "king", "apex", "beast", "primal", "titan", "dominion"], tagsEvoBias: ["behemoth", "king", "apex", "primal"] },
  [Species.BEIIGE_VANGUARD_OF_DARK_WORLD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fighting", "fiend", "vanguard", "dark-world", "discard", "frontline", "slicing", "rage"], tagsEvoBias: ["vanguard", "dark-world", "discard", "frontline"] },
  [Species.ABAKI]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "dark", "demon", "fiend", "flame", "infernal", "hell", "burning", "abaki"], tagsEvoBias: ["abaki", "demon", "infernal", "hell"] },
  [Species.ABARE_USHIONI]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["beast", "dark", "fighting", "oni", "berserker", "fang", "demon", "bull", "rage"], tagsEvoBias: ["oni", "berserker", "bull", "rage"] },
  [Species.AGIDO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "angel", "dice", "luck", "fortune", "gamble", "guardian", "roll"], tagsEvoBias: ["agido", "dice", "angel", "fortune"] },
  [Species.AITSU]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "flying", "combo", "partner", "aitsu", "support", "link", "float", "duo"], tagsEvoBias: ["aitsu", "combo", "partner", "link"] },
  [Species.ALIEN_GREY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "alien", "grey", "counter", "probe", "abduction", "parasitic", "warp"], tagsEvoBias: ["alien", "grey", "counter", "probe"] },
  [Species.ALIEN_MARS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "psychic", "alien", "mars", "counter", "sun", "burn", "heat", "red-planet"], tagsEvoBias: ["mars", "alien", "counter", "burn"] },
  [Species.BETA_THE_MAGNET_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "electric", "beta", "magnet", "polarity", "formation", "static", "magnetic", "rock"], tagsEvoBias: ["beta", "magnet", "polarity", "formation"] },
  [Species.BICKURIBOX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "fiend", "box", "jack", "surprise", "cackle", "trickster", "toy"], tagsEvoBias: ["jack", "box", "surprise", "fiend"] },
  [Species.BIG_JAWS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dark", "jaws", "shark", "predator", "frenzy", "fang", "bite", "abyssal"], tagsEvoBias: ["jaws", "shark", "predator", "frenzy"] },
  [Species.BIO_PLANT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "poison", "plant", "mutant", "bio", "spore", "toxic", "root", "parasitic"], tagsEvoBias: ["mutant", "bio", "parasitic", "spore"] },
  [Species.BLACK_DRAGONS_CHICK]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "dark", "fire", "chick", "hatchling", "redeyes", "infernal", "growth", "baby"], tagsEvoBias: ["chick", "redeyes", "hatchling", "infernal"] },
  [Species.BLACK_LUSTER_SOLDIER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "dark", "luster", "ritual", "chaos", "knight", "sacred", "blade", "soldier"], tagsEvoBias: ["luster", "ritual", "chaos", "soldier"] },
  [Species.BLACK_LUSTER_SOLDIER_ENVOY_OF_THE_BEGINNING]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "fairy", "envoy", "chaos", "beginning", "luster", "banish", "dawn", "legendary"], tagsEvoBias: ["envoy", "chaos", "beginning", "banish"] },
  [Species.BLACK_MAGICIAN_OF_CHAOS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "chaos", "magician", "spellcast", "sorcery", "void", "ritual", "mage"], tagsEvoBias: ["chaos", "magician", "sorcery", "void"] },
  [Species.BLACK_TYRANNO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "dark", "dinosaur", "tyranno", "rex", "predator", "fossil", "jurassic", "rampage"], tagsEvoBias: ["tyranno", "rex", "predator", "jurassic"] },
  [Species.BLADE_KNIGHT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "knight", "blade", "lone", "swordsman", "valor", "slicing", "duelist"], tagsEvoBias: ["blade", "lone", "swordsman", "knight"] },
  [Species.BLAZING_INPACHI]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "rock", "golem", "wooden", "blaze", "inpachi", "wall", "inferno", "pyro"], tagsEvoBias: ["inpachi", "wooden", "blaze", "golem"] },
  [Species.BLIZZARD_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "ice", "blizzard", "frost", "drake", "wing", "breath", "hail", "permafrost"], tagsEvoBias: ["blizzard", "frost", "drake", "hail"] },
  [Species.BLOWBACK_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dark", "machine", "dragon", "cannon", "coin", "barrel", "gunner", "gamble"], tagsEvoBias: ["blowback", "cannon", "coin", "barrel"] },
  [Species.BLUE_EYES_ALTERNATIVE_WHITE_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "psychic", "azure", "alternative", "photon", "radiant", "blue-eyes", "burst", "scales"], tagsEvoBias: ["alternative", "azure", "photon", "burst"] },
  [Species.BLUE_EYES_CHAOS_MAX_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "psychic", "chaos", "ritual", "blue-eyes", "max", "kaiba", "ultimate", "ascension"], tagsEvoBias: ["chaos", "ritual", "blue-eyes", "max"] },
  [Species.BLUE_EYES_TOON_DRAGON_RENDER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fairy", "toon", "blue-eyes", "comic", "ink", "panel", "cartoon", "beam"], tagsEvoBias: ["toon", "blue-eyes", "ink", "comic"] },
  [Species.BLUE_EYES_ULTIMATE_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "steel", "blue-eyes", "ultimate", "fusion", "triple", "laser", "white", "colossus"], tagsEvoBias: ["ultimate", "fusion", "triple", "blue-eyes"] },
  [Species.BLUE_EYES_WHITE_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "flying", "blue-eyes", "white", "azure", "beam", "pressure", "legendary", "dragonlord"], tagsEvoBias: ["blue-eyes", "azure", "white", "beam"] },
  [Species.BOO_KOO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "fairy", "ghost", "boo", "surprise", "trick", "prankster", "mischief", "startle"], tagsEvoBias: ["boo", "surprise", "trick", "startle"] },
  [Species.BREAKER_THE_MAGICAL_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "psychic", "spell", "counter", "breaker", "arcane", "blade", "mana", "knight"], tagsEvoBias: ["spell", "breaker", "counter", "arcane"] },
  [Species.BUSTER_BLADER_DESTRUCTION_SWORDMASTER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "buster", "blader", "destruction", "swordmaster", "slicing", "fusion", "dragonbane"], tagsEvoBias: ["buster", "destruction", "swordmaster", "dragonbane"] },
  [Species.CAIUS_THE_SHADOW_MONARCH]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ghost", "monarch", "shadow", "banish", "exile", "decree", "tribute", "fiend"], tagsEvoBias: ["monarch", "shadow", "banish", "tribute"] },
  [Species.CARD_TROOPER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "machine", "trooper", "turbo", "mill", "overdrive", "data", "circuit", "expendable"], tagsEvoBias: ["trooper", "turbo", "mill", "overdrive"] },
  [Species.CASTLE_OF_DARK_ILLUSIONS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "castle", "fortress", "illusion", "floating", "zombie", "shadow", "rampart"], tagsEvoBias: ["castle", "illusion", "fortress", "floating"] },
  [Species.CELTIC_GUARDIAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "fairy", "elf", "celtic", "guardian", "slicing", "noble", "forest", "yugi"], tagsEvoBias: ["celtic", "elf", "guardian", "noble"] },
  [Species.CHAOS_EMPEROR_DRAGON_ENVOY_OF_THE_END]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "dark", "chaos", "emperor", "envoy", "annihilation", "banned", "sacrifice", "end"], tagsEvoBias: ["chaos", "emperor", "envoy", "annihilation"] },
  [Species.CLAW_REACHER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fighting", "claw", "hook", "reacher", "predator", "ambush", "grip", "toxic"], tagsEvoBias: ["claw", "reacher", "predator", "ambush"] },
  [Species.CLOUDIAN_ACID_CLOUD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["poison", "flying", "cloud", "acid", "corrosive", "rain", "mist", "vapor", "cloudian"], tagsEvoBias: ["acid", "cloud", "corrosive", "cloudian"] },
  [Species.CLOUDIAN_EYE_OF_THE_TYPHOON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "water", "cloudian", "typhoon", "storm", "rain", "cyclone", "wind", "eye"], tagsEvoBias: ["typhoon", "cloudian", "storm", "cyclone"] },
  [Species.CLOUDIAN_GHOST_FOG]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "flying", "fog", "spectral", "mist", "haunting", "phantom", "wisp", "cloudian"], tagsEvoBias: ["fog", "spectral", "haunting", "phantom"] },
  [Species.CLOUDIAN_NIMBUSMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "fighting", "nimbus", "storm", "cloud", "cumulus", "rain", "torrent", "cloudian"], tagsEvoBias: ["nimbus", "storm", "cumulus", "cloudian"] },
  [Species.CLOUDIAN_SMOKE_BALL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "fairy", "smoke", "puff", "haze", "mist", "tiny", "cloudian", "wisp"], tagsEvoBias: ["smoke", "puff", "haze", "cloudian"] },
  [Species.CLOUDIAN_STORM_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "cloudian", "storm", "rain", "thunder", "aqua", "cloud", "surge"], tagsEvoBias: ["storm", "cloudian", "thunder", "rain"] },
  [Species.COLOSSAL_FIGHTER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "steel", "colossal", "synchro", "punching", "giant", "legacy", "graveyard", "undying"], tagsEvoBias: ["colossal", "synchro", "legacy", "undying"] },
  [Species.COPYCAT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "psychic", "mimic", "copy", "mirror", "trickster", "impostor", "disguise", "doppelganger"], tagsEvoBias: ["mimic", "copy", "impostor", "trickster"] },
  [Species.CRAB_TURTLE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "rock", "crab", "turtle", "shell", "fortress", "ritual", "armor", "ancient"], tagsEvoBias: ["crab", "turtle", "shell", "fortress"] },
  [Species.CRYSTAL_BEAST_AMBER_MAMMOTH]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "ice", "crystal", "beast", "amber", "mammoth", "guardian", "protector", "tusk"], tagsEvoBias: ["amber", "mammoth", "crystal-beast", "guardian"] },
  [Species.CRYSTAL_BEAST_EMERALD_TORTOISE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "rock", "emerald", "crystal", "tortoise", "shell", "fortress", "gem", "beast"], tagsEvoBias: ["emerald", "tortoise", "crystal", "shell"] },
  [Species.CRYSTAL_BEAST_RUBY_CARBUNCLE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "rock", "ruby", "crystal", "carbuncle", "gem", "radiance", "sparkle", "beast"], tagsEvoBias: ["ruby", "carbuncle", "radiance", "crystal"] },
  [Species.CRYSTAL_BEAST_TOPAZ_TIGER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["electric", "rock", "topaz", "tiger", "crystal", "fang", "pounce", "gem", "beast"], tagsEvoBias: ["topaz", "tiger", "crystal", "pounce"] },
  [Species.CURSE_OF_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "dark", "curse", "drake", "undead", "hex", "wings", "yugi", "spectral"], tagsEvoBias: ["curse", "drake", "hex", "undead"] },
  [Species.CURSE_OF_DRAGONFIRE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fire", "curse", "infernal", "hellfire", "dragonfire", "hex", "flame", "dark"], tagsEvoBias: ["curse", "dragonfire", "infernal", "hellfire"] },
  [Species.CYBER_DINOSAUR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "cyber", "dinosaur", "mecha", "titanium", "dino", "overclock", "machine"], tagsEvoBias: ["cyber", "dinosaur", "mecha", "titanium"] },
  [Species.CYBER_END_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "cyber", "end", "fusion", "triple", "overload", "annihilation", "machine"], tagsEvoBias: ["end", "fusion", "triple", "annihilation"] },
  [Species.CYBER_OGRE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "cyber", "ogre", "machine", "punching", "piston", "muscle", "overclock"], tagsEvoBias: ["cyber", "ogre", "piston", "muscle"] },
  [Species.CYBER_SAURUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "rock", "cyber", "saurus", "dinosaur", "fossil", "mech", "dino", "biting"], tagsEvoBias: ["cyber", "saurus", "fossil", "mech"] },
  [Species.CYBER_TECH_ALLIGATOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "cyber", "alligator", "tech", "gator", "augment", "predator", "biting"], tagsEvoBias: ["cyber", "alligator", "tech", "gator"] },
  [Species.CYBER_TWIN_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "cyber", "twin", "fusion", "machine", "overcharge", "double", "barrel"], tagsEvoBias: ["cyber", "twin", "fusion", "double"] },
  [Species.D_D_CRAZY_BEAST]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "dimension", "warp", "void", "phase", "slip", "exchange", "panic"], tagsEvoBias: ["dimension", "warp", "void", "exchange"] },
  [Species.D_D_TRAINER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "normal", "dimension", "trainer", "warp", "mentor", "recall", "gate", "dd"], tagsEvoBias: ["trainer", "dimension", "warp", "mentor"] },
  [Species.D_D_WARRIOR_LADY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "psychic", "dimension", "void", "banish", "exile", "phase", "rift", "dd"], tagsEvoBias: ["dimension", "banish", "exile", "phase"] },
  [Species.DANDYLION]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "fairy", "dandy", "pollen", "fluff", "seed", "bloom", "cotton", "lion"], tagsEvoBias: ["dandy", "pollen", "fluff", "bloom"] },
  [Species.DANGER_BIGFOOT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ground", "danger", "bigfoot", "cryptid", "legend", "stomp", "footprint", "urban"], tagsEvoBias: ["bigfoot", "cryptid", "legend", "footprint"] },
  [Species.DARK_ERADICATOR_WARLOCK]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "psychic", "warlock", "eradication", "spell", "hex", "inferno", "purge", "mana"], tagsEvoBias: ["warlock", "eradication", "purge", "hex"] },
  [Species.DARK_EYES_ILLUSIONIST]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "illusion", "gaze", "mirage", "phantom", "eye", "mesmeric", "trickster"], tagsEvoBias: ["illusion", "gaze", "mirage", "mesmeric"] },
  [Species.DARK_MAGICIAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "ghost", "dark", "magician", "ritual", "spellcraft", "arcane", "counterspell", "ward"], tagsEvoBias: ["spellcraft", "ritual", "counterspell", "magician"] },
  [Species.DARK_MAGICIAN_VARIANT_2]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "ghost", "dark", "magician", "ritual", "spellcraft", "arcane", "counterspell", "ward"], tagsEvoBias: ["spellcraft", "ritual", "counterspell", "magician"] },
  [Species.DARK_MAGICIAN_GIRL_ALTERNATE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "fairy", "apprentice", "charm", "formula", "enchantress", "burning", "dimension", "magician"], tagsEvoBias: ["apprentice", "charm", "formula", "enchantress"] },
  [Species.DARK_NECROFEAR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ghost", "necro", "possession", "doll", "grudge", "fiend", "curse", "malice"], tagsEvoBias: ["necro", "possession", "doll", "grudge"] },
  [Species.DARK_PALADIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dragon", "paladin", "fusion", "negate", "dragonslayer", "oath", "spell", "buster"], tagsEvoBias: ["paladin", "fusion", "negate", "dragonslayer"] },
  [Species.DARK_RESONATOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "steel", "resonator", "tuner", "synchro", "vibration", "echo", "fiend", "support"], tagsEvoBias: ["resonator", "tuner", "synchro", "echo"] },
  [Species.DARK_RABBIT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fairy", "rabbit", "bunny", "hop", "burrow", "mischief", "moon", "thief"], tagsEvoBias: ["rabbit", "burrow", "mischief", "moon"] },
  [Species.DARK_RULER_HA_DES]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ghost", "hades", "ruler", "underworld", "hellfire", "soul", "fiend", "decree"], tagsEvoBias: ["hades", "ruler", "underworld", "hellfire"] },
  [Species.DARK_SAGE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "sage", "ancient", "millennium", "prophecy", "elder", "wisdom", "timeless"], tagsEvoBias: ["sage", "ancient", "millennium", "wisdom"] },
  [Species.DARK_WORLD_THORNS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "dark", "thorn", "briar", "vine", "root", "spike", "venom", "dark-world"], tagsEvoBias: ["dark-world", "thorn", "briar", "root"] },
  [Species.DARKFIRE_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fire", "dark", "darkfire", "fusion", "infernal", "shadow", "flame", "obsidian"], tagsEvoBias: ["darkfire", "fusion", "infernal", "shadow"] },
  [Species.DESPAIR_FROM_THE_DARK]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "zombie", "despair", "graveyard", "revenant", "undead", "wrath", "terror"], tagsEvoBias: ["despair", "graveyard", "revenant", "undead"] },
  [Species.DESTINY_HERO_DEFENDER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "hero", "destiny", "defender", "fortress", "shield", "wall", "guardian"], tagsEvoBias: ["destiny", "defender", "fortress", "shield"] },
  [Species.DESTINY_HERO_PLASMA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "dragon", "hero", "destiny", "plasma", "absorption", "vampire", "negation", "villain"], tagsEvoBias: ["plasma", "absorption", "destiny", "vampire"] },
  [Species.DRAGON_DESTROYER_SWORDSMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "destroyer", "buster", "dragonbane", "blade", "slayer", "vortex", "fusion"], tagsEvoBias: ["destroyer", "buster", "dragonbane", "slayer"] },
  [Species.DRAGON_SPIRIT_OF_WHITE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fairy", "spirit", "white", "blue-eyes", "holy", "purify", "banish", "divine"], tagsEvoBias: ["spirit", "white", "blue-eyes", "purify"] },
  [Species.DRAGON_ZOMBIE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "ghost", "zombie", "undead", "necro", "grave", "rot", "coffin", "horror"], tagsEvoBias: ["zombie", "necro", "grave", "coffin"] },
  [Species.DRILLAGO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "ground", "drill", "pierce", "bore", "machine", "spin", "spiral", "mole"], tagsEvoBias: ["drill", "pierce", "bore", "spiral"] },
  [Species.DUOTERION]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "psychic", "aqua", "dual", "phase", "flow", "mind", "adaptive", "shifting"], tagsEvoBias: ["dual", "phase", "flow", "shifting"] },
  [Species.EARTHBOUND_IMMORTAL_CHACU_CHALLHUA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dark", "earthbound", "immortal", "abyssal", "leviathan", "tidal", "whale", "fiend"], tagsEvoBias: ["earthbound", "immortal", "abyssal", "leviathan"] },
  [Species.EGYPTIAN_GOD_SLIME]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dark", "slime", "divine", "vessel", "god", "egyptian", "absorb", "eternal"], tagsEvoBias: ["divine", "vessel", "god-slime", "egyptian"] },
  [Species.ELEMENTAL_HERO_BLADEDGE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "blade", "edge", "hero", "slicing", "piercing", "aerial", "elemental"], tagsEvoBias: ["bladedge", "hero", "slicing", "piercing"] },
  [Species.ELEMENTAL_HERO_BURSTINATRIX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "fighting", "hero", "elemental", "burstinatrix", "heroine", "blaze", "burst", "jaden"], tagsEvoBias: ["burstinatrix", "burst", "heroine", "elemental"] },
  [Species.ELEMENTAL_HERO_CLAYMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ground", "fighting", "clay", "fortress", "hero", "mud", "earthen", "rock", "elemental"], tagsEvoBias: ["clay", "fortress", "earthen", "clayman"] },
  [Species.ELEMENTAL_HERO_FLAME_WINGMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "flying", "hero", "elemental", "wingman", "flame", "justice", "combo", "fusion"], tagsEvoBias: ["wingman", "elemental", "hero", "justice"] },
  [Species.ELEMENTAL_HERO_NECROSHADE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "fighting", "necro", "shade", "spectral", "hero", "spirit", "undying", "elemental"], tagsEvoBias: ["necro", "shade", "spectral", "undying"] },
  [Species.ELEMENTAL_HERO_NEOS_ALT_MASTER_DUEL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "psychic", "neos", "cosmic", "space", "hero", "force", "resolve", "elemental"], tagsEvoBias: ["neos", "cosmic", "space", "force"] },
  [Species.ELEMENTAL_HERO_NEOS_ALIUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "psychic", "neos", "gemini", "alius", "hero", "awakening", "dual", "elemental"], tagsEvoBias: ["neos", "gemini", "alius", "awakening"] },
  [Species.ELEMENTAL_HERO_SPARKMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["electric", "fighting", "spark", "lightning", "hero", "circuit", "flash", "shock", "elemental"], tagsEvoBias: ["spark", "lightning", "circuit", "flash"] },
  [Species.ELEMENTAL_HERO_STRATOS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "fighting", "stratos", "wind", "gale", "turbine", "hero", "tailwind", "elemental"], tagsEvoBias: ["stratos", "wind", "gale", "turbine"] },
  [Species.ENRAGED_BATTLE_OX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "steel", "ox", "enraged", "battle", "horn", "stampede", "rage", "iron"], tagsEvoBias: ["ox", "enraged", "stampede", "horn"] },
  [Species.EVILSWARM_MANDRAGORA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "grass", "evilswarm", "mandragora", "corruption", "plant", "swarm", "root", "vine"], tagsEvoBias: ["evilswarm", "mandragora", "corruption", "swarm"] },
  [Species.EVILSWARM_SALAMANDRA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fire", "evilswarm", "salamandra", "corruption", "lizard", "flame", "swarm", "dino"], tagsEvoBias: ["evilswarm", "salamandra", "corruption", "flame"] },
  [Species.EXODIA_FULL_BODY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "exodia", "forbidden", "obliterate", "seal", "five", "limb", "legendary"], tagsEvoBias: ["exodia", "forbidden", "obliterate", "seal"] },
  [Species.EXODIA_NECROSS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "exodia", "necross", "forbidden", "relic", "curse", "chain", "seal"], tagsEvoBias: ["exodia", "necross", "forbidden", "relic"] },
  [Species.EXODIA_THE_FORBIDDEN_EVOLUTION]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "exodia", "forbidden", "evolution", "inferno", "chain", "evolved", "finale"], tagsEvoBias: ["evolution", "forbidden", "inferno", "finale"] },
  [Species.EXODIUS_THE_ULTIMATE_FORBIDDEN_LORD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "psychic", "exodius", "forbidden", "ultimate", "lord", "assembly", "decree", "exile"], tagsEvoBias: ["exodius", "ultimate", "lord", "assembly"] },
  [Species.FENRIR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ice", "dark", "fenrir", "wolf", "frost", "predator", "fang", "hunt", "norse"], tagsEvoBias: ["fenrir", "wolf", "frost", "predator"] },
  [Species.FERAL_IMP]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "electric", "imp", "mischief", "fiend", "zap", "trickster", "venom", "scratch"], tagsEvoBias: ["imp", "mischief", "fiend", "trickster"] },
  [Species.FIEND_KRAKEN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dark", "kraken", "tentacle", "ink", "abyssal", "fiend", "squid", "deep"], tagsEvoBias: ["kraken", "tentacle", "abyssal", "ink"] },
  [Species.FIEND_SWORD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "steel", "fiend", "blade", "demon", "cursed", "slash", "edge", "sword"], tagsEvoBias: ["fiend", "blade", "demon", "cursed"] },
  [Species.FOSSIL_DYNA_PACHYCEPHALO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "fighting", "fossil", "dino", "headbutt", "ancient", "pachycephalo", "extinction", "skull"], tagsEvoBias: ["fossil", "pachycephalo", "headbutt", "extinction"] },
  [Species.FOSSIL_WARRIOR_SKULL_KING]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "ghost", "fossil", "skull", "king", "bone", "ancient", "tomb", "warrior"], tagsEvoBias: ["fossil", "skull", "king", "bone"] },
  [Species.FROST_FLAME_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fire", "ice", "frost", "flame", "dual", "thermal", "elemental", "equilibrium"], tagsEvoBias: ["frost-flame", "dual", "thermal", "elemental"] },
  [Species.FROSTOSAURUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ice", "rock", "dinosaur", "frostosaurus", "permafrost", "ancient", "glacier", "tundra", "fossil"], tagsEvoBias: ["frostosaurus", "permafrost", "glacier", "tundra"] },
  [Species.GAGAGIGO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "reptile", "gagagigo", "journey", "lizard", "swamp", "giga", "evolving", "warrior"], tagsEvoBias: ["gagagigo", "reptile", "journey", "swamp"] },
  [Species.GAIA_THE_DRAGON_CHAMPION]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fighting", "gaia", "champion", "lance", "gallop", "spiral", "rider", "knight"], tagsEvoBias: ["gaia", "champion", "spiral", "gallop"] },
  [Species.GAIA_THE_FIERCE_KNIGHT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "steel", "gaia", "knight", "lance", "fierce", "charge", "joust", "dragoon"], tagsEvoBias: ["gaia", "lance", "fierce", "charge"] },
  [Species.GAMMA_THE_MAGNET_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "electric", "magnet", "gamma", "formation", "magnetic", "polarity", "warrior", "shield"], tagsEvoBias: ["gamma", "magnet", "formation", "polarity"] },
  [Species.GAZELLE_THE_KING_OF_MYTHICAL_BEASTS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "gazelle", "mythical", "king", "royal", "mystic", "hooves", "veil"], tagsEvoBias: ["gazelle", "mythical", "royal", "king"] },
  [Species.GELLENDUO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "twin", "gellenduo", "divine", "angel", "spirit", "harmony", "celestial", "pure"], tagsEvoBias: ["gellenduo", "twin", "divine", "celestial"] },
  [Species.GEM_KNIGHT_CITRINE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "fire", "gem", "knight", "citrine", "fusion", "crystal", "blaze", "gem-knight"], tagsEvoBias: ["citrine", "gem-knight", "crystal", "fusion"] },
  [Species.GEM_KNIGHT_MASTER_DIAMOND]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "fairy", "gem", "diamond", "master", "knight", "crystal", "brilliant", "gem-knight"], tagsEvoBias: ["diamond", "master", "gem-knight", "brilliant"] },
  [Species.GENEX_ALLY_BIRDMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "flying", "genex", "birdman", "wing", "tailwind", "machine", "feather", "ally"], tagsEvoBias: ["genex", "birdman", "wing", "tailwind"] },
  [Species.GHOSTRICK_GHOUL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "ghostrick", "ghoul", "scare", "trick", "night", "spectral", "ambush"], tagsEvoBias: ["ghostrick", "ghoul", "scare", "ambush"] },
  [Species.GHOSTRICK_MUMMY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "ground", "mummy", "ghostrick", "tomb", "bandage", "cursed", "ancient", "wrap"], tagsEvoBias: ["mummy", "tomb", "bandage", "wrap"] },
  [Species.GHOSTRICK_SKELETON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "ghostrick", "skeleton", "bone", "trick", "rattle", "spectral", "skull", "trickster"], tagsEvoBias: ["skeleton", "bone", "rattle", "trickster"] },
  [Species.GHOSTRICK_STEIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "electric", "ghostrick", "franken", "stein", "bolt", "stitch", "undead", "brute"], tagsEvoBias: ["franken", "stein", "bolt", "stitch"] },
  [Species.GHOSTRICK_YETI]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "ice", "ghostrick", "yeti", "frost", "spectral", "blizzard", "hail", "avalanche"], tagsEvoBias: ["yeti", "frost", "hail", "avalanche"] },
  [Species.GIGA_GAGAGIGO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "fighting", "gagagigo", "giga", "reptile", "evolved", "predator", "lizard", "surge"], tagsEvoBias: ["giga", "gagagigo", "evolved", "predator"] },
  [Species.GATE_GUARDIAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["electric", "flying", "water", "gate", "guardian", "sanga", "suijin", "kazejin", "fusion"], tagsEvoBias: ["gate", "guardian", "sanga", "tri-element"] },
  [Species.GIGOBYTE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "gigobyte", "giga", "byte", "bite", "fang", "current", "abyss"], tagsEvoBias: ["gigobyte", "byte", "current", "abyss"] },
  [Species.GOGIGA_GAGAGIGO]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "gogiga", "gagagigo", "reptile", "evolution", "berserker", "fang", "giga"], tagsEvoBias: ["gogiga", "gagagigo", "evolution", "giga"] },
  [Species.GOLDEN_EYES_IDOL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "psychic", "golden", "idol", "gaze", "prophecy", "curse", "mind", "fiend"], tagsEvoBias: ["golden", "idol", "gaze", "prophecy"] },
  [Species.GRAVEROBBER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "thief", "graverobber", "fiend", "snatch", "pickpocket", "shadow", "heist", "escape"], tagsEvoBias: ["graverobber", "thief", "snatch", "pickpocket"] },
  [Species.GREAT_MOTH]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["bug", "poison", "moth", "insect", "toxic", "scale", "cocoon", "dust", "weevil"], tagsEvoBias: ["moth", "toxic", "scale", "cocoon"] },
  [Species.GREAT_WHITE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "shark", "predator", "frenzy", "bite", "ocean", "apex", "fin", "hunter"], tagsEvoBias: ["shark", "predator", "bite", "ocean"] },
  [Species.GREEN_BABOON_DEFENDER_OF_THE_FOREST]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "fighting", "baboon", "beast", "forest", "guardian", "primate", "territorial", "defender"], tagsEvoBias: ["baboon", "forest", "guardian", "primate"] },
  [Species.GREEN_GADGET]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "grass", "gadget", "gear", "machine", "circuit", "green", "modular", "trio"], tagsEvoBias: ["gadget", "gear", "circuit", "green"] },
  [Species.GRIFFORE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "normal", "griffin", "raptor", "predator", "talon", "hunter", "beast", "aerial"], tagsEvoBias: ["griffin", "raptor", "predator", "talon"] },
  [Species.GUARDIAN_GRARL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fighting", "guardian", "grarl", "axe", "dino", "primal", "slicing", "edge"], tagsEvoBias: ["guardian", "grarl", "axe", "primal"] },
  [Species.HADE_HANE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "flying", "fiend", "spirit", "bounce", "flip", "ethereal", "banish", "wind"], tagsEvoBias: ["spirit", "bounce", "flip", "ethereal"] },
  [Species.HANE_HANE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "flying", "hane", "bounce", "spring", "feather", "return", "trick", "toss"], tagsEvoBias: ["hane", "bounce", "spring", "return"] },
  [Species.HARPIES_PET_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "flying", "harpie", "pet", "flame", "storm", "feral", "wind", "bond"], tagsEvoBias: ["harpie", "pet", "feral", "storm"] },
  [Species.HEADLESS_KNIGHT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "steel", "knight", "dullahan", "cursed", "headless", "armor", "rider", "lance"], tagsEvoBias: ["dullahan", "headless", "knight", "cursed"] },
  [Species.HITOTSU_ME_GIANT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "fighting", "cyclops", "giant", "hitotsu", "eye", "boulder", "titan", "punch"], tagsEvoBias: ["cyclops", "hitotsu", "eye", "titan"] },
  [Species.HUMANOID_SLIME]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "poison", "slime", "humanoid", "ooze", "acid", "toxic", "gelatinous", "reform"], tagsEvoBias: ["slime", "humanoid", "ooze", "gelatinous"] },
  [Species.HUNDRED_EYES_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "dark", "hundred-eyes", "synchro", "absorb", "gaze", "all-seeing", "shadow", "dread"], tagsEvoBias: ["hundred-eyes", "synchro", "absorb", "gaze"] },
  [Species.HUNGRY_BURGER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "dark", "hungry", "burger", "devour", "chomp", "feast", "grease", "consume"], tagsEvoBias: ["hungry", "burger", "devour", "chomp"] },
  [Species.HYDROGEDDON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "rock", "hydrogeddon", "hydrogen", "dino", "fossil", "chain", "ram", "pressurize"], tagsEvoBias: ["hydrogeddon", "hydrogen", "chain", "fossil"] },
  [Species.HYOZANRYU]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "ice", "hyozanryu", "diamond", "crystal", "glacier", "prism", "frozen", "scales"], tagsEvoBias: ["hyozanryu", "diamond", "crystal", "glacier"] },
  [Species.HYPER_HAMMERHEAD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "fighting", "hammerhead", "hyper", "dino", "skull", "ram", "headbutt", "return"], tagsEvoBias: ["hammerhead", "hyper", "skull", "ram"] },
  [Species.ILLUSIONIST_FACELESS_MAGE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "ghost", "faceless", "mage", "illusion", "mask", "phantom", "mirror", "deception"], tagsEvoBias: ["faceless", "illusion", "mage", "phantom"] },
  [Species.JINZO_THE_MACHINE_MENACE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "steel", "jinzo", "menace", "android", "overclock", "trap", "negate", "terror"], tagsEvoBias: ["menace", "overclock", "terror", "negate"] },
  [Species.JUNK_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "fighting", "junk", "synchro", "scrap", "underdog", "punch", "recycled", "warrior-bond"], tagsEvoBias: ["junk", "synchro", "scrap", "underdog"] },
  [Species.KAZEJIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["flying", "psychic", "kazejin", "wind", "gale", "barrier", "guardian", "storm", "cyclone"], tagsEvoBias: ["kazejin", "gale", "barrier", "cyclone"] },
  [Species.KING_OF_THE_SKULL_SERVANTS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "skull", "bone", "servant", "king", "warlord", "horde", "necro"], tagsEvoBias: ["skull", "servant", "bone", "king"] },
  [Species.KOITSU]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "koitsu", "spirit", "combo", "lucky", "link", "charm", "sacrifice", "poke"], tagsEvoBias: ["koitsu", "spirit", "combo", "lucky"] },
  [Species.KOZAKY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "poison", "kozaky", "goblin", "mad", "scientist", "experiment", "toxic", "bomb"], tagsEvoBias: ["kozaky", "goblin", "mad", "experiment"] },
  [Species.KURIBOH]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "kuriboh", "mascot", "fuzz", "puff", "shield", "cute", "charm", "luck"], tagsEvoBias: ["kuriboh", "puff", "shield", "fuzz"] },
  [Species.LA_JINN_THE_MYSTICAL_GENIE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "lajinn", "genie", "lamp", "wish", "mystic", "smoke", "seal"], tagsEvoBias: ["lajinn", "genie", "lamp", "wish"] },
  [Species.LAVA_GOLEM]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "rock", "lava", "golem", "molten", "volcano", "cinder", "ashen", "pressure"], tagsEvoBias: ["lava", "golem", "molten", "volcano"] },
  [Species.LEGENDARY_SWORDSMAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "steel", "swordsman", "blade", "legend", "slicing", "peerless", "honor", "duel"], tagsEvoBias: ["swordsman", "blade", "legend", "peerless"] },
  [Species.LEVIA_DRAGON_DAEDALUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "leviathan", "sea-serpent", "ocean", "daedalus", "tidal", "abyss", "destroy"], tagsEvoBias: ["leviathan", "daedalus", "ocean", "sea-serpent"] },
  [Species.LORD_OF_D]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "dark", "lord", "commander", "flute", "protector", "summoner", "decree", "shield"], tagsEvoBias: ["lord-of-d", "flute", "commander", "summoner"] },
  [Species.MAGICIANS_ROBE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "magician", "robe", "arcane", "shroud", "weave", "garment", "reflect"], tagsEvoBias: ["robe", "arcane", "shroud", "garment"] },
  [Species.MAGIKURIBOH]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "psychic", "kuriboh", "fluff", "magic", "cute", "sacrifice", "puff", "enchant"], tagsEvoBias: ["kuriboh", "fluff", "sacrifice", "magic"] },
  [Species.MASKED_BEAST_DES_GARDIUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ghost", "mask", "ritual", "fiend", "death", "curse", "terror", "gardius"], tagsEvoBias: ["mask", "ritual", "gardius", "death"] },
  [Species.MASTER_OF_OZ]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "fighting", "oz", "outback", "titan", "punch", "beast", "king", "mega"], tagsEvoBias: ["oz", "outback", "titan", "punch"] },
  [Species.METEOR_B_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "dragon", "meteor", "impact", "crash", "orbital", "space", "star", "trail"], tagsEvoBias: ["meteor", "impact", "orbital", "space"] },
  [Species.MILLENNIUM_SCORPION]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["bug", "dark", "millennium", "scorpion", "venom", "pincer", "growth", "exo", "ambush"], tagsEvoBias: ["scorpion", "venom", "pincer", "growth"] },
  [Species.MILLENNIUM_SHIELD]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "psychic", "millennium", "shield", "fortress", "sacred", "barrier", "counter", "eternal"], tagsEvoBias: ["millennium", "shield", "fortress", "sacred"] },
  [Species.MORPHING_JAR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "psychic", "morphing", "jar", "morph", "disruption", "swap", "seal", "reset"], tagsEvoBias: ["morphing", "jar", "disruption", "swap"] },
  [Species.MUKA_MUKA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["rock", "muka", "variable", "growth", "scaling", "stone", "earth", "quake", "slam"], tagsEvoBias: ["muka", "variable", "growth", "scaling"] },
  [Species.NUMBER_22_ZOMBIESTEIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "steel", "zombie", "xyz", "number", "undead", "golem", "frankenstein", "colossus"], tagsEvoBias: ["zombiestein", "undead", "number", "frankenstein"] },
  [Species.OBELISK_THE_TORMENTOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "rock", "obelisk", "god", "divine", "tormentor", "titan", "egyptian", "colossus"], tagsEvoBias: ["obelisk", "tormentor", "god", "divine"] },
  [Species.OCEAN_DRAGON_LORD_KAIRYU_SHIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "sea", "ocean", "lord", "serpent", "leviathan", "aquatic", "tide"], tagsEvoBias: ["ocean", "dragon", "sea", "lord"] },
  [Species.OJAMA_BLACK_GREEN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "fairy", "ojama", "black", "annoy", "trio", "delta", "nuisance", "link"], tagsEvoBias: ["ojama", "black", "annoy", "trio"] },
  [Species.OJAMA_KING]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "fairy", "ojama", "king", "fusion", "zone", "country", "lock", "slam"], tagsEvoBias: ["ojama", "king", "fusion", "zone"] },
  [Species.OJAMA_KNIGHT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["normal", "steel", "ojama", "knight", "fusion", "country", "resolve", "lance", "guard"], tagsEvoBias: ["ojama", "knight", "fusion", "resolve"] },
  [Species.OVERTEX_QOATLUS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "flying", "overtex", "qoatlus", "prehistoric", "wing", "fossil", "ancient", "storm"], tagsEvoBias: ["overtex", "qoatlus", "prehistoric", "ancient"] },
  [Species.OXYGEDDON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["poison", "dragon", "oxygeddon", "chemical", "acid", "gas", "oxidize", "volatile", "breath"], tagsEvoBias: ["oxygeddon", "chemical", "oxidize", "volatile"] },
  [Species.PALADIN_OF_THE_CURSED_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "ghost", "paladin", "cursed", "rider", "undead", "lance", "zombie", "hex"], tagsEvoBias: ["cursed-paladin", "rider", "undead", "lance"] },
  [Species.PALADIN_OF_WHITE_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fairy", "paladin", "white", "holy", "lance", "rider", "sacred", "blue-eyes"], tagsEvoBias: ["white-paladin", "holy", "lance", "sacred"] },
  [Species.PANTHER_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fighting", "panther", "sacrifice", "predator", "blood", "feral", "beast-warrior", "fang"], tagsEvoBias: ["panther", "sacrifice", "blood-price", "predator"] },
  [Species.PANZER_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dragon", "panzer", "tank", "cannon", "armored", "machine", "artillery", "explosive"], tagsEvoBias: ["panzer", "tank", "cannon", "armored"] },
  [Species.PAPA_CORN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "normal", "papa", "corn", "harvest", "seed", "pop", "kernel", "father"], tagsEvoBias: ["papa", "corn", "harvest", "pop"] },
  [Species.PLAGUESPREADER_ZOMBIE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "poison", "plaguespreader", "zombie", "plague", "viral", "rot", "tuner", "recur"], tagsEvoBias: ["plaguespreader", "plague", "viral", "recur"] },
  [Species.QUICKDRAW_SYNCHRON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "normal", "synchron", "tuner", "quickdraw", "gunslinger", "speed", "bullet", "cowboy"], tagsEvoBias: ["quickdraw", "synchron", "gunslinger", "tuner"] },
  [Species.RELINQUISHED]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "psychic", "relinquished", "absorb", "soul", "void", "puppet", "eye", "ritual"], tagsEvoBias: ["relinquished", "absorb", "soul", "puppet"] },
  [Species.SNOWMAN_EATER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ice", "dark", "snowman", "eater", "ambush", "frozen", "devour", "frost", "permafrost"], tagsEvoBias: ["snowman", "eater", "ambush", "devour"] },
  [Species.SOLDIER_OF_CHAOS]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fighting", "chaos", "soldier", "commander", "blade", "war", "link", "adaptive"], tagsEvoBias: ["chaos", "soldier", "commander", "blade"] },
  [Species.SOUL_HUNTER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "steel", "soul", "hunter", "reaper", "scythe", "harvest", "death", "chain"], tagsEvoBias: ["soul", "hunter", "reaper", "scythe"] },
  [Species.SPEED_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "speed", "sonic", "turbo", "momentum", "kick", "dash", "rush", "yusei"], tagsEvoBias: ["speed", "sonic", "turbo", "momentum"] },
  [Species.STEEL_OGRE_GROTTO_1]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "ogre", "grotto", "iron", "fortress", "golem", "machine", "siege", "guardian"], tagsEvoBias: ["ogre", "grotto", "iron", "fortress"] },
  [Species.SUIJIN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "psychic", "suijin", "guardian", "barrier", "tidal", "gate", "aqua", "deity"], tagsEvoBias: ["suijin", "barrier", "tidal", "gate"] },
  [Species.YELLOW_GADGET]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "electric", "gadget", "machine", "yellow", "gear", "tiny", "combo", "searcher"], tagsEvoBias: ["gadget", "machine", "gear", "combo"] },
  [Species.SUPREME_KING_OF_ARMAGEDDON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fire", "king", "armageddon", "supreme", "fiend", "destruction", "apocalypse", "decree"], tagsEvoBias: ["armageddon", "supreme", "decree", "destruction"] },
  [Species.THE_CREATOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "steel", "creator", "divine", "genesis", "forge", "revive", "thunder", "deity"], tagsEvoBias: ["creator", "genesis", "divine", "forge"] },
  [Species.THE_FABLED_CERBURREL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "fairy", "fabled", "cerberus", "pup", "tuner", "discard", "flame", "triple"], tagsEvoBias: ["cerburrel", "fabled", "pup", "tuner"] },
  [Species.THE_FABLED_GANASHIA]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "fighting", "fabled", "elephant", "tusk", "trumpet", "charge", "discard", "ganashia"], tagsEvoBias: ["fabled", "ganashia", "elephant", "tusk"] },
  [Species.THE_TRICKY]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "jester", "trickster", "mask", "discard", "gambit", "illusion", "swap", "mind"], tagsEvoBias: ["tricky", "jester", "mask", "gambit"] },
  [Species.THE_MASKED_BEAST]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "ghost", "masked-beast", "ritual", "fiend", "mask", "death", "rite", "terror"], tagsEvoBias: ["masked-beast", "ritual", "death-rite", "mask"] },
  [Species.THOUSAND_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "fire", "ancient", "aged", "thousand", "flame", "elder", "wisdom", "millennial"], tagsEvoBias: ["thousand-dragon", "aged", "ancient", "millennial"] },
  [Species.THOUSAND_EYES_RESTRICT]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "ghost", "thousand-eyes", "restrict", "stare", "drain", "lock", "bind", "watch"], tagsEvoBias: ["thousand-eyes", "restrict", "lock", "drain"] },
  [Species.TIME_WIZARD_OF_TOMORROW]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "steel", "time", "wizard", "chrono", "future", "temporal", "tomorrow", "clock"], tagsEvoBias: ["time-wizard", "chrono", "tomorrow", "temporal"] },
  [Species.TOGEX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fairy", "normal", "star", "lucky", "fortune", "charm", "beast", "evasion", "cute"], tagsEvoBias: ["togex", "lucky", "star", "fortune"] },
  [Species.YUBEL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["ghost", "dark", "fiend", "nightmare", "reflect", "curse", "love", "terror", "phase"], tagsEvoBias: ["nightmare-pain", "reflect", "cursed-love", "terror"] },
  [Species.ZOMBYRA_THE_DARK]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "fighting", "anti-hero", "fading", "puncher", "vigilante", "cursed", "desperate", "street"], tagsEvoBias: ["dark-hero", "fading-power", "anti-hero", "vigilante"] },
  [Species.WOODLAND_SPRITE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["grass", "fairy", "sprite", "woodland", "forest", "healer", "nature", "verdant", "offering"], tagsEvoBias: ["woodland", "sprite", "forest", "healer"] },
  [Species.WATER_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "sea-serpent", "purge", "rain", "anti-fire", "oceanic", "tidal", "flood"], tagsEvoBias: ["water-dragon", "purge", "anti-fire", "oceanic"] },
  [Species.WATER_DRAGON_CLUSTER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "dragon", "cluster", "serpent", "ocean", "tidal", "rain", "deluge", "torrent"], tagsEvoBias: ["cluster", "water-dragon", "tidal", "deluge"] },
  [Species.VOLCANIC_SHELL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "volcanic", "shell", "recurring", "ammo", "expendable", "sacrifice", "ash", "pyro"], tagsEvoBias: ["volcanic-shell", "recurring", "ammo", "expendable"] },
  [Species.TOON_ALLIGATOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "fairy", "toon", "alligator", "bite", "cartoon", "gator", "snap", "reptile"], tagsEvoBias: ["toon", "alligator", "gator", "snap"] },
  [Species.TOON_ANCIENT_GEAR_GOLEM]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "ground", "toon", "ancient", "gear", "golem", "machine", "cartoon", "siege"], tagsEvoBias: ["toon", "ancient-gear", "golem", "cartoon"] },
  [Species.TOON_BARREL_DRAGON]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "dark", "toon", "barrel", "dragon", "coin", "gunner", "machine", "gamble"], tagsEvoBias: ["toon", "barrel", "coin-flip", "gunner"] },
  [Species.TOON_BLACK_LUSTER_SOLDIER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fighting", "dark", "toon", "luster", "chaos", "ritual", "slicing", "knight", "cartoon"], tagsEvoBias: ["toon-luster", "chaos", "ritual", "cartoon"] },
  [Species.TOON_DARK_MAGICIAN]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "toon", "magician", "spell", "arcana", "cartoon", "illusion", "trickster"], tagsEvoBias: ["toon-magician", "arcana", "cartoon", "spell"] },
  [Species.TOON_DARK_MAGICIAN_GIRL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "fairy", "toon", "apprentice", "mage-girl", "cartoon", "charm", "burning-magic", "sparkle"], tagsEvoBias: ["toon-girl", "apprentice", "burning-magic", "cartoon"] },
  [Species.TOON_MASKED_SORCERER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["psychic", "dark", "toon", "masked", "sorcerer", "drain", "cartoon", "siphon", "leech"], tagsEvoBias: ["toon-sorcerer", "masked", "drain", "siphon"] },
  [Species.TOON_MERMAID]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["water", "fairy", "toon", "mermaid", "siren", "charm", "aqua", "cartoon", "ocean"], tagsEvoBias: ["toon", "mermaid", "siren", "charm"] },
  [Species.TOON_SUMMONED_SKULL]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dark", "electric", "toon", "skull", "demon", "lightning", "cartoon", "jester", "fiend"], tagsEvoBias: ["toon", "summoned-skull", "cartoon", "demon"] },
  [Species.TWIN_HEADED_KING_REX]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["dragon", "rock", "rex", "dinosaur", "twin-headed", "bite", "primal", "king", "fang"], tagsEvoBias: ["twin-headed", "rex", "dinosaur", "primal"] },
  [Species.ULTIMATE_ANCIENT_GEAR_GOLEM]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "ground", "ancient", "gear", "golem", "ultimate", "fusion", "siege", "machine"], tagsEvoBias: ["ultimate", "ancient-gear", "golem", "siege"] },
  [Species.VALKYRION_THE_MAGNET_WARRIOR]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["steel", "electric", "magnet", "fusion", "warrior", "polarity", "formation", "colossus", "commander"], tagsEvoBias: ["magnet", "fusion", "warrior", "colossus"] },
  [Species.VOLCANIC_DOOMFIRE]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "rock", "volcanic", "doomfire", "magma", "eruption", "infernal", "doom", "pyroclastic"], tagsEvoBias: ["doomfire", "volcanic", "eruption", "pyroclastic"] },
  [Species.VOLCANIC_ROCKET]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "steel", "rocket", "volcanic", "missile", "pyro", "launch", "payload", "ignition"], tagsEvoBias: ["volcanic", "rocket", "missile", "launch"] },
  [Species.VOLCANIC_HAMMERER]: { rankUpLevels: DEFAULT_RANK_UP_LEVELS, tagsSelf: ["fire", "fighting", "volcanic", "hammerer", "fist", "magma", "punch", "eruption", "molten"], tagsEvoBias: ["volcanic-hammer", "magma-fist", "punch", "eruption"] },
};

export function isDuelmonSpecies(speciesId: Species): boolean {
  return speciesId >= 9000 && speciesId <= 9244;
}

export function getDuelmonRankUpDefinition(speciesId: Species): DuelmonRankUpDefinition | null {
  return DUELMON_RANK_UP_DEFS[speciesId] ?? null;
}

export function getEligibleDuelmonRankUpOtherPool(currentSpeciesId: Species, excludedSpeciesIds: Species[] = []): Species[] {
  const excluded = new Set<Species>(excludedSpeciesIds);
  excluded.add(currentSpeciesId);
  return DUELMON_SPECIES.filter(sid => !excluded.has(sid));
}

export function getDuelmonBstBand(bst: number): 0 | 1 | 2 {
  if (bst <= 515) return 0;
  if (bst <= 540) return 1;
  return 2;
}

export function canScheduleDuelmonRankUp(currentBst: number): boolean {
  return currentBst < DUELMON_RANK_UP_BST_CAP;
}

export function computeDuelmonBandThreshold(
  scene: BattleScene,
  pokemon: PlayerPokemon,
  bandSlot: number,
  lastTriggerLevel: number
): number {
  const bst = pokemon.getSpeciesForm().baseTotal;
  const bandIdx = getDuelmonBstBand(bst);
  const range = BAND_LEVEL_RANGES[bandIdx];
  let offset = 0;
  scene.executeWithSeedOffset(() => {
    offset = range[0] + Utils.randSeedInt(range[1] - range[0] + 1);
  }, ((pokemon.id << 10) ^ (bandSlot << 5) ^ (lastTriggerLevel << 2)) as integer, scene.waveSeed);
  return lastTriggerLevel + offset;
}

export function ensureDuelmonBandRolled(
  scene: BattleScene,
  pokemon: PlayerPokemon
): void {
  const currentBst = pokemon.getSpeciesForm().baseTotal;
  if (!canScheduleDuelmonRankUp(currentBst)) return;
  const nextSlot = pokemon.duelmonBandsConsumed;
  if (pokemon.duelmonBandThresholds.length > nextSlot) return;
  const threshold = computeDuelmonBandThreshold(
    scene, pokemon, nextSlot, pokemon.duelmonLastTriggerLevel
  );
  pokemon.duelmonBandThresholds.push(threshold);
}

export function pickTwoOtherDuelmonCandidatesByTagOverlap(
  currentSpeciesId: Species,
  rngInt: (max: number) => integer,
  excludedSpeciesIds: Species[] = []
): [Species, Species] {
  const excluded = new Set<Species>(excludedSpeciesIds);
  excluded.add(currentSpeciesId);

  const currentDef = getDuelmonRankUpDefinition(currentSpeciesId);
  const tagsSelf = currentDef?.tagsSelf ?? [];
  const tagsBias = currentDef?.tagsEvoBias ?? [];

  const subsetSize = Math.min(tagsSelf.length, 3 + rngInt(4));
  const tagsSelfPool = tagsSelf.slice();
  const rolledTags: string[] = [];
  while (rolledTags.length < subsetSize && tagsSelfPool.length) {
    const idx = rngInt(tagsSelfPool.length);
    rolledTags.push(tagsSelfPool.splice(idx, 1)[0]);
  }

  const biasCount = Math.min(tagsBias.length, rngInt(3));
  for (let i = 0; i < biasCount; i++) {
    const idx = rngInt(tagsBias.length);
    rolledTags.push(tagsBias[idx]);
  }

  const rolledSet = new Set<string>(rolledTags);

  const score = (sid: Species): integer => {
    const def = getDuelmonRankUpDefinition(sid);
    if (!def) return -1 as integer;
    let s = 0;
    for (const t of def.tagsSelf) {
      if (rolledSet.has(t)) s++;
    }
    return s as integer;
  };

  const pickOne = (pool: Species[]): Species => {
    if (!pool.length) return currentSpeciesId;
    let bestScore = -1;
    let best: Species[] = [];
    for (const sid of pool) {
      const s = score(sid);
      if (s > bestScore) {
        bestScore = s;
        best = [sid];
      } else if (s === bestScore) {
        best.push(sid);
      }
    }
    const pickPool = best.length ? best : pool;
    return pickPool[rngInt(pickPool.length)] as Species;
  };

  const pool1 = DUELMON_SPECIES.filter(sid => !excluded.has(sid));
  const first = pickOne(pool1);
  excluded.add(first);

  const pool2 = DUELMON_SPECIES.filter(sid => !excluded.has(sid));
  const second = pool2.length ? pickOne(pool2) : first;

  return [first, second];
}