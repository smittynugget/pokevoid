import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { SkillTreeGenerator } from "#app/system/skill-tree-generator";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { ActiveSkillTreeData, SkillTreeNodeState, SkillTreeRarity, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { allSpecies, getPokemonSpecies } from "#app/data/pokemon-species";
import { POKEMON_ALT_BUILDS } from "#app/data/pokemon-alt-buid";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { SkillTreeNode } from "#app/system/skill-tree-data.js";
import { PlayerGender } from "#enums/player-gender";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { Species } from "#app/enums/species.js";
import { QuestUnlockables } from "#app/system/game-data.js";
import { CommandPhase } from "#app/phases/command-phase";

export enum SkillTreeMode {
  POKEMON_SELECTION = "POKEMON_SELECTION",
  INITIAL_ACCESS = "INITIAL_ACCESS",
  BATTLE_ACCESS = "BATTLE_ACCESS",
  DEBUG_ENHANCED = "DEBUG_ENHANCED",
}

export interface PokemonSelection { species: number; isSignature: boolean }

export interface SkillTreePhaseConfig {
  mode: SkillTreeMode;
  requiredSelections?: number;
  onComplete?: (selections?: PokemonSelection[]) => void;
  onCancel?: () => void;
  shouldPlayPurchaseAnimation?: boolean;
  showLoading?: boolean;
}
function getDepth1Radius(): number {
  const TIER_RADIUS = 150;
  const NODE_SIZE = 90;
  return TIER_RADIUS + NODE_SIZE / 2;
}

export class SkillTreePhase extends Phase {
  private readonly config: SkillTreePhaseConfig;
  private selections: PokemonSelection[] = [];

  constructor(scene: BattleScene, config: SkillTreePhaseConfig) {
    super(scene);
    this.config = config;
  }
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  start(): void {
    super.start();

    const gameData = this.scene.gameData as any;
    const activeSkillTree = gameData.activeSkillTree as ActiveSkillTreeData | undefined;
    if (!activeSkillTree) { this.handleError(); return; }

    if (this.config.showLoading) {
      this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
      setTimeout(() => {
        this.initializeSkillTreeUI(activeSkillTree);
      }, 50);
    } else {
      this.initializeSkillTreeUI(activeSkillTree);
    }
  }

  private initializeSkillTreeUI(activeSkillTree: ActiveSkillTreeData): void {
    const selected = (this.scene.gameData as any).selectedChampionId;
    const championId: string = (selected && selected !== "apollo_diana")
      ? selected
      : (activeSkillTree?.championId && activeSkillTree.championId !== "apollo_diana")
        ? activeSkillTree.championId
        : (this.scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo");

    const championData = ChampionManager.getInstance().getChampionData(championId);

    switch (this.config.mode) {
      case SkillTreeMode.POKEMON_SELECTION:
        this.initializePokemonSelectionMode(activeSkillTree, championData);
        break;
      case SkillTreeMode.INITIAL_ACCESS:
        this.initializeInitialAccessMode(activeSkillTree, championData);
        break;
      case SkillTreeMode.DEBUG_ENHANCED:
        this.initializeEnhancedDebugMode(activeSkillTree, championData);
        break;
      case SkillTreeMode.BATTLE_ACCESS:
      default:
        this.initializeBattleAccessMode(activeSkillTree, championData);
        break;
    }
  }

  private initializePokemonSelectionMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    if (activeSkillTree.maxVisibleDepth < 2) {
      activeSkillTree.maxVisibleDepth = 2;
    }

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
      phaseOnComplete: this.config.onComplete,
      shouldPlayPurchaseAnimation: this.config.shouldPlayPurchaseAnimation,
    });
    this.scene.gameData.localSaveAll(this.scene);
  }

  private initializeInitialAccessMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    this.generateRandomDepth1Nodes(activeSkillTree, championData);
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.INITIAL_ACCESS,
      activeSkillTree,
      championData,
      onClose: () => this.handleComplete(),
      onCancel: () => this.handleCancel(),
      shouldPlayPurchaseAnimation: this.config.shouldPlayPurchaseAnimation,
    });
  }

  private initializeBattleAccessMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.BATTLE_ACCESS,
      activeSkillTree,
      championData,
      onClose: () => this.handleComplete(),
      onCancel: () => this.handleCancel(),
      shouldPlayPurchaseAnimation: this.config.shouldPlayPurchaseAnimation,
    });
  }

  private initializeEnhancedDebugMode(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    activeSkillTree.maxVisibleDepth = 10;
    this.generateFullTreeEnhancedDebug(activeSkillTree);
    this.scene.ui.setMode(Mode.SKILL_TREE, {
      mode: SkillTreeMode.DEBUG_ENHANCED,
      activeSkillTree,
      championData,
      onClose: () => this.handleComplete(),
      onCancel: () => this.handleCancel(),
      shouldPlayPurchaseAnimation: this.config.shouldPlayPurchaseAnimation,
    });
  }
  private mergeLockedSkillsIntoPools(target: any, locked: Record<string, any>): void {
    const push = (arr: any[], v: any) => { if (v !== undefined && !arr.includes(v)) arr.push(v); };
    for (const [, s] of Object.entries(locked || {})) {
      switch (s.rewardType as SkillTreeRewardType) {
        case SkillTreeRewardType.TM_FILTERED:
          target.unlockedTMs ||= [];
          push(target.unlockedTMs, s.unlockableId);
          break;
        case SkillTreeRewardType.XM_FILTERED:
          target.unlockedXMs ||= [];
          push(target.unlockedXMs, s.unlockableId);
          break;
        case SkillTreeRewardType.ABILITY_GRANT:
        case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
          target.unlockedAbilities ||= [];
          push(target.unlockedAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.TRAINER_BOND_ABILITY:
          target.unlockedConditionalAbilities ||= [];
          push(target.unlockedConditionalAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.MEGA_STONE:
          target.unlockedMegaStones ||= [];
          push(target.unlockedMegaStones, s.unlockableId);
          break;
        case SkillTreeRewardType.POKEMON_ALT_BUILD:
          target.unlockedAltBuilds ||= [];
          push(target.unlockedAltBuilds, s.unlockableId);
          break;
        case SkillTreeRewardType.MOVE_UPGRADE:
          target.unlockedMoveUpgrades ||= [];
          push(target.unlockedMoveUpgrades, s.unlockableId);
          break;
        case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:

          target.unlockedMoveAttrUpgrades ||= [];

          break;
        case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
          target.unlockedTypeBoosters ||= [];
          push(target.unlockedTypeBoosters, s.unlockableId);
          break;
        case SkillTreeRewardType.SMITTY_ABILITY:
          target.unlockedSmittyAbilities ||= [];
          push(target.unlockedSmittyAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
          try {
            const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(s.unlockableId as QuestUnlockables);
            const species = getPokemonSpecies(questUnlockData.rewardId as Species);
            const formName = species.getGlitchFormName(true, undefined, questUnlockData.rewardType);
            if (formName) {
              target.unlockedGlitchForms ||= [];
              push(target.unlockedGlitchForms, formName.toLowerCase());
              target.glitchFormUnlockableIds ||= {};
              target.glitchFormUnlockableIds[formName.toLowerCase()] = s.unlockableId;
            }
          } catch (error) {
          }
          break;
        case SkillTreeRewardType.HEALING_ITEMS:
          target.unlockedHealingItems = true;
          break;
        case SkillTreeRewardType.MEMORY_MUSHROOM:
          target.unlockedMemoryMushroom = true;
          break;
        case SkillTreeRewardType.BERRY_ITEMS:
          target.unlockedBerries = true;
          break;
        case SkillTreeRewardType.ABILITY_SWITCHER:
          target.unlockedAbilitySwitchers = true;
          break;
        case SkillTreeRewardType.GENERAL_ITEMS:
          target.unlockedGeneralItems = true;
          break;
        case SkillTreeRewardType.BATON_ITEM:
          target.unlockedBaton = true;
          break;
        case SkillTreeRewardType.PP_MAX_ITEM:
          target.unlockedPPMax = true;
          break;
        case SkillTreeRewardType.ROGUE_BALL:
          target.unlockedRogueBall = true;
          break;
        default:
          break;
      }
    }
  }
  private generateFullTreeEnhancedDebug(activeSkillTree: ActiveSkillTreeData): void {
    const championId = activeSkillTree.championId;
    const manager = ChampionManager.getInstance();
    const original = manager.getChampionData(championId);
    const defLocked = (CHAMPION_DEFINITIONS[championId] as any)?.lockedSkills || {};

    const debugChamp = JSON.parse(JSON.stringify(original));
    this.mergeLockedSkillsIntoPools(debugChamp, defLocked);

    if (debugChamp.unlockedGlitchForms && debugChamp.unlockedGlitchForms.length > 0) {
      if (!activeSkillTree.unlockedGlitchForms) {
        activeSkillTree.unlockedGlitchForms = [];
      }
      debugChamp.unlockedGlitchForms.forEach(formKey => {
        if (!activeSkillTree.unlockedGlitchForms.includes(formKey)) {
          activeSkillTree.unlockedGlitchForms.push(formKey);
        }
      });
    }
    const champStore = (this.scene.gameData as any).championData;
    const prev = champStore[championId];
    try {
      champStore[championId] = debugChamp;

      (this.scene as any).skillTreeEligibilityBypass = true;
      const gen = new SkillTreeGenerator(this.scene as BattleScene, activeSkillTree.seed, championId);
      let nodes: SkillTreeNode[];
      this.scene.executeWithSeedOffset(() => {
        nodes = gen.generateCompleteTree(Number.MAX_SAFE_INTEGER);
      }, 0, activeSkillTree.seed.toString());
      (this.scene.gameData as any).tempSkillTreeNodes = nodes;
    } finally {

      champStore[championId] = prev;
      try { delete (this.scene as any).skillTreeEligibilityBypass; } catch {}
    }
  }

  private handleComplete(): void {
    const isBattleAccess = this.config.mode === SkillTreeMode.BATTLE_ACCESS || this.config.mode === "BATTLE_ACCESS";
    if (isBattleAccess) {
      const nextPhase = this.scene.getNextPhase();
      const fieldIndex = nextPhase instanceof CommandPhase ? nextPhase.getFieldIndex() : 0;
      this.scene.ui.setModeForceTransition(Mode.COMMAND, fieldIndex).then(() => {
        this.config.onComplete?.();
        this.end();
      });
      return;
    }
    this.scene.ui.revertMode().then(() => {
      this.config.onComplete?.();
      this.end();
    });
  }

  private handleCancel(): void {
    try { (this.scene.gameData as any).tempSkillTreeNodes = undefined; } catch {}
    const isBattleAccess = this.config.mode === SkillTreeMode.BATTLE_ACCESS || this.config.mode === "BATTLE_ACCESS";
    if (isBattleAccess) {
      const nextPhase = this.scene.getNextPhase();
      const fieldIndex = nextPhase instanceof CommandPhase ? nextPhase.getFieldIndex() : 0;
      this.scene.ui.setModeForceTransition(Mode.COMMAND, fieldIndex).then(() => {
        this.config.onCancel?.();
        this.end();
      });
      return;
    }
    this.scene.ui.revertMode().then(() => {
      this.config.onCancel?.();
      this.end();
    });
  }
  private generateStarterSelectionNodes(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    try {
      const gd = (this.scene as any).gameData;
      const cached = gd.tempSkillTreeNodes as SkillTreeNode[] | undefined;
      const hasRoot = Array.isArray(cached) && cached.some(n => n.id === "root_0" || n.depth === 0);

      if (cached && cached.length > 0 && hasRoot) {
        return;
      }

      const generator = new SkillTreeGenerator(
        this.scene as BattleScene,
        activeSkillTree.seed,
        activeSkillTree.championId
      );
      this.scene.executeWithSeedOffset(() => {
        const fullTree = generator.generateCompleteTree(activeSkillTree.maxVisibleDepth);

        const upgrades = Math.max(0, Math.min(6, championData?.starterNodeUpgradesUnlocked ?? 0));
        const total = Math.min(10, 4 + upgrades);
        const radius = getDepth1Radius();

        let signatureCount = Math.floor(total / 2);
        let generalCount = total - signatureCount;
        if (total % 2 !== 0) {
          if (Utils.randSeedInt(2) === 0) signatureCount += 1; else generalCount += 1;
        }

        const filteredTree = fullTree.filter(node => node.depth !== 1);
        const originalDepth1NodeIds = fullTree.filter(n => n.depth === 1).map(n => n.id);

        const nodeCount = Math.max(1, signatureCount + generalCount);
        let placed = 0;

        const nodeGen = new SkillTreeNodeGenerator(activeSkillTree.seed, activeSkillTree.championId, this.scene as BattleScene);

        for (let i = 0; i < signatureCount; i++, placed++) {
          const angle = (placed * 2 * Math.PI) / nodeCount;
          const species = ChampionUtils.getRandomChampionSignaturePokemon(championData, this.scene as BattleScene) as unknown as number;
          const pokemonName = allSpecies?.[species - 1]?.name;
          const nodeId = `depth1_signature_${i}`;
          const resolvedAltBuildId = ChampionUtils.getSignatureAltBuildId(species as any, championData as any);
          const resolvedAltBuild = resolvedAltBuildId ? POKEMON_ALT_BUILDS[resolvedAltBuildId] : undefined;
          const rewardData = { type: SkillTreeRewardType.SIGNATURE_POKEMON, data: { species, altBuildId: resolvedAltBuildId, altBuild: resolvedAltBuild }, immediate: false };
          filteredTree.push({
            id: nodeId,
            depth: 1,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            dependencies: ["root_0"],
            rarity: SkillTreeRarity.GREAT,
            state: SkillTreeNodeState.LOCKED_DETAILS,
            rewardData,
            name: pokemonName ?? i18next.t("skillTree:descriptions.signaturePokemon", { champion: ChampionUtils.getChampionDisplayName(championData.id), pokemon: pokemonName }),
            description: nodeGen.getRewardDescription(rewardData),
            cost: 1,
            isLegendary: false,
            unlocked: false,
          });
        }

        for (let i = 0; i < generalCount; i++, placed++) {
          const angle = (placed * 2 * Math.PI) / nodeCount;
          const species = SkillTreeSelectors.pickGeneralPokemon(championData, this.scene as BattleScene) as unknown as number;
          const nodeId = `depth1_general_${i}`;
          const rewardData = { type: SkillTreeRewardType.GENERAL_POKEMON, data: { species }, immediate: false };
          const generatedDescription = nodeGen.getRewardDescription(rewardData);
          filteredTree.push({
            id: nodeId,
            depth: 1,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            dependencies: ["root_0"],
            rarity: SkillTreeRarity.GREAT,
            state: SkillTreeNodeState.LOCKED_DETAILS,
            rewardData,
            name: allSpecies?.[species]?.name ?? i18next.t("skillTree:descriptions.generalPokemon", { champion: ChampionUtils.getChampionDisplayName(championData.id) }),
            description: generatedDescription,
            cost: 1,
            isLegendary: false,
            unlocked: false,
          });
        }

        const newPokemonNodes = filteredTree.filter(n => n.depth === 1);
        if (newPokemonNodes.length > 0) {
          filteredTree.forEach(node => {
            if (node.depth === 2 && node.dependencies) {
              node.dependencies = node.dependencies.map(depId => {
                if (originalDepth1NodeIds.includes(depId)) {
                  let closestNode = newPokemonNodes[0];
                  let minDistance = this.calculateDistance(node.position, closestNode.position);

                  for (const pokemonNode of newPokemonNodes) {
                    const distance = this.calculateDistance(node.position, pokemonNode.position);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestNode = pokemonNode;
                    }
                  }

                  const maxConnectionDistance = 300;
                  if (minDistance <= maxConnectionDistance) {
                    return closestNode.id;
                  } else {
                    return "root_0";
                  }
                }
                return depId;
              });
            }
          });
        }

        (this.scene.gameData as any).tempSkillTreeNodes = filteredTree;
      }, 0, activeSkillTree.seed.toString());
    } catch (e) {
    }
  }
  private generateRandomDepth1Nodes(activeSkillTree: ActiveSkillTreeData, championData: any): void {
    try {
      const gd = (this.scene.gameData as any);
      if (gd.tempSkillTreeNodes && Array.isArray(gd.tempSkillTreeNodes) && gd.tempSkillTreeNodes.length > 0) {
        return;
      }

      const nodes = SkillTreeUtils.generateDepth1Nodes(activeSkillTree, championData, this.scene);
      gd.tempSkillTreeNodes = nodes;
    } catch (e) {
    }
  }

  private handlePokemonSelection(species: number, isSignature: boolean): void {
    const entry = { species, isSignature } as PokemonSelection;

    if (isSignature) {
      const existingSig = this.selections.findIndex(s => s.isSignature);
      if (existingSig > -1) {
        return;
      }
    }

    if (this.selections.length >= 2) {
      const nonSigIdx = this.selections.findIndex(s => !s.isSignature);
      if (nonSigIdx > -1) {
        this.selections.splice(nonSigIdx, 1);
      } else {
        return;
      }
    }

    this.selections.push(entry);

    if (this.selections.length === 2) {
      this.handleSelectionsComplete();
    }
  }

  private handleSelectionsComplete(): void {

    this.scene.ui.revertMode().then(() => {
      this.config.onComplete?.(this.selections);
      this.scene.gameData.localSaveAll(this.scene);
      this.end();
    });
  }

  private handleError(): void {
    this.end();
  }
}