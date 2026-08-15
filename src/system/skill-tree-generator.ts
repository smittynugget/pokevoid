import i18next from "#app/plugins/i18n";
import * as Utils from "#app/utils";
import BattleScene from "#app/battle-scene";
import Overrides from "#app/overrides";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { ChampionSkillVersion } from "#app/system/game-data";
import { SkillTreeNode, SkillTreeNodeState, SkillTreeRarity, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { Type } from "#app/data/type";

export class SkillTreeGenerator {
	private scene: BattleScene;
	private seed: number;
	private championId: string;
	private nodes: SkillTreeNode[] = [];
	private idCounter: number = 0;
	private readonly DEPTH = 20;
	private readonly TIER_RADIUS = 500;
	private readonly NODE_SIZE = 90;

	constructor(scene: BattleScene, seed: number, championId: string) {
		this.scene = scene;
		this.seed = seed;
		this.championId = championId;
	}

	generateCompleteTree(maxVisibleDepth: number): SkillTreeNode[] {
		this.nodes = [];
		this.idCounter = 0;
    ChampionManager.initialize(this.scene.gameData);

		const rootNode = this.createRootNode();
		this.nodes.push(rootNode);

		if (this.scene.gameData.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1 || Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE) {
			if (this.shouldGenerateBountyNode()) {
				const bountyNode = this.createBountyNode(rootNode);
				this.nodes.push(bountyNode);
			}
		}

		this.localChaosGenerator(rootNode);
		this.applyDepthVisibility(maxVisibleDepth);

		return this.nodes;
	}

	private shouldGenerateBountyNode(): boolean {
		if (Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE) return true;
		return Utils.randSeedInt(10000) < 185;
	}

	private createBountyNode(rootNode: SkillTreeNode): SkillTreeNode {
		const angle = Math.PI * 1.5;
		const radius = this.TIER_RADIUS;
		return {
			id: "depth1_bounty_0",
			depth: 1,
			position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
			dependencies: [rootNode.id],
			rarity: SkillTreeRarity.ROGUE,
			state: SkillTreeNodeState.LOCKED_DETAILS,
			rewardData: {
				type: SkillTreeRewardType.BOUNTY_SELECT,
				data: { bountyNode: true },
				immediate: false
			},
			name: i18next.t("skillTree:rewards.bountyNode"),
			description: i18next.t("skillTree:rewards.bountyNodeDesc"),
			cost: 0,
			isLegendary: false,
			unlocked: false
		};
	}

	private createRootNode(): SkillTreeNode {
    const championData = ChampionManager.getInstance().getChampionData(this.championId);

		let descriptionParams: any = { defaultValue: i18next.t("skillTree:rootNode.description") };

		if (this.championId === "apollo" || this.championId === "diana") {
			const type1 = championData.type1;
			const type2 = championData.type2;

		const type1Name = type1 !== undefined
			? i18next.t(`pokemonInfo:Type.${Type[type1]}`)
			: i18next.t("pokemonInfo:Type.UNKNOWN");
		const type2Name = type2 !== undefined
			? i18next.t(`pokemonInfo:Type.${Type[type2]}`)
			: i18next.t("pokemonInfo:Type.UNKNOWN");

		descriptionParams.type1 = `[color=#ffdd44]${type1Name}[/color]`;
		descriptionParams.type2 = `[color=#ffdd44]${type2Name}[/color]`;
		}

		return {
			id: "root_0",
			depth: 0,
			position: { x: 0, y: 0 },
			dependencies: [],
			rarity: SkillTreeRarity.LEGENDARY,
			state: SkillTreeNodeState.UNLOCKED,
			rewardData: {
				type: SkillTreeRewardType.SKILL_POINTS,
				data: { amount: 0 },
				immediate: true
			},
		name: i18next.t("skillTree:rootNode.champion", { champion: ChampionUtils.getChampionDisplayName(championData.id) }),
		description: i18next.t(`skillTree:rootNode.${championData.id}`, descriptionParams),
			cost: 0,
			isLegendary: true,
			unlocked: true
		};
	}

	private localChaosGenerator(rootNode: SkillTreeNode): void {
		const generator = new SkillTreeNodeGenerator(this.seed, this.championId, this.scene);
		let tiers: SkillTreeNode[][] = [[rootNode]];

		const hasBountyNode = this.nodes.some(n => n.id === "depth1_bounty_0");
		const bountyAngle = Math.PI * 1.5;
		const bountyExclusionZone = 0.35;

		let tier1Nodes: SkillTreeNode[] = [];
		const radius1 = this.TIER_RADIUS * 1;
		const depth1Count = this.getDepth1StarterNodeCount();
		const minAngleSep1 = (2 * Math.PI) / (depth1Count * 1.5);
		let lastAngle1 = 0;
		for (let i = 0; i < depth1Count; i++) {
			let angle = lastAngle1 + minAngleSep1 + Utils.randSeedInt(minAngleSep1 * 1000) / 1000;
			if (hasBountyNode) {
				const normAngle = angle % (2 * Math.PI);
				const diff = Math.abs(normAngle - bountyAngle);
				const angularDist = Math.min(diff, 2 * Math.PI - diff);
				if (angularDist < bountyExclusionZone) {
					angle = bountyAngle + bountyExclusionZone;
					if (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
				}
			}
			lastAngle1 = angle;
			const x = radius1 * Math.cos(angle);
			const y = radius1 * Math.sin(angle);
			const championData = ChampionManager.getInstance().getChampionData(this.championId);
			const rarity = this.getRandomCommonOrGreat();
			const generated = generator.generateChampionSpecificNode(1, rarity, championData);
			const newNode = this.createNode(generated, x, y, [rootNode.id], 1);
			tier1Nodes.push(newNode);
		}
		tiers.push(tier1Nodes);
		for (let t = 2; t <= this.DEPTH; t++) {
			let currentTierNodes: SkillTreeNode[] = [];
			const nodeCountInTier = Utils.randSeedInt(5) + t + 10;
			const radius = this.TIER_RADIUS * t;
			const minAngleSeparation = (2 * Math.PI) / (nodeCountInTier * 1.5);
			let lastAngle = 0;

			for (let i = 0; i < nodeCountInTier; i++) {
				let angle = lastAngle + minAngleSeparation + Utils.randSeedInt(minAngleSeparation * 1000) / 1000;
				lastAngle = angle;
				const x = radius * Math.cos(angle);
				const y = radius * Math.sin(angle);

				const prevTier = tiers[t - 1];
				const sortedParents = prevTier.slice().sort((a, b) =>
					(Math.pow(a.position.x - x, 2) + Math.pow(a.position.y - y, 2)) -
					(Math.pow(b.position.x - x, 2) + Math.pow(b.position.y - y, 2))
				);

				const primaryParent = sortedParents[0];
				const dependencies = [primaryParent.id];
				if (sortedParents.length > 1 && Utils.randSeedInt(100) > 50) {
					dependencies.push(sortedParents[1].id);
				}

				const depth = Math.max(...dependencies.map(id => this.nodes.find(n => n.id === id)!.depth)) + 1;
				const rarity = this.getRandomRarity(depth);
			    const championData = ChampionManager.getInstance().getChampionData(this.championId);
				const rewardData = generator.generateChampionSpecificNode(depth, rarity, championData);
				const newNode = this.createNode(rewardData, x, y, dependencies, depth);

				if (t > 3 && Utils.randSeedInt(100) < 5) {
					newNode.isLegendary = true;
				}
				currentTierNodes.push(newNode);
			}

      if (t === 2 && currentTierNodes.length > 1) {
        const ringOrder = [...currentTierNodes].sort((a, b) =>
          Math.atan2(a.position.y, a.position.x) - Math.atan2(b.position.y, b.position.x));
        const freeIdx = Utils.randSeedInt(ringOrder.length);

        ringOrder.forEach((node, i) => {
          node.ringIndex = i;
          node.ringSize = ringOrder.length;
          const linear = Math.abs(i - freeIdx);
          const dist = Math.min(linear, ringOrder.length - linear);
          if (dist === 0) return;
          node.isLevelLocked = true;
          node.requiredUnlockLevel = dist + 1;
          node.branchUnlockCost = dist === 1 ? 3 : 4;
          node.pendingRewardData = { ...node.rewardData };
        });
      }
			tiers.push(currentTierNodes);
		}

		for (let t = 3; t < tiers.length; t++) {
			for (const node of tiers[t]) {
				const parentNodes = node.dependencies
					.map(id => this.nodes.find(n => n.id === id))
					.filter(n => n != null);
				const allParentsLocked = parentNodes.length > 0 && parentNodes.every(p => p!.isLevelLocked);
				if (allParentsLocked) {
					const maxParentLevel = Math.max(...parentNodes.map(p => p!.requiredUnlockLevel || 1));
					node.isLevelLocked = true;
					node.requiredUnlockLevel = maxParentLevel + 1;
					node.pendingRewardData = { ...node.rewardData };
				}
			}
		}
	}

	private createNode(rewardData: any, x: number, y: number, dependencies: string[] = [], depth: number): SkillTreeNode {

		const nodeRarity = rewardData.rarity || SkillTreeRarity.COMMON;

		const node: SkillTreeNode = {
			id: `node_${this.idCounter++}`,
			depth: depth,
			position: { x, y },
			dependencies: dependencies,
			rarity: nodeRarity,
			state: this.getInitialNodeState(depth),
			rewardData: rewardData.rewardData,
			name: rewardData.name || i18next.t("skillTree:unknownNode"),
			description: rewardData.description || i18next.t("skillTree:noDescription"),
			cost: SkillTreeUtils.getNodeCostByRarity(nodeRarity),
			isLegendary: false,
			unlocked: false
		};

		this.nodes.push(node);
		return node;
	}

	private getDepth1StarterNodeCount(): number {
        const championData = ChampionManager.getInstance().getChampionData(this.championId);
		const upgrades = Math.max(0, Math.min(6, championData.starterNodeUpgradesUnlocked ?? 0));
		return Math.min(10, 4 + upgrades);
	}

	private getInitialNodeState(depth: number): SkillTreeNodeState {
		const activeSkillTree = this.scene.gameData.activeSkillTree;
		if (!activeSkillTree) return SkillTreeNodeState.LOCKED_HIDDEN;
		return depth <= activeSkillTree.maxVisibleDepth ? SkillTreeNodeState.LOCKED_DETAILS : SkillTreeNodeState.LOCKED_HIDDEN;
	}

	private getRandomRarity(depth: number): SkillTreeRarity {
		return this.calculateNodeRarity(depth, 0);
	}

	private getRandomCommonOrGreat(): SkillTreeRarity {
		return Utils.randSeedInt(2) === 0 ? SkillTreeRarity.COMMON : SkillTreeRarity.GREAT;
	}

	private calculateNodeRarity(depth: number, _tier: number): SkillTreeRarity {
		const rarityRoll = Utils.randSeedInt(100000);
		if (depth >= 7) {
			if (rarityRoll < 1000) return SkillTreeRarity.LEGENDARY;
			if (rarityRoll < 3000) return SkillTreeRarity.MASTER;
			if (rarityRoll < 10000) return SkillTreeRarity.ROGUE;
			if (rarityRoll < 35000) return SkillTreeRarity.ULTRA;
			return this.getRandomCommonOrGreat();
		} else if (depth >= 5) {
			if (rarityRoll < 100) return SkillTreeRarity.LEGENDARY;
			if (rarityRoll < 300) return SkillTreeRarity.MASTER;
			if (rarityRoll < 5300) return SkillTreeRarity.ROGUE;
			if (rarityRoll < 25300) return SkillTreeRarity.ULTRA;
			return this.getRandomCommonOrGreat();
		} else if (depth >= 3) {
			if (rarityRoll < 10) return SkillTreeRarity.LEGENDARY;
			if (rarityRoll < 30) return SkillTreeRarity.MASTER;
			if (rarityRoll < 5030) return SkillTreeRarity.ROGUE;
			if (rarityRoll < 25030) return SkillTreeRarity.ULTRA;
			return this.getRandomCommonOrGreat();
		} else {
			if (rarityRoll < 2) return SkillTreeRarity.LEGENDARY;
			if (rarityRoll < 12) return SkillTreeRarity.MASTER;
			if (rarityRoll < 1862) return SkillTreeRarity.ROGUE;
			if (rarityRoll < 19862) return SkillTreeRarity.ULTRA;
			return this.getRandomCommonOrGreat();
		}
	}

	private applyDepthVisibility(maxVisibleDepth: number): void {
		this.nodes.forEach(node => {
			if (node.depth <= maxVisibleDepth) {
				if (node.state === SkillTreeNodeState.LOCKED_HIDDEN) {
					node.state = SkillTreeNodeState.LOCKED_DETAILS;
				}
			} else {
				node.state = SkillTreeNodeState.LOCKED_HIDDEN;
			}
		});
	}
}

export default SkillTreeGenerator;