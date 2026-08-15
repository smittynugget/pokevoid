import i18next from "i18next";
import * as Utils from "#app/utils.js";
import BattleScene from "#app/battle-scene";
import { PlayableChampionData, SkillCategory } from "../system/playable-champions";
import { SkillTreeRewardType } from "../system/skill-tree-data";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import PokemonSpecies, { allSpecies, getPokemonSpecies } from "#app/data/pokemon-species";
import { GameMode } from "#app/game-mode";
import { TrainerType } from "#enums/trainer-type";
import { trainerConfigs } from "#app/data/trainer-config";
import { PlayerGender } from "#enums/player-gender";
import { pokemonPrevolutions } from "#app/data/pokemon-evolutions";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS, PokemonAltBuildDefinition } from "../data/pokemon-alt-buid";
import Pokemon from "#app/field/pokemon";
import { PokemonAltBuildModifierType } from "#app/modifier/modifier-type";
import { PokemonAltBuildModifier } from "#app/modifier/modifier";
import { CHAMPION_DEFINITIONS } from "./champion-registry";

export interface DynamicSignatureStarter {
  speciesId: Species;
  altBuildId: PokemonAltBuildId | null;
}

export interface FilteredStartersResult {
  allStarters: Species[];
  dynamicSignatureStarters: DynamicSignatureStarter[];
}

export class ChampionUtils {
  static getChampionDisplayName(championId: string): string {
    if (!championId || typeof championId !== "string") return "";
    const trainerKey = `trainerNames:${championId}`;
    const trainerName = i18next.t(trainerKey);
    if (trainerName !== trainerKey) return trainerName;
    const spaced = championId.replace(/[_-]+/g, " ").trim();
    return spaced
      .split(/\s+/)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(" ");
  }

  static getChampionAffinityLabel(championId: string): string | null {
    const def = CHAMPION_DEFINITIONS[championId];
    if (!def) return null;
    const realTypes = [def.type1, def.type2].filter(
      t => t !== undefined && t !== null && t !== Type.UNKNOWN
    );
    if (realTypes.length > 0) return null;
    const genFilter = def.pokemonGenerationFilter;
    if (!genFilter || !Array.isArray(genFilter) || genFilter.length === 0) return null;
    const genRoman = i18next.t(`starterSelectUiHandler:gen${genFilter[0]}`);
    return i18next.t("championSelect:generationShort", { generation: genRoman, defaultValue: `GEN ${genRoman}` });
  }

  static syncChampionUnlocks(championData: PlayableChampionData): void {
    if (!championData.unlockedSkills) return;

    const championId = championData.id;
    let def = CHAMPION_DEFINITIONS[championId];

    if (!def && (championId === 'apollo' || championId === 'diana')) {
        def = CHAMPION_DEFINITIONS['apollo_diana'];
    }

    if (!def || !def.lockedSkills) return;

    Object.values(championData.unlockedSkills).forEach((unlocked: any) => {
      const skillId = unlocked.skillId;
      const originalSkill = (def!.lockedSkills as any)[skillId];

      if (originalSkill && originalSkill.category === SkillCategory.SIGNATURE_POKEMON) {
          const species = originalSkill.unlockableId as Species;
          (championData as any).unlockedSignaturePokemon = (championData as any).unlockedSignaturePokemon || [];
          const arr = (championData as any).unlockedSignaturePokemon as Species[];
          if (!arr.includes(species)) {
              arr.push(species);
          }
      }
    });
  }

  static filterPokemonByChampion(
    scene: BattleScene,
    championData: PlayableChampionData,
    rewardType: SkillTreeRewardType
  ): Species[] {

    let totalChecked = 0;
    let noSpeciesData = 0;
    let speciesIdMismatch = 0;
    let legendaryFiltered = 0;
    let bstFiltered = 0;
    let typeFiltered = 0;
    let passed = 0;

    const isApolloDiana = championData.id === "apollo" || championData.id === "diana" || championData.id === "apollo_diana";

    const championTypes = isApolloDiana
      ? []
      : [championData.type1, championData.type2].filter(t =>
          t !== undefined && t !== null && t !== Type.UNKNOWN
        ) as Type[];

    const allAvailablePokemon = (allSpecies as any[]).filter((speciesData: PokemonSpecies) => {
      if (!speciesData) {
        noSpeciesData++;
        return false;
      }

      totalChecked++;
      const species = speciesData.speciesId;

      if (rewardType === SkillTreeRewardType.GENERAL_POKEMON) {
        if (speciesData.legendary || speciesData.mythical || (speciesData as any).subLegendary) {
          legendaryFiltered++;
          return false;
        }
        const baseStatTotal = (speciesData.baseStats || []).reduce((sum: number, stat: number) => sum + stat, 0);
        if (baseStatTotal > 550) {
          bstFiltered++;
          return false;
        }
      } else if (rewardType === SkillTreeRewardType.LEGENDARY_POKEMON) {
        if (!speciesData.legendary && !speciesData.mythical && !(speciesData as any).subLegendary) {
          return false;
        }
      }

      if (championTypes.length === 0) {
        const genFilter = championData.pokemonGenerationFilter;
        if (genFilter && genFilter.length > 0) {
          if (!genFilter.includes((speciesData as any).generation)) {
            typeFiltered++;
            return false;
          }
        }
        passed++;
        return true;
      }
      const hasMatchingType = championTypes.some(
        (championType) => speciesData.type1 === championType || speciesData.type2 === championType
      );

      if (!hasMatchingType) {
        typeFiltered++;
        return false;
      }

      passed++;
      return true;
    });

    const speciesIds = allAvailablePokemon.map(s => s.speciesId);

    return speciesIds;
  }

  static filterStartersByChampion(
    scene: BattleScene,
    championData: PlayableChampionData,
    gameMode: GameMode
  ): FilteredStartersResult {

    this.syncChampionUnlocks(championData);

    const sigSpecies = [
      ...(championData.signaturePokemon || []),
      ...((championData as any).unlockedSignaturePokemon || [])
    ];
    for (const sp of sigSpecies) {
      const sd = scene?.gameData?.starterData?.[sp];
      if (sd && !sd.abilityAttr) {
        sd.abilityAttr = 1;
      }
    }

    const isApolloDiana = championData.id === "apollo" || championData.id === "diana" || championData.id === "apollo_diana";

    const championTypes = isApolloDiana
      ? []
      : [championData.type1, championData.type2].filter(t =>
          t !== undefined && t !== null && t !== Type.UNKNOWN
        ) as Type[];

    const generalPool = (allSpecies as any[]).filter((speciesData: PokemonSpecies) => {
      if (!speciesData) return false;

      const hasPrevolution = pokemonPrevolutions[speciesData.speciesId] !== undefined;
      if (hasPrevolution) return false;

      if (championTypes.length === 0) {
        const genFilter = championData.pokemonGenerationFilter;
        if (genFilter && genFilter.length > 0) {
          if (!genFilter.includes((speciesData as any).generation)) {
            return false;
          }
        }
        return true;
      }

      const hasMatchingType = championTypes.some(
        (championType) => speciesData.type1 === championType || speciesData.type2 === championType
      );

      return hasMatchingType;
    }).map(s => s.speciesId as Species);

    let additionalPokemon: Species[] = [];

    if (championData.signaturePokemon && championData.signaturePokemon.length > 0) {
      const baseSignatures = [...championData.signaturePokemon];
      const unlockedSignatures = (championData as any).unlockedSignaturePokemon as Species[] | undefined;

      const allSignatures = unlockedSignatures && unlockedSignatures.length > 0
        ? [...new Set([...baseSignatures, ...unlockedSignatures])]
        : baseSignatures;

      const shuffled = Utils.randSeedShuffle(allSignatures);
      additionalPokemon = shuffled.slice(0, Math.min(3, shuffled.length));
    } else {
      const firstStagePool = (allSpecies as any[]).filter(s => {
        if (!s || s.speciesId === Species.ETERNATUS) return false;
        if ((pokemonPrevolutions as any).hasOwnProperty(s.speciesId)) return false;
        if (s.legendary || s.mythical || (s as any).subLegendary) return false;
        if (typeof s.isCatchable === 'function' && !s.isCatchable()) return false;
        return true;
      });

      const shuffled = Utils.randSeedShuffle([...firstStagePool]);
      additionalPokemon = shuffled.slice(0, Math.min(3, shuffled.length)).map(s => s.speciesId);
    }

    const championId = scene.gameData.selectedChampionId || championData.id || (scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo");

    additionalPokemon.forEach(speciesId => {
        scene.gameData.registerChampionObtainedPokemon(speciesId, championId, true);
    });

    const availablePool: Species[] = [];

    availablePool.push(...additionalPokemon);

    for (const speciesId of generalPool) {
        if (scene.gameData.isPokemonAvailableToChampion(speciesId, championId)) {
            availablePool.push(speciesId);
        }
    }

    const uniquePool = [...new Set(availablePool)];

    const dynamicSignatureStarters: DynamicSignatureStarter[] = additionalPokemon.map(speciesId => ({
      speciesId,
      altBuildId: this.getSignatureAltBuildId(speciesId, championData)
    }));

    return {
      allStarters: uniquePool,
      dynamicSignatureStarters
    };
  }

  public static readonly SIGNATURE_ALT_BUILDS: Record<string, Partial<Record<Species, PokemonAltBuildId>>> = {
      "brock": {
        [Species.ONIX]: PokemonAltBuildId.ONIX_BROCK_SIGNATURE,
        [Species.GEODUDE]: PokemonAltBuildId.GEODUDE_BROCK_SIGNATURE,
        [Species.VULPIX]: PokemonAltBuildId.VULPIX_BROCK_SIGNATURE,
        [Species.ZUBAT]: PokemonAltBuildId.ZUBAT_BROCK_SIGNATURE,
        [Species.BONSLY]: PokemonAltBuildId.BONSLY_BROCK_SIGNATURE,
        [Species.MUDKIP]: PokemonAltBuildId.MUDKIP_BROCK_SIGNATURE,
        [Species.PINECO]: PokemonAltBuildId.PINECO_BROCK_SIGNATURE,
        [Species.CROAGUNK]: PokemonAltBuildId.CROAGUNK_BROCK_SIGNATURE,
        [Species.HAPPINY]: PokemonAltBuildId.HAPPINY_BROCK_SIGNATURE,
        [Species.LOTAD]: PokemonAltBuildId.LOTAD_BROCK_SIGNATURE,
        [Species.COMFEY]: PokemonAltBuildId.COMFEY_BROCK_SIGNATURE
      },
      "misty": {
        [Species.STARYU]: PokemonAltBuildId.STARYU_MISTY_SIGNATURE,
        [Species.PSYDUCK]: PokemonAltBuildId.PSYDUCK_MISTY_SIGNATURE,
        [Species.MAGIKARP]: PokemonAltBuildId.MAGIKARP_MISTY_SIGNATURE,
        [Species.POLIWAG]: PokemonAltBuildId.POLIWAG_MISTY_SIGNATURE,
        [Species.AZURILL]: PokemonAltBuildId.AZURILL_MISTY_SIGNATURE,
        [Species.GOLDEEN]: PokemonAltBuildId.GOLDEEN_MISTY_SIGNATURE,
        [Species.HORSEA]: PokemonAltBuildId.HORSEA_MISTY_SIGNATURE,
        [Species.TOGEPI]: PokemonAltBuildId.TOGEPI_MISTY_SIGNATURE,
        [Species.CORSOLA]: PokemonAltBuildId.CORSOLA_MISTY_SIGNATURE,
        [Species.LUVDISC]: PokemonAltBuildId.LUVDISC_MISTY_SIGNATURE,
        [Species.CLAUNCHER]: PokemonAltBuildId.CLAUNCHER_MISTY_SIGNATURE
      },
      "lt_surge": {
        [Species.VOLTORB]: PokemonAltBuildId.VOLTORB_SURGE_SIGNATURE,
        [Species.PIKACHU]: PokemonAltBuildId.PIKACHU_SURGE_SIGNATURE,
        [Species.ELECTABUZZ]: PokemonAltBuildId.ELECTABUZZ_SURGE_SIGNATURE
      },
      "apollo": {
        [Species.RIOLU]: PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE,
        [Species.SOLROCK]: PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE,
        [Species.LUNATONE]: PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE,
        [Species.LARVESTA]: PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE,
        [Species.SWABLU]: PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE,
        [Species.CASTFORM]: PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE,
        [Species.LITWICK]: PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE,
        [Species.EEVEE]: PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE,
        [Species.TEDDIURSA]: PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE,
        [Species.CLEFFA]: PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE,
        [Species.SUNKERN]: PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE
      },
      "diana": {
        [Species.RIOLU]: PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE,
        [Species.SOLROCK]: PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE,
        [Species.LUNATONE]: PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE,
        [Species.LARVESTA]: PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE,
        [Species.SWABLU]: PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE,
        [Species.CASTFORM]: PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE,
        [Species.LITWICK]: PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE,
        [Species.EEVEE]: PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE,
        [Species.TEDDIURSA]: PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE,
        [Species.CLEFFA]: PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE,
        [Species.SUNKERN]: PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE
      },
      "red": {
        [Species.PIKACHU]: PokemonAltBuildId.PIKACHU_RED_SIGNATURE,
        [Species.SNORLAX]: PokemonAltBuildId.SNORLAX_RED_SIGNATURE,
        [Species.LAPRAS]: PokemonAltBuildId.LAPRAS_RED_SIGNATURE,
        [Species.FARFETCHD]: PokemonAltBuildId.FARFETCHD_RED_SIGNATURE,
        [Species.CHARMANDER]: PokemonAltBuildId.CHARMANDER_RED_SIGNATURE,
        [Species.TAUROS]: PokemonAltBuildId.TAUROS_RED_SIGNATURE,
        [Species.MAGIKARP]: PokemonAltBuildId.MAGIKARP_RED_SIGNATURE,
        [Species.BUTTERFREE]: PokemonAltBuildId.BUTTERFREE_RED_SIGNATURE,
        [Species.BULBASAUR]: PokemonAltBuildId.BULBASAUR_RED_SIGNATURE,
        [Species.SQUIRTLE]: PokemonAltBuildId.SQUIRTLE_RED_SIGNATURE,
        [Species.ESPEON]: PokemonAltBuildId.ESPEON_RED_SIGNATURE
      },
      "apollo_diana": {
        [Species.RIOLU]: PokemonAltBuildId.RIOLU_APOLLO_DIANA_SIGNATURE,
        [Species.SOLROCK]: PokemonAltBuildId.SOLROCK_APOLLO_DIANA_SIGNATURE,
        [Species.LUNATONE]: PokemonAltBuildId.LUNATONE_APOLLO_DIANA_SIGNATURE,
        [Species.LARVESTA]: PokemonAltBuildId.LARVESTA_APOLLO_DIANA_SIGNATURE,
        [Species.SWABLU]: PokemonAltBuildId.SWABLU_APOLLO_DIANA_SIGNATURE,
        [Species.CASTFORM]: PokemonAltBuildId.CASTFORM_APOLLO_DIANA_SIGNATURE,
        [Species.LITWICK]: PokemonAltBuildId.LITWICK_APOLLO_DIANA_SIGNATURE,
        [Species.EEVEE]: PokemonAltBuildId.EEVEE_APOLLO_DIANA_SIGNATURE,
        [Species.TEDDIURSA]: PokemonAltBuildId.TEDDIURSA_APOLLO_DIANA_SIGNATURE,
        [Species.CLEFFA]: PokemonAltBuildId.CLEFFA_APOLLO_DIANA_SIGNATURE,
        [Species.SUNKERN]: PokemonAltBuildId.SUNKERN_APOLLO_DIANA_SIGNATURE
      }
  };

  static getSignatureAltBuildId(species: Species, championData: PlayableChampionData): PokemonAltBuildId | null {
    const championId = championData.id;
    const altBuildId = this.SIGNATURE_ALT_BUILDS[championId]?.[species] ?? null;
    return altBuildId;
  }
  static getAutoUnlockAltBuildId(species: Species, championData: PlayableChampionData): PokemonAltBuildId | null {
    const baseAltBuildId = this.getSignatureAltBuildId(species, championData);
    if (!baseAltBuildId) return null;

    const upgradeBuild = Object.values(POKEMON_ALT_BUILDS).find(b =>
        b.prerequisiteBuilds?.includes(baseAltBuildId) && b.rank === 1
    );

    return upgradeBuild ? upgradeBuild.id : baseAltBuildId;
  }
  static attemptApplySignatureAltBuild(pokemon: Pokemon, championData: PlayableChampionData): PokemonAltBuildId | null {
    if (!pokemon || !championData) return null;

    const speciesId = pokemon.species.speciesId;
    const inBaseList = championData.signaturePokemon?.includes(speciesId) || false;
    const unlockedSignatures = (championData as any).unlockedSignaturePokemon as Species[] | undefined;
    const inUnlockedList = unlockedSignatures?.includes(speciesId) || false;

    if (!inBaseList && !inUnlockedList) return null;
    pokemon.isSignature = true;
    const unlockedBuilds = championData.unlockedAltBuilds || [];
    const candidates = unlockedBuilds.filter(id => {
        const def = POKEMON_ALT_BUILDS[id];
        return def && def.species === speciesId;
    });
    const baseSigId = this.getSignatureAltBuildId(speciesId, championData);
    if (baseSigId && !candidates.includes(baseSigId)) {
        candidates.push(baseSigId);
    }
    candidates.sort((a, b) => {
        const defA = POKEMON_ALT_BUILDS[a];
        const defB = POKEMON_ALT_BUILDS[b];
        return (defB?.rank || 0) - (defA?.rank || 0);
    });

    const bestBuildId = candidates[0];

    if (!bestBuildId) return null;
    const altBuild = POKEMON_ALT_BUILDS[bestBuildId];
    if (altBuild) {
      const modifierType = new PokemonAltBuildModifierType(altBuild);
      const modifier = new PokemonAltBuildModifier(modifierType, pokemon.id, altBuild);
      modifier.applyAltBuildToPokemon(pokemon);
      return bestBuildId;
    }

    return null;
  }

  static getAvailableChampionSignaturePokemon(
    championData: PlayableChampionData,
    scene: BattleScene
  ): Species[] {
    const base = (championData.signaturePokemon || []) as Species[];
    const unlocked = ((championData as any).unlockedSignaturePokemon || []) as Species[];
    const combined = Array.from(new Set([...(unlocked || []), ...(base || [])]));

    return combined.filter((species) => {
      const speciesData = getPokemonSpecies(species);
      if (!speciesData) return false;
      if (championData.pokemonGenerationFilter && championData.pokemonGenerationFilter.length > 0) {
        if (!(championData.pokemonGenerationFilter as number[]).includes((speciesData as any).generation)) return false;
      }
      const caughtAttr = (scene.gameData.dexData as any)[species]?.caughtAttr;
      return caughtAttr && BigInt(caughtAttr) !== BigInt(0);
    });
  }

  static getRandomChampionSignaturePokemon(
    championData: PlayableChampionData,
    scene: BattleScene
  ): Species {
    const availablePokemon = this.getAvailableChampionSignaturePokemon(championData, scene);
    const base = (championData.signaturePokemon || []) as Species[];
    const unlocked = ((championData as any).unlockedSignaturePokemon || []) as Species[];
    const combined = Array.from(new Set([...(unlocked || []), ...(base || [])]));
    return Utils.randSeedItem(availablePokemon.length > 0 ? availablePokemon : (combined.length > 0 ? combined : base));
  }

  static getRandomChampionGeneralPokemon(
    championData: PlayableChampionData,
    scene: BattleScene
  ): Species {
    const championTypes = [championData.type1, championData.type2].filter(t =>
      t !== undefined && t !== null && t !== Type.UNKNOWN
    ) as Type[];
    const compatiblePokemon: Species[] = [];
    for (const speciesData of allSpecies) {
      if (!speciesData) continue;
      const speciesId = speciesData.speciesId as Species;
      if (championTypes.length > 0) {
        const hasMatchingType = championTypes.some(
          (championType) => speciesData.type1 === championType || speciesData.type2 === championType
        );
        if (!hasMatchingType) continue;
      }
      if (championData.pokemonGenerationFilter && championData.pokemonGenerationFilter.length > 0) {
        if (!(championData.pokemonGenerationFilter as number[]).includes((speciesData as any).generation)) continue;
      }
      const caughtAttr = (scene.gameData.dexData as any)[speciesId]?.caughtAttr;
      if (caughtAttr && BigInt(caughtAttr) !== BigInt(0)) {
        compatiblePokemon.push(speciesId);
      }
    }
    return Utils.randSeedItem(compatiblePokemon.length > 0 ? compatiblePokemon : [(Species as any).PIDGEY]);
  }

  static getChampionSpriteKey(championId: string, genderIndex: number | undefined): string {
    try {
      const trainerTypeMap: Record<string, number> = {
        brock: TrainerType.BROCK,
        misty: TrainerType.MISTY,
        red: TrainerType.RED,
      };
      const trainerType = trainerTypeMap[championId];
      if (trainerType !== undefined) {
        const cfg = trainerConfigs[trainerType];
        if (cfg?.getSpriteKey) {

          const isFemale = genderIndex === PlayerGender.FEMALE;
          return cfg.getSpriteKey(isFemale, false);
        }
      }
    } catch (_) {}

    const isFemale = genderIndex === PlayerGender.FEMALE;
    if (championId === "apollo" || championId === "diana") {
      return isFemale ? "player_f" : "player_m";
    }

    return isFemale ? "player_f" : "player_m";
  }

  static resolveActiveChampionId(scene: BattleScene): string {
    let id = scene.gameData?.selectedChampionId
      || scene.gameData?.activeSkillTree?.championId;
    if (!id) {
      return scene.gameData?.gender === PlayerGender.FEMALE ? "diana" : "apollo";
    }
    if (id === "apollo_diana") {
      id = scene.gameData?.gender === PlayerGender.FEMALE ? "diana" : "apollo";
    }
    return id;
  }

  static getAltBuildDisplayName(altBuildId: PokemonAltBuildId | string): string {
    const id = String(altBuildId);
    if (id.includes("apollo_diana_signature")) {
      const scene = BattleScene.currentScene;
      if (scene) {
        const championId = ChampionUtils.resolveActiveChampionId(scene);
        if (championId === "apollo" || championId === "diana") {
          return i18next.t("pokemonAltBuild:championPartner", {
            champion: ChampionUtils.getChampionDisplayName(championId),
          });
        }
      }
    }
    return i18next.t(`pokemonAltBuild:${id}.name`);
  }

  static getAltBuildDisplayDescription(altBuildId: PokemonAltBuildId | string, scene?: BattleScene | null): string {
    const id = String(altBuildId);
    const activeScene = scene ?? BattleScene.currentScene;
    if (id.includes("apollo_diana_signature") && activeScene) {
      const championId = ChampionUtils.resolveActiveChampionId(activeScene);
      if (championId === "apollo" || championId === "diana") {
        return i18next.t(`pokemonAltBuild:${id}.description`, {
          champion: ChampionUtils.getChampionDisplayName(championId),
        });
      }
    }
    return i18next.t(`pokemonAltBuild:${id}.description`);
  }

  static getChampionBackSpriteKey(championId: string | undefined, genderIndex: number | undefined): string {
    const isFemale = genderIndex === PlayerGender.FEMALE;

    if (!championId || championId === "apollo" || championId === "diana") {
      return `trainer_${isFemale ? "f" : "m"}_back`;
    }

    return `${championId}_back`;
  }

  static getChampionBackSpriteScale(championId: string | undefined): number {
    if (championId === "brock") {
      return 0.55;
    }
    else if (championId === "red") {
      return 0.6;
    }
    else if (championId === "misty") {
      return 0.7;
    }
    else if(championId === "diana")
    return 0.7;
    else if(championId === "apollo")
    return 0.7;
    return 0.7;
  }

  static getChampionBackSpriteYOffset(championId: string | undefined): number {
    if (championId === "brock") {
      return -20;
    }
    if (championId === "red") {
      return -15;
    }

    return 0;
  }

  static getChampionTrainerBondScale(championId: string | undefined): number {
    if (!championId) return 1.0;
    try {
      let def = CHAMPION_DEFINITIONS[championId];
      if (!def && (championId === 'apollo' || championId === 'diana')) {
        def = CHAMPION_DEFINITIONS['apollo_diana'];
      }
      const scale = (def as any)?.ui?.skillTreeTrainerBondScale;
      if (typeof scale === "number") return scale;
    } catch {}
    return 1.0;
  }
}