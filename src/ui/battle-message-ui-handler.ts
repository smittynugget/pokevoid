import BattleScene from "../battle-scene";
import { addBBCodeTextObject, addTextObject, getTextColor, TextStyle } from "./text";
import { Mode } from "./mode";
import * as Utils from "../utils";
import MessageUiHandler from "./message-ui-handler";
import { getStatName, Stat } from "../data/pokemon-stat";
import { addWindow } from "./ui-theme";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";
import {Button} from "#enums/buttons";
import i18next from "i18next";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";

export default class BattleMessageUiHandler extends MessageUiHandler {
  private levelUpStatsContainer: Phaser.GameObjects.Container;
  private levelUpStatsIncrContent: Phaser.GameObjects.Text;
  private levelUpStatsValuesContent: BBCodeText;
  private nameBox: Phaser.GameObjects.NineSlice;
  private nameText: Phaser.GameObjects.Text;

  public bg: Phaser.GameObjects.Sprite;
  public _messageBgPattern: ModalBackgroundHandle | null = null;
  public commandBacking: Phaser.GameObjects.Rectangle;
  public commandWindow: Phaser.GameObjects.NineSlice;
  public movesWindowContainer: Phaser.GameObjects.Container;
  public nameBoxContainer: Phaser.GameObjects.Container;
  public messageContainer: Phaser.GameObjects.Container;

  public readonly wordWrapWidth: number = 1780;

  constructor(scene: BattleScene) {
    super(scene, Mode.MESSAGE);
  }

  setup(): void {
    const ui = this.getUi();

    this.textTimer = null;
    this.textCallbackTimer = null;

    this.bg = this.scene.add.sprite(0, 0, "bg", this.scene.windowType);
    this.bg.setName("sprite-battle-msg-bg");
    this.bg.setOrigin(0, 1);
    ui.add(this.bg);

    this._messageBgPattern = attachModalBackground(
      this.scene as BattleScene,
      ui,
      () => ({
        bgX: this.bg.x,
        bgY: this.bg.y - this.bg.height * this.bg.originY,
        bgWidth: this.bg.width,
        bgHeight: this.bg.height,
      }),
      { mask: false, alphaMultiplier: 0.6, gridInc: -2, getTarget: () => this.bg }
    );

    this.commandBacking = this.scene.add.rectangle(202, 0, 118, 48, 0x0d1117, 1.0);
    this.commandBacking.setOrigin(0, 1);
    this.commandBacking.setName("command-backing");
    this.commandBacking.setVisible(false);
    ui.add(this.commandBacking);

    this.commandWindow = addWindow(this.scene, 202, 0, 118, 48);
    this.commandWindow.setName("window-command");
    this.commandWindow.setOrigin(0, 1);
    this.commandWindow.setVisible(false);
    ui.add(this.commandWindow);

    this.movesWindowContainer = this.scene.add.container(0, 0);
    this.movesWindowContainer.setName("moves-bg");
    this.movesWindowContainer.setVisible(false);

    const movesWindow = addWindow(this.scene, 0, 0, 243, 48);
    movesWindow.setName("moves-window");
    movesWindow.setOrigin(0, 1);

    const moveDetailsWindow = addWindow(this.scene, 240, 0, 80, 48, false, false, -1, 132);
    moveDetailsWindow.setName("move-details-window");
    moveDetailsWindow.setOrigin(0, 1);

    this.movesWindowContainer.add([movesWindow, moveDetailsWindow]);
    ui.add(this.movesWindowContainer);

    this.messageContainer = this.scene.add.container(12, -39);
    ui.add(this.messageContainer);

    const message = addTextObject(this.scene, 0, 0, "", TextStyle.MESSAGE, {
      maxLines: 2,
      wordWrap: {
        width: this.wordWrapWidth
      }
    });
    this.messageContainer.add(message);

    this.message = message;

    this.nameBoxContainer = this.scene.add.container(0, -16);
    this.nameBoxContainer.setVisible(false);

    this.nameBox = this.scene.add.nineslice(0, 0, "namebox", this.scene.windowType, 72, 16, 8, 8, 5, 5);
    this.nameBox.setOrigin(0, 0);

    this.nameText = addTextObject(this.scene, 8, 4, "Rival", TextStyle.MESSAGE, { maxLines: 1, fontSize: "54px"});

    this.nameBoxContainer.add(this.nameBox);
    this.nameBoxContainer.add(this.nameText);
    this.messageContainer.add(this.nameBoxContainer);

    const prompt = this.scene.add.sprite(0, 0, "prompt");
    prompt.setVisible(false);
    prompt.setOrigin(0, 0);
    this.messageContainer.add(prompt);

    this.prompt = prompt;

    const levelUpStatsContainer = this.scene.add.container(0, 0);
    levelUpStatsContainer.setVisible(false);
    ui.add(levelUpStatsContainer);

    this.levelUpStatsContainer = levelUpStatsContainer;

    const levelUpStatsLabelsContent = addTextObject(this.scene, (this.scene.game.canvas.width / 6) - 73, -94, "", TextStyle.WINDOW, { maxLines: 6 });
    let levelUpStatsLabelText = "";

    const stats = Utils.getEnumValues(Stat);
    for (const s of stats) {
      levelUpStatsLabelText += `${getStatName(s)}\n`;
    }
    levelUpStatsLabelsContent.text = levelUpStatsLabelText;
    levelUpStatsLabelsContent.x -= levelUpStatsLabelsContent.displayWidth;

    const levelUpStatsBg = addWindow(this.scene, (this.scene.game.canvas.width / 6), -100, 80 + levelUpStatsLabelsContent.displayWidth, 100);
    levelUpStatsBg.setOrigin(1, 0);
    levelUpStatsContainer.add(levelUpStatsBg);

    levelUpStatsContainer.add(levelUpStatsLabelsContent);

    const levelUpStatsIncrContent = addTextObject(this.scene, (this.scene.game.canvas.width / 6) - 50, -94, "+\n+\n+\n+\n+\n+", TextStyle.WINDOW, { maxLines: 6 });
    levelUpStatsContainer.add(levelUpStatsIncrContent);

    this.levelUpStatsIncrContent = levelUpStatsIncrContent;

    const levelUpStatsValuesContent = addBBCodeTextObject(this.scene, (this.scene.game.canvas.width / 6) - 7, -94, "", TextStyle.WINDOW, { maxLines: 6 , lineSpacing: 5});
    levelUpStatsValuesContent.setOrigin(1, 0);
    levelUpStatsValuesContent.setAlign("right");
    levelUpStatsContainer.add(levelUpStatsValuesContent);

    this.levelUpStatsValuesContent = levelUpStatsValuesContent;
  }

  show(args: any[]): boolean {
    if (this.prompt) {
      this.prompt.anims.stop();
      this.prompt.setVisible(false);
    }
    this.pendingPrompt = false;

    super.show(args);

    const ui = this.getUi();
    ui.showMessageChrome();

    this.commandBacking.setVisible(false);
    this.commandWindow.setVisible(false);
    this.movesWindowContainer.setVisible(false);
    if (!this._smitomModeActive) {
      this.message.setWordWrapWidth(this.wordWrapWidth);
    }

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();
    if (this.awaitingActionInput) {
      if (button === Button.CANCEL || button === Button.ACTION) {
        if (this.onActionInput) {
          ui.playSelect();
          const originalOnActionInput = this.onActionInput;
          this.onActionInput = null;
          this.awaitingActionInput = false;
          originalOnActionInput();
          return true;
        }
      }
    }

    return false;
  }

  clear() {
    super.clear();
    if (this.levelUpStatsContainer) {
      this.levelUpStatsContainer.setVisible(false);
    }
    if (this._smitomModeActive) {
      this.clearSmitomAnimations();
    }
  }

  showText(text: string, delay?: integer | null, callback?: Function | null, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null) {
    if (this._smitomModeActive && text) {
      const maxLines = 2;
      const wrappedFull = this.message.runWordWrap(text).split(/\n/g);
      if (wrappedFull.length <= maxLines) {
        this.showSmitomPixelateText(text, callback, callbackDelay, prompt, promptDelay);
        return;
      }
      const pages = this.paginateSmitomBySentence(text, maxLines);
      this.showSmitomDialoguePages(pages, 0, callback, callbackDelay, prompt, promptDelay);
      return;
    }
    this.hideNameText();
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);
  }

  showDialogue(text: string, name?: string, delay?: integer | null, callback?: Function, callbackDelay?: integer, prompt?: boolean, promptDelay?: integer) {
    if (this._smitomModeActive && text) {
      if (name && this._smitomHeaderText) {
        this._smitomHeaderText.setText(name);
        this._smitomHeaderText.setVisible(true);
        this._smitomHeaderText.setAlpha(0);
        this.scene.tweens.add({ targets: this._smitomHeaderText, alpha: 1, duration: Utils.fixedInt(280), ease: "Linear" });
      }
      const maxLines = 2;
      const wrappedFull = this.message.runWordWrap(text).split(/\n/g);
      if (wrappedFull.length <= maxLines) {
        this.showSmitomPixelateText(text, callback, callbackDelay, prompt, promptDelay);
        return;
      }
      const pages = this.paginateSmitomBySentence(text, maxLines);
      this.showSmitomDialoguePages(pages, 0, callback, callbackDelay, prompt, promptDelay);
      return;
    }
    if (name) {
    this.showNameText(name);
    }
    super.showDialogue(text, name, delay, callback, callbackDelay, prompt, promptDelay);
  }

  promptLevelUpStats(partyMemberIndex: integer, prevStats: integer[], showTotals: boolean): Promise<void> {
    return new Promise(resolve => {
      if (!this.scene.showLevelUpStats) {
        return resolve();
      }
      const newStats = (this.scene as BattleScene).getParty()[partyMemberIndex].stats;
      let levelUpStatsValuesText = "";
      const stats = Utils.getEnumValues(Stat);
      for (const s of stats) {
        levelUpStatsValuesText += `${showTotals ? newStats[s] : newStats[s] - prevStats[s]}\n`;
      }
      this.levelUpStatsValuesContent.text = levelUpStatsValuesText;
      this.levelUpStatsIncrContent.setVisible(!showTotals);
      this.levelUpStatsContainer.setVisible(true);
      this.awaitingActionInput = true;
      this.onActionInput = () => {
        if (!showTotals) {
          return this.promptLevelUpStats(partyMemberIndex, [], true).then(() => resolve());
        } else {
          this.levelUpStatsContainer.setVisible(false);
          resolve();
        }
      };
    });
  }

  promptIvs(pokemonId: integer, ivs: integer[], shownIvsCount: integer): Promise<void> {
    return new Promise(resolve => {
      this.scene.executeWithSeedOffset(() => {
        let levelUpStatsValuesText = "";
        const stats = Utils.getEnumValues(Stat);
        const shownStats = this.getTopIvs(ivs, shownIvsCount);
        for (const s of stats) {
          levelUpStatsValuesText += `${shownStats.indexOf(s) > -1 ? this.getIvDescriptor(ivs[s], s, pokemonId) : "???"}\n`;
        }
        this.levelUpStatsValuesContent.text = levelUpStatsValuesText;
        this.levelUpStatsIncrContent.setVisible(false);
        this.levelUpStatsContainer.setVisible(true);
        this.awaitingActionInput = true;
        this.onActionInput = () => {
          this.levelUpStatsContainer.setVisible(false);
          resolve();
        };
      }, pokemonId);
    });
  }

  getTopIvs(ivs: integer[], shownIvsCount: integer): Stat[] {
    const stats = Utils.getEnumValues(Stat);
        let shownStats: Stat[] = [];
        if (shownIvsCount < 6) {
          const statsPool = stats.slice(0);
          for (let i = 0; i < shownIvsCount; i++) {
        let shownStat: Stat | null = null;
            let highestIv = -1;
            statsPool.map(s => {
              if (ivs[s] > highestIv) {
                shownStat = s as Stat;
                highestIv = ivs[s];
              }
            });
        if (shownStat !== null && shownStat !== undefined) {
            shownStats.push(shownStat);
            statsPool.splice(statsPool.indexOf(shownStat), 1);
          }
      }
        } else {
          shownStats = stats;
        }
    return shownStats;
  }

  getIvDescriptor(value: integer, typeIv: integer, pokemonId: integer): string {
    const starterSpecies = this.scene.getPokemonById(pokemonId)!.species.getRootSpeciesId();
    const starterIvs: number[] = this.scene.gameData.dexData[starterSpecies].ivs;
    const uiTheme = (this.scene as BattleScene).uiTheme;
    const coloredText = (text: string, isBetter: boolean, ivValue) => {
      let textStyle: TextStyle;
      if (isBetter) {
        if (ivValue === 31) {
          textStyle = TextStyle.PERFECT_IV;
        } else {
          textStyle = TextStyle.SUMMARY_GREEN;
        }
      } else {
        textStyle = TextStyle.WINDOW;
      }
      const color = getTextColor(textStyle, false, uiTheme);
      return `[color=${color}][shadow=${getTextColor(textStyle, true, uiTheme)}]${text}[/shadow][/color]`;
    };

    if (value > 30) {
      return coloredText(i18next.t("battleMessageUiHandler:ivBest"), value > starterIvs[typeIv], value);
    }
    if (value === 30) {
      return coloredText(i18next.t("battleMessageUiHandler:ivFantastic"), value > starterIvs[typeIv], value);
    }
    if (value > 20) {
      return coloredText(i18next.t("battleMessageUiHandler:ivVeryGood"), value > starterIvs[typeIv], value);
    }
    if (value > 10) {
      return coloredText(i18next.t("battleMessageUiHandler:ivPrettyGood"), value > starterIvs[typeIv], value);
    }
    if (value > 0) {
      return coloredText(i18next.t("battleMessageUiHandler:ivDecent"), value > starterIvs[typeIv], value);
    }

    return coloredText(i18next.t("battleMessageUiHandler:ivNoGood"), value > starterIvs[typeIv], value);
  }

  showNameText(name: string): void {
    this.nameBoxContainer.setVisible(true);
    this.nameText.setText(name);
    this.nameBox.width = this.nameText.displayWidth + 16;
  }

  hideNameText(): void {
    this.nameBoxContainer.setVisible(false);
  }

  getMessageContainer(): Phaser.GameObjects.Container {
    return this.messageContainer;
  }

  private _smitomPanelNS: Phaser.GameObjects.NineSlice | null = null;
  private _smitomPanelContainer: Phaser.GameObjects.Container | null = null;
  private _smitomModeActive: boolean = false;
  private _smitomPixFx: Phaser.FX.Pixelate | null = null;
  private _smitomAnimTweens: Phaser.Tweens.Tween[] = [];
  private _smitomHeaderText: Phaser.GameObjects.Text | null = null;

  applySmitomPanelStyle(): void {
    const ui = this.getUi();
    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }
    if (this.textCallbackTimer) {
      this.textCallbackTimer.destroy();
      this.textCallbackTimer = null;
    }
    this.clearText();
    this.bg.setVisible(false);
    if (this._messageBgPattern) {
      if ((this._messageBgPattern as any).layers) {
        (this._messageBgPattern as any).layers.forEach((l: any) => l.setVisible(false));
      } else if ((this._messageBgPattern as any).container) {
        (this._messageBgPattern as any).container.setVisible(false);
      }
    }

    const panelW = 270, panelH = 50;
    const screenWidth = this.scene.game.canvas.width / 6;
    const panelX = (screenWidth - panelW) / 2;
    const panelY = -panelH - 4;

    if (!this._smitomPanelContainer) {
      this._smitomPanelContainer = this.scene.add.container(panelX, panelY);
      this._smitomPanelNS = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, panelW, panelH, 12, 12, 12, 12);
      this._smitomPanelNS.setOrigin(0, 0);
      this._smitomPanelContainer.add(this._smitomPanelNS);
      attachModalBackground(
        this.scene as BattleScene,
        this._smitomPanelContainer,
        () => ({ bgX: 0, bgY: 0, bgWidth: panelW, bgHeight: panelH }),
        { mask: false, alphaMultiplier: 0.6, getTarget: () => this._smitomPanelNS! }
      );
      this._smitomHeaderText = addTextObject(this.scene, 12, 7, "", TextStyle.SUMMARY_GOLD, { fontSize: "66px" });
      this._smitomPanelContainer.add(this._smitomHeaderText);
      this._smitomHeaderText.setVisible(false);
      ui.add(this._smitomPanelContainer);
    }
    this._smitomPanelContainer.setVisible(true);

    const TEXT_LEFT = 12;
    const BODY_Y = 19;
    const LS_BUFFER = 63;
    const TEXT_WRAP_WIDTH = (panelW - TEXT_LEFT - 16) / this.message.scaleX - LS_BUFFER;

    this.messageContainer.setPosition(panelX + TEXT_LEFT, panelY + BODY_Y);
    this.message.setWordWrapWidth(TEXT_WRAP_WIDTH);
    this.message.setFontSize(61);
    this.message.setLetterSpacing(1);
    this.message.setLineSpacing(this.message.scale * 30 * (61 / 96));
    this.message.setMaxLines(2);

    if (this.prompt) {
      this.prompt.setScale(0.4);
    }

    ui.bringToTop(this._smitomPanelContainer);
    ui.bringToTop(this.messageContainer);

    this.nameBoxContainer.setVisible(false);
    this._smitomModeActive = true;

    if (this.scene.animationLoadMode >= 2) {
      if (this._smitomPanelContainer.postFX) {
        const panelPixFx = this._smitomPanelContainer.postFX.addPixelate(20);
        this.scene.tweens.add({
          targets: panelPixFx,
          amount: -1,
          duration: Utils.fixedInt(1100),
          ease: "Linear",
          onComplete: () => {
            this._smitomPanelContainer?.postFX?.remove(panelPixFx);
          }
        });
      }
    } else {
      this._smitomPanelContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this._smitomPanelContainer,
        alpha: 1,
        duration: Utils.fixedInt(500),
        ease: "Sine.easeOut",
      });
    }
  }

  restoreDefaultPanelStyle(): void {
    if (this._smitomPanelContainer) {
      this._smitomPanelContainer.setVisible(false);
      this._smitomPanelContainer.setAlpha(1);
    }
    this.bg.setVisible(true);
    if (this._messageBgPattern) {
      if ((this._messageBgPattern as any).layers) {
        (this._messageBgPattern as any).layers.forEach((l: any) => l.setVisible(true));
      } else if ((this._messageBgPattern as any).container) {
        (this._messageBgPattern as any).container.setVisible(true);
      }
    }

    this.messageContainer.setPosition(12, -39);
    this.message.setWordWrapWidth(this.wordWrapWidth);
    this.message.setFontSize(96);
    this.message.setLetterSpacing(0);
    this.message.setLineSpacing(this.message.scale * 30);
    this.message.setMaxLines(2);
    this.message.setAlpha(1);
    this.nameBoxContainer.setVisible(false);

    if (this.prompt) {
      this.prompt.setScale(1);
    }
    if (this._smitomHeaderText) {
      this._smitomHeaderText.setVisible(false);
      this._smitomHeaderText.setText("");
      this._smitomHeaderText.setAlpha(1);
    }

    this._smitomModeActive = false;
    this.clearSmitomAnimations();
  }

  glitchOutDialogue(duration: number = 350): Promise<void> {
    return new Promise(resolve => {
      if (!this._smitomModeActive) {
        resolve();
        return;
      }
      let completedCount = 0;
      const totalTargets = 2;
      const onDone = () => {
        completedCount++;
        if (completedCount >= totalTargets) resolve();
      };

      if (this.message.postFX) {
        if (this.scene.animationLoadMode >= 2) {
          const msgPixFx = this.message.postFX.addPixelate(0);
          this.scene.tweens.add({
            targets: msgPixFx,
            amount: 12,
            duration: Utils.fixedInt(duration),
            ease: "Linear",
            onComplete: () => {
              this.message.postFX?.remove(msgPixFx);
              onDone();
            }
          });
        } else {
          onDone();
        }
        this.scene.tweens.add({
          targets: this.message,
          alpha: 0,
          duration: Utils.fixedInt(duration),
          ease: "Sine.easeOut"
        });
      } else {
        onDone();
      }

      if (this._smitomPanelContainer?.postFX) {
        if (this.scene.animationLoadMode >= 2) {
          const panelPixFx = this._smitomPanelContainer.postFX.addPixelate(0);
          this.scene.tweens.add({
            targets: panelPixFx,
            amount: 20,
            duration: Utils.fixedInt(duration),
            ease: "Linear",
            onComplete: () => {
              this._smitomPanelContainer?.postFX?.remove(panelPixFx);
              onDone();
            }
          });
        } else {
          onDone();
        }
        this.scene.tweens.add({
          targets: this._smitomPanelContainer,
          alpha: 0,
          duration: Utils.fixedInt(duration),
          ease: "Linear"
        });
      } else {
        onDone();
      }

      if (this._smitomHeaderText) {
        this.scene.tweens.add({
          targets: this._smitomHeaderText,
          alpha: 0,
          duration: Utils.fixedInt(duration * 0.8),
          ease: "Linear"
        });
      }
    });
  }

  private clearSmitomAnimations(): void {
    for (const tween of this._smitomAnimTweens) {
      if (tween && tween.isPlaying()) {
        tween.stop();
      }
    }
    this._smitomAnimTweens = [];
    if (this._smitomPixFx && this.message.postFX) {
      this.message.postFX.remove(this._smitomPixFx);
      this._smitomPixFx = null;
    }
  }

  private showSmitomDialoguePages(pages: string[], pageIndex: integer, callback?: Function | null, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null): void {
    const pageText = pages[pageIndex];
    const isLastPage = pageIndex >= pages.length - 1;
    if (isLastPage) {
      this.showSmitomPixelateText(pageText, callback, callbackDelay, prompt, promptDelay);
    } else {
      this.showSmitomPixelateText(pageText, () => {
        this.showSmitomDialoguePages(pages, pageIndex + 1, callback, callbackDelay, prompt, promptDelay);
      }, null, true, null);
    }
  }

  private paginateSmitomBySentence(text: string, maxLines: number): string[] {
    const sentenceRegex = /[^.!?]*[.!?]+(?:\s|$)/g;
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
      return this.paginateSmitomByWordBoundary(text, maxLines);
    }
    const pages: string[] = [];
    let currentPage = "";
    for (const sentence of sentences) {
      const candidate = currentPage + sentence;
      const candidateLines = this.message.runWordWrap(candidate.trim()).split(/\n/g);
      if (candidateLines.length > maxLines && currentPage) {
        pages.push(currentPage.trim());
        currentPage = sentence;
      } else if (candidateLines.length > maxLines && !currentPage) {
        pages.push(...this.paginateSmitomByWordBoundary(sentence.trim(), maxLines));
        currentPage = "";
      } else {
        currentPage = candidate;
      }
    }
    if (currentPage.trim()) {
      const remainLines = this.message.runWordWrap(currentPage.trim()).split(/\n/g);
      if (remainLines.length > maxLines) {
        pages.push(...this.paginateSmitomByWordBoundary(currentPage.trim(), maxLines));
      } else {
        pages.push(currentPage.trim());
      }
    }

    const validated: string[] = [];
    for (const page of pages) {
      if (this.message.runWordWrap(page).split(/\n/g).length > maxLines) {
        validated.push(...this.paginateSmitomByWordBoundary(page, maxLines));
      } else {
        validated.push(page);
      }
    }
    return validated.length ? validated : [text];
  }

  private paginateSmitomByWordBoundary(text: string, maxLines: number): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (!words.length) return [text];
    const pages: string[] = [];
    let currentPage = "";
    for (const word of words) {
      const candidate = currentPage ? `${currentPage} ${word}` : word;
      const candidateLines = this.message.runWordWrap(candidate).split(/\n/g);
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

  private showSmitomPixelateText(text: string, callback?: Function | null, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null): void {
    this.clearSmitomAnimations();
    if (this.prompt) {
      this.prompt.anims.stop();
      this.prompt.setVisible(false);
    }
    this.message.setAlpha(0);
    this.message.setWordWrapWidth((270 - 12 - 16) / this.message.scaleX - 63);
    this.message.setFontSize(61);
    const cleanedText = text.replace(/@[cds]\{[^}]*\}/g, "");
    this.message.setText(cleanedText);

    const durationMs = 400;

    this._smitomAnimTweens.push(this.scene.tweens.add({
      targets: this.message,
      alpha: 1,
      duration: Utils.fixedInt(Math.round(durationMs * 0.4)),
      ease: "Linear"
    }));

    if (this.message.postFX) {
      if (this.scene.animationLoadMode >= 2) {
        this._smitomPixFx = this.message.postFX.addPixelate(12);
        this._smitomAnimTweens.push(this.scene.tweens.add({
          targets: this._smitomPixFx,
          amount: -1,
          duration: Utils.fixedInt(durationMs),
          ease: "Linear",
          onComplete: () => {
            if (this._smitomPixFx && this.message.postFX) {
              this.message.postFX.remove(this._smitomPixFx);
              this._smitomPixFx = null;
            }
            if (prompt) {
              const showPromptAndWait = () => this.showSmitomPrompt(callback, callbackDelay);
              if (promptDelay) {
                this.scene.time.delayedCall(Utils.fixedInt(promptDelay), showPromptAndWait);
              } else {
                showPromptAndWait();
              }
            } else if (callback) {
              if (callbackDelay) {
                this.scene.time.delayedCall(Utils.fixedInt(callbackDelay), () => callback());
              } else {
                callback();
              }
            }
          }
        }));
      } else {
        this.scene.time.delayedCall(Utils.fixedInt(durationMs), () => {
          if (prompt) {
            const showPromptAndWait = () => this.showSmitomPrompt(callback, callbackDelay);
            if (promptDelay) {
              this.scene.time.delayedCall(Utils.fixedInt(promptDelay), showPromptAndWait);
            } else {
              showPromptAndWait();
            }
          } else if (callback) {
            if (callbackDelay) {
              this.scene.time.delayedCall(Utils.fixedInt(callbackDelay), () => callback());
            } else {
              callback();
            }
          }
        });
      }
    } else {
      this.scene.time.delayedCall(Utils.fixedInt(durationMs), () => {
        if (prompt) {
          this.showSmitomPrompt(callback, callbackDelay);
        } else if (callback) {
          callback();
        }
      });
    }
  }

  private showSmitomPrompt(callback?: Function | null, callbackDelay?: integer | null): void {
    const wrappedLines = this.message.runWordWrap(this.message.text).split(/\n/g);
    const lineCount = wrappedLines.length;
    const lastLine = wrappedLines[lineCount - 1] || "";
    const lineHeight = lineCount > 0 ? this.message.displayHeight / lineCount : 10;

    const tempText = this.scene.add.text(0, 0, lastLine, this.message.style);
    tempText.setScale(this.message.scale);
    const lastLineWidth = tempText.displayWidth;
    tempText.destroy();

    if (this.prompt) {
      this.prompt.setPosition(lastLineWidth + 7, (lineCount - 1) * lineHeight + 6);
      this.prompt.setVisible(true);
      this.prompt.play("prompt");
    }

    this.pendingPrompt = false;
    this.awaitingActionInput = true;
    this.onActionInput = () => {
      if (this.prompt) {
        this.prompt.anims.stop();
        this.prompt.setVisible(false);
      }
      if (callback) {
        if (callbackDelay) {
          this.textCallbackTimer = this.scene.time.delayedCall(callbackDelay, () => {
            if (this.textCallbackTimer) {
              this.textCallbackTimer.destroy();
              this.textCallbackTimer = null;
            }
            callback();
          });
        } else {
          callback();
        }
      }
    };
  }
}