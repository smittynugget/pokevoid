import BattleScene from "../battle-scene";
import { TextStyle, addTextObject, addBBCodeTextObject, getBBCodeFrag, getTextStyleOptions } from "./text";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import * as Utils from "../utils";
import { argbFromRgba } from "@material/material-color-utilities";
import {Button} from "#enums/buttons";
import { SelectStarterPhase } from "#app/phases/select-starter-phase.ts";
import { EggLapsePhase } from "#app/phases/egg-lapse-phase.ts";
import { EggHatchPhase } from "#app/phases/egg-hatch-phase.ts";
import { TitlePhase } from "#app/phases/title-phase.ts";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import i18next from "i18next";
import { isPrimaryPointer } from "./pointer-utils";

export interface OptionSelectConfig {
  xOffset?: number;
  yOffset?: number;
  options: OptionSelectItem[];
  maxOptions?: integer;
  delay?: integer;
  noCancel?: boolean;
  supportHover?: boolean;
  isRemoveItemsMenu?: boolean;
  delayAllInputs?: boolean;
  postComposeCallback?: () => void;
  useTextHeight?: boolean;
}

export interface OptionSelectItem {
  label: string;
  handler: () => boolean;
  onHover?: () => void;
  keepOpen?: boolean;
  overrideSound?: boolean;
  item?: string;
  itemArgs?: any[];
  isModTitleOption?: boolean;
  inputSetting?: string;
  textStyle?: TextStyle;
}

const scrollUpLabel = "↑";
const scrollDownLabel = "↓";

export default abstract class AbstractOptionSelectUiHandler extends UiHandler {
  protected optionSelectContainer: Phaser.GameObjects.Container;
  protected optionSelectBg: Phaser.GameObjects.NineSlice;
  protected optionSelectText: Phaser.GameObjects.Text;
  protected optionSelectIcons: Phaser.GameObjects.Sprite[];
  protected exclamationTweens: Phaser.Tweens.Tween[] = [];

  protected config: OptionSelectConfig | null;

  protected blockInput: boolean;

  protected scrollCursor: integer = 0;

  protected scale: number = 0.1666666667;

  private cursorObj: Phaser.GameObjects.Image | null;
  private _optionBgPattern?: ModalBackgroundHandle;
  private _optionHitZones: Phaser.GameObjects.Zone[] = [];
  private _optionRowTexts: (Phaser.GameObjects.Text | any)[] = [];
  private _optionRowYs: number[] = [];
  private _optionRowHeights: number[] = [];

  constructor(scene: BattleScene, mode: Mode | null) {
    super(scene, mode);
  }

  abstract getWindowWidth(): integer;

  protected getTitlePhaseScaleFactor(): number {
    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    if (!isTitlePhaseOptionSelect) {
        return 1.0;
    }

    const optionCount = Math.min((this.config?.options || []).length, this.config?.maxOptions || 99);
    const containerY = -48;
    const topEdge = -this.scene.game.canvas.height / 6;
    const availableHeight = Math.abs(containerY - topEdge) - 4;

    const basePadding = 14;
    const isJapanese = i18next.resolvedLanguage === 'ja';
    const perOptionHeight = isJapanese ? 10 : 12;
    const requiredHeight = basePadding + (optionCount * perOptionHeight);

    if (requiredHeight <= availableHeight) {
        return 1.0;
    }

    return Math.max(0.65, availableHeight / requiredHeight);
  }

  getWindowHeight(): integer {
    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    const optionCount = Math.min((this.config?.options || []).length, this.config?.maxOptions || 99);

    if (this.mode === Mode.TITLE) {
        const baseHeight = 65;
        return (optionCount + 1) * baseHeight * this.scale;
    }

    if (isTitlePhaseOptionSelect) {
        const scaleFactor = this.getTitlePhaseScaleFactor();
        const isJapanese = i18next.resolvedLanguage === 'ja';
        const perOptionHeight = isJapanese ? 10 : 12;
        const basePadding = 14;
        return Math.floor((basePadding + (optionCount * perOptionHeight)) * scaleFactor);
    }

    const baseHeight = 96;
    return (optionCount + 1) * baseHeight * this.scale;
  }

  setup() {
    const ui = this.getUi();

    this.optionSelectContainer = this.scene.add.container((this.scene.game.canvas.width / 6) - 1, -48);
    this.optionSelectContainer.setName(`option-select-${this.mode ? Mode[this.mode] : "UNKNOWN"}`);
    this.optionSelectContainer.setVisible(false);
    ui.add(this.optionSelectContainer);

    this.optionSelectBg = addWindow(this.scene, 0, 0, this.getWindowWidth(), this.getWindowHeight());
    this.optionSelectBg.setName("option-select-bg");
    this.optionSelectBg.setOrigin(1, 1);
    this.optionSelectContainer.add(this.optionSelectBg);

    this.optionSelectIcons = [];

    this.scale = getTextStyleOptions(TextStyle.WINDOW, (this.scene as BattleScene).uiTheme).scale;

    this.setCursor(0);
  }

  private _destroyPerRowTexts(): void {
    this._optionRowTexts.forEach(t => t.destroy());
    this._optionRowTexts = [];
    this._optionRowYs = [];
    this._optionRowHeights = [];
  }

  protected setupOptions() {
    this.exclamationTweens.forEach(tween => tween.stop());
    this.exclamationTweens = [];

    const configOptions = this.config?.options ?? [];
    const shouldScroll = !!this.config?.maxOptions && configOptions.length > this.config.maxOptions;
    const options: OptionSelectItem[] = shouldScroll ? this.getOptionsWithScroll() : configOptions;

    if (this.optionSelectText) {
      this.optionSelectText.destroy();
    }
    this._destroyPerRowTexts();
    if (this.optionSelectIcons?.length) {
      this.optionSelectIcons.map(i => i.destroy());
      this.optionSelectIcons.splice(0, this.optionSelectIcons.length);
    }

    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    const isTitleCompact = isTitlePhaseOptionSelect && !this.config?.useTextHeight;
    const scaleFactor = isTitleCompact ? this.getTitlePhaseScaleFactor() : 1.0;
    const scaledFontSize = isTitleCompact ? Math.floor(65 * scaleFactor) : 65;

    const hasStyledOption = options.some(o => !!o.textStyle);
    const baseStyle = this.mode === Mode.TITLE ? TextStyle.TITLE_MESSAGE : TextStyle.WINDOW;
    const extraStyle = { maxLines: options.length, ...(this.mode === Mode.TITLE || isTitlePhaseOptionSelect ? { fontSize: `${scaledFontSize}px`} : {}) };

    const usePerRow = hasStyledOption && isTitlePhaseOptionSelect;

    if (usePerRow) {
      const uiTheme = (this.scene as BattleScene).uiTheme;
      const ROW_GAP = 1;
      const TOP_PAD = 10;
      const LEFT_PAD = 12 + 24 * this.scale;
      const isCJK = ['ja', 'zh-CN', 'zh-TW', 'ko'].includes(i18next.resolvedLanguage ?? '');

      this._optionRowTexts = [];
      this._optionRowYs = [];
      this._optionRowHeights = [];

      let y = TOP_PAD;
      let maxWidth = 0;

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        let rowText: any;

        if (opt.textStyle) {
          const bbContent = getBBCodeFrag(opt.label, opt.textStyle, uiTheme);
          rowText = addBBCodeTextObject(this.scene, 0, 0, bbContent, baseStyle, { fontSize: `${scaledFontSize}px` });
          (rowText as any).setPositionRelative = function(guideObject: any, x: number, yVal: number) {
            const offsetX = guideObject.width * (-0.5 + (0.5 - (guideObject.originX || 0)));
            const offsetY = guideObject.height * (-0.5 + (0.5 - (guideObject.originY || 0)));
            this.setPosition(guideObject.x + offsetX + x, guideObject.y + offsetY + yVal);
          };
        } else {
          rowText = addTextObject(this.scene, 0, 0, opt.label, baseStyle, { fontSize: `${scaledFontSize}px` });
        }

        if (isCJK) {
          rowText.setLineSpacing((rowText.lineSpacing || 0) * 1.5);
        }

        this.optionSelectContainer.add(rowText);
        this._optionRowTexts.push(rowText);

        const h = rowText.displayHeight;
        this._optionRowYs.push(y);
        this._optionRowHeights.push(h);

        maxWidth = Math.max(maxWidth, rowText.displayWidth);
        y += h + ROW_GAP;
      }

      this.optionSelectBg.width = Math.max(maxWidth + 24 + 24 * this.scale, this.getWindowWidth());
      this.optionSelectBg.height = Math.ceil(y + 5);

      for (let i = 0; i < this._optionRowTexts.length; i++) {
        this._optionRowTexts[i].setPositionRelative(this.optionSelectBg, LEFT_PAD, this._optionRowYs[i]);
      }

      this.optionSelectText = this._optionRowTexts[0] as any;

      if (!this.config?.isRemoveItemsMenu) {
        this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1 - (this.config?.xOffset || 0), -48 + (this.config?.yOffset || 0));
      }

      this._optionBgPattern?.redraw();

    } else {
      if (hasStyledOption) {
        const uiTheme = (this.scene as BattleScene).uiTheme;
        const content = options.map(o => {
          if (o.textStyle) {
            return getBBCodeFrag(o.label, o.textStyle, uiTheme);
          }
          return getBBCodeFrag(o.label, baseStyle, uiTheme);
        }).join("\n");
        const bbText = addBBCodeTextObject(this.scene, 0, 0, content, baseStyle, extraStyle);
        (bbText as any).setPositionRelative = function(guideObject: any, x: number, y: number) {
          const offsetX = guideObject.width * (-0.5 + (0.5 - (guideObject.originX || 0)));
          const offsetY = guideObject.height * (-0.5 + (0.5 - (guideObject.originY || 0)));
          this.setPosition(guideObject.x + offsetX + x, guideObject.y + offsetY + y);
        };
        this.optionSelectText = bbText as any;
      } else {
        this.optionSelectText = addTextObject(
          this.scene,
          0,
          0,
          options.map(o => o.label).join("\n"),
          baseStyle,
          extraStyle
        );
      }

      const isUseTextHeightOverlay = isTitlePhaseOptionSelect && this.config?.useTextHeight;
      const baseLineSpacing = this.mode === Mode.TITLE || isTitleCompact ? 8 : (isUseTextHeightOverlay ? 18 : 12);
      const secondaryLineSpacing = isTitleCompact ? Math.floor(baseLineSpacing * scaleFactor) : baseLineSpacing;
      const isCJK = ['ja', 'zh-CN', 'zh-TW', 'ko'].includes(i18next.resolvedLanguage ?? '');
      const finalLineSpacing = isCJK ? secondaryLineSpacing * 1.5 : secondaryLineSpacing;
      this.optionSelectText.setName("text-option-select");
      this.optionSelectText.setLineSpacing(finalLineSpacing);
      this.optionSelectContainer.add(this.optionSelectText);

      if (!this.config?.isRemoveItemsMenu) {
        this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1 - (this.config?.xOffset || 0), -48 + (this.config?.yOffset || 0));
      }

      this.optionSelectBg.width = Math.max(this.optionSelectText.displayWidth + 24, this.getWindowWidth());

      if (this.config?.useTextHeight) {
        const topPad = 2 + 42 * this.scale;
        const bottomPad = 6;
        this.optionSelectBg.height = Math.ceil(this.optionSelectText.displayHeight + topPad + bottomPad);
      } else {
        this.optionSelectBg.height = this.getWindowHeight();
      }

      this._optionBgPattern?.redraw();

      this.optionSelectText.setPositionRelative(this.optionSelectBg, 12+24*this.scale, 2+42*this.scale);
    }

    const optionsCount = options.length;
    const rowStep = usePerRow
      ? 0
      : (optionsCount > 0
          ? ((optionsCount > 1 ? this.optionSelectText.displayHeight - (6 * this.scale) : this.optionSelectText.displayHeight) / optionsCount)
          : 0);

    options.forEach((option: OptionSelectItem, i: integer) => {
      if (option.item) {
        const textureKey = option.item === 'exclamationMark' && option.itemArgs?.[0] === 'smitems' ?
                          'smitems' : 'items';

        const itemIcon = this.scene.add.sprite(0, 0, textureKey, option.item);

        let iconScale;
        if (option.item === 'exclamationMark') {
          iconScale = option.itemArgs?.[0] === 'smitems' ? 0.18 : 0.10;
        } else {
          iconScale = option.itemArgs?.[0] === 'smitems' ? 0.1 : 3 * this.scale;
        }

        itemIcon.setScale(iconScale);
        itemIcon.setVisible(true);

        this.optionSelectIcons.push(itemIcon);
        this.optionSelectContainer.add(itemIcon);

        let xOffset, yOffset;

        if (option.item === 'exclamationMark') {
          if (usePerRow && this._optionRowTexts[i]) {
            const rowText = this._optionRowTexts[i];
            xOffset = rowText.displayWidth + 7;
            yOffset = this._optionRowHeights[i] / 2;
            itemIcon.setPositionRelative(rowText, xOffset, yOffset);
          } else {
            const labelText = option.label || '';
            const ctx = this.optionSelectText.canvas.getContext('2d');
            let labelWidth = this.optionSelectText.displayWidth;
            if (ctx) {
              const measured = ctx.measureText(labelText);
              labelWidth = measured.width * this.scale;
            }
            xOffset = labelWidth + 7;
            if (this.mode === Mode.TITLE || isTitleCompact) {
              const step = rowStep || (78 * this.scale - 2);
              yOffset = (step / 2) + i * step;
            } else {
              const cursorStep = 78 * this.scale - 2;
              yOffset = (6 + i * cursorStep);
            }
            itemIcon.setPositionRelative(this.optionSelectText, xOffset, yOffset);
          }
        } else if (option.item === 'candy') {
          xOffset = -4;
          yOffset = 7 + i * (96 * this.scale - 3);
          itemIcon.setPositionRelative(this.optionSelectText, xOffset, yOffset);
        } else {
          xOffset = 36 * this.scale;
          yOffset = 7 + i * (96 * this.scale - 3);
          itemIcon.setPositionRelative(this.optionSelectText, xOffset, yOffset);
        }

        if (option.item === "candy") {
          const itemOverlayIcon = this.scene.add.sprite(0, 0, "items", "candy_overlay");
          itemOverlayIcon.setScale(3 * this.scale);
          this.optionSelectIcons.push(itemOverlayIcon);

          this.optionSelectContainer.add(itemOverlayIcon);

          itemOverlayIcon.setPositionRelative(this.optionSelectText, -4, 7 + i * (96 * this.scale - 3));

          if (option.itemArgs) {
            itemIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(option.itemArgs[0])));
            itemOverlayIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(option.itemArgs[1])));
          }
        }

        if (option.item === 'exclamationMark') {
          const cappedSpeed = Math.min((this.scene as BattleScene).gameSpeed, 3);
          const tween = this.scene.add.tween({
            targets: itemIcon,
            scaleX: iconScale * 0.8,
            scaleY: iconScale * 0.8,
            duration: Utils.fixedInt(Math.ceil(3000 / cappedSpeed)),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
          this.exclamationTweens.push(tween);
        }
      }

      if (option.inputSetting) {
        const iconFrame = (this.scene as any).inputController?.getIconForLatestInputRecorded(option.inputSetting);
        const sourceType = (this.scene as any).inputController?.getLastSourceType() || "keyboard";
        if (iconFrame) {
          const keySprite = this.scene.add.sprite(0, 0, sourceType, iconFrame);
          keySprite.setScale(3 * this.scale);
          this.optionSelectIcons.push(keySprite);
          this.optionSelectContainer.add(keySprite);
          const yOff = 7 + i * (96 * this.scale - 3);
          keySprite.setPositionRelative(this.optionSelectText, this.optionSelectText.displayWidth + 8, yOff);
        }
      }
    });

    this._destroyOptionHitZones();
    this._createOptionHitZones(options);
  }

  private _createOptionHitZones(options: OptionSelectItem[]): void {
    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    const isTitleLayout = this.mode === Mode.TITLE || isTitlePhaseOptionSelect;
    const usePerRow = this._optionRowTexts.length > 0;

    if (usePerRow) {
      const ROW_GAP = 1;
      const bgW = this.optionSelectBg.width - 8;
      const bgOffX = this.optionSelectBg.width * (-0.5 + (0.5 - this.optionSelectBg.originX));
      const bgOffY = this.optionSelectBg.height * (-0.5 + (0.5 - this.optionSelectBg.originY));

      for (let idx = 0; idx < options.length; idx++) {
        const rowH = this._optionRowHeights[idx] + ROW_GAP;
        const zone = this.scene.add.zone(0, 0, bgW, rowH);
        zone.setOrigin(0, 0);
        zone.setPosition(
          this.optionSelectBg.x + bgOffX + 4,
          this.optionSelectBg.y + bgOffY + this._optionRowYs[idx] - ROW_GAP / 2
        );
        zone.setInteractive({ useHandCursor: true });

        zone.on("pointerover", () => {
          if (this.blockInput) return;
          if (this.cursor !== idx) {
            this.setCursor(idx);
          }
          if (this.config?.supportHover) {
            const realIdx = idx + (this.scrollCursor - (this.scrollCursor ? 1 : 0));
            this.config?.options[realIdx]?.onHover?.();
          }
        });

        zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          if (this.blockInput) return;
          if (this.mode === Mode.CONFIRM) {
            this.setCursor(idx);
            this.processInput(Button.ACTION);
          } else if (this.cursor !== idx) {
            this.setCursor(idx);
          } else {
            this.processInput(Button.ACTION);
          }
        });

        this.optionSelectContainer.add(zone);
        this._optionHitZones.push(zone);
      }
      return;
    }

    if (isTitleLayout) {
      const isTitleCompact = isTitlePhaseOptionSelect && !this.config?.useTextHeight;

      if (isTitleCompact) {
        const scaleFactor = this.getTitlePhaseScaleFactor();
        const step = (78 * this.scale - 2) * scaleFactor;
        const firstRowY = 85 * this.scale * scaleFactor;
        const zoneW = this.optionSelectBg.width - 8;
        const bgOffX = this.optionSelectBg.width * (-0.5 + (0.5 - this.optionSelectBg.originX));
        const bgOffY = this.optionSelectBg.height * (-0.5 + (0.5 - this.optionSelectBg.originY));

        for (let idx = 0; idx < options.length; idx++) {
          const zone = this.scene.add.zone(0, 0, zoneW, step);
          zone.setOrigin(0, 0);
          zone.setPosition(
            this.optionSelectBg.x + bgOffX + 4,
            this.optionSelectBg.y + bgOffY + firstRowY + idx * step
          );
          zone.setInteractive({ useHandCursor: true });

          zone.on("pointerover", () => {
            if (this.blockInput) return;
            if (this.cursor !== idx) {
              this.setCursor(idx);
            }
            if (this.config?.supportHover) {
              const realIdx = idx + (this.scrollCursor - (this.scrollCursor ? 1 : 0));
              this.config?.options[realIdx]?.onHover?.();
            }
          });

          zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!isPrimaryPointer(pointer)) return;
            if (this.blockInput) return;
            if (this.mode === Mode.CONFIRM) {
              this.setCursor(idx);
              this.processInput(Button.ACTION);
            } else if (this.cursor !== idx) {
              this.setCursor(idx);
            } else {
              this.processInput(Button.ACTION);
            }
          });

          this.optionSelectContainer.add(zone);
          this._optionHitZones.push(zone);
        }
        return;
      }

      if (!this.optionSelectText) return;
      const rowCount = options.length;
      const rawHeight = rowCount > 1 ? this.optionSelectText.displayHeight - (6 * this.scale) : this.optionSelectText.displayHeight;
      const step = rowCount > 0 ? (rawHeight / rowCount) : 0;
      if (step <= 0) return;
      const zoneW = this.optionSelectText.displayWidth + 24 * this.scale;
      const zoneXOff = -24 * this.scale;
      const textOffX = this.optionSelectText.width * (-0.5 + (0.5 - this.optionSelectText.originX));
      const textOffY = this.optionSelectText.height * (-0.5 + (0.5 - this.optionSelectText.originY));

      for (let idx = 0; idx < options.length; idx++) {
        const zone = this.scene.add.zone(0, 0, zoneW, step);
        zone.setOrigin(0, 0);
        zone.setPosition(
          this.optionSelectText.x + textOffX + zoneXOff,
          this.optionSelectText.y + textOffY + idx * step
        );
        zone.setInteractive({ useHandCursor: true });

        zone.on("pointerover", () => {
          if (this.blockInput) return;
          if (this.cursor !== idx) {
            this.setCursor(idx);
          }
          if (this.config?.supportHover) {
            const realIdx = idx + (this.scrollCursor - (this.scrollCursor ? 1 : 0));
            this.config?.options[realIdx]?.onHover?.();
          }
        });

        zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          if (this.blockInput) return;
          if (this.mode === Mode.CONFIRM) {
            this.setCursor(idx);
            this.processInput(Button.ACTION);
          } else if (this.cursor !== idx) {
            this.setCursor(idx);
          } else {
            this.processInput(Button.ACTION);
          }
        });

        this.optionSelectContainer.add(zone);
        this._optionHitZones.push(zone);
      }
      return;
    }

    const isRemoveItems = this.config?.isRemoveItemsMenu && this.config.xOffset === -1;
    const rowStep = isRemoveItems ? (96 * this.scale) : (114 * this.scale - 3);
    const firstRowY = 102 * this.scale;
    const bgW = this.optionSelectBg.width;

    for (let idx = 0; idx < options.length; idx++) {
      const rowY = firstRowY + idx * rowStep;
      const zone = this.scene.add.zone(0, 0, bgW - 8, rowStep);
      zone.setOrigin(0, 0);
      const bgOffX = this.optionSelectBg.width * (-0.5 + (0.5 - this.optionSelectBg.originX));
      const bgOffY = this.optionSelectBg.height * (-0.5 + (0.5 - this.optionSelectBg.originY));
      zone.setPosition(this.optionSelectBg.x + bgOffX + 4, this.optionSelectBg.y + bgOffY + rowY - 4);
      zone.setInteractive({ useHandCursor: true });

      zone.on("pointerover", () => {
        if (this.blockInput) return;
        if (this.cursor !== idx) {
          this.setCursor(idx);
        }
      });

      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (this.blockInput) return;
        if (this.mode === Mode.CONFIRM) {
          this.setCursor(idx);
          this.processInput(Button.ACTION);
        } else if (this.cursor !== idx) {
          this.setCursor(idx);
        } else {
          this.processInput(Button.ACTION);
        }
      });

      this.optionSelectContainer.add(zone);
      this._optionHitZones.push(zone);
    }
  }

  private _destroyOptionHitZones(): void {
    this._optionHitZones.forEach(z => z.destroy());
    this._optionHitZones = [];
  }

  show(args: any[]): boolean {
    if (!args.length || !args[0].hasOwnProperty("options") || !args[0].options.length) {
      return false;
    }

    super.show(args);

    this.config = args[0] as OptionSelectConfig;

    this.setupOptions();

    const isTitleScreen = this.mode === Mode.TITLE;
    if (isTitleScreen) {
      this.optionSelectContainer.setPosition(30, 5);
      this.optionSelectBg.setVisible(false);
    } else if ((this.scene.getCurrentPhase() instanceof SelectStarterPhase) && this.mode === Mode.OPTION_SELECT) {
      this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1, -16);
      this.optionSelectBg.setVisible(true);
    }
    else if ((this.scene.getCurrentPhase() instanceof EggLapsePhase || this.scene.getCurrentPhase() instanceof EggHatchPhase) && this.mode === Mode.OPTION_SELECT) {
      this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1, 0);
      this.optionSelectBg.setVisible(true);
    }
    else if (this.config.isRemoveItemsMenu) {
        const canvasWidth = this.scene.game.canvas.width / 6;
        const fixedYPosition = 0;

        this.optionSelectContainer.setPosition(
          canvasWidth / 2 + this.optionSelectBg.width / 2,
          fixedYPosition
        );
      this.optionSelectBg.setVisible(true);
    } else {
      this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1, -48);
      this.optionSelectBg.setVisible(true);
    }

    this.scene.ui.bringToTop(this.optionSelectContainer);

    const isOverlayDialog = this.mode === Mode.CONFIRM || this.mode === Mode.OPTION_SELECT || this.mode === Mode.MENU_OPTION_SELECT;
    if (isOverlayDialog && !isTitleScreen) {
      this.optionSelectContainer.setDepth(10000000002);
    }

    if(!isTitleScreen) {
      const isConfirm = this.mode === Mode.CONFIRM;
      this._optionBgPattern = attachModalBackground(
        this.scene,
        this.optionSelectContainer,
        () => ({
          bgX: this.optionSelectBg.x - this.optionSelectBg.width,
          bgY: this.optionSelectBg.y - this.optionSelectBg.height,
          bgWidth: this.optionSelectBg.width,
          bgHeight: this.optionSelectBg.height,
        }),
        { mask: false, alphaMultiplier: isConfirm ? 0.6 : 0.45, gridInc: -2 }
      );
    }

    this.optionSelectContainer.setVisible(true);
    this.scrollCursor = 0;
    this.setCursor(0);

    if (this.config.delay) {
      this.blockInput = true;
      if (this._optionRowTexts.length > 0) {
        this._optionRowTexts.forEach(t => t.setAlpha(0.5));
      } else {
        this.optionSelectText.setAlpha(0.5);
      }
      this.scene.time.delayedCall(Utils.fixedInt(this.config.delay), () => this.unblockInput());
    }

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    const options = this.getOptionsWithScroll();

    let playSound = true;

    if (button === Button.ACTION || button === Button.CANCEL) {
      if (this.blockInput) {
        ui.playError();
        return false;
      }

      success = true;
      if (button === Button.CANCEL) {
        if (this.config?.maxOptions && this.config.options.length > this.config.maxOptions) {
          this.scrollCursor = (this.config.options.length - this.config.maxOptions) + 1;
          this.cursor = options.length - 1;
        } else if (!this.config?.noCancel) {
          this.setCursor(options.length - 1);
        } else {
          return false;
        }
      }
      const option = this.config?.options[this.cursor + (this.scrollCursor - (this.scrollCursor ? 1 : 0))];
      const beforeConfig = this.config;
      if (option?.handler()) {
        const modeChanged = ui.getMode() !== this.mode;
        const configChanged = this.config !== beforeConfig;
        if (!option.keepOpen && (modeChanged || !configChanged)) {
          this.clear();
        }
        playSound = !option.overrideSound;
      } else {
        ui.playError();
      }
    } else if (button === Button.SUBMIT && ui.getMode() === Mode.AUTO_COMPLETE) {
      success = true;
      const option = this.config?.options[this.cursor + (this.scrollCursor - (this.scrollCursor ? 1 : 0))];
      const beforeConfig = this.config;
      if (option?.handler()) {
        const modeChanged = ui.getMode() !== this.mode;
        const configChanged = this.config !== beforeConfig;
        if (!option.keepOpen && (modeChanged || !configChanged)) {
          this.clear();
        }
        playSound = !option.overrideSound;
      } else {
        ui.playError();
      }
    } else {
      switch (button) {
      case Button.UP:
        if (this.cursor) {
          success = this.setCursor(this.cursor - 1);
        } else if (this.cursor === 0) {
          success = this.setCursor(options.length -1);
        }
        break;
      case Button.DOWN:
        if (this.cursor < options.length - 1) {
          success = this.setCursor(this.cursor + 1);
        } else {
          success = this.setCursor(0);
        }
        break;
      }
      if (this.config?.supportHover) {

        this.config?.options[this.cursor + (this.scrollCursor - (this.scrollCursor ? 1 : 0))]?.onHover?.();
      }
    }

    if (success && playSound) {
      ui.playSelect();
    }

    return success;
  }

  unblockInput(): void {
    if (!this.blockInput) {
      return;
    }

    this.blockInput = false;
    if (this._optionRowTexts.length > 0) {
      this._optionRowTexts.forEach(t => t.setAlpha(1));
    } else {
      this.optionSelectText.setAlpha(1);
    }
  }

  getOptionsWithScroll(): OptionSelectItem[] {
    if (!this.config) {
      return [];
    }

    const options = this.config.options.slice(0);

    if (!this.config.maxOptions || this.config.options.length < this.config.maxOptions) {
      return options;
    }

    const optionsScrollTotal = options.length;
    const optionStartIndex = this.scrollCursor;
    const optionEndIndex = Math.min(optionsScrollTotal, optionStartIndex + (!optionStartIndex || this.scrollCursor + (this.config.maxOptions - 1) >= optionsScrollTotal ? this.config.maxOptions - 1 : this.config.maxOptions - 2));

    if (this.config?.maxOptions && options.length > this.config.maxOptions) {
      options.splice(optionEndIndex, optionsScrollTotal);
      options.splice(0, optionStartIndex);
      if (optionStartIndex) {
        options.unshift({
          label: scrollUpLabel,
          handler: () => true
        });
      }
      if (optionEndIndex < optionsScrollTotal) {
        options.push({
          label: scrollDownLabel,
          handler: () => true
        });
      }
    }

    return options;
  }

  setCursor(cursor: integer): boolean {
    const changed = this.cursor !== cursor;

    let isScroll = false;
    const options = this.getOptionsWithScroll();
    if (changed && this.config?.maxOptions && this.config.options.length > this.config.maxOptions) {
      if (Math.abs(cursor - this.cursor) === options.length - 1) {

        const optionsScrollTotal = this.config.options.length;
        this.scrollCursor = cursor ? optionsScrollTotal - (this.config.maxOptions - 1) : 0;
        this.setupOptions();
      } else {

        const isDown = cursor && cursor > this.cursor;
        if (isDown) {
          if (options[cursor].label === scrollDownLabel) {
            isScroll = true;
            this.scrollCursor++;
          }
        } else {
          if (!cursor && this.scrollCursor) {
            isScroll = true;
            this.scrollCursor--;
          }
        }
        if (isScroll && this.scrollCursor === 1) {
          this.scrollCursor += isDown ? 1 : -1;
        }
      }
    }
    if (isScroll) {
      this.setupOptions();
    } else {
      this.cursor = cursor;
    }

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.optionSelectContainer.add(this.cursorObj);
    }

    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    if (this._optionRowTexts.length > 0 && this._optionRowTexts[this.cursor]) {
      const rowText = this._optionRowTexts[this.cursor];
      const rowH = this._optionRowHeights[this.cursor];
      this.cursorObj.setScale(this.scale * 4.5);
      this.cursorObj.setPositionRelative(rowText, -24 * this.scale, rowH / 2);
      this.optionSelectContainer.bringToTop(this.cursorObj);
    } else if (this.mode === Mode.TITLE || isTitlePhaseOptionSelect) {
      const isTitleCompactCursor = isTitlePhaseOptionSelect && !this.config?.useTextHeight;
      const cursorScaleFactor = isTitleCompactCursor ? this.getTitlePhaseScaleFactor() : 1.0;
      this.cursorObj.setScale(this.scale * (isTitleCompactCursor ? 4.5 : 6));
      if (isTitleCompactCursor) {
        const baseY = 85 * this.scale * cursorScaleFactor;
        const stepY = (78 * this.scale - 2) * cursorScaleFactor;
        this.cursorObj.setPositionRelative(this.optionSelectBg, 12, baseY + this.cursor * stepY);
      } else if (this.optionSelectText) {
        const t = (this.optionSelectText as any).text || "";
        const rowCount = t ? String(t).split("\n").length : 0;
        let step: number;
        if (rowCount > 1) {
          const totalMinusPad = this.optionSelectText.displayHeight - (6 * this.scale);
          step = totalMinusPad / rowCount;
        } else if (rowCount === 1) {
          step = this.optionSelectText.displayHeight;
        } else {
          step = (78 * this.scale - 2) * cursorScaleFactor;
        }
        const xOffset = -24 * this.scale;
        this.cursorObj.setPositionRelative(this.optionSelectText, xOffset, (step / 2) + this.cursor * step);
      } else {
        const baseY = 85 * this.scale * cursorScaleFactor;
        const stepY = (78 * this.scale - 2) * cursorScaleFactor;
        this.cursorObj.setPositionRelative(this.optionSelectBg, 12, baseY + this.cursor * stepY);
      }
    } else if (this.config?.isRemoveItemsMenu && this.config.xOffset === -1) {
      this.cursorObj.setScale(this.scale * 6);
      this.cursorObj.setPositionRelative(
        this.optionSelectBg,
        12,
        102 * this.scale + this.cursor * (96 * this.scale)
      );
    } else {
      this.cursorObj.setScale(this.scale * 6);
      this.cursorObj.setPositionRelative(this.optionSelectBg, 12, 102*this.scale + this.cursor * (114 * this.scale - 3));
    }

    return changed;
  }

  clear() {
    this.exclamationTweens.forEach(tween => tween.stop());
    this.exclamationTweens = [];

    this._optionBgPattern?.clear();
    this._optionBgPattern = undefined;
    this._destroyOptionHitZones();
    this._destroyPerRowTexts();

    super.clear();
    this.config = null;
    this.optionSelectContainer.setVisible(false);
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}