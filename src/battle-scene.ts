import Phaser from "phaser";
import UI, { Mode } from "./ui/ui";
import Pokemon, { PlayerPokemon, EnemyPokemon } from "./field/pokemon";
import PokemonSpecies, { PokemonSpeciesFilter, allSpecies, getPokemonSpecies } from "./data/pokemon-species";
import {Constructor, randSeedInt} from "#app/utils";
import * as Utils from "./utils";
import {
  Modifier,
  ModifierBar,
  ConsumablePokemonModifier,
  ConsumableModifier,
  PokemonHpRestoreModifier,
  TurnHeldItemTransferModifier,
  HealingBoosterModifier,
  PersistentModifier,
  PokemonHeldItemModifier,
  ModifierPredicate,
  DoubleBattleChanceBoosterModifier,
  FusePokemonModifier,
  PokemonFormChangeItemModifier,
  TerastallizeModifier,
  overrideModifiers,
  overrideHeldItems,
  AbilitySacrificeModifier,
  AbilitySwitcherModifier,
  AnyAbilityModifier,
  AnyPassiveAbilityModifier,
  TypeSacrificeModifier,
  TypeSwitcherModifier, PermaMoneyModifier,
  MoveSacrificeModifier,
  SacrificeToggleModifier,
  PokemonNatureChangeModifier,
  BerryModifier,
  GlitchPieceModifier,
  PassiveAbilitySacrificeModifier,
  StatSacrificeModifier,
  MegaEvolutionAccessModifier,
  GigantamaxAccessModifier,
  TerastallizeAccessModifier,
  CollectedTypeModifier,
  MoveUpgradeModifier
} from "./modifier/modifier";
import { PokeballType } from "./data/pokeball";
import {
  initCommonAnims,
  initMoveAnim,
  loadCommonAnimAssets,
  loadMoveAnimAssets,
  populateAnims
} from "./data/battle-anims";
import { Phase } from "./phase";
import { initGameSpeed } from "./system/game-speed";
import { Arena, ArenaBase } from "./field/arena";
import { BiomeChange, GameData } from "./system/game-data";
import { TextStyle, addTextObject, getTextColor } from "./ui/text";
import Move, { allMoves } from "./data/move";
import {
  ModifierPoolType,
  getDefaultModifierTypeForTier,
  getEnemyModifierTypesForWave,
  getLuckString,
  getLuckTextTint,
  getModifierPoolForType,
  getModifierType,
  getPartyLuckValue,
  modifierTypes
} from "./modifier/modifier-type";
import AbilityBar from "./ui/ability-bar";
import {
  BlockItemTheftAbAttr,
  DoubleBattleChanceAbAttr,
  ChangeMovePriorityAbAttr,
  PostBattleInitAbAttr,
  applyAbAttrs,
  applyPostBattleInitAbAttrs,
  allAbilities
} from "./data/ability";
import Battle, {
  BattleType,
  classicFixedBattles,
  FixedBattleConfig,
  majorBossWaves,
  nightmareFixedBattles, setupNightmareFixedBattles,
  rivalWaves,
  eliteFourWaves
} from "./battle";
import { GameMode, GameModes, getGameMode } from "./game-mode";
import FieldSpritePipeline from "./pipelines/field-sprite";
import SpritePipeline from "./pipelines/sprite";
import PartyExpBar from "./ui/party-exp-bar";
import { TrainerSlot, trainerConfigs } from "./data/trainer-config";
import Trainer, { TrainerVariant } from "./field/trainer";
import TrainerData from "./system/trainer-data";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import { pokemonPrevolutions } from "./data/pokemon-evolutions";
import PokeballTray from "./ui/pokeball-tray";
import InvertPostFX from "./pipelines/invert";
import {
  Achv,
  ModifierAchv,
  MoneyAchv,
  achvs
} from "./system/achv";
import { Voucher, vouchers } from "./system/voucher";
import { Gender } from "./data/gender";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin";
import { addUiThemeOverrides } from "./ui/ui-theme";
import PokemonData from "./system/pokemon-data";
import { Nature } from "./data/nature";
import {
  SpeciesFormChangeManualTrigger,
  SpeciesFormChangeTimeOfDayTrigger,
  SpeciesFormChangeTrigger,
  pokemonFormChanges,
  SpeciesFormChange,
  SmittyFormTrigger
} from "./data/pokemon-forms";
import {FormChangeItem} from "#enums/form-change-items";
import { FormChangePhase } from "./phases/form-change-phase";
import { getTypeRgb } from "./data/type";
import PokemonSpriteSparkleHandler from "./field/pokemon-sprite-sparkle-handler";
import CharSprite from "./ui/char-sprite";
import DamageNumberHandler from "./field/damage-number-handler";
import PokemonInfoContainer from "./ui/pokemon-info-container";
import { biomeDepths, getBiomeName } from "./data/biomes";
import { SceneBase } from "./scene-base";
import CandyBar from "./ui/candy-bar";
import { Variant, variantData } from "./data/variant";
import { Localizable } from "#app/interfaces/locales";
import Overrides from "#app/overrides";
import { InputsController } from "./inputs-controller";
import { UiInputs } from "./ui-inputs";
import { NewArenaEvent } from "./events/battle-scene";
import { ArenaFlyout } from "./ui/arena-flyout";
import { EaseType } from "#enums/ease-type";
import { BattleSpec } from "#enums/battle-spec";
import { BattleStyle } from "#enums/battle-style";
import { Biome } from "#enums/biome";
import { ExpNotification } from "#enums/exp-notification";
import { MoneyFormat } from "#enums/money-format";
import { Moves } from "#enums/moves";
import { PlayerGender } from "#enums/player-gender";
import { Species } from "#enums/species";
import { UiTheme } from "#enums/ui-theme";
import { TimedEventManager } from "#app/timed-event-manager.js";
import i18next from "i18next";
import { TrainerType } from "#enums/trainer-type";
import { battleSpecDialogue } from "./data/dialogue";
import { isIPhone, LoadingScene } from "./loading-scene";
import { LevelCapPhase } from "./phases/level-cap-phase";
import { LoginPhase } from "./phases/login-phase";
import { MessagePhase } from "./phases/message-phase";
import { MovePhase } from "./phases/move-phase";
import { NewBiomeEncounterPhase } from "./phases/new-biome-encounter-phase";
import { NextEncounterPhase } from "./phases/next-encounter-phase";
import { QuietFormChangePhase } from "./phases/quiet-form-change-phase";
import { ReturnPhase } from "./phases/return-phase";
import { SelectBiomePhase } from "./phases/select-biome-phase";
import { ShowTrainerPhase } from "./phases/show-trainer-phase";
import { SummonPhase } from "./phases/summon-phase";
import { SwitchPhase } from "./phases/switch-phase";
import { TitlePhase } from "./phases/title-phase";
import { ToggleDoublePositionPhase } from "./phases/toggle-double-position-phase";
import { TurnInitPhase } from "./phases/turn-init-phase";
import { ShopCursorTarget } from "./enums/shop-cursor-target";
import {PermaType} from "#app/modifier/perma-modifiers";
import { VictoryPhase } from "./phases/victory-phase";
import { BattlerIndex } from "./battle";
import {FaintPhase} from "#app/phases/faint-phase";
import { DynamicMode, DynamicModes, PathNodeType } from "./battle";
import { PathNodeContext } from "./phases/battle-path-phase";


// export const bypassLogin = import.meta.env.VITE_BYPASS_LOGIN === "1";
export const bypassLogin = true;

const DEBUG_RNG = false;

const OPP_IVS_OVERRIDE_VALIDATED : integer[] = (
  Array.isArray(Overrides.OPP_IVS_OVERRIDE) ?
    Overrides.OPP_IVS_OVERRIDE :
    new Array(6).fill(Overrides.OPP_IVS_OVERRIDE)
).map(iv => isNaN(iv) || iv === null || iv > 31 ? -1 : iv);

export const startingWave = Overrides.STARTING_WAVE_OVERRIDE || 1;

const expSpriteKeys: string[] = [];

export let starterColors: StarterColors;
interface StarterColors {
	[key: string]: [string, string]
}

export interface PokeballCounts {
	[pb: string]: integer;
}

export type AnySound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

export interface InfoToggle {
    toggleInfo(force?: boolean): void;
    isActive(): boolean;
}

export enum RecoveryBossMode {
  NONE,
  FACING_BOSS,
  RECOVERY_OBTAINED,
}

export default class BattleScene extends SceneBase {
  public rexUI: UIPlugin;
  public inputController: InputsController;
  public uiInputs: UiInputs;

  public sessionPlayTime: integer | null = null;
  public lastSavePlayTime: integer | null = null;
  public masterVolume: number = 0.5;
  public rivalAndBossDataOnStats: string = "Off";
  public bgmVolume: number = 1;
  public fieldVolume: number = 1;
  public seVolume: number = 1;
  public uiVolume: number = 1;
  public gameSpeed: integer = 1;
  public damageNumbersMode: integer = 0;
  public reroll: boolean = false;
  public shopCursorTarget: number = ShopCursorTarget.CHECK_TEAM;
  public showMovesetFlyout: boolean = true;
  public showArenaFlyout: boolean = true;
  public showTimeOfDayWidget: boolean = true;
  public timeOfDayAnimation: EaseType = EaseType.NONE;
  public showLevelUpStats: boolean = true;
  public enableTutorials: boolean = false;
  public enableMoveInfo: boolean = true;
  public hideIvs: boolean = false;
  /**
   * Determines the condition for a notification should be shown for Candy Upgrades
   * - 0 = 'Off'
   * - 1 = 'Passives Only'
   * - 2 = 'On'
   */
  public candyUpgradeNotification: integer = 0;
  /**
   * Determines what type of notification is used for Candy Upgrades
   * - 0 = 'Icon'
   * - 1 = 'Animation'
   */
  public candyUpgradeDisplay: integer = 0;
  public moneyFormat: MoneyFormat = MoneyFormat.NORMAL;
  public uiTheme: UiTheme = UiTheme.DEFAULT;
  public windowType: integer = 0;
  public experimentalSprites: boolean = false;
  public musicPreference: integer = 0;
  public moveAnimations: boolean = true;
  public expGainsSpeed: integer = 0;
  public skipSeenDialogues: boolean = false;

  /**
	 * Defines the experience gain display mode.
	 *
	 * @remarks
	 * The `expParty` can have several modes:
	 * - `0` - Default: The normal experience gain display, nothing changed.
	 * - `1` - Level Up Notification: Displays the level up in the small frame instead of a message.
	 * - `2` - Skip: No level up frame nor message.
	 *
	 * Modes `1` and `2` are still compatible with stats display, level up, new move, etc.
	 * @default 0 - Uses the default normal experience gain display.
	 */
  public expParty: ExpNotification = 0;
  public hpBarSpeed: integer = 0;
  public fusionPaletteSwaps: boolean = true;
  public enableTouchControls: boolean = false;
  public enableVibration: boolean = false;
  public showBgmBar: boolean = true;

  /**
   * Determines the selected battle style.
   * - 0 = 'Switch'
   * - 1 = 'Set' - The option to switch the active pokemon at the start of a battle will not display.
   */
  public battleStyle: integer = BattleStyle.SWITCH;

  /**
  * Defines whether or not to show type effectiveness hints
  * - true: No hints
  * - false: Show hints for moves
   */
  public typeHints: boolean = false;

  public disableMenu: boolean = false;

  public gameData: GameData;
  public sessionSlotId: integer;

  /** PhaseQueue: dequeue/remove the first element to get the next phase */
  public phaseQueue: Phase[];
  public conditionalQueue: Array<[() => boolean, Phase]>;
  /** PhaseQueuePrepend: is a temp storage of what will be added to PhaseQueue */
  private phaseQueuePrepend: Phase[];

  /** overrides default of inserting phases to end of phaseQueuePrepend array, useful or inserting Phases "out of order" */
  private phaseQueuePrependSpliceIndex: integer;
  private nextCommandPhaseQueue: Phase[];

  private currentPhase: Phase | null;
  private standbyPhase: Phase | null;
  public field: Phaser.GameObjects.Container;
  public fieldUI: Phaser.GameObjects.Container;
  public charSprite: CharSprite;
  public pbTray: PokeballTray;
  public pbTrayEnemy: PokeballTray;
  public abilityBar: AbilityBar;
  public partyExpBar: PartyExpBar;
  public candyBar: CandyBar;
  public arenaBg: Phaser.GameObjects.Sprite;
  public arenaBgTransition: Phaser.GameObjects.Sprite;
  public arenaPlayer: ArenaBase;
  public arenaPlayerTransition: ArenaBase;
  public arenaEnemy: ArenaBase;
  public arenaNextEnemy: ArenaBase;
  public arena: Arena;
  public gameMode: GameMode;
  public score: integer;
  public lockModifierTiers: boolean;
  public dynamicMode: DynamicMode | null = null;
  public challengeRestrictionActive: DynamicModes = DynamicModes.NONE;
  public trainer: Phaser.GameObjects.Sprite;
  public lastEnemyTrainer: Trainer | null;
  public currentBattle: Battle;
  public pokeballCounts: PokeballCounts;
  public money: integer;
  public pokemonInfoContainer: PokemonInfoContainer;
  private party: PlayerPokemon[];
  /** Combined Biome and Wave count text */
  private biomeWaveText: Phaser.GameObjects.Text;
  private moneyText: Phaser.GameObjects.Text;
  public costToSnatchText: Phaser.GameObjects.Text;
  public costToSnatchContainer: Phaser.GameObjects.Container;
  public costToSnatchIcon: Phaser.GameObjects.Sprite;
  private scoreText: Phaser.GameObjects.Text;
  private luckLabelText: Phaser.GameObjects.Text;
  private luckText: Phaser.GameObjects.Text;
  private modifierBar: ModifierBar;
  private enemyModifierBar: ModifierBar;
  public arenaFlyout: ArenaFlyout;

  private fieldOverlay: Phaser.GameObjects.Rectangle;
  private shopOverlay: Phaser.GameObjects.Rectangle;
  private shopOverlayShown: boolean = false;
  private shopOverlayOpacity: number = .8;

  public modifiers: PersistentModifier[];
  private enemyModifiers: PersistentModifier[];
  public uiContainer: Phaser.GameObjects.Container;
  public ui: UI;

  public seed: string;
  public waveSeed: string;
  public waveCycleOffset: integer;
  public offsetGym: boolean;

  public damageNumberHandler: DamageNumberHandler;
  private spriteSparkleHandler: PokemonSpriteSparkleHandler;

  public fieldSpritePipeline: FieldSpritePipeline;
  public spritePipeline: SpritePipeline;

  private bgm: AnySound;
  private bgmResumeTimer: Phaser.Time.TimerEvent | null;
  private bgmCache: Set<string> = new Set();
  private playTimeTimer: Phaser.Time.TimerEvent;

  public rngCounter: integer = 0;
  public rngSeedOverride: string = "";
  public rngOffset: integer = 0;

  public inputMethod: string;
  private infoToggles: InfoToggle[] = [];
  public rivalWave: integer = 0;

  public eventManager: TimedEventManager;

  /**
   * Allows subscribers to listen for events
   *
   * Current Events:
   * - {@linkcode BattleSceneEventType.MOVE_USED} {@linkcode MoveUsedEvent}
   * - {@linkcode BattleSceneEventType.TURN_INIT} {@linkcode TurnInitEvent}
   * - {@linkcode BattleSceneEventType.TURN_END} {@linkcode TurnEndEvent}
   * - {@linkcode BattleSceneEventType.NEW_ARENA} {@linkcode NewArenaEvent}
   */
  public readonly eventTarget: EventTarget = new EventTarget();

  public majorBossWave: integer = 0;
  public battlePathWave: integer = 1;
  public recoveryBossMode: RecoveryBossMode = RecoveryBossMode.NONE;

  public pathNodeContext: PathNodeContext | null = null;
  public selectedNodeType: PathNodeType | null = null;

  public static currentScene: BattleScene | null = null;

  constructor() {
    super("battle");
    this.phaseQueue = [];
    this.phaseQueuePrepend = [];
    this.conditionalQueue = [];
    this.phaseQueuePrependSpliceIndex = -1;
    this.nextCommandPhaseQueue = [];
    this.updateGameInfo();
  }

  loadPokemonAtlas(key: string, atlasPath: string, experimental?: boolean) {
    if (experimental === undefined) {
      experimental = this.experimentalSprites;
    }
    const variant = atlasPath.includes("variant/") || /_[0-3]$/.test(atlasPath);
    if (experimental) {
      experimental = this.hasExpSprite(key);
    }
    if (variant) {
      atlasPath = atlasPath.replace("variant/", "");
    }
     this.load.embeddedAtlas(
      key, 
      `images/pokemon/${variant ? "variant/" : ""}${experimental ? "exp/" : ""}${atlasPath}.png`
    );
  }

  async preload() {
    if (DEBUG_RNG) {
      const scene = this;
      const originalRealInRange = Phaser.Math.RND.realInRange;
      Phaser.Math.RND.realInRange = function (min: number, max: number): number {
        const ret = originalRealInRange.apply(this, [ min, max ]);
        const args = [ "RNG", ++scene.rngCounter, ret / (max - min), `min: ${min} / max: ${max}` ];
        args.push(`seed: ${scene.rngSeedOverride || scene.waveSeed || scene.seed}`);
        if (scene.rngOffset) {
          args.push(`offset: ${scene.rngOffset}`);
        }
        console.log(...args);
        return ret;
      };
    }

    populateAnims();

    await this.initVariantData();
  }

  create() {
    this.scene.remove(LoadingScene.KEY);
    initGameSpeed.apply(this);
    this.inputController = new InputsController(this);
    this.uiInputs = new UiInputs(this, this.inputController);

    this.gameData = new GameData(this);

    addUiThemeOverrides(this);

    this.load.setBaseURL();

    this.spritePipeline = new SpritePipeline(this.game);
    (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.add("Sprite", this.spritePipeline);

    this.fieldSpritePipeline = new FieldSpritePipeline(this.game);
    (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.add("FieldSprite", this.fieldSpritePipeline);
    this.eventManager = new TimedEventManager();

    this.launchBattle();
  }

  update() {
    this.ui?.update();
    
  }

  launchBattle() {
    BattleScene.currentScene = this;
    this.arenaBg = this.add.sprite(0, 0, "plains_bg");
    this.arenaBg.setName("sprite-arena-bg");
    this.arenaBgTransition = this.add.sprite(0, 0, "plains_bg");
    this.arenaBgTransition.setName("sprite-arena-bg-transition");

    [ this.arenaBgTransition, this.arenaBg ].forEach(a => {
      a.setPipeline(this.fieldSpritePipeline);
      a.setScale(6);
      a.setOrigin(0);
      a.setSize(320, 240);
    });

    const field = this.add.container(0, 0);
    field.setName("field");
    field.setScale(6);

    this.field = field;

    const fieldUI = this.add.container(0, this.game.canvas.height);
    fieldUI.setName("field-ui");
    fieldUI.setDepth(1);
    fieldUI.setScale(6);

    this.fieldUI = fieldUI;

    const transition = this.make.rexTransitionImagePack({
      x: 0,
      y: 0,
      scale: 6,
      key: "loading_bg",
      origin: { x: 0, y: 0 }
    }, true);

    //@ts-ignore (the defined types in the package are incromplete...)
    transition.transit({
      mode: "blinds",
      ease: "Cubic.easeInOut",
      duration: 1250,
    });
    transition.once("complete", () => {
      transition.destroy();
    });

    this.add.existing(transition);

    const uiContainer = this.add.container(0, 0);
    uiContainer.setName("ui");
    uiContainer.setDepth(2);
    uiContainer.setScale(6);

    this.uiContainer = uiContainer;

    const overlayWidth = this.game.canvas.width / 6;
    const overlayHeight = (this.game.canvas.height / 6) - 48;
    this.fieldOverlay = this.add.rectangle(0, overlayHeight * -1 - 48, overlayWidth, overlayHeight, 0x000000);
    this.fieldOverlay.setName("rect-field-overlay");
    this.fieldOverlay.setOrigin(0, 0);
    this.fieldOverlay.setAlpha(0);
    this.fieldUI.add(this.fieldOverlay);

    this.shopOverlay = this.add.rectangle(0, overlayHeight * -1 - 48, overlayWidth, overlayHeight, 0x070707);
    this.shopOverlay.setName("rect-shop-overlay");
    this.shopOverlay.setOrigin(0, 0);
    this.shopOverlay.setAlpha(0);
    this.fieldUI.add(this.shopOverlay);

    this.modifiers = [];
    this.enemyModifiers = [];

    this.modifierBar = new ModifierBar(this);
    this.modifierBar.setName("modifier-bar");
    this.add.existing(this.modifierBar);
    uiContainer.add(this.modifierBar);

    this.enemyModifierBar = new ModifierBar(this, true);
    this.enemyModifierBar.setName("enemy-modifier-bar");
    this.add.existing(this.enemyModifierBar);
    uiContainer.add(this.enemyModifierBar);

    this.charSprite = new CharSprite(this);
    this.charSprite.setName("sprite-char");
    this.charSprite.setup();

    this.fieldUI.add(this.charSprite);

    this.pbTray = new PokeballTray(this, true);
    this.pbTray.setName("pb-tray");
    this.pbTray.setup();

    this.pbTrayEnemy = new PokeballTray(this, false);
    this.pbTrayEnemy.setName("enemy-pb-tray");
    this.pbTrayEnemy.setup();

    this.fieldUI.add(this.pbTray);
    this.fieldUI.add(this.pbTrayEnemy);

    this.abilityBar = new AbilityBar(this);
    this.abilityBar.setName("ability-bar");
    this.abilityBar.setup();
    this.fieldUI.add(this.abilityBar);

    this.partyExpBar = new PartyExpBar(this);
    this.partyExpBar.setName("party-exp-bar");
    this.partyExpBar.setup();
    this.fieldUI.add(this.partyExpBar);

    this.candyBar = new CandyBar(this);
    this.candyBar.setName("candy-bar");
    this.candyBar.setup();
    this.fieldUI.add(this.candyBar);

    this.biomeWaveText = addTextObject(this, (this.game.canvas.width / 6) - 2, 0, startingWave.toString(), TextStyle.BATTLE_INFO, { fontSize: "36px" });
    this.biomeWaveText.setName("text-biome-wave");
    this.biomeWaveText.setOrigin(1, 0.5);
    this.fieldUI.add(this.biomeWaveText);

    this.moneyText = addTextObject(this, (this.game.canvas.width / 6) - 2, 0, "", TextStyle.MONEY, { fontSize: "50px" });
    this.moneyText.setName("text-money");
    this.moneyText.setOrigin(1, 0.5);
    this.fieldUI.add(this.moneyText);

    this.costToSnatchContainer = this.add.container((this.game.canvas.width / 6) - 2, 0);
    this.costToSnatchContainer.setName("container-buypokemon-cost");
    
    this.costToSnatchIcon = this.add.sprite(0, 0, "smitems_192", "permaTrainerSnatchCost");
    this.costToSnatchIcon.setScale(0.1);
    this.costToSnatchIcon.setOrigin(1, 0);
    
    this.costToSnatchText = addTextObject(this, 0-this.costToSnatchIcon.width*0.1+ 1, 0, "", TextStyle.SUMMARY_BLUE, { fontSize: "50px" });
    this.costToSnatchText.setName("text-buypokemon-cost");
    this.costToSnatchText.setOrigin(1, 0);
    
    this.costToSnatchContainer.add([this.costToSnatchIcon, this.costToSnatchText]);
    this.fieldUI.add(this.costToSnatchContainer);

    this.scoreText = addTextObject(this, (this.game.canvas.width / 6) - 2, 0, "", TextStyle.PARTY, { fontSize: "54px" });
    this.scoreText.setName("text-score");
    this.scoreText.setOrigin(1, 0.5);
    this.fieldUI.add(this.scoreText);

    this.luckText = addTextObject(this, (this.game.canvas.width / 6) - 2, 0, "", TextStyle.PARTY, { fontSize: "54px" });
    this.luckText.setName("text-luck");
    this.luckText.setOrigin(1, 0.5);
    this.luckText.setVisible(false);
    this.fieldUI.add(this.luckText);

    this.luckLabelText = addTextObject(this, (this.game.canvas.width / 6) - 2, 0, i18next.t("common:luckIndicator"), TextStyle.PARTY, { fontSize: "54px" });
    this.luckLabelText.setName("text-luck-label");
    this.luckLabelText.setOrigin(1, 0.5);
    this.luckLabelText.setVisible(false);
    this.fieldUI.add(this.luckLabelText);

    this.arenaFlyout = new ArenaFlyout(this);
    this.fieldUI.add(this.arenaFlyout);
    this.fieldUI.moveBelow<Phaser.GameObjects.GameObject>(this.arenaFlyout, this.fieldOverlay);

    this.updateUIPositions();

    this.damageNumberHandler = new DamageNumberHandler();

    this.spriteSparkleHandler = new PokemonSpriteSparkleHandler();
    this.spriteSparkleHandler.setup(this);

    this.pokemonInfoContainer = new PokemonInfoContainer(this, (this.game.canvas.width / 6) + 52, -(this.game.canvas.height / 6) + 66);
    this.pokemonInfoContainer.setup();

    this.fieldUI.add(this.pokemonInfoContainer);

    this.party = [];

    const loadPokemonAssets = [];

    this.arenaPlayer = new ArenaBase(this, true);
    this.arenaPlayer.setName("arena-player");
    this.arenaPlayerTransition = new ArenaBase(this, true);
    this.arenaPlayerTransition.setName("arena-player-transition");
    this.arenaEnemy = new ArenaBase(this, false);
    this.arenaEnemy.setName("arena-enemy");
    this.arenaNextEnemy = new ArenaBase(this, false);
    this.arenaNextEnemy.setName("arena-next-enemy");

    this.arenaBgTransition.setVisible(false);
    this.arenaPlayerTransition.setVisible(false);
    this.arenaNextEnemy.setVisible(false);

    [ this.arenaPlayer, this.arenaPlayerTransition, this.arenaEnemy, this.arenaNextEnemy ].forEach(a => {
      if (a instanceof Phaser.GameObjects.Sprite) {
        a.setOrigin(0, 0);
      }
      field.add(a);
    });

    const trainer = this.addFieldSprite(0, 0, `trainer_${this.gameData.gender === PlayerGender.FEMALE ? "f" : "m"}_back`);
    trainer.setOrigin(0.5, 1);
    trainer.setName("sprite-trainer");

    field.add(trainer);

    this.trainer = trainer;

    this.anims.create({
      key: "prompt",
      frames: this.anims.generateFrameNumbers("prompt", { start: 1, end: 4 }),
      frameRate: 6,
      repeat: -1,
      showOnStart: true
    });

    this.anims.create({
      key: "tera_sparkle",
      frames: this.anims.generateFrameNumbers("tera_sparkle", { start: 0, end: 12 }),
      frameRate: 18,
      repeat: 0,
      showOnStart: true,
      hideOnComplete: true
    });

    this.reset(false, false, true);
    this.showTitleBG();

    const ui = new UI(this);
    this.uiContainer.add(ui);

    this.ui = ui;

    ui.setup();

    const defaultMoves = [ Moves.TACKLE, Moves.TAIL_WHIP, Moves.FOCUS_ENERGY, Moves.STRUGGLE ];

    Promise.all([
      Promise.all(loadPokemonAssets),
      initCommonAnims(this).then(() => loadCommonAnimAssets(this, true)),
      Promise.all([ Moves.TACKLE, Moves.TAIL_WHIP, Moves.FOCUS_ENERGY, Moves.STRUGGLE ].map(m => initMoveAnim(this, m))).then(() => loadMoveAnimAssets(this, defaultMoves, true)),
      this.initStarterColors()
    ]).then(() => {
      this.pushPhase(new LoginPhase(this));
      this.pushPhase(new TitlePhase(this));
      this.shiftPhase();

    });
  }

  initSession(): void {
    if (this.sessionPlayTime === null) {
      this.sessionPlayTime = 0;
    }
    if (this.lastSavePlayTime === null) {
      this.lastSavePlayTime = 0;
    }

    if (this.playTimeTimer) {
      this.playTimeTimer.destroy();
    }

    this.playTimeTimer = this.time.addEvent({
      delay: Utils.fixedInt(1000),
      repeat: -1,
    	callback: () => {
        if (this.gameData) {
          this.gameData.gameStats.playTime++;
        }
        if (this.sessionPlayTime !== null) {
          this.sessionPlayTime++;
        }
        if (this.lastSavePlayTime !== null) {
          this.lastSavePlayTime++;
        }
      }
    });

    this.updateBiomeWaveText();
    this.updateMoneyText();
    this.updateScoreText();

    
  }

  async initExpSprites(): Promise<void> {
    if (expSpriteKeys.length) {
      return;
    }
    this.cachedFetch("./exp-sprites.json").then(res => res.json()).then(keys => {
      if (Array.isArray(keys)) {
        expSpriteKeys.push(...keys);
      }
      Promise.resolve();
    });
  }

  async initVariantData(): Promise<void> {
    Object.keys(variantData).forEach(key => delete variantData[key]);
    await this.cachedFetch("./images/pokemon/variant/_masterlist.json").then(res => res.json())
      .then(v => {
        Object.keys(v).forEach(k => variantData[k] = v[k]);
        if (this.experimentalSprites) {
          const expVariantData = variantData["exp"];
          const traverseVariantData = (keys: string[]) => {
            let variantTree = variantData;
            let expTree = expVariantData;
            keys.map((k: string, i: integer) => {
              if (i < keys.length - 1) {
                variantTree = variantTree[k];
                expTree = expTree[k];
              } else if (variantTree.hasOwnProperty(k) && expTree.hasOwnProperty(k)) {
                if ([ "back", "female" ].includes(k)) {
                  traverseVariantData(keys.concat(k));
                } else {
                  variantTree[k] = expTree[k];
                }
              }
            });
          };
          Object.keys(expVariantData).forEach(ek => traverseVariantData([ ek ]));
        }
        Promise.resolve();
      });
  }

  cachedFetch(url: string, init?: RequestInit): Promise<Response> {
    const manifest = this.game["manifest"];
    if (manifest) {
      const timestamp = manifest[`/${url.replace("./", "")}`];
      if (timestamp) {
        url += `?t=${timestamp}`;
      }
    }
        return fetch(url, init);
    return caches.match(url).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(url, init).catch(() => new Response(null, { status: 404 }));
    });
  }

  initStarterColors(): Promise<void> {
    return new Promise(resolve => {
      if (starterColors) {
        return resolve();
      }

      this.cachedFetch("./starter-colors.json").then(res => res.json()).then(sc => {
        starterColors = {};
        Object.keys(sc).forEach(key => {
          starterColors[key] = sc[key];
        });

        resolve();
      });
    });
  }

  hasExpSprite(key: string): boolean {
    const keyMatch = /^pkmn__?(back__)?(shiny__)?(female__)?(\d+)(\-.*?)?(?:_[1-3])?$/g.exec(key);
    if (!keyMatch) {
      return false;
    }

    let k = keyMatch[4]!;
    if (keyMatch[2]) {
      k += "s";
    }
    if (keyMatch[1]) {
      k += "b";
    }
    if (keyMatch[3]) {
      k += "f";
    }
    if (keyMatch[5]) {
      k += keyMatch[5];
    }
    if (!expSpriteKeys.includes(k)) {
      return false;
    }
    return true;
  }

  getParty(): PlayerPokemon[] {
    return this.party;
  }

  replacePlayerPokemon(partyIndex: integer, newPokemon: PlayerPokemon): PlayerPokemon | null {
    if (partyIndex < 0 || partyIndex >= this.party.length) {
      return null;
    }

    const replacedPokemon = this.party[partyIndex];
    this.removePartyMemberModifiers(partyIndex);
    this.party[partyIndex] = newPokemon;
    this.updateModifiers(true);
    return replacedPokemon;
  }

  getPlayerPokemon(): PlayerPokemon | undefined {
    return this.getPlayerField().find(p => p.isActive());
  }

  /**
   * Returns an array of PlayerPokemon of length 1 or 2 depending on if double battles or not
   * @returns array of {@linkcode PlayerPokemon}
   */
  getPlayerField(): PlayerPokemon[] {
    const party = this.getParty();
    return party.slice(0, Math.min(party.length, this.currentBattle?.double ? 2 : 1));
  }

  getEnemyParty(): EnemyPokemon[] {
    return this.currentBattle?.enemyParty || [];
  }

  getEnemyPokemon(): EnemyPokemon | undefined {
    return this.getEnemyField().find(p => p.isActive());
  }

  /**
   * Returns an array of EnemyPokemon of length 1 or 2 depending on if double battles or not
   * @returns array of {@linkcode EnemyPokemon}
   */
  getEnemyField(): EnemyPokemon[] {
    const party = this.getEnemyParty();
    return party.slice(0, Math.min(party.length, this.currentBattle?.double ? 2 : 1));
  }

  getField(activeOnly: boolean = false): Pokemon[] {
    const ret = new Array(4).fill(null);
    const playerField = this.getPlayerField();
    const enemyField = this.getEnemyField();
    ret.splice(0, playerField.length, ...playerField);
    ret.splice(2, enemyField.length, ...enemyField);
    return activeOnly
      ? ret.filter(p => p?.isActive())
      : ret;
  }

  /**
   * Used in doubles battles to redirect moves from one pokemon to another when one faints or is removed from the field
   * @param removedPokemon {@linkcode Pokemon} the pokemon that is being removed from the field (flee, faint), moves to be redirected FROM
   * @param allyPokemon {@linkcode Pokemon} the pokemon that will have the moves be redirected TO
   */
  redirectPokemonMoves(removedPokemon: Pokemon, allyPokemon: Pokemon): void {
    // failsafe: if not a double battle just return
    if (this.currentBattle.double === false) {
      return;
    }
    if (allyPokemon?.isActive(true)) {
      let targetingMovePhase: MovePhase;
      do {
        targetingMovePhase = this.findPhase(mp => mp instanceof MovePhase && mp.targets.length === 1 && mp.targets[0] === removedPokemon.getBattlerIndex() && mp.pokemon.isPlayer() !== allyPokemon.isPlayer()) as MovePhase;
        if (targetingMovePhase && targetingMovePhase.targets[0] !== allyPokemon.getBattlerIndex()) {
          targetingMovePhase.targets[0] = allyPokemon.getBattlerIndex();
        }
      } while (targetingMovePhase);
    }
  }

  /**
   * Returns the ModifierBar of this scene, which is declared private and therefore not accessible elsewhere
   * @param isEnemy Whether to return the enemy's modifier bar
   * @returns {ModifierBar}
   */
  getModifierBar(isEnemy?: boolean): ModifierBar {
    return isEnemy ? this.enemyModifierBar : this.modifierBar;
  }

  // store info toggles to be accessible by the ui
  addInfoToggle(infoToggle: InfoToggle): void {
    this.infoToggles.push(infoToggle);
  }

  // return the stored info toggles; used by ui-inputs
  getInfoToggles(activeOnly: boolean = false): InfoToggle[] {
    return activeOnly ? this.infoToggles.filter(t => t?.isActive()) : this.infoToggles;
  }

  getPokemonById(pokemonId: integer): Pokemon | null {
    const findInParty = (party: Pokemon[]) => party.find(p => p.id === pokemonId);
    return (findInParty(this.getParty()) || findInParty(this.getEnemyParty())) ?? null;
  }

  addPlayerPokemon(species: PokemonSpecies, level: integer, abilityIndex?: integer, formIndex?: integer, gender?: Gender, shiny?: boolean, variant?: Variant, ivs?: integer[], nature?: Nature, dataSource?: Pokemon | PokemonData, postProcess?: (playerPokemon: PlayerPokemon) => void): PlayerPokemon {
    const pokemon = new PlayerPokemon(this, species, level, abilityIndex, formIndex, gender, shiny, variant, ivs, nature, dataSource);
    if (postProcess) {
      postProcess(pokemon);
    }
    pokemon.init();
    return pokemon;
  }

  addEnemyPokemon(species: PokemonSpecies, level: integer, trainerSlot: TrainerSlot, boss: boolean = false, dataSource?: PokemonData, postProcess?: (enemyPokemon: EnemyPokemon) => void): EnemyPokemon {
    if (Overrides.OPP_SPECIES_OVERRIDE) {
      species = getPokemonSpecies(Overrides.OPP_SPECIES_OVERRIDE);
    }

    if (Overrides.OPP_LEVEL_OVERRIDE !== 0) {
      level = Overrides.OPP_LEVEL_OVERRIDE;
    }

    const pokemon = new EnemyPokemon(this, species, level, trainerSlot, boss, dataSource);

    overrideModifiers(this, false);
    overrideHeldItems(this, pokemon, false);
    if (boss && !dataSource) {
      const secondaryIvs = Utils.getIvsFromId(Utils.randSeedInt(4294967295));

      for (let s = 0; s < pokemon.ivs.length; s++) {
        pokemon.ivs[s] = Math.round(Phaser.Math.Linear(Math.min(pokemon.ivs[s], secondaryIvs[s]), Math.max(pokemon.ivs[s], secondaryIvs[s]), 0.75));
      }
    }
    if (postProcess) {
      postProcess(pokemon);
    }

    for (let i = 0; i < pokemon.ivs.length; i++) {
      if (OPP_IVS_OVERRIDE_VALIDATED[i] > -1) {
        pokemon.ivs[i] = OPP_IVS_OVERRIDE_VALIDATED[i];
      }
    }

    pokemon.init();
    return pokemon;
  }

  addPokemonIcon(pokemon: Pokemon, x: number, y: number, originX: number = 0.5, originY: number = 0.5, ignoreOverride: boolean = false): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setName(`${pokemon.name}-icon`);

    const iconAtlasKey = pokemon.getIconAtlasKey(ignoreOverride);
    const iconID = pokemon.getIconId(false);

    const icon = this.add.sprite(0, 0, iconAtlasKey);
    icon.setName(`sprite-${pokemon.name}-icon`);
    
    if (iconAtlasKey.startsWith("pokemon_icons_mod_")) {
      icon.setOrigin(0.5, 0);
    } else {
      icon.setFrame(iconID);
      if (icon.frame.name !== iconID) {
        console.log(`${pokemon.name}'s variant icon does not exist. Replacing with default.`);
        const temp = pokemon.shiny;
        pokemon.shiny = false;
        icon.setTexture(pokemon.getIconAtlasKey(ignoreOverride));
        icon.setFrame(pokemon.getIconId(false));
        pokemon.shiny = temp;
      }
      icon.setOrigin(0.5, 0);
    }

    container.add(icon);

    if (pokemon.isFusion()) {
      const fusionIcon = this.add.sprite(0, 0, pokemon.getFusionIconAtlasKey(ignoreOverride));
      fusionIcon.setName("sprite-fusion-icon");
      fusionIcon.setOrigin(0.5, 0);
      fusionIcon.setFrame(pokemon.getFusionIconId(true));

      const originalWidth = icon.width;
      const originalHeight = icon.height;
      const originalFrame = icon.frame;

      const iconHeight = (icon.frame.cutHeight <= fusionIcon.frame.cutHeight ? Math.ceil : Math.floor)((icon.frame.cutHeight + fusionIcon.frame.cutHeight) / 4);

      // Inefficient, but for some reason didn't work with only the unique properties as part of the name
      const iconFrameId = `${icon.frame.name}f${fusionIcon.frame.name}`;

      if (!icon.frame.texture.has(iconFrameId)) {
        icon.frame.texture.add(iconFrameId, icon.frame.sourceIndex, icon.frame.cutX, icon.frame.cutY, icon.frame.cutWidth, iconHeight);
      }

      icon.setFrame(iconFrameId);

      fusionIcon.y = icon.frame.cutHeight;

      const originalFusionFrame = fusionIcon.frame;

      const fusionIconY = fusionIcon.frame.cutY + icon.frame.cutHeight;
      const fusionIconHeight = fusionIcon.frame.cutHeight - icon.frame.cutHeight;

      // Inefficient, but for some reason didn't work with only the unique properties as part of the name
      const fusionIconFrameId = `${fusionIcon.frame.name}f${icon.frame.name}`;

      if (!fusionIcon.frame.texture.has(fusionIconFrameId)) {
        fusionIcon.frame.texture.add(fusionIconFrameId, fusionIcon.frame.sourceIndex, fusionIcon.frame.cutX, fusionIconY, fusionIcon.frame.cutWidth, fusionIconHeight);
      }
      fusionIcon.setFrame(fusionIconFrameId);

      const frameY = (originalFrame.y + originalFusionFrame.y) / 2;
      icon.frame.y = fusionIcon.frame.y = frameY;

      container.add(fusionIcon);

      if (originX !== 0.5) {
        container.x -= originalWidth * (originX - 0.5);
      }
      if (originY !== 0) {
        container.y -= (originalHeight) * originY;
      }
    } else {
      if (originX !== 0.5) {
        container.x -= icon.width * (originX - 0.5);
      }
      if (originY !== 0) {
        container.y -= icon.height * originY;
      }
    }

    return container;
  }

  setSeed(seed: string): void {
    this.seed = seed;
    this.rngCounter = 0;
    this.waveCycleOffset = this.getGeneratedWaveCycleOffset();
    this.offsetGym = this.gameMode.isClassic && this.getGeneratedOffsetGym();

  }

  randBattleSeedInt(range: integer, min: integer = 0): integer {
    return this.currentBattle?.randSeedInt(this, range, min);
  }

  showTitleBG() {
    this.arenaBg.setTexture("title_bg");
    this.arenaBg.setScale(1);
    this.arenaBg.setOrigin(0);
    this.arenaBg.setSize(1920, 1080);
    this.arenaBg.setPosition(0, 0);
    this.arenaBg.setTint(0xFFFFFF);
    this.arenaBg.setPipeline('INVERT');
  }


  reset(clearScene: boolean = false, clearData: boolean = false, reloadI18n: boolean = false): void {
    if (clearData) {
      this.gameData = new GameData(this);
    }

    if (this.gameData) {
      this.gameData.resetBattlePathData();
    }
    
    this.battlePathWave = 1;
    this.pathNodeContext = null;
    this.selectedNodeType = null;

    this.gameMode = getGameMode(GameModes.CLASSIC);

    this.setSeed(Overrides.SEED_OVERRIDE || Utils.randomString(24));
    console.log('Seed:', this.seed);

    this.disableMenu = false;

    this.score = 0;
    this.money = 0;

    this.lockModifierTiers = false;

    this.pokeballCounts = Object.fromEntries(Utils.getEnumValues(PokeballType).filter(p => p <= PokeballType.MASTER_BALL).map(t => [ t, 0 ]));
    this.pokeballCounts[PokeballType.POKEBALL] += 5;

    if (Overrides.POKEBALL_OVERRIDE.active) {
      this.pokeballCounts = Overrides.POKEBALL_OVERRIDE.pokeballs;
    }

    this.modifiers = [];
    this.enemyModifiers = [];
    this.modifierBar.removeAll(true);
    this.enemyModifierBar.removeAll(true);

    for (const p of this.getParty()) {
      p.destroy();
    }
    this.party = [];
    for (const p of this.getEnemyParty()) {
      p.destroy();
    }

    //@ts-ignore  - allowing `null` for currentBattle causes a lot of trouble
    this.currentBattle = null; // TODO: resolve ts-ignore
    this.majorBossWave = 0;

    this.biomeWaveText.setText(startingWave.toString());
    this.biomeWaveText.setVisible(false);

    this.updateMoneyText();
    this.moneyText.setVisible(false);
    this.costToSnatchContainer.setVisible(false);

    this.updateScoreText();
    this.scoreText.setVisible(false);

    [ this.luckLabelText, this.luckText ].map(t => t.setVisible(false));

    this.newArena(Overrides.STARTING_BIOME_OVERRIDE || Biome.TOWN);

    this.field.setVisible(true);

    this.arenaBgTransition.setPosition(0, 0);
    this.arenaPlayer.setPosition(300, 0);
    this.arenaPlayerTransition.setPosition(0, 0);
    [ this.arenaEnemy, this.arenaNextEnemy ].forEach(a => a.setPosition(-280, 0));
    this.arenaNextEnemy.setVisible(false);

    this.arena.init();

    this.trainer.setTexture(`trainer_${this.gameData.gender === PlayerGender.FEMALE ? "f" : "m"}_back`);
    this.trainer.setPosition(406, 186);
    this.trainer.setVisible(true);

    this.updateGameInfo();

    if (reloadI18n) {
      const localizable: Localizable[] = [
        ...allSpecies,
        ...allMoves,
        ...allAbilities,
        ...Utils.getEnumValues(ModifierPoolType).map(mpt => getModifierPoolForType(mpt)).map(mp => Object.values(mp).flat().map(mt => mt.modifierType).filter(mt => "localize" in mt).map(lpb => lpb as unknown as Localizable)).flat()
      ];
      for (const item of localizable) {
        item.localize();
      }
    }

    if (clearScene) {
      // Reload variant data in case sprite set has changed
      this.initVariantData();

      this.fadeOutBgm(250, false);
      this.tweens.add({
        targets: [ this.uiContainer ],
        alpha: 0,
        duration: 250,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.clearPhaseQueue();

          this.children.removeAll(true);
          this.game.domContainer.innerHTML = "";
          this.launchBattle();
        }
      });
    }
  }

  newBattle(waveIndex?: integer, battleType?: BattleType, trainerData?: TrainerData, double?: boolean): Battle | null {
    const isFirstBattle = !this.currentBattle;
    const _startingWave = Overrides.STARTING_WAVE_OVERRIDE || startingWave;
    const newWaveIndex = waveIndex || ((this.currentBattle?.waveIndex || (_startingWave - 1)) + 1);
    let newDouble: boolean | undefined;
    let newBattleType: BattleType;
    let newTrainer: Trainer | undefined;

    let battleConfig: FixedBattleConfig | null = null;

  this.resetSeed(newWaveIndex);

    if (isFirstBattle) {
      this.arenaBg.setScale(6);
      this.arenaBg.setSize(320, 240);
      this.arenaBg.setPosition(0, 0);
      this.arenaBg.setOrigin(0, 0);
    }

    const playerField = this.getPlayerField();

    if ((this.gameMode.isChaosMode && this.gameMode.chaosBattleConfig) || (this.gameMode.isFixedBattle(newWaveIndex) && trainerData === undefined)) {
      battleConfig = this.gameMode.getFixedBattle(newWaveIndex, this.gameMode.isChaosMode);
      newDouble = battleConfig.double;
      newBattleType = battleConfig.battleType;
      this.executeWithSeedOffset(() => newTrainer = battleConfig?.getTrainer(this), (battleConfig.seedOffsetWaveIndex || newWaveIndex) << 8);
      if (newTrainer) {
        this.field.add(newTrainer);
      }
    }
    else {
      if (!this.gameMode.hasTrainers) {
        newBattleType = BattleType.WILD;
      }
      else if (battleType === undefined) {
        newBattleType = this.gameMode.isWaveTrainer(newWaveIndex, this.arena) ? BattleType.TRAINER : BattleType.WILD;
      }
      else {
        newBattleType = battleType;
      }

      if (newBattleType === BattleType.TRAINER) {
        const trainerType = this.arena.randomTrainerType(newWaveIndex);
        let doubleTrainer = false;
        newTrainer = trainerData !== undefined ? trainerData.toTrainer(this) : new Trainer(this, trainerType, doubleTrainer ? TrainerVariant.DOUBLE : Utils.randSeedInt(2) ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT, undefined, undefined, undefined, undefined, undefined, this.gameMode.isNightmare && newWaveIndex > 400);
        this.field.add(newTrainer);
      }
    }

    if (double === undefined && newWaveIndex > 1) {
      if (newBattleType === BattleType.WILD && !this.gameMode.isWaveFinal(newWaveIndex)) {
        const doubleChance = new Utils.IntegerHolder(newWaveIndex % 10 === 0 ? 32 : 8);
        this.applyModifiers(DoubleBattleChanceBoosterModifier, true, doubleChance);
        playerField.forEach(p => applyAbAttrs(DoubleBattleChanceAbAttr, p, null, false, doubleChance));
        newDouble = !Utils.randSeedInt(doubleChance.value);

      } else if (newBattleType === BattleType.TRAINER) {
        newDouble = newTrainer?.variant === TrainerVariant.DOUBLE;
      }
    } else if (!battleConfig) {
      newDouble = !!double;
    }

    if (Overrides.BATTLE_TYPE_OVERRIDE === "double") {
      newDouble = true;
    }
    /* Override battles into single only if not fighting with trainers */
    if (newBattleType !== BattleType.TRAINER && Overrides.BATTLE_TYPE_OVERRIDE === "single") {
      newDouble = false;
    }

    const lastBattle = this.currentBattle;

    if (lastBattle?.double && !newDouble) {
      this.tryRemovePhase(p => p instanceof SwitchPhase);
    }

    // const maxExpLevel = this.getMaxExpLevel();

    this.lastEnemyTrainer = lastBattle?.trainer ?? null;

    newDouble = false;

    this.executeWithSeedOffset(() => {
      this.currentBattle = new Battle(this.gameMode, newWaveIndex, newBattleType, newTrainer, newDouble, this);
    }, newWaveIndex << 3, this.waveSeed);
    this.currentBattle.incrementTurn(this);

    if ((!waveIndex && !this.gameMode.isChaosMode) && lastBattle) {
      this.handleBiomeChange(newWaveIndex, lastBattle);
    }

    this.gameMode.setChaosBattleConfig(undefined);
    return this.currentBattle;
  }

  isBiomeChange(previousWave: integer): boolean {
    return previousWave > 0 && ((!(previousWave % 10) && !this.gameMode.isChaosMode) || (this.recoveryBossMode === RecoveryBossMode.RECOVERY_OBTAINED) || (previousWave % Utils.randSeedInt(6,3) === 0 && previousWave < 100) || ((this.gameMode.hasShortBiomes || this.gameMode.isDaily) && (previousWave % 50) === 49))
  }

  saveBiomeChange(previousWave: integer): void {
    const biomeChange = this.gameData.biomeChange;
    const newBiomeChange = this.isBiomeChange(previousWave) ? BiomeChange.CHANGE_BIOME : biomeChange;
    this.gameData.biomeChange = newBiomeChange;
  }

  handleBiomeChange(newWaveIndex: integer, lastBattle: Battle, isChaosMode: boolean = false): void {
    let triggerLevelCapPhase = false;
    let maxExpLevel = 10;
    if(!isChaosMode) {
      const oldWaveIndex = this.currentBattle.waveIndex;
      this.currentBattle.waveIndex = lastBattle.waveIndex;
      maxExpLevel = this.getMaxExpLevel();
      this.currentBattle.waveIndex = oldWaveIndex;
    }
    else {
      triggerLevelCapPhase = lastBattle.waveIndex < (newWaveIndex - (newWaveIndex % 10) + 1);
    }
    let isNewBiome = this.gameData.biomeChange !== BiomeChange.NONE || this.isBiomeChange(lastBattle.waveIndex);
    if (!isNewBiome && this.gameMode.hasShortBiomes && (lastBattle.waveIndex % 10) < 9) {
      let w = lastBattle.waveIndex - ((lastBattle.waveIndex % 10) - 1);
      let biomeWaves = 1;
      while (w < lastBattle.waveIndex) {
        let wasNewBiome = false;
        this.executeWithSeedOffset(() => {
          wasNewBiome = !Utils.randSeedInt(6 - biomeWaves);
        }, w << 4);
        if (wasNewBiome) {
          biomeWaves = 1;
        } else {
          biomeWaves++;
        }
        w++;
      }

      this.executeWithSeedOffset(() => {
        isNewBiome = !Utils.randSeedInt(6 - biomeWaves);
      }, lastBattle.waveIndex << 4);
    }
    const resetArenaState = isNewBiome || this.currentBattle.battleType === BattleType.TRAINER || this.currentBattle.battleSpec === BattleSpec.FINAL_BOSS;
    lastBattle.enemyParty.forEach(enemyPokemon => enemyPokemon.destroy(true));
    if(lastBattle.trainer) {
      lastBattle.trainer.destroy();
    }
    this.trySpreadPokerus();
    if (!isNewBiome && (newWaveIndex % 10) === 5) {
      this.arena.updatePoolsForTimeOfDay();
    }
    if (resetArenaState) {
      this.arena.resetArenaEffects();
      const playerField = this.getPlayerField();
      playerField.forEach((_, p) => this.pushPhase(new ReturnPhase(this, p)));

      for (const pokemon of this.getParty()) {
        pokemon.resetBattleData();
        applyPostBattleInitAbAttrs(PostBattleInitAbAttr, pokemon);
      }

      this.pushPhase(new ShowTrainerPhase(this));
    }
    for (const pokemon of this.getParty()) {
        this.triggerPokemonFormChange(pokemon, SpeciesFormChangeTimeOfDayTrigger);
      }

    if (!this.gameMode.hasRandomBiomes && !isNewBiome) {
      if(!isChaosMode) {
        this.pushPhase(new NextEncounterPhase(this));
      }
    } else {
      this.pushPhase(new SelectBiomePhase(this));
      if(!isChaosMode) {
        this.pushPhase(new NewBiomeEncounterPhase(this));
      const newMaxExpLevel = this.getMaxExpLevel();
        if (newMaxExpLevel > maxExpLevel || this.gameMode.isNightmare) {
          this.pushPhase(new LevelCapPhase(this));
        }
      }
    }
    if(triggerLevelCapPhase) {
      this.pushPhase(new LevelCapPhase(this));
    }
  }

  newArena(biome: Biome): Arena {
    this.arena = new Arena(this, biome, Biome[biome].toLowerCase());
    this.eventTarget.dispatchEvent(new NewArenaEvent());

    this.arenaBg.pipelineData = { terrainColorRatio: this.arena.getBgTerrainColorRatioForBiome() };

    return this.arena;
  }

  updateFieldScale(): Promise<void> {
    return new Promise(resolve => {
      const fieldScale = Math.floor(Math.pow(1 / this.getField(true)
        .map(p => p.getSpriteScale(true))
        .reduce((highestScale: number, scale: number) => highestScale = Math.max(scale, highestScale), 0), 0.7) * 40
      ) / 40;
      this.setFieldScale(fieldScale).then(() => resolve());
    });
  }

  setFieldScale(scale: number, instant: boolean = false): Promise<void> {
    return new Promise(resolve => {
      scale *= 6;
      if (this.field.scale === scale) {
        return resolve();
      }

      const defaultWidth = this.arenaBg.width * 6;
      const defaultHeight = 132 * 6;
      const scaledWidth = this.arenaBg.width * scale;
      const scaledHeight = 132 * scale;

      this.tweens.add({
        targets: this.field,
        scale: scale,
        x: (defaultWidth - scaledWidth) / 2,
        y: defaultHeight - scaledHeight,
        duration: !instant ? Utils.fixedInt(Math.abs(this.field.scale - scale) * 200) : 0,
        ease: "Sine.easeInOut",
        onComplete: () => resolve()
      });
    });
  }

  getSpeciesFormIndex(species: PokemonSpecies, gender?: Gender, nature?: Nature, ignoreArena?: boolean): integer {
    if (!species.forms?.length) {
      return 0;
    }

    switch (species.speciesId) {
    case Species.UNOWN:
      return Utils.randSeedInt(species.forms.length - 1);
    case Species.SHELLOS:
    case Species.GASTRODON:
    case Species.BASCULIN:
    case Species.DEERLING:
    case Species.SAWSBUCK:
    case Species.FROAKIE:
    case Species.FROGADIER:
    case Species.SCATTERBUG:
    case Species.SPEWPA:
    case Species.VIVILLON:
    case Species.FLABEBE:
    case Species.FLOETTE:
    case Species.FLORGES:
    case Species.FURFROU:
    case Species.PUMPKABOO:
    case Species.GOURGEIST:
    case Species.ORICORIO:
    case Species.MAGEARNA:
    case Species.ZARUDE:
    case Species.SQUAWKABILLY:
    case Species.TATSUGIRI:
    case Species.GIMMIGHOUL:
    case Species.PALDEA_TAUROS:
      return Utils.randSeedInt(species.forms.length);
    case Species.PIKACHU:
      return Utils.randSeedInt(8);
    case Species.EEVEE:
      return Utils.randSeedInt(2);
    case Species.GRENINJA:
      return Utils.randSeedInt(2);
    case Species.ZYGARDE:
      return Utils.randSeedInt(3);
    case Species.MINIOR:
      return Utils.randSeedInt(6);
    case Species.ALCREMIE:
      return Utils.randSeedInt(9);
    case Species.MEOWSTIC:
    case Species.INDEEDEE:
    case Species.BASCULEGION:
    case Species.OINKOLOGNE:
      return gender === Gender.FEMALE ? 1 : 0;
    case Species.TOXTRICITY:
      const lowkeyNatures = [ Nature.LONELY, Nature.BOLD, Nature.RELAXED, Nature.TIMID, Nature.SERIOUS, Nature.MODEST, Nature.MILD, Nature.QUIET, Nature.BASHFUL, Nature.CALM, Nature.GENTLE, Nature.CAREFUL ];
      if (nature !== undefined && lowkeyNatures.indexOf(nature) > -1) {
        return 1;
      }
      return 0;
    }

    if (ignoreArena) {
      switch (species.speciesId) {
      case Species.BURMY:
      case Species.WORMADAM:
      case Species.ROTOM:
      case Species.LYCANROC:
        return Utils.randSeedInt(species.forms.length);
      }
      return 0;
    }

    return this.arena.getSpeciesFormIndex(species);
  }

  private getGeneratedOffsetGym(): boolean {
    let ret = false;
    this.executeWithSeedOffset(() => {
      ret = !Utils.randSeedInt(2);
    }, 0, this.seed.toString());
    return ret;
  }

  private getGeneratedWaveCycleOffset(): integer {
    let ret = 0;
    this.executeWithSeedOffset(() => {
      ret = Utils.randSeedInt(8) * 5;
    }, 0, this.seed.toString());
    return ret;
  }

  getEncounterBossSegments(waveIndex: integer, level: integer, species?: PokemonSpecies, forceBoss: boolean = false): integer {
    if (this.gameMode.isDaily && this.gameMode.isWaveFinal(waveIndex)) {
      return 5;
    }

    let _waveIndex = waveIndex;
    let hundredthCycle = 0;
    if (this.gameMode.isNightmare) {
      _waveIndex = waveIndex % 100;
      hundredthCycle = Math.floor(waveIndex / 100);
    }

    let isBoss: boolean | undefined;
    if (forceBoss || (species && (species.isLegendSubOrMystical()))) {
      isBoss = true;
    } else {
      this.executeWithSeedOffset(() => {
        isBoss = _waveIndex % 10 === 0 || (this.gameMode.hasRandomBosses && Utils.randSeedInt(100) < Math.min(Math.max(Math.ceil((_waveIndex - 250) / 50), 0) * 2, 30)) || this.recoveryBossMode === RecoveryBossMode.FACING_BOSS;
      }, _waveIndex << 2);
    }
    if (!isBoss) {
      return 0;
    }

    let ret: integer = 2;

    if (level >= 100) {
      ret++;
    }
    if (species) {
      if (species.baseTotal >= 670) {
        ret++;
      }
    }
    ret += Math.floor(_waveIndex / 250);

    if (this.gameMode.isNightmare) {
      ret += hundredthCycle;
    } else if (_waveIndex > 50) {
      ret += 1;
    }

    if (this.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {
      ret += 1;
    }

    if(this.gameMode.isChaosMode && this.currentBattle.waveIndex > 300 && this.currentBattle.battleType === BattleType.TRAINER) {
      return 2;
    }

    return ret;
  }

  trySpreadPokerus(): void {
    const party = this.getParty();
    const infectedIndexes: integer[] = [];
    const spread = (index: number, spreadTo: number) => {
      const partyMember = party[index + spreadTo];
      if (!partyMember.pokerus && !Utils.randSeedInt(10)) {
        partyMember.pokerus = true;
        infectedIndexes.push(index + spreadTo);
      }
    };
    party.forEach((pokemon, p) => {
      if (!pokemon.pokerus || infectedIndexes.indexOf(p) > -1) {
        return;
      }

      this.executeWithSeedOffset(() => {
        if (p) {
          spread(p, -1);
        }
        if (p < party.length - 1) {
          spread(p, 1);
        }
      }, this.currentBattle.waveIndex + (p << 8));
    });
  }

  resetSeed(waveIndex?: integer): void {
    const wave = waveIndex || this.currentBattle?.waveIndex || 0;
    this.waveSeed = Utils.shiftCharCodes(this.seed, wave);
    Phaser.Math.RND.sow([ this.waveSeed ]);
    this.rngCounter = 0;
  }

  executeWithSeedOffset(func: Function, offset: integer, seedOverride?: string): void {
    if (!func) {
      return;
    }
    const tempRngCounter = this.rngCounter;
    const tempRngOffset = this.rngOffset;
    const tempRngSeedOverride = this.rngSeedOverride;
    const state = Phaser.Math.RND.state();
    Phaser.Math.RND.sow([ Utils.shiftCharCodes(seedOverride || this.seed, offset) ]);
    this.rngCounter = 0;
    this.rngOffset = offset;
    this.rngSeedOverride = seedOverride || "";
    func();
    Phaser.Math.RND.state(state);
    this.rngCounter = tempRngCounter;
    this.rngOffset = tempRngOffset;
    this.rngSeedOverride = tempRngSeedOverride;
  }

  addFieldSprite(x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number, terrainColorRatio: number = 0): Phaser.GameObjects.Sprite {
    const ret = this.add.sprite(x, y, texture, frame);
    ret.setPipeline(this.fieldSpritePipeline);
    if (terrainColorRatio) {
      ret.pipelineData["terrainColorRatio"] = terrainColorRatio;
    }

    return ret;
  }

  addPokemonSprite(pokemon: Pokemon, x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number, hasShadow: boolean = false, ignoreOverride: boolean = false): Phaser.GameObjects.Sprite {
    const ret = this.addFieldSprite(x, y, texture, frame);
    this.initPokemonSprite(ret, pokemon, hasShadow, ignoreOverride);
    return ret;
  }

  initPokemonSprite(sprite: Phaser.GameObjects.Sprite, pokemon?: Pokemon, hasShadow: boolean = false, ignoreOverride: boolean = false): Phaser.GameObjects.Sprite {
    const shouldHaveShadow = !!hasShadow && !pokemon?.isGlitchOrSmittyForm();
    sprite.setPipeline(this.spritePipeline, { tone: [ 0.0, 0.0, 0.0, 0.0 ], hasShadow: shouldHaveShadow, ignoreOverride: ignoreOverride, teraColor: pokemon ? getTypeRgb(pokemon.getTeraType()) : undefined });
    this.spriteSparkleHandler.add(sprite);
    return sprite;
  }

  moveBelowOverlay<T extends Phaser.GameObjects.GameObject>(gameObject: T) {
    this.fieldUI.moveBelow<any>(gameObject, this.fieldOverlay);
  }
  processInfoButton(pressed: boolean): void {
    this.arenaFlyout.toggleFlyout(pressed);
  }

  showFieldOverlay(duration: integer): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        targets: this.fieldOverlay,
        alpha: 0.85,
        ease: "Sine.easeOut",
        duration: duration,
        onComplete: () => resolve()
      });
    });
  }

  hideFieldOverlay(duration: integer): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        targets: this.fieldOverlay,
        alpha: 0,
        duration: duration,
        ease: "Cubic.easeIn",
        onComplete: () => resolve()
      });
    });
  }

  updateShopOverlayOpacity(value: number): void {
    this.shopOverlayOpacity = value;

    if (this.shopOverlayShown) {
      this.shopOverlay.setAlpha(this.shopOverlayOpacity);
    }
  }

  showShopOverlay(duration: integer): Promise<void> {
    this.shopOverlayShown = true;
    return new Promise(resolve => {
      this.tweens.add({
        targets: this.shopOverlay,
        alpha: this.shopOverlayOpacity,
        ease: "Sine.easeOut",
        duration,
        onComplete: () => resolve()
      });
    });
  }

  hideShopOverlay(duration: integer): Promise<void> {
    this.shopOverlayShown = false;
    return new Promise(resolve => {
      this.tweens.add({
        targets: this.shopOverlay,
        alpha: 0,
        duration: duration,
        ease: "Cubic.easeIn",
        onComplete: () => resolve()
      });
    });
  }

  showEnemyModifierBar(): void {
    this.enemyModifierBar.setVisible(true);
  }

  hideEnemyModifierBar(): void {
    this.enemyModifierBar.setVisible(false);
  }

  updateBiomeWaveText(forceWaveIndex: integer = undefined): void {
    const isBoss = !(forceWaveIndex || this.currentBattle.waveIndex % 10);
    const biomeString: string = getBiomeName(this.arena.biomeType);
    this.fieldUI.moveAbove(this.biomeWaveText, this.luckText);
    this.biomeWaveText.setText( biomeString + " - " + (forceWaveIndex || this.currentBattle.waveIndex).toString());
    this.biomeWaveText.setColor(!isBoss ? "#ffffff" : "#f89890");
    this.biomeWaveText.setShadowColor(!isBoss ? "#636363" : "#984038");
    this.biomeWaveText.setVisible(true);
  }

  updateMoneyText(forceVisible: boolean = true): void {
    if (this.money === undefined) {
      return;
    }
    const formattedMoney = Utils.formatMoney(this.moneyFormat, this.money);
    this.moneyText.setText(i18next.t("battleScene:moneyOwned", { formattedMoney }));
    this.fieldUI.moveAbove(this.moneyText, this.luckText);
    if (forceVisible) {
      this.moneyText.setVisible(true);
      if (this.currentBattle != null) {
        this.costToSnatchText.setText(`₽${this.getRequiredMoneyForPokeBuy()}`);
      }
    }
  }

  getRequiredMoneyForPokeBuy(): number {
    const bigNuggetValue = this.getWaveMoneyAmount(2.5);

    let costMultiplier = 1.2;

    if (this.gameData.hasPermaModifierByType(PermaType.PERMA_TRAINER_SNATCH_COST_3)) {
      costMultiplier = 0.9;
    } else if (this.gameData.hasPermaModifierByType(PermaType.PERMA_TRAINER_SNATCH_COST_2)) {
      costMultiplier = 1.0;
    } else if (this.gameData.hasPermaModifierByType(PermaType.PERMA_TRAINER_SNATCH_COST_1)) {
      costMultiplier = 1.1;
    }

    let finalCost = Math.round(costMultiplier * bigNuggetValue);
    
    if (this.gameMode.checkIfRival(this)) {
      finalCost *= 4;
    }

    return finalCost;
  }

  animateMoneyChanged(positiveChange: boolean): void {
    if (this.tweens.getTweensOf(this.moneyText).length > 0) {
      return;
    }
    const deltaScale = this.moneyText.scale * 0.14 * (positiveChange ? 1 : -1);
    this.moneyText.setShadowColor(positiveChange ? "#008000" : "#FF0000");
    this.tweens.add({
      targets: this.moneyText,
      duration: 250,
      scale: this.moneyText.scale + deltaScale,
      loop: 0,
      yoyo: true,
      onComplete: (_) => this.moneyText.setShadowColor(getTextColor(TextStyle.MONEY, true)),
    });
  }



  updateScoreText(): void {
    this.scoreText.setText(`Score: ${this.score.toString()}`);
    this.scoreText.setVisible(this.gameMode.isDaily);
  }

  updateAndShowText(duration: integer): void {
    return;
    const labels = [ this.luckLabelText, this.luckText ];
    labels.forEach(t => t.setAlpha(0));
    const luckValue = getPartyLuckValue(this.getParty());
    this.luckText.setText(getLuckString(luckValue));
    if (luckValue < 14) {
      this.luckText.setTint(getLuckTextTint(luckValue));
    } else {
      this.luckText.setTint(0xffef5c, 0x47ff69, 0x6b6bff, 0xff6969);
    }
    this.luckLabelText.setX((this.game.canvas.width / 6) - 2 - (this.luckText.displayWidth + 2));
    this.tweens.add({
      targets: labels,
      duration: duration,
      alpha: 1,
      onComplete: () => {
        labels.forEach(t => t.setVisible(true));
      }
    });
  }

  hideLuckText(duration: integer): void {
    if (this.reroll) {
      return;
    }
    const labels = [ this.luckLabelText, this.luckText ];
    this.tweens.add({
      targets: labels,
      duration: duration,
      alpha: 0,
      onComplete: () => {
        labels.forEach(l => l.setVisible(false));
      }
    });
  }

  updateUIPositions(): void {
    const enemyModifierCount = this.enemyModifiers.filter(m => m.isIconVisible(this)).length;
    const biomeWaveTextHeight = this.biomeWaveText.getBottomLeft().y - this.biomeWaveText.getTopLeft().y;
    const moneyTextWidth = this.biomeWaveText.getBottomLeft().x - this.biomeWaveText.getBottomRight().x;
    this.biomeWaveText.setY(
      -(this.game.canvas.height / 6) + (enemyModifierCount ? enemyModifierCount <= 12 ? 21 : 30 : 13) + (biomeWaveTextHeight / 2)
    );
    this.moneyText.setY(this.biomeWaveText.y + 5);
    this.costToSnatchContainer.setY(this.moneyText.y + 5);
    this.costToSnatchContainer.setX(this.moneyText.x);
    if(this.currentBattle) {
        this.costToSnatchContainer.setVisible(this.currentBattle.battleType == BattleType.TRAINER && !this.gameMode.checkIfRival(this) && !this.dynamicMode?.noCatch);
    }
    [ this.luckLabelText, this.luckText ].map(l => l.setY((this.scoreText.visible ? this.scoreText : this.moneyText).y + 10));
    const offsetY = (this.scoreText.visible ? this.scoreText : this.moneyText).y + 15;
    this.partyExpBar.setY(offsetY);
    this.candyBar.setY(offsetY + 15);
    this.ui?.achvBar.setY(this.game.canvas.height / 6 + offsetY);
  }

  /**
   * Pushes all {@linkcode Phaser.GameObjects.Text} objects in the top right to the bottom of the canvas
   */
  sendTextToBack(): void {
    this.fieldUI.sendToBack(this.biomeWaveText);
    this.fieldUI.sendToBack(this.moneyText);
    this.fieldUI.sendToBack(this.scoreText);
  }

  addFaintedEnemyScore(enemy: EnemyPokemon): void {
    let scoreIncrease = enemy.getSpeciesForm().getBaseExp() * (enemy.level / this.getMaxExpLevel()) * ((enemy.ivs.reduce((iv: integer, total: integer) => total += iv, 0) / 93) * 0.2 + 0.8);
    this.findModifiers(m => m instanceof PokemonHeldItemModifier && m.pokemonId === enemy.id, false).map(m => scoreIncrease *= (m as PokemonHeldItemModifier).getScoreMultiplier());
    if (enemy.isBoss()) {
      scoreIncrease *= Math.sqrt(enemy.bossSegments);
    }
    this.currentBattle.battleScore += Math.ceil(scoreIncrease);
  }

  getMaxExpLevel(ignoreLevelCap?: boolean): integer {
    if (ignoreLevelCap) {
      return Number.MAX_SAFE_INTEGER;
    }
    let waveIndex = Math.ceil((this.currentBattle?.waveIndex || 1) / 10) * 10;
    if (this.gameMode.isNightmare) {
      waveIndex = waveIndex % 100;
      waveIndex = waveIndex === 0 ? 100 : waveIndex;
    }
    const difficultyWaveIndex = this.gameMode.getWaveForDifficulty(waveIndex);
    const baseLevel = (1 + difficultyWaveIndex / 2 + Math.pow(difficultyWaveIndex / 25, 2)) * 1.2;
    return Math.ceil(baseLevel / 2) * 2 + 2;
  }

  randomSpecies(waveIndex: integer, level: integer, fromArenaPool?: boolean, speciesFilter?: PokemonSpeciesFilter, filterAllEvolutions?: boolean): PokemonSpecies {
    if (fromArenaPool) {
      return this.arena.randomSpecies(waveIndex, level, undefined, getPartyLuckValue(this.party));
    }
    const filteredSpecies = speciesFilter ? [...new Set(allSpecies.filter(s => s.isCatchable()).filter(speciesFilter).map(s => {
      if (!filterAllEvolutions) {
        while (pokemonPrevolutions.hasOwnProperty(s.speciesId)) {
          s = getPokemonSpecies(pokemonPrevolutions[s.speciesId]);
        }
      }
      return s;
    }))] : allSpecies.filter(s => s.isCatchable());
    return filteredSpecies[Utils.randSeedInt(filteredSpecies.length)];
  }

  generateRandomBiome(waveIndex: integer): Biome {
    const relWave = waveIndex % 250;
    const biomes = Utils.getEnumValues(Biome).slice(1, Utils.getEnumValues(Biome).filter(b => b >= 40).length * -1);
    const maxDepth = biomeDepths[Biome.END][0] - 2;
    const depthWeights = new Array(maxDepth + 1).fill(null)
      .map((_, i: integer) => ((1 - Math.min(Math.abs((i / (maxDepth - 1)) - (relWave / 250)) + 0.25, 1)) / 0.75) * 250);
    const biomeThresholds: integer[] = [];
    let totalWeight = 0;
    for (const biome of biomes) {
      totalWeight += Math.ceil(depthWeights[biomeDepths[biome][0] - 1] / biomeDepths[biome][1]);
      biomeThresholds.push(totalWeight);
    }

    const randInt = Utils.randSeedInt(totalWeight);

    for (const biome of biomes) {
      if (randInt < biomeThresholds[biome]) {
        return biome;
      }
    }

    return biomes[Utils.randSeedInt(biomes.length)];
  }

  isBgmPlaying(): boolean {
    return this.bgm && this.bgm.isPlaying;
  }

  playBgm(bgmName?: string, fadeOut?: boolean): void {
    if (bgmName === undefined) {
      bgmName = this.currentBattle?.getBgmOverride(this) || this.arena?.bgm;
    }
    if (this.bgm && bgmName === this.bgm.key) {
      if (!this.bgm.isPlaying) {
        this.bgm.play({
          volume: this.masterVolume * this.bgmVolume
        });
      }
      return;
    }
    if (fadeOut && !this.bgm) {
      fadeOut = false;
    }
    this.bgmCache.add(bgmName);
    this.loadBgm(bgmName);
    let loopPoint = 0;
    loopPoint = bgmName === this.arena.bgm
      ? this.arena.getBgmLoopPoint()
      : this.getBgmLoopPoint(bgmName);
    let loaded = false;
    const playNewBgm = () => {
      this.ui.bgmBar.setBgmToBgmBar(bgmName);
      if (bgmName === null && this.bgm && !this.bgm.pendingRemove) {
        this.bgm.play({
          volume: this.masterVolume * this.bgmVolume
        });
        return;
      }
      if (this.bgm && !this.bgm.pendingRemove && this.bgm.isPlaying) {
        this.bgm.stop();
      }
      this.bgm = this.sound.add(bgmName, { loop: true });
      this.bgm.play({
        volume: this.masterVolume * this.bgmVolume
      });
      if (loopPoint) {
        this.bgm.on("looped", () => this.bgm.play({ seek: loopPoint }));
      }
    };
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      loaded = true;
      if (!fadeOut || !this.bgm.isPlaying) {
        playNewBgm();
      }
    });
    if (fadeOut) {
      const onBgmFaded = () => {
        if (loaded && (!this.bgm.isPlaying || this.bgm.pendingRemove)) {
          playNewBgm();
        }
      };
      this.time.delayedCall(this.fadeOutBgm(500, true) ? 750 : 250, onBgmFaded);
    }
    if (!this.load.isLoading()) {
      this.load.start();
    }
  }

  pauseBgm(): boolean {
    if (this.bgm && !this.bgm.pendingRemove && this.bgm.isPlaying) {
      this.bgm.pause();
      return true;
    }
    return false;
  }

  resumeBgm(): boolean {
    if (this.bgm && !this.bgm.pendingRemove && this.bgm.isPaused) {
      try {
        this.bgm.resume();
      } catch (e) {
        console.warn("Error resuming sound, likely due to suspended audio context");
      }
      return true;
    }
    return false;
  }

  updateSoundVolume(): void {
    if (this.sound) {
      for (const sound of this.sound.getAllPlaying() as AnySound[]) {
        if (this.bgmCache.has(sound.key)) {
          sound.setVolume(this.masterVolume * this.bgmVolume);
        } else {
          const soundDetails = sound.key.split("/");
          switch (soundDetails[0]) {

          case "battle_anims":
          case "cry":
            if (soundDetails[1].startsWith("PRSFX- ")) {
              sound.setVolume(this.masterVolume*this.fieldVolume*0.5);
            } else {
              sound.setVolume(this.masterVolume*this.fieldVolume);
            }
            break;
          case "se":
          case "ui":
            sound.setVolume(this.masterVolume*this.seVolume);
          }
        }
      }
    }
  }

  fadeOutBgm(duration: integer = 500, destroy: boolean = true): boolean {
    if (!this.bgm) {
      return false;
    }
    const bgm = this.sound.getAllPlaying().find(bgm => bgm.key === this.bgm.key);
    if (bgm) {
      try {
        try {
          SoundFade.fadeOut(this, this.bgm, duration, destroy);
        } catch (e) {
          console.warn("Error fading out sound, likely due to suspended audio context");
        }
      } catch (e) {
        console.warn("Error fading out sound, likely due to suspended audio context");
      }
      return true;
    }

    return false;
  }

  playSound(sound: string | AnySound, config?: object): AnySound {
    const key = typeof sound === "string" ? sound : sound.key;
    config = config ?? {};
    try {
      const keyDetails = key.split("/");
      switch (keyDetails[0]) {
        case "hellowelcome":
          config["volume"] = this.bgmVolume;
      case "level_up_fanfare":
      case "item_fanfare":
      case "minor_fanfare":
      case "heal":
      case "evolution":
      case "evolution_fanfare":
        // These sounds are loaded in as BGM, but played as sound effects
        // When these sounds are updated in updateVolume(), they are treated as BGM however because they are placed in the BGM Cache through being called by playSoundWithoutBGM()
        config["volume"] = this.masterVolume * this.bgmVolume;
        break;
      case "battle_anims":
      case "cry":
        config["volume"] = this.masterVolume * this.fieldVolume;
        //PRSFX sound files are unusually loud
        if (keyDetails[1].startsWith("PRSFX- ")) {
          config["volume"] *= 0.5;
        }
        break;
      case "ui":
        //As of, right now this applies to the "select", "menu_open", "error" sound effects
        config["volume"] = this.masterVolume * this.uiVolume;
        break;
      case "se":
        config["volume"] = this.masterVolume * this.seVolume;
        break;
    }
      this.sound.play(key, config);
      return this.sound.get(key) as AnySound;
    } catch {
      console.log(`${key} not found`);
      return sound as AnySound;
    }
  }

  playSoundWithoutBgm(soundName: string, pauseDuration?: integer): AnySound {
    this.bgmCache.add(soundName);
    const resumeBgm = this.pauseBgm();
    this.playSound(soundName);
    const sound = this.sound.get(soundName) as AnySound;
    if (this.bgmResumeTimer) {
      this.bgmResumeTimer.destroy();
    }
    if (resumeBgm) {
      this.bgmResumeTimer = this.time.delayedCall((pauseDuration || Utils.fixedInt(sound.totalDuration * 1000)), () => {
        this.resumeBgm();
        this.bgmResumeTimer = null;
      });
    }
    return sound;
  }

      getBgmLoopPoint(bgmName: string): number {
        switch (bgmName) {
          case "battle_kanto_champion": //B2W2 Kanto Champion Battle
            return 13.950;
          case "battle_johto_champion": //B2W2 Johto Champion Battle
            return 23.498;
    case "battle_hoenn_champion_g5": //B2W2 Hoenn Champion Battle
            return 11.328;
    case "battle_hoenn_champion_g6": //ORAS Hoenn Champion Battle
      return 11.762;
          case "battle_sinnoh_champion": //B2W2 Sinnoh Champion Battle
            return 12.235;
          case "battle_champion_alder": //BW Unova Champion Battle
            return 27.653;
          case "battle_champion_iris": //B2W2 Unova Champion Battle
            return 10.145;
          case "battle_kalos_champion": //XY Kalos Champion Battle
            return 10.380;
          case "battle_alola_champion": //USUM Alola Champion Battle
            return 13.025;
          case "battle_galar_champion": //SWSH Galar Champion Battle
            return 61.635;
          case "battle_champion_geeta": //SV Champion Geeta Battle
            return 37.447;
          case "battle_champion_nemona": //SV Champion Nemona Battle
            return 14.914;
          case "battle_champion_kieran": //SV Champion Kieran Battle
            return 7.206;
          case "battle_hoenn_elite": //ORAS Elite Four Battle
            return 11.350;
          case "battle_unova_elite": //BW Elite Four Battle
            return 17.730;
          case "battle_kalos_elite": //XY Elite Four Battle
            return 12.340;
          case "battle_alola_elite": //SM Elite Four Battle
            return 19.212;
          case "battle_galar_elite": //SWSH League Tournament Battle
            return 164.069;
          case "battle_paldea_elite": //SV Elite Four Battle
            return 12.770;
          case "battle_bb_elite": //SV BB League Elite Four Battle
            return 19.434;
          case "battle_final_encounter": //PMD RTDX Rayquaza's Domain
            return 19.159;
          case "battle_final": //BW Ghetsis Battle
            return 16.453;
          case "battle_kanto_gym": //B2W2 Kanto Gym Battle
            return 13.857;
          case "battle_johto_gym": //B2W2 Johto Gym Battle
            return 12.911;
          case "battle_hoenn_gym": //B2W2 Hoenn Gym Battle
            return 12.379;
          case "battle_sinnoh_gym": //B2W2 Sinnoh Gym Battle
            return 13.122;
          case "battle_unova_gym": //BW Unova Gym Battle
            return 19.145;
          case "battle_kalos_gym": //XY Kalos Gym Battle
            return 44.810;
          case "battle_galar_gym": //SWSH Galar Gym Battle
            return 171.262;
          case "battle_paldea_gym": //SV Paldea Gym Battle
            return 127.489;
          case "battle_legendary_kanto": //XY Kanto Legendary Battle
            return 32.966;
          case "battle_legendary_raikou": //HGSS Raikou Battle
            return 12.632;
          case "battle_legendary_entei": //HGSS Entei Battle
            return 2.905;
          case "battle_legendary_suicune": //HGSS Suicune Battle
            return 12.636;
          case "battle_legendary_lugia": //HGSS Lugia Battle
            return 19.770;
          case "battle_legendary_ho_oh": //HGSS Ho-oh Battle
            return 17.668;
          case "battle_legendary_regis_g5": //B2W2 Legendary Titan Battle
            return 49.500;
          case "battle_legendary_regis_g6": //ORAS Legendary Titan Battle
            return 21.130;
          case "battle_legendary_gro_kyo": //ORAS Groudon & Kyogre Battle
            return 10.547;
          case "battle_legendary_rayquaza": //ORAS Rayquaza Battle
            return 10.495;
          case "battle_legendary_deoxys": //ORAS Deoxys Battle
            return 13.333;
          case "battle_legendary_lake_trio": //ORAS Lake Guardians Battle
            return 16.887;
          case "battle_legendary_sinnoh": //ORAS Sinnoh Legendary Battle
            return 22.770;
          case "battle_legendary_dia_pal": //ORAS Dialga & Palkia Battle
            return 16.009;
    case "battle_legendary_origin_forme": //LA Origin Dialga & Palkia Battle
      return 18.961;
          case "battle_legendary_giratina": //ORAS Giratina Battle
            return 10.451;
          case "battle_legendary_arceus": //HGSS Arceus Battle
            return 9.595;
          case "battle_legendary_unova": //BW Unova Legendary Battle
            return 13.855;
          case "battle_legendary_kyurem": //BW Kyurem Battle
            return 18.314;
          case "battle_legendary_res_zek": //BW Reshiram & Zekrom Battle
            return 18.329;
          case "battle_legendary_xern_yvel": //XY Xerneas & Yveltal Battle
            return 26.468;
          case "battle_legendary_tapu": //SM Tapu Battle
            return 0.000;
          case "battle_legendary_sol_lun": //SM Solgaleo & Lunala Battle
            return 6.525;
          case "battle_legendary_ub": //SM Ultra Beast Battle
            return 9.818;
          case "battle_legendary_dusk_dawn": //USUM Dusk Mane & Dawn Wings Necrozma Battle
            return 5.211;
          case "battle_legendary_ultra_nec": //USUM Ultra Necrozma Battle
            return 10.344;
          case "battle_legendary_zac_zam": //SWSH Zacian & Zamazenta Battle
            return 11.424;
          case "battle_legendary_glas_spec": //SWSH Glastrier & Spectrier Battle
            return 12.503;
          case "battle_legendary_calyrex": //SWSH Calyrex Battle
            return 50.641;
    case "battle_legendary_riders": //SWSH Ice & Shadow Rider Calyrex Battle
      return 18.155;
          case "battle_legendary_birds_galar": //SWSH Galarian Legendary Birds Battle
            return 0.175;
          case "battle_legendary_ruinous": //SV Treasures of Ruin Battle
            return 6.333;
    case "battle_legendary_kor_mir": //SV Depths of Area Zero Battle
      return 6.442;
          case "battle_legendary_loyal_three": //SV Loyal Three Battle
            return 6.500;
          case "battle_legendary_ogerpon": //SV Ogerpon Battle
            return 14.335;
          case "battle_legendary_terapagos": //SV Terapagos Battle
            return 24.377;
          case "battle_legendary_pecharunt": //SV Pecharunt Battle
            return 6.508;
          case "battle_rival": //BW Rival Battle
      return 14.110;
          case "battle_rival_2": //BW N Battle
            return 17.714;
          case "battle_rival_3": //BW Final N Battle
            return 17.586;
          case "battle_trainer": //BW Trainer Battle
            return 13.686;
          case "battle_wild": //BW Wild Battle
            return 12.703;
          case "battle_wild_strong": //BW Strong Wild Battle
            return 13.940;
          case "end_summit": //PMD RTDX Sky Tower Summit
            return 30.025;
    case "battle_rocket_grunt": //HGSS Team Rocket Battle
      return 12.707;
    case "battle_aqua_magma_grunt": //ORAS Team Aqua & Magma Battle
      return 12.062;
    case "battle_galactic_grunt": //BDSP Team Galactic Battle
      return 13.043;
          case "battle_plasma_grunt": //BW Team Plasma Battle
            return 12.974;
    case "battle_flare_grunt": //XY Team Flare Battle
      return 4.228;
    case "battle_aether_grunt": // SM Aether Foundation Battle
      return 16.00;
    case "battle_skull_grunt": // SM Team Skull Battle
      return 20.87;
    case "battle_macro_grunt": // SWSH Trainer Battle
      return 11.56;
    case "battle_galactic_admin": //BDSP Team Galactic Admin Battle
      return 11.997;
    case "battle_skull_admin": //SM Team Skull Admin Battle
      return 15.463;
    case "battle_oleana": //SWSH Oleana Battle
      return 14.110;
    case "battle_rocket_boss": //USUM Giovanni Battle
      return 9.115;
    case "battle_aqua_magma_boss": //ORAS Archie & Maxie Battle
      return 14.847;
    case "battle_galactic_boss": //BDSP Cyrus Battle
      return 106.962;
    case "battle_plasma_boss": //B2W2 Ghetsis Battle
      return 25.624;
    case "battle_flare_boss": //XY Lysandre Battle
      return 8.085;
    case "battle_aether_boss": //SM Lusamine Battle
      return 11.33;
    case "battle_skull_boss": //SM Guzma Battle
      return 13.13;
    case "battle_macro_boss": //SWSH Rose Battle
      return 11.42;
        }

    return 0;
  }

  toggleInvert(invert: boolean): void {
    if (invert) {
      this.cameras.main.setPostPipeline(InvertPostFX);
    } else {
      this.cameras.main.removePostPipeline("InvertPostFX");
    }
  }

  /* Phase Functions */
  getCurrentPhase(): Phase | null {
    return this.currentPhase;
  }

  getNextPhase(): Phase | null {
    if (this.phaseQueuePrepend.length > 0) {
      return this.phaseQueuePrepend[0];
    }
    
    if (this.phaseQueue.length > 0) {
      return this.phaseQueue[0]; 
    }
    
    return null;
  }

  getStandbyPhase(): Phase | null {
    return this.standbyPhase;
  }

  /**
   * Adds a phase to the conditional queue and ensures it is executed only when the specified condition is met.
   *
   * This method allows deferring the execution of a phase until certain conditions are met, which is useful for handling
   * situations like abilities and entry hazards that depend on specific game states.
   *
   * @param {Phase} phase - The phase to be added to the conditional queue.
   * @param {() => boolean} condition - A function that returns a boolean indicating whether the phase should be executed.
   *
   */
  pushConditionalPhase(phase: Phase, condition: () => boolean): void {
    this.conditionalQueue.push([condition, phase]);
  }

  /**
   * Adds a phase to nextCommandPhaseQueue, as long as boolean passed in is false
   * @param phase {@linkcode Phase} the phase to add
   * @param defer boolean on which queue to add to, defaults to false, and adds to phaseQueue
   */
  pushPhase(phase: Phase, defer: boolean = false): void {
    (!defer ? this.phaseQueue : this.nextCommandPhaseQueue).push(phase);
    this.logPhases();
  }

  /**
   * Adds Phase to the end of phaseQueuePrepend, or at phaseQueuePrependSpliceIndex
   * @param phase {@linkcode Phase} the phase to add
   */
  unshiftPhase(phase: Phase): void {
   
    if (this.phaseQueuePrependSpliceIndex === -1) {
      this.phaseQueuePrepend.push(phase);
    } else {
      this.phaseQueuePrepend.splice(this.phaseQueuePrependSpliceIndex, 0, phase);
    }
    this.logPhases();
  }

  /**
   * Clears the phaseQueue
   */
  clearPhaseQueue(): void {
    this.phaseQueue.splice(0, this.phaseQueue.length);
    this.logPhases();
  }

  /**
   * Used by function unshiftPhase(), sets index to start inserting at current length instead of the end of the array, useful if phaseQueuePrepend gets longer with Phases
   */
  setPhaseQueueSplice(): void {
    this.phaseQueuePrependSpliceIndex = this.phaseQueuePrepend.length;
  }

  /**
   * Resets phaseQueuePrependSpliceIndex to -1, implies that calls to unshiftPhase will insert at end of phaseQueuePrepend
   */
  clearPhaseQueueSplice(): void {
    this.phaseQueuePrependSpliceIndex = -1;
  }

  /**
   * Is called by each Phase implementations "end()" by default
   * We dump everything from phaseQueuePrepend to the start of of phaseQueue
   * then removes first Phase and starts it
   */
  shiftPhase(): void {
    const currentPhaseName = this.currentPhase?.constructor.name || 'No Phase';
    const standbyPhaseName = this.standbyPhase?.constructor.name || 'No Standby Phase';
    
    if (this.standbyPhase) {
      this.currentPhase = this.standbyPhase;
      this.standbyPhase = null;
      this.logPhases();
      return;
    }

    if (this.phaseQueuePrependSpliceIndex > -1) {
      this.clearPhaseQueueSplice();
    }

    if (this.phaseQueuePrepend.length) {
      
      while (this.phaseQueuePrepend.length) {
        const poppedPhase = this.phaseQueuePrepend.pop();
        if (poppedPhase) {
          this.phaseQueue.unshift(poppedPhase);
        }
      }
      
    }

    if (!this.phaseQueue.length) {
      this.populatePhaseQueue();
      this.conditionalQueue = [];
    }

    const nextPhase = this.phaseQueue.shift();
    this.currentPhase = nextPhase ?? null;

    if (this.conditionalQueue?.length) {
      const conditionalPhase = this.conditionalQueue.shift();
      if (conditionalPhase) {
        const conditionMet = conditionalPhase[0]();
        
        if (conditionMet) {
          this.pushPhase(conditionalPhase[1]);
        } else {
          this.conditionalQueue.unshift(conditionalPhase);
        }
      } else {
        console.warn("condition phase is undefined/null!", conditionalPhase);
      }
    }

    if (this.currentPhase) {
      this.currentPhase.start();
    }

    this.logPhases();
  }

  overridePhase(phase: Phase): boolean {
    if (this.standbyPhase) {
      return false;
    }

    this.standbyPhase = this.currentPhase;
    this.currentPhase = phase;
    phase.start();

    return true;
  }

  findPhase(phaseFilter: (phase: Phase) => boolean): Phase | undefined {
    return this.phaseQueue.find(phaseFilter);
  }

  tryReplacePhase(phaseFilter: (phase: Phase) => boolean, phase: Phase): boolean {
    const phaseIndex = this.phaseQueue.findIndex(phaseFilter);
    if (phaseIndex > -1) {
      this.phaseQueue[phaseIndex] = phase;
      return true;
    }
    return false;
  }

  tryRemovePhase(phaseFilter: (phase: Phase) => boolean): boolean {
    const phaseIndex = this.phaseQueue.findIndex(phaseFilter);
    if (phaseIndex > -1) {
      this.phaseQueue.splice(phaseIndex, 1);
      return true;
    }
    return false;
  }

  pushMovePhase(movePhase: MovePhase, priorityOverride?: integer): void {
    const movePriority = new Utils.IntegerHolder(priorityOverride !== undefined ? priorityOverride : movePhase.move.getMove().priority);
    applyAbAttrs(ChangeMovePriorityAbAttr, movePhase.pokemon, null, false, movePhase.move.getMove(), movePriority);
    const lowerPriorityPhase = this.phaseQueue.find(p => p instanceof MovePhase && p.move.getMove().priority < movePriority.value);
    if (lowerPriorityPhase) {
      this.phaseQueue.splice(this.phaseQueue.indexOf(lowerPriorityPhase), 0, movePhase);
    } else {
      this.pushPhase(movePhase);
    }
  }

  /**
   * Tries to add the input phase to index before target phase in the phaseQueue, else simply calls unshiftPhase()
   * @param phase {@linkcode Phase} the phase to be added
   * @param targetPhase {@linkcode Phase} the type of phase to search for in phaseQueue
   * @returns boolean if a targetPhase was found and added
   */
  prependToPhase(phase: Phase, targetPhase: Constructor<Phase>): boolean {
    const targetIndex = this.phaseQueue.findIndex(ph => ph instanceof targetPhase);

    if (targetIndex !== -1) {
      this.phaseQueue.splice(targetIndex, 0, phase);
      return true;
    } else {
      this.unshiftPhase(phase);
      return false;
    }
  }

  /**
   * Adds a MessagePhase, either to PhaseQueuePrepend or nextCommandPhaseQueue
   * @param message string for MessagePhase
   * @param callbackDelay optional param for MessagePhase constructor
   * @param prompt optional param for MessagePhase constructor
   * @param promptDelay optional param for MessagePhase constructor
   * @param defer boolean for which queue to add it to, false -> add to PhaseQueuePrepend, true -> nextCommandPhaseQueue
   */
  queueMessage(message: string, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null, defer?: boolean | null) {
    const phase = new MessagePhase(this, message, callbackDelay, prompt, promptDelay);
    if (!defer) {
      // adds to the end of PhaseQueuePrepend
      this.unshiftPhase(phase);
    } else {
      //remember that pushPhase adds it to nextCommandPhaseQueue
      this.pushPhase(phase);
    }
  }

  /**
   * Moves everything from nextCommandPhaseQueue to phaseQueue (keeping order)
   */
  populatePhaseQueue(): void {
    if (this.nextCommandPhaseQueue.length) {
      this.phaseQueue.push(...this.nextCommandPhaseQueue);
      this.nextCommandPhaseQueue.splice(0, this.nextCommandPhaseQueue.length);
    }
    this.phaseQueue.push(new TurnInitPhase(this));
    this.logPhases();
  }

  addMoney(amount: integer): void {
    this.money = Math.min(this.money + amount, Number.MAX_SAFE_INTEGER);
    this.updateMoneyText();
    this.animateMoneyChanged(true);
    this.validateAchvs(MoneyAchv);
  }

  private trackModifierObtained(modifier: Modifier): void {
    let localeKey = modifier.type.name || modifier.type.localeKey;
    if (!localeKey) return;
    if (modifier.type.localeKey === "modifierType:AddPokemonModifierType") {
      localeKey = i18next.t("modifierType:AddPokemonModifierType.statLabel") + " " + modifier.type.name;
    }

    if (!this.gameData.gameStats.modifiersObtained[localeKey]) {
      this.gameData.gameStats.modifiersObtained[localeKey] = 0;
    }
    this.gameData.gameStats.modifiersObtained[localeKey]++;
  }

  public trackPermaModifierObtained(modifier: Modifier): void {
    this.trackModifierObtained(modifier);
  }

  getWaveMoneyAmount(moneyMultiplier: number): integer {
    const waveIndex = this.currentBattle.waveIndex;
    const waveSetIndex = Math.ceil(waveIndex / 10) - 1;
    const moneyValue = Math.pow((waveSetIndex + 1 + (0.75 + (((waveIndex - 1) % 10) + 1) / 10)) * 100, 1 + 0.005 * waveSetIndex) * moneyMultiplier;
    return Math.floor(moneyValue / 10) * 10;
  }

  addModifier(modifier: Modifier | null, ignoreUpdate?: boolean, playSound?: boolean, virtual?: boolean, instant?: boolean): Promise<boolean> {
    if (!modifier) {
      return Promise.resolve(false);
    }
    return new Promise(resolve => {
      let success = false;
      const soundName = modifier.type.soundName;
      this.validateAchvs(ModifierAchv, modifier);
      const modifiersToRemove: PersistentModifier[] = [];
      const modifierPromises: Promise<boolean>[] = [];
      if (!virtual) {
            this.trackModifierObtained(modifier);
          }
      if (modifier instanceof PersistentModifier) {
        if (modifier instanceof TerastallizeModifier) {
          modifiersToRemove.push(...(this.findModifiers(m => m instanceof TerastallizeModifier && m.pokemonId === modifier.pokemonId)));
        }
        if ((modifier as PersistentModifier).add(this.modifiers, !!virtual, this)) {
          
          if (modifier instanceof PokemonFormChangeItemModifier || modifier instanceof TerastallizeModifier || modifier instanceof CollectedTypeModifier || modifier instanceof AbilitySwitcherModifier || modifier instanceof TypeSwitcherModifier || modifier instanceof AnyAbilityModifier || modifier instanceof TypeSacrificeModifier || modifier instanceof AbilitySacrificeModifier || modifier instanceof PassiveAbilitySacrificeModifier || modifier instanceof AnyPassiveAbilityModifier || modifier instanceof MoveSacrificeModifier) {
            success = modifier.apply([ this.getPokemonById(modifier.pokemonId), true ]) || (modifier instanceof PokemonFormChangeItemModifier && modifier.formChangeItem >= FormChangeItem.SMITTY_AURA && modifier.formChangeItem <= FormChangeItem.SMITTY_VOID);
          }
          else if(modifier instanceof SacrificeToggleModifier || modifier instanceof GlitchPieceModifier || modifier instanceof MegaEvolutionAccessModifier || modifier instanceof GigantamaxAccessModifier || modifier instanceof TerastallizeAccessModifier ) {
            success = modifier.apply([ this, true ]) || success;
          }
          else if(modifier instanceof BerryModifier || modifier instanceof StatSacrificeModifier) {
            success = true;
          }
          if (playSound && !this.sound.get(soundName)) {
            this.playSound(soundName);
          }
        } else if (!virtual) {
          const defaultModifierType = getDefaultModifierTypeForTier(modifier.type.tier);
          this.queueMessage(i18next.t("battle:itemStackFull", { fullItemName: modifier.type.name, itemName: defaultModifierType.name }), undefined, true);
          return this.addModifier(defaultModifierType.newModifier(), ignoreUpdate, playSound, false, instant).then(success => resolve(success));
        }

        for (const rm of modifiersToRemove) {
          this.removeModifier(rm);
        }

        if (!ignoreUpdate && !virtual) {
          return this.updateModifiers(true, instant).then(() => resolve(success));
        }
      } else if (modifier instanceof ConsumableModifier) {
        if (playSound && !this.sound.get(soundName)) {
          this.playSound(soundName);
        }

        if (modifier instanceof ConsumablePokemonModifier) {
          for (const p in this.party) {
            const pokemon = this.party[p];

            const args: any[] = [ pokemon ];
            if (modifier instanceof PokemonHpRestoreModifier) {
              if (!(modifier as PokemonHpRestoreModifier).fainted) {
                const hpRestoreMultiplier = new Utils.IntegerHolder(1);
                this.applyModifiers(HealingBoosterModifier, true, hpRestoreMultiplier);
                args.push(hpRestoreMultiplier.value);
              } else {
                args.push(1);
              }
            } else if (modifier instanceof FusePokemonModifier) {
              args.push(this.getPokemonById(modifier.fusePokemonId) as PlayerPokemon);
            }

            if (modifier.shouldApply(args)) {
              const result = modifier.apply(args);
              if (result instanceof Promise) {
                modifierPromises.push(result.then(s => success ||= s));
              } else {
                success ||= result;
              }
            }
          }

          return Promise.allSettled([this.party.map(p => p.updateInfo(instant)), ...modifierPromises]).then(() => resolve(success));
        } else {
          const args = [ this ];
          if (modifier.shouldApply(args)) {
            const result = modifier.apply(args);
            if (result instanceof Promise) {
              return result.then(success => resolve(success));
            } else {
              success ||= result;
            }

          }
        }
      }

      resolve(success);
    });
  }

  addEnemyModifier(modifier: PersistentModifier, ignoreUpdate?: boolean, instant?: boolean): Promise<void> {
    return new Promise(resolve => {
      const modifiersToRemove: PersistentModifier[] = [];
      if (modifier instanceof TerastallizeModifier) {
        modifiersToRemove.push(...(this.findModifiers(m => m instanceof TerastallizeModifier && m.pokemonId === modifier.pokemonId, false)));
      }
      if ((modifier as PersistentModifier).add(this.enemyModifiers, false, this)) {
        if (modifier instanceof PokemonFormChangeItemModifier || modifier instanceof TerastallizeModifier || modifier instanceof TypeSwitcherModifier || modifier instanceof AnyAbilityModifier  || modifier instanceof AnyPassiveAbilityModifier) {
          modifier.apply([ this.getPokemonById(modifier.pokemonId), true ]);
        }
        for (const rm of modifiersToRemove) {
          this.removeModifier(rm, true);
        }
      }
      if (!ignoreUpdate) {
        this.updateModifiers(false, instant).then(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Try to transfer a held item to another pokemon.
   * If the recepient already has the maximum amount allowed for this item, the transfer is cancelled.
   * The quantity to transfer is automatically capped at how much the recepient can take before reaching the maximum stack size for the item.
   * A transfer that moves a quantity smaller than what is specified in the transferQuantity parameter is still considered successful.
   * @param itemModifier {@linkcode PokemonHeldItemModifier} item to transfer (represents the whole stack)
   * @param target {@linkcode Pokemon} pokemon recepient in this transfer
   * @param playSound {boolean}
   * @param transferQuantity {@linkcode integer} how many items of the stack to transfer. Optional, defaults to 1
   * @param instant {boolean}
   * @param ignoreUpdate {boolean}
   * @returns true if the transfer was successful
   */
  tryTransferHeldItemModifier(itemModifier: PokemonHeldItemModifier, target: Pokemon, playSound: boolean, transferQuantity: integer = 1, instant?: boolean, ignoreUpdate?: boolean): Promise<boolean> {
    return new Promise(resolve => {
      const source = itemModifier.pokemonId ? itemModifier.getPokemon(target.scene) : null;
      const cancelled = new Utils.BooleanHolder(false);
      Utils.executeIf(!!source && source.isPlayer() !== target.isPlayer(), () => applyAbAttrs(BlockItemTheftAbAttr, source! /* checked in condition*/, cancelled)).then(() => {
        if (cancelled.value) {
          return resolve(false);
        }
        const newItemModifier = itemModifier.clone() as PokemonHeldItemModifier;
        newItemModifier.pokemonId = target.id;
        const matchingModifier = target.scene.findModifier(m => m instanceof PokemonHeldItemModifier
					&& (m as PokemonHeldItemModifier).matchType(itemModifier) && m.pokemonId === target.id, target.isPlayer()) as PokemonHeldItemModifier;
        let removeOld = true;
        if (matchingModifier) {
          const maxStackCount = matchingModifier.getMaxStackCount(target.scene);
          if (matchingModifier.stackCount >= maxStackCount) {
            return resolve(false);
          }
          const countTaken = Math.min(transferQuantity, itemModifier.stackCount, maxStackCount - matchingModifier.stackCount);
          itemModifier.stackCount -= countTaken;
          newItemModifier.stackCount = matchingModifier.stackCount + countTaken;
          removeOld = !itemModifier.stackCount;
        } else {
          const countTaken = Math.min(transferQuantity, itemModifier.stackCount);
          itemModifier.stackCount -= countTaken;
          newItemModifier.stackCount = countTaken;
        }
        removeOld = !itemModifier.stackCount;
        if (!removeOld || !source || this.removeModifier(itemModifier, !source.isPlayer())) {
          const addModifier = () => {
            if (!matchingModifier || this.removeModifier(matchingModifier, !target.isPlayer())) {
              if (target.isPlayer()) {
                this.addModifier(newItemModifier, ignoreUpdate, playSound, false, instant).then(() => resolve(true));
              } else {
                this.addEnemyModifier(newItemModifier, ignoreUpdate, instant).then(() => resolve(true));
              }
            } else {
              resolve(false);
            }
          };
          if (source && source.isPlayer() !== target.isPlayer() && !ignoreUpdate) {
            this.updateModifiers(source.isPlayer(), instant).then(() => addModifier());
          } else {
            addModifier();
          }
          return;
        }
        resolve(false);
      });
    });
  }

  removePartyMemberModifiers(partyMemberIndex: integer): Promise<void> {
    return new Promise(resolve => {
      const pokemonId = this.getParty()[partyMemberIndex].id;
      const modifiersToRemove = this.modifiers.filter(m => m instanceof PokemonHeldItemModifier && (m as PokemonHeldItemModifier).pokemonId === pokemonId);
      for (const m of modifiersToRemove) {
        this.modifiers.splice(this.modifiers.indexOf(m), 1);
      }
      this.updateModifiers().then(() => resolve());
    });
  }

  generateEnemyModifiers(): Promise<void> {
    return new Promise(resolve => {
      if (this.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
        return resolve();
      }
      const difficultyWaveIndex = this.gameMode.getWaveForDifficulty(this.currentBattle.waveIndex);
      const isFinalBoss = this.gameMode.isWaveFinal(this.currentBattle.waveIndex);
      let chances = Math.ceil(difficultyWaveIndex / 10);
      if (isFinalBoss) {
        chances = Math.ceil(chances * 2.5);
      }
      
      chances = Math.min(chances, 10);

      const party = this.getEnemyParty();

      if (this.currentBattle.trainer) {
        const modifiers = this.currentBattle.trainer.genModifiers(party);
        for (const modifier of modifiers) {
          this.addEnemyModifier(modifier, true, true);
        }
      }

      party.forEach((enemyPokemon: EnemyPokemon, i: integer) => {
        const isBoss = enemyPokemon.isBoss() || (this.currentBattle.battleType === BattleType.TRAINER && !!this.currentBattle.trainer?.config.isBoss);
        let upgradeChance = 32;
        if (isBoss) {
          upgradeChance /= 2;
        }
        if (isFinalBoss) {
          upgradeChance /= 8;
        }
        const modifierChance = this.gameMode.getEnemyModifierChance(isBoss);
        let pokemonModifierChance = modifierChance;
        if (this.currentBattle.battleType === BattleType.TRAINER && this.currentBattle.trainer)
          pokemonModifierChance = Math.ceil(pokemonModifierChance * this.currentBattle.trainer.getPartyMemberModifierChanceMultiplier(i)); // eslint-disable-line
        let count = 0;
        for (let c = 0; c < chances; c++) {
          if (!Utils.randSeedInt(modifierChance)) {
            count++;
          }
        }
        if (isBoss) {
          count = Math.max(count, 5);
        }
        getEnemyModifierTypesForWave(difficultyWaveIndex, count, [ enemyPokemon ], this.currentBattle.battleType === BattleType.TRAINER ? ModifierPoolType.TRAINER : ModifierPoolType.WILD, upgradeChance)
  .map(mt => this.addEnemyModifier(mt.newModifier(enemyPokemon), true, true));
      });

      this.updateModifiers(false).then(() => resolve());
    });
  }

  /**
	* Removes all modifiers from enemy of PersistentModifier type
	*/
  clearEnemyModifiers(): void {
    const modifiersToRemove = this.enemyModifiers.filter(m => m instanceof PersistentModifier);
    for (const m of modifiersToRemove) {
      this.enemyModifiers.splice(this.enemyModifiers.indexOf(m), 1);
    }
    this.updateModifiers(false).then(() => this.updateUIPositions());
  }

  /**
	* Removes all modifiers from enemy of PokemonHeldItemModifier type
	*/
  clearEnemyHeldItemModifiers(): void {
    const modifiersToRemove = this.enemyModifiers.filter(m => m instanceof PokemonHeldItemModifier);
    for (const m of modifiersToRemove) {
      this.enemyModifiers.splice(this.enemyModifiers.indexOf(m), 1);
    }
    this.updateModifiers(false).then(() => this.updateUIPositions());
  }

  setModifiersVisible(visible: boolean) {
    [ this.modifierBar, this.enemyModifierBar ].map(m => m.setVisible(visible));
  }

  updateModifiers(player?: boolean, instant?: boolean): Promise<void> {
    if (player === undefined) {
      player = true;
    }
    return new Promise(resolve => {
      const modifiers = player ? this.modifiers : this.enemyModifiers as PersistentModifier[];
      for (let m = 0; m < modifiers.length; m++) {
        const modifier = modifiers[m];
        if (modifier instanceof PokemonHeldItemModifier && !this.getPokemonById((modifier as PokemonHeldItemModifier).pokemonId)) {
          modifiers.splice(m--, 1);
        }
      }
      for (const modifier of modifiers) {
        if (modifier instanceof PersistentModifier) {
          (modifier as PersistentModifier).virtualStackCount = 0;
        }
      }

      const modifiersClone = modifiers.slice(0);
      for (const modifier of modifiersClone) {
        if (!modifier.getStackCount()) {
          modifiers.splice(modifiers.indexOf(modifier), 1);
        }
      }

      this.updatePartyForModifiers(player ? this.getParty() : this.getEnemyParty(), instant).then(() => {
        (player ? this.modifierBar : this.enemyModifierBar).updateModifiers(modifiers);
        if (!player) {
          this.updateUIPositions();
        }
        resolve();
      });
    });
  }

  updatePartyForModifiers(party: Pokemon[], instant?: boolean): Promise<void> {
    return new Promise(resolve => {
      Promise.allSettled(party.map(p => {
        if (p.scene) {
          p.calculateStats();
        }
        return p.updateInfo(instant);
      })).then(() => resolve());
    });
  }

  removeModifier(modifier: PersistentModifier, enemy?: boolean): boolean {
    const modifiers = !enemy ? this.modifiers : this.enemyModifiers;
    const modifierIndex = modifiers.indexOf(modifier);
    if (modifierIndex > -1) {
      modifiers.splice(modifierIndex, 1);
      if (modifier instanceof PokemonFormChangeItemModifier || modifier instanceof TerastallizeModifier) {
        modifier.apply([ this.getPokemonById(modifier.pokemonId), false ]);
      }
      return true;
    }

    return false;
  }

  /**
   * Get all of the modifiers that match `modifierType`
   * @param modifierType The type of modifier to apply; must extend {@linkcode PersistentModifier}
   * @param player Whether to search the player (`true`) or the enemy (`false`); Defaults to `true`
   * @returns the list of all modifiers that matched `modifierType`.
   */
  getModifiers<T extends PersistentModifier>(modifierType: Constructor<T>, player: boolean = true): T[] {
    return (player ? this.modifiers : this.enemyModifiers).filter((m): m is T => m instanceof modifierType);
  }

  findModifiers(modifierFilter: ModifierPredicate, player: boolean = true): PersistentModifier[] {
    return (player ? this.modifiers : this.enemyModifiers).filter(m => (modifierFilter as ModifierPredicate)(m));
  }

  findModifier(modifierFilter: ModifierPredicate, player: boolean = true): PersistentModifier | undefined {
    return (player ? this.modifiers : this.enemyModifiers).find(m => (modifierFilter as ModifierPredicate)(m));
  }

  applyShuffledModifiers(scene: BattleScene, modifierType: Constructor<Modifier>, player: boolean = true, ...args: any[]): PersistentModifier[] {
    let modifiers = (player ? this.modifiers : this.enemyModifiers).filter(m => m instanceof modifierType && m.shouldApply(args));
    scene.executeWithSeedOffset(() => {
      const shuffleModifiers = mods => {
        if (mods.length < 1) {
          return mods;
        }
        const rand = Math.floor(Utils.randSeedInt(mods.length));
        return [mods[rand], ...shuffleModifiers(mods.filter((_, i) => i !== rand))];
      };
      modifiers = shuffleModifiers(modifiers);
    }, scene.currentBattle.turn << 4, scene.waveSeed);
    return this.applyModifiersInternal(modifiers, player, args);
  }

  applyModifiers(modifierType: Constructor<Modifier>, player: boolean = true, ...args: any[]): PersistentModifier[] {
    const modifiers = (player ? this.modifiers : this.enemyModifiers).filter(m => m instanceof modifierType && m.shouldApply(args));
    return this.applyModifiersInternal(modifiers, player, args);
  }

  applyModifiersInternal(modifiers: PersistentModifier[], player: boolean, args: any[]): PersistentModifier[] {
    const appliedModifiers: PersistentModifier[] = [];
    for (const modifier of modifiers) {
      if (modifier.apply(args)) {
        console.log("Applied", modifier.type.name, !player ? "(enemy)" : "");
        appliedModifiers.push(modifier);
      }
    }

    return appliedModifiers;
  }

  applyModifier(modifierType: Constructor<Modifier>, player: boolean = true, ...args: any[]): PersistentModifier | null {
    const modifiers = (player ? this.modifiers : this.enemyModifiers).filter(m => m instanceof modifierType && m.shouldApply(args));
    for (const modifier of modifiers) {
      if (modifier.apply(args)) {
        console.log("Applied", modifier.type.name, !player ? "(enemy)" : "");
        return modifier;
      }
    }

    return null;
  }

  triggerPokemonFormChange(
      pokemon: Pokemon,
      triggerTypeOrFormChange: Constructor<SpeciesFormChangeTrigger> | SpeciesFormChange | null,
      delayed: boolean = false,
      modal: boolean = false
  ): boolean {
    if (!pokemonFormChanges.hasOwnProperty(pokemon.species.speciesId) && !(triggerTypeOrFormChange instanceof SpeciesFormChange)) {
      return false;
    }

    let matchingFormChange: SpeciesFormChange | null = null;

    // Handle direct SpeciesFormChange
    if (triggerTypeOrFormChange instanceof SpeciesFormChange) {
      matchingFormChange = triggerTypeOrFormChange;
    }
    // Handle trigger type-based form change
    else if (triggerTypeOrFormChange) {
      if ((this.currentBattle?.battleSpec === BattleSpec.FINAL_BOSS ) &&
          triggerTypeOrFormChange === SpeciesFormChangeManualTrigger) {

          let possibleFormChanges = [];
            
            if (this.gameMode.isNightmare && this.currentBattle.waveIndex > 300) {
              const smittyForm = pokemon.species.forms.find(f => f.formKey === 'smitty');
              
              if (smittyForm) {
                possibleFormChanges = pokemonFormChanges[Species.NONE]
                  .filter(fc => fc.trigger instanceof SmittyFormTrigger && 
                                fc.trigger.name === smittyForm.formName);
              }
            } 
            if(!possibleFormChanges.length) {
              possibleFormChanges = pokemonFormChanges[pokemon.species.speciesId]
                .filter(fc => fc.formKey !== pokemon.species.forms[pokemon.formIndex].formKey);
            }

            if (possibleFormChanges.length) {
                matchingFormChange = possibleFormChanges[possibleFormChanges.length -1];
            } else {
              matchingFormChange = pokemonFormChanges[pokemon.species.speciesId]
                .find(fc => fc.findTrigger(triggerTypeOrFormChange) && fc.canChange(pokemon));
            }
      }
      else {
        matchingFormChange = pokemonFormChanges[pokemon.species.speciesId]
                .find(fc => fc.findTrigger(triggerTypeOrFormChange) && fc.canChange(pokemon));
      }
    }

    if (matchingFormChange) {
      let phase: Phase;
      if (pokemon instanceof PlayerPokemon && !matchingFormChange.quiet) {
        phase = new FormChangePhase(this, pokemon, matchingFormChange, modal);
      } else {
        phase = new QuietFormChangePhase(this, pokemon, matchingFormChange);
      }

      if (pokemon instanceof PlayerPokemon && !matchingFormChange.quiet && modal) {
        this.overridePhase(phase);
      } else if (delayed) {
        this.pushPhase(phase);
      } else {
        this.unshiftPhase(phase);
      }
      return true;
    }

    return false;
  }

  validateAchvs(achvType: Constructor<Achv>, ...args: unknown[]): void {
    const filteredAchvs = Object.values(achvs).filter(a => a instanceof achvType);
    for (const achv of filteredAchvs) {
      this.validateAchv(achv, args);
    }
  }

  validateAchv(achv: Achv, args?: any[]): boolean {
    if (!this.gameData.achvUnlocks.hasOwnProperty(achv.id) && achv.validate(this, args)) {
      this.gameData.achvUnlocks[achv.id] = new Date().getTime();
      this.ui.achvBar.showAchv(achv);
      if (vouchers.hasOwnProperty(achv.id)) {
        this.validateVoucher(vouchers[achv.id]);
      }
      return true;
    }

    return false;
  }

  validateVoucher(voucher: Voucher, args?: any[]): boolean {
    if (!this.gameData.voucherUnlocks.hasOwnProperty(voucher.id) && voucher.validate(this, args)) {
      this.gameData.voucherUnlocks[voucher.id] = new Date().getTime();
      this.ui.achvBar.showAchv(voucher);
      this.gameData.voucherCounts[voucher.voucherType]++;
      return true;
    }

    return false;
  }

  updateGameInfo(): void {
    const gameInfo = {
      playTime: this.sessionPlayTime ? this.sessionPlayTime : 0,
      gameMode: this.currentBattle ? this.gameMode.getName() : "Title",
      biome: this.currentBattle ? getBiomeName(this.arena.biomeType) : "",
      wave: this.currentBattle?.waveIndex || 0,
      party: this.party ? this.party.map(p => {
        return { name: p.name, level: p.level };
      }) : [],
      modeChain: this.ui?.getModeChain() ?? [],
    };
    (window as any).gameInfo = gameInfo;
  }

  /**
   * Initialized the 2nd phase of the final boss (e.g. form-change for Eternatus)
   * @param pokemon The (enemy) pokemon
   */
  initFinalBossPhaseTwo(pokemon: Pokemon): void {
    if (
      pokemon instanceof EnemyPokemon &&
      pokemon.isBoss() &&
      (!pokemon.is2ndStageBoss) &&
      pokemon.bossSegmentIndex < 1 &&
      !this.findModifiers(
        m => m instanceof TurnHeldItemTransferModifier && m.pokemonId === pokemon.id && m.type.id === getModifierType(modifierTypes.MINI_BLACK_HOLE).id,
        false
      ).length
    ) {
      this.fadeOutBgm(Utils.fixedInt(2000), false);
      this.ui.showDialogue(battleSpecDialogue[BattleSpec.FINAL_BOSS].firstStageWin, pokemon.species.name, undefined, () => {
        const finalBossMBH = getModifierType(modifierTypes.MINI_BLACK_HOLE).newModifier(pokemon) as TurnHeldItemTransferModifier;
        finalBossMBH.setTransferrableFalse();
        this.addEnemyModifier(finalBossMBH, false, true);
        pokemon.generateAndPopulateMoveset(1);
        this.setFieldScale(0.75);
        this.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
        this.shiftPhase();
      });
      return;
    }

    this.shiftPhase();
  }

  public addPermaMoney(amount: number) {
    this.gameData.permaMoney += amount;
    this.ui.updatePermaMoneyText(this);
  }

  public updateUIPermaMoneyText() {
    this.ui.updatePermaMoneyText(this);
  }

  addPermaModifier(modifier: PersistentModifier): Promise<boolean> {
    if (modifier instanceof PermaMoneyModifier) {
      this.addPermaMoney(modifier.amount);
    }
    if(modifier instanceof PersistentModifier) {
      this.trackPermaModifierObtained(modifier);
      this.gameData.permaModifiers.addModifier(this, modifier);
    }
    return Promise.resolve(true);
  }

  updatePersistentCurrencyText(): void {
  }

  getMajorBossWave(): integer {
    if (this.majorBossWave === 0) {
        let wave: integer;
        do {
            wave = randSeedInt(46, 80);
        } while (classicFixedBattles.hasOwnProperty(wave));
        
        this.majorBossWave = wave;
    }
    console.log("Major Boss Wave:", this.majorBossWave);
    return this.majorBossWave;
  }

  getUpgradesForMove(moveId: Moves): MoveUpgradeModifier[] {
    return this.findModifiers(m => 
      m instanceof MoveUpgradeModifier && 
      (m as MoveUpgradeModifier).moveId === moveId
    ) as MoveUpgradeModifier[];
  }

  getUpgradedMove(baseMove:Move): Move {
        if (this.gameData) {
          if (!this.gameData.upgradedMoves) {
            this.gameData.upgradedMoves = {};
          }
          
          const moveUpgradeModifiers = this.getUpgradesForMove(baseMove.id);
          
          if (moveUpgradeModifiers.length > 0) {
            const modifierKey = moveUpgradeModifiers
              .map(m => m.type.id)
              .sort()
              .join('_');
            
            const cacheKey = `${baseMove.id}_${modifierKey}`;
            if (!this.gameData.upgradedMoves[cacheKey]) {
              let upgradedMove = baseMove.clone();
              
              for (const modifier of moveUpgradeModifiers) {
                upgradedMove = modifier.getMove(upgradedMove);
              }
              
              this.gameData.upgradedMoves[cacheKey] = upgradedMove;
            }
            
            return this.gameData.upgradedMoves[cacheKey];
          }
    }

    return baseMove;
  }

  getCurrentUsesForLevelUp(moveId: Moves): number {
    const moveUpgradeModifiers = this.getUpgradesForMove(moveId);

    return allMoves[moveId].getBaseUsesForLevelUp() + (moveUpgradeModifiers.length * 10);
  }

  addPhaseAfterTarget(phase: Phase, targetPhase: Constructor<Phase>): boolean {
    const targetIndex = this.phaseQueue.findIndex(ph => ph instanceof targetPhase);

    if (targetIndex !== -1) {
      console.log(`Found target at index ${targetIndex}, inserting after`);
      this.phaseQueue.splice(targetIndex + 1, 0, phase);
      this.logPhases();
      return true;
    } else {
      console.log('Target not found, falling back to pushPhase');
      this.pushPhase(phase);
      return false;
    }
  }


  private logPhases(): void {
    return;
    console.log('\n=== PHASE QUEUES STATE ===');
    console.log('Current Phase:', this.currentPhase?.constructor.name || 'None');
    console.log('Standby Phase:', this.standbyPhase?.constructor.name || 'None');
    console.log('Phase Queue:', this.phaseQueue.map(p => p.constructor.name));
    console.log('Phase Queue Prepend:', this.phaseQueuePrepend.map(p => p.constructor.name));
    console.log('Next Command Queue:', this.nextCommandPhaseQueue.map(p => p.constructor.name));
    console.log('Conditional Queue:', this.conditionalQueue.map(([_, p]) => p.constructor.name));
    console.log('========================\n');
  }

  forceVictory(): void {

    this.ui.setMode(Mode.MESSAGE);
    this.clearPhaseQueue();

    this.getEnemyParty().forEach(enemy => {
      if (enemy && !enemy.isFainted()) {
        enemy.hp = 0;
        enemy.damage(enemy.getMaxHp(), true, true, true);
        return;
      }
    });

    this.pushPhase(new FaintPhase(this, BattlerIndex.ENEMY));
    this.shiftPhase();
  }

  public getRandomSmittySoundKey(isSmitom: boolean = false): string {
    const random = Utils.randSeedInt(10);
    if (isSmitom && random <= 7) {
      return 'voice/hellowelcome';
    }
    else {
      const random = Utils.randSeedInt(84, 1);
      this.loadSe(`smitty_sound_${random}`, "voice", `smitty_sound_${random}.mp3`);
      return `voice/smitty_sound_${random}`;
    }
  }

  public getRandomSmittySound(soundConfig?: Phaser.Types.Sound.SoundConfig, isSmitom: boolean = false): AnySound {
    const _soundConfig = soundConfig ? soundConfig : {
                loop: false,
                mute: false,
                volume: .4
              };
    return this.playSound(this.getRandomSmittySoundKey(isSmitom), _soundConfig);
  }


  logWaveSpecifics(): void {
    return
    const majorBossWave = this.getMajorBossWave();
    const waves = [majorBossWave];
    const waveDetails = waves.map(wave => {
      const battleType = this.gameMode.isWaveTrainer(wave, this.arena) ? BattleType.TRAINER : BattleType.WILD;
      const battle = this.newBattle(wave);
      const details = { wave,  allPokemon: "", battleType, trainer: "", rivals: [], finalBosses: [], enemies: []};
      if (classicFixedBattles.hasOwnProperty(wave)) {
        const trainer = classicFixedBattles[wave].getTrainer(this);
        const partyTemplate = trainer.getPartyTemplate();
        details.trainer = trainer.getName();
        const rivalPokemon = [];
        for (let i = 0; i < partyTemplate.size; i++) {
          rivalPokemon.push(trainer.genPartyMember(i));
        }

        for (let i = rivalPokemon.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rivalPokemon[i], rivalPokemon[j]] = [rivalPokemon[j], rivalPokemon[i]];
        }

        rivalPokemon.forEach(pokemon => {
          details.rivals.push(pokemon);
          details.allPokemon += `${pokemon.name}, `;
        });
      } else if (wave === majorBossWave) {
        const finalBossSpecies = this.gameMode.getOverrideSpecies(this, false, wave);
        details.finalBosses.push(finalBossSpecies);
        details.allPokemon += `${finalBossSpecies.name}, `;
      } else {
        battle.enemyParty.forEach((enemyPokemon, e) => {
          details.enemies.push(enemyPokemon);
          details.allPokemon += `${enemyPokemon.name}, `;
        });
      }
      details.allPokemon = details.allPokemon.slice(0, -2);
      return details;
    });
    console.log(waveDetails);
  }

  logNightmareSpecific(startWave: number = 1): void {
    const allSpecialWaves = [
      ...rivalWaves.map(wave => ({ wave, type: 'Rival' })),
      ...eliteFourWaves.map((wave, idx) => ({ 
        wave, 
        type: idx === 4 ? 'Champion' : 'Elite Four',
        memberNumber: idx + 1
      })),
      ...majorBossWaves.map(wave => ({ wave, type: 'Major Boss' }))
    ]
    .filter(special => special.wave >= startWave)
    .sort((a, b) => a.wave - b.wave);

    const waveDetails = allSpecialWaves.map(special => {
      const battleType = BattleType.TRAINER;
      const battle = this.newBattle(special.wave);
      const details = { 
        wave: special.wave,  
        type: special.type,
        allPokemon: "", 
        battleType, 
        trainer: "", 
        rivals: [], 
        finalBosses: [], 
        enemies: []
      };

      if (!battle) return details;

      if (nightmareFixedBattles[special.wave]) {
        const trainer = nightmareFixedBattles[special.wave].getTrainer(this);
        details.trainer = trainer.getName();
        
        const partyTemplate = trainer.getPartyTemplate();
        for (let i = 0; i < partyTemplate.size; i++) {
          const pokemon = trainer.genPartyMember(i);
          if (special.type === 'Rival') {
            details.rivals.push(pokemon);
          } else {
            details.enemies.push(pokemon);
          }
          details.allPokemon += `${pokemon.name}, `;
        }
      }
      
      if (special.type === 'Major Boss') {
        const bossSpecies = this.gameMode.getOverrideSpecies(null, true, special.wave);
        details.finalBosses.push(bossSpecies);
        details.allPokemon += `${bossSpecies.name}, `;
      }

      details.allPokemon = details.allPokemon.slice(0, -2); // Remove the last comma and space
      return details;
    });

    console.log(waveDetails);

    console.log("\nSummary Statistics:");
    console.log(`Total Rival Battles: ${allSpecialWaves.filter(s => s.type === 'Rival').length}`);
    console.log(`Total Elite Four Sets: ${Math.floor(allSpecialWaves.filter(s => s.type === 'Elite Four' || s.type === 'Champion').length / 5)}`);
    console.log(`Total Major Boss Battles: ${allSpecialWaves.filter(s => s.type === 'Major Boss').length}`);
    
    console.log("\nWave Ranges:");
    const startHundred = Math.floor(startWave / 100) * 100;
    for (let hundred = startHundred; hundred < 500; hundred += 100) {
      const wavesInRange = allSpecialWaves
        .filter(s => s.wave >= hundred && s.wave < hundred + 100)
        .map(s => `${s.wave}(${s.type})`);
      if (wavesInRange.length > 0) {
        console.log(`${hundred}-${hundred + 99}: ${wavesInRange.join(', ')}`);
      }
    }
  }

  logFixedSpecific(startWave: number = 1): void {
    return;
    const allSpecialWaves = [
        ...rivalWaves.map(wave => ({ wave, type: 'Rival' })),
        ...eliteFourWaves.map((wave, idx) => ({ 
            wave, 
            type: idx === 4 ? 'Champion' : 'Elite Four',
            memberNumber: idx + 1
        })),
        ...majorBossWaves.map(wave => ({ wave, type: 'Major Boss' }))
    ]
    .filter(special => special.wave >= startWave)
    .sort((a, b) => a.wave - b.wave);

    const waveDetails = allSpecialWaves.map(special => {
        const battleType = this.gameMode.isWaveTrainer(special.wave, this.arena) ? BattleType.TRAINER : BattleType.WILD;
        const battle = this.newBattle(special.wave);
        const details = { 
            wave: special.wave,  
            type: special.type,
            allPokemon: "", 
            battleType, 
            trainer: "", 
            rivals: [], 
            finalBosses: [], 
            enemies: []
        };

        if (!battle) return details;

        if (classicFixedBattles[special.wave]) {
            const trainer = classicFixedBattles[special.wave].getTrainer(this);
            details.trainer = trainer.getName();
            
            const partyTemplate = trainer.getPartyTemplate();
            for (let i = 0; i < partyTemplate.size; i++) {
                const pokemon = trainer.genPartyMember(i);
                if (special.type === 'Rival') {
                    details.rivals.push(pokemon);
                } else {
                    details.enemies.push(pokemon);
                }
                details.allPokemon += `${pokemon.name}, `;
            }
        }
        
        if (special.type === 'Major Boss') {
            const bossSpecies = this.gameMode.getOverrideSpecies(this, false, special.wave);
            details.finalBosses.push(bossSpecies);
            details.allPokemon += `${bossSpecies.name}, `;
        }

        details.allPokemon = details.allPokemon.slice(0, -2);
        return details;
    });

    console.log(waveDetails);

    console.log("\nSummary Statistics:");
    console.log(`Total Rival Battles: ${allSpecialWaves.filter(s => s.type === 'Rival').length}`);
    console.log(`Total Elite Four Sets: ${Math.floor(allSpecialWaves.filter(s => s.type === 'Elite Four' || s.type === 'Champion').length / 5)}`);
    console.log(`Total Major Boss Battles: ${allSpecialWaves.filter(s => s.type === 'Major Boss').length}`);
    
    console.log("\nWave Ranges:");
    const startHundred = Math.floor(startWave / 100) * 100;
    for (let hundred = startHundred; hundred < 110; hundred += 100) {
        const wavesInRange = allSpecialWaves
            .filter(s => s.wave >= hundred && s.wave < hundred + 100)
            .map(s => `${s.wave}(${s.type})`);
        if (wavesInRange.length > 0) {
            console.log(`${hundred}-${hundred + 99}: ${wavesInRange.join(', ')}`);
        }
    }
}

}



