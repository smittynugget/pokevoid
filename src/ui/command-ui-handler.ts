import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
import PartyUiHandler, { PartyUiMode } from "./party-ui-handler";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import i18next from "i18next";
import {Button} from "../enums/buttons";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { CommandPhase } from "#app/phases/command-phase.js";
import { getDynamicModeLocalizedString, DynamicModes } from "#app/battle.js";
import { ShopModifierSelectPhase } from "../phases/shop-modifier-select-phase";
import { EnhancedTutorial } from "./tutorial-registry";

export enum Command {
  FIGHT = 0,
  BALL,
  POKEMON,
  RUN,
  SKILLTREE,
  TEAM,
  CHECK,
  EGGS,
  SHOP,
  MAP
}

export default class CommandUiHandler extends UiHandler {
  private commandsContainer: Phaser.GameObjects.Container;
  private cursorObj: Phaser.GameObjects.Image | null;
  private newCommandPositions: { x: number; y: number }[] = [];

  private static readonly NEW_COMMAND_DEFAULT_ALPHA = 0.35;
  private static readonly NEW_COMMAND_UNFOCUSED_ALPHA = 0.7;
  private static readonly NEW_COMMAND_FOCUSED_ALPHA = 1.0;
  private static readonly MAP_DISABLED_ALPHA = 0.05;

  protected fieldIndex: integer = 0;
  protected cursor2: integer = 0;

  constructor(scene: BattleScene) {
    super(scene, Mode.COMMAND);
  }

  setup() {
    const ui = this.getUi();

    const originalCommands = [
      { text: i18next.t("commandUiHandler:fight"), x: 0, y: 0 },
      { text: i18next.t("commandUiHandler:ball"), x: 55.8, y: 0 },
      { text: i18next.t("commandUiHandler:pokemon"), x: 0, y: 16 },
      { text: i18next.t("commandUiHandler:run"), x: 55.8, y: 16 }
    ];

    const SPACING = 8;
    const RIGHT_BOUNDARY = -115;
    const MIN_LEFT_BOUNDARY = -200;

    const columns = [
      { row0Key: "commandUiHandler:shop", row1Key: "commandUiHandler:map" },
      { row0Key: "commandUiHandler:team", row1Key: "commandUiHandler:check" },
      { row0Key: "commandUiHandler:skillTree", row1Key: "commandUiHandler:eggs" }
    ];

    const measureTextWidth = (key: string): number => {
      const text = i18next.t(key);
      const tempText = addTextObject(this.scene, 0, 0, text, TextStyle.WINDOW);
      const width = tempText.displayWidth;
      tempText.destroy();
      return width;
    };

    const columnWidths: number[] = [];
    for (let i = 0; i < columns.length; i++) {
      const row0Width = measureTextWidth(columns[i].row0Key);
      const row1Width = measureTextWidth(columns[i].row1Key);
      columnWidths[i] = Math.max(row0Width, row1Width);
    }

    const columnLeftEdges: number[] = [];
    let currentRightEdge = RIGHT_BOUNDARY;

    for (let i = columns.length - 1; i >= 0; i--) {
      const leftEdge = currentRightEdge - columnWidths[i];
      columnLeftEdges[i] = leftEdge;
      currentRightEdge = leftEdge - SPACING;
    }

    if (columnLeftEdges[0] < MIN_LEFT_BOUNDARY) {
      const shift = MIN_LEFT_BOUNDARY - columnLeftEdges[0];
      for (let i = 0; i < columnLeftEdges.length; i++) {
        columnLeftEdges[i] += shift;
      }
    }

    const newCommands = [
      { text: i18next.t("commandUiHandler:team"), x: columnLeftEdges[1], y: 0 },
      { text: i18next.t("commandUiHandler:skillTree"), x: columnLeftEdges[2], y: 0 },
      { text: i18next.t("commandUiHandler:check"), x: columnLeftEdges[1], y: 16 },
      { text: i18next.t("commandUiHandler:eggs"), x: columnLeftEdges[2], y: 16 },
      { text: i18next.t("commandUiHandler:shop"), x: columnLeftEdges[0], y: 0 },
      { text: i18next.t("commandUiHandler:map"), x: columnLeftEdges[0], y: 16 }
    ];

    this.newCommandPositions = newCommands.map(cmd => ({ x: cmd.x, y: cmd.y }));

    this.commandsContainer = this.scene.add.container(217, -38.7);
    this.commandsContainer.setName("commands");
    this.commandsContainer.setVisible(false);
    ui.add(this.commandsContainer);

    const allCommands = [...originalCommands, ...newCommands];
    const isPtBR = i18next.resolvedLanguage === "pt-BR";
    allCommands.forEach((cmd, index) => {
      const fontSizeOverride = (index >= 4 && isPtBR) ? { fontSize: "93px" } : {};
      const commandText = addTextObject(this.scene, cmd.x, cmd.y, cmd.text, TextStyle.WINDOW, fontSizeOverride);
      commandText.setName(cmd.text);

      if (index >= 4) {
        commandText.setAlpha(CommandUiHandler.NEW_COMMAND_DEFAULT_ALPHA);
      }

      this.commandsContainer.add(commandText);
    });
  }

  show(args: any[]): boolean {
    this.eraseCursor();

    super.show(args);

    this.fieldIndex = args.length ? args[0] as integer : 0;

    this.commandsContainer.setVisible(true);

    let commandPhase: CommandPhase;
    const currentPhase = this.scene.getCurrentPhase();
    if (currentPhase instanceof CommandPhase) {
      commandPhase = currentPhase;
    } else {
      commandPhase = this.scene.getStandbyPhase() as CommandPhase;
    }

    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.bg.setVisible(true);
    messageHandler.commandWindow.setVisible(true);
    messageHandler.movesWindowContainer.setVisible(false);

    if (!commandPhase) {
      this.setCursor(this.getCursor());
      return false;
    }

    messageHandler.clearText();
    messageHandler.message.setVisible(false);
    this.setCursor(this.getCursor());

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    const cursor = this.getCursor();

    if (button === Button.CANCEL || button === Button.ACTION) {

      if (button === Button.ACTION) {
        switch (cursor) {
        case 0:
          if ((this.scene.getCurrentPhase() as CommandPhase).checkFightOverride()) {
            return true;
          }
          ui.setMode(Mode.FIGHT, (this.scene.getCurrentPhase() as CommandPhase).getFieldIndex());
          success = true;
          break;
        case 1:
          ui.setModeWithoutClear(Mode.BALL);
          success = true;
          break;
        case 2:
          ui.setMode(Mode.PARTY, PartyUiMode.SWITCH, (this.scene.getCurrentPhase() as CommandPhase).getPokemon().getFieldIndex(), null, PartyUiHandler.FilterNonFainted);
          success = true;
          break;
        case 3:
          (this.scene.getCurrentPhase() as CommandPhase).handleCommand(Command.RUN, 0);
          success = true;
          break;
        case 4: {
          const scene = this.scene as BattleScene;
          const slotId = scene.sessionSlotId;
          if (slotId >= 0) {
            (async () => {
              try {
                const sessionData = await scene.gameData.getSession(slotId);
                if (sessionData) {
                  const activeRunEntry = { entry: sessionData, isVictory: false, isFavorite: false, isActive: true };
                  ui.setOverlayMode(Mode.RUN_INFO, activeRunEntry, true);
                }
              } catch {}
            })();
            success = true;
          } else {
            ui.playError();
          }
          break; }
        case 5: {
          const commandPhase = (this.scene.getCurrentPhase() as CommandPhase);
          const gameData: any = (this.scene as any).gameData;
          if (gameData?.activeSkillTree) {
            commandPhase.openSkillTreeFromCommand();
            success = true;
          }
          break; }
        case 6:
          ui.setOverlayMode(Mode.POKEDEX);
          success = true;
          break;
        case 7:
          ui.setOverlayMode(Mode.EGG_GACHA);
          success = true;
          break;
        case 8:
          ui.setMode(Mode.MESSAGE);
          this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
          const currentPhase = this.scene.getCurrentPhase();
          if (currentPhase) {
            this.scene.unshiftPhase(currentPhase);
          }
          this.scene.shiftPhase();
          success = true;
          break;
        case 9:
          if ((this.scene as any).gameMode?.isChaosMode) {
            ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
            success = true;
          }
          break;
        }
      } else {
        (this.scene.getCurrentPhase() as CommandPhase).cancel();
      }
    } else {
      switch (button) {
      case Button.UP:
        if (cursor >= 2 && cursor <= 3) success = this.setCursor(cursor - 2);
        else if (cursor >= 6 && cursor <= 7) success = this.setCursor(cursor - 2);
        else if (cursor === 8) success = this.setCursor(4);
        else if (cursor === 9) success = this.setCursor(8);
        else if (cursor === 0) success = this.setCursor(2);
        else if (cursor === 1) success = this.setCursor(3);
        else if (cursor === 4) success = this.setCursor(6);
        else if (cursor === 5) success = this.setCursor(7);
        break;
      case Button.DOWN:
        if (cursor <= 1) success = this.setCursor(cursor + 2);
        else if (cursor >= 4 && cursor <= 5) success = this.setCursor(cursor + 2);
        else if (cursor === 8) success = this.setCursor(9);
        else if (cursor === 2) success = this.setCursor(0);
        else if (cursor === 3) success = this.setCursor(1);
        else if (cursor === 6) success = this.setCursor(4);
        else if (cursor === 7) success = this.setCursor(5);
        else if (cursor === 9) success = this.setCursor(8);
        break;
      case Button.LEFT:
        if (cursor === 1) success = this.setCursor(0);
        else if (cursor === 3) success = this.setCursor(2);
        else if (cursor === 0) success = this.setCursor(5);
        else if (cursor === 2) success = this.setCursor(7);
        else if (cursor === 5) success = this.setCursor(4);
        else if (cursor === 7) success = this.setCursor(6);
        else if (cursor === 4) success = this.setCursor(8);
        else if (cursor === 6) success = this.setCursor(9);
        else if (cursor === 8) success = this.setCursor(1);
        else if (cursor === 9) success = this.setCursor(3);
        break;
      case Button.RIGHT:
        if (cursor === 0) success = this.setCursor(1);
        else if (cursor === 2) success = this.setCursor(3);
        else if (cursor === 5) success = this.setCursor(0);
        else if (cursor === 7) success = this.setCursor(2);
        else if (cursor === 4) success = this.setCursor(5);
        else if (cursor === 6) success = this.setCursor(7);
        else if (cursor === 8) success = this.setCursor(4);
        else if (cursor === 9) success = this.setCursor(6);
        else if (cursor === 1) success = this.setCursor(8);
        else if (cursor === 3) success = this.setCursor(9);
        break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  getCursor(): integer {
    return !this.fieldIndex ? this.cursor : this.cursor2;
  }

  setCursor(cursor: integer): boolean {
    const changed = this.getCursor() !== cursor;
    if (changed) {
      if (!this.fieldIndex) {
        this.cursor = cursor;
      } else {
        this.cursor2 = cursor;
      }
    }

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.cursorObj.setAlpha(1.0);
      this.cursorObj.setTint(0xffffff);
      this.commandsContainer.add(this.cursorObj);
    }

    let x, y;

    if (cursor <= 3) {
      x = -5 + (cursor % 2 === 1 ? 56 : 0);
      y = 8 + (cursor >= 2 ? 16 : 0);
    } else {
      const posIndex = cursor - 4;
      if (this.newCommandPositions[posIndex]) {
        x = this.newCommandPositions[posIndex].x - 5;
        y = this.newCommandPositions[posIndex].y + 8;
      } else {
        x = 0;
        y = 8;
      }
    }

    this.cursorObj.setPosition(x, y);

    this.updateCommandTransparency(cursor);

    this.cursorObj.setAlpha(1.0);
    this.cursorObj.setTint(0xffffff);

    if (changed && cursor >= 4 && cursor <= 9) {
        const scene = this.scene as BattleScene;
        if (!scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.COMMAND_UI_NEW_COMMANDS)) {
            scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.COMMAND_UI_NEW_COMMANDS, true, false);
        }
    }

    return changed;
  }

  private updateCommandTransparency(focusedCursor: integer): void {
    const isChaosMode = (this.scene as any).gameMode?.isChaosMode;
    const isSessionSaved = (this.scene as BattleScene).sessionSlotId >= 0;

    this.commandsContainer.list.forEach((child, index) => {
      const commandText = child as Phaser.GameObjects.Text;

      if (index <= 3) {
        commandText.setAlpha(1.0);
        return;
      }

      const isMapCommand = index === 9;
      const isTeamCommand = index === 4;
      const isFocused = index === focusedCursor;

      if (isMapCommand && !isChaosMode) {
        commandText.setAlpha(CommandUiHandler.MAP_DISABLED_ALPHA);
      } else if (isTeamCommand && !isSessionSaved) {
        commandText.setAlpha(CommandUiHandler.MAP_DISABLED_ALPHA);
      } else if (isFocused) {
        commandText.setAlpha(CommandUiHandler.NEW_COMMAND_FOCUSED_ALPHA);
      } else if (focusedCursor >= 4 && focusedCursor <= 9) {
        commandText.setAlpha(CommandUiHandler.NEW_COMMAND_UNFOCUSED_ALPHA);
      } else {
        commandText.setAlpha(CommandUiHandler.NEW_COMMAND_DEFAULT_ALPHA);
      }
    });
  }

  clear(): void {
    super.clear();
    this.getUi().getMessageHandler().commandWindow.setVisible(false);
    this.commandsContainer.setVisible(false);
    this.getUi().getMessageHandler().clearText();
    this.getUi().getMessageHandler().message.setVisible(true);
    this.eraseCursor();
  }

  eraseCursor(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}