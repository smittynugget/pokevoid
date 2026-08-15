import Phaser from "phaser";
import * as Utils from "./utils";
import {deepCopy} from "./utils";
import pad_generic from "./configs/inputs/pad_generic";
import pad_unlicensedSNES from "./configs/inputs/pad_unlicensedSNES";
import pad_xbox360 from "./configs/inputs/pad_xbox360";
import pad_dualshock from "./configs/inputs/pad_dualshock";
import pad_procon from "./configs/inputs/pad_procon";
import {Mode} from "./ui/ui";
import SettingsGamepadUiHandler from "./ui/settings/settings-gamepad-ui-handler";
import SettingsKeyboardUiHandler from "./ui/settings/settings-keyboard-ui-handler";
import cfg_keyboard_qwerty from "./configs/inputs/cfg_keyboard_qwerty";
import {
  assign,
  getButtonWithKeycode,
  getIconForLatestInput, swap,
} from "#app/configs/inputs/configHandler";
import BattleScene from "./battle-scene";
import {SettingGamepad} from "#app/system/settings/settings-gamepad.js";
import {SettingKeyboard} from "#app/system/settings/settings-keyboard";
import TouchControl from "#app/touch-controls";
import { Button } from "#enums/buttons";
import { Device } from "#enums/devices";
import MoveTouchControlsHandler from "./ui/settings/move-touch-controls-handler";

export interface DeviceMapping {
  [key: string]: number;
}

export interface IconsMapping {
  [key: string]: string;
}

export interface SettingMapping {
  [key: string]: Button;
}

export interface MappingLayout {
  [key: string]: SettingGamepad | SettingKeyboard | number;
}

export interface InterfaceConfig {
  padID: string;
  padType: string;
  deviceMapping: DeviceMapping;
  icons: IconsMapping;
  settings: SettingMapping;
  default: MappingLayout;
  custom?: MappingLayout;
}

const repeatInputDelayMillis = 250;
export class InputsController {
  private gamepads: Array<Phaser.Input.Gamepad.Gamepad> = new Array();
  private scene: BattleScene;
  public events: Phaser.Events.EventEmitter;

  private buttonLock: Button[] = new Array();
  private interactions: Map<Button, Map<string, boolean>> = new Map();
  private configs: Map<string, InterfaceConfig> = new Map();

  public gamepadSupport: boolean = true;
  public selectedDevice;

  private disconnectedGamepads: Array<String> = new Array();
  public lastSource: string = "keyboard";
  private inputInterval: NodeJS.Timeout[] = new Array();
  private touchControls: TouchControl;
  public moveTouchControlsHandler: MoveTouchControlsHandler;
  constructor(scene: BattleScene) {
    this.scene = scene;
    this.selectedDevice = {
      [Device.GAMEPAD]: null,
      [Device.KEYBOARD]: "default"
    };

    for (const b of Utils.getEnumValues(Button)) {
      this.interactions[b] = {
        pressTime: false,
        isPressed: false,
        source: null,
      };
    }
    delete this.interactions[Button.MENU];
    delete this.interactions[Button.STATS];
    delete this.interactions[Button.CYCLE_ABILITY];
    this.init();
  }
  init(): void {
    this.events = this.scene.game.events;

    this.scene.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.loseFocus();
    });

    if (typeof this.scene.input.gamepad !== "undefined") {
      this.scene.input.gamepad?.on("connected", function (thisGamepad) {
        if (!thisGamepad) {
          return;
        }
        this.refreshGamepads();
        this.setupGamepad(thisGamepad);
        this.onReconnect(thisGamepad);
      }, this);

      this.scene.input.gamepad?.on("disconnected", function (thisGamepad) {
        this.onDisconnect(thisGamepad);
      }, this);

      this.scene.input.gamepad?.refreshPads();
      if (this.scene.input.gamepad?.total) {
        this.refreshGamepads();
        for (const thisGamepad of this.gamepads) {
          this.scene.input.gamepad.emit("connected", thisGamepad);
        }
      }

      this.scene.input.gamepad?.on("down", this.gamepadButtonDown, this);
      this.scene.input.gamepad?.on("up", this.gamepadButtonUp, this);
      this.scene.input.keyboard?.on("keydown", this.keyboardKeyDown, this);
      this.scene.input.keyboard?.on("keyup", this.keyboardKeyUp, this);
    }
    this.touchControls = new TouchControl(this.scene);
    this.moveTouchControlsHandler = new MoveTouchControlsHandler(this.touchControls);
  }
  loseFocus(): void {
    this.deactivatePressedKey();
    this.touchControls.deactivatePressedKey();
  }
  setGamepadSupport(value: boolean): void {
    if (value) {
      this.gamepadSupport = true;
    } else {
      this.gamepadSupport = false;
      this.deactivatePressedKey();
    }
  }
  setChosenGamepad(gamepad: String): void {
    this.deactivatePressedKey();
    this.initChosenGamepad(gamepad);
  }
  setChosenKeyboardLayout(layoutKeyboard: String): void {
    this.deactivatePressedKey();
    this.initChosenLayoutKeyboard(layoutKeyboard);
  }
  getGamepadsName(): Array<String> {
    return this.gamepads.filter(g => !this.disconnectedGamepads.includes(g.id)).map(g => g.id);
  }
  initChosenGamepad(gamepadName?: String): void {
    if (gamepadName) {
      this.selectedDevice[Device.GAMEPAD] = gamepadName.toLowerCase();
    }
    const handler = this.scene.ui?.handlers[Mode.SETTINGS_GAMEPAD] as SettingsGamepadUiHandler;
    handler && handler.updateChosenGamepadDisplay();
  }
  initChosenLayoutKeyboard(layoutKeyboard?: String): void {
    if (layoutKeyboard) {
      this.selectedDevice[Device.KEYBOARD] = layoutKeyboard.toLowerCase();
    }
    const handler = this.scene.ui?.handlers[Mode.SETTINGS_KEYBOARD] as SettingsKeyboardUiHandler;
    handler && handler.updateChosenKeyboardDisplay();
  }
  onDisconnect(thisGamepad: Phaser.Input.Gamepad.Gamepad): void {
    this.disconnectedGamepads.push(thisGamepad.id);
  }
  onReconnect(thisGamepad: Phaser.Input.Gamepad.Gamepad): void {
    this.disconnectedGamepads = this.disconnectedGamepads.filter(g => g !== thisGamepad.id);
  }
  setupGamepad(thisGamepad: Phaser.Input.Gamepad.Gamepad): void {
    const allGamepads = this.getGamepadsName();
    for (const gamepad of allGamepads) {
      const gamepadID = gamepad.toLowerCase();
      if (!this.selectedDevice[Device.GAMEPAD]) {
        this.setChosenGamepad(gamepadID);
      }
      const config = deepCopy(this.getConfig(gamepadID)) as InterfaceConfig;
      config.custom = this.configs[gamepadID]?.custom || {...config.default};
      this.configs[gamepadID] = config;
      this.scene.gameData?.saveMappingConfigs(gamepadID, this.configs[gamepadID]);
    }
    this.lastSource = "gamepad";
    const handler = this.scene.ui?.handlers[Mode.SETTINGS_GAMEPAD] as SettingsGamepadUiHandler;
    handler && handler.updateChosenGamepadDisplay();
  }
  setupKeyboard(): void {
    for (const layout of ["default"]) {
      const config = deepCopy(this.getConfigKeyboard(layout)) as InterfaceConfig;
      const savedCustom = this.configs[layout]?.custom || {};
      const filteredSaved: Record<string, any> = {};
      for (const key of Object.keys(savedCustom)) {
        if (savedCustom[key] !== -1) {
          filteredSaved[key] = savedCustom[key];
        }
      }
      config.custom = {...config.default, ...filteredSaved};
      this.configs[layout] = config;
      this.scene.gameData?.saveMappingConfigs(this.selectedDevice[Device.KEYBOARD], this.configs[layout]);
    }
    this.initChosenLayoutKeyboard(this.selectedDevice[Device.KEYBOARD]);
  }
  refreshGamepads(): void {

    this.gamepads = this.scene.input.gamepad?.gamepads.filter(function (el) {
      return el !== null;
    }) ?? [];

    for (const [index, thisGamepad] of this.gamepads.entries()) {
      thisGamepad.index = index;
    }
  }
  ensureKeyboardIsInit(): void {
    if (!this.getActiveConfig(Device.KEYBOARD)?.padID) {
      this.setupKeyboard();
    }
  }
  keyboardKeyDown(event): void {
    const el = document.activeElement as HTMLElement | null;
    const tag = el?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (el as any)?.isContentEditable) {
      this.deactivatePressedKey();
      return;
    }
    this.lastSource = "keyboard";
    this.ensureKeyboardIsInit();
    const buttonDown = getButtonWithKeycode(this.getActiveConfig(Device.KEYBOARD), event.keyCode);
    if (buttonDown !== undefined) {
      if (this.buttonLock.includes(buttonDown)) {
        return;
      }
      this.events.emit("input_down", {
        controller_type: "keyboard",
        button: buttonDown,
      });
      if (this.interactions[buttonDown]) {
        clearInterval(this.inputInterval[buttonDown]);
        this.inputInterval[buttonDown] = setInterval(() => {
          this.events.emit("input_down", {
            controller_type: "keyboard",
            button: buttonDown,
          });
        }, repeatInputDelayMillis);
      }
      this.buttonLock.push(buttonDown);
    }
  }
  keyboardKeyUp(event): void {
    this.lastSource = "keyboard";
    const buttonUp = getButtonWithKeycode(this.getActiveConfig(Device.KEYBOARD), event.keyCode);
    if (buttonUp === undefined) {
      return;
    }

    const el = document.activeElement as HTMLElement | null;
    const tag = el?.tagName;
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (el as any)?.isContentEditable;

    if (!isTyping) {
      this.events.emit("input_up", {
        controller_type: "keyboard",
        button: buttonUp,
      });
    }

    const index = this.buttonLock.indexOf(buttonUp);
    if (index > -1) {
      this.buttonLock.splice(index, 1);
    }
    clearInterval(this.inputInterval[buttonUp]);
  }
  gamepadButtonDown(pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button, value: number): void {
    if (!this.configs[this.selectedDevice[Device.KEYBOARD]]?.padID) {
      this.setupKeyboard();
    }
    if (!pad) {
      return;
    }
    this.lastSource = "gamepad";
    if (!this.selectedDevice[Device.GAMEPAD] || (this.scene.ui?.getMode() !== Mode.GAMEPAD_BINDING && this.selectedDevice[Device.GAMEPAD] !== pad.id.toLowerCase())) {
      this.setChosenGamepad(pad.id);
    }
    if (!this.gamepadSupport || pad.id.toLowerCase() !== this.selectedDevice[Device.GAMEPAD].toLowerCase()) {
      return;
    }
    const activeConfig = this.getActiveConfig(Device.GAMEPAD);
    const buttonDown = activeConfig && getButtonWithKeycode(activeConfig, button.index);
    if (buttonDown !== undefined) {
      if (this.buttonLock.includes(buttonDown)) {
        return;
      }
      this.events.emit("input_down", {
        controller_type: "gamepad",
        button: buttonDown,
      });
      if (this.interactions[buttonDown]) {
        clearInterval(this.inputInterval[buttonDown]);
        this.inputInterval[buttonDown] = setInterval(() => {
          if (!this.buttonLock.includes(buttonDown)) {
            clearInterval(this.inputInterval[buttonDown]);
            return;
          }
          this.events.emit("input_down", {
            controller_type: "gamepad",
            button: buttonDown,
          });
        }, repeatInputDelayMillis);
      }
      this.buttonLock.push(buttonDown);
    }
  }
  gamepadButtonUp(pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button, value: number): void {
    if (!pad) {
      return;
    }
    this.lastSource = "gamepad";
    if (!this.gamepadSupport || pad.id.toLowerCase() !== this.selectedDevice[Device.GAMEPAD]) {
      return;
    }
    const buttonUp = getButtonWithKeycode(this.getActiveConfig(Device.GAMEPAD), button.index);
    if (buttonUp !== undefined) {
      this.events.emit("input_up", {
        controller_type: "gamepad",
        button: buttonUp,
      });
      const index = this.buttonLock.indexOf(buttonUp);
      this.buttonLock.splice(index, 1);
      clearInterval(this.inputInterval[buttonUp]);
    }
  }
  getConfig(id: string): InterfaceConfig {
    id = id.toLowerCase();

    if (id.includes("081f") && id.includes("e401")) {
      return pad_unlicensedSNES;
    } else if (id.includes("xbox") && id.includes("360")) {
      return pad_xbox360;
    } else if (id.includes("054c")) {
      return pad_dualshock;
    } else if (id.includes("057e") && id.includes("2009")) {
      return pad_procon;
    }

    return pad_generic;
  }
  getConfigKeyboard(id: string): InterfaceConfig {
    if (id === "default") {
      return cfg_keyboard_qwerty;
    }

    return cfg_keyboard_qwerty;
  }
  deactivatePressedKey(): void {
    for (const key of Object.keys(this.inputInterval)) {
      clearInterval(this.inputInterval[key]);
    }
    this.buttonLock = [];
  }
  getActiveConfig(device: Device) {
    if (this.configs[this.selectedDevice[device]]?.padID) {
      return this.configs[this.selectedDevice[device]];
    }
    return null;
  }

  getIconForLatestInputRecorded(settingName) {
    if (this.lastSource === "keyboard") {
      this.ensureKeyboardIsInit();
    }
    return getIconForLatestInput(this.configs, this.lastSource, this.selectedDevice, settingName);
  }

  getLastSourceDevice(): Device {
    if (this.lastSource === "gamepad") {
      return Device.GAMEPAD;
    } else {
      return Device.KEYBOARD;
    }
  }

  getLastSourceConfig() {
    const sourceDevice = this.getLastSourceDevice();
    if (sourceDevice === Device.KEYBOARD) {
      this.ensureKeyboardIsInit();
    }
    return this.getActiveConfig(sourceDevice);
  }

  getLastSourceType() {
    const config = this.getLastSourceConfig();
    return config?.padType;
  }
  injectConfig(selectedDevice: string, mappingConfigs): void {
    if (!this.configs[selectedDevice]) {
      this.configs[selectedDevice] = {};
    }
    this.configs[selectedDevice].custom = mappingConfigs.custom;
  }

  resetConfigs(): void {
    this.configs = new Map();
    if (this.getGamepadsName()?.length) {
      this.setupGamepad(this.selectedDevice[Device.GAMEPAD]);
    }
    this.setupKeyboard();
  }
  assignBinding(config, settingName, pressedButton): boolean {
    this.deactivatePressedKey();
    if (config.padType === "keyboard") {
      return assign(config, settingName, pressedButton);
    } else {
      return swap(config, settingName, pressedButton);
    }
  }
}