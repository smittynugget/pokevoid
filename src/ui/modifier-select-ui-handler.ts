import BattleScene from "../battle-scene";
import {
    getPlayerShopModifierTypeOptionsForWave,
    ModifierTypeOption,
    TmModifierType,
    AddPokemonModifierType,
    PermaModifierType,
    AnyTmModifierType, AnyAbilityModifierType, AnyPassiveAbilityModifierType, PermaPartyAbilityModifierType,
    MoveUpgradeModifierType
} from "../modifier/modifier-type";
import { getPokeballAtlasKey, PokeballType } from "../data/pokeball";
import { addTextObject, getTextStyleOptions, getModifierTierTextTint, getTextColor, TextStyle, addBBCodeTextObject, getBBCodeFrag } from "./text";
import { addWindow } from "./ui-theme";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { Mode } from "./ui";
import { LockModifierTiersModifier, PokemonHeldItemModifier } from "../modifier/modifier";
import { MoveUpgradeModifier } from "../modifier/modifier";
import { handleTutorial, Tutorial } from "../tutorial";
import {Button} from "../enums/buttons";
import DynamicMoveInfoOverlay from "./dynamic-move-info-overlay";
import Move, { allMoves, MoveCategory, MoveFlags, MoveAttr, MoveCondition, MultiHitAttr, FlinchAttr, RecoilAttr, SacrificialAttr, HalfSacrificialAttr, SacrificialAttrOnHit, HealAttr, HitHealAttr, HighCritAttr, CritOnlyAttr, ChargeAttr, StatusEffectAttr, MultiStatusEffectAttr, StatChangeAttr, MultiHitType, RemoveHeldItemAttr, StealHeldItemChanceAttr, ConfuseAttr, AddBattlerTagAttr, WeatherChangeAttr, ClearWeatherAttr, TerrainChangeAttr, ClearTerrainAttr, AddArenaTrapTagAttr, AddArenaTrapTagUpgradeAttr, MatchUserTypeAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, TypelessAttr, AnyTypeSuperEffectTypeMultiplierAttr, GyroBallPowerAttr, ElectroBallPowerAttr, WeightPowerAttr, CompareWeightPowerAttr, HpPowerAttr, LowHpPowerAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, TerrainMovePriorityAttr, FirstTurnPriorityAttr, ForceSwitchOutAttr, SurviveDamageAttr, TrapAttr, FixedDamageAttr, LevelDamageAttr, TargetHalfHpDamageAttr, IgnoreOpponentStatChangesAttr, RemoveScreensAttr } from "../data/move";
import { Type } from "../data/type";
import * as Utils from "./../utils";
import Overrides from "../overrides";
import i18next from "i18next";
import { ShopCursorTarget } from "../enums/shop-cursor-target";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";
import { ConditionalPriorityAttr, IncrementMovePriorityAttr } from "../data/move";
import { BattleStat, getBattleStatName } from "../data/battle-stat";
import { StatusEffect, getStatusEffectMessageKey } from "../data/status-effect";
import { BattlerTagType } from "../enums/battler-tag-type";
import { ArenaTagType } from "../enums/arena-tag-type";
import { WeatherType } from "../data/weather";
import { TerrainType } from "../data/terrain";
import * as Utils from "../utils";

export const SHOP_OPTIONS_ROW_LIMIT = 12;

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
  private upgradeTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private upgradeTooltipText: BBCodeText | null = null;
  
  private readonly TOOLTIP_WIDTH = 625 / 6;
  private readonly TOOLTIP_BASE_HEIGHT = 375 / 6;
  private readonly TOOLTIP_OFFSET_X = 20;
  
  private tooltipCache: Map<string, {text: string, multiHitWarning: boolean, secondaryEffectNote: boolean, flinchWarning: boolean}> = new Map();
  
  protected rowCursor: integer = 0;
  protected player: boolean;
  private rerollCost: integer;
  private permaRerollCost: integer;
  private transferButtonWidth: integer;
  private checkButtonWidth: integer;

  public options: ModifierOption[];
  public shopOptionsRows: ModifierOption[][];

  protected cursorObj: Phaser.GameObjects.Image | null;

  protected forcedDraftSelection: boolean = false;
  private multiHitWarning: boolean = false;
  private secondaryEffectNote: boolean = false;
  private flinchWarning: boolean = false;
  private lineCount: integer = 0;

  constructor(scene: BattleScene) {
    super(scene, Mode.CONFIRM);

    this.options = [];
    this.shopOptionsRows = [];
  }

  setup() {
    const ui = this.getUi();

    this.modifierContainer = this.scene.add.container(0, 0);
    ui.add(this.modifierContainer);

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

    const partyHasHeldItem = this.player && !!this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length;
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

    const maxUpgradeCount = typeOptions.map(to => to.upgradeCount).reduce((max, current) => Math.max(current, max), 0);

    /* Force updateModifiers without pokemonSpecificModifiers */
    this.scene.getModifierBar().updateModifiers(this.scene.modifiers, true);

    /* Multiplies the appearance duration by the speed parameter so that it is always constant, and avoids "flashbangs" at game speed x5 */
    this.scene.showShopOverlay(750 * this.scene.gameSpeed);
    this.scene.updateBiomeWaveText();
    this.scene.updateMoneyText();

    let i = 0;

    this.scene.tweens.addCounter({
      ease: "Sine.easeIn",
      duration: 1250,
      onUpdate: t => {
        const value = t.getValue();
        const index = Math.floor(value * typeOptions.length);
        if (index > i && index <= typeOptions.length) {
          const option = this.options[i];
          option?.show(Math.floor((1 - value) * 1250) * 0.325 + 2000 * maxUpgradeCount, -(maxUpgradeCount - typeOptions[i].upgradeCount));
          i++;
        }
      }
    });

    this.scene.time.delayedCall(1000 + maxUpgradeCount * 2000, () => {
      for (const shopOption of this.shopOptionsRows.flat()) {
        shopOption.show(0, 0);
      }
    });

    this.scene.time.delayedCall(4000 + maxUpgradeCount * 2000, () => {
      if (partyHasHeldItem) {
        this.transferButtonContainer.setAlpha(0);
        this.transferButtonContainer.setVisible(true);
        this.scene.tweens.add({
          targets: this.transferButtonContainer,
          alpha: 1,
          duration: 250
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
        duration: 250
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
              console.log(`Found alternative row ${r} with ${altOptions.length} options`);
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
      let sliceWidth = (this.scene.game.canvas.width / 6) / (options.length + 2);
      if (this.rowCursor < 2) {
        this.cursorObj.setPosition(sliceWidth * (cursor + 1) + (sliceWidth * 0.5) - 20, (-this.scene.game.canvas.height / 12) - (this.shopOptionsRows.length > 1 ? 6 : 22));
      } else {
        sliceWidth = (this.scene.game.canvas.width / 6.5) / (options.length + 2);
        this.cursorObj.setPosition(sliceWidth * (cursor + 1) + (sliceWidth * 0.5) - 7, (-this.scene.game.canvas.height / 12 - this.scene.game.canvas.height / 32) - (-16 + 28 * (this.rowCursor - (this.shopOptionsRows.length - 1))));
      }

      const option = options[this.cursor];
      if (!option) {
        console.warn(`Option at index ${this.cursor} is undefined!`);
        return ret;
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
      
      if (type instanceof TmModifierType || type instanceof AnyTmModifierType) {
        this.moveInfoOverlay.show(this.scene.getUpgradedMove(allMoves[type.moveId]));
      }
      else if(type instanceof AnyAbilityModifierType || type instanceof AnyPassiveAbilityModifierType || type instanceof PermaPartyAbilityModifierType) {
          this.moveInfoOverlay.show(type.ability.description);
      }
      else if(type instanceof MoveUpgradeModifierType) {
        this.moveInfoOverlay.show(type.getDescription(this.scene));
        
        this.showUpgradeTooltip(type);
      }
    } else {
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
      layout.push({ 
        x: (this.scene.game.canvas.width - this.checkButtonWidth)/6 - 10, 
        y: -60, 
        descKey: "modifierSelectUiHandler:checkTeamDesc" 
      });
    } else {
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

    this.upgradeTooltipContainer = this.scene.add.container(0, 0);
    this.upgradeTooltipContainer.setDepth(10000000000);
    this.upgradeTooltipBg = addWindow(this.scene, 0, 0, this.TOOLTIP_WIDTH, this.getTooltipHeight(comparisonText));
    this.upgradeTooltipText = this.createColoredComparisonText(comparisonText);
    
    const selectedOption = this.options[this.cursor];
    if (selectedOption) {
      const isRightmostOption = this.cursor === this.options.length - 1;
      let tooltipX: number;
      
      if (isRightmostOption && this.options.length > 1) {
        const secondFromLeftOption = this.options[1];
        tooltipX = secondFromLeftOption.x - this.TOOLTIP_OFFSET_X;
      } else {
        tooltipX = selectedOption.x + this.TOOLTIP_OFFSET_X;
      }
      
      const tooltipY = selectedOption.y - this.getTooltipHeight(comparisonText) / 2;
      this.upgradeTooltipContainer.setPosition(tooltipX, tooltipY);
    }

    this.upgradeTooltipContainer.add([this.upgradeTooltipBg, this.upgradeTooltipText]);
    this.scene.ui.add(this.upgradeTooltipContainer);
  }

  private generateComparisonText(modifierType: MoveUpgradeModifierType): string {
    this.lineCount = 0;
    
    const tempModifier = modifierType.newModifier() as MoveUpgradeModifier;
    const moveId = tempModifier.moveId;
    const cacheKey = `${moveId}_${tempModifier.powerBoost}_${tempModifier.accuracyBoost}_${tempModifier.upgradeCategory}`;
    
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
    
    const toRoman = (num: number): string => {
      const romanNumerals: [string, number][] = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
      ];
      let result = '';
      for (const [letter, value] of romanNumerals) {
        while (num >= value) {
          result += letter;
          num -= value;
        }
      }
      return result;
    };

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
    
    const tierDisplay = displayTier ? ` ${toRoman(displayTier)}` : "";
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
      const wrappedWarning = this.wrapTextToWidth(warningText, this.TOOLTIP_WIDTH * 2);
      wrappedWarning.forEach(line => {
        const warningLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "30px"});
        comparisonLines.push(warningLine);
      });
    }

    this.flinchWarning = false;
    const isFlinch = currentMove.attrs.some(attr => attr instanceof FlinchAttr);
    if (isFlinch) {
      const warningText = i18next.t("moveUpgradeAttrs:flinchWarning");
      this.flinchWarning = true;
      const wrappedWarning = this.wrapTextToWidth(warningText, this.TOOLTIP_WIDTH * 2);
      wrappedWarning.forEach(line => {
        const warningLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "30px"});
        comparisonLines.push(warningLine);
      });
    }
    
    comparisonLines.push('');
    
    comparisonLines.push(...this.compareBasicStats(currentMove, upgradedMove));
   
    this.secondaryEffectNote = false;
    if (currentMove.chance > 0 || upgradedMove.chance > 0) {
      comparisonLines.push('');
      this.secondaryEffectNote = true;
      const chanceNoteText = i18next.t("moveUpgradeAttrs:secondaryEffectNote");
      const wrappedChanceNote = this.wrapTextToWidth(chanceNoteText, this.TOOLTIP_WIDTH *1.7);
      wrappedChanceNote.forEach(line => {
        const chanceNoteLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "25px"});
        comparisonLines.push(chanceNoteLine);
      });
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

  private createColoredComparisonText(comparisonText: string): BBCodeText {
    const textObj = addBBCodeTextObject(this.scene, 8, 8, comparisonText, TextStyle.WINDOW, {fontSize: "45px"});
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
    if (this.upgradeTooltipContainer) {
      this.upgradeTooltipContainer.destroy();
      this.upgradeTooltipContainer = null;
      this.upgradeTooltipBg = null;
      this.upgradeTooltipText = null;
    }
    this.lineCount = 0;
  }

  private getTooltipHeight(comparisonText: string): integer {
    let additionalHeight = 0;
    
    if (this.multiHitWarning) {
      this.lineCount--;
      additionalHeight += 100 / 6;
    }

    if (this.flinchWarning) {
      this.lineCount--;
      additionalHeight += 100 / 6;
    }
    
    if (this.secondaryEffectNote) {
      this.lineCount-= 3;
      additionalHeight += 180 / 6;
    }
    
    if (this.lineCount > 7) {
      additionalHeight += (this.lineCount - 7) * (25 / 6);
    }
    
    return this.TOOLTIP_BASE_HEIGHT + additionalHeight;
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
    return !this.forcedDraftSelection ? getPlayerShopModifierTypeOptionsForWave(this.scene, this.scene.getWaveMoneyAmount(1)) : null;
  }

  protected createModifierOption(typeOptions: ModifierTypeOption[], index: number, optionsYOffset: number): ModifierOption {
    const sliceWidth = (this.scene.game.canvas.width / 6) / (typeOptions.length + 2);
    return new ModifierOption(this.scene, sliceWidth * (index + 1) + (sliceWidth * 0.5), -this.scene.game.canvas.height / 12 + optionsYOffset, typeOptions[index]);
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

    /* Multiplies the fade time duration by the speed parameter so that it is always constant, and avoids "flashbangs" at game speed x5 */
    this.scene.hideShopOverlay(750 * this.scene.gameSpeed);
    this.scene.hideLuckText(250);

    /* Normally already called just after the shop, but not sure if it happens in 100% of cases */
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
}

export class ModifierOption extends Phaser.GameObjects.Container {
  public modifierTypeOption: ModifierTypeOption;
  private pb: Phaser.GameObjects.Sprite;
  private pbTint: Phaser.GameObjects.Sprite;
  private itemContainer: Phaser.GameObjects.Container;
  private item: Phaser.GameObjects.Sprite;
  private itemTint: Phaser.GameObjects.Sprite;
  private itemText: Phaser.GameObjects.Text;
  public itemCostText: Phaser.GameObjects.Text;
  public showCost: boolean;
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
      } else {
        item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems_192" : "items", this.modifierTypeOption.type.iconImage);
        if(this.useSmitemsAtlas()) {
          item.setScale(!this.modifierTypeOption.cost ? 0.167 : 0.1);
        }
        else if (this.modifierTypeOption.cost) {
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
    this.itemText.setTint(this.modifierTypeOption.type?.tier ? getModifierTierTextTint(this.modifierTypeOption.type?.tier) : undefined);
    this.add(this.itemText);

    if (this.showCost) {
      this.itemCostText = addTextObject(this.scene, 0, 45, "", TextStyle.MONEY, { align: "center" });

      this.itemCostText.setOrigin(0.5, 0);
      this.itemCostText.setAlpha(0);
      this.add(this.itemCostText);

      this.updateCostText();
    }
  }

  show(remainingDuration: integer, upgradeCountOffset: integer) {
    if (!this.modifierTypeOption.cost) {
      this.scene.tweens.add({
        targets: this.pb,
        y: 0,
        duration: 1250,
        ease: "Bounce.Out"
      });

      let lastValue = 1;
      let bounceCount = 0;
      let bounce = false;

      this.scene.tweens.addCounter({
        from: 1,
        to: 0,
        duration: 1250,
        ease: "Bounce.Out",
        onUpdate: t => {
          if (!this.scene) {
            return;
          }
          const value = t.getValue();
          if (!bounce && value > lastValue) {
            (this.scene as BattleScene).playSound("se/pb_bounce_1", { volume: 1 / ++bounceCount });
            bounce = true;
          } else if (bounce && value < lastValue) {
            bounce = false;
          }
          lastValue = value;
        }
      });

      for (let u = 0; u < this.modifierTypeOption.upgradeCount; u++) {
        const upgradeIndex = u;
        this.scene.time.delayedCall(remainingDuration - 2000 * (this.modifierTypeOption.upgradeCount - (upgradeIndex + 1 + upgradeCountOffset)), () => {
          (this.scene as BattleScene).playSound("se/upgrade", { rate: 1 + 0.25 * upgradeIndex });
          this.pbTint.setPosition(this.pb.x, this.pb.y);
          this.pbTint.setTintFill(0xFFFFFF);
          this.pbTint.setAlpha(0);
          this.pbTint.setVisible(true);
          this.scene.tweens.add({
            targets: this.pbTint,
            alpha: 1,
            duration: 1000,
            ease: "Sine.easeIn",
            onComplete: () => {
              this.pb.setTexture("pb", this.getPbAtlasKey(-this.modifierTypeOption.upgradeCount + (upgradeIndex + 1)));
              this.scene.tweens.add({
                targets: this.pbTint,
                alpha: 0,
                duration: 750,
                ease: "Sine.easeOut",
                onComplete: () => {
                  this.pbTint.setVisible(false);
                }
              });
            }
          });
        });
      }
    }

    this.scene.time.delayedCall(remainingDuration + 2000, () => {
      if (!this.scene) {
        return;
      }

      if (!this.modifierTypeOption.cost) {
        this.pb.setTexture("pb", `${this.getPbAtlasKey(0)}_open`);
        (this.scene as BattleScene).playSound("se/pb_rel");

        this.scene.tweens.add({
          targets: this.pb,
          duration: 500,
          delay: 250,
          ease: "Sine.easeIn",
          alpha: 0,
          onComplete: () => this.pb.destroy()
        });
      }

      this.scene.tweens.add({
        targets: this.itemContainer,
        duration: 500,
        ease: "Elastic.Out",
        scale: 2,
        alpha: 1
      });
      if (!this.modifierTypeOption.cost) {
        this.scene.tweens.add({
          targets: this.itemTint,
          alpha: 0,
          duration: 500,
          ease: "Sine.easeIn",
          onComplete: () => this.itemTint.destroy()
        });
      }
      this.scene.tweens.add({
        targets: this.itemText,
        duration: 500,
        alpha: 1,
        y: 25,
        ease: "Cubic.easeInOut"
      });
      if (this.itemCostText) {
        this.scene.tweens.add({
          targets: this.itemCostText,
          duration: 500,
          alpha: 1,
          y: this.getItemCostTextY(),
          ease: "Cubic.easeInOut"
        });
      }
      
      this.additionalDisplayTweens();
    });
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
            
            const costIcon = this.scene.add.sprite(-10, 0, "smitems_192", "modSoulCollected");
            costIcon.setScale(0.0525);
            
            const costText = addTextObject(this.scene, 10, 0, cost.toString(), TextStyle.MONEY);
            costText.setOrigin(0, 0.5);
            
            costContainer.add([costIcon, costText]);
            this.add(costContainer);
        }
    }
}

