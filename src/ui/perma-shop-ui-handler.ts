import BattleScene from "../battle-scene";
import LootRewardSelectUiHandler from "./loot-reward-select-ui-handler";
import { ModifierOption } from "./modifier-select-ui-handler";
import { ModifierTypeOption, modifierTypes } from "../modifier/modifier-type";
import { ModifierTier } from "../modifier/modifier-tier";
import { addTextObject, getTextColor, TextStyle } from "./text";
import { Mode } from "./mode";
import Overrides from "../overrides";
import i18next from "i18next";
import * as Utils from "../utils";

class PermaModifierOption extends ModifierOption {
  constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption) {
    super(scene, x, y, modifierTypeOption, true);
  }

  protected getItemCostTextY(): number {
    return 29.5;
  }

  updateCostText(): void {
    const scene = this.scene as BattleScene;
    const cost = Overrides.WAIVE_ROLL_FEE_OVERRIDE ? 0 : (this.modifierTypeOption.cost ?? 0);
    const textStyle = cost <= scene.gameData.permaMoney ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED;
    const formattedMoney = Utils.formatMoney(scene.moneyFormat, cost);
    this.itemCostText.setText(i18next.t("modifierSelectUiHandler:itemPermaCost", { formattedMoney }));
    this.itemCostText.setColor(getTextColor(textStyle, false, scene.uiTheme));
    this.itemCostText.setShadowColor(getTextColor(textStyle, true, scene.uiTheme));
  }
}

export default class PermaShopUiHandler extends LootRewardSelectUiHandler {
  readonly isPermaShopHandler = true;
  protected storedUIMode: Mode = Mode.SHOP_SELECT;

  private refreshTimerText: Phaser.GameObjects.Text | null = null;
  private refreshTimerEvent: Phaser.Time.TimerEvent | null = null;
  private refreshInterval: number = 10 * 60 * 1000;
  private refreshShopFunction: (() => void) | null = null;
  private selectedOption: ModifierTypeOption | null = null;
  private permaShopRerollCost: integer = 0;

  show(args: any[]): boolean {
    if (args.length === 4) {
      args.push(false);
      args.push({
        title: i18next.t("modifierSelectUiHandler:permaShopTitle", { defaultValue: "OMEGA SHOP" }),
        subtitle: i18next.t("modifierSelectUiHandler:permaShopSubtitle", { defaultValue: "Embrace forbidden power seeping from the void, it lasts between runs..." }),
        hideShop: false,
        customShopStrip: false,
      });
    }

    const result = super.show(args);

    if (result) {
      if (this.bgImage) {
        this.bgImage.setTint(0xBB88FF);
      }
      const battleScene = this.scene as BattleScene;
      if (battleScene.currentBattle) {
        const overlay = (battleScene as any).shopOverlay as Phaser.GameObjects.Rectangle | null;
        if (overlay) {
          overlay.setAlpha(0.8);
        }
      }
      if (battleScene.moneyText) {
        battleScene.moneyText.setVisible(false);
      }
      const subtitleRef = (this as any).headerSubtitleText as Phaser.GameObjects.Text | null;
      if (subtitleRef) {
        subtitleRef.setFontSize(47);
      }
      this.setupRefreshTimer();
      this.updateLootMoneyDisplay();
      for (const option of this.options) {
        option.updateCostText();
        const optAny = option as any;
        if (optAny.itemText) {
          optAny.itemText.setFontSize(32);
        }
        if (option.itemCostText) {
          option.itemCostText.setFontSize(40);
          option.itemCostText.setStroke("#424242", 14);
        }
      }
      const secondaryTexts = (this as any).cardSecondaryTexts as Map<any, Phaser.GameObjects.Text> | undefined;
      if (secondaryTexts) {
        for (const [, text] of secondaryTexts) {
          text.setVisible(false);
        }
      }
      this.updateRerollCostText();
      if (this.permaRerollButtonContainer) {
        this.permaRerollButtonContainer.setVisible(false);
        this.permaRerollButtonContainer.setAlpha(0);
      }
      if (this.rerollButtonContainer) {
        this.rerollButtonContainer.setVisible(true);
        this.rerollButtonContainer.setAlpha(1);
      }
      if (this.checkButtonContainer) {
        this.checkButtonContainer.setVisible(false);
        this.checkButtonContainer.setAlpha(0);
      }
      if (this.transferButtonContainer) {
        this.transferButtonContainer.setVisible(false);
        this.transferButtonContainer.setAlpha(0);
      }
    }

    return result;
  }

  clear(): void {
    const battleScene = this.scene as BattleScene;
    if (battleScene.moneyText) {
      if (battleScene.currentBattle != null) {
        battleScene.updateMoneyText(true);
      } else {
        battleScene.updateMoneyText(false);
        battleScene.moneyText.setVisible(false);
      }
    }
    if (this.refreshTimerEvent) {
      this.refreshTimerEvent.remove(false);
      this.refreshTimerEvent = null;
    }
    if (this.refreshTimerText) {
      this.scene.tweens.killTweensOf(this.refreshTimerText);
      this.refreshTimerText.setVisible(false);
      this.refreshTimerText.setAlpha(0);
    }
    this.refreshShopFunction = null;
    if (this.bgImage) {
      this.bgImage.clearTint();
    }
    super.clear();
  }

  protected getShopTypeOptions(): ModifierTypeOption[] | null {
    return null;
  }

  protected getShopLayout(): { rows: number; itemsPerRow: number } {
    return { rows: 1, itemsPerRow: 5 };
  }

  protected getMainOptionsYOffset(_shopTypeOptions: ModifierTypeOption[] | null): number {
    return 16.5;
  }

  protected createOptionInstance(x: number, y: number, typeOption: ModifierTypeOption): ModifierOption {
    return new PermaModifierOption(this.scene, x, y, typeOption);
  }

  protected shouldShowCardSecondaryText(): boolean {
    return false;
  }

  protected meetsCondenseTrailTier(_typeOptions: any[]): boolean {
    return false;
  }

  protected getShowDetailsHintYOffset(): number {
    return super.getShowDetailsHintYOffset();
  }

  protected updateLootMoneyDisplay(): void {
    if (this.moneyText) {
      this.moneyText.setVisible(false);
      this.moneyText.setText("");
    }
    if (this.omegaMoneyText) {
      const omega = this.scene.gameData?.permaMoney ?? 0;
      const formatted = Utils.formatMoney(this.scene.moneyFormat, omega);
      this.omegaMoneyText.setText(`Ω${formatted}`);
      this.omegaMoneyText.setVisible(true);
    }
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
    this.updateLootMoneyDisplay();
    if (this.shopStripOverlay) this.shopStripOverlay.setVisible(false);
    if (this.shopStripLabel) this.shopStripLabel.setVisible(false);
    this.shopStripContainer.setVisible(true);
    this.shopStripContainer.setAlpha(1);
  }

  updateRerollCostText(): void {
    if (!this.rerollCostText) return;
    const canReroll = this.scene.gameData.permaMoney >= this.permaShopRerollCost;
    const formattedMoney = Utils.formatMoney(this.scene.moneyFormat, this.permaShopRerollCost);
    this.rerollCostText.setText(i18next.t("modifierSelectUiHandler:rerollPermaCost", { formattedMoney }));
    this.rerollCostText.setColor(this.getTextColor(canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED));
    this.rerollCostText.setShadowColor(this.getTextColor(canReroll ? TextStyle.PERFECT_IV : TextStyle.PARTY_RED, true));
  }

  updateCostText(): void {
    for (const option of this.options) {
      option.updateCostText();
    }
    this.updateRerollCostText();
    this.updateLootMoneyDisplay();
  }

  public setRerollCost(rerollCost: integer): void {
    this.permaShopRerollCost = rerollCost;
    super.setRerollCost(rerollCost);
  }

  public setSelectedOption(option: ModifierTypeOption): void {
    this.selectedOption = option;
  }

  public getSelectedOption(): ModifierTypeOption | null {
    return this.selectedOption;
  }

  public removeSelectedOption(): void {
    if (this.selectedOption && this.scene.gameData.currentPermaShopOptions) {
      this.scene.gameData.currentPermaShopOptions = this.scene.gameData.currentPermaShopOptions.filter(
        option => option.id !== this.selectedOption!.id
      );
      this.selectedOption = null;
    }
    if (this.scene.gameData.currentPermaShopOptions?.length === 0) {
      const rerollModifierType = modifierTypes.REROLL();
      this.scene.gameData.currentPermaShopOptions.push({
        id: 'reroll',
        type: rerollModifierType,
        upgradeCount: 0,
        cost: this.permaShopRerollCost
      } as any);
    }
  }

  public setRefreshFunction(refreshFunction: () => void): void {
    this.refreshShopFunction = refreshFunction;
  }

  updateRefreshTimer(): void {
    if (!this.refreshTimerText) return;
    const currentTime = Date.now();
    const lastRefreshTime = this.scene.gameData.lastPermaShopRefreshTime || 0;
    const timeUntilRefresh = Math.max(0, this.refreshInterval - (currentTime - lastRefreshTime));
    if (timeUntilRefresh === 0 && this.refreshShopFunction) {
      this.refreshShopFunction();
    }
    const minutes = Math.floor(timeUntilRefresh / 60000);
    const seconds = Math.floor((timeUntilRefresh % 60000) / 1000);
    this.refreshTimerText.setText(i18next.t("modifierSelectUiHandler:refreshTimer", {
      minutes,
      seconds: seconds.toString().padStart(2, "0"),
      defaultValue: "{{minutes}}:{{seconds}}"
    }));
  }

  private setupRefreshTimer(): void {
    const screenW = this.scene.game.canvas.width / 6;
    const modalTopY = -(this.scene.game.canvas.height / 6);
    const timerX = screenW - 5;
    const timerY = modalTopY + 14;
    if (!this.refreshTimerText) {
      this.refreshTimerText = addTextObject(this.scene, timerX, timerY, "", TextStyle.PARTY, { fontSize: "36px" });
      this.refreshTimerText.setOrigin(1, 0);
      this.refreshTimerText.setStroke("#424242", 14);
      this.refreshTimerText.setShadow(0, 0, undefined);
      this.refreshTimerText.setVisible(false);
      this.modifierContainer.add(this.refreshTimerText);
    } else {
      this.refreshTimerText.setPosition(timerX, timerY);
    }
    if (this.refreshTimerEvent) {
      this.refreshTimerEvent.remove(false);
      this.refreshTimerEvent = null;
    }
    this.refreshTimerEvent = this.scene.time.addEvent({
      delay: 1000,
      callback: this.updateRefreshTimer,
      callbackScope: this,
      loop: true,
    });
    this.refreshTimerText.setVisible(true);
    this.refreshTimerText.setAlpha(1);
    this.modifierContainer.bringToTop(this.refreshTimerText);
    this.updateRefreshTimer();
  }
}