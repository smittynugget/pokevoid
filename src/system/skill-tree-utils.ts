import * as Utils from "#app/utils";
import { PlayableChampionData } from "#app/system/playable-champions";
import { SkillTreeRewardType, SkillTreeRarity, SkillTreeNodeState } from "#app/system/skill-tree-data";
import { SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { Type } from "#app/data/type";

export enum SkillTreeVersion {
  V1_DEPTH_BASED = 1,
  V2_PROGRESSIVE_REVEAL = 2
}

export const SKILL_TREE_VERSION: SkillTreeVersion = SkillTreeVersion.V2_PROGRESSIVE_REVEAL;

export function isSkillTreeV2(): boolean {
  return SKILL_TREE_VERSION === SkillTreeVersion.V2_PROGRESSIVE_REVEAL;
}

export class SkillTreeUtils {
  static getSeedForSkillTree(baseSeed: string, championId: string): number {
    const combinedSeed = `${baseSeed}_${championId}_skilltree`;
    return Utils.getSeedForString(combinedSeed);
  }

  static getRandomSkillType(championData: PlayableChampionData): SkillTreeRewardType {
    const championTypes = [championData.type1, championData.type2].filter(Boolean);

    if (championTypes.length === 0) {
      const allTypes = Object.values(SkillTreeRewardType) as SkillTreeRewardType[];
      return Utils.randSeedItem(allTypes);
    }

    const typeWeightedPool = Object.values(SkillTreeRewardType) as SkillTreeRewardType[];

    return Utils.randSeedItem(typeWeightedPool);
  }

  static getNodeCost(depth: number): number {
    const baseCost = depth;
    if (depth <= 15) return Math.min(baseCost, 10);
    if (depth <= 25) return Math.min(baseCost, 20);
    const capTier = Math.ceil(depth / 10) * 10;
    return Math.min(baseCost, capTier);
  }

  static getNodeCostByRarity(rarity: SkillTreeRarity): number {
    return 1;
    switch (rarity) {
      case SkillTreeRarity.COMMON:
        return 1;
      case SkillTreeRarity.GREAT:
        return 2;
      case SkillTreeRarity.ULTRA:
        return 3;
      case SkillTreeRarity.ROGUE:
        return 4;
      case SkillTreeRarity.MASTER:
        return 5;
      case SkillTreeRarity.LEGENDARY:
        return 6;
      default:
        return 1;
    }
  }

  static getTokenCostForNextLevel(currentLevel: number): number {
    return currentLevel + (currentLevel - 1);
  }

  static getMaxDepthForLevel(treeLevel: number): number {
    if (treeLevel === 1) return 3;
    return treeLevel * 2;
  }

  static getRequiredTreeLevelForDepth(depth: number): number {
    if (depth <= 2) return 1;
    return Math.ceil((depth - 1) / 2);
  }

  static getMaxPurchasableDepthForLevel(treeLevel: number): number {
    if (treeLevel === 1) return 2;
    return treeLevel * 2;
  }

  static getChampionXPGain(nodeDepth: number, maxVisibleDepth: number): number {
    return nodeDepth / maxVisibleDepth;
  }

  static getRequiredEssenceForLevel(level: number): number {
    return level <= 10 ? 100 * level : 1000;
  }

  static getBaseEssenceForSkillLevel(level: number): number {
    if (level === 1) return 100;
    let total = 15 + 5 * level;
    if (total % 2 !== 0) {
      total += 1;
    }
    return total;
  }

  static getApolloDianaTypesForLevel(championId: string, level: number): { type1: Type; type2: Type } {
    const allTypes = Object.values(Type).filter(t =>
      typeof t === 'number' &&
      t >= Type.NORMAL &&
      t <= Type.FAIRY
    ) as Type[];

    if (allTypes.length === 0) {
      return { type1: Type.NORMAL, type2: Type.NORMAL };
    }

    const seed = `${championId}_${level}`;
    const hash = Utils.hashCode(seed);

    const type1Index = Math.abs(hash) % allTypes.length;
    const type2Index = Math.abs((hash * 31 + level * 7)) % allTypes.length;

    let type1 = allTypes[type1Index];
    let type2 = allTypes[type2Index];

    if (type2 === type1) {
      type2 = allTypes[(type2Index + 1) % allTypes.length];
    }

    return { type1, type2 };
  }

  static calculateSkillEssenceRequirements(
    level: number,
    championId: string,
    championType1: Type | undefined,
    championType2: Type | undefined,
    rewardType: SkillTreeRewardType,
    rarity: SkillTreeRarity
  ): Array<{ type: Type; amount: number }> {
    const baseEssence = this.getBaseEssenceForSkillLevel(level);
    const requirements: Array<{ type: Type; amount: number }> = [];

    let actualType1 = championType1;
    let actualType2 = championType2;

    if ((championId === "apollo" || championId === "diana" || championId === "apollo_diana") && championType1 === Type.UNKNOWN) {
      const apolloDianaTypes = this.getApolloDianaTypesForLevel(championId, level);
      actualType1 = apolloDianaTypes.type1;
      actualType2 = apolloDianaTypes.type2;
    }

    const championTypes = [actualType1, actualType2].filter(
      t => t !== undefined && t !== Type.UNKNOWN && t !== Type.STELLAR && t !== (Type as any).ALL
    ) as Type[];

    if (championTypes.length === 2) {
      const type1Amount = Math.floor(baseEssence * 0.5);
      const type2Amount = baseEssence - type1Amount;
      requirements.push({ type: championTypes[0], amount: type1Amount });
      requirements.push({ type: championTypes[1], amount: type2Amount });
    } else if (championTypes.length === 1) {
      requirements.push({ type: championTypes[0], amount: baseEssence });
    }

    if (rarity === SkillTreeRarity.MASTER || rarity === SkillTreeRarity.LEGENDARY) {
      const multiplier = rarity === SkillTreeRarity.LEGENDARY ? 0.03 : 0.01;
      const specialAmount = Math.max(1, Math.floor(baseEssence * multiplier));

      const needsSmitty =
        rewardType === SkillTreeRewardType.SMITTY_ABILITY ||
        rewardType === SkillTreeRewardType.POKEMON_ALT_BUILD;

      const needsGlitch =
        rewardType === SkillTreeRewardType.GLITCH_FORM_UNLOCK ||
        rewardType === SkillTreeRewardType.LEGENDARY_POKEMON;

      if (needsSmitty) {
        requirements.push({ type: Type.SMITTY, amount: specialAmount });
      }

      if (needsGlitch) {
        requirements.push({ type: Type.GLITCH, amount: specialAmount });
      }
    }

    return requirements;
  }
  static generateDepth1Nodes(activeSkillTree: any, championData: any): any[] {
    const upgrades = Math.max(0, Math.min(6, championData?.starterNodeUpgradesUnlocked ?? 0));
    const nodeCount = Math.min(10, 4 + upgrades);
    const generator = new SkillTreeNodeGenerator(activeSkillTree.seed, activeSkillTree.championId);

    const TIER_RADIUS = 150;
    const NODE_SIZE = 90;
    const radius = TIER_RADIUS + NODE_SIZE / 2;

    const getRandomCommonOrGreat = () =>
      Utils.randSeedInt(2) === 0 ? SkillTreeRarity.COMMON : SkillTreeRarity.GREAT;

    const nodes: any[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / Math.max(1, nodeCount);
      const rarity = getRandomCommonOrGreat();
      const generated = generator.generateChampionSpecificNode(1, rarity, championData);
      const cost = SkillTreeUtils.getNodeCostByRarity(generated.rarity);
      const nodeId = `depth1_node_${i}`;
      nodes.push({
        id: nodeId,
        depth: 1,
        position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
        dependencies: ["root_0"],
        rarity: generated.rarity,
        state: SkillTreeNodeState.LOCKED_DETAILS,
        rewardData: generated.rewardData,
        name: generated.name,
        description: generated.description,
        cost,
        isLegendary: false,
        unlocked: false,
      });
    }

    return nodes;
  }
}