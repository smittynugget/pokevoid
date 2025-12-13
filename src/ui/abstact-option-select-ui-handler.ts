import BattleScene from "../battle-scene";
import { TextStyle, addTextObject, getTextStyleOptions } from "./text";
import { Mode } from "./ui";
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

  protected setupOptions() {
    this.exclamationTweens.forEach(tween => tween.stop());
    this.exclamationTweens = [];

    const configOptions = this.config?.options ?? [];

    let options: OptionSelectItem[];
    if (configOptions.length >= 10 && this.scene.ui.getMode() === Mode.AUTO_COMPLETE) {
      const optionsScrollTotal = configOptions.length;
      const optionStartIndex = this.scrollCursor;
      const optionEndIndex = Math.min(optionsScrollTotal, optionStartIndex + (!optionStartIndex || this.scrollCursor + (this.config?.maxOptions! - 1) >= optionsScrollTotal ? this.config?.maxOptions! - 1 : this.config?.maxOptions! - 2));
      options = configOptions.slice(optionStartIndex, optionEndIndex + 2);
    } else {
      options = configOptions;
    }

    if (this.optionSelectText) {
      this.optionSelectText.destroy();
    }
    if (this.optionSelectIcons?.length) {
      this.optionSelectIcons.map(i => i.destroy());
      this.optionSelectIcons.splice(0, this.optionSelectIcons.length);
    }

    const isTitlePhaseOptionSelect =
        this.scene.getCurrentPhase() instanceof TitlePhase &&
        this.mode === Mode.OPTION_SELECT;

    const scaleFactor = isTitlePhaseOptionSelect ? this.getTitlePhaseScaleFactor() : 1.0;
    const scaledFontSize = isTitlePhaseOptionSelect ? Math.floor(65 * scaleFactor) : 65;

    this.optionSelectText = addTextObject(
      this.scene,
      0,
      0,
      options.map(o => o.label).join("\n"),
      this.mode === Mode.TITLE ? TextStyle.TITLE_MESSAGE : TextStyle.WINDOW,
      { maxLines: options.length, ...(this.mode === Mode.TITLE || isTitlePhaseOptionSelect ? { fontSize: `${scaledFontSize}px`} : {}) }
    );

    const baseLineSpacing = this.mode === Mode.TITLE || isTitlePhaseOptionSelect ? 8 : 12;
    const secondaryLineSpacing = isTitlePhaseOptionSelect ? Math.floor(baseLineSpacing * scaleFactor) : baseLineSpacing;
    const isCJK = ['ja', 'zh-CN', 'zh-TW', 'ko'].includes(i18next.resolvedLanguage ?? '');
    const finalLineSpacing = isCJK ? secondaryLineSpacing * 1.5 : secondaryLineSpacing;
    this.optionSelectText.setName("text-option-select");
    this.optionSelectText.setLineSpacing(finalLineSpacing);
    this.optionSelectContainer.add(this.optionSelectText);

    if (!this.config?.isRemoveItemsMenu) {
      this.optionSelectContainer.setPosition((this.scene.game.canvas.width / 6) - 1 - (this.config?.xOffset || 0), -48 + (this.config?.yOffset || 0));
    }

    this.optionSelectBg.width = Math.max(this.optionSelectText.displayWidth + 24, this.getWindowWidth());

    if (this.config?.options && this.config?.options.length > (this.config?.maxOptions!)) {
      this.optionSelectText.setText(this.getOptionsWithScroll().map(o => o.label).join("\n"));
    }

    this.optionSelectBg.height = this.getWindowHeight();

    this._optionBgPattern?.redraw();

    this.optionSelectText.setPositionRelative(this.optionSelectBg, 12+24*this.scale, 2+42*this.scale);

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
          const isSmItems = option.itemArgs?.[0] === 'smitems';
          const lang = i18next.resolvedLanguage;
          let langOffset = 0;
          if (lang === 'fr') {
            langOffset = 10
          }
          else if (lang === 'zh-CN' || lang === 'zh-TW') {
            langOffset = 7
          }
          else if (lang === 'it' || lang === 'ja') {
            langOffset = 13
          }
          else if (lang === 'pt-BR') {
            langOffset = -5
          }
          xOffset = (this.optionSelectText.displayWidth / 3) + (isSmItems ? 14 * this.scale : 12 * this.scale) + langOffset;
          yOffset = (6 + i * (80 * this.scale - 2.5));
        } else if (option.item === 'candy') {
          xOffset = -4;
          yOffset = 7 + i * (96 * this.scale - 3);
        } else {
          xOffset = 36 * this.scale;
          yOffset = 7 + i * (96 * this.scale - 3);
        }

        itemIcon.setPositionRelative(this.optionSelectText, xOffset, yOffset);

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
          const tween = this.scene.add.tween({
            targets: itemIcon,
            scaleX: iconScale * 0.8,
            scaleY: iconScale * 0.8,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
          this.exclamationTweens.push(tween);
        }
      }
    });
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

    if(!isTitleScreen) {
    this._optionBgPattern = attachModalBackground(
      this.scene,
      this.optionSelectContainer,
      () => ({
        bgX: this.optionSelectBg.x - this.optionSelectBg.width,
        bgY: this.optionSelectBg.y - this.optionSelectBg.height,
        bgWidth: this.optionSelectBg.width,
        bgHeight: this.optionSelectBg.height,
      }),
      { mask: false, alphaMultiplier: 0.45, gridInc: -2 }
    );
    }

    this.optionSelectContainer.setVisible(true);
    this.scrollCursor = 0;
    this.setCursor(0);

    if (this.config.delay) {
      this.blockInput = true;
      this.optionSelectText.setAlpha(0.5);
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
      if (option?.handler()) {
        if (!option.keepOpen) {
          this.clear();
        }
        playSound = !option.overrideSound;
      } else {
        ui.playError();
      }
    } else if (button === Button.SUBMIT && ui.getMode() === Mode.AUTO_COMPLETE) {
      success = true;
      const option = this.config?.options[this.cursor + (this.scrollCursor - (this.scrollCursor ? 1 : 0))];
      if (option?.handler()) {
        if (!option.keepOpen) {
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
    this.optionSelectText.setAlpha(1);
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

    if (this.mode === Mode.TITLE || isTitlePhaseOptionSelect) {
      const cursorScaleFactor = isTitlePhaseOptionSelect ? this.getTitlePhaseScaleFactor() : 1.0;
      this.cursorObj.setScale(this.scale * 4.5);
      const baseY = 85 * this.scale * cursorScaleFactor;
      const stepY = (78 * this.scale - 2) * cursorScaleFactor;
      this.cursorObj.setPositionRelative(this.optionSelectBg, 12, baseY + this.cursor * stepY);
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