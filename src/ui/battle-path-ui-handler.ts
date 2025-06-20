import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Button } from "../enums/buttons";
import { addWindow } from "./ui-theme";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { getCurrentBattlePath, PathNodeType, getAvailablePathsFromWave, setupFixedBattlePaths, getDynamicModeLocalizedString, DynamicModes } from "../battle";
import { Type } from "../data/type";

interface NodePosition {
  x: number;
  y: number;
  node: any;
}

interface NodeSprite {
  key: string;
  frame?: string | number;
  scale?: number;
  flipX?: boolean;
}

export default class BattlePathUiHandler extends ModalUiHandler {
  private pathContainer: Phaser.GameObjects.Container;
  private scrollContainer: Phaser.GameObjects.Container;
  private legendContainer: Phaser.GameObjects.Container;
  private connectionsContainer: Phaser.GameObjects.Container;
  
  private currentWave: number = 1;
  private scrollPosition: number = 0;
  private readonly WAVES_VISIBLE = 6;
  private readonly WAVE_HEIGHT = 22;
  private readonly NODE_SIZE = 8;
  private readonly NODE_SPACING = 55;
  
  private readonly CONTAINER_WIDTH = 320;
  private readonly CONTAINER_HEIGHT = 170;
  private readonly MARGIN_TOP = 25;
  private readonly MARGIN_LEFT = 0;
  
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollPosition: number = 0;
  
  private nodeButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private nodePositions: Map<string, NodePosition> = new Map();
  private hoveredNode: string | null = null;
  
  private selectedNodeId: string | null = null;
  private currentRowIndex: number = 0;
  private currentColIndex: number = 0;
  private visibleWaves: Array<{ wave: number; nodes: any[] }> = [];

  private onNodeSelected: ((node: any) => void) | null = null;
  private viewOnlyMode: boolean = false;

  private pointermoveHandler: ((pointer: any) => void) | null = null;
  private pointerupHandler: (() => void) | null = null;

  private availableNodeIds: Set<string> = new Set();

  private customTooltipContainer: Phaser.GameObjects.Container | null = null;
  private customTooltipText: Phaser.GameObjects.Text | null = null;
  private tooltipScrollTween: Phaser.Tweens.Tween | null = null;

  private lastScrollTime: number = 0;
  private readonly SCROLL_THROTTLE_MS = 150;

  public refreshCurrentWave(): void {
    const newWave = this.scene.battlePathWave || 1;
    if (newWave !== this.currentWave) {
      const oldWave = this.currentWave;
      this.currentWave = newWave;
      this.loadBattlePath();
    }
  }

  constructor(scene: BattleScene) {
    super(scene, Mode.BATTLE_PATH);
  }

  getModalTitle(): string {
    if (this.viewOnlyMode) {
      return i18next.t("nodeMode:viewTitle", { defaultValue: "Battle Path Map" });
    }
    return i18next.t("nodeMode:selectTitle", { defaultValue: "Select Battle Path" });
  }

  getWidth(): number {
    return this.CONTAINER_WIDTH;
  }

  getHeight(): number {
    return this.CONTAINER_HEIGHT;
  }

  getMargin(): [number, number, number, number] {
    return [this.MARGIN_TOP, 0, 0, this.MARGIN_LEFT];
  }

  getButtonLabels(): string[] {
    return [];
  }

  setup(): void {
    super.setup();
    this.setupContainers();
  }

  show(args: any[]): boolean {
    if (this.active) {
      return false;
    }

    this.onNodeSelected = null;
    this.viewOnlyMode = false;
    
    if (args && args.length > 0 && args[0]) {
      if (typeof args[0].onNodeSelected === 'function') {
        this.onNodeSelected = args[0].onNodeSelected;
      }
      if (args[0].viewOnly === true) {
        this.viewOnlyMode = true;
      }
    }

    const config: ModalConfig = {
      buttonActions: []
    };

    if (super.show([config])) {
      this.currentWave = this.scene.battlePathWave || 1;
      
      this.ensureContainersExist();
      
      let battlePath = (this.scene as any).gameData?.battlePath;
      
      if (!battlePath) {
        console.log("No battle path found, generating one...");
        try {
          this.scene.gameData.resetBattlePathData();
          
          setupFixedBattlePaths(this.scene);
          battlePath = getCurrentBattlePath();
        } catch (error) {
          console.error("Failed to generate battle path:", error);
        }
      }
      
      if (!battlePath && this.viewOnlyMode) {
        this.showNoPathMessage();
        return true;
      }
      
      this.loadBattlePath();
      return true;
    }

    return false;
  }

  clear(): void {
    this.nodeButtons.clear();
    this.nodePositions.clear();
    this.hoveredNode = null;
    this.selectedNodeId = null;
    this.currentRowIndex = 0;
    this.currentColIndex = 0;
    this.visibleWaves = [];
    this.scrollPosition = 0;
    this.isDragging = false;
    this.onNodeSelected = null;
    
    this.hideCustomTooltip();
    
    if (this.pointermoveHandler) {
      this.scene.input.off('pointermove', this.pointermoveHandler);
      this.pointermoveHandler = null;
    }
    
    if (this.pointerupHandler) {
      this.scene.input.off('pointerup', this.pointerupHandler);
      this.pointerupHandler = null;
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.removeAll(true);
    }
    
    if (this.connectionsContainer) {
      this.connectionsContainer.removeAll(true);
    }
    
    if (this.legendContainer) {
      this.legendContainer.removeAll(true);
    }
    
    this.scene.ui.hideTooltip();
    
    super.clear();
  }

  private ensureContainersExist(): void {
    if (!this.pathContainer || !this.pathContainer.parentContainer) {
      this.setupContainers();
    }
  }

  private setupContainers(): void {
    const containerWidth = this.getWidth();
    const containerHeight = this.getHeight();

    if (!this.pathContainer || !this.pathContainer.parentContainer) {
      if (this.pathContainer) {
        this.pathContainer.destroy();
      }
      this.pathContainer = this.scene.add.container(5, 5);
      this.pathContainer.setName("pathContainer");
      this.modalContainer.add(this.pathContainer);
    }

    if (!this.connectionsContainer || !this.connectionsContainer.parentContainer) {
      if (this.connectionsContainer) {
        this.connectionsContainer.destroy();
      }
      this.connectionsContainer = this.scene.add.container(0, 0);
      this.connectionsContainer.setName("connectionsContainer");
      this.pathContainer.add(this.connectionsContainer);
    }

    if (!this.scrollContainer || !this.scrollContainer.parentContainer) {
      if (this.scrollContainer) {
        this.scrollContainer.destroy();
      }
      this.scrollContainer = this.scene.add.container(0, 0);
      this.scrollContainer.setName("scrollContainer");
      this.pathContainer.add(this.scrollContainer);
    }

    const legendY = containerHeight - 30;
    if (!this.legendContainer || !this.legendContainer.parentContainer) {
      if (this.legendContainer) {
        this.legendContainer.destroy();
      }
      this.legendContainer = this.scene.add.container(5, legendY);
      this.legendContainer.setName("legendContainer");
      this.modalContainer.add(this.legendContainer);
    }

    this.setupMouseDrag();
  }

  private loadBattlePath(): void {
    this.clearPath();
    
    let battlePath = (this.scene as any).gameData?.battlePath;
    if (!battlePath) {
      battlePath = getCurrentBattlePath();
    }
    
    if (!battlePath) {
      this.showNoPathMessage();
      return;
    }

    this.updateAvailableNodes();

    const baseWave = (this.currentWave - 1) + Math.floor(this.scrollPosition / this.WAVE_HEIGHT);
    const maxViewableWave = this.getMaxViewableWave();
    const waves = [];
    
    for (let i = this.WAVES_VISIBLE - 1; i >= 0; i--) {
      const wave = baseWave + i;
      if (wave <= Math.min(battlePath.totalWaves, maxViewableWave) && wave > 0) {
        waves.push(wave);
      }
    }

    this.visibleWaves = [];
    let yOffset = 10 - (this.scrollPosition % this.WAVE_HEIGHT);
    
    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      const nodesAtWave = battlePath.waveToNodeMap.get(wave) || [];
      this.visibleWaves.push({ wave, nodes: nodesAtWave });
      this.createWaveRow(wave, yOffset, battlePath);
      yOffset += this.WAVE_HEIGHT;
    }

    this.initializeSelection();
    this.drawConnections();
    this.updateSelection();
  }

  private createWaveRow(wave: number, yOffset: number, battlePath: any): void {
    const waveLabel = addTextObject(
      this.scene,
      5,
      yOffset + this.WAVE_HEIGHT / 2,
      `${wave}`,
      TextStyle.WINDOW,
      { fontSize: '40px', fontStyle: 'bold' }
    );
    waveLabel.setOrigin(0, 0.5);
    this.scrollContainer.add(waveLabel);

    const nodesAtWave = battlePath.waveToNodeMap.get(wave) || [];
    
    if (nodesAtWave.length === 0) {
      return;
    }

    const regularNodes = nodesAtWave.filter(n => n.nodeType !== PathNodeType.CONVERGENCE_POINT);
    const sortedNodes = [...regularNodes].sort((a, b) => a.position.x - b.position.x);
    
    this.validateWaveNodePositions(sortedNodes, wave);
    
    const availableWidth = this.CONTAINER_WIDTH - 60;
    const sectionWidth = availableWidth / 4;

    sortedNodes.forEach((node, index) => {
      const clampedPosition = Math.max(0, Math.min(3, node.position.x));
      const baseNodeX = 40 + (clampedPosition * sectionWidth) + (sectionWidth / 2);
      
      const adjustedNodeX = this.adjustNodeXForOverlaps(sortedNodes, index, baseNodeX, sectionWidth);
      
      this.createNodeButton(node, adjustedNodeX, yOffset, wave);
    });
  }

  private validateWaveNodePositions(nodes: any[], wave: number): boolean {
    const positions = nodes.map(n => n.position.x);
    const uniquePositions = new Set(positions);
    
    if (positions.length !== uniquePositions.size) {
      const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
      console.warn(`🎮 UI: Duplicate positions detected at wave ${wave}: [${duplicates.join(', ')}]`);
      
      const duplicateGroups = new Map<number, any[]>();
      nodes.forEach(node => {
        if (!duplicateGroups.has(node.position.x)) {
          duplicateGroups.set(node.position.x, []);
        }
        duplicateGroups.get(node.position.x)!.push(node);
      });
      
      duplicateGroups.forEach((group, position) => {
        if (group.length > 1) {
          console.warn(`  Position ${position}: ${group.map(n => PathNodeType[n.nodeType]).join(', ')}`);
        }
      });
      
      return false;
    }
    
    return true;
  }

  private adjustNodeXForOverlaps(nodes: any[], currentIndex: number, baseX: number, sectionWidth: number): number {
    const currentNode = nodes[currentIndex];
    const currentPosition = currentNode.position.x;
    
    const nodesAtSamePosition = nodes.filter(n => n.position.x === currentPosition);
    
    if (nodesAtSamePosition.length <= 1) {
      return baseX;
    }
    
    const indexInGroup = nodesAtSamePosition.findIndex(n => n.id === currentNode.id);
    const spacing = sectionWidth * 0.15;
    const totalWidth = (nodesAtSamePosition.length - 1) * spacing;
    const startOffset = -totalWidth / 2;
    
    const adjustedX = baseX + startOffset + (indexInGroup * spacing);
    
    console.log(`🔧 UI: Adjusting node ${currentNode.id} position from ${baseX} to ${adjustedX} (${indexInGroup + 1}/${nodesAtSamePosition.length})`);
    
    return adjustedX;
  }

  private createNodeButton(node: any, x: number, y: number, wave: number): void {
    const nodeContainer = this.scene.add.container(x, y + this.WAVE_HEIGHT / 2);
    
    const isActiveWave = wave === this.currentWave;
    const isAvailable = this.availableNodeIds.has(node.id);
    const nodeSize = isActiveWave ? this.NODE_SIZE : this.NODE_SIZE * 0.6;
    const iconSize = isActiveWave ? '40px' : '30px';
    const textSize = isActiveWave ? '50px' : '40px';
    const subtitleSize = isActiveWave ? '32px' : '24px';
    
    const previouslySelectedNode = this.getPreviouslySelectedNode();
    let nodeAlpha = 1.0;
    let shouldHideText = false;
    
    if (isActiveWave) {
      if (!this.viewOnlyMode && previouslySelectedNode && previouslySelectedNode.connections && !previouslySelectedNode.connections.includes(node.id)) {
        nodeAlpha = 0.5;
        shouldHideText = true;
      }
    } else if (wave < this.currentWave) {
      const selectedPath = this.scene.gameData?.selectedPath;
      if (!selectedPath || selectedPath !== node.id) {
        nodeAlpha = 0.5;
      }
    } else {
      if (this.viewOnlyMode) {
        shouldHideText = true;
      }
    }
    
    const iconConfig = this.getNodeIcon(node.nodeType, node);
    const icon = this.scene.add.sprite(0, 0, iconConfig.key, iconConfig.frame);
    icon.setOrigin(0.5, 0.5);
    
    if (iconConfig.scale !== undefined) {
      icon.setScale(iconConfig.scale);
    } else {
      icon.setScale(isActiveWave ? 0.35 : 0.3);
    }
    
    if (iconConfig.flipX) {
      icon.setFlipX(true);
    }
    
    if (node.dynamicMode && Object.values(node.dynamicMode).some(value => value)) {
      icon.setTint(0xff0000);
    }
    
    const nameText = addTextObject(
      this.scene,
      0,
      nodeSize / 2 + 2,
      this.getNodeTypeName(node.nodeType),
      TextStyle.WINDOW,
      { fontSize: textSize }
    );
    nameText.setOrigin(0.5, 0);
    const shouldShowText = this.viewOnlyMode ? this.shouldShowTextInViewMode(node) : (isActiveWave && !shouldHideText);
    nameText.setVisible(shouldShowText);
    
    const dynamicModeText = this.getDynamicModeSubtitle(node);
    let subtitleText = null;
    if (dynamicModeText) {
      const isRightEdge = x > this.CONTAINER_WIDTH - 60;
      const subtitleX = isRightEdge ? -10 : 10;
      
      subtitleText = addTextObject(
        this.scene,
        subtitleX,
        0,
        dynamicModeText,
        TextStyle.WINDOW,
        { fontSize: subtitleSize }
      );
      subtitleText.setOrigin(isRightEdge ? 1 : 0, 0.5);
      subtitleText.setVisible(false);
    }
    
    const battlePath = getCurrentBattlePath();
    if (battlePath) {
      let hasIncomingConnection = false;
      const firstWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));
      
      if (wave !== firstWave) {
        for (const [, prevNode] of battlePath.nodeMap) {
          if (prevNode.wave < wave && prevNode.connections.includes(node.id)) {
            hasIncomingConnection = true;
            break;
          }
        }
        
        if (!hasIncomingConnection) {
          const warningIcon = this.scene.add.sprite(
            nodeSize / 2 + 2,
            -nodeSize / 2 - 2,
            "smitems_192",
            "exclamationMark"
          );
          warningIcon.setOrigin(0.5, 0.5);
          warningIcon.setScale(0.6);
          nodeContainer.add(warningIcon);
        }
      }
    }
    
    const elements = [icon, nameText];
    if (subtitleText) {
      elements.push(subtitleText);
    }
    nodeContainer.add(elements);
    
    nodeContainer.setInteractive(
      new Phaser.Geom.Circle(0, 0, nodeSize),
      Phaser.Geom.Circle.Contains
    );
    
    nodeContainer.on('pointerover', () => {
      this.hoveredNode = node.id;
      this.showTooltip(node, x, y);
      
      if (!isActiveWave) {
        nodeContainer.setScale(1.2);
        nodeContainer.setAlpha(1.0);
        const showTextOnHover = this.viewOnlyMode ? this.shouldShowTextInViewMode(node, true) : !shouldHideText;
        nameText.setVisible(showTextOnHover);
        if (subtitleText) {
          subtitleText.setVisible(false);
        }
      }
    });
    
    nodeContainer.on('pointerout', () => {
      this.hoveredNode = null;
      this.scene.ui.hideTooltip();
      this.hideCustomTooltip();
      
      if (!isActiveWave) {
        nodeContainer.setScale(1.0);
        nodeContainer.setAlpha(nodeAlpha);
        const keepTextVisible = this.viewOnlyMode ? this.shouldShowTextInViewMode(node, false) : false;
        nameText.setVisible(keepTextVisible);
        if (subtitleText) {
          subtitleText.setVisible(false);
        }
      }
    });
    
    nodeContainer.on('pointerup', () => {
      if (this.viewOnlyMode) {
        return;
      }
      
      if (!this.isNodeSelectable(node)) {
        return;
      }
      
      this.selectedNodeId = node.id;
      for (let rowIdx = 0; rowIdx < this.visibleWaves.length; rowIdx++) {
        const wave = this.visibleWaves[rowIdx];
        const colIdx = wave.nodes.findIndex(n => n.id === node.id);
        if (colIdx !== -1) {
          this.currentRowIndex = rowIdx;
          this.currentColIndex = colIdx;
          break;
        }
      }
      this.updateSelection();
      this.selectNode(node);
    });
    
    nodeContainer.setAlpha(nodeAlpha);
    
    nodeContainer.setData('isActiveWave', isActiveWave);
    nodeContainer.setData('wave', wave);
    nodeContainer.setData('nodeId', node.id);
    nodeContainer.setData('hasSubtitle', !!subtitleText);
    nodeContainer.setData('hasDynamicMode', !!(node.dynamicMode && Object.values(node.dynamicMode).some(value => value)));
    nodeContainer.setData('shouldHideText', shouldHideText);
    nodeContainer.setData('baseAlpha', nodeAlpha);
    
    this.scrollContainer.add(nodeContainer);
    this.nodeButtons.set(node.id, nodeContainer);
    this.nodePositions.set(node.id, { x, y: y + this.WAVE_HEIGHT / 2, node });
  }

  private drawConnections(): void {
    this.connectionsContainer.removeAll(true);
    
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      console.log("No battle path available for drawing connections");
      return;
    }
    
    const visibleNodeIds = new Set<string>();
    for (const waveData of this.visibleWaves) {
      for (const node of waveData.nodes) {
        visibleNodeIds.add(node.id);
      }
    }
    
    let connectionsDrawn = 0;
    let invalidConnections = 0;
    
    for (const waveData of this.visibleWaves) {
      for (const currentNode of waveData.nodes) {
        const currentPos = this.nodePositions.get(currentNode.id);
        if (!currentPos) {
          continue;
        }
        
        if (!currentNode.connections || currentNode.connections.length === 0) {
          continue;
        }
        
        for (const connectionId of currentNode.connections) {
          if (!visibleNodeIds.has(connectionId)) {
            continue;
          }
          
          const targetNode = battlePath.nodeMap.get(connectionId);
          if (!targetNode) {
            console.warn(`🎮 UI: Target node ${connectionId} not found in battle path`);
            invalidConnections++;
            continue;
          }
          
          const targetPos = this.nodePositions.get(targetNode.id);
          if (targetPos) {
            const connectionValid = this.validateConnection(currentNode, targetNode);
            this.drawConnectionLine(currentPos, targetPos, connectionValid);
            connectionsDrawn++;
            
            if (!connectionValid) {
              invalidConnections++;
            }
          }
        }
      }
    }
    
    console.log(`🎮 UI: Drew ${connectionsDrawn} connections (${invalidConnections} invalid)`);
    
    if (connectionsDrawn === 0) {
      console.log("⚠️ UI: No connections drawn, trying fallback method...");
      this.drawFallbackConnections();
    }
  }

  private validateConnection(fromNode: any, toNode: any): boolean {
    if (fromNode.wave >= toNode.wave) {
      console.warn(`🎮 UI: Invalid connection - backwards or same wave: ${fromNode.id} -> ${toNode.id}`);
      return false;
    }
    
    const waveGap = toNode.wave - fromNode.wave;
    if (waveGap > 5) {
      console.warn(`🎮 UI: Suspicious connection - large wave gap (${waveGap}): ${fromNode.id} -> ${toNode.id}`);
      return false;
    }
    
    return true;
  }

  private drawConnectionLine(from: NodePosition, to: NodePosition, isValid: boolean = true): void {
    const graphics = this.scene.add.graphics();
    
    let lineColor: number;
    let lineAlpha: number;
    let lineWidth: number;
    
    if (!isValid) {
      lineColor = 0xff0000;
      lineAlpha = 0.7;
      lineWidth = 2;
    } else {
      lineColor = 0x6688aa;
      lineAlpha = 0.5;
      lineWidth = 1;
    }
    
    const dashLength = isValid ? 3 : 2;
    const gapLength = isValid ? 1 : 2;
    
    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;
    
    const totalDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const numDashes = Math.floor(totalDistance / (dashLength + gapLength));
    
    graphics.lineStyle(lineWidth, lineColor, lineAlpha);
    
    if (!isValid) {
      graphics.lineStyle(lineWidth, lineColor, lineAlpha);
      graphics.beginPath();
      graphics.moveTo(startX, startY);
      graphics.lineTo(endX, endY);
      graphics.strokePath();
    } else {
      for (let i = 0; i < numDashes; i++) {
        const t1 = (i * (dashLength + gapLength)) / totalDistance;
        const t2 = ((i * (dashLength + gapLength)) + dashLength) / totalDistance;
        
        if (t2 > 1) break;
        
        const x1 = startX + (endX - startX) * t1;
        const y1 = startY + (endY - startY) * t1;
        const x2 = startX + (endX - startX) * t2;
        const y2 = startY + (endY - startY) * t2;
        
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
      }
    }
    
    this.connectionsContainer.add(graphics);
  }

  private selectNode(node: any): void {
    if (this.onNodeSelected) {
      this.onNodeSelected(node);
    }
  }

  private showTooltip(node: any, x: number, y: number): void {
    let tooltipText = this.getNodeDescription(node.nodeType);
    
    if (node.dynamicMode) {
      let modeDescriptions = this.getDynamicModeDescriptions(node.dynamicMode);

      
      if (modeDescriptions.length > 0) {
        modeDescriptions.forEach(mode => {
          tooltipText += `\n• ${mode.name}: `;
          if (mode.description && mode.description !== mode.name) {
            tooltipText += mode.description.length + mode.name.length > 60  ? `\n${mode.description}\n` : `${mode.description}\n`;
          }
        });
        
        if (node.dynamicMode.typeExtraDamage !== undefined || node.dynamicMode.pokemonNerf !== undefined) {
          const playerParty = this.scene.getParty().filter(p => !p.isFainted());
          
          if (playerParty.length > 0) {
            const strongestPokemon = playerParty.reduce((strongest, current) => {
              const strongestTotal = strongest.stats.reduce((sum, stat) => sum + stat, 0);
              const currentTotal = current.stats.reduce((sum, stat) => sum + stat, 0);
              return currentTotal > strongestTotal ? current : strongest;
            });
            
            if (node.dynamicMode.typeExtraDamage) {
              const primaryType = strongestPokemon.getTypes()[0];
              node.dynamicMode.typeExtraDamage = primaryType;
              const localizationResult = getDynamicModeLocalizedString(DynamicModes.TYPE_EXTRA_DAMAGE);
              tooltipText += `\n• ${localizationResult?.name || 'Type Extra Damage'}: 1.5x DMG to ${Type[primaryType]}\n`;
            }
            
            if (node.dynamicMode.pokemonNerf) {
              node.dynamicMode.pokemonNerf = strongestPokemon.species.speciesId;
              const localizationResult = getDynamicModeLocalizedString(DynamicModes.POKEMON_NERF);
              tooltipText += `\n• ${localizationResult?.name || 'Pokemon Nerf'}: ${strongestPokemon.name} will deal half damage`;
            }
          } else {
            tooltipText += `\n\nNo available Pokemon to target`;
          }
        }
      }
      
      this.showCustomTooltip(tooltipText, x, y, modeDescriptions.length);
    } else {
      this.scene.ui.showTooltip(null, tooltipText, true);
    }
  }

  private getDynamicModeDescriptions(dynamicMode: any): Array<{name: string, description: string}> {
    const modeDescriptions: Array<{name: string, description: string}> = [];
    
    const modeMap: { [key: string]: DynamicModes } = {
      'isNuzlocke': DynamicModes.IS_NUZLOCKE,
      'isNuzlight': DynamicModes.IS_NUZLIGHT,
      'isNightmare': DynamicModes.IS_NIGHTMARE,
      'noExpGain': DynamicModes.NO_EXP_GAIN,
      'noCatch': DynamicModes.NO_CATCH,
      'hasPassiveAbility': DynamicModes.HAS_PASSIVE_ABILITY,
      'invertedTypes': DynamicModes.INVERTED_TYPES,
      'boostedTrainer': DynamicModes.BOOSTED_TRAINER,
      'multiLegendaries': DynamicModes.MULTI_LEGENDARIES,
      'multiBoss': DynamicModes.MULTI_BOSS,
      'noInitialSwitch': DynamicModes.NO_INITIAL_SWITCH,
      'autoPressured': DynamicModes.AUTO_PRESSURED,
      'noStatBoosts': DynamicModes.NO_STAT_BOOSTS,
      'noStatusMoves': DynamicModes.NO_STATUS_MOVES,
      'noPhysicalMoves': DynamicModes.NO_PHYSICAL_MOVES,
      'noSpecialMoves': DynamicModes.NO_SPECIAL_MOVES,
      'statSwap': DynamicModes.STAT_SWAP,
      'noSTAB': DynamicModes.NO_STAB,
      'trickRoom': DynamicModes.TRICK_ROOM,
      'noSwitch': DynamicModes.NO_SWITCH,
      'noResistances': DynamicModes.NO_RESISTANCES,
      'noHealingItems': DynamicModes.NO_HEALING_ITEMS,
      'autoTorment': DynamicModes.AUTO_TORMENT,
      'legendaryNerf': DynamicModes.LEGENDARY_NERF,
      'typeExtraDamage': DynamicModes.TYPE_EXTRA_DAMAGE,
      'pokemonNerf': DynamicModes.POKEMON_NERF
    };
    
    for (const [modeKey, value] of Object.entries(dynamicMode)) {
      if (value && modeMap[modeKey] && modeKey !== 'typeExtraDamage' && modeKey !== 'pokemonNerf') {
        const localizationResult = getDynamicModeLocalizedString(modeMap[modeKey]);
        if (localizationResult) {
          modeDescriptions.push({
            name: localizationResult.name,
            description: localizationResult.description
          });
        }
      }
    }
    true
    return modeDescriptions;
  }

  private showCustomTooltip(tooltipText: string, x: number, y: number, challengeCount: number): void {
    this.hideCustomTooltip();
    
    const tooltipWidth = 1200;
    const tooltipHeight = challengeCount > 6 ? 1000 : challengeCount > 3 ? 500 : 250;
    const showManyLines = challengeCount > 6;
    const padding = 16;
    
    const screenWidth = this.scene.cameras.main.width;
    const nodeScreenX = x + this.pathContainer.x + this.modalContainer.x;
    
    let tooltipX: number;
    let tooltipY: number;
    
    if (nodeScreenX > screenWidth / 2) {
      tooltipX = nodeScreenX - tooltipWidth - 20;
    } else {
      tooltipX = nodeScreenX + 50;
    }
    
    tooltipY = Math.max(20, Math.min(this.scene.cameras.main.height - tooltipHeight - 20, y + this.pathContainer.y + this.modalContainer.y - tooltipHeight / 2));
    let tooltipYPosition = showManyLines ? tooltipY + tooltipHeight / 2 : this.scene.cameras.main.height / 2;

    this.customTooltipContainer = this.scene.add.container(tooltipX + tooltipWidth / 2, tooltipYPosition);
    this.customTooltipContainer.setDepth(1000);
    
    const tooltipBg = addWindow(this.scene, -tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight);
    this.customTooltipContainer.add(tooltipBg);

    
    this.customTooltipText = addTextObject(
      this.scene,
      -tooltipWidth / 2 + padding,
      -tooltipHeight / 2 + padding,
      tooltipText,
      TextStyle.WINDOW,
      { 
        fontSize: '300px'
      }
    );
    this.customTooltipText.setOrigin(0, 0);
    this.customTooltipContainer.add(this.customTooltipText);
    
    const textMaskRect = this.scene.make.graphics({});
    textMaskRect.fillStyle(0xFFFFFF);
    textMaskRect.beginPath();
    textMaskRect.fillRect(
      this.customTooltipContainer.x - tooltipWidth / 2 + padding,
      this.customTooltipContainer.y - tooltipHeight / 2 + padding,
      tooltipWidth - padding * 2,
      tooltipHeight - padding * 2
    );
    
    const textMask = textMaskRect.createGeometryMask();
    this.customTooltipText.setMask(textMask);
    
    const textLineHeight = 16;
    const visibleLines = Math.floor((tooltipHeight - padding * 2) / textLineHeight);
    const totalLines = Math.ceil(this.customTooltipText.displayHeight / textLineHeight);
    
    if (totalLines > visibleLines) {
      this.startTooltipScrolling(totalLines, visibleLines, textLineHeight, showManyLines);
    }
  }

  private startTooltipScrolling(totalLines: number, visibleLines: number, lineHeight: number, showManyLines: boolean = false): void {
    if (this.tooltipScrollTween) {
      this.tooltipScrollTween.remove();
      this.tooltipScrollTween = null;
    }
    
    if (!this.customTooltipText) {
      return;
    }
    
    const scrollDistance = (totalLines - visibleLines) * lineHeight;
    const initialY = this.customTooltipText.y;
    
    this.tooltipScrollTween = this.scene.tweens.add({
      targets: this.customTooltipText,
      delay: Utils.fixedInt(showManyLines ? 7000 : 3500),
      loop: -1,
      hold: Utils.fixedInt(showManyLines ? 10000 : 5000),
      duration: Utils.fixedInt(scrollDistance * 15),
      y: initialY - scrollDistance,
      ease: 'Linear',
      yoyo: false,
      onComplete: () => {
        if (this.customTooltipText) {
          this.customTooltipText.setY(initialY);
        }
      }
    });
  }

  private hideCustomTooltip(): void {
    if (this.tooltipScrollTween) {
      this.tooltipScrollTween.remove();
      this.tooltipScrollTween = null;
    }
    
    if (this.customTooltipContainer) {
      this.customTooltipContainer.destroy();
      this.customTooltipContainer = null;
    }
    
    this.customTooltipText = null;
  }

  private getNodeDescription(nodeType: PathNodeType): string {
    const descriptionKeys = {
      [PathNodeType.WILD_POKEMON]: "wildPokemon",
      [PathNodeType.TRAINER_BATTLE]: "trainerBattle",
      [PathNodeType.RIVAL_BATTLE]: "rivalBattle",
      [PathNodeType.MAJOR_BOSS_BATTLE]: "majorBossBattle",
      [PathNodeType.RECOVERY_BOSS]: "recoveryBoss",
      [PathNodeType.EVIL_BOSS_BATTLE]: "evilBossBattle",
      [PathNodeType.ELITE_FOUR]: "eliteFour",
      [PathNodeType.CHAMPION]: "champion",
      [PathNodeType.ITEM_GENERAL]: "itemGeneral",
      [PathNodeType.ADD_POKEMON]: "addPokemon",
      [PathNodeType.ITEM_TM]: "itemTm",
      [PathNodeType.ITEM_BERRY]: "itemBerry",
      [PathNodeType.MYSTERY_NODE]: "mysteryNode",
      [PathNodeType.CONVERGENCE_POINT]: "convergencePoint",
      [PathNodeType.SMITTY_BATTLE]: "smittyBattle",
      [PathNodeType.EVIL_GRUNT_BATTLE]: "evilGruntBattle",
      [PathNodeType.EVIL_ADMIN_BATTLE]: "evilAdminBattle",
      [PathNodeType.RAND_PERMA_ITEM]: "randPermaItem",
      [PathNodeType.PERMA_ITEMS]: "permaItems",
      [PathNodeType.GOLDEN_POKEBALL]: "goldenPokeball",
      [PathNodeType.ROGUE_BALL_ITEMS]: "rogueBallItems",
      [PathNodeType.MASTER_BALL_ITEMS]: "masterBallItems",
      [PathNodeType.ABILITY_SWITCHERS]: "abilitySwitchers",
      [PathNodeType.STAT_SWITCHERS]: "statSwitchers",
      [PathNodeType.GLITCH_PIECE]: "glitchPiece",
      [PathNodeType.DNA_SPLICERS]: "dnaSplicers",
      [PathNodeType.MONEY]: "money",
      [PathNodeType.PERMA_MONEY]: "permaMoney",
      [PathNodeType.RELEASE_ITEMS]: "releaseItems",
      [PathNodeType.MINTS]: "mints",
      [PathNodeType.EGG_VOUCHER]: "eggVoucher",
      [PathNodeType.PP_MAX]: "ppMax",
      [PathNodeType.COLLECTED_TYPE]: "collectedType",
      [PathNodeType.EXP_SHARE]: "expShare",
      [PathNodeType.TYPE_SWITCHER]: "typeSwitcher",
      [PathNodeType.PASSIVE_ABILITY]: "passiveAbility",
      [PathNodeType.ANY_TMS]: "anyTms",
      [PathNodeType.CHALLENGE_BOSS]: "challengeBoss",
      [PathNodeType.CHALLENGE_RIVAL]: "challengeRival",
      [PathNodeType.CHALLENGE_EVIL_BOSS]: "challengeEvilBoss",
      [PathNodeType.CHALLENGE_CHAMPION]: "challengeChampion",
      [PathNodeType.CHALLENGE_REWARD]: "challengeReward"
    };
    
    const key = descriptionKeys[nodeType];
    if (key) {
      return i18next.t(`nodeMode:descriptions.${key}`);
    }
    return i18next.t("nodeMode:unknownEncounter");
  }

  private initializeSelection(): void {
    if (this.visibleWaves.length > 0) {
      if (this.viewOnlyMode && this.scene.gameData?.selectedPath) {
        const selectedPath = this.scene.gameData.selectedPath;
        
        for (let i = 0; i < this.visibleWaves.length; i++) {
          const wave = this.visibleWaves[i];
          const nodeIndex = wave.nodes.findIndex(node => node.id === selectedPath);
          if (nodeIndex !== -1) {
            this.currentRowIndex = i;
            this.currentColIndex = nodeIndex;
            this.selectedNodeId = selectedPath;
            this.updateSelection();
            return;
          }
        }
      }
      
      let currentWaveRowIndex = -1;
      for (let i = 0; i < this.visibleWaves.length; i++) {
        if (this.visibleWaves[i].wave === this.currentWave) {
          currentWaveRowIndex = i;
          break;
        }
      }
      
      if (currentWaveRowIndex !== -1) {
        const currentWave = this.visibleWaves[currentWaveRowIndex];
        if (currentWave.nodes.length > 0) {
          this.currentRowIndex = currentWaveRowIndex;
          
          const connectedNodeIndex = this.findFirstConnectedNode(currentWave.nodes);
          if (connectedNodeIndex !== -1) {
            this.currentColIndex = connectedNodeIndex;
            this.selectedNodeId = currentWave.nodes[connectedNodeIndex].id;
          } else {
            this.currentColIndex = 0;
            this.selectedNodeId = currentWave.nodes[0].id;
          }
          this.updateSelection();
          return;
        }
      }
      
      for (let i = 0; i < this.visibleWaves.length; i++) {
        const wave = this.visibleWaves[i];
        if (wave.nodes.length > 0) {
          this.currentRowIndex = i;
          this.currentColIndex = 0;
          this.selectedNodeId = wave.nodes[0].id;
          this.updateSelection();
          break;
        }
      }
    }
  }

  private updateSelection(): void {
    this.hideCustomTooltip();
    
    this.nodeButtons.forEach((container, nodeId) => {
      const isSelected = nodeId === this.selectedNodeId;
      const isActiveWave = container.getData('isActiveWave');
      const hasSubtitle = container.getData('hasSubtitle');
      const hasDynamicMode = container.getData('hasDynamicMode');
      const shouldHideText = container.getData('shouldHideText') || false;
      const baseAlpha = container.getData('baseAlpha') || 1.0;
      const isAvailable = this.availableNodeIds.has(nodeId);
      
      const icon = container.list[0] as Phaser.GameObjects.Sprite;
      const nameText = container.list[1] as Phaser.GameObjects.Text;
      const subtitleText = hasSubtitle ? container.list[2] as Phaser.GameObjects.Text : null;
      
      if (isSelected) {
        container.setScale(1.4);
        container.setAlpha(1.0);
        if (hasDynamicMode) {
          icon.setTint(0xff0000);
        } else {
          icon.clearTint();
        }
        const nodePosition = this.nodePositions.get(nodeId);
        const showSelectedText = this.viewOnlyMode && nodePosition ? this.shouldShowTextInViewMode(nodePosition.node, true) : !shouldHideText;
        nameText.setVisible(showSelectedText);
        if (subtitleText) {
          subtitleText.setVisible(false);
        }
        
        if (nodePosition && nodePosition.node.dynamicMode) {
          this.showTooltip(nodePosition.node, nodePosition.x, nodePosition.y);
        }
      } else {
        container.setScale(isActiveWave ? 1.0 : 1.0);
        container.setAlpha(baseAlpha);
        if (hasDynamicMode) {
          icon.setTint(0xff0000);
        } else {
          icon.clearTint();
        }
        const nodePosition = this.nodePositions.get(nodeId);
        const showUnselectedText = this.viewOnlyMode && nodePosition ? this.shouldShowTextInViewMode(nodePosition.node, false) : (isActiveWave && !shouldHideText);
        nameText.setVisible(showUnselectedText);
        if (subtitleText) {
          subtitleText.setVisible(false);
        }
      }
    });
  }

  private clearPath(): void {
    this.nodeButtons.clear();
    this.nodePositions.clear();
    this.scrollContainer.removeAll(true);
    this.connectionsContainer.removeAll(true);
  }

  private showNoPathMessage(): void {
    const messageText = addTextObject(
      this.scene,
      this.getWidth() / 2,
      this.getHeight() / 2 - 20,
      i18next.t("nodeMode:noPathMessage"),
      TextStyle.WINDOW,
      { 
        fontSize: '12px',
        align: 'center'
      }
    );
    messageText.setOrigin(0.5, 0.5);
    this.scrollContainer.add(messageText);
  }

  private getNodeIcon(nodeType: PathNodeType, node?: any): NodeSprite {
    switch (nodeType) {
      case PathNodeType.WILD_POKEMON: return { key: "pokemon_icons_1", frame: "25", scale: 0.35 };
      case PathNodeType.TRAINER_BATTLE: return { key: "unknown_m", frame: "0001", scale: 0.15 };
      case PathNodeType.RIVAL_BATTLE: return { key: "smitems_192", frame: "permaPostBattleMoney", scale: 0.06 };
      case PathNodeType.MAJOR_BOSS_BATTLE: return { key: "items", frame: "cornerstone_mask", scale: 0.35 };
      case PathNodeType.RECOVERY_BOSS: return { key: "items", frame: "hearthflame_mask", scale: 0.35 };
      case PathNodeType.EVIL_BOSS_BATTLE: return { key: "smitems_192", frame: "smittyMask", scale: 0.0525 };
      case PathNodeType.ELITE_FOUR: return { key: "items", frame: "muscle_band", scale: 0.35 };
      case PathNodeType.CHAMPION: return { key: "items", frame: "kings_rock", scale: 0.35 };
      case PathNodeType.ITEM_GENERAL: return { key: "smitems_192", frame: "permaShowRewards", scale: 0.06 };
      case PathNodeType.ADD_POKEMON: return { key: "smitems_192", frame: "draftMode", scale: 0.06 };
      case PathNodeType.ITEM_TM: return { key: "items", frame: "tm_normal", scale: 0.32 };
      case PathNodeType.ITEM_BERRY: return { key: "items", frame: "sitrus_berry", scale: 0.35 };
      case PathNodeType.MYSTERY_NODE: return { key: "smitems_192", frame: "permaMoreRewardChoice", scale: 0.0525 };
      case PathNodeType.CONVERGENCE_POINT: return { key: "smitems_192", frame: "permaMoreRewardChoice", scale: 0.0525 };
      case PathNodeType.SMITTY_BATTLE: return this.getSmittyTrainerSprite(node);
      case PathNodeType.EVIL_GRUNT_BATTLE: return { key: "items", frame: "thick_club", scale: 0.35 };
      case PathNodeType.EVIL_ADMIN_BATTLE: return { key: "items", frame: "malicious_armor", scale: 0.35 };
      case PathNodeType.RAND_PERMA_ITEM: return { key: "smitems_192", frame: "glitchModSoul", scale: 0.0525 };
      case PathNodeType.PERMA_ITEMS: return { key: "smitems_192", frame: "permaTrainerSnatchCost", scale: 0.0525 };
      case PathNodeType.GOLDEN_POKEBALL: return { key: "items", frame: "pb_gold", scale: 0.35 };
      case PathNodeType.ROGUE_BALL_ITEMS: return { key: "items", frame: "rb", scale: 0.35 };
      case PathNodeType.MASTER_BALL_ITEMS: return { key: "items", frame: "mb", scale: 0.35 };
      case PathNodeType.ABILITY_SWITCHERS: return { key: "smitems_192", frame: "glitchAbilitySwitch", scale: 0.0525 };
      case PathNodeType.STAT_SWITCHERS: return { key: "smitems_192", frame: "glitchStatSwitch", scale: 0.06 };
      case PathNodeType.GLITCH_PIECE: return { key: "smitems_192", frame: "glitchPiece", scale: 0.045 };
      case PathNodeType.DNA_SPLICERS: return { key: "items", frame: "dna_splicers", scale: 0.4 };
      case PathNodeType.MONEY: return { key: "smitems_192", frame: "battleMoney", scale: 0.0525 };
      case PathNodeType.PERMA_MONEY: return { key: "smitems_192", frame: "permaMoney", scale: 0.0525 };
      case PathNodeType.RELEASE_ITEMS: return { key: "smitems_192", frame: "modPokeSacrifice", scale: 0.0525 };
      case PathNodeType.MINTS: return { key: "items", frame: "mint_neutral", scale: 0.35 };
      case PathNodeType.EGG_VOUCHER: return { key: "items", frame: "coupon", scale: 0.35 };
      case PathNodeType.PP_MAX: return { key: "items", frame: "pp_max", scale: 0.35 };
      case PathNodeType.COLLECTED_TYPE: return { key: "smitems_192", frame: "modSoulCollected", scale: 0.0525 };
      case PathNodeType.EXP_SHARE: return { key: "items", frame: "exp_share", scale: 0.35 };
      case PathNodeType.TYPE_SWITCHER: return { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.0525 };
      case PathNodeType.PASSIVE_ABILITY: return { key: "smitems_192", frame: "modPassiveAbility", scale: 0.0525 };
      case PathNodeType.ANY_TMS: return { key: "smitems_192", frame: "glitchTm", scale: 0.0525 };
      case PathNodeType.CHALLENGE_BOSS: return { key: "smitems_192", frame: "glitchCommandSeal", scale: 0.0525 };
      case PathNodeType.CHALLENGE_RIVAL: return { key: "smitems_192", frame: "glitchCommandSeal", scale: 0.0525 };
      case PathNodeType.CHALLENGE_EVIL_BOSS: return { key: "smitems_192", frame: "glitchCommandSeal", scale: 0.0525 };
      case PathNodeType.CHALLENGE_CHAMPION: return { key: "smitems_192", frame: "glitchCommandSeal", scale: 0.0525 };
      case PathNodeType.CHALLENGE_REWARD: return { key: "items", frame: "master_ribbon", scale: 0.35 };
      default: return { key: "smitems_192", frame: "permaMoreRewardChoice", scale: 0.0525 };
    }
  }

  private getSmittyTrainerSprite(node?: any): NodeSprite {
    let variantIndex = 0;
    if (node && node.metadata && node.metadata.smittyVariantIndex !== undefined) {
      variantIndex = node.metadata.smittyVariantIndex;
    }
    
    const frameNumber = (variantIndex + 1).toString();
    
    return { key: "smitty_trainers", frame: frameNumber, scale: 0.15 };
  }

  private getNodeTypeName(nodeType: PathNodeType): string {
    const nameKeys = {
      [PathNodeType.WILD_POKEMON]: "wildPokemon",
      [PathNodeType.TRAINER_BATTLE]: "trainerBattle",
      [PathNodeType.RIVAL_BATTLE]: "rivalBattle",
      [PathNodeType.MAJOR_BOSS_BATTLE]: "majorBossBattle",
      [PathNodeType.RECOVERY_BOSS]: "recoveryBoss",
      [PathNodeType.EVIL_BOSS_BATTLE]: "evilBossBattle",
      [PathNodeType.ELITE_FOUR]: "eliteFour",
      [PathNodeType.CHAMPION]: "champion",
      [PathNodeType.ITEM_GENERAL]: "itemGeneral",
      [PathNodeType.ADD_POKEMON]: "addPokemon",
      [PathNodeType.ITEM_TM]: "itemTm",
      [PathNodeType.ITEM_BERRY]: "itemBerry",
      [PathNodeType.MYSTERY_NODE]: "mysteryNode",
      [PathNodeType.CONVERGENCE_POINT]: "convergencePoint",
      [PathNodeType.SMITTY_BATTLE]: "smittyBattle",
      [PathNodeType.EVIL_GRUNT_BATTLE]: "evilGruntBattle",
      [PathNodeType.EVIL_ADMIN_BATTLE]: "evilAdminBattle",
      [PathNodeType.RAND_PERMA_ITEM]: "randPermaItem",
      [PathNodeType.PERMA_ITEMS]: "permaItems",
      [PathNodeType.GOLDEN_POKEBALL]: "goldenPokeball",
      [PathNodeType.ROGUE_BALL_ITEMS]: "rogueBallItems",
      [PathNodeType.MASTER_BALL_ITEMS]: "masterBallItems",
      [PathNodeType.ABILITY_SWITCHERS]: "abilitySwitchers",
      [PathNodeType.STAT_SWITCHERS]: "statSwitchers",
      [PathNodeType.GLITCH_PIECE]: "glitchPiece",
      [PathNodeType.DNA_SPLICERS]: "dnaSplicers",
      [PathNodeType.MONEY]: "money",
      [PathNodeType.PERMA_MONEY]: "permaMoney",
      [PathNodeType.RELEASE_ITEMS]: "releaseItems",
      [PathNodeType.MINTS]: "mints",
      [PathNodeType.EGG_VOUCHER]: "eggVoucher",
      [PathNodeType.PP_MAX]: "ppMax",
      [PathNodeType.COLLECTED_TYPE]: "collectedType",
      [PathNodeType.EXP_SHARE]: "expShare",
      [PathNodeType.TYPE_SWITCHER]: "typeSwitcher",
      [PathNodeType.PASSIVE_ABILITY]: "passiveAbility",
      [PathNodeType.ANY_TMS]: "anyTms",
      [PathNodeType.CHALLENGE_BOSS]: "challengeBoss",
      [PathNodeType.CHALLENGE_RIVAL]: "challengeRival",
      [PathNodeType.CHALLENGE_EVIL_BOSS]: "challengeEvilBoss",
      [PathNodeType.CHALLENGE_CHAMPION]: "challengeChampion",
      [PathNodeType.CHALLENGE_REWARD]: "challengeReward"
    };
    
    const key = nameKeys[nodeType];
    if (key) {
      return i18next.t(`nodeMode:names.${key}`);
    }
    return i18next.t("nodeMode:unknownNode");
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    switch (button) {
      case Button.ACTION:
        if (this.selectedNodeId) {
          if (this.viewOnlyMode) {
            return true;
          }
          
          const nodePos = this.nodePositions.get(this.selectedNodeId);
          if (!nodePos || !this.isNodeSelectable(nodePos.node)) {
            return true;
          }
          
          this.selectNode(nodePos.node);
          return true;
        }
        break;
      case Button.UP:
        return this.navigateUp();
      case Button.DOWN:
        return this.navigateDown();
      case Button.LEFT:
        return this.navigateLeft();
      case Button.RIGHT:
        return this.navigateRight();
      case Button.CANCEL:
        if (this.onNodeSelected) {
          return true;
        }
        this.clear();
        this.scene.ui.revertMode();
        return true;
    }

    return false;
  }

  private navigateUp(): boolean {
    if (this.currentRowIndex > 0) {
      const targetWave = this.visibleWaves[this.currentRowIndex - 1];
      if (targetWave.nodes.length > 0) {
        const currentNode = this.getCurrentNode();
        let targetNodeIndex = -1;
        let bestScore = -1;
        
        if (currentNode) {
          const currentNodeX = currentNode.position.x;
          const connectedNodes = [];
          
          for (let i = 0; i < targetWave.nodes.length; i++) {
            const targetNode = targetWave.nodes[i];
            if (targetNode.connections && targetNode.connections.includes(currentNode.id)) {
              connectedNodes.push({ node: targetNode, index: i });
            }
          }
          
          if (connectedNodes.length > 0) {
            for (const { node: targetNode, index } of connectedNodes) {
              const targetNodeX = targetNode.position.x;
              const positionDistance = Math.abs(currentNodeX - targetNodeX);
              
              let score = 100;
              if (positionDistance === 0) {
                score = 1000;
              } else if (positionDistance === 1) {
                score = 500;
              } else {
                score = 100 - (positionDistance * 10);
              }
              
              const indexDistance = Math.abs(index - this.currentColIndex);
              score -= indexDistance;
              
              if (score > bestScore) {
                bestScore = score;
                targetNodeIndex = index;
              }
            }
          }
        }
        
        if (targetNodeIndex === -1) {
          const currentNode = this.getCurrentNode();
          if (currentNode) {
            const currentNodeX = currentNode.position.x;
            let bestPositionScore = -1;
            
            for (let i = 0; i < targetWave.nodes.length; i++) {
              const targetNode = targetWave.nodes[i];
              const targetNodeX = targetNode.position.x;
              const positionDistance = Math.abs(currentNodeX - targetNodeX);
              
              let score = 100;
              if (positionDistance === 0) {
                score = 1000;
              } else if (positionDistance === 1) {
                score = 500;
              } else {
                score = 100 - (positionDistance * 10);
              }
              
              if (score > bestPositionScore) {
                bestPositionScore = score;
                targetNodeIndex = i;
              }
            }
          }
          
          if (targetNodeIndex === -1) {
            targetNodeIndex = Math.min(this.currentColIndex, targetWave.nodes.length - 1);
          }
        }
        
        this.currentRowIndex--;
        this.currentColIndex = targetNodeIndex;
        this.selectedNodeId = targetWave.nodes[this.currentColIndex].id;
        this.updateSelection();
        this.scene.ui.playSelect();
        return true;
      }
    } else {
      const battlePath = getCurrentBattlePath();
      if (battlePath) {
        const maxViewableWave = this.getMaxViewableWave();
        const effectiveMaxWave = Math.min(battlePath.totalWaves, maxViewableWave);
        const currentBaseWave = this.currentWave - 1;
        const maxScrollableWave = effectiveMaxWave - this.WAVES_VISIBLE + 1;
        const maxScrollFromCurrent = Math.max(0, maxScrollableWave - currentBaseWave);
        const maxScroll = maxScrollFromCurrent * this.WAVE_HEIGHT;
        
        const currentTime = Date.now();
        const timeSinceLastScroll = currentTime - (this.lastScrollTime || 0);
        
        if (this.scrollPosition < maxScroll && timeSinceLastScroll >= 150) {
          this.lastScrollTime = currentTime;
          this.scroll(1);
          this.scene.ui.playSelect();
          return true;
        }
      }
    }
    return false;
  }

  private navigateDown(): boolean {
    if (this.currentRowIndex < this.visibleWaves.length - 1) {
      const targetWave = this.visibleWaves[this.currentRowIndex + 1];
      if (targetWave.nodes.length > 0) {
        const currentNode = this.getCurrentNode();
        let targetNodeIndex = -1;
        let bestScore = -1;
        
        if (currentNode && currentNode.connections) {
          const currentNodeX = currentNode.position.x;
          const connectedNodes = [];
          
          for (let i = 0; i < targetWave.nodes.length; i++) {
            const targetNode = targetWave.nodes[i];
            if (currentNode.connections.includes(targetNode.id)) {
              connectedNodes.push({ node: targetNode, index: i });
            }
          }
          
          if (connectedNodes.length > 0) {
            for (const { node: targetNode, index } of connectedNodes) {
              const targetNodeX = targetNode.position.x;
              const positionDistance = Math.abs(currentNodeX - targetNodeX);
              
              let score = 100;
              if (positionDistance === 0) {
                score = 1000;
              } else if (positionDistance === 1) {
                score = 500;
              } else {
                score = 100 - (positionDistance * 10);
              }
              
              const indexDistance = Math.abs(index - this.currentColIndex);
              score -= indexDistance;
              
              if (score > bestScore) {
                bestScore = score;
                targetNodeIndex = index;
              }
            }
          }
        }
        
        if (targetNodeIndex === -1) {
          const currentNode = this.getCurrentNode();
          if (currentNode) {
            const currentNodeX = currentNode.position.x;
            let bestPositionScore = -1;
            
            for (let i = 0; i < targetWave.nodes.length; i++) {
              const targetNode = targetWave.nodes[i];
              const targetNodeX = targetNode.position.x;
              const positionDistance = Math.abs(currentNodeX - targetNodeX);
              
              let score = 100;
              if (positionDistance === 0) {
                score = 1000;
              } else if (positionDistance === 1) {
                score = 500;
              } else {
                score = 100 - (positionDistance * 10);
              }
              
              if (score > bestPositionScore) {
                bestPositionScore = score;
                targetNodeIndex = i;
              }
            }
          }
          
          if (targetNodeIndex === -1) {
            targetNodeIndex = Math.min(this.currentColIndex, targetWave.nodes.length - 1);
          }
        }
        
        this.currentRowIndex++;
        this.currentColIndex = targetNodeIndex;
        this.selectedNodeId = targetWave.nodes[this.currentColIndex].id;
        this.updateSelection();
        this.scene.ui.playSelect();
        return true;
      }
    } else {
      const currentTime = Date.now();
      const timeSinceLastScroll = currentTime - (this.lastScrollTime || 0);
      
      if (timeSinceLastScroll >= 150) {
        this.lastScrollTime = currentTime;
        this.scroll(-1);
        this.scene.ui.playSelect();
        return true;
      }
    }
    return false;
  }

  private navigateLeft(): boolean {
    if (this.currentColIndex > 0) {
      this.currentColIndex--;
      const currentWave = this.visibleWaves[this.currentRowIndex];
      this.selectedNodeId = currentWave.nodes[this.currentColIndex].id;
      this.updateSelection();
      this.scene.ui.playSelect();
      return true;
    }
    return false;
  }

  private navigateRight(): boolean {
    const currentWave = this.visibleWaves[this.currentRowIndex];
    if (this.currentColIndex < currentWave.nodes.length - 1) {
      this.currentColIndex++;
      this.selectedNodeId = currentWave.nodes[this.currentColIndex].id;
      this.updateSelection();
      this.scene.ui.playSelect();
      return true;
    }
    return false;
  }

  private getCurrentNode(): any {
    if (this.currentRowIndex >= 0 && this.currentRowIndex < this.visibleWaves.length) {
      const currentWave = this.visibleWaves[this.currentRowIndex];
      if (this.currentColIndex >= 0 && this.currentColIndex < currentWave.nodes.length) {
        return currentWave.nodes[this.currentColIndex];
      }
    }
    return null;
  }

  private scroll(direction: number): void {
    const battlePath = getCurrentBattlePath();
    if (!battlePath) return;

    const scrollAmount = direction * this.WAVE_HEIGHT * 5;
    const newScrollPosition = Math.max(0, this.scrollPosition + scrollAmount);
    this.smoothScrollTo(newScrollPosition);
  }

  private getMaxViewableWave(): number {
    const current500Segment = Math.floor((this.currentWave - 1) / 500);
    const segmentStart = current500Segment * 500 + 1;
    
    const positionInSegment = this.currentWave - segmentStart + 1;
    
    const current30Segment = Math.ceil(positionInSegment / 30);
    const max30WaveInSegment = current30Segment * 30;
    
    const max30WaveLimit = segmentStart + max30WaveInSegment - 1;
    
    let max500WaveLimit = Infinity;
    if (this.currentWave % 500 !== 0) {
      max500WaveLimit = Math.ceil(this.currentWave / 500) * 500 - 1;
    }
    
    const maxWave = Math.min(max30WaveLimit, max500WaveLimit);
    console.log(`🔍 UI: Current wave ${this.currentWave}, segment start: ${segmentStart}, position in segment: ${positionInSegment}, 30-wave limit: ${max30WaveLimit}, 500-wave limit: ${max500WaveLimit}, final max viewable: ${maxWave}`);
    return maxWave;
  }

  private setupMouseDrag(): void {
    if (!this.pathContainer || this.pathContainer.input) {
      return;
    }

    this.pathContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.CONTAINER_WIDTH - 10, this.CONTAINER_HEIGHT - 40),
      Phaser.Geom.Rectangle.Contains
    );

    this.pathContainer.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollPosition = this.scrollPosition;
    });

    if (!this.pointermoveHandler) {
      this.pointermoveHandler = (pointer) => {
        if (this.isDragging && this.active) {
          const deltaY = pointer.y - this.dragStartY;
          const newScrollPosition = Math.max(0, this.dragStartScrollPosition + deltaY);
          
          const battlePath = getCurrentBattlePath();
          if (battlePath) {
            const maxViewableWave = this.getMaxViewableWave();
            
            const effectiveMaxWave = Math.min(battlePath.totalWaves, maxViewableWave);
            
            const currentBaseWave = this.currentWave - 1;
            const maxScrollableWave = effectiveMaxWave - this.WAVES_VISIBLE + 1;
            const maxScrollFromCurrent = Math.max(0, maxScrollableWave - currentBaseWave);
            const maxScroll = maxScrollFromCurrent * this.WAVE_HEIGHT;
            
            this.scrollPosition = Math.min(newScrollPosition, maxScroll);
            this.loadBattlePath();
          }
        }
      };
      this.scene.input.on('pointermove', this.pointermoveHandler);
    }

    if (!this.pointerupHandler) {
      this.pointerupHandler = () => {
        this.isDragging = false;
      };
      this.scene.input.on('pointerup', this.pointerupHandler);
    }
  }

  private smoothScrollTo(targetPosition: number): void {
    const battlePath = getCurrentBattlePath();
    if (!battlePath) return;
    
    const maxViewableWave = this.getMaxViewableWave();
    
    const effectiveMaxWave = Math.min(battlePath.totalWaves, maxViewableWave);
    
    const currentBaseWave = this.currentWave - 1;
    const maxScrollableWave = effectiveMaxWave - this.WAVES_VISIBLE + 1;
    
    const maxScrollFromCurrent = Math.max(0, maxScrollableWave - currentBaseWave);
    const maxScroll = maxScrollFromCurrent * this.WAVE_HEIGHT;
    
    console.log(`📜 Scroll limit - currentWave: ${this.currentWave}, effectiveMaxWave: ${effectiveMaxWave}, maxScroll: ${maxScroll}, targetPosition: ${targetPosition}`);
    
    this.scrollPosition = Math.max(0, Math.min(targetPosition, maxScroll));
    this.loadBattlePath();
  }

  private drawFallbackConnections(): void {
    for (let waveIndex = 0; waveIndex < this.visibleWaves.length - 1; waveIndex++) {
      const currentWave = this.visibleWaves[waveIndex];
      const nextWave = this.visibleWaves[waveIndex + 1];
      
      if (!currentWave || !nextWave || currentWave.nodes.length === 0 || nextWave.nodes.length === 0) {
        continue;
      }
      
      const currentNodes = [...currentWave.nodes].sort((a, b) => a.position.x - b.position.x);
      const nextNodes = [...nextWave.nodes].sort((a, b) => a.position.x - b.position.x);
      
      for (const currentNode of currentNodes) {
        const currentPos = this.nodePositions.get(currentNode.id);
        if (!currentPos) continue;
        
        const currentPosition = currentNode.position.x;
        const validTargets = nextNodes.filter(node => {
          const targetPosition = node.position.x;
          return Math.abs(currentPosition - targetPosition) <= 1;
        });
        
        if (validTargets.length > 0) {
          const targetNode = validTargets[0];
          const targetPos = this.nodePositions.get(targetNode.id);
          if (targetPos) {
            this.drawConnectionLine(currentPos, targetPos, true);
          }
        } else if (nextNodes.length > 0) {
          const closest = nextNodes.reduce((closest, node) => {
            const currentDiff = Math.abs(currentPosition - node.position.x);
            const closestDiff = Math.abs(currentPosition - closest.position.x);
            return currentDiff < closestDiff ? node : closest;
          });
          const targetPos = this.nodePositions.get(closest.id);
          if (targetPos) {
            this.drawConnectionLine(currentPos, targetPos, true);
          }
        }
      }
    }
  }

  private getDynamicModeSubtitle(node: any): string | null {
    if (!node.dynamicMode) {
      return null;
    }
    
    const activeModes = Object.entries(node.dynamicMode)
      .filter(([, value]) => value)
      .map(([key]) => key);
    
    if (activeModes.length === 0) {
      return null;
    }
    
    const readableModes = activeModes.map(mode => {
      return mode.replace(/([A-Z])/g, ' $1').trim();
    });
    
    return readableModes.join('\n');
  }

  private getAvailableNodesForCurrentWave(): string[] {

    const currentWave = this.scene.battlePathWave || 1;
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      return [];
    }
    
    if (currentWave === 1) {
      const wave1Nodes = battlePath.waveToNodeMap.get(1) || [];
      return wave1Nodes.map(node => node.id);
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
    
    const availableNodeIds: string[] = [];
    const nodesAtCurrentWave = battlePath.waveToNodeMap.get(currentWave) || [];
    
    for (const currentWaveNode of nodesAtCurrentWave) {
      if (previouslySelectedNode.connections && previouslySelectedNode.connections.includes(currentWaveNode.id)) {
        availableNodeIds.push(currentWaveNode.id);
      }
    }
    
    return availableNodeIds;
  }

  private isNodeSelectable(node: any): boolean {
    if (this.viewOnlyMode) {
      return false;
    }

    const availableNodeIds = this.getAvailableNodesForCurrentWave();
    return availableNodeIds.includes(node.id);
  }

  private updateAvailableNodes(): void {
    this.availableNodeIds.clear();
    
    if (this.viewOnlyMode) {
      return;
    }

    const currentWave = this.scene.battlePathWave || 1;
    
    const availableNodeIds = this.getAvailableNodesForCurrentWave();
    availableNodeIds.forEach(nodeId => this.availableNodeIds.add(nodeId));
    
    console.log(`🎯 Available nodes for wave ${currentWave}:`, Array.from(this.availableNodeIds));
  }

  private findFirstConnectedNode(nodes: any[]): number {
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      return -1;
    }

    const selectedPath = this.scene.gameData?.selectedPath;
    if (!selectedPath) {
      return -1;
    }

    const previouslySelectedNode = battlePath.nodeMap.get(selectedPath);
    if (!previouslySelectedNode || !previouslySelectedNode.connections) {
      return -1;
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (previouslySelectedNode.connections.includes(node.id)) {
        return i;
      }
    }

    return -1;
  }

  private getPreviouslySelectedNode(): any | null {
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      return null;
    }

    const selectedPath = this.scene.gameData?.selectedPath;
    if (!selectedPath) {
      return null;
    }

    return battlePath.nodeMap.get(selectedPath) || null;
  }

  private shouldShowTextInViewMode(node: any, isHovered: boolean = false): boolean {
    if (!this.viewOnlyMode) {
      return true;
    }
    
    if (isHovered) {
      return true;
    }
    
    if (node.wave < this.currentWave) {
      return true;
    }
    
    if (node.wave === this.currentWave && this.scene.gameData?.selectedPath === node.id) {
      return true;
    }
    
    const selectedPath = this.scene.gameData?.selectedPath;
    if (selectedPath) {
      const battlePath = getCurrentBattlePath();
      if (battlePath) {
        const selectedNode = battlePath.nodeMap.get(selectedPath);
        if (selectedNode && selectedNode.connections && selectedNode.connections.includes(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }
} 