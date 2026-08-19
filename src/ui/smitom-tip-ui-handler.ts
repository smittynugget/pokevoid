import BattleScene from "#app/battle-scene.js";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { Mode } from "./mode";
import { addTextObject, TextStyle } from "./text";
import { Button } from "#enums/buttons";
import i18next from "i18next";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { isPrimaryPointer } from "./pointer-utils";
import * as Utils from "../utils";

export interface SmitomTipConfig {
  tutorialKey: string;
  title: string;
  texts: string[];
  offerReplay?: boolean;
  onComplete?: () => void;
}

const PANEL_WIDTH = 270;
const PANEL_HEIGHT = 50;
const PANEL_RADIUS = 4;
const BG_COLOR = 0x000000;
const BG_ALPHA = 0.8;
const BORDER_COLOR = 0xffffff;
const BORDER_ALPHA = 0.2;
const BORDER_WIDTH = 0.5;
const PORTAL_X = 30;
const PORTAL_Y = 25;
const PORTAL_SCALE = 0.258;
const SMITOM_X = 39;
const SMITOM_Y = 25;
const SMITOM_SCALE = 0.160;
const TEXT_LEFT = 60;
const HEADER_Y = 7;
const BODY_Y = 19;
const LS_BUFFER = 110;
const TEXT_WRAP_WIDTH = (PANEL_WIDTH - TEXT_LEFT - 20) * 6 - LS_BUFFER;

export default class SmitomTipUiHandler extends AwaitableUiHandler {
  private _setupGeneration: number = 0;
  private config: SmitomTipConfig | null = null;
  private currentTextIndex: number = 0;

  private tipContainer: Phaser.GameObjects.Container | null = null;
  private dimOverlay: Phaser.GameObjects.Graphics | null = null;
  private tipBgNineSlice: Phaser.GameObjects.NineSlice | null = null;
  private _tipBgPattern: ModalBackgroundHandle | null = null;
  private portalSprite: Phaser.GameObjects.Image | null = null;
  private smitomSprite: Phaser.GameObjects.Sprite | null = null;
  private headerText: Phaser.GameObjects.Text | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private promptSprite: Phaser.GameObjects.Sprite | null = null;

  private inputDelayTimer: Phaser.Time.TimerEvent | null = null;
  private inputBlocked: boolean = false;
  private readonly INPUT_DELAY_MS = 500;

  private _pixelateFx: Phaser.FX.Pixelate | null = null;
  private _titlePixFx: Phaser.FX.Pixelate | null = null;
  private _bodyPixFx: Phaser.FX.Pixelate | null = null;
  private _smitomBobTween: Phaser.Tweens.Tween | null = null;
  private _animTimers: Phaser.Time.TimerEvent[] = [];
  private _animTweens: Phaser.Tweens.Tween[] = [];
  private _isFirstShow: boolean = true;
  private _isExiting: boolean = false;

  private _replayPages: string[] | null = null;
  private _replayPageIndex: number = 0;
  private _lastReplayPromptIdx: number = -1;

  private bgMode: number = 2;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private bgPatternContainer: Phaser.GameObjects.Container | null = null;
  private bgAlphaOffset: number = 0;
  private replayTimers: Phaser.Time.TimerEvent[] = [];
  private inputBlockerZone: Phaser.GameObjects.Zone | null = null;

  private handleBgCycleKey = (event: KeyboardEvent): void => {
    if (event) event.stopImmediatePropagation?.();
    if (!(this.scene as any).uiEditModeActive) return;
    this.cycleDimBackground();
  };

  private handleTransparencyMore = (event: KeyboardEvent): void => {
    if (event) event.stopImmediatePropagation?.();
    if (!(this.scene as any).uiEditModeActive) return;
    this.bgAlphaOffset -= 0.10;
    this.applyBgAlpha();
  };

  private handleTransparencyLess = (event: KeyboardEvent): void => {
    if (event) event.stopImmediatePropagation?.();
    if (!(this.scene as any).uiEditModeActive) return;
    this.bgAlphaOffset += 0.10;
    this.applyBgAlpha();
  };

  constructor(scene: BattleScene, mode: Mode) {
    super(scene, mode);
  }

  setup(): void {}

  show(args: any[]): boolean {
    if (!args.length) return false;

    const config = args[0] as SmitomTipConfig;
    if (!config || !config.texts || !config.texts.length) return false;

    console.warn("[SMITOM-TIP] show() called", { key: config.tutorialKey, title: config.title, wasActive: this.active, gen: this._setupGeneration });

    if (this.active) {
      console.warn("[SMITOM-TIP] show() clearing previous active tip");
      this.clear();
    }

    const gen = ++this._setupGeneration;
    this.config = config;
    this.currentTextIndex = 0;
    this.bgAlphaOffset = 0;
    this.bgMode = 2;
    this.active = true;

    const scene = this.scene as BattleScene;
    const ui = this.getUi();

    scene.getRandomSmittySound(undefined, true);

    this._isFirstShow = true;
    this._isExiting = false;

    console.warn("[SMITOM-TIP] show() starting setupTipPanel gen=", gen);

    this.setupTipPanel(gen).catch(err => {
      console.error("[SMITOM-TIP] setupTipPanel failed:", err);
      this.active = false;
      this.scene.ui.revertMode();
      if (this.config?.onComplete) {
        this.config.onComplete();
      }
    });

    return true;
  }

  private async ensureTexture(key: string, path: string): Promise<void> {
    if (this.scene.textures.exists(key)) return;

    if (this.scene.load.isLoading()) {
      await new Promise<void>(resolve => {
        this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      });
      if (this.scene.textures.exists(key)) return;
    }

    return new Promise<void>((resolve) => {
      const onComplete = () => {
        this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
        resolve();
      };
      const onError = (file: any) => {
        if (file.key === key) {
          this.scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
          resolve();
        }
      };
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
      this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      this.scene.load.embeddedAtlas(key, path);
      this.scene.load.start();
    });
  }

  private async setupTipPanel(gen: number): Promise<void> {
    const spriteKey = "pkmn__glitch__smitom";
    console.warn("[SMITOM-TIP] setupTipPanel: awaiting texture, gen=", gen);
    await this.ensureTexture(spriteKey, "images/pokemon/glitch/smitom.png");
    if (!this.active || gen !== this._setupGeneration) {
      console.warn("[SMITOM-TIP] setupTipPanel: BAILED after texture", { active: this.active, gen, currentGen: this._setupGeneration });
      return;
    }
    console.warn("[SMITOM-TIP] setupTipPanel: texture loaded, building UI, gen=", gen);

    const screenWidth = this.scene.game.canvas.width / 6;
    const panelX = (screenWidth - PANEL_WIDTH) / 2;
    const panelY = -PANEL_HEIGHT - 4;

    const ui = this.getUi();

    this.dimOverlay = this.scene.add.graphics();
    this.createDimBgForMode(this.bgMode);

    this.scene.input.keyboard?.on("keydown-E", this.handleBgCycleKey, this);
    this.scene.input.keyboard?.on("keydown-V", this.handleTransparencyMore, this);
    this.scene.input.keyboard?.on("keydown-P", this.handleTransparencyLess, this);

    this.tipContainer = this.scene.add.container(panelX, panelY);

    this.tipBgNineSlice = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, PANEL_WIDTH, PANEL_HEIGHT, 12, 12, 12, 12);
    this.tipBgNineSlice.setOrigin(0, 0);
    this.tipContainer.add(this.tipBgNineSlice);

    this._tipBgPattern = attachModalBackground(
      this.scene as BattleScene,
      this.tipContainer,
      () => ({ bgX: 0, bgY: 0, bgWidth: PANEL_WIDTH, bgHeight: PANEL_HEIGHT }),
      { mask: false, alphaMultiplier: 0.6, getTarget: () => this.tipBgNineSlice! }
    );

    this.portalSprite = this.scene.add.image(PORTAL_X, PORTAL_Y, "void_portal");
    this.portalSprite.setScale(0);
    this.portalSprite.setOrigin(0.5, 0.5);
    this.portalSprite.setAlpha(0);
    this.tipContainer.add(this.portalSprite);

    if (this.scene.textures.exists(spriteKey)) {
      this.smitomSprite = this.scene.add.sprite(PORTAL_X, PORTAL_Y, spriteKey);
      this.smitomSprite.setScale(SMITOM_SCALE * 0.3);
      this.smitomSprite.setOrigin(0.5, 0.5);
      this.smitomSprite.setFlipX(true);
      this.smitomSprite.setAlpha(0);
      this.tipContainer.add(this.smitomSprite);
    }

    this.headerText = addTextObject(
      this.scene,
      TEXT_LEFT,
      HEADER_Y,
      "",
      TextStyle.SUMMARY_GOLD,
      { fontSize: "66px" }
    );
    this.tipContainer.add(this.headerText);

    this.bodyText = addTextObject(
      this.scene,
      TEXT_LEFT,
      BODY_Y,
      "",
      TextStyle.TOOLTIP_CONTENT,
      { wordWrap: { width: TEXT_WRAP_WIDTH }, fontSize: "61px" }
    );
    this.bodyText.setLetterSpacing(1);
    this.bodyText.setMaxLines(2);
    this.bodyText.setLineSpacing(this.bodyText.scale * 30 * (61 / 96));
    this.tipContainer.add(this.bodyText);

    this.promptSprite = this.scene.add.sprite(0, 0, "prompt");
    this.promptSprite.setVisible(false);
    this.promptSprite.setOrigin(0, 0);
    this.promptSprite.setScale(0.4);
    this.tipContainer.add(this.promptSprite);

    ui.add(this.tipContainer);
    ui.bringToTop(this.tipContainer);

    if (!this.active || gen !== this._setupGeneration) return;
    this.createInputBlockerZone();

    this.animateEntrance();
  }

  private createInputBlockerZone(): void {
    const scene = this.scene as BattleScene;
    const ui = this.getUi();
    const screenW = scene.game.canvas.width / 6;
    const screenH = scene.game.canvas.height / 6;
    this.inputBlockerZone = scene.add.zone(0, -screenH, screenW, screenH);
    this.inputBlockerZone.setOrigin(0, 0);
    this.inputBlockerZone.setInteractive();
    this.inputBlockerZone.setDepth(10000000001);
    ui.add(this.inputBlockerZone);
    this.inputBlockerZone.on("pointerover", () => {});
    this.inputBlockerZone.on("pointermove", () => {});
    this.inputBlockerZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      if (this.active && !this.inputBlocked && this.awaitingActionInput && this.onActionInput) {
        this.getUi().playSelect();
        const cb = this.onActionInput;
        this.onActionInput = null;
        this.awaitingActionInput = false;
        cb();
      }
    });
  }

  private animateEntrance(): void {
    console.warn("[SMITOM-TIP] animateEntrance() called", { hasTipContainer: !!this.tipContainer, active: this.active });
    if (!this.tipContainer || !this.active) return;

    this.tipContainer.setAlpha(1);
    if (this.tipBgNineSlice) {
      this.tipBgNineSlice.setAlpha(0);
      const panelAlphaTween = this.scene.tweens.add({
        targets: this.tipBgNineSlice,
        alpha: 1,
        duration: Utils.fixedInt(443),
        ease: "Linear"
      });
      this._animTweens.push(panelAlphaTween);
    }

    if (this.scene.animationLoadMode >= 2) {
      if (this.tipContainer.postFX) {
        this._pixelateFx = this.tipContainer.postFX.addPixelate(20);
        const pixTween = this.scene.tweens.add({
          targets: this._pixelateFx,
          amount: -1,
          duration: Utils.fixedInt(1100),
          ease: "Linear",
          onComplete: () => {
            if (this.tipContainer?.postFX && this._pixelateFx) {
              this.tipContainer.postFX.remove(this._pixelateFx);
            }
            this._pixelateFx = null;
          }
        });
        this._animTweens.push(pixTween);
      }
    }

    const portalTimer = this.scene.time.delayedCall(Utils.fixedInt(320) as any, () => {
      if (!this.portalSprite || !this.active) return;
      const portalAlphaTween = this.scene.tweens.add({
        targets: this.portalSprite,
        alpha: 1,
        duration: Utils.fixedInt(300),
        ease: "Linear"
      });
      this._animTweens.push(portalAlphaTween);
      const portalTween = this.scene.tweens.add({
        targets: this.portalSprite,
        scaleX: PORTAL_SCALE,
        scaleY: PORTAL_SCALE,
        duration: Utils.fixedInt(450),
        ease: "Back.easeOut"
      });
      this._animTweens.push(portalTween);
    });
    this._animTimers.push(portalTimer);

    const smitomTimer = this.scene.time.delayedCall(Utils.fixedInt(500) as any, () => {
      if (!this.smitomSprite || !this.active) return;
      const emergeTween = this.scene.tweens.add({
        targets: this.smitomSprite,
        x: SMITOM_X,
        y: SMITOM_Y,
        scaleX: SMITOM_SCALE,
        scaleY: SMITOM_SCALE,
        duration: Utils.fixedInt(450),
        ease: "Sine.easeOut",
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          if (this.smitomSprite) {
            this.smitomSprite.setAlpha(tween.progress);
          }
        },
        onComplete: () => {
          this.startSmitomBob();
        }
      });
      this._animTweens.push(emergeTween);
    });
    this._animTimers.push(smitomTimer);

    const titleTimer = this.scene.time.delayedCall(Utils.fixedInt(725) as any, () => {
      if (!this.headerText || !this.active || !this.config) return;
      this.animateTextPixelate(
        this.headerText,
        this.config.title,
        700,
        () => {
          this._isFirstShow = false;
          const bodyTimer = this.scene.time.delayedCall(Utils.fixedInt(100) as any, () => {
            if (!this.active) return;
            this.showTipText(0);
          });
          this._animTimers.push(bodyTimer);
        }
      );
    });
    this._animTimers.push(titleTimer);
  }

  private startSmitomBob(): void {
    if (!this.smitomSprite || !this.active) return;
    this._smitomBobTween = this.scene.tweens.add({
      targets: this.smitomSprite,
      y: SMITOM_Y - 1.5,
      duration: Utils.fixedInt(1200),
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  private animateTextPixelate(
    textObj: Phaser.GameObjects.Text,
    fullText: string,
    durationMs: number,
    onComplete?: () => void
  ): void {
    textObj.setText(fullText);
    textObj.setAlpha(0);

    this._animTweens.push(this.scene.tweens.add({
      targets: textObj,
      alpha: 1,
      duration: Utils.fixedInt(Math.round(durationMs * 0.4)),
      ease: "Linear"
    }));

    if (this.scene.animationLoadMode >= 2) {
      if (textObj.postFX) {
        const pixFx = textObj.postFX.addPixelate(12);
        if (textObj === this.headerText) {
          this._titlePixFx = pixFx;
        } else {
          this._bodyPixFx = pixFx;
        }
        this._animTweens.push(this.scene.tweens.add({
          targets: pixFx,
          amount: -1,
          duration: Utils.fixedInt(durationMs),
          ease: "Linear",
          onComplete: () => {
            textObj.postFX?.remove(pixFx);
            if (textObj === this.headerText) {
              this._titlePixFx = null;
            } else {
              this._bodyPixFx = null;
            }
            if (onComplete) onComplete();
          }
        }));
      } else if (onComplete) {
        this.scene.time.delayedCall(Utils.fixedInt(durationMs) as any, onComplete);
      }
    } else if (onComplete) {
      this.scene.time.delayedCall(Utils.fixedInt(durationMs) as any, onComplete);
    }
  }

  private originalTexts: string[] | null = null;

  private scheduleInputDelay(): void {
    if (this.inputDelayTimer) {
      this.inputDelayTimer.destroy();
      this.inputDelayTimer = null;
    }
    this.inputBlocked = true;
    this.awaitingActionInput = false;
    this.inputDelayTimer = this.scene.time.delayedCall(Utils.fixedInt(this.INPUT_DELAY_MS) as any, () => {
      this.inputBlocked = false;
      this.awaitingActionInput = true;
      this.inputDelayTimer = null;
    });
  }

  private showTipText(index: number): void {
    console.warn("[SMITOM-TIP] showTipText", { index, totalTexts: this.config?.texts?.length, active: this.active });
    if (!this.config) return;

    if (!this.originalTexts) {
      this.originalTexts = [...this.config.texts];
    }

    if (index === 0 && this.originalTexts) {
      this.config.texts = [...this.originalTexts];
      this.expandAllPages();
    }

    if (index >= this.config.texts.length) {
      this.hidePrompt();
      if (this.config.offerReplay) {
        this.showReplayPrompt();
      } else {
        this.completeTip();
      }
      return;
    }

    this.currentTextIndex = index;

    if (this._bodyPixFx && this.bodyText?.postFX) {
      this.bodyText.postFX.remove(this._bodyPixFx);
      this._bodyPixFx = null;
    }

    if (this.bodyText) {
      const pageText = this.config.texts[index];
      const isFirst = index === 0 && !this._isFirstShow;
      const dur = isFirst ? 600 : 400;

      this.bodyText.setText("");
      this.hidePrompt();
      this.animateTextPixelate(
        this.bodyText,
        pageText,
        dur,
        () => {
          this.showPrompt();
          this.scheduleInputDelay();
        }
      );
    }

    this.onActionInput = () => {
      this.showTipText(index + 1);
    };
  }

  private expandAllPages(): void {
    if (!this.config || !this.bodyText) return;
    const maxLines = 2;
    const expanded: string[] = [];
    for (const text of this.config.texts) {
      const wrappedFull = this.bodyText.runWordWrap(text).split(/\n/g);
      if (wrappedFull.length <= maxLines) {
        expanded.push(text);
        continue;
      }
      const pages = this.paginateBySentence(text, maxLines);
      expanded.push(...pages);
    }
    this.config.texts = expanded;
  }

  private paginateBySentence(text: string, maxLines: number): string[] {
    const sentenceRegex = /[^.!?]*[.!?]+[\s]*/g;
    const sentences: string[] = [];
    let match: RegExpExecArray | null;
    let lastIdx = 0;
    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push(match[0]);
      lastIdx = sentenceRegex.lastIndex;
    }
    if (lastIdx < text.length) {
      sentences.push(text.slice(lastIdx));
    }

    if (sentences.length <= 1) {
      return this.paginateByWordBoundary(text, maxLines);
    }

    const pages: string[] = [];
    let currentPage = "";
    for (const sentence of sentences) {
      const candidate = currentPage + sentence;
      const candidateLines = this.bodyText!.runWordWrap(candidate.trim()).split(/\n/g);

      if (candidateLines.length > maxLines && currentPage) {
        pages.push(currentPage.trim());
        currentPage = sentence;
      } else if (candidateLines.length > maxLines && !currentPage) {
        pages.push(...this.paginateByWordBoundary(sentence.trim(), maxLines));
        currentPage = "";
      } else {
        currentPage = candidate;
      }
    }
    if (currentPage.trim()) {
      const remainLines = this.bodyText!.runWordWrap(currentPage.trim()).split(/\n/g);
      if (remainLines.length > maxLines) {
        pages.push(...this.paginateByWordBoundary(currentPage.trim(), maxLines));
      } else {
        pages.push(currentPage.trim());
      }
    }

    const validated: string[] = [];
    for (const page of pages) {
      if (this.bodyText!.runWordWrap(page).split(/\n/g).length > maxLines) {
        validated.push(...this.paginateByWordBoundary(page, maxLines));
      } else {
        validated.push(page);
      }
    }
    return validated.length ? validated : [text];
  }

  private paginateByWordBoundary(text: string, maxLines: number): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (!words.length) return [text];
    const pages: string[] = [];
    let currentPage = "";
    for (const word of words) {
      const candidate = currentPage ? `${currentPage} ${word}` : word;
      const candidateLines = this.bodyText!.runWordWrap(candidate).split(/\n/g);
      if (candidateLines.length > maxLines && currentPage) {
        pages.push(currentPage);
        currentPage = word;
      } else {
        currentPage = candidate;
      }
    }
    if (currentPage) {
      pages.push(currentPage);
    }
    return pages.length ? pages : [text];
  }

  processInput(button: Button): boolean {
    if (!this.active) return false;
    if (this.inputBlocked) return true;

    if (button === Button.ACTION || button === Button.CANCEL || button === Button.SUBMIT) {
      if (this.awaitingActionInput && this.onActionInput) {
        console.warn("[SMITOM-TIP] processInput: advancing", { button, textIndex: this.currentTextIndex, totalTexts: this.config?.texts?.length });
        this.getUi().playSelect();
        const cb = this.onActionInput;
        this.onActionInput = null;
        this.awaitingActionInput = false;
        cb();
        return true;
      }
    }

    return false;
  }

  private showPrompt(): void {
    if (!this.promptSprite || !this.bodyText) return;
    const wrappedLines = this.bodyText.runWordWrap(this.bodyText.text).split(/\n/g);
    const lineCount = wrappedLines.length;
    const lastLine = wrappedLines[lineCount - 1] || "";

    const lineHeight = this.bodyText.displayHeight / Math.max(lineCount, 1);
    const tempText = this.scene.add.text(0, 0, lastLine, this.bodyText.style);
    tempText.setScale(this.bodyText.scale);
    const lastLineWidth = tempText.displayWidth;
    tempText.destroy();

    const promptX = TEXT_LEFT + lastLineWidth + 7;
    const promptY = BODY_Y + (lineCount - 1) * lineHeight + 6;

    this.promptSprite.setPosition(promptX, promptY);
    this.promptSprite.setVisible(true);
    this.promptSprite.play("prompt");
  }

  private hidePrompt(): void {
    if (this.promptSprite) {
      this.promptSprite.setVisible(false);
      this.promptSprite.anims?.stop();
    }
  }

  private showReplayPrompt(): void {
    this.hidePrompt();
    this.replayTimers.forEach(t => t.destroy());
    this.replayTimers = [];

    if (!this.bodyText) return;

    const prompts = i18next.t("tutorial:smitomTip.replayPrompt", { returnObjects: true });
    let promptText: string;
    if (Array.isArray(prompts) && prompts.length > 1) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * prompts.length);
      } while (idx === this._lastReplayPromptIdx);
      this._lastReplayPromptIdx = idx;
      promptText = prompts[idx];
    } else {
      promptText = Array.isArray(prompts) ? prompts[0] : prompts;
    }

    if (this._bodyPixFx && this.bodyText.postFX) {
      this.bodyText.postFX.remove(this._bodyPixFx);
      this._bodyPixFx = null;
    }

    const maxLines = 2;
    const wrappedLines = this.bodyText.runWordWrap(promptText).split(/\n/g);
    if (wrappedLines.length > maxLines) {
      const pages = this.paginateBySentence(promptText, maxLines);
      this._replayPages = pages;
      this._replayPageIndex = 0;
      this.showReplayPage(0);
    } else {
      this._replayPages = null;
      this.animateTextPixelate(this.bodyText, promptText, 400, () => {
        this.replayTimers.push(this.scene.time.delayedCall(Utils.fixedInt(300) as any, () => {
          if (!this.active) return;
          this.showReplayConfirm();
        }));
      });
    }
  }

  private showReplayPage(index: number): void {
    if (!this._replayPages || !this.bodyText || !this.active) return;

    if (index >= this._replayPages.length) {
      this._replayPages = null;
      this._replayPageIndex = 0;
      this.hidePrompt();
      this.replayTimers.push(this.scene.time.delayedCall(Utils.fixedInt(300) as any, () => {
        if (!this.active) return;
        this.showReplayConfirm();
      }));
      return;
    }

    this._replayPageIndex = index;
    if (this._bodyPixFx && this.bodyText.postFX) {
      this.bodyText.postFX.remove(this._bodyPixFx);
      this._bodyPixFx = null;
    }
    this.animateTextPixelate(this.bodyText, this._replayPages[index], 400, () => {
      if (this._replayPages && index < this._replayPages.length - 1) {
        this.showPrompt();
        this.scheduleInputDelay();
        this.onActionInput = () => {
          this.showReplayPage(index + 1);
        };
      } else {
        this.hidePrompt();
        this.replayTimers.push(this.scene.time.delayedCall(Utils.fixedInt(300) as any, () => {
          if (!this.active) return;
          this.showReplayConfirm();
        }));
      }
    });
  }

  private showReplayConfirm(): void {
    this.scene.ui.setOverlayMode(Mode.CONFIRM,
      () => {
        this.scene.ui.revertMode();
        this.replayTimers.push(this.scene.time.delayedCall(Utils.fixedInt(100) as any, () => {
          if (!this.active) return;
          this.showTipText(0);
        }));
      },
      () => {
        this.scene.ui.revertMode();
        this.replayTimers.push(this.scene.time.delayedCall(Utils.fixedInt(100) as any, () => {
          if (!this.active) return;
          this.completeTip();
        }));
      },
      false, 0, 0, 500, 1
    );
  }

  private completeTip(): void {
    console.warn("[SMITOM-TIP] completeTip() called", { isExiting: this._isExiting, active: this.active });
    if (this._isExiting) return;
    this._isExiting = true;

    this.hidePrompt();
    this.inputBlocked = true;

    if (this._smitomBobTween) {
      this._smitomBobTween.stop();
      this._smitomBobTween = null;
    }
    if (this._titlePixFx && this.headerText?.postFX) {
      this.headerText.postFX.remove(this._titlePixFx);
      this._titlePixFx = null;
    }
    if (this._bodyPixFx && this.bodyText?.postFX) {
      this.bodyText.postFX.remove(this._bodyPixFx);
      this._bodyPixFx = null;
    }

    if (this.smitomSprite) {
      this.scene.tweens.add({
        targets: this.smitomSprite,
        x: PORTAL_X,
        y: PORTAL_Y,
        scaleX: SMITOM_SCALE * 0.3,
        scaleY: SMITOM_SCALE * 0.3,
        alpha: 0,
        duration: Utils.fixedInt(350),
        ease: "Sine.easeOut"
      });
    }

    this.scene.time.delayedCall(Utils.fixedInt(210) as any, () => {
      this.animateTextExitPixelate(300);
    });

    this.scene.time.delayedCall(Utils.fixedInt(500) as any, () => {
      this.animateContainerExit(500);
    });
  }

  private animateTextExitPixelate(durationMs: number): void {
    if (!this.active) return;

    const pixelateOut = (textObj: Phaser.GameObjects.Text | null) => {
      if (!textObj || !textObj.text) return;
      if (this.scene.animationLoadMode >= 2) {
        if (textObj.postFX) {
          const pixFx = textObj.postFX.addPixelate(0);
          this._animTweens.push(this.scene.tweens.add({
            targets: pixFx,
            amount: 12,
            duration: Utils.fixedInt(durationMs),
            ease: "Linear",
            onComplete: () => {
              textObj.postFX?.remove(pixFx);
              textObj.setAlpha(0);
            }
          }));
        }
      }
      this._animTweens.push(this.scene.tweens.add({
        targets: textObj,
        alpha: 0,
        duration: Utils.fixedInt(durationMs),
        ease: "Sine.easeOut"
      }));
    };

    pixelateOut(this.headerText);
    pixelateOut(this.bodyText);
  }

  private animateContainerExit(durationMs: number): void {
    if (!this.active || !this.tipContainer) {
      this.finishExit();
      return;
    }

    if (this.portalSprite) {
      this.scene.tweens.add({
        targets: this.portalSprite,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: Utils.fixedInt(durationMs),
        ease: "Sine.easeOut"
      });
    }

    if (this.scene.animationLoadMode >= 2) {
      if (this.tipContainer.postFX) {
        this._pixelateFx = this.tipContainer.postFX.addPixelate(0);
        this.scene.tweens.add({
          targets: this._pixelateFx,
          amount: 20,
          duration: Utils.fixedInt(durationMs),
          ease: "Linear"
        });
      }
    }

    this.scene.tweens.add({
      targets: this.tipContainer,
      alpha: 0,
      duration: Utils.fixedInt(durationMs),
      ease: "Linear",
      onComplete: () => {
        this.finishExit();
      }
    });
  }

  private finishExit(): void {
    console.warn("[SMITOM-TIP] finishExit() called", { active: this.active });
    if (this.tipContainer?.postFX && this._pixelateFx) {
      this.tipContainer.postFX.remove(this._pixelateFx);
      this._pixelateFx = null;
    }
    const onComplete = this.config?.onComplete;
    this.clear();
    this.scene.ui.revertMode();
    if (onComplete) {
      onComplete();
    }
  }

  private getBaseBgAlpha(mode: number): number {
    switch (mode) {
      case 0: return 0.9;
      case 1: return 0.85;
      case 2: return 0.75;
      case 3: return 0.85;
      default: return 0.75;
    }
  }

  private applyBgAlpha(): void {
    const base = this.getBaseBgAlpha(this.bgMode);
    const effective = Math.max(0, Math.min(1, base + this.bgAlphaOffset));
    if (this.bgImage) {
      this.bgImage.setAlpha(effective);
    }
    if (this.bgPatternContainer) {
      const patternBase = this.bgMode === 0 ? 0.09 : 0.25;
      const patternEffective = Math.max(0, Math.min(1, patternBase + this.bgAlphaOffset));
      this.bgPatternContainer.setAlpha(patternEffective);
    }
  }

  private cycleDimBackground(): void {
    const modes = this.getAvailableBgModes();
    if (modes.length <= 1) return;
    const currentIdx = modes.indexOf(this.bgMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    this.bgMode = modes[nextIdx];
    this.destroyCurrentDimBg();
    this.createDimBgForMode(this.bgMode);
    this.applyBgAlpha();
  }

  private getAvailableBgModes(): number[] {
    const modes: number[] = [];
    if (this.scene.textures.exists("tutorial_bg")) modes.push(0);
    if (this.scene.textures.exists("hall_of_fame")) modes.push(1);
    if (this.scene.textures.exists("modal_bg")) modes.push(2);
    if (this.scene.textures.exists("light_bg")) modes.push(3);
    if (modes.length === 0) modes.push(2);
    return modes;
  }

  private createDimBgForMode(mode: number): void {
    const ui = this.getUi();
    const screenWidth = this.scene.game.canvas.width / 6;
    const screenHeight = this.scene.game.canvas.height / 6;

    const bgX = 0;
    const bgY = -screenHeight;
    const bgW = screenWidth;
    const bgH = screenHeight;

    switch (mode) {
      case 0: {
        if (!this.scene.textures.exists("tutorial_bg")) break;
        const img = this.scene.add.image(bgX, bgY, "tutorial_bg");
        img.setOrigin(0, 0);
        img.setDisplaySize(bgW, bgH);
        img.setAlpha(0.9);
        ui.add(img);
        ui.bringToTop(img);
        this.bgImage = img;
        break;
      }
      case 1: {
        if (!this.scene.textures.exists("hall_of_fame")) break;
        const img = this.scene.add.image(bgX, bgY, "hall_of_fame");
        img.setOrigin(0, 0);
        img.setDisplaySize(bgW, bgH);
        img.setAlpha(0.85);
        ui.add(img);
        ui.bringToTop(img);
        this.bgImage = img;
        break;
      }
      case 3: {
        if (!this.scene.textures.exists("light_bg")) break;
        const img = this.scene.add.image(bgX, bgY, "light_bg");
        img.setOrigin(0, 0);
        img.setDisplaySize(bgW, bgH);
        img.setAlpha(0.85);
        ui.add(img);
        ui.bringToTop(img);
        this.bgImage = img;
        break;
      }
      case 2:
      default: {
        if (this.scene.textures.exists("modal_bg")) {
          const img = this.scene.add.image(bgX, bgY, "modal_bg");
          img.setOrigin(0, 0);
          img.setDisplaySize(bgW, bgH);
          img.setAlpha(0.75);
          ui.add(img);
          ui.bringToTop(img);
          this.bgImage = img;
        } else {
          this.dimOverlay!.fillStyle(0x000000, 0.1);
          this.dimOverlay!.fillRect(bgX, bgY, bgW, bgH);
          ui.add(this.dimOverlay!);
          ui.bringToTop(this.dimOverlay!);
        }
        break;
      }
    }

    if (this.bgImage) {
      this.bgImage.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.bgImage.displayWidth, this.bgImage.displayHeight),
        Phaser.Geom.Rectangle.Contains
      );
      this.bgImage.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (!this.inputBlocked && this.active) {
          (this.scene as BattleScene).ui.processInput(Button.ACTION);
        }
      });
    } else if (this.dimOverlay) {
      this.dimOverlay.setInteractive(
        new Phaser.Geom.Rectangle(bgX, bgY, bgW, bgH),
        Phaser.Geom.Rectangle.Contains
      );
      this.dimOverlay.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (!this.inputBlocked && this.active) {
          (this.scene as BattleScene).ui.processInput(Button.ACTION);
        }
      });
    }

    if (this.tipContainer) {
      ui.bringToTop(this.tipContainer);
    }
  }

  private destroyCurrentDimBg(): void {
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.bgPatternContainer) {
      this.bgPatternContainer.destroy();
      this.bgPatternContainer = null;
    }
    if (this.dimOverlay) {
      this.dimOverlay.clear();
    }
  }

  private cleanupDimBackground(): void {
    this.scene.input.keyboard?.off("keydown-E", this.handleBgCycleKey, this);
    this.scene.input.keyboard?.off("keydown-V", this.handleTransparencyMore, this);
    this.scene.input.keyboard?.off("keydown-P", this.handleTransparencyLess, this);
    this.destroyCurrentDimBg();
    if (this.dimOverlay) {
      this.dimOverlay.disableInteractive();
      this.dimOverlay.off("pointerdown");
      this.dimOverlay.destroy();
      this.dimOverlay = null;
    }
  }

  clear(): void {
    console.warn("[SMITOM-TIP] clear() called", { wasActive: this.active, gen: this._setupGeneration, stack: new Error().stack?.split("\n").slice(1, 5).join(" <- ") });
    this._setupGeneration++;
    for (const t of this._animTimers) {
      try { t.remove(); } catch {  }
    }
    this._animTimers = [];
    for (const tw of this._animTweens) {
      try { tw.stop(); } catch {  }
    }
    this._animTweens = [];
    if (this._titlePixFx && this.headerText?.postFX) {
      try { this.headerText.postFX.remove(this._titlePixFx); } catch {  }
      this._titlePixFx = null;
    }
    if (this._bodyPixFx && this.bodyText?.postFX) {
      try { this.bodyText.postFX.remove(this._bodyPixFx); } catch {  }
      this._bodyPixFx = null;
    }
    if (this._smitomBobTween) {
      this._smitomBobTween.stop();
      this._smitomBobTween = null;
    }
    if (this._pixelateFx && this.tipContainer?.postFX) {
      try { this.tipContainer.postFX.remove(this._pixelateFx); } catch {  }
      this._pixelateFx = null;
    }
    this._isExiting = false;
    this._isFirstShow = true;

    this.replayTimers.forEach(t => t.destroy());
    this.replayTimers = [];
    if (this.inputDelayTimer) {
      this.inputDelayTimer.destroy();
      this.inputDelayTimer = null;
    }
    this.inputBlocked = false;
    if (this.inputBlockerZone) {
      this.inputBlockerZone.off("pointerdown");
      this.inputBlockerZone.destroy();
      this.inputBlockerZone = null;
    }
    if (this.smitomSprite) {
      this.scene.tweens.killTweensOf(this.smitomSprite);
    }
    if (this.portalSprite) {
      this.scene.tweens.killTweensOf(this.portalSprite);
    }
    if (this.headerText) {
      this.scene.tweens.killTweensOf(this.headerText);
    }
    if (this.bodyText) {
      this.scene.tweens.killTweensOf(this.bodyText);
    }
    if (this.tipContainer) {
      this.scene.tweens.killTweensOf(this.tipContainer);
      this.tipContainer.destroy();
      this.tipContainer = null;
    }
    this.cleanupDimBackground();
    if (this._tipBgPattern) {
      this._tipBgPattern.clear();
      this._tipBgPattern = null;
    }
    this.tipBgNineSlice = null;
    this.portalSprite = null;
    this.smitomSprite = null;
    this.headerText = null;
    this.bodyText = null;
    this.promptSprite = null;
    this.config = null;
    this.originalTexts = null;
    this._replayPages = null;
    this._replayPageIndex = 0;
    this.awaitingActionInput = false;
    this.onActionInput = null;
    this.active = false;
    super.clear();
  }
}