import i18next from "i18next";
import { ModifierTooltipUtils, type ModifierTooltipData } from "./modifier-tooltip-utils";
import BattleScene from "../battle-scene";
import { ModalUiHandler, ModalConfig } from "./modal-ui-handler";
import ModalMessageUiHandler from "./modal-message-ui-handler";
import { Mode } from "./mode";
import { addTextObject, addBBCodeTextObject, TextStyle, getTextColor } from "./text";
import { Button } from "../enums/buttons";
import { TweakMetaMode, cycleMetaMode, TWEAK_META_CYCLE, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import { Type, getTypeRgb } from "../data/type";
import { ChampionManager } from "../system/champion-manager";
import { CHAMPION_DEFINITIONS, initializeChampionDefinitions } from "../system/champion-registry";
import { TrainerType } from "../enums/trainer-type";
import { trainerConfigs } from "../data/trainer-config";
import ChampionXPManager from "../system/champion-xp-manager";
import { ChampionUtils } from "../system/champion-utils";
import * as Utils from "../utils";
import {GameMode} from "../game-mode";
import { PlayerGender } from "../enums/player-gender";
import { RewardTooltipSections, SkillTreeRarity, SkillTreeRewardType, SkillTreeReward } from "../system/skill-tree-data";
import { getDisplayRarityForRewardType, SkillTreeNodeGenerator } from "../system/skill-tree-node-generator";
import { SkillCategory } from "../system/playable-champions";
import { POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { playGenericLevelUpAnimation, skipCurrentLevelUpAnimation, SkillRevealConfig } from "./level-up-animation";
import { EnhancedTutorial } from "./tutorial-registry";
import { Device } from "../enums/devices";
import { SlideshowController, SlideshowSceneAdapter } from "#app/utils/slideshow-controller.js";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { ensureCutsceneImagesLoaded, unloadCutsceneImages } from "#app/utils/cutscene-images.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { getPokemonSpecies } from "../data/pokemon-species";
import { getFormChangeItemSpriteFrame } from "../utils/form-change-item-sprite-utils";
import { QuestUnlockables } from "../enums/quest-unlockables";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";
import { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";

export interface ChampionSelectConfig {
  availableChampions: string[];
  gameMode?: GameMode;
  onChampionSelected: (championId: string) => void;
  onCancel?: () => void;
  preSelectedChampion?: string;
}

function buildChampionSpriteRevealConfig(
  scene: BattleScene,
  championId: string,
  displayText: string
): SkillRevealConfig {
  const gender = scene.gameData.gender;
  const key = ChampionUtils.getChampionSpriteKey(championId, gender);

  let frame = "";
  if (scene.textures.exists(key)) {
    const frameNames = scene.textures.get(key).getFrameNames();
    if (frameNames.includes("0001.png")) frame = "0001.png";
  }

  const resolvedId = (championId === "apollo_diana")
    ? (gender === 0 ? "apollo" : "diana")
    : championId;
  const def = CHAMPION_DEFINITIONS[resolvedId] as any;
  const previewScale = def?.ui?.previewScale ?? 1.0;
  const revealScale = Math.min(((previewScale * 1.1) + 0.040) * 1.35, 2.0);
  const offsetX = def?.ui?.skillTreeRootOffsetX ?? 0;
  const offsetY = def?.ui?.skillTreeRootOffsetY ?? 0;

  return {
    rarity: SkillTreeRarity.LEGENDARY,
    iconConfig: {
      key,
      frame,
      scale: revealScale,
      isChampionSprite: true,
      offsetX,
      offsetY,
    },
    skillName: displayText,
  };
}

export default class ChampionSelectUiHandler extends ModalUiHandler {

  private static readonly UI_CONSTANTS = {
    TITLE_CONTAINER: {
      X_OFFSET: 0,
      Y_OFFSET: 0,
      GRADIENT_WIDTH: 200,
      HEIGHT: 19,
    },
    TITLE: {
      FONT_SIZE: "80px",
      X_OFFSET: 4,
      Y_OFFSET: 4,
      COLOR: 0xFFFFFF,
      ALPHA: 1.0,
      STROKE_COLOR: "#424242",
      STROKE_THICKNESS: 14,
      BACKUP_STYLE: "WINDOW",
      BACKUP_GLOW_BLUR: 8,
    },
    SUBTITLE: {
      FONT_SIZE: "40px",
      X_OFFSET: 171,
      Y_OFFSET: 10.2,
      COLOR: 0xffffff,
      ALPHA: 0.8,
    },
    PREVIEW: {
      X: -110,
      Y: 22,
      SPRITE_X: 0,
      SPRITE_Y: -20,
      SPRITE_Y_OFFSET: 15,
      SPRITE_SCALE: .48,
      NAME_Y: 33,
      INFO_BELOW_TILE: -28,
      NAME_FONT_SIZE: "46px",
      TYPE_Y: 32,
      TYPE_SINGLE_X: 22,
      TYPE_DUAL_SPACING: 20,
      TYPE_SCALE: 0.57,
      SUBTITLE_Y: 42,
      SUBTITLE_FONT_SIZE: "28px",
    },
    SKILLS: {
      X: -70,
      Y: 0,
      WIDTH: 105,
      HEIGHT: 40,
      BG_ALPHA: 0.7,
      BORDER_ALPHA: 0.2,
      BORDER_THICKNESS: .5,

      USE_ESSENCE_BUTTON_Y: 33,
      USE_ESSENCE_BUTTON_WIDTH: 57,
      USE_ESSENCE_BUTTON_HEIGHT: 12,
      USE_ESSENCE_BUTTON_BORDER_SIZE: 0.3,
      USE_ESSENCE_BUTTON_TEXT_FONT_SIZE: "34px",
      USE_ESSENCE_BUTTON_BORDER_ALPHA: 0.4,
      USE_ESSENCE_BUTTON_TEXT_X: 0,
      USE_ESSENCE_BUTTON_ICON_SCALE: 0.4,
      USE_ESSENCE_BUTTON_ICON_X: -18,

      USE_ESSENCE_BUTTON_SOUL_ICON_X: 18,
      USE_ESSENCE_BUTTON_SOUL_ICON_Y: 0,
      USE_ESSENCE_BUTTON_SOUL_ICON_SCALE: 0.15,

      ESSENCE_HOLD_TICK_MS: 16,

      ESSENCE_PER_TICK: 128,

      SINGLE_PRESS_COMMIT_PCT: 0.05,
      SINGLE_PRESS_COMMIT_MIN: 1,
      SINGLE_PRESS_COMMIT_MAX: 32,
    },
    SKILL_LIST_PANEL: {

      X: 108,
      Y: -5,
      WIDTH: 78,
      HEIGHT: 127,
      MAX_HEIGHT_MARGIN: 2,
      BG_ALPHA: 0.7,
      BORDER_ALPHA: 0.25,
      BORDER_THICKNESS: 0.5,
      RADIUS: 4,
      HEADER_Y: -50,
      HEADER_FONT_SIZE: "45px",
      SUBHEADER_Y: -48,
      SUBHEADER_FONT_SIZE: "36px",
      SUBHEADER_ALPHA: 0.8,
      LIST_Y: -25,
      ITEM_WIDTH: 68,
      ITEM_HEIGHT: 12,
      ITEM_SPACING: 2,
      ITEM_MAX_TEXT_WIDTH: 400,
      ARROW_UP_Y: -2,
      ARROW_DOWN_Y: 58,
      ARROW_SCALE: 0.75,
      TOOLTIP_MAX_WIDTH: 120,
      TOOLTIP_MIN_WIDTH: 70,
      TOOLTIP_MIN_HEIGHT: 30,
      TOOLTIP_PADDING: 6,
      TOOLTIP_TITLE_BAR_Y: 0,
      TOOLTIP_TITLE_BAR_HEIGHT: 12,
      TOOLTIP_RARITY_BAR_Y: 14,
      TOOLTIP_RARITY_BAR_HEIGHT: 6,
      TOOLTIP_LORE_BAR_PADDING_V: 2,
      TOOLTIP_CONTENT_Y: 20,
      TOOLTIP_RADIUS: 0,
      TOOLTIP_BORDER_THICKNESS: 0.5,
      TOOLTIP_BORDER_COLOR: 0xffffff,
      TOOLTIP_BORDER_ALPHA: 0.5,
      TOOLTIP_OFFSET_X: -163,
      TOOLTIP_BG_ALPHA: 0.9,
      TOOLTIP_TITLE_FONT_SIZE: "40px",
      TOOLTIP_DESC_FONT_SIZE: "36px",
      TOOLTIP_COST_FONT_SIZE: "36px",
      TOOLTIP_PREREQ_FONT_SIZE: "32px",
      TOOLTIP_TITLE_TEXT_Y: 6,
      TOOLTIP_RARITY_TEXT_Y: 17,
      TOOLTIP_TEXT_SPACING: 4,
      TOOLTIP_SECTION_HEADER_SPACING: 1,
      TOOLTIP_SECTION_HEADER_HEIGHT: 10,
      TOOLTIP_SECTION_HEADER_FONT_SIZE: "33px",
      TOOLTIP_COST_ROW_HEIGHT: 14,
      TOOLTIP_COST_ROW_GAP: 2,
      TOOLTIP_COST_ICON_SCALE: 0.35,
      TOOLTIP_COST_ICON_TEXT_GAP: 4,
      TOOLTIP_SECTION_HEADER_COLOR: "#666666",
      TOOLTIP_SECTION_HEADER_ALPHA: 0.72,
      TOOLTIP_SECTION_LINE_COLOR: 0x666666,
      TOOLTIP_SECTION_LINE_ALPHA: 0.60,
      TOOLTIP_SECTION_LINE_THICKNESS: 0.5,
      SKILL_ITEM_FONT_SIZE: "34px",
      MAX_VISIBLE_SKILLS: 5,
      IMMEDIATE_UNLOCK_BG_COLOR: 0x003366,
      IMMEDIATE_UNLOCK_BG_ALPHA: 0.8,
      UNLOCKED_SKILL_BG_COLOR: 0x003300,
      UNLOCKED_SKILL_BG_ALPHA: 0.8,
      UNLOCKED_SKILL_BORDER_COLOR: 0x00ff00,
      UNLOCKED_SKILL_BORDER_ALPHA: 0.8,
      UNLOCKED_SKILL_BORDER_THICKNESS: 1,
      UNLOCKED_SKILL_FOCUSED_BORDER_COLOR: 0x00ffaa,
      UNLOCKED_SKILL_FOCUSED_BORDER_ALPHA: 1.0,
      UNLOCKED_SKILL_FOCUSED_BORDER_THICKNESS: 2,
      IMMEDIATE_UNLOCK_BORDER_COLOR: 0x0088ff,
      IMMEDIATE_UNLOCK_BORDER_ALPHA: 0.8,
      IMMEDIATE_UNLOCK_BORDER_THICKNESS: 1,
      IMMEDIATE_UNLOCK_FOCUSED_BORDER_COLOR: 0x00aaff,
      IMMEDIATE_UNLOCK_FOCUSED_BORDER_ALPHA: 1.0,
      IMMEDIATE_UNLOCK_FOCUSED_BORDER_THICKNESS: 2,
      LOCKED_FOCUSED_BORDER_COLOR: 0xffcc00,
      LOCKED_FOCUSED_BORDER_ALPHA: 1.0,
      LOCKED_FOCUSED_BORDER_THICKNESS: 1,
      LOCKED_UNFOCUSED_BORDER_COLOR: 0xffffff,
      LOCKED_UNFOCUSED_BORDER_ALPHA: 0.5,
      LOCKED_UNFOCUSED_BORDER_THICKNESS: 1,
    },
    LEVEL: {
      Y: -16,
      FONT_SIZE: "40px",
    },
    ESSENCE_INSTRUCTION: {
      Y: -12,
      FONT_SIZE: "30px",
      ALPHA: 0.8,
    },
    XP_BAR: {
      CONTAINER_Y: -4,
      BG_Y: 0,
      BG_HEIGHT: 20,
      BG_RADIUS: 10,
      FILL_Y: 2,
      FILL_WIDTH: 286,
      FILL_HEIGHT: 16,
      FILL_RADIUS: 8,
      BUTTON_X: -17,
      BUTTON_Y: 7,
      BUTTON_SCALE: 0.5,

      TEXT_Y: 7,
      TEXT_FONT_SIZE: "36px",

      TYPE_ICONS_X_START: 15,
      TYPE_ICONS_Y: 7,
      TYPE_ICONS_SPACING: 15,
      TYPE_ICONS_SCALE: 0.4,
      TYPE_ICONS_SPECIAL_SCALE: 0.55,
      TYPE_ICON_OFFSET_Y: 2,
      TYPE_ICON_DEPTH: 11,
    },
    CONTROLS: {
      BUTTON_X: -20,
      BUTTON_Y: -14,
      BUTTON_SCALE: 0.55,
      TYPE1_X: -2,
      TYPE1_Y: -12,
      TYPE2_X: 20,
      TYPE2_Y: -12,
      TYPE_SCALE: 0.5,
    },
    UNLOCKS: {
      START_Y: -25,
      LINE_HEIGHT: 10,
      FONT_SIZE: "38px",
      WRAP_WIDTH: 180,
      LOCKED_ALPHA: 0.8,
    },
    GRID_BG: {
      Y: -20,
      HEIGHT: 25,

      ALPHA: 0,
      COLOR: 0x000000,
      BORDER_THICKNESS: 0.4,

      BORDER_ALPHA: 0,
      BORDER_COLOR: 0xffffff,
      WIDTH_PERCENT: .95,
      RADIUS: 2,
    },
    LEVEL_UP_ANIMATION: {
      DURATION: 5000,
      TEXT_Y: -50,
      TEXT_FONT_SIZE: "45px",
      UNLOCK_TEXT_FONT_SIZE: "36px",
      TEXT_COLOR: 0xFFD700,
      TEXT_STROKE_COLOR: "#000000",
      TEXT_STROKE_THICKNESS: 4,
      PULSE_MAX_RADIUS: 150,
      PULSE_ALPHA: 0.3,
      PULSE_COLOR: 0xFFD700,
      CONFETTI_COUNT: 50,
      CONFETTI_SPEED_MIN: 100,
      CONFETTI_SPEED_MAX: 300,
      CONFETTI_LIFESPAN: 3000,
      CONFETTI_SCALE_START: 1.0,
      CONFETTI_SCALE_END: 0.1,
      SOUND_EFFECT: "evolution_fanfare_rse",
    },
    GRID: {
      Y_OFFSET: -15,
      START_X: -67.5,
      START_Y: -6,
      COLS: 4,
      SPACING_X: 45,
      ROW_GAP: 56,
      SPRITE_SCALE: 0.25,
      LOCKED_ALPHA: 0.85,

      CELL_SIZE: 20,
      CELL_BORDER_THICKNESS: .3,
      CELL_SELECTED_BORDER_THICKNESS: .5,
      CELL_BORDER_ALPHA: 0.25,
      CELL_SELECTED_BORDER_ALPHA: 1.0,

      XP_CONTAINER_Y: -5,
      XP_BAR_Y: 5,
      XP_BAR_WIDTH: 25,
      XP_BAR_HEIGHT: 4,
      XP_BAR_BG_ALPHA: 0.7,
      XP_BAR_FILL_ALPHA: 0.9,
      XP_TEXT_Y: 8,
      XP_TEXT_SIZE: "28px",

      XP_TEXT_BG_ALPHA: 0.7,
      XP_TEXT_BG_COLOR: 0x000000,
      XP_TEXT_BG_PADDING: 1,
      XP_TEXT_BG_HEIGHT_REDUCTION: 1,
      LEVEL_LABEL_Y: 13,
      LEVEL_LABEL_SIZE: "32px",
    },
    ESSENCE_LIST: {
      X: 18,
      Y: -60,
      HEADER_FONT_SIZE: "32px",
      START_Y: 13,
      START_X: 8,
      ICON_SCALE: 0.35,
      SPECIAL_ICON_SCALE: 0.425,
      COUNT_OFFSET_X: 15,
      COUNT_FONT_SIZE: "30px",
      ITEM_SPACING: 9,
      SPECIAL_TEXT_FONT_SIZE: "24px",
      SPECIAL_TEXT_STROKE: "#000000",
      SPECIAL_TEXT_STROKE_THICKNESS: 3,
    },

    RARITY_COLORS: {
      COMMON:   { border: 0x00ff00, bg: 0x003300 },
      GREAT:    { border: 0x0080ff, bg: 0x001133 },
      ULTRA:  { border: 0xffd700, bg: 0x4d3f00 },
      ROGUE:    { border: 0xffa500, bg: 0x4d2a00 },
      MASTER:   { border: 0xff0000, bg: 0x4d0000 },
      LEGENDARY:{ border: 0x9932cc, bg: 0x330066 },
    } as const,

  };

  private rootContainer: Phaser.GameObjects.Container;
  private bgHitZone: Phaser.GameObjects.Zone | null = null;
  private infoContainer: Phaser.GameObjects.Container;
  private gridContainer: Phaser.GameObjects.Container;
  private previewContainer: Phaser.GameObjects.Container;
  protected titleText: Phaser.GameObjects.Text;
  private titleContainer: Phaser.GameObjects.Container;
  private titleBackground: Phaser.GameObjects.Graphics;
  private championSprites: Phaser.GameObjects.Sprite[] = [];
  private championNameTexts: Phaser.GameObjects.Text[] = [];
  private unlockStatusTexts: Phaser.GameObjects.Text[] = [];
  private gridXpContainers: Phaser.GameObjects.Container[] = [];
  private gridXpBarBgs: Phaser.GameObjects.Graphics[] = [];
  private gridXpBarFills: Phaser.GameObjects.Graphics[] = [];
  private gridLevelLabels: Phaser.GameObjects.Text[] = [];
  private gridCellBackgrounds: Phaser.GameObjects.Graphics[] = [];
  private gridBordersGraphics: Phaser.GameObjects.Graphics | null = null;
  private skillsContainer: Phaser.GameObjects.Container | null = null;
  private skillsBg: Phaser.GameObjects.Graphics | null = null;
  private skillTextLines: Phaser.GameObjects.Text[] = [];
  private unlocksContainer: Phaser.GameObjects.Container | null = null;
  private skillListContainer: Phaser.GameObjects.Container | null = null;
  private skillItemContainers: Phaser.GameObjects.Container[] = [];
  private skillItemBgs: Phaser.GameObjects.Graphics[] = [];
  private skillArrowUp: Phaser.GameObjects.Sprite | null = null;
  private skillArrowDown: Phaser.GameObjects.Sprite | null = null;
  private selectedSkillIndex: number = 0;
  private _hoverSkillIndex: number = -1;
  private skillScrollOffset: number = 0;
  private skillBarScrollOffset: number = 0;
  private _suppressSkillBarAutoPan: boolean = false;
  private _hoveredIconBarX: number = 0;
  private _hoveredIconBarY: number = 0;
  private _isHoverTooltip: boolean = false;
  private skillTooltipActive: boolean = false;
  private _unlockBtnTooltipContainer: Phaser.GameObjects.Container | null = null;
  private _unlockBtnTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private _unlockBtnTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private _unlockBtnTooltipRarity: Phaser.GameObjects.Text | null = null;
  private _unlockBtnTooltipTitle: Phaser.GameObjects.Text | null = null;
  private _unlockBtnTooltipDesc: any | null = null;
  private _unlockBtnTooltipSectionHeader: Phaser.GameObjects.Text | null = null;
  private _unlockBtnTooltipSectionLine: Phaser.GameObjects.Graphics | null = null;
  private _unlockBtnTooltipCostContainer: Phaser.GameObjects.Container | null = null;
  private _unlockBtnTooltipLore: any | null = null;
  private _unlockBtnTooltipLoreBarBg: Phaser.GameObjects.Graphics | null = null;
  private knownSkillsCollapsed: boolean = true;
  private skillTooltipContainer: Phaser.GameObjects.Container | null = null;
  private skillTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private skillTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipTitle: Phaser.GameObjects.Text | null = null;
  private skillTooltipRarity: Phaser.GameObjects.Text | null = null;
  private skillTooltipDesc: any | null = null;
  private skillTooltipCost: Phaser.GameObjects.Text | null = null;
  private skillTooltipCostContainer: Phaser.GameObjects.Container | null = null;
  private skillTooltipPrereq: Phaser.GameObjects.Text | null = null;
  private skillTooltipSectionHeader: Phaser.GameObjects.Text | null = null;
  private skillTooltipSectionLine: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipDescHeader: Phaser.GameObjects.Text | null = null;
  private skillTooltipDescLine: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipDetailHeader: Phaser.GameObjects.Text | null = null;
  private skillTooltipDetailLine: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipDetailName: Phaser.GameObjects.Text | null = null;
  private skillTooltipDetail: Phaser.GameObjects.Text | null = null;
  private skillTooltipLore: any | null = null;
  private skillTooltipLoreBarBg: Phaser.GameObjects.Graphics | null = null;
  private skillListPanelContainer: Phaser.GameObjects.Container | null = null;
  private skillListPanelBg: Phaser.GameObjects.Graphics | null = null;
  private skillsHeaderText: Phaser.GameObjects.Text | null = null;
  private skillsSubheaderText: Phaser.GameObjects.Text | null = null;
  private mockupFooterText: Phaser.GameObjects.Text | null = null;
  private skillIconBarContainer: Phaser.GameObjects.Container | null = null;
  private skillIconSprites: Phaser.GameObjects.Sprite[] = [];
  private skillIconBgs: Phaser.GameObjects.Graphics[] = [];
  private _tweakUnlockedSprites: Phaser.GameObjects.Sprite[] = [];
  private _tweakNextSprites: Phaser.GameObjects.Sprite[] = [];
  private _tweakFutureSprites: Phaser.GameObjects.Sprite[] = [];
  private _tweakFocusedGoldTile: any = null;
  private _tweakFocusedIconSprite: Phaser.GameObjects.Sprite | null = null;
  private _skillProgressStrip: Phaser.GameObjects.NineSlice | null = null;
  private _skillEmptyTrack: Phaser.GameObjects.NineSlice | null = null;
  private _skillSurroundFill: Phaser.GameObjects.NineSlice | null = null;
  private nextSkillLabel: Phaser.GameObjects.Text | null = null;
  private useEssenceButtonContainer: Phaser.GameObjects.Container | null = null;
  private useEssenceButtonText: Phaser.GameObjects.Text | null = null;
  private useEssenceButtonIcon: Phaser.GameObjects.Sprite | null = null;
  private _notEnoughEssenceIcon: Phaser.GameObjects.Sprite | null = null;
  private _notEnoughIconScale: number = 0.16;
  private _notEnoughIconOffsetX: number = -35;
  private _btnEssenceCostContainer: Phaser.GameObjects.Container | null = null;
  private _btnEssenceCostBg: Phaser.GameObjects.Graphics | null = null;
  private _btnEssenceCostBgW: number = 51.3;
  private _btnEssenceCostBgH: number = 5.7;
  private _btnEssenceCostBgAlpha: number = 0.82;
  private _btnEssenceCostBgOffsetX: number = -4.8;
  private _btnEssenceCostBgOffsetY: number = 1.0;
  private _btnEssenceCostOffsetX: number = 5;
  private _btnEssenceCostOffsetY: number = 0.4;
  private _btnEssenceCostIconScale: number = 0.280;
  private _btnEssenceCostFontSize: number = 27;
  private _btnEssenceCostIcons: Phaser.GameObjects.Sprite[] = [];
  private _btnEssenceCostSpecialIcons: Phaser.GameObjects.Sprite[] = [];
  private _btnEssenceCostSpecialIconScale: number = 0.276;
  private _btnEssenceCostSpecialIconOffsetX: number = 0;
  private _btnEssenceCostTexts: Phaser.GameObjects.Text[] = [];
  private _nextSkillCostGroupGap: number = 0;
  private _btnEssenceCostGroupGap: number = 1;
  private _requirementBgContainer: Phaser.GameObjects.Container | null = null;
  private _requirementBgImg: Phaser.GameObjects.Image | null = null;
  private _showRequirementMode: boolean = false;

  private fullChampionSprite: Phaser.GameObjects.Sprite | null = null;
  private fullChampionTintSprite: Phaser.GameObjects.Sprite | null = null;
  private portraitSpriteContainer: Phaser.GameObjects.Container | null = null;
  private portraitMaskGfx: Phaser.GameObjects.Graphics | null = null;
  private portraitClipMask: Phaser.Display.Masks.GeometryMask | null = null;
  private typeIcon1: Phaser.GameObjects.Sprite | null = null;
  private typeIcon2: Phaser.GameObjects.Sprite | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private essenceInstructionText: Phaser.GameObjects.Text | null = null;

  private xpBarContainer: Phaser.GameObjects.Container | null = null;
  private xpBarBg: Phaser.GameObjects.Graphics | null = null;
  private xpBarFill: Phaser.GameObjects.Graphics | null = null;
  private essenceHoldTimer?: Phaser.Time.TimerEvent;
  private essenceHoldActiveType: Type | null = null;
  private xpLabelTicker?: Phaser.Time.TimerEvent;
  private visualCurrentEssence: number = 0;

  private healingPulseSound: Phaser.Sound.BaseSound | null = null;
  private isEssenceCommitActive: boolean = false;
  private healingPulseSoundStartTime: number = 0;
  private modalBgGraphics: Phaser.GameObjects.Graphics | null = null;
  private footerBand: Phaser.GameObjects.Graphics | null = null;

  private isLevelUpAnimationActive: boolean = false;
  private isChampionUnlockCutsceneActive: boolean = false;
  private championUnlockHoldText: Phaser.GameObjects.Text | null = null;
  private championUnlockHoldGaugeBg: Phaser.GameObjects.Rectangle | null = null;
  private championUnlockHoldGaugeFill: Phaser.GameObjects.Rectangle | null = null;
  private championUnlockHoldGaugeTween: Phaser.Tweens.Tween | null = null;
  private championUnlockHoldTimer: Phaser.Time.TimerEvent | null = null;
  private championUnlockHoldingButton: Button | null = null;
  private championUnlockHoldingPointer: boolean = false;
  private championUnlockInputDownHandler: ((event: any) => void) | null = null;
  private championUnlockInputUpHandler: ((event: any) => void) | null = null;
  private championUnlockPointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private championUnlockPointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private inputLockTimer?: Phaser.Time.TimerEvent;

  private skillTreeNodeGenerator?: SkillTreeNodeGenerator;
  private modalMessage: ModalMessageUiHandler | null = null;
  private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
  private modalBackgroundCreated: boolean = false;
  private modalDarkOverlay: Phaser.GameObjects.Rectangle | null = null;
  private availableChampions: string[] = [];
  private selectedChampionIndex = 0;
  private config: ChampionSelectConfig | null = null;
  private essenceListContainer: Phaser.GameObjects.Container | null = null;
  private essenceListItems: { icon: Phaser.GameObjects.GameObject; text: Phaser.GameObjects.Text }[] = [];
  private specialTypeSprites: Map<Type, Set<Phaser.GameObjects.Sprite>> = new Map();

  private _metaMode: TweakMetaMode = TweakMetaMode.NONE;
  get _tweakActive(): boolean { return this._metaMode !== TweakMetaMode.NONE; }
  private _tweakMode: number = 0;
  private _tweakAssetIndex: number = 0;
  private _tweakBaselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; displayWidth: number; displayHeight: number; alpha: number; fontSize: number }> = new Map();
  private _stripeBaselines: Map<number, number[]> = new Map();
  private _barAreaBaselines: { x: number; y: number; scaleX: number; scaleY: number; displayWidth: number; displayHeight: number; alpha: number; fontSize: number }[] = [];
  private _tweakHudText: Phaser.GameObjects.Text | null = null;
  private _tweakKeyOneHandler: (() => void) | null = null;
  private _tweakKeyTwoHandler: (() => void) | null = null;
  private _tweakKeyThreeHandler: (() => void) | null = null;
  private _tweakKeyVHandler: (() => void) | null = null;
  private static readonly TWEAK_MODES = ["scale", "position", "width", "height", "alpha", "fontSize", "textStyle", "textStyleOn"];
  private _lastNextSkillX: number = 0;
  private _barNextSkillId: string | null = null;
  private static readonly TWEAK_ASSETS = [
    "ChampionSprite", "PortraitTile", "WhiteBar", "ProgressFill",
    "FutureSkillBG", "UnlockBtnCKey", "FocusedTile", "FocusedIconSprite",
    "EssenceRow", "UnlockedSprites", "NextSprites", "FutureSprites",
    "AllSkillIcons", "AllBars", "Title", "ChampNameLevel", "EssenceText",
    "UnlockBtnGroup", "UnlockBtnText", "IconSpacing", "SurroundFillBG",
    "NextLabel", "RequirementStrip", "RequirementBg", "StripeSpacing", "StripeFontSize",
    "StripeEssenceScale", "StripeEssencePos", "StripeTypeScale", "StripeTypePos",
    "StripeBgWidth", "StripeBgHeight", "StripeBgAlpha", "StripeBgScale",
    "StripeDotFontSize", "StripeDotPos",
    "StripeSpecialLabelFS", "StripeSpecialTypeScale",
    "PreviewTypeIcons", "StripeSpecialPos",
    "PortraitMaskH", "PortraitMaskOffsetY",
    "HintStripeFontSize", "HintStripeBottomInset", "HintStripeTextPos",
    "StripeSpecialLabelPos",
    "TooltipWidth", "TooltipHeightOffset", "TooltipPos",
    "TooltipSpecialIconScale", "TooltipSpecialLabelFS", "TooltipSpecialLabelPos",
    "HintLoreAlpha",
    "HoverArea",
    "ChampionName", "ChampionSubtitle", "ChampionLevel", "ChampionType",
    "tileBlackBG",
    "NextSkillCostBg", "NextSkillCostIcons", "NextSkillCostText", "NextSkillCostAll",
    "UnlockBtnEssenceIcon", "UnlockBtnCostBg", "UnlockBtnCostIcons", "UnlockBtnCostText", "UnlockBtnCostAll",
    "BarAreaGroup", "NextSkillCostSpacing", "UnlockBtnCostSpacing", "UnlockBtnImg",
    "UnlockBtnCostSpecialIcons",
    "UnlockBtnCostGroup", "UnlockBtnCostIconsAndText"
  ];
  private static readonly TWEAK_ASSET_GROUPS: Record<string, string[]> = {
    "UnlockBtn": [
      "UnlockBtnCKey", "UnlockBtnGroup", "UnlockBtnText", "UnlockBtnImg",
      "UnlockBtnEssenceIcon", "UnlockBtnCostBg", "UnlockBtnCostIcons",
      "UnlockBtnCostText", "UnlockBtnCostAll", "UnlockBtnCostSpacing",
      "UnlockBtnCostSpecialIcons", "UnlockBtnCostGroup", "UnlockBtnCostIconsAndText"
    ],
    "UnlockBtnCost": [
      "UnlockBtnCostGroup", "UnlockBtnCostIconsAndText",
      "UnlockBtnEssenceIcon", "UnlockBtnCostIcons",
      "UnlockBtnCostText", "UnlockBtnCostSpecialIcons"
    ],
    "NextSkillCost": [
      "NextSkillCostBg", "NextSkillCostIcons", "NextSkillCostText",
      "NextSkillCostAll", "NextSkillCostSpacing"
    ],
    "BarArea": [
      "BarAreaGroup", "WhiteBar", "ProgressFill", "FutureSkillBG",
      "SurroundFillBG", "NextLabel"
    ],
    "Stripe": [
      "RequirementStrip", "RequirementBg", "StripeSpacing", "StripeFontSize",
      "StripeEssenceScale", "StripeEssencePos", "StripeTypeScale", "StripeTypePos",
      "StripeBgWidth", "StripeBgHeight", "StripeBgAlpha", "StripeBgScale",
      "StripeDotFontSize", "StripeDotPos", "StripeSpecialLabelFS",
      "StripeSpecialTypeScale", "StripeSpecialPos"
    ],
    "Preview": [
      "ChampionSprite", "ChampionName", "ChampionSubtitle", "ChampionLevel",
      "ChampionType", "PortraitTile", "tileBlackBG", "PreviewTypeIcons"
    ],
    "SkillIcons": [
      "AllSkillIcons", "UnlockedSprites", "NextSprites", "FutureSprites",
      "FocusedTile", "FocusedIconSprite", "IconSpacing"
    ],
  };
  private _dropdownPanel: TweakDropdownPanel | null = null;
  private _hoverTweakGraphics: Phaser.GameObjects.Graphics | null = null;
  private _hoverTweakRect = { x: -85.8, y: -11.15, w: 171.6, h: 22.3 };
  private _hoverTweakMode: "position" | "size" = "position";
  private _hoverTweakActive = false;
  private _requirementHoverZone: Phaser.GameObjects.Zone | null = null;
  private static readonly STRIPE_ASSET_LABELS: Record<number, string> = {
    24: "SPACING",
    25: "FONTSIZE",
    26: "SCALE",
    27: "POSITION",
    28: "SCALE",
    29: "POSITION",
    30: "WIDTH",
    31: "HEIGHT",
    32: "ALPHA",
    33: "SCALE",
    34: "FONTSIZE",
    35: "POSITION",
    36: "FONTSIZE",
    37: "SCALE",
    39: "POSITION",
    40: "HEIGHT",
    41: "POSITION",
    42: "FONTSIZE",
    43: "INSET",
    44: "POSITION",
    45: "POSITION",
    46: "WIDTH",
    47: "HEIGHT",
    48: "POSITION",
    49: "SCALE",
    50: "FONTSIZE",
    51: "POSITION",
    52: "ALPHA",
    53: "RECT",
    59: "WIDTH_HEIGHT",
    60: "SCALE",
    61: "FONTSIZE",
    64: "WIDTH_HEIGHT",
    69: "SPACING",
    70: "SPACING",
  };
  private _stripeSpacing: number = 9;
  private _stripeFontSize: number = 33;
  private _stripeEssenceScale: number = 0.21;
  private _stripeTypeScale: number = 0.39;
  private _stripeEssenceX: number = 8;
  private _stripeEssenceY: number = -1;
  private _stripeTypeX: number = -3;
  private _stripeTypeY: number = 0;
  private _stripeDotFontSize: number = 37;
  private _stripeDotX: number = -6;
  private _stripeDotY: number = 0;
  private _stripeSpecialLabelFontSize: number = 28;
  private _stripeSpecialTypeScale: number = 0.475;
  private _stripeSpecialX: number = -3;
  private _stripeSpecialY: number = 0;
  private _stripeSpecialLabelX: number = 0;
  private _stripeSpecialLabelY: number = 0;
  private _stripeSpecialContainers: Phaser.GameObjects.Container[] = [];
  private _portraitMaskH: number = 58.8;
  private _portraitMaskOffsetY: number = 0;
  private _portraitMaskLeftExtend: number = 0;
  private previewTileBlackBg: Phaser.GameObjects.Graphics | null = null;
  private _tileBlackBgW: number = 60;
  private _tileBlackBgH: number = 13;
  private _tileBlackBgAlpha: number = 0.82;
  private _nextSkillCostContainer: Phaser.GameObjects.Container | null = null;
  private _nextSkillCostBg: Phaser.GameObjects.Graphics | null = null;
  private _nextSkillCostBgW: number = 38;
  private _nextSkillCostBgH: number = 8;
  private _nextSkillCostBgAlpha: number = 0.46;
  private _nextSkillCostOffsetX: number = -1;
  private _nextSkillCostOffsetY: number = -1;
  private _nextSkillCostIconScale: number = 0.28;
  private _nextSkillCostFontSize: number = 27;
  private _nextSkillCostIcons: Phaser.GameObjects.Sprite[] = [];
  private _nextSkillCostTexts: Phaser.GameObjects.Text[] = [];
  private _hintStripeFontSize: number = 30;
  private _hintStripeBottomInset: number = 2;
  private _hintStripeTextX: number = 1;
  private _hintStripeTextY: number = 3;
  private _tooltipWidth: number = 120;
  private _tooltipHeightOffset: number = 3;
  private _hintLoreAlpha: number = 1.0;
  private _tooltipOffsetX: number = 0;
  private _tooltipOffsetY: number = 0;
  private _tooltipSpecialIconScale: number | null = null;
  private _tooltipSpecialLabelFontSize: number | null = 29;
  private _tooltipSpecialLabelX: number | null = null;
  private _tooltipSpecialLabelY: number | null = null;
  private _stripeBgWidth: number = 171.6;
  private _stripeBgHeight: number = 14.3;
  private _stripeBgAlpha: number = 1.0;
  private _stripeBgScale: number = 1.0;
  private static readonly STRIPE_BG_TEXTURE = "newchampion_requirement_bg";
  private static readonly STRIPE_BG_TEXTURE_BACKUP_FOCUS_TILE = "newchampion_silver_focus_tilex";
  private _stripeEssenceSprite: Phaser.GameObjects.Sprite | null = null;
  private _stripeTypeSprites: Phaser.GameObjects.Sprite[] = [];
  private _stripeDotTexts: Phaser.GameObjects.Text[] = [];
  private lastEssenceListSignature: string | null = null;
  private lastEssenceErrorTime: number = 0;
  private get championManager(): ChampionManager {
    return ChampionManager.getInstance();
  }
  private buildLockedSegments(championId: string): Array<{ types: Type[]; amount: number }> {
    const def = CHAMPION_DEFINITIONS[championId] as any;
    const totalEssence = Math.floor((def?.unlockRequirements?.totalEssenceRequirement as number) || 0);
    if (totalEssence <= 0) return [];
    const reqs = (def?.unlockRequirements?.essenceRequirements || []) as Array<{ type: Type | Type[]; amount?: number }>;
    if (reqs.length > 0) {
      const segments = reqs
        .map(r => ({ types: Array.isArray(r.type) ? r.type : [r.type], amount: Math.max(1, Math.floor(r.amount || 0)) }))
        .map(r => ({ types: r.types.filter(t => typeof t === "number") as Type[], amount: r.amount }))
        .filter(r => r.types.length > 0);
      if (segments.length > 0) return segments;
    }
    const total = Math.max(1, Math.floor((def?.unlockRequirements?.totalEssenceRequirement as number) || 0));
    const types = [def?.type1, def?.type2].filter(t => typeof t === "number") as Type[];
    if (types.length === 0) return [{ types: [Type.NORMAL], amount: total }];
    const base = Math.floor(total / types.length);
    let remainder = total - base * types.length;
    return types.map((t, i) => ({ types: [t], amount: base + (i < remainder ? 1 : 0) }));
  }

  private static smitomChampionSkillsDebugShown = false;

  constructor(scene: BattleScene) {
    super(scene, Mode.CHAMPION_SELECT);
  }
  private triggerSmitomChampionSkillsTipIfNeeded(): void {
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !ChampionSelectUiHandler.smitomChampionSkillsDebugShown) {
      ChampionSelectUiHandler.smitomChampionSkillsDebugShown = true;
      flags["champion_select_skills_welcome"] = false;
    }
    if (flags["champion_select_skills_welcome"]) return;
    scene.time.delayedCall(350, () => {
      if (scene.ui.getMode() !== Mode.CHAMPION_SELECT) return;
      const tipConfig: SmitomTipConfig = {
        tutorialKey: "champion_select_skills_welcome",
        title: i18next.t("tutorial:smitomTip.championSelectSkills.title"),
        texts: [
          i18next.t("tutorial:smitomTip.championSelectSkills.1"),
          i18next.t("tutorial:smitomTip.championSelectSkills.2"),
        ],
        offerReplay: true,
        onComplete: () => {
          scene.gameData.smitomTutorialFlags["champion_select_skills_welcome"] = true;
          scene.gameData.saveSystem();
        }
      };
      scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
    });
  }

  private getSkillRarityFromDef(s: any): SkillTreeRarity {
    if (!s) return SkillTreeRarity.COMMON;

    const rewardType: SkillTreeRewardType | undefined = (s as any)?.rewardType;
    if (rewardType !== undefined) {
      try {
        return getDisplayRarityForRewardType(rewardType);
      } catch {

      }
    }

    const cat = (s as any)?.category;
    switch (cat) {
      case (SkillCategory as any).TMS: return SkillTreeRarity.COMMON;
      case (SkillCategory as any).XMS: return SkillTreeRarity.MASTER;
      case (SkillCategory as any).ABILITY_POOL: return SkillTreeRarity.GREAT;
      case (SkillCategory as any).SIGNATURE_POKEMON: return SkillTreeRarity.ULTRA;
      case (SkillCategory as any).MOVE_UPGRADES: return SkillTreeRarity.ULTRA;
      case (SkillCategory as any).MEGA_STONES: return SkillTreeRarity.ROGUE;
      case (SkillCategory as any).TRAINER_BOND_ABILITIES: return SkillTreeRarity.ULTRA;
      case (SkillCategory as any).LEGENDARY_POKEMON: return SkillTreeRarity.LEGENDARY;
      case (SkillCategory as any).STAT_BOOSTS: return SkillTreeRarity.GREAT;
      default: return SkillTreeRarity.COMMON;
    }
  }

  private getRarityColors(rarity: SkillTreeRarity): { border: number; bg: number } {
    const c = ChampionSelectUiHandler.UI_CONSTANTS.RARITY_COLORS;
    switch (rarity) {
      case SkillTreeRarity.GREAT: return c.GREAT;
      case SkillTreeRarity.ULTRA: return c.ULTRA;
      case SkillTreeRarity.MASTER: return c.MASTER;
      case SkillTreeRarity.ROGUE: return c.ROGUE;
      case SkillTreeRarity.LEGENDARY: return c.LEGENDARY;
      case SkillTreeRarity.COMMON:
      default: return c.COMMON;
    }
  }

  private decorateSpecialIcon(type: Type, spr: Phaser.GameObjects.Sprite): void {
    if (!this.specialTypeSprites.has(type)) this.specialTypeSprites.set(type, new Set());
    this.specialTypeSprites.get(type)!.add(spr);
    if ((spr as any)._specialDecorated) return;
    if (type === (Type as any).SMITTY) {
      spr.setTint(0xFF0000);
      (spr as any)._specialDecorated = true;
      return;
    }
    if (type === (Type as any).GLITCH) {
      try {
        if (spr.postFX && typeof spr.postFX.addColorMatrix === 'function') {
          const cm = spr.postFX.addColorMatrix();
          cm.negative();
          (spr as any)._specialDecorated = true;
          return;
        }
      } catch {}
      spr.setTint(0xFF00FF);
      (spr as any)._specialDecorated = true;
      return;
    }
    if (type === (Type as any).GEN_ONE) {
      spr.setTint(0x33CC33);
      (spr as any)._specialDecorated = true;
    }
  }

  private getEssenceListSignature(rows: Array<{ type: Type; count: number; isSpecial?: boolean }>): string {
    return rows
      .map(r => `${Type[r.type]}:${r.count}:${r.isSpecial || false}`)
      .join("|");
  }
  private startHealingPulseSound(): void {

    if (this.healingPulseSound && this.healingPulseSound.isPlaying) {
      const currentTime = Date.now();
      const timePlaying = currentTime - this.healingPulseSoundStartTime;
      const sound = this.healingPulseSound as any;
      let thresholdTime = 2000;
      if (sound.duration && sound.duration > 0) {
        thresholdTime = sound.duration * 1000 * 0.45;
      }

      if (timePlaying < thresholdTime) {
        return;
      }

      this.healingPulseSound.destroy();
      this.healingPulseSound = null;
    }

    try {

      if (this.healingPulseSound) {
        this.healingPulseSound.destroy();
        this.healingPulseSound = null;
      }
      this.healingPulseSound = this.scene.sound.add("battle_anims/PRSFX- Healing Pulse", {
        loop: false,
        volume: this.scene.masterVolume * this.scene.fieldVolume * 0.5
      });

      const s = this.healingPulseSound;
      s.once("complete", () => {
        if (this.isEssenceCommitActive) {
          this.startHealingPulseSound();
        } else {
          this.healingPulseSound?.destroy();
          this.healingPulseSound = null;
        }
      });

      s.play();
      this.healingPulseSoundStartTime = Date.now();
    } catch (error) {
      console.error("Failed to play healing pulse sound:", error);
    }
  }
  private stopHealingPulseSound(): void {
    if (this.healingPulseSound) {
      if (this.healingPulseSound.isPlaying) {
        this.healingPulseSound.stop();
      }
      this.healingPulseSound.destroy();
      this.healingPulseSound = null;
    }
  }

  private onCommitBegin(): void {
    this.isEssenceCommitActive = true;
    this.startHealingPulseSound();
  }

  private onCommitEnd(): void {
    this.isEssenceCommitActive = false;
  }

  private getRarityText(rarity: SkillTreeRarity): string {
    if (!rarity) {
      return "UNKNOWN";
    }

    const rarityString = rarity.toString();
    return i18next.t(`championSelect:rarity.${rarityString}`, { defaultValue: rarityString.toUpperCase() });
  }

  private async onEssenceCommitted(championId: string, previousLevel: number | null = null): Promise<void> {
    this._showRequirementMode = false;
    this.updateEssenceGauge(championId, true);
    this.updateGridXpGauge(championId);
    this.updateLevelUpButton(championId);
    this.updateNextSkillCostDisplay(championId);
    const champData = this.championManager.getChampionData(championId);
    const level = champData?.level || 1;
    if (previousLevel !== null && level > previousLevel) {
      this.isLevelUpAnimationActive = true;
      const skillReveal = this.buildSkillRevealForLevel(championId, champData, level);
      await playGenericLevelUpAnimation(this.scene as BattleScene, undefined, undefined, skillReveal || undefined);
      this.isLevelUpAnimationActive = false;
      this.lockInput(500);
      this.selectedSkillIndex = -1;
      this.skillBarScrollOffset = 0;
      this._suppressSkillBarAutoPan = false;
      this.renderSkillList(championId);
      try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
    } else {
      this.renderSkillList(championId);
    }
    if (this.skillTooltipActive) {
      this.updateSkillTooltip(championId);
    }
  }

  private buildSkillRevealForLevel(championId: string, champData: any, level: number): SkillRevealConfig | null {
    if (!champData?.unlockedSkills) return null;
    const defs = this.getChampionStaticDefs(championId);
    let foundSkill: any = null;
    let foundName = "";
    for (const [skillId, unlock] of Object.entries(champData.unlockedSkills)) {
      const unlockData = unlock as any;
      if (unlockData?.level === level) {
        const skillDef = defs?.lockedSkills?.[skillId] || unlockData?.skillDef || null;
        if (skillDef) {
          foundSkill = skillDef;
          foundName = this.getSkillDisplayName(skillDef, championId, skillId);
          break;
        }
      }
    }
    if (!foundSkill) {
      if (defs?.lockedSkills) {
        for (const [skillId, skillDef] of Object.entries(defs.lockedSkills) as Array<[string, any]>) {
          if (skillDef.unlockLevel === level && champData.unlockedSkills[skillId]) {
            foundSkill = skillDef;
            foundName = this.getSkillDisplayName(skillDef, championId, skillId);
            break;
          }
        }
      }
    }
    if (!foundSkill) return null;
    const rarity = getDisplayRarityForRewardType(foundSkill.rewardType);
    const iconConfig = this.getSkillIconConfig(foundSkill.rewardType, foundSkill, championId);
    return { rarity, iconConfig, skillName: foundName };
  }

  private getChampionStaticDefs(championId: string): any {
    try {
      return CHAMPION_DEFINITIONS[championId] || null;
    } catch {
      return null;
    }
  }

  private getSkillDisplayName(skillDef: any, championId: string, skillId?: string): string {
    const resolved = this.resolveChampionId(championId);
    const name = this.getSkillNameOnly(resolved, skillDef);
    if (name && name !== "???" && name !== "Unknown Reward") {
      return name.includes(": ") ? name.substring(name.indexOf(": ") + 2) : name;
    }
    if (skillId) return skillId.replace(/_/g, " ");
    return "???";
  }

  getModalTitle(): string { return i18next.t("championSelect:title", { defaultValue: "Select Champion" }); }
  getWidth(): number { return Math.floor(this.scene.game.canvas.width / 6); }
  getHeight(): number { return Math.floor(this.scene.game.canvas.height / 6); }
  getMargin(): [number, number, number, number] { return [0, 0, 0, 0]; }
  getButtonLabels(): string[] { return []; }

  protected createModalBackground(): void {
  }

  updateContainer(config?: ModalConfig): void {
    super.updateContainer(config);

    if (!this.modalBackgroundCreated) {
      this.modalBackgroundImage = this.scene.add.sprite(0, 0, "light_bg") as any;
      this.modalBackgroundImage.setOrigin(0, 0);
      (this.modalBackgroundImage as any).setTint(0xFFFFFF);
      try {
        (this.modalBackgroundImage as any).setPipeline("INVERT");
      } catch {
        (this.modalBackgroundImage as any).setTint(0x111122);
      }
      this.modalContainer.addAt(this.modalBackgroundImage, 1);

      this.modalDarkOverlay = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.25) as any;
      (this.modalDarkOverlay as any).setOrigin(0, 0);
      this.modalContainer.addAt(this.modalDarkOverlay, 2);

      this.modalBackgroundCreated = true;
    }

    const vpW = this.getWidth() + 2;
    const vpH = this.getHeight() + 2;
    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.setPosition(0, 0);
      (this.modalBackgroundImage as any).setDisplaySize(vpW, vpH);
    }
    if (this.modalDarkOverlay) {
      (this.modalDarkOverlay as any).setPosition(0, 0);
      (this.modalDarkOverlay as any).setDisplaySize(vpW, vpH);
    }
    if (this.rootContainer && this.rootContainer.parentContainer === this.modalContainer) {
      this.modalContainer.bringToTop(this.rootContainer);
    }
  }

  private setupTitleContainer(): void {
    const c = ChampionSelectUiHandler.UI_CONSTANTS;
    const width = this.getWidth();

    this.titleContainer = this.scene.add.container(
      c.TITLE_CONTAINER.X_OFFSET,
      c.TITLE_CONTAINER.Y_OFFSET
    );
    this.modalContainer.add(this.titleContainer);
    this.titleContainer.setDepth(1000);

    this.titleBackground = this.scene.add.graphics();
    this.titleBackground.clear();
    this.titleBackground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.0, 0.9, 0.0);
    this.titleBackground.fillRect(0, 0, width, c.TITLE_CONTAINER.HEIGHT);
    this.titleContainer.add(this.titleBackground);

    if (!this.titleText) {
      this.titleText = addTextObject(this.scene, 0, 0, "", TextStyle.PARTY, { fontSize: c.TITLE.FONT_SIZE, color: "#FFFFFF" });
    } else if (this.titleText.parentContainer) {
      this.titleText.parentContainer.remove(this.titleText);
    }

    this.titleContainer.add(this.titleText);
    this.titleText.setText(i18next.t("championSelect:skillsOfTitle", { subtitle: "", defaultValue: "SKILLS OF" }));
    this.titleText.setPosition(width / 2, c.TITLE.Y_OFFSET);
    this.titleText.setOrigin(0.5, 0);
    this.titleText.setStyle({ fontFamily: "pkmnems", fontSize: c.TITLE.FONT_SIZE, align: "center", color: "#FFFFFF" });
    this.titleText.setTint(c.TITLE.COLOR);
    this.titleText.setAlpha(c.TITLE.ALPHA);
    this.titleText.setShadow(0, 0, undefined);
    this.titleText.setStroke(c.TITLE.STROKE_COLOR, c.TITLE.STROKE_THICKNESS);
    this.titleText.setVisible(true);
  }

  private fixTitlePositioning(): void {
    const c = ChampionSelectUiHandler.UI_CONSTANTS;
    const width = this.getWidth();

    if (this.titleText && this.titleContainer) {
      this.titleText.setPosition(width / 2, c.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0.5, 0);
    }
  }

  private updateTitleForChampion(championId: string): void {
    if (!this.titleText) return;
    const resolvedId = this.resolveChampionId(championId);
    const description = this.getChampionDescription(championId);
    const subtitle = description.replace(/^Champion of\s*/i, "").toUpperCase();
    this.titleText.setText(
      i18next.t("championSelect:skillsOfTitle", { subtitle, defaultValue: `SKILLS OF ${subtitle}` })
    );
    this.fixTitlePositioning();
  }

  setup(): void {
    super.setup();
    this.rootContainer = this.scene.add.container(0, 0);
    this.modalContainer.add(this.rootContainer);

    this.bgHitZone = this.scene.add.zone(0, 0, this.getWidth(), this.getHeight());
    this.bgHitZone.setOrigin(0, 0);
    this.bgHitZone.setInteractive({ useHandCursor: false });
    this.bgHitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
      if (pointer.button === 0) {
        this.processInput(Button.ACTION);
      }
    });
    this.rootContainer.add(this.bgHitZone);
    this.setupTitleContainer();

    this.infoContainer = this.scene.add.container(10, 18);
    this.rootContainer.add(this.infoContainer);
    this.infoContainer.setDepth(1);

    const previewX = Math.floor(this.getWidth() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.X;
    const previewY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.Y;
    this.previewContainer = this.scene.add.container(previewX, previewY);
    this.rootContainer.add(this.previewContainer);
    this.previewContainer.setDepth(6);

    this.portraitSpriteContainer = this.scene.add.container(0, 0);
    this.portraitSpriteContainer.setDepth(1);
    this.previewContainer.add(this.portraitSpriteContainer);

    this.portraitMaskGfx = this.scene.make.graphics({});
    this.portraitMaskGfx.setScale(6);
    this.portraitClipMask = this.portraitMaskGfx.createGeometryMask();
    this.portraitSpriteContainer.setMask(this.portraitClipMask);

    const previewName = addTextObject(this.scene, -25, 0, "", TextStyle.PARTY, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.NAME_FONT_SIZE,
      align: "center",
      color: "#E8E8E8"
    });
    previewName.setOrigin(0, 0);
    previewName.setDepth(2);
    previewName.setShadow(0, 0, undefined);
    previewName.setStroke("#424242", 14);
    this.previewTileBlackBg = this.scene.add.graphics();
    this.previewTileBlackBg.setDepth(1);
    this.previewTileBlackBg.setPosition(0, 8);
    this.previewContainer.add(this.previewTileBlackBg);

    this.previewContainer.add(previewName);
    (this as any)._previewName = previewName;
    this.typeIcon1 = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, "pbinfo_enemy_type1");
    this.typeIcon1.setVisible(false);
    this.typeIcon1.setDepth(1.5);
    this.typeIcon2 = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, "pbinfo_enemy_type2");
    this.typeIcon2.setVisible(false);
    this.typeIcon2.setDepth(1.5);
    this.previewContainer.add(this.typeIcon1);
    this.previewContainer.add(this.typeIcon2);

    const affinityIcon = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, "categories", "status");
    affinityIcon.setOrigin(0.5, 0.5);
    affinityIcon.setScale(0.7);
    affinityIcon.setTint(0xC8A000);
    affinityIcon.setVisible(false);
    affinityIcon.setDepth(1.5);
    this.previewContainer.add(affinityIcon);
    (this as any)._previewAffinityIcon = affinityIcon;

    const affinityOverlay = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, "", TextStyle.WINDOW, {
      fontSize: "39px",
      align: "center",
      stroke: "#000000",
      strokeThickness: 3
    });
    affinityOverlay.setOrigin(0.5, 0.5);
    affinityOverlay.setVisible(false);
    affinityOverlay.setDepth(1.5);
    this.previewContainer.add(affinityOverlay);
    (this as any)._previewAffinityOverlay = affinityOverlay;
    this.typeIcon1.setScale(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_SCALE);
    this.typeIcon2.setScale(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_SCALE);
    const previewSubtitle = addTextObject(this.scene, -25, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SUBTITLE_Y, "", TextStyle.PARTY, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SUBTITLE_FONT_SIZE,
      align: "center",
      color: "#E8E8E8"
    });
    previewSubtitle.setOrigin(0, 0);
    previewSubtitle.setDepth(2);
    previewSubtitle.setShadow(0, 0, undefined);
    previewSubtitle.setStroke("#424242", 14);
    this.previewContainer.add(previewSubtitle);
    (this as any)._previewSubtitle = previewSubtitle;

    const genderHintContainer = this.scene.add.container(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SUBTITLE_Y + 22);
    const genderKeyIcon = new Phaser.GameObjects.Sprite(this.scene, 0, 0, "keyboard", "G.png");
    genderKeyIcon.setScale(0.675);
    genderKeyIcon.setOrigin(0.5, 0.5);
    genderHintContainer.add(genderKeyIcon);
    const genderHintLabel = addTextObject(this.scene, 0, 0, i18next.t("championSelect:switchChampion", { defaultValue: "Other Half" }), TextStyle.WINDOW, { fontSize: "30px" });
    genderHintLabel.setOrigin(0, 0.5);
    genderHintContainer.add(genderHintLabel);
    const genderHintGap = 1;
    const genderHintIconW = genderKeyIcon.displayWidth;
    const genderHintTextW = genderHintLabel.displayWidth;
    const genderHintStartX = -((genderHintIconW + genderHintGap + genderHintTextW) / 2);
    genderKeyIcon.setPosition(genderHintStartX + genderHintIconW / 2, 0);
    genderHintLabel.setPosition(genderHintStartX + genderHintIconW + genderHintGap, 0);
    genderHintContainer.setVisible(false);
    this.previewContainer.add(genderHintContainer);
    (this as any)._genderHintContainer = genderHintContainer;
    this.gridContainer = this.scene.add.container(Math.floor(this.getWidth() / 2), this.getHeight() + ChampionSelectUiHandler.UI_CONSTANTS.GRID.Y_OFFSET);
    this.rootContainer.add(this.gridContainer);
    this.gridContainer.setDepth(1);
    const skillsX = Math.floor(this.getWidth() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.X;
    const skillsY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.Y;
    this.skillsContainer = this.scene.add.container(skillsX, skillsY);
    this.skillsBg = this.scene.add.graphics();
    this.skillsBg.fillStyle(0x000000, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.BG_ALPHA);
    const bgX = -ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.WIDTH / 2;
    const bgY = -ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.HEIGHT / 2;
    this.skillsBg.fillRoundedRect(bgX, bgY, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.HEIGHT, 8);
    this.skillsBg.lineStyle(ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.BORDER_THICKNESS, 0xffffff, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.BORDER_ALPHA);
    this.skillsBg.strokeRoundedRect(bgX, bgY, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.HEIGHT, 8);
    this.skillsContainer.add(this.skillsBg);
    this.rootContainer.add(this.skillsContainer);
    const listPanelX = Math.floor(this.getWidth() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.X;
    const listPanelY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.Y;
    this.skillListPanelContainer = this.scene.add.container(listPanelX, listPanelY);
    this.skillListPanelBg = this.scene.add.graphics();
    this.skillListPanelBg.fillStyle(0x000000, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BG_ALPHA);
    this.skillListPanelBg.lineStyle(
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BORDER_THICKNESS,
      0xffffff,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BORDER_ALPHA
    );
    this.skillListPanelContainer.add(this.skillListPanelBg);
    this.skillsHeaderText = addTextObject(
      this.scene,
      0,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.HEADER_Y,
      i18next.t("championSelect:skillsHeader", { defaultValue: "SKILLS" }),
      TextStyle.WINDOW,
      { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.HEADER_FONT_SIZE, align: "center" }
    );
    this.skillsHeaderText.setOrigin(0.5, 1);
    this.skillListPanelContainer.add(this.skillsHeaderText);

    this.skillsSubheaderText = addTextObject(
      this.scene,
      0,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SUBHEADER_Y,
      i18next.t("championSelect:skillsSubheader", { defaultValue: "Unlocked skills will randomly appear in Skill Tree." }),
      TextStyle.WINDOW,
      { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SUBHEADER_FONT_SIZE, align: "center", wordWrap: { width: (ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.WIDTH - 8) * 6 } }
    );
    this.skillsSubheaderText.setOrigin(0.5, 0);
    this.skillsSubheaderText.setAlpha(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SUBHEADER_ALPHA);

    let currentFontSize = parseInt(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SUBHEADER_FONT_SIZE);
    const minFontSize = 28;
    const wrapWidth = (ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.WIDTH - 8) * 6;

    while (currentFontSize >= minFontSize) {
      const wrappedText = this.skillsSubheaderText.runWordWrap(this.skillsSubheaderText.text);
      const lineCount = wrappedText.split('\n').length;
      if (lineCount <= 2) break;
      currentFontSize -= 2;
      this.skillsSubheaderText.setStyle({
        ...this.skillsSubheaderText.style,
        fontSize: `${currentFontSize}px`,
        wordWrap: { width: wrapWidth }
      });
    }

    this.skillListPanelContainer.add(this.skillsSubheaderText);
    this.skillListContainer = this.scene.add.container(0, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LIST_Y);
    this.skillListPanelContainer.add(this.skillListContainer);
    this.skillArrowUp = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ARROW_UP_Y, 'cursor_reverse');
    this.skillArrowUp.setScale(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ARROW_SCALE);
    this.skillArrowUp.setAngle(-90);
    this.skillArrowUp.setVisible(false);
    if ((this.skillArrowUp as any)?.anims?.exists && (this.skillArrowUp as any).anims.exists('cursor_reverse')) {
      (this.skillArrowUp as any).play('cursor_reverse');
    }
    this.skillListPanelContainer.add(this.skillArrowUp);

    this.skillArrowDown = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ARROW_DOWN_Y, 'cursor');
    this.skillArrowDown.setScale(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ARROW_SCALE);
    this.skillArrowDown.setAngle(90);
    this.skillArrowDown.setVisible(false);
    if ((this.skillArrowDown as any)?.anims?.exists && (this.skillArrowDown as any).anims.exists('cursor')) {
      (this.skillArrowDown as any).play('cursor');
    }
    this.skillListPanelContainer.add(this.skillArrowDown);
    this.skillTooltipContainer = this.scene.add.container(0, 0);
    this.skillTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 167, 12, 12, 12, 12);
    this.skillTooltipBg.setOrigin(0, 0);
    this.skillTooltipTitleBarBg = this.scene.add.graphics();
    this.skillTooltipRarityBarBg = this.scene.add.graphics();
    this.skillTooltipTitle = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_FONT_SIZE });
    this.skillTooltipTitle.setOrigin(0.5, 0.5);
    this.skillTooltipRarity = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "30px" });
    this.skillTooltipRarity.setOrigin(0.5, 0.5);
    this.skillTooltipDesc = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_DESC_FONT_SIZE });
    this.skillTooltipDesc.setOrigin(0, 0);
    this.skillTooltipCost = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_COST_FONT_SIZE });
    this.skillTooltipCost.setOrigin(0, 0);
    this.skillTooltipPrereq = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_PREREQ_FONT_SIZE });
    this.skillTooltipPrereq.setOrigin(0, 0);
    this.skillTooltipPrereq.setColor("#ffdd44");
    this.skillTooltipContainer.add(this.skillTooltipBg);
    this.skillTooltipContainer.add(this.skillTooltipTitleBarBg);
    this.skillTooltipContainer.add(this.skillTooltipRarityBarBg);
    this.skillTooltipContainer.add(this.skillTooltipTitle);
    this.skillTooltipContainer.add(this.skillTooltipRarity);
    this.skillTooltipContainer.add(this.skillTooltipDesc);
    this.skillTooltipContainer.add(this.skillTooltipCost);
    this.skillTooltipCostContainer = this.scene.add.container(0, 0);
    this.skillTooltipCostContainer.setVisible(false);
    this.skillTooltipContainer.add(this.skillTooltipCostContainer);
    this.skillTooltipContainer.add(this.skillTooltipPrereq);
    const sectionHeaderStyle = {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_SECTION_HEADER_FONT_SIZE,
      fontStyle: "normal" as const,
      fontFamily: "pkmnems",
      letterSpacing: 2,
    };
    const sectionHeaderColor = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_SECTION_HEADER_COLOR;
    const sectionHeaderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_SECTION_HEADER_ALPHA;

    this.skillTooltipSectionHeader = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, sectionHeaderStyle);
    this.skillTooltipSectionHeader.setOrigin(0, 0.5);
    this.skillTooltipSectionHeader.setColor(sectionHeaderColor);
    this.skillTooltipSectionHeader.setShadow(0, 0, undefined);
    this.skillTooltipSectionHeader.setAlpha(sectionHeaderAlpha);
    this.skillTooltipSectionHeader.setVisible(false);
    this.skillTooltipSectionLine = this.scene.add.graphics();
    this.skillTooltipSectionLine.setVisible(false);
    this.skillTooltipContainer.add(this.skillTooltipSectionHeader);
    this.skillTooltipContainer.add(this.skillTooltipSectionLine);
    this.skillTooltipDescHeader = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, sectionHeaderStyle);
    this.skillTooltipDescHeader.setOrigin(0, 0.5);
    this.skillTooltipDescHeader.setColor(sectionHeaderColor);
    this.skillTooltipDescHeader.setShadow(0, 0, undefined);
    this.skillTooltipDescHeader.setAlpha(sectionHeaderAlpha);
    this.skillTooltipDescHeader.setVisible(false);
    this.skillTooltipDescLine = this.scene.add.graphics();
    this.skillTooltipDescLine.setVisible(false);
    this.skillTooltipContainer.add(this.skillTooltipDescHeader);
    this.skillTooltipContainer.add(this.skillTooltipDescLine);
    this.skillTooltipDetailHeader = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, sectionHeaderStyle);
    this.skillTooltipDetailHeader.setOrigin(0, 0.5);
    this.skillTooltipDetailHeader.setColor(sectionHeaderColor);
    this.skillTooltipDetailHeader.setShadow(0, 0, undefined);
    this.skillTooltipDetailHeader.setAlpha(sectionHeaderAlpha);
    this.skillTooltipDetailHeader.setVisible(false);
    this.skillTooltipDetailLine = this.scene.add.graphics();
    this.skillTooltipDetailLine.setVisible(false);
    this.skillTooltipDetailName = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "41px" });
    this.skillTooltipDetailName.setOrigin(0, 0);
    this.skillTooltipDetailName.setVisible(false);
    this.skillTooltipDetail = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_DESC_FONT_SIZE });
    this.skillTooltipDetail.setOrigin(0, 0);
    this.skillTooltipDetail.setVisible(false);
    this.skillTooltipContainer.add(this.skillTooltipDetailHeader);
    this.skillTooltipContainer.add(this.skillTooltipDetailLine);
    this.skillTooltipContainer.add(this.skillTooltipDetailName);
    this.skillTooltipContainer.add(this.skillTooltipDetail);
    this.skillTooltipLoreBarBg = this.scene.add.graphics();
    this.skillTooltipContainer.add(this.skillTooltipLoreBarBg);
    this.skillTooltipLore = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
    this.skillTooltipLore.setOrigin(0.5, 0);
    this.skillTooltipLore.setVisible(false);
    this.skillTooltipContainer.add(this.skillTooltipLore);
    this.skillTooltipContainer.setVisible(false);
    this.skillTooltipContainer.setDepth(100);
    this.rootContainer.add(this.skillTooltipContainer);

    const tooltipW = 120;
    this._unlockBtnTooltipContainer = this.scene.add.container(0, 0);
    this._unlockBtnTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipW, 80, 12, 12, 12, 12);
    this._unlockBtnTooltipBg.setOrigin(0, 0);
    this._unlockBtnTooltipRarityBarBg = this.scene.add.graphics();
    this._unlockBtnTooltipTitle = addTextObject(this.scene, tooltipW / 2, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_TEXT_Y + 2, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_FONT_SIZE });
    this._unlockBtnTooltipTitle.setOrigin(0.5, 0.5);
    this._unlockBtnTooltipRarity = addTextObject(this.scene, tooltipW / 2, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RARITY_TEXT_Y, "", TextStyle.WINDOW, { fontSize: "30px" });
    this._unlockBtnTooltipRarity.setOrigin(0.5, 0.5);
    this._unlockBtnTooltipDesc = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_DESC_FONT_SIZE });
    this._unlockBtnTooltipDesc.setOrigin(0, 0);
    this._unlockBtnTooltipSectionHeader = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, sectionHeaderStyle);
    this._unlockBtnTooltipSectionHeader.setOrigin(0, 0.5);
    this._unlockBtnTooltipSectionHeader.setColor(sectionHeaderColor);
    this._unlockBtnTooltipSectionHeader.setShadow(0, 0, undefined);
    this._unlockBtnTooltipSectionHeader.setAlpha(sectionHeaderAlpha);
    this._unlockBtnTooltipSectionLine = this.scene.add.graphics();
    this._unlockBtnTooltipCostContainer = this.scene.add.container(0, 0);
    this._unlockBtnTooltipLoreBarBg = this.scene.add.graphics();
    this._unlockBtnTooltipLore = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
    this._unlockBtnTooltipLore.setOrigin(0.5, 0);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipBg);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipRarityBarBg);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipTitle);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipRarity);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipDesc);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipSectionHeader);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipSectionLine);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipCostContainer);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipLoreBarBg);
    this._unlockBtnTooltipContainer.add(this._unlockBtnTooltipLore);
    this._unlockBtnTooltipContainer.setVisible(false);
    this._unlockBtnTooltipContainer.setDepth(100);
    this.rootContainer.add(this._unlockBtnTooltipContainer);

    this.rootContainer.add(this.skillListPanelContainer);
    this.levelText = addTextObject(this.scene, -6, 29, "Lv1", TextStyle.PARTY, {
      fontSize: "26px",
      align: "center",
      color: "#ffd700"
    });
    this.levelText.setOrigin(0, 0);
    this.levelText.setShadow(0, 0, undefined);
    this.levelText.setStroke("#424242", 14);
    this.levelText.setDepth(2);
    this.previewContainer.add(this.levelText);
    this.essenceInstructionText = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.Y, "", TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.FONT_SIZE,
      align: "center"
    });
    this.essenceInstructionText.setOrigin(0.5, 0);
    this.essenceInstructionText.setAlpha(ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.ALPHA);
    this.skillsContainer.add(this.essenceInstructionText);
    const xpBarCenterX = Math.floor(this.getWidth() / 2);
    const xpBarAbsY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.Y + ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.CONTAINER_Y;
    this.xpBarContainer = this.scene.add.container(xpBarCenterX, xpBarAbsY);
    this.rootContainer.add(this.xpBarContainer);

    const essBarW = this.getWidth();
    const essBarH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_HEIGHT;
    this.xpBarContainer.setSize(essBarW, essBarH);

    const xpBgW = this.getWidth();
    const xpBgH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_HEIGHT;
    const xpBgX = -xpBgW / 2;
    const xpBgY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_Y;

    try {
      (this as any)._xpBarFillImage = this.scene.add.image(
        xpBgX + 2, xpBgY + 2,
        "newchampion_progress_fill"
      );
      (this as any)._xpBarFillImage.setOrigin(0, 0);
      (this as any)._xpBarFillImage.setDisplaySize(0, xpBgH - 4);
      this.xpBarContainer.add((this as any)._xpBarFillImage);
    } catch {}

    if (!(this as any)._xpBarFillImage) {
      this.xpBarFill = this.scene.add.graphics();
      this.xpBarContainer.add(this.xpBarFill);
    }
    const btnCenterX = Math.floor(this.getWidth() / 2) - 110;
    const btnBottomY = this.getHeight() - 46 - 5;
    this.useEssenceButtonContainer = this.scene.add.container(btnCenterX, btnBottomY);

    const btnImg = this.scene.add.image(0, 6, "newchampion_unlock_button");
    btnImg.setOrigin(0.5, 0.5);
    btnImg.setDisplaySize(62, 55);
    this.useEssenceButtonContainer.add(btnImg);
    btnImg.setInteractive({ useHandCursor: true });
    btnImg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
      if (pointer.button !== 0) return;
      this.processInput(Button.STATS);
    });
    (this as any)._useEssenceBtnImg = btnImg;

    this.useEssenceButtonText = addTextObject(this.scene, -3, 2, i18next.t("championSelect:button.levelUp", { defaultValue: "Level Up" }), TextStyle.PARTY, {
      fontSize: "27px",
      align: "center",
      color: "#E8E8E8"
    });
    this.useEssenceButtonText.setOrigin(0.5, 0.5);
    this.useEssenceButtonText.setStroke("#424242", 13);
    this.useEssenceButtonText.setShadow(0, 0, undefined);
    this.useEssenceButtonContainer.add(this.useEssenceButtonText);

    this.useEssenceButtonIcon = this.scene.add.sprite(-19.5, 1.5, "keyboard");
    this.useEssenceButtonIcon.setFrame("C.png");
    this.useEssenceButtonIcon.setScale(0.417, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BUTTON_SCALE);
    this.useEssenceButtonIcon.setOrigin(0.5, 0.5);
    this.useEssenceButtonContainer.add(this.useEssenceButtonIcon);

    this._notEnoughEssenceIcon = this.scene.add.sprite(0, 1, "smitems", "modSoulCollected");
    this._notEnoughEssenceIcon.setScale(this._notEnoughIconScale);
    this._notEnoughEssenceIcon.setOrigin(0.5, 0.5);
    this._notEnoughEssenceIcon.setVisible(false);
    this._notEnoughEssenceIcon.setAlpha(1.0);
    this.useEssenceButtonContainer.add(this._notEnoughEssenceIcon);

    this._btnEssenceCostContainer = this.scene.add.container(0, 10);
    this._btnEssenceCostContainer.setVisible(false);
    this._btnEssenceCostBg = this.scene.add.graphics();
    this._btnEssenceCostContainer.add(this._btnEssenceCostBg);
    this.useEssenceButtonContainer.add(this._btnEssenceCostContainer);

    this._requirementBgContainer = this.scene.add.container(0, -22);
    this._requirementBgContainer.setScale(1.12);
    const reqBgImg = this.scene.add.image(0, 0, ChampionSelectUiHandler.STRIPE_BG_TEXTURE);
    reqBgImg.setOrigin(0.5, 0.5);
    reqBgImg.setDisplaySize(this._stripeBgWidth, this._stripeBgHeight);
    reqBgImg.setAlpha(this._stripeBgAlpha);
    reqBgImg.setScale(this._stripeBgScale);
    this._requirementBgImg = reqBgImg;
    this._requirementBgContainer.add(reqBgImg);
    this._requirementBgContainer.setVisible(false);
    this._requirementBgContainer.setSize(this._stripeBgWidth, this._stripeBgHeight);
    this.useEssenceButtonContainer.add(this._requirementBgContainer);

    this.rootContainer.add(this.useEssenceButtonContainer);
    this.useEssenceButtonContainer.setDepth(10);
    this.essenceListContainer = this.scene.add.container(
      ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.X,
      this.getHeight() + ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.Y
    );
    const essHeader = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("championSelect:essencesHeader", { defaultValue: "Essences:" }),
      TextStyle.WINDOW,
      { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.HEADER_FONT_SIZE, align: "left" }
    );
    essHeader.setOrigin(0, 0);
    this.essenceListContainer.add(essHeader);
    this.rootContainer.add(this.essenceListContainer);

    const iconBarX = Math.floor(this.getWidth() / 2);
    const iconBarY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.Y;
    this.skillIconBarContainer = this.scene.add.container(iconBarX, iconBarY);
    this.rootContainer.add(this.skillIconBarContainer);
    this.skillIconBarContainer.setDepth(4);

    const centerX = Math.floor(this.getWidth() / 2);
    const centerY = Math.floor(this.getHeight() / 2);

    this.nextSkillLabel = addTextObject(
      this.scene,
      centerX,
      centerY - 40,
      i18next.t("championSelect:skillBar.next", { defaultValue: "NEXT" }),
      TextStyle.WINDOW,
      { fontSize: "43px", align: "center" }
    );
    this.nextSkillLabel.setOrigin(0.5, 1);
    this.nextSkillLabel.setTint(0xE8E8E8);
    this.nextSkillLabel.setShadow(0, 0, "#FFFFFF", 8, true, true);
    this.nextSkillLabel.setDepth(11);
    this.rootContainer.add(this.nextSkillLabel);

    this._nextSkillCostContainer = this.scene.add.container(0, 0);
    this._nextSkillCostContainer.setDepth(12);
    this._nextSkillCostContainer.setVisible(false);
    this.rootContainer.add(this._nextSkillCostContainer);

    this._nextSkillCostBg = this.scene.add.graphics();
    this._nextSkillCostContainer.add(this._nextSkillCostBg);

    (this as any)._essenceCountersRow = this.scene.add.container(13, 12);
    (this as any)._essenceCountersRow.setScale(1.0);
    this.useEssenceButtonContainer.add((this as any)._essenceCountersRow);

    const essStack1 = this.scene.add.container(-6.5, 0);
    (this as any)._essenceCounter1Soul = this.scene.add.sprite(0, -4, "smitems", "modSoulCollected");
    (this as any)._essenceCounter1Soul.setScale(0.18);
    (this as any)._essenceCounter1Soul.setOrigin(0.5, 0.5);
    essStack1.add((this as any)._essenceCounter1Soul);
    (this as any)._essenceCounter1Type = this.scene.add.sprite(0, 0, Utils.getLocalizedSpriteKey("types"), "fire");
    (this as any)._essenceCounter1Type.setScale(0.35);
    (this as any)._essenceCounter1Type.setOrigin(0.5, 0.5);
    essStack1.add((this as any)._essenceCounter1Type);
    (this as any)._essenceCounter1Icon = essStack1;
    (this as any)._essenceCountersRow.add(essStack1);

    (this as any)._essenceCounter1Text = addBBCodeTextObject(this.scene, -6.5, 9, "0/0", TextStyle.WINDOW, { fontSize: "34px", color: "#E8E8E8" });
    (this as any)._essenceCounter1Text.setOrigin(0.5, 0.5);
    (this as any)._essenceCounter1Text.setShadow(0, 0, "#E8D4F5", 8, true, true);
    (this as any)._essenceCountersRow.add((this as any)._essenceCounter1Text);

    const essStack2 = this.scene.add.container(10.5, 0);
    (this as any)._essenceCounter2Soul = this.scene.add.sprite(0, -4, "smitems", "modSoulCollected");
    (this as any)._essenceCounter2Soul.setScale(0.18);
    (this as any)._essenceCounter2Soul.setOrigin(0.5, 0.5);
    essStack2.add((this as any)._essenceCounter2Soul);
    (this as any)._essenceCounter2Type = this.scene.add.sprite(0, 0, Utils.getLocalizedSpriteKey("types"), "ground");
    (this as any)._essenceCounter2Type.setScale(0.35);
    (this as any)._essenceCounter2Type.setOrigin(0.5, 0.5);
    essStack2.add((this as any)._essenceCounter2Type);
    (this as any)._essenceCounter2Icon = essStack2;
    (this as any)._essenceCountersRow.add(essStack2);

    (this as any)._essenceCounter2Text = addBBCodeTextObject(this.scene, 10.5, 9, "0/0", TextStyle.WINDOW, { fontSize: "34px", color: "#E8E8E8" });
    (this as any)._essenceCounter2Text.setOrigin(0.5, 0.5);
    (this as any)._essenceCounter2Text.setShadow(0, 0, "#E8D4F5", 8, true, true);
    (this as any)._essenceCountersRow.add((this as any)._essenceCounter2Text);

    this.mockupFooterText = addTextObject(
      this.scene,
      Math.floor(this.getWidth() / 2),
      this.getHeight() - 9 / 2,
      i18next.t("championSelect:skillsSubheader", { defaultValue: "Skills will randomly appear in Skill Tree." }),
      TextStyle.WINDOW,
      { fontSize: "32px", align: "center" }
    );
    this.mockupFooterText.setOrigin(0.5, 0.5);
    this.mockupFooterText.setAlpha(1.0);
    this.footerBand = this.scene.add.graphics();
    this.footerBand.fillStyle(0x000000, 0.6);
    this.footerBand.fillRect(0, this.getHeight() - 9, this.getWidth(), 9);
    this.rootContainer.add(this.footerBand);
    this.rootContainer.add(this.mockupFooterText);

    this.modalMessage = new ModalMessageUiHandler(this.scene, this.modalContainer, this.getWidth(), this.getHeight());
    this.modalMessage.setup();

    this._tweakHudText = addTextObject(this.scene, Math.floor(this.getWidth() / 2), 2, "", TextStyle.WINDOW, {
      fontSize: "28px",
      color: "#00FF00",
      align: "center"
    });
    this._tweakHudText.setOrigin(0.5, 0);
    this._tweakHudText.setDepth(2000);
    this._tweakHudText.setVisible(false);
    this.rootContainer.add(this._tweakHudText);

    this.rootContainer.sort("depth");
  }

  private updateEssenceButtonIcon(): void {
    if (!this.useEssenceButtonIcon) return;

    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad" && this.scene.inputController) {
      gamepadType = this.scene.inputController.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if (this.scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = this.scene.inputMethod || "keyboard";
    }

    let iconPath: string;
    const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
    if (!isGamepad) {
      iconPath = "C.png";
    } else {
      iconPath = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png";
    }

    this.useEssenceButtonIcon.setTexture(gamepadType, iconPath);
    const baseScale = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BUTTON_SCALE;
    this.useEssenceButtonIcon.setScale(isGamepad ? baseScale + 0.15 : baseScale);
  }

  show(args: any[]): boolean {
    const config: ChampionSelectConfig | undefined = args?.[0];
    const modalConfig: ModalConfig = { buttonActions: [] };
    if (!super.show([modalConfig])) {
      return false;
    }

    this.getUi().hideMessageChrome();

    if (this.modalBg) this.modalBg.setVisible(false);
    if (this.footerBand) this.footerBand.setVisible(true);

    this.config = config || null;
    this.availableChampions = [];
    this.selectedChampionIndex = 0;
    this.skillTooltipActive = false;

    this.loadChampionData();
    if (this.availableChampions.length === 0) {
      console.error("ChampionSelect: no champions available");
      return true;
    }

    if (this.gridContainer) { this.gridContainer.setVisible(false); }
    if (this.essenceListContainer) { this.essenceListContainer.setVisible(false); }
    if (this.skillsBg) { this.skillsBg.setVisible(false); }
    if (this.essenceInstructionText) { this.essenceInstructionText.setVisible(false); }
    this.updateChampionInfo();
    if (this.skillsHeaderText) {
      this.skillsHeaderText.setText(i18next.t("championSelect:skillsHeader", { defaultValue: "SKILLS" }));
    }
    if (this.skillsSubheaderText) {
      this.skillsSubheaderText.setText(
        i18next.t("championSelect:skillsSubheader", { defaultValue: "Unlocked skills will randomly appear in Skill Tree." })
      );
    }

    if (this.skillListPanelContainer) { this.skillListPanelContainer.setVisible(false); }
    this.layoutSkillListPanel();
    this.updateEssenceButtonIcon();
    this.fixTitlePositioning();

    if (this.rootContainer) {
      this.rootContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.rootContainer,
        alpha: 1,
        duration: 300,
        ease: "Power2",
        onComplete: () => {
          this.triggerSmitomChampionSkillsTipIfNeeded();
        }
      });
    }

    return true;
  }
  private initModalBackground(): void {
    if (this.modalBgGraphics) {
      this.modalBgGraphics.destroy();
    }
    this.modalBgGraphics = this.scene.add.graphics();
  }
  private cleanupChampionUnlockHoldToSkip(): void {
    if (this.championUnlockHoldTimer) {
      this.championUnlockHoldTimer.remove();
      this.championUnlockHoldTimer = null;
    }
    if (this.championUnlockHoldGaugeTween) {
      this.championUnlockHoldGaugeTween.stop();
      this.championUnlockHoldGaugeTween = null;
    }
    this.championUnlockHoldingButton = null;
    this.championUnlockHoldingPointer = false;
    if (this.championUnlockInputDownHandler) {
      this.scene.inputController.events.off("input_down", this.championUnlockInputDownHandler);
      this.championUnlockInputDownHandler = null;
    }
    if (this.championUnlockInputUpHandler) {
      this.scene.inputController.events.off("input_up", this.championUnlockInputUpHandler);
      this.championUnlockInputUpHandler = null;
    }
    if (this.championUnlockPointerDownHandler) {
      this.scene.input.off("pointerdown", this.championUnlockPointerDownHandler);
      this.championUnlockPointerDownHandler = null;
    }
    if (this.championUnlockPointerUpHandler) {
      this.scene.input.off("pointerup", this.championUnlockPointerUpHandler);
      this.championUnlockPointerUpHandler = null;
    }
    if (this.championUnlockHoldGaugeBg) {
      this.championUnlockHoldGaugeBg.destroy();
      this.championUnlockHoldGaugeBg = null;
    }
    if (this.championUnlockHoldGaugeFill) {
      this.championUnlockHoldGaugeFill.destroy();
      this.championUnlockHoldGaugeFill = null;
    }
    if (this.championUnlockHoldText) {
      this.championUnlockHoldText.destroy();
      this.championUnlockHoldText = null;
    }
  }

  private showUnlockAnimation(championId: string): void {
    const scene = this.scene as BattleScene;
    let effectiveId = championId;
    if (championId === "apollo_diana") {
      effectiveId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
    }

    const gd = scene.gameData;

    this.cleanupChampionUnlockHoldToSkip();

    if (scene.disableCutscenes) {
      if (!gd.gameStats.cutsceneChampionUnlockShown) gd.gameStats.cutsceneChampionUnlockShown = {};
      gd.gameStats.cutsceneChampionUnlockShown[effectiveId] = true;
      this.playUnlockAnimationAfterCutscene(effectiveId);
      return;
    }

    this.isChampionUnlockCutsceneActive = true;
    const uiAny = scene.ui as any;
    const fieldUi: any = (scene as any).fieldUI;
    const prevFieldUiVisible = typeof fieldUi?.visible === "boolean" ? fieldUi.visible : null;
    const permaMoney = uiAny?.getPermaMoneyContainer?.();
    const prevPermaMoneyVisible = typeof permaMoney?.visible === "boolean" ? permaMoney.visible : null;
    const permaBar = uiAny?.permaModifierBar;
    const prevPermaBarVisible = typeof permaBar?.visible === "boolean" ? permaBar.visible : null;
    const playerBar: any = (scene as any).modifierBar;
    const prevPlayerBarVisible = typeof playerBar?.visible === "boolean" ? playerBar.visible : null;
    const enemyBar: any = (scene as any).enemyModifierBar;
    const prevEnemyBarVisible = typeof enemyBar?.visible === "boolean" ? enemyBar.visible : null;
    const messageHandler = scene.ui.getMessageHandler();
    const prevMsgBgVisible = typeof messageHandler?.bg?.visible === "boolean" ? messageHandler.bg.visible : null;
    const prevNameBoxVisible = typeof messageHandler?.nameBoxContainer?.visible === "boolean" ? messageHandler.nameBoxContainer.visible : null;
    const prevModalVisible = this.modalContainer?.visible;
    this.rootContainer?.setVisible(false);
    try { this.modalContainer?.setVisible(false); } catch {}
    try { fieldUi?.setVisible?.(false); } catch {}
    try { permaMoney?.setVisible?.(false); } catch {}
    try { permaBar?.setVisible?.(false); } catch {}
    try { playerBar?.setVisible?.(false); } catch {}
    try { enemyBar?.setVisible?.(false); } catch {}
    try { messageHandler?.bg?.setVisible?.(false); } catch {}
    try { messageHandler?.nameBoxContainer?.setVisible?.(false); } catch {}
    try { scene.ui.clearText(); } catch {}

    const def = STORY_CUTSCENES.champion_unlock;
    let currentSlideKey: string | null = null;
    let unlockedRewardScheduled: boolean = false;
    let unlockedRewardTimer: Phaser.Time.TimerEvent | null = null;

    ensureCutsceneImagesLoaded(scene, def.slides.map(s => s.imageKey)).then(() => {
      const sceneAdapter: SlideshowSceneAdapter = {
        add: this.scene.add,
        tweens: this.scene.tweens,
        time: this.scene.time,
        sound: this.scene.sound,
        game: this.scene.game,
        playSound: (key: string, config?: object) => scene.playSound(key, config),
      };

      const preCutsceneBgmKey = (scene as any).bgm?.key || "laboratory";
      scene.playBgm(def.bgmKey, true);

      const slides = def.slides.map((s, i) => i === 0 ? { ...s, pauseAfterText: 9999999 } : s);

      const controller = new SlideshowController(sceneAdapter, {
        slides,
        canSkip: true,
        ignoreGameSpeed: true,
        pauseAfterText: 1000,
        onSlideChange: (index) => {
          currentSlideKey = slides[index]?.imageKey;
          if (currentSlideKey === "unlocked") {
            unlockedRewardScheduled = false;
            if (unlockedRewardTimer) {
              unlockedRewardTimer.remove();
              unlockedRewardTimer = null;
            }
            return;
          }
          if (unlockedRewardTimer) {
            unlockedRewardTimer.remove();
            unlockedRewardTimer = null;
          }
        },
        onTextComplete: () => {
          if (currentSlideKey !== "unlocked" || unlockedRewardScheduled) {
            return;
          }
          unlockedRewardScheduled = true;
          const container = controller.getContainer();
          const prevDepth = container?.depth ?? 0;
          if (container) {
            container.setDepth(1.5);
          }
          const name = ChampionUtils.getChampionDisplayName(effectiveId);
          const rewardText = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
          const trainerKey = this.getChampionTrainerSpriteKey(effectiveId);
          const reward: RewardConfig = {
            type: RewardObtainedType.UNLOCK,
            name: rewardText,
            customAtlas: trainerKey,
            cutsceneStyle: true,
          };
          unlockedRewardTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
            if (!this.isChampionUnlockCutsceneActive || currentSlideKey !== "unlocked") {
              return;
            }
            scene.ui.setOverlayModeForceTransition(
              Mode.REWARD_OBTAINED,
              {
                buttonActions: [
                  () => {
                    scene.ui.revertMode().then(() => {
                      if (container) {
                        container.setDepth(prevDepth);
                      }
                      if (this.isChampionUnlockCutsceneActive) {
                        controller.next();
                      }
                    });
                  },
                ],
              },
              reward
            );
          });
        },
        onBeforeFade: () => {
          this.playUnlockAnimationAfterCutscene(effectiveId, preCutsceneBgmKey);
        },
        onComplete: () => {
          this.cleanupChampionUnlockHoldToSkip();
          if (!gd.gameStats.cutsceneChampionUnlockShown) gd.gameStats.cutsceneChampionUnlockShown = {};
          gd.gameStats.cutsceneChampionUnlockShown[effectiveId] = true;

          if (unlockedRewardTimer) {
            unlockedRewardTimer.remove();
            unlockedRewardTimer = null;
          }

          controller.destroy();
          unloadCutsceneImages(scene, def.slides.map(s => s.imageKey));

          try { if (prevFieldUiVisible !== null) fieldUi?.setVisible?.(prevFieldUiVisible); } catch {}
          try { if (prevPermaMoneyVisible !== null) permaMoney?.setVisible?.(prevPermaMoneyVisible); } catch {}
          try { if (prevPermaBarVisible !== null) permaBar?.setVisible?.(prevPermaBarVisible); } catch {}
          try { if (prevPlayerBarVisible !== null) playerBar?.setVisible?.(prevPlayerBarVisible); } catch {}
          try { if (prevEnemyBarVisible !== null) enemyBar?.setVisible?.(prevEnemyBarVisible); } catch {}
          try { if (prevMsgBgVisible !== null) messageHandler?.bg?.setVisible?.(prevMsgBgVisible); } catch {}
          try { if (prevNameBoxVisible !== null) messageHandler?.nameBoxContainer?.setVisible?.(prevNameBoxVisible); } catch {}
          try { if (typeof prevModalVisible === "boolean") this.modalContainer?.setVisible(prevModalVisible); } catch {}
          this.rootContainer?.setVisible(true);
          this.isChampionUnlockCutsceneActive = false;
        }
      });

      const w = this.scene.game.canvas.width;
      const h = this.scene.game.canvas.height;
      const holdTextValue = i18next.t("cutscene:holdToSkip", { defaultValue: "Press Any to Skip" });
      this.championUnlockHoldText = this.scene.add.text(w - 20, h - 20, holdTextValue, { fontFamily: "emerald", fontSize: "22px", color: "#ffffff" });
      this.championUnlockHoldText.setOrigin(1, 1);
      this.championUnlockHoldText.setAlpha(0.85);
      this.championUnlockHoldText.setDepth(11);

      const barW = 120;
      const barH = 8;
      const barRightX = w - 20;
      const barBottomY = (h - 20) + barH + 6;
      const barLeftX = barRightX - barW;
      this.championUnlockHoldGaugeBg = this.scene.add.rectangle(barLeftX, barBottomY, barW, barH, 0x000000, 0.55);
      this.championUnlockHoldGaugeBg.setOrigin(0, 1);
      this.championUnlockHoldGaugeBg.setDepth(11);
      this.championUnlockHoldGaugeFill = this.scene.add.rectangle(barLeftX, barBottomY, 0, barH, 0xffffff, 0.85);
      this.championUnlockHoldGaugeFill.setOrigin(0, 1);
      this.championUnlockHoldGaugeFill.setDepth(11);

      this.championUnlockInputDownHandler = (evt: any) => {
        if (!this.isChampionUnlockCutsceneActive) {
          return;
        }
        const button = evt?.button as Button;
        if (button === undefined) {
          return;
        }
        if (this.championUnlockHoldTimer) {
          return;
        }
        this.championUnlockHoldingButton = button;
        this.championUnlockHoldingPointer = false;
        if (this.championUnlockHoldGaugeTween) {
          this.championUnlockHoldGaugeTween.stop();
          this.championUnlockHoldGaugeTween = null;
        }
        if (this.championUnlockHoldGaugeFill && this.championUnlockHoldGaugeBg) {
          this.championUnlockHoldGaugeFill.width = 0;
          this.championUnlockHoldGaugeTween = this.scene.tweens.add({
            targets: this.championUnlockHoldGaugeFill,
            width: this.championUnlockHoldGaugeBg.width,
            duration: Utils.fixedInt(1000) as any,
            ease: "Linear",
          });
        }
        this.championUnlockHoldTimer = this.scene.time.delayedCall(Utils.fixedInt(1000), () => {
          this.championUnlockHoldTimer = null;
          this.championUnlockHoldingButton = null;
          this.championUnlockHoldingPointer = false;
          controller.skip();
        });
      };

      this.championUnlockInputUpHandler = (evt: any) => {
        const button = evt?.button as Button;
        if (this.championUnlockHoldingButton === null || button !== this.championUnlockHoldingButton) {
          return;
        }
        this.championUnlockHoldingButton = null;
        if (this.championUnlockHoldTimer) {
          this.championUnlockHoldTimer.remove();
          this.championUnlockHoldTimer = null;
        }
        if (this.championUnlockHoldGaugeTween) {
          this.championUnlockHoldGaugeTween.stop();
          this.championUnlockHoldGaugeTween = null;
        }
        if (this.championUnlockHoldGaugeFill) {
          this.championUnlockHoldGaugeFill.width = 0;
        }
        if (this.isChampionUnlockCutsceneActive) {
          if (!controller.isTextReadyForAdvance(250)) {
            controller.completeText();
            return;
          }
          controller.next();
        }
      };

      this.scene.inputController.events.on("input_down", this.championUnlockInputDownHandler);
      this.scene.inputController.events.on("input_up", this.championUnlockInputUpHandler);

      this.championUnlockPointerDownHandler = (_pointer: Phaser.Input.Pointer) => {
        if (!this.isChampionUnlockCutsceneActive) {
          return;
        }
        if (this.championUnlockHoldTimer) {
          return;
        }
        this.championUnlockHoldingPointer = true;
        this.championUnlockHoldingButton = null;
        if (this.championUnlockHoldGaugeTween) {
          this.championUnlockHoldGaugeTween.stop();
          this.championUnlockHoldGaugeTween = null;
        }
        if (this.championUnlockHoldGaugeFill && this.championUnlockHoldGaugeBg) {
          this.championUnlockHoldGaugeFill.width = 0;
          this.championUnlockHoldGaugeTween = this.scene.tweens.add({
            targets: this.championUnlockHoldGaugeFill,
            width: this.championUnlockHoldGaugeBg.width,
            duration: Utils.fixedInt(1000) as any,
            ease: "Linear",
          });
        }
        this.championUnlockHoldTimer = this.scene.time.delayedCall(Utils.fixedInt(1000), () => {
          this.championUnlockHoldTimer = null;
          this.championUnlockHoldingButton = null;
          this.championUnlockHoldingPointer = false;
          controller.skip();
        });
      };

      this.championUnlockPointerUpHandler = (_pointer: Phaser.Input.Pointer) => {
        if (!this.championUnlockHoldingPointer) {
          return;
        }
        this.championUnlockHoldingPointer = false;
        if (this.championUnlockHoldTimer) {
          this.championUnlockHoldTimer.remove();
          this.championUnlockHoldTimer = null;
        }
        if (this.championUnlockHoldGaugeTween) {
          this.championUnlockHoldGaugeTween.stop();
          this.championUnlockHoldGaugeTween = null;
        }
        if (this.championUnlockHoldGaugeFill) {
          this.championUnlockHoldGaugeFill.width = 0;
        }
        if (this.isChampionUnlockCutsceneActive) {
          if (!controller.isTextReadyForAdvance(250)) {
            controller.completeText();
            return;
          }
          controller.next();
        }
      };

      this.scene.input.on("pointerdown", this.championUnlockPointerDownHandler);
      this.scene.input.on("pointerup", this.championUnlockPointerUpHandler);

      controller.start();
    }).catch(() => {
      try { if (prevFieldUiVisible !== null) fieldUi?.setVisible?.(prevFieldUiVisible); } catch {}
      try { if (prevPermaMoneyVisible !== null) permaMoney?.setVisible?.(prevPermaMoneyVisible); } catch {}
      try { if (prevPermaBarVisible !== null) permaBar?.setVisible?.(prevPermaBarVisible); } catch {}
      try { if (prevPlayerBarVisible !== null) playerBar?.setVisible?.(prevPlayerBarVisible); } catch {}
      try { if (prevEnemyBarVisible !== null) enemyBar?.setVisible?.(prevEnemyBarVisible); } catch {}
      try { if (prevMsgBgVisible !== null) messageHandler?.bg?.setVisible?.(prevMsgBgVisible); } catch {}
      try { if (prevNameBoxVisible !== null) messageHandler?.nameBoxContainer?.setVisible?.(prevNameBoxVisible); } catch {}
      try { if (typeof prevModalVisible === "boolean") this.modalContainer?.setVisible(prevModalVisible); } catch {}
      try { this.rootContainer?.setVisible(true); } catch {}
      try { scene.playBgm(preCutsceneBgmKey || undefined); } catch {}
      try { this.cleanupChampionUnlockHoldToSkip(); } catch {}
      try {
        if (!gd.gameStats.cutsceneChampionUnlockShown) gd.gameStats.cutsceneChampionUnlockShown = {};
        gd.gameStats.cutsceneChampionUnlockShown[effectiveId] = true;
      } catch {}
      this.isChampionUnlockCutsceneActive = false;
      try { this.playUnlockAnimationAfterCutscene(effectiveId, preCutsceneBgmKey); } catch {}
    });
  }

  private playUnlockAnimationAfterCutscene(effectiveId: string, restoreBgmKey?: string | null): void {
    const name = ChampionUtils.getChampionDisplayName(effectiveId);
    const msg = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
    const revealConfig = buildChampionSpriteRevealConfig(this.scene as BattleScene, effectiveId, name);
    this.isLevelUpAnimationActive = true;
    playGenericLevelUpAnimation(this.scene as BattleScene, msg, undefined, revealConfig, true, restoreBgmKey).then(() => {
      this.isLevelUpAnimationActive = false;
      this.lockInput(500);
    });
  }
  private logTweakState(assetName: string, target: any, action: string): void {
    const x = target.x ?? 0;
    const y = target.y ?? 0;
    const sx = target.scaleX ?? 1;
    const sy = target.scaleY ?? 1;
    const dw = target.displayWidth ?? 0;
    const dh = target.displayHeight ?? 0;
    const a = target.alpha ?? 1;
    const fs = parseInt(target.style?.fontSize || "0", 10);
    const baseline = this._tweakBaselines.get(assetName);
    if (baseline) {
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const da = a - baseline.alpha;
      const dfs = fs - (baseline as any).fontSize;
      const fsStr = fs > 0 ? ` fs=${fs}` : "";
      const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
      const _c = target.style?.color || "";
      const _s = target.style?.stroke || "";
      const _sw = target.style?.strokeThickness ?? 0;
      const _stStr = _c ? ` color=${_c} stroke=${_s} strokeW=${_sw}` : "";
      console.log(`[CS-TWEAK] ${action} | asset=${assetName}\n  current: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${_stStr}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}`);
    } else {
      const fsStr = fs > 0 ? ` fontSize=${fs}` : "";
      const _c = target.style?.color || "";
      const _s = target.style?.stroke || "";
      const _sw = target.style?.strokeThickness ?? 0;
      const _stStr = _c ? ` color=${_c} stroke=${_s} strokeW=${_sw}` : "";
      console.log(`[CS-TWEAK] ${action} | asset=${assetName} | x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} width=${dw.toFixed(1)} height=${dh.toFixed(1)} alpha=${a.toFixed(2)}${fsStr}${_stStr}`);
    }
  }

  private getStripeCurrentValues(index: number): number[] {
    switch (index) {
      case 24: return [this._stripeSpacing];
      case 25: return [this._stripeFontSize];
      case 26: return [this._stripeEssenceScale];
      case 27: return [this._stripeEssenceX, this._stripeEssenceY];
      case 28: return [this._stripeTypeScale];
      case 29: return [this._stripeTypeX, this._stripeTypeY];
      case 30: return [this._stripeBgWidth];
      case 31: return [this._stripeBgHeight];
      case 32: return [this._stripeBgAlpha];
      case 33: return [this._stripeBgScale];
      case 34: return [this._stripeDotFontSize];
      case 35: return [this._stripeDotX, this._stripeDotY];
      case 36: return [this._stripeSpecialLabelFontSize];
      case 37: return [this._stripeSpecialTypeScale];
      case 39: return [this._stripeSpecialX, this._stripeSpecialY];
      case 40: return [this._portraitMaskH];
      case 41: return [this._portraitMaskOffsetY];
      case 42: return [this._hintStripeFontSize];
      case 43: return [this._hintStripeBottomInset];
      case 44: return [this._hintStripeTextX, this._hintStripeTextY];
      case 45: return [this._stripeSpecialLabelX, this._stripeSpecialLabelY];
      case 46: return [this._tooltipWidth];
      case 47: return [this._tooltipHeightOffset];
      case 48: return [this._tooltipOffsetX, this._tooltipOffsetY];
      case 49: return [this._tooltipSpecialIconScale ?? (0.35 * (this._stripeSpecialTypeScale / this._stripeTypeScale))];
      case 50: return [this._tooltipSpecialLabelFontSize ?? Math.round(parseInt(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_COST_FONT_SIZE, 10) * (this._stripeSpecialLabelFontSize / this._stripeFontSize))];
      case 51: return [this._tooltipSpecialLabelX ?? 0, this._tooltipSpecialLabelY ?? 0];
      case 52: return [this._hintLoreAlpha];
      case 53: return [this._hoverTweakRect.x, this._hoverTweakRect.y, this._hoverTweakRect.w, this._hoverTweakRect.h];
      case 59: {
        const cx = this._nextSkillCostContainer?.x ?? 0;
        const cy = this._nextSkillCostContainer?.y ?? 0;
        return [cx, cy, this._nextSkillCostBgW, this._nextSkillCostBgH, this._nextSkillCostBgAlpha, this._nextSkillCostIconScale, this._nextSkillCostFontSize];
      }
      case 60: return [this._nextSkillCostIconScale];
      case 61: return [this._nextSkillCostFontSize];
      case 64: {
        return [this._btnEssenceCostBgOffsetX, this._btnEssenceCostBgOffsetY, this._btnEssenceCostBgW, this._btnEssenceCostBgH, this._btnEssenceCostBgAlpha, this._btnEssenceCostIconScale, this._btnEssenceCostFontSize];
      }
      case 65: {
        const icon0 = this._btnEssenceCostIcons[0];
        return [this._btnEssenceCostIconScale, icon0?.x ?? 0, icon0?.y ?? 0, icon0?.displayHeight ?? 0];
      }
      case 66: {
        const txt0 = this._btnEssenceCostTexts[0];
        return [this._btnEssenceCostFontSize, txt0?.x ?? 0, txt0?.y ?? 0, txt0?.displayWidth ?? 0, txt0?.displayHeight ?? 0];
      }
      case 72: return [this._btnEssenceCostSpecialIconScale];
      case 67: {
        const cx = this._btnEssenceCostContainer?.x ?? 0;
        const cy = this._btnEssenceCostContainer?.y ?? 0;
        return [cx, cy, this._btnEssenceCostBgAlpha, this._btnEssenceCostIconScale, this._btnEssenceCostFontSize];
      }
      case 68: return [0, 0];
      case 69: return [this._nextSkillCostGroupGap];
      case 70: return [this._btnEssenceCostGroupGap];
      default: return [];
    }
  }

  private getStripeFieldLabels(index: number): string[] {
    switch (index) {
      case 24: return ["spacing"];
      case 25: return ["fontSize"];
      case 26: return ["essenceScale"];
      case 27: return ["essenceX", "essenceY"];
      case 28: return ["typeScale"];
      case 29: return ["typeX", "typeY"];
      case 30: return ["bgWidth"];
      case 31: return ["bgHeight"];
      case 32: return ["bgAlpha"];
      case 33: return ["bgScale"];
      case 34: return ["dotFontSize"];
      case 35: return ["dotX", "dotY"];
      case 36: return ["specialLabelFS"];
      case 37: return ["specialTypeScale"];
      case 39: return ["specialX", "specialY"];
      case 40: return ["maskH"];
      case 41: return ["maskOffsetY"];
      case 42: return ["hintFontSize"];
      case 43: return ["hintBottomInset"];
      case 44: return ["hintTextX", "hintTextY"];
      case 45: return ["specialLabelX", "specialLabelY"];
      case 46: return ["tooltipWidth"];
      case 47: return ["tooltipHeightOffset"];
      case 48: return ["tooltipOffsetX", "tooltipOffsetY"];
      case 49: return ["tooltipSpecialIconScale"];
      case 50: return ["tooltipSpecialLabelFS"];
      case 51: return ["tooltipSpecialLabelX", "tooltipSpecialLabelY"];
      case 52: return ["hintLoreAlpha"];
      case 53: return ["hitX", "hitY", "hitW", "hitH"];
      case 59: return ["x", "y", "w", "h", "fillAlpha", "iconScale", "fontSize"];
      case 60: return ["iconScale"];
      case 61: return ["fontSize"];
      case 64: return ["bgOffsetX", "bgOffsetY", "w", "h", "fillAlpha", "iconScale", "fontSize"];
      case 65: return ["iconScale"];
      case 66: return ["fontSize"];
      case 72: return ["iconScale"];
      case 67: return ["x", "y", "fillAlpha", "iconScale", "fontSize"];
      case 68: return ["groupPosition"];
      case 69: return ["spacing"];
      case 70: return ["spacing"];
      default: return [];
    }
  }

  private outputAllTweakStates(): void {
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];
    for (let i = 0; i < ChampionSelectUiHandler.TWEAK_ASSETS.length; i++) {
      const name = ChampionSelectUiHandler.TWEAK_ASSETS[i];

      if (ChampionSelectUiHandler.STRIPE_ASSET_LABELS[i]) {
        const current = this.getStripeCurrentValues(i);
        const labels = this.getStripeFieldLabels(i);
        const base = this._stripeBaselines.get(i);
        if (base) {
          let hasDelta = false;
          const deltaParts: string[] = [];
          const currentParts: string[] = [];
          const baseParts: string[] = [];
          for (let j = 0; j < labels.length; j++) {
            const cv = current[j] ?? 0;
            const bv = base[j] ?? 0;
            const dv = cv - bv;
            if (Math.abs(dv) > 0.001) hasDelta = true;
            deltaParts.push(`Δ${labels[j]}=${dv >= 0 ? "+" : ""}${dv.toFixed(3)}`);
            currentParts.push(`${labels[j]}=${cv.toFixed(3)}`);
            baseParts.push(`${labels[j]}=${bv.toFixed(3)}`);
          }
          if (hasDelta) {
            changed.push(`${name}:\n  ORIGINAL: ${baseParts.join(" ")}\n  CHANGE:   ${deltaParts.join(" ")}\n  APPLIED:  ${currentParts.join(" ")}`);
          } else {
            unchanged.push(name);
          }
        } else {
          const currentParts = labels.map((l, j) => `${l}=${(current[j] ?? 0).toFixed(3)}`);
          changed.push(`${name}: ${currentParts.join(" ")} [no baseline]`);
        }
        continue;
      }

      if (name === "tileBlackBG") {
        const bgX = this.previewTileBlackBg?.x ?? 0;
        const bgY = this.previewTileBlackBg?.y ?? 0;
        changed.push(`${name}: x=${bgX} y=${bgY} w=${this._tileBlackBgW} h=${this._tileBlackBgH} fillAlpha=${this._tileBlackBgAlpha.toFixed(2)}`);
        continue;
      }

      if (i === 68) {
        const groupTargets = this.getTweakGroupTargets(i);
        const memberNames = [
          "previewContainer", "skillIconBarContainer", "xpBarContainer",
          "nextSkillLabel", "_nextSkillCostContainer"
        ];
        if (groupTargets.length > 0) {
          let anyMemberChanged = false;
          const memberLines: string[] = [];
          groupTargets.forEach((t: any, idx: number) => {
            const label = memberNames[idx] || `member${idx}`;
            const mx = (t as any).x ?? 0;
            const my = (t as any).y ?? 0;
            const msx = (t as any).scaleX ?? 1;
            const msy = (t as any).scaleY ?? 1;
            const mdw = (t as any).displayWidth ?? 0;
            const mdh = (t as any).displayHeight ?? 0;
            const ma = (t as any).alpha ?? 1;
            const mfs = parseInt((t as any).style?.fontSize || "0", 10);
            const mfsStr = mfs > 0 ? ` fs=${mfs}` : "";
            const base = this._barAreaBaselines[idx];
            if (base) {
              const dx = mx - base.x;
              const dy = my - base.y;
              const dsx = msx - base.scaleX;
              const dsy = msy - base.scaleY;
              const ddw = mdw - base.displayWidth;
              const ddh = mdh - base.displayHeight;
              const da = ma - base.alpha;
              const dfs = mfs - base.fontSize;
              const bfsStr = base.fontSize > 0 ? ` fs=${base.fontSize}` : "";
              const dfsStr = mfs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
              const hasDelta = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(ddw) > 0.5 || Math.abs(ddh) > 0.5 || Math.abs(da) > 0.001 || Math.abs(dfs) > 0;
              if (hasDelta) {
                anyMemberChanged = true;
                memberLines.push(`  ${label}:\n    ORIGINAL: x=${base.x} y=${base.y} scaleX=${base.scaleX.toFixed(3)} scaleY=${base.scaleY.toFixed(3)} w=${base.displayWidth.toFixed(1)} h=${base.displayHeight.toFixed(1)} α=${base.alpha.toFixed(2)}${bfsStr}\n    CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}\n    APPLIED:  x=${mx} y=${my} scaleX=${msx.toFixed(3)} scaleY=${msy.toFixed(3)} w=${mdw.toFixed(1)} h=${mdh.toFixed(1)} α=${ma.toFixed(2)}${mfsStr}`);
              } else {
                memberLines.push(`  ${label}: x=${mx} y=${my} scaleX=${msx.toFixed(3)} scaleY=${msy.toFixed(3)} w=${mdw.toFixed(1)} h=${mdh.toFixed(1)} α=${ma.toFixed(2)}${mfsStr}`);
              }
            } else {
              memberLines.push(`  ${label}: x=${mx} y=${my} scaleX=${msx.toFixed(3)} scaleY=${msy.toFixed(3)} w=${mdw.toFixed(1)} h=${mdh.toFixed(1)} α=${ma.toFixed(2)}${mfsStr}`);
            }
          });
          if (anyMemberChanged) {
            changed.push(`${name} (${groupTargets.length} members):\n${memberLines.join("\n")}`);
          } else {
            changed.push(`${name} (${groupTargets.length} members):\n${memberLines.join("\n")}`);
          }
        } else {
          unavailable.push(name);
        }
        continue;
      }

      const t = this.getTweakTarget(i);
      if (!t) {
        unavailable.push(name);
        continue;
      }
      const x = (t as any).x ?? 0;
      const y = (t as any).y ?? 0;
      const sx = (t as any).scaleX ?? 1;
      const sy = (t as any).scaleY ?? 1;
      const dw = (t as any).displayWidth ?? 0;
      const dh = (t as any).displayHeight ?? 0;
      const a = (t as any).alpha ?? 1;
      const fs = parseInt((t as any).style?.fontSize || "0", 10);
      const fsStr = fs > 0 ? ` fs=${fs}` : "";
      const color = (t as any).style?.color || "";
      const stroke = (t as any).style?.stroke || "";
      const strokeW = (t as any).style?.strokeThickness ?? 0;
      const styleStr = color ? ` color=${color} stroke=${stroke} strokeW=${strokeW}` : "";
      const baseline = this._tweakBaselines.get(name);
      if (baseline) {
        const dx = x - baseline.x;
        const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX;
        const dsy = sy - baseline.scaleY;
        const ddw = dw - baseline.displayWidth;
        const ddh = dh - baseline.displayHeight;
        const da = a - baseline.alpha;
        const dfs = fs - (baseline as any).fontSize;
        const bColor = (baseline as any).color || "";
        const bStroke = (baseline as any).stroke || "";
        const bStrokeW = (baseline as any).strokeThickness ?? 0;
        const styleChanged = color !== bColor || stroke !== bStroke || strokeW !== bStrokeW;
        const hasDelta = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(ddw) > 0.5 || Math.abs(ddh) > 0.5 || Math.abs(da) > 0.001 || Math.abs(dfs) > 0 || styleChanged;
        const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
        const bfsStr = (baseline as any).fontSize > 0 ? ` fs=${(baseline as any).fontSize}` : "";
        const bStyleStr = bColor ? ` color=${bColor} stroke=${bStroke} strokeW=${bStrokeW}` : "";
        if (hasDelta) {
          changed.push(`${name}:\n  ORIGINAL: x=${baseline.x} y=${baseline.y} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)} α=${baseline.alpha.toFixed(2)}${bfsStr}${bStyleStr}\n  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}\n  APPLIED:  x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${styleStr}`);
        } else {
          unchanged.push(name);
        }
      } else {
        changed.push(`${name}: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${styleStr} [no baseline]`);
      }
    }
    const sections: string[] = ["[CS-TWEAK-SNAPSHOT]", "NOTE: CHANGE values are deltas for code adjustments."];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) { sections.push("\n── UNCHANGED ──"); sections.push(unchanged.join(", ")); }
    if (unavailable.length > 0) { sections.push("\n── UNAVAILABLE ──"); sections.push(unavailable.join(", ")); }
    const output = sections.join("\n");
    console.log(output);
    tweakCopyToClipboard(output);
  }

  private getTweakGroupTargets(assetIndex: number): any[] {
    switch (assetIndex) {
      case 9: return this._tweakUnlockedSprites;
      case 10: return this._tweakNextSprites;
      case 11: return this._tweakFutureSprites;
      case 12: return this.skillIconSprites;
      case 13: {
        const bars: any[] = [];
        if (this._skillSurroundFill) bars.push(this._skillSurroundFill);
        if (this._skillEmptyTrack) bars.push(this._skillEmptyTrack);
        if (this._skillProgressStrip) bars.push(this._skillProgressStrip);
        if ((this as any)._futureBarStrip) bars.push((this as any)._futureBarStrip);
        return bars;
      }
      case 15: {
        const texts: any[] = [];
        const previewName = (this as any)._previewName;
        if (previewName) texts.push(previewName);
        if (this.levelText) texts.push(this.levelText);
        return texts;
      }
      case 16: {
        const counters: any[] = [];
        if ((this as any)._essenceCounter1Text) counters.push((this as any)._essenceCounter1Text);
        if ((this as any)._essenceCounter2Text) counters.push((this as any)._essenceCounter2Text);
        return counters;
      }
      case 19: {
        const icons: any[] = [...this._tweakUnlockedSprites, ...this._tweakFutureSprites];
        return icons;
      }
      case 38: {
        const targets: any[] = [];
        if (this.typeIcon1) targets.push(this.typeIcon1);
        if (this.typeIcon2) targets.push(this.typeIcon2);
        const affinityIcon = (this as any)._previewAffinityIcon;
        const affinityOverlay = (this as any)._previewAffinityOverlay;
        if (affinityIcon) targets.push(affinityIcon);
        if (affinityOverlay) targets.push(affinityOverlay);
        return targets;
      }
      case 57: {
        const targets: any[] = [];
        if (this.typeIcon1) targets.push(this.typeIcon1);
        if (this.typeIcon2) targets.push(this.typeIcon2);
        const affinityIcon = (this as any)._previewAffinityIcon;
        const affinityOverlay = (this as any)._previewAffinityOverlay;
        if (affinityIcon) targets.push(affinityIcon);
        if (affinityOverlay) targets.push(affinityOverlay);
        return targets;
      }
      case 60: return [...this._nextSkillCostIcons];
      case 61: return [...this._nextSkillCostTexts];
      case 62: {
        const all: any[] = [...this._nextSkillCostIcons, ...this._nextSkillCostTexts];
        if (this._nextSkillCostBg) all.push(this._nextSkillCostBg);
        return all;
      }
      case 65: return [...this._btnEssenceCostIcons];
      case 66: return [...this._btnEssenceCostTexts];
      case 67: {
        const all: any[] = [...this._btnEssenceCostIcons, ...this._btnEssenceCostSpecialIcons, ...this._btnEssenceCostTexts];
        if (this._btnEssenceCostBg) all.push(this._btnEssenceCostBg);
        return all;
      }
      case 72: return [...this._btnEssenceCostSpecialIcons];
      case 73: {
        const all: any[] = [];
        if (this._notEnoughEssenceIcon) all.push(this._notEnoughEssenceIcon);
        all.push(...this._btnEssenceCostIcons, ...this._btnEssenceCostSpecialIcons, ...this._btnEssenceCostTexts);
        return all;
      }
      case 74: {
        return [...this._btnEssenceCostIcons, ...this._btnEssenceCostSpecialIcons, ...this._btnEssenceCostTexts];
      }
      case 68: {
        const barArea: any[] = [];
        if (this.previewContainer) barArea.push(this.previewContainer);
        if (this.skillIconBarContainer) barArea.push(this.skillIconBarContainer);
        if (this.xpBarContainer) barArea.push(this.xpBarContainer);
        if (this.nextSkillLabel) barArea.push(this.nextSkillLabel);
        if (this._nextSkillCostContainer) barArea.push(this._nextSkillCostContainer);
        return barArea;
      }
      default: return [];
    }
  }

  private applyTweakToTarget(target: any, mode: string, direction: string, scaleStep: number, posStep: number, sizeStep: number): void {
    const alphaStep = 0.02;
    const fontStep = 1;
    if (direction === "up") {
      if (mode === "scale") {
        target.setScale(target.scaleX + scaleStep);
      } else if (mode === "position") {
        target.y -= posStep;
      } else if (mode === "width" && typeof target.setDisplaySize === "function" && target.displayWidth !== undefined) {
        target.setDisplaySize(target.displayWidth + sizeStep, target.displayHeight);
      } else if (mode === "height" && typeof target.setDisplaySize === "function" && target.displayHeight !== undefined) {
        target.setDisplaySize(target.displayWidth, target.displayHeight + sizeStep);
      } else if (mode === "alpha" && typeof target.setAlpha === "function") {
        target.setAlpha(Math.min(1.0, (target.alpha ?? 1.0) + alphaStep));
      } else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        const currentSize = parseInt(target.style?.fontSize || "16", 10);
        target.setFontSize(currentSize + fontStep);
      } else if (mode === "fontSize" && typeof target.setScale === "function" && typeof target.setFontSize !== "function") {
        target.setScale(target.scaleX + scaleStep);
      } else if (mode === "textStyle" && typeof target.setColor === "function") {
        const TEXT_STYLE_COUNT = 34;
        let idx = target.__tweakTextStyleIndex ?? 1;
        idx = (idx + 1) % TEXT_STYLE_COUNT;
        target.__tweakTextStyleIndex = idx;
        const uiTheme = (this.scene as BattleScene).uiTheme;
        target.setColor(getTextColor(idx, false, uiTheme));
        target.setShadowColor(getTextColor(idx, true, uiTheme));
      }
    } else if (direction === "down") {
      if (mode === "scale") {
        target.setScale(Math.max(0.01, target.scaleX - scaleStep));
      } else if (mode === "position") {
        target.y += posStep;
      } else if (mode === "width" && typeof target.setDisplaySize === "function" && target.displayWidth !== undefined) {
        target.setDisplaySize(Math.max(1, target.displayWidth - sizeStep), target.displayHeight);
      } else if (mode === "height" && typeof target.setDisplaySize === "function" && target.displayHeight !== undefined) {
        target.setDisplaySize(target.displayWidth, Math.max(1, target.displayHeight - sizeStep));
      } else if (mode === "alpha" && typeof target.setAlpha === "function") {
        target.setAlpha(Math.max(0.0, (target.alpha ?? 1.0) - alphaStep));
      } else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        const currentSize = parseInt(target.style?.fontSize || "16", 10);
        target.setFontSize(Math.max(4, currentSize - fontStep));
      } else if (mode === "fontSize" && typeof target.setScale === "function" && typeof target.setFontSize !== "function") {
        target.setScale(Math.max(0.01, target.scaleX - scaleStep));
      } else if (mode === "textStyle" && typeof target.setColor === "function") {
        const TEXT_STYLE_COUNT = 34;
        let idx = target.__tweakTextStyleIndex ?? 1;
        idx = (idx - 1 + TEXT_STYLE_COUNT) % TEXT_STYLE_COUNT;
        target.__tweakTextStyleIndex = idx;
        const uiTheme = (this.scene as BattleScene).uiTheme;
        target.setColor(getTextColor(idx, false, uiTheme));
        target.setShadowColor(getTextColor(idx, true, uiTheme));
      }
    } else if (direction === "right" && mode === "position") {
      target.x += posStep;
    } else if (direction === "left" && mode === "position") {
      target.x -= posStep;
    }
    if (mode === "textStyleOn" && typeof target.setColor === "function" && (direction === "up" || direction === "down")) {
      const isOn = target.__textStyleOn ?? false;
      if (!isOn) {
        target.__textStyleOnBackup = {
          fontFamily: target.style?.fontFamily,
          color: target.style?.color,
          stroke: target.style?.stroke,
          strokeThickness: target.style?.strokeThickness,
          shadowOffsetX: target.style?.shadowOffsetX,
          shadowOffsetY: target.style?.shadowOffsetY,
          shadowColor: target.style?.shadowColor,
        };
        target.setFontFamily("pkmnems");
        target.setColor("#E8E8E8");
        target.setStroke("#424242", 14);
        target.setShadow(0, 0, undefined);
        target.__textStyleOn = true;
      } else {
        const b = target.__textStyleOnBackup;
        if (b) {
          target.setFontFamily(b.fontFamily);
          target.setColor(b.color);
          target.setStroke(b.stroke, b.strokeThickness);
          target.setShadow(b.shadowOffsetX, b.shadowOffsetY, b.shadowColor);
        }
        target.__textStyleOn = false;
      }
    }
  }

  private handleTweakInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this._metaMode = TweakMetaMode.NONE;
      this.cleanupTweakKeyListeners();
      this._tweakBaselines.clear();
      this._stripeBaselines.clear();
      this._barAreaBaselines = [];
      this.hideHoverTweakBox();
      this.updateTweakHUD();
      this.scene.uiEditModeActive = false;
      console.log(`[CS-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      return true;
    }
    if (button === Button.SUBMIT) {
      if (this._metaMode === TweakMetaMode.EDIT_TYPE || this._metaMode === TweakMetaMode.ELEMENT) {
        this._metaMode = TweakMetaMode.EDIT;
        this.updateTweakHUD();
        console.log(`[CS-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._tweakMode = (this._tweakMode - 1 + ChampionSelectUiHandler.TWEAK_MODES.length) % ChampionSelectUiHandler.TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[CS-TWEAK] mode=${ChampionSelectUiHandler.TWEAK_MODES[this._tweakMode]}`);
      } else if (button === Button.RIGHT) {
        this._tweakMode = (this._tweakMode + 1) % ChampionSelectUiHandler.TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[CS-TWEAK] mode=${ChampionSelectUiHandler.TWEAK_MODES[this._tweakMode]}`);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._tweakAssetIndex = (this._tweakAssetIndex - 1 + ChampionSelectUiHandler.TWEAK_ASSETS.length) % ChampionSelectUiHandler.TWEAK_ASSETS.length;
        this.updateTweakHUD();
        console.log(`[CS-TWEAK] asset=${ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex]}`);
      } else if (button === Button.RIGHT) {
        this._tweakAssetIndex = (this._tweakAssetIndex + 1) % ChampionSelectUiHandler.TWEAK_ASSETS.length;
        this.updateTweakHUD();
        console.log(`[CS-TWEAK] asset=${ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex]}`);
      }
      return true;
    }

    const mode = ChampionSelectUiHandler.TWEAK_MODES[this._tweakMode];
    const assetName = ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex];
    const target = this.getTweakTarget(this._tweakAssetIndex);
    if (!target) {
      console.log(`[CS-TWEAK] no target for asset=${assetName}`);
      return true;
    }

    const scaleStep = 0.01;
    const posStep = 1;
    const sizeStep = 1;

    const groupTargets = this.getTweakGroupTargets(this._tweakAssetIndex);
    const isGroup = groupTargets.length > 0;

    let direction = "";
    switch (button) {
      case Button.UP: direction = "up"; break;
      case Button.DOWN: direction = "down"; break;
      case Button.RIGHT: direction = "right"; break;
      case Button.LEFT: direction = "left"; break;
      default: return true;
    }

    if (this._tweakAssetIndex === 24) {
      if (direction === "up") this._stripeSpacing = Math.max(0, this._stripeSpacing - 0.5);
      else if (direction === "down") this._stripeSpacing += 0.5;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeSpacing = ${this._stripeSpacing}`);
      return true;
    }

    if (this._tweakAssetIndex === 25) {
      if (direction === "up") this._stripeFontSize = Math.max(8, this._stripeFontSize - 1);
      else if (direction === "down") this._stripeFontSize += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeFontSize = ${this._stripeFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 26) {
      if (direction === "up") this._stripeEssenceScale = Math.max(0.01, this._stripeEssenceScale - 0.01);
      else if (direction === "down") this._stripeEssenceScale += 0.01;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeEssenceScale = ${this._stripeEssenceScale}`);
      return true;
    }

    if (this._tweakAssetIndex === 27) {
      if (direction === "left") this._stripeEssenceX -= 1;
      else if (direction === "right") this._stripeEssenceX += 1;
      else if (direction === "up") this._stripeEssenceY -= 1;
      else if (direction === "down") this._stripeEssenceY += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeEssencePos = ${this._stripeEssenceX},${this._stripeEssenceY}`);
      return true;
    }

    if (this._tweakAssetIndex === 28) {
      if (direction === "up") this._stripeTypeScale = Math.max(0.01, this._stripeTypeScale - 0.01);
      else if (direction === "down") this._stripeTypeScale += 0.01;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeTypeScale = ${this._stripeTypeScale}`);
      return true;
    }

    if (this._tweakAssetIndex === 29) {
      if (direction === "left") this._stripeTypeX -= 1;
      else if (direction === "right") this._stripeTypeX += 1;
      else if (direction === "up") this._stripeTypeY -= 1;
      else if (direction === "down") this._stripeTypeY += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeTypePos = ${this._stripeTypeX},${this._stripeTypeY}`);
      return true;
    }

    if (this._tweakAssetIndex === 30) {
      if (direction === "up") this._stripeBgWidth = Math.max(1, this._stripeBgWidth - 1);
      else if (direction === "down") this._stripeBgWidth += 1;
      if (this._requirementBgImg) this._requirementBgImg.setDisplaySize(this._stripeBgWidth, this._stripeBgHeight);
      this.syncHitAreaFromDimensions();
      console.log(`[CS-TWEAK] StripeBgWidth = ${this._stripeBgWidth}`);
      return true;
    }

    if (this._tweakAssetIndex === 31) {
      if (direction === "up") this._stripeBgHeight = Math.max(1, this._stripeBgHeight - 1);
      else if (direction === "down") this._stripeBgHeight += 1;
      if (this._requirementBgImg) this._requirementBgImg.setDisplaySize(this._stripeBgWidth, this._stripeBgHeight);
      this.syncHitAreaFromDimensions();
      console.log(`[CS-TWEAK] StripeBgHeight = ${this._stripeBgHeight}`);
      return true;
    }

    if (this._tweakAssetIndex === 32) {
      if (direction === "up") this._stripeBgAlpha = Math.max(0, Math.round((this._stripeBgAlpha - 0.02) * 100) / 100);
      else if (direction === "down") this._stripeBgAlpha = Math.min(1, Math.round((this._stripeBgAlpha + 0.02) * 100) / 100);
      if (this._requirementBgImg) this._requirementBgImg.setAlpha(this._stripeBgAlpha);
      console.log(`[CS-TWEAK] StripeBgAlpha = ${this._stripeBgAlpha}`);
      return true;
    }

    if (this._tweakAssetIndex === 33) {
      if (direction === "up") this._stripeBgScale = Math.max(0.01, Math.round((this._stripeBgScale - 0.01) * 100) / 100);
      else if (direction === "down") this._stripeBgScale = Math.round((this._stripeBgScale + 0.01) * 100) / 100;
      if (this._requirementBgImg) this._requirementBgImg.setScale(this._stripeBgScale);
      console.log(`[CS-TWEAK] StripeBgScale = ${this._stripeBgScale}`);
      return true;
    }

    if (this._tweakAssetIndex === 34) {
      if (direction === "up") this._stripeDotFontSize = Math.max(8, this._stripeDotFontSize - 1);
      else if (direction === "down") this._stripeDotFontSize += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeDotFontSize = ${this._stripeDotFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 35) {
      if (direction === "left") this._stripeDotX -= 1;
      else if (direction === "right") this._stripeDotX += 1;
      else if (direction === "up") this._stripeDotY -= 1;
      else if (direction === "down") this._stripeDotY += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeDotPos = ${this._stripeDotX},${this._stripeDotY}`);
      return true;
    }

    if (this._tweakAssetIndex === 36) {
      if (direction === "up") this._stripeSpecialLabelFontSize = Math.max(6, this._stripeSpecialLabelFontSize - 1);
      else if (direction === "down") this._stripeSpecialLabelFontSize += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeSpecialLabelFS = ${this._stripeSpecialLabelFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 37) {
      if (direction === "up") this._stripeSpecialTypeScale = Math.max(0.01, this._stripeSpecialTypeScale - 0.01);
      else if (direction === "down") this._stripeSpecialTypeScale += 0.01;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeSpecialTypeScale = ${this._stripeSpecialTypeScale}`);
      return true;
    }

    if (this._tweakAssetIndex === 39) {
      if (direction === "left") this._stripeSpecialX -= 1;
      else if (direction === "right") this._stripeSpecialX += 1;
      else if (direction === "up") this._stripeSpecialY -= 1;
      else if (direction === "down") this._stripeSpecialY += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeSpecialPos = ${this._stripeSpecialX},${this._stripeSpecialY}`);
      return true;
    }

    if (this._tweakAssetIndex === 40) {
      if (direction === "up") this._portraitMaskH = Math.max(1, this._portraitMaskH - 1);
      else if (direction === "down") this._portraitMaskH += 1;
      this.refreshPortraitMask();
      console.log(`[CS-TWEAK] PortraitMaskH = ${this._portraitMaskH}`);
      return true;
    }

    if (this._tweakAssetIndex === 41) {
      if (direction === "up") this._portraitMaskOffsetY -= 1;
      else if (direction === "down") this._portraitMaskOffsetY += 1;
      this.refreshPortraitMask();
      console.log(`[CS-TWEAK] PortraitMaskOffsetY = ${this._portraitMaskOffsetY}`);
      return true;
    }

    if (this._tweakAssetIndex === 42) {
      if (direction === "up") this._hintStripeFontSize = Math.max(8, this._hintStripeFontSize - 1);
      else if (direction === "down") this._hintStripeFontSize += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] HintStripeFontSize = ${this._hintStripeFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 43) {
      if (direction === "up") this._hintStripeBottomInset = Math.max(0, this._hintStripeBottomInset - 1);
      else if (direction === "down") this._hintStripeBottomInset += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] HintStripeBottomInset = ${this._hintStripeBottomInset}`);
      return true;
    }

    if (this._tweakAssetIndex === 44) {
      if (direction === "left") this._hintStripeTextX -= 1;
      else if (direction === "right") this._hintStripeTextX += 1;
      else if (direction === "up") this._hintStripeTextY -= 1;
      else if (direction === "down") this._hintStripeTextY += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] HintStripeTextPos = ${this._hintStripeTextX},${this._hintStripeTextY}`);
      return true;
    }

    if (this._tweakAssetIndex === 45) {
      if (direction === "left") this._stripeSpecialLabelX -= 1;
      else if (direction === "right") this._stripeSpecialLabelX += 1;
      else if (direction === "up") this._stripeSpecialLabelY -= 1;
      else if (direction === "down") this._stripeSpecialLabelY += 1;
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateRequirementStrip(selected);
      console.log(`[CS-TWEAK] StripeSpecialLabelPos = ${this._stripeSpecialLabelX},${this._stripeSpecialLabelY}`);
      return true;
    }

    if (this._tweakAssetIndex === 46) {
      if (direction === "up") this._tooltipWidth = Math.max(70, this._tooltipWidth - 1);
      else if (direction === "down") this._tooltipWidth += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipWidth = ${this._tooltipWidth}`);
      return true;
    }

    if (this._tweakAssetIndex === 47) {
      if (direction === "up") this._tooltipHeightOffset -= 1;
      else if (direction === "down") this._tooltipHeightOffset += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipHeightOffset = ${this._tooltipHeightOffset}`);
      return true;
    }

    if (this._tweakAssetIndex === 48) {
      if (direction === "left") this._tooltipOffsetX -= 1;
      else if (direction === "right") this._tooltipOffsetX += 1;
      else if (direction === "up") this._tooltipOffsetY -= 1;
      else if (direction === "down") this._tooltipOffsetY += 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipPos = ${this._tooltipOffsetX},${this._tooltipOffsetY}`);
      return true;
    }

    if (this._tweakAssetIndex === 49) {
      const cur = this._tooltipSpecialIconScale ?? (0.35 * (this._stripeSpecialTypeScale / this._stripeTypeScale));
      if (direction === "up") this._tooltipSpecialIconScale = cur + 0.01;
      else if (direction === "down") this._tooltipSpecialIconScale = Math.max(0.1, cur - 0.01);
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipSpecialIconScale = ${(this._tooltipSpecialIconScale ?? cur).toFixed(3)}`);
      return true;
    }

    if (this._tweakAssetIndex === 50) {
      const cur = this._tooltipSpecialLabelFontSize ?? Math.round(parseInt(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_COST_FONT_SIZE, 10) * (this._stripeSpecialLabelFontSize / this._stripeFontSize));
      if (direction === "up") this._tooltipSpecialLabelFontSize = cur + 1;
      else if (direction === "down") this._tooltipSpecialLabelFontSize = Math.max(8, cur - 1);
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipSpecialLabelFS = ${this._tooltipSpecialLabelFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 51) {
      const curX = this._tooltipSpecialLabelX ?? 0;
      const curY = this._tooltipSpecialLabelY ?? 0;
      if (direction === "left") this._tooltipSpecialLabelX = curX - 1;
      else if (direction === "right") this._tooltipSpecialLabelX = curX + 1;
      else if (direction === "up") this._tooltipSpecialLabelY = curY - 1;
      else if (direction === "down") this._tooltipSpecialLabelY = curY + 1;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] TooltipSpecialLabelPos = ${this._tooltipSpecialLabelX},${this._tooltipSpecialLabelY}`);
      return true;
    }

    if (this._tweakAssetIndex === 52) {
      if (direction === "up") this._hintLoreAlpha = Math.min(1.0, this._hintLoreAlpha + 0.05);
      else if (direction === "down") this._hintLoreAlpha = Math.max(0, this._hintLoreAlpha - 0.05);
      this._hintLoreAlpha = Math.round(this._hintLoreAlpha * 100) / 100;
      this.refreshSkillTooltipIfActive();
      console.log(`[CS-TWEAK] HintLoreAlpha = ${this._hintLoreAlpha}`);
      return true;
    }

    if (this._tweakAssetIndex === 53) {
      const step = 0.5;
      const r = this._hoverTweakRect;
      if (mode === "position") {
        if (direction === "left") r.x -= step;
        else if (direction === "right") r.x += step;
        else if (direction === "up") r.y -= step;
        else if (direction === "down") r.y += step;
      } else if (mode === "width") {
        if (direction === "up" || direction === "left") r.w = Math.max(1, r.w - step);
        else if (direction === "down" || direction === "right") r.w += step;
      } else if (mode === "height") {
        if (direction === "up" || direction === "left") r.h = Math.max(1, r.h - step);
        else if (direction === "down" || direction === "right") r.h += step;
      } else if (mode === "scale") {
        const scaleAmt = 0.5;
        if (direction === "up" || direction === "right") {
          r.w += scaleAmt;
          r.h += scaleAmt;
        } else {
          r.w = Math.max(1, r.w - scaleAmt);
          r.h = Math.max(1, r.h - scaleAmt);
        }
      } else if (mode === "alpha") {
        console.log(`[CS-TWEAK] HoverArea: alpha mode not applicable`);
        return true;
      }
      this.drawHoverTweakBox();
      this.syncHoverTweakToHitArea();
      console.log(`[CS-TWEAK] HoverArea mode=${mode} rect=(${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.w.toFixed(1)}, ${r.h.toFixed(1)})`);
      return true;
    }

    if (this._tweakAssetIndex === 58) {
      if (mode === "width") {
        this._tileBlackBgW += (direction === "right" || direction === "up") ? 1 : -1;
        this._tileBlackBgW = Math.max(1, this._tileBlackBgW);
      } else if (mode === "height") {
        this._tileBlackBgH += (direction === "up") ? 1 : -1;
        this._tileBlackBgH = Math.max(1, this._tileBlackBgH);
      } else if (mode === "alpha") {
        this._tileBlackBgAlpha += direction === "up" ? 0.02 : -0.02;
        this._tileBlackBgAlpha = Math.max(0, Math.min(1, this._tileBlackBgAlpha));
      } else if (mode === "position") {
        if (this.previewTileBlackBg) {
          if (direction === "left") this.previewTileBlackBg.x -= 1;
          else if (direction === "right") this.previewTileBlackBg.x += 1;
          else if (direction === "up") this.previewTileBlackBg.y -= 1;
          else if (direction === "down") this.previewTileBlackBg.y += 1;
        }
      }
      const bgTopY = (this as any)._previewName?.y ?? 0;
      this.redrawPreviewTileBlackBg(this._tileBlackBgW, this._tileBlackBgH, bgTopY - 2);
      const bgX = this.previewTileBlackBg?.x ?? 0;
      const bgY = this.previewTileBlackBg?.y ?? 0;
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=tileBlackBG x=${bgX} y=${bgY} w=${this._tileBlackBgW} h=${this._tileBlackBgH} fillAlpha=${this._tileBlackBgAlpha.toFixed(2)}`);
      return true;
    }

    if (this._tweakAssetIndex === 59) {
      if (mode === "width") {
        this._nextSkillCostBgW += (direction === "right" || direction === "up") ? 0.5 : -0.5;
        this._nextSkillCostBgW = Math.max(0.5, this._nextSkillCostBgW);
      } else if (mode === "height") {
        this._nextSkillCostBgH += (direction === "up") ? 0.5 : -0.5;
        this._nextSkillCostBgH = Math.max(0.5, this._nextSkillCostBgH);
      } else if (mode === "alpha") {
        this._nextSkillCostBgAlpha += direction === "up" ? 0.02 : -0.02;
        this._nextSkillCostBgAlpha = Math.max(0, Math.min(1, this._nextSkillCostBgAlpha));
      } else if (mode === "scale") {
        this._nextSkillCostIconScale += direction === "up" ? 0.02 : -0.02;
        this._nextSkillCostIconScale = Math.max(0.05, this._nextSkillCostIconScale);
      } else if (mode === "fontSize") {
        this._nextSkillCostFontSize += direction === "up" ? 1 : -1;
        this._nextSkillCostFontSize = Math.max(6, this._nextSkillCostFontSize);
      } else if (mode === "position") {
        if (direction === "left") this._nextSkillCostOffsetX -= 0.5;
        else if (direction === "right") this._nextSkillCostOffsetX += 0.5;
        else if (direction === "up") this._nextSkillCostOffsetY -= 0.5;
        else if (direction === "down") this._nextSkillCostOffsetY += 0.5;
      }
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateNextSkillCostDisplay(selected);
      const cx = this._nextSkillCostContainer?.x ?? 0;
      const cy = this._nextSkillCostContainer?.y ?? 0;
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=NextSkillCostBg x=${cx} y=${cy} w=${this._nextSkillCostBgW} h=${this._nextSkillCostBgH} fillAlpha=${this._nextSkillCostBgAlpha.toFixed(2)} iconScale=${this._nextSkillCostIconScale.toFixed(2)} fontSize=${this._nextSkillCostFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 60) {
      if (mode === "scale") {
        this._nextSkillCostIconScale += direction === "up" ? 0.02 : -0.02;
        this._nextSkillCostIconScale = Math.max(0.05, this._nextSkillCostIconScale);
        const selected = this.availableChampions[this.selectedChampionIndex];
        if (selected) this.updateNextSkillCostDisplay(selected);
        console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=NextSkillCostIcons iconScale=${this._nextSkillCostIconScale.toFixed(2)}`);
        return true;
      }
      const iconTargets = this._nextSkillCostIcons;
      if (iconTargets.length > 0) {
        iconTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, posStep, sizeStep));
        this.logTweakState(assetName, iconTargets[0], `${mode} ${direction.toUpperCase()} (${iconTargets.length} icons)`);
      }
      return true;
    }

    if (this._tweakAssetIndex === 61) {
      if (mode === "fontSize") {
        this._nextSkillCostFontSize += direction === "up" ? 1 : -1;
        this._nextSkillCostFontSize = Math.max(6, this._nextSkillCostFontSize);
        const selected = this.availableChampions[this.selectedChampionIndex];
        if (selected) this.updateNextSkillCostDisplay(selected);
        console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=NextSkillCostText fontSize=${this._nextSkillCostFontSize}`);
        return true;
      }
      const textTargets = this._nextSkillCostTexts;
      if (textTargets.length > 0) {
        textTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, posStep, sizeStep));
        this.logTweakState(assetName, textTargets[0], `${mode} ${direction.toUpperCase()} (${textTargets.length} texts)`);
      }
      return true;
    }

    if (this._tweakAssetIndex === 63) {
      if (mode === "scale") {
        this._notEnoughIconScale += direction === "up" ? 0.02 : -0.02;
        this._notEnoughIconScale = Math.max(0.01, this._notEnoughIconScale);
        if (this._notEnoughEssenceIcon) this._notEnoughEssenceIcon.setScale(this._notEnoughIconScale);
      } else if (mode === "position") {
        if (direction === "right") this._notEnoughIconOffsetX += 0.5;
        else if (direction === "left") this._notEnoughIconOffsetX -= 0.5;
        if (this._notEnoughEssenceIcon) {
          if (direction === "right" || direction === "left") {
            this._notEnoughEssenceIcon.x += (direction === "right" ? 0.5 : -0.5);
          } else {
            this._notEnoughEssenceIcon.y += (direction === "up" ? -1 : 1);
          }
        }
      } else if (mode === "alpha" && this._notEnoughEssenceIcon) {
        const step = direction === "up" ? 0.02 : -0.02;
        this._notEnoughEssenceIcon.setAlpha(Math.min(1, Math.max(0, (this._notEnoughEssenceIcon.alpha || 1) + step)));
      }
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=NotEnoughIcon scale=${this._notEnoughIconScale.toFixed(2)} offsetX=${this._notEnoughIconOffsetX}`);
      return true;
    }

    if (this._tweakAssetIndex === 64) {
      if (mode === "width") {
        this._btnEssenceCostBgW += (direction === "right" || direction === "up") ? 0.2 : -0.2;
        this._btnEssenceCostBgW = Math.max(0.2, this._btnEssenceCostBgW);
      } else if (mode === "height") {
        this._btnEssenceCostBgH += (direction === "up") ? 0.2 : -0.2;
        this._btnEssenceCostBgH = Math.max(0.2, this._btnEssenceCostBgH);
      } else if (mode === "alpha") {
        this._btnEssenceCostBgAlpha += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostBgAlpha = Math.max(0, Math.min(1, this._btnEssenceCostBgAlpha));
      } else if (mode === "scale") {
        this._btnEssenceCostIconScale += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostIconScale = Math.max(0.05, this._btnEssenceCostIconScale);
      } else if (mode === "fontSize") {
        this._btnEssenceCostFontSize += direction === "up" ? 1 : -1;
        this._btnEssenceCostFontSize = Math.max(6, this._btnEssenceCostFontSize);
      } else if (mode === "position") {
        if (direction === "left") this._btnEssenceCostBgOffsetX -= 0.2;
        else if (direction === "right") this._btnEssenceCostBgOffsetX += 0.2;
        else if (direction === "up") this._btnEssenceCostBgOffsetY -= 0.2;
        else if (direction === "down") this._btnEssenceCostBgOffsetY += 0.2;
      }
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateBtnEssenceCostDisplay(selected);
      const cx = this._btnEssenceCostContainer?.x ?? 0;
      const cy = this._btnEssenceCostContainer?.y ?? 0;
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostBg x=${cx} y=${cy} bgOffsetX=${this._btnEssenceCostBgOffsetX.toFixed(1)} bgOffsetY=${this._btnEssenceCostBgOffsetY.toFixed(1)} w=${this._btnEssenceCostBgW} h=${this._btnEssenceCostBgH} fillAlpha=${this._btnEssenceCostBgAlpha.toFixed(2)} iconScale=${this._btnEssenceCostIconScale.toFixed(2)} fontSize=${this._btnEssenceCostFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 65) {
      if (mode === "scale") {
        this._btnEssenceCostIconScale += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostIconScale = Math.max(0.05, this._btnEssenceCostIconScale);
        const selected = this.availableChampions[this.selectedChampionIndex];
        if (selected) this.updateBtnEssenceCostDisplay(selected);
        console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostIcons iconScale=${this._btnEssenceCostIconScale.toFixed(2)}`);
        return true;
      }
      const iconTargets = this._btnEssenceCostIcons;
      if (iconTargets.length > 0) {
        iconTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, 0.1, 0.1));
        this.logTweakState(assetName, iconTargets[0], `${mode} ${direction.toUpperCase()} (${iconTargets.length} icons)`);
      }
      return true;
    }

    if (this._tweakAssetIndex === 66) {
      if (mode === "fontSize") {
        this._btnEssenceCostFontSize += direction === "up" ? 1 : -1;
        this._btnEssenceCostFontSize = Math.max(6, this._btnEssenceCostFontSize);
        const selected = this.availableChampions[this.selectedChampionIndex];
        if (selected) this.updateBtnEssenceCostDisplay(selected);
        console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostText fontSize=${this._btnEssenceCostFontSize}`);
        return true;
      }
      const textTargets = this._btnEssenceCostTexts;
      if (textTargets.length > 0) {
        textTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, 0.1, 0.1));
        this.logTweakState(assetName, textTargets[0], `${mode} ${direction.toUpperCase()} (${textTargets.length} texts)`);
      }
      return true;
    }

    if (this._tweakAssetIndex === 72) {
      if (mode === "scale") {
        this._btnEssenceCostSpecialIconScale += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostSpecialIconScale = Math.max(0.05, this._btnEssenceCostSpecialIconScale);
        const selected = this.availableChampions[this.selectedChampionIndex];
        if (selected) this.updateBtnEssenceCostDisplay(selected);
        console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostSpecialIcons iconScale=${this._btnEssenceCostSpecialIconScale.toFixed(2)}`);
        return true;
      }
      const specialTargets = this._btnEssenceCostSpecialIcons;
      if (specialTargets.length > 0) {
        specialTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, 0.1, 0.1));
        this.logTweakState(assetName, specialTargets[0], `${mode} ${direction.toUpperCase()} (${specialTargets.length} special icons)`);
      }
      return true;
    }

    if (this._tweakAssetIndex === 67) {
      if (mode === "position") {
        if (direction === "left") this._btnEssenceCostOffsetX -= 0.2;
        else if (direction === "right") this._btnEssenceCostOffsetX += 0.2;
        else if (direction === "up") this._btnEssenceCostOffsetY -= 0.2;
        else if (direction === "down") this._btnEssenceCostOffsetY += 0.2;
      } else if (mode === "scale") {
        this._btnEssenceCostIconScale += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostIconScale = Math.max(0.05, this._btnEssenceCostIconScale);
      } else if (mode === "fontSize") {
        this._btnEssenceCostFontSize += direction === "up" ? 1 : -1;
        this._btnEssenceCostFontSize = Math.max(6, this._btnEssenceCostFontSize);
      } else if (mode === "alpha") {
        this._btnEssenceCostBgAlpha += direction === "up" ? 0.02 : -0.02;
        this._btnEssenceCostBgAlpha = Math.max(0, Math.min(1, this._btnEssenceCostBgAlpha));
      }
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateBtnEssenceCostDisplay(selected);
      const cx = this._btnEssenceCostContainer?.x ?? 0;
      const cy = this._btnEssenceCostContainer?.y ?? 0;
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostAll x=${cx} y=${cy} fillAlpha=${this._btnEssenceCostBgAlpha.toFixed(2)} iconScale=${this._btnEssenceCostIconScale.toFixed(2)} fontSize=${this._btnEssenceCostFontSize}`);
      return true;
    }

    if (this._tweakAssetIndex === 69) {
      this._nextSkillCostGroupGap += direction === "up" || direction === "right" ? 1 : -1;
      this._nextSkillCostGroupGap = Math.max(0, this._nextSkillCostGroupGap);
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateNextSkillCostDisplay(selected);
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=NextSkillCostSpacing gap=${this._nextSkillCostGroupGap}`);
      return true;
    }

    if (this._tweakAssetIndex === 70) {
      this._btnEssenceCostGroupGap += direction === "up" || direction === "right" ? 1 : -1;
      this._btnEssenceCostGroupGap = Math.max(0, this._btnEssenceCostGroupGap);
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateBtnEssenceCostDisplay(selected);
      console.log(`[CS-TWEAK] ${direction.toUpperCase()} | asset=BtnEssenceCostSpacing gap=${this._btnEssenceCostGroupGap}`);
      return true;
    }

    if (this._tweakAssetIndex === 5) {
      this.applyTweakToTarget(target, mode, direction, 0.1, 0.1, 0.1);
      this.logTweakState(assetName, target, `${mode} ${direction.toUpperCase()}`);
      return true;
    }

    if (isGroup && this._tweakAssetIndex === 19 && mode === "position") {
      groupTargets.forEach((t, idx) => {
        const spacingDelta = (idx + 1) * posStep;
        if (direction === "right") t.x += spacingDelta;
        else if (direction === "left") t.x -= spacingDelta;
        else if (direction === "up") t.y -= spacingDelta;
        else if (direction === "down") t.y += spacingDelta;
      });
      this.logTweakState(assetName, target, `spacing ${direction.toUpperCase()} (${groupTargets.length} icons)`);
    } else if (isGroup) {
      groupTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, posStep, sizeStep));
      this.logTweakState(assetName, target, `${mode} ${direction.toUpperCase()} (${groupTargets.length} sprites)`);
    } else {
      this.applyTweakToTarget(target, mode, direction, scaleStep, posStep, sizeStep);
      this.logTweakState(assetName, target, `${mode} ${direction.toUpperCase()}`);
    }
    return true;
  }

  private getTweakTarget(assetIndex: number): any | null {
    switch (assetIndex) {
      case 0: return this.fullChampionSprite || null;
      case 1: return (this as any)._portraitTileFrame || null;
      case 2: return this._skillEmptyTrack || null;
      case 3: return this._skillProgressStrip || null;
      case 4: return (this as any)._futureBarStrip || null;
      case 5: return this.useEssenceButtonIcon || null;
      case 6: return this._tweakFocusedGoldTile || null;
      case 7: return this._tweakFocusedIconSprite || null;
      case 8: return (this as any)._essenceCountersRow || null;
      case 9: return (this._tweakUnlockedSprites.length > 0 ? this._tweakUnlockedSprites[0] : null);
      case 10: return (this._tweakNextSprites.length > 0 ? this._tweakNextSprites[0] : null);
      case 11: return (this._tweakFutureSprites.length > 0 ? this._tweakFutureSprites[0] : null);
      case 12: return (this.skillIconSprites.length > 0 ? this.skillIconSprites[0] : null);
      case 13: return this._skillEmptyTrack || this._skillProgressStrip || null;
      case 14: return this.titleText || null;
      case 15: return (this as any)._previewName || null;
      case 16: return (this as any)._essenceCounter1Text || null;
      case 17: return this.useEssenceButtonContainer || null;
      case 18: return this.useEssenceButtonText || null;
      case 19: return (this._tweakUnlockedSprites.length > 0 ? this._tweakUnlockedSprites[0] : null);
      case 20: return this._skillSurroundFill || null;
      case 21:
        return this.nextSkillLabel || null;
      case 22: return this._requirementBgContainer || null;
      case 23: return this._requirementBgImg || null;
      case 24: return this._requirementBgContainer || null;
      case 25: return this._requirementBgContainer || null;
      case 26: case 27: return this._stripeEssenceSprite || null;
      case 28: case 29: return (this._stripeTypeSprites.length > 0 ? this._stripeTypeSprites[0] : null);
      case 30: case 31: case 32: case 33: return this._requirementBgImg || null;
      case 34: case 35: return this._requirementBgContainer || null;
      case 36: case 37: return this._requirementBgContainer || null;
      case 38: return this.typeIcon1 || null;
      case 39: return this._requirementBgContainer || null;
      case 40: case 41: return this.portraitMaskGfx || null;
      case 42: case 43: case 44: return this.skillTooltipContainer || null;
      case 45: return this._requirementBgContainer || null;
      case 46: case 47: case 48: case 49: case 50: case 51: case 52: return this.skillTooltipContainer || null;
      case 53: return this._requirementBgContainer || null;
      case 54: return (this as any)._previewName || null;
      case 55: return (this as any)._previewSubtitle || null;
      case 56: return this.levelText || null;
      case 57: return this.typeIcon1 || null;
      case 58: return this.previewTileBlackBg || null;
      case 59: return this._nextSkillCostBg || null;
      case 60: return (this._nextSkillCostIcons.length > 0 ? this._nextSkillCostIcons[0] : null);
      case 61: return (this._nextSkillCostTexts.length > 0 ? this._nextSkillCostTexts[0] : null);
      case 62: return this._nextSkillCostContainer || null;
      case 63: return this._notEnoughEssenceIcon || null;
      case 64: return this._btnEssenceCostBg || null;
      case 65: return (this._btnEssenceCostIcons.length > 0 ? this._btnEssenceCostIcons[0] : null);
      case 66: return (this._btnEssenceCostTexts.length > 0 ? this._btnEssenceCostTexts[0] : null);
      case 67: return this._btnEssenceCostContainer || null;
      case 68: return this.previewContainer || null;
      case 69: return this._nextSkillCostContainer || null;
      case 70: return this._btnEssenceCostContainer || null;
      case 71: return (this as any)._useEssenceBtnImg || null;
      case 72: return (this._btnEssenceCostSpecialIcons.length > 0 ? this._btnEssenceCostSpecialIcons[0] : null);
      case 73: return this._notEnoughEssenceIcon || (this._btnEssenceCostIcons.length > 0 ? this._btnEssenceCostIcons[0] : null);
      case 74: return (this._btnEssenceCostIcons.length > 0 ? this._btnEssenceCostIcons[0] : null);
      default: return null;
    }
  }

  private onTweakAssetSelected(): void {
    const idx = this._tweakAssetIndex;
    const assetName = ChampionSelectUiHandler.TWEAK_ASSETS[idx];
    if (assetName === "HoverArea") {
      this.showHoverTweakBox();
    } else {
      this.hideHoverTweakBox();
    }
    if ((idx >= 64 && idx <= 67 || idx === 70 || idx === 72 || idx === 73 || idx === 74) && this._btnEssenceCostTexts.length === 0) {
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateBtnEssenceCostDisplay(selected);
    }
    if ((idx >= 59 && idx <= 62 || idx === 69) && this._nextSkillCostTexts.length === 0) {
      const selected = this.availableChampions[this.selectedChampionIndex];
      if (selected) this.updateNextSkillCostDisplay(selected);
    }
    if (idx === 21) {
      const t = this.nextSkillLabel;
      if (t) {
        this._tweakBaselines.set(ChampionSelectUiHandler.TWEAK_ASSETS[idx], {
          x: (t as any).x ?? 0, y: (t as any).y ?? 0,
          scaleX: (t as any).scaleX ?? 1, scaleY: (t as any).scaleY ?? 1,
          displayWidth: (t as any).displayWidth ?? 0, displayHeight: (t as any).displayHeight ?? 0,
          alpha: (t as any).alpha ?? 1,
          fontSize: parseInt((t as any).style?.fontSize || "0", 10),
          color: (t as any).style?.color || "",
          stroke: (t as any).style?.stroke || "",
          strokeThickness: (t as any).style?.strokeThickness ?? 0,
        });
      }
    }
  }

  private showHoverTweakBox(): void {
    this._hoverTweakActive = true;
    if (this._requirementBgContainer) {
      this._requirementBgContainer.setVisible(true);
    }
    if (!this._hoverTweakGraphics && this._requirementBgContainer) {
      this._hoverTweakGraphics = this.scene.add.graphics();
      this._requirementBgContainer.add(this._hoverTweakGraphics);
    }
    this.drawHoverTweakBox();
  }

  private hideHoverTweakBox(): void {
    this._hoverTweakActive = false;
    if (this._hoverTweakGraphics) {
      this._hoverTweakGraphics.clear();
      this._hoverTweakGraphics.setVisible(false);
    }
    if (this._requirementBgContainer) {
      this._requirementBgContainer.setVisible(false);
    }
  }

  private drawHoverTweakBox(): void {
    if (!this._hoverTweakGraphics) return;
    this._hoverTweakGraphics.setVisible(true);
    this._hoverTweakGraphics.clear();
    const r = this._hoverTweakRect;
    this._hoverTweakGraphics.fillStyle(0x00ff00, 0.18);
    this._hoverTweakGraphics.fillRect(r.x, r.y, r.w, r.h);
    this._hoverTweakGraphics.lineStyle(1, 0x00ff00, 0.7);
    this._hoverTweakGraphics.strokeRect(r.x, r.y, r.w, r.h);
  }

  private syncHoverTweakToHitArea(): void {
    this.updateRequirementHoverZonePosition();
  }

  private syncHitAreaFromDimensions(): void {
    const padY = 4;
    this._hoverTweakRect = {
      x: -this._stripeBgWidth / 2,
      y: -this._stripeBgHeight / 2 - padY,
      w: this._stripeBgWidth,
      h: this._stripeBgHeight + padY * 2
    };
    if (this._hoverTweakActive) this.drawHoverTweakBox();
    this.updateRequirementHoverZonePosition();
  }

  private ensureRequirementHoverZone(): void {
    if (this._requirementHoverZone) {
      this.updateRequirementHoverZonePosition();
      this._requirementHoverZone.setVisible(true);
      return;
    }
    const scene = this.scene as BattleScene;
    const zw = this._stripeBgWidth * 1.12;
    const zh = (this._stripeBgHeight + 8) * 1.12;
    this._requirementHoverZone = scene.add.zone(0, 0, zw, zh);
    this._requirementHoverZone.setOrigin(0, 0);
    (scene as any).uiContainer.add(this._requirementHoverZone);
    this._requirementHoverZone.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, zw, zh),
      Phaser.Geom.Rectangle.Contains
    );
    this._requirementHoverZone.on("pointerover", () => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
      const btnRef = this.useEssenceButtonContainer || this._requirementBgContainer;
      const wm = btnRef!.getWorldTransformMatrix();
      const btnImg = (this as any)._useEssenceBtnImg;
      const btnHalfW = btnImg ? (btnImg.displayWidth * 6) / 2 : 40;
      this.showUnlockBtnTooltip(wm.tx + btnHalfW, wm.ty);
    });
    this._requirementHoverZone.on("pointerout", () => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
      this.hideUnlockBtnTooltip();
    });
    this.updateRequirementHoverZonePosition();
  }

  private updateRequirementHoverZonePosition(): void {
    if (!this._requirementHoverZone) return;
    const anchor = this.useEssenceButtonContainer || this._requirementBgContainer;
    if (!anchor) return;
    const wm = anchor.getWorldTransformMatrix();
    const btnImg = (this as any)._useEssenceBtnImg;
    const btnW = btnImg ? btnImg.displayWidth : 62;
    const btnH = btnImg ? btnImg.displayHeight : 55;
    const costVisible = this._btnEssenceCostContainer && this._btnEssenceCostContainer.visible;
    const extraH = costVisible ? 16 : 0;
    const zoneW = Math.max(btnW, 62) + 8;
    const zoneH = btnH + extraH + 8;
    const zoneX = (wm.tx / 6) - zoneW / 2;
    const zoneY = (wm.ty / 6) - zoneH / 2 + 4;
    this._requirementHoverZone.setPosition(zoneX, zoneY);
    this._requirementHoverZone.setSize(zoneW, zoneH);
    if (this._requirementHoverZone.input) {
      const hitRect = this._requirementHoverZone.input.hitArea as Phaser.Geom.Rectangle;
      hitRect.setTo(0, 0, zoneW, zoneH);
    }
  }

  private hideRequirementHoverZone(): void {
    if (this._requirementHoverZone) {
      this._requirementHoverZone.setVisible(false);
      this.hideUnlockBtnTooltip();
    }
  }

  private destroyRequirementHoverZone(): void {
    if (this._requirementHoverZone) {
      this._requirementHoverZone.destroy();
      this._requirementHoverZone = null;
    }
  }

  private setupTweakKeyListeners(): void {
    this._tweakKeyOneHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
      if (this._metaMode === TweakMetaMode.NONE) {
        this.cleanupTweakKeyListeners();
        this._tweakBaselines.clear();
        this._stripeBaselines.clear();
        this._barAreaBaselines = [];
      }
      this.updateTweakHUD();
      console.log(`[CS-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
    };
    this._tweakKeyTwoHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._tweakAssetIndex = (this._tweakAssetIndex + 1) % ChampionSelectUiHandler.TWEAK_ASSETS.length;
      this.onTweakAssetSelected();
      this.updateTweakHUD();
      const assetName = ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex];
      this._dropdownPanel?.markUsed(assetName);
      console.log(`[CS-TWEAK] asset=${assetName}`);
    };
    this._tweakKeyThreeHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._tweakAssetIndex = (this._tweakAssetIndex - 1 + ChampionSelectUiHandler.TWEAK_ASSETS.length) % ChampionSelectUiHandler.TWEAK_ASSETS.length;
      this.onTweakAssetSelected();
      this.updateTweakHUD();
      const assetName = ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex];
      this._dropdownPanel?.markUsed(assetName);
      console.log(`[CS-TWEAK] asset=${assetName}`);
    };
    this._tweakKeyVHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this.outputAllTweakStates();
    };
    (this as any)._tweakKeyOHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this.grantExactEssenceForLevelUp();
    };
    (this as any)._tweakKeyFiveHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._dropdownPanel?.toggle();
    };
    this.scene.input.keyboard?.on("keydown-ONE", this._tweakKeyOneHandler);
    this.scene.input.keyboard?.on("keydown-TWO", this._tweakKeyTwoHandler);
    this.scene.input.keyboard?.on("keydown-THREE", this._tweakKeyThreeHandler);
    this.scene.input.keyboard?.on("keydown-V", this._tweakKeyVHandler);
    this.scene.input.keyboard?.on("keydown-O", (this as any)._tweakKeyOHandler);
    this.scene.input.keyboard?.on("keydown-FIVE", (this as any)._tweakKeyFiveHandler);
  }

  private cleanupTweakKeyListeners(): void {
    if (this._tweakKeyOneHandler) {
      this.scene.input.keyboard?.off("keydown-ONE", this._tweakKeyOneHandler);
      this._tweakKeyOneHandler = null;
    }
    if (this._tweakKeyTwoHandler) {
      this.scene.input.keyboard?.off("keydown-TWO", this._tweakKeyTwoHandler);
      this._tweakKeyTwoHandler = null;
    }
    if (this._tweakKeyThreeHandler) {
      this.scene.input.keyboard?.off("keydown-THREE", this._tweakKeyThreeHandler);
      this._tweakKeyThreeHandler = null;
    }
    if (this._tweakKeyVHandler) {
      this.scene.input.keyboard?.off("keydown-V", this._tweakKeyVHandler);
      this._tweakKeyVHandler = null;
    }
    if ((this as any)._tweakKeyOHandler) {
      this.scene.input.keyboard?.off("keydown-O", (this as any)._tweakKeyOHandler);
      (this as any)._tweakKeyOHandler = null;
    }
    if ((this as any)._tweakKeyFiveHandler) {
      this.scene.input.keyboard?.off("keydown-FIVE", (this as any)._tweakKeyFiveHandler);
      (this as any)._tweakKeyFiveHandler = null;
    }
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
  }

  private updateTweakHUD(): void {
    if (!this._tweakHudText) return;
    if (this._metaMode === TweakMetaMode.NONE) {
      this._tweakHudText.setVisible(false);
      return;
    }
    const stripeLabel = ChampionSelectUiHandler.STRIPE_ASSET_LABELS[this._tweakAssetIndex];
    const modeName = stripeLabel || ChampionSelectUiHandler.TWEAK_MODES[this._tweakMode].toUpperCase();
    const assetName = ChampionSelectUiHandler.TWEAK_ASSETS[this._tweakAssetIndex];
    if (this._metaMode === TweakMetaMode.EDIT) {
      this._tweakHudText.setText(`EDIT MODE - ${modeName} - ${assetName}`);
      this._tweakHudText.setColor("#00FF00");
    } else if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
      this._tweakHudText.setText(`EDIT TYPE SELECT - ${modeName}`);
      this._tweakHudText.setColor("#FFD700");
    } else if (this._metaMode === TweakMetaMode.ELEMENT) {
      this._tweakHudText.setText(`ELEMENT SELECT - ${assetName}`);
      this._tweakHudText.setColor("#40C8F8");
    }
    this._tweakHudText.setVisible(true);
  }

  clear(): void {
    this._metaMode = TweakMetaMode.NONE;
    this.cleanupTweakKeyListeners();
    if (this._tweakHudText) {
      this._tweakHudText.setVisible(false);
    }
    this.cleanupChampionUnlockHoldToSkip();
    if (this.rootContainer) {
      this.scene.tweens.killTweensOf(this.rootContainer);
    }

    if (this.modalMessage) {
      this.modalMessage.clear();
    }
    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.destroy();
      this.modalBackgroundImage = null;
      this.modalBackgroundCreated = false;
    }
    if (this.modalDarkOverlay) {
      this.modalDarkOverlay.destroy();
      this.modalDarkOverlay = null;
    }
    if ((this as any)._portraitTileFrame) { (this as any)._portraitTileFrame.destroy(); (this as any)._portraitTileFrame = null; }
    if ((this as any)._portraitSilverGlow) { (this as any)._portraitSilverGlow.destroy(); (this as any)._portraitSilverGlow = null; }

    this.championSprites.forEach(s => s.destroy());
    this.championNameTexts.forEach(t => t.destroy());
    this.unlockStatusTexts.forEach(t => t.destroy());
    this.championSprites = [];
    this.championNameTexts = [];
    this.unlockStatusTexts = [];
    if (this.fullChampionSprite) { this.fullChampionSprite.destroy(); this.fullChampionSprite = null; }
    if (this.fullChampionTintSprite) { this.fullChampionTintSprite.destroy(); this.fullChampionTintSprite = null; }
    if (this.skillListPanelContainer) { this.skillListPanelContainer.setVisible(false); }
    this.skillItemContainers.forEach(c => { try { c.destroy(); } catch {} });
    this.skillItemContainers = [];
    this.skillItemBgs.forEach(g => { try { g.destroy(); } catch {} });
    this.skillItemBgs = [];
    this.skillIconSprites.forEach(s => { try { s.destroy(); } catch {} });
    this.skillIconSprites = [];
    this.skillIconBgs.forEach(g => { try { g.destroy(); } catch {} });
    this.skillIconBgs = [];
    this._tweakUnlockedSprites = [];
    this._tweakNextSprites = [];
    this._tweakFutureSprites = [];
    this._tweakFocusedGoldTile = null;
    this._tweakFocusedIconSprite = null;
    if (this._skillProgressStrip) { this._skillProgressStrip.destroy(); this._skillProgressStrip = null; }
    if (this._skillEmptyTrack) { this._skillEmptyTrack.destroy(); this._skillEmptyTrack = null; }
    if ((this as any)._futureBarStrip) { (this as any)._futureBarStrip.destroy(); (this as any)._futureBarStrip = null; }
    if (this._skillSurroundFill) { this._skillSurroundFill.destroy(); this._skillSurroundFill = null; }
    this.essenceListItems.forEach(i => { try { i.icon.destroy(); i.text.destroy(); } catch {} });
    this.essenceListItems = [];
    if (this.inputLockTimer) {
      this.inputLockTimer.remove(false);
      this.inputLockTimer = undefined;
    }
    if (this.footerBand) {
      this.footerBand.setVisible(false);
    }
    this.stopEssenceHold();
    this.stopHealingPulseSound();
    this.destroyRequirementHoverZone();
    super.clear();
  }

  private lockInput(duration: number): void {
    if (this.inputLockTimer) {
      this.inputLockTimer.remove(false);
    }
    this.inputLockTimer = this.scene.time.delayedCall(duration, () => {
      this.inputLockTimer = undefined;
    });
  }

  processInput(button: Button): boolean {
    if (this.isChampionUnlockCutsceneActive) {
      return true;
    }

    if (this.inputLockTimer) {
      return true;
    }

    this.updateEssenceButtonIcon();

    if (this.isLevelUpAnimationActive) {
      if (button === Button.SUBMIT || button === Button.ACTION || button === Button.CANCEL) {
        skipCurrentLevelUpAnimation();
      }
      return true;
    }

    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    const champ = this.championManager.getChampionData(selectedChampionId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(selectedChampionId);
    const primaryType: Type | undefined = (CHAMPION_DEFINITIONS[selectedChampionId]?.type1 as unknown as Type) || undefined;
    const def = CHAMPION_DEFINITIONS[selectedChampionId] as any;

    if (button === Button.CYCLE_ABILITY) {
      const wasActive = this._metaMode !== TweakMetaMode.NONE;
      this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
      const isActive = this._metaMode !== TweakMetaMode.NONE;
      this.updateTweakHUD();
      if (isActive && !wasActive) {
        (this.scene as BattleScene).uiEditModeActive = true;
        this.setupTweakKeyListeners();
        this._dropdownPanel = new TweakDropdownPanel({
          scene: this.scene as BattleScene,
          getAnchorGameCoords: () => {
            const canvas = (this.scene as BattleScene).game.canvas;
            const rect = canvas.getBoundingClientRect();
            return { x: rect.right - 120, y: rect.top + 10 };
          },
          coordSpace: "screen",
          elements: ChampionSelectUiHandler.TWEAK_ASSETS as unknown as string[],
          modes: ChampionSelectUiHandler.TWEAK_MODES as unknown as string[],
          alphabeticalSort: true,
          elementGroups: ChampionSelectUiHandler.TWEAK_ASSET_GROUPS,
          onElementChange: (_name, idx) => {
            this._tweakAssetIndex = idx;
            this.onTweakAssetSelected();
            this.updateTweakHUD();
          },
          onModeChange: (_name, idx) => {
            this._tweakMode = idx;
            this.updateTweakHUD();
          },
        });
        this._dropdownPanel.create();
        this._tweakBaselines.clear();
        for (let i = 0; i < ChampionSelectUiHandler.TWEAK_ASSETS.length; i++) {
          const t = this.getTweakTarget(i);
          if (t) {
            this._tweakBaselines.set(ChampionSelectUiHandler.TWEAK_ASSETS[i], {
              x: (t as any).x ?? 0, y: (t as any).y ?? 0,
              scaleX: (t as any).scaleX ?? 1, scaleY: (t as any).scaleY ?? 1,
              displayWidth: (t as any).displayWidth ?? 0, displayHeight: (t as any).displayHeight ?? 0,
              alpha: (t as any).alpha ?? 1,
              fontSize: parseInt((t as any).style?.fontSize || "0", 10),
              color: (t as any).style?.color || "",
              stroke: (t as any).style?.stroke || "",
              strokeThickness: (t as any).style?.strokeThickness ?? 0,
            });
          }
        }
        this._stripeBaselines.set(24, [this._stripeSpacing]);
        this._stripeBaselines.set(25, [this._stripeFontSize]);
        this._stripeBaselines.set(26, [this._stripeEssenceScale]);
        this._stripeBaselines.set(27, [this._stripeEssenceX, this._stripeEssenceY]);
        this._stripeBaselines.set(28, [this._stripeTypeScale]);
        this._stripeBaselines.set(29, [this._stripeTypeX, this._stripeTypeY]);
        this._stripeBaselines.set(30, [this._stripeBgWidth]);
        this._stripeBaselines.set(31, [this._stripeBgHeight]);
        this._stripeBaselines.set(32, [this._stripeBgAlpha]);
        this._stripeBaselines.set(33, [this._stripeBgScale]);
        this._stripeBaselines.set(34, [this._stripeDotFontSize]);
        this._stripeBaselines.set(35, [this._stripeDotX, this._stripeDotY]);
        this._stripeBaselines.set(36, [this._stripeSpecialLabelFontSize]);
        this._stripeBaselines.set(37, [this._stripeSpecialTypeScale]);
        this._stripeBaselines.set(39, [this._stripeSpecialX, this._stripeSpecialY]);
        this._stripeBaselines.set(40, [this._portraitMaskH]);
        this._stripeBaselines.set(41, [this._portraitMaskOffsetY]);
        this._stripeBaselines.set(42, [this._hintStripeFontSize]);
        this._stripeBaselines.set(43, [this._hintStripeBottomInset]);
        this._stripeBaselines.set(44, [this._hintStripeTextX, this._hintStripeTextY]);
        this._stripeBaselines.set(45, [this._stripeSpecialLabelX, this._stripeSpecialLabelY]);
        this._stripeBaselines.set(46, [this._tooltipWidth]);
        this._stripeBaselines.set(47, [this._tooltipHeightOffset]);
        this._stripeBaselines.set(48, [this._tooltipOffsetX, this._tooltipOffsetY]);
        this._stripeBaselines.set(49, [this._tooltipSpecialIconScale ?? (0.35 * (this._stripeSpecialTypeScale / this._stripeTypeScale))]);
        this._stripeBaselines.set(50, [this._tooltipSpecialLabelFontSize ?? Math.round(parseInt(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_COST_FONT_SIZE, 10) * (this._stripeSpecialLabelFontSize / this._stripeFontSize))]);
        this._stripeBaselines.set(51, [this._tooltipSpecialLabelX ?? 0, this._tooltipSpecialLabelY ?? 0]);
        this._stripeBaselines.set(52, [this._hintLoreAlpha]);
        this._stripeBaselines.set(59, [this._nextSkillCostContainer?.x ?? 0, this._nextSkillCostContainer?.y ?? 0, this._nextSkillCostBgW, this._nextSkillCostBgH, this._nextSkillCostBgAlpha, this._nextSkillCostIconScale, this._nextSkillCostFontSize]);
        this._stripeBaselines.set(60, [this._nextSkillCostIconScale]);
        this._stripeBaselines.set(61, [this._nextSkillCostFontSize]);
        this._stripeBaselines.set(64, [this._btnEssenceCostBgOffsetX, this._btnEssenceCostBgOffsetY, this._btnEssenceCostBgW, this._btnEssenceCostBgH, this._btnEssenceCostBgAlpha, this._btnEssenceCostIconScale, this._btnEssenceCostFontSize]);
        this._stripeBaselines.set(65, [this._btnEssenceCostIconScale]);
        this._stripeBaselines.set(66, [this._btnEssenceCostFontSize]);
        this._stripeBaselines.set(67, [this._btnEssenceCostContainer?.x ?? 0, this._btnEssenceCostContainer?.y ?? 0, this._btnEssenceCostBgAlpha, this._btnEssenceCostIconScale, this._btnEssenceCostFontSize]);
        this._stripeBaselines.set(68, [0, 0]);
        this._barAreaBaselines = [];
        const barGroupTargets68 = this.getTweakGroupTargets(68);
        for (const t of barGroupTargets68) {
          this._barAreaBaselines.push({
            x: (t as any).x ?? 0, y: (t as any).y ?? 0,
            scaleX: (t as any).scaleX ?? 1, scaleY: (t as any).scaleY ?? 1,
            displayWidth: (t as any).displayWidth ?? 0, displayHeight: (t as any).displayHeight ?? 0,
            alpha: (t as any).alpha ?? 1,
            fontSize: parseInt((t as any).style?.fontSize || "0", 10),
          });
        }
        this._stripeBaselines.set(69, [this._nextSkillCostGroupGap]);
        this._stripeBaselines.set(70, [this._btnEssenceCostGroupGap]);
      } else if (!isActive && wasActive) {
        (this.scene as BattleScene).uiEditModeActive = false;
        this.cleanupTweakKeyListeners();
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
        this._tweakBaselines.clear();
        this._stripeBaselines.clear();
        this._barAreaBaselines = [];
      }
      console.log(`[CS-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      return true;
    }

    if (this._metaMode !== TweakMetaMode.NONE) {
      return this.handleTweakInput(button);
    }

    switch (button) {
      case Button.RIGHT:
        this._isHoverTooltip = false;
        this.skillTooltipActive = true;
        if (this.updateSkillSelection(1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.LEFT:
        this._isHoverTooltip = false;
        this.skillTooltipActive = true;
        if (this.updateSkillSelection(-1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.UP:
        if (this.updateChampionSelection(-1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.DOWN:
        if (this.updateChampionSelection(1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.STATS:
        if (isUnlocked && this.canAffordLevelUp(selectedChampionId)) {
          const before = champ?.level || 1;
          if (!this.commitAllEssenceForLevel(selectedChampionId)) return false;
          this.onEssenceCommitted(selectedChampionId, before);
          try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        if (isUnlocked && !this.canAffordLevelUp(selectedChampionId)) {
          this._showRequirementMode = !this._showRequirementMode;
          if (this._showRequirementMode) {
            const btnWm = this.useEssenceButtonContainer!.getWorldTransformMatrix();
            const kbBtnImg = (this as any)._useEssenceBtnImg;
            const kbBtnHalfW = kbBtnImg ? (kbBtnImg.displayWidth * 6) / 2 : 40;
            this.showUnlockBtnTooltip(btnWm.tx + kbBtnHalfW, btnWm.ty);
          } else {
            this.hideUnlockBtnTooltip();
          }
          return true;
        }
        return false;
      case Button.CYCLE_GENDER:
        return false;
      case Button.ACTION:
      case Button.SUBMIT:
        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
          return true;
        }
        return this.confirmChampionSelection();
      case Button.TOGGLE_PLAYER_BAR:
        if (this.useEssenceButtonContainer?.visible) {
          this._showRequirementMode = !this._showRequirementMode;
          this.updateLevelUpButtonDisplay(selectedChampionId);
          return true;
        }
        return false;
      case Button.CANCEL:
        this.stopEssenceHold();
        if (this._showRequirementMode) {
          this._showRequirementMode = false;
          ModifierTooltipUtils.hideIfNotPinned(this.scene);
          return true;
        }
        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
          return true;
        }
        try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
        if (this.config?.onCancel) {
          try { this.config.onCancel(); } catch {}
        }
        return true;
    }
    return false;
  }

  private loadChampionData(): void {
    const definitions = initializeChampionDefinitions();
    const allChampionIds = Object.keys(definitions)
      .map(k => definitions[k]?.id)
      .filter(Boolean) as string[];
    for (const cid of allChampionIds) {
      this.championManager.tryAutoUnlockChampion(cid);
    }

    if (this.config?.preSelectedChampion) {
      const pre = this.config.preSelectedChampion;
      const matched = allChampionIds.find(id => {
        if (id === pre) return true;
        const resolved = this.resolveChampionId(id);
        if (resolved === pre) return true;
        if (id === "apollo_diana" && (pre === "apollo" || pre === "diana")) return true;
        return false;
      });
      this.availableChampions = matched ? [matched] : [pre];
    } else {
      this.availableChampions = allChampionIds;
    }

    if (this.availableChampions.length === 0) {
      this.availableChampions = ["apollo_diana"];
    }
    this.selectedChampionIndex = 0;
    try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
  }

  private displayChampionGrid(): void {
    this.championSprites.forEach(s => s.destroy());
    this.championNameTexts.forEach(t => t.destroy());
    this.unlockStatusTexts.forEach(t => t.destroy());
    this.gridXpContainers.forEach(c => c.destroy());
    this.gridXpBarBgs.forEach(g => g.destroy());
    this.gridXpBarFills.forEach(g => g.destroy());
    this.gridLevelLabels.forEach(t => t.destroy());
    this.gridCellBackgrounds.forEach(g => g.destroy());
    if (this.gridBordersGraphics) { this.gridBordersGraphics.destroy(); this.gridBordersGraphics = null; }
    this.championSprites = [];
    this.championNameTexts = [];
    this.unlockStatusTexts = [];
    this.gridXpContainers = [];
    this.gridXpBarBgs = [];
    this.gridXpBarFills = [];
    this.gridLevelLabels = [];
    this.gridCellBackgrounds = [];

    this.availableChampions.forEach((championId, index) => {
      const col = index % ChampionSelectUiHandler.UI_CONSTANTS.GRID.COLS;
      const row = Math.floor(index / ChampionSelectUiHandler.UI_CONSTANTS.GRID.COLS);
      const x = ChampionSelectUiHandler.UI_CONSTANTS.GRID.START_X + (col * ChampionSelectUiHandler.UI_CONSTANTS.GRID.SPACING_X);
      const baseY = ChampionSelectUiHandler.UI_CONSTANTS.GRID.START_Y + (row * ChampionSelectUiHandler.UI_CONSTANTS.GRID.ROW_GAP);
      const gridOffset = this.getGridYOffsetForChampion(championId);
      const y = baseY;
      const spriteY = baseY + (typeof gridOffset === "number" ? gridOffset : 0);
      const cellBg = this.scene.add.graphics();
      this.gridCellBackgrounds.push(cellBg);
      this.gridContainer.add(cellBg);

      const cellSize = ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_SIZE;
      cellBg.fillStyle(0x222222, 0.6);
      cellBg.fillRect(x - cellSize / 2, y - cellSize / 2, cellSize, cellSize);

      const spriteKey = this.getChampionTrainerSpriteKey(championId);
      const sprite = this.scene.add.sprite(x, spriteY, spriteKey);
      try {
        const tex = sprite.texture;
        const frameNames = tex.getFrameNames();
        if (frameNames.length > 1 && frameNames.includes("0001.png")) {
          sprite.setFrame("0001.png");
        }
      } catch {}
      const gridScale = this.getGridScaleForChampion(championId);
      sprite.setScale(gridScale);
      this.championSprites.push(sprite);
      this.gridContainer.add(sprite);
      const isUnlocked = this.championManager.isChampionUnlocked(championId) || (this.championManager.getChampionData(championId)?.isUnlocked === true);
      if (!isUnlocked) {
        this.applyLockedSpriteEffect(sprite, true);
      } else {
        sprite.clearTint();
        sprite.setAlpha(1.0);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      }

      this.createGridXpGauge(championId, x, y, isUnlocked);
    });
  }
  private updateGridXpGauge(championId: string): void {
    const index = this.availableChampions.findIndex(id => id === championId);
    if (index === -1 || index >= this.gridXpContainers.length) return;

    const { current, required, level, isUnlocked } = this.getUnifiedEssenceProgressForChampion(championId);
    const pct = Math.max(0, Math.min(1, required > 0 ? current / required : 0));

    const barFill = this.gridXpBarFills[index];
    const levelLabel = this.gridLevelLabels[index];
    const statusText = this.unlockStatusTexts[index];

    if (barFill) {
      barFill.clear();
      const fillColor = 0xFFD700;
      barFill.fillStyle(fillColor, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_FILL_ALPHA);
      const barX = -ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH / 2;
      const barY = ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_Y;
      const fillWidth = Math.floor(ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH * pct);
      if (fillWidth > 0) {
        barFill.fillRect(barX, barY, fillWidth, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_HEIGHT);
      }
    }

    if (levelLabel) {
      const labelText = isUnlocked ? `Lv ${level}` : "LOCKED";
      levelLabel.setText(labelText);
    }

    if (statusText) {

      let displayCurrent = current;
      const isSelected = (this.availableChampions[this.selectedChampionIndex] === championId);
      if (isSelected && this.xpLabelTicker) {

        displayCurrent = Math.max(0, Math.min(required, Math.floor(this.visualCurrentEssence)));
      }
      statusText.setText(`${displayCurrent} / ${required}`);
    }
  }

  private createGridXpGauge(championId: string, x: number, y: number, isUnlocked: boolean): void {
    const { current, required, level } = this.getUnifiedEssenceProgressForChampion(championId);
    const pct = Math.max(0, Math.min(1, required > 0 ? current / required : 0));
    const xpContainer = this.scene.add.container(x, y + ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_CONTAINER_Y);
    this.gridXpContainers.push(xpContainer);
    this.gridContainer.add(xpContainer);
    const labelText = isUnlocked ? `Lv ${level}` : "LOCKED";
    const levelLabel = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.GRID.LEVEL_LABEL_Y,
      labelText, TextStyle.WINDOW, {
        fontSize: ChampionSelectUiHandler.UI_CONSTANTS.GRID.LEVEL_LABEL_SIZE,
        align: "center"
      });
    levelLabel.setOrigin(0.5);
    this.gridLevelLabels.push(levelLabel);
    xpContainer.add(levelLabel);
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x000000, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_BG_ALPHA);
    const barX = -ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH / 2;
    const barY = ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_Y;
    barBg.fillRect(barX, barY, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_HEIGHT);
    barBg.lineStyle(1, 0xffffff, 0.6);
    barBg.strokeRect(barX, barY, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_HEIGHT);
    this.gridXpBarBgs.push(barBg);
    xpContainer.add(barBg);
    const barFill = this.scene.add.graphics();
    const fillColor = 0xFFD700;
    barFill.fillStyle(fillColor, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_FILL_ALPHA);
    const fillWidth = Math.floor(ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_WIDTH * pct);
    if (fillWidth > 0) {
      barFill.fillRect(barX, barY, fillWidth, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_BAR_HEIGHT);
    }
    this.gridXpBarFills.push(barFill);
    xpContainer.add(barFill);
    const textContainer = this.scene.add.container(0, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_Y);

    const xpText = addTextObject(this.scene, 0, 0,
      `${current} / ${required}`, TextStyle.WINDOW, {
        fontSize: ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_SIZE,
        align: "center"
      });
    xpText.setOrigin(0.5);
    xpText.setAlpha(1.0);
    const textBg = this.scene.add.graphics();

    const bgWidth = xpText.displayWidth + (ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_BG_PADDING * 2);
    const bgHeight = Math.max(1, xpText.displayHeight + (ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_BG_PADDING * 2) - ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_BG_HEIGHT_REDUCTION);
    textBg.fillStyle(ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_BG_COLOR, ChampionSelectUiHandler.UI_CONSTANTS.GRID.XP_TEXT_BG_ALPHA);
    textBg.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);

    textContainer.add(textBg);
    textContainer.add(xpText);
    this.unlockStatusTexts.push(xpText);
    xpContainer.add(textContainer);
  }

  private resolveChampionId(championId: string): string {
    if (championId === "apollo_diana") {
      const isFemale = (this.scene as BattleScene).gameData.gender === PlayerGender.FEMALE;
      return isFemale ? "diana" : "apollo";
    }
    return championId;
  }

  private getChampionDescription(championId: string): string {
    const resolvedId = this.resolveChampionId(championId);

    if (resolvedId === "apollo" || resolvedId === "diana") {
      return i18next.t(`championSelect:${resolvedId}.description`);
    }

    switch (resolvedId) {
      case "brock": return i18next.t("championSelect:brock.description", { defaultValue: "A rock-solid leader." });
      case "misty": return i18next.t("championSelect:misty.description", { defaultValue: "The tomboyish mermaid." });
      case "red": return i18next.t("championSelect:red.description", { defaultValue: "The legendary trainer who conquered all." });
      default: return "";
    }
  }

  private getChampionTrainerSpriteKey(championId: string): string {
    try {
      const key = ChampionUtils.getChampionSpriteKey(championId, (this.scene as BattleScene).gameData.gender);
      if (this.scene.textures.exists(key)) return key;
      const def = CHAMPION_DEFINITIONS[championId];
      const trainerType = (def?.trainerType as unknown as TrainerType) ?? TrainerType.RIVAL;
      const cfg = trainerConfigs[trainerType];
      const isFemale = ((this.scene as BattleScene).gameData.gender === PlayerGender.FEMALE);
      const fb = cfg ? cfg.getSpriteKey(isFemale, false) : (isFemale ? "player_f" : "player_m");
      return this.scene.textures.exists(fb) ? fb : (isFemale ? "player_f" : "player_m");
    } catch {
      const def = CHAMPION_DEFINITIONS[championId];
      const trainerType = (def?.trainerType as unknown as TrainerType) ?? TrainerType.RIVAL;
      const cfg = trainerConfigs[trainerType];
      const isFemale = ((this.scene as BattleScene).gameData.gender === PlayerGender.FEMALE);
      const fb = cfg ? cfg.getSpriteKey(isFemale, false) : (isFemale ? "player_f" : "player_m");
      return this.scene.textures.exists(fb) ? fb : (isFemale ? "player_f" : "player_m");
    }
  }
  private updateChampionInfo(): void {
    this.selectedSkillIndex = -1;
    this.skillScrollOffset = 0;
    this.skillBarScrollOffset = 0;
    this._suppressSkillBarAutoPan = false;
    this._showRequirementMode = false;
    this.knownSkillsCollapsed = true;
    this.skillTooltipActive = false;
    this._hoverSkillIndex = -1;
    this._isHoverTooltip = false;
    this.skillTooltipContainer?.setVisible(false);
    this.stopEssenceHold();

    this.visualCurrentEssence = 0;

    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];

    const resolvedId = this.resolveChampionId(selectedChampionId);

    const isUnlocked = this.championManager.isChampionUnlocked(selectedChampionId) || (this.championManager.getChampionData(selectedChampionId)?.isUnlocked === true);

    const name = isUnlocked ? ChampionUtils.getChampionDisplayName(resolvedId) : "???";
    const description = isUnlocked ? this.getChampionDescription(selectedChampionId) : "";

    if ((this as any)._previewName) {
      (this as any)._previewName.setText(name.toUpperCase());
    }

    if ((this as any)._previewSubtitle) {
      (this as any)._previewSubtitle.setText(description ? description.toUpperCase() : "");
    }

    this.displayFullChampionSprite(selectedChampionId);
    this.updateTypeIcons(selectedChampionId);

    this.updateTitleForChampion(selectedChampionId);

    this.updateEssenceGauge(selectedChampionId, false);

    const { current } = this.getUnifiedEssenceProgressForChampion(selectedChampionId);
    this.visualCurrentEssence = current;

    this.updateLevelUpButton(selectedChampionId);
    this.updateNextSkillCostDisplay(selectedChampionId);
    this.renderSkillsPanel(selectedChampionId);
    this.renderSkillList(selectedChampionId);
    this.updateInlineEssenceCounters(selectedChampionId);
    this.updateProgressBarFill(selectedChampionId);
  }

  private renderSkillsPanel(championId: string): void {
    if (!this.skillsContainer) return;
    if (!this.unlocksContainer) {
      this.unlocksContainer = this.scene.add.container(0, 0);
      this.skillsContainer.add(this.unlocksContainer);
    }

    this.unlocksContainer.removeAll(true);
    this.unlocksContainer.setVisible(false);
    this.skillTextLines.forEach(t => t.destroy());
    this.skillTextLines = [];
  }

  private renderSkillIconBar(championId: string): void {
    if (!this.skillIconBarContainer) return;
    if (this._tweakActive) return;

    this.skillIconSprites.forEach(s => s.destroy());
    this.skillIconBgs.forEach(g => g.destroy());
    this.skillIconSprites = [];
    this.skillIconBgs = [];
    this._tweakUnlockedSprites = [];
    this._tweakNextSprites = [];
    this._tweakFutureSprites = [];
    this._tweakFocusedGoldTile = null;
    this._tweakFocusedIconSprite = null;
    if (this._skillProgressStrip) { this._skillProgressStrip.destroy(); this._skillProgressStrip = null; }
    if (this._skillEmptyTrack) { this._skillEmptyTrack.destroy(); this._skillEmptyTrack = null; }
    if ((this as any)._futureBarStrip) { (this as any)._futureBarStrip.destroy(); (this as any)._futureBarStrip = null; }
    if (this._skillSurroundFill) { this._skillSurroundFill.destroy(); this._skillSurroundFill = null; }

    const resolvedId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[resolvedId] as any;
    const data = this.championManager.getChampionData(championId);
    const championUnlocked = this.championManager.isChampionUnlocked(def?.id) || (data?.isUnlocked === true);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;
    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    const isUnlockedCheck = (skillId: string, s: any) =>
      !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const currentLevel = data?.level ?? 1;

    const defaultUnlocked = championUnlocked ? this.generateDefaultUnlockedSkills(def, data) : [];
    const unlockedFromLocked = allSkills.filter(([sid, s]) => isUnlockedCheck(sid, s));
    const allUnlockedEntries: Array<[string, any]> = [...defaultUnlocked, ...unlockedFromLocked];
    const seenIds = new Set<string>();
    const unlockedFromAll: Array<{ idx: number; skillId: string; skillDef: any }> = [];
    allUnlockedEntries.forEach(([skillId, skillDef], i) => {
      if (!seenIds.has(skillId)) {
        seenIds.add(skillId);
        unlockedFromAll.push({ idx: i, skillId, skillDef });
      }
    });
    unlockedFromAll.sort((a, b) => ((a.skillDef as any)?.unlockLevel ?? 0) - ((b.skillDef as any)?.unlockLevel ?? 0));
    const next: Array<{ idx: number; skillId: string; skillDef: any }> = [];
    const future: Array<{ idx: number; skillId: string; skillDef: any }> = [];
    const unlockedIds = new Set(unlockedFromAll.map(u => u.skillId));
    let nextAssigned = false;

    skills.forEach(([skillId, skillDef], i) => {
      if (unlockedIds.has(skillId)) return;
      const isUnlck = isUnlockedCheck(skillId, skillDef);
      if (isUnlck) return;
      const unlockLevel = (skillDef as any)?.unlockLevel ?? 0;
      const isNxt = !isUnlck && (unlockLevel === currentLevel + 1 || currentLevel >= unlockLevel);
      if (isNxt && !nextAssigned) {
        nextAssigned = true;
        next.push({ idx: i + unlockedFromAll.length, skillId, skillDef });
      } else {
        future.push({ idx: i + unlockedFromAll.length, skillId, skillDef });
      }
    });

    if (next.length === 0 && future.length > 0) {
      next.push(future.shift()!);
    }

    this._barNextSkillId = next.length > 0 ? next[0].skillId : null;

    type BarEntry = { idx: number; skillId: string; skillDef: any; zone: "unlocked" | "next" | "future" };
    const barOrder: BarEntry[] = [];
    unlockedFromAll.forEach(({ idx, skillId, skillDef }) => {
      barOrder.push({ idx, skillId, skillDef, zone: "unlocked" });
    });
    next.forEach(entry => barOrder.push({ ...entry, zone: "next" }));
    future.forEach(entry => barOrder.push({ ...entry, zone: "future" }));

    const baseSize = 24;
    const unlockedScale = 0.486;
    const futureScale = 0.435;
    const focusedScale = 0.792;
    const spacing = 6;
    const MAX_SKILL_BAR_SLOTS = 4;
    const gaugeBarH = (baseSize + 4) * 2;
    const barInset = 4;

    const vpW = this.getWidth();
    const previewTileW = 80;
    const championRightEdge = this.previewContainer.x
      + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X
      + previewTileW / 2;
    const trackStartX = -vpW / 2 + championRightEdge - 10;
    const trackEndX = vpW / 2;
    const trackWidth = trackEndX - trackStartX;

    const minSlotWidth = baseSize + spacing;
    const nextOverflow = 0;
    const naturalCapacity = Math.max(1, Math.floor((trackWidth - nextOverflow) / minSlotWidth));
    const totalCapacity = Math.min(MAX_SKILL_BAR_SLOTS, naturalCapacity);
    const slotWidth = totalCapacity > 0 ? (trackWidth - nextOverflow) / totalCapacity : minSlotWidth;
    const maxBarOffset = Math.max(0, barOrder.length - totalCapacity);

    if (this.skillBarScrollOffset > maxBarOffset) {
      this.skillBarScrollOffset = maxBarOffset;
    }
    if (this.skillBarScrollOffset < 0) {
      this.skillBarScrollOffset = 0;
    }

    const selectedSkillId = this.selectedSkillIndex >= 0 && this.selectedSkillIndex < skills.length
      ? skills[this.selectedSkillIndex]?.[0] : null;
    let selectedBarIndex = -1;
    if (selectedSkillId) {
      selectedBarIndex = barOrder.findIndex(e => e.skillId === selectedSkillId);
      if (selectedBarIndex >= 0) {
        if (selectedBarIndex < this.skillBarScrollOffset) {
          this.skillBarScrollOffset = selectedBarIndex;
        } else if (selectedBarIndex >= this.skillBarScrollOffset + totalCapacity) {
          this.skillBarScrollOffset = selectedBarIndex - totalCapacity + 1;
        }
      }
    }

    let viewportSlice = barOrder.slice(this.skillBarScrollOffset, this.skillBarScrollOffset + totalCapacity);
    let unlockedInViewport = viewportSlice.filter(e => e.zone === "unlocked").length;
    let hasNextInViewport = viewportSlice.some(e => e.zone === "next");
    const hasNextInBar = barOrder.some(e => e.zone === "next");
    while (
      !this._suppressSkillBarAutoPan &&
      totalCapacity > 0 &&
      hasNextInBar &&
      !hasNextInViewport &&
      unlockedInViewport / totalCapacity >= 0.9 &&
      this.skillBarScrollOffset + totalCapacity < barOrder.length
    ) {
      this.skillBarScrollOffset = Math.min(
        maxBarOffset,
        this.skillBarScrollOffset + Math.max(1, Math.floor(totalCapacity * 0.5))
      );
      viewportSlice = barOrder.slice(this.skillBarScrollOffset, this.skillBarScrollOffset + totalCapacity);
      unlockedInViewport = viewportSlice.filter(e => e.zone === "unlocked").length;
      hasNextInViewport = viewportSlice.some(e => e.zone === "next");
    }

    const unlocked = viewportSlice.filter(e => e.zone === "unlocked");
    const visibleNext = viewportSlice.filter(e => e.zone === "next");
    const visibleFuture = viewportSlice.filter(e => e.zone === "future");

    const totalSkillCount = unlocked.length + visibleNext.length + visibleFuture.length;
    const lastVisibleBarIndex = this.skillBarScrollOffset + viewportSlice.length - 1;

    let focusedIconX = 0;
    let focusedIconY = 0;
    const addTileIcon = (x: number, y: number, size: number, skillDef: any, zone: string, tileSkillId: string, futureIndexAfterNext: number = -1) => {
      const isFocused = !!(selectedSkillId && tileSkillId === selectedSkillId);
      if (isFocused) {
        const focTileHalfW = 23;
        if (selectedBarIndex === lastVisibleBarIndex) {
          x = Math.min(x, trackEndX - focTileHalfW);
        }
        focusedIconX = x;
        focusedIconY = y + 1;
      }
      if (isFocused) {
        const tileKey = "newchampion_silver_focus_tilex";
        const tileW = 46;
        const tileH = 45;
        const focTileOffsetX = -1;
        try {
          const tile = this.scene.add.nineslice(x + focTileOffsetX, y + 2, tileKey, undefined, tileW, tileH, 5, 5, 5, 5);
          tile.setOrigin(0.5, 0.5);
          tile.setAlpha(1.0);
          tile.setTint(0xC8D0D8);
          this._tweakFocusedGoldTile = tile;
          if (tile.postFX && typeof tile.postFX.addGlow === "function") {
            tile.postFX.addGlow(0xffffff, 6, 0, false, 0.20, 14);
          }
          this.skillIconBarContainer!.add(tile);
          this.skillIconBgs.push(tile as any);
        } catch {
          const bg = this.scene.add.graphics();
          bg.fillStyle(0x665200, 0.8);
          bg.fillRoundedRect(x - tileW / 2, y - tileH / 2, tileW, tileH, 3);
          this.skillIconBarContainer!.add(bg);
          this.skillIconBgs.push(bg);
        }
      }

      const rewardType = (skillDef as any)?.rewardType;
      const isFarFutureMystery = zone === "future" && futureIndexAfterNext >= 2;
      const iconCfg = isFarFutureMystery
        ? { key: "smitems", frame: "permaMoreRewardChoice", scale: 1.0 }
        : (rewardType !== undefined ? this.getSkillIconConfig(rewardType, skillDef, championId) : { key: "smitems", frame: "permaMoreRevive", scale: 1.0 });
      const icon = iconCfg.frame
        ? this.scene.add.sprite(x, y, iconCfg.key, iconCfg.frame as any)
        : this.scene.add.sprite(x, y, iconCfg.key);
      const glitchScaleMul = (rewardType === SkillTreeRewardType.GLITCH_FORM_UNLOCK && iconCfg.scale >= 2.0) ? 0.65 : 1.0;
      const iconBaseScale = (iconCfg.scale >= 2.0 ? 1.05 : 0.5) * (size / 20) * glitchScaleMul;
      icon.setOrigin(0.5, 0.5);

      if (isFarFutureMystery) {
        if (isFocused) {
          icon.clearTint();
          icon.setAlpha(1.0);
          icon.setPosition(x - 1, y + 1);
          icon.setScale(iconBaseScale * focusedScale);
          this._tweakFocusedIconSprite = icon;
        } else {
          icon.setTint(0x888888);
          icon.setAlpha(1.0);
          icon.setPosition(x - 4, y + 3);
          icon.setScale(iconBaseScale * futureScale);
        }
      } else if ((zone === "future" || zone === "next") && !isFocused) {
        icon.setAlpha(0.5);
        icon.setPosition(x - 4, y + 3);
        icon.setScale(iconBaseScale * futureScale);
      } else if (isFocused) {
        icon.clearTint();
        icon.setAlpha(1.0);
        icon.setPosition(x - 1, y + 1);
        icon.setScale(iconBaseScale * focusedScale);
        this._tweakFocusedIconSprite = icon;
      } else {
        icon.clearTint();
        icon.setAlpha(1.0);
        icon.setPosition(x - 9, y + 4);
        icon.setScale(Math.max(0.01, iconBaseScale * unlockedScale - 0.120));
      }

      if ((iconCfg as any).inverted) {
        try {
          if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
            icon.postFX.clear();
            icon.postFX.addColorMatrix().negative();
          }
        } catch {}
      }

      this.skillIconBarContainer!.add(icon);
      this.skillIconSprites.push(icon);
      if (zone === "unlocked") {
        this._tweakUnlockedSprites.push(icon);
      } else if (zone === "next") {
        this._tweakNextSprites.push(icon);
      } else if (zone === "future") {
        this._tweakFutureSprites.push(icon);
      }

      const skillIdx = skills.findIndex(([sid]) => sid === tileSkillId);
      if (skillIdx >= 0) {
        icon.setData("skillIndex", skillIdx);
        icon.setInteractive();
        icon.on("pointerover", () => {
          if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
          this._hoveredIconBarX = icon.x;
          this._hoveredIconBarY = icon.y + 1;
          this._isHoverTooltip = true;
          this._hoverSkillIndex = skillIdx;
          this.skillTooltipActive = true;
          this._suppressSkillBarAutoPan = true;
          this.updateSkillTooltipForHover(championId, skillIdx);
        });
        icon.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if ((this.scene as BattleScene).ui.getMode() !== Mode.CHAMPION_SELECT) return;
          if (pointer.button !== 0) return;
          if (this.isLevelUpAnimationActive || this.isChampionUnlockCutsceneActive) return;
          this._isHoverTooltip = false;
          this._hoverSkillIndex = -1;
          this.selectedSkillIndex = skillIdx;
          this.skillTooltipActive = true;
          this.renderSkillList(championId);
        });
        icon.on("pointerout", () => {
          this._isHoverTooltip = false;
          this._hoverSkillIndex = -1;
          this.skillTooltipActive = false;
          if (this.skillTooltipContainer) {
            this.skillTooltipContainer.setVisible(false);
          }
        });
      }
    };

    let cursor = trackStartX;

    const unlockedAreaEnd = trackStartX + unlocked.length * slotWidth;
    const whiteBarEnd = unlockedAreaEnd;
    const futureBarStart = unlockedAreaEnd;
    const futureBarEnd = trackEndX;
    const showFutureBar = (visibleNext.length + visibleFuture.length) > 0 && futureBarEnd > futureBarStart;

    const fullTrackW = trackEndX - trackStartX;
    const barH = gaugeBarH;
    const barPad = 4;

    if (fullTrackW > 0) {
      try {
        const surroundFill = this.scene.add.nineslice(
          trackStartX - barPad, 4,
          "newchampion_surrounding_fill_bg", undefined,
          Math.max(1, Math.round(fullTrackW + barPad * 2)), Math.round(barH * 0.6), barInset, barInset, barInset, barInset
        );
        surroundFill.setOrigin(0, 0.5);
        surroundFill.setAlpha(0.54);
        this.skillIconBarContainer!.add(surroundFill);
        this.skillIconBgs.push(surroundFill as any);
        this._skillSurroundFill = surroundFill;
      } catch {}
    }

    const whiteBarW = (showFutureBar ? whiteBarEnd : trackEndX) - trackStartX;
    if (whiteBarW > 0) {
      try {
        const emptyTrack = this.scene.add.nineslice(
          trackStartX - barPad + 3, 4,
          "newchampion_empty_fillX", undefined,
          Math.max(1, Math.round(whiteBarW + barPad * 2)), Math.round(barH * 0.35), barInset, barInset, barInset, barInset
        );
        emptyTrack.setOrigin(0, 0.5);
        this.skillIconBarContainer!.add(emptyTrack);
        this.skillIconBgs.push(emptyTrack as any);
        this._skillEmptyTrack = emptyTrack;
      } catch {}
    }

    if (unlocked.length > 0) {
      try {
        const progressW = unlockedAreaEnd - trackStartX;
        const pCount = unlocked.length;
        const pDeltaX = pCount <= 2 ? -15 : (pCount === 3 ? -23 : -40);
        const pDeltaW = pCount <= 2 ? 0 : (pCount === 3 ? 16 : 80);
        const progressStrip = this.scene.add.nineslice(
          trackStartX - barPad + pDeltaX, 4 + 2,
          "newchampion_progress_fill", undefined,
          Math.max(1, Math.round(progressW + barPad * 2 + pDeltaW)), Math.round(barH * 0.85), barInset, barInset, barInset, barInset
        );
        progressStrip.setOrigin(0, 0.5);
        progressStrip.setAlpha(1.0);
        this.skillIconBarContainer!.add(progressStrip);
        this.skillIconBgs.push(progressStrip as any);
        this._skillProgressStrip = progressStrip;
      } catch {}
    }

    if (showFutureBar) {
      const futureBarW = futureBarEnd - futureBarStart;
      try {
        const strip = this.scene.add.nineslice(
          futureBarStart + (unlocked.length > 0 ? 7 : 0), 4,
          "newchampion_future_unlocks_bg_barX", undefined,
          Math.max(1, Math.round(futureBarW + barPad)), Math.round(barH * 0.55), barInset, barInset, barInset, barInset
        );
        strip.setOrigin(0, 0.5);
        strip.setAlpha(0.6);
        this.skillIconBarContainer!.add(strip);
        this.skillIconBgs.push(strip as any);
        (this as any)._futureBarStrip = strip;
      } catch {}
    }

    unlocked.forEach(({ skillId: sid, skillDef }) => {
      const x = cursor + slotWidth / 2;
      addTileIcon(x, 0, baseSize, skillDef, "unlocked", sid);
      cursor += slotWidth;
    });

    let nextSkillX = 0;
    visibleNext.forEach(({ skillId: sid, skillDef }) => {
      const x = cursor + slotWidth / 2;
      nextSkillX = x;
      addTileIcon(x, 0, baseSize, skillDef, "next", sid);
      cursor += slotWidth;
    });

    if (this.nextSkillLabel && next.length > 0 && visibleNext.length > 0) {
      this._lastNextSkillX = nextSkillX;
      const isNextFocused = !!(selectedSkillId && visibleNext.some(e => e.skillId === selectedSkillId));
      const futureIconH = Math.round(baseSize * futureScale);
      const nlX = this.skillIconBarContainer!.x + nextSkillX - 5 + (isNextFocused ? 4 : 1);
      const nlY = this.skillIconBarContainer!.y + 3 - futureIconH - 10 - 5 + (isNextFocused ? 1 : 9);
      this.nextSkillLabel.setPosition(nlX, nlY);
      this.nextSkillLabel.setOrigin(0.5, 1);
      this.nextSkillLabel.setVisible(true);
    } else if (this.nextSkillLabel) {
      this.nextSkillLabel.setVisible(false);
      this._lastNextSkillX = 0;
    }

    visibleFuture.forEach(({ skillId: sid, skillDef }) => {
      const x = cursor + slotWidth / 2;
      const futureIdx = future.findIndex(e => e.skillId === sid);
      addTileIcon(x, 0, baseSize, skillDef, "future", sid, futureIdx);
      cursor += slotWidth;
    });

    (this as any)._focusedIconBarX = focusedIconX;
    (this as any)._focusedIconBarY = focusedIconY;
    this._suppressSkillBarAutoPan = false;
    this.updateNextSkillCostDisplay(championId);
  }

  private isSkillDefaultUnlocked(def: any, skill: any): boolean {
    if (!def || !skill) return false;
    const id = skill.unlockableId;
    if (id === undefined) return false;

    switch (skill.rewardType) {
      case SkillTreeRewardType.TM_FILTERED:
        return def.unlockedTMs?.includes(id);
      case SkillTreeRewardType.XM_FILTERED:
        return def.unlockedXMs?.includes(id);
      case SkillTreeRewardType.ABILITY_GRANT:
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        return def.unlockedAbilities?.includes(id);
      case SkillTreeRewardType.SMITTY_ABILITY:
        return def.unlockedSmittyAbilities?.includes(id);
      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        return def.unlockedConditionalAbilities?.includes(id);
      case SkillTreeRewardType.MEGA_STONE:
        return def.unlockedMegaStones?.includes(id);
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
        return def.unlockedGlitchForms?.some((form: string) =>
          def.glitchFormUnlockableIds?.[form] === id || form === id
        );
      case SkillTreeRewardType.PERMA_ITEM:
        return def.unlockedPermaItems?.includes(id);
      case SkillTreeRewardType.STAT_BOOST:
        return def.unlockedStatBoosts?.includes(id);
      case SkillTreeRewardType.POKEMON_ALT_BUILD:
        return def.unlockedAltBuilds?.includes(id);
      case SkillTreeRewardType.EGG_VOUCHER:
        return def.unlockedVoucherTiers?.includes(id);
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
        return def.unlockedSpecificPermaModifiers?.includes(id);
      case SkillTreeRewardType.MOVE_UPGRADE:
        return def.unlockedMoveUpgrades?.includes(id);
      case SkillTreeRewardType.TYPE_SWITCHER:
        return def.unlockedTypeSwitchers?.includes(id);
      case SkillTreeRewardType.ESSENCE_BUNDLE:
        return def.unlockedEssenceBundles?.includes(id);
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
        return def.unlockedTypeBoosters?.includes(id);
      case SkillTreeRewardType.TERA_ABILITY:
        return def.unlockedTeraTypes?.includes(id);
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
        return def.unlockedBallRaritySelect?.rogue === true;
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
        return def.unlockedBallRaritySelect?.master === true;
      case SkillTreeRewardType.MONEY_REWARD:
        return def.unlockedMoneyReward === true;
      case SkillTreeRewardType.PERMA_MONEY:
        return def.unlockedPermaMoney === true;
      default:
        return false;
    }
  }

  private generateDefaultUnlockedSkills(def: any, data?: any): Array<[string, any]> {
    const skills: Array<[string, any]> = [];
    if (!def) return skills;

    const nodeGen = new SkillTreeNodeGenerator(0, def.id, this.scene as BattleScene, true);
    const getTypeName = (t: Type) => {
      if (t === Type.UNKNOWN) return "???";
      return i18next.t(`pokemonInfo:Type.${Type[t]}`);
    };
    const pushSkill = (type: SkillTreeRewardType, id: string, data: any = {}, label?: string) => {
        skills.push([id, {
            rewardType: type,
            unlockLevel: 0,
            isDefault: true,
            data: data,
            customLabel: label
        }]);
    };
    const typesList = [def.type1, def.type2].filter((t: any) => t !== undefined);
    const typesLabel = this.isRandomTypeChampion(def.id)
      ? this.getPreviewTypesLabel()
      : typesList.map(t => getTypeName(t)).join(" / ");
    const hasTypes = typesList.length > 0;

    if (def.unlockedTMs?.length) {
        def.unlockedTMs.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.TM_FILTERED, `def_tm_${i}`, { moveId: id }));
    } else if (hasTypes) {
        pushSkill(SkillTreeRewardType.TM_FILTERED, `def_tm_gen`, { types: typesList }, i18next.t("championSelect:defaultSkillLabels.tms", { types: typesLabel }));
    }

    if (def.unlockedXMs?.length) {
        def.unlockedXMs.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.XM_FILTERED, `def_xm_${i}`, { moveId: id }));
    } else if (hasTypes) {
        pushSkill(SkillTreeRewardType.XM_FILTERED, `def_xm_gen`, { types: typesList }, i18next.t("championSelect:defaultSkillLabels.xms", { types: typesLabel }));
    }

    if (hasTypes) {
      pushSkill(SkillTreeRewardType.ABILITY_GRANT, `def_ability_gen`, {}, i18next.t("championSelect:defaultSkillLabels.abilities", { types: typesLabel }));
    }

    def.unlockedAbilities?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.PASSIVE_ABILITY_GRANT, `def_pass_${i}`, { abilityId: id }));
    def.unlockedSmittyAbilities?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.SMITTY_ABILITY, `def_smit_${i}`, { abilityId: id }));
    def.unlockedConditionalAbilities?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.TRAINER_BOND_ABILITY, `def_bond_${i}`, { abilityId: id }));
    if (hasTypes && def.unlockedConditionalAbilities?.length) {
      pushSkill(SkillTreeRewardType.TERA_ABILITY, `def_tera`, {}, i18next.t("championSelect:defaultSkillLabels.teraAbilities", { types: typesLabel }));
    }

    if (def.unlockedStatBoosts?.length) {
         def.unlockedStatBoosts.forEach((id: any, i: number) => {
             const stats = nodeGen.getChampionStatPreferences(def);
             const statData = { stats, boostPercent: 0.10 };
             pushSkill(SkillTreeRewardType.STAT_BOOST, `def_stat_${i}`, statData);
         });
    } else if (hasTypes) {
         let prefs: any[] = [];
         try { prefs = nodeGen.getChampionStatPreferences(def); } catch (e) {}
         pushSkill(SkillTreeRewardType.STAT_BOOST, `def_stat_gen`, { stats: prefs, boostPercent: 0.10 }, i18next.t("championSelect:defaultSkillLabels.statBoosts", { types: typesLabel }));
    }
    const allUnlockedAltBuilds = new Set<string>();
    def.unlockedAltBuilds?.forEach((id: any) => allUnlockedAltBuilds.add(id));
    if (data?.unlockedAltBuilds) {
        data.unlockedAltBuilds.forEach((id: any) => allUnlockedAltBuilds.add(id));
    }

    def.signaturePokemon?.forEach((speciesId: any, i: number) => {

        pushSkill(SkillTreeRewardType.SIGNATURE_POKEMON, `def_sig_${i}`, { species: speciesId });
        const matchingBuilds = Array.from(allUnlockedAltBuilds).filter(buildId => {
            const buildDef = POKEMON_ALT_BUILDS[buildId as any];
            return buildDef && buildDef.species === speciesId;
        });

        matchingBuilds.forEach((buildId, j) => {
            const buildDef = POKEMON_ALT_BUILDS[buildId as any];
            pushSkill(SkillTreeRewardType.POKEMON_ALT_BUILD, `sig_alt_${i}_${j}`, {
                altBuildId: buildId,
                species: buildDef?.species,
                stats: buildDef?.stats,
                formKey: buildDef?.formKey
            });
            allUnlockedAltBuilds.delete(buildId);
        });
    });
    let remIdx = 0;
    allUnlockedAltBuilds.forEach((buildId) => {
        const buildDef = POKEMON_ALT_BUILDS[buildId as any];
        pushSkill(SkillTreeRewardType.POKEMON_ALT_BUILD, `rem_alt_${remIdx++}`, {
            altBuildId: buildId,
            species: buildDef?.species,
            stats: buildDef?.stats,
            formKey: buildDef?.formKey
        });
    });

    def.legendaryPokemon?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.LEGENDARY_POKEMON, `def_leg_${i}`, { species: id }));
    if (hasTypes) {
        pushSkill(SkillTreeRewardType.GENERAL_POKEMON, `def_gen_poke`, {});
    }
    def.unlockedMegaStones?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.MEGA_STONE, `def_mega_${i}`, { megaStone: id }));
    def.unlockedPermaItems?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.PERMA_ITEM, `def_perma_${i}`, { permaType: id }));
    def.unlockedMoveUpgrades?.forEach((id: any, i: number) => pushSkill(SkillTreeRewardType.MOVE_UPGRADE, `def_upg_${i}`, { upgradePath: id }));

    if (def.unlockedGlitchForms) {
       def.unlockedGlitchForms.forEach((form: string, i: number) => {
         pushSkill(SkillTreeRewardType.GLITCH_FORM_UNLOCK, `def_glitch_${i}`, {
             formKey: form,
             unlockableId: def.glitchFormUnlockableIds?.[form]
         });
       });
    }
    if (def.unlockedHealingItems) pushSkill(SkillTreeRewardType.HEALING_ITEMS, `def_heal`);
    if (def.unlockedBerries) pushSkill(SkillTreeRewardType.BERRY_ITEMS, `def_berry`);
    if (def.unlockedMemoryMushroom) pushSkill(SkillTreeRewardType.MEMORY_MUSHROOM, `def_mem`);
    if (def.unlockedAbilitySwitchers) pushSkill(SkillTreeRewardType.ABILITY_SWITCHER, `def_absw`);
    if (def.unlockedGeneralItems) pushSkill(SkillTreeRewardType.GENERAL_ITEMS, `def_gitem`);
    if (def.unlockedBaton) pushSkill(SkillTreeRewardType.BATON_ITEM, `def_baton`);
    if (def.unlockedPPMax) pushSkill(SkillTreeRewardType.PP_MAX_ITEM, `def_ppmax`);
    if (def.unlockedRogueBall) pushSkill(SkillTreeRewardType.ROGUE_BALL, `def_rball`);
    if (def.unlockedGoldenPokeball) pushSkill(SkillTreeRewardType.GOLDEN_POKEBALL, `def_gpball`);
    if (def.unlockedMasterBall) pushSkill(SkillTreeRewardType.MASTER_BALL, `def_mball`);

    if (def.unlockedMoneyReward) pushSkill(SkillTreeRewardType.MONEY_REWARD, `def_money`);
    if (def.unlockedPermaMoney) pushSkill(SkillTreeRewardType.PERMA_MONEY, `def_pmoney`, { amount: 3000 });
    pushSkill(SkillTreeRewardType.SKILL_TREE_TOKENS, `def_tokens`, {}, i18next.t("championSelect:defaultSkillLabels.tokens"));
    pushSkill(SkillTreeRewardType.SKILL_POINTS, `def_points`, {}, i18next.t("championSelect:defaultSkillLabels.points"));
    if (def.unlockedBallRaritySelect?.master) pushSkill(SkillTreeRewardType.MASTERBALL_RARITY_SELECT, `def_mball_sel`);
    if (def.unlockedBallRaritySelect?.rogue) pushSkill(SkillTreeRewardType.ROGUEBALL_RARITY_SELECT, `def_rball_sel`);

    if (def.unlockedVoucherTiers?.length) {
        def.unlockedVoucherTiers.forEach((tier: any, i: number) => {
          pushSkill(SkillTreeRewardType.EGG_VOUCHER, `def_voucher_${i}`, { tier });
        });
    }

    if (hasTypes) {
      pushSkill(SkillTreeRewardType.TYPE_BOOSTER_ITEM, `def_type_boost`, {}, i18next.t("championSelect:defaultSkillLabels.boosters", { types: typesLabel }));
      pushSkill(SkillTreeRewardType.ESSENCE_BUNDLE, `def_essence`, {}, i18next.t("championSelect:defaultSkillLabels.essence", { types: typesLabel }));
      pushSkill(SkillTreeRewardType.REVIVE_BOOST, `def_revive`, {}, i18next.t("championSelect:defaultSkillLabels.reviveBoost", { types: typesLabel }));
      pushSkill(SkillTreeRewardType.ESSENCE_TYPE_WEIGHT, `def_ess_weight`, {}, i18next.t("championSelect:defaultSkillLabels.essenceWeights", { types: typesLabel }));
      pushSkill(SkillTreeRewardType.CATCH_RATE_BONUS, `def_catch`, {}, i18next.t("championSelect:defaultSkillLabels.catchBonus", { types: typesLabel }));
      pushSkill(SkillTreeRewardType.FUSION_SECONDARY_PRIORITY, `def_fusion`, {}, i18next.t("championSelect:defaultSkillLabels.fusionPriority", { types: typesLabel }));
    }

    return skills;
  }

  private getOrderedSkillList(def: any, data: any, allSkills: Array<[string, any]>, championUnlocked: boolean): Array<[string, any]> {
    const defaultSkills = championUnlocked ? this.generateDefaultUnlockedSkills(def, data) : [];

    const isUnlockedCheck = (skillId: string, s: any) => !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const unlockedFromLocked = allSkills.filter(([skillId, s]) => isUnlockedCheck(skillId, s));
    const sortedUnlockedSkills = [...defaultSkills, ...unlockedFromLocked]
      .sort(([, a], [, b]) => ((a as any)?.unlockLevel ?? 0) - ((b as any)?.unlockLevel ?? 0));
    const buildsBySpecies = new Map<any, Array<[string, any]>>();

    sortedUnlockedSkills.forEach(item => {
        const [, s] = item;
        if (s.rewardType === SkillTreeRewardType.POKEMON_ALT_BUILD) {
            const altBuildId = s.data?.altBuildId || s.unlockableId;
            const def = POKEMON_ALT_BUILDS[altBuildId as any];
            if (def?.species) {
                 if (!buildsBySpecies.has(def.species)) buildsBySpecies.set(def.species, []);
                 buildsBySpecies.get(def.species)!.push(item);
            }
        }
    });

    const finalUnlockedSkills: Array<[string, any]> = [];
    const placedAltBuildIds = new Set<string>();
    const placedRealAltBuildIds = new Set<string>();

    sortedUnlockedSkills.forEach(item => {
        const [id, s] = item;

        if (s.rewardType === SkillTreeRewardType.POKEMON_ALT_BUILD) {
            if (placedAltBuildIds.has(id)) return;

            const altBuildId = s.data?.altBuildId || s.unlockableId;

            if (placedRealAltBuildIds.has(altBuildId)) {
                placedAltBuildIds.add(id);
                return;
            }

            const def = POKEMON_ALT_BUILDS[altBuildId as any];
            const parentExists = sortedUnlockedSkills.some(([, k]) =>
                k.rewardType === SkillTreeRewardType.SIGNATURE_POKEMON &&
                (k.data?.species === def?.species || k.unlockableId === def?.species)
            );
            if (parentExists) return;
            finalUnlockedSkills.push(item);
            placedAltBuildIds.add(id);
            placedRealAltBuildIds.add(altBuildId);
            return;
        }

        finalUnlockedSkills.push(item);

        if (s.rewardType === SkillTreeRewardType.SIGNATURE_POKEMON) {
             const species = s.data?.species || s.unlockableId;
             const children = buildsBySpecies.get(species);
             if (children) {
                 children.forEach(child => {
                     const [childId, childS] = child;
                     if (!placedAltBuildIds.has(childId)) {
                         const realId = childS.data?.altBuildId || childS.unlockableId;
                         if (!placedRealAltBuildIds.has(realId)) {
                             finalUnlockedSkills.push(child);
                             placedAltBuildIds.add(childId);
                             placedRealAltBuildIds.add(realId);
                         } else {
                             placedAltBuildIds.add(childId);
                         }
                     }
                 });
             }
        }
    });

    const lockedSkills = allSkills.filter(([skillId, s]) => !isUnlockedCheck(skillId, s))
      .sort(([, a], [, b]) => ((a as any)?.unlockLevel ?? 0) - ((b as any)?.unlockLevel ?? 0));

    if (this.knownSkillsCollapsed) {
      const currentLevel = data?.level ?? 1;
      const champIsUnlocked = championUnlocked;
      const immediateSkills = lockedSkills.filter(([skillId, s]) => {
        const unlockLevel = (s as any)?.unlockLevel ?? 0;
        const isNextLevel = unlockLevel === currentLevel + 1;
        const canUnlock = currentLevel >= unlockLevel;
        return champIsUnlocked ? (isNextLevel || canUnlock) : (unlockLevel === 1);
      });
      const futureSkills = lockedSkills.filter(([skillId, s]) => {
        const unlockLevel = (s as any)?.unlockLevel ?? 0;
        const isNextLevel = unlockLevel === currentLevel + 1;
        const canUnlock = currentLevel >= unlockLevel;
        const isImmediate = champIsUnlocked ? (isNextLevel || canUnlock) : (unlockLevel === 1);
        return !isImmediate;
      });
      const collapsed: Array<[string, any]> = [];
      if (immediateSkills.length > 0) collapsed.push(immediateSkills[0]);
      collapsed.push(...futureSkills.slice(0, 8 - collapsed.length));
      return [...finalUnlockedSkills, ...collapsed];
    }
    return [...finalUnlockedSkills, ...lockedSkills.slice(0, 8)];
  }

  private renderSkillList(championId: string): void {
    if (!this.skillsContainer) return;
    if (!this.skillListContainer) return;
    this.skillItemContainers.forEach(c => c.destroy());
    this.skillItemBgs.forEach(g => g.destroy());
    this.skillItemContainers = [];
    this.skillItemBgs = [];

    const viewChampionId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[viewChampionId] as any;
    if (!def) return;
    const data = this.championManager.getChampionData(championId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def?.id) || (data?.isUnlocked === true);
    const isUnlockedCheck = (skillId: string, s: any) => !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);
    if (skills.length === 0) {
      this.selectedSkillIndex = -1;
      this.skillScrollOffset = 0;
    } else if (this.selectedSkillIndex < 0) {
      const currentLevel = data?.level ?? 1;
      const nextIdx = skills.findIndex(([_, s]) => (((s as any)?.unlockLevel ?? 0) === currentLevel + 1));
      const firstLockedIdx = skills.findIndex(([skillId, s]) => !isUnlockedCheck(skillId, s));
      this.selectedSkillIndex = nextIdx >= 0 ? nextIdx : (firstLockedIdx >= 0 ? firstLockedIdx : 0);
      const maxVisible = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS;
      if (this.selectedSkillIndex < this.skillScrollOffset || this.selectedSkillIndex >= this.skillScrollOffset + maxVisible) {
        this.skillScrollOffset = Math.max(0, this.selectedSkillIndex - Math.floor(maxVisible / 2));
      }
    } else if (this.selectedSkillIndex >= 0) {
      this.selectedSkillIndex = (this.selectedSkillIndex + skills.length) % skills.length;
      if (this.selectedSkillIndex < this.skillScrollOffset) {
        this.skillScrollOffset = this.selectedSkillIndex;
      } else if (this.selectedSkillIndex >= this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS) {
        this.skillScrollOffset = this.selectedSkillIndex - (ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS - 1);
      }
    }

    const visible = skills.slice(this.skillScrollOffset, this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS);
    const boxWidth = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_WIDTH;
    const boxHeight = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_HEIGHT;
    const itemSpacing = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_SPACING;

    const toggleContainer = this.scene.add.container(0, 0);
    const toggleBg = this.scene.add.graphics();
    toggleBg.fillStyle(0x1a1a3a, 0.9);
    toggleBg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 2);
    toggleBg.lineStyle(0.5, 0x8888ff, 0.6);
    toggleBg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 2);
    toggleContainer.add(toggleBg);
    let toggleGamepadType = "keyboard";
    if ((this.scene as BattleScene).inputMethod === "gamepad") {
      toggleGamepadType = (this.scene as BattleScene).inputController?.getConfig(
        (this.scene as BattleScene).inputController?.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if ((this.scene as BattleScene).inputMethod !== "touch") {
      toggleGamepadType = (this.scene as BattleScene).inputMethod || "keyboard";
    }
    const isGamepad = toggleGamepadType !== "keyboard" && (this.scene as BattleScene).inputMethod !== "touch";
    const toggleIconPath = isGamepad
      ? ((this.scene as BattleScene).inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png")
      : "C.png";
    const toggleKeySprite = this.scene.add.sprite(-boxWidth / 2 + 8, 0, toggleGamepadType, toggleIconPath);
    toggleKeySprite.setScale(0.6);
    toggleKeySprite.setOrigin(0.5, 0.5);
    toggleContainer.add(toggleKeySprite);
    const toggleLabel = this.knownSkillsCollapsed
      ? i18next.t("championSelect:showKnown", { defaultValue: "Show Known" })
      : i18next.t("championSelect:hideKnown", { defaultValue: "Hide Known" });
    const toggleText = addTextObject(this.scene, 4, 0, toggleLabel, TextStyle.WINDOW, { fontSize: "30px", align: "center" });
    toggleText.setOrigin(0.5, 0.5);
    toggleText.setTint(0x8888ff);
    toggleContainer.add(toggleText);
    this.skillListContainer.add(toggleContainer);
    this.skillItemContainers.push(toggleContainer);
    this.skillItemBgs.push(toggleBg);

    const startY = boxHeight + itemSpacing;
    for (let i = 0; i < visible.length; i++) {
      const [skillId, s] = visible[i];
      const textContent = this.getSkillDisplayText(championId, skillId, s, isUnlockedCheck(skillId, s));
      const text = addTextObject(this.scene, 0, 0, textContent, TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SKILL_ITEM_FONT_SIZE, align: "center" });
      text.setOrigin(0.5);
      text.setStyle({ ...text.style, wordWrap: { width: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH } });
      if (text.width > ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH) {
        this.fitTextToSingleLine(text, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH);
      }

      const container = this.scene.add.container(0, startY + i * (boxHeight + itemSpacing));
      const bg = this.scene.add.graphics();
      const isSelected = this.selectedSkillIndex >= 0 && (this.skillScrollOffset + i) === this.selectedSkillIndex;
      const isUnlocked = isUnlockedCheck(skillId, s);
      const unlockLevel = (s as any)?.unlockLevel ?? 0;
      const currentLevel = data?.level ?? 1;
      const isNextLevelUnlock = unlockLevel === currentLevel + 1;
      const canCurrentlyUnlock = currentLevel >= unlockLevel;
      const championUnlocked = this.championManager.isChampionUnlocked(championId) || (data?.isUnlocked === true);
      const isImmediatelyUnlockable = !isUnlocked && (
        championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1)
      );

      const rarity = this.getSkillRarityFromDef(s);
      const colors = this.getRarityColors(rarity);
      let borderColor, borderAlpha, borderThickness;

      if (isUnlocked) {
        if (isSelected) {

          borderColor = colors.border;
          borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.UNLOCKED_SKILL_FOCUSED_BORDER_ALPHA;
          borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.UNLOCKED_SKILL_FOCUSED_BORDER_THICKNESS;
        } else {

          borderColor = colors.border;
          borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.UNLOCKED_SKILL_BORDER_ALPHA;
          borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.UNLOCKED_SKILL_BORDER_THICKNESS;
        }
      } else if (isImmediatelyUnlockable) {
        if (isSelected) {

          borderColor = colors.border;
          borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.IMMEDIATE_UNLOCK_FOCUSED_BORDER_ALPHA;
          borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.IMMEDIATE_UNLOCK_FOCUSED_BORDER_THICKNESS;
        } else {

          borderColor = colors.border;
          borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.IMMEDIATE_UNLOCK_BORDER_ALPHA;
          borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.IMMEDIATE_UNLOCK_BORDER_THICKNESS;
        }
      } else if (isSelected) {

        borderColor = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_FOCUSED_BORDER_COLOR;
        borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_FOCUSED_BORDER_ALPHA;
        borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_FOCUSED_BORDER_THICKNESS;
      } else {

        borderColor = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_UNFOCUSED_BORDER_COLOR;
        borderAlpha = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_UNFOCUSED_BORDER_ALPHA;
        borderThickness = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.LOCKED_UNFOCUSED_BORDER_THICKNESS;
      }

      bg.lineStyle(borderThickness, borderColor, borderAlpha);
      bg.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
      if (isUnlocked) {

        bg.fillStyle(colors.bg, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.UNLOCKED_SKILL_BG_ALPHA);
        bg.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
      }
      if (!isUnlocked) {
        text.setTint(0xffffff);
      }

      container.add(bg);
      container.add(text);
      this.skillListContainer.add(container);
      this.skillItemContainers.push(container);
      this.skillItemBgs.push(bg);
    }
    if (this.skillArrowUp) this.skillArrowUp.setVisible(false);
    if (this.skillArrowDown) this.skillArrowDown.setVisible(this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS < skills.length);
    this.renderSkillIconBar(championId);

    if (this.skillTooltipActive) {
      this.updateSkillTooltip(championId);
    } else {
      this.skillTooltipContainer?.setVisible(false);
    }
  }

  private getSkillNameOnly(championId: string, s: any): string {
    if (s.customLabel) return s.customLabel;

    let name: string | undefined;
    const data = s.data || {};
    if (!s.data && s.unlockableId) {
      switch (s.rewardType) {
        case SkillTreeRewardType.MEGA_STONE:
          data.megaStone = s.unlockableId;
          break;
        case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        case SkillTreeRewardType.SMITTY_ABILITY:
        case SkillTreeRewardType.ABILITY_GRANT:
        case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        case SkillTreeRewardType.TERA_ABILITY:
          data.abilityId = s.unlockableId;
          break;
        case SkillTreeRewardType.SIGNATURE_POKEMON:
        case SkillTreeRewardType.LEGENDARY_POKEMON:
        case SkillTreeRewardType.GENERAL_POKEMON:
          data.species = s.unlockableId;
          break;
        case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
          data.unlockableId = s.unlockableId;
          break;
        case SkillTreeRewardType.TM_FILTERED:
        case SkillTreeRewardType.XM_FILTERED:
          data.moveId = s.unlockableId;
          break;
        case SkillTreeRewardType.POKEMON_ALT_BUILD:
          data.altBuildId = s.unlockableId;
          break;
      }
    }

    const rewardData = {
      type: s.rewardType,
      data: data,
      immediate: true
    };

    try {
      const nodeGen = new SkillTreeNodeGenerator(0, championId, this.scene as BattleScene, true);
      const generatedName = nodeGen.getRewardName(rewardData);
      if (generatedName && generatedName !== "Unknown Reward") {
        name = generatedName;
      }
    } catch (e) {}

    if (!name) {
      const resolvedChampionId = this.resolveChampionId(championId);
      const unlockLevel = (s as any)?.unlockLevel ?? 0;
      name = i18next.t(`championSkills:${resolvedChampionId}.level_${unlockLevel}.name`);
    }

    return name || "???";
  }

  private resolveTypeIcon(type: Type): { atlas: string; frame: string; isSpecial: boolean } {
    const isSpecial = type === (Type as any).SMITTY || type === (Type as any).GLITCH || type === (Type as any).GEN_ONE;
    let frame: string;
    if (type === (Type as any).GEN_ONE) {
      frame = "normal";
    } else if (type === (Type as any).GLITCH) {
      frame = "physical";
    } else if (type === (Type as any).SMITTY) {
      frame = "special";
    } else {
      frame = Type[type].toLowerCase();
    }
    return {
      atlas: (type === (Type as any).GEN_ONE) ? "pbinfo_enemy_type" : (isSpecial ? "categories" : Utils.getLocalizedSpriteKey("types")),
      frame,
      isSpecial,
    };
  }

  private buildEssenceCostRow(targetContainer: Phaser.GameObjects.Container, data: any): { height: number; hasContent: boolean } {
    targetContainer.removeAll(true);

    const reqs = ChampionXPManager.getPerTypeRequiredForLevel(data);
    if (!reqs || reqs.length === 0) return { height: 0, hasContent: false };

    const tc = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL;
    const iconScale = tc.TOOLTIP_COST_ICON_SCALE;
    const iconTextGap = tc.TOOLTIP_COST_ICON_TEXT_GAP;
    const sectionGap = 3;
    let x = 0;
    let maxH = 0;

    for (let ri = 0; ri < reqs.length; ri++) {
      const req = reqs[ri];
      const t = req.types[0];
      if (t === undefined) continue;

      if (ri > 0) {
        const dot = addTextObject(this.scene, x, 0, "\u00B7", TextStyle.WINDOW, { fontSize: tc.TOOLTIP_COST_FONT_SIZE, color: "#E8E8E8", fontStyle: "bold" });
        dot.setOrigin(0, 0);
        targetContainer.add(dot);
        x += dot.displayWidth + sectionGap;
      }

      const { atlas, frame, isSpecial } = this.resolveTypeIcon(t);
      const specialScale = this._tooltipSpecialIconScale ?? (iconScale * (this._stripeSpecialTypeScale / this._stripeTypeScale));
      const appliedScale = isSpecial ? specialScale : iconScale;

      if (isSpecial) {
        const specialContainer = this.scene.add.container(x, 0);
        const typeIcon = this.scene.add.sprite(0, 0, atlas, frame);
        typeIcon.setScale(appliedScale);
        typeIcon.setOrigin(0, 0);
        this.decorateSpecialIcon(t, typeIcon);
        specialContainer.add(typeIcon);

        const isGlitch = t === (Type as any).GLITCH;
        const isGenOne = t === (Type as any).GEN_ONE;
        const labelText = isGlitch
          ? i18next.t("pokemonInfo:Type.GLITCH", { defaultValue: "GLITCH" }).toUpperCase()
          : isGenOne
            ? i18next.t("pokemonInfo:Type.GEN_ONE", { defaultValue: "GEN I" }).toUpperCase()
            : i18next.t("pokemonInfo:Type.SMITTY", { defaultValue: "SMITTY" }).toUpperCase();

        const labelFs = this._tooltipSpecialLabelFontSize ?? Math.round(parseInt(tc.TOOLTIP_COST_FONT_SIZE, 10) * (this._stripeSpecialLabelFontSize / this._stripeFontSize));
        const specialLabel = addTextObject(this.scene, 0, 0, labelText, TextStyle.WINDOW, {
          fontSize: `${labelFs}px`,
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        });
        if (isGenOne) {
          specialLabel.setColor("#33CC33");
        }
        specialLabel.setOrigin(0.5, 0.5);
        specialLabel.setPosition(
          typeIcon.displayWidth / 2 + (this._tooltipSpecialLabelX ?? 0),
          typeIcon.displayHeight / 2 + (this._tooltipSpecialLabelY ?? 0)
        );
        specialContainer.add(specialLabel);
        targetContainer.add(specialContainer);
        x += typeIcon.displayWidth + iconTextGap;
        maxH = Math.max(maxH, typeIcon.displayHeight, specialLabel.displayHeight);
      } else {
        const icon = this.scene.add.sprite(x, 0, atlas, frame);
        icon.setScale(appliedScale);
        icon.setOrigin(0, 0);
        targetContainer.add(icon);
        x += icon.displayWidth + iconTextGap;
        maxH = Math.max(maxH, icon.displayHeight);
      }

      const current = Math.min(req.types.reduce((sum, ty) => sum + (data.levelEssence?.[ty] || 0), 0), req.amount);
      const amountText = addTextObject(
        this.scene,
        x,
        0,
        `${current}/${req.amount}`,
        TextStyle.WINDOW,
        { fontSize: tc.TOOLTIP_COST_FONT_SIZE, color: current >= req.amount ? "#00ff00" : "#ffffff" }
      );
      amountText.setOrigin(0, 0);
      targetContainer.add(amountText);
      x += amountText.displayWidth + sectionGap;

      maxH = Math.max(maxH, amountText.displayHeight);
    }

    return { height: maxH, hasContent: reqs.length > 0 };
  }

  private rebuildSkillTooltipEssenceCost(data: any): { height: number; hasContent: boolean } {
    if (!this.skillTooltipCostContainer) return { height: 0, hasContent: false };
    return this.buildEssenceCostRow(this.skillTooltipCostContainer, data);
  }

  private showUnlockBtnTooltip(anchorX: number, anchorY: number): void {
    if (!this._unlockBtnTooltipContainer || !this._unlockBtnTooltipBg || !this._unlockBtnTooltipCostContainer) return;

    const selected = this.availableChampions[this.selectedChampionIndex];
    const champData = selected ? this.championManager.getChampionData(selected) : null;
    if (!champData) return;

    const tc = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL;
    const tooltipW = this._tooltipWidth;
    const padding = tc.TOOLTIP_PADDING;
    const textX = padding + 2;
    const centerX = tooltipW / 2 + 2;

    const rarityColors = this.getRarityColors(SkillTreeRarity.COMMON);
    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");

    if (this._unlockBtnTooltipTitle) {
      this._unlockBtnTooltipTitle.setText(i18next.t("championSelect:tooltip.essenceRequiredTooltip"));
      this._unlockBtnTooltipTitle.setPosition(centerX, tc.TOOLTIP_TITLE_TEXT_Y + 2);
      this._unlockBtnTooltipTitle.setColor(rarityHex);
      this._unlockBtnTooltipTitle.setStyle({
        ...this._unlockBtnTooltipTitle.style,
        wordWrap: {},
        align: "center",
      });
    }

    if (this._unlockBtnTooltipRarity) {
      const rarityText = this.getRarityText(SkillTreeRarity.COMMON);
      this._unlockBtnTooltipRarity.setText(rarityText);
      this._unlockBtnTooltipRarity.setTint(rarityColors.border);
      this._unlockBtnTooltipRarity.setPosition(centerX, tc.TOOLTIP_RARITY_TEXT_Y);
    }

    if (this._unlockBtnTooltipRarityBarBg) {
      this._unlockBtnTooltipRarityBarBg.clear();
      this._unlockBtnTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
      this._unlockBtnTooltipRarityBarBg.fillRect(2, tc.TOOLTIP_RARITY_BAR_Y, tooltipW - 4, tc.TOOLTIP_RARITY_BAR_HEIGHT);
    }

    let currentY = tc.TOOLTIP_CONTENT_Y + 2;

    if (this._unlockBtnTooltipDesc) {
      const descText = i18next.t("championSelect:tooltip.essenceRequiredTooltipDesc");
      this._unlockBtnTooltipDesc.setText(descText);
      this._unlockBtnTooltipDesc.setPosition(textX, currentY);
      this._unlockBtnTooltipDesc.setColor("#ffffff");
      const scaleX = this._unlockBtnTooltipDesc.scaleX || 0.167;
      const wrapWidthPreScale = Math.max(0, (tooltipW - padding * 2) / scaleX);
      const descLineSpacing = this._unlockBtnTooltipDesc.lineSpacing;
      this._unlockBtnTooltipDesc.setStyle({
        ...this._unlockBtnTooltipDesc.style,
        wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
      });
      this._unlockBtnTooltipDesc.setLineSpacing(descLineSpacing);
      currentY += this._unlockBtnTooltipDesc.displayHeight + tc.TOOLTIP_TEXT_SPACING;
    }

    const costResult = this.buildEssenceCostRow(this._unlockBtnTooltipCostContainer, champData);

    if (costResult.hasContent) {
      currentY += 2;
      if (this._unlockBtnTooltipSectionHeader) {
        this._unlockBtnTooltipSectionHeader.setText(i18next.t("championSelect:tooltip.requiredEssenceHeader", { defaultValue: "REQUIRED ESSENCE" }));
        this._unlockBtnTooltipSectionHeader.setVisible(true);
        const headerH = this._unlockBtnTooltipSectionHeader.displayHeight;
        const headerCenterY = currentY + headerH / 2;
        this._unlockBtnTooltipSectionHeader.setPosition(textX, headerCenterY);

        if (this._unlockBtnTooltipSectionLine) {
          this._unlockBtnTooltipSectionLine.clear();
          this._unlockBtnTooltipSectionLine.lineStyle(
            tc.TOOLTIP_SECTION_LINE_THICKNESS,
            tc.TOOLTIP_SECTION_LINE_COLOR,
            tc.TOOLTIP_SECTION_LINE_ALPHA
          );
          const lineStartX = textX + this._unlockBtnTooltipSectionHeader.displayWidth + 4;
          const lineEndX = tooltipW - padding - 2;
          if (lineEndX > lineStartX) {
            this._unlockBtnTooltipSectionLine.lineBetween(lineStartX, headerCenterY, lineEndX, headerCenterY);
          }
        }
        currentY += headerH + tc.TOOLTIP_SECTION_HEADER_SPACING;
      }

      this._unlockBtnTooltipCostContainer.setPosition(textX, currentY);
      this._unlockBtnTooltipCostContainer.setVisible(true);
      currentY += costResult.height + 4;
    } else {
      if (this._unlockBtnTooltipSectionHeader) this._unlockBtnTooltipSectionHeader.setVisible(false);
      if (this._unlockBtnTooltipSectionLine) this._unlockBtnTooltipSectionLine.clear();
      this._unlockBtnTooltipCostContainer.setVisible(false);
    }

    const loreText = i18next.t("championSelect:tooltip.essenceLoreNote");
    const showLore = !!loreText;
    let loreBarHeight = 0;
    if (showLore && this._unlockBtnTooltipLore && this._unlockBtnTooltipLoreBarBg) {
      this._unlockBtnTooltipLore.setText(loreText);
      const loreScale = this._unlockBtnTooltipLore.scaleX || 0.167;
      const loreWrapWidth = Math.max(0, (tooltipW - padding * 2) / loreScale);
      const loreLineSpacing = this._unlockBtnTooltipLore.lineSpacing;
      this._unlockBtnTooltipLore.setStyle({
        ...this._unlockBtnTooltipLore.style,
        fontSize: "30px",
        fontStyle: "italic",
        color: "#B0B0B0",
        wordWrap: { width: loreWrapWidth, useAdvancedWrap: true },
        align: "center"
      });
      this._unlockBtnTooltipLore.setLineSpacing(loreLineSpacing);
      this._unlockBtnTooltipLore.setVisible(true);
      const loreTextH = Math.min(this._unlockBtnTooltipLore.displayHeight, 40);
      loreBarHeight = loreTextH + tc.TOOLTIP_LORE_BAR_PADDING_V * 2;
    }

    const barsHeight = tc.TOOLTIP_TITLE_BAR_HEIGHT + tc.TOOLTIP_RARITY_BAR_HEIGHT;
    const totalH = Math.max(
      tc.TOOLTIP_MIN_HEIGHT,
      barsHeight + (currentY - (tc.TOOLTIP_CONTENT_Y + 2)) + padding + loreBarHeight
    );

    if (showLore && this._unlockBtnTooltipLore && this._unlockBtnTooltipLoreBarBg) {
      const loreBarY = totalH - loreBarHeight;
      this._unlockBtnTooltipLoreBarBg.clear();
      this._unlockBtnTooltipLoreBarBg.fillStyle(0x0f0f1e, 0.7);
      this._unlockBtnTooltipLoreBarBg.fillRect(2, loreBarY, tooltipW - 4, loreBarHeight);
      this._unlockBtnTooltipLore.setPosition(centerX - 2, loreBarY + tc.TOOLTIP_LORE_BAR_PADDING_V);
      if (this._unlockBtnTooltipLore.displayHeight > 40) {
        this._unlockBtnTooltipLore.setCrop(0, 0, tooltipW, 40);
      } else {
        this._unlockBtnTooltipLore.setCrop();
      }
    }

    this._unlockBtnTooltipBg.setSize(tooltipW, totalH);

    const screenW = this.getWidth();
    const screenH = this.getHeight();
    const iconHalfW = 5;
    const tipGap = 4;
    const tipMargin = 4;
    const ax = anchorX / 6;
    const ay = anchorY / 6;
    const xRight = ax + iconHalfW + tipGap;
    const xLeft = ax - iconHalfW - tipGap - tooltipW;
    let tx = xRight + tooltipW > screenW ? xLeft : xRight;
    tx = Math.max(tipMargin, Math.min(screenW - tooltipW - tipMargin, tx));
    let ty = ay - totalH / 2;
    ty = Math.max(tipMargin, Math.min(screenH - totalH - tipMargin, ty));
    this._unlockBtnTooltipContainer.setPosition(tx, ty);
    this._unlockBtnTooltipContainer.setVisible(true);
  }

  private hideUnlockBtnTooltip(): void {
    if (this._unlockBtnTooltipContainer) {
      this._unlockBtnTooltipContainer.setVisible(false);
    }
  }

  private getDynamicEssenceText(data: any): string | null {
    const reqs = ChampionXPManager.getPerTypeRequiredForLevel(data);
    if (!reqs || reqs.length === 0) return null;

    const parts = reqs.map(req => {
      const current = req.types.reduce((sum, t) => sum + (data.levelEssence?.[t] || 0), 0);
      const required = req.amount;
      const typeNames = req.types.map(t => i18next.t(`pokemonInfo:Type.${Type[t]}`)).join("/");
      return `${typeNames}: ${current}/${required}`;
    });

    return parts.join("\n");
  }

  private getSkillDisplayText(championId: string, skillId: string, s: any, unlocked: boolean): string {
    const viewChampionId = this.resolveChampionId(championId);
    const name = this.getSkillNameOnly(viewChampionId, s);

    const championData = this.championManager.getChampionData(championId);
    const currentLevel = championData?.level ?? 1;
    const unlockLevel = (s as any)?.unlockLevel ?? 0;

    if (unlocked) {
      return name;
    } else {
      const isNextLevelUnlock = unlockLevel === currentLevel + 1;
      const canCurrentlyUnlock = currentLevel >= unlockLevel;
      const championUnlocked = this.championManager.isChampionUnlocked(championId) || (championData?.isUnlocked === true);

      const isBarNextDisplay = this._barNextSkillId === skillId;
      if ((championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1)) || isBarNextDisplay) {
        const valueOnly = name.includes(": ") ? name.substring(name.indexOf(": ") + 2) : name;
        return `Lv${unlockLevel} ${valueOnly}`;
      } else {
        return `Lv${unlockLevel} ???`;
      }
    }
  }

  private fitTextToSingleLine(text: Phaser.GameObjects.Text, maxWidth: number): void {

    text.setStyle({ fontSize: "28px" });
    if (text.width > maxWidth) {
      text.setStyle({ fontSize: "26px" });
    }
    if (text.width > maxWidth) {
      let truncated = text.text;
      while (text.width > maxWidth && truncated.length > 1) {
        truncated = truncated.slice(0, -1);
        text.setText(truncated + "…");
      }
    }
  }

  private updateChampionSelection(delta: number): boolean {
    if (this.availableChampions.length <= 1) return false;
    const newIndex = (this.selectedChampionIndex + delta + this.availableChampions.length) % this.availableChampions.length;
    this.selectedChampionIndex = newIndex;
    this.updateChampionInfo();
    if (this.championSprites.length > 0) {
      this.updateGridSpriteSelection(this.availableChampions[this.selectedChampionIndex]);
    }
    return true;
  }

  private updateSkillSelection(delta: number): boolean {
    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    const def = CHAMPION_DEFINITIONS[selectedChampionId] as any;
    if (!def) return false;
    const data = this.championManager.getChampionData(selectedChampionId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def?.id) || (data?.isUnlocked === true);

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    if (skills.length === 0) return false;
    if (this.selectedSkillIndex < 0) {
      this.selectedSkillIndex = delta >= 0 ? 0 : skills.length - 1;
      this._suppressSkillBarAutoPan = true;
      this.renderSkillList(selectedChampionId);
      return true;
    }
    const newIndex = this.selectedSkillIndex + delta;
    if (newIndex < 0 || newIndex >= skills.length) return false;

    this.selectedSkillIndex = newIndex;
    if (this.selectedSkillIndex < this.skillScrollOffset) {
      this.skillScrollOffset = this.selectedSkillIndex;
    } else if (this.selectedSkillIndex >= this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS) {
      this.skillScrollOffset = this.selectedSkillIndex - (ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS - 1);
    }
    this._suppressSkillBarAutoPan = true;
    this.renderSkillList(selectedChampionId);
    this.checkSpecialEssenceTutorials(selectedChampionId);
    return true;
  }

  private checkSpecialEssenceTutorials(selectedChampionId: string): void {
    const def = CHAMPION_DEFINITIONS[selectedChampionId] as any;
    const data = this.championManager.getChampionData(selectedChampionId);

    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;
    const championUnlocked = this.championManager.isChampionUnlocked(def?.id) || (data?.isUnlocked === true);
    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    if (this.selectedSkillIndex < 0 || this.selectedSkillIndex >= skills.length) return;

    const [skillId, skillDef] = skills[this.selectedSkillIndex];

    const isUnlockedCheck = (sId: string, s: any) => !!data?.unlockedSkills?.[sId] || (championUnlocked && ((s as any).isDefault || this.isSkillDefaultUnlocked(def, s)));
    const isUnlocked = isUnlockedCheck(skillId, skillDef);
    if (isUnlocked) return;

    const unlockLevel = (skillDef as any)?.unlockLevel ?? 0;
    const currentLevel = data?.level ?? 1;
    const isNextLevelUnlock = unlockLevel === currentLevel + 1;
    const canCurrentlyUnlock = currentLevel >= unlockLevel;
    const isImmediatelyUnlockable = championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1);

    if (!isImmediatelyUnlockable) return;

    const skillDefWithWeights = data?.lockedSkills?.[skillId];
    if (!skillDefWithWeights) return;

    const weights = skillDefWithWeights.requiredEssenceWeights as Array<{ type: Type | Type[] }> | undefined;
    if (!weights || !weights.length) return;

    const types = weights.flatMap(w => Array.isArray(w.type) ? w.type : [w.type]);
    const hasGlitch = types.includes(Type.GLITCH);
    const hasSmitty = types.includes(Type.SMITTY);

    if (!hasGlitch && !hasSmitty) return;

    const tutorialsToShow: EnhancedTutorial[] = [];
    const tutorialService = (this.scene as BattleScene).gameData.tutorialService;
    if (tutorialsToShow.length > 0) {
      tutorialService.showCombinedTutorial("", tutorialsToShow, true, false, true, 450);
    }
  }

  private updateSkillTooltip(championId: string): void {
    if (!this.skillTooltipContainer || !this.skillTooltipBg || !this.skillTooltipTitle || !this.skillTooltipRarity || !this.skillTooltipDesc) return;
    if (this.skillListPanelContainer) {
      this.skillListPanelContainer.setVisible(false);
    }

    const viewChampionId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[viewChampionId] as any;
    const data = this.championManager.getChampionData(championId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def.id) || (data?.isUnlocked === true);
    const isUnlockedCheck = (skillId: string, s: any) => !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    if (skills.length === 0) { this.skillTooltipContainer.setVisible(false); return; }
    if (this.selectedSkillIndex < 0 || this.selectedSkillIndex >= skills.length) {
      this.skillTooltipContainer.setVisible(false);
      return;
    }
    const [skillId, s] = skills[this.selectedSkillIndex];
    const isUnlocked = isUnlockedCheck(skillId, s);
    const unlockLevel = (s as any)?.unlockLevel ?? 0;

    let title = "";
    let desc = "";

    let showSectionHeader = false;
    let showDescHeader = false;
    let showDetailHeader = false;
    let detailHeaderKey = "";
    let detailText = "";
    let loreText = "";

    if (isUnlocked) {
      title = this.getSkillDisplayText(viewChampionId, skillId, s, true);
      showDescHeader = true;
      const structured = this.getSkillStructuredDescription(viewChampionId, unlockLevel, s);
      if (structured.detail && structured.detailHeaderKey) {
        showDetailHeader = true;
        detailHeaderKey = structured.detailHeaderKey;
        detailText = structured.detail;
      }
      if (structured.lore) loreText = structured.lore;
      desc = showDetailHeader ? structured.summary : (structured.summary || this.getSkillDescription(viewChampionId, unlockLevel, s));
      this.skillTooltipCost.setText("");
      this.skillTooltipCost.setVisible(false);
      if (this.skillTooltipCostContainer) { this.skillTooltipCostContainer.removeAll(true); this.skillTooltipCostContainer.setVisible(false); }
      this.skillTooltipPrereq.setText("");
    } else {
      const playerLevel = data?.level ?? 1;
      const isNextLevelUnlock = unlockLevel === playerLevel + 1;
      const canCurrentlyUnlock = playerLevel >= unlockLevel;
      const championUnlocked = this.championManager.isChampionUnlocked(championId) || (data?.isUnlocked === true);
      const isBarNext = this._barNextSkillId === skillId;
      const isImmediatelyUnlockableLocal = championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1);

      if (!isImmediatelyUnlockableLocal && !isBarNext) {
        title = i18next.t("championSelect:tooltip.lockedSkillTitle", { defaultValue: "Locked Skill" });
        desc = i18next.t("championSelect:tooltip.levelRequired", { level: unlockLevel, defaultValue: "Must be Level {{level}} to unlock." });
        this.skillTooltipCost.setText("");
        this.skillTooltipCost.setVisible(true);
        if (this.skillTooltipCostContainer) { this.skillTooltipCostContainer.removeAll(true); this.skillTooltipCostContainer.setVisible(false); }
        this.skillTooltipPrereq.setText("");
      } else {
        showDescHeader = true;
        const structured = this.getSkillStructuredDescription(viewChampionId, unlockLevel, s);
        if (structured.detail && structured.detailHeaderKey) {
          showDetailHeader = true;
          detailHeaderKey = structured.detailHeaderKey;
          detailText = structured.detail;
        }
        if (structured.lore) loreText = structured.lore;
        const baseTitle = this.getSkillNameOnly(viewChampionId, s);
        const lockedPrefix = i18next.t("championSelect:tooltip.lockedPrefix", { defaultValue: "LOCKED" });
        title = isImmediatelyUnlockableLocal ? `${lockedPrefix} ${baseTitle}` : baseTitle;

        desc = showDetailHeader
          ? structured.summary
          : (structured.summary || this.getSkillDescription(viewChampionId, unlockLevel, s));

        try {
          const essenceCostResult = this.rebuildSkillTooltipEssenceCost(data);
          if (essenceCostResult.hasContent) {
            showSectionHeader = true;
            this.skillTooltipCost.setText("");
            this.skillTooltipCost.setVisible(false);
            if (this.skillTooltipCostContainer) {
              this.skillTooltipCostContainer.setVisible(true);
              (this.skillTooltipCostContainer as any)._measuredHeight = essenceCostResult.height;
            }
          } else {
            if (this.skillTooltipCostContainer) this.skillTooltipCostContainer.setVisible(false);
            const essenceProgress = ChampionXPManager.getEssenceProgress(data);
            const current = Math.floor(essenceProgress.current);
            const required = Math.floor(essenceProgress.required);
            const legacyMsg = i18next.t("championSelect:tooltip.unlockWithEssence", { current, required, defaultValue: "Unlock by using {{current}}/{{required}} Essences to Level Up!" });
            this.skillTooltipCost.setText(legacyMsg);
            this.skillTooltipCost.setVisible(true);
            this.skillTooltipCost.setColor(current >= required ? "#00ff00" : "#ff0000");
          }
        } catch {
          this.skillTooltipCost.setText("");
          if (this.skillTooltipCostContainer) this.skillTooltipCostContainer.setVisible(false);
        }
        this.skillTooltipPrereq.setText("");
      }
    }

    this.skillTooltipTitle.setText(title);
    this.skillTooltipDesc.setText(desc);
    const showLore = !!loreText;

    const rarity = this.getSkillRarityFromDef(s);
    const rarityText = this.getRarityText(rarity);
    const rarityColors = this.getRarityColors(rarity);
    this.skillTooltipRarity.setText(rarityText);
    this.skillTooltipRarity.setTint(rarityColors.border);
    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.skillTooltipTitle.setColor(rarityHex);

    const c = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL;
    const tooltipWidth = this._tooltipWidth;
    const scaleX = Math.max(
      this.skillTooltipDesc.scaleX || 1,
      this.skillTooltipPrereq.scaleX || 1,
      this.skillTooltipCost.scaleX || 1
    );
    const wrapWidth = tooltipWidth - c.TOOLTIP_PADDING * 2;
    const wrapWidthPreScale = Math.max(0, wrapWidth / scaleX);

    this.skillTooltipTitle.setStyle({
      ...this.skillTooltipTitle.style,
      wordWrap: {},
      align: "center",
    });

    const costLineSpacing = this.skillTooltipCost.lineSpacing;
    const descLineSpacing = this.skillTooltipDesc.lineSpacing;
    const prereqLineSpacing = this.skillTooltipPrereq.lineSpacing;

    this.skillTooltipCost.setStyle({
      ...this.skillTooltipCost.style,
      wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
    });
    this.skillTooltipCost.setLineSpacing(costLineSpacing);

    this.skillTooltipDesc.setStyle({
      ...this.skillTooltipDesc.style,
      wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
    });
    this.skillTooltipDesc.setColor("#ffffff");
    this.skillTooltipDesc.setOrigin(0, 0);
    this.skillTooltipDesc.setLineSpacing(descLineSpacing);

    if (this.skillTooltipPrereq.text) {
      this.skillTooltipPrereq.setStyle({
        ...this.skillTooltipPrereq.style,
        wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
      });
      this.skillTooltipPrereq.setLineSpacing(prereqLineSpacing);
    }

    if (this.skillTooltipSectionHeader) {
      if (showSectionHeader) {
        this.skillTooltipSectionHeader.setText(i18next.t("championSelect:tooltip.requiredEssenceHeader", { defaultValue: "REQUIRED ESSENCE" }));
        this.skillTooltipSectionHeader.setVisible(true);
      } else {
        this.skillTooltipSectionHeader.setText("");
        this.skillTooltipSectionHeader.setVisible(false);
      }
    }
    if (this.skillTooltipSectionLine) {
      this.skillTooltipSectionLine.setVisible(showSectionHeader);
    }

    if (this.skillTooltipDescHeader) {
      if (showDescHeader) {
        this.skillTooltipDescHeader.setText(i18next.t("championSelect:tooltip.descriptionHeader", { defaultValue: "DESCRIPTION" }));
        this.skillTooltipDescHeader.setVisible(true);
      } else {
        this.skillTooltipDescHeader.setText("");
        this.skillTooltipDescHeader.setVisible(false);
      }
    }
    if (this.skillTooltipDescLine) {
      this.skillTooltipDescLine.setVisible(showDescHeader);
    }

    if (this.skillTooltipDetailHeader) {
      if (showDetailHeader && detailHeaderKey) {
        this.skillTooltipDetailHeader.setText(i18next.t(detailHeaderKey, { defaultValue: detailHeaderKey.split(".").pop()?.replace(/Header$/, "").toUpperCase() || "" }));
        this.skillTooltipDetailHeader.setVisible(true);
      } else {
        this.skillTooltipDetailHeader.setText("");
        this.skillTooltipDetailHeader.setVisible(false);
      }
    }
    if (this.skillTooltipDetailLine) {
      this.skillTooltipDetailLine.setVisible(showDetailHeader);
    }
    let detailNameText = "";
    let detailBodyText = detailText;
    if (showDetailHeader && detailText) {
      const colonIdx = detailText.indexOf(": ");
      if (colonIdx > 0) {
        detailNameText = detailText.substring(0, colonIdx);
        detailBodyText = detailText.substring(colonIdx + 2);
      }
    }
    if (this.skillTooltipDetailName) {
      if (showDetailHeader && detailNameText) {
        this.skillTooltipDetailName.setText(detailNameText);
        this.skillTooltipDetailName.setVisible(true);
        this.skillTooltipDetailName.setColor(rarityHex);
        this.skillTooltipDetailName.setStyle({
          ...this.skillTooltipDetailName.style,
          wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
        });
      } else {
        this.skillTooltipDetailName.setText("");
        this.skillTooltipDetailName.setVisible(false);
      }
    }
    if (this.skillTooltipDetail) {
      if (showDetailHeader && detailBodyText) {
        this.skillTooltipDetail.setText(detailBodyText);
        this.skillTooltipDetail.setVisible(true);
        this.skillTooltipDetail.setColor("#F0F0F0");
        this.skillTooltipDetail.setStyle({
          ...this.skillTooltipDetail.style,
          wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
        });
      } else {
        this.skillTooltipDetail.setText("");
        this.skillTooltipDetail.setVisible(false);
      }
    }

    if (this.skillTooltipLore) {
      if (showLore) {
        this.skillTooltipLore.setText(loreText);
        this.skillTooltipLore.setVisible(true);
        this.skillTooltipLore.setStyle({
          ...this.skillTooltipLore.style,
          fontSize: `${this._hintStripeFontSize}px`,
          fontStyle: "italic",
          color: "#B0B0B0",
          wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true },
          align: "center"
        });
      } else {
        this.skillTooltipLore.setText("");
        this.skillTooltipLore.setVisible(false);
      }
    }

    const barsHeight = c.TOOLTIP_TITLE_BAR_HEIGHT + c.TOOLTIP_RARITY_BAR_HEIGHT;
    const prereqHeight = this.skillTooltipPrereq.text ? this.skillTooltipPrereq.displayHeight : 0;
    const loreTextH = showLore && this.skillTooltipLore ? Math.min(this.skillTooltipLore.displayHeight, 40) : 0;
    const loreBarHeight = showLore ? loreTextH + c.TOOLTIP_LORE_BAR_PADDING_V * 2 : 0;

    const textX = c.TOOLTIP_PADDING + 2;
    const centerX = tooltipWidth / 2 + 2;

    this.skillTooltipTitle.setPosition(centerX, c.TOOLTIP_TITLE_TEXT_Y + 2);
    this.skillTooltipRarity.setPosition(centerX, c.TOOLTIP_RARITY_TEXT_Y);

    let currentY = c.TOOLTIP_CONTENT_Y + 2;

    if (showDescHeader && this.skillTooltipDescHeader && this.skillTooltipDescLine) {
      const dHeaderHeight = this.skillTooltipDescHeader.displayHeight;
      const dHeaderCenterY = currentY + dHeaderHeight / 2;
      this.skillTooltipDescHeader.setPosition(textX, dHeaderCenterY);
      this.skillTooltipDescLine.clear();
      this.skillTooltipDescLine.lineStyle(c.TOOLTIP_SECTION_LINE_THICKNESS, c.TOOLTIP_SECTION_LINE_COLOR, c.TOOLTIP_SECTION_LINE_ALPHA);
      const dLineStartX = textX + this.skillTooltipDescHeader.displayWidth + 4;
      const dLineEndX = tooltipWidth - c.TOOLTIP_PADDING - 2;
      if (dLineEndX > dLineStartX) {
        this.skillTooltipDescLine.lineBetween(dLineStartX, dHeaderCenterY, dLineEndX, dHeaderCenterY);
      }
      currentY += dHeaderHeight + c.TOOLTIP_SECTION_HEADER_SPACING;
    }

    this.skillTooltipDesc.setPosition(textX, currentY);
    currentY += this.skillTooltipDesc.displayHeight + c.TOOLTIP_TEXT_SPACING;

    if (showDetailHeader && this.skillTooltipDetailHeader && this.skillTooltipDetailLine) {
      const dtHeaderHeight = this.skillTooltipDetailHeader.displayHeight;
      const dtHeaderCenterY = currentY + dtHeaderHeight / 2;
      this.skillTooltipDetailHeader.setPosition(textX, dtHeaderCenterY);
      this.skillTooltipDetailLine.clear();
      this.skillTooltipDetailLine.lineStyle(c.TOOLTIP_SECTION_LINE_THICKNESS, c.TOOLTIP_SECTION_LINE_COLOR, c.TOOLTIP_SECTION_LINE_ALPHA);
      const dtLineStartX = textX + this.skillTooltipDetailHeader.displayWidth + 4;
      const dtLineEndX = tooltipWidth - c.TOOLTIP_PADDING - 2;
      if (dtLineEndX > dtLineStartX) {
        this.skillTooltipDetailLine.lineBetween(dtLineStartX, dtHeaderCenterY, dtLineEndX, dtHeaderCenterY);
      }
      currentY += dtHeaderHeight + c.TOOLTIP_SECTION_HEADER_SPACING;
    }
    if (showDetailHeader && this.skillTooltipDetailName && detailNameText) {
      this.skillTooltipDetailName.setPosition(textX, currentY);
      currentY += this.skillTooltipDetailName.displayHeight + c.TOOLTIP_SECTION_HEADER_SPACING;
    }
    if (showDetailHeader && this.skillTooltipDetail) {
      this.skillTooltipDetail.setPosition(textX, currentY);
      currentY += this.skillTooltipDetail.displayHeight + c.TOOLTIP_TEXT_SPACING;
    }

    if (showSectionHeader && this.skillTooltipSectionHeader && this.skillTooltipSectionLine) {
      const headerHeight = this.skillTooltipSectionHeader.displayHeight;
      const headerCenterY = currentY + headerHeight / 2;
      this.skillTooltipSectionHeader.setPosition(textX, headerCenterY);
      this.skillTooltipSectionLine.clear();
      this.skillTooltipSectionLine.lineStyle(c.TOOLTIP_SECTION_LINE_THICKNESS, c.TOOLTIP_SECTION_LINE_COLOR, c.TOOLTIP_SECTION_LINE_ALPHA);
      const lineStartX = textX + this.skillTooltipSectionHeader.displayWidth + 4;
      const lineEndX = tooltipWidth - c.TOOLTIP_PADDING - 2;
      if (lineEndX > lineStartX) {
        this.skillTooltipSectionLine.lineBetween(lineStartX, headerCenterY, lineEndX, headerCenterY);
      }
      currentY += headerHeight + c.TOOLTIP_SECTION_HEADER_SPACING;
    }

    if (this.skillTooltipCostContainer && this.skillTooltipCostContainer.visible) {
      this.skillTooltipCostContainer.setPosition(textX, currentY);
      currentY += ((this.skillTooltipCostContainer as any)._measuredHeight || 0) + c.TOOLTIP_TEXT_SPACING;
    } else if (this.skillTooltipCost.visible && this.skillTooltipCost.text) {
      this.skillTooltipCost.setPosition(textX, currentY);
      currentY += this.skillTooltipCost.displayHeight + c.TOOLTIP_TEXT_SPACING;
    }

    this.skillTooltipPrereq.setPosition(textX, currentY);
    if (prereqHeight > 0) {
      currentY += prereqHeight + c.TOOLTIP_TEXT_SPACING;
    }

    const tooltipHeight = Math.max(
      c.TOOLTIP_MIN_HEIGHT,
      barsHeight + (currentY - (c.TOOLTIP_CONTENT_Y + 2)) + c.TOOLTIP_PADDING + loreBarHeight + this._tooltipHeightOffset
    );

    if (showLore && this.skillTooltipLore) {
      const loreBarY = tooltipHeight - this._hintStripeBottomInset - loreBarHeight;
      this.skillTooltipLore.setPosition(centerX - 2 + this._hintStripeTextX, loreBarY + this._hintStripeTextY);
      this.skillTooltipLore.setAlpha(this._hintLoreAlpha);
      if (this.skillTooltipLore.displayHeight > 40) {
        this.skillTooltipLore.setCrop(0, 0, tooltipWidth, 40);
      } else {
        this.skillTooltipLore.setCrop();
      }
    }

    this.skillTooltipBg.setSize(tooltipWidth, tooltipHeight);

    this.skillTooltipTitleBarBg.clear();
    this.skillTooltipRarityBarBg.clear();

    this.skillTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.skillTooltipRarityBarBg.fillRect(
      2,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RARITY_BAR_Y,
      tooltipWidth - 4,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RARITY_BAR_HEIGHT
    );

    if (this.skillTooltipLoreBarBg) {
      this.skillTooltipLoreBarBg.clear();
      if (showLore && loreBarHeight > 0) {
        const loreBarY = tooltipHeight - this._hintStripeBottomInset - loreBarHeight;
        this.skillTooltipLoreBarBg.fillStyle(0x0f0f1e, this._hintLoreAlpha);
        this.skillTooltipLoreBarBg.fillRect(2, loreBarY, tooltipWidth - 4, loreBarHeight);
      }
    }

    const focIconX = this._isHoverTooltip ? this._hoveredIconBarX : ((this as any)._focusedIconBarX ?? 0);
    const focIconY = this._isHoverTooltip ? this._hoveredIconBarY : ((this as any)._focusedIconBarY ?? 0);
    const barContainerX = this.skillIconBarContainer ? this.skillIconBarContainer.x : 0;
    const barContainerY = this.skillIconBarContainer ? this.skillIconBarContainer.y : 0;
    const iconAbsX = barContainerX + focIconX;
    const iconAbsY = barContainerY + focIconY;
    const iconHalfW = 23;
    const tipGap = 4;
    const tipMargin = 4;
    const screenW = this.getWidth();
    const screenH = this.getHeight();
    const xRight = iconAbsX + iconHalfW + tipGap;
    const xLeft = iconAbsX - iconHalfW - tipGap - tooltipWidth;
    let tooltipX = xRight + tooltipWidth > screenW ? xLeft : xRight;
    tooltipX = Math.max(tipMargin, Math.min(screenW - tooltipWidth - tipMargin, tooltipX));
    let tooltipY = iconAbsY - tooltipHeight / 2;
    tooltipY = Math.max(tipMargin, Math.min(screenH - tooltipHeight - tipMargin, tooltipY));
    this.skillTooltipContainer?.setPosition(tooltipX + this._tooltipOffsetX, tooltipY + this._tooltipOffsetY);
    this.skillTooltipContainer?.setVisible(true);
  }

  private updateSkillTooltipForHover(championId: string, hoverIdx: number): void {
    const saved = this.selectedSkillIndex;
    this.selectedSkillIndex = hoverIdx;
    this.updateSkillTooltip(championId);
    this.selectedSkillIndex = saved;
  }

  private getSkillDescription(championId: string, unlockLevel: number, skillDef: any): string {
    if (skillDef?.rewardType) {
      const { overrideDesc, normalizedData } = this.getDefaultRewardOverride(championId, skillDef);
      if (overrideDesc) {
        return overrideDesc;
      }
      const nodeGen = new SkillTreeNodeGenerator(0, championId, this.scene as BattleScene, true);

      const rewardData: SkillTreeReward = {
        type: skillDef.rewardType,
        data: normalizedData ?? (skillDef.data || {
          species: skillDef.unlockableId,
          move: skillDef.unlockableId,
          moveId: skillDef.unlockableId,
          ability: skillDef.unlockableId,
          abilityId: skillDef.unlockableId,
          item: skillDef.unlockableId,
          tier: skillDef.unlockableId,
          type: skillDef.unlockableId,
          megaStone: skillDef.unlockableId,
          formChangeItem: skillDef.unlockableId,
          altBuildId: skillDef.unlockableId,
          permaType: skillDef.unlockableId,
          upgradePath: skillDef.unlockableId,
          formKey: skillDef.formKey,
          unlockableId: skillDef.unlockableId,
          amount: skillDef.amount,
          stats: skillDef.stats
        }),
        immediate: false
      };

      if (skillDef.rewardType === SkillTreeRewardType.POKEMON_ALT_BUILD) {
          const altBuildId = rewardData.data.altBuildId;
          if (altBuildId && (!rewardData.data.species || rewardData.data.species === altBuildId)) {
               const def = POKEMON_ALT_BUILDS[altBuildId as any];
               if (def) {
                   rewardData.data.species = def.species;
                   rewardData.data.stats = def.statFocus;
                   rewardData.data.formKey = def.spriteVariant;
               }
          }
      }

      if (rewardData.type === SkillTreeRewardType.GENERAL_POKEMON && rewardData.data && rewardData.data.unlockLevel === undefined) {
        rewardData.data.unlockLevel = unlockLevel;
      }

      if (rewardData.type === SkillTreeRewardType.GLITCH_FORM_UNLOCK) {
        rewardData.data = rewardData.data || {};
        rewardData.data.permanent = true;
      }

      return nodeGen.getRewardDescription(rewardData);
    }

    const resolvedChampionId = this.resolveChampionId(championId);
    const skillDescKey = `championSkills:${resolvedChampionId}.level_${unlockLevel}.description`;
    return (i18next.t(skillDescKey, { defaultValue: "" }) as unknown as string) || "";
  }

  private getSkillStructuredDescription(championId: string, unlockLevel: number, skillDef: any): RewardTooltipSections {
    if (!skillDef?.rewardType) {
      return { summary: this.getSkillDescription(championId, unlockLevel, skillDef) };
    }

    const { overrideDesc, normalizedData } = this.getDefaultRewardOverride(championId, skillDef);
    if (overrideDesc) {
      const headerKey = this.getDetailHeaderKeyForRewardType(skillDef.rewardType);
      return { summary: overrideDesc, detailHeaderKey: headerKey };
    }

    const viewChampionId = this.resolveChampionId(championId);
    const nodeGen = new SkillTreeNodeGenerator(0, viewChampionId, this.scene as BattleScene, true);
    const rewardData: SkillTreeReward = {
      type: skillDef.rewardType,
      data: normalizedData ?? (skillDef.data || Object.assign({}, {
        species: skillDef.unlockableId,
        moveId: skillDef.unlockableId,
        move: skillDef.unlockableId,
        abilityId: skillDef.unlockableId,
        ability: skillDef.unlockableId,
        item: skillDef.unlockableId,
        tier: skillDef.unlockableId,
        type: skillDef.unlockableId,
        megaStone: skillDef.unlockableId,
        formChangeItem: skillDef.unlockableId,
        altBuildId: skillDef.unlockableId,
        permaType: skillDef.unlockableId,
        upgradePath: skillDef.unlockableId,
        formKey: skillDef.formKey,
        unlockableId: skillDef.unlockableId,
        amount: skillDef.amount,
        stats: skillDef.stats
      })),
      immediate: false
    };

    if (skillDef.rewardType === SkillTreeRewardType.POKEMON_ALT_BUILD) {
      const altBuildId = rewardData.data.altBuildId;
      if (altBuildId && (!rewardData.data.species || rewardData.data.species === altBuildId)) {
        const def = POKEMON_ALT_BUILDS[altBuildId as any];
        if (def) {
          rewardData.data.species = def.species;
          rewardData.data.stats = def.statFocus;
          rewardData.data.formKey = def.spriteVariant;
        }
      }
    }

    if (rewardData.type === SkillTreeRewardType.GENERAL_POKEMON && rewardData.data && rewardData.data.unlockLevel === undefined) {
      rewardData.data.unlockLevel = unlockLevel;
    }

    if (rewardData.type === SkillTreeRewardType.GLITCH_FORM_UNLOCK) {
      rewardData.data = rewardData.data || {};
      rewardData.data.permanent = true;
    }

    return nodeGen.getStructuredDescription(rewardData);
  }

  private getDetailHeaderKeyForRewardType(rewardType: SkillTreeRewardType): string | undefined {
    switch (rewardType) {
      case SkillTreeRewardType.ABILITY_GRANT:
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
      case SkillTreeRewardType.SMITTY_ABILITY:
      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
      case SkillTreeRewardType.TERA_ABILITY:
      case SkillTreeRewardType.PARTY_ABILITY_GRANT:
        return "championSelect:tooltip.abilityHeader";
      case SkillTreeRewardType.TM_FILTERED:
      case SkillTreeRewardType.XM_FILTERED:
      case SkillTreeRewardType.MEGA_STONE:
      case SkillTreeRewardType.DYNA_MUSHROOM:
      case SkillTreeRewardType.GLITCH_CHANGE:
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
      case SkillTreeRewardType.PERMA_ITEM:
      case SkillTreeRewardType.HEALING_ITEMS:
      case SkillTreeRewardType.MEMORY_MUSHROOM:
      case SkillTreeRewardType.BERRY_ITEMS:
      case SkillTreeRewardType.ABILITY_SWITCHER:
      case SkillTreeRewardType.GENERAL_ITEMS:
      case SkillTreeRewardType.BATON_ITEM:
      case SkillTreeRewardType.PP_MAX_ITEM:
      case SkillTreeRewardType.ROGUE_BALL:
      case SkillTreeRewardType.GOLDEN_POKEBALL:
      case SkillTreeRewardType.MASTER_BALL:
      case SkillTreeRewardType.VOID_BALL:
      case SkillTreeRewardType.TYPE_BALL_FILTERED:
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
      case SkillTreeRewardType.EGG_VOUCHER:
      case SkillTreeRewardType.MONEY_REWARD:
      case SkillTreeRewardType.PERMA_MONEY:
      case SkillTreeRewardType.TERA_TYPE:
        return "championSelect:tooltip.itemDescriptionHeader";
      default:
        return "championSelect:tooltip.skillInfoHeader";
    }
  }

  private getDefaultRewardOverride(championId: string, skillDef: any): { overrideDesc?: string; normalizedData?: any } {
    if (!skillDef?.isDefault) {
      return {};
    }
    const resolvedChampionId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[resolvedChampionId] as any;
    const types = this.buildDefaultRewardTypes(def, skillDef);
    const typeLabel = this.isRandomTypeChampion(resolvedChampionId)
      ? this.getPreviewTypesLabel()
      : types.length
        ? types.map(t => this.getDefaultTypeDisplayName(t)).join(" / ")
        : i18next.t("championSelect:tooltip.typesFallback", { defaultValue: "Unknown" });

    switch (skillDef.rewardType) {
      case SkillTreeRewardType.TM_FILTERED: {
        if (skillDef.data?.moveId !== undefined) return {};
        const defaultValue = `Teach a ${typeLabel} TM to a Pokémon`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultTm", { types: typeLabel, defaultValue })
        };
      }
      case SkillTreeRewardType.XM_FILTERED: {
        if (skillDef.data?.moveId !== undefined) return {};
        const defaultValue = `Teach a ${typeLabel} XM to a Pokémon`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultXm", { types: typeLabel, defaultValue })
        };
      }
      case SkillTreeRewardType.ESSENCE_BUNDLE: {
        const amount = skillDef.data?.amount ?? 5;
        const normalizedData = {
          ...(skillDef.data || {}),
          type: types[0] ?? Type.UNKNOWN,
          amount
        };
        const defaultValue = `Add ${amount} ${typeLabel} Type Essences to your collection`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultEssence", { types: typeLabel, amount, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: {
        const normalizedData = {
          ...(skillDef.data || {}),
          type: types[0] ?? Type.UNKNOWN
        };
        const defaultValue = `Receive a ${typeLabel} Type Booster item`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultBooster", { types: typeLabel, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.REVIVE_BOOST: {
        const amount = skillDef.data?.amount ?? 0.15;
        const normalizedData = {
          ...(skillDef.data || {}),
          types: types.length ? types : [Type.UNKNOWN],
          amount
        };
        const percent = Math.round(amount * 100);
        const defaultValue = `Increase revive chance for ${typeLabel} Pokémon by ${percent}%`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultRevive", { types: typeLabel, percent, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: {
        const weight = skillDef.data?.weight ?? 1;
        const normalizedData = {
          ...(skillDef.data || {}),
          type: types[0] ?? Type.UNKNOWN,
          weight
        };
        const defaultValue = `Increase ${typeLabel} Essence drop weight by ${weight}`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultEssenceWeight", { types: typeLabel, weight, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.CATCH_RATE_BONUS: {
        const amount = skillDef.data?.amount ?? 0.1;
        const normalizedData = {
          ...(skillDef.data || {}),
          types: types.length ? types : [Type.UNKNOWN],
          amount
        };
        const percent = Math.round(amount * 100);
        const defaultValue = `Increase catch rate for ${typeLabel} Pokémon by ${percent}%`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultCatchRate", { types: typeLabel, percent, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: {
        const normalizedData = {
          ...(skillDef.data || {}),
          types: types.length ? types : [Type.UNKNOWN]
        };
        const defaultValue = `Increase fusion priority for ${typeLabel} Pokémon`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultFusionPriority", { types: typeLabel, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.TERA_ABILITY: {
        const normalizedData = {
          ...(skillDef.data || {}),
          types: types.length ? types : [Type.UNKNOWN]
        };
        const defaultValue = `Use ${typeLabel} to activate Tera Abilities`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultTeraAbility", { types: typeLabel, defaultValue }),
          normalizedData
        };
      }
      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const bondChampionName = ChampionUtils.getChampionDisplayName(championId);
        const bondDefaultValue = `Select a Limit Break ability for ${bondChampionName}`;
        return {
          overrideDesc: i18next.t("skillTree:descriptions.trainerBondGeneric", { champion: bondChampionName, defaultValue: bondDefaultValue }),
        };
      }
      case SkillTreeRewardType.SKILL_TREE_TOKENS: {
        const defaultValue = `Receive X Skill Tree Tokens to unlock nodes`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultTokens", { defaultValue })
        };
      }
      case SkillTreeRewardType.SKILL_POINTS: {
        const defaultValue = `Receive X Skill Points to purchase skills`;
        return {
          overrideDesc: i18next.t("championSelect:tooltip.defaultPoints", { defaultValue })
        };
      }
      case SkillTreeRewardType.MOVE_UPGRADE: {
        const upgradePath = skillDef.data?.upgradePath;
        if (upgradePath === undefined) {
          return {};
        }
        const normalizedData = {
          ...(skillDef.data || {}),
          filterUpgrades: {
            ...(skillDef.data?.filterUpgrades || {}),
            moveUpgrades: [upgradePath]
          }
        };
        return { normalizedData };
      }
      default:
        return {};
    }
  }

  private buildDefaultRewardTypes(def: any, skillDef: any): Type[] {
    const collected: Type[] = [];
    if (Array.isArray(skillDef.data?.types)) {
      collected.push(
        ...skillDef.data.types.filter((t: Type | undefined): t is Type => t !== undefined)
      );
    }
    if (def?.type1 !== undefined) {
      collected.push(def.type1 as Type);
    }
    if (def?.type2 !== undefined) {
      collected.push(def.type2 as Type);
    }
    return Array.from(new Set(collected));
  }

  private getDefaultTypeDisplayName(type?: Type): string {
    if (type === undefined) {
      return i18next.t("championSelect:tooltip.typesFallback", { defaultValue: "Unknown" });
    }
    if (type === Type.UNKNOWN) {
      return "???";
    }
    const key = Type[type];
    return i18next.t(`pokemonInfo:Type.${key}`, { defaultValue: key });
  }

  private isRandomTypeChampion(championId: string): boolean {
    const id = this.resolveChampionId(championId);
    return id === "red" || id === "apollo" || id === "diana" || id === "apollo_diana";
  }

  private getPreviewTypesLabel(): string {
    return i18next.t("skillTree:randomTypesLabel", { defaultValue: "RANDOM" });
  }

  private updateGridSpriteSelection(selectedChampionId: string): void {

    const uiTheme = (this.scene as BattleScene).uiTheme;
    const windowColor = getTextColor(TextStyle.WINDOW, false, uiTheme);
    const windowColorNum = Phaser.Display.Color.HexStringToColor(windowColor).color;

    this.championSprites.forEach((sprite, index) => {
      const id = this.availableChampions[index];
      const isUnlocked = this.championManager.isChampionUnlocked(id) || (this.championManager.getChampionData(id)?.isUnlocked === true);
      const cellBg = this.gridCellBackgrounds[index];
      const col = index % ChampionSelectUiHandler.UI_CONSTANTS.GRID.COLS;
      const row = Math.floor(index / ChampionSelectUiHandler.UI_CONSTANTS.GRID.COLS);
      const x = ChampionSelectUiHandler.UI_CONSTANTS.GRID.START_X + (col * ChampionSelectUiHandler.UI_CONSTANTS.GRID.SPACING_X);
      const y = ChampionSelectUiHandler.UI_CONSTANTS.GRID.START_Y + (row * ChampionSelectUiHandler.UI_CONSTANTS.GRID.ROW_GAP);
      const cellSize = ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_SIZE;

      if (cellBg) {
        cellBg.clear();
        if (id === selectedChampionId) {

          cellBg.lineStyle(ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_SELECTED_BORDER_THICKNESS, 0xffcc00, ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_SELECTED_BORDER_ALPHA);
          cellBg.strokeRect(x - cellSize/2, y - cellSize/2, cellSize, cellSize);
        } else {

          cellBg.lineStyle(ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_BORDER_THICKNESS, windowColorNum, ChampionSelectUiHandler.UI_CONSTANTS.GRID.CELL_BORDER_ALPHA);
          cellBg.strokeRect(x - cellSize/2, y - cellSize/2, cellSize, cellSize);
        }
      }

      if (id === selectedChampionId) {

        const baseScale = this.getGridScaleForChampion(id);
        sprite.setScale(baseScale * 1.2);
        if (!isUnlocked) {
          this.applyLockedSpriteEffect(sprite, true);
        } else {

        sprite.resetPipeline();
        sprite.setTint(0xffcc00);
        sprite.setAlpha(1.0);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
        }
      } else {

        const baseScale = this.getGridScaleForChampion(id);
        sprite.setScale(baseScale);
        if (isUnlocked) {
        sprite.resetPipeline();
        sprite.clearTint();
          sprite.setAlpha(1.0);
          sprite.setBlendMode(Phaser.BlendModes.NORMAL);
        } else {
          this.applyLockedSpriteEffect(sprite, true);
        }
      }
    });
  }

  private layoutSkillListPanel(): void {
    if (!this.skillListPanelContainer || !this.skillListPanelBg) return;

    const halfWidth = Math.floor(ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.WIDTH / 2);
    const radius = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.RADIUS;
    const drawHeight = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.HEIGHT;

    this.skillListPanelBg.clear();
    this.skillListPanelBg.fillStyle(0x000000, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BG_ALPHA);
    this.skillListPanelBg.lineStyle(
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BORDER_THICKNESS,
      0xffffff,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.BORDER_ALPHA
    );

    const bgX = -halfWidth;
    const bgY = -Math.floor(drawHeight / 2);
    const bgW = halfWidth * 2;
    const bgH = drawHeight;

    this.skillListPanelBg.fillRoundedRect(bgX, bgY, bgW, bgH, radius);
    this.skillListPanelBg.strokeRoundedRect(bgX, bgY, bgW, bgH, radius);
  }

  private applyLockedSpriteEffect(sprite: Phaser.GameObjects.Sprite, isGrid: boolean = false): void {
    if ((this.scene as any).spritePipeline) {
      if (isGrid) {
        sprite.setPipeline((this.scene as any).spritePipeline, {
          tone: [0.0, 0.0, 0.0, 0.0],
          hasShadow: false,
          ignoreTimeTint: true,
          baseColor: [0.08, 0.0, 0.22],
          teraColor: [140, 30, 200]
        });
        sprite.clearTint();
      } else {
        sprite.setPipeline((this.scene as any).spritePipeline, {
          tone: [0.0, 0.0, 0.0, 0.0],
          hasShadow: false,
          baseColor: [0, 0, 0],
          teraColor: [196, 64, 196]
        });
        sprite.clearTint();
      }
      sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      sprite.setAlpha(1.0);
    } else {
      sprite.resetPipeline();
      if (isGrid) {
        sprite.setTintFill(0xE1B4FF);
        sprite.setAlpha(1.0);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      } else {
        sprite.setTint(0x000000);
        sprite.setAlpha(ChampionSelectUiHandler.UI_CONSTANTS.GRID.LOCKED_ALPHA);
        sprite.setBlendMode(Phaser.BlendModes.MULTIPLY);
      }
    }
  }

  private displayFullChampionSprite(championId: string): void {
    if (this.fullChampionSprite) { this.fullChampionSprite.destroy(); this.fullChampionSprite = null; }
    if (this.fullChampionTintSprite) { this.fullChampionTintSprite.destroy(); this.fullChampionTintSprite = null; }
    if ((this as any)._portraitTileFrame) { (this as any)._portraitTileFrame.destroy(); (this as any)._portraitTileFrame = null; }
    if ((this as any)._portraitSilverGlow) { (this as any)._portraitSilverGlow.destroy(); (this as any)._portraitSilverGlow = null; }

    const key = this.getChampionTrainerSpriteKey(championId);
    const isUnlocked = this.championManager.isChampionUnlocked(championId) || (this.championManager.getChampionData(championId)?.isUnlocked === true);
    const uiChampionId = this.resolveChampionId(championId);

    const tileY = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_Y;
    const spriteOffsetY = this.getSpriteOffsetYForChampion(uiChampionId);
    const spriteY = tileY + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_Y_OFFSET + spriteOffsetY;
    const previewScale = this.getPreviewScaleForChampion(uiChampionId);

    const tileW = 80;
    const tileH = 70;
    const frameX = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X;
    try {
      const silverTile = this.scene.add.nineslice(
        frameX, tileY,
        "newchampion_silver_focus_tilex", undefined,
        tileW, tileH, 5, 5, 5, 5
      );
      silverTile.setOrigin(0.5, 0.5);
      silverTile.setScale(0.840);
      silverTile.setDepth(0);
      silverTile.setTint(0xC8D0D8);
      if (silverTile.postFX && typeof silverTile.postFX.addGlow === "function") {
        silverTile.postFX.addGlow(0xffffff, 6, 0, false, 0.20, 14);
      }
      (this as any)._portraitSilverGlow = null;
      this.previewContainer.add(silverTile);
      (this as any)._portraitTileFrame = silverTile;
    } catch {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x222337, 0.82);
      bg.fillRoundedRect(frameX - tileW / 2, tileY - tileH / 2, tileW, tileH, 4);
      bg.setDepth(0);
      this.previewContainer.add(bg);
      (this as any)._portraitTileFrame = bg;
    }

    const adjustedSpriteX = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X + this.getSpriteOffsetXForChampion(uiChampionId);
    const adjustedSpriteY = spriteY - 3;
    const adjustedSpriteScale = (previewScale * 1.1) + 0.040;

    this._portraitMaskH = this.getMaskHForChampion(uiChampionId);
    this._portraitMaskOffsetY = this.getMaskOffsetYForChampion(uiChampionId);
    this._portraitMaskLeftExtend = this.getPortraitMaskLeftExtend(uiChampionId);

    this.fullChampionSprite = this.scene.add.sprite(adjustedSpriteX, adjustedSpriteY, key);
    this.fullChampionSprite.setOrigin(0.5, 0.5);
    this.fullChampionSprite.setScale(adjustedSpriteScale);
    this.fullChampionSprite.setFlipX(true);
    this.fullChampionSprite.setDepth(1);
    this.fullChampionSprite.setVisible(isUnlocked);
    try {
      const tex = this.fullChampionSprite.texture;
      const frameNames = tex.getFrameNames();
      if (frameNames.length > 1 && frameNames.includes("0001.png")) {
        this.fullChampionSprite.setFrame("0001.png");
      }
    } catch {}

    this.fullChampionTintSprite = this.scene.add.sprite(adjustedSpriteX, adjustedSpriteY, key);
    this.fullChampionTintSprite.setOrigin(0.5, 0.5);
    this.fullChampionTintSprite.setScale(adjustedSpriteScale);
    this.fullChampionTintSprite.setFlipX(true);
    this.fullChampionTintSprite.setDepth(1);
    this.applyLockedSpriteEffect(this.fullChampionTintSprite);
    this.fullChampionTintSprite.setVisible(!isUnlocked);
    try {
      const tintTex = this.fullChampionTintSprite.texture;
      const tintFrameNames = tintTex.getFrameNames();
      if (tintFrameNames.length > 1 && tintFrameNames.includes("0001.png")) {
        this.fullChampionTintSprite.setFrame("0001.png");
      }
    } catch {}

    if (this.portraitSpriteContainer) {
      this.portraitSpriteContainer.add(this.fullChampionSprite);
      this.portraitSpriteContainer.add(this.fullChampionTintSprite);
    } else {
      this.previewContainer.add(this.fullChampionSprite);
      this.previewContainer.add(this.fullChampionTintSprite);
    }

    this.updatePortraitMask(tileY, tileW, tileH);

    const tileBottomY = tileY + tileH / 2;
    const infoGap = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.INFO_BELOW_TILE ?? 5;
    const nameObj = (this as any)._previewName;
    const subtitleObj = (this as any)._previewSubtitle;
    const nameY = tileBottomY + infoGap;
    const subtitleY = nameY + 10;
    const levelY = nameY + 3;
    const typeIconY = nameY + 12;
    if (nameObj) {
      nameObj.setY(nameY);
    }
    if (subtitleObj && subtitleObj.text) {
      subtitleObj.setY(subtitleY);
    }
    if (this.levelText) {
      this.levelText.setY(levelY);
      if (nameObj) {
        const nameRightEdge = nameObj.x + (nameObj.displayWidth || 0);
        this.levelText.setX(nameRightEdge + 1);
      }
    }
    if (this.typeIcon1) this.typeIcon1.setY(typeIconY);
    if (this.typeIcon2) this.typeIcon2.setY(typeIconY);
    const affinityIcon = (this as any)._previewAffinityIcon as Phaser.GameObjects.Sprite | undefined;
    if (affinityIcon) affinityIcon.setY(typeIconY);
    const affinityOverlay = (this as any)._previewAffinityOverlay as Phaser.GameObjects.Text | undefined;
    if (affinityOverlay) affinityOverlay.setY(typeIconY);

    const bgTopY = tileBottomY + infoGap - 2;
    this.redrawPreviewTileBlackBg(this._tileBlackBgW, this._tileBlackBgH, bgTopY);

    this.previewContainer.sort("depth");
  }

  private getSpriteOffsetYForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const v = def?.ui?.spriteOffsetY;
      if (typeof v === "number") return v;
    } catch {}
    return 0;
  }

  private getSpriteOffsetXForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const v = def?.ui?.spriteOffsetX ?? def?.ui?.previewOffsetX;
      if (typeof v === "number") return v;
    } catch {}
    return 0;
  }

  private getMaskHForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const v = def?.ui?.maskH;
      if (typeof v === "number") return v;
    } catch {}
    return 58.8;
  }

  private getMaskOffsetYForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const v = def?.ui?.maskOffsetY;
      if (typeof v === "number") return v;
    } catch {}
    return 0;
  }

  private getPortraitMaskLeftExtend(championId: string): number {
    if (championId === "misty") return 1;
    return 0;
  }

  private getGridYOffsetForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.gridOffsetY;
      if (typeof offset === "number") return offset;
    } catch {}
    return 0;
  }

  private getGridScaleForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const scale = def?.ui?.gridScale;
      if (typeof scale === "number") return scale;
    } catch {}
    return ChampionSelectUiHandler.UI_CONSTANTS.GRID.SPRITE_SCALE;
  }

  private redrawPreviewTileBlackBg(w: number, h: number, topY: number): void {
    if (!this.previewTileBlackBg) return;
    this.previewTileBlackBg.clear();
    this.previewTileBlackBg.fillStyle(0x000000, this._tileBlackBgAlpha);
    this.previewTileBlackBg.fillRoundedRect(-w / 2, topY, w, h, { tl: 0, tr: 0, bl: 3, br: 3 });
  }

  private updatePortraitMask(previewY: number, tileW: number, tileH: number): void {
    if (!this.portraitMaskGfx) return;
    const tileScale = 0.840;
    const baseClipW = tileW * tileScale - 10;
    const clipW = baseClipW + this._portraitMaskLeftExtend;
    const clipH = this._portraitMaskH;
    const clipX = this.previewContainer.x + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X - baseClipW / 2 - this._portraitMaskLeftExtend;
    const clipY = this.previewContainer.y + previewY - clipH / 2 + this._portraitMaskOffsetY;
    this.portraitMaskGfx.clear();
    this.portraitMaskGfx.fillStyle(0xffffff);
    this.portraitMaskGfx.fillRect(clipX, clipY, clipW, clipH);
  }

  private refreshPortraitMask(): void {
    if (!this.portraitMaskGfx || !this.previewContainer) return;
    const championId = this.availableChampions?.[this.selectedChampionIndex];
    if (!championId) return;
    const def = CHAMPION_DEFINITIONS[championId] as any;
    const tileW = def?.ui?.tileWidth ?? 80;
    const tileH = def?.ui?.tileHeight ?? 70;
    const tileY = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_Y;
    this.updatePortraitMask(tileY, tileW, tileH);
  }

  private refreshSkillTooltipIfActive(): void {
    if (this._isHoverTooltip) return;
    if (!this.skillTooltipActive) return;
    const id = this.availableChampions?.[this.selectedChampionIndex];
    if (id) this.updateSkillTooltip(id);
  }

  private getPreviewScaleForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const scale = def?.ui?.previewScale;
      if (typeof scale === "number") return scale;
    } catch {}
    return ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_SCALE;
  }

  private updateTypeIcons(championId: string): void {
    const preview = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW;
    const affinityText = ChampionUtils.getChampionAffinityLabel(championId);
    const affinityIcon = (this as any)._previewAffinityIcon as Phaser.GameObjects.Sprite | undefined;
    const affinityOverlay = (this as any)._previewAffinityOverlay as Phaser.GameObjects.Text | undefined;
    const resolvedId = this.resolveChampionId(championId);

    if (resolvedId === "red") {
      if (affinityIcon) affinityIcon.setVisible(false);
      if (affinityOverlay) affinityOverlay.setVisible(false);
      if (this.typeIcon1) {
        this.typeIcon1.setTexture("pbinfo_enemy_type");
        this.typeIcon1.setFrame("normal");
        this.typeIcon1.setTint(0x33CC33);
        this.typeIcon1.setX(preview.TYPE_SINGLE_X);
        this.typeIcon1.setVisible(true);
      }
      if (this.typeIcon2) this.typeIcon2.setVisible(false);
      return;
    }

    if (affinityText) {
      if (this.typeIcon1) this.typeIcon1.setVisible(false);
      if (this.typeIcon2) this.typeIcon2.setVisible(false);
      if (affinityIcon) {
        affinityIcon.setVisible(true);
        affinityIcon.setX(preview.TYPE_SINGLE_X);
      }
      if (affinityOverlay) {
        affinityOverlay.setText(affinityText);
        affinityOverlay.setVisible(true);
        affinityOverlay.setX(preview.TYPE_SINGLE_X);
      }
      return;
    }

    if (affinityIcon) affinityIcon.setVisible(false);
    if (affinityOverlay) affinityOverlay.setVisible(false);

    const data = this.championManager.getChampionData(championId);
    const def = CHAMPION_DEFINITIONS[championId] as any;
    const rawT1 = data?.type1 ?? def?.type1;
    const rawT2 = data?.type2 ?? def?.type2;
    const t1 = rawT1 !== undefined && rawT1 !== null && rawT1 !== Type.UNKNOWN ? rawT1 as Type : undefined;
    const t2 = rawT2 !== undefined && rawT2 !== null && rawT2 !== Type.UNKNOWN ? rawT2 as Type : undefined;

    if (t1 === undefined && t2 === undefined && (rawT1 === Type.UNKNOWN || rawT2 === Type.UNKNOWN) && this.typeIcon1) {
      const resolvedId = this.resolveChampionId(championId);
      if (resolvedId === "red") {
        this.typeIcon1.setTexture("pbinfo_enemy_type");
        this.typeIcon1.setFrame("normal");
        this.typeIcon1.setTint(0x33CC33);
      } else {
        this.typeIcon1.setTexture("pbinfo_enemy_type");
        this.typeIcon1.setFrame("unknown");
        this.typeIcon1.clearTint();
      }
      this.typeIcon1.setX(preview.TYPE_SINGLE_X);
      this.typeIcon1.setVisible(true);
      if (this.typeIcon2) this.typeIcon2.setVisible(false);
      return;
    }

    const baseTypeY = this.typeIcon1?.y ?? 0;

    if (t1 !== undefined && this.typeIcon1) {
      try {
        const hasDual = t2 !== undefined;
        this.typeIcon1.setTexture(hasDual ? "pbinfo_enemy_type1" : "pbinfo_enemy_type");
        this.typeIcon1.setFrame(Type[t1].toLowerCase());
        this.typeIcon1.clearTint();
        this.typeIcon1.setX(preview.TYPE_SINGLE_X);
        this.typeIcon1.setY(baseTypeY);
        this.typeIcon1.setVisible(true);
      } catch {
        this.typeIcon1.setVisible(false);
      }
    } else if (this.typeIcon1) {
      this.typeIcon1.setVisible(false);
    }

    if (t2 !== undefined && this.typeIcon2) {
      try {
        this.typeIcon2.setTexture("pbinfo_enemy_type2");
        this.typeIcon2.setFrame(Type[t2].toLowerCase());
        this.typeIcon2.setX(preview.TYPE_SINGLE_X);
        const icon1H = this.typeIcon1?.displayHeight ?? 0;
        this.typeIcon2.setY(baseTypeY + icon1H);
        this.typeIcon2.setVisible(true);
      } catch {
        this.typeIcon2.setVisible(false);
      }
    } else if (this.typeIcon2) {
      this.typeIcon2.setVisible(false);
    }
  }

  private updateEssenceGauge(championId: string, animate: boolean = false): void {
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    const data = this.championManager.getChampionData(championId);

    if (isUnlocked) {
      this.levelText?.setText(`Lv${data?.level ?? 1}`);
      this.updateProgressBarFill(championId);
      this.updateInlineEssenceCounters(championId);
      this.essenceInstructionText?.setText(i18next.t("championSelect:essenceHint", { defaultValue: "Use Required Essence to Level Up!" }));
      this.updateEssenceListPanel(championId);
      return;
    }

    const def = CHAMPION_DEFINITIONS[championId];
    const segments = this.buildLockedSegments(championId);

    if (segments.length === 0) {
      this.levelText?.setText(i18next.t("championSelect:locked", { defaultValue: "LOCKED" }));
      const desc = (def as any)?.unlockRequirements?.description || "";
      this.essenceInstructionText?.setText(desc);
      this.updateProgressBarFill(championId);
      this.updateInlineEssenceCounters(championId);
      this.updateEssenceListPanel(championId);
      return;
    }

    this.levelText?.setText(i18next.t("championSelect:locked", { defaultValue: "LOCKED" }));
    this.updateProgressBarFill(championId);
    this.updateInlineEssenceCounters(championId);
    this.essenceInstructionText?.setText(i18next.t("championSelect:essenceHint", { defaultValue: "Use Required Essence to Level Up!" }));
    this.updateEssenceListPanel(championId);
  }

  private updateLevelUpButton(championId: string): void {
    if (!this.useEssenceButtonContainer) return;
    const data = this.championManager.getChampionData(championId);
    const perTypeReq = ChampionXPManager.getPerTypeRequiredForLevel(data);
    const nextLevel = Math.max(1, ((data as any)?.level || 1) + 1);
    const lockedSkills = (data as any)?.lockedSkills || {};
    const nextSkillExists = Object.values(lockedSkills).some((s: any) => s?.unlockLevel === nextLevel);
    const isMaxLevel = !nextSkillExists && (!perTypeReq || !perTypeReq.length);

    if (isMaxLevel) {
      this.useEssenceButtonContainer.setVisible(false);
      if (this.xpBarContainer) this.xpBarContainer.setVisible(false);
      if ((this as any)._essenceCountersRow) (this as any)._essenceCountersRow.setVisible(false);
      if (this.nextSkillLabel) this.nextSkillLabel.setVisible(false);
      if (this._requirementBgContainer) this._requirementBgContainer.setVisible(false);
      if (this._nextSkillCostContainer) this._nextSkillCostContainer.setVisible(false);
      this.hideRequirementHoverZone();
      return;
    }

    if (this.xpBarContainer) this.xpBarContainer.setVisible(true);
    this.useEssenceButtonContainer.setVisible(true);
    const affordable = this.canAffordLevelUp(championId);
    const btnImg = (this as any)._useEssenceBtnImg as Phaser.GameObjects.Image | undefined;

    if (btnImg) btnImg.setVisible(true);
    if (this.useEssenceButtonIcon) this.useEssenceButtonIcon.setVisible(true);

    if (affordable && !this._showRequirementMode) {
      if (btnImg) {
        btnImg.clearTint();
        btnImg.setAlpha(1.0);
      }
      if (this.useEssenceButtonText) {
        this.useEssenceButtonText.setVisible(true);
        this.useEssenceButtonText.setText(i18next.t("championSelect:button.levelUp", { defaultValue: "Level Up" }));
        this.useEssenceButtonText.setAlpha(1.0);
        this.useEssenceButtonText.clearTint();
        this.useEssenceButtonText.setShadow(0, 0, undefined);
      }
      if (this.useEssenceButtonIcon) this.useEssenceButtonIcon.setAlpha(1.0);
      if (this._notEnoughEssenceIcon) this._notEnoughEssenceIcon.setVisible(false);
      this.updateBtnEssenceCostDisplay(championId);
      if (this._requirementBgContainer) this._requirementBgContainer.setVisible(false);
      this.hideRequirementHoverZone();
      if ((this as any)._essenceCountersRow) (this as any)._essenceCountersRow.setVisible(false);
    } else {
      if (btnImg) {
        btnImg.clearTint();
        btnImg.setAlpha(0.65);
      }
      if (this.useEssenceButtonText) {
        this.useEssenceButtonText.setVisible(true);
        this.useEssenceButtonText.setText(i18next.t("championSelect:button.notEnoughEssence", { defaultValue: "To Level Up:" }));
        this.useEssenceButtonText.setAlpha(1.0);
        this.useEssenceButtonText.setShadow(0, 0, undefined);
      }
      if (this.useEssenceButtonIcon) this.useEssenceButtonIcon.setAlpha(1.0);
      if (this._notEnoughEssenceIcon) {
        this._notEnoughEssenceIcon.setVisible(false);
      }
      this.updateBtnEssenceCostDisplay(championId);
      if ((this as any)._essenceCountersRow) (this as any)._essenceCountersRow.setVisible(false);
      if (this._requirementBgContainer) this._requirementBgContainer.setVisible(false);
      this.ensureRequirementHoverZone();
      this.updateRequirementHoverZonePosition();
    }
  }

  private updateLevelUpButtonDisplay(championId: string): void {
    if (!this.useEssenceButtonContainer) return;
    this.updateLevelUpButton(championId);
  }

  private updateBtnEssenceCostDisplay(championId: string): void {
    if (!this._btnEssenceCostContainer) return;

    const children = this._btnEssenceCostContainer.getAll();
    for (let i = children.length - 1; i >= 0; i--) {
      this._btnEssenceCostContainer.remove(children[i], true);
    }
    this._btnEssenceCostIcons = [];
    this._btnEssenceCostSpecialIcons = [];
    this._btnEssenceCostTexts = [];

    this._btnEssenceCostBg = this.scene.add.graphics();
    this._btnEssenceCostContainer.add(this._btnEssenceCostBg);

    const data = this.championManager.getChampionData(championId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    if (!isUnlocked || !data) {
      this._btnEssenceCostContainer.setVisible(false);
      return;
    }

    const reqs = ChampionXPManager.getPerTypeRequiredForLevel(data);
    if (!reqs || reqs.length === 0) {
      this._btnEssenceCostContainer.setVisible(false);
      return;
    }

    const gd = (this.scene as BattleScene).gameData;
    const items: Array<{ obj: Phaser.GameObjects.GameObject; width: number }> = [];
    const iconScale = this._btnEssenceCostIconScale;
    const fontSize = `${this._btnEssenceCostFontSize}px`;

    for (const seg of reqs) {
      const t = seg.types[0];
      const isSpecial = t === (Type as any).SMITTY || t === (Type as any).GLITCH || t === (Type as any).GEN_ONE;
      let costAtlas = "pbinfo_enemy_type";
      let costFrame: string;
      let costTint: number | null = null;
      if (t === (Type as any).SMITTY) {
        costFrame = "dark";
        costTint = 0xCC3333;
      } else if (t === (Type as any).GLITCH) {
        costFrame = "psychic";
        costTint = 0x3366CC;
      } else if (t === (Type as any).GEN_ONE) {
        costFrame = "normal";
        costTint = 0x33CC33;
      } else {
        costFrame = Type[t].toLowerCase();
      }
      const typeIcon = this.scene.add.sprite(0, 0, costAtlas, costFrame);
      typeIcon.setScale(isSpecial ? this._btnEssenceCostSpecialIconScale : iconScale);
      typeIcon.setOrigin(0.5, 0.5);
      if (costTint !== null) typeIcon.setTint(costTint);
      items.push({ obj: typeIcon, width: typeIcon.displayWidth });
      if (isSpecial) {
        this._btnEssenceCostSpecialIcons.push(typeIcon);
      } else {
        this._btnEssenceCostIcons.push(typeIcon);
      }

      const walletHave = seg.types.reduce((s, tt) => s + (gd.getEssenceCount(tt) || 0), 0);
      const isMet = walletHave >= seg.amount;
      const countText = addTextObject(this.scene, 0, 0, `x${seg.amount}`, TextStyle.WINDOW, {
        fontSize,
        color: isMet ? "#00ff00" : "#E8E8E8"
      });
      countText.setOrigin(0, 0.5);
      items.push({ obj: countText, width: countText.displayWidth });
      this._btnEssenceCostTexts.push(countText);
    }

    const groupGap = this._btnEssenceCostGroupGap;
    let totalW = 0;
    for (let ii = 0; ii < items.length; ii++) {
      totalW += items[ii].width;
      if (ii < items.length - 1) {
        totalW += (ii % 2 === 1) ? groupGap : 0;
      }
    }
    let cursorX = -totalW / 2;

    for (let ii = 0; ii < items.length; ii++) {
      const item = items[ii];
      const isIcon = (ii % 2 === 0);
      const x = isIcon ? cursorX + item.width / 2 : cursorX;
      (item.obj as any).setPosition(x, 0);
      this._btnEssenceCostContainer.add(item.obj);
      cursorX += item.width;
      if (ii < items.length - 1 && ii % 2 === 1) {
        cursorX += groupGap;
      }
    }

    if (this._btnEssenceCostSpecialIconOffsetX !== 0) {
      for (const sp of this._btnEssenceCostSpecialIcons) {
        sp.x += this._btnEssenceCostSpecialIconOffsetX;
      }
    }

    this._btnEssenceCostBg.clear();
    this._btnEssenceCostBg.fillStyle(0x000000, this._btnEssenceCostBgAlpha);
    this._btnEssenceCostBg.fillRoundedRect(-this._btnEssenceCostBgW / 2 + this._btnEssenceCostBgOffsetX, -this._btnEssenceCostBgH / 2 + this._btnEssenceCostBgOffsetY, this._btnEssenceCostBgW, this._btnEssenceCostBgH, { tl: 0, tr: 0, bl: 3, br: 3 });

    this._btnEssenceCostContainer.setPosition(this._btnEssenceCostOffsetX, 10 + this._btnEssenceCostOffsetY);
    this._btnEssenceCostContainer.setVisible(true);
    this.updateRequirementHoverZonePosition();
  }

  private updateNextSkillCostDisplay(championId: string): void {
    if (!this._nextSkillCostContainer) return;

    const children = this._nextSkillCostContainer.getAll();
    for (let i = children.length - 1; i >= 0; i--) {
      this._nextSkillCostContainer.remove(children[i], true);
    }
    this._nextSkillCostIcons = [];
    this._nextSkillCostTexts = [];

    this._nextSkillCostBg = this.scene.add.graphics();
    this._nextSkillCostContainer.add(this._nextSkillCostBg);

    const data = this.championManager.getChampionData(championId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    if (!isUnlocked || !data) {
      this._nextSkillCostContainer.setVisible(false);
      return;
    }

    const reqs = ChampionXPManager.getPerTypeRequiredForLevel(data);
    if (!reqs || reqs.length === 0) {
      this._nextSkillCostContainer.setVisible(false);
      return;
    }

    if (this._lastNextSkillX === 0 && this.nextSkillLabel && !this.nextSkillLabel.visible) {
      this._nextSkillCostContainer.setVisible(false);
      return;
    }

    const resolvedId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[resolvedId] as any;
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;
    const orderedSkills = this.getOrderedSkillList(def, data, allSkills, isUnlocked);
    const selectedSkillId = this.selectedSkillIndex >= 0 && this.selectedSkillIndex < orderedSkills.length
      ? orderedSkills[this.selectedSkillIndex]?.[0] : null;
    const isNextFocused = !!(this._barNextSkillId && selectedSkillId === this._barNextSkillId);
    if (!isNextFocused) {
      this._nextSkillCostContainer.setVisible(false);
      return;
    }

    const gd = (this.scene as BattleScene).gameData;
    const items: Array<{ obj: Phaser.GameObjects.GameObject; width: number }> = [];
    const iconScale = this._nextSkillCostIconScale;
    const fontSize = `${this._nextSkillCostFontSize}px`;

    for (const seg of reqs) {
      const t = seg.types[0];
      const isSpecial = t === (Type as any).SMITTY || t === (Type as any).GLITCH || t === (Type as any).GEN_ONE;
      let costAtlas = "pbinfo_enemy_type";
      let costFrame: string;
      let costTint: number | null = null;
      if (t === (Type as any).SMITTY) {
        costFrame = "dark";
        costTint = 0xCC3333;
      } else if (t === (Type as any).GLITCH) {
        costFrame = "psychic";
        costTint = 0x3366CC;
      } else if (t === (Type as any).GEN_ONE) {
        costFrame = "normal";
        costTint = 0x33CC33;
      } else {
        costFrame = Type[t].toLowerCase();
      }
      const typeIcon = this.scene.add.sprite(0, 0, costAtlas, costFrame);
      typeIcon.setScale(isSpecial ? iconScale * 1.2 : iconScale);
      typeIcon.setOrigin(0.5, 0.5);
      if (costTint !== null) typeIcon.setTint(costTint);
      items.push({ obj: typeIcon, width: typeIcon.displayWidth });
      this._nextSkillCostIcons.push(typeIcon);

      const walletHave = seg.types.reduce((s, tt) => s + (gd.getEssenceCount(tt) || 0), 0);
      const isMet = walletHave >= seg.amount;
      const countText = addTextObject(this.scene, 0, 0, `x${seg.amount}`, TextStyle.WINDOW, {
        fontSize,
        color: isMet ? "#00ff00" : "#E8E8E8"
      });
      countText.setOrigin(0, 0.5);
      items.push({ obj: countText, width: countText.displayWidth });
      this._nextSkillCostTexts.push(countText);
    }

    const groupGap = this._nextSkillCostGroupGap;
    let totalW = 0;
    for (let ii = 0; ii < items.length; ii++) {
      totalW += items[ii].width;
      if (ii < items.length - 1) {
        totalW += (ii % 2 === 1) ? groupGap : 0;
      }
    }
    let cursorX = -totalW / 2;

    for (let ii = 0; ii < items.length; ii++) {
      const item = items[ii];
      const isIcon = (ii % 2 === 0);
      const x = isIcon ? cursorX + item.width / 2 : cursorX;
      (item.obj as any).setPosition(x, 0);
      this._nextSkillCostContainer.add(item.obj);
      cursorX += item.width;
      if (ii < items.length - 1 && ii % 2 === 1) {
        cursorX += groupGap;
      }
    }

    this._nextSkillCostBg.clear();
    this._nextSkillCostBg.fillStyle(0x000000, this._nextSkillCostBgAlpha);
    this._nextSkillCostBg.fillRoundedRect(-this._nextSkillCostBgW / 2, -this._nextSkillCostBgH / 2, this._nextSkillCostBgW, this._nextSkillCostBgH, { tl: 0, tr: 0, bl: 3, br: 3 });

    const barX = this.skillIconBarContainer?.x ?? 0;
    const barY = this.skillIconBarContainer?.y ?? 0;
    const costX = barX + this._lastNextSkillX + this._nextSkillCostOffsetX;
    const costY = barY + 18 + this._nextSkillCostOffsetY;
    this._nextSkillCostContainer.setPosition(costX, costY);
    this._nextSkillCostContainer.setVisible(false);
  }

  private updateRequirementStrip(championId: string): void {
    if (!this._requirementBgContainer) return;

    const existing = this._requirementBgContainer.getAll().slice(1);
    existing.forEach(obj => { this._requirementBgContainer!.remove(obj, true); });

    const data = this.championManager.getChampionData(championId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    let segments: Array<{ types: Type[]; amount: number }>;
    let getHaveForTypes: (types: Type[]) => number;

    if (isUnlocked) {
      const perType = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
      segments = perType && perType.length ? perType : this.buildLockedSegments(championId);
      const levelEssence = (data as any)?.levelEssence || {};
      getHaveForTypes = (types) => types.reduce((s, t) => s + (levelEssence[t] || 0), 0);
    } else {
      segments = this.buildLockedSegments(championId);
      const gd = (this.scene as BattleScene).gameData;
      const committed = (gd.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
      getHaveForTypes = (types) => types.reduce((s, t) => s + (committed[t] || 0), 0);
    }

    if (!segments || segments.length === 0) {
      this._requirementBgContainer.setVisible(false);
      this.hideRequirementHoverZone();
      return;
    }

    if (this._requirementBgImg) {
      this._requirementBgImg.setDisplaySize(this._stripeBgWidth, this._stripeBgHeight);
      this._requirementBgImg.setAlpha(this._stripeBgAlpha);
      this._requirementBgImg.setScale(this._stripeBgScale);
    }

    this._stripeEssenceSprite = null;
    this._stripeTypeSprites = [];
    this._stripeDotTexts = [];
    this._stripeSpecialContainers = [];

    const essenceScale = this._stripeEssenceScale;
    const typeScale = this._stripeTypeScale;
    const fontSize = `${this._stripeFontSize}px`;
    const interSpacing = this._stripeSpacing;
    const intraSpacing = 0;

    const items: Array<{ obj: Phaser.GameObjects.GameObject; width: number; sectionEnd: boolean }> = [];

    const soulIcon = this.scene.add.sprite(0, 0, "smitems", "modSoulCollected");
    soulIcon.setScale(essenceScale);
    soulIcon.setOrigin(0.5, 0.5);
    this._stripeEssenceSprite = soulIcon;
    items.push({ obj: soulIcon, width: soulIcon.displayWidth, sectionEnd: true });

    const reqText = addTextObject(this.scene, 0, 0, i18next.t("championSelect:button.required", { defaultValue: "REQUIRED" }), TextStyle.WINDOW, {
      fontSize,
      color: "#E8E8E8"
    });
    reqText.setOrigin(0.5, 0.5);
    items.push({ obj: reqText, width: reqText.width * reqText.scaleX, sectionEnd: true });

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (i > 0 && segments.length > 1) {
        const dotFontSize = `${this._stripeDotFontSize}px`;
        const dot = addTextObject(this.scene, 0, 0, "\u00B7", TextStyle.WINDOW, { fontSize: dotFontSize, color: "#E8E8E8", fontStyle: "bold" });
        dot.setOrigin(0.5, 0.5);
        dot.setDepth(10);
        this._stripeDotTexts.push(dot);
        items.push({ obj: dot, width: dot.width * dot.scaleX, sectionEnd: false });
      }

      const t = seg.types[0];
      const { atlas, frame, isSpecial } = this.resolveTypeIcon(t);
      const typeIcon = this.scene.add.sprite(0, 0, atlas, frame);
      const appliedScale = isSpecial ? this._stripeSpecialTypeScale : typeScale;
      typeIcon.setScale(appliedScale);
      typeIcon.setOrigin(0.5, 0.5);
      if (isSpecial) this.decorateSpecialIcon(t, typeIcon);
      this._stripeTypeSprites.push(typeIcon);

      if (isSpecial) {
        const specialContainer = this.scene.add.container(0, 0);
        specialContainer.add(typeIcon);
        const isGlitch = t === (Type as any).GLITCH;
        const isGenOne = t === (Type as any).GEN_ONE;
        let specialLabelStr: string;
        if (isGlitch) {
          specialLabelStr = i18next.t("pokemonInfo:Type.GLITCH", { defaultValue: "GLITCH" }).toUpperCase();
        } else if (isGenOne) {
          specialLabelStr = i18next.t("pokemonInfo:Type.GEN_ONE", { defaultValue: "GEN I" }).toUpperCase();
        } else {
          specialLabelStr = i18next.t("pokemonInfo:Type.SMITTY", { defaultValue: "SMITTY" }).toUpperCase();
        }
        const specialLabel = addTextObject(this.scene, 0, 0, specialLabelStr, TextStyle.WINDOW, {
          fontSize: `${this._stripeSpecialLabelFontSize}px`,
          align: "center",
          stroke: "#000000",
          strokeThickness: 3
        });
        if (isGenOne) {
          specialLabel.setColor("#33CC33");
        }
        specialLabel.setOrigin(0.5, 0.5);
        specialLabel.setDepth(11);
        specialLabel.setPosition(this._stripeSpecialLabelX, this._stripeSpecialLabelY);
        specialContainer.add(specialLabel);
        this._stripeSpecialContainers.push(specialContainer);
        items.push({ obj: specialContainer, width: typeIcon.displayWidth, sectionEnd: false });
      } else {
        items.push({ obj: typeIcon, width: typeIcon.displayWidth, sectionEnd: false });
      }

      const have = Math.min(getHaveForTypes(seg.types), seg.amount);
      const amountText = addTextObject(this.scene, 0, 0, `${have}/${seg.amount}`, TextStyle.WINDOW, {
        fontSize,
        color: "#E8E8E8"
      });
      amountText.setOrigin(0.5, 0.5);
      items.push({ obj: amountText, width: amountText.width * amountText.scaleX, sectionEnd: true });
    }

    const gapAfter = (index: number): number => {
      if (index >= items.length - 1) return 0;
      return items[index].sectionEnd ? interSpacing : intraSpacing;
    };
    const totalWidth = items.reduce((sum, it) => sum + it.width, 0) + items.reduce((sum, _, idx) => sum + gapAfter(idx), 0);
    let cursorX = -totalWidth / 2;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const x = cursorX + item.width / 2;
      let yOffset = 0;
      if (item.obj === soulIcon) {
        (item.obj as any).setPosition(x + this._stripeEssenceX, this._stripeEssenceY);
      } else if (this._stripeTypeSprites.includes(item.obj as any)) {
        (item.obj as any).setPosition(x + this._stripeTypeX, this._stripeTypeY);
      } else if (this._stripeDotTexts.includes(item.obj as any)) {
        (item.obj as any).setPosition(x + this._stripeDotX, this._stripeDotY);
      } else if (this._stripeSpecialContainers.includes(item.obj as any)) {
        (item.obj as any).setPosition(x + this._stripeSpecialX, this._stripeSpecialY);
      } else {
        if ((item.obj as any).setPosition) (item.obj as any).setPosition(x, yOffset);
      }
      this._requirementBgContainer.add(item.obj);
      cursorX += item.width + gapAfter(i);
    }

    if (this._requirementHoverZone) {
      const padY = 4;
      this._hoverTweakRect = {
        x: -this._stripeBgWidth / 2,
        y: -this._stripeBgHeight / 2 - padY,
        w: this._stripeBgWidth,
        h: this._stripeBgHeight + padY * 2
      };
      if (this._hoverTweakActive) this.drawHoverTweakBox();
      this.updateRequirementHoverZonePosition();
    }
  }

  private updateEssenceListPanel(championId: string): void {
    if (!this.essenceListContainer) return;
    this.specialTypeSprites.clear();

    const gd = (this.scene as BattleScene).gameData;
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    const requiredTypesSet = new Set<Type>();
    if (isUnlocked) {
      const data = this.championManager.getChampionData(championId);
      const perTypeReq = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
      if (perTypeReq && perTypeReq.length) {
        for (const seg of perTypeReq) (seg.types || []).forEach(t => { if (typeof t === 'number') requiredTypesSet.add(t); });
      } else {
        const def = CHAMPION_DEFINITIONS[championId] as any;
        [def?.type1, def?.type2].filter((t: any) => typeof t === 'number').forEach((t: Type) => requiredTypesSet.add(t));
      }
    } else {
      const segments = this.buildLockedSegments(championId);
      segments.forEach(seg => seg.types.forEach(t => requiredTypesSet.add(t)));
    }
    const rows: Array<{ type: Type; count: number; isSpecial?: boolean }> = [];
    requiredTypesSet.forEach((t) => {
      const isSpecial = (t === (Type as any).GLITCH || t === (Type as any).SMITTY || t === (Type as any).GEN_ONE);
      rows.push({ type: t, count: gd.getEssenceCount(t) || 0, isSpecial });
    });

    const glitchCount = gd.getEssenceCount((Type as any).GLITCH);
    if (glitchCount > 0 && !requiredTypesSet.has((Type as any).GLITCH)) {
      rows.push({ type: (Type as any).GLITCH, count: glitchCount, isSpecial: true });
    }
    const smittyCount = gd.getEssenceCount((Type as any).SMITTY);
    if (smittyCount > 0 && !requiredTypesSet.has((Type as any).SMITTY)) {
      rows.push({ type: (Type as any).SMITTY, count: smittyCount, isSpecial: true });
    }
    const genOneCount = gd.getEssenceCount((Type as any).GEN_ONE);
    if (genOneCount > 0 && !requiredTypesSet.has((Type as any).GEN_ONE)) {
      rows.push({ type: (Type as any).GEN_ONE, count: genOneCount, isSpecial: true });
    }
    rows.sort((a, b) => {
      if (a.isSpecial && !b.isSpecial) return 1;
      if (!a.isSpecial && b.isSpecial) return -1;
      return b.count - a.count;
    });
    const currentSignature = this.getEssenceListSignature(rows);
    const onlyCountsChanged = this.lastEssenceListSignature !== null &&
      this.lastEssenceListSignature.replace(/(:\d+:)/g, ':0:') === currentSignature.replace(/(:\d+:)/g, ':0:');
    this.lastEssenceListSignature = currentSignature;
    if (onlyCountsChanged && this.essenceListItems.length > 0) {

      let itemIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const useCategories = (r.type === (Type as any).GLITCH || r.type === (Type as any).SMITTY || r.type === (Type as any).GEN_ONE);

        if (itemIndex < this.essenceListItems.length) {
          const countText = this.essenceListItems[itemIndex].text;
          countText.setText(`x ${r.count}`);
          itemIndex++;
        }

        if (useCategories && itemIndex < this.essenceListItems.length) {
          itemIndex++;
        }
      }
      return;
    }
    this.essenceListItems.forEach(i => { i.icon.destroy(); i.text.destroy(); });
    this.essenceListItems = [];
    let y = ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.START_Y;
    let x = ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.START_X;
    for (const r of rows) {
      const t = r.type;
      const isGlitch = (t === (Type as any).GLITCH);
      const isSmitty = (t === (Type as any).SMITTY);
      const isGenOne = (t === (Type as any).GEN_ONE);
      const useCategories = (isGlitch || isSmitty);
      const useGenOneSpecial = isGenOne;
      const atlasKey = useGenOneSpecial ? "pbinfo_enemy_type" : (useCategories ? "categories" : Utils.getLocalizedSpriteKey("types"));
      const frameKey = useGenOneSpecial ? "normal" : (useCategories ? (isGlitch ? "physical" : "special") : Type[t].toLowerCase());

      const icon = this.scene.add.sprite(x, y, atlasKey, frameKey as any);
      icon.setOrigin(0.5, 0.5);
      const iconScale = (useCategories || useGenOneSpecial) ?
        ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.SPECIAL_ICON_SCALE :
        ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.ICON_SCALE;
      icon.setScale(iconScale);

      if (useCategories || useGenOneSpecial) {
        this.decorateSpecialIcon(t, icon);
      }
      const text = addTextObject(
        this.scene,
        ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.COUNT_OFFSET_X,
        y,
        `x ${r.count}`,
        TextStyle.WINDOW,
        { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.COUNT_FONT_SIZE, align: "left" }
      );
      text.setOrigin(0, 0.5);

      this.essenceListContainer.add(icon);
      this.essenceListContainer.add(text);
      this.essenceListItems.push({ icon, text });

      if (useCategories || useGenOneSpecial) {
        const labelText = isGlitch ? i18next.t("pokemonInfo:Type.GLITCH", { defaultValue: "GLITCH" }).toUpperCase() : isGenOne ? i18next.t("pokemonInfo:Type.GEN_ONE", { defaultValue: "GEN I" }).toUpperCase() : i18next.t("pokemonInfo:Type.SMITTY", { defaultValue: "SMITTY" }).toUpperCase();
        const iconLabel = addTextObject(
          this.scene,
          x,
          y,
          labelText,
          TextStyle.WINDOW,
          {
            fontSize: ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.SPECIAL_TEXT_FONT_SIZE,
            align: "center",
            stroke: "#000000",
            strokeThickness: 3
          }
        );
        iconLabel.setOrigin(0.5, 0.5);
        if (isGenOne) {
          iconLabel.setColor("#33CC33");
        }
        this.essenceListContainer.add(iconLabel);
        this.essenceListItems.push({ icon: iconLabel, text: iconLabel });
      }
      y += ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.ITEM_SPACING;
    }
  }

  private stopEssenceHold(): void {
    if (this.essenceHoldTimer) {
      this.essenceHoldTimer.remove(false);
      this.essenceHoldTimer = undefined;
    }
    if (this.xpLabelTicker) {
      this.xpLabelTicker.remove(false);
      this.xpLabelTicker = undefined;
    }
    this.essenceHoldActiveType = null;

    this.onCommitEnd();
  }
  private getUnifiedEssenceProgressForChampion(championId: string): { current: number; required: number; level: number; isUnlocked: boolean } {
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    let current = 0;
    let required = 0;
    let level = 1;
    try {
      const data = this.championManager.getChampionData(championId);
      level = data?.level ?? 1;
      if (isUnlocked) {
        const reqs = ChampionXPManager.getPerTypeRequiredForLevel(data);
        if (reqs && reqs.length > 0) {

           required = reqs.reduce((sum, req) => sum + req.amount, 0);
           current = reqs.reduce((sum, req) => {

               const segmentContribution = req.types.reduce((tSum, t) => tSum + ((data as any).levelEssence?.[t] || 0), 0);

               return sum + Math.min(segmentContribution, req.amount);
           }, 0);
        } else {

           const essenceProgress = ChampionXPManager.getEssenceProgress(data);
           current = Math.floor(essenceProgress.current);
           required = Math.floor(essenceProgress.required);
        }
        return { current, required, level, isUnlocked };
      }
    } catch {}

    const segments = this.buildLockedSegments(championId);
    if (segments.length === 0) {
      return { current: 0, required: 0, level: 0, isUnlocked: false };
    }
    const gd = (this.scene as BattleScene).gameData;
    const committed = (gd.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
    const totalRequired = Math.max(1, segments.reduce((acc, seg) => acc + seg.amount, 0));
    const totalCurrent = segments.reduce((acc, seg) => {
      const segCurrent = seg.types.reduce((s, t) => s + (committed[t] || 0), 0);
      return acc + Math.min(seg.amount, segCurrent);
    }, 0);
    current = Math.floor(totalCurrent);
    required = Math.floor(totalRequired);
    return { current, required, level, isUnlocked };
  }

  private getSkillIconConfig(rewardType: SkillTreeRewardType, skillDef?: any, championId?: string): { key: string; frame: string; scale: number; inverted?: boolean } {
    switch (rewardType) {
      case SkillTreeRewardType.TM_FILTERED: return { key: "items", frame: "tm_normal", scale: 2.0 };
      case SkillTreeRewardType.XM_FILTERED: return { key: "smitems", frame: "glitchTm", scale: 1.0 };
      case SkillTreeRewardType.ABILITY_GRANT: return { key: "smitems", frame: "glitchAbilitySwitch", scale: 1.0 };
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT: return { key: "smitems", frame: "modPassiveAbility", scale: 1.0 };
      case SkillTreeRewardType.TERA_ABILITY: return { key: "items", frame: "stellar_tera_shard", scale: 2.0, inverted: true };
      case SkillTreeRewardType.SMITTY_ABILITY: return { key: "smitems", frame: "modPassiveAbility", scale: 1.0 };
      case SkillTreeRewardType.SIGNATURE_POKEMON: {
        const speciesId = skillDef?.reward?.data?.species ?? skillDef?.rewardData?.data?.species ?? skillDef?.rewardData?.species ?? skillDef?.data?.species ?? skillDef?.unlockableId;
        if (speciesId) {
          try {
            const sp = getPokemonSpecies(speciesId);
            if (sp) {
              return { key: sp.getIconAtlasKey(), frame: sp.getIconId(false), scale: 2.0, inverted: true };
            }
          } catch {}
        }
        return { key: "smitems", frame: "draftMode", scale: 1.0, inverted: true };
      }
      case SkillTreeRewardType.GENERAL_POKEMON: return { key: "smitems", frame: "draftMode", scale: 1.0 };
      case SkillTreeRewardType.LEGENDARY_POKEMON: {
        const legendSpecies = skillDef?.reward?.data?.species ?? skillDef?.rewardData?.data?.species ?? skillDef?.rewardData?.species ?? skillDef?.data?.species ?? skillDef?.unlockableId;
        if (legendSpecies) {
          try {
            const sp = getPokemonSpecies(legendSpecies);
            if (sp) {
              return { key: sp.getIconAtlasKey(), frame: sp.getIconId(false), scale: 2.0 };
            }
          } catch {}
        }
        return { key: "items", frame: "mb", scale: 2.0 };
      }
      case SkillTreeRewardType.STAT_BOOST: return { key: "items", frame: "protein", scale: 2.0 };
      case SkillTreeRewardType.MOVE_UPGRADE: return { key: "smitems", frame: "smittyShard", scale: 1.0 };
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC: return { key: "smitems", frame: "smittyHumor", scale: 1.0 };
      case SkillTreeRewardType.ESSENCE_BUNDLE: return { key: "smitems", frame: "modSoulCollected", scale: 1.0 };
      case SkillTreeRewardType.PERMA_MONEY: return { key: "smitems", frame: "permaMoney", scale: 1.0 };
      case SkillTreeRewardType.MONEY_REWARD: return { key: "items", frame: "relic_gold", scale: 2.0 };
      case SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN: return { key: "smitems", frame: "glitchModSoul", scale: 1.0 };
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        try {
          const questId = (skillDef?.data?.unlockableId ?? skillDef?.unlockableId) as QuestUnlockables;
          let formKey = skillDef?.data?.formKey as string | undefined;
          if (questId) {
            const questUnlockData = (this.scene as BattleScene).gameData.getQuestUnlockDataFromModifierTypes(questId);
            if (questUnlockData && questUnlockData.rewardId) {
              const species = getPokemonSpecies(questUnlockData.rewardId as any);
              if (!formKey && species) {
                formKey = species.getGlitchFormName?.(true, undefined, questUnlockData.rewardType) ?? undefined;
              }
              if (formKey && species) {
                const form = species.forms?.find((f: any) => f.formName?.toLowerCase() === formKey!.toLowerCase());
                if (form) {
                  return { key: form.getIconAtlasKey(), frame: form.getIconId(false), scale: 2.0 };
                }
              }
            }
          }
        } catch {}
        return { key: "smitems", frame: "glitchModSoul", scale: 1.0 };
      }
      case SkillTreeRewardType.SKILL_POINTS: return { key: "items", frame: "ribbon_gen9", scale: 2.0 };
      case SkillTreeRewardType.SKILL_TREE_TOKENS: return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };
      case SkillTreeRewardType.GOLDEN_POKEBALL: return { key: "items", frame: "pb_gold", scale: 2.0 };
      case SkillTreeRewardType.MASTER_BALL: return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.VOID_BALL: return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.TYPE_BALL_FILTERED: return { key: "items", frame: "gb", scale: 2.0 };
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT: return { key: "items", frame: "rb", scale: 2.0 };
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT: return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.EGG_VOUCHER: return { key: "items", frame: "coupon", scale: 2.0 };
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: return { key: "smitems", frame: "modSoulCollected", scale: 1.0, inverted: true };
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: return { key: "items", frame: "dna_splicers", scale: 2.0 };
      case SkillTreeRewardType.CATCH_RATE_BONUS: return { key: "smitems", frame: "permaCatchRate", scale: 1.0 };
      case SkillTreeRewardType.REVIVE_BOOST: return { key: "items", frame: "revive", scale: 2.0 };
      case SkillTreeRewardType.GLITCH_CHANGE: return { key: "smitems", frame: "glitchFruit", scale: 1.0 };
      case SkillTreeRewardType.MEGA_STONE: {
        const megaStone = skillDef?.data?.megaStone ?? skillDef?.data?.formChangeItem ?? skillDef?.unlockableId;
        if (megaStone && typeof megaStone === "number") {
          const frame = getFormChangeItemSpriteFrame(megaStone);
          if (frame) return { key: "items", frame, scale: 2.0 };
        }
        return { key: "items", frame: "pinsirite", scale: 2.0 };
      }
      case SkillTreeRewardType.POKEMON_ALT_BUILD: return { key: "smitems", frame: "permaCheaperFusions", scale: 1.0, inverted: true };
      case SkillTreeRewardType.DYNA_MUSHROOM: return { key: "items", frame: "max_mushrooms", scale: 2.0 };
      case SkillTreeRewardType.TYPE_SWITCHER: return { key: "smitems", frame: "glitchTypeSwitch", scale: 1.0 };
      case SkillTreeRewardType.HEALING_ITEMS: return { key: "items", frame: "max_potion", scale: 2.0 };
      case SkillTreeRewardType.MEMORY_MUSHROOM: return { key: "items", frame: "big_mushroom", scale: 2.0 };
      case SkillTreeRewardType.BERRY_ITEMS: return { key: "items", frame: "sitrus_berry", scale: 2.0 };
      case SkillTreeRewardType.ABILITY_SWITCHER: return { key: "smitems", frame: "glitchAbilitySwitch", scale: 1.0 };
      case SkillTreeRewardType.GENERAL_ITEMS: return { key: "smitems", frame: "permaShowRewards", scale: 1.0 };
      case SkillTreeRewardType.BATON_ITEM: return { key: "items", frame: "baton", scale: 2.15 };
      case SkillTreeRewardType.PP_MAX_ITEM: return { key: "items", frame: "pp_max", scale: 2.0 };
      case SkillTreeRewardType.ROGUE_BALL: return { key: "items", frame: "rb", scale: 2.0 };
      case SkillTreeRewardType.PARTY_ABILITY_GRANT: return { key: "smitems", frame: "permaPartyAbility", scale: 1.0 };
      case SkillTreeRewardType.PERMA_ITEM: return { key: "smitems", frame: "permaMetronomeLevelup", scale: 1.0 };
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: return { key: "items", frame: "silk_scarf", scale: 2.0 };
      case SkillTreeRewardType.TERA_TYPE: return { key: "items", frame: "stellar_tera_shard", scale: 2.0 };
      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const resolvedId = championId ? this.resolveChampionId(championId) : "apollo";
        const key = this.getChampionTrainerSpriteKey(resolvedId);
        const def = CHAMPION_DEFINITIONS[resolvedId] as any;
        return {
          key,
          frame: "",
          scale: def?.ui?.skillTreeTrainerBondScale ?? 1.0,
          inverted: true,
        };
      }
      default: return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };
    }
  }

  private canAffordLevelUp(championId: string): boolean {
    const { required } = this.getUnifiedEssenceProgressForChampion(championId);
    if (required <= 0) return false;
    const data = this.championManager.getChampionData(championId);
    if (!this.championManager.isChampionUnlockedInData(championId) || !data) return false;
    return ChampionXPManager.canMeetLevelRequirements(this.scene as BattleScene, data);
  }

  private commitAllEssenceForLevel(championId: string): boolean {
    return ChampionXPManager.performBinaryLevelUp(this.scene as BattleScene, championId);
  }

  private tryConsumeEssenceForChampion(championId: string, essenceType: Type, amount: number = 1): boolean {
    const gd = (this.scene as BattleScene).gameData;
    const segments = this.buildLockedSegments(championId);
    const committed = ((gd.championData?.[championId]?.unlockCommit) || {}) as Record<number, number>;

    let missingForType = 0;
    for (const seg of segments) {
      if (!seg.types.includes(essenceType)) continue;
      const segCurrent = seg.types.reduce((sum, t) => sum + (committed[t] || 0), 0);
      missingForType += Math.max(0, seg.amount - segCurrent);
    }
    const amountToConsume = Math.min(amount, missingForType);
    if (amountToConsume <= 0) return false;
    const ok = gd.tryConsumeEssence(essenceType, amountToConsume);
    if (!ok) return false;

    gd.championData = gd.championData || {};
    gd.championData[championId] = gd.championData[championId] || {};
    const commit = gd.championData[championId].unlockCommit = gd.championData[championId].unlockCommit || {};
    commit[essenceType] = (commit[essenceType] || 0) + amountToConsume;

    const def = CHAMPION_DEFINITIONS[championId];
    const need = (def?.unlockRequirements?.totalEssenceRequirement as number) || (def?.unlockRequirements?.essenceRequirements || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const have = (def?.unlockRequirements?.essenceRequirements || []).reduce((sum: number, r: any) => sum + (commit[r.type] || 0), 0);
    if (need > 0 && have >= need) {
      gd.championData[championId].isUnlocked = true;

      gd.applyChampionLevelUnlocks(championId);

      this.showUnlockAnimation(championId);

      try { this.updateChampionInfo(); } catch {}
      try { (this.scene as BattleScene).gameData.saveSystem?.(); } catch {}
    }
    return true;
  }

  private confirmChampionSelection(): boolean {
    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    if (!(this.championManager.isChampionUnlocked(selectedChampionId) || (this.championManager.getChampionData(selectedChampionId)?.isUnlocked === true))) {
      const champion = CHAMPION_DEFINITIONS[selectedChampionId];
      const req = champion?.unlockRequirements?.description;
      const text = typeof req === "function" ? req() : (req || i18next.t("championSelect:locked", { defaultValue: "Locked" }));
      (this.scene as BattleScene).ui.showText(i18next.t("championSelect:unlockRequired", { requirement: text, defaultValue: `Requires: ${text}` }), null, () => {}, null, true);
      this.loadChampionData();
      this.displayChampionGrid();
      this.updateChampionInfo();
      return false;
    }
    let effectiveId = selectedChampionId;
    if (selectedChampionId === "apollo_diana") {
      effectiveId = (this.scene as BattleScene).gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
    }
    const championName = ChampionUtils.getChampionDisplayName(effectiveId);
    const prompt = i18next.t("championSelect:confirmSelection", { name: championName, defaultValue: `Start run with ${championName}?` });

    const ui = (this.scene as BattleScene).ui;

    const reEnableInteractives = () => {
      this.modalContainer?.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6),
        Phaser.Geom.Rectangle.Contains
      );
      if (this.bgHitZone) this.bgHitZone.setInteractive({ useHandCursor: false });
    };

    const cancel = () => {
      ui.revertMode();
      this.modalMessage?.clear();
      reEnableInteractives();
      this.updateChampionInfo();
    };

    const confirm = () => {
      ui.revertMode();
      this.modalMessage?.clear();
      reEnableInteractives();
      this.executeChampionSelection(selectedChampionId);
    };

    this.modalContainer?.disableInteractive();
    if (this.bgHitZone) this.bgHitZone.disableInteractive();

    this.modalMessage?.showText(prompt, 0, () => {
      ui.setOverlayMode(Mode.CONFIRM, confirm, cancel);
    });

    return true;
  }

  private executeChampionSelection(championId: string): void {
    (this.scene as BattleScene).gameData.applyChampionLevelUnlocks(championId);
    (this.scene as BattleScene).playSound("ui/select");
    this.config?.onChampionSelected(championId);
  }

  private ensureXpLabelTicker(targetCurrent: number): void {
    if (this.xpLabelTicker) return;
    this.xpLabelTicker = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (this.visualCurrentEssence >= targetCurrent) {
        this.xpLabelTicker?.remove(false);
        this.xpLabelTicker = undefined;
        return;
      }

      const previousEssence = this.visualCurrentEssence;
      let steps = 0;
      const MAX_STEPS = 1000;
      while (this.visualCurrentEssence < targetCurrent && steps++ < MAX_STEPS) {
        this.visualCurrentEssence += 1;
      }

      if (this.visualCurrentEssence !== previousEssence) {
        const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
        if (selectedChampionId) {
          this.updateGridXpGauge(selectedChampionId);
          this.updateEssenceGauge(selectedChampionId, true);
        }
      }
    }});
  }

  private updateInlineEssenceCounters(championId: string): void {
    const data = this.championManager.getChampionData(championId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    let segments: Array<{ types: Type[]; amount: number }>;
    let getHaveForTypes: (types: Type[]) => number;

    if (isUnlocked) {
      const perType = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
      segments = perType && perType.length ? perType : this.buildLockedSegments(championId);
      const levelEssence = (data as any)?.levelEssence || {};
      getHaveForTypes = (types) => types.reduce((s, t) => s + (levelEssence[t] || 0), 0);
    } else {
      segments = this.buildLockedSegments(championId);
      const gd = (this.scene as BattleScene).gameData;
      const committed = (gd.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
      getHaveForTypes = (types) => types.reduce((s, t) => s + (committed[t] || 0), 0);
    }

    if (!segments || segments.length === 0) {
      return;
    }

    const seg0 = segments[0];
    const seg1 = segments.length > 1 ? segments[1] : null;

    const typesAtlas = Utils.getLocalizedSpriteKey("types");

    const t0 = seg0.types[0];
    const have0 = getHaveForTypes(seg0.types);
    if ((this as any)._essenceCounter1Type && t0 !== undefined) {
      const isSpecial0 = (t0 === (Type as any).SMITTY || t0 === (Type as any).GLITCH || t0 === (Type as any).GEN_ONE);
      const isGenOne0 = (t0 === (Type as any).GEN_ONE);
      const atlas0 = isGenOne0 ? "pbinfo_enemy_type" : (isSpecial0 ? "categories" : typesAtlas);
      const frame0 = isGenOne0 ? "normal" : (isSpecial0 ? (t0 === (Type as any).GLITCH ? "physical" : "special") : Type[t0].toLowerCase());
      try { (this as any)._essenceCounter1Type.setTexture(atlas0, frame0); } catch {}
      if (isSpecial0 && (this as any)._essenceCounter1Type) this.decorateSpecialIcon(t0, (this as any)._essenceCounter1Type);
    }
    if ((this as any)._essenceCounter1Text) {
      (this as any)._essenceCounter1Text.setText(`${Math.min(have0, seg0.amount)}/${seg0.amount}`);
    }

    if (seg1) {
      const t1 = seg1.types[0];
      const have1 = getHaveForTypes(seg1.types);
      if ((this as any)._essenceCounter2Icon) {
        (this as any)._essenceCounter2Icon.setVisible(true);
      }
      if ((this as any)._essenceCounter2Type) {
        const isSpecial1 = (t1 === (Type as any).SMITTY || t1 === (Type as any).GLITCH || t1 === (Type as any).GEN_ONE);
        const isGenOne1 = (t1 === (Type as any).GEN_ONE);
        const atlas1 = isGenOne1 ? "pbinfo_enemy_type" : (isSpecial1 ? "categories" : typesAtlas);
        const frame1 = isGenOne1 ? "normal" : (isSpecial1 ? (t1 === (Type as any).GLITCH ? "physical" : "special") : Type[t1].toLowerCase());
        try { (this as any)._essenceCounter2Type.setTexture(atlas1, frame1); } catch {}
        if (isSpecial1 && (this as any)._essenceCounter2Type) this.decorateSpecialIcon(t1, (this as any)._essenceCounter2Type);
      }
      if ((this as any)._essenceCounter2Text) {
        (this as any)._essenceCounter2Text.setVisible(true);
        (this as any)._essenceCounter2Text.setText(`${Math.min(have1, seg1.amount)}/${seg1.amount}`);
      }
    } else {
      if ((this as any)._essenceCounter2Icon) (this as any)._essenceCounter2Icon.setVisible(false);
      if ((this as any)._essenceCounter2Text) (this as any)._essenceCounter2Text.setVisible(false);
    }
  }

  private grantExactEssenceForLevelUp(): void {
    const selectedChampionId = this.availableChampions?.[this.selectedChampionIndex];
    if (!selectedChampionId) return;
    const data = this.championManager.getChampionData(selectedChampionId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(selectedChampionId);
    let segments: Array<{ types: Type[]; amount: number }>;
    let getHaveForTypes: (types: Type[]) => number;
    if (isUnlocked) {
      const perType = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
      segments = perType && perType.length ? perType : this.buildLockedSegments(selectedChampionId);
      const levelEssence = (data as any)?.levelEssence || {};
      getHaveForTypes = (types) => types.reduce((s, t) => s + (levelEssence[t] || 0), 0);
    } else {
      segments = this.buildLockedSegments(selectedChampionId);
      const gd = (this.scene as BattleScene).gameData;
      const committed = (gd.championData?.[selectedChampionId]?.unlockCommit || {}) as Record<number, number>;
      getHaveForTypes = (types) => types.reduce((s, t) => s + (committed[t] || 0), 0);
    }
    if (!segments || segments.length === 0) return;
    const gd = (this.scene as BattleScene).gameData;
    const grants: Array<{ type: Type; amount: number }> = [];
    for (const seg of segments) {
      const have = getHaveForTypes(seg.types);
      const deficit = Math.max(0, seg.amount - have);
      if (deficit > 0 && seg.types.length > 0) {
        grants.push({ type: seg.types[0], amount: deficit });
      }
    }
    if (isUnlocked) {
      const le = (data as any).levelEssence = (data as any).levelEssence || {};
      for (const g of grants) {
        le[g.type] = (le[g.type] || 0) + g.amount;
      }
    } else {
      gd.championData = gd.championData || {};
      gd.championData[selectedChampionId] = gd.championData[selectedChampionId] || {};
      const commit = gd.championData[selectedChampionId].unlockCommit =
        gd.championData[selectedChampionId].unlockCommit || {};
      for (const g of grants) {
        commit[g.type] = (commit[g.type] || 0) + g.amount;
      }
    }
    console.log(`[CS-TWEAK] O-key: Staged essence for ${selectedChampionId}:`, grants.map(g => `${Type[g.type]}=${g.amount}`).join(", "));
    this.updateInlineEssenceCounters(selectedChampionId);
    this.updateLevelUpButton(selectedChampionId);
    this.renderSkillIconBar(selectedChampionId);
  }

  private updateProgressBarFill(championId: string): void {
    if (this._tweakActive) return;
    if ((this as any)._xpBarFillImage) {
      (this as any)._xpBarFillImage.setVisible(false);
    }
  }

}