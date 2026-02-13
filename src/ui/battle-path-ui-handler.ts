import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Button } from "../enums/buttons";
import { addWindow } from "./ui-theme";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { createSporadicPattern } from "../utils";
import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { getCurrentBattlePath, PathNodeType, getAvailablePathsFromWave, setupFixedBattlePaths, getDynamicModeLocalizedString, DynamicModes } from "../battle";
import { PathNodeContext } from "../phases/battle-path-phase";
import { Type } from "../data/type";
import Overrides from "#app/overrides.js";
import { isIPhone } from "../loading-scene";
import { Device } from "../enums/devices";

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

function extractNodePattern(nodeId: string): string | null {
  const match = nodeId.match(/^(\d+_\d+)/);
  return match ? match[1] : null;
}

function hasConnectionByPattern(connections: string[], targetNodeId: string): boolean {
  const targetPattern = extractNodePattern(targetNodeId);
  if (!targetPattern) {
    return false;
  }

  return connections.some(connectionId => {
    const connectionPattern = extractNodePattern(connectionId);
    return connectionPattern === targetPattern;
  });
}

function findNodeByPattern(battlePath: any, selectedPath: string): any | null {
  const selectedPattern = extractNodePattern(selectedPath);
  if (!selectedPattern) {
    return null;
  }

  const wave = parseInt(selectedPattern.split('_')[0], 10);
  if (isNaN(wave)) {
    return null;
  }

  const nodesAtWave = battlePath.waveToNodeMap.get(wave);
  if (!nodesAtWave) {
    return null;
  }

  return nodesAtWave.find(node => {
    const nodePattern = extractNodePattern(node.id);
    return nodePattern === selectedPattern;
  }) || null;
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

  private readonly PATH_CONTAINER_OFFSET = {
    X: 5,
    Y: 25,
  };

  private readonly WAVE_LABEL_OFFSET = {
    X: 10,
  };

  private readonly TITLE_CONTAINER = {
    X_OFFSET: 10,
    Y_OFFSET: -4,
    GRADIENT_WIDTH: 200,
    HEIGHT: 19,
  };

  private readonly TITLE = {
    FONT_SIZE: "56px",
    X_OFFSET: 4,
    Y_OFFSET: 8.5,
    COLOR: 0xffffff,
    ALPHA: 1.0,
  };

  private readonly SUBTITLE = {
    FONT_SIZE: "40px",
    X_OFFSET: 171,
    Y_OFFSET: 10.2,
    COLOR: 0xffffff,
    ALPHA: 0.8,
  };

  private readonly CHALLENGE_ITEM = {
    WIDTH: 52,
    HEIGHT: 8,
    SPACING: 1,
    COLUMN_GAP: 2,
    FONT_SIZE: '44px',
    COLOR_RED: 0xff4444,
    BORDER_FOCUSED_COLOR: 0xff4444,
    BORDER_FOCUSED_ALPHA: 1.0,
    BORDER_FOCUSED_THICKNESS: 1,
    BORDER_UNFOCUSED_COLOR: 0x993333,
    BORDER_UNFOCUSED_ALPHA: 0.7,
    BORDER_UNFOCUSED_THICKNESS: 0.5,
    BORDER_MARGIN_H: 2,
    OUTER_COLUMN_MARGIN: 2,
  };

  private readonly CHALLENGE_DESC_TOOLTIP = {
    WIDTH: 80,
    PADDING: 6,
    TITLE_BAR_Y: 0,
    TITLE_BAR_HEIGHT: 12,
    TITLE_BAR_COLOR: 0xff4444,
    TITLE_BAR_ALPHA: 0.3,
    RARITY_BAR_Y: 12,
    RARITY_BAR_HEIGHT: 6,
    RARITY_BAR_COLOR: 0x4d0000,
    RARITY_BAR_ALPHA: 0.6,
    CONTENT_Y: 20,
    TITLE_FONT_SIZE: '40px',
    RARITY_FONT_SIZE: '30px',
    DESC_FONT_SIZE: '36px',
    TITLE_TEXT_Y: 6,
    RARITY_TEXT_Y: 15,
    TEXT_SPACING: 4,
    BORDER_COLOR: 0xffffff,
    BORDER_ALPHA: 0.5,
    BORDER_THICKNESS: 0.5,
    GRADIENT_TOP: { r: 106, g: 15, b: 58 },
    GRADIENT_BOTTOM: { r: 0, g: 0, b: 0 },
  };

  private readonly CHALLENGE_TOOLTIP_HEADER = {
    HEIGHT: 8,
    FONT_SIZE: '50px',
    COLOR: 0xff4444,
    PADDING_BOTTOM: 1,
  };

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
  private tooltipMaskGraphics: Phaser.GameObjects.Graphics | null = null;

  private tooltipChallenges: Array<{name: string, description: string}> = [];
  private tooltipSelectedIndex: number = 0;
  private tooltipSelectedColumn: number = 0;
  private tooltipSelectedRow: number = 0;
  private tooltipColumnItemCounts: number[] = [];
  private tooltipColumnCount: number = 1;
  private tooltipDetailsButton: Phaser.GameObjects.Container | null = null;
  private tooltipBackButton: Phaser.GameObjects.Container | null = null;

  private challengeItemContainers: Phaser.GameObjects.Container[] = [];
  private challengeItemBgs: Phaser.GameObjects.Graphics[] = [];
  private challengeDescTooltipContainer: Phaser.GameObjects.Container | null = null;
  private challengeDescTooltipBg: Phaser.GameObjects.Graphics | null = null;
  private challengeDescTooltipTitleBar: Phaser.GameObjects.Graphics | null = null;
  private challengeDescTooltipRarityBar: Phaser.GameObjects.Graphics | null = null;
  private challengeDescTooltipTitle: Phaser.GameObjects.Text | null = null;
  private challengeDescTooltipRarity: Phaser.GameObjects.Text | null = null;
  private challengeDescTooltipDesc: Phaser.GameObjects.Text | null = null;
  private challengeNavigationActive: boolean = false;
  private challengeHeaderText: Phaser.GameObjects.Text | null = null;
  private mainTooltipHeight: number = 0;

  private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
  private modalBackgroundCreated: boolean = false;
  private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
  private modalPatternCreated: boolean = false;

  private titleContainer: Phaser.GameObjects.Container;
  private titleBackground: Phaser.GameObjects.Graphics;
  private subtitleText: Phaser.GameObjects.Text;

  private smittyTrainersLoaded: boolean = false;
  private trainerSpritesLoaded: boolean = false;

  private lastScrollTime: number = 0;
  private readonly SCROLL_THROTTLE_MS = 150;

  private inputDelayTimer: Phaser.Time.TimerEvent | null = null;
  private inputBlocked: boolean = false;
  private readonly INPUT_DELAY_MS = 1000;

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
    this.gridInc = -2;
  }

  getModalTitle(): string {
    return i18next.t("nodeMode:chaosTitle", { defaultValue: "CHAOS" });
  }

  getWidth(): number {
    return Math.floor(this.scene.game.canvas.width / 6) + 8;
  }

  getHeight(): number {
    return Math.floor(this.scene.game.canvas.height / 6) + 6;
  }

  getMargin(): [number, number, number, number] {
    return [4, 4, 4, 4];
  }

  getButtonLabels(): string[] {
    return [];
  }

  setup(): void {
    super.setup();
    this.setupContainers();
    this.setupTitleContainer();

    this.modalContainer.bringToTop(this.titleContainer);
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
      this.ensureContainersExist();

      this.fixTitlePositioning();

      if (this.titleContainer && this.titleContainer.parentContainer) {
        this.modalContainer.bringToTop(this.titleContainer);
      }

      this.currentWave = this.scene.battlePathWave || 1;

      this.inputBlocked = true;
      this.inputDelayTimer = this.scene.time.delayedCall(this.INPUT_DELAY_MS, () => {
        this.inputBlocked = false;
        this.inputDelayTimer = null;
      });

      let battlePath = (this.scene as any).gameData?.battlePath;

      if (!battlePath) {
        try {
          this.scene.gameData.resetBattlePathData();

          setupFixedBattlePaths(this.scene);
          battlePath = getCurrentBattlePath();
        } catch (error) {
          console.error("[show] Failed to generate battle path:", error);
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

    if (this.inputDelayTimer) {
      this.inputDelayTimer.destroy();
      this.inputDelayTimer = null;
    }
    this.inputBlocked = false;

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
    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.destroy();
      this.modalBackgroundImage = null;
      this.modalBackgroundCreated = false;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.removeAll(true);
      this.modalPatternOverlay.destroy();
      this.modalPatternOverlay = null;
      this.modalPatternCreated = false;
    }

    super.clear();
  }

  protected createModalBackground(): void {
  }

  updateContainer(config?: ModalConfig): void {
    super.updateContainer(config);

    if (!this.modalBackgroundCreated) {
      this.modalBackgroundImage = this.scene.add.image(0, 0, "battle_path_blur_bg");
      this.modalBackgroundImage.setOrigin(0, 0);
      this.modalContainer.addAt(this.modalBackgroundImage, 1);
      this.modalBackgroundCreated = true;
    }

    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.setPosition(
        this.modalBg.x,
        this.modalBg.y
      );
      this.modalBackgroundImage.setDisplaySize(
        this.modalBg.width,
        this.modalBg.height
      );
    }

    if (!this.modalPatternCreated) {
      this.modalPatternOverlay = this.scene.add.container(0, 0);
      this.modalContainer.addAt(this.modalPatternOverlay, 2);

      createSporadicPattern(this.scene, this.modalPatternOverlay);

      this.modalPatternCreated = true;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.setPosition(
        this.modalBg.x,
        this.modalBg.y
      );
    }

    if (this.pathContainer && this.pathContainer.parentContainer === this.modalContainer) {
      this.modalContainer.bringToTop(this.pathContainer);
    }

    if (this.legendContainer && this.legendContainer.parentContainer === this.modalContainer) {
      this.modalContainer.bringToTop(this.legendContainer);
    }
  }

  private setupTitleContainer(): void {
    this.titleContainer = this.scene.add.container(
      this.TITLE_CONTAINER.X_OFFSET,
      this.TITLE_CONTAINER.Y_OFFSET
    );
    this.modalContainer.add(this.titleContainer);
    this.titleContainer.setDepth(1000);

    this.titleBackground = this.scene.add.graphics();
    this.createGradientBackground();
    this.titleContainer.add(this.titleBackground);

    if (this.titleText) {
      this.titleText.setPosition(this.TITLE.X_OFFSET, this.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0, 0);
      this.titleText.setStyle({ fontSize: this.TITLE.FONT_SIZE, align: "left" });
      this.titleText.setTint(this.TITLE.COLOR);
      this.titleText.setAlpha(this.TITLE.ALPHA);
      this.titleText.setVisible(true);
      this.titleContainer.add(this.titleText);
    }

    this.subtitleText = addTextObject(this.scene,
      this.SUBTITLE.X_OFFSET,
      this.SUBTITLE.Y_OFFSET,
      i18next.t("nodeMode:chaosSubtitle", { defaultValue: "Choose your path as you venture into the heart of darkness" }),
      TextStyle.WINDOW,
      { fontSize: this.SUBTITLE.FONT_SIZE, align: "left" }
    );
    this.subtitleText.setOrigin(0, 0);
    this.subtitleText.setTint(this.SUBTITLE.COLOR);
    this.subtitleText.setAlpha(this.SUBTITLE.ALPHA);
    this.titleContainer.add(this.subtitleText);
  }

  private createGradientBackground(): void {
    this.titleBackground.clear();

    const gradientWidth = this.TITLE_CONTAINER.GRADIENT_WIDTH;

    this.titleBackground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.95, 0.0, 0.95, 0.0);
    this.titleBackground.fillRect(0, 0, gradientWidth, this.TITLE_CONTAINER.HEIGHT);
  }

  private fixTitlePositioning(): void {
    if (this.titleText && this.titleContainer) {
      this.titleText.setPosition(this.TITLE.X_OFFSET, this.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0, 0);

      if (this.subtitleText) {
        const titleWidth = this.titleText.displayWidth;
        this.subtitleText.setPosition(this.TITLE.X_OFFSET + titleWidth + 10, this.SUBTITLE.Y_OFFSET);
      }
    }
  }

  private ensureContainersExist(): void {
    if (!this.pathContainer || !this.pathContainer.parentContainer) {
      this.setupContainers();
    }
    if (!this.titleContainer || !this.titleContainer.parentContainer) {
      this.setupTitleContainer();
      this.modalContainer.bringToTop(this.titleContainer);
    }
  }

  private setupContainers(): void {
    const containerWidth = this.getWidth();
    const containerHeight = this.getHeight();

    if (!this.pathContainer || !this.pathContainer.parentContainer) {
      if (this.pathContainer) {
        this.pathContainer.destroy();
      }
    this.pathContainer = this.scene.add.container(this.PATH_CONTAINER_OFFSET.X, this.PATH_CONTAINER_OFFSET.Y);
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
    this.legendContainer = this.scene.add.container(this.PATH_CONTAINER_OFFSET.X, legendY);
    this.legendContainer.setName("legendContainer");
    this.modalContainer.add(this.legendContainer);
  }

  this.setupMouseDrag();
  }

  private async loadBattlePath(): Promise<void> {
    await this.ensureBattlePathAssetsLoaded();

    this.clearPath();

    let battlePath = getCurrentBattlePath();
    if (!battlePath) {
      battlePath = (this.scene as any).gameData?.battlePath;
    }

    if (!battlePath) {
      this.showNoPathMessage();
      return;
    }

    this.updateAvailableNodes();
    this.currentWave = this.scene.battlePathWave || 1;

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
      this.WAVE_LABEL_OFFSET.X,
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

    const pathContainerWidth = this.getWidth() - (this.pathContainer.x * 2);
    const availableWidth = pathContainerWidth - 60;
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
      if (!this.viewOnlyMode && previouslySelectedNode && previouslySelectedNode.connections && !previouslySelectedNode.connections.includes(node.id) && !hasConnectionByPattern(previouslySelectedNode.connections, node.id)) {
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
      const pathContainerWidth = this.getWidth() - (this.pathContainer.x * 2);
      const isRightEdge = x > pathContainerWidth - 60;
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
      const firstWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));

      if (wave !== firstWave) {
        const hasIncomingConnection = node.previousConnections && node.previousConnections.length > 0;

        if (!hasIncomingConnection) {
          const warningIcon = this.scene.add.sprite(
            nodeSize / 2 + 2,
            -nodeSize / 2 - 2,
            "smitems",
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
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3"); } catch {}
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

    const validGraphics = this.scene.add.graphics();
    const invalidGraphics = this.scene.add.graphics();

    validGraphics.lineStyle(1, 0x6688aa, 0.5);
    invalidGraphics.lineStyle(2, 0xff0000, 0.7);

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
            this.drawConnectionLineOnGraphics(
              connectionValid ? validGraphics : invalidGraphics,
              currentPos,
              targetPos,
              connectionValid
            );
            connectionsDrawn++;

            if (!connectionValid) {
              invalidConnections++;
            }
          }
        }
      }
    }

    this.connectionsContainer.add(validGraphics);
    this.connectionsContainer.add(invalidGraphics);

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

  private drawConnectionLineOnGraphics(
    graphics: Phaser.GameObjects.Graphics,
    from: NodePosition,
    to: NodePosition,
    isValid: boolean = true
  ): void {
    const dashLength = isValid ? 3 : 2;
    const gapLength = isValid ? 1 : 2;

    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;

    const totalDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const numDashes = Math.floor(totalDistance / (dashLength + gapLength));

    if (!isValid) {
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

      this.showCustomTooltip(tooltipText, x, y, modeDescriptions.length, modeDescriptions);
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

  private calculateColumnLayout(itemCount: number): { columns: number, itemsPerColumn: number[] } {
    if (itemCount <= 14) {
      return { columns: 1, itemsPerColumn: [itemCount] };
    } else if (itemCount <= 20) {
      const col1 = Math.ceil(itemCount / 2);
      const col2 = itemCount - col1;
      return { columns: 2, itemsPerColumn: [col1, col2] };
    } else {
      const cappedCount = Math.min(itemCount, 30);
      const col1 = Math.ceil(cappedCount / 3);
      const col2 = Math.ceil((cappedCount - col1) / 2);
      const col3 = cappedCount - col1 - col2;
      return { columns: 3, itemsPerColumn: [col1, col2, col3] };
    }
  }

  private getLinearIndexFromColumnRow(column: number, row: number): number {
    let index = 0;
    for (let c = 0; c < column; c++) {
      index += this.tooltipColumnItemCounts[c];
    }
    return index + row;
  }

  private getColumnRowFromLinearIndex(linearIndex: number): { column: number, row: number } {
    let remaining = linearIndex;
    for (let c = 0; c < this.tooltipColumnItemCounts.length; c++) {
      if (remaining < this.tooltipColumnItemCounts[c]) {
        return { column: c, row: remaining };
      }
      remaining -= this.tooltipColumnItemCounts[c];
    }
    return { column: 0, row: 0 };
  }

  private showCustomTooltip(tooltipText: string, x: number, y: number, challengeCount: number, challenges?: Array<{name: string, description: string}>): void {
    this.hideCustomTooltip();

    this.tooltipChallenges = challenges || [];
    this.tooltipSelectedIndex = 0;
    this.tooltipSelectedColumn = 0;
    this.tooltipSelectedRow = 0;
    this.challengeNavigationActive = false;
    this.challengeItemContainers = [];
    this.challengeItemBgs = [];

    const padding = 4;
    const c = this.CHALLENGE_ITEM;
    const h = this.CHALLENGE_TOOLTIP_HEADER;

    const itemCount = this.tooltipChallenges.length;
    const { columns, itemsPerColumn } = this.calculateColumnLayout(itemCount);
    this.tooltipColumnCount = columns;
    this.tooltipColumnItemCounts = itemsPerColumn;

    const maxItemsInColumn = Math.max(...itemsPerColumn, 0);
    const headerHeight = itemCount > 0 ? h.HEIGHT + h.PADDING_BOTTOM : 0;
    const contentHeight = itemCount > 0
      ? maxItemsInColumn * (c.HEIGHT + c.SPACING) - c.SPACING
      : 0;
    const buttonHeight = 10;
    const outerMargin = columns > 1 ? c.OUTER_COLUMN_MARGIN * 2 : 0;
    const tooltipWidth = columns * c.WIDTH + (columns - 1) * c.COLUMN_GAP + padding * 2 + outerMargin;
    const tooltipHeight = headerHeight + contentHeight + buttonHeight + padding * 2;
    this.mainTooltipHeight = tooltipHeight;

    const nodeLocalX = x + this.pathContainer.x;
    const nodeLocalY = y + this.pathContainer.y;
    const modalWidth = this.getWidth();
    const modalHeight = this.getHeight();

    let tooltipX: number;
    let tooltipY: number;

    if (nodeLocalX > modalWidth / 2) {
      tooltipX = nodeLocalX - tooltipWidth - 10;
    } else {
      tooltipX = nodeLocalX + 20;
    }

    tooltipX = Math.max(5, Math.min(modalWidth - tooltipWidth - 5, tooltipX));

    tooltipY = Math.max(10, Math.min(
      modalHeight - tooltipHeight - 10,
      nodeLocalY - tooltipHeight / 2
    ));

    this.customTooltipContainer = this.scene.add.container(tooltipX, tooltipY);
    this.modalContainer.add(this.customTooltipContainer);
    this.modalContainer.bringToTop(this.customTooltipContainer);

    const tooltipBg = addWindow(this.scene, 0, 0, tooltipWidth, tooltipHeight);
    tooltipBg.setAlpha(0.9);
    this.customTooltipContainer.add(tooltipBg);

    if (this.tooltipChallenges.length > 0) {
      this.challengeHeaderText = addTextObject(
          this.scene,
        tooltipWidth / 2,
        padding + h.HEIGHT / 2,
        i18next.t("nodeMode:challengeHeader", { defaultValue: "CHALLENGE!" }),
          TextStyle.WINDOW,
        { fontSize: h.FONT_SIZE, fontStyle: "bold" }
      );
      this.challengeHeaderText.setOrigin(0.5, 0.5);
      this.challengeHeaderText.setTint(h.COLOR);
      this.customTooltipContainer.add(this.challengeHeaderText);

      let linearIndex = 0;
      for (let col = 0; col < columns; col++) {
        const outerOffset = columns > 1 ? c.OUTER_COLUMN_MARGIN : 0;
        const columnX = padding + outerOffset + c.WIDTH / 2 + col * (c.WIDTH + c.COLUMN_GAP);
        let yOffset = padding + headerHeight;

        for (let row = 0; row < itemsPerColumn[col]; row++) {
          const challenge = this.tooltipChallenges[linearIndex];
          if (!challenge) break;

          const { container, bg } = this.createChallengeItemElement(
            challenge.name,
            columnX,
            yOffset + c.HEIGHT / 2,
            false
          );
          this.customTooltipContainer!.add(container);
          this.challengeItemContainers.push(container);
          this.challengeItemBgs.push(bg);

          yOffset += c.HEIGHT + c.SPACING;
          linearIndex++;
        }
      }

      this.createChallengeDescTooltip();
      this.createDetailsButton(tooltipWidth, tooltipHeight, padding);
    } else {
      this.customTooltipText = addTextObject(
        this.scene,
        -tooltipWidth / 2 + padding,
        -tooltipHeight / 2 + padding,
        tooltipText,
        TextStyle.WINDOW,
        { fontSize: '300px' }
      );
      this.customTooltipText.setOrigin(0, 0);
      this.customTooltipContainer.add(this.customTooltipText);

      const textMaskRect = this.scene.make.graphics({});
      this.tooltipMaskGraphics = textMaskRect;
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
  }

  private createChallengeItemElement(
    name: string,
    x: number,
    y: number,
    isSelected: boolean
  ): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics } {
    const c = this.CHALLENGE_ITEM;
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();

    const borderColor = isSelected ? c.BORDER_FOCUSED_COLOR : c.BORDER_UNFOCUSED_COLOR;
    const borderAlpha = isSelected ? c.BORDER_FOCUSED_ALPHA : c.BORDER_UNFOCUSED_ALPHA;
    const borderThickness = isSelected ? c.BORDER_FOCUSED_THICKNESS : c.BORDER_UNFOCUSED_THICKNESS;

    const borderWidth = c.WIDTH - c.BORDER_MARGIN_H * 2;
    bg.lineStyle(borderThickness, borderColor, borderAlpha);
    bg.strokeRect(-borderWidth / 2, -c.HEIGHT / 2, borderWidth, c.HEIGHT);

    const text = addTextObject(
      this.scene,
      0,
      0,
      name,
      TextStyle.WINDOW,
      { fontSize: c.FONT_SIZE }
    );
    text.setOrigin(0.5, 0.5);

    container.add(bg);
    container.add(text);

    return { container, bg };
  }

  private createChallengeDescTooltip(): void {
    if (!this.customTooltipContainer) return;

    const c = this.CHALLENGE_DESC_TOOLTIP;

    this.challengeDescTooltipContainer = this.scene.add.container(0, 0);
    this.challengeDescTooltipContainer.setVisible(false);

    this.challengeDescTooltipBg = this.scene.add.graphics();
    this.challengeDescTooltipTitleBar = this.scene.add.graphics();
    this.challengeDescTooltipRarityBar = this.scene.add.graphics();

    this.challengeDescTooltipTitle = addTextObject(
      this.scene,
      c.WIDTH / 2,
      c.TITLE_TEXT_Y,
      "",
      TextStyle.WINDOW,
      { fontSize: c.TITLE_FONT_SIZE, fontStyle: "bold" }
    );
    this.challengeDescTooltipTitle.setOrigin(0.5, 0.5);

    this.challengeDescTooltipRarity = addTextObject(
      this.scene,
      c.WIDTH / 2,
      c.RARITY_TEXT_Y,
      i18next.t("nodeMode:challengeHeader", { defaultValue: "CHALLENGE!" }),
      TextStyle.WINDOW,
      { fontSize: c.RARITY_FONT_SIZE }
    );
    this.challengeDescTooltipRarity.setOrigin(0.5, 0.5);
    this.challengeDescTooltipRarity.setTint(0xff4444);

    this.challengeDescTooltipDesc = addTextObject(
      this.scene,
      c.PADDING,
      c.CONTENT_Y + 2,
      "",
      TextStyle.WINDOW,
      { fontSize: c.DESC_FONT_SIZE }
    );
    this.challengeDescTooltipDesc.setOrigin(0, 0);
    this.challengeDescTooltipDesc.setWordWrapWidth((c.WIDTH - c.PADDING * 2) * 6);

    this.challengeDescTooltipContainer.add(this.challengeDescTooltipBg);
    this.challengeDescTooltipContainer.add(this.challengeDescTooltipTitleBar);
    this.challengeDescTooltipContainer.add(this.challengeDescTooltipRarityBar);
    this.challengeDescTooltipContainer.add(this.challengeDescTooltipTitle);
    this.challengeDescTooltipContainer.add(this.challengeDescTooltipRarity);
    this.challengeDescTooltipContainer.add(this.challengeDescTooltipDesc);

    this.customTooltipContainer.add(this.challengeDescTooltipContainer);
  }

  private drawChallengeTooltipGradient(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const c = this.CHALLENGE_DESC_TOOLTIP;
    const topColor = c.GRADIENT_TOP;
    const bottomColor = c.GRADIENT_BOTTOM;

    const gradientSteps = 24;

    for (let step = 0; step < gradientSteps; step++) {
      const stepY = y + (step / gradientSteps) * height;
      const stepHeight = height / gradientSteps;

      const rawFactor = step / (gradientSteps - 1);
      const factor = Math.pow(rawFactor, 2.5);

      const r = Math.floor(topColor.r * (1 - factor) + bottomColor.r * factor);
      const g = Math.floor(topColor.g * (1 - factor) + bottomColor.g * factor);
      const b = Math.floor(topColor.b * (1 - factor) + bottomColor.b * factor);
      const color = (r << 16) | (g << 8) | b;

      graphics.fillStyle(color, 1.0);
      graphics.fillRect(x, stepY, width, stepHeight + (step < gradientSteps - 1 ? 1 : 0));
    }
  }

  private updateChallengeDescTooltip(): void {
    if (!this.challengeDescTooltipContainer ||
        !this.challengeDescTooltipBg ||
        !this.challengeDescTooltipTitle ||
        !this.challengeDescTooltipDesc ||
        !this.challengeDescTooltipTitleBar ||
        !this.challengeDescTooltipRarityBar) {
      return;
    }

    const challenge = this.tooltipChallenges[this.tooltipSelectedIndex];
    if (!challenge) {
      this.challengeDescTooltipContainer.setVisible(false);
      return;
    }

    const c = this.CHALLENGE_DESC_TOOLTIP;

    this.challengeDescTooltipTitle.setText(challenge.name);
    this.challengeDescTooltipDesc.setText(challenge.description);

    const descHeight = this.challengeDescTooltipDesc.displayHeight;
    const barsHeight = c.TITLE_BAR_HEIGHT + c.RARITY_BAR_HEIGHT;
    const contentHeight = descHeight + c.TEXT_SPACING;
    const tooltipHeight = barsHeight + contentHeight + c.PADDING * 2;

    this.challengeDescTooltipBg.clear();
    this.drawChallengeTooltipGradient(
      this.challengeDescTooltipBg,
      0, 0,
      c.WIDTH,
      tooltipHeight
    );
    this.challengeDescTooltipBg.lineStyle(c.BORDER_THICKNESS, c.BORDER_COLOR, c.BORDER_ALPHA);
    this.challengeDescTooltipBg.strokeRect(0, 0, c.WIDTH, tooltipHeight);

    this.challengeDescTooltipTitleBar.clear();
    this.challengeDescTooltipTitleBar.fillStyle(c.TITLE_BAR_COLOR, c.TITLE_BAR_ALPHA);
    this.challengeDescTooltipTitleBar.fillRect(0, c.TITLE_BAR_Y, c.WIDTH, c.TITLE_BAR_HEIGHT);

    this.challengeDescTooltipRarityBar.clear();
    this.challengeDescTooltipRarityBar.fillStyle(c.RARITY_BAR_COLOR, c.RARITY_BAR_ALPHA);
    this.challengeDescTooltipRarityBar.fillRect(0, c.RARITY_BAR_Y, c.WIDTH, c.RARITY_BAR_HEIGHT);

    const selectedItem = this.challengeItemContainers[this.tooltipSelectedIndex];
    if (selectedItem) {
      const itemCenterY = selectedItem.y;
      const minY = 0;
      const maxY = Math.max(0, this.mainTooltipHeight - tooltipHeight);
      const rawTooltipY = itemCenterY - tooltipHeight / 2;
      const clampedTooltipY = Math.max(minY, Math.min(maxY, rawTooltipY));
      this.challengeDescTooltipContainer.setY(clampedTooltipY);

      const mainTooltipX = this.customTooltipContainer?.x || 0;
      const mainTooltipWidth = this.tooltipColumnCount * this.CHALLENGE_ITEM.WIDTH +
                               (this.tooltipColumnCount - 1) * this.CHALLENGE_ITEM.COLUMN_GAP + 8;
      const modalWidth = this.getWidth();

      const spaceOnLeft = mainTooltipX;
      const spaceOnRight = modalWidth - (mainTooltipX + mainTooltipWidth);

      if (spaceOnLeft > spaceOnRight && spaceOnLeft >= c.WIDTH + 7) {
        this.challengeDescTooltipContainer.setX(-c.WIDTH - 7);
      } else {
        this.challengeDescTooltipContainer.setX(mainTooltipWidth + 7);
      }
    }

    this.challengeDescTooltipContainer.setVisible(true);
  }

  private updateChallengeSelection(): void {
    if (this.challengeItemContainers.length === 0 || this.challengeItemBgs.length === 0) {
      return;
    }

    const c = this.CHALLENGE_ITEM;
    const borderWidth = c.WIDTH - c.BORDER_MARGIN_H * 2;

    this.challengeItemBgs.forEach((bg, index) => {
      const isSelected = index === this.tooltipSelectedIndex;

      bg.clear();

      const borderColor = isSelected ? c.BORDER_FOCUSED_COLOR : c.BORDER_UNFOCUSED_COLOR;
      const borderAlpha = isSelected ? c.BORDER_FOCUSED_ALPHA : c.BORDER_UNFOCUSED_ALPHA;
      const borderThickness = isSelected ? c.BORDER_FOCUSED_THICKNESS : c.BORDER_UNFOCUSED_THICKNESS;

      bg.lineStyle(borderThickness, borderColor, borderAlpha);
      bg.strokeRect(-borderWidth / 2, -c.HEIGHT / 2, borderWidth, c.HEIGHT);
    });

    this.updateChallengeDescTooltip();
  }

  private clearChallengeSelectionHighlight(): void {
    if (this.challengeItemBgs.length === 0) {
      return;
    }

    const c = this.CHALLENGE_ITEM;
    const borderWidth = c.WIDTH - c.BORDER_MARGIN_H * 2;

    this.challengeItemBgs.forEach((bg) => {
      bg.clear();
      bg.lineStyle(c.BORDER_UNFOCUSED_THICKNESS, c.BORDER_UNFOCUSED_COLOR, c.BORDER_UNFOCUSED_ALPHA);
      bg.strokeRect(-borderWidth / 2, -c.HEIGHT / 2, borderWidth, c.HEIGHT);
    });
  }

  private hideCustomTooltip(): void {
    if (this.tooltipScrollTween) {
      this.tooltipScrollTween.remove();
      this.tooltipScrollTween = null;
    }

    if (this.customTooltipContainer) {
      if (this.customTooltipContainer.parentContainer) {
        this.customTooltipContainer.parentContainer.remove(this.customTooltipContainer);
      }
      this.customTooltipContainer.destroy();
      this.customTooltipContainer = null;
    }

    if (this.tooltipMaskGraphics) {
      this.tooltipMaskGraphics.destroy();
      this.tooltipMaskGraphics = null;
    }

    this.challengeNavigationActive = false;
    this.tooltipChallenges = [];
    this.tooltipSelectedIndex = 0;
    this.tooltipSelectedColumn = 0;
    this.tooltipSelectedRow = 0;
    this.tooltipColumnItemCounts = [];
    this.tooltipColumnCount = 1;
    this.challengeItemContainers = [];
    this.challengeItemBgs = [];
    this.tooltipDetailsButton = null;
    this.tooltipBackButton = null;
    this.challengeHeaderText = null;

    this.challengeDescTooltipContainer = null;
    this.challengeDescTooltipBg = null;
    this.challengeDescTooltipTitleBar = null;
    this.challengeDescTooltipRarityBar = null;
    this.challengeDescTooltipTitle = null;
    this.challengeDescTooltipRarity = null;
    this.challengeDescTooltipDesc = null;

    this.customTooltipText = null;
    this.mainTooltipHeight = 0;
  }

  private enterChallengeNavigationMode(): void {
    this.challengeNavigationActive = true;
    this.tooltipSelectedIndex = 0;
    this.tooltipSelectedColumn = 0;
    this.tooltipSelectedRow = 0;

    if (this.tooltipDetailsButton) {
      this.tooltipDetailsButton.setVisible(false);
    }

    if (this.tooltipBackButton) {
      this.tooltipBackButton.setVisible(true);
    }

    this.updateChallengeSelection();

    this.scene.ui.playSelect();
  }

  private exitChallengeNavigationMode(): void {
    this.challengeNavigationActive = false;

    if (this.tooltipDetailsButton) {
      this.tooltipDetailsButton.setVisible(true);
    }
    if (this.tooltipBackButton) {
      this.tooltipBackButton.setVisible(false);
    }

    if (this.challengeDescTooltipContainer) {
      this.challengeDescTooltipContainer.setVisible(false);
    }

    this.clearChallengeSelectionHighlight();

    this.scene.ui.playSelect();
  }

  private createDetailsButton(tooltipWidth: number, tooltipHeight: number, padding: number): void {
    if (!this.customTooltipContainer) return;

    const buttonY = tooltipHeight - padding - 4;
    const buttonX = tooltipWidth / 2;

    this.tooltipDetailsButton = this.scene.add.container(buttonX, buttonY);

    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad") {
      gamepadType = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if (this.scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = this.scene.inputMethod || "keyboard";
    }

    let iconPath: string;
    const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
    if (!isGamepad) {
      iconPath = "E.png";
    } else {
      iconPath = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_ABILITY") || "E.png";
    }

    const keySprite = this.scene.add.sprite(-12, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(isGamepad ? 0.62 : 0.5);
    keySprite.setOrigin(0.5, 0.5);

    const detailsLabel = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("nodeMode:tooltipDetails", { defaultValue: "DETAILS" }),
      TextStyle.WINDOW,
      { fontSize: '35px' }
    );
    detailsLabel.setOrigin(0.5, 0.5);

    this.tooltipDetailsButton.add([keySprite, detailsLabel]);
    this.customTooltipContainer.add(this.tooltipDetailsButton);

    this.tooltipBackButton = this.scene.add.container(buttonX, buttonY);

    const backIconPath = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CANCEL") || "BACK.png";

    const backKeySprite = this.scene.add.sprite(-10, 0, gamepadType);
    backKeySprite.setFrame(backIconPath);
    backKeySprite.setScale(isGamepad ? 0.62 : 0.5);
    backKeySprite.setOrigin(0.5, 0.5);

    const backLabel = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("nodeMode:tooltipBack", { defaultValue: "Back" }),
      TextStyle.WINDOW,
      { fontSize: '35px' }
    );
    backLabel.setOrigin(0, 0.5);
    backLabel.x = backKeySprite.x + (backKeySprite.displayWidth / 2) + 1;

    this.tooltipBackButton.add([backKeySprite, backLabel]);
    this.tooltipBackButton.setVisible(false);
    this.customTooltipContainer.add(this.tooltipBackButton);
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
      [PathNodeType.COLLECTED_SHOP]: "collectedShop",
      [PathNodeType.EXP_SHARE]: "expShare",
      [PathNodeType.TYPE_SWITCHER]: "typeSwitcher",
      [PathNodeType.PASSIVE_ABILITY]: "passiveAbility",
      [PathNodeType.ANY_TMS]: "anyTms",

      [PathNodeType.TERA_SHARDS]: "teraShards",
      [PathNodeType.CHALLENGE_BOSS]: "challengeBoss",
      [PathNodeType.CHALLENGE_RIVAL]: "challengeRival",
      [PathNodeType.CHALLENGE_EVIL_BOSS]: "challengeEvilBoss",
      [PathNodeType.CHALLENGE_CHAMPION]: "challengeChampion",
      [PathNodeType.CHALLENGE_REWARD]: "challengeReward",
      [PathNodeType.GREAT_BALL_ITEMS]: "greatBallItems",
      [PathNodeType.ULTRA_BALL_ITEMS]: "ultraBallItems",
      [PathNodeType.HEAL_ITEMS]: "potion",
      [PathNodeType.REVIVER_SEED]: "reviverSeed",
      [PathNodeType.SACRED_ASH]: "sacredAsh",
      [PathNodeType.SHELL_BELL]: "shellBell",
      [PathNodeType.LEFTOVERS]: "leftovers",
      [PathNodeType.QUICK_CLAW]: "quickClaw",
      [PathNodeType.WIDE_LENS]: "wideLens",
      [PathNodeType.GRIP_CLAW]: "gripClaw",
      [PathNodeType.EVIOLITE]: "eviolite",
      [PathNodeType.SCOPE_LENS]: "scopeLens",
      [PathNodeType.VITAMIN]: "vitamin",
      [PathNodeType.MOVE_UPGRADE]: "moveUpgrade",
      [PathNodeType.LOW_TIER_MOVE_UPGRADE]: "lowTierMoveUpgrade",
      [PathNodeType.SKILL_POINT]: "skillPoints",
      [PathNodeType.SKILL_TOKEN]: "skillToken"
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
      case PathNodeType.RIVAL_BATTLE: return { key: "smitems", frame: "permaPostBattleMoney", scale: 0.20 };
      case PathNodeType.MAJOR_BOSS_BATTLE: return { key: "items", frame: "cornerstone_mask", scale: 0.35 };
      case PathNodeType.RECOVERY_BOSS: return { key: "items", frame: "hearthflame_mask", scale: 0.35 };
      case PathNodeType.EVIL_BOSS_BATTLE: return { key: "smitems", frame: "smittyMask", scale: 0.15 };
      case PathNodeType.ELITE_FOUR: return { key: "items", frame: "muscle_band", scale: 0.35 };
      case PathNodeType.CHAMPION: return { key: "items", frame: "kings_rock", scale: 0.35 };
      case PathNodeType.ITEM_GENERAL: return { key: "smitems", frame: "permaShowRewards", scale: 0.20 };
      case PathNodeType.ADD_POKEMON: return { key: "smitems", frame: "draftMode", scale: 0.20 };
      case PathNodeType.ITEM_TM: return { key: "items", frame: "tm_normal", scale: 0.32 };
      case PathNodeType.ITEM_BERRY: return { key: "items", frame: "sitrus_berry", scale: 0.35 };
      case PathNodeType.MYSTERY_NODE: return { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.15 };
      case PathNodeType.CONVERGENCE_POINT: return { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.15 };
      case PathNodeType.SMITTY_BATTLE: return this.getSmittyTrainerSprite(node);
      case PathNodeType.EVIL_GRUNT_BATTLE: return { key: "items", frame: "thick_club", scale: 0.35 };
      case PathNodeType.EVIL_ADMIN_BATTLE: return { key: "items", frame: "malicious_armor", scale: 0.35 };
      case PathNodeType.RAND_PERMA_ITEM: return { key: "smitems", frame: "glitchModSoul", scale: 0.15 };
      case PathNodeType.PERMA_ITEMS: return { key: "smitems", frame: "permaMetronomeLevelup", scale: 0.15 };
      case PathNodeType.GOLDEN_POKEBALL: return { key: "items", frame: "pb_gold", scale: 0.35 };
      case PathNodeType.ROGUE_BALL_ITEMS: return { key: "items", frame: "rb", scale: 0.35 };
      case PathNodeType.GREAT_BALL_ITEMS: return { key: "items", frame: "gb", scale: 0.35 };
      case PathNodeType.ULTRA_BALL_ITEMS: return { key: "items", frame: "ub", scale: 0.35 };
      case PathNodeType.MASTER_BALL_ITEMS: return { key: "items", frame: "mb", scale: 0.35 };
      case PathNodeType.ABILITY_SWITCHERS: return { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.15 };
      case PathNodeType.STAT_SWITCHERS: return { key: "smitems", frame: "glitchStatSwitch", scale: 0.20 };
      case PathNodeType.GLITCH_PIECE: return { key: "smitems", frame: "glitchPiece", scale: 0.15 };
      case PathNodeType.DNA_SPLICERS: return { key: "items", frame: "dna_splicers", scale: 0.4 };
      case PathNodeType.MONEY: return { key: "smitems", frame: "battleMoney", scale: 0.15 };
      case PathNodeType.PERMA_MONEY: return { key: "smitems", frame: "permaMoney", scale: 0.15 };
      case PathNodeType.RELEASE_ITEMS: return { key: "smitems", frame: "modPokeSacrifice", scale: 0.15 };
      case PathNodeType.MINTS: return { key: "items", frame: "mint_neutral", scale: 0.35 };
      case PathNodeType.EGG_VOUCHER: return { key: "items", frame: "coupon", scale: 0.35 };
      case PathNodeType.PP_MAX: return { key: "items", frame: "pp_max", scale: 0.35 };
      case PathNodeType.COLLECTED_TYPE: return { key: "smitems", frame: "modSoulCollected", scale: 0.15 };
      case PathNodeType.COLLECTED_SHOP: return { key: "smitems", frame: "permaTrainerSnatchCost", scale: 0.15 };
      case PathNodeType.EXP_SHARE: return { key: "items", frame: "exp_share", scale: 0.35 };
      case PathNodeType.TYPE_SWITCHER: return { key: "smitems", frame: "glitchTypeSwitch", scale: 0.15 };
      case PathNodeType.PASSIVE_ABILITY: return { key: "smitems", frame: "modPassiveAbility", scale: 0.15 };
      case PathNodeType.ANY_TMS: return { key: "smitems", frame: "glitchTm", scale: 0.15 };

      case PathNodeType.TERA_SHARDS: return { key: "items", frame: "stellar_tera_shard", scale: 0.35 };
      case PathNodeType.CHALLENGE_BOSS: return { key: "smitems", frame: "glitchCommandSeal", scale: 0.15 };
      case PathNodeType.CHALLENGE_RIVAL: return { key: "smitems", frame: "glitchCommandSeal", scale: 0.15 };
      case PathNodeType.CHALLENGE_EVIL_BOSS: return { key: "smitems", frame: "glitchCommandSeal", scale: 0.15 };
      case PathNodeType.CHALLENGE_CHAMPION: return { key: "smitems", frame: "glitchCommandSeal", scale: 0.15 };
      case PathNodeType.CHALLENGE_REWARD: return { key: "items", frame: "master_ribbon", scale: 0.35 };
      case PathNodeType.HEAL_ITEMS: return { key: "items", frame: "potion", scale: 0.35 };
      case PathNodeType.REVIVER_SEED: return { key: "items", frame: "reviver_seed", scale: 0.35 };
      case PathNodeType.SACRED_ASH: return { key: "items", frame: "sacred_ash", scale: 0.35 };
      case PathNodeType.SHELL_BELL: return { key: "items", frame: "shell_bell", scale: 0.35 };
      case PathNodeType.LEFTOVERS: return { key: "items", frame: "leftovers", scale: 0.35 };
      case PathNodeType.QUICK_CLAW: return { key: "items", frame: "quick_claw", scale: 0.35 };
      case PathNodeType.WIDE_LENS: return { key: "items", frame: "wide_lens", scale: 0.35 };
      case PathNodeType.GRIP_CLAW: return { key: "items", frame: "grip_claw", scale: 0.35 };
      case PathNodeType.EVIOLITE: return { key: "items", frame: "eviolite", scale: 0.35 };
      case PathNodeType.SCOPE_LENS: return { key: "items", frame: "scope_lens", scale: 0.35 };
      case PathNodeType.VITAMIN: return { key: "items", frame: "protein", scale: 0.35 };
      case PathNodeType.MOVE_UPGRADE: return { key: "smitems", frame: "smittyShard", scale: 0.15 };
      case PathNodeType.LOW_TIER_MOVE_UPGRADE: return { key: "smitems", frame: "smittyVoid", scale: 0.15 };
      case PathNodeType.SKILL_POINT: return { key: "items", frame: "ribbon_gen9", scale: 0.35 };
      case PathNodeType.SKILL_TOKEN: return { key: "smitems", frame: "permaMoreRevive", scale: 0.20 };
      default: return { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.15 };
    }
  }

  private getSmittyTrainerSprite(node?: any): NodeSprite {
    let variantIndex = 0;
    if (node && node.metadata && node.metadata.smittyVariantIndex !== undefined) {
      variantIndex = node.metadata.smittyVariantIndex;
    }

    const frameNumber = (variantIndex + 1).toString();

    return { key: "smitty_trainers", frame: frameNumber, scale: 0.08 };
  }

  private async ensureSmittyTrainersLoaded(): Promise<void> {
    if (this.smittyTrainersLoaded || this.scene.textures.exists("smitty_trainers")) {
      this.smittyTrainersLoaded = true;
      return;
    }

    return new Promise((resolve) => {
      (this.scene as BattleScene).loadAtlas("smitty_trainers", "smittytrainers");
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.smittyTrainersLoaded = true;
        resolve();
      });
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private async ensureTrainerSpritesLoaded(): Promise<void> {
    if (this.trainerSpritesLoaded || this.scene.textures.exists("unknown_m")) {
      this.trainerSpritesLoaded = true;
      return;
    }

    return new Promise((resolve) => {
      (this.scene as BattleScene).loadAtlas("unknown_m", "trainer");
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.trainerSpritesLoaded = true;
        resolve();
      });
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private async ensureBattlePathAssetsLoaded(): Promise<void> {
    if (isIPhone()) {
      await Promise.all([
        this.ensureSmittyTrainersLoaded(),
        this.ensureTrainerSpritesLoaded()
      ]);
    }
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
      [PathNodeType.COLLECTED_SHOP]: "collectedShop",
      [PathNodeType.EXP_SHARE]: "expShare",
      [PathNodeType.TYPE_SWITCHER]: "typeSwitcher",
      [PathNodeType.PASSIVE_ABILITY]: "passiveAbility",
      [PathNodeType.ANY_TMS]: "anyTms",

      [PathNodeType.TERA_SHARDS]: "teraShards",
      [PathNodeType.CHALLENGE_BOSS]: "challengeBoss",
      [PathNodeType.CHALLENGE_RIVAL]: "challengeRival",
      [PathNodeType.CHALLENGE_EVIL_BOSS]: "challengeEvilBoss",
      [PathNodeType.CHALLENGE_CHAMPION]: "challengeChampion",
      [PathNodeType.CHALLENGE_REWARD]: "challengeReward",
      [PathNodeType.GREAT_BALL_ITEMS]: "greatBallItems",
      [PathNodeType.ULTRA_BALL_ITEMS]: "ultraBallItems",
      [PathNodeType.HEAL_ITEMS]: "potion",
      [PathNodeType.REVIVER_SEED]: "reviverSeed",
      [PathNodeType.SACRED_ASH]: "sacredAsh",
      [PathNodeType.SHELL_BELL]: "shellBell",
      [PathNodeType.LEFTOVERS]: "leftovers",
      [PathNodeType.QUICK_CLAW]: "quickClaw",
      [PathNodeType.WIDE_LENS]: "wideLens",
      [PathNodeType.GRIP_CLAW]: "gripClaw",
      [PathNodeType.EVIOLITE]: "eviolite",
      [PathNodeType.SCOPE_LENS]: "scopeLens",
      [PathNodeType.VITAMIN]: "vitamin",
      [PathNodeType.MOVE_UPGRADE]: "moveUpgrade",
      [PathNodeType.LOW_TIER_MOVE_UPGRADE]: "lowTierMoveUpgrade",
      [PathNodeType.SKILL_POINT]: "skillPoints",
      [PathNodeType.SKILL_TOKEN]: "skillToken"
    };

    const key = nameKeys[nodeType];
    if (key) {
      return i18next.t(`nodeMode:names.${key}`);
    }
    return i18next.t("nodeMode:unknownNode");
  }

  processInput(button: Button): boolean {
    if (this.inputBlocked) {
      return true;
    }

    const ui = this.getUi();

    if (this.challengeNavigationActive) {
      switch (button) {
        case Button.UP:
          if (this.tooltipSelectedRow > 0) {
            this.tooltipSelectedRow--;
            this.tooltipSelectedIndex = this.getLinearIndexFromColumnRow(this.tooltipSelectedColumn, this.tooltipSelectedRow);
            this.updateChallengeSelection();
            this.scene.ui.playSelect();
          }
          return true;
        case Button.DOWN:
          if (this.tooltipSelectedRow < this.tooltipColumnItemCounts[this.tooltipSelectedColumn] - 1) {
            this.tooltipSelectedRow++;
            this.tooltipSelectedIndex = this.getLinearIndexFromColumnRow(this.tooltipSelectedColumn, this.tooltipSelectedRow);
            this.updateChallengeSelection();
            this.scene.ui.playSelect();
          }
          return true;
        case Button.LEFT:
          if (this.tooltipColumnCount > 1 && this.tooltipSelectedColumn > 0) {
            this.tooltipSelectedColumn--;
            this.tooltipSelectedRow = Math.min(this.tooltipSelectedRow, this.tooltipColumnItemCounts[this.tooltipSelectedColumn] - 1);
            this.tooltipSelectedIndex = this.getLinearIndexFromColumnRow(this.tooltipSelectedColumn, this.tooltipSelectedRow);
            this.updateChallengeSelection();
            this.scene.ui.playSelect();
          }
          return true;
        case Button.RIGHT:
          if (this.tooltipColumnCount > 1 && this.tooltipSelectedColumn < this.tooltipColumnCount - 1) {
            this.tooltipSelectedColumn++;
            this.tooltipSelectedRow = Math.min(this.tooltipSelectedRow, this.tooltipColumnItemCounts[this.tooltipSelectedColumn] - 1);
            this.tooltipSelectedIndex = this.getLinearIndexFromColumnRow(this.tooltipSelectedColumn, this.tooltipSelectedRow);
            this.updateChallengeSelection();
            this.scene.ui.playSelect();
          }
          return true;
        case Button.CANCEL:
          this.exitChallengeNavigationMode();
          return true;
        case Button.ACTION:
          return true;
      }
      return true;
    }

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
      case Button.CYCLE_ABILITY:
        if (this.customTooltipContainer && this.tooltipChallenges.length > 0) {
          this.enterChallengeNavigationMode();
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
        try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3"); } catch {}
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
        try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3"); } catch {}
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
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3"); } catch {}
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
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3"); } catch {}
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
    if (Overrides.BATTLE_PATH_SHOW_ALL_WAVES_OVERRIDE) {
      return Infinity;
    }
    const effectiveWave = Math.max(this.currentWave, this.scene.battlePathWave || 1);
    const current500Segment = Math.floor((effectiveWave - 1) / 500);
    const segmentStart = current500Segment * 500 + 1;

    const positionInSegment = effectiveWave - segmentStart + 1;

    const current30Segment = Math.ceil(positionInSegment / 30);
    const max30WaveInSegment = current30Segment * 30;

    const max30WaveLimit = segmentStart + max30WaveInSegment - 1;

    let max500WaveLimit = Infinity;
    if (effectiveWave % 500 !== 0) {
      max500WaveLimit = Math.ceil(effectiveWave / 500) * 500 - 1;
    }

    const maxWave = Math.min(max30WaveLimit, max500WaveLimit);
    return maxWave;
  }

  private setupMouseDrag(): void {
    if (!this.pathContainer || this.pathContainer.input) {
      return;
    }

    const modalWidth = this.getWidth();
    const modalHeight = this.getHeight();
    this.pathContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, modalWidth - 10, modalHeight - 40),
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
    const battlePath = getCurrentBattlePath();
    if (!battlePath) {
      return [];
    }

    if (Overrides.BATTLE_PATH_BYPASS_NODE_VALIDATION_OVERRIDE) {
      const allNodeIds: string[] = [];
      battlePath.waveToNodeMap.forEach((nodes) => {
        nodes.forEach(node => allNodeIds.push(node.id));
      });
      return allNodeIds;
    }

    const selectedPath = this.scene.gameData?.selectedPath;

    if (!selectedPath) {
      const currentWave = this.scene.battlePathWave || 1;

      if (currentWave === 1) {
        const wave1Nodes = battlePath.waveToNodeMap.get(1) || [];
        return wave1Nodes.map(node => node.id);
      }

      const battlePathStartWave = Math.min(...Array.from(battlePath.waveToNodeMap.keys()));
      if (currentWave === battlePathStartWave && currentWave > 1) {
        const startNodes = battlePath.waveToNodeMap.get(battlePathStartWave) || [];
        return startNodes.map(node => node.id);
      }

      if ((currentWave - 1) % 1000 === 0) {
        const nodesAtCurrentWave = battlePath.waveToNodeMap.get(currentWave) || [];
        return nodesAtCurrentWave.map(node => node.id);
      }

      const lastBattleNodeWave = this.scene.lastBattleNodeWave || 0;
      const expectedWave = Math.max(lastBattleNodeWave + 1, battlePathStartWave);
      const nodesAtExpectedWave = battlePath.waveToNodeMap.get(expectedWave) || [];
      if (nodesAtExpectedWave.length > 0) {
        if (this.scene.battlePathWave !== expectedWave) {
          this.scene.battlePathWave = expectedWave;
          this.scene.gameData.localSaveAll(this.scene);
        }
        return nodesAtExpectedWave.map(node => node.id);
      }

      console.warn("No previously selected path found for wave validation");
      return [];
    }

    let previouslySelectedNode = battlePath.nodeMap.get(selectedPath);
    if (!previouslySelectedNode) {
      previouslySelectedNode = findNodeByPattern(battlePath, selectedPath);
      if (!previouslySelectedNode) {
        console.warn(`Previously selected node ${selectedPath} not found in battle path (even by pattern)`);
        return [];
      }
    }

    const currentBattleWave = this.scene.currentBattle?.waveIndex ?? 0;
    if (currentBattleWave < previouslySelectedNode.wave) {
      const pendingWave = previouslySelectedNode.wave;
      if (this.scene.battlePathWave !== pendingWave) {
        this.scene.battlePathWave = pendingWave;
        this.scene.gameData.localSaveAll(this.scene);
      }
      return [previouslySelectedNode.id];
    }

    const pathContext = (this.scene as any).pathNodeContext as PathNodeContext | null | undefined;
    if (this.scene.battlePathWave === previouslySelectedNode.wave && pathContext !== null && pathContext !== undefined && pathContext !== PathNodeContext.BATTLE_NODE) {
      const currentBattleWave = this.scene.currentBattle?.waveIndex ?? 0;
      if (currentBattleWave < previouslySelectedNode.wave) {
        return [previouslySelectedNode.id];
      }
    }

    const expectedWave = previouslySelectedNode.wave + 1;

    if (expectedWave > battlePath.totalWaves) {
      const pendingWave = previouslySelectedNode.wave;
      if (this.scene.battlePathWave !== pendingWave) {
        this.scene.battlePathWave = pendingWave;
        this.scene.gameData.localSaveAll(this.scene);
      }
      return [previouslySelectedNode.id];
    }

    if (this.scene.battlePathWave !== expectedWave) {
      this.scene.battlePathWave = expectedWave;
      this.scene.gameData.localSaveAll(this.scene);
    }

    const availableNodeIds: string[] = [];
    const nodesAtCurrentWave = battlePath.waveToNodeMap.get(expectedWave) || [];

    for (const currentWaveNode of nodesAtCurrentWave) {
      if (previouslySelectedNode.connections && (previouslySelectedNode.connections.includes(currentWaveNode.id) || hasConnectionByPattern(previouslySelectedNode.connections, currentWaveNode.id))) {
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

    let previouslySelectedNode = battlePath.nodeMap.get(selectedPath);
    if (!previouslySelectedNode) {
      previouslySelectedNode = findNodeByPattern(battlePath, selectedPath);
    }

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

    let previouslySelectedNode = battlePath.nodeMap.get(selectedPath);
    if (!previouslySelectedNode) {
      previouslySelectedNode = findNodeByPattern(battlePath, selectedPath);
    }

    return previouslySelectedNode || null;
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
        let selectedNode = battlePath.nodeMap.get(selectedPath);
        if (!selectedNode) {
          selectedNode = findNodeByPattern(battlePath, selectedPath);
        }
        if (selectedNode && selectedNode.connections && (selectedNode.connections.includes(node.id) || hasConnectionByPattern(selectedNode.connections, node.id))) {
          return true;
        }
      }
    }

    return false;
  }
}