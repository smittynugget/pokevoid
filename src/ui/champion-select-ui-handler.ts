import i18next from "i18next";
import BattleScene from "../battle-scene";
import { TitlePhase } from "../phases/title-phase";
import { ModalUiHandler, ModalConfig } from "./modal-ui-handler";
import ModalMessageUiHandler from "./modal-message-ui-handler";
import { Mode } from "./ui";
import { addTextObject, addBBCodeTextObject, TextStyle, getTextColor } from "./text";
import { Button } from "../enums/buttons";
import { Type, getTypeRgb } from "../data/type";
import { ChampionManager } from "../system/champion-manager";
import { CHAMPION_DEFINITIONS, initializeChampionDefinitions } from "../system/champion-registry";
import { TrainerType } from "../enums/trainer-type";
import { trainerConfigs } from "../data/trainer-config";
import ChampionXPManager from "../system/champion-xp-manager";
import { ChampionUtils } from "../system/champion-utils";
import * as Utils from "../utils";
import { createSporadicPattern } from "../utils";
import {GameMode} from "../game-mode";
import { PlayerGender } from "../enums/player-gender";
import { Stat } from "../enums/stat";
import { SkillTreeRarity, SkillTreeRewardType, SkillTreeReward } from "../system/skill-tree-data";
import { getDisplayRarityForRewardType, SkillTreeNodeGenerator } from "../system/skill-tree-node-generator";
import { SkillCategory } from "../system/playable-champions";
import { POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { playGenericLevelUpAnimation, skipCurrentLevelUpAnimation } from "./level-up-animation";
import { EnhancedTutorial } from "./tutorial-registry";
import { Device } from "../enums/devices";
import { SlideshowController, SlideshowSceneAdapter } from "#app/utils/slideshow-controller.js";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { ensureCutsceneImagesLoaded, unloadCutsceneImages } from "#app/utils/cutscene-images.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";

export interface ChampionSelectConfig {
  availableChampions: string[];
  gameMode?: GameMode;
  onChampionSelected: (championId: string) => void;
  onCancel?: () => void;
}

export default class ChampionSelectUiHandler extends ModalUiHandler {

  private static readonly UI_CONSTANTS = {
    TITLE_CONTAINER: {
      X_OFFSET: 10,
      Y_OFFSET: -4,
      GRADIENT_WIDTH: 200,
      HEIGHT: 19,
    },
    TITLE: {
      FONT_SIZE: "56px",
      X_OFFSET: 4,
      Y_OFFSET: 8.5,
      COLOR: 0xffffff,
      ALPHA: 1.0,
    },
    SUBTITLE: {
      FONT_SIZE: "40px",
      X_OFFSET: 171,
      Y_OFFSET: 10.2,
      COLOR: 0xffffff,
      ALPHA: 0.8,
    },
    PREVIEW: {
      X: -70,
      Y: 5,
      SPRITE_X: 0,
      SPRITE_Y: -25,
      SPRITE_SCALE: .8,
      NAME_Y: 20,
      NAME_FONT_SIZE: "44px",
      TYPE_Y: 32,
      TYPE_SINGLE_X: 0,
      TYPE_DUAL_SPACING: 10,
      TYPE_SCALE: 0.5,
      SUBTITLE_Y: 21,
      SUBTITLE_FONT_SIZE: "34px",
    },
    SKILLS: {
      X: 10,
      Y: -10,
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
      TOOLTIP_RARITY_BAR_Y: 12,
      TOOLTIP_RARITY_BAR_HEIGHT: 6,
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
      TOOLTIP_RARITY_TEXT_Y: 15,
      TOOLTIP_TEXT_SPACING: 4,
      SKILL_ITEM_FONT_SIZE: "34px",
      MAX_VISIBLE_SKILLS: 6,
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
      FILL_SOUND_DURATION: 500,
      CONTAINER_Y: -4,
      BG_Y: 0,
      BG_WIDTH: 92,
      BG_HEIGHT: 14,
      BG_RADIUS: 7,
      FILL_Y: 2,
      FILL_WIDTH: 88,
      FILL_HEIGHT: 10,
      FILL_RADIUS: 5,
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

      SEGMENT_BG_ALPHA: 0.6,
      SEGMENT_BG_COLOR: 0x333333,
      SEGMENT_FILL_ALPHA: 0.9,
      SEGMENT_FILL_COLOR: 0xFFD700,
      SEGMENT_TEXT_FONT_SIZE: "34px",
      SEGMENT_TEXT_DEPTH: 12,

      SEGMENT_TEXT_BG_ALPHA: 0.7,
      SEGMENT_TEXT_BG_COLOR: 0x000000,
      SEGMENT_TEXT_BG_PADDING: 1,
      SEGMENT_TEXT_BG_DEPTH: 11,
      SEGMENT_TEXT_BG_HEIGHT_REDUCTION: 1,
      TYPE_ICON_OFFSET_Y: 2,
      TYPE_ICON_DEPTH: 11,

      ICON_TEXT_FONT_SIZE: "28px",
      ICON_TEXT_DEPTH: 13,
      ICON_TEXT_STROKE: "#000000",
      ICON_TEXT_STROKE_THICKNESS: 2,
      ICON_TEXT_Y: 3,
      LAVA_ANIMATION: {
        WAVE_AMPLITUDE: 1.5,
        WAVE_FREQUENCY: 0.003,
        WAVE_SPEED: 0.08,

        UPDATE_FREQUENCY: 60,

        BASE_ENERGY_INTENSITY: 0.15,
        BASE_ENERGY_SPEED: 0.06,

        ENERGY_WAVE_SPEED_MULTIPLIER: 1.8,
        ENERGY_WAVE_ALPHA: 0.35,
        ENERGY_WAVE_BRIGHTNESS: 1.9,
        VERTICAL_GRADIENT_ALPHA: 0.4,
        VERTICAL_GRADIENT_RANGE: 0.4,
      },
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
      START_X: -45,
      START_Y: -6,
      COLS: 3,
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
  private infoContainer: Phaser.GameObjects.Container;
  private gridContainer: Phaser.GameObjects.Container;
  private previewContainer: Phaser.GameObjects.Container;
  private basePreviewY: number = 0;
  protected titleText: Phaser.GameObjects.Text;
  private titleContainer: Phaser.GameObjects.Container;
  private titleBackground: Phaser.GameObjects.Graphics;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private gridBgGraphics: Phaser.GameObjects.Graphics | null = null;
  private championSprites: Phaser.GameObjects.Sprite[] = [];
  private championNameTexts: Phaser.GameObjects.Text[] = [];
  private championDescTexts: Phaser.GameObjects.Text[] = [];
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
  private skillScrollOffset: number = 0;
  private skillTooltipActive: boolean = false;
  private hasInteractedWithSkillList: boolean = false;
  private skillTooltipContainer: Phaser.GameObjects.Container | null = null;
  private skillTooltipBg: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private skillTooltipTitle: Phaser.GameObjects.Text | null = null;
  private skillTooltipRarity: Phaser.GameObjects.Text | null = null;
  private skillTooltipDesc: any | null = null;
  private skillTooltipCost: Phaser.GameObjects.Text | null = null;
  private skillTooltipPrereq: Phaser.GameObjects.Text | null = null;
  private skillListPanelContainer: Phaser.GameObjects.Container | null = null;
  private skillListPanelBg: Phaser.GameObjects.Graphics | null = null;
  private skillsHeaderText: Phaser.GameObjects.Text | null = null;
  private skillsSubheaderText: Phaser.GameObjects.Text | null = null;
  private useEssenceButtonContainer: Phaser.GameObjects.Container | null = null;
  private useEssenceButtonBg: Phaser.GameObjects.Graphics | null = null;
  private useEssenceButtonText: Phaser.GameObjects.Text | null = null;
  private useEssenceButtonIcon: Phaser.GameObjects.Sprite | null = null;

  private fullChampionSprite: Phaser.GameObjects.Sprite | null = null;
  private fullChampionTintSprite: Phaser.GameObjects.Sprite | null = null;
  private typeIcon1: Phaser.GameObjects.Sprite | null = null;
  private typeIcon2: Phaser.GameObjects.Sprite | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private essenceInstructionText: Phaser.GameObjects.Text | null = null;
  private committedText: Phaser.GameObjects.Text | null = null;
  private btnIconSprite: Phaser.GameObjects.Sprite | null = null;
  private soulIconSprite: Phaser.GameObjects.Sprite | null = null;

  private xpBarContainer: Phaser.GameObjects.Container | null = null;
  private xpBarBg: Phaser.GameObjects.Graphics | null = null;
  private xpBarFill: Phaser.GameObjects.Graphics | null = null;
  private xpBarRect: { x: number; y: number; w: number; h: number } | null = null;
  private xpBarFillSegments: Phaser.GameObjects.Graphics[] = [];
  private xpBarSegmentTweens: Phaser.Tweens.Tween[] = [];
  private xpBarTypeIcons: Phaser.GameObjects.Sprite[] = [];
  private xpBarSegmentTexts: Phaser.GameObjects.Text[] = [];
  private xpBarIconTexts: Phaser.GameObjects.Text[] = [];
  private essenceHoldTimer?: Phaser.Time.TimerEvent;
  private essenceHoldActiveType: Type | null = null;
  private essenceCommitTypeIndex: number = 0;
  private visualEssencePct: number = 0;
  private xpLabelTicker?: Phaser.Time.TimerEvent;
  private visualCurrentEssence: number = 0;
  private segmentFillFactor: number = 1.0;
  private lavaAnimationTimer?: Phaser.Time.TimerEvent;
  private lavaAnimationTime: number = 0;
  private healingPulseSound: Phaser.Sound.BaseSound | null = null;
  private isEssenceCommitActive: boolean = false;
  private healingPulseSoundStartTime: number = 0;
  private modalBgGraphics: Phaser.GameObjects.Graphics | null = null;

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
  private currentBackgroundVariation: number = 1;
  private skillTreeNodeGenerator?: SkillTreeNodeGenerator;
  private modalMessage: ModalMessageUiHandler | null = null;
  private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
  private modalBackgroundCreated: boolean = false;
  private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
  private modalPatternCreated: boolean = false;
  private availableChampions: string[] = [];
  private selectedChampionIndex = 0;
  private config: ChampionSelectConfig | null = null;
  private essenceListContainer: Phaser.GameObjects.Container | null = null;
  private essenceListItems: { icon: Phaser.GameObjects.GameObject; text: Phaser.GameObjects.Text }[] = [];
  private specialTypeSprites: Map<Type, Set<Phaser.GameObjects.Sprite>> = new Map();
  private lastSegmentsSignature: string | null = null;
  private lastEssenceListSignature: string | null = null;
  private lastEssenceErrorTime: number = 0;
  private get championManager(): ChampionManager {

    return new ChampionManager((this.scene as BattleScene).gameData);
  }
  private buildLockedSegments(championId: string): Array<{ types: Type[]; amount: number }> {
    const def = CHAMPION_DEFINITIONS[championId] as any;
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
  private renderSegments(
    segments: Array<{ types: Type[]; amount: number }>,
    getCurrentForTypes: (types: Type[]) => number,
    animate: boolean = false
  ): void {
    const signature = this.getSegmentsSignature(segments);
    const layoutChanged = (signature !== this.lastSegmentsSignature);
    this.lastSegmentsSignature = signature;
    if (animate && !layoutChanged && this.xpBarFillSegments.length === segments.length) {
      this.animateSegmentWidths(segments, getCurrentForTypes);
      return;
    }
    if (this.xpBarFill) {
      this.xpBarFill.clear();
    }
    if (this.xpBarBg) {
      this.xpBarBg.setVisible(true);
    }
    const previousWidths: number[] = [];
    if (animate && !layoutChanged && this.xpBarFillSegments.length === segments.length) {

      this.xpBarFillSegments.forEach((segFill, index) => {

        previousWidths[index] = (segFill as any)._currentWidth || 0;
      });
    }
    this.xpBarSegmentTweens.forEach(tween => tween.destroy());
    this.xpBarFillSegments.forEach(g => g.destroy());
    this.xpBarSegmentTexts.forEach(t => t.destroy());
    this.xpBarFillSegments = [];
    this.xpBarSegmentTweens = [];
    this.xpBarSegmentTexts = [];
    this.cleanupLavaLampAnimation();
    if (layoutChanged) {
      this.xpBarTypeIcons.forEach(s => s.destroy());
      this.xpBarIconTexts.forEach(t => t.destroy());
      this.xpBarTypeIcons = []; this.xpBarIconTexts = [];
    }
    const sortedSegments = [...segments].sort((a, b) => {
      const aHasGlitch = a.types.includes((Type as any).GLITCH);
      const aHasSmitty = a.types.includes((Type as any).SMITTY);
      const bHasGlitch = b.types.includes((Type as any).GLITCH);
      const bHasSmitty = b.types.includes((Type as any).SMITTY);
      if (aHasSmitty && !bHasSmitty) return 1;
      if (!aHasSmitty && bHasSmitty) return -1;
      if (aHasGlitch && !bHasGlitch && !bHasSmitty) return 1;
      if (!aHasGlitch && bHasGlitch && !aHasSmitty) return -1;
      return 0;
    });

    const barX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH / 2;
    const barY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_Y;
    const barW = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH;
    const barH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_HEIGHT;
    const n = Math.max(1, sortedSegments.length);
    const base = Math.floor(barW / n);
    let rem = barW - base * n;
    const widths = new Array(n).fill(base).map((w, i) => (i < rem ? w + 1 : w));

    let cursor = barX;
    sortedSegments.forEach((seg, i) => {
      const segW = widths[i];
      const progress = Math.min(getCurrentForTypes(seg.types), seg.amount);
      const targetProgressW = Math.min(segW, Math.floor(segW * (seg.amount > 0 ? progress / seg.amount : 0)));
      const segFill = this.scene.add.graphics();

      const segmentType = seg.types[0] || Type.NORMAL;
      const typeRgb = getTypeRgb(segmentType);
      const typeColor = Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]);

      segFill.fillStyle(typeColor, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_FILL_ALPHA);

      segFill.setDepth(15);
      this.xpBarContainer?.add(segFill);
      this.xpBarFillSegments.push(segFill);
      const displayProgressW = Math.floor(targetProgressW * this.segmentFillFactor);
      (segFill as any)._currentWidth = displayProgressW;
      if (displayProgressW > 0) {
        segFill.fillStyle(typeColor, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_FILL_ALPHA);
        segFill.fillRect(cursor, barY, displayProgressW, barH);
      }
      const textX = cursor + Math.floor(segW / 2);
      const textY = barY + Math.floor(barH / 2);
      const textContainer = this.scene.add.container(textX, textY);

      const label = addTextObject(this.scene, 0, 0, `${progress}/${seg.amount}`, TextStyle.WINDOW, {
        fontSize: ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_FONT_SIZE,
        align: "center"
      });
      label.setOrigin(0.5, 0.5);
      const textBg = this.scene.add.graphics();

      const bgWidth = label.displayWidth + (ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_PADDING * 2);
      const bgHeight = Math.max(1, label.displayHeight + (ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_PADDING * 2) - ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_HEIGHT_REDUCTION);
      textBg.fillStyle(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_COLOR, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_ALPHA);
      textBg.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);
      textBg.setDepth(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_BG_DEPTH);

      textContainer.add(textBg);
      textContainer.add(label);
      textContainer.setDepth(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_TEXT_DEPTH);
      this.xpBarContainer?.add(textContainer);
      this.xpBarSegmentTexts.push(label);
      if (layoutChanged) {
        const spacing = 16;
        const totalIconWidth = (seg.types.length - 1) * spacing;
        const startIconX = cursor + Math.floor(segW / 2) - Math.floor(totalIconWidth / 2);
        seg.types.forEach((type, idx) => {
          const isSpecial = (type === (Type as any).SMITTY || type === (Type as any).GLITCH);
          const atlasKey = isSpecial ? "categories" : Utils.getLocalizedSpriteKey("types");
          const frameKey = isSpecial ? (type === (Type as any).GLITCH ? "physical" : "special") : Type[type].toLowerCase();
          const iconX = startIconX + idx * spacing;
          const iconY = barY + barH + ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.TYPE_ICON_OFFSET_Y;
          const spr = this.scene.add.sprite(iconX, iconY, atlasKey, frameKey as any);
          spr.setOrigin(0.5, 0);
          spr.setDepth(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.TYPE_ICON_DEPTH);
          const scale = isSpecial ? ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.TYPE_ICONS_SPECIAL_SCALE : ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.TYPE_ICONS_SCALE;
          spr.setScale(scale);
          if (isSpecial) this.decorateSpecialIcon(type, spr);
          this.xpBarContainer?.add(spr);
          this.xpBarTypeIcons.push(spr);

          if (isSpecial) {
            const txt = addTextObject(this.scene, iconX, iconY + ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.ICON_TEXT_Y, Type[type] || "SPECIAL", TextStyle.WINDOW, {
              fontSize: ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.ICON_TEXT_FONT_SIZE,
              align: "center",
              stroke: "#000000",
              strokeThickness: 3
            });
            txt.setOrigin(0.5, 0.5);
            txt.setDepth(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.ICON_TEXT_DEPTH);
            this.xpBarContainer?.add(txt);
            this.xpBarIconTexts.push(txt);
          }
        });
      }
      cursor += segW;
    });
    this.createLavaLampAnimation(sortedSegments);
  }

  constructor(scene: BattleScene) {
    super(scene, Mode.CHAMPION_SELECT);
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
      case (SkillCategory as any).XMS: return SkillTreeRarity.ULTRA;
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
    }
  }

  private getSegmentsSignature(segments: Array<{ types: Type[]; amount: number }>): string {
    return segments
      .map(seg => (seg.types || []).map(t => Type[t]).sort().join("+") + ":" + (seg.amount || 0))
      .join("|");
  }

  private getEssenceListSignature(rows: Array<{ type: Type; count: number; isSpecial?: boolean }>): string {
    return rows
      .map(r => `${Type[r.type]}:${r.count}:${r.isSpecial || false}`)
      .join("|");
  }
  private createLavaLampAnimation(segments: Array<{ types: Type[]; amount: number }>): void {
    this.cleanupLavaLampAnimation();

    if (!this.xpBarContainer || segments.length === 0) return;
    this.lavaAnimationTime = 0;
    this.lavaAnimationTimer = this.scene.time.addEvent({
      delay: 1000 / ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.LAVA_ANIMATION.UPDATE_FREQUENCY,
      loop: true,
      callback: () => this.updateLavaLampAnimation(segments)
    });
  }
  private updateLavaLampAnimation(segments: Array<{ types: Type[]; amount: number }>): void {
    if (!this.xpBarContainer || this.xpBarFillSegments.length === 0) return;

    this.lavaAnimationTime += ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.LAVA_ANIMATION.WAVE_SPEED;
    const lavaConfig = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.LAVA_ANIMATION;

    const barX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH / 2;
    const barY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_Y;
    const barW = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH;
    const barH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_HEIGHT;
    const sortedSegments = [...segments].sort((a, b) => {
      const aHasGlitch = a.types.includes((Type as any).GLITCH);
      const aHasSmitty = a.types.includes((Type as any).SMITTY);
      const bHasGlitch = b.types.includes((Type as any).GLITCH);
      const bHasSmitty = b.types.includes((Type as any).SMITTY);

      if (aHasSmitty && !bHasSmitty) return 1;
      if (!aHasSmitty && bHasSmitty) return -1;
      if (aHasGlitch && !bHasGlitch && !bHasSmitty) return 1;
      if (!aHasGlitch && bHasGlitch && !aHasSmitty) return -1;
      return 0;
    });

    const n = Math.max(1, sortedSegments.length);
    const base = Math.floor(barW / n);
    let rem = barW - base * n;
    const widths = new Array(n).fill(base).map((w, i) => (i < rem ? w + 1 : w));

    let cursor = barX;
    sortedSegments.forEach((seg, i) => {
      const segW = widths[i];
      const segFill = this.xpBarFillSegments[i];

      if (segFill) {
        const progress = Math.min(1, seg.amount > 0 ? this.getCurrentForSegment(seg) / seg.amount : 0);
        const fillWidth = Math.floor(segW * progress);

        if (fillWidth > 0) {

          segFill.clear();
          this.drawEnhancedSegmentFill(segFill, cursor, barY, fillWidth, barH, seg.types[0] || Type.NORMAL, i);
        }
      }

      cursor += segW;
    });
  }
  private drawEnhancedSegmentFill(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, type: Type, segmentIndex: number): void {
    if (width <= 0 || height <= 0) return;

    const lavaConfig = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.LAVA_ANIMATION;
    const baseColor = this.getTypeBasedColor(type);
    const timeOffset = segmentIndex * 0.8;
    const baseEnergyPhase = this.lavaAnimationTime * lavaConfig.BASE_ENERGY_SPEED + timeOffset;
    const energyIntensity = 1 + Math.sin(baseEnergyPhase) * lavaConfig.BASE_ENERGY_INTENSITY;
    const typeRgb = getTypeRgb(type);
    const baseTypeColor = Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]);
    const brightnessFactor = energyIntensity;
    const finalR = Math.min(255, Math.floor(typeRgb[0] * brightnessFactor));
    const finalG = Math.min(255, Math.floor(typeRgb[1] * brightnessFactor));
    const finalB = Math.min(255, Math.floor(typeRgb[2] * brightnessFactor));

    const finalColor = (finalR << 16) | (finalG << 8) | finalB;

    graphics.fillStyle(finalColor, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_FILL_ALPHA);
    graphics.fillRect(x, y, width, height);
    this.drawGradientEnergy(graphics, x, y, width, height, type, timeOffset);
  }
  private drawGradientEnergy(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, type: Type, timeOffset: number): void {
    const lavaConfig = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.LAVA_ANIMATION;
    const typeRgb = getTypeRgb(type);
    const verticalSteps = 6;
    for (let step = 0; step < verticalSteps; step++) {
      const stepY = y + (step / verticalSteps) * height;
      const stepHeight = height / verticalSteps;
      const gradientFactor = 1 - (step / verticalSteps) * lavaConfig.VERTICAL_GRADIENT_RANGE;
      const gradientR = Math.min(255, Math.floor(typeRgb[0] * gradientFactor));
      const gradientG = Math.min(255, Math.floor(typeRgb[1] * gradientFactor));
      const gradientB = Math.min(255, Math.floor(typeRgb[2] * gradientFactor));
      const gradientColor = (gradientR << 16) | (gradientG << 8) | gradientB;

      graphics.fillStyle(gradientColor, lavaConfig.VERTICAL_GRADIENT_ALPHA);
      graphics.fillRect(x, stepY, width, stepHeight);
    }
    const wavePhase = this.lavaAnimationTime * lavaConfig.WAVE_SPEED * lavaConfig.ENERGY_WAVE_SPEED_MULTIPLIER + timeOffset;
    const waveProgress = ((wavePhase % (Math.PI * 2)) / (Math.PI * 2));
    const waveWidth = width * 0.5;
    const waveCenter = x - waveWidth * 0.5 + waveProgress * (width + waveWidth);
    const waveSteps = 20;
    for (let i = 0; i < waveSteps; i++) {
      const stepX = waveCenter - waveWidth * 0.5 + (i / waveSteps) * waveWidth;
      const stepWidth = waveWidth / waveSteps;
      if (stepX < x + width && stepX + stepWidth > x) {

        const distanceFromCenter = Math.abs(stepX + stepWidth * 0.5 - waveCenter);
        const normalizedDistance = distanceFromCenter / (waveWidth * 0.5);
        const waveAlpha = Math.cos(normalizedDistance * Math.PI * 0.5);
        const energyAlpha = Math.max(0, waveAlpha * waveAlpha) * lavaConfig.ENERGY_WAVE_ALPHA;

        if (energyAlpha > 0.01) {

          const brightR = Math.min(255, Math.floor(typeRgb[0] * lavaConfig.ENERGY_WAVE_BRIGHTNESS));
          const brightG = Math.min(255, Math.floor(typeRgb[1] * lavaConfig.ENERGY_WAVE_BRIGHTNESS));
          const brightB = Math.min(255, Math.floor(typeRgb[2] * lavaConfig.ENERGY_WAVE_BRIGHTNESS));
          const brightColor = (brightR << 16) | (brightG << 8) | brightB;

          graphics.fillStyle(brightColor, energyAlpha);
          graphics.fillRect(
            Math.max(x, stepX),
            y,
            Math.min(stepWidth, x + width - Math.max(x, stepX)),
            height
          );
        }
      }
    }
  }
  private getTypeBasedColor(type: Type): number {

    switch (type) {
      case Type.NORMAL: return 0xA8A878;
      case Type.FIRE: return 0xF08030;
      case Type.WATER: return 0x6890F0;
      case Type.ELECTRIC: return 0xF8D030;
      case Type.GRASS: return 0x78C850;
      case Type.ICE: return 0x98D8D8;
      case Type.FIGHTING: return 0xC03028;
      case Type.POISON: return 0xA040A0;
      case Type.GROUND: return 0xE0C068;
      case Type.FLYING: return 0xA890F0;
      case Type.PSYCHIC: return 0xF85888;
      case Type.BUG: return 0xA8B820;
      case Type.ROCK: return 0xB8A038;
      case Type.GHOST: return 0x705898;
      case Type.DRAGON: return 0x7038F8;
      case Type.DARK: return 0x705848;
      case Type.STEEL: return 0xB8B8D0;
      case Type.FAIRY: return 0xEE99AC;
      case (Type as any).GLITCH: return 0xFF00FF;
      case (Type as any).SMITTY: return 0xFF4444;
      default: return 0xFFD700;
    }
  }
  private getCurrentForSegment(segment: { types: Type[]; amount: number }): number {
    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    if (!selectedChampionId) return 0;

    const isUnlocked = this.championManager.isChampionUnlockedInData(selectedChampionId);

    if (isUnlocked) {
      const data = this.championManager.getChampionData(selectedChampionId);
      const levelEssence = (data as any).levelEssence || {};
      return segment.types.reduce((sum, t) => sum + (levelEssence[t] || 0), 0);
    } else {
      const gd = (this.scene as BattleScene).gameData;
      const committed = (gd.championData?.[selectedChampionId]?.unlockCommit || {}) as Record<number, number>;
      return segment.types.reduce((sum, t) => sum + (committed[t] || 0), 0);
    }
  }
  private cleanupLavaLampAnimation(): void {

    if (this.lavaAnimationTimer) {
      this.lavaAnimationTimer.remove(false);
      this.lavaAnimationTimer = undefined;
    }

    this.lavaAnimationTime = 0;
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
    this.updateEssenceGauge(championId, true);
    this.updateGridXpGauge(championId);
    const level = this.championManager.getChampionData(championId)?.level || 1;
    if (previousLevel !== null && level > previousLevel) {
      this.isLevelUpAnimationActive = true;
      await playGenericLevelUpAnimation(this.scene as BattleScene);
      this.isLevelUpAnimationActive = false;
      this.lockInput(500);
      this.renderSkillList(championId);
      try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
    }
  }

  getModalTitle(): string { return i18next.t("championSelect:title", { defaultValue: "Select Champion" }); }
  getWidth(): number { return Math.floor(this.scene.game.canvas.width / 6) + 8; }
  getHeight(): number { return Math.floor(this.scene.game.canvas.height / 6) + 6; }
  getMargin(): [number, number, number, number] { return [4, 4, 8, 4]; }
  getButtonLabels(): string[] { return []; }

  protected createModalBackground(): void {
  }

  updateContainer(config?: ModalConfig): void {
    super.updateContainer(config);

    if (!this.modalBackgroundCreated) {
      this.modalBackgroundImage = this.scene.add.image(0, 0, "battle_path_blur_bg");
      this.modalBackgroundImage.setOrigin(0, 0);
      this.modalContainer.addAt(this.modalBackgroundImage, 1);
      this.modalBackgroundCreated = true;
    }

    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.setPosition(
        this.modalBg.x,
        this.modalBg.y
      );
      this.modalBackgroundImage.setDisplaySize(
        this.modalBg.width,
        this.modalBg.height
      );
    }

    if (!this.modalPatternCreated) {
      this.modalPatternOverlay = this.scene.add.container(0, 0);
      this.modalContainer.addAt(this.modalPatternOverlay, 2);

      createSporadicPattern(this.scene, this.modalPatternOverlay);

      this.modalPatternCreated = true;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.setPosition(
        this.modalBg.x,
        this.modalBg.y
      );
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
    this.titleBackground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.95, 0.0, 0.95, 0.0);
    this.titleBackground.fillRect(0, 0, width, c.TITLE_CONTAINER.HEIGHT);
    this.titleContainer.add(this.titleBackground);

    if (!this.titleText) {
      this.titleText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: c.TITLE.FONT_SIZE });
    } else if (this.titleText.parentContainer) {
      this.titleText.parentContainer.remove(this.titleText);
    }

    this.titleContainer.add(this.titleText);
    this.titleText.setText(i18next.t("championSelect:title", { defaultValue: "Select Champion" }));
    this.titleText.setPosition(c.TITLE.X_OFFSET, c.TITLE.Y_OFFSET);
    this.titleText.setOrigin(0, 0);
    this.titleText.setStyle({ fontSize: c.TITLE.FONT_SIZE, align: "left" });
    this.titleText.setTint(c.TITLE.COLOR);
    this.titleText.setAlpha(c.TITLE.ALPHA);
    this.titleText.setVisible(true);

    this.subtitleText = addTextObject(this.scene,
      c.SUBTITLE.X_OFFSET,
      c.SUBTITLE.Y_OFFSET,
      i18next.t("championSelect:subheader", { defaultValue: "Who will you choose to venture into the Void?" }),
      TextStyle.WINDOW,
      { fontSize: c.SUBTITLE.FONT_SIZE, align: "left" }
    );
    this.subtitleText.setOrigin(0, 0);
    this.subtitleText.setTint(c.SUBTITLE.COLOR);
    this.subtitleText.setAlpha(c.SUBTITLE.ALPHA);
    this.titleContainer.add(this.subtitleText);

    this.fixTitlePositioning();
  }

  private fixTitlePositioning(): void {
    const c = ChampionSelectUiHandler.UI_CONSTANTS;

    if (this.titleText && this.titleContainer) {
      this.titleText.setPosition(c.TITLE.X_OFFSET, c.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0, 0);

      if (this.subtitleText) {
        const titleWidth = this.titleText.displayWidth;
        this.subtitleText.setPosition(c.TITLE.X_OFFSET + titleWidth + 15, c.SUBTITLE.Y_OFFSET);
      }
    }
  }

  setup(): void {
    super.setup();
    this.rootContainer = this.scene.add.container(0, 0);
    this.modalContainer.add(this.rootContainer);
    this.setupTitleContainer();

    this.infoContainer = this.scene.add.container(10, 18);
    this.rootContainer.add(this.infoContainer);
    this.infoContainer.setDepth(1);
    const previewX = Math.floor(this.getWidth() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.X;
    const previewY = Math.floor(this.getHeight() / 2) + ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.Y;
    this.basePreviewY = previewY;
    this.previewContainer = this.scene.add.container(previewX, previewY);
    this.rootContainer.add(this.previewContainer);
    this.previewContainer.setDepth(1);
    const previewName = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.NAME_Y, "", TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.NAME_FONT_SIZE,
      align: "center"
    });
    previewName.setOrigin(0.5, 1);
    this.previewContainer.add(previewName);
    (this as any)._previewName = previewName;
    this.typeIcon1 = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, Utils.getLocalizedSpriteKey("types"));
    this.typeIcon1.setVisible(false);
    this.typeIcon2 = this.scene.add.sprite(0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_Y, Utils.getLocalizedSpriteKey("types"));
    this.typeIcon2.setVisible(false);
    this.previewContainer.add(this.typeIcon1);
    this.previewContainer.add(this.typeIcon2);
    this.typeIcon1.setScale(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_SCALE);
    this.typeIcon2.setScale(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_SCALE);
    const previewSubtitle = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SUBTITLE_Y, "", TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SUBTITLE_FONT_SIZE,
      align: "center"
    });
    previewSubtitle.setOrigin(0.5, 0);
    this.previewContainer.add(previewSubtitle);
    (this as any)._previewSubtitle = previewSubtitle;
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
    this.skillTooltipBg = this.scene.add.graphics();
    this.skillTooltipTitleBarBg = this.scene.add.graphics();
    this.skillTooltipRarityBarBg = this.scene.add.graphics();
    this.skillTooltipTitle = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_FONT_SIZE, fontStyle: "bold" });
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
    this.skillTooltipContainer.add(this.skillTooltipPrereq);
    this.skillTooltipContainer.setVisible(false);
    this.skillListPanelContainer.add(this.skillTooltipContainer);
    this.rootContainer.add(this.skillListPanelContainer);
    this.levelText = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.LEVEL.Y, "LEVEL 1", TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.LEVEL.FONT_SIZE,
      align: "center"
    });
    this.levelText.setOrigin(0.5);
    this.skillsContainer.add(this.levelText);
    this.essenceInstructionText = addTextObject(this.scene, 0, ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.Y, "", TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.FONT_SIZE,
      align: "center"
    });
    this.essenceInstructionText.setOrigin(0.5, 0);
    this.essenceInstructionText.setAlpha(ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_INSTRUCTION.ALPHA);
    this.skillsContainer.add(this.essenceInstructionText);
    this.xpBarContainer = this.scene.add.container(0, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.CONTAINER_Y);
    this.skillsContainer.add(this.xpBarContainer);
    this.xpBarBg = this.scene.add.graphics();
    this.xpBarBg.fillStyle(0x000000, 0.8);
    const xpBgX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_WIDTH / 2;
    const xpBgY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_Y;
    const xpBgW = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_WIDTH;
    const xpBgH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BG_HEIGHT;
    this.xpBarBg.fillRect(xpBgX, xpBgY, xpBgW, xpBgH);
    this.xpBarBg.lineStyle(1, 0xffffff, 0.6);
    this.xpBarBg.strokeRect(xpBgX, xpBgY, xpBgW, xpBgH);
    this.xpBarRect = { x: xpBgX, y: xpBgY, w: xpBgW, h: xpBgH };
    this.xpBarContainer.add(this.xpBarBg);
    this.xpBarFill = this.scene.add.graphics();
    this.xpBarFill.fillStyle(0xFFD700, 0.9);
    const xpFillX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH / 2;
    this.xpBarFill.fillRect(xpFillX, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_Y, 0, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_HEIGHT);
    this.xpBarContainer.add(this.xpBarFill);
    this.xpBarContainer.bringToTop(this.xpBarFill);
    this.useEssenceButtonContainer = this.scene.add.container(0, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_Y);
    this.useEssenceButtonBg = this.scene.add.graphics();
    this.useEssenceButtonBg.fillStyle(0x000000, 0.8);
    this.useEssenceButtonBg.lineStyle(ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_BORDER_SIZE, 0xffffff, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_BORDER_ALPHA);
    const btnX = -ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_WIDTH / 2;
    const btnY = -ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_HEIGHT / 2;
    this.useEssenceButtonBg.fillRect(btnX, btnY, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_HEIGHT);
    this.useEssenceButtonBg.strokeRect(btnX, btnY, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_WIDTH, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_HEIGHT);
    this.useEssenceButtonContainer.add(this.useEssenceButtonBg);

    this.useEssenceButtonText = addTextObject(this.scene, ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_TEXT_X, 0, i18next.t("championSelect:button.useEssence", { defaultValue: "Use Essence" }), TextStyle.WINDOW, {
      fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_TEXT_FONT_SIZE,
      align: "center"
    });
    this.useEssenceButtonText.setOrigin(0.5, 0.5);
    this.useEssenceButtonContainer.add(this.useEssenceButtonText);

    this.useEssenceButtonIcon = this.scene.add.sprite(
      ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_ICON_X,
      0,
      "keyboard"
    );
    this.useEssenceButtonIcon.setFrame("C.png");
    this.useEssenceButtonIcon.setScale(ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.BUTTON_SCALE);
    this.useEssenceButtonIcon.setOrigin(0.5, 0.5);
    this.useEssenceButtonContainer.add(this.useEssenceButtonIcon);
    this.soulIconSprite = this.scene.add.sprite(
      ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_SOUL_ICON_X,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_SOUL_ICON_Y,
      "smitems",
      "modSoulCollected"
    );
    this.soulIconSprite.setScale(ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.USE_ESSENCE_BUTTON_SOUL_ICON_SCALE);
    this.soulIconSprite.setOrigin(0.5, 0.5);
    this.useEssenceButtonContainer.add(this.soulIconSprite);

    this.skillsContainer.add(this.useEssenceButtonContainer);
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

    this.modalMessage = new ModalMessageUiHandler(this.scene, this.modalContainer, this.getWidth(), this.getHeight());
    this.modalMessage.setup();
  }

  private updateEssenceButtonIcon(): void {
    if (!this.useEssenceButtonIcon) return;

    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad") {
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

    this.config = config || null;
    this.availableChampions = [];
    this.selectedChampionIndex = 0;
    this.skillTooltipActive = false;
    this.hasInteractedWithSkillList = false;

    this.loadChampionData();
    if (this.availableChampions.length === 0) {
      console.error("ChampionSelect: no champions available");
      return true;
    }

    this.displayChampionGrid();
    this.updateChampionInfo();
    if (this.skillsHeaderText) {
      this.skillsHeaderText.setText(i18next.t("championSelect:skillsHeader", { defaultValue: "SKILLS" }));
    }
    if (this.skillsSubheaderText) {
      this.skillsSubheaderText.setText(
        i18next.t("championSelect:skillsSubheader", { defaultValue: "Unlocked skills will randomly appear in Skill Tree." })
      );
    }
    if (this.subtitleText) { this.subtitleText.setVisible(true); }
    if (this.gridBgGraphics) { this.gridBgGraphics.setVisible(true); }
    if (this.skillListPanelContainer) { this.skillListPanelContainer.setVisible(true); }
    this.layoutSkillListPanel();
    this.updateEssenceButtonIcon();
    try {
      const scene = this.scene as BattleScene;
      const key = "voice/champion_select";
      if ((scene as any).cache?.audio?.exists(key)) {
        scene.playSound(key);
      }
    } catch {}
    this.fixTitlePositioning();
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

          this.playUnlockAnimationAfterCutscene(effectiveId);
          scene.playBgm();
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
      try { scene.playBgm(); } catch {}
      try { this.cleanupChampionUnlockHoldToSkip(); } catch {}
      try {
        if (!gd.gameStats.cutsceneChampionUnlockShown) gd.gameStats.cutsceneChampionUnlockShown = {};
        gd.gameStats.cutsceneChampionUnlockShown[effectiveId] = true;
      } catch {}
      this.isChampionUnlockCutsceneActive = false;
      try { this.playUnlockAnimationAfterCutscene(effectiveId); } catch {}
    });
  }

  private playUnlockAnimationAfterCutscene(effectiveId: string): void {
    const name = ChampionUtils.getChampionDisplayName(effectiveId);
    const msg = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
    this.isLevelUpAnimationActive = true;
    playGenericLevelUpAnimation(this.scene as BattleScene, msg, 800).then(() => {
      this.isLevelUpAnimationActive = false;
      this.lockInput(500);
    });
  }
  clear(): void {
    this.cleanupChampionUnlockHoldToSkip();
    if (this.modalMessage) {
      this.modalMessage.clear();
    }
    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.destroy();
      this.modalBackgroundImage = null;
      this.modalBackgroundCreated = false;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.removeAll(true);
      this.modalPatternOverlay.destroy();
      this.modalPatternOverlay = null;
      this.modalPatternCreated = false;
    }

    this.championSprites.forEach(s => s.destroy());
    this.championNameTexts.forEach(t => t.destroy());
    this.championDescTexts.forEach(t => t.destroy());
    this.unlockStatusTexts.forEach(t => t.destroy());
    this.championSprites = [];
    this.championNameTexts = [];
    this.championDescTexts = [];
    this.unlockStatusTexts = [];
        if (this.fullChampionSprite) { this.fullChampionSprite.destroy(); this.fullChampionSprite = null; }
    if (this.fullChampionTintSprite) { this.fullChampionTintSprite.destroy(); this.fullChampionTintSprite = null; }
    if (this.subtitleText) { this.subtitleText.setVisible(false); }
    if (this.gridBgGraphics) { this.gridBgGraphics.setVisible(false); }
    if (this.skillListPanelContainer) { this.skillListPanelContainer.setVisible(false); }
    this.stopEssenceHold();
    this.cleanupLavaLampAnimation();
    this.stopHealingPulseSound();
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
      return false;
    }

    this.updateEssenceButtonIcon();

    if (this.isLevelUpAnimationActive) {
      if (button !== undefined) {
        skipCurrentLevelUpAnimation();
        this.isLevelUpAnimationActive = false;
        return true;
      }
      return false;
    }

    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    const champ = this.championManager.getChampionData(selectedChampionId);
    const isUnlocked = this.championManager.isChampionUnlockedInData(selectedChampionId);
    const primaryType: Type | undefined = (CHAMPION_DEFINITIONS[selectedChampionId]?.type1 as unknown as Type) || undefined;
    const def = CHAMPION_DEFINITIONS[selectedChampionId] as any;

    switch (button) {
      case Button.RIGHT:

        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
        }

        this.stopEssenceHold();
        if (this.availableChampions.length > 0) {
          if (this.selectedChampionIndex < this.availableChampions.length - 1) {
            this.selectedChampionIndex++;
          } else {
            this.selectedChampionIndex = 0;
          }
          this.updateChampionInfo();
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.LEFT:

        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
        }

        this.stopEssenceHold();
        if (this.availableChampions.length > 0) {
          if (this.selectedChampionIndex > 0) {
            this.selectedChampionIndex--;
          } else {
            this.selectedChampionIndex = this.availableChampions.length - 1;
          }
          this.updateChampionInfo();
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.UP:

        this.hasInteractedWithSkillList = true;
        this.skillTooltipActive = true;
        if (this.updateSkillSelection(-1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.DOWN:
        this.hasInteractedWithSkillList = true;
        this.skillTooltipActive = true;
        if (this.updateSkillSelection(1)) {
          try { (this.scene as BattleScene).ui.playSelect(); } catch {}
          return true;
        }
        break;
      case Button.STATS:

        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
        }
        if (!isUnlocked) {
          if (primaryType !== undefined) {
            const before = this.championManager.getChampionData(selectedChampionId)?.level || 1;
            const commitResult = this.attemptCommitEssenceOnce(selectedChampionId, primaryType);
            if (commitResult.success) {

              this.onCommitBegin();
              const { current: progCurrent, required: progRequired } = this.getUnifiedEssenceProgressForChampion(selectedChampionId);
              if (!this.xpLabelTicker) {

                const target = Math.max(0, Math.floor(progCurrent));
                const seed = Math.max(0, target - commitResult.amount);
                this.visualCurrentEssence = seed;
              }
              this.ensureXpLabelTicker(Math.floor(progCurrent));

              this.onEssenceCommitted(selectedChampionId, before);

              this.onCommitEnd();
              return true;
            }

            this.startEssenceHold(selectedChampionId, primaryType);
            return true;
          }
          return false;
        }

        if (primaryType !== undefined) {
          const before = this.championManager.getChampionData(selectedChampionId)?.level || 1;
          const commitResult = this.attemptCommitEssenceOnce(selectedChampionId, primaryType);
          if (commitResult.success) {

            this.onCommitBegin();
            const { current: progCurrent, required: progRequired } = this.getUnifiedEssenceProgressForChampion(selectedChampionId);
            if (!this.xpLabelTicker) {

              const target = Math.max(0, Math.floor(progCurrent));
              const seed = Math.max(0, target - commitResult.amount);
              this.visualCurrentEssence = seed;
            }
            this.ensureXpLabelTicker(Math.floor(progCurrent));

            this.onEssenceCommitted(selectedChampionId, before);

            this.onCommitEnd();
            return true;
          }

          this.startEssenceHold(selectedChampionId, primaryType);
          return true;
        }
        return false;
      case Button.ACTION:
      case Button.SUBMIT:

        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
        }
        return this.confirmChampionSelection();
      case Button.CANCEL:
        this.stopEssenceHold();

        if (this.skillTooltipActive) {
          this.skillTooltipActive = false;
          this.skillTooltipContainer?.setVisible(false);
          return true;
        }

        try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}

        if (this.config?.onCancel) {
          try { this.config.onCancel(); } catch {}
        } else {
          const scene = this.scene as BattleScene;
          scene.ui.clearText();
          scene.ui.setMode(Mode.MESSAGE).then(() => {

            (scene as any).clearAllPhaseQueues?.();
            scene.pushPhase(new TitlePhase(scene as any));
            scene.getCurrentPhase()?.end();
          });
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

    this.availableChampions = allChampionIds;
    if (this.availableChampions.length === 0) {
      this.availableChampions = ["apollo_diana"];
    }

    try { (this.scene as BattleScene).gameData.saveSystem(); } catch {}
  }

  private displayChampionGrid(): void {
    this.championSprites.forEach(s => s.destroy());
    this.championNameTexts.forEach(t => t.destroy());
    this.championDescTexts.forEach(t => t.destroy());
    this.unlockStatusTexts.forEach(t => t.destroy());
    this.gridXpContainers.forEach(c => c.destroy());
    this.gridXpBarBgs.forEach(g => g.destroy());
    this.gridXpBarFills.forEach(g => g.destroy());
    this.gridLevelLabels.forEach(t => t.destroy());
    this.gridCellBackgrounds.forEach(g => g.destroy());
    if (this.gridBordersGraphics) { this.gridBordersGraphics.destroy(); this.gridBordersGraphics = null; }
    this.championSprites = [];
    this.championNameTexts = [];
    this.championDescTexts = [];
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
    this.hasInteractedWithSkillList = false;
    this.skillTooltipActive = false;
    this.skillTooltipContainer?.setVisible(false);
    this.stopEssenceHold();
    this.visualEssencePct = 0;
    this.visualCurrentEssence = 0;
    this.segmentFillFactor = 1.0;

    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    this.updateGridSpriteSelection(selectedChampionId);
    this.displayFullChampionSprite(selectedChampionId);
    this.updateTypeIcons(selectedChampionId);

    const resolvedId = this.resolveChampionId(selectedChampionId);
    const isUnlocked = this.championManager.isChampionUnlocked(selectedChampionId) || (this.championManager.getChampionData(selectedChampionId)?.isUnlocked === true);

    const name = isUnlocked ? ChampionUtils.getChampionDisplayName(resolvedId) : "???";

    if ((this as any)._previewName) {
      (this as any)._previewName.setText(name);
    }
    const subtitle = isUnlocked ? this.getChampionDescription(selectedChampionId) : "??? ??? ???";
    if ((this as any)._previewSubtitle) {
      (this as any)._previewSubtitle.setText(subtitle);
    }
    this.updateEssenceGauge(selectedChampionId, false);
    const { current, required } = this.getUnifiedEssenceProgressForChampion(selectedChampionId);
    this.visualCurrentEssence = current;
    this.visualEssencePct = required > 0 ? current / required : 0;

    this.renderSkillsPanel(selectedChampionId);
    this.renderSkillList(selectedChampionId);
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

    const nodeGen = new SkillTreeNodeGenerator(0, def.id, this.scene as BattleScene);
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
    const typesLabel = typesList.map(t => getTypeName(t)).join(" / ");
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

    return [...finalUnlockedSkills, ...lockedSkills.slice(0, 4)];
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
    const data = this.championManager.getChampionData(championId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def.id) || (data?.isUnlocked === true);
    const isUnlockedCheck = (skillId: string, s: any) => !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);
    if (skills.length === 0) {
      this.selectedSkillIndex = -1;
      this.skillScrollOffset = 0;
    } else if (this.selectedSkillIndex < 0) {
      const currentLevel = data?.level ?? 1;
      const nextIdx = skills.findIndex(([_, s]) => (((s as any)?.unlockLevel ?? 0) === currentLevel + 1));
      const fallbackIdx = nextIdx >= 0 ? nextIdx : skills.findIndex(([skillId, s]) => !isUnlockedCheck(skillId, s));
      this.selectedSkillIndex = fallbackIdx >= 0 ? fallbackIdx : 0;
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
    const startY = 0;
    for (let i = 0; i < visible.length; i++) {
      const [skillId, s] = visible[i];
      const textContent = this.getSkillDisplayText(championId, skillId, s, isUnlockedCheck(skillId, s));
      const text = addTextObject(this.scene, 0, 0, textContent, TextStyle.WINDOW, { fontSize: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.SKILL_ITEM_FONT_SIZE, align: "center" });
      text.setOrigin(0.5);
      text.setStyle({ ...text.style, wordWrap: { width: ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH } });
      if (text.width > ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH) {
        this.fitTextToSingleLine(text, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_MAX_TEXT_WIDTH);
      }
      const boxWidth = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_WIDTH;
      const boxHeight = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_HEIGHT;

      const container = this.scene.add.container(0, startY + i * (boxHeight + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.ITEM_SPACING));
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

        if (rarity !== SkillTreeRarity.COMMON) {
          text.setTint(colors.border);
        }
      }

      container.add(bg);
      container.add(text);
      this.skillListContainer.add(container);
      this.skillItemContainers.push(container);
      this.skillItemBgs.push(bg);
    }
    if (this.skillArrowUp) this.skillArrowUp.setVisible(false);
    if (this.skillArrowDown) this.skillArrowDown.setVisible(this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS < skills.length);
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
      const nodeGen = new SkillTreeNodeGenerator(0, championId, this.scene as BattleScene);
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

      if (championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1)) {
        return `Lvl ${unlockLevel}: ${name}`;
      } else {
        return `Lvl ${unlockLevel} ???`;
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

  private updateSkillSelection(delta: number): boolean {
    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    const def = CHAMPION_DEFINITIONS[selectedChampionId] as any;
    const data = this.championManager.getChampionData(selectedChampionId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def.id) || (data?.isUnlocked === true);

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    if (skills.length === 0) return false;
    if (this.selectedSkillIndex < 0) {
      this.selectedSkillIndex = 0;
      this.renderSkillList(selectedChampionId);
      return true;
    }
    const newIndex = (this.selectedSkillIndex + delta + skills.length) % skills.length;
    if (newIndex === this.selectedSkillIndex) return false;
    this.selectedSkillIndex = newIndex;
    if (this.selectedSkillIndex < this.skillScrollOffset) {
      this.skillScrollOffset = this.selectedSkillIndex;
    } else if (this.selectedSkillIndex >= this.skillScrollOffset + ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS) {
      this.skillScrollOffset = this.selectedSkillIndex - (ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.MAX_VISIBLE_SKILLS - 1);
    }
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

  private drawTooltipGradientBackground(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, radius: number): void {
    const topColor = { r: 106, g: 15, b: 58 };
    const bottomColor = { r: 0, g: 0, b: 0 };

    const gradientSteps = 48;

    for (let step = 0; step < gradientSteps; step++) {
      const stepY = y + (step / gradientSteps) * height;
      const stepHeight = height / gradientSteps;

      const rawFactor = step / (gradientSteps - 1);
      const factor = Math.pow(rawFactor, 2.5);

      const r = Math.floor(topColor.r * (1 - factor) + bottomColor.r * factor);
      const g = Math.floor(topColor.g * (1 - factor) + bottomColor.g * factor);
      const b = Math.floor(topColor.b * (1 - factor) + bottomColor.b * factor);
      const color = (r << 16) | (g << 8) | b;

      graphics.fillStyle(color, 0.85);
      graphics.fillRect(x, stepY, width, stepHeight + (step < gradientSteps - 1 ? 1 : 0));
    }
  }

  private updateSkillTooltip(championId: string): void {
    if (!this.skillTooltipContainer || !this.skillTooltipBg || !this.skillTooltipTitle || !this.skillTooltipRarity || !this.skillTooltipDesc) return;

    const viewChampionId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[viewChampionId] as any;
    const data = this.championManager.getChampionData(championId);
    const allSkills = (def?.lockedSkills ? Object.entries(def.lockedSkills) : []) as Array<[string, any]>;

    const championUnlocked = this.championManager.isChampionUnlocked(def.id) || (data?.isUnlocked === true);
    const isUnlockedCheck = (skillId: string, s: any) => !!data?.unlockedSkills?.[skillId] || (championUnlocked && (s.isDefault || this.isSkillDefaultUnlocked(def, s)));

    const skills = this.getOrderedSkillList(def, data, allSkills, championUnlocked);

    if (skills.length === 0) { this.skillTooltipContainer.setVisible(false); return; }
    const [skillId, s] = skills[this.selectedSkillIndex];
    const isUnlocked = isUnlockedCheck(skillId, s);
    const unlockLevel = (s as any)?.unlockLevel ?? 0;

    let title = "";
    let desc = "";

    if (isUnlocked) {
      title = this.getSkillDisplayText(viewChampionId, skillId, s, true);
      desc = this.getSkillDescription(viewChampionId, unlockLevel, s);
      this.skillTooltipCost.setText("");
      this.skillTooltipPrereq.setText("");
    } else {
      const playerLevel = data?.level ?? 1;
      const isNextLevelUnlock = unlockLevel === playerLevel + 1;
      const canCurrentlyUnlock = playerLevel >= unlockLevel;
      const championUnlocked = this.championManager.isChampionUnlocked(championId) || (data?.isUnlocked === true);
      const isImmediatelyUnlockableLocal = championUnlocked ? (isNextLevelUnlock || canCurrentlyUnlock) : (unlockLevel === 1);

      if (!isImmediatelyUnlockableLocal) {
        title = i18next.t("championSelect:tooltip.lockedSkillTitle", { defaultValue: "Locked Skill" });
        desc = i18next.t("championSelect:tooltip.levelRequired", { level: unlockLevel, defaultValue: "Must be Level {{level}} to unlock." });
        this.skillTooltipCost.setText("");
        this.skillTooltipPrereq.setText("");
      } else {
        const baseTitle = this.getSkillNameOnly(viewChampionId, s);
        const lockedPrefix = i18next.t("championSelect:tooltip.lockedPrefix", { defaultValue: "LOCKED" });
        title = isImmediatelyUnlockableLocal ? `${lockedPrefix} ${baseTitle}` : baseTitle;

        const skillDesc = this.getSkillDescription(viewChampionId, unlockLevel, s);
        desc = skillDesc;

        try {
          const dynamicText = this.getDynamicEssenceText(data);
          if (dynamicText) {
             const header = i18next.t("championSelect:unlockRequired", { requirement: "", defaultValue: "Requires:" }).trim();
             this.skillTooltipCost.setText(`${header}\n${dynamicText}`);
             this.skillTooltipCost.setColor("#ffffff");
          } else {
            const essenceProgress = ChampionXPManager.getEssenceProgress(data);
            const current = Math.floor(essenceProgress.current);
            const required = Math.floor(essenceProgress.required);
            const legacyMsg = i18next.t("championSelect:tooltip.unlockWithEssence", { current, required, defaultValue: "Unlock by using {{current}}/{{required}} Essences to Level Up!" });
            this.skillTooltipCost.setText(legacyMsg);
            this.skillTooltipCost.setColor(current >= required ? "#00ff00" : "#ff0000");
          }
        } catch {
          this.skillTooltipCost.setText("");
        }
        this.skillTooltipPrereq.setText("");
      }
    }

    this.skillTooltipTitle.setText(title);
    this.skillTooltipDesc.setText(desc);
    const rarity = this.getSkillRarityFromDef(s);
    const rarityText = this.getRarityText(rarity);
    const rarityColors = this.getRarityColors(rarity);
    this.skillTooltipRarity.setText(rarityText);
    this.skillTooltipRarity.setTint(rarityColors.border);
    const c = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL;
    const tooltipWidth = c.TOOLTIP_MAX_WIDTH;
    const scaleX = Math.max(
      this.skillTooltipDesc.scaleX || 1,
      this.skillTooltipPrereq.scaleX || 1,
      this.skillTooltipCost.scaleX || 1
    );
    const wrapWidth = tooltipWidth - c.TOOLTIP_PADDING * 2;
    const wrapWidthPreScale = Math.max(0, wrapWidth / scaleX);

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
    this.skillTooltipDesc.setLineSpacing(descLineSpacing);

    if (this.skillTooltipPrereq.text) {
      this.skillTooltipPrereq.setStyle({
        ...this.skillTooltipPrereq.style,
        wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
      });
      this.skillTooltipPrereq.setLineSpacing(prereqLineSpacing);
    }

    const barsHeight = c.TOOLTIP_TITLE_BAR_HEIGHT + c.TOOLTIP_RARITY_BAR_HEIGHT;
    const descHeight = this.skillTooltipDesc.displayHeight;
    const costHeight = this.skillTooltipCost.displayHeight;
    const prereqHeight = this.skillTooltipPrereq.text ? this.skillTooltipPrereq.displayHeight : 0;

    const contentHeight = descHeight + costHeight + prereqHeight +
                         (prereqHeight > 0 ? c.TOOLTIP_TEXT_SPACING * 2 : c.TOOLTIP_TEXT_SPACING);
    const tooltipHeight = barsHeight + contentHeight + c.TOOLTIP_PADDING * 2;

    this.skillTooltipTitle.setPosition(tooltipWidth / 2, c.TOOLTIP_TITLE_TEXT_Y);
    this.skillTooltipRarity.setPosition(tooltipWidth / 2, c.TOOLTIP_RARITY_TEXT_Y);

    let currentY = c.TOOLTIP_CONTENT_Y + 2;
    this.skillTooltipDesc.setPosition(c.TOOLTIP_PADDING, currentY);
    currentY += this.skillTooltipDesc.displayHeight + c.TOOLTIP_TEXT_SPACING;

    this.skillTooltipCost.setPosition(c.TOOLTIP_PADDING, currentY);
    currentY += this.skillTooltipCost.displayHeight + c.TOOLTIP_TEXT_SPACING;

    this.skillTooltipPrereq.setPosition(c.TOOLTIP_PADDING, currentY);
    this.skillTooltipBg.clear();
    this.skillTooltipTitleBarBg.clear();
    this.skillTooltipRarityBarBg.clear();
    this.drawTooltipGradientBackground(
      this.skillTooltipBg,
      0, 0,
      tooltipWidth,
      tooltipHeight,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RADIUS
    );
    this.skillTooltipBg.lineStyle(
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_BORDER_THICKNESS,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_BORDER_COLOR,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_BORDER_ALPHA
    );
    this.skillTooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RADIUS);
    this.skillTooltipTitleBarBg.fillStyle(rarityColors.border, 0.3);
    this.skillTooltipTitleBarBg.fillRect(
      0,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_BAR_Y,
      tooltipWidth,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_TITLE_BAR_HEIGHT
    );
    this.skillTooltipRarityBarBg.fillStyle(rarityColors.bg, 0.6);
    this.skillTooltipRarityBarBg.fillRect(
      0,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RARITY_BAR_Y,
      tooltipWidth,
      ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_RARITY_BAR_HEIGHT
    );
    const offsetX = ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.TOOLTIP_OFFSET_X;
    let containerY = -ChampionSelectUiHandler.UI_CONSTANTS.SKILL_LIST_PANEL.HEIGHT * 0.5 + 4;
    const selectedVisibleIndex = this.selectedSkillIndex - this.skillScrollOffset;
    const selectedItem = (selectedVisibleIndex >= 0 && selectedVisibleIndex < this.skillItemContainers.length)
      ? this.skillItemContainers[selectedVisibleIndex]
      : null;
    if (selectedItem) {
      const listY = this.skillListContainer ? this.skillListContainer.y : 0;
      const itemCenterY = listY + selectedItem.y;

      const estimatedPanelHalfHeight = 60;
      const minY = -estimatedPanelHalfHeight + 2;
      const maxY = estimatedPanelHalfHeight - 2 - tooltipHeight;
      containerY = Math.max(minY, Math.min(maxY, Math.round(itemCenterY - tooltipHeight * 0.5)));
    }
    this.skillTooltipContainer?.setPosition(offsetX, containerY);
    this.skillTooltipContainer?.setVisible(true);
  }

  private getSkillDescription(championId: string, unlockLevel: number, skillDef: any): string {
    if (skillDef?.rewardType) {
      const { overrideDesc, normalizedData } = this.getDefaultRewardOverride(championId, skillDef);
      if (overrideDesc) {
        return overrideDesc;
      }
      const nodeGen = new SkillTreeNodeGenerator(0, championId, this.scene as BattleScene);

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

      return nodeGen.getRewardDescription(rewardData);
    }

    const resolvedChampionId = this.resolveChampionId(championId);
    const skillDescKey = `championSkills:${resolvedChampionId}.level_${unlockLevel}.description`;
    return (i18next.t(skillDescKey, { defaultValue: "" }) as unknown as string) || "";
  }

  private getDefaultRewardOverride(championId: string, skillDef: any): { overrideDesc?: string; normalizedData?: any } {
    if (!skillDef?.isDefault) {
      return {};
    }
    const resolvedChampionId = this.resolveChampionId(championId);
    const def = CHAMPION_DEFINITIONS[resolvedChampionId] as any;
    const types = this.buildDefaultRewardTypes(def, skillDef);
    const typeLabel = types.length
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

    if (this.scene.spritePipeline) {
      if (isGrid) {
        sprite.setPipeline(this.scene.spritePipeline, {
          tone: [0.0, 0.0, 0.0, 0.0],
          hasShadow: false,
          baseColor: [0.882, 0.706, 1.0],
          teraColor: [196, 64, 196]
        });
        sprite.clearTint();
      } else {
        sprite.setPipeline(this.scene.spritePipeline, {
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

    const key = this.getChampionTrainerSpriteKey(championId);
    const isUnlocked = this.championManager.isChampionUnlocked(championId) || (this.championManager.getChampionData(championId)?.isUnlocked === true);
    const previewY = this.getPreviewYOffsetForChampion(championId);
    const previewScale = this.getPreviewScaleForChampion(championId);
    this.fullChampionSprite = this.scene.add.sprite(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X, previewY, key);
    this.fullChampionSprite.setOrigin(0.5, 0.5);
    this.fullChampionSprite.setScale(previewScale);
    this.fullChampionSprite.setVisible(isUnlocked);

    this.fullChampionTintSprite = this.scene.add.sprite(ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_X, previewY, key);
    this.fullChampionTintSprite.setOrigin(0.5, 0.5);
    this.fullChampionTintSprite.setScale(previewScale);
    this.applyLockedSpriteEffect(this.fullChampionTintSprite);
    this.fullChampionTintSprite.setVisible(!isUnlocked);

    this.previewContainer.add(this.fullChampionSprite);
    this.previewContainer.add(this.fullChampionTintSprite);
  }

  private getPreviewYOffsetForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.previewOffsetY;
      if (typeof offset === "number") return offset;
    } catch {}
    return ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_Y;
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

  private getPreviewScaleForChampion(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const scale = def?.ui?.previewScale;
      if (typeof scale === "number") return scale;
    } catch {}
    return ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.SPRITE_SCALE;
  }

  private updateTypeIcons(championId: string): void {
    const def = CHAMPION_DEFINITIONS[championId];
    const t1 = (def?.type1 as unknown as Type) ?? null;
    const t2 = (def?.type2 as unknown as Type) ?? null;
    const hasBothTypes = (t1 !== null && typeof t1 !== "undefined") && (t2 !== null && typeof t2 !== "undefined");

    if (this.typeIcon1) {
      if (t1 !== null && typeof t1 !== "undefined") {
        this.typeIcon1.setVisible(true);
        this.typeIcon1.setFrame(Type[t1].toLowerCase());

        this.typeIcon1.x = hasBothTypes ? -ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_DUAL_SPACING : ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_SINGLE_X;
      } else {
        this.typeIcon1.setVisible(false);
      }
    }
    if (this.typeIcon2) {
      if (t2 !== null && typeof t2 !== "undefined") {
        this.typeIcon2.setVisible(true);
        this.typeIcon2.setFrame(Type[t2].toLowerCase());

        this.typeIcon2.x = ChampionSelectUiHandler.UI_CONSTANTS.PREVIEW.TYPE_DUAL_SPACING;
      } else {
        this.typeIcon2.setVisible(false);
      }
    }

    const inline = (this as any)._inlineTypes as Phaser.GameObjects.Sprite[] | undefined;
    if (inline && inline.length === 2) {
      if (t1 !== null && typeof t1 !== "undefined") {
        inline[0].setVisible(true);
        inline[0].setFrame(Type[t1].toLowerCase());
      } else {
        inline[0].setVisible(false);
      }
      if (t2 !== null && typeof t2 !== "undefined") {
        inline[1].setVisible(true);
        inline[1].setFrame(Type[t2].toLowerCase());
      } else {
        inline[1].setVisible(false);
      }
    }
  }

  private updateEssenceGauge(championId: string, animate: boolean = false): void {
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    const data = this.championManager.getChampionData(championId);

    if (isUnlocked) {
      const progress = ChampionXPManager.getEssenceProgress(data);
      this.levelText?.setText(`${i18next.t("championSelect:level", { defaultValue: "LEVEL" })} ${data?.level ?? 1}`);
      const segments = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
      const perType = segments && segments.length ? segments : this.buildLockedSegments(championId);
      const levelEssence = (data as any).levelEssence || {};
      this.renderSegments(perType, (types) => types.reduce((s, t) => s + (levelEssence[t] || 0), 0), animate);
      this.essenceInstructionText?.setText(i18next.t("championSelect:essenceHint", { defaultValue: "Use Required Essence to Level Up!" }));
      this.updateEssenceListPanel(championId);
      return;
    }
    const def = CHAMPION_DEFINITIONS[championId];
    const gd = (this.scene as BattleScene).gameData;
    const committed = (gd.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
    const segments = this.buildLockedSegments(championId);
    const totalRequired = Math.max(1, segments.reduce((a, s) => a + s.amount, 0));
    const totalCurrent = segments.reduce((a, s) => a + Math.min(s.amount, s.types.reduce((sum, t) => sum + (committed[t] || 0), 0)), 0);
    this.levelText?.setText(i18next.t("championSelect:locked", { defaultValue: "LOCKED" }));
    this.renderSegments(segments, (types) => types.reduce((s, t) => s + (committed[t] || 0), 0), animate);
    this.essenceInstructionText?.setText(i18next.t("championSelect:essenceHint", { defaultValue: "Use Required Essence to Level Up!" }));
    this.updateEssenceListPanel(championId);
  }
  private updateEssenceListPanel(championId: string): void {
    if (!this.essenceListContainer) return;

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
      const isSpecial = (t === (Type as any).GLITCH || t === (Type as any).SMITTY);
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
        const useCategories = (r.type === (Type as any).GLITCH || r.type === (Type as any).SMITTY);
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
      const useCategories = (isGlitch || isSmitty);
      const atlasKey = useCategories ? "categories" : Utils.getLocalizedSpriteKey("types");

      const frameKey = useCategories ? (isGlitch ? "physical" : "special") : Type[t].toLowerCase();

      const icon = this.scene.add.sprite(x, y, atlasKey, frameKey as any);
      icon.setOrigin(0.5, 0.5);
      const iconScale = useCategories ?
        ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.SPECIAL_ICON_SCALE :
        ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.ICON_SCALE;
      icon.setScale(iconScale);
      if (useCategories) {
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
      if (useCategories) {
        const labelText = isGlitch ? "GLITCH" : "SMITTY";
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
        this.essenceListContainer.add(iconLabel);
        this.essenceListItems.push({ icon: iconLabel, text: iconLabel });
      }
      y += ChampionSelectUiHandler.UI_CONSTANTS.ESSENCE_LIST.ITEM_SPACING;
    }
  }
  private startEssenceHold(championId: string, defaultType: Type): void {
    this.stopEssenceHold();
    const def = CHAMPION_DEFINITIONS[championId];
    const data = this.championManager.getChampionData(championId);
    const perTypeReq = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
    const fallback = [def?.type1, def?.type2].filter((t: any) => typeof t !== "undefined") as Type[];
    const allowedTypes = perTypeReq && perTypeReq.length ? perTypeReq.flatMap(r => r.types) : fallback;
    const gameData = (this.scene as BattleScene).gameData;
    const hasEssence = allowedTypes.some(t => gameData.getEssenceCount(t) > 0);

    if (!hasEssence) {
      const now = Date.now();
      if (now - this.lastEssenceErrorTime > 1000) {
        (this.scene as BattleScene).playSound("ui/error");
        this.lastEssenceErrorTime = now;
      }
      return;
    }

    let typeIndex = 0;
    const nextType = () => allowedTypes[(typeIndex++) % Math.max(1, allowedTypes.length)] ?? defaultType;
    let essenceType = nextType();
    const TICK_MS = ChampionSelectUiHandler.UI_CONSTANTS.SKILLS.ESSENCE_HOLD_TICK_MS;
    const PER_TICK = (ChampionSelectUiHandler.UI_CONSTANTS.SKILLS as any).ESSENCE_PER_TICK || 1;
    this.essenceHoldActiveType = essenceType;
    this.onCommitBegin();

    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    let previousLevel = data?.level || 1;

    this.essenceHoldTimer = this.scene.time.addEvent({ delay: TICK_MS, loop: true, callback: () => {

      const progInfo = ChampionXPManager.getEssenceProgress(data);
      const requiredTotal = Math.max(1, progInfo.required);
      const remainingTotal = Math.max(0, progInfo.required - progInfo.current);
      const baseBatch = Math.max(32, Math.floor(requiredTotal * 0.10));
      const MAX_BATCHES_PER_FRAME = 8;

      let batches = 0;
      while (batches < MAX_BATCHES_PER_FRAME) {
        const currentData = this.championManager.getChampionData(championId);
        const currentLvl = currentData?.level || 1;
        if (currentLvl > previousLevel) break;

        const curProg = ChampionXPManager.getEssenceProgress(currentData);
        const curRemaining = Math.max(0, curProg.required - curProg.current);
        if (curRemaining <= 0 && isUnlocked) break;

        let amount = isUnlocked ? Math.min(baseBatch, Math.floor(curRemaining)) : baseBatch;
        if (amount < 1) amount = 1;

        let consumed = false;

        while (amount >= 1) {
          const ok = isUnlocked
            ? ChampionXPManager.tryConsumeEssenceForLevel(this.scene as any, championId, essenceType, amount)
            : this.tryConsumeEssenceForChampion(championId, essenceType, amount);
          if (ok) { consumed = true; break; }
          amount = Math.floor(amount / 2);
        }
        if (!consumed) {

          essenceType = nextType();
          let amount2 = isUnlocked ? Math.min(baseBatch, Math.floor(curRemaining)) : baseBatch;
          if (amount2 < 1) amount2 = 1;
          while (amount2 >= 1) {
            const retry = isUnlocked
              ? ChampionXPManager.tryConsumeEssenceForLevel(this.scene as any, championId, essenceType, amount2)
              : this.tryConsumeEssenceForChampion(championId, essenceType, amount2);
            if (retry) { consumed = true; break; }
            amount2 = Math.floor(amount2 / 2);
          }
          if (!consumed) break;
        }
        batches++;
      }
      const currentLevel = this.championManager.getChampionData(championId)?.level || 1;
      if (currentLevel > previousLevel) {
        this.onEssenceCommitted(championId, previousLevel);
        this.stopEssenceHold();
        return;
      }
      const prog = ChampionXPManager.getEssenceProgress(this.championManager.getChampionData(championId));
      const pct = Math.max(0, Math.min(1, prog.required > 0 ? prog.current / prog.required : 0));
      this.tweenVisualPctTo(pct);
      this.ensureXpLabelTicker(Math.floor(prog.current));
      this.updateEssenceGauge(championId, true);
      this.updateGridXpGauge(championId);
    }});
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
    const gd = (this.scene as BattleScene).gameData;
    const committed = (gd.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
    const segments = this.buildLockedSegments(championId);
    const totalRequired = Math.max(1, segments.reduce((acc, seg) => acc + seg.amount, 0));
    const totalCurrent = segments.reduce((acc, seg) => {
      const segCurrent = seg.types.reduce((s, t) => s + (committed[t] || 0), 0);
      return acc + Math.min(seg.amount, segCurrent);
    }, 0);
    current = Math.floor(totalCurrent);
    required = Math.floor(totalRequired);
    return { current, required, level, isUnlocked };
  }

  private attemptCommitEssenceOnce(championId: string, defaultType: Type): { success: boolean; amount: number } {
    const isUnlocked = this.championManager.isChampionUnlockedInData(championId);
    const def = CHAMPION_DEFINITIONS[championId];
    const data = this.championManager.getChampionData(championId);
    const perTypeReq = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(data) as Array<{ types: Type[]; amount: number }> | null;
    const fallback = [def?.type1, def?.type2].filter((t: any) => typeof t !== "undefined") as Type[];
    const allowedTypes = (perTypeReq && perTypeReq.length) ? perTypeReq.flatMap(r => r.types) : fallback;
    const tryTypes = allowedTypes.length ? allowedTypes : [defaultType];
    const typesWithNeed = tryTypes.filter(t => {
      if (isUnlocked) {

        const levelEssence = (data as any).levelEssence || {};
        if (perTypeReq && perTypeReq.length) {
          for (const segment of perTypeReq) {
            if (segment.types.includes(t)) {
              const currentForSegment = segment.types.reduce((sum, type) => sum + (levelEssence[type] || 0), 0);
              return currentForSegment < segment.amount;
            }
          }
        }
        return true;
      } else {

        const gameData = (this.scene as BattleScene).gameData;
        const committed = (gameData.championData?.[championId]?.unlockCommit || {}) as Record<number, number>;
        const reqs = (def?.unlockRequirements?.essenceRequirements || []) as any[];
        if (reqs.length > 0) {
          const req = reqs.find((r: any) => r.type === t);
          if (req) {
            return (committed[t] || 0) < req.amount;
          }
        }
        return true;
      }
    });
    const finalTryTypes = typesWithNeed.length > 0 ? typesWithNeed : tryTypes;
    const progressData = isUnlocked ? ChampionXPManager.getEssenceProgress(data) : null;
    const required = progressData ? Math.max(1, progressData.required) : 300;
    const remaining = progressData ? Math.max(0, progressData.required - progressData.current) : 300;
    const cfg = ChampionSelectUiHandler.UI_CONSTANTS.SKILLS as any;
    let perTryAmount = Phaser.Math.Clamp(
      Math.floor(required * (cfg.SINGLE_PRESS_COMMIT_PCT ?? 0.05)),
      cfg.SINGLE_PRESS_COMMIT_MIN ?? 1,
      cfg.SINGLE_PRESS_COMMIT_MAX ?? 32
    );

    if (isUnlocked) {
        perTryAmount = Math.min(perTryAmount, Math.floor(remaining));
        if (perTryAmount < 1) perTryAmount = 1;
    }

    for (const t of finalTryTypes) {
      const ok = isUnlocked
        ? ChampionXPManager.tryConsumeEssenceForLevel(this.scene as any, championId, t, perTryAmount)
        : this.tryConsumeEssenceForChampion(championId, t, perTryAmount);
      if (ok) return { success: true, amount: perTryAmount };
    }
    return { success: false, amount: 0 };
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

    const cancel = () => {
      ui.revertMode();
      this.modalMessage?.clear();
      this.updateChampionInfo();
    };

    const confirm = () => {
      ui.revertMode();
      this.modalMessage?.clear();
      this.executeChampionSelection(selectedChampionId);
    };

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

  private tweenVisualPctTo(target: number): void {
    const start = this.visualEssencePct || 0;
    if (Math.abs(target - start) < 0.001) return;
    const o = { t: 0 };
    this.scene.tweens.add({
      targets: o,
      t: 1,
      duration: 200,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.visualEssencePct = Phaser.Math.Linear(start, target, o.t);
      }
    });
  }

  private animateSegmentFills(): void {
    const selectedChampionId = this.availableChampions[this.selectedChampionIndex];
    if (!selectedChampionId) return;
    this.segmentFillFactor = 1.0;
    this.updateEssenceGauge(selectedChampionId);
  }
  private animateSegmentWidths(
    segments: Array<{ types: Type[]; amount: number }>,
    getCurrentForTypes: (types: Type[]) => number
  ): void {
    this.xpBarSegmentTweens.forEach(t => t.destroy());
    this.xpBarSegmentTweens = [];
    const barX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH / 2;
    const barY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_Y;
    const barW = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH;
    const barH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_HEIGHT;
    const sortedSegments = [...segments].sort((a, b) => {
      const aHasGlitch = a.types.includes((Type as any).GLITCH);
      const aHasSmitty = a.types.includes((Type as any).SMITTY);
      const bHasGlitch = b.types.includes((Type as any).GLITCH);
      const bHasSmitty = b.types.includes((Type as any).SMITTY);
      if (aHasSmitty && !bHasSmitty) return 1;
      if (!aHasSmitty && bHasSmitty) return -1;
      if (aHasGlitch && !bHasGlitch && !bHasSmitty) return 1;
      if (!aHasGlitch && bHasGlitch && !aHasSmitty) return -1;
      return 0;
    });

    const n = Math.max(1, sortedSegments.length);
    const base = Math.floor(barW / n);
    let rem = barW - base * n;
    const widths = new Array(n).fill(base).map((w, i) => (i < rem ? w + 1 : w));

    let cursor = barX;
    sortedSegments.forEach((seg, i) => {
      const segW = widths[i];
      const progress = Math.min(getCurrentForTypes(seg.types), seg.amount);
      const targetW = Math.min(segW, Math.floor(segW * (seg.amount > 0 ? progress / seg.amount : 0)));
      const g = this.xpBarFillSegments[i];
      if (!g) { cursor += segW; return; }
      const segmentStartX = cursor;
      const state = { w: (g as any)._currentWidth || 0 };
      const textLabel = this.xpBarSegmentTexts[i];

      const tween = this.scene.tweens.add({
        targets: state,
        w: targetW,
        duration: 300,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          if (!g || !g.active) return;

          g.clear();
          if (state.w > 0) {
            const segmentType = seg.types[0] || Type.NORMAL;
            const typeRgb = getTypeRgb(segmentType);
            const typeColor = Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]);
            g.fillStyle(typeColor, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_FILL_ALPHA);
            g.fillRect(segmentStartX, barY, Math.floor(state.w), barH);
          }

          if (textLabel && textLabel.active && textLabel.scene && textLabel.scene.sys) {
            try {
              const currentProgress = Math.min(getCurrentForTypes(seg.types), seg.amount);
              textLabel.setText(`${currentProgress}/${seg.amount}`);
            } catch (e) {

            }
          }
        },
        onComplete: () => { (g as any)._currentWidth = targetW; }
      });
      this.xpBarSegmentTweens.push(tween);

      cursor += segW;
    });
  }

  private updateSegmentFillsOnly(segments: Array<{ types: Type[]; amount: number }>, getCurrentForTypes: (types: Type[]) => number): void {

    if (this.xpBarFillSegments.length !== segments.length) return;

    const barX = -ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH / 2;
    const barY = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_Y;
    const barW = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_WIDTH;
    const barH = ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.FILL_HEIGHT;

    const n = Math.max(1, segments.length);
    const base = Math.floor(barW / n);
    let rem = barW - base * n;
    const widths = new Array(n).fill(base).map((w, i) => (i < rem ? w + 1 : w));

    let cursor = barX;
    segments.forEach((seg, i) => {
      const segW = widths[i];
      const progress = Math.min(getCurrentForTypes(seg.types), seg.amount);
      const targetProgressW = Math.min(segW, Math.floor(segW * (seg.amount > 0 ? progress / seg.amount : 0)));
      const displayProgressW = Math.floor(targetProgressW * this.segmentFillFactor);

      const segFill = this.xpBarFillSegments[i];
      if (segFill) {
        segFill.clear();
        if (displayProgressW > 0) {

          const segmentType = seg.types[0] || Type.NORMAL;
          const typeRgb = getTypeRgb(segmentType);
          const typeColor = Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]);
          segFill.fillStyle(typeColor, ChampionSelectUiHandler.UI_CONSTANTS.XP_BAR.SEGMENT_FILL_ALPHA);
          segFill.fillRect(cursor, barY, displayProgressW, barH);
        }
      }
      cursor += segW;
    });
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
}