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
import { TextStyle, addTextObject, addBBCodeTextObject } from "./text";
import AchvBar from "./achv-bar";
import MenuUiHandler from "./menu-ui-handler";
import AchvsUiHandler from "./achvs-ui-handler";
import OptionSelectUiHandler from "./settings/option-select-ui-handler";
import EggHatchSceneHandler from "./egg-hatch-scene-handler";
import EggListUiHandler from "./egg-list-ui-handler";
import EggGachaUiHandler from "./egg-gacha-ui-handler";
import {addWindow, WindowVariant} from "./ui-theme";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";
import { StatAnimTweakUtils } from "../field/stat-anim-layout";
import BattleInfo from "./battle-info";
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
import Overrides, { DEBUG_YU_VISUAL_TUNING } from "#app/overrides";
import i18next from "i18next";
import GamepadBindingUiHandler from "./settings/gamepad-binding-ui-handler";
import SettingsKeyboardUiHandler from "#app/ui/settings/settings-keyboard-ui-handler";
import KeyboardBindingUiHandler from "#app/ui/settings/keyboard-binding-ui-handler";
import SettingsDisplayUiHandler from "./settings/settings-display-ui-handler";
import SettingsAudioUiHandler from "./settings/settings-audio-ui-handler";
import { SettingKeys } from "#app/system/settings/settings";
import { PlayerGender } from "#enums/player-gender";
import BgmBar from "#app/ui/bgm-bar";
import RenameFormUiHandler from "./rename-form-ui-handler";
import RunHistoryUiHandler from "./run-history-ui-handler";
import RunInfoUiHandler from "./run-info-ui-handler";
import RunEndSummaryUiHandler from "./run-end-summary-ui-handler";
import TestDialogueUiHandler from "#app/ui/test-dialogue-ui-handler";
import AutoCompleteUiHandler from "./autocomplete-ui-handler";
import { GameObjects } from 'phaser';
import {PermaModifiers} from "#app/modifier/perma-modifiers";
import {ModifierBar, PermaCollectedTypeModifier, SkillTreeTokenTrackerModifier} from "#app/modifier/modifier";
import { Type } from "#app/data/type";
import { ModifierTooltipUtils, ModifierTooltipData } from "./modifier-tooltip-utils";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
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
import BugReportFormUiHandler from "./bug-report-form-ui-handler";
import BackupRestoreFormUiHandler from "./backup-restore-form-ui-handler";
import EggStarterUiHandler from "./egg-starter-ui-handler.js";
import ModGlitchFormUiHandler from "./mod-glitch-form-ui-handler";
import ModGlitchCreateFormUiHandler from "./mod-glitch-create-form-ui-handler";
import SlideshowCutsceneUiHandler from "./slideshow-cutscene-ui-handler";
import ModManagementUiHandler from "./mod-management-ui-handler";
import PokedexModalUiHandler from "./pokedex-modal-ui-handler";
import VoidexPrelistUiHandler from "./voidex-prelist-ui-handler";
import SkillTreeUiHandler from "./skill-tree-ui-handler";
import BattlePathUiHandler from "./battle-path-ui-handler";
import RankUpUiHandler from "./rank-up-ui-handler";
import { LoginPhase } from "#app/phases/login-phase.js";
import ChampionSelectUiHandler from "#app/ui/champion-select-ui-handler";
import CharacterSelectUiHandler from "#app/ui/character-select-ui-handler";
import ChampionLevelUpUiHandler from "#app/ui/champion-level-up-ui-handler";
import SmitomTipUiHandler from "./smitom-tip-ui-handler";
import PokemonBattleTooltipUiHandler from "./pokemon-battle-tooltip-ui-handler";
import ReplayViewerUiHandler from "./replay-viewer-ui-handler";
import { Mode } from "./mode";
export { Mode } from "./mode";

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
  Mode.MESSAGE,
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
  Mode.VOIDEX_PRELIST,
  Mode.BATTLE_PATH,
  Mode.CHARACTER_SELECT,
  Mode.CHAMPION_SELECT,
  Mode.SKILL_TREE,
  Mode.BUG_REPORT_FORM,
  Mode.RANK_UP,
  Mode.SMITOM_TIP,
  Mode.LOOT_REWARD_SELECT,
  Mode.POKEMON_BATTLE_TOOLTIP,
  Mode.REPLAY_VIEWER,
  Mode.IMPORT_REPLAY_FORM,
  Mode.EGG_LIST,
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
  private _tooltipPattern?: ModalBackgroundHandle;

  private overlayActive: boolean;

  private readonly UI_CONSTANTS = {
    TOP_EDGE_OFFSET: -1,
    LEFT_PADDING: 5,
    TOP_PADDING: 5,
    TOGGLE_BUTTON_ICON_SCALE: 0.16,
    TOGGLE_BUTTON_ICON_SIZE: 32,
    TOGGLE_BUTTON_TEXT_SIZE: 30,
    TOGGLE_BUTTON_TEXT_Y_OFFSET: 5,
    TOGGLE_BUTTON_WIDTH: 25,
    TOGGLE_BUTTON_HORIZONTAL_SPACING: 11,
    TOGGLE_ROW_HEIGHT: 10,
    BAR_X_OFFSET_ADJUSTMENT: -10,
    PERMA_COLLECTED_TYPE_SPACING: 5,
    SKILL_TREE_ROW_Y_OFFSET: 9,
    SKILL_TREE_BAR_SCALE: 0.3,
    SKILL_TREE_ICON_Y: 12,
    SKILL_TREE_SMITEM_ICON_SCALE: 0.5,
    SKILL_TREE_STACK_TEXT_X: 10,
    SKILL_TREE_STACK_TEXT_Y: 15,

    SKILL_TREE_POINTS_TEXT_COLOR: "#f8f8f8",
    SKILL_TREE_POINTS_TEXT_SHADOW: "#424242",
    SKILL_TREE_POINTS_TEXT_STROKE: 4.5,

    SKILL_TREE_TOKEN_TEXT_SIZE: "11px",
    SKILL_TREE_TOKEN_TEXT_COLOR: "#ffd700",
    SKILL_TREE_TOKEN_TEXT_STROKE_COLOR: "#222222",
    SKILL_TREE_TOKEN_TEXT_STROKE: 4,
    SKILL_TREE_TOKEN_TEXT_SCALE: 0.35,
    SKILL_TREE_ROW_INDENT: 2,
    SKILL_TREE_POINTS_GAP: 2,
    SKILL_TREE_POINTS_TEXT_SIZE: 27,

    SKILL_TREE_POINTS_ICON_SCALE: 0.22,

    SKILL_TREE_POINTS_TEXT_X_OFFSET: 3,
    SKILL_TREE_POINTS_TEXT_Y_OFFSET: 0,

    SKILL_TREE_POINTS_ENTRY_Y_OFFSET: 1,
  };

  private permaMoneyContainer: Phaser.GameObjects.Container;
  protected permaMoneyText: Phaser.GameObjects.Text;
  private permaMoneyHoverZone: Phaser.GameObjects.Zone;
  public permaModifierBar: ModifierBar;
  private saveButton: Phaser.GameObjects.Sprite;
  private saveContainer: Phaser.GameObjects.Container;
  private saveExclamationWindow: Phaser.GameObjects.Container;
  private voidexButton: Phaser.GameObjects.Sprite;
  private voidexContainer: Phaser.GameObjects.Container;
  private eggGachaButton: Phaser.GameObjects.Sprite;
  private eggGachaKeySprite: Phaser.GameObjects.Sprite;
  private eggGachaContainer: Phaser.GameObjects.Container;
  private eggHatchHudText: Phaser.GameObjects.Text;
  private battlePathButton: Phaser.GameObjects.Sprite;
  private battlePathContainer: Phaser.GameObjects.Container;
  private runInfoButton: Phaser.GameObjects.Sprite;
  private runInfoContainer: Phaser.GameObjects.Container;
  private replayButton: Phaser.GameObjects.Sprite;

  private permaBarToggleButton: Phaser.GameObjects.Sprite;
  private permaBarToggleContainer: Phaser.GameObjects.Container;
  private permaBarSubtext: Phaser.GameObjects.Text;
  public permaBarVisible: boolean = true;

  private playerBarToggleButton: Phaser.GameObjects.Sprite;
  private playerBarToggleContainer: Phaser.GameObjects.Container;
  private playerBarSubtext: Phaser.GameObjects.Text;
  public playerBarVisible: boolean = false;

  private foeBarToggleButton: Phaser.GameObjects.Sprite;
  private foeBarToggleContainer: Phaser.GameObjects.Container;
  private foeBarSubtext: Phaser.GameObjects.Text;
  public foeBarVisible: boolean = false;
  private lastKnownBattleState: boolean = false;
  private permaCollectedTypeContainer: Phaser.GameObjects.Container;
  private permaCollectedTypeIcon: Phaser.GameObjects.Sprite;
  private permaCollectedTypeTooltipContainer: Phaser.GameObjects.Container | null = null;

  private skillTreeTokenContainer: Phaser.GameObjects.Container;

  private skillTreeTokenEntry: Phaser.GameObjects.Container;
  private skillTreeTokenIcon: Phaser.GameObjects.Sprite;
  private skillTreePointsIcon: Phaser.GameObjects.Sprite;
  private skillTreePointsText: Phaser.GameObjects.Text;
  private skillTreeTokenText: Phaser.GameObjects.Text;

  private _replayHudSuppressed = false;

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
    this.handlers[Mode.COLLECTED_TYPE_SELECT] = null as any;
    import("./collected-type-shop-ui-handler").then(m => {
      const handler = new m.CollectedTypeShopUiHandler(scene);
      if ((this as any)._setupDone) handler.setup();
      this.handlers[Mode.COLLECTED_TYPE_SELECT] = handler;
    });
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
    this.handlers[Mode.RUN_END_SUMMARY] = new RunEndSummaryUiHandler(scene, Mode.RUN_END_SUMMARY);
    this.handlers[Mode.TEST_DIALOGUE] = new TestDialogueUiHandler(scene, Mode.TEST_DIALOGUE);
    this.handlers[Mode.AUTO_COMPLETE] = new AutoCompleteUiHandler(scene);
    this.handlers[Mode.SHOP_SELECT] = null as any;
    import("./perma-shop-ui-handler").then(m => {
      const handler = new m.default(scene);
      if ((this as any)._setupDone) handler.setup();
      this.handlers[Mode.SHOP_SELECT] = handler;
    });
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
    this.handlers[Mode.VOIDEX_PRELIST] = new VoidexPrelistUiHandler(scene);
    this.handlers[Mode.BATTLE_PATH] = new BattlePathUiHandler(scene);
    this.handlers[Mode.RANK_UP] = new RankUpUiHandler(scene);

    this.handlers[Mode.CHARACTER_SELECT] = new CharacterSelectUiHandler(scene);
    this.handlers[Mode.CHAMPION_SELECT] = new ChampionSelectUiHandler(scene);
    this.handlers[Mode.SKILL_TREE] = new SkillTreeUiHandler(scene);
    this.handlers[Mode.CHAMPION_LEVEL_UP] = new ChampionLevelUpUiHandler(scene);
    this.handlers[Mode.BUG_REPORT_FORM] = new BugReportFormUiHandler(scene);
    this.handlers[Mode.BACKUP_RESTORE_FORM] = new BackupRestoreFormUiHandler(scene);
    this.handlers[Mode.SLIDESHOW_CUTSCENE] = new SlideshowCutsceneUiHandler(scene);
    this.handlers[Mode.SMITOM_TIP] = new SmitomTipUiHandler(scene, Mode.SMITOM_TIP);
    this.handlers[Mode.LOOT_REWARD_SELECT] = null as any;
    import("./loot-reward-select-ui-handler").then(m => {
      const handler = new m.default(scene);
      if ((this as any)._setupDone) handler.setup();
      this.handlers[Mode.LOOT_REWARD_SELECT] = handler;
    });
    this.handlers[Mode.POKEMON_BATTLE_TOOLTIP] = new PokemonBattleTooltipUiHandler(scene);
    this.handlers[Mode.REPLAY_VIEWER] = new ReplayViewerUiHandler(scene);

    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
      import("./import-data-form-ui-handler").then(module => {
        try {
          const handler = new module.default(scene);
          this.handlers[Mode.IMPORT_DATA_FORM] = handler;
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
    this.saveButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      this.handleSaveButtonClick(this.scene as BattleScene);
    });
    this.saveButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipSave"), subtitle: "", body: i18next.t("battleScene:tooltipSaveDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.saveButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.saveButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

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

    this.voidexButton = this.scene.add.sprite(0, 0, "smitems", "modPassiveAbility");
    this.voidexButton.setName("voidex-button");
    this.voidexButton.setScale(0.14);
    this.voidexButton.setAlpha(1);
    this.voidexButton.setInteractive({ useHandCursor: true });
    this.voidexButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      scene.ui.handleVoidexButtonClick(scene);
    });
    this.voidexButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipVoidex"), subtitle: "", body: i18next.t("battleScene:tooltipVoidexDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.voidexButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.voidexButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });
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
    this.eggGachaButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      scene.ui.setOverlayMode(Mode.EGG_GACHA);
    });
    this.eggGachaButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const battleScene = scene as BattleScene;
      const eggs = battleScene.gameData?.eggs;
      let lore: string | undefined;
      if (eggs && eggs.length > 0) {
        const nearestEgg = eggs.reduce((a, b) => a.hatchWaves <= b.hatchWaves ? a : b);
        lore = i18next.t("battleScene:tooltipEggGachaHatchHint", {
          count: nearestEgg.hatchWaves,
          tier: nearestEgg.getEggDescriptor(),
        });
      }
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipEggGacha"), subtitle: "", body: i18next.t("battleScene:tooltipEggGachaDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false, lore };
      const wm = this.eggGachaButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(battleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.eggGachaButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

    const eggGachaIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_ABILITY");
    const eggGachaType = scene.inputController?.getLastSourceType() || "keyboard";
    this.eggGachaKeySprite = this.scene.add.sprite(2, 2, eggGachaType);
    if (eggGachaIcon) {
      this.eggGachaKeySprite.setFrame(eggGachaIcon);
    }
    this.eggGachaKeySprite.setScale(.4);

    this.eggGachaContainer = this.scene.add.container(0, 0);
    this.eggGachaContainer.setName("egg-gacha-container");
    this.eggGachaContainer.add([this.eggGachaButton, this.eggGachaKeySprite]);
    this.permaMoneyContainer.add(this.eggGachaContainer);

    this.eggHatchHudText = addTextObject(this.scene, 0, 0, "", TextStyle.PARTY, { fontSize: "11px", color: "#ffd700" });
    this.eggHatchHudText.setShadow(0, 0, undefined);
    this.eggHatchHudText.setStroke("#222222", 4);
    this.eggHatchHudText.setOrigin(1, 0.5);
    this.eggHatchHudText.setScale(0.35);
    this.eggHatchHudText.setVisible(false);
    this.eggGachaContainer.add(this.eggHatchHudText);

    this.battlePathButton = this.scene.add.sprite(0, 0, "items", "map");
    this.battlePathButton.setName("battle-path-button");
    this.battlePathButton.setScale(0.3);
    this.battlePathButton.setAlpha(1);
    this.battlePathButton.setInteractive({ useHandCursor: true });
    this.battlePathButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      if (scene.gameMode?.isChaosMode) {
        scene.ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
      }
    });
    this.battlePathButton.on("pointerover", () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipMap"), subtitle: "", body: i18next.t("battleScene:tooltipMapDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.battlePathButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as any, data, { x: wm.tx, y: wm.ty });
    });
    this.battlePathButton.on("pointerout", () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as any); });

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

    this.runInfoButton = this.scene.add.sprite(0, 0, "smitems", "permaRunAnything");
    this.runInfoButton.setName("run-info-button");
    this.runInfoButton.setScale(0.15);
    this.runInfoButton.setAlpha(1);
    this.runInfoButton.setInteractive({ useHandCursor: true });
    this.runInfoButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const currentMode = scene.ui?.getMode();
      if (currentMode === Mode.COMMAND || currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.LOOT_REWARD_SELECT || currentMode === Mode.COLLECTED_TYPE_SELECT) {
        if (scene.sessionSlotId < 0) {
          return;
        }
        const sessionData = scene.gameData.getSessionSaveData(scene as BattleScene);
        const activeRunEntry = {
          entry: sessionData,
          isVictory: false,
          isFavorite: false,
          isActive: true
        };
        scene.ui.setOverlayMode(Mode.RUN_INFO, activeRunEntry, true);
      }
      if (currentMode === Mode.TITLE) {
        scene.ui.setOverlayMode(Mode.RUN_HISTORY);
      }
    });
    this.runInfoButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipRunInfo"), subtitle: "", body: i18next.t("battleScene:tooltipRunInfoDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.runInfoButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.runInfoButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

    const runInfoIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_SHINY");
    const runInfoType = scene.inputController?.getLastSourceType() || "keyboard";
    const runInfoKeySprite = this.scene.add.sprite(2, 2, runInfoType);
    if (runInfoIcon) {
      runInfoKeySprite.setFrame(runInfoIcon);
    }
    runInfoKeySprite.setScale(.4);

    this.runInfoContainer = this.scene.add.container(0, 0);
    this.runInfoContainer.setName("run-info-container");
    this.runInfoContainer.add([this.runInfoButton, runInfoKeySprite]);
    this.permaMoneyContainer.add(this.runInfoContainer);

    this.permaBarToggleButton = this.scene.add.sprite(0, 0, "smitems", "permaGlitchPieceMaxPlus");
    this.permaBarToggleButton.setName("perma-bar-toggle-button");
    this.permaBarToggleButton.setScale(this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE);
    this.permaBarToggleButton.setAlpha(1);
    this.permaBarToggleButton.setInteractive({ useHandCursor: true });
    this.permaBarToggleButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      this.handlePermaBarToggle(scene as BattleScene);
    });
    this.permaBarToggleButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipPermaBar"), subtitle: "", body: i18next.t("battleScene:tooltipPermaBarDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.permaBarToggleButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.permaBarToggleButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

    let permaBarToggleIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_TOGGLE_PERMA_BAR");
    if (!permaBarToggleIcon) {
      permaBarToggleIcon = "O.png";
    }
    const permaBarToggleType = scene.inputController?.getLastSourceType() || "keyboard";
    const permaBarToggleKeySprite = this.scene.add.sprite(2, 2, permaBarToggleType);
    permaBarToggleKeySprite.setFrame(permaBarToggleIcon);
    permaBarToggleKeySprite.setScale(.4);

    this.permaBarSubtext = addTextObject(this.scene, -3, this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_Y_OFFSET, i18next.t("battleScene:togglePermaBar"), TextStyle.PERFECT_IV, { fontSize: `${this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_SIZE}px` });
    this.permaBarSubtext.setOrigin(0, 0);
    this.permaBarSubtext.setShadow(0, 0, "#000000", 0);
    this.permaBarSubtext.setVisible(true);

    this.permaBarToggleContainer = this.scene.add.container(0, 0);
    this.permaBarToggleContainer.setName("perma-bar-toggle-container");
    this.permaBarToggleContainer.add([this.permaBarToggleButton, permaBarToggleKeySprite, this.permaBarSubtext]);
    this.permaMoneyContainer.add(this.permaBarToggleContainer);

    this.playerBarToggleButton = this.scene.add.sprite(0, 0, "smitems", "permaStartBall");
    this.playerBarToggleButton.setName("player-bar-toggle-button");
    this.playerBarToggleButton.setScale(this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE);
    this.playerBarToggleButton.setAlpha(1);
    this.playerBarToggleButton.setInteractive({ useHandCursor: true });
    this.playerBarToggleButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      this.handlePlayerBarToggle(scene as BattleScene);
    });
    this.playerBarToggleButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipPlayerBar"), subtitle: "", body: i18next.t("battleScene:tooltipPlayerBarDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.playerBarToggleButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.playerBarToggleButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

    let playerBarToggleIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_TOGGLE_PLAYER_BAR");
    if (!playerBarToggleIcon) {
      playerBarToggleIcon = "B.png";
    }
    const playerBarToggleType = scene.inputController?.getLastSourceType() || "keyboard";
    const playerBarToggleKeySprite = this.scene.add.sprite(2, 2, playerBarToggleType);
    playerBarToggleKeySprite.setFrame(playerBarToggleIcon);
    playerBarToggleKeySprite.setScale(.4);

    this.playerBarSubtext = addTextObject(this.scene, -3, this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_Y_OFFSET, i18next.t("battleScene:togglePlayerBar"), TextStyle.PERFECT_IV, { fontSize: `${this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_SIZE}px` });
    this.playerBarSubtext.setOrigin(0, 0);
    this.playerBarSubtext.setShadow(0, 0, "#000000", 0);
    this.playerBarSubtext.setVisible(false);

    this.playerBarToggleContainer = this.scene.add.container(0, 0);
    this.playerBarToggleContainer.setName("player-bar-toggle-container");
    this.playerBarToggleContainer.add([this.playerBarToggleButton, playerBarToggleKeySprite, this.playerBarSubtext]);
    this.permaMoneyContainer.add(this.playerBarToggleContainer);

    this.foeBarToggleButton = this.scene.add.sprite(0, 0, "smitems", "smittyMask");
    this.foeBarToggleButton.setName("foe-bar-toggle-button");
    this.foeBarToggleButton.setScale(this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE);
    this.foeBarToggleButton.setAlpha(1);
    this.foeBarToggleButton.setInteractive({ useHandCursor: true });
    this.foeBarToggleButton.on('pointerdown', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      this.handleFoeBarToggle(scene as BattleScene);
    });
    this.foeBarToggleButton.on('pointerover', () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipFoeBar"), subtitle: "", body: i18next.t("battleScene:tooltipFoeBarDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
      const wm = this.foeBarToggleButton.getWorldTransformMatrix();
      ModifierTooltipUtils.show(scene as BattleScene, data, { x: wm.tx, y: wm.ty });
    });
    this.foeBarToggleButton.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene as BattleScene); });

    let foeBarToggleIcon = scene.inputController?.getIconForLatestInputRecorded("BUTTON_TOGGLE_FOE_BAR");
    if (!foeBarToggleIcon) {
      foeBarToggleIcon = "I.png";
    }
    const foeBarToggleType = scene.inputController?.getLastSourceType() || "keyboard";
    const foeBarToggleKeySprite = this.scene.add.sprite(2, 2, foeBarToggleType);
    foeBarToggleKeySprite.setFrame(foeBarToggleIcon);
    foeBarToggleKeySprite.setScale(.4);

    this.foeBarSubtext = addTextObject(this.scene, -3, this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_Y_OFFSET, i18next.t("battleScene:toggleFoeBar"), TextStyle.PERFECT_IV, { fontSize: `${this.UI_CONSTANTS.TOGGLE_BUTTON_TEXT_SIZE}px` });
    this.foeBarSubtext.setOrigin(0, 0);
    this.foeBarSubtext.setShadow(0, 0, "#000000", 0);
    this.foeBarSubtext.setVisible(false);

    this.foeBarToggleContainer = this.scene.add.container(0, 0);
    this.foeBarToggleContainer.setName("foe-bar-toggle-container");
    this.foeBarToggleContainer.add([this.foeBarToggleButton, foeBarToggleKeySprite, this.foeBarSubtext]);
    this.permaMoneyContainer.add(this.foeBarToggleContainer);

    this.permaCollectedTypeIcon = this.scene.add.sprite(0, 0, "smitems", "modSoulCollected");
    this.permaCollectedTypeIcon.setName("perma-collected-type-icon");
    this.permaCollectedTypeIcon.setScale(this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE);
    this.permaCollectedTypeIcon.setAlpha(1);
    this.permaCollectedTypeIcon.setInteractive({ useHandCursor: true });
    this.permaCollectedTypeIcon.on('pointerover', () => { if (!(this.scene as BattleScene).uiEditModeActive) this.showPermaCollectedTypeTooltip(scene as BattleScene); });
    this.permaCollectedTypeIcon.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) this.hidePermaCollectedTypeTooltip(); });

    this.permaCollectedTypeContainer = this.scene.add.container(0, 0);
    this.permaCollectedTypeContainer.setName("perma-collected-type-container");
    this.permaCollectedTypeContainer.add([this.permaCollectedTypeIcon]);
    this.permaCollectedTypeContainer.setVisible(false);
    this.permaMoneyContainer.add(this.permaCollectedTypeContainer);
    const barScale = this.UI_CONSTANTS.SKILL_TREE_BAR_SCALE;
    const skillTreeRowCenterY = this.UI_CONSTANTS.SKILL_TREE_ICON_Y * barScale;

    this.skillTreeTokenIcon = this.scene.add.sprite(0, this.UI_CONSTANTS.SKILL_TREE_ICON_Y, "smitems", "permaMoreRevive");
    this.skillTreeTokenIcon.setName("skill-tree-token-icon");
    this.skillTreeTokenIcon.setScale(this.UI_CONSTANTS.SKILL_TREE_SMITEM_ICON_SCALE);
    this.skillTreeTokenIcon.setOrigin(0, 0.5);

    this.skillTreeTokenEntry = this.scene.add.container(0, 0);
    this.skillTreeTokenEntry.setName("skill-tree-token-entry");
    this.skillTreeTokenEntry.setScale(barScale);
    this.skillTreeTokenEntry.add(this.skillTreeTokenIcon);
    this.skillTreeTokenText = addTextObject(this.scene, 0, 0, "", TextStyle.PARTY, {
      fontSize: this.UI_CONSTANTS.SKILL_TREE_TOKEN_TEXT_SIZE,
      color: this.UI_CONSTANTS.SKILL_TREE_TOKEN_TEXT_COLOR,
    });
    this.skillTreeTokenText.setName("skill-tree-token-text");
    this.skillTreeTokenText.setShadow(0, 0, undefined);
    this.skillTreeTokenText.setStroke(this.UI_CONSTANTS.SKILL_TREE_TOKEN_TEXT_STROKE_COLOR, this.UI_CONSTANTS.SKILL_TREE_TOKEN_TEXT_STROKE);
    this.skillTreeTokenText.setOrigin(0, 0);
    this.skillTreeTokenText.setScale(this.UI_CONSTANTS.SKILL_TREE_TOKEN_TEXT_SCALE);
    this.skillTreeTokenText.setPosition(
      this.UI_CONSTANTS.SKILL_TREE_STACK_TEXT_X * barScale,
      this.UI_CONSTANTS.SKILL_TREE_STACK_TEXT_Y * barScale
    );
    this.skillTreePointsIcon = this.scene.add.sprite(0, skillTreeRowCenterY + this.UI_CONSTANTS.SKILL_TREE_POINTS_ENTRY_Y_OFFSET, "items", "ribbon_gen9");
    this.skillTreePointsIcon.setName("skill-tree-points-icon");
    this.skillTreePointsIcon.setOrigin(0, 0.5);
    this.skillTreePointsIcon.setScale(this.UI_CONSTANTS.SKILL_TREE_POINTS_ICON_SCALE);

    this.skillTreePointsText = addTextObject(this.scene, 5, skillTreeRowCenterY, "", TextStyle.PARTY, { fontSize: `${this.UI_CONSTANTS.SKILL_TREE_POINTS_TEXT_SIZE}px` });
    this.skillTreePointsText.setName("skill-tree-points-text");
    this.skillTreePointsText.setOrigin(0, 1);
    this.skillTreePointsText.setColor(this.UI_CONSTANTS.SKILL_TREE_POINTS_TEXT_COLOR);
    this.skillTreePointsText.setStroke(this.UI_CONSTANTS.SKILL_TREE_POINTS_TEXT_SHADOW, this.UI_CONSTANTS.SKILL_TREE_POINTS_TEXT_STROKE);
    this.skillTreePointsText.setShadow(0, 0, this.UI_CONSTANTS.SKILL_TREE_POINTS_TEXT_SHADOW);

    this.skillTreeTokenContainer = this.scene.add.container(0, 0);
    this.skillTreeTokenContainer.setName("skill-tree-token-container");
    this.skillTreeTokenContainer.add([this.skillTreeTokenEntry, this.skillTreeTokenText, this.skillTreePointsIcon, this.skillTreePointsText]);
    this.skillTreeTokenContainer.setVisible(false);
    this.permaMoneyContainer.add(this.skillTreeTokenContainer);

    this.setupSkillTreeIconTooltip(scene as BattleScene, this.skillTreeTokenIcon, "token");
    this.setupSkillTreeIconTooltip(scene as BattleScene, this.skillTreePointsIcon, "points");

    this.permaModifierBar = new ModifierBar(scene as BattleScene);
    const barXOffset = this.getBarXOffset();
    const topEdge = this.getTopEdge(scene as BattleScene);
    this.permaModifierBar.setPosition(barXOffset, topEdge + this.UI_CONSTANTS.TOP_PADDING);
    this.permaModifierBar.setName("perma-modifier-bar");
    this.add(this.permaModifierBar);

    const initialBarXOffset = this.getBarXOffsetRightOfToggles(scene as BattleScene);
    const initialBarYPosition = topEdge + this.UI_CONSTANTS.TOP_PADDING - 3;
    this.permaModifierBar.setPosition(initialBarXOffset, initialBarYPosition);
    this.permaModifierBar.setVisible(true);
    this.updateToggleButtonVisuals();
  }

  private getTopEdge(scene: BattleScene): number {
    return scene.getUiTopEdgeY(this.UI_CONSTANTS.TOP_EDGE_OFFSET);
  }

  private getIconHeight(): number {
    return this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SIZE * this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE;
  }

  private getPermaBarToggleIconCenterY(): number {
    return this.permaBarToggleContainer.y + this.permaBarToggleButton.y;
  }

  private getPlayerBarToggleIconCenterY(): number {
    return this.playerBarToggleContainer.y + this.playerBarToggleButton.y;
  }

  private getBarXOffset(): number {
    return this.UI_CONSTANTS.LEFT_PADDING + this.UI_CONSTANTS.TOGGLE_BUTTON_WIDTH + this.UI_CONSTANTS.BAR_X_OFFSET_ADJUSTMENT;
  }
  private layoutModifierBars(scene: BattleScene): void {
    const barXOffset = this.getBarXOffsetRightOfToggles(scene);
    const barYPosition = this.getTopEdge(scene) + this.UI_CONSTANTS.TOP_PADDING - 3;
    this.permaModifierBar?.setPosition(barXOffset, barYPosition);

    scene.getModifierBar()?.setPosition(barXOffset, (scene.game.canvas.height / 6) + barYPosition);
  }

  private getBarXOffsetRightOfToggles(scene: BattleScene): number {
    const leftPadding = this.UI_CONSTANTS.LEFT_PADDING;
    const permaCollectedTypeWidth = this.permaCollectedTypeContainer.visible ?
        (this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SIZE * this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE) + this.UI_CONSTANTS.PERMA_COLLECTED_TYPE_SPACING : 0;

    const isInBattle = scene.currentBattle !== null && scene.currentBattle !== undefined;
    const numToggles = isInBattle ? 3 : 1;

    const togglesWidth = numToggles * this.UI_CONSTANTS.TOGGLE_BUTTON_HORIZONTAL_SPACING;
    const barSpacing = -2;

    return leftPadding + permaCollectedTypeWidth + togglesWidth + barSpacing;
  }

  public async handleSaveButtonClick(scene: BattleScene): Promise<void> {
    const currentPhase = scene.getCurrentPhase();
    const isLoginPhase = currentPhase instanceof LoginPhase;
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase || isLoginPhase)) {
      return;
    }

    if (currentPhase instanceof CommandPhase && this.mode !== Mode.COMMAND) {
      await this.setMode(Mode.COMMAND, (currentPhase as CommandPhase).getFieldIndex());
    }

    const exportSuccess = await scene.gameData.tryExportData(GameDataType.COMBINED);
    if (exportSuccess && !isLoginPhase && scene.gameData.isSaveRewardTime()) {
      scene.unshiftPhase(new ModifierRewardPhase(
          scene, null, true,
          () => {
            scene.gameData.localSaveAll(scene);
            scene.gameData.updateSaveRewardTime();
            if (currentPhase instanceof TitlePhase) {
              scene.unshiftPhase(new TitlePhase(scene, false, true));
            } else {
              scene.unshiftPhase(currentPhase);
            }
          }
      ));
      scene.shiftPhase();
    }
  }

  public handleVoidexButtonClick(scene: BattleScene): void {
    const mode = scene.ui.getMode();
    if (mode === Mode.VOIDEX_PRELIST || mode === Mode.POKEDEX) {
      scene.ui.processInput(Button.VOIDEX);
      return;
    }
    scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
  }

  public handlePermaBarToggle(scene: BattleScene): void {
    if (this._replayHudSuppressed) return;
    this.permaBarVisible = !this.permaBarVisible;
    scene.showPermaBar = this.permaBarVisible;
    scene.gameData.saveSetting(SettingKeys.Show_Perma_Bar, this.permaBarVisible ? 1 : 0);

    this.layoutModifierBars(scene);

    if (this.permaBarVisible) {
      this.playerBarVisible = false;
      this.permaModifierBar.setVisible(true);
      scene.getModifierBar().setVisible(false);
    } else {
      this.permaModifierBar.setVisible(false);
    }

    this.updateToggleButtonVisuals();
  }

  public applyPermaBarVisibility(): void {
    const scene = this.scene as BattleScene;
    this.permaBarVisible = scene.showPermaBar;
    if (this.permaModifierBar) {
      this.permaModifierBar.setVisible(this.permaBarVisible);
    }
    this.layoutModifierBars(scene);
    if (this.permaBarVisible && this.permaModifierBar) {
      scene.getModifierBar()?.setVisible(false);
      scene.getModifierBar(true)?.setVisible(false);
    }
    this.updateToggleButtonVisuals();
  }

  public handlePlayerBarToggle(scene: BattleScene): void {
    if (this._replayHudSuppressed) return;
    this.playerBarVisible = !this.playerBarVisible;

    this.layoutModifierBars(scene);

    if (this.playerBarVisible) {
      this.permaBarVisible = false;
      scene.getModifierBar().setVisible(true);
      this.permaModifierBar.setVisible(false);
    } else {
      scene.getModifierBar().setVisible(false);
    }

    this.updateToggleButtonVisuals();
  }

  public handleFoeBarToggle(scene: BattleScene): void {
    if (this._replayHudSuppressed) return;
    this.foeBarVisible = !this.foeBarVisible;

    scene.getModifierBar(true).setVisible(this.foeBarVisible);

    this.updateToggleButtonVisuals();
  }

  private updateToggleButtonVisuals(): void {
    if (this.permaBarVisible) {
      if (this.permaBarToggleButton.postFX) {
        this.permaBarToggleButton.postFX.clear();
        const colorMatrix = this.permaBarToggleButton.postFX.addColorMatrix();
        colorMatrix.negative();
      }
      this.permaBarSubtext.setVisible(true);
    } else {
      if (this.permaBarToggleButton.postFX) {
        this.permaBarToggleButton.postFX.clear();
      }
      this.permaBarSubtext.setVisible(false);
    }

    if (this.playerBarVisible) {
      if (this.playerBarToggleButton.postFX) {
        this.playerBarToggleButton.postFX.clear();
        const colorMatrix = this.playerBarToggleButton.postFX.addColorMatrix();
        colorMatrix.negative();
      }
      this.playerBarSubtext.setVisible(true);
    } else {
      if (this.playerBarToggleButton.postFX) {
        this.playerBarToggleButton.postFX.clear();
      }
      this.playerBarSubtext.setVisible(false);
    }

    if (this.foeBarVisible) {
      if (this.foeBarToggleButton.postFX) {
        this.foeBarToggleButton.postFX.clear();
        const colorMatrix = this.foeBarToggleButton.postFX.addColorMatrix();
        colorMatrix.negative();
      }
      this.foeBarSubtext.setVisible(true);
    } else {
      if (this.foeBarToggleButton.postFX) {
        this.foeBarToggleButton.postFX.clear();
      }
      this.foeBarSubtext.setVisible(false);
    }
  }

  updatePermaModifierBar(permaModifiers: PermaModifiers): void {
    const visibleModifiers = permaModifiers.getModifiers().filter(
        m => !(m instanceof PermaCollectedTypeModifier)
    );

    this.permaModifierBar.updateModifiers(visibleModifiers);
    if (!this._replayHudSuppressed) {
      this.permaModifierBar.setVisible(this.permaBarVisible);
    }
  }

  public updatePermaCollectedTypeDisplay(scene: BattleScene): void {
    const permaModifier = scene.gameData.permaModifiers.getModifiers().find(
        m => m instanceof PermaCollectedTypeModifier
    ) as PermaCollectedTypeModifier | undefined;

    if (permaModifier && Object.keys(permaModifier.collectedTypes).length > 0) {
        this.permaCollectedTypeContainer.setVisible(true);
    } else {
        this.permaCollectedTypeContainer.setVisible(false);
        this.hidePermaCollectedTypeTooltip();
    }

    this.updatePermaMoneyText(scene);
  }
  public updateSkillTreeTokenDisplay(scene: BattleScene): void {
    if (!this.skillTreeTokenContainer) {
      return;
    }

    const activeSkillTree = scene.gameData?.activeSkillTree;
    if (!scene.skillTreeEnabledForRun || !activeSkillTree) {
      this.skillTreeTokenContainer.setVisible(false);
      return;
    }

    const tracker = scene.findModifier(m => m instanceof SkillTreeTokenTrackerModifier) as SkillTreeTokenTrackerModifier | undefined;
    const maxTokens = tracker ? tracker.getMaxStackCount(scene) : 2;
    const tokens = activeSkillTree.tokens || 0;
    const points = activeSkillTree.skillPoints || 0;

    const c = this.UI_CONSTANTS;

    this.skillTreeTokenText.setText(`${tokens}/${maxTokens}`);
    const tokenEntryRight = Math.max(
      this.skillTreeTokenIcon.displayWidth * c.SKILL_TREE_BAR_SCALE,
      this.skillTreeTokenText.x + this.skillTreeTokenText.displayWidth
    );

    this.skillTreePointsIcon.setX(tokenEntryRight + c.SKILL_TREE_POINTS_GAP);
    this.skillTreePointsText.setText(`x${points}`);
    this.skillTreePointsText.setX(
      this.skillTreePointsIcon.x + (this.skillTreePointsIcon.displayWidth / 2) + c.SKILL_TREE_POINTS_TEXT_X_OFFSET
    );
    this.skillTreePointsText.setY(
      this.skillTreePointsIcon.y + (this.skillTreePointsIcon.displayHeight / 2) + c.SKILL_TREE_POINTS_TEXT_Y_OFFSET
    );

    this.skillTreeTokenContainer.setVisible(true);
  }
  private setupSkillTreeIconTooltip(scene: BattleScene, icon: Phaser.GameObjects.Sprite, kind: "token" | "points"): void {
    icon.setInteractive({ useHandCursor: true });
    icon.on("pointerover", () => {
      if (scene.uiEditModeActive) {
        return;
      }
      const m = icon.getWorldTransformMatrix();
      const anchor = { x: m.tx, y: m.ty };
      if (kind === "token") {
        ModifierTooltipUtils.showForSkillTreeTokens(scene, anchor);
      } else {
        ModifierTooltipUtils.showForSkillPoints(scene, anchor);
      }
    });
    icon.on("pointerout", () => {
      if (scene.uiEditModeActive) {
        return;
      }
      ModifierTooltipUtils.hideIfNotPinned(scene);
    });
  }

  private showPermaCollectedTypeTooltip(scene: BattleScene): void {
    this.hidePermaCollectedTypeTooltip();
    ModifierTooltipUtils.hide(scene);

    const permaModifier = scene.gameData.permaModifiers.getModifiers().find(
        m => m instanceof PermaCollectedTypeModifier
    ) as PermaCollectedTypeModifier | undefined;

    if (!permaModifier) return;

    const entries: Array<{ type: Type; count: number }> = [];
    for (const [typeKey, count] of Object.entries(permaModifier.collectedTypes)) {
      if ((count as number) > 0) {
        entries.push({ type: parseInt(typeKey) as Type, count: count as number });
      }
    }
    if (entries.length === 0 && Overrides.DEBUG_ESSENCE_TOOLTIP_GEN1_AMOUNT <= 0) return;

    if (Overrides.DEBUG_ESSENCE_TOOLTIP_GEN1_AMOUNT > 0) {
        const genOneType = 22;
        const existing = entries.find(e => e.type === genOneType);
        if (!existing) {
            entries.push({ type: genOneType as Type, count: Overrides.DEBUG_ESSENCE_TOOLTIP_GEN1_AMOUNT });
        }
    }

    const COLS = 3;
    const padding = 6;
    const colWidth = 38;
    const rowHeight = 9;
    const headerH = 21;
    const tooltipWidth = padding * 2 + COLS * colWidth;
    const rows = Math.ceil(entries.length / COLS);

    const loreLocalizedText = i18next.t("championSelect:tooltip.essenceRequiredTooltipDesc", { defaultValue: "Spend essence to level up this champion. To earn essences defeat Pokémon to gain their type." });
    const lorePad = 3;
    const loreObj = addBBCodeTextObject(scene, 0, 0, loreLocalizedText, TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
    loreObj.setOrigin(0.5, 0);
    loreObj.setColor("#B0B0B0");
    const loreScaleX = loreObj.scaleX || 1;
    const loreWrapWidth = Math.max(0, (tooltipWidth - padding * 2 - 8) / loreScaleX);
    loreObj.setStyle({ ...(loreObj.style as any), wordWrap: { width: loreWrapWidth, useAdvancedWrap: true } } as any);
    const loreTextH = Math.min(loreObj.displayHeight, 50);
    const loreBarH = loreTextH + lorePad * 2;

    const tooltipHeight = headerH + rows * rowHeight + padding + loreBarH;

    this.permaCollectedTypeTooltipContainer = scene.add.container(0, 0);
    this.permaCollectedTypeTooltipContainer.setDepth(10000000000);

    const bg = scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipWidth, tooltipHeight, 12, 12, 12, 12);
    bg.setOrigin(0, 0);
    this.permaCollectedTypeTooltipContainer.add(bg);

    const rarity = SkillTreeRarity.LEGENDARY;
    const rarityColors = Utils.getUpgradeRarityColors(rarity);
    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");

    const rarityBar = scene.add.graphics();
    rarityBar.fillStyle(0x0f0f1e, 1.0);
    rarityBar.fillRect(2, 14, tooltipWidth - 4, 6);
    this.permaCollectedTypeTooltipContainer.add(rarityBar);

    const titleText = addTextObject(scene, tooltipWidth / 2, 8, i18next.t("modifierType:ModifierType.PermaCollectedTypeModifierType.name", { defaultValue: "Collected Essences" }), TextStyle.WINDOW, { fontSize: "40px", fontStyle: "bold" });
    titleText.setOrigin(0.5, 0.5);
    titleText.setColor(rarityHex);
    this.permaCollectedTypeTooltipContainer.add(titleText);

    const subtitleText = addTextObject(scene, tooltipWidth / 2, 17, i18next.t("championSelect:rarity.legendary", { defaultValue: "LEGENDARY" }), TextStyle.WINDOW, { fontSize: "30px" });
    subtitleText.setOrigin(0.5, 0.5);
    subtitleText.setTint(rarityColors.border);
    this.permaCollectedTypeTooltipContainer.add(subtitleText);

    const iconScale = 0.35;
    const specialIconScale = 0.425;
    const typesAtlas = Utils.getLocalizedSpriteKey("types");

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = padding + col * colWidth;
      const cellY = headerH + row * rowHeight + rowHeight / 2;

      const isSpecial = entry.type === (Type as any).SMITTY || entry.type === (Type as any).GLITCH || entry.type === (Type as any).GEN_ONE;

      let atlas: string;
      let frame: string;
      if (entry.type === (Type as any).GEN_ONE) { atlas = "pbinfo_enemy_type"; frame = "normal"; }
      else if (entry.type === (Type as any).GLITCH) { atlas = "categories"; frame = "physical"; }
      else if (entry.type === (Type as any).SMITTY) { atlas = "categories"; frame = "special"; }
      else { atlas = typesAtlas; frame = Type[entry.type].toLowerCase(); }

      const icon = scene.add.sprite(cellX + 2, cellY, atlas, frame);
      const appliedScale = isSpecial ? specialIconScale : iconScale;
      icon.setScale(appliedScale);
      icon.setOrigin(0, 0.5);
      this.permaCollectedTypeTooltipContainer.add(icon);

      if (isSpecial) {
        if (entry.type === (Type as any).SMITTY) icon.setTint(0xFF0000);
        else if (entry.type === (Type as any).GLITCH) {
          try {
            if (icon.postFX && typeof icon.postFX.addColorMatrix === "function") {
              const cm = icon.postFX.addColorMatrix();
              cm.negative();
            } else { icon.setTint(0xFF00FF); }
          } catch { icon.setTint(0xFF00FF); }
        }
        else if (entry.type === (Type as any).GEN_ONE) icon.setTint(0x33CC33);

        const isGlitch = entry.type === (Type as any).GLITCH;
        const isGenOne = entry.type === (Type as any).GEN_ONE;
        let labelStr: string;
        if (isGlitch) labelStr = i18next.t("pokemonInfo:Type.GLITCH", { defaultValue: "GLITCH" }).toUpperCase();
        else if (isGenOne) labelStr = i18next.t("pokemonInfo:Type.GEN_ONE", { defaultValue: "GEN I" }).toUpperCase();
        else labelStr = i18next.t("pokemonInfo:Type.SMITTY", { defaultValue: "SMITTY" }).toUpperCase();

        const specialLabel = addTextObject(scene, cellX + 2 + icon.displayWidth / 2, cellY, labelStr, TextStyle.WINDOW, {
          fontSize: "24px",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        });
        specialLabel.setOrigin(0.5, 0.5);
        if (isGenOne) {
          specialLabel.setColor("#33CC33");
        }
        this.permaCollectedTypeTooltipContainer.add(specialLabel);
      }

      const amountText = addTextObject(scene, cellX + 2 + icon.displayWidth + 2, cellY, `x${entry.count}`, TextStyle.WINDOW, { fontSize: "30px" });
      amountText.setOrigin(0, 0.5);
      this.permaCollectedTypeTooltipContainer.add(amountText);
    }

    const loreBarY = tooltipHeight - 2 - loreBarH;
    const loreStripe = scene.add.graphics();
    loreStripe.fillStyle(0x0f0f1e, 0.85);
    loreStripe.fillRect(2, loreBarY, tooltipWidth - 4, loreBarH);
    this.permaCollectedTypeTooltipContainer.add(loreStripe);

    loreObj.setPosition(tooltipWidth / 2, loreBarY + lorePad);
    this.permaCollectedTypeTooltipContainer.add(loreObj);

    attachModalBackground(scene, this.permaCollectedTypeTooltipContainer, () => ({
      bgX: 0, bgY: 0, bgWidth: tooltipWidth, bgHeight: tooltipHeight
    }), { mask: false, alphaMultiplier: 0.6 });

    const wm = this.permaCollectedTypeIcon.getWorldTransformMatrix();
    const screenW = scene.game.canvas.width / 6;
    const screenH = scene.game.canvas.height / 6;
    const ax = wm.tx / 6;
    const ay = wm.ty / 6;
    const tipGap = 4;
    let tx = ax + tipGap;
    if (tx + tooltipWidth > screenW) tx = ax - tipGap - tooltipWidth;
    tx = Math.max(4, Math.min(screenW - tooltipWidth - 4, tx));
    let ty = ay + tipGap;
    ty = Math.max(4, Math.min(screenH - tooltipHeight - 4, ty));

    this.permaCollectedTypeTooltipContainer.setPosition(tx, ty);
    scene.uiContainer.add(this.permaCollectedTypeTooltipContainer);
  }

  private hidePermaCollectedTypeTooltip(): void {
    if (this.permaCollectedTypeTooltipContainer) {
      this.permaCollectedTypeTooltipContainer.destroy();
      this.permaCollectedTypeTooltipContainer = null;
    }
  }

  setup(): void {
    (this as any)._setupDone = true;
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

    this.bgmBar = new BgmBar(this.scene as BattleScene);
    this.bgmBar.setup();

    (this.scene as BattleScene).fieldUI.add(this.bgmBar);

    this.savingIcon = new SavingIconHandler(this.scene as BattleScene);
    this.savingIcon.setup();

    (this.scene as BattleScene).uiContainer.add(this.savingIcon);

    this.updatePermaMoneyText((this.scene as BattleScene));

    this.updatePermaModifierBar((this.scene as BattleScene).gameData.permaModifiers);
    this.updatePermaCollectedTypeDisplay(this.scene as BattleScene);

    this.permaBarVisible = (this.scene as BattleScene).showPermaBar;

    if (this.permaBarVisible) {
      const scene = this.scene as BattleScene;
      scene.getModifierBar()?.setVisible(false);
      scene.getModifierBar(true)?.setVisible(false);
    } else {
      if (this.permaModifierBar) {
        this.permaModifierBar.setVisible(false);
      }
    }

    this.updateToggleButtonVisuals();
  }

  private setupTooltip() {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setName("tooltip");
    this.tooltipContainer.setVisible(false);

    this.tooltipBg = addWindow(this.scene as BattleScene, 0, 0, 128, 31);
    this.tooltipBg.setName("window-tooltip-bg");
    this.tooltipBg.setOrigin(0, 0);

    this.tooltipTitle = addTextObject(this.scene, 6, 4, "", TextStyle.TOOLTIP_TITLE);
    this.tooltipTitle.setName("text-tooltip-title");
    this.tooltipTitle.setOrigin(0, 0);

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

  getPermaMoneyContainer(): Phaser.GameObjects.Container {
    return this.permaMoneyContainer;
  }

  setReplayHudSuppressed(suppressed: boolean): void {
    this._replayHudSuppressed = suppressed;
    const v = !suppressed;
    try {
      if (this.permaMoneyContainer) this.permaMoneyContainer.setVisible(v);
    } catch {}
    try {
      if (this.permaModifierBar) this.permaModifierBar.setVisible(v);
    } catch {}
    try {
      (this.achvBar as any)?.setVisible?.(v);
    } catch {}
    try {
      (this.bgmBar as any)?.setVisible?.(v);
    } catch {}
    try {
      (this.savingIcon as any)?.setVisible?.(v);
    } catch {}
    if (suppressed) {
      try {
        ModifierTooltipUtils.hide(this.scene as BattleScene);
      } catch {}
      try {
        PokemonBattleTooltipUtils.hide();
      } catch {}
      this.hidePermaCollectedTypeTooltip();
      this.disablePermaHudInteractivity();
    } else {
      this.enablePermaHudInteractivity();
    }
  }

  private disablePermaHudInteractivity(): void {
    if (this.permaMoneyHoverZone) {
      try { this.permaMoneyHoverZone.disableInteractive(); } catch {}
    }
    const btns = [
      this.saveButton, this.voidexButton, this.eggGachaButton,
      this.battlePathButton, this.runInfoButton,
      this.permaBarToggleButton, this.playerBarToggleButton, this.foeBarToggleButton,
      this.permaCollectedTypeIcon
    ];
    for (const btn of btns) {
      if (btn && typeof btn.disableInteractive === "function") {
        try { btn.disableInteractive(); } catch {}
      }
    }
    if (this.permaModifierBar) {
      this.permaModifierBar.getAll().forEach((icon: any) => {
        if (typeof icon.disableInteractive === "function") {
          try { icon.disableInteractive(); } catch {}
        }
      });
    }
  }

  private enablePermaHudInteractivity(): void {
    if (this.permaMoneyHoverZone) {
      try {
        this.permaMoneyHoverZone.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, this.permaMoneyHoverZone.width, this.permaMoneyHoverZone.height),
          Phaser.Geom.Rectangle.Contains
        );
      } catch {}
    }
    const btns = [
      this.saveButton, this.voidexButton, this.eggGachaButton,
      this.battlePathButton, this.runInfoButton,
      this.permaBarToggleButton, this.playerBarToggleButton, this.foeBarToggleButton,
      this.permaCollectedTypeIcon
    ];
    for (const btn of btns) {
      if (btn && typeof btn.setInteractive === "function") {
        try { btn.setInteractive({ useHandCursor: true }); } catch {}
      }
    }
    if (this.permaModifierBar) {
      this.permaModifierBar.getAll().forEach((icon: any) => {
        if (typeof icon.setInteractive === "function") {
          try { icon.setInteractive(); } catch {}
        }
      });
    }
  }

  public updateReplayIcon(scene: BattleScene): void {
    return;
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

    if (ModifierTooltipUtils.handleUiInput(this.scene as BattleScene, button)) {
      return true;
    }

    const battleScene = this.scene as BattleScene;
    const currentMode = this.getMode();
    const battleModes = [Mode.COMMAND, Mode.FIGHT, Mode.BALL, Mode.TARGET_SELECT];
    if (DEBUG_YU_VISUAL_TUNING && battleScene.uiEditModeActive && battleModes.includes(currentMode)) {
      if (button === Button.CYCLE_ABILITY && battleScene.fieldSpriteTweak) {
        if (battleScene.commandUiTweak?.tweakActive) {
          battleScene.commandUiTweak.deactivate();
        }
        return battleScene.fieldSpriteTweak.onCycleAbility();
      }
      if (battleScene.fieldSpriteTweak?.tweakActive) {
        if (button === Button.CYCLE_GENDER) {
        } else {
          return battleScene.fieldSpriteTweak.processInput(button);
        }
      }
      if (currentMode === Mode.COMMAND && battleScene.commandUiTweak?.tweakActive) {
        if (button === Button.CYCLE_GENDER) {
        } else {
          return battleScene.commandUiTweak.processInput(button);
        }
      }

      const playerBi = battleScene.getPlayerField()[0]?.getBattleInfo() as BattleInfo | undefined;
      const enemyBi = battleScene.getEnemyField()[0]?.getBattleInfo() as BattleInfo | undefined;
      const routeBi = BattleInfo.resolveBiTweakHandler(playerBi, enemyBi);
      if (routeBi) {
        return routeBi.processBiTweakInput(button);
      }
      if (button === Button.CYCLE_GENDER) {
        const targetBi = BattleInfo.isBiTweakSidePlayer() ? playerBi : enemyBi ?? playerBi;
        if (targetBi) {
          targetBi.initBiTweak();
          return targetBi.onBiTweakCycle();
        }
      }
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

      if (battleScene.skipSeenDialogues && battleScene.gameData.getSeenDialogues()[i18nKey] === true) {
        callback();
        return;
      }
    }
    let showMessageAndCallback = () => {
      hasi18n && battleScene.gameData.saveSeenDialogue(keyOrText);
      callback();
    };

    const lang = i18next.resolvedLanguage;
    const isCJK = lang === 'ja' || lang === 'zh-CN' || lang === 'zh-TW';
    const msgHandler = this.getMessageHandler();
    const isSmitomMode = msgHandler && (msgHandler as any)._smitomModeActive;
    const maxPageLength = isCJK ? 53 : 108;
    const maxWordsPerPage = 19;

    const splitIntoPages = (text: string): string[] => {
      if (isSmitomMode) {
        if (text.indexOf("$") > -1) {
          return text.split(/\$/g).map(m => m.trim()).filter(m => m.length > 0);
        }
        return [text];
      }

      if (text.indexOf("$") > -1) {
        const pages = text.split(/\$/g).map(m => m.trim());
        return pages;
      }

      if (isCJK) {
        const pages: string[] = [];
        let currentPage = "";

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const potentialPage = currentPage + char;

          if (potentialPage.length > maxPageLength) {
            if (currentPage) {
              pages.push(currentPage);
            }
            currentPage = char;
          } else {
            currentPage = potentialPage;
          }
        }

        if (currentPage) {
          pages.push(currentPage);
        }

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

    const lineCount = wrappedContent.split("\n").length;
    const isJapanese = i18next.resolvedLanguage === 'ja';
    const baseHeight = title ? (isJapanese ? 35 : 31) : (isJapanese ? 23 : 19);
    const perLineHeight = isJapanese ? 7.5 : 10.5;
    this.tooltipBg.height = baseHeight + perLineHeight * (lineCount - 1);
    if (!this._tooltipPattern) {
      this._tooltipPattern = attachModalBackground(
        this.scene as BattleScene,
        this.tooltipContainer,
        () => ({ bgX: this.tooltipBg.x, bgY: this.tooltipBg.y, bgWidth: this.tooltipBg.width, bgHeight: this.tooltipBg.height }),
        { mask: false, alphaMultiplier: 1.0, getTarget: () => this.tooltipBg }
      );
    } else {
      this._tooltipPattern.redraw({ bgX: this.tooltipBg.x, bgY: this.tooltipBg.y, bgWidth: this.tooltipBg.width, bgHeight: this.tooltipBg.height });
    }
    if (overlap) {
      (this.scene as BattleScene).uiContainer.moveAbove(this.tooltipContainer, this);
    } else {
      (this.scene as BattleScene).uiContainer.moveBelow(this.tooltipContainer, this);
    }
  }

  hideTooltip(): void {
    this.tooltipContainer.setVisible(false);
    this.tooltipTitle.clearTint();
    this._tooltipPattern?.clear();
    this._tooltipPattern = undefined;
  }

  update(): void {
    if (this.tooltipContainer.visible) {
      const reverse = this.scene.game.input.mousePointer && this.scene.game.input.mousePointer.x >= this.scene.game.canvas.width - this.tooltipBg.width * 6 - 12;
      const newX = !reverse ? this.scene.game.input.mousePointer!.x / 6 + 2 : this.scene.game.input.mousePointer!.x / 6 - this.tooltipBg.width - 2;
      const newY = this.scene.game.input.mousePointer!.y / 6 + 2;
      const oldX = this.tooltipContainer.x;
      const oldY = this.tooltipContainer.y;
      this.tooltipContainer.setPosition(newX, newY);

      if (this._tooltipPattern && (oldX !== newX || oldY !== newY)) {
        this._tooltipPattern.redraw({ bgX: this.tooltipBg.x, bgY: this.tooltipBg.y, bgWidth: this.tooltipBg.width, bgHeight: this.tooltipBg.height });
      }
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

  hideMessageChrome(): void {
    const msgHandler = this.getMessageHandler() as any;
    if (msgHandler?.messageContainer) {
      msgHandler.messageContainer.setVisible(false);
      this.sendToBack(msgHandler.messageContainer);
    }
    if (msgHandler?._messageBgPattern) {
      if (msgHandler._messageBgPattern.layers) {
        msgHandler._messageBgPattern.layers.forEach((l: any) => {
          l.setVisible(false);
          this.sendToBack(l);
        });
      } else if (msgHandler._messageBgPattern.container) {
        msgHandler._messageBgPattern.container.setVisible(false);
      }
    }
    if (msgHandler?.bg) {
      msgHandler.bg.setVisible(false);
      this.sendToBack(msgHandler.bg);
    }
  }

  showMessageChrome(): void {
    const msgHandler = this.getMessageHandler() as any;
    if (msgHandler?.bg) {
      msgHandler.bg.setVisible(true);
    }
    if (msgHandler?._messageBgPattern) {
      if (msgHandler._messageBgPattern.layers) {
        msgHandler._messageBgPattern.layers.forEach((l: any) => {
          l.setVisible(true);
        });
      } else if (msgHandler._messageBgPattern.container) {
        msgHandler._messageBgPattern.container.setVisible(true);
      }
    }
    if (msgHandler?.messageContainer) {
      msgHandler.messageContainer.setVisible(true);
    }
  }

  ensureMessageVisibleForOverlay(): void {
    const msgHandler = this.getMessageHandler() as any;
    if (msgHandler?.bg) {
      msgHandler.bg.setVisible(true);
      msgHandler.bg.setAlpha(1);
      this.bringToTop(msgHandler.bg);
    }
    if (msgHandler?._messageBgPattern) {
      if (msgHandler._messageBgPattern.layers) {
        msgHandler._messageBgPattern.layers.forEach((l: any) => {
          l.setVisible(true);
          this.bringToTop(l);
        });
      } else if (msgHandler._messageBgPattern.container) {
        msgHandler._messageBgPattern.container.setVisible(true);
        this.bringToTop(msgHandler._messageBgPattern.container);
      }
    }
    if (msgHandler?.messageContainer) {
      msgHandler.messageContainer.setVisible(true);
      this.bringToTop(msgHandler.messageContainer);
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
      if (this.mode === mode) {
        if (chainMode || forceTransition) {
          ModifierTooltipUtils.hide(this.scene as BattleScene);
          PokemonBattleTooltipUtils.hide();
          this.hidePermaCollectedTypeTooltip();
          if (clear) {
            this.getHandler().clear();
          }
          const handler = this.getHandler();
          if (handler) {
            handler.show(args);
          }
        }
        resolve();
        return;
      }

      const doSetMode = () => {
        ModifierTooltipUtils.hide(this.scene as BattleScene);
        PokemonBattleTooltipUtils.hide();
        this.hidePermaCollectedTypeTooltip();
        if (this.mode !== mode) {
          const battleModes = [Mode.COMMAND, Mode.FIGHT, Mode.BALL, Mode.TARGET_SELECT];
          if (battleModes.includes(this.mode) && !battleModes.includes(mode)) {
            const bs = this.scene as BattleScene;
            if (bs.fieldSpriteTweak?.tweakActive) {
              bs.fieldSpriteTweak.deactivate();
            }
            if (bs.commandUiTweak?.tweakActive) {
              bs.commandUiTweak.deactivate();
            }
            const playerBi = bs.getPlayerField()[0]?.getBattleInfo() as any;
            const enemyBi = bs.getEnemyField()[0]?.getBattleInfo() as any;
            if (playerBi?.biTweakActive) {
              playerBi._biMetaMode = 0;
              playerBi._biDropdownPanel?.destroy();
              playerBi._biDropdownPanel = null;
            }
            if (enemyBi?.biTweakActive) {
              enemyBi._biMetaMode = 0;
              enemyBi._biDropdownPanel?.destroy();
              enemyBi._biDropdownPanel = null;
            }
            PokemonBattleTooltipUtils.hideHoverTweak();
            StatAnimTweakUtils.hidePreview();
          }
          if (clear) {
            this.getHandler().clear();
          }

          if (chainMode && this.mode !== null && this.mode !== undefined && !clear) {
            this.modeChain.push(this.mode);
            (this.scene as BattleScene).updateGameInfo();
          }

          if (mode === Mode.COMMAND) {
            try {
              this.getMessageHandler().clearText();
            } catch {}
          }

          this.mode = mode;
          const battleInteractiveModes = [Mode.COMMAND, Mode.MESSAGE, Mode.FIGHT, Mode.BALL, Mode.TARGET_SELECT];
          if (!battleInteractiveModes.includes(mode)) {
            PokemonBattleTooltipUtils.disableBattleHoverZones();
          } else {
            PokemonBattleTooltipUtils.enableBattleHoverZones();
          }
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
    const currentHandler = this.handlers[this.mode];
    if (currentHandler) currentHandler.clear();
    while (this.modeChain.length > 0) {
      const prevMode = this.modeChain.pop()!;
      const handler = this.handlers[prevMode];
      if (handler) handler.clear();
    }
    this.modeChain = [];
    (this.scene as BattleScene).updateGameInfo();
  }

  clearAllHandlerVisuals(): void {
    try {
      while (this.modeChain.length > 0) {
        const handler = this.handlers[this.mode];
        if (handler) handler.clear();
        this.mode = this.modeChain.pop()!;
      }
      const currentHandler = this.handlers[this.mode];
      if (currentHandler) currentHandler.clear();
      this.modeChain = [];
      this.clearText();
      ModifierTooltipUtils.hide(this.scene as BattleScene);
      PokemonBattleTooltipUtils.hide();
      this.hidePermaCollectedTypeTooltip();
    } catch {}
  }

  revertMode(): Promise<boolean> {
    return new Promise<boolean>(resolve => {

      if (!this?.modeChain?.length) {
        return resolve(false);
      }

      const lastMode = this.mode;

      const doRevertMode = () => {
        ModifierTooltipUtils.hide(this.scene as BattleScene);
        this.hidePermaCollectedTypeTooltip();
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
        this.permaMoneyText.setX(this.permaMoneyText.x + battlePathButtonWidth + 9);
      }
      this.battlePathContainer.setAlpha(0);
      this.battlePathButton.disableInteractive();
      const battlePathContainer = document.getElementById("apadBattlePath");
      if (battlePathContainer) {
        battlePathContainer.dataset.activeState = "false";
      }

      return;
    }

    if (this.battlePathContainer.alpha === 0) {
      this.permaMoneyText.setX(this.permaMoneyText.x - battlePathButtonWidth - 9);

    }
    this.battlePathContainer.setAlpha(1);
    this.battlePathButton.setInteractive({ useHandCursor: true });
    const battlePathContainer = document.getElementById("apadBattlePath");
    if (battlePathContainer) {
      battlePathContainer.dataset.activeState = "true";
    }
  }

  public updateRunInfoIcon(scene: BattleScene): void {
    const currentPhase = scene.getCurrentPhase();
    if (!(currentPhase instanceof TitlePhase || currentPhase instanceof CommandPhase || currentPhase instanceof SelectModifierPhase)) {
      this.runInfoContainer.setAlpha(0);
      const runInfoContainer = document.getElementById("apadRunInfo");
      if (runInfoContainer) {
        runInfoContainer.dataset.activeState = "false";
      }
      return;
    }

    if (scene.sessionSlotId < 0) {
      this.runInfoContainer.setAlpha(0);
      const runInfoContainer = document.getElementById("apadRunInfo");
      if (runInfoContainer) {
        runInfoContainer.dataset.activeState = "false";
      }
      return;
    }

    this.runInfoContainer.setAlpha(1);

    const runInfoContainer = document.getElementById("apadRunInfo");
    if (runInfoContainer) {
      runInfoContainer.dataset.activeState = "true";
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

    if (!this.permaMoneyHoverZone) {
      this.permaMoneyHoverZone = scene.add.zone(0, 0, 1, 1);
      this.permaMoneyHoverZone.setOrigin(0, 0);
      (scene as any).uiContainer.add(this.permaMoneyHoverZone);
      this.permaMoneyHoverZone.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 1, 1),
        Phaser.Geom.Rectangle.Contains
      );
      this.permaMoneyHoverZone.on('pointerover', () => {
        if ((this.scene as BattleScene).uiEditModeActive) return;
        const data: ModifierTooltipData = { title: i18next.t("battleScene:tooltipPermaMoney"), subtitle: "", body: i18next.t("battleScene:tooltipPermaMoneyDesc"), rarity: SkillTreeRarity.LEGENDARY, hasDetails: false };
        const wm = this.permaMoneyText.getWorldTransformMatrix();
        ModifierTooltipUtils.show(scene, data, { x: wm.tx, y: wm.ty });
      });
      this.permaMoneyHoverZone.on('pointerout', () => { if (!(this.scene as BattleScene).uiEditModeActive) ModifierTooltipUtils.hideIfNotPinned(scene); });
    }

    this.permaMoneyText.setVisible(true);

    const rightEdge = scene.game.canvas.width / 6;
    const topEdge = this.getTopEdge(scene);
    const padding = this.UI_CONSTANTS.TOP_PADDING;
    const leftPadding = this.UI_CONSTANTS.LEFT_PADDING;

    const saveButtonWidth = this.saveContainer.displayWidth * this.saveContainer.scale;
    const voidexButtonWidth = this.voidexContainer.displayWidth * this.voidexContainer.scale;
    const eggGachaButtonWidth = this.eggGachaContainer.displayWidth * this.eggGachaContainer.scale;
    const runInfoButtonWidth = this.runInfoContainer.displayWidth * this.runInfoContainer.scale;
    const saveContainerXOffset = 5;
    const voidexContainerXOffset = 10;
    const eggGachaContainerXOffset = 19;
    const runInfoContainerXOffset = 28;
    const battlePathContainerXOffset = 38;
    const containerYOffset = 5;
    const permaMoneyTextYOffset = 1;

    let battlePathButtonWidth = 0;
    this.battlePathContainer.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - eggGachaButtonWidth - runInfoButtonWidth - padding - battlePathContainerXOffset, topEdge + containerYOffset);
    this.battlePathContainer.setAlpha(0);
    this.battlePathButton.disableInteractive();
    const permaMoneyTextXOffset = 33;

    this.saveContainer.setPosition(rightEdge - saveContainerXOffset, topEdge + containerYOffset);
    this.voidexContainer.setPosition(rightEdge - saveButtonWidth - padding - voidexContainerXOffset, topEdge + containerYOffset);
    this.eggGachaContainer.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - padding - eggGachaContainerXOffset, topEdge + containerYOffset);
    this.updateEggHatchHudCounter();
    this.runInfoContainer.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - eggGachaButtonWidth - padding - runInfoContainerXOffset, topEdge + containerYOffset);

    const permaCollectedTypeWidth = this.permaCollectedTypeContainer.visible ?
        (this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SIZE * this.UI_CONSTANTS.TOGGLE_BUTTON_ICON_SCALE) + this.UI_CONSTANTS.PERMA_COLLECTED_TYPE_SPACING : 0;

    this.permaCollectedTypeContainer.setPosition(leftPadding, topEdge + padding);
    const skillTreeRowOriginOffset = this.permaCollectedTypeIcon.displayWidth / 2;
    const skillTreeIconOriginOffset = this.UI_CONSTANTS.SKILL_TREE_ICON_Y * this.UI_CONSTANTS.SKILL_TREE_BAR_SCALE;
    this.skillTreeTokenContainer.setPosition(
      leftPadding - skillTreeRowOriginOffset + this.UI_CONSTANTS.SKILL_TREE_ROW_INDENT,
      topEdge + padding + this.UI_CONSTANTS.SKILL_TREE_ROW_Y_OFFSET - skillTreeIconOriginOffset + 2
    );
    this.updateSkillTreeTokenDisplay(scene);

    const toggleStartX = leftPadding + permaCollectedTypeWidth;
    this.permaBarToggleContainer.setPosition(toggleStartX, topEdge + padding);
    this.playerBarToggleContainer.setPosition(toggleStartX + this.UI_CONSTANTS.TOGGLE_BUTTON_HORIZONTAL_SPACING, topEdge + padding);
    this.foeBarToggleContainer.setPosition(toggleStartX + (this.UI_CONSTANTS.TOGGLE_BUTTON_HORIZONTAL_SPACING * 2), topEdge + padding);

    const isInBattle = (this.scene as BattleScene).currentBattle !== null && (this.scene as BattleScene).currentBattle !== undefined;

    this.playerBarToggleContainer.setVisible(isInBattle);
    this.foeBarToggleContainer.setVisible(isInBattle);

    if (isInBattle !== this.lastKnownBattleState) {
      this.lastKnownBattleState = isInBattle;
      this.updatePermaModifierBar((this.scene as BattleScene).gameData.permaModifiers);
    }

    this.layoutModifierBars(scene);

    this.permaMoneyText.setPosition(rightEdge - saveButtonWidth - voidexButtonWidth - eggGachaButtonWidth - runInfoButtonWidth - padding - permaMoneyTextXOffset, topEdge + permaMoneyTextYOffset);
    this.permaMoneyContainer.add(this.permaMoneyText);

    if (this.permaMoneyHoverZone) {
      const wm = this.permaMoneyText.getWorldTransformMatrix();
      const scaledW = this.permaMoneyText.width * Math.abs(wm.scaleX);
      const scaledH = this.permaMoneyText.height * Math.abs(wm.scaleY);
      const zw = scaledW / 6 + 4;
      const zh = scaledH / 6 + 4;
      const zoneX = (wm.tx / 6) - zw;
      const zoneY = (wm.ty / 6);
      this.permaMoneyHoverZone.setPosition(zoneX, zoneY);
      this.permaMoneyHoverZone.setSize(zw, zh);
      if (this.permaMoneyHoverZone.input) {
        const hitRect = this.permaMoneyHoverZone.input.hitArea as Phaser.Geom.Rectangle;
        hitRect.setTo(0, 0, zw, zh);
      }
    }

    if (!this.permaMoneyContainer.parentContainer) {
      scene.add.existing(this.permaMoneyContainer);
    }

    if (!this._replayHudSuppressed) {
      this.permaMoneyContainer.setVisible(true);
    }
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

        const exclamationSprite = this.scene.add.sprite(0, 0, 'smitems', 'exclamationMark');
        exclamationSprite.setScale(0.075);
        exclamationSprite.setOrigin(0.5, 0.5);

        this.saveExclamationWindow.add(exclamationSprite);
        this.permaMoneyContainer.add(this.saveExclamationWindow);

        const saveCappedSpeed = Math.min((this.scene as BattleScene).gameSpeed, 3);
        this.scene.tweens.add({
          targets: this.saveExclamationWindow,
          y: relativeY + .5,
          duration: Utils.fixedInt(Math.ceil(2500 / saveCappedSpeed)),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      },
      callbackScope: this
    });
  }

  public updateEggHatchHudCounter(): void {
    const eggs = (this.scene as BattleScene).gameData?.eggs;
    if (!eggs || eggs.length === 0 || !this.eggHatchHudText) {
      if (this.eggHatchHudText) this.eggHatchHudText.setVisible(false);
      return;
    }
    const minWaves = Math.min(...eggs.map(e => e.hatchWaves));
    this.eggHatchHudText.setText(minWaves.toString());
    const digitOffset = minWaves >= 10 ? 1 : 0;
    this.eggHatchHudText.setPosition(
      this.eggGachaKeySprite.x - this.eggGachaKeySprite.displayWidth / 2 - 0.5 + digitOffset,
      this.eggGachaKeySprite.y + 1
    );
    this.eggHatchHudText.setVisible(true);
  }
}