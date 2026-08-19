import BattleScene from "../battle-scene";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import { WindowVariant, addWindow } from "./ui-theme";
import {Button} from "../enums/buttons";
import { MODAL_BG, MODAL_BG_PATTERN } from "./modal-background-utils";

export interface ModalConfig {
  buttonActions: Function[];
}

export abstract class ModalUiHandler extends UiHandler {

  static readonly MODAL_BG = MODAL_BG;
  static readonly MODAL_BG_PATTERN = MODAL_BG_PATTERN;

  protected modalContainer: Phaser.GameObjects.Container;
  protected modalBg: Phaser.GameObjects.NineSlice;
  protected titleText: Phaser.GameObjects.Text;
  protected buttonContainers: Phaser.GameObjects.Container[];
  protected buttonBgs: Phaser.GameObjects.NineSlice[];
  private modalBgLayers: Phaser.GameObjects.Graphics[] = [];
  private modalCorners: Phaser.GameObjects.Image[] = [];
  protected alphaMultiplier: number = 1.0;
  protected gridInc: number = 0;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);

    this.buttonContainers = [];
    this.buttonBgs = [];
  }

  abstract getModalTitle(config?: ModalConfig): string;

  abstract getWidth(config?: ModalConfig): number;

  abstract getHeight(config?: ModalConfig): number;

  abstract getMargin(config?: ModalConfig): [number, number, number, number];

  abstract getButtonLabels(config?: ModalConfig): string[];

  getButtonTopMargin(): number {
    return 0;
  }

  protected getModalAlpha(baseAlpha: number): number {
    return baseAlpha * this.alphaMultiplier;
  }

  setup() {
    const ui = this.getUi();

    this.modalContainer = this.scene.add.container(0, 0);

    this.modalContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    this.modalBg = addWindow(this.scene, 0, 0, 0, 0);

    this.modalContainer.add(this.modalBg);

    this.titleText = addTextObject(this.scene, 0, 4, "", TextStyle.SETTINGS_LABEL);
    this.titleText.setOrigin(0.5, 0);

    this.modalContainer.add(this.titleText);

    ui.add(this.modalContainer);

    const buttonLabels = this.getButtonLabels();

    const buttonTopMargin = this.getButtonTopMargin();

    for (const label of buttonLabels) {
      const buttonLabel = addTextObject(this.scene, 0, 0, label, TextStyle.TOOLTIP_CONTENT);
      buttonLabel.setOrigin(0.5, 0.5);

      const borderSize = this.scene.uiTheme ? 6 : 8;
      const textHeight = Math.ceil(buttonLabel.displayHeight);
      const buttonHeight = Math.max(borderSize * 2 + 4, textHeight + 4);
      buttonLabel.setY(buttonHeight / 2);
      const buttonBg = addWindow(this.scene, 0, 0, buttonLabel.getBounds().width + 12, buttonHeight, false, false, 0, 0, WindowVariant.XTHIN);
      buttonBg.setOrigin(0.5, 0);
      buttonBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, buttonBg.width, buttonBg.height), Phaser.Geom.Rectangle.Contains);

      const buttonContainer = this.scene.add.container(0, buttonTopMargin);

      this.buttonBgs.push(buttonBg);
      this.buttonContainers.push(buttonContainer);

      buttonContainer.add(buttonBg);
      buttonContainer.add(buttonLabel);
      this.modalContainer.add(buttonContainer);
    }

    this.modalContainer.setVisible(false);
  }
  protected ensureModalBackground(): void {
    if (this.modalBgLayers.length === 0) {
      this.createModalBackground();
    }
  }

  show(args: any[]): boolean {
    if (args.length >= 1 && "buttonActions" in args[0]) {
      super.show(args);

      const config = args[0] as ModalConfig;
      const modifiedConfig = this.modifyButtonActions(config, ...args);

      this.updateContainer(config);

      try { this.ensureModalBackground(); } catch {}

      this.modalContainer.setVisible(true);

      this.getUi().moveTo(this.modalContainer, this.getUi().length - 1);

      for (let a = 0; a < this.buttonBgs.length; a++) {
        if (a < this.buttonBgs.length) {
          this.buttonBgs[a].on("pointerdown", (_) => modifiedConfig.buttonActions[a]());
        }
      }

      return true;
    }

    return false;
  }

  protected modifyButtonActions(config: ModalConfig, ...args: any[]): ModalConfig {
    return config;
  }

  updateContainer(config?: ModalConfig): void {
    const [ marginTop, marginRight, marginBottom, marginLeft ] = this.getMargin(config);

    const [ width, height ] = [ this.getWidth(config), this.getHeight(config) ];
    const posX = (((this.scene.game.canvas.width / 6) - (width + (marginRight - marginLeft))) / 2);
    const posY = (((-this.scene.game.canvas.height / 6) - (height + (marginBottom - marginTop))) / 2);
    this.modalContainer.setPosition(posX, posY);

    this.modalBg.setSize(width, height);
    this.clearModalBackgrounds();
    this.createModalBackground();
    this.createModalCorners(width, height);

    const title = this.getModalTitle(config);

    this.titleText.setText(title);
    this.titleText.setX(width / 2);
    this.titleText.setVisible(!!title);

    for (let b = 0; b < this.buttonContainers.length; b++) {
      const sliceWidth = width / (this.buttonContainers.length + 1);

      this.buttonContainers[b].setPosition(sliceWidth * (b + 1), this.modalBg.height - (this.buttonBgs[b].height + 8));
    }
  }

  processInput(button: Button): boolean {
    return false;
  }

  clear() {
    super.clear();
    this.modalContainer.setVisible(false);

    this.buttonBgs.map(bg => bg.off("pointerdown"));
    this.clearModalBackgrounds();
    this.modalCorners.forEach(corner => corner.destroy());
    this.modalCorners = [];
  }
  protected getModalBounds() {
    const width = this.getWidth();
    const height = this.getHeight();
    const bgX = 0;
    const bgY = 0;
    const bgWidth = width;
    const bgHeight = height;
    return { bgX, bgY, bgWidth, bgHeight };
  }

  protected addModalBackgroundLayer(draw: (g: Phaser.GameObjects.Graphics, bounds: { bgX: number; bgY: number; bgWidth: number; bgHeight: number }) => void): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const bounds = this.getModalBounds();
    draw(g, bounds);

    let container: any;
    try {
      container = (this as any).getBackgroundContainer?.();
    } catch { }
    if (!container) container = this.modalContainer;

    if (container && typeof container.add === "function") {
      container.add(g);

      try {
        const list: any[] = (container as any).list || [];
        const modalBgIndex = (container === this.modalContainer && this.modalBg) ? list.indexOf(this.modalBg) : -1;
        const targetIndex = modalBgIndex >= 0 ? modalBgIndex + 1 : 0;
        if (typeof (container as any).moveTo === "function") {
          (container as any).moveTo(g, targetIndex);
        } else if (typeof (container as any).addAt === "function") {

          (container as any).remove(g);
          (container as any).addAt(g, targetIndex);
        }
      } catch { }
    } else {

      (this.modalContainer as any)?.add?.(g);
    }
    this.modalBgLayers.push(g);
    return g;
  }
  protected getBackgroundContainer(): Phaser.GameObjects.Container {

    return this.modalContainer;
  }

  protected clearModalBackgrounds(): void {
    this.modalBgLayers.forEach(layer => layer.destroy());
    this.modalBgLayers = [];
  }

  private createModalCorners(width: number, height: number): void {
    return;
    this.modalCorners.forEach(corner => corner.destroy());
    this.modalCorners = [];

    if (this.scene.windowType < 1 || this.scene.windowType > 5) {
      return;
    }
    const proportionalSize = Math.floor(Math.min(width, height) * 0.15);
    const minCornerSize = 8;
    const maxCornerSize = 20;

    const actualCornerSize = Math.max(minCornerSize, Math.min(proportionalSize, maxCornerSize));

    const windowX = this.modalBg.x;
    const windowY = this.modalBg.y;

    const cornerConfigs = [
      { texture: 'corner_tl', x: windowX, y: windowY },
      { texture: 'corner_tr', x: windowX + width - actualCornerSize, y: windowY },
      { texture: 'corner_bl', x: windowX, y: windowY + height - actualCornerSize },
      { texture: 'corner_br', x: windowX + width - actualCornerSize, y: windowY + height - actualCornerSize }
    ];

    cornerConfigs.forEach((config) => {
      try {
        const corner = this.scene.add.image(config.x, config.y, config.texture);
        corner.setOrigin(0, 0);
        corner.setDisplaySize(actualCornerSize, actualCornerSize);
        this.modalContainer.add(corner);
        this.modalContainer.bringToTop(corner);
        this.modalCorners.push(corner);
      } catch (error) {
        console.error('[createModalCorners] Error:', error);
      }
    });
  }

  private drawPattern1(g: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: any): void {
    const gridSize = 11 + this.gridInc;
    g.lineStyle(
      1,
      ModalUiHandler.MODAL_BG_PATTERN.COLOR,
      this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT * 0.275)
    );

    for (let x = bgX; x <= bgX + bgWidth; x += gridSize) {
      g.lineBetween(x, bgY, x, bgY + bgHeight);
    }

    for (let y = bgY; y <= bgY + bgHeight; y += gridSize) {
      g.lineBetween(bgX, y, bgX + bgWidth, y);
    }

    for (let i = 0; i < 60; i++) {
      const x = bgX + Math.floor(Math.random() * (bgWidth / gridSize)) * gridSize;
      const y = bgY + Math.floor(Math.random() * (bgHeight / gridSize)) * gridSize;
      const intensity = this.getModalAlpha((ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT / 2
        + Math.random() * (0.02)) * 0.7);

      g.fillStyle(ModalUiHandler.MODAL_BG_PATTERN.ACCENT_COLOR, intensity);
      g.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
    }
  }

  private drawPattern2(g: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: any): void {
    g.fillStyle(ModalUiHandler.MODAL_BG.PRIMARY_COLOR, this.getModalAlpha(ModalUiHandler.MODAL_BG.ALPHA));
    g.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, ModalUiHandler.MODAL_BG.RADIUS);
  }

  private drawPattern3(g: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: any): void {
    for (let i = 0; i < 8; i++) {
      const centerX = bgX + Math.random() * bgWidth;
      const centerY = bgY + Math.random() * bgHeight;
      const baseRadius = 15 + Math.random() * 25;

      g.fillStyle(
        ModalUiHandler.MODAL_BG_PATTERN.COLOR,
        this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT)
      );
      g.beginPath();
      const numPoints = 12;
      for (let j = 0; j < numPoints; j++) {
        const angle = (j / numPoints) * Math.PI * 2;
        const radiusVariation = 0.7 + Math.random() * 0.6;
        const radius = baseRadius * radiusVariation;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (j === 0) {
          g.moveTo(x, y);
        } else {
          g.lineTo(x, y);
        }
      }
      g.closePath();
      g.fillPath();
    }
  }

  private drawPattern4(g: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: any): void {
    for (let i = 0; i < 20; i++) {
      const size = 3 + Math.random() * 5;
      const ellipseHorizontalRadius = size * 2;
      const ellipseVerticalRadius = size;
      const largestCircleRadius = size * 1.5;
      const margin = Math.max(ellipseHorizontalRadius, ellipseVerticalRadius, largestCircleRadius) + 3;
      const safeMinX = bgX + margin;
      const safeMaxX = bgX + bgWidth - margin;
      const safeMinY = bgY + margin;
      const safeMaxY = bgY + bgHeight - margin;
      if (safeMaxX <= safeMinX || safeMaxY <= safeMinY) continue;

      const x = safeMinX + Math.random() * (safeMaxX - safeMinX);
      const y = safeMinY + Math.random() * (safeMaxY - safeMinY);

      g.lineStyle(
        1,
        ModalUiHandler.MODAL_BG_PATTERN.COLOR,
        this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT)
      );
      g.strokeEllipse(x, y, size * 2, size);

      g.fillStyle(
        ModalUiHandler.MODAL_BG_PATTERN.COLOR,
        this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_SEMI)
      );
      g.fillCircle(x, y, size * 0.3);

      g.fillStyle(
        ModalUiHandler.MODAL_BG_PATTERN.COLOR,
        this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT * 0.5)
      );
      g.fillCircle(x, y, size * 1.5);
    }
  }

  private drawPattern5(g: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: any): void {
    const safetyMargin = 10;
    const maxX = bgX + bgWidth - safetyMargin;
    const maxY = bgY + bgHeight - safetyMargin;

    for (let i = 0; i < 6; i++) {
      let x = bgX + safetyMargin + Math.random() * (bgWidth - 2 * safetyMargin);
      let y = bgY + safetyMargin + Math.random() * (bgHeight - 2 * safetyMargin);
      const chainLength = 40 + Math.random() * 60;
      const linkSize = 6;
      const maxSteps = Math.floor((maxX - x) / linkSize);
      const actualChainLength = Math.min(chainLength, maxSteps * linkSize);

      g.lineStyle(
        2,
        ModalUiHandler.MODAL_BG_PATTERN.COLOR,
        this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT * 0.5)
      );

      const amplitude = 20;
      const frequency = 0.2;

      for (let j = 0; j < actualChainLength; j += linkSize) {
        const waveY = Math.sin(j * frequency) * amplitude;
        const nextX = x + linkSize;
        const nextY = y + waveY;
        if (nextX > maxX) break;
        const clampedNextY = Math.max(bgY + safetyMargin, Math.min(maxY, nextY));

        g.strokeEllipse((x + nextX) / 2, (y + clampedNextY) / 2, linkSize / 2, linkSize / 3);

        x = nextX;
        y = clampedNextY;
      }
      if (x <= maxX && y >= bgY + safetyMargin && y <= maxY) {
        g.lineStyle(
          3,
          ModalUiHandler.MODAL_BG_PATTERN.COLOR,
          this.getModalAlpha(ModalUiHandler.MODAL_BG_PATTERN.ALPHA_LIGHT)
        );
        g.strokeCircle(x, y, 8);
        g.strokeCircle(x, y, 5);
      }
    }
  }

  protected createModalBackground(): void {
    this.clearModalBackgrounds();
    this.addModalBackgroundLayer((g, b) => this.drawPattern1(g, b));
    this.addModalBackgroundLayer((g, b) => this.drawPattern2(g, b));

    this.addModalBackgroundLayer((g, b) => this.drawPattern4(g, b));
    this.addModalBackgroundLayer((g, b) => this.drawPattern5(g, b));
    this.addModalBackgroundLayer((g, b) => this.drawPattern2(g, b));

  }
}