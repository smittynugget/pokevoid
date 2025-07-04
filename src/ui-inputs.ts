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
      //if the touch property is present and defined, then this is a simulated keyboard event from the touch screen
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
    
    // allow access to Button.STATS as a toggle for other elements
    for (const t of this.scene.getInfoToggles(true)) {
      t.toggleInfo(pressed);
    }
    // handle normal pokemon battle ui
    for (const p of this.scene.getField().filter(p => p?.isActive(true))) {
      p.toggleStats(pressed);
    }
  }

  buttonGoToFilter(button: Button): void {
    const whitelist = [StarterSelectUiHandler];
    const uiHandler = this.scene.ui?.getHandler();
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
    switch (this.scene.ui?.getMode()) {
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
      this.scene.ui.setOverlayMode(Mode.POKEDEX);
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
    const whitelist = [StarterSelectUiHandler, SettingsUiHandler, RunInfoUiHandler, SettingsDisplayUiHandler, SettingsAudioUiHandler, SettingsGamepadUiHandler, SettingsKeyboardUiHandler];
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
        case Mode.MODIFIER_SELECT:
          this.scene.ui.setOverlayMode(Mode.EGG_GACHA);
          break;
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
          return;
      }
    } else if (button === Button.CYCLE_FORM && (currentMode === Mode.TITLE || currentMode === Mode.COMMAND)) {
      this.scene.ui.handleSaveButtonClick(this.scene as BattleScene);
    } else if (button === Button.CYCLE_NATURE) {
      if((currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.COMMAND) && this.scene.gameMode.isChaosMode) {
          this.scene.ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
      }
      else if (currentMode === Mode.TITLE) {
        activateSmitomTalk(this.scene);
      }
    }
  }

  buttonSpeedChange(up = true): void {
    const settingGameSpeed = settingIndex(SettingKeys.Game_Speed);
    if (up && this.scene.gameSpeed < 5) {
      this.scene.gameData.saveSetting(SettingKeys.Game_Speed, Setting[settingGameSpeed].options.findIndex((item) => item.label === `${this.scene.gameSpeed}x`) + 1);
      if (this.scene.ui?.getMode() === Mode.SETTINGS) {
        (this.scene.ui.getHandler() as SettingsUiHandler).show([]);
      }
    } else if (!up && this.scene.gameSpeed > 1) {
      this.scene.gameData.saveSetting(SettingKeys.Game_Speed, Math.max(Setting[settingGameSpeed].options.findIndex((item) => item.label === `${this.scene.gameSpeed}x`) - 1, 0));
      if (this.scene.ui?.getMode() === Mode.SETTINGS) {
        (this.scene.ui.getHandler() as SettingsUiHandler).show([]);
      }
    }
  }

}
