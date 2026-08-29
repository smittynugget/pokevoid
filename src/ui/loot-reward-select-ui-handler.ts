import BattleScene from "../battle-scene";
import ModifierSelectUiHandler, { ModifierOption } from "./modifier-select-ui-handler";
import {
  ModifierTypeOption,
  AddPokemonModifierType,
  TypeSwitcherModifierType,
  AbilitySwitcherModifierType,
  RandomStatSwitcherModifierType,
  TmModifierType,
  AnyTmModifierType,
  AnyAbilityModifierType,
  AnyPassiveAbilityModifierType,
  PermaPartyAbilityModifierType,
  MoveUpgradeModifierType,
  PokemonNatureChangeModifierType,
  MoveSacrificeModifierType,
  EvolutionItemModifierType,
  FormChangeItemModifierType,
  ForbiddenFormUnlockModifierType,
  StatSacrificeModifierType,
  FusePokemonModifierType,
  PokemonBaseStatBoosterModifierType,
  ChampionPokemonStatBoosterModifierType,
  TempBattleStatBoosterModifierType,
  DoubleBattleChanceBoosterModifierType,
  GlitchPieceModifierType,
  AttackTypeBoosterModifierType,
  TerastallizeModifierType,
  TrainerBondAbilityModifierType,
  TypeSacrificeModifierType,
  AbilitySacrificeModifierType,
  PassiveAbilitySacrificeModifierType,
  PlayerPokemonBaseStatBoosterModifierType,
  BerryModifierType,
} from "../modifier/modifier-type";
import { addTextObject, addBBCodeTextObject, TextStyle, getTextColor } from "./text";
import { Button } from "../enums/buttons";
import { TweakMetaMode, cycleMetaMode, TWEAK_META_CYCLE, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";

import { Type } from "../data/type";
import { getStatName, Stat } from "../data/pokemon-stat";
import { getNatureName, getNatureStatMultiplier, Nature } from "../data/nature";
import { allAbilities } from "../data/ability";
import { allMoves } from "../data/move";
import Overrides from "../overrides";
import { Mode } from "./mode";
import i18next from "i18next";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";
import { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";
import * as Utils from "../utils";
import { adjustDuelmonIconScale } from "../data/pokemon-species";
import { isPrimaryPointer } from "./pointer-utils";
import { getBerryStatLabel } from "../data/berry";
import { ChampionUtils } from "../system/champion-utils";
import { pokemonEvolutions } from "../data/pokemon-evolutions";
import { getPokemonSpecies } from "../data/pokemon-species";
import { ModifierTier } from "../modifier/modifier-tier";
import { playCondenseTrailTransition, getEffectCount, CondenseTrailHandle } from "../field/condense-trail-transition";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";

function ensureTintedModifierBg(scene: Phaser.Scene, tint: number): string {
  const key = `__tinted_modifier_bg_${tint.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get("modifier_ui_handler_bg").getSourceImage() as HTMLImageElement;
  const w = src.naturalWidth, h = src.naturalHeight;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `#${tint.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  tex.refresh();
  return key;
}

const MS_TWEAK_MODES = ["scale", "position", "width", "height", "alpha", "fontSize", "textStyle", "textStyleOn"];

const MS_TWEAK_ASSETS = [
  "0hint-perma-unfocus", "0hint-perma-focus",
  "0hint-collect-focus", "0hint-collect-unfocus",
  "0hint-collect-essenceicon&txt-focus", "0hint-collect-essenceicon&txt-unfocus",
  "ShopItems", "ShopIcons", "ShopLabel", "ShopOverlay",
  "Title", "Subtitle", "TitleBlock",
  "OptionContainer", "OptionsContainerAndBG", "OptionNameText", "OptionSecondaryText", "OptionIcon",
  "OptionFocusedFrame", "OptionUnfocusedFrame", "AllCardFrames",
  "BottomBar", "RerollButton", "PermaRerollButton",
  "TransferButton", "CheckTeamButton", "LockRaritiesButton",
  "BottomRowFrames", "BottomRowLabels", "BottomRowCosts", "BottomRowTexts",
  "RerollText", "RerollCost", "PermaRerollText", "PermaRerollCost",
  "LockRaritiesText", "TransferText", "CheckTeamText",
  "TooltipPos", "GridRowSpacing",
  "CursorOnOption", "CursorOnShop", "CursorOnBottomRow",
  "RerollBtnImage", "PermaRerollBtnImage", "LockRaritiesBtnImage", "TransferBtnImage", "CheckTeamBtnImage",
  "MoneyText", "OmegaMoneyText",
  "ShopItemName", "ShopItemPrice",
  "MoneyAndOmegaText", "ShopItemNameAndPrice",
  "EssenceCostIcon", "EssenceCostText", "EssenceTotalLabel", "EssenceTotalText", "EssenceTotalIcon",
  "EssenceTotalText&Icon", "EssenceRow",
  "PermaItemCost",
  "ShowDetailsHint",
  "0-details-line-focus", "0-details-line-unfocus",
];

const MS_TWEAK_ASSET_GROUPS: Record<string, string[]> = {
  "0HintDebug": [
    "0hint-perma-unfocus", "0hint-perma-focus",
    "0hint-collect-focus", "0hint-collect-unfocus",
    "0hint-collect-essenceicon&txt-focus", "0hint-collect-essenceicon&txt-unfocus",
  ],
  "ShopStrip": ["ShopItems", "ShopIcons", "ShopLabel", "ShopOverlay"],
  "TitleBlock": ["Title", "Subtitle", "TitleBlock"],
  "OptionCards": [
    "OptionContainer", "OptionsContainerAndBG", "OptionNameText",
    "OptionSecondaryText", "OptionIcon", "OptionFocusedFrame",
    "OptionUnfocusedFrame", "AllCardFrames",
  ],
  "BottomButtons": [
    "BottomBar", "RerollButton", "PermaRerollButton",
    "TransferButton", "CheckTeamButton", "LockRaritiesButton",
    "BottomRowFrames", "BottomRowLabels", "BottomRowCosts", "BottomRowTexts",
  ],
  "BtnImages": [
    "RerollBtnImage", "PermaRerollBtnImage", "LockRaritiesBtnImage",
    "TransferBtnImage", "CheckTeamBtnImage",
  ],
  "RerollDetails": ["RerollText", "RerollCost", "PermaRerollText", "PermaRerollCost"],
  "ButtonLabels": ["LockRaritiesText", "TransferText", "CheckTeamText"],
  "Cursors": ["CursorOnOption", "CursorOnShop", "CursorOnBottomRow"],
  "MoneyDisplay": ["MoneyAndOmegaText", "MoneyText", "OmegaMoneyText"],
  "ShopItemDetails": ["ShopItemNameAndPrice", "ShopItemName", "ShopItemPrice"],
  "EssenceDisplay": ["EssenceCostIcon", "EssenceCostText", "EssenceTotalLabel", "EssenceTotalText", "EssenceTotalIcon", "EssenceTotalText&Icon", "EssenceRow"],
  "PermaCost": ["PermaItemCost"],
  "0DetailsLine": ["0-details-line-focus", "0-details-line-unfocus"],
};

export default class LootRewardSelectUiHandler extends ModifierSelectUiHandler {
  readonly isLootRewardHandler = true;
  protected storedUIMode: Mode = Mode.LOOT_REWARD_SELECT;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private static _smitomQuestNodeDebugShown = false;
  private static _smitomShinyPowerDebugShown = false;
  private static _smitomRankUpDebugShown = false;
  private static _smitomYuMoveDebugShown = false;
  private static _smitomAltBuildDebugShown = false;
  private static _smitomMoveUpgradesDebugShown = false;
  private static _smitomIntrashopDebugShown = false;

  protected shopStripContainer: Phaser.GameObjects.Container | null = null;
  protected shopStripBg: Phaser.GameObjects.Graphics | null = null;
  protected shopStripLabel: Phaser.GameObjects.Text | null = null;
  protected shopStripOverlay: Phaser.GameObjects.Graphics | null = null;
  protected shopStripIconsContainer: Phaser.GameObjects.Container | null = null;
  protected shopStripIcons: Phaser.GameObjects.Sprite[] = [];
  protected shopStripPriceTexts: Phaser.GameObjects.Text[] = [];
  protected shopStripNameTexts: Phaser.GameObjects.Text[] = [];
  private shopStripFocused: boolean = false;
  private _clickFocusedIndex: number = -1;
  private _clickFocusedShopIndex: number = -1;
  public _isMouseHoverPreview: boolean = false;
  private _hoverOnFocusedOption: boolean = false;
  private _lastKeyboardFocusedIndex: number = -1;
  private _hoverActive: boolean = false;
  private shopStripSlotCount: number = 0;
  private shopStripRealCount: number = 0;
  private _lootRevealTimers: Phaser.Time.TimerEvent[] = [];
  private _pageAnimTimers: Phaser.Time.TimerEvent[] = [];
  private _shimmerVfx: Phaser.GameObjects.GameObject[] = [];

  protected moneyText: Phaser.GameObjects.Text | null = null;
  protected omegaMoneyText: Phaser.GameObjects.Text | null = null;

  private cardFrames: Map<ModifierOption, Phaser.GameObjects.Image> = new Map();
  private cardSecondaryTexts: Map<ModifierOption, Phaser.GameObjects.Text> = new Map();

  private buttonFrames: Phaser.GameObjects.Image[] = [];

  private _msTweakMetaMode: TweakMetaMode = TweakMetaMode.NONE;
  get _msTweakActive(): boolean { return this._msTweakMetaMode !== TweakMetaMode.NONE; }
  private _msTweakMode: number = 0;
  private _msTweakAssetIndex: number = 0;
  private _msTweakBaselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; alpha: number }> = new Map();
  private _msTweakHudText: Phaser.GameObjects.Text | null = null;
  private _msTweakKeyOneHandler: (() => void) | null = null;
  private _msTweakKeyTwoHandler: (() => void) | null = null;
  private _msTweakKeyThreeHandler: (() => void) | null = null;
  private _msTweakKeyVHandler: (() => void) | null = null;
  private _msTweakKeyHHandler: ((event?: KeyboardEvent) => void) | null = null;
  private _msTweakListenersRegistered: boolean = false;
  private _cursorTweaks: Record<string, { scale: number; offsetX: number; offsetY: number; alpha: number }> = {
    option: { scale: 0.95, offsetX: -30, offsetY: 4.5, alpha: 1 },
    shop: { scale: 1, offsetX: -6, offsetY: 0, alpha: 1 },
    bottom: { scale: 0.8, offsetX: -4, offsetY: 1.5, alpha: 1 },
  };
  private _cursorTweakBaselines: Map<string, { scale: number; offsetX: number; offsetY: number; alpha: number }> = new Map();
  private _dropdownPanel: TweakDropdownPanel | null = null;

  protected pageIndex: number = 0;
  protected windowStart: number = 0;
  protected maxPerPage: number = 5;
  protected totalPages: number = 1;
  protected _scrollAnimating: boolean = false;
  protected _lootAnimating: boolean = false;
  protected _suppressNextTooltip: boolean = false;
  private _trailHandle: CondenseTrailHandle | null = null;
  private _condensePlayedThisSession: boolean = false;
  protected leftArrow: Phaser.GameObjects.Image | null = null;
  protected rightArrow: Phaser.GameObjects.Image | null = null;
  protected pageLabel: Phaser.GameObjects.Text | null = null;
  protected allTypeOptions: ModifierTypeOption[] = [];
  protected displayConfig: any = null;

  constructor(scene: BattleScene) {
    super(scene);
  }

  protected isPaginationEnabled(): boolean {
    return true;
  }

  protected isPaginationLayoutActive(): boolean {
    return this.isPaginationEnabled() && this.allTypeOptions.length > this.maxPerPage;
  }

  protected getPaginationLayoutMetrics(): { cardW: number; gap: number; leftMargin: number; rightMargin: number; optionScale: number; frameW: number; frameH: number } {
    if (!this.isPaginationLayoutActive()) {
      return { cardW: 72, gap: 8, leftMargin: 6, rightMargin: 6, optionScale: 1.0, frameW: 67, frameH: 83 };
    }
    const paginatedCardW = 56;
    const frameScale = paginatedCardW / 72;
    return {
      cardW: paginatedCardW,
      gap: 4,
      leftMargin: 22,
      rightMargin: 22,
      optionScale: frameScale,
      frameW: Math.round(67 * frameScale),
      frameH: Math.round(83 * frameScale),
    };
  }

  protected getVisibleOptions(typeOptions: ModifierTypeOption[]): ModifierTypeOption[] {
    if (!this.isPaginationEnabled() || typeOptions.length <= this.maxPerPage) {
      return typeOptions;
    }
    const start = this.windowStart;
    const end = Math.min(start + this.maxPerPage, typeOptions.length);
    return typeOptions.slice(start, end);
  }

  setup(): void {
    super.setup();

    if (this.scene.textures.exists("modifier_ui_handler_bg")) {
      this.bgImage = this.scene.add.image(0, -this.scene.game.canvas.height / 6, "modifier_ui_handler_bg");
      this.bgImage.setOrigin(0, 0);
      this.bgImage.setDisplaySize(this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6);
      this.bgImage.setAlpha(0);
      this.bgImage.setDepth(-1);
      this.modifierContainer.addAt(this.bgImage, 0);
    }

    this.setupShopStrip();
    this.setupButtonFrames();

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.setupMsTweakHud();
    }
  }

  private static readonly SHOP_STRIP_H = 11;
  private static readonly SHOP_STRIP_OVERLAY_ALPHA = 0.35;

  private static readonly SHOP_UNAFFORDABLE_COLOR = "#ff4444";
  private static readonly SHOP_UNAFFORDABLE_TINT = 0xff4444;
  private static readonly SHOP_FREE_COLOR = "#00e060";
  private static readonly SHOP_FREE_TINT = 0x00e060;
  private _shopStripOverlayW: number | null = null;
  private _shopStripOverlayH: number | null = null;

  protected setupShopStrip(): void {
    const screenW = this.scene.game.canvas.width / 6;
    const stripH = LootRewardSelectUiHandler.SHOP_STRIP_H;
    const stripY = -(this.scene.game.canvas.height / 6) + 1.5;

    this.shopStripContainer = this.scene.add.container(0, stripY);
    this.shopStripContainer.setVisible(false);
    this.modifierContainer.add(this.shopStripContainer);

    this.shopStripBg = this.scene.add.graphics();
    this.shopStripContainer.add(this.shopStripBg);

    this.shopStripLabel = addTextObject(this.scene, 3.5, 6, i18next.t("modifierSelectUiHandler:shopLabel"), TextStyle.PERFECT_IV, { fontSize: "41px" });
    this.shopStripLabel.setOrigin(0, 0.5);
    this.shopStripLabel.setStroke("#424242", 14);
    this.shopStripLabel.setDepth(11);
    this.shopStripContainer.add(this.shopStripLabel);

    this.shopStripIconsContainer = this.scene.add.container(-10.5, 0.5);
    this.shopStripContainer.add(this.shopStripIconsContainer);

    this.shopStripOverlay = this.scene.add.graphics();
    this.shopStripOverlay.setAlpha(LootRewardSelectUiHandler.SHOP_STRIP_OVERLAY_ALPHA);
    this.shopStripOverlay.setY(1.5);
    this.shopStripContainer.add(this.shopStripOverlay);

    this.moneyText = addTextObject(this.scene, screenW - 5, stripH + 2, "", TextStyle.PARTY, { fontSize: "36px" });
    this.moneyText.setOrigin(1, 0);
    this.moneyText.setStroke("#424242", 14);
    this.moneyText.setShadow(0, 0, undefined);
    this.shopStripContainer.add(this.moneyText);

    this.omegaMoneyText = addTextObject(this.scene, screenW - 5, stripH + 9, "", TextStyle.PERFECT_IV, { fontSize: "36px" });
    this.omegaMoneyText.setOrigin(1, 0);
    this.omegaMoneyText.setStroke("#424242", 14);
    this.omegaMoneyText.setShadow(0, 0, undefined);
    this.shopStripContainer.add(this.omegaMoneyText);

    this.redrawShopStripGraphics();
  }

  protected redrawShopStripGraphics(): void {
    const screenW = this.scene.game.canvas.width / 6;
    const stripH = LootRewardSelectUiHandler.SHOP_STRIP_H;

    if (this.shopStripBg) {
      this.shopStripBg.clear();
      this.shopStripBg.fillStyle(0x000000, 0.0);
      this.shopStripBg.fillRect(0, 0, screenW, stripH);
    }

    if (this.shopStripOverlay) {
      this.shopStripOverlay.clear();
      this.shopStripOverlay.setPosition(0, 1.5);
      this.shopStripOverlay.fillStyle(0x000000, 1);
      this.shopStripOverlay.fillRect(0, 0, this._shopStripOverlayW ?? screenW, this._shopStripOverlayH ?? stripH);
    }
  }

  private static readonly BAR_Y = -8;
  private static readonly BAR_LEFT_MARGIN = 8.5;
  private static readonly BAR_RIGHT_MARGIN = 4;
  private static readonly REROLL_SLOT_W = 56;
  private static readonly RIGHT_BTN_GAP = 8;
  private static readonly CHECK_BTN_LOGICAL_W = 12;

  private layoutBottomBar(): void {
    const barY = LootRewardSelectUiHandler.BAR_Y;
    const LEFT_MARGIN = LootRewardSelectUiHandler.BAR_LEFT_MARGIN;
    const RIGHT_MARGIN = LootRewardSelectUiHandler.BAR_RIGHT_MARGIN;
    const screenW = this.scene.game.canvas.width / 6;

    if (this.rerollButtonContainer) {
      this.rerollButtonContainer.setPosition(LEFT_MARGIN, barY);
    }

    if (this.permaRerollButtonContainer) {
      this.permaRerollButtonContainer.setPosition(LEFT_MARGIN + LootRewardSelectUiHandler.REROLL_SLOT_W, barY);
    }

    if (this.lockRarityButtonContainer) {
      this.lockRarityButtonContainer.setPosition(LEFT_MARGIN, barY - 10);
    }

    if (this.checkButtonContainer) {
      this.checkButtonContainer.setPosition(screenW - 45.5, barY);
    }

    if (this.transferButtonContainer) {
      this.transferButtonContainer.setPosition(screenW - 22, barY);
    }

    for (const label of this.getButtonLabels()) {
      if (label.name === "text-use-btn") {
        label.setPosition(31.5, -1);
      } else if (label.name === "text-transfer-btn") {
        label.setPosition(-28, -1);
      } else {
        label.setPosition(6, -1.5);
      }
    }

    if (this.rerollCostText) {
      const rerollLabel = this.rerollButtonContainer?.getByName("text-reroll-btn") as Phaser.GameObjects.Text;
      if (rerollLabel) {
        this.rerollCostText.setPositionRelative(rerollLabel, rerollLabel.displayWidth + 1.5, 1);
      }
    }

    if (this.permaRerollCostText) {
      const permaLabel = this.permaRerollButtonContainer?.list?.find((c: any) => c !== this.permaRerollCostText && c.type === "Text") as Phaser.GameObjects.Text;
      if (permaLabel) {
        this.permaRerollCostText.setPositionRelative(permaLabel, permaLabel.displayWidth + 1.5, 1);
      }
    }
  }

  private setupButtonFrames(): void {
    const buttonContainers = [
      this.rerollButtonContainer,
      this.permaRerollButtonContainer,
      this.lockRarityButtonContainer,
      this.transferButtonContainer,
      this.checkButtonContainer,
    ];

    for (let i = 0; i < buttonContainers.length; i++) {
      const container = buttonContainers[i];
      if (container && this.scene.textures.exists("modifier_handler_btn_option")) {
        const frame = this.scene.add.image(0, 0, "modifier_handler_btn_option");
        const isTransfer = i === 3;
        const isCheckTeam = i === 4;
        frame.setDisplaySize(isCheckTeam ? 39.88 : 59.88, 13.986);
        frame.setOrigin(0, 0);
        frame.setPosition(isTransfer ? -82 : -2, -3.5);
        frame.setAlpha(0.85);
        container.addAt(frame, 0);
        this.buttonFrames.push(frame);
      }
    }
  }

  private setupMsTweakHud(): void {
    this._msTweakHudText = addTextObject(
      this.scene,
      this.scene.game.canvas.width / 12,
      -(this.scene.game.canvas.height / 6) + 2,
      "",
      TextStyle.PARTY,
      { fontSize: "28px" }
    );
    this._msTweakHudText.setOrigin(0.5, 0);
    this._msTweakHudText.setColor("#00ff00");
    this._msTweakHudText.setDepth(2000);
    this._msTweakHudText.setVisible(false);
    this.modifierContainer.add(this._msTweakHudText);
  }

  show(args: any[]): boolean {
    if (args.length >= 6) {
      const displayConfig = args[5] as any;
      if (displayConfig && !displayConfig.title) {
        displayConfig.title = i18next.t("modifierSelectUiHandler:lootRewardsTitle");
        displayConfig.subtitle = displayConfig.subtitle || i18next.t("modifierSelectUiHandler:lootRewardsSubtitle");
      }
      if (displayConfig && displayConfig.customShopStrip !== false) {
        displayConfig.customShopStrip = true;
      }
    } else if (args.length === 5) {
      args.push({
        title: i18next.t("modifierSelectUiHandler:lootRewardsTitle"),
        subtitle: i18next.t("modifierSelectUiHandler:lootRewardsSubtitle"),
        customShopStrip: true,
      });
    }

    this.displayConfig = args[5] || null;

    const typeOptionsForTierCheck = args[1] instanceof Array ? args[1] : [];
    const isDefaultTitle = this.displayConfig?.title === i18next.t("modifierSelectUiHandler:lootRewardsTitle");
    if (this.displayConfig && isDefaultTitle && this.hasHighTierInTypeOptions(typeOptionsForTierCheck)) {
      this.displayConfig.title = i18next.t("modifierSelectUiHandler:forbiddenTreasuresTitle");
      this.displayConfig.subtitle = i18next.t("modifierSelectUiHandler:forbiddenTreasuresSubtitle");
    }

    if (this.displayConfig?.hideShop) {
      this.scene.modifierTooltipsEnabled = true;
    }
    const isReshowWhileActive = this.active && args.length >= 3;

    if (this.isPaginationEnabled() && args[1] instanceof Array && args[1].length > this.maxPerPage) {
      if (!isReshowWhileActive) {
        this.allTypeOptions = [...args[1]];
        this.totalPages = Math.ceil(this.allTypeOptions.length / this.maxPerPage);
        this.pageIndex = 0;
        this.windowStart = 0;
      }
      const originalCallback = args[2] as (rowCursor: number, cursor: number) => boolean;
      args[1] = this.getVisibleOptions(this.allTypeOptions);
      args[2] = (rowCursor: number, cursor: number) => {
        if (rowCursor === 1 && this.allTypeOptions.length > this.maxPerPage) {
          const absoluteCursor = this.windowStart + cursor;
          return originalCallback(rowCursor, absoluteCursor);
        }
        return originalCallback(rowCursor, cursor);
      };
    } else if (!isReshowWhileActive) {
      this.allTypeOptions = args[1] instanceof Array ? [...args[1]] : [];
      this.totalPages = 1;
      this.pageIndex = 0;
      this.windowStart = 0;
    }

    const result = super.show(args);

    if (this._interactivesDisabledForOverlay) {
      this.enableShopInteractives();
    }

    if (result) {
      this.modifierContainer?.setVisible(true);
      this._clickFocusedIndex = -1;
      this._clickFocusedShopIndex = -1;
      (this.scene as BattleScene).ui.setReplayHudSuppressed(true);
      if (this.cursorObj) {
        this.cursorObj.setVisible(false);
      }

      const showMetrics = this.getPaginationLayoutMetrics();
      for (const option of this.options) {
        option.setScale(showMetrics.optionScale);
        const optAny = option as any;
        if (optAny.itemText) {
          optAny.itemText.y = 20;
          optAny.itemText.x = -0.5;
          optAny.itemText.setFontSize(41);
          if (option.modifierTypeOption?.type instanceof MoveUpgradeModifierType) {
            const moveId = (option.modifierTypeOption.type as any).moveId;
            if (moveId !== undefined && allMoves[moveId]) {
              optAny.itemText.setText(allMoves[moveId].name);
            }
          }
          if (option.modifierTypeOption?.type instanceof PermaPartyAbilityModifierType) {
            const abilityId = (option.modifierTypeOption.type as any).ability?.id;
            if (abilityId !== undefined && allAbilities[abilityId]) {
              optAny.itemText.setText(allAbilities[abilityId].name);
            }
          }
        }
        if (optAny.itemCostText && !(option as any).showCost) {
          optAny.itemCostText.setVisible(false);
        }
        if (optAny.item) {
          const isFusionCard = optAny.modifierTypeOption?.type instanceof AddPokemonModifierType
            && (() => { try { const p = (optAny.modifierTypeOption.type as AddPokemonModifierType).getPokemon(); return p?.isFusion?.() && !!p.fusionSpecies; } catch { return false; } })();
          optAny.item.setPosition(-1.5, isFusionCard ? -25.5 : -5.5);
          optAny.item.setScale((optAny.item.scaleX || 1) + 0.06, (optAny.item.scaleY || 1) + 0.06);
        }
        if (optAny.itemTint) {
          optAny.itemTint.setPosition(-2.5, -9);
          optAny.itemTint.setScale((optAny.itemTint.scaleX || 1) + 0.06, (optAny.itemTint.scaleY || 1) + 0.06);
        }
      }

      if (this.bgImage) {
        this.scene.tweens.killTweensOf(this.bgImage);
        const useAltBgEarly = this.displayConfig?.isRankUp
          || this.displayConfig?.isYuMovePhase
          || this.displayConfig?.isBounty
          || this.displayConfig?.isAltBuild;
        if (useAltBgEarly) {
          this.bgImage.setTint((this.displayConfig?.isAltBuild || this.displayConfig?.isBounty) ? 0xBB88FF : 0xFF8888);
        } else {
          this.bgImage.clearTint();
        }
        if (this.bgImage.visible && this.bgImage.alpha > 0.9) {
          this.bgImage.setAlpha(1);
        } else {
          this.bgImage.setAlpha(0);
          this.bgImage.setVisible(true);
          this.scene.tweens.add({
            targets: this.bgImage,
            alpha: 1,
            duration: 750,
            ease: "Sine.easeOut",
          });
        }
      }

      if (this.patternOverlay) {
        this.scene.tweens.killTweensOf(this.patternOverlay);
        this.patternOverlay.setVisible(false);
      }

      this.populateShopStrip();
      this.updateLootMoneyDisplay();
      this.addCardFrames();

      const sceneMoneyText = (this.scene as any).moneyText;
      if (sceneMoneyText) {
        sceneMoneyText.setVisible(false);
      }

      const biomeWaveText = (this.scene as any).biomeWaveText;
      if (biomeWaveText) {
        biomeWaveText.setVisible(false);
      }
      if (this.buttonFrames.length === 0) {
        this.setupButtonFrames();
      }
      this.layoutBottomBar();

      if (this.totalPages > 1 && this.isPaginationEnabled()) {
        this.createPaginationArrows();
      }

      if (this._shopRevealTimer) { this._shopRevealTimer.remove(); this._shopRevealTimer = null; }
      if (this._buttonRevealTimer) { this._buttonRevealTimer.remove(); this._buttonRevealTimer = null; }
      if (this._optionRevealTween) { this._optionRevealTween.stop(); this._optionRevealTween = null; }

      for (const opt of this.options) {
        this.scene.tweens.killTweensOf(opt);
        const optAny = opt as any;
        if (optAny.pb && optAny.pb.active) {
          this.scene.tweens.killTweensOf(optAny.pb);
          optAny.pb.setPosition(0, -60);
          optAny.pb.setScale(1);
        }
        if (optAny.pbTint && optAny.pbTint.active) {
          this.scene.tweens.killTweensOf(optAny.pbTint);
          optAny.pbTint.setPosition(0, -60);
          optAny.pbTint.setScale(1);
        }
        if (optAny.itemContainer) {
          this.scene.tweens.killTweensOf(optAny.itemContainer);
        }
      }

      for (const opt of this.options) {
        const o = opt as any;
        if (o.pb?.active) o.pb.setAlpha(0);
        if (o.pbTint?.active) o.pbTint.setVisible(false);
        if (o.itemTint?.active) o.itemTint.setAlpha(0);
        if (o.itemContainer) o.itemContainer.setAlpha(0);
        if (o.itemText) o.itemText.setAlpha(0);
        if (o.itemCostText) o.itemCostText.setAlpha(0);
      }
      for (const [, frame] of this.cardFrames) {
        frame.setAlpha(0);
      }
      for (const [, text] of this.cardSecondaryTexts) {
        text.setAlpha(0);
        text.setVisible(false);
      }

      this._lootAnimating = true;
      this._lootRevealTimers = [];

      const isHighTierLoot = this.hasHighTierInTypeOptions(this.allTypeOptions);

      const scheduleEmberReveal = () => {
        const LEAD_IN = isHighTierLoot ? 250 : 1000;
        const LOOT_TOTAL_MS = 4500 + LEAD_IN;
        const SEQ_END = 0.85;
        const n = Math.max(1, this.options.length);
        const slotMs = (LOOT_TOTAL_MS - LEAD_IN) * SEQ_END / n;
        const seqEndMs = LEAD_IN + slotMs * n;
        const lootGs = (this.scene as BattleScene).gameSpeed;
        const emberMs = (ms: number) => ModifierOption.emberCompensatedMs(ms, lootGs);

        for (let i = 0; i < this.options.length; i++) {
          const opt = this.options[i];
          const cardFrame = this.cardFrames.get(opt);
          this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(Math.floor(LEAD_IN + slotMs * i)), () => {
            if (!opt.active) return;
            opt.showEmberMaterialize(Math.floor(slotMs), i);
            const cardRevealDelay = Math.min(375, Math.floor(slotMs * 0.6));
            if (cardFrame && cardFrame.active) {
              cardFrame.setAlpha(0);
              this.scene.time.delayedCall(emberMs(cardRevealDelay), () => {
                if (!cardFrame.active) return;
                cardFrame.setAlpha(0.75);
              });
            }
            const secondary = this.cardSecondaryTexts.get(opt);
            if (secondary?.active && this.shouldShowCardSecondaryText()) {
              this.scene.time.delayedCall(emberMs(cardRevealDelay), () => {
                if (!secondary.active) return;
                secondary.setVisible(true);
                secondary.setAlpha(0.75);
              });
            }
          }));
        }

        if ((this.scene as BattleScene).animationLoadMode >= 2) {
        const shimmerTailMs = LOOT_TOTAL_MS * (1 - SEQ_END);
        const shimmerStaggerMs = shimmerTailMs * 0.08;
        const shimmerSweepMs = shimmerTailMs * 0.5;
        this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(Math.floor(seqEndMs)), () => {
          for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const cardFrame = this.cardFrames.get(opt);
            if (!cardFrame?.active) continue;

            const cw = cardFrame.displayWidth;
            const ch = cardFrame.displayHeight;
            const halfW = cw / 2;

            this.scene.time.delayedCall(emberMs(Math.floor(shimmerStaggerMs * i)), () => {
              if (!opt.active || !cardFrame.active) return;

              const maskGfx = this.scene.make.graphics({});
              maskGfx.fillStyle(0xffffff);
              maskGfx.fillRect(cardFrame.x - halfW, cardFrame.y - ch / 2, cw, ch);
              const clipMask = maskGfx.createGeometryMask();

              const shimmer = this.scene.add.graphics();
              shimmer.fillStyle(0xFFFFFF, 0.25);
              shimmer.fillRect(-1, -ch / 2, 2, ch);
              shimmer.setPosition(cardFrame.x - halfW, cardFrame.y);
              shimmer.setMask(clipMask);
              this.modifierContainer.add(shimmer);
              this._shimmerVfx.push(shimmer);
              this._shimmerVfx.push(maskGfx as any);

              this.scene.tweens.add({
                targets: shimmer,
                x: cardFrame.x + halfW,
                alpha: { from: 0.25, to: 0 },
                duration: emberMs(Math.floor(shimmerSweepMs)),
                ease: "Sine.easeInOut",
                onComplete: () => {
                  shimmer.clearMask(true);
                  shimmer.destroy();
                  maskGfx.destroy();
                  const si = this._shimmerVfx.indexOf(shimmer);
                  if (si >= 0) this._shimmerVfx.splice(si, 1);
                  const mi = this._shimmerVfx.indexOf(maskGfx as any);
                  if (mi >= 0) this._shimmerVfx.splice(mi, 1);
                }
              });
            });
          }
        }));
        }

        this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(LOOT_TOTAL_MS), () => {
          for (const opt of this.options) {
            if (!opt.active) continue;
            if (!opt.isRevealed()) {
              opt.forceReveal();
            }
          }

          this._lootAnimating = false;

          this._suppressNextTooltip = true;
          this.firstFocusPending = true;
          this.setRowCursor(1);
          this.setCursor(0);
          this._suppressNextTooltip = false;

          if (this.options.length > 1 && !(this.scene as BattleScene).gameData?.tutorialOnboardActive) {
            const firstOption = this.options[this.cursor];
            if (firstOption && (this as any).showDetailsHintContainer) {
              (this as any).updateShowDetailsHint(firstOption, true);
            }
          }

          if (this.displayConfig?.isBounty) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomQuestNodeDebugShown) {
              LootRewardSelectUiHandler._smitomQuestNodeDebugShown = true;
              flags["skill_tree_quest_node"] = false;
            }
            if (!flags["skill_tree_quest_node"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "skill_tree_quest_node",
                title: i18next.t("tutorial:smitomTip.skillTreeQuestNode.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.skillTreeQuestNode.1"),
                  i18next.t("tutorial:smitomTip.skillTreeQuestNode.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["skill_tree_quest_node"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          } else if (this.displayConfig?.isShinyPower) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomShinyPowerDebugShown) {
              LootRewardSelectUiHandler._smitomShinyPowerDebugShown = true;
              flags["shiny_power"] = false;
            }
            if (!flags["shiny_power"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "shiny_power",
                title: i18next.t("tutorial:smitomTip.shinyPower.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.shinyPower.1"),
                  i18next.t("tutorial:smitomTip.shinyPower.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["shiny_power"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          } else if (this.displayConfig?.isRankUp) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomRankUpDebugShown) {
              LootRewardSelectUiHandler._smitomRankUpDebugShown = true;
              flags["rank_up"] = false;
            }
            if (!flags["rank_up"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "rank_up",
                title: i18next.t("tutorial:smitomTip.rankUp.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.rankUp.1"),
                  i18next.t("tutorial:smitomTip.rankUp.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["rank_up"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          }
          if (this.displayConfig?.isYuMovePhase) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomYuMoveDebugShown) {
              LootRewardSelectUiHandler._smitomYuMoveDebugShown = true;
              flags["yu_move_phase"] = false;
            }
            if (!flags["yu_move_phase"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "yu_move_phase",
                title: i18next.t("tutorial:smitomTip.yuMovePhase.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.yuMovePhase.1"),
                  i18next.t("tutorial:smitomTip.yuMovePhase.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["yu_move_phase"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          }
          if (this.displayConfig?.isAltBuild) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomAltBuildDebugShown) {
              LootRewardSelectUiHandler._smitomAltBuildDebugShown = true;
              flags["alt_build"] = false;
            }
            if (!flags["alt_build"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "alt_build",
                title: i18next.t("tutorial:smitomTip.altBuild.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.altBuild.1"),
                  i18next.t("tutorial:smitomTip.altBuild.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["alt_build"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          }
          if (this.displayConfig?.isMoveUpgrades) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomMoveUpgradesDebugShown) {
              LootRewardSelectUiHandler._smitomMoveUpgradesDebugShown = true;
              flags["move_upgrades"] = false;
            }
            if (!flags["move_upgrades"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "move_upgrades",
                title: i18next.t("tutorial:smitomTip.moveUpgrades.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.moveUpgrades.1"),
                  i18next.t("tutorial:smitomTip.moveUpgrades.2"),
                  i18next.t("tutorial:smitomTip.moveUpgrades.3"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["move_upgrades"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          }
          if (this.displayConfig?.isIntrashop) {
            const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
            if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomIntrashopDebugShown) {
              LootRewardSelectUiHandler._smitomIntrashopDebugShown = true;
              flags["intrashop"] = false;
            }
            if (!flags["intrashop"]) {
              const tipConfig: SmitomTipConfig = {
                tutorialKey: "intrashop",
                title: i18next.t("tutorial:smitomTip.intrashop.title"),
                texts: [
                  i18next.t("tutorial:smitomTip.intrashop.1"),
                  i18next.t("tutorial:smitomTip.intrashop.2"),
                ],
                offerReplay: true,
                onComplete: () => {
                  (this.scene as BattleScene).gameData.smitomTutorialFlags["intrashop"] = true;
                  (this.scene as BattleScene).gameData.saveSystem();
                  this.setCursor(this.cursor);
                }
              };
              this.unfocusAllCardFrames();
              if (this.cursorObj) this.cursorObj.setVisible(false);
              (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            }
          }
        }));
      };

      if ((this.scene as BattleScene).animationLoadMode >= 2 && this.meetsCondenseTrailTier(this.allTypeOptions) && !this._condensePlayedThisSession && !(this.scene as BattleScene).reroll) {
        this._condensePlayedThisSession = true;

        const skipBlackTitle = this.displayConfig?.isRankUp
          || this.displayConfig?.isYuMovePhase
          || this.displayConfig?.isBounty
          || this.displayConfig?.isAltBuild;
        if (!skipBlackTitle) {
          if (this.headerTitleText) {
            this.headerTitleText.setColor("#000000");
          }
          if (this.headerSubtitleText) {
            this.headerSubtitleText.setColor("#000000");
          }
        }

        if (this.headerDisplayContainer) {
          this.scene.tweens.killTweensOf(this.headerDisplayContainer);
          this.headerDisplayContainer.setAlpha(0);
        }

        this._lootRevealTimers.push(this.scene.time.delayedCall(400, () => {
          if (this._trailHandle) {
            this._trailHandle.release();
            this._trailHandle = null;
          }
          const useAltBg = this.displayConfig?.isRankUp
            || this.displayConfig?.isYuMovePhase
            || this.displayConfig?.isBounty
            || this.displayConfig?.isAltBuild;
          if (this.bgImage) {
            this.scene.tweens.killTweensOf(this.bgImage);
            if (useAltBg && this.scene.textures.exists("modifier_ui_handler_bg")) {
              this.bgImage.setTexture("modifier_ui_handler_bg");
              this.bgImage.setDisplaySize(
                this.scene.game.canvas.width / 6,
                this.scene.game.canvas.height / 6
              );
              this.bgImage.setTint((this.displayConfig?.isAltBuild || this.displayConfig?.isBounty) ? 0xBB88FF : 0xFF8888);
              this.bgImage.setAlpha(1);
            } else if (this.scene.textures.exists("level_up")) {
              this.bgImage.setTexture("level_up");
              this.bgImage.setDisplaySize(
                this.scene.game.canvas.width / 6,
                this.scene.game.canvas.height / 6
              );
              this.bgImage.setAlpha(1);
            }
          }

          this.suspendForOverlay();

          const tintValue = (this.displayConfig?.isAltBuild || this.displayConfig?.isBounty) ? 0xBB88FF : 0xFF8888;
          const bgKey = useAltBg
            ? ensureTintedModifierBg(this.scene, tintValue)
            : "level_up";
          const effectId = Math.floor(Math.random() * getEffectCount());
          const handle = playCondenseTrailTransition(this.scene, effectId, 1400, "modifier_ui_handler_bg", { bgTextureKey: bgKey, skipPostCondense: true });
          this._trailHandle = handle;

          const doSpeedUp = (pointer?: Phaser.Input.Pointer) => {
            if (pointer && pointer.button !== 0) return;
            handle.speedUp(9);
            this.scene.input.off("pointerdown", doSpeedUp);
            (this.scene as any).inputController?.events.off("input_down", doSpeedUp);
          };
          this.scene.input.on("pointerdown", doSpeedUp);
          (this.scene as any).inputController?.events.on("input_down", doSpeedUp);

          handle.animationDone.then(() => {
            if (this._trailHandle !== handle) return;
            this.scene.input.off("pointerdown", doSpeedUp);
            (this.scene as any).inputController?.events.off("input_down", doSpeedUp);
            this._trailHandle = null;
            handle.release();
            if (useAltBg) {
              const tintKey = `__tinted_modifier_bg_${tintValue.toString(16)}`;
              if (this.scene.textures.exists(tintKey)) {
                this.scene.textures.remove(tintKey);
              }
            }
            if (!this.active) return;
            this.resumeFromOverlay();
            if (this.bgImage) {
              this.bgImage.setAlpha(1);
              this.bgImage.setVisible(true);
            }
            if (this.headerDisplayContainer) {
              this.headerDisplayContainer.setAlpha(0);
              this.headerDisplayContainer.setVisible(true);
              this.scene.tweens.add({
                targets: this.headerDisplayContainer,
                alpha: 1,
                duration: 500,
                ease: "Sine.easeIn",
              });
            }
            scheduleEmberReveal();
          });
        }));
      } else {
        scheduleEmberReveal();
      }

      const hideShop = !!this.displayConfig?.hideShop;
      const checkTeamOnly = !!this.displayConfig?.checkTeamOnly;

      if (hideShop && !checkTeamOnly) {
        this.rerollButtonContainer.setVisible(false);
        this.rerollButtonContainer.setAlpha(0);
        this.permaRerollButtonContainer.setVisible(false);
        this.permaRerollButtonContainer.setAlpha(0);
        this.checkButtonContainer.setVisible(false);
        this.checkButtonContainer.setAlpha(0);
        this.lockRarityButtonContainer.setVisible(false);
        this.lockRarityButtonContainer.setAlpha(0);
        if (this.transferButtonContainer) {
          this.transferButtonContainer.setVisible(false);
          this.transferButtonContainer.setAlpha(0);
        }
      } else if (hideShop && checkTeamOnly) {
        this.rerollButtonContainer.setVisible(false);
        this.rerollButtonContainer.setAlpha(0);
        this.permaRerollButtonContainer.setVisible(false);
        this.permaRerollButtonContainer.setAlpha(0);
        this.checkButtonContainer.setVisible(true);
        this.checkButtonContainer.setAlpha(1);
        this.lockRarityButtonContainer.setVisible(false);
        this.lockRarityButtonContainer.setAlpha(0);
        if (this.transferButtonContainer) {
          this.transferButtonContainer.setVisible(false);
          this.transferButtonContainer.setAlpha(0);
        }
      } else {
        this.rerollButtonContainer.setVisible(true);
        this.rerollButtonContainer.setAlpha(1);
        this.permaRerollButtonContainer.setVisible(true);
        this.permaRerollButtonContainer.setAlpha(1);
        this.checkButtonContainer.setVisible(true);
        this.checkButtonContainer.setAlpha(1);
        this.lockRarityButtonContainer.setVisible(false);
        this.lockRarityButtonContainer.setAlpha(0);
        if (this.transferButtonContainer && !this.scene.gameData?.tutorialOnboardActive) {
          this.transferButtonContainer.setVisible(true);
          this.transferButtonContainer.setAlpha(1);
        }
      }

      if (args.length >= 3) {
        this.awaitingActionInput = true;
        this.onActionInput = args[2];
      }

      if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
        this.setupMsTweakKeyListeners();
      }

      for (let m = 0; m < this.options.length; m++) {
        const opt = this.options[m];
        const cardFrame = this.cardFrames.get(opt);
        const frameW = cardFrame?.displayWidth ?? 67;
        const frameH = cardFrame?.displayHeight ?? 83;
        const frameOffsetY = cardFrame ? (cardFrame.y - opt.y) : 4;
        const pad = 4;
        const hitX = -(frameW / 2) - pad;
        const hitY = frameOffsetY - (frameH / 2) - pad;
        const hitW = frameW + pad * 2;
        const hitH = frameH + pad * 2;
        opt.setInteractive(new Phaser.Geom.Rectangle(hitX, hitY, hitW, hitH), Phaser.Geom.Rectangle.Contains);
        opt.on("pointerover", () => {
          if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
          if (this._lootAnimating) return;
          this.tooltipDeferredUntilUserInput = false;
          if (this.firstFocusPending) {
            this.firstFocusPending = false;
          }
          this._hoverActive = true;
          this._isMouseHoverPreview = true;
          this._hoverOnFocusedOption = (this.rowCursor === 1 && this._lastKeyboardFocusedIndex === m);
          if (this.rowCursor !== 1) this.setRowCursor(1);
          this.setCursor(m);
          this._isMouseHoverPreview = false;
          this._hoverOnFocusedOption = false;
          this.applyCursorFromConfig();
          if (this.cursorObj) this.cursorObj.setVisible(true);
        });
        opt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
          if (this._lootAnimating) return;
          if (!isPrimaryPointer(pointer)) return;
          if (this.rowCursor !== 1) {
            this.setRowCursor(1);
            this.setCursor(m);
            this._clickFocusedIndex = m;
          } else if (this._clickFocusedIndex !== m) {
            this.setCursor(m);
            this._clickFocusedIndex = m;
          } else {
            this.processInput(Button.ACTION);
          }
        });
        opt.on("pointerout", () => {
          this._hoverActive = false;
          this.hideUpgradeTooltip();
          this.moveInfoOverlay.clear();
          (this as any).updateShowDetailsHint(null, false);
        });
      }

      this.wireShopStripPointerHandlers();

      const bottomBtnContainers: Array<{ c: Phaser.GameObjects.Container | null; key: string }> = [
        { c: this.rerollButtonContainer, key: "Reroll" },
        { c: this.permaRerollButtonContainer, key: "PermaReroll" },
        { c: this.transferButtonContainer, key: "Transfer" },
        { c: this.checkButtonContainer, key: "Check" },
        { c: this.lockRarityButtonContainer, key: "LockRarity" },
      ];
      let layoutIdx = 0;
      for (const entry of bottomBtnContainers) {
        const container = entry.c;
        if (container?.visible) {
          const cursorIdx = layoutIdx++;
          const frame = container.list?.[0] as Phaser.GameObjects.Image | undefined;
          const pad = 2;
          let hitTarget: Phaser.GameObjects.GameObject;
          if (entry.key === "Check" || entry.key === "Transfer") {
            const textName = entry.key === "Check" ? "text-use-btn" : "text-transfer-btn";
            const textChild = container.getByName(textName) as Phaser.GameObjects.Text | null;

            const frameLeft = frame ? frame.x - frame.displayWidth * frame.originX : -4;
            const frameRight = frame ? frameLeft + frame.displayWidth : 60;
            const frameTop = frame ? frame.y - frame.displayHeight * frame.originY : -5.5;
            const frameBottom = frame ? frameTop + frame.displayHeight : 8;

            const textLeft = textChild ? textChild.x - textChild.displayWidth * textChild.originX : frameLeft;
            const textRight = textChild ? textChild.x + textChild.displayWidth * (1 - textChild.originX) : frameRight;
            const textTop = textChild ? textChild.y : frameTop;
            const textBottom = textChild ? textChild.y + (textChild.displayHeight || 12) : frameBottom;

            const unionLeft = Math.min(frameLeft, textLeft) - pad;
            const unionTop = Math.min(frameTop, textTop) - pad;
            const unionRight = Math.max(frameRight, textRight) + pad;
            const unionBottom = Math.max(frameBottom, textBottom) + pad;

            const existingZone = container.getByName("btn-hit-zone");
            if (existingZone) container.remove(existingZone, true);

            const hitZone = this.scene.add.zone(unionLeft, unionTop, unionRight - unionLeft, unionBottom - unionTop);
            hitZone.setName("btn-hit-zone");
            hitZone.setOrigin(0, 0);
            hitZone.setInteractive({ useHandCursor: true });
            container.add(hitZone);
            container.disableInteractive();
            hitTarget = hitZone;
          } else {
            let hitRect: Phaser.Geom.Rectangle;
            if (frame && frame.displayWidth > 0) {
              hitRect = new Phaser.Geom.Rectangle(
                frame.x - frame.displayWidth * frame.originX - pad,
                frame.y - frame.displayHeight * frame.originY - pad,
                frame.displayWidth + pad * 2,
                frame.displayHeight + pad * 2
              );
            } else {
              hitRect = new Phaser.Geom.Rectangle(-4, -5.5, 64, 18);
            }
            container.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
            hitTarget = container;
          }
          hitTarget.on("pointerover", () => {
            if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
            if (this._lootAnimating) return;
            this._isMouseHoverPreview = true;
            if (this.rowCursor !== 0) this.setRowCursor(0);
            this.setCursor(cursorIdx);
            this._isMouseHoverPreview = false;
            this.applyCursorFromConfig();
            if (this.cursorObj) {
              if (this.cursorObj.parentContainer === this.modifierContainer) {
                this.modifierContainer.remove(this.cursorObj, false);
                this.scene.ui.add(this.cursorObj);
              }
              this.cursorObj.setDepth(50);
              this.scene.ui.bringToTop(this.cursorObj);
              this.cursorObj.setVisible(true);
            }
          });
          hitTarget.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
            if (this._lootAnimating) return;
            if (!isPrimaryPointer(pointer)) return;
            const layout = this.getButtonLayout();
            const liveIdx = layout.findIndex(btn => btn.descKey === `modifierSelectUiHandler:${entry.key === "Check" ? "checkTeamDesc" : entry.key === "Transfer" ? "transferDesc" : entry.key === "Reroll" ? "rerollDesc" : entry.key === "PermaReroll" ? "permaRerollDesc" : "lockRaritiesDesc"}`);
            const resolvedIdx = liveIdx >= 0 ? liveIdx : cursorIdx;
            if (this.rowCursor !== 0) {
              this.setRowCursor(0);
              this.setCursor(resolvedIdx);
            } else if (this.cursor !== resolvedIdx) {
              this.setCursor(resolvedIdx);
            } else {
              this.processInput(Button.ACTION);
            }
          });
          hitTarget.on("pointerout", () => {
            this.hideUpgradeTooltip();
          });
        }
      }
    }

    return result;
  }

  protected showHeaderDisplay(title: string, subtitle?: string): void {
    if (!this.headerDisplayContainer) {
      const headerY = -(this.scene as BattleScene).game.canvas.height / 6 + 22.5;
      this.headerDisplayContainer = this.scene.add.container(0, headerY);
      this.modifierContainer.add(this.headerDisplayContainer);

      const centerX = (this.scene as BattleScene).game.canvas.width / 12;

      this.headerTitleText = addTextObject(this.scene, centerX, 9.5, "", TextStyle.SUMMARY_GOLD, { fontSize: "120px" });
      this.headerTitleText!.setOrigin(0.5, 0.5);
      this.headerTitleText!.setShadow(0, 0, "#FFFFFF", 8, true, true);
      this.headerTitleText!.setColor("#E8E8E8");
      this.headerDisplayContainer.add(this.headerTitleText!);

      this.headerSubtitleText = addBBCodeTextObject(this.scene, centerX, 24, "", TextStyle.WINDOW, { fontSize: "47px" }) as any;
      this.headerSubtitleText!.setOrigin(0.5, 0.5);
      this.headerSubtitleText!.setAlpha(0.85);
      this.headerDisplayContainer.add(this.headerSubtitleText!);
    }

    if (!this._condensePlayedThisSession) {
      if (this.headerTitleText) {
        this.headerTitleText.setFontFamily("emerald");
        this.headerTitleText.setShadow(0, 0, "#FFFFFF", 8, true, true);
        this.headerTitleText.setStroke("", 0);
        this.headerTitleText.setColor("#E8E8E8");
      }
      if (this.headerSubtitleText) {
        (this.headerSubtitleText as any).setFontFamily?.("emerald");
        this.headerSubtitleText.setShadow(3, 3, "#6b5a73");
        this.headerSubtitleText.setStroke("", 0);
        this.headerSubtitleText.setColor("#f8f8f8");
      }
    }

    this.headerTitleText!.setText(title);
    this.headerSubtitleText!.setText(subtitle || "");
    if (this.headerShinyIcon) {
      this.headerShinyIcon.setVisible(false);
    }
    this.headerDisplayContainer.setVisible(true);
    this.scene.tweens.killTweensOf(this.headerDisplayContainer);
    if (this.headerDisplayContainer.alpha >= 0.95) {
      this.headerDisplayContainer.setAlpha(1);
      return;
    }
    this.headerDisplayContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.headerDisplayContainer,
      alpha: 1,
      duration: 500,
      ease: "Sine.easeIn",
    });
  }

  protected getShopLayout(): { rows: number, itemsPerRow: number } {
    return { rows: 1, itemsPerRow: 9999 };
  }

  protected populateShopStrip(): void {
    if (!this.shopStripContainer) return;

    for (const icon of this.shopStripIcons) icon.destroy();
    for (const txt of this.shopStripPriceTexts) txt.destroy();
    for (const txt of this.shopStripNameTexts) txt.destroy();
    this.shopStripIcons = [];
    this.shopStripPriceTexts = [];
    this.shopStripNameTexts = [];

    this.redrawShopStripGraphics();

    const allShopOptions = this.shopOptionsRows.flat();
    if (allShopOptions.length === 0) {
      this.shopStripRealCount = 0;
      this.shopStripSlotCount = 0;
      this.shopStripContainer.setVisible(false);
      return;
    }

    const stripH = LootRewardSelectUiHandler.SHOP_STRIP_H;
    const labelWidth = 28;
    const iconStartX = labelWidth;
    const usableWidth = (this.scene.game.canvas.width / 6) - labelWidth - 4;
    const targetSpacing = 18;
    const maxSlots = Math.floor(usableWidth / targetSpacing);
    const realCount = allShopOptions.length;
    this.shopStripRealCount = realCount;
    const slotCount = (this.scene as BattleScene).shopNoDuplicates ? realCount : Math.max(realCount, maxSlots);
    this.shopStripSlotCount = slotCount;
    let spacing = usableWidth / slotCount;
    if ((this.scene as BattleScene).shopNoDuplicates && realCount <= 8) {
      spacing *= 0.7;
    }
    const effectiveStartX = (this.scene as BattleScene).shopNoDuplicates
      ? (usableWidth - (realCount * spacing)) / 2 + labelWidth
      : iconStartX;

    for (let vi = 0; vi < slotCount; vi++) {
      const shopIndex = vi % realCount;
      const isReal = (this.scene as BattleScene).shopNoDuplicates ? true : (vi < realCount);
      const opt = allShopOptions[shopIndex];
      const x = effectiveStartX + spacing * vi + spacing / 2;
      const type = opt.modifierTypeOption.type;

      let iconSprite: Phaser.GameObjects.Sprite;
      let iconScale = 0.45;
      if (type instanceof AddPokemonModifierType) {
        try {
          const pokemon = (type as AddPokemonModifierType).getPokemon();
          iconSprite = this.scene.add.sprite(x, stripH / 2, pokemon.getIconAtlasKey());
          iconSprite.setFrame(pokemon.getIconId(false));
          iconScale = adjustDuelmonIconScale(0.40, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
        } catch {
          iconSprite = this.scene.add.sprite(x, stripH / 2, "items", "pb");
        }
      } else {
        const isSmitems = (type?.group === "glitch" || type?.group === "perma");
        const atlasKey = isSmitems ? "smitems" : "items";
        iconSprite = this.scene.add.sprite(x, stripH / 2, atlasKey, type?.iconImage || "pb");
        if (iconSprite.frame && iconSprite.frame.name !== (type?.iconImage || "pb") && type?.iconImage) {
          iconSprite.setFrame("pb");
        }
        if (isSmitems) {
          iconScale = 0.1953125;
        }
      }
      iconSprite.setScale(iconScale);
      if (spacing < targetSpacing) {
        const maxW = spacing * 0.85;
        if (iconSprite.displayWidth > maxW) {
          iconSprite.setScale(iconScale * (maxW / iconSprite.displayWidth));
        }
      }
      iconSprite.setAlpha(isReal ? 1.0 : 0.5);
      iconSprite.setData("isGhost", !isReal);
      const itemCost = opt.modifierTypeOption.cost || 0;
      const canAffordItem = itemCost === 0 || this.scene.money >= itemCost;
      if (!canAffordItem) {
        iconSprite.setTint(LootRewardSelectUiHandler.SHOP_UNAFFORDABLE_TINT);
      } else if (itemCost === 0) {
        iconSprite.setTint(LootRewardSelectUiHandler.SHOP_FREE_TINT);
      }
      if (this.shopStripIconsContainer) {
        this.shopStripIconsContainer.add(iconSprite);
      } else {
        this.shopStripContainer.add(iconSprite);
      }
      this.shopStripIcons.push(iconSprite);

      const iconContainerOffsetX = this.shopStripIconsContainer?.x ?? 0;
      const iconContainerOffsetY = this.shopStripIconsContainer?.y ?? 0;
      const iconRightEdge = x + (iconSprite.displayWidth / 2) + 1;
      const textBaseX = iconRightEdge + iconContainerOffsetX - 1.5;
      const priceText = addTextObject(
        this.scene,
        textBaseX,
        stripH - 6,
        "",
        TextStyle.MONEY,
        { fontSize: "46px" }
      );
      priceText.setOrigin(0, 0);
      priceText.setStroke("#424242", 14);
      priceText.setShadow(0, 0, undefined);
      priceText.setVisible(false);
      priceText.setData("slotX", x);
      this.shopStripContainer.add(priceText);
      this.shopStripPriceTexts.push(priceText);

      if (opt.modifierTypeOption.cost != null) {
        const cost = opt.modifierTypeOption.cost;
        if (cost > 0) {
          const costStr = `₽${cost}`;
          priceText.setText(costStr);
          const canAfford = this.scene.money >= cost;
          priceText.setColor(canAfford ? getTextColor(TextStyle.MONEY) : LootRewardSelectUiHandler.SHOP_UNAFFORDABLE_COLOR);
        } else {
          priceText.setText(i18next.t("modifierSelectUiHandler:shopFree"));
          priceText.setColor(LootRewardSelectUiHandler.SHOP_FREE_COLOR);
        }
      }

      const nameText = addTextObject(this.scene, textBaseX, stripH - 3.5, "", TextStyle.PARTY, { fontSize: "26px" });
      nameText.setOrigin(0, 1);
      nameText.setStroke("#424242", 14);
      nameText.setShadow(0, 0, undefined);
      nameText.setVisible(false);
      const shopType = opt.modifierTypeOption.type;
      const isDynamicType = shopType instanceof TmModifierType
        || shopType instanceof AnyTmModifierType
        || shopType instanceof BerryModifierType
        || shopType instanceof AnyAbilityModifierType
        || shopType instanceof AnyPassiveAbilityModifierType
        || shopType instanceof TypeSwitcherModifierType
        || shopType instanceof RandomStatSwitcherModifierType
        || shopType instanceof PokemonNatureChangeModifierType
        || shopType instanceof StatSacrificeModifierType
        || shopType instanceof TypeSacrificeModifierType
        || shopType instanceof AbilitySacrificeModifierType;
      nameText.setData("isDynamic", isDynamicType);
      nameText.setData("defaultX", textBaseX);
      nameText.setData("defaultY", stripH - 3.5);
      nameText.setData("defaultOriginX", 0);
      nameText.setData("defaultOriginY", 1);
      const iconCenterX = x + (this.shopStripIconsContainer?.x ?? 0);
      nameText.setData("centeredX", iconCenterX);
      nameText.setData("centeredY", stripH - 4);
      if ((this.scene as BattleScene).shopShowUniqueNames && isDynamicType) {
        nameText.setPosition(iconCenterX, stripH - 4);
        nameText.setOrigin(0.5, 0);
        nameText.setVisible(true);
      }
      let shopLabel = shopType?.name || "";
      if (shopType instanceof PokemonNatureChangeModifierType) {
        const delta = this.getNatureStatDelta((shopType as any).nature);
        if (delta) {
          shopLabel = i18next.t("modifierSelectUiHandler:shopMintStatDelta", {
            incStat: getStatName(delta.inc, true),
            decStat: getStatName(delta.dec, true),
            defaultValue: `+${getStatName(delta.inc, true)}/-${getStatName(delta.dec, true)}`,
          });
        }
      }
      if (shopType instanceof BerryModifierType) {
        shopLabel = getBerryStatLabel((shopType as any).berryType);
      }
      if (shopType instanceof TmModifierType) {
        shopLabel = allMoves[(shopType as TmModifierType).moveId]?.name ?? shopLabel;
      }
      if (shopType instanceof AnyTmModifierType) {
        shopLabel = allMoves[(shopType as AnyTmModifierType).moveId]?.name ?? shopLabel;
      }
      if (shopType instanceof AnyPassiveAbilityModifierType) {
        shopLabel = (shopType as AnyPassiveAbilityModifierType).ability?.name ?? shopLabel;
      }
      nameText.setText(shopLabel);
      this.shopStripContainer.add(nameText);
      this.shopStripNameTexts.push(nameText);
    }

    if (this.shopStripOverlay) {
      this.shopStripOverlay.setDepth(10);
      this.shopStripOverlay.setVisible(true);
      this.shopStripOverlay.setAlpha(LootRewardSelectUiHandler.SHOP_STRIP_OVERLAY_ALPHA);
      this.shopStripContainer.bringToTop(this.shopStripOverlay);
    }
    if (this.shopStripLabel) {
      const costs = allShopOptions.map(o => o.modifierTypeOption?.cost ?? 0);
      const anyFree = costs.some(cost => cost === 0);
      const allFree = costs.every(cost => cost === 0);
      this.shopStripLabel.setText(i18next.t(allFree
        ? "modifierSelectUiHandler:shopFree"
        : "modifierSelectUiHandler:shopLabel"));
      this.shopStripLabel.setColor(anyFree
        ? LootRewardSelectUiHandler.SHOP_FREE_COLOR
        : getTextColor(TextStyle.PERFECT_IV, false, this.scene.uiTheme));
      this.shopStripContainer.bringToTop(this.shopStripLabel);
    }

    for (const icon of this.shopStripIcons) {
      const isGhost = icon.getData("isGhost");
      icon.setAlpha(isGhost ? 0.45 : 0.6);
    }

    this.scene.tweens.killTweensOf(this.shopStripContainer);
    this.shopStripContainer.setVisible(true);
    this.shopStripContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.shopStripContainer,
      alpha: 1,
      duration: 500,
      delay: 500,
      ease: "Sine.easeIn",
    });
  }

  private wireShopStripPointerHandlers(): void {
    for (let i = 0; i < this.shopStripIcons.length; i++) {
      const icon = this.shopStripIcons[i];
      icon.setInteractive();
      icon.on("pointerover", () => {
        if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
        if (this._lootAnimating) return;
        this._hoverActive = true;
        this._isMouseHoverPreview = true;
        if (this.rowCursor < 2) this.setRowCursor(2);
        if (this.shopStripFocused) {
          this.updateShopStripSelection(i);
        }
        this.setCursor(i);
        this._isMouseHoverPreview = false;
        if (this.cursorObj && this.shopStripContainer) {
          const cfg = this._cursorTweaks.shop;
          this.cursorObj.setScale(cfg.scale);
          const worldPos = icon.getWorldTransformMatrix();
          const containerMatrix = this.modifierContainer.getWorldTransformMatrix();
          const invMatrix = containerMatrix.invert();
          const localX = invMatrix.transformPoint(worldPos.tx, worldPos.ty).x;
          const localY = invMatrix.transformPoint(worldPos.tx, worldPos.ty).y;
          this.cursorObj.setPosition(localX + cfg.offsetX, localY + cfg.offsetY);
          this.cursorObj.setVisible(true);
        }
      });
      icon.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
        if (this._lootAnimating) return;
        if (!isPrimaryPointer(pointer)) return;
        if (this.rowCursor < 2) {
          this.setRowCursor(2);
          if (!this.shopStripFocused) this.setShopStripFocused(true);
          this.setCursor(i);
          this._clickFocusedShopIndex = i;
        } else if (!this.shopStripFocused) {
          this.setShopStripFocused(true);
          this.setCursor(i);
          this._clickFocusedShopIndex = i;
        } else if (this._clickFocusedShopIndex !== i) {
          this.setCursor(i);
          this._clickFocusedShopIndex = i;
        } else {
          this.processInput(Button.ACTION);
        }
      });
      icon.on("pointerout", () => {
        this._hoverActive = false;
        this.hideUpgradeTooltip();
        this.moveInfoOverlay.clear();
        (this as any).updateShowDetailsHint(null, false);
      });
    }
  }

  protected updateLootMoneyDisplay(): void {
    if (this.moneyText) {
      const money = this.scene.money ?? 0;
      const formatted = Utils.formatMoney(this.scene.moneyFormat, money);
      this.moneyText.setText(`₽${formatted}`);
    }
    if (this.omegaMoneyText) {
      const omega = this.scene.gameData?.permaMoney ?? 0;
      const formatted = Utils.formatMoney(this.scene.moneyFormat, omega);
      this.omegaMoneyText.setText(`Ω${formatted}`);
    }
  }

  private hasHighTierInTypeOptions(typeOptions: any[]): boolean {
    return typeOptions.some(typeOption => {
      const type = typeOption?.type;
      if (!type) return false;
      if (type instanceof ForbiddenFormUnlockModifierType) {
        const data = (type as any).getTooltipData?.();
        if (data?.isSmitty || (type as any).candidate?.kind === "UNI_SMITTY") return false;
        return true;
      }
      const tier = type.tier ?? (typeof type.getOrInferTier === "function" ? type.getOrInferTier() : null);
      return tier === ModifierTier.MASTER || tier === ModifierTier.LUXURY;
    });
  }

  protected meetsCondenseTrailTier(typeOptions: any[]): boolean {
    return this.hasHighTierInTypeOptions(typeOptions);
  }

  private addCardFrames(): void {
    for (const [, frame] of this.cardFrames) frame.destroy();
    for (const [, text] of this.cardSecondaryTexts) text.destroy();
    this.cardFrames.clear();
    this.cardSecondaryTexts.clear();

    const metrics = this.getPaginationLayoutMetrics();

    for (let optIdx = 0; optIdx < this.options.length; optIdx++) {
      const option = this.options[optIdx];
      const frameKey = "modifier_option_unfocused";
      if (this.scene.textures.exists(frameKey)) {
        const frame = this.scene.add.image(0, 0, frameKey);
        frame.setDisplaySize(metrics.frameW, metrics.frameH);
        frame.setOrigin(0.5, 0.5);
        frame.setPosition(option.x, option.y + 4);
        frame.setAlpha(0);
        this.modifierContainer.addAt(frame, this.modifierContainer.getIndex(option));
        this.cardFrames.set(option, frame);
      }

      const secondaryText = this.getSecondaryDescription(option.modifierTypeOption);
      if (secondaryText) {
        const isCollectedType = this.storedUIMode === Mode.COLLECTED_TYPE_SELECT;
        const secFontSize = isCollectedType ? "35px" : "30px";
        const secY = isCollectedType ? 33.5 : 31.5;
        const text = addTextObject(this.scene, -0.5, secY, secondaryText, TextStyle.SUMMARY_GOLD, { fontSize: secFontSize });
        text.setOrigin(0.5, 0);
        text.setAlpha(0);
        text.setVisible(false);
        option.add(text);
        this.cardSecondaryTexts.set(option, text);
      }

    }
  }
  protected shouldDrawFocusChip(): boolean {
    return false;
  }

  protected getShowDetailsHintYOffset(): number {
    const count = this.options?.length ?? 0;
    const fiveOptionBump = count >= 5 ? 3.5 : 0;
    if (this._isMouseHoverPreview && !this._hoverOnFocusedOption) {
      return 24 + fiveOptionBump;
    }
    return 28 + fiveOptionBump;
  }

  protected shouldShowCardSecondaryText(): boolean {
    return true;
  }

  protected shouldPopulateMessageBar(): boolean {
    return false;
  }

  protected shouldCreateTooltipOnSetCursor(): boolean {
    if (this._suppressNextTooltip) return false;
    return super.shouldCreateTooltipOnSetCursor();
  }
  private getNatureStatDelta(nature: Nature): { inc: Stat; dec: Stat } | null {
    const stats = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const inc = stats.find(s => getNatureStatMultiplier(nature, s) > 1);
    const dec = stats.find(s => getNatureStatMultiplier(nature, s) < 1);
    return inc !== undefined && dec !== undefined ? { inc, dec } : null;
  }

  private getSecondaryDescription(typeOption: ModifierTypeOption): string {
    const type = typeOption.type;
    if (!type) return "";

    if (type.group === "rankup") {
      return "";
    }

    if (type instanceof TempBattleStatBoosterModifierType) return "";
    if (type instanceof DoubleBattleChanceBoosterModifierType) return "";

    if (type instanceof AddPokemonModifierType) {
      try {
        const pokemon = (type as AddPokemonModifierType).getPokemon();
        if (pokemon) {
          if ((pokemon as any)._shinyPowerMoveVariant) {
            return i18next.t("shinyPower:movesLabel", { defaultValue: "Custom Moves" });
          }
          const shinyAbilityId = (pokemon as any)._shinyPowerAbilityId;
          const ability = shinyAbilityId != null
            ? allAbilities[shinyAbilityId]
            : pokemon.getAbility();
          return ability?.name || "";
        }
      } catch { return ""; }
    }

    if (type instanceof PermaPartyAbilityModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryPartyAbility", { defaultValue: "Smitty Party Ability" });
    }

    if (type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType) {
      return "";
    }
    if (type instanceof AbilitySwitcherModifierType) {
      try {
        const abilityId = (type as any).abilityId ?? (type as any).ability?.id;
        if (abilityId !== undefined && allAbilities[abilityId]) {
          return allAbilities[abilityId].name;
        }
      } catch { return ""; }
    }

    if (type instanceof RandomStatSwitcherModifierType) {
      return type.name;
    }

    if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
      return "";
    }

    if (type instanceof MoveUpgradeModifierType) {
      return "";
    }

    if (type instanceof GlitchPieceModifierType) {
      try {
        const existing = this.scene.findModifier?.(m => m.constructor.name === "GlitchPieceModifier");
        const count = existing ? (existing as any).stackCount ?? 0 : 0;
        return i18next.t("modifierSelectUiHandler:secondaryGlitchPieceOwned", { count: `${count}` });
      } catch { return ""; }
    }

    if (type instanceof PokemonNatureChangeModifierType) {
      const nature = (type as any).nature;
      if (nature !== undefined) {
        const delta = this.getNatureStatDelta(nature);
        if (delta) {
          return i18next.t("modifierSelectUiHandler:secondaryNatureStatBoost", {
            incStat: getStatName(delta.inc, true),
            decStat: getStatName(delta.dec, true),
            defaultValue: `+${getStatName(delta.inc, true)} / -${getStatName(delta.dec, true)}`,
          });
        }
        return "";
      }
      return "";
    }

    if (type instanceof EvolutionItemModifierType) {
      try {
        const evoItem = (type as EvolutionItemModifierType).evolutionItem;
        const party = this.scene.getParty();
        let targetName = "";
        for (const pokemon of party) {
          const speciesId = pokemon.species.speciesId;
          if (pokemonEvolutions.hasOwnProperty(speciesId)) {
            const evo = pokemonEvolutions[speciesId].find(e => e.item === evoItem && (!e.condition || e.condition.predicate(pokemon)));
            if (evo) {
              const targetSpecies = getPokemonSpecies(evo.speciesId);
              targetName = targetSpecies?.name || "";
              break;
            }
          }
          if (!targetName && pokemon.isFusion() && pokemon.fusionSpecies) {
            const fusionId = pokemon.fusionSpecies.speciesId;
            if (pokemonEvolutions.hasOwnProperty(fusionId)) {
              const evo = pokemonEvolutions[fusionId].find(e => e.item === evoItem && (!e.condition || e.condition.predicate(pokemon)));
              if (evo) {
                const targetSpecies = getPokemonSpecies(evo.speciesId);
                targetName = targetSpecies?.name || "";
                break;
              }
            }
          }
        }
        if (targetName) {
          return i18next.t("modifierSelectUiHandler:secondaryEvolvesTo", { target: targetName });
        }
        return "";
      } catch { return ""; }
    }

    if (type instanceof FormChangeItemModifierType) {
      return "";
    }

    if (type instanceof ForbiddenFormUnlockModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryRunUnlockable", { defaultValue: "Run Unlockable" });
    }

    if (type instanceof StatSacrificeModifierType) {
      try {
        const stat = (type as any).getStat?.() ?? (type as any).stat;
        if (stat !== undefined) {
          return i18next.t("modifierSelectUiHandler:secondaryStatSacrificeBoost", {
            stat: getStatName(stat, true),
          });
        }
      } catch { return ""; }
    }

    if (type instanceof MoveSacrificeModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryMoveRelease", { defaultValue: "Inherits moveset" });
    }

    if (type instanceof PokemonBaseStatBoosterModifierType) {
      try {
        const stat = (type as any).stat;
        if (stat !== undefined) {
          return i18next.t("modifierSelectUiHandler:secondaryStatPercentBoost", {
            percent: "8",
            stat: getStatName(stat, true),
          });
        }
      } catch { return ""; }
    }

    if (type instanceof ChampionPokemonStatBoosterModifierType) {
      try {
        const stats = (type as any).stats as Stat[] | undefined;
        const boostPercent = (type as any).boostPercent ?? 0.03;
        if (stats && stats.length > 0) {
          const percent = (boostPercent * 100).toFixed(0);
          const statNames = stats.map(s => getStatName(s, true)).join(", ");
          return i18next.t("modifierSelectUiHandler:secondaryChampionStatBoost", {
            percent,
            stats: statNames,
          });
        }
      } catch { return ""; }
    }

    if (type instanceof AttackTypeBoosterModifierType) {
      try {
        const moveType = (type as any).moveType;
        const boostPercent = (type as any).boostPercent ?? 20;
        if (moveType !== undefined) {
          const typeName = i18next.t(`pokemonInfo:Type.${Type[moveType]}`, { defaultValue: Type[moveType] });
          return i18next.t("modifierSelectUiHandler:secondaryAttackTypeBoost", {
            percent: `${boostPercent}`,
            moveType: typeName,
          });
        }
      } catch { return ""; }
    }

    if (type instanceof TerastallizeModifierType) {
      return "";
    }

    if (type instanceof FusePokemonModifierType) {
      return "";
    }

    if (type instanceof TypeSwitcherModifierType) {
      return "";
    }

    if (type instanceof TrainerBondAbilityModifierType) {
      const championId = (type as any).championId;
      const champion = championId ? ChampionUtils.getChampionDisplayName(championId) : "";
      return i18next.t("skillTree:rewards.trainerBondGeneric", { champion });
    }

    if (type instanceof TypeSacrificeModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryTypeSacrifice", { defaultValue: "Inherits Type" });
    }

    if (type instanceof AbilitySacrificeModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryAbilitySacrifice", { defaultValue: "Inherits Ability" });
    }

    if (type instanceof PassiveAbilitySacrificeModifierType) {
      return i18next.t("modifierSelectUiHandler:secondaryPassiveSacrifice", { defaultValue: "Inherits Ability as Passive" });
    }

    if (type instanceof PlayerPokemonBaseStatBoosterModifierType) {
      try {
        const stat = (type as any).stat;
        if (stat !== undefined) {
          return i18next.t("modifierSelectUiHandler:secondaryStatPercentBoost", {
            percent: "3",
            stat: getStatName(stat, true),
          });
        }
      } catch { return ""; }
    }

    return "";
  }

  setCursor(cursor: integer): boolean {
    if (this._lootAnimating) {
      this.hideUpgradeTooltip();
      this.moveInfoOverlay.clear();
      if (this.cursorObj) this.cursorObj.setVisible(false);
      return false;
    }

    const prevOption = this.rowCursor === 1 ? this.options[this.cursor] : null;

    let visualCursor = cursor;
    let effectiveCursor = cursor;
    if (this.rowCursor >= 2 && this.shopStripRealCount > 0) {
      effectiveCursor = cursor % this.shopStripRealCount;
    }

    const result = super.setCursor(effectiveCursor);

    if (this.rowCursor >= 2 && this.shopStripRealCount > 0 && visualCursor !== effectiveCursor) {
      this.cursor = visualCursor;
    }

    if (!this._isMouseHoverPreview) {
      if (this.cursorObj) {
        const hasValidTarget = (this.rowCursor === 0 && this.getButtonLayout().length > 0) ||
          (this.rowCursor === 1 && this.options.length > 0) ||
          (this.rowCursor >= 2 && this.shopStripRealCount > 0);
        this.cursorObj.setVisible(hasValidTarget);
        if (!hasValidTarget) {
          this.hideUpgradeTooltip();
          this.moveInfoOverlay.clear();
        }
        this.applyCursorFromConfig();

        if (this.rowCursor === 0) {
          if (this.cursorObj.parentContainer === this.modifierContainer) {
            this.modifierContainer.remove(this.cursorObj, false);
            this.scene.ui.add(this.cursorObj);
          }
          this.cursorObj.setDepth(50);
          this.scene.ui.bringToTop(this.cursorObj);
        } else {
          if (this.cursorObj.parentContainer !== this.modifierContainer) {
            if (this.cursorObj.parentContainer) {
              this.cursorObj.parentContainer.remove(this.cursorObj, false);
            }
            this.modifierContainer.add(this.cursorObj);
          }
          this.cursorObj.setDepth(0);
          this.modifierContainer.bringToTop(this.cursorObj);
        }

        if (this.rowCursor >= 2 && visualCursor < this.shopStripIcons.length) {
          const icon = this.shopStripIcons[visualCursor];
          if (icon && this.shopStripContainer) {
            const worldPos = icon.getWorldTransformMatrix();
            const containerMatrix = this.modifierContainer.getWorldTransformMatrix();
            const invMatrix = containerMatrix.invert();
            const localX = invMatrix.transformPoint(worldPos.tx, worldPos.ty).x;
            const localY = invMatrix.transformPoint(worldPos.tx, worldPos.ty).y;
            const cfg = this._cursorTweaks.shop;
            this.cursorObj.setPosition(localX + cfg.offsetX, localY + cfg.offsetY);
          }
        }
      }

      for (const opt of this.options) {
        if (typeof (opt as any).setFocusLabelChip === "function") {
          (opt as any).setFocusLabelChip(null);
        }
      }

      if ((this as any).focusLabelDetailsBg && !(this as any).showDetailsHintContainer?.visible) {
        try { (this as any).focusLabelDetailsBg.clear(); } catch {}
      }

      if ((this as any).showDetailsHintContainer?.visible) {
        this.scene.ui.bringToTop((this as any).showDetailsHintContainer);
      }

      for (const [option, text] of this.cardSecondaryTexts) {
        text.setVisible(option.isRevealed() && this.shouldShowCardSecondaryText());
      }

      if (this.rowCursor === 1) {
        this.unfocusAllCardFrames();

        const currentOption = this.options[this.cursor];
        if (currentOption) {
          this.applyOptionFocusState(currentOption, true);
          this._lastKeyboardFocusedIndex = this.cursor;
          (this as any).updateShowDetailsHint(currentOption, true);
        }
      }

      if (this.rowCursor >= 2 && this.shopStripFocused) {
        this.updateShopStripSelection(this.cursor);
      }

      if (this.rowCursor >= 2 && (this as any).showDetailsHintContainer?.visible) {
        const priceText = this.shopStripPriceTexts?.[this.cursor];
        if (priceText && this.shopStripContainer) {
          const worldPos = priceText.getWorldTransformMatrix();
          const containerMatrix = this.modifierContainer.getWorldTransformMatrix();
          const invMatrix = containerMatrix.invert();
          const localX = invMatrix.transformPoint(worldPos.tx, worldPos.ty).x;
          const localY = invMatrix.transformPoint(worldPos.tx, worldPos.ty).y;
          (this as any).showDetailsHintContainer.setPosition(localX, localY + priceText.displayHeight + 2);
        }
      }
    }

    if (this._isMouseHoverPreview && this.rowCursor >= 2 && (this as any).showDetailsHintContainer?.visible) {
      const priceText = this.shopStripPriceTexts?.[this.cursor];
      if (priceText && this.shopStripContainer) {
        const worldPos = priceText.getWorldTransformMatrix();
        const containerMatrix = this.modifierContainer.getWorldTransformMatrix();
        const invMatrix = containerMatrix.invert();
        const localX = invMatrix.transformPoint(worldPos.tx, worldPos.ty).x;
        const localY = invMatrix.transformPoint(worldPos.tx, worldPos.ty).y;
        (this as any).showDetailsHintContainer.setPosition(localX, localY + priceText.displayHeight + 2);
      }
    }

    if (this.rowCursor === 1 && (this as any).upgradeTooltipContainer && this.cursor < this.options.length) {
      const option = this.options[this.cursor];
      const cardFrame = this.cardFrames.get(option);
      if (option && cardFrame) {
        const ttContainer = (this as any).upgradeTooltipContainer as Phaser.GameObjects.Container;
        const tooltipWidth = 120;
        const modalWidth = this.scene.game.canvas.width / 6;
        const modalHeight = this.scene.game.canvas.height / 6;
        const cardHalfW = (cardFrame.displayWidth || 67) / 2;

        const xRight = option.x + cardHalfW + 4;
        const xLeft = option.x - cardHalfW - 4 - tooltipWidth;
        let tooltipX = xRight + tooltipWidth > modalWidth ? xLeft : xRight;
        tooltipX = Math.max(4, Math.min(modalWidth - tooltipWidth - 4, tooltipX));

        const ttBounds = ttContainer.getBounds();
        const tooltipHeight = ttBounds.height / 6;
        let tooltipY = option.y - tooltipHeight / 2;
        tooltipY = Math.max(-modalHeight + 4, Math.min(-tooltipHeight - 4, tooltipY));
        ttContainer.setPosition(tooltipX, tooltipY);
      }
    }

    if (this.rowCursor >= 2 && (this as any).upgradeTooltipContainer && visualCursor < this.shopStripIcons.length) {
      const nameText = this.shopStripNameTexts[visualCursor];
      const icon = this.shopStripIcons[visualCursor];
      if (this.shopStripContainer) {
        const containerMatrix = this.modifierContainer.getWorldTransformMatrix();
        const invMatrix = containerMatrix.invert();
        let rightEdgeLocal: number;
        let anchorLocalY: number;
        if (nameText?.visible) {
          const nameWorldMatrix = nameText.getWorldTransformMatrix();
          const nameWorldX = nameWorldMatrix.tx;
          const nameWorldY = nameWorldMatrix.ty;
          const nameWorldScaleX = nameWorldMatrix.scaleX;
          const nameRightWorldX = nameWorldX + nameText.width * nameWorldScaleX;
          rightEdgeLocal = invMatrix.transformPoint(nameRightWorldX, nameWorldY).x;
          anchorLocalY = invMatrix.transformPoint(nameWorldX, nameWorldY).y;
        } else {
          const iconWorldMatrix = icon.getWorldTransformMatrix();
          const iconWorldX = iconWorldMatrix.tx;
          const iconWorldY = iconWorldMatrix.ty;
          rightEdgeLocal = invMatrix.transformPoint(iconWorldX + 8 * 6, iconWorldY).x;
          anchorLocalY = invMatrix.transformPoint(iconWorldX, iconWorldY).y;
        }
        const tooltipWidth = 120;
        const modalWidth = this.scene.game.canvas.width / 6;
        const modalHeight = this.scene.game.canvas.height / 6;
        const xRight = rightEdgeLocal + 5;
        const leftAnchorX = nameText?.visible
          ? invMatrix.transformPoint(nameText.getWorldTransformMatrix().tx, 0).x
          : invMatrix.transformPoint(icon.getWorldTransformMatrix().tx, 0).x;
        const xLeft = leftAnchorX - 5 - tooltipWidth;
        let tooltipX = xRight + tooltipWidth > modalWidth ? xLeft : xRight;
        tooltipX = Math.max(4, Math.min(modalWidth - tooltipWidth - 4, tooltipX));
        const ttContainer = (this as any).upgradeTooltipContainer as Phaser.GameObjects.Container;
        const ttBounds = ttContainer.getBounds();
        const tooltipHeight = ttBounds.height / 6;
        let tooltipY = anchorLocalY - tooltipHeight / 2;
        tooltipY = Math.max(-modalHeight + 4, Math.min(-tooltipHeight - 4, tooltipY));
        ttContainer.setPosition(tooltipX, tooltipY);
      }
    }

    return result;
  }

  protected getRowItems(rowCursor: integer): integer {
    if (rowCursor >= 2 && this.shopStripRealCount > 0) {
      return this.shopStripSlotCount;
    }
    return super.getRowItems(rowCursor);
  }

  public getCurrentSelectedOption(): ModifierOption | null {
    if (this.rowCursor >= 2) {
      const allShop = this.shopOptionsRows.flat();
      const realCount = this.shopStripRealCount > 0 ? this.shopStripRealCount : allShop.length;
      if (realCount > 0) {
        const absIndex = this.cursor % realCount;
        return allShop[absIndex] || null;
      }
    }
    return super.getCurrentSelectedOption();
  }

  setRerollVisible(visible: boolean): void {
    this.rerollSuppressed = !visible;
    this.rerollButtonContainer.setVisible(visible);
    this.permaRerollButtonContainer.setVisible(visible);
    this.lockRarityButtonContainer.setVisible(false);
    this.lockRarityButtonContainer.setAlpha(0);
  }

  setRowCursor(rowCursor: integer): boolean {
    if (this.displayConfig?.customShopStrip && rowCursor > 2) rowCursor = 2;
    const prevRow = this.rowCursor;
    this._clickFocusedIndex = -1;
    this._clickFocusedShopIndex = -1;

    if (prevRow === 1 && rowCursor !== 1) {
      this.unfocusAllCardFrames();
      this._lastKeyboardFocusedIndex = -1;
    }

    const result = super.setRowCursor(rowCursor);

    if (prevRow === 2 && rowCursor !== 2) {
      this.setShopStripFocused(false);
    } else if (rowCursor === 2 && prevRow !== 2) {
      this.setShopStripFocused(true);
    }

    return result;
  }

  private applyOptionFocusState(option: ModifierOption, focused: boolean): void {
    const revealed = option.isRevealed();
    const frame = this.cardFrames.get(option);
    if (frame) {
      if (!revealed) {
        frame.setAlpha(0);
      } else {
        const texKey = focused ? "modifier_option_focused" : "modifier_option_unfocused";
        if (this.scene.textures.exists(texKey)) {
          frame.setTexture(texKey);
        }
        frame.setAlpha(focused ? 1 : 0.7);
        frame.setPosition(option.x, option.y + (focused ? 6 : 4));
      }
    }

    if (!revealed) return;

    const optAny = option as any;
    if (optAny.itemContainer) {
      const denseScale = optAny.denseItemContainerTargetScale ?? 1.0;
      const unfocusedScale = optAny.itemContainerTargetScale ?? denseScale;
      optAny.itemContainer.setScale(focused ? 1.05 : unfocusedScale);
    }
    if (optAny.itemText) {
      optAny.itemText.setAlpha(focused ? 1 : 0.8);
    }
    if (optAny.item) {
      optAny.item.setAlpha(focused ? 1 : 0.85);
    }

    const secondary = this.cardSecondaryTexts.get(option);
    if (secondary) {
      secondary.setAlpha(focused ? 1 : 0.75);
      const isCollectedType = this.storedUIMode === Mode.COLLECTED_TYPE_SELECT;
      secondary.setY(isCollectedType ? 33.5 : 31.5);
    }

    if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
      const optAny = option as any;
      const focusBump = focused ? 4.5 : 0;
      const baseY = option.getItemCostTextY();
      if (optAny.itemCostText) {
        optAny.itemCostText.setY(baseY + focusBump);
      }
      if (optAny.collectedIcon) {
        optAny.collectedIcon.setY(baseY + focusBump);
      }
    }
  }

  private unfocusAllCardFrames(): void {
    for (const [option] of this.cardFrames) {
      this.applyOptionFocusState(option, false);
    }
  }

  private setShopStripFocused(focused: boolean): void {
    this.shopStripFocused = focused;

    if (this.shopStripOverlay) {
      this.shopStripOverlay.setVisible(!focused);
      if (!focused) {
        this.shopStripOverlay.setAlpha(LootRewardSelectUiHandler.SHOP_STRIP_OVERLAY_ALPHA);
      }
    }

    for (const icon of this.shopStripIcons) {
      const isGhost = icon.getData("isGhost");
      if (focused) {
        icon.setAlpha(isGhost ? 0.7 : 1);
      } else {
        icon.setAlpha(isGhost ? 0.45 : 0.6);
      }
    }

    if (focused) {
      this.updateShopStripSelection(this.cursor);
    } else {
      const allShopOptions = this.shopOptionsRows.flat();
      const realCount = allShopOptions.length;
      for (let i = 0; i < this.shopStripPriceTexts.length; i++) {
        this.shopStripPriceTexts[i].setVisible(false);
      }
      const showUnique = (this.scene as BattleScene).shopShowUniqueNames;
      for (const name of this.shopStripNameTexts) {
        if (showUnique && name.getData("isDynamic")) {
          name.setPosition(name.getData("centeredX"), name.getData("centeredY"));
          name.setOrigin(0.5, 0);
          name.setVisible(true);
        } else {
          name.setVisible(false);
        }
      }
    }
  }

  private updateShopStripSelection(cursorIndex: number): void {
    const allShopOptions = this.shopOptionsRows.flat();
    const realCount = allShopOptions.length;
    for (let i = 0; i < this.shopStripPriceTexts.length; i++) {
      const isSelected = i === cursorIndex;
      const absIdx = i % realCount;
      this.shopStripPriceTexts[i].setVisible(isSelected);

      if (realCount > 0 && absIdx < realCount) {
        const opt = allShopOptions[absIdx];
        const itemCost = opt?.modifierTypeOption?.cost || 0;
        if (itemCost === 0) {
          this.shopStripPriceTexts[i].setText(i18next.t("modifierSelectUiHandler:shopFree"));
          this.shopStripPriceTexts[i].setColor(LootRewardSelectUiHandler.SHOP_FREE_COLOR);
        } else {
          this.shopStripPriceTexts[i].setText(`₽${itemCost}`);
          const canAfford = this.scene.money >= itemCost;
          this.shopStripPriceTexts[i].setColor(canAfford ? getTextColor(TextStyle.MONEY) : LootRewardSelectUiHandler.SHOP_UNAFFORDABLE_COLOR);
        }
      }
    }
    for (let i = 0; i < this.shopStripNameTexts.length; i++) {
      const nt = this.shopStripNameTexts[i];
      if (i === cursorIndex) {
        nt.setPosition(nt.getData("defaultX"), nt.getData("defaultY"));
        nt.setOrigin(nt.getData("defaultOriginX"), nt.getData("defaultOriginY"));
        nt.setVisible(true);
      } else {
        nt.setVisible(false);
      }
    }

    for (let i = 0; i < this.shopStripIcons.length; i++) {
      const isGhost = this.shopStripIcons[i].getData("isGhost");
      const absIdx = realCount > 0 ? i % realCount : 0;
      const opt = (realCount > 0 && absIdx < realCount) ? allShopOptions[absIdx] : null;
      const cost = opt?.modifierTypeOption?.cost || 0;
      const canAfford = cost === 0 || this.scene.money >= cost;

      if (!canAfford) {
        this.shopStripIcons[i].setTint(LootRewardSelectUiHandler.SHOP_UNAFFORDABLE_TINT);
      } else if (cost === 0) {
        this.shopStripIcons[i].setTint(LootRewardSelectUiHandler.SHOP_FREE_TINT);
      } else {
        this.shopStripIcons[i].clearTint();
      }

      if (i === cursorIndex) {
        this.shopStripIcons[i].setAlpha(1.0);
      } else {
        this.shopStripIcons[i].setAlpha(isGhost ? 0.5 : 0.7);
      }
    }
  }

  protected createOptionInstance(x: number, y: number, typeOption: ModifierTypeOption): ModifierOption {
    return new ModifierOption(this.scene, x, y, typeOption);
  }

  protected createModifierOption(typeOptions: ModifierTypeOption[], index: number, optionsYOffset: number): ModifierOption {
    const n = typeOptions.length;
    const screenW = this.scene.game.canvas.width / 6;
    const baseY = -this.scene.game.canvas.height / 12 + optionsYOffset;
    const metrics = this.getPaginationLayoutMetrics();
    const cardW = metrics.cardW;
    const gap = metrics.gap;

    if (n > 6) {
      const itemsRow0 = Math.ceil(n / 2);
      const row = index < itemsRow0 ? 0 : 1;
      const col = row === 0 ? index : index - itemsRow0;
      const itemsInRow = row === 0 ? itemsRow0 : (n - itemsRow0);
      const totalRowWidth = itemsInRow * cardW + (itemsInRow - 1) * gap;
      const startX = (screenW - totalRowWidth) / 2 + cardW / 2;
      const x = startX + col * (cardW + gap);
      const rowSpacing = 50;
      const y = baseY + (row * rowSpacing);
      const opt = this.createOptionInstance(x, y, typeOptions[index]);
      opt.initDenseRowStyle();
      return opt;
    }

    const totalWidth = n * cardW + (n - 1) * gap;
    if (totalWidth > screenW) {
      const leftMargin = metrics.leftMargin;
      const rightMargin = metrics.rightMargin;
      const usableWidth = screenW - leftMargin - rightMargin;
      const sliceWidth = usableWidth / n;
      const x = leftMargin + sliceWidth * (index + 0.5);
      const opt = this.createOptionInstance(x, baseY, typeOptions[index]);
      if (n >= 6) opt.initDenseRowStyle();
      return opt;
    }

    const startX = (screenW - totalWidth) / 2 + cardW / 2;
    const x = startX + index * (cardW + gap);
    return this.createOptionInstance(x, baseY, typeOptions[index]);
  }

  protected createPaginationArrows(): void {
    this.destroyPaginationArrows();

    const screenW = this.scene.game.canvas.width / 6;
    const arrowY = -this.scene.game.canvas.height / 12 + this.getMainOptionsYOffset(null);
    const arrowScale = 0.75;

    const arrowGutter = 11;
    this.leftArrow = this.scene.add.image(arrowGutter, arrowY, "cursor_reverse");
    this.leftArrow.setScale(arrowScale);
    this.leftArrow.setOrigin(0.5, 0.5);
    this.leftArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
      if (!isPrimaryPointer(pointer)) return;
      this.changePage(-1);
    });
    this.leftArrow.on("pointerover", () => {
      if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
      this.leftArrow?.setScale(0.9);
    });
    this.leftArrow.on("pointerout", () => { this.leftArrow?.setScale(arrowScale); });
    this.modifierContainer.add(this.leftArrow);

    this.rightArrow = this.scene.add.image(screenW - arrowGutter, arrowY, "cursor");
    this.rightArrow.setScale(arrowScale);
    this.rightArrow.setOrigin(0.5, 0.5);
    this.rightArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
      if (!isPrimaryPointer(pointer)) return;
      this.changePage(1);
    });
    this.rightArrow.on("pointerover", () => {
      if ((this.scene as BattleScene).ui.getMode() !== this.storedUIMode) return;
      this.rightArrow?.setScale(0.9);
    });
    this.rightArrow.on("pointerout", () => { this.rightArrow?.setScale(arrowScale); });
    this.modifierContainer.add(this.rightArrow);

    this.updatePaginationArrowState();
  }

  protected destroyPaginationArrows(): void {
    if (this.leftArrow) { this.leftArrow.destroy(); this.leftArrow = null; }
    if (this.rightArrow) { this.rightArrow.destroy(); this.rightArrow = null; }
    if (this.pageLabel) { this.pageLabel.destroy(); this.pageLabel = null; }
  }

  protected updatePaginationArrowState(): void {
    if (!this.leftArrow || !this.rightArrow) return;
    const canPrev = this.windowStart > 0;
    const canNext = this.windowStart < this.allTypeOptions.length - this.maxPerPage;
    this.leftArrow.setVisible(canPrev);
    this.leftArrow.setAlpha(1);
    if (canPrev) {
      this.leftArrow.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-8, -8, 22, 26), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    } else {
      this.leftArrow.disableInteractive();
    }
    this.rightArrow.setVisible(canNext);
    this.rightArrow.setAlpha(1);
    if (canNext) {
      this.rightArrow.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-8, -8, 22, 26), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    } else {
      this.rightArrow.disableInteractive();
    }
    this.modifierContainer.bringToTop(this.leftArrow);
    this.modifierContainer.bringToTop(this.rightArrow);
  }

  protected changePage(direction: number): void {
    if (this._scrollAnimating) return;
    if (this.allTypeOptions.length <= this.maxPerPage) return;

    const newStart = this.windowStart + direction;
    if (newStart < 0 || newStart > this.allTypeOptions.length - this.maxPerPage) return;

    this._scrollAnimating = true;
    this.windowStart = newStart;

    for (const t of this._pageAnimTimers) t.remove();
    this._pageAnimTimers = [];
    for (const t of this._lootRevealTimers) t.remove();
    this._lootRevealTimers = [];
    for (const v of this._shimmerVfx) { v.destroy(); }
    this._shimmerVfx = [];
    for (const opt of this.options) {
      (opt as any).cancelEmberEffects?.();
      opt.destroy();
    }
    this.options.splice(0, this.options.length);

    for (const [, frame] of this.cardFrames) frame.destroy();
    for (const [, text] of this.cardSecondaryTexts) text.destroy();
    this.cardFrames.clear();
    this.cardSecondaryTexts.clear();

    const visibleOptions = this.getVisibleOptions(this.allTypeOptions);
    const optionsYOffset = this.getMainOptionsYOffset(null);
    const cpMetrics = this.getPaginationLayoutMetrics();

    for (let m = 0; m < visibleOptions.length; m++) {
      const option = this.createModifierOption(visibleOptions, m, optionsYOffset);
      option.setScale(cpMetrics.optionScale);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    for (const option of this.options) {
      const optAny = option as any;
      if (optAny.pb && optAny.pb.active) {
        optAny.pb.setPosition(0, -60);
        optAny.pb.setScale(1);
      }
      if (optAny.pbTint && optAny.pbTint.active) {
        optAny.pbTint.setPosition(0, -60);
        optAny.pbTint.setScale(1);
      }
      if (optAny.itemText) {
        optAny.itemText.y = 20;
        optAny.itemText.x = -0.5;
        optAny.itemText.setFontSize(41);
      }
      if (optAny.itemCostText && !(option as any).showCost) {
        optAny.itemCostText.setVisible(false);
      }
      if (optAny.item) {
        const isFusionCard = optAny.modifierTypeOption?.type instanceof AddPokemonModifierType
          && (() => { try { const p = (optAny.modifierTypeOption.type as AddPokemonModifierType).getPokemon(); return p?.isFusion?.() && !!p.fusionSpecies; } catch { return false; } })();
        optAny.item.setPosition(-1.5, isFusionCard ? -25.5 : -5.5);
        optAny.item.setScale((optAny.item.scaleX || 1) + 0.06, (optAny.item.scaleY || 1) + 0.06);
      }
    }

    this.addCardFrames();

    for (const opt of this.options) {
      opt.forceReveal();
      const cardFrame = this.cardFrames.get(opt);
      if (cardFrame?.active) cardFrame.setAlpha(0.75);
      const secondary = this.cardSecondaryTexts.get(opt);
      if (secondary?.active) {
        secondary.setVisible(true);
        secondary.setAlpha(0.75);
      }
    }
    this._lootAnimating = false;

    for (let m = 0; m < this.options.length; m++) {
      const opt = this.options[m];
      const cardFrame = this.cardFrames.get(opt);
      const frameW = cardFrame?.displayWidth ?? 67;
      const frameH = cardFrame?.displayHeight ?? 83;
      const frameOffsetY = cardFrame ? (cardFrame.y - opt.y) : 4;
      const pad = 4;
      const hitX = -(frameW / 2) - pad;
      const hitY = frameOffsetY - (frameH / 2) - pad;
      const hitW = frameW + pad * 2;
      const hitH = frameH + pad * 2;
      opt.setInteractive(new Phaser.Geom.Rectangle(hitX, hitY, hitW, hitH), Phaser.Geom.Rectangle.Contains);
      opt.on("pointerover", () => {
        if (this._lootAnimating) return;
        this._hoverActive = true;
        this._isMouseHoverPreview = true;
        this._hoverOnFocusedOption = (this.rowCursor === 1 && this._lastKeyboardFocusedIndex === m);
        if (this.rowCursor !== 1) this.setRowCursor(1);
        this.setCursor(m);
        this._isMouseHoverPreview = false;
        this._hoverOnFocusedOption = false;
        this.applyCursorFromConfig();
        if (this.cursorObj) this.cursorObj.setVisible(true);
      });
      opt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this._lootAnimating) return;
        if (!isPrimaryPointer(pointer)) return;
        if (this.rowCursor !== 1) {
          this.setRowCursor(1);
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else if (this._clickFocusedIndex !== m) {
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else {
          this.processInput(Button.ACTION);
        }
      });
      opt.on("pointerout", () => {
        this._hoverActive = false;
        this.hideUpgradeTooltip();
        this.moveInfoOverlay.clear();
      });
    }

    this.updatePaginationArrowState();
    this._clickFocusedIndex = -1;
    this.setCursor(direction > 0 ? this.maxPerPage - 1 : 0);
    this.getUi().playSelect();

    this._scrollAnimating = false;
  }

  protected jumpToWindow(targetStart: number, cursorAfter: number): void {
    if (this._scrollAnimating) return;
    if (this.allTypeOptions.length <= this.maxPerPage) return;
    const maxStart = this.allTypeOptions.length - this.maxPerPage;
    const newStart = Math.max(0, Math.min(maxStart, targetStart));
    if (newStart === this.windowStart) return;

    this._scrollAnimating = true;
    this.windowStart = newStart;

    for (const t of this._pageAnimTimers) t.remove();
    this._pageAnimTimers = [];
    for (const t of this._lootRevealTimers) t.remove();
    this._lootRevealTimers = [];
    for (const v of this._shimmerVfx) { v.destroy(); }
    this._shimmerVfx = [];
    for (const opt of this.options) {
      (opt as any).cancelEmberEffects?.();
      opt.destroy();
    }
    this.options.splice(0, this.options.length);

    for (const [, frame] of this.cardFrames) frame.destroy();
    for (const [, text] of this.cardSecondaryTexts) text.destroy();
    this.cardFrames.clear();
    this.cardSecondaryTexts.clear();

    const visibleOptions = this.getVisibleOptions(this.allTypeOptions);
    const optionsYOffset = this.getMainOptionsYOffset(null);
    const jwMetrics = this.getPaginationLayoutMetrics();

    for (let m = 0; m < visibleOptions.length; m++) {
      const option = this.createModifierOption(visibleOptions, m, optionsYOffset);
      option.setScale(jwMetrics.optionScale);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    for (const option of this.options) {
      const optAny = option as any;
      if (optAny.pb && optAny.pb.active) {
        optAny.pb.setPosition(0, -60);
        optAny.pb.setScale(1);
      }
      if (optAny.pbTint && optAny.pbTint.active) {
        optAny.pbTint.setPosition(0, -60);
        optAny.pbTint.setScale(1);
      }
      if (optAny.itemText) {
        optAny.itemText.y = 20;
        optAny.itemText.x = -0.5;
        optAny.itemText.setFontSize(41);
      }
      if (optAny.itemCostText && !(option as any).showCost) {
        optAny.itemCostText.setVisible(false);
      }
      if (optAny.item) {
        const isFusionCard = optAny.modifierTypeOption?.type instanceof AddPokemonModifierType
          && (() => { try { const p = (optAny.modifierTypeOption.type as AddPokemonModifierType).getPokemon(); return p?.isFusion?.() && !!p.fusionSpecies; } catch { return false; } })();
        optAny.item.setPosition(-1.5, isFusionCard ? -25.5 : -5.5);
        optAny.item.setScale((optAny.item.scaleX || 1) + 0.06, (optAny.item.scaleY || 1) + 0.06);
      }
    }

    this.addCardFrames();

    for (const opt of this.options) {
      opt.forceReveal();
      const cardFrame = this.cardFrames.get(opt);
      if (cardFrame?.active) cardFrame.setAlpha(0.75);
      const secondary = this.cardSecondaryTexts.get(opt);
      if (secondary?.active) {
        secondary.setVisible(true);
        secondary.setAlpha(0.75);
      }
    }
    this._lootAnimating = false;

    for (let m = 0; m < this.options.length; m++) {
      const opt = this.options[m];
      const cardFrame = this.cardFrames.get(opt);
      const frameW = cardFrame?.displayWidth ?? 67;
      const frameH = cardFrame?.displayHeight ?? 83;
      const frameOffsetY = cardFrame ? (cardFrame.y - opt.y) : 4;
      const pad = 4;
      const hitX = -(frameW / 2) - pad;
      const hitY = frameOffsetY - (frameH / 2) - pad;
      const hitW = frameW + pad * 2;
      const hitH = frameH + pad * 2;
      opt.setInteractive(new Phaser.Geom.Rectangle(hitX, hitY, hitW, hitH), Phaser.Geom.Rectangle.Contains);
      opt.on("pointerover", () => {
        if (this._lootAnimating) return;
        this._hoverActive = true;
        this._isMouseHoverPreview = true;
        this._hoverOnFocusedOption = (this.rowCursor === 1 && this._lastKeyboardFocusedIndex === m);
        if (this.rowCursor !== 1) this.setRowCursor(1);
        this.setCursor(m);
        this._isMouseHoverPreview = false;
        this._hoverOnFocusedOption = false;
        this.applyCursorFromConfig();
        if (this.cursorObj) this.cursorObj.setVisible(true);
      });
      opt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this._lootAnimating) return;
        if (!isPrimaryPointer(pointer)) return;
        if (this.rowCursor !== 1) {
          this.setRowCursor(1);
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else if (this._clickFocusedIndex !== m) {
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else {
          this.processInput(Button.ACTION);
        }
      });
      opt.on("pointerout", () => {
        this._hoverActive = false;
        this.hideUpgradeTooltip();
        this.moveInfoOverlay.clear();
      });
    }

    this.updatePaginationArrowState();

    this.setCursor(cursorAfter);
    this.getUi().playSelect();

    this._scrollAnimating = false;
  }

  public refreshOptionsWithAnimation(
    typeOptions: any[],
    modifierSelectCallback: (rowCursor: number, cursor: number) => boolean,
    costs: { rerollCost: number; permaRerollCost?: number },
    opts?: { regenerateShop?: boolean }
  ): void {
    this.hideUpgradeTooltip();
    this.moveInfoOverlay.clear();
    this.getUi().clearText();
    this.getUi().hideMessageChrome();
    this._lootAnimating = true;
    this._clickFocusedIndex = -1;
    this._clickFocusedShopIndex = -1;

    for (const t of this._lootRevealTimers) t.remove();
    this._lootRevealTimers = [];
    for (const t of this._pageAnimTimers) t.remove();
    this._pageAnimTimers = [];
    for (const v of this._shimmerVfx) { v.destroy(); }
    this._shimmerVfx = [];

    for (const opt of this.options) {
      (opt as any).cancelEmberEffects?.();
      this.scene.tweens.killTweensOf(opt);
      opt.destroy();
    }
    this.options.splice(0, this.options.length);

    for (const [, frame] of this.cardFrames) frame.destroy();
    for (const [, text] of this.cardSecondaryTexts) text.destroy();
    this.cardFrames.clear();
    this.cardSecondaryTexts.clear();

    if (opts?.regenerateShop) {
      for (const opt of this.shopOptionsRows.flat()) {
        (opt as any).cancelEmberEffects?.();
        this.scene.tweens.killTweensOf(opt);
        opt.destroy();
      }
      this.shopOptionsRows.splice(0, this.shopOptionsRows.length);

      const shopTypeOptions = this.getShopTypeOptions();
      if (shopTypeOptions) {
        const shopLayout = this.getShopLayout();
        for (let m = 0; m < shopTypeOptions.length; m++) {
          const row = m < shopLayout.itemsPerRow ? 0 : 1;
          const col = m < shopLayout.itemsPerRow ? m : m - shopLayout.itemsPerRow;
          const rowOptions = shopTypeOptions.slice(row ? shopLayout.itemsPerRow : 0, row ? undefined : shopLayout.itemsPerRow);
          const sliceWidth = (this.scene.game.canvas.width / 6.5) / (rowOptions.length + 2);
          const option = new ModifierOption(this.scene, sliceWidth * (col + 1) + (sliceWidth * 0.5) + 5, ((-this.scene.game.canvas.height / 12) - (this.scene.game.canvas.height / 32) - (40 - (28 * row - 1))), shopTypeOptions[m], true);
          option.setScale(0.375);
          option.setVisible(false);
          this.scene.add.existing(option);
          this.modifierContainer.add(option);
          if (row >= this.shopOptionsRows.length) this.shopOptionsRows.push([]);
          this.shopOptionsRows[row].push(option);
        }
      }

      for (const icon of this.shopStripIcons) icon.destroy();
      for (const txt of this.shopStripPriceTexts) txt.destroy();
      for (const txt of this.shopStripNameTexts) txt.destroy();
      this.shopStripIcons = [];
      this.shopStripPriceTexts = [];
      this.shopStripNameTexts = [];
    } else {
      for (const icon of this.shopStripIcons) icon.destroy();
      for (const txt of this.shopStripPriceTexts) txt.destroy();
      for (const txt of this.shopStripNameTexts) txt.destroy();
      this.shopStripIcons = [];
      this.shopStripPriceTexts = [];
      this.shopStripNameTexts = [];
    }

    this.destroyPaginationArrows();
    this.pageIndex = 0;
    this.windowStart = 0;
    this.totalPages = 1;
    this.allTypeOptions = [];

    if (this.cursorObj) this.cursorObj.setVisible(false);

    if (typeOptions.length > this.maxPerPage) {
      this.allTypeOptions = typeOptions.slice();
      this.totalPages = Math.ceil(typeOptions.length / this.maxPerPage);
      typeOptions = this.getVisibleOptions(this.allTypeOptions);
    }

    const optionsYOffset = this.getMainOptionsYOffset(null);
    const metrics = this.getPaginationLayoutMetrics();

    for (let m = 0; m < typeOptions.length; m++) {
      const option = this.createModifierOption(typeOptions, m, optionsYOffset);
      option.setScale(metrics.optionScale);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    for (const option of this.options) {
      const optAny = option as any;
      if (optAny.pb && optAny.pb.active) {
        optAny.pb.setPosition(0, -60);
        optAny.pb.setScale(1);
      }
      if (optAny.pbTint && optAny.pbTint.active) {
        optAny.pbTint.setPosition(0, -60);
        optAny.pbTint.setScale(1);
      }
      if (optAny.itemText) {
        optAny.itemText.y = 20;
        optAny.itemText.x = -0.5;
        optAny.itemText.setFontSize(41);
      }
      if (optAny.itemCostText && !(option as any).showCost) {
        optAny.itemCostText.setVisible(false);
      }
      if (optAny.item) {
        const isFusionCard = optAny.modifierTypeOption?.type instanceof AddPokemonModifierType
          && (() => { try { const p = (optAny.modifierTypeOption.type as AddPokemonModifierType).getPokemon(); return p?.isFusion?.() && !!p.fusionSpecies; } catch { return false; } })();
        optAny.item.setPosition(-1.5, isFusionCard ? -25.5 : -5.5);
        optAny.item.setScale((optAny.item.scaleX || 1) + 0.06, (optAny.item.scaleY || 1) + 0.06);
      }
    }

    this.addCardFrames();
    this.populateShopStrip();
    this.wireShopStripPointerHandlers();
    this.scene.tweens.killTweensOf(this.shopStripContainer);
    if (this.shopStripContainer) this.shopStripContainer.setAlpha(1);
    this.updateLootMoneyDisplay();

    if (costs) {
      this.rerollCost = costs.rerollCost;
      if (costs.permaRerollCost !== undefined) {
        (this as any).permaRerollCost = costs.permaRerollCost;
      }
      this.updateRerollCostText();
    }

    if (this.totalPages > 1) {
      this.createPaginationArrows();
    }

    for (const opt of this.options) {
      const o = opt as any;
      if (o.pb?.active) o.pb.setAlpha(0);
      if (o.pbTint?.active) o.pbTint.setVisible(false);
      if (o.itemTint?.active) o.itemTint.setAlpha(0);
      if (o.itemContainer) o.itemContainer.setAlpha(0);
      if (o.itemText) o.itemText.setAlpha(0);
      if (o.itemCostText) o.itemCostText.setAlpha(0);
    }
    for (const [, frame] of this.cardFrames) {
      frame.setAlpha(0);
    }
    for (const [, text] of this.cardSecondaryTexts) {
      text.setAlpha(0);
      text.setVisible(false);
    }

    const isHighTierRefresh = this.hasHighTierInTypeOptions(this.allTypeOptions.length > 0 ? this.allTypeOptions : typeOptions);

    const scheduleRefreshEmberReveal = () => {
      const LEAD_IN = isHighTierRefresh ? 250 : 1000;
      const LOOT_TOTAL_MS = 4500 + LEAD_IN;
      const SEQ_END = 0.85;
      const n = Math.max(1, this.options.length);
      const slotMs = (LOOT_TOTAL_MS - LEAD_IN) * SEQ_END / n;
      const seqEndMs = LEAD_IN + slotMs * n;
      const lootGs = (this.scene as BattleScene).gameSpeed;
      const emberMs = (ms: number) => ModifierOption.emberCompensatedMs(ms, lootGs);

      for (let i = 0; i < this.options.length; i++) {
        const opt = this.options[i];
        const cardFrame = this.cardFrames.get(opt);
        this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(Math.floor(LEAD_IN + slotMs * i)), () => {
          if (!opt.active) return;
          opt.showEmberMaterialize(Math.floor(slotMs), i);
          const cardRevealDelay = Math.min(375, Math.floor(slotMs * 0.6));
          if (cardFrame && cardFrame.active) {
            cardFrame.setAlpha(0);
            this.scene.time.delayedCall(emberMs(cardRevealDelay), () => {
              if (!cardFrame.active) return;
              cardFrame.setAlpha(0.75);
            });
          }
          const secondary = this.cardSecondaryTexts.get(opt);
          if (secondary?.active && this.shouldShowCardSecondaryText()) {
            this.scene.time.delayedCall(emberMs(cardRevealDelay), () => {
              if (!secondary.active) return;
              secondary.setVisible(true);
              secondary.setAlpha(0.75);
            });
          }
        }));
      }

      if ((this.scene as BattleScene).animationLoadMode >= 2) {
      const shimmerTailMs = LOOT_TOTAL_MS * (1 - SEQ_END);
      const shimmerStaggerMs = shimmerTailMs * 0.08;
      const shimmerSweepMs = shimmerTailMs * 0.5;
      this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(Math.floor(seqEndMs)), () => {
        for (let i = 0; i < this.options.length; i++) {
          const opt = this.options[i];
          const cardFrame = this.cardFrames.get(opt);
          if (!cardFrame?.active) continue;

          const cw = cardFrame.displayWidth;
          const ch = cardFrame.displayHeight;
          const halfW = cw / 2;

          this.scene.time.delayedCall(emberMs(Math.floor(shimmerStaggerMs * i)), () => {
            if (!opt.active || !cardFrame.active) return;

            const maskGfx = this.scene.make.graphics({});
            maskGfx.fillStyle(0xffffff);
            maskGfx.fillRect(cardFrame.x - halfW, cardFrame.y - ch / 2, cw, ch);
            const clipMask = maskGfx.createGeometryMask();

            const shimmer = this.scene.add.graphics();
            shimmer.fillStyle(0xFFFFFF, 0.25);
            shimmer.fillRect(-1, -ch / 2, 2, ch);
            shimmer.setPosition(cardFrame.x - halfW, cardFrame.y);
            shimmer.setMask(clipMask);
            this.modifierContainer.add(shimmer);
            this._shimmerVfx.push(shimmer);
            this._shimmerVfx.push(maskGfx as any);

            this.scene.tweens.add({
              targets: shimmer,
              x: cardFrame.x + halfW,
              alpha: { from: 0.25, to: 0 },
              duration: emberMs(Math.floor(shimmerSweepMs)),
              ease: "Sine.easeInOut",
              onComplete: () => {
                shimmer.clearMask(true);
                shimmer.destroy();
                maskGfx.destroy();
                const si = this._shimmerVfx.indexOf(shimmer);
                if (si >= 0) this._shimmerVfx.splice(si, 1);
                const mi = this._shimmerVfx.indexOf(maskGfx as any);
                if (mi >= 0) this._shimmerVfx.splice(mi, 1);
              }
            });
          });
        }
      }));
      }

      this._lootRevealTimers.push(this.scene.time.delayedCall(emberMs(LOOT_TOTAL_MS), () => {
        for (const opt of this.options) {
          if (!opt.active) continue;
          if (!opt.isRevealed()) {
            opt.forceReveal();
          }
        }

        this._lootAnimating = false;
        this._suppressNextTooltip = true;
        this.firstFocusPending = true;
        this.setRowCursor(1);
        this.setCursor(0);
        this._suppressNextTooltip = false;

        if (this.options.length > 1) {
          const firstOption = this.options[this.cursor];
          if (firstOption && (this as any).showDetailsHintContainer) {
            (this as any).updateShowDetailsHint(firstOption, true);
          }
        }

        if (this.displayConfig?.isBounty) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomQuestNodeDebugShown) {
            LootRewardSelectUiHandler._smitomQuestNodeDebugShown = true;
            flags["skill_tree_quest_node"] = false;
          }
          if (!flags["skill_tree_quest_node"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "skill_tree_quest_node",
              title: i18next.t("tutorial:smitomTip.skillTreeQuestNode.title"),
              texts: [
                i18next.t("tutorial:smitomTip.skillTreeQuestNode.1"),
                i18next.t("tutorial:smitomTip.skillTreeQuestNode.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["skill_tree_quest_node"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        } else if (this.displayConfig?.isShinyPower) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomShinyPowerDebugShown) {
            LootRewardSelectUiHandler._smitomShinyPowerDebugShown = true;
            flags["shiny_power"] = false;
          }
          if (!flags["shiny_power"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "shiny_power",
              title: i18next.t("tutorial:smitomTip.shinyPower.title"),
              texts: [
                i18next.t("tutorial:smitomTip.shinyPower.1"),
                i18next.t("tutorial:smitomTip.shinyPower.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["shiny_power"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        } else if (this.displayConfig?.isRankUp) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomRankUpDebugShown) {
            LootRewardSelectUiHandler._smitomRankUpDebugShown = true;
            flags["rank_up"] = false;
          }
          if (!flags["rank_up"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "rank_up",
              title: i18next.t("tutorial:smitomTip.rankUp.title"),
              texts: [
                i18next.t("tutorial:smitomTip.rankUp.1"),
                i18next.t("tutorial:smitomTip.rankUp.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["rank_up"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        }
        if (this.displayConfig?.isYuMovePhase) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomYuMoveDebugShown) {
            LootRewardSelectUiHandler._smitomYuMoveDebugShown = true;
            flags["yu_move_phase"] = false;
          }
          if (!flags["yu_move_phase"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "yu_move_phase",
              title: i18next.t("tutorial:smitomTip.yuMovePhase.title"),
              texts: [
                i18next.t("tutorial:smitomTip.yuMovePhase.1"),
                i18next.t("tutorial:smitomTip.yuMovePhase.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["yu_move_phase"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        }
        if (this.displayConfig?.isAltBuild) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomAltBuildDebugShown) {
            LootRewardSelectUiHandler._smitomAltBuildDebugShown = true;
            flags["alt_build"] = false;
          }
          if (!flags["alt_build"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "alt_build",
              title: i18next.t("tutorial:smitomTip.altBuild.title"),
              texts: [
                i18next.t("tutorial:smitomTip.altBuild.1"),
                i18next.t("tutorial:smitomTip.altBuild.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["alt_build"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        }
        if (this.displayConfig?.isMoveUpgrades) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomMoveUpgradesDebugShown) {
            LootRewardSelectUiHandler._smitomMoveUpgradesDebugShown = true;
            flags["move_upgrades"] = false;
          }
          if (!flags["move_upgrades"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "move_upgrades",
              title: i18next.t("tutorial:smitomTip.moveUpgrades.title"),
              texts: [
                i18next.t("tutorial:smitomTip.moveUpgrades.1"),
                i18next.t("tutorial:smitomTip.moveUpgrades.2"),
                i18next.t("tutorial:smitomTip.moveUpgrades.3"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["move_upgrades"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        }
        if (this.displayConfig?.isIntrashop) {
          const flags = (this.scene as BattleScene).gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !LootRewardSelectUiHandler._smitomIntrashopDebugShown) {
            LootRewardSelectUiHandler._smitomIntrashopDebugShown = true;
            flags["intrashop"] = false;
          }
          if (!flags["intrashop"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "intrashop",
              title: i18next.t("tutorial:smitomTip.intrashop.title"),
              texts: [
                i18next.t("tutorial:smitomTip.intrashop.1"),
                i18next.t("tutorial:smitomTip.intrashop.2"),
              ],
              offerReplay: true,
              onComplete: () => {
                (this.scene as BattleScene).gameData.smitomTutorialFlags["intrashop"] = true;
                (this.scene as BattleScene).gameData.saveSystem();
                this.setCursor(this.cursor);
              }
            };
            this.unfocusAllCardFrames();
            if (this.cursorObj) this.cursorObj.setVisible(false);
            (this.scene as BattleScene).ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
          }
        }
      }));
    };

    if (this.meetsCondenseTrailTier(this.allTypeOptions.length > 0 ? this.allTypeOptions : typeOptions) && !this._condensePlayedThisSession && !(this.scene as BattleScene).reroll) {
      this._condensePlayedThisSession = true;

      const skipBlackTitle = this.displayConfig?.isRankUp
        || this.displayConfig?.isYuMovePhase
        || this.displayConfig?.isBounty
        || this.displayConfig?.isAltBuild;
      if (!skipBlackTitle) {
        if (this.headerTitleText) {
          this.headerTitleText.setColor("#000000");
        }
        if (this.headerSubtitleText) {
          this.headerSubtitleText.setColor("#000000");
        }
      }

      if (this.headerDisplayContainer) {
        this.scene.tweens.killTweensOf(this.headerDisplayContainer);
        this.headerDisplayContainer.setAlpha(0);
      }

      this._lootRevealTimers.push(this.scene.time.delayedCall(400, () => {
        if (this._trailHandle) {
          this._trailHandle.release();
          this._trailHandle = null;
        }
        const useAltBg = this.displayConfig?.isRankUp
          || this.displayConfig?.isYuMovePhase
          || this.displayConfig?.isBounty
          || this.displayConfig?.isAltBuild;
        if (this.bgImage) {
          this.scene.tweens.killTweensOf(this.bgImage);
          if (useAltBg && this.scene.textures.exists("modifier_ui_handler_bg")) {
            this.bgImage.setTexture("modifier_ui_handler_bg");
            this.bgImage.setDisplaySize(
              this.scene.game.canvas.width / 6,
              this.scene.game.canvas.height / 6
            );
            this.bgImage.setTint((this.displayConfig?.isAltBuild || this.displayConfig?.isBounty) ? 0xBB88FF : 0xFF8888);
            this.bgImage.setAlpha(1);
          } else if (this.scene.textures.exists("level_up")) {
            this.bgImage.setTexture("level_up");
            this.bgImage.setDisplaySize(
              this.scene.game.canvas.width / 6,
              this.scene.game.canvas.height / 6
            );
            this.bgImage.setAlpha(1);
          }
        }

        this.suspendForOverlay();

        const tintValueRefresh = (this.displayConfig?.isAltBuild || this.displayConfig?.isBounty) ? 0xBB88FF : 0xFF8888;
        const bgKeyRefresh = useAltBg
          ? ensureTintedModifierBg(this.scene, tintValueRefresh)
          : "level_up";
        const effectId = Math.floor(Math.random() * getEffectCount());
        const handle = playCondenseTrailTransition(this.scene, effectId, 1400, "modifier_ui_handler_bg", { bgTextureKey: bgKeyRefresh, skipPostCondense: true });
        this._trailHandle = handle;

        const doSpeedUp = (pointer?: Phaser.Input.Pointer) => {
          if (pointer && pointer.button !== 0) return;
          handle.speedUp(9);
          this.scene.input.off("pointerdown", doSpeedUp);
          (this.scene as any).inputController?.events.off("input_down", doSpeedUp);
        };
        this.scene.input.on("pointerdown", doSpeedUp);
        (this.scene as any).inputController?.events.on("input_down", doSpeedUp);

        handle.animationDone.then(() => {
          if (this._trailHandle !== handle) return;
          this.scene.input.off("pointerdown", doSpeedUp);
          (this.scene as any).inputController?.events.off("input_down", doSpeedUp);
          this._trailHandle = null;
          handle.release();
          if (useAltBg) {
            const tintKeyRefresh = `__tinted_modifier_bg_${tintValueRefresh.toString(16)}`;
            if (this.scene.textures.exists(tintKeyRefresh)) {
              this.scene.textures.remove(tintKeyRefresh);
            }
          }
          if (!this.active) return;
          this.resumeFromOverlay();
          if (this.bgImage) {
            this.bgImage.setAlpha(1);
            this.bgImage.setVisible(true);
          }
          if (this.headerDisplayContainer) {
            this.headerDisplayContainer.setAlpha(0);
            this.headerDisplayContainer.setVisible(true);
            this.scene.tweens.add({
              targets: this.headerDisplayContainer,
              alpha: 1,
              duration: 500,
              ease: "Sine.easeIn",
            });
          }
          scheduleRefreshEmberReveal();
        });
      }));
    } else {
      scheduleRefreshEmberReveal();
    }

    for (let m = 0; m < this.options.length; m++) {
      const opt = this.options[m];
      const cardFrame = this.cardFrames.get(opt);
      const frameW = cardFrame?.displayWidth ?? 67;
      const frameH = cardFrame?.displayHeight ?? 83;
      const frameOffsetY = cardFrame ? (cardFrame.y - opt.y) : 4;
      const pad = 4;
      const hitX = -(frameW / 2) - pad;
      const hitY = frameOffsetY - (frameH / 2) - pad;
      const hitW = frameW + pad * 2;
      const hitH = frameH + pad * 2;
      opt.setInteractive(new Phaser.Geom.Rectangle(hitX, hitY, hitW, hitH), Phaser.Geom.Rectangle.Contains);
      opt.on("pointerover", () => {
        if (this._lootAnimating) return;
        this._hoverActive = true;
        this._isMouseHoverPreview = true;
        this._hoverOnFocusedOption = (this.rowCursor === 1 && this._lastKeyboardFocusedIndex === m);
        if (this.rowCursor !== 1) this.setRowCursor(1);
        this.setCursor(m);
        this._isMouseHoverPreview = false;
        this._hoverOnFocusedOption = false;
        this.applyCursorFromConfig();
        if (this.cursorObj) this.cursorObj.setVisible(true);
      });
      opt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this._lootAnimating) return;
        if (!isPrimaryPointer(pointer)) return;
        if (this.rowCursor !== 1) {
          this.setRowCursor(1);
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else if (this._clickFocusedIndex !== m) {
          this.setCursor(m);
          this._clickFocusedIndex = m;
        } else {
          this.processInput(Button.ACTION);
        }
      });
      opt.on("pointerout", () => {
        this._hoverActive = false;
        this.hideUpgradeTooltip();
        this.moveInfoOverlay.clear();
      });
    }

    this.awaitingActionInput = true;
    this.onActionInput = modifierSelectCallback;
  }

  public refreshShopStripOnly(): void {
    for (const opt of this.shopOptionsRows.flat()) {
      (opt as any).cancelEmberEffects?.();
      this.scene.tweens.killTweensOf(opt);
      opt.destroy();
    }
    this.shopOptionsRows.splice(0, this.shopOptionsRows.length);

    const shopTypeOptions = this.getShopTypeOptions();
    if (shopTypeOptions) {
      const shopLayout = this.getShopLayout();
      for (let m = 0; m < shopTypeOptions.length; m++) {
        const row = m < shopLayout.itemsPerRow ? 0 : 1;
        const col = m < shopLayout.itemsPerRow ? m : m - shopLayout.itemsPerRow;
        const rowOptions = shopTypeOptions.slice(row ? shopLayout.itemsPerRow : 0, row ? undefined : shopLayout.itemsPerRow);
        const sliceWidth = (this.scene.game.canvas.width / 6.5) / (rowOptions.length + 2);
        const option = new ModifierOption(this.scene, sliceWidth * (col + 1) + (sliceWidth * 0.5) + 5, ((-this.scene.game.canvas.height / 12) - (this.scene.game.canvas.height / 32) - (40 - (28 * row - 1))), shopTypeOptions[m], true);
        option.setScale(0.375);
        option.setVisible(false);
        this.scene.add.existing(option);
        this.modifierContainer.add(option);
        if (row >= this.shopOptionsRows.length) this.shopOptionsRows.push([]);
        this.shopOptionsRows[row].push(option);
      }
    }

    for (const icon of this.shopStripIcons) icon.destroy();
    for (const txt of this.shopStripPriceTexts) txt.destroy();
    for (const txt of this.shopStripNameTexts) txt.destroy();
    this.shopStripIcons = [];
    this.shopStripPriceTexts = [];
    this.shopStripNameTexts = [];
    this.shopStripFocused = false;
    this._clickFocusedShopIndex = -1;
    this.scene.tweens.killTweensOf(this.shopStripContainer);
    this.populateShopStrip();
    this.wireShopStripPointerHandlers();
    if (this.shopStripContainer) this.shopStripContainer.setAlpha(1);
    this.updateLootMoneyDisplay();
    if (this.rowCursor >= 2 && this.shopStripRealCount > 0) {
      const visibleItems = this.getRowItems(this.rowCursor);
      this.cursor = Math.min(this.cursor, visibleItems - 1);
      this.setShopStripFocused(true);
      this.updateShopStripSelection(this.cursor);
    }
  }

  processInput(button: Button): boolean {
    if (this._lootAnimating) return false;

    if (this._msTweakMetaMode !== TweakMetaMode.NONE && Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      return this.handleMsTweakInput(button);
    }

    if ((this as any).partyDetailsActive || (this as any).moveUpgradeDetailsActive || (this as any).forbiddenFormDetailsActive) {
      return super.processInput(button);
    }

    if (button === Button.CYCLE_ABILITY && this._hoverActive) {
      if (PokemonBattleTooltipUtils.isActive()) {
        return false;
      }
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (type && !(type instanceof MoveUpgradeModifierType)) {
        if (this.firstFocusPending) {
          this.firstFocusPending = false;
        }
        this.tooltipDeferredUntilUserInput = false;
        if (this.scene.modifierTooltipsEnabled) {
          (this as any).setModifierTooltipsEnabled(false);
          this.hideUpgradeTooltip();
          this.moveInfoOverlay.clear();
          this.moveInfoOverlay.setVisible(false);
          this.moveInfoOverlay.active = false;
        } else {
          (this as any).setModifierTooltipsEnabled(true);
        }
        (this as any).updateShowDetailsHint(option, true);
        this.setCursor(this.cursor);
        return true;
      }
    }

    if (this.rowCursor === 1 && this.awaitingActionInput && this.allTypeOptions.length > this.maxPerPage && this.isPaginationEnabled()) {
      const rowItems = this.getRowItems(1);
      const maxStart = this.allTypeOptions.length - this.maxPerPage;
      if (button === Button.RIGHT && this.cursor >= rowItems - 1) {
        if (this.windowStart < maxStart) {
          this.changePage(1);
        } else {
          this.jumpToWindow(0, 0);
        }
        return true;
      }
      if (button === Button.LEFT && this.cursor <= 0) {
        if (this.windowStart > 0) {
          this.changePage(-1);
        } else {
          this.jumpToWindow(maxStart, this.maxPerPage - 1);
        }
        return true;
      }
    }

    if (this.rowCursor === 0 && this.awaitingActionInput) {
      const rowItems = this.getRowItems(0);
      if (rowItems > 1) {
        if (button === Button.RIGHT && this.cursor >= rowItems - 1) {
          this.setCursor(0);
          this.getUi().playSelect();
          return true;
        }
        if (button === Button.LEFT && this.cursor <= 0) {
          this.setCursor(rowItems - 1);
          this.getUi().playSelect();
          return true;
        }
      }
    }

    if (this.rowCursor >= 2 && this.awaitingActionInput) {
      const rowItems = this.getRowItems(this.rowCursor);

      if (rowItems > 1) {
        if (button === Button.RIGHT && this.cursor >= rowItems - 1) {
          this.setCursor(0);
          this.getUi().playSelect();
          return true;
        }
        if (button === Button.LEFT && this.cursor <= 0) {
          this.setCursor(rowItems - 1);
          this.getUi().playSelect();
          return true;
        }
      }

      if (button === Button.ACTION && this.shopStripRealCount > 0) {
        const absIndex = this.cursor % this.shopStripRealCount;
        if (absIndex !== this.cursor) {
          const savedCursor = this.cursor;
          this.cursor = absIndex;
          const result = super.processInput(button);
          this.cursor = savedCursor;
          return result;
        }
      }

      if (button === Button.STATS && this.shopStripRealCount > 0) {
        const absIndex = this.cursor % this.shopStripRealCount;
        if (absIndex !== this.cursor) {
          const savedCursor = this.cursor;
          this.cursor = absIndex;
          const result = super.processInput(button);
          this.cursor = savedCursor;
          return result;
        }
      }
    }

    if (this.rowCursor === 1 && this.options.length === 1
        && (button === Button.LEFT || button === Button.RIGHT)) {
      if (this.firstFocusPending) {
        this.firstFocusPending = false;
        this.tooltipDeferredUntilUserInput = false;
        this.setCursor(this.cursor);
        return true;
      }
    }

    return super.processInput(button);
  }

  private getMsTweakAllTargets(assetIndex: number): any[] {
    const name = MS_TWEAK_ASSETS[assetIndex];
    switch (name) {
      case "OptionContainer":
        return [...this.options];
      case "OptionsContainerAndBG":
        return [...this.options, ...this.cardFrames.values()];
      case "OptionNameText":
        return this.options.map(o => (o as any).itemText).filter(Boolean);
      case "OptionSecondaryText":
        return [...this.cardSecondaryTexts.values()];
      case "OptionIcon":
        return this.options.map(o => (o as any).item).filter(Boolean);
      case "BottomBar":
        return this.getAllBottomContainers();
      case "BottomRowFrames":
        return [...this.buttonFrames];
      case "BottomRowLabels":
        return this.getButtonLabels();
      case "BottomRowCosts":
        return this.getButtonCosts();
      case "BottomRowTexts":
        return [...this.getButtonLabels(), ...this.getButtonCosts()];
      case "AllCardFrames":
        return [...this.cardFrames.values()];
      case "OptionFocusedFrame": {
        const compositeTargets = this.getFocusedOptionAllTargets();
        if (compositeTargets.length > 0) return compositeTargets;
        return [...this.cardFrames.values()].filter(f => f.texture?.key === "modifier_option_focused");
      }
      case "OptionUnfocusedFrame":
        return [...this.cardFrames.values()].filter(f => f.texture?.key === "modifier_option_unfocused");
      case "ShopItemName":
        return [...this.shopStripNameTexts];
      case "ShopItemPrice":
        return [...this.shopStripPriceTexts];
      case "MoneyAndOmegaText": {
        const targets: any[] = [];
        if (this.moneyText) targets.push(this.moneyText);
        if (this.omegaMoneyText) targets.push(this.omegaMoneyText);
        return targets;
      }
      case "ShopItemNameAndPrice":
        return [...this.shopStripNameTexts, ...this.shopStripPriceTexts];
      case "EssenceCostIcon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return this.options.map((o: any) => o.collectedIcon).filter(Boolean);
        }
        return [];
      }
      case "EssenceCostText": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return this.options.map((o: any) => o.itemCostText).filter(Boolean);
        }
        return [];
      }
      case "EssenceTotalLabel": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeTitle ? [(this as any).collectedTypeTitle] : [];
        }
        return [];
      }
      case "EssenceTotalText": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeText ? [(this as any).collectedTypeText] : [];
        }
        return [];
      }
      case "EssenceTotalIcon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeIcon ? [(this as any).collectedTypeIcon] : [];
        }
        return [];
      }
      case "EssenceTotalText&Icon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          const targets: any[] = [];
          if ((this as any).collectedTypeText) targets.push((this as any).collectedTypeText);
          if ((this as any).collectedTypeIcon) targets.push((this as any).collectedTypeIcon);
          return targets;
        }
        return [];
      }
      case "EssenceRow": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          const targets: any[] = [];
          for (const opt of this.options) {
            const o = opt as any;
            if (o.itemCostText) targets.push(o.itemCostText);
            if (o.collectedIcon) targets.push(o.collectedIcon);
          }
          return targets;
        }
        return [];
      }
      case "PermaItemCost": {
        if (this.storedUIMode === Mode.SHOP_SELECT) {
          return this.options.map((o: any) => o.itemCostText).filter(Boolean);
        }
        return [];
      }
      default: {
        const single = this.getMsTweakTarget(assetIndex);
        return single ? [single] : [];
      }
    }
  }

  private handleMsTweakInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this._msTweakMetaMode = TweakMetaMode.NONE;
      this._msTweakBaselines.clear();
      this.cleanupMsTweakKeyListeners();
      this.updateMsTweakHUD();
      this.scene.uiEditModeActive = false;
      console.log(`[MS-TWEAK] meta mode ${TweakMetaMode[this._msTweakMetaMode]}`);
      return true;
    }
    if (button === Button.SUBMIT) {
      if (this._msTweakMetaMode === TweakMetaMode.EDIT_TYPE || this._msTweakMetaMode === TweakMetaMode.ELEMENT) {
        this._msTweakMetaMode = TweakMetaMode.EDIT;
        this.updateMsTweakHUD();
        console.log(`[MS-TWEAK] meta mode ${TweakMetaMode[this._msTweakMetaMode]}`);
      }
      return true;
    }

    if (this._msTweakMetaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._msTweakMode = (this._msTweakMode - 1 + MS_TWEAK_MODES.length) % MS_TWEAK_MODES.length;
        this.updateMsTweakHUD();
        console.log(`[MS-TWEAK] mode=${MS_TWEAK_MODES[this._msTweakMode]}`);
      } else if (button === Button.RIGHT) {
        this._msTweakMode = (this._msTweakMode + 1) % MS_TWEAK_MODES.length;
        this.updateMsTweakHUD();
        console.log(`[MS-TWEAK] mode=${MS_TWEAK_MODES[this._msTweakMode]}`);
      }
      return true;
    }

    if (this._msTweakMetaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._msTweakAssetIndex = (this._msTweakAssetIndex - 1 + MS_TWEAK_ASSETS.length) % MS_TWEAK_ASSETS.length;
        this.updateMsTweakHUD();
        console.log(`[MS-TWEAK] asset=${MS_TWEAK_ASSETS[this._msTweakAssetIndex]}`);
      } else if (button === Button.RIGHT) {
        this._msTweakAssetIndex = (this._msTweakAssetIndex + 1) % MS_TWEAK_ASSETS.length;
        this.updateMsTweakHUD();
        console.log(`[MS-TWEAK] asset=${MS_TWEAK_ASSETS[this._msTweakAssetIndex]}`);
      }
      return true;
    }

    const mode = MS_TWEAK_MODES[this._msTweakMode];
    const assetName = MS_TWEAK_ASSETS[this._msTweakAssetIndex];

    const cursorCtx = this.cursorAssetToContext(assetName);
    if (cursorCtx) {
      return this.handleCursorTweakInput(button, mode, cursorCtx, assetName);
    }

    const targets = this.getMsTweakAllTargets(this._msTweakAssetIndex);

    if (targets.length === 0) {
      console.log(`[MS-TWEAK] No target for ${assetName}`);
      return true;
    }

    const target = targets[0];
    const isIconAsset = assetName === "EssenceCostIcon" || assetName === "EssenceTotalIcon" || assetName === "OptionIcon" || assetName === "ShopIcons";
    const step = mode === "fontSize" ? 1 : (mode === "alpha" ? 0.05 : (mode === "position" ? 0.5 : ((mode === "scale" || mode === "scaleX") && isIconAsset ? 0.05 : 1)));

    switch (button) {
      case Button.UP:
        for (const t of targets) this.applyMsTweak(t, mode, mode === "position" ? -step : step, assetName);
        break;
      case Button.DOWN:
        for (const t of targets) this.applyMsTweak(t, mode, mode === "position" ? step : -step, assetName);
        break;
      case Button.LEFT:
        if (mode === "position") {
          for (const t of targets) this.applyMsTweak(t, "positionX", -step, assetName);
        } else if (mode === "scale") {
          for (const t of targets) this.applyMsTweak(t, "scaleX", -step, assetName);
        } else if (mode === "width") {
          for (const t of targets) this.applyMsTweak(t, "width", -1, assetName);
        } else if (mode === "height") {
          for (const t of targets) this.applyMsTweak(t, "height", -1, assetName);
        }
        break;
      case Button.RIGHT:
        if (mode === "position") {
          for (const t of targets) this.applyMsTweak(t, "positionX", step, assetName);
        } else if (mode === "scale") {
          for (const t of targets) this.applyMsTweak(t, "scaleX", step, assetName);
        } else if (mode === "width") {
          for (const t of targets) this.applyMsTweak(t, "width", 1, assetName);
        } else if (mode === "height") {
          for (const t of targets) this.applyMsTweak(t, "height", 1, assetName);
        }
        break;
      default:
        return true;
    }

    this.updateMsTweakHUD();
    return true;
  }

  private handleCursorTweakInput(button: Button, mode: string, ctx: string, assetName: string): boolean {
    const cfg = this._cursorTweaks[ctx];
    if (!cfg) return true;
    const step = mode === "alpha" ? 0.05 : (mode === "position" ? 0.5 : 0.05);

    switch (button) {
      case Button.UP:
        if (mode === "position") cfg.offsetY -= step;
        else if (mode === "scale") cfg.scale = Math.max(0.1, cfg.scale + step);
        else if (mode === "alpha") cfg.alpha = Math.min(1, cfg.alpha + step);
        break;
      case Button.DOWN:
        if (mode === "position") cfg.offsetY += step;
        else if (mode === "scale") cfg.scale = Math.max(0.1, cfg.scale - step);
        else if (mode === "alpha") cfg.alpha = Math.max(0, cfg.alpha - step);
        break;
      case Button.LEFT:
        if (mode === "position") cfg.offsetX -= step;
        break;
      case Button.RIGHT:
        if (mode === "position") cfg.offsetX += step;
        break;
      default:
        return true;
    }

    this.applyCursorFromConfig();
    console.log(`[MS-TWEAK] ${assetName}: scale=${cfg.scale.toFixed(3)}, offsetX=${cfg.offsetX.toFixed(2)}, offsetY=${cfg.offsetY.toFixed(2)}, α=${cfg.alpha.toFixed(3)}`);
    this.updateMsTweakHUD();
    return true;
  }

  private getFocusedModifierOption(): ModifierOption | null {
    if (this.rowCursor !== 1) return null;
    return this.options[this.cursor] || null;
  }

  private getFocusedCardFrame(): Phaser.GameObjects.Image | null {
    const opt = this.getFocusedModifierOption();
    if (!opt) return null;
    return this.cardFrames.get(opt) || null;
  }

  private getFocusedOptionAllTargets(): any[] {
    const opt = this.getFocusedModifierOption();
    if (!opt) return [];
    const frame = this.cardFrames.get(opt);
    return frame ? [opt, frame] : [opt];
  }

  private resolveMsTweakSizeTarget(target: any): any {
    if (target instanceof Phaser.GameObjects.Container) {
      const idx = this.getAllBottomContainers().indexOf(target);
      if (idx >= 0 && this.buttonFrames[idx]) {
        return this.buttonFrames[idx];
      }
      for (const child of target.list ?? []) {
        if (child instanceof Phaser.GameObjects.Image && typeof child.setDisplaySize === "function") {
          return child;
        }
      }
      return null;
    }
    if (target && target.displayWidth !== undefined && typeof target.setDisplaySize === "function") {
      return target;
    }
    return target;
  }

  private applyMsTweak(target: any, mode: string, delta: number, assetName: string): void {
    if (assetName === "ShopOverlay" && (mode === "width" || mode === "height")) {
      const screenW = this.scene.game.canvas.width / 6;
      const stripH = LootRewardSelectUiHandler.SHOP_STRIP_H;
      if (mode === "width") {
        this._shopStripOverlayW = (this._shopStripOverlayW ?? screenW) + delta;
      } else {
        this._shopStripOverlayH = (this._shopStripOverlayH ?? stripH) + delta;
      }
      this.redrawShopStripGraphics();
      console.log(`[MS-TWEAK] ShopOverlay.${mode} → w=${(this._shopStripOverlayW ?? screenW).toFixed(1)}, h=${(this._shopStripOverlayH ?? stripH).toFixed(1)}`);
      return;
    }
    switch (mode) {
      case "scale":
      case "scaleX":
        if (mode === "scaleX") {
          target.scaleX = (target.scaleX || 1) + delta;
        } else {
          target.scaleX = (target.scaleX || 1) + delta;
          target.scaleY = (target.scaleY || 1) + delta;
        }
        break;
      case "position":
        target.y = (target.y || 0) + delta;
        break;
      case "positionX":
        target.x = (target.x || 0) + delta;
        break;
      case "width": {
        const sizeTargetW = this.resolveMsTweakSizeTarget(target);
        if (sizeTargetW && sizeTargetW.displayWidth !== undefined && typeof sizeTargetW.setDisplaySize === "function") {
          const newW = Math.max(1, sizeTargetW.displayWidth + delta);
          sizeTargetW.setDisplaySize(newW, sizeTargetW.displayHeight);
        }
        break;
      }
      case "height": {
        const sizeTargetH = this.resolveMsTweakSizeTarget(target);
        if (sizeTargetH && sizeTargetH.displayHeight !== undefined && typeof sizeTargetH.setDisplaySize === "function") {
          const newH = Math.max(1, sizeTargetH.displayHeight + delta);
          sizeTargetH.setDisplaySize(sizeTargetH.displayWidth, newH);
        }
        break;
      }
      case "alpha":
        target.alpha = Math.max(0, Math.min(1, (target.alpha || 1) + delta));
        break;
      case "fontSize":
        if (target.style) {
          const current = parseInt(target.style.fontSize) || 96;
          target.setFontSize(`${current + delta}px`);
        }
        break;
      case "textStyle":
        if (typeof target.setColor === "function") {
          const TEXT_STYLE_COUNT = 34;
          let idx = target.__tweakTextStyleIndex ?? 1;
          if (delta > 0) idx = (idx + 1) % TEXT_STYLE_COUNT;
          else if (delta < 0) idx = (idx - 1 + TEXT_STYLE_COUNT) % TEXT_STYLE_COUNT;
          target.__tweakTextStyleIndex = idx;
          const uiTheme = (this.scene as BattleScene).uiTheme;
          target.setColor(getTextColor(idx, false, uiTheme));
          target.setShadowColor(getTextColor(idx, true, uiTheme));
        }
        break;
      case "textStyleOn":
        if (typeof target.setColor === "function") {
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
        break;
    }
    console.log(`[MS-TWEAK] ${assetName}.${mode} += ${delta} → x=${target.x?.toFixed?.(2)}, y=${target.y?.toFixed?.(2)}, sx=${target.scaleX?.toFixed?.(3)}, sy=${target.scaleY?.toFixed?.(3)}, a=${target.alpha?.toFixed?.(3)}`);
  }

  private cursorAssetToContext(name: string): string | null {
    switch (name) {
      case "CursorOnOption": return "option";
      case "CursorOnShop": return "shop";
      case "CursorOnBottomRow": return "bottom";
      default: return null;
    }
  }

  private rowCursorToContext(): string {
    if (this.rowCursor === 0) return "bottom";
    if (this.rowCursor === 1) return "option";
    return "shop";
  }

  private applyCursorFromConfig(): void {
    if (!this.cursorObj) return;
    const ctx = this.rowCursorToContext();
    const cfg = this._cursorTweaks[ctx];
    if (!cfg) return;

    this.cursorObj.setScale(cfg.scale);
    this.cursorObj.setAlpha(cfg.alpha);

    if (this.rowCursor === 1) {
      const option = this.options[this.cursor];
      if (option) {
        this.cursorObj.setPosition(option.x + cfg.offsetX, option.y + cfg.offsetY);
      }
    } else if (this.rowCursor >= 2) {
      const shopRows = this.shopOptionsRows;
      const row = shopRows[shopRows.length - (this.rowCursor - 1)];
      const option = row?.[this.cursor];
      if (option) {
        this.cursorObj.setPosition(option.x + cfg.offsetX, option.y + cfg.offsetY);
      }
    } else if (this.rowCursor === 0) {
      const buttonLayout = this.getButtonLayout();
      const buttonInfo = buttonLayout[this.cursor];
      if (buttonInfo) {
        const containers = [
          { c: this.rerollButtonContainer, label: "Reroll" },
          { c: this.permaRerollButtonContainer, label: "PermaReroll" },
          { c: this.transferButtonContainer, label: "Transfer" },
          { c: this.checkButtonContainer, label: "Check" },
          { c: this.lockRarityButtonContainer, label: "LockRarity" },
        ];
        const visibleContainers = containers.filter(e => e.c?.visible);
        const match = visibleContainers[this.cursor];
        const matchFrame = match?.c?.list?.[0] as Phaser.GameObjects.Image | undefined;
        const frameLocalX = matchFrame?.x ?? -2;
        const cursorX = buttonInfo.x + frameLocalX - 2;
        const cursorY = buttonInfo.y + cfg.offsetY;
        this.cursorObj.setPosition(cursorX, cursorY);
      }
    }
  }

  private getButtonLabels(): Phaser.GameObjects.Text[] {
    const labels: Phaser.GameObjects.Text[] = [];
    const rerollLabel = this.rerollButtonContainer?.getByName("text-reroll-btn") as Phaser.GameObjects.Text;
    if (rerollLabel) labels.push(rerollLabel);
    if (this.permaRerollButtonContainer) {
      const list = (this.permaRerollButtonContainer as any).list as any[];
      const permaLabel = list?.find((c: any) => c !== this.permaRerollCostText && c.type === "Text" && !(c instanceof Phaser.GameObjects.Image));
      if (permaLabel) labels.push(permaLabel);
    }
    if (this.lockRarityButtonText) labels.push(this.lockRarityButtonText);
    const transferLabel = this.transferButtonContainer?.getByName("text-transfer-btn") as Phaser.GameObjects.Text;
    if (transferLabel) labels.push(transferLabel);
    const checkLabel = this.checkButtonContainer?.getByName("text-use-btn") as Phaser.GameObjects.Text;
    if (checkLabel) labels.push(checkLabel);
    return labels;
  }

  private getButtonCosts(): Phaser.GameObjects.Text[] {
    const costs: Phaser.GameObjects.Text[] = [];
    if (this.rerollCostText) costs.push(this.rerollCostText);
    if (this.permaRerollCostText) costs.push(this.permaRerollCostText);
    return costs;
  }

  private getAllBottomContainers(): Phaser.GameObjects.Container[] {
    return [
      this.rerollButtonContainer,
      this.permaRerollButtonContainer,
      this.lockRarityButtonContainer,
      this.transferButtonContainer,
      this.checkButtonContainer,
    ].filter(Boolean) as Phaser.GameObjects.Container[];
  }

  private getMsTweakTarget(index: number): any {
    const name = MS_TWEAK_ASSETS[index];
    switch (name) {
      case "ShopItems": return this.shopStripContainer;
      case "ShopIcons": return this.shopStripIconsContainer;
      case "ShopLabel": return this.shopStripLabel;
      case "ShopOverlay": return this.shopStripOverlay;
      case "Title": return this.headerTitleText;
      case "Subtitle": return this.headerSubtitleText;
      case "TitleBlock": return this.headerDisplayContainer;
      case "OptionContainer": return this.options?.[0];
      case "OptionsContainerAndBG": return this.options?.[0] ?? null;
      case "OptionNameText": return (this.options?.[0] as any)?.itemText;
      case "OptionSecondaryText": return this.cardSecondaryTexts.size > 0 ? [...this.cardSecondaryTexts.values()][0] : null;
      case "OptionIcon": return (this.options?.[0] as any)?.item;
      case "OptionFocusedFrame": {
        const focusedOpt = this.options[this.cursor];
        if (focusedOpt && this.cardFrames.has(focusedOpt)) {
          const frame = this.cardFrames.get(focusedOpt)!;
          if (frame.texture?.key === "modifier_option_focused") return frame;
        }
        for (const f of this.cardFrames.values()) {
          if (f.texture?.key === "modifier_option_focused") return f;
        }
        return null;
      }
      case "OptionUnfocusedFrame": {
        for (const f of this.cardFrames.values()) {
          if (f.texture?.key === "modifier_option_unfocused") return f;
        }
        return null;
      }
      case "AllCardFrames": return this.cardFrames.values().next().value || null;
      case "BottomBar": return this.rerollButtonContainer;
      case "RerollButton": return this.rerollButtonContainer;
      case "PermaRerollButton": return this.permaRerollButtonContainer;
      case "TransferButton": return this.transferButtonContainer;
      case "CheckTeamButton": return this.checkButtonContainer;
      case "LockRaritiesButton": return this.lockRarityButtonContainer;
      case "BottomRowFrames": return this.buttonFrames[0] ?? null;
      case "BottomRowLabels": return this.getButtonLabels()[0] ?? null;
      case "BottomRowCosts": return this.rerollCostText ?? null;
      case "BottomRowTexts": return this.getButtonLabels()[0] ?? null;
      case "RerollText": return this.rerollButtonContainer?.getByName("text-reroll-btn") ?? null;
      case "RerollCost": return this.rerollCostText ?? null;
      case "PermaRerollText": {
        if (!this.permaRerollButtonContainer) return null;
        const list = (this.permaRerollButtonContainer as any).list as any[];
        return list?.find((c: any) => c !== this.permaRerollCostText && c.type === "Text") ?? null;
      }
      case "PermaRerollCost": return this.permaRerollCostText ?? null;
      case "LockRaritiesText": return this.lockRarityButtonText ?? null;
      case "TransferText": return this.transferButtonContainer?.getByName("text-transfer-btn") ?? null;
      case "CheckTeamText": return this.checkButtonContainer?.getByName("text-use-btn") ?? null;
      case "TooltipPos": return null;
      case "GridRowSpacing": return null;
      case "CursorOnOption":
      case "CursorOnShop":
      case "CursorOnBottomRow":
        return this.cursorObj;
      case "RerollBtnImage": return this.buttonFrames[0] ?? null;
      case "PermaRerollBtnImage": return this.buttonFrames[1] ?? null;
      case "LockRaritiesBtnImage": return this.buttonFrames[2] ?? null;
      case "TransferBtnImage": return this.buttonFrames[3] ?? null;
      case "CheckTeamBtnImage": return this.buttonFrames[4] ?? null;
      case "MoneyText": return this.moneyText;
      case "OmegaMoneyText": return this.omegaMoneyText;
      case "ShopItemName": return this.shopStripNameTexts[0] ?? null;
      case "ShopItemPrice": return this.shopStripPriceTexts[0] ?? null;
      case "MoneyAndOmegaText": return this.moneyText;
      case "ShopItemNameAndPrice": return this.shopStripNameTexts[0] ?? null;
      case "EssenceCostIcon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          const opt = this.options?.[0] as any;
          return opt?.collectedIcon ?? null;
        }
        return null;
      }
      case "EssenceCostText": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          const opt = this.options?.[0] as any;
          return opt?.itemCostText ?? null;
        }
        return null;
      }
      case "EssenceTotalLabel": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeTitle ?? null;
        }
        return null;
      }
      case "EssenceTotalText": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeText ?? null;
        }
        return null;
      }
      case "EssenceTotalIcon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeIcon ?? null;
        }
        return null;
      }
      case "EssenceTotalText&Icon": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          return (this as any).collectedTypeText ?? null;
        }
        return null;
      }
      case "EssenceRow": {
        if (this.storedUIMode === Mode.COLLECTED_TYPE_SELECT) {
          const opt = this.options?.[0] as any;
          return opt?.itemCostText ?? null;
        }
        return null;
      }
      case "PermaItemCost": {
        if (this.storedUIMode === Mode.SHOP_SELECT) {
          const opt = this.options?.[0] as any;
          return opt?.itemCostText ?? null;
        }
        return null;
      }
      case "0hint-perma-unfocus":
      case "0hint-perma-focus":
        if (this.storedUIMode !== Mode.SHOP_SELECT) return null;
        return (this as any).showDetailsHintContainer ?? null;
      case "0hint-collect-focus":
      case "0hint-collect-unfocus":
        if (this.storedUIMode !== Mode.COLLECTED_TYPE_SELECT) return null;
        return (this as any).showDetailsHintContainer ?? null;
      case "0hint-collect-essenceicon&txt-focus": {
        if (this.storedUIMode !== Mode.COLLECTED_TYPE_SELECT) return null;
        const focusedOpt = this.options[this.cursor];
        return focusedOpt ? (focusedOpt as any).collectedIcon ?? null : null;
      }
      case "0hint-collect-essenceicon&txt-unfocus": {
        if (this.storedUIMode !== Mode.COLLECTED_TYPE_SELECT) return null;
        const unfocusedOpt = this.options.find((_: any, idx: number) => idx !== this.cursor);
        return unfocusedOpt ? (unfocusedOpt as any).collectedIcon ?? null : null;
      }
      case "ShowDetailsHint": return (this as any).showDetailsHintContainer ?? null;
      case "0-details-line-focus": {
        return (this as any).showDetailsHintContainer ?? null;
      }
      case "0-details-line-unfocus": {
        return (this as any).showDetailsHintContainer ?? null;
      }
      default: return null;
    }
  }

  private setupMsTweakKeyListeners(): void {
    if (this._msTweakListenersRegistered) return;
    this._msTweakListenersRegistered = true;

    this._msTweakKeyOneHandler = () => {
      if (this._msTweakMetaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._msTweakMetaMode = cycleMetaMode(this._msTweakMetaMode, TWEAK_META_CYCLE);
      if (this._msTweakMetaMode === TweakMetaMode.NONE) {
        this.scene.uiEditModeActive = false;
        this._msTweakBaselines.clear();
        this._cursorTweakBaselines.clear();
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
        this.cleanupMsTweakKeyListeners();
      }
      this.updateMsTweakHUD();
      console.log(`[MS-TWEAK] meta mode ${TweakMetaMode[this._msTweakMetaMode]}`);
    };
    this._msTweakKeyTwoHandler = () => {
      if (this._msTweakMetaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._msTweakAssetIndex = (this._msTweakAssetIndex + 1) % MS_TWEAK_ASSETS.length;
      this.updateMsTweakHUD();
      this._dropdownPanel?.markUsed(MS_TWEAK_ASSETS[this._msTweakAssetIndex]);
      console.log(`[MS-TWEAK] asset=${MS_TWEAK_ASSETS[this._msTweakAssetIndex]}`);
    };
    this._msTweakKeyThreeHandler = () => {
      if (this._msTweakMetaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._msTweakAssetIndex = (this._msTweakAssetIndex - 1 + MS_TWEAK_ASSETS.length) % MS_TWEAK_ASSETS.length;
      this.updateMsTweakHUD();
      this._dropdownPanel?.markUsed(MS_TWEAK_ASSETS[this._msTweakAssetIndex]);
      console.log(`[MS-TWEAK] asset=${MS_TWEAK_ASSETS[this._msTweakAssetIndex]}`);
    };
    this._msTweakKeyVHandler = () => {
      if (this._msTweakMetaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this.outputAllMsTweakStates();
    };

    (this as any)._msTweakKeyFiveHandler = () => {
      if (this._msTweakMetaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this._dropdownPanel?.toggle();
    };
    this.scene.input.keyboard?.on("keydown-ONE", this._msTweakKeyOneHandler);
    this.scene.input.keyboard?.on("keydown-TWO", this._msTweakKeyTwoHandler);
    this.scene.input.keyboard?.on("keydown-THREE", this._msTweakKeyThreeHandler);
    this.scene.input.keyboard?.on("keydown-V", this._msTweakKeyVHandler);
    this.scene.input.keyboard?.on("keydown-FIVE", (this as any)._msTweakKeyFiveHandler);
    this._msTweakKeyHHandler = (event?: KeyboardEvent) => {
      if (event?.repeat) return;
      if (!Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) return;
      const wasActive = this._msTweakMetaMode !== TweakMetaMode.NONE;
      if (!wasActive) {
        this.scene.uiEditModeActive = true;
      }
      this._msTweakMetaMode = cycleMetaMode(this._msTweakMetaMode, TWEAK_META_CYCLE);
      const isActive = this._msTweakMetaMode !== TweakMetaMode.NONE;
      this.updateMsTweakHUD();
      if (isActive && !wasActive) {
        if (!this._msTweakListenersRegistered) {
          this.setupMsTweakKeyListeners();
        }
        this._dropdownPanel = new TweakDropdownPanel({
          scene: this.scene as BattleScene,
          coordSpace: "screen",
          getAnchorGameCoords: () => {
            const canvas = (this.scene as BattleScene).game.canvas;
            const rect = canvas.getBoundingClientRect();
            return { x: rect.left + 10, y: rect.top + 60 };
          },
          elements: MS_TWEAK_ASSETS,
          modes: MS_TWEAK_MODES,
          alphabeticalSort: true,
          elementGroups: MS_TWEAK_ASSET_GROUPS,
          onElementChange: (name, _idx) => {
            const correctIdx = MS_TWEAK_ASSETS.indexOf(name);
            this._msTweakAssetIndex = correctIdx >= 0 ? correctIdx : _idx;
            this.updateMsTweakHUD();
          },
          onModeChange: (_name, idx) => {
            this._msTweakMode = idx;
            this.updateMsTweakHUD();
          },
        });
        this._dropdownPanel.create();
        for (const sel of this._dropdownPanel.htmlSelects) {
          sel.addEventListener("mouseenter", () => {
            if (this._msTweakHudText) this._msTweakHudText.setVisible(true);
          });
          sel.addEventListener("mouseleave", () => {
            if (this._msTweakHudText) this._msTweakHudText.setVisible(false);
          });
        }
        this._msTweakBaselines.clear();
        this._cursorTweakBaselines.clear();
        for (let i = 0; i < MS_TWEAK_ASSETS.length; i++) {
          const name = MS_TWEAK_ASSETS[i];
          const cursorCtx = this.cursorAssetToContext(name);
          if (cursorCtx) {
            this._cursorTweakBaselines.set(name, { ...this._cursorTweaks[cursorCtx] });
            continue;
          }
          const t = this.getMsTweakTarget(i);
          if (t) {
            this._msTweakBaselines.set(name, {
              x: t.x ?? 0, y: t.y ?? 0,
              scaleX: Number.isFinite(t.scaleX) ? t.scaleX : 1,
              scaleY: Number.isFinite(t.scaleY) ? t.scaleY : 1,
              alpha: t.alpha ?? 1,
              displayWidth: t.displayWidth ?? 0,
              displayHeight: t.displayHeight ?? 0,
              fontSize: parseInt(t.style?.fontSize || "0", 10),
              color: t.style?.color || "",
              stroke: t.style?.stroke || "",
              strokeThickness: t.style?.strokeThickness ?? 0,
            } as any);
          }
        }
      } else if (!isActive && wasActive) {
        this.scene.uiEditModeActive = false;
        this.cleanupMsTweakKeyListeners();
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
        this._msTweakBaselines.clear();
        this._cursorTweakBaselines.clear();
      }
    };
    this.scene.input.keyboard?.on("keydown-H", this._msTweakKeyHHandler);
  }

  private cleanupMsTweakKeyListeners(): void {
    if (this._msTweakKeyOneHandler) {
      this.scene.input.keyboard?.off("keydown-ONE", this._msTweakKeyOneHandler);
      this._msTweakKeyOneHandler = null;
    }
    if (this._msTweakKeyTwoHandler) {
      this.scene.input.keyboard?.off("keydown-TWO", this._msTweakKeyTwoHandler);
      this._msTweakKeyTwoHandler = null;
    }
    if (this._msTweakKeyThreeHandler) {
      this.scene.input.keyboard?.off("keydown-THREE", this._msTweakKeyThreeHandler);
      this._msTweakKeyThreeHandler = null;
    }
    if (this._msTweakKeyVHandler) {
      this.scene.input.keyboard?.off("keydown-V", this._msTweakKeyVHandler);
      this._msTweakKeyVHandler = null;
    }
    if ((this as any)._msTweakKeyFiveHandler) {
      this.scene.input.keyboard?.off("keydown-FIVE", (this as any)._msTweakKeyFiveHandler);
      (this as any)._msTweakKeyFiveHandler = null;
    }
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
    this._msTweakListenersRegistered = false;
  }

  private updateMsTweakHUD(): void {
    if (!this._msTweakHudText) return;
    if (this._msTweakMetaMode === TweakMetaMode.NONE) {
      this._msTweakHudText.setVisible(false);
      return;
    }
    const modeName = MS_TWEAK_MODES[this._msTweakMode].toUpperCase();
    const assetName = MS_TWEAK_ASSETS[this._msTweakAssetIndex];
    if (this._msTweakMetaMode === TweakMetaMode.EDIT) {
      this._msTweakHudText.setText(
        i18next.t("modifierSelectUiHandler:tweakEditModeHud", { mode: modeName, asset: assetName })
      );
      this._msTweakHudText.setColor("#00FF00");
    } else if (this._msTweakMetaMode === TweakMetaMode.EDIT_TYPE) {
      this._msTweakHudText.setText(`EDIT TYPE SELECT - ${modeName}`);
      this._msTweakHudText.setColor("#FFD700");
    } else if (this._msTweakMetaMode === TweakMetaMode.ELEMENT) {
      this._msTweakHudText.setText(`ELEMENT SELECT - ${assetName}`);
      this._msTweakHudText.setColor("#40C8F8");
    }
  }

  private outputAllMsTweakStates(): void {
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];

    for (let i = 0; i < MS_TWEAK_ASSETS.length; i++) {
      const name = MS_TWEAK_ASSETS[i];
      const cursorCtx = this.cursorAssetToContext(name);

      if (cursorCtx) {
        const cfg = this._cursorTweaks[cursorCtx];
        const base = this._cursorTweakBaselines.get(name);
        if (cfg && base) {
          const dScale = cfg.scale - base.scale;
          const dX = cfg.offsetX - base.offsetX;
          const dY = cfg.offsetY - base.offsetY;
          const dA = cfg.alpha - base.alpha;
          const hasDelta = Math.abs(dScale) > 0.001 || Math.abs(dX) > 0.01 || Math.abs(dY) > 0.01 || Math.abs(dA) > 0.01;
          if (hasDelta) {
            changed.push(`${name}:\n  delta:    Δscale=${dScale >= 0 ? "+" : ""}${dScale.toFixed(3)} ΔoffsetX=${dX >= 0 ? "+" : ""}${dX.toFixed(2)} ΔoffsetY=${dY >= 0 ? "+" : ""}${dY.toFixed(2)} Δα=${dA >= 0 ? "+" : ""}${dA.toFixed(2)}\n  current:  scale=${cfg.scale.toFixed(3)} offsetX=${cfg.offsetX.toFixed(2)} offsetY=${cfg.offsetY.toFixed(2)} α=${cfg.alpha.toFixed(2)}\n  baseline: scale=${base.scale.toFixed(3)} offsetX=${base.offsetX.toFixed(2)} offsetY=${base.offsetY.toFixed(2)} α=${base.alpha.toFixed(2)}`);
          } else {
            unchanged.push(name);
          }
        }
        continue;
      }

      const target = this.getMsTweakTarget(i);
      if (!target) {
        unavailable.push(name);
        continue;
      }

      const baseline = this._msTweakBaselines.get(name);
      const x = target.x ?? 0;
      const y = target.y ?? 0;
      const sx = Number.isFinite(target.scaleX) ? target.scaleX : 1;
      const sy = Number.isFinite(target.scaleY) ? target.scaleY : 1;
      const dw = target.displayWidth ?? 0;
      const dh = target.displayHeight ?? 0;
      const a = target.alpha ?? 1;
      const fs = parseInt(target.style?.fontSize || "0", 10);
      const fsStr = fs > 0 ? ` fs=${fs}` : "";
      const _color = target.style?.color || "";
      const _stroke = target.style?.stroke || "";
      const _strokeW = target.style?.strokeThickness ?? 0;
      const _styleStr = _color ? ` color=${_color} stroke=${_stroke} strokeW=${_strokeW}` : "";

      if (baseline) {
        const dx = x - baseline.x;
        const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX;
        const dsy = sy - baseline.scaleY;
        const ddw = dw - (baseline as any).displayWidth;
        const ddh = dh - (baseline as any).displayHeight;
        const da = a - baseline.alpha;
        const dfs = fs - ((baseline as any).fontSize || 0);
        const _bColor = (baseline as any).color || "";
        const _bStroke = (baseline as any).stroke || "";
        const _bStrokeW = (baseline as any).strokeThickness ?? 0;
        const _sChanged = _color !== _bColor || _stroke !== _bStroke || _strokeW !== _bStrokeW;
        const hasDelta = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(ddw) > 0.5 || Math.abs(ddh) > 0.5 || Math.abs(da) > 0.001 || Math.abs(dfs) > 0 || _sChanged;
        const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
        const bfsStr = (baseline as any).fontSize > 0 ? ` fs=${(baseline as any).fontSize}` : "";
        const _bStyleStr = _bColor ? ` color=${_bColor} stroke=${_bStroke} strokeW=${_bStrokeW}` : "";

        if (hasDelta) {
          changed.push(`${name}:\n  delta:    Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}\n  current:  x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${_styleStr}\n  baseline: x=${baseline.x} y=${baseline.y} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${((baseline as any).displayWidth || 0).toFixed(1)} h=${((baseline as any).displayHeight || 0).toFixed(1)} α=${baseline.alpha.toFixed(2)}${bfsStr}${_bStyleStr}`);
        } else {
          unchanged.push(name);
        }
      } else {
        changed.push(`${name}: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${_styleStr} [no baseline]`);
      }
    }

    const sections: string[] = ["[MS-TWEAK-SNAPSHOT]", "NOTE: Use DELTA values for code adjustments. Do not paste current values directly as defaults."];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) { sections.push("\n── UNCHANGED ──"); sections.push(unchanged.join(", ")); }
    if (unavailable.length > 0) { sections.push("\n── UNAVAILABLE ──"); sections.push(unavailable.join(", ")); }
    const output = sections.join("\n");
    console.log(output);
    tweakCopyToClipboard(output);
  }

  clear(): void {
    if (!(this.scene as BattleScene).reroll) {
      this._condensePlayedThisSession = false;
    }
    if (this._trailHandle) {
      this._trailHandle.release();
      this._trailHandle = null;
    }

    this._lootAnimating = false;
    this._suppressNextTooltip = false;

    this.modifierContainer?.setVisible(false);

    this.eraseCursor();
    this.hideUpgradeTooltip();

    (this.scene as BattleScene).ui.setReplayHudSuppressed(false);
    this._msTweakMetaMode = TweakMetaMode.NONE;
    this.scene.uiEditModeActive = false;
    this._msTweakBaselines.clear();
    this.cleanupMsTweakKeyListeners();
    if (this._msTweakKeyHHandler) {
      this.scene.input.keyboard?.off("keydown-H", this._msTweakKeyHHandler);
      this._msTweakKeyHHandler = null;
    }
    if (this._msTweakHudText) {
      this._msTweakHudText.setVisible(false);
    }

    if (this.bgImage) {
      this.scene.tweens.killTweensOf(this.bgImage);
      this.bgImage.clearTint();
      if (!(this.scene as BattleScene).reroll) {
        if (this.bgImage.texture.key !== "modifier_ui_handler_bg" && this.scene.textures.exists("modifier_ui_handler_bg")) {
          this.bgImage.setTexture("modifier_ui_handler_bg");
          this.bgImage.setDisplaySize(
            this.scene.game.canvas.width / 6,
            this.scene.game.canvas.height / 6
          );
        }
      }
      if (!(this.scene as BattleScene).reroll) {
        this.scene.tweens.add({
          targets: this.bgImage,
          alpha: 0,
          duration: 250,
          ease: "Sine.easeIn",
          onComplete: () => {
            if (this.bgImage) this.bgImage.setVisible(false);
          },
        });
      }
    }

    if (this.shopStripContainer) {
      this.shopStripContainer.setVisible(false);
    }

    for (const icon of this.shopStripIcons) icon.destroy();
    for (const txt of this.shopStripPriceTexts) txt.destroy();
    for (const txt of this.shopStripNameTexts) txt.destroy();
    this.shopStripIcons = [];
    this.shopStripPriceTexts = [];
    this.shopStripNameTexts = [];

    for (const [, frame] of this.cardFrames) frame.destroy();
    for (const [, text] of this.cardSecondaryTexts) text.destroy();
    this.cardFrames.clear();
    this.cardSecondaryTexts.clear();

    if (!(this.scene as BattleScene).reroll) {
      for (const frame of this.buttonFrames) {
        frame.destroy();
      }
      this.buttonFrames = [];
    }

    for (const btnContainer of [
      this.rerollButtonContainer,
      this.permaRerollButtonContainer,
      this.transferButtonContainer,
      this.checkButtonContainer,
      this.lockRarityButtonContainer,
    ]) {
      if (!btnContainer) continue;
      const existingZone = btnContainer.getByName("btn-hit-zone");
      if (existingZone) btnContainer.remove(existingZone, true);
      btnContainer.disableInteractive();
      btnContainer.setVisible(false);
      btnContainer.setAlpha(0);
    }

    this.destroyPaginationArrows();
    this.pageIndex = 0;
    this.windowStart = 0;
    this._scrollAnimating = false;
    this.totalPages = 1;
    this.allTypeOptions = [];

    for (const t of this._lootRevealTimers) t.remove();
    this._lootRevealTimers = [];
    for (const t of this._pageAnimTimers) t.remove();
    this._pageAnimTimers = [];
    for (const v of this._shimmerVfx) { v.destroy(); }
    this._shimmerVfx = [];

    if ((this as any).headerDisplayContainer) this.scene.tweens.killTweensOf((this as any).headerDisplayContainer);
    if (this.shopStripContainer) this.scene.tweens.killTweensOf(this.shopStripContainer);
    for (const opt of this.options) {
      (opt as any).cancelEmberEffects?.();
      this.scene.tweens.killTweensOf(opt);
    }

    if (!(this.scene as BattleScene).reroll) {
      const sceneMoneyText = (this.scene as any).moneyText;
      if (sceneMoneyText) {
        sceneMoneyText.setVisible(true);
      }

      const biomeWaveText = (this.scene as any).biomeWaveText;
      if (biomeWaveText) {
        biomeWaveText.setVisible(true);
      }
    }

    super.clear();
    if ((this.scene as BattleScene).reroll && this.headerDisplayContainer) {
      this.headerDisplayContainer.setVisible(true);
      this.headerDisplayContainer.setAlpha(1);
    }
  }

  public getButtonLayout(): Array<{x: number, y: number, descKey: string}> {
    const layout: Array<{x: number, y: number, descKey: string}> = [];
    const barY = LootRewardSelectUiHandler.BAR_Y;
    const LEFT_MARGIN = LootRewardSelectUiHandler.BAR_LEFT_MARGIN;
    const RIGHT_MARGIN = LootRewardSelectUiHandler.BAR_RIGHT_MARGIN;
    const screenW = this.scene.game.canvas.width / 6;

    if (this.rerollButtonContainer?.visible) {
      layout.push({ x: LEFT_MARGIN, y: barY, descKey: "modifierSelectUiHandler:rerollDesc" });
    }

    if (this.permaRerollButtonContainer?.visible) {
      layout.push({ x: LEFT_MARGIN + LootRewardSelectUiHandler.REROLL_SLOT_W, y: barY, descKey: "modifierSelectUiHandler:permaRerollDesc" });
    }

    if (this.transferButtonContainer?.visible) {
      layout.push({
        x: screenW - 22,
        y: barY,
        descKey: "modifierSelectUiHandler:transferDesc"
      });
    }

    if (this.checkButtonContainer?.visible) {
      layout.push({ x: screenW - 45.5, y: barY, descKey: "modifierSelectUiHandler:checkTeamDesc" });
    }

    if (this.lockRarityButtonContainer?.visible) {
      layout.push({ x: LEFT_MARGIN, y: barY - 10, descKey: "modifierSelectUiHandler:lockRaritiesDesc" });
    }

    return layout;
  }

  protected getMainOptionsYOffset(shopTypeOptions: ModifierTypeOption[] | null): number {
    return 16.5;
  }

  private _interactivesDisabledForOverlay = false;

  public disableShopInteractives(): void {
    if (this._interactivesDisabledForOverlay) return;
    this._interactivesDisabledForOverlay = true;
    this.options?.forEach(opt => opt?.disableInteractive());
    this.shopStripIcons?.forEach(icon => icon?.disableInteractive());
    this.rerollButtonContainer?.disableInteractive();
    this.permaRerollButtonContainer?.disableInteractive();
    this.lockRarityButtonContainer?.disableInteractive();
    this.transferButtonContainer?.disableInteractive();
    this.checkButtonContainer?.disableInteractive();
    this.leftArrow?.disableInteractive();
    this.rightArrow?.disableInteractive();
  }

  public enableShopInteractives(): void {
    if (!this._interactivesDisabledForOverlay) return;
    this._interactivesDisabledForOverlay = false;
    const enableObj = (obj: Phaser.GameObjects.GameObject | null | undefined) => {
      if (obj?.input) obj.input.enabled = true;
    };
    this.options?.forEach(opt => enableObj(opt));
    this.shopStripIcons?.forEach(icon => enableObj(icon));
    enableObj(this.rerollButtonContainer);
    enableObj(this.permaRerollButtonContainer);
    enableObj(this.lockRarityButtonContainer);
    enableObj(this.transferButtonContainer);
    enableObj(this.checkButtonContainer);
    enableObj(this.leftArrow);
    enableObj(this.rightArrow);
  }
}