import { BattlePhase } from "./battle-phase";
import { Mode } from "#app/ui/ui.js";
import { PathNodeType, PathNode, getCurrentBattlePath, selectPath, FixedBattle, BattleType, DynamicMode, getAvailablePathsFromWave, rivalWaves } from "#app/battle.js";
import { SelectModifierPhase } from "./select-modifier-phase.js";
import { SelectPermaModifierPhase } from "./select-perma-modifier-phase";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { ModifierRewardPhase } from "./modifier-reward-phase.js";
import { EncounterPhase } from "./encounter-phase.js";
import { ChaosEncounterPhase } from "./chaos-encounter-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { modifierTypes, PathNodeTypeFilter } from "#app/modifier/modifier-type.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import * as Utils from "#app/utils.js";
import i18next from "i18next";
import { ReturnPhase } from "./return-phase.js";
import { ShowTrainerPhase } from "./show-trainer-phase.js";
import BattleScene, { RecoveryBossMode } from "#app/battle-scene.js";

export enum PathNodeContext {
  BATTLE_NODE,     
  ITEM_REWARD_NODE,
  MONEY_NODE,      
  SPECIAL_REWARD_NODE
}

export class BattlePathPhase extends BattlePhase {
  private onNodeSelected?: (node: PathNode) => void;
  private shouldIncrementWave: boolean;
  private battlePathWave: integer;



  constructor(scene: BattleScene, onNodeSelected?: (node: PathNode) => void, incrementWave: boolean = true) {
    super(scene);
    this.onNodeSelected = onNodeSelected;
    this.shouldIncrementWave = incrementWave;
    this.battlePathWave = scene.battlePathWave || 1;
  }

  start() {
    super.start();

    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      console.warn("No battle path available, ending phase");
      this.end();
      return;
    }


    if (this.shouldIncrementWave) {
      this.incrementBathPathWave();
      this.scene.gameData.localSaveAll(this.scene);
    } 

    this.scene.ui.setMode(Mode.BATTLE_PATH, {
      onNodeSelected: (node: PathNode) => this.handleNodeSelection(node)
    });
    
    const uiHandler = this.scene.ui.getHandler();
    if (uiHandler && typeof (uiHandler as any).refreshCurrentWave === 'function') {
      (uiHandler as any).refreshCurrentWave();
    }

  }

  private setPathNodeContext(context: PathNodeContext, nodeType: PathNodeType): void {
    this.scene.pathNodeContext = context;
    this.scene.selectedNodeType = nodeType;
  }

  private incrementBathPathWave(): void {
    if (this.scene.gameMode.isChaosMode) {
      this.battlePathWave++;
      this.scene.battlePathWave = this.battlePathWave;

      if(this.battlePathWave === 2) {
        this.scene.gameData.updateGameModeStats(this.scene.gameMode.modeId);
      }
    
      if (this.scene.gameData) {
        this.scene.gameData.currentPathPosition = this.battlePathWave;
      }
      
      this.scene.updateGameInfo();
      this.scene.updateBiomeWaveText(this.battlePathWave);
    }
  }

  private updateCurrentBattleWave(): void {
    this.scene.currentBattle.waveIndex = this.battlePathWave;
  }

  private addWaveToRivalWaves(wave: integer): void {
    this.scene.rivalWave = wave;
  }

  private createReturnToBattlePathCallback(): () => void {
    return () => {
      if (this.scene.gameMode.isChaosMode) {
        this.scene.unshiftPhase(new BattlePathPhase(this.scene));
      }
    };
  }

  private assignDynamicModeTargets(dynamicMode: DynamicMode): void {
    const playerParty = this.scene.getParty().filter(p => !p.isFainted());
    
    if (playerParty.length > 0) {
      const strongestPokemon = playerParty.reduce((strongest, current) => {
      const strongestTotal = strongest.stats.reduce((sum, stat) => sum + stat, 0);
      const currentTotal = current.stats.reduce((sum, stat) => sum + stat, 0);
      return currentTotal > strongestTotal ? current : strongest;
    }, playerParty[0]);

      if (dynamicMode.typeExtraDamage !== undefined) {
        dynamicMode.typeExtraDamage = strongestPokemon.getTypes()[0];
        console.log(`🎯 Dynamic Mode: typeExtraDamage assigned to ${strongestPokemon.getTypes()[0]} (strongest: ${strongestPokemon.name})`);
      }

      if (dynamicMode.pokemonNerf !== undefined) {
        dynamicMode.pokemonNerf = strongestPokemon.species.speciesId;
        console.log(`🎯 Dynamic Mode: pokemonNerf assigned to ${strongestPokemon.species.speciesId} (strongest: ${strongestPokemon.name})`);
      }
    }
  }

  private getAvailableNodesForCurrentWave(): PathNode[] {
    const currentWave = this.battlePathWave || 1;
    const battlePath = getCurrentBattlePath();
    
    if (!battlePath) {
      return [];
    }
    
    if (currentWave === 1) {
      return battlePath.waveToNodeMap.get(1) || [];
    }
    
    const selectedPath = this.scene.gameData?.selectedPath;
    if (!selectedPath) {
      console.warn("No previously selected path found for wave validation");
      return [];
    }
    
    const previouslySelectedNode = battlePath.nodeMap.get(selectedPath);
    if (!previouslySelectedNode) {
      console.warn(`Previously selected node ${selectedPath} not found in battle path`);
      return [];
    }
    
    const availableNodes: PathNode[] = [];
    const nodesAtCurrentWave = battlePath.waveToNodeMap.get(currentWave) || [];
    
    for (const currentWaveNode of nodesAtCurrentWave) {
      if (previouslySelectedNode.connections && previouslySelectedNode.connections.includes(currentWaveNode.id)) {
        availableNodes.push(currentWaveNode);
      }
    }
    
    return availableNodes;
  }

  private validateNodeSelection(node: PathNode): boolean {
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      console.warn("No battle path available for validation");
      return false;
    }

    const availableNodes = this.getAvailableNodesForCurrentWave();
    const isAvailable = availableNodes.some(availableNode => availableNode.id === node.id);
    
    if (!isAvailable) {
      const currentWave = this.battlePathWave || 1;
      console.warn(`🚫 Node ${node.id} at wave ${node.wave} is not available from current wave ${currentWave}`);
      console.log(`Available nodes:`, availableNodes.map(n => `${n.id} (wave ${n.wave})`));
      return false;
    }

    return true;
  }

  private handleNodeSelection(node: PathNode): void {
    
    if (!this.validateNodeSelection(node)) {
      console.warn(`❌ Invalid node selection: ${node.id}`);
      return;
    }
    
    if (!selectPath(this.scene, node.id)) {
      console.warn(`Failed to select path node: ${node.id}`);
      return;
    }

    if (node.dynamicMode && (node.dynamicMode.typeExtraDamage !== undefined || node.dynamicMode.pokemonNerf !== undefined)) {
      this.assignDynamicModeTargets(node.dynamicMode);
      
      this.scene.dynamicMode = node.dynamicMode;
    }
    else {
      this.scene.dynamicMode = undefined;
    }

    if (this.onNodeSelected) {
      this.onNodeSelected(node);
    }

    this.routeToPhase(node);
    
    this.scene.ui.setMode(Mode.MESSAGE);
    this.end();
  }

  private routeToPhase(node: PathNode): void {
    switch (node.nodeType) {
      case PathNodeType.RECOVERY_BOSS:
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, node.nodeType);
        this.scene.recoveryBossMode = RecoveryBossMode.FACING_BOSS;
        Utils.randSeedInt(100) < 50 ? this.handleWildPokemonNode(node) : this.handleTrainerBattleNode(node);
        break;

      case PathNodeType.MAJOR_BOSS_BATTLE:
      case PathNodeType.CHALLENGE_BOSS:
        this.scene.majorBossWave = node.wave;
      case PathNodeType.WILD_POKEMON:
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, node.nodeType);
        this.handleWildPokemonNode(node);
        break;
      
      case PathNodeType.TRAINER_BATTLE:
      case PathNodeType.EVIL_BOSS_BATTLE:
      case PathNodeType.ELITE_FOUR:
      case PathNodeType.CHAMPION:
      case PathNodeType.SMITTY_BATTLE:
      case PathNodeType.EVIL_GRUNT_BATTLE:
      case PathNodeType.EVIL_ADMIN_BATTLE:
      case PathNodeType.CHALLENGE_EVIL_BOSS:
      case PathNodeType.CHALLENGE_CHAMPION:
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, node.nodeType);
        this.handleTrainerBattleNode(node);
        break;
      
      case PathNodeType.RIVAL_BATTLE:
      case PathNodeType.CHALLENGE_RIVAL:
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, node.nodeType);
        this.addWaveToRivalWaves(node.wave);
        this.handleTrainerBattleNode(node);
        break;

      case PathNodeType.ITEM_GENERAL:
      case PathNodeType.ADD_POKEMON:
      case PathNodeType.ITEM_TM:
      case PathNodeType.ITEM_BERRY:
      case PathNodeType.ROGUE_BALL_ITEMS:
      case PathNodeType.MASTER_BALL_ITEMS:
      case PathNodeType.ABILITY_SWITCHERS:
      case PathNodeType.RELEASE_ITEMS:
      case PathNodeType.MINTS:
      case PathNodeType.PP_MAX:
      case PathNodeType.COLLECTED_TYPE:
      case PathNodeType.STAT_SWITCHERS:
      case PathNodeType.TYPE_SWITCHER:
      case PathNodeType.PASSIVE_ABILITY:
      case PathNodeType.ANY_TMS:
      case PathNodeType.DNA_SPLICERS:
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, node.nodeType);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handleItemRewardNode(node);
        this.updateCurrentBattleWave();
        break;
      case PathNodeType.CHALLENGE_REWARD:
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, node.nodeType);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handleChallengeRewardNode(node);
        this.updateCurrentBattleWave();
        break;
      case PathNodeType.PERMA_ITEMS:
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, node.nodeType);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handlePermaItemNode(node);
        this.updateCurrentBattleWave();
        break;

      case PathNodeType.GLITCH_PIECE:
      case PathNodeType.EGG_VOUCHER:
      case PathNodeType.EXP_SHARE:
      case PathNodeType.PERMA_MONEY:
      case PathNodeType.GOLDEN_POKEBALL:
      case PathNodeType.RAND_PERMA_ITEM:
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, node.nodeType);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handleSpecialRewardNode(node);
        this.updateCurrentBattleWave();
        break;

      case PathNodeType.MONEY:
        this.setPathNodeContext(PathNodeContext.MONEY_NODE, node.nodeType);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handleMoneyRewardNode(node);
        this.updateCurrentBattleWave();
        break;

      case PathNodeType.MYSTERY_NODE:
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, node.nodeType);
        this.handleMysteryNode(node);
        break;

      case PathNodeType.CONVERGENCE_POINT:
        console.warn("Convergence points should not be selectable");
        break;

      default:
        console.warn(`Unknown node type: ${node.nodeType}`);
        break;
    }
  }

  private handleWildPokemonNode(node: PathNode): void {
    const lastBattle = this.scene.currentBattle;
    this.scene.newBattle(node.wave, BattleType.WILD);
    if(node.dynamicMode) {
      this.scene.dynamicMode = node.dynamicMode;
    }
    else {
      this.scene.dynamicMode = undefined;
    }
    console.log(`🎮 BattlePathPhase: Wild Pokemon Node selected - ${node.id} at wave ${node.wave}`);
    this.scene.handleBiomeChange(node.wave, lastBattle, true);
    if (!this.scene.currentBattle.turnCommands) {
      this.scene.currentBattle.turnCommands = [];
    }
    this.scene.pushPhase(new ChaosEncounterPhase(this.scene, false));
  }

  private handleTrainerBattleNode(node: PathNode): void {
    const lastBattle = this.scene.currentBattle;
    if(node.dynamicMode) {
      this.scene.dynamicMode = node.dynamicMode;
    }
    else {
      this.scene.dynamicMode = undefined;
    }
    if (node.battleConfig) {
      this.scene.gameMode.setChaosBattleConfig(node.battleConfig);
    }
    this.scene.newBattle(node.wave, BattleType.TRAINER);
    this.scene.handleBiomeChange(node.wave, lastBattle, true);

    
    
    if (!this.scene.currentBattle.turnCommands) {
      this.scene.currentBattle.turnCommands = [];
    }
    
    const playerField = this.scene.getPlayerField();
    playerField.forEach((_, p) => this.scene.unshiftPhase(new ReturnPhase(this.scene, p)));
    this.scene.pushPhase(new ShowTrainerPhase(this.scene));
    
    this.scene.pushPhase(new ChaosEncounterPhase(this.scene, false));
  }

  private getPathNodeTypeFilter(nodeType: PathNodeType): PathNodeTypeFilter {
    switch (nodeType) {
      case PathNodeType.MASTER_BALL_ITEMS:
        return PathNodeTypeFilter.MASTER_BALL_ITEMS;
      case PathNodeType.TYPE_SWITCHER:
        return PathNodeTypeFilter.TYPE_SWITCHER;
      case PathNodeType.PASSIVE_ABILITY:
        return PathNodeTypeFilter.PASSIVE_ABILITY;
      case PathNodeType.ANY_TMS:
        return PathNodeTypeFilter.ANY_TMS;
      case PathNodeType.MINTS:
        return PathNodeTypeFilter.MINTS;
      case PathNodeType.STAT_SWITCHERS:
        return PathNodeTypeFilter.STAT_SWITCHERS;
      case PathNodeType.RELEASE_ITEMS:
        return PathNodeTypeFilter.RELEASE_ITEMS;
      case PathNodeType.ABILITY_SWITCHERS:
        return PathNodeTypeFilter.ABILITY_SWITCHERS;
      case PathNodeType.ROGUE_BALL_ITEMS:
        return PathNodeTypeFilter.ROGUE_BALL_ITEMS;
      case PathNodeType.ITEM_BERRY:
        return PathNodeTypeFilter.ITEM_BERRY;
      case PathNodeType.ITEM_TM:
        return PathNodeTypeFilter.ITEM_TM;
      case PathNodeType.ADD_POKEMON:
        return PathNodeTypeFilter.ADD_POKEMON;
      case PathNodeType.PP_MAX:
        return PathNodeTypeFilter.PP_MAX;
      case PathNodeType.COLLECTED_TYPE:
        return PathNodeTypeFilter.COLLECTED_TYPE;
      case PathNodeType.DNA_SPLICERS:
        return PathNodeTypeFilter.DNA_SPLICERS;
      case PathNodeType.EXP_SHARE:
        return PathNodeTypeFilter.EXP_SHARE;
      default:
        return PathNodeTypeFilter.NONE;
    }
  }

  private handleItemRewardNode(node: PathNode): void {
    let rerollCount = 1;
    let modifierTiers = undefined;
    
    if (node.nodeType === PathNodeType.PERMA_ITEMS || 
        node.nodeType === PathNodeType.GOLDEN_POKEBALL ||
        node.nodeType === PathNodeType.MASTER_BALL_ITEMS) {
      rerollCount = 3;
    }

    const pathNodeFilter = this.getPathNodeTypeFilter(node.nodeType);
    this.scene.unshiftPhase(new SelectModifierPhase(this.scene, rerollCount, modifierTiers, false, this.createReturnToBattlePathCallback(), pathNodeFilter));
  }

  private handlePermaItemNode(node: PathNode): void {
    const selectPermaPhase = new SelectPermaModifierPhase(this.scene, 0, undefined, this.createReturnToBattlePathCallback());
    this.scene.unshiftPhase(selectPermaPhase);
  }

  private createModifierRewardPhaseWithCallback(modifierTypeFunc: any, isPerma: boolean = false): ModifierRewardPhase {
    const modifierRewardPhase = new ModifierRewardPhase(this.scene, modifierTypeFunc, isPerma, null, false, isPerma);
    const originalEnd = modifierRewardPhase.end.bind(modifierRewardPhase);
    modifierRewardPhase.end = () => {
      originalEnd();
      if (this.scene.gameMode.isChaosMode) {
        this.scene.unshiftPhase(new BattlePathPhase(this.scene));
      }
    };
    return modifierRewardPhase;
  }

  private handleSpecialRewardNode(node: PathNode): void {
    switch (node.nodeType) {
      case PathNodeType.GLITCH_PIECE:
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["GLITCH_PIECE"]));
        break;
      case PathNodeType.PERMA_MONEY:
        const randPerma = Utils.randSeedInt(1000);
        let permaMoneyKey: string;
        if (randPerma < 750) {
          permaMoneyKey = "PERMA_MONEY_1";
        } else if (randPerma < 900) {
          permaMoneyKey = "PERMA_MONEY_2";
        } else if (randPerma < 950) {
          permaMoneyKey = "PERMA_MONEY_3";
        } else if (randPerma < 975) {
          permaMoneyKey = "PERMA_MONEY_4";
        } else {
          permaMoneyKey = "PERMA_MONEY_5";
        }
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes[permaMoneyKey]));
        break;
      case PathNodeType.GOLDEN_POKEBALL:
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["GOLDEN_POKEBALL"]));
        break;
      case PathNodeType.EXP_SHARE:
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["EXP_SHARE"]));
        break;
      case PathNodeType.EGG_VOUCHER:
        const rand = Utils.randSeedInt(100);
        let voucherKey: string;
        if (rand < 95) {
          voucherKey = "VOUCHER";
        } else if (rand < 99) {
          voucherKey = "VOUCHER_PLUS";
        } else {
          voucherKey = "VOUCHER_PREMIUM";
        }
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes[voucherKey]));
        break;
      case PathNodeType.RAND_PERMA_ITEM:
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(null, true));
        break;
      default:
        console.warn(`Unhandled special reward: ${PathNodeType[node.nodeType]}`);
        break;
    }
  }

  private handleMoneyRewardNode(node: PathNode): void {
    const isPerma = node.nodeType === PathNodeType.PERMA_MONEY;
    let amount: number;
    
    if (isPerma) {
      amount = Utils.randSeedInt(1000, 250) + node.wave * 10;
      
      this.scene.addPermaMoney(amount);
      
      this.scene.unshiftPhase(new RewardObtainDisplayPhase(
        this.scene,
        {
          type: RewardObtainedType.MONEY,
          name: i18next.t("rewardObtainedUi:moneyObtained"),
          amount: amount
        },
        [() => {
          this.scene.ui.getHandler().clear();
          this.scene.updateMoneyText();
          this.scene.animateMoneyChanged(true);
          if (this.scene.gameMode.isChaosMode) {
            this.scene.unshiftPhase(new BattlePathPhase(this.scene));
          }
        }]
      ));
    } else {
      amount = Utils.randSeedInt(500, 200) + node.wave * 5;
      this.scene.money += amount;
      
      this.scene.unshiftPhase(new RewardObtainDisplayPhase(
        this.scene,
        {
          type: RewardObtainedType.MONEY,
          name: i18next.t("rewardObtainedUi:moneyObtained"),
          amount: amount
        },
        [() => {
          this.scene.ui.getHandler().clear();
          this.scene.updateMoneyText();
          this.scene.animateMoneyChanged(true);
          if (this.scene.gameMode.isChaosMode) {
            this.scene.unshiftPhase(new BattlePathPhase(this.scene));
          }
        }]
      ));
    }
  }

  private handleMysteryNode(node: PathNode): void {
    const MYSTERY_OUTCOMES = [
      { weight: 10, outcome: 'WILD_POKEMON' },
      { weight: 10, outcome: 'TRAINER_BATTLE' },
      { weight: 3, outcome: 'RIVAL_BATTLE' },
      { weight: 10, outcome: 'EVIL_GRUNT_BATTLE' },
      { weight: 5, outcome: 'ELITE_FOUR' },
      { weight: 3, outcome: 'CHAMPION' },
      { weight: 10, outcome: 'EVIL_ADMIN_BATTLE' },
      { weight: 5, outcome: 'RECOVERY_BOSS' },
      
      { weight: 10, outcome: 'ITEM_GENERAL' },
      { weight: 10, outcome: 'ADD_POKEMON' },
      { weight: 10, outcome: 'ITEM_TM' },
      { weight: 10, outcome: 'ITEM_BERRY' },
      { weight: 3, outcome: 'ROGUE_BALL_ITEMS' },
      { weight: 1, outcome: 'MASTER_BALL_ITEMS' },
      { weight: 10, outcome: 'ABILITY_SWITCHERS' },
      { weight: 10, outcome: 'RELEASE_ITEMS' },
      { weight: 10, outcome: 'MINTS' },
      { weight: 10, outcome: 'PP_MAX' },
      { weight: 10, outcome: 'COLLECTED_TYPE' },
      { weight: 10, outcome: 'STAT_SWITCHERS' },
      { weight: 10, outcome: 'TYPE_SWITCHER' },
      { weight: 10, outcome: 'PASSIVE_ABILITY' },
      { weight: 12, outcome: 'ANY_TMS' },
      { weight: 3, outcome: 'DNA_SPLICERS' },
      
      { weight: 2, outcome: 'PERMA_ITEMS' },
      { weight: 10, outcome: 'GLITCH_PIECE' },
      { weight: 10, outcome: 'EGG_VOUCHER' },
      { weight: 10, outcome: 'EXP_SHARE' },
      { weight: 10, outcome: 'PERMA_MONEY' },
      { weight: 1, outcome: 'GOLDEN_POKEBALL' },
      { weight: 3, outcome: 'RAND_PERMA_ITEM' },
      
      { weight: 10, outcome: 'MONEY' }
    ];

    const totalWeight = MYSTERY_OUTCOMES.reduce((sum, outcome) => sum + outcome.weight, 0);
    const randomValue = Utils.randSeedInt(totalWeight);
    let currentWeight = 0;
    
    for (const outcomeData of MYSTERY_OUTCOMES) {
      currentWeight += outcomeData.weight;
      if (randomValue < currentWeight) {
        this.executeMysteryOutcome(node, outcomeData.outcome);
        return;
      }
    }
    
    this.executeMysteryOutcome(node, MYSTERY_OUTCOMES[0].outcome);
  }

  private executeMysteryOutcome(node: PathNode, outcome: string): void {
    switch (outcome) {
      case 'WILD_POKEMON':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.WILD_POKEMON);
        this.handleWildPokemonNode(node);
        break;
        
      case 'TRAINER_BATTLE':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.TRAINER_BATTLE);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'RIVAL_BATTLE':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.RIVAL_BATTLE);
        this.addWaveToRivalWaves(node.wave);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'EVIL_GRUNT_BATTLE':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.EVIL_GRUNT_BATTLE);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'ELITE_FOUR':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.ELITE_FOUR);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'CHAMPION':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.CHAMPION);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'SMITTY_BATTLE':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.SMITTY_BATTLE);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'EVIL_ADMIN_BATTLE':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.EVIL_ADMIN_BATTLE);
        this.handleTrainerBattleNode(node);
        break;
        
      case 'RECOVERY_BOSS':
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.RECOVERY_BOSS);
        this.scene.recoveryBossMode = RecoveryBossMode.FACING_BOSS;
        Utils.randSeedInt(100) < 50 ? this.handleWildPokemonNode(node) : this.handleTrainerBattleNode(node);
        break;
        
      case 'ITEM_GENERAL':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ITEM_GENERAL);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ITEM_GENERAL)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ADD_POKEMON':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ADD_POKEMON);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ADD_POKEMON)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ITEM_TM':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ITEM_TM);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ITEM_TM)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ITEM_BERRY':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ITEM_BERRY);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ITEM_BERRY)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ROGUE_BALL_ITEMS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ROGUE_BALL_ITEMS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 2, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ROGUE_BALL_ITEMS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'MASTER_BALL_ITEMS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.MASTER_BALL_ITEMS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 3, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.MASTER_BALL_ITEMS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ABILITY_SWITCHERS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ABILITY_SWITCHERS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ABILITY_SWITCHERS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'RELEASE_ITEMS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.RELEASE_ITEMS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.RELEASE_ITEMS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'MINTS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.MINTS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.MINTS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'PP_MAX':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.PP_MAX);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.PP_MAX)));
        this.updateCurrentBattleWave();
        break;
        
      case 'COLLECTED_TYPE':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.COLLECTED_TYPE);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.COLLECTED_TYPE)));
        this.updateCurrentBattleWave();
        break;
        
      case 'STAT_SWITCHERS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.STAT_SWITCHERS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.STAT_SWITCHERS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'TYPE_SWITCHER':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.TYPE_SWITCHER);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.TYPE_SWITCHER)));
        this.updateCurrentBattleWave();
        break;
        
      case 'PASSIVE_ABILITY':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.PASSIVE_ABILITY);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.PASSIVE_ABILITY)));
        this.updateCurrentBattleWave();
        break;
        
      case 'ANY_TMS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.ANY_TMS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.ANY_TMS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'DNA_SPLICERS':
        this.setPathNodeContext(PathNodeContext.ITEM_REWARD_NODE, PathNodeType.DNA_SPLICERS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, undefined, false, this.createReturnToBattlePathCallback(), this.getPathNodeTypeFilter(PathNodeType.DNA_SPLICERS)));
        this.updateCurrentBattleWave();
        break;
        
      case 'CHALLENGE_REWARD':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.CHALLENGE_REWARD);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handleChallengeRewardNode(node);
        this.updateCurrentBattleWave();
        break;
        
      case 'PERMA_ITEMS':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.PERMA_ITEMS);
        this.scene.saveBiomeChange(node.wave - 1);
        this.handlePermaItemNode(node);
        this.updateCurrentBattleWave();
        break;
        
      case 'GLITCH_PIECE':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.GLITCH_PIECE);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["GLITCH_PIECE"]));
        this.updateCurrentBattleWave();
        break;
        
      case 'EGG_VOUCHER':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.EGG_VOUCHER);
        this.scene.saveBiomeChange(node.wave - 1);
        const rand = Utils.randSeedInt(100);
        const voucherKey = rand < 95 ? "VOUCHER" : rand < 99 ? "VOUCHER_PLUS" : "VOUCHER_PREMIUM";
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes[voucherKey]));
        this.updateCurrentBattleWave();
        break;
        
      case 'EXP_SHARE':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.EXP_SHARE);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["EXP_SHARE"]));
        this.updateCurrentBattleWave();
        break;
        
      case 'PERMA_MONEY':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.PERMA_MONEY);
        this.scene.saveBiomeChange(node.wave - 1);
        const randPerma = Utils.randSeedInt(1000);
        const permaMoneyKey = randPerma < 750 ? "PERMA_MONEY_1" : randPerma < 900 ? "PERMA_MONEY_2" : 
                             randPerma < 950 ? "PERMA_MONEY_3" : randPerma < 975 ? "PERMA_MONEY_4" : "PERMA_MONEY_5";
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes[permaMoneyKey]));
        this.updateCurrentBattleWave();
        break;
        
      case 'GOLDEN_POKEBALL':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.GOLDEN_POKEBALL);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(modifierTypes["GOLDEN_POKEBALL"]));
        this.updateCurrentBattleWave();
        break;
        
      case 'RAND_PERMA_ITEM':
        this.setPathNodeContext(PathNodeContext.SPECIAL_REWARD_NODE, PathNodeType.RAND_PERMA_ITEM);
        this.scene.saveBiomeChange(node.wave - 1);
        this.scene.unshiftPhase(this.createModifierRewardPhaseWithCallback(null, true));
        this.updateCurrentBattleWave();
        break;
        
      case 'MONEY':
        this.setPathNodeContext(PathNodeContext.MONEY_NODE, PathNodeType.MONEY);
        this.scene.saveBiomeChange(node.wave - 1);
        const moneyAmount = Utils.randSeedInt(500, 200) + node.wave * 10;
        this.scene.money += moneyAmount;
        this.scene.unshiftPhase(new RewardObtainDisplayPhase(
          this.scene,
          {
            type: RewardObtainedType.MONEY,
            name: i18next.t("battle:mysteryMoneyReward", { amount: moneyAmount }),
            amount: moneyAmount
          },
          [() => {
            this.scene.ui.getHandler().clear();
            this.scene.updateMoneyText();
            this.scene.animateMoneyChanged(true);
            if (this.scene.gameMode.isChaosMode) {
              this.scene.unshiftPhase(new BattlePathPhase(this.scene));
            }
          }]
        ));
        this.updateCurrentBattleWave();
        break;
        
      default:
        console.warn(`Unknown mystery outcome: ${outcome}`);
        this.setPathNodeContext(PathNodeContext.BATTLE_NODE, PathNodeType.WILD_POKEMON);
        this.handleWildPokemonNode(node);
        break;
    }
  }

  private handleChallengeRewardNode(node: PathNode): void {
    const outcomes = [
      () => {
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 3, undefined, false, this.createReturnToBattlePathCallback(), PathNodeTypeFilter.MASTER_BALL_ITEMS));
      },
      () => {
        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 3, undefined, false, this.createReturnToBattlePathCallback(), PathNodeTypeFilter.ROGUE_BALL_ITEMS));
      },
      () => {
        const selectPermaPhase = new SelectPermaModifierPhase(this.scene, 0, undefined, this.createReturnToBattlePathCallback());
        this.scene.unshiftPhase(selectPermaPhase);
      }
    ];

    const selectedOutcome = outcomes[Utils.randSeedInt(outcomes.length)];
    selectedOutcome();
  }

  end(): void {
    if (this.scene.ui.getMode() === Mode.BATTLE_PATH) {
      this.scene.ui.setMode(Mode.MESSAGE);
    }
    super.end();
  }
} 