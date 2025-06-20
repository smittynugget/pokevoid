import {default as BattleScene} from "../battle-scene";
import UiHandler from "./ui-handler";
import BattleMessageUiHandler from "./battle-message-ui-handler";
import CommandUiHandler, { Command } from "./command-ui-handler";
import PartyUiHandler, { PartyUiMode } from "./party-ui-handler";
import FightUiHandler from "./fight-ui-handler";
import MessageUiHandler from "./message-ui-handler";
import ConfirmUiHandler from "./confirm-ui-handler";
import ModifierSelectUiHandler from "./modifier-select-ui-handler";
import BallUiHandler from "./ball-ui-handler";
import SummaryUiHandler from "./summary-ui-handler";
import StarterSelectUiHandler from "./starter-select-ui-handler";
import EvolutionSceneHandler from "./evolution-scene-handler";
import TargetSelectUiHandler from "./target-select-ui-handler";
import SettingsUiHandler from "./settings/settings-ui-handler";
import SettingsGamepadUiHandler from "./settings/settings-gamepad-ui-handler";
import GameChallengesUiHandler from "./challenges-select-ui-handler";
import { TextStyle, addTextObject } from "./text";
import AchvBar from "./achv-bar";
import MenuUiHandler from "./menu-ui-handler";
import AchvsUiHandler from "./achvs-ui-handler";
import OptionSelectUiHandler from "./settings/option-select-ui-handler";
import EggHatchSceneHandler from "./egg-hatch-scene-handler";
import EggListUiHandler from "./egg-list-ui-handler";
import EggGachaUiHandler from "./egg-gacha-ui-handler";
import {addWindow, WindowVariant} from "./ui-theme";
import LoginFormUiHandler from "./login-form-ui-handler";
import RegistrationFormUiHandler from "./registration-form-ui-handler";
import LoadingModalUiHandler from "./loading-modal-ui-handler";
import * as Utils from "../utils";
import GameStatsUiHandler from "./game-stats-ui-handler";
import AwaitableUiHandler from "./awaitable-ui-handler";
import SaveSlotSelectUiHandler from "./save-slot-select-ui-handler";
import TitleUiHandler from "./title-ui-handler";
import SavingIconHandler from "./saving-icon-handler";
import UnavailableModalUiHandler from "./unavailable-modal-ui-handler";
import OutdatedModalUiHandler from "./outdated-modal-ui-handler";
import SessionReloadModalUiHandler from "./session-reload-modal-ui-handler";
import { Button } from "#enums/buttons";
import i18next from "i18next";
import GamepadBindingUiHandler from "./settings/gamepad-binding-ui-handler";
import SettingsKeyboardUiHandler from "#app/ui/settings/settings-keyboard-ui-handler";
import KeyboardBindingUiHandler from "#app/ui/settings/keyboard-binding-ui-handler";
import SettingsDisplayUiHandler from "./settings/settings-display-ui-handler";
import SettingsAudioUiHandler from "./settings/settings-audio-ui-handler";
import { PlayerGender } from "#enums/player-gender";
import BgmBar from "#app/ui/bgm-bar";
import RenameFormUiHandler from "./rename-form-ui-handler";
import RunHistoryUiHandler from "./run-history-ui-handler";
import RunInfoUiHandler from "./run-info-ui-handler";
import TestDialogueUiHandler from "#app/ui/test-dialogue-ui-handler";
import AutoCompleteUiHandler from "./autocomplete-ui-handler";
import ShopSelectUiHandler from "./shop-select-ui-handler";
import { GameObjects } from 'phaser';
import {PermaModifiers} from "#app/modifier/perma-modifiers";
import {ModifierBar} from "#app/modifier/modifier";
import ConsoleFormUiHandler from "#app/ui/console-form-ui-handler";
import SmittyPokemonBountyUIHandler from "#app/ui/smitty-pokemon-bounty-ui-handler";
import RivalBountyUiHandler from "#app/ui/rival-bounty-ui-handler";
import QuestBountyUiHandler from "#app/ui/quest-bounty-ui-handler";
import QuestActiveUiHandler from "#app/ui/quest-active-ui-handler";
import RewardObtainedUiHandler from "./reward-obtained-ui-handler";
import {GameDataType} from "#enums/game-data-type";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {TitlePhase} from "#app/phases/title-phase";
import { CommandPhase } from "#app/phases/command-phase";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { glitchText } from "#app/data/trainer-config.ts";
import { QuestUnlockables, QuestState } from "../system/game-data";
import TutorialUiHandler from "./tutorial-ui-handler";
import TutorialListUiHandler from "./tutorial-list-ui-handler";
import TransferSaveFormUiHandler from "./transfer-save-form-ui-handler";
import EggStarterUiHandler from "./egg-starter-ui-handler.js";
import ModGlitchFormUiHandler from "./mod-glitch-form-ui-handler";
import ModGlitchCreateFormUiHandler from "./mod-glitch-create-form-ui-handler";
import ModManagementUiHandler from "./mod-management-ui-handler";
import PokedexModalUiHandler from "./pokedex-modal-ui-handler";
import BattlePathUiHandler from "./battle-path-ui-handler";

export enum Mode {
  MESSAGE,
  TITLE,
  COMMAND,
  FIGHT,
  BALL,
  TARGET_SELECT,
  MODIFIER_SELECT,
  SAVE_SLOT,
  PARTY,
  SUMMARY,
  STARTER_SELECT,
  EVOLUTION_SCENE,
  EGG_HATCH_SCENE,
  EGG_STARTER_SELECT,
  CONFIRM,
  OPTION_SELECT,
  MENU,
  MENU_OPTION_SELECT,
  SETTINGS,
  SETTINGS_DISPLAY,
  SETTINGS_AUDIO,
  SETTINGS_GAMEPAD,
  GAMEPAD_BINDING,
  SETTINGS_KEYBOARD,
  KEYBOARD_BINDING,
  ACHIEVEMENTS,
  GAME_STATS,
  EGG_LIST,
  EGG_GACHA,
  LOGIN_FORM,
  REGISTRATION_FORM,
  LOADING,
  SESSION_RELOAD,
  UNAVAILABLE,
  OUTDATED,
  CHALLENGE_SELECT,
  RENAME_POKEMON,
  RUN_HISTORY,
  RUN_INFO,
  TEST_DIALOGUE,
  AUTO_COMPLETE,
  SHOP_SELECT,
  SMITTY_CONSOLE,
  SMITTY_POKEMON_BOUNTY,
  RIVAL_BOUNTY,
  QUEST_BOUNTY,
  QUEST_ACTIVE,
  REWARD_OBTAINED,
  TUTORIAL,
  TUTORIAL_LIST,
  MOD_GLITCH_FORM,
  MOD_GLITCH_CREATE_FORM,
  MOD_MANAGEMENT,
  TRANSFER_SAVE_FORM,
  IMPORT_DATA_FORM,
  POKEDEX,
  BATTLE_PATH,
}

const transitionModes = [
  Mode.SAVE_SLOT,
  Mode.PARTY,
  Mode.SUMMARY,
  Mode.STARTER_SELECT,
  Mode.EVOLUTION_SCENE,
  Mode.EGG_HATCH_SCENE,
  Mode.EGG_STARTER_SELECT,
  Mode.EGG_LIST,
  Mode.EGG_GACHA,
  Mode.CHALLENGE_SELECT,
  Mode.RUN_HISTORY,
];

const noTransitionModes = [
  Mode.TITLE,
  Mode.CONFIRM,
  Mode.OPTION_SELECT,
  Mode.MENU,
  Mode.MENU_OPTION_SELECT,
  Mode.GAMEPAD_BINDING,
  Mode.KEYBOARD_BINDING,
  Mode.SETTINGS,
  Mode.SETTINGS_AUDIO,
  Mode.SETTINGS_DISPLAY,
  Mode.SETTINGS_GAMEPAD,
  Mode.SETTINGS_KEYBOARD,
  Mode.ACHIEVEMENTS,
  Mode.GAME_STATS,
  Mode.LOGIN_FORM,
  Mode.REGISTRATION_FORM,
  Mode.LOADING,
  Mode.SESSION_RELOAD,
  Mode.UNAVAILABLE,
  Mode.OUTDATED,
  Mode.RENAME_POKEMON,
  Mode.TEST_DIALOGUE,
  Mode.AUTO_COMPLETE,
  Mode.SMITTY_CONSOLE,
  Mode.SMITTY_POKEMON_BOUNTY,
  Mode.RIVAL_BOUNTY,
  Mode.QUEST_BOUNTY,
  Mode.QUEST_ACTIVE,
  Mode.REWARD_OBTAINED,
  Mode.TUTORIAL,
  Mode.TUTORIAL_LIST,
  Mode.MOD_GLITCH_FORM,
  Mode.MOD_GLITCH_CREATE_FORM,
  Mode.MOD_MANAGEMENT,
  Mode.TRANSFER_SAVE_FORM,
  Mode.IMPORT_DATA_FORM,
  Mode.POKEDEX,
  Mode.BATTLE_PATH
];


type DisplayListItem = GameObjects.GameObject & Partial<GameObjects.Components.Depth & GameObjects.Components.Visible & GameObjects.Components.Alpha>;

export default class UI extends Phaser.GameObjects.Container {
  private mode: Mode;
  private modeChain: Mode[];
  public handlers: UiHandler[];
  private overlay: Phaser.GameObjects.Rectangle;
  public achvBar: AchvBar;
  public bgmBar: BgmBar;
  public savingIcon: SavingIconHandler;

  private tooltipContainer: Phaser.GameObjects.Container;
  private tooltipBg: Phaser.GameObjects.NineSlice;
  private tooltipTitle: Phaser.GameObjects.Text;
  private tooltipContent: Phaser.GameObjects.Text;

  private overlayActive: boolean;

  private permaMoneyContainer: Phaser.GameObjects.Container;
  protected permaMoneyText: Phaser.GameObjects.Text;
  private permaModifierBar: ModifierBar;
  private saveButton: Phaser.GameObjects.Sprite;
  private saveContainer: Phaser.GameObjects.Container;
  private saveExclamationWindow: Phaser.GameObjects.Container;
  private voidexButton: Phaser.GameObjects.Sprite;
  private voidexContainer: Phaser.GameObjects.Container;
  private eggGachaButton: Phaser.GameObjects.Sprite;
  private eggGachaContainer: Phaser.GameObjects.Container;
  private battlePathButton: Phaser.GameObjects.Sprite;
  private battlePathContainer: Phaser.GameObjects.Container;

  constructor(scene: BattleScene) {
    super(scene, 0, scene.game.canvas.height / 6);

    this.mode = Mode.MESSAGE;
    this.modeChain = [];
    this.handlers = new Array(Object.keys(Mode).length / 2);
    this.handlers[Mode.MESSAGE] = new BattleMessageUiHandler(scene);
    this.handlers[Mode.TITLE] = new TitleUiHandler(scene);
    this.handlers[Mode.COMMAND] = new CommandUiHandler(scene);
    this.handlers[Mode.FIGHT] = new FightUiHandler(scene);
    this.handlers[Mode.BALL] = new BallUiHandler(scene);
    this.handlers[Mode.TARGET_SELECT] = new TargetSelectUiHandler(scene);
    this.handlers[Mode.MODIFIER_SELECT] = new ModifierSelectUiHandler(scene);
    this.handlers[Mode.SAVE_SLOT] = new SaveSlotSelectUiHandler(scene);
    this.handlers[Mode.PARTY] = new PartyUiHandler(scene);
    this.handlers[Mode.SUMMARY] = new SummaryUiHandler(scene);
    this.handlers[Mode.STARTER_SELECT] = new StarterSelectUiHandler(scene);
    this.handlers[Mode.EVOLUTION_SCENE] = new EvolutionSceneHandler(scene);
    this.handlers[Mode.EGG_HATCH_SCENE] = new EggHatchSceneHandler(scene);
    this.handlers[Mode.EGG_STARTER_SELECT] = new EggStarterUiHandler(scene);
    this.handlers[Mode.CONFIRM] = new ConfirmUiHandler(scene);
    this.handlers[Mode.OPTION_SELECT] = new OptionSelectUiHandler(scene);
    this.handlers[Mode.MENU] = new MenuUiHandler(scene);
    this.handlers[Mode.MENU_OPTION_SELECT] = new OptionSelectUiHandler(scene, Mode.MENU_OPTION_SELECT);
    this.handlers[Mode.SETTINGS] = new SettingsUiHandler(scene);
    this.handlers[Mode.SETTINGS_DISPLAY] = new SettingsDisplayUiHandler(scene);
    this.handlers[Mode.SETTINGS_AUDIO] = new SettingsAudioUiHandler(scene);
    this.handlers[Mode.SETTINGS_GAMEPAD] = new SettingsGamepadUiHandler(scene);
    this.handlers[Mode.GAMEPAD_BINDING] = new GamepadBindingUiHandler(scene);
    this.handlers[Mode.SETTINGS_KEYBOARD] = new SettingsKeyboardUiHandler(scene);
    this.handlers[Mode.KEYBOARD_BINDING] = new KeyboardBindingUiHandler(scene);
    this.handlers[Mode.ACHIEVEMENTS] = new AchvsUiHandler(scene);
    this.handlers[Mode.GAME_STATS] = new GameStatsUiHandler(scene);
    this.handlers[Mode.EGG_LIST] = new EggListUiHandler(scene);
    this.handlers[Mode.EGG_GACHA] = new EggGachaUiHandler(scene);
    this.handlers[Mode.LOGIN_FORM] = new LoginFormUiHandler(scene);
    this.handlers[Mode.REGISTRATION_FORM] = new RegistrationFormUiHandler(scene);
    this.handlers[Mode.LOADING] = new LoadingModalUiHandler(scene);
    this.handlers[Mode.SESSION_RELOAD] = new SessionReloadModalUiHandler(scene);
    this.handlers[Mode.UNAVAILABLE] = new UnavailableModalUiHandler(scene);
    this.handlers[Mode.OUTDATED] = new OutdatedModalUiHandler(scene);
    this.handlers[Mode.CHALLENGE_SELECT] = new GameChallengesUiHandler(scene);
    this.handlers[Mode.RENAME_POKEMON] = new RenameFormUiHandler(scene);
    this.handlers[Mode.RUN_HISTORY] = new RunHistoryUiHandler(scene);
    this.handlers[Mode.RUN_INFO] = new RunInfoUiHandler(scene);
    this.handlers[Mode.TEST_DIALOGUE] = new TestDialogueUiHandler(scene, Mode.TEST_DIALOGUE);
    this.handlers[Mode.AUTO_COMPLETE] = new AutoCompleteUiHandler(scene);
    this.handlers[Mode.SHOP_SELECT] = new ShopSelectUiHandler(scene);
    this.handlers[Mode.SMITTY_CONSOLE] = new ConsoleFormUiHandler(scene, Mode.SMITTY_CONSOLE);
    this.handlers[Mode.SMITTY_POKEMON_BOUNTY] = new SmittyPokemonBountyUIHandler(scene, Mode.SMITTY_POKEMON_BOUNTY);
    this.handlers[Mode.RIVAL_BOUNTY] = new RivalBountyUiHandler(scene, Mode.RIVAL_BOUNTY);
    this.handlers[Mode.QUEST_BOUNTY] = new QuestBountyUiHandler(scene, Mode.QUEST_BOUNTY);
    this.handlers[Mode.QUEST_ACTIVE] = new QuestActiveUiHandler(scene, Mode.QUEST_ACTIVE);
    this.handlers[Mode.REWARD_OBTAINED] = new RewardObtainedUiHandler(scene, Mode.REWARD_OBTAINED);
    this.handlers[Mode.TUTORIAL] = new TutorialUiHandler(scene, Mode.TUTORIAL);
    this.handlers[Mode.TUTORIAL_LIST] = new TutorialListUiHandler(scene, Mode.TUTORIAL_LIST);
    this.handlers[Mode.MOD_GLITCH_FORM] = new ModGlitchFormUiHandler(scene);
    this.handlers[Mode.MOD_GLITCH_CREATE_FORM] = new ModGlitchCreateFormUiHandler(scene);
    this.handlers[Mode.MOD_MANAGEMENT] = new ModManagementUiHandler(scene);
    this.handlers[Mode.TRANSFER_SAVE_FORM] = new TransferSaveFormUiHandler(scene);
    this.handlers[Mode.POKEDEX] = new PokedexModalUiHandler(scene);
    this.handlers[Mode.BATTLE_PATH] = new BattlePathUiHandler(scene);

    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
      console.log("Detected iOS device - preloading ImportDataFormUiHandler");
      import("./import-data-form-ui-handler").then(module => {
        console.log("ImportDataFormUiHandler loaded successfully");
        try {
          const handler = new module.default(scene);
          this.handlers[Mode.IMPORT_DATA_FORM] = handler;
          console.log("ImportDataFormUiHandler added to handlers array at index", Mode.IMPORT_DATA_FORM);
        } catch (e) {
          console.error("Error creating ImportDataFormUiHandler:", e);
        }
      }).catch(err => {
        console.error("Failed to load ImportDataFormUiHandler:", err);
      });
    }

    this.permaMoneyContainer = this.scene.add.container(0, 0);
    this.permaMoneyContainer.setName("permaMoneyContainer");
    this.add(this.permaMoneyContainer);

    this.saveButton = this.scene.add.sprite(-1, 0, "saving_icon");
    this.saveButton.setName("save-button");
    this.saveButton.setScale(0.3);
    this.saveButton.setAlpha(0.5);
    this.saveButton.setInteractive({ useHandCursor: true });
    this.saveButton.on('pointerdown', () => this.handleSaveButtonClick(this.scene as BattleScene));

    const saveIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_FORM");
    const saveType = scene.inputController?.getLastSourceType() || "keyboard";
    const saveKeySprite = this.scene.add.sprite(2, 2, saveType);
    if (saveIcon) {
      saveKeySprite.setFrame(saveIcon);
    }
    saveKeySprite.setScale(.4);
    this.saveContainer = this.scene.add.container(0, 0);
    this.saveContainer.setName("save-container");
    this.saveContainer.add([this.saveButton, saveKeySprite]);

    this.permaMoneyContainer.add(this.saveContainer);

    this.voidexButton = this.scene.add.sprite(0, 0, "items", "scanner");
    this.voidexButton.setName("voidex-button");
    this.voidexButton.setScale(0.3);
    this.voidexButton.setAlpha(1);
    this.voidexButton.setInteractive({ useHandCursor: true });
    this.voidexButton.on('pointerdown', () => scene.ui.setOverlayMode(Mode.POKEDEX));
    const voidexIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_VOIDEX");
    const voidexType = scene.inputController?.getLastSourceType() || "keyboard";
    const voidexKeySprite = this.scene.add.sprite(2, 2, voidexType);
    if (voidexIcon) {
      voidexKeySprite.setFrame(voidexIcon);
    }
    voidexKeySprite.setScale(.4);
    this.voidexContainer = this.scene.add.container(0, 0);
    this.voidexContainer.setName("voidex-container");
    this.voidexContainer.add([this.voidexButton, voidexKeySprite]);
    this.permaMoneyContainer.add(this.voidexContainer);

    this.eggGachaButton = this.scene.add.sprite(0, 0, "egg", "egg_0");
    this.eggGachaButton.setName("egg-gacha-button");
    this.eggGachaButton.setScale(0.2);
    this.eggGachaButton.setAlpha(1);
    this.eggGachaButton.setInteractive({ useHandCursor: true });
    this.eggGachaButton.on('pointerdown', () => scene.ui.setOverlayMode(Mode.EGG_GACHA));

    const eggGachaIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_ABILITY");
    const eggGachaType = scene.inputController?.getLastSourceType() || "keyboard";
    const eggGachaKeySprite = this.scene.add.sprite(2, 2, eggGachaType);
    if (eggGachaIcon) {
      eggGachaKeySprite.setFrame(eggGachaIcon);
    }
    eggGachaKeySprite.setScale(.4);

    this.eggGachaContainer = this.scene.add.container(0, 0);
    this.eggGachaContainer.setName("egg-gacha-container");
    this.eggGachaContainer.add([this.eggGachaButton, eggGachaKeySprite]);
    this.permaMoneyContainer.add(this.eggGachaContainer);
    this.battlePathButton = this.scene.add.sprite(0, 0, "items", "map");
    this.battlePathButton.setName("battle-path-button");
    this.battlePathButton.setScale(0.3);
    this.battlePathButton.setAlpha(1);
    this.battlePathButton.setInteractive({ useHandCursor: true });
    this.battlePathButton.on('pointerdown', () => {
      if (scene.gameMode?.isChaosMode) {
        scene.ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
      }
    });

    const battlePathIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_NATURE");
    const battlePathType = scene.inputController?.getLastSourceType() || "keyboard";
    const battlePathKeySprite = this.scene.add.sprite(2, 2, battlePathType);
    if (battlePathIcon) {
      battlePathKeySprite.setFrame(battlePathIcon);
    }
    battlePathKeySprite.setScale(.4);

    this.battlePathContainer = this.scene.add.container(0, 0);
    this.battlePathContainer.setName("battle-path-container");
    this.battlePathContainer.add([this.battlePathButton, battlePathKeySprite]);
    this.permaMoneyContainer.add(this.battlePathContainer);

    this.permaModifierBar = new ModifierBar(scene as BattleScene)
    const rightEdge = 0;
    const topEdge = -scene.game.canvas.height / 6;
    this.permaModifierBar.setPosition(1, topEdge + 2);
    this.permaModifierBar.setName("perma-modifier-bar");
    this.add(this.permaModifierBar);
  }

  public async handleSaveButtonClick(scene: BattleScene): Promise<void> {
    const currentPhase = scene.getCurrentPhase();
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase)) {
      return;
    }
    
    if (currentPhase instanceof CommandPhase && this.mode !== Mode.COMMAND) {
      await this.setMode(Mode.COMMAND, (currentPhase as CommandPhase).getFieldIndex());
    }
    
    const exportSuccess = await scene.gameData.tryExportData(GameDataType.COMBINED);
    if (exportSuccess && scene.gameData.isSaveRewardTime()) {
      scene.unshiftPhase(new ModifierRewardPhase(
          scene, null, true,
          () => {
            scene.gameData.localSaveAll(scene);
            scene.gameData.updateSaveRewardTime()
            scene.unshiftPhase(currentPhase);
          }
      ));
      scene.shiftPhase();
    }
  }

  public handleVoidexButtonClick(scene: BattleScene): void {
    scene.ui.setOverlayMode(Mode.POKEDEX);
  }

  updatePermaModifierBar(permaModifiers: PermaModifiers): void {


    const visibleModifiers = permaModifiers.getModifiers();

    this.permaModifierBar.updateModifiers(visibleModifiers);
    this.permaModifierBar.setVisible(true)

  }

  setup(): void {
    this.setName(`ui-${Mode[this.mode]}`);
    for (const handler of this.handlers) {
      if (handler) {
        handler.setup();
      }
    }
    this.overlay = this.scene.add.rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0);
    this.overlay.setName("rect-ui-overlay");
    this.overlay.setOrigin(0, 0);
    (this.scene as BattleScene).uiContainer.add(this.overlay);
    this.overlay.setVisible(false);
    this.setupTooltip();

    this.achvBar = new AchvBar(this.scene as BattleScene);
    this.achvBar.setup();

    (this.scene as BattleScene).uiContainer.add(this.achvBar);

    this.savingIcon = new SavingIconHandler(this.scene as BattleScene);
    this.savingIcon.setup();

    (this.scene as BattleScene).uiContainer.add(this.savingIcon);

    this.updatePermaMoneyText((this.scene as BattleScene));

    this.updatePermaModifierBar((this.scene as BattleScene).gameData.permaModifiers);

  }

  private setupTooltip() {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setName("tooltip");
    this.tooltipContainer.setVisible(false);

    this.tooltipBg = addWindow(this.scene as BattleScene, 0, 0, 128, 31);
    this.tooltipBg.setName("window-tooltip-bg");
    this.tooltipBg.setOrigin(0, 0);

    this.tooltipTitle = addTextObject(this.scene, 64, 4, "", TextStyle.TOOLTIP_TITLE);
    this.tooltipTitle.setName("text-tooltip-title");
    this.tooltipTitle.setOrigin(0.5, 0);

    this.tooltipContent = addTextObject(this.scene, 6, 16, "", TextStyle.TOOLTIP_CONTENT);
    this.tooltipContent.setName("text-tooltip-content");
    this.tooltipContent.setWordWrapWidth(696);

    this.tooltipContainer.add(this.tooltipBg);
    this.tooltipContainer.add(this.tooltipTitle);
    this.tooltipContainer.add(this.tooltipContent);

    (this.scene as BattleScene).uiContainer.add(this.tooltipContainer);
  }

  getHandler<H extends UiHandler = UiHandler>(): H {
    const handler = this.handlers[this.mode];
    if (!handler) {
      console.warn(`No handler found for mode ${Mode[this.mode]} (${this.mode}). Falling back to MESSAGE handler.`);
      return this.handlers[Mode.MESSAGE] as H;
    }
    return handler as H;
  }

  getMessageHandler(): BattleMessageUiHandler {
    return this.handlers[Mode.MESSAGE] as BattleMessageUiHandler;
  }

  processInfoButton(pressed: boolean) {
    if (this.overlayActive) {
      return false;
    }

    const battleScene = this.scene as BattleScene;
    if ([Mode.CONFIRM, Mode.COMMAND, Mode.FIGHT, Mode.MESSAGE].includes(this.mode)) {
      battleScene?.processInfoButton(pressed);
      return true;
    }

    battleScene?.processInfoButton(false);
    return true;
  }

  processInput(button: Button): boolean {
    if (this.overlayActive) {
      return false;
    }

    const handler = this.getHandler();

    if (handler instanceof AwaitableUiHandler && handler.tutorialActive) {
      return handler.processTutorialInput(button);
    }

    return handler.processInput(button);
  }

  showText(text: string, delay?: integer | null, callback?: Function | null, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null): void {
    if (prompt && text.indexOf("$") > -1) {
      const messagePages = text.split(/\$/g).map(m => m.trim());
      let showMessageAndCallback = () => callback && callback();
      for (let p = messagePages.length - 1; p >= 0; p--) {
        const originalFunc = showMessageAndCallback;
        showMessageAndCallback = () => this.showText(messagePages[p], null, originalFunc, null, true);
      }
      showMessageAndCallback();
    } else {
      const handler = this.getHandler();
      if (handler instanceof MessageUiHandler) {
        (handler as MessageUiHandler).showText(text, delay, callback, callbackDelay, prompt, promptDelay);
      } else {
        this.getMessageHandler().showText(text, delay, callback, callbackDelay, prompt, promptDelay);
      }

    }
  }

  showDialogue(keyOrText: string, name: string | undefined, delay: integer | null = 0, callback: Function, callbackDelay?: integer, promptDelay?: integer): void {
    const battleScene = this.scene as BattleScene;
    let hasi18n = false;
    let text = keyOrText;
    const genderIndex = battleScene.gameData.gender ?? PlayerGender.UNSET;
    const genderStr = PlayerGender[genderIndex].toLowerCase();

    if (i18next.exists(keyOrText) ) {
      const i18nKey = keyOrText;
      hasi18n = true;
      text = i18next.t(i18nKey, { context: genderStr });
      if (battleScene.currentBattle?.trainer?.isCorrupted) {
        text = glitchText(text, true);
      }

      if (battleScene.skipSeenDialogues && battleScene.gameData.getSeenDialogues()[i18nKey] === true) {
        console.log(`Dialogue ${i18nKey} skipped`);
        callback();
        return;
      }
    }
    let showMessageAndCallback = () => {
      hasi18n && battleScene.gameData.saveSeenDialogue(keyOrText);
      callback();
    };

    const maxPageLength = 108;
    const maxWordsPerPage = 19;

    const splitIntoPages = (text: string): string[] => {

      if (text.indexOf("$") > -1) {
        const pages = text.split(/\$/g).map(m => m.trim());
        return pages;
      }

      const words = text.split(/\s+/);

      const pages: string[] = [];
      let currentPage = "";
      let wordCount = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const potentialPage = currentPage ? `${currentPage} ${word}` : word;

        if (potentialPage.length > maxPageLength || wordCount + 1 > maxWordsPerPage) {
          pages.push(currentPage);
          currentPage = word;
          wordCount = 1;
        } else {
          currentPage = potentialPage;
          wordCount++;
        }
      }

      if (currentPage) {
        pages.push(currentPage);
      }

      return pages;
    };

    const messagePages = splitIntoPages(text);

    if (messagePages.length > 1) {
      for (let p = messagePages.length - 1; p >= 0; p--) {
        const originalFunc = showMessageAndCallback;
        showMessageAndCallback = () => this.showDialogue(messagePages[p], name, null, originalFunc);
      }
      showMessageAndCallback();
    } else {
      const handler = this.getHandler();
      if (handler instanceof MessageUiHandler) {
        (handler as MessageUiHandler).showDialogue(text, name, delay, showMessageAndCallback, callbackDelay, true, promptDelay);
      } else {
        this.getMessageHandler().showDialogue(text, name, delay, showMessageAndCallback, callbackDelay, true, promptDelay);
      }
    }
  }

  shouldSkipDialogue(i18nKey: string): boolean {
    const battleScene = this.scene as BattleScene;

    if (i18next.exists(i18nKey) ) {
      if (battleScene.skipSeenDialogues && battleScene.gameData.getSeenDialogues()[i18nKey] === true) {
        return true;
      }
    }
    return false;
  }

  showTooltip(title: string, content: string, overlap?: boolean): void {
    this.tooltipContainer.setVisible(true);
    this.tooltipTitle.setText(title || "");
    const wrappedContent = this.tooltipContent.runWordWrap(content);
    this.tooltipContent.setText(wrappedContent);
    this.tooltipContent.y = title ? 16 : 4;
    this.tooltipBg.width = Math.min(Math.max(this.tooltipTitle.displayWidth, this.tooltipContent.displayWidth) + 12, 684);
    this.tooltipBg.height = (title ? 31 : 19) + 10.5 * (wrappedContent.split("\n").length - 1);
    if (overlap) {
      (this.scene as BattleScene).uiContainer.moveAbove(this.tooltipContainer, this);
    } else {
      (this.scene as BattleScene).uiContainer.moveBelow(this.tooltipContainer, this);
    }
  }

  hideTooltip(): void {
    this.tooltipContainer.setVisible(false);
    this.tooltipTitle.clearTint();
  }

  update(): void {
    if (this.tooltipContainer.visible) {
      const reverse = this.scene.game.input.mousePointer && this.scene.game.input.mousePointer.x >= this.scene.game.canvas.width - this.tooltipBg.width * 6 - 12;
      this.tooltipContainer.setPosition(!reverse ? this.scene.game.input.mousePointer!.x / 6 + 2 : this.scene.game.input.mousePointer!.x / 6 - this.tooltipBg.width - 2, this.scene.game.input.mousePointer!.y / 6 + 2);
    }
  }

  clearText(): void {
    const handler = this.getHandler();
    if (handler instanceof MessageUiHandler) {
      (handler as MessageUiHandler).clearText();
    } else {
      this.getMessageHandler().clearText();
    }
  }

  setCursor(cursor: integer): boolean {
    const changed = this.getHandler().setCursor(cursor);
    if (changed) {
      this.playSelect();
    }

    return changed;
  }

  playSelect(): void {
    (this.scene as BattleScene).playSound("ui/select");
  }

  playError(): void {
    (this.scene as BattleScene).playSound("ui/error");
  }

  fadeOut(duration: integer): Promise<void> {
    return new Promise(resolve => {
      if (this.overlayActive) {
        return resolve();
      }
      this.overlayActive = true;
      this.overlay.setAlpha(0);
      this.overlay.setVisible(true);
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration: duration,
        ease: "Sine.easeOut",
        onComplete: () => resolve()
      });
    });
  }

  fadeIn(duration: integer): Promise<void> {
    return new Promise(resolve => {
      if (!this.overlayActive) {
        return resolve();
      }
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: duration,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.overlay.setVisible(false);
          resolve();
        }
      });
      this.overlayActive = false;
    });
  }

  private setModeInternal(mode: Mode, clear: boolean, forceTransition: boolean, chainMode: boolean, args: any[]): Promise<void> {
    return new Promise(resolve => {
      
      if (this.mode === mode && !forceTransition) {
        resolve();
        return;
      }

      const doSetMode = () => {
        if (this.mode !== mode) {
          
          if (clear) {
            this.getHandler().clear();
          }
          
          if (chainMode && this.mode && !clear) {
            this.modeChain.push(this.mode);
            (this.scene as BattleScene).updateGameInfo();
          }
          
          this.mode = mode;
          const touchControls = document?.getElementById("touchControls");
          if (touchControls) {
            touchControls.dataset.uiMode = Mode[mode];
            
            const scene = this.scene as BattleScene;
            const shopUnlocked = scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
            const consoleUnlocked = scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
            
            touchControls.dataset.shopUnlocked = shopUnlocked ? "true" : "false";
            touchControls.dataset.consoleUnlocked = consoleUnlocked ? "true" : "false";
          }
          
          const newHandler = this.getHandler();
          if (newHandler) {
            newHandler.show(args);
          } else {
          }
        }
        resolve();
      };

      if (((!chainMode && ((transitionModes.indexOf(this.mode) > -1 || transitionModes.indexOf(mode) > -1)
              && (noTransitionModes.indexOf(this.mode) === -1 && noTransitionModes.indexOf(mode) === -1)))
          || (chainMode && noTransitionModes.indexOf(mode) === -1))) {
        this.fadeOut(250).then(() => {
          this.scene.time.delayedCall(100, () => {
            doSetMode();
            this.fadeIn(250);
          });
        });
      } else {
        doSetMode();
      }
    });
  }

  getMode(): Mode {
    return this.mode;
  }

  setMode(mode: Mode, ...args: any[]): Promise<void> {
    return this.setModeInternal(mode, true, false, false, args);
  }

  setModeForceTransition(mode: Mode, ...args: any[]): Promise<void> {
    return this.setModeInternal(mode, true, true, false, args);
  }

  setModeWithoutClear(mode: Mode, ...args: any[]): Promise<void> {
    return this.setModeInternal(mode, false, false, false, args);
  }

  setOverlayMode(mode: Mode, ...args: any[]): Promise<void> {
    return this.setModeInternal(mode, false, false, true, args);
  }

    setOverlayModeForceTransition(mode: Mode, ...args: any[]): Promise<void> {
        return this.setModeInternal(mode, false, true, true, args);
    }

  resetModeChain(): void {
    this.modeChain = [];
    (this.scene as BattleScene).updateGameInfo();
  }

  revertMode(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      
      if (!this?.modeChain?.length) {
        return resolve(false);
      }

      const lastMode = this.mode;

      const doRevertMode = () => {
        this.getHandler().clear();
        this.mode = this.modeChain.pop()!;
        (this.scene as BattleScene).updateGameInfo();
        const touchControls = document.getElementById("touchControls");
        if (touchControls) {
          touchControls.dataset.uiMode = Mode[this.mode];
        }
        resolve(true);
      };

      if (noTransitionModes.indexOf(lastMode) === -1) {
        this.fadeOut(250).then(() => {
          this.scene.time.delayedCall(100, () => {
            doRevertMode();
            this.fadeIn(250);
          });
        });
      } else {
        doRevertMode();
      }
    });
  }

  revertModes(): Promise<void> {
    return new Promise<void>(resolve => {
      
      if (!this?.modeChain?.length) {
        return resolve();
      }
      this.revertMode().then(success => Utils.executeIf(success, this.revertModes).then(() => resolve()));
    });
  }

  public getModeChain(): Mode[] {
    return this.modeChain;
  }

  public updateSaveIcon(scene: BattleScene): void {
    const currentPhase = scene.getCurrentPhase();
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase)) {
      this.saveContainer.setAlpha(0);
      if (this.saveExclamationWindow) {
          this.saveExclamationWindow.setVisible(false);
      }
      const saveButton = document.getElementById("apadSave");
      if (saveButton) {
        saveButton.dataset.activeState = "false";
      }
      return;
    } else if (scene.gameData.isSaveRewardTime()) {
      this.saveContainer.setAlpha(1);
      this.saveButton.setAlpha(1);
      if (!this.saveExclamationWindow) {
        this.setupSaveExclamation();
      } else {
          this.saveExclamationWindow.setVisible(true);
      }
      const saveButton = document.getElementById("apadSave");
      if (saveButton) {
        saveButton.dataset.activeState = "true";
      }
      return;
    } else if (this.saveExclamationWindow) {
        this.saveExclamationWindow.setVisible(false);
    }
    this.saveContainer.setAlpha(1);
    this.saveButton.setAlpha(0.5);
    
    const saveButton = document.getElementById("apadSave");
    if (saveButton) {
      saveButton.dataset.activeState = "false";
    }
  }

  public updateVoidexIcon(scene: BattleScene): void {
    const currentPhase = scene.getCurrentPhase();
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase || currentPhase instanceof SelectModifierPhase)) {
      this.voidexContainer.setAlpha(0);
      const voidexContainer = document.getElementById("apadVoidex");
      if (voidexContainer) {
        voidexContainer.dataset.activeState = "false";
      }
      return;
    } 
    this.voidexContainer.setAlpha(1);
    
    const voidexContainer = document.getElementById("apadVoidex");
    if (voidexContainer) {
      voidexContainer.dataset.activeState = "true";
    }
  }

  public updateEggGachaIcon(scene: BattleScene): void {
    const currentPhase = scene.getCurrentPhase();
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase || currentPhase instanceof SelectModifierPhase)) {
      this.eggGachaContainer.setAlpha(0);
      const eggGachaContainer = document.getElementById("apadEggGacha");
      if (eggGachaContainer) {
        eggGachaContainer.dataset.activeState = "false";
      }
      return;
    }
    this.eggGachaContainer.setAlpha(1);
    
    const eggGachaContainer = document.getElementById("apadEggGacha");
    if (eggGachaContainer) {
      eggGachaContainer.dataset.activeState = "true";
    }
  }

  public updateBattlePathIcon(scene: BattleScene): void {
    const currentPhase = scene.getCurrentPhase();
    
    const isChaosMode = scene.gameMode?.isChaosMode;
    const currentWave = scene.currentBattle?.waveIndex || 0;
    const isValidPhase = currentPhase instanceof CommandPhase || currentPhase instanceof SelectModifierPhase;
    const battlePathButtonWidth = this.battlePathContainer.displayWidth * this.battlePathContainer.scale;
    
    if (!isChaosMode || currentWave < 1 || !isValidPhase) {
      if(this.battlePathContainer.alpha === 1) {
        this.permaMoneyText.setX(this.permaMoneyText.x + battlePathButtonWidth + 8);
      }
      this.battlePathContainer.setAlpha(0);
      const battlePathContainer = document.getElementById("apadBattlePath");
      if (battlePathContainer) {
        battlePathContainer.dataset.activeState = "false";
      }
      
      return;
    }
    
    if (this.battlePathContainer.alpha === 0) {
      this.permaMoneyText.setX(this.permaMoneyText.x - battlePathButtonWidth - 8);

    }
    this.battlePathContainer.setAlpha(1);

    
    const battlePathContainer = document.getElementById("apadBattlePath");
    if (battlePathContainer) {
      battlePathContainer.dataset.activeState = "true";
    }
  }
  
  public updatePermaMoneyText(scene:BattleScene): void {
    if (this.permaMoneyText) {
      this.permaMoneyText.destroy();
    }

    this.permaMoneyText = addTextObject(scene, 0, 0, "", TextStyle.PERFECT_IV, { fontSize: "86px" });
    this.permaMoneyText.setOrigin(1, 0);
    this.permaMoneyText.setScale(0.1);

    const formattedMoney = Utils.formatMoney(scene.moneyFormat, scene.gameData?.permaMoney || 0);
    const text = i18next.t("battleScene:permaMoneyOwned", { formattedMoney });
    
    this.permaMoneyText.setText(text);
    this.permaMoneyText.setVisible(true);

    const rightEdge = scene.game.canvas.width / 6;
    const topEdge = -scene.game.canvas.height / 6;
    const padding = 5;

    const saveButtonWidth = this.saveContainer.displayWidth * this.saveContainer.scale;
    const voidexButtonWidth = this.voidexContainer.displayWidth * this.voidexContainer.scale;
    const eggGachaButtonWidth = this.eggGachaContainer.displayWidth * this.eggGachaContainer.scale;
    const saveContainerXOffset = 5;
    const voidexContainerXOffset = 10;
    const eggGachaContainerXOffset = 19;
    const battlePathContainerXOffset = 28;
    const containerYOffset = 5;
    const permaMoneyTextYOffset = 1;

    let battlePathButtonWidth = 0;
    this.battlePathContainer.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - eggGachaButtonWidth - padding - battlePathContainerXOffset, topEdge + containerYOffset);
    this.battlePathContainer.setAlpha(0);
    const permaMoneyTextXOffset = 24;

    this.saveContainer.setPosition(rightEdge - saveContainerXOffset, topEdge + containerYOffset);
    this.voidexContainer.setPosition(rightEdge - saveButtonWidth - padding - voidexContainerXOffset, topEdge + containerYOffset);
    this.eggGachaContainer.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - padding - eggGachaContainerXOffset, topEdge + containerYOffset);

    this.permaMoneyText.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - eggGachaButtonWidth - padding - permaMoneyTextXOffset, topEdge + permaMoneyTextYOffset);
    this.permaMoneyContainer.add(this.permaMoneyText);

    if (!this.permaMoneyContainer.parentContainer) {
      scene.add.existing(this.permaMoneyContainer);
    }

    this.permaMoneyContainer.setVisible(true);
    this.permaMoneyContainer.setPosition(0, 0);
    this.permaMoneyContainer.setDepth(1000);
  }

  private setupSaveExclamation(): void {
    if (this.saveExclamationWindow) {
      this.saveExclamationWindow.destroy();
    }

    this.scene.time.addEvent({
      delay: 0,
      callback: () => {
        const relativeX = this.saveContainer.x - this.saveContainer.width / 6 - 2.75;
        const relativeY = this.saveContainer.y - this.saveContainer.height / 6 - 0.75;

        this.saveExclamationWindow = this.scene.add.container(relativeX, relativeY);
        this.saveExclamationWindow.setName("save-exclamation");

        const exclamationSprite = this.scene.add.sprite(0, 0, 'smitems_32', 'exclamationMark');
        exclamationSprite.setScale(0.15);
        exclamationSprite.setOrigin(0.5, 0.5);

        this.saveExclamationWindow.add(exclamationSprite);
        this.permaMoneyContainer.add(this.saveExclamationWindow);

        this.scene.tweens.add({
          targets: this.saveExclamationWindow,
          y: relativeY + .5,
          duration: 2500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      },
      callbackScope: this
    });
  }
}
