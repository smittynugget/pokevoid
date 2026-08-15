import BattleScene from "#app/battle-scene";
import UiHandler from "./ui-handler";
import { Mode } from "./mode";
import { Button } from "#enums/buttons";
import { TextStyle, addTextObject, addBBCodeTextObject } from "./text";
import { ChampionManager } from "#app/system/champion-manager";
import { ChampionUtils } from "#app/system/champion-utils";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { Type } from "#app/data/type";
import { TrainerType } from "#enums/trainer-type";
import { TweakMetaMode, cycleMetaMode, TWEAK_META_CYCLE, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import { trainerConfigs } from "#app/data/trainer-config";
import { PlayerGender } from "#enums/player-gender";
import * as Utils from "#app/utils";
import i18next from "i18next";
import { SlideshowController, SlideshowSceneAdapter } from "#app/utils/slideshow-controller";
import { ensureCutsceneImagesLoaded, unloadCutsceneImages } from "#app/utils/cutscene-images";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes";
import { playGenericLevelUpAnimation, skipCurrentLevelUpAnimation, SkillRevealConfig } from "./level-up-animation";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";
import { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";

interface CharacterSelectArgs {
  characters: string[];
  availableChampions: string[];
  gameMode: number;
  onCharacterSelected: (characterId: string) => void;
  onCancel?: () => void;
  preSelectedIndex?: number;
}

interface CardData {
  container: Phaser.GameObjects.Container;
  defaultTile: any;
  silverTile: any;
  sprite: Phaser.GameObjects.Sprite;
  spriteContainer: Phaser.GameObjects.Container;
  maskGfx: Phaser.GameObjects.Graphics;
  maskH: number;
  maskW: number;
  maskOffsetY: number;
  typeIcon: Phaser.GameObjects.Sprite | null;
  typeIcon2: Phaser.GameObjects.Sprite | null;
  affinityIcon: Phaser.GameObjects.Sprite | null;
  affinityLabel: Phaser.GameObjects.Text | null;
  affinityBg: Phaser.GameObjects.Graphics | null;
  nameText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  nameBg: Phaser.GameObjects.Graphics;
  unfocusNameText: Phaser.GameObjects.Text;
  unfocusLevelText: Phaser.GameObjects.Text;
  unfocusBg: Phaser.GameObjects.Graphics;
  subtitleText: Phaser.GameObjects.Text | null;
  characterId: string;
  isUnlocked: boolean;
}

const GRID = {
  COLS: 3,
  ROWS: 2,
  CELL_WIDTH: 78,
  CELL_HEIGHT: 58,
  GAP_X: 10,
  GAP_Y: 8,
  TILE_SCALE_X: 0.786,
  TILE_SCALE_Y: 0.957,
  UNFOCUSED_TILE_SCALE_X: 0.888,
  UNFOCUSED_TILE_SCALE_Y: 1.250,
  SPRITE_SCALE: 0.410,
  SPRITE_OFFSET_X: 0,
  SPRITE_OFFSET_Y: -4,
  AVATAR_SPRITE_OFFSET_Y: -4,
  DIANA_SPRITE_OFFSET_X: 0,
  DIANA_SPRITE_OFFSET_Y: 15,
  DIANA_SPRITE_SCALE: 0.630,
  DIANA_MASK_H: 131.5,
  DIANA_MASK_OFFSET_Y: -36,
  APOLLO_SPRITE_OFFSET_X: -1,
  APOLLO_SPRITE_OFFSET_Y: 15,
  APOLLO_SPRITE_SCALE: 0.650,
  APOLLO_MASK_H: 131.5,
  APOLLO_MASK_OFFSET_Y: -36,
  BROCK_SPRITE_OFFSET_X: -11.771428571428572,
  BROCK_SPRITE_OFFSET_Y: -10.057142857142857,
  BROCK_SPRITE_SCALE: 1.134,
  BROCK_MASK_H: 107.8,
  BROCK_MASK_OFFSET_Y: -24,
  MISTY_SPRITE_OFFSET_X: 4.600000000000001,
  MISTY_SPRITE_OFFSET_Y: 5.4857142857142875,
  MISTY_SPRITE_SCALE: 1.194,
  MISTY_MASK_OFFSET_Y: -19,
  MISTY_MASK_W: 63.308,
  RED_SPRITE_OFFSET_X: -0.48571428571428577,
  RED_SPRITE_OFFSET_Y: 4.0285714285714285,
  RED_SPRITE_SCALE: 1.204,
  RED_MASK_H: 93.8,
  MYSTERY_MASK_H: 77.5,
  MYSTERY_MASK_OFFSET_Y: -9,
  MYSTERY_SPRITE_OFFSET_X: 1,
  MYSTERY_SPRITE_OFFSET_Y: 7,
  MYSTERY_SPRITE_SCALE: 1.050,
  SELECTED_SCALE_BOOST: 1.0,
  FOCUSED_DISPLAY_WIDTH_DELTA: 0,
  TILE_TINT: 0xC8D0D8,
  TILE_DEFAULT_KEY: "newchampion_default_tile",
  TILE_FOCUSED_KEY: "newchampion_silver_focus_tilex",
  TYPE_ICON_MARGIN_X: 6,
  TYPE_ICON_MARGIN_Y: 5,
  TYPE_ICON_SCALE: 0.57,
  UNFOCUSED_TYPE_ICON_SCALE: 0.34,
  TYPE_ICON_DUAL_SPACING: 15,
  AFFINITY_FONT_SIZE: "28px",
  AFFINITY_ICON_SCALE: 0.490,
  AFFINITY_ICON_OFFSET_X: -6,
  AFFINITY_ICON_OFFSET_Y: -2,
  NAME_FONT_SIZE: "46px",
  NAME_BOTTOM_MARGIN: 5,
  SUBTITLE_FONT_SIZE: "28px",
  SUBTITLE_BOTTOM_MARGIN: 2,
  FOCUS_NAME_FONT_SIZE: "158px",
  FOCUS_SUBTITLE_OFFSET_X: -13,
  FOCUS_SUBTITLE_OFFSET_Y: -18,
};

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

export default class CharacterSelectUiHandler extends UiHandler {
  private rootContainer: Phaser.GameObjects.Container;
  private bgSprite: Phaser.GameObjects.Sprite;
  private darkOverlay: Phaser.GameObjects.Rectangle;
  private headerBand: Phaser.GameObjects.Graphics;
  private headerText: Phaser.GameObjects.Text;
  private footerBand: Phaser.GameObjects.Graphics;
  private footerText: Phaser.GameObjects.Text;
  private gridContainer: Phaser.GameObjects.Container;
  private focusNameText: Phaser.GameObjects.Text;
  private focusSubtitleText: Phaser.GameObjects.Text;
  private focusLevelText: Phaser.GameObjects.Text;
  private cards: CardData[] = [];
  private characters: string[] = [];
  private config: CharacterSelectArgs | null = null;
  private selectedIndex: number = 0;

  private _metaMode: TweakMetaMode = TweakMetaMode.NONE;
  get _tweakActive(): boolean { return this._metaMode !== TweakMetaMode.NONE; }
  private _tweakMode: number = 0;
  private _tweakAssetIndex: number = 0;
  private _headerStylePreset: 0 | 1 = 0;
  private _focusBgW: number = 0;
  private _focusBgH: number = 13;
  private _focusBgAlpha: number = 0.82;
  private _unfocusBgW: number = 0;
  private _unfocusBgH: number = 6;
  private _unfocusBgAlpha: number = 0.78;
  private _tweakBaselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; displayWidth: number; displayHeight: number; alpha: number; fontSize: number }> = new Map();
  private _maskBaselines: Map<string, number> = new Map();
  private _tweakHudText: Phaser.GameObjects.Text | null = null;
  private _smitomTipTimer: Phaser.Time.TimerEvent | null = null;
  private _tweakKeyOneHandler: (() => void) | null = null;
  private _tweakKeyTwoHandler: (() => void) | null = null;
  private _tweakKeyThreeHandler: (() => void) | null = null;
  private _tweakKeyVHandler: (() => void) | null = null;
  private static readonly TWEAK_MODES = ["scale", "position", "width", "height", "alpha", "fontSize"];
  private static readonly CHARSEL_TWEAK_ASSETS = [
    "AffinityAll", "AffinityAllFocus", "AffinityFocusedLabel",
    "AffinityFontSize", "AffinityIcon", "AffinityLabel", "AffinityStroke",
    "AllFocusText",
    "ApolloMaskH", "ApolloMaskOffsetY", "ApolloSprite",
    "BrockMaskH", "BrockMaskOffsetY", "BrockSprite",
    "CardNameText", "CardSubtitleText", "CharTiles",
    "DianaMaskH", "DianaMaskOffsetY", "DianaSprite",
    "FocusBg", "FocusedBGAndType", "FocusedBrockType", "FocusedSprite",
    "FocusedTile", "FocusedTypeIcon", "FocusLevelText", "FocusNameText",
    "FooterText", "GridContainer", "HeaderStyleToggle", "HeaderText",
    "MistyMaskH", "MistyMaskOffsetY", "MistyMaskW", "MistySprite",
    "MysteryMaskH", "MysteryMaskOffsetY", "MysterySprite",
    "RedMaskH", "RedMaskOffsetY", "RedSprite",
    "TypeIcons",
    "UnfocusBlackBG", "UnfocusedBrockType", "UnfocusedTiles", "UnfocusedTypeIcons",
    "UnfocusLvlText", "UnfocusNameAndLvl", "UnfocusNameText",
  ];
  private _dropdownPanel: TweakDropdownPanel | null = null;

  private _lockedTooltipContainer: Phaser.GameObjects.Container | null = null;
  private _lockedTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private _lockedTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private _lockedTooltipTitle: Phaser.GameObjects.Text | null = null;
  private _lockedTooltipRarity: Phaser.GameObjects.Text | null = null;
  private _lockedTooltipDesc: any | null = null;
  private _lockedTooltipSectionHeader: Phaser.GameObjects.Text | null = null;
  private _lockedTooltipSectionLine: Phaser.GameObjects.Graphics | null = null;
  private _lockedTooltipCostContainer: Phaser.GameObjects.Container | null = null;
  private _lockedTooltipLoreBarBg: Phaser.GameObjects.Graphics | null = null;
  private _lockedTooltipLore: any | null = null;

  private isChampionUnlockCutsceneActive = false;
  private isLevelUpAnimationActive = false;
  private unlockCutsceneController: any = null;
  private holdToSkipText: Phaser.GameObjects.Text | null = null;
  private holdToSkipGauge: Phaser.GameObjects.Graphics | null = null;
  private holdToSkipTimer: Phaser.Time.TimerEvent | null = null;
  private _cutsceneInputDownHandler: ((evt: any) => void) | null = null;
  private _cutsceneInputUpHandler: (() => void) | null = null;
  private _cutscenePointerDownHandler: (() => void) | null = null;
  private _cutscenePointerUpHandler: (() => void) | null = null;
  private static smitomChampionSelectDebugShown = false;

  constructor(scene: BattleScene) {
    super(scene, Mode.CHARACTER_SELECT);
  }

  setup(): void {
    const ui = this.getUi();
    const width = this.scene.game.canvas.width / 6;
    const height = this.scene.game.canvas.height / 6;

    this.rootContainer = this.scene.add.container(0, 0);
    this.rootContainer.setName("character-select-root");
    this.rootContainer.setVisible(false);

    this.bgSprite = this.scene.add.sprite(width / 2, -height / 2, "light_bg");
    this.bgSprite.setOrigin(0.5, 0.5);
    this.bgSprite.setDisplaySize(width + 2, height + 2);
    try {
      this.bgSprite.setPipeline("INVERT");
    } catch {
      this.bgSprite.setTint(0x111122);
    }
    this.rootContainer.add(this.bgSprite);

    this.darkOverlay = this.scene.add.rectangle(width / 2, -height / 2, width + 2, height + 2, 0x000000, 0.25);
    this.darkOverlay.setOrigin(0.5, 0.5);
    this.rootContainer.add(this.darkOverlay);

    const bgHitZone = this.scene.add.rectangle(0, -height, width, height, 0x000000, 0);
    bgHitZone.setOrigin(0, 0);
    bgHitZone.setInteractive({ useHandCursor: false });
    bgHitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.CHARACTER_SELECT) return;
      if (pointer.button === 0) {
        this.confirmSelection();
      }
    });
    this.rootContainer.addAt(bgHitZone, 0);

    this.headerBand = this.scene.add.graphics();
    this.headerBand.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.0, 0.9, 0.0);
    this.headerBand.fillRect(0, -height, width, 19);
    this.rootContainer.add(this.headerBand);

    this.headerText = addTextObject(this.scene, width / 2, -height + 4, "", TextStyle.PARTY, { fontSize: "80px", color: "#FFFFFF" });
    this.headerText.setOrigin(0.5, 0);
    this.headerText.setTint(0xFFFFFF);
    this.headerText.setShadow(0, 0, undefined);
    this.headerText.setStroke("#424242", 14);
    this.rootContainer.add(this.headerText);

    this.gridContainer = this.scene.add.container(0, 4);
    this.rootContainer.add(this.gridContainer);

    this.focusNameText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: GRID.FOCUS_NAME_FONT_SIZE, color: "#E8E8E8" });
    this.focusNameText.setOrigin(0.5, 0);
    this.focusNameText.setShadow(0, 0, "#FFFFFF", 5, true, true);
    this.focusNameText.setVisible(false);
    this.rootContainer.add(this.focusNameText);

    this.focusSubtitleText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "24px", color: "#E8E8E8" });
    this.focusSubtitleText.setOrigin(0.5, 0);
    this.focusSubtitleText.setAlpha(0.8);
    this.focusSubtitleText.setVisible(false);
    this.rootContainer.add(this.focusSubtitleText);

    this.focusLevelText = addTextObject(this.scene, 0, 0, "", TextStyle.PARTY, { fontSize: "26px", color: "#ffd700" });
    this.focusLevelText.setOrigin(0.5, 0);
    this.focusLevelText.setShadow(0, 0, undefined);
    this.focusLevelText.setStroke("#424242", 14);
    this.focusLevelText.setAlpha(1.0);
    this.focusLevelText.setVisible(false);
    this.rootContainer.add(this.focusLevelText);

    this.footerBand = this.scene.add.graphics();
    this.footerBand.fillStyle(0x000000, 0.6);
    this.footerBand.fillRect(0, -9, width, 9);
    this.rootContainer.add(this.footerBand);

    this.footerText = addTextObject(this.scene, width / 2, -4.5, "", TextStyle.WINDOW, { fontSize: "32px" });
    this.footerText.setOrigin(0.5, 0.5);
    this.footerText.setAlpha(1.0);
    this.rootContainer.add(this.footerText);

    this._tweakHudText = addTextObject(this.scene, Math.floor(width / 2), -height + 2, "", TextStyle.WINDOW, {
      fontSize: "28px",
      color: "#00FF00",
      align: "center"
    });
    this._tweakHudText.setOrigin(0.5, 0);
    this._tweakHudText.setDepth(2000);
    this._tweakHudText.setVisible(false);
    this.rootContainer.add(this._tweakHudText);

    this.createLockedTooltip();

    ui.add(this.rootContainer);
  }

  show(args: any[]): boolean {
    if (!args.length || !args[0]) {
      return false;
    }
    super.show(args);

    this.getUi().hideMessageChrome();

    this.config = args[0] as CharacterSelectArgs;
    this.characters = this.config.characters;
    this.selectedIndex = (this.config.preSelectedIndex !== undefined && this.config.preSelectedIndex >= 0 && this.config.preSelectedIndex < this.characters.length) ? this.config.preSelectedIndex : 0;

    this.headerText.setText(i18next.t("characterSelect:title"));
    this.footerText.setText(i18next.t("characterSelect:instruction"));

    this.buildGrid();
    this.updateSelection();
    this.rootContainer.setVisible(true);

    try {
      const scene = this.scene as BattleScene;
      const key = "voice/champion_select";
      if ((scene as any).cache?.audio?.exists(key)) {
        scene.playSound(key);
      }
    } catch {}

    this.triggerSmitomCharacterSelectTipIfNeeded();

    return true;
  }

  private triggerSmitomCharacterSelectTipIfNeeded(): void {
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !CharacterSelectUiHandler.smitomChampionSelectDebugShown) {
      CharacterSelectUiHandler.smitomChampionSelectDebugShown = true;
      flags["champion_select_welcome"] = false;
    }
    if (flags["champion_select_welcome"]) return;
    this._smitomTipTimer = scene.time.delayedCall(350, () => {
      this._smitomTipTimer = null;
      if (scene.ui.getMode() !== Mode.CHARACTER_SELECT) return;
      const tipConfig: SmitomTipConfig = {
        tutorialKey: "champion_select_welcome",
        title: i18next.t("tutorial:smitomTip.championSelect.title"),
        texts: [
          i18next.t("tutorial:smitomTip.championSelect.1"),
          i18next.t("tutorial:smitomTip.championSelect.2"),
        ],
        offerReplay: true,
        onComplete: () => {
          scene.gameData.smitomTutorialFlags["champion_select_welcome"] = true;
          scene.gameData.saveSystem();
        }
      };
      scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
    });
  }

  private buildGrid(): void {
    if (this._tweakActive) return;
    for (const card of this.cards) {
      if (card.maskGfx) card.maskGfx.destroy();
    }
    this.gridContainer.removeAll(true);
    this.cards = [];

    const width = this.scene.game.canvas.width / 6;
    const height = this.scene.game.canvas.height / 6;

    const totalGridWidth = GRID.COLS * GRID.CELL_WIDTH + (GRID.COLS - 1) * GRID.GAP_X;
    const totalGridHeight = GRID.ROWS * GRID.CELL_HEIGHT + (GRID.ROWS - 1) * GRID.GAP_Y;
    const startX = (width - totalGridWidth) / 2;
    const startY = -height + 28 + (height - 28 - 18 - totalGridHeight) / 2;

    const manager = ChampionManager.getInstance();

    for (let i = 0; i < this.characters.length; i++) {
      const characterId = this.characters[i];
      const col = i % GRID.COLS;
      const row = Math.floor(i / GRID.COLS);

      const x = startX + col * (GRID.CELL_WIDTH + GRID.GAP_X) + GRID.CELL_WIDTH / 2;
      const y = startY + row * (GRID.CELL_HEIGHT + GRID.GAP_Y) + GRID.CELL_HEIGHT / 2;

      const isRandom = characterId === "random";
      const isUnlocked = isRandom || this.isCharacterUnlocked(characterId, manager);

      const cardContainer = this.scene.add.container(x, y);

      let defaultTile: any;
      let silverTile: any;
      try {
        defaultTile = this.scene.add.nineslice(0, 0, GRID.TILE_DEFAULT_KEY, undefined, GRID.CELL_WIDTH, GRID.CELL_HEIGHT, 5, 5, 5, 5);
        defaultTile.setOrigin(0.5, 0.5);
        defaultTile.setScale(GRID.UNFOCUSED_TILE_SCALE_X, GRID.UNFOCUSED_TILE_SCALE_Y);

        silverTile = this.scene.add.nineslice(0, 0, GRID.TILE_FOCUSED_KEY, undefined, GRID.CELL_WIDTH, GRID.CELL_HEIGHT, 5, 5, 5, 5);
        silverTile.setOrigin(0.5, 0.5);
        silverTile.setScale(GRID.TILE_SCALE_X, GRID.TILE_SCALE_Y);
        silverTile.setTint(GRID.TILE_TINT);
        silverTile.setVisible(false);
        if (silverTile.postFX && typeof silverTile.postFX.addGlow === "function") {
          silverTile.postFX.addGlow(0xffffff, 6, 0, false, 0.20, 14);
        }
      } catch {
        defaultTile = this.scene.add.graphics();
        (defaultTile as Phaser.GameObjects.Graphics).fillStyle(0x222337, 0.82);
        (defaultTile as Phaser.GameObjects.Graphics).fillRoundedRect(-GRID.CELL_WIDTH / 2, -GRID.CELL_HEIGHT / 2, GRID.CELL_WIDTH, GRID.CELL_HEIGHT, 4);
        defaultTile.setScale(GRID.UNFOCUSED_TILE_SCALE_X, GRID.UNFOCUSED_TILE_SCALE_Y);
        silverTile = this.scene.add.graphics();
        (silverTile as Phaser.GameObjects.Graphics).fillStyle(0x333355, 0.9);
        (silverTile as Phaser.GameObjects.Graphics).fillRoundedRect(-GRID.CELL_WIDTH / 2, -GRID.CELL_HEIGHT / 2, GRID.CELL_WIDTH, GRID.CELL_HEIGHT, 4);
        silverTile.setScale(GRID.TILE_SCALE_X, GRID.TILE_SCALE_Y);
        silverTile.setVisible(false);
      }
      cardContainer.add(defaultTile);
      cardContainer.add(silverTile);

      const spriteKey = this.getSpriteKey(characterId);
      const isAvatar = this.isPlayerAvatar(characterId);
      const def = CHAMPION_DEFINITIONS[characterId] as any;
      const cellRatio = GRID.CELL_HEIGHT / 70;
      const regOffsetX = (def?.ui?.spriteOffsetX as number) ?? 0;
      const regOffsetY = (def?.ui?.spriteOffsetY as number) ?? 0;
      const regGridOffsetY = (def?.ui?.gridOffsetY as number) ?? 0;
      const spriteOffX = isRandom ? GRID.MYSTERY_SPRITE_OFFSET_X : (characterId === "diana" ? GRID.DIANA_SPRITE_OFFSET_X : (characterId === "apollo" ? GRID.APOLLO_SPRITE_OFFSET_X : (characterId === "brock" ? GRID.BROCK_SPRITE_OFFSET_X : (characterId === "misty" ? GRID.MISTY_SPRITE_OFFSET_X : (characterId === "red" ? GRID.RED_SPRITE_OFFSET_X : (isAvatar ? 0 : (GRID.SPRITE_OFFSET_X + regOffsetX * cellRatio)))))));
      const spriteOffY = isRandom ? GRID.MYSTERY_SPRITE_OFFSET_Y : (characterId === "diana" ? GRID.DIANA_SPRITE_OFFSET_Y : (characterId === "apollo" ? GRID.APOLLO_SPRITE_OFFSET_Y : (characterId === "brock" ? GRID.BROCK_SPRITE_OFFSET_Y : (characterId === "misty" ? GRID.MISTY_SPRITE_OFFSET_Y : (characterId === "red" ? GRID.RED_SPRITE_OFFSET_Y : (isAvatar ? GRID.AVATAR_SPRITE_OFFSET_Y : (GRID.SPRITE_OFFSET_Y + (regOffsetY + regGridOffsetY) * cellRatio)))))));
      const sprite = isRandom
        ? this.scene.add.sprite(spriteOffX, spriteOffY, spriteKey, "0001.png")
        : this.scene.add.sprite(spriteOffX, spriteOffY, spriteKey);
      sprite.setScale(this.getSpriteScale(characterId));
      sprite.setOrigin(0.5, 0.5);
      if (!isRandom) {
        try {
          const tex = sprite.texture;
          const frameNames = tex.getFrameNames();
          if (frameNames.length > 1 && frameNames.includes("0001.png")) {
            sprite.setFrame("0001.png");
          }
        } catch {}
      }

      if (!isUnlocked && !isRandom) {
        this.applyLockedEffect(sprite);
      }

      const spriteContainer = this.scene.add.container(0, 0);
      spriteContainer.add(sprite);
      cardContainer.add(spriteContainer);

      const maskGfx = this.scene.make.graphics({});
      maskGfx.setScale(6);
      const cardMaskH = isRandom ? GRID.MYSTERY_MASK_H : (characterId === "diana" ? GRID.DIANA_MASK_H : (characterId === "apollo" ? GRID.APOLLO_MASK_H : (characterId === "red" ? GRID.RED_MASK_H : (characterId === "brock" ? GRID.BROCK_MASK_H : (isAvatar ? 55.5 : ((def?.ui?.maskH as number) ?? 58.8))))));
      const cardMaskOffsetY = isRandom ? GRID.MYSTERY_MASK_OFFSET_Y : (characterId === "diana" ? GRID.DIANA_MASK_OFFSET_Y : (characterId === "apollo" ? GRID.APOLLO_MASK_OFFSET_Y : (characterId === "brock" ? GRID.BROCK_MASK_OFFSET_Y : (characterId === "misty" ? GRID.MISTY_MASK_OFFSET_Y : (isAvatar ? 0 : ((def?.ui?.maskOffsetY as number) ?? 0))))));
      const uiBaseY = this.scene.game.canvas.height / 6;
      const baseClipW = GRID.CELL_WIDTH * GRID.TILE_SCALE_X;
      const cardMaskW = characterId === "misty" ? GRID.MISTY_MASK_W : baseClipW;
      const clipW = cardMaskW;
      const clipH = cardMaskH * cellRatio;
      const clipX = x - clipW / 2;
      const clipY = uiBaseY + (y - clipH / 2 + cardMaskOffsetY * cellRatio);
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillRect(clipX, clipY, clipW, clipH);
      const clipMask = maskGfx.createGeometryMask();
      spriteContainer.setMask(clipMask);

      const displayName = this.getDisplayName(characterId, isUnlocked);
      const nameY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.NAME_BOTTOM_MARGIN;
      const nameBgGfx = this.scene.add.graphics();
      const bgW = 55;
      this._focusBgW = bgW;
      this.redrawFocusBg(nameBgGfx, bgW, this._focusBgH, nameY);
      nameBgGfx.setY(7);
      nameBgGfx.setVisible(false);
      cardContainer.add(nameBgGfx);
      const nameXOffset = -25;
      const nameLabel = addTextObject(this.scene, nameXOffset, nameY - 6, displayName.toUpperCase(), TextStyle.PARTY, {
        fontSize: GRID.NAME_FONT_SIZE,
        color: "#E8E8E8"
      });
      nameLabel.setOrigin(0, 1);
      nameLabel.setShadow(0, 0, undefined);
      nameLabel.setStroke("#424242", 14);
      nameLabel.setVisible(false);
      cardContainer.add(nameLabel);

      const lvlDisplay = this.getLevelLabel(characterId, isUnlocked, isRandom, manager);
      const lvlColor = (!isUnlocked && !isRandom) ? this.getLockedEssenceColor(characterId) : "#ffd700";
      const levelLabel = addTextObject(this.scene, nameXOffset, nameY - 6, lvlDisplay, TextStyle.PARTY, {
        fontSize: "26px",
        color: lvlColor
      });
      levelLabel.setOrigin(0, 1);
      levelLabel.setShadow(0, 0, undefined);
      levelLabel.setStroke("#424242", 14);
      levelLabel.setVisible(false);
      cardContainer.add(levelLabel);

      const subtitleStr = this.getSubtitle(characterId, isUnlocked);
      let subtitleLabel: Phaser.GameObjects.Text | null = null;
      if (subtitleStr) {
        const subY = nameY - GRID.SUBTITLE_BOTTOM_MARGIN + 4;
        const subXOffset = -25;
        const subtitleColor = (!isUnlocked && !isRandom) ? this.getLockedEssenceColor(characterId) : "#E8E8E8";
        subtitleLabel = addTextObject(this.scene, subXOffset, subY - 1, subtitleStr.toUpperCase(), TextStyle.PARTY, {
          fontSize: GRID.SUBTITLE_FONT_SIZE,
          align: "center",
          color: subtitleColor
        });
        subtitleLabel.setOrigin(0, 1);
        subtitleLabel.setShadow(0, 0, undefined);
        subtitleLabel.setStroke("#424242", 14);
        subtitleLabel.setDepth(2);
        subtitleLabel.setVisible(false);
        cardContainer.add(subtitleLabel);
      }

      const unfocusBgGfx = this.scene.add.graphics();
      unfocusBgGfx.setPosition(-1, 12);
      const unfBgW = GRID.CELL_WIDTH * GRID.TILE_SCALE_X - 5;
      this._unfocusBgW = unfBgW;
      this.redrawUnfocusBg(unfocusBgGfx, unfBgW, this._unfocusBgH, nameY);
      cardContainer.add(unfocusBgGfx);

      const unfocusNameLabel = addTextObject(this.scene, nameXOffset, nameY + 1, displayName.toUpperCase(), TextStyle.PARTY, {
        fontSize: "40px",
        color: "#FFFFFF"
      });
      unfocusNameLabel.setOrigin(0, 1);
      unfocusNameLabel.setShadow(0, 0, undefined);
      unfocusNameLabel.setStroke("#424242", 12);
      unfocusNameLabel.setAlpha(0.98);
      cardContainer.add(unfocusNameLabel);

      const unfocusLvlDisplay = this.getLevelLabel(characterId, isUnlocked, isRandom, manager);
      const unfocusLvlColor = (!isUnlocked && !isRandom) ? this.getLockedEssenceColor(characterId) : "#FFFFFF";
      const unfocusLevelLabel = addTextObject(this.scene, -27, nameY, unfocusLvlDisplay, TextStyle.PARTY, {
        fontSize: "22px",
        color: unfocusLvlColor
      });
      unfocusLevelLabel.setOrigin(0, 1);
      unfocusLevelLabel.setShadow(0, 0, undefined);
      unfocusLevelLabel.setStroke("#424242", 12);
      unfocusLevelLabel.setAlpha(0.98);
      unfocusLevelLabel.setX(unfocusNameLabel.x - (unfocusLevelLabel.displayWidth || 0) - 1);
      cardContainer.add(unfocusLevelLabel);

      const { typeIcon: tIcon, typeIcon2: tIcon2, affinityIcon: aIcon, affinityLabel: aLabel, affinityBg: aBg } = this.createCardTypeBadge(characterId, isRandom, isUnlocked);
      if (aBg) cardContainer.add(aBg);
      if (aIcon) cardContainer.add(aIcon);
      if (tIcon) cardContainer.add(tIcon);
      if (tIcon2) cardContainer.add(tIcon2);
      if (aLabel) cardContainer.add(aLabel);

      if (characterId === "brock") {
        const typeBrX = (GRID.CELL_WIDTH * GRID.TILE_SCALE_X) / 2 - GRID.TYPE_ICON_MARGIN_X;
        const typeBrY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.TYPE_ICON_MARGIN_Y;
        if (tIcon) {
          tIcon.setX(typeBrX + 1);
          tIcon.setY(typeBrY - 3);
          tIcon.setScale(0.59);
        }
        if (tIcon2) {
          tIcon2.setX(typeBrX + 1);
          tIcon2.setY(typeBrY - 3 + (tIcon?.displayHeight ?? 0));
          tIcon2.setScale(0.59);
        }
      }

      const hitZone = this.scene.add.rectangle(0, 0, GRID.CELL_WIDTH, GRID.CELL_HEIGHT, 0x000000, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.CHARACTER_SELECT) return;
        if (pointer.button !== 0) return;
        if (this.selectedIndex !== i) {
          this.selectedIndex = i;
          this.updateSelection();
          this.getUi().playSelect();
        } else {
          this.confirmSelection();
        }
      });
      hitZone.on("pointerover", () => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.CHARACTER_SELECT) return;
        if (this.selectedIndex !== i) {
          this.selectedIndex = i;
          this.updateSelection();
        }
        const hoveredCard = this.cards[i] || card;
        if (hoveredCard && !hoveredCard.isUnlocked) {
          this.showLockedCharTooltip(hoveredCard);
        } else {
          this.hideLockedCharTooltip();
        }
      });
      hitZone.on("pointerout", () => {
        this.hideLockedCharTooltip();
      });
      cardContainer.add(hitZone);

      this.gridContainer.add(cardContainer);

      this.cards.push({
        container: cardContainer,
        defaultTile,
        silverTile,
        sprite,
        spriteContainer,
        maskGfx,
        maskH: cardMaskH,
        maskW: cardMaskW,
        maskOffsetY: cardMaskOffsetY,
        typeIcon: tIcon,
        typeIcon2: tIcon2,
        affinityIcon: aIcon,
        affinityLabel: aLabel,
        affinityBg: aBg,
        nameText: nameLabel,
        levelText: levelLabel,
        nameBg: nameBgGfx,
        unfocusNameText: unfocusNameLabel,
        unfocusLevelText: unfocusLevelLabel,
        unfocusBg: unfocusBgGfx,
        subtitleText: subtitleLabel,
        characterId,
        isUnlocked,
      });
    }
  }

  private isCharacterUnlocked(characterId: string, manager: ChampionManager): boolean {
    if (characterId === "apollo" || characterId === "diana") return true;
    return manager.isChampionUnlocked(characterId);
  }

  private getSpriteKey(characterId: string): string {
    if (characterId === "random") return "unknown_m";
    if (characterId === "diana") return "player_f";
    if (characterId === "apollo") return "player_m";
    try {
      const key = ChampionUtils.getChampionSpriteKey(characterId, (this.scene as BattleScene).gameData?.gender);
      if (this.scene.textures.exists(key)) return key;
      const def = CHAMPION_DEFINITIONS[characterId];
      const trainerType = (def as any)?.trainerType as TrainerType | undefined;
      if (trainerType !== undefined) {
        const cfg = trainerConfigs[trainerType];
        const isFemale = (this.scene as BattleScene).gameData?.gender === PlayerGender.FEMALE;
        const fb = cfg ? cfg.getSpriteKey(isFemale, false) : (isFemale ? "player_f" : "player_m");
        if (this.scene.textures.exists(fb)) return fb;
      }
    } catch { }
    return this.scene.textures.exists(characterId) ? characterId : "player_m";
  }

  private getSpriteScale(characterId: string): number {
    if (characterId === "random") return GRID.MYSTERY_SPRITE_SCALE;
    if (characterId === "brock") return GRID.BROCK_SPRITE_SCALE;
    if (characterId === "misty") return GRID.MISTY_SPRITE_SCALE;
    if (characterId === "red") return GRID.RED_SPRITE_SCALE;
    const def = CHAMPION_DEFINITIONS[characterId];
    const previewScale = (def?.ui as any)?.previewScale as number | undefined;
    if (typeof previewScale === "number") {
      const cellRatio = GRID.CELL_HEIGHT / 70;
      return ((previewScale * 1.1) + 0.040) * cellRatio;
    }
    if (def?.ui?.gridScale) return def.ui.gridScale;
    if (characterId === "diana") return GRID.DIANA_SPRITE_SCALE;
    if (characterId === "apollo") return GRID.APOLLO_SPRITE_SCALE;
    return GRID.SPRITE_SCALE;
  }

  private applyLockedEffect(sprite: Phaser.GameObjects.Sprite): void {
    if ((this.scene as any).spritePipeline) {
      sprite.setPipeline((this.scene as any).spritePipeline, {
        tone: [0.0, 0.0, 0.0, 0.0],
        hasShadow: false,
        ignoreTimeTint: true,
        baseColor: [0.08, 0.0, 0.22],
        teraColor: [140, 30, 200]
      });
      sprite.clearTint();
      sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      sprite.setAlpha(1.0);
    } else {
      sprite.resetPipeline();
      sprite.setTintFill(0xE1B4FF);
      sprite.setAlpha(1.0);
      sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    }
  }

  private createCardTypeBadge(characterId: string, isRandom: boolean, isUnlocked: boolean = true): { typeIcon: Phaser.GameObjects.Sprite | null; typeIcon2: Phaser.GameObjects.Sprite | null; affinityIcon: Phaser.GameObjects.Sprite | null; affinityLabel: Phaser.GameObjects.Text | null; affinityBg: Phaser.GameObjects.Graphics | null } {
    const brX = (GRID.CELL_WIDTH * GRID.TILE_SCALE_X) / 2 - GRID.TYPE_ICON_MARGIN_X;
    const brY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.TYPE_ICON_MARGIN_Y;

    if (isRandom) {
      const icon = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", "unknown");
      icon.setOrigin(1, 1);
      icon.setScale(GRID.TYPE_ICON_SCALE);
      return { typeIcon: icon, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };
    }

    if (!isUnlocked) {
      const def = CHAMPION_DEFINITIONS[characterId] as any;
      if (!def) {
        const icon = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", "unknown");
        icon.setOrigin(1, 1);
        icon.setScale(GRID.TYPE_ICON_SCALE);
        return { typeIcon: icon, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };
      }
      const rawT1 = def.type1;
      const rawT2 = def.type2;
      const isUnknown = (t: any) => t === undefined || t === null || t === Type.UNKNOWN;
      const t1 = isUnknown(rawT1) ? undefined : rawT1 as Type;
      const t2 = isUnknown(rawT2) ? undefined : rawT2 as Type;

      if (t1 === undefined) {
        const icon = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", "unknown");
        icon.setOrigin(1, 1);
        icon.setScale(GRID.TYPE_ICON_SCALE);
        return { typeIcon: icon, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };
      }

      let icon1: Phaser.GameObjects.Sprite | null = null;
      let icon2: Phaser.GameObjects.Sprite | null = null;

      if (t2 !== undefined) {
        icon1 = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type1", Type[t1].toLowerCase());
        icon1.setOrigin(1, 1);
        icon1.setScale(GRID.TYPE_ICON_SCALE);

        icon2 = this.scene.add.sprite(brX, brY + icon1.displayHeight, "pbinfo_enemy_type2", Type[t2].toLowerCase());
        icon2.setOrigin(1, 1);
        icon2.setScale(GRID.TYPE_ICON_SCALE);
      } else {
        icon1 = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", Type[t1].toLowerCase());
        icon1.setOrigin(1, 1);
        icon1.setScale(GRID.TYPE_ICON_SCALE);
      }

      return { typeIcon: icon1, typeIcon2: icon2, affinityIcon: null, affinityLabel: null, affinityBg: null };
    }

    if (characterId === "red") {
      const icon = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", "normal");
      icon.setOrigin(1, 1);
      icon.setScale(GRID.TYPE_ICON_SCALE);
      icon.setTint(0x33CC33);
      return { typeIcon: icon, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };
    }

    const affinity = ChampionUtils.getChampionAffinityLabel(characterId);
    if (affinity) {
      const pill = this.scene.add.sprite(brX + 1, brY, "categories", "status");
      pill.setOrigin(1, 1);
      pill.setScale(0.45);
      pill.setTint(0xFFFFFF);

      const label = addTextObject(this.scene, brX, brY + 1, affinity, TextStyle.PARTY, {
        fontSize: GRID.AFFINITY_FONT_SIZE,
        align: "center",
        color: "#E8E8E8"
      });
      label.setOrigin(1, 1);
      label.setShadow(0, 0, undefined);
      label.setStroke("#424242", 5);
      return { typeIcon: null, typeIcon2: null, affinityIcon: pill, affinityLabel: label, affinityBg: null };
    }

    const def = CHAMPION_DEFINITIONS[characterId] as any;
    if (!def) return { typeIcon: null, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };

    const rawT1 = def.type1;
    const rawT2 = def.type2;

    const isUnknown = (t: any) => t === undefined || t === null || t === Type.UNKNOWN;
    const t1 = isUnknown(rawT1) ? undefined : rawT1 as Type;
    const t2 = isUnknown(rawT2) ? undefined : rawT2 as Type;

    if (t1 === undefined && rawT1 === Type.UNKNOWN) {
      const icon = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", "unknown");
      icon.setOrigin(1, 1);
      icon.setScale(GRID.TYPE_ICON_SCALE);
      return { typeIcon: icon, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };
    }

    if (t1 === undefined) return { typeIcon: null, typeIcon2: null, affinityIcon: null, affinityLabel: null, affinityBg: null };

    let icon1: Phaser.GameObjects.Sprite | null = null;
    let icon2: Phaser.GameObjects.Sprite | null = null;

    if (t2 !== undefined) {
      icon1 = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type1", Type[t1].toLowerCase());
      icon1.setOrigin(1, 1);
      icon1.setScale(GRID.TYPE_ICON_SCALE);

      icon2 = this.scene.add.sprite(brX, brY + icon1.displayHeight, "pbinfo_enemy_type2", Type[t2].toLowerCase());
      icon2.setOrigin(1, 1);
      icon2.setScale(GRID.TYPE_ICON_SCALE);
    } else {
      icon1 = this.scene.add.sprite(brX, brY, "pbinfo_enemy_type", Type[t1].toLowerCase());
      icon1.setOrigin(1, 1);
      icon1.setScale(GRID.TYPE_ICON_SCALE);
    }

    return { typeIcon: icon1, typeIcon2: icon2, affinityIcon: null, affinityLabel: null, affinityBg: null };
  }

  private getDisplayName(characterId: string, isUnlocked: boolean): string {
    if (characterId === "random") return i18next.t("characterSelect:mysteryChampion");
    if (!isUnlocked) return "???";
    return ChampionUtils.getChampionDisplayName(characterId);
  }

  private getEssenceTypeDisplayName(type: Type): string {
    const key = Type[type];
    if (!key) return "";
    return i18next.t(`pokemonInfo:Type.${key}`, { defaultValue: key });
  }

  private getSubtitle(characterId: string, isUnlocked: boolean): string {
    if (characterId === "random") return i18next.t("characterSelect:mysterySubtitle");
    if (!isUnlocked) {
      const def = CHAMPION_DEFINITIONS[characterId];
      const reqs = (def?.unlockRequirements as any)?.essenceRequirements || [];
      const total = def?.unlockRequirements?.totalEssenceRequirement;
      if (total && total > 0 && reqs.length > 0) {
        const typeName = this.getEssenceTypeDisplayName(reqs[0].type);
        return i18next.t("characterSelect:essenceNeeded", {
          amount: total.toString(),
          typeName,
        });
      }
      return "";
    }
    const key = `championSelect:${characterId}.description`;
    const result = i18next.t(key);
    if (result === key) return "";
    return result;
  }

  private getLevelLabel(characterId: string, isUnlocked: boolean, isRandom: boolean, manager: ChampionManager): string {
    if (isRandom) return "";
    if (!isUnlocked) {
      return "";
    }
    const dataKey = (characterId === "apollo" || characterId === "diana") ? "apollo_diana" : characterId;
    const data = manager.getChampionData(dataKey);
    const level = data?.level || 1;
    return `Lv${level}`;
  }

  private getLockedEssenceColor(characterId: string): string {
    const def = CHAMPION_DEFINITIONS[characterId];
    const reqs = (def?.unlockRequirements as any)?.essenceRequirements || [];
    const gd = (this.scene as BattleScene).gameData;
    const allMet = reqs.length > 0 && reqs.every((r: any) => {
      const have = gd.getEssenceCount(r.type) || 0;
      return have >= (r.amount || 0);
    });
    return allMet ? "#33CC33" : "#ffffff";
  }

  private updateSelection(): void {
    if (this._tweakActive) return;
    const manager = ChampionManager.getInstance();

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const isSelected = i === this.selectedIndex;

      if (card.defaultTile?.setVisible) card.defaultTile.setVisible(!isSelected);
      if (card.silverTile?.setVisible) card.silverTile.setVisible(isSelected);

      const baseScale = this.getSpriteScale(card.characterId);
      if (isSelected) {
        card.sprite.setScale(baseScale * GRID.SELECTED_SCALE_BOOST);
        if (typeof card.sprite.setDisplaySize === "function" && card.sprite.displayWidth !== undefined) {
          card.sprite.setDisplaySize(card.sprite.displayWidth + GRID.FOCUSED_DISPLAY_WIDTH_DELTA, card.sprite.displayHeight);
        }
      } else {
        card.sprite.setScale(baseScale);
      }
      if (card.isUnlocked) {
        card.sprite.clearTint();
        card.sprite.setAlpha(1.0);
        card.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      }

      card.nameText.setVisible(isSelected);
      card.levelText.setVisible(isSelected);
      if (isSelected) {
        const nameRightEdge = card.nameText.x + (card.nameText.displayWidth || 0);
        card.levelText.setX(nameRightEdge + 1);
      }
      card.nameBg.setVisible(isSelected);
      if (card.subtitleText) card.subtitleText.setVisible(isSelected);
      card.unfocusNameText.setVisible(!isSelected);
      card.unfocusLevelText.setVisible(false);
      card.unfocusBg.setVisible(!isSelected);
      const baseIconY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.TYPE_ICON_MARGIN_Y;
      const iconScale = isSelected ? GRID.TYPE_ICON_SCALE : GRID.UNFOCUSED_TYPE_ICON_SCALE;
      const iconY = baseIconY + 2;
      const brX = (GRID.CELL_WIDTH * GRID.TILE_SCALE_X) / 2 - GRID.TYPE_ICON_MARGIN_X;
      if (card.typeIcon) {
        if (card.characterId === "brock" && isSelected) {
          card.typeIcon.setY(iconY - 7);
          card.typeIcon.setScale(0.59);
          card.typeIcon.setX(brX + 1);
        } else if (card.characterId === "brock" && !isSelected) {
          card.typeIcon.setY(iconY - 4);
          card.typeIcon.setScale(iconScale);
          card.typeIcon.setX(brX);
        } else {
          card.typeIcon.setY(iconY);
          card.typeIcon.setScale(iconScale);
          card.typeIcon.setX(brX);
        }
      }
      if (card.typeIcon2) {
        const icon1H = card.typeIcon?.displayHeight ?? 0;
        if (card.characterId === "brock" && isSelected) {
          card.typeIcon2.setY(iconY - 7 + icon1H);
          card.typeIcon2.setScale(0.59);
          card.typeIcon2.setX(brX + 1);
        } else if (card.characterId === "brock" && !isSelected) {
          card.typeIcon2.setY(iconY - 4 + icon1H);
          card.typeIcon2.setScale(iconScale);
          card.typeIcon2.setX(brX);
        } else {
          card.typeIcon2.setY(iconY + icon1H);
          card.typeIcon2.setScale(iconScale);
          card.typeIcon2.setX(brX);
        }
      }
      if (card.affinityIcon) {
        card.affinityIcon.setY(iconY);
        card.affinityIcon.setScale(0.45);
      }
      if (card.affinityLabel) card.affinityLabel.setY(iconY + 1);
    }

    const selectedCard = this.cards[this.selectedIndex];
    if (selectedCard) {
      const cx = selectedCard.container.x;
      const cy = selectedCard.container.y + GRID.CELL_HEIGHT / 2 + 4;

      this.focusNameText.setVisible(false);
      this.focusSubtitleText.setVisible(false);
      this.focusLevelText.setVisible(false);
    } else {
      this.focusNameText.setVisible(false);
      this.focusSubtitleText.setVisible(false);
      this.focusLevelText.setVisible(false);
    }

    if (selectedCard && !selectedCard.isUnlocked) {
      this.showLockedCharTooltip(selectedCard);
    } else {
      this.hideLockedCharTooltip();
    }
  }

  processInput(button: Button): boolean {
    if (this.isLevelUpAnimationActive) {
      if (button === Button.SUBMIT || button === Button.ACTION || button === Button.CANCEL) {
        skipCurrentLevelUpAnimation();
      }
      return true;
    }
    if (this.isChampionUnlockCutsceneActive) return true;
    if (!this.active || !this.config) return false;

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
          coordSpace: "screen",
          getAnchorGameCoords: () => {
            const canvas = (this.scene as BattleScene).game.canvas;
            const rect = canvas.getBoundingClientRect();
            return { x: rect.left + 10, y: rect.top + 10 };
          },
          elements: CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS as unknown as string[],
          modes: CharacterSelectUiHandler.TWEAK_MODES as unknown as string[],
          alphabeticalSort: true,
          onElementChange: (_name, idx) => {
            this._tweakAssetIndex = idx;
            this.updateTweakHUD();
          },
          onModeChange: (_name, idx) => {
            this._tweakMode = idx;
            this.updateTweakHUD();
          },
        });
        this._dropdownPanel.create();
        this._tweakBaselines.clear();
        this._maskBaselines.clear();
        for (let i = 0; i < CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length; i++) {
          const assetName = CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[i];
          const maskDef = CharacterSelectUiHandler.MASK_ASSET_MAP[assetName];
          if (maskDef) {
            const card = this.findCard(maskDef.characterId);
            if (card) this._maskBaselines.set(assetName, card[maskDef.field]);
          } else if (assetName === "AffinityStroke" || assetName === "AffinityFontSize") {
          } else {
            const t = this.getTweakTarget(i);
            if (t) {
              this._tweakBaselines.set(assetName, {
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
      } else if (!isActive && wasActive) {
        (this.scene as BattleScene).uiEditModeActive = false;
        this.cleanupTweakKeyListeners();
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
        this._tweakBaselines.clear();
        this._maskBaselines.clear();
        this.updateSelection();
      }
      console.log(`[CHARSEL-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      return true;
    }

    if (this._metaMode !== TweakMetaMode.NONE) {
      return this.handleTweakInput(button);
    }

    const col = this.selectedIndex % GRID.COLS;
    const row = Math.floor(this.selectedIndex / GRID.COLS);
    let newIndex = this.selectedIndex;
    let success = false;

    switch (button) {
      case Button.LEFT:
        newIndex = col > 0 ? this.selectedIndex - 1 : this.selectedIndex + (GRID.COLS - 1);
        success = true;
        break;
      case Button.RIGHT:
        newIndex = col < GRID.COLS - 1 ? this.selectedIndex + 1 : this.selectedIndex - (GRID.COLS - 1);
        success = true;
        break;
      case Button.UP:
        newIndex = row > 0 ? this.selectedIndex - GRID.COLS : this.selectedIndex + GRID.COLS;
        success = true;
        break;
      case Button.DOWN:
        newIndex = row < GRID.ROWS - 1 ? this.selectedIndex + GRID.COLS : this.selectedIndex - GRID.COLS;
        success = true;
        break;
      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmSelection();
      case Button.CANCEL:
        if (this.config.onCancel) {
          this.getUi().playSelect();
          this.config.onCancel();
          return true;
        }
        return false;
    }

    if (success && newIndex >= 0 && newIndex < this.cards.length && newIndex !== this.selectedIndex) {
      this.selectedIndex = newIndex;
      this.updateSelection();
      this.getUi().playSelect();
      return true;
    }

    return success;
  }

  private confirmSelection(): boolean {
    if (!this.config) return false;

    const card = this.cards[this.selectedIndex];
    if (!card) return false;

    if (!card.isUnlocked) {
      if (this.canAffordUnlock(card.characterId)) {
        this.performUnlock(card.characterId);
        card.isUnlocked = true;
        this.buildGrid();
        this.updateSelection();
        this.getUi().playSelect();
        this.playChampionUnlockCutscene(card.characterId);
        return true;
      } else {
        this.showLockedCharTooltip(card);
        this.getUi().playError();
        return false;
      }
    }

    this.getUi().playSelect();
    this.config.onCharacterSelected(card.characterId);
    return true;
  }

  private canAffordUnlock(characterId: string): boolean {
    const def = CHAMPION_DEFINITIONS[characterId];
    const reqs = (def?.unlockRequirements as any)?.essenceRequirements || [];
    if (reqs.length === 0) return false;
    const gd = (this.scene as BattleScene).gameData;
    return reqs.every((r: any) => (gd.getEssenceCount(r.type) || 0) >= (r.amount || 0));
  }

  private performUnlock(characterId: string): void {
    const def = CHAMPION_DEFINITIONS[characterId];
    const reqs = (def?.unlockRequirements as any)?.essenceRequirements || [];
    const gd = (this.scene as BattleScene).gameData;
    for (const r of reqs) {
      if (!gd.tryConsumeEssence(r.type, r.amount || 0)) {
        return;
      }
    }
    if (!gd.championData) {
      gd.championData = {};
    }
    if (!gd.championData[characterId]) {
      const manager = ChampionManager.getInstance();
      gd.championData[characterId] = manager.getChampionData(characterId) || {};
    }
    (gd.championData[characterId] as any).isUnlocked = true;
    if (typeof gd.applyChampionLevelUnlocks === "function") {
      gd.applyChampionLevelUnlocks(characterId);
    }
    gd.saveSystem();
  }

  private playChampionUnlockCutscene(characterId: string): void {
    const scene = this.scene as BattleScene;
    let effectiveId = characterId;
    if (characterId === "apollo_diana") {
      effectiveId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
    }

    if (scene.disableCutscenes) {
      const name = ChampionUtils.getChampionDisplayName(effectiveId);
      const msg = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
      const revealConfig = buildChampionSpriteRevealConfig(scene, effectiveId, name);
      this.isLevelUpAnimationActive = true;
      playGenericLevelUpAnimation(scene, msg, undefined, revealConfig, true).then(() => {
        this.isLevelUpAnimationActive = false;
        if (this.config) this.config.onCharacterSelected(characterId);
      });
      return;
    }

    const def = STORY_CUTSCENES.champion_unlock;
    if (!def || !def.slides?.length) {
      if (this.config) this.config.onCharacterSelected(characterId);
      return;
    }

    this.isChampionUnlockCutsceneActive = true;
    this.rootContainer?.setVisible(false);

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

      const controller = new SlideshowController(sceneAdapter, {
        slides: def.slides,
        canSkip: true,
        ignoreGameSpeed: true,
        pauseAfterText: 1000,
        onBeforeFade: () => {
          const name = ChampionUtils.getChampionDisplayName(effectiveId);
          const msg = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
          const revealConfig = buildChampionSpriteRevealConfig(scene, effectiveId, name);
          this.isLevelUpAnimationActive = true;
          playGenericLevelUpAnimation(scene, msg, undefined, revealConfig, true, preCutsceneBgmKey).then(() => {
            this.isLevelUpAnimationActive = false;
            if (this.config) this.config.onCharacterSelected(characterId);
          });
        },
        onComplete: () => {
          controller.destroy();
          unloadCutsceneImages(scene, def.slides.map(s => s.imageKey));
          this.rootContainer?.setVisible(true);
          this.isChampionUnlockCutsceneActive = false;
          this.unlockCutsceneController = null;
        },
      });

      this.unlockCutsceneController = controller;
      controller.start();

      this._cutsceneInputDownHandler = (evt: any) => {
        if (!this.isChampionUnlockCutsceneActive) return;
        const button = evt?.button;
        if (button === undefined || this.holdToSkipTimer) return;
        this.holdToSkipTimer = this.scene.time.delayedCall(Utils.fixedInt(1000) as any, () => {
          this.holdToSkipTimer = null;
          controller.skip();
        });
      };

      this._cutsceneInputUpHandler = () => {
        if (this.holdToSkipTimer) {
          this.holdToSkipTimer.remove();
          this.holdToSkipTimer = null;
        }
        if (!this.isChampionUnlockCutsceneActive) return;
        if (!controller.isTextReadyForAdvance(250)) {
          controller.completeText();
          return;
        }
        controller.next();
      };

      this._cutscenePointerDownHandler = () => {
        if (!this.isChampionUnlockCutsceneActive || this.holdToSkipTimer) return;
        this.holdToSkipTimer = this.scene.time.delayedCall(Utils.fixedInt(1000) as any, () => {
          this.holdToSkipTimer = null;
          controller.skip();
        });
      };

      this._cutscenePointerUpHandler = () => {
        if (this.holdToSkipTimer) {
          this.holdToSkipTimer.remove();
          this.holdToSkipTimer = null;
        }
        if (!this.isChampionUnlockCutsceneActive) return;
        if (!controller.isTextReadyForAdvance(250)) {
          controller.completeText();
          return;
        }
        controller.next();
      };

      scene.inputController.events.on("input_down", this._cutsceneInputDownHandler);
      scene.inputController.events.on("input_up", this._cutsceneInputUpHandler);
      scene.input.on("pointerdown", this._cutscenePointerDownHandler);
      scene.input.on("pointerup", this._cutscenePointerUpHandler);

      const origOnComplete = controller["config"].onComplete;
      controller["config"].onComplete = () => {
        this.cleanupCutsceneInputHandlers();
        if (this.holdToSkipTimer) {
          this.holdToSkipTimer.remove();
          this.holdToSkipTimer = null;
        }
        origOnComplete();
      };
    }).catch(() => {
      this.rootContainer?.setVisible(true);
      this.isChampionUnlockCutsceneActive = false;
      this.unlockCutsceneController = null;
      try { scene.playBgm(preCutsceneBgmKey || undefined); } catch {}
      const name = ChampionUtils.getChampionDisplayName(effectiveId);
      const msg = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
      const revealConfig = buildChampionSpriteRevealConfig(scene, effectiveId, name);
      this.isLevelUpAnimationActive = true;
      playGenericLevelUpAnimation(scene, msg, undefined, revealConfig, true, preCutsceneBgmKey).then(() => {
        this.isLevelUpAnimationActive = false;
        if (this.config) this.config.onCharacterSelected(characterId);
      });
    });
  }

  private createLockedTooltip(): void {
    const tooltipW = 120;
    const sectionHeaderStyle = {
      fontSize: "33px",
      fontStyle: "normal" as const,
      fontFamily: "pkmnems",
      letterSpacing: 2,
    };

    this._lockedTooltipContainer = this.scene.add.container(0, 0);
    this._lockedTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipW, 80, 12, 12, 12, 12);
    this._lockedTooltipBg.setOrigin(0, 0);
    this._lockedTooltipRarityBarBg = this.scene.add.graphics();
    this._lockedTooltipTitle = addTextObject(this.scene, tooltipW / 2, 8, "", TextStyle.WINDOW, { fontSize: "40px" });
    this._lockedTooltipTitle.setOrigin(0.5, 0.5);
    this._lockedTooltipRarity = addTextObject(this.scene, tooltipW / 2, 17, "", TextStyle.WINDOW, { fontSize: "30px" });
    this._lockedTooltipRarity.setOrigin(0.5, 0.5);
    this._lockedTooltipDesc = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "36px" });
    this._lockedTooltipDesc.setOrigin(0, 0);
    this._lockedTooltipSectionHeader = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, sectionHeaderStyle);
    this._lockedTooltipSectionHeader.setOrigin(0, 0.5);
    this._lockedTooltipSectionHeader.setColor("#666666");
    this._lockedTooltipSectionHeader.setAlpha(0.72);
    this._lockedTooltipSectionHeader.setShadow(0, 0, undefined);
    this._lockedTooltipSectionLine = this.scene.add.graphics();
    this._lockedTooltipCostContainer = this.scene.add.container(0, 0);
    this._lockedTooltipLoreBarBg = this.scene.add.graphics();
    this._lockedTooltipLore = addBBCodeTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
    this._lockedTooltipLore.setOrigin(0.5, 0);
    this._lockedTooltipContainer.add(this._lockedTooltipBg);
    this._lockedTooltipContainer.add(this._lockedTooltipRarityBarBg);
    this._lockedTooltipContainer.add(this._lockedTooltipTitle);
    this._lockedTooltipContainer.add(this._lockedTooltipRarity);
    this._lockedTooltipContainer.add(this._lockedTooltipDesc);
    this._lockedTooltipContainer.add(this._lockedTooltipSectionHeader);
    this._lockedTooltipContainer.add(this._lockedTooltipSectionLine);
    this._lockedTooltipContainer.add(this._lockedTooltipCostContainer);
    this._lockedTooltipContainer.add(this._lockedTooltipLoreBarBg);
    this._lockedTooltipContainer.add(this._lockedTooltipLore);
    this._lockedTooltipContainer.setVisible(false);
    this._lockedTooltipContainer.setDepth(100);
    this.rootContainer.add(this._lockedTooltipContainer);
  }

  private showLockedCharTooltip(card: CardData): void {
    if (card.isUnlocked || !this._lockedTooltipContainer || !this._lockedTooltipBg || !this._lockedTooltipCostContainer) return;

    const tooltipW = 120;
    const padding = 6;
    const textX = padding + 2;
    const centerX = tooltipW / 2 + 2;
    const TITLE_TEXT_Y = 6;
    const RARITY_TEXT_Y = 17;
    const RARITY_BAR_Y = 14;
    const RARITY_BAR_H = 6;
    const TITLE_BAR_H = 12;
    const CONTENT_Y = 20;
    const TEXT_SPACING = 4;
    const SECTION_HEADER_SPACING = 1;
    const LORE_BAR_PADDING_V = 2;
    const MIN_HEIGHT = 30;

    const rarityHex = "#00ff00";
    const rarityBorder = 0x00ff00;

    if (this._lockedTooltipTitle) {
      this._lockedTooltipTitle.setText(i18next.t("championSelect:tooltip.essenceRequiredTooltip", { defaultValue: "Required Essence" }));
      this._lockedTooltipTitle.setPosition(centerX, TITLE_TEXT_Y + 2);
      this._lockedTooltipTitle.setColor(rarityHex);
      this._lockedTooltipTitle.setStyle({
        ...this._lockedTooltipTitle.style,
        wordWrap: {},
        align: "center",
      });
    }

    if (this._lockedTooltipRarity) {
      const rarityText = i18next.t("championSelect:rarity.common", { defaultValue: "COMMON" });
      this._lockedTooltipRarity.setText(rarityText);
      this._lockedTooltipRarity.setTint(rarityBorder);
      this._lockedTooltipRarity.setPosition(centerX, RARITY_TEXT_Y);
    }

    if (this._lockedTooltipRarityBarBg) {
      this._lockedTooltipRarityBarBg.clear();
      this._lockedTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
      this._lockedTooltipRarityBarBg.fillRect(2, RARITY_BAR_Y, tooltipW - 4, RARITY_BAR_H);
    }

    let currentY = CONTENT_Y + 2;

    if (this._lockedTooltipDesc) {
      const descText = i18next.t("characterSelect:tooltip.essenceRequiredDesc", { defaultValue: "Spend essence to unlock this champion. To earn essences defeat Pokémon to gain their type." });
      this._lockedTooltipDesc.setText(descText);
      this._lockedTooltipDesc.setPosition(textX, currentY);
      this._lockedTooltipDesc.setColor("#ffffff");
      const scaleX = this._lockedTooltipDesc.scaleX || 0.167;
      const wrapWidthPreScale = Math.max(0, (tooltipW - padding * 2) / scaleX);
      const descLineSpacing = this._lockedTooltipDesc.lineSpacing;
      this._lockedTooltipDesc.setStyle({
        ...this._lockedTooltipDesc.style,
        wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
      });
      this._lockedTooltipDesc.setLineSpacing(descLineSpacing);
      currentY += this._lockedTooltipDesc.displayHeight + TEXT_SPACING;
    }

    const costResult = this.buildUnlockCostRow(this._lockedTooltipCostContainer, card.characterId);

    if (costResult.hasContent) {
      currentY += 2;
      if (this._lockedTooltipSectionHeader) {
        const headerText = i18next.t("championSelect:tooltip.requiredEssenceHeader", { defaultValue: "REQUIRED ESSENCE" });
        this._lockedTooltipSectionHeader.setText(headerText);
        this._lockedTooltipSectionHeader.setVisible(true);
        const headerH = this._lockedTooltipSectionHeader.displayHeight;
        const headerCenterY = currentY + headerH / 2;
        this._lockedTooltipSectionHeader.setPosition(textX, headerCenterY);

        if (this._lockedTooltipSectionLine) {
          this._lockedTooltipSectionLine.clear();
          this._lockedTooltipSectionLine.lineStyle(0.5, 0x666666, 0.6);
          const lineStartX = textX + this._lockedTooltipSectionHeader.displayWidth + 4;
          const lineEndX = tooltipW - padding - 2;
          if (lineEndX > lineStartX) {
            this._lockedTooltipSectionLine.lineBetween(lineStartX, headerCenterY, lineEndX, headerCenterY);
          }
        }
        currentY += headerH + SECTION_HEADER_SPACING;
      }

      this._lockedTooltipCostContainer.setPosition(textX, currentY);
      this._lockedTooltipCostContainer.setVisible(true);
      currentY += costResult.height + 4;
    } else {
      if (this._lockedTooltipSectionHeader) this._lockedTooltipSectionHeader.setVisible(false);
      if (this._lockedTooltipSectionLine) this._lockedTooltipSectionLine.clear();
      this._lockedTooltipCostContainer.setVisible(false);
    }

    const loreText = i18next.t("championSelect:tooltip.essenceLoreNote", { defaultValue: "" });
    const showLore = !!loreText;
    let loreBarHeight = 0;
    if (showLore && this._lockedTooltipLore && this._lockedTooltipLoreBarBg) {
      this._lockedTooltipLore.setText(loreText);
      const loreScale = this._lockedTooltipLore.scaleX || 0.167;
      const loreWrapWidth = Math.max(0, (tooltipW - padding * 2) / loreScale);
      const loreLineSpacing = this._lockedTooltipLore.lineSpacing;
      this._lockedTooltipLore.setStyle({
        ...this._lockedTooltipLore.style,
        fontSize: "30px",
        fontStyle: "italic",
        color: "#B0B0B0",
        wordWrap: { width: loreWrapWidth, useAdvancedWrap: true },
        align: "center"
      });
      this._lockedTooltipLore.setLineSpacing(loreLineSpacing);
      this._lockedTooltipLore.setVisible(true);
      const loreTextH = Math.min(this._lockedTooltipLore.displayHeight, 40);
      loreBarHeight = loreTextH + LORE_BAR_PADDING_V * 2;
    } else {
      if (this._lockedTooltipLore) this._lockedTooltipLore.setVisible(false);
      if (this._lockedTooltipLoreBarBg) this._lockedTooltipLoreBarBg.clear();
    }

    const barsHeight = TITLE_BAR_H + RARITY_BAR_H;
    const totalH = Math.max(
      MIN_HEIGHT,
      barsHeight + (currentY - (CONTENT_Y + 2)) + padding + loreBarHeight
    );

    if (showLore && this._lockedTooltipLore && this._lockedTooltipLoreBarBg) {
      const loreBarY = totalH - loreBarHeight;
      this._lockedTooltipLoreBarBg.clear();
      this._lockedTooltipLoreBarBg.fillStyle(0x0f0f1e, 0.7);
      this._lockedTooltipLoreBarBg.fillRect(2, loreBarY, tooltipW - 4, loreBarHeight);
      this._lockedTooltipLore.setPosition(centerX - 2, loreBarY + LORE_BAR_PADDING_V);
      if (this._lockedTooltipLore.displayHeight > 40) {
        this._lockedTooltipLore.setCrop(0, 0, tooltipW, 40);
      } else {
        this._lockedTooltipLore.setCrop();
      }
    }

    this._lockedTooltipBg.setSize(tooltipW, totalH);

    const screenW = this.scene.game.canvas.width / 6;
    const screenH = this.scene.game.canvas.height / 6;
    const ax = this.gridContainer.x + card.container.x;
    const ay = this.gridContainer.y + card.container.y;
    const iconHalfW = GRID.CELL_WIDTH * GRID.TILE_SCALE_X / 2;
    const tipGap = 4;
    const tipMargin = 4;
    const xRight = ax + iconHalfW + tipGap;
    const xLeft = ax - iconHalfW - tipGap - tooltipW;
    let tx = xRight + tooltipW > screenW ? xLeft : xRight;
    tx = Math.max(tipMargin, Math.min(screenW - tooltipW - tipMargin, tx));
    let ty = ay - totalH / 2;
    ty = Math.max(-screenH + tipMargin, Math.min(-tipMargin, ty));
    this._lockedTooltipContainer.setPosition(tx, ty);
    this._lockedTooltipContainer.setVisible(true);
  }

  private hideLockedCharTooltip(): void {
    if (this._lockedTooltipContainer) {
      this._lockedTooltipContainer.setVisible(false);
    }
  }

  private buildUnlockCostRow(container: Phaser.GameObjects.Container, characterId: string): { height: number; hasContent: boolean } {
    container.removeAll(true);
    const def = CHAMPION_DEFINITIONS[characterId];
    const reqs = (def?.unlockRequirements as any)?.essenceRequirements || [];
    if (reqs.length === 0) return { height: 0, hasContent: false };

    const gd = (this.scene as BattleScene).gameData;
    const iconScale = 0.35;
    const specialScale = 0.4263;
    const iconTextGap = 4;
    const sectionGap = 3;
    let x = 0;
    let maxH = 0;

    for (let ri = 0; ri < reqs.length; ri++) {
      const req = reqs[ri];
      const essenceType = req.type as Type;

      if (ri > 0) {
        const sep = addTextObject(this.scene, x, 0, "\u00B7", TextStyle.WINDOW, { fontSize: "36px", fontStyle: "bold", color: "#E8E8E8" });
        sep.setOrigin(0, 0);
        container.add(sep);
        x += sep.displayWidth + sectionGap;
      }

      const isSmitty = essenceType === (Type as any).SMITTY;
      const isGlitch = essenceType === (Type as any).GLITCH;
      const isGenOne = essenceType === (Type as any).GEN_ONE;
      const isSpecial = isSmitty || isGlitch || isGenOne;

      let atlas: string;
      let frame: string;
      if (isGenOne) {
        atlas = "pbinfo_enemy_type";
        frame = "normal";
      } else if (isGlitch) {
        atlas = "categories";
        frame = "physical";
      } else if (isSmitty) {
        atlas = "categories";
        frame = "special";
      } else {
        atlas = Utils.getLocalizedSpriteKey("types");
        frame = Type[essenceType]?.toLowerCase() || "normal";
      }

      const appliedScale = isSpecial ? specialScale : iconScale;

      if (isSpecial) {
        const specialContainer = this.scene.add.container(x, 0);
        const typeIcon = this.scene.add.sprite(0, 0, atlas, frame);
        typeIcon.setScale(appliedScale);
        typeIcon.setOrigin(0, 0);
        if (isSmitty) {
          typeIcon.setTint(0xFF0000);
        } else if (isGlitch) {
          try {
            if (typeIcon.postFX && typeof typeIcon.postFX.addColorMatrix === "function") {
              const cm = typeIcon.postFX.addColorMatrix();
              cm.negative();
            }
          } catch {
            typeIcon.setTint(0xFF00FF);
          }
        } else if (isGenOne) {
          typeIcon.setTint(0x33CC33);
        }
        specialContainer.add(typeIcon);

        const labelText = isGlitch
          ? i18next.t("pokemonInfo:Type.GLITCH", { defaultValue: "GLITCH" }).toUpperCase()
          : isGenOne
            ? i18next.t("pokemonInfo:Type.GEN_ONE", { defaultValue: "GEN I" }).toUpperCase()
            : i18next.t("pokemonInfo:Type.SMITTY", { defaultValue: "SMITTY" }).toUpperCase();

        const specialLabel = addTextObject(this.scene, 0, 0, labelText, TextStyle.WINDOW, {
          fontSize: "29px",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        });
        if (isGenOne) {
          specialLabel.setColor("#33CC33");
        }
        specialLabel.setOrigin(0.5, 0.5);
        specialLabel.setPosition(
          typeIcon.displayWidth / 2,
          typeIcon.displayHeight / 2
        );
        specialContainer.add(specialLabel);
        container.add(specialContainer);
        x += typeIcon.displayWidth + iconTextGap;
        maxH = Math.max(maxH, typeIcon.displayHeight, specialLabel.displayHeight);
      } else {
        const icon = this.scene.add.sprite(x, 0, atlas, frame);
        icon.setScale(appliedScale);
        icon.setOrigin(0, 0);
        container.add(icon);
        x += icon.displayWidth + iconTextGap;
        maxH = Math.max(maxH, icon.displayHeight);
      }

      const current = Math.min(gd.getEssenceCount(essenceType) || 0, req.amount || 0);
      const isMet = current >= (req.amount || 0);
      const amountText = addTextObject(this.scene, x, 0, `${current}/${req.amount}`, TextStyle.WINDOW, {
        fontSize: "36px",
        color: isMet ? "#00ff00" : "#ffffff"
      });
      amountText.setOrigin(0, 0);
      container.add(amountText);
      x += amountText.displayWidth + sectionGap;

      maxH = Math.max(maxH, amountText.displayHeight);
    }

    return { height: maxH, hasContent: reqs.length > 0 };
  }

  setCursor(cursor: number): boolean {
    const changed = super.setCursor(cursor);
    if (changed) {
      this.selectedIndex = cursor;
      this.updateSelection();
    }
    return changed;
  }

  private findCard(characterId: string): CardData | undefined {
    return this.cards.find(c => c.characterId === characterId);
  }

  private redrawFocusBg(gfx: Phaser.GameObjects.Graphics, w: number, h: number, nameY: number): void {
    gfx.clear();
    gfx.fillStyle(0x000000, this._focusBgAlpha);
    gfx.fillRoundedRect(-w / 2, nameY - 18, w, h, { tl: 0, tr: 0, bl: 3, br: 3 });
  }

  private redrawUnfocusBg(gfx: Phaser.GameObjects.Graphics, w: number, h: number, nameY: number): void {
    gfx.clear();
    gfx.fillStyle(0x000000, this._unfocusBgAlpha);
    gfx.fillRoundedRect(-w / 2, nameY - 16, w, h, { tl: 0, tr: 0, bl: 3, br: 3 });
  }

  private refreshCardMask(characterId: string): void {
    const card = this.findCard(characterId);
    if (!card?.maskGfx) return;
    const cellRatio = GRID.CELL_HEIGHT / 70;
    const uiBaseY = this.scene.game.canvas.height / 6;
    const clipW = card.maskW;
    const clipH = card.maskH * cellRatio;
    const x = card.container.x;
    const y = card.container.y;
    const clipX = x - clipW / 2;
    const clipY = uiBaseY + (y - clipH / 2 + card.maskOffsetY * cellRatio);
    card.maskGfx.clear();
    card.maskGfx.fillStyle(0xffffff);
    card.maskGfx.fillRect(clipX, clipY, clipW, clipH);
  }

  private isPlayerAvatar(characterId: string): boolean {
    return characterId === "apollo" || characterId === "diana";
  }

  private getPrimaryTypeBadgeTarget(): any | null {
    for (const card of this.cards) {
      if (card.characterId === "random") continue;
      if (card.typeIcon) return card.typeIcon;
      if (card.typeIcon2) return card.typeIcon2;
      if (card.affinityIcon) return card.affinityIcon;
      if (card.affinityLabel) return card.affinityLabel;
    }
    return null;
  }

  private getAllTypeBadgeTargets(): any[] {
    const targets: any[] = [];
    for (const card of this.cards) {
      if (card.characterId === "random") continue;
      if (card.typeIcon) targets.push(card.typeIcon);
      if (card.typeIcon2) targets.push(card.typeIcon2);
      if (card.affinityIcon) targets.push(card.affinityIcon);
      if (card.affinityLabel) targets.push(card.affinityLabel);
    }
    return targets;
  }

  private getUnfocusedTypeIconTarget(): any | null {
    const card = this.cards.find((_c, idx) => idx !== this.selectedIndex && _c.typeIcon);
    return card?.typeIcon ?? null;
  }

  private getUnfocusedTypeIconTargets(): any[] {
    const targets: any[] = [];
    this.cards.forEach((_c, idx) => {
      if (idx !== this.selectedIndex) {
        if (_c.typeIcon) targets.push(_c.typeIcon);
        if (_c.typeIcon2) targets.push(_c.typeIcon2);
        if (_c.affinityIcon) targets.push(_c.affinityIcon);
      }
    });
    return targets;
  }

  private getFocusedCardTypeBadgeTarget(): any | null {
    const card = this.cards[this.selectedIndex];
    if (!card) return null;
    return card.typeIcon ?? card.typeIcon2 ?? card.affinityIcon ?? card.affinityLabel ?? null;
  }

  private getFocusedCardTypeBadgeTargets(): any[] {
    const card = this.cards[this.selectedIndex];
    if (!card) return [];
    const targets: any[] = [];
    if (card.typeIcon) targets.push(card.typeIcon);
    if (card.typeIcon2) targets.push(card.typeIcon2);
    if (card.affinityIcon) targets.push(card.affinityIcon);
    if (card.affinityLabel) targets.push(card.affinityLabel);
    return targets;
  }

  private getCardNameTextTarget(): any | null {
    return this.cards[this.selectedIndex]?.nameText ?? null;
  }

  private getAllCardNameTextTargets(): any[] {
    return this.cards.map(c => c.nameText).filter(Boolean);
  }

  private getCardSubtitleTextTarget(): any | null {
    return this.cards[this.selectedIndex]?.subtitleText ?? null;
  }

  private getAllCardSubtitleTextTargets(): any[] {
    return this.cards.map(c => c.subtitleText).filter(Boolean);
  }

  private getUnfocusedDefaultTileTarget(): any | null {
    const card = this.cards.find((_, i) => i !== this.selectedIndex);
    return card?.defaultTile ?? null;
  }

  private getUnfocusedDefaultTileTargets(): any[] {
    return this.cards
      .filter((_, i) => i !== this.selectedIndex)
      .map(c => c.defaultTile)
      .filter(Boolean);
  }

  private getMysterySpriteTarget(): any | null {
    return this.findCard("random")?.sprite ?? null;
  }

  private getAffinityIconTarget(): any | null {
    return this.cards.find(c => c.affinityIcon)?.affinityIcon ?? null;
  }

  private getAffinityLabelTarget(): any | null {
    return this.cards.find(c => c.affinityLabel)?.affinityLabel ?? null;
  }

  private getTweakTarget(assetIndex: number): any | null {
    switch (assetIndex) {
      case 0: return this.getAffinityIconTarget();
      case 1: return this.getAffinityIconTarget();
      case 2: return this.getAffinityLabelTarget();
      case 3: return this.getAffinityLabelTarget();
      case 4: return this.getAffinityIconTarget();
      case 5: return this.getAffinityLabelTarget();
      case 6: return this.getAffinityLabelTarget();
      case 7: return this.focusNameText;
      case 10: return this.findCard("apollo")?.sprite ?? null;
      case 13: return this.findCard("brock")?.sprite ?? null;
      case 14: return this.getCardNameTextTarget();
      case 15: return this.getCardSubtitleTextTarget();
      case 16: return this.cards[0]?.defaultTile ?? null;
      case 19: return this.findCard("diana")?.sprite ?? null;
      case 20: return this.cards[this.selectedIndex]?.nameBg ?? null;
      case 21: return this.cards[this.selectedIndex]?.nameBg ?? null;
      case 22: return this.findCard("brock")?.typeIcon ?? null;
      case 23: return this.cards[this.selectedIndex]?.sprite ?? null;
      case 24: return this.cards[this.selectedIndex]?.silverTile ?? null;
      case 25: return this.getFocusedCardTypeBadgeTarget();
      case 26: return this.focusLevelText;
      case 27: return this.focusNameText;
      case 28: return this.footerText;
      case 29: return this.gridContainer;
      case 30: return this.headerText;
      case 31: return this.headerText;
      case 35: return this.findCard("misty")?.sprite ?? null;
      case 38: return this.findCard("random")?.sprite ?? null;
      case 41: return this.findCard("red")?.sprite ?? null;
      case 42: return this.getPrimaryTypeBadgeTarget();
      case 43: {
        const unfocusedIdx = this.cards.findIndex((_c, idx) => idx !== this.selectedIndex);
        return unfocusedIdx >= 0 ? this.cards[unfocusedIdx]?.unfocusBg ?? null : null;
      }
      case 44: return this.findCard("brock")?.typeIcon ?? null;
      case 45: return this.getUnfocusedDefaultTileTarget();
      case 46: return this.getUnfocusedTypeIconTarget();
      case 47: {
        const unfocusedIdx = this.cards.findIndex((_c, idx) => idx !== this.selectedIndex);
        return unfocusedIdx >= 0 ? this.cards[unfocusedIdx]?.unfocusLevelText ?? null : null;
      }
      case 48: {
        const unfocusedIdx = this.cards.findIndex((_c, idx) => idx !== this.selectedIndex);
        return unfocusedIdx >= 0 ? this.cards[unfocusedIdx]?.unfocusNameText ?? null : null;
      }
      case 49: {
        const unfocusedIdx = this.cards.findIndex((_c, idx) => idx !== this.selectedIndex);
        return unfocusedIdx >= 0 ? this.cards[unfocusedIdx]?.unfocusNameText ?? null : null;
      }
      default: return null;
    }
  }

  private getTweakGroupTargets(assetIndex: number): any[] {
    switch (assetIndex) {
      case 0: {
        const targets: any[] = [];
        const icon = this.getAffinityIconTarget();
        const label = this.getAffinityLabelTarget();
        if (icon) targets.push(icon);
        if (label) targets.push(label);
        return targets;
      }
      case 1: {
        const targets: any[] = [];
        const icon = this.getAffinityIconTarget();
        const label = this.getAffinityLabelTarget();
        if (icon) targets.push(icon);
        if (label) targets.push(label);
        return targets;
      }
      case 7: return [this.focusNameText, this.focusLevelText].filter(Boolean);
      case 14: return this.getAllCardNameTextTargets();
      case 15: return this.getAllCardSubtitleTextTargets();
      case 16: return this.cards.map(c => c.defaultTile).concat(this.cards.map(c => c.silverTile));
      case 21: {
        const card = this.cards[this.selectedIndex];
        const targets: any[] = [];
        if (card?.nameBg) targets.push(card.nameBg);
        if (card?.typeIcon) targets.push(card.typeIcon);
        if (card?.typeIcon2) targets.push(card.typeIcon2);
        if (card?.affinityIcon) targets.push(card.affinityIcon);
        if (card?.affinityLabel) targets.push(card.affinityLabel);
        return targets;
      }
      case 22: return [this.findCard("brock")?.typeIcon, this.findCard("brock")?.typeIcon2].filter(Boolean);
      case 25: return this.getFocusedCardTypeBadgeTargets();
      case 42: return this.getAllTypeBadgeTargets();
      case 43: return this.cards.filter((_c, idx) => idx !== this.selectedIndex).map(c => c.unfocusBg);
      case 44: return [this.findCard("brock")?.typeIcon, this.findCard("brock")?.typeIcon2].filter(Boolean);
      case 45: return this.getUnfocusedDefaultTileTargets();
      case 46: return this.getUnfocusedTypeIconTargets();
      case 47: return this.cards.filter((_c, idx) => idx !== this.selectedIndex).map(c => c.unfocusLevelText);
      case 48: {
        const targets: any[] = [];
        this.cards.filter((_c, idx) => idx !== this.selectedIndex).forEach(c => {
          if (c.unfocusNameText) targets.push(c.unfocusNameText);
          if (c.unfocusLevelText) targets.push(c.unfocusLevelText);
        });
        return targets;
      }
      case 49: return this.cards.filter((_c, idx) => idx !== this.selectedIndex).map(c => c.unfocusNameText);
      default: return [];
    }
  }

  private applyHeaderStylePreset(preset: 0 | 1): void {
    this._headerStylePreset = preset;
    const height = Math.floor(this.scene.game.canvas.height / 6);
    if (preset === 0) {
      this.headerText.setFontSize(80);
      this.headerText.setColor("#FFFFFF");
      this.headerText.setTint(0xFFFFFF);
      this.headerText.setStroke("#424242", 14);
      this.headerText.setY(-height + 4);
    } else {
      this.headerText.setFontSize(93);
      this.headerText.setColor("#E8E8E8");
      this.headerText.setTint(0xE8E8E8);
      this.headerText.setStroke("#424242", 14);
      this.headerText.setY(-height + 5);
    }
  }

  private applyTweakToTarget(target: any, mode: string, direction: string, scaleStep: number, posStep: number, sizeStep: number): void {
    const alphaStep = 0.02;
    const fontStep = 1;
    if (direction === "up") {
      if (mode === "scale") target.setScale(target.scaleX + scaleStep);
      else if (mode === "position") target.y -= posStep;
      else if (mode === "width" && typeof target.setDisplaySize === "function" && target.displayWidth !== undefined) target.setDisplaySize(target.displayWidth + sizeStep, target.displayHeight);
      else if (mode === "height" && typeof target.setDisplaySize === "function" && target.displayHeight !== undefined) target.setDisplaySize(target.displayWidth, target.displayHeight + sizeStep);
      else if (mode === "alpha" && typeof target.setAlpha === "function") target.setAlpha(Math.min(1.0, (target.alpha ?? 1.0) + alphaStep));
      else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        target.setFontSize(parseInt(target.style?.fontSize || "16", 10) + fontStep);
      }
    } else if (direction === "down") {
      if (mode === "scale") target.setScale(Math.max(0.01, target.scaleX - scaleStep));
      else if (mode === "position") target.y += posStep;
      else if (mode === "width" && typeof target.setDisplaySize === "function" && target.displayWidth !== undefined) target.setDisplaySize(Math.max(1, target.displayWidth - sizeStep), target.displayHeight);
      else if (mode === "height" && typeof target.setDisplaySize === "function" && target.displayHeight !== undefined) target.setDisplaySize(target.displayWidth, Math.max(1, target.displayHeight - sizeStep));
      else if (mode === "alpha" && typeof target.setAlpha === "function") target.setAlpha(Math.max(0.0, (target.alpha ?? 1.0) - alphaStep));
      else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        target.setFontSize(Math.max(4, parseInt(target.style?.fontSize || "16", 10) - fontStep));
      }
    } else if (direction === "right" && mode === "position") {
      target.x += posStep;
    } else if (direction === "left" && mode === "position") {
      target.x -= posStep;
    }
  }

  private static readonly MASK_ASSET_MAP: { [key: string]: { characterId: string; field: "maskH" | "maskOffsetY" | "maskW" } } = {
    "ApolloMaskH": { characterId: "apollo", field: "maskH" },
    "ApolloMaskOffsetY": { characterId: "apollo", field: "maskOffsetY" },
    "DianaMaskH": { characterId: "diana", field: "maskH" },
    "DianaMaskOffsetY": { characterId: "diana", field: "maskOffsetY" },
    "BrockMaskH": { characterId: "brock", field: "maskH" },
    "BrockMaskOffsetY": { characterId: "brock", field: "maskOffsetY" },
    "MistyMaskH": { characterId: "misty", field: "maskH" },
    "MistyMaskOffsetY": { characterId: "misty", field: "maskOffsetY" },
    "MistyMaskW": { characterId: "misty", field: "maskW" },
    "RedMaskH": { characterId: "red", field: "maskH" },
    "RedMaskOffsetY": { characterId: "red", field: "maskOffsetY" },
    "MysteryMaskH": { characterId: "random", field: "maskH" },
    "MysteryMaskOffsetY": { characterId: "random", field: "maskOffsetY" },
  };

  private handleTweakInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this._metaMode = TweakMetaMode.NONE;
      this.cleanupTweakKeyListeners();
      this._tweakBaselines.clear();
      this._maskBaselines.clear();
      this.updateTweakHUD();
      this.updateSelection();
      this.scene.uiEditModeActive = false;
      console.log(`[CHARSEL-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      return true;
    }
    if (button === Button.SUBMIT) {
      if (this._metaMode === TweakMetaMode.EDIT_TYPE || this._metaMode === TweakMetaMode.ELEMENT) {
        this._metaMode = TweakMetaMode.EDIT;
        this.updateTweakHUD();
        console.log(`[CHARSEL-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._tweakMode = (this._tweakMode - 1 + CharacterSelectUiHandler.TWEAK_MODES.length) % CharacterSelectUiHandler.TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[CHARSEL-TWEAK] mode=${CharacterSelectUiHandler.TWEAK_MODES[this._tweakMode]}`);
      } else if (button === Button.RIGHT) {
        this._tweakMode = (this._tweakMode + 1) % CharacterSelectUiHandler.TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[CHARSEL-TWEAK] mode=${CharacterSelectUiHandler.TWEAK_MODES[this._tweakMode]}`);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._tweakAssetIndex = (this._tweakAssetIndex - 1 + CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length) % CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length;
        this.updateTweakHUD();
        console.log(`[CHARSEL-TWEAK] asset=${CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]}`);
      } else if (button === Button.RIGHT) {
        this._tweakAssetIndex = (this._tweakAssetIndex + 1) % CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length;
        this.updateTweakHUD();
        console.log(`[CHARSEL-TWEAK] asset=${CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]}`);
      }
      return true;
    }

    const mode = CharacterSelectUiHandler.TWEAK_MODES[this._tweakMode];
    const assetName = CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex];

    const maskDef = CharacterSelectUiHandler.MASK_ASSET_MAP[assetName];
    if (maskDef) {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        default: return true;
      }
      const card = this.findCard(maskDef.characterId);
      if (!card) {
        console.log(`[CHARSEL-TWEAK] no card for mask asset=${assetName}`);
        return true;
      }
      const step = 1;
      if (direction === "up") {
        card[maskDef.field] += step;
      } else {
        card[maskDef.field] = (maskDef.field === "maskH" || maskDef.field === "maskW") ? Math.max(1, card[maskDef.field] - step) : card[maskDef.field] - step;
      }
      this.refreshCardMask(maskDef.characterId);
      const baseline = this._maskBaselines.get(assetName) ?? card[maskDef.field];
      const delta = card[maskDef.field] - baseline;
      console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=${assetName}\n  current: ${maskDef.field}=${card[maskDef.field].toFixed(3)}\n  delta:   Δ${maskDef.field}=${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`);
      return true;
    }

    if (assetName === "AffinityStroke" || assetName === "AffinityFontSize") {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        default: return true;
      }
      const afLabel = this.getAffinityLabelTarget();
      if (!afLabel) return true;
      if (assetName === "AffinityStroke") {
        const currentStroke = (afLabel as any)._strokeThickness ?? 8;
        const newStroke = direction === "up" ? currentStroke + 1 : Math.max(0, currentStroke - 1);
        afLabel.setStroke("#424242", newStroke);
        (afLabel as any)._strokeThickness = newStroke;
        console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=AffinityStroke current=${newStroke}`);
      } else {
        const currentSize = parseInt(afLabel.style?.fontSize || "28", 10);
        const newSize = direction === "up" ? currentSize + 1 : Math.max(8, currentSize - 1);
        afLabel.setFontSize(newSize);
        console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=AffinityFontSize current=${newSize}px`);
      }
      return true;
    }

    if (assetName === "FocusBg" && (mode === "width" || mode === "height")) {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        case Button.RIGHT: direction = "right"; break;
        case Button.LEFT: direction = "left"; break;
        default: return true;
      }
      const card = this.cards[this.selectedIndex];
      if (!card) return true;
      const nameY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.NAME_BOTTOM_MARGIN;
      if (mode === "width") {
        this._focusBgW += (direction === "right" || direction === "up") ? 1 : -1;
        this._focusBgW = Math.max(1, this._focusBgW);
      } else {
        this._focusBgH += (direction === "up") ? 1 : -1;
        this._focusBgH = Math.max(1, this._focusBgH);
      }
      this.redrawFocusBg(card.nameBg, this._focusBgW, this._focusBgH, nameY);
      console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=FocusBg w=${this._focusBgW} h=${this._focusBgH}`);
      return true;
    }

    if (assetName === "FocusBg" && mode === "alpha") {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        default: return true;
      }
      const card = this.cards[this.selectedIndex];
      if (!card) return true;
      const nameY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.NAME_BOTTOM_MARGIN;
      this._focusBgAlpha += direction === "up" ? 0.02 : -0.02;
      this._focusBgAlpha = Math.max(0, Math.min(1, this._focusBgAlpha));
      this.redrawFocusBg(card.nameBg, this._focusBgW, this._focusBgH, nameY);
      console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=FocusBg fillAlpha=${this._focusBgAlpha.toFixed(2)}`);
      return true;
    }

    if (assetName === "UnfocusBlackBG" && (mode === "width" || mode === "height")) {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        case Button.RIGHT: direction = "right"; break;
        case Button.LEFT: direction = "left"; break;
        default: return true;
      }
      const nameY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.NAME_BOTTOM_MARGIN;
      if (mode === "width") {
        this._unfocusBgW += (direction === "right" || direction === "up") ? 1 : -1;
        this._unfocusBgW = Math.max(1, this._unfocusBgW);
      } else {
        this._unfocusBgH += (direction === "up") ? 1 : -1;
        this._unfocusBgH = Math.max(1, this._unfocusBgH);
      }
      this.cards.forEach((_c, idx) => {
        if (idx !== this.selectedIndex) {
          this.redrawUnfocusBg(_c.unfocusBg, this._unfocusBgW, this._unfocusBgH, nameY);
        }
      });
      console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=UnfocusBlackBG w=${this._unfocusBgW} h=${this._unfocusBgH}`);
      return true;
    }

    if (assetName === "UnfocusBlackBG" && mode === "alpha") {
      let direction = "";
      switch (button) {
        case Button.UP: direction = "up"; break;
        case Button.DOWN: direction = "down"; break;
        default: return true;
      }
      const nameY = (GRID.CELL_HEIGHT * GRID.TILE_SCALE_Y) / 2 - GRID.NAME_BOTTOM_MARGIN;
      this._unfocusBgAlpha += direction === "up" ? 0.02 : -0.02;
      this._unfocusBgAlpha = Math.max(0, Math.min(1, this._unfocusBgAlpha));
      this.cards.forEach((_c, idx) => {
        if (idx !== this.selectedIndex) {
          this.redrawUnfocusBg(_c.unfocusBg, this._unfocusBgW, this._unfocusBgH, nameY);
        }
      });
      console.log(`[CHARSEL-TWEAK] ${direction.toUpperCase()} | asset=UnfocusBlackBG fillAlpha=${this._unfocusBgAlpha.toFixed(2)}`);
      return true;
    }

    const target = this.getTweakTarget(this._tweakAssetIndex);
    if (!target) {
      console.log(`[CHARSEL-TWEAK] no target for asset=${assetName}`);
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

    if (assetName === "HeaderStyleToggle") {
      if (direction === "up") {
        this.applyHeaderStylePreset(1);
      } else if (direction === "down") {
        this.applyHeaderStylePreset(0);
      }
      this.logTweakState("HeaderStyleToggle", this.headerText, `stylePreset=${this._headerStylePreset === 0 ? "charsel" : "champion"}`);
      return true;
    }

    if (isGroup) {
      groupTargets.forEach(t => this.applyTweakToTarget(t, mode, direction, scaleStep, posStep, sizeStep));
      this.logTweakState(assetName, target, `${mode} ${direction.toUpperCase()} (${groupTargets.length} targets)`);
    } else {
      this.applyTweakToTarget(target, mode, direction, scaleStep, posStep, sizeStep);
      this.logTweakState(assetName, target, `${mode} ${direction.toUpperCase()}`);
    }
    return true;
  }

  private logTweakState(assetName: string, target: any, action: string): void {
    const x = (target as any).x ?? 0;
    const y = (target as any).y ?? 0;
    const sx = (target as any).scaleX ?? 1;
    const sy = (target as any).scaleY ?? 1;
    const dw = (target as any).displayWidth ?? 0;
    const dh = (target as any).displayHeight ?? 0;
    const a = (target as any).alpha ?? 1;
    const fs = parseInt((target as any).style?.fontSize || "0", 10);
    const fsStr = fs > 0 ? ` fs=${fs}` : "";
    const baseline = this._tweakBaselines.get(assetName);
    if (baseline) {
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
      console.log(`[CHARSEL-TWEAK] ${action} | asset=${assetName}\n  current: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}`);
    } else {
      console.log(`[CHARSEL-TWEAK] ${action} | asset=${assetName} | x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}`);
    }
  }

  private outputAllTweakStates(): void {
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];
    for (let i = 0; i < CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length; i++) {
      const name = CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[i];
      const maskDef = CharacterSelectUiHandler.MASK_ASSET_MAP[name];
      if (maskDef) {
        const card = this.findCard(maskDef.characterId);
        if (!card) { unavailable.push(name); continue; }
        const current = card[maskDef.field];
        const baseline = this._maskBaselines.get(name);
        if (baseline !== undefined) {
          const delta = current - baseline;
          if (Math.abs(delta) > 0.001) {
            changed.push(`${name}:\n  delta:    Δ${maskDef.field}=${delta >= 0 ? "+" : ""}${delta.toFixed(3)}\n  current:  ${maskDef.field}=${current.toFixed(3)}\n  baseline: ${maskDef.field}=${baseline.toFixed(3)}`);
          } else { unchanged.push(name); }
        } else {
          changed.push(`${name}: ${maskDef.field}=${current.toFixed(3)} [no baseline]`);
        }
        continue;
      }
      if (name === "AffinityStroke" || name === "AffinityFontSize") {
        const afLabel = this.getAffinityLabelTarget();
        if (!afLabel) { unavailable.push(name); continue; }
        if (name === "AffinityStroke") {
          const val = (afLabel as any)._strokeThickness ?? 8;
          changed.push(`${name}: stroke=${val}`);
        } else {
          const val = parseInt(afLabel.style?.fontSize || "28", 10);
          changed.push(`${name}: fontSize=${val}px`);
        }
        continue;
      }
      if (name === "FocusBg") {
        const bgTarget = this.cards[this.selectedIndex]?.nameBg;
        const bgX = bgTarget?.x ?? 0;
        const bgY = bgTarget?.y ?? 0;
        changed.push(`${name}: x=${bgX} y=${bgY} w=${this._focusBgW} h=${this._focusBgH} fillAlpha=${this._focusBgAlpha.toFixed(2)}`);
        continue;
      }
      if (name === "UnfocusBlackBG") {
        const unfIdx = this.cards.findIndex((_c, idx) => idx !== this.selectedIndex);
        const unfTarget = unfIdx >= 0 ? this.cards[unfIdx]?.unfocusBg : null;
        const unfX = unfTarget?.x ?? 0;
        const unfY = unfTarget?.y ?? 0;
        changed.push(`${name}: x=${unfX} y=${unfY} w=${this._unfocusBgW} h=${this._unfocusBgH} fillAlpha=${this._unfocusBgAlpha.toFixed(2)}`);
        continue;
      }
      const t = this.getTweakTarget(i);
      if (!t) { unavailable.push(name); continue; }
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
        const dx = x - baseline.x; const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX; const dsy = sy - baseline.scaleY;
        const ddw = dw - baseline.displayWidth; const ddh = dh - baseline.displayHeight;
        const da = a - baseline.alpha; const dfs = fs - baseline.fontSize;
        const bColor = (baseline as any).color || "";
        const bStroke = (baseline as any).stroke || "";
        const bStrokeW = (baseline as any).strokeThickness ?? 0;
        const styleChanged = color !== bColor || stroke !== bStroke || strokeW !== bStrokeW;
        const hasDelta = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(ddw) > 0.5 || Math.abs(ddh) > 0.5 || Math.abs(da) > 0.001 || Math.abs(dfs) > 0 || styleChanged;
        const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
        const bfsStr = baseline.fontSize > 0 ? ` fs=${baseline.fontSize}` : "";
        const bStyleStr = bColor ? ` color=${bColor} stroke=${bStroke} strokeW=${bStrokeW}` : "";
        if (hasDelta) {
          changed.push(`${name}:\n  delta:    Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}\n  current:  x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${styleStr}\n  baseline: x=${baseline.x} y=${baseline.y} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)} α=${baseline.alpha.toFixed(2)}${bfsStr}${bStyleStr}`);
        } else { unchanged.push(name); }
      } else {
        changed.push(`${name}: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${styleStr} [no baseline]`);
      }
    }
    const sections: string[] = ["[CHARSEL-TWEAK-SNAPSHOT]", "NOTE: Use DELTA values for code adjustments. Do not paste current values directly as defaults."];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) { sections.push("\n── UNCHANGED ──"); sections.push(unchanged.join(", ")); }
    if (unavailable.length > 0) { sections.push("\n── UNAVAILABLE ──"); sections.push(unavailable.join(", ")); }
    const output = sections.join("\n");
    console.log(output);
    tweakCopyToClipboard(output);
  }

  private updateTweakHUD(): void {
    if (!this._tweakHudText) return;
    if (this._metaMode === TweakMetaMode.NONE) { this._tweakHudText.setVisible(false); return; }
    const modeName = CharacterSelectUiHandler.TWEAK_MODES[this._tweakMode].toUpperCase();
    const assetName = CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex];
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

  private setupTweakKeyListeners(): void {
    this._tweakKeyOneHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
      if (this._metaMode === TweakMetaMode.NONE) {
        this.cleanupTweakKeyListeners();
        this._tweakBaselines.clear();
        this._maskBaselines.clear();
      }
      this.updateTweakHUD();
      console.log(`[CHARSEL-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
    };
    this._tweakKeyTwoHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._tweakAssetIndex = (this._tweakAssetIndex + 1) % CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length;
      this.updateTweakHUD();
      this._dropdownPanel?.syncElementValue(CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]);
      console.log(`[CHARSEL-TWEAK] asset=${CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]}`);
    };
    this._tweakKeyThreeHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._tweakAssetIndex = (this._tweakAssetIndex - 1 + CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length) % CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS.length;
      this.updateTweakHUD();
      this._dropdownPanel?.syncElementValue(CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]);
      console.log(`[CHARSEL-TWEAK] asset=${CharacterSelectUiHandler.CHARSEL_TWEAK_ASSETS[this._tweakAssetIndex]}`);
    };
    this._tweakKeyVHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this.outputAllTweakStates();
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
    this.scene.input.keyboard?.on("keydown-FIVE", (this as any)._tweakKeyFiveHandler);
  }

  private cleanupTweakKeyListeners(): void {
    if (this._tweakKeyOneHandler) { this.scene.input.keyboard?.off("keydown-ONE", this._tweakKeyOneHandler); this._tweakKeyOneHandler = null; }
    if (this._tweakKeyTwoHandler) { this.scene.input.keyboard?.off("keydown-TWO", this._tweakKeyTwoHandler); this._tweakKeyTwoHandler = null; }
    if (this._tweakKeyThreeHandler) { this.scene.input.keyboard?.off("keydown-THREE", this._tweakKeyThreeHandler); this._tweakKeyThreeHandler = null; }
    if (this._tweakKeyVHandler) { this.scene.input.keyboard?.off("keydown-V", this._tweakKeyVHandler); this._tweakKeyVHandler = null; }
    if ((this as any)._tweakKeyFiveHandler) { this.scene.input.keyboard?.off("keydown-FIVE", (this as any)._tweakKeyFiveHandler); (this as any)._tweakKeyFiveHandler = null; }
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
  }

  private cleanupCutsceneInputHandlers(): void {
    const scene = this.scene as BattleScene;
    if (this._cutsceneInputDownHandler) {
      scene.inputController.events.off("input_down", this._cutsceneInputDownHandler);
      this._cutsceneInputDownHandler = null;
    }
    if (this._cutsceneInputUpHandler) {
      scene.inputController.events.off("input_up", this._cutsceneInputUpHandler);
      this._cutsceneInputUpHandler = null;
    }
    if (this._cutscenePointerDownHandler) {
      scene.input.off("pointerdown", this._cutscenePointerDownHandler);
      this._cutscenePointerDownHandler = null;
    }
    if (this._cutscenePointerUpHandler) {
      scene.input.off("pointerup", this._cutscenePointerUpHandler);
      this._cutscenePointerUpHandler = null;
    }
  }

  clear(): void {
    if (this._smitomTipTimer) {
      this._smitomTipTimer.remove(false);
      this._smitomTipTimer = null;
    }
    this.cleanupCutsceneInputHandlers();
    if (this.holdToSkipTimer) {
      this.holdToSkipTimer.remove();
      this.holdToSkipTimer = null;
    }
    this.hideLockedCharTooltip();
    this._metaMode = TweakMetaMode.NONE;
    this.cleanupTweakKeyListeners();
    this._tweakBaselines.clear();
    this._maskBaselines.clear();
    if (this._tweakHudText) this._tweakHudText.setVisible(false);
    for (const card of this.cards) {
      if (card.maskGfx) card.maskGfx.destroy();
    }
    super.clear();
    this.rootContainer.setVisible(false);
    this.gridContainer.removeAll(true);
    this.cards = [];
    this.selectedIndex = 0;
    this.config = null;
    this.focusNameText.setVisible(false);
    this.focusSubtitleText.setVisible(false);
    this.focusLevelText.setVisible(false);
  }
}