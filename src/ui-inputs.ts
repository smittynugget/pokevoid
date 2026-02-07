import Phaser from "phaser";
import {Mode} from "./ui/ui";
import {InputsController} from "./inputs-controller";
import MessageUiHandler from "./ui/message-ui-handler";
import StarterSelectUiHandler from "./ui/starter-select-ui-handler";
import {Setting, SettingKeys, settingIndex} from "./system/settings/settings";
import SettingsUiHandler from "./ui/settings/settings-ui-handler";
import {Button} from "#enums/buttons";
import SettingsGamepadUiHandler from "./ui/settings/settings-gamepad-ui-handler";
import SettingsKeyboardUiHandler from "#app/ui/settings/settings-keyboard-ui-handler";
import BattleScene from "./battle-scene";
import SettingsDisplayUiHandler from "./ui/settings/settings-display-ui-handler";
import SettingsAudioUiHandler from "./ui/settings/settings-audio-ui-handler";
import RunInfoUiHandler from "./ui/run-info-ui-handler";
import RunHistoryUiHandler from "./ui/run-history-ui-handler";
import { randomString } from "./utils";
import { GameMode, GameModes, getGameMode } from "./game-mode";
import { ShopModifierSelectPhase } from "./phases/shop-modifier-select-phase";
import { SelectPermaModifierPhase } from "./phases/select-perma-modifier-phase";
import { QuestUnlockables, QuestState } from "./system/game-data";
import { activateSmitomTalk } from "./ui/title-ui-handler";
import ModifierSelectUiHandler from "./ui/modifier-select-ui-handler";
import { AddPokemonModifierType } from "./modifier/modifier-type";
import ChampionSelectUiHandler from "./ui/champion-select-ui-handler";
import BattlePathUiHandler from "./ui/battle-path-ui-handler";
import { ModifierTooltipUtils } from "#app/ui/modifier-tooltip-utils";

type ActionKeys = Record<Button, () => void>;

export class UiInputs {
  private scene: BattleScene;
  private events: Phaser.Events.EventEmitter;
  private inputsController: InputsController;

  constructor(scene: BattleScene, inputsController: InputsController) {
    this.scene = scene;
    this.inputsController = inputsController;
    this.init();
  }

  init(): void {
    this.events = this.inputsController.events;
    this.listenInputs();
  }

  detectInputMethod(evt): void {
    if (evt.controller_type === "keyboard") {

      if (evt.hasOwnProperty("isTouch") && evt.isTouch) {
        this.scene.inputMethod = "touch";
      } else {
        this.scene.inputMethod = "keyboard";
      }
    } else if (evt.controller_type === "gamepad") {
      this.scene.inputMethod = "gamepad";
    }
  }

  listenInputs(): void {
    this.events.on("input_down", (event) => {
      this.detectInputMethod(event);

      const actions = this.getActionsKeyDown();
      if (!actions.hasOwnProperty(event.button)) {
        return;
      }
      actions[event.button]();
    }, this);

    this.events.on("input_up", (event) => {
      const actions = this.getActionsKeyUp();
      if (!actions.hasOwnProperty(event.button)) {
        return;
      }
      actions[event.button]();
    }, this);
  }

  doVibration(inputSuccess: boolean, vibrationLength: number): void {
    if (inputSuccess && this.scene.enableVibration && typeof navigator.vibrate !== "undefined") {
      navigator.vibrate(vibrationLength);
    }
  }

  getActionsKeyDown(): ActionKeys {
    const actions: ActionKeys = {
      [Button.UP]:              () => this.buttonDirection(Button.UP),
      [Button.DOWN]:            () => this.buttonDirection(Button.DOWN),
      [Button.LEFT]:            () => this.buttonDirection(Button.LEFT),
      [Button.RIGHT]:           () => this.buttonDirection(Button.RIGHT),
      [Button.SUBMIT]:          () => this.buttonTouch(),
      [Button.ACTION]:          () => this.buttonAb(Button.ACTION),
      [Button.CANCEL]:          () => this.buttonAb(Button.CANCEL),
      [Button.MENU]:            () => this.buttonMenu(),
      [Button.STATS]:           () => this.buttonGoToFilter(Button.STATS),
      [Button.CYCLE_SHINY]:     () => this.buttonCycleOption(Button.CYCLE_SHINY),
      [Button.CYCLE_FORM]:      () => this.buttonCycleOption(Button.CYCLE_FORM),
      [Button.CYCLE_GENDER]:    () => this.buttonCycleOption(Button.CYCLE_GENDER),
      [Button.CYCLE_ABILITY]:   () => this.buttonCycleOption(Button.CYCLE_ABILITY),

      [Button.CYCLE_FUSION]:   () => this.buttonCycleOption(Button.CYCLE_FUSION),
      [Button.CYCLE_NATURE]:    () => this.buttonCycleOption(Button.CYCLE_NATURE),
      [Button.CYCLE_VARIANT]:    () => this.buttonCycleOption(Button.CYCLE_VARIANT),
      [Button.SPEED_UP]:        () => this.buttonSpeedChange(),
      [Button.SLOW_DOWN]:       () => this.buttonSpeedChange(false),
      [Button.CONSOLE]: () => this.buttonConsole(),
      [Button.VOIDEX]: () => this.buttonVoidex(),
      [Button.TOGGLE_PERMA_BAR]: () => this.buttonTogglePermaBar(),
      [Button.TOGGLE_PLAYER_BAR]: () => this.buttonTogglePlayerBar(),
      [Button.TOGGLE_FOE_BAR]: () => this.buttonToggleFoeBar(),
    };
    return actions;
  }

  getActionsKeyUp(): ActionKeys {
    const actions: ActionKeys = {
      [Button.UP]:              () => undefined,
      [Button.DOWN]:            () => undefined,
      [Button.LEFT]:            () => undefined,
      [Button.RIGHT]:           () => undefined,
      [Button.SUBMIT]:          () => undefined,
      [Button.ACTION]:          () => undefined,
      [Button.CANCEL]:          () => undefined,
      [Button.MENU]:            () => undefined,
      [Button.STATS]:           () => this.buttonStats(false),
      [Button.CYCLE_SHINY]:     () => undefined,
      [Button.CYCLE_FORM]:      () => undefined,
      [Button.CYCLE_GENDER]:    () => undefined,
      [Button.CYCLE_ABILITY]:   () => undefined,
      [Button.CYCLE_FUSION]:   () => undefined,
      [Button.CYCLE_NATURE]:    () => undefined,
      [Button.CYCLE_VARIANT]:               () => this.buttonInfo(false),
      [Button.SPEED_UP]:        () => undefined,
      [Button.SLOW_DOWN]:       () => undefined,
      [Button.CONSOLE]: () => undefined,
      [Button.VOIDEX]: () => undefined,
      [Button.TOGGLE_PERMA_BAR]: () => undefined,
      [Button.TOGGLE_PLAYER_BAR]: () => undefined,
      [Button.TOGGLE_FOE_BAR]: () => undefined,
    };
    return actions;
  }

  buttonDirection(direction: Button): void {
    const inputSuccess = this.scene.ui.processInput(direction);
    const vibrationLength = 5;
    this.doVibration(inputSuccess, vibrationLength);
  }

  buttonAb(button: Button): void {
    this.scene.ui.processInput(button);
  }

  buttonTouch(): void {
    this.scene.ui.processInput(Button.SUBMIT) || this.scene.ui.processInput(Button.ACTION);
  }
  buttonStats(pressed: boolean = true): void {
    if (pressed && ModifierTooltipUtils.handleStatsPressed(this.scene)) {
      return;
    }
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();

    if (pressed && currentMode === Mode.SKILL_TREE) {
      this.scene.ui.processInput(Button.STATS);
      return;
    }

    if (pressed && uiHandler instanceof ModifierSelectUiHandler) {
      if (uiHandler.wantsStatsForTooltipDetails()) {
        this.scene.ui.processInput(Button.STATS);
        return;
      }
      const currentOption = uiHandler.getCurrentSelectedOption();
      if (currentOption?.modifierTypeOption?.type instanceof AddPokemonModifierType) {
        this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
        return;
      }
    }

    if (pressed && uiHandler instanceof ChampionSelectUiHandler) {
      this.scene.ui.processInput(Button.STATS);
    }

    for (const t of this.scene.getInfoToggles(true)) {
      t.toggleInfo(pressed);
    }
    if (!(uiHandler instanceof ModifierSelectUiHandler)) {
      for (const p of this.scene.getField().filter(p => p?.isActive(true))) {
        p.toggleStats(pressed);
      }
    }
  }

  buttonGoToFilter(button: Button): void {
    const whitelist = [StarterSelectUiHandler];
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();
    if (button === Button.STATS && currentMode === Mode.VOIDEX_PRELIST) {
      this.scene.ui.processInput(button);
      return;
    }
    if (whitelist.some(handler => uiHandler instanceof handler)) {
      this.scene.ui.processInput(button);
    } else {
      this.buttonStats(true);
    }
  }

  buttonInfo(pressed: boolean = true): void {
    if (this.scene.showMovesetFlyout ) {
      for (const p of this.scene.getField().filter(p => p?.isActive(true))) {
        p.toggleFlyout(pressed);
      }
    }

    if (this.scene.showArenaFlyout) {
      this.scene.ui.processInfoButton(pressed);
    }
  }

  buttonMenu(): void {
    if (this.scene.disableMenu) {
      return;
    }

    const currentMode = this.scene.ui?.getMode();

    if (currentMode === Mode.SKILL_TREE) {
      this.scene.ui.processInput(Button.MENU);
      return;
    }

    switch (currentMode) {
    case Mode.MESSAGE:
      if (!(this.scene.ui.getHandler() as MessageUiHandler).pendingPrompt) {
        return;
      }
    case Mode.TITLE:
    case Mode.COMMAND:
    case Mode.MODIFIER_SELECT:
      this.scene.ui.setOverlayMode(Mode.MENU);
      break;
    case Mode.STARTER_SELECT:
      this.buttonTouch();
      break;
    case Mode.MENU:
      this.scene.ui.revertMode();
      this.scene.playSound("ui/select");
      break;
    default:
      return;
    }
  }

  buttonVoidex(): void {
    const currentMode = this.scene.ui?.getMode();

    if (currentMode === Mode.TITLE || currentMode === Mode.COMMAND || currentMode === Mode.MODIFIER_SELECT) {
      if(currentMode === Mode.MODIFIER_SELECT) {
        const uiHandler = this.scene.ui?.getHandler();
        if (uiHandler instanceof ModifierSelectUiHandler) {
          const currentOption = uiHandler.getCurrentSelectedOption();
          if (currentOption?.modifierTypeOption?.type instanceof AddPokemonModifierType) {
            this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
            return
          }
        }
      }
      this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
    }
  }

  buttonTogglePermaBar(): void {
    this.scene.ui.handlePermaBarToggle(this.scene);
  }

  buttonTogglePlayerBar(): void {
    const currentMode = this.scene.ui?.getMode();
    if (currentMode !== Mode.TITLE && this.scene.currentBattle) {
      this.scene.ui.handlePlayerBarToggle(this.scene);
    }
  }

  buttonToggleFoeBar(): void {
    const currentMode = this.scene.ui?.getMode();
    if (currentMode !== Mode.TITLE && this.scene.currentBattle) {
      this.scene.ui.handleFoeBarToggle(this.scene);
    }
  }

  buttonConsole(): void {
    const currentMode = this.scene.ui?.getMode();

    const bountyModes = [
      Mode.SMITTY_POKEMON_BOUNTY,
      Mode.RIVAL_BOUNTY,
      Mode.QUEST_BOUNTY
    ];

    if (bountyModes.includes(currentMode)) {
      return;
    }

    const consoleUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
    if (!consoleUnlocked && (currentMode === Mode.TITLE || currentMode === Mode.COMMAND)) {
      return;
    }

    switch (currentMode) {
      case Mode.SMITTY_CONSOLE:
        this.scene.ui.revertMode();
        this.scene.playSound("ui/select");
        break;

      case Mode.TITLE:
      case Mode.COMMAND:
        this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, {
          buttonActions: [
            async () => {
            },
            () => {
              this.scene.ui.revertMode();
            }
          ]
        });
        break;

      default:
        return;
    }
  }

  buttonCycleOption(button: Button): void {
    const whitelist = [StarterSelectUiHandler, SettingsUiHandler, RunInfoUiHandler, SettingsDisplayUiHandler, SettingsAudioUiHandler, SettingsGamepadUiHandler, SettingsKeyboardUiHandler, BattlePathUiHandler];
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();

    if (whitelist.some(handler => uiHandler instanceof handler)) {
      this.scene.ui.processInput(button);
    } else if (button === Button.CYCLE_SHINY) {
      switch (currentMode) {
        case Mode.TITLE:
          this.scene.ui.setOverlayMode(Mode.RUN_HISTORY);
          break;
        case Mode.COMMAND:
        case Mode.MODIFIER_SELECT:
          if (this.scene.sessionSlotId < 0) {
            break;
          }
          const slotId = this.scene.sessionSlotId;

          (async () => {
            try {
              const sessionData = await this.scene.gameData.getSession(slotId);
              if (sessionData) {
                const activeRunEntry = {
                  entry: sessionData,
                  isVictory: false,
                  isFavorite: false,
                  isActive: true
                };
                this.scene.ui.setOverlayMode(Mode.RUN_INFO, activeRunEntry, true);
              }
            } catch (error) {
              console.error("Error loading session data:", error);
            }
          })();
          break;
        default:
          this.scene.ui.processInput(button);
          break;
      }
    }
    else if (button === Button.CYCLE_ABILITY) {
      switch (currentMode) {
        case Mode.TITLE:
        case Mode.COMMAND:
          this.scene.ui.setOverlayMode(Mode.EGG_GACHA);
          break;
        case Mode.MODIFIER_SELECT: {
          const handler = this.scene.ui?.getHandler();
          if (handler instanceof ModifierSelectUiHandler && handler.wantsCycleAbilityForTooltip()) {
            this.scene.ui.processInput(button);
          } else {
            this.scene.ui.setOverlayMode(Mode.EGG_GACHA);
          }
          break;
        }
        case Mode.COLLECTED_TYPE_SELECT: {
          const handler = this.scene.ui?.getHandler();
          if (handler instanceof ModifierSelectUiHandler && handler.wantsCycleAbilityForTooltip()) {
            this.scene.ui.processInput(button);
          }
          break;
        }
        default:
          this.scene.ui.processInput(button);
          break;
      }
    }
    else if (button === Button.CYCLE_VARIANT) {
      const shopUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
      if (!shopUnlocked && (currentMode === Mode.TITLE || currentMode === Mode.COMMAND)) {
        return;
      }

      switch (currentMode) {
        case Mode.TITLE:
        case Mode.COMMAND:
          this.scene.ui.setMode(Mode.MESSAGE);
          this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
          const currentPhase = this.scene.getCurrentPhase();
          if (currentPhase) {
            this.scene.unshiftPhase(currentPhase);
          }
          this.scene.shiftPhase();
          break;
        default:
          this.scene.ui.processInput(button);
          break;
      }
    } else if (button === Button.CYCLE_FORM) {
      if (currentMode === Mode.TITLE || currentMode === Mode.COMMAND) {
        this.scene.ui.handleSaveButtonClick(this.scene as BattleScene);
      } else {
        this.scene.ui.processInput(button);
      }
    } else if (button === Button.CYCLE_GENDER) {
      this.scene.ui.processInput(button);
    } else if (button === Button.CYCLE_NATURE) {
      if((currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.COMMAND) && this.scene.gameMode.isChaosMode) {
          this.scene.ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
      }
      else if (currentMode === Mode.TITLE) {
        activateSmitomTalk(this.scene);
      } else {
        this.scene.ui.processInput(button);
      }
    } else {
      this.scene.ui.processInput(button);
    }
  }

  buttonSpeedChange(up = true): void {
    const settingGameSpeed = settingIndex(SettingKeys.Game_Speed);
    if (settingGameSpeed < 0) {
      return;
    }

    const options = Setting[settingGameSpeed].options;
    const currentIdx = options.findIndex((item) => item.label === `${this.scene.gameSpeed}x`);
    if (currentIdx < 0) {
      return;
    }

    const nextIdx = up
      ? Math.min(currentIdx + 1, options.length - 1)
      : Math.max(currentIdx - 1, 0);

    if (nextIdx === currentIdx) {
      return;
    }

    this.scene.gameData.saveSetting(SettingKeys.Game_Speed, nextIdx);
    if (this.scene.ui?.getMode() === Mode.SETTINGS) {
      (this.scene.ui.getHandler() as SettingsUiHandler).show([]);
    }
  }

}