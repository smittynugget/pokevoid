import BattleScene, {InfoToggle} from "../battle-scene";
import { TextStyle, addTextObject } from "./text";
import { addWindow } from "./ui-theme";
import * as Utils from "../utils";
import Move, { MoveCategory } from "../data/move";
import { Type } from "../data/type";
import i18next from "i18next";

export interface DynamicMoveInfoOverlaySettings {
    delayVisibility?: boolean; // if true, showing the overlay will only set it to active and populate the fields and the handler using this field has to manually call setVisible later.
    scale?:number; // scale the box? A scale of 0.5 is recommended
    top?: boolean; // should the effect box be on top?
    right?: boolean; // should the effect box be on the right?
    onSide?: boolean; // should the effect be on the side? ignores top argument if true
    descriptionOnly?: boolean; // if true, only shows description box without effect box
    //location and width of the component; unaffected by scaling
    x?: number;
    y?: number;
    width?: number; // default is always half the screen, regardless of scale
}

const EFF_HEIGHT = 46;
const EFF_WIDTH = 82;
const DESC_HEIGHT = 46;
const BORDER = 8;
const GLOBAL_SCALE = 6;

export default class DynamicMoveInfoOverlay extends Phaser.GameObjects.Container implements InfoToggle {
  public active: boolean = false;

  private move: Move | string | null = null;
  private descBg: Phaser.GameObjects.NineSlice;

  private desc: Phaser.GameObjects.Text;
  private descScroll: Phaser.Tweens.Tween | null = null;

  private val: Phaser.GameObjects.Container | null = null;
  private pp: Phaser.GameObjects.Text | null = null;
  private pow: Phaser.GameObjects.Text | null = null;
  private acc: Phaser.GameObjects.Text | null = null;
  private typ: Phaser.GameObjects.Sprite | null = null;
  private cat: Phaser.GameObjects.Sprite | null = null;

  private options: DynamicMoveInfoOverlaySettings;

  constructor(scene: BattleScene, options?: DynamicMoveInfoOverlaySettings) {
    if (options?.onSide) {
      options.top = false;
    }
    super(scene, options?.x, options?.y);
    const scale = options?.scale || 1;
    this.setScale(scale);
    this.options = options || {};

    // prepare the description box
    const width = (options?.width || DynamicMoveInfoOverlay.getWidth(scale, scene, options?.descriptionOnly)) / scale;
    this.descBg = addWindow(scene, 0, 0, width, DESC_HEIGHT);
    this.descBg.setOrigin(0, 0);
    this.add(this.descBg);

    // set up the description
    this.desc = addTextObject(scene, BORDER, BORDER - 2, "", TextStyle.BATTLE_INFO, { 
      wordWrap: { width: (width - (BORDER - 2) * 2) * GLOBAL_SCALE } 
    });

    if (options?.descriptionOnly) {
      this.desc.setPosition(BORDER, BORDER - 2);
    }

    // limit the text rendering, required for scrolling later on
    const maskPointOrigin = {
      x: (options?.x || 0),
      y: (options?.y || 0),
    };
    if (maskPointOrigin.x < 0) {
      maskPointOrigin.x += this.scene.game.canvas.width / GLOBAL_SCALE;
    }
    if (maskPointOrigin.y < 0) {
      maskPointOrigin.y += this.scene.game.canvas.height / GLOBAL_SCALE;
    }

    const moveDescriptionTextMaskRect = this.scene.make.graphics();
    moveDescriptionTextMaskRect.fillStyle(0xFF0000);
    moveDescriptionTextMaskRect.fillRect(
      maskPointOrigin.x + BORDER * scale, maskPointOrigin.y + BORDER - 2 * scale,
      width - BORDER * 2 * scale, (DESC_HEIGHT - (BORDER - 2) * 2) * scale);
    moveDescriptionTextMaskRect.setScale(6);
    const moveDescriptionTextMask = this.createGeometryMask(moveDescriptionTextMaskRect);

    this.add(this.desc);
    this.desc.setMask(moveDescriptionTextMask);

    // Only create effect box if not in description-only mode
    if (!options?.descriptionOnly) {
        // prepare the effect box
        this.val = new Phaser.GameObjects.Container(scene, options?.right ? width - EFF_WIDTH : 0,  options?.top || options?.onSide ? 0 : DESC_HEIGHT);
        this.add(this.val);

        const valuesBg = addWindow(scene, 0, 0, EFF_WIDTH, EFF_HEIGHT);
        valuesBg.setOrigin(0, 0);
        this.val.add(valuesBg);

        this.typ = this.scene.add.sprite(25, EFF_HEIGHT - 35,`types${Utils.verifyLang(i18next.language) ? `_${i18next.language}` : ""}` , "unknown");
        this.typ.setScale(0.8);
        this.val.add(this.typ);

        this.cat = this.scene.add.sprite(57, EFF_HEIGHT - 35, "categories", "physical");
        this.val.add(this.cat);

        const ppTxt = addTextObject(scene, 12, EFF_HEIGHT - 25, "PP", TextStyle.MOVE_INFO_CONTENT);
        ppTxt.setOrigin(0.0, 0.5);
        ppTxt.setText(i18next.t("fightUiHandler:pp"));
        this.val.add(ppTxt);

        this.pp = addTextObject(scene, 70, EFF_HEIGHT - 25, "--", TextStyle.MOVE_INFO_CONTENT);
        this.pp.setOrigin(1, 0.5);
        this.val.add(this.pp);

        const powTxt = addTextObject(scene, 12, EFF_HEIGHT - 17, "POWER", TextStyle.MOVE_INFO_CONTENT);
        powTxt.setOrigin(0.0, 0.5);
        powTxt.setText(i18next.t("fightUiHandler:power"));
        this.val.add(powTxt);

        this.pow = addTextObject(scene, 70, EFF_HEIGHT - 17, "---", TextStyle.MOVE_INFO_CONTENT);
        this.pow.setOrigin(1, 0.5);
        this.val.add(this.pow);

        const accTxt = addTextObject(scene, 12, EFF_HEIGHT - 9, "ACC", TextStyle.MOVE_INFO_CONTENT);
        accTxt.setOrigin(0.0, 0.5);
        accTxt.setText(i18next.t("fightUiHandler:accuracy"));
        this.val.add(accTxt);

        this.acc = addTextObject(scene, 70, EFF_HEIGHT - 9, "---", TextStyle.MOVE_INFO_CONTENT);
        this.acc.setOrigin(1, 0.5);
        this.val.add(this.acc);
    }

    // hide this component for now
    this.setVisible(false);
  }

  // show this component with infos for the specific move
  show(move: Move | string): boolean {
    if (!move || !(this.scene as BattleScene).enableMoveInfo) {
        return false;
    }

    this.move = move;  // Store the move/description

    // Set descriptionOnly based on input type
    const isDescriptionOnly = typeof move === 'string';

    if(isDescriptionOnly !== this.options.descriptionOnly) {
      this.options.descriptionOnly = isDescriptionOnly;
      // Update layout when descriptionOnly mode changes
      const width = DynamicMoveInfoOverlay.getWidth(this.scaleX, this.scene as BattleScene, this.options.descriptionOnly) / this.scaleX;
      this.desc.setWordWrapWidth((width - (BORDER - 2) * 2) * GLOBAL_SCALE);
      if (this.descBg) {
        this.descBg.width = width;
      }
    }

    // Handle effect box visibility
    if (this.val) {
        this.val.setVisible(!this.options.descriptionOnly);
    }

    if (typeof move === 'string') {
        // Handle description-only mode
        this.desc.setText(move);
    } else {
        // Handle move mode
        if (!this.options.descriptionOnly && this.val && this.pow && this.acc && this.pp && this.typ && this.cat) {
            this.pow.setText(move.power >= 0 ? move.power.toString() : "---");
            this.acc.setText(move.accuracy >= 0 ? move.accuracy.toString() : "---");
            this.pp.setText(move.pp >= 0 ? move.pp.toString() : "---");
            this.typ.setTexture(`types${Utils.verifyLang(i18next.language) ? `_${i18next.language}` : ""}`, Type[move.type].toLowerCase());
            this.cat.setFrame(MoveCategory[move.category].toLowerCase());
        }
        this.desc.setText(move?.effect || "");
    }

    // stop previous scrolling effects and reset y position
    if (this.descScroll) {
        this.descScroll.remove();
        this.descScroll = null;
        this.desc.y = BORDER - 2;
    }

    // determine if we need to add new scrolling effects
    const moveDescriptionLineCount = Math.floor(this.desc.displayHeight * (96 / 72) / 14.83);
    if (moveDescriptionLineCount > 3) {
        // generate scrolling effects
        this.descScroll = this.scene.tweens.add({
            targets: this.desc,
            delay: Utils.fixedInt(2000),
            loop: -1,
            hold: Utils.fixedInt(2000),
            duration: Utils.fixedInt((moveDescriptionLineCount - 3) * 2000),
            y: `-=${14.83 * (72 / 96) * (moveDescriptionLineCount - 3)}`
        });
    }

    if (!this.options.delayVisibility) {
        this.setVisible(true);
    }
    this.active = true;
    return true;
  }

  clear() {
    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
    }
    // Ensure effect box is hidden when clearing
    if (this.val) {
        this.val.setVisible(!this.options.descriptionOnly);
    }
    this.desc.y = BORDER - 2;
    this.move = null;
    this.setVisible(false);
    this.active = false;
  }

  toggleInfo(force?: boolean): void {
    this.setVisible(force ?? !this.visible);
  }

  isActive(): boolean {
    return this.active;
  }

  // width of this element
  static getWidth(scale: number, scene: BattleScene, descriptionOnly?: boolean): number {
    const fullWidth = scene.game.canvas.width / GLOBAL_SCALE;
    return descriptionOnly ? fullWidth : fullWidth - EFF_WIDTH;
  }

  // height of this element
  static getHeight(scale:number, onSide?: boolean, descriptionOnly?: boolean):number {
    return (descriptionOnly ? DESC_HEIGHT : (onSide ? Math.max(EFF_HEIGHT, DESC_HEIGHT) : (EFF_HEIGHT + DESC_HEIGHT))) * scale;
  }
}
