import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { SkillTreeNodeGenerator, getDisplayRarityForRewardType } from "#app/system/skill-tree-node-generator";
import { SkillTreeGenerator } from "#app/system/skill-tree-generator";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { ActiveSkillTreeData, SkillTreeNodeState, SkillTreeRarity, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { allSpecies, getPokemonSpecies } from "#app/data/pokemon-species";
import { Type } from "#app/data/type";
import { POKEMON_ALT_BUILDS } from "#app/data/pokemon-alt-buid";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { SkillTreeNode } from "#app/system/skill-tree-data.js";
import { PlayerGender } from "#enums/player-gender";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { Species } from "#app/enums/species.js";
import { QuestUnlockables } from "#app/system/game-data.js";
import { CommandPhase } from "#app/phases/command-phase";
import { VoucherType } from "#app/system/voucher";

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

export type StarterMysteryTier = "common" | "master" | "legendary";

export function rollStarterMysteryTier(roll: number): StarterMysteryTier {
  if (roll < 2) return "legendary";
  if (roll < 7) return "master";
  return "common";
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

      this.scene.executeWithSeedOffset(() => {
        const nodes: SkillTreeNode[] = [];
        const upgrades = Math.max(0, Math.min(6, championData?.starterNodeUpgradesUnlocked ?? 0));
        const total = Math.min(10, 4 + upgrades);
        const radius = getDepth1Radius();

        let signatureCount = Math.floor(total / 2);
        let generalCount = total - signatureCount;
        if (total % 2 !== 0) {
          if (Utils.randSeedInt(2) === 0) signatureCount += 1; else generalCount += 1;
        }

        let descriptionParams: any = { defaultValue: i18next.t("skillTree:rootNode.description") };

        if (championData?.id === "apollo" || championData?.id === "diana") {
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

        nodes.push({
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
        });

        const nodeCount = Math.max(1, signatureCount + generalCount);
        const bottomSlot = Math.max(1, Math.round(nodeCount / 4));
        const mysteryIdx = signatureCount > 0 ? Math.min(signatureCount - 1, bottomSlot) : -1;

        const isMysteryRewardEligible = (rt: SkillTreeRewardType): boolean => {
          switch (rt) {
            case SkillTreeRewardType.PERMA_MONEY:
              return !!championData?.unlockedPermaMoney;
            case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
              return !!championData?.unlockedBallRaritySelect?.rogue;
            case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
              return !!championData?.unlockedBallRaritySelect?.master;
            case SkillTreeRewardType.MASTER_BALL:
              return !!championData?.unlockedMasterBall;
            case SkillTreeRewardType.GOLDEN_POKEBALL:
              return !!championData?.unlockedGoldenPokeball;
            case SkillTreeRewardType.VOID_BALL:
              return !!championData?.unlockedVoidBall;
            case SkillTreeRewardType.SMITTY_ABILITY:
              return (championData?.unlockedSmittyAbilities?.length ?? 0) > 0;
            default:
              return true;
          }
        };

        const commonPool = [
          SkillTreeRewardType.EGG_VOUCHER,
          SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
          SkillTreeRewardType.SKILL_TREE_TOKENS,
          SkillTreeRewardType.SKILL_POINTS,
          SkillTreeRewardType.TRAINER_BOND_ABILITY,
          SkillTreeRewardType.PERMA_MONEY,
          SkillTreeRewardType.ROGUEBALL_RARITY_SELECT,
          SkillTreeRewardType.PERMA_ITEM,
        ].filter(isMysteryRewardEligible);

        const veryRarePool = [
          SkillTreeRewardType.MASTER_BALL,
          SkillTreeRewardType.PARTY_ABILITY_GRANT,
          SkillTreeRewardType.MASTERBALL_RARITY_SELECT,
        ].filter(isMysteryRewardEligible);

        const ultraRarePool = [
          SkillTreeRewardType.SMITTY_ABILITY,
          SkillTreeRewardType.GOLDEN_POKEBALL,
          SkillTreeRewardType.VOID_BALL,
        ].filter(isMysteryRewardEligible);

        const pickMysteryRewardType = (): SkillTreeRewardType => {
          const tier = rollStarterMysteryTier(Utils.randSeedInt(5000));

          if (tier === "legendary") {
            if (ultraRarePool.length) return Utils.randSeedItem(ultraRarePool);
            if (veryRarePool.length) return Utils.randSeedItem(veryRarePool);
            return Utils.randSeedItem(commonPool);
          }

          if (tier === "master") {
            if (veryRarePool.length) return Utils.randSeedItem(veryRarePool);
            if (commonPool.length) return Utils.randSeedItem(commonPool);
            return Utils.randSeedItem(ultraRarePool);
          }

          if (commonPool.length) return Utils.randSeedItem(commonPool);
          if (veryRarePool.length) return Utils.randSeedItem(veryRarePool);
          return Utils.randSeedItem(ultraRarePool);
        };

        const generateMysteryRewardData = (rt: SkillTreeRewardType) => {
          switch (rt) {
            case SkillTreeRewardType.EGG_VOUCHER:
              return { type: rt, data: { tier: Utils.randSeedItem([VoucherType.REGULAR, VoucherType.PLUS, VoucherType.PREMIUM]) }, immediate: false };
            case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickPassiveAbility(championData) }, immediate: false };
            case SkillTreeRewardType.SKILL_TREE_TOKENS:
              return { type: rt, data: { amount: SkillTreeSelectors.pickSkillTreeTokens() }, immediate: true };
            case SkillTreeRewardType.SKILL_POINTS:
              return { type: rt, data: { amount: SkillTreeSelectors.pickSkillPoints() }, immediate: true };
            case SkillTreeRewardType.TRAINER_BOND_ABILITY:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickTrainerBondAbility(championData), activationChance: 0.05 }, immediate: false };
            case SkillTreeRewardType.PERMA_MONEY:
              return { type: rt, data: { amount: (Utils.randSeedInt(5) + 1) * 1000 }, immediate: true };
            case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
              return { type: rt, data: {}, immediate: false };
            case SkillTreeRewardType.PERMA_ITEM:
              return { type: rt, data: { permaType: SkillTreeSelectors.pickPermaItemType() }, immediate: false };
            case SkillTreeRewardType.MASTER_BALL:
            case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
            case SkillTreeRewardType.PARTY_ABILITY_GRANT:
            case SkillTreeRewardType.GOLDEN_POKEBALL:
            case SkillTreeRewardType.VOID_BALL:
              return { type: rt, data: {}, immediate: false };
            case SkillTreeRewardType.SMITTY_ABILITY:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickSmittyAbility(championData) }, immediate: false };
            default:
              return { type: SkillTreeRewardType.EGG_VOUCHER, data: { tier: VoucherType.REGULAR }, immediate: false };
          }
        };

        let placed = 0;

        const nodeGen = new SkillTreeNodeGenerator(activeSkillTree.seed, activeSkillTree.championId, this.scene as BattleScene);
        const availableSignatures = ChampionUtils.getAvailableChampionSignaturePokemon(championData, this.scene as BattleScene);
        const shuffledSignatures = Utils.randSeedShuffle(availableSignatures);
        let sigPlaced = 0;

        for (let i = 0; i < signatureCount; i++, placed++) {
          const angle = (placed * 2 * Math.PI) / nodeCount;
          const nodeId = i === mysteryIdx ? `depth1_signature_mystery_${i}` : `depth1_signature_${i}`;

          if (i === mysteryIdx) {
            const mysteryType = pickMysteryRewardType();
            const mysteryRewardData = generateMysteryRewardData(mysteryType);
            mysteryRewardData.data = { ...(mysteryRewardData.data || {}), starterMysteryNode: true };
            const rarity = getDisplayRarityForRewardType(mysteryType);

            nodes.push({
              id: nodeId,
              depth: 1,
              position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
              dependencies: ["root_0"],
              rarity,
              state: SkillTreeNodeState.LOCKED_DETAILS,
              rewardData: mysteryRewardData,
              name: nodeGen.getRewardName(mysteryRewardData),
              description: nodeGen.getRewardDescription(mysteryRewardData),
              cost: 0,
              isLegendary: false,
              unlocked: false,
            });
            continue;
          }

          const species = (shuffledSignatures.length > 0)
            ? (shuffledSignatures[sigPlaced % shuffledSignatures.length] as unknown as number)
            : (ChampionUtils.getRandomChampionSignaturePokemon(championData, this.scene as BattleScene) as unknown as number);
          sigPlaced++;
          const resolvedAltBuildId = ChampionUtils.getSignatureAltBuildId(species as any, championData as any);
          const resolvedAltBuild = resolvedAltBuildId ? POKEMON_ALT_BUILDS[resolvedAltBuildId] : undefined;
          const rewardData = { type: SkillTreeRewardType.SIGNATURE_POKEMON, data: { species, altBuildId: resolvedAltBuildId, altBuild: resolvedAltBuild }, immediate: false };
          nodes.push({
            id: nodeId,
            depth: 1,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            dependencies: ["root_0"],
            rarity: SkillTreeRarity.GREAT,
            state: SkillTreeNodeState.LOCKED_DETAILS,
            rewardData,
            name: nodeGen.getRewardName(rewardData),
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
          nodes.push({
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

        (this.scene.gameData as any).tempSkillTreeNodes = nodes;
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