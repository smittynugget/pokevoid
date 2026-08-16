import i18next from "i18next";
import * as Utils from "#app/utils";
import { createSporadicPattern } from "#app/utils";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import BattleScene from "#app/battle-scene";
import { ModalUiHandler, ModalConfig } from "./modal-ui-handler";
import { Mode } from "#app/ui/ui";
import ModalMessageUiHandler from "./modal-message-ui-handler";
import { addTextObject, addBBCodeTextObject, TextStyle, getBBCodeFrag } from "#app/ui/text";
import { Button } from "#enums/buttons";
import { Device } from "#enums/devices";
import { ActiveSkillTreeData, SkillTreeNode, SkillTreeNodeState, SkillTreeRewardType, SkillTreeRarity } from "#app/system/skill-tree-data";
import { SkillTreeUtils, isSkillTreeV2 } from "#app/system/skill-tree-utils";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import ChampionXPManager from "#app/system/champion-xp-manager";
import { RewardObtainedType, RewardConfig, UnlockModePokeSpriteType } from "#app/ui/reward-obtained-ui-handler";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { ModifierRewardPhase } from "#app/phases/modifier-reward-phase";
import { SkillTreeRewardPhase } from "#app/phases/skill-tree-reward-phase";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { TrainerType } from "#enums/trainer-type";
import { trainerConfigs } from "#app/data/trainer-config";
import { PlayerGender } from "#enums/player-gender";
import { pokemonFormChanges, SpeciesFormChange, SpeciesFormChangeItemTrigger } from "#app/data/pokemon-forms";
import { FormChangeItem } from "#enums/form-change-items";
import { getFormChangeItemSpriteFrame } from "../utils/form-change-item-sprite-utils";
import { TrainerBondAbilityModifier, TeraAbilityModifier } from "#app/modifier/modifier";
import { Abilities } from "#enums/abilities";
import { Stat } from "#enums/stat";
import { allAbilities } from "#app/data/ability";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { getTypeRgb } from "#app/data/type";
import { applyVoidBallRecolor, applyTypeBallRecolor } from "#app/data/pokeball";
import { getPokemonSpecies, allSpecies } from "#app/data/pokemon-species";
import { RewardType } from "#enums/reward-type";
import { QuestUnlockables, ChampionSkillVersion } from "#app/system/game-data";
import { getDisplayRarityForRewardType, SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { SkillTreeGenerator } from "#app/system/skill-tree-generator";
import { SkillTreeMode, PokemonSelection, SkillTreePhase } from "#app/phases/skill-tree-phase";
import { PlayableChampionData } from "#app/system/playable-champions";
import { SkillTreeModifierPhase } from "#app/phases/skill-tree-modifier-phase";
import { modifierTypes, getAttackTypeBoosterItemName, AddVoucherModifierType, AddTypeBallModifierType, ModifierTypeGenerator, PermaModifierType, TrainerBondAbilityModifierType, TeraAbilityModifierType, PermaMoneyModifierType } from "#app/modifier/modifier-type";
import type { ModifierTypeFunc } from "#app/modifier/modifier-type";
import { playGenericLevelUpAnimation, skipCurrentLevelUpAnimation, SkillRevealConfig } from "./level-up-animation";
import { VoucherType, getVoucherTypeIcon } from "#app/system/voucher";
import { PermaType, PermaDuration } from "#app/modifier/perma-modifiers";
import { POKEMON_ALT_BUILDS, PokemonAltBuildId } from "#app/data/pokemon-alt-buid";
import { MoveUpgradeTooltipUtils } from "./move-upgrade-tooltip";
import { allMoves } from "#app/data/move";
import { EnhancedTutorial } from "./tutorial-registry";
import Overrides from "#app/overrides";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";
import { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";

export interface SkillTreeConfig {
  mode: SkillTreeMode;
  activeSkillTree: ActiveSkillTreeData;
  championData: PlayableChampionData;
  requiredSelections?: number;
  onSelectionMade?: (species: Species, isSignature: boolean) => void;
  onSelectionsComplete?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  phaseOnComplete?: (selections?: any[]) => void;
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

export default class SkillTreeUiHandler extends ModalUiHandler {
  private static readonly RARITY_COLORS = {
    COMMON:   { border: 0x00ff00, bg: 0x003300 },
    GREAT:    { border: 0x0080ff, bg: 0x001133 },
    ULTRA:    { border: 0xffd700, bg: 0x4d3f00 },
    ROGUE:    { border: 0xffa500, bg: 0x4d2a00 },
    MASTER:   { border: 0xff0000, bg: 0x4d0000 },
    LEGENDARY:{ border: 0x9932cc, bg: 0x330066 },
  } as const;

  private static readonly UI_CONSTANTS = {
    GRID_INC: -2,

    HUD: {
      X: 0,
      Y_BOTTOM_OFFSET: 29.5,
      WIDTH: 0,
      HEIGHT: 25,
      BG_ALPHA: 0.95,
      BORDER_ALPHA: 0.4,
      BORDER_THICKNESS: .5,
      RADIUS: 0,
      FONT_SIZE: "46px",

      SKILL_POINTS: {
        SPRITE_X_OFFSET: 12,
        TEXT_X_OFFSET: 20,
        TAB_X_OFFSET: 8,
        LABEL_Y_OFFSET: -1.25,
        SPRITE_Y_OFFSET: 4.5,
        TEXT_Y_OFFSET: 4.5,
        TAB_Y_OFFSET: 1.5,
        COLOR: 0xffffff,
        SPRITE_SCALE: 0.5,
        FONT_SIZE: "40px",
        LABEL_FONT_SIZE: "34px",
        TAB_WIDTH: 37,
        TAB_HEIGHT: 12,
        TAB_BG_COLOR: 0x000000,
        TAB_BG_ALPHA: 0.4,
        TAB_RADIUS: 4,
        TAB_BORDER_THICKNESS: .35,
        TAB_BORDER_ALPHA: 0.1,
      },
      TREE_LEVEL: {
        Y_OFFSET: 0,
        COLOR: 0xffffff,
      },

      LEVEL_GAUGE: {
        Y_OFFSET: 18.75,
        CONTAINER_Y: 0,
        BG_HEIGHT: 8,
        BG_RADIUS: 0,
        BG_Y: 0,
        BG_COLOR: 0x181818,
        BG_ALPHA: 1,
        BORDER_COLOR: 0xffffff,
        BORDER_ALPHA: 0.35,
        BORDER_THICKNESS: .35,
        FILL_Y: 0,
        FILL_HEIGHT: 8,
        FILL_RADIUS: 0,
        FILL_COLOR: 0xFFD700,
        FILL_ALPHA: 0.7,

        WAVE_ANIMATION: {
          WAVE_SPEED: 0.08,
          UPDATE_FREQUENCY: 60,
          BASE_ENERGY_SPEED: 0.06,
          BASE_ENERGY_INTENSITY: 0.15,
          ENERGY_WAVE_SPEED_MULTIPLIER: 1.8,
          ENERGY_WAVE_ALPHA: 0.35,
          ENERGY_WAVE_BRIGHTNESS: 1.9,
          VERTICAL_GRADIENT_ALPHA: 0.4,
          VERTICAL_GRADIENT_RANGE: 0.4,
        },
        TEXT_SIZE: "46px",
        TEXT_COLOR: 0xffffff,
        TEXT_X: 10,
        TEXT_Y: 4,
        ICON_X_OFFSET: -5,
        ICON_Y_OFFSET: 3.4,
        ICON_SCALE: 0.12,
        TEXT_BG_COLOR: 0x000000,
        TEXT_BG_ALPHA: 0.7,
        TEXT_BG_PADDING: 2,
        TEXT_BG_HEIGHT_REDUCTION: 2,
      },
    },

    TITLE_CONTAINER: {
      X_OFFSET: 0,
      Y_OFFSET: -4,
      GRADIENT_WIDTH: 200,
      HEIGHT: 19,
    },

    TITLE: {
      FONT_SIZE: "56px",
      X_OFFSET: 8,
      Y_OFFSET: 8.5,
      COLOR: 0xffffff,
      ALPHA: 1.0,
    },

    SUBTITLE: {
      FONT_SIZE: "40px",
      X_OFFSET: 175,
      Y_OFFSET: 10.2,
      COLOR: 0xffffff,
      ALPHA: 0.8,
    },
    INSTRUCTIONS: {
      FONT_SIZE: "40px",
      X_RIGHT_OFFSET: 13,
      Y_BOTTOM_OFFSET: 20,
      COLOR: 0xcccccc,
      ALPHA: 0.8,
      BG_COLOR: 0x000000,
      BG_ALPHA: 0.4,
      BG_PADDING: 4,
      BG_RADIUS: 4,
      BORDER_COLOR: 0xffffff,
      BORDER_ALPHA: 0.1,
      BORDER_THICKNESS: 0.35,
    },

    KEY_HINTS: {
      BAR_COLOR: 0x000000,
      BAR_BG_ALPHA: 0.4,
      BAR_HEIGHT: 22,
      BAR_Y_ABOVE_GAUGE: 2,
      BAR_RADIUS: 4,
      BAR_BORDER_THICKNESS: 0.35,
      BAR_BORDER_COLOR: 0xffffff,
      BAR_BORDER_ALPHA: 0.1,
      BAR_X_OFFSET: 8,
      ROW_HEIGHT: 8,
      COL_WIDTH: 20,
      KEY_SCALE_KB: 0.5,
      KEY_SCALE_GP: 0.62,
      NODE_ICON_BASE: 0.133,
      GAP: 2,
      PADDING: 4,
    },

    ZOOM_LEVEL: {
      FONT_SIZE: "24px",
      X_OFFSET: 100,
      Y_BOTTOM_OFFSET: 20,
      COLOR: 0xffffff,
      ALPHA: 0.8,
    },

    TOOLTIP: {
      MIN_WIDTH: 70,
      MAX_WIDTH: 120,
      BASE_HEIGHT: 40,
      LINE_HEIGHT: 8,
      TITLE_FONT_SIZE: "40px",
      DESC_FONT_SIZE: "40px",
      COST_FONT_SIZE: "40px",
      PREREQ_FONT_SIZE: "36px",
      TITLE_BAR_HEIGHT: 12,
      TITLE_BAR_Y: 0,

      RARITY_BAR_HEIGHT: 6,
      RARITY_BAR_Y: 14,

      CONTENT_Y: 20,
      CONTENT_MIN_HEIGHT: 20,

      TITLE_TEXT_Y: 6,
      RARITY_TEXT_Y: 17,

      ICON_SIZE: 10,
      ICON_X_OFFSET: 8,
      ICON_TITLE_SPACING: 2,

      TITLE_Y: 0,
      DESC_Y: 2,
      COST_Y: 8,
      PREREQ_Y: 12,

      WORD_WRAP_WIDTH: 200,
      BG_COLOR: 0x1a0f3a,
      BG_ALPHA: 0.85,
      BORDER_COLOR: 0xffffff,
      BORDER_ALPHA: .5,
      BORDER_THICKNESS: 0.5,
      RADIUS: 0,
      PADDING: 6,
      TEXT_SPACING: 4,
      MARGIN: 8,
      HUD_AVOID_WIDTH: 120,
      HUD_AVOID_HEIGHT: 80,
      SCALED_NODE_SIZE_MULTIPLIER: 0.6,
    },

    ROOT_NODE: {
      SCALE: 2.2,
      FALLBACK_SCALE: 0.28,
    },

    NODE: {
      SIZE: 90,
      BORDER_THICKNESS: 2,
      SELECTED_BORDER_THICKNESS: 3,
      LOCKED_ALPHA: 0.6,
      UNLOCKED_ALPHA: 1.0,
      HOVER_SCALE: 1.1,
    },

    ZOOM: {
      DEFAULT: 0.10,
      SELECTION: 0.35,
      MIN: 0.02,
      MAX: 3.0,
      WHEEL_SENSITIVITY: 0.0005,
      WHEEL_STEP: 0.06,
      BUTTON_STEP: 0.12,
    },

    PAN: {
      DRAG_SENSITIVITY: 0.3,
    },

    ANIMATIONS: {
      UNLOCK_EFFECT: {
        DURATION: 1800,
        DELAY: 1000,
        PULSE_SCALE: 1.3,
        GLOW_COLOR: 0x00ff00,
        GLOW_ALPHA: 0.8,
        PARTICLE_COUNT: 12,
        PARTICLE_SPEED: 100,
      },
      DEPTH_REVEAL: {
        DURATION: 600,
        FADE_IN_DELAY: 100,
        SCALE_FROM: 0.5,
        ALPHA_FROM: 0,
      },
      STATE_TRANSITION: {
        DURATION: 400,
        SCALE_BOUNCE: 1.15,
      }
    },

    DEPENDENCY_HIGHLIGHT: {
      COLOR: 0x8A2BE2,
      ALPHA: 0.7,
      PULSE_ALPHA_MIN: 0.4,
      PULSE_ALPHA_MAX: 0.9,
      PULSE_DURATION: 1000,
      CONNECTION_WIDTH: 6,
      NODE_GLOW_SIZE: 8,
    },
  };
  private modalMessage: ModalMessageUiHandler | null = null;
  private skillTreeContainer: Phaser.GameObjects.Container;
  private skillTreeContent: Phaser.GameObjects.Container;
  private nodesContainer: Phaser.GameObjects.Container;
  private connectionsLayer: Phaser.GameObjects.Container;
  private connectionGraphics: Phaser.GameObjects.Graphics;
  private connectionLines: Array<{ childId: string; parentId: string; g: Phaser.GameObjects.Graphics }> = [];
  private connectionLineKeys: Set<string> = new Set();
  private hud: Phaser.GameObjects.Container;
  private tooltip: Phaser.GameObjects.Container;
  private instructionsContainer: Phaser.GameObjects.Container;
  private tooltipBg: Phaser.GameObjects.NineSlice;
  private _tooltipPattern: ModalBackgroundHandle | null = null;
  private tooltipTitleBarBg: Phaser.GameObjects.Graphics;
  private tooltipRarityBarBg: Phaser.GameObjects.Graphics;

  private tooltipTitle: Phaser.GameObjects.Text;
  private tooltipDesc: Phaser.GameObjects.Text;
  private tooltipCost: Phaser.GameObjects.Text;
  private tooltipPrereq: Phaser.GameObjects.Text;
  private tooltipRarity: Phaser.GameObjects.Text;

  private nodeSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private selectedNodeId: string | null = null;
  private focusPreviewAnchorId: string | null = null;
  private currentFocusPreviewNodes: Set<string> = new Set();
  private static readonly FOCUS_PREVIEW_HOPS = 2;
  private transform = { scale: SkillTreeUiHandler.UI_CONSTANTS.ZOOM.DEFAULT, tx: 0, ty: 0 };
  private subtitleText: Phaser.GameObjects.Text;
  private DEFAULT_ZOOM = SkillTreeUiHandler.UI_CONSTANTS.ZOOM.DEFAULT;
  private isPanning = false; private startX = 0; private startY = 0;
  private pointermoveHandler?: (p: Phaser.Input.Pointer) => void;
  private pointerupHandler?: () => void;
  private wheelHandler?: (p: Phaser.Input.Pointer, g: any, dx: number, dy: number) => void;

  private titleContainer!: Phaser.GameObjects.Container;
  private titleBackground!: Phaser.GameObjects.Graphics;
  private skillPointsSprite!: Phaser.GameObjects.Sprite;
  private skillPointsText!: Phaser.GameObjects.Text;
  private skillPointsLabel!: Phaser.GameObjects.Text;
  private skillPointsTab!: Phaser.GameObjects.Graphics;
  private treeLevelText!: Phaser.GameObjects.Text;
  private treeLevelGaugeContainer!: Phaser.GameObjects.Container;
  private treeLevelGaugeIcon!: Phaser.GameObjects.Sprite;
  private treeLevelGaugeBg!: Phaser.GameObjects.Graphics;
  private treeLevelGaugeFill!: Phaser.GameObjects.Graphics;
  private treeLevelGaugeWaveOverlay!: Phaser.GameObjects.Graphics;
  private treeLevelGaugeText!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private instructionsTextBg!: Phaser.GameObjects.Graphics;
  private zoomLevelText!: Phaser.GameObjects.Text;
  private currentInputMethod: string = "keyboard";
  private navHintsLayer!: Phaser.GameObjects.Container;
  private keyHintsContainer: Phaser.GameObjects.Container | null = null;
  private keyHintsBarBg: Phaser.GameObjects.Graphics | null = null;
  private quickNavTargets: (SkillTreeNode | null)[] = [null, null, null, null];
  private keyHintsMode: "icons" | "text" = "icons";

  private static readonly SKILL_POINTS_LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
    'en': { x: 0, y: 0 },
    'ko': { x: 0, y: 0 },
    'ja': { x: 1.5, y: 0 },
    'zh-CN': { x: 1, y: 0 },
    'zh-TW': { x: 1, y: 0 },
    'fr': { x: -6, y: 12 },
    'de': { x: -6.5, y: 12 },
    'es': { x: -6.5, y: 12 },
    'pt-BR': { x: -6.5, y: 12 },
    'it': { x: 1.5, y: 0 },
  };

  private tooltipTargetNodeId: string | null = null;

  private currentGaugeFillWidth: number = 0;

  private waveAnimationTimer?: Phaser.Time.TimerEvent;
  private waveAnimationTime: number = 0;

  private config: SkillTreeConfig | null = null;
  private nodes: SkillTreeNode[] = [];
  private selections: PokemonSelection[] = [];

  private autoBatchLevelUpInProgress: boolean = false;
  private isLevelUpAnimationActive: boolean = false;
  private debugDepthOverride: number = 0;
  private isEnhancedDebugMode: boolean = false;
  private _selectionComplete: boolean = false;

  private nodeConnectionMap: Map<string, {
    parents: string[];
    children: string[];
    siblings: string[];
  }> = new Map();

  private dependencyHighlights: Phaser.GameObjects.Graphics[] = [];
  private purpleBackgroundNodes: Set<string> = new Set();

  private readonly NODE_SIZE = SkillTreeUiHandler.UI_CONSTANTS.NODE.SIZE;

  private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
  private modalBackgroundCreated: boolean = false;
  private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
  private modalPatternCreated: boolean = false;

  private championTypingContainer: Phaser.GameObjects.Container | null = null;
  private championTypeIcon1: Phaser.GameObjects.Sprite | null = null;
  private championTypeIcon2: Phaser.GameObjects.Sprite | null = null;
  private championAffinityIcon: Phaser.GameObjects.Sprite | null = null;
  private championAffinityLabel: Phaser.GameObjects.Text | null = null;

  private saveZoomPreference(zoom: number): void {
    try {
      localStorage.setItem('skillTreeZoom', zoom.toString());
    } catch {}
  }

  private loadZoomPreference(): number | null {
    try {
      const saved = localStorage.getItem('skillTreeZoom');
      if (saved) {
        const zoom = parseFloat(saved);
        const c = SkillTreeUiHandler.UI_CONSTANTS.ZOOM;
        if (!isNaN(zoom) && zoom >= c.MIN && zoom <= c.MAX) {
          return zoom;
        }
      }
    } catch {}
    return null;
  }

  constructor(scene: BattleScene) {
    super(scene, Mode.SKILL_TREE);
    this.gridInc = SkillTreeUiHandler.UI_CONSTANTS.GRID_INC;
  }
  getModalTitle(): string { return i18next.t("skillTree:title", { defaultValue: "Skill Tree" }); }
  getWidth(): number { return Math.floor(this.scene.game.canvas.width / 6) + 8; }
  getHeight(): number { return Math.floor(this.scene.game.canvas.height / 6) + 6; }
  getMargin(): [number, number, number, number] { return [4, 4, 4, 4]; }
  getButtonLabels(): string[] { return []; }

  setup(): void {

    super.setup();

    this.skillTreeContainer = this.scene.add.container(0, 0);
    this.modalContainer.add(this.skillTreeContainer);

    this.setupTitleContainer();

    this.championTypingContainer = this.scene.add.container(0, 0);
    this.championTypingContainer.setDepth(1001);
    this.championTypeIcon1 = this.scene.add.sprite(3, 0, Utils.getLocalizedSpriteKey("types"));
    this.championTypeIcon1.setOrigin(0, 0.5);
    this.championTypeIcon1.setScale(0.42);
    this.championTypingContainer.add(this.championTypeIcon1);
    this.championTypeIcon2 = this.scene.add.sprite(20, 0, Utils.getLocalizedSpriteKey("types"));
    this.championTypeIcon2.setOrigin(0, 0.5);
    this.championTypeIcon2.setScale(0.42);
    this.championTypeIcon2.setVisible(false);
    this.championTypingContainer.add(this.championTypeIcon2);
    this.championAffinityIcon = this.scene.add.sprite(14, 0, "categories", "status");
    this.championAffinityIcon.setOrigin(0.5, 0.5);
    this.championAffinityIcon.setScale(0.7);
    this.championAffinityIcon.setTint(0xC8A000);
    this.championAffinityIcon.setVisible(false);
    this.championTypingContainer.add(this.championAffinityIcon);
    this.championAffinityLabel = addTextObject(this.scene, 14, 0, "", TextStyle.WINDOW, { fontSize: "42px", align: "center", stroke: "#000000", strokeThickness: 4 });
    this.championAffinityLabel.setOrigin(0.5, 0.5);
    this.championAffinityLabel.setVisible(false);
    this.championTypingContainer.add(this.championAffinityLabel);
    this.skillTreeContainer.add(this.championTypingContainer);

    this.skillTreeContent = this.scene.add.container(this.getWidth() / 2, this.getHeight() / 2);
    this.skillTreeContainer.add(this.skillTreeContent);

    this.skillTreeContainer.bringToTop(this.titleContainer);
    if (this.championTypingContainer) {
      this.skillTreeContainer.bringToTop(this.championTypingContainer);
    }

    this.connectionsLayer = this.scene.add.container(0, 0);
    this.connectionGraphics = this.scene.add.graphics();
    this.connectionsLayer.add(this.connectionGraphics);
    this.nodesContainer = this.scene.add.container(0, 0);
    this.skillTreeContent.add(this.connectionsLayer);
    this.skillTreeContent.add(this.nodesContainer);
    this.navHintsLayer = this.scene.add.container(0, 0);
    this.skillTreeContent.add(this.navHintsLayer);

    this.hud = this.scene.add.container(0, 0);
    this.skillTreeContainer.add(this.hud);
    this.setupHUD();

    this.modalMessage = new ModalMessageUiHandler(this.scene, this.skillTreeContainer, this.getWidth(), this.getHeight());
    this.modalMessage.setup();

    this.tooltip = this.scene.add.container(0, 0);
    this.tooltip.setVisible(false);
    this.skillTreeContainer.add(this.tooltip);
    this.setupTooltip();

    this.setupControls();
  }

  updateContainer(config?: ModalConfig): void {
    super.updateContainer(config);

    if (!this.modalBackgroundCreated) {
      if (this.scene.textures.exists("modal_bg") &&
          this.scene.textures.get("modal_bg").key !== "__MISSING") {
        this.modalBackgroundImage = this.scene.add.image(0, 0, "modal_bg");
        this.modalBackgroundImage.setOrigin(0, 0);
        this.modalContainer.addAt(this.modalBackgroundImage, 1);
      } else {
        super.createModalBackground();
      }
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
      this.modalBackgroundImage.setAlpha(0.75);
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

    if (this.championTypingContainer) {
      this.championTypingContainer.setPosition(
        8,
        this.getHeight() - 38
      );
    }

    this.applyChampionTypingToModalBackground();
  }

  private static smitomSkillTreeDebugShown = false;
  private static smitomRogueModeDebugShown = false;
  private static smitomFirstNodeDebugShown = false;
  private static smitomGlitchFormNodeDebugShown = false;

  private triggerSmitomSkillTreeTipIfNeeded(): void {
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !SkillTreeUiHandler.smitomSkillTreeDebugShown) {
      SkillTreeUiHandler.smitomSkillTreeDebugShown = true;
      flags["skill_tree_welcome"] = false;
    }
    if (!flags["skill_tree_welcome"]) {
      scene.time.delayedCall(350, () => {
        if (scene.ui.getMode() !== Mode.SKILL_TREE) return;
        const tipConfig: SmitomTipConfig = {
          tutorialKey: "skill_tree_welcome",
          title: i18next.t("tutorial:smitomTip.skillTree.title"),
          texts: [
            i18next.t("tutorial:smitomTip.skillTree.1"),
            i18next.t("tutorial:smitomTip.skillTree.2"),
          ],
          offerReplay: true,
          onComplete: () => {
            scene.gameData.smitomTutorialFlags["skill_tree_welcome"] = true;
            scene.gameData.saveSystem();
          }
        };
        scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
      });
    }
  }

  private triggerSmitomRogueModeTipIfNeeded(node: SkillTreeNode): void {
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !SkillTreeUiHandler.smitomRogueModeDebugShown) {
      SkillTreeUiHandler.smitomRogueModeDebugShown = true;
      flags["skill_tree_rogue_mode"] = false;
    }
    if (node.rewardData?.type !== SkillTreeRewardType.SIGNATURE_POKEMON && node.rewardData?.type !== SkillTreeRewardType.GENERAL_POKEMON) return;
    if (flags["skill_tree_rogue_mode"]) return;
    scene.time.delayedCall(350, () => {
      if (scene.ui.getMode() !== Mode.SKILL_TREE) return;
      const tipConfig: SmitomTipConfig = {
        tutorialKey: "skill_tree_rogue_mode",
        title: i18next.t("tutorial:smitomTip.skillTreeRogueMode.title"),
        texts: [
          i18next.t("tutorial:smitomTip.skillTreeRogueMode.1"),
          i18next.t("tutorial:smitomTip.skillTreeRogueMode.2"),
        ],
        offerReplay: true,
        onComplete: () => {
          scene.gameData.smitomTutorialFlags["skill_tree_rogue_mode"] = true;
          scene.gameData.saveSystem();
        }
      };
      scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
    });
  }

  private triggerSmitomFreeNodeTipIfNeeded(node: SkillTreeNode): void {
    if (!node?.rewardData?.data?.starterMysteryNode) return;
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !SkillTreeUiHandler.smitomFirstNodeDebugShown) {
      SkillTreeUiHandler.smitomFirstNodeDebugShown = true;
      flags["skill_tree_first_node"] = false;
    }
    if (flags["skill_tree_first_node"]) return;
    scene.time.delayedCall(350, () => {
      if (scene.ui.getMode() !== Mode.SKILL_TREE) return;
      const tipConfig: SmitomTipConfig = {
        tutorialKey: "skill_tree_first_node",
        title: i18next.t("tutorial:smitomTip.skillTreeFirstNode.title"),
        texts: [
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.1"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.2"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.3"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.4"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.5"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.6"),
          i18next.t("tutorial:smitomTip.skillTreeFirstNode.7"),
        ],
        offerReplay: true,
        onComplete: () => {
          scene.gameData.smitomTutorialFlags["skill_tree_first_node"] = true;
          scene.gameData.saveSystem();
        }
      };
      scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
    });
  }

  private triggerSmitomGlitchFormNodeTipIfNeeded(node: SkillTreeNode): void {
    if (!node?.rewardData?.data?.starterGlitchRunNode) return;
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !SkillTreeUiHandler.smitomGlitchFormNodeDebugShown) {
      SkillTreeUiHandler.smitomGlitchFormNodeDebugShown = true;
      flags["skill_tree_glitch_form_node"] = false;
    }
    if (flags["skill_tree_glitch_form_node"]) return;
    scene.time.delayedCall(350, () => {
      if (scene.ui.getMode() !== Mode.SKILL_TREE) return;
      const tipConfig: SmitomTipConfig = {
        tutorialKey: "skill_tree_glitch_form_node",
        title: i18next.t("tutorial:smitomTip.skillTreeGlitchFormNode.title"),
        texts: [
          i18next.t("tutorial:smitomTip.skillTreeGlitchFormNode.1"),
          i18next.t("tutorial:smitomTip.skillTreeGlitchFormNode.2"),
        ],
        offerReplay: true,
        onComplete: () => {
          scene.gameData.smitomTutorialFlags["skill_tree_glitch_form_node"] = true;
          scene.gameData.saveSystem();
        }
      };
      scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
    });
  }

  private applyChampionTypingToModalBackground(): void {
    if (!this.modalBackgroundImage) return;

    const championId = this.config?.activeSkillTree?.championId || this.config?.championData?.id;
    if (championId && ChampionUtils.getChampionAffinityLabel(championId)) {
      this.modalBackgroundImage.clearTint();
      return;
    }

    const t1 = this.config?.championData?.type1;
    const t2 = this.config?.championData?.type2;
    const types = [t1, t2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    if (types.length === 0) {
      this.modalBackgroundImage.clearTint();
      return;
    }

    const rgb1 = getTypeRgb(types[0]);
    if (!rgb1) {
      this.modalBackgroundImage.clearTint();
      return;
    }

    let r = rgb1[0], g = rgb1[1], b = rgb1[2];
    if (types.length > 1) {
      const rgb2 = getTypeRgb(types[1]);
      if (rgb2) {
        r = Math.round((r + rgb2[0]) / 2);
        g = Math.round((g + rgb2[1]) / 2);
        b = Math.round((b + rgb2[2]) / 2);
      }
    }

    this.modalBackgroundImage.setTint(Phaser.Display.Color.GetColor(r, g, b));
  }

  protected createModalBackground(): void {
  }

  private setupTitleContainer(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS;

    this.titleContainer = this.scene.add.container(
      c.TITLE_CONTAINER.X_OFFSET,
      c.TITLE_CONTAINER.Y_OFFSET
    );
    this.skillTreeContainer.add(this.titleContainer);
    this.titleContainer.setDepth(1000);

    this.titleBackground = this.scene.add.graphics();
    this.createGradientBackground();
    this.titleContainer.add(this.titleBackground);

    if (this.titleText) {
      this.titleText.setPosition(c.TITLE.X_OFFSET, c.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0, 0);
      this.titleText.setStyle({ fontSize: c.TITLE.FONT_SIZE, align: "left" });
      this.titleText.setTint(c.TITLE.COLOR);
      this.titleText.setAlpha(c.TITLE.ALPHA);
      this.titleText.setVisible(true);
      this.titleContainer.add(this.titleText);
    }

    this.subtitleText = addTextObject(this.scene,
      c.SUBTITLE.X_OFFSET,
      c.SUBTITLE.Y_OFFSET,
      i18next.t("skillTree:subtitle", { defaultValue: "Use skill points to unlock powerful abilities" }),
      TextStyle.WINDOW,
      { fontSize: c.SUBTITLE.FONT_SIZE, align: "left" }
    );
    this.subtitleText.setOrigin(0, 0);
    this.subtitleText.setTint(c.SUBTITLE.COLOR);
    this.subtitleText.setAlpha(c.SUBTITLE.ALPHA);
    this.titleContainer.add(this.subtitleText);
  }

  private fixTitlePositioning(): void {
    if (this.titleText && this.titleContainer) {
      const c = SkillTreeUiHandler.UI_CONSTANTS;
      this.titleText.setPosition(c.TITLE.X_OFFSET, c.TITLE.Y_OFFSET);
      this.titleText.setOrigin(0, 0);

      if (this.subtitleText) {
        const titleWidth = this.titleText.displayWidth;
        this.subtitleText.setPosition(c.TITLE.X_OFFSET + titleWidth + 10, c.SUBTITLE.Y_OFFSET);
      }
    }
  }

  private createGradientBackground(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.TITLE_CONTAINER;

    this.titleBackground.clear();

    const gradientWidth = c.GRADIENT_WIDTH;

    this.titleBackground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.0, 0.9, 0.0);
    this.titleBackground.fillRect(0, 0, gradientWidth, c.HEIGHT);
  }

  private setupHUD(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS;

    const hudY = this.getHeight() - c.HUD.Y_BOTTOM_OFFSET;
    const hudWidth = this.getWidth();

    const hudBg = this.scene.add.graphics();
    hudBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, c.HUD.BG_ALPHA, 0.0, c.HUD.BG_ALPHA, 0.0);

    this.skillPointsTab = this.scene.add.graphics();
    this.skillPointsTab.fillStyle(c.HUD.SKILL_POINTS.TAB_BG_COLOR, c.HUD.SKILL_POINTS.TAB_BG_ALPHA);
    this.skillPointsTab.fillRoundedRect(
      c.HUD.X + c.HUD.SKILL_POINTS.TAB_X_OFFSET,
      hudY + c.HUD.SKILL_POINTS.TAB_Y_OFFSET,
      c.HUD.SKILL_POINTS.TAB_WIDTH,
      c.HUD.SKILL_POINTS.TAB_HEIGHT,
      c.HUD.SKILL_POINTS.TAB_RADIUS
    );
    this.skillPointsTab.lineStyle(c.HUD.SKILL_POINTS.TAB_BORDER_THICKNESS, 0xffffff, c.HUD.SKILL_POINTS.TAB_BORDER_ALPHA);
    this.skillPointsTab.strokeRoundedRect(
      c.HUD.X + c.HUD.SKILL_POINTS.TAB_X_OFFSET,
      hudY + c.HUD.SKILL_POINTS.TAB_Y_OFFSET,
      c.HUD.SKILL_POINTS.TAB_WIDTH,
      c.HUD.SKILL_POINTS.TAB_HEIGHT,
      c.HUD.SKILL_POINTS.TAB_RADIUS
    );
    this.hud.add(this.skillPointsTab);

    const tabCenterX = c.HUD.X + c.HUD.SKILL_POINTS.TAB_X_OFFSET + (c.HUD.SKILL_POINTS.TAB_WIDTH / 2);

    this.skillPointsSprite = this.scene.add.sprite(
      tabCenterX - 8,
      hudY + c.HUD.SKILL_POINTS.SPRITE_Y_OFFSET,
      "items", "ribbon_gen9"
    );
    this.skillPointsSprite.setScale(c.HUD.SKILL_POINTS.SPRITE_SCALE);
    this.hud.add(this.skillPointsSprite);

    this.skillPointsText = addTextObject(this.scene,
      tabCenterX + 8,
      hudY + c.HUD.SKILL_POINTS.TEXT_Y_OFFSET,
      "0", TextStyle.WINDOW, { fontSize: c.HUD.SKILL_POINTS.FONT_SIZE, align: "center" });
    this.skillPointsText.setOrigin(0.5, 0);
    this.skillPointsText.setTint(c.HUD.SKILL_POINTS.COLOR);
    this.hud.add(this.skillPointsText);

    const currentLocale = i18next.resolvedLanguage ?? 'en';
    const localeOffsets = SkillTreeUiHandler.SKILL_POINTS_LABEL_OFFSETS[currentLocale] ?? { x: 0, y: 0 };

    this.skillPointsLabel = addTextObject(this.scene,
      tabCenterX + 7.5 + localeOffsets.x,
      hudY + c.HUD.SKILL_POINTS.LABEL_Y_OFFSET + localeOffsets.y,
      i18next.t("skillTree:skillPointsLabel"), TextStyle.WINDOW, { fontSize: c.HUD.SKILL_POINTS.LABEL_FONT_SIZE, align: "center" });
    this.skillPointsLabel.setOrigin(0.5, 0);
    this.skillPointsLabel.setTint(c.HUD.SKILL_POINTS.COLOR);
    this.skillPointsLabel.setAlpha(0.8);
    this.hud.add(this.skillPointsLabel);

    const gaugeCenterX = hudWidth / 2;
    this.treeLevelGaugeContainer = this.scene.add.container(
      gaugeCenterX,
      hudY + c.HUD.LEVEL_GAUGE.Y_OFFSET + c.HUD.LEVEL_GAUGE.CONTAINER_Y
    );
    this.hud.add(this.treeLevelGaugeContainer);

    this.treeLevelGaugeIcon = this.scene.add.sprite(
      c.HUD.LEVEL_GAUGE.ICON_X_OFFSET,
      c.HUD.LEVEL_GAUGE.ICON_Y_OFFSET,
      "smitems", "permaMoreRevive"
    );
    this.treeLevelGaugeIcon.setScale(c.HUD.LEVEL_GAUGE.ICON_SCALE);
    this.treeLevelGaugeContainer.add(this.treeLevelGaugeIcon);

    this.treeLevelGaugeBg = this.scene.add.graphics();
    this.treeLevelGaugeBg.fillGradientStyle(c.HUD.LEVEL_GAUGE.BG_COLOR, c.HUD.LEVEL_GAUGE.BG_COLOR, c.HUD.LEVEL_GAUGE.BG_COLOR, c.HUD.LEVEL_GAUGE.BG_COLOR, c.HUD.LEVEL_GAUGE.BG_ALPHA, c.HUD.LEVEL_GAUGE.BG_ALPHA, c.HUD.LEVEL_GAUGE.BG_ALPHA * 0.9, c.HUD.LEVEL_GAUGE.BG_ALPHA * 0.9);
    const gaugeWidth = hudWidth;
    const xpBgX = -gaugeWidth / 2;
    const xpBgY = c.HUD.LEVEL_GAUGE.BG_Y;
    const xpBgW = gaugeWidth;
    const xpBgH = c.HUD.LEVEL_GAUGE.BG_HEIGHT;
    this.treeLevelGaugeBg.fillRect(xpBgX, xpBgY, xpBgW, xpBgH);
    this.treeLevelGaugeBg.lineStyle(c.HUD.LEVEL_GAUGE.BORDER_THICKNESS, c.HUD.LEVEL_GAUGE.BORDER_COLOR, c.HUD.LEVEL_GAUGE.BORDER_ALPHA);
    this.treeLevelGaugeBg.strokeRect(xpBgX, xpBgY, xpBgW, xpBgH);
    this.treeLevelGaugeContainer.add(this.treeLevelGaugeBg);
    this.treeLevelGaugeFill = this.scene.add.graphics();
    this.treeLevelGaugeFill.setDepth(10);
    this.currentGaugeFillWidth = 0;
    this.updateGaugeFillVisual(0);
    this.treeLevelGaugeContainer.add(this.treeLevelGaugeFill);
    this.treeLevelGaugeWaveOverlay = this.scene.add.graphics();
    this.treeLevelGaugeWaveOverlay.setDepth(11);
    this.treeLevelGaugeContainer.add(this.treeLevelGaugeWaveOverlay);
    this.treeLevelGaugeText = addTextObject(this.scene, c.HUD.LEVEL_GAUGE.TEXT_X, c.HUD.LEVEL_GAUGE.TEXT_Y,
      "0 / 0", TextStyle.WINDOW, {
        fontSize: c.HUD.LEVEL_GAUGE.TEXT_SIZE,
        align: "center"
      });
    this.treeLevelGaugeText.setOrigin(0.5);
    this.treeLevelGaugeText.setTint(c.HUD.LEVEL_GAUGE.TEXT_COLOR);
    this.treeLevelGaugeContainer.add(this.treeLevelGaugeText);
    this.treeLevelText = addTextObject(this.scene,
      -gaugeWidth / 2 + 10,
      c.HUD.LEVEL_GAUGE.TEXT_Y,
      "Tree Lv: 1", TextStyle.WINDOW, { fontSize: "36px", align: "left" });
    this.treeLevelText.setOrigin(0, 0.5);
    this.treeLevelText.setTint(c.HUD.TREE_LEVEL.COLOR);
    this.treeLevelGaugeContainer.add(this.treeLevelText);
    this.treeLevelGaugeContainer.bringToTop(this.treeLevelGaugeFill);
    this.treeLevelGaugeContainer.bringToTop(this.treeLevelGaugeText);
    this.treeLevelGaugeContainer.bringToTop(this.treeLevelGaugeIcon);
    this.treeLevelGaugeContainer.bringToTop(this.treeLevelText);
    this.instructionsContainer = this.scene.add.container(
      this.getWidth() - c.INSTRUCTIONS.X_RIGHT_OFFSET,
      this.getHeight() - c.INSTRUCTIONS.Y_BOTTOM_OFFSET
    );

    const instructionsKey = this.getInstructionsKey();
    this.instructionsText = addTextObject(this.scene, 0, 0,
      i18next.t(instructionsKey),
      TextStyle.WINDOW, { fontSize: c.INSTRUCTIONS.FONT_SIZE, align: "right" });
    this.instructionsText.setOrigin(1, 1);
    this.instructionsText.setAlpha(c.INSTRUCTIONS.ALPHA);
    this.instructionsTextBg = this.scene.add.graphics();
    this.instructionsTextBg.fillStyle(c.INSTRUCTIONS.BG_COLOR, c.INSTRUCTIONS.BG_ALPHA);
    this.instructionsTextBg.lineStyle(c.INSTRUCTIONS.BORDER_THICKNESS, c.INSTRUCTIONS.BORDER_COLOR, c.INSTRUCTIONS.BORDER_ALPHA);
    const textWidth = this.instructionsText.displayWidth;
    const textHeight = this.instructionsText.displayHeight;
    const bgX = -textWidth - c.INSTRUCTIONS.BG_PADDING;
    const bgY = -textHeight - c.INSTRUCTIONS.BG_PADDING;
    const bgWidth = textWidth + c.INSTRUCTIONS.BG_PADDING * 2;
    const bgHeight = textHeight + c.INSTRUCTIONS.BG_PADDING * 2;
    this.instructionsTextBg.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, c.INSTRUCTIONS.BG_RADIUS);
    this.instructionsTextBg.strokeRoundedRect(bgX, bgY, bgWidth, bgHeight, c.INSTRUCTIONS.BG_RADIUS);

    this.instructionsContainer.add(this.instructionsTextBg);
    this.instructionsContainer.add(this.instructionsText);
    this.skillTreeContainer.add(this.instructionsContainer);

    if (Overrides.SKILL_TREE_ZOOM_UI_OVERRIDE) {
      this.zoomLevelText = addTextObject(this.scene, c.ZOOM_LEVEL.X_OFFSET, this.getHeight() - c.ZOOM_LEVEL.Y_BOTTOM_OFFSET,
        "Zoom: 18%", TextStyle.WINDOW_ALT, { fontSize: c.ZOOM_LEVEL.FONT_SIZE, align: "left" });
      this.zoomLevelText.setOrigin(0, 1);
      this.zoomLevelText.setAlpha(c.ZOOM_LEVEL.ALPHA);
      this.hud.add(this.zoomLevelText);
    }
    this.setKeyHintsMode("icons");
  }

  private setupTooltip(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.TOOLTIP;

    this.tooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 167, 12, 12, 12, 12);
    this.tooltipBg.setOrigin(0, 0);
    this.tooltip.add(this.tooltipBg);
    this.tooltipTitleBarBg = this.scene.add.graphics();
    this.tooltip.add(this.tooltipTitleBarBg);
    this.tooltipRarityBarBg = this.scene.add.graphics();
    this.tooltip.add(this.tooltipRarityBarBg);
    this.tooltipTitle = addTextObject(this.scene, c.MIN_WIDTH / 2, c.TITLE_TEXT_Y, "", TextStyle.WINDOW, {
      fontSize: c.TITLE_FONT_SIZE });
    this.tooltipTitle.setOrigin(0.5, 0.5);

    this.tooltipRarity = addTextObject(this.scene, c.MIN_WIDTH / 2, c.RARITY_TEXT_Y, "", TextStyle.WINDOW, {
      fontSize: "30px" });
    this.tooltipRarity.setOrigin(0.5, 0.5);
    this.tooltipDesc = addBBCodeTextObject(this.scene, c.PADDING + 1, c.CONTENT_Y + 2, "", TextStyle.WINDOW, {
      fontSize: "36px" });
    this.tooltipCost = addTextObject(this.scene, c.PADDING + 1, c.CONTENT_Y + 10, "", TextStyle.WINDOW, {
      fontSize: "36px" });
    this.tooltipPrereq = addTextObject(this.scene, c.PADDING + 1, c.CONTENT_Y + 18, "", TextStyle.WINDOW, {
      fontSize: "32px" });
    this.tooltipPrereq.setColor("#ffdd44");

    this.tooltip.add(this.tooltipTitle);
    this.tooltip.add(this.tooltipRarity);
    this.tooltip.add(this.tooltipDesc);
    this.tooltip.add(this.tooltipCost);
    this.tooltip.add(this.tooltipPrereq);

    this._tooltipPattern = attachModalBackground(
      this.scene as BattleScene,
      this.tooltip,
      () => ({ bgX: 0, bgY: 0, bgWidth: this.tooltipBg.width, bgHeight: this.tooltipBg.height }),
      { mask: false, alphaMultiplier: 0.6, getTarget: () => this.tooltipBg }
    );
  }

  private isPointerInputAllowed(): boolean {
    return this.active && !this.isLevelUpAnimationActive && (this.scene as BattleScene).ui.getMode() === Mode.SKILL_TREE;
  }

  private setupControls(): void {
    this.cleanupControls();

    this.skillTreeContent.setInteractive(new Phaser.Geom.Rectangle(-15000, -15000, 30000, 30000), Phaser.Geom.Rectangle.Contains);
    this.skillTreeContent.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.isPointerInputAllowed()) return;
      if (p.leftButtonDown()) {
        this.hideTooltip();
        this.isPanning = true;
        this.startX = p.x;
        this.startY = p.y;
      }
    });
    this.pointermoveHandler = (p: Phaser.Input.Pointer) => {
      if (!this.isPointerInputAllowed()) return;
      if (!this.isPanning) return;
      const deltaX = (p.x - this.startX) * SkillTreeUiHandler.UI_CONSTANTS.PAN.DRAG_SENSITIVITY;
      const deltaY = (p.y - this.startY) * SkillTreeUiHandler.UI_CONSTANTS.PAN.DRAG_SENSITIVITY;
      this.transform.tx += deltaX;
      this.transform.ty += deltaY;
      this.startX = p.x;
      this.startY = p.y;
      this.applyTransform();
    };
    this.pointerupHandler = () => { this.isPanning = false; };

    this.scene.input.on('pointermove', this.pointermoveHandler);
    this.scene.input.on('pointerup', this.pointerupHandler);
    this.wheelHandler = (_p: Phaser.Input.Pointer, _g: any, _dx: number, dy: number) => {
      if (!this.isPointerInputAllowed()) return;
      this.hideTooltip();
      const c = SkillTreeUiHandler.UI_CONSTANTS.ZOOM;
      const dir = Math.sign(dy);
      if (dir === 0) return;
      const step = dir > 0 ? 1 - c.WHEEL_STEP : 1 + c.WHEEL_STEP;
      const newScale = Math.min(Math.max(c.MIN, this.transform.scale * step), c.MAX);
      const ratio = newScale / this.transform.scale;
      this.transform.tx *= ratio;
      this.transform.ty *= ratio;
      this.transform.scale = newScale;
      this.DEFAULT_ZOOM = newScale;
      this.applyTransform();
    };
    this.scene.input.on('wheel', this.wheelHandler);
  }

  private cleanupControls(): void {
    if (this.skillTreeContent) {
      this.skillTreeContent.off('pointerdown');
      this.skillTreeContent.disableInteractive();
    }
    if (this.pointermoveHandler) {
      this.scene.input.off('pointermove', this.pointermoveHandler);
      this.pointermoveHandler = undefined;
    }
    if (this.pointerupHandler) {
      this.scene.input.off('pointerup', this.pointerupHandler);
      this.pointerupHandler = undefined;
    }
    if (this.wheelHandler) {
      this.scene.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }

  show(args: any[]): boolean {
    const modalConfig: ModalConfig = { buttonActions: [] };
    if (!this.championTypingContainer) {
      this.championTypingContainer = this.scene.add.container(0, 0);
      this.championTypingContainer.setDepth(1001);
      this.championTypeIcon1 = this.scene.add.sprite(3, 0, Utils.getLocalizedSpriteKey("types"));
      this.championTypeIcon1.setOrigin(0, 0.5);
      this.championTypeIcon1.setScale(0.42);
      this.championTypingContainer.add(this.championTypeIcon1);
      this.championTypeIcon2 = this.scene.add.sprite(20, 0, Utils.getLocalizedSpriteKey("types"));
      this.championTypeIcon2.setOrigin(0, 0.5);
      this.championTypeIcon2.setScale(0.42);
      this.championTypeIcon2.setVisible(false);
      this.championTypingContainer.add(this.championTypeIcon2);
      this.championAffinityIcon = this.scene.add.sprite(14, 0, "categories", "status");
      this.championAffinityIcon.setOrigin(0.5, 0.5);
      this.championAffinityIcon.setScale(0.7);
      this.championAffinityIcon.setTint(0xC8A000);
      this.championAffinityIcon.setVisible(false);
      this.championTypingContainer.add(this.championAffinityIcon);
      this.championAffinityLabel = addTextObject(this.scene, 14, 0, "", TextStyle.WINDOW, { fontSize: "42px", align: "center", stroke: "#000000", strokeThickness: 4 });
      this.championAffinityLabel.setOrigin(0.5, 0.5);
      this.championAffinityLabel.setVisible(false);
      this.championTypingContainer.add(this.championAffinityLabel);
      this.skillTreeContainer.add(this.championTypingContainer);
      this.skillTreeContainer.bringToTop(this.titleContainer);
      this.skillTreeContainer.bringToTop(this.championTypingContainer);
    }
    if (!super.show([modalConfig])) return false;

    this.fixTitlePositioning();
    this.config = args?.[0] as SkillTreeConfig;
    if (!this.config) { return true; }

    this.applyChampionTypingToModalBackground();
    this.updateChampionTypingIcons();

    const skillTreeTutorials: EnhancedTutorial[] = [];
    const championId = this.config.activeSkillTree?.championId;

    if (championId && championId !== "apollo" && championId !== "diana") {
    }

    if (skillTreeTutorials.length > 0) {
        (this.scene as BattleScene).gameData.tutorialService.showCombinedTutorial("", skillTreeTutorials, true, false, true);
    }

    this.isEnhancedDebugMode = this.config.mode === SkillTreeMode.DEBUG_ENHANCED;
    if (this.isEnhancedDebugMode) {
      this.debugDepthOverride = 10;

      (this.scene as any).skillTreeEligibilityBypass = true;
      try {
        const championId = this.config.activeSkillTree.championId;
        let manager: ChampionManager;
        try {
          manager = ChampionManager.getInstance();
        } catch {
          ChampionManager.initialize(this.scene.gameData);
          manager = ChampionManager.getInstance();
        }
        const original = manager.getChampionData(championId);
        const defLocked = (CHAMPION_DEFINITIONS[championId] as any)?.lockedSkills || {};

        const debugChamp = JSON.parse(JSON.stringify(original));
        this.mergeLockedSkillsForDebug(debugChamp, defLocked);
        const champStore = ((this.scene as BattleScene).gameData as any).championData;
        const prev = champStore[championId];
        champStore[championId] = debugChamp;
        (this.scene as any)._debugChampSwapContext = { prev, championId, champStore };
      } catch (error) {
        console.warn("Failed to prepare debug champion data:", error);
      }
    }
    let hadSaved = false;
    try {
      const gd = (this.scene as BattleScene).gameData as any;
      const saved = gd.tempSkillTreeTransform;
      if (saved && typeof saved.scale === "number" && typeof saved.tx === "number" && typeof saved.ty === "number") {
        this.transform.scale = saved.scale;
        this.transform.tx = saved.tx;
        this.transform.ty = saved.ty;
        hadSaved = true;
        if (saved.selectedNodeId && typeof saved.selectedNodeId === "string") {
          this.selectedNodeId = saved.selectedNodeId;
        }
        if (saved.focusPreviewAnchorId && typeof saved.focusPreviewAnchorId === "string") {
          this.focusPreviewAnchorId = saved.focusPreviewAnchorId;
        }
      } else {
        const savedZoom = this.loadZoomPreference();
        if (savedZoom !== null) {
          this.transform.scale = savedZoom;
          this.DEFAULT_ZOOM = savedZoom;
          hadSaved = true;
        }
      }
      this.applyTransform();
    } catch {}
    this.selections = [];
    this.generateSkillTree();
    const isPokemonSelectionFresh = this.config?.mode === SkillTreeMode.POKEMON_SELECTION
      && (this.config?.activeSkillTree?.selectedPokemonPicks?.length ?? 0) === 0;
    if (isPokemonSelectionFresh) {
      this.selectedNodeId = "root_0";
      this.focusPreviewAnchorId = "root_0";
    }
    this.renderTree();
    this.updateNodeStatesAndRender();
    if (!hadSaved) this.fitViewToVisibleNodes();
    const hasPurchasedNodeId = !!((this.scene as BattleScene).gameData as any)?.tempSkillTreeTransform?.purchasedNodeId;
    const isPurchaseReturn = hasPurchasedNodeId && args[0]?.shouldPlayPurchaseAnimation;
    this.updateHUD(isPurchaseReturn && hasPurchasedNodeId);
    this.updateInstructionsOpacity();

    this.startWaveAnimation();

    this.setupControls();

    if (!this.selectedNodeId) {
      const visibleNodes = this.getVisibleNodes();
      if (visibleNodes.length > 0) {
        const rootNode = visibleNodes.find(n => n.id === "root_0" || n.depth === 0);
        this.selectedNodeId = rootNode ? rootNode.id : visibleNodes[0].id;
        this.updateFocusPreviewAnchor(this.selectedNodeId);
        this.updateNodeStatesAndRender();
      }
    } else {

      const restoredNode = this.nodes.find(n => n.id === this.selectedNodeId);
      if (!restoredNode || restoredNode.state === SkillTreeNodeState.LOCKED_HIDDEN) {

        const visibleNodes = this.getVisibleNodes();
        const rootNode = visibleNodes.find(n => n.id === "root_0" || n.depth === 0);
        this.selectedNodeId = rootNode ? rootNode.id : (visibleNodes.length > 0 ? visibleNodes[0].id : null);
        if (this.selectedNodeId) {
          this.updateFocusPreviewAnchor(this.selectedNodeId);
          this.updateNodeStatesAndRender();
        }
      }
    }

    if (this.selectedNodeId && !this.focusPreviewAnchorId) {
      this.focusPreviewAnchorId = this.selectedNodeId;
    }

    const gd = (this.scene as BattleScene).gameData as any;
    if (gd?.tempSkillTreeTransform?.purchasedNodeId && args[0]?.shouldPlayPurchaseAnimation) {
      const purchasedNodeId = gd.tempSkillTreeTransform.purchasedNodeId;
      const purchasedNode = this.nodes.find(n => n.id === purchasedNodeId);

      if (purchasedNode) {
        this.updateNodeVisual(purchasedNode);
        this.updateNodeStatesAndRender();
        this.updateHUD(true);
        this.playUnlockEffect(purchasedNode, 0, async () => {
          await this.batchAutoLevelUpIfAffordable();
        });
      } else {
        this.updateHUD(false);
      }

      delete gd.tempSkillTreeTransform.purchasedNodeId;
    }

    if (gd?.tempSkillTreeTransform?.treeLeveledUp && args[0]?.shouldPlayPurchaseAnimation) {
      this.updateNodeStatesAndRender();
      this.updateHUD();
      delete gd.tempSkillTreeTransform.treeLeveledUp;
    }

    if (args[0]?.shouldPlayPurchaseAnimation && !this.autoBatchLevelUpInProgress && this.config) {
      const ast = this.config.activeSkillTree;
      if (ast && ast.tokens >= SkillTreeUtils.getTokenCostForNextLevel(ast.treeLevel)) {
        (this.scene as BattleScene).time.delayedCall(500, () => {
          if (!this.autoBatchLevelUpInProgress) {
            this.batchAutoLevelUpIfAffordable();
          }
        });
      }
    }
    try {
      if (this.selectedNodeId) {
        const selected = this.nodes.find(n => n.id === this.selectedNodeId);
        if (selected) {
          this.panToNode(selected, 0, true);
          this.updateFocusHighlight(this.selectedNodeId);
        }
      }
    } catch {}

    this.triggerSmitomSkillTreeTipIfNeeded();

    return true;
  }

  private updateChampionTypingIcons(): void {
    if (!this.championTypingContainer || !this.championTypeIcon1 || !this.championTypeIcon2) return;

    const championId = this.config?.activeSkillTree?.championId || this.config?.championData?.id;
    const affinityText = championId ? ChampionUtils.getChampionAffinityLabel(championId) : null;

    if (affinityText) {
      this.championTypingContainer.setVisible(true);
      this.championTypeIcon1.setVisible(false);
      this.championTypeIcon2.setVisible(false);
      if (this.championAffinityIcon) {
        this.championAffinityIcon.setVisible(true);
      }
      if (this.championAffinityLabel) {
        this.championAffinityLabel.setText(affinityText);
        this.championAffinityLabel.setVisible(true);
      }
      return;
    }

    if (this.championAffinityIcon) {
      this.championAffinityIcon.setVisible(false);
    }
    if (this.championAffinityLabel) {
      this.championAffinityLabel.setVisible(false);
    }

    const t1 = this.config?.championData?.type1;
    const t2 = this.config?.championData?.type2;
    const types = [t1, t2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];

    if (types.length === 0) {
      this.championTypingContainer.setVisible(false);
      return;
    }

    this.championTypingContainer.setVisible(true);
    try {
      this.championTypeIcon1.setFrame(Type[types[0]].toLowerCase());
      this.championTypeIcon1.setVisible(true);
      if (types.length > 1) {
        this.championTypeIcon2.setFrame(Type[types[1]].toLowerCase());
        this.championTypeIcon2.setVisible(true);
      } else {
        this.championTypeIcon2.setVisible(false);
      }
    } catch {}
  }

  clear(): void {
    this.cleanupControls();

    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.destroy();
      this.modalBackgroundImage = null;
      this.modalBackgroundCreated = false;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.destroy();
      this.modalPatternOverlay = null;
      this.modalPatternCreated = false;
    }

    if (this.championTypingContainer) {
      this.championTypingContainer.destroy(true);
      this.championTypingContainer = null;
      this.championTypeIcon1 = null;
      this.championTypeIcon2 = null;
      this.championAffinityIcon = null;
      this.championAffinityLabel = null;
    }
    if (this.isEnhancedDebugMode) {
      try {
        delete (this.scene as any).skillTreeEligibilityBypass;
      } catch {}
      try {
        const context = (this.scene as any)._debugChampSwapContext;
        if (context) {
          context.champStore[context.championId] = context.prev;
          delete (this.scene as any)._debugChampSwapContext;
        }
      } catch {}
    }
    try {
      const gd = (this.scene as BattleScene).gameData as any;
      const prev = gd.tempSkillTreeTransform || {};
      gd.tempSkillTreeTransform = {
        ...prev,
        scale: this.transform.scale,
        tx: this.transform.tx,
        ty: this.transform.ty,
        selectedNodeId: this.selectedNodeId,
        focusPreviewAnchorId: this.focusPreviewAnchorId
      };
      this.saveZoomPreference(this.transform.scale);
    } catch {}
    this.cleanupWaveAnimation();
    this.clearDependencyHighlights();

    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.connectionsLayer.removeAll(true);
    this.nodesContainer.removeAll(true);
    this.navHintsLayer?.removeAll(true);
    this.keyHintsContainer?.removeAll(true);
    this.keyHintsBarBg?.clear();
    this.quickNavTargets = [null, null, null, null];
    this.selectedNodeId = null;
    this.focusPreviewAnchorId = null;
    this.currentFocusPreviewNodes.clear();
    super.clear();
    this.modalMessage?.clear();
  }

  processInput(button: Button): boolean {
    this.updateInstructionsForInputMethod();

    if (this.isLevelUpAnimationActive) {
      if (button === Button.SUBMIT || button === Button.ACTION || button === Button.CANCEL) {
        skipCurrentLevelUpAnimation();
      }
      return true;
    }

    switch (button) {
      case Button.LEFT: return this.handleNavigation('left');
      case Button.RIGHT: return this.handleNavigation('right');
      case Button.UP: return this.handleNavigation('up');
      case Button.DOWN: return this.handleNavigation('down');
      case Button.ACTION: return this.handleAction();
      case Button.CANCEL: return this.handleCancel();
      case Button.SUBMIT: return this.handleComplete();
      case Button.MENU:
        if (Overrides.SKILL_TREE_DEBUG_CONTROLS_OVERRIDE) {
          return this.handleMenu();
        }
        this.scene.ui.setOverlayMode(Mode.MENU);
        return true;
      case Button.STATS: return Overrides.SKILL_TREE_DEBUG_CONTROLS_OVERRIDE ? this.handleStatsTest() : this.handleQuickNav(1);
      case Button.CYCLE_SHINY: return this.handleZoomIn();
      case Button.CYCLE_FORM: return this.handleZoomOut();
      case Button.CYCLE_ABILITY: return this.handleQuickNav(0);
      case Button.CYCLE_VARIANT: return this.handleQuickNav(2);
      case Button.VOIDEX: return this.handleQuickNav(3);
      default: return false;
    }
  }

  private handleAction(): boolean {
    if (!this.selectedNodeId) return false;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!node) return false;
    if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION) {
      const isStarterMysteryNode = !!node.rewardData?.data?.starterMysteryNode;
      if (isStarterMysteryNode) {
        return this.handleNodePurchase(node);
      }
      return this.handlePokemonSelection(node);
    }
    return this.handleNodePurchase(node);
  }

  private handleCancel(): boolean {
    this.showExitConfirmation();
    return true;
  }

  private handleComplete(): boolean {
    this.showExitConfirmation();
    return true;
  }

  private handleZoomIn(): boolean {
    this.hideTooltip();
    const c = SkillTreeUiHandler.UI_CONSTANTS.ZOOM;
    const step = 1 + c.BUTTON_STEP;
    const newScale = Math.min(c.MAX, this.transform.scale * step);
    if (newScale === this.transform.scale) return false;
    const ratio = newScale / this.transform.scale;
    this.transform.tx *= ratio;
    this.transform.ty *= ratio;
    this.transform.scale = newScale;
    this.DEFAULT_ZOOM = newScale;
    this.applyTransform();
    return true;
  }

  private handleZoomOut(): boolean {
    this.hideTooltip();
    const c = SkillTreeUiHandler.UI_CONSTANTS.ZOOM;
    const step = 1 - c.BUTTON_STEP;
    const newScale = Math.max(c.MIN, this.transform.scale * step);
    if (newScale === this.transform.scale) return false;
    const ratio = newScale / this.transform.scale;
    this.transform.tx *= ratio;
    this.transform.ty *= ratio;
    this.transform.scale = newScale;
    this.DEFAULT_ZOOM = newScale;
    this.applyTransform();
    return true;
  }

  private showExitConfirmation(): void {
    const ui = (this.scene as BattleScene).ui;

    this.hideTooltip();

    if (this.config?.onSelectionsComplete) {
      return;
    }

    const promptKey = this.config?.mode === SkillTreeMode.BATTLE_ACCESS
      ? "skillTree:confirmReturnToVoid"
      : "skillTree:confirmExitToVoid";
    const promptMessage = i18next.t(promptKey);
    const cancelConfirmation = () => {
      ui.revertMode();
      this.modalMessage?.clear();
      this.updateNodeStatesAndRender();
      if (this.selectedNodeId) {
        this.updateFocusHighlight(this.selectedNodeId);
      }
    };

    const confirmExit = () => {
      ui.revertMode();
      this.modalMessage?.clear();

      const root = this.nodes.find(n => n.id === "root_0" || n.depth === 0);
      this.transform.scale = this.DEFAULT_ZOOM;
      this.transform.tx = 0;
      this.transform.ty = 0;
      this.applyTransform();
      if (root) this.panToNode(root, 300);

      try {
        (this.scene as BattleScene).gameData.tempSkillTreeTransform = undefined;
      } catch {}

      if (this.config?.onClose) {
        this.config.onClose();
      } else if (this.config?.onCancel) {
        this.config.onCancel();
      }
    };

    this.modalMessage?.showText(promptMessage, 0, () => {
      ui.setOverlayMode(Mode.CONFIRM, confirmExit, cancelConfirmation, null, null, 19);
    });
  }

  private getDirectionKeyIcon(direction: 'up' | 'down' | 'left' | 'right'): { textureKey: string; frame: string; scale: number } {
    const buttonMap: Record<string, { button: string; fallback: string }> = {
      up: { button: "BUTTON_UP", fallback: "KEY_ARROW_UP.png" },
      down: { button: "BUTTON_DOWN", fallback: "KEY_ARROW_DOWN.png" },
      left: { button: "BUTTON_LEFT", fallback: "KEY_ARROW_LEFT.png" },
      right: { button: "BUTTON_RIGHT", fallback: "KEY_ARROW_RIGHT.png" },
    };
    let textureKey: string;
    if (this.scene.inputMethod === "gamepad") {
      textureKey = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else {
      textureKey = "keyboard";
    }
    const isGamepad = textureKey !== "keyboard" && this.scene.inputMethod !== "touch";
    const entry = buttonMap[direction];
    const frame = isGamepad
      ? (this.scene.inputController?.getIconForLatestInputRecorded(entry.button) || entry.fallback)
      : entry.fallback;
    return { textureKey, frame, scale: isGamepad ? 3.375 : 2.75 };
  }

  private getNavigationTargets(nodeId: string): Record<'up' | 'down' | 'left' | 'right', SkillTreeNode | null> {
    const result: Record<'up' | 'down' | 'left' | 'right', SkillTreeNode | null> = { up: null, down: null, left: null, right: null };
    const currentNode = this.nodes.find(n => n.id === nodeId);
    if (!currentNode) return result;
    const visibleNodes = this.getVisibleNodes();
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      result[dir] = this.findConnectedNeighborInDirection(currentNode, visibleNodes, dir);
    }
    return result;
  }

  private computeQuickNavCandidates(dirTargetIds: Set<string>): SkillTreeNode[] {
    if (!this.selectedNodeId) return [];
    const currentNode = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!currentNode) return [];
    const connections = this.nodeConnectionMap.get(currentNode.id);
    if (!connections) return [];
    const connectedIds = new Set([...connections.parents, ...connections.children, ...connections.siblings]);
    const candidateNodes = this.nodes.filter(n =>
      connectedIds.has(n.id) &&
      n.id !== currentNode.id &&
      !dirTargetIds.has(n.id) &&
      n.state !== SkillTreeNodeState.LOCKED_HIDDEN &&
      this.isNodeInViewport(n)
    );
    candidateNodes.sort((a, b) => {
      const da = Math.abs(a.position.x - currentNode.position.x) + Math.abs(a.position.y - currentNode.position.y);
      const db = Math.abs(b.position.x - currentNode.position.x) + Math.abs(b.position.y - currentNode.position.y);
      return da - db;
    });
    return candidateNodes.slice(0, 4);
  }

  private getNextDepthBackfillNodes(excludeIds: Set<string>): SkillTreeNode[] {
    const current = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!current) return [];
    const targetDepth = current.depth + 1;
    const pool = this.nodes.filter(n =>
      n.depth === targetDepth &&
      !excludeIds.has(n.id) &&
      n.state !== SkillTreeNodeState.LOCKED_HIDDEN &&
      this.isNodeInViewport(n)
    );
    pool.sort((a, b) => {
      const da = Math.abs(a.position.x - current.position.x) + Math.abs(a.position.y - current.position.y);
      const db = Math.abs(b.position.x - current.position.x) + Math.abs(b.position.y - current.position.y);
      return da - db;
    });
    return pool;
  }

  private getLockedVisibleBackfillNodes(excludeIds: Set<string>): SkillTreeNode[] {
    const current = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!current) return [];
    const pool = this.nodes.filter(n =>
      (n.state === SkillTreeNodeState.LOCKED_VISIBLE || n.state === SkillTreeNodeState.LOCKED_DETAILS) &&
      !excludeIds.has(n.id) &&
      this.isNodeInViewport(n)
    );
    pool.sort((a, b) => {
      const da = Math.abs(a.position.x - current.position.x) + Math.abs(a.position.y - current.position.y);
      const db = Math.abs(b.position.x - current.position.x) + Math.abs(b.position.y - current.position.y);
      return da - db;
    });
    return pool;
  }

  private updateNavKeyHints(): void {
    this.navHintsLayer?.removeAll(true);
    if (!this.selectedNodeId) return;
    if (this.isLevelUpAnimationActive) return;
    if (this.scene.inputMethod === "touch") return;
    const targets = this.getNavigationTargets(this.selectedNodeId);
    const dirTargetIds = new Set<string>();
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      const target = targets[dir];
      if (!target) continue;
      dirTargetIds.add(target.id);
      const sprite = this.nodeSprites.get(target.id);
      if (sprite && !sprite.visible) continue;
      const { textureKey, frame, scale } = this.getDirectionKeyIcon(dir);
      const bgCircle = this.scene.add.graphics();
      bgCircle.fillStyle(0x000000, 0.6);
      bgCircle.fillCircle(target.position.x, target.position.y + this.NODE_SIZE / 2, 10);
      this.navHintsLayer.add(bgCircle);
      const icon = this.scene.add.sprite(target.position.x, target.position.y + this.NODE_SIZE / 2, textureKey);
      icon.setFrame(frame);
      icon.setScale(scale);
      icon.setOrigin(0.5, 0.5);
      this.navHintsLayer.add(icon);
    }
    const actionKeyDefs = [
      { setting: "BUTTON_CYCLE_ABILITY", fallback: "E.png" },
      { setting: "BUTTON_STATS", fallback: "C.png" },
      { setting: "BUTTON_CYCLE_VARIANT", fallback: "V.png" },
      { setting: "BUTTON_VOIDEX", fallback: "P.png" },
    ];
    const candidates = this.computeQuickNavCandidates(dirTargetIds);
    for (let i = 0; i < 4; i++) {
      this.quickNavTargets[i] = candidates[i] ?? null;
    }
    if (candidates.length < 4) {
      const allUsedIds = new Set([...dirTargetIds, ...candidates.map(c => c.id), this.selectedNodeId]);
      const backfill = this.getNextDepthBackfillNodes(allUsedIds);
      for (let i = candidates.length; i < 4 && (i - candidates.length) < backfill.length; i++) {
        this.quickNavTargets[i] = backfill[i - candidates.length];
      }
    }
    const glitchNode = this.nodes.find(n => n.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN);
    if (glitchNode
        && glitchNode.state !== SkillTreeNodeState.LOCKED_HIDDEN
        && this.isNodeInViewport(glitchNode)) {
      const alreadyUsed = dirTargetIds.has(glitchNode.id)
        || this.quickNavTargets.some(t => t?.id === glitchNode.id);
      if (!alreadyUsed && glitchNode.id !== this.selectedNodeId) {
        const emptySlot = this.quickNavTargets.findIndex(t => t === null);
        if (emptySlot >= 0) {
          this.quickNavTargets[emptySlot] = glitchNode;
        }
      }
    }
    if (this.quickNavTargets.some(t => t === null)) {
      const allUsedForLocked = new Set([
        ...dirTargetIds,
        ...this.quickNavTargets.filter(t => t !== null).map(t => t!.id),
        this.selectedNodeId,
      ]);
      const lockedBackfill = this.getLockedVisibleBackfillNodes(allUsedForLocked);
      for (const node of lockedBackfill) {
        const slot = this.quickNavTargets.findIndex(t => t === null);
        if (slot < 0) break;
        this.quickNavTargets[slot] = node;
      }
    }
    for (let i = 0; i < 4; i++) {
      const target = this.quickNavTargets[i];
      if (!target) continue;
      const spr = this.nodeSprites.get(target.id);
      if (spr && !spr.visible) continue;
      const { textureKey, frame, scale } = this.getActionKeyIcon(actionKeyDefs[i].setting, actionKeyDefs[i].fallback, true);
      const bgCircle = this.scene.add.graphics();
      bgCircle.fillStyle(0x000000, 0.6);
      bgCircle.fillCircle(target.position.x, target.position.y + this.NODE_SIZE / 2, 10);
      this.navHintsLayer.add(bgCircle);
      const actionIcon = this.scene.add.sprite(target.position.x, target.position.y + this.NODE_SIZE / 2, textureKey);
      actionIcon.setFrame(frame);
      actionIcon.setScale(scale);
      actionIcon.setOrigin(0.5, 0.5);
      this.navHintsLayer.add(actionIcon);
    }
    if (this.keyHintsMode === "icons") {
      this.buildKeyHintsRow();
    }
  }

  private getActionKeyIcon(settingName: string, fallbackFrame: string, forNode = false): { textureKey: string; frame: string; scale: number } {
    let textureKey: string;
    if (this.scene.inputMethod === "gamepad") {
      textureKey = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else {
      textureKey = "keyboard";
    }
    const isGamepad = textureKey !== "keyboard" && this.scene.inputMethod !== "touch";
    const c = SkillTreeUiHandler.UI_CONSTANTS.KEY_HINTS;
    const frame = isGamepad
      ? (this.scene.inputController?.getIconForLatestInputRecorded(settingName) || fallbackFrame)
      : fallbackFrame;
    const scale = forNode
      ? (isGamepad ? 3.375 : 2.75)
      : (isGamepad ? c.KEY_SCALE_GP : c.KEY_SCALE_KB);
    return { textureKey, frame, scale };
  }

  private isNodeInViewport(node: SkillTreeNode): boolean {
    const pos = this.nodeScreenPosition(node);
    const half = (this.NODE_SIZE / 2) * this.transform.scale;
    return pos.x + half >= 0 && pos.x - half <= this.getWidth() &&
           pos.y + half >= 0 && pos.y - half <= this.getHeight();
  }

  private getHudIconScale(node: SkillTreeNode, iconCfg: { scale: number }): number {
    const kc = SkillTreeUiHandler.UI_CONSTANTS.KEY_HINTS;
    if (node.id === "root_0" || node.depth === 0) {
      return kc.NODE_ICON_BASE * this.getSkillTreeTrainerBondScale(this.config?.activeSkillTree?.championId ?? "");
    }
    return kc.NODE_ICON_BASE * iconCfg.scale;
  }

  private getNodeHudIconConfig(node: SkillTreeNode): { key: string; frame: string; scale: number; costText?: string; inverted?: boolean } {
    switch (node.state) {
      case SkillTreeNodeState.LOCKED_DETAILS:
        if (node.isLevelLocked && node.branchUnlockCost != null) {
          return { key: "items", frame: "ribbon_gen9", scale: 2.0, costText: `x${node.branchUnlockCost}` };
        }
        break;
      case SkillTreeNodeState.LOCKED_VISIBLE:
        if (!isSkillTreeV2() && !(node.isLevelLocked && node.requiredUnlockLevel != null)) {
          return { key: "smitems", frame: "permaMoreRewardChoice", scale: 1.0 };
        }
        break;
      case SkillTreeNodeState.LOCKED_HIDDEN:
        if (this.scene.textures.exists("ui")) {
          return { key: "ui", frame: "lock", scale: 0.5 };
        }
        return { key: "smitems", frame: "glitchPiece", scale: 0.045 };
    }
    if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
      const ast = this.config?.activeSkillTree;
      const eligible = ast ? this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast) : 0;
      const baseline = ast ? this.ensureRandomGlitchFormsBaseline(ast, node.id, eligible) : 0;
      const required = ast ? this.getRandomGlitchFormsRequiredCount(ast, node.id) : 5;
      const remaining = Math.max(0, required - Math.max(0, eligible - baseline));
      const cfg = this.getNodeIconConfig(node);
      return { key: cfg.key, frame: cfg.frame, scale: cfg.scale, costText: `x${remaining}`, inverted: cfg.inverted };
    }
    const cfg = this.getNodeIconConfig(node);
    return { key: cfg.key, frame: cfg.frame, scale: cfg.scale, inverted: cfg.inverted };
  }

  private buildKeyHintsRow(): void {
    if (this.keyHintsContainer) {
      this.keyHintsContainer.removeAll(true);
    }
    if (this.keyHintsBarBg) {
      this.keyHintsBarBg.clear();
    }
    if (!this.selectedNodeId || this.scene.inputMethod === "touch" || this.isLevelUpAnimationActive) {
      if (this.keyHintsContainer) this.keyHintsContainer.setVisible(false);
      if (this.keyHintsBarBg) this.keyHintsBarBg.setVisible(false);
      return;
    }
    const kc = SkillTreeUiHandler.UI_CONSTANTS.KEY_HINTS;
    const hc = SkillTreeUiHandler.UI_CONSTANTS.HUD;
    const gaugeTopY = this.getHeight() - hc.Y_BOTTOM_OFFSET + hc.LEVEL_GAUGE.Y_OFFSET + hc.LEVEL_GAUGE.CONTAINER_Y - hc.LEVEL_GAUGE.BG_HEIGHT / 2;
    const barY = gaugeTopY - kc.BAR_HEIGHT - kc.BAR_Y_ABOVE_GAUGE;
    const targets = this.getNavigationTargets(this.selectedNodeId);
    const dirOrder: ('up' | 'down' | 'left' | 'right')[] = ['left', 'up', 'down', 'right'];
    let dirCount = 0;
    for (const dir of dirOrder) {
      const target = targets[dir];
      if (!target) continue;
      const spr = this.nodeSprites.get(target.id);
      if (spr && !spr.visible) continue;
      dirCount++;
    }
    const actionKeys: { setting: string; fallback: string }[] = [
      { setting: "BUTTON_CYCLE_ABILITY", fallback: "E.png" },
      { setting: "BUTTON_STATS", fallback: "C.png" },
      { setting: "BUTTON_CYCLE_VARIANT", fallback: "V.png" },
      { setting: "BUTTON_VOIDEX", fallback: "P.png" },
    ];
    let actionCount = 0;
    for (let i = 0; i < 4; i++) {
      if (this.quickNavTargets[i]) actionCount++;
    }
    const maxCols = Math.max(dirCount, actionCount);
    if (maxCols === 0) {
      if (this.keyHintsContainer) this.keyHintsContainer.setVisible(false);
      if (this.keyHintsBarBg) this.keyHintsBarBg.setVisible(false);
      return;
    }
    const barWidth = maxCols * kc.COL_WIDTH + kc.PADDING * 2;
    const barX = this.getWidth() - barWidth - kc.BAR_X_OFFSET;
    if (!this.keyHintsBarBg) {
      this.keyHintsBarBg = this.scene.add.graphics();
      this.hud.addAt(this.keyHintsBarBg, 0);
    }
    this.keyHintsBarBg.clear();
    this.keyHintsBarBg.fillStyle(kc.BAR_COLOR, kc.BAR_BG_ALPHA);
    this.keyHintsBarBg.fillRoundedRect(barX, barY, barWidth, kc.BAR_HEIGHT, kc.BAR_RADIUS);
    this.keyHintsBarBg.lineStyle(kc.BAR_BORDER_THICKNESS, kc.BAR_BORDER_COLOR, kc.BAR_BORDER_ALPHA);
    this.keyHintsBarBg.strokeRoundedRect(barX, barY, barWidth, kc.BAR_HEIGHT, kc.BAR_RADIUS);
    this.keyHintsBarBg.setVisible(true);
    if (!this.keyHintsContainer) {
      this.keyHintsContainer = this.scene.add.container(0, 0);
      this.hud.add(this.keyHintsContainer);
    }
    this.keyHintsContainer.removeAll(true);
    this.keyHintsContainer.setVisible(true);
    const isGamepad = this.scene.inputMethod === "gamepad";
    const hudKeyScale = isGamepad ? kc.KEY_SCALE_GP : kc.KEY_SCALE_KB;
    const contentH = 8.5;
    const rowGap = 2;
    const totalH = contentH * 2 + rowGap;
    const topInset = (kc.BAR_HEIGHT - totalH) / 2;
    const row1CenterY = barY + topInset + contentH / 2;
    const row2CenterY = barY + topInset + contentH + rowGap + contentH / 2;
    let colX = barX + kc.PADDING;
    for (const dir of dirOrder) {
      const target = targets[dir];
      if (!target) continue;
      const spr = this.nodeSprites.get(target.id);
      if (spr && !spr.visible) continue;
      const { textureKey, frame } = this.getDirectionKeyIcon(dir);
      const keyIcon = this.scene.add.sprite(colX, row1CenterY, textureKey);
      keyIcon.setFrame(frame);
      keyIcon.setScale(hudKeyScale);
      keyIcon.setOrigin(0, 0.5);
      this.keyHintsContainer.add(keyIcon);
      const iconCfg = this.getNodeHudIconConfig(target);
      const nodeIconX = colX + keyIcon.displayWidth + kc.GAP;
      const nodeIcon = iconCfg.frame
        ? this.scene.add.sprite(nodeIconX, iconCfg.costText ? row1CenterY - 1 : row1CenterY, iconCfg.key, iconCfg.frame as any)
        : this.scene.add.sprite(nodeIconX, iconCfg.costText ? row1CenterY - 1 : row1CenterY, iconCfg.key);
      nodeIcon.setScale(this.getHudIconScale(target, iconCfg));
      nodeIcon.setOrigin(0, 0.5);
      this.keyHintsContainer.add(nodeIcon);
      if (iconCfg.inverted && nodeIcon.postFX && typeof nodeIcon.postFX.addColorMatrix === 'function') {
        nodeIcon.postFX.addColorMatrix().negative();
      }
      if (iconCfg.costText) {
        const costCenterX = nodeIconX + nodeIcon.displayWidth / 2;
        const costLabel = addTextObject(this.scene, costCenterX, row1CenterY - 1, iconCfg.costText, TextStyle.WINDOW, { fontSize: "31px" });
        costLabel.setOrigin(0.5, 0);
        costLabel.setStyle({ fontFamily: "pkmnems", color: "#FFFFFF", stroke: "#000000", strokeThickness: 4 });
        costLabel.setShadow(0, 0, undefined as any, 0);
        this.keyHintsContainer.add(costLabel);
      }
      colX += kc.COL_WIDTH;
    }
    let actionColX = barX + kc.PADDING;
    for (let i = 0; i < 4; i++) {
      const ak = actionKeys[i];
      const candidate = this.quickNavTargets[i];
      if (!candidate) continue;
      const { textureKey, frame } = this.getActionKeyIcon(ak.setting, ak.fallback);
      const keyIcon = this.scene.add.sprite(actionColX, row2CenterY, textureKey);
      keyIcon.setFrame(frame);
      keyIcon.setScale(hudKeyScale);
      keyIcon.setOrigin(0, 0.5);
      this.keyHintsContainer.add(keyIcon);
      const iconCfg = this.getNodeHudIconConfig(candidate);
      const nodeIconX = actionColX + keyIcon.displayWidth + kc.GAP;
      const nodeIcon = iconCfg.frame
        ? this.scene.add.sprite(nodeIconX, iconCfg.costText ? row2CenterY - 1 : row2CenterY, iconCfg.key, iconCfg.frame as any)
        : this.scene.add.sprite(nodeIconX, iconCfg.costText ? row2CenterY - 1 : row2CenterY, iconCfg.key);
      nodeIcon.setScale(this.getHudIconScale(candidate, iconCfg));
      nodeIcon.setOrigin(0, 0.5);
      this.keyHintsContainer.add(nodeIcon);
      if (iconCfg.inverted && nodeIcon.postFX && typeof nodeIcon.postFX.addColorMatrix === 'function') {
        nodeIcon.postFX.addColorMatrix().negative();
      }
      if (iconCfg.costText) {
        const costCenterX = nodeIconX + nodeIcon.displayWidth / 2;
        const costLabel = addTextObject(this.scene, costCenterX, row2CenterY - 1, iconCfg.costText, TextStyle.WINDOW, { fontSize: "31px" });
        costLabel.setOrigin(0.5, 0);
        costLabel.setStyle({ fontFamily: "pkmnems", color: "#FFFFFF", stroke: "#000000", strokeThickness: 4 });
        costLabel.setShadow(0, 0, undefined as any, 0);
        this.keyHintsContainer.add(costLabel);
      }
      actionColX += kc.COL_WIDTH;
    }
  }

  private handleQuickNav(slotIndex: number): boolean {
    const target = this.quickNavTargets[slotIndex];
    if (!target) return false;
    this.selectNode(target);
    return true;
  }

  private setKeyHintsMode(mode: "icons" | "text"): void {
    this.keyHintsMode = mode;
    if (mode === "icons") {
      this.instructionsText?.setVisible(false);
      this.instructionsTextBg?.setVisible(false);
      this.updateNavKeyHints();
    } else {
      this.keyHintsContainer?.setVisible(false);
      this.keyHintsBarBg?.setVisible(false);
      this.instructionsText?.setVisible(true);
      this.instructionsTextBg?.setVisible(true);
    }
  }

  private handleNavigation(direction: 'left' | 'right' | 'up' | 'down'): boolean {
    const visibleNodes = this.getVisibleNodes();
    if (visibleNodes.length === 0) return false;

    if (!this.selectedNodeId) {
      const rootNode = visibleNodes.find(n => n.id === "root_0" || n.depth === 0);
      const startNode = rootNode || visibleNodes[0];
      this.modalMessage?.clear();
      this.selectedNodeId = startNode.id;
      this.updateFocusPreviewAnchor(startNode.id);
      this.updateNodeStatesAndRender();
      this.showTooltipFor(startNode);
      this.updateFocusHighlight(startNode.id);
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3", { volumeGroup: "ui" }); } catch {}
      this.updateNavKeyHints();
      return true;
    }

    const currentNode = visibleNodes.find(n => n.id === this.selectedNodeId);
    if (!currentNode) {
      const rootNode = visibleNodes.find(n => n.id === "root_0" || n.depth === 0);
      const startNode = rootNode || visibleNodes[0];
      this.modalMessage?.clear();
      this.selectedNodeId = startNode.id;
      this.updateFocusPreviewAnchor(startNode.id);
      this.updateNodeStatesAndRender();
      this.showTooltipFor(startNode);
      this.updateFocusHighlight(startNode.id);
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3", { volumeGroup: "ui" }); } catch {}
      this.updateNavKeyHints();
      return true;
    }

    const neighbor = this.findConnectedNeighborInDirection(currentNode, visibleNodes, direction);
    if (neighbor) {
      this.modalMessage?.clear();
      this.selectedNodeId = neighbor.id;
      this.updateFocusPreviewAnchor(neighbor.id);
      this.updateNodeStatesAndRender();
      this.updateFocusHighlight(neighbor.id);
      this.panToNode(neighbor, 700, true);
      this.showTooltipFor(neighbor);
      try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3", { volumeGroup: "ui" }); } catch {}
      this.checkApolloDianaTutorial(neighbor);
      this.triggerSmitomRogueModeTipIfNeeded(neighbor);
      this.triggerSmitomFreeNodeTipIfNeeded(neighbor);
      this.triggerSmitomGlitchFormNodeTipIfNeeded(neighbor);
      this.updateNavKeyHints();
      return true;
    }

    return false;
  }

  private checkApolloDianaTutorial(node: SkillTreeNode): void {
    const championId = this.config?.activeSkillTree?.championId;
    if (championId !== "apollo" && championId !== "diana") return;
    if ((this.scene as BattleScene).gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SKILLTREE_APOLLO_DIANA_TYPES)) return;
    const triggerTypes = [
        SkillTreeRewardType.TM_FILTERED,
        SkillTreeRewardType.XM_FILTERED,
        SkillTreeRewardType.ABILITY_GRANT,
        SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
        SkillTreeRewardType.TYPE_SWITCHER,
        SkillTreeRewardType.TYPE_BOOSTER_ITEM,
        SkillTreeRewardType.GENERAL_POKEMON,
        SkillTreeRewardType.TERA_TYPE
    ];
    const isRootNode = node.depth === 0;
    const isTriggerType = node.rewardData?.type && triggerTypes.includes(node.rewardData.type);
  }

  private getVisibleNodes(): SkillTreeNode[] {
    if (!this.config) return [];
    if (this.isEnhancedDebugMode) {
      return this.nodes.filter(n => n.state !== SkillTreeNodeState.LOCKED_HIDDEN);
    }
    if (isSkillTreeV2()) {
      return this.nodes.filter(n => n.state !== SkillTreeNodeState.LOCKED_HIDDEN);
    }
    const maxDepth = this.config.activeSkillTree.maxVisibleDepth || 0;
    return this.nodes.filter(n => n.state !== SkillTreeNodeState.LOCKED_HIDDEN && n.depth <= maxDepth);
  }

  private buildConnectionMap(): void {
    this.nodeConnectionMap.clear();
    this.nodes.forEach(node => {
      this.nodeConnectionMap.set(node.id, {
        parents: [...node.dependencies],
        children: [],
        siblings: []
      });
    });
    this.nodes.forEach(node => {
      node.dependencies.forEach(parentId => {
        const parentConnections = this.nodeConnectionMap.get(parentId);
        if (parentConnections && !parentConnections.children.includes(node.id)) {
          parentConnections.children.push(node.id);
        }
      });
    });
    this.nodes.forEach(node => {
      const nodeConnections = this.nodeConnectionMap.get(node.id);
      if (!nodeConnections) return;

      node.dependencies.forEach(parentId => {
        const parentConnections = this.nodeConnectionMap.get(parentId);
        if (parentConnections) {
          parentConnections.children.forEach(siblingId => {
            if (siblingId !== node.id && !nodeConnections.siblings.includes(siblingId)) {
              nodeConnections.siblings.push(siblingId);
            }
          });
        }
      });
    });
  }

  private findConnectedNeighborInDirection(
    currentNode: SkillTreeNode,
    candidates: SkillTreeNode[],
    direction: 'left' | 'right' | 'up' | 'down'
  ): SkillTreeNode | null {
    const connections = this.nodeConnectionMap.get(currentNode.id);
    if (!connections) return this.findNeighborInDirection(currentNode, candidates, direction);
    const connectedNodeIds = new Set([
      ...connections.parents,
      ...connections.children,
      ...connections.siblings
    ]);
    const connectedCandidates = candidates.filter(node =>
      connectedNodeIds.has(node.id) && node.id !== currentNode.id
    );

    if (connectedCandidates.length === 0) {

      return this.findNeighborInDirection(currentNode, candidates, direction);
    }
    const result = this.selectBestConnectedNode(currentNode, connectedCandidates, direction);
    return result;
  }

  private selectBestConnectedNode(
    currentNode: SkillTreeNode,
    connectedNodes: SkillTreeNode[],
    direction: string
  ): SkillTreeNode | null {
    const { x: currentX, y: currentY } = currentNode.position;
    const nodesByZone = this.categorizeNodesByZone(currentNode, connectedNodes);
    const directionToZones = {
      'up': ['top'],
      'down': ['bottom'],
      'left': ['left'],
      'right': ['right']
    };

    const preferredZones = directionToZones[direction] || [];
    for (const zone of preferredZones) {
      const candidates = nodesByZone[zone];
      if (candidates.length > 0) {
        return this.getClosestNode(currentNode, candidates);
      }
    }
    const diagonalZones = {
      'up': ['top-left', 'top-right'],
      'down': ['bottom-left', 'bottom-right'],
      'left': ['top-left', 'bottom-left'],
      'right': ['top-right', 'bottom-right']
    };

    const diagonalOptions = diagonalZones[direction] || [];
    for (const zone of diagonalOptions) {
      const candidates = nodesByZone[zone];
      if (candidates.length > 0) {
        return this.getClosestNode(currentNode, candidates);
      }
    }
    return null;
  }

  private categorizeNodesByZone(
    currentNode: SkillTreeNode,
    connectedNodes: SkillTreeNode[]
  ): Record<string, SkillTreeNode[]> {
    const { x: currentX, y: currentY } = currentNode.position;

    const zones = {
      'top': [] as SkillTreeNode[],
      'top-right': [] as SkillTreeNode[],
      'right': [] as SkillTreeNode[],
      'bottom-right': [] as SkillTreeNode[],
      'bottom': [] as SkillTreeNode[],
      'bottom-left': [] as SkillTreeNode[],
      'left': [] as SkillTreeNode[],
      'top-left': [] as SkillTreeNode[]
    };

    connectedNodes.forEach(node => {
      const deltaX = node.position.x - currentX;
      const deltaY = node.position.y - currentY;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      const angle = Math.atan2(-deltaY, deltaX);
      let degrees = (angle * 180 / Math.PI + 360) % 360;
      const zone = this.getZoneFromAngle(degrees);
      zones[zone].push(node);
    });

    return zones;
  }

  private getZoneFromAngle(degrees: number): string {
    if (degrees >= 337.5 || degrees < 22.5) return 'right';
    if (degrees >= 22.5 && degrees < 67.5) return 'top-right';
    if (degrees >= 67.5 && degrees < 112.5) return 'top';
    if (degrees >= 112.5 && degrees < 157.5) return 'top-left';
    if (degrees >= 157.5 && degrees < 202.5) return 'left';
    if (degrees >= 202.5 && degrees < 247.5) return 'bottom-left';
    if (degrees >= 247.5 && degrees < 292.5) return 'bottom';
    if (degrees >= 292.5 && degrees < 337.5) return 'bottom-right';

    return 'right';
  }

  private getClosestNode(currentNode: SkillTreeNode, candidates: SkillTreeNode[]): SkillTreeNode | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const { x: currentX, y: currentY } = currentNode.position;

    return candidates.reduce((closest, candidate) => {
      const currentDistance = Math.sqrt(
        Math.pow(candidate.position.x - currentX, 2) +
        Math.pow(candidate.position.y - currentY, 2)
      );
      const closestDistance = Math.sqrt(
        Math.pow(closest.position.x - currentX, 2) +
        Math.pow(closest.position.y - currentY, 2)
      );

      return currentDistance < closestDistance ? candidate : closest;
    });
  }

  private findNeighborInDirection(currentNode: SkillTreeNode, candidates: SkillTreeNode[], direction: string): SkillTreeNode | null {
    const { x: currentX, y: currentY } = currentNode.position;

    let targetAngle: number;
    switch (direction) {
      case 'right': targetAngle = 0; break;
      case 'up': targetAngle = Math.PI / 2; break;
      case 'left': targetAngle = Math.PI; break;
      case 'down': targetAngle = -Math.PI / 2; break;
      default: return null;
    }

    let bestNode: SkillTreeNode | null = null;
    let bestScore = Infinity;

    for (const candidate of candidates) {
      if (candidate.id === currentNode.id) continue;

      const { x: candidateX, y: candidateY } = candidate.position;
      const dx = candidateX - currentX;
      const dy = candidateY - currentY;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(-dy, dx);
      let angleDiff = Math.abs(angle - targetAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > Math.PI / 2) continue;
      const score = angleDiff * 10 + distance / 100;

      if (score < bestScore) {
        bestScore = score;
        bestNode = candidate;
      }
    }

    return bestNode;
  }
  private generateSkillTree(): void {
    if (!this.config) return;
    const gd = (this.scene as BattleScene).gameData as any;
    let cached: SkillTreeNode[] | undefined = gd.tempSkillTreeNodes as SkillTreeNode[] | undefined;
    const isSelection = this.config.mode === SkillTreeMode.POKEMON_SELECTION;
    const isEnhancedDebug = this.config.mode === SkillTreeMode.DEBUG_ENHANCED;
    const requiredSelections = this.config.requiredSelections ?? 0;
    const picksCount = this.config.activeSkillTree.selectedPokemonPicks?.length ?? 0;
    const isJourneyTree = Array.isArray(cached) && cached.some(n => n?.id?.startsWith("depth1_journey_mystery_"));

    let selectionComplete = false;
    if (isSelection && isJourneyTree && cached) {
      const primaryUnlocked = cached.filter(n =>
        n?.id?.match(/^depth1_journey_mystery_[012]$/) &&
        this.config!.activeSkillTree.unlockedNodes?.has(n.id)
      ).length;
      const fourthNode = cached.find(n => n?.id === "depth1_journey_mystery_3");
      const fourthDone = !fourthNode || this.config!.activeSkillTree.unlockedNodes?.has(fourthNode.id);
      selectionComplete = primaryUnlocked >= 2 && fourthDone;
    } else {
      const pokemonSelectionComplete = requiredSelections > 0 ? picksCount >= requiredSelections : picksCount >= 2;
      let mysteryOk = true;
      if (isSelection && cached && cached.length) {
        let mysteryExists = false;
        let mysteryPurchased = false;
        for (const n of cached) {
          const isMystery = !!n?.rewardData?.data?.starterMysteryNode;
          if (!isMystery) continue;
          mysteryExists = true;
          if (this.config!.activeSkillTree.unlockedNodes?.has(n.id)) {
            mysteryPurchased = true;
            break;
          }
        }
        mysteryOk = !mysteryExists || mysteryPurchased;
      }
      selectionComplete = isSelection ? (pokemonSelectionComplete && mysteryOk) : pokemonSelectionComplete;
    }
    this._selectionComplete = selectionComplete;
    const selectionBaseDepth = selectionComplete ? 2 : 1;
    const hasRoot = Array.isArray(cached) && cached.some(n => n.id === "root_0" || n.depth === 0);
    const hasDepth2Plus = Array.isArray(cached) && cached.some(n => typeof n.depth === "number" && n.depth >= 2);

    const hasForcedRandomGlitchDepth1 =
      Array.isArray(cached) &&
      cached.some(n => n?.depth === 1 && n?.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN);
    if (cached && cached.length && hasRoot && hasDepth2Plus && !hasForcedRandomGlitchDepth1) {
      gd.tempSkillTreeNodes = undefined;
      cached = undefined;
    }

    if (cached && cached.length && (isSelection || isEnhancedDebug || (hasRoot && hasDepth2Plus))) {
      if (isSelection) {
        const maxDepth = this.debugDepthOverride > 0 ? this.debugDepthOverride : selectionBaseDepth;
        this.nodes = cached.filter(n => n.depth <= maxDepth);
      } else if (isEnhancedDebug) {

        this.nodes = cached;
      } else {
        this.nodes = cached;
      }
      return;
    }
    const ast = this.config.activeSkillTree;
    const hasPokemonDepth1 = Array.from(ast.unlockedNodes || []).some(id => typeof id === "string" && (id.startsWith("depth1_signature_") || id.startsWith("depth1_general_")));
    const hasPicks = (ast.selectedPokemonPicks?.length ?? 0) > 0;
    const hasJourneyDepth1 = Array.isArray(cached) && cached.some(n => n?.id?.startsWith("depth1_journey_mystery_"));
    const usePokemonSelectionTree = isSelection || hasPokemonDepth1 || hasPicks || hasJourneyDepth1;
    const championData = this.config.championData;
    const applyPokemonSelectionTree = (fullTree: SkillTreeNode[]): SkillTreeNode[] => {
      const cachedDepth1 = Array.isArray(cached) ? cached.filter(n => n && n.depth === 1) : [];
      if (cachedDepth1.length > 0) {
        const filteredTree = fullTree.filter(node => node.depth !== 1);
        const originalDepth1NodeIds = fullTree.filter(n => n.depth === 1).map(n => n.id);
        cachedDepth1.forEach(n => filteredTree.push(n));
        const newPokemonNodes = cachedDepth1.filter(n =>
          n && (n.rewardData?.type === SkillTreeRewardType.SIGNATURE_POKEMON || n.rewardData?.type === SkillTreeRewardType.GENERAL_POKEMON || !!n.rewardData?.data?.starterMysteryNode)
        );
        if (newPokemonNodes.length > 0) {
          filteredTree.forEach(node => {
            if (node.depth === 2 && node.dependencies) {
              node.dependencies = node.dependencies.map(depId => {
                if (originalDepth1NodeIds.includes(depId)) {
                  let closestNode = newPokemonNodes[0];
                  let minDistance = Math.sqrt(
                    Math.pow(node.position.x - closestNode.position.x, 2) +
                    Math.pow(node.position.y - closestNode.position.y, 2)
                  );
                  for (const pokemonNode of newPokemonNodes) {
                    const distance = Math.sqrt(
                      Math.pow(node.position.x - pokemonNode.position.x, 2) +
                      Math.pow(node.position.y - pokemonNode.position.y, 2)
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestNode = pokemonNode;
                    }
                  }
                  const maxConnectionDistance = 300;
                  if (minDistance <= maxConnectionDistance) {
                    return closestNode.id;
                  } else {
                    return "root_0";
                  }
                }
                return depId;
              });
            }
          });
        }
        return filteredTree;
      }
      const upgrades = Math.max(0, Math.min(6, (championData as any)?.starterNodeUpgradesUnlocked ?? 0));
      const total = Math.min(10, 4 + upgrades);
      const TIER_RADIUS = 150;
      const NODE_SIZE = 90;
      const radius = TIER_RADIUS + NODE_SIZE / 2;
      const filteredTree = fullTree.filter(node => node.depth !== 1);
      const originalDepth1NodeIds = fullTree.filter(n => n.depth === 1).map(n => n.id);
      const nodeGen = new SkillTreeNodeGenerator(ast.seed, ast.championId, this.scene as BattleScene);
      this.scene.executeWithSeedOffset(() => {
        let signatureCount = Math.floor(total / 2);
        let generalCount = total - signatureCount;
        if (total % 2 !== 0) {
          if (Utils.randSeedInt(2) === 0) signatureCount += 1; else generalCount += 1;
        }

        const nodeCount = Math.max(1, signatureCount + generalCount);
        const hasBountyUI = this.scene.gameData.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1 || Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE;
        const totalRingSlots = nodeCount + (hasBountyUI ? 2 : 1);
        const bottomSlot = Math.max(1, Math.round(nodeCount / 4));
        const mysteryIdx = signatureCount > 0 ? Math.min(signatureCount - 1, bottomSlot) : -1;

        const isMysteryRewardEligible = (rt: SkillTreeRewardType): boolean => {
          switch (rt) {
            case SkillTreeRewardType.PERMA_MONEY:
              return !!(championData as any)?.unlockedPermaMoney;
            case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
              return !!(championData as any)?.unlockedBallRaritySelect?.rogue;
            case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
              return !!(championData as any)?.unlockedBallRaritySelect?.master;
            case SkillTreeRewardType.MASTER_BALL:
              return !!(championData as any)?.unlockedMasterBall;
            case SkillTreeRewardType.GOLDEN_POKEBALL:
              return !!(championData as any)?.unlockedGoldenPokeball;
            case SkillTreeRewardType.VOID_BALL:
              return !!(championData as any)?.unlockedVoidBall;
            case SkillTreeRewardType.SMITTY_ABILITY:
              return ((championData as any)?.unlockedSmittyAbilities?.length ?? 0) > 0;
            default:
              return true;
          }
        };

        const commonPool = [
          SkillTreeRewardType.EGG_VOUCHER,
          SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
          SkillTreeRewardType.SKILL_TREE_TOKENS,
          SkillTreeRewardType.SKILL_POINTS,
          SkillTreeRewardType.TRAINER_BOND_ABILITY,
          SkillTreeRewardType.PERMA_MONEY,
          SkillTreeRewardType.ROGUEBALL_RARITY_SELECT,
          SkillTreeRewardType.PERMA_ITEM,
        ].filter(isMysteryRewardEligible);

        const veryRarePool = [
          SkillTreeRewardType.MASTER_BALL,
          SkillTreeRewardType.PARTY_ABILITY_GRANT,
          SkillTreeRewardType.MASTERBALL_RARITY_SELECT,
        ].filter(isMysteryRewardEligible);

        const ultraRarePool = [
          SkillTreeRewardType.SMITTY_ABILITY,
          SkillTreeRewardType.GOLDEN_POKEBALL,
          SkillTreeRewardType.VOID_BALL,
        ].filter(isMysteryRewardEligible);

        const pickMysteryRewardType = (): SkillTreeRewardType => {
          const roll = Utils.randSeedInt(5000);
          if (roll < 250 && (this.scene.gameData.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1 || Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE)) {
            return SkillTreeRewardType.BOUNTY_SELECT;
          }
          const tier = roll < 2 ? "legendary" : roll < 7 ? "master" : "common";

          if (tier === "legendary") {
            if (ultraRarePool.length) return Utils.randSeedItem(ultraRarePool);
            if (veryRarePool.length) return Utils.randSeedItem(veryRarePool);
            return Utils.randSeedItem(commonPool);
          }

          if (tier === "master") {
            if (veryRarePool.length) return Utils.randSeedItem(veryRarePool);
            return Utils.randSeedItem(commonPool);
          }

          return Utils.randSeedItem(commonPool);
        };

        const generateMysteryRewardData = (rt: SkillTreeRewardType) => {
          switch (rt) {
            case SkillTreeRewardType.EGG_VOUCHER:
              return { type: rt, data: { tier: Utils.randSeedItem([VoucherType.REGULAR, VoucherType.PLUS, VoucherType.PREMIUM]) }, immediate: false };
            case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickPassiveAbility(championData as any) }, immediate: false };
            case SkillTreeRewardType.SKILL_TREE_TOKENS:
              return { type: rt, data: { amount: SkillTreeSelectors.pickSkillTreeTokens() }, immediate: true };
            case SkillTreeRewardType.SKILL_POINTS:
              return { type: rt, data: { amount: SkillTreeSelectors.pickSkillPoints() }, immediate: true };
            case SkillTreeRewardType.TRAINER_BOND_ABILITY:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickTrainerBondAbility(championData as any), activationChance: 0.05 }, immediate: false };
            case SkillTreeRewardType.PERMA_MONEY:
              return { type: rt, data: { amount: (Utils.randSeedInt(5) + 1) * 1000 }, immediate: true };
            case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
              return { type: rt, data: {}, immediate: false };
            case SkillTreeRewardType.PERMA_ITEM:
              return { type: rt, data: { permaType: SkillTreeSelectors.pickPermaItemType() }, immediate: false };
            case SkillTreeRewardType.MASTER_BALL:
            case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
            case SkillTreeRewardType.PARTY_ABILITY_GRANT:
            case SkillTreeRewardType.GOLDEN_POKEBALL:
            case SkillTreeRewardType.VOID_BALL:
              return { type: rt, data: {}, immediate: false };
            case SkillTreeRewardType.SMITTY_ABILITY:
              return { type: rt, data: { abilityId: SkillTreeSelectors.pickSmittyAbility(championData as any) }, immediate: false };
            case SkillTreeRewardType.BOUNTY_SELECT:
              return { type: rt, data: { bountyNode: true }, immediate: false };
            default:
              return { type: SkillTreeRewardType.EGG_VOUCHER, data: { tier: VoucherType.REGULAR }, immediate: false };
          }
        };

        let placed = 0;
        const availableSignatures = ChampionUtils.getAvailableChampionSignaturePokemon(championData as any, this.scene as BattleScene);
        const shuffledSignatures = Utils.randSeedShuffle(availableSignatures);
        let sigPlaced = 0;

        for (let i = 0; i < signatureCount; i++, placed++) {
          const angle = (placed * 2 * Math.PI) / totalRingSlots;
          const nodeId = i === mysteryIdx ? `depth1_signature_mystery_${i}` : `depth1_signature_${i}`;

          if (i === mysteryIdx) {
            const mysteryType = pickMysteryRewardType();
            const mysteryRewardData = generateMysteryRewardData(mysteryType);
            (mysteryRewardData as any).data = { ...((mysteryRewardData as any).data || {}), starterMysteryNode: true };
            const rarity = getDisplayRarityForRewardType(mysteryType);
            filteredTree.push({
              id: nodeId,
              depth: 1,
              position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
              dependencies: ["root_0"],
              rarity,
              state: SkillTreeNodeState.LOCKED_DETAILS,
              rewardData: mysteryRewardData,
              name: nodeGen.getRewardName(mysteryRewardData as any),
              description: nodeGen.getRewardDescription(mysteryRewardData as any),
              cost: 0,
              isLegendary: false,
              unlocked: false,
            } as any);
            continue;
          }

          const species = (shuffledSignatures.length > 0)
            ? (shuffledSignatures[sigPlaced % shuffledSignatures.length] as unknown as number)
            : (ChampionUtils.getRandomChampionSignaturePokemon(championData as any, this.scene as BattleScene) as unknown as number);
          sigPlaced++;
          const resolvedAltBuildId = ChampionUtils.getSignatureAltBuildId(species as any, championData as any) as PokemonAltBuildId | null;
          const resolvedAltBuild = resolvedAltBuildId ? POKEMON_ALT_BUILDS[resolvedAltBuildId] : undefined;
          const rewardData = { type: SkillTreeRewardType.SIGNATURE_POKEMON, data: { species, altBuildId: resolvedAltBuildId, altBuild: resolvedAltBuild }, immediate: false };
          filteredTree.push({
            id: nodeId,
            depth: 1,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            dependencies: ["root_0"],
            rarity: SkillTreeRarity.GREAT,
            state: SkillTreeNodeState.LOCKED_DETAILS,
            rewardData,
            name: nodeGen.getRewardName(rewardData),
            description: nodeGen.getRewardDescription(rewardData),
            cost: 1,
            isLegendary: false,
            unlocked: false,
          } as any);
        }

        for (let i = 0; i < generalCount; i++, placed++) {
          const angle = (placed * 2 * Math.PI) / totalRingSlots;
          const effectiveChampion = nodeGen.resolveEffectiveChampionData(championData as any);
          const species = SkillTreeSelectors.pickGeneralPokemon(effectiveChampion as any, this.scene as BattleScene) as unknown as number;
          const nodeId = `depth1_general_${i}`;
          const rewardData = { type: SkillTreeRewardType.GENERAL_POKEMON, data: { species, nodeTypes: nodeGen.currentNodeTypes.slice() }, immediate: false };
          const generatedDescription = nodeGen.getRewardDescription(rewardData);
          filteredTree.push({
            id: nodeId,
            depth: 1,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            dependencies: ["root_0"],
            rarity: SkillTreeRarity.GREAT,
            state: SkillTreeNodeState.LOCKED_DETAILS,
            rewardData,
            name: (species ? getPokemonSpecies(species)?.name : undefined) ?? i18next.t("skillTree:descriptions.generalPokemon", { champion: ChampionUtils.getChampionDisplayName((championData as any).id) }),
            description: generatedDescription,
            cost: 1,
            isLegendary: false,
            unlocked: false,
          } as any);
        }

        const glitchAngle = (nodeCount * 2 * Math.PI) / totalRingSlots;
        filteredTree.push({
          id: "depth1_glitch_run_0",
          depth: 1,
          position: { x: Math.cos(glitchAngle) * radius, y: Math.sin(glitchAngle) * radius },
          dependencies: ["root_0"],
          rarity: SkillTreeRarity.LEGENDARY,
          state: SkillTreeNodeState.LOCKED_HIDDEN,
          rewardData: { type: SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN, data: { starterGlitchRunNode: true }, immediate: false },
          name: i18next.t("skillTree:rewards.randomGlitchFormsForRun"),
          description: i18next.t("skillTree:descriptions.randomGlitchFormsForRun"),
          cost: 0,
          isLegendary: false,
          unlocked: false,
        } as any);

        if (this.scene.gameData.championSkillVersion >= ChampionSkillVersion.BOUNTY_NODES_V1 || Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE) {
          const shouldAdd = Overrides.FORCE_SKILL_TREE_BOUNTY_NODE_OVERRIDE || Utils.randSeedInt(10000) < 500;
          if (shouldAdd) {
            const bountyAngle = ((nodeCount + 1) * 2 * Math.PI) / totalRingSlots;
            filteredTree.push({
              id: "depth1_bounty_0",
              depth: 1,
              position: { x: Math.cos(bountyAngle) * radius, y: Math.sin(bountyAngle) * radius },
              dependencies: ["root_0"],
              rarity: SkillTreeRarity.ROGUE,
              state: SkillTreeNodeState.LOCKED_HIDDEN,
              rewardData: { type: SkillTreeRewardType.BOUNTY_SELECT, data: { bountyNode: true }, immediate: false },
              name: i18next.t("skillTree:rewards.bountyNode"),
              description: i18next.t("skillTree:rewards.bountyNodeDesc"),
              cost: 0,
              isLegendary: false,
              unlocked: false,
            } as any);
          }
        }
      }, 0, ast.seed.toString());

      const newPokemonNodes = filteredTree.filter(n =>
        n.depth === 1 &&
        (n.rewardData?.type === SkillTreeRewardType.SIGNATURE_POKEMON || n.rewardData?.type === SkillTreeRewardType.GENERAL_POKEMON)
      );
      if (newPokemonNodes.length > 0) {
        filteredTree.forEach(node => {
          if (node.depth === 2 && node.dependencies) {
            node.dependencies = node.dependencies.map(depId => {
              if (originalDepth1NodeIds.includes(depId)) {
                let closestNode = newPokemonNodes[0];
                let minDistance = Math.sqrt(
                  Math.pow(node.position.x - closestNode.position.x, 2) +
                  Math.pow(node.position.y - closestNode.position.y, 2)
                );
                for (const pokemonNode of newPokemonNodes) {
                  const distance = Math.sqrt(
                    Math.pow(node.position.x - pokemonNode.position.x, 2) +
                    Math.pow(node.position.y - pokemonNode.position.y, 2)
                  );
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestNode = pokemonNode;
                  }
                }
                const maxConnectionDistance = 300;
                if (minDistance <= maxConnectionDistance) {
                  return closestNode.id;
                } else {
                  return "root_0";
                }
              }
              return depId;
            });
          }
        });
      }
      return filteredTree;
    };

    const gen = new SkillTreeGenerator(
      this.scene as BattleScene,
      this.config.activeSkillTree.seed,
      this.config.activeSkillTree.championId as any
    );
    let treeNodes: SkillTreeNode[];
    this.scene.executeWithSeedOffset(() => {
      const maxDepth = isEnhancedDebug ? Number.MAX_SAFE_INTEGER : this.config.activeSkillTree.maxVisibleDepth;
      const fullTree = gen.generateCompleteTree(maxDepth);
      treeNodes = usePokemonSelectionTree ? applyPokemonSelectionTree(fullTree) : fullTree;
      gd.tempSkillTreeNodes = treeNodes;
    }, 0, this.config.activeSkillTree.seed.toString());
    if (this.config.mode === SkillTreeMode.POKEMON_SELECTION) {
      const maxDepth = this.debugDepthOverride > 0 ? this.debugDepthOverride : selectionBaseDepth;
      this.nodes = treeNodes.filter(n => n.depth <= maxDepth);
    } else if (isEnhancedDebug) {

      this.nodes = treeNodes;
    } else {
      this.nodes = treeNodes;
    }
  }

  private renderTree(): void {
    this.connectionsLayer.removeAll(true);
    this.connectionLines = [];
    this.connectionLineKeys.clear();
    this.nodesContainer.removeAll(true);
    this.nodeSprites.clear();
    this.navHintsLayer?.removeAll(true);

    this.buildConnectionMap();

    const ast = this.config?.activeSkillTree;
    let maxRenderDepth: number;
    if (this.isEnhancedDebugMode) {
      maxRenderDepth = Number.MAX_SAFE_INTEGER;
    } else {
      let deepestUnlocked = 0;
      if (ast?.unlockedNodes) {
        this.nodes.forEach(n => {
          if (ast.unlockedNodes.has(n.id) && n.depth > deepestUnlocked) {
            deepestUnlocked = n.depth;
          }
        });
      }
      maxRenderDepth = Math.max(ast?.maxVisibleDepth || 0, deepestUnlocked) + 2;
    }
    const renderableNodes = this.nodes.filter(n => n.depth <= maxRenderDepth);

    renderableNodes.forEach(node => {
      if (!node.dependencies?.length) return;
      node.dependencies.forEach(depId => {
        const dep = renderableNodes.find(n => n.id === depId);
        if (!dep) return;
        const g = this.scene.add.graphics();
        g.lineStyle(4, 0xaaaaaa, 0.9);
        g.beginPath();
        g.moveTo(dep.position.x, dep.position.y);
        g.lineTo(node.position.x, node.position.y);
        g.strokePath();
        g.lineStyle(2, 0xffffff, 0.3);
        g.beginPath();
        g.moveTo(dep.position.x, dep.position.y);
        g.lineTo(node.position.x, node.position.y);
        g.strokePath();
        this.connectionsLayer.add(g);
        this.connectionLines.push({ childId: node.id, parentId: depId, g });
        this.connectionLineKeys.add(`${depId}__${node.id}`);
      });
    });

    renderableNodes.forEach(node => this.renderNode(node));
    this.updateNodeStatesAndRender();
  }

  private renderNode(node: SkillTreeNode): void {
    const c = this.scene.add.container(node.position.x, node.position.y);
    const bg = this.scene.add.graphics();
    c.add(bg);
    const iconCfg = this.getNodeIconConfig(node);
    const spriteX = iconCfg.xOffset ?? 0;
    const spriteY = iconCfg.yOffset ?? 0;

    const icon = iconCfg.frame ?
      this.scene.add.sprite(spriteX, spriteY, iconCfg.key, iconCfg.frame as any) :
      this.scene.add.sprite(spriteX, spriteY, iconCfg.key);
    icon.setScale(iconCfg.scale);
    if (iconCfg.inverted) {
      try {
        if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
          const colorMatrix = icon.postFX.addColorMatrix();
          colorMatrix.negative();
        }
      } catch (error) {

      }
    }

    c.add(icon);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, this.NODE_SIZE / 2), Phaser.Geom.Circle.Contains);
    c.on('pointerover', () => { if (this.isPointerInputAllowed()) this.showTooltipFor(node); });
    c.on('pointerout', () => { if (this.isPointerInputAllowed()) this.hideTooltip(); });
    c.on('pointerdown', () => { if (this.isPointerInputAllowed()) this.selectNode(node); });
    this.nodesContainer.add(c);
    this.nodeSprites.set(node.id, c);
    this.updateNodeVisual(node);
  }

  private ensureConnectionLine(parentId: string, childId: string): void {
    const key = `${parentId}__${childId}`;
    if (this.connectionLineKeys.has(key)) {
      return;
    }
    if (!this.nodeSprites.has(parentId) || !this.nodeSprites.has(childId)) {
      return;
    }
    const parent = this.nodes.find(n => n.id === parentId);
    const child = this.nodes.find(n => n.id === childId);
    if (!parent || !child) {
      return;
    }
    const g = this.scene.add.graphics();
    g.lineStyle(4, 0xaaaaaa, 0.9);
    g.beginPath();
    g.moveTo(parent.position.x, parent.position.y);
    g.lineTo(child.position.x, child.position.y);
    g.strokePath();
    g.lineStyle(2, 0xffffff, 0.3);
    g.beginPath();
    g.moveTo(parent.position.x, parent.position.y);
    g.lineTo(child.position.x, child.position.y);
    g.strokePath();
    this.connectionsLayer.add(g);
    this.connectionLines.push({ childId, parentId, g });
    this.connectionLineKeys.add(key);
  }

  private ensureRenderedForVisibleNodes(): void {
    const visible = this.nodes.filter(n => n.state !== SkillTreeNodeState.LOCKED_HIDDEN);
    visible.forEach(node => {
      if (!this.nodeSprites.has(node.id)) {
        this.renderNode(node);
      }
    });
    visible.forEach(node => {
      if (!node.dependencies?.length) {
        return;
      }
      node.dependencies.forEach(depId => {
        this.ensureConnectionLine(depId, node.id);
      });
    });
  }

  private updateFocusPreviewAnchor(nextSelectedId: string | null): void {
    if (!nextSelectedId) {
      this.focusPreviewAnchorId = null;
      return;
    }
    if (!this.focusPreviewAnchorId) {
      this.focusPreviewAnchorId = nextSelectedId;
      return;
    }
    if (nextSelectedId === this.focusPreviewAnchorId) {
      return;
    }
    if (this.currentFocusPreviewNodes.has(nextSelectedId)) {
      return;
    }
    this.focusPreviewAnchorId = nextSelectedId;
  }

  private selectNode(node: SkillTreeNode): void {
    if (this.selectedNodeId === node.id) {
      this.handleAction();
      return;
    }
    this.modalMessage?.clear();
    this.selectedNodeId = node.id;
    this.updateFocusPreviewAnchor(node.id);
    this.updateNodeStatesAndRender();

    this.updateFocusHighlight(node.id);

    this.hideTooltip();
    this.panToNode(node, 700, true);
    try { (this.scene as BattleScene).playSound("battle_anims/PRSFX- Gear Up3", { volumeGroup: "ui" }); } catch {}
    this.triggerSmitomRogueModeTipIfNeeded(node);
    this.triggerSmitomFreeNodeTipIfNeeded(node);
    this.triggerSmitomGlitchFormNodeTipIfNeeded(node);
    this.updateNavKeyHints();
  }

  private getChampionIconConfig(): { key: string; frame: string; scale: number; xOffset: number; yOffset: number } {
    try {
      const championId = this.config?.activeSkillTree?.championId;
      if (championId) {
        const key = ChampionUtils.getChampionSpriteKey(championId, (this.scene as BattleScene).gameData.gender);
        const scale = championId === "apollo" || championId === "diana" ? 1 : SkillTreeUiHandler.UI_CONSTANTS.ROOT_NODE.SCALE;
        const xOffset = this.getSkillTreeRootOffsetX(championId);
        const yOffset = this.getSkillTreeRootOffsetY(championId);
        if (this.scene.textures.exists(key)) {
          return {
            key: key,
            frame: "",
            scale: scale,
            xOffset: xOffset,
            yOffset: yOffset
          };
        }

        const def = CHAMPION_DEFINITIONS[championId];
        const trainerType = (def?.trainerType as unknown as TrainerType) ?? TrainerType.RIVAL;
        const cfg = trainerConfigs[trainerType];
        const isFemale = ((this.scene as BattleScene).gameData.gender === PlayerGender.FEMALE);
        const fallbackKey = cfg ? cfg.getSpriteKey(isFemale, false) : (isFemale ? "player_f" : "player_m");

        if (this.scene.textures.exists(fallbackKey)) {
          return {
            key: fallbackKey,
            frame: "",
            scale: scale,
            xOffset: xOffset,
            yOffset: yOffset
          };
        }
      }
    } catch (error) {
    }

    return { key: "smitems", frame: "permaMoreRevive", scale: SkillTreeUiHandler.UI_CONSTANTS.ROOT_NODE.FALLBACK_SCALE, xOffset: 0, yOffset: 0 };
  }

  private getSkillTreeRootOffsetX(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.skillTreeRootOffsetX;
      if (typeof offset === "number") return offset;
    } catch {}
    return 0;
  }

  private getSkillTreeRootOffsetY(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.skillTreeRootOffsetY;
      if (typeof offset === "number") return offset;
    } catch {}
    return 0;
  }

  private getSkillTreeTrainerBondScale(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const scale = def?.ui?.skillTreeTrainerBondScale;
      if (typeof scale === "number") return scale;
    } catch {}
    return 1.0;
  }

  private getSkillTreeTrainerBondOffsetX(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.skillTreeTrainerBondOffsetX;
      if (typeof offset === "number") return offset;
    } catch {}
    return 0;
  }

  private getSkillTreeTrainerBondOffsetY(championId: string): number {
    try {
      const def = CHAMPION_DEFINITIONS[championId] as any;
      const offset = def?.ui?.skillTreeTrainerBondOffsetY;
      if (typeof offset === "number") return offset;
    } catch {}
    return 0;
  }
  private getRarityColors(rarity: SkillTreeRarity): { border: number; bg: number } {
    switch (rarity) {
      case SkillTreeRarity.GREAT: return SkillTreeUiHandler.RARITY_COLORS.GREAT;
      case SkillTreeRarity.ULTRA: return SkillTreeUiHandler.RARITY_COLORS.ULTRA;
      case SkillTreeRarity.MASTER: return SkillTreeUiHandler.RARITY_COLORS.MASTER;
      case SkillTreeRarity.ROGUE: return SkillTreeUiHandler.RARITY_COLORS.ROGUE;
      case SkillTreeRarity.LEGENDARY: return SkillTreeUiHandler.RARITY_COLORS.LEGENDARY;
      case SkillTreeRarity.COMMON:
      default: return SkillTreeUiHandler.RARITY_COLORS.COMMON;
    }
  }

  private dimColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    const dimmedR = Math.floor(r * factor);
    const dimmedG = Math.floor(g * factor);
    const dimmedB = Math.floor(b * factor);

    return (dimmedR << 16) | (dimmedG << 8) | dimmedB;
  }

  private brightenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    const brightenedR = Math.min(255, Math.floor(r * factor));
    const brightenedG = Math.min(255, Math.floor(g * factor));
    const brightenedB = Math.min(255, Math.floor(b * factor));

    return (brightenedR << 16) | (brightenedG << 8) | brightenedB;
  }
  private getRarityText(rarity: SkillTreeRarity): string {
    if (!rarity) {
      return i18next.t("skillTree:rarityUnknown");
    }
    const rarityString = rarity.toString();
    return i18next.t(`championSelect:rarity.${rarityString}`, { defaultValue: rarityString.toUpperCase() });
  }

  private getSkillRarityFromNode(node: SkillTreeNode): SkillTreeRarity {
    return node.rarity ||
      (node.rewardData?.type ? getDisplayRarityForRewardType(node.rewardData.type) : SkillTreeRarity.COMMON);
  }

  private calculateTooltipDimensions(node: SkillTreeNode): { width: number; height: number } {
    const c = SkillTreeUiHandler.UI_CONSTANTS.TOOLTIP;
    const scaleX = Math.max(
      this.tooltipDesc.scaleX || 1,
      this.tooltipPrereq.scaleX || 1,
      this.tooltipCost.scaleX || 1
    );

    const initialWrapWidth = c.MAX_WIDTH - c.PADDING * 2;
    const wrapWidthPreScale = Math.max(0, initialWrapWidth / scaleX);

    const descLineSpacing = this.tooltipDesc.lineSpacing;
    const prereqLineSpacing = this.tooltipPrereq.lineSpacing;

    this.tooltipDesc.setStyle({
      ...this.tooltipDesc.style,
      wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
    });
    this.tooltipDesc.setLineSpacing(descLineSpacing);

    if (this.tooltipPrereq.text) {
      this.tooltipPrereq.setStyle({
        ...this.tooltipPrereq.style,
        wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
      });
      this.tooltipPrereq.setLineSpacing(prereqLineSpacing);
    }
    const titleWidth = this.tooltipTitle.displayWidth;
    const rarityWidth = this.tooltipRarity.visible ? this.tooltipRarity.displayWidth : 0;
    const titleLineWidth = titleWidth + rarityWidth + (rarityWidth > 0 ? 8 : 0);
    const descWidth = this.tooltipDesc.displayWidth;
    const costWidth = this.tooltipCost.displayWidth;
    const prereqWidth = this.tooltipPrereq.text ? this.tooltipPrereq.displayWidth : 0;

    const contentWidth = Math.max(titleLineWidth, descWidth, costWidth, prereqWidth);
    const tooltipWidth = Math.min(c.MAX_WIDTH, Math.max(c.MIN_WIDTH, contentWidth + c.PADDING * 2));

    if (tooltipWidth !== c.MAX_WIDTH) {
      const finalWrapWidth = tooltipWidth - c.PADDING * 2;
      const finalWrapWidthPreScale = Math.max(0, finalWrapWidth / scaleX);

      this.tooltipDesc.setStyle({
        ...this.tooltipDesc.style,
        wordWrap: { width: finalWrapWidthPreScale, useAdvancedWrap: true }
      });
      this.tooltipDesc.setLineSpacing(descLineSpacing);

      if (this.tooltipPrereq.text) {
        this.tooltipPrereq.setStyle({
          ...this.tooltipPrereq.style,
          wordWrap: { width: finalWrapWidthPreScale, useAdvancedWrap: true }
        });
        this.tooltipPrereq.setLineSpacing(prereqLineSpacing);
      }
    }
    const barsHeight = c.TITLE_BAR_HEIGHT + c.RARITY_BAR_HEIGHT;
    const descHeight = this.tooltipDesc.displayHeight;
    const costHeight = this.tooltipCost.displayHeight;
    const prereqHeight = this.tooltipPrereq.text ? this.tooltipPrereq.displayHeight : 0;

    const contentHeight = descHeight + costHeight + prereqHeight +
                         (prereqHeight > 0 ? c.TEXT_SPACING * 2 : c.TEXT_SPACING);
    const tooltipHeight = barsHeight + contentHeight + c.PADDING * 2;

    return { width: tooltipWidth, height: tooltipHeight };
  }

  private repositionTextElements(tooltipWidth: number): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.TOOLTIP;

    this.tooltipTitle.setPosition(tooltipWidth / 2, c.TITLE_TEXT_Y + 2);
    this.tooltipTitle.setOrigin(0.5, 0.5);
    this.tooltipRarity.setPosition(tooltipWidth / 2, c.RARITY_TEXT_Y);
    let currentY = c.CONTENT_Y + 2;
    this.tooltipDesc.setPosition(c.PADDING + 1, currentY);
    currentY += this.tooltipDesc.displayHeight + c.TEXT_SPACING;

    this.tooltipCost.setPosition(c.PADDING + 1, currentY);
    currentY += this.tooltipCost.displayHeight + c.TEXT_SPACING;

    if (this.tooltipPrereq.text) {
      this.tooltipPrereq.setPosition(c.PADDING + 1, currentY);
    }
  }

  private getNodeIconConfig(node: SkillTreeNode): { key: string; frame: string; scale: number; inverted?: boolean; xOffset?: number; yOffset?: number } {

    if (node.id === "root_0" || node.depth === 0) {
      return this.getChampionIconConfig();
    }

    switch (node.rewardData?.type) {
      case SkillTreeRewardType.TM_FILTERED:
        return { key: "items", frame: "tm_normal", scale: 2.0 };
      case SkillTreeRewardType.XM_FILTERED:
        return { key: "smitems", frame: "glitchTm", scale: 1.0 };
      case SkillTreeRewardType.ABILITY_GRANT:
        return { key: "smitems", frame: "glitchAbilitySwitch", scale: 1.0 };
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        return { key: "smitems", frame: "modPassiveAbility", scale: 1.0 };
      case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
        const championId = this.config?.activeSkillTree?.championId;
        const key = ChampionUtils.getChampionSpriteKey(championId, (this.scene as BattleScene).gameData.gender);
        const scale = this.getSkillTreeTrainerBondScale(championId);
        const xOffset = this.getSkillTreeTrainerBondOffsetX(championId);
        const yOffset = this.getSkillTreeTrainerBondOffsetY(championId);
        return { key: key, frame: "", scale: scale, xOffset: xOffset, yOffset: yOffset, inverted: true };
      }
      case SkillTreeRewardType.TERA_ABILITY:
        return { key: "items", frame: "stellar_tera_shard", scale: 2.0, inverted: true };
      case SkillTreeRewardType.SMITTY_ABILITY:
        return { key: "smitems", frame: "smittyMask", scale: 1.0 };
      case SkillTreeRewardType.SIGNATURE_POKEMON:
        return { key: "smitems", frame: "draftMode", scale: 1.0, inverted: true };
      case SkillTreeRewardType.GENERAL_POKEMON:
        return { key: "smitems", frame: "draftMode", scale: 1.0 };

      case SkillTreeRewardType.LEGENDARY_POKEMON:
        try {
          const species = node.rewardData?.data?.species;
          if (species && typeof species === "number") {
            const pokemonSpecies = getPokemonSpecies(species);
            if (pokemonSpecies) {
              return {
                key: pokemonSpecies.getIconAtlasKey(),
                frame: pokemonSpecies.getIconId(false),
                scale: 2.0
              };
            }
          }
        } catch (error) {

        }
        return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.STAT_BOOST:
        return { key: "items", frame: "protein", scale: 2.0 };
      case SkillTreeRewardType.MOVE_UPGRADE:
        return { key: "smitems", frame: "smittyShard", scale: 1.0 };
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
        return { key: "smitems", frame: "smittyHumor", scale: 1.0 };
      case SkillTreeRewardType.ESSENCE_BUNDLE:
        return { key: "smitems", frame: "modSoulCollected", scale: 1.0 };
      case SkillTreeRewardType.PERMA_ITEM:
        try {
          const permaType = node.rewardData?.data?.permaType;
          if (permaType !== undefined && permaType !== null && typeof permaType === 'string') {
            const iconKey = permaType.toLowerCase()
              .split('_')
              .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
              .join('')
              .replace(/\d+$/, '');
            return { key: "smitems", frame: iconKey, scale: 1.0 };
          }
        } catch (error) {

        }
        return { key: "smitems", frame: "permaMetronomeLevelup", scale: 1.0 };
      case SkillTreeRewardType.PERMA_MONEY:
        return { key: "smitems", frame: "permaMoney", scale: 1.0 };
      case SkillTreeRewardType.MONEY_REWARD:
        return { key: "items", frame: "relic_gold", scale: 2.0 };
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
        try {
          const formKey = node.rewardData?.data?.formKey;
          const questId = node.rewardData?.data?.unlockableId as QuestUnlockables;
          if (formKey && typeof formKey === "string" && questId) {

            const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(questId);
            const species = getPokemonSpecies(questUnlockData.rewardId as Species);
            const form = species.forms?.find(f => f.formName?.toLowerCase() === formKey.toLowerCase());

            if (form) {
              return {
                key: form.getIconAtlasKey(),
                frame: form.getIconId(false),
                scale: 2.0
              };
            }
          }
        } catch (error) {

        }
        return { key: "smitems", frame: "glitchModSoul", scale: 1.0 };
      case SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN:
        return { key: "smitems", frame: "glitchModSoul", scale: 1.0 };
      case SkillTreeRewardType.SKILL_POINTS:
        return { key: "items", frame: "ribbon_gen9", scale: 2.0 };
      case SkillTreeRewardType.SKILL_TREE_TOKENS:
        return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
        try {
          const type = node.rewardData?.data?.type;
          if (type !== undefined && typeof type === "number") {
            const itemName = getAttackTypeBoosterItemName(type as Type);
            if (itemName) {
              const frame = itemName.replace(/[ \-]/g, "_").toLowerCase();
              return { key: "items", frame, scale: 2.0 };
            }
          }
        } catch (error) {

        }
        return { key: "items", frame: "silk_scarf", scale: 2.0 };
      case SkillTreeRewardType.GOLDEN_POKEBALL:
        return { key: "items", frame: "pb_gold", scale: 2.0 };
      case SkillTreeRewardType.MASTER_BALL:
        return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.VOID_BALL:
        return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.TYPE_BALL_FILTERED:
        return { key: "items", frame: "gb", scale: 2.0 };
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
        return { key: "items", frame: "rb", scale: 2.0 };
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
        return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.EGG_VOUCHER:
        try {
          const tier = node.rewardData?.data?.tier;
          if (tier !== undefined) {
            const frame = getVoucherTypeIcon(tier as VoucherType);
            return { key: "items", frame, scale: 2.0 };
          }
        } catch (error) {
          console.warn("Failed to get voucher tier icon:", error);
        }
        return { key: "items", frame: "coupon", scale: 2.0 };
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT:

        return { key: "smitems", frame: "modSoulCollected", scale: 1.0, inverted: true };
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY:
        return { key: "items", frame: "dna_splicers", scale: 2.0 };
      case SkillTreeRewardType.CATCH_RATE_BONUS:
        return { key: "smitems", frame: "permaCatchRate", scale: 1.0 };
      case SkillTreeRewardType.REVIVE_BOOST:
        return { key: "items", frame: "revive", scale: 2.0 };
      case SkillTreeRewardType.TERA_TYPE:
        try {
          const teraType = node.rewardData?.data?.type;
          if (teraType !== undefined && typeof teraType === "number") {
            const typeName = Type[teraType]?.toLowerCase();
            if (typeName) {
              return { key: "items", frame: `${typeName}_tera_shard`, scale: 2.0 };
            }
          }
        } catch (error) {
          console.warn("Failed to get tera type icon:", error);
        }
        return { key: "items", frame: "stellar_tera_shard", scale: 2.0 };
      case SkillTreeRewardType.GLITCH_CHANGE:
        return { key: "smitems", frame: "glitchFruit", scale: 1.0};
      case SkillTreeRewardType.MEGA_STONE:
        const megaStone = node.rewardData?.data?.megaStone || node.rewardData?.data?.formChangeItem;
        if (megaStone && typeof megaStone === "number") {
          const megaStoneName = getFormChangeItemSpriteFrame(megaStone);
          if (megaStoneName) {
            return { key: "items", frame: megaStoneName, scale: 2.0 };
          }
        }
        return { key: "items", frame: "pinsirite", scale: 2.0 };
      case SkillTreeRewardType.POKEMON_ALT_BUILD:
        return { key: "smitems", frame: "permaCheaperFusions", scale: 1.0, inverted: true };
      case SkillTreeRewardType.DYNA_MUSHROOM:
        return { key: "items", frame: "max_mushrooms", scale: 2.0 };
      case SkillTreeRewardType.TYPE_SWITCHER:

        return { key: "smitems", frame: "glitchTypeSwitch", scale: 1.0 };
      case SkillTreeRewardType.HEALING_ITEMS:
        return { key: "items", frame: "max_potion", scale: 2.0 };
      case SkillTreeRewardType.MEMORY_MUSHROOM:
        return { key: "items", frame: "big_mushroom", scale: 2.0 };
      case SkillTreeRewardType.BERRY_ITEMS:
        return { key: "items", frame: "sitrus_berry", scale: 2.0 };
      case SkillTreeRewardType.ABILITY_SWITCHER:
        return { key: "smitems", frame: "glitchAbilitySwitch", scale: 1.0 };
      case SkillTreeRewardType.GENERAL_ITEMS:
        return { key: "smitems", frame: "permaShowRewards", scale: 1.0 };
      case SkillTreeRewardType.BATON_ITEM:
        return { key: "items", frame: "baton", scale: 2.15 };
      case SkillTreeRewardType.PP_MAX_ITEM:
        return { key: "items", frame: "pp_max", scale: 2.0 };
      case SkillTreeRewardType.ROGUE_BALL:
        return { key: "items", frame: "rb", scale: 2.0 };
      case SkillTreeRewardType.PARTY_ABILITY_GRANT:
        return { key: "smitems", frame: "permaPartyAbility", scale: 1.0 };
      case SkillTreeRewardType.BOUNTY_SELECT:
        return { key: "smitems", frame: "quest", scale: 1.0 };
      default:
        return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };
    }
  }

  private updateNodeVisual(node: SkillTreeNode): void {
    const c = this.nodeSprites.get(node.id); if (!c) return;
    const previousState = (node as any).__previousState as SkillTreeNodeState;

    const bg = c.list[0] as Phaser.GameObjects.Graphics;
    const icon = c.list[1] as Phaser.GameObjects.Sprite;
    const nodeRarity = this.getSkillRarityFromNode(node);
    const rarityColors = this.getRarityColors(nodeRarity);

    bg.clear();
    switch (node.state) {
      case SkillTreeNodeState.UNLOCKED:

        const unlockedIconCfg = this.getNodeIconConfig(node);
        try {
          if (unlockedIconCfg.frame) {
            icon.setTexture(unlockedIconCfg.key, unlockedIconCfg.frame as any);
          } else {
            icon.setTexture(unlockedIconCfg.key);
          }
          icon.setScale(unlockedIconCfg.scale);
          icon.setPosition(unlockedIconCfg.xOffset ?? 0, unlockedIconCfg.yOffset ?? 0);
          if (unlockedIconCfg.inverted) {
            if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {

              icon.postFX.clear();
              const colorMatrix = icon.postFX.addColorMatrix();
              colorMatrix.negative();
            }
          } else {

            if (icon.postFX) {
              icon.postFX.clear();
            }
          }
        } catch (error) {
          console.warn("Failed to restore unlocked icon:", error);
        }
        bg.fillStyle(rarityColors.border);
        bg.lineStyle(3, this.brightenColor(rarityColors.border, 1.3));
        icon.clearTint();
        if (node.rewardData?.type === SkillTreeRewardType.VOID_BALL) {
          applyVoidBallRecolor(this.scene as BattleScene, icon, true);
        } else if (node.rewardData?.type === SkillTreeRewardType.TYPE_BALL_FILTERED && node.rewardData?.data?.ballType !== undefined) {
          applyTypeBallRecolor(this.scene as BattleScene, icon, node.rewardData.data.ballType as Type, true);
        }

        break;
      case SkillTreeNodeState.LOCKED_DETAILS:
        if (node.isLevelLocked && node.branchUnlockCost != null) {
          const detailsIconCfg = { key: "items", frame: "ribbon_gen9", scale: 2.0, xOffset: 0, yOffset: 0, inverted: false };
          try {
            if (detailsIconCfg.frame) {
              icon.setTexture(detailsIconCfg.key, detailsIconCfg.frame as any);
            } else {
              icon.setTexture(detailsIconCfg.key);
            }
            icon.setScale(detailsIconCfg.scale);
            icon.setPosition(detailsIconCfg.xOffset ?? 0, (detailsIconCfg.yOffset ?? 0) - 4);
            if (detailsIconCfg.inverted) {
              if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
                icon.postFX.clear();
                const colorMatrix = icon.postFX.addColorMatrix();
                colorMatrix.negative();
              }
            } else {
              if (icon.postFX) {
                icon.postFX.clear();
              }
            }
          } catch { }
          bg.fillStyle(0x3a2a00);
          bg.lineStyle(3, 0xFFCB05);
          icon.setTint(0xcccccc);
          let spLabel = c.list.find((child: any) => child?.name === "lockLabel") as Phaser.GameObjects.Text | undefined;
          if (!spLabel) {
            spLabel = (this.scene as any).add.text(0, 18, "", { fontSize: "32px", fontFamily: "pkmnems", color: "#FFFFFF", align: "center", stroke: "#000000", strokeThickness: 4 });
            spLabel.setOrigin(0.5);
            spLabel.name = "lockLabel";
            c.add(spLabel);
          }
          spLabel.setStyle({ fontSize: "32px", fontFamily: "pkmnems", color: "#FFFFFF", align: "center", stroke: "#000000", strokeThickness: 4 });
          spLabel.setOrigin(0.5);
          spLabel.setPosition(0, 18);
          spLabel.setText(`x${node.branchUnlockCost}`);
          spLabel.setVisible(true);
          break;
        }
        const dependenciesMet = this.areNodeDependenciesMet(node);
        if (dependenciesMet) {

          const detailsIconCfg = this.getNodeIconConfig(node);
          try {
            if (detailsIconCfg.frame) {
              icon.setTexture(detailsIconCfg.key, detailsIconCfg.frame as any);
            } else {
              icon.setTexture(detailsIconCfg.key);
            }
            icon.setScale(detailsIconCfg.scale);
            icon.setPosition(detailsIconCfg.xOffset ?? 0, detailsIconCfg.yOffset ?? 0);
            if (detailsIconCfg.inverted) {
              if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {

                icon.postFX.clear();
                const colorMatrix = icon.postFX.addColorMatrix();
                colorMatrix.negative();
              }
            } else {

              if (icon.postFX) {
                icon.postFX.clear();
              }
            }
          } catch (error) {
            console.warn("Failed to restore details icon:", error);
          }
          if (nodeRarity > SkillTreeRarity.GREAT) {

            bg.fillStyle(this.dimColor(rarityColors.border, 0.5));
            bg.lineStyle(3, rarityColors.border);
          } else {

            bg.fillStyle(0x665200);
            bg.lineStyle(3, 0xFFCB05);
          }
          icon.setTint(0xcccccc);
          if (node.rewardData?.type === SkillTreeRewardType.VOID_BALL) {
            applyVoidBallRecolor(this.scene as BattleScene, icon, true);
          } else if (node.rewardData?.type === SkillTreeRewardType.TYPE_BALL_FILTERED && node.rewardData?.data?.ballType !== undefined) {
            applyTypeBallRecolor(this.scene as BattleScene, icon, node.rewardData.data.ballType as Type, true);
          }
        } else {
          bg.fillStyle(0x444444);
          bg.lineStyle(3, 0x666666);
          icon.setTint(0x888888);
        }
        break;
      case SkillTreeNodeState.LOCKED_VISIBLE:
        if (node.isLevelLocked && node.requiredUnlockLevel != null) {
          const iconCfg = this.getNodeIconConfig(node);
          try {
            if (iconCfg.frame) {
              icon.setTexture(iconCfg.key, iconCfg.frame as any);
            } else {
              icon.setTexture(iconCfg.key);
            }
            icon.setScale(iconCfg.scale);
            icon.setPosition(iconCfg.xOffset ?? 0, (iconCfg.yOffset ?? 0) - 8);
            if (iconCfg.inverted) {
              if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
                icon.postFX.clear();
                const colorMatrix = icon.postFX.addColorMatrix();
                colorMatrix.negative();
              }
            } else {
              if (icon.postFX) {
                icon.postFX.clear();
              }
            }
          } catch { }
          bg.fillStyle(0x3a2a00);
          bg.lineStyle(3, 0x806000);
          if (node.rewardData?.type === SkillTreeRewardType.VOID_BALL) {
            applyVoidBallRecolor(this.scene as BattleScene, icon, true);
          } else if (node.rewardData?.type === SkillTreeRewardType.TYPE_BALL_FILTERED && node.rewardData?.data?.ballType !== undefined) {
            applyTypeBallRecolor(this.scene as BattleScene, icon, node.rewardData.data.ballType as Type, true);
          }
          icon.setTint(0x666666);

          const showLevelLabel = !this.currentFocusPreviewNodes.has(node.id) &&
            (node.id === this.selectedNodeId || node.id === this.focusPreviewAnchorId);
          if (!showLevelLabel) {
            const existingLabel = c.list.find((child: any) => child?.name === "lockLabel") as Phaser.GameObjects.Text | undefined;
            if (existingLabel) {
              existingLabel.setVisible(false);
            }
            break;
          }

          let lockLabel = c.list.find((child: any) => child?.name === "lockLabel") as Phaser.GameObjects.Text | undefined;
          if (!lockLabel) {
            lockLabel = (this.scene as any).add.text(0, 16, "", { fontSize: "20px", fontFamily: "pkmnems", color: "#FFD700", align: "center", stroke: "#000000", strokeThickness: 3 });
            lockLabel.setOrigin(0.5);
            lockLabel.name = "lockLabel";
            c.add(lockLabel);
          }
          lockLabel.setStyle({ fontSize: "20px", fontFamily: "pkmnems", color: "#FFD700", align: "center", stroke: "#000000", strokeThickness: 3 });
          lockLabel.setOrigin(0.5);
          lockLabel.setPosition(0, 16);
          lockLabel.setText(`Lvl ${node.requiredUnlockLevel}`);
          lockLabel.setVisible(true);
          break;
        }
        if (isSkillTreeV2()) {
          const iconCfg = this.getNodeIconConfig(node);
          try {
            if (iconCfg.frame) {
              icon.setTexture(iconCfg.key, iconCfg.frame as any);
            } else {
              icon.setTexture(iconCfg.key);
            }
            icon.setScale(iconCfg.scale);
            icon.setPosition(iconCfg.xOffset ?? 0, iconCfg.yOffset ?? 0);
            if (iconCfg.inverted) {
              if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
                icon.postFX.clear();
                const colorMatrix = icon.postFX.addColorMatrix();
                colorMatrix.negative();
              }
            } else {
              if (icon.postFX) {
                icon.postFX.clear();
              }
            }
          } catch (error) {
          }
          bg.fillStyle(0x333333);
          bg.lineStyle(3, 0x555555);
          icon.setTint(0x666666);
          if (node.rewardData?.type === SkillTreeRewardType.VOID_BALL) {
            applyVoidBallRecolor(this.scene as BattleScene, icon, true);
          } else if (node.rewardData?.type === SkillTreeRewardType.TYPE_BALL_FILTERED && node.rewardData?.data?.ballType !== undefined) {
            applyTypeBallRecolor(this.scene as BattleScene, icon, node.rewardData.data.ballType as Type, true);
          }
          if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
            let glitchLabel = c.list.find((child: any) => child?.name === "glitchPrereqLabel") as Phaser.GameObjects.Text | undefined;
            if (!glitchLabel) {
              glitchLabel = (this.scene as any).add.text(0, 18, "", { fontSize: "32px", fontFamily: "pkmnems", color: "#FFFFFF", align: "center", stroke: "#000000", strokeThickness: 4 });
              glitchLabel.setOrigin(0.5);
              glitchLabel.name = "glitchPrereqLabel";
              c.add(glitchLabel);
            }
            const ast = this.config?.activeSkillTree;
            const eligible = ast ? this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast) : 0;
            const baseline = ast ? this.ensureRandomGlitchFormsBaseline(ast, node.id, eligible) : 0;
            const required = ast ? this.getRandomGlitchFormsRequiredCount(ast, node.id) : 5;
            const remaining = Math.max(0, required - Math.max(0, eligible - baseline));
            glitchLabel.setText(`x${remaining}`);
            glitchLabel.setVisible(true);
          }
        } else {
          bg.fillStyle(0x444444);
          bg.lineStyle(3, 0x666666);
          try {
            icon.setTexture("smitems", "permaMoreRewardChoice");
            icon.setScale(1.0);
            icon.setTint(0x888888);
            icon.setPosition(0, 0);
            if (icon.postFX) {
              icon.postFX.clear();
            }
          } catch {
            icon.setTint(0x888888);
          }
        }
        break;
      case SkillTreeNodeState.LOCKED_HIDDEN:
        bg.fillStyle(0x444444);
        bg.lineStyle(3, 0x666666);
        try {
          if (this.scene.textures.exists("ui")) {
            icon.setTexture("ui", "lock" as any);
            icon.setScale(0.5);
          } else {
            icon.setTexture("smitems", "glitchPiece");
            icon.setScale(0.045);
          }
        } catch { icon.setTexture("smitems", "glitchPiece"); icon.setScale(0.045); }
        icon.setTint(0x888888);
        icon.setPosition(0, 0);
        if (icon.postFX) {
          icon.postFX.clear();
        }
        break;
    }
    if (!node.isLevelLocked) {
      const existingLabel = c.list.find((child: any) => child?.name === "lockLabel") as Phaser.GameObjects.Text | undefined;
      if (existingLabel) existingLabel.setVisible(false);
    }
    if (node.state !== SkillTreeNodeState.LOCKED_VISIBLE || node.rewardData?.type !== SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
      const existingGlitchLabel = c.list.find((child: any) => child?.name === "glitchPrereqLabel") as Phaser.GameObjects.Text | undefined;
      if (existingGlitchLabel) existingGlitchLabel.setVisible(false);
    }

    bg.fillCircle(0, 0, this.NODE_SIZE / 2);
    bg.strokeCircle(0, 0, this.NODE_SIZE / 2);
    if ((node as any).isLegendary) {

      if (node.state === SkillTreeNodeState.UNLOCKED || node.state === SkillTreeNodeState.LOCKED_DETAILS) {
        bg.lineStyle(5, 0xFFD700);
        bg.strokeCircle(0, 0, (this.NODE_SIZE / 2) + 3);
      } else {

        bg.lineStyle(5, 0x666666);
        bg.strokeCircle(0, 0, (this.NODE_SIZE / 2) + 3);
      }
    }
    if (node.id === this.selectedNodeId) {
      bg.lineStyle(4, 0x00ffff);
      bg.strokeCircle(0, 0, (this.NODE_SIZE / 2) + 6);
    }
    if (previousState && previousState !== node.state) {
      this.playStateTransitionEffect(node, previousState, node.state);
    }
    (node as any).__previousState = node.state;
  }

  private unlockLevelLockedNodes(ast: any): void {
    if (!ast) return;
    const sorted = [...this.nodes].sort((a, b) => a.depth - b.depth);
    for (const node of sorted) {
      if (!node.isLevelLocked || node.depth < 3) continue;
      const parents = (node.dependencies || [])
        .map((id: string) => this.nodes.find(n => n.id === id))
        .filter((p: any): p is SkillTreeNode => p != null);
      if (parents.some((p: SkillTreeNode) => !p.isLevelLocked)) {
        node.isLevelLocked = false;
        if (node.pendingRewardData) {
          node.rewardData = node.pendingRewardData;
          delete node.pendingRewardData;
        }
        delete node.branchUnlockCost;
      }
    }
  }

  private isAdjacentToUnlocked(node: any, ast: any): boolean {
    if (!ast?.unlockedNodes) return false;
    const unlockedSet = ast.unlockedNodes instanceof Set ? ast.unlockedNodes : new Set(ast.unlockedNodes);
    if (node.depth === 2 && node.isLevelLocked) {
      return this.isRingAngularNeighbor(node);
    }
    for (const depId of (node.dependencies || [])) {
      if (unlockedSet.has(depId)) return true;
    }
    for (const other of this.nodes) {
      if (!unlockedSet.has(other.id)) continue;
      if ((other.dependencies || []).includes(node.id)) return true;
    }
    return false;
  }

  private isRingAngularNeighbor(node: SkillTreeNode): boolean {
    if (node.ringIndex == null || node.depth !== 2) return false;
    const ring = this.nodes.filter(n => n.depth === 2 && n.ringIndex != null);
    const ringSize = node.ringSize ?? ring.length;
    const opened = ring.filter(r => !r.isLevelLocked);
    return opened.some(o => {
      if (o.ringIndex == null) return false;
      const d = Math.abs(node.ringIndex! - o.ringIndex!);
      return Math.min(d, ringSize - d) === 1;
    });
  }

  private updateNodeStatesAndRender(): void {
    if (!this.config) return;
    const ast = this.config.activeSkillTree;

    if (this.isEnhancedDebugMode) {
      this.currentFocusPreviewNodes.clear();
      this.nodes.forEach(node => {
        if (node.state !== SkillTreeNodeState.UNLOCKED) {
          node.state = SkillTreeNodeState.LOCKED_DETAILS;
        }
      });

      this.nodes.forEach(node => {
        this.updateNodeVisual(node);
      });

      this.applyDepthFilter();
      return;
    }

    this.unlockLevelLockedNodes(ast);

    if (ast.unlockedBranches && ast.unlockedBranches.size > 0) {
      for (const node of this.nodes) {
        if (node.isLevelLocked && ast.unlockedBranches.has(node.id)) {
          node.isLevelLocked = false;
          node.cost = 0;
          if (node.pendingRewardData) {
            node.rewardData = node.pendingRewardData;
            delete node.pendingRewardData;
          }
        }
      }
      if (ast.unlockedBranches.size > 0) {
        for (const n of this.nodes) {
          if (n.isLevelLocked && n.branchUnlockCost != null && n.branchUnlockCost < 4) {
            n.branchUnlockCost = 4;
          }
        }
      }
    }

    const childrenMap = new Map<string, string[]>();
    this.nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        if (!childrenMap.has(depId)) {
          childrenMap.set(depId, []);
        }
        childrenMap.get(depId)!.push(node.id);
      });
    });
    this.nodes.forEach(node => {
      if (node.state !== SkillTreeNodeState.UNLOCKED) {
        node.state = SkillTreeNodeState.LOCKED_HIDDEN;
      }
    });
    this.nodes.forEach(node => {
      if (ast.unlockedNodes?.has(node.id)) {
        node.state = SkillTreeNodeState.UNLOCKED;
        node.unlocked = true;
      }
    });
    const depthVisibleNodes = new Set<string>();
    this.nodes.forEach(node => {
      if (node.depth <= (ast.maxVisibleDepth || 0) && node.state !== SkillTreeNodeState.UNLOCKED) {
        depthVisibleNodes.add(node.id);
      }
    });
    const dependencyVisibleNodes = new Set<string>();
    const rootNode = this.nodes.find(n => n.depth === 0);
    if (rootNode && rootNode.state !== SkillTreeNodeState.UNLOCKED) {
      dependencyVisibleNodes.add(rootNode.id);
    }
    this.nodes.forEach(node => {
      if ((node.depth === 1 || node.depth === 2) && node.state !== SkillTreeNodeState.UNLOCKED) {
        dependencyVisibleNodes.add(node.id);
      }
    });
    this.nodes.forEach(unlockedNode => {
      if (unlockedNode.state === SkillTreeNodeState.UNLOCKED) {
        const children = childrenMap.get(unlockedNode.id) || [];
        children.forEach(childId => {
          const childNode = this.nodes.find(n => n.id === childId);
          if (childNode && childNode.state === SkillTreeNodeState.LOCKED_HIDDEN) {
            dependencyVisibleNodes.add(childId);
          }
        });
      }
    });

    if (isSkillTreeV2()) {
      this.updateNodeStatesV2(ast, childrenMap);
      this.ensureRenderedForVisibleNodes();
      this.nodes.forEach(node => this.updateNodeVisual(node));
      this.applyDepthFilter();
      if (this.selectedNodeId) {
        this.updateFocusHighlight(this.selectedNodeId);
      } else {
        this.clearDependencyHighlights();
      }
      return;
    }
    const allVisibleNodes = new Set([...depthVisibleNodes, ...dependencyVisibleNodes]);
    this.nodes.forEach(node => {
      if (node.state === SkillTreeNodeState.UNLOCKED) {

        return;
      }

      if (allVisibleNodes.has(node.id)) {
        let dependenciesMet = false;
        if (node.dependencies.length === 0) {
          dependenciesMet = true;
        } else if ((node as any).requiresAllDependencies) {

          dependenciesMet = node.dependencies.every(depId =>
            ast.unlockedNodes?.has(depId)
          );
        } else {

          dependenciesMet = node.dependencies.some(depId =>
            ast.unlockedNodes?.has(depId)
          );
        }
        if (!dependenciesMet && (node.depth === 0 || node.depth === 1 || node.depth === 2)) {

          if (node.depth === 0) {
            dependenciesMet = true;
          }

          else if (node.depth === 1) {
            const hasOnlyRootDependency = node.dependencies.length === 1 &&
              this.nodes.some(n => n.depth === 0 && node.dependencies.includes(n.id));
            if (hasOnlyRootDependency) {
              dependenciesMet = true;
            }
          }

          else if (node.depth === 2) {
            const allDepsAreInitial = node.dependencies.every(depId => {
              const depNode = this.nodes.find(n => n.id === depId);
              return depNode && (depNode.depth === 0 || depNode.depth === 1);
            });
            if (allDepsAreInitial) {
              dependenciesMet = true;
            }
          }
        }

        if (dependenciesMet) {
          node.state = SkillTreeNodeState.LOCKED_DETAILS;
        } else {
          node.state = SkillTreeNodeState.LOCKED_VISIBLE;
        }
      } else {
        node.state = SkillTreeNodeState.LOCKED_HIDDEN;
      }
    });
    this.nodes.forEach(node => {
      this.updateNodeVisual(node);
    });

    this.applyDepthFilter();
  }

  private getForwardPreviewNodesByHops(
    anchorId: string,
    maxHops: number,
    childrenMap: Map<string, string[]>,
    shouldSkipNode: (node: SkillTreeNode) => boolean
  ): Set<string> {
    const result = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; hops: number }> = [];
    visited.add(anchorId);
    queue.push({ id: anchorId, hops: 0 });
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.hops >= maxHops) {
        continue;
      }
      const children = childrenMap.get(current.id) || [];
      for (const childId of children) {
        if (visited.has(childId)) {
          continue;
        }
        visited.add(childId);
        const child = this.nodes.find(n => n.id === childId);
        if (!child) {
          continue;
        }
        if (shouldSkipNode(child)) {
          continue;
        }
        result.add(childId);
        queue.push({ id: childId, hops: current.hops + 1 });
      }
    }
    return result;
  }

  private updateNodeStatesV2(ast: ActiveSkillTreeData, childrenMap: Map<string, string[]>): void {
    const revealedNodes = new Set<string>();
    const focusPreviewNodes = new Set<string>();
    const rootNode = this.nodes.find(n => n.depth === 0);
    if (rootNode && rootNode.state !== SkillTreeNodeState.UNLOCKED) {
      revealedNodes.add(rootNode.id);
    }
    const isPokemonSelectionMode = this.config?.mode === SkillTreeMode.POKEMON_SELECTION;
    const picksCount = ast.selectedPokemonPicks?.length ?? 0;
    const isJourneyTree = this.nodes.some(n => n.id?.startsWith("depth1_journey_mystery_"));
    const journeyPrimaryUnlocked = isJourneyTree ? this.nodes.filter(n =>
      n.id?.match(/^depth1_journey_mystery_[012]$/) &&
      n.state === SkillTreeNodeState.UNLOCKED
    ).length : 0;

    const shouldHideMysteryNode = (node: any): boolean => {
      if (!isPokemonSelectionMode || !node.rewardData?.data?.starterMysteryNode) return false;
      if (isJourneyTree) {
        if (node.id === "depth1_journey_mystery_3") {
          return journeyPrimaryUnlocked < 2;
        }
        return false;
      }
      return picksCount < 1;
    };

    const isHiddenPreSelectionNode = (node: SkillTreeNode): boolean =>
      isPokemonSelectionMode && !this._selectionComplete &&
      (!!node.rewardData?.data?.starterGlitchRunNode || !!node.rewardData?.data?.bountyNode);

    this.nodes.forEach(node => {
      if ((node.depth === 0 || node.depth === 1) && node.state !== SkillTreeNodeState.UNLOCKED) {
        if (shouldHideMysteryNode(node)) {
          return;
        }
        if (isHiddenPreSelectionNode(node)) {
          return;
        }
        revealedNodes.add(node.id);
      }
    });
    this.nodes.forEach(node => {
      if (node.depth === 2 && node.state !== SkillTreeNodeState.UNLOCKED) {
        if (shouldHideMysteryNode(node)) {
          return;
        }
        if (isHiddenPreSelectionNode(node)) {
          return;
        }
        revealedNodes.add(node.id);
      }
    });
    this.nodes.forEach(unlockedNode => {
      if (unlockedNode.state === SkillTreeNodeState.UNLOCKED) {
        const maxRevealDepth = unlockedNode.depth + 2;
        const connectedNodes = this.getConnectedNodesWithinDepthV2(unlockedNode.id, maxRevealDepth, childrenMap);
        connectedNodes.forEach(nodeId => {
          const node = this.nodes.find(n => n.id === nodeId);
          if (node && node.state === SkillTreeNodeState.LOCKED_HIDDEN) {
            if (shouldHideMysteryNode(node)) {
              return;
            }
            if (isHiddenPreSelectionNode(node)) {
              return;
            }
            revealedNodes.add(nodeId);
          }
        });
      }
    });

    this.currentFocusPreviewNodes.clear();
    const selectedId = this.selectedNodeId;
    const anchorId = this.focusPreviewAnchorId ?? selectedId;
    if (selectedId) {
      const selNode = this.nodes.find(n => n.id === selectedId);
      if (!selNode || (!shouldHideMysteryNode(selNode) && !isHiddenPreSelectionNode(selNode))) {
        revealedNodes.add(selectedId);
      }
    }
    if (anchorId) {
      const ancNode = this.nodes.find(n => n.id === anchorId);
      if (!ancNode || (!shouldHideMysteryNode(ancNode) && !isHiddenPreSelectionNode(ancNode))) {
        revealedNodes.add(anchorId);
      }
      const anchorNode = this.nodes.find(n => n.id === anchorId);
      if (anchorNode && anchorNode.depth > 1) {
        const baselineRevealed = new Set(revealedNodes);
        const previewIds = this.getForwardPreviewNodesByHops(
          anchorId,
          SkillTreeUiHandler.FOCUS_PREVIEW_HOPS,
          childrenMap,
          (n: SkillTreeNode): boolean => {
            if (shouldHideMysteryNode(n)) {
              return true;
            }
            if (isHiddenPreSelectionNode(n)) {
              return true;
            }
            return false;
          }
        );
        previewIds.forEach(id => {
          revealedNodes.add(id);
          if (!baselineRevealed.has(id)) {
            focusPreviewNodes.add(id);
            this.currentFocusPreviewNodes.add(id);
          }
        });
      }
    }

    this.setFinalNodeStatesV2(ast, revealedNodes, focusPreviewNodes);
  }

  private getConnectedNodesWithinDepthV2(startNodeId: string, maxDepth: number, childrenMap: Map<string, string[]>): Set<string> {
    const result = new Set<string>();
    const queue: string[] = [startNodeId];
    const visited = new Set<string>([startNodeId]);
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = childrenMap.get(currentId) || [];
      children.forEach(childId => {
        if (visited.has(childId)) return;
        visited.add(childId);
        const childNode = this.nodes.find(n => n.id === childId);
        if (childNode && childNode.depth <= maxDepth) {
          result.add(childId);
          queue.push(childId);
        }
      });
    }
    return result;
  }

  private setFinalNodeStatesV2(ast: ActiveSkillTreeData, revealedNodes: Set<string>, focusPreviewNodes: Set<string>): void {
    const eligibleUnlockedCount = this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast);

    this.nodes.forEach(node => {
      if (node.state === SkillTreeNodeState.UNLOCKED) return;

      if (!revealedNodes.has(node.id)) {
        node.state = SkillTreeNodeState.LOCKED_HIDDEN;
        return;
      }
      if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
        this.ensureRandomGlitchFormsBaseline(ast, node.id, eligibleUnlockedCount);
      }

      if (node.isLevelLocked) {
        const ast2 = this.config?.activeSkillTree;
        if (this.isAdjacentToUnlocked(node, ast2)) {
          node.state = SkillTreeNodeState.LOCKED_DETAILS;
        } else {
          if (node.id === this.selectedNodeId || node.id === this.focusPreviewAnchorId) {
            node.state = SkillTreeNodeState.LOCKED_VISIBLE;
          } else {
            node.state = focusPreviewNodes.has(node.id) ? SkillTreeNodeState.LOCKED_VISIBLE : SkillTreeNodeState.LOCKED_HIDDEN;
          }
        }
        return;
      }

      const dependenciesMet = this.checkDependenciesMetV2(node, ast);
      const requiredLevel = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
      const meetsLevelRequirement = (ast.treeLevel || 1) >= requiredLevel;

      if (!dependenciesMet || !meetsLevelRequirement) {
        node.state = SkillTreeNodeState.LOCKED_VISIBLE;
        return;
      }

      if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
        const baseline = this.ensureRandomGlitchFormsBaseline(ast, node.id, eligibleUnlockedCount);
        const required = this.getRandomGlitchFormsRequiredCount(ast, node.id);
        const isEligible = (eligibleUnlockedCount - baseline) >= required;
        node.state = isEligible ? SkillTreeNodeState.LOCKED_DETAILS : SkillTreeNodeState.LOCKED_VISIBLE;
        return;
      }

      if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION &&
          this.isJourneyPrimaryMystery(node) &&
          this.getJourneyPrimaryUnlockedCount() >= 2 &&
          !ast.unlockedNodes.has(node.id)) {
        node.state = SkillTreeNodeState.LOCKED_VISIBLE;
        return;
      }

      node.state = SkillTreeNodeState.LOCKED_DETAILS;
    });
  }

  private countEligibleUnlockedNodesForRandomGlitchPrereq(ast: ActiveSkillTreeData): number {
    const unlocked = ast.unlockedNodes;
    if (!unlocked) return 0;

    let count = 0;
    for (const node of this.nodes) {
      if (!unlocked.has(node.id)) continue;
      if (node.id === "root_0" || node.depth <= 1) continue;

      const rt = node.rewardData?.type;
      if (rt === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) continue;

      count += 1;
    }
    return count;
  }

  private getRandomGlitchFormsRequiredCount(ast: ActiveSkillTreeData, nodeId: string): number {
    return Overrides.SKILL_TREE_RANDOM_GLITCH_PREREQ_REQUIRED_COUNT_OVERRIDE || 4;
  }

  private getRandomGlitchFormsBaselineEligibleUnlockedCount(ast: ActiveSkillTreeData, nodeId: string): number | null {
    try {
      const v = (ast.skillEffects as any)?.get?.(nodeId);
      if (typeof v === "number") return v;
      if (v && typeof v === "object" && typeof (v as any).baselineEligibleUnlockedCount === "number") {
        return (v as any).baselineEligibleUnlockedCount;
      }
    } catch {}
    return null;
  }

  private ensureRandomGlitchFormsBaseline(ast: ActiveSkillTreeData, nodeId: string, eligibleUnlockedCount: number): number {
    if (!(ast as any).skillEffects) {
      (ast as any).skillEffects = new Map();
    }
    const existing = this.getRandomGlitchFormsBaselineEligibleUnlockedCount(ast, nodeId);
    if (typeof existing === "number") {
      return existing;
    }

    const payload = { baselineEligibleUnlockedCount: eligibleUnlockedCount };
    (ast.skillEffects as any).set(nodeId, payload);
    return eligibleUnlockedCount;
  }

  private checkDependenciesMetV2(node: SkillTreeNode, ast: ActiveSkillTreeData): boolean {
    if (node.dependencies.length === 0) return true;
    if (node.depth === 0) return true;
    if (node.depth === 1) {
      const hasOnlyRootDependency = node.dependencies.length === 1 &&
        this.nodes.some(n => n.depth === 0 && node.dependencies.includes(n.id));
      if (hasOnlyRootDependency) return true;
    }
    if ((node as any).requiresAllDependencies) {
      return node.dependencies.every(depId => ast.unlockedNodes?.has(depId));
    } else {
      return node.dependencies.some(depId => ast.unlockedNodes?.has(depId));
    }
  }

  private applyDepthFilter(): void {
    if (!this.config) return;
    const ast = this.config.activeSkillTree;
    const selectedId = this.selectedNodeId;
    const anchorId = this.focusPreviewAnchorId;
    const previewNodes = this.currentFocusPreviewNodes;
    this.nodes.forEach(node => {
      const c = this.nodeSprites.get(node.id);
      if (c) {
        let visible: boolean;
        if (this.isEnhancedDebugMode) {
          visible = true;
        } else if (isSkillTreeV2()) {
          visible = node.state !== SkillTreeNodeState.LOCKED_HIDDEN;
        } else {
          visible = node.state !== SkillTreeNodeState.LOCKED_HIDDEN && node.depth <= (ast.maxVisibleDepth || 0);
        }
        c.setVisible(visible);
      }
    });
    this.connectionLines.forEach(line => {
      const child = this.nodes.find(n => n.id === line.childId);
      const parent = this.nodes.find(n => n.id === line.parentId);

      let childVisible: boolean, parentVisible: boolean;
      if (this.isEnhancedDebugMode) {
        childVisible = !!child;
        parentVisible = !!parent;
      } else if (isSkillTreeV2()) {
        childVisible = !!child && child.state !== SkillTreeNodeState.LOCKED_HIDDEN;
        parentVisible = !!parent && parent.state !== SkillTreeNodeState.LOCKED_HIDDEN;
        const childIsPreviewEndpoint = line.childId === selectedId || line.childId === anchorId || previewNodes.has(line.childId);
        const parentIsPreviewEndpoint = line.parentId === selectedId || line.parentId === anchorId || previewNodes.has(line.parentId);
        if (child?.isLevelLocked && child?.depth === 2 && !this.isRingAngularNeighbor(child) && !childIsPreviewEndpoint) childVisible = false;
        if (parent?.isLevelLocked && parent?.depth === 2 && !this.isRingAngularNeighbor(parent) && !parentIsPreviewEndpoint) parentVisible = false;
      } else {
        childVisible = !!child && child.state !== SkillTreeNodeState.LOCKED_HIDDEN && child.depth <= (ast.maxVisibleDepth || 0);
        parentVisible = !!parent && parent.state !== SkillTreeNodeState.LOCKED_HIDDEN && parent.depth <= (ast.maxVisibleDepth || 0);
      }

      line.g.setVisible(childVisible && parentVisible);
    });
  }

  private showTooltipFor(node: SkillTreeNode): void {
    this.tooltipTargetNodeId = node.id;

    if (isSkillTreeV2() && node.isLevelLocked && node.state !== SkillTreeNodeState.LOCKED_HIDDEN) {
      this.tooltipTitle.setText(i18next.t("skillTree:nodeStates.lockedPotential"));
      this.tooltipDesc.setStroke("", 0);
      const requirementsV2: string[] = [];
      const requiredLevelV2 = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
      const currentLevelV2 = this.config?.activeSkillTree.treeLevel || 1;
      if (currentLevelV2 < requiredLevelV2) {
        requirementsV2.push(i18next.t("skillTree:prereq.treeLevelRequired", { level: requiredLevelV2 }));
      }
      const unmetDepsV2 = node.dependencies.filter(depId => !this.config?.activeSkillTree.unlockedNodes.has(depId));
      if (unmetDepsV2.length > 0) {
        const depNamesV2 = unmetDepsV2.map(depId => {
          const depNode = this.nodes.find(n => n.id === depId);
          if (!depNode || depNode.state === SkillTreeNodeState.LOCKED_HIDDEN) return "???";
          return this.getRewardDisplayName(depNode) || depNode.name;
        });
        if ((node as any).requiresAllDependencies) {
          requirementsV2.push(i18next.t("skillTree:prereq.unlockAllPrior", { skills: depNamesV2.join(", ") }));
        } else {
          requirementsV2.push(i18next.t("skillTree:prereq.unlockOnePrior", { skills: depNamesV2.join(", ") }));
        }
      }
      const prereqV2 = this.evaluateNodePrerequisites(node, true);
      if (!prereqV2.ok && !this.shouldUseIncompatibleFallback(node)) {
        if (prereqV2.messages.length) {
          requirementsV2.push(...prereqV2.messages);
        } else {
          requirementsV2.push(i18next.t("skillTree:prereq.notMet"));
        }
      }
      if (node.branchUnlockCost != null) {
        requirementsV2.push(i18next.t("skillTree:prereq.useSkillPointsToUnlock", { cost: node.branchUnlockCost }));
      }
      if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
        const ast = this.config?.activeSkillTree;
        if (ast) {
          const eligibleUnlockedCount = this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast);
          const baseline = this.ensureRandomGlitchFormsBaseline(ast, node.id, eligibleUnlockedCount);
          const required = this.getRandomGlitchFormsRequiredCount(ast, node.id);
          const progress = Math.max(0, eligibleUnlockedCount - baseline);
          const remaining = Math.max(0, required - progress);
          if (remaining > 0) {
            requirementsV2.push(i18next.t("skillTree:prereq.randomGlitchFormsForRunUnlockMore", { remaining, progress, required }));
          }
        }
      }
      if (node.branchUnlockCost != null) {
        const canAffordBranch = (this.config?.activeSkillTree.skillPoints || 0) >= node.branchUnlockCost;
        this.tooltipCost.setText(i18next.t("skillTree:nodeCost", { cost: node.branchUnlockCost }));
        this.tooltipCost.setColor(canAffordBranch ? "#00ff00" : "#ff0000");
      } else {
        const nodeCostV2 = this.getNodeCost(node);
        this.tooltipCost.setText(i18next.t("skillTree:nodeCost", { cost: nodeCostV2 }));
        this.tooltipCost.setColor("#888888");
      }
      if (requirementsV2.length > 0) {
        const requirementsLine = `[color=#ff6b6b]${i18next.t("skillTree:prereq.header")}[/color] [color=#ffdd44]${requirementsV2.join(", ")}[/color]`;
        this.tooltipDesc.setText(requirementsLine);
      } else {
        this.tooltipDesc.setText("");
      }
      this.tooltipPrereq.setText("");
    } else {
      switch (node.state) {
      case SkillTreeNodeState.LOCKED_HIDDEN:
        this.tooltipTitle.setText(node.name);
        this.tooltipDesc.setText(i18next.t("skillTree:nodeStates.hidden"));
        this.tooltipCost.setText("");
        this.tooltipPrereq.setText("");
        this.tooltipRarity.setVisible(false);
        break;

      case SkillTreeNodeState.LOCKED_VISIBLE:
        if (node.isLevelLocked && node.requiredUnlockLevel != null) {
          this.tooltipTitle.setText(i18next.t("skillTree:nodeStates.locked"));
          this.tooltipDesc.setText(i18next.t("skillTree:prereq.treeLevelRequired", { level: node.requiredUnlockLevel }));
          this.tooltipCost.setText("");
          this.tooltipPrereq.setText("");
          this.tooltipRarity.setVisible(false);
          break;
        }
        if (isSkillTreeV2()) {
          const displayNameV2 = this.getRewardDisplayName(node);
          this.tooltipTitle.setText(displayNameV2 || node.name);
          const descriptionV2 = this.getEnhancedDescription(node);
          this.tooltipDesc.setStroke("", 0);
          const requirementsV2: string[] = [];
          const requiredLevelV2 = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
          const currentLevelV2 = this.config?.activeSkillTree.treeLevel || 1;
          if (currentLevelV2 < requiredLevelV2) {
            requirementsV2.push(i18next.t("skillTree:prereq.treeLevelRequired", { level: requiredLevelV2 }));
          }
          const unmetDepsV2 = node.dependencies.filter(depId => !this.config?.activeSkillTree.unlockedNodes.has(depId));
          if (unmetDepsV2.length > 0) {
            const depNamesV2 = unmetDepsV2.map(depId => {
              const depNode = this.nodes.find(n => n.id === depId);
              if (!depNode || depNode.state === SkillTreeNodeState.LOCKED_HIDDEN) return "???";
              return this.getRewardDisplayName(depNode) || depNode.name;
            });
            if ((node as any).requiresAllDependencies) {
              requirementsV2.push(i18next.t("skillTree:prereq.unlockAllPrior", { skills: depNamesV2.join(", ") }));
            } else {
              requirementsV2.push(i18next.t("skillTree:prereq.unlockOnePrior", { skills: depNamesV2.join(", ") }));
            }
          }
          if (node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
            const ast = this.config?.activeSkillTree;
            if (ast) {
              const eligibleUnlockedCount = this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast);
              const baseline = this.ensureRandomGlitchFormsBaseline(ast, node.id, eligibleUnlockedCount);
              const required = this.getRandomGlitchFormsRequiredCount(ast, node.id);
              const progress = Math.max(0, eligibleUnlockedCount - baseline);
              const remaining = Math.max(0, required - progress);
              if (remaining > 0) {
                requirementsV2.push(i18next.t("skillTree:prereq.randomGlitchFormsForRunUnlockMore", { remaining, progress, required }));
              }
            }
          }
          const nodeCostV2 = this.getNodeCost(node);
          this.tooltipCost.setText(i18next.t("skillTree:nodeCost", { cost: nodeCostV2 }));
          this.tooltipCost.setColor("#888888");
          if (requirementsV2.length > 0) {
            const requirementsLine = `[color=#ff6b6b]${i18next.t("skillTree:prereq.header")}[/color] [color=#ffdd44]${requirementsV2.join(", ")}[/color]`;
            this.tooltipDesc.setText(`${descriptionV2}\n\n${requirementsLine}`);
          } else {
            this.tooltipDesc.setText(descriptionV2);
          }
          this.tooltipPrereq.setText("");
        } else {
          this.tooltipTitle.setText(i18next.t("skillTree:nodeStates.locked"));
          this.tooltipCost.setText("");
          const unmetDeps = node.dependencies.filter(depId =>
            !this.config?.activeSkillTree.unlockedNodes.has(depId)
          );
          if (unmetDeps.length > 0) {
            const depNames = unmetDeps.map(depId => {
              const depNode = this.nodes.find(n => n.id === depId);
              if (!depNode ||
                  depNode.state === SkillTreeNodeState.LOCKED_HIDDEN ||
                  depNode.state === SkillTreeNodeState.LOCKED_VISIBLE) {
                return "???";
              }
              return this.getRewardDisplayName(depNode) || depNode.name;
            });
            const headerLine = i18next.t("skillTree:prereq.dependencies", { dependencies: "" }).split("\n")[0];
            const dependenciesList = depNames.map((name, i) => {
              if (i < depNames.length - 1) {
                const or = i18next.t("skillTree:prereq.or");
                return `- ${name}\n${or}`;
              }
              return `- ${name}`;
            }).join("\n");
            this.tooltipDesc.setText(`[color=#ff6b6b]${headerLine}[/color]\n${dependenciesList}`);
          } else {
            this.tooltipDesc.setText("");
          }
          this.tooltipPrereq.setText("");
        }
        break;

      case SkillTreeNodeState.LOCKED_DETAILS:
        if (node.isLevelLocked && node.branchUnlockCost != null) {
          this.tooltipTitle.setText(i18next.t("skillTree:nodeStates.locked"));
          this.tooltipDesc.setText(i18next.t("skillTree:prereq.useSkillPointsToUnlock", { cost: node.branchUnlockCost }));
          const canAffordBranch = (this.config?.activeSkillTree.skillPoints || 0) >= node.branchUnlockCost;
          this.tooltipCost.setText(i18next.t("skillTree:nodeCost", { cost: node.branchUnlockCost }));
          this.tooltipCost.setColor(canAffordBranch ? "#00ff00" : "#ff0000");
          this.tooltipPrereq.setText("");
          this.tooltipRarity.setVisible(false);
          break;
        }
        const dependenciesMet = this.areNodeDependenciesMet(node);

        if (!dependenciesMet) {

          this.tooltipTitle.setText(i18next.t("skillTree:nodeStates.locked"));
          if (node.depth >= 2) {
            const unmetDeps = node.dependencies.filter(depId =>
              !this.config?.activeSkillTree.unlockedNodes.has(depId)
            );

            if (unmetDeps.length > 0) {
              const depNames = unmetDeps.map(depId => {
                const depNode = this.nodes.find(n => n.id === depId);
                if (!depNode ||
                    depNode.state === SkillTreeNodeState.LOCKED_HIDDEN ||
                    depNode.state === SkillTreeNodeState.LOCKED_VISIBLE) {
                  return "???";
                }
              return this.getRewardDisplayName(depNode) || depNode.name;
            });

            const headerLine = i18next.t("skillTree:prereq.dependencies", { dependencies: "" }).split("\n")[0];
            const dependenciesList = depNames.map((name, i) => {
              if (i < depNames.length - 1) {
                const or = i18next.t("skillTree:prereq.or");
                return `- ${name}\n${or}`;
              }
              return `- ${name}`;
            }).join("\n");
            this.tooltipDesc.setText(`[color=#ff6b6b]${headerLine}[/color]\n${dependenciesList}`);
          } else {
            this.tooltipDesc.setText(i18next.t("skillTree:unmetDependencies"));
          }
        } else {
          this.tooltipDesc.setText(i18next.t("skillTree:unmetDependencies"));
        }
          this.tooltipCost.setText("");
          this.tooltipPrereq.setText("");
          this.updateInstructionsForDependencies(node);
        } else {
        this.restoreNormalInstructions();
        const displayName = this.getRewardDisplayName(node);
        this.tooltipTitle.setText(displayName || node.name);

          const description = this.getEnhancedDescription(node);
          this.tooltipDesc.setText(description);
          this.tooltipDesc.setStroke("", 0);

          const nodeCost = this.getNodeCost(node);
          const canAfford = (this.config?.activeSkillTree.skillPoints || 0) >= nodeCost;
          if (nodeCost === 0) {
            this.tooltipCost.setText(i18next.t("skillTree:nodeCostFree"));
          } else {
            this.tooltipCost.setText(i18next.t("skillTree:nodeCost", { cost: nodeCost }));
          }
          this.tooltipCost.setColor(canAfford ? "#00ff00" : "#ff0000");

          const prereq = this.evaluateNodePrerequisites(node, true);
          this.tooltipPrereq.setText(prereq.messages.length ? [i18next.t("skillTree:prereq.header"), ...prereq.messages].join(" ") : "");
        }
        break;

      case SkillTreeNodeState.UNLOCKED:

        this.restoreNormalInstructions();
        const displayName = this.getRewardDisplayName(node);
        this.tooltipTitle.setText(displayName || node.name);

        this.tooltipDesc.setText(this.getEnhancedDescription(node));
        this.tooltipDesc.setStroke("", 0);
        this.tooltipCost.setText(i18next.t("skillTree:nodeStates.unlocked"));
        this.tooltipCost.setColor("#00ff00");
        this.tooltipPrereq.setText("");
        break;
      }
    }
    const rarity = this.getSkillRarityFromNode(node);
    const rarityText = this.getRarityText(rarity);
    const rarityColors = this.getRarityColors(rarity);

    this.tooltipRarity.setText(rarityText);
    this.tooltipRarity.setTint(rarityColors.border);
    this.tooltipRarity.setVisible(node.state !== SkillTreeNodeState.LOCKED_HIDDEN);
    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.tooltipTitle.setColor(rarityHex);

    const c = SkillTreeUiHandler.UI_CONSTANTS.TOOLTIP;
    const { width: tooltipWidth, height: tooltipHeight } = this.calculateTooltipDimensions(node);
    this.repositionTextElements(tooltipWidth);

    this.tooltipTitleBarBg.clear();
    this.tooltipRarityBarBg.clear();

    this.tooltipBg.setSize(tooltipWidth, tooltipHeight);
    this._tooltipPattern?.redraw();
    if (this.tooltipRarity.visible) {
      this.tooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
      this.tooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, c.RARITY_BAR_HEIGHT);
    }
    this.positionTooltip(node, tooltipWidth, tooltipHeight);
    this.tooltip.setVisible(true);
  }

  private positionTooltip(node: SkillTreeNode, tooltipWidth: number, tooltipHeight: number): void {

    const nodeContainerPos = this.nodeContainerPosition(node);
    const c = SkillTreeUiHandler.UI_CONSTANTS.TOOLTIP;
    const scaledNodeSize = this.NODE_SIZE * this.transform.scale * c.SCALED_NODE_SIZE_MULTIPLIER;
    const margin = c.MARGIN;
    let x: number;
    let y = nodeContainerPos.y - tooltipHeight / 2;
    x = nodeContainerPos.x - tooltipWidth - scaledNodeSize - 2;
    if (x < margin) {
      x = nodeContainerPos.x + scaledNodeSize + 2;
    }
    if (x + tooltipWidth > this.getWidth() - margin) {
      x = this.getWidth() - tooltipWidth - margin;
    }
    if (y < margin) {
      y = margin;
    } else if (y + tooltipHeight > this.getHeight() - margin) {
      y = this.getHeight() - tooltipHeight - margin;
    }
    this.tooltip.setPosition(x, y);
  }
  private nodeContainerPosition(node: SkillTreeNode): { x: number, y: number } {
    const worldX = node.position.x * this.transform.scale + this.transform.tx;
    const worldY = node.position.y * this.transform.scale + this.transform.ty;
    return {
      x: worldX + this.getWidth() / 2,
      y: worldY + this.getHeight() / 2
    };
  }

  private nodeScreenPosition(node: SkillTreeNode): { x: number, y: number } {
    const worldX = node.position.x * this.transform.scale + this.transform.tx;
    const worldY = node.position.y * this.transform.scale + this.transform.ty;
    return {
      x: worldX + this.getWidth() / 2,
      y: worldY + this.getHeight() / 2
    };
  }

  private hideTooltip(): void {
    this.tooltipTargetNodeId = null;
    this.tooltip.setVisible(false);
    this.modalMessage?.clear();
    this.restoreNormalInstructions();
  }

  private updateInstructionsForDependencies(node: SkillTreeNode): void {
    if (!this.config) return;

    const unmetDeps = node.dependencies.filter(depId =>
      !this.config.activeSkillTree.unlockedNodes.has(depId)
    );

    if (unmetDeps.length > 0) {
      const depNames = unmetDeps.map(depId => {
        const depNode = this.nodes.find(n => n.id === depId);
        if (!depNode ||
            depNode.state === SkillTreeNodeState.LOCKED_HIDDEN ||
            depNode.state === SkillTreeNodeState.LOCKED_VISIBLE) {
          return "???";
        }
        return depNode.name;
      });

      const requirementText = (node as any).requiresAllDependencies
        ? i18next.t("skillTree:prereq.unlockAllPrior", { skills: depNames.join(", ") })
        : i18next.t("skillTree:prereq.unlockOnePrior", { skills: depNames.join(", ") });

      this.instructionsText.setText(requirementText);
      this.setKeyHintsMode("text");
      this.updateInstructionBackground();
    }
  }

  private restoreNormalInstructions(): void {
    if (!this.config) return;

    try {
      if (this.config.mode === SkillTreeMode.POKEMON_SELECTION) {
        const isJourney = this.nodes.some(n => n.id?.startsWith("depth1_journey_mystery_"));
        if (isJourney) {
          const primaryCount = this.nodes.filter(n =>
            n?.id?.match(/^depth1_journey_mystery_[012]$/) &&
            this.config!.activeSkillTree.unlockedNodes.has(n.id)
          ).length;
          const fourthNode = this.nodes.find(n => n.id === "depth1_journey_mystery_3");
          const fourthDone = !fourthNode || this.config.activeSkillTree.unlockedNodes.has(fourthNode.id);
          let key: string;
          if (primaryCount >= 2 && !fourthDone) {
            key = "skillTree:instructionsJourneyFourthMystery";
          } else if (primaryCount >= 2 && fourthDone) {
            key = "skillTree:instructionsPokemonSelectionComplete";
          } else {
            key = primaryCount === 0
              ? "skillTree:instructionsJourneySelection"
              : "skillTree:instructionsJourneySelectionRemaining";
          }
          this.instructionsText.setText(i18next.t(key, { remaining: 2 - primaryCount }));
        } else {
          const { signatureCount: sigCount, generalCount: genCount, total } = this.countPokemonSelectionsFromUnlockedNodes();
          const remaining = 2 - total;
          const mysteryNode = this.nodes.find(n => !!n?.rewardData?.data?.starterMysteryNode);
          const mysteryExists = !!mysteryNode;
          const mysteryPurchased = mysteryNode ? this.config.activeSkillTree.unlockedNodes.has(mysteryNode.id) : true;

          let key: string;
          if (total >= 2) {
            key = (mysteryExists && !mysteryPurchased)
              ? "skillTree:instructionsPokemonSelectionMysteryRemaining"
              : "skillTree:instructionsPokemonSelectionComplete";
          } else if (remaining === 2) {
            key = "skillTree:instructionsPokemonSelection";
          } else if (sigCount === 0 && genCount < 2) {
            key = "skillTree:instructionsPokemonSelectionSignatureAvailable";
          } else {
            key = "skillTree:instructionsPokemonSelectionRemaining";
          }
          this.instructionsText.setText(i18next.t(key, { remaining }));
        }
      } else {
        this.setKeyHintsMode("icons");
        return;
      }
      this.setKeyHintsMode("text");
      this.updateInstructionBackground();
    } catch {
    }
  }

  private getInstructionsKey(): string {
    const inputMethod = this.scene.inputMethod || "keyboard";

    if (inputMethod === "touch") {
      return "skillTree:instructionsTouch";
    } else if (inputMethod === "gamepad") {
      return "skillTree:instructionsGamepad";
    } else {
      return "skillTree:instructionsMouse";
    }
  }

  private updateInstructionsForInputMethod(): void {
    if (!this.instructionsText) return;

    const newInputMethod = this.scene.inputMethod || "keyboard";

    if (newInputMethod === this.currentInputMethod) return;

    this.currentInputMethod = newInputMethod;

    if (this.config?.mode !== SkillTreeMode.POKEMON_SELECTION) {
      const instructionsKey = this.getInstructionsKey();
      this.instructionsText.setText(i18next.t(instructionsKey));
      this.updateInstructionBackground();
    }
    this.updateNavKeyHints();
  }

  private updateInstructionBackground(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.INSTRUCTIONS;
    const isPokemonSelection = this.config?.mode === SkillTreeMode.POKEMON_SELECTION;
    const bgAlpha = isPokemonSelection ? 0.9 : c.BG_ALPHA;

    this.instructionsTextBg.clear();
    this.instructionsTextBg.fillStyle(c.BG_COLOR, bgAlpha);
    this.instructionsTextBg.lineStyle(c.BORDER_THICKNESS, c.BORDER_COLOR, c.BORDER_ALPHA);
    const textWidth = this.instructionsText.displayWidth;
    const textHeight = this.instructionsText.displayHeight;
    const bgX = -textWidth - c.BG_PADDING;
    const bgY = -textHeight - c.BG_PADDING;
    const bgWidth = textWidth + c.BG_PADDING * 2;
    const bgHeight = textHeight + c.BG_PADDING * 2;
    this.instructionsTextBg.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, c.BG_RADIUS);
    this.instructionsTextBg.strokeRoundedRect(bgX, bgY, bgWidth, bgHeight, c.BG_RADIUS);
  }

  private updateInstructionsOpacity(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.INSTRUCTIONS;
    if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION) {
      this.instructionsText?.setAlpha(1.0);
    } else {
      this.instructionsText?.setAlpha(c.ALPHA);
    }
    this.updateInstructionBackground();
  }

  private getDependencyChain(nodeId: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || !this.config) return [];

    const chain: string[] = [];
    const ast = this.config.activeSkillTree;
    for (const depId of node.dependencies) {
      if (!ast.unlockedNodes.has(depId)) {
        chain.push(depId);

        chain.push(...this.getDependencyChain(depId, visited));
      }
    }

    return [...new Set(chain)];
  }

  private getForwardChain(nodeId: string): string[] {
    const connections = this.nodeConnectionMap.get(nodeId);
    if (!connections) return [];
    return connections.children.filter(childId => {
      const child = this.nodes.find(n => n.id === childId);
      return child != null && child.state !== SkillTreeNodeState.LOCKED_HIDDEN;
    });
  }

  private highlightDependencyChain(nodeId: string): void {
    this.clearDependencyHighlights();

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.state === SkillTreeNodeState.UNLOCKED) return;
    const dependenciesMet = this.areNodeDependenciesMet(node);
    if (dependenciesMet) return;

    const dependencyChain = this.getDependencyChain(nodeId);
    if (dependencyChain.length === 0) return;

    const c = SkillTreeUiHandler.UI_CONSTANTS.DEPENDENCY_HIGHLIGHT;
    const dependencySet = new Set([nodeId, ...dependencyChain]);
    this.nodes.forEach(n => {
      const nodeContainer = this.nodeSprites.get(n.id);
      if (!nodeContainer) return;

      if (dependencySet.has(n.id)) {

        nodeContainer.setAlpha(1.0);
        this.applyPurpleBackground(n);
      } else {

        nodeContainer.setAlpha(0.4);
      }
    });
    this.connectionLines.forEach(connection => {
      const isHighlighted = dependencySet.has(connection.childId) && dependencySet.has(connection.parentId);
      if (!isHighlighted) {
        connection.g.setAlpha(0.2);
      }
    });
    this.highlightDependencyConnections(nodeId, dependencyChain);
  }

  private highlightForwardBranch(anchorId: string, previewIds: Set<string>): void {
    this.clearDependencyHighlights();

    const anchor = this.nodes.find(n => n.id === anchorId);
    if (!anchor || anchor.depth < 2) return;
    if (!previewIds.size) return;

    const chainSet = new Set<string>();
    chainSet.add(anchorId);
    previewIds.forEach(id => chainSet.add(id));

    this.nodes.forEach(n => {
      const nodeContainer = this.nodeSprites.get(n.id);
      if (!nodeContainer) return;

      if (chainSet.has(n.id)) {
        nodeContainer.setAlpha(1.0);
        if (n.id !== anchorId) {
          this.applyPurpleBackground(n);
        }
      } else {
        nodeContainer.setAlpha(0.4);
      }
    });

    this.connectionLines.forEach(connection => {
      const isHighlighted = chainSet.has(connection.childId) && chainSet.has(connection.parentId);
      if (!isHighlighted) {
        connection.g.setAlpha(0.2);
      }
    });

    this.highlightDependencyConnections(anchorId, Array.from(previewIds));
  }

  private updateFocusHighlight(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      this.clearDependencyHighlights();
      return;
    }

    const anchorId = this.focusPreviewAnchorId ?? nodeId;
    if (anchorId && this.currentFocusPreviewNodes.size > 0) {
      this.highlightForwardBranch(anchorId, this.currentFocusPreviewNodes);
      return;
    }
    if (anchorId && this.currentFocusPreviewNodes.size === 0) {
      this.clearDependencyHighlights();
    }

    const isLevelLockedPurchasable = node.isLevelLocked &&
      node.state === SkillTreeNodeState.LOCKED_DETAILS;

    if (node.state !== SkillTreeNodeState.UNLOCKED &&
        !this.areNodeDependenciesMet(node) &&
        !isLevelLockedPurchasable) {
      this.highlightDependencyChain(nodeId);
      return;
    }

    this.clearDependencyHighlights();
  }

  private applyPurpleBackground(node: SkillTreeNode): void {
    const nodeContainer = this.nodeSprites.get(node.id);
    if (!nodeContainer) return;
    this.purpleBackgroundNodes.add(node.id);
    const bg = nodeContainer.list[0] as Phaser.GameObjects.Graphics;
    if (!bg) return;
    bg.clear();
    bg.fillStyle(SkillTreeUiHandler.UI_CONSTANTS.DEPENDENCY_HIGHLIGHT.COLOR, 1.0);
    bg.lineStyle(3, SkillTreeUiHandler.UI_CONSTANTS.DEPENDENCY_HIGHLIGHT.COLOR);
    bg.fillCircle(0, 0, this.NODE_SIZE / 2);
    bg.strokeCircle(0, 0, this.NODE_SIZE / 2);
    if ((node as any).isLegendary) {
      bg.lineStyle(5, 0xFFD700);
      bg.strokeCircle(0, 0, (this.NODE_SIZE / 2) + 3);
    }
    if (node.id === this.selectedNodeId) {
      bg.lineStyle(4, 0x00ffff);
      bg.strokeCircle(0, 0, (this.NODE_SIZE / 2) + 6);
    }
  }

  private highlightDependencyConnections(nodeId: string, dependencyChain: string[]): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.DEPENDENCY_HIGHLIGHT;
    const chainSet = new Set([nodeId, ...dependencyChain]);
    this.connectionLines.forEach(connection => {
      if (chainSet.has(connection.childId) && chainSet.has(connection.parentId)) {
        const childNode = this.nodes.find(n => n.id === connection.childId);
        const parentNode = this.nodes.find(n => n.id === connection.parentId);

        if (childNode && parentNode) {

          const connectionHighlight = this.scene.add.graphics();
          connectionHighlight.lineStyle(c.CONNECTION_WIDTH, c.COLOR, c.ALPHA);
          connectionHighlight.beginPath();
          connectionHighlight.moveTo(parentNode.position.x, parentNode.position.y);
          connectionHighlight.lineTo(childNode.position.x, childNode.position.y);
          connectionHighlight.strokePath();
          connectionHighlight.setBlendMode(Phaser.BlendModes.ADD);
          this.connectionsLayer.add(connectionHighlight);
          this.dependencyHighlights.push(connectionHighlight);
          this.scene.tweens.add({
            targets: connectionHighlight,
            alpha: c.PULSE_ALPHA_MIN,
            duration: c.PULSE_DURATION / 2,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
        }
      }
    });
  }

  private clearDependencyHighlights(): void {
    this.dependencyHighlights.forEach(highlight => {
      this.scene.tweens.killTweensOf(highlight);
      highlight.destroy();
    });
    this.dependencyHighlights = [];
    this.purpleBackgroundNodes.forEach(nodeId => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        this.updateNodeVisual(node);
      }
    });
    this.purpleBackgroundNodes.clear();
    this.nodes.forEach(n => {
      const nodeContainer = this.nodeSprites.get(n.id);
      if (nodeContainer) {
        nodeContainer.setAlpha(1.0);
      }
    });
    this.connectionLines.forEach(connection => {
      connection.g.setAlpha(1.0);
    });
  }

  private playUnlockEffect(node: SkillTreeNode, delayOverride?: integer, onComplete?: () => void): void {
    const nodeContainer = this.nodeSprites.get(node.id);
    if (!nodeContainer) {
      onComplete?.();
      return;
    }

    const c = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.UNLOCK_EFFECT;

    const delay = delayOverride !== undefined ? delayOverride : c.DELAY;
    this.scene.time.delayedCall(delay, () => {
      const glowGraphics = this.scene.add.graphics();
      glowGraphics.fillStyle(c.GLOW_COLOR, c.GLOW_ALPHA);
      glowGraphics.fillCircle(0, 0, this.NODE_SIZE * 0.8);
      glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
      nodeContainer.add(glowGraphics);

      this.scene.tweens.add({
        targets: nodeContainer,
        scaleX: c.PULSE_SCALE,
        scaleY: c.PULSE_SCALE,
        duration: c.DURATION * 0.3,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () => {
          glowGraphics.destroy();
          onComplete?.();
        }
      });

      this.createUnlockParticles(node.position, c.PARTICLE_COUNT);

      try {
        (this.scene as BattleScene).playSound("battle_anims/PRSFX- Last Resort1", { volumeGroup: "ui" });
      } catch {}
    });
  }

  private createUnlockParticles(position: { x: number, y: number }, count: number): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.UNLOCK_EFFECT;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xFFD700, 1);
      particle.fillCircle(0, 0, 3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      const worldPos = this.nodeScreenPosition({ position } as SkillTreeNode);
      particle.setPosition(worldPos.x, worldPos.y);
      this.skillTreeContainer.add(particle);
      const targetX = worldPos.x + Math.cos(angle) * 50;
      const targetY = worldPos.y + Math.sin(angle) * 50;
      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        duration: c.DURATION * 1.5,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
      this.scene.tweens.add({
        targets: particle,
        alpha: 0.3,
        duration: c.DURATION * 0.8,
        delay: c.DURATION * 0.2,
        ease: 'Cubic.easeIn'
      });
    }
  }

  private playDepthRevealEffect(newNodes: SkillTreeNode[]): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.DEPTH_REVEAL;
    const unlockC = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.UNLOCK_EFFECT;

    newNodes.forEach((node, index) => {
      const nodeContainer = this.nodeSprites.get(node.id);
      if (!nodeContainer) return;
      nodeContainer.setScale(c.SCALE_FROM);
      nodeContainer.setAlpha(c.ALPHA_FROM);
      const delay = index * c.FADE_IN_DELAY;

      this.scene.tweens.add({
        targets: nodeContainer,
        scale: 1,
        alpha: 1,
        duration: c.DURATION,
        delay: delay,
        ease: 'Back.easeOut',
        onComplete: () => {

          this.playSecondaryRevealEffect(node, index * 100);
        }
      });
    });
    try {
      (this.scene as BattleScene).playSound("ui/menu_open");
    } catch {}
  }

  private playSecondaryRevealEffect(node: SkillTreeNode, delay: number = 0): void {
    const nodeContainer = this.nodeSprites.get(node.id);
    if (!nodeContainer) return;

    const c = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.UNLOCK_EFFECT;
    this.scene.time.delayedCall(delay, () => {

      const glowGraphics = this.scene.add.graphics();
      glowGraphics.fillStyle(0x00AAFF, 0.4);
      glowGraphics.fillCircle(0, 0, this.NODE_SIZE * 0.6);
      glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
      nodeContainer.add(glowGraphics);
      this.scene.tweens.add({
        targets: nodeContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 400,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => {

          glowGraphics.destroy();
        }
      });
      this.createRevealParticles(node.position, 6);
    });
  }

  private createRevealParticles(position: { x: number, y: number }, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(0x00AAFF, 1);
      particle.fillCircle(0, 0, 2);
      const worldPos = this.nodeScreenPosition({ position } as SkillTreeNode);
      particle.setPosition(worldPos.x, worldPos.y);
      this.skillTreeContainer.add(particle);
      const targetX = worldPos.x + Math.cos(angle) * 30;
      const targetY = worldPos.y + Math.sin(angle) * 30;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private playStateTransitionEffect(node: SkillTreeNode, fromState: SkillTreeNodeState, toState: SkillTreeNodeState): void {
    const nodeContainer = this.nodeSprites.get(node.id);
    if (!nodeContainer) return;

    const c = SkillTreeUiHandler.UI_CONSTANTS.ANIMATIONS.STATE_TRANSITION;
    this.scene.tweens.add({
      targets: nodeContainer,
      scaleX: c.SCALE_BOUNCE,
      scaleY: c.SCALE_BOUNCE,
      duration: c.DURATION * 0.5,
      ease: 'Back.easeOut',
      yoyo: true
    });
    if (toState === SkillTreeNodeState.UNLOCKED ||
        ((fromState === SkillTreeNodeState.LOCKED_VISIBLE || fromState === SkillTreeNodeState.LOCKED_HIDDEN) && toState === SkillTreeNodeState.LOCKED_DETAILS)) {

      this.hideTooltip();
      this.playUnlockEffect(node);
    }
  }
  private fitViewToVisibleNodes(): void {
    if (!this.config || !this.nodes || !this.nodes.length) return;
    const ast = this.config.activeSkillTree;
    const visible = this.nodes.filter(n => n.depth <= (ast.maxVisibleDepth || 0));
    if (!visible.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of visible) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x);
      maxY = Math.max(maxY, n.position.y);
    }
    const padding = this.NODE_SIZE * 2;
    const w = (maxX - minX) + padding;
    const h = (maxY - minY) + padding;
    const vw = this.getWidth();
    const vh = this.getHeight();
    if (vw <= 0 || vh <= 0) return;
    const scale = Math.max(0.03, Math.min(0.12, Math.min(vw / w, vh / h)));
    this.transform.scale = scale;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.transform.tx = -cx * scale;
    this.transform.ty = -cy * scale;
    this.applyTransform();
  }

  private panToNode(node: SkillTreeNode, durationMs: number = 1000, skipZoom: boolean = false, customZoom?: number, ease: string = 'Sine.easeInOut'): void {
    const targetScale = skipZoom ? this.transform.scale : (customZoom !== undefined ? customZoom : this.DEFAULT_ZOOM);
    const targetX = -node.position.x * targetScale;
    const targetY = -node.position.y * targetScale;

    if (durationMs <= 0) {
      this.transform.tx = targetX;
      this.transform.ty = targetY;
      if (!skipZoom) this.transform.scale = targetScale;
      this.applyTransform();
      return;
    }

    const tweenTargets: any = {
      tx: targetX,
      ty: targetY
    };

    if (!skipZoom) {
      tweenTargets.scale = targetScale;
    }

    const tweenConfig: any = {
      targets: this.transform,
      ...tweenTargets,
      duration: durationMs,
      onUpdate: () => this.applyTransform()
    };
    if (durationMs > 0) {
      tweenConfig.ease = ease;
    }

    this.scene.tweens.add(tweenConfig);
  }

  private countPokemonSelectionsFromUnlockedNodes(): { signatureCount: number; generalCount: number; total: number } {
    const activeSkillTree = this.config?.activeSkillTree;
    const nodes = this.nodes;
    if (!activeSkillTree?.unlockedNodes || !nodes) {
      return { signatureCount: 0, generalCount: 0, total: 0 };
    }
    let signatureCount = 0;
    let generalCount = 0;
    for (const n of nodes) {
      if (!activeSkillTree.unlockedNodes.has(n.id)) continue;
      if (n.rewardData.type === SkillTreeRewardType.SIGNATURE_POKEMON) signatureCount++;
      if (n.rewardData.type === SkillTreeRewardType.GENERAL_POKEMON) generalCount++;
    }
    return { signatureCount, generalCount, total: signatureCount + generalCount };
  }

  private handleSelection(node: SkillTreeNode): boolean {
    if (node.state !== SkillTreeNodeState.LOCKED_DETAILS) return false;
    if (![SkillTreeRewardType.SIGNATURE_POKEMON, SkillTreeRewardType.GENERAL_POKEMON].includes(node.rewardData.type)) return false;
    const species = node.rewardData.data?.species as Species | undefined; if (species === undefined) return false;

    const isSignature = node.rewardData.type === SkillTreeRewardType.SIGNATURE_POKEMON;

    if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION) {
      const { signatureCount, generalCount, total } = this.countPokemonSelectionsFromUnlockedNodes();
      if (total >= 2) {
        this.showSelectionLimitMessage("max");
        return false;
      }
      if (isSignature && signatureCount >= 1) {
        this.showSelectionLimitMessage("signature");
        return false;
      }
      if (isSignature && generalCount >= 2) {
        this.showSelectionLimitMessage("signature");
        return false;
      }
    }
    const idx = this.selections.findIndex(s => s.isSignature === isSignature);
    if (idx > -1) {
      this.selections[idx] = { species: species as unknown as number, isSignature };
    } else {
      this.selections.push({ species: species as unknown as number, isSignature });
    }
    this.config?.onSelectionMade?.(species, isSignature);
    node.state = SkillTreeNodeState.UNLOCKED; node.unlocked = true;
    this.config.activeSkillTree.unlockedNodes.add(node.id);
    if (this.config?.activeSkillTree) {
      this.config.activeSkillTree.selectedPokemonPicks ||= [];
      this.config.activeSkillTree.selectedPokemonPicks.push({ species, isSignature });
    }
    this.updateNodeVisual(node);
    if ([SkillTreeRewardType.SIGNATURE_POKEMON, SkillTreeRewardType.GENERAL_POKEMON].includes(node.rewardData.type)) {

      this.applyRewardToGameState(node);

      (this.scene.gameData as any).tempSkillTreeConfig = {
        ...this.config,
        nodes: this.nodes
      };

      let modChampionData = (this.config as any)?.championData;
      const nodeTypes = node.rewardData?.data?.nodeTypes as Type[] | undefined;
      if (nodeTypes && nodeTypes.length > 0 && modChampionData) {
        modChampionData = { ...modChampionData, type1: nodeTypes[0], type2: nodeTypes[1] ?? Type.UNKNOWN, unlockedTypeBoosters: [...nodeTypes], unlockedEssenceBundles: [...nodeTypes], unlockedTypeSwitchers: [...nodeTypes], unlockedTeraTypes: [...nodeTypes] };
      }
      (this.scene as BattleScene).unshiftPhase(new SkillTreeModifierPhase(this.scene as BattleScene, node as any, modChampionData));
      (this.scene as BattleScene).shiftPhase();
    } else {
      this.applyReward(node);
    }

    return true;
  }

  private shouldUseIncompatibleFallback(node: SkillTreeNode): boolean {
    const t = node.rewardData?.type;
    return t === SkillTreeRewardType.POKEMON_ALT_BUILD
      || t === SkillTreeRewardType.GLITCH_CHANGE
      || t === SkillTreeRewardType.GLITCH_FORM_UNLOCK;
  }

  private canPurchase(node: SkillTreeNode): boolean {
    const ast = this.config?.activeSkillTree; if (!ast) return false;

    if (this.isEnhancedDebugMode) {
      return true;
    }

    if (node.isLevelLocked) {
      if (!this.isAdjacentToUnlocked(node, ast)) return false;
      const branchCost = node.branchUnlockCost || 3;
      if ((ast.skillPoints || 0) < branchCost) return false;
      return true;
    }

    if (node.state !== SkillTreeNodeState.LOCKED_DETAILS) return false;

    const nodeCost = this.getNodeCost(node);
    if ((ast.skillPoints || 0) < nodeCost) return false;

    if (!this.areNodeDependenciesMet(node)) return false;

    const prereq = this.evaluateNodePrerequisites(node);
    if (!prereq.ok && !this.shouldUseIncompatibleFallback(node)) return false;

    if (isSkillTreeV2()) {
      const requiredLevel = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
      if ((ast.treeLevel || 1) < requiredLevel) {
        return false;
      }
    }

    return true;
  }

  private getPurchaseBlockedMessage(node: SkillTreeNode): string | null {
    const ast = this.config?.activeSkillTree;
    if (!ast) {
      return i18next.t("skillTree:prereq.notMet", { defaultValue: "Cannot purchase" });
    }

    if (this.isEnhancedDebugMode) {
      return null;
    }

    if (node.isLevelLocked) {
      if (node.branchUnlockCost != null && this.isAdjacentToUnlocked(node, ast)) {
        if ((ast.skillPoints || 0) < node.branchUnlockCost) {
          return i18next.t("skillTree:prereq.notEnoughSP", { cost: node.branchUnlockCost });
        }
        return null;
      }
      if (isSkillTreeV2()) {
        const requiredLevel = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
        if ((ast.treeLevel || 1) < requiredLevel) {
          return i18next.t("skillTree:prereq.treeLevelRequired", { level: requiredLevel });
        }
      }
      if (node.branchUnlockCost != null) {
        return [i18next.t("skillTree:prereq.header"), i18next.t("skillTree:prereq.useSkillPointsToUnlock", { cost: node.branchUnlockCost })].join(" · ");
      }
      const lockLevel = isSkillTreeV2() ? SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth) : null;
      if (lockLevel) {
        return `${i18next.t("skillTree:nodeStates.locked")} · ${i18next.t("skillTree:prereq.treeLevelRequired", { level: lockLevel })}`;
      }
      return i18next.t("skillTree:nodeStates.locked");
    }

    if (node.state !== SkillTreeNodeState.LOCKED_DETAILS) {
      if (isSkillTreeV2()
          && node.state === SkillTreeNodeState.LOCKED_VISIBLE
          && node.rewardData?.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
        const eligibleUnlockedCount = this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast);
        const baseline = this.ensureRandomGlitchFormsBaseline(ast, node.id, eligibleUnlockedCount);
        const required = this.getRandomGlitchFormsRequiredCount(ast, node.id);
        const progress = Math.max(0, eligibleUnlockedCount - baseline);
        const remaining = Math.max(0, required - progress);
        if (remaining > 0) {
          return [
            i18next.t("skillTree:prereq.header"),
            i18next.t("skillTree:prereq.randomGlitchFormsForRunUnlockMore", { remaining, progress, required })
          ].join(" · ");
        }
      }
      if (node.state === SkillTreeNodeState.UNLOCKED) {
        return i18next.t("skillTree:nodeStates.unlocked");
      }
      if (node.state === SkillTreeNodeState.LOCKED_HIDDEN) {
        return i18next.t("skillTree:nodeStates.hidden");
      }
      if (node.dependencies?.length > 0) {
        return `${i18next.t("skillTree:nodeStates.locked")} · ${i18next.t("skillTree:dependenciesNotMet", { defaultValue: "Unlock parent nodes first" })}`;
      }
      return i18next.t("skillTree:nodeStates.locked");
    }

    const nodeCost = this.getNodeCost(node);
    if ((ast.skillPoints || 0) < nodeCost) {
      return i18next.t("skillTree:cannotAfford", { cost: nodeCost, current: ast.skillPoints || 0, defaultValue: "Cannot purchase" });
    }

    const requirements: string[] = [];

    if (!this.areNodeDependenciesMet(node)) {
      const depNames = node.dependencies
        .map(depId => {
          const depNode = this.nodes.find(n => n.id === depId);
          if (!depNode) return depId;
          return this.getRewardDisplayName(depNode) || depNode.name || depId;
        })
        .filter((n): n is string => !!n);

      if (depNames.length > 0) {
        const key = (node as any).requiresAllDependencies
          ? "skillTree:prereq.unlockAllPrior"
          : "skillTree:prereq.unlockOnePrior";
        requirements.push(i18next.t(key, { skills: depNames.join(", ") }));
      } else {
        requirements.push(i18next.t("skillTree:unmetDependencies"));
      }
    }

    const prereq = this.evaluateNodePrerequisites(node);
    if (!prereq.ok && !this.shouldUseIncompatibleFallback(node)) {
      if (prereq.messages.length) {
        requirements.push(...prereq.messages);
      } else {
        requirements.push(i18next.t("skillTree:prereq.notMet"));
      }
    }

    if (node.isLevelLocked && node.branchUnlockCost != null) {
      requirements.push(i18next.t("skillTree:prereq.useSkillPointsToUnlock", { cost: node.branchUnlockCost }));
    }

    if (isSkillTreeV2()) {
      const requiredLevel = SkillTreeUtils.getRequiredTreeLevelForDepth(node.depth);
      if ((ast.treeLevel || 1) < requiredLevel) {
        requirements.push(i18next.t("skillTree:prereq.treeLevelRequired", { level: requiredLevel }));
      }
    }

    if (requirements.length > 0) {
      return [i18next.t("skillTree:prereq.header"), ...requirements].join(" · ");
    }

    return null;
  }

  private isGlitchFormUnlocked(node: SkillTreeNode): boolean {
    if (node.rewardData.type !== SkillTreeRewardType.GLITCH_FORM_UNLOCK) {
      return false;
    }

    const questId = node.rewardData.data?.unlockableId as QuestUnlockables;
    if (!questId) {
      return false;
    }

    try {
      const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(questId);
      if (!questUnlockData || !questUnlockData.rewardId) {
        return false;
      }

      const speciesId = questUnlockData.rewardId as Species;
      const rewardType = questUnlockData.rewardType || RewardType.GLITCH_FORM_A;

      return this.scene.gameData.canUseGlitchOrSmittyForm(speciesId, rewardType);
    } catch (error) {
      console.error("[GLITCH] Failed to check if glitch form unlocked:", error);
      return false;
    }
  }

  private getNodeCost(node: SkillTreeNode): number {
    if (node.rewardData.type === SkillTreeRewardType.GLITCH_FORM_UNLOCK) {
      if (this.isGlitchFormUnlocked(node)) {
        return 0;
      }
    }
    if (node.rewardData.type === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
      return 0;
    }
    if (node.rewardData.type === SkillTreeRewardType.TYPE_SWITCHER
        || node.rewardData.type === SkillTreeRewardType.CATCH_RATE_BONUS
        || node.rewardData.type === SkillTreeRewardType.FUSION_SECONDARY_PRIORITY
        || node.rewardData.type === SkillTreeRewardType.TM_FILTERED
        || node.rewardData.type === SkillTreeRewardType.BATON_ITEM
        || node.rewardData.type === SkillTreeRewardType.PP_MAX_ITEM
        || node.rewardData.type === SkillTreeRewardType.BERRY_ITEMS) {
      return 0;
    }
    if (node.rewardData.type === SkillTreeRewardType.POKEMON_ALT_BUILD) {
      return 2;
    }
    if (node.id === "depth1_bounty_0") {
      return 0;
    }
    return Math.min(node.cost, 2);
  }

  private areNodeDependenciesMet(node: SkillTreeNode): boolean {
    const ast = this.config?.activeSkillTree; if (!ast) return false;

    if (this.isEnhancedDebugMode) {
      return true;
    }

    if (node.dependencies.length === 0) {
      return true;
    }

    if ((node as any).requiresAllDependencies) {
      return node.dependencies.every(id => ast.unlockedNodes.has(id));
    } else {
      return node.dependencies.some(id => ast.unlockedNodes.has(id));
    }
  }

  private getJourneyPrimaryUnlockedCount(): number {
    if (!this.config?.activeSkillTree?.unlockedNodes) return 0;
    return this.nodes.filter(n =>
      n.id?.match(/^depth1_journey_mystery_[012]$/) &&
      this.config!.activeSkillTree.unlockedNodes!.has(n.id)
    ).length;
  }

  private isJourneyPrimaryMystery(node: SkillTreeNode): boolean {
    return !!node.id?.match(/^depth1_journey_mystery_[012]$/);
  }

  private handlePurchase(node: SkillTreeNode): boolean {
    if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION &&
        this.isJourneyPrimaryMystery(node) &&
        this.getJourneyPrimaryUnlockedCount() >= 2 &&
        !this.config.activeSkillTree.unlockedNodes?.has(node.id)) {
      this.showSelectionLimitMessage("max");
      return false;
    }
    const blockedMessage = this.getPurchaseBlockedMessage(node);
    if (blockedMessage) {
      this.modalMessage?.showText(blockedMessage, 0);
      (this.scene as BattleScene).ui.playError();
      this.scene.time.delayedCall(3000, () => {
        if (this.modalMessage) this.modalMessage.clear();
      });
      return false;
    }
    const ast = this.config!.activeSkillTree;

    if (node.isLevelLocked && node.branchUnlockCost != null) {
      const branchCost = node.branchUnlockCost;
      ast.skillPoints -= branchCost;
      node.isLevelLocked = false;
      node.cost = 0;
      if (node.pendingRewardData) {
        node.rewardData = node.pendingRewardData;
        delete node.pendingRewardData;
      }
      if (!ast.unlockedBranches) ast.unlockedBranches = new Set();
      ast.unlockedBranches.add(node.id);
      for (const n of this.nodes) {
        if (n.isLevelLocked && n.branchUnlockCost != null && n.branchUnlockCost < 4) {
          n.branchUnlockCost = 4;
        }
      }
      this.updateNodeStatesAndRender();
      this.updateFocusHighlight(node.id);
      this.updateHUD();
      (this.scene as BattleScene).gameData.localSaveAll(this.scene as BattleScene);
      (this.scene as BattleScene).playSound("ui/money");
      return true;
    }

    const nodeCost = this.getNodeCost(node);
    ast.skillPoints -= nodeCost;

    if (node.rewardData?.type === SkillTreeRewardType.POKEMON_ALT_BUILD) {
      const altBuildId = node.rewardData.data?.altBuildId as PokemonAltBuildId | undefined;
      const storedRank = node.rewardData.data?.rank || 1;
      if (altBuildId) {
        const purchasedRank = this.getEffectiveAltBuildRank(altBuildId, storedRank);
        const buildName = ChampionUtils.getAltBuildDisplayName(altBuildId);
        const purchasedRankLabel = purchasedRank >= 10
          ? `${Utils.intToRoman(10)}:${i18next.t("skillTree:rankMax")}`
          : Utils.intToRoman(purchasedRank);
        node.name = `${buildName} ${purchasedRankLabel}`;

        const nodeGen = new SkillTreeNodeGenerator(0, this.config?.activeSkillTree?.championId || this.config?.championData?.id || "red", this.scene);
        const dynamicRewardData = {
          ...node.rewardData,
          data: {
            ...node.rewardData.data,
            rank: purchasedRank
          }
        };
        node.description = nodeGen.getRewardDescription(dynamicRewardData) || node.description;
      }
    }

    node.state = SkillTreeNodeState.UNLOCKED; node.unlocked = true; ast.unlockedNodes.add(node.id);
    this.selectedNodeId = node.id;
    this.focusPreviewAnchorId = node.id;
    this.currentFocusPreviewNodes.clear();
    this.updateNodeStatesAndRender();

    (this.scene as BattleScene).gameData.tempSkillTreeTransform = (this.scene as BattleScene).gameData.tempSkillTreeTransform || {} as any;
    (this.scene as BattleScene).gameData.tempSkillTreeTransform.purchasedNodeId = node.id;

    if (this.config?.mode === SkillTreeMode.POKEMON_SELECTION && node.rewardData?.data?.starterMysteryNode) {
      this.applyRewardToGameState(node);

      try {
        const scene = this.scene as BattleScene;
        const nodeId = (node as any)?.id as string | undefined;
        const rt = node?.rewardData?.type as any;
        if (nodeId && nodeId !== "root_0" && rt) {
          let recordData: any = undefined;
          if (rt === SkillTreeRewardType.SIGNATURE_POKEMON || rt === SkillTreeRewardType.LEGENDARY_POKEMON || rt === SkillTreeRewardType.POKEMON_ALT_BUILD) {
            const species = node.rewardData?.data?.species;
            if (typeof species === "number") {
              recordData = { species };
            }
          } else if (rt === SkillTreeRewardType.TYPE_BALL_FILTERED) {
            const ballType = node.rewardData?.data?.ballType;
            if (typeof ballType === "number") {
              recordData = { ballType };
            }
          }
          scene.recordRunEndSummarySkillNodeObtained(nodeId, rt, recordData);
        }
      } catch {}

      (this.scene as BattleScene).gameData.localSaveAll(this.scene as BattleScene);
      (this.scene as BattleScene).playSound("ui/money");

      (this.scene.gameData as any).tempSkillTreeConfig = {
        ...this.config,
        nodes: this.nodes
      };
      (this.scene as BattleScene).unshiftPhase(new SkillTreeModifierPhase(this.scene as BattleScene, node as any, (this.config as any)?.championData));
      (this.scene as BattleScene).shiftPhase();
      this.updateFocusHighlight(node.id);
      return true;
    }

    this.applyReward(node);

    (this.scene as BattleScene).gameData.localSaveAll(this.scene as BattleScene);
    (this.scene as BattleScene).playSound("ui/money");
    this.updateFocusHighlight(node.id);
    return true;
  }

  private handleNodePurchase(node: SkillTreeNode): boolean {
    return this.handlePurchase(node);
  }

  private handlePokemonSelection(node: SkillTreeNode): boolean {
    return this.handleSelection(node);
  }

  private executeRewardPhaseWithReturn(phase: any): void {
    try {
      const gd = (this.scene as BattleScene).gameData as any;
      if (!gd.tempSkillTreeTransform) {
        gd.tempSkillTreeTransform = { scale: this.transform.scale, tx: this.transform.tx, ty: this.transform.ty };
      } else {
        gd.tempSkillTreeTransform.scale = this.transform.scale;
        gd.tempSkillTreeTransform.tx = this.transform.tx;
        gd.tempSkillTreeTransform.ty = this.transform.ty;
      }
      gd.tempSkillTreeTransform.selectedNodeId = this.selectedNodeId;
      gd.tempSkillTreeTransform.focusPreviewAnchorId = this.focusPreviewAnchorId;
    } catch {}

    const originalOnClose = this.config?.onClose;
    const originalPhaseOnComplete = this.config?.phaseOnComplete;
    const originalOnCancel = this.config?.onCancel;

    const returnConfig = {
      mode: this.config?.mode,
      onComplete: (originalPhaseOnComplete && this.config?.mode !== SkillTreeMode.BATTLE_ACCESS)
        ? () => originalPhaseOnComplete()
        : (originalOnClose && this.config?.mode !== SkillTreeMode.BATTLE_ACCESS) ? () => originalOnClose() : undefined,
      onCancel: originalOnCancel ? () => originalOnCancel() : undefined,
      shouldPlayPurchaseAnimation: true
    };

    (this.scene as BattleScene).unshiftPhase(phase);
    (this.scene as BattleScene).unshiftPhase(new SkillTreePhase(this.scene as BattleScene, returnConfig));
    (this.scene as BattleScene).shiftPhase();
  }

  private executeModifierRewardWithReturn(modifierTypeOrFunc: any | ModifierTypeFunc, isPerma: boolean = false, nodeRarity?: string): void {
    try {
      const gd = (this.scene as BattleScene).gameData as any;
      if (!gd.tempSkillTreeTransform) {
        gd.tempSkillTreeTransform = { scale: this.transform.scale, tx: this.transform.tx, ty: this.transform.ty };
      } else {
        gd.tempSkillTreeTransform.scale = this.transform.scale;
        gd.tempSkillTreeTransform.tx = this.transform.tx;
        gd.tempSkillTreeTransform.ty = this.transform.ty;
      }
      gd.tempSkillTreeTransform.selectedNodeId = this.selectedNodeId;
      gd.tempSkillTreeTransform.focusPreviewAnchorId = this.focusPreviewAnchorId;
    } catch {}

    const originalOnClose = this.config?.onClose;
    const originalPhaseOnComplete = this.config?.phaseOnComplete;
    const originalOnCancel = this.config?.onCancel;

    const returnConfig = {
      mode: this.config?.mode,
      onComplete: (originalPhaseOnComplete && this.config?.mode !== SkillTreeMode.BATTLE_ACCESS)
        ? () => originalPhaseOnComplete()
        : (originalOnClose && this.config?.mode !== SkillTreeMode.BATTLE_ACCESS) ? () => originalOnClose() : undefined,
      onCancel: originalOnCancel ? () => originalOnCancel() : undefined,
      shouldPlayPurchaseAnimation: true
    };

    const modifierRewardPhase = new ModifierRewardPhase(
      this.scene as BattleScene,
      modifierTypeOrFunc,
      isPerma,
      undefined,
      false,
      false,
      nodeRarity
    );

    (this.scene as BattleScene).unshiftPhase(modifierRewardPhase);
    (this.scene as BattleScene).unshiftPhase(new SkillTreePhase(this.scene as BattleScene, returnConfig));
    (this.scene as BattleScene).shiftPhase();
  }

  private applyReward(node: SkillTreeNode): void {
    this.applyRewardToGameState(node);

    try {
      const scene = this.scene as BattleScene;
      const nodeId = (node as any)?.id as string | undefined;
      const rt = node?.rewardData?.type as any;
      if (nodeId && nodeId !== "root_0" && rt) {
        let recordData: any = undefined;
        if (rt === SkillTreeRewardType.SIGNATURE_POKEMON || rt === SkillTreeRewardType.LEGENDARY_POKEMON || rt === SkillTreeRewardType.POKEMON_ALT_BUILD) {
          const species = node.rewardData?.data?.species;
          if (typeof species === "number") {
            recordData = { species };
          }
        } else if (rt === SkillTreeRewardType.TYPE_BALL_FILTERED) {
          const ballType = node.rewardData?.data?.ballType;
          if (typeof ballType === "number") {
            recordData = { ballType };
          }
        }
        scene.recordRunEndSummarySkillNodeObtained(nodeId, rt, recordData);
      }
    } catch {}

    if (node.rewardData?.type === SkillTreeRewardType.SKILL_POINTS) {
      const amount = node.rewardData.data?.amount || 0;
      if (amount > 0) {
        this.executeRewardPhaseWithReturn(new SkillTreeRewardPhase(this.scene as BattleScene, {
          skillPoints: amount,
          source: "skill_tree_node",
          rarity: node.rarity
        }));
        return;
      }
    }
    if (node.rewardData?.type === SkillTreeRewardType.SKILL_TREE_TOKENS) {
      const amount = node.rewardData.data?.amount || 0;
      if (amount > 0) {
        this.executeRewardPhaseWithReturn(new SkillTreeRewardPhase(this.scene as BattleScene, {
          tokens: amount,
          source: "skill_tree_node",
          rarity: node.rarity
        }));
        return;
      }
    }
    if (node.rewardData?.type === SkillTreeRewardType.GLITCH_FORM_UNLOCK) {
      const formKey = node.rewardData?.data?.formKey || node.rewardData?.data?.form || node.rewardData?.data?.key;
      if (formKey) {
        const cfg: RewardConfig = {
          type: RewardObtainedType.FORM,
          name: formKey,
          isGlitch: true,
          skillTreeRarity: node.rarity
        } as any;
        this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, cfg));
        return;
      }
    }
    if (node.rewardData?.type === SkillTreeRewardType.PERMA_MONEY) {
      try {
        const amt = node.rewardData?.data?.amount || 3000;
        const directType = new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", amt, true);
        if (directType) {
          this.executeModifierRewardWithReturn(() => directType, true, node.rarity);
          return;
        }
      } catch {  }
    }
    if (node.rewardData) {
      const t = node.rewardData.type;

      if (t === SkillTreeRewardType.ESSENCE_BUNDLE) {
        const type = node.rewardData.data?.type;
        const amount = node.rewardData.data?.amount || 0;

        if (typeof type !== "undefined") {
          const reward: RewardConfig = {
            type: RewardObtainedType.ESSENCE_BUNDLE,
            name: `${amount} ${Type[type]} Essence`,
            essenceType: type,
            amount: amount,
            skillTreeRarity: node.rarity
          };
          this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene, reward));
          return;
        }
      }

      if (t === SkillTreeRewardType.LEGENDARY_POKEMON) {
        const species = node.rewardData.data?.species;
        if (typeof species === "number") {
          const pokemonSpecies = getPokemonSpecies(species);
          if (pokemonSpecies) {
            const reward: RewardConfig = {
              type: RewardObtainedType.LEGENDARY_CATCHABLE,
              questSpriteId: species,
              unlockableSpriteType: UnlockModePokeSpriteType.NORMAL,
              skillTreeRarity: node.rarity
            };
            this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene, reward));
            return;
          }
        }
      }

      if (t === SkillTreeRewardType.TYPE_BALL_FILTERED) {
        const ballType = node.rewardData.data?.ballType;
        if (typeof ballType === "number") {
          const typeBallModifierFunc = () => new AddTypeBallModifierType(ballType as Type, 3);
          this.executeModifierRewardWithReturn(typeBallModifierFunc, false, node.rarity);
          return;
        }
      }

      const selectionTypes = new Set<SkillTreeRewardType>([
        SkillTreeRewardType.TM_FILTERED,
        SkillTreeRewardType.XM_FILTERED,
        SkillTreeRewardType.SIGNATURE_POKEMON,
        SkillTreeRewardType.GENERAL_POKEMON,
        SkillTreeRewardType.ABILITY_GRANT,
        SkillTreeRewardType.PASSIVE_ABILITY_GRANT,
        SkillTreeRewardType.PARTY_ABILITY_GRANT,
        SkillTreeRewardType.STAT_BOOST,
        SkillTreeRewardType.MOVE_UPGRADE,
        SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC,
        SkillTreeRewardType.MEGA_STONE,
        SkillTreeRewardType.DYNA_MUSHROOM,
        SkillTreeRewardType.GLITCH_CHANGE,
        SkillTreeRewardType.TYPE_SWITCHER,
        SkillTreeRewardType.TYPE_BOOSTER_ITEM,
        SkillTreeRewardType.POKEMON_ALT_BUILD,
        SkillTreeRewardType.TERA_TYPE,
        SkillTreeRewardType.ROGUEBALL_RARITY_SELECT,
        SkillTreeRewardType.MASTERBALL_RARITY_SELECT,
        SkillTreeRewardType.SMITTY_ABILITY,
        SkillTreeRewardType.HEALING_ITEMS,
        SkillTreeRewardType.BERRY_ITEMS,
        SkillTreeRewardType.PP_MAX_ITEM,
        SkillTreeRewardType.MEMORY_MUSHROOM,
        SkillTreeRewardType.GENERAL_ITEMS,
        SkillTreeRewardType.ABILITY_SWITCHER,
        SkillTreeRewardType.BATON_ITEM,
        SkillTreeRewardType.TRAINER_BOND_ABILITY,
        SkillTreeRewardType.TERA_ABILITY,
        SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN,
        SkillTreeRewardType.BOUNTY_SELECT,
      ]);
      if (selectionTypes.has(t)) {
        (this.scene.gameData as any).tempSkillTreeConfig = { ...(this.config || {}), nodes: this.nodes };
        let rewardChampionData = (this.config as any)?.championData;
        const rewardNodeTypes = node.rewardData?.data?.nodeTypes as Type[] | undefined;
        if (rewardNodeTypes && rewardNodeTypes.length > 0 && rewardChampionData) {
          rewardChampionData = { ...rewardChampionData, type1: rewardNodeTypes[0], type2: rewardNodeTypes[1] ?? Type.UNKNOWN, unlockedTypeBoosters: [...rewardNodeTypes], unlockedEssenceBundles: [...rewardNodeTypes], unlockedTypeSwitchers: [...rewardNodeTypes], unlockedTeraTypes: [...rewardNodeTypes] };
        }
        if (t === SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN) {
          const ast = this.config?.activeSkillTree;
          if (ast) {
            ast.unlockedNodes.delete(node.id);
            node.state = SkillTreeNodeState.LOCKED_VISIBLE;
            node.unlocked = false;
            const effectData = (ast.skillEffects as any)?.get?.(node.id) || {};
            effectData.timesUnlocked = (effectData.timesUnlocked || 0) + 1;
            effectData.baselineEligibleUnlockedCount = this.countEligibleUnlockedNodesForRandomGlitchPrereq(ast);
            (ast.skillEffects as Map<string, any>).set(node.id, effectData);
          }
        }
        (this.scene as BattleScene).unshiftPhase(new SkillTreeModifierPhase(this.scene as BattleScene, node as any, rewardChampionData));
        (this.scene as BattleScene).shiftPhase();
        return;
      }

      if (t === SkillTreeRewardType.EGG_VOUCHER) {
        const tier = node.rewardData?.data?.tier ?? VoucherType.REGULAR;
        const voucherModifierFunc = () => new AddVoucherModifierType(tier as VoucherType, 1);
        this.executeModifierRewardWithReturn(voucherModifierFunc, false, node.rarity);
        return;
      }

      if (t === SkillTreeRewardType.MONEY_REWARD) {
        let amount = node.rewardData?.data?.amount;
        if (!amount) {
          const scene = this.scene as BattleScene;
          const effectiveWave = scene.battlePathWave
            || scene.gameData?.gameStats?.highestWaveReached
            || 1;
          const waveSetIndex = Math.ceil(effectiveWave / 10) - 1;
          const moneyValue = Math.pow(
            (waveSetIndex + 1 + (0.75 + (((effectiveWave - 1) % 10) + 1) / 10)) * 100,
            1 + 0.005 * waveSetIndex
          ) * 10;
          amount = Math.floor(moneyValue / 10) * 10;
        }
        (this.scene as BattleScene).addMoney(amount);
        const reward: RewardConfig = {
          type: RewardObtainedType.MONEY,
          name: this.getRewardDisplayName(node),
          amount: amount,
          skillTreeRarity: node.rarity
        } as any;
        this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
        return;
      }

      if (t === SkillTreeRewardType.PERMA_ITEM) {
        const permaType = node.rewardData?.data?.permaType;
        if (permaType !== undefined && permaType !== null && typeof permaType === 'string') {
          const permaModifierFunc = (modifierTypes as any)[permaType];
          if (permaModifierFunc && typeof permaModifierFunc === 'function') {
            this.executeModifierRewardWithReturn(permaModifierFunc, true, node.rarity);
            return;
          }
          const permaTypeNumeric = PermaType[permaType as keyof typeof PermaType];
          if (permaTypeNumeric !== undefined) {
            const fallbackPermaFunc = () => {
              const type = new PermaModifierType(permaTypeNumeric, 500, PermaDuration.WAVE_BASED, 25);
              type.id = permaType;
              return type;
            };
            this.executeModifierRewardWithReturn(fallbackPermaFunc, true, node.rarity);
            return;
          }
        }
      }

      if (t === SkillTreeRewardType.GOLDEN_POKEBALL) {
        this.executeModifierRewardWithReturn(modifierTypes.GOLDEN_POKEBALL, false, node.rarity);
        return;
      }

      if (t === SkillTreeRewardType.MASTER_BALL) {
        this.executeModifierRewardWithReturn(modifierTypes.MASTER_BALL, false, node.rarity);
        return;
      }

      if (t === SkillTreeRewardType.VOID_BALL) {
        this.executeModifierRewardWithReturn(modifierTypes.VOID_BALL, false, node.rarity);
        return;
      }

      if (t === SkillTreeRewardType.ROGUE_BALL) {
        this.executeModifierRewardWithReturn(modifierTypes.ROGUE_BALL, false, node.rarity);
        return;
      }
      if (t === SkillTreeRewardType.ESSENCE_TYPE_WEIGHT) {
        const reward: RewardConfig = {
          type: RewardObtainedType.ESSENCE_BUNDLE,
          name: this.getRewardDisplayName(node),
          isInverted: true,
          skillTreeRarity: node.rarity
        } as any;
        this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
        return;
      }

      if (t === SkillTreeRewardType.FUSION_SECONDARY_PRIORITY) {
        const reward: RewardConfig = {
          type: RewardObtainedType.UNLOCK,
          name: this.getRewardDisplayName(node),
          sprite: "dna_splicers",
          skillTreeRarity: node.rarity
        } as any;
        this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
        return;
      }

      if (t === SkillTreeRewardType.CATCH_RATE_BONUS) {
        const reward: RewardConfig = {
          type: RewardObtainedType.UNLOCK,
          name: this.getRewardDisplayName(node),
          customAtlas: "smitems",
          sprite: "permaCatchRate",
          skillTreeRarity: node.rarity
        } as any;
        this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
        return;
      }
    }

    let reward: RewardConfig = {
      type: RewardObtainedType.UNLOCK,
      name: this.getRewardDisplayName(node),
      skillTreeRarity: node.rarity
    } as any;

    if (node.rewardData.type === SkillTreeRewardType.REVIVE_BOOST) {
      reward.sprite = "revive";
    }

    this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
  }

  private resolvePermaFactoryName(permaType: PermaType): string {
    switch (permaType) {
      case PermaType.PERMA_PARTY_ABILITY: return "PERMA_PARTY_ABILITY";
      case PermaType.PERMA_NEW_NORMAL: return "PERMA_NEW_NORMAL";
      case PermaType.PERMA_REROLL_COST_1: return "PERMA_REROLL_COST_1";
      case PermaType.PERMA_REROLL_COST_2: return "PERMA_REROLL_COST_2";
      case PermaType.PERMA_REROLL_COST_3: return "PERMA_REROLL_COST_3";
      case PermaType.PERMA_SHOW_REWARDS_1: return "PERMA_SHOW_REWARDS_1";
      case PermaType.PERMA_SHOW_REWARDS_2: return "PERMA_SHOW_REWARDS_2";
      case PermaType.PERMA_SHOW_REWARDS_3: return "PERMA_SHOW_REWARDS_3";
      case PermaType.PERMA_FUSION_INCREASE_1: return "PERMA_FUSION_INCREASE_1";
      case PermaType.PERMA_FUSION_INCREASE_2: return "PERMA_FUSION_INCREASE_2";
      case PermaType.PERMA_FUSION_INCREASE_3: return "PERMA_FUSION_INCREASE_3";
      case PermaType.PERMA_CATCH_RATE_1: return "PERMA_CATCH_RATE_1";
      case PermaType.PERMA_CATCH_RATE_2: return "PERMA_CATCH_RATE_2";
      case PermaType.PERMA_CATCH_RATE_3: return "PERMA_CATCH_RATE_3";
      case PermaType.PERMA_TRAINER_SNATCH_COST_1: return "PERMA_TRAINER_SNATCH_COST_1";
      case PermaType.PERMA_TRAINER_SNATCH_COST_2: return "PERMA_TRAINER_SNATCH_COST_2";
      case PermaType.PERMA_TRAINER_SNATCH_COST_3: return "PERMA_TRAINER_SNATCH_COST_3";
      case PermaType.PERMA_MORE_REVIVE_1: return "PERMA_MORE_REVIVE_1";
      case PermaType.PERMA_MORE_REVIVE_2: return "PERMA_MORE_REVIVE_2";
      case PermaType.PERMA_MORE_REVIVE_3: return "PERMA_MORE_REVIVE_3";
      case PermaType.PERMA_FREE_REROLL: return "PERMA_FREE_REROLL";
      case PermaType.PERMA_BETTER_LUCK_2: return "PERMA_BETTER_LUCK_2";
      case PermaType.PERMA_BETTER_LUCK_3: return "PERMA_BETTER_LUCK_3";
      case PermaType.PERMA_MORE_REWARD_CHOICE_1: return "PERMA_MORE_REWARD_CHOICE_1";
      case PermaType.PERMA_MORE_REWARD_CHOICE_2: return "PERMA_MORE_REWARD_CHOICE_2";
      case PermaType.PERMA_MORE_REWARD_CHOICE_3: return "PERMA_MORE_REWARD_CHOICE_3";
      case PermaType.PERMA_POST_BATTLE_MONEY_1: return "PERMA_POST_BATTLE_MONEY_1";
      case PermaType.PERMA_POST_BATTLE_MONEY_2: return "PERMA_POST_BATTLE_MONEY_2";
      case PermaType.PERMA_POST_BATTLE_MONEY_3: return "PERMA_POST_BATTLE_MONEY_3";
      case PermaType.PERMA_START_BALL_1: return "PERMA_START_BALL_1";
      case PermaType.PERMA_START_BALL_2: return "PERMA_START_BALL_2";
      case PermaType.PERMA_START_BALL_3: return "PERMA_START_BALL_3";
      case PermaType.PERMA_START_MONEY_1: return "PERMA_START_MONEY_1";
      case PermaType.PERMA_START_MONEY_2: return "PERMA_START_MONEY_2";
      case PermaType.PERMA_START_MONEY_3: return "PERMA_START_MONEY_3";
      case PermaType.PERMA_START_GLITCH_PIECES_1: return "PERMA_START_GLITCH_PIECES_1";
      case PermaType.PERMA_START_GLITCH_PIECES_2: return "PERMA_START_GLITCH_PIECES_2";
      case PermaType.PERMA_START_GLITCH_PIECES_3: return "PERMA_START_GLITCH_PIECES_3";
      case PermaType.PERMA_METRONOME_LEVELUP: return "PERMA_METRONOME_LEVELUP";
      case PermaType.PERMA_NEW_ROUND_TERA: return "PERMA_NEW_ROUND_TERA";
      case PermaType.PERMA_RUN_ANYTHING_2: return "PERMA_RUN_ANYTHING_2";
      case PermaType.PERMA_SHINY_1: return "PERMA_SHINY_1";
      case PermaType.PERMA_SHINY_2: return "PERMA_SHINY_2";
      case PermaType.PERMA_SHINY_3: return "PERMA_SHINY_3";
      case PermaType.PERMA_CHEAPER_FUSIONS_1: return "PERMA_CHEAPER_FUSIONS_1";
      case PermaType.PERMA_CHEAPER_FUSIONS_2: return "PERMA_CHEAPER_FUSIONS_2";
      case PermaType.PERMA_CHEAPER_FUSIONS_3: return "PERMA_CHEAPER_FUSIONS_3";
      case PermaType.PERMA_STARTER_POINT_LIMIT_INC_1: return "PERMA_STARTER_POINT_LIMIT_INC_1";
      case PermaType.PERMA_STARTER_POINT_LIMIT_INC_2: return "PERMA_STARTER_POINT_LIMIT_INC_2";
      case PermaType.PERMA_STARTER_POINT_LIMIT_INC_3: return "PERMA_STARTER_POINT_LIMIT_INC_3";
      case PermaType.PERMA_LONGER_TERA_1: return "PERMA_LONGER_TERA_1";
      case PermaType.PERMA_LONGER_TERA_2: return "PERMA_LONGER_TERA_2";
      case PermaType.PERMA_LONGER_TERA_3: return "PERMA_LONGER_TERA_3";
      case PermaType.PERMA_LONGER_STAT_BOOSTS_1: return "PERMA_LONGER_STAT_BOOSTS_1";
      case PermaType.PERMA_LONGER_STAT_BOOSTS_2: return "PERMA_LONGER_STAT_BOOSTS_2";
      case PermaType.PERMA_LONGER_STAT_BOOSTS_3: return "PERMA_LONGER_STAT_BOOSTS_3";
      case PermaType.PERMA_MORE_GLITCH_PIECES_1: return "PERMA_MORE_GLITCH_PIECES_1";
      case PermaType.PERMA_MORE_GLITCH_PIECES_2: return "PERMA_MORE_GLITCH_PIECES_2";
      case PermaType.PERMA_MORE_GLITCH_PIECES_3: return "PERMA_MORE_GLITCH_PIECES_3";
      case PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_1: return "PERMA_GLITCH_PIECE_MAX_PLUS_1";
      case PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_2: return "PERMA_GLITCH_PIECE_MAX_PLUS_2";
      case PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_3: return "PERMA_GLITCH_PIECE_MAX_PLUS_3";
      case PermaType.PERMA_TRANSFER_TERA: return "PERMA_TRANSFER_TERA";
      default: return "PERMA_NEW_NORMAL";
    }
  }

  private applyRewardToGameState(node: SkillTreeNode): void {
    if (!this.config) {
      return;
    }
    const ast = this.config.activeSkillTree;
    switch (node.rewardData?.type) {
      case SkillTreeRewardType.SKILL_POINTS: {
        const oldSp = ast.skillPoints || 0;
        const amount = node.rewardData.data?.amount || 0;
        ast.skillPoints += amount;
        break;
      }
      case SkillTreeRewardType.SKILL_TREE_TOKENS: {
        const oldTk = ast.tokens || 0;
        const amount = node.rewardData.data?.amount || 0;
        ast.tokens += amount;
        break;
      }
      case SkillTreeRewardType.ESSENCE_BUNDLE: {
        const data = node.rewardData.data || {};
        const type = data.type;
        const amount = data.amount || 0;
        const gameData = (this.scene as BattleScene).gameData as any;
        if (typeof type !== "undefined") {
          gameData.addEssence(type, amount);
        }
        break;
      }
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: {
        const data = node.rewardData.data || {};
        const type = data.type;
        const weight = data.weight || 0;
        ast.essenceTypeWeights = ast.essenceTypeWeights || {} as any;
        if (typeof type !== "undefined") {
          (ast.essenceTypeWeights as any)[type] = ((ast.essenceTypeWeights as any)[type] || 0) + weight;
        }
        break;
      }
      case SkillTreeRewardType.CATCH_RATE_BONUS: {
        const data = node.rewardData.data || {};
        const amount = data.amount || 0;
        const types = Array.isArray(data.types) ? data.types : [];
        ast.catchRateBonusByType = ast.catchRateBonusByType || {} as any;
        if (types.length > 0) {
          for (const t of types) {
            (ast.catchRateBonusByType as any)[t] = ((ast.catchRateBonusByType as any)[t] || 0) + amount;
          }
        } else {
          try {
		const cm = ChampionManager.getInstance();
            const champId = (this.scene as BattleScene).gameData.selectedChampionId || ast.championId || "apollo_diana";
            const c = cm.getChampionData(champId) as any;
            [c.type1, c.type2].filter((t: any) => t !== undefined && t !== null && t !== Type.UNKNOWN).forEach((t: number) => {
              (ast.catchRateBonusByType as any)[t] = ((ast.catchRateBonusByType as any)[t] || 0) + amount;
            });
          } catch {}
        }
        break;
      }
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: {
        const data = node.rewardData.data || {};
        const types = data.types || [];
        const species = data.species || [];
        const increment = data.chanceIncrement || 10;

        if (!ast.fusionPriorityChanceByType) {
          ast.fusionPriorityChanceByType = {};
        }
        if (!ast.fusionPriorityChanceBySpecies) {
          ast.fusionPriorityChanceBySpecies = {};
        }

        for (const type of types) {
          const currentChance = ast.fusionPriorityChanceByType[type] || 0;
          ast.fusionPriorityChanceByType[type] = Math.min(currentChance + increment, 100);
        }

        for (const spec of species) {
          const currentChance = ast.fusionPriorityChanceBySpecies[spec] || 0;
          ast.fusionPriorityChanceBySpecies[spec] = Math.min(currentChance + increment, 100);
        }
        break;
      }
      case SkillTreeRewardType.REVIVE_BOOST: {
        const data = node.rewardData.data || {};
        const types = data.types || [];
        const species = data.species || [];
        const increment = data.chanceIncrement || 5;

        if (!ast.reviveChanceByType) {
          ast.reviveChanceByType = {};
        }
        if (!ast.reviveChanceBySpecies) {
          ast.reviveChanceBySpecies = {};
        }

        for (const type of types) {
          const currentChance = ast.reviveChanceByType[type] || 0;
          ast.reviveChanceByType[type] = Math.min(currentChance + increment, 30);
        }

        for (const spec of species) {
          const currentChance = ast.reviveChanceBySpecies[spec] || 0;
          ast.reviveChanceBySpecies[spec] = Math.min(currentChance + increment, 30);
        }
        break;
      }
      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        const data = node.rewardData.data || {};
        const formKey = data.formKey || data.form || data.key;
        const questId = data.unlockableId as QuestUnlockables;

        if (formKey) {
          if (!Array.isArray(ast.unlockedGlitchForms)) ast.unlockedGlitchForms = [];
          if (!ast.unlockedGlitchForms.includes(formKey)) {
            ast.unlockedGlitchForms.push(formKey);
          }
        }

        if (questId && questId in QuestUnlockables) {
          const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(questId);

          if (!ast.sessionQuestUnlockables) {
            ast.sessionQuestUnlockables = {};
          }

          ast.sessionQuestUnlockables[questId] = { questUnlockData };
        }
        break;
      }
      case SkillTreeRewardType.PERMA_MONEY: {
        const data = node.rewardData.data || {};
        const amount = data.amount || 0;
        (this.scene as BattleScene).gameData.permaMoney = ((this.scene as BattleScene).gameData.permaMoney || 0) + amount;
        break;
      }
      case SkillTreeRewardType.LEGENDARY_POKEMON: {
        const data = node.rewardData.data || {};
        const species = data.species;
        const prioritize = !!data.prioritize;
        if (prioritize && typeof species === "number") {
          if (!ast.legendaryEncounterChanceBySpecies) {
            ast.legendaryEncounterChanceBySpecies = {};
          }
          const currentChance = ast.legendaryEncounterChanceBySpecies[species] || 0;
          ast.legendaryEncounterChanceBySpecies[species] = currentChance + 15;
        }
        break;
      }
      default:
        break;
    }
  }

  private updateHUD(skipLevelUp: boolean = false): void {
    if (!this.config) return;
    const ast = this.config.activeSkillTree;
    this.skillPointsText.setText(`x ${ast.skillPoints}`);
    this.treeLevelText.setText(i18next.t("skillTree:treeLevelShort", { level: ast.treeLevel, defaultValue: `Tree Lv ${ast.treeLevel}` }));

    const cost = SkillTreeUtils.getTokenCostForNextLevel(ast.treeLevel);
    const have = ast.tokens;
    const pct = Math.max(0, Math.min(1, cost > 0 ? (have / cost) : 1));

    const hudWidth = this.getWidth();
    const gaugeWidth = hudWidth;
    const maxFillWidth = gaugeWidth - 4;
    const targetFillWidth = Math.floor(maxFillWidth * pct);

    this.animateGaugeFill(targetFillWidth);

    this.treeLevelGaugeText.setText(`${have} / ${cost}`);

    if (!skipLevelUp) {
      this.batchAutoLevelUpIfAffordable();
    }

    try {
      if (this.config.mode === SkillTreeMode.POKEMON_SELECTION) {
        const isJourney = this.nodes.some(n => n.id?.startsWith("depth1_journey_mystery_"));
        if (isJourney) {
          const primaryCount = this.nodes.filter(n =>
            n?.id?.match(/^depth1_journey_mystery_[012]$/) &&
            this.config!.activeSkillTree.unlockedNodes.has(n.id)
          ).length;
          const fourthNode = this.nodes.find(n => n.id === "depth1_journey_mystery_3");
          const fourthDone = !fourthNode || this.config.activeSkillTree.unlockedNodes.has(fourthNode.id);
          let key: string;
          if (primaryCount >= 2 && !fourthDone) {
            key = "skillTree:instructionsJourneyFourthMystery";
          } else if (primaryCount >= 2 && fourthDone) {
            key = "skillTree:instructionsPokemonSelectionComplete";
          } else {
            key = primaryCount === 0
              ? "skillTree:instructionsJourneySelection"
              : "skillTree:instructionsJourneySelectionRemaining";
          }
          this.instructionsText.setText(i18next.t(key, { remaining: 2 - primaryCount }));
        } else {
          const { signatureCount: sigCount, generalCount: genCount, total } = this.countPokemonSelectionsFromUnlockedNodes();
          const remaining = 2 - total;
          const mysteryNode = this.nodes.find(n => !!n?.rewardData?.data?.starterMysteryNode);
          const mysteryExists = !!mysteryNode;
          const mysteryPurchased = mysteryNode ? this.config.activeSkillTree.unlockedNodes.has(mysteryNode.id) : true;

          let key: string;
          if (total >= 2) {
            key = (mysteryExists && !mysteryPurchased)
              ? "skillTree:instructionsPokemonSelectionMysteryRemaining"
              : "skillTree:instructionsPokemonSelectionComplete";
          } else if (remaining === 2) {
            key = "skillTree:instructionsPokemonSelection";
          } else if (sigCount === 0 && genCount < 2) {
            key = "skillTree:instructionsPokemonSelectionSignatureAvailable";
          } else {
            key = "skillTree:instructionsPokemonSelectionRemaining";
          }
          this.instructionsText.setText(i18next.t(key, { remaining }));
        }
      } else {
        const instructionsKey = this.getInstructionsKey();
        this.instructionsText.setText(i18next.t(instructionsKey));
      }

      this.updateInstructionBackground();
    } catch {
    }
  }

  private getEffectiveAltBuildRank(altBuildId: PokemonAltBuildId, storedRank: number): number {

    if (!this.scene) {
      return storedRank;
    }

    const party = (this.scene as BattleScene).getParty();
    const matchingPokemon = party.find(p => p.altBuildId === altBuildId);

    if (matchingPokemon && matchingPokemon.altBuildRank) {
      const currentRank = matchingPokemon.altBuildRank;
      const effectiveRank = Math.min(10, Math.max(currentRank + 1, storedRank));
      return effectiveRank;
    }

    return storedRank;
  }

  private getRewardDisplayName(node: SkillTreeNode): string {
    try {
      switch (node.rewardData?.type) {
        case SkillTreeRewardType.SKILL_POINTS:

          if (node.depth === 0) return node.name;
          return i18next.t("skillTree:rewards.skillPoints", { amount: node.rewardData.data?.amount });
        case SkillTreeRewardType.SKILL_TREE_TOKENS:
          return i18next.t("skillTree:rewards.tokens", { amount: node.rewardData.data?.amount });
        case SkillTreeRewardType.TM_FILTERED:
          return i18next.t("skillTree:rewards.tm", { move: allMoves?.[node.rewardData.data?.moveId]?.name });
        case SkillTreeRewardType.XM_FILTERED:
          return i18next.t("skillTree:rewards.xm", { move: allMoves?.[node.rewardData.data?.moveId]?.name });
        case SkillTreeRewardType.ESSENCE_BUNDLE:
          return i18next.t("skillTree:rewards.essenceBundle", { type: Type[node.rewardData.data?.type], amount: node.rewardData.data?.amount });
        case SkillTreeRewardType.STAT_BOOST: {
          const stats = (node.rewardData.data?.stats || []);
          const statNames = stats.map((s: any) => {
            return (Stat as any)[s] || "?";
          }).join(", ");

          try {
            const championId = this.config?.activeSkillTree?.championData?.id || this.config?.championData?.id;
            if (!championId) return node.name;

            const championName = ChampionUtils.getChampionDisplayName(championId);
            const flavorKey = `skillTree:rewards.statBoostFlavor_${championId}`;
            const flavorText = i18next.t(flavorKey, { defaultValue: "Training" });

            return i18next.t("skillTree:rewards.statBoostVitamin", {
              champion: championName,
              flavor: flavorText,
              stats: statNames
            });
          } catch {
            return node.name;
          }
        }
        case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
          return i18next.t("skillTree:rewards.typeBooster", { type: Type[node.rewardData.data?.type] });
        case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
          return node.name;
        case SkillTreeRewardType.MOVE_UPGRADE:
          return i18next.t("skillTree:rewards.moveUpgrade");
        case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
          return allAbilities?.[node.rewardData.data?.abilityId]?.name || i18next.t("skillTree:unknownReward");
        case SkillTreeRewardType.TERA_ABILITY:
          return allAbilities?.[node.rewardData.data?.abilityId]?.name || i18next.t("skillTree:unknownReward");
        case SkillTreeRewardType.GOLDEN_POKEBALL:
          return i18next.t("skillTree:rewards.goldenPokeball");
        case SkillTreeRewardType.MASTER_BALL:
          return i18next.t("skillTree:rewards.masterBall");
        case SkillTreeRewardType.VOID_BALL:
          return i18next.t("skillTree:rewards.voidBall");
        case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
          return i18next.t("skillTree:rewards.rogueballRarity");
        case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
          return i18next.t("skillTree:rewards.masterballRarity");
        case SkillTreeRewardType.EGG_VOUCHER:
          return i18next.t("skillTree:rewards.eggVoucher", { tier: VoucherType?.[node.rewardData.data?.tier] });
        case SkillTreeRewardType.MONEY_REWARD:
          return i18next.t("skillTree:rewards.relicGold");
        case SkillTreeRewardType.PERMA_MONEY:
          return i18next.t("skillTree:rewards.permaMoney", { amount: node.rewardData.data?.amount });
        case SkillTreeRewardType.CATCH_RATE_BONUS:
          return node.name;
        case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT:
          const typeValue = node.rewardData.data?.type;
          const typeName = typeof typeValue === 'string' ? typeValue : Type[typeValue];
          return i18next.t("skillTree:rewards.essenceTypeWeight", {
            type: typeName || "Unknown",
            weight: node.rewardData.data?.weight || 1
          });
        case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY:
          return node.name;
        case SkillTreeRewardType.REVIVE_BOOST:
          return node.name;
        case SkillTreeRewardType.TERA_TYPE:
          return i18next.t("skillTree:rewards.teraType", { type: Type[node.rewardData.data?.type] });
        case SkillTreeRewardType.MEGA_STONE: {
          const megaStoneId = node.rewardData.data?.megaStone || node.rewardData.data?.formChangeItem;
          const megaStoneKey = (FormChangeItem as any)?.[megaStoneId];
          const megaStoneName = megaStoneKey ? i18next.t(`modifierType:FormChangeItem.${megaStoneKey}`) : "?";
          return i18next.t("skillTree:rewards.megaStone", { item: megaStoneName });
        }
        case SkillTreeRewardType.DYNA_MUSHROOM:
          return i18next.t("skillTree:rewards.dynaMushroom");
        case SkillTreeRewardType.GLITCH_CHANGE:
          return i18next.t("skillTree:rewards.glitchChange");
        case SkillTreeRewardType.TYPE_SWITCHER:
          return i18next.t("skillTree:rewards.typeSwitcherGeneric");
        case SkillTreeRewardType.POKEMON_ALT_BUILD: {

          if (node.state === SkillTreeNodeState.UNLOCKED) {
            return node.name;
          }

          const altBuildId = node.rewardData.data?.altBuildId;
          if (!altBuildId) {
            return node.name;
          }

          const storedRank = node.rewardData.data?.rank || 1;
          const party = (this.scene as BattleScene).getParty();
          const matchingPokemon = party.find(p => p.altBuildId === (altBuildId as PokemonAltBuildId));
          const currentRank = matchingPokemon?.altBuildRank ?? 0;
          const effectiveRank = this.getEffectiveAltBuildRank(altBuildId as PokemonAltBuildId, storedRank);

          const buildName = ChampionUtils.getAltBuildDisplayName(altBuildId);
          const showMax = currentRank >= 10 || effectiveRank === 10;
          const rankLabel = showMax
            ? `${Utils.intToRoman(10)}:${i18next.t("skillTree:rankMax")}`
            : Utils.intToRoman(effectiveRank);
          const dynamicName = `${buildName} ${rankLabel}`;
          return dynamicName;
        }
        case SkillTreeRewardType.PERMA_ITEM:
          const permaType = (node as any)?.rewardData?.data?.permaType;
          if (permaType !== undefined && permaType !== null && typeof permaType === 'string') {
            const localeKey = `modifierType:ModifierType.PermaModifierType.${permaType}.name`;
            const localizedName = i18next.t(localeKey);
            return i18next.t("skillTree:rewards.permaItem", { item: localizedName });
          }
          return i18next.t("skillTree:rewards.permaItem", { item: "Unknown" });
        case SkillTreeRewardType.SIGNATURE_POKEMON: {
          try {
            const championId = this.config?.activeSkillTree?.championData?.id || this.config?.championData?.id;
            if (!championId) return node.name;

            const championName = ChampionUtils.getChampionDisplayName(championId);

            return i18next.t("skillTree:rewards.signaturePokemonMysteryName", {
              champion: championName
            });
          } catch {
            return node.name;
          }
        }

        case SkillTreeRewardType.GENERAL_POKEMON: {
          try {
            const championId = this.config?.activeSkillTree?.championData?.id || this.config?.championData?.id;
            if (!championId) return node.name;

            const championName = ChampionUtils.getChampionDisplayName(championId);

            return i18next.t("skillTree:rewards.generalPokemon", {
              champion: championName
            });
          } catch {
            return node.name;
          }
        }

        case SkillTreeRewardType.LEGENDARY_POKEMON: {
          const s = node.rewardData.data?.species;
          const pokemonName = s ? getPokemonSpecies(s)?.name : undefined;
          if (!pokemonName) {
            return node.name;
          }
          return i18next.t("skillTree:rewards.legendaryPokemon", { pokemon: pokemonName });
        }
        case SkillTreeRewardType.TRAINER_BOND_ABILITY: {
          const ChampionUtilsRef = ChampionUtils;
          const championName = ChampionUtilsRef.getChampionDisplayName(this.config?.activeSkillTree?.championId);
          return i18next.t("skillTree:rewards.trainerBondGeneric", { champion: championName });
        }
        case SkillTreeRewardType.TERA_ABILITY:
          return i18next.t("skillTree:rewards.teraAbilityGeneric");
        default:
          return node.name;
      }
    } catch {
      return node.name;
    }
  }

  private handleMenu(): boolean {
    this.resetSkillTree();

    return true;
  }

  private mergeLockedSkillsForDebug(target: any, locked: Record<string, any>): void {
    const push = (arr: any[], v: any) => { if (v !== undefined && !arr.includes(v)) arr.push(v); };
    for (const [, s] of Object.entries(locked || {})) {
      switch (s.rewardType as SkillTreeRewardType) {
        case SkillTreeRewardType.TM_FILTERED:
          target.unlockedTMs ||= [];
          push(target.unlockedTMs, s.unlockableId);
          break;
        case SkillTreeRewardType.XM_FILTERED:
          target.unlockedXMs ||= [];
          push(target.unlockedXMs, s.unlockableId);
          break;
        case SkillTreeRewardType.ABILITY_GRANT:
        case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
          target.unlockedAbilities ||= [];
          push(target.unlockedAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.TRAINER_BOND_ABILITY:
          target.unlockedConditionalAbilities ||= [];
          push(target.unlockedConditionalAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.MEGA_STONE:
          target.unlockedMegaStones ||= [];
          push(target.unlockedMegaStones, s.unlockableId);
          break;
        case SkillTreeRewardType.POKEMON_ALT_BUILD:
          target.unlockedAltBuilds ||= [];
          push(target.unlockedAltBuilds, s.unlockableId);
          break;
        case SkillTreeRewardType.MOVE_UPGRADE:
          target.unlockedMoveUpgrades ||= [];
          push(target.unlockedMoveUpgrades, s.unlockableId);
          break;
        case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
          target.unlockedMoveAttrUpgrades ||= [];
          break;
        case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
          target.unlockedTypeBoosters ||= [];
          push(target.unlockedTypeBoosters, s.unlockableId);
          break;
        case SkillTreeRewardType.TERA_ABILITY:
          if (typeof s.unlockableId === "object" && s.unlockableId &&
              (s.unlockableId as any).type !== undefined &&
              (s.unlockableId as any).ability !== undefined) {
            target.unlockedTeraAbilities ||= {};
            const t = (s.unlockableId as any).type;
            const a = (s.unlockableId as any).ability;
            if (target.unlockedTeraAbilities[t] === undefined) {
              target.unlockedTeraAbilities[t] = a;
            }
          }
          break;
        case SkillTreeRewardType.SMITTY_ABILITY:
          target.unlockedSmittyAbilities ||= [];
          push(target.unlockedSmittyAbilities, s.unlockableId);
          break;
        case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
          try {
            const questUnlockData = (this.scene as BattleScene).gameData.getQuestUnlockDataFromModifierTypes(s.unlockableId as QuestUnlockables);
            if (questUnlockData && questUnlockData.rewardId) {
              const species = getPokemonSpecies(questUnlockData.rewardId as Species);
              if (species) {
                const formName = species.getGlitchFormName(true, undefined, questUnlockData.rewardType);
                if (formName) {
                  target.unlockedGlitchForms ||= [];
                  push(target.unlockedGlitchForms, formName.toLowerCase());
                  target.glitchFormUnlockableIds ||= {};
                  target.glitchFormUnlockableIds[formName.toLowerCase()] = s.unlockableId;
                }
              }
            }
          } catch (error) {
            console.warn("Failed to process glitch form unlock:", error);
          }
          break;
        case SkillTreeRewardType.HEALING_ITEMS:
          target.unlockedHealingItems = true;
          break;
        case SkillTreeRewardType.MEMORY_MUSHROOM:
          target.unlockedMemoryMushroom = true;
          break;
        case SkillTreeRewardType.BERRY_ITEMS:
          target.unlockedBerries = true;
          break;
        case SkillTreeRewardType.ABILITY_SWITCHER:
          target.unlockedAbilitySwitchers = true;
          break;
        case SkillTreeRewardType.GENERAL_ITEMS:
          target.unlockedGeneralItems = true;
          break;
        case SkillTreeRewardType.BATON_ITEM:
          target.unlockedBaton = true;
          break;
        case SkillTreeRewardType.PP_MAX_ITEM:
          target.unlockedPPMax = true;
          break;
        case SkillTreeRewardType.ROGUE_BALL:
          target.unlockedRogueBall = true;
          break;
        default:
          break;
      }
    }
  }

  private resetSkillTree(): void {
    if (!this.config) {
      return;
    }

    const gd = (this.scene as BattleScene).gameData as any;
    const scene = this.scene as BattleScene;

    const isDebugMode = this.config.mode === SkillTreeMode.DEBUG_ENHANCED;

    let debugChampSwapContext: { prev: any; championId: string; champStore: any } | null = null;
    if (isDebugMode) {
      const championId = this.config.activeSkillTree.championId;
      let manager: ChampionManager;
      try {
        manager = ChampionManager.getInstance();
      } catch {
        ChampionManager.initialize(this.scene.gameData);
        manager = ChampionManager.getInstance();
      }
      const original = manager.getChampionData(championId);
      const defLocked = (CHAMPION_DEFINITIONS[championId] as any)?.lockedSkills || {};

      const debugChamp = JSON.parse(JSON.stringify(original));
      this.mergeLockedSkillsForDebug(debugChamp, defLocked);

      const champStore = (scene.gameData as any).championData;
      const prev = champStore[championId];
      champStore[championId] = debugChamp;
      debugChampSwapContext = { prev, championId, champStore };

      (scene as any).skillTreeEligibilityBypass = true;
    }

    const hadCache = !!gd.tempSkillTreeNodes;
    const cachedCount = gd.tempSkillTreeNodes?.length || 0;
    delete gd.tempSkillTreeNodes;

    const prevNodesCount = this.nodes.length;
    const prevSpritesCount = this.nodeSprites.size;
    const prevConnectionsCount = this.connectionLines.length;

    this.nodes = [];
    this.selections = [];

    const originalSeed = this.config.activeSkillTree.seed;
    this.config.activeSkillTree.seed = Date.now() + Math.floor(Math.random() * 1000000);

    this.config.mode = SkillTreeMode.DEBUG_ENHANCED;

    this.generateSkillTree();

    const newCachedCount = gd.tempSkillTreeNodes?.length || 0;

    this.renderTree();

    this.updateHUD();

    this.fitViewToVisibleNodes();

    const visibleNodes = this.getVisibleNodes();

    if (visibleNodes.length > 0) {
      const rootNode = visibleNodes.find(n => n.id === "root_0" || n.depth === 0);
      this.selectedNodeId = rootNode ? rootNode.id : visibleNodes[0].id;

      this.updateNodeStatesAndRender();
    }

    if (isDebugMode) {
      try {
        delete (scene as any).skillTreeEligibilityBypass;
      } catch (e) {
      }

      if (debugChampSwapContext) {
        debugChampSwapContext.champStore[debugChampSwapContext.championId] = debugChampSwapContext.prev;
      }
    }
  }

  private handleStatsTest(): boolean {
    if (!this.config) return false;
    const ast = this.config.activeSkillTree;
    ast.tokens += 1;

    if (this.config.mode === SkillTreeMode.POKEMON_SELECTION) {
      this.debugDepthOverride = Math.max(this.debugDepthOverride, ast.maxVisibleDepth);
      this.generateSkillTree();
      this.renderTree();
    }

    this.updateHUD();
    return true;
  }

  private showTreeLevelUpDialog(): void {
    if (!this.config) return;
    const ast = this.config.activeSkillTree;
    const cost = SkillTreeUtils.getTokenCostForNextLevel(ast.treeLevel);

    this.hideTooltip();

    (this.scene as BattleScene).ui.showText(
      i18next.t("skillTree:levelUpPrompt", { cost, currentLevel: ast.treeLevel, nextLevel: ast.treeLevel + 1, defaultValue: `Spend ${cost} tokens to level up?` }),
      null,
      () => this.levelUpSkillTree(),
      () => {},
      true
    );
  }

  private levelUpSkillTree(): void {
    if (!this.config) return;
    const ast = this.config.activeSkillTree;
    const cost = SkillTreeUtils.getTokenCostForNextLevel(ast.treeLevel);
    if (ast.tokens < cost) return;
    ast.tokens -= cost;
    ast.treeLevel += 1;
    if (!isSkillTreeV2()) {
      ast.maxVisibleDepth = SkillTreeUtils.getMaxDepthForLevel(ast.treeLevel);
    }
    (this.scene as BattleScene).gameData.tempSkillTreeTransform = (this.scene as BattleScene).gameData.tempSkillTreeTransform || {} as any;
    (this.scene as BattleScene).gameData.tempSkillTreeTransform.treeLeveledUp = true;
    const reward: RewardConfig = {
      type: RewardObtainedType.UNLOCK,
      name: isSkillTreeV2()
        ? i18next.t("skillTree:treeLeveledUpV2", { level: ast.treeLevel, maxDepth: SkillTreeUtils.getMaxPurchasableDepthForLevel(ast.treeLevel), defaultValue: `Tree Level ${ast.treeLevel}! Can purchase nodes up to depth ${SkillTreeUtils.getMaxPurchasableDepthForLevel(ast.treeLevel)}.` })
        : i18next.t("skillTree:treeLeveledUp", { level: ast.treeLevel, maxDepth: ast.maxVisibleDepth, defaultValue: `Tree leveled up!` })
    };
    this.executeRewardPhaseWithReturn(new RewardObtainDisplayPhase(this.scene as BattleScene, reward));
  }
  private evaluateNodePrerequisites(node: SkillTreeNode, forDisplay: boolean = false): { ok: boolean; messages: string[] } {
    const messages: string[] = [];
    let ok = true;
    try {
      switch (node.rewardData?.type) {
        case SkillTreeRewardType.POKEMON_ALT_BUILD: {
          const altBuildId = node.rewardData.data?.altBuildId as string | undefined;
          const isSignatureAltBuild = node.rewardData.data?.signatureAltBuild === true || !altBuildId;
          if (isSignatureAltBuild) {
            const party = (this.scene as BattleScene).getParty();
            const sigSpeciesIds = party.filter(p => p.isSignature).map(p => p.species.speciesId);
            const champData = (this.config as any)?.championData || (this.config as any)?.activeSkillTree?.championData;
            const unlocked = (champData?.unlockedAltBuilds || []) as PokemonAltBuildId[];
            const hasEligible = unlocked.some((id) => {
              const def = POKEMON_ALT_BUILDS[id];
              const species = def?.species;
              if (!species || !sigSpeciesIds.includes(species)) return false;
              const currentRank = party.find(p => p.altBuildId === id)?.altBuildRank ?? 0;
              if (currentRank >= 10) return false;
              const nextRank = currentRank + 1;
              if (def?.prerequisiteBuilds?.length && nextRank === 1) {
                const prereqId = def.prerequisiteBuilds[0];
                const prereqDef = POKEMON_ALT_BUILDS[prereqId];
                const prereqSpecies = prereqDef?.species;
                if (prereqSpecies) {
                  return party.some(p =>
                    (p.species.speciesId === prereqSpecies && p.altBuildId === prereqId) ||
                    (p.isFusion() && p.fusionSpecies?.speciesId === prereqSpecies && p.altBuildId === prereqId)
                  );
                }
                return party.some(p => p.altBuildId === prereqId);
              }
              return true;
            });
            const line = i18next.t("skillTree:prereq.signatureAltBuild", {
              defaultValue: "Have a Signature Pokémon eligible for an Alt Build upgrade"
            });
            if (forDisplay) messages.push(line);
            if (!hasEligible) { if (!forDisplay) messages.push(line); ok = false; }
            break;
          }
          if (altBuildId) {
            const altBuild = POKEMON_ALT_BUILDS[altBuildId as PokemonAltBuildId];
            if (altBuild) {
              const storedRank = node.rewardData.data?.rank || 1;
              const effectiveRank = this.getEffectiveAltBuildRank(altBuildId as PokemonAltBuildId, storedRank);
              const nodeRank = effectiveRank;

              if (altBuild.prerequisiteBuilds && altBuild.prerequisiteBuilds.length > 0) {
                if (nodeRank === 1) {
                  const prereqBuild = POKEMON_ALT_BUILDS[altBuild.prerequisiteBuilds[0]];
                  if (prereqBuild && prereqBuild.species) {
                    const hasPrereq = (this.scene as BattleScene).getParty().some(p =>
                      (p.species.speciesId === prereqBuild.species && p.altBuildId === altBuild.prerequisiteBuilds![0]) ||
                      (p.isFusion() && p.fusionSpecies?.speciesId === prereqBuild.species && p.altBuildId === altBuild.prerequisiteBuilds![0])
                    );
                    const prereqName = ChampionUtils.getAltBuildDisplayName(altBuild.prerequisiteBuilds[0]);
                    const line = i18next.t("skillTree:prereq.altBuildPrereq", { species: getPokemonSpecies(prereqBuild.species).name, build: prereqName });
                    if (forDisplay) messages.push(line);
                    if (!hasPrereq) { if (!forDisplay) messages.push(line); ok = false; }
                  }
                } else {
                  const requiredPreviousRank = nodeRank - 1;
                  const hasPrereq = (this.scene as BattleScene).getParty().some(p =>
                    (p.altBuildId === altBuildId && p.altBuildRank && p.altBuildRank >= requiredPreviousRank)
                  );
                  const buildName = ChampionUtils.getAltBuildDisplayName(altBuildId);
                  const rankRoman = Utils.intToRoman(requiredPreviousRank);
                  const line = i18next.t("skillTree:prereq.altBuildRankPrereq", {
                    species: getPokemonSpecies(altBuild.species!).name,
                    build: buildName,
                    rank: rankRoman
                  });
                  if (forDisplay) messages.push(line);
                  if (!hasPrereq) { if (!forDisplay) messages.push(line); ok = false; }
                }
              } else if (altBuild.species) {
                const has = (this.scene as BattleScene).getParty().some(p => p.species.speciesId === altBuild.species || (p.isFusion() && p.fusionSpecies?.speciesId === altBuild.species));
                const line = i18next.t("skillTree:prereq.altBuild", { species: getPokemonSpecies(altBuild.species).name });
                if (forDisplay) messages.push(line);
                if (!has) { if (!forDisplay) messages.push(line); ok = false; }
              }
            }
          }
          break;
        }
        case SkillTreeRewardType.MEGA_STONE: {
          const item: FormChangeItem | undefined = node.rewardData.data?.megaStone ?? node.rewardData.data?.formChangeItem;
          if (typeof item !== "undefined") {
            const speciesList = this.getSpeciesForFormChangeItem(item);
            const has = (this.scene as BattleScene).getParty().some(p => speciesList.includes(p.species.speciesId) || (p.isFusion() && !!p.fusionSpecies && speciesList.includes(p.fusionSpecies.speciesId)));
            if (!has) {
              const itemName = (FormChangeItem as any)[item];
              if (speciesList.length === 1) {
                messages.push(i18next.t("skillTree:prereq.megaStone", { item: itemName, species: getPokemonSpecies(speciesList[0]).name }));
              } else {
                messages.push(i18next.t("skillTree:prereq.megaStoneAny", { item: itemName }));
              }
              ok = false;
            }
          }
          break;
        }
        case SkillTreeRewardType.DYNA_MUSHROOM: {
          const speciesList = this.getSpeciesForFormChangeItem(FormChangeItem.MAX_MUSHROOMS as any);
          const has = (this.scene as BattleScene).getParty().some(p => speciesList.includes(p.species.speciesId) || (p.isFusion() && !!p.fusionSpecies && speciesList.includes(p.fusionSpecies.speciesId)));
          if (!has) {
            messages.push(i18next.t("skillTree:prereq.maxMushrooms"));
            ok = false;
          }
          break;
        }
        case SkillTreeRewardType.GLITCH_CHANGE: {
          const hasEligible = (this.scene as BattleScene).getParty().some(p => (this.scene as BattleScene).gameData.canUseGlitchOrSmittyForm(p.species.speciesId, RewardType.GLITCH_FORM_A));
          if (!hasEligible) {
            messages.push(i18next.t("skillTree:prereq.glitchChange"));
            ok = false;
          }
          break;
        }
        default:
          break;
      }
    } catch (_e) {  }
    return { ok, messages };
  }

  private getSpeciesForFormChangeItem(item: FormChangeItem): Species[] {
    const speciesIds: Species[] = [];
    try {
      const keys = Object.keys(pokemonFormChanges);
      for (const k of keys) {
        const s = parseInt(k) as Species;
        const changes = (pokemonFormChanges as any)[k] as SpeciesFormChange[];
        if (changes?.some(fc => typeof (fc as any).hasMatchingItemTrigger === 'function'
          ? (fc as any).hasMatchingItemTrigger(item)
          : ((fc.findTrigger(SpeciesFormChangeItemTrigger as any) as any)?.item === item))) {
          speciesIds.push(s);
        }
      }
    } catch {  }
    return speciesIds;
  }

  private applyTransform(): void {
    this.skillTreeContent.setScale(this.transform.scale);
    this.skillTreeContent.setPosition(this.getWidth() / 2 + this.transform.tx, this.getHeight() / 2 + this.transform.ty);

    if (Overrides.SKILL_TREE_ZOOM_UI_OVERRIDE && this.zoomLevelText) {
      const zoomPercent = Math.round(this.transform.scale * 100);
      this.zoomLevelText.setText(i18next.t("skillTree:zoomLevel", { percent: zoomPercent }));
    }

    if (this.tooltip && this.tooltip.visible && this.tooltipTargetNodeId) {
      const node = this.nodes.find(n => n.id === this.tooltipTargetNodeId);
      if (node) {
        const { width: tooltipWidth, height: tooltipHeight } = this.calculateTooltipDimensions(node);
        this.positionTooltip(node, tooltipWidth, tooltipHeight);
      }
    }
  }

  private getChampionTypes(): Type[] {
    try {
      if (this.config?.championData) {
        const champData = this.config.championData;
        const types: Type[] = [];

        if (typeof champData.type1 === 'number') types.push(champData.type1);
        if (typeof champData.type2 === 'number') types.push(champData.type2);

        if (types.length > 0) {
          return types;
        }
      }

      if (this.config?.activeSkillTree?.championId) {
        const championId = this.config.activeSkillTree.championId;
        const champDef = CHAMPION_DEFINITIONS[championId];

        if (champDef) {
          const types: Type[] = [];
          if (typeof champDef.type1 === 'number') types.push(champDef.type1);
          if (typeof champDef.type2 === 'number') types.push(champDef.type2);

          if (types.length > 0) {
            return types;
          }
        }
      }

      return [Type.NORMAL];
    } catch {
      return [Type.NORMAL];
    }
  }

  private animateGaugeFill(targetWidth: number): void {
    if (targetWidth === this.currentGaugeFillWidth) return;

    const state = { w: this.currentGaugeFillWidth };

    this.scene.tweens.add({
      targets: state,
      w: targetWidth,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.updateGaugeFillVisual(Math.floor(state.w));
      },
      onComplete: () => {
        this.currentGaugeFillWidth = targetWidth;
      }
    });
  }

  private updateGaugeFillVisual(fillWidth: number): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD;
    const hudWidth = this.getWidth();
    const maxFillWidth = hudWidth - 4;

    this.treeLevelGaugeFill.clear();

    if (fillWidth > 0) {
      const championTypes = this.getChampionTypes();
      const primaryType = championTypes[0] || Type.NORMAL;

      this.drawGaugeBaseFill(
        this.treeLevelGaugeFill,
        -maxFillWidth / 2,
        c.LEVEL_GAUGE.FILL_Y,
        fillWidth,
        c.LEVEL_GAUGE.FILL_HEIGHT,
        primaryType
      );
    }
  }

  private updateGaugeWaveOverlay(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD;
    const hudWidth = this.getWidth();
    const maxFillWidth = hudWidth - 4;

    this.treeLevelGaugeWaveOverlay.clear();

    if (this.currentGaugeFillWidth > 0) {
      const championTypes = this.getChampionTypes();
      const primaryType = championTypes[0] || Type.NORMAL;

      this.drawGaugeWaveEffects(
        this.treeLevelGaugeWaveOverlay,
        -maxFillWidth / 2,
        c.LEVEL_GAUGE.FILL_Y,
        this.currentGaugeFillWidth,
        c.LEVEL_GAUGE.FILL_HEIGHT,
        primaryType
      );
    }
  }

  private drawGaugeWaveEffects(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, type: Type): void {
    if (width <= 0 || height <= 0) return;

    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD.LEVEL_GAUGE;
    const waveConfig = c.WAVE_ANIMATION;
    const typeRgb = getTypeRgb(type);

    const fillRatio = Math.min(1, width / 200);
    const waveSteps = Math.max(8, Math.floor(40 * fillRatio));

    const brightR = Math.min(255, Math.floor(typeRgb[0] * waveConfig.ENERGY_WAVE_BRIGHTNESS));
    const brightG = Math.min(255, Math.floor(typeRgb[1] * waveConfig.ENERGY_WAVE_BRIGHTNESS));
    const brightB = Math.min(255, Math.floor(typeRgb[2] * waveConfig.ENERGY_WAVE_BRIGHTNESS));
    const brightColor = (brightR << 16) | (brightG << 8) | brightB;

    const timeOffset = (x + width * 0.5) * 0.002;
    const wavePhase = this.waveAnimationTime * waveConfig.WAVE_SPEED * waveConfig.ENERGY_WAVE_SPEED_MULTIPLIER + timeOffset;
    const waveProgress = ((wavePhase % (Math.PI * 2)) / (Math.PI * 2));
    const waveWidth = width * 0.5;
    const waveCenter = x - waveWidth * 0.5 + waveProgress * (width + waveWidth);

    for (let i = 0; i < waveSteps; i++) {
      const stepX = waveCenter - waveWidth * 0.5 + (i / waveSteps) * waveWidth;
      const stepWidth = waveWidth / waveSteps;

      if (stepX < x + width && stepX + stepWidth > x) {
        const distanceFromCenter = Math.abs(stepX + stepWidth * 0.5 - waveCenter);
        const normalizedDistance = distanceFromCenter / (waveWidth * 0.5);

        const waveAlpha = Math.cos(normalizedDistance * Math.PI * 0.5);
        const energyAlpha = Math.max(0, waveAlpha * waveAlpha) * waveConfig.ENERGY_WAVE_ALPHA;

        if (energyAlpha > 0.01) {
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
  private drawGaugeBaseFill(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, type: Type): void {
    if (width <= 0 || height <= 0) return;

    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD.LEVEL_GAUGE;
    const typeRgb = getTypeRgb(type);

    const baseColor = Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]);
    graphics.fillStyle(baseColor, c.FILL_ALPHA);
    graphics.fillRect(x, y, width, height);

    const verticalSteps = 6;
    for (let step = 0; step < verticalSteps; step++) {
      const stepY = y + (step / verticalSteps) * height;
      const stepHeight = height / verticalSteps;

      const gradientFactor = 1 - (step / verticalSteps) * 0.4;
      const gradientR = Math.min(255, Math.floor(typeRgb[0] * gradientFactor));
      const gradientG = Math.min(255, Math.floor(typeRgb[1] * gradientFactor));
      const gradientB = Math.min(255, Math.floor(typeRgb[2] * gradientFactor));
      const gradientColor = Phaser.Display.Color.GetColor(gradientR, gradientG, gradientB);

      graphics.fillStyle(gradientColor, 0.4);
      graphics.fillRect(x, stepY, width, stepHeight);
    }
  }

  private startWaveAnimation(): void {
    if (this.waveAnimationTimer) {
      this.waveAnimationTimer.remove(false);
      this.waveAnimationTimer = undefined;
    }
    this.waveAnimationTime = 0;
    if (this.treeLevelGaugeWaveOverlay) this.treeLevelGaugeWaveOverlay.clear();

    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD.LEVEL_GAUGE.WAVE_ANIMATION;
    this.waveAnimationTimer = this.scene.time.addEvent({
      delay: 1000 / c.UPDATE_FREQUENCY,
      loop: true,
      callback: () => this.updateWaveAnimation()
    });
  }

  private updateWaveAnimation(): void {
    const c = SkillTreeUiHandler.UI_CONSTANTS.HUD.LEVEL_GAUGE.WAVE_ANIMATION;
    this.waveAnimationTime += c.WAVE_SPEED;

    const hudWidth = this.getWidth();
    const maxFillWidth = hudWidth - 4;
    const fillPercentage = this.currentGaugeFillWidth / maxFillWidth;

    if (fillPercentage > 0.1) {
      this.updateGaugeWaveOverlay();
    }
  }

  private cleanupWaveAnimation(): void {
    if (this.waveAnimationTimer) {
      this.waveAnimationTimer.remove(false);
      this.waveAnimationTimer = undefined;
    }
    this.waveAnimationTime = 0;

    if (this.treeLevelGaugeFill) {
      this.treeLevelGaugeFill.clear();
    }
    if (this.treeLevelGaugeWaveOverlay) {
      this.treeLevelGaugeWaveOverlay.clear();
    }
  }

  private computeAffordableLevelUps(ast: ActiveSkillTreeData): { levels: number; totalCost: number; finalLevel: number } {
    let levels = 0;
    let totalCost = 0;
    let levelCursor = ast.treeLevel;
    let remaining = ast.tokens;
    while (true) {
      const cost = SkillTreeUtils.getTokenCostForNextLevel(levelCursor);
      if (cost <= 0) break;
      if (remaining < cost) break;
      remaining -= cost;
      totalCost += cost;
      levelCursor += 1;
      levels += 1;
    }
    return { levels, totalCost, finalLevel: levelCursor };
  }

  private async batchAutoLevelUpIfAffordable(): Promise<void> {
    if (!this.config) return;
    if (this.autoBatchLevelUpInProgress) return;
    const ast = this.config.activeSkillTree;
    const plan = this.computeAffordableLevelUps(ast);
    if (plan.levels <= 0) return;
    this.autoBatchLevelUpInProgress = true;
    try {
      const label = i18next.t("championSelect:levelUp", { defaultValue: "LEVEL UP!" });

      const championId = ast.championId || this.config?.championData?.id;
      const topLine = i18next.t("skillTree:title", { defaultValue: "Skill Tree" }).toUpperCase();
      const revealConfig = championId
        ? buildChampionSpriteRevealConfig(this.scene as BattleScene, championId, topLine)
        : undefined;

      if (!this.isEnhancedDebugMode) {
        const currentBgmKey = (this.scene as any).bgm?.key || null;
        if (!isSkillTreeV2()) {
          const previousScale = this.DEFAULT_ZOOM;
          const previousTx = this.transform.tx;
          const previousTy = this.transform.ty;
          this.transform.scale = 0.05;
          this.transform.tx = 0;
          this.transform.ty = 0;
          this.applyTransform();

          this.isLevelUpAnimationActive = true;
          await playGenericLevelUpAnimation(this.scene as BattleScene, label, undefined, revealConfig, false, currentBgmKey);
          this.isLevelUpAnimationActive = false;

          this.transform.scale = previousScale;
          this.transform.tx = previousTx;
          this.transform.ty = previousTy;
          this.applyTransform();
        } else {
          this.isLevelUpAnimationActive = true;
          await playGenericLevelUpAnimation(this.scene as BattleScene, label, undefined, revealConfig, false, currentBgmKey);
          this.isLevelUpAnimationActive = false;
        }
      }
      let levelCursor = ast.treeLevel;
      let tokens = ast.tokens;
      for (let i = 0; i < plan.levels; i++) {
        const cost = SkillTreeUtils.getTokenCostForNextLevel(levelCursor);
        if (cost <= 0 || tokens < cost) break;
        tokens -= cost;
        levelCursor += 1;
      }
      const oldMaxDepth = ast.maxVisibleDepth;

      ast.tokens = tokens;
      ast.treeLevel = levelCursor;
      if (!isSkillTreeV2()) {
        ast.maxVisibleDepth = SkillTreeUtils.getMaxDepthForLevel(ast.treeLevel);
      }

      if (this.config.mode === SkillTreeMode.POKEMON_SELECTION) {
        this.debugDepthOverride = Math.max(this.debugDepthOverride, ast.maxVisibleDepth);
        this.generateSkillTree();
      }

      let newlyVisibleNodes: SkillTreeNode[] = [];
      if (!isSkillTreeV2()) {
        newlyVisibleNodes = this.nodes.filter(node =>
          node.depth <= ast.maxVisibleDepth &&
          node.depth > oldMaxDepth
        );
      }

      this.updateNodeStatesAndRender();
      this.updateHUD();

      this.hideTooltip();

      if (newlyVisibleNodes.length > 0) {
        this.playDepthRevealEffect(newlyVisibleNodes);
      }
      try { (this.scene as BattleScene).gameData.localSaveAll(this.scene as BattleScene); } catch {}
    } finally {
      this.autoBatchLevelUpInProgress = false;
      this.isLevelUpAnimationActive = false;
    }
  }

  private zoomToNode(node: SkillTreeNode, zoomLevel: number = 1.5): void {
    this.transform.scale = zoomLevel;
    this.transform.tx = -node.position.x * zoomLevel;
    this.transform.ty = -node.position.y * zoomLevel;
    this.applyTransform();
  }

  private showSelectionLimitMessage(pokemonType: string): void {
    const message = i18next.t(`skillTree:selectionLimit.${pokemonType}`, {
      defaultValue: `You can only select one ${pokemonType} Pokemon. Selection limit reached.`
    });
    (this.scene as BattleScene).ui.showText(message, null, () => {}, null, true);
    (this.scene as BattleScene).ui.playError();
  }

  private async loadGlitchSpriteForNode(formName: string, spriteKey: string, node: SkillTreeNode): Promise<void> {
    try {
      await this.loadGlitchSpriteFromFile(formName, spriteKey);
    } catch (fileLoadError) {
        console.warn(`Failed to load glitch sprite for ${formName}:`, fileLoadError);

    }
  }

  private async loadGlitchSpriteFromFile(formName: string, spriteKey: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.scene.load.embeddedAtlas(
        spriteKey,
        `images/pokemon/glitch/${formName}.png`
      );

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.scene.anims && typeof this.scene.anims.create === 'function' && !this.scene.anims.exists(spriteKey)) {
          if (this.scene.textures.get(spriteKey).getFrameNames().length > 1) {
            this.scene.anims.create({
              key: spriteKey,
              frames: this.scene.anims.generateFrameNames(spriteKey),
              frameRate: 24,
              repeat: -1
            });
          } else {
            this.scene.anims.create({
              key: spriteKey,
              frames: [{ key: spriteKey }],
              frameRate: 1,
              repeat: -1
            });
          }
        }
        resolve();
      });

      this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
        reject(new Error(`Failed to load glitch texture: ${file.key}`));
      });

      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }
  private getEnhancedDescription(node: SkillTreeNode): string {
    if (node.rewardData.type === SkillTreeRewardType.POKEMON_ALT_BUILD) {
      if (node.state !== SkillTreeNodeState.UNLOCKED) {
        return this.getDynamicAltBuildDescription(node);
      } else {
        return node.description || "";
      }
    }

    if (node.rewardData.type === SkillTreeRewardType.LEGENDARY_POKEMON) {
      const species = node.rewardData.data?.species;
      if (typeof species === "number") {
        const ast = this.config?.activeSkillTree;
        const encounterChanceMap = ast?.legendaryEncounterChanceBySpecies || {};
        const currentChance = encounterChanceMap[species] || 0;

        const baseDescription = node.description || "";
        const encounterChanceText = i18next.t("skillTree:descriptions.legendaryEncounterChance", {
          chance: currentChance
        });

        return `${baseDescription}\n\n${encounterChanceText}`;
      }
      return node.description || "";
    }

    if (node.rewardData.type === SkillTreeRewardType.REVIVE_BOOST) {
      const data = node.rewardData.data || {};
      const types = data.types || [];
      const species = data.species || [];
      const ast = this.config?.activeSkillTree;

      let currentChance = 0;

      for (const type of types) {
        const typeChance = ast?.reviveChanceByType?.[type] || 0;
        currentChance = Math.max(currentChance, typeChance);
      }

      for (const spec of species) {
        const specChance = ast?.reviveChanceBySpecies?.[spec] || 0;
        currentChance = Math.max(currentChance, specChance);
      }

      const baseDescription = node.description || "";
      const maxIndicator = currentChance >= 30 ? i18next.t("skillTree:descriptions.maxIndicator") : "";
      const chanceText = i18next.t("skillTree:descriptions.reviveBoostChance", {
        chance: currentChance,
        max: maxIndicator
      });

      return `${baseDescription}\n\n${chanceText}`;
    }

    if (node.rewardData.type === SkillTreeRewardType.FUSION_SECONDARY_PRIORITY) {
      const data = node.rewardData.data || {};
      const types = data.types || [];
      const species = data.species || [];
      const ast = this.config?.activeSkillTree;

      let currentChance = 0;

      for (const type of types) {
        const typeChance = ast?.fusionPriorityChanceByType?.[type] || 0;
        currentChance = Math.max(currentChance, typeChance);
      }

      for (const spec of species) {
        const specChance = ast?.fusionPriorityChanceBySpecies?.[spec] || 0;
        currentChance = Math.max(currentChance, specChance);
      }

      const baseDescription = node.description || "";
      const maxIndicator = currentChance >= 100 ? i18next.t("skillTree:descriptions.maxIndicator") : "";
      const chanceText = i18next.t("skillTree:descriptions.fusionPriorityChance", {
        chance: currentChance,
        max: maxIndicator
      });

      return `${baseDescription}\n\n${chanceText}`;
    }

    if (node.rewardData.type !== SkillTreeRewardType.TM_FILTERED &&
        node.rewardData.type !== SkillTreeRewardType.XM_FILTERED) {
      return node.description || "";
    }

    const moveId = node.rewardData.data?.moveId;
    if (moveId === undefined || moveId === null) {
      return node.description || "";
    }

    try {
      const moveDetails = MoveUpgradeTooltipUtils.generateMoveDetails(this.scene, moveId);
      if (!moveDetails) {
        return node.description || "";
      }

      const modifierKey = node.rewardData.type === SkillTreeRewardType.TM_FILTERED
        ? "modifierType:ModifierType.TmModifierType.description"
        : "modifierType:ModifierType.AnyTmModifierType.description";
      const moveName = allMoves?.[moveId]?.name || "";
      const modifierDesc = i18next.t(modifierKey, { moveName });

      let learnableInfo = "";
      if (node.rewardData.type === SkillTreeRewardType.TM_FILTERED) {
        learnableInfo = this.generateLearnablePokemonList(moveId);
      }

      return `${modifierDesc}\n\n${moveDetails}${learnableInfo}`;
    } catch (error) {
      console.error("Failed to generate enhanced TM/XM tooltip:", error);
      return node.description || "";
    }
  }

  private generateLearnablePokemonList(moveId: Moves): string {
    const party = this.scene.getParty();
    if (!party || party.length === 0) {
      return "";
    }

    const learnablePokemon = party.filter(pokemon => {
      if (!pokemon) return false;
      if (!pokemon.compatibleTms || pokemon.compatibleTms.indexOf(moveId) === -1) return false;
      if (pokemon.getMoveset().some(m => m?.moveId === moveId)) return false;
      return true;
    });

    const lines: string[] = [];
    lines.push('');
    lines.push('');

    if (learnablePokemon.length === 0) {
      const noneText = getBBCodeFrag(
        i18next.t("skillTree:tmNoneCanLearn"),
        TextStyle.SUMMARY_RED,
        this.scene.uiTheme
      );
      lines.push(noneText);
    } else {
      const labelText = getBBCodeFrag(
        i18next.t("skillTree:tmCanLearn"),
        TextStyle.SUMMARY_GOLD,
        this.scene.uiTheme
      );

      const pokemonNames = learnablePokemon.map(p => {
        const name = p.name;
        return getBBCodeFrag(name, TextStyle.WINDOW, this.scene.uiTheme);
      }).join(', ');

      lines.push(`${labelText} ${pokemonNames}`);
    }

    return lines.join('\n');
  }

  private getDynamicAltBuildDescription(node: SkillTreeNode): string {
    const altBuildId = node.rewardData.data?.altBuildId;
    if (!altBuildId) {
      return node.description || "";
    }

    const storedRank = node.rewardData.data?.rank || 1;
    const effectiveRank = this.getEffectiveAltBuildRank(altBuildId as PokemonAltBuildId, storedRank);

    const nodeGen = new SkillTreeNodeGenerator(0, this.config?.activeSkillTree?.championId || this.config?.championData?.id || "red", this.scene);

    const dynamicRewardData = {
      ...node.rewardData,
      data: {
        ...node.rewardData.data,
        rank: effectiveRank
      }
    };

    const description = nodeGen.getRewardDescription(dynamicRewardData);
    return description;
  }
}