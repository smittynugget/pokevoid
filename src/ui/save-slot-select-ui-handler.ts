import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Button } from "#enums/buttons";
import {GameMode, GameModes} from "../game-mode";
import { PokemonHeldItemModifier } from "../modifier/modifier";
import { QuestState, QuestUnlockables, SessionSaveData } from "../system/game-data";
import PokemonData from "../system/pokemon-data";
import * as Utils from "../utils";
import MessageUiHandler from "./message-ui-handler";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./mode";
import { addWindow } from "./ui-theme";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { GameMechanicsVersion } from "#enums/gameMechanicsID";
import { isPrimaryPointer } from "./pointer-utils";

const sessionSlotCount = 5;

export enum SaveSlotUiMode {
  LOAD,
  SAVE
}

export type SaveSlotSelectCallback = (cursor: integer) => void;

export default class SaveSlotSelectUiHandler extends MessageUiHandler {

  private saveSlotSelectContainer: Phaser.GameObjects.Container;
  private sessionSlotsContainer: Phaser.GameObjects.Container;
  private saveSlotSelectMessageBox: Phaser.GameObjects.NineSlice;
  private saveSlotSelectMessageBoxContainer: Phaser.GameObjects.Container;
  private sessionSlots: SessionSlot[];

  private uiMode: SaveSlotUiMode;
  private saveSlotSelectCallback: SaveSlotSelectCallback | null;

  private scrollCursor: integer = 0;

  private cursorObj: Phaser.GameObjects.NineSlice | null;
  private _sessionSlotHitZones: Phaser.GameObjects.Zone[] = [];

  private sessionSlotsContainerInitialY: number;

  private isProcessingSave: boolean = false;
  private _saveSlotPatterns?: { sessionSlots?: ModalBackgroundHandle[]; message?: ModalBackgroundHandle };

  constructor(scene: BattleScene) {
    super(scene, Mode.SAVE_SLOT);
  }

  setup() {
    const ui = this.getUi();

    this.saveSlotSelectContainer = this.scene.add.container(0, 0);
    this.saveSlotSelectContainer.setVisible(false);
    ui.add(this.saveSlotSelectContainer);

    const loadSessionBg = this.scene.add.nineslice(0, 0, "default_bg", undefined, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0, 0, 16, 0);
    loadSessionBg.setOrigin(0, 0);
    loadSessionBg.setY(-this.scene.game.canvas.height / 6);
    try {
        if (loadSessionBg.postFX && typeof loadSessionBg.postFX.addColorMatrix === 'function') {
            const colorMatrix = loadSessionBg.postFX.addColorMatrix();
            colorMatrix.negative();
        } else {
            loadSessionBg.setTint(0xFFFFFF);
            loadSessionBg.setBlendMode(Phaser.BlendModes.DIFFERENCE);
        }
    } catch (error) {
        loadSessionBg.setTint(0x000000);
        loadSessionBg.setBlendMode(Phaser.BlendModes.SCREEN);
    }
    this.saveSlotSelectContainer.add(loadSessionBg);

    this.sessionSlotsContainerInitialY = -this.scene.game.canvas.height / 6 + 8;

    this.sessionSlotsContainer = this.scene.add.container(8, this.sessionSlotsContainerInitialY);
    this.saveSlotSelectContainer.add(this.sessionSlotsContainer);

    this.saveSlotSelectMessageBoxContainer = this.scene.add.container(0, 0);
    this.saveSlotSelectMessageBoxContainer.setVisible(false);
    this.saveSlotSelectContainer.add(this.saveSlotSelectMessageBoxContainer);

    this.saveSlotSelectMessageBox = addWindow(this.scene, 1, -1, 318, 28);
    this.saveSlotSelectMessageBox.setOrigin(0, 1);
    this.saveSlotSelectMessageBoxContainer.add(this.saveSlotSelectMessageBox);

    this.message = addTextObject(this.scene, 8, 8, "", TextStyle.WINDOW, { maxLines: 2 });
    this.message.setOrigin(0, 0);
    this.saveSlotSelectMessageBoxContainer.add(this.message);

    this.sessionSlots = [];
  }

  show(args: any[]): boolean {
    if ((args.length < 2 || !(args[1] instanceof Function))) {
      return false;
    }

    super.show(args);

    if (this._interactivesDisabledForOverlay) {
      this.enableSaveSlotInteractives();
    }

    this.uiMode = args[0] as SaveSlotUiMode;
    this.saveSlotSelectCallback = args[1] as SaveSlotSelectCallback;
    this._saveSlotPatterns = this._saveSlotPatterns || {};

    this.saveSlotSelectContainer.setVisible(true);
    this.populateSessionSlots();
    this.setScrollCursor(0);
    this.setCursor(0);

    this._sessionSlotHitZones.forEach(z => z.destroy());
    this._sessionSlotHitZones = [];
    for (let s = 0; s < sessionSlotCount; s++) {
      const zone = this.scene.add.zone(4, 4 + s * 56, 304, 52);
      zone.setOrigin(0, 0);
      zone.setInteractive({ useHandCursor: true });
      this.sessionSlotsContainer.add(zone);
      this._sessionSlotHitZones.push(zone);

      const slotIndex = s;
      zone.on("pointerover", () => {
        const localCursor = slotIndex - this.scrollCursor;
        if (localCursor >= 0 && localCursor <= 2 && this.cursor !== localCursor) {
          this.setCursor(localCursor);
        }
      });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        const localCursor = slotIndex - this.scrollCursor;
        if (localCursor < 0 || localCursor > 2) return;
        if (this.cursor !== localCursor) {
          this.setCursor(localCursor);
        } else {
          this.processInput(Button.ACTION);
        }
      });
    }
    this._saveSlotPatterns.sessionSlots = [];
    this.sessionSlots.forEach((sessionSlot, index) => {
      const handle = attachModalBackground(
        this.scene,
        this.saveSlotSelectContainer,
        () => ({ bgX: sessionSlot.x + 8, bgY: sessionSlot.y + this.sessionSlotsContainerInitialY, bgWidth: 304, bgHeight: 52 }),
        { mask: false, alphaMultiplier: 0.6, getTarget: () => sessionSlot }
      );
      this._saveSlotPatterns.sessionSlots!.push(handle);
    });
    this._saveSlotPatterns?.sessionSlots?.forEach(handle => handle.redraw());

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    let error = false;

    if (button === Button.ACTION || button === Button.CANCEL) {
      const originalCallback = this.saveSlotSelectCallback;
      if (button === Button.ACTION) {
        const cursor = this.cursor + this.scrollCursor;
        if (this.uiMode === SaveSlotUiMode.LOAD && !this.sessionSlots[cursor].hasData) {
          error = true;
        } else {
          switch (this.uiMode) {
            case SaveSlotUiMode.LOAD:
              this.saveSlotSelectCallback = null;
            originalCallback && originalCallback(cursor);
              break;
            case SaveSlotUiMode.SAVE:
              const saveAndCallback = async () => {
                const originalCallback = this.saveSlotSelectCallback;
                this.saveSlotSelectCallback = null;

                    await ui.revertMode();
                    ui.showText("", 0);
                    await ui.setMode(Mode.MESSAGE);

                originalCallback && originalCallback(cursor);
              };
              if (this.sessionSlots[cursor].hasData) {
                this.disableSaveSlotInteractives();
                ui.showText(i18next.t("saveSlotSelectUiHandler:overwriteData"), null, () => {
                ui.setOverlayMode(Mode.CONFIRM, () => {
                  this.scene.gameData.deleteSession(cursor).then(response => {
                    if (response === false) {
                      this.scene.reset(true);
                    } else {
                          saveAndCallback();
                    }
                  });
                }, () => {
                    ui.revertMode();
                    this.enableSaveSlotInteractives();
                  ui.showText("", 0);
                  }, false, 0, 19, 2000);
                });
              } else if (this.sessionSlots[cursor].hasData === false) {
                saveAndCallback();
              } else {
                return false;
              }
              break;
          }
          success = true;
        }
      } else {
        this.saveSlotSelectCallback = null;
        originalCallback && originalCallback(-1);
        success = true;
      }
    } else {
      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else if (this.scrollCursor) {
            success = this.setScrollCursor(this.scrollCursor - 1);
          }
          break;
        case Button.DOWN:
          if (this.cursor < 2) {
            success = this.setCursor(this.cursor + 1);
          } else if (this.scrollCursor < sessionSlotCount - 3) {
            success = this.setScrollCursor(this.scrollCursor + 1);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  populateSessionSlots() {
    for (let s = 0; s < sessionSlotCount; s++) {
      const sessionSlot = new SessionSlot(this.scene, s);
      sessionSlot.load();
      this.scene.add.existing(sessionSlot);
      this.sessionSlotsContainer.add(sessionSlot);
      this.sessionSlots.push(sessionSlot);
    }
  }

  showText(text: string, delay?: integer, callback?: Function, callbackDelay?: integer, prompt?: boolean, promptDelay?: integer) {
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);

    if (text?.indexOf("\n") === -1) {
      this.saveSlotSelectMessageBox.setSize(318, 28);
      this.message.setY(-22);
    } else {
      this.saveSlotSelectMessageBox.setSize(318, 42);
      this.message.setY(-37);
    }

    const isVisible = !!text?.length;
    this.saveSlotSelectMessageBoxContainer.setVisible(isVisible);
    if (isVisible && !this._saveSlotPatterns?.message) {
      this._saveSlotPatterns = this._saveSlotPatterns || {};
      this._saveSlotPatterns.message = attachModalBackground(
        this.scene,
        this.saveSlotSelectContainer,
        () => ({ bgX: this.saveSlotSelectMessageBox.x, bgY: this.saveSlotSelectMessageBox.y - this.saveSlotSelectMessageBox.height, bgWidth: this.saveSlotSelectMessageBox.width, bgHeight: this.saveSlotSelectMessageBox.height }),
        { mask: false, alphaMultiplier: 0.5, getTarget: () => this.saveSlotSelectMessageBox }
      );
      this._saveSlotPatterns.message.redraw();
    } else if (!isVisible && this._saveSlotPatterns?.message) {
      this._saveSlotPatterns.message.clear();
      this._saveSlotPatterns.message = undefined;
    }
  }

  setCursor(cursor: integer): boolean {
    const changed = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.nineslice(0, 0, "select_cursor_highlight_thick", undefined, 296, 44, 6, 6, 6, 6);
      this.cursorObj.setOrigin(0, 0);
      this.sessionSlotsContainer.add(this.cursorObj);
    }
    this.cursorObj.setPosition(4, 4 + (cursor + this.scrollCursor) * 56);

    return changed;
  }

  setScrollCursor(scrollCursor: integer): boolean {
    const changed = scrollCursor !== this.scrollCursor;

    if (changed) {
      this.scrollCursor = scrollCursor;
      this.setCursor(this.cursor);
      this.scene.tweens.add({
        targets: this.sessionSlotsContainer,
        y: this.sessionSlotsContainerInitialY - 56 * scrollCursor,
        duration: Utils.fixedInt(325),
        ease: "Sine.easeInOut"
      });
    }

    return changed;
  }

  clear() {

    this._saveSlotPatterns?.sessionSlots?.forEach(handle => handle.clear());
    this._saveSlotPatterns?.message?.clear();
    this._saveSlotPatterns = undefined;

    super.clear();
    this.saveSlotSelectContainer.setVisible(false);
    this.eraseCursor();
    this.saveSlotSelectCallback = null;
    this.clearSessionSlots();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  clearSessionSlots() {
    this._sessionSlotHitZones.forEach(z => z.destroy());
    this._sessionSlotHitZones = [];
    this.sessionSlots.splice(0, this.sessionSlots.length);
    this.sessionSlotsContainer.removeAll(true);
  }

  private _interactivesDisabledForOverlay = false;

  private disableSaveSlotInteractives(): void {
    if (this._interactivesDisabledForOverlay) return;
    this._interactivesDisabledForOverlay = true;
    this._sessionSlotHitZones?.forEach(z => z?.disableInteractive());
  }

  private enableSaveSlotInteractives(): void {
    if (!this._interactivesDisabledForOverlay) return;
    this._interactivesDisabledForOverlay = false;
    this._sessionSlotHitZones?.forEach(z => {
      if (z?.input) z.input.enabled = true;
    });
  }
}

class SessionSlot extends Phaser.GameObjects.Container {
  public slotId: integer;
  public hasData: boolean;
  private loadingLabel: Phaser.GameObjects.Text;

  constructor(scene: BattleScene, slotId: integer) {
    super(scene, 0, slotId * 56);

    this.slotId = slotId;

    this.setup();
  }

  setup() {
    const slotWindow = addWindow(this.scene, 0, 0, 304, 52);
    this.add(slotWindow);

    this.loadingLabel = addTextObject(this.scene, 152, 26, i18next.t("saveSlotSelectUiHandler:loading"), TextStyle.WINDOW);
    this.loadingLabel.setOrigin(0.5, 0.5);
    this.add(this.loadingLabel);
  }

  async setupWithData(data: SessionSaveData) {
    this.remove(this.loadingLabel, true);

    const displayMode = this.getDisplayGameMode(data);
    const gameModeLabel = addTextObject(this.scene, 8, 5, `${GameMode.getModeName(displayMode) || i18next.t("gameMode:unkown")} - ${i18next.t("saveSlotSelectUiHandler:wave")} ${data.waveIndex}`, TextStyle.WINDOW);
    this.add(gameModeLabel);

    const timestampLabel = addTextObject(this.scene, 8, 19, new Date(data.timestamp).toLocaleString(), TextStyle.WINDOW);
    this.add(timestampLabel);

    const playTimeLabel = addTextObject(this.scene, 8, 33, Utils.getPlayTimeString(data.playTime), TextStyle.WINDOW);
    this.add(playTimeLabel);

    const pokemonIconsContainer = this.scene.add.container(144, 4);
    data.party.forEach((p: PokemonData, i: integer) => {
      const iconContainer = this.scene.add.container(26 * i, 0);
      iconContainer.setScale(0.75);

      const pokemon = p.toPokemon(this.scene);
      const icon = this.scene.addPokemonIcon(pokemon, 0, 0, 0, 0);

      const text = addTextObject(this.scene, 32, 20, `${i18next.t("saveSlotSelectUiHandler:lv")}${Utils.formatLargeNumber(pokemon.level, 1000)}`, TextStyle.PARTY, { fontSize: "54px", color: "#f8f8f8" });
      text.setShadow(0, 0, undefined);
      text.setStroke("#424242", 14);
      text.setOrigin(1, 0);

      const isAltBuild = !!p.altBuildId;
      const displayRank = isAltBuild ? Math.max(1, p.altBuildRank ?? 0) : (p.rankUpCount ?? 0) + 1;
      const showRank = isAltBuild || displayRank > 1;

      iconContainer.add(icon);
      iconContainer.add(text);

      if (showRank) {
        const rankIcon = this.scene.add.sprite(31, 26, "smitems", "modSoulCollected");
        rankIcon.setScale(0.1875);
        rankIcon.setOrigin(0, 0.5);
        iconContainer.add(rankIcon);

        const rankText = addTextObject(this.scene, 37.5, 24, Utils.intToRoman(displayRank), TextStyle.PARTY, { fontSize: "30px", color: "#FFD700" });
        rankText.setShadow(0, 0, undefined);
        rankText.setStroke("#424242", 14);
        rankText.setOrigin(0, 0);
        iconContainer.add(rankText);
      }

      pokemonIconsContainer.add(iconContainer);

      pokemon.destroy();
    });

    this.add(pokemonIconsContainer);

    const modifiersModule = await import("../modifier/modifier");

    const modifierIconsContainer = this.scene.add.container(148, 30);
    modifierIconsContainer.setScale(0.5);
    let visibleModifierIndex = 0;
    for (const m of data.modifiers) {
      const modifier = m.toModifier(this.scene, modifiersModule[m.className]);
      if (modifier instanceof PokemonHeldItemModifier) {
        continue;
      }
      const icon = modifier?.getIcon(this.scene, false);
      if (icon) {
      icon.setPosition(24 * visibleModifierIndex, 0);
      modifierIconsContainer.add(icon);
      }
      if (++visibleModifierIndex === 12) {
        break;
      }
    }

    this.add(modifierIconsContainer);
  }

  private sanitizeModeForUnlocks(mode: GameModes): GameModes {
    const nuzlockeUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
    if (nuzlockeUnlocked) {
      return mode;
    }
    switch (mode) {
      case GameModes.NUZLOCKE:
        return GameModes.NUZLIGHT;
      case GameModes.NUZLOCKE_DRAFT:
        return GameModes.NUZLIGHT_DRAFT;
      case GameModes.CHAOS_NUZLOCKE:
        return GameModes.CHAOS_NUZLIGHT;
      case GameModes.CHAOS_NUZLOCKE_DRAFT:
        return GameModes.CHAOS_NUZLIGHT_DRAFT;
      case GameModes.CHAOS_NUZLOCKE_SHORT:
        return GameModes.CHAOS_NUZLIGHT_SHORT;
      case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
        return GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT;
      case GameModes.CHAOS_NUZLOCKE_FTL:
        return GameModes.CHAOS_NUZLIGHT_FTL;
      case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
        return GameModes.CHAOS_NUZLIGHT_DRAFT_FTL;
      default:
        return mode;
    }
  }

  private inferGauntletMode(): GameModes {
    const nuzlockeUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
    if (nuzlockeUnlocked) {
      return GameModes.NUZLOCKE;
    }
    const nuzlightUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
    if (nuzlightUnlocked) {
      return GameModes.NUZLIGHT;
    }
    return GameModes.CLASSIC;
  }

  private getDisplayGameMode(data: SessionSaveData): GameModes {
    const rawMode = this.sanitizeModeForUnlocks(data.gameMode);

    if (rawMode !== GameModes.SHOP) {
        return rawMode;
    }

    const hasBattlePath = data.battlePath !== null && data.battlePath !== undefined;
    if (!hasBattlePath) {
      return this.sanitizeModeForUnlocks(this.inferGauntletMode());
    }
    const hasChaosRivals = (data as any).chaosAltRivals && (data as any).chaosAltRivals.length > 0;
    const isChaosV2Save = data.gameMechanicTracking &&
        Object.values(data.gameMechanicTracking).some(v =>
            v === GameMechanicsVersion.CHAOS_V2 || v === "CHAOS_V2_BALANCE_IMPROVEMENTS"
        );

    const shouldDisplayAsChaos = isChaosV2Save || hasChaosRivals;

    if (shouldDisplayAsChaos) {
        return this.sanitizeModeForUnlocks(this.inferChaosMode(data));
    }

    return this.sanitizeModeForUnlocks(this.inferGauntletMode());
  }

  private inferChaosMode(data: SessionSaveData): GameModes {
    const totalWaves = data.battlePath?.totalWaves;
    const waveIndex = data.waveIndex || 0;
    const dynamicMode = data.dynamicMode as any;
    const isDraft = dynamicMode?.isDraft === true;
    const isNuzlocke = dynamicMode?.isNuzlocke === true;
    const isNuzlight = dynamicMode?.isNuzlight === true;
    const isVoid = dynamicMode?.isChaosVoid === true;

    let effectiveWaves = totalWaves;

    if (totalWaves !== undefined && waveIndex > totalWaves) {
        effectiveWaves = undefined;
    }

    if (effectiveWaves === undefined && waveIndex > 0) {
        if (waveIndex <= 100) {
            effectiveWaves = 100;
        } else if (waveIndex <= 200) {
            effectiveWaves = 200;
        } else if (waveIndex <= 500) {
            effectiveWaves = 500;
        } else if (waveIndex <= 1000) {
            effectiveWaves = 1000;
        } else {
            effectiveWaves = 100000;
        }
    }

    if (effectiveWaves !== undefined) {
        if (effectiveWaves <= 100) {
            if (isVoid) return isDraft ? GameModes.CHAOS_ROGUE_VOID_FTL : GameModes.CHAOS_VOID_FTL;
            if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT_FTL : GameModes.CHAOS_NUZLOCKE_FTL;
            if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT_FTL : GameModes.CHAOS_NUZLIGHT_FTL;
            return isDraft ? GameModes.CHAOS_ROGUE_FTL : GameModes.CHAOS_JOURNEY_FTL;
        }
        if (effectiveWaves <= 200) {
            if (isVoid) return isDraft ? GameModes.CHAOS_ROGUE_VOID_SHORT : GameModes.CHAOS_VOID_SHORT;
            if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT : GameModes.CHAOS_NUZLOCKE_SHORT;
            if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT : GameModes.CHAOS_NUZLIGHT_SHORT;
            return isDraft ? GameModes.CHAOS_ROGUE_SHORT : GameModes.CHAOS_JOURNEY_SHORT;
        }
        if (effectiveWaves <= 500) {
            if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT : GameModes.CHAOS_NUZLOCKE;
            if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT : GameModes.CHAOS_NUZLIGHT;
            return isDraft ? GameModes.CHAOS_ROGUE : GameModes.CHAOS_JOURNEY;
        }
        if (effectiveWaves <= 1000) {
            return isDraft ? GameModes.CHAOS_ROGUE_VOID : GameModes.CHAOS_VOID;
        }
    }

    return isDraft ? GameModes.CHAOS_INFINITE_ROGUE : GameModes.CHAOS_INFINITE;
  }

  load(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.scene.gameData.getSession(this.slotId).then(async sessionData => {
        if (!sessionData) {
          this.hasData = false;
          this.loadingLabel.setText(i18next.t("saveSlotSelectUiHandler:empty"));
          resolve(false);
          return;
        }
        this.hasData = true;
        await this.setupWithData(sessionData);
        resolve(true);
      });
    });
  }
}

interface SessionSlot {
  scene: BattleScene;
}