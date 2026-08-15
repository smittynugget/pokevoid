import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { ActiveSkillTreeData, SkillTreeNodeState, SkillTreeRarity, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { allSpecies, getPokemonSpecies } from "#app/data/pokemon-species";

export enum SkillTreeMode {
  POKEMON_SELECTION = "POKEMON_SELECTION",
  INITIAL_ACCESS = "INITIAL_ACCESS",
  BATTLE_ACCESS = "BATTLE_ACCESS",
}

export interface PokemonSelection { species: number; isSignature: boolean }

export interface SkillTreePhaseConfig {
  mode: SkillTreeMode;
  requiredSelections?: number;
  onComplete?: (selections?: PokemonSelection[]) => void;
  onCancel?: () => void;
}

export class SkillTreePhase extends Phase {
  private readonly config: SkillTreePhaseConfig;
  private selections: PokemonSelection[] = [];

  constructor(scene: BattleScene, config: SkillTreePhaseConfig) {
    super(scene);
    this.config = config;
  }

  start(): void {
    super.start();

    const gameData = this.scene.gameData as any;
    const activeSkillTree = gameData.activeSkillTree as ActiveSkillTreeData | undefined;
    if (!activeSkillTree) { this.handleError(); return; }

    this.initializeSkillTreeUI(activeSkillTree);
  }

  private initializeSkillTreeUI(activeSkillTree: ActiveSkillTreeData): void {
    const championId: string = (this.scene.gameData as any).selectedChampionId || activeSkillTree.championId || "apollo_diana";
    const championData = ChampionManager.getInstance().getChampionData(championId);

    switch (this.config.mode) {
      case SkillTreeMode.POKEMON_SELECTION:
        this.initializePokemonSelectionMode(activeSkillTree, championData);
        break;
      case SkillTreeMode.INITIAL_ACCESS:
        this.initializeInitialAccessMode(activeSkillTree, championData);
        break;
      case SkillTreeMode.BATTLE_ACCESS:
      default:
        this.initializeBattleAccessMode(activeSkillTree, championData);
        break;
    }
  }

  private initializePokemonSelectionMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    this.generateStarterSelectionNodes(activeSkillTree, championData);
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.POKEMON_SELECTION,
      requiredSelections: this.config.requiredSelections ?? 2,
      activeSkillTree,
      championData,
      onSelectionMade: (species: number, isSignature: boolean) => {
        this.handlePokemonSelection(species as number, isSignature);
      },
      onSelectionsComplete: () => {
        this.handleSelectionsComplete();
      },
    });
  }

  private initializeInitialAccessMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    this.generateRandomDepth1Nodes(activeSkillTree, championData);
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.INITIAL_ACCESS,
      activeSkillTree,
      championData,
      onClose: () => this.handleComplete(),
      onCancel: () => this.handleCancel(),
    });
  }

  private initializeBattleAccessMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.BATTLE_ACCESS,
      activeSkillTree,
      championData,
      onClose: () => this.handleComplete(),
      onCancel: () => this.handleCancel(),
    });
  }

  private handleComplete(): void {
    this.scene.ui.revertMode().then(() => {
      this.config.onComplete?.();
      this.end();
    });
  }

  private handleCancel(): void {
    this.scene.ui.revertMode().then(() => {
      this.config.onCancel?.();
      this.end();
    });
  }
  private generateStarterSelectionNodes(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    try {
      const upgrades = Math.max(0, Math.min(6, championData?.starterNodeUpgradesUnlocked ?? 0));
      const total = Math.min(10, 4 + upgrades);
      const radius = 100;

      let signatureCount = Math.floor(total / 2);
      let generalCount = total - signatureCount;
      if (total % 2 !== 0) {
        if (Utils.randSeedInt(2) === 0) signatureCount += 1; else generalCount += 1;
      }

      const nodes: any[] = [];
      const nodeCount = Math.max(1, signatureCount + generalCount);
      let placed = 0;
      for (let i = 0; i < signatureCount; i++, placed++) {
        const angle = (placed * 2 * Math.PI) / nodeCount;
        const species = ChampionUtils.getRandomChampionSignaturePokemon(championData, this.scene as BattleScene) as unknown as number;
        const nodeId = `depth1_signature_${i}`;
        nodes.push({
          id: nodeId,
          depth: 1,
          position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          dependencies: ["root_0"],
          rarity: SkillTreeRarity.GREAT,
          state: SkillTreeNodeState.LOCKED_DETAILS,
          rewardData: { type: SkillTreeRewardType.SIGNATURE_POKEMON, data: { species }, immediate: false },
          name: getPokemonSpecies(species as any)?.name ?? i18next.t("skillTree:descriptions.signaturePokemon"),
          description: i18next.t("skillTree:descriptions.signaturePokemon"),
          cost: 1,
          isLegendary: false,
          unlocked: false,
        });
      }
      for (let i = 0; i < generalCount; i++, placed++) {
        const angle = (placed * 2 * Math.PI) / nodeCount;
        const species = ChampionUtils.getRandomChampionGeneralPokemon(championData, this.scene as BattleScene) as unknown as number;
        const nodeId = `depth1_general_${i}`;
        nodes.push({
          id: nodeId,
          depth: 1,
          position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          dependencies: ["root_0"],
          rarity: SkillTreeRarity.GREAT,
          state: SkillTreeNodeState.LOCKED_DETAILS,
          rewardData: { type: SkillTreeRewardType.GENERAL_POKEMON, data: { species }, immediate: false },
          name: getPokemonSpecies(species as any)?.name ?? i18next.t("skillTree:descriptions.generalPokemon"),
          description: i18next.t("skillTree:descriptions.generalPokemon"),
          cost: 1,
          isLegendary: false,
          unlocked: false,
        });
      }

      (this.scene.gameData as any).tempSkillTreeNodes = nodes;
    } catch (e) {
      console.warn("generateStarterSelectionNodes failed", e);
    }
  }
  private generateRandomDepth1Nodes(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    try {
      const upgrades = Math.max(0, Math.min(6, championData?.starterNodeUpgradesUnlocked ?? 0));
      const nodeCount = Math.min(10, 4 + upgrades);
      const generator = new SkillTreeNodeGenerator(activeSkillTree.seed, activeSkillTree.championId, this.scene as BattleScene);
      const radius = 100;

      const nodes: any[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i * 2 * Math.PI) / Math.max(1, nodeCount);
        const generated = generator.generateChampionSpecificNode(1, SkillTreeRarity.COMMON, championData);
        const cost = SkillTreeUtils.getNodeCost(1);
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

      (this.scene.gameData as any).tempSkillTreeNodes = nodes;
    } catch (e) {
      console.warn("generateRandomDepth1Nodes failed", e);
    }
  }

  private handlePokemonSelection(species: number, isSignature: boolean): void {
    const idx = this.selections.findIndex(s => s.isSignature === isSignature);
    const entry = { species, isSignature } as PokemonSelection;
    if (idx > -1) this.selections[idx] = entry; else this.selections.push(entry);
    const hasSig = this.selections.some(s => s.isSignature);
    const hasGen = this.selections.some(s => !s.isSignature);
    if (hasSig && hasGen) {
      this.handleSelectionsComplete();
    }
  }

  private handleSelectionsComplete(): void {
    this.scene.ui.revertMode().then(() => {
      this.config.onComplete?.(this.selections);
      this.end();
    });
  }

  private handleError(): void {
    this.end();
  }
}