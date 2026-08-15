import i18next from "i18next";
import BattleScene from "../battle-scene";
import { getPokeballName } from "../data/pokeball";
import { PokeballType } from "#enums/pokeball";
import { Type } from "#app/data/type";
import { addTextObject, getTextStyleOptions, TextStyle } from "./text";
import { Command } from "./command-ui-handler";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import {Button} from "#enums/buttons";
import { CommandPhase } from "#app/phases/command-phase.js";
import { UiTheme } from "#enums/ui-theme";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";
import { isPrimaryPointer } from "./pointer-utils";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";

interface BallDisplayEntry {
  pokeballType: PokeballType;
  targetType?: Type;
  name: string;
  count: number;
}

export default class BallUiHandler extends UiHandler {
  private pokeballSelectContainer: Phaser.GameObjects.Container;
  private pokeballSelectBg: Phaser.GameObjects.NineSlice;
  private countsText: Phaser.GameObjects.Text;
  private optionsText: Phaser.GameObjects.Text;

  private cursorObj: Phaser.GameObjects.Image | null;
  private arrowUp: Phaser.GameObjects.Sprite | null = null;
  private arrowDown: Phaser.GameObjects.Sprite | null = null;

  private scale: number = 0.1666666667;

  private static readonly MAX_VISIBLE_BALLS = 5;
  private scrollCursor: number = 0;
  private fullDisplayList: BallDisplayEntry[] = [];
  private visibleDisplayList: BallDisplayEntry[] = [];
  private _ballHitZones: Phaser.GameObjects.Zone[] = [];
  private _ballPattern?: ModalBackgroundHandle;

  private standardBalls: PokeballType[] = [
    PokeballType.ULTRA_BALL,
    PokeballType.ROGUE_BALL,
    PokeballType.MASTER_BALL,
    PokeballType.VOID_BALL,
  ];

  constructor(scene: BattleScene) {
    super(scene, Mode.BALL);
  }

  setup() {
    const ui = this.getUi();
    this.scale = getTextStyleOptions(TextStyle.WINDOW, this.scene.uiTheme).scale;

    this.pokeballSelectContainer = this.scene.add.container(0, -49);
    this.pokeballSelectContainer.setVisible(false);
    ui.add(this.pokeballSelectContainer);

    this.pokeballSelectBg = addWindow(this.scene, 0, 0, 120, 100);
    this.pokeballSelectBg.setOrigin(0, 1);
    this.pokeballSelectContainer.add(this.pokeballSelectBg);

    this.optionsText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { align: "right", maxLines: BallUiHandler.MAX_VISIBLE_BALLS + 1 });
    this.optionsText.setOrigin(0, 0);
    this.pokeballSelectContainer.add(this.optionsText);

    this.countsText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { maxLines: BallUiHandler.MAX_VISIBLE_BALLS + 1 });
    this.pokeballSelectContainer.add(this.countsText);

    this.setCursor(0);
  }

  private ensureScrollArrows(): void {
    if (!this.arrowDown) {
      this.arrowDown = this.scene.add.sprite(0, 0, "prompt");
      this.pokeballSelectContainer.add(this.arrowDown);
      this.arrowDown.setVisible(false);
    }
    if (!this.arrowUp) {
      this.arrowUp = this.scene.add.sprite(0, 0, "prompt");
      this.arrowUp.flipY = true;
      this.pokeballSelectContainer.add(this.arrowUp);
      this.arrowUp.setVisible(false);
    }
  }

  private buildDisplayList(): void {
    this.fullDisplayList = [];

    for (const pb of this.standardBalls) {
      const count = this.scene.pokeballCounts[pb] || 0;
      if (count > 0 || pb === PokeballType.ULTRA_BALL) {
        this.fullDisplayList.push({
          pokeballType: pb,
          name: getPokeballName(pb, this.scene),
          count: count,
        });
      }
    }

    const typeBallEntries: BallDisplayEntry[] = [];
    for (const [typeIdStr, count] of Object.entries(this.scene.typeBallCounts)) {
      if (count > 0) {
        const typeId = parseInt(typeIdStr) as Type;
        const localizedType = i18next.t(`pokemonInfo:Type.${Type[typeId]}`, { defaultValue: Type[typeId] });
        const displayName = i18next.t("pokeball:typeBall", { typeName: localizedType });
        typeBallEntries.push({
          pokeballType: PokeballType.TYPE_BALL,
          targetType: typeId,
          name: displayName,
          count: count,
        });
      }
    }
    typeBallEntries.sort((a, b) => (a.targetType as number) - (b.targetType as number));

    const ultraIdx = this.fullDisplayList.findIndex(e => e.pokeballType === PokeballType.ULTRA_BALL);
    const insertIdx = ultraIdx >= 0 ? ultraIdx + 1 : 0;
    this.fullDisplayList.splice(insertIdx, 0, ...typeBallEntries);
  }

  private rebuildVisibleList(): void {
    const maxVisible = BallUiHandler.MAX_VISIBLE_BALLS;
    const total = this.fullDisplayList.length;
    const needsScroll = total > maxVisible;

    let startIdx = this.scrollCursor;
    let endIdx = Math.min(total, startIdx + maxVisible);

    this.visibleDisplayList = this.fullDisplayList.slice(startIdx, endIdx);

    let optionsTextContent = "";
    let countsTextContent = "";

    for (const entry of this.visibleDisplayList) {
      optionsTextContent += `${entry.name}\n`;
      countsTextContent += `x${entry.count}\n`;
    }
    optionsTextContent += "Cancel";

    this.optionsText.setText(optionsTextContent);
    this.countsText.setText(countsTextContent);

    const visibleCount = this.visibleDisplayList.length;
    const hasScrollUp = needsScroll && startIdx > 0;
    const hasScrollDown = needsScroll && endIdx < total;
    const totalLines = visibleCount + 1;

    const ROW_STEP = 96;
    const optionsTextWidth = this.optionsText.displayWidth;
    this.pokeballSelectBg.setSize(50 + Math.max(64, optionsTextWidth), 32 + totalLines * ROW_STEP * this.scale);
    this.pokeballSelectContainer.setX((this.scene.game.canvas.width / 6) - 51 - Math.max(64, optionsTextWidth));

    this.optionsText.setPositionRelative(this.pokeballSelectBg, 42, 9);
    this.optionsText.setLineSpacing(this.scale * ROW_STEP);
    this.countsText.setPositionRelative(this.pokeballSelectBg, 18, 9);
    this.countsText.setLineSpacing(this.scale * ROW_STEP);

    this.ensureScrollArrows();
    const centerX = this.pokeballSelectBg.width / 2;
    this.arrowUp!.setScale(this.scale * 6);
    this.arrowDown!.setScale(this.scale * 6);
    this.arrowUp!.setPositionRelative(this.pokeballSelectBg, centerX, 6);
    this.arrowDown!.setPositionRelative(this.pokeballSelectBg, centerX, this.pokeballSelectBg.height - 6);
    this.arrowUp!.setVisible(hasScrollUp);
    this.arrowDown!.setVisible(hasScrollDown);

    this._ballHitZones.forEach(z => z.destroy());
    this._ballHitZones = [];
    const rowStep = 96 * this.scale;
    const bgTopY = this.pokeballSelectBg.y - this.pokeballSelectBg.height;
    for (let r = 0; r <= visibleCount; r++) {
      const zoneW = this.pokeballSelectBg.width - 16;
      const zoneH = rowStep;
      const zoneX = this.pokeballSelectBg.x + 8 + zoneW / 2;
      const zoneY = bgTopY + 9 + r * rowStep + zoneH / 2;
      const zone = this.scene.add.zone(zoneX, zoneY, zoneW, zoneH);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive({ useHandCursor: true });
      const idx = r;
      zone.on("pointerover", () => {
        if (this.getCursor() !== idx) this.setCursor(idx);
      });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (this.getCursor() !== idx) {
          this.setCursor(idx);
        } else {
          this.processInput(Button.ACTION);
        }
      });
      this.pokeballSelectContainer.add(zone);
      this._ballHitZones.push(zone);
    }

    this._ballPattern?.redraw();
  }

  show(args: any[]): boolean {
    super.show(args);

    this.scrollCursor = 0;
    this.buildDisplayList();
    this.rebuildVisibleList();
    this.ensureScrollArrows();
    this.arrowUp!.play("prompt");
    this.arrowDown!.play("prompt");
    const total = this.fullDisplayList.length;
    const maxVisible = BallUiHandler.MAX_VISIBLE_BALLS;
    const needsScroll = total > maxVisible;
    const hasScrollUp = needsScroll && this.scrollCursor > 0;
    const hasScrollDown = needsScroll && this.scrollCursor + maxVisible < total;
    this.arrowUp!.setVisible(hasScrollUp);
    this.arrowDown!.setVisible(hasScrollDown);
    if (this.scene.uiTheme === UiTheme.LEGACY) {
      this.arrowUp!.setTint(0x484848);
      this.arrowDown!.setTint(0x484848);
    } else {
      this.arrowUp!.clearTint();
      this.arrowDown!.clearTint();
    }
    if (!this._ballPattern) {
      this._ballPattern = attachModalBackground(
        this.scene,
        this.pokeballSelectContainer,
        () => ({
          bgX: this.pokeballSelectBg.x,
          bgY: this.pokeballSelectBg.y - this.pokeballSelectBg.height,
          bgWidth: this.pokeballSelectBg.width,
          bgHeight: this.pokeballSelectBg.height,
        }),
        {
          mask: false,
          alphaMultiplier: 0.5,
          gridInc: -2,
          getTarget: () => this.pokeballSelectBg,
        }
      );
    } else {
      this._ballPattern.redraw();
    }

    this.pokeballSelectContainer.setVisible(true);
    const ui = this.getUi();
    ui.bringToTop(this.pokeballSelectContainer);
    PokemonBattleTooltipUtils.disableBattleHoverZones();
    this.setCursor(0);

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    const total = this.fullDisplayList.length;
    const maxVisible = BallUiHandler.MAX_VISIBLE_BALLS;
    const needsScroll = total > maxVisible;
    const hasScrollUp = needsScroll && this.scrollCursor > 0;
    const hasScrollDown = needsScroll && this.scrollCursor + maxVisible < total;
    const visibleCount = this.visibleDisplayList.length;

    const firstBallIndex = 0;
    const cancelIndex = firstBallIndex + visibleCount;
    const maxIndex = cancelIndex;

    if (button === Button.ACTION || button === Button.CANCEL) {
      const commandPhase = this.scene.getCurrentPhase() as CommandPhase;
      success = true;
      if (button === Button.ACTION && this.cursor >= firstBallIndex && this.cursor < cancelIndex) {
        const adjustedCursor = this.cursor - firstBallIndex;

        if (adjustedCursor >= 0 && adjustedCursor < visibleCount) {
          const entry = this.visibleDisplayList[adjustedCursor];
          if (entry.count > 0) {
            if (entry.targetType !== undefined) {
              if (commandPhase.handleCommand(Command.BALL, PokeballType.TYPE_BALL, entry.targetType)) {
                this.scene.ui.setMode(Mode.COMMAND, commandPhase.getFieldIndex());
                this.scene.ui.setMode(Mode.MESSAGE);
                success = true;
              }
            } else {
              if (commandPhase.handleCommand(Command.BALL, entry.pokeballType)) {
                this.scene.ui.setMode(Mode.COMMAND, commandPhase.getFieldIndex());
                this.scene.ui.setMode(Mode.MESSAGE);
                success = true;
              }
            }
          } else {
            ui.playError();
          }
        }
      } else if (button === Button.CANCEL || (button === Button.ACTION && this.cursor === cancelIndex)) {
        ui.setMode(Mode.COMMAND, commandPhase.getFieldIndex());
        success = true;
      }
    } else {
      switch (button) {
      case Button.UP:
        if (this.cursor > 0) {
          success = this.setCursor(this.cursor - 1);
        } else {
          if (hasScrollUp) {
            this.scrollCursor--;
            this.rebuildVisibleList();
            success = this.setCursor(0);
          } else {
            success = this.setCursor(maxIndex);
          }
        }
        break;
      case Button.DOWN:
        if (this.cursor < maxIndex) {
          success = this.setCursor(this.cursor + 1);
        } else {
          if (hasScrollDown) {
            this.scrollCursor++;
            this.rebuildVisibleList();
            success = this.setCursor(this.visibleDisplayList.length);
          } else {
            success = this.setCursor(0);
          }
        }
        break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.pokeballSelectContainer.add(this.cursorObj);
    }

    this.cursorObj.setScale(this.scale * 6);
    this.cursorObj.setPositionRelative(this.pokeballSelectBg, 12, 15 + (6 + this.cursor * 96) * this.scale);

    return ret;
  }

  clear() {
    super.clear();
    this._ballPattern?.clear();
    this._ballPattern = undefined;
    this._ballHitZones.forEach(z => z.destroy());
    this._ballHitZones = [];
    this.pokeballSelectContainer.setVisible(false);
    PokemonBattleTooltipUtils.enableBattleHoverZones();
    this.eraseCursor();
    if (this.arrowUp) {
      this.arrowUp.destroy();
      this.arrowUp = null;
    }
    if (this.arrowDown) {
      this.arrowDown.destroy();
      this.arrowDown = null;
    }
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}