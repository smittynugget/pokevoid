import BattleScene from "../battle-scene";
import {
    getPlayerShopModifierTypeOptionsForWave,
    ModifierTypeOption,
    TmModifierType,
    AddPokemonModifierType,
    PermaModifierType,
    AnyTmModifierType, AnyAbilityModifierType, AnyPassiveAbilityModifierType, PermaPartyAbilityModifierType,
    MoveUpgradeModifierType,
    PokemonAltBuildModifierType,
    TypeSwitcherModifierType,
    AbilitySwitcherModifierType,
    RandomStatSwitcherModifierType,
    EvolutionItemModifierType,
    FormChangeItemModifierType,
    PokemonNatureChangeModifierType,
    StatSacrificeModifierType,
    MoveSacrificeModifierType,
    PokemonBaseStatBoosterModifierType,
    PlayerPokemonBaseStatBoosterModifierType,
    ChampionPokemonStatBoosterModifierType,
    TypeSacrificeModifierType,
    AbilitySacrificeModifierType,
    PassiveAbilitySacrificeModifierType,
    RememberMoveModifierType,
    FusePokemonModifierType,
    ModifierType,
    ForbiddenFormUnlockModifierType,
    TrainerBondAbilityModifierType,
    YuTmModifierType,
    TeraAbilityModifierType,
    AddPokeballModifierType,
    AddTypeBallModifierType,
    getDisabledModifierIds,
    QuestModifierType,
    QuestModifierTypeGenerator,
    FORBIDDEN_FORM_REWARDTYPE_TO_FORMKEY,
    TerastallizeModifierType,
    SkillTreeTokenRewardModifierType
} from "../modifier/modifier-type";
import { TrainerType } from "#enums/trainer-type";
import { trainerConfigs } from "../data/trainer-config";
import { applyTypeBallRecolor, applyVoidBallRecolor, getPokeballAtlasKey, getPokeballCatchMultiplier, getPokeballName, PokeballType } from "../data/pokeball";
import { getTypeRgb } from "../data/type";
import { getVariantIcon, getVariantTint } from "../data/variant";
import { addTextObject, getTextStyleOptions, getModifierTierTextTint, getTextColor, TextStyle, addBBCodeTextObject, getBBCodeFrag } from "./text";
import { addWindow } from "./ui-theme";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { Mode } from "./mode";
import { LockModifierTiersModifier, PokemonHeldItemModifier, PersistentModifier, MoveUpgradeModifier, CollectedTypeModifier, PokemonFormChangeItemModifier, PokemonAltBuildModifier, TerastallizeModifier, AbilitySwitcherModifier, TypeSwitcherModifier, AnyAbilityModifier, TypeSacrificeModifier, AbilitySacrificeModifier, PassiveAbilitySacrificeModifier, AnyPassiveAbilityModifier, MoveSacrificeModifier, PermaQuestModifier, PermaRunQuestModifier, PermaWinQuestModifier, PermaPartyAbilityModifier, PermaCollectedTypeModifier } from "../modifier/modifier";
import { ModifierTier } from "../modifier/modifier-tier";
import { allAbilities } from "../data/ability";
import { Abilities } from "../enums/abilities";
import { FormChangeItem } from "../enums/form-change-items";
import { Stat, getStatName } from "../data/pokemon-stat";
import { Nature, getNatureName, getNatureStatMultiplier } from "../data/nature";
import { pokemonFormChanges, SpeciesFormChangeItemTrigger } from "../data/pokemon-forms";
import { pokemonEvolutions } from "../data/pokemon-evolutions";
import { PlayerPokemon } from "../field/pokemon";
import PokemonData from "../system/pokemon-data";
import { MoveUpgradeTooltipUtils } from "./move-upgrade-tooltip";
import { ModifierTooltipUtils } from "./modifier-tooltip-utils";
import { MoveUpgrade } from "../data/move-upgrade";
import { Moves } from "../enums/moves";
import { handleTutorial, Tutorial } from "../tutorial";
import {Button} from "../enums/buttons";
import DynamicMoveInfoOverlay from "./dynamic-move-info-overlay";
import Move, { allMoves, MoveCategory, MoveFlags, MoveAttr, MoveCondition, MultiHitAttr, FlinchAttr, RecoilAttr, SacrificialAttr, HalfSacrificialAttr, SacrificialAttrOnHit, HealAttr, HitHealAttr, HighCritAttr, CritOnlyAttr, ChargeAttr, StatusEffectAttr, MultiStatusEffectAttr, StatChangeAttr, MultiHitType, RemoveHeldItemAttr, StealHeldItemChanceAttr, ConfuseAttr, AddBattlerTagAttr, WeatherChangeAttr, ClearWeatherAttr, TerrainChangeAttr, ClearTerrainAttr, AddArenaTrapTagAttr, AddArenaTrapTagUpgradeAttr, MatchUserTypeAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, TypelessAttr, AnyTypeSuperEffectTypeMultiplierAttr, GyroBallPowerAttr, ElectroBallPowerAttr, WeightPowerAttr, CompareWeightPowerAttr, HpPowerAttr, LowHpPowerAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, TerrainMovePriorityAttr, FirstTurnPriorityAttr, ForceSwitchOutAttr, SurviveDamageAttr, TrapAttr, FixedDamageAttr, LevelDamageAttr, TargetHalfHpDamageAttr, IgnoreOpponentStatChangesAttr, RemoveScreensAttr } from "../data/move";
import { Type } from "../data/type";
import * as Utils from "./../utils";
import { createSporadicPattern, getUpgradeRarityFromTier, getUpgradeRarityColors } from "./../utils";
import { UpgradeCategory, UpgradeCategoryUtils } from "../enums/upgrade-category";
import { SkillTreeRarity } from "../system/skill-tree-data";
import Overrides from "../overrides";
import i18next from "i18next";
import { ShopCursorTarget } from "../enums/shop-cursor-target";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { ConditionalPriorityAttr, IncrementMovePriorityAttr } from "../data/move";
import { BattleStat, getBattleStatName } from "../data/battle-stat";
import { StatusEffect, getStatusEffectMessageKey } from "../data/status-effect";
import { BattlerTagType } from "../enums/battler-tag-type";
import { ArenaTagType } from "../enums/arena-tag-type";
import { WeatherType } from "../data/weather";
import { TerrainType } from "../data/terrain";
import { ChargeAnim } from "../data/battle-anims";
import PartyUiHandler, { PartyUiMode } from "./party-ui-handler";
import { ChampionUtils } from "#app/system/champion-utils.js";
import { getFusedSpeciesName, getPokemonSpecies, adjustDuelmonIconScale, isGlitchFormKey, isSmittyFormKey } from "#app/data/pokemon-species.js";
import { calculateAltBuildStatsWithSwapping } from "#app/data/alt-build-stat-calculator.js";
import { SkillTreeMode } from "#app/phases/skill-tree-phase";
import { SkillTreeRewardType } from "#app/system/skill-tree-data.js";
import { RewardType } from "#enums/reward-type";
import type { QuestUnlockData } from "#app/system/game-data";
import { SettingKeys } from "#app/system/settings/settings.js";
import { getTypeStatPreferences, TYPE_STAT_PREFERENCES } from "../system/type-stat-preferences";
import { Device } from "../enums/devices";
import { SpeciesFormKey } from "../enums/species-form-key";
import { Species } from "#enums/species";
import { RunDuration } from "#enums/quest-type-conditions";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";
import { isPrimaryPointer } from "./pointer-utils";

export const SHOP_OPTIONS_ROW_LIMIT = 12;
const ALT_SPEEDUP = 0.425;

export interface ModifierSelectDisplayConfig {
  title?: string;
  subtitle?: string;
  hideShop?: boolean;
  layout?: string;
  customShopStrip?: boolean;
  checkTeamOnly?: boolean;
}

export default class ModifierSelectUiHandler extends AwaitableUiHandler {
  protected modifierContainer: Phaser.GameObjects.Container;
  protected rerollButtonContainer: Phaser.GameObjects.Container;
  protected permaRerollButtonContainer: Phaser.GameObjects.Container;
  protected lockRarityButtonContainer: Phaser.GameObjects.Container;
  protected transferButtonContainer: Phaser.GameObjects.Container;
  protected checkButtonContainer: Phaser.GameObjects.Container;
  protected rerollCostText: Phaser.GameObjects.Text;
  protected permaRerollCostText: Phaser.GameObjects.Text;
  protected lockRarityButtonText: Phaser.GameObjects.Text;
  protected moveInfoOverlay : DynamicMoveInfoOverlay;
  private moveInfoOverlayActive : boolean = false;
  protected rerollSuppressed : boolean = false;
  protected _shopRevealTimer: Phaser.Time.TimerEvent | null = null;
  protected _buttonRevealTimer: Phaser.Time.TimerEvent | null = null;
  protected _optionRevealTween: Phaser.Tweens.Tween | null = null;
  private tooltipDeferredUntilUserInput: boolean = false;
  protected firstFocusPending: boolean = false;

  private upgradeTooltipContainer: Phaser.GameObjects.Container | null = null;
  private shinyPowerStatsContainer: Phaser.GameObjects.Container | null = null;
  private upgradeTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private upgradeTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private upgradeTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private upgradeTooltipTitle: Phaser.GameObjects.Text | null = null;
  private upgradeTooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private upgradeTooltipBody: BBCodeText | null = null;

  private showDetailsHintContainer: Phaser.GameObjects.Container | null = null;
  private showDetailsHintKeySprite: Phaser.GameObjects.Sprite | null = null;
  private showDetailsHintLabel: Phaser.GameObjects.Text | null = null;

  protected displayConfig: ModifierSelectDisplayConfig | undefined;
  protected storedUIMode: Mode = Mode.MODIFIER_SELECT;
  protected headerDisplayContainer: Phaser.GameObjects.Container | null = null;
  protected headerTitleText: Phaser.GameObjects.Text | null = null;
  protected headerSubtitleText: Phaser.GameObjects.Text | null = null;
  protected headerShinyIcon: Phaser.GameObjects.Sprite | null = null;

  private partyDetailsActive: boolean = false;
  private partyDetailsIndex: integer = 0;
  private partyDetailsPartnerIndex: integer = 0;
  private fusionPreviewHighlightIndex: integer = -1;
  private partyDetailsHeaderLines: string[] = [];
  private partyDetailsPartyLines: string[] = [];
  private partyDetailsParty: PlayerPokemon[] = [];
  private partyDetailsRarity: SkillTreeRarity | null = null;
  private partyDetailsContext: { kind: "STAT_SWITCHER"; stat1: Stat; stat2: Stat } | { kind: "MINT"; targetNature: Nature } | { kind: "STAT_SACRIFICE"; stat: Stat } | { kind: "MOVE_SACRIFICE" } | { kind: "FUSION" } | { kind: "BASE_STAT_BOOST"; stat: Stat; multiplier: number } | { kind: "SOUL_DEW" } | { kind: "SECTION_RELAY" } | null = null;
  private currentModifierContext: string | null = null;
  private currentModifierSections: any[] | null = null;
  private partyDetailsMainTooltipHeight: number = 0;
  private partyDetailsButton: Phaser.GameObjects.Container | null = null;
  private partyBackButton: Phaser.GameObjects.Container | null = null;

  private moveUpgradeDetailsActive: boolean = false;
  private moveUpgradePreviewTier: number = 1;
  private moveUpgradeCurrentTier: number = 1;
  private moveUpgradePreviewMaxTier: number = 1;
  private moveUpgradePreviewCategory: UpgradeCategory | null = null;
  private moveUpgradePreviewMoveId: Moves | null = null;
  private moveUpgradePreviewMoveName: string | null = null;
  private moveUpgradeLastType: MoveUpgradeModifierType | null = null;
  private moveUpgradeDetailsButton: Phaser.GameObjects.Container | null = null;
  private moveUpgradeBackButton: Phaser.GameObjects.Container | null = null;
  private moveUpgradeNavContainer: Phaser.GameObjects.Container | null = null;

  private forbiddenFormDetailsActive: boolean = false;
  private forbiddenFormDetailsAbilityIndex: integer = 0;
  private altBuildAbilityIndex: number = 0;
  private forbiddenFormDetailsType: ForbiddenFormUnlockModifierType | null = null;

  private tooltipSectionPageIndex: number = 0;

  private forbiddenFormDetailsTooltipContainer: Phaser.GameObjects.Container | null = null;
  private _forbiddenFormDetailsPattern: ModalBackgroundHandle | null = null;
  private forbiddenFormDetailsTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private forbiddenFormDetailsTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private forbiddenFormDetailsTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private forbiddenFormDetailsTooltipTitle: Phaser.GameObjects.Text | null = null;
  private forbiddenFormDetailsTooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private forbiddenFormDetailsTooltipBody: BBCodeText | null = null;
  private forbiddenFormDetailsNavContainer: Phaser.GameObjects.Container | null = null;
  private forbiddenFormDetailsNavLabel: Phaser.GameObjects.Text | null = null;

  private partyDetailsTooltipContainer: Phaser.GameObjects.Container | null = null;
  private _partyDetailsPattern: ModalBackgroundHandle | null = null;
  private partyDetailsTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private partyDetailsTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private partyDetailsTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private partyDetailsTooltipTitle: Phaser.GameObjects.Text | null = null;
  private partyDetailsTooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private partyDetailsTooltipBody: BBCodeText | null = null;
  private partyDetailsNavContainer: Phaser.GameObjects.Container | null = null;
  private partyDetailsNavLabel: Phaser.GameObjects.Text | null = null;
  private partyDetailsFusionContent: Phaser.GameObjects.Container | null = null;
  private partyDetailsRelayContent: Phaser.GameObjects.Container | null = null;
  private partyDetailsTypeBadges: Phaser.GameObjects.Sprite[] = [];
  private fusionTitleLeftArrow: Phaser.GameObjects.Image | null = null;
  private fusionTitleRightArrow: Phaser.GameObjects.Image | null = null;

  private readonly TOOLTIP_WIDTH = 120;
  private readonly TOOLTIP_OFFSET_X = 4;
  private readonly TOOLTIP_TITLE_BAR_HEIGHT = 12;
  private readonly TOOLTIP_RARITY_BAR_HEIGHT = 6;

  private tooltipCache: Map<string, {text: string, multiHitWarning: boolean, secondaryEffectNote: boolean, flinchWarning: boolean}> = new Map();

  protected rowCursor: integer = 0;
  protected player: boolean;
  private rerollCost: integer;
  private permaRerollCost: integer;
  private transferButtonWidth: integer;
  private checkButtonWidth: integer;

  public options: ModifierOption[];
  public shopOptionsRows: ModifierOption[][];
  private lastDenseFocusedOption: ModifierOption | null = null;
  private lastChipFocusedOption: ModifierOption | null = null;
  private focusedOptionPanelBg: Phaser.GameObjects.Graphics | null = null;
  private showDetailsHintBg: Phaser.GameObjects.Graphics | null = null;
  private focusLabelDetailsBg: Phaser.GameObjects.Graphics | null = null;

  protected cursorObj: Phaser.GameObjects.Image | null;

  protected forcedDraftSelection: boolean = false;
  public allowSkip: boolean = false;
  private multiHitWarning: boolean = false;
  private secondaryEffectNote: boolean = false;
  private flinchWarning: boolean = false;
  private lineCount: integer = 0;

  private storedModifierSelectCallback: Function | null = null;
  private storedTypeOptions: any[] | null = null;
  private storedRerollCost: any | null = null;
  private storedDraftOnly: boolean = false;
  private removalReturnMenu: (() => void) | null = null;

  protected patternOverlay: Phaser.GameObjects.Container | null = null;
  protected patternCreated: boolean = false;

  constructor(scene: BattleScene) {
    super(scene, Mode.CONFIRM);

    this.options = [];
    this.shopOptionsRows = [];
  }

  setup() {
    const ui = this.getUi();

    this.modifierContainer = this.scene.add.container(0, 0);
    ui.add(this.modifierContainer);
    this.focusedOptionPanelBg = this.scene.add.graphics();
    this.modifierContainer.addAt(this.focusedOptionPanelBg, 0);
    this.focusLabelDetailsBg = this.scene.add.graphics();
    this.modifierContainer.add(this.focusLabelDetailsBg);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const styleOptions = getTextStyleOptions(TextStyle.PARTY, (this.scene as BattleScene).uiTheme).styleOptions;

    if (context) {
      context.font = styleOptions.fontSize + "px " + styleOptions.fontFamily;
      this.transferButtonWidth = context.measureText(i18next.t("modifierSelectUiHandler:transfer")).width;
      this.checkButtonWidth = context.measureText(i18next.t("modifierSelectUiHandler:checkTeam")).width;
    }

    this.transferButtonContainer = this.scene.add.container((this.scene.game.canvas.width - this.checkButtonWidth) / 6 - 55, -64);
    this.transferButtonContainer.setName("transfer-btn");
    this.transferButtonContainer.setVisible(false);
    ui.add(this.transferButtonContainer);

    const transferButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:transfer"), TextStyle.PARTY, { fontSize: "38px" });
    transferButtonText.setName("text-transfer-btn");
    transferButtonText.setOrigin(1, 0);
    this.transferButtonContainer.add(transferButtonText);

    this.checkButtonContainer = this.scene.add.container((this.scene.game.canvas.width) / 6 - 1, -64);
    this.checkButtonContainer.setName("use-btn");
    this.checkButtonContainer.setVisible(false);
    ui.add(this.checkButtonContainer);

    const checkButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:checkTeam"), TextStyle.PARTY, { fontSize: "38px" });
    checkButtonText.setName("text-use-btn");
    checkButtonText.setOrigin(1, 0);
    this.checkButtonContainer.add(checkButtonText);

    this.rerollButtonContainer = this.scene.add.container(16, -64);
    this.rerollButtonContainer.setName("reroll-brn");
    this.rerollButtonContainer.setVisible(false);
    ui.add(this.rerollButtonContainer);

    const rerollButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:reroll"), TextStyle.PARTY, { fontSize: "38px" });
    rerollButtonText.setName("text-reroll-btn");
    rerollButtonText.setOrigin(0, 0);
    this.rerollButtonContainer.add(rerollButtonText);

    this.rerollCostText = addTextObject(this.scene, 0, 0, "", TextStyle.MONEY, { fontSize: "38px" });
    this.rerollCostText.setName("text-reroll-cost");
    this.rerollCostText.setOrigin(0, 0);
    this.rerollCostText.setPositionRelative(rerollButtonText, rerollButtonText.displayWidth + 1, 0);
    this.rerollButtonContainer.add(this.rerollCostText);

    this.permaRerollButtonContainer = this.scene.add.container(16, -64);
    this.permaRerollButtonContainer.setVisible(false);
    ui.add(this.permaRerollButtonContainer);

    const permaRerollButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:reroll"), TextStyle.PARTY, { fontSize: "38px" });
    permaRerollButtonText.setOrigin(0, 0);
    this.permaRerollButtonContainer.add(permaRerollButtonText);

    this.permaRerollCostText = addTextObject(this.scene, 0, 0, "", TextStyle.MONEY, { fontSize: "38px" });
    this.permaRerollCostText.setName("text-permaReroll-cost");
    this.permaRerollCostText.setOrigin(0, 0);
    this.permaRerollCostText.setPositionRelative(permaRerollButtonText, permaRerollButtonText.displayWidth + 1, 0);
    this.permaRerollButtonContainer.add(this.permaRerollCostText);

    this.lockRarityButtonContainer = this.scene.add.container(16, -64);
    this.lockRarityButtonContainer.setVisible(false);
    ui.add(this.lockRarityButtonContainer);

    this.lockRarityButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:lockRarities"), TextStyle.PARTY, { fontSize: "38px" });
    this.lockRarityButtonText.setOrigin(0, 0);
    this.lockRarityButtonContainer.add(this.lockRarityButtonText);

    const overlayScale = 1;
    this.moveInfoOverlay = new DynamicMoveInfoOverlay(this.scene, {
      delayVisibility: true,
      scale: overlayScale,
      onSide: true,
      right: true,
      x: 1,
      y: -DynamicMoveInfoOverlay.getHeight(overlayScale, true) -1,
      width: (this.scene.game.canvas.width / 6) - 2,
    });
    ui.add(this.moveInfoOverlay);
    this.scene.addInfoToggle(this.moveInfoOverlay);
  }

  show(args: any[]): boolean {
    this.scene.disableMenu = false;

    if (this.active) {
      if (args.length >= 3) {
        this.awaitingActionInput = true;
        this.onActionInput = args[2];
      }
      this.resumeFromOverlay();
      this.moveInfoOverlay.active = this.moveInfoOverlayActive;
      return false;
    }

    if (args.length < 5 || !(args[1] instanceof Array) || !args[1].length || !(args[2] instanceof Function)) {
      return false;
    }

    super.show(args);

    this.getUi().clearText();
    this.getUi().hideMessageChrome();

    this.player = args[0];
    this.forcedDraftSelection = args[4] as boolean;
    this.allowSkip = false;
    const displayConfig = args[5] as { title?: string; subtitle?: string; hideShop?: boolean; layout?: string } | undefined;
    this.displayConfig = displayConfig;
    if (displayConfig?.title) {
      this.showHeaderDisplay(displayConfig.title, displayConfig.subtitle);
    } else {
      this.hideHeaderDisplay();
    }

    if (displayConfig?.hideShop) {
      const msgHandler = this.scene.ui.getMessageHandler() as any;
      if (msgHandler?.bg) {
        msgHandler.bg.setVisible(false);
      }
      if (msgHandler?.messageContainer) {
        msgHandler.messageContainer.setVisible(false);
      }
      const fullHeight = this.scene.game.canvas.height / 6;
      (this.scene as BattleScene).shopOverlay.setSize(this.scene.game.canvas.width / 6, fullHeight);
      (this.scene as BattleScene).shopOverlay.setPosition(0, -fullHeight);
      this.tooltipDeferredUntilUserInput = !(displayConfig?.checkTeamOnly);
    }

    const hasTransferableItems = this.player && !!this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length;
    const hasRemovableItems = this.getMoveUpgradeModifiersCount() > 0 || this.getRemovableHeldItemModifiers().length > 0 || this.getRemovablePermaModifiers().length > 0;
    const canLockRarities = !!this.scene.findModifier(m => m instanceof LockModifierTiersModifier);

    this.transferButtonContainer.setVisible(false);
    this.transferButtonContainer.setAlpha(0);

    this.checkButtonContainer.setVisible(false);
    this.checkButtonContainer.setAlpha(0);

    this.rerollButtonContainer.setVisible(false);
    this.rerollButtonContainer.setAlpha(0);

    this.permaRerollButtonContainer.setVisible(false);
    this.permaRerollButtonContainer.setAlpha(0);

    this.lockRarityButtonContainer.setVisible(false);
    this.lockRarityButtonContainer.setAlpha(0);

    this.rerollButtonContainer.setPositionRelative(this.lockRarityButtonContainer, 0, canLockRarities ? -12 : 0);

    this.permaRerollButtonContainer.setPositionRelative(this.rerollButtonContainer, 70, 0);

    if (typeof args[3] === 'object' && args[3] !== null && 'rerollCost' in args[3] && 'permaRerollCost' in args[3]) {
      this.rerollCost = args[3].rerollCost;
      this.permaRerollCost = args[3].permaRerollCost;
    } else {
      this.rerollCost = args[3] as integer;
      this.permaRerollCost = 5000;
    }

    this.updateRerollCostText();
    this.updatePermaRerollCostText();

    const typeOptions = args[1] as ModifierTypeOption[];
    const shopTypeOptions = this.getShopTypeOptions();
    const optionsYOffset = this.getMainOptionsYOffset(shopTypeOptions);

    for (let m = 0; m < typeOptions.length; m++) {
      const option = this.createModifierOption(typeOptions, m, optionsYOffset);
      option.setScale(0.5);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    if (shopTypeOptions && !this.forcedDraftSelection) {
      for (let m = 0; m < shopTypeOptions.length; m++) {
        const shopLayout = this.getShopLayout();
        const row = m < shopLayout.itemsPerRow ? 0 : 1;
        const col = m < shopLayout.itemsPerRow ? m : m - shopLayout.itemsPerRow;
        const rowOptions = shopTypeOptions.slice(row ? shopLayout.itemsPerRow : 0, row ? undefined : shopLayout.itemsPerRow);
        const sliceWidth = (this.scene.game.canvas.width / 6.5) / (rowOptions.length + 1.5);
        const option = new ModifierOption(this.scene, sliceWidth * (col + 1) + (sliceWidth * 0.5) + 5, ((-this.scene.game.canvas.height / 12) - (this.scene.game.canvas.height / 32) - (40 - (28 * row - 1))), shopTypeOptions[m], true);
        option.setScale(0.525);
        this.scene.add.existing(option);
        this.modifierContainer.add(option);

        if (this.displayConfig?.customShopStrip) {
          option.setVisible(false);
        }

        if (row >= this.shopOptionsRows.length) {
          this.shopOptionsRows.push([]);
        }
        this.shopOptionsRows[row].push(option);
      }
    }

    const isPathContext = this.scene.pathNodeContext !== null || this.scene.skillTreeModifierContext;
    const pathSpeedMultiplier = isPathContext ? 0.833 : 1.0;

    const getPathAdjustedDuration = (duration: integer): integer => {
      const adjustedDuration = Math.floor(duration * pathSpeedMultiplier);
      const raw: any = Utils.rewardSpeedHandler(adjustedDuration);
      const ms = typeof raw === "number" ? raw : (typeof raw?.value === "number" ? raw.value : adjustedDuration);
      return ms as unknown as integer;
    };

    const maxUpgradeCount = typeOptions.map(to => to.upgradeCount).reduce((max, current) => Math.max(current, max), 0);
    const effectiveUpgradeCount = isPathContext ? 0 : maxUpgradeCount;

    this.scene.getModifierBar().updateModifiers(this.scene.modifiers, true);

    this.scene.getModifierBar().getAll().forEach((icon: any) => {
      icon.setAlpha(0.1);
      if (typeof icon.disableInteractive === "function") icon.disableInteractive();
    });
    this.scene.getModifierBar(true).getAll().forEach((icon: any) => {
      icon.setAlpha(0.1);
      if (typeof icon.disableInteractive === "function") icon.disableInteractive();
    });
    this.scene.ui.permaModifierBar.getAll().forEach((icon: any) => {
      icon.setAlpha(0.1);
      if (typeof icon.disableInteractive === "function") icon.disableInteractive();
    });

    if (!this.displayConfig?.customShopStrip) {
      this.scene.showShopOverlay(750 * this.scene.gameSpeed);
    }
    if (!this.displayConfig?.customShopStrip) {
      this.scene.updateBiomeWaveText();
      this.scene.updateMoneyText();
    }

    if (!this.displayConfig?.customShopStrip) {
      const shopOverlayRef = (this.scene as any).shopOverlay;
      if (shopOverlayRef) {
        const moneyText = (this.scene as any).moneyText;
        if (moneyText) {
          this.scene.fieldUI.moveAbove(moneyText, shopOverlayRef);
        }
        const biomeWaveText = (this.scene as any).biomeWaveText;
        if (biomeWaveText) {
          this.scene.fieldUI.moveAbove(biomeWaveText, shopOverlayRef);
        }
      }
    }

    if (!this.patternCreated) {
      this.patternOverlay = this.scene.add.container(0, 0);
      this.scene.fieldUI.add(this.patternOverlay);
      const shopOverlay = (this.scene as any).shopOverlay;
      if (shopOverlay) {
        this.scene.fieldUI.moveAbove(this.patternOverlay, shopOverlay);
      }
      createSporadicPattern(this.scene, this.patternOverlay);
      this.patternCreated = true;
    }

    if (this.patternOverlay) {
      this.patternOverlay.setVisible(true);
      this.patternOverlay.setAlpha(0);
      this.patternOverlay.setPosition(0, -this.scene.game.canvas.height / 6);
      this.scene.tweens.add({
        targets: this.patternOverlay,
        alpha: 1,
        duration: 750 * this.scene.gameSpeed,
        ease: "Sine.easeOut"
      });
    }

    let i = 0;

    this._optionRevealTween = this.scene.tweens.addCounter({
      ease: "Sine.easeIn",
      duration: getPathAdjustedDuration(1250),
      onUpdate: t => {
        const value = t.getValue();
        const index = Math.floor(value * typeOptions.length);
        if (index > i && index <= typeOptions.length) {
          const option = this.options[i];
          const remaining = Math.floor((1 - value) * 1250) * 0.325 + 2000 * effectiveUpgradeCount;
          const upgradeOffset = -(effectiveUpgradeCount - typeOptions[i].upgradeCount);
          option?.show(remaining as unknown as integer, upgradeOffset as unknown as integer);
          i++;
        }
      }
    });

    this._shopRevealTimer = this.scene.time.delayedCall(getPathAdjustedDuration(1000 + effectiveUpgradeCount * 2000), () => {
      if (!this.displayConfig?.customShopStrip) {
        for (const shopOption of this.shopOptionsRows.flat()) {
          shopOption.show(0, 0);
        }
      }
    });

    this._buttonRevealTimer = this.scene.time.delayedCall(getPathAdjustedDuration(4000 + effectiveUpgradeCount * 2000), () => {
      const checkTeamOnly = !!this.displayConfig?.checkTeamOnly;
      const hideAllButtons = !!this.displayConfig?.hideShop && !checkTeamOnly;

      if (!hideAllButtons && !checkTeamOnly && !this.scene.gameData?.tutorialOnboardActive && (hasTransferableItems || hasRemovableItems)) {
        this.transferButtonContainer.setAlpha(0);
        this.transferButtonContainer.setVisible(true);
        this.scene.tweens.add({
          targets: this.transferButtonContainer,
          alpha: 1,
          duration: getPathAdjustedDuration(250)
        });
      }

      if (!hideAllButtons || checkTeamOnly) {
        this.checkButtonContainer.setAlpha(0);
        this.checkButtonContainer.setVisible(true);

        if (!checkTeamOnly) {
          this.rerollButtonContainer.setAlpha(0);
          this.permaRerollButtonContainer.setAlpha(0);
          this.lockRarityButtonContainer.setAlpha(0);
          this.rerollButtonContainer.setVisible(!this.rerollSuppressed);
          this.permaRerollButtonContainer.setVisible(!this.forcedDraftSelection && !this.rerollSuppressed);
          this.lockRarityButtonContainer.setVisible(canLockRarities && !this.rerollSuppressed);
        }

        const tweenTargets = checkTeamOnly
          ? [this.checkButtonContainer]
          : [this.rerollButtonContainer, this.permaRerollButtonContainer, this.lockRarityButtonContainer, this.checkButtonContainer];

        this.scene.tweens.add({
          targets: tweenTargets,
          alpha: 1,
          duration: getPathAdjustedDuration(250)
        });
      }

      const updateCursorTarget = () => {
        if (this.displayConfig?.hideShop) {
          this.setRowCursor(1);
          this.setCursor(0);
          return;
        }
        if (this.scene.shopCursorTarget === ShopCursorTarget.CHECK_TEAM) {
          this.setRowCursor(0);
          const buttonLayout = this.getButtonLayout();
          const checkTeamIndex = buttonLayout.findIndex(btn => btn.descKey === "modifierSelectUiHandler:checkTeamDesc");
          this.setCursor(checkTeamIndex >= 0 ? checkTeamIndex : 2);
        } else {
          this.setRowCursor(this.scene.shopCursorTarget);
          this.setCursor(0);
        }
      };

      updateCursorTarget();

      handleTutorial(this.scene, Tutorial.Select_Item).then((res) => {
        if (res) {
          updateCursorTarget();
        }
        this.awaitingActionInput = true;
        this.onActionInput = args[2];
        const allOptions = this.options.concat(this.shopOptionsRows.flat());
        const hidden = allOptions.filter(o => !o.isRevealed());
        if (hidden.length) {
          hidden.forEach(o => o.forceReveal());
        }
      });
    });

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    if (!this.awaitingActionInput) {
      return false;
    }

    let success = false;

    if (this.moveUpgradeDetailsActive) {
      switch (button) {
        case Button.LEFT:
          if (this.moveUpgradePreviewTier > this.moveUpgradeCurrentTier) {
            this.moveUpgradePreviewTier--;
            this.showMoveUpgradeTierPreviewTooltip();
            ui.playSelect();
          }
          return true;
        case Button.RIGHT:
          if (this.moveUpgradePreviewTier < this.moveUpgradePreviewMaxTier) {
            this.moveUpgradePreviewTier++;
            this.showMoveUpgradeTierPreviewTooltip();
            ui.playSelect();
          }
          return true;
        case Button.CANCEL:
        case Button.STATS:
          this.exitMoveUpgradeDetailsMode();
          ui.playSelect();
          return true;
        default:
          return true;
      }
    }

    if (this.partyDetailsActive) {
      switch (button) {
        case Button.UP:
          if (this.partyDetailsContext?.kind === "FUSION") {
            const party = this.partyDetailsParty;
            const eligibleUp = party
              .map((p, idx) => ({ p, idx }))
              .filter(({ p, idx }) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0)
              .map(({ idx }) => idx);
            if (eligibleUp.length > 1) {
              const curPos = eligibleUp.indexOf(this.partyDetailsIndex);
              const nextPos = (curPos - 1 + eligibleUp.length) % eligibleUp.length;
              this.partyDetailsIndex = eligibleUp[nextPos];
            }
            this.partyDetailsPartnerIndex = 0;
            this.fusionPreviewHighlightIndex = this.getFusionGridHighlightIndex();
            this.updatePartyDetails();
            ui.playSelect();
          } else {
            if (this.partyDetailsIndex > 0) {
              this.partyDetailsIndex--;
              this.updatePartyDetails();
              ui.playSelect();
            }
          }
          return true;
        case Button.DOWN:
          if (this.partyDetailsContext?.kind === "FUSION") {
            const party = this.partyDetailsParty;
            const eligibleDown = party
              .map((p, idx) => ({ p, idx }))
              .filter(({ p, idx }) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0)
              .map(({ idx }) => idx);
            if (eligibleDown.length > 1) {
              const curPos = eligibleDown.indexOf(this.partyDetailsIndex);
              const nextPos = (curPos + 1) % eligibleDown.length;
              this.partyDetailsIndex = eligibleDown[nextPos];
            }
            this.partyDetailsPartnerIndex = 0;
            this.fusionPreviewHighlightIndex = this.getFusionGridHighlightIndex();
            this.updatePartyDetails();
            ui.playSelect();
          } else {
            if (this.partyDetailsIndex < this.partyDetailsParty.length - 1) {
              this.partyDetailsIndex++;
              this.updatePartyDetails();
              ui.playSelect();
            }
          }
          return true;
        case Button.LEFT:
          if (this.partyDetailsContext?.kind === "FUSION") {
            if (this.shiftFusionPartner(-1)) {
              ui.playSelect();
            }
          }
          return true;
        case Button.RIGHT:
          if (this.partyDetailsContext?.kind === "FUSION") {
            if (this.shiftFusionPartner(1)) {
              ui.playSelect();
            }
          }
          return true;
        case Button.CANCEL:
          this.exitPartyDetailsMode();
          ui.playSelect();
          return true;
        case Button.STATS:
          if (this.partyDetailsContext?.kind === "FUSION") {
            const party = this.partyDetailsParty;
            const eligibleIndices = party
              .map((p, idx) => ({ p, idx }))
              .filter(({ p, idx }) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0)
              .map(({ idx }) => idx);
            if (eligibleIndices.length > 1) {
              const currentEligiblePos = eligibleIndices.indexOf(this.partyDetailsIndex);
              const nextPos = (currentEligiblePos + 1) % eligibleIndices.length;
              this.partyDetailsIndex = eligibleIndices[nextPos];
            }
            this.partyDetailsPartnerIndex = 0;
            this.fusionPreviewHighlightIndex = this.getFusionGridHighlightIndex();
            this.updatePartyDetails();
            ui.playSelect();
          } else if (this.partyDetailsContext?.kind === "SECTION_RELAY") {
            if (this.hasPageableTooltipSection() && this.getTooltipSectionPageCount() > 1) {
              this.tooltipSectionPageIndex = (this.tooltipSectionPageIndex + 1) % this.getTooltipSectionPageCount();
              this.regenerateCurrentModifierSections();
              this.updatePartyDetailsTooltip();
            }
            ui.playSelect();
          } else {
            if (this.partyDetailsParty.length > 1) {
              this.partyDetailsIndex = (this.partyDetailsIndex + 1) % this.partyDetailsParty.length;
              this.updatePartyDetails();
            }
            ui.playSelect();
          }
          return true;
        default:
          return true;
      }
    }

    if (this.forbiddenFormDetailsActive) {
      switch (button) {
        case Button.LEFT:
          this.shiftForbiddenFormAbility(-1);
          ui.playSelect();
          return true;
        case Button.RIGHT:
          this.shiftForbiddenFormAbility(1);
          ui.playSelect();
          return true;
        case Button.CANCEL:
        case Button.STATS:
          this.exitForbiddenFormDetailsMode();
          ui.playSelect();
          return true;
        default:
          return true;
      }
    }

    if (button === Button.ACTION) {
      success = true;
      if (this.onActionInput) {
        const originalOnActionInput = this.onActionInput;
        this.awaitingActionInput = false;
        this.onActionInput = null;
        if (!originalOnActionInput(this.rowCursor, this.cursor)) {
          this.awaitingActionInput = true;
          this.onActionInput = originalOnActionInput;
        } else {
          this.hideUpgradeTooltip();
          if (this.cursorObj) {
            this.cursorObj.setVisible(false);
          }
          this.moveInfoOverlayActive = this.moveInfoOverlay.active;
          this.moveInfoOverlay.setVisible(false);
          this.moveInfoOverlay.active = false;
        }
      }
    } else if (button === Button.CANCEL) {
      this.hideUpgradeTooltip();
      if (this.player && (!this.forcedDraftSelection || this.allowSkip)) {
        try {
          const cfg = (this.scene.gameData as any).tempSkillTreeConfig;
          if (cfg && (cfg.mode === SkillTreeMode.POKEMON_SELECTION || cfg.mode === "POKEMON_SELECTION")) {
            ui.playError();
            return true;
          }
        } catch {}
        success = true;
        if (this.onActionInput) {
          const originalOnActionInput = this.onActionInput;
          this.awaitingActionInput = false;
          this.onActionInput = null;
          if (!originalOnActionInput(-1)) {
            this.awaitingActionInput = true;
            this.onActionInput = originalOnActionInput;
          }
          this.moveInfoOverlayActive = this.moveInfoOverlay.active;
          this.moveInfoOverlay.setVisible(false);
          this.moveInfoOverlay.active = false;
        }
      }
    } else if (button === Button.CYCLE_ABILITY) {
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (type && !(type instanceof MoveUpgradeModifierType)) {
        const highestWave = ((this.scene as BattleScene).gameData?.gameStats?.highestWaveReached || 0);
        const inSkillTreeModifierContext = (this.scene as BattleScene).skillTreeModifierContext === true;
        const isForbiddenFormUnlock = type instanceof ForbiddenFormUnlockModifierType;
        const isRankUpContext = type?.group === "rankup";
        const tooltipLocked = false;
        if (tooltipLocked) {
          return false;
        }
        if (isForbiddenFormUnlock && this.scene.modifierTooltipsEnabled && PokemonBattleTooltipUtils.isActive()) {
          const ffAbilities = ((type as any).getTooltipData?.())?.abilities;
          if (Array.isArray(ffAbilities) && ffAbilities.length > 1) {
            this.forbiddenFormDetailsAbilityIndex = (this.forbiddenFormDetailsAbilityIndex + 1 + ffAbilities.length) % ffAbilities.length;
            this.setCursor(this.cursor);
            ui.playSelect();
            return true;
          }
        }
        this.tooltipDeferredUntilUserInput = false;
        if (this.firstFocusPending) {
          this.firstFocusPending = false;
          this.setModifierTooltipsEnabled(true);
          this.updateShowDetailsHint(option, true);
          this.setCursor(this.cursor);
          success = true;
        } else if (this.scene.modifierTooltipsEnabled) {
            this.setModifierTooltipsEnabled(false);
            this.hideUpgradeTooltip();
            this.moveInfoOverlay.clear();
            this.moveInfoOverlay.setVisible(false);
            this.moveInfoOverlay.active = false;
            this.updateShowDetailsHint(option, true);
            this.setCursor(this.cursor);
            success = true;
        } else {
          this.setModifierTooltipsEnabled(true);
          this.updateShowDetailsHint(option, true);
          this.setCursor(this.cursor);
          success = true;
        }
      }
    } else if (button === Button.STATS) {
      if (this.partyDetailsContext?.kind === "FUSION" && !this.partyDetailsActive && this.upgradeTooltipContainer) {
        const party = this.partyDetailsParty;
        const eligible = party.filter((p, idx) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0);
        if (eligible.length > 0) {
          this.enterPartyDetailsMode();
          ui.playSelect();
        }
        success = true;
      } else if (this.currentModifierContext === "SECTION_RELAY" && !this.partyDetailsActive && this.upgradeTooltipContainer) {
        this.partyDetailsContext = { kind: "SECTION_RELAY" };
        this.enterPartyDetailsMode();
        ui.playSelect();
        success = true;
      } else if (this.partyDetailsContext && this.partyDetailsContext.kind !== "FUSION" && this.scene.modifierTooltipsEnabled && this.upgradeTooltipContainer) {
        this.enterPartyDetailsMode();
        success = true;
      } else if (this.hasPageableTooltipSection() && this.scene.modifierTooltipsEnabled && this.upgradeTooltipContainer) {
        this.tooltipSectionPageIndex = (this.tooltipSectionPageIndex + 1) % this.getTooltipSectionPageCount();
        this.setCursor(this.cursor);
        ui.playSelect();
        return true;
      } else {
        const option = this.getCurrentSelectedOption();
        const type = option?.modifierTypeOption?.type;
        if (type instanceof ForbiddenFormUnlockModifierType && this.scene.modifierTooltipsEnabled && PokemonBattleTooltipUtils.isActive()) {
          const ffAbilities = ((type as any).getTooltipData?.())?.abilities;
          if (Array.isArray(ffAbilities) && ffAbilities.length > 1) {
            this.forbiddenFormDetailsAbilityIndex = (this.forbiddenFormDetailsAbilityIndex + 1 + ffAbilities.length) % ffAbilities.length;
            this.setCursor(this.cursor);
            ui.playSelect();
            return true;
          }
          this.enterForbiddenFormDetailsMode(type);
          success = true;
        } else if (type instanceof PokemonAltBuildModifierType && this.scene.modifierTooltipsEnabled && PokemonBattleTooltipUtils.isActive()) {
          const abData = this.getAltBuildTooltipData(type);
          if (abData?.abilities && abData.abilities.length > 1) {
            this.altBuildAbilityIndex = (this.altBuildAbilityIndex + 1) % abData.abilities.length;
            this.setCursor(this.cursor);
            ui.playSelect();
            return true;
          }
        } else if (type instanceof MoveUpgradeModifierType && this.upgradeTooltipContainer && this.moveUpgradePreviewCategory) {
          this.enterMoveUpgradeDetailsMode();
          success = true;
        }
      }
    } else {
      this.tooltipDeferredUntilUserInput = false;
      switch (button) {
        case Button.UP:
          if (this.rowCursor === 1 && this.displayConfig?.layout === "2x2" && this.options.length === 4) {
            const cols = 2;
            const currentRow = Math.floor(this.cursor / cols);
            if (currentRow > 0) {
              const newCursor = (currentRow - 1) * cols + (this.cursor % cols);
              success = this.setCursor(newCursor);
            }
          } else if (this.rowCursor === 0 && this.lockRarityButtonContainer.visible && this.cursor === (this.getRowItems(0) - 1)) {
            success = this.setCursor(0);
          } else if (this.rowCursor < this.shopOptionsRows.length + 1) {
            success = this.setRowCursor(this.rowCursor + 1);
          }
          break;
        case Button.DOWN:
          if (this.rowCursor === 1 && this.displayConfig?.layout === "2x2" && this.options.length === 4) {
            const cols = 2;
            const currentRow = Math.floor(this.cursor / cols);
            const totalRows = Math.ceil(this.options.length / cols);
            if (currentRow < totalRows - 1) {
              const newCursor = (currentRow + 1) * cols + (this.cursor % cols);
              success = this.setCursor(Math.min(newCursor, this.options.length - 1));
            }
          } else if (this.rowCursor) {
            if (this.rowCursor - 1 === 0 && this.getButtonLayout().length === 0) {
              break;
            }
            success = this.setRowCursor(this.rowCursor - 1);
          } else if (this.lockRarityButtonContainer.visible && this.cursor === 0) {
            success = this.setCursor(this.getRowItems(0) - 1);
          }
          break;
        case Button.LEFT:
          if (!this.rowCursor) {
            if (this.cursor > 0) {
              success = this.setCursor(this.cursor - 1);
            }
          } else if (this.cursor > 0) {
            success = this.setCursor(this.cursor - 1);
          } else if (this.rowCursor === 1) {
            const rowItems = this.getRowItems(this.rowCursor);
            if (rowItems > 1) {
              success = this.setCursor(rowItems - 1);
            }
          } else if (this.rowCursor >= 2) {
            const rowItems = this.getRowItems(this.rowCursor);
            if (rowItems > 1) {
              success = this.setCursor(rowItems - 1);
            }
          }
          break;
        case Button.RIGHT:
          if (!this.rowCursor) {
            if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
              success = this.setCursor(this.cursor + 1);
            }
          } else if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
            success = this.setCursor(this.cursor + 1);
          } else if (this.rowCursor >= 1) {
            success = this.setCursor(0);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  setCursor(cursor: integer): boolean {
    const ui = this.getUi();
    const prevCursor = this.cursor;
    const ret = super.setCursor(cursor);
    if (cursor !== prevCursor) {
      this.tooltipSectionPageIndex = 0;
      this.fusionPreviewHighlightIndex = -1;
      if (this.firstFocusPending) {
        this.firstFocusPending = false;
      }
    }

    if (!this.cursorObj) {
      if (!this.active) return false;
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.modifierContainer.add(this.cursorObj);
    }

    if (this.focusedOptionPanelBg) {
      this.focusedOptionPanelBg.clear();
    }

    const denseFocusActive = this.rowCursor === 1 && this.options.length >= 6;
    if (!denseFocusActive && this.lastDenseFocusedOption) {
      this.lastDenseFocusedOption.setDenseFocus(false);
      this.lastDenseFocusedOption = null;
    }
    if (this.rowCursor !== 1 && this.lastChipFocusedOption) {
      this.lastChipFocusedOption.setFocusLabelChip(null);
      this.lastChipFocusedOption = null;
    }
    if (this.rowCursor !== 1) {
      this.redrawShowDetailsHintBg(null);
      if (this.focusLabelDetailsBg) {
        this.focusLabelDetailsBg.clear();
      }
    }
    const options = (this.rowCursor === 1 ? this.options :
      (this.rowCursor >= 2 && this.shopOptionsRows.length >= (this.rowCursor - 1) ?
        this.shopOptionsRows[this.shopOptionsRows.length - (this.rowCursor - 1)] : []));

    if (!options || options.length === 0 || cursor >= options.length) {
      if (options && options.length > 0) {
        this.cursor = Math.min(cursor, options.length - 1);
      } else if (this.rowCursor > 0) {
        for (let r = 0; r <= this.shopOptionsRows.length + 1; r++) {
          if (r !== this.rowCursor) {
            const altOptions = (r === 1 ? this.options :
              (r >= 2 && this.shopOptionsRows.length >= (r-1) ?
                this.shopOptionsRows[this.shopOptionsRows.length - (r - 1)] : null));
            if (altOptions && altOptions.length > 0) {
              this.rowCursor = r;
              this.cursor = 0;
              return this.setCursor(0);
            }
          }
        }
        this.rowCursor = 0;
        this.cursor = 0;
        return ret;
      }
    }

    const isHoverPreview = !!(this as any)._isMouseHoverPreview;

    if (!isHoverPreview) {
      this.cursorObj.setScale(this.rowCursor === 1 ? 2 : this.rowCursor >= 2 ? 1.5 : 1);
    }

    this.moveInfoOverlay.clear();
    this.hideUpgradeTooltip();
    if (this.rowCursor) {
      const option = options[this.cursor];
      if (!option) {
        console.warn(`Option at index ${this.cursor} is undefined!`);
        return ret;
      }

      if (!isHoverPreview) {
        if (this.rowCursor < 2) {
          this.cursorObj.setPosition(option.x - 20, option.y + 2);
        } else {
          this.cursorObj.setPosition(option.x - 12, option.y + 1);
        }
      }

      if (!isHoverPreview && denseFocusActive) {
        if (this.lastDenseFocusedOption && this.lastDenseFocusedOption !== option) {
          this.lastDenseFocusedOption.setDenseFocus(false);
        }
        option.setDenseFocus(true);
        this.lastDenseFocusedOption = option;
      }

      if (!option.modifierTypeOption) {
        console.warn(`ModifierTypeOption is undefined for option at index ${this.cursor}`);
        return ret;
      }

      const type = option.modifierTypeOption.type;
      if (!type) {
        console.warn(`Type is undefined for modifierTypeOption at index ${this.cursor}`);
        return ret;
      }

      const desc = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").replace(/\n?\(Hold C.*?\)/i, "").trim();
      if (!isHoverPreview && this.shouldPopulateMessageBar()) {
        ui.showText(desc);
      }

      const isMoveUpgrade = type instanceof MoveUpgradeModifierType;
      const canShowCustomTooltip = this.shouldRenderCustomTooltip(type);
      const highestWave = ((this.scene as BattleScene).gameData?.gameStats?.highestWaveReached || 0);
      const inSkillTreeModifierContext = (this.scene as BattleScene).skillTreeModifierContext === true;
      const isForbiddenFormUnlock = type instanceof ForbiddenFormUnlockModifierType;
      const isRankUpContext = type?.group === "rankup";
      const tooltipLocked = false;
      const effectiveTooltipsEnabled = this.scene.modifierTooltipsEnabled && !tooltipLocked;
      const showHint = !isMoveUpgrade && !tooltipLocked;
      const showTooltips = this.shouldCreateTooltipOnSetCursor();
      if (showTooltips) {
        this.updateShowDetailsHint(option, showHint);
      } else {
        this.updateShowDetailsHint(null, false);
      }

      if (this.rowCursor === 1 && !isHoverPreview && this.shouldDrawFocusChip()) {
        const rarity = this.getModifierRarity(type);
        const colors = getUpgradeRarityColors(rarity);
        if (this.lastChipFocusedOption) {
          this.lastChipFocusedOption.setFocusLabelChip(null);
          this.lastChipFocusedOption = null;
        }
        const showChip = this.scene.showItemTextBg && !showHint;
        const showDetailsBg = this.scene.showItemTextBg && showHint;
        option.setFocusLabelChip(showChip ? colors : null);
        this.lastChipFocusedOption = showChip ? option : null;
        this.redrawShowDetailsHintBg(null);
        if (this.focusLabelDetailsBg && showDetailsBg) {
          this.focusLabelDetailsBg.clear();
          const sX = option.scaleX || 1;
          const sY = option.scaleY || 1;
          const rLocal = option.getFocusLabelChipRect();
          let r = new Phaser.Geom.Rectangle(option.x + rLocal.x * sX, option.y + rLocal.y * sY, rLocal.width * sX, rLocal.height * sY);
          if (this.showDetailsHintContainer && this.showDetailsHintContainer.visible && this.showDetailsHintKeySprite && this.showDetailsHintLabel) {
            const key = this.showDetailsHintKeySprite;
            const label = this.showDetailsHintLabel;
            const hx = this.showDetailsHintContainer.x;
            const hy = this.showDetailsHintContainer.y;
            const left = hx + (key.x - key.displayWidth / 2);
            const right = hx + (label.x + label.displayWidth);
            const hh = Math.max(key.displayHeight, label.displayHeight);
            const top = hy - hh / 2;
            const padX = 8;
            const padY = 4;
            const hintRect = new Phaser.Geom.Rectangle(left - padX, top - padY, (right - left) + padX * 2, hh + padY * 2);
            r = Phaser.Geom.Rectangle.Union(r, hintRect);
          }
          this.focusLabelDetailsBg.fillStyle(colors.bg, 0.85);
          this.focusLabelDetailsBg.lineStyle(2, colors.border, 0.85);
          this.focusLabelDetailsBg.fillRoundedRect(r.x, r.y, r.width, r.height, 6);
          this.focusLabelDetailsBg.strokeRoundedRect(r.x, r.y, r.width, r.height, 6);
          this.modifierContainer.bringToTop(this.focusLabelDetailsBg);
        }
        if (!showDetailsBg && this.focusLabelDetailsBg) {
          this.focusLabelDetailsBg.clear();
        }
        this.modifierContainer.bringToTop(option);
        if (this.cursorObj.parentContainer !== this.modifierContainer) {
          if (this.cursorObj.parentContainer) {
            this.cursorObj.parentContainer.remove(this.cursorObj, false);
          }
          this.modifierContainer.add(this.cursorObj);
        }
        this.cursorObj.setDepth(0);
        this.modifierContainer.bringToTop(this.cursorObj);
        if (this.showDetailsHintContainer && this.showDetailsHintContainer.visible) {
          this.scene.ui.bringToTop(this.showDetailsHintContainer);
        }
      }

      if (!showTooltips) {
        return ret;
      }

      const isFusion = type instanceof FusePokemonModifierType;
      if (!effectiveTooltipsEnabled) {
        if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
          this.moveInfoOverlay.show(this.scene.getUpgradedMove(allMoves[type.moveId]));
        } else if (type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType || type instanceof PermaPartyAbilityModifierType) {
          this.moveInfoOverlay.show(type.ability.description);
        }
        return ret;
      }

      if (this.isSkillTreeBountyType(type)) {
        this.showBountyTooltip(type as QuestModifierType);
        return ret;
      }

      if (type?.group === "rankup") {
        const rankData = (type as any)._rankUpTooltipData;
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        if (rankData?.kind === "self") {
          const selfSections = this.generateRankUpSelfTooltipSections(rankData);
          this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, selfSections);
        } else if (rankData?.kind === "other") {
          const otherSections = this.generateRankUpOtherTooltipSections(rankData);
          const rankTypes: Type[] = (rankData.types || []).filter((t: any) => t !== Type.UNKNOWN);
          this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, otherSections, undefined, rankTypes);
        } else {
          const body = type.getDescription(this.scene);
          this.showModifierTooltip(title, subtitle, body, rarity, false, undefined, true);
        }
        return ret;
      }

      if (!canShowCustomTooltip) {
        const typeAny: any = type as any;
        const rarity = (typeof typeAny.getTooltipRarity === "function")
          ? typeAny.getTooltipRarity(this.scene)
          : this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const rawBody = (typeof typeAny.getTooltipDescription === "function")
          ? String(typeAny.getTooltipDescription(this.scene))
          : type.getDescription(this.scene);
        const body = rawBody.replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
        const fallbackHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, body, rarity, false, undefined, true, undefined, fallbackHint);
        return ret;
      }

      if (!(type instanceof PokemonAltBuildModifierType)) {
        this.altBuildAbilityIndex = 0;
      }

      if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
        this.moveInfoOverlay.show(this.scene.getUpgradedMove(allMoves[type.moveId]));
        const rarity = this.getModifierRarity(type);
        const title = allMoves[type.moveId].name;
        const isXM = type instanceof AnyTmModifierType;
        const isYuTm = type instanceof YuTmModifierType;
        const subtitle = this.getRarityText(rarity);
        const tmSections = this.generateTmXmTooltipSections(type.moveId, isXM, type);
        const glitchHint = (type.group === "glitch" || isXM) ? i18next.t("modifierType:common.glitchPieceCost", { defaultValue: "*COSTS 1x Glitch Piece" }) : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, tmSections, glitchHint);
      }
      else if(type instanceof PermaPartyAbilityModifierType) {
        this.moveInfoOverlay.show(type.ability.description);
        const rarity = this.getModifierRarity(type);
        const abilityName = allAbilities[type.ability.id]?.name || Abilities[type.ability.id];
        const title = abilityName;
        const subtitle = this.getRarityText(rarity);
        const partyAbSections = this.generatePartyAbilityTooltipSections(type.ability.id, type);
        const stacksHint = i18next.t("modifierType:common.partyAbilityStacksHint", { defaultValue: "(STACKS!)" });
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, partyAbSections, stacksHint);
      }
      else if(type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType) {
        this.moveInfoOverlay.show(type.ability.description);
        const rarity = this.getModifierRarity(type);
        const abilityName = allAbilities[type.ability.id]?.name || Abilities[type.ability.id];
        const isPassive = type instanceof AnyPassiveAbilityModifierType;
        const title = abilityName;
        const subtitle = this.getRarityText(rarity);
        const abGrantSections = this.generateAbilityGrantTooltipSections(type.ability.id, isPassive, type);
        const abGlitchHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost", { defaultValue: "*COSTS 1x Glitch Piece" }) : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, abGrantSections, abGlitchHint);
      }
      else if(type instanceof MoveUpgradeModifierType) {
        this.moveInfoOverlay.show(type.getDescription(this.scene));
        this.showUpgradeTooltip(type);
      }
      else if (type instanceof AddPokemonModifierType) {
        const pokemon = type.getPokemon() as PlayerPokemon;
        const natureName = getNatureName(pokemon.nature);
        this.hideUpgradeTooltip();
        const battleTooltipW = 130;
        const modalW = this.scene.game.canvas.width / 6;
        const halfCard = 36;
        const selectedOpt = options[this.cursor];
        let posX = 186;
        if (selectedOpt) {
          const xR = selectedOpt.x + halfCard + this.TOOLTIP_OFFSET_X;
          const xL = selectedOpt.x - halfCard - this.TOOLTIP_OFFSET_X - battleTooltipW;
          posX = (xR + battleTooltipW > modalW) ? xL : xR;
          posX = Math.max(4, Math.min(modalW - battleTooltipW - 4, posX));
        }
        PokemonBattleTooltipUtils.showView(this.scene, pokemon, 0, false, { x: posX, anchorY: selectedOpt?.y }, { replaceFieldWithType: true, natureSuffix: natureName, shinyStatSwaps: (pokemon as any)._shinyPowerStatSwaps });
      }
      else if (type instanceof ForbiddenFormUnlockModifierType) {
        this.hideUpgradeTooltip();
        const ffData = (type as any).getTooltipData?.();
        const rarity = this.getModifierRarity(type);
        const focusIdx = this.forbiddenFormDetailsActive ? this.forbiddenFormDetailsAbilityIndex : this.forbiddenFormDetailsAbilityIndex;
        const battleTooltipW = 130;
        const modalW = this.scene.game.canvas.width / 6;
        const halfCard = 36;
        const selectedOpt = options[this.cursor];
        let posX = 186;
        if (selectedOpt) {
          const xR = selectedOpt.x + halfCard + this.TOOLTIP_OFFSET_X;
          const xL = selectedOpt.x - halfCard - this.TOOLTIP_OFFSET_X - battleTooltipW;
          posX = (xR + battleTooltipW > modalW) ? xL : xR;
          posX = Math.max(4, Math.min(modalW - battleTooltipW - 4, posX));
        }
        PokemonBattleTooltipUtils.showGlitchFormView(
          this.scene, ffData, focusIdx, rarity,
          { x: posX, anchorY: selectedOpt?.y }
        );
      }
      else if (type instanceof PokemonAltBuildModifierType) {
        this.hideUpgradeTooltip();
        const rarity = (typeof (type as any).getTooltipRarity === "function")
          ? (type as any).getTooltipRarity(this.scene)
          : this.getModifierRarity(type);
        const abData = this.getAltBuildTooltipData(type);
        const focusIdx = this.altBuildAbilityIndex;
        const battleTooltipW = 130;
        const modalW = this.scene.game.canvas.width / 6;
        const halfCard = 36;
        const selectedOpt = options[this.cursor];
        let posX = 186;
        if (selectedOpt) {
          const xR = selectedOpt.x + halfCard + this.TOOLTIP_OFFSET_X;
          const xL = selectedOpt.x - halfCard - this.TOOLTIP_OFFSET_X - battleTooltipW;
          posX = (xR + battleTooltipW > modalW) ? xL : xR;
          posX = Math.max(4, Math.min(modalW - battleTooltipW - 4, posX));
        }
        PokemonBattleTooltipUtils.showGlitchFormView(
          this.scene, abData, focusIdx, rarity,
          { x: posX, anchorY: selectedOpt?.y }
        );
      }
      else if (type instanceof AbilitySwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const abSections = this.generateAbilitySwitcherTooltipSections(type);
        const abSwHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, abSections, abSwHint);
      }
      else if (type instanceof RandomStatSwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const stat1 = (type as any).stat1 as Stat;
        const stat2 = (type as any).stat2 as Stat;
        const stat1Name = getStatName(stat1, true);
        const stat2Name = getStatName(stat2, true);
        const descText = i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.description", {
          stat1: stat1Name,
          stat2: stat2Name,
          defaultValue: `Swaps ${stat1Name} and ${stat2Name}`
        });
        const party = this.scene.getParty() as PlayerPokemon[];
        const statSwSections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
        statSwSections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme) });

        const recommendations = this.getStatSwitcherRecommendations(party, stat1, stat2);
        const recommendedMap = new Map<number, string>();
        const recommendedIndices = new Set<number>();
        for (const r of recommendations) {
          recommendedMap.set(r.partyIndex, r.roleLabel);
          recommendedIndices.add(r.partyIndex);
        }
        for (let pi = 0; pi < party.length; pi++) {
          if (!recommendedIndices.has(pi)) {
            const pokemon = party[pi] as PlayerPokemon;
            const roleLabel = this.getComprehensiveRoleLabel(pokemon, stat1, stat1, stat2);
            recommendedMap.set(pi, roleLabel);
          }
        }

        const pageSize = 1;
        const totalPages = Math.ceil(party.length / pageSize);
        const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
        const startIdx = page * pageSize;

        const teamStatsContainer = PokemonBattleTooltipUtils.buildTeamStatsContainer(
          this.scene,
          party,
          { hideMoves: true, swapStats: [stat1, stat2], tooltipWidth: 120, recommendedMap, displaySlice: [startIdx, pageSize], showBstTotal: true }
        );
        const headerLabel = totalPages > 1
          ? `${i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" })} (${page + 1}/${totalPages})`
          : i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" });
        statSwSections.push({ label: headerLabel, body: "", embeddedContainer: teamStatsContainer });
        if (totalPages > 1) {
          const navRow = this.buildTooltipNavRow(page, totalPages);
          statSwSections.push({ body: "", embeddedContainer: navRow });
        }

        const statSwHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, statSwSections, statSwHint);
      }
      else if (type instanceof AddTypeBallModifierType || (type instanceof AddPokeballModifierType && (type as AddPokeballModifierType).pokeballType === PokeballType.VOID_BALL)) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const ballSections = this.generateBallTooltipSections(type);
        const ballHeaderTypes: Type[] | undefined = type instanceof AddTypeBallModifierType ? [type.targetType] : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, ballSections, undefined, ballHeaderTypes);
      }
      else if (type instanceof TypeSwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const tsSections = this.generateTypeSwitcherTooltipSections(type);
        const tsGlitchHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost", { defaultValue: "*COSTS 1x Glitch Piece" }) : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, tsSections, tsGlitchHint);
      }
      else if (type instanceof EvolutionItemModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const evoSections = this.generateEvolutionTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, evoSections);
      }
      else if (type instanceof FormChangeItemModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const fcSections = this.generateFormChangeTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, fcSections);
      }
      else if (type instanceof PokemonNatureChangeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const mintSections = this.generateMintTooltipSections(type.nature);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, mintSections);
      }
      else if (type instanceof ChampionPokemonStatBoosterModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name.replace(/\s*\[.*?\]\s*$/, "");
        const subtitle = this.getRarityText(rarity);
        const pregenArgs = type.getPregenArgs?.() as [string, Stat[], number?, Type[]?] | undefined;
        const stats = pregenArgs?.[1] ?? [];
        const boostPercent = pregenArgs?.[2] ?? 0.03;
        const championTypes = (pregenArgs?.[3] as Type[] ?? []).filter((t: Type) => t !== Type.UNKNOWN);
        const headerTypes = championTypes.length > 0 ? championTypes : undefined;
        if (stats.length > 0) {
          const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
          const party = this.scene.getParty() as PlayerPokemon[];
          const boostSections = this.generateStatBoostTooltipSections(descText, party, stats.length === 1 ? stats[0] : stats, boostPercent, championTypes);
          this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, boostSections, undefined, headerTypes);
        } else {
          const descText = type.getDescription(this.scene);
          this.showModifierTooltip(title, subtitle, descText, rarity, false, undefined, true, undefined, undefined, headerTypes);
        }
      }
      else if (type instanceof PokemonBaseStatBoosterModifierType || type instanceof PlayerPokemonBaseStatBoosterModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const stat = ((type as any).getPregenArgs?.()[0] ?? null) as Stat | null;
        const multiplier = type instanceof PokemonBaseStatBoosterModifierType ? 0.08 : 0.03;
        if (stat !== null) {
          const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
          const party = this.scene.getParty() as PlayerPokemon[];
          const boostSections = this.generateStatBoostTooltipSections(descText, party, stat, multiplier);
          this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, boostSections);
        } else {
          const descText = type.getDescription(this.scene);
          this.showModifierTooltip(title, subtitle, descText, rarity);
        }
      }
      else if (type?.localeKey === "modifierType:ModifierType.SOUL_DEW") {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
        const descText = type.getDescription(this.scene);
        const headerLines = [
          getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)
        ];
        const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
        const natureStats = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const nature = pokemon.getNature();
          const incStat = natureStats.find(s => getNatureStatMultiplier(nature, s) > 1) ?? null;
          const decStat = natureStats.find(s => getNatureStatMultiplier(nature, s) < 1) ?? null;
          if (incStat === null || decStat === null) {
            return `[color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`;
          }
          const baseStats = pokemon.getModifiedBaseStats();
          const incName = getStatName(incStat, true);
          const decName = getStatName(decStat, true);
          const incPre = Math.floor(baseStats[incStat] * getNatureStatMultiplier(nature, incStat));
          const incPost = Math.floor(baseStats[incStat] * (getNatureStatMultiplier(nature, incStat) + 0.1));
          const decPre = Math.floor(baseStats[decStat] * getNatureStatMultiplier(nature, decStat));
          const decPost = Math.floor(baseStats[decStat] * (getNatureStatMultiplier(nature, decStat) - 0.1));
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${incName}: ${incPre} -> ${incPost}[/color] | [color=#e13d3d]${decName}: ${decPre} -> ${decPost}[/color]`;
        });
        const firstDewPokemon = party[0];
        let dewBarsContainer: Phaser.GameObjects.Container | undefined;
        if (firstDewPokemon) {
          dewBarsContainer = this.createStatBarsContainer(firstDewPokemon.getModifiedBaseStats(), undefined, true, true);
        }
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "SOUL_DEW" }, dewBarsContainer);
      }
      else if (type instanceof StatSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const stat = type.getStat();
        const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
        const party = this.scene.getParty() as PlayerPokemon[];
        const statSections = this.generateStatBoostTooltipSections(descText, party, stat, 0.12);
        const statSacHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, statSections, statSacHint);
      }
      else if (type instanceof MoveSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const mSacSections = this.generateSacrificeTooltipSections('Move');
        const mSacHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, mSacSections, mSacHint);
      }
      else if (type instanceof TypeSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const tSacSections = this.generateSacrificeTooltipSections('Type');
        const tSacHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, tSacSections, tSacHint);
      }
      else if (type instanceof AbilitySacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const aSacSections = this.generateSacrificeTooltipSections('Ability');
        const aSacHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, aSacSections, aSacHint);
      }
      else if (type instanceof PassiveAbilitySacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const pSacSections = this.generateSacrificeTooltipSections('Passive');
        const pSacHint = type.group === "glitch" ? i18next.t("modifierType:common.glitchPieceCost") : undefined;
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, pSacSections, pSacHint);
      }
      else if (type instanceof TerastallizeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const teraSections = this.generateTeraShardTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, teraSections, undefined, [type.teraType]);
      }
      else if (type instanceof RememberMoveModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const mushroomSections = this.generateMemoryMushroomTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, mushroomSections);
      }
      else if (type instanceof FusePokemonModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const fusionSections = this.generateFusionTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, true, undefined, false, fusionSections);
        this.partyDetailsActive = false;
        this.partyDetailsIndex = 0;
        this.partyDetailsPartnerIndex = 0;
        this.partyDetailsParty = this.scene.getParty() as PlayerPokemon[];
        this.partyDetailsRarity = rarity;
        this.partyDetailsContext = { kind: "FUSION" };
        if (this.partyDetailsButton) {
          this.partyDetailsButton.setVisible(true);
        }
        if (this.partyBackButton) {
          this.partyBackButton.setVisible(false);
        }
        if (this.partyDetailsTooltipContainer) {
          this.partyDetailsTooltipContainer.setVisible(false);
        }
      }
      else if (type instanceof TrainerBondAbilityModifierType || type instanceof TeraAbilityModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const champSections = this.generateChampionAbilityTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, champSections);
      }
      else if (type instanceof QuestModifierType && !this.isSkillTreeBountyType(type)) {
        const rarity = SkillTreeRarity.LEGENDARY;
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const questSections = this.generateQuestTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, questSections);
      }
      else if (type instanceof SkillTreeTokenRewardModifierType) {
        const rarity = SkillTreeRarity.LEGENDARY;
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const tokenSections = this.generateSkillTreeTokenTooltipSections();
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, tokenSections);
      }
      else if (type instanceof PermaModifierType) {
        const rarity = (typeof type.getTooltipRarity === "function")
            ? type.getTooltipRarity(this.scene)
            : this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const permaSections = this.generatePermaModifierTooltipSections(type);
        this.showModifierTooltip(title, subtitle, "", rarity, false, undefined, false, permaSections);
      }
    } else {
      this.updateShowDetailsHint(null, false);
      const buttonLayout = this.getButtonLayout();
      const buttonInfo = buttonLayout[cursor];

      if (buttonInfo) {
        if (!isHoverPreview) {
          this.cursorObj.setPosition(buttonInfo.x, buttonInfo.y);
          const ui2 = this.getUi();
          if (this.cursorObj.parentContainer === this.modifierContainer) {
            this.modifierContainer.remove(this.cursorObj, false);
            ui2.add(this.cursorObj);
          }
          this.cursorObj.setDepth(50);
          ui2.bringToTop(this.cursorObj);
        }
        const descKeyToLabelKey: Record<string, string> = {
          "modifierSelectUiHandler:rerollDesc": "modifierSelectUiHandler:reroll",
          "modifierSelectUiHandler:permaRerollDesc": "modifierSelectUiHandler:permaReroll",
          "modifierSelectUiHandler:transferDesc": "modifierSelectUiHandler:transfer",
          "modifierSelectUiHandler:checkTeamDesc": "modifierSelectUiHandler:checkTeam",
          "modifierSelectUiHandler:lockRaritiesDesc": "modifierSelectUiHandler:lockRarities",
        };
        const labelKey = descKeyToLabelKey[buttonInfo.descKey];
        const title = labelKey ? i18next.t(labelKey) : "";
        const rarity = SkillTreeRarity.LEGENDARY;
        const subtitle = this.getRarityText(rarity);
        const body = i18next.t(buttonInfo.descKey);
        if (!isHoverPreview) {
          ui.showText(body);
        }
        if (this.scene.modifierTooltipsEnabled) {
          this.showModifierTooltip(title, subtitle, body, rarity, false, undefined, false);
        }
      } else {
        this.cursor = Math.min(cursor, buttonLayout.length - 1);
        return this.setCursor(this.cursor);
      }
    }

    return ret;
  }

  public wantsCycleAbilityForTooltip(): boolean {
    if (this.rowCursor === 0) {
      return false;
    }
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    if (!type) {
      return false;
    }
    if (type instanceof MoveUpgradeModifierType) {
      return false;
    }
    return !this.scene.modifierTooltipsEnabled || this.upgradeTooltipContainer !== null || !!this.displayConfig?.customShopStrip;
  }

  public wantsStatsForTooltipDetails(): boolean {
    if (this.rowCursor === 0) {
      return false;
    }
    if (this.partyDetailsActive) {
      return true;
    }
    if (this.upgradeTooltipContainer === null) {
      return false;
    }
    if (this.partyDetailsContext !== null) {
      if (this.partyDetailsContext.kind === "FUSION") return true;
      return this.scene.modifierTooltipsEnabled;
    }
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    if (type instanceof MoveUpgradeModifierType) {
      return this.moveUpgradePreviewCategory !== null && this.moveUpgradePreviewMaxTier > 1;
    }
    return this.scene.modifierTooltipsEnabled;
  }

  public wantsForbiddenFormCycleOnStats(): boolean {
    if (!this.scene.modifierTooltipsEnabled) return false;
    if (!PokemonBattleTooltipUtils.isActive()) return false;
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    return type instanceof ForbiddenFormUnlockModifierType;
  }

  wantsAltBuildCycleOnStats(): boolean {
    if (!this.scene.modifierTooltipsEnabled) return false;
    if (!PokemonBattleTooltipUtils.isActive()) return false;
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    return type instanceof PokemonAltBuildModifierType;
  }

  private setModifierTooltipsEnabled(enabled: boolean): void {
    this.scene.gameData.saveSetting(SettingKeys.Modifier_Tooltips, enabled ? 1 : 0);
  }

  private shouldRenderCustomTooltip(type: any): boolean {
    if (type instanceof MoveUpgradeModifierType) {
      return true;
    }
    const isForbiddenFormUnlock = type instanceof ForbiddenFormUnlockModifierType;
    return type instanceof TmModifierType ||
      type instanceof AnyTmModifierType ||
      type instanceof SkillTreeTokenRewardModifierType ||
      type instanceof AnyAbilityModifierType ||
      type instanceof AnyPassiveAbilityModifierType ||
      type instanceof PermaPartyAbilityModifierType ||
      type instanceof FusePokemonModifierType ||
      type instanceof MoveUpgradeModifierType ||
      type instanceof AddPokemonModifierType ||
      type instanceof AbilitySwitcherModifierType ||
      type instanceof RandomStatSwitcherModifierType ||
      type instanceof TypeSwitcherModifierType ||
      type instanceof EvolutionItemModifierType ||
      type instanceof FormChangeItemModifierType ||
      isForbiddenFormUnlock ||
      type instanceof PokemonAltBuildModifierType ||
      type instanceof PokemonNatureChangeModifierType ||
      type instanceof StatSacrificeModifierType ||
      type instanceof MoveSacrificeModifierType ||
      type instanceof PokemonBaseStatBoosterModifierType ||
      type instanceof PlayerPokemonBaseStatBoosterModifierType ||
      type instanceof ChampionPokemonStatBoosterModifierType ||
      type instanceof TypeSacrificeModifierType ||
      type instanceof AbilitySacrificeModifierType ||
      type instanceof PassiveAbilitySacrificeModifierType ||
      type instanceof TrainerBondAbilityModifierType ||
      type instanceof TeraAbilityModifierType ||
      type?.localeKey === "modifierType:ModifierType.SOUL_DEW" ||
      type instanceof AddTypeBallModifierType ||
      (type instanceof AddPokeballModifierType && (type as AddPokeballModifierType).pokeballType === PokeballType.VOID_BALL) ||
      type instanceof PermaModifierType ||
      type instanceof TerastallizeModifierType ||
      type instanceof QuestModifierType ||
      type instanceof RememberMoveModifierType ||
      type?.group === "rankup";
  }

  private getCycleAbilityIconInfo(): { gamepadType: string; iconPath: string; scale: number } {
    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad") {
      gamepadType = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if (this.scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = this.scene.inputMethod || "keyboard";
    }
    const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
    const iconPath = isGamepad
      ? (this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_ABILITY") || "E.png")
      : "E.png";
    return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
  }

  private getStatsIconInfo(): { gamepadType: string; iconPath: string; scale: number } {
    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad") {
      gamepadType = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if (this.scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = this.scene.inputMethod || "keyboard";
    }
    const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
    const iconPath = isGamepad
      ? (this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png")
      : "C.png";
    return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
  }

  private getCancelIconInfo(): { gamepadType: string; iconPath: string; scale: number } {
    let gamepadType: string;
    if (this.scene.inputMethod === "gamepad") {
      gamepadType = this.scene.inputController?.getConfig(
        this.scene.inputController.selectedDevice[Device.GAMEPAD]
      )?.padType || "keyboard";
    } else if (this.scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = this.scene.inputMethod || "keyboard";
    }
    const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
    const iconPath = isGamepad
      ? (this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CANCEL") || "BACK.png")
      : "BACK.png";
    return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
  }

  private ensureShowDetailsHint(): void {
    if (this.showDetailsHintContainer) {
      return;
    }
    const { gamepadType, iconPath, scale } = this.getCycleAbilityIconInfo();
    this.showDetailsHintContainer = this.scene.add.container(0, 0);
    this.showDetailsHintContainer.setVisible(false);
    this.showDetailsHintBg = this.scene.add.graphics();
    this.showDetailsHintContainer.add(this.showDetailsHintBg);
    const keySprite = this.scene.add.sprite(0, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0, 0.5);
    this.showDetailsHintKeySprite = keySprite;
    const label = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("modifierSelectUiHandler:showDetails", { defaultValue: "Show Details" }),
      TextStyle.WINDOW,
      { fontSize: "30px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.displayWidth + 2;
    this.showDetailsHintLabel = label;
    this.showDetailsHintContainer.add([keySprite, label]);
    this.showDetailsHintContainer.setDepth(10000000000);
    this.showDetailsHintContainer.setInteractive(new Phaser.Geom.Rectangle(-4, -8, 120, 16), Phaser.Geom.Rectangle.Contains);
    this.showDetailsHintContainer.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (!type) {
        return;
      }
      const highestWave = ((this.scene as BattleScene).gameData?.gameStats?.highestWaveReached || 0);
      const inSkillTreeModifierContext = (this.scene as BattleScene).skillTreeModifierContext === true;
      const isForbiddenFormUnlock = type instanceof ForbiddenFormUnlockModifierType;
      const isRankUpContext = type?.group === "rankup";
      const tooltipLocked = false;
      if (tooltipLocked) {
        return;
      }
      if (!this.scene.modifierTooltipsEnabled) {
        this.setModifierTooltipsEnabled(true);
        this.updateShowDetailsHint(option, true);
        this.setCursor(this.cursor);
      } else {
        this.setModifierTooltipsEnabled(false);
        this.hideUpgradeTooltip();
        this.moveInfoOverlay.clear();
        this.moveInfoOverlay.setVisible(false);
        this.moveInfoOverlay.active = false;
        this.updateShowDetailsHint(option, true);
        this.setCursor(this.cursor);
      }
    });
    this.scene.ui.add(this.showDetailsHintContainer);
  }

  private updateShowDetailsHint(option: ModifierOption | null, visible: boolean): void {
    if (!visible || !option) {
      if (this.showDetailsHintContainer) {
        this.showDetailsHintContainer.setVisible(false);
      }
      return;
    }
    this.ensureShowDetailsHint();
    if (!this.showDetailsHintContainer) {
      return;
    }
    const { gamepadType, iconPath, scale } = this.getCycleAbilityIconInfo();
    if (this.showDetailsHintKeySprite) {
      this.showDetailsHintKeySprite.setTexture(gamepadType);
      this.showDetailsHintKeySprite.setFrame(iconPath);
      this.showDetailsHintKeySprite.setScale(scale);
    }
    if (this.showDetailsHintLabel) {
      const forceShowDetails = this.firstFocusPending;
      const key = (!forceShowDetails && this.scene.modifierTooltipsEnabled) ? "modifierSelectUiHandler:hideDetails" : "modifierSelectUiHandler:showDetails";
      const fallback = (!forceShowDetails && this.scene.modifierTooltipsEnabled) ? "Hide Details" : "Show Details";
      this.showDetailsHintLabel.setText(i18next.t(key, { defaultValue: fallback }));
    }
    if (this.showDetailsHintKeySprite && this.showDetailsHintLabel) {
      this.showDetailsHintLabel.x = this.showDetailsHintKeySprite.displayWidth + 2;
    }
    let hintX = option.x;
    if (this.rowCursor >= 2 && option.itemCostText?.visible && option.itemCostText?.alpha > 0) {
      const costLocalX = option.itemCostText.x;
      const costWidth = option.itemCostText.displayWidth;
      const costOriginX = option.itemCostText.originX;
      hintX = option.x + costLocalX - costWidth * costOriginX;
    } else if (this.rowCursor === 1 && this.showDetailsHintKeySprite && this.showDetailsHintLabel) {
      const hintW = this.showDetailsHintKeySprite.displayWidth + this.showDetailsHintLabel.displayWidth + 2;
      hintX = option.x - hintW / 2;
    }
    this.showDetailsHintContainer.setPosition(hintX, option.y + option.getItemNameBottomY() + this.getShowDetailsHintYOffset());
    this.showDetailsHintContainer.setVisible(true);
  }

  protected getShowDetailsHintYOffset(): number {
    const count = this.options?.length ?? 0;
    if (count <= 4) return 5;
    if (count >= 5 && this.cursor > 0) return -3.5;
    return 0;
  }

  protected shouldDrawFocusChip(): boolean {
    return true;
  }

  protected shouldPopulateMessageBar(): boolean {
    return true;
  }

  protected shouldCreateTooltipOnSetCursor(): boolean {
    if (this.firstFocusPending) {
      return false;
    }
    if (this.tooltipDeferredUntilUserInput && this.displayConfig?.hideShop) {
      return false;
    }
    return true;
  }

  private redrawShowDetailsHintBg(colors: { border: number; bg: number } | null, targetWidth: number | null = null): void {
    if (!this.showDetailsHintBg || !this.showDetailsHintContainer || !this.showDetailsHintKeySprite || !this.showDetailsHintLabel) {
      return;
    }
    this.showDetailsHintBg.clear();
    if (!colors || !this.showDetailsHintContainer.visible) {
      return;
    }
    const key = this.showDetailsHintKeySprite;
    const label = this.showDetailsHintLabel;
    const left = key.x - key.displayWidth / 2;
    const right = label.x + label.displayWidth;
    const hh = Math.max(key.displayHeight, label.displayHeight);
    const top = -hh / 2;
    const padX = 4;
    const padY = 2;
    const contentCenterX = (left + right) / 2;
    const contentW = (right - left) + padX * 2;
    const w = targetWidth !== null ? Math.max(contentW, targetWidth) : contentW;
    const x = contentCenterX - w / 2;
    const y = top - padY;
    const h = hh + padY * 2;
    this.showDetailsHintBg.fillStyle(colors.bg, 0.65);
    this.showDetailsHintBg.lineStyle(1, colors.border, 0.85);
    this.showDetailsHintBg.fillRect(x, y, w, h);
    this.showDetailsHintBg.strokeRect(x, y, w, h);
  }

  private applyBbCodeWordWrap(textObj: BBCodeText, tooltipWidth: number, padding: number): void {
    const scaleX = textObj.scaleX || 1;
    const wrapWidthPreScale = Math.max(0, (tooltipWidth - padding * 2) / scaleX);
    const lineSpacing = textObj.lineSpacing;
    textObj.setStyle({
      ...(textObj.style as any),
      wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
    } as any);
    textObj.setLineSpacing(lineSpacing);
  }

  private createHideDetailsButton(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getCycleAbilityIconInfo();
    const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("modifierSelectUiHandler:hideDetails", { defaultValue: "Hide Details" }),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-(tooltipWidth / 2), -8, tooltipWidth, 16), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (!this.scene.modifierTooltipsEnabled) {
        return;
      }
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (!type) {
        return;
      }
      this.setModifierTooltipsEnabled(false);
      this.hideUpgradeTooltip();
      this.moveInfoOverlay.clear();
      this.moveInfoOverlay.setVisible(false);
      this.moveInfoOverlay.active = false;
      this.updateShowDetailsHint(option, true);
      this.setCursor(this.cursor);
    });
    return container;
  }

  private createPartyDetailsButton(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getStatsIconInfo();
    const buttonY = tooltipHeight - padding - (buttonRowHeight * 1.5);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const buttonText = this.partyDetailsContext?.kind === "FUSION"
      ? i18next.t("modifierSelectUiHandler:tooltipPreviewFusionsButton", { defaultValue: "PREVIEW FUSIONS" })
      : i18next.t("nodeMode:tooltipDetails", { defaultValue: "More Info" });
    const label = addTextObject(
      this.scene,
      0,
      0,
      buttonText,
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 200, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.partyDetailsContext) {
        this.enterPartyDetailsMode();
        return;
      }

      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (type instanceof ForbiddenFormUnlockModifierType && this.scene.modifierTooltipsEnabled && this.upgradeTooltipContainer) {
        this.enterForbiddenFormDetailsMode(type);
      }
    });
    return container;
  }

  private createPartyBackButton(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getCancelIconInfo();
    const buttonY = tooltipHeight - padding - (buttonRowHeight * 1.5);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("modifierSelectUiHandler:hideDetails", { defaultValue: "Hide Details" }),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 200, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.forbiddenFormDetailsActive) {
        this.exitForbiddenFormDetailsMode();
      } else {
        this.exitPartyDetailsMode();
      }
    });
    return container;
  }

  private enterPartyDetailsMode(): void {
    if (!this.partyDetailsContext || !this.upgradeTooltipContainer || (this.partyDetailsContext.kind !== "SECTION_RELAY" && this.partyDetailsParty.length === 0)) {
      return;
    }
    this.partyDetailsActive = true;
    this.partyDetailsIndex = 0;
    this.partyDetailsPartnerIndex = 0;
    if (this.partyDetailsContext?.kind === "FUSION") {
      const party = this.partyDetailsParty;
      const firstEligibleIdx = party.findIndex((p, idx) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0);
      if (firstEligibleIdx >= 0) {
        this.partyDetailsIndex = firstEligibleIdx;
      }
      this.fusionPreviewHighlightIndex = this.getFusionGridHighlightIndex();
    }
    if (this.partyDetailsButton) {
      this.partyDetailsButton.setVisible(false);
    }
    if (this.partyBackButton) {
      this.partyBackButton.setVisible(true);
    }
    this.ensurePartyDetailsTooltip();
    if (this.partyDetailsTooltipContainer) {
      this.partyDetailsTooltipContainer.setVisible(true);
    }
    this.updatePartyDetails();
  }

  private exitPartyDetailsMode(): void {
    this.partyDetailsActive = false;
    this.partyDetailsIndex = 0;
    this.partyDetailsPartnerIndex = 0;
    if (this.partyDetailsContext?.kind === "FUSION") {
      this.fusionPreviewHighlightIndex = -1;
    }
    if (this.partyDetailsButton) {
      this.partyDetailsButton.setVisible(true);
    }
    if (this.partyBackButton) {
      this.partyBackButton.setVisible(false);
    }
    if (this.partyDetailsTooltipContainer) {
      this.partyDetailsTooltipContainer.setVisible(false);
    }
    if (this.currentModifierSections) {
      for (const sec of this.currentModifierSections) {
        if (sec?.embeddedContainer) sec.embeddedContainer.setVisible(false);
      }
    }
    this.updatePartyDetailsMainBody();
    if (this.partyDetailsContext?.kind === "FUSION") {
      this.setCursor(this.cursor);
    }
  }

  private updatePartyDetails(): void {
    this.updatePartyDetailsMainBody();
    this.updatePartyDetailsTooltip();
  }

  private updatePartyDetailsMainBody(): void {
    if (!this.partyDetailsContext || !this.upgradeTooltipBody) {
      return;
    }
    if (this.partyDetailsContext.kind === "FUSION") {
      return;
    }
    if (this.partyDetailsContext.kind === "SECTION_RELAY") {
      return;
    }
    const headerLines = this.partyDetailsHeaderLines;
    const marker = `[color=#ffffff]>[/color] `;
    const lines: string[] = [...headerLines];
    const maxIndex = Math.max(0, this.partyDetailsPartyLines.length - 1);
    if (this.partyDetailsIndex > maxIndex) {
      this.partyDetailsIndex = maxIndex;
    }
    for (let i = 0; i < this.partyDetailsPartyLines.length; i++) {
      const line = this.partyDetailsPartyLines[i];
      if (this.partyDetailsActive && i === this.partyDetailsIndex) {
        lines.push(`${marker}${line}`);
      } else {
        lines.push(`  ${line}`);
      }
    }
    this.upgradeTooltipBody.setText(lines.join('\n'));
    this.applyBbCodeWordWrap(this.upgradeTooltipBody, this.TOOLTIP_WIDTH, 6);
  }

  private ensurePartyDetailsTooltip(): void {
    if (!this.partyDetailsContext || !this.upgradeTooltipContainer || this.partyDetailsTooltipContainer) {
      return;
    }
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const centerX = tooltipWidth / 2 + 2;
    const textX = padding + 2;

    this.partyDetailsTooltipContainer = this.scene.add.container(0, 0);
    this.partyDetailsTooltipContainer.setVisible(false);

    this.partyDetailsTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 60, 12, 12, 12, 12);
    this.partyDetailsTooltipBg.setOrigin(0, 0);
    this.partyDetailsTooltipTitleBarBg = this.scene.add.graphics();
    this.partyDetailsTooltipRarityBarBg = this.scene.add.graphics();

    this.partyDetailsTooltipTitle = addTextObject(
      this.scene,
      centerX,
      8,
      "",
      TextStyle.WINDOW,
      { fontSize: "40px" }
    );
    this.partyDetailsTooltipTitle.setOrigin(0.5, 0.5);

    this.fusionTitleLeftArrow = this.scene.add.image(12, 8, "cursor_reverse");
    this.fusionTitleLeftArrow.setScale(0.4);
    this.fusionTitleLeftArrow.setOrigin(0.5, 0.5);
    this.fusionTitleLeftArrow.setInteractive({ useHandCursor: true });
    this.fusionTitleLeftArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.shiftFusionPartner(-1)) this.getUi().playSelect();
    });
    this.fusionTitleLeftArrow.setVisible(false);

    this.fusionTitleRightArrow = this.scene.add.image(tooltipWidth - 12, 8, "cursor");
    this.fusionTitleRightArrow.setScale(0.4);
    this.fusionTitleRightArrow.setOrigin(0.5, 0.5);
    this.fusionTitleRightArrow.setInteractive({ useHandCursor: true });
    this.fusionTitleRightArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.shiftFusionPartner(1)) this.getUi().playSelect();
    });
    this.fusionTitleRightArrow.setVisible(false);

    this.partyDetailsTooltipSubtitle = addTextObject(
      this.scene,
      centerX,
      17,
      "",
      TextStyle.WINDOW,
      { fontSize: "30px" }
    );
    this.partyDetailsTooltipSubtitle.setOrigin(0.5, 0.5);

    this.partyDetailsTooltipBody = this.createColoredComparisonText(textX, 24, "");
    this.applyBbCodeWordWrap(this.partyDetailsTooltipBody, tooltipWidth, padding);

    const buttonRowHeight = 10;
    this.partyDetailsNavContainer = this.createPartyDetailsNavRow(tooltipWidth, padding, buttonRowHeight);
    this.partyDetailsNavContainer.setVisible(false);

    this.partyDetailsTooltipContainer.add([
      this.partyDetailsTooltipBg,
      this.partyDetailsTooltipTitleBarBg,
      this.partyDetailsTooltipRarityBarBg,
      this.partyDetailsTooltipTitle,
      this.fusionTitleLeftArrow,
      this.fusionTitleRightArrow,
      this.partyDetailsTooltipSubtitle,
      this.partyDetailsTooltipBody,
      this.partyDetailsNavContainer
    ]);
    this._partyDetailsPattern = attachModalBackground(this.scene as BattleScene, this.partyDetailsTooltipContainer, () => ({
      bgX: 0, bgY: 0,
      bgWidth: this.partyDetailsTooltipBg?.width ?? 120,
      bgHeight: this.partyDetailsTooltipBg?.height ?? 60
    }), { mask: false, alphaMultiplier: 0.6 });

    this.upgradeTooltipContainer.add(this.partyDetailsTooltipContainer);
    this.upgradeTooltipContainer.bringToTop(this.partyDetailsTooltipContainer);
  }

  private createPartyDetailsNavRow(tooltipWidth: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(tooltipWidth / 2, 0);
    const left = this.scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.shiftFusionPartner(-1)) {
        this.getUi().playSelect();
      }
    });
    const right = this.scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.shiftFusionPartner(1)) {
        this.getUi().playSelect();
      }
    });
    this.partyDetailsNavLabel = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "35px" });
    this.partyDetailsNavLabel.setOrigin(0.5, 0.5);
    container.add([left, this.partyDetailsNavLabel, right]);
    return container;
  }

  private getFusionPartnerIndices(party: PlayerPokemon[], baseIndex: integer): integer[] {
    const base = party[baseIndex];
    if (!base || base.isFusion()) {
      return [];
    }
    const indices: integer[] = [];
    for (let i = 0; i < party.length; i++) {
      if (i === baseIndex) {
        continue;
      }
      const p = party[i];
      if (!p || p.isFusion()) {
        continue;
      }
      indices.push(i);
    }
    return indices;
  }

  private shiftFusionPartner(delta: integer): boolean {
    if (!this.partyDetailsActive || this.partyDetailsContext?.kind !== "FUSION") {
      return false;
    }
    const party = this.partyDetailsParty;
    if (!party.length) {
      return false;
    }
    const partners = this.getFusionPartnerIndices(party, this.partyDetailsIndex);
    if (!partners.length) {
      return false;
    }
    const next = this.partyDetailsPartnerIndex + delta;
    if (next < 0 || next >= partners.length) {
      return false;
    }
    this.partyDetailsPartnerIndex = next;
    this.updatePartyDetails();
    return true;
  }

  private getFusionGridHighlightIndex(): integer {
    const party = this.partyDetailsParty;
    const eligible = party.filter((p, idx) => !p.isFusion() && this.getFusionPartnerIndices(party, idx).length > 0);
    return eligible.indexOf(party[this.partyDetailsIndex]);
  }

  private getFusionPreviewTypes(base: PlayerPokemon, partner: PlayerPokemon): Type[] {
    const types: Type[] = [];
    const baseForm = base.getSpeciesForm(true);
    const partnerForm = partner.getSpeciesForm(true);
    types.push(baseForm.type1);
    if (partnerForm.type2 !== null && partnerForm.type2 !== baseForm.type1) {
      types.push(partnerForm.type2);
    } else if (partnerForm.type1 !== baseForm.type1) {
      types.push(partnerForm.type1);
    }
    if (types.length === 1 && baseForm.type2 !== null) {
      types.push(baseForm.type2);
    }
    if (types.length > 1 && types.includes(Type.UNKNOWN)) {
      const index = types.indexOf(Type.UNKNOWN);
      if (index !== -1) {
        types.splice(index, 1);
      }
    }
    if (!types.length) {
      types.push(Type.UNKNOWN);
    }
    return types;
  }

  private getFusionPreviewBaseStats(base: PlayerPokemon, partner: PlayerPokemon): { stats: Record<Stat, number>; pick1: { stat: Stat; value: number; pokemonName: string }; pick2: { stat: Stat; value: number; pokemonName: string } } {
    const baseStats = base.getSpeciesForm().baseStats.slice(0);
    const fusionBaseStats = partner.getSpeciesForm().baseStats.slice(0);
    const nature = base.getNature();

    const natureStatsMultipliers = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD]
      .map(s => ({ stat: s, mult: getNatureStatMultiplier(nature, s) }));
    const boostedStat = natureStatsMultipliers.find(s => s.mult > 1)?.stat;
    const firstPickStatType = (boostedStat !== undefined ? boostedStat : Stat.HP) as Stat;

    const assignedStats = new Set<number>();
    const finalBaseStats = baseStats.slice(0);

    const firstPickValue = Math.max(baseStats[firstPickStatType], fusionBaseStats[firstPickStatType]);
    finalBaseStats[firstPickStatType] = firstPickValue;
    assignedStats.add(firstPickStatType);
    const pick1FromPartner = fusionBaseStats[firstPickStatType] > baseStats[firstPickStatType];
    const pick1PokemonName = pick1FromPartner ? partner.name : base.name;

    const primaryFullRanked: Array<{ value: number; stat: number }> = [];
    const fusionFullRanked: Array<{ value: number; stat: number }> = [];

    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    for (const s of statOrder) {
      primaryFullRanked.push({ value: baseStats[s], stat: s });
      fusionFullRanked.push({ value: fusionBaseStats[s], stat: s });
    }

    primaryFullRanked.sort((a, b) => b.value - a.value);
    fusionFullRanked.sort((a, b) => b.value - a.value);

    const allStatsEqual =
      primaryFullRanked.every(s => s.value === primaryFullRanked[0].value) &&
      fusionFullRanked.every(s => s.value === fusionFullRanked[0].value) &&
      primaryFullRanked[0].value === fusionFullRanked[0].value;

    let secondPickStat: Stat;
    let secondPickValue: number;
    let pick2FromPartner = false;

    if (allStatsEqual) {
      if (firstPickStatType === Stat.HP) {
        secondPickStat = Stat.SPD as Stat;
      } else {
        secondPickStat = Stat.HP as Stat;
      }
      secondPickValue = baseStats[secondPickStat];
      pick2FromPartner = false;
    } else {
      const primaryMax = primaryFullRanked[0].value;
      const fusionMax = fusionFullRanked[0].value;

      const primarySecondHighest = primaryFullRanked.find(s => s.value < primaryMax) || primaryFullRanked[1];
      const fusionSecondHighest = fusionFullRanked.find(s => s.value < fusionMax) || fusionFullRanked[1];

      const primarySecondIsNatureStat = primarySecondHighest.stat === firstPickStatType;
      const fusionSecondIsNatureStat = fusionSecondHighest.stat === firstPickStatType;
      const primaryThirdCandidate = primaryFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== primaryFullRanked[0].stat) || null;
      const fusionThirdCandidate = fusionFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== fusionFullRanked[0].stat) || null;

      if (primarySecondIsNatureStat && fusionSecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (p.value > f.value) {
          secondPickStat = p.stat as Stat;
          secondPickValue = p.value;
          pick2FromPartner = false;
        } else {
          secondPickStat = f.stat as Stat;
          secondPickValue = f.value;
          pick2FromPartner = true;
        }
      } else if (primarySecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        if (p.value > fusionSecondHighest.value) {
          secondPickStat = p.stat as Stat;
          secondPickValue = p.value;
          pick2FromPartner = false;
        } else {
          secondPickStat = fusionSecondHighest.stat as Stat;
          secondPickValue = fusionSecondHighest.value;
          pick2FromPartner = true;
        }
      } else if (fusionSecondIsNatureStat) {
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (f.value > primarySecondHighest.value) {
          secondPickStat = f.stat as Stat;
          secondPickValue = f.value;
          pick2FromPartner = true;
        } else {
          secondPickStat = primarySecondHighest.stat as Stat;
          secondPickValue = primarySecondHighest.value;
          pick2FromPartner = false;
        }
      } else {
        if (primarySecondHighest.value > fusionSecondHighest.value) {
          secondPickStat = primarySecondHighest.stat as Stat;
          secondPickValue = primarySecondHighest.value;
          pick2FromPartner = false;
        } else if (fusionSecondHighest.value > primarySecondHighest.value) {
          secondPickStat = fusionSecondHighest.stat as Stat;
          secondPickValue = fusionSecondHighest.value;
          pick2FromPartner = true;
        } else {
          secondPickStat = primarySecondHighest.stat as Stat;
          secondPickValue = primarySecondHighest.value;
          pick2FromPartner = false;
        }
      }

      if (secondPickStat === firstPickStatType) {
        const primaryThird = primaryFullRanked.find(s => s.stat !== firstPickStatType);
        const fusionThird = fusionFullRanked.find(s => s.stat !== firstPickStatType);
        if (primaryThird && fusionThird) {
          if (primaryThird.value > fusionThird.value) {
            secondPickStat = primaryThird.stat as Stat;
            secondPickValue = primaryThird.value;
            pick2FromPartner = false;
          } else {
            secondPickStat = fusionThird.stat as Stat;
            secondPickValue = fusionThird.value;
            pick2FromPartner = true;
          }
        }
      }
    }

    finalBaseStats[secondPickStat] = secondPickValue;
    assignedStats.add(secondPickStat);

    for (const s of statOrder) {
      if (!assignedStats.has(s)) {
        finalBaseStats[s] = Math.ceil((baseStats[s] + fusionBaseStats[s]) / 2);
      }
    }

    const out = {} as Record<Stat, number>;
    for (const s of statOrder) {
      out[s] = finalBaseStats[s];
    }
    const pick2PokemonName = pick2FromPartner ? partner.name : base.name;
    return { stats: out, pick1: { stat: firstPickStatType, value: firstPickValue, pokemonName: pick1PokemonName }, pick2: { stat: secondPickStat, value: secondPickValue, pokemonName: pick2PokemonName } };
  }

  private buildFusionBeforeAfterStatsBody(beforeStats: Record<Stat, number>, afterStats: Record<Stat, number>, firstPick: Stat, secondPick: Stat): string {
    const beforeLabel = i18next.t("modifierSelectUiHandler:before", { defaultValue: "Before" });
    const afterLabel = i18next.t("modifierSelectUiHandler:after", { defaultValue: "After" });
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const getColor = (stat: Stat): string => {
      if (stat === firstPick) return "#00bfff";
      if (stat === secondPick) return "#ffd700";
      return "#e8e8a8";
    };
    const beforeParts = statOrder.map(stat => {
      const name = getStatName(stat, true);
      const value = beforeStats[stat];
      const color = getColor(stat);
      return `[color=${color}]${name}: ${value}[/color]`;
    }).join(" | ");
    const afterParts = statOrder.map(stat => {
      const name = getStatName(stat, true);
      const value = afterStats[stat];
      const color = getColor(stat);
      return `[color=${color}]${name}: ${value}[/color]`;
    }).join(" | ");
    const beforeLine = `[color=#ffffff]${beforeLabel}:[/color] ${beforeParts}`;
    const afterLine = `[color=#ffffff]${afterLabel}:[/color] ${afterParts}`;
    return `${beforeLine}\n${afterLine}`;
  }

  private getFusionPreviewDetailsBody(base: PlayerPokemon, partner: PlayerPokemon): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const typesLabel = i18next.t("skillTree:descriptions.altBuildTypes", { defaultValue: "Types:" });
    const fusedTypes = this.getFusionPreviewTypes(base, partner).filter(t => t !== Type.UNKNOWN).map(t => this.getLocalizedTypeName(t)).join("/");
    lines.push(`${typesLabel} [color=#00bfff]${fusedTypes}[/color]`);

    const abilityLabel = i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
    const fusedAbility = partner.getAbility(true);
    lines.push(`${abilityLabel} [color=#78c850]${fusedAbility?.name || ""}[/color]`);

    const movesLabel = i18next.t("modifierSelectUiHandler:possibleMoves", { defaultValue: "Possible Moves:" });
    const baseMoves = base.getMoveset().filter(m => m).map(m => m!.getName());
    const partnerMoves = partner.getMoveset().filter(m => m).map(m => m!.getName());
    const allMoveNames = Array.from(new Set([...baseMoves, ...partnerMoves]));
    lines.push(getBBCodeFrag(`${movesLabel} ${allMoveNames.join(", ")}`, TextStyle.WINDOW, uiTheme));
    lines.push(`[size=2] [/size]`);

    const statsLabel = i18next.t("skillTree:descriptions.altBuildStats", { defaultValue: "Stats:" });
    lines.push(getBBCodeFrag(`${statsLabel}`, TextStyle.WINDOW, uiTheme));

    const baseStatsArr = base.getSpeciesForm().baseStats;
    const beforeStats = {} as Record<Stat, number>;
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    for (const s of statOrder) {
      beforeStats[s] = baseStatsArr[s];
    }

    const fusionResult = this.getFusionPreviewBaseStats(base, partner);
    const afterStats = fusionResult.stats;

    const natureName = getNatureName(base.getNature());
    const pick1StatName = getStatName(fusionResult.pick1.stat, true);
    const pick2StatName = getStatName(fusionResult.pick2.stat, true);
    const pick1StatAndValue = `[color=#00bfff]${pick1StatName} ${fusionResult.pick1.value}[/color]`;
    const pick2StatAndValue = `[color=#ffd700]${pick2StatName} ${fusionResult.pick2.value}[/color]`;
    const pick1Line = i18next.t("modifierSelectUiHandler:fusionPick1Detail", {
      nature: natureName,
      pokemonName: fusionResult.pick1.pokemonName,
      statAndValue: pick1StatAndValue,
      defaultValue: `1) ${natureName} Highest: ${fusionResult.pick1.pokemonName} ${pick1StatAndValue}`
    });
    const pick2Line = i18next.t("modifierSelectUiHandler:fusionPick2Detail", {
      pokemonName: fusionResult.pick2.pokemonName,
      statAndValue: pick2StatAndValue,
      defaultValue: `2) 2nd Best Stat: ${fusionResult.pick2.pokemonName} ${pick2StatAndValue}`
    });
    lines.push(pick1Line);
    lines.push(pick2Line);
    lines.push(this.buildFusionBeforeAfterStatsBody(beforeStats, afterStats, fusionResult.pick1.stat, fusionResult.pick2.stat));

    return lines.join('\n');
  }

  private buildFusionPreviewContainer(base: PlayerPokemon, partner: PlayerPokemon): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const textX = padding + 2;
    const typeAtlasKey = Utils.getLocalizedSpriteKey("types");
    const statNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "Atk" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "Def" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SpAtk" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SpDef" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "Spd" }),
    ];
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    let currentY = 0;

    const contentLeft = textX + 2;
    const contentRight = tooltipWidth - padding - 2;
    const totalContentW = contentRight - contentLeft;
    const movesColW = totalContentW;

    const movesLabel = i18next.t("modifierSelectUiHandler:possibleMoves", { defaultValue: "Possible Moves:" }).replace(/:$/, "").toUpperCase();
    const movesHeaderText = addTextObject(this.scene, textX, currentY + 3, movesLabel, TextStyle.WINDOW, {
      fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
    });
    movesHeaderText.setOrigin(0, 0.5);
    movesHeaderText.setColor("#666666");
    movesHeaderText.setAlpha(0.72);
    movesHeaderText.setShadow(0, 0, undefined);
    container.add(movesHeaderText);

    const movesHdrLineGfx = this.scene.add.graphics();
    movesHdrLineGfx.lineStyle(0.5, 0x666666, 0.60);
    movesHdrLineGfx.lineBetween(textX + movesHeaderText.displayWidth + 4, currentY + 3, contentRight, currentY + 3);
    container.add(movesHdrLineGfx);

    currentY += 7;
    const twoColStartY = currentY;

    const rowPitch = 9;
    const baseMoves = base.getMoveset().filter(m => m);
    const partnerMoves = partner.getMoveset().filter(m => m);
    const seen = new Set<number>();
    const allMoveSlots: any[] = [];
    for (const m of baseMoves) {
      if (m && !seen.has(m.moveId)) {
        seen.add(m.moveId);
        allMoveSlots.push({ slot: m, pokemon: base });
      }
    }
    for (const m of partnerMoves) {
      if (m && !seen.has(m.moveId)) {
        seen.add(m.moveId);
        allMoveSlots.push({ slot: m, pokemon: partner });
      }
    }

    const use2Col = allMoveSlots.length > 4;
    const moveColWidth = use2Col
      ? Math.floor(movesColW / 2)
      : movesColW;

    const renderMoveRow = (entry: any, colX: number, rowY: number) => {
      const { slot, pokemon: movePokemon } = entry;
      const move = slot.getMove(true);
      const moveType = movePokemon.getMoveType(move);
      let xCursor = colX;

      if (this.scene.textures.exists(typeAtlasKey)) {
        const typeFrame = Type[moveType]?.toLowerCase() || "unknown";
        const typeSpr = this.scene.add.sprite(xCursor, rowY + 4, typeAtlasKey, typeFrame);
        typeSpr.setScale(0.35);
        typeSpr.setOrigin(0, 0.5);
        container.add(typeSpr);
        xCursor += typeSpr.displayWidth + 1;
      }

      const moveNameText = addTextObject(this.scene, xCursor, rowY + 1, slot.getName(), TextStyle.WINDOW, { fontSize: "31px" });
      moveNameText.setOrigin(0, 0);
      container.add(moveNameText);

      const maxMoveW = moveColWidth - (xCursor - colX) - 2;
      if (moveNameText.displayWidth > maxMoveW && maxMoveW > 0) {
        moveNameText.setScale(maxMoveW / moveNameText.displayWidth, 1);
      }
    };

    let movesBottomY: number;
    if (use2Col) {
      const midIdx = Math.ceil(allMoveSlots.length / 2);
      const col1 = allMoveSlots.slice(0, midIdx);
      const col2 = allMoveSlots.slice(midIdx);
      const col1X = contentLeft;
      const col2X = contentLeft + moveColWidth;
      const maxRows = Math.max(col1.length, col2.length);
      for (let r = 0; r < maxRows; r++) {
        const rowY = twoColStartY + r * rowPitch;
        if (r < col1.length) renderMoveRow(col1[r], col1X, rowY);
        if (r < col2.length) renderMoveRow(col2[r], col2X, rowY);
      }
      movesBottomY = twoColStartY + maxRows * rowPitch;
    } else {
      for (let i = 0; i < allMoveSlots.length; i++) {
        renderMoveRow(allMoveSlots[i], contentLeft, twoColStartY + i * rowPitch);
      }
      movesBottomY = twoColStartY + allMoveSlots.length * rowPitch;
    }

    currentY = movesBottomY + 3;

    const abilityLabel = i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" });
    const abilityHeaderText = addTextObject(this.scene, textX, currentY + 3, abilityLabel, TextStyle.WINDOW, {
      fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
    });
    abilityHeaderText.setOrigin(0, 0.5);
    abilityHeaderText.setColor("#666666");
    abilityHeaderText.setAlpha(0.72);
    abilityHeaderText.setShadow(0, 0, undefined);
    container.add(abilityHeaderText);

    const abilLineGfx = this.scene.add.graphics();
    abilLineGfx.lineStyle(0.5, 0x666666, 0.60);
    abilLineGfx.lineBetween(textX + abilityHeaderText.displayWidth + 4, currentY + 3, contentRight, currentY + 3);
    container.add(abilLineGfx);
    currentY += 7;

    const fusedAbility = partner.getAbility(true);
    if (fusedAbility) {
      const abilName = addTextObject(this.scene, contentLeft, currentY, fusedAbility.name, TextStyle.WINDOW, { fontSize: "41px" });
      abilName.setOrigin(0, 0);
      abilName.setColor("#78c850");
      container.add(abilName);
      currentY += abilName.displayHeight + 1;

      if (fusedAbility.description) {
        const abilDesc = addTextObject(this.scene, contentLeft, currentY, fusedAbility.description, TextStyle.WINDOW, {
          fontSize: "41px", wordWrap: { width: (tooltipWidth - padding * 2 - 4) * 6 }
        });
        abilDesc.setOrigin(0, 0);
        abilDesc.setColor("#F0F0F0");
        container.add(abilDesc);
        currentY += abilDesc.displayHeight + 2;
      }
    }

    currentY += 3;
    const statsLabel = i18next.t("modifierSelectUiHandler:tooltipStatsHeader", { defaultValue: "STATS" });
    const statsHeaderText = addTextObject(this.scene, textX, currentY + 3, statsLabel, TextStyle.WINDOW, {
      fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
    });
    statsHeaderText.setOrigin(0, 0.5);
    statsHeaderText.setColor("#666666");
    statsHeaderText.setAlpha(0.72);
    statsHeaderText.setShadow(0, 0, undefined);
    container.add(statsHeaderText);

    const statsLineGfx = this.scene.add.graphics();
    statsLineGfx.lineStyle(0.5, 0x666666, 0.60);
    statsLineGfx.lineBetween(textX + statsHeaderText.displayWidth + 4, currentY + 3, tooltipWidth - padding - 2, currentY + 3);
    container.add(statsLineGfx);
    currentY += 7;

    const baseStatsArr = base.getSpeciesForm().baseStats;
    const beforeStats = {} as Record<Stat, number>;
    for (const s of statOrder) {
      beforeStats[s] = baseStatsArr[s];
    }
    const fusionResult = this.getFusionPreviewBaseStats(base, partner);
    const afterStats = fusionResult.stats;

    const statCols = 3;
    const statRowCount = 2;
    const statLineSpacing = 14;
    const gridStartX = textX + 2;
    const colWidth = Math.floor((tooltipWidth - gridStartX - padding) / statCols);
    const maxBarW = 20;
    const barH = 3;

    for (let row = 0; row < statRowCount; row++) {
      for (let col = 0; col < statCols; col++) {
        const idx = row * statCols + col;
        const stat = statOrder[idx];
        const colLeft = gridStartX + col * colWidth;
        const sy = currentY + row * statLineSpacing;
        const beforeVal = beforeStats[stat];
        const afterVal = afterStats[stat] as number;

        const lbl = addTextObject(this.scene, colLeft + 1, sy + 1, statNames[idx], TextStyle.WINDOW, { fontSize: "30px" });
        lbl.setOrigin(0, 0);
        container.add(lbl);

        const barX = colLeft + 13;
        if (afterVal !== beforeVal) {
          const minVal = Math.min(afterVal, beforeVal);
          const maxVal = Math.max(afterVal, beforeVal);
          const baseBarW = Math.max(2, (minVal / 255) * maxBarW);
          const baseBar = this.scene.add.rectangle(barX, sy + 2, baseBarW, barH, 0x4a90e2);
          baseBar.setOrigin(0, 0);
          container.add(baseBar);

          const deltaW = ((maxVal - minVal) / 255) * maxBarW;
          const deltaColor = afterVal > beforeVal ? 0x00ff00 : 0xe13d3d;
          const deltaBar = this.scene.add.rectangle(barX + baseBarW, sy + 2, deltaW, barH, deltaColor);
          deltaBar.setOrigin(0, 0);
          container.add(deltaBar);

          const valX = barX + baseBarW + deltaW + 2;
          const valText = addTextObject(this.scene, valX, sy + 1, afterVal.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          valText.setColor(afterVal > beforeVal ? "#78c850" : "#e13d3d");
          container.add(valText);
        } else {
          const barWidth = Math.max(2, Math.min(maxBarW, (afterVal / 255) * maxBarW));
          const bar = this.scene.add.rectangle(barX, sy + 2, barWidth, barH, 0x4a90e2);
          bar.setOrigin(0, 0);
          container.add(bar);

          const valText = addTextObject(this.scene, barX + barWidth + 2, sy + 1, afterVal.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          container.add(valText);
        }
      }
    }
    currentY += statRowCount * statLineSpacing + 4;

    const bstLabel = addTextObject(this.scene, gridStartX, currentY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "28px" });
    bstLabel.setOrigin(0, 0);
    bstLabel.setColor("#cccccc");
    container.add(bstLabel);
    let bstSum = 0;
    let beforeBstSum = 0;
    for (const s of statOrder) {
      bstSum += afterStats[s] as number;
      beforeBstSum += beforeStats[s];
    }
    const bstValX = gridStartX + bstLabel.displayWidth + 3;
    const bstValText = addTextObject(this.scene, bstValX, currentY, bstSum.toString(), TextStyle.WINDOW, { fontSize: "28px" });
    bstValText.setOrigin(0, 0);
    bstValText.setColor("#f8f8f8");
    container.add(bstValText);

    const bstDelta = bstSum - beforeBstSum;
    if (bstDelta !== 0) {
      const bstDeltaSign = bstDelta > 0 ? "+" : "";
      const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
      const bstDeltaText = addTextObject(this.scene, bstValX + bstValText.displayWidth + 1, currentY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "26px" });
      bstDeltaText.setOrigin(0, 0);
      bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
      bstDeltaText.setAlpha(0.75);
      container.add(bstDeltaText);
    }
    currentY += 10;

    container.setData("renderedHeight", currentY);
    return container;
  }

  private buildBeforeAfterStatsBody(beforeStats: Record<Stat, number>, afterStats: Record<Stat, number>): string {
    const beforeLabel = i18next.t("modifierSelectUiHandler:before", { defaultValue: "Before" });
    const afterLabel = i18next.t("modifierSelectUiHandler:after", { defaultValue: "After" });
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeParts = statOrder.map(stat => {
      const name = getStatName(stat, true);
      const value = beforeStats[stat];
      return `[color=#e8e8a8]${name}: ${value}[/color]`;
    }).join(" | ");
    const afterParts = statOrder.map(stat => {
      const name = getStatName(stat, true);
      const beforeValue = beforeStats[stat];
      const afterValue = afterStats[stat];
      let color = "#e8e8a8";
      if (afterValue > beforeValue) {
        color = "#78c850";
      } else if (afterValue < beforeValue) {
        color = "#e13d3d";
      }
      const nameFrag = `[color=${color}]${name}:[/color]`;
      const valueFrag = `[color=${color}]${afterValue}[/color]`;
      return `${nameFrag} ${valueFrag}`;
    }).join(" | ");
    const beforeLine = `[color=#ffffff]${beforeLabel}:[/color] ${beforeParts}`;
    const afterLine = `[color=#ffffff]${afterLabel}:[/color] ${afterParts}`;
    return `${beforeLine}\n${afterLine}`;
  }

  private getMintBeforeAfterStatsBody(pokemon: PlayerPokemon, targetNature: Nature): string {
    const currentNature = pokemon.getNature();
    const baseStats = pokemon.getModifiedBaseStats();
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    for (const stat of statOrder) {
      const baseValue = baseStats[stat];
      const beforeMult = getNatureStatMultiplier(currentNature, stat);
      const afterMult = getNatureStatMultiplier(targetNature, stat);
      beforeStats[stat] = Math.floor(baseValue * beforeMult);
      afterStats[stat] = Math.floor(baseValue * afterMult);
    }
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getStatSwitcherBeforeAfterStatsBody(pokemon: PlayerPokemon, stat1: Stat, stat2: Stat): string {
    const baseStats = pokemon.getModifiedBaseStats();
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    for (const stat of statOrder) {
      beforeStats[stat] = baseStats[stat];
    }
    for (const stat of statOrder) {
      if (stat === stat1) {
        afterStats[stat] = beforeStats[stat2];
      } else if (stat === stat2) {
        afterStats[stat] = beforeStats[stat1];
      } else {
        afterStats[stat] = beforeStats[stat];
      }
    }
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getStatSwitcherRecommendations(party: PlayerPokemon[], stat1: Stat, stat2: Stat): { partyIndex: number; name: string; netGain: number; gainingStat: Stat; losingStat: Stat; roleLabel: string }[] {
    const recommendations: { partyIndex: number; name: string; netGain: number; gainingStat: Stat; losingStat: Stat; roleLabel: string }[] = [];
    for (let idx = 0; idx < party.length; idx++) {
      const pokemon = party[idx];
      const types = pokemon.getTypes();
      const prefs = this.getTypeStatPreferencesDeterministic(types[0], types.length > 1 ? types[1] : undefined);
      const baseStats = pokemon.getModifiedBaseStats();
      const v1 = baseStats[stat1];
      const v2 = baseStats[stat2];

      const stat1Preferred = prefs.includes(stat1);
      const stat2Preferred = prefs.includes(stat2);

      if (stat1Preferred && !stat2Preferred && v2 > v1) {
        recommendations.push({ partyIndex: idx, name: pokemon.name, netGain: v2 - v1, gainingStat: stat1, losingStat: stat2, roleLabel: this.getComprehensiveRoleLabel(pokemon, stat1, stat1, stat2) });
      } else if (stat2Preferred && !stat1Preferred && v1 > v2) {
        recommendations.push({ partyIndex: idx, name: pokemon.name, netGain: v1 - v2, gainingStat: stat2, losingStat: stat1, roleLabel: this.getComprehensiveRoleLabel(pokemon, stat2, stat1, stat2) });
      }
    }
    return recommendations.sort((a, b) => b.netGain - a.netGain).slice(0, 3);
  }

  private getTypeStatPreferencesDeterministic(type1: Type, type2?: Type): Stat[] {
    const prefs1 = TYPE_STAT_PREFERENCES[type1] || [Stat.HP, Stat.ATK, Stat.DEF];
    if (!type2 || type2 === Type.UNKNOWN) return prefs1;
    const prefs2 = TYPE_STAT_PREFERENCES[type2] || [];
    const combined = [...prefs1];
    for (const stat of prefs2) {
      if (!combined.includes(stat)) combined.push(stat);
    }
    return combined.slice(0, 3);
  }

  private getCoreRole(stat: Stat): string {
    switch (stat) {
      case Stat.HP: return i18next.t("modifierSelectUiHandler:coreTank", { defaultValue: "Tank" });
      case Stat.ATK: return i18next.t("modifierSelectUiHandler:coreAttacker", { defaultValue: "Attacker" });
      case Stat.DEF: return i18next.t("modifierSelectUiHandler:coreWall", { defaultValue: "Wall" });
      case Stat.SPATK: return i18next.t("modifierSelectUiHandler:coreSweeper", { defaultValue: "Sweeper" });
      case Stat.SPDEF: return i18next.t("modifierSelectUiHandler:coreWall", { defaultValue: "Wall" });
      case Stat.SPD: return i18next.t("modifierSelectUiHandler:coreSweeper", { defaultValue: "Sweeper" });
      default: return "";
    }
  }

  private getStatModifier(stat: Stat): string {
    switch (stat) {
      case Stat.HP: return i18next.t("modifierSelectUiHandler:modBulky", { defaultValue: "Bulky" });
      case Stat.ATK: return i18next.t("modifierSelectUiHandler:modPhysical", { defaultValue: "Physical" });
      case Stat.DEF: return i18next.t("modifierSelectUiHandler:modArmored", { defaultValue: "Armored" });
      case Stat.SPATK: return i18next.t("modifierSelectUiHandler:modSpecial", { defaultValue: "Special" });
      case Stat.SPDEF: return i18next.t("modifierSelectUiHandler:modResilient", { defaultValue: "Resilient" });
      case Stat.SPD: return i18next.t("modifierSelectUiHandler:modFast", { defaultValue: "Fast" });
      default: return "";
    }
  }

  private getComprehensiveRoleLabel(pokemon: PlayerPokemon, _gainingStat: Stat, swapStat1: Stat, swapStat2: Stat): string {
    const rawStats = pokemon.stats;
    const baseStats = [...rawStats];
    baseStats[swapStat1] = rawStats[swapStat2];
    baseStats[swapStat2] = rawStats[swapStat1];
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const ranked = [...statOrder].sort((a, b) => baseStats[b] - baseStats[a]);
    const top1 = ranked[0];
    const top2 = ranked[1];
    const top3 = ranked[2];
    const topSet = [top1, top2, top3];

    const hasPhysAndSpecial = topSet.includes(Stat.ATK) && topSet.includes(Stat.SPATK);
    const hasBothDefenses = topSet.includes(Stat.DEF) && topSet.includes(Stat.SPDEF);

    if (hasPhysAndSpecial) {
      const core = this.getCoreRole(top1);
      return i18next.t("modifierSelectUiHandler:roleMixed", { core, defaultValue: `Mixed ${core}` });
    }
    if (hasBothDefenses && ![top1, top2].includes(Stat.ATK) && ![top1, top2].includes(Stat.SPATK)) {
      return i18next.t("modifierSelectUiHandler:roleResilientWall", { defaultValue: "Resilient Armored Wall" });
    }
    const core = this.getCoreRole(top1);
    const modifier = this.getStatModifier(top2);
    return `${modifier} ${core}`;
  }

  private getStatSacrificeBeforeAfterStatsBody(pokemon: PlayerPokemon, stat: Stat): string {
    const baseStats = pokemon.getModifiedBaseStats();
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    for (const s of statOrder) {
      beforeStats[s] = baseStats[s];
      afterStats[s] = baseStats[s];
    }
    afterStats[stat] = Math.floor(beforeStats[stat] * 1.12);
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getBaseStatBoostBeforeAfterStatsBody(pokemon: PlayerPokemon, stat: Stat, multiplier: number): string {
    const baseStats = pokemon.getModifiedBaseStats();
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    for (const s of statOrder) {
      beforeStats[s] = baseStats[s];
      afterStats[s] = baseStats[s];
    }
    afterStats[stat] = Math.floor(beforeStats[stat] * multiplier);
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getSoulDewBeforeAfterStatsBody(pokemon: PlayerPokemon): string {
    const nature = pokemon.getNature();
    const baseStats = pokemon.getModifiedBaseStats();
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    let hasEffect = false;
    for (const stat of statOrder) {
      const baseValue = baseStats[stat];
      const beforeMult = getNatureStatMultiplier(nature, stat);
      let afterMult = beforeMult;
      if (beforeMult > 1) {
        afterMult = beforeMult + 0.1;
        hasEffect = true;
      } else if (beforeMult < 1) {
        afterMult = beforeMult - 0.1;
        hasEffect = true;
      }
      beforeStats[stat] = Math.floor(baseValue * beforeMult);
      afterStats[stat] = Math.floor(baseValue * afterMult);
    }
    if (!hasEffect) {
      const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
      return `[color=#888888]${noEffectLabel}[/color]`;
    }
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getMoveSacrificeDetailsBody(pokemon: PlayerPokemon): string {
    const movesetLabel = i18next.t("pokemonInfoContainer:moveset", { defaultValue: "Moveset" });
    const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
    const moves = pokemon.getMoveset().filter(m => m).map(m => m!.getName());
    if (!moves.length) {
      return `[color=#888888]${noneLabel}[/color]`;
    }
    return `${movesetLabel}:\n${moves.map(m => `  ${m}`).join('\n')}`;
  }

  private updatePartyDetailsTooltip(): void {
    if (!this.partyDetailsActive || !this.partyDetailsContext || !this.upgradeTooltipContainer) {
      return;
    }
    this.ensurePartyDetailsTooltip();
    if (!this.partyDetailsTooltipContainer ||
        !this.partyDetailsTooltipBg ||
        !this.partyDetailsTooltipTitleBarBg ||
        !this.partyDetailsTooltipRarityBarBg ||
        !this.partyDetailsTooltipTitle ||
        !this.partyDetailsTooltipSubtitle ||
        !this.partyDetailsTooltipBody) {
      return;
    }

    const pokemon = this.partyDetailsParty[this.partyDetailsIndex];
    if (!pokemon && this.partyDetailsContext.kind !== "SECTION_RELAY") {
      this.partyDetailsTooltipContainer.setVisible(false);
      return;
    }

    if (this.partyDetailsContext.kind !== "FUSION" && this.partyDetailsFusionContent) {
      this.partyDetailsFusionContent.destroy();
      this.partyDetailsFusionContent = null;
    }
    if (this.partyDetailsContext.kind !== "SECTION_RELAY" && this.partyDetailsRelayContent) {
      this.partyDetailsRelayContent.destroy();
      this.partyDetailsRelayContent = null;
    }

    const rarity = this.partyDetailsRarity || SkillTreeRarity.COMMON;
    const rarityColors = getUpgradeRarityColors(rarity);

    let bodyText = "";
    let subtitleText = i18next.t("nodeMode:tooltipDetails", { defaultValue: "DETAILS" });
    if (this.partyDetailsContext.kind === "MINT") {
      const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
      if (pokemon.getNature() === this.partyDetailsContext.targetNature) {
        bodyText = `[color=#888888]${noEffectLabel}[/color]`;
      } else {
        bodyText = this.getMintBeforeAfterStatsBody(pokemon, this.partyDetailsContext.targetNature);
      }
    } else if (this.partyDetailsContext.kind === "STAT_SWITCHER") {
      bodyText = this.getStatSwitcherBeforeAfterStatsBody(pokemon, this.partyDetailsContext.stat1, this.partyDetailsContext.stat2);
    } else if (this.partyDetailsContext.kind === "STAT_SACRIFICE") {
      bodyText = this.getStatSacrificeBeforeAfterStatsBody(pokemon, this.partyDetailsContext.stat);
    } else if (this.partyDetailsContext.kind === "BASE_STAT_BOOST") {
      bodyText = this.getBaseStatBoostBeforeAfterStatsBody(pokemon, this.partyDetailsContext.stat, this.partyDetailsContext.multiplier);
    } else if (this.partyDetailsContext.kind === "SOUL_DEW") {
      bodyText = this.getSoulDewBeforeAfterStatsBody(pokemon);
    } else if (this.partyDetailsContext.kind === "MOVE_SACRIFICE") {
      bodyText = this.getMoveSacrificeDetailsBody(pokemon);
    } else if (this.partyDetailsContext.kind === "SECTION_RELAY") {
      if (this.partyDetailsRelayContent) {
        const embeddedRefs = new Set(
          (this.currentModifierSections || [])
            .map(sec => sec?.embeddedContainer)
            .filter(Boolean)
        );
        const children = this.partyDetailsRelayContent.getAll();
        for (const child of children) {
          if (!embeddedRefs.has(child as Phaser.GameObjects.Container)) {
            (child as Phaser.GameObjects.GameObject).destroy();
          }
        }
        this.partyDetailsRelayContent.removeAll(false);
        this.partyDetailsRelayContent.destroy();
        this.partyDetailsRelayContent = null;
      }
      if (this.currentModifierSections && this.currentModifierSections.length > 0) {
        const relayContainer = this.scene.add.container(0, 24);
        let currentY = 0;
        if (this.currentModifierSections) {
          for (const sec of this.currentModifierSections) {
            if (sec?.embeddedContainer) sec.embeddedContainer.setVisible(true);
          }
        }
        for (const sec of this.currentModifierSections) {
          if (sec.label) {
            const hdr = this.createSectionHeaderWithLine(sec.label, currentY, this.TOOLTIP_WIDTH);
            relayContainer.add([hdr.header, hdr.line]);
            currentY = hdr.nextY;
          }
          if (sec.body) {
            const sBody = addBBCodeTextObject(this.scene, 8, currentY, sec.body, TextStyle.WINDOW, { fontSize: "46px" });
            sBody.setOrigin(0, 0);
            this.applyBbCodeWordWrap(sBody, this.TOOLTIP_WIDTH, 6);
            sBody.setColor("#ffffff");
            relayContainer.add(sBody);
            currentY += sBody.displayHeight + 2;
          }
          if (sec.embeddedContainer) {
            sec.embeddedContainer.setPosition(4, currentY);
            relayContainer.add(sec.embeddedContainer);
            const h = sec.embeddedContainer.getData("renderedHeight");
            currentY += (h && h > 0) ? h + 2 : (sec.embeddedContainer.getBounds().height / 6) + 2;
          }
        }
        relayContainer.setData("renderedHeight", currentY);
        this.partyDetailsRelayContent = relayContainer;
        this.partyDetailsTooltipContainer!.add(relayContainer);
        bodyText = "";
      }
    } else if (this.partyDetailsContext.kind === "FUSION") {
      const party = this.partyDetailsParty;
      const partners = this.getFusionPartnerIndices(party, this.partyDetailsIndex);
      if (this.partyDetailsFusionContent) {
        this.partyDetailsFusionContent.destroy();
        this.partyDetailsFusionContent = null;
      }
      if (!partners.length) {
        const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
        bodyText = `[color=#888888]${noEffectLabel}[/color]`;
        this.partyDetailsNavContainer?.setVisible(false);
        this.partyDetailsTooltipTitle.setText(pokemon.name);
        if (this.fusionTitleLeftArrow) this.fusionTitleLeftArrow.setVisible(false);
        if (this.fusionTitleRightArrow) this.fusionTitleRightArrow.setVisible(false);
      } else {
        if (this.partyDetailsPartnerIndex < 0) {
          this.partyDetailsPartnerIndex = 0;
        }
        if (this.partyDetailsPartnerIndex >= partners.length) {
          this.partyDetailsPartnerIndex = partners.length - 1;
        }
        const partner = party[partners[this.partyDetailsPartnerIndex]];
        const fusedName = getFusedSpeciesName(pokemon.species.getName(pokemon.formIndex), partner.species.getName(partner.formIndex));
        bodyText = "";
        this.partyDetailsFusionContent = this.buildFusionPreviewContainer(pokemon, partner);
        this.partyDetailsFusionContent.setPosition(0, 24);
        this.partyDetailsTooltipContainer!.add(this.partyDetailsFusionContent);
        subtitleText = i18next.t("modifierSelectUiHandler:changeBase", { defaultValue: "CHANGE BASE" }) + " ▲▼";
        this.partyDetailsTooltipTitle.setText(fusedName);
        const showArrows = partners.length > 1;
        if (this.fusionTitleLeftArrow) this.fusionTitleLeftArrow.setVisible(showArrows);
        if (this.fusionTitleRightArrow) this.fusionTitleRightArrow.setVisible(showArrows);
        if (this.partyDetailsNavContainer && this.partyDetailsNavLabel) {
          this.partyDetailsNavContainer.setVisible(true);
          this.partyDetailsNavLabel.setText(`${this.partyDetailsPartnerIndex + 1}/${partners.length}`);
        }
      }
    }

    if (this.partyDetailsContext.kind !== "FUSION") {
      if (this.partyDetailsContext.kind === "SECTION_RELAY") {
        this.partyDetailsTooltipTitle.setText(this.upgradeTooltipTitle?.text ?? "DETAILS");
      } else {
        this.partyDetailsTooltipTitle.setText(pokemon.name);
      }
      if (this.partyDetailsNavContainer) {
        this.partyDetailsNavContainer.setVisible(false);
      }
      if (this.fusionTitleLeftArrow) this.fusionTitleLeftArrow.setVisible(false);
      if (this.fusionTitleRightArrow) this.fusionTitleRightArrow.setVisible(false);
    }
    this.partyDetailsTooltipSubtitle.setText(subtitleText);
    this.partyDetailsTooltipSubtitle.setTint(rarityColors.border);
    const partyRarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.partyDetailsTooltipTitle.setColor(partyRarityHex);

    this.partyDetailsTooltipBody.setText(bodyText);
    this.applyBbCodeWordWrap(this.partyDetailsTooltipBody, this.TOOLTIP_WIDTH, 6);
    this.partyDetailsTooltipBody.setVisible(!this.partyDetailsFusionContent && !this.partyDetailsRelayContent);

    const padding = 6;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const buttonRowHeight = 10;
    const contentH = this.partyDetailsRelayContent
      ? (this.partyDetailsRelayContent.getData("renderedHeight") || 80)
      : this.partyDetailsFusionContent
        ? (this.partyDetailsFusionContent.getData("renderedHeight") || 80)
        : this.partyDetailsTooltipBody.displayHeight;
    const tooltipHeight = barsHeight + contentH + (padding * 2) + padding + (this.partyDetailsNavContainer && this.partyDetailsNavContainer.visible ? (buttonRowHeight + padding) : 0);

    this.partyDetailsTooltipBg.setSize(tooltipWidth, tooltipHeight);
    this._partyDetailsPattern?.redraw();

    this.partyDetailsTooltipTitleBarBg.clear();

    this.partyDetailsTooltipRarityBarBg.clear();
    this.partyDetailsTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.partyDetailsTooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, this.TOOLTIP_RARITY_BAR_HEIGHT);

    for (const badge of this.partyDetailsTypeBadges) {
      badge.destroy();
    }
    this.partyDetailsTypeBadges = [];

    if (this.partyDetailsContext.kind === "FUSION") {
      const party = this.partyDetailsParty;
      const partners = this.getFusionPartnerIndices(party, this.partyDetailsIndex);
      if (partners.length > 0) {
        const partnerIdx = partners[Math.max(0, Math.min(this.partyDetailsPartnerIndex, partners.length - 1))];
        const fusedTypes = this.getFusionPreviewTypes(pokemon, party[partnerIdx]).filter(t => t !== Type.UNKNOWN);
        const badgeX = tooltipWidth - 12;
        if (fusedTypes.length === 1) {
          const frame = Type[fusedTypes[0]]?.toLowerCase() || "unknown";
          const spr = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type", frame);
          spr.setScale(0.35);
          spr.setOrigin(1, 0.5);
          this.partyDetailsTooltipContainer!.add(spr);
          this.partyDetailsTypeBadges.push(spr);
        } else if (fusedTypes.length >= 2) {
          const frame0 = Type[fusedTypes[0]]?.toLowerCase() || "unknown";
          const frame1 = Type[fusedTypes[1]]?.toLowerCase() || "unknown";
          const spr1 = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type1", frame0);
          spr1.setScale(0.35);
          spr1.setOrigin(1, 1);
          this.partyDetailsTooltipContainer!.add(spr1);
          this.partyDetailsTypeBadges.push(spr1);
          const spr2 = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type2", frame1);
          spr2.setScale(0.35);
          spr2.setOrigin(1, 0);
          this.partyDetailsTooltipContainer!.add(spr2);
          this.partyDetailsTypeBadges.push(spr2);
        }
      }
    }

    if (this.partyDetailsNavContainer && this.partyDetailsNavContainer.visible) {
      const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
      this.partyDetailsNavContainer.setPosition(tooltipWidth / 2, buttonY);
    }

    const modalWidth = this.scene.game.canvas.width / 6;
    const modalHeight = this.scene.game.canvas.height / 6;
    const screenLeft = 0;
    const screenRight = modalWidth;
    const screenTop = -modalHeight;
    const screenBottom = 0;

    const mainX = this.upgradeTooltipContainer.x;
    const mainY = this.upgradeTooltipContainer.y;
    const mainWidth = this.TOOLTIP_WIDTH;
    const mainHeight = this.partyDetailsMainTooltipHeight;
    const gap = 7;

    const preferRightX = mainX + mainWidth + gap;
    const preferLeftX = mainX - tooltipWidth - gap;
    let globalX = preferRightX;
    if (globalX + tooltipWidth > screenRight) {
      globalX = preferLeftX;
    }
    globalX = Math.max(screenLeft, Math.min(screenRight - tooltipWidth, globalX));

    const desiredGlobalY = mainY + (mainHeight - tooltipHeight) / 2;
    const minY = screenTop;
    const maxY = screenBottom - tooltipHeight;
    const globalY = Math.max(minY, Math.min(maxY, desiredGlobalY));

    this.partyDetailsTooltipContainer.setPosition(globalX - mainX, globalY - mainY);
    this.partyDetailsTooltipContainer.setVisible(true);
  }

  setRowCursor(rowCursor: integer): boolean {
    const lastRowCursor = this.rowCursor;

    if (rowCursor !== lastRowCursor) {
      this.rowCursor = rowCursor;
      let newCursor = Math.round(this.cursor / Math.max(this.getRowItems(lastRowCursor) - 1, 1) * (this.getRowItems(rowCursor) - 1));
      if (rowCursor === 0) {
        const maxCursor = this.getRowItems(rowCursor) - 1;
        if (newCursor > maxCursor) {
          newCursor = maxCursor;
        }
        if (newCursor < 0) {
          newCursor = 0;
        }
      }
      this.cursor = -1;
      this.setCursor(newCursor);
      return true;
    }

    return false;
  }
  public getButtonLayout(): Array<{x: number, y: number, descKey: string}> {
    const layout: Array<{x: number, y: number, descKey: string}> = [];

    if (this.rerollButtonContainer.visible) {
      layout.push({ x: 6, y: this.lockRarityButtonContainer.visible ? -72 : -60, descKey: "modifierSelectUiHandler:rerollDesc" });
    }

    if (this.permaRerollButtonContainer.visible) {
      layout.push({ x: 76, y: this.lockRarityButtonContainer.visible ? -72 : -60, descKey: "modifierSelectUiHandler:permaRerollDesc" });
    }

    if (this.transferButtonContainer.visible) {
      layout.push({
        x: (this.scene.game.canvas.width - this.transferButtonWidth - this.checkButtonWidth)/6 - 30,
        y: -60,
        descKey: "modifierSelectUiHandler:transferDesc"
      });
    }

    if (this.checkButtonContainer.visible) {
      layout.push({
        x: (this.scene.game.canvas.width - this.checkButtonWidth)/6 - 10,
        y: -60,
        descKey: "modifierSelectUiHandler:checkTeamDesc"
      });
    }
    if (this.lockRarityButtonContainer.visible) {
      layout.push({
        x: 6,
        y: -60,
        descKey: "modifierSelectUiHandler:lockRaritiesDesc"
      });
    }

    return layout;
  }

  protected getRowItems(rowCursor: integer): integer {
    switch (rowCursor) {
      case 0:
        return this.getButtonLayout().length;
      case 1:
        return this.options.length;
      default:
        if (this.shopOptionsRows.length === 0) {
          return 0;
        }
        const index = this.shopOptionsRows.length - (rowCursor - 1);

        if (index < 0 || index >= this.shopOptionsRows.length) {
          return 0;
        }

        return this.shopOptionsRows[index].length;
    }
  }

   setRerollCost(rerollCost: integer): void {
    this.rerollCost = rerollCost;
  }

  setRerollVisible(visible: boolean): void {
    this.rerollSuppressed = !visible;
    this.rerollButtonContainer.setVisible(visible);
    this.permaRerollButtonContainer.setVisible(visible);
    this.lockRarityButtonContainer.setVisible(visible);
  }

  setPermaRerollCost(permaRerollCost: integer): void {
    this.permaRerollCost = permaRerollCost;
  }

  updateCostText(): void {
    const shopOptions = this.shopOptionsRows.flat();
    for (const shopOption of shopOptions) {
      shopOption.updateCostText();
    }

    this.updateRerollCostText();
  }

  updateRerollCostText(): void {
    const isDraft = this.forcedDraftSelection;
    const canReroll = isDraft
      ? this.scene.gameData.permaMoney >= this.rerollCost
      : this.scene.money >= this.rerollCost;

    const textStyle = isDraft
      ? canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED
      : canReroll ? TextStyle.MONEY : TextStyle.PARTY_RED;

    const translationKey = isDraft
      ? "modifierSelectUiHandler:rerollPermaCost"
      : "modifierSelectUiHandler:rerollCost";

    const formattedMoney = Utils.formatMoney(this.scene.moneyFormat, this.rerollCost);

    this.rerollCostText.setText(i18next.t(translationKey, { formattedMoney }));
    this.rerollCostText.setColor(this.getTextColor(textStyle));
    this.rerollCostText.setShadowColor(this.getTextColor(textStyle, true));
  }

  updatePermaRerollCostText(): void {
    const canReroll = this.scene.gameData.permaMoney >= this.permaRerollCost;
    const textStyle = canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED;
    const formattedMoney = Utils.formatMoney(this.scene.moneyFormat, this.permaRerollCost);

    this.permaRerollCostText.setText(i18next.t("modifierSelectUiHandler:permaRerollCost", { formattedMoney }));
    this.permaRerollCostText.setColor(this.getTextColor(textStyle));
    this.permaRerollCostText.setShadowColor(this.getTextColor(textStyle, true));
  }

  updateLockRaritiesText(): void {
    const textStyle = this.scene.lockModifierTiers ? TextStyle.SUMMARY_BLUE : TextStyle.PARTY;
    this.lockRarityButtonText.setColor(this.getTextColor(textStyle));
    this.lockRarityButtonText.setShadowColor(this.getTextColor(textStyle, true));
  }

  private showUpgradeTooltip(modifierType: MoveUpgradeModifierType): void {
    if (this.upgradeTooltipContainer) {
      this.hideUpgradeTooltip();
    }

    const comparisonText = this.generateComparisonText(modifierType);
    if (!comparisonText) return;

    const tempModifier = modifierType.newModifier() as MoveUpgradeModifier;
    const category = tempModifier.upgradeCategory;
    const tier = tempModifier.upgradeTier;
    const maxTier = category ? UpgradeCategoryUtils.getMoveUpgradeMaxTier(category) : 1;
    const rarity = (tier && category) ? getUpgradeRarityFromTier(tier, maxTier) : getUpgradeRarityFromTier(tier || 1, 1, true);
    const rarityColors = getUpgradeRarityColors(rarity);

    this.moveUpgradeDetailsActive = false;
    this.moveUpgradePreviewTier = tier || 1;
    this.moveUpgradeCurrentTier = tier || 1;
    this.moveUpgradePreviewMaxTier = maxTier;
    this.moveUpgradePreviewCategory = category || null;
    this.moveUpgradePreviewMoveId = tempModifier.moveId;
    this.moveUpgradePreviewMoveName = allMoves[tempModifier.moveId]?.name || "";
    this.moveUpgradeLastType = modifierType;

    const { titleText, subtitleText, bodyText } = this.parseUpgradeComparisonText(comparisonText);
    this.buildUpgradeTooltip(titleText, subtitleText, bodyText, rarityColors);
  }

  private buildUpgradeTooltip(titleText: string, subtitleText: string, bodyText: string, rarityColors: { border: number; bg: number }): void {
    this.upgradeTooltipContainer = this.scene.add.container(0, 0);

    this.upgradeTooltipContainer.setDepth(10000000001);
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const buttonRowHeight = 10;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const centerX = tooltipWidth / 2 + 2;
    const textX = padding + 2;

    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.upgradeTooltipTitle = addTextObject(this.scene, centerX, 8, titleText, TextStyle.WINDOW, { fontSize: "40px" });
    this.upgradeTooltipTitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipTitle.setColor(rarityHex);

    this.upgradeTooltipSubtitle = addTextObject(this.scene, centerX, 17, subtitleText, TextStyle.WINDOW, { fontSize: "30px" });
    this.upgradeTooltipSubtitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipSubtitle.setTint(rarityColors.border);

    const sectionObjects: Phaser.GameObjects.GameObject[] = [];
    let currentSectionY = 24;

    const hasWarnings = bodyText.includes(i18next.t("moveUpgradeAttrs:multiHitWarning")) ||
      bodyText.includes(i18next.t("moveUpgradeAttrs:flinchWarning"));

    if (hasWarnings) {
      const bodyLines = bodyText.split("\n");
      const statStartIdx = bodyLines.findIndex(l => l === "");
      const warnLines = statStartIdx > 0 ? bodyLines.slice(0, statStartIdx) : [];
      const statsLines = statStartIdx >= 0 ? bodyLines.slice(statStartIdx + 1) : bodyLines;

      if (warnLines.length > 0) {
        const notesHdr = this.createSectionHeaderWithLine(
          i18next.t("modifierSelectUiHandler:tooltipNotesHeader", { defaultValue: "NOTES" }),
          currentSectionY, tooltipWidth
        );
        sectionObjects.push(notesHdr.header, notesHdr.line);
        currentSectionY = notesHdr.nextY;

        const warnBody = this.createColoredComparisonText(textX, currentSectionY, warnLines.join("\n"));
        this.applyBbCodeWordWrap(warnBody, tooltipWidth, padding);
        sectionObjects.push(warnBody);
        currentSectionY += warnBody.displayHeight + 4;
      }

      const statsHdr = this.createSectionHeaderWithLine(
        i18next.t("modifierSelectUiHandler:tooltipChangesHeader", { defaultValue: "CHANGES" }),
        currentSectionY, tooltipWidth
      );
      sectionObjects.push(statsHdr.header, statsHdr.line);
      currentSectionY = statsHdr.nextY;

      if (statsLines.length > 0) {
        const statsBody = this.createColoredComparisonText(textX, currentSectionY, statsLines.join("\n"));
        this.applyBbCodeWordWrap(statsBody, tooltipWidth, padding);
        sectionObjects.push(statsBody);
        currentSectionY += statsBody.displayHeight;
      }
    } else {
      const statsHdr = this.createSectionHeaderWithLine(
        i18next.t("modifierSelectUiHandler:tooltipChangesHeader", { defaultValue: "CHANGES" }),
        currentSectionY, tooltipWidth
      );
      sectionObjects.push(statsHdr.header, statsHdr.line);
      currentSectionY = statsHdr.nextY;

      this.upgradeTooltipBody = this.createColoredComparisonText(textX, currentSectionY, bodyText);
      this.applyBbCodeWordWrap(this.upgradeTooltipBody, tooltipWidth, padding);
      sectionObjects.push(this.upgradeTooltipBody);
      currentSectionY += this.upgradeTooltipBody.displayHeight;
    }

    const enableDetails = this.moveUpgradePreviewCategory !== null && this.moveUpgradePreviewMaxTier > 1;
    const buttonRowCount = enableDetails ? (this.moveUpgradeDetailsActive ? 2 : 1) : 0;
    const bodyHeight = currentSectionY - 24;
    const tooltipHeight = buttonRowCount > 0
      ? barsHeight + bodyHeight + (padding * 3) + (buttonRowHeight * buttonRowCount)
      : barsHeight + bodyHeight + (padding * 2);

    this.upgradeTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, Math.round(tooltipWidth), Math.round(tooltipHeight), 12, 12, 12, 12);
    this.upgradeTooltipBg.setOrigin(0, 0);

    this.upgradeTooltipTitleBarBg = this.scene.add.graphics();

    this.upgradeTooltipRarityBarBg = this.scene.add.graphics();
    this.upgradeTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.upgradeTooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, this.TOOLTIP_RARITY_BAR_HEIGHT);

    if (enableDetails) {
      if (this.moveUpgradeDetailsActive) {
        this.moveUpgradeNavContainer = this.createMoveUpgradeNavRow(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
        this.moveUpgradeBackButton = this.createMoveUpgradeBackButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      } else {
        this.moveUpgradeDetailsButton = this.createMoveUpgradeDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      }
    }

    const rowOptions = (this.rowCursor === 1 ? this.options :
      (this.rowCursor >= 2 && this.shopOptionsRows.length >= (this.rowCursor - 1) ?
        this.shopOptionsRows[this.shopOptionsRows.length - (this.rowCursor - 1)] : []));
    const selectedOption = rowOptions[this.cursor];
    if (selectedOption) {
      const modalWidth = this.scene.game.canvas.width / 6;
      const modalHeight = this.scene.game.canvas.height / 6;
      const screenTop = -modalHeight;
      const screenBottom = 0;

      const xRight = selectedOption.x + this.TOOLTIP_OFFSET_X;
      const xLeft = selectedOption.x - this.TOOLTIP_OFFSET_X - tooltipWidth;
      let tooltipX = xRight + tooltipWidth > modalWidth ? xLeft : xRight;
      tooltipX = Math.max(0, Math.min(modalWidth - tooltipWidth, tooltipX));

      let tooltipY = selectedOption.y - tooltipHeight / 2;
      tooltipY = Math.max(screenTop, Math.min(screenBottom - tooltipHeight, tooltipY));
      this.upgradeTooltipContainer.setPosition(tooltipX, tooltipY);
    }

    const children: Phaser.GameObjects.GameObject[] = [
      this.upgradeTooltipBg,
      this.upgradeTooltipTitleBarBg,
      this.upgradeTooltipRarityBarBg,
      this.upgradeTooltipTitle,
      this.upgradeTooltipSubtitle,
      ...sectionObjects
    ];
    if (this.moveUpgradeDetailsButton) {
      children.push(this.moveUpgradeDetailsButton);
    }
    if (this.moveUpgradeNavContainer) {
      children.push(this.moveUpgradeNavContainer);
    }
    if (this.moveUpgradeBackButton) {
      children.push(this.moveUpgradeBackButton);
    }
    this.upgradeTooltipContainer.add(children);
    attachModalBackground(this.scene as BattleScene, this.upgradeTooltipContainer, () => ({
      bgX: 0, bgY: 0, bgWidth: Math.round(tooltipWidth), bgHeight: Math.round(tooltipHeight)
    }), { mask: false, alphaMultiplier: 0.6 });
    this.scene.ui.add(this.upgradeTooltipContainer);
  }

  private createMoveUpgradeDetailsButton(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getStatsIconInfo();
    const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("nodeMode:tooltipDetails", { defaultValue: "More Info" }),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 200, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      this.enterMoveUpgradeDetailsMode();
    });
    return container;
  }

  private createMoveUpgradeBackButton(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getCancelIconInfo();
    const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(
      this.scene,
      0,
      0,
      i18next.t("nodeMode:tooltipBack", { defaultValue: "Back" }),
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 200, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      this.exitMoveUpgradeDetailsMode();
    });
    return container;
  }

  private createMoveUpgradeNavRow(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const buttonY = tooltipHeight - padding - (buttonRowHeight * 1.5);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const left = this.scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.moveUpgradePreviewTier > this.moveUpgradeCurrentTier) {
        this.moveUpgradePreviewTier--;
        this.showMoveUpgradeTierPreviewTooltip();
      }
    });

    const right = this.scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.MODIFIER_SELECT) return;
      if (!isPrimaryPointer(pointer)) return;
      if (this.moveUpgradePreviewTier < this.moveUpgradePreviewMaxTier) {
        this.moveUpgradePreviewTier++;
        this.showMoveUpgradeTierPreviewTooltip();
      }
    });

    const label = addTextObject(
      this.scene,
      0,
      0,
      `${Utils.intToRoman(this.moveUpgradePreviewTier)}/${Utils.intToRoman(this.moveUpgradePreviewMaxTier)}`,
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    label.setOrigin(0.5, 0.5);
    container.add([left, label, right]);
    return container;
  }

  private enterMoveUpgradeDetailsMode(): void {
    if (!this.moveUpgradePreviewCategory || !this.moveUpgradeLastType) {
      return;
    }
    this.moveUpgradeDetailsActive = true;
    this.moveUpgradePreviewTier = this.moveUpgradeCurrentTier;
    this.showMoveUpgradeTierPreviewTooltip();
  }

  private exitMoveUpgradeDetailsMode(): void {
    if (!this.moveUpgradeLastType) {
      return;
    }
    this.moveUpgradeDetailsActive = false;
    this.showUpgradeTooltip(this.moveUpgradeLastType);
  }

  private getMoveUpgradePathStep(category: UpgradeCategory, tier: number): any | null {
    const index = tier - 1;
    switch (category) {
      case UpgradeCategory.POWER:
        return MoveUpgrade.POWER_PATH[index] || null;
      case UpgradeCategory.ACCURACY:
        return MoveUpgrade.ACCURACY_PATH[index] || null;
      case UpgradeCategory.HIT_HEAL:
        return MoveUpgrade.HIT_HEAL_PATH[index] || null;
      case UpgradeCategory.EFFECT_CHANCE:
        return MoveUpgrade.EFFECT_CHANCE_PATH[index] || null;
      case UpgradeCategory.CRIT:
        return MoveUpgrade.CRIT_PATH[index] || null;
      case UpgradeCategory.RECOIL_ADD:
        return MoveUpgrade.RECOIL_ADD_PATH[index] || null;
      case UpgradeCategory.RECOIL_DECREASE:
        return MoveUpgrade.RECOIL_DECREASE_PATH[index] || null;
      case UpgradeCategory.SACRIFICIAL:
        return MoveUpgrade.SACRIFICIAL_PATH[index] || null;
      case UpgradeCategory.CHARGE_MOVE:
        return MoveUpgrade.CHARGE_MOVE_PATH[index] || null;
      case UpgradeCategory.MULTI_HIT:
        return MoveUpgrade.MULTI_HIT_PATH[index] || null;
      case UpgradeCategory.POSITIVE_PRIORITY:
        return MoveUpgrade.POSITIVE_PRIORITY_PATH[index] || null;
      case UpgradeCategory.NEGATIVE_PRIORITY:
        return MoveUpgrade.NEGATIVE_PRIORITY_PATH[index] || null;
      case UpgradeCategory.ITEM_INTERACTION:
        return MoveUpgrade.ITEM_INTERACTION_PATH[index] || null;
      case UpgradeCategory.STATUS_IMPROVE:
        return MoveUpgrade.STATUS_IMPROVE_PATH[index] || null;
      case UpgradeCategory.STATUS_DUAL:
        return MoveUpgrade.STATUS_DUAL_PATH[index] || null;
      case UpgradeCategory.STAT_BOOST_SELF:
        return MoveUpgrade.STAT_BOOST_SELF_PATH[index] || null;
      case UpgradeCategory.STAT_LOWER_TARGET:
        return MoveUpgrade.STAT_LOWER_TARGET_PATH[index] || null;
      default:
        return null;
    }
  }

  private formatMoveUpgradeStepValue(value: any): string {
    if (typeof value === "number") {
      if (!Number.isInteger(value) && value > 0 && value < 1) {
        return `${Math.round(value * 1000) / 10}%`;
      }
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private buildMoveUpgradeTierPreviewType(category: UpgradeCategory, tier: number): MoveUpgradeModifierType | null {
    if (!this.moveUpgradeLastType || this.moveUpgradePreviewMoveId === null) {
      return null;
    }
    const moveId = this.moveUpgradePreviewMoveId as Moves;
    const baseMove = allMoves[moveId];
    if (!baseMove) {
      return null;
    }
    const step = this.getMoveUpgradePathStep(category, tier);
    if (!step) {
      return null;
    }
    const baseMovePower = baseMove.power;
    const baseMoveAccuracy = baseMove.accuracy;
    const isPhysicalMove = baseMove.category === MoveCategory.PHYSICAL;
    const isStatusMove = baseMove.category === MoveCategory.STATUS;
    const template = this.moveUpgradeLastType.newModifier() as MoveUpgradeModifier;

    let powerBoost: number = 0;
    let accuracyBoost: number = 0;
    let chanceChange: number | null = null;
    let attrs: MoveAttr[] = [];
    let flagsToAdd: number = 0;

    switch (category) {
      case UpgradeCategory.POWER: {
        const chanceToSet = step.setExistingChanceTo || null;
        const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, step.pBoost);
        const effectiveAccCost = baseMoveAccuracy === -1 ? 0 : step.accCost;
        powerBoost = cappedPBoost;
        accuracyBoost = -effectiveAccCost;
        chanceChange = chanceToSet;
        break;
      }
      case UpgradeCategory.ACCURACY: {
        const accDelta = step.accBoost === 101 ? (101 - baseMoveAccuracy) : step.accBoost;
        powerBoost = -step.pCost;
        accuracyBoost = accDelta;
        break;
      }
      case UpgradeCategory.HIT_HEAL: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        powerBoost = powerDelta;
        attrs = [new HitHealAttr(step.ratio)];
        break;
      }
      case UpgradeCategory.EFFECT_CHANCE: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        powerBoost = powerDelta;
        chanceChange = step.chance || null;
        attrs = [...(template.additionalAttrs || [])];
        break;
      }
      case UpgradeCategory.CRIT: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = powerDelta;
        accuracyBoost = accDelta;
        attrs = [step.critOnly ? new CritOnlyAttr() : new HighCritAttr()];
        break;
      }
      case UpgradeCategory.RECOIL_ADD: {
        const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, step.pBoost);
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = cappedPBoost;
        accuracyBoost = accDelta;
        attrs = [new RecoilAttr(false, step.ratio)];
        break;
      }
      case UpgradeCategory.RECOIL_DECREASE: {
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = -step.pCost;
        accuracyBoost = accDelta;
        attrs = [new RecoilAttr(false, step.ratio)];
        break;
      }
      case UpgradeCategory.SACRIFICIAL: {
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = step.pSet - baseMovePower;
        accuracyBoost = accDelta;
        if (step.attrId === "Half") {
          attrs = [new HalfSacrificialAttr()];
        } else if (step.attrId === "Full") {
          attrs = [new SacrificialAttr()];
        } else if (step.attrId === "FullOnHit") {
          attrs = [new SacrificialAttrOnHit()];
        }
        break;
      }
      case UpgradeCategory.CHARGE_MOVE: {
        const chargeAnim = isPhysicalMove ? ChargeAnim.SKULL_BASH_CHARGING : ChargeAnim.SOLAR_BEAM_CHARGING;
        const chargeTextKey = isPhysicalMove ? "moveUpgrade:moveTriggers:loweredItsHead" : "moveUpgrade:moveTriggers:tookInSunlight";
        const chargeText = i18next.t(chargeTextKey, { pokemonName: "{USER}" });
        attrs = [new ChargeAttr(chargeAnim, chargeText, null, !!step.addBoost)];
        if (step.addBoost) {
          attrs.push(new StatChangeAttr(BattleStat.DEF, 1, true));
        }
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = step.addBoost ? -10 : step.pBoost;
        accuracyBoost = accDelta;
        break;
      }
      case UpgradeCategory.MULTI_HIT: {
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        powerBoost = -baseMovePower + step.pSet;
        accuracyBoost = accDelta;
        chanceChange = step.chance || null;
        if (step.typeId === "2") {
          attrs = [new MultiHitAttr(MultiHitType._2)];
        } else if (step.typeId === "2-5") {
          attrs = [new MultiHitAttr(MultiHitType._2_TO_5)];
        } else if (step.typeId === "3") {
          attrs = [new MultiHitAttr(MultiHitType._3)];
        } else if (step.typeId === "4-8") {
          attrs = [new MultiHitAttr(MultiHitType._4_TO_8)];
        }
        flagsToAdd = 0;
        break;
      }
      case UpgradeCategory.POSITIVE_PRIORITY: {
        const priorityDelta = step.prio - baseMove.priority;
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        powerBoost = powerDelta;
        attrs = [new ConditionalPriorityAttr(priorityDelta)];
        break;
      }
      case UpgradeCategory.NEGATIVE_PRIORITY: {
        const priorityDelta = step.prio - baseMove.priority;
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, step.pBoost);
        powerBoost = cappedPBoost;
        accuracyBoost = accDelta;
        attrs = [new ConditionalPriorityAttr(priorityDelta)];
        break;
      }
      case UpgradeCategory.ITEM_INTERACTION: {
        let powerDelta = step.pBoost || 0;
        if (step.pCost !== undefined) {
          powerDelta -= step.pCost;
        }
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        powerBoost = powerDelta;
        if (step.type === "remove") {
          attrs = [new RemoveHeldItemAttr(false)];
        } else if (step.type === "steal") {
          attrs = [new StealHeldItemChanceAttr((step.chance || 0) / 100)];
        }
        break;
      }
      case UpgradeCategory.STATUS_IMPROVE: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        const currentChance = baseMove.chance || 0;
        const addChanceValue = step.addChance || 0;
        const nextChance = currentChance >= 50 ? currentChance : Math.min(50, currentChance + addChanceValue);
        powerBoost = powerDelta;
        accuracyBoost = accDelta;
        chanceChange = nextChance;
        break;
      }
      case UpgradeCategory.STATUS_DUAL: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        const rawAccCost = step.accCost || 0;
        const accDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
        const currentChance = baseMove.chance || 0;
        const statusChance = step.chance || currentChance;
        powerBoost = powerDelta;
        accuracyBoost = accDelta;
        chanceChange = statusChance;
        attrs = [...(template.additionalAttrs || [])];
        break;
      }
      case UpgradeCategory.STAT_BOOST_SELF: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        const chance = isStatusMove ? 100 : step.chance;
        const templateStat = (template.additionalAttrs || []).find(a => a instanceof StatChangeAttr) as StatChangeAttr | undefined;
        const templateStats = templateStat ? (Array.isArray(templateStat.stats) ? templateStat.stats : [templateStat.stats]) : [];
        attrs = [];
        if (templateStats.length > 0) {
          attrs.push(new StatChangeAttr(templateStats, step.level, true));
        }
        if (step.recoilCost !== undefined) {
          attrs.push(new RecoilAttr(false, step.recoilCost));
        }
        powerBoost = powerDelta;
        chanceChange = chance;
        break;
      }
      case UpgradeCategory.STAT_LOWER_TARGET: {
        let powerDelta = 0;
        if (step.pSetToRatio !== undefined) {
          powerDelta += Math.round(baseMovePower * step.pSetToRatio) - baseMovePower;
        }
        powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
        const templateStat = (template.additionalAttrs || []).find(a => a instanceof StatChangeAttr) as StatChangeAttr | undefined;
        const templateStats = templateStat ? (Array.isArray(templateStat.stats) ? templateStat.stats : [templateStat.stats]) : [];
        attrs = [];
        if (templateStats.length > 0) {
          attrs.push(new StatChangeAttr(templateStats, -step.level, false));
        }
        powerBoost = powerDelta;
        chanceChange = step.chance || null;
        break;
      }
      default: {
        attrs = [...(template.additionalAttrs || [])];
        break;
      }
    }

    return new MoveUpgradeModifierType(
      moveId,
      powerBoost,
      null,
      null,
      accuracyBoost,
      null,
      chanceChange,
      null,
      attrs,
      [],
      flagsToAdd,
      category,
      tier
    );
  }

  private showMoveUpgradeTierPreviewTooltip(): void {
    if (!this.moveUpgradePreviewCategory || this.moveUpgradePreviewMoveId === null) {
      return;
    }
    const category = this.moveUpgradePreviewCategory;
    const tier = this.moveUpgradePreviewTier;
    const maxTier = this.moveUpgradePreviewMaxTier;
    const rarity = getUpgradeRarityFromTier(tier, maxTier);
    const rarityColors = getUpgradeRarityColors(rarity);
    const previewType = this.buildMoveUpgradeTierPreviewType(category, tier);
    if (!previewType) {
      return;
    }
    const comparisonText = this.generateComparisonText(previewType);
    if (!comparisonText) {
      return;
    }
    const { titleText, subtitleText, bodyText } = this.parseUpgradeComparisonText(comparisonText);

    this.hideUpgradeTooltip();
    this.buildUpgradeTooltip(titleText, subtitleText, bodyText, rarityColors);
  }

  private generateComparisonText(modifierType: MoveUpgradeModifierType): string {
    this.lineCount = 0;

    const tempModifier = modifierType.newModifier() as MoveUpgradeModifier;
    const moveId = tempModifier.moveId;
    const cacheKey = `${moveId}_${tempModifier.powerBoost}_${tempModifier.accuracyBoost}_${tempModifier.upgradeCategory}_${tempModifier.upgradeTier || 0}`;

    if (this.tooltipCache.has(cacheKey)) {
      const cached = this.tooltipCache.get(cacheKey)!;
      this.multiHitWarning = cached.multiHitWarning;
      this.flinchWarning = cached.flinchWarning;
      this.secondaryEffectNote = cached.secondaryEffectNote;
      return cached.text;
    }

    const currentMove = this.scene.getUpgradedMove(allMoves[moveId], true, tempModifier.upgradeCategory ? true : false);
    const baseForUpgrade = currentMove;
    const upgradedMove = tempModifier.getMove(baseForUpgrade.clone());
    const uiTheme = this.scene.uiTheme;

    const comparisonLines: string[] = [];

    let displayTier = tempModifier.upgradeTier;
    let displayCategory: string | undefined = i18next.t(`moveUpgradeAttrs:${tempModifier.upgradeCategory}`);
    let shouldShowEX = false;

    const activeUpgrades = this.scene.getUpgradesForMove(moveId);

    if (!tempModifier.upgradeCategory) {
      const categoryUpgrade = activeUpgrades.find(upgrade => upgrade.upgradeCategory);

      if (categoryUpgrade) {
        displayTier = categoryUpgrade.upgradeTier;
      }
        displayCategory = i18next.t("moveUpgradeAttrs:extraEffectUpgrade");
        shouldShowEX = true;
    } else {
      displayCategory = `${displayCategory} ${i18next.t(`moveUpgradeAttrs:path`)}`;
      const hasNonCategoryUpgrade = activeUpgrades.some(upgrade => !upgrade.upgradeCategory);
      if (hasNonCategoryUpgrade) {
        shouldShowEX = true;
      }
    }

    const tierDisplay = displayTier ? ` ${Utils.intToRoman(displayTier)}` : "";
    const exDisplay = shouldShowEX ? ` ${i18next.t("moveUpgradeAttrs:EX")}` : "";
    const moveName = getBBCodeFrag(`${currentMove.name}${tierDisplay}${exDisplay}`, TextStyle.SUMMARY_GOLD, uiTheme);
    comparisonLines.push(moveName);

    if (displayCategory) {
      const categoryInfo = getBBCodeFrag(displayCategory, TextStyle.PERFECT_IV, uiTheme);
      comparisonLines.push(categoryInfo);
    }

    this.multiHitWarning = false;
    const isMultiHit = currentMove.attrs.some(attr => attr instanceof MultiHitAttr || attr.constructor.name.includes('MultiHit'));
    if (isMultiHit) {
      const warningText = i18next.t("moveUpgradeAttrs:multiHitWarning");
      this.multiHitWarning = true;
      comparisonLines.push(getBBCodeFrag(warningText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    this.flinchWarning = false;
    const isFlinch = currentMove.attrs.some(attr => attr instanceof FlinchAttr);
    if (isFlinch) {
      const warningText = i18next.t("moveUpgradeAttrs:flinchWarning");
      this.flinchWarning = true;
      comparisonLines.push(getBBCodeFrag(warningText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    comparisonLines.push('');

    comparisonLines.push(...this.compareBasicStats(currentMove, upgradedMove));

    this.secondaryEffectNote = false;
    if (currentMove.chance > 0 || upgradedMove.chance > 0) {
      comparisonLines.push('');
      this.secondaryEffectNote = true;
      const chanceNoteText = i18next.t("moveUpgradeAttrs:secondaryEffectNote");
      comparisonLines.push(getBBCodeFrag(chanceNoteText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    this.lineCount = comparisonLines.length;
    const result = comparisonLines.join('\n');

    return result;
  }

  private compareBasicStats(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    if (currentMove.power !== upgradedMove.power && upgradedMove.power > 0) {
      const powerLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:power"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentPower = getBBCodeFrag(currentMove.power.toString(), upgradedMove.power > currentMove.power ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newPower = getBBCodeFrag(upgradedMove.power.toString(), upgradedMove.power > currentMove.power ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${powerLabel}: ${currentPower}${arrow}${newPower}`);
    } else if (currentMove.power > 0) {
      const powerLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:power"), TextStyle.SUMMARY_GOLD, uiTheme);
      const power = getBBCodeFrag(currentMove.power.toString(), TextStyle.WINDOW, uiTheme);
      lines.push(`${powerLabel}: ${power}`);
    }

    if (currentMove.accuracy !== upgradedMove.accuracy && upgradedMove.accuracy > 0) {
      const accuracyLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:accuracy"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentAcc = getBBCodeFrag(`${currentMove.accuracy}%`, upgradedMove.accuracy > currentMove.accuracy ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newAcc = getBBCodeFrag(`${upgradedMove.accuracy}%`, upgradedMove.accuracy > currentMove.accuracy ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${accuracyLabel}: ${currentAcc}${arrow}${newAcc}`);
    } else if (currentMove.accuracy > 0) {
      const accuracyLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:accuracy"), TextStyle.SUMMARY_GOLD, uiTheme);
      const accuracy = getBBCodeFrag(`${currentMove.accuracy}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${accuracyLabel}: ${accuracy}`);
    }

    if (currentMove.chance !== upgradedMove.chance && upgradedMove.chance > 0) {
      const chanceLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chance"), TextStyle.SUMMARY_GOLD, uiTheme);
      const displayCurrentChance = currentMove.chance === -1 ? 0 : currentMove.chance;
      let displayUpgradedChance = upgradedMove.chance === -1 ? 0 : upgradedMove.chance;

      if (this.flinchWarning && displayUpgradedChance > 30) {
        displayUpgradedChance = 30;
      }

      const currentChance = getBBCodeFrag(`${displayCurrentChance}%`, upgradedMove.chance > currentMove.chance ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newChance = getBBCodeFrag(`${displayUpgradedChance}%`, upgradedMove.chance > currentMove.chance ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${chanceLabel}: ${currentChance}${arrow}${newChance}`);
    } else if (currentMove.chance > 0) {
      const chanceLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chance"), TextStyle.SUMMARY_GOLD, uiTheme);
      const chance = getBBCodeFrag(`${currentMove.chance}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${chanceLabel}: ${chance}`);
    }

    const currentEffectivePriority = this.calculateEffectivePriority(currentMove);
    const upgradedEffectivePriority = this.calculateEffectivePriority(upgradedMove);

    if (currentEffectivePriority !== upgradedEffectivePriority && upgradedEffectivePriority !== 0) {
      const priorityLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:priority"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentPriority = getBBCodeFrag(currentEffectivePriority.toString(), upgradedEffectivePriority > currentEffectivePriority ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newPriority = getBBCodeFrag(upgradedEffectivePriority.toString(), upgradedEffectivePriority > currentEffectivePriority ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${priorityLabel}: ${currentPriority}${arrow}${newPriority}`);
    } else if (currentEffectivePriority !== 0) {
      const priorityLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:priority"), TextStyle.SUMMARY_GOLD, uiTheme);
      const priority = getBBCodeFrag(currentEffectivePriority.toString(), TextStyle.WINDOW, uiTheme);
      lines.push(`${priorityLabel}: ${priority}`);
    }

    if (currentMove.category !== upgradedMove.category) {
      const categoryLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:category"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentCat = getBBCodeFrag(MoveCategory[currentMove.category], TextStyle.WINDOW, uiTheme);
      const newCat = getBBCodeFrag(MoveCategory[upgradedMove.category], TextStyle.SUMMARY_BLUE, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${categoryLabel}: ${currentCat}${arrow}${newCat}`);
    } else {
      const categoryLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:category"), TextStyle.SUMMARY_GOLD, uiTheme);
      const category = getBBCodeFrag(MoveCategory[currentMove.category], TextStyle.WINDOW, uiTheme);
      lines.push(`${categoryLabel}: ${category}`);
    }

    if (currentMove.type !== upgradedMove.type) {
      const typeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:type"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentType = getBBCodeFrag(Type[currentMove.type], TextStyle.WINDOW, uiTheme);
      const newType = getBBCodeFrag(Type[upgradedMove.type], TextStyle.SUMMARY_BLUE, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${typeLabel}: ${currentType}${arrow}${newType}`);
    } else {
      const typeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:type"), TextStyle.SUMMARY_GOLD, uiTheme);
      const type = getBBCodeFrag(Type[currentMove.type], TextStyle.WINDOW, uiTheme);
      lines.push(`${typeLabel}: ${type}`);
    }

    lines.push(...this.compareRecoilDamage(currentMove, upgradedMove));
    lines.push(...this.compareHealAmount(currentMove, upgradedMove));
    lines.push(...this.compareHPSacrifice(currentMove, upgradedMove));
    lines.push(...this.compareMultiHit(currentMove, upgradedMove));
    lines.push(...this.compareCritRate(currentMove, upgradedMove));
    lines.push(...this.compareChargeTurn(currentMove, upgradedMove));
    lines.push(...this.compareStatusEffect(currentMove, upgradedMove));
    lines.push(...this.compareSelfBoost(currentMove, upgradedMove));
    lines.push(...this.compareFoeDebuff(currentMove, upgradedMove));

    lines.push(...this.compareItemInteraction(currentMove, upgradedMove));
    lines.push(...this.compareEffectChanceExtensions(currentMove, upgradedMove));
    lines.push(...this.compareGroundingEffects(currentMove, upgradedMove));
    lines.push(...this.compareWeatherEffects(currentMove, upgradedMove));
    lines.push(...this.compareTerrainEffects(currentMove, upgradedMove));
    lines.push(...this.compareArenaTrapSetup(currentMove, upgradedMove));
    lines.push(...this.compareTypeModifications(currentMove, upgradedMove));
    lines.push(...this.compareHealingOverTime(currentMove, upgradedMove));
    lines.push(...this.compareVariablePowerEffects(currentMove, upgradedMove));
    lines.push(...this.comparePriorityModifications(currentMove, upgradedMove));
    lines.push(...this.compareUtilityEffects(currentMove, upgradedMove));
    lines.push(...this.compareFixedDamageEffects(currentMove, upgradedMove));
    lines.push(...this.compareMoveFlags(currentMove, upgradedMove));
    lines.push(...this.compareBattleMechanicsEffects(currentMove, upgradedMove));

    return lines;
  }

  private calculateEffectivePriority(move: Move): number {
    const priority = new Utils.IntegerHolder(move.priority);
    const priorityAttrs = move.getAttrs(IncrementMovePriorityAttr);
    for (const attr of priorityAttrs) {
      if (attr instanceof ConditionalPriorityAttr) {
        priority.value += attr.increaseAmount;
      }
    }

    return priority.value;
  }

  private compareRecoilDamage(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentRecoilAttr = currentMove.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;
    const upgradedRecoilAttr = upgradedMove.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;

    const currentRecoil = currentRecoilAttr ? Math.round(currentRecoilAttr.damageRatio * 100) : 0;
    const upgradedRecoil = upgradedRecoilAttr ? Math.round(upgradedRecoilAttr.damageRatio * 100) : 0;

    if (currentRecoil !== upgradedRecoil && upgradedRecoil > 0) {
      const recoilLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:recoilDamage"), TextStyle.SUMMARY_GOLD, uiTheme);

      if (currentRecoil === 0 && upgradedRecoil > 0) {
        const currentRecoilText = getBBCodeFrag(`${currentRecoil}%`, TextStyle.WINDOW, uiTheme);
        const newRecoilText = getBBCodeFrag(`${upgradedRecoil}%`, TextStyle.SUMMARY_RED, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${recoilLabel}: ${currentRecoilText}${arrow}${newRecoilText}`);
      } else {
        const currentRecoilText = getBBCodeFrag(`${currentRecoil}%`, upgradedRecoil > currentRecoil ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
        const newRecoilText = getBBCodeFrag(`${upgradedRecoil}%`, upgradedRecoil > currentRecoil ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${recoilLabel}: ${currentRecoilText}${arrow}${newRecoilText}`);
      }
    } else if (currentRecoil > 0) {
      const recoilLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:recoilDamage"), TextStyle.SUMMARY_GOLD, uiTheme);
      const recoilText = getBBCodeFrag(`${currentRecoil}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${recoilLabel}: ${recoilText}`);
    }

    return lines;
  }

  private compareHealAmount(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentHealAttr = currentMove.getAttrs(HealAttr)[0] as HealAttr | undefined;
    const upgradedHealAttr = upgradedMove.getAttrs(HealAttr)[0] as HealAttr | undefined;
    const currentHitHealAttr = currentMove.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;
    const upgradedHitHealAttr = upgradedMove.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;

    const currentHeal = currentHealAttr ? Math.round(currentHealAttr.healRatio * 100) :
                       currentHitHealAttr ? Math.round(currentHitHealAttr.healRatio * 100) : 0;
    const upgradedHeal = upgradedHealAttr ? Math.round(upgradedHealAttr.healRatio * 100) :
                        upgradedHitHealAttr ? Math.round(upgradedHitHealAttr.healRatio * 100) : 0;

    if (currentHeal !== upgradedHeal && upgradedHeal > 0) {
      const healLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healAmount"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentHealText = getBBCodeFrag(`${currentHeal}%`, upgradedHeal > currentHeal ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newHealText = getBBCodeFrag(`${upgradedHeal}%`, upgradedHeal > currentHeal ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${healLabel}: ${currentHealText}${arrow}${newHealText}`);
    } else if (currentHeal > 0) {
      const healLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healAmount"), TextStyle.SUMMARY_GOLD, uiTheme);
      const healText = getBBCodeFrag(`${currentHeal}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${healLabel}: ${healText}`);
    }

    return lines;
  }

  private compareHPSacrifice(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const getSacrificeType = (move: Move): string => {
      if (move.hasAttr(SacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialFull");
      if (move.hasAttr(HalfSacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialHalf");
      if (move.hasAttr(SacrificialAttrOnHit)) return i18next.t("moveUpgradeAttrs:sacrificialOnHit");
      return "";
    };

    const currentSacrifice = getSacrificeType(currentMove);
    const upgradedSacrifice = getSacrificeType(upgradedMove);

    if (currentSacrifice !== upgradedSacrifice && upgradedSacrifice) {
      const sacrificeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:sacrificial"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentSacrifice) {
        const currentSacrificeText = getBBCodeFrag(currentSacrifice, TextStyle.SUMMARY_RED, uiTheme);
        const newSacrificeText = getBBCodeFrag(upgradedSacrifice, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${sacrificeLabel}: ${currentSacrificeText}${arrow}${newSacrificeText}`);
      } else {
        const sacrificeText = getBBCodeFrag(upgradedSacrifice, TextStyle.SUMMARY_RED, uiTheme);
        lines.push(`${sacrificeLabel}: ${sacrificeText}`);
      }
    } else if (currentSacrifice) {
      const sacrificeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:sacrificial"), TextStyle.SUMMARY_GOLD, uiTheme);
      const sacrificeText = getBBCodeFrag(currentSacrifice, TextStyle.WINDOW, uiTheme);
      lines.push(`${sacrificeLabel}: ${sacrificeText}`);
    }

    return lines;
  }

  private compareMultiHit(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentMultiHitAttr = currentMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;
    const upgradedMultiHitAttr = upgradedMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;

    const getMultiHitDescription = (multiHitType: MultiHitType): string => {
      switch (multiHitType) {
        case MultiHitType._2: return "2";
        case MultiHitType._3: return "3";
        case MultiHitType._2_TO_5: return "2-5";
        case MultiHitType._4_TO_8: return "4-8";
        default: return "1";
      }
    };

    const currentMultiHit = currentMultiHitAttr ? getMultiHitDescription(currentMultiHitAttr.getMultiHitType) : "";
    const upgradedMultiHit = upgradedMultiHitAttr ? getMultiHitDescription(upgradedMultiHitAttr.getMultiHitType) : "";

    if (currentMultiHit !== upgradedMultiHit && upgradedMultiHit) {
      const multiHitLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:multiHitType"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentMultiHit) {
        const currentMultiHitText = getBBCodeFrag(currentMultiHit, TextStyle.SUMMARY_RED, uiTheme);
        const newMultiHitText = getBBCodeFrag(upgradedMultiHit, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${multiHitLabel}: ${currentMultiHitText}${arrow}${newMultiHitText}`);
      } else {
        const multiHitText = getBBCodeFrag(upgradedMultiHit, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${multiHitLabel}: ${multiHitText}`);
      }
    } else if (currentMultiHit) {
      const multiHitLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:multiHitType"), TextStyle.SUMMARY_GOLD, uiTheme);
      const multiHitText = getBBCodeFrag(currentMultiHit, TextStyle.WINDOW, uiTheme);
      lines.push(`${multiHitLabel}: ${multiHitText}`);
    }

    return lines;
  }

  private compareCritRate(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentHighCritAttr = currentMove.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined;
    const upgradedHighCritAttr = upgradedMove.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined;
    const currentCritOnly = currentMove.hasAttr(CritOnlyAttr);
    const upgradedCritOnly = upgradedMove.hasAttr(CritOnlyAttr);

    const getCurrentCritRate = (): string => {
      if (currentCritOnly) return "100%";
      if (currentHighCritAttr) return "10%";
      return "";
    };

    const getUpgradedCritRate = (): string => {
      if (upgradedCritOnly) return "100%";
      if (upgradedHighCritAttr) return "10%";
      return "";
    };

    const currentCritRate = getCurrentCritRate();
    const upgradedCritRate = getUpgradedCritRate();

    if (currentCritRate !== upgradedCritRate && upgradedCritRate) {
      const critLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:highCritRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentCritRate) {
        const currentCritText = getBBCodeFrag(currentCritRate, TextStyle.SUMMARY_RED, uiTheme);
        const newCritText = getBBCodeFrag(upgradedCritRate, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${critLabel}: ${currentCritText}${arrow}${newCritText}`);
      } else {
        const critText = getBBCodeFrag(upgradedCritRate, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${critLabel}: ${critText}`);
      }
    } else if (currentCritRate) {
      const critLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:highCritRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      const critText = getBBCodeFrag(currentCritRate, TextStyle.WINDOW, uiTheme);
      lines.push(`${critLabel}: ${critText}`);
    }

    return lines;
  }

  private compareChargeTurn(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentChargeAttr = currentMove.getAttrs(ChargeAttr)[0] as ChargeAttr | undefined;
    const upgradedChargeAttr = upgradedMove.getAttrs(ChargeAttr)[0] as ChargeAttr | undefined;

    const hasCurrentCharge = !!currentChargeAttr;
    const hasUpgradedCharge = !!upgradedChargeAttr;

    const currentHasStatBoost = currentChargeAttr && currentMove.getAttrs(StatChangeAttr).some((attr: StatChangeAttr) => attr.selfTarget);
    const upgradedHasStatBoost = upgradedChargeAttr && upgradedMove.getAttrs(StatChangeAttr).some((attr: StatChangeAttr) => attr.selfTarget);

    const getCurrentChargeText = (): string => {
      if (!hasCurrentCharge) return "";
      return i18next.t("moveUpgradeAttrs:chargeTurn");
    };

    const getUpgradedChargeText = (): string => {
      if (!hasUpgradedCharge) return "";
      return i18next.t("moveUpgradeAttrs:chargeTurn");
    };

    const currentChargeText = getCurrentChargeText();
    const upgradedChargeText = getUpgradedChargeText();

    if (currentChargeText !== upgradedChargeText && upgradedChargeText) {
      const chargeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:charge"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentChargeText) {
        const currentChargeDisplayText = getBBCodeFrag(currentChargeText, TextStyle.SUMMARY_RED, uiTheme);
        const newChargeDisplayText = getBBCodeFrag(upgradedChargeText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${chargeLabel}: ${currentChargeDisplayText}${arrow}${newChargeDisplayText}`);
      } else {
        const chargeDisplayText = getBBCodeFrag(upgradedChargeText, TextStyle.SUMMARY_RED, uiTheme);
        lines.push(`${chargeLabel}: ${chargeDisplayText}`);
      }
    } else if (currentChargeText) {
      const chargeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:charge"), TextStyle.SUMMARY_GOLD, uiTheme);
      const chargeDisplayText = getBBCodeFrag(currentChargeText, TextStyle.WINDOW, uiTheme);
      lines.push(`${chargeLabel}: ${chargeDisplayText}`);
    }

    return lines;
  }

  private compareStatusEffect(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const getStatusEffectDescription = (move: Move): string => {
      const statusAttrs = move.getAttrs(StatusEffectAttr);
      if (statusAttrs.length === 0) return "";

      const statusNames: string[] = [];

      for (const attr of statusAttrs) {
        if (attr instanceof MultiStatusEffectAttr) {
          const multiStatusNames = attr.effects.map(effect => {
            const i18nKey = `${getStatusEffectMessageKey(effect)}.name`;
            return i18next.t(i18nKey);
          });
          statusNames.push(...multiStatusNames);
        } else {
          const i18nKey = `${getStatusEffectMessageKey((attr as StatusEffectAttr).effect)}.name`;
          statusNames.push(i18next.t(i18nKey));
        }
      }

      return statusNames.join(" / ");
    };

    const currentStatusText = getStatusEffectDescription(currentMove);
    const upgradedStatusText = getStatusEffectDescription(upgradedMove);

    if (currentStatusText !== upgradedStatusText && upgradedStatusText) {
      const statusLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statusEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentStatusText) {
        const currentStatusDisplayText = getBBCodeFrag(currentStatusText, TextStyle.SUMMARY_RED, uiTheme);
        const newStatusDisplayText = getBBCodeFrag(upgradedStatusText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${statusLabel}: ${currentStatusDisplayText}${arrow}${newStatusDisplayText}`);
      } else {
        const statusDisplayText = getBBCodeFrag(upgradedStatusText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${statusLabel}: ${statusDisplayText}`);
      }
    } else if (currentStatusText) {
      const statusLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statusEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const statusDisplayText = getBBCodeFrag(currentStatusText, TextStyle.WINDOW, uiTheme);
      lines.push(`${statusLabel}: ${statusDisplayText}`);
    }

    return lines;
  }

  private compareSelfBoost(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentSelfBoostAttrs = currentMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => attr.selfTarget && attr.levels > 0);
    const upgradedSelfBoostAttrs = upgradedMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => attr.selfTarget && attr.levels > 0);

    const getSelfBoostText = (attrs: StatChangeAttr[]): string => {
      if (attrs.length === 0) return "";
      const boostTexts = attrs.map(attr => {
        const statNames = attr.stats.map(stat => getBattleStatName(stat)).join("/");
        return `${statNames} ${attr.levels > 0 ? '+' : ''}${attr.levels}`;
      });
      return boostTexts.join(", ");
    };

    const currentSelfBoostText = getSelfBoostText(currentSelfBoostAttrs as StatChangeAttr[]);
    const upgradedSelfBoostText = getSelfBoostText(upgradedSelfBoostAttrs as StatChangeAttr[]);

    if (currentSelfBoostText !== upgradedSelfBoostText && upgradedSelfBoostText) {
      const boostLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeSelf"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentSelfBoostText) {
        const currentBoostDisplayText = getBBCodeFrag(currentSelfBoostText, TextStyle.SUMMARY_RED, uiTheme);
        const newBoostDisplayText = getBBCodeFrag(upgradedSelfBoostText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${boostLabel}: ${currentBoostDisplayText}${arrow}${newBoostDisplayText}`);
      } else {
        const boostDisplayText = getBBCodeFrag(upgradedSelfBoostText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${boostLabel}: ${boostDisplayText}`);
      }
    } else if (currentSelfBoostText) {
      const boostLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeSelf"), TextStyle.SUMMARY_GOLD, uiTheme);
      const boostDisplayText = getBBCodeFrag(currentSelfBoostText, TextStyle.WINDOW, uiTheme);
      lines.push(`${boostLabel}: ${boostDisplayText}`);
    }

    return lines;
  }

  private compareFoeDebuff(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentFoeDebuffAttrs = currentMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => !attr.selfTarget && attr.levels < 0);
    const upgradedFoeDebuffAttrs = upgradedMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => !attr.selfTarget && attr.levels < 0);

    const getFoeDebuffText = (attrs: StatChangeAttr[]): string => {
      if (attrs.length === 0) return "";
      const debuffTexts = attrs.map(attr => {
        const statNames = attr.stats.map(stat => getBattleStatName(stat)).join("/");
        return `${statNames} ${attr.levels}`;
      });
      return debuffTexts.join(", ");
    };

    const currentFoeDebuffText = getFoeDebuffText(currentFoeDebuffAttrs as StatChangeAttr[]);
    const upgradedFoeDebuffText = getFoeDebuffText(upgradedFoeDebuffAttrs as StatChangeAttr[]);

    if (currentFoeDebuffText !== upgradedFoeDebuffText && upgradedFoeDebuffText) {
      const debuffLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeTarget"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentFoeDebuffText) {
        const currentDebuffDisplayText = getBBCodeFrag(currentFoeDebuffText, TextStyle.SUMMARY_RED, uiTheme);
        const newDebuffDisplayText = getBBCodeFrag(upgradedFoeDebuffText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${debuffLabel}: ${currentDebuffDisplayText}${arrow}${newDebuffDisplayText}`);
      } else {
        const debuffDisplayText = getBBCodeFrag(upgradedFoeDebuffText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${debuffLabel}: ${debuffDisplayText}`);
      }
    } else if (currentFoeDebuffText) {
      const debuffLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeTarget"), TextStyle.SUMMARY_GOLD, uiTheme);
      const debuffDisplayText = getBBCodeFrag(currentFoeDebuffText, TextStyle.WINDOW, uiTheme);
      lines.push(`${debuffLabel}: ${debuffDisplayText}`);
    }

    return lines;
  }

  private compareItemInteraction(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentRemove = currentMove.hasAttr(RemoveHeldItemAttr);
    const upgradedRemove = upgradedMove.hasAttr(RemoveHeldItemAttr);
    const currentSteal = currentMove.getAttrs(StealHeldItemChanceAttr)[0] as StealHeldItemChanceAttr | undefined;
    const upgradedSteal = upgradedMove.getAttrs(StealHeldItemChanceAttr)[0] as StealHeldItemChanceAttr | undefined;

    const getCurrentDesc = (): string => {
      if (currentSteal) return `${Math.round(currentSteal.chance * 100)}%`;
      if (currentRemove) return i18next.t("moveUpgradeAttrs:removeFoeItem");
      return "";
    };

    const getUpgradedDesc = (): string => {
      if (upgradedSteal) return `${Math.round(upgradedSteal.chance * 100)}%`;
      if (upgradedRemove) return i18next.t("moveUpgradeAttrs:removeFoeItem");
      return "";
    };

    const currentDesc = getCurrentDesc();
    const upgradedDesc = getUpgradedDesc();

    if (currentDesc !== upgradedDesc && upgradedDesc) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedDesc.includes('%') ? `${i18next.t("moveUpgradeAttrs:stealFoeItem")} (${upgradedDesc})` : upgradedDesc, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareEffectChanceExtensions(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const effects = [
      { attr: FlinchAttr, key: "moveUpgradeAttrs:flinchStatus" },
      { attr: ConfuseAttr, key: "moveUpgradeAttrs:confuseStatus" },
      {
        check: (move: Move) => move.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.SEEDED),
        key: "moveUpgradeAttrs:leechSeedStatus"
      },
      {
        check: (move: Move) => move.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.CURSED),
        key: "moveUpgradeAttrs:curseStatus"
      }
    ];

    for (const effect of effects) {
      let currentHas: boolean, upgradedHas: boolean;

      if (effect.attr) {
        currentHas = currentMove.hasAttr(effect.attr);
        upgradedHas = upgradedMove.hasAttr(effect.attr);
      } else {
        currentHas = effect.check!(currentMove);
        upgradedHas = effect.check!(upgradedMove);
      }

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelStatus"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private compareGroundingEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentGround = currentMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING);
    const upgradedGround = upgradedMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING);

    if (!currentGround && upgradedGround) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:groundFlyingTypes"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareWeatherEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentWeatherAttr = currentMove.getAttrs(WeatherChangeAttr)[0] as WeatherChangeAttr | undefined;
    const upgradedWeatherAttr = upgradedMove.getAttrs(WeatherChangeAttr)[0] as WeatherChangeAttr | undefined;
    const currentClear = currentMove.hasAttr(ClearWeatherAttr);
    const upgradedClear = upgradedMove.hasAttr(ClearWeatherAttr);

    const getCurrentWeather = (): string => {
      if (currentClear) return i18next.t("moveUpgradeAttrs:clearWeather");
      if (currentWeatherAttr) return this.getWeatherName(currentWeatherAttr.weatherType);
      return "";
    };

    const getUpgradedWeather = (): string => {
      if (upgradedClear) return i18next.t("moveUpgradeAttrs:clearWeather");
      if (upgradedWeatherAttr) return this.getWeatherName(upgradedWeatherAttr.weatherType);
      return "";
    };

    const currentWeather = getCurrentWeather();
    const upgradedWeather = getUpgradedWeather();

    if (currentWeather !== upgradedWeather && upgradedWeather) {
      const labelKey = upgradedClear ? "moveUpgradeAttrs:labelEffect" : "moveUpgradeAttrs:labelWeatherChange";
      const label = getBBCodeFrag(i18next.t(labelKey), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedWeather, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareTerrainEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentTerrainAttr = currentMove.getAttrs(TerrainChangeAttr)[0] as TerrainChangeAttr | undefined;
    const upgradedTerrainAttr = upgradedMove.getAttrs(TerrainChangeAttr)[0] as TerrainChangeAttr | undefined;
    const currentClear = currentMove.hasAttr(ClearTerrainAttr);
    const upgradedClear = upgradedMove.hasAttr(ClearTerrainAttr);

    const getCurrentTerrain = (): string => {
      if (currentClear) return i18next.t("moveUpgradeAttrs:clearTerrain");
      if (currentTerrainAttr) return this.getTerrainName(currentTerrainAttr.terrainType);
      return "";
    };

    const getUpgradedTerrain = (): string => {
      if (upgradedClear) return i18next.t("moveUpgradeAttrs:clearTerrain");
      if (upgradedTerrainAttr) return this.getTerrainName(upgradedTerrainAttr.terrainType);
      return "";
    };

    const currentTerrain = getCurrentTerrain();
    const upgradedTerrain = getUpgradedTerrain();

    if (currentTerrain !== upgradedTerrain && upgradedTerrain) {
      const labelKey = upgradedClear ? "moveUpgradeAttrs:labelEffect" : "moveUpgradeAttrs:labelTerrainChange";
      const label = getBBCodeFrag(i18next.t(labelKey), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTerrain, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareArenaTrapSetup(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    let currentTrapAttr = currentMove.getAttrs(AddArenaTrapTagAttr)[0] as AddArenaTrapTagAttr | undefined;
    let upgradedTrapAttr = upgradedMove.getAttrs(AddArenaTrapTagAttr)[0] as AddArenaTrapTagAttr | undefined;

    if (!currentTrapAttr && currentMove.hasAttr(AddArenaTrapTagUpgradeAttr)) {
      currentTrapAttr = currentMove.getAttrs(AddArenaTrapTagUpgradeAttr)[0] as AddArenaTrapTagUpgradeAttr | undefined;
    }

    if (!upgradedTrapAttr && upgradedMove.hasAttr(AddArenaTrapTagUpgradeAttr)) {
      upgradedTrapAttr = upgradedMove.getAttrs(AddArenaTrapTagUpgradeAttr)[0] as AddArenaTrapTagUpgradeAttr | undefined;
    }

    const currentTrap = currentTrapAttr ? this.getHazardName(currentTrapAttr.tagType) : "";
    const upgradedTrap = upgradedTrapAttr ? this.getHazardName(upgradedTrapAttr.tagType) : "";

    if (currentTrap !== upgradedTrap && upgradedTrap) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSetup"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTrap, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareTypeModifications(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const typeEffects = [
      { attr: MatchUserTypeAttr, key: "moveUpgradeAttrs:matchPrimaryType" },
      { attr: WeatherBallTypeAttr, key: "moveUpgradeAttrs:weatherBoost" },
      { attr: TerrainPulseTypeAttr, key: "moveUpgradeAttrs:terrainBoost" },
      { attr: HiddenPowerTypeAttr, key: "moveUpgradeAttrs:ivType" },
      { attr: TypelessAttr, key: "moveUpgradeAttrs:typelessType" }
    ];

    for (const effect of typeEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    const currentSuperAttr = currentMove.getAttrs(AnyTypeSuperEffectTypeMultiplierAttr)[0] as AnyTypeSuperEffectTypeMultiplierAttr | undefined;
    const upgradedSuperAttr = upgradedMove.getAttrs(AnyTypeSuperEffectTypeMultiplierAttr)[0] as AnyTypeSuperEffectTypeMultiplierAttr | undefined;

    if (!currentSuperAttr && upgradedSuperAttr) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSuperEffectiveVs"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(this.getTypeName(upgradedSuperAttr.superEffectiveAgainstType), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentSuperAttr?.superEffectiveAgainstType !== upgradedSuperAttr?.superEffectiveAgainstType && upgradedSuperAttr) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSuperEffectiveVs"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(this.getTypeName(upgradedSuperAttr.superEffectiveAgainstType), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareHealingOverTime(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const getCurrentHeal = (): string => {
      const attrs = currentMove.getAttrs(AddBattlerTagAttr);
      if (attrs.some((a: any) => a.tagType === BattlerTagType.AQUA_RING)) return i18next.t("moveUpgradeAttrs:aquaRing");
      if (attrs.some((a: any) => a.tagType === BattlerTagType.INGRAIN)) return i18next.t("moveUpgradeAttrs:ingrain");
      return "";
    };

    const getUpgradedHeal = (): string => {
      const attrs = upgradedMove.getAttrs(AddBattlerTagAttr);
      if (attrs.some((a: any) => a.tagType === BattlerTagType.AQUA_RING)) return i18next.t("moveUpgradeAttrs:aquaRing");
      if (attrs.some((a: any) => a.tagType === BattlerTagType.INGRAIN)) return i18next.t("moveUpgradeAttrs:ingrain");
      return "";
    };

    const currentHeal = getCurrentHeal();
    const upgradedHeal = getUpgradedHeal();

    if (currentHeal !== upgradedHeal && upgradedHeal) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelHeal"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healEndOfTurn"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareVariablePowerEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const powerEffects = [
      { attr: GyroBallPowerAttr, key: "moveUpgradeAttrs:slowerStrongerBoost" },
      { attr: ElectroBallPowerAttr, key: "moveUpgradeAttrs:fasterStrongerBoost" },
      { attr: WeightPowerAttr, key: "moveUpgradeAttrs:weightBoost" },
      { attr: CompareWeightPowerAttr, key: "moveUpgradeAttrs:weightDiffBoost" },
      { attr: HpPowerAttr, key: "moveUpgradeAttrs:higherHpPowerBoost" },
      { attr: LowHpPowerAttr, key: "moveUpgradeAttrs:lowerHpPowerBoost" },
      { attr: ConsecutiveUseDoublePowerAttr, key: "moveUpgradeAttrs:repeatedUseBoost" },
      { attr: TurnDamagedDoublePowerAttr, key: "moveUpgradeAttrs:revengeBoost" }
    ];

    for (const effect of powerEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private comparePriorityModifications(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const currentTerrainPrio = currentMove.getAttrs(TerrainMovePriorityAttr)[0] as TerrainMovePriorityAttr | undefined;
    const upgradedTerrainPrio = upgradedMove.getAttrs(TerrainMovePriorityAttr)[0] as TerrainMovePriorityAttr | undefined;
    const currentFirstTurnPrio = currentMove.getAttrs(FirstTurnPriorityAttr)[0] as FirstTurnPriorityAttr | undefined;
    const upgradedFirstTurnPrio = upgradedMove.getAttrs(FirstTurnPriorityAttr)[0] as FirstTurnPriorityAttr | undefined;

    if (!currentTerrainPrio && upgradedTerrainPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:terrainPriorityBoost"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentTerrainPrio?.increaseAmount !== upgradedTerrainPrio?.increaseAmount && upgradedTerrainPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:terrainPriorityBoost"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    if (!currentFirstTurnPrio && upgradedFirstTurnPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:firstTurnOnlyPriority"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentFirstTurnPrio?.increaseAmount !== upgradedFirstTurnPrio?.increaseAmount && upgradedFirstTurnPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:firstTurnOnlyPriority"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareUtilityEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const utilityEffects = [
      { attr: ForceSwitchOutAttr, key: "moveUpgradeAttrs:switchAfterAtk" },
      { attr: SurviveDamageAttr, key: "moveUpgradeAttrs:endure" }
    ];

    for (const effect of utilityEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    const currentTrapAttr = currentMove.getAttrs(TrapAttr)[0] as TrapAttr | undefined;
    const upgradedTrapAttr = upgradedMove.getAttrs(TrapAttr)[0] as TrapAttr | undefined;

    const currentTrap = currentTrapAttr ? this.getTrapName(currentTrapAttr.tagType) : "";
    const upgradedTrap = upgradedTrapAttr ? this.getTrapName(upgradedTrapAttr.tagType) : "";

    if (currentTrap !== upgradedTrap && upgradedTrap) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelTrap"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTrap, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareFixedDamageEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const getCurrentFixedDamage = (): string => {
      if (currentMove.hasAttr(LevelDamageAttr)) return i18next.t("moveUpgradeAttrs:levelDamage");
      if (currentMove.hasAttr(TargetHalfHpDamageAttr)) return i18next.t("moveUpgradeAttrs:halfTargetHp");
      const fixedAttr = currentMove.getAttrs(FixedDamageAttr)[0] as FixedDamageAttr | undefined;
      if (fixedAttr) return `${fixedAttr.damage}`;
      return "";
    };

    const getUpgradedFixedDamage = (): string => {
      if (upgradedMove.hasAttr(LevelDamageAttr)) return i18next.t("moveUpgradeAttrs:levelDamage");
      if (upgradedMove.hasAttr(TargetHalfHpDamageAttr)) return i18next.t("moveUpgradeAttrs:halfTargetHp");
      const fixedAttr = upgradedMove.getAttrs(FixedDamageAttr)[0] as FixedDamageAttr | undefined;
      if (fixedAttr) return `${fixedAttr.damage}`;
      return "";
    };

    const currentFixed = getCurrentFixedDamage();
    const upgradedFixed = getUpgradedFixedDamage();

    if (currentFixed !== upgradedFixed && upgradedFixed) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelFixedDmg"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedFixed, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private compareMoveFlags(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const flagEffects = [
      { flag: MoveFlags.IGNORE_ABILITIES, key: "moveUpgradeAttrs:uniqueCategoryIgnoreAbilities" },
      { flag: MoveFlags.SOUND_BASED, key: "moveUpgradeAttrs:uniqueCategorySoundMove" },
      { flag: MoveFlags.PUNCHING_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPunchingMove" },
      { flag: MoveFlags.SLICING_MOVE, key: "moveUpgradeAttrs:uniqueCategorySlicingMove" },
      { flag: MoveFlags.BITING_MOVE, key: "moveUpgradeAttrs:uniqueCategoryBitingMove" },
      { flag: MoveFlags.PULSE_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPulseMove" },
      { flag: MoveFlags.WIND_MOVE, key: "moveUpgradeAttrs:uniqueCategoryWindMove" },
      { flag: MoveFlags.BALLBOMB_MOVE, key: "moveUpgradeAttrs:uniqueCategoryBallbombMove" },
      { flag: MoveFlags.POWDER_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPowderMove" },
      { flag: MoveFlags.DANCE_MOVE, key: "moveUpgradeAttrs:uniqueCategoryDanceMove" }
    ];

    for (const effect of flagEffects) {
      const currentHas = currentMove.hasFlag(effect.flag);
      const upgradedHas = upgradedMove.hasFlag(effect.flag);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelUniqueCategory"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private compareBattleMechanicsEffects(currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = this.scene.uiTheme;

    const mechanicsEffects = [
      { attr: IgnoreOpponentStatChangesAttr, key: "moveUpgradeAttrs:ignoreStatChanges" },
      { attr: RemoveScreensAttr, key: "moveUpgradeAttrs:removeScreens" }
    ];

    for (const effect of mechanicsEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (!currentHas && upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), TextStyle.SUMMARY_GREEN, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private createColoredComparisonText(x: number, y: number, comparisonText: string): BBCodeText {
    const textObj = addBBCodeTextObject(this.scene, x, y, comparisonText, TextStyle.WINDOW, { fontSize: "41px" });
    return textObj;
  }

  private wrapTextToWidth(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    const avgCharWidth = 6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  protected hideUpgradeTooltip(): void {
    PokemonBattleTooltipUtils.hide();
    if (this.shinyPowerStatsContainer) {
      this.shinyPowerStatsContainer.destroy();
      this.shinyPowerStatsContainer = null;
    }
    this.destroyUpgradeTooltipContainerOnly();
    this.lineCount = 0;
    this.partyDetailsActive = false;
    this.partyDetailsIndex = 0;
    this.partyDetailsPartnerIndex = 0;
    this.partyDetailsHeaderLines = [];
    this.partyDetailsPartyLines = [];
    this.partyDetailsParty = [];
    this.partyDetailsRarity = null;
    this.partyDetailsContext = null;
    this.currentModifierContext = null;
    if (this.currentModifierSections) {
      for (const sec of this.currentModifierSections) {
        if (sec && (sec as any).embeddedContainer) (sec as any).embeddedContainer.destroy();
      }
    }
    this.currentModifierSections = null;
    this.partyDetailsMainTooltipHeight = 0;
    this.partyDetailsButton = null;
    this.partyBackButton = null;
    this.partyDetailsTooltipContainer = null;
    this._partyDetailsPattern = null;
    this.partyDetailsTooltipBg = null;
    this.partyDetailsTooltipTitleBarBg = null;
    this.partyDetailsTooltipRarityBarBg = null;
    this.partyDetailsTooltipTitle = null;
    this.partyDetailsTooltipSubtitle = null;
    this.partyDetailsTooltipBody = null;
    this.partyDetailsNavContainer = null;
    this.partyDetailsNavLabel = null;
    if (this.partyDetailsFusionContent) {
      this.partyDetailsFusionContent.destroy();
      this.partyDetailsFusionContent = null;
    }
    if (this.partyDetailsRelayContent) {
      this.partyDetailsRelayContent.destroy();
      this.partyDetailsRelayContent = null;
    }

    this.forbiddenFormDetailsTooltipContainer = null;
    this._forbiddenFormDetailsPattern = null;
    this.forbiddenFormDetailsTooltipBg = null;
    this.forbiddenFormDetailsTooltipTitleBarBg = null;
    this.forbiddenFormDetailsTooltipRarityBarBg = null;
    this.forbiddenFormDetailsTooltipTitle = null;
    this.forbiddenFormDetailsTooltipSubtitle = null;
    this.forbiddenFormDetailsTooltipBody = null;
    this.forbiddenFormDetailsNavContainer = null;
    this.forbiddenFormDetailsNavLabel = null;

    this.moveUpgradeDetailsActive = false;
    this.moveUpgradePreviewTier = 1;
    this.moveUpgradeCurrentTier = 1;
    this.moveUpgradePreviewMaxTier = 1;
    this.moveUpgradePreviewCategory = null;
    this.moveUpgradePreviewMoveId = null;
    this.moveUpgradePreviewMoveName = null;
    this.moveUpgradeLastType = null;
    this.moveUpgradeDetailsButton = null;
    this.moveUpgradeBackButton = null;
    this.moveUpgradeNavContainer = null;
  }

  private hasPageableTooltipSection(): boolean {
    const option = this.getCurrentSelectedOption();
    if (!option) return false;
    const type = option.modifierTypeOption?.type;
    if (!type) return false;
    if (type instanceof PokemonNatureChangeModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof AbilitySacrificeModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof StatSacrificeModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof PokemonBaseStatBoosterModifierType || type instanceof PlayerPokemonBaseStatBoosterModifierType || type instanceof ChampionPokemonStatBoosterModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof PassiveAbilitySacrificeModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof MoveSacrificeModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof TmModifierType || type instanceof AnyTmModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof RandomStatSwitcherModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof AbilitySwitcherModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type instanceof RememberMoveModifierType) return this.getTooltipSectionPageCount() > 1;
    if (type?.group === "rankup") {
      const rankData = (type as any)._rankUpTooltipData;
      if (rankData?.kind === "other" && rankData?.abilities?.length > 1) return true;
    }
    return false;
  }

  private getTooltipSectionPageCount(): number {
    const option = this.getCurrentSelectedOption();
    if (!option) return 1;
    const type = option.modifierTypeOption?.type;
    if (!type) return 1;
    if (type?.group === "rankup") {
      const rankData = (type as any)._rankUpTooltipData;
      if (rankData?.kind === "other" && rankData?.abilities?.length > 1) {
        return rankData.abilities.length;
      }
      return 1;
    }
    const party = this.scene.getParty() as PlayerPokemon[];
    if (!party || party.length === 0) return 1;
    const isSinglePage = type instanceof PokemonNatureChangeModifierType || type instanceof RandomStatSwitcherModifierType || type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType || type instanceof AbilitySwitcherModifierType || type instanceof PassiveAbilitySacrificeModifierType || type instanceof StatSacrificeModifierType || type instanceof PokemonBaseStatBoosterModifierType || type instanceof PlayerPokemonBaseStatBoosterModifierType || type instanceof ChampionPokemonStatBoosterModifierType || type instanceof RememberMoveModifierType || type instanceof TmModifierType || type instanceof AnyTmModifierType;
    const pageSize = isSinglePage ? 1 : 2;
    let count = party.length;
    if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
      const moveId = type.moveId;
      const isXM = type instanceof AnyTmModifierType;
      const isYuTm = type instanceof YuTmModifierType;
      const eligible = party.filter((pokemon) => {
        const canLearn = isXM || (isYuTm && pokemon.id === (type as YuTmModifierType).targetPokemonId) || pokemon.compatibleTms?.includes(moveId) || false;
        const alreadyKnows = pokemon.getMoveset().some(m => m?.moveId === moveId);
        return canLearn || alreadyKnows;
      });
      count = eligible.length;
    }
    if (type instanceof RememberMoveModifierType) {
      const eligible = party.filter((p: any) => p.getLearnableLevelMoves?.()?.length > 0);
      count = eligible.length;
    }
    if (count <= pageSize) return 1;
    return Math.ceil(count / pageSize);
  }

  private regenerateCurrentModifierSections(): void {
    const option = this.getCurrentSelectedOption();
    if (!option?.modifierTypeOption?.type) return;
    const type = option.modifierTypeOption.type;
    let sections: { label?: string; body?: string; embeddedContainer?: Phaser.GameObjects.Container }[] | null = null;
    if (type instanceof PokemonNatureChangeModifierType) {
      sections = this.generateMintTooltipSections(type.nature);
    } else if (type instanceof ChampionPokemonStatBoosterModifierType) {
      const pregenArgs = type.getPregenArgs?.() as [string, Stat[], number?, Type[]?] | undefined;
      const stats = pregenArgs?.[1] ?? [];
      const boostPercent = pregenArgs?.[2] ?? 0.03;
      const championTypes = (pregenArgs?.[3] as Type[] ?? []).filter((t: Type) => t !== Type.UNKNOWN);
      if (stats.length > 0) {
        const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
        const party = this.scene.getParty() as PlayerPokemon[];
        sections = this.generateStatBoostTooltipSections(descText, party, stats.length === 1 ? stats[0] : stats, boostPercent, championTypes);
      }
    } else if (type instanceof PokemonBaseStatBoosterModifierType || type instanceof PlayerPokemonBaseStatBoosterModifierType) {
      const stat = ((type as any).getPregenArgs?.()[0] ?? null) as Stat | null;
      const multiplier = type instanceof PokemonBaseStatBoosterModifierType ? 0.08 : 0.03;
      if (stat !== null) {
        const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
        const party = this.scene.getParty() as PlayerPokemon[];
        sections = this.generateStatBoostTooltipSections(descText, party, stat, multiplier);
      }
    } else if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
      const isXM = type instanceof AnyTmModifierType;
      sections = this.generateTmXmTooltipSections(type.moveId, isXM, type);
    } else if (type instanceof AbilitySacrificeModifierType || type instanceof PassiveAbilitySacrificeModifierType) {
      sections = this.generateSacrificeTooltipSections(type instanceof PassiveAbilitySacrificeModifierType ? "Passive" : "Ability");
    } else if (type instanceof StatSacrificeModifierType) {
      sections = this.generateSacrificeTooltipSections("Stat");
    } else if (type instanceof MoveSacrificeModifierType) {
      sections = this.generateSacrificeTooltipSections("Move");
    } else if (type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType) {
      const isPassive = type instanceof AnyPassiveAbilityModifierType;
      sections = this.generateAbilityGrantTooltipSections((type as any).ability?.id, isPassive, type);
    } else if (type instanceof AbilitySwitcherModifierType) {
      sections = this.generateAbilitySwitcherTooltipSections(type);
    } else if (type instanceof RememberMoveModifierType) {
      sections = this.generateMemoryMushroomTooltipSections(type);
    }
    if (this.currentModifierSections) {
      for (const sec of this.currentModifierSections) {
        if (sec?.embeddedContainer) sec.embeddedContainer.destroy();
      }
    }
    if (sections && sections.length > 1) {
      this.currentModifierSections = sections.slice(1);
      for (const sec of this.currentModifierSections) {
        if (sec?.embeddedContainer) sec.embeddedContainer.setVisible(false);
      }
    }
  }

  protected buildTooltipNavRow(page: number, total: number): Phaser.GameObjects.Container {
    const tooltipWidth = 120;
    const container = this.scene.add.container(0, 0);
    const navStr = `\u2190 ${i18next.t("modifierSelectUiHandler:tooltipPageIndicator", { current: page + 1, total })} \u2192  `;
    const navText = addTextObject(this.scene, 0, 0, navStr, TextStyle.WINDOW, { fontSize: "30px" });
    navText.setColor("#888888");
    container.add(navText);
    const { gamepadType, iconPath } = this.getStatsIconInfo();
    const keySprite = this.scene.add.sprite(navText.displayWidth, navText.displayHeight / 2, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(0.4);
    keySprite.setOrigin(0, 0.5);
    container.add(keySprite);
    const totalWidth = navText.displayWidth + keySprite.displayWidth;
    const offsetX = (tooltipWidth - totalWidth) / 2;
    navText.setX(offsetX);
    keySprite.setX(offsetX + navText.displayWidth);
    container.setData("renderedHeight", navText.displayHeight + 2);
    return container;
  }

  private destroyUpgradeTooltipContainerOnly(): void {
    if (this.upgradeTooltipContainer) {
      const parent = this.upgradeTooltipContainer.parentContainer;
      if (parent) parent.remove(this.upgradeTooltipContainer);
      this.upgradeTooltipContainer.removeAll(true);
      this.upgradeTooltipContainer.destroy();
    }
    this.upgradeTooltipContainer = null;
    this.upgradeTooltipBg = null;
    this.upgradeTooltipTitleBarBg = null;
    this.upgradeTooltipRarityBarBg = null;
    this.upgradeTooltipTitle = null;
    this.upgradeTooltipSubtitle = null;
    this.upgradeTooltipBody = null;
    this.moveUpgradeDetailsButton = null;
    this.moveUpgradeBackButton = null;
    this.moveUpgradeNavContainer = null;
  }

  public hideTransientOverlays(): void {
    if (this.showDetailsHintContainer) {
      this.showDetailsHintContainer.destroy();
      this.showDetailsHintContainer = null;
      this.showDetailsHintKeySprite = null;
      this.showDetailsHintLabel = null;
    }

    this.moveInfoOverlay.clear();
    this.moveInfoOverlayActive = false;
    this.hideUpgradeTooltip();
  }

  private _suspendedForOverlay = false;
  private _preSuspendVisible: { reroll: boolean; permaReroll: boolean; lockRarity: boolean; transfer: boolean; check: boolean } | null = null;

  public suspendForOverlay(): void {
    if (this._suspendedForOverlay) return;
    this._suspendedForOverlay = true;
    this._preSuspendVisible = {
      reroll: this.rerollButtonContainer?.visible ?? false,
      permaReroll: this.permaRerollButtonContainer?.visible ?? false,
      lockRarity: this.lockRarityButtonContainer?.visible ?? false,
      transfer: this.transferButtonContainer?.visible ?? false,
      check: this.checkButtonContainer?.visible ?? false,
    };
    this.hideTransientOverlays();
    this.modifierContainer?.setVisible(false);
    this.rerollButtonContainer?.setVisible(false);
    this.permaRerollButtonContainer?.setVisible(false);
    this.lockRarityButtonContainer?.setVisible(false);
    this.transferButtonContainer?.setVisible(false);
    this.checkButtonContainer?.setVisible(false);
    if (this.cursorObj) this.cursorObj.setVisible(false);
  }

  public resumeFromOverlay(): void {
    if (!this._suspendedForOverlay) return;
    this._suspendedForOverlay = false;
    if (!this.active) return;
    this.modifierContainer?.setVisible(true);
    if (this._preSuspendVisible) {
      if (this._preSuspendVisible.reroll) this.rerollButtonContainer?.setVisible(true);
      if (this._preSuspendVisible.permaReroll) this.permaRerollButtonContainer?.setVisible(true);
      if (this._preSuspendVisible.lockRarity) this.lockRarityButtonContainer?.setVisible(true);
      if (this._preSuspendVisible.transfer) this.transferButtonContainer?.setVisible(true);
      if (this._preSuspendVisible.check) this.checkButtonContainer?.setVisible(true);
      this._preSuspendVisible = null;
    }
    if (this.cursorObj) this.cursorObj.setVisible(true);
  }

  private mapModifierTierToRarity(tier: ModifierTier | null): SkillTreeRarity {
    switch (tier) {
      case ModifierTier.MEH:
      case ModifierTier.COMMON:
        return SkillTreeRarity.COMMON;
      case ModifierTier.GREAT:
        return SkillTreeRarity.GREAT;
      case ModifierTier.ULTRA:
        return SkillTreeRarity.ULTRA;
      case ModifierTier.ROGUE:
        return SkillTreeRarity.ROGUE;
      case ModifierTier.MASTER:
        return SkillTreeRarity.MASTER;
      case ModifierTier.LUXURY:
        return SkillTreeRarity.LEGENDARY;
      default:
        return SkillTreeRarity.COMMON;
    }
  }

  private getRarityText(rarity: SkillTreeRarity): string {
    const rarityString = rarity.toString();
    return i18next.t(`championSelect:rarity.${rarityString}`, { defaultValue: rarityString.toUpperCase() });
  }

  private getModifierRarity(type: ModifierType): SkillTreeRarity {
    if (type instanceof ForbiddenFormUnlockModifierType) {
      const data = type.getTooltipData?.();
      if (data?.isSmitty || type.candidate?.kind === "UNI_SMITTY") {
        return SkillTreeRarity.LEGENDARY;
      }
      return SkillTreeRarity.MASTER;
    }
    const tier = type.tier ?? (type.getOrInferTier ? type.getOrInferTier() : null);
    return this.mapModifierTierToRarity(tier);
  }

  private getEssenceDataForPokemon(pokemon: PlayerPokemon): { total: number; byType: Map<Type, number> } {
    const result = { total: 0, byType: new Map<Type, number>() };
    const modifiers = this.scene.findModifiers(m => m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id) as CollectedTypeModifier[];

    for (const mod of modifiers) {
      if ((mod as any).collectedTypes) {
        for (const [typeKey, count] of Object.entries((mod as any).collectedTypes)) {
          const typeNum = parseInt(typeKey) as Type;
          const current = result.byType.get(typeNum) || 0;
          result.byType.set(typeNum, current + (count as number));
          result.total += (count as number);
        }
      }
    }
    return result;
  }

  private getAbilityPool(pokemon: PlayerPokemon): { abilities: Abilities[]; activeIndex: number } {
    const raw: Abilities[] = [];
    const currentForm = pokemon.isFusion()
      ? pokemon.fusionSpecies!.forms[pokemon.fusionFormIndex] || pokemon.fusionSpecies
      : pokemon.species.forms[pokemon.formIndex] || pokemon.species;

    if ((currentForm as any).ability1) raw.push((currentForm as any).ability1);
    if ((currentForm as any).ability2) raw.push((currentForm as any).ability2);
    if ((currentForm as any).abilityHidden) raw.push((currentForm as any).abilityHidden);

    const rawActiveIndex = pokemon.isFusion() ? pokemon.fusionAbilityIndex : pokemon.abilityIndex;
    const activeAbility = raw[rawActiveIndex] ?? raw[0];

    const seen = new Set<Abilities>();
    const abilities: Abilities[] = [];
    for (const ab of raw) {
      if (!seen.has(ab)) {
        seen.add(ab);
        abilities.push(ab);
      }
    }

    const newActiveIndex = abilities.indexOf(activeAbility);
    return { abilities, activeIndex: newActiveIndex >= 0 ? newActiveIndex : 0 };
  }

  private getLocalizedTypeName(type: Type): string {
    return i18next.t(`pokemonInfo:Type.${Type[type]}`, { defaultValue: Type[type] });
  }

  private isSkillTreeBountyType(type: ModifierType): boolean {
    if (!(type instanceof QuestModifierType)) {
      return false;
    }
    const questType = type as QuestModifierType;
    if (questType.config?.duration !== RunDuration.SINGLE_RUN) {
      return false;
    }
    if (!(this.scene as BattleScene).skillTreeModifierContext) {
      return false;
    }
    try {
      const probe = questType.newModifier(this.scene) as PermaRunQuestModifier;
      return probe?.skillTreeBounty === true;
    } catch {
      return false;
    }
  }

  private isVictoryBountyQuest(type: QuestModifierType): boolean {
    try {
      const modifier = type.newModifier(this.scene);
      return modifier instanceof PermaWinQuestModifier;
    } catch {
      return false;
    }
  }

  private createSectionHeaderWithLine(
    label: string,
    currentY: number,
    tooltipWidth: number,
    _container?: Phaser.GameObjects.Container
  ): { header: Phaser.GameObjects.Text; line: Phaser.GameObjects.Graphics; nextY: number } {
    const textX = 8;
    const header = addTextObject(this.scene, textX, 0, label, TextStyle.WINDOW, {
      fontSize: "33px",
      fontStyle: "normal",
      fontFamily: "pkmnems",
      letterSpacing: 2,
    });
    header.setOrigin(0, 0.5);
    header.setColor("#666666");
    header.setAlpha(0.72);
    header.setShadow(0, 0, undefined);

    const headerCenterY = currentY + header.displayHeight / 2;
    header.setPosition(textX, headerCenterY);

    const line = this.scene.add.graphics();
    line.lineStyle(0.5, 0x666666, 0.60);
    const lineStartX = textX + header.displayWidth + 4;
    const lineEndX = tooltipWidth - 8;
    if (lineEndX > lineStartX) {
      line.lineBetween(lineStartX, headerCenterY, lineEndX, headerCenterY);
    }

    return {
      header,
      line,
      nextY: currentY + header.displayHeight + 1
    };
  }

  private buildBountyRewardBodyBBCode(_isVictoryBounty: boolean): string {
    return i18next.t("skillTree:bountyTooltip.rewardsHint", { defaultValue: "Complete to earn exclusive rewards!" });
  }

  private showBountyTooltip(type: QuestModifierType): void {
    if (this.upgradeTooltipContainer) {
      this.hideUpgradeTooltip();
    }

    const rarity = SkillTreeRarity.LEGENDARY;
    const rarityColors = getUpgradeRarityColors(rarity);
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const textX = padding + 2;
    const buttonRowHeight = 10;
    const textSpacing = 4;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const minTooltipHeight = 30;
    const heightOffset = 3;

    const titleText = type.name;
    const isVictoryBounty = this.isVictoryBountyQuest(type);
    const subtitleText = isVictoryBounty
      ? i18next.t("skillTree:bountyTooltip.victoryRunLabel", { defaultValue: "Victory Quest" })
      : i18next.t("skillTree:bountyTooltip.midRunLabel", { defaultValue: "Mid-Run Quest" });
    const taskHeaderLabel = i18next.t("questUi:bounty.sections.task.title", { defaultValue: "Task:" });
    const rewardsHeaderLabel = i18next.t("questUi:bounty.sections.rewards.title", { defaultValue: "Rewards:" });
    let taskBodyText = type.task || type.getDescription(this.scene);
    if (!type.task && type.id?.endsWith("_BOUNTY_QUEST") && type.config?.questUnlockData?.questSpriteId != null) {
      const trainerName = type.name.replace("'s Challenge", "").trim();
      taskBodyText = i18next.t("questUi:bounty.rival.task", { trainerName, stage: 1, defaultValue: `Defeat ${trainerName} - Stage 1` });
    }
    const rewardsBodyText = this.buildBountyRewardBodyBBCode(isVictoryBounty);

    this.upgradeTooltipContainer = this.scene.add.container(0, 0);
    this.upgradeTooltipContainer.setDepth(100);

    this.upgradeTooltipTitle = addTextObject(this.scene, tooltipWidth / 2 + 2, 8, titleText, TextStyle.WINDOW, { fontSize: "40px" });
    this.upgradeTooltipTitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipTitle.setColor("#ffa500");

    this.upgradeTooltipSubtitle = addTextObject(this.scene, tooltipWidth / 2 + 2, 17, subtitleText, TextStyle.WINDOW, { fontSize: "30px" });
    this.upgradeTooltipSubtitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipSubtitle.setTint(rarityColors.border);

    let currentY = 22;

    const taskHeader = this.createSectionHeaderWithLine(taskHeaderLabel, currentY, tooltipWidth, this.upgradeTooltipContainer);
    currentY = taskHeader.nextY;

    const taskBody = addBBCodeTextObject(this.scene, textX, currentY, taskBodyText, TextStyle.WINDOW, { fontSize: "41px" });
    taskBody.setOrigin(0, 0);
    taskBody.setColor("#ffffff");
    this.applyBbCodeWordWrap(taskBody, tooltipWidth, padding);
    currentY += taskBody.displayHeight + textSpacing;

    const rewardsHeader = this.createSectionHeaderWithLine(rewardsHeaderLabel, currentY, tooltipWidth, this.upgradeTooltipContainer);
    currentY = rewardsHeader.nextY;

    const rewardsBody = addBBCodeTextObject(this.scene, textX, currentY, rewardsBodyText, TextStyle.WINDOW, { fontSize: "41px" });
    rewardsBody.setOrigin(0, 0);
    rewardsBody.setColor("#ffffff");
    this.applyBbCodeWordWrap(rewardsBody, tooltipWidth, padding);
    currentY += rewardsBody.displayHeight;

    const contentHeight = currentY - 22;
    const tooltipHeight = Math.max(minTooltipHeight, barsHeight + contentHeight + padding + heightOffset + buttonRowHeight);

    this.upgradeTooltipBg = this.scene.add.graphics();
    const nsBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 167, 12, 12, 12, 12);
    nsBg.setOrigin(0, 0);
    nsBg.setSize(tooltipWidth, tooltipHeight);

    this.upgradeTooltipTitleBarBg = this.scene.add.graphics();

    this.upgradeTooltipRarityBarBg = this.scene.add.graphics();
    this.upgradeTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.upgradeTooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, this.TOOLTIP_RARITY_BAR_HEIGHT);

    const hideButton = this.createHideDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);

    const rowOptions = (this.rowCursor === 1 ? this.options :
      (this.rowCursor >= 2 && this.shopOptionsRows.length >= (this.rowCursor - 1) ?
        this.shopOptionsRows[this.shopOptionsRows.length - (this.rowCursor - 1)] : []));
    const selectedOption = rowOptions[this.cursor];
    if (selectedOption) {
      const modalWidth = this.scene.game.canvas.width / 6;
      const modalHeight = this.scene.game.canvas.height / 6;
      const screenTop = -modalHeight;
      const screenBottom = 0;
      const cardHalfW = 36;

      const xRight = selectedOption.x + cardHalfW + this.TOOLTIP_OFFSET_X;
      const xLeft = selectedOption.x - cardHalfW - this.TOOLTIP_OFFSET_X - tooltipWidth;
      let tooltipX = xRight + tooltipWidth > modalWidth ? xLeft : xRight;
      tooltipX = Math.max(4, Math.min(modalWidth - tooltipWidth - 4, tooltipX));

      let tooltipY = selectedOption.y - tooltipHeight / 2;
      tooltipY = Math.max(screenTop + 4, Math.min(screenBottom - tooltipHeight - 4, tooltipY));
      this.upgradeTooltipContainer.setPosition(tooltipX, tooltipY);
    }

    this.upgradeTooltipContainer.add([
      this.upgradeTooltipBg,
      nsBg,
      this.upgradeTooltipTitleBarBg,
      this.upgradeTooltipRarityBarBg,
      this.upgradeTooltipTitle,
      this.upgradeTooltipSubtitle,
      taskHeader.header,
      taskHeader.line,
      taskBody,
      rewardsHeader.header,
      rewardsHeader.line,
      rewardsBody,
      hideButton
    ]);
    attachModalBackground(this.scene as BattleScene, this.upgradeTooltipContainer, () => ({
      bgX: 0, bgY: 0, bgWidth: tooltipWidth, bgHeight: Math.round(tooltipHeight)
    }), { mask: false, alphaMultiplier: 0.6 });
    this.scene.ui.add(this.upgradeTooltipContainer);
  }

  private showModifierTooltip(
    titleText: string,
    subtitleText: string,
    bodyText: string,
    rarity: SkillTreeRarity,
    enablePartyDetails: boolean = false,
    embeddedStatsContainer?: Phaser.GameObjects.Container,
    showHideDetailsButton: boolean = true,
    sections?: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[],
    hintText?: string,
    headerTypes?: Type[]
  ): void {
    if (this.upgradeTooltipContainer) {
      this.hideUpgradeTooltip();
    }

    const rarityColors = getUpgradeRarityColors(rarity);
    this.upgradeTooltipContainer = this.scene.add.container(0, 0);
    this.upgradeTooltipContainer.setDepth(100);

    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const buttonRowHeight = 10;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const bodyY = 22;
    const textX = padding + 2;
    const textSpacing = 4;

    this.upgradeTooltipTitle = addTextObject(this.scene, tooltipWidth / 2 + 2, 8, titleText, TextStyle.WINDOW, { fontSize: "40px" });
    this.upgradeTooltipTitle.setOrigin(0.5, 0.5);

    this.upgradeTooltipSubtitle = addTextObject(this.scene, tooltipWidth / 2 + 2, 17, subtitleText, TextStyle.WINDOW, { fontSize: "30px" });
    this.upgradeTooltipSubtitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipSubtitle.setTint(rarityColors.border);

    const sectionObjects: Phaser.GameObjects.GameObject[] = [];
    let contentHeight: number;

    if (sections && sections.length > 0) {
      const renderSections = sections.length > 1 ? [sections[0]] : sections;
      let currentY = bodyY;
      for (const section of renderSections) {
        if (section.label) {
          const isCandidates = section.label.toUpperCase().includes("CANDIDATES");
          if (isCandidates) {
            currentY += 5;
          }
          const hdr = this.createSectionHeaderWithLine(section.label, currentY, tooltipWidth);
          sectionObjects.push(hdr.header, hdr.line);
          currentY = hdr.nextY;
          if (isCandidates) {
            currentY += 3;
          }
        }
        if (section.body) {
          const sBody = addBBCodeTextObject(this.scene, textX, currentY, section.body, TextStyle.WINDOW, { fontSize: "46px" });
          sBody.setOrigin(0, 0);
          this.applyBbCodeWordWrap(sBody, tooltipWidth, padding);
          sBody.setColor("#ffffff");
          sectionObjects.push(sBody);
          if (!this.upgradeTooltipBody) {
            this.upgradeTooltipBody = sBody;
          }
          currentY += sBody.displayHeight + textSpacing;
        }
        if (section.embeddedContainer) {
          section.embeddedContainer.setPosition(padding - 2, currentY);
          sectionObjects.push(section.embeddedContainer);
          const explicitH = section.embeddedContainer.getData("renderedHeight");
          if (explicitH && explicitH > 0) {
            currentY += explicitH + 2;
          } else {
            const bounds = section.embeddedContainer.getBounds();
            currentY += (bounds.height / 6) + 2;
          }
        }
      }
      contentHeight = currentY - bodyY;
    } else {
      this.upgradeTooltipBody = this.createColoredComparisonText(textX, bodyY, bodyText);
      this.applyBbCodeWordWrap(this.upgradeTooltipBody, tooltipWidth, padding);
      this.upgradeTooltipBody.setColor("#ffffff");
      sectionObjects.push(this.upgradeTooltipBody);

      contentHeight = this.upgradeTooltipBody.displayHeight;
      if (embeddedStatsContainer) {
        this.shinyPowerStatsContainer = embeddedStatsContainer;
        embeddedStatsContainer.setPosition(padding, bodyY + contentHeight + 2);
        contentHeight += 55;
        sectionObjects.push(embeddedStatsContainer);
      }
    }

    if (sections && sections.length > 1) {
      this.currentModifierContext = "SECTION_RELAY";
      this.currentModifierSections = sections.slice(1);
      for (const sec of this.currentModifierSections) {
        if (sec?.embeddedContainer) sec.embeddedContainer.setVisible(false);
      }
    } else {
      this.currentModifierContext = null;
      this.currentModifierSections = null;
    }

    const hintStripePad = 3;
    let hintBarHeight = 0;
    let hintLabel: any = null;
    if (hintText) {
      hintLabel = addBBCodeTextObject(this.scene, tooltipWidth / 2, 0, hintText, TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
      hintLabel.setOrigin(0.5, 0);
      hintLabel.setColor("#B0B0B0");
      const hintScaleX = hintLabel.scaleX || 1;
      const hintWrapWidth = Math.max(0, (tooltipWidth - padding * 2 - 8) / hintScaleX);
      hintLabel.setStyle({ ...(hintLabel.style as any), wordWrap: { width: hintWrapWidth, useAdvancedWrap: true }, align: "center" } as any);
      const hintTextH = Math.min(hintLabel.displayHeight, 40);
      hintBarHeight = hintTextH + hintStripePad * 2;
    }
    const bottomPad = enablePartyDetails ? (padding * 2) : (padding * 2);
    const buttonH = enablePartyDetails ? (buttonRowHeight + 4) : (showHideDetailsButton ? buttonRowHeight : 0);
    const heightBuffer = enablePartyDetails ? 2 : 20;
    const tooltipHeight = barsHeight + contentHeight + bottomPad + buttonH + hintBarHeight - (hintText && !enablePartyDetails ? 10 : 0) + heightBuffer;

    this.upgradeTooltipBg = this.scene.add.graphics();
    const nsBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 167, 12, 12, 12, 12);
    nsBg.setOrigin(0, 0);
    nsBg.setSize(tooltipWidth, tooltipHeight);
    this.upgradeTooltipContainer!.add(nsBg);
    attachModalBackground(this.scene as BattleScene, this.upgradeTooltipContainer!, () => ({
      bgX: 0, bgY: 0, bgWidth: tooltipWidth, bgHeight: Math.round(tooltipHeight)
    }), { mask: false, alphaMultiplier: 0.6 });

    this.upgradeTooltipTitleBarBg = this.scene.add.graphics();

    this.upgradeTooltipRarityBarBg = this.scene.add.graphics();
    this.upgradeTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.upgradeTooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, this.TOOLTIP_RARITY_BAR_HEIGHT);

    const headerTypeSprites: Phaser.GameObjects.Sprite[] = [];
    if (headerTypes && headerTypes.length > 0) {
      const filteredTypes = headerTypes.filter(t => t !== Type.UNKNOWN);
      const badgeX = tooltipWidth - 12;
      if (filteredTypes.length === 1) {
        const frame = Type[filteredTypes[0]]?.toLowerCase() || "unknown";
        const spr = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type", frame);
        spr.setScale(0.35);
        spr.setOrigin(1, 0.5);
        headerTypeSprites.push(spr);
      } else if (filteredTypes.length >= 2) {
        const frame0 = Type[filteredTypes[0]]?.toLowerCase() || "unknown";
        const frame1 = Type[filteredTypes[1]]?.toLowerCase() || "unknown";
        const spr1 = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type1", frame0);
        spr1.setScale(0.35);
        spr1.setOrigin(1, 1);
        headerTypeSprites.push(spr1);
        const spr2 = this.scene.add.sprite(badgeX, 17, "pbinfo_enemy_type2", frame1);
        spr2.setScale(0.35);
        spr2.setOrigin(1, 0);
        headerTypeSprites.push(spr2);
      }
    }

    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    this.upgradeTooltipTitle!.setColor(rarityHex);

    const hideButton = showHideDetailsButton ? this.createHideDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight) : null;
    if (enablePartyDetails || this.currentModifierContext === "SECTION_RELAY") {
      this.partyDetailsMainTooltipHeight = tooltipHeight;
      this.partyDetailsButton = this.createPartyDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      this.partyBackButton = this.createPartyBackButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      const inDetails = this.partyDetailsActive || this.forbiddenFormDetailsActive;
      this.partyDetailsButton.setVisible(!inDetails);
      this.partyBackButton.setVisible(inDetails);
    }

    const rowOptions = (this.rowCursor === 1 ? this.options :
      (this.rowCursor >= 2 && this.shopOptionsRows.length >= (this.rowCursor - 1) ?
        this.shopOptionsRows[this.shopOptionsRows.length - (this.rowCursor - 1)] : []));
    const selectedOption = rowOptions[this.cursor];
    if (selectedOption) {
      const modalWidth = this.scene.game.canvas.width / 6;
      const modalHeight = this.scene.game.canvas.height / 6;
      const screenTop = -modalHeight;
      const screenBottom = 0;
      const cardHalfW = 36;

      const xRight = selectedOption.x + cardHalfW + this.TOOLTIP_OFFSET_X;
      const xLeft = selectedOption.x - cardHalfW - this.TOOLTIP_OFFSET_X - tooltipWidth;
      let tooltipX = xRight + tooltipWidth > modalWidth ? xLeft : xRight;
      tooltipX = Math.max(4, Math.min(modalWidth - tooltipWidth - 4, tooltipX));

      let tooltipY = selectedOption.y - tooltipHeight / 2;
      tooltipY = Math.max(screenTop + 4, Math.min(screenBottom - tooltipHeight - 4, tooltipY));
      this.upgradeTooltipContainer.setPosition(tooltipX, tooltipY);
    } else if (this.rowCursor === 0) {
      const buttonLayout = this.getButtonLayout();
      const btn = buttonLayout[this.cursor];
      if (btn) {
        const modalWidth = this.scene.game.canvas.width / 6;
        let tooltipX = btn.x - tooltipWidth / 2;
        tooltipX = Math.max(4, Math.min(modalWidth - tooltipWidth - 4, tooltipX));
        const tooltipY = (btn.y + 3.5) - tooltipHeight - 6;
        this.upgradeTooltipContainer.setPosition(tooltipX, tooltipY);
      }
    }

    const children: Phaser.GameObjects.GameObject[] = [
      this.upgradeTooltipBg,
      this.upgradeTooltipTitleBarBg,
      this.upgradeTooltipRarityBarBg,
      ...headerTypeSprites,
      this.upgradeTooltipTitle,
      this.upgradeTooltipSubtitle,
      ...sectionObjects,
    ];
    if (hideButton) {
      children.push(hideButton);
    }
    if (this.shinyPowerStatsContainer && !sections) {
      children.push(this.shinyPowerStatsContainer);
    }
    if (enablePartyDetails || this.currentModifierContext === "SECTION_RELAY") {
      if (this.partyDetailsButton) {
        children.push(this.partyDetailsButton);
      }
      if (this.partyBackButton) {
        children.push(this.partyBackButton);
      }
    }
    if (hintText && hintLabel && hintBarHeight > 0) {
      const loreBarY = tooltipHeight - 2 - hintBarHeight;
      const hintBarBg = this.scene.add.graphics();
      hintBarBg.fillStyle(0x0f0f1e, 0.85);
      hintBarBg.fillRect(2, loreBarY, tooltipWidth - 4, hintBarHeight);
      hintLabel.setPosition(tooltipWidth / 2, loreBarY + hintStripePad);
      if (hintLabel.displayHeight > 40) {
        hintLabel.setCrop(0, 0, tooltipWidth, 40);
      }
      children.push(hintBarBg);
      children.push(hintLabel);
    }
    this.upgradeTooltipContainer.add(children);
    this.scene.ui.add(this.upgradeTooltipContainer);
  }

  private showPartyDetailsTooltip(
    titleText: string,
    subtitleText: string,
    rarity: SkillTreeRarity,
    headerLines: string[],
    partyLines: string[],
    party: PlayerPokemon[],
    context: { kind: "STAT_SWITCHER"; stat1: Stat; stat2: Stat } | { kind: "MINT"; targetNature: Nature } | { kind: "STAT_SACRIFICE"; stat: Stat } | { kind: "MOVE_SACRIFICE" } | { kind: "FUSION" } | { kind: "BASE_STAT_BOOST"; stat: Stat; multiplier: number } | { kind: "SOUL_DEW" },
    embeddedStatsContainer?: Phaser.GameObjects.Container,
    hintText?: string
  ): void {
    const bodyText = [...headerLines, ...partyLines.map(l => `  ${l}`)].join('\n');
    this.showModifierTooltip(titleText, subtitleText, bodyText, rarity, true, embeddedStatsContainer, false, undefined, hintText);
    this.partyDetailsActive = false;
    this.partyDetailsIndex = 0;
    this.partyDetailsPartnerIndex = 0;
    this.partyDetailsHeaderLines = headerLines;
    this.partyDetailsPartyLines = partyLines;
    this.partyDetailsParty = party;
    this.partyDetailsRarity = rarity;
    this.partyDetailsContext = context;
    if (this.partyDetailsButton) {
      this.partyDetailsButton.setVisible(true);
    }
    if (this.partyBackButton) {
      this.partyBackButton.setVisible(false);
    }
    if (this.partyDetailsTooltipContainer) {
      this.partyDetailsTooltipContainer.setVisible(false);
    }
  }

  private createStatBarsContainer(baseStats: number[], highlightStat?: Stat, showTotal: boolean = true, useBlueBase: boolean = false): Phaser.GameObjects.Container {
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const statNames = [
      i18next.t("pokemonInfo:Stat.HPStat"),
      i18next.t("pokemonInfo:Stat.ATKshortened"),
      i18next.t("pokemonInfo:Stat.DEFshortened"),
      i18next.t("pokemonInfo:Stat.SPATKshortened"),
      i18next.t("pokemonInfo:Stat.SPDEFshortened"),
      i18next.t("pokemonInfo:Stat.SPDshortened")
    ];
    const statColorValues = [0x4a90e2, 0xff5555, 0xffaa33, 0xaa55ff, 0x55aa55, 0xff55aa];

    const container = this.scene.add.container(0, 0);
    const startY = 0;
    const lineSpacing = 4;
    const labelX = 0;
    const valueX = 22;
    const barX = 25;
    const barHeight = 4;
    const maxWidth = 50;

    for (let i = 0; i < statOrder.length; i++) {
      const stat = statOrder[i];
      const statValue = baseStats[stat];
      const y = startY + i * lineSpacing;
      const isHighlighted = highlightStat === stat;

      const label = addTextObject(
        this.scene, labelX, y, statNames[i],
        TextStyle.WINDOW, { fontSize: "35px" }
      );
      label.setOrigin(0, 0);

      const valueText = addTextObject(
        this.scene, valueX, y, statValue.toString(),
        TextStyle.WINDOW, { fontSize: "35px" }
      );
      valueText.setOrigin(1, 0);
      if (isHighlighted && !useBlueBase) {
        valueText.setTint(statColorValues[i]);
      }

      const barColor = useBlueBase ? 0x4a90e2 : statColorValues[i];
      const barWidth = Math.max(3, Math.min(maxWidth, (statValue / 255) * maxWidth));
      const bar = this.scene.add.rectangle(barX, y + 1, barWidth, barHeight, barColor);
      bar.setOrigin(0, 0);

      container.add([label, valueText, bar]);
    }

    if (showTotal) {
      const totalValue = statOrder.reduce((sum, stat) => sum + baseStats[stat], 0);
      const totalY = startY + statOrder.length * lineSpacing + lineSpacing / 2 - 5;
      const totalLabel = addTextObject(
        this.scene, labelX, totalY,
        i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }),
        TextStyle.WINDOW, { fontSize: "35px" }
      );
      totalLabel.setOrigin(0, 0);

      const totalValueText = addTextObject(
        this.scene, valueX, totalY, totalValue.toString(),
        TextStyle.WINDOW, { fontSize: "35px" }
      );
      totalValueText.setOrigin(1, 0);

      container.add([totalLabel, totalValueText]);
    }
    return container;
  }

  private generateAddPokemonTooltipBody(pokemon: PlayerPokemon): { body: string; statsContainer?: Phaser.GameObjects.Container } {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const shinySwaps = (pokemon as any)._shinyPowerStatSwaps as { from: Stat; to: Stat }[] | undefined;
    const shinyAbilityId = (pokemon as any)._shinyPowerAbilityId;
    const shinyMoveVariant = !!(pokemon as any)._shinyPowerMoveVariant;
    const isShinyPowerContext = shinySwaps !== undefined || shinyAbilityId !== undefined || shinyMoveVariant || !!this.displayConfig?.hideShop;

    if (!isShinyPowerContext) {
      const typesLabel = i18next.t("skillTree:descriptions.altBuildTypes", { defaultValue: "Types:" });
      const pokemonTypes = pokemon.getTypes();
      const types = pokemonTypes.filter(t => t !== Type.UNKNOWN).map(t => this.getLocalizedTypeName(t)).join("/");
      lines.push(getBBCodeFrag(`${typesLabel} ${types}`, TextStyle.WINDOW, uiTheme));
    }

    if (shinyMoveVariant) {
      const movesLabel = i18next.t("shinyPower:newMoves", { defaultValue: "NEW MOVES" });
      lines.push(`${movesLabel}:`);
      pokemon.getMoveset().filter(m => m).forEach(m => {
        lines.push(`  [color=#78c850]${m!.getName()}[/color]`);
      });
    } else {
      const abilityLabel = isShinyPowerContext
        ? i18next.t("modifierSelectUiHandler:activeAbility", { defaultValue: "Active Ability:" })
        : i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
      if (shinyAbilityId != null) {
        const activeAbility = allAbilities[shinyAbilityId]?.name || "???";
        lines.push(`${abilityLabel} [color=#78c850]${activeAbility}[/color]`);
        const abilityDesc = allAbilities[shinyAbilityId]?.description || "";
        if (abilityDesc) {
          lines.push(getBBCodeFrag(abilityDesc, TextStyle.WINDOW, uiTheme));
        }
      } else if (isShinyPowerContext) {
      const { abilities, activeIndex } = this.getAbilityPool(pokemon);
      const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
      lines.push(`${abilityLabel} [color=#78c850]${activeAbility}[/color]`);
      const abilityDesc = allAbilities[abilities[activeIndex]]?.description || "";
      if (abilityDesc) {
        lines.push(getBBCodeFrag(abilityDesc, TextStyle.WINDOW, uiTheme));
      }
    } else {
      const { abilities, activeIndex } = this.getAbilityPool(pokemon);
      const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
      const otherAbilities = abilities
        .filter((_, i) => i !== activeIndex)
        .map(a => allAbilities[a]?.name || Abilities[a]);
      let abilityLine = `${abilityLabel} [color=#78c850]${activeAbility}[/color]`;
      if (otherAbilities.length > 0) {
        abilityLine += `, ${otherAbilities.map(a => `[color=#888888]${a}[/color]`).join(", ")}`;
      }
      lines.push(abilityLine);
    }
    }

    if (!isShinyPowerContext) {
      const movesLabel = i18next.t("pokemonInfoContainer:moveset", { defaultValue: "Moves" });
      const moves = pokemon.getMoveset().filter(m => m).map(m => m!.getName()).join(", ");
      lines.push(getBBCodeFrag(`${movesLabel}: ${moves}`, TextStyle.WINDOW, uiTheme));
      lines.push(`[size=2] [/size]`);
    }

    const nature = pokemon.getNature();
    let rawBaseStats = pokemon.getModifiedBaseStats();
    if (pokemon.isFusion() && pokemon.fusionSpecies) {
      const fusionBaseStats = pokemon.getFusionSpeciesForm().baseStats;
      for (let i = 0; i < rawBaseStats.length; i++) {
        rawBaseStats[i] = Math.ceil((rawBaseStats[i] + fusionBaseStats[i]) / 2);
      }
    }
    let baseStats = rawBaseStats;
    if (shinySwaps?.length) {
      baseStats = rawBaseStats.slice();
      for (const { from, to } of shinySwaps) {
        const temp = baseStats[from];
        baseStats[from] = baseStats[to];
        baseStats[to] = temp;
      }
    }
    let statsContainer: Phaser.GameObjects.Container | undefined;
    statsContainer = this.createStatBarsContainer(baseStats);

    if (shinySwaps?.length) {
      const swapHeader = i18next.t("shinyPower:statSwaps", { defaultValue: "Unique Stats:" });
      lines.push(getBBCodeFrag(swapHeader, TextStyle.WINDOW, uiTheme));
      for (const { from, to } of shinySwaps) {
        const fromVal = rawBaseStats[from];
        const toVal = rawBaseStats[to];
        const fromName = getStatName(from, true);
        const toName = getStatName(to, true);
        if (fromVal === toVal) {
          lines.push(`[color=#e8e8a8]${fromName} | ${toName}[/color]`);
        } else if (toVal > fromVal) {
          lines.push(`[color=#78c850]${fromName} \u2191[/color]  [color=#e13d3d]${toName} \u2193[/color]`);
        } else {
          lines.push(`[color=#e13d3d]${fromName} \u2193[/color]  [color=#78c850]${toName} \u2191[/color]`);
        }
      }
    }

    return { body: lines.join('\n'), statsContainer };
  }

  private generateAddPokemonTooltipSections(pokemon: PlayerPokemon): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;
    const shinySwaps = (pokemon as any)._shinyPowerStatSwaps as { from: Stat; to: Stat }[] | undefined;
    const shinyAbilityId = (pokemon as any)._shinyPowerAbilityId;
    const shinyMoveVariant = !!(pokemon as any)._shinyPowerMoveVariant;
    const isShinyPowerContext = shinySwaps !== undefined || shinyAbilityId !== undefined || shinyMoveVariant || !!this.displayConfig?.hideShop;

    if (!isShinyPowerContext) {
      const desc = type.getDescription(this.scene);
      if (desc) {
        sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });
      }
      const pokemonTypes = pokemon.getTypes();
      const types = pokemonTypes.filter(t => t !== Type.UNKNOWN).map(t => `[color=#78c850]${this.getLocalizedTypeName(t)}[/color]`).join(" / ");
      sections.push({ label: "TYPES", body: types });
    }

    if (shinyMoveVariant) {
      const moveNames = pokemon.getMoveset().filter(m => m).map(m => `[color=#78c850]${m!.getName()}[/color]`).join(", ");
      sections.push({ label: i18next.t("shinyPower:newMoves", { defaultValue: "NEW MOVES" }), body: moveNames });
    } else {
      const abilityLines: string[] = [];
      if (shinyAbilityId != null) {
        abilityLines.push(`[color=#78c850]${allAbilities[shinyAbilityId]?.name || "???"}[/color]`);
        const abilityDesc = allAbilities[shinyAbilityId]?.description || "";
        if (abilityDesc) abilityLines.push(abilityDesc);
      } else if (isShinyPowerContext) {
        const { abilities, activeIndex } = this.getAbilityPool(pokemon);
        const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
        abilityLines.push(`[color=#78c850]${activeAbility}[/color]`);
        const abilityDesc = allAbilities[abilities[activeIndex]]?.description || "";
        if (abilityDesc) abilityLines.push(abilityDesc);
      } else {
        const { abilities, activeIndex } = this.getAbilityPool(pokemon);
        const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
        const otherAbilities = abilities
          .filter((_: any, i: number) => i !== activeIndex)
          .map((a: Abilities) => allAbilities[a]?.name || Abilities[a]);
        let line = `[color=#78c850]${activeAbility}[/color]`;
        if (otherAbilities.length > 0) {
          line += `, ${otherAbilities.map((a: string) => `[color=#888888]${a}[/color]`).join(", ")}`;
        }
        abilityLines.push(line);
        const abilityDesc = allAbilities[abilities[activeIndex]]?.description || "";
        if (abilityDesc) abilityLines.push(abilityDesc);
      }
      sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" }), body: abilityLines.join('\n') });
    }

    if (!isShinyPowerContext) {
      const moves = pokemon.getMoveset().filter(m => m).map(m => m!.getName()).join(", ");
      sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipMovesHeader", { defaultValue: "MOVES" }), body: moves });
    }

    let rawBaseStats = pokemon.getSpeciesForm().baseStats.slice();
    if (pokemon.isFusion() && pokemon.fusionSpecies) {
      const fusionBaseStats = pokemon.getFusionSpeciesForm().baseStats;
      for (let i = 0; i < rawBaseStats.length; i++) {
        rawBaseStats[i] = Math.ceil((rawBaseStats[i] + fusionBaseStats[i]) / 2);
      }
    }
    let baseStats = rawBaseStats;
    if (shinySwaps?.length) {
      baseStats = rawBaseStats.slice();
      for (const { from, to } of shinySwaps) {
        const temp = baseStats[from];
        baseStats[from] = baseStats[to];
        baseStats[to] = temp;
      }
    }

    const statsLines: string[] = [];
    if (shinySwaps?.length) {
      for (const { from, to } of shinySwaps) {
        const fromVal = rawBaseStats[from];
        const toVal = rawBaseStats[to];
        const fromName = getStatName(from, true);
        const toName = getStatName(to, true);
        if (fromVal === toVal) {
          statsLines.push(`[color=#e8e8a8]${fromName} | ${toName}[/color]`);
        } else if (toVal > fromVal) {
          statsLines.push(`[color=#78c850]${fromName} \u2191[/color]  [color=#e13d3d]${toName} \u2193[/color]`);
        } else {
          statsLines.push(`[color=#e13d3d]${fromName} \u2193[/color]  [color=#78c850]${toName} \u2191[/color]`);
        }
      }
    }

    const statsContainer = this.createStatBarsContainer(baseStats);
    const statsBody = statsLines.length > 0 ? statsLines.join('\n') : "";
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipStatsHeader", { defaultValue: "STATS" }), body: statsBody, embeddedContainer: statsContainer });

    return sections;
  }

  private buildPartySectionLines(
    party: PlayerPokemon[],
    formatter: (pokemon: PlayerPokemon) => string,
    filter?: (pokemon: PlayerPokemon) => boolean
  ): string {
    const filtered = filter ? party.filter(filter) : party;
    return filtered.map(p => {
      const payload = formatter(p);
      return `  [color=#ffcc00]${p.name}[/color]: ${payload}`;
    }).join('\n');
  }

  private centerPartyGridIcon(
    iconContainer: Phaser.GameObjects.Container,
    pokemon: any,
    rowCenterY: number,
    finalScale: number
  ): void {
    const isDuelmonFusion = pokemon.isFusion() && (
      pokemon.species.generation === 20 ||
      (pokemon.fusionSpecies && pokemon.fusionSpecies.generation === 20)
    );

    if (isDuelmonFusion && iconContainer.length >= 2) {
      const bottom = iconContainer.getAt(1) as Phaser.GameObjects.Sprite;
      const totalLocalH = bottom.y + (bottom.frame?.cutHeight ?? bottom.height);
      iconContainer.y = rowCenterY - (totalLocalH / 2) * finalScale - 2;
      return;
    }

    const sprite = iconContainer.getAt(0) as Phaser.GameObjects.Sprite;
    const trimTop = (sprite.frame as any)?.customData?.spriteSourceSize?.y ?? 0;
    const trimH = sprite.frame?.cutHeight ?? sprite.height;
    iconContainer.y = rowCenterY - (trimTop + trimH / 2) * finalScale - 2;
  }

  private buildPartySectionIconGrid(
    party: PlayerPokemon[],
    formatter: (pokemon: PlayerPokemon) => string,
    filter?: (pokemon: PlayerPokemon) => boolean,
    highlightIndex?: integer
  ): Phaser.GameObjects.Container {
    const filtered = filter ? party.filter(filter) : party;
    const container = this.scene.add.container(0, 0);
    const COLS = 3;
    const colWidth = 36;
    const rowHeight = 14;
    const iconScale = 0.35;
    const iconZoneWidth = 12;

    for (let i = 0; i < filtered.length; i++) {
      const pokemon = filtered[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * colWidth;
      const cellY = row * rowHeight;
      const rowCenterY = cellY + rowHeight / 2;

      if (highlightIndex !== undefined && highlightIndex >= 0 && i === highlightIndex) {
        const hlGfx = this.scene.add.graphics();
        hlGfx.lineStyle(1, 0x00bfff, 0.85);
        hlGfx.strokeRoundedRect(cellX, cellY, colWidth - 2, rowHeight - 1, 2);
        container.add(hlGfx);
      }

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, cellX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);
      this.centerPartyGridIcon(iconContainer, pokemon, rowCenterY, finalScale);
      container.add(iconContainer);

      const payload = formatter(pokemon);
      const payloadText = addBBCodeTextObject(this.scene, cellX + iconZoneWidth + 2, rowCenterY, payload, TextStyle.WINDOW, { fontSize: "28px" });
      payloadText.setOrigin(0, 0.5);
      const maxW = colWidth - iconZoneWidth - 4;
      if (payloadText.displayWidth > maxW && maxW > 0) {
        payloadText.setScale(payloadText.scaleX * (maxW / payloadText.displayWidth), payloadText.scaleY);
      }
      container.add(payloadText);
    }

    const rowCount = Math.ceil(filtered.length / COLS);
    container.setData("renderedHeight", rowCount * rowHeight);

    return container;
  }

  private buildPartySectionIconGridWithTypes(
    party: PlayerPokemon[],
    formatter: (pokemon: PlayerPokemon) => Type[],
    filter?: (pokemon: PlayerPokemon) => boolean
  ): Phaser.GameObjects.Container {
    const filtered = filter ? party.filter(filter) : party;
    const container = this.scene.add.container(0, 0);
    const COLS = 3;
    const colWidth = 36;
    const rowHeight = 14;
    const iconScale = 0.35;
    const iconZoneWidth = 12;

    for (let i = 0; i < filtered.length; i++) {
      const pokemon = filtered[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * colWidth;
      const cellY = row * rowHeight;
      const rowCenterY = cellY + rowHeight / 2;

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, cellX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScaleT = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScaleT);
      this.centerPartyGridIcon(iconContainer, pokemon, rowCenterY, finalScaleT);
      container.add(iconContainer);

      const types = formatter(pokemon);
      if (types.length === 1) {
        const frame = Type[types[0]]?.toLowerCase() || "unknown";
        const spr = this.scene.add.sprite(cellX + iconZoneWidth + 2, rowCenterY, "pbinfo_enemy_type", frame);
        spr.setScale(0.35);
        spr.setOrigin(0, 0.5);
        container.add(spr);
      } else if (types.length >= 2) {
        const frame0 = Type[types[0]]?.toLowerCase() || "unknown";
        const frame1 = Type[types[1]]?.toLowerCase() || "unknown";
        const spr1 = this.scene.add.sprite(cellX + iconZoneWidth + 2, rowCenterY, "pbinfo_enemy_type1", frame0);
        spr1.setScale(0.35);
        spr1.setOrigin(0, 1);
        container.add(spr1);
        const spr2 = this.scene.add.sprite(cellX + iconZoneWidth + 2, rowCenterY, "pbinfo_enemy_type2", frame1);
        spr2.setScale(0.35);
        spr2.setOrigin(0, 0);
        container.add(spr2);
      }
    }

    const rowCount = Math.ceil(filtered.length / COLS);
    container.setData("renderedHeight", rowCount * rowHeight);

    return container;
  }

  private generateTmXmTooltipSections(moveId: Moves, isXM: boolean = false, modType?: TmModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];

    const tooltipWidth = 120;
    const padding = 6;
    const moveContainer = this.scene.add.container(0, 0);
    const moveChildren: Phaser.GameObjects.GameObject[] = [];
    const renderedHeight = PokemonBattleTooltipUtils.renderSingleMoveBlock(
      this.scene, moveChildren, moveId, 2, 0, tooltipWidth - padding * 2, padding,
      { showPP: false, showEffect: true, useUpgraded: true, compactSingleLine: true }
    );
    moveContainer.add(moveChildren);
    moveContainer.setData("renderedHeight", renderedHeight);
    sections.push({ body: "", embeddedContainer: moveContainer });

    const isYuTm = modType instanceof YuTmModifierType;
    const party = this.scene.getParty() as PlayerPokemon[];
    const eligible = party.filter((pokemon) => {
      const canLearn = isXM || (isYuTm && pokemon.id === (modType as YuTmModifierType).targetPokemonId) || pokemon.compatibleTms?.includes(moveId) || false;
      const alreadyKnows = pokemon.getMoveset().some(m => m?.moveId === moveId);
      return canLearn || alreadyKnows;
    });

    if (eligible.length > 0) {
      const pageSize = 1;
      const totalPages = Math.ceil(eligible.length / pageSize);
      const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
      const startIdx = page * pageSize;
      const slice = eligible.slice(startIdx, startIdx + pageSize);

      const partyGrid = this.buildPartySectionIconGridWithMovesVertical(slice);

      const headerLabel = totalPages > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipEligibleHeader", { defaultValue: "ELIGIBLE" })} (${page + 1}/${totalPages})`
        : i18next.t("modifierSelectUiHandler:tooltipEligibleHeader", { defaultValue: "ELIGIBLE" });
      sections.push({ label: headerLabel, body: "", embeddedContainer: partyGrid });
      if (totalPages > 1) {
        const navRow = this.buildTooltipNavRow(page, totalPages);
        sections.push({ body: "", embeddedContainer: navRow });
      }
    }

    return sections;
  }

  private generateMemoryMushroomTooltipSections(type: ModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme)
    });

    const party = this.scene.getParty() as PlayerPokemon[];
    const eligible = party.filter((p: any) => p.getLearnableLevelMoves?.()?.length > 0);

    if (eligible.length > 0) {
      const pageSize = 1;
      const totalPages = Math.ceil(eligible.length / pageSize);
      const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
      const slice = eligible.slice(page, page + pageSize);

      const moveGrid = this.buildRememberableMovesVertical(slice);

      const headerLabel = totalPages > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" })} (${page + 1}/${totalPages})`
        : i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" });
      sections.push({ label: headerLabel, body: "", embeddedContainer: moveGrid });
      if (totalPages > 1) {
        const navRow = this.buildTooltipNavRow(page, totalPages);
        sections.push({ body: "", embeddedContainer: navRow });
      }
    }

    return sections;
  }

  private buildRememberableMovesVertical(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const children: Phaser.GameObjects.GameObject[] = [];
    const tooltipWidth = 120;
    const padding = 4;
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    const rowPitch = 9;
    let currentY = 0;

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(padding, currentY, tooltipWidth - padding, currentY);
        container.add(divLine);
        currentY += 4;
      }

      const blockStartY = currentY;
      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, padding + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const contentLeft = padding + iconZoneWidth + 2;
      const learnableMoves = pokemon.getLearnableLevelMoves();
      const use2Col = learnableMoves.length > 8;
      const colWidth = use2Col ? Math.floor((tooltipWidth - contentLeft - padding) / 2) : (tooltipWidth - contentLeft - padding - 2);

      const renderMoveRow = (moveId: number, colX: number, rowY: number) => {
        const move = allMoves[moveId];
        if (!move) return;
        let xCursor = colX;
        const moveType = move.type;
        const typeFrame = Type[moveType]?.toLowerCase() || "unknown";
        const typeSpr = this.scene.add.sprite(xCursor, rowY + 4, "pbinfo_enemy_type", typeFrame);
        typeSpr.setScale(0.35);
        typeSpr.setOrigin(0, 0.5);
        children.push(typeSpr);
        xCursor += typeSpr.displayWidth + 1;

        const moveNameText = addTextObject(this.scene, xCursor, rowY + 1, move.name, TextStyle.WINDOW, { fontSize: "31px" });
        moveNameText.setOrigin(0, 0);
        children.push(moveNameText);

        const maxMoveW = colWidth - (xCursor - colX) - 2;
        if (moveNameText.displayWidth > maxMoveW) {
          moveNameText.setScale(maxMoveW / moveNameText.displayWidth, 1);
        }
      };

      if (use2Col) {
        const midIdx = Math.ceil(learnableMoves.length / 2);
        const col1 = learnableMoves.slice(0, midIdx);
        const col2 = learnableMoves.slice(midIdx);
        const col1X = contentLeft;
        const col2X = contentLeft + colWidth;
        const maxRows = Math.max(col1.length, col2.length);
        for (let r = 0; r < maxRows; r++) {
          const rowY = currentY;
          if (r < col1.length) renderMoveRow(col1[r], col1X, rowY);
          if (r < col2.length) renderMoveRow(col2[r], col2X, rowY);
          currentY += rowPitch;
        }
      } else {
        for (let i = 0; i < learnableMoves.length; i++) {
          renderMoveRow(learnableMoves[i], contentLeft, currentY);
          currentY += rowPitch;
        }
      }

      const blockMidY = blockStartY + (currentY - blockStartY) / 2;
      this.centerPartyGridIcon(iconContainer, pokemon, blockMidY, finalScale);
      container.add(iconContainer);
    }

    container.add(children);
    container.setData("renderedHeight", currentY);
    return container;
  }

  private generateTmXmTooltipBody(moveId: Moves, isXM: boolean = false): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const moveDetails = MoveUpgradeTooltipUtils.generateMoveDetails(this.scene, moveId);
    if (moveDetails) {
      lines.push(moveDetails);
    }

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (const pokemon of party) {
      const canLearn = isXM || pokemon.compatibleTms?.includes(moveId) || false;
      const alreadyKnows = pokemon.getMoveset().some(m => m?.moveId === moveId);

      let status: string;
      if (alreadyKnows) {
        status = `[color=#00ff00]${i18next.t("modifierSelectUiHandler:alreadyKnows", { defaultValue: "Knows" })}[/color]`;
      } else if (canLearn) {
        status = `[color=#00bfff]${i18next.t("modifierSelectUiHandler:canLearn", { defaultValue: "Can Learn" })}[/color]`;
      } else {
        status = `[color=#888888]${i18next.t("modifierSelectUiHandler:cannotLearn", { defaultValue: "Cannot Learn" })}[/color]`;
      }

      lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: ${status}`);
    }

    return lines.join('\n');
  }

  private generateAbilityItemTooltipBody(ability: Abilities, isPassive: boolean): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const abilityData = allAbilities[ability];
    const desc = abilityData?.description || '';
    if (desc) {
      lines.push(getBBCodeFrag(desc, TextStyle.WINDOW, uiTheme));
    }

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
    for (const pokemon of party) {
      const currentAbility = pokemon.getAbility()?.name || noneLabel;
      const currentPassive = pokemon.passive ? (allAbilities[(pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id]?.name || noneLabel) : noneLabel;

      if (isPassive) {
        const passiveLabel = i18next.t("skillTree:descriptions.altBuildPassiveAbility", { defaultValue: "Passive:" });
        const passiveColor = currentPassive === noneLabel ? "#888888" : "#78c850";
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color] - ${passiveLabel} [color=${passiveColor}]${currentPassive}[/color]`);
      } else {
        const abilityLabel = i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color] - ${abilityLabel} [color=#78c850]${currentAbility}[/color]`);
      }
    }

    return lines.join('\n');
  }

  private generateAbilityGrantTooltipSections(ability: Abilities, isPassive: boolean, type: ModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    const replaceNote = isPassive
      ? i18next.t("modifierType:common.passiveAbilityReplaceNote")
      : i18next.t("modifierType:common.abilityReplaceNote");
    const finalDesc = `${desc}\n[color=#AAAAAA]${replaceNote}[/color]`;
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: finalDesc });

    const abilityData = allAbilities[ability];
    if (abilityData) {
      const abilityBody = `[color=#78c850]${abilityData.name}[/color]\n${abilityData.description || ""}`;
      sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" }), body: abilityBody });
    }

    const party = this.scene.getParty() as PlayerPokemon[];
    const pageSize = 1;
    const totalPages = Math.ceil(party.length / pageSize);
    const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
    const startIdx = page * pageSize;
    const slice = party.slice(startIdx, startIdx + pageSize);
    const partyGrid = this.buildCurrentAbilityDetailedView(slice, isPassive);
    const headerLabel = totalPages > 1
      ? `${i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" })} (${page + 1}/${totalPages})`
      : i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" });
    sections.push({ label: headerLabel, body: "", embeddedContainer: partyGrid });
    if (totalPages > 1) {
      const navRow = this.buildTooltipNavRow(page, totalPages);
      sections.push({ body: "", embeddedContainer: navRow });
    }

    if ((type as any).getTooltipLore) {
      const lore = (type as any).getTooltipLore(this.scene);
      if (lore) {
        sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipRulesHeader", { defaultValue: "RULES" }), body: lore });
      }
    }

    return sections;
  }

  private generatePartyAbilityTooltipSections(ability: Abilities, type: ModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const abilityData = allAbilities[ability];
    if (abilityData) {
      const abilityBody = `[color=#78c850]${abilityData.name}[/color]\n${abilityData.description || ""}`;
      sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" }), body: abilityBody });
    }

    if ((type as any).getTooltipLore) {
      const lore = (type as any).getTooltipLore(this.scene);
      if (lore) {
        sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipRulesHeader", { defaultValue: "RULES" }), body: lore });
      }
    }

    return sections;
  }

  private generateQuestTooltipSections(type: QuestModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    const localeNameKey = `quests:${(type as any).id}.name`;
    const oldName = i18next.exists(localeNameKey) ? (i18next.t(localeNameKey) as string) : ((type as any).config?.name || "");
    const taskText = type.task || type.getDescription(this.scene);
    const descLines: string[] = [];
    if (oldName) descLines.push(`[color=${rarityHex}]${oldName}[/color]`);
    if (taskText && taskText !== oldName) descLines.push(taskText);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: descLines.join("\n") });
    let rewardText = type.config?.questUnlockData?.rewardText;
    if (!rewardText && type.config?.questUnlockData) {
      rewardText = this.buildQuestRewardFallback(type.config.questUnlockData);
    }
    const formContainer = this.buildQuestFormRewardIcon(type.config?.questUnlockData, rewardText || "");
    if (formContainer) {
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipRewardHeader", { defaultValue: "REWARD" }),
        body: "",
        embeddedContainer: formContainer
      });
    } else if (rewardText) {
      const rewardContainer = this.buildQuestRewardStyledContainer(rewardText);
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipRewardHeader", { defaultValue: "REWARD" }),
        body: "",
        embeddedContainer: rewardContainer
      });
    }
    return sections;
  }

  private generateSkillTreeTokenTooltipSections(): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const THRESHOLD = 2;
    const owned = (this.scene as any).gameData?.activeSkillTree?.tokens ?? 0;
    const needed = Math.max(0, THRESHOLD - owned);
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: i18next.t("skillTree:descriptions.skillTreeTokensDescription", { defaultValue: "Collect 2 Skill Tree Tokens to activate the Skill Tree!" })
    });
    const rewardText = needed > 0
      ? i18next.t("skillTree:descriptions.skillTreeTokensReward", { defaultValue: "Owned {{owned}}. Get {{needed}} more to activate the skill tree!", owned, needed })
      : i18next.t("skillTree:descriptions.skillTreeTokensReady", { defaultValue: "Owned {{owned}}. Skill Tree ready to activate!", owned });
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipRewardHeader", { defaultValue: "REWARD" }),
      body: "",
      embeddedContainer: this.buildQuestRewardStyledContainer(rewardText)
    });
    return sections;
  }

  private buildQuestRewardFallback(data: QuestUnlockData): string {
    switch (data.rewardType) {
      case RewardType.GAME_MODE:
        return i18next.t("quests:rewardUnlocksGameMode", { defaultValue: "Unlocks a new game mode" });
      case RewardType.MODIFIER:
        return i18next.t("quests:rewardUnlocksModifier", { defaultValue: "Unlocks a new modifier" });
      case RewardType.PERMA_MODIFIER:
        return i18next.t("quests:rewardUnlocksPermaModifier", { defaultValue: "Unlocks a permanent modifier" });
      case RewardType.PERMA_MONEY:
        return i18next.t("quests:rewardGrantsPermaMoney", { defaultValue: "Grants Ω Gold" });
      case RewardType.PERMA_MONEY_AND_MODIFIER:
        return i18next.t("quests:rewardGrantsPermaMoneyAndModifier", { defaultValue: "Grants Ω Gold and unlocks a modifier" });
      case RewardType.NEW_MOVES_FOR_SPECIES:
        return i18next.t("quests:rewardUnlocksNewMoves", { defaultValue: "Unlocks new moves for a Pokémon" });
      case RewardType.GLITCH_FORM_A:
      case RewardType.GLITCH_FORM_B:
      case RewardType.GLITCH_FORM_C:
      case RewardType.GLITCH_FORM_D:
      case RewardType.GLITCH_FORM_E:
        return i18next.t("quests:rewardUnlocksGlitchForm", { defaultValue: "Unlocks a Glitch Form" });
      case RewardType.SMITTY_FORM:
      case RewardType.SMITTY_FORM_B:
        return i18next.t("quests:rewardUnlocksSmittyForm", { defaultValue: "Unlocks a Smitty Form" });
      case RewardType.UNLOCKABLE:
        return i18next.t("quests:rewardUnlocksContent", { defaultValue: "Unlocks new content" });
      default:
        return i18next.t("quests:rewardUnlocksContent", { defaultValue: "Unlocks new content" });
    }
  }

  private buildQuestFormRewardIcon(data?: QuestUnlockData, rewardText?: string): Phaser.GameObjects.Container | null {
    if (!data) return null;
    const formKey = FORBIDDEN_FORM_REWARDTYPE_TO_FORMKEY[data.rewardType];
    if (!formKey) return null;
    const speciesId = Array.isArray(data.rewardId) ? data.rewardId[0] : data.rewardId;
    if (typeof speciesId !== "number") return null;
    const species = getPokemonSpecies(speciesId);
    if (!species) return null;
    const formIndex = species.forms.findIndex(f => f.formKey === formKey);
    if (formIndex < 0) return null;
    const form = species.forms[formIndex];
    const atlasKey = form.getIconAtlasKey(formIndex, false, 0);
    const frameId = form.getIconId(false, formIndex, false, 0);
    const tooltipW = this.TOOLTIP_WIDTH;
    const container = this.scene.add.container(0, 0);
    let currentY = 0;
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    if (rewardText) {
      const padding = 6;
      const centerTextX = (tooltipW - padding * 2) / 2;
      const label = addTextObject(this.scene, centerTextX, currentY, rewardText, TextStyle.PARTY, { fontSize: "36px" });
      label.setOrigin(0.5, 0);
      label.setColor(rarityHex);
      label.setShadow(0, 0, undefined);
      label.setStroke("#1a1a2e", 10);
      label.setWordWrapWidth((tooltipW - padding * 2) / (label.scaleX || 0.1667));
      (label.style as any).align = "center";
      container.add(label);
      currentY += label.displayHeight + 3;
    }
    const centerX = (tooltipW - 12) / 2;
    const iconScale = adjustDuelmonIconScale(0.5, species.generation, isGlitchFormKey(formKey) || isSmittyFormKey(formKey));
    const icon = this.scene.add.sprite(centerX, currentY, atlasKey);
    if (!atlasKey.startsWith("pokemon_icons_mod_")) {
      icon.setFrame(frameId);
      if (icon.frame && icon.frame.name !== frameId) {
        icon.setFrame("smitom");
      }
    }
    icon.setScale(iconScale);
    icon.setOrigin(0.5, 0);
    icon.setTintFill(0x000000);
    container.add(icon);
    currentY += Math.ceil(icon.displayHeight) + 2;
    container.setData("renderedHeight", currentY);
    return container;
  }

  private buildQuestRewardStyledContainer(rewardText: string): Phaser.GameObjects.Container {
    const tooltipW = this.TOOLTIP_WIDTH;
    const padding = 6;
    const container = this.scene.add.container(0, 0);
    const centerTextX = (tooltipW - padding * 2) / 2;
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    const label = addTextObject(this.scene, centerTextX, 0, rewardText, TextStyle.PARTY, { fontSize: "36px" });
    label.setOrigin(0.5, 0);
    label.setColor(rarityHex);
    label.setShadow(0, 0, undefined);
    label.setStroke("#1a1a2e", 10);
    label.setWordWrapWidth((tooltipW - padding * 2) / (label.scaleX || 0.1667));
    (label.style as any).align = "center";
    container.add(label);
    container.setData("renderedHeight", label.displayHeight + 2);
    return container;
  }

  private generatePermaModifierTooltipSections(type: PermaModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });
    if ((type as any).getTooltipLore) {
      const lore = (type as any).getTooltipLore(this.scene);
      if (lore) {
        sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipRulesHeader", { defaultValue: "RULES" }), body: lore });
      }
    }
    return sections;
  }

  private generateChampionAbilityTooltipSections(type: TrainerBondAbilityModifierType | TeraAbilityModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const abilityId = (type as any).abilityId || (type as any).ability;
    if (abilityId != null) {
      const abilityData = allAbilities[abilityId];
      if (abilityData) {
        const abilityBody = `[color=#78c850]${abilityData.name}[/color]\n${abilityData.description || ""}`;
        sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" }), body: abilityBody });
      }
    }

    const party = this.scene.getParty() as PlayerPokemon[];
    const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
    const isPassiveType = type instanceof TeraAbilityModifierType;
    const partyGrid = this.buildPartySectionIconGrid(party, (pokemon) => {
      if (isPassiveType) {
        const currentPassive = pokemon.passive ? (allAbilities[(pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id]?.name || noneLabel) : noneLabel;
        const passiveColor = currentPassive === noneLabel ? "#888888" : "#78c850";
        return `[color=${passiveColor}]${currentPassive}[/color]`;
      }
      const currentAbility = pokemon.getAbility()?.name || noneLabel;
      return `[color=#78c850]${currentAbility}[/color]`;
    });
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" }), body: "", embeddedContainer: partyGrid });

    return sections;
  }

  private generateAbilitySwitcherTooltipBody(): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const descText = i18next.t("modifierType:ModifierType.AbilitySwitcherModifierType.description", { defaultValue: "Cycles through available abilities" });
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (const pokemon of party) {
      const { abilities, activeIndex } = this.getAbilityPool(pokemon);
      const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
      const otherAbilities = abilities
        .filter((_, i) => i !== activeIndex)
        .map(a => allAbilities[a]?.name || Abilities[a]);

      let line = `  [color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${activeAbility}[/color]`;
      if (otherAbilities.length > 0) {
        const greyAbilities = otherAbilities.map(a => `[color=#888888]${a}[/color]`).join(", ");
        line += `, ${greyAbilities}`;
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  private generateRankUpSelfTooltipSections(data: any): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: getBBCodeFrag(data.description || "", TextStyle.WINDOW, uiTheme)
    });

    if (data.abilities?.length) {
      const ability = data.abilities[0];
      const abilityText = ability
        ? `${getBBCodeFrag(ability.name, TextStyle.SUMMARY_GOLD, uiTheme)}\n${getBBCodeFrag(ability.description || "", TextStyle.WINDOW, uiTheme)}`
        : "";
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" }),
        body: abilityText
      });
    }

    const statBars = this.buildRankUpStatBarsContainer(data.baseStats, data.afterStats, data.deltaStats);
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipStatsHeader", { defaultValue: "STATS" }),
      body: "",
      embeddedContainer: statBars
    });

    return sections;
  }

  private generateRankUpOtherTooltipSections(data: any): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    const descTypeContainer = this.buildRankUpDescTypeContainer(data);
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: "",
      embeddedContainer: descTypeContainer
    });

    if (data.abilities?.length) {
      const abilityPageIdx = Math.min(this.tooltipSectionPageIndex, data.abilities.length - 1);
      const ability = data.abilities[abilityPageIdx];
      const abilityText = ability
        ? `${getBBCodeFrag(ability.name, TextStyle.SUMMARY_GOLD, uiTheme)}\n${getBBCodeFrag(ability.description || "", TextStyle.WINDOW, uiTheme)}`
        : "";
      const abilityLabel = data.abilities.length > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" })} (${abilityPageIdx + 1}/${data.abilities.length})`
        : i18next.t("modifierSelectUiHandler:tooltipAbilityHeader", { defaultValue: "ABILITY" });
      sections.push({
        label: abilityLabel,
        body: abilityText
      });
    }

    if (data.abilities?.length > 1) {
      const navRow = this.buildTooltipNavRow(
        Math.min(this.tooltipSectionPageIndex, data.abilities.length - 1),
        data.abilities.length
      );
      sections.push({ body: "", embeddedContainer: navRow });
    }

    if (data.afterStats?.length) {
      const statBars = this.buildRankUpStatBarsContainer(data.baseStats, data.afterStats, data.deltaStats);
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipStatsHeader", { defaultValue: "STATS" }),
        body: "",
        embeddedContainer: statBars
      });
    }

    return sections;
  }

  private buildRankUpDescTypeContainer(data: any): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 108;

    const descText = data.description || "";
    const descObj = addTextObject(this.scene, 4, 0, descText, TextStyle.WINDOW, { fontSize: "31px" });
    descObj.setOrigin(0, 0);
    const descScaleX = descObj.scaleX || 1;
    const descWrapWidth = Math.max(0, (tooltipWidth - 12) / descScaleX);
    descObj.setStyle({ ...(descObj.style as any), wordWrap: { width: descWrapWidth, useAdvancedWrap: true } } as any);
    descObj.setColor("#F0F0F0");
    container.add(descObj);

    const totalH = descObj.displayHeight + 3;
    container.setData("renderedHeight", totalH);
    return container;
  }

  private buildStatBoostBarsContainer(baseStats: number[], targetStat: Stat | Stat[], multiplier: number, pokemon?: any): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const children: Phaser.GameObjects.GameObject[] = [];
    const tooltipWidth = 108;
    const statBarHeight = 3;
    const statLineSpacing = 7;
    const statCount = 6;
    const iconZoneWidth = pokemon ? 14 : 0;
    const leftIndent = 4 + iconZoneWidth + (pokemon ? 2 : 0);
    const topGap = 5;

    const statNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "Atk" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "Def" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SpAtk" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SpDef" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "Spd" }),
    ];

    const BASE_BAR_COLOR = 0x4a90e2;
    const BOOST_BAR_COLOR = 0x00ff00;

    const labelWidth = 22;
    const barX = leftIndent + labelWidth + 3;
    const effectiveMaxBar = tooltipWidth - barX - leftIndent - 30;
    let bstSum = 0;

    for (let sIdx = 0; sIdx < statCount; sIdx++) {
      const sy = topGap + sIdx * statLineSpacing;
      const baseVal = baseStats[sIdx] ?? 0;
      const targetStats = Array.isArray(targetStat) ? targetStat : [targetStat];
      const delta = targetStats.includes(sIdx as Stat) ? Math.floor(baseVal * multiplier) : 0;
      const afterVal = baseVal + delta;
      bstSum += afterVal;

      const lbl = addTextObject(this.scene, leftIndent, sy + 3, statNames[sIdx], TextStyle.WINDOW, { fontSize: "35px" });
      lbl.setOrigin(0, 0.5);
      children.push(lbl);

      const baseBarWidth = Math.max(2, Math.min(effectiveMaxBar, (baseVal / 255) * effectiveMaxBar));
      const baseBar = this.scene.add.rectangle(barX, sy + 3, baseBarWidth, statBarHeight, BASE_BAR_COLOR);
      baseBar.setOrigin(0, 0.5);
      children.push(baseBar);

      let totalBarEnd = barX + baseBarWidth;

      if (delta > 0) {
        const boostBarWidth = Math.max(1, Math.min(effectiveMaxBar - baseBarWidth, (delta / 255) * effectiveMaxBar));
        const boostBar = this.scene.add.rectangle(barX + baseBarWidth, sy + 3, boostBarWidth, statBarHeight, BOOST_BAR_COLOR);
        boostBar.setOrigin(0, 0.5);
        children.push(boostBar);
        totalBarEnd = barX + baseBarWidth + boostBarWidth;
      }

      const valText = addTextObject(this.scene, totalBarEnd + 2, sy + 3, afterVal.toString(), TextStyle.WINDOW, { fontSize: "35px" });
      valText.setOrigin(0, 0.5);
      valText.setColor(delta > 0 ? "#78c850" : "#4a90e2");
      children.push(valText);

      if (delta > 0) {
        const deltaStr = `(${baseVal}+${delta})`;
        const deltaText = addTextObject(this.scene, totalBarEnd + 2 + valText.displayWidth + 2, sy + 3, deltaStr, TextStyle.WINDOW, { fontSize: "33px" });
        deltaText.setOrigin(0, 0.5);
        deltaText.setColor("#aaaaaa");
        children.push(deltaText);
      }
    }

    const beforeBstSum = baseStats.reduce((s, v) => s + (v || 0), 0);
    const bstDelta = bstSum - beforeBstSum;

    const bstY = topGap + statCount * statLineSpacing + 2;
    const bstLabel = addTextObject(this.scene, leftIndent, bstY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "35px" });
    bstLabel.setOrigin(0, 0.5);
    bstLabel.setColor("#cccccc");
    children.push(bstLabel);
    const bstValText = addTextObject(this.scene, leftIndent + bstLabel.displayWidth + 3, bstY, bstSum.toString(), TextStyle.WINDOW, { fontSize: "35px" });
    bstValText.setOrigin(0, 0.5);
    bstValText.setColor(bstDelta !== 0 ? "#78c850" : "#4a90e2");
    children.push(bstValText);
    if (bstDelta !== 0) {
      const bstDeltaSign = bstDelta > 0 ? "+" : "";
      const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
      const bstDeltaText = addTextObject(this.scene, bstValText.x + bstValText.displayWidth + 2, bstY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "33px" });
      bstDeltaText.setOrigin(0, 0.5);
      bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
      bstDeltaText.setAlpha(0.75);
      children.push(bstDeltaText);
    }

    container.add(children);

    if (pokemon) {
      const iconScale = 0.35;
      const iconContainer = this.scene.addPokemonIcon(pokemon, 4 + 7, 0, 0.5, 0, true);
      const gen = pokemon.species?.generation ?? pokemon.getSpeciesForm?.()?.generation ?? 0;
      const finalScale = adjustDuelmonIconScale(iconScale, gen, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);
      const iconCenterY = (topGap + bstY) / 2;
      this.centerPartyGridIcon(iconContainer, pokemon, iconCenterY, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", bstY + 8);
    return container;
  }

  private getAltBuildTooltipData(type: PokemonAltBuildModifierType): {
    speciesName?: string | null;
    formName?: string | null;
    description?: string;
    types?: Type[];
    abilities?: Abilities[];
    targetStats?: number[];
    targetTotal?: number;
    baseStats?: number[];
    baseTotal?: number;
  } | null {
    const build = (type as any).altBuild;
    const targetRank = (type as any).targetRank ?? 1;
    if (!build) {
      return null;
    }
    let baseStats: number[] | undefined;
    const party = this.scene.getParty();
    const target = party.find(p => p.species.speciesId === build.species);
    const species = build.species ? getPokemonSpecies(build.species) : null;
    if (target) {
      baseStats = target.getModifiedBaseStats();
    } else {
      if (species) {
        baseStats = [...species.baseStats];
      }
    }
    let targetStats: number[] | undefined;
    if (species && build.statFocus && baseStats) {
      targetStats = calculateAltBuildStatsWithSwapping([...baseStats], build.statFocus, targetRank);
    }
    const abilitySource = (targetRank >= 10 && build.finalAbilityReplacements)
      ? build.finalAbilityReplacements
      : build.abilityChanges;
    const abilities = (abilitySource || []).filter((a: Abilities) => a !== undefined && a !== null);
    const changedTypes = (build.typeChanges || []).filter((t: Type) => t !== undefined && t !== null);
    return {
      speciesName: species?.name || null,
      formName: ChampionUtils.getAltBuildDisplayName(build.id),
      description: type.getTooltipDescription(this.scene),
      types: changedTypes.length ? changedTypes : (species ? species.type : undefined),
      abilities,
      targetStats,
      targetTotal: targetStats ? targetStats.reduce((sum: number, s: number) => sum + s, 0) : undefined,
      baseStats,
      baseTotal: baseStats ? baseStats.reduce((sum: number, s: number) => sum + s, 0) : undefined,
    };
  }

  private generateStatBoostTooltipSections(descText: string, party: PlayerPokemon[], stat: Stat | Stat[], multiplier: number, championTypes?: Type[]): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme)
    });

    if (party.length > 0) {
      const pageSize = 1;
      const totalPages = Math.ceil(party.length / pageSize);
      const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
      const pokemon = party[page];
      const baseStats = pokemon.getModifiedBaseStats();

      let effectiveStats = Array.isArray(stat) ? [...stat] : [stat];
      if (championTypes && championTypes.length > 0 && effectiveStats.length > 1) {
        if (pokemon) {
          const hasTypeMatch = championTypes.some(ct => pokemon.isOfType(ct));
          if (!hasTypeMatch) {
            effectiveStats = [effectiveStats[0]];
          }
        }
      }

      const statBars = this.buildStatBoostBarsContainer(baseStats, effectiveStats, multiplier, pokemon);
      const headerLabel = totalPages > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" })} (${page + 1}/${totalPages})`
        : i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" });
      sections.push({ label: headerLabel, body: "", embeddedContainer: statBars });
      if (totalPages > 1) {
        const navRow = this.buildTooltipNavRow(page, totalPages);
        sections.push({ body: "", embeddedContainer: navRow });
      }
    }

    return sections;
  }

  private buildRankUpStatBarsContainer(baseStats: number[], afterStats: number[], deltaStats: number[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const children: Phaser.GameObjects.GameObject[] = [];
    const tooltipWidth = 108;
    const statBarHeight = 3;
    const statLineSpacing = 7;
    const statCount = Math.min(6, baseStats?.length ?? 0);
    const leftIndent = 4;
    const topGap = 5;

    const statNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "Atk" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "Def" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SpAtk" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SpDef" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "Spd" }),
    ];

    const BASE_BAR_COLOR = 0x4a90e2;
    const BOOST_BAR_COLOR = 0x00ff00;

    for (let sIdx = 0; sIdx < statCount; sIdx++) {
      const sy = topGap + sIdx * statLineSpacing;
      const baseVal = baseStats[sIdx] ?? 0;
      const afterVal = afterStats[sIdx] ?? 0;
      const delta = deltaStats?.[sIdx] ?? 0;

      const lbl = addTextObject(this.scene, leftIndent, sy + 3, statNames[sIdx], TextStyle.WINDOW, { fontSize: "35px" });
      lbl.setOrigin(0, 0.5);
      children.push(lbl);

      const lblW = lbl.displayWidth + 1;
      const barX = leftIndent + lblW;
      const effectiveMaxBar = Math.max(4, tooltipWidth - lblW - leftIndent - 30);

      const baseBarWidth = Math.max(2, Math.min(effectiveMaxBar, (baseVal / 255) * effectiveMaxBar));
      const baseBar = this.scene.add.rectangle(barX, sy + 3, baseBarWidth, statBarHeight, BASE_BAR_COLOR);
      baseBar.setOrigin(0, 0.5);
      children.push(baseBar);

      let boostBarWidth = 0;
      if (delta > 0) {
        boostBarWidth = Math.max(1, Math.min(effectiveMaxBar - baseBarWidth, (delta / 255) * effectiveMaxBar));
        const boostBar = this.scene.add.rectangle(barX + baseBarWidth, sy + 3, boostBarWidth, statBarHeight, BOOST_BAR_COLOR);
        boostBar.setOrigin(0, 0.5);
        children.push(boostBar);
      }

      const totalBarEnd = barX + baseBarWidth + boostBarWidth;
      const valText = addTextObject(this.scene, totalBarEnd + 2, sy + 3, afterVal.toString(), TextStyle.WINDOW, { fontSize: "35px" });
      valText.setOrigin(0, 0.5);
      valText.setColor("#4a90e2");
      children.push(valText);

      if (delta > 0) {
        const deltaStr = `(${baseVal}+${delta})`;
        const deltaText = addTextObject(this.scene, totalBarEnd + 2 + valText.displayWidth + 2, sy + 3, deltaStr, TextStyle.WINDOW, { fontSize: "28px" });
        deltaText.setOrigin(0, 0.5);
        deltaText.setColor("#aaaaaa");
        const maxDeltaW = tooltipWidth - (totalBarEnd + 2 + valText.displayWidth + 4);
        if (maxDeltaW > 0 && deltaText.displayWidth > maxDeltaW) {
          deltaText.setScale(deltaText.scaleX * (maxDeltaW / deltaText.displayWidth), deltaText.scaleY);
        }
        children.push(deltaText);
      }
    }

    const bstY = topGap + statCount * statLineSpacing + 2;
    const totalVal = (afterStats ?? []).reduce((sum: number, s: number) => sum + s, 0);
    const beforeBstSum = (baseStats ?? []).reduce((sum: number, s: number) => sum + s, 0);
    const bstDelta = totalVal - beforeBstSum;
    const totalLabel = addTextObject(this.scene, leftIndent, bstY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "35px" });
    totalLabel.setOrigin(0, 0);
    totalLabel.setColor("#cccccc");
    children.push(totalLabel);
    const totalValText = addTextObject(this.scene, leftIndent + totalLabel.displayWidth + 3, bstY, totalVal.toString(), TextStyle.WINDOW, { fontSize: "35px" });
    totalValText.setOrigin(0, 0);
    totalValText.setColor(bstDelta !== 0 ? "#78c850" : "#4a90e2");
    children.push(totalValText);
    if (bstDelta !== 0) {
      const bstDeltaSign = bstDelta > 0 ? "+" : "";
      const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
      const bstDeltaText = addTextObject(this.scene, totalValText.x + totalValText.displayWidth + 2, bstY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "33px" });
      bstDeltaText.setOrigin(0, 0);
      bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
      bstDeltaText.setAlpha(0.75);
      children.push(bstDeltaText);
    }

    for (const child of children) {
      container.add(child);
    }
    container.setData("renderedHeight", bstY + 8);
    return container;
  }

  private generateAbilitySwitcherTooltipSections(type: AbilitySwitcherModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const desc = type.getDescription(this.scene);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const party = this.scene.getParty() as PlayerPokemon[];
    const pageSize = 1;
    const totalPages = Math.ceil(party.length / pageSize);
    const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
    const startIdx = page * pageSize;
    const slice = party.slice(startIdx, startIdx + pageSize);

    const headerLabel = totalPages > 1
      ? `${i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" })} (${page + 1}/${totalPages})`
      : i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" });

    const partyGrid = this.buildAbilitySwitcherDetailedView(slice);
    sections.push({ label: headerLabel, body: "", embeddedContainer: partyGrid });

    if (totalPages > 1) {
      const navRow = this.buildTooltipNavRow(page, totalPages);
      sections.push({ body: "", embeddedContainer: navRow });
    }

    return sections;
  }

  private buildAbilitySwitcherVerticalGrid(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const COLS = 3;
    const colWidth = 36;
    const abilityLineH = 7;
    const iconScale = 0.35;
    const iconZoneWidth = 12;

    const rowHeights: number[] = [];
    const rows = Math.ceil(party.length / COLS);

    for (let row = 0; row < rows; row++) {
      let maxCellH = 14;
      for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        if (idx >= party.length) break;
        const { abilities } = this.getAbilityPool(party[idx]);
        const cellH = Math.max(14, abilities.length * abilityLineH + 2);
        maxCellH = Math.max(maxCellH, cellH);
      }
      rowHeights.push(maxCellH);
    }

    for (let i = 0; i < party.length; i++) {
      const pokemon = party[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * colWidth;
      const rowStartY = rowHeights.slice(0, row).reduce((a, b) => a + b, 0);
      const cellH = rowHeights[row];

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, cellX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);
      this.centerPartyGridIcon(iconContainer, pokemon, rowStartY + cellH / 2, finalScale);
      container.add(iconContainer);

      const { abilities, activeIndex } = this.getAbilityPool(pokemon);
      for (let a = 0; a < abilities.length; a++) {
        const name = allAbilities[abilities[a]]?.name || "???";
        const color = a === activeIndex ? "#78c850" : "#888888";
        const text = addBBCodeTextObject(this.scene, cellX + iconZoneWidth + 2, rowStartY + a * abilityLineH + 1,
          `[color=${color}]${name}[/color]`, TextStyle.WINDOW, { fontSize: "28px" });
        text.setOrigin(0, 0);
        const maxW = colWidth - iconZoneWidth - 4;
        if (text.displayWidth > maxW && maxW > 0) {
          text.setScale(text.scaleX * (maxW / text.displayWidth), text.scaleY);
        }
        container.add(text);
      }
    }

    const totalH = rowHeights.reduce((a, b) => a + b, 0);
    container.setData("renderedHeight", totalH);
    return container;
  }

  private buildAbilitySwitcherDetailedView(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 120;
    const padding = 4;
    const textX = padding;
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    let currentY = 0;

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(textX, currentY, tooltipWidth - padding, currentY);
        container.add(divLine);
        currentY += 7;
      }

      const blockStartY = currentY;
      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, textX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const { abilities, activeIndex } = this.getAbilityPool(pokemon);
      const contentLeft = textX + iconZoneWidth + 2;
      const wrapWidth = (tooltipWidth - padding * 2 - iconZoneWidth - 4) * 6;

      for (let a = 0; a < abilities.length; a++) {
        const ab = allAbilities[abilities[a]];
        const abName = ab?.name || "???";
        const abDesc = ab?.description || "";
        const isActive = a === activeIndex;

        if (a > 0) {
          currentY += 2;
        }

        const nameText = addTextObject(this.scene, contentLeft, currentY, abName, TextStyle.WINDOW, { fontSize: "41px" });
        nameText.setOrigin(0, 0);
        nameText.setColor(isActive ? "#78c850" : "#ffdd57");
        container.add(nameText);
        currentY += nameText.displayHeight + 1;

        if (abDesc) {
          const descText = addTextObject(this.scene, contentLeft, currentY, abDesc, TextStyle.WINDOW, { fontSize: "41px", wordWrap: { width: wrapWidth } });
          descText.setOrigin(0, 0);
          descText.setColor("#F0F0F0");
          container.add(descText);
          currentY += descText.displayHeight + 2;
        }
      }

      this.centerPartyGridIcon(iconContainer, pokemon, blockStartY + 6, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", currentY);
    return container;
  }

  private buildCurrentAbilityDetailedView(party: PlayerPokemon[], isPassive: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 120;
    const padding = 4;
    const textX = padding;
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    let currentY = 0;

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(textX, currentY, tooltipWidth - padding, currentY);
        container.add(divLine);
        currentY += 7;
      }

      const blockStartY = currentY;
      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, textX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const contentLeft = textX + iconZoneWidth + 2;
      const wrapWidth = (tooltipWidth - padding * 2 - iconZoneWidth - 4) * 6;

      let abilityId: Abilities;
      if (isPassive) {
        if (pokemon.hasPassive()) {
          abilityId = (pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id || Abilities.NONE;
        } else {
          abilityId = Abilities.NONE;
        }
      } else {
        abilityId = pokemon.getAbility()?.id || Abilities.NONE;
      }

      const ab = allAbilities[abilityId];
      const abName = ab?.name || i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
      const abDesc = ab?.description || "";
      const hasAbility = abilityId !== Abilities.NONE && ab;

      const nameText = addTextObject(this.scene, contentLeft, currentY, abName, TextStyle.WINDOW, { fontSize: "41px" });
      nameText.setOrigin(0, 0);
      nameText.setColor(hasAbility ? "#78c850" : "#888888");
      container.add(nameText);
      currentY += nameText.displayHeight + 1;

      if (abDesc) {
        const descText = addTextObject(this.scene, contentLeft, currentY, abDesc, TextStyle.WINDOW, { fontSize: "41px", wordWrap: { width: wrapWidth } });
        descText.setOrigin(0, 0);
        descText.setColor("#F0F0F0");
        container.add(descText);
        currentY += descText.displayHeight + 2;
      }

      this.centerPartyGridIcon(iconContainer, pokemon, blockStartY + 6, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", currentY);
    return container;
  }

  private generateStatSwitcherTooltipBody(stat1: Stat, stat2: Stat): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const stat1Name = getStatName(stat1, true);
    const stat2Name = getStatName(stat2, true);
    const descText = i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.description", {
      stat1: stat1Name,
      stat2: stat2Name,
      defaultValue: `Swaps ${stat1Name} and ${stat2Name}`
    });
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (const pokemon of party) {
      const baseStats = pokemon.getModifiedBaseStats();
      const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
      const stat1Value = baseStats[stat1];
      const stat2Value = baseStats[stat2];
      const statValues = statOrder.map(stat => {
        const value = baseStats[stat];
        const name = getStatName(stat, true);
        if (stat !== stat1 && stat !== stat2) {
          return `${name}: ${value}`;
        }
        if (stat1Value === stat2Value) {
          return `[color=#e8e8a8]${name}: ${value}[/color]`;
        }
        const isHigher = stat === stat1 ? stat1Value > stat2Value : stat2Value > stat1Value;
        const color = isHigher ? "#78c850" : "#e13d3d";
        return `[color=${color}]${name}: ${value}[/color]`;
      }).join(" | ");

      lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: ${statValues}`);
    }

    return lines.join('\n');
  }

  private getSacrificePayload(pokemon: PlayerPokemon, sacrificeType: string): string {
    const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
    switch (sacrificeType) {
      case 'Move':
        const moves = pokemon.getMoveset().filter(m => m).map(m => m!.getName()).join(", ");
        const movesetLabel = i18next.t("pokemonInfoContainer:moveset", { defaultValue: "Moveset" });
        return `${movesetLabel}: ${moves}`;
      case 'Ability':
        const abilityLabel = i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
        return `${abilityLabel} [color=#78c850]${pokemon.getAbility()?.name || noneLabel}[/color]`;
      case 'Passive':
        const activeAbilityForPassive = pokemon.getAbility()?.name || noneLabel;
        const passiveAbility = pokemon.passive ? (allAbilities[(pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id]?.name || noneLabel) : noneLabel;
        const abilityLabelPassive = i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
        const activeColor = activeAbilityForPassive === noneLabel ? '#888888' : '#78c850';
        const passiveColor = passiveAbility === noneLabel ? '#888888' : '#78c850';
        return `${abilityLabelPassive} [color=${activeColor}]${activeAbilityForPassive}[/color] | [color=${passiveColor}]${passiveAbility}[/color]`;
      case 'Type':
        const pokemonTypes = pokemon.getTypes();
        const types = pokemonTypes.filter(t => t !== Type.UNKNOWN).map(t => `[color=#00bfff]${this.getLocalizedTypeName(t)}[/color]`).join("/");
        const typesLabel = i18next.t("skillTree:descriptions.altBuildTypes", { defaultValue: "Types:" });
        return `${typesLabel} ${types}`;
      case 'Stat':
        const baseStats = pokemon.getModifiedBaseStats();
        const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
        const statValues = statOrder.map(stat => `${getStatName(stat, true)}: ${baseStats[stat]}`).join(" | ");
        const statsLabel = i18next.t("skillTree:descriptions.altBuildStats", { defaultValue: "Stats:" });
        return `${statsLabel} ${statValues}`;
      default:
        return '';
    }
  }

  private formatEssenceDisplay(pokemon: PlayerPokemon): string {
    const essenceData = this.getEssenceDataForPokemon(pokemon);
    const freeLabel = i18next.t("skillTree:nodeCostFree", { defaultValue: "FREE!" });

    let essenceStr = `Essence ${essenceData.total}`;
    if (essenceData.total >= 4) {
      essenceStr += ` [color=#78c850]${freeLabel}[/color]`;
    }

    return essenceStr;
  }

  private generateSacrificeTooltipBody(sacrificeType: string, stat?: Stat): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const sacrificeLocaleKey = sacrificeType === "Passive"
      ? "PassiveAbilitySacrificeModifierType"
      : `${sacrificeType}SacrificeModifierType`;
    const descText = i18next.t(`modifierType:ModifierType.${sacrificeLocaleKey}.description`, {
      defaultValue: "Sacrifice a party member to transfer their attributes",
      ...(sacrificeType === "Stat" && stat !== undefined ? { stat: getStatName(stat) } : {})
    });
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));
    lines.push(getBBCodeFrag(i18next.t("modifierType:common.essenceAlternativeCost"), TextStyle.WINDOW, uiTheme));

    lines.push('');
    const candidatesLabel = i18next.t("modifierSelectUiHandler:sacrificeCandidates", { defaultValue: "Candidates" });
    lines.push(getBBCodeFrag(`${candidatesLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (let i = 0; i < party.length; i++) {
      const pokemon = party[i];
      const payload = this.getSacrificePayload(pokemon, sacrificeType);
      const essenceDisplay = this.formatEssenceDisplay(pokemon);

      if (sacrificeType === "Ability") {
        const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
        const abilityName = pokemon.getAbility()?.name || noneLabel;
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${abilityName}[/color] (${essenceDisplay})`);
        continue;
      }
      if (sacrificeType === "Type") {
        const pokemonTypes = pokemon.getTypes();
        const types = pokemonTypes
          .filter(t => t !== Type.UNKNOWN)
          .map(t => `[color=#00bfff]${this.getLocalizedTypeName(t)}[/color]`)
          .join("/");
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: ${types} (${essenceDisplay})`);
        continue;
      }
      if (sacrificeType === "Passive") {
        const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });
        const activeAbility = pokemon.getAbility()?.name || noneLabel;
        const passiveAbility = pokemon.passive ? (allAbilities[(pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id]?.name || noneLabel) : noneLabel;
        const activeColor = activeAbility === noneLabel ? "#888888" : "#78c850";
        const passiveColor = passiveAbility === noneLabel ? "#888888" : "#78c850";
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=${activeColor}]${activeAbility}[/color] | [color=${passiveColor}]${passiveAbility}[/color] (${essenceDisplay})`);
        continue;
      }
      lines.push(`  [color=#ffcc00]${pokemon.name}[/color] (${essenceDisplay}):`);
      if (payload) {
        lines.push(`    ${payload}`);
      }
    }

    return lines.join('\n');
  }

  private generateSacrificeTooltipSections(sacrificeType: string): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    const sacrificeLocaleKey = sacrificeType === "Passive"
      ? "PassiveAbilitySacrificeModifierType"
      : `${sacrificeType}SacrificeModifierType`;
    const descText = i18next.t(`modifierType:ModifierType.${sacrificeLocaleKey}.description`, {
      defaultValue: "Sacrifice a party member to transfer their attributes"
    });
    const essenceLine = i18next.t("modifierType:common.essenceAlternativeCost");
    const descBody = getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme) + "\n" + getBBCodeFrag(essenceLine, TextStyle.WINDOW, uiTheme);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: descBody });

    const party = this.scene.getParty() as PlayerPokemon[];

    if (sacrificeType === "Ability" || sacrificeType === "Move" || sacrificeType === "Passive") {
      const pageSize = sacrificeType === "Passive" ? 1 : 2;
      const totalPages = Math.ceil(party.length / pageSize);
      const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
      const startIdx = page * pageSize;
      const slice = party.slice(startIdx, startIdx + pageSize);

      const candidatesHeader = totalPages > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipCandidatesHeader", { defaultValue: "CANDIDATES" })} (${page + 1}/${totalPages})`
        : i18next.t("modifierSelectUiHandler:tooltipCandidatesHeader", { defaultValue: "CANDIDATES" });

      if (sacrificeType === "Move") {
        const partyGrid = this.buildPartySectionIconGridWithMovesVertical(slice);
        sections.push({ label: candidatesHeader, body: "", embeddedContainer: partyGrid });
      } else if (sacrificeType === "Passive") {
        const partyGrid = this.buildPartySectionWithAbilityAndPassiveView(slice);
        sections.push({ label: candidatesHeader, body: "", embeddedContainer: partyGrid });
      } else {
        const partyGrid = this.buildPartySectionWithAbilityView(slice);
        sections.push({ label: candidatesHeader, body: "", embeddedContainer: partyGrid });
      }
      if (totalPages > 1) {
        const navRow = this.buildTooltipNavRow(page, totalPages);
        sections.push({ body: "", embeddedContainer: navRow });
      }
    } else if (sacrificeType === "Type") {
      const candidatesLabel = i18next.t("modifierSelectUiHandler:tooltipCandidatesHeader", { defaultValue: "CANDIDATES" });
      const partyGrid = this.buildPartySectionIconGridWithTypesAndEssence(party);
      sections.push({ label: candidatesLabel, body: "", embeddedContainer: partyGrid });
    } else {
      const candidatesLabel = i18next.t("modifierSelectUiHandler:tooltipCandidatesHeader", { defaultValue: "CANDIDATES" });
      const partyGrid = this.buildPartySectionIconGridWithEssenceOverlay(party, (pokemon) => {
        return "";
      });
      sections.push({ label: candidatesLabel, body: "", embeddedContainer: partyGrid });
    }

    return sections;
  }

  private buildPartySectionIconGridWithTypesAndEssence(
    party: PlayerPokemon[]
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const COLS = 3;
    const colWidth = 36;
    const rowHeight = 16;
    const iconScale = 0.35;
    const iconZoneWidth = 12;

    for (let i = 0; i < party.length; i++) {
      const pokemon = party[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * colWidth;
      const cellY = row * rowHeight;
      const rowCenterY = cellY + rowHeight / 2;

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, cellX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);
      this.centerPartyGridIcon(iconContainer, pokemon, rowCenterY, finalScale);
      container.add(iconContainer);

      const types = pokemon.getTypes().filter((t: any) => t !== Type.UNKNOWN);
      const typeStartX = cellX + iconZoneWidth + 2;

      if (types.length === 1) {
        const frame = Type[types[0]]?.toLowerCase() || "unknown";
        const spr = this.scene.add.sprite(typeStartX, rowCenterY, "pbinfo_enemy_type", frame);
        spr.setScale(0.35);
        spr.setOrigin(0, 0.5);
        container.add(spr);
      } else if (types.length >= 2) {
        const frame0 = Type[types[0]]?.toLowerCase() || "unknown";
        const frame1 = Type[types[1]]?.toLowerCase() || "unknown";
        const spr1 = this.scene.add.sprite(typeStartX, rowCenterY, "pbinfo_enemy_type1", frame0);
        spr1.setScale(0.35);
        spr1.setOrigin(0, 1);
        container.add(spr1);
        const spr2 = this.scene.add.sprite(typeStartX, rowCenterY, "pbinfo_enemy_type2", frame1);
        spr2.setScale(0.35);
        spr2.setOrigin(0, 0);
        container.add(spr2);
      }

      const essenceData = this.getEssenceDataForPokemon(pokemon);
      const essenceX = cellX + colWidth - 6;
      const essenceIcon = this.scene.add.sprite(essenceX, rowCenterY - 4, "smitems", "modSoulCollected");
      essenceIcon.setScale(0.17);
      essenceIcon.setOrigin(0.5, 0.5);
      container.add(essenceIcon);

      const essenceStr = essenceData.total >= 4 ? "FREE" : `${essenceData.total}/4`;
      const essenceText = addTextObject(
        this.scene, essenceX, rowCenterY + 2, essenceStr, TextStyle.PERFECT_IV, { fontSize: "28px" }
      );
      essenceText.setColor("#E8E8E8");
      essenceText.setStroke("#424242", 14);
      essenceText.setShadow(0, 0, undefined);
      essenceText.setOrigin(0.5, 0.5);
      container.add(essenceText);
    }

    const rowCount = Math.ceil(party.length / COLS);
    container.setData("renderedHeight", rowCount * rowHeight);
    return container;
  }

  private buildPartySectionIconGridWithEssenceOverlay(
    party: PlayerPokemon[],
    labelFormatter: (pokemon: PlayerPokemon) => string
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const COLS = 2;
    const colWidth = 54;
    const rowHeight = 16;
    const iconScale = 0.35;
    const iconZoneWidth = 12;

    for (let i = 0; i < party.length; i++) {
      const pokemon = party[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * colWidth;
      const cellY = row * rowHeight;
      const rowCenterY = cellY + rowHeight / 2;

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, cellX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);
      this.centerPartyGridIcon(iconContainer, pokemon, rowCenterY, finalScale);
      container.add(iconContainer);

      const label = labelFormatter(pokemon);
      if (label) {
        const labelText = addTextObject(
          this.scene, cellX + iconZoneWidth + 2, rowCenterY, label, TextStyle.WINDOW, { fontSize: "28px" }
        );
        labelText.setOrigin(0, 0.5);
        const essenceReserve = 12;
        const maxLabelW = colWidth - iconZoneWidth - 2 - essenceReserve;
        if (labelText.displayWidth > maxLabelW && maxLabelW > 0) {
          labelText.setScale(labelText.scaleX * (maxLabelW / labelText.displayWidth), labelText.scaleY);
        }
        container.add(labelText);
      }

      const essenceData = this.getEssenceDataForPokemon(pokemon);
      const essenceX = cellX + colWidth - 8;
      const essenceIcon = this.scene.add.sprite(essenceX, rowCenterY - 4, "smitems", "modSoulCollected");
      essenceIcon.setScale(0.17);
      essenceIcon.setOrigin(0.5, 0.5);
      container.add(essenceIcon);

      const essenceStr = essenceData.total >= 4 ? "FREE" : `${essenceData.total}/4`;
      const essenceText = addTextObject(
        this.scene, essenceX, rowCenterY + 2, essenceStr, TextStyle.PERFECT_IV, { fontSize: "28px" }
      );
      essenceText.setColor("#E8E8E8");
      essenceText.setStroke("#424242", 14);
      essenceText.setShadow(0, 0, undefined);
      essenceText.setOrigin(0.5, 0.5);
      container.add(essenceText);
    }

    const rowCount = Math.ceil(party.length / COLS);
    container.setData("renderedHeight", rowCount * rowHeight);
    return container;
  }

  private buildPartySectionIconGridWithMovesVertical(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 120;
    const padding = 4;
    const textX = padding;
    const rowPitch = 9;
    const typeAtlasKey = Utils.getLocalizedSpriteKey("types");
    const qsPowLabel = i18next.t("modifierSelectUiHandler:secondaryLabelPow", { defaultValue: "POW" });
    const qsAccLabel = i18next.t("modifierSelectUiHandler:secondaryLabelAcc", { defaultValue: "ACC" });
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    let currentY = 0;

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        currentY += 1;
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(textX, currentY, tooltipWidth - padding - 4, currentY);
        container.add(divLine);
        currentY += 7;
      }

      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, textX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const blockStartY = currentY;
      const contentLeft = textX + iconZoneWidth + 2;
      const maxMoveW = tooltipWidth - padding - contentLeft - 2;

      const ability = pokemon.getAbility();
      const abilityName = ability?.name || "???";
      const abilityDesc = ability?.description || "";

      const abilityNameText = addTextObject(this.scene, contentLeft, currentY, abilityName, TextStyle.WINDOW, { fontSize: "41px" });
      abilityNameText.setOrigin(0, 0);
      abilityNameText.setColor("#78c850");
      container.add(abilityNameText);
      currentY += abilityNameText.displayHeight + 1;

      if (abilityDesc) {
        const wrapWidth = (tooltipWidth - padding * 2 - iconZoneWidth - 4) * 6;
        const descText = addTextObject(this.scene, contentLeft, currentY, abilityDesc, TextStyle.WINDOW, { fontSize: "41px", wordWrap: { width: wrapWidth } });
        descText.setOrigin(0, 0);
        descText.setColor("#F0F0F0");
        container.add(descText);
        currentY += descText.displayHeight + 2;
      }

      const moveset = pokemon.getMoveset();
      const moveStartY = currentY;

      for (let i = 0; i < 4; i++) {
        const rowY = currentY + i * rowPitch;
        const slot = moveset[i];
        if (!slot) {
          const emptyText = addTextObject(this.scene, contentLeft, rowY + 2, "\u2014", TextStyle.WINDOW, { fontSize: "28px" });
          emptyText.setOrigin(0, 0);
          container.add(emptyText);
          continue;
        }
        const move = slot.getMove(true);
        const moveType = pokemon.getMoveType(move);
        let typeIconWidth = 0;
        if (this.scene.textures.exists(typeAtlasKey)) {
          const typeFrame = Type[moveType]?.toLowerCase() || "unknown";
          const typeIcon = this.scene.add.sprite(contentLeft, rowY + 4, typeAtlasKey, typeFrame);
          typeIcon.setScale(0.32);
          typeIcon.setOrigin(0, 0.5);
          container.add(typeIcon);
          typeIconWidth = typeIcon.displayWidth + 2;
        }
        const moveNameText = addTextObject(this.scene, contentLeft + typeIconWidth, rowY + 1, slot.getName(), TextStyle.WINDOW, { fontSize: "31px" });
        moveNameText.setOrigin(0, 0);
        container.add(moveNameText);

        const power = move.power;
        const accuracy = move.accuracy;
        const powStr = power >= 0 ? power.toString() : "---";
        const accStr = accuracy >= 0 ? `${accuracy}` : "---";
        const powAccStr = `${qsPowLabel}:${powStr} ${qsAccLabel}:${accStr}`;
        const powAccText = addTextObject(this.scene, contentLeft + typeIconWidth + moveNameText.displayWidth + 3, rowY + 1, powAccStr, TextStyle.WINDOW, { fontSize: "31px" });
        powAccText.setOrigin(0, 0);
        powAccText.setColor("#CCCCCC");
        powAccText.setShadow(0, 0, undefined);
        container.add(powAccText);

        const combinedW = typeIconWidth + moveNameText.displayWidth + 3 + powAccText.displayWidth;
        if (combinedW > maxMoveW && maxMoveW > 0) {
          const scale = maxMoveW / combinedW;
          moveNameText.setScale(moveNameText.scaleX * scale, moveNameText.scaleY);
          powAccText.setScale(powAccText.scaleX * scale, powAccText.scaleY);
          powAccText.setX(contentLeft + typeIconWidth + moveNameText.displayWidth + 3);
        }
      }

      currentY += 4 * rowPitch + 2;
      const iconCenterY = (blockStartY + currentY) / 2;
      this.centerPartyGridIcon(iconContainer, pokemon, iconCenterY, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", currentY);
    return container;
  }

  private buildPartySectionWithAbilityView(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 120;
    const padding = 4;
    const textX = padding;
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    let currentY = 0;

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        currentY += 1;
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(textX, currentY, tooltipWidth - padding - 4, currentY);
        container.add(divLine);
        currentY += 7;
      }

      const blockStartY = currentY;
      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, textX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const ability = pokemon.getAbility();
      const abilityName = ability?.name || "None";
      const abilityDesc = ability?.description || "";

      const abilityNameText = addTextObject(this.scene, textX + iconZoneWidth + 2, currentY, abilityName, TextStyle.WINDOW, { fontSize: "41px" });
      abilityNameText.setOrigin(0, 0);
      abilityNameText.setColor("#ffdd57");
      container.add(abilityNameText);
      currentY += abilityNameText.displayHeight + 1;

      if (abilityDesc) {
        const wrapWidth = (tooltipWidth - padding * 2 - iconZoneWidth - 4) * 6;
        const descText = addTextObject(this.scene, textX + iconZoneWidth + 2, currentY, abilityDesc, TextStyle.WINDOW, { fontSize: "41px", wordWrap: { width: wrapWidth } });
        descText.setOrigin(0, 0);
        descText.setColor("#F0F0F0");
        container.add(descText);
        currentY += descText.displayHeight + 2;
      }

      const iconCenterY = (blockStartY + currentY) / 2;
      this.centerPartyGridIcon(iconContainer, pokemon, iconCenterY, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", currentY);
    return container;
  }

  private buildPartySectionWithAbilityAndPassiveView(party: PlayerPokemon[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tooltipWidth = 120;
    const padding = 4;
    const textX = padding;
    const iconScale = 0.35;
    const iconZoneWidth = 14;
    let currentY = 0;
    const noneLabel = i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" });

    for (let p = 0; p < party.length; p++) {
      const pokemon = party[p];
      if (p > 0) {
        const divLine = this.scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(textX, currentY, tooltipWidth - padding, currentY);
        container.add(divLine);
        currentY += 7;
      }

      const blockStartY = currentY;
      const iconContainer = (this.scene as any).addPokemonIcon(pokemon, textX + iconZoneWidth / 2, 0, 0.5, 0, true);
      const finalScale = adjustDuelmonIconScale(iconScale, pokemon.species.generation, pokemon.isGlitchOrSmittyForm?.());
      iconContainer.setScale(finalScale);

      const contentLeft = textX + iconZoneWidth + 2;
      const wrapWidth = (tooltipWidth - padding * 2 - iconZoneWidth - 4) * 6;

      const activeAbility = pokemon.getAbility();
      const activeName = activeAbility?.name || noneLabel;
      const activeDesc = activeAbility?.description || "";
      const hasActive = activeAbility && activeAbility.id !== Abilities.NONE;

      const activeLabel = addTextObject(this.scene, contentLeft, currentY, activeName, TextStyle.WINDOW, { fontSize: "41px" });
      activeLabel.setOrigin(0, 0);
      activeLabel.setColor(hasActive ? "#78c850" : "#888888");
      container.add(activeLabel);
      currentY += activeLabel.displayHeight + 1;

      if (activeDesc) {
        const activeDescText = addTextObject(this.scene, contentLeft, currentY, activeDesc, TextStyle.WINDOW, { fontSize: "41px", wordWrap: { width: wrapWidth } });
        activeDescText.setOrigin(0, 0);
        activeDescText.setColor("#F0F0F0");
        container.add(activeDescText);
        currentY += activeDescText.displayHeight + 2;
      }

      let passiveName = noneLabel;
      let passiveDesc = "";
      let hasPassiveAbility = false;
      if (pokemon.hasPassive()) {
        const passiveId = (pokemon as any).altPassiveForRun || pokemon.getPassiveAbility()?.id || Abilities.NONE;
        const passiveAb = allAbilities[passiveId];
        if (passiveAb && passiveId !== Abilities.NONE) {
          passiveName = passiveAb.name;
          passiveDesc = passiveAb.description || "";
          hasPassiveAbility = true;
        }
      }

      const passiveHeaderText = addTextObject(this.scene, contentLeft, currentY, `Passive: ${passiveName}`, TextStyle.WINDOW, { fontSize: "38px" });
      passiveHeaderText.setOrigin(0, 0);
      passiveHeaderText.setColor(hasPassiveAbility ? "#aa55ff" : "#888888");
      container.add(passiveHeaderText);
      currentY += passiveHeaderText.displayHeight + 1;

      if (passiveDesc) {
        const passiveDescText = addTextObject(this.scene, contentLeft, currentY, passiveDesc, TextStyle.WINDOW, { fontSize: "34px", wordWrap: { width: wrapWidth } });
        passiveDescText.setOrigin(0, 0);
        passiveDescText.setColor("#d0d0d0");
        container.add(passiveDescText);
        currentY += passiveDescText.displayHeight + 2;
      }

      this.centerPartyGridIcon(iconContainer, pokemon, blockStartY + 6, finalScale);
      container.add(iconContainer);
    }

    container.setData("renderedHeight", currentY);
    return container;
  }

  private generateEssenceTooltipBody(): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const descText = i18next.t("modifierType:ModifierType.ESSENCE.description", {
      defaultValue: "Collected essences from defeated Pokémon"
    });
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (const pokemon of party) {
      const essenceData = this.getEssenceDataForPokemon(pokemon);

      let essenceStr = `[color=#ffcc00]${pokemon.name}[/color]: ${essenceData.total} total`;

      if (essenceData.byType.size > 0) {
        const breakdown = Array.from(essenceData.byType.entries())
          .filter(([_, count]) => count > 0)
          .map(([type, count]) => `${this.getLocalizedTypeName(type)}: ${count}`)
          .join(", ");
        if (breakdown) {
          lines.push(`  ${essenceStr}`);
          lines.push(`    (${breakdown})`);
        } else {
          lines.push(`  ${essenceStr}`);
        }
      } else {
        lines.push(`  ${essenceStr}`);
      }
    }

    return lines.join('\n');
  }

  private generateEvolutionItemTooltipBody(type: EvolutionItemModifierType): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const descText = type.getDescription(this.scene);
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const applicableLabel = i18next.t("modifierSelectUiHandler:applicable", { defaultValue: "Applicable" });

    for (const pokemon of party) {
      if (pokemon.pauseEvolutions) {
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`);
        continue;
      }

      const matches: any[] = [];
      const currentFormKey = pokemon.getFormKey();
      const item = type.evolutionItem;

      const directEvos = (pokemonEvolutions as any)[pokemon.species.speciesId] || [];
      if (currentFormKey !== SpeciesFormKey.GIGANTAMAX) {
        matches.push(...directEvos.filter((e: any) =>
          e.item === item &&
          (!e.condition || e.condition.predicate(pokemon)) &&
          (e.preFormKey === null || e.preFormKey === currentFormKey)
        ));
      }

      if (matches.length === 0 && pokemon.isFusion() && pokemon.fusionSpecies) {
        const fusionFormKey = pokemon.getFusionFormKey();
        const fusionEvos = (pokemonEvolutions as any)[pokemon.fusionSpecies.speciesId] || [];
        if (fusionFormKey !== SpeciesFormKey.GIGANTAMAX) {
          matches.push(...fusionEvos.filter((e: any) =>
            e.item === item &&
            (!e.condition || e.condition.predicate(pokemon)) &&
            (e.preFormKey === null || e.preFormKey === fusionFormKey)
          ));
        }
      }

      if (matches.length > 0) {
        const targets = Array.from(new Set(matches.map((e: any) => {
          const species = getPokemonSpecies(e.speciesId);
          const name = species?.name || `${e.speciesId}`;
          return e.evoFormKey ? `${name} (${e.evoFormKey})` : name;
        }))).join(" / ");
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${applicableLabel}[/color] → ${targets}`);
      } else {
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`);
      }
    }

    return lines.join('\n');
  }

  private generateFormChangeTooltipBody(type: FormChangeItemModifierType): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const descText = type.getDescription(this.scene);
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const applicableLabel = i18next.t("modifierSelectUiHandler:applicable", { defaultValue: "Applicable" });

    for (const pokemon of party) {
      const formChanges = pokemonFormChanges[pokemon.species.speciesId] || [];
      const formChangeItem = type.formChangeItems?.[0];
      const applicable = formChanges.some(fc => {
        const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
        return itemTrigger && itemTrigger.item === formChangeItem;
      });

      if (applicable) {
        const targetForm = formChanges.find(fc => {
          const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
          return itemTrigger && itemTrigger.item === formChangeItem;
        });
        const formKey = targetForm?.formKey || 'Unknown';
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${applicableLabel}[/color] → ${formKey}`);
      } else {
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`);
      }
    }

    return lines.join('\n');
  }

  private generateEvolutionTooltipSections(type: EvolutionItemModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const party = this.scene.getParty() as PlayerPokemon[];
    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const applicableLabel = i18next.t("modifierSelectUiHandler:applicable", { defaultValue: "Applicable" });
    const item = type.evolutionItem;

    const partyGrid = this.buildPartySectionIconGrid(party, (pokemon) => {
      if ((pokemon as any).isEvolutionLocked?.() === true || (pokemon as any).isSignature === true || !!(pokemon as any).altBuildId) {
        return `[color=#888888]${noEffectLabel}[/color]`;
      }
      if (pokemon.pauseEvolutions) {
        return `[color=#888888]${noEffectLabel}[/color]`;
      }
      const matches: any[] = [];
      const currentFormKey = pokemon.getFormKey();
      const directEvos = (pokemonEvolutions as any)[pokemon.species.speciesId] || [];
      if (currentFormKey !== SpeciesFormKey.GIGANTAMAX) {
        matches.push(...directEvos.filter((e: any) =>
          e.item === item &&
          (!e.condition || e.condition.predicate(pokemon)) &&
          (e.preFormKey === null || e.preFormKey === currentFormKey)
        ));
      }
      if (matches.length === 0 && pokemon.isFusion() && pokemon.fusionSpecies) {
        const fusionFormKey = pokemon.getFusionFormKey();
        const fusionEvos = (pokemonEvolutions as any)[pokemon.fusionSpecies.speciesId] || [];
        if (fusionFormKey !== SpeciesFormKey.GIGANTAMAX) {
          matches.push(...fusionEvos.filter((e: any) =>
            e.item === item &&
            (!e.condition || e.condition.predicate(pokemon)) &&
            (e.preFormKey === null || e.preFormKey === fusionFormKey)
          ));
        }
      }
      if (matches.length > 0) {
        const targets = Array.from(new Set(matches.map((e: any) => {
          const species = getPokemonSpecies(e.speciesId);
          const name = species?.name || `${e.speciesId}`;
          return e.evoFormKey ? `${name} (${e.evoFormKey})` : name;
        }))).join(" / ");
        return `[color=#78c850]\u2713[/color]`;
      }
      return `[color=#888888]\u2717[/color]`;
    });
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" }), body: "", embeddedContainer: partyGrid });

    return sections;
  }

  private generateFormChangeTooltipSections(type: FormChangeItemModifierType): { label?: string; body: string }[] {
    const sections: { label?: string; body: string }[] = [];
    const desc = type.getDescription(this.scene);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const party = this.scene.getParty() as PlayerPokemon[];
    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const applicableLabel = i18next.t("modifierSelectUiHandler:applicable", { defaultValue: "Applicable" });
    const formChangeItem = type.formChangeItems?.[0];

    const allFormChangeItems = type.formChangeItems || [];
    const primaryItem = allFormChangeItems[0];
    const isSmittyGlitchItem = (primaryItem >= FormChangeItem.SMITTY_AURA && primaryItem <= FormChangeItem.SMITTY_VOID) ||
      (primaryItem >= FormChangeItem.GLITCHI_GLITCHI_FRUIT && primaryItem <= FormChangeItem.GLITCH_MASTER_PARTS);

    const partyGrid = this.buildPartySectionIconGrid(party, (pokemon) => {
      if (!isSmittyGlitchItem && (pokemon as any).isEvolutionLocked?.()) {
        return `[color=#888888]\u2717[/color]`;
      }

      const currentForm = pokemon.species.forms?.[pokemon.formIndex];
      const isSmittyForm = currentForm && (currentForm.formKey === SpeciesFormKey.SMITTY || currentForm.formKey === SpeciesFormKey.SMITTY_B);
      const isSmittyItem = primaryItem >= FormChangeItem.SMITTY_AURA && primaryItem <= FormChangeItem.SMITTY_VOID;
      if (isSmittyForm && isSmittyItem) {
        return `[color=#888888]\u2717[/color]`;
      }

      const speciesFormChanges = pokemonFormChanges[pokemon.species.speciesId] || [];
      const relevantFormChange = speciesFormChanges.find(fc => {
        const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
        return itemTrigger && allFormChangeItems.includes(itemTrigger.item);
      });

      if (!relevantFormChange) {
        return `[color=#888888]\u2717[/color]`;
      }

      const alreadyOwned = this.scene.findModifier(m =>
        m instanceof PokemonFormChangeItemModifier &&
        (m as any).pokemonId === pokemon.id &&
        allFormChangeItems.includes((m as any).formChangeItem)
      );
      if (alreadyOwned) {
        return `[color=#888888]\u2717[/color]`;
      }

      return `[color=#78c850]\u2713[/color]`;
    });
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" }), body: "", embeddedContainer: partyGrid });

    return sections;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
  }

  private ensureForbiddenFormDetailsTooltip(): void {
    if (!this.upgradeTooltipContainer || this.forbiddenFormDetailsTooltipContainer) {
      return;
    }

    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const centerX = tooltipWidth / 2 + 2;
    const textX = padding + 2;

    this.forbiddenFormDetailsTooltipContainer = this.scene.add.container(0, 0);
    this.forbiddenFormDetailsTooltipContainer.setVisible(false);

    this.forbiddenFormDetailsTooltipBg = this.scene.add.nineslice(0, 0, "tooltip_info", undefined, 120, 60, 12, 12, 12, 12);
    this.forbiddenFormDetailsTooltipBg.setOrigin(0, 0);
    this.forbiddenFormDetailsTooltipTitleBarBg = this.scene.add.graphics();
    this.forbiddenFormDetailsTooltipRarityBarBg = this.scene.add.graphics();

    this.forbiddenFormDetailsTooltipTitle = addTextObject(
      this.scene,
      centerX,
      8,
      "",
      TextStyle.WINDOW,
      { fontSize: "40px" }
    );
    this.forbiddenFormDetailsTooltipTitle.setOrigin(0.5, 0.5);

    this.forbiddenFormDetailsTooltipSubtitle = addTextObject(
      this.scene,
      centerX,
      17,
      i18next.t("nodeMode:tooltipDetails", { defaultValue: "DETAILS" }),
      TextStyle.WINDOW,
      { fontSize: "30px" }
    );
    this.forbiddenFormDetailsTooltipSubtitle.setOrigin(0.5, 0.5);

    this.forbiddenFormDetailsTooltipBody = this.createColoredComparisonText(textX, 24, "");
    this.applyBbCodeWordWrap(this.forbiddenFormDetailsTooltipBody, tooltipWidth, padding);

    this.forbiddenFormDetailsNavContainer = this.createForbiddenFormDetailsNavRow(tooltipWidth);
    this.forbiddenFormDetailsNavContainer.setVisible(false);

    this.forbiddenFormDetailsTooltipContainer.add([
      this.forbiddenFormDetailsTooltipBg,
      this.forbiddenFormDetailsTooltipTitleBarBg,
      this.forbiddenFormDetailsTooltipRarityBarBg,
      this.forbiddenFormDetailsTooltipTitle,
      this.forbiddenFormDetailsTooltipSubtitle,
      this.forbiddenFormDetailsTooltipBody,
      this.forbiddenFormDetailsNavContainer
    ]);
    this._forbiddenFormDetailsPattern = attachModalBackground(this.scene as BattleScene, this.forbiddenFormDetailsTooltipContainer, () => ({
      bgX: 0, bgY: 0,
      bgWidth: this.forbiddenFormDetailsTooltipBg?.width ?? 120,
      bgHeight: this.forbiddenFormDetailsTooltipBg?.height ?? 60
    }), { mask: false, alphaMultiplier: 0.6 });

    this.upgradeTooltipContainer.add(this.forbiddenFormDetailsTooltipContainer);
    this.upgradeTooltipContainer.bringToTop(this.forbiddenFormDetailsTooltipContainer);
  }

  private createForbiddenFormDetailsNavRow(tooltipWidth: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(tooltipWidth / 2, 0);
    const left = this.scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      if (!this.active) return;
      this.shiftForbiddenFormAbility(-1);
      this.getUi().playSelect();
    });

    const right = this.scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      if (!this.active) return;
      this.shiftForbiddenFormAbility(1);
      this.getUi().playSelect();
    });

    this.forbiddenFormDetailsNavLabel = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "35px" });
    this.forbiddenFormDetailsNavLabel.setOrigin(0.5, 0.5);
    container.add([left, this.forbiddenFormDetailsNavLabel, right]);
    return container;
  }

  private updateForbiddenFormDetailsTooltip(): void {
    if (!this.forbiddenFormDetailsActive || !this.upgradeTooltipContainer) {
      if (this.forbiddenFormDetailsTooltipContainer) {
        this.forbiddenFormDetailsTooltipContainer.setVisible(false);
      }
      return;
    }

    const type = this.forbiddenFormDetailsType;
    if (!type) {
      if (this.forbiddenFormDetailsTooltipContainer) {
        this.forbiddenFormDetailsTooltipContainer.setVisible(false);
      }
      return;
    }

    const abilities = ((type as any).getTooltipData?.() as any)?.abilities as Abilities[] | undefined;
    if (!Array.isArray(abilities) || abilities.length === 0) {
      if (this.forbiddenFormDetailsTooltipContainer) {
        this.forbiddenFormDetailsTooltipContainer.setVisible(false);
      }
      return;
    }

    this.ensureForbiddenFormDetailsTooltip();
    if (!this.forbiddenFormDetailsTooltipContainer ||
        !this.forbiddenFormDetailsTooltipBg ||
        !this.forbiddenFormDetailsTooltipTitleBarBg ||
        !this.forbiddenFormDetailsTooltipRarityBarBg ||
        !this.forbiddenFormDetailsTooltipTitle ||
        !this.forbiddenFormDetailsTooltipSubtitle ||
        !this.forbiddenFormDetailsTooltipBody) {
      return;
    }

    const idx = ((this.forbiddenFormDetailsAbilityIndex % abilities.length) + abilities.length) % abilities.length;
    const abilityId = abilities[idx];
    const abilityName = allAbilities[abilityId]?.name || i18next.t("skillTree:fallback.unknownAbility");
    const abilityDesc = allAbilities[abilityId]?.description || i18next.t("skillTree:fallback.unknownAbilityDescription", { defaultValue: "No description available." });

    const rarity = this.getModifierRarity(type);
    const rarityColors = getUpgradeRarityColors(rarity);

    const forbiddenRarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.forbiddenFormDetailsTooltipTitle.setText(abilityName);
    this.forbiddenFormDetailsTooltipTitle.setColor(forbiddenRarityHex);
    this.forbiddenFormDetailsTooltipSubtitle.setText(i18next.t("nodeMode:tooltipDetails", { defaultValue: "DETAILS" }));
    this.forbiddenFormDetailsTooltipSubtitle.setTint(rarityColors.border);

    this.forbiddenFormDetailsTooltipBody.setText(abilityDesc);
    this.applyBbCodeWordWrap(this.forbiddenFormDetailsTooltipBody, this.TOOLTIP_WIDTH, 6);

    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const buttonRowHeight = 10;

    const canNavigate = abilities.length > 1 && !!this.forbiddenFormDetailsNavContainer && !!this.forbiddenFormDetailsNavLabel;
    if (this.forbiddenFormDetailsNavContainer && this.forbiddenFormDetailsNavLabel) {
      this.forbiddenFormDetailsNavContainer.setVisible(canNavigate);
      if (canNavigate) {
        this.forbiddenFormDetailsNavLabel.setText(`${idx + 1}/${abilities.length}`);
      }
    }

    const tooltipHeight = barsHeight
      + this.forbiddenFormDetailsTooltipBody.displayHeight
      + (padding * 2)
      + padding
      + (this.forbiddenFormDetailsNavContainer && this.forbiddenFormDetailsNavContainer.visible ? (buttonRowHeight + padding) : 0);

    this.forbiddenFormDetailsTooltipBg.setSize(tooltipWidth, tooltipHeight);
    this._forbiddenFormDetailsPattern?.redraw();

    this.forbiddenFormDetailsTooltipTitleBarBg.clear();

    this.forbiddenFormDetailsTooltipRarityBarBg.clear();
    this.forbiddenFormDetailsTooltipRarityBarBg.fillStyle(0x0f0f1e, 1.0);
    this.forbiddenFormDetailsTooltipRarityBarBg.fillRect(2, 14, tooltipWidth - 4, this.TOOLTIP_RARITY_BAR_HEIGHT);

    if (this.forbiddenFormDetailsNavContainer && this.forbiddenFormDetailsNavContainer.visible) {
      const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
      this.forbiddenFormDetailsNavContainer.setPosition(tooltipWidth / 2, buttonY);
    }

    const modalWidth = this.scene.game.canvas.width / 6;
    const modalHeight = this.scene.game.canvas.height / 6;
    const screenLeft = 0;
    const screenRight = modalWidth;
    const screenTop = -modalHeight;
    const screenBottom = 0;

    const mainX = this.upgradeTooltipContainer.x;
    const mainY = this.upgradeTooltipContainer.y;
    const mainWidth = this.TOOLTIP_WIDTH;
    const mainHeight = this.partyDetailsMainTooltipHeight;
    const gap = 7;

    const preferRightX = mainX + mainWidth + gap;
    const preferLeftX = mainX - tooltipWidth - gap;
    let globalX = preferRightX;
    if (globalX + tooltipWidth > screenRight) {
      globalX = preferLeftX;
    }
    globalX = Math.max(screenLeft, Math.min(screenRight - tooltipWidth, globalX));

    const desiredGlobalY = mainY + (mainHeight - tooltipHeight) / 2;
    const minY = screenTop;
    const maxY = screenBottom - tooltipHeight;
    const globalY = Math.max(minY, Math.min(maxY, desiredGlobalY));

    this.forbiddenFormDetailsTooltipContainer.setPosition(globalX - mainX, globalY - mainY);
    this.forbiddenFormDetailsTooltipContainer.setVisible(true);
  }

  private generateForbiddenFormUnlockTooltipSections(
    type: ForbiddenFormUnlockModifierType,
    focusedAbilityIndex: number
  ): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const data: any = (type as any).getTooltipData?.();
    if (!data) {
      sections.push({ body: type.getDescription(this.scene) });
      return sections;
    }

    const isSmitty = data.isSmitty || (type.candidate?.kind === "UNI_SMITTY");

    if (isSmitty) {
      sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader"), body: i18next.t("skillTree:descriptions.smittyFormTooltipDescription") });
    }

    const species = data.speciesName || i18next.t("skillTree:fallback.unknownPokemon");
    const form = data.formName || type.name;
    const hasItem = (typeof data.formChangeItem === "number");
    const item = hasItem
      ? i18next.t(`modifierType:FormChangeItem.${FormChangeItem[data.formChangeItem]}`, { defaultValue: FormChangeItem[data.formChangeItem] })
      : i18next.t("skillTree:fallback.unknownItem");

    const canShowRunEvolveLines = !isSmitty && !!data.speciesName && !!data.formName && hasItem;

    if (canShowRunEvolveLines) {
      const descText = `Obtain the power to evolve ${species} to its [color=#e13d3d]${form}[/color] form for this run.`;
      sections.push({ label: "DESCRIPTION", body: descText });
    }

    const typeParts = (data.types || []).map((t: Type) => {
      const name = this.getLocalizedTypeName(t);
      const [tr, tg, tb] = getTypeRgb(t);
      return `[color=${this.rgbToHex(tr, tg, tb)}]${name}[/color]`;
    });
    sections.push({ label: "TYPES", body: typeParts.length ? typeParts.join(" / ") : i18next.t("skillTree:fallback.unknownType") });

    const abilities: Abilities[] = Array.isArray(data.abilities) ? data.abilities : [];
    const focusedAbility = abilities[focusedAbilityIndex];
    const abilityParts = abilities.map((a, i) => {
      const n = allAbilities[a]?.name || i18next.t("skillTree:fallback.unknownAbility");
      return (i === focusedAbilityIndex) ? `[color=#78c850]${n}[/color]` : `[color=#888888]${n}[/color]`;
    });
    let abilityBody = abilityParts.length ? abilityParts.join(", ") : i18next.t("skillTree:fallback.unknownAbility");
    if (focusedAbility && allAbilities[focusedAbility]?.description) {
      abilityBody += `\n${allAbilities[focusedAbility].description}`;
    }
    if (abilities.length > 1) {
      abilityBody += `\n[color=#888888]\u2190 ${focusedAbilityIndex + 1}/${abilities.length} \u2192[/color]`;
    }
    sections.push({ label: "ABILITY", body: abilityBody });

    if (Array.isArray(data.targetStats) && data.targetStats.length === 6) {
      const statsContainer = this.createStatBarsContainer(data.targetStats, undefined, true, true);
      sections.push({ label: "STATS", body: "", embeddedContainer: statsContainer });
    }

    return sections;
  }

  private refreshForbiddenFormTooltip(): void {
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    if (!(type instanceof ForbiddenFormUnlockModifierType)) return;
    if (!this.scene.modifierTooltipsEnabled || !this.upgradeTooltipContainer) return;

    const rarity = this.getModifierRarity(type);
    const title = type.name;
    const subtitle = this.getRarityText(rarity);
    const focusIdx = this.forbiddenFormDetailsActive ? this.forbiddenFormDetailsAbilityIndex : 0;
    const ffSections = this.generateForbiddenFormUnlockTooltipSections(type, focusIdx);
    this.showModifierTooltip(title, subtitle, "", rarity, true, undefined, false, ffSections);
  }

  private enterForbiddenFormDetailsMode(type: ForbiddenFormUnlockModifierType): void {
    const abilities = ((type as any).getTooltipData?.() as any)?.abilities as Abilities[] | undefined;
    if (!Array.isArray(abilities) || abilities.length === 0) return;
    this.forbiddenFormDetailsActive = true;
    this.forbiddenFormDetailsType = type;
    this.forbiddenFormDetailsAbilityIndex = 0;
    this.refreshForbiddenFormTooltip();
    this.updateForbiddenFormAbilitySideTooltip();
  }

  private updateForbiddenFormAbilitySideTooltip(): void {
    this.updateForbiddenFormDetailsTooltip();
  }

  private shiftForbiddenFormAbility(delta: number): void {
    const type = this.forbiddenFormDetailsType;
    if (!type) return;
    const abilities = ((type as any).getTooltipData?.() as any)?.abilities as Abilities[] | undefined;
    if (!Array.isArray(abilities) || abilities.length === 0) return;
    this.forbiddenFormDetailsAbilityIndex = (this.forbiddenFormDetailsAbilityIndex + delta + abilities.length) % abilities.length;
    this.setCursor(this.cursor);
    this.updateForbiddenFormAbilitySideTooltip();
  }

  private exitForbiddenFormDetailsMode(): void {
    this.forbiddenFormDetailsActive = false;
    this.forbiddenFormDetailsAbilityIndex = 0;
    this.forbiddenFormDetailsType = null;
    this.moveInfoOverlay.clear();
    this.refreshForbiddenFormTooltip();
  }

  private generateTypeSwitcherTooltipBody(newPrimaryType: Type | null, newSecondaryType: Type | null): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    let descText = '';
    if (newPrimaryType !== null && newSecondaryType !== null) {
      descText = `Changes typing to ${this.getLocalizedTypeName(newPrimaryType)}/${this.getLocalizedTypeName(newSecondaryType)}`;
    } else if (newPrimaryType !== null) {
      descText = `Changes primary type to ${this.getLocalizedTypeName(newPrimaryType)}`;
    } else if (newSecondaryType !== null) {
      descText = `Changes secondary type to ${this.getLocalizedTypeName(newSecondaryType)}`;
    }
    lines.push(getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const party = this.scene.getParty();
    for (const pokemon of party) {
      const pokemonTypes = pokemon.getTypes();
      const currentTypes = [pokemonTypes[0], pokemonTypes[1]].filter(t => t !== undefined && t !== Type.UNKNOWN);

      const newTypes: Type[] = [];
      if (newPrimaryType !== null) {
        newTypes.push(newPrimaryType);
      } else {
        newTypes.push(currentTypes[0] || Type.NORMAL);
      }
      if (newSecondaryType !== null) {
        newTypes.push(newSecondaryType);
      } else if (currentTypes[1] !== undefined) {
        newTypes.push(currentTypes[1]);
      }
      const currentStrColored = currentTypes.map(t => `[color=#888888]${this.getLocalizedTypeName(t)}[/color]`).join("/");
      const newStrColored = newTypes.map(t => `[color=#78c850]${this.getLocalizedTypeName(t)}[/color]`).join("/");

      lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: ${currentStrColored} → ${newStrColored}`);
    }

    return lines.join('\n');
  }

  private generateBallTooltipSections(type: AddTypeBallModifierType | AddPokeballModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];

    let ballName: string;
    let catchRateStr: string;
    let inventory: number;
    const count = (type as any).count;

    if (type instanceof AddTypeBallModifierType) {
      const typeName = Type[type.targetType];
      const displayName = typeName.charAt(0) + typeName.slice(1).toLowerCase();
      ballName = i18next.t("pokeball:typeBall", { typeName: displayName });
      catchRateStr = "2x";
      inventory = this.scene.typeBallCounts[type.targetType] || 0;
    } else {
      ballName = getPokeballName(type.pokeballType, this.scene);
      const mult = getPokeballCatchMultiplier(type.pokeballType);
      catchRateStr = mult > -1 ? `${mult}x` : mult === -2 ? i18next.t("pokeball:voidBallCatchRate") : "100%";
      inventory = this.scene.pokeballCounts[type.pokeballType];
    }

    const baseDesc = i18next.t("modifierType:ModifierType.AddPokeballModifierType.description", {
      modifierCount: count,
      pokeballName: ballName,
      catchRate: catchRateStr,
      pokeballAmount: `${inventory}`,
    });
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: baseDesc
    });

    if (type instanceof AddTypeBallModifierType) {
      const typeName = Type[type.targetType];
      const displayName = typeName.charAt(0) + typeName.slice(1).toLowerCase();
      const uniqueBody = i18next.t("modifierType:ModifierType.AddPokeballModifierType.typeBallExtra", { typeName: displayName }).replace(/^\n/, "").trim();

      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipUniqueHeader", { defaultValue: "UNIQUE" }),
        body: uniqueBody
      });
    } else if (type instanceof AddPokeballModifierType && type.pokeballType === PokeballType.VOID_BALL) {
      const uniqueBody = i18next.t("modifierType:ModifierType.AddPokeballModifierType.voidBallExtra").replace(/^\n/, "").trim();
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipUniqueHeader", { defaultValue: "UNIQUE" }),
        body: uniqueBody
      });
    }

    return sections;
  }

  private generateFusionTooltipSections(type: FusePokemonModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;
    const rule1 = i18next.t("modifierSelectUiHandler:fusionRule1", { defaultValue: "2nd Pokémon removed from party" });
    const rule2 = i18next.t("modifierSelectUiHandler:fusionRule2", { defaultValue: "Fusion gets partner's Ability + combined Types" });
    const rule3 = i18next.t("modifierSelectUiHandler:fusionRule3", { defaultValue: "Moves: can learn both Pokémon's moves" });
    const rule4 = i18next.t("modifierSelectUiHandler:fusionRule4", { defaultValue: "Stats: best stats kept, rest averaged" });
    const descBody = [
      `[color=#78c850]Fuses 2 Pokemon![/color]`,
      `• ${getBBCodeFrag(rule1, TextStyle.WINDOW, uiTheme)}`,
      `• ${getBBCodeFrag(rule2, TextStyle.WINDOW, uiTheme)}`,
      `• ${getBBCodeFrag(rule3, TextStyle.WINDOW, uiTheme)}`,
      `• ${getBBCodeFrag(rule4, TextStyle.WINDOW, uiTheme)}`
    ].join("\n");
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: descBody
    });

    const party = this.scene.getParty() as PlayerPokemon[];
    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const canFuseLabel = i18next.t("modifierSelectUiHandler:canFuse", { defaultValue: "Can Fuse" });

    const eligible = party.filter((pokemon, idx) => {
      if (pokemon.isFusion()) return false;
      const partners = this.getFusionPartnerIndices(party, idx);
      return partners.length > 0;
    });

    if (eligible.length > 0) {
      const displayList = eligible.slice(0, 6);
      const partyGrid = this.buildPartySectionIconGrid(displayList, (pokemon) => {
        return `[color=#00bfff]${canFuseLabel}[/color]`;
      }, undefined, this.fusionPreviewHighlightIndex);

      const headerLabel = i18next.t("modifierSelectUiHandler:tooltipPreviewFusionsButton", { defaultValue: "PREVIEW FUSIONS" });
      sections.push({ label: headerLabel, body: "", embeddedContainer: partyGrid });
    } else {
      const notAbleLabel = i18next.t("partyUiHandler:notAble", { defaultValue: "Not able" });
      const partyGrid = this.buildPartySectionIconGrid(party, (pokemon) => {
        return `[color=#888888]${notAbleLabel}[/color]`;
      });
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipPreviewFusionsButton", { defaultValue: "PREVIEW FUSIONS" }),
        body: "",
        embeddedContainer: partyGrid
      });
    }

    return sections;
  }

  private generateTypeSwitcherTooltipSections(type: TypeSwitcherModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const desc = type.getDescription(this.scene);
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }), body: desc });

    const newPrimaryType = type.newPrimaryType;
    const newSecondaryType = type.newSecondaryType;
    const party = this.scene.getParty() as PlayerPokemon[];
    const partyGrid = this.buildPartySectionIconGridWithTypes(party, (pokemon) => {
      const pokemonTypes = pokemon.getTypes();
      const currentTypes = [pokemonTypes[0], pokemonTypes[1]].filter(t => t !== undefined && t !== Type.UNKNOWN);
      const newTypes: Type[] = [];
      if (newPrimaryType !== null) {
        newTypes.push(newPrimaryType);
      } else {
        newTypes.push(currentTypes[0] || Type.NORMAL);
      }
      if (newSecondaryType !== null) {
        newTypes.push(newSecondaryType);
      } else if (currentTypes[1] !== undefined) {
        newTypes.push(currentTypes[1]);
      }
      return newTypes;
    });
    sections.push({ label: i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" }), body: "", embeddedContainer: partyGrid });

    return sections;
  }

  private generateTeraShardTooltipSections(type: TerastallizeModifierType): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const uiTheme = this.scene.uiTheme;

    const descText = type.getDescription(this.scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme)
    });

    const party = this.scene.getParty() as PlayerPokemon[];
    if (party.length > 0) {
      const partyGrid = this.buildPartySectionIconGridWithTypes(party, (pokemon) => {
        const pokemonTypes = pokemon.getTypes();
        return pokemonTypes.filter((t: any) => t !== Type.UNKNOWN);
      });
      sections.push({
        label: i18next.t("modifierSelectUiHandler:tooltipPartyHeader", { defaultValue: "PARTY" }),
        body: "",
        embeddedContainer: partyGrid
      });
    }

    return sections;
  }

  private generateMintTooltipSections(targetNature: Nature): { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] {
    const sections: { label?: string; body: string; embeddedContainer?: Phaser.GameObjects.Container }[] = [];
    const descText = i18next.t("modifierType:ModifierType.PokemonNatureChangeModifierType.description", { natureName: getNatureName(targetNature, true, true, true) });
    sections.push({
      label: i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" }),
      body: `[color=#f8f8f8]${descText}[/color]`
    });
    const party = this.scene.getParty() as PlayerPokemon[];
    if (party.length > 0) {
      const pageSize = 1;
      const totalPages = Math.ceil(party.length / pageSize);
      const page = Math.min(this.tooltipSectionPageIndex, totalPages - 1);
      const startIdx = page * pageSize;
      const teamStatsContainer = PokemonBattleTooltipUtils.buildTeamStatsContainer(
        this.scene,
        party,
        { hideMoves: true, targetNature, tooltipWidth: 120, displaySlice: [startIdx, pageSize], showBstTotal: true }
      );
      const headerLabel = totalPages > 1
        ? `${i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" })} (${page + 1}/${totalPages})`
        : i18next.t("modifierSelectUiHandler:tooltipPreviewHeader", { defaultValue: "PREVIEW" });
      sections.push({
        label: headerLabel,
        body: "",
        embeddedContainer: teamStatsContainer
      });
      if (totalPages > 1) {
        const navRow = this.buildTooltipNavRow(page, totalPages);
        sections.push({ body: "", embeddedContainer: navRow });
      }
    }
    return sections;
  }

  private parseUpgradeComparisonText(comparisonText: string): { titleText: string; subtitleText: string; bodyText: string } {
    const lines = comparisonText.split('\n');
    const stripBBCode = (text: string): string => text.replace(/\[.*?\]/g, '').trim();
    const titleText = lines.length > 0 ? stripBBCode(lines[0]) : '';
    const subtitleText = lines.length > 1 ? stripBBCode(lines[1]) : '';
    const bodyStartIndex = lines.length > 2 && lines[2].trim() === '' ? 3 : 2;
    const bodyText = lines.slice(bodyStartIndex).join('\n');
    return { titleText, subtitleText, bodyText };
  }
  private getWeatherName(weather: WeatherType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(WeatherType[weather])}`);
  }

  private getTerrainName(terrain: TerrainType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(TerrainType[terrain])}`);
  }

  private getTrapName(trap: BattlerTagType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(BattlerTagType[trap])}`);
  }

  private getHazardName(hazard: ArenaTagType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(ArenaTagType[hazard])}`);
  }

  private getTypeName(type: Type): string {
    return i18next.t(`pokemonInfo:Type:${Type[type]}`);
  }

  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/[ _-]/g, ' ').replace(/(?:^\w|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return '';
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  public getCurrentOptions(): ModifierTypeOption[] {
    return this.options?.map(option => option.modifierTypeOption) || [];
  }

  public getCurrentShopOptions(): ModifierTypeOption[] {
    return this.shopOptionsRows.flat().map(option => option.modifierTypeOption) || [];
  }

  protected getShopLayout(): { rows: number, itemsPerRow: number } {
    return { rows: 2, itemsPerRow: SHOP_OPTIONS_ROW_LIMIT };
  }

  protected showHeaderDisplay(title: string, subtitle?: string): void {
    if (!this.headerDisplayContainer) {
      const headerY = -(this.scene as BattleScene).game.canvas.height / 6 + 5;
      this.headerDisplayContainer = this.scene.add.container(0, headerY);
      this.modifierContainer.add(this.headerDisplayContainer);
      const centerX = (this.scene as BattleScene).game.canvas.width / 12;
      this.headerTitleText = addTextObject(this.scene, centerX, 9, "", TextStyle.SUMMARY_GOLD, { fontSize: "120px" });
      this.headerTitleText!.setOrigin(0.5, 0.5);
      this.headerDisplayContainer.add(this.headerTitleText!);
      this.headerShinyIcon = this.scene.add.sprite(0, 0, "shiny_icons");
      this.headerShinyIcon.setOrigin(0.15, 0.2);
      this.headerShinyIcon.setScale(1.2);
      this.headerShinyIcon.setFrame(getVariantIcon(0));
      this.headerShinyIcon.setTint(getVariantTint(0));
      this.headerDisplayContainer.add(this.headerShinyIcon);
      this.headerSubtitleText = addTextObject(this.scene, centerX, 16 + 12, "", TextStyle.WINDOW, { fontSize: "47px" });
      this.headerSubtitleText!.setOrigin(0.5, 0.5);
      this.headerDisplayContainer.add(this.headerSubtitleText!);
    }
    this.headerTitleText!.setText(title);
    this.headerSubtitleText!.setText(subtitle || "");
    const showShiny = !!this.displayConfig?.hideShop;
    this.headerShinyIcon?.setVisible(showShiny);
    if (showShiny && this.headerShinyIcon && this.headerTitleText) {
      this.headerShinyIcon.x = this.headerTitleText.x + this.headerTitleText.displayWidth / 2 + 6;
      this.headerShinyIcon.y = this.headerTitleText.y - 5;
    }
    this.headerDisplayContainer.setVisible(true);
    this.headerDisplayContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.headerDisplayContainer,
      alpha: 1,
      duration: 500,
      ease: "Sine.easeIn"
    });
  }

  protected hideHeaderDisplay(): void {
    if (this.headerDisplayContainer) {
      this.headerDisplayContainer.setVisible(false);
    }
  }

  protected getShopTypeOptions(): ModifierTypeOption[] | null {
    if (this.forcedDraftSelection || this.displayConfig?.hideShop) {
      return null;
    }
    let options = getPlayerShopModifierTypeOptionsForWave(this.scene, this.scene.getWaveMoneyAmount(1));
    if ((this.scene as BattleScene).skillTreeModifierContext && options) {
      options.forEach(option => {
        if (option.cost > 0) {
          option.cost = Math.round(option.cost * 5);
        }
      });
    }
    if (options) {
      const disabledIds = getDisabledModifierIds(this.scene as BattleScene);
      if (disabledIds.size > 0) {
        options = options.filter(o => !o.type?.id || !disabledIds.has(o.type.id));
      }
    }
    return options;
  }

  protected createModifierOption(typeOptions: ModifierTypeOption[], index: number, optionsYOffset: number): ModifierOption {
    const baseY = -this.scene.game.canvas.height / 12 + optionsYOffset;
    const dense = typeOptions.length >= 6;

    if (this.displayConfig?.layout === "2x2" && typeOptions.length === 4) {
      const cols = 2;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const sliceWidth = (this.scene.game.canvas.width / 6) / (cols + 2);
      const x = sliceWidth * (col + 1) + (sliceWidth * 0.5);
      const rowSpacing = 50;
      const y = baseY + (row * rowSpacing);
      const opt = new ModifierOption(this.scene, x, y, typeOptions[index]);
      return opt;
    }

    const y = baseY;

    if (typeOptions.length < 5) {
      const sliceWidth = (this.scene.game.canvas.width / 6) / (typeOptions.length + 2);
      const x = sliceWidth * (index + 1) + (sliceWidth * 0.5);
      const opt = new ModifierOption(this.scene, x, y, typeOptions[index]);
      if (dense) {
        opt.initDenseRowStyle();
      }
      return opt;
    }

    const leftMargin = 6;
    const rightMargin = 6;
    const usableWidth = (this.scene.game.canvas.width / 6) - leftMargin - rightMargin;
    const sliceWidth = usableWidth / Math.max(1, typeOptions.length);
    const x = leftMargin + sliceWidth * (index + 0.5);

    const opt = new ModifierOption(this.scene, x, y, typeOptions[index]);
    if (dense) {
      opt.initDenseRowStyle();
    }
    return opt;
  }

  protected getMainOptionsYOffset(shopTypeOptions: ModifierTypeOption[] | null): number {
    return shopTypeOptions && shopTypeOptions.length >= this.getShopLayout().itemsPerRow ? 2 : -14;
  }

  public getCurrentSelectedOption(): ModifierOption | null {
    if (this.rowCursor === 0) {
      return null;
    } else if (this.rowCursor === 1) {
      return this.options[this.cursor] || null;
    } else {
      const shopRowIndex = this.shopOptionsRows.length - (this.rowCursor - 1);
      if (shopRowIndex >= 0 && shopRowIndex < this.shopOptionsRows.length) {
        return this.shopOptionsRows[shopRowIndex][this.cursor] || null;
      }
    }
    return null;
  }

  clear() {
    this._suspendedForOverlay = false;
    this._preSuspendVisible = null;
    super.clear();
    const wasHideShop = this.displayConfig?.hideShop;
    this.displayConfig = undefined;
    this.hideHeaderDisplay();
    this.lastDenseFocusedOption = null;
    this.lastChipFocusedOption = null;
    this.showDetailsHintBg = null;
    if (this.focusedOptionPanelBg) {
      this.focusedOptionPanelBg.clear();
    }
    if (this.focusLabelDetailsBg) {
      this.focusLabelDetailsBg.clear();
    }

    if (this.showDetailsHintContainer) {
      this.showDetailsHintContainer.destroy();
      this.showDetailsHintContainer = null;
      this.showDetailsHintKeySprite = null;
      this.showDetailsHintLabel = null;
    }

    this.moveInfoOverlay.clear();
    this.moveInfoOverlayActive = false;
    this.hideUpgradeTooltip();
    ModifierTooltipUtils.hide(this.scene);
    this.tooltipCache.clear();
    this.multiHitWarning = false;
    this.flinchWarning = false;
    this.secondaryEffectNote = false;
    this.lineCount = 0;
    this.awaitingActionInput = false;
    this.onActionInput = null;
    this.getUi().clearText();
    this.eraseCursor();

    if (this._shopRevealTimer) { this._shopRevealTimer.remove(); this._shopRevealTimer = null; }
    if (this._buttonRevealTimer) { this._buttonRevealTimer.remove(); this._buttonRevealTimer = null; }
    if (this._optionRevealTween) { this._optionRevealTween.stop(); this._optionRevealTween = null; }

    const msgHandler = this.scene.ui.getMessageHandler() as any;
    if (msgHandler?.bg) msgHandler.bg.setVisible(true);
    if (msgHandler?._messageBgPattern?.layers) {
      msgHandler._messageBgPattern.layers.forEach((l: any) => l.setVisible(true));
    }
    if (msgHandler?.messageContainer) msgHandler.messageContainer.setVisible(true);

    if (wasHideShop) {
      const overlayHeight = (this.scene.game.canvas.height / 6) - 48;
      (this.scene as BattleScene).shopOverlay.setSize(this.scene.game.canvas.width / 6, overlayHeight);
      (this.scene as BattleScene).shopOverlay.setPosition(0, overlayHeight * -1 - 48);
    }
    this.tooltipDeferredUntilUserInput = false;
    this.scene.hideShopOverlay(750 * this.scene.gameSpeed);

    if (this.patternOverlay && !this.scene.reroll) {
      const overlayToDestroy = this.patternOverlay;
      this.scene.tweens.add({
        targets: overlayToDestroy,
        alpha: 0,
        duration: 750 * this.scene.gameSpeed,
        ease: "Cubic.easeIn",
        onComplete: () => {
          if (overlayToDestroy) {
            overlayToDestroy.destroy();
          }
        }
      });
      this.patternOverlay = null;
      this.patternCreated = false;
    }

    this.scene.getModifierBar().getAll().forEach((icon: any) => icon.setAlpha(1));
    this.scene.getModifierBar(true).getAll().forEach((icon: any) => {
      icon.setAlpha(1);
      if (typeof icon.setInteractive === "function") icon.setInteractive();
    });
    this.scene.ui.permaModifierBar.getAll().forEach((icon: any) => {
      icon.setAlpha(1);
      if (typeof icon.setInteractive === "function") icon.setInteractive();
    });

    this.scene.getModifierBar().updateModifiers(this.scene.modifiers);

    const options = this.options.concat(this.shopOptionsRows.flat());
    this.options.splice(0, this.options.length);
    this.shopOptionsRows.splice(0, this.shopOptionsRows.length);

    this.scene.tweens.add({
      targets: options,
      scale: 0.01,
      duration: 250,
      ease: "Cubic.easeIn",
      onComplete: () => options.forEach(o => o.destroy())
    });

    [ this.rerollButtonContainer, this.permaRerollButtonContainer, this.checkButtonContainer, this.transferButtonContainer, this.lockRarityButtonContainer ].forEach(container => {
      if (container.visible) {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 250,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (!this.options.length) {
              container.setVisible(false);
            } else {
              container.setAlpha(1);
            }
          }
        });
      }
    });
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  private isModifierRemovable(modifier: PersistentModifier): boolean {
    if (modifier instanceof MoveUpgradeModifier) return true;
    return false;
  }
  private selectModifierForRemoval(modifier: PersistentModifier): void {
    if (modifier.stackCount > 1) {
      this.showQuantitySelection(modifier);
    } else {
      this.showRemovalConfirmation(modifier, 1);
    }
  }

  private showQuantitySelection(modifier: PersistentModifier): void {
    const quantityOptions = [];

    for (let i = 1; i <= modifier.stackCount; i++) {
      quantityOptions.push({
        label: `${i} ${modifier.type.name}${i > 1 ? 's' : ''}`,
        handler: () => {
          this.showRemovalConfirmation(modifier, i);
          return true;
        }
      });
    }

    quantityOptions.push({
      label: i18next.t("modifierSelectUiHandler:cancel"),
      handler: () => {
        const returnMenu = this.removalReturnMenu;
        if (returnMenu) {
          returnMenu();
        } else {
          this.showRemoveUpgradesPopup();
        }
        return true;
      }
    });

    const config = {
      options: quantityOptions,
      maxOptions: 6,
      yOffset: 0
    };

    this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
  }

  private showRemovalConfirmation(modifier: PersistentModifier, quantity: number): void {
    const itemName = modifier.type.name;
    const quantityText = quantity > 1 ? `${quantity} ` : "";
    const pokemonText = modifier instanceof PokemonHeldItemModifier
      ? ` from ${this.scene.getPokemonById(modifier.pokemonId)?.name || "Unknown"}`
      : "";

    const message = i18next.t("modifierSelectUiHandler:confirmRemoval", {
      quantity: quantityText,
      itemName: itemName,
      pokemon: pokemonText
    });

    const ui = this.scene.ui;
    const msgHandler = ui.getMessageHandler() as any;
    if (msgHandler?.bg) {
      ui.bringToTop(msgHandler.bg);
    }
    if (msgHandler?._messageBgPattern) {
      if (msgHandler._messageBgPattern.layers) {
        msgHandler._messageBgPattern.layers.forEach((l: any) => ui.bringToTop(l));
      }
    }
    if (msgHandler?.messageContainer) {
      ui.bringToTop(msgHandler.messageContainer);
    }

    ui.showText(message, null, () => {
      ui.setOverlayMode(Mode.CONFIRM,
        () => {
          this.executeModifierRemoval(modifier, quantity);
          return true;
        },
        () => {
          ui.revertMode();
          ui.hideMessageChrome();
          ui.clearText();
          const returnMenu = this.removalReturnMenu;
          if (returnMenu) {
            returnMenu();
          }
          return true;
        },
        false, null, 32, 500
      );
    });
  }

  private executeModifierRemoval(modifier: PersistentModifier, quantity: number): void {
    const isFullRemoval = quantity >= modifier.stackCount;
    const returnMenu = this.removalReturnMenu;

    if (modifier instanceof PokemonAltBuildModifier || modifier instanceof PokemonFormChangeItemModifier) {
      this.scene.ui.revertMode();
      this.scene.ui.hideMessageChrome();
      this.scene.ui.clearText();
      if (returnMenu) {
        returnMenu();
      }
      return;
    }

    const needsPokemonRebuild = modifier instanceof PokemonHeldItemModifier && (
      modifier instanceof TypeSwitcherModifier ||
      modifier instanceof TypeSacrificeModifier ||
      modifier instanceof AnyAbilityModifier ||
      modifier instanceof AbilitySacrificeModifier
    );

    if (isFullRemoval && needsPokemonRebuild) {
      this.executeSpeciesChangingHeldItemRemoval(modifier).then(() => {
        this.scene.ui.revertMode();
        this.scene.ui.showText(
          i18next.t("modifierSelectUiHandler:itemRemoved", {
            quantity: quantity > 1 ? `${quantity} ` : "",
            itemName: modifier.type.name
          }),
          null,
          () => {
            this.scene.ui.hideMessageChrome();
            this.scene.ui.clearText();
            if (returnMenu) {
              returnMenu();
            }
          }
        );
      });
      return;
    }

    if (isFullRemoval) {
      this.scene.removeModifier(modifier);
    } else {
      modifier.stackCount -= quantity;
    }

    this.scene.updateModifiers().then(() => {
      this.scene.ui.revertMode();
      this.scene.ui.showText(
        i18next.t("modifierSelectUiHandler:itemRemoved", {
          quantity: quantity > 1 ? `${quantity} ` : "",
          itemName: modifier.type.name
        }),
        null,
        () => {
          this.scene.ui.hideMessageChrome();
          this.scene.ui.clearText();
          if (returnMenu) {
            returnMenu();
          }
        }
      );
    });
  }

  showTransferSubmenu(): void {
    if (this.scene.gameData?.tutorialOnboardActive) return;
    this.removalReturnMenu = null;
    const hasTransferableItems = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length > 0;
    const hasRemovableItems = this.getMoveUpgradeModifiersCount() > 0 || this.getRemovableHeldItemModifiers().length > 0 || this.getRemovablePermaModifiers().length > 0;

    const showNoItemsText = (): void => {
      this.scene.ui.showText(i18next.t("modifierSelectUiHandler:noTransferableItems"), null, () => {
        this.scene.ui.clearText();
        this.showTransferSubmenu();
      });
    };

    const options = [
      {
        label: i18next.t("modifierSelectUiHandler:transferAction", { defaultValue: "Transfer" }),
        handler: () => {
          if (!hasTransferableItems) {
            showNoItemsText();
            return true;
          }
          this.showTransferItemsMode();
          return true;
        }
      },
      {
        label: i18next.t("modifierSelectUiHandler:removeAction", { defaultValue: "Remove" }),
        handler: () => {
          if (!hasRemovableItems) {
            showNoItemsText();
            return true;
          }
          this.showRemoveItemsPopup();
          return true;
        }
      },
      {
        label: i18next.t("modifierSelectUiHandler:removeOmegaAction"),
        handler: () => {
          const removablePerma = this.getRemovablePermaModifiers();
          if (removablePerma.length === 0) {
            this.scene.ui.showText(i18next.t("menuUiHandler:noPermaItems"), null, () => {
              this.scene.ui.clearText();
              this.showTransferSubmenu();
            }, Utils.fixedInt(1500));
            return true;
          }
          this.showRemoveOmegaItemsPopup();
          return true;
        }
      },
      {
        label: i18next.t("modifierSelectUiHandler:cancel"),
        handler: () => {
          this.returnToModifierSelect();
          return true;
        }
      }
    ];

    const config = {
      options: options,
      maxOptions: 5,
      yOffset: 0
    };

    this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
  }

  private getMoveUpgradeModifiersCount(): number {
    return this.scene.modifiers.filter(m =>
      m instanceof MoveUpgradeModifier && this.isModifierRemovable(m)
    ).length;
  }

  private getRemovableMoveUpgradeModifiers(): {modifier: MoveUpgradeModifier, displayText: string}[] {
    return this.scene.modifiers
      .filter(m => m instanceof MoveUpgradeModifier && this.isModifierRemovable(m))
      .map(modifier => ({
        modifier: modifier as MoveUpgradeModifier,
        displayText: this.formatMoveUpgradeDisplay(modifier as MoveUpgradeModifier)
      }));
  }

  private getRemovableHeldItemModifiers(): { modifier: PokemonHeldItemModifier, displayText: string }[] {
    const partyIds = new Set(this.scene.getParty().map(p => p.id));
    return this.scene.modifiers
      .filter(m =>
        m instanceof PokemonHeldItemModifier &&
        partyIds.has((m as PokemonHeldItemModifier).pokemonId) &&
        !(m instanceof PokemonAltBuildModifier) &&
        !(m instanceof PokemonFormChangeItemModifier)
      )
      .map(modifier => ({
        modifier: modifier as PokemonHeldItemModifier,
        displayText: this.formatHeldItemDisplay(modifier as PokemonHeldItemModifier)
      }));
  }

  private getRemovablePermaModifiers(): PersistentModifier[] {
    return this.scene.gameData.permaModifiers.getModifiers().filter(m =>
      !(m instanceof PermaQuestModifier || m instanceof PermaRunQuestModifier || m instanceof PermaCollectedTypeModifier)
    );
  }

  private formatHeldItemDisplay(modifier: PokemonHeldItemModifier): string {
    const pokemon = this.scene.getPokemonById(modifier.pokemonId);
    const pokemonName = pokemon?.getNameToRender?.() || pokemon?.name || "Unknown";
    const stackText = modifier.stackCount > 1 ? ` (${modifier.stackCount})` : "";
    return `${modifier.type.name}${stackText} - ${pokemonName}`;
  }

  private formatMoveUpgradeDisplay(modifier: MoveUpgradeModifier): string {
    const move = allMoves[modifier.moveId];
    const stackText = modifier.stackCount > 1 ? ` (${modifier.stackCount})` : "";
    const label = modifier.upgradeCategory
      ? i18next.t(`moveUpgradeAttrs:${modifier.upgradeCategory}`)
      : i18next.t("moveUpgradeAttrs:extraEffectUpgrade");
    const m = typeof label === "string" ? label.match(/\(([^)]+)\)/) : null;
    const flavor = m?.[1]
      ? m[1].toUpperCase()
      : (modifier.upgradeCategory ? String(modifier.upgradeCategory) : "EX");
    const rank = typeof modifier.upgradeTier === "number" ? Utils.intToRoman(modifier.upgradeTier) : "";
    const rankText = rank ? ` ${rank}` : "";
    return `${move.name} ${flavor}${rankText}${stackText}`;
  }

  showTransferItemsMode(): void {
    const party = this.scene.getParty();

    this.suspendForOverlay();
    this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.MODIFIER_TRANSFER, -1, (fromSlotIndex: integer, itemIndex: integer, itemQuantity: integer, toSlotIndex: integer) => {
      if (toSlotIndex !== undefined && fromSlotIndex < 6 && toSlotIndex < 6 && fromSlotIndex !== toSlotIndex && itemIndex > -1) {
        const itemModifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
          && m.isTransferrable && m.pokemonId === party[fromSlotIndex].id) as PokemonHeldItemModifier[];
        const itemModifier = itemModifiers[itemIndex];
        this.scene.tryTransferHeldItemModifier(itemModifier, party[toSlotIndex], true, itemQuantity);
      } else {
        this.returnToModifierSelect();
      }
    }, PartyUiHandler.FilterItemMaxStacks);
  }

  private showRemoveItemsPopup(): void {
    this.removalReturnMenu = () => this.showRemoveItemsPopup();
    const removableUpgrades = this.getRemovableMoveUpgradeModifiers();
    const removableHeldItems = this.getRemovableHeldItemModifiers();

    const items: { modifier: PersistentModifier; displayText: string }[] = [
      ...removableUpgrades.map(i => ({ modifier: i.modifier as unknown as PersistentModifier, displayText: i.displayText })),
      ...removableHeldItems.map(i => ({ modifier: i.modifier as unknown as PersistentModifier, displayText: i.displayText }))
    ];

    if (items.length === 0) {
      this.scene.ui.showText(i18next.t("modifierSelectUiHandler:noTransferableItems"), null, () => {
        this.scene.ui.clearText();
        this.showTransferSubmenu();
      });
      return;
    }

    const options = items.map(item => ({
      label: item.displayText,
      handler: () => {
        this.selectModifierForRemoval(item.modifier);
        return true;
      }
    }));

    options.push({
      label: i18next.t("modifierSelectUiHandler:cancel"),
      handler: () => {
        this.removalReturnMenu = null;
        this.showTransferSubmenu();
        return true;
      }
    });

    const config = {
      options: options,
      maxOptions: 6,
      yOffset: 0
    };

    this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
  }

  private showRemoveOmegaItemsPopup(): void {
    this.removalReturnMenu = () => this.showRemoveOmegaItemsPopup();
    const items = this.getRemovablePermaModifiers();
    if (items.length === 0) {
      this.scene.ui.showText(i18next.t("menuUiHandler:noPermaItems"), null, () => {
        this.scene.ui.clearText();
        this.showTransferSubmenu();
      });
      return;
    }
    const options = items.map(modifier => ({
      label: modifier instanceof PermaPartyAbilityModifier
        ? `${modifier.type.name}: ${(modifier as any).ability?.name ?? ""}`
        : modifier.type.name,
      handler: () => {
        this.scene.ui.setOverlayMode(Mode.CONFIRM,
          () => {
            this.scene.gameData.permaModifiers.removeModifier(modifier, false, this.scene);
            this.scene.gameData.saveAll(this.scene, true);
            this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
            this.scene.ui.revertMode();
            this.removalReturnMenu?.();
            return true;
          },
          () => { this.scene.ui.revertMode(); this.showRemoveOmegaItemsPopup(); return true; },
          false, null, 32, 500
        );
        return true;
      }
    }));
    options.push({
      label: i18next.t("modifierSelectUiHandler:cancel"),
      handler: () => {
        this.removalReturnMenu = null;
        this.showTransferSubmenu();
        return true;
      }
    });
    this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, {
      xOffset: -1, options, maxOptions: 10, isRemoveItemsMenu: true
    });
  }

  private async executeSpeciesChangingHeldItemRemoval(modifier: PokemonHeldItemModifier): Promise<void> {
    const pokemonId = modifier.pokemonId;
    const party = this.scene.getParty();
    const partyIndex = party.findIndex(p => p.id === pokemonId);

    const modifierIndex = this.scene.modifiers.indexOf(modifier);
    if (modifierIndex > -1) {
      this.scene.modifiers.splice(modifierIndex, 1);
    }

    if (partyIndex < 0) {
      await this.scene.updateModifiers();
      return;
    }

    const oldPokemon = party[partyIndex];
    const data = new PokemonData(oldPokemon);

    const newPokemon = data.toPokemon(this.scene) as PlayerPokemon;
    await newPokemon.loadAssets();

    try {
      if ((oldPokemon as any)?.isActive?.(true)) {
        (oldPokemon as any).leaveField(true, true);
      }
    } catch {}

    party[partyIndex] = newPokemon;
    try {
      oldPokemon.destroy();
    } catch {}

    for (const m of this.scene.modifiers) {
      if (!(m instanceof PokemonHeldItemModifier)) continue;
      if (m.pokemonId !== pokemonId) continue;

      if (m instanceof PokemonFormChangeItemModifier ||
          m instanceof TerastallizeModifier ||
          m instanceof CollectedTypeModifier ||
          m instanceof AbilitySwitcherModifier ||
          m instanceof TypeSwitcherModifier ||
          m instanceof AnyAbilityModifier ||
          m instanceof TypeSacrificeModifier ||
          m instanceof AbilitySacrificeModifier ||
          m instanceof PassiveAbilitySacrificeModifier ||
          m instanceof AnyPassiveAbilityModifier ||
          m instanceof MoveSacrificeModifier ||
          m instanceof PokemonAltBuildModifier) {
        m.apply([ newPokemon, true ]);
      }
    }

    await this.scene.updateModifiers(true);
  }

  showRemoveUpgradesPopup(): void {
    const removableUpgrades = this.getRemovableMoveUpgradeModifiers();

    if (removableUpgrades.length === 0) {
      this.scene.ui.showText(i18next.t("modifierSelectUiHandler:noUpgradesToRemove"), null, () => {
        this.scene.ui.clearText();
      });
      return;
    }

    const options = removableUpgrades.map((item, index) => ({
      label: item.displayText,
      handler: () => {
        this.selectModifierForRemoval(item.modifier);
        return true;
      }
    }));

    options.push({
      label: i18next.t("modifierSelectUiHandler:cancel"),
      handler: () => {
        this.returnToModifierSelect();
        return true;
      }
    });

    const config = {
      options: options,
      maxOptions: 8,
      yOffset: 0
    };

    this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
  }

  setCallbackContext(typeOptions: any[], modifierSelectCallback: Function, rerollCost: any, draftOnly: boolean, uiMode?: Mode): void {
    this.storedTypeOptions = typeOptions;
    this.storedModifierSelectCallback = modifierSelectCallback;
    this.storedRerollCost = rerollCost;
    this.storedDraftOnly = draftOnly;
    if (uiMode !== undefined) {
      this.storedUIMode = uiMode;
    }
  }

  private returnToModifierSelect(): void {
    if (this.storedTypeOptions && this.storedModifierSelectCallback && this.storedRerollCost !== null) {
      this.scene.ui.setMode(this.storedUIMode, true, this.storedTypeOptions, this.storedModifierSelectCallback, this.storedRerollCost, this.storedDraftOnly);
    } else {
      this.scene.ui.revertMode();
    }
  }
}

export class ModifierOption extends Phaser.GameObjects.Container {
  public modifierTypeOption: ModifierTypeOption;
  private pb: Phaser.GameObjects.Sprite;
  private pbTint: Phaser.GameObjects.Sprite;
  private itemContainer: Phaser.GameObjects.Container;
  private item: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  private itemTint: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  private itemText: Phaser.GameObjects.Text;
  private itemTextChip: Phaser.GameObjects.Graphics;
  public itemCostText: Phaser.GameObjects.Text;
  public showCost: boolean;
  private itemContainerTargetScale: number = 1;
  private baseItemTextFontSizePx: number | null = null;
  private denseItemTextFontSizePx: number | null = null;
  private denseItemContainerTargetScale: number = 0.85;
  private baseItemTextTint: integer = 0xffffff;
  private focusLabelChipColors: { border: number; bg: number } | null = null;
  private _questIconBG: Phaser.GameObjects.Sprite | null = null;
  private _emberTimers: Phaser.Time.TimerEvent[] = [];
  private _emberVfx: Phaser.GameObjects.GameObject[] = [];
  private _emberParticleCounter: Phaser.Tweens.Tween | null = null;
  private _pixelateFx: Phaser.FX.Pixelate | null = null;
  private _pixelateTarget: Phaser.GameObjects.Sprite | null = null;
  private static _emberGlowTexKey = "ember_mat_glow";
  private static _emberSoftTexKey = "ember_mat_soft";
  private useSmitemsAtlas(): boolean {
    return this.modifierTypeOption.type.group === "glitch" ||
           this.modifierTypeOption.type.group === "perma";
  }

  constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption, showCost: boolean = false) {
    super(scene, x, y);

    this.modifierTypeOption = modifierTypeOption;
    this.showCost = showCost;
    this.setup();
  }

  setup() {
    if (this.modifierTypeOption && !this.modifierTypeOption.cost) {
      const getPb = (): Phaser.GameObjects.Sprite => {
        const pb = this.scene.add.sprite(0, -182, "pb", this.getPbAtlasKey(-this.modifierTypeOption.upgradeCount));
        pb.setScale(2);
        return pb;
      };

      this.pb = getPb();
      this.add(this.pb);

      this.pbTint = getPb();
      this.pbTint.setVisible(false);
      this.add(this.pbTint);
    }

    this.itemContainer = this.scene.add.container(0, 0);
    this.itemContainer.setScale(0.5);
    this.itemContainer.setAlpha(0);
    this.add(this.itemContainer);

    let item = null;

    const getItem = () => {
      if(!this.modifierTypeOption) {
        console.error("Modifier type option is null");
      }
      if (this.modifierTypeOption.type instanceof AddPokemonModifierType) {
        const newPokemon = (this.modifierTypeOption.type as AddPokemonModifierType).getPokemon();
        if (newPokemon.isFusion?.() && newPokemon.fusionSpecies) {
          item = (this.scene as BattleScene).addPokemonIcon(newPokemon, 0, 0, 0.5, 0.5);
        } else {
          item = this.scene.add.sprite(0, 0, newPokemon.getIconAtlasKey());
          item.setFrame(newPokemon.getIconId(false));
          if (item.frame.name !== newPokemon.getIconId(false)) {
            const temp = newPokemon.shiny;
            newPokemon.shiny = false;
            item.setTexture(newPokemon.getIconAtlasKey());
            item.setFrame(newPokemon.getIconId(false));
            newPokemon.shiny = temp;
          }
        }
        if (newPokemon.species?.generation === 20) {
          item.setScale(0.8);
        }
      } else if (this.modifierTypeOption.type instanceof PokemonAltBuildModifierType) {
        try {
          const altBuildType = this.modifierTypeOption.type as PokemonAltBuildModifierType;
          const altBuild = (altBuildType as any).altBuild;
          if (altBuild?.species) {
            const pokemonSpecies = getPokemonSpecies(altBuild.species);
            if (pokemonSpecies) {
              item = this.scene.add.sprite(0, 0, pokemonSpecies.getIconAtlasKey());
              item.setFrame(pokemonSpecies.getIconId(false));
              if (pokemonSpecies.generation === 20) {
                item.setScale(0.8);
              }
              if (item.postFX && typeof item.postFX.addColorMatrix === 'function') {
                const colorMatrix = item.postFX.addColorMatrix();
                colorMatrix.negative();
              }
            } else {
              item = this.scene.add.sprite(0, 0, "smitems", "pokemon_alt_build");
            }
          } else {
            item = this.scene.add.sprite(0, 0, "smitems", "pokemon_alt_build");
          }
        } catch (error) {
          console.warn("Failed to render alt build pokemon icon:", error);
          item = this.scene.add.sprite(0, 0, "smitems", "pokemon_alt_build");
        }
      } else if (this.modifierTypeOption.type?.group === "trainerBondAbility") {
        try {
          const championId = (this.scene as BattleScene).gameData?.selectedChampionId || (this.scene as BattleScene).gameData?.activeSkillTree?.championId || "apollo_diana";
          const key = ChampionUtils.getChampionSpriteKey(championId, (this.scene as BattleScene).gameData.gender);
          if (this.scene.textures.exists(key)) {
            item = this.scene.add.sprite(0, 0, key);
            const frame = item.frame;
            const maxDim = Math.max(frame.width, frame.height);
            const targetSize = 32;
            item.setScale(targetSize / maxDim);
          } else {
            item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems" : "items", this.modifierTypeOption.type.iconImage);
          }
        } catch {
          item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems" : "items", this.modifierTypeOption.type.iconImage);
        }
        item.setFlipX(true);
        if (item.postFX && typeof item.postFX.addColorMatrix === 'function') {
          const colorMatrix = item.postFX.addColorMatrix();
          colorMatrix.negative();
        }
      } else if (this.modifierTypeOption.type?.group === "teraAbility") {
        item = this.scene.add.sprite(0, 0, "items", "stellar_tera_shard");
        if (item.postFX && typeof item.postFX.addColorMatrix === 'function') {
          const colorMatrix = item.postFX.addColorMatrix();
          colorMatrix.negative();
        }
      } else if (this.modifierTypeOption.type instanceof ForbiddenFormUnlockModifierType) {
        const t = this.modifierTypeOption.type as ForbiddenFormUnlockModifierType;
        const key = t.iconAtlasKey || "pokemon_icons_glitch";
        const frame = t.iconFrame || "smitom";
        if (this.scene.textures.exists(key)) {
          item = this.scene.add.sprite(0, 0, key);
          if (!key.startsWith("pokemon_icons_mod_")) {
            item.setFrame(frame);
            if (item.frame && item.frame.name !== frame) {
              item.setFrame("smitom");
            }
          }
        } else {
          item = this.scene.add.sprite(0, 0, "pokemon_icons_glitch");
          item.setFrame(frame);
        }
      } else if (this.modifierTypeOption.type?.group === "rankup") {
        const rankType = this.modifierTypeOption.type as any;
        const atlasKey = rankType._rankUpIconAtlasKey;
        const frame = rankType._rankUpIconFrame;
        if (atlasKey && this.scene.textures.exists(atlasKey)) {
          item = this.scene.add.sprite(0, 0, atlasKey);
          if (frame !== undefined) {
            item.setFrame(frame);
          }
        } else {
          item = this.scene.add.sprite(0, 0, "pokemon_icons_0", "0");
        }
      } else if (this.modifierTypeOption.type instanceof QuestModifierType || this.modifierTypeOption.type instanceof QuestModifierTypeGenerator) {
        const questType = this.modifierTypeOption.type as QuestModifierType;
        const questData = questType.config?.questUnlockData;
        let speciesId: Species | undefined;
        let trainerType: TrainerType | undefined;
        if (questData?.questSpriteId) {
          if (questData.questId && this.scene.gameData.permaModifiers.isRivalBountyQuest(questData.questId)) {
            trainerType = questData.questSpriteId as unknown as TrainerType;
          } else {
            speciesId = questData.questSpriteId;
          }
        } else if (Array.isArray(questData?.rewardId) && questData.rewardId.length > 0 && typeof questData.rewardId[0] === "number") {
          speciesId = questData.rewardId[0];
        } else if (typeof questData?.rewardId === "number") {
          speciesId = questData.rewardId;
        }
        if (trainerType && trainerConfigs[trainerType]) {
          const config = trainerConfigs[trainerType];
          const spriteKey = config.getSpriteKey(false, false);
          item = this.scene.add.sprite(0, 0, spriteKey);
          item.setScale(0.3);
          if (item.texture.frameTotal > 1) {
            item.setFrame(0);
          }
          if (!this._questIconBG) {
            this._questIconBG = this.scene.add.sprite(0, 0, "smitems", "quest");
            this._questIconBG.setScale(0.5);
          }
        } else if (speciesId) {
          const pokemon = getPokemonSpecies(speciesId);
          item = this.scene.add.sprite(0, 0, pokemon.getIconAtlasKey());
          item.setFrame(pokemon.getIconId(false));
          item.setScale(0.75);
          if (!this._questIconBG) {
            this._questIconBG = this.scene.add.sprite(0, 0, "smitems", "quest");
            this._questIconBG.setScale(0.5);
          }
        } else {
          item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems" : "items", this.modifierTypeOption.type.iconImage);
          if (this.useSmitemsAtlas()) {
            item.setScale(0.5);
          }
        }
      } else {
        const useItemsAtlas = !this.useSmitemsAtlas();
        const isChampionGroup = this.modifierTypeOption.type?.group === "champion";
        const atlasKey = useItemsAtlas ? "items" : "smitems";
        const frame = isChampionGroup ? "protein" : this.modifierTypeOption.type.iconImage;
        item = this.scene.add.sprite(0, 0, atlasKey, frame);
        if (item.frame && item.frame.name !== frame && frame) {
          item.setFrame("pb");
        }
        if (!useItemsAtlas) {
          const baseScale = !this.modifierTypeOption.cost ? 0.4 : 0.35;
          const isEssence = frame === "modSoulCollected";
          item.setScale(isEssence ? baseScale / 1.5 : baseScale);
        } else if (this.modifierTypeOption.cost) {
          item.setScale(.5);
        }
      }
      return item;
    };

    this.item = getItem();
    if (this.modifierTypeOption.type instanceof AddTypeBallModifierType) {
      const targetType = (this.modifierTypeOption.type as AddTypeBallModifierType).targetType;
      applyTypeBallRecolor(this.scene as BattleScene, this.item as Phaser.GameObjects.Sprite, targetType, true);
    } else if (this.modifierTypeOption.type instanceof AddPokeballModifierType) {
      const pbType = (this.modifierTypeOption.type as AddPokeballModifierType).pokeballType;
      if (pbType === PokeballType.VOID_BALL) {
        applyVoidBallRecolor(this.scene as BattleScene, this.item as Phaser.GameObjects.Sprite, true);
        this.item.setAlpha(0.85);
      }
    }
    if (this.modifierTypeOption.type instanceof YuTmModifierType && this.item instanceof Phaser.GameObjects.Sprite) {
      try {
        if (this.item.postFX && typeof this.item.postFX.addColorMatrix === "function") {
          this.item.postFX.addColorMatrix().negative();
        }
      } catch {}
    }
    if (this.modifierTypeOption.type instanceof AddPokemonModifierType) {
      const pokemon = (this.modifierTypeOption.type as AddPokemonModifierType).getPokemon();
      if ((pokemon as any).isSignature === true) {
        try {
          if (this.item instanceof Phaser.GameObjects.Sprite) {
            if (this.item.postFX && typeof this.item.postFX.addColorMatrix === "function") {
              this.item.postFX.addColorMatrix().negative();
            }
          } else if (this.item instanceof Phaser.GameObjects.Container) {
            (this.item as Phaser.GameObjects.Container).list.forEach(child => {
              if (child instanceof Phaser.GameObjects.Sprite && child.postFX && typeof child.postFX.addColorMatrix === "function") {
                child.postFX.addColorMatrix().negative();
              }
            });
          }
        } catch {}
      }
    }
    if (this._questIconBG) {
      this.itemContainer.add(this._questIconBG);
    }
    this.itemContainer.add(this.item);

    if (!this.modifierTypeOption.cost) {
      this.itemTint = getItem();
      if (this.itemTint instanceof Phaser.GameObjects.Container) {
        (this.itemTint as Phaser.GameObjects.Container).list.forEach(child => {
          if (child instanceof Phaser.GameObjects.Sprite) {
            child.setTintFill(Phaser.Display.Color.GetColor(255, 192, 255));
          }
        });
      } else {
        (this.itemTint as Phaser.GameObjects.Sprite).setTintFill(Phaser.Display.Color.GetColor(255, 192, 255));
      }
      this.itemContainer.add(this.itemTint);
    }

    let itemLabel = this.modifierTypeOption.type?.name!;
    let useBBCode = false;
    let moveUpgradeSecondaryLabel: string | null = null;
    if (this.modifierTypeOption.type instanceof MoveUpgradeModifierType) {
      const muType = this.modifierTypeOption.type as MoveUpgradeModifierType;
      const moveName = allMoves[muType.moveId]?.name || "???";
      const rank = typeof muType.upgradeTier === "number" ? Utils.intToRoman(muType.upgradeTier) : "";
      const exSuffix = !muType.upgradeCategory ? ` ${i18next.t("moveUpgradeAttrs:EX", { defaultValue: "EX" })}` : "";
      itemLabel = `${moveName}${rank ? ` ${rank}` : ""}${exSuffix}`;
      const catLabel = muType.upgradeCategory
        ? i18next.t(`moveUpgradeAttrs:${muType.upgradeCategory}`)
        : i18next.t("moveUpgradeAttrs:extraEffectUpgrade");
      const flavorMatch = typeof catLabel === "string" ? catLabel.match(/\(([^)]+)\)/) : null;
      const flavor = flavorMatch?.[1] || (muType.upgradeCategory ? String(muType.upgradeCategory) : "EX");
      moveUpgradeSecondaryLabel = i18next.t("modifierSelectUiHandler:secondaryMoveUpgradeCategory", {
        moveName: moveName,
        category: flavor,
        defaultValue: `${flavor} Upgrade`,
      });
    }
    else if (this.modifierTypeOption.type instanceof AddPokemonModifierType) {
    }
    else if (this.modifierTypeOption.type instanceof TypeSwitcherModifierType) {
      itemLabel = this.modifierTypeOption.type.name;
    }
    else if (this.modifierTypeOption.type instanceof RandomStatSwitcherModifierType) {
      itemLabel = i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.statLabel", { defaultValue: "Stat Switcher" });
    }
    else if (this.modifierTypeOption.type instanceof ChampionPokemonStatBoosterModifierType) {
      itemLabel = itemLabel.replace(/\s*\[.*?\]\s*$/, "");
    }
    if (useBBCode) {
      this.itemText = addBBCodeTextObject(this.scene, 0, 35, itemLabel, TextStyle.PARTY, { fontSize: "47px", align: "center" }) as any;
    } else {
      this.itemText = addTextObject(this.scene, 0, 35, itemLabel, TextStyle.PARTY, { fontSize: "47px", align: "center" });
    }
    this.itemText.setOrigin(0.5, 0);
    this.itemText.setAlpha(0);
    this.baseItemTextTint = this.modifierTypeOption.type?.tier ? getModifierTierTextTint(this.modifierTypeOption.type?.tier) : 0xffffff;
    if (!useBBCode) {
      this.itemText.setTint(this.baseItemTextTint);
    }
    if (this.modifierTypeOption.type instanceof AddPokemonModifierType) {
      const addPokemon = (this.modifierTypeOption.type as AddPokemonModifierType).newPokemon;
      if (addPokemon?.species?.generation === 20 || addPokemon?.isFusion?.()) {
        this.itemText.setTint(0xffd700);
        this.baseItemTextTint = 0xffd700;
      }
    }
    this.itemTextChip = this.scene.add.graphics();
    this.itemTextChip.setVisible(false);
    this.add(this.itemTextChip);
    this.add(this.itemText);
    const styleAny: any = (this.itemText as any)?.style;
    const raw = typeof styleAny?.fontSize === "number" ? styleAny.fontSize : parseInt(`${styleAny?.fontSize ?? ""}`, 10);
    if (Number.isFinite(raw)) {
      this.baseItemTextFontSizePx = raw;
      this.denseItemTextFontSizePx = raw - 15;
    }

    if (moveUpgradeSecondaryLabel) {
      this.itemCostText = addTextObject(this.scene, 0, 45, moveUpgradeSecondaryLabel, TextStyle.WINDOW, { fontSize: "46px", align: "center" });
      this.itemCostText.setOrigin(0.5, 0);
      this.itemCostText.setAlpha(0);
      const tierColor = this.modifierTypeOption.type?.tier !== undefined
        ? getModifierTierTextTint(this.modifierTypeOption.type.tier)
        : 0xaaaaaa;
      this.itemCostText.setTint(tierColor);
      this.add(this.itemCostText);
    } else if (this.showCost) {
      this.itemCostText = addTextObject(this.scene, 0, 45, "", TextStyle.MONEY, { fontSize: "92px", align: "center" });

      this.itemCostText.setOrigin(0.5, 0);
      this.itemCostText.setAlpha(0);
      this.add(this.itemCostText);

      this.updateCostText();
    }
  }

  setItemTextVisible(visible: boolean): void {
    this.itemText.setVisible(visible);
  }

  setItemTextTint(tint: integer | null): void {
    this.itemText.setTint(tint === null ? this.baseItemTextTint : tint);
  }

  private redrawFocusLabelChip(): void {
    this.itemTextChip.clear();
    if (!this.focusLabelChipColors || this.itemText.alpha <= 0) {
      this.itemTextChip.setVisible(false);
      return;
    }
    const padX = 8;
    const padY = 4;
    const radius = 6;
    const textW = this.itemText.displayWidth;
    const textH = this.itemText.displayHeight;
    const x = -textW / 2 - padX;
    const y = this.itemText.y - padY;
    const w = textW + padX * 2;
    const h = textH + padY * 2;
    const { border, bg } = this.focusLabelChipColors;
    this.itemTextChip.fillStyle(bg, 0.85);
    this.itemTextChip.lineStyle(2, border, 0.85);
    this.itemTextChip.fillRoundedRect(x, y, w, h, radius);
    this.itemTextChip.strokeRoundedRect(x, y, w, h, radius);
    this.itemTextChip.setVisible(true);
  }

  setFocusLabelChip(colors: { border: number; bg: number } | null): void {
    this.focusLabelChipColors = colors;
    this.redrawFocusLabelChip();
  }

  getFocusContentBounds(): Phaser.Geom.Rectangle {
    const a = this.itemContainer.getBounds();
    const b = this.itemText.getBounds();
    let u = Phaser.Geom.Rectangle.Union(a, b);
    if (this.itemCostText) {
      u = Phaser.Geom.Rectangle.Union(u, this.itemCostText.getBounds());
    }
    return u;
  }

  getFocusLabelChipWidth(): number {
    const padX = 8;
    return this.itemText.displayWidth + padX * 2;
  }

  getFocusLabelChipRect(): Phaser.Geom.Rectangle {
    const padX = 8;
    const padY = 4;
    const textW = this.itemText.displayWidth;
    const textH = this.itemText.displayHeight;
    const x = -textW / 2 - padX;
    const y = this.itemText.y - padY;
    const w = textW + padX * 2;
    const h = textH + padY * 2;
    return new Phaser.Geom.Rectangle(x, y, w, h);
  }

  initDenseRowStyle(): void {
    this.itemContainerTargetScale = this.denseItemContainerTargetScale;
    if (this.denseItemTextFontSizePx !== null) {
      this.itemText.setFontSize(`${this.denseItemTextFontSizePx}px`);
    }
  }

  setDenseFocus(focused: boolean): void {
    this.itemContainerTargetScale = focused ? 1 : this.denseItemContainerTargetScale;
    if (this.itemContainer.alpha > 0) {
      this.itemContainer.setScale(this.itemContainerTargetScale);
    }
    if (this.baseItemTextFontSizePx !== null) {
      const fs = focused ? this.baseItemTextFontSizePx : (this.denseItemTextFontSizePx ?? this.baseItemTextFontSizePx);
      this.itemText.setFontSize(`${fs}px`);
    }
    if (focused) {
      this.itemText.setShadow(0, 0, undefined);
      this.itemText.setStroke("#424242", 14);
      this.redrawFocusLabelChip();
    } else {
      const { shadowColor, shadowXpos, shadowYpos } = getTextStyleOptions(TextStyle.PARTY, (this.scene as BattleScene).uiTheme);
      this.itemText.setShadow(shadowXpos, shadowYpos, shadowColor);
      this.itemText.setStroke("#000000", 0);
      this.setFocusLabelChip(null);
    }
  }

  applyDenseRowStyle(): void {
    this.initDenseRowStyle();
  }

  public getItemNameBottomY(): number {
    return this.showCost ? this.itemText.y - 3 : this.itemText.y;
  }

  show(remainingDuration: integer, upgradeCountOffset: integer) {
    const battleScene = this.scene as BattleScene;
    const isPathContext = battleScene.pathNodeContext !== null || battleScene.skillTreeModifierContext;
    const pathSpeedMultiplier = isPathContext ? 0.833 : 1.0;

    const toMs = (raw: any, fallback: number): number =>
      typeof raw === "number" ? raw : (typeof raw?.value === "number" ? raw.value : fallback);

    const getPathAdjustedDuration = (duration: integer): integer => {
      const adjustedDuration = Math.floor(duration * pathSpeedMultiplier);
      const raw: any = Utils.rewardSpeedHandler(adjustedDuration);
      return toMs(raw, adjustedDuration) as unknown as integer;
    };

    if (!this.modifierTypeOption.cost) {
      this.scene.tweens.add({
        targets: this.pb,
        y: 0,
        duration: getPathAdjustedDuration(1250),
        ease: "Bounce.Out"
      });

      let lastValue = 1;
      let bounceCount = 0;
      let bounce = false;

      this.scene.tweens.addCounter({
        from: 1,
        to: 0,
        duration: getPathAdjustedDuration(1250),
        ease: "Bounce.Out",
        onUpdate: t => {
          if (!this.scene) {
            return;
          }
          const value = t.getValue();
          if (!bounce && value > lastValue) {
            battleScene.playSound("se/pb_bounce_1", { volume: 1 / ++bounceCount });
            bounce = true;
          } else if (bounce && value < lastValue) {
            bounce = false;
          }
          lastValue = value;
        }
      });

      if (!isPathContext) {
        for (let u = 0; u < this.modifierTypeOption.upgradeCount; u++) {
          const upgradeIndex = u;
          const delayBase = (remainingDuration - 2000 * (this.modifierTypeOption.upgradeCount - (upgradeIndex + 1 + upgradeCountOffset))) as unknown as number;
          const delayMs = toMs(Utils.rewardSpeedHandler(delayBase as unknown as integer), delayBase);
          this.scene.time.delayedCall(delayMs, () => {
            battleScene.playSound("se/upgrade", { rate: 1 + 0.25 * upgradeIndex });
            this.pbTint.setPosition(this.pb.x, this.pb.y);
            this.pbTint.setTintFill(0xFFFFFF);
            this.pbTint.setAlpha(0);
            this.pbTint.setVisible(true);
            this.scene.tweens.add({
              targets: this.pbTint,
              alpha: 1,
              duration: toMs(Utils.rewardSpeedHandler(1000 as unknown as integer), 1000),
              ease: "Sine.easeIn",
              onComplete: () => {
                this.pb.setTexture("pb", this.getPbAtlasKey(-this.modifierTypeOption.upgradeCount + (upgradeIndex + 1)));
                this.scene.tweens.add({
                  targets: this.pbTint,
                  alpha: 0,
                  duration: toMs(Utils.rewardSpeedHandler(750 as unknown as integer), 750),
                  ease: "Sine.easeOut",
                  onComplete: () => {
                    this.pbTint.setVisible(false);
                  }
                });
              }
            });
          });
        }
      } else {
        if (this.modifierTypeOption.upgradeCount > 0) {
          this.pb.setTexture("pb", this.getPbAtlasKey(0));
        }
      }
    }

    const revealBase = (remainingDuration + 2000) as unknown as number;
    const revealDelay = isPathContext
      ? getPathAdjustedDuration((remainingDuration + 1500) as unknown as integer)
      : (toMs(Utils.rewardSpeedHandler(revealBase as unknown as integer), revealBase) as unknown as integer);

    this.scene.time.delayedCall(revealDelay, () => {
      if (!this.scene) {
        return;
      }

      if (!this.modifierTypeOption.cost) {
        this.pb.setTexture("pb", `${this.getPbAtlasKey(0)}_open`);
        battleScene.playSound("se/pb_rel");

        this.scene.tweens.add({
          targets: this.pb,
          duration: getPathAdjustedDuration(500),
          delay: getPathAdjustedDuration(250),
          ease: "Sine.easeIn",
          alpha: 0,
          onComplete: () => this.pb.destroy()
        });
      }

      this.scene.tweens.add({
        targets: this.itemContainer,
        duration: getPathAdjustedDuration(500),
        ease: "Elastic.Out",
        scale: this.itemContainerTargetScale,
        alpha: 1
      });
      if (!this.modifierTypeOption.cost) {
        this.scene.tweens.add({
          targets: this.itemTint,
          alpha: 0,
          duration: getPathAdjustedDuration(500),
          ease: "Sine.easeIn",
          onComplete: () => this.itemTint.destroy()
        });
      }
      this.scene.tweens.add({
        targets: this.itemText,
        duration: getPathAdjustedDuration(500),
        alpha: 1,
        y: 22,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          if (!this.scene) {
            return;
          }
          this.redrawFocusLabelChip();
        }
      });
      if (this.itemCostText) {
        this.scene.tweens.add({
          targets: this.itemCostText,
          duration: getPathAdjustedDuration(500),
          alpha: 1,
          y: this.getItemCostTextY(),
          ease: "Cubic.easeInOut"
        });
      }

      this.additionalDisplayTweens();
    });
  }

  public showFast(durationMs: number = 20): void {
    if (this.pb && this.pb.active) {
      this.pb.setAlpha(0);
    }
    if (this.pbTint && this.pbTint.active) {
      this.pbTint.setVisible(false);
    }
    if (this.itemTint && this.itemTint.active) {
      this.itemTint.setAlpha(0);
    }

    this.scene.tweens.add({
      targets: this.itemContainer,
      duration: durationMs,
      ease: "Sine.easeOut",
      scale: this.itemContainerTargetScale,
      alpha: 1
    });
    this.scene.tweens.add({
      targets: this.itemText,
      duration: durationMs,
      alpha: 1,
      y: 22,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.redrawFocusLabelChip();
      }
    });
    if (this.itemCostText) {
      this.scene.tweens.add({
        targets: this.itemCostText,
        duration: durationMs,
        alpha: 1,
        y: this.getItemCostTextY(),
        ease: "Sine.easeOut"
      });
    }

    this.additionalDisplayTweens();
  }

  public showCardFade(durationMs: number = 800): void {
    if (this.pb && this.pb.active) {
      this.pb.setAlpha(0);
    }
    if (this.pbTint && this.pbTint.active) {
      this.pbTint.setVisible(false);
    }
    if (this.itemTint && this.itemTint.active) {
      this.itemTint.setAlpha(0);
    }

    if (this.itemContainer) {
      this.itemContainer.setAlpha(0);
      this.itemContainer.setScale(this.itemContainerTargetScale * 0.8);
    }
    if (this.itemText) {
      this.itemText.setAlpha(0);
    }

    this.scene.tweens.add({
      targets: this.itemContainer,
      duration: durationMs,
      ease: "Back.easeOut",
      scale: this.itemContainerTargetScale,
      alpha: 1
    });
    this.scene.tweens.add({
      targets: this.itemText,
      duration: durationMs * 0.75,
      delay: durationMs * 0.25,
      alpha: 1,
      y: 22,
      ease: "Cubic.easeInOut",
      onComplete: () => {
        this.redrawFocusLabelChip();
      }
    });
    if (this.itemCostText) {
      this.scene.tweens.add({
        targets: this.itemCostText,
        duration: durationMs * 0.75,
        delay: durationMs * 0.25,
        alpha: 1,
        y: this.getItemCostTextY(),
        ease: "Cubic.easeInOut"
      });
    }

    this.additionalDisplayTweens();
  }

  public cancelEmberEffects(): void {
    for (const t of this._emberTimers) t.remove();
    this._emberTimers = [];
    if (this._emberParticleCounter) {
      this._emberParticleCounter.stop();
      this._emberParticleCounter = null;
    }
    for (const g of this._emberVfx) {
      this.scene.tweens.killTweensOf(g);
      g.destroy();
    }
    this._emberVfx = [];
    if (this._pixelateFx && this._pixelateTarget) {
      const fx = this._pixelateTarget.preFX || this._pixelateTarget.postFX;
      if (fx) fx.remove(this._pixelateFx);
      this._pixelateFx = null;
      this._pixelateTarget = null;
    }
    this.scene.tweens.killTweensOf(this.itemContainer);
    if (this.itemText) this.scene.tweens.killTweensOf(this.itemText);
    if (this.itemCostText) this.scene.tweens.killTweensOf(this.itemCostText);
  }

  public static ensureEmberTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists(ModifierOption._emberGlowTexKey)) {
      const size = 64;
      const tex = scene.textures.createCanvas(ModifierOption._emberGlowTexKey, size, size);
      const ctx = tex.getContext();
      const cx = size / 2;
      const cy = size / 2;
      const g = ctx.createRadialGradient(cx, cy + 16, 0, cx, cy, size / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    if (!scene.textures.exists(ModifierOption._emberSoftTexKey)) {
      const size = 16;
      const tex = scene.textures.createCanvas(ModifierOption._emberSoftTexKey, size, size);
      const ctx = tex.getContext();
      const r = size / 2;
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.6, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }

  private static mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = Math.imul(s ^ (s >>> 15), 0x735a2d97);
      s = Math.imul(s ^ (s >>> 15), 0x345d67ad);
      return ((s ^= s >>> 16) >>> 0) / 4294967296;
    };
  }

  static emberCompensatedMs(baseMs: number, gameSpeed: number): number {
    if (baseMs <= 0 || gameSpeed <= 1) return baseMs;
    const effective = gameSpeed >= 6 ? gameSpeed / 2 + 1 : gameSpeed;
    if (effective === gameSpeed) return baseMs;
    return Math.ceil(baseMs * gameSpeed / effective);
  }

  private static getEmberRarity(type: ModifierType | null | undefined): SkillTreeRarity {
    if (!type) return SkillTreeRarity.COMMON;
    if (type instanceof ForbiddenFormUnlockModifierType) {
      const data = (type as any).getTooltipData?.();
      if (data?.isSmitty || type.candidate?.kind === "UNI_SMITTY") return SkillTreeRarity.LEGENDARY;
      return SkillTreeRarity.MASTER;
    }
    const tier = type.tier != null ? type.tier : (type.getOrInferTier ? type.getOrInferTier() : null);
    switch (tier) {
      case ModifierTier.MEH:
      case ModifierTier.COMMON:
        return SkillTreeRarity.COMMON;
      case ModifierTier.GREAT:
        return SkillTreeRarity.GREAT;
      case ModifierTier.ULTRA:
        return SkillTreeRarity.ULTRA;
      case ModifierTier.ROGUE:
        return SkillTreeRarity.ROGUE;
      case ModifierTier.MASTER:
        return SkillTreeRarity.MASTER;
      case ModifierTier.LUXURY:
        return SkillTreeRarity.LEGENDARY;
      default:
        return SkillTreeRarity.COMMON;
    }
  }

  public static readonly EMBER_RARITY_COLORS: Record<string, { glow: number[]; particle: number[] }> = (() => {
    const hexToRgb = (hex: number): number[] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
    const map: Record<string, { glow: number[]; particle: number[] }> = {};
    for (const rarity of [SkillTreeRarity.COMMON, SkillTreeRarity.GREAT, SkillTreeRarity.ULTRA, SkillTreeRarity.ROGUE, SkillTreeRarity.MASTER, SkillTreeRarity.LEGENDARY]) {
      const rgb = hexToRgb(getUpgradeRarityColors(rarity).border);
      map[rarity] = { glow: rgb, particle: rgb };
    }
    return map;
  })();

  public static readonly EMBER_RARITY_SOUNDS: Record<string, string> = {
    [SkillTreeRarity.COMMON]: "se/shing",
    [SkillTreeRarity.GREAT]: "se/shing",
    [SkillTreeRarity.ULTRA]: "battle_anims/PRSFX- Foresight2",
    [SkillTreeRarity.ROGUE]: "battle_anims/PRSFX- Camouflage",
    [SkillTreeRarity.MASTER]: "battle_anims/PRSFX- Oblivion Wing2",
    [SkillTreeRarity.LEGENDARY]: "battle_anims/PRSFX- Quiver Dance",
  };

  public showEmberMaterialize(durationMs: number = 800, cardIndex: number = 0): void {
    this.cancelEmberEffects();
    if ((this.scene as BattleScene).animationLoadMode === 0) {
      this.forceReveal();
      return;
    }
    if ((this.scene as BattleScene).animationLoadMode === 1) {
      if (this.pb?.active) this.pb.setAlpha(0);
      if (this.pbTint?.active) this.pbTint.setVisible(false);
      if (this.itemTint?.active) this.itemTint.setAlpha(0);
      this.itemContainer.setAlpha(0);
      this.itemContainer.setScale(this.itemContainerTargetScale);
      if (this.itemText) this.itemText.setAlpha(0);
      if (this.itemCostText) this.itemCostText.setAlpha(0);
      this.scene.tweens.add({
        targets: [this.itemContainer, this.itemText, this.itemCostText].filter(Boolean),
        alpha: 1,
        duration: 400,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.itemText.y = 22;
          if (this.itemCostText?.active) this.itemCostText.y = this.getItemCostTextY();
          this.redrawFocusLabelChip();
        }
      });
      this.additionalDisplayTweens();
      return;
    }
    ModifierOption.ensureEmberTextures(this.scene);

    if (this.pb?.active) this.pb.setAlpha(0);
    if (this.pbTint?.active) this.pbTint.setVisible(false);
    if (this.itemTint?.active) this.itemTint.setAlpha(0);

    if (this.itemContainer) {
      this.itemContainer.setAlpha(0);
      this.itemContainer.setScale(this.itemContainerTargetScale);
    }
    if (this.itemText) this.itemText.setAlpha(0);
    if (this.itemCostText) this.itemCostText.setAlpha(0);

    const rarity = ModifierOption.getEmberRarity(this.modifierTypeOption?.type);
    const rarityColors = ModifierOption.EMBER_RARITY_COLORS[rarity] || ModifierOption.EMBER_RARITY_COLORS[SkillTreeRarity.COMMON];
    const revealSound = ModifierOption.EMBER_RARITY_SOUNDS[rarity] || "se/shing";

    const glowTexKey = ModifierOption._emberGlowTexKey;
    const softTexKey = ModifierOption._emberSoftTexKey;
    const hasGlow = this.scene.textures.exists(glowTexKey);
    const hasSoft = this.scene.textures.exists(softTexKey);

    const vfxParent = this.parentContainer || this.scene.add.container(0, 0);

    let glow: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    if (hasGlow) {
      const g = this.scene.add.image(this.x, this.y + 4, glowTexKey);
      g.setScale((67 * 1.4) / 64);
      g.setAlpha(0);
      g.setTint(Phaser.Display.Color.GetColor(rarityColors.glow[0], rarityColors.glow[1], rarityColors.glow[2]));
      glow = g;
    } else {
      const g = this.scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.GetColor(rarityColors.glow[0], rarityColors.glow[1], rarityColors.glow[2]), 0.3);
      g.fillCircle(this.x, this.y + 4, 47);
      g.setAlpha(0);
      glow = g;
    }
    const glowIdx = vfxParent.getIndex(this);
    if (glowIdx >= 0) {
      vfxParent.addAt(glow, glowIdx);
    } else {
      vfxParent.add(glow);
    }
    if (vfxParent.getIndex(glow) > 1) {
      vfxParent.moveTo(glow, 1);
    }
    const bgChild = vfxParent.list?.[0] as Phaser.GameObjects.Image | undefined;
    const isHighTierBg = bgChild?.texture?.key === "level_up" || (bgChild?.tintTopLeft !== undefined && bgChild.tintTopLeft !== 0xffffff);
    const peakAlpha = isHighTierBg ? 0.7 : 0.4;
    if (isHighTierBg) {
      glow.setBlendMode(Phaser.BlendModes.ADD);
    }
    this._emberVfx.push(glow);

    const gs = (this.scene as BattleScene).gameSpeed;
    const emberMs = (ms: number) => ModifierOption.emberCompensatedMs(ms, gs);

    this.scene.tweens.add({
      targets: glow,
      alpha: peakAlpha,
      duration: emberMs(durationMs * 0.4),
      ease: "Quad.easeIn"
    });

    const particleImages: Phaser.GameObjects.Image[] = [];
    for (let j = 0; j < 10; j++) {
      if (hasSoft) {
        const img = this.scene.add.image(this.x, this.y, softTexKey);
        img.setVisible(false);
        vfxParent.add(img);
        particleImages.push(img);
        this._emberVfx.push(img);
      }
    }

    if (particleImages.length > 0) {
      const FL = 0.65;
      const CARD_CENTER_Y = 4;
      const DRIFT_Y = 117;
      const J_STEP = 4;
      const X_SPREAD = 34;

      const tickParticles = (p: number) => {
        if (!this.active) {
          this._emberParticleCounter?.stop();
          return;
        }
        if (p <= 0.03 || p >= FL + 0.2) {
          for (const img of particleImages) img.setVisible(false);
          if (p >= FL + 0.2 && this._emberParticleCounter) {
            this._emberParticleCounter.stop();
            this._emberParticleCounter = null;
          }
          return;
        }
        const ea = Math.min(1, p / 0.06) * Math.max(0, 1 - (p - FL) / 0.2);
        const Rf = ModifierOption.mulberry32(cardIndex * 10 + 1);
        for (let j = 0; j < particleImages.length; j++) {
          const img = particleImages[j];
          const ex = this.x + (Rf() - 0.5) * X_SPREAD;
          const ey = this.y + CARD_CENTER_Y - (p * DRIFT_Y * Rf() + j * J_STEP);
          const radius = 2 + Rf() * 2;
          const alpha = ea * 0.6 * Rf();
          const rc = rarityColors.particle;
          const cVar = Rf() * 40 - 20;
          const pr = Math.min(255, Math.max(0, rc[0] + cVar));
          const pg = Math.min(255, Math.max(0, rc[1] + cVar));
          const pb = Math.min(255, Math.max(0, rc[2] + cVar));
          img.setVisible(alpha > 0.01);
          img.setPosition(ex, ey);
          img.setScale((radius / 8) * 1.25);
          img.setTint(Phaser.Display.Color.GetColor(Math.floor(pr), Math.floor(pg), Math.floor(pb)));
          img.setAlpha(alpha);
        }
      };

      tickParticles(0);
      this._emberParticleCounter = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: emberMs(durationMs),
        onUpdate: (t: Phaser.Tweens.Tween) => tickParticles(t.getValue()),
        onComplete: () => {
          for (const img of particleImages) img.setVisible(false);
          this._emberParticleCounter = null;
        }
      });
    }

    const revealDelay = Math.min(375, durationMs * 0.6);
    const revealDuration = durationMs - revealDelay;
    const pixelateDuration = revealDuration * 0.95;

    const revealTimer = this.scene.time.delayedCall(emberMs(revealDelay), () => {
      if (!this.active) return;

      if (glow?.active) {
        this.scene.tweens.add({
          targets: glow,
          alpha: isHighTierBg ? 0.35 : 0.2,
          duration: emberMs(revealDuration * 0.5),
          ease: "Quad.easeOut"
        });
      }

      this.itemContainer.setAlpha(1);
      this.itemText.setAlpha(1);
      this.itemText.setY(22);
      if (this.itemCostText) {
        this.itemCostText.setAlpha(1);
        this.itemCostText.setY(this.getItemCostTextY());
      }
      this.redrawFocusLabelChip();

      const revealConfig = revealSound.startsWith("battle_anims/") ? { volumeGroup: "se" } : {};
      (this.scene as BattleScene).playSound(revealSound, revealConfig);

      let pixelateFx: Phaser.FX.Pixelate | null = null;
      if (this.postFX && typeof this.postFX.addPixelate === "function") {
        pixelateFx = this.postFX.addPixelate(20);
        this._pixelateFx = pixelateFx;
        this._pixelateTarget = this as any;

        this.scene.tweens.add({
          targets: pixelateFx,
          amount: -1,
          duration: emberMs(pixelateDuration),
          ease: "Linear",
          onComplete: () => {
            if (this.postFX) {
              this.postFX.remove(pixelateFx!);
            }
            this._pixelateFx = null;
            this._pixelateTarget = null;
          }
        });
      }
    });
    this._emberTimers.push(revealTimer);

    this.additionalDisplayTweens();
  }

  public isRevealed(): boolean {
    return this.itemContainer.alpha > 0 || this.itemText.alpha > 0;
  }

  public forceReveal(): void {
    this.cancelEmberEffects();

    if (this.pb && this.pb.active) {
      this.pb.setAlpha(0);
    }
    if (this.pbTint && this.pbTint.active) {
      this.pbTint.setVisible(false);
    }

    this.itemContainer.setAlpha(1);
    this.itemContainer.setScale(this.itemContainerTargetScale);

    if (this.itemTint && this.itemTint.active) {
      this.itemTint.setAlpha(0);
    }

    this.itemText.setAlpha(1);
    this.itemText.y = 22;

    if (this.itemCostText && this.itemCostText.active) {
      this.itemCostText.setAlpha(1);
      this.itemCostText.y = this.getItemCostTextY();
    }

    this.redrawFocusLabelChip();
  }

  getPbAtlasKey(tierOffset: integer = 0) {
    return getPokeballAtlasKey((this.modifierTypeOption.type?.tier! + tierOffset) as integer as PokeballType);
  }

  protected getItemCostTextY(): number {
    return 35;
  }

  protected additionalDisplayTweens(): void {
  }

  updateCostText(): void {
    const scene = this.scene as BattleScene;
    const cost = Overrides.WAIVE_ROLL_FEE_OVERRIDE ? 0 : this.modifierTypeOption.cost;
    const textStyle = cost <= scene.money ? TextStyle.MONEY : TextStyle.PARTY_RED;

    const formattedMoney = Utils.formatMoney(scene.moneyFormat, cost);

    this.itemCostText.setText(i18next.t("modifierSelectUiHandler:itemCost", { formattedMoney }));
    this.itemCostText.setColor(getTextColor(textStyle, false, scene.uiTheme));
    this.itemCostText.setShadowColor(getTextColor(textStyle, true, scene.uiTheme));
  }
}