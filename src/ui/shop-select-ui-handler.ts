import BattleScene from "../battle-scene";
import {
    getPlayerShopModifierTypeOptionsForWave,
    ModifierTypeOption,
    TmModifierType,
    AddPokemonModifierType,
    PermaModifierType,
    getShopModifierTypeOptions, modifierTypes, PermaModifierTypeGenerator, QuestModifierType, QuestModifierTypeGenerator,
    PermaPartyAbilityModifierType
} from "../modifier/modifier-type";
import { getPokeballAtlasKey, PokeballType } from "../data/pokeball";
import { addTextObject, getTextStyleOptions, getModifierTierTextTint, getTextColor, TextStyle } from "./text";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { Mode } from "./ui";
import { LockModifierTiersModifier, PokemonHeldItemModifier } from "../modifier/modifier";
import { handleTutorial, Tutorial } from "../tutorial";
import {Button} from "#enums/buttons";
import DynamicMoveInfoOverlay from "./dynamic-move-info-overlay";
import { allMoves } from "../data/move";
import * as Utils from "./../utils";
import Overrides from "#app/overrides";
import i18next from "i18next";
import { ShopCursorTarget } from "#app/enums/shop-cursor-target";
import { RerollModifier } from "#app/modifier/modifier";
import {Species} from "#enums/species";
import {getPokemonSpecies} from "#app/data/pokemon-species";
import {QuestState, QuestUnlockables} from "#app/system/game-data";

export const SHOP_OPTIONS_ROW_LIMIT = 6;

export default class ShopSelectUiHandler extends AwaitableUiHandler {
  private modifierContainer: Phaser.GameObjects.Container;
  private rerollButtonContainer: Phaser.GameObjects.Container;
  private lockRarityButtonContainer: Phaser.GameObjects.Container;
  private rerollCostText: Phaser.GameObjects.Text;
  private lockRarityButtonText: Phaser.GameObjects.Text;
  private moveInfoOverlay : DynamicMoveInfoOverlay;
  private moveInfoOverlayActive : boolean = false;
  private clearing: boolean = false;
  private toggleContainer: Phaser.GameObjects.Container;

  private rowCursor: integer = 0;
  private player: boolean;
  private rerollCost: integer;

  public options: ModifierOption[];
  public shopOptionsRows: ModifierOption[][];
  private remainingOptions: ModifierTypeOption[] = [];

  private cursorObj: Phaser.GameObjects.Image | null;

  private selectedOption: ModifierTypeOption | null = null;

  private refreshTimerText: Phaser.GameObjects.Text;
  private refreshInterval: number = 20 * 60 * 1000;
  private refreshShopFunction: (() => void) | null = null;

  constructor(scene: BattleScene) {
    super(scene, Mode.CONFIRM);

    this.options = [];
    this.shopOptionsRows = [];
    this.remainingOptions = [];
  }

  setup() {
    const ui = this.getUi();

    this.modifierContainer = this.scene.add.container(0, 0);
    ui.add(this.modifierContainer);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const styleOptions = getTextStyleOptions(TextStyle.PARTY, (this.scene as BattleScene).uiTheme).styleOptions;

    this.rerollButtonContainer = this.scene.add.container(16, -64);
    this.rerollButtonContainer.setName("reroll-brn");
    this.rerollButtonContainer.setVisible(false);
    ui.add(this.rerollButtonContainer);

    const rerollButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:reroll"), TextStyle.PARTY);
    rerollButtonText.setName("text-reroll-btn");
    rerollButtonText.setOrigin(0, 0);
    this.rerollButtonContainer.add(rerollButtonText);

    this.rerollCostText = addTextObject(this.scene, 0, 0, "", TextStyle.PERFECT_IV);
    this.rerollCostText.setName("text-reroll-cost");
    this.rerollCostText.setOrigin(0, 0);
    this.rerollCostText.setPositionRelative(rerollButtonText, rerollButtonText.displayWidth + 5, 1);
    this.rerollButtonContainer.add(this.rerollCostText);

    this.lockRarityButtonContainer = this.scene.add.container(16, -64);
    this.lockRarityButtonContainer.setVisible(false);
    ui.add(this.lockRarityButtonContainer);

    const lockRarityButtonText = addTextObject(this.scene, -4, -2, i18next.t("modifierSelectUiHandler:lockRarities"), TextStyle.PARTY);
    lockRarityButtonText.setOrigin(0, 0);
    this.lockRarityButtonContainer.add(lockRarityButtonText);

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

    this.refreshTimerText = addTextObject(this.scene, 2, -160, "", TextStyle.PARTY, {fontSize: "54px"});
    this.refreshTimerText.setOrigin(0, 0);
    this.refreshTimerText.setVisible(false);
    ui.add(this.refreshTimerText);


    this.toggleContainer = this.scene.add.container(2, -150);
    this.toggleContainer.setVisible(false);
    ui.add(this.toggleContainer);

    this.scene.time.addEvent({
      delay: 1000,
      callback: this.updateRefreshTimer,
      callbackScope: this,
      loop: true
    });
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

    if (args.length !== 4 || !(args[1] instanceof Array) || !(args[2] instanceof Function)) {
      return false;
    }

    super.show(args);

    this.getUi().clearText();

    this.player = args[0];

    const partyHasHeldItem = this.player && !!this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable).length;
    const canLockRarities = !!this.scene.findModifier(m => m instanceof LockModifierTiersModifier);

    this.rerollButtonContainer.setVisible(false);
    this.rerollButtonContainer.setAlpha(0);

    this.lockRarityButtonContainer.setVisible(false);
    this.lockRarityButtonContainer.setAlpha(0);

    this.refreshTimerText.setVisible(false);
    this.refreshTimerText.setAlpha(0);

    this.rerollButtonContainer.setPositionRelative(this.lockRarityButtonContainer, 0, canLockRarities ? -12 : 0);

    this.rerollCost = args[3] as integer;

    this.updateRerollCostText();

    const typeOptions = args[1] as ModifierTypeOption[];
    const shopTypeOptions = [];
    const optionsYOffset = shopTypeOptions.length >= SHOP_OPTIONS_ROW_LIMIT ? -8 : -24;

    for (let m = 0; m < typeOptions.length; m++) {
      const sliceWidth = (this.scene.game.canvas.width / 5) / (typeOptions.length + 2);
      const option = new ModifierOption(this.scene, sliceWidth * (m + 1) + (sliceWidth * 0.5) - 35, -this.scene.game.canvas.height / 12 + optionsYOffset, typeOptions[m]);
      option.setScale(0.45);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    for (let m = 0; m < shopTypeOptions.length; m++) {
      const row = m < SHOP_OPTIONS_ROW_LIMIT ? 0 : 1;
      const col = m < SHOP_OPTIONS_ROW_LIMIT ? m : m - SHOP_OPTIONS_ROW_LIMIT;
      const rowOptions = shopTypeOptions.slice(row ? SHOP_OPTIONS_ROW_LIMIT : 0, row ? undefined : SHOP_OPTIONS_ROW_LIMIT);
      const sliceWidth = (this.scene.game.canvas.width / SHOP_OPTIONS_ROW_LIMIT) / (rowOptions.length + 2);
      const option = new ModifierOption(this.scene, sliceWidth * (col + 1) + (sliceWidth * 0.5), ((-this.scene.game.canvas.height / 12) - (this.scene.game.canvas.height / 32) - (40 - (28 * row - 1))), shopTypeOptions[m]);
      option.setScale(0.375);
      this.scene.add.existing(option);
      this.modifierContainer.add(option);

      if (row >= this.shopOptionsRows.length) {
        this.shopOptionsRows.push([]);
      }
      this.shopOptionsRows[row].push(option);
    }

    const maxUpgradeCount = typeOptions.map(to => to.upgradeCount).reduce((max, current) => Math.max(current, max), 0);

    /* Force updateModifiers without pokemonSpecificModifiers */
    this.scene.getModifierBar().updateModifiers(this.scene.modifiers, true);

    /* Multiplies the appearance duration by the speed parameter so that it is always constant, and avoids "flashbangs" at game speed x5 */
    this.scene.showShopOverlay(750 * this.scene.gameSpeed);

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

      this.rerollButtonContainer.setAlpha(0);
      this.lockRarityButtonContainer.setAlpha(0);
      this.rerollButtonContainer.setVisible(true);
      this.lockRarityButtonContainer.setVisible(canLockRarities);
      this.refreshTimerText.setVisible(true);
      this.toggleContainer.setVisible(false);
      this.toggleContainer.setAlpha(0);

      const isNuzlockeQuestCompleted = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
      
      if (isNuzlockeQuestCompleted) {
        this.toggleContainer.removeAll(true);
        
        const icon = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_VARIANT");
        const type = this.scene.inputController?.getLastSourceType() || "keyboard";
        const keySprite = this.scene.add.sprite(3, 3.5, type);
        if (icon) {
          keySprite.setFrame(icon);
        }
        keySprite.setScale(.6);
        
        const toggleText = addTextObject(this.scene, keySprite.displayWidth * keySprite.scaleX + 4, 0, i18next.t("questUi:console.toggleInfo"), TextStyle.PARTY, {fontSize: "30px"});
        toggleText.setOrigin(0, 0);
        
        this.toggleContainer.add([keySprite, toggleText]);
        this.toggleContainer.setVisible(true);
        this.toggleContainer.setAlpha(0);
      }

      this.scene.tweens.add({
        targets: [ this.rerollButtonContainer, this.lockRarityButtonContainer, this.refreshTimerText, this.toggleContainer ],
        alpha: 1,
        duration: 250
      });

      const updateCursorTarget = () => {
        console.log("updateCursorTarget called", {
          shopCursorTarget: this.scene.shopCursorTarget,
          currentOptions: this.options.length,
          shopRows: this.shopOptionsRows.map(row => row.length)
        });
        
        this.setRowCursor(this.scene.shopCursorTarget);
        this.setCursor(0);
      };

      this.updateRefreshTimer();

      updateCursorTarget();

      this.awaitingActionInput = true;
      this.onActionInput = args[2];
    });

    this.remainingOptions = [...typeOptions];

    return true;


  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    console.log(`Processing input: ${button}, awaitingActionInput: ${this.awaitingActionInput}, rowCursor: ${this.rowCursor}, cursor: ${this.cursor}`);

    if (!this.awaitingActionInput) {
    console.warn('Not awaiting action input, returning false');
      return false;
    }

    let success = false;

    if (button === Button.ACTION) {
      success = true;
      if (this.onActionInput) {
        const originalOnActionInput = this.onActionInput;
        this.awaitingActionInput = false;
        this.onActionInput = null;
      console.log(`Calling onActionInput with rowCursor: ${this.rowCursor}, cursor: ${this.cursor}`);
        if (!originalOnActionInput(this.rowCursor, this.cursor)) {
        console.log('onActionInput returned false, resetting awaitingActionInput');
          this.awaitingActionInput = true;
          this.onActionInput = originalOnActionInput;
        } else {
        console.log('onActionInput returned true, hiding moveInfoOverlay');
          this.moveInfoOverlayActive = this.moveInfoOverlay.active;
          this.moveInfoOverlay.setVisible(false);
        this.moveInfoOverlay.active = false;
        }
      }
    } else if (button === Button.CANCEL) {
      if (this.player) {
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
        if (this.rowCursor === 0 && this.cursor === 0) {
          success = this.setRowCursor(this.shopOptionsRows.length + 1);
          } else if (this.rowCursor < this.shopOptionsRows.length + 1) {
            success = this.setRowCursor(this.rowCursor + 1);
          }
          break;
        case Button.DOWN:
          if (this.rowCursor > 0) {
            success = this.setRowCursor(this.rowCursor - 1);
          }
          break;
        case Button.LEFT:
        if (this.rowCursor === 0) {
          success = false; 
        } else if (this.cursor > 0) {
            success = this.setCursor(this.cursor - 1);
          }
          break;
        case Button.RIGHT:
        if (this.rowCursor === 0) {
          success = false; 
          } else if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
            success = this.setCursor(this.cursor + 1);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    }

  console.log(`Input processed, success: ${success}, new rowCursor: ${this.rowCursor}, new cursor: ${this.cursor}`);
    return success;
  }

  setCursor(cursor: integer): boolean {
    const ui = this.getUi();
    const ret = super.setCursor(cursor);

    console.log(`setCursor called with cursor=${cursor}, rowCursor=${this.rowCursor}`);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.modifierContainer.add(this.cursorObj);
    }

    const options = (this.rowCursor === 1 ? this.options : this.shopOptionsRows[this.shopOptionsRows.length - (this.rowCursor - 1)]);
    
    console.log(`Options array length: ${options?.length || 'undefined'}`);
    console.log(`Current cursor: ${this.cursor}, is valid index: ${this.cursor < (options?.length || 0)}`);
    
    if (!options || options.length === 0 || this.cursor >= options.length) {
      console.warn(`Invalid cursor position: options is ${options ? (options.length === 0 ? 'empty' : 'valid') : 'undefined'}, cursor=${this.cursor}`);
      if (options && options.length > 0) {
        this.cursor = Math.min(this.cursor, options.length - 1);
      } else {
        console.warn(`Empty options array for rowCursor=${this.rowCursor}, adjusting...`);
        if (this.rowCursor > 0) {
          for (let r = 0; r <= this.shopOptionsRows.length + 1; r++) {
            if (r !== this.rowCursor) {
              const altOptions = (r === 1 ? this.options : this.shopOptionsRows[this.shopOptionsRows.length - (r - 1)]);
              if (altOptions && altOptions.length > 0) {
                console.log(`Found alternative row ${r} with ${altOptions.length} options`);
                this.rowCursor = r;
                this.cursor = 0;
                return this.setCursor(0); 
              }
            }
          }
        }
        this.rowCursor = 0;
        this.cursor = 0;
        console.log(`Defaulting to reroll row`);
      }
    }

    this.cursorObj.setScale(this.rowCursor === 1 ? 2 : this.rowCursor >= 2 ? 1.5 : 1);

    this.moveInfoOverlay.clear();
    if (this.rowCursor) {
      const sliceWidth = (this.scene.game.canvas.width / 5) / (options.length + 2);
      if (this.rowCursor < 2) {
        this.cursorObj.setPosition(sliceWidth * (cursor + 1) + (sliceWidth * 0.5) - 55, (-this.scene.game.canvas.height / 12) - (this.shopOptionsRows.length > 1 ? 6 : 22));
      } else {
        this.cursorObj.setPosition(sliceWidth * (cursor + 1) + (sliceWidth * 0.5) - 51, (-this.scene.game.canvas.height / 12 - this.scene.game.canvas.height / 32) - (-16 + 28 * (this.rowCursor - (this.shopOptionsRows.length - 1))));
      }

      const option = options[this.cursor];
      console.log(`Selected option:`, option ? 'valid' : 'undefined');
      
      if (!option) {
        console.warn(`Option at index ${this.cursor} is undefined!`);
        return ret;
      }
      
      const type = option.modifierTypeOption.type;
      type && ui.showText(type.getDescription(this.scene));
      if (type instanceof TmModifierType) {
        this.moveInfoOverlay.show(allMoves[type.moveId]);
      }
      else if(type instanceof PermaPartyAbilityModifierType) {
          this.moveInfoOverlay.show(type.ability.description);
      }
    } else if (cursor === 0) {
      this.cursorObj.setPosition(6, this.lockRarityButtonContainer.visible ? -72 : -60);
      ui.showText(i18next.t("modifierSelectUiHandler:rerollDesc"));
    }  else {
      this.cursorObj.setPosition(6, -60);
      ui.showText(i18next.t("modifierSelectUiHandler:lockRaritiesDesc"));
    }

    return ret;
  }

  private row1CursorPosition: number = 0; 

  setRowCursor(rowCursor: integer): boolean {
    const lastRowCursor = this.rowCursor;
    const maxRowCursor = this.shopOptionsRows.length + 1; 

    if (rowCursor !== lastRowCursor && rowCursor >= 0 && rowCursor <= maxRowCursor) {
      if (lastRowCursor === 1 && rowCursor === 0) {
        this.row1CursorPosition = this.cursor; 
        this.rowCursor = 0;
        this.setCursor(0); 
      } else if (lastRowCursor === 0 && rowCursor === 1) {
        this.rowCursor = 1;
        this.setCursor(this.row1CursorPosition); 
      } else {
      this.rowCursor = rowCursor;
        let newCursor = Math.min(this.cursor, this.getRowItems(rowCursor) - 1);
      this.setCursor(newCursor);
      }
      return true;
    }

    return false;
  }

  private getRowItems(rowCursor: integer): integer {
    switch (rowCursor) {
      case 0:
        return 3;
      case 1:
        return this.options.length;
      default:
        const shopRowIndex = this.shopOptionsRows.length - (rowCursor - 1);
        if (shopRowIndex >= 0 && shopRowIndex < this.shopOptionsRows.length) {
          return this.shopOptionsRows[shopRowIndex].length;
        } else {
          console.warn(`Invalid rowCursor: ${rowCursor}. Returning 0.`);
          return 0;
        }
    }
  }

  setRerollCost(rerollCost: integer): void {
    this.rerollCost = rerollCost;
  }

  updateCostText(): void {
    const shopOptions = this.shopOptionsRows.flat();
    for (const shopOption of shopOptions) {
      shopOption.updateCostText();
    }

    this.updateRerollCostText();
  }

  updateRerollCostText(): void {
    const canReroll = this.scene.gameData.permaMoney >= this.rerollCost;

    const formattedMoney = Utils.formatMoney(this.scene.moneyFormat, this.rerollCost);

    this.rerollCostText.setText(i18next.t("modifierSelectUiHandler:rerollPermaCost", { formattedMoney }));
    this.rerollCostText.setColor(this.getTextColor(canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED));
    this.rerollCostText.setShadowColor(this.getTextColor(canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED, true));
  }

  updateLockRaritiesText(): void {
    const textStyle = this.scene.lockModifierTiers ? TextStyle.SUMMARY_BLUE : TextStyle.PARTY;
    this.lockRarityButtonText.setColor(this.getTextColor(textStyle));
    this.lockRarityButtonText.setShadowColor(this.getTextColor(textStyle, true));
  }

  clear() {
    if (this.clearing) {
        return;
    }
    this.clearing = true;

    super.clear();

    this.moveInfoOverlay.clear();
    this.moveInfoOverlayActive = false;
    this.awaitingActionInput = false;
    this.onActionInput = null;
    this.getUi().clearText();
    this.eraseCursor();

    /* Multiplies the fade time duration by the speed parameter so that it is always constant, and avoids "flashbangs" at game speed x5 */
    this.scene.hideShopOverlay(750 * this.scene.gameSpeed);

    /* Normally already called just after the shop, but not sure if it happens in 100% of cases */
    this.scene.getModifierBar().updateModifiers(this.scene.modifiers);

    const options = this.options.concat(this.shopOptionsRows.flat());
    this.options.splice(0, this.options.length);
    this.shopOptionsRows.splice(0, this.shopOptionsRows.length);

    const animationPromises: Promise<void>[] = [];

    if (options.length > 0) {
        animationPromises.push(new Promise((resolve) => {
            this.scene.tweens.add({
                targets: options,
                scale: 0.01,
                duration: 250,
                ease: "Cubic.easeIn",
                onComplete: () => {
                    options.forEach(o => o.destroy());
                    resolve();
                }
            });
        }));
    }

    [ this.rerollButtonContainer, this.lockRarityButtonContainer, this.refreshTimerText, this.toggleContainer ].forEach(container => {
        if (container.visible) {
            animationPromises.push(new Promise((resolve) => {
                this.scene.tweens.add({
                    targets: container,
                    alpha: 0,
                    duration: 250,
                    ease: "Cubic.easeIn",
                    onComplete: () => {
                        container.setVisible(false);
                        resolve();
                    }
                });
            }));
        }
    });

    Promise.all(animationPromises).finally(() => {
        this.clearing = false;
    });
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  public setSelectedOption(option: ModifierTypeOption): void {
    this.selectedOption = option;
  }

  public getSelectedOption(): ModifierTypeOption | null {
    return this.selectedOption;
  }

  public removeSelectedOption(): void {
    console.log("removeSelectedOption called", {
      hasSelected: !!this.selectedOption,
      currentOptions: this.scene.gameData.currentPermaShopOptions?.length || 0,
      rowCursor: this.rowCursor,
      cursor: this.cursor
    });
    
    if (this.selectedOption && this.scene.gameData.currentPermaShopOptions) {
      console.log("Removing option with ID:", this.selectedOption.id);
      this.scene.gameData.currentPermaShopOptions = this.scene.gameData.currentPermaShopOptions.filter(
        option => option.id !== this.selectedOption!.id
      );
      console.log("Options after removal:", this.scene.gameData.currentPermaShopOptions.length);
      this.selectedOption = null;
    }

    if (this.scene.gameData.currentPermaShopOptions?.length === 0) {
      const rerollModifierType = modifierTypes.REROLL();
      const rerollModifier = new RerollModifier(rerollModifierType);

      this.scene.gameData.currentPermaShopOptions.push({
        id: 'reroll',
        type: rerollModifierType,
        upgradeCount: 0,
        cost: this.rerollCost
      });
      console.log("Added reroll option as shop was empty");
    }
    
    console.log("Shop state after removal:", {
      options: this.options.length,
      shopRows: this.shopOptionsRows.map(row => row.length),
      rowCursor: this.rowCursor,
      cursor: this.cursor
    });
  }

  public setRefreshFunction(refreshFunction: () => void): void {
    this.refreshShopFunction = refreshFunction;
  }

  updateRefreshTimer() {
    const currentTime = Date.now();
    const lastRefreshTime = this.scene.gameData.lastPermaShopRefreshTime || 0;
    const timeUntilRefresh = Math.max(0, this.refreshInterval - (currentTime - lastRefreshTime));

    if (timeUntilRefresh === 0) {
      if (this.refreshShopFunction) {
        this.refreshShopFunction();
      }
    }

    const minutes = Math.floor(timeUntilRefresh / 60000);
    const seconds = Math.floor((timeUntilRefresh % 60000) / 1000);

    this.refreshTimerText.setText(i18next.t("modifierSelectUiHandler:refreshTimer", {
      minutes,
      seconds: seconds.toString().padStart(2, '0')
    }));
  }
}

class ModifierOption extends Phaser.GameObjects.Container {
  public modifierTypeOption: ModifierTypeOption;
  private pb: Phaser.GameObjects.Sprite;
  private pbTint: Phaser.GameObjects.Sprite;
  private itemContainer: Phaser.GameObjects.Container;
  private item: Phaser.GameObjects.Sprite;
  private itemBG: Phaser.GameObjects.Sprite;
  private itemTint: Phaser.GameObjects.Sprite;
  private itemText: Phaser.GameObjects.Text;
  private itemCostText: Phaser.GameObjects.Text;

  private useSmitemsAtlas(): boolean {
    return this.modifierTypeOption.type.group == "perma";
  }

  constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption) {
    super(scene, x, y);

    this.modifierTypeOption = modifierTypeOption;

    this.setup();
  }

  setup() {
    if (!this.modifierTypeOption.cost) {
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
    this.itemContainer.setScale(0.25);
    this.itemContainer.setAlpha(0);
    this.add(this.itemContainer);

    let item = null
    this.itemBG = null

    const getItem = () => {
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
      } else if (this.modifierTypeOption.type instanceof QuestModifierType || this.modifierTypeOption.type instanceof QuestModifierTypeGenerator) {
        const questType = this.modifierTypeOption.type as QuestModifierType;
        const questData = questType.config.questUnlockData;
        let speciesId: Species | undefined;
        
        if (questData.questSpriteId) {
          speciesId = questData.questSpriteId;
        } 
        else if (Array.isArray(questData.rewardId) && questData.rewardId.length > 0 && typeof questData.rewardId[0] === 'number') {
          speciesId = questData.rewardId[0];
        }
        else if (typeof questData.rewardId === 'number') {
          speciesId = questData.rewardId;
        } 
        

        if (speciesId) {
          const pokemon = getPokemonSpecies(speciesId);
          item = this.scene.add.sprite(0, 0, pokemon.getIconAtlasKey());
          item.setFrame(pokemon.getIconId(false));
          item.setScale(0.75)

          this.itemBG = this.scene.add.sprite(0, 0, "smitems_192", "quest");
          this.itemBG.setScale(0.167);

        } else {
          item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems_192" : "items", this.modifierTypeOption.type.iconImage);
          if(this.useSmitemsAtlas()) {
            item.setScale(0.167);
          }
        }
      } else {
        item = this.scene.add.sprite(0, 0, this.useSmitemsAtlas() ? "smitems_192" : "items", this.modifierTypeOption.type.iconImage);
        if(this.useSmitemsAtlas()) {
          item.setScale(0.167);
        }
      }
      return item;
    };

    this.item = getItem();
    if(this.itemBG) {
      this.itemContainer.add(this.itemBG);
    }
    this.itemContainer.add(this.item);

    if (!this.modifierTypeOption.cost) {
      this.itemTint = getItem();
      this.itemTint.setTintFill(Phaser.Display.Color.GetColor(255, 192, 255));
      this.itemContainer.add(this.itemTint);
    }

    this.itemText = addTextObject(this.scene, 0, 35, this.modifierTypeOption.type?.name, TextStyle.PARTY, { align: "center" }); 
    this.itemText.setOrigin(0.5, 0);
    this.itemText.setAlpha(0);
    this.itemText.setTint(this.modifierTypeOption.type?.tier ? getModifierTierTextTint(this.modifierTypeOption.type?.tier) : undefined);
    this.add(this.itemText);

    this.itemCostText = addTextObject(this.scene, 0, 45, "", TextStyle.PERFECT_IV, { align: "center" });
    this.itemCostText.setOrigin(0.5, 0);
    this.itemCostText.setAlpha(0);
    this.add(this.itemCostText);

    this.updateCostText();
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
      this.scene.tweens.add({
        targets: this.itemCostText,
        duration: 500,
        alpha: 1,
        y: 35,
        ease: "Cubic.easeInOut"
      });
    });
  }

  getPbAtlasKey(tierOffset: integer = 0) {
    return getPokeballAtlasKey((this.modifierTypeOption.type?.tier! + tierOffset) as integer as PokeballType); 
  }

  updateCostText(): void {
    const scene = this.scene as BattleScene;
    const cost = Overrides.WAIVE_ROLL_FEE_OVERRIDE ? 0 : this.modifierTypeOption.cost;
    const textStyle = cost <= scene.gameData.permaMoney ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED;

    const formattedMoney = Utils.formatMoney(scene.moneyFormat, cost);

    this.itemCostText.setText(i18next.t("modifierSelectUiHandler:itemPermaCost", { formattedMoney }));
    this.itemCostText.setColor(getTextColor(textStyle, false, scene.uiTheme));
    this.itemCostText.setShadowColor(getTextColor(textStyle, true, scene.uiTheme));
  }
}
