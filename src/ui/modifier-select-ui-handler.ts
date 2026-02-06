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
    FusePokemonModifierType,
    ModifierType
} from "../modifier/modifier-type";
import { getPokeballAtlasKey, PokeballType } from "../data/pokeball";
import { addTextObject, getTextStyleOptions, getModifierTierTextTint, getTextColor, TextStyle, addBBCodeTextObject, getBBCodeFrag } from "./text";
import { addWindow } from "./ui-theme";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { Mode } from "./ui";
import { LockModifierTiersModifier, PokemonHeldItemModifier, PersistentModifier, MoveUpgradeModifier, CollectedTypeModifier, PokemonFormChangeItemModifier, PokemonAltBuildModifier, TerastallizeModifier, AbilitySwitcherModifier, TypeSwitcherModifier, AnyAbilityModifier, TypeSacrificeModifier, AbilitySacrificeModifier, PassiveAbilitySacrificeModifier, AnyPassiveAbilityModifier, MoveSacrificeModifier } from "../modifier/modifier";
import { ModifierTier } from "../modifier/modifier-tier";
import { allAbilities } from "../data/ability";
import { Abilities } from "../enums/abilities";
import { Stat, getStatName } from "../data/pokemon-stat";
import { Nature, getNatureName, getNatureStatMultiplier } from "../data/nature";
import { pokemonFormChanges, SpeciesFormChangeItemTrigger } from "../data/pokemon-forms";
import { pokemonEvolutions } from "../data/pokemon-evolutions";
import { PlayerPokemon } from "../field/pokemon";
import PokemonData from "../system/pokemon-data";
import { MoveUpgradeTooltipUtils } from "./move-upgrade-tooltip";
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
import { getFusedSpeciesName, getPokemonSpecies } from "#app/data/pokemon-species.js";
import { SkillTreeMode } from "#app/phases/skill-tree-phase";
import { SkillTreeRewardType } from "#app/system/skill-tree-data.js";
import { SettingKeys } from "#app/system/settings/settings.js";
import { Device } from "../enums/devices";
import { SpeciesFormKey } from "../enums/species-form-key";

export const SHOP_OPTIONS_ROW_LIMIT = 12;
const ALT_SPEEDUP = 0.425;

export default class ModifierSelectUiHandler extends AwaitableUiHandler {
  protected modifierContainer: Phaser.GameObjects.Container;
  protected rerollButtonContainer: Phaser.GameObjects.Container;
  private permaRerollButtonContainer: Phaser.GameObjects.Container;
  protected lockRarityButtonContainer: Phaser.GameObjects.Container;
  protected transferButtonContainer: Phaser.GameObjects.Container;
  private checkButtonContainer: Phaser.GameObjects.Container;
  private rerollCostText: Phaser.GameObjects.Text;
  private permaRerollCostText: Phaser.GameObjects.Text;
  private lockRarityButtonText: Phaser.GameObjects.Text;
  protected moveInfoOverlay : DynamicMoveInfoOverlay;
  private moveInfoOverlayActive : boolean = false;

  private upgradeTooltipContainer: Phaser.GameObjects.Container | null = null;
  private upgradeTooltipBg: Phaser.GameObjects.Graphics | null = null;
  private upgradeTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private upgradeTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private upgradeTooltipTitle: Phaser.GameObjects.Text | null = null;
  private upgradeTooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private upgradeTooltipBody: BBCodeText | null = null;

  private showDetailsHintContainer: Phaser.GameObjects.Container | null = null;
  private showDetailsHintKeySprite: Phaser.GameObjects.Sprite | null = null;
  private showDetailsHintLabel: Phaser.GameObjects.Text | null = null;

  private partyDetailsActive: boolean = false;
  private partyDetailsIndex: integer = 0;
  private partyDetailsPartnerIndex: integer = 0;
  private partyDetailsHeaderLines: string[] = [];
  private partyDetailsPartyLines: string[] = [];
  private partyDetailsParty: PlayerPokemon[] = [];
  private partyDetailsRarity: SkillTreeRarity | null = null;
  private partyDetailsContext: { kind: "STAT_SWITCHER"; stat1: Stat; stat2: Stat } | { kind: "MINT"; targetNature: Nature } | { kind: "STAT_SACRIFICE"; stat: Stat } | { kind: "MOVE_SACRIFICE" } | { kind: "FUSION" } | { kind: "BASE_STAT_BOOST"; stat: Stat; multiplier: number } | { kind: "SOUL_DEW" } | null = null;
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

  private partyDetailsTooltipContainer: Phaser.GameObjects.Container | null = null;
  private partyDetailsTooltipBg: Phaser.GameObjects.Graphics | null = null;
  private partyDetailsTooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private partyDetailsTooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private partyDetailsTooltipTitle: Phaser.GameObjects.Text | null = null;
  private partyDetailsTooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private partyDetailsTooltipBody: BBCodeText | null = null;
  private partyDetailsNavContainer: Phaser.GameObjects.Container | null = null;
  private partyDetailsNavLabel: Phaser.GameObjects.Text | null = null;

  private readonly TOOLTIP_WIDTH = 625 / 6;
  private readonly TOOLTIP_BASE_HEIGHT = 375 / 6;
  private readonly TOOLTIP_OFFSET_X = 20;
  private readonly TOOLTIP_TITLE_BAR_HEIGHT = 12;
  private readonly TOOLTIP_RARITY_BAR_HEIGHT = 6;
  private readonly TOOLTIP_RADIUS = 0;
  private readonly UPGRADE_TOOLTIP_TITLE_BAR_COLOR = 0xFFD700;
  private readonly UPGRADE_TOOLTIP_SUBHEADER_BAR_COLOR = 0x00BFFF;

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
  private multiHitWarning: boolean = false;
  private secondaryEffectNote: boolean = false;
  private flinchWarning: boolean = false;
  private lineCount: integer = 0;

  private storedModifierSelectCallback: Function | null = null;
  private storedTypeOptions: any[] | null = null;
  private storedRerollCost: any | null = null;
  private storedDraftOnly: boolean = false;
  private removalReturnMenu: (() => void) | null = null;

  private patternOverlay: Phaser.GameObjects.Container | null = null;
  private patternCreated: boolean = false;

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

    this.transferButtonContainer = this.scene.add.container((this.scene.game.canvas.width - this.checkButtonWidth) / 6 - 21, -64);
    this.transferButtonContainer.setName("transfer-btn");
    this.transferButtonContainer.setVisible(false);
    ui.add(this.transferButtonContainer);

    const transferButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:transfer"), TextStyle.PARTY);
    transferButtonText.setName("text-transfer-btn");
    transferButtonText.setOrigin(1, 0);
    this.transferButtonContainer.add(transferButtonText);

    this.checkButtonContainer = this.scene.add.container((this.scene.game.canvas.width) / 6 - 1, -64);
    this.checkButtonContainer.setName("use-btn");
    this.checkButtonContainer.setVisible(false);
    ui.add(this.checkButtonContainer);

    const checkButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:checkTeam"), TextStyle.PARTY);
    checkButtonText.setName("text-use-btn");
    checkButtonText.setOrigin(1, 0);
    this.checkButtonContainer.add(checkButtonText);

    this.rerollButtonContainer = this.scene.add.container(16, -64);
    this.rerollButtonContainer.setName("reroll-brn");
    this.rerollButtonContainer.setVisible(false);
    ui.add(this.rerollButtonContainer);

    const rerollButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:reroll"), TextStyle.PARTY);
    rerollButtonText.setName("text-reroll-btn");
    rerollButtonText.setOrigin(0, 0);
    this.rerollButtonContainer.add(rerollButtonText);

    this.rerollCostText = addTextObject(this.scene, 0, 0, "", TextStyle.MONEY);
    this.rerollCostText.setName("text-reroll-cost");
    this.rerollCostText.setOrigin(0, 0);
    this.rerollCostText.setPositionRelative(rerollButtonText, rerollButtonText.displayWidth + 5, 1);
    this.rerollButtonContainer.add(this.rerollCostText);

    this.permaRerollButtonContainer = this.scene.add.container(16, -64);
    this.permaRerollButtonContainer.setVisible(false);
    ui.add(this.permaRerollButtonContainer);

    const permaRerollButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:reroll"), TextStyle.PARTY);
    permaRerollButtonText.setOrigin(0, 0);
    this.permaRerollButtonContainer.add(permaRerollButtonText);

    this.permaRerollCostText = addTextObject(this.scene, 0, 0, "", TextStyle.MONEY);
    this.permaRerollCostText.setName("text-permaReroll-cost");
    this.permaRerollCostText.setOrigin(0, 0);
    this.permaRerollCostText.setPositionRelative(permaRerollButtonText, permaRerollButtonText.displayWidth + 5, 1);
    this.permaRerollButtonContainer.add(this.permaRerollCostText);

    this.lockRarityButtonContainer = this.scene.add.container(16, -64);
    this.lockRarityButtonContainer.setVisible(false);
    ui.add(this.lockRarityButtonContainer);

    this.lockRarityButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:lockRarities"), TextStyle.PARTY);
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
      this.moveInfoOverlay.active = this.moveInfoOverlayActive;
      return false;
    }

    if (args.length !== 5 || !(args[1] instanceof Array) || !args[1].length || !(args[2] instanceof Function)) {
      return false;
    }

    super.show(args);

    this.getUi().clearText();

    this.player = args[0];
    this.forcedDraftSelection = args[4] as boolean;

    const hasTransferableItems = this.player && !!this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length;
    const hasRemovableItems = this.getMoveUpgradeModifiersCount() > 0 || this.getRemovableHeldItemModifiers().length > 0;
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
        const sliceWidth = (this.scene.game.canvas.width / 6.5) / (rowOptions.length + 2);
        const option = new ModifierOption(this.scene, sliceWidth * (col + 1) + (sliceWidth * 0.5) + 5, ((-this.scene.game.canvas.height / 12) - (this.scene.game.canvas.height / 32) - (40 - (28 * row - 1))), shopTypeOptions[m], true);
        option.setScale(0.375);
        this.scene.add.existing(option);
        this.modifierContainer.add(option);

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

    this.scene.getModifierBar().getAll().forEach((icon: any) => icon.setAlpha(0.1));
    this.scene.getModifierBar(true).getAll().forEach((icon: any) => icon.setAlpha(0.1));
    this.scene.ui.permaModifierBar.getAll().forEach((icon: any) => icon.setAlpha(0.1));

    this.scene.showShopOverlay(750 * this.scene.gameSpeed);
    this.scene.updateBiomeWaveText();
    this.scene.updateMoneyText();

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

    this.scene.tweens.addCounter({
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

    this.scene.time.delayedCall(getPathAdjustedDuration(1000 + effectiveUpgradeCount * 2000), () => {
      for (const shopOption of this.shopOptionsRows.flat()) {
        shopOption.show(0, 0);
      }
    });

    this.scene.time.delayedCall(getPathAdjustedDuration(4000 + effectiveUpgradeCount * 2000), () => {
      if (hasTransferableItems || hasRemovableItems) {
        this.transferButtonContainer.setAlpha(0);
        this.transferButtonContainer.setVisible(true);
        this.scene.tweens.add({
          targets: this.transferButtonContainer,
          alpha: 1,
          duration: getPathAdjustedDuration(250)
        });
      }

      this.rerollButtonContainer.setAlpha(0);
      this.permaRerollButtonContainer.setAlpha(0);
      this.checkButtonContainer.setAlpha(0);
      this.lockRarityButtonContainer.setAlpha(0);
      this.rerollButtonContainer.setVisible(true);
      this.permaRerollButtonContainer.setVisible(!this.forcedDraftSelection);
      this.checkButtonContainer.setVisible(true);
      this.lockRarityButtonContainer.setVisible(canLockRarities);

      this.scene.tweens.add({
        targets: [ this.rerollButtonContainer, this.permaRerollButtonContainer, this.lockRarityButtonContainer, this.checkButtonContainer ],
        alpha: 1,
        duration: getPathAdjustedDuration(250)
      });

      const updateCursorTarget = () => {
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
          if (this.partyDetailsIndex > 0) {
            this.partyDetailsIndex--;
            this.updatePartyDetails();
            ui.playSelect();
          }
          return true;
        case Button.DOWN:
          if (this.partyDetailsIndex < this.partyDetailsParty.length - 1) {
            this.partyDetailsIndex++;
            this.updatePartyDetails();
            ui.playSelect();
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
        case Button.STATS:
          this.exitPartyDetailsMode();
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
          this.moveInfoOverlayActive = this.moveInfoOverlay.active;
          this.moveInfoOverlay.setVisible(false);
          this.moveInfoOverlay.active = false;
        }
      }
    } else if (button === Button.CANCEL) {
      if (this.player && !this.forcedDraftSelection) {
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
          originalOnActionInput(-1);
          this.moveInfoOverlayActive = this.moveInfoOverlay.active;
          this.moveInfoOverlay.setVisible(false);
          this.moveInfoOverlay.active = false;
        }
      }
    } else if (button === Button.CYCLE_ABILITY) {
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (type && !(type instanceof MoveUpgradeModifierType)) {
        const sessionsWon = ((this.scene as BattleScene).gameData?.gameStats?.sessionsWon || 0);
        const tooltipLocked = !Overrides.BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE && sessionsWon <= 0;
        if (tooltipLocked) {
          return false;
        }
        if (this.scene.modifierTooltipsEnabled) {
          if (this.upgradeTooltipContainer) {
            this.setModifierTooltipsEnabled(false);
            this.hideUpgradeTooltip();
            this.moveInfoOverlay.clear();
            this.moveInfoOverlay.setVisible(false);
            this.moveInfoOverlay.active = false;
            this.updateShowDetailsHint(option, true);
            this.setCursor(this.cursor);
            success = true;
          }
        } else {
          this.setModifierTooltipsEnabled(true);
          this.updateShowDetailsHint(option, false);
          this.setCursor(this.cursor);
          success = true;
        }
      }
    } else if (button === Button.STATS) {
      if (this.partyDetailsContext && this.scene.modifierTooltipsEnabled && this.upgradeTooltipContainer) {
        this.enterPartyDetailsMode();
        success = true;
      } else {
        const option = this.getCurrentSelectedOption();
        const type = option?.modifierTypeOption?.type;
        if (type instanceof MoveUpgradeModifierType && this.upgradeTooltipContainer && this.moveUpgradePreviewCategory) {
          this.enterMoveUpgradeDetailsMode();
          success = true;
        }
      }
    } else {
      switch (button) {
        case Button.UP:
          if (this.rowCursor === 0 && this.lockRarityButtonContainer.visible && this.cursor === (this.getRowItems(0) - 1)) {
            success = this.setCursor(0);
          } else if (this.rowCursor < this.shopOptionsRows.length + 1) {
            success = this.setRowCursor(this.rowCursor + 1);
          }
          break;
        case Button.DOWN:
          if (this.rowCursor) {
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
          } else if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else if (this.rowCursor === 1 && this.rerollButtonContainer.visible) {
            success = this.setRowCursor(0);
          }
          break;
        case Button.RIGHT:
          if (!this.rowCursor) {
            if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
              success = this.setCursor(this.cursor + 1);
            }
          } else if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
            success = this.setCursor(this.cursor + 1);
          } else if (this.rowCursor === 1 && this.transferButtonContainer.visible) {
            success = this.setRowCursor(0);
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
    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
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

    this.cursorObj.setScale(this.rowCursor === 1 ? 2 : this.rowCursor >= 2 ? 1.5 : 1);

    this.moveInfoOverlay.clear();
    this.hideUpgradeTooltip();
    if (this.rowCursor) {
      const option = options[this.cursor];
      if (!option) {
        console.warn(`Option at index ${this.cursor} is undefined!`);
        return ret;
      }

      if (this.rowCursor < 2) {
        this.cursorObj.setPosition(option.x - 20, option.y + 2);
      } else {
        this.cursorObj.setPosition(option.x - 12, option.y + 1);
      }

      if (denseFocusActive) {
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

      const desc = type.getDescription(this.scene);
      ui.showText(desc);

      const isMoveUpgrade = type instanceof MoveUpgradeModifierType;
      const canShowCustomTooltip = this.shouldRenderCustomTooltip(type);
      const sessionsWon = ((this.scene as BattleScene).gameData?.gameStats?.sessionsWon || 0);
      const tooltipLocked = !Overrides.BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE && sessionsWon <= 0;
      const showHint = !this.scene.modifierTooltipsEnabled && !isMoveUpgrade && !tooltipLocked;
      this.updateShowDetailsHint(option, showHint);

      if (this.rowCursor === 1) {
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
        this.modifierContainer.bringToTop(this.cursorObj);
        if (this.showDetailsHintContainer && this.showDetailsHintContainer.visible) {
          this.scene.ui.bringToTop(this.showDetailsHintContainer);
        }
      }

      if (!this.scene.modifierTooltipsEnabled && !isMoveUpgrade) {
        return ret;
      }

      if (!canShowCustomTooltip) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = type.getDescription(this.scene);
        this.showModifierTooltip(title, subtitle, body, rarity);
        return ret;
      }

      if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
        this.moveInfoOverlay.show(this.scene.getUpgradedMove(allMoves[type.moveId]));
        const rarity = this.getModifierRarity(type);
        const title = allMoves[type.moveId].name;
        const subtitle = this.getRarityText(rarity);
        const isXM = type instanceof AnyTmModifierType;
        const body = this.generateTmXmTooltipBody(type.moveId, isXM);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if(type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType || type instanceof PermaPartyAbilityModifierType) {
        this.moveInfoOverlay.show(type.ability.description);
        const rarity = this.getModifierRarity(type);
        const abilityName = allAbilities[type.ability.id]?.name || Abilities[type.ability.id];
        const isPassive = type instanceof AnyPassiveAbilityModifierType;
        const title = abilityName;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateAbilityItemTooltipBody(type.ability.id, isPassive);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if(type instanceof MoveUpgradeModifierType) {
        this.moveInfoOverlay.show(type.getDescription(this.scene));
        this.showUpgradeTooltip(type);
      }
      else if (type instanceof AddPokemonModifierType) {
        const pokemon = type.getPokemon() as PlayerPokemon;
        const rarity = this.getModifierRarity(type);
        const lvLabel = i18next.t("saveSlotSelectUiHandler:lv");
        const title = `${pokemon.name} ${lvLabel} ${pokemon.level}`;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateAddPokemonTooltipBody(pokemon);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof AbilitySwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateAbilitySwitcherTooltipBody();
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof RandomStatSwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
        const stat1 = (type as any).stat1 as Stat;
        const stat2 = (type as any).stat2 as Stat;
        const stat1Name = getStatName(stat1, true);
        const stat2Name = getStatName(stat2, true);
        const descText = i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.description", {
          stat1: stat1Name,
          stat2: stat2Name,
          defaultValue: `Swaps ${stat1Name} and ${stat2Name}`
        });
        const headerLines = [
          getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)
        ];
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const baseStats = pokemon.getSpeciesForm().baseStats;
          const v1 = baseStats[stat1];
          const v2 = baseStats[stat2];
          let c1 = "#e8e8a8";
          let c2 = "#e8e8a8";
          if (v1 > v2) {
            c1 = "#78c850";
            c2 = "#e13d3d";
          } else if (v2 > v1) {
            c1 = "#e13d3d";
            c2 = "#78c850";
          }
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=${c1}]${stat1Name} ${v1}[/color] <-> [color=${c2}]${stat2Name} ${v2}[/color]`;
        });
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "STAT_SWITCHER", stat1, stat2 });
      }
      else if (type instanceof TypeSwitcherModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateTypeSwitcherTooltipBody(type.newPrimaryType, type.newSecondaryType);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof EvolutionItemModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateEvolutionItemTooltipBody(type);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof FormChangeItemModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateFormChangeTooltipBody(type);
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof PokemonNatureChangeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
        const natureDesc = getNatureName(type.nature, true, true, true);
        const headerLines = [
          getBBCodeFrag(`${i18next.t("pokemonInfoContainer:nature", { defaultValue: "Nature" })}: ${natureDesc}`, TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)
        ];
        const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
        const revertedStatsLabel = i18next.t("modifierSelectUiHandler:revertedStats", { defaultValue: "reverted stats" });
        const natureStats = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
        const incStat = natureStats.find(s => getNatureStatMultiplier(type.nature, s) > 1) ?? null;
        const decStat = natureStats.find(s => getNatureStatMultiplier(type.nature, s) < 1) ?? null;
        const incName = incStat !== null ? getStatName(incStat, true) : "";
        const decName = decStat !== null ? getStatName(decStat, true) : "";
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const currentNature = pokemon.getNature();
          if (currentNature === type.nature) {
            return `[color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`;
          }
          if (incStat === null || decStat === null) {
            return `[color=#ffcc00]${pokemon.name}[/color]: [color=#e8e8a8]${revertedStatsLabel}[/color]`;
          }
          const baseStats = pokemon.getSpeciesForm().baseStats;
          const incValue = baseStats[incStat];
          const decValue = baseStats[decStat];
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${incName}: ${incValue}[/color] | [color=#e13d3d]${decName}: ${decValue}[/color]`;
        });
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "MINT", targetNature: type.nature });
      }
      else if (type instanceof ChampionPokemonStatBoosterModifierType) {
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

        const pregenArgs = type.getPregenArgs?.() as [string, Stat[], number?, Type[]?] | undefined;
        const stats = pregenArgs?.[1] ?? [];
        const boostPercent = pregenArgs?.[2] ?? 0.01;
        const championTypes = pregenArgs?.[3] ?? [];

        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const hasTypeMatch = championTypes.length > 0 ? championTypes.some(t => pokemon.isOfType(t)) : true;
          const effectiveStats = (championTypes.length > 0 && stats.length > 1 && !hasTypeMatch)
            ? [stats[0]]
            : stats;
          const baseStats = pokemon.getSpeciesForm().baseStats;
          const chunks = effectiveStats.map(s => {
            const pre = baseStats[s];
            const post = Math.floor(pre * (1 + boostPercent));
            const statName = getStatName(s, true);
            return `[color=#ffffff]${statName}:[/color] [color=#e13d3d]${pre}[/color] -> [color=#78c850]${post}[/color]`;
          });
          return `[color=#ffcc00]${pokemon.name}[/color]: ${chunks.join(" | ")}`;
        });

        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "BASE_STAT_BOOST", stat: stats[0] ?? Stat.HP, multiplier: 1 + boostPercent });
      }
      else if (type instanceof PokemonBaseStatBoosterModifierType || type instanceof PlayerPokemonBaseStatBoosterModifierType) {
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
        const stat = ((type as any).getPregenArgs?.()[0] ?? null) as Stat | null;
        const multiplier = type instanceof PokemonBaseStatBoosterModifierType ? 1.1 : 1.01;
        const statName = stat !== null ? getStatName(stat) : "";
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const pre = stat !== null ? pokemon.getSpeciesForm().baseStats[stat] : 0;
          const post = stat !== null ? Math.floor(pre * multiplier) : 0;
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=#ffffff]${statName}:[/color] [color=#e13d3d]${pre}[/color] -> [color=#78c850]${post}[/color]`;
        });
        if (stat !== null) {
          this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "BASE_STAT_BOOST", stat, multiplier });
        } else {
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
          const baseStats = pokemon.getSpeciesForm().baseStats;
          const incName = getStatName(incStat, true);
          const decName = getStatName(decStat, true);
          const incPre = Math.floor(baseStats[incStat] * getNatureStatMultiplier(nature, incStat));
          const incPost = Math.floor(baseStats[incStat] * (getNatureStatMultiplier(nature, incStat) + 0.1));
          const decPre = Math.floor(baseStats[decStat] * getNatureStatMultiplier(nature, decStat));
          const decPost = Math.floor(baseStats[decStat] * (getNatureStatMultiplier(nature, decStat) - 0.1));
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${incName}: ${incPre} -> ${incPost}[/color] | [color=#e13d3d]${decName}: ${decPre} -> ${decPost}[/color]`;
        });
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "SOUL_DEW" });
      }
      else if (type instanceof StatSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const stat = type.getStat();
        const descText = i18next.t("modifierType:ModifierType.StatSacrificeModifierType.description", {
          stat: getStatName(stat),
          defaultValue: "Release a Pokémon to boost another pokemon's stat by 15%."
        });
        const candidatesLabel = i18next.t("modifierSelectUiHandler:sacrificeCandidates", { defaultValue: "Candidates" });
        const headerLines = [
          getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme),
          getBBCodeFrag(i18next.t("modifierType:common.essenceAlternativeCost"), TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(`${candidatesLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)
        ];
        const statName = getStatName(stat);
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const essenceDisplay = this.formatEssenceDisplay(pokemon);
          const pre = pokemon.getSpeciesForm().baseStats[stat];
          const post = Math.floor(pre * 1.15);
          return `[color=#ffcc00]${pokemon.name}[/color]: [color=#ffffff]${statName}:[/color] [color=#e13d3d]${pre}[/color] -> [color=#78c850]${post}[/color] (${essenceDisplay})`;
        });
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "STAT_SACRIFICE", stat });
      }
      else if (type instanceof MoveSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const descText = i18next.t("modifierType:ModifierType.MoveSacrificeModifierType.description", {
          defaultValue: "Sacrifice a party member to transfer their attributes"
        });
        const candidatesLabel = i18next.t("modifierSelectUiHandler:sacrificeCandidates", { defaultValue: "Candidates" });
        const headerLines = [
          getBBCodeFrag(descText, TextStyle.WINDOW, uiTheme),
          getBBCodeFrag(i18next.t("modifierType:common.essenceAlternativeCost"), TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(`${candidatesLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)
        ];
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(pokemon => {
          const essenceDisplay = this.formatEssenceDisplay(pokemon);
          return `[color=#ffcc00]${pokemon.name}[/color] (${essenceDisplay})`;
        });
        this.showPartyDetailsTooltip(title, subtitle, rarity, headerLines, partyLines, party, { kind: "MOVE_SACRIFICE" });
      }
      else if (type instanceof TypeSacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateSacrificeTooltipBody('Type');
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof AbilitySacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateSacrificeTooltipBody('Ability');
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof PassiveAbilitySacrificeModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const body = this.generateSacrificeTooltipBody('Passive');
        this.showModifierTooltip(title, subtitle, body, rarity);
      }
      else if (type instanceof FusePokemonModifierType) {
        const rarity = this.getModifierRarity(type);
        const title = type.name;
        const subtitle = this.getRarityText(rarity);
        const uiTheme = this.scene.uiTheme;
        const raw = type.getDescription(this.scene);
        const intro = raw.split("\n\n")[0].trim();
        const rulesHeader = i18next.t("modifierSelectUiHandler:fusionRulesHeader", { defaultValue: "Fusion uses both Pokémon's base stats accordingly:" });
        const pick1Label = i18next.t("modifierSelectUiHandler:fusionPick1Label", { defaultValue: "1) Highest NATURE Stat" });
        const pick2Label = i18next.t("modifierSelectUiHandler:fusionPick2Label", { defaultValue: "2) Compare 2nd Highest Stat" });
        const pick3Label = i18next.t("modifierSelectUiHandler:fusionPick3Label", { defaultValue: "3) Average all other stats" });
        const headerLines = [
          getBBCodeFrag(intro, TextStyle.WINDOW, uiTheme),
          "",
          getBBCodeFrag(rulesHeader, TextStyle.WINDOW, uiTheme),
          getBBCodeFrag(pick1Label, TextStyle.WINDOW, uiTheme),
          getBBCodeFrag(pick2Label, TextStyle.WINDOW, uiTheme),
          getBBCodeFrag(pick3Label, TextStyle.WINDOW, uiTheme)
        ];
        const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
        const party = this.scene.getParty() as PlayerPokemon[];
        const partyLines = party.map(p => `[color=#ffcc00]${p.name}[/color]`);
        this.showPartyDetailsTooltip(
          title,
          subtitle,
          rarity,
          [...headerLines, "", getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme)],
          partyLines,
          party,
          { kind: "FUSION" }
        );
      }
    } else {
      this.updateShowDetailsHint(null, false);
      const buttonLayout = this.getButtonLayout();
      const buttonInfo = buttonLayout[cursor];

      if (buttonInfo) {
        this.cursorObj.setPosition(buttonInfo.x, buttonInfo.y);
        ui.showText(i18next.t(buttonInfo.descKey));
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
    return !this.scene.modifierTooltipsEnabled || this.upgradeTooltipContainer !== null;
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
      return this.scene.modifierTooltipsEnabled;
    }
    const option = this.getCurrentSelectedOption();
    const type = option?.modifierTypeOption?.type;
    if (type instanceof MoveUpgradeModifierType) {
      return this.moveUpgradePreviewCategory !== null && this.moveUpgradePreviewMaxTier > 1;
    }
    return this.scene.modifierTooltipsEnabled;
  }

  private setModifierTooltipsEnabled(enabled: boolean): void {
    this.scene.gameData.saveSetting(SettingKeys.Modifier_Tooltips, enabled ? 1 : 0);
  }

  private shouldRenderCustomTooltip(type: any): boolean {
    if (type instanceof MoveUpgradeModifierType) {
      return true;
    }
    const sessionsWon = ((this.scene as BattleScene).gameData?.gameStats?.sessionsWon || 0);
    if (!Overrides.BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE && sessionsWon <= 0) {
      return false;
    }
    return type instanceof TmModifierType ||
      type instanceof AnyTmModifierType ||
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
      type instanceof PokemonNatureChangeModifierType ||
      type instanceof StatSacrificeModifierType ||
      type instanceof MoveSacrificeModifierType ||
      type instanceof PokemonBaseStatBoosterModifierType ||
      type instanceof PlayerPokemonBaseStatBoosterModifierType ||
      type instanceof ChampionPokemonStatBoosterModifierType ||
      type instanceof TypeSacrificeModifierType ||
      type instanceof AbilitySacrificeModifierType ||
      type instanceof PassiveAbilitySacrificeModifierType ||
      type?.localeKey === "modifierType:ModifierType.SOUL_DEW";
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
    const keySprite = this.scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
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
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    this.showDetailsHintLabel = label;
    this.showDetailsHintContainer.add([keySprite, label]);
    this.showDetailsHintContainer.setDepth(10000000000);
    this.showDetailsHintContainer.setInteractive(new Phaser.Geom.Rectangle(-40, -8, 120, 16), Phaser.Geom.Rectangle.Contains);
    this.showDetailsHintContainer.on("pointerdown", () => {
      const option = this.getCurrentSelectedOption();
      const type = option?.modifierTypeOption?.type;
      if (!type) {
        return;
      }
      const sessionsWon = ((this.scene as BattleScene).gameData?.gameStats?.sessionsWon || 0);
      const tooltipLocked = !Overrides.BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE && sessionsWon <= 0;
      if (tooltipLocked) {
        return;
      }
      if (!this.scene.modifierTooltipsEnabled) {
        this.setModifierTooltipsEnabled(true);
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
      this.showDetailsHintLabel.setText(i18next.t("modifierSelectUiHandler:showDetails", { defaultValue: "Show Details" }));
    }
    this.showDetailsHintContainer.setPosition(option.x, option.y + option.getItemNameBottomY());
    this.showDetailsHintContainer.setVisible(true);
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
    container.on("pointerdown", () => {
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
    container.on("pointerdown", () => {
      this.enterPartyDetailsMode();
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
    container.on("pointerdown", () => {
      this.exitPartyDetailsMode();
    });
    return container;
  }

  private enterPartyDetailsMode(): void {
    if (!this.partyDetailsContext || !this.upgradeTooltipContainer || !this.upgradeTooltipBody || this.partyDetailsParty.length === 0) {
      return;
    }
    this.partyDetailsActive = true;
    this.partyDetailsIndex = 0;
    this.partyDetailsPartnerIndex = 0;
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
    if (this.partyDetailsButton) {
      this.partyDetailsButton.setVisible(true);
    }
    if (this.partyBackButton) {
      this.partyBackButton.setVisible(false);
    }
    if (this.partyDetailsTooltipContainer) {
      this.partyDetailsTooltipContainer.setVisible(false);
    }
    this.updatePartyDetailsMainBody();
  }

  private updatePartyDetails(): void {
    this.updatePartyDetailsMainBody();
    this.updatePartyDetailsTooltip();
  }

  private updatePartyDetailsMainBody(): void {
    if (!this.partyDetailsContext || !this.upgradeTooltipBody) {
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
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const bodyY = barsHeight + padding;

    this.partyDetailsTooltipContainer = this.scene.add.container(0, 0);
    this.partyDetailsTooltipContainer.setVisible(false);

    this.partyDetailsTooltipBg = this.scene.add.graphics();
    this.partyDetailsTooltipTitleBarBg = this.scene.add.graphics();
    this.partyDetailsTooltipRarityBarBg = this.scene.add.graphics();

    this.partyDetailsTooltipTitle = addTextObject(
      this.scene,
      tooltipWidth / 2,
      this.TOOLTIP_TITLE_BAR_HEIGHT / 2,
      "",
      TextStyle.SUMMARY_GOLD,
      { fontSize: "40px", fontStyle: "bold" }
    );
    this.partyDetailsTooltipTitle.setOrigin(0.5, 0.5);

    this.partyDetailsTooltipSubtitle = addTextObject(
      this.scene,
      tooltipWidth / 2,
      this.TOOLTIP_TITLE_BAR_HEIGHT + (this.TOOLTIP_RARITY_BAR_HEIGHT / 2),
      "",
      TextStyle.WINDOW,
      { fontSize: "35px" }
    );
    this.partyDetailsTooltipSubtitle.setOrigin(0.5, 0.5);

    this.partyDetailsTooltipBody = this.createColoredComparisonText(padding, bodyY, "");
    this.applyBbCodeWordWrap(this.partyDetailsTooltipBody, tooltipWidth, padding);

    const buttonRowHeight = 10;
    this.partyDetailsNavContainer = this.createPartyDetailsNavRow(tooltipWidth, padding, buttonRowHeight);
    this.partyDetailsNavContainer.setVisible(false);

    this.partyDetailsTooltipContainer.add([
      this.partyDetailsTooltipBg,
      this.partyDetailsTooltipTitleBarBg,
      this.partyDetailsTooltipRarityBarBg,
      this.partyDetailsTooltipTitle,
      this.partyDetailsTooltipSubtitle,
      this.partyDetailsTooltipBody,
      this.partyDetailsNavContainer
    ]);

    this.upgradeTooltipContainer.add(this.partyDetailsTooltipContainer);
    this.upgradeTooltipContainer.bringToTop(this.partyDetailsTooltipContainer);
  }

  private createPartyDetailsNavRow(tooltipWidth: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(tooltipWidth / 2, 0);
    const left = this.scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", () => {
      if (this.shiftFusionPartner(-1)) {
        this.getUi().playSelect();
      }
    });
    const right = this.scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", () => {
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
    const baseStats = pokemon.getSpeciesForm().baseStats;
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
    const baseStats = pokemon.getSpeciesForm().baseStats;
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

  private getStatSacrificeBeforeAfterStatsBody(pokemon: PlayerPokemon, stat: Stat): string {
    const baseStats = pokemon.getSpeciesForm().baseStats;
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const beforeStats = {} as Record<Stat, number>;
    const afterStats = {} as Record<Stat, number>;
    for (const s of statOrder) {
      beforeStats[s] = baseStats[s];
      afterStats[s] = baseStats[s];
    }
    afterStats[stat] = Math.floor(beforeStats[stat] * 1.15);
    return this.buildBeforeAfterStatsBody(beforeStats, afterStats);
  }

  private getBaseStatBoostBeforeAfterStatsBody(pokemon: PlayerPokemon, stat: Stat, multiplier: number): string {
    const baseStats = pokemon.getSpeciesForm().baseStats;
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
    const baseStats = pokemon.getSpeciesForm().baseStats;
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
    if (!pokemon) {
      this.partyDetailsTooltipContainer.setVisible(false);
      return;
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
    } else if (this.partyDetailsContext.kind === "FUSION") {
      const party = this.partyDetailsParty;
      const partners = this.getFusionPartnerIndices(party, this.partyDetailsIndex);
      if (!partners.length) {
        const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
        bodyText = `[color=#888888]${noEffectLabel}[/color]`;
        this.partyDetailsNavContainer?.setVisible(false);
        this.partyDetailsTooltipTitle.setText(pokemon.name);
      } else {
        if (this.partyDetailsPartnerIndex < 0) {
          this.partyDetailsPartnerIndex = 0;
        }
        if (this.partyDetailsPartnerIndex >= partners.length) {
          this.partyDetailsPartnerIndex = partners.length - 1;
        }
        const partner = party[partners[this.partyDetailsPartnerIndex]];
        const fusedName = getFusedSpeciesName(pokemon.species.getName(pokemon.formIndex), partner.species.getName(partner.formIndex));
        bodyText = this.getFusionPreviewDetailsBody(pokemon, partner);
        subtitleText = i18next.t("battleInfo:fusionTooltipTitle", { defaultValue: "Fusion" });
        this.partyDetailsTooltipTitle.setText(fusedName);
        if (this.partyDetailsNavContainer && this.partyDetailsNavLabel) {
          this.partyDetailsNavContainer.setVisible(true);
          this.partyDetailsNavLabel.setText(`${this.partyDetailsPartnerIndex + 1}/${partners.length}`);
        }
      }
    }

    if (this.partyDetailsContext.kind !== "FUSION") {
      this.partyDetailsTooltipTitle.setText(pokemon.name);
      if (this.partyDetailsNavContainer) {
        this.partyDetailsNavContainer.setVisible(false);
      }
    }
    this.partyDetailsTooltipSubtitle.setText(subtitleText);
    this.partyDetailsTooltipSubtitle.setTint(rarityColors.border);

    this.partyDetailsTooltipBody.setText(bodyText);
    this.applyBbCodeWordWrap(this.partyDetailsTooltipBody, this.TOOLTIP_WIDTH, 6);

    const padding = 6;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const buttonRowHeight = 10;
    const tooltipHeight = barsHeight + this.partyDetailsTooltipBody.displayHeight + (padding * 2) + padding + (this.partyDetailsNavContainer && this.partyDetailsNavContainer.visible ? (buttonRowHeight + padding) : 0);

    this.partyDetailsTooltipBg.clear();
    this.drawTooltipGradientBackground(this.partyDetailsTooltipBg, 0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);
    this.partyDetailsTooltipBg.lineStyle(0.5, 0xffffff, 0.5);
    this.partyDetailsTooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);

    this.partyDetailsTooltipTitleBarBg.clear();
    this.partyDetailsTooltipTitleBarBg.fillStyle(rarityColors.border, 0.65);
    this.partyDetailsTooltipTitleBarBg.fillRect(0, 0, tooltipWidth, this.TOOLTIP_TITLE_BAR_HEIGHT);

    this.partyDetailsTooltipRarityBarBg.clear();
    this.partyDetailsTooltipRarityBarBg.fillStyle(rarityColors.bg, 0.7);
    this.partyDetailsTooltipRarityBarBg.fillRect(0, this.TOOLTIP_TITLE_BAR_HEIGHT, tooltipWidth, this.TOOLTIP_RARITY_BAR_HEIGHT);

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
    const layout = [
      { x: 6, y: this.lockRarityButtonContainer.visible ? -72 : -60, descKey: "modifierSelectUiHandler:rerollDesc" }
    ];

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
    const rarity = (tier && category) ? getUpgradeRarityFromTier(tier, maxTier) : SkillTreeRarity.LEGENDARY;
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
    this.upgradeTooltipContainer.setDepth(10000000000);
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const buttonRowHeight = 10;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const bodyY = barsHeight + padding;

    this.upgradeTooltipTitle = addTextObject(this.scene, tooltipWidth / 2, this.TOOLTIP_TITLE_BAR_HEIGHT / 2, titleText, TextStyle.SUMMARY_GOLD, { fontSize: "40px", fontStyle: "bold" });
    this.upgradeTooltipTitle.setOrigin(0.5, 0.5);

    this.upgradeTooltipSubtitle = addTextObject(this.scene, tooltipWidth / 2, this.TOOLTIP_TITLE_BAR_HEIGHT + (this.TOOLTIP_RARITY_BAR_HEIGHT / 2), subtitleText, TextStyle.WINDOW, { fontSize: "35px" });
    this.upgradeTooltipSubtitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipSubtitle.setTint(rarityColors.border);

    this.upgradeTooltipBody = this.createColoredComparisonText(padding, bodyY, bodyText);
    this.applyBbCodeWordWrap(this.upgradeTooltipBody, tooltipWidth, padding);

    const enableDetails = this.moveUpgradePreviewCategory !== null && this.moveUpgradePreviewMaxTier > 1;
    const buttonRowCount = enableDetails ? (this.moveUpgradeDetailsActive ? 2 : 1) : 0;
    const bodyHeight = this.upgradeTooltipBody.displayHeight;
    const tooltipHeight = buttonRowCount > 0
      ? barsHeight + bodyHeight + (padding * 3) + (buttonRowHeight * buttonRowCount)
      : barsHeight + bodyHeight + (padding * 2);

    this.upgradeTooltipBg = this.scene.add.graphics();
    this.drawTooltipGradientBackground(this.upgradeTooltipBg, 0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);
    this.upgradeTooltipBg.lineStyle(0.5, 0xffffff, 0.5);
    this.upgradeTooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);

    this.upgradeTooltipTitleBarBg = this.scene.add.graphics();
    this.upgradeTooltipTitleBarBg.fillStyle(rarityColors.border, 0.65);
    this.upgradeTooltipTitleBarBg.fillRect(0, 0, tooltipWidth, this.TOOLTIP_TITLE_BAR_HEIGHT);

    this.upgradeTooltipRarityBarBg = this.scene.add.graphics();
    this.upgradeTooltipRarityBarBg.fillStyle(rarityColors.bg, 0.7);
    this.upgradeTooltipRarityBarBg.fillRect(0, this.TOOLTIP_TITLE_BAR_HEIGHT, tooltipWidth, this.TOOLTIP_RARITY_BAR_HEIGHT);

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
      this.upgradeTooltipBody
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
    container.on("pointerdown", () => this.enterMoveUpgradeDetailsMode());
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
    container.on("pointerdown", () => this.exitMoveUpgradeDetailsMode());
    return container;
  }

  private createMoveUpgradeNavRow(tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const buttonY = tooltipHeight - padding - (buttonRowHeight * 1.5);
    const container = this.scene.add.container(tooltipWidth / 2, buttonY);
    const left = this.scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", () => {
      if (this.moveUpgradePreviewTier > this.moveUpgradeCurrentTier) {
        this.moveUpgradePreviewTier--;
        this.showMoveUpgradeTierPreviewTooltip();
      }
    });

    const right = this.scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", () => {
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

    this.destroyUpgradeTooltipContainerOnly();
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
    const textObj = addBBCodeTextObject(this.scene, x, y, comparisonText, TextStyle.WINDOW, { fontSize: "40px" });
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

  private hideUpgradeTooltip(): void {
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
    this.partyDetailsMainTooltipHeight = 0;
    this.partyDetailsButton = null;
    this.partyBackButton = null;
    this.partyDetailsTooltipContainer = null;
    this.partyDetailsTooltipBg = null;
    this.partyDetailsTooltipTitleBarBg = null;
    this.partyDetailsTooltipRarityBarBg = null;
    this.partyDetailsTooltipTitle = null;
    this.partyDetailsTooltipSubtitle = null;
    this.partyDetailsTooltipBody = null;
    this.partyDetailsNavContainer = null;
    this.partyDetailsNavLabel = null;
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

  private destroyUpgradeTooltipContainerOnly(): void {
    if (this.upgradeTooltipContainer) {
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
    const abilities: Abilities[] = [];
    const currentForm = pokemon.isFusion()
      ? pokemon.fusionSpecies!.forms[pokemon.fusionFormIndex] || pokemon.fusionSpecies
      : pokemon.species.forms[pokemon.formIndex] || pokemon.species;

    if ((currentForm as any).ability1) abilities.push((currentForm as any).ability1);
    if ((currentForm as any).ability2) abilities.push((currentForm as any).ability2);
    if ((currentForm as any).abilityHidden) abilities.push((currentForm as any).abilityHidden);

    const activeIndex = pokemon.isFusion() ? pokemon.fusionAbilityIndex : pokemon.abilityIndex;
    return { abilities, activeIndex };
  }

  private getLocalizedTypeName(type: Type): string {
    return i18next.t(`pokemonInfo:Type.${Type[type]}`, { defaultValue: Type[type] });
  }

  private showModifierTooltip(
    titleText: string,
    subtitleText: string,
    bodyText: string,
    rarity: SkillTreeRarity,
    enablePartyDetails: boolean = false
  ): void {
    if (this.upgradeTooltipContainer) {
      this.hideUpgradeTooltip();
    }

    const rarityColors = getUpgradeRarityColors(rarity);
    this.upgradeTooltipContainer = this.scene.add.container(0, 0);
    this.upgradeTooltipContainer.setDepth(10000000000);

    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = 6;
    const buttonRowHeight = 10;
    const barsHeight = this.TOOLTIP_TITLE_BAR_HEIGHT + this.TOOLTIP_RARITY_BAR_HEIGHT;
    const bodyY = barsHeight + padding;

    this.upgradeTooltipTitle = addTextObject(this.scene, tooltipWidth / 2, this.TOOLTIP_TITLE_BAR_HEIGHT / 2, titleText, TextStyle.SUMMARY_GOLD, { fontSize: "40px", fontStyle: "bold" });
    this.upgradeTooltipTitle.setOrigin(0.5, 0.5);

    this.upgradeTooltipSubtitle = addTextObject(this.scene, tooltipWidth / 2, this.TOOLTIP_TITLE_BAR_HEIGHT + (this.TOOLTIP_RARITY_BAR_HEIGHT / 2), subtitleText, TextStyle.WINDOW, { fontSize: "35px" });
    this.upgradeTooltipSubtitle.setOrigin(0.5, 0.5);
    this.upgradeTooltipSubtitle.setTint(rarityColors.border);

    this.upgradeTooltipBody = this.createColoredComparisonText(padding, bodyY, bodyText);
    this.applyBbCodeWordWrap(this.upgradeTooltipBody, tooltipWidth, padding);

    const bodyHeight = this.upgradeTooltipBody.displayHeight;
    const tooltipHeight = barsHeight + bodyHeight + (padding * 3) + (buttonRowHeight * (enablePartyDetails ? 2 : 1)) + (enablePartyDetails ? 4 : 0);

    this.upgradeTooltipBg = this.scene.add.graphics();
    this.drawTooltipGradientBackground(this.upgradeTooltipBg, 0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);
    this.upgradeTooltipBg.lineStyle(0.5, 0xffffff, 0.5);
    this.upgradeTooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, this.TOOLTIP_RADIUS);

    this.upgradeTooltipTitleBarBg = this.scene.add.graphics();
    this.upgradeTooltipTitleBarBg.fillStyle(rarityColors.border, 0.65);
    this.upgradeTooltipTitleBarBg.fillRect(0, 0, tooltipWidth, this.TOOLTIP_TITLE_BAR_HEIGHT);

    this.upgradeTooltipRarityBarBg = this.scene.add.graphics();
    this.upgradeTooltipRarityBarBg.fillStyle(rarityColors.bg, 0.7);
    this.upgradeTooltipRarityBarBg.fillRect(0, this.TOOLTIP_TITLE_BAR_HEIGHT, tooltipWidth, this.TOOLTIP_RARITY_BAR_HEIGHT);

    const hideButton = this.createHideDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
    if (enablePartyDetails) {
      this.partyDetailsMainTooltipHeight = tooltipHeight;
      this.partyDetailsButton = this.createPartyDetailsButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      this.partyBackButton = this.createPartyBackButton(tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      this.partyBackButton.setVisible(false);
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
      this.upgradeTooltipBody,
      hideButton
    ];
    if (enablePartyDetails) {
      if (this.partyDetailsButton) {
        children.push(this.partyDetailsButton);
      }
      if (this.partyBackButton) {
        children.push(this.partyBackButton);
      }
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
    context: { kind: "STAT_SWITCHER"; stat1: Stat; stat2: Stat } | { kind: "MINT"; targetNature: Nature } | { kind: "STAT_SACRIFICE"; stat: Stat } | { kind: "MOVE_SACRIFICE" } | { kind: "FUSION" } | { kind: "BASE_STAT_BOOST"; stat: Stat; multiplier: number } | { kind: "SOUL_DEW" }
  ): void {
    const bodyText = [...headerLines, ...partyLines.map(l => `  ${l}`)].join('\n');
    this.showModifierTooltip(titleText, subtitleText, bodyText, rarity, true);
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

  private generateAddPokemonTooltipBody(pokemon: PlayerPokemon): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const typesLabel = i18next.t("skillTree:descriptions.altBuildTypes", { defaultValue: "Types:" });
    const pokemonTypes = pokemon.getTypes();
    const types = pokemonTypes.filter(t => t !== Type.UNKNOWN).map(t => this.getLocalizedTypeName(t)).join("/");
    lines.push(getBBCodeFrag(`${typesLabel} ${types}`, TextStyle.WINDOW, uiTheme));

    const { abilities, activeIndex } = this.getAbilityPool(pokemon);
    const activeAbility = allAbilities[abilities[activeIndex]]?.name || Abilities[abilities[activeIndex]];
    const otherAbilities = abilities
      .filter((_, i) => i !== activeIndex)
      .map(a => allAbilities[a]?.name || Abilities[a]);

    const abilityLabel = i18next.t("pokemonInfoContainer:ability", { defaultValue: "Ability:" });
    let abilityLine = `${abilityLabel} [color=#78c850]${activeAbility}[/color]`;
    if (otherAbilities.length > 0) {
      const greyAbilities = otherAbilities.map(a => `[color=#888888]${a}[/color]`).join(", ");
      abilityLine += `, ${greyAbilities}`;
    }
    lines.push(abilityLine);

    const movesLabel = i18next.t("pokemonInfoContainer:moveset", { defaultValue: "Moves" });
    const moves = pokemon.getMoveset().filter(m => m).map(m => m!.getName()).join(", ");
    lines.push(getBBCodeFrag(`${movesLabel}: ${moves}`, TextStyle.WINDOW, uiTheme));
    lines.push(`[size=2] [/size]`);

    const nature = pokemon.getNature();
    const baseStats = pokemon.getSpeciesForm().baseStats;
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const formatStat = (stat: Stat): string => {
      const mult = getNatureStatMultiplier(nature, stat);
      const statName = getStatName(stat, true);
      const value = baseStats[stat];
      if (mult > 1) return `[color=#78c850]${statName}: ${value}[/color]`;
      if (mult < 1) return `[color=#f08030]${statName}: ${value}[/color]`;
      return `[color=#e8e8a8]${statName}: ${value}[/color]`;
    };
    const topStats = [Stat.HP, Stat.ATK, Stat.DEF].map(formatStat).join(" | ");
    const bottomStats = [Stat.SPATK, Stat.SPDEF, Stat.SPD].map(formatStat).join(" | ");
    const total = statOrder.reduce((sum, stat) => sum + baseStats[stat], 0);
    const statsLabel = i18next.t("skillTree:descriptions.altBuildStats", { defaultValue: "Stats:" });
    const totalLabel = i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" });

    lines.push(getBBCodeFrag(`${statsLabel} `, TextStyle.WINDOW, uiTheme) + `${topStats}`);
    lines.push(`${bottomStats} | ${totalLabel}: ${total}`);

    return lines.join('\n');
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
      const baseStats = pokemon.getSpeciesForm().baseStats;
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
        const baseStats = pokemon.getSpeciesForm().baseStats;
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
    if (essenceData.total >= 5) {
      essenceStr += ` [color=#78c850]${freeLabel}[/color]`;
    }

    return essenceStr;
  }

  private generateSacrificeTooltipBody(sacrificeType: string, stat?: Stat): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const descText = i18next.t(`modifierType:ModifierType.${sacrificeType}SacrificeModifierType.description`, {
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
      const applicable = formChanges.some(fc =>
        fc.trigger instanceof SpeciesFormChangeItemTrigger &&
        (fc.trigger as SpeciesFormChangeItemTrigger).item === formChangeItem
      );

      if (applicable) {
        const targetForm = formChanges.find(fc =>
          fc.trigger instanceof SpeciesFormChangeItemTrigger &&
          (fc.trigger as SpeciesFormChangeItemTrigger).item === formChangeItem
        );
        const formKey = targetForm?.formKey || 'Unknown';
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#78c850]${applicableLabel}[/color] → ${formKey}`);
      } else {
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`);
      }
    }

    return lines.join('\n');
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

  private generateMintTooltipBody(targetNature: Nature): string {
    const uiTheme = this.scene.uiTheme;
    const lines: string[] = [];

    const natureDesc = getNatureName(targetNature, true, true, true);
    lines.push(getBBCodeFrag(`${i18next.t("pokemonInfoContainer:nature", { defaultValue: "Nature" })}: ${natureDesc}`, TextStyle.WINDOW, uiTheme));

    lines.push('');
    const partyLabel = i18next.t("pokemonInfoContainer:party", { defaultValue: "Party" });
    lines.push(getBBCodeFrag(`${partyLabel}:`, TextStyle.SUMMARY_GOLD, uiTheme));

    const noEffectLabel = i18next.t("partyUiHandler:anyEffect", { defaultValue: "No effect" });
    const party = this.scene.getParty();

    for (const pokemon of party) {
      const currentNature = pokemon.getNature();

      if (currentNature === targetNature) {
        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: [color=#888888]${noEffectLabel}[/color]`);
      } else {
        const currentNatureName = getNatureName(currentNature);
        const targetNatureName = getNatureName(targetNature);

        lines.push(`  [color=#ffcc00]${pokemon.name}[/color]: ${currentNatureName} → ${targetNatureName}`);

        const baseStats = pokemon.getSpeciesForm().baseStats;
        for (const stat of [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD]) {
          const currentMult = getNatureStatMultiplier(currentNature, stat);
          const mult = getNatureStatMultiplier(targetNature, stat);
          if (mult !== currentMult) {
            const statName = getStatName(stat, true);
            const baseValue = baseStats[stat];
            const currentValue = Math.floor(baseValue * currentMult);
            const newValue = Math.floor(baseValue * mult);
            if (mult > 1) {
              lines.push(`    [color=#78c850]${statName}: ${currentValue} → ${newValue} (+10%)[/color]`);
            } else if (mult < 1) {
              lines.push(`    [color=#f08030]${statName}: ${currentValue} → ${newValue} (-10%)[/color]`);
            } else if (currentMult !== 1) {
              const neutralLabel = i18next.t("modifierSelectUiHandler:neutral", { defaultValue: "neutral" });
              lines.push(`    ${statName}: ${currentValue} → ${newValue} (${neutralLabel})`);
            }
          }
        }
      }
    }

    return lines.join('\n');
  }

  private getTooltipHeight(comparisonText: string): integer {
    let additionalHeight = 0;
    let adjustedLineCount = this.lineCount;

    if (this.multiHitWarning) {
      adjustedLineCount--;
      additionalHeight += 100 / 6;
    }

    if (this.flinchWarning) {
      adjustedLineCount--;
      additionalHeight += 100 / 6;
    }

    if (this.secondaryEffectNote) {
      adjustedLineCount -= 3;
      additionalHeight += 180 / 6;
    }

    if (adjustedLineCount > 7) {
      additionalHeight += (adjustedLineCount - 7) * (25 / 6);
    }

    return this.TOOLTIP_BASE_HEIGHT + additionalHeight;
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
      const remainingHeight = (y + height) - stepY;
      if (remainingHeight <= 0) {
        continue;
      }
      graphics.fillStyle(color, 0.98);
      graphics.fillRect(x, stepY, width, Math.min(stepHeight, remainingHeight));
    }
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

  protected getShopTypeOptions(): ModifierTypeOption[] | null {
    if (this.forcedDraftSelection) {
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
    if (!this.scene.moveUpgradesEnabledForRun && options) {
      options = options.filter(o => o.type?.id !== "MOVE_UPGRADE" && o.type?.id !== "LOW_TIER_MOVE_UPGRADE");
    }
    return options;
  }

  protected createModifierOption(typeOptions: ModifierTypeOption[], index: number, optionsYOffset: number): ModifierOption {
    const baseY = -this.scene.game.canvas.height / 12 + optionsYOffset;
    const y = baseY;
    const dense = typeOptions.length >= 6;

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
    return shopTypeOptions && shopTypeOptions.length >= this.getShopLayout().itemsPerRow ? -8 : -24;
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
    super.clear();
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
    this.tooltipCache.clear();
    this.multiHitWarning = false;
    this.flinchWarning = false;
    this.secondaryEffectNote = false;
    this.lineCount = 0;
    this.awaitingActionInput = false;
    this.onActionInput = null;
    this.getUi().clearText();
    this.eraseCursor();

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
    this.scene.getModifierBar(true).getAll().forEach((icon: any) => icon.setAlpha(1));
    this.scene.ui.permaModifierBar.getAll().forEach((icon: any) => icon.setAlpha(1));

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

    this.scene.ui.showText(message, null, () => {
      this.scene.ui.setOverlayMode(Mode.CONFIRM,
        () => {
          this.executeModifierRemoval(modifier, quantity);
          return true;
        },
        () => {
          this.scene.ui.revertMode();
          this.scene.ui.clearText();
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
          this.scene.ui.clearText();
          if (returnMenu) {
            returnMenu();
          }
        }
      );
    });
  }

  showTransferSubmenu(): void {
    this.removalReturnMenu = null;
    const hasTransferableItems = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length > 0;
    const hasRemovableItems = this.getMoveUpgradeModifiersCount() > 0 || this.getRemovableHeldItemModifiers().length > 0;

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
        label: i18next.t("modifierSelectUiHandler:cancel"),
        handler: () => {
          this.returnToModifierSelect();
          return true;
        }
      }
    ];

    const config = {
      options: options,
      maxOptions: 4,
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

  setCallbackContext(typeOptions: any[], modifierSelectCallback: Function, rerollCost: any, draftOnly: boolean): void {
    this.storedTypeOptions = typeOptions;
    this.storedModifierSelectCallback = modifierSelectCallback;
    this.storedRerollCost = rerollCost;
    this.storedDraftOnly = draftOnly;
  }

  private returnToModifierSelect(): void {
    if (this.storedTypeOptions && this.storedModifierSelectCallback && this.storedRerollCost !== null) {
      this.scene.ui.setMode(Mode.MODIFIER_SELECT, true, this.storedTypeOptions, this.storedModifierSelectCallback, this.storedRerollCost, this.storedDraftOnly);
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
  private item: Phaser.GameObjects.Sprite;
  private itemTint: Phaser.GameObjects.Sprite;
  private itemText: Phaser.GameObjects.Text;
  private itemTextChip: Phaser.GameObjects.Graphics;
  public itemCostText: Phaser.GameObjects.Text;
  public showCost: boolean;
  private itemContainerTargetScale: number = 2;
  private baseItemTextFontSizePx: number | null = null;
  private denseItemTextFontSizePx: number | null = null;
  private denseItemContainerTargetScale: number = 1.7;
  private baseItemTextTint: integer = 0xffffff;
  private focusLabelChipColors: { border: number; bg: number } | null = null;
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
        item = this.scene.add.sprite(0, 0, newPokemon.getIconAtlasKey());
        item.setFrame(newPokemon.getIconId(false));
        if (item.frame.name !== newPokemon.getIconId(false)) {
          const temp = newPokemon.shiny;
          newPokemon.shiny = false;
          item.setTexture(newPokemon.getIconAtlasKey());
          item.setFrame(newPokemon.getIconId(false));
          newPokemon.shiny = temp;
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
            item.setScale(0.6);
          } else {
            item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems" : "items", this.modifierTypeOption.type.iconImage);
          }
        } catch {
          item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems" : "items", this.modifierTypeOption.type.iconImage);
        }
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
      } else {
        const useItemsAtlas = !this.useSmitemsAtlas();
        const isChampionGroup = this.modifierTypeOption.type?.group === "champion";
        const atlasKey = useItemsAtlas ? "items" : "smitems";
        const frame = isChampionGroup ? "protein" : this.modifierTypeOption.type.iconImage;
        item = this.scene.add.sprite(0, 0, atlasKey, frame);
        if (!useItemsAtlas) {
          item.setScale(!this.modifierTypeOption.cost ? 0.4: 0.35);
        } else if (this.modifierTypeOption.cost) {
          item.setScale(.5);
        }
      }
      return item;
    };

    this.item = getItem();
    this.itemContainer.add(this.item);

    if (!this.modifierTypeOption.cost) {
      this.itemTint = getItem();
      this.itemTint.setTintFill(Phaser.Display.Color.GetColor(255, 192, 255));
      this.itemContainer.add(this.itemTint);
    }

    this.itemText = addTextObject(this.scene, 0, 35, this.modifierTypeOption.type?.name!, TextStyle.PARTY, { align: "center" });
    this.itemText.setOrigin(0.5, 0);
    this.itemText.setAlpha(0);
    this.baseItemTextTint = this.modifierTypeOption.type?.tier ? getModifierTierTextTint(this.modifierTypeOption.type?.tier) : 0xffffff;
    this.itemText.setTint(this.baseItemTextTint);
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

    if (this.showCost) {
      this.itemCostText = addTextObject(this.scene, 0, 45, "", TextStyle.MONEY, { align: "center" });

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
    this.itemContainerTargetScale = focused ? 2 : this.denseItemContainerTargetScale;
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
        y: 25,
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

  public isRevealed(): boolean {
    return this.itemContainer.alpha > 0 || this.itemText.alpha > 0;
  }

  public forceReveal(): void {
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
    this.itemText.y = 25;

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
export class CollectedTypeModifierOption extends ModifierOption {
    constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption, showCost: boolean = true) {
        super(scene, x, y, modifierTypeOption, showCost);
    }

    updateCostText(): void {
        if (this.showCost && this.itemCostText) {
            const cost = this.modifierTypeOption.cost || 0;

            if (this.itemCostText) {
                this.itemCostText.destroy();
            }

            const costContainer = this.scene.add.container(0, 50);

            const costIcon = this.scene.add.sprite(-10, 0, "smitems", "modSoulCollected");

            const costText = addTextObject(this.scene, 10, 0, cost.toString(), TextStyle.MONEY);
            costText.setOrigin(0, 0.5);

            costContainer.add([costIcon, costText]);
            this.add(costContainer);
        }
    }
}