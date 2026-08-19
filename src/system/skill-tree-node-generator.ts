import i18next from "../plugins/i18n";
import * as Utils from "../utils";
import { PlayableChampionData } from "./playable-champions";
import { RewardTooltipSections, SkillTreeRarity, SkillTreeReward, SkillTreeRewardType } from "./skill-tree-data";
import { allMoves } from "../data/move";
import { allSpecies, starterPassiveAbilities, getPokemonSpecies } from "../data/pokemon-species";
import { allAbilities } from "../data/ability";
import { pokemonPrevolutions } from "../data/pokemon-evolutions";
import { Abilities } from "../enums/abilities";
import { Moves, isYuMove } from "../enums/moves";
import { Species } from "../enums/species";
import { SpeciesFormKey } from "../enums/species-form-key";
import { Stat } from "../enums/stat";
import { getStatName } from "../data/pokemon-stat";
import { Type, getTypeRgb } from "../data/type";
import { FormChangeItem } from "../enums/form-change-items";
import { VoucherType, getVoucherTypeName } from "./voucher";
import { PermaType } from "../modifier/perma-modifiers";
import { UpgradePathUtils, UpgradePath } from "../enums/upgrade-path";
import { calculateAltBuildStatsWithSwapping } from "../data/alt-build-stat-calculator";
import { SkillTreeSelectors } from "./skill-tree-selectors";
import { POKEMON_ALT_BUILDS, PokemonAltBuildId, PokemonAltBuildDefinition } from "../data/pokemon-alt-buid";
import BattleScene from "../battle-scene";
import { ChampionManager } from "./champion-manager";
import { ChampionUtils } from "./champion-utils";
import { RewardType } from "../enums/reward-type";
import { getAbilitiesForTypes } from "./type-ability-mappings";
import { getTypeStatPreferences } from "./type-stat-preferences";
import Overrides, { DEBUG_SKILL_TREE_FORCE_REWARD_TYPE } from "../overrides";
import { ChampionSkillVersion } from "./game-data";

export interface GeneratedNode {
  rarity: SkillTreeRarity;
  rewardData: SkillTreeReward;
  name: string;
  description: string;
}

export function getRaritiesForRewardType(rewardType: SkillTreeRewardType): SkillTreeRarity[] {
  switch (rewardType) {

    case SkillTreeRewardType.ABILITY_GRANT:
    case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
    case SkillTreeRewardType.GENERAL_ITEMS:
    case SkillTreeRewardType.ABILITY_SWITCHER:
    case SkillTreeRewardType.MONEY_REWARD:
    case SkillTreeRewardType.TYPE_BALL_FILTERED:
      return [SkillTreeRarity.GREAT];

    case SkillTreeRewardType.STAT_BOOST:
    case SkillTreeRewardType.TRAINER_BOND_ABILITY:
    case SkillTreeRewardType.PERMA_MONEY:
    case SkillTreeRewardType.POKEMON_ALT_BUILD:
      return [SkillTreeRarity.ULTRA];

    case SkillTreeRewardType.XM_FILTERED:
      return [SkillTreeRarity.MASTER];

    case SkillTreeRewardType.MEGA_STONE:
    case SkillTreeRewardType.DYNA_MUSHROOM:
    case SkillTreeRewardType.GLITCH_CHANGE:
    case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
    case SkillTreeRewardType.REVIVE_BOOST:
    case SkillTreeRewardType.ESSENCE_BUNDLE:
    case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
    case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
    case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT:
    case SkillTreeRewardType.SIGNATURE_POKEMON:
    case SkillTreeRewardType.PERMA_ITEM:
    case SkillTreeRewardType.TERA_ABILITY:
    case SkillTreeRewardType.BOUNTY_SELECT:
      return [SkillTreeRarity.ROGUE];

    case SkillTreeRewardType.HEALING_ITEMS:
    case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
    case SkillTreeRewardType.MASTER_BALL:
    case SkillTreeRewardType.PARTY_ABILITY_GRANT:
      return [SkillTreeRarity.MASTER];

    case SkillTreeRewardType.LEGENDARY_POKEMON:
    case SkillTreeRewardType.SMITTY_ABILITY:
    case SkillTreeRewardType.GOLDEN_POKEBALL:
    case SkillTreeRewardType.VOID_BALL:
      return [SkillTreeRarity.LEGENDARY];

    default:
      return [SkillTreeRarity.GREAT];
  }
}
const DISPLAY_RARITY_OVERRIDES: Partial<Record<SkillTreeRewardType, SkillTreeRarity>> = {
  [SkillTreeRewardType.POKEMON_ALT_BUILD]: SkillTreeRarity.ROGUE,
};

export function getDisplayRarityForRewardType(rewardType: SkillTreeRewardType): SkillTreeRarity {
  const override = DISPLAY_RARITY_OVERRIDES[rewardType];
  if (override) {
    return override;
  }
  const list = getRaritiesForRewardType(rewardType);
  return list[0];
}

export function isRewardAvailableAtRarity(rewardType: SkillTreeRewardType, rarity: SkillTreeRarity): boolean {
  return getRaritiesForRewardType(rewardType).includes(rarity);
}

export class SkillTreeNodeGenerator {
  private seed: number;
  private championId: string;
  private scene?: BattleScene;
  public currentNodeTypes: Type[] = [];
  private tooltipPreviewMode: boolean;

  constructor(seed: number, championId: string, scene?: BattleScene, tooltipPreviewMode = false) {
    this.seed = seed;
    this.championId = championId;
    this.scene = scene;
    this.tooltipPreviewMode = tooltipPreviewMode;
  }

  private isRandomTypeChampion(): boolean {
    return this.championId === "red"
      || this.championId === "apollo"
      || this.championId === "diana"
      || this.championId === "apollo_diana";
  }

  private getPreviewTypeLabel(): string {
    return i18next.t("skillTree:randomTypesLabel", { defaultValue: "RANDOM" });
  }

  formatTypesForTooltip(types: Type[]): string {
    if (this.tooltipPreviewMode && this.isRandomTypeChampion()) {
      return this.getPreviewTypeLabel();
    }
    return types.map(t => i18next.t(`pokemonInfo:Type.${Type[t]}`)).join("/");
  }

  resolveEffectiveChampionData(championData: PlayableChampionData): PlayableChampionData {
    if (this.championId !== "red") {
      this.currentNodeTypes = [championData.type1, championData.type2]
        .filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
      return championData;
    }
    const allTypes = (Utils.getEnumValues(Type) as Type[])
      .filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
    const rolledType1 = Utils.randSeedItem(allTypes);
    const rolledType2 = Utils.randSeedItem(allTypes.filter(t => t !== rolledType1));
    const rolledType3 = Utils.randSeedItem(allTypes.filter(t => t !== rolledType1 && t !== rolledType2));
    this.currentNodeTypes = [rolledType1, rolledType2, rolledType3];
    return { ...championData, type1: rolledType1, type2: rolledType2, unlockedTypeBoosters: [rolledType1, rolledType2, rolledType3], unlockedEssenceBundles: [rolledType1, rolledType2, rolledType3], unlockedTypeSwitchers: [rolledType1, rolledType2, rolledType3], unlockedTeraTypes: [rolledType1, rolledType2, rolledType3] };
  }

  generateChampionSpecificNode(depth: number, rarity: SkillTreeRarity, championData: PlayableChampionData): GeneratedNode {
    const effectiveChampion = this.resolveEffectiveChampionData(championData);

    if (DEBUG_SKILL_TREE_FORCE_REWARD_TYPE && depth > 0) {
      const rewardData = this.generateSpecificReward(DEBUG_SKILL_TREE_FORCE_REWARD_TYPE, effectiveChampion);
      const displayRarity = getDisplayRarityForRewardType(DEBUG_SKILL_TREE_FORCE_REWARD_TYPE);
      return {
        rarity: displayRarity,
        rewardData,
        name: this.getRewardName(rewardData),
        description: this.getRewardDescription(rewardData)
      };
    }

    const rewardPool = this.getChampionRewardPool(effectiveChampion);

    const fallbackOrder: SkillTreeRarity[] = [
      SkillTreeRarity.LEGENDARY,
      SkillTreeRarity.MASTER,
      SkillTreeRarity.ROGUE,
      SkillTreeRarity.ULTRA,
      SkillTreeRarity.GREAT
    ];
    const startIdx = Math.max(0, fallbackOrder.indexOf(rarity));
    const attempts = [rarity, ...fallbackOrder.slice(startIdx + 1)];

    for (const attemptRarity of attempts) {
      const eligiblePool = rewardPool.filter(reward =>
        this.isRewardAvailableAtRarity(reward, attemptRarity) && this.isRewardEligibleForChampion(reward, effectiveChampion)
      );
      if (eligiblePool.length > 0) {
        const selectedReward = Utils.randSeedItem(eligiblePool);
        const rewardData = this.generateSpecificReward(selectedReward, effectiveChampion);

        const generatedName = this.getRewardName(rewardData);
        const generatedDescription = this.getRewardDescription(rewardData);

        return {
          rarity: DISPLAY_RARITY_OVERRIDES[selectedReward] ?? attemptRarity,
          rewardData,
          name: generatedName,
          description: generatedDescription
        };
      }
    }

    throw new Error('No eligible rewards for this champion at the given rarity');
  }

  private getChampionRewardPool(championData: PlayableChampionData): SkillTreeRewardType[] {
    const championTypes = [championData.type1, championData.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];

    if (championTypes.length === 0) {
      return [
        SkillTreeRewardType.ABILITY_GRANT,
        SkillTreeRewardType.STAT_BOOST,
        SkillTreeRewardType.ESSENCE_BUNDLE,
        SkillTreeRewardType.PARTY_ABILITY_GRANT,
        ...(this.scene?.gameData?.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1
          ? [SkillTreeRewardType.BOUNTY_SELECT] : [])
      ];
    }
    return [
      SkillTreeRewardType.SIGNATURE_POKEMON,
      SkillTreeRewardType.ABILITY_GRANT,
      SkillTreeRewardType.STAT_BOOST,
      SkillTreeRewardType.XM_FILTERED,
      SkillTreeRewardType.TRAINER_BOND_ABILITY,
      SkillTreeRewardType.TERA_ABILITY,
      SkillTreeRewardType.SMITTY_ABILITY,
      SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
      SkillTreeRewardType.MASTERBALL_RARITY_SELECT,
      SkillTreeRewardType.REVIVE_BOOST,
      SkillTreeRewardType.ROGUEBALL_RARITY_SELECT,
      SkillTreeRewardType.LEGENDARY_POKEMON,
      SkillTreeRewardType.MEGA_STONE,
      SkillTreeRewardType.DYNA_MUSHROOM,
      SkillTreeRewardType.GLITCH_CHANGE,
      SkillTreeRewardType.TYPE_BALL_FILTERED,
      SkillTreeRewardType.TYPE_BOOSTER_ITEM,
      SkillTreeRewardType.POKEMON_ALT_BUILD,
      SkillTreeRewardType.PERMA_ITEM,
      SkillTreeRewardType.PERMA_MONEY,
      SkillTreeRewardType.MONEY_REWARD,
      SkillTreeRewardType.ESSENCE_BUNDLE,
      SkillTreeRewardType.ESSENCE_TYPE_WEIGHT,
      SkillTreeRewardType.GOLDEN_POKEBALL,
      SkillTreeRewardType.MASTER_BALL,
      SkillTreeRewardType.VOID_BALL,
      SkillTreeRewardType.HEALING_ITEMS,
      SkillTreeRewardType.ABILITY_SWITCHER,
      SkillTreeRewardType.GENERAL_ITEMS,
      SkillTreeRewardType.PARTY_ABILITY_GRANT,
      ...(this.scene?.gameData?.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1
        ? [SkillTreeRewardType.BOUNTY_SELECT] : [])
    ];
  }
  private isRewardAvailableAtRarity(rewardType: SkillTreeRewardType, rarity: SkillTreeRarity): boolean {
    return isRewardAvailableAtRarity(rewardType, rarity);
  }

  private generateSpecificReward(rewardType: SkillTreeRewardType, championData: PlayableChampionData): SkillTreeReward {
    switch (rewardType) {
      case SkillTreeRewardType.TM_FILTERED:
        return this.generateChampionTM(championData);

      case SkillTreeRewardType.XM_FILTERED:
        return this.generateChampionXM(championData);

      case SkillTreeRewardType.SIGNATURE_POKEMON:
        return this.generateSignaturePokemon(championData);

      case SkillTreeRewardType.GENERAL_POKEMON:
        return this.generateGeneralPokemon(championData);

      case SkillTreeRewardType.LEGENDARY_POKEMON:
        return this.generateLegendaryPokemon(championData);

      case SkillTreeRewardType.ABILITY_GRANT:
        return this.generateChampionAbility(championData);

      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        return this.generateTrainerBondAbility(championData);

      case SkillTreeRewardType.TERA_ABILITY:
        return this.generateTeraAbility(championData);

      case SkillTreeRewardType.SMITTY_ABILITY:
        return this.generateSmittyAbility(championData);

      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        return this.generatePassiveAbilityGrant(championData);

      case SkillTreeRewardType.STAT_BOOST:
        return this.generateStatBoost(championData);

      case SkillTreeRewardType.MOVE_UPGRADE:
        return this.generateMoveUpgrade(championData);
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
        return this.generateSpecificMoveUpgrade(championData);

      case SkillTreeRewardType.MEGA_STONE:
        return this.generateMegaStone(championData);

      case SkillTreeRewardType.DYNA_MUSHROOM:
        return this.generateDynaMushroom(championData);
      case SkillTreeRewardType.GLITCH_CHANGE:
        return this.generateGlitchChange(championData);

      case SkillTreeRewardType.TYPE_SWITCHER:
        return this.generateTypeSwitcher(championData);

      case SkillTreeRewardType.POKEMON_ALT_BUILD:
        return this.generatePokemonAltBuild(championData);

      case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
        return this.generateGlitchFormUnlock(championData);

      case SkillTreeRewardType.PERMA_ITEM:
        return this.generatePermaItem();
      case SkillTreeRewardType.PERMA_MONEY:
        return this.generatePermaMoney();
      case SkillTreeRewardType.MONEY_REWARD:
        return this.generateRelicGold();

      case SkillTreeRewardType.ESSENCE_BUNDLE:
        return this.generateEssenceBundle(championData);
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT:
        return this.generateEssenceTypeWeight(championData);

      case SkillTreeRewardType.SKILL_POINTS:
        return this.generateSkillPoints();

      case SkillTreeRewardType.SKILL_TREE_TOKENS:
        return this.generateSkillTreeTokens();

      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
        return this.generateTypeBooster(championData);
      case SkillTreeRewardType.TYPE_BALL_FILTERED:
        return this.generateChampionTypeBall(championData);
      case SkillTreeRewardType.GOLDEN_POKEBALL:
        return this.generateGoldenPokeball();
      case SkillTreeRewardType.MASTER_BALL:
        return this.generateMasterBall();
      case SkillTreeRewardType.VOID_BALL:
        return this.generateVoidBall();
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
        return this.generateRogueballRaritySelect();
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
        return this.generateMasterballRaritySelect();
      case SkillTreeRewardType.EGG_VOUCHER:
        return this.generateEggVoucher(championData);
      case SkillTreeRewardType.CATCH_RATE_BONUS:
        return this.generateCatchRateBonus(championData);
      case SkillTreeRewardType.REVIVE_BOOST:
        return this.generateReviveBoost(championData);
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY:
        return this.generateFusionSecondaryPriority(championData);
      case SkillTreeRewardType.TERA_TYPE:
        return this.generateTeraType(championData);

      case SkillTreeRewardType.HEALING_ITEMS:
        return this.generateHealingItems();
      case SkillTreeRewardType.MEMORY_MUSHROOM:
        return this.generateMemoryMushroom();
      case SkillTreeRewardType.BERRY_ITEMS:
        return this.generateBerryItems();
      case SkillTreeRewardType.ABILITY_SWITCHER:
        return this.generateAbilitySwitcher();
      case SkillTreeRewardType.GENERAL_ITEMS:
        return this.generateGeneralItems();
      case SkillTreeRewardType.BATON_ITEM:
        return this.generateBatonItem();
      case SkillTreeRewardType.PP_MAX_ITEM:
        return this.generatePPMaxItem();
      case SkillTreeRewardType.ROGUE_BALL:
        return this.generateRogueBall();
      case SkillTreeRewardType.PARTY_ABILITY_GRANT:
        return this.generatePartyAbilityGrant();

      case SkillTreeRewardType.BOUNTY_SELECT:
        return { type: SkillTreeRewardType.BOUNTY_SELECT, data: { bountyNode: true }, immediate: false };

      default:
        return this.generateChampionXM(championData);
    }
  }

  private isRewardEligibleForChampion(type: SkillTreeRewardType, c: PlayableChampionData): boolean {

    if (this.scene && (this.scene as any).skillTreeEligibilityBypass === true) {
      return true;
    }
    switch (type) {
      case SkillTreeRewardType.TM_FILTERED: return this.getChampionCompatibleTMs([c.type1, c.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[]).length > 0;
      case SkillTreeRewardType.XM_FILTERED: return this.getChampionCompatibleXMs([c.type1, c.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[]).length > 0;
      case SkillTreeRewardType.ABILITY_GRANT: {
        const pool = this.getChampionTypeAbilities([c.type1, c.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[]);
        return pool.length > 0 || Object.values(Abilities).some(v => typeof v === 'number');
      }
      case SkillTreeRewardType.SIGNATURE_POKEMON: {
        const unlocked = ((c as any).unlockedSignaturePokemon as Species[] | undefined) || [];
        return (c.signaturePokemon?.length ?? 0) > 0 || unlocked.length > 0;
      }
      case SkillTreeRewardType.GENERAL_POKEMON: return this.getTypeCompatiblePokemon([c.type1, c.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[], c.pokemonGenerationFilter).length > 0;
      case SkillTreeRewardType.LEGENDARY_POKEMON: return (c.legendaryPokemon?.length ?? 0) > 0;
      case SkillTreeRewardType.POKEMON_ALT_BUILD: return (c.unlockedAltBuilds?.length ?? 0) > 0;
      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        return true;
      case SkillTreeRewardType.STAT_BOOST: return this.getChampionStatPreferences(c).length > 0;
      case SkillTreeRewardType.MOVE_UPGRADE: return Object.values(UpgradePath).length > 0;
      case SkillTreeRewardType.MEGA_STONE: return (c.unlockedMegaStones?.length ?? 0) > 0;
      case SkillTreeRewardType.DYNA_MUSHROOM: return !!c.unlockedMaxMushrooms;
      case SkillTreeRewardType.GLITCH_CHANGE: return this.getAvailableGlitchForms(c).length > 0;
      case SkillTreeRewardType.TYPE_SWITCHER: return true;
      case SkillTreeRewardType.TYPE_BALL_FILTERED: return true;
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: return this.getAvailableGlitchForms(c).length > 0;
      case SkillTreeRewardType.PERMA_ITEM: return true;
      case SkillTreeRewardType.ESSENCE_BUNDLE: {
        const types = [c.type1, c.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
        return types.length > 0 || Object.values(Type).some(v => typeof v === 'number');
      }
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: return true;
      case SkillTreeRewardType.SKILL_POINTS:
      case SkillTreeRewardType.SKILL_TREE_TOKENS:
        return true;
      case SkillTreeRewardType.TERA_ABILITY: return (c.unlockedConditionalAbilities || []).some(a => !allAbilities[a]?.name?.endsWith(" (N)"));
      case SkillTreeRewardType.SMITTY_ABILITY: return (c.unlockedSmittyAbilities?.length ?? 0) > 0;
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT: return (c.unlockedAbilities?.length ?? 0) > 0 || Object.values(Abilities).some(v => typeof v === 'number');
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT: return c.unlockedBallRaritySelect?.master ?? false;
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT: return c.unlockedBallRaritySelect?.rogue ?? false;
      case SkillTreeRewardType.REVIVE_BOOST: return !!c.reviveBoostTargets || true;
      case SkillTreeRewardType.CATCH_RATE_BONUS: return true;
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: return true;

      case SkillTreeRewardType.GOLDEN_POKEBALL: return !!c.unlockedGoldenPokeball;
      case SkillTreeRewardType.MASTER_BALL: return !!c.unlockedMasterBall;
      case SkillTreeRewardType.VOID_BALL: return !!c.unlockedVoidBall;
      case SkillTreeRewardType.MONEY_REWARD: return !!c.unlockedMoneyReward;
      case SkillTreeRewardType.PERMA_MONEY: return !!c.unlockedPermaMoney;
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: return true;
      case SkillTreeRewardType.EGG_VOUCHER: return true;
      case SkillTreeRewardType.TERA_TYPE: return true;
      case SkillTreeRewardType.PARTY_ABILITY_GRANT: return true;

      case SkillTreeRewardType.HEALING_ITEMS: return !!c.unlockedHealingItems;
      case SkillTreeRewardType.MEMORY_MUSHROOM: return !!c.unlockedMemoryMushroom;
      case SkillTreeRewardType.BERRY_ITEMS: return !!c.unlockedBerries;
      case SkillTreeRewardType.ABILITY_SWITCHER: return !!c.unlockedAbilitySwitchers;
      case SkillTreeRewardType.GENERAL_ITEMS: return !!c.unlockedGeneralItems;
      case SkillTreeRewardType.BATON_ITEM: return !!c.unlockedBaton;
      case SkillTreeRewardType.PP_MAX_ITEM: return !!c.unlockedPPMax;
      case SkillTreeRewardType.ROGUE_BALL: return !!c.unlockedRogueBall;
      case SkillTreeRewardType.BOUNTY_SELECT: return true;
      default: return false;
    }
  }

  private generateChampionTM(championData: PlayableChampionData): SkillTreeReward {
    const selectedTM = SkillTreeSelectors.pickChampionTM(championData);

    return {
      type: SkillTreeRewardType.TM_FILTERED,
      data: { moveId: selectedTM },
      immediate: false
    };
  }

  private generateChampionXM(championData: PlayableChampionData): SkillTreeReward {
    const selectedXM = SkillTreeSelectors.pickChampionXM(championData);

    return {
      type: SkillTreeRewardType.XM_FILTERED,
      data: { moveId: selectedXM },
      immediate: false
    };
  }

  private generateSignaturePokemon(championData: PlayableChampionData): SkillTreeReward {
    const signaturePokemon = SkillTreeSelectors.pickSignaturePokemon(championData);

    const speciesName = Species[signaturePokemon].toLowerCase();
    const altBuildKey = `${speciesName}_${championData.id}_signature` as PokemonAltBuildId;
    const altBuild = POKEMON_ALT_BUILDS[altBuildKey];

    return {
      type: SkillTreeRewardType.SIGNATURE_POKEMON,
      data: {
        species: signaturePokemon,
        altBuildId: altBuildKey,
        altBuild: altBuild
      },
      immediate: false
    };
  }

  private generateGeneralPokemon(championData: PlayableChampionData): SkillTreeReward {
    const selectedPokemon = SkillTreeSelectors.pickGeneralPokemon(championData, this.scene);

    return {
      type: SkillTreeRewardType.GENERAL_POKEMON,
      data: { species: selectedPokemon, nodeTypes: this.currentNodeTypes.slice() },
      immediate: false
    };
  }

  private generateLegendaryPokemon(championData: PlayableChampionData): SkillTreeReward {
    const legendaryPokemon = SkillTreeSelectors.pickLegendaryPokemon(championData);

    return {
      type: SkillTreeRewardType.LEGENDARY_POKEMON,
      data: { species: legendaryPokemon, prioritize: true },
      immediate: false
    };
  }

  private generateChampionAbility(championData: PlayableChampionData): SkillTreeReward {
    const selectedAbility = SkillTreeSelectors.pickChampionAbility(championData);

    return {
      type: SkillTreeRewardType.ABILITY_GRANT,
      data: { abilityId: selectedAbility },
      immediate: false
    };
  }

  private generateTrainerBondAbility(championData: PlayableChampionData): SkillTreeReward {
    const selectedAbility = SkillTreeSelectors.pickTrainerBondAbility(championData);

    return {
      type: SkillTreeRewardType.TRAINER_BOND_ABILITY,
      data: {
        abilityId: selectedAbility,
        activationChance: 0.05
      },
      immediate: false
    };
  }

  private generateStatBoost(championData: PlayableChampionData): SkillTreeReward {
    const [selectedStats, boostPercent] = SkillTreeSelectors.pickStatBoostStats(championData);

    return {
      type: SkillTreeRewardType.STAT_BOOST,
      data: {
        stats: selectedStats,
        boostPercent
      },
      immediate: false
    };
  }

  private generateMoveUpgrade(championData: PlayableChampionData): SkillTreeReward {
    const selectedUpgrade = SkillTreeSelectors.pickSpecificMoveUpgrade();

    return {
      type: SkillTreeRewardType.MOVE_UPGRADE,
      data: selectedUpgrade,
      immediate: false
    };
  }
  private generateSpecificMoveUpgrade(championData: PlayableChampionData): SkillTreeReward {
    const pick = SkillTreeSelectors.pickSpecificMoveUpgrade(championData);

    return {
      type: SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC,
      data: pick,
      immediate: false
    };
  }

  private generateMegaStone(championData: PlayableChampionData): SkillTreeReward {
    const selectedMegaStone = SkillTreeSelectors.pickMegaStone(championData);

    return {
      type: SkillTreeRewardType.MEGA_STONE,
      data: { megaStone: selectedMegaStone },
      immediate: false
    };
  }

  private generateDynaMushroom(championData: PlayableChampionData): SkillTreeReward {
    return {
      type: SkillTreeRewardType.DYNA_MUSHROOM,
      data: { item: SkillTreeSelectors.pickDynaMushroomItem() },
      immediate: false
    };
  }
  private generateGlitchChange(_championData: PlayableChampionData): SkillTreeReward {
    return {
      type: SkillTreeRewardType.GLITCH_CHANGE,
      data: { item: SkillTreeSelectors.pickGlitchiGlitchiFruititem() },
      immediate: false
    };
  }

  private generateTypeSwitcher(championData: PlayableChampionData): SkillTreeReward {
    const selected = SkillTreeSelectors.pickTypeSwitcherTypes(championData);
    return {
      type: SkillTreeRewardType.TYPE_SWITCHER,
      data: { types: selected },
      immediate: false
    };
  }

  private generateChampionTypeBall(championData: PlayableChampionData): SkillTreeReward {
    const selectedType = SkillTreeSelectors.pickChampionTypeBallType(championData);
    return {
      type: SkillTreeRewardType.TYPE_BALL_FILTERED,
      data: { ballType: selectedType },
      immediate: false
    };
  }

  private getEffectiveRankForNode(altBuildId: PokemonAltBuildId, nodeStoredRank: number): number {
    if (!this.scene) return nodeStoredRank;

    const party = this.scene.getParty();
    const matchingPokemon = party.find(p => p.altBuildId === altBuildId);

    if (matchingPokemon && matchingPokemon.altBuildRank) {
      const currentRank = matchingPokemon.altBuildRank;
      return Math.min(10, Math.max(currentRank + 1, nodeStoredRank));
    }

    return nodeStoredRank;
  }

  private getMaxMoveLevelForRank(rank: number): number {
    if (rank >= 4) return 75;
    if (rank >= 2) return 50;
    if (rank >= 1) return 25;
    return 0;
  }

  private generatePokemonAltBuild(championData: PlayableChampionData): SkillTreeReward {
    const displaySpecies = Array.isArray(championData.signaturePokemon) && championData.signaturePokemon.length > 0
      ? championData.signaturePokemon[0]
      : undefined;
    return {
      type: SkillTreeRewardType.POKEMON_ALT_BUILD,
      data: {
        signatureAltBuild: true,
        species: displaySpecies
      },
      immediate: false
    };
  }

  private generateGlitchFormUnlock(championData: PlayableChampionData): SkillTreeReward {
    const selectedForm = SkillTreeSelectors.pickGlitchFormKey(championData);
    const unlockableId = championData.glitchFormUnlockableIds?.[selectedForm];

    return {
      type: SkillTreeRewardType.GLITCH_FORM_UNLOCK,
      data: { formKey: selectedForm, unlockableId: unlockableId },
      immediate: true
    };
  }

  private generateTeraAbility(championData: PlayableChampionData): SkillTreeReward {
    const result = SkillTreeSelectors.pickTeraAbilityWithType(championData);
    const fallbackTypes = [championData.type1, championData.type2].filter(t => t !== undefined && t !== null) as Type[];
    return {
      type: SkillTreeRewardType.TERA_ABILITY,
      data: {
        abilityId: result?.ability ?? (championData.unlockedConditionalAbilities || [])[0],
        type: result?.type ?? (fallbackTypes[0] ?? Type.NORMAL),
        activationChance: 0.10
      },
      immediate: false
    };
  }

  private generateSmittyAbility(championData: PlayableChampionData): SkillTreeReward {
    const selectedAbility = SkillTreeSelectors.pickSmittyAbility(championData);

    return {
      type: SkillTreeRewardType.SMITTY_ABILITY,
      data: { abilityId: selectedAbility },
      immediate: false
    };
  }

  private generatePassiveAbilityGrant(championData: PlayableChampionData): SkillTreeReward {
    const selectedAbility = SkillTreeSelectors.pickPassiveAbility(championData);

    return {
      type: SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
      data: { abilityId: selectedAbility },
      immediate: false
    };
  }

  private generatePermaItem(): SkillTreeReward {
    const selectedItem = SkillTreeSelectors.pickPermaItemType();

    return {
      type: SkillTreeRewardType.PERMA_ITEM,
      data: { permaType: selectedItem },
      immediate: false
    };
  }
  private generatePermaMoney(): SkillTreeReward {
    const amount = (Utils.randSeedInt(5) + 1) * 1000;
    return { type: SkillTreeRewardType.PERMA_MONEY, data: { amount }, immediate: true };
  }
  private generateRelicGold(): SkillTreeReward {
    return { type: SkillTreeRewardType.MONEY_REWARD, data: {}, immediate: false };
  }

  private generateEssenceBundle(championData: PlayableChampionData): SkillTreeReward {
    const { type: selectedType, amount } = SkillTreeSelectors.pickEssenceBundle(championData);
    return {
      type: SkillTreeRewardType.ESSENCE_BUNDLE,
      data: { type: selectedType, amount },
      immediate: true
    };
  }
  private generateEssenceTypeWeight(championData: PlayableChampionData): SkillTreeReward {
    const { type, weight } = SkillTreeSelectors.pickEssenceWeight(championData);
    return { type: SkillTreeRewardType.ESSENCE_TYPE_WEIGHT, data: { type, weight }, immediate: true };
  }
  private generateTypeBooster(championData: PlayableChampionData): SkillTreeReward {
    const type = SkillTreeSelectors.pickTypeBoosterType(championData);
    return { type: SkillTreeRewardType.TYPE_BOOSTER_ITEM, data: { type }, immediate: false };
  }

  private generateGoldenPokeball(): SkillTreeReward {
    return { type: SkillTreeRewardType.GOLDEN_POKEBALL, data: {}, immediate: false };
  }
  private generateMasterBall(): SkillTreeReward {
    return { type: SkillTreeRewardType.MASTER_BALL, data: {}, immediate: false };
  }
  private generateVoidBall(): SkillTreeReward {
    return { type: SkillTreeRewardType.VOID_BALL, data: {}, immediate: false };
  }
  private generateRogueballRaritySelect(): SkillTreeReward {
    return { type: SkillTreeRewardType.ROGUEBALL_RARITY_SELECT, data: {}, immediate: false };
  }
  private generateMasterballRaritySelect(): SkillTreeReward {
    return { type: SkillTreeRewardType.MASTERBALL_RARITY_SELECT, data: {}, immediate: false };
  }
  private generateEggVoucher(_championData: PlayableChampionData): SkillTreeReward {
    return { type: SkillTreeRewardType.EGG_VOUCHER, data: { tier: Utils.randSeedItem([VoucherType.REGULAR, VoucherType.PLUS, VoucherType.PREMIUM]) }, immediate: false };
  }
  private generateCatchRateBonus(championData: PlayableChampionData): SkillTreeReward {
    const amount = 0.1;

    let types = championData.unlockedCatchRateTypes?.slice();
    if (!types || types.length === 0) {
      const championTypes = [championData.type1, championData.type2].filter(t => t !== undefined && t !== null) as Type[];
      if (championTypes.length === 0) {
        types = [];
      } else if (championTypes.length === 1) {
        types = championTypes;
      } else {

        const roll = Utils.randSeedInt(100);
        if (roll < 45) {
          types = [championTypes[0]];
        } else if (roll < 90) {
          types = [championTypes[1]];
        } else {
          types = championTypes;
        }
      }
    }
    return { type: SkillTreeRewardType.CATCH_RATE_BONUS, data: { amount, types }, immediate: true };
  }
  private generateReviveBoost(championData: PlayableChampionData): SkillTreeReward {

    let data = championData.reviveBoostTargets;
    if (!data || !data.types || data.types.length === 0) {
      const championTypes = [championData.type1, championData.type2].filter(t => t !== undefined && t !== null) as Type[];
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

      data = { types: selectedTypes, amount: data?.amount || 1 };
    }
    return { type: SkillTreeRewardType.REVIVE_BOOST, data, immediate: true };
  }
  private generateFusionSecondaryPriority(championData: PlayableChampionData): SkillTreeReward {

    const pref = SkillTreeSelectors.pickFusionSecondaryPriority(championData);
    return { type: SkillTreeRewardType.FUSION_SECONDARY_PRIORITY, data: pref, immediate: true };
  }
  private generateTeraType(championData: PlayableChampionData): SkillTreeReward {

    const championTypes = [championData.type1, championData.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    const preferredTeraTypes = championData.preferredTeraTypes;
    if (preferredTeraTypes && preferredTeraTypes.length > 0) {
      return {
        type: SkillTreeRewardType.TERA_TYPE,
        data: { type: Utils.randSeedItem(preferredTeraTypes) },
        immediate: false
      };
    }
    if (championTypes.length > 0) {
      return {
        type: SkillTreeRewardType.TERA_TYPE,
        data: { type: Utils.randSeedItem(championTypes) },
        immediate: false
      };
    }
    const applicableTypes = (Utils.getEnumValues(Type) as Type[])
      .filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
    const stellarWeight = 0.25;
    const normalWeight = 1.0;
    const weightedPool: Type[] = [];
    applicableTypes.forEach(type => {
      const weight = type === Type.STELLAR ? stellarWeight : normalWeight;
      const count = Math.max(1, Math.floor(weight * 100));
      for (let i = 0; i < count; i++) {
        weightedPool.push(type);
      }
    });

    return {
      type: SkillTreeRewardType.TERA_TYPE,
      data: { type: Utils.randSeedItem(weightedPool) },
      immediate: false
    };
  }

  private generateHealingItems(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.HEALING_ITEMS,
      data: {},
      immediate: false
    };
  }

  private generateMemoryMushroom(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.MEMORY_MUSHROOM,
      data: {},
      immediate: false
    };
  }

  private generateBerryItems(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.BERRY_ITEMS,
      data: {},
      immediate: false
    };
  }

  private generateAbilitySwitcher(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.ABILITY_SWITCHER,
      data: {},
      immediate: false
    };
  }

  private generateGeneralItems(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.GENERAL_ITEMS,
      data: {},
      immediate: false
    };
  }

  private generateBatonItem(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.BATON_ITEM,
      data: {},
      immediate: false
    };
  }

  private generatePPMaxItem(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.PP_MAX_ITEM,
      data: {},
      immediate: false
    };
  }

  private generateRogueBall(): SkillTreeReward {
    return {
      type: SkillTreeRewardType.ROGUE_BALL,
      data: {},
      immediate: false
    };
  }

  private generatePartyAbilityGrant(): SkillTreeReward {
    const maxAbilityIndex = 62;
    const abilities = Object.values(allAbilities)
      .filter(a => !a.name.endsWith(" (N)") && a.id > 0 && a.id <= maxAbilityIndex)
      .map(a => a.id);
    const selectedAbility = Utils.randSeedItem(abilities);

    return {
      type: SkillTreeRewardType.PARTY_ABILITY_GRANT,
      data: { abilityId: selectedAbility },
      immediate: false
    };
  }

  private generateSkillPoints(): SkillTreeReward {
    const amount = SkillTreeSelectors.pickSkillPoints();

    return {
      type: SkillTreeRewardType.SKILL_POINTS,
      data: { amount },
      immediate: true
    };
  }

  private generateSkillTreeTokens(): SkillTreeReward {
    const amount = SkillTreeSelectors.pickSkillTreeTokens();

    return {
      type: SkillTreeRewardType.SKILL_TREE_TOKENS,
      data: { amount },
      immediate: true
    };
  }

  public getRewardName(rewardData: SkillTreeReward): string {
    switch (rewardData.type) {
      case SkillTreeRewardType.TM_FILTERED:
        return i18next.t("skillTree:rewards.tm", { move: (allMoves as any)?.[rewardData.data?.moveId]?.name || i18next.t("skillTree:unknownReward") });

      case SkillTreeRewardType.XM_FILTERED:
        return i18next.t("skillTree:rewards.xm", { move: (allMoves as any)?.[rewardData.data?.moveId]?.name || i18next.t("skillTree:unknownReward") });

      case SkillTreeRewardType.SIGNATURE_POKEMON: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        const sigSpecies = rewardData.data?.species;
        if (sigSpecies) {
          try {
            const sp = getPokemonSpecies(sigSpecies);
            if (sp) {
              return i18next.t("skillTree:rewards.signaturePokemonName", {
                champion: championDisplayName,
                pokemon: sp.name
              });
            }
          } catch {}
        }
        return i18next.t("skillTree:rewards.signaturePokemonMysteryName", {
          champion: championDisplayName
        });
      }

      case SkillTreeRewardType.GENERAL_POKEMON: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        return i18next.t("skillTree:rewards.generalPokemon", { champion: championDisplayName });
      }

      case SkillTreeRewardType.LEGENDARY_POKEMON: {
        const species = rewardData.data?.species;
        let pokemonName = i18next.t("skillTree:unknownReward");
        if (species) { try { pokemonName = getPokemonSpecies(species)?.name ?? pokemonName; } catch {} }
        return i18next.t("skillTree:rewards.legendaryPokemon", { pokemon: pokemonName });
      }

      case SkillTreeRewardType.ABILITY_GRANT:
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        return (allAbilities as any)?.[rewardData.data?.abilityId]?.name || i18next.t("skillTree:unknownReward");

      case SkillTreeRewardType.SMITTY_ABILITY: {
        const abilityName = (allAbilities as any)?.[rewardData.data?.abilityId]?.name || i18next.t("skillTree:unknownReward");
        return i18next.t("skillTree:rewards.smittyAbility", { ability: abilityName });
      }

      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        return i18next.t("skillTree:rewards.trainerBondGeneric", { champion: championDisplayName });
      }

      case SkillTreeRewardType.TERA_ABILITY:
        return i18next.t("skillTree:rewards.teraAbilityGeneric");

      case SkillTreeRewardType.STAT_BOOST: {
        const stats = (rewardData.data?.stats || []);
        const statNames = stats.map((stat: any) => (Stat as any)[stat] || "?").join(", ");

        try {
          const manager = ChampionManager.getInstance();
          const championData = manager.getChampionData(this.championId);
          const championName = ChampionUtils.getChampionDisplayName(this.championId);
          const flavorKey = `skillTree:rewards.statBoostFlavor_${this.championId}`;
          const flavorText = i18next.t(flavorKey, { defaultValue: "Training" });

          return i18next.t("skillTree:rewards.statBoostVitamin", {
            champion: championName,
            flavor: flavorText,
            stats: statNames
          });
        } catch {}

        return i18next.t("skillTree:rewards.statBoostFallback", { stats: statNames });
      }

      case SkillTreeRewardType.MEGA_STONE: {
        const megaStoneId = rewardData.data?.megaStone || rewardData.data?.formChangeItem;
        const megaStoneKey = (FormChangeItem as any)[megaStoneId];
        const megaStoneName = megaStoneKey ? i18next.t(`modifierType:FormChangeItem.${megaStoneKey}`) : "?";
        return i18next.t("skillTree:rewards.megaStone", { item: megaStoneName });
      }
      case SkillTreeRewardType.DYNA_MUSHROOM:
        return i18next.t("skillTree:rewards.dynaMushroom");
      case SkillTreeRewardType.GLITCH_CHANGE:
        return i18next.t("skillTree:rewards.glitchChange");
      case SkillTreeRewardType.TYPE_SWITCHER:
        return i18next.t("skillTree:rewards.typeSwitcherGeneric");
      case SkillTreeRewardType.POKEMON_ALT_BUILD: {
        const isSignatureAltBuild = rewardData.data?.signatureAltBuild === true || !rewardData.data?.altBuildId;
        if (isSignatureAltBuild) {
          return i18next.t("skillTree:rewards.signatureAltBuild", { defaultValue: "Signature Alt Build" });
        }
        const altBuildId = rewardData.data?.altBuildId;
        const altBuildDef = altBuildId ? POKEMON_ALT_BUILDS[altBuildId] : undefined;
        const speciesId = rewardData.data?.species || altBuildDef?.species;
        let pokemonName = i18next.t("skillTree:fallback.unknownPokemon");
        if (speciesId) { try { pokemonName = getPokemonSpecies(speciesId)?.name ?? pokemonName; } catch {} }
        const buildName = altBuildId ? ChampionUtils.getAltBuildDisplayName(altBuildId) : i18next.t("skillTree:fallback.unknownBuild");

        const actualRank = rewardData.data?.rank ?? altBuildDef?.rank ?? 1;
        const rankLabel = actualRank >= 10
          ? `${Utils.intToRoman(10)}:${i18next.t("skillTree:rankMax")}`
          : Utils.intToRoman(actualRank);
        const buildNameWithRank = `${buildName} ${rankLabel}`;

        return i18next.t("skillTree:rewards.altBuild", {
          pokemon: pokemonName,
          build: buildNameWithRank
        });
      }
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        try {
          const unlockableId = rewardData.data?.unlockableId;
          if (unlockableId && this.scene) {
            const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(unlockableId);
            if (questUnlockData && questUnlockData.rewardId) {
              const species = getPokemonSpecies(questUnlockData.rewardId);
              if (species) {
                const glitchFormKey = species.getGlitchFormName?.(true, undefined, questUnlockData.rewardType) || rewardData.data?.formKey || "unknown";
                const glitchFormName = glitchFormKey !== "unknown" ? i18next.t(`glitchNames:${glitchFormKey}.name`, { defaultValue: glitchFormKey }) : i18next.t("skillTree:fallback.unknownGlitchForm");
                return i18next.t("skillTree:rewards.glitchForm", { glitchFormName });
              }
            }
          }
        } catch (error) {
          console.warn("Failed to get glitch form name:", error);
        }
        const glitchFormKey = rewardData.data?.formKey ?? "unknown";
        const glitchFormName = glitchFormKey !== "unknown" ? i18next.t(`glitchNames:${glitchFormKey}.name`, { defaultValue: glitchFormKey }) : "Unknown";
        return i18next.t("skillTree:rewards.glitchForm", { glitchFormName });
      }
      case SkillTreeRewardType.PERMA_ITEM:
        const permaType = rewardData.data?.permaType;
        if (permaType !== undefined && permaType !== null && typeof permaType === 'string') {
          const localizedName = i18next.t(`modifierType:ModifierType.PermaModifierType.${permaType}.name`);
          return i18next.t("skillTree:rewards.permaItem", { item: localizedName });
        }
        return i18next.t("skillTree:rewards.permaItem", { item: i18next.t("skillTree:fallback.unknownItem") });
      case SkillTreeRewardType.MOVE_UPGRADE:
        return i18next.t("skillTree:rewards.moveUpgrade");
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        return i18next.t("skillTree:rewards.moveUpgradeSpecific", { champion: championDisplayName });
      }
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: {
        const typeId = rewardData.data?.type;
        if (typeId === undefined) return i18next.t("skillTree:fallback.unknownItem");

        const itemName = this.getAttackTypeBoosterItemName(typeId);
        if (!itemName) return i18next.t("skillTree:fallback.unknownItem");

        const localeKey = itemName.replace(/[ \-]/g, "_").toLowerCase();
        return i18next.t(`modifierType:AttackTypeBoosterItem.${localeKey}`);
      }
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
        return i18next.t("skillTree:rewards.rogueballRarity");
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
        return i18next.t("skillTree:rewards.masterballRarity");
      case SkillTreeRewardType.GOLDEN_POKEBALL:
        return i18next.t("skillTree:rewards.goldenPokeball");
      case SkillTreeRewardType.MASTER_BALL:
        return i18next.t("skillTree:rewards.masterBall");
      case SkillTreeRewardType.VOID_BALL:
        return i18next.t("skillTree:rewards.voidBall");
      case SkillTreeRewardType.TYPE_BALL_FILTERED: {
        const ballTypeId = rewardData.data?.ballType;
        const typeName = ballTypeId !== undefined ? this.formatTypesForTooltip([ballTypeId]) : "?";
        return i18next.t("skillTree:rewards.typeBall", { type: typeName });
      }
      case SkillTreeRewardType.EGG_VOUCHER:
        return i18next.t("skillTree:rewards.eggVoucher", { tier: (VoucherType as any)[rewardData.data?.tier] || "?" });
      case SkillTreeRewardType.MONEY_REWARD:
        return i18next.t("skillTree:rewards.relicGold");
      case SkillTreeRewardType.PERMA_MONEY:
        return i18next.t("skillTree:rewards.permaMoney", { amount: rewardData.data?.amount ?? 0 });
      case SkillTreeRewardType.CATCH_RATE_BONUS: {
        const types = (rewardData.data?.types as Type[] | undefined) || [];
        const typeNames = types.length > 0
          ? this.formatTypesForTooltip(types)
          : "All";
        const percent = ((rewardData.data?.amount ?? 0.1) * 100).toFixed(0);
        return i18next.t("skillTree:rewards.catchBonus", { types: typeNames, percent });
      }
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: {
        const ewType = rewardData.data?.type;
        const ewTypeName = ewType !== undefined ? this.formatTypesForTooltip([ewType]) : "?";
        return i18next.t("skillTree:rewards.essenceTypeWeight", { type: ewTypeName, weight: rewardData.data?.weight ?? 0 });
      }
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: {
        const pref = rewardData.data as { types?: Type[]; species?: Species[] } | undefined;
        const types = pref?.types || [];
        const typeNames = this.formatTypesForTooltip(types);
        return i18next.t("skillTree:rewards.fusionSecondaryPriority", { types: typeNames });
      }
      case SkillTreeRewardType.REVIVE_BOOST: {
        const reviveTypes = (rewardData.data?.types as Type[] | undefined) || [];
        const reviveTypeNames = reviveTypes.length > 0
          ? this.formatTypesForTooltip(reviveTypes)
          : "All";
        return i18next.t("skillTree:rewards.reviveBoost", { types: reviveTypeNames });
      }
      case SkillTreeRewardType.TERA_TYPE:
        return i18next.t("skillTree:rewards.teraType", { type: rewardData.data?.type !== undefined ? this.formatTypesForTooltip([rewardData.data.type]) : "?" });

      case SkillTreeRewardType.SKILL_POINTS:
        return i18next.t("skillTree:rewards.skillPoints", { amount: rewardData.data?.amount ?? 0 });

      case SkillTreeRewardType.SKILL_TREE_TOKENS:
        return i18next.t("skillTree:rewards.tokens", { amount: rewardData.data?.amount ?? 0 });

      case SkillTreeRewardType.ESSENCE_BUNDLE:
        return i18next.t("skillTree:rewards.essenceBundle", {
          type: rewardData.data?.type !== undefined ? this.formatTypesForTooltip([rewardData.data.type]) : "?",
          amount: rewardData.data?.amount ?? 0
        });

      case SkillTreeRewardType.HEALING_ITEMS:
        return i18next.t("skillTree:rewards.healingItems");
      case SkillTreeRewardType.MEMORY_MUSHROOM:
        return i18next.t("skillTree:rewards.memoryMushroom");
      case SkillTreeRewardType.BERRY_ITEMS:
        return i18next.t("skillTree:rewards.berryItems");
      case SkillTreeRewardType.ABILITY_SWITCHER:
        return i18next.t("skillTree:rewards.abilitySwitcher");
      case SkillTreeRewardType.GENERAL_ITEMS:
        return i18next.t("skillTree:rewards.generalItems");
      case SkillTreeRewardType.BATON_ITEM:
        return i18next.t("skillTree:rewards.batonItem");
      case SkillTreeRewardType.PP_MAX_ITEM:
        return i18next.t("skillTree:rewards.ppMaxItem");
      case SkillTreeRewardType.ROGUE_BALL:
        return i18next.t("skillTree:rewards.rogueBall");
      case SkillTreeRewardType.PARTY_ABILITY_GRANT: {
        return i18next.t("skillTree:rewards.partyAbilityGrant", { defaultValue: "Party Abilities" });
      }

      case SkillTreeRewardType.BOUNTY_SELECT:
        return i18next.t("skillTree:rewards.bountyNodeInTree");

      default:
        return i18next.t("skillTree:unknownReward");
    }
  }

  public getRewardDescription(rewardData: SkillTreeReward): string {
    switch (rewardData.type) {
      case SkillTreeRewardType.TM_FILTERED: {
        const move = (allMoves as any)?.[rewardData.data?.moveId];
        const moveName = move?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("modifierType:ModifierType.TmModifierType.description", { moveName });
        const moveDesc = move?.description || "";
        return moveDesc ? `${modifierDesc}\n${moveName}: ${moveDesc}` : modifierDesc;
      }

      case SkillTreeRewardType.XM_FILTERED: {
        const move = (allMoves as any)?.[rewardData.data?.moveId];
        const moveName = move?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("modifierType:ModifierType.AnyTmModifierType.description", { moveName });
        const moveDesc = move?.description || "";
        return moveDesc ? `${modifierDesc}\n${moveName}: ${moveDesc}` : modifierDesc;
      }

      case SkillTreeRewardType.SIGNATURE_POKEMON: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        const sigSpeciesId = rewardData.data?.species;
        let sigIntroDesc: string;
        if (sigSpeciesId) {
          try {
            const sp = getPokemonSpecies(sigSpeciesId);
            if (sp) {
              sigIntroDesc = i18next.t("skillTree:descriptions.signaturePokemon", { champion: championDisplayName, pokemon: sp.name });
            } else {
              sigIntroDesc = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: championDisplayName });
            }
          } catch {
            sigIntroDesc = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: championDisplayName });
          }
        } else {
          sigIntroDesc = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: championDisplayName });
        }
        const sigGrowthLore = i18next.t("skillTree:descriptions.signaturePokemonGrowthLore", {
          defaultValue: "Signature Pokemon have the potential to grow immensely stronger, if their trainer is able to override reality and unlock their normally dormant abilities."
        });
        const sigRankInfoDesc = i18next.t("skillTree:descriptions.signaturePokemonRankInfoGeneric");
        return `${sigIntroDesc}\n\n${sigGrowthLore}\n\n${sigRankInfoDesc}`;
      }

      case SkillTreeRewardType.GENERAL_POKEMON: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let description = i18next.t("skillTree:descriptions.generalPokemon", { champion: championDisplayName });

        try {
          const persistedNodeTypes = rewardData?.data?.nodeTypes as Type[] | undefined;
          const championTypes = (persistedNodeTypes && persistedNodeTypes.length > 0)
            ? persistedNodeTypes
            : this.currentNodeTypes.length > 0
              ? this.currentNodeTypes
              : (() => { const m = ChampionManager.getInstance(); const cd = m.getChampionData(this.championId); return [cd.type1, cd.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[]; })();

          if (championTypes.length > 0) {
            const label = i18next.t("skillTree:descriptions.typesLabel");
            if (this.tooltipPreviewMode && this.isRandomTypeChampion()) {
              description += `\n\n${label} [color=#ffdd44]${this.getPreviewTypeLabel()}[/color]`;
            } else {
              const toHex2 = (v: number) => v.toString(16).padStart(2, "0");
              const formatType = (t: Type) => {
                const typeKey = Type[t];
                const name = i18next.t(`pokemonInfo:Type.${typeKey}`, { defaultValue: typeKey });
                const [r, g, b] = getTypeRgb(t);
                const color = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
                return `[color=${color}]${name}[/color]`;
              };
              description += `\n\n${label} ${championTypes.map(formatType).join("/")}`;
            }
          } else if (this.isRandomTypeChampion()) {
            const label = i18next.t("skillTree:descriptions.typesLabel");
            description += `\n\n${label} [color=#ffdd44]${this.getPreviewTypeLabel()}[/color]`;
          }
        } catch {}

        return description;
      }

      case SkillTreeRewardType.LEGENDARY_POKEMON: {
        const species = rewardData.data?.species;
        let pokemonName = i18next.t("skillTree:fallback.unknownPokemon");
        if (species) { try { pokemonName = getPokemonSpecies(species)?.name ?? pokemonName; } catch {} }
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let championId = this.championId || "apollo_diana";
        if (championId === "apollo" || championId === "diana") {
          championId = "apollo_diana";
        }

        const flavorKey = `skillTree:descriptions.legendaryFlavorText_${championId}`;
        const flavorText = i18next.t(flavorKey, { champion: championDisplayName, pokemon: pokemonName });

        const technicalDesc = i18next.t("skillTree:descriptions.legendaryPokemon", { pokemon: pokemonName });

        return `${flavorText}\n\n${technicalDesc}`;
      }

      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let championId = this.championId || "apollo_diana";
        if (championId === "apollo" || championId === "diana") {
          championId = "apollo_diana";
        }

        const flavorKey = `skillTree:descriptions.trainerBondFlavorText_${championId}`;
        const championFlavorText = i18next.t(flavorKey, { champion: championDisplayName });
        const genericDesc = i18next.t("skillTree:descriptions.trainerBondGeneric", { champion: championDisplayName });

        return `${championFlavorText}\n\n[color=#ffdd44]${genericDesc}[/color]`;
      }

      case SkillTreeRewardType.ABILITY_GRANT: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("skillTree:descriptions.abilityGrant");
        const abilityDesc = ability?.description || "";
        return abilityDesc ? `${modifierDesc}\n${abilityName}: ${abilityDesc}` : modifierDesc;
      }

      case SkillTreeRewardType.STAT_BOOST: {
        const stats = (rewardData.data?.stats || []);
        const statNames = stats.map((stat: any) => (Stat as any)[stat] || "?").join(", ");
        const firstStatName = stats.length > 0 ? (Stat as any)[stats[0]] || "?" : "?";
        const percentText = ((rewardData.data?.boostPercent ?? 0) * 100).toFixed(0);

        try {
          const championTypes = this.currentNodeTypes.length > 0
            ? this.currentNodeTypes
            : (() => { const m = ChampionManager.getInstance(); const cd = m.getChampionData(this.championId); return [cd.type1, cd.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[]; })();

          if (championTypes.length > 0 && stats.length > 1) {
            const typeNames = this.formatTypesForTooltip(championTypes);
            return i18next.t("skillTree:descriptions.statBoostConditional", {
              stats: statNames,
              types: typeNames,
              percent: percentText,
              firstStat: firstStatName
            });
          }
        } catch {
        }

        return i18next.t("skillTree:descriptions.statBoost", {
          stats: statNames,
          percent: percentText
        });
      }

      case SkillTreeRewardType.MEGA_STONE:
        return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description");
      case SkillTreeRewardType.DYNA_MUSHROOM:
        return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description");
      case SkillTreeRewardType.GLITCH_CHANGE:
        return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description");
      case SkillTreeRewardType.TYPE_SWITCHER:
        return i18next.t("skillTree:descriptions.typeSwitcherGeneric");
      case SkillTreeRewardType.TERA_ABILITY:
        return i18next.t("skillTree:descriptions.teraAbilityGeneric");
      case SkillTreeRewardType.SMITTY_ABILITY: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const abilityDesc = ability?.description || "";
        const warningText = i18next.t("skillTree:descriptions.smittyAbility");
        return abilityDesc ? `${warningText}\n${abilityName}: ${abilityDesc}` : warningText;
      }
      case SkillTreeRewardType.POKEMON_ALT_BUILD: {
        const isSignatureAltBuild = rewardData.data?.signatureAltBuild === true || !rewardData.data?.altBuildId;
        if (isSignatureAltBuild) {
          return i18next.t("skillTree:descriptions.signatureAltBuild", {
            defaultValue: "A unique alternate form for your Signature Pokémon - unlocked by the strength of you and your pokemon's BOND!"
          });
        }
        const altBuildId = rewardData.data?.altBuildId;
        const altBuildDef = altBuildId ? POKEMON_ALT_BUILDS[altBuildId] : undefined;
        const speciesId = rewardData.data?.species || altBuildDef?.species;
        let pokemonName = i18next.t("skillTree:fallback.unknownPokemon");
        if (speciesId) { try { pokemonName = getPokemonSpecies(speciesId)?.name ?? pokemonName; } catch {} }
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        const storedRank = rewardData.data?.rank ?? 1;
        const rank = altBuildId ? this.getEffectiveRankForNode(altBuildId as PokemonAltBuildId, storedRank) : storedRank;
        let currentRank = 0;
        try {
          if (this.scene && altBuildId) {
            const party = this.scene.getParty();
            currentRank = party.find(p => p.altBuildId === (altBuildId as PokemonAltBuildId))?.altBuildRank ?? 0;
          }
        } catch {}
        const rankLabel = currentRank >= 10
          ? `${Utils.intToRoman(10)}:${i18next.t("skillTree:rankMax")}`
          : Utils.intToRoman(rank);
        const altBuildName = altBuildId ? ChampionUtils.getAltBuildDisplayName(altBuildId) : i18next.t("skillTree:fallback.unknownBuild");

        const flavorKey = `skillTree:descriptions.altBuildFlavor_${this.championId}`;
        const flavorText = i18next.t(flavorKey, {
          champion: championDisplayName,
          pokemon: pokemonName,
          altBuildName: altBuildName,
          defaultValue: ""
        });

        let description = i18next.t("skillTree:descriptions.altBuildFlavorText", {
          flavorText,
          pokemon: pokemonName,
          altBuildName,
          rank: rankLabel
        });

        if (altBuildDef) {
          const changes: string[] = [];

          if (altBuildDef.typeChanges) {
            const [t1, t2] = altBuildDef.typeChanges;
            const filteredTypes = [t1, t2].filter(t => t !== undefined) as Type[];
            const typeList = this.formatTypesForTooltip(filteredTypes);
            if (typeList) {
              const label = i18next.t("skillTree:descriptions.altBuildTypes");
              changes.push(`[color=#ffdd44]${label}[/color] ${typeList}`);
            }
          }

          let effectiveAbilities;
          let isForbiddenRank = false;
          if (rank === 10 && altBuildDef.finalAbilityReplacements) {
            effectiveAbilities = altBuildDef.finalAbilityReplacements;
            isForbiddenRank = true;
          } else {
            effectiveAbilities = altBuildDef.abilityChanges;
          }

          if (effectiveAbilities) {
            const [a1, a2, ah] = effectiveAbilities;

            const initialAbilities = altBuildDef.abilityChanges;

            const abilityList = [a1, a2, ah]
              .filter(a => a !== undefined)
              .map((a, index) => {
                const name = (allAbilities as any)?.[a]?.name || i18next.t("skillTree:fallback.unknownAbility");

                if (isForbiddenRank && initialAbilities) {
                  const initialAbility = initialAbilities[index];
                  const abilityChanged = a !== initialAbility;
                  return abilityChanged ? `[color=#e13d3d]${name}[/color]` : name;
                }

                return name;
              })
              .join(" / ");
            if (abilityList) {
              const labelKey = isForbiddenRank ? "skillTree:descriptions.altBuildForbiddenAbilities" : "skillTree:descriptions.altBuildAbilities";
              const label = i18next.t(labelKey);
              changes.push(`[color=#ffdd44]${label}[/color] ${abilityList}`);
            }
          }

          let effectivePassive;
          let isForbiddenPassive = false;
          if (rank === 10 && altBuildDef.finalPassive !== undefined) {
            effectivePassive = altBuildDef.finalPassive;
            isForbiddenPassive = true;
          } else {
            effectivePassive = altBuildDef.passiveAbilityChange;
          }

          if (effectivePassive !== undefined) {
            const passiveAbilityName = (allAbilities as any)?.[effectivePassive]?.name || i18next.t("skillTree:fallback.unknownAbility");

            let passiveChanged = false;
            if (isForbiddenPassive && altBuildDef.passiveAbilityChange !== undefined) {
              passiveChanged = effectivePassive !== altBuildDef.passiveAbilityChange;
            }

            let hasPassiveUnlocked = false;
            let matchingPokemon: any = null;
            if (this.scene) {
              const party = this.scene.getParty();
              matchingPokemon = party.find(p => p.species.speciesId === speciesId);
              if (matchingPokemon) {
                hasPassiveUnlocked = matchingPokemon.passive === true;
              }
            }

            if (hasPassiveUnlocked && matchingPokemon) {
              const currentPassiveAbility = matchingPokemon.getPassiveAbility();
              const currentPassiveId = currentPassiveAbility ? Object.keys(allAbilities).find(key => (allAbilities as any)[key] === currentPassiveAbility) : undefined;
              const currentPassiveName = currentPassiveId ? ((allAbilities as any)[currentPassiveId]?.name || i18next.t("skillTree:fallback.unknownAbility")) : i18next.t("skillTree:fallback.unknownAbility");

              if (currentPassiveAbility && Object.values(allAbilities).indexOf(currentPassiveAbility) === effectivePassive) {
                const labelKey = isForbiddenPassive ? "skillTree:descriptions.altBuildForbiddenPassive" : "skillTree:descriptions.altBuildPassiveAbility";
                const label = i18next.t(labelKey);
                const displayName = (isForbiddenPassive && passiveChanged) ? `[color=#e13d3d]${passiveAbilityName}[/color]` : passiveAbilityName;
                changes.push(`[color=#ffdd44]${label}[/color] ${displayName}`);
              } else {
                const labelKey = isForbiddenPassive ? "skillTree:descriptions.altBuildForbiddenPassiveChange" : "skillTree:descriptions.altBuildPassiveAbilityChange";
                const label = i18next.t(labelKey);
                const newPassiveName = (isForbiddenPassive && passiveChanged) ? `[color=#e13d3d]${passiveAbilityName}[/color]` : `[color=#78c850]${passiveAbilityName}[/color]`;
                changes.push(`[color=#ffdd44]${label}[/color] [color=#e13d3d]${currentPassiveName}[/color] -> ${newPassiveName}`);
              }
            } else {
              const labelKey = isForbiddenPassive ? "skillTree:descriptions.altBuildForbiddenPassive" : "skillTree:descriptions.altBuildPassiveAbility";
              const label = i18next.t(labelKey);
              const displayName = (isForbiddenPassive && passiveChanged) ? `[color=#e13d3d]${passiveAbilityName}[/color]` : passiveAbilityName;
              changes.push(`[color=#ffdd44]${label}[/color] ${displayName}`);
            }
          }

          if (altBuildDef.statFocus && altBuildDef.statFocus.length > 0) {
            const defaultSpecies = speciesId ? getPokemonSpecies(speciesId) : null;
            if (defaultSpecies) {
              const originalStats = [...defaultSpecies.baseStats];
              const newBaseStats = calculateAltBuildStatsWithSwapping(originalStats, altBuildDef.statFocus, rank);

              const statNames = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD]
                .map(s => getStatName(s, true));

              const statValues = statNames.map((name, idx) => `${name}: ${newBaseStats[idx]}`).join(" | ");
              const bstLabel = i18next.t("pokemonInfo:Stat.Total");
              const bst = newBaseStats.reduce((sum, s) => sum + s, 0);

              const statsLabel = i18next.t("skillTree:descriptions.altBuildStats");
              changes.push(`[color=#ffdd44]${statsLabel}[/color] ${statValues} | ${bstLabel}: ${bst}`);
            }
          }

          let showMoves = false;
          if (altBuildDef.moveReplacements && Object.keys(altBuildDef.moveReplacements).length > 0) {
            if (this.scene) {
              const party = this.scene.getParty();
              const matchingPokemon = party.find(p => p.altBuildId === altBuildId);

              const currentMaxLevel = matchingPokemon
                ? this.getMaxMoveLevelForRank(matchingPokemon.altBuildRank || 0)
                : 0;
              const newMaxLevel = this.getMaxMoveLevelForRank(rank);

              showMoves = newMaxLevel > currentMaxLevel;
            } else {
              showMoves = (rank === 1);
            }
          }

          if (showMoves) {
            const maxMoveLevel = this.getMaxMoveLevelForRank(rank);
            const movesText = i18next.t("skillTree:descriptions.altBuildMovesUnlock", { level: maxMoveLevel });
            changes.push(`[color=#78c850]${movesText}[/color]`);
          }

          if (changes.length > 0) {
            description += "\n\n" + changes.join("\n");
          }
        }

        return description;
      }
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        try {
          const unlockableId = rewardData.data?.unlockableId;
          if (unlockableId && this.scene) {
            const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(unlockableId);
            if (questUnlockData && questUnlockData.rewardId) {
              const species = getPokemonSpecies(questUnlockData.rewardId);
              if (species) {
                const glitchFormKey = species.getGlitchFormName?.(true, undefined, questUnlockData.rewardType) || rewardData.data?.formKey || "unknown";
                const glitchFormName = glitchFormKey !== "unknown" ? i18next.t(`glitchNames:${glitchFormKey}.name`, { defaultValue: glitchFormKey }) : i18next.t("skillTree:fallback.unknownGlitchForm");
                const originalSpecies = species.name || i18next.t("skillTree:fallback.unknownPokemon");
                const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
                let championId = this.championId || "apollo_diana";
                if (championId === "apollo" || championId === "diana") {
                  championId = "apollo_diana";
                }

                const flavorKey = `skillTree:descriptions.glitchFormFlavor_${championId}`;
                const flavorText = i18next.t(flavorKey, { champion: championDisplayName, glitchFormName });

                const descKey = rewardData.data?.permanent ? "skillTree:descriptions.glitchFormPermanent" : "skillTree:descriptions.glitchForm";
                return i18next.t(descKey, {
                  flavorText,
                  glitchFormName,
                  originalSpecies
                });
              }
            }
          }
        } catch (error) {
          console.warn("Failed to get glitch form description:", error);
        }
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let championId = this.championId || "apollo_diana";
        if (championId === "apollo" || championId === "diana") {
          championId = "apollo_diana";
        }
        const glitchFormKey = rewardData.data?.formKey ?? "unknown";
        const glitchFormName = glitchFormKey !== "unknown" ? i18next.t(`glitchNames:${glitchFormKey}.name`, { defaultValue: glitchFormKey }) : "Unknown";
        const flavorText = i18next.t(`skillTree:descriptions.glitchFormFlavor_${championId}`, {
          champion: championDisplayName,
          glitchFormName
        });
        const descKey = rewardData.data?.permanent ? "skillTree:descriptions.glitchFormPermanent" : "skillTree:descriptions.glitchForm";
        return i18next.t(descKey, {
          flavorText,
          glitchFormName,
          originalSpecies: i18next.t("skillTree:fallback.unknownPokemon")
        });
      }
      case SkillTreeRewardType.PERMA_ITEM: {
        const permaType = rewardData.data?.permaType;
        if (permaType !== undefined && permaType !== null && typeof permaType === 'string') {
          return i18next.t(`modifierType:ModifierType.PermaModifierType.${permaType}.description`);
        }
        return i18next.t("skillTree:descriptions.permaItem", { item: i18next.t("skillTree:fallback.unknownItem") });
      }
      case SkillTreeRewardType.MOVE_UPGRADE:
        return i18next.t("skillTree:descriptions.moveUpgradeGeneric");
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
        return this.getSpecificMoveUpgradeDescription(rewardData.data);
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("skillTree:descriptions.passiveAbility");
        const abilityDesc = ability?.description || "";
        return abilityDesc ? `${modifierDesc}\n${abilityName}: ${abilityDesc}` : modifierDesc;
      }
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: {
        const moveType = rewardData.data?.type !== undefined ? this.formatTypesForTooltip([rewardData.data.type]) : i18next.t("skillTree:fallback.unknownType");
        return i18next.t("modifierType:ModifierType.AttackTypeBoosterModifierType.description", { moveType });
      }
      case SkillTreeRewardType.TERA_TYPE: {
        const type = rewardData.data?.type;
        const teraTypeName = type !== undefined ? this.formatTypesForTooltip([type]) : i18next.t("skillTree:fallback.unknownType");
        return i18next.t("modifierType:ModifierType.TerastallizeModifierType.description", {
          teraType: teraTypeName
        });
      }
      case SkillTreeRewardType.CATCH_RATE_BONUS: {
        const types = (rewardData.data?.types as Type[] | undefined) || [];
        const amount = (rewardData.data?.amount ?? 0.1) * 100;
        const typeNames = this.formatTypesForTooltip(types);

        return i18next.t("skillTree:descriptions.catchRateBonus", {
          types: typeNames,
          amount: amount.toFixed(0)
        });
      }
      case SkillTreeRewardType.ESSENCE_BUNDLE: {
        const essenceType = rewardData.data?.type !== undefined ? this.formatTypesForTooltip([rewardData.data.type]) : i18next.t("skillTree:fallback.unknownType");
        const essenceAmount = rewardData.data?.amount ?? 0;
        return i18next.t("skillTree:descriptions.essenceBundle", { type: essenceType, amount: essenceAmount });
      }
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: {
        const descEwType = rewardData.data?.type;
        const descEwTypeName = descEwType !== undefined ? this.formatTypesForTooltip([descEwType]) : "?";
        return i18next.t("skillTree:descriptions.essenceTypeWeight", { type: descEwTypeName, weight: rewardData.data?.weight ?? 0 });
      }
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: {
        const pref = rewardData.data as { types?: Type[]; species?: Species[] } | undefined;
        const types = pref?.types || [];
        const typeNames = this.formatTypesForTooltip(types);

        return i18next.t("skillTree:descriptions.fusionSecondaryPriority", {
          types: typeNames
        });
      }
      case SkillTreeRewardType.REVIVE_BOOST: {
        const reviveDescTypes = (rewardData.data?.types as Type[] | undefined) || [];
        const reviveDescTypeNames = reviveDescTypes.length > 0
          ? this.formatTypesForTooltip(reviveDescTypes)
          : "all";
        return i18next.t("skillTree:descriptions.reviveBoost", { types: reviveDescTypeNames });
      }

      case SkillTreeRewardType.HEALING_ITEMS:
        return i18next.t("skillTree:descriptions.healingItems");
      case SkillTreeRewardType.MEMORY_MUSHROOM:
        return i18next.t("skillTree:descriptions.memoryMushroom");
      case SkillTreeRewardType.BERRY_ITEMS:
        return i18next.t("skillTree:descriptions.berryItems");
      case SkillTreeRewardType.ABILITY_SWITCHER:
        return i18next.t("skillTree:descriptions.abilitySwitcher");
      case SkillTreeRewardType.GENERAL_ITEMS:
        return i18next.t("skillTree:descriptions.generalItems");
      case SkillTreeRewardType.BATON_ITEM:
        return i18next.t("skillTree:descriptions.batonItem");
      case SkillTreeRewardType.PP_MAX_ITEM:
        return i18next.t("skillTree:descriptions.ppMaxItem");
      case SkillTreeRewardType.ROGUE_BALL:
        return i18next.t("skillTree:descriptions.rogueBall");
      case SkillTreeRewardType.PARTY_ABILITY_GRANT:
        return i18next.t("skillTree:descriptions.partyAbilityGrant", { defaultValue: "Choose a free party ability to add to your team." });
      case SkillTreeRewardType.SKILL_TREE_TOKENS: {
        const amount = rewardData.data?.amount ?? 0;
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        return i18next.t("skillTree:descriptions.skillTreeTokens", {
          amount,
          champion: championDisplayName
        });
      }
      case SkillTreeRewardType.SKILL_POINTS: {
        const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        return i18next.t("skillTree:descriptions.skillPoints", { champion: championDisplayName });
      }
      case SkillTreeRewardType.MONEY_REWARD:
        return i18next.t("skillTree:descriptions.relicGold");
      case SkillTreeRewardType.PERMA_MONEY:
        return i18next.t("skillTree:descriptions.permaMoney");
      case SkillTreeRewardType.MASTER_BALL:
        return i18next.t("skillTree:descriptions.masterBall");
      case SkillTreeRewardType.VOID_BALL:
        return i18next.t("skillTree:descriptions.voidBall");
      case SkillTreeRewardType.TYPE_BALL_FILTERED: {
        const descBallType = rewardData.data?.ballType;
        const descTypeName = descBallType !== undefined ? this.formatTypesForTooltip([descBallType]) : "?";
        return i18next.t("skillTree:descriptions.typeBall", { type: descTypeName });
      }
      case SkillTreeRewardType.EGG_VOUCHER: {
        const tier = rewardData.data?.tier;
        const voucherTypeName = tier !== undefined ? getVoucherTypeName(tier) : i18next.t("skillTree:fallback.unknownVoucher");
        return i18next.t("modifierType:ModifierType.AddVoucherModifierType.description", {
          modifierCount: 1,
          voucherTypeName
        });
      }
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
        return i18next.t("skillTree:descriptions.rogueballRarity");
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
        return i18next.t("skillTree:descriptions.masterballRarity");
      case SkillTreeRewardType.GOLDEN_POKEBALL:
        return i18next.t("skillTree:descriptions.goldenPokeball");

      case SkillTreeRewardType.BOUNTY_SELECT:
        return i18next.t("skillTree:rewards.bountyNodeInTreeDesc");

      default:
        return i18next.t("skillTree:descriptions.default");
    }
  }

  public getStructuredDescription(rewardData: SkillTreeReward): RewardTooltipSections {
    const ABILITY_HEADER = "championSelect:tooltip.abilityHeader";
    const ITEM_HEADER = "championSelect:tooltip.itemDescriptionHeader";
    const SKILL_HEADER = "championSelect:tooltip.skillInfoHeader";

    switch (rewardData.type) {
      case SkillTreeRewardType.TM_FILTERED: {
        const move = (allMoves as any)?.[rewardData.data?.moveId];
        const moveName = move?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("modifierType:ModifierType.TmModifierType.description", { moveName });
        const moveEffect = move?.effect || move?.description || "";
        if (moveEffect) {
          return { summary: modifierDesc, detail: `${moveName}: ${moveEffect}`, detailHeaderKey: ITEM_HEADER };
        }
        return { summary: modifierDesc, detailHeaderKey: ITEM_HEADER };
      }

      case SkillTreeRewardType.XM_FILTERED: {
        const move = (allMoves as any)?.[rewardData.data?.moveId];
        const moveName = move?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("modifierType:ModifierType.AnyTmModifierType.description", { moveName });
        const moveEffect = move?.effect || move?.description || "";
        if (moveEffect) {
          return { summary: modifierDesc, detail: `${moveName}: ${moveEffect}`, detailHeaderKey: ITEM_HEADER };
        }
        return { summary: modifierDesc, detailHeaderKey: ITEM_HEADER };
      }

      case SkillTreeRewardType.ABILITY_GRANT: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("skillTree:descriptions.abilityGrant");
        const abilityDesc = ability?.description || "";
        if (abilityDesc) {
          return { summary: modifierDesc, detail: `${abilityName}: ${abilityDesc}`, detailHeaderKey: ABILITY_HEADER };
        }
        return { summary: modifierDesc, detailHeaderKey: ABILITY_HEADER };
      }

      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const modifierDesc = i18next.t("skillTree:descriptions.passiveAbility");
        const abilityDesc = ability?.description || "";
        if (abilityDesc) {
          return { summary: modifierDesc, detail: `${abilityName}: ${abilityDesc}`, detailHeaderKey: ABILITY_HEADER };
        }
        return { summary: modifierDesc, detailHeaderKey: ABILITY_HEADER };
      }

      case SkillTreeRewardType.SMITTY_ABILITY: {
        const ability = (allAbilities as any)?.[rewardData.data?.abilityId];
        const abilityName = ability?.name || i18next.t("skillTree:unknownReward");
        const abilityDesc = ability?.description || "";
        const smittyLore = i18next.t("skillTree:descriptions.smittyAbility");
        const smittySummary = i18next.t("skillTree:descriptions.smittyAbilityGeneric", {
          defaultValue: "Grants a forbidden SMITTY ability to one of your Pokémon."
        });
        if (abilityDesc) {
          return { summary: smittySummary, detail: `${abilityName}: ${abilityDesc}`, detailHeaderKey: ABILITY_HEADER, lore: smittyLore };
        }
        return { summary: smittySummary, detailHeaderKey: ABILITY_HEADER, lore: smittyLore };
      }

      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const tbAbility = (allAbilities as any)?.[rewardData.data?.abilityId];
        const tbAbilityName = tbAbility?.name || i18next.t("skillTree:unknownReward");
        const tbAbilityDesc = tbAbility?.description || "";
        const tbChampionDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let tbChampionId = this.championId || "apollo_diana";
        if (tbChampionId === "apollo" || tbChampionId === "diana") tbChampionId = "apollo_diana";
        const tbFlavorKey = `skillTree:descriptions.trainerBondFlavorText_${tbChampionId}`;
        const tbLore = i18next.t(tbFlavorKey, { champion: tbChampionDisplayName });
        const tbGeneric = i18next.t("skillTree:descriptions.trainerBondGeneric", { champion: tbChampionDisplayName });
        if (tbAbilityDesc) {
          return { summary: tbGeneric, detail: `${tbAbilityName}: ${tbAbilityDesc}`, detailHeaderKey: ABILITY_HEADER, lore: tbLore };
        }
        return { summary: tbGeneric, detailHeaderKey: ABILITY_HEADER, lore: tbLore };
      }

      case SkillTreeRewardType.TERA_ABILITY: {
        const teraAbility = (allAbilities as any)?.[rewardData.data?.abilityId];
        const teraAbilityName = teraAbility?.name || i18next.t("skillTree:unknownReward");
        const teraAbilityDesc = teraAbility?.description || "";
        const teraSummary = this.getRewardDescription(rewardData);
        if (teraAbilityDesc) {
          return { summary: teraSummary, detail: `${teraAbilityName}: ${teraAbilityDesc}`, detailHeaderKey: ABILITY_HEADER };
        }
        return { summary: teraSummary, detailHeaderKey: ABILITY_HEADER };
      }

      case SkillTreeRewardType.PARTY_ABILITY_GRANT:
        return { summary: this.getRewardDescription(rewardData), detailHeaderKey: ABILITY_HEADER };

      case SkillTreeRewardType.MEGA_STONE:
      case SkillTreeRewardType.DYNA_MUSHROOM:
      case SkillTreeRewardType.GLITCH_CHANGE:
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
      case SkillTreeRewardType.PERMA_ITEM:
      case SkillTreeRewardType.HEALING_ITEMS:
      case SkillTreeRewardType.MEMORY_MUSHROOM:
      case SkillTreeRewardType.BERRY_ITEMS:
      case SkillTreeRewardType.ABILITY_SWITCHER:
      case SkillTreeRewardType.GENERAL_ITEMS:
      case SkillTreeRewardType.BATON_ITEM:
      case SkillTreeRewardType.PP_MAX_ITEM:
      case SkillTreeRewardType.ROGUE_BALL:
      case SkillTreeRewardType.GOLDEN_POKEBALL:
      case SkillTreeRewardType.MASTER_BALL:
      case SkillTreeRewardType.VOID_BALL:
      case SkillTreeRewardType.TYPE_BALL_FILTERED:
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
      case SkillTreeRewardType.EGG_VOUCHER:
      case SkillTreeRewardType.MONEY_REWARD:
      case SkillTreeRewardType.PERMA_MONEY:
      case SkillTreeRewardType.TERA_TYPE:
        return { summary: this.getRewardDescription(rewardData), detailHeaderKey: ITEM_HEADER };

      case SkillTreeRewardType.LEGENDARY_POKEMON: {
        const legSpecies = rewardData.data?.species;
        let legPokemonName = i18next.t("skillTree:fallback.unknownPokemon");
        if (legSpecies) { try { legPokemonName = getPokemonSpecies(legSpecies)?.name ?? legPokemonName; } catch {} }
        const legChampionDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
        let legChampionId = this.championId || "apollo_diana";
        if (legChampionId === "apollo" || legChampionId === "diana") legChampionId = "apollo_diana";
        const legFlavorKey = `skillTree:descriptions.legendaryFlavorText_${legChampionId}`;
        const legFlavorText = i18next.t(legFlavorKey, { champion: legChampionDisplayName, pokemon: legPokemonName });
        const legTechnicalDesc = i18next.t("skillTree:descriptions.legendaryPokemon", { pokemon: legPokemonName });
        return { summary: legTechnicalDesc, lore: legFlavorText, detailHeaderKey: SKILL_HEADER };
      }

      case SkillTreeRewardType.POKEMON_ALT_BUILD: {
        const abIsSignature = rewardData.data?.signatureAltBuild === true || !rewardData.data?.altBuildId;
        if (abIsSignature) {
          return { summary: this.getRewardDescription(rewardData), detailHeaderKey: SKILL_HEADER };
        }
        const abFlavorKey = `skillTree:descriptions.altBuildFlavor_${this.championId}`;
        const abSpeciesId = rewardData.data?.species || (rewardData.data?.altBuildId ? POKEMON_ALT_BUILDS[rewardData.data.altBuildId]?.species : undefined);
        let abPokemonName = i18next.t("skillTree:fallback.unknownPokemon");
        if (abSpeciesId) { try { abPokemonName = getPokemonSpecies(abSpeciesId)?.name ?? abPokemonName; } catch {} }
        const abChampionName = ChampionUtils.getChampionDisplayName(this.championId);
        const abBuildName = rewardData.data?.altBuildId ? ChampionUtils.getAltBuildDisplayName(rewardData.data.altBuildId) : i18next.t("skillTree:fallback.unknownBuild");
        const abLore = i18next.t(abFlavorKey, { champion: abChampionName, pokemon: abPokemonName, altBuildName: abBuildName, defaultValue: "" });
        const abFullDesc = this.getRewardDescription(rewardData);
        const abLoreTrimmed = abLore.trim();
        let abSummary = abFullDesc;
        if (abLoreTrimmed && abFullDesc.startsWith(abLoreTrimmed)) {
          abSummary = abFullDesc.substring(abLoreTrimmed.length).replace(/^\n+/, "");
        }
        return { summary: abSummary, lore: abLore, detailHeaderKey: SKILL_HEADER };
      }

      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        let gfChampionId = this.championId || "apollo_diana";
        if (gfChampionId === "apollo" || gfChampionId === "diana") gfChampionId = "apollo_diana";
        const gfChampionName = ChampionUtils.getChampionDisplayName(this.championId);
        let gfFormName = "";
        let gfOriginalSpecies = i18next.t("skillTree:fallback.unknownPokemon");
        try {
          const gfUnlockableId = rewardData.data?.unlockableId;
          if (gfUnlockableId && this.scene) {
            const gfQuestData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(gfUnlockableId);
            if (gfQuestData && gfQuestData.rewardId) {
              const gfSpecies = getPokemonSpecies(gfQuestData.rewardId);
              if (gfSpecies) {
                const gfKey = gfSpecies.getGlitchFormName?.(true, undefined, gfQuestData.rewardType) || rewardData.data?.formKey || "unknown";
                gfFormName = gfKey !== "unknown" ? i18next.t(`glitchNames:${gfKey}.name`, { defaultValue: gfKey }) : i18next.t("skillTree:fallback.unknownGlitchForm");
                gfOriginalSpecies = gfSpecies.name || gfOriginalSpecies;
              }
            }
          }
        } catch {}
        if (!gfFormName) {
          const gfFallbackKey = rewardData.data?.formKey ?? "unknown";
          gfFormName = gfFallbackKey !== "unknown" ? i18next.t(`glitchNames:${gfFallbackKey}.name`, { defaultValue: gfFallbackKey }) : "Unknown";
        }
        const gfFlavorKey = `skillTree:descriptions.glitchFormFlavor_${gfChampionId}`;
        const gfLore = i18next.t(gfFlavorKey, { champion: gfChampionName, glitchFormName: gfFormName, defaultValue: "" });
        const gfFullDesc = this.getRewardDescription(rewardData);
        const gfLoreTrimmed = gfLore.trim();
        let gfSummary = gfFullDesc;
        if (gfLoreTrimmed && gfFullDesc.startsWith(gfLoreTrimmed)) {
          gfSummary = gfFullDesc.substring(gfLoreTrimmed.length).replace(/^\n+/, "");
        }
        return { summary: gfSummary, lore: gfLore, detailHeaderKey: SKILL_HEADER };
      }

      case SkillTreeRewardType.SIGNATURE_POKEMON: {
        const sigChampionName = ChampionUtils.getChampionDisplayName(this.championId);
        const sigSpeciesIdTT = rewardData.data?.species;
        let sigIntro: string;
        if (sigSpeciesIdTT) {
          try {
            const sp = getPokemonSpecies(sigSpeciesIdTT);
            if (sp) {
              sigIntro = i18next.t("skillTree:descriptions.signaturePokemon", { champion: sigChampionName, pokemon: sp.name });
            } else {
              sigIntro = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: sigChampionName });
            }
          } catch {
            sigIntro = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: sigChampionName });
          }
        } else {
          sigIntro = i18next.t("skillTree:descriptions.signaturePokemonMystery", { champion: sigChampionName });
        }
        const sigRankInfo = i18next.t("skillTree:descriptions.signaturePokemonRankInfoGeneric");
        const sigLore = i18next.t("skillTree:descriptions.signaturePokemonGrowthLore", {
          defaultValue: "Signature Pokemon have the potential to grow immensely stronger, if their trainer is able to override reality and unlock their normally dormant abilities."
        });
        return { summary: `${sigIntro}\n\n${sigRankInfo}`, lore: sigLore, detailHeaderKey: SKILL_HEADER };
      }

      case SkillTreeRewardType.GENERAL_POKEMON:
      case SkillTreeRewardType.STAT_BOOST:
      case SkillTreeRewardType.MOVE_UPGRADE:
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
      case SkillTreeRewardType.TYPE_SWITCHER:
      case SkillTreeRewardType.ESSENCE_BUNDLE:
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT:
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY:
      case SkillTreeRewardType.CATCH_RATE_BONUS:
      case SkillTreeRewardType.REVIVE_BOOST:
      case SkillTreeRewardType.SKILL_POINTS:
      case SkillTreeRewardType.SKILL_TREE_TOKENS:
      case SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN:
      case SkillTreeRewardType.BOUNTY_SELECT:
        return { summary: this.getRewardDescription(rewardData), detailHeaderKey: SKILL_HEADER };

      default:
        return { summary: this.getRewardDescription(rewardData) };
    }
  }

  private getSpecificMoveUpgradeDescription(data: any): string {
    try {
      const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
      const prefix = i18next.t("skillTree:descriptions.moveUpgradeSpecificPrefix", { champion: championDisplayName });
      if (data?.kind) {
        switch (data.kind) {
          case "super_effective_vs_type":
            return `${prefix}\n${i18next.t("skillTree:descriptions.moveUpgradeSE", { type: this.formatTypesForTooltip([data.data.type]) })}`;
          case "change_type":
            return `${prefix}\n${i18next.t("skillTree:descriptions.moveUpgradeChangeType", { type: this.formatTypesForTooltip([data.data.type]) })}`;
          case "recoil_mod":
            return `${prefix}\n${i18next.t("skillTree:descriptions.moveUpgradeRecoil", { delta: Math.round(Math.abs(data.data.delta) * 100) })}`;
        }
      }
      const filters = data?.filterUpgrades ?? data ?? {};
      const parts: string[] = [];

      if (Array.isArray(filters.moveUpgrades) && filters.moveUpgrades.length) {

        const pathTypes = (Array.from(new Set(filters.moveUpgrades.map((p: any) => UpgradePathUtils.getPathType(p)))) as string[])
            .map(pt => i18next.t(`moveUpgradeAttrs:${pt}`, { defaultValue: pt }));
        parts.push(i18next.t("skillTree:descriptions.moveUpgradePaths", { paths: pathTypes.join(", ") }));
      }

      if (Array.isArray(filters.moveAttributes) && filters.moveAttributes.length) {
        const attrLabels = filters.moveAttributes.map((name: string) => {
          const key = this.toAttrKey(name);
          const fallback = this.prettyName(name);

          const label = i18next.t(`moveUpgradeAttrs:${key}`);
          return label && label !== `moveUpgradeAttrs:${key}` ? label : fallback;
        });
        parts.push(i18next.t("skillTree:descriptions.moveUpgradeAttrs", { attrs: attrLabels.join(", ") }));
      }

      if (Array.isArray(filters.types) && filters.types.length) {
        const typeNames = this.formatTypesForTooltip(filters.types);
        parts.push(i18next.t("skillTree:descriptions.moveUpgradeTypes", { types: typeNames }));
      }

      return parts.length ? `${prefix}\n${parts.join(" • ")}` : `${prefix}\n${i18next.t("skillTree:descriptions.moveUpgradeSpecific")}`;
    } catch (e) {
      const championDisplayName = ChampionUtils.getChampionDisplayName(this.championId);
      return i18next.t("skillTree:descriptions.moveUpgradeSpecific", { champion: championDisplayName });
    }
  }

  private toAttrKey(classOrKey: string): string {

    const withoutAttr = classOrKey.replace(/Attr$/i, "");
    return withoutAttr.charAt(0).toLowerCase() + withoutAttr.slice(1);
  }

  private prettyName(classOrKey: string): string {

    return classOrKey
        .replace(/Attr$/i, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .trim();
  }

  private toTitleCase(value: string): string {
    return value
        .split(/\s+/)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(" ");
  }
  private getChampionCompatibleTMs(championTypes: Type[]): Moves[] {
    const numericMoves = Object.values(Moves).filter(move => typeof move === 'number') as Moves[];
    return numericMoves.filter(move => {
      const moveData = allMoves[move];
      return moveData && championTypes.includes(moveData.type) && !isYuMove(move);
    });
  }

  private getChampionCompatibleXMs(championTypes: Type[]): Moves[] {

    return this.getChampionCompatibleTMs(championTypes);
  }

  private getTypeCompatiblePokemon(championTypes: Type[], generationFilter: number[]): Species[] {
    const result: Species[] = [];
    for (const speciesData of allSpecies) {
      if (!speciesData) continue;
      const hasMatchingType = championTypes.some(championType =>
          speciesData.type1 === championType || speciesData.type2 === championType
      );
      if (!hasMatchingType) continue;
      if (generationFilter && generationFilter.length > 0) {
        if (!generationFilter.includes(speciesData.generation)) continue;
      }
      result.push(speciesData.speciesId as Species);
    }
    return result;
  }

  private getChampionTypeAbilities(championTypes: Type[]): Abilities[] {
    let abilities = getAbilitiesForTypes(championTypes);
    if (abilities.length > 0) return abilities;
    const allAbilityIds = Object.values(Abilities).filter(v => typeof v === 'number' && (v as number) < 311) as Abilities[];
    const randomAbility = Utils.randSeedItem(allAbilityIds);
    return [randomAbility];
  }
  public getChampionStatPreferences(championData: PlayableChampionData): Stat[] {
    switch (championData.id) {
      case "brock":
        return [Stat.DEF, Stat.HP, Stat.ATK];
      case "misty":
        return [Stat.SPD, Stat.SPATK, Stat.ATK];
      case "red":
        return [Stat.ATK, Stat.SPATK, Stat.SPD];
      case "apollo":
      case "diana":
        return getTypeStatPreferences(championData.type1, championData.type2);
      default:
        return [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    }
  }

  private getChampionMegaStones(_championTypes: Type[], championData: PlayableChampionData): FormChangeItem[] {

    return championData.unlockedMegaStones || [];
  }

  private getChampionDynaMushrooms(_championTypes: Type[]): FormChangeItem[] {

    return [FormChangeItem.MAX_MUSHROOMS];
  }

  private getAvailableGlitchForms(championData: PlayableChampionData): string[] {

    return championData?.unlockedGlitchForms || [];
  }

  private getAttackTypeBoosterItemName(type: Type): string | undefined {
    switch (type) {
      case Type.NORMAL: return "Silk Scarf";
      case Type.FIGHTING: return "Black Belt";
      case Type.FLYING: return "Sharp Beak";
      case Type.POISON: return "Poison Barb";
      case Type.GROUND: return "Soft Sand";
      case Type.ROCK: return "Hard Stone";
      case Type.BUG: return "Silver Powder";
      case Type.GHOST: return "Spell Tag";
      case Type.STEEL: return "Metal Coat";
      case Type.FIRE: return "Charcoal";
      case Type.WATER: return "Mystic Water";
      case Type.GRASS: return "Miracle Seed";
      case Type.ELECTRIC: return "Magnet";
      case Type.PSYCHIC: return "Twisted Spoon";
      case Type.ICE: return "Never-Melt Ice";
      case Type.DRAGON: return "Dragon Fang";
      case Type.DARK: return "Black Glasses";
      case Type.FAIRY: return "Fairy Feather";
      default: return undefined;
    }
  }

}