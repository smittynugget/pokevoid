import BattleScene, { starterColors } from "../battle-scene";
import { getYuTuning, yuTuningLog } from "../yu-visual-tuning";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import * as Utils from "../utils";
import { PlayerPokemon, PokemonMove, YU_BATTLE_FIT, YU_PLAYER_FIT_MULT, YU_SPECIES_PORTAL_OFFSETS, YU_SPECIES_VISUAL_OFFSETS } from "../field/pokemon";
import { adjustDuelmonIconScale, getStarterValueFriendshipCap, isGlitchFormKey, speciesStarters } from "../data/pokemon-species";
import { pokemonFormChanges, SpeciesFormChangeItemTrigger } from "../data/pokemon-forms";
import { FormChangeItem } from "#enums/form-change-items";
import { argbFromRgba } from "@material/material-color-utilities";
import { Type, getTypeRgb } from "../data/type";
import { TextStyle, addBBCodeTextObject, addTextObject, getBBCodeFrag } from "./text";
import Move, { MoveCategory } from "../data/move";
import { applyTypeBallRecolor, applyVoidBallRecolor, getPokeballAtlasKey } from "../data/pokeball";
import { PokeballType } from "#enums/pokeball";
import { getGenderColor, getGenderSymbol } from "../data/gender";
import { getLevelRelExp, getLevelTotalExp } from "../data/exp";
import { Stat, getStatName } from "../data/pokemon-stat";
import { PokemonHeldItemModifier } from "../modifier/modifier";
import { StatusEffect } from "../data/status-effect";
import { getBiomeName } from "../data/biomes";
import { Nature, getNatureName, getNatureStatMultiplier } from "../data/nature";
import { loggedInUser } from "../account";
import { Variant, getVariantTint } from "#app/data/variant";
import {Button} from "#enums/buttons";
import { Ability } from "../data/ability.js";
import i18next from "i18next";
import { ModifierTooltipUtils } from "./modifier-tooltip-utils";
import {modifierSortFunc} from "../modifier/modifier";
import { PlayerGender } from "#enums/player-gender";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { isIPhone } from "../loading-scene";
import { isPrimaryPointer } from "./pointer-utils";
import Overrides, { DEBUG_YU_VISUAL_TUNING } from "../overrides";
import { YuSpriteTweakController, TweakOffsets, TweakBaseValues } from "./tweak/yu-sprite-tweak-controller";
import { TweakMetaMode, TWEAK_META_CYCLE, cycleMetaMode, formatMetaHud, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import { AssetLoadProfiler } from "../system/asset-load-profiler";

export enum Page {
  PROFILE,
  STATS,
  MOVES
}

export enum SummaryUiMode {
  DEFAULT,
  LEARN_MOVE
}
const LABEL_CONSTANTS = {
  PROFILE: { x: 16, y: -3, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ABILITY: { x: 16, y: 40, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  PASSIVE: { x: 16, y: 40, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ID_NO: { x: 141, y: 10, style: TextStyle.SUMMARY_VOID, fontSize: "106px" },
  TRAINER_MEMO: { x: 16, y: 100, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ITEMS: { x: 18, y: -3, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  STATS: { x: 18, y: 44, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EXP: { x: 20, y: 101, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EXP_BAR: { x: 120, y: 145, width: 458, height: 27 },
  MOVES: { x: 12, y: -29, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  DESCRIPTION: { x: 12, y: 71, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EFFECT: { x: 16, y: -2, style: TextStyle.SUMMARY_VOID, fontSize: "80px" }
};
interface abilityContainer {

  labelText: Phaser.GameObjects.Text,

  ability: Ability | null,

  nameText: Phaser.GameObjects.Text | null,

  descriptionText: Phaser.GameObjects.Text | null,
}

export default class SummaryUiHandler extends UiHandler {
  private summaryUiMode: SummaryUiMode;
  private summaryAssetsLoaded: boolean = false;

  private summaryContainer: Phaser.GameObjects.Container;
  private _summaryPattern?: ModalBackgroundHandle;
  private tabSprite: Phaser.GameObjects.Sprite;
  private shinyOverlay: Phaser.GameObjects.Image;
  private numberText: Phaser.GameObjects.Text;
  private pokemonSprite: Phaser.GameObjects.Sprite;
  private portalSprite: Phaser.GameObjects.Sprite | null = null;
  private _spriteTweak: YuSpriteTweakController | null = null;
  private _tweakHudText: Phaser.GameObjects.Text | null = null;
  private _summaryBaseCreatureScale: number = 1;
  private _summaryBaseCreatureX: number = 48;
  private _summaryBaseCreatureY: number = -72;
  private _summaryBasePortalScale: number = 0;
  private _summaryBasePortalX: number = 0;
  private _summaryBasePortalY: number = 0;
  private _lastTweakOffsets: TweakOffsets | null = null;
  private static readonly SUMMARY_DEFAULT_OFFSETS: TweakOffsets = {
    portalScaleOffset: -0.380,
    creatureScaleOffset: -0.015,
    yOffset: -5.5,
    xOffset: -2.0,
    creatureYOffset: 8.0,
    creatureXOffset: -1.5,
  };
  private static readonly SUMMARY_ZERO_OFFSETS: TweakOffsets = {
    portalScaleOffset: 0,
    creatureScaleOffset: 0,
    yOffset: 0,
    xOffset: 0,
    creatureYOffset: 0,
    creatureXOffset: 0,
  };
  get _tweakActive(): boolean { return this._spriteTweak?.tweakActive ?? false; }

  private static readonly SUM_ICON_TWEAK_ASSETS = [
    "IconRowBg",
    "SplicedIcon", "FusionSpeciesIcon",
    "GlitchSpeciesIcon", "GlitchItemIcon",
    "SoulIcon", "SoulText",
    "GlitchFormContainer", "RankContainer",
    "FusionBoth", "GlitchBoth", "SoulBoth",
    "IconRowIcons", "IconRow",
    "ShinyIcon", "FusionShinyIcon", "ShinyBoth",
  ] as const;

  private static readonly SUM_ICON_TWEAK_MODES = [
    "scale", "position", "width", "height", "alpha", "borderRadius", "gap",
  ] as const;

  private static readonly SUM_ICON_TWEAK_ASSET_GROUPS: Record<string, string[]> = {
    Background: ["IconRowBg"],
    Fusion: ["FusionBoth", "SplicedIcon", "FusionSpeciesIcon"],
    Glitch: ["GlitchBoth", "GlitchSpeciesIcon", "GlitchItemIcon"],
    Soul: ["SoulBoth", "SoulIcon", "SoulText"],
    Container: ["GlitchFormContainer", "RankContainer"],
    Row: ["IconRowIcons", "IconRow"],
    Shiny: ["ShinyBoth", "ShinyIcon", "FusionShinyIcon"],
  };

  private _sumIconMetaMode: TweakMetaMode = TweakMetaMode.NONE;
  private _sumIconTweakMode: number = 0;
  private _sumIconTweakAssetIndex: number = 0;
  private _sumIconTweakBaselines: Map<string, {
    x: number; y: number; scaleX: number; scaleY: number; alpha: number;
    displayWidth: number; displayHeight: number; fontSize: number; listIndex: number;
  }> = new Map();
  private _sumIconTweakDeltas: Map<string, {
    dx: number; dy: number; dScaleX: number; dScaleY: number; dAlpha: number;
    dFontSize: number; dWidth: number; dHeight: number; dListIndex: number;
  }> = new Map();
  private _sumIconDropdownPanel: TweakDropdownPanel | null = null;
  private _sumIconTweakHudText: Phaser.GameObjects.Text | null = null;
  private _sumIconKeyVHandler: (() => void) | null = null;
  private _sumIconKeyFiveHandler: (() => void) | null = null;
  private _sumIconRowGap: number = 0;
  private _sumIconRowBorderRadius: number | { tl: number; tr: number; bl: number; br: number } = 0;
  private _sumIconRowBgWidthPad: number = -16;
  private _sumIconRowBgHeight: number = 12;
  get sumIconTweakActive(): boolean { return this._sumIconMetaMode !== TweakMetaMode.NONE; }

  private nameText: Phaser.GameObjects.Text;
  private summaryIconRowContainer: Phaser.GameObjects.Container;
  private summaryIconRowIconsContainer: Phaser.GameObjects.Container;
  private summaryIconRowBg: Phaser.GameObjects.Graphics;
  private summaryFusionContainer: Phaser.GameObjects.Container;
  private summaryFusionSpeciesIcon: Phaser.GameObjects.Sprite;
  private summaryGlitchContainer: Phaser.GameObjects.Container;
  private summaryGlitchPokemonIcon: Phaser.GameObjects.Sprite;
  private summaryGlitchItemIcon: Phaser.GameObjects.Sprite;
  private splicedIcon: Phaser.GameObjects.Sprite;
  private pokeball: Phaser.GameObjects.Sprite;
  private levelText: Phaser.GameObjects.Text;
  private rankContainer: Phaser.GameObjects.Container;
  private rankIcon: Phaser.GameObjects.Sprite;
  private rankText: Phaser.GameObjects.Text;
  private genderText: Phaser.GameObjects.Text;
  private shinyIcon: Phaser.GameObjects.Image;
  private fusionShinyIcon: Phaser.GameObjects.Image;
  private summaryShinyContainer: Phaser.GameObjects.Container;
  private candyShadow: Phaser.GameObjects.Sprite;
  private candyIcon: Phaser.GameObjects.Sprite;
  private candyOverlay: Phaser.GameObjects.Sprite;
  private candyCountText: Phaser.GameObjects.Text;
  private championRibbon: Phaser.GameObjects.Image;
  private statusContainer: Phaser.GameObjects.Container;
  private status: Phaser.GameObjects.Image;

  private abilityPrompt: Phaser.GameObjects.Image;

  private abilityContainer: abilityContainer;

  private passiveContainer: abilityContainer;
  private summaryPageContainer: Phaser.GameObjects.Container;
  private movesContainer: Phaser.GameObjects.Container;
  private moveDescriptionText: Phaser.GameObjects.Text;
  private moveCursorObj: Phaser.GameObjects.Sprite | null;
  private selectedMoveCursorObj: Phaser.GameObjects.Sprite | null;
  private moveRowsContainer: Phaser.GameObjects.Container;
  private moveRowContainers: Phaser.GameObjects.Container[] = [];
  private extraMoveRowContainer: Phaser.GameObjects.Container;
  private moveEffectContainer: Phaser.GameObjects.Container;
  private movePowerText: Phaser.GameObjects.Text;
  private moveAccuracyText: Phaser.GameObjects.Text;
  private moveCategoryIcon: Phaser.GameObjects.Sprite;
  private summaryPageTransitionContainer: Phaser.GameObjects.Container;

  private descriptionScrollTween: Phaser.Tweens.Tween | null;
  private moveCursorBlinkTimer: Phaser.Time.TimerEvent | null;

  private pokemon: PlayerPokemon | null;
  private playerParty: boolean;

  private newMove: Move | null;
  private moveSelectFunction: Function | null;
  private transitioning: boolean;
  private statusVisible: boolean;
  private moveEffectsVisible: boolean;

  private moveSelect: boolean;
  private moveCursor: integer;
  private selectedMoveIndex: integer;
  private selectCallback: Function | null;
  private navLeftButton: Phaser.GameObjects.Sprite | null = null;
  private navRightButton: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: BattleScene) {
    super(scene, Mode.SUMMARY);
  }

  loadSummaryAssets(): Promise<void> {
    return new Promise(resolve => {
      if (this.summaryAssetsLoaded || !isIPhone()) {
        resolve();
        return;
      }

      if (Overrides.DEBUG_IOS_MODE) {
        AssetLoadProfiler.getInstance().trackLazyLoad("summary_ui", "SummaryUiHandler.loadSummaryAssets");
      }

      const imageAssets = [
        "summary_bg", "summary_overlay_shiny", "summary_profile",
        "summary_profile_prompt_z", "summary_profile_prompt_a",
        "summary_status", "summary_stats", "summary_stats_overlay_exp",
        "summary_stats_exp_bar", "summary_moves", "summary_moves_effect",
        "summary_moves_overlay_row", "summary_moves_overlay_pp"
      ];

      for (const asset of imageAssets) {
        if (!this.scene.textures.exists(asset)) {
          (this.scene as BattleScene).loadImage(asset, "ui");
        }
      }

      for (let t = 1; t <= 3; t++) {
        if (!this.scene.textures.exists(`summary_tabs_${t}`)) {
          (this.scene as BattleScene).loadImage(`summary_tabs_${t}`, "ui");
        }
      }

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.summaryAssetsLoaded = true;
        resolve();
      });
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  setup() {
    if (isIPhone()) {
      return;
    }
    this.setupInternal();
  }

  private setupInternal(): void {
    const ui = this.getUi();

    this.summaryContainer = this.scene.add.container(0, 0);
    this.summaryContainer.setVisible(false);
    ui.add(this.summaryContainer);

    const summaryBg = this.scene.add.image(0, 0, "summary_bg");
    summaryBg.setOrigin(0, 1);
    this.summaryContainer.add(summaryBg);

    this.tabSprite = this.scene.add.sprite(134, (-summaryBg.displayHeight) + 16, "summary_tabs_1");
    this.tabSprite.setOrigin(1, 1);
    this.summaryContainer.add(this.tabSprite);

    const isJapaneseLang = i18next.resolvedLanguage === "ja";
    const summaryLabelFontSize = isJapaneseLang ? "117px" : "96px";
    const summaryLabelX = 2
    const summaryLabel = addTextObject(this.scene, summaryLabelX, -165, "Pokémon Info", TextStyle.SUMMARY, { fontSize: summaryLabelFontSize });
    summaryLabel.setOrigin(0, 1);
    this.summaryContainer.add(summaryLabel);

    this.shinyOverlay = this.scene.add.image(6, -54, "summary_overlay_shiny");
    this.shinyOverlay.setOrigin(0, 1);
    this.shinyOverlay.setVisible(false);
    this.summaryContainer.add(this.shinyOverlay);

    this.numberText = addTextObject(this.scene, 17, -149, "0000", TextStyle.SUMMARY);
    this.numberText.setOrigin(0, 1);
    this.summaryContainer.add(this.numberText);

    this.portalSprite = this.scene.add.sprite(48, -106, "yu_portal_7");
    this.portalSprite.setOrigin(0.5, 1);
    this.portalSprite.setVisible(false);
    this.summaryContainer.add(this.portalSprite);

    this.pokemonSprite = this.scene.initPokemonSprite(this.scene.add.sprite(48, -106, "pkmn__sub"), undefined, false, true);
    this.summaryContainer.add(this.pokemonSprite);

    if (DEBUG_YU_VISUAL_TUNING) {
      this._tweakHudText = addTextObject(this.scene, Math.floor(this.scene.game.canvas.width / 12), -(this.scene.game.canvas.height / 6) + 2, "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" });
      this._tweakHudText.setOrigin(0.5, 0);
      this._tweakHudText.setDepth(2000);
      this._tweakHudText.setVisible(false);
      this.summaryContainer.add(this._tweakHudText);
      this._spriteTweak = new YuSpriteTweakController({
        scene: this.scene,
        logTag: "SUM-TWEAK",
        modes: ["scale", "position"],
        assets: ["DuelmonSprite", "PortalSprite", "BothSprites"],
        hudTextObject: this._tweakHudText,
        applyOffsets: (offsets: TweakOffsets) => this.applySummaryTweakOffsets(offsets),
        onHydrate: () => ({
          player: this._lastTweakOffsets
            ? { ...this._lastTweakOffsets }
            : { ...SummaryUiHandler.SUMMARY_ZERO_OFFSETS },
          enemy: { ...SummaryUiHandler.SUMMARY_ZERO_OFFSETS },
        }),
        getBaseValues: (): TweakBaseValues | null => {
          const g = getYuTuning();
          const sumDef = SummaryUiHandler.SUMMARY_DEFAULT_OFFSETS;
          return {
            portalScale: this._summaryBasePortalScale + g.portalScaleOffset + sumDef.portalScaleOffset,
            creatureScale: this._summaryBaseCreatureScale + g.creatureScaleOffset + sumDef.creatureScaleOffset,
            portalX: this._summaryBasePortalX + g.xOffset + sumDef.xOffset,
            portalY: this._summaryBasePortalY + g.yOffset + sumDef.yOffset,
            creatureX: this._summaryBaseCreatureX + g.creatureXOffset + sumDef.creatureXOffset,
            creatureY: this._summaryBaseCreatureY + g.yOffset + g.creatureYOffset + sumDef.yOffset + sumDef.creatureYOffset,
          };
        },
        getDropdownAnchor: () => {
          const canvas = this.scene.game.canvas;
          const rect = canvas.getBoundingClientRect();
          return { x: rect.left + 10, y: rect.top + 10 };
        },
        dropdownCoordSpace: "screen",
      });
    }

    if (DEBUG_YU_VISUAL_TUNING) {
      this._sumIconTweakHudText = addTextObject(this.scene, Math.floor(this.scene.game.canvas.width / 12), -(this.scene.game.canvas.height / 6) + 16, "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" });
      this._sumIconTweakHudText.setOrigin(0.5, 0);
      this._sumIconTweakHudText.setDepth(2000);
      this._sumIconTweakHudText.setVisible(false);
      this.summaryContainer.add(this._sumIconTweakHudText);
    }

    this.nameText = addTextObject(this.scene, 6, -54, "", TextStyle.SUMMARY);
    this.nameText.setOrigin(0, 0);
    this.summaryContainer.add(this.nameText);

    this.splicedIcon = this.scene.add.sprite(0, 0, "icon_spliced");
    this.splicedIcon.setVisible(false);
    this.splicedIcon.setOrigin(0, 0);
    this.splicedIcon.setScale(0.27);
    this.splicedIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);

    this.shinyIcon = this.scene.add.image(0, 0, "shiny_star");
    this.shinyIcon.setVisible(false);
    this.shinyIcon.setOrigin(0, 0);
    this.shinyIcon.setScale(0.485);
    this.shinyIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);

    this.fusionShinyIcon = this.scene.add.image(0, 0, "shiny_star_2");
    this.fusionShinyIcon.setVisible(false);
    this.fusionShinyIcon.setOrigin(0, 0);
    this.fusionShinyIcon.setScale(0.485);

    this.summaryShinyContainer = this.scene.add.container(0, 0);
    this.summaryShinyContainer.setVisible(false);
    this.summaryShinyContainer.add(this.shinyIcon);
    this.summaryShinyContainer.add(this.fusionShinyIcon);

    this.pokeball = this.scene.add.sprite(6, -19, "pb");
    this.pokeball.setOrigin(0, 1);
    this.summaryContainer.add(this.pokeball);

    this.candyIcon = this.scene.add.sprite(13, -140, "candy");
    this.candyIcon.setScale(0.8);
    this.summaryContainer.add(this.candyIcon);

    this.candyOverlay = this.scene.add.sprite(13, -140, "candy_overlay");
    this.candyOverlay.setScale(0.8);
    this.summaryContainer.add(this.candyOverlay);

    this.candyShadow = this.scene.add.sprite(13, -140, "candy");
    this.candyShadow.setTint(0x000000);
    this.candyShadow.setAlpha(0.50);
    this.candyShadow.setScale(0.8);
    this.candyShadow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 16, 16), Phaser.Geom.Rectangle.Contains);
    this.summaryContainer.add(this.candyShadow);

    this.candyCountText = addTextObject(this.scene, 20, -146, "x0", TextStyle.WINDOW_ALT, { fontSize: "76px" });
    this.candyCountText.setOrigin(0, 0);
    this.summaryContainer.add(this.candyCountText);

    this.championRibbon = this.scene.add.image(88, -146, "champion_ribbon");
    this.championRibbon.setOrigin(0, 0);

    this.championRibbon.setScale(1.25);
    this.summaryContainer.add(this.championRibbon);
    this.championRibbon.setVisible(false);

    this.levelText = addTextObject(this.scene, 36, -17, "", TextStyle.SUMMARY_ALT);
    this.levelText.setOrigin(0, 1);
    this.summaryContainer.add(this.levelText);

    this.rankContainer = this.scene.add.container(0, 0);
    this.rankContainer.setVisible(false);

    this.rankIcon = this.scene.add.sprite(-24.0, -0.5, "smitems", "modSoulCollected");
    this.rankIcon.setScale(0.11, 0.12);
    this.rankIcon.setOrigin(0, 0.5);
    this.rankContainer.add(this.rankIcon);

    this.rankText = addTextObject(this.scene, -19.5, 1.5, "", TextStyle.PARTY, { fontSize: "20px", color: "#ffd700" });
    this.rankText.setShadow(0, 0, undefined);
    this.rankText.setStroke("#222222", 14);
    this.rankText.setOrigin(0, 0.5);
    this.rankContainer.add(this.rankText);

    this.summaryIconRowBg = this.scene.add.graphics();
    this.summaryIconRowBg.setVisible(false);
    this.summaryIconRowBg.setPosition(-2.0, 1.5);
    this.summaryIconRowBg.setAlpha(0.70);

    this.summaryFusionContainer = this.scene.add.container(0, 0);
    this.summaryFusionContainer.setVisible(false);

    this.summaryFusionSpeciesIcon = this.scene.add.sprite(0, 0, "pokemon_icons_1");
    this.summaryFusionSpeciesIcon.setOrigin(0, 0);
    this.summaryFusionSpeciesIcon.setScale(0.38);
    this.summaryFusionContainer.add(this.summaryFusionSpeciesIcon);

    this.splicedIcon.setVisible(false);
    this.summaryFusionContainer.add(this.splicedIcon);

    this.summaryGlitchContainer = this.scene.add.container(0, 0);
    this.summaryGlitchContainer.setVisible(false);

    this.summaryGlitchPokemonIcon = this.scene.add.sprite(0, 0, "pokemon_icons_0");
    this.summaryGlitchPokemonIcon.setOrigin(0, 0);
    this.summaryGlitchPokemonIcon.setScale(0.38);
    this.summaryGlitchContainer.add(this.summaryGlitchPokemonIcon);

    this.summaryGlitchItemIcon = this.scene.add.sprite(0, 0, "smitems");
    this.summaryGlitchItemIcon.setOrigin(0, 0);
    this.summaryGlitchItemIcon.setScale(0.10);
    this.summaryGlitchItemIcon.setVisible(false);
    this.summaryGlitchContainer.add(this.summaryGlitchItemIcon);

    this.summaryIconRowIconsContainer = this.scene.add.container(0, 1);
    this.summaryIconRowIconsContainer.add(this.summaryFusionContainer);
    this.summaryIconRowIconsContainer.add(this.summaryGlitchContainer);
    this.summaryIconRowIconsContainer.add(this.rankContainer);
    this.summaryIconRowIconsContainer.add(this.summaryShinyContainer);

    this.summaryIconRowContainer = this.scene.add.container(6, -64.5);
    this.summaryIconRowContainer.setVisible(false);
    this.summaryIconRowContainer.add(this.summaryIconRowBg);
    this.summaryIconRowContainer.add(this.summaryIconRowIconsContainer);
    this.summaryContainer.add(this.summaryIconRowContainer);

    this.genderText = addTextObject(this.scene, 96, -17, "", TextStyle.SUMMARY);
    this.genderText.setOrigin(0, 1);
    this.summaryContainer.add(this.genderText);

    this.statusContainer = this.scene.add.container(-106, -16);

    const statusBg = this.scene.add.image(0, 0, "summary_status");
    statusBg.setOrigin(0, 0);

    this.statusContainer.add(statusBg);

    const statusLabel = addTextObject(this.scene, 3, 0, i18next.t("pokemonSummary:status"), TextStyle.SUMMARY);
    statusLabel.setOrigin(0, 0);

    this.statusContainer.add(statusLabel);

    this.status = this.scene.add.sprite(91, 4, "statuses");
    this.status.setOrigin(0.5, 0);

    this.statusContainer.add(this.status);

    this.summaryContainer.add(this.statusContainer);

    this.moveEffectContainer = this.scene.add.container(106, -62);

    this.summaryContainer.add(this.moveEffectContainer);

    const moveEffectBg = this.scene.add.image(0, 0, "summary_moves_effect");
    moveEffectBg.setOrigin(0, 0);
    this.moveEffectContainer.add(moveEffectBg);

    const effectLabel = addTextObject(
      this.scene,
      LABEL_CONSTANTS.EFFECT.x,
      LABEL_CONSTANTS.EFFECT.y,
      i18next.t("pokemonSummary:effect"),
      LABEL_CONSTANTS.EFFECT.style,
      { fontSize: LABEL_CONSTANTS.EFFECT.fontSize }
    );
    effectLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(effectLabel);

    const isJapanese = i18next.resolvedLanguage === "ja";
    const labels = i18next.t("pokemonSummary:powerAccuracyCategory").split('\n');

    const baseY = 12;
    const lineHeight = 16;

    const powerLabel = addTextObject(this.scene, 8, baseY, labels[0] || "Power", TextStyle.SUMMARY);
    powerLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(powerLabel);

    const accuracyYOffset = isJapanese ? 2 : 0;
    const accuracyLabel = addTextObject(this.scene, 8, baseY + lineHeight + accuracyYOffset, labels[1] || "Accuracy", TextStyle.SUMMARY);
    accuracyLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(accuracyLabel);

    const categoryYOffset = isJapanese ? 3 : 0;
    const categoryLabel = addTextObject(this.scene, 8, baseY + lineHeight * 2 + categoryYOffset, labels[2] || "Category", TextStyle.SUMMARY);
    categoryLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(categoryLabel);

    this.movePowerText = addTextObject(this.scene, 99, 27, "0", TextStyle.WINDOW_ALT);
    this.movePowerText.setOrigin(1, 1);
    this.moveEffectContainer.add(this.movePowerText);

    this.moveAccuracyText = addTextObject(this.scene, 99, 43, "0", TextStyle.WINDOW_ALT);
    this.moveAccuracyText.setOrigin(1, 1);
    this.moveEffectContainer.add(this.moveAccuracyText);

    this.moveCategoryIcon = this.scene.add.sprite(99, 57, "categories");
    this.moveCategoryIcon.setOrigin(1, 1);
    this.moveEffectContainer.add(this.moveCategoryIcon);

    const getSummaryPageBg = () => {
      const ret = this.scene.add.sprite(0, 0, this.getPageKey(0));
      ret.setOrigin(0, 1);
      return ret;
    };

    this.summaryContainer.add((this.summaryPageContainer = this.scene.add.container(106, 0)));
    this.summaryPageContainer.add(getSummaryPageBg());
    this.summaryPageContainer.setVisible(false);
    this.summaryContainer.add((this.summaryPageTransitionContainer = this.scene.add.container(106, 0)));
    this.summaryPageTransitionContainer.add(getSummaryPageBg());
    this.summaryPageTransitionContainer.setVisible(false);

    this.navLeftButton = this.scene.add.sprite(14, -10, "cursor_reverse");
    this.navLeftButton.setScale(0.75);
    this.navLeftButton.setInteractive({ useHandCursor: true });
    this.navLeftButton.on("pointerup", () => {
      if (!this.transitioning) this.processInput(Button.LEFT);
    });
    this.navLeftButton.setVisible(false);
    this.summaryContainer.add(this.navLeftButton);
    this.summaryContainer.bringToTop(this.navLeftButton);

    this.navRightButton = this.scene.add.sprite(32, -10, "cursor");
    this.navRightButton.setScale(0.75);
    this.navRightButton.setInteractive({ useHandCursor: true });
    this.navRightButton.on("pointerup", () => {
      if (!this.transitioning) this.processInput(Button.RIGHT);
    });
    this.navRightButton.setVisible(false);
    this.summaryContainer.add(this.navRightButton);
    this.summaryContainer.bringToTop(this.navRightButton);

    this._summaryPattern = attachModalBackground(
      this.scene,
      this.summaryContainer,
      () => ({
        bgX: this.summaryPageContainer.x,
        bgY: -(this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).height,
        bgWidth: (this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).width,
        bgHeight: (this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).height,
      }),
      { mask: true }
    );
  }

  getPageKey(page?: integer) {
    if (page === undefined) {
      page = this.cursor;
    }
    return `summary_${Page[page].toLowerCase()}`;
  }

  private applySummaryTweakOffsets(offsets: TweakOffsets): void {
    if (!this.pokemon || this.pokemon.species?.generation !== 20) return;
    this._lastTweakOffsets = { ...offsets };
    const g = getYuTuning();
    const sumDef = SummaryUiHandler.SUMMARY_DEFAULT_OFFSETS;
    const tweakFinalX = this._summaryBaseCreatureX + g.creatureXOffset + offsets.creatureXOffset + sumDef.creatureXOffset;
    const tweakFinalY = this._summaryBaseCreatureY + g.yOffset + g.creatureYOffset + offsets.creatureYOffset + sumDef.yOffset + sumDef.creatureYOffset;
    const tweakFinalScale = this._summaryBaseCreatureScale + g.creatureScaleOffset + offsets.creatureScaleOffset + sumDef.creatureScaleOffset;
    console.log(`[SUMMARY-TWEAK-APPLY] species=${this.pokemon.species.speciesId} baseX=${this._summaryBaseCreatureX.toFixed(3)} baseY=${this._summaryBaseCreatureY.toFixed(3)} baseScale=${this._summaryBaseCreatureScale.toFixed(4)} tweakFinalPos=(${tweakFinalX.toFixed(3)}, ${tweakFinalY.toFixed(3)}) tweakFinalScale=${tweakFinalScale.toFixed(4)} offsets={creatureX:${offsets.creatureXOffset}, creatureY:${offsets.creatureYOffset}, creatureScale:${offsets.creatureScaleOffset}, y:${offsets.yOffset}, x:${offsets.xOffset}, portalScale:${offsets.portalScaleOffset}}`);
    this.pokemonSprite.setPosition(tweakFinalX, tweakFinalY);
    this.pokemonSprite.setScale(tweakFinalScale);
    if (this.portalSprite?.visible && this._summaryBasePortalScale !== 0) {
      this.portalSprite.setScale(this._summaryBasePortalScale + g.portalScaleOffset + offsets.portalScaleOffset + sumDef.portalScaleOffset);
      this.portalSprite.setPosition(
        this._summaryBasePortalX + g.xOffset + offsets.xOffset + sumDef.xOffset,
        this._summaryBasePortalY + g.yOffset + offsets.yOffset + sumDef.yOffset
      );
    }
  }

  private computeAndApplySummaryCreatureLayout(pathLabel: string = "sync"): void {
    if (!this.pokemon || this.pokemon.species?.generation !== 20) return;
    const state = this.pokemon.getSpriteState();
    const stateScale = state?.scale ?? 1;
    const fit = YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
    this._summaryBaseCreatureScale = stateScale * fit;
    const ssX = state?.x ?? 0;
    const ssY = state?.y ?? 0;
    const basis = this.pokemonSprite.frame?.width || 1;
    if (basis <= 1) return;
    const frameH = this.pokemonSprite.frame?.height || 1;
    const displayW = stateScale * basis;
    const displayH = stateScale * frameH;
    const sorterX = ssX * basis;
    const sorterY = ssY * basis;
    const SUM_BG_REF = 1107;
    const SUM_SLOT_CENTER = 639.5;
    const SUM_SLOT_FEET = 311;
    const centerOff = ((SUM_BG_REF + sorterX - displayW / 2) - SUM_SLOT_CENTER) / stateScale;
    const feetOff = ((sorterY + displayH) - SUM_SLOT_FEET) / stateScale;
    this._summaryBaseCreatureX = 48 + centerOff * fit;
    this._summaryBaseCreatureY = -72 + feetOff * fit;
    console.log(`[SUMMARY-LAYOUT] species=${this.pokemon.species.speciesId} path=${pathLabel} basis=${basis} isPlaceholder=${basis <= 32} spriteState={x:${ssX}, y:${ssY}, scale:${stateScale}} frame={w:${basis}, h:${frameH}} display={w:${displayW.toFixed(1)}, h:${displayH.toFixed(1)}} sorter={x:${sorterX.toFixed(1)}, y:${sorterY.toFixed(1)}} centerOff=${centerOff.toFixed(3)} feetOff=${feetOff.toFixed(3)} fit=${fit.toFixed(4)} baseX=${this._summaryBaseCreatureX.toFixed(3)} baseY=${this._summaryBaseCreatureY.toFixed(3)} baseScale=${this._summaryBaseCreatureScale.toFixed(4)}`);
    const _sumTuning = getYuTuning();
    const sumDef = SummaryUiHandler.SUMMARY_DEFAULT_OFFSETS;
    const _spOff = YU_SPECIES_VISUAL_OFFSETS[this.pokemon.species.speciesId] ?? {};
    const finalX = this._summaryBaseCreatureX + _sumTuning.creatureXOffset + sumDef.creatureXOffset;
    const finalY = this._summaryBaseCreatureY + _sumTuning.yOffset + _sumTuning.creatureYOffset + sumDef.yOffset + sumDef.creatureYOffset + (_spOff.creatureYOffset ?? 0);
    const finalScale = this._summaryBaseCreatureScale + _sumTuning.creatureScaleOffset + sumDef.creatureScaleOffset + (_spOff.creatureScaleOffset ?? 0);
    console.log(`[SUMMARY-LAYOUT] POSITION species=${this.pokemon.species.speciesId} finalX=${finalX.toFixed(3)} finalY=${finalY.toFixed(3)} finalScale=${finalScale.toFixed(4)}`);
    console.log(`[SUMMARY-LAYOUT] SANITY species=${this.pokemon.species.speciesId} xInRange=${finalX >= 0 && finalX <= 100} yInRange=${finalY >= -150 && finalY <= -20} displayW=${(finalScale * basis).toFixed(1)} displayH=${(finalScale * frameH).toFixed(1)}`);
    this.pokemonSprite.setPosition(finalX, finalY);
    this.pokemonSprite.setScale(finalScale);
  }

  applySummaryPortal(): void {
    if (!this.portalSprite || !this.pokemon) {
      this.portalSprite?.setVisible(false);
      return;
    }
    if (this.pokemon.species?.generation !== 20) {
      this.portalSprite.setVisible(false);
      return;
    }
    const state = this.pokemon.getSpriteState();
    if (!state?.portal) {
      this.portalSprite.setVisible(false);
      return;
    }
    const stem = state.portal.replace(/\.png$/i, "");
    const textureKey = `yu_portal_${stem}`;
    if (!this.scene.textures.exists(textureKey)) {
      this.portalSprite.setVisible(false);
      return;
    }
    this.portalSprite.setTexture(textureKey);
    const stateScale = state.scale ?? 1;
    const posScale = stateScale * YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
    const basis = this.pokemonSprite.frame?.width || 0;
    if (!basis || basis <= 1) {
      this.portalSprite.setVisible(false);
      return;
    }
    const frameHeight = this.pokemonSprite.frame?.height || 1;
    const portalNativeW = this.portalSprite.frame?.width || 195;
    const portalNativeH = this.portalSprite.frame?.height || 50;
    const sorterX = (state.x ?? 0) * basis;
    const sorterY = (state.y ?? 0) * basis;
    const displayW = stateScale * basis;
    const displayH = stateScale * frameHeight;
    const portalSorterW = (state.portalScale ?? 1) * basis;
    const portalSorterX = (state.portalX ?? 0) * basis;
    const portalSorterY = (state.portalY ?? 0) * basis;
    const portalSorterH = portalSorterW * (portalNativeH / portalNativeW);
    const feetDeltaY = ((portalSorterY + portalSorterH) - (sorterY + displayH)) / stateScale;
    const centerDeltaX = ((portalSorterX - portalSorterW / 2) - (sorterX - displayW / 2)) / stateScale;
    const portalChildScale = portalSorterW / (portalNativeW * stateScale);
    this._summaryBasePortalScale = portalChildScale * posScale;
    this._summaryBasePortalX = this._summaryBaseCreatureX + centerDeltaX * posScale;
    this._summaryBasePortalY = this._summaryBaseCreatureY + feetDeltaY * posScale - 2 * posScale;
    const _sumPortalOffsets = YU_SPECIES_PORTAL_OFFSETS[this.pokemon.species.speciesId];
    if (_sumPortalOffsets) {
      this._summaryBasePortalX += _sumPortalOffsets.portalDeltaX ?? 0;
      this._summaryBasePortalY += _sumPortalOffsets.portalDeltaY ?? 0;
      this._summaryBasePortalScale += _sumPortalOffsets.portalScaleOffset ?? 0;
    }
    const _sTuning = getYuTuning();
    const localOffsets = this._lastTweakOffsets;
    const localPortalScale = localOffsets?.portalScaleOffset ?? 0;
    const localYOffset = localOffsets?.yOffset ?? 0;
    const localXOffset = localOffsets?.xOffset ?? 0;
    const sumDef = SummaryUiHandler.SUMMARY_DEFAULT_OFFSETS;
    const _sPortalScale = this._summaryBasePortalScale + _sTuning.portalScaleOffset + localPortalScale + sumDef.portalScaleOffset;
    const _sPortalX = this._summaryBasePortalX + _sTuning.xOffset + localXOffset + sumDef.xOffset;
    const _sPortalY = this._summaryBasePortalY + _sTuning.yOffset + localYOffset + sumDef.yOffset;
    console.log(`[SUMMARY-PORTAL] species=${this.pokemon.species.speciesId} basePortalScale=${this._summaryBasePortalScale.toFixed(4)} basePortalX=${this._summaryBasePortalX.toFixed(3)} basePortalY=${this._summaryBasePortalY.toFixed(3)} finalPortalScale=${_sPortalScale.toFixed(4)} finalPortalX=${_sPortalX.toFixed(3)} finalPortalY=${_sPortalY.toFixed(3)} portalChildScale=${portalChildScale.toFixed(4)} centerDeltaX=${centerDeltaX.toFixed(3)} feetDeltaY=${feetDeltaY.toFixed(3)} creatureBaseX=${this._summaryBaseCreatureX.toFixed(3)} creatureBaseY=${this._summaryBaseCreatureY.toFixed(3)} portalState={scale:${state.portalScale ?? "null"}, x:${state.portalX ?? "null"}, y:${state.portalY ?? "null"}} portalNative={w:${portalNativeW}, h:${portalNativeH}} portalSorter={w:${portalSorterW.toFixed(1)}, x:${portalSorterX.toFixed(1)}, y:${portalSorterY.toFixed(1)}, h:${portalSorterH.toFixed(1)}}`);
    this.portalSprite.setScale(_sPortalScale);
    this.portalSprite.setPosition(_sPortalX, _sPortalY);
    this.portalSprite.setFlipX(!(state.portalFlipped ?? false));
    this.pokemonSprite.setFlipX(!(state.flipped ?? false));
    this.summaryContainer.moveBelow(this.portalSprite, this.pokemonSprite);
    this.portalSprite.setVisible(true);
    console.log(`[SUMMARY-PORTAL-ACTUAL] portal.x=${this.portalSprite.x.toFixed(3)} portal.y=${this.portalSprite.y.toFixed(3)} portal.scaleX=${this.portalSprite.scaleX.toFixed(4)} portal.scaleY=${this.portalSprite.scaleY.toFixed(4)} portal.displayWidth=${this.portalSprite.displayWidth?.toFixed(1)} portal.displayHeight=${this.portalSprite.displayHeight?.toFixed(1)} portal.visible=${this.portalSprite.visible}`);
    yuTuningLog("Summary", "portal", { _sPortalX, _sPortalY, _sPortalScale, posScale });
  }

  show(args: any[]): boolean {
    if (isIPhone() && !this.summaryAssetsLoaded) {
      this.loadSummaryAssets().then(() => {
        if (!this.summaryContainer) {
          this.setupInternal();
        }
        this.showInternal(args);
      });
      return true;
    }
    return this.showInternal(args);
  }

  private showInternal(args: any[]): boolean {
    super.show(args);

    this.pokemon = args[0] as PlayerPokemon;
    this.summaryUiMode = args.length > 1 ? args[1] as SummaryUiMode : SummaryUiMode.DEFAULT;
    this.playerParty = args[4] ?? true;
    this.scene.ui.bringToTop(this.summaryContainer);

    this.summaryContainer.setVisible(true)
    this.cursor = -1;

    this._summaryPattern?.redraw();

    this.shinyOverlay.setVisible(false);

    const rootId = this.pokemon.species.getRootSpeciesId();
    const colorScheme = starterColors?.[rootId] ?? ["ffffff", "ffffff"];
    this.candyIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme[0])));
    this.candyOverlay.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme[1])));

    this.numberText.setText(Utils.padInt(this.pokemon.species.speciesId, 4));
    this.numberText.setColor(this.getTextColor(!this.pokemon.isShiny() ? TextStyle.SUMMARY : TextStyle.SUMMARY_GOLD));
    this.numberText.setShadowColor(this.getTextColor(!this.pokemon.isShiny() ? TextStyle.SUMMARY : TextStyle.SUMMARY_GOLD, true));

    if (this.pokemon.species?.generation === 20) {
      this.pokemonSprite.setOrigin(0.5, 1);
      this.pokemonSprite.setPipelineData("ignoreFieldPos", true);
      const spriteKey = this.pokemon.getSpriteKey(true);
      if (!this.scene.textures.exists(spriteKey) || !this.scene.anims.exists(spriteKey)) {
        const pokemonRef = this.pokemon;
        this.pokemon.loadAssets().then(() => {
          if (!this.pokemon || this.pokemon !== pokemonRef || this.pokemon.species?.generation !== 20) {
            return;
          }
          this.pokemonSprite.play(spriteKey);
          this.computeAndApplySummaryCreatureLayout("async");
          this.applySummaryPortal();
          if (this._lastTweakOffsets) {
            this.applySummaryTweakOffsets(this._lastTweakOffsets);
          }
        });
      } else {
        this.pokemonSprite.play(spriteKey);
        this.computeAndApplySummaryCreatureLayout("sync");
        this.applySummaryPortal();
        if (this._lastTweakOffsets) {
          this.applySummaryTweakOffsets(this._lastTweakOffsets);
        }
      }
    } else {
      this.pokemonSprite.setPosition(56, -106);
      this.pokemonSprite.setOrigin(0.5, 0.5);
      this.pokemonSprite.setScale(this.pokemon.getSpriteScale());
      this.pokemonSprite.play(this.pokemon.getSpriteKey(true));
      this.portalSprite?.setVisible(false);
    }
    this.pokemonSprite.setPipelineData("teraColor", getTypeRgb(this.pokemon.getTeraType()));
    this.pokemonSprite.setPipelineData("ignoreTimeTint", true);
    this.pokemonSprite.setPipelineData("spriteKey", this.pokemon.getSpriteKey());
    this.pokemonSprite.setPipelineData("shiny", this.pokemon.shiny);
    this.pokemonSprite.setPipelineData("variant", this.pokemon.variant);
    const sourcePipelineData = this.pokemon?.getSprite()?.pipelineData;
    [ "spriteColors", "fusionSpriteColors", "fusionRecolorMode", "altBuildSpriteColors", "altBuildTargetColors" ].forEach((k) => {
      delete this.pokemonSprite.pipelineData[k];
      delete this.pokemonSprite.pipelineData[`${k}Base`];
      let targetKey = k;
      if (this.pokemon?.summonData?.speciesForm) {
        targetKey += "Base";
      }
      if (sourcePipelineData && sourcePipelineData[targetKey] !== undefined) {
        this.pokemonSprite.pipelineData[targetKey] = sourcePipelineData[targetKey];
      }
    });
    delete this.pokemonSprite.pipelineData["altBuildBlendMode"];
    delete this.pokemonSprite.pipelineData["altBuildInversionFactor"];
    if (sourcePipelineData?.["altBuildBlendMode"] !== undefined) {
      this.pokemonSprite.pipelineData["altBuildBlendMode"] = sourcePipelineData["altBuildBlendMode"];
    }
    if (sourcePipelineData?.["altBuildInversionFactor"] !== undefined) {
      this.pokemonSprite.pipelineData["altBuildInversionFactor"] = sourcePipelineData["altBuildInversionFactor"];
    }
    this.pokemon.cry();

    this.nameText.setText(this.pokemon.getNameToRender());

    this.nameText.setScale(0.1666666667);
    const nameMaxWidth = 100;
    const nameCondenseTrigger = this.pokemon.getNameToRender().length >= 24
        ? nameMaxWidth * 0.82
        : nameMaxWidth;
    if (this.nameText.displayWidth > nameCondenseTrigger) {
        const ratio = nameCondenseTrigger / this.nameText.displayWidth;
        this.nameText.setScale(this.nameText.scaleX * ratio, this.nameText.scaleY);
    }

    const isDuelmon = this.pokemon.species?.generation === 20;
    const isFusion = this.pokemon.isFusion();
    const nameStyle = (isDuelmon || isFusion || this.pokemon.isShiny() || this.pokemon.isGlitchOrSmittyForm()) ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY;
    this.nameText.setColor(this.getTextColor(nameStyle));
    this.nameText.setShadowColor(this.getTextColor(nameStyle, true));

    this.splicedIcon.setVisible(isFusion);

    const starterEntry = this.scene.gameData.starterData[rootId];
    const starterEntryFusion = this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId(true)];
    if ((starterEntry?.classicWinCount ?? 0) > 0 && (starterEntryFusion?.classicWinCount ?? 0) > 0) {
      this.championRibbon.setVisible(true);
    } else {
      this.championRibbon.setVisible(false);
    }

    let currentFriendship = starterEntry?.friendship ?? 0;
    if (!currentFriendship || currentFriendship === undefined) {
      currentFriendship = 0;
    }

    const friendshipCap = getStarterValueFriendshipCap(speciesStarters[rootId] ?? 1);
    const candyCropY = 16 - (16 * (currentFriendship / friendshipCap));

    if (this.candyShadow.visible) {
      this.candyShadow.on("pointerover", () => (this.scene as BattleScene).ui.showTooltip("", `${currentFriendship}/${friendshipCap}`, true));
      this.candyShadow.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
    }

    this.candyCountText.setText(`x${starterEntry?.candyCount ?? 0}`);

    this.candyShadow.setCrop(0,0,16, candyCropY);

    const doubleShiny = isFusion && this.pokemon.shiny && this.pokemon.fusionShiny;
    const baseVariant = !doubleShiny ? this.pokemon.getVariant() : this.pokemon.variant;

    this.pokeball.setFrame(getPokeballAtlasKey(this.pokemon.pokeball));
    if (this.pokemon.typeBallType !== undefined) {
      applyTypeBallRecolor(this.scene as BattleScene, this.pokeball, this.pokemon.typeBallType, true);
      this.pokeball.setAlpha(1);
    } else if (this.pokemon.pokeball === PokeballType.VOID_BALL) {
      applyVoidBallRecolor(this.scene as BattleScene, this.pokeball, true);
      this.pokeball.setAlpha(0.85);
    } else {
      this.pokeball.resetPipeline();
      this.pokeball.clearTint();
      this.pokeball.setAlpha(1);
    }
    this.levelText.setText(this.pokemon.level.toString());

    const cursorX = 36 + this.levelText.displayWidth + 4;

    this.summaryShinyContainer.setVisible(this.pokemon.isShiny());
    if (this.summaryShinyContainer.visible) {
      this.shinyIcon.setTexture(`shiny_star${doubleShiny ? "_1" : ""}`);
      this.shinyIcon.setTint(getVariantTint(baseVariant));
      this.shinyIcon.setPosition(-13.5, 0);
      this.shinyIcon.setOrigin(0, 0.5);
      this.shinyIcon.setVisible(true);
      const shinyDescriptor = doubleShiny || baseVariant ?
        `${baseVariant === 2 ? i18next.t("common:epicShiny") : baseVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}${doubleShiny ? `/${this.pokemon.fusionVariant === 2 ? i18next.t("common:epicShiny") : this.pokemon.fusionVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}` : ""}`
          : "";
      this.shinyIcon.off("pointerover");
      this.shinyIcon.off("pointerout");
      this.shinyIcon.on("pointerover", () => (this.scene as BattleScene).ui.showTooltip("", `${i18next.t("common:shinyOnHover")}${shinyDescriptor ? ` (${shinyDescriptor})` : ""}`, true));
      this.shinyIcon.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
      this.fusionShinyIcon.setPosition(this.shinyIcon.x, this.shinyIcon.y);
      this.fusionShinyIcon.setOrigin(0, 0.5);
      this.fusionShinyIcon.setVisible(doubleShiny);
      if (isFusion) this.fusionShinyIcon.setTint(getVariantTint(this.pokemon.fusionVariant));
    } else {
      this.shinyIcon.setVisible(false);
      this.fusionShinyIcon.setVisible(false);
    }

    this.genderText.setPosition(cursorX, -17);
    this.genderText.setText(getGenderSymbol(this.pokemon.getGender(true)));
    this.genderText.setColor(getGenderColor(this.pokemon.getGender(true)));
    this.genderText.setShadowColor(getGenderColor(this.pokemon.getGender(true), true));

    this.summaryFusionContainer.setVisible(isFusion);
    if (isFusion) {
      this.splicedIcon.setVisible(true);
      this.splicedIcon.setPosition(3.0, -1.0);
      this.splicedIcon.setOrigin(0, 0);
      this.splicedIcon.off("pointerover");
      this.splicedIcon.off("pointerout");
      this.splicedIcon.on("pointerover", () => {
        const primary = this.pokemon?.species.getName(this.pokemon.formIndex) || "";
        const fusion = this.pokemon?.fusionSpecies?.getName(this.pokemon?.fusionFormIndex) || "";
        (this.scene as BattleScene).ui.showTooltip(
          i18next.t("battleInfo:fusionTooltipTitle"),
          i18next.t("battleInfo:fusionTooltipBody", { primary, fusion }),
          true
        );
      });
      this.splicedIcon.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());

      if (this.pokemon.fusionSpecies) {
        this.summaryFusionSpeciesIcon.setTexture(this.pokemon.getFusionIconAtlasKey());
        this.summaryFusionSpeciesIcon.setFrame(this.pokemon.getFusionIconId());
        this.summaryFusionSpeciesIcon.setScale(adjustDuelmonIconScale(0.38, this.pokemon.fusionSpecies.generation) - 0.08);
        this.summaryFusionSpeciesIcon.setPosition((this.splicedIcon.displayWidth + 1) - 8.0, -5.5);
      }
    } else {
      this.splicedIcon.setVisible(false);
    }

    const showGlitchHint = Overrides.DEBUG_EMULATE_GLITCH_FORM || (!this.pokemon.isGlitchOrSmittyForm() && !(this.pokemon as any).isSignature && !(this.pokemon as any).altBuildId);
    if (showGlitchHint) {
      const glitchFormName = Overrides.DEBUG_EMULATE_GLITCH_FORM
        ? this.pokemon.species.getGlitchFormName(true)
        : this.pokemon.species.getGlitchFormName(false, this.scene as BattleScene);
      if (glitchFormName || Overrides.DEBUG_EMULATE_GLITCH_FORM) {
        this.summaryGlitchPokemonIcon.setTexture(this.pokemon.getIconAtlasKey());
        this.summaryGlitchPokemonIcon.setFrame(this.pokemon.getIconId(false));
        this.summaryGlitchPokemonIcon.setScale(adjustDuelmonIconScale(0.38, this.pokemon.species.generation) - 0.08);
        this.summaryGlitchPokemonIcon.setPosition(-14.5, -5.5);

        const formChangeItem = this.getGlitchFormChangeItem(this.pokemon);
        const itemFrame = formChangeItem !== null
          ? this.getSmitemFrame(formChangeItem)
          : (Overrides.DEBUG_EMULATE_GLITCH_FORM ? "glitchFruit" : null);
        if (itemFrame) {
          this.summaryGlitchItemIcon.setTexture("smitems");
          this.summaryGlitchItemIcon.setFrame(itemFrame);
          this.summaryGlitchItemIcon.setScale(0.10);
          this.summaryGlitchItemIcon.setPosition((this.summaryGlitchPokemonIcon.displayWidth - 8) - 12.0, -2.5);
          this.summaryGlitchItemIcon.setVisible(true);
        } else {
          this.summaryGlitchItemIcon.setVisible(false);
        }
        this.summaryGlitchContainer.setVisible(true);
      } else {
        this.summaryGlitchContainer.setVisible(false);
      }
    } else {
      this.summaryGlitchContainer.setVisible(false);
    }

    const isAltBuild = !!(this.pokemon as any).altBuildId;
    const displayRank = isAltBuild ? Math.max(1, (this.pokemon as any).altBuildRank ?? 0) : ((this.pokemon as any).rankUpCount ?? 0) + 1;
    const showRank = isAltBuild || displayRank > 1;
    if (showRank) {
      this.rankText.setText(Utils.intToRoman(displayRank));
      this.rankContainer.setVisible(true);
    } else {
      this.rankContainer.setVisible(false);
    }

    this.layoutSummaryIconRow();

    switch (this.summaryUiMode) {
      case SummaryUiMode.DEFAULT:
        const page = args.length < 2 ? Page.PROFILE : args[2] as Page;
        this.hideMoveEffect(true);
        this.setCursor(page);
      if (args.length > 3) {
        this.selectCallback = args[3];
      }
        break;
      case SummaryUiMode.LEARN_MOVE:
        this.newMove = args[2] as Move;
        this.moveSelectFunction = args[3] as Function;

        this.showMoveEffect(true);
        this.setCursor(Page.MOVES);
        this.showMoveSelect();
        break;
    }

    const fromSummary = args.length >= 2;

    if (this.pokemon.status || this.pokemon.pokerus) {
      this.showStatus(!fromSummary);
      this.status.setFrame(this.pokemon.status ? StatusEffect[this.pokemon.status.effect].toLowerCase() : "pokerus");
    } else {
      this.hideStatus(!fromSummary);
    }

    return true;
  }

  processInput(button: Button): boolean {
    if (button === Button.CYCLE_GENDER && this.scene.uiEditModeActive && DEBUG_YU_VISUAL_TUNING) {
      return this.onSumIconTweakCycle();
    }
    if (this._sumIconMetaMode !== TweakMetaMode.NONE) {
      return this.processSumIconTweakInput(button);
    }
    if (button === Button.CYCLE_ABILITY && this.scene.uiEditModeActive && DEBUG_YU_VISUAL_TUNING && this._spriteTweak) {
      if (this._sumIconMetaMode !== TweakMetaMode.NONE) {
        this.deactivateSumIconTweak();
      }
      return this._spriteTweak.onCycleAbility();
    }
    if (this._spriteTweak?.tweakActive) {
      return this._spriteTweak.processInput(button);
    }
    if (this.transitioning) {
      return false;
    }

    const ui = this.getUi();
    const fromPartyMode = ui.handlers[Mode.PARTY].active;
    let success = false;
    let error = false;

    if (this.moveSelect) {
      if (button === Button.ACTION) {
        if (this.pokemon && this.moveCursor < this.pokemon.moveset.length) {
          if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
            this.moveSelectFunction && this.moveSelectFunction(this.moveCursor);
          } else {
            if (this.selectedMoveIndex === -1) {
              this.selectedMoveIndex = this.moveCursor;
              this.setCursor(this.moveCursor);
            } else {
              if (this.selectedMoveIndex !== this.moveCursor) {
                const tempMove = this.pokemon?.moveset[this.selectedMoveIndex];
                this.pokemon.moveset[this.selectedMoveIndex] = this.pokemon.moveset[this.moveCursor];
                this.pokemon.moveset[this.moveCursor] = tempMove;

                const selectedMoveRow = this.moveRowContainers[this.selectedMoveIndex];
                const switchMoveRow = this.moveRowContainers[this.moveCursor];

                selectedMoveRow.setY(this.moveCursor * 16);
                switchMoveRow.setY(this.selectedMoveIndex * 16);

                this.moveRowContainers[this.selectedMoveIndex] = switchMoveRow;
                this.moveRowContainers[this.moveCursor] = selectedMoveRow;
              }

              this.selectedMoveIndex = -1;
              if (this.selectedMoveCursorObj) {
                this.selectedMoveCursorObj.destroy();
                this.selectedMoveCursorObj = null;
              }
            }
          }
          success = true;
        } else if (this.moveCursor === 4) {
          return this.processInput(Button.CANCEL);
        } else {
          error = true;
        }
      } else if (button === Button.CANCEL) {
        this.hideMoveSelect();
        success = true;
      } else {
        switch (button) {
          case Button.UP:
            success = this.setCursor(this.moveCursor ? this.moveCursor - 1 : 4);
            break;
          case Button.DOWN:
            success = this.setCursor(this.moveCursor < 4 ? this.moveCursor + 1 : 0);
            break;
          case Button.LEFT:
            this.moveSelect = false;
            this.setCursor(Page.STATS);
            if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
              this.hideMoveEffect();
              this.destroyBlinkCursor();
              success = true;
              break;
            } else {
              this.hideMoveSelect();
              success = true;
              break;
            }
          case Button.RIGHT: {
            this.moveSelect = false;
            this.hideMoveSelect();
            const pages = Utils.getEnumValues(Page);
            const nextRight = (this.cursor + 1) % pages.length;
            this.setCursor(nextRight);
            success = true;
            break;
          }
        }
      }
    } else {
      if (button === Button.ACTION) {
        if (this.cursor === Page.MOVES) {
          this.showMoveSelect();
          success = true;
        } else if (this.cursor === Page.PROFILE && this.pokemon?.hasPassive()) {
          this.abilityContainer.labelText.setVisible(!this.abilityContainer.labelText.visible);
          this.abilityContainer.nameText?.setVisible(!this.abilityContainer.nameText?.visible);
          this.abilityContainer.descriptionText?.setVisible(!this.abilityContainer.descriptionText.visible);

          this.passiveContainer.labelText.setVisible(!this.passiveContainer.labelText.visible);
          this.passiveContainer.nameText?.setVisible(!this.passiveContainer.nameText?.visible);
          this.passiveContainer.descriptionText?.setVisible(!this.passiveContainer.descriptionText.visible);
        }
      } else if (button === Button.CANCEL) {
        if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
          this.hideMoveSelect();
        } else {
          if (this.selectCallback instanceof Function) {
            const selectCallback = this.selectCallback;
            this.selectCallback = null;
            selectCallback();
          }

          if (!fromPartyMode) {
            ui.setMode(Mode.MESSAGE);
          } else {
          ui.setMode(Mode.PARTY);
        }
        }
        success = true;
      } else {
        const pages = Utils.getEnumValues(Page);
        switch (button) {
          case Button.UP:
          case Button.DOWN:
            if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
              break;
          } else if (!fromPartyMode) {
            break;
            }
            const isDown = button === Button.DOWN;
            const party = this.scene.getParty();
          const partyMemberIndex = this.pokemon ? party.indexOf(this.pokemon) : -1;
            if ((isDown && partyMemberIndex < party.length - 1) || (!isDown && partyMemberIndex)) {
              const page = this.cursor;
              const preservedOffsets = this._lastTweakOffsets;
              this._spriteTweak?.deactivate();
              this.deactivateSumIconTweak();
              this.clear();
              this._lastTweakOffsets = preservedOffsets;
              this.show([ party[partyMemberIndex + (isDown ? 1 : -1)], this.summaryUiMode, page ]);
            }
            break;
          case Button.LEFT: {
            const nextLeft = (this.cursor - 1 + pages.length) % pages.length;
            success = this.setCursor(nextLeft);
            break;
          }
          case Button.RIGHT: {
            const nextRight = (this.cursor + 1) % pages.length;
            success = this.setCursor(nextRight);
            if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.cursor === Page.MOVES) {
              this.moveSelect = true;
            }
            break;
          }
        }
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  setCursor(cursor: integer, overrideChanged: boolean = false): boolean {
    let changed: boolean = overrideChanged || this.moveCursor !== cursor;

    if (this.moveSelect) {
      this.moveCursor = cursor;

      const selectedMove = this.getSelectedMove();

      if (selectedMove) {
        this.moveDescriptionText.setY(84);
        this.movePowerText.setText(selectedMove.power >= 0 ? selectedMove.power.toString() : "---");
        this.moveAccuracyText.setText(selectedMove.accuracy >= 0 ? selectedMove.accuracy.toString() : "---");
        this.moveCategoryIcon.setFrame(MoveCategory[selectedMove.category].toLowerCase());
        this.showMoveEffect();
      } else {
        this.hideMoveEffect();
      }

      this.moveDescriptionText.setText(selectedMove?.effect || "");
      const moveDescriptionLineCount = Math.floor(this.moveDescriptionText.displayHeight / 14.83);

      if (this.descriptionScrollTween) {
        this.descriptionScrollTween.remove();
        this.descriptionScrollTween = null;
      }

      if (moveDescriptionLineCount > 3) {
        this.descriptionScrollTween = this.scene.tweens.add({
          targets: this.moveDescriptionText,
          delay: Utils.fixedInt(2000),
          loop: -1,
          hold: Utils.fixedInt(2000),
          duration: Utils.fixedInt((moveDescriptionLineCount - 3) * 2000),
          y: `-=${14.83 * (moveDescriptionLineCount - 3)}`
        });
      }

      if (!this.moveCursorObj) {
        this.moveCursorObj = this.scene.add.sprite(-2, 0, "summary_moves_cursor", "highlight");
        this.moveCursorObj.setOrigin(0, 1);
        this.movesContainer.add(this.moveCursorObj);
      }

      this.moveCursorObj.setY(16 * this.moveCursor + 1);

      if (this.moveCursorBlinkTimer) {
        this.moveCursorBlinkTimer.destroy();
      }
      this.moveCursorObj.setVisible(true);
      this.moveCursorBlinkTimer = this.scene.time.addEvent({
        loop: true,
        delay: Utils.fixedInt(600),
        callback: () => {
          this.moveCursorObj?.setVisible(false);
          this.scene.time.delayedCall(Utils.fixedInt(100), () => {
            if (!this.moveCursorObj) {
              return;
            }
            this.moveCursorObj.setVisible(true);
          });
        }
      });
      if (this.selectedMoveIndex > -1) {
        if (!this.selectedMoveCursorObj) {
          this.selectedMoveCursorObj = this.scene.add.sprite(-2, 0, "summary_moves_cursor", "select");
          this.selectedMoveCursorObj.setOrigin(0, 1);
          this.movesContainer.add(this.selectedMoveCursorObj);
          this.movesContainer.moveBelow(this.selectedMoveCursorObj, this.moveCursorObj);
        }

        this.selectedMoveCursorObj.setY(16 * this.selectedMoveIndex + 1);
      }
    } else {
      changed = this.cursor !== cursor;
      if (changed) {
        const prevCursor = this.cursor;
        const pageCount = Utils.getEnumValues(Page).length;
        const forward = ((cursor - prevCursor + pageCount) % pageCount) <= (pageCount >> 1);
        this.cursor = cursor;

        this.tabSprite.setTexture(`summary_tabs_${this.cursor + 1}`);

        this.getUi().hideTooltip();

        if (this.summaryPageContainer.visible) {
          this.transitioning = true;
          this.populatePageContainer(this.summaryPageTransitionContainer, forward ? cursor : prevCursor);
          if (forward) {
            this.summaryPageTransitionContainer.x += 214;
          } else {
            this.populatePageContainer(this.summaryPageContainer);
          }
          this.scene.tweens.add({
            targets: this.summaryPageTransitionContainer,
            x: forward ? "-=214" : "+=214",
            duration: 250,
            onComplete: () => {
              if (forward) {
                this.populatePageContainer(this.summaryPageContainer);
                if (this.cursor===Page.MOVES) {
                  this.moveCursorObj = null;
                  this.showMoveSelect();
                  this.showMoveEffect();
                }
              } else {
                this.summaryPageTransitionContainer.x -= 214;
              }
              this.summaryPageTransitionContainer.setVisible(false);
              this.transitioning = false;
              this._summaryPattern?.redraw();
            }
          });
          this.summaryPageTransitionContainer.setVisible(true);
        } else {
          this.populatePageContainer(this.summaryPageContainer);
          this.summaryPageContainer.setVisible(true);
        }
      }
    }

    if (this.navLeftButton) this.navLeftButton.setVisible(true);
    if (this.navRightButton) this.navRightButton.setVisible(true);
    this.updateSummaryNavPositions();

    return changed;
  }

  private updateSummaryNavPositions(): void {
    if (!this.navLeftButton || !this.navRightButton || !this.tabSprite) return;

    const gap = 4;
    const tabLeftX = this.tabSprite.x - this.tabSprite.displayWidth;
    const tabRightX = this.tabSprite.x;
    const tabCenterY = this.tabSprite.y - this.tabSprite.displayHeight / 2;

    this.navLeftButton.setPosition(tabLeftX - gap, tabCenterY);
    this.navRightButton.setPosition(tabRightX + gap, tabCenterY);
    this.summaryContainer.bringToTop(this.navLeftButton);
    this.summaryContainer.bringToTop(this.navRightButton);
  }

  populatePageContainer(pageContainer: Phaser.GameObjects.Container, page?: Page) {
    if (page === undefined) {
      page = this.cursor;
    }

    if (pageContainer.getAll().length > 1) {
      pageContainer.each((o: Phaser.GameObjects.GameObject) => {
        if (o instanceof Phaser.GameObjects.Container) {
          o.removeAll(true);
        }
      });
      pageContainer.removeBetween(1, undefined, true);
    }
    const pageBg =  (pageContainer.getAt(0) as Phaser.GameObjects.Sprite);
    pageBg.setTexture(this.getPageKey(page));

    if (this.descriptionScrollTween) {
      this.descriptionScrollTween.remove();
      this.descriptionScrollTween = null;
    }

    switch (page) {
      case Page.PROFILE:
        const profileContainer = this.scene.add.container(0, -pageBg.height);
        pageContainer.add(profileContainer);

        const profileLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.PROFILE.x,
          LABEL_CONSTANTS.PROFILE.y,
          i18next.t("pokemonSummary:profile"),
          LABEL_CONSTANTS.PROFILE.style,
          { fontSize: LABEL_CONSTANTS.PROFILE.fontSize }
        );
        profileLabel.setOrigin(0, 0);
        profileContainer.add(profileLabel);

      const trainerText = addBBCodeTextObject(this.scene, 7, 12, `${i18next.t("pokemonSummary:ot")}/${getBBCodeFrag(loggedInUser?.username || i18next.t("pokemonSummary:unknown"), this.scene.gameData.gender === PlayerGender.FEMALE ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY_BLUE)}`, TextStyle.SUMMARY_ALT);
        trainerText.setOrigin(0, 0);
        profileContainer.add(trainerText);

        const idNoLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.ID_NO.x,
          LABEL_CONSTANTS.ID_NO.y,
          i18next.t("pokemonSummary:idNo"),
          LABEL_CONSTANTS.ID_NO.style,
          { fontSize: LABEL_CONSTANTS.ID_NO.fontSize }
        );
        idNoLabel.setOrigin(0, 0);
        profileContainer.add(idNoLabel);

        const trainerIdText = addTextObject(this.scene, 174, 12, this.scene.gameData.trainerId.toString(), TextStyle.SUMMARY_ALT);
        trainerIdText.setOrigin(0, 0);
        profileContainer.add(trainerIdText);

      const typeLabel = addTextObject(this.scene, 7, 28, `${i18next.t("pokemonSummary:type")}/`, TextStyle.WINDOW_ALT);
        typeLabel.setOrigin(0, 0);
        profileContainer.add(typeLabel);

        const getTypeIcon = (index: integer, type: Type, tera: boolean = false) => {
        const xCoord = typeLabel.width * typeLabel.scale + 9 + 34 * index;
          const typeIcon = !tera
          ? this.scene.add.sprite(xCoord, 42, Utils.getLocalizedSpriteKey("types"), Type[type].toLowerCase())
          : this.scene.add.sprite(xCoord, 42, "type_tera");
          if (tera) {
            typeIcon.setScale(0.5);
            const typeRgb = getTypeRgb(type);
            typeIcon.setTint(Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]));
          }
          typeIcon.setOrigin(0, 1);
          return typeIcon;
        };

      const types = this.pokemon?.getTypes(false, false, true)!;
        profileContainer.add(getTypeIcon(0, types[0]));
        if (types.length > 1) {
          profileContainer.add(getTypeIcon(1, types[1]));
        }
      if (this.pokemon?.isTerastallized()) {
          profileContainer.add(getTypeIcon(types.length, this.pokemon.getTeraType(), true));
        }

        this.abilityContainer = {
          labelText: addTextObject(
            this.scene,
            LABEL_CONSTANTS.ABILITY.x,
            LABEL_CONSTANTS.ABILITY.y,
            i18next.t("pokemonSummary:ability"),
            LABEL_CONSTANTS.ABILITY.style,
            { fontSize: LABEL_CONSTANTS.ABILITY.fontSize }
          ),
        ability: this.pokemon?.getAbility(true)!,
          nameText: null,
          descriptionText: null};

        this.abilityContainer.labelText.setOrigin(0, 0);

        const allAbilityInfo = [this.abilityContainer];

      if (this.pokemon?.hasPassive()) {
          this.passiveContainer = {
            labelText: addTextObject(
              this.scene,
              LABEL_CONSTANTS.PASSIVE.x,
              LABEL_CONSTANTS.PASSIVE.y,
              i18next.t("pokemonSummary:passive"),
              LABEL_CONSTANTS.PASSIVE.style,
              { fontSize: LABEL_CONSTANTS.PASSIVE.fontSize }
            ),
            ability: this.pokemon.getPassiveAbility(),
            nameText: null,
            descriptionText: null};

          this.passiveContainer.labelText.setOrigin(0, 0);
          allAbilityInfo.push(this.passiveContainer);
          this.abilityPrompt = this.scene.add.image(0, 0, !this.scene.inputController?.gamepadSupport ? "summary_profile_prompt_z" : "summary_profile_prompt_a");
          this.abilityPrompt.setPosition(8, 43);
          this.abilityPrompt.setVisible(true);
          this.abilityPrompt.setOrigin(0, 0);
          profileContainer.add(this.abilityPrompt);
        }

        allAbilityInfo.forEach(abilityInfo => {
          profileContainer.add(abilityInfo.labelText);

        abilityInfo.nameText = addTextObject(this.scene, 7, 66, abilityInfo.ability?.name!, TextStyle.SUMMARY_ALT);
          abilityInfo.nameText.setOrigin(0, 1);
          profileContainer.add(abilityInfo.nameText);

        abilityInfo.descriptionText = addTextObject(this.scene, 7, 69, abilityInfo.ability?.description!, TextStyle.WINDOW_ALT, { wordWrap: { width: 1224 } });
          abilityInfo.descriptionText.setOrigin(0, 0);
          profileContainer.add(abilityInfo.descriptionText);
          const descriptionTextMaskRect = this.scene.make.graphics({});
          descriptionTextMaskRect.setScale(6);
          descriptionTextMaskRect.fillStyle(0xFFFFFF);
          descriptionTextMaskRect.beginPath();
          descriptionTextMaskRect.fillRect(110, 90.5, 206, 31);

          const abilityDescriptionTextMask = descriptionTextMaskRect.createGeometryMask();

          abilityInfo.descriptionText.setMask(abilityDescriptionTextMask);

          const abilityDescriptionLineCount = Math.floor(abilityInfo.descriptionText.displayHeight / 14.83);
          if (abilityDescriptionLineCount > 2) {
            abilityInfo.descriptionText.setY(69);
            this.descriptionScrollTween = this.scene.tweens.add({
              targets: abilityInfo.descriptionText,
              delay: Utils.fixedInt(2000),
              loop: -1,
              hold: Utils.fixedInt(2000),
              duration: Utils.fixedInt((abilityDescriptionLineCount - 2) * 2000),
              y: `-=${14.83 * (abilityDescriptionLineCount - 2)}`
            });
          }
        });

        this.passiveContainer?.labelText.setVisible(false);
      this.passiveContainer?.nameText?.setVisible(false);
      this.passiveContainer?.descriptionText?.setVisible(false);

      const closeFragment = getBBCodeFrag("", TextStyle.WINDOW_ALT);
      const rawNature = Utils.toReadableString(Nature[this.pokemon?.getNature()!]);
      const nature = `${getBBCodeFrag(Utils.toReadableString(getNatureName(this.pokemon?.getNature()!)), TextStyle.SUMMARY_RED)}${closeFragment}`;

      const memoString = i18next.t("pokemonSummary:memoString", {
        metFragment: i18next.t(`pokemonSummary:metFragment.${this.pokemon?.metBiome === -1? "apparently": "normal"}`, {
          biome: `${getBBCodeFrag(getBiomeName(this.pokemon?.metBiome!), TextStyle.SUMMARY_RED)}${closeFragment}`,
          level: `${getBBCodeFrag(this.pokemon?.metLevel.toString()!, TextStyle.SUMMARY_RED)}${closeFragment}`,
        }),
        natureFragment: i18next.t(`pokemonSummary:natureFragment.${rawNature}`, { nature: nature })
      });

      const trainerMemoLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.TRAINER_MEMO.x,
        LABEL_CONSTANTS.TRAINER_MEMO.y,
        i18next.t("pokemonSummary:trainerMemo"),
        LABEL_CONSTANTS.TRAINER_MEMO.style,
        { fontSize: LABEL_CONSTANTS.TRAINER_MEMO.fontSize }
      );
      trainerMemoLabel.setOrigin(0, 0);
      profileContainer.add(trainerMemoLabel);

      const memoText = addBBCodeTextObject(this.scene, 7, 115, String(memoString), TextStyle.WINDOW_ALT);
        memoText.setOrigin(0, 0);
        profileContainer.add(memoText);
        break;
      case Page.STATS:
        const statsContainer = this.scene.add.container(0, -pageBg.height);
        pageContainer.add(statsContainer);

        const statsLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.STATS.x,
          LABEL_CONSTANTS.STATS.y,
          i18next.t("pokemonSummary:stats"),
          LABEL_CONSTANTS.STATS.style,
          { fontSize: LABEL_CONSTANTS.STATS.fontSize }
        );
        statsLabel.setOrigin(0, 0);
        statsContainer.add(statsLabel);

        const stats = Utils.getEnumValues(Stat) as Stat[];

        stats.forEach((stat, s) => {
        const statName = getStatName(stat);
          const rowIndex = s % 3;
          const colIndex = Math.floor(s / 3);

        const natureStatMultiplier = getNatureStatMultiplier(this.pokemon?.getNature()!, s);

          const statLabel = addTextObject(this.scene, 27 + 115 * colIndex + (colIndex === 1 ?  5 : 0), 56 + 16 * rowIndex, statName, natureStatMultiplier === 1 ? TextStyle.SUMMARY : natureStatMultiplier > 1 ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY_BLUE);
          statLabel.setOrigin(0.5, 0);
          statsContainer.add(statLabel);

          const statValueText = stat !== Stat.HP
          ? Utils.formatStat(this.pokemon?.stats[s]!)
          : `${Utils.formatStat(this.pokemon?.hp!, true)}/${Utils.formatStat(this.pokemon?.getMaxHp()!, true)}`;

          const statValue = addTextObject(this.scene, 120 + 88 * colIndex, 56 + 16 * rowIndex, statValueText, TextStyle.WINDOW_ALT);
          statValue.setOrigin(1, 0);
          statsContainer.add(statValue);
        });

        const itemModifiers = (this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
          && m.pokemonId === this.pokemon?.id, this.playerParty) as PokemonHeldItemModifier[])
            .sort(modifierSortFunc);

        const itemsLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.ITEMS.x,
          LABEL_CONSTANTS.ITEMS.y,
          i18next.t("pokemonSummary:items"),
          LABEL_CONSTANTS.ITEMS.style,
          { fontSize: LABEL_CONSTANTS.ITEMS.fontSize }
        );
        itemsLabel.setOrigin(0, 0);
        statsContainer.add(itemsLabel);

        itemModifiers.forEach((item, i) => {
          const icon = item.getIcon(this.scene, true);

          icon.setPosition((i % 17) * 12 + 3, 14 * Math.floor(i / 17) + 22);
          statsContainer.add(icon);

          icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 32), Phaser.Geom.Rectangle.Contains);
          icon.on("pointerover", () => ModifierTooltipUtils.showForModifier(this.scene as BattleScene, item));
          icon.on("pointerout", () => ModifierTooltipUtils.hideIfNotPinned(this.scene as BattleScene));
        });

      const pkmLvl = this.pokemon?.level!;
      const pkmLvlExp = this.pokemon?.levelExp!;
      const pkmExp = this.pokemon?.exp!;
      const pkmSpeciesGrowthRate = this.pokemon?.species.growthRate!;
      const relLvExp = getLevelRelExp(pkmLvl + 1, pkmSpeciesGrowthRate);
      const expRatio = pkmLvl < this.scene.getMaxExpLevel() ? pkmLvlExp / relLvExp : 0;

      const expLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.EXP.x,
        LABEL_CONSTANTS.EXP.y,
        i18next.t("pokemonSummary:exp"),
        LABEL_CONSTANTS.EXP.style,
        { fontSize: LABEL_CONSTANTS.EXP.fontSize }
      );
        expLabel.setOrigin(0, 0);
        statsContainer.add(expLabel);
      const expBarImage = this.scene.add.image(
        LABEL_CONSTANTS.EXP_BAR.x,
        LABEL_CONSTANTS.EXP_BAR.y + 2,
        "summary_stats_exp_bar"
      );
      expBarImage.setOrigin(0, 0);
      expBarImage.setScale(0.25);
      statsContainer.add(expBarImage);

      const nextLvExpLabel = addTextObject(this.scene, 6, 128, i18next.t("pokemonSummary:nextLv"), TextStyle.SUMMARY);
        nextLvExpLabel.setOrigin(0, 0);
        statsContainer.add(nextLvExpLabel);

      const expText = addTextObject(this.scene, 208, 112, pkmExp.toString(), TextStyle.WINDOW_ALT);
        expText.setOrigin(1, 0);
        statsContainer.add(expText);

      const nextLvExp = pkmLvl < this.scene.getMaxExpLevel()
        ? getLevelTotalExp(pkmLvl + 1, pkmSpeciesGrowthRate) - pkmExp
            : 0;
        const nextLvExpText = addTextObject(this.scene, 208, 128, nextLvExp.toString(), TextStyle.WINDOW_ALT);
        nextLvExpText.setOrigin(1, 0);
        statsContainer.add(nextLvExpText);

        const expOverlay = this.scene.add.image(140, 148, "summary_stats_overlay_exp");
        expOverlay.setOrigin(0, 0);
        statsContainer.add(expOverlay);

        const expMaskRect = this.scene.make.graphics({});
        expMaskRect.setScale(6);
        expMaskRect.fillStyle(0xFFFFFF);
        expMaskRect.beginPath();
        expMaskRect.fillRect(140 + pageContainer.x, 148 + pageContainer.y + 21, Math.floor(expRatio * 64), 3);

        const expMask = expMaskRect.createGeometryMask();

        expOverlay.setMask(expMask);
        break;
      case Page.MOVES:
        this.movesContainer = this.scene.add.container(5, -pageBg.height + 26);
        pageContainer.add(this.movesContainer);

        const movesLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.MOVES.x,
          LABEL_CONSTANTS.MOVES.y,
          i18next.t("pokemonSummary:moves"),
          LABEL_CONSTANTS.MOVES.style,
          { fontSize: LABEL_CONSTANTS.MOVES.fontSize }
        );
        movesLabel.setOrigin(0, 0);
        this.movesContainer.add(movesLabel);

        this.extraMoveRowContainer = this.scene.add.container(0, 64);
        this.extraMoveRowContainer.setVisible(false);
        this.movesContainer.add(this.extraMoveRowContainer);

        const extraRowOverlay = this.scene.add.image(-2, 1, "summary_moves_overlay_row");
        extraRowOverlay.setOrigin(0, 1);
        this.extraMoveRowContainer.add(extraRowOverlay);

      const extraRowText = addTextObject(this.scene, 35, 0, this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.newMove ? this.newMove.name : i18next.t("pokemonSummary:cancel"),
            this.summaryUiMode === SummaryUiMode.LEARN_MOVE ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY);
        extraRowText.setOrigin(0, 1);
        this.extraMoveRowContainer.add(extraRowText);

        if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
          this.extraMoveRowContainer.setVisible(true);

        if (this.newMove && this.pokemon) {
          const spriteKey = Utils.getLocalizedSpriteKey("types");
          const moveType = this.pokemon.getMoveType(this.newMove);
          const newMoveTypeIcon = this.scene.add.sprite(0, 0, spriteKey, Type[moveType].toLowerCase());
          newMoveTypeIcon.setOrigin(0, 1);
          this.extraMoveRowContainer.add(newMoveTypeIcon);
        }
          const ppOverlay = this.scene.add.image(163, -1, "summary_moves_overlay_pp");
          ppOverlay.setOrigin(0, 1);
          this.extraMoveRowContainer.add(ppOverlay);

        const pp = Utils.padInt(this.newMove?.pp!, 2, "  ");
          const ppText = addTextObject(this.scene, 173, 1, `${pp}/${pp}`, TextStyle.WINDOW);
          ppText.setOrigin(0, 1);
          this.extraMoveRowContainer.add(ppText);
        }

        this.moveRowsContainer = this.scene.add.container(0, 0);
        this.moveRowContainers = [];
        this.movesContainer.add(this.moveRowsContainer);

        for (let m = 0; m < 4; m++) {
        const move: PokemonMove | null = this.pokemon && this.pokemon.moveset.length > m ? this.pokemon?.moveset[m] : null;
          const moveRowContainer = this.scene.add.container(0, 16 * m);
          this.moveRowsContainer.add(moveRowContainer);
          this.moveRowContainers.push(moveRowContainer);

        if (move && this.pokemon) {
          const spriteKey = Utils.getLocalizedSpriteKey("types");
          const moveType = this.pokemon.getMoveType(move.getMove());
          const typeIcon = this.scene.add.sprite(0, 0, spriteKey, Type[moveType].toLowerCase());
          typeIcon.setOrigin(0, 1);
            moveRowContainer.add(typeIcon);
          }

          const moveText = addTextObject(this.scene, 35, 0, move ? move.getName() : "-", TextStyle.SUMMARY);
          moveText.setOrigin(0, 1);
          moveRowContainer.add(moveText);

          const ppOverlay = this.scene.add.image(163, -1, "summary_moves_overlay_pp");
          ppOverlay.setOrigin(0, 1);
          moveRowContainer.add(ppOverlay);

          const ppText = addTextObject(this.scene, 173, 1, "--/--", TextStyle.WINDOW);
          ppText.setOrigin(0, 1);

          if (move) {
            const maxPP = move.getMovePp();
            const pp = maxPP - move.ppUsed;
            ppText.setText(`${Utils.padInt(pp, 2, "  ")}/${Utils.padInt(maxPP, 2, "  ")}`);
          }

          moveRowContainer.add(ppText);
        }

        for (let m = 0; m < 4; m++) {
          this.wireMoveRowHitZone(m);
        }
        this.wireMoveRowHitZone(4);

        const descriptionLabel = addTextObject(
          this.scene,
          LABEL_CONSTANTS.DESCRIPTION.x,
          LABEL_CONSTANTS.DESCRIPTION.y,
          i18next.t("pokemonSummary:description"),
          LABEL_CONSTANTS.DESCRIPTION.style,
          { fontSize: LABEL_CONSTANTS.DESCRIPTION.fontSize }
        );
        descriptionLabel.setOrigin(0, 0);
        this.movesContainer.add(descriptionLabel);

        this.moveDescriptionText = addTextObject(this.scene, 2, 84, "", TextStyle.WINDOW_ALT, { wordWrap: { width: 1212 } });
        this.movesContainer.add(this.moveDescriptionText);

        const moveDescriptionTextMaskRect = this.scene.make.graphics({});
        moveDescriptionTextMaskRect.setScale(6);
        moveDescriptionTextMaskRect.fillStyle(0xFFFFFF);
        moveDescriptionTextMaskRect.beginPath();
        moveDescriptionTextMaskRect.fillRect(112, 130, 202, 46);

        const moveDescriptionTextMask = moveDescriptionTextMaskRect.createGeometryMask();

        this.moveDescriptionText.setMask(moveDescriptionTextMask);
        break;
    }
  }

  showStatus(instant?: boolean) {
    if (this.statusVisible) {
      return;
    }
    this.statusVisible = true;
    this.scene.tweens.add({
      targets: this.statusContainer,
      x: 0,
      duration: instant ? 0 : 250,
      ease: "Sine.easeOut"
    });
  }

  hideStatus(instant?: boolean) {
    if (!this.statusVisible) {
      return;
    }
    this.statusVisible = false;
    this.scene.tweens.add({
      targets: this.statusContainer,
      x: -106,
      duration: instant ? 0 : 250,
      ease: "Sine.easeIn"
    });
  }

  private layoutSummaryIconRow(): void {
    let cursorX = 0;
    const gap = this._sumIconRowGap;

    if (this.summaryFusionContainer.visible) {
      this.summaryFusionContainer.setPosition(cursorX, 0);
      cursorX += (this.splicedIcon.displayWidth + 1 + this.summaryFusionSpeciesIcon.displayWidth) + gap;
    }

    if (this.summaryGlitchContainer.visible) {
      this.summaryGlitchContainer.setPosition(cursorX > 0 ? cursorX + 1.5 : cursorX + 17.5, 0);
      const glitchW = this.summaryGlitchPokemonIcon.displayWidth +
        (this.summaryGlitchItemIcon.visible ? this.summaryGlitchItemIcon.displayWidth : 0);
      cursorX += glitchW + gap;
    }

    if (this.rankContainer.visible) {
      const isFirstGroup = cursorX === 0 && !this.summaryFusionContainer.visible && !this.summaryGlitchContainer.visible;
      this.rankContainer.setPosition(isFirstGroup ? 0 : cursorX + 3.0, 0);
      const soulNudge = isFirstGroup ? 20.0 : (this.summaryGlitchContainer.visible ? 0 : 11.0);
      this.rankIcon.setPosition(-24.0 + soulNudge, -0.5);
      this.rankText.setPosition(-19.5 + soulNudge, 1.5);
      const containerWidth = Math.max(this.rankIcon.displayWidth, this.rankText.x + this.rankText.displayWidth);
      cursorX += containerWidth + gap;
    }

    const fewerGroups = !this.summaryGlitchContainer.visible || !this.rankContainer.visible;

    if (this.summaryShinyContainer.visible) {
      if (fewerGroups) {
        this.shinyIcon.setPosition(-7.0, -0.5);
        this.fusionShinyIcon.setPosition(-7.0, -0.5);
      } else {
        this.shinyIcon.setPosition(-13.5, 0);
        this.fusionShinyIcon.setPosition(-13.5, 0);
      }
      this.summaryShinyContainer.setPosition(cursorX > 0 ? cursorX : 10.0, 0);
      cursorX += this.shinyIcon.displayWidth + gap;
    }

    const anyVisible = this.summaryFusionContainer.visible ||
      this.summaryGlitchContainer.visible ||
      this.rankContainer.visible ||
      this.summaryShinyContainer.visible;

    this.summaryIconRowContainer.setVisible(anyVisible);

    if (anyVisible) {
      const effectiveWidthPad = fewerGroups ? -1 : this._sumIconRowBgWidthPad;
      this.summaryIconRowBg.clear();
      this.summaryIconRowBg.fillStyle(0x000000, 0.65);
      this.summaryIconRowBg.fillRoundedRect(-2, -7, Math.max(0, cursorX + effectiveWidthPad), Math.max(0, this._sumIconRowBgHeight), this._sumIconRowBorderRadius);
      this.summaryIconRowBg.setVisible(true);
    } else {
      this.summaryIconRowBg.setVisible(false);
    }
  }

  private getSumIconTweakTarget(index: number): Phaser.GameObjects.GameObject | null {
    switch (index) {
      case 0: return this.summaryIconRowBg;
      case 1: return this.splicedIcon;
      case 2: return this.summaryFusionSpeciesIcon;
      case 3: return this.summaryGlitchPokemonIcon;
      case 4: return this.summaryGlitchItemIcon;
      case 5: return this.rankIcon;
      case 6: return this.rankText;
      case 7: return this.summaryGlitchContainer;
      case 8: return this.rankContainer;
      case 9: return this.splicedIcon;
      case 10: return this.summaryGlitchPokemonIcon;
      case 11: return this.rankIcon;
      case 12: return this.summaryIconRowIconsContainer;
      case 13: return this.summaryIconRowContainer;
      case 14: return this.shinyIcon;
      case 15: return this.fusionShinyIcon;
      case 16: return this.shinyIcon;
      default: return null;
    }
  }

  private captureSumIconTweakBaseline(name: string, target: Phaser.GameObjects.GameObject): void {
    const fontSize = target instanceof Phaser.GameObjects.Text
      ? parseInt(target.style.fontSize as string, 10) || 0
      : 0;
    this._sumIconTweakBaselines.set(name, {
      x: target.x ?? 0,
      y: target.y ?? 0,
      scaleX: target.scaleX ?? 1,
      scaleY: target.scaleY ?? 1,
      alpha: target.alpha ?? 1,
      displayWidth: (target as Phaser.GameObjects.Image).displayWidth ?? 0,
      displayHeight: (target as Phaser.GameObjects.Image).displayHeight ?? 0,
      fontSize,
      listIndex: (target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0,
    });
    if (!this._sumIconTweakDeltas.has(name)) {
      this._sumIconTweakDeltas.set(name, {
        dx: 0, dy: 0, dScaleX: 0, dScaleY: 0, dAlpha: 0, dFontSize: 0, dWidth: 0, dHeight: 0, dListIndex: 0,
      });
    }
  }

  private captureAllSumIconTweakBaselines(): void {
    this._sumIconTweakBaselines.clear();
    for (let i = 0; i < SummaryUiHandler.SUM_ICON_TWEAK_ASSETS.length; i++) {
      const t = this.getSumIconTweakTarget(i);
      if (t) {
        this.captureSumIconTweakBaseline(SummaryUiHandler.SUM_ICON_TWEAK_ASSETS[i], t);
      }
    }
  }

  private syncSumIconTweakDelta(name: string, target: Phaser.GameObjects.GameObject): void {
    const baseline = this._sumIconTweakBaselines.get(name);
    if (!baseline) return;
    const fontSize = target instanceof Phaser.GameObjects.Text
      ? parseInt(target.style.fontSize as string, 10) || baseline.fontSize
      : baseline.fontSize;
    const dw = (target as Phaser.GameObjects.Image).displayWidth ?? baseline.displayWidth;
    const dh = (target as Phaser.GameObjects.Image).displayHeight ?? baseline.displayHeight;
    this._sumIconTweakDeltas.set(name, {
      dx: (target.x ?? 0) - baseline.x,
      dy: (target.y ?? 0) - baseline.y,
      dScaleX: (target.scaleX ?? 1) - baseline.scaleX,
      dScaleY: (target.scaleY ?? 1) - baseline.scaleY,
      dAlpha: (target.alpha ?? 1) - baseline.alpha,
      dFontSize: fontSize - baseline.fontSize,
      dWidth: dw - baseline.displayWidth,
      dHeight: dh - baseline.displayHeight,
      dListIndex: ((target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0) - baseline.listIndex,
    });
  }

  private onSumIconTweakCycle(): boolean {
    if (!DEBUG_YU_VISUAL_TUNING) return false;
    const wasActive = this._sumIconMetaMode !== TweakMetaMode.NONE;
    this._sumIconMetaMode = cycleMetaMode(this._sumIconMetaMode, TWEAK_META_CYCLE);
    const isActive = this._sumIconMetaMode !== TweakMetaMode.NONE;
    this.updateSumIconTweakHUD();

    if (isActive && !wasActive) {
      if (this._spriteTweak?.tweakActive) {
        this._spriteTweak.deactivate();
      }
      (this.scene as BattleScene).uiEditModeActive = true;
      this.captureAllSumIconTweakBaselines();
      this._sumIconDropdownPanel = new TweakDropdownPanel({
        scene: this.scene as BattleScene,
        getAnchorGameCoords: () => {
          const canvas = this.scene.game.canvas;
          const rect = canvas.getBoundingClientRect();
          return { x: rect.left + 10, y: rect.top + 10 };
        },
        elements: [...SummaryUiHandler.SUM_ICON_TWEAK_ASSETS],
        modes: [...SummaryUiHandler.SUM_ICON_TWEAK_MODES],
        coordSpace: "screen",
        alphabeticalSort: false,
        elementGroups: SummaryUiHandler.SUM_ICON_TWEAK_ASSET_GROUPS,
        onElementChange: (_name: string, idx: number) => {
          this._sumIconTweakAssetIndex = idx;
          this.updateSumIconTweakHUD();
        },
        onModeChange: (_name: string, idx: number) => {
          this._sumIconTweakMode = idx;
          this.updateSumIconTweakHUD();
        },
      });
      this._sumIconDropdownPanel.create();
      this._sumIconKeyVHandler = () => {
        if (this._sumIconMetaMode === TweakMetaMode.NONE) return;
        this.outputAllSumIconTweakStates();
      };
      this._sumIconKeyFiveHandler = () => {
        if (this._sumIconMetaMode === TweakMetaMode.NONE) return;
        this._sumIconDropdownPanel?.toggle();
      };
      (this.scene as BattleScene).input.keyboard?.on("keydown-V", this._sumIconKeyVHandler);
      (this.scene as BattleScene).input.keyboard?.on("keydown-FIVE", this._sumIconKeyFiveHandler);
    } else if (!isActive && wasActive) {
      this.deactivateSumIconTweak();
    }
    return true;
  }

  private deactivateSumIconTweak(): void {
    if (this._sumIconMetaMode !== TweakMetaMode.NONE) {
      this._sumIconMetaMode = TweakMetaMode.NONE;
      this.updateSumIconTweakHUD();
    }
    this._sumIconTweakBaselines.clear();
    if (this._sumIconDropdownPanel) {
      this._sumIconDropdownPanel.destroy();
      this._sumIconDropdownPanel = null;
    }
    if (this._sumIconKeyVHandler) {
      (this.scene as BattleScene).input.keyboard?.off("keydown-V", this._sumIconKeyVHandler);
      this._sumIconKeyVHandler = null;
    }
    if (this._sumIconKeyFiveHandler) {
      (this.scene as BattleScene).input.keyboard?.off("keydown-FIVE", this._sumIconKeyFiveHandler);
      this._sumIconKeyFiveHandler = null;
    }
  }

  private processSumIconTweakInput(button: Button): boolean {
    if (this._sumIconMetaMode === TweakMetaMode.NONE) return false;

    if (button === Button.CANCEL) {
      this.deactivateSumIconTweak();
      (this.scene as BattleScene).refreshUiEditModeActive();
      return true;
    }

    if (button === Button.CYCLE_GENDER) {
      this.outputAllSumIconTweakStates();
      return true;
    }

    if (this._sumIconMetaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._sumIconTweakMode = (this._sumIconTweakMode - 1 + SummaryUiHandler.SUM_ICON_TWEAK_MODES.length) % SummaryUiHandler.SUM_ICON_TWEAK_MODES.length;
        this.updateSumIconTweakHUD();
      } else if (button === Button.RIGHT) {
        this._sumIconTweakMode = (this._sumIconTweakMode + 1) % SummaryUiHandler.SUM_ICON_TWEAK_MODES.length;
        this.updateSumIconTweakHUD();
      }
      return true;
    }

    if (this._sumIconMetaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._sumIconTweakAssetIndex = (this._sumIconTweakAssetIndex - 1 + SummaryUiHandler.SUM_ICON_TWEAK_ASSETS.length) % SummaryUiHandler.SUM_ICON_TWEAK_ASSETS.length;
        this.updateSumIconTweakHUD();
      } else if (button === Button.RIGHT) {
        this._sumIconTweakAssetIndex = (this._sumIconTweakAssetIndex + 1) % SummaryUiHandler.SUM_ICON_TWEAK_ASSETS.length;
        this.updateSumIconTweakHUD();
      }
      return true;
    }

    const mode = SummaryUiHandler.SUM_ICON_TWEAK_MODES[this._sumIconTweakMode];
    const assetName = SummaryUiHandler.SUM_ICON_TWEAK_ASSETS[this._sumIconTweakAssetIndex];
    const target = this.getSumIconTweakTarget(this._sumIconTweakAssetIndex);
    if (!target) {
      console.log(`[SUM-ICON-TWEAK] ${assetName} target not available`);
      return true;
    }

    const step = mode === "gap" ? 0.5 : (mode === "borderRadius" ? 1 : (mode === "alpha" ? 0.05 : (mode === "position" ? 0.5 : (mode === "scale" ? 0.01 : 1))));

    if (mode === "gap") {
      const dir = (button === Button.UP || button === Button.RIGHT) ? 1 : (button === Button.DOWN || button === Button.LEFT) ? -1 : 0;
      if (dir !== 0) {
        this._sumIconRowGap = Math.max(0, this._sumIconRowGap + dir * step);
        this.layoutSummaryIconRow();
        console.log(`[SUM-ICON-TWEAK] gap adjust | gap=${this._sumIconRowGap.toFixed(1)}`);
      }
      this.updateSumIconTweakHUD();
      return true;
    }

    if (mode === "borderRadius") {
      const dir = (button === Button.UP || button === Button.RIGHT) ? 1 : (button === Button.DOWN || button === Button.LEFT) ? -1 : 0;
      if (dir !== 0) {
        if (typeof this._sumIconRowBorderRadius === "number") {
          if (button === Button.UP || button === Button.DOWN) {
            this._sumIconRowBorderRadius = Math.max(0, this._sumIconRowBorderRadius + dir * step);
          } else if (button === Button.LEFT) {
            this._sumIconRowBorderRadius = { tl: this._sumIconRowBorderRadius, tr: this._sumIconRowBorderRadius, bl: 0, br: 0 };
          } else if (button === Button.RIGHT) {
            this._sumIconRowBorderRadius = { tl: 0, tr: 0, bl: this._sumIconRowBorderRadius, br: this._sumIconRowBorderRadius };
          }
        } else {
          if (button === Button.UP) {
            this._sumIconRowBorderRadius.tl = Math.max(0, this._sumIconRowBorderRadius.tl + step);
            this._sumIconRowBorderRadius.tr = Math.max(0, this._sumIconRowBorderRadius.tr + step);
          } else if (button === Button.DOWN) {
            this._sumIconRowBorderRadius.bl = Math.max(0, this._sumIconRowBorderRadius.bl + step);
            this._sumIconRowBorderRadius.br = Math.max(0, this._sumIconRowBorderRadius.br + step);
          } else if (button === Button.LEFT) {
            this._sumIconRowBorderRadius.tl = Math.max(0, this._sumIconRowBorderRadius.tl - step);
            this._sumIconRowBorderRadius.bl = Math.max(0, this._sumIconRowBorderRadius.bl - step);
          } else if (button === Button.RIGHT) {
            this._sumIconRowBorderRadius.tr = Math.max(0, this._sumIconRowBorderRadius.tr + step);
            this._sumIconRowBorderRadius.br = Math.max(0, this._sumIconRowBorderRadius.br + step);
          }
        }
        this.layoutSummaryIconRow();
        const r = this._sumIconRowBorderRadius;
        const rStr = typeof r === "number" ? r.toFixed(0) : `tl=${r.tl} tr=${r.tr} bl=${r.bl} br=${r.br}`;
        console.log(`[SUM-ICON-TWEAK] borderRadius adjust | ${rStr}`);
      }
      this.updateSumIconTweakHUD();
      return true;
    }

    if (assetName === "IconRowBg" && (mode === "width" || mode === "height")) {
      const dir = (button === Button.UP || button === Button.RIGHT) ? 1
                : (button === Button.DOWN || button === Button.LEFT) ? -1 : 0;
      if (dir !== 0) {
        if (mode === "width") this._sumIconRowBgWidthPad += dir;
        else this._sumIconRowBgHeight += dir;
        this.layoutSummaryIconRow();
        console.log(`[SUM-ICON-TWEAK] IconRowBg ${mode} adjust | widthPad=${this._sumIconRowBgWidthPad} height=${this._sumIconRowBgHeight}`);
      }
      this.updateSumIconTweakHUD();
      return true;
    }

    switch (button) {
      case Button.UP:
        this.applySumIconTweak(target, mode, mode === "position" ? -step : step, assetName);
        break;
      case Button.DOWN:
        this.applySumIconTweak(target, mode, mode === "position" ? step : -step, assetName);
        break;
      case Button.LEFT:
        if (mode === "position") this.applySumIconTweak(target, "positionX", -step, assetName);
        else if (mode === "scale") this.applySumIconTweak(target, "scaleX", -step, assetName);
        else if (mode === "width") this.applySumIconTweak(target, "width", -1, assetName);
        else if (mode === "height") this.applySumIconTweak(target, "height", -1, assetName);
        break;
      case Button.RIGHT:
        if (mode === "position") this.applySumIconTweak(target, "positionX", step, assetName);
        else if (mode === "scale") this.applySumIconTweak(target, "scaleX", step, assetName);
        else if (mode === "width") this.applySumIconTweak(target, "width", 1, assetName);
        else if (mode === "height") this.applySumIconTweak(target, "height", 1, assetName);
        break;
      default:
        return true;
    }

    this.syncSumIconTweakDelta(assetName, target);
    this.mirrorSumIconBothAdjust(assetName, button, mode, step);
    this.logSumIconTweakState(assetName, target, `${mode} adjust`);
    this.updateSumIconTweakHUD();
    return true;
  }

  private mirrorSumIconBothAdjust(assetName: string, button: Button, mode: string, step: number): void {
    let secondaryName: string | null = null;
    let secondary: Phaser.GameObjects.GameObject | null = null;
    if (assetName === "SoulBoth") {
      secondaryName = "SoulText";
      secondary = this.rankText;
    } else if (assetName === "GlitchBoth") {
      secondaryName = "GlitchItemIcon";
      secondary = this.summaryGlitchItemIcon;
    } else if (assetName === "FusionBoth") {
      secondaryName = "FusionSpeciesIcon";
      secondary = this.summaryFusionSpeciesIcon;
    } else if (assetName === "ShinyBoth") {
      secondaryName = "FusionShinyIcon";
      secondary = this.fusionShinyIcon;
    }
    if (!secondary || !secondaryName) return;

    switch (button) {
      case Button.UP:
        this.applySumIconTweak(secondary, mode, mode === "position" ? -step : step, secondaryName);
        break;
      case Button.DOWN:
        this.applySumIconTweak(secondary, mode, mode === "position" ? step : -step, secondaryName);
        break;
      case Button.LEFT:
        if (mode === "position") this.applySumIconTweak(secondary, "positionX", -step, secondaryName);
        else if (mode === "scale") this.applySumIconTweak(secondary, "scaleX", -step, secondaryName);
        else if (mode === "width") this.applySumIconTweak(secondary, "width", -1, secondaryName);
        else if (mode === "height") this.applySumIconTweak(secondary, "height", -1, secondaryName);
        break;
      case Button.RIGHT:
        if (mode === "position") this.applySumIconTweak(secondary, "positionX", step, secondaryName);
        else if (mode === "scale") this.applySumIconTweak(secondary, "scaleX", step, secondaryName);
        else if (mode === "width") this.applySumIconTweak(secondary, "width", 1, secondaryName);
        else if (mode === "height") this.applySumIconTweak(secondary, "height", 1, secondaryName);
        break;
    }
    this.syncSumIconTweakDelta(secondaryName, secondary);
  }

  private applySumIconTweak(target: Phaser.GameObjects.GameObject, mode: string, delta: number, _assetName: string): void {
    switch (mode) {
      case "scale":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          target.setScale(Math.max(0.01, (target.scaleX ?? 1) + delta), Math.max(0.01, (target.scaleY ?? 1) + delta));
        }
        break;
      case "scaleX":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          target.scaleX = Math.max(0.01, (target.scaleX ?? 1) + delta);
        }
        break;
      case "position":
        target.y = (target.y ?? 0) + delta;
        break;
      case "positionX":
        target.x = (target.x ?? 0) + delta;
        break;
      case "width":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          const newW = Math.max(1, target.displayWidth + delta);
          target.setDisplaySize(newW, target.displayHeight);
        }
        break;
      case "height":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          const newH = Math.max(1, target.displayHeight + delta);
          target.setDisplaySize(target.displayWidth, newH);
        }
        break;
      case "alpha":
        target.alpha = Math.max(0, Math.min(1, (target.alpha ?? 1) + delta));
        break;
    }
  }

  private logSumIconTweakState(assetName: string, target: Phaser.GameObjects.GameObject, action: string): void {
    const x = target.x ?? 0;
    const y = target.y ?? 0;
    const sx = target.scaleX ?? 1;
    const sy = target.scaleY ?? 1;
    const a = target.alpha ?? 1;
    const fs = target instanceof Phaser.GameObjects.Text ? parseInt(target.style.fontSize as string, 10) || 0 : 0;
    const dw = (target as Phaser.GameObjects.Image).displayWidth ?? 0;
    const dh = (target as Phaser.GameObjects.Image).displayHeight ?? 0;
    const zi = (target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0;
    const baseline = this._sumIconTweakBaselines.get(assetName);
    if (baseline) {
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const dzi = zi - baseline.listIndex;
      console.log(`[SUM-ICON-TWEAK] ${action} | asset=${assetName}\n  current: x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi}${dw ? ` w=${dw.toFixed(1)} h=${dh.toFixed(1)}` : ""}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfs ? ` ΔfontSize=${dfs >= 0 ? "+" : ""}${dfs}` : ""} ΔzOrder=${dzi >= 0 ? "+" : ""}${dzi}${ddw ? ` Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)}` : ""}`);
    } else {
      console.log(`[SUM-ICON-TWEAK] ${action} | asset=${assetName} | x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} alpha=${a.toFixed(2)} zOrder=${zi}`);
    }
  }

  private updateSumIconTweakHUD(): void {
    if (!this._sumIconTweakHudText) return;
    if (this._sumIconMetaMode === TweakMetaMode.NONE) {
      this._sumIconTweakHudText.setVisible(false);
      return;
    }
    const modeName = SummaryUiHandler.SUM_ICON_TWEAK_MODES[this._sumIconTweakMode].toUpperCase();
    const assetName = SummaryUiHandler.SUM_ICON_TWEAK_ASSETS[this._sumIconTweakAssetIndex];
    const { text, color } = formatMetaHud(this._sumIconMetaMode, modeName, assetName);
    this._sumIconTweakHudText.setText(text);
    this._sumIconTweakHudText.setColor(color);
    this._sumIconTweakHudText.setVisible(true);
  }

  private outputAllSumIconTweakStates(): void {
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];

    for (let i = 0; i < SummaryUiHandler.SUM_ICON_TWEAK_ASSETS.length; i++) {
      const name = SummaryUiHandler.SUM_ICON_TWEAK_ASSETS[i];
      const t = this.getSumIconTweakTarget(i);
      if (!t) { unavailable.push(name); continue; }
      const baseline = this._sumIconTweakBaselines.get(name);
      if (!baseline) { unavailable.push(name); continue; }

      const x = t.x ?? 0;
      const y = t.y ?? 0;
      const sx = t.scaleX ?? 1;
      const sy = t.scaleY ?? 1;
      const a = t.alpha ?? 1;
      const fs = t instanceof Phaser.GameObjects.Text ? parseInt(t.style.fontSize as string, 10) || 0 : 0;
      const dw = (t as Phaser.GameObjects.Image).displayWidth ?? 0;
      const dh = (t as Phaser.GameObjects.Image).displayHeight ?? 0;
      const zi = (t.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(t) ?? 0;
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const dzi = zi - baseline.listIndex;

      const isChanged = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001
        || Math.abs(da) > 0.001 || Math.abs(dfs) > 0.001 || Math.abs(ddw) > 0.001 || Math.abs(ddh) > 0.001 || Math.abs(dzi) > 0;
      if (isChanged) {
        let block = `${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)} zOrder=${baseline.listIndex}`;
        if (baseline.fontSize) block += ` fontSize=${baseline.fontSize}`;
        if (baseline.displayWidth) block += ` w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)}`;
        if (name === "IconRowBg") block += ` widthPad=-16.0 height=12.0`;
        block += `\n  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)} ΔzOrder=${dzi >= 0 ? "+" : ""}${dzi}`;
        if (dfs) block += ` ΔfontSize=${dfs >= 0 ? "+" : ""}${dfs}`;
        if (ddw) block += ` Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)}`;
        if (name === "IconRowBg") {
          const dwp = this._sumIconRowBgWidthPad - (-16);
          const dhg = this._sumIconRowBgHeight - 12;
          block += ` ΔwidthPad=${dwp >= 0 ? "+" : ""}${dwp.toFixed(1)} Δheight=${dhg >= 0 ? "+" : ""}${dhg.toFixed(1)}`;
        }
        block += `\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi}`;
        if (fs) block += ` fontSize=${fs}`;
        if (dw) block += ` w=${dw.toFixed(1)} h=${dh.toFixed(1)}`;
        if (name === "IconRow") block += ` gap=${this._sumIconRowGap.toFixed(1)}`;
        if (name === "IconRowBg") {
          const r = this._sumIconRowBorderRadius;
          block += typeof r === "number" ? ` borderRadius=${r.toFixed(0)}` : ` borderRadius=tl:${r.tl} tr:${r.tr} bl:${r.bl} br:${r.br}`;
          block += ` widthPad=${this._sumIconRowBgWidthPad.toFixed(1)} height=${this._sumIconRowBgHeight.toFixed(1)}`;
        }
        changed.push(block);
      } else {
        if (name === "IconRow" && Math.abs(this._sumIconRowGap - 0) > 0.001) {
          let block = `${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)} zOrder=${baseline.listIndex} gap=0.0`;
          block += `\n  CHANGE:   Δgap=${(this._sumIconRowGap - 0) >= 0 ? "+" : ""}${(this._sumIconRowGap - 0).toFixed(1)}`;
          block += `\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi} gap=${this._sumIconRowGap.toFixed(1)}`;
          changed.push(block);
        } else if (name === "IconRowBg") {
          const r = this._sumIconRowBorderRadius;
          const defaultR = 0;
          const hasRChange = typeof r === "number" ? Math.abs(r - defaultR) > 0.001 : true;
          const hasWHChange = Math.abs(this._sumIconRowBgWidthPad - (-16)) > 0.001 || Math.abs(this._sumIconRowBgHeight - 12) > 0.001;
          if (hasRChange || hasWHChange) {
            let block = `${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)} zOrder=${baseline.listIndex} borderRadius=${defaultR} widthPad=-16.0 height=12.0`;
            let changeParts: string[] = [];
            if (hasRChange) {
              const rStr = typeof r === "number" ? (r - defaultR).toFixed(0) : `per-corner`;
              changeParts.push(`ΔborderRadius=${rStr}`);
            }
            if (hasWHChange) {
              const dwp = this._sumIconRowBgWidthPad - (-16);
              const dhg = this._sumIconRowBgHeight - 12;
              changeParts.push(`ΔwidthPad=${dwp >= 0 ? "+" : ""}${dwp.toFixed(1)} Δheight=${dhg >= 0 ? "+" : ""}${dhg.toFixed(1)}`);
            }
            block += `\n  CHANGE:   ${changeParts.join(" ")}`;
            block += `\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi}`;
            block += typeof r === "number" ? ` borderRadius=${r.toFixed(0)}` : ` borderRadius=tl:${r.tl} tr:${r.tr} bl:${r.bl} br:${r.br}`;
            block += ` widthPad=${this._sumIconRowBgWidthPad.toFixed(1)} height=${this._sumIconRowBgHeight.toFixed(1)}`;
            changed.push(block);
          } else {
            unchanged.push(name);
          }
        } else {
          unchanged.push(name);
        }
      }
    }

    const sections: string[] = ["[SUM-ICON-TWEAK-SNAPSHOT]", "NOTE: CHANGE values are deltas for code adjustments."];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) sections.push(`\n── UNCHANGED ── ${unchanged.join(", ")}`);
    if (unavailable.length > 0) sections.push(`\n── UNAVAILABLE ── ${unavailable.join(", ")}`);

    const snapshot = sections.join("\n");
    console.log(snapshot);
    tweakCopyToClipboard(snapshot);
  }

  private getGlitchFormChangeItem(pokemon: PlayerPokemon): FormChangeItem | null {
    const changes = pokemonFormChanges[pokemon.species.speciesId] || [];
    for (const fc of changes) {
      if (isGlitchFormKey(fc.formKey)) {
        const trigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
        if (trigger) {
          return trigger.item;
        }
      }
    }
    return null;
  }

  private getSmitemFrame(item: FormChangeItem): string {
    const GLITCH_ICON_OVERRIDES: Record<string, string> = {
      "GLITCHI_GLITCHI_FRUIT": "glitchFruit",
      "GLITCH_MASTER_PARTS": "glitchParts"
    };
    const enumName = FormChangeItem[item];
    if (GLITCH_ICON_OVERRIDES[enumName]) {
      return GLITCH_ICON_OVERRIDES[enumName];
    }
    return enumName.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }

  getSelectedMove(): Move | null {
    if (this.cursor !== Page.MOVES) {
      return null;
    }

    if (this.moveCursor < 4 && this.pokemon && this.moveCursor < this.pokemon.moveset.length) {
      return this.pokemon.moveset[this.moveCursor]!.getMove();
    } else if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.moveCursor === 4) {
      return this.newMove;
    }
    return null;
  }

  private wireMoveRowHitZone(rowIndex: integer): void {
    const isExtraRow = rowIndex === 4;
    const parent = isExtraRow ? this.extraMoveRowContainer : this.moveRowsContainer;
    const zone = this.scene.add.zone(95, isExtraRow ? 0 : 16 * rowIndex, 195, 16);
    zone.setOrigin(0.5, 1);
    zone.setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      if (this.transitioning || this.cursor !== Page.MOVES || !this.moveSelect) return;
      if (this.moveCursor !== rowIndex) this.setCursor(rowIndex);
    });

    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer) || this.transitioning || this.cursor !== Page.MOVES) return;

      if (!this.moveSelect) {
        this.showMoveSelect();
        this.setCursor(rowIndex);
        return;
      }

      if (this.selectedMoveIndex > -1 && this.selectedMoveIndex !== rowIndex && rowIndex < 4) {
        this.moveCursor = rowIndex;
        this.setCursor(rowIndex);
        this.processInput(Button.ACTION);
      } else {
        this.setCursor(rowIndex);
        this.processInput(Button.ACTION);
      }
    });

    parent.add(zone);
    parent.sendToBack(zone);
  }

  showMoveSelect() {
    this.moveSelect = true;
    this.extraMoveRowContainer.setVisible(true);
    this.selectedMoveIndex = -1;
    this.setCursor(0);
    this.showMoveEffect();
  }

  hideMoveSelect() {
    if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
      this.moveSelectFunction && this.moveSelectFunction(4);
      return;
    }

    this.moveSelect = false;
    this.extraMoveRowContainer.setVisible(false);
    this.moveDescriptionText.setText("");

    this.destroyBlinkCursor();
    this.hideMoveEffect();
  }

  destroyBlinkCursor() {
    if (this.moveCursorBlinkTimer) {
      this.moveCursorBlinkTimer.destroy();
      this.moveCursorBlinkTimer = null;
    }
    if (this.moveCursorObj) {
      this.moveCursorObj.destroy();
      this.moveCursorObj = null;
    }
    if (this.selectedMoveCursorObj) {
      this.selectedMoveCursorObj.destroy();
      this.selectedMoveCursorObj = null;
    }
  }

  showMoveEffect(instant?: boolean) {
    if (this.moveEffectsVisible) {
      return;
    }
    this.moveEffectsVisible = true;
    this.scene.tweens.add({
      targets: this.moveEffectContainer,
      x: 6,
      duration: instant ? 0 : 250,
      ease: "Sine.easeOut"
    });
  }

  hideMoveEffect(instant?: boolean) {
    if (!this.moveEffectsVisible) {
      return;
    }
    this.moveEffectsVisible = false;
    this.scene.tweens.add({
      targets: this.moveEffectContainer,
      x: 106,
      duration: instant ? 0 : 250,
      ease: "Sine.easeIn"
    });
  }

  clear() {
    this.deactivateSumIconTweak();
    this._spriteTweak?.clear();
    this._summaryPattern?.clear();
    this._summaryPattern = undefined;
    this.portalSprite?.setVisible(false);

    super.clear();
    this.pokemon = null;
    this.cursor = -1;
    this.newMove = null;
    this.moveRowContainers = [];
    if (this.moveSelect) {
      this.moveSelect = false;
      this.moveSelectFunction = null;
      this.extraMoveRowContainer.setVisible(false);
      if (this.moveCursorBlinkTimer) {
        this.moveCursorBlinkTimer.destroy();
        this.moveCursorBlinkTimer = null;
      }
      if (this.moveCursorObj) {
        this.moveCursorObj.destroy();
        this.moveCursorObj = null;
      }
      if (this.selectedMoveCursorObj) {
        this.selectedMoveCursorObj.destroy();
        this.selectedMoveCursorObj = null;
      }
      this.hideMoveEffect(true);
    }
    this.summaryContainer.setVisible(false);
    this.summaryPageContainer.setVisible(false);
  }
}