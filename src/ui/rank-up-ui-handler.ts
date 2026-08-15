import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Button } from "../enums/buttons";
import { ModalUiHandler } from "./modal-ui-handler";
import { TextStyle, addTextObject, addBBCodeTextObject, getBBCodeFrag } from "./text";
import { addWindow, WindowVariant } from "./ui-theme";
import { Mode } from "./mode";
import { getUpgradeRarityColors } from "#app/utils";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";

export interface RankUpUiNodeModel {
  label: string;
  iconAtlasKey: string;
  iconFrame: string | number;
  iconScale?: number;
}

export interface RankUpUiOptionModel extends RankUpUiNodeModel {
  tooltipTitle: string;
  tooltipBody: string;
  tooltipSubtitle?: string;
  tooltipRarity?: SkillTreeRarity;
}

export interface RankUpUiConfig {
  title?: string;
  subtitle?: string;
  center: RankUpUiNodeModel;
  options: RankUpUiOptionModel[];
  onSelect: (choiceIndex: integer) => void | Promise<void>;
}

export default class RankUpUiHandler extends ModalUiHandler {
  private config: RankUpUiConfig | null = null;
  private inputLocked = false;

  private readonly MAX_OPTIONS = 3;
  private contentContainer: Phaser.GameObjects.Container;
  private connectionGraphics: Phaser.GameObjects.Graphics;
  private selectionGraphics: Phaser.GameObjects.Graphics;

  private centerContainer: Phaser.GameObjects.Container;
  private centerIcon: Phaser.GameObjects.Sprite;
  private centerLabel: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;

  private optionContainers: Phaser.GameObjects.Container[] = [];
  private optionHitAreas: Phaser.GameObjects.Rectangle[] = [];
  private optionIcons: Phaser.GameObjects.Sprite[] = [];
  private optionLabels: Phaser.GameObjects.Text[] = [];

  private tooltipContainer: Phaser.GameObjects.Container;
  private tooltipBg: Phaser.GameObjects.NineSlice;
  private tooltipTitleBarBg: Phaser.GameObjects.Graphics;
  private tooltipRarityBarBg: Phaser.GameObjects.Graphics;
  private tooltipTitleText: Phaser.GameObjects.Text;
  private tooltipSubtitleText: Phaser.GameObjects.Text;
  private tooltipBodyText: BBCodeText;

  private readonly NODE_BOX = { W: 90, H: 70 };
  private readonly TOOLTIP = {
    WIDTH: 120,
    TITLE_BAR_H: 12,
    RARITY_BAR_H: 6,
    PADDING: 6,
  };

  constructor(scene: BattleScene) {
    super(scene, Mode.RANK_UP);
  }

  getModalTitle(): string {
    return this.config?.title ?? i18next.t("battle:rankUpTitle", { defaultValue: "RANK UP" });
  }

  getWidth(): number {
    const optionCount = this.config?.options?.length ?? 2;
    return optionCount >= 3 ? 360 : 300;
  }

  getHeight(): number {
    const optionCount = this.config?.options?.length ?? 2;
    return optionCount >= 3 ? 210 : 190;
  }

  getMargin(): [number, number, number, number] {
    return [0, 0, 0, 0];
  }

  getButtonLabels(): string[] {
    return [];
  }

  setup(): void {
    super.setup();

    this.contentContainer = this.scene.add.container(0, 0);
    this.contentContainer.setName("rankUp-content");
    this.modalContainer.add(this.contentContainer);

    this.subtitleText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, {
      fontSize: "36px",
      align: "center",
      wordWrap: { width: this.getWidth() - 20 } as any,
    });
    this.subtitleText.setOrigin(0.5, 0);
    this.contentContainer.add(this.subtitleText);

    this.connectionGraphics = this.scene.add.graphics();
    this.connectionGraphics.setName("rankUp-connections");
    this.contentContainer.add(this.connectionGraphics);

    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setName("rankUp-selection");
    this.contentContainer.add(this.selectionGraphics);

    this.centerContainer = this.scene.add.container(0, 0);
    this.centerContainer.setName("rankUp-center");
    this.contentContainer.add(this.centerContainer);

    this.centerIcon = this.scene.add.sprite(0, 0, "pokemon_icons_glitch", "smitom");
    this.centerIcon.setScale(0.65);
    this.centerContainer.add(this.centerIcon);

    this.centerLabel = addTextObject(this.scene, 0, 18, "", TextStyle.WINDOW, {
      fontSize: "44px",
      align: "center",
    });
    this.centerLabel.setOrigin(0.5, 0);
    this.centerContainer.add(this.centerLabel);

    for (let i = 0; i < this.MAX_OPTIONS; i++) {
      const optionContainer = this.scene.add.container(0, 0);
      optionContainer.setName(`rankUp-option-${i}`);

      const bg = addWindow(
        this.scene,
        0,
        0,
        this.NODE_BOX.W,
        this.NODE_BOX.H,
        false,
        false,
        0,
        0,
        WindowVariant.XTHIN
      );
      bg.setOrigin(0.5, 0.5);
      optionContainer.add(bg);

      const hit = this.scene.add.rectangle(0, 0, this.NODE_BOX.W, this.NODE_BOX.H, 0xffffff, 0);
      hit.setOrigin(0.5, 0.5);
      hit.setInteractive({ useHandCursor: true });
      optionContainer.add(hit);

      const icon = this.scene.add.sprite(0, -10, "pokemon_icons_glitch", "smitom");
      icon.setScale(0.6);
      optionContainer.add(icon);

      const label = addTextObject(this.scene, 0, 20, "", TextStyle.WINDOW, {
        fontSize: "40px",
        align: "center",
      });
      label.setOrigin(0.5, 0);
      optionContainer.add(label);

      hit.on("pointerover", () => this.setCursor(i));
      hit.on("pointerdown", () => this.select(i));
      hit.on("pointerout", () => {

        if (this.cursor !== i) {
          this.hideTooltip();
        }
      });

      this.optionContainers.push(optionContainer);
      this.optionHitAreas.push(hit);
      this.optionIcons.push(icon);
      this.optionLabels.push(label);
      this.contentContainer.add(optionContainer);
    }

    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setName("rankUp-tooltip");
    this.tooltipContainer.setDepth(10000000000);

    this.tooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 167, 12, 12, 12, 12);
    this.tooltipBg.setOrigin(0, 0);
    this.tooltipContainer.add(this.tooltipBg);

    this.tooltipTitleBarBg = this.scene.add.graphics();
    this.tooltipContainer.add(this.tooltipTitleBarBg);

    this.tooltipRarityBarBg = this.scene.add.graphics();
    this.tooltipContainer.add(this.tooltipRarityBarBg);

    const wrapWidth = this.TOOLTIP.WIDTH - this.TOOLTIP.PADDING * 2;

    this.tooltipTitleText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, {
      fontSize: "40px",
    });
    this.tooltipTitleText.setOrigin(0.5, 0.5);
    this.tooltipContainer.add(this.tooltipTitleText);

    this.tooltipSubtitleText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, {
      fontSize: "30px",
    });
    this.tooltipSubtitleText.setOrigin(0.5, 0.5);
    this.tooltipContainer.add(this.tooltipSubtitleText);

    this.tooltipBodyText = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, {
      fontSize: "36px",
    }) as BBCodeText;
    this.tooltipBodyText.setOrigin(0, 0);
    this.tooltipBodyText.setStyle({
      ...this.tooltipBodyText.style,
      wordWrap: { width: wrapWidth / (this.tooltipBodyText.scaleX || 1), useAdvancedWrap: true },
    } as any);
    this.tooltipContainer.add(this.tooltipBodyText);

    this.tooltipContainer.setVisible(false);
    this.contentContainer.add(this.tooltipContainer);

    this.modalContainer.setVisible(false);
  }

  show(args: any[] = []): boolean {
    if (args.length >= 1) {
      this.config = args[0] as RankUpUiConfig;
    }

    const optionCount = this.config?.options?.length ?? 0;
    if (!this.config || !this.config.options || optionCount < 2 || optionCount > this.MAX_OPTIONS) {
      return false;
    }

    this.active = true;
    this.inputLocked = false;
    this.cursor = 0;

    this.updateContainer();
    this.render();

    this.modalContainer.setVisible(true);
    this.getUi().moveTo(this.modalContainer, this.getUi().length - 1);
    this.setCursor(0);

    return true;
  }

  processInput(button: Button): boolean {
    if (!this.active || !this.config || this.inputLocked) {
      return false;
    }

    const maxIdx = Math.max(0, (this.config.options?.length ?? 1) - 1);
    switch (button) {
      case Button.LEFT:
      case Button.UP:
        this.setCursor(Math.max(0, (this.cursor as integer) - 1));
        return true;
      case Button.RIGHT:
      case Button.DOWN:
        this.setCursor(Math.min(maxIdx, (this.cursor as integer) + 1));
        return true;
      case Button.ACTION:
        this.select(this.cursor as integer);
        return true;
      default:
        return false;
    }
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);
    if (!this.config) {
      return ret;
    }

    const maxIdx = Math.max(0, (this.config.options?.length ?? 1) - 1);
    const idx = (Math.max(0, Math.min(maxIdx, this.cursor)) as integer);
    this.cursor = idx;
    this.drawSelection(idx);
    this.showTooltip(idx);

    return ret;
  }

  clear(): void {
    super.clear();
    this.config = null;
    this.inputLocked = false;
    this.hideTooltip();
    this.modalContainer.setVisible(false);
  }

  private render(): void {
    if (!this.config) {
      return;
    }

    const width = this.getWidth();
    const height = this.getHeight();

    const subtitle = this.config.subtitle ?? "";
    this.subtitleText.setText(subtitle);
    this.subtitleText.setVisible(!!subtitle);

    this.subtitleText.setWordWrapWidth(width - 20, true);
    this.subtitleText.setPosition(width / 2, 24);
    const centerX = width / 2;
    const centerY = subtitle ? 74 : 60;
    const optionsY = height - 65;
    const optionCount = this.config.options.length;
    const xs = optionCount === 2
      ? [width * 0.25, width * 0.75]
      : Array.from({ length: optionCount }, (_, i) => width * ((i + 1) / (optionCount + 1)));

    this.centerContainer.setPosition(centerX, centerY);
    this.centerLabel.setText(this.config.center.label);
    this.centerIcon.setTexture(this.config.center.iconAtlasKey, this.config.center.iconFrame);
    this.centerIcon.setScale(this.config.center.iconScale ?? 0.65);

    for (let i = 0; i < this.MAX_OPTIONS; i++) {
      const model = this.config.options[i];
      const visible = !!model;
      this.optionContainers[i].setVisible(visible);
      if (!visible) {
        this.optionHitAreas[i].disableInteractive();
        continue;
      }
      this.optionHitAreas[i].setInteractive({ useHandCursor: true });

      this.optionContainers[i].setPosition(xs[i], optionsY);
      this.optionLabels[i].setText(model.label);
      this.optionIcons[i].setTexture(model.iconAtlasKey, model.iconFrame);
      this.optionIcons[i].setScale(model.iconScale ?? 0.6);
    }

    this.drawConnections(centerX, centerY, xs.map(x => ({ x, y: optionsY })));
    this.drawSelection(Math.max(0, Math.min(optionCount - 1, this.cursor)) as integer);
    this.hideTooltip();
  }

  private drawConnections(cx: number, cy: number, options: Array<{ x: number; y: number }>): void {
    this.connectionGraphics.clear();
    this.connectionGraphics.lineStyle(1, 0x6688aa, 0.7);
    for (const o of options) {
      this.drawDashedLine(this.connectionGraphics, cx, cy + 10, o.x, o.y - 20, 4, 2);
    }
  }

  private drawDashedLine(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    dashLength: number,
    gapLength: number
  ): void {
    const totalDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    if (!totalDistance) {
      return;
    }
    const numDashes = Math.floor(totalDistance / (dashLength + gapLength));
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

  private drawSelection(idx: integer): void {
    this.selectionGraphics.clear();
    const c = idx === 0 ? 0x00bfff : 0xffcc00;
    this.selectionGraphics.lineStyle(2, c, 0.9);
    const x = this.optionContainers[idx].x;
    const y = this.optionContainers[idx].y;
    this.selectionGraphics.strokeRoundedRect(
      x - this.NODE_BOX.W / 2 - 2,
      y - this.NODE_BOX.H / 2 - 2,
      this.NODE_BOX.W + 4,
      this.NODE_BOX.H + 4,
      6
    );
  }

  private showTooltip(idx: integer): void {
    if (!this.config) return;

    const option = this.config.options[idx];
    if (!option) {
      this.hideTooltip();
      return;
    }

    const title = option.tooltipTitle || "";
    const body = option.tooltipBody || "";
    const subtitle = option.tooltipSubtitle || "";
    const rarity = option.tooltipRarity ?? SkillTreeRarity.ULTRA;
    const rarityColors = getUpgradeRarityColors(rarity);

    const c = this.TOOLTIP;
    const tooltipWidth = c.WIDTH;
    const padding = c.PADDING;
    const centerX = tooltipWidth / 2 + 2;
    const textX = padding + 2;

    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.tooltipTitleText.setText(title);
    this.tooltipTitleText.setPosition(centerX, 8);
    this.tooltipTitleText.setColor(rarityHex);

    this.tooltipSubtitleText.setText(subtitle);
    this.tooltipSubtitleText.setPosition(centerX, 17);
    this.tooltipSubtitleText.setTint(rarityColors.border);
    this.tooltipSubtitleText.setVisible(!!subtitle);

    this.tooltipBodyText.setText(body);
    const scaleX = this.tooltipBodyText.scaleX || 1;
    this.tooltipBodyText.setStyle({
      ...this.tooltipBodyText.style,
      wordWrap: { width: (tooltipWidth - padding * 2) / scaleX, useAdvancedWrap: true },
    } as any);
    this.tooltipBodyText.setPosition(textX, c.TITLE_BAR_H + c.RARITY_BAR_H + padding);

    const contentBottom = this.tooltipBodyText.y + this.tooltipBodyText.displayHeight;
    const tooltipHeight = contentBottom + padding;

    this.tooltipBg.setSize(tooltipWidth, tooltipHeight);

    this.tooltipTitleBarBg.clear();

    this.tooltipRarityBarBg.clear();
    if (subtitle) {
      this.tooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
      this.tooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, c.RARITY_BAR_H);
    }

    const width = this.getWidth();
    const optionX = this.optionContainers[idx]?.x ?? width / 2;
    const xRight = optionX + 20;
    const xLeft = optionX - 20 - tooltipWidth;
    let tooltipX = xRight + tooltipWidth > width ? xLeft : xRight;
    tooltipX = Math.max(0, Math.min(width - tooltipWidth, tooltipX));

    let tooltipY = (this.optionContainers[idx]?.y ?? 0) - tooltipHeight / 2;
    tooltipY = Math.max(8, Math.min(this.getHeight() - tooltipHeight - 8, tooltipY));
    this.tooltipContainer.setPosition(tooltipX, tooltipY);

    this.tooltipContainer.setVisible(true);
  }
  private hideTooltip(): void {
    this.tooltipContainer.setVisible(false);
  }

  private select(idx: integer): void {
    if (!this.config || this.inputLocked) {
      return;
    }
    const optionCount = this.config.options?.length ?? 0;
    if (idx < 0 || idx >= optionCount) {
      return;
    }
    this.inputLocked = true;

    try {
      Promise.resolve(this.config.onSelect(idx)).finally(() => {

        this.inputLocked = false;
      });
    } catch {
      this.inputLocked = false;
    }
  }
}