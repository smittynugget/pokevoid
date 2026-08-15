import BattleScene from "../battle-scene";
import LootRewardSelectUiHandler from "./loot-reward-select-ui-handler";
import { ModifierOption } from "./modifier-select-ui-handler";
import { ModifierTooltipUtils } from "./modifier-tooltip-utils";
import { ModifierTypeOption } from "../modifier/modifier-type";
import { getPartyCollectedTypeTotal } from "#app/utils/collected-type-totals.js";
import { Button } from "../enums/buttons";
import i18next from "i18next";
import { addTextObject, TextStyle, getTextColor } from "./text";
import { Mode } from "./mode";
import { isPrimaryPointer } from "./pointer-utils";

export class CollectedTypeShopUiHandler extends LootRewardSelectUiHandler {
    protected storedUIMode: Mode = Mode.COLLECTED_TYPE_SELECT;

    private collectedTypeDisplay: Phaser.GameObjects.Container;
    private collectedTypeTitle: Phaser.GameObjects.Text;
    private collectedTypeIcon: Phaser.GameObjects.Sprite;
    private collectedTypeText: Phaser.GameObjects.Text;

    constructor(scene: BattleScene) {
        super(scene);
    }

    private setupCollectedTypeDisplay(): void {
        if (this.collectedTypeDisplay) {
            this.collectedTypeDisplay.destroy();
        }

        const rightX = (this.scene.game.canvas.width / 6) - 45;
        const centerY = -(this.scene.game.canvas.height / 6) / 2 - 25;

        this.collectedTypeDisplay = this.scene.add.container(rightX, centerY);
        this.collectedTypeDisplay.setName("collected-type-display");

        this.collectedTypeTitle = addTextObject(
            this.scene,
            0,
            -13,
            i18next.t("modifierSelectUiHandler:collectedTypeTotalLabel", { defaultValue: "Collected" }),
            TextStyle.WINDOW,
            { fontSize: "56px" }
        );
        this.collectedTypeTitle.setOrigin(0, 0.5);

        this.collectedTypeIcon = this.scene.add.sprite(23.5, 0, "smitems", "modSoulCollected");
        this.collectedTypeIcon.setScale(0.15);

        this.collectedTypeText = addTextObject(
            this.scene,
            2.5,
            -0.5,
            "0",
            TextStyle.MONEY,
            { fontSize: "64px" }
        );
        this.collectedTypeText.setOrigin(0, 0.5);
        this.collectedTypeText.setFontFamily("pkmnems");
        this.collectedTypeText.setShadow(0, 0, undefined);
        this.collectedTypeText.setStroke("#424242", 14);

        this.collectedTypeDisplay.add([this.collectedTypeTitle, this.collectedTypeIcon, this.collectedTypeText]);
        this.modifierContainer.add(this.collectedTypeDisplay);
    }

    show(args: any[]): boolean {
        if (args.length === 5) {
            args.push({
                title: i18next.t("modifierSelectUiHandler:collectedTypeShopTitle", { defaultValue: "SOUL EXCHANGE" }),
                subtitle: i18next.t("modifierSelectUiHandler:collectedTypeShopSubtitle", { defaultValue: "Trade collected essences for powerful items." }),
                hideShop: false,
                customShopStrip: false,
            });
        } else if (args.length >= 6) {
            const dc = args[5] as any;
            if (dc && !dc.title) {
                dc.title = i18next.t("modifierSelectUiHandler:collectedTypeShopTitle", { defaultValue: "SOUL EXCHANGE" });
                dc.subtitle = dc.subtitle || i18next.t("modifierSelectUiHandler:collectedTypeShopSubtitle", { defaultValue: "Trade collected essences for powerful items." });
            }
        }

        const result = super.show(args);

        if (result) {
            if (this.bgImage) {
                this.bgImage.setTint(0xFF8888);
            }
            this.setupCollectedTypeDisplay();
            this.updateCollectedTypeDisplay();

            if (this.permaRerollButtonContainer) {
                this.permaRerollButtonContainer.setVisible(false);
                this.permaRerollButtonContainer.setAlpha(0);
                this.permaRerollButtonContainer.removeInteractive();
            }

            this.rebindBottomButtonPointers();

            for (const option of this.options) {
                if (option instanceof CollectedTypeModifierOption) {
                    option.updateCostText(this.getTotalCollectedTypes());
                }
            }
        }

        return result;
    }

    public updateCollectedTypeDisplay(): void {
        const total = getPartyCollectedTypeTotal(this.scene);
        if (this.collectedTypeText) {
            this.collectedTypeText.setText(total.toString());
        }

        if (this.options) {
            for (const option of this.options) {
                if (option instanceof CollectedTypeModifierOption) {
                    option.updateCostText(total);
                }
            }
        }
    }

    public getTotalCollectedTypes(): number {
        return getPartyCollectedTypeTotal(this.scene);
    }

    protected createOptionInstance(x: number, y: number, typeOption: ModifierTypeOption): ModifierOption {
        return new CollectedTypeModifierOption(this.scene, x, y, typeOption, true);
    }

    protected getShowDetailsHintYOffset(): number {
        if (this.rowCursor !== 1) return 27;
        if (this._isMouseHoverPreview && !this._hoverOnFocusedOption) return 29;
        return 32;
    }

    protected getShopTypeOptions(): ModifierTypeOption[] | null {
        return null;
    }

    protected populateShopStrip(): void {
        if (this.shopStripContainer) {
            this.shopStripContainer.setVisible(false);
        }
    }

    protected updateLootMoneyDisplay(): void {
        if (this.moneyText) {
            this.moneyText.setVisible(false);
        }
        if (this.omegaMoneyText) {
            this.omegaMoneyText.setVisible(false);
        }
    }
    protected getMainOptionsYOffset(shopTypeOptions: ModifierTypeOption[] | null): number {
        return 16.5;
    }
    private rebindBottomButtonPointers(): void {
        const allContainers = [
            this.rerollButtonContainer,
            this.transferButtonContainer,
            this.checkButtonContainer,
        ];
        for (const container of allContainers) {
            if (!container) continue;
            const existingZone = container.getByName("btn-hit-zone");
            if (existingZone) container.remove(existingZone, true);
            container.removeAllListeners();
            container.disableInteractive();
        }

        const visibleContainers = allContainers.filter(c => c?.visible);

        for (let idx = 0; idx < visibleContainers.length; idx++) {
            const container = visibleContainers[idx]!;
            const frame = container.list?.[0] as Phaser.GameObjects.Image | undefined;
            const textChild = container.list?.find((child: any) => child.name && child.name.startsWith("text-")) as Phaser.GameObjects.Text | undefined;

            let zoneX: number, zoneY: number, zoneW: number, zoneH: number;
            if (frame && frame.displayWidth > 0 && textChild) {
                const pad = 2;
                const fLeft = frame.x - frame.displayWidth * frame.originX;
                const fTop = frame.y - frame.displayHeight * frame.originY;
                const fRight = fLeft + frame.displayWidth;
                const fBottom = fTop + frame.displayHeight;
                const tLeft = textChild.x - textChild.displayWidth * textChild.originX;
                const tTop = textChild.y - textChild.displayHeight * textChild.originY;
                const tRight = tLeft + textChild.displayWidth;
                const tBottom = tTop + textChild.displayHeight;
                const uLeft = Math.min(fLeft, tLeft) - pad;
                const uTop = Math.min(fTop, tTop) - pad;
                const uRight = Math.max(fRight, tRight) + pad;
                const uBottom = Math.max(fBottom, tBottom) + pad;
                zoneX = uLeft;
                zoneY = uTop;
                zoneW = uRight - uLeft;
                zoneH = uBottom - uTop;
            } else if (frame && frame.displayWidth > 0) {
                const pad = 2;
                zoneX = frame.x - frame.displayWidth * frame.originX - pad;
                zoneY = frame.y - frame.displayHeight * frame.originY - pad;
                zoneW = frame.displayWidth + pad * 2;
                zoneH = frame.displayHeight + pad * 2;
            } else {
                zoneX = -4;
                zoneY = -5.5;
                zoneW = 64;
                zoneH = 18;
            }

            const hitZone = this.scene.add.zone(zoneX + zoneW / 2, zoneY + zoneH / 2, zoneW, zoneH);
            hitZone.setOrigin(0.5, 0.5);
            hitZone.setName("btn-hit-zone");
            hitZone.setInteractive(new Phaser.Geom.Rectangle(0, 0, zoneW, zoneH), Phaser.Geom.Rectangle.Contains);
            container.add(hitZone);

            const boundIdx = idx;
            hitZone.on("pointerover", () => {
                this._isMouseHoverPreview = true;
                if (this.rowCursor !== 0) this.setRowCursor(0);
                this.setCursor(boundIdx);
                this._isMouseHoverPreview = false;
                (this as any).applyCursorFromConfig();
            });
            hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (!isPrimaryPointer(pointer)) return;
                if (this.rowCursor !== 0) {
                    this.setRowCursor(0);
                    this.setCursor(boundIdx);
                } else if (this.cursor !== boundIdx) {
                    this.setCursor(boundIdx);
                } else {
                    this.processInput(Button.ACTION);
                }
            });
            hitZone.on("pointerout", () => {
                ModifierTooltipUtils.hide(this.scene);
            });
        }
    }

    protected changePage(direction: number): void {
        super.changePage(direction);
        for (const option of this.options) {
            if (option instanceof CollectedTypeModifierOption) {
                option.updateCostText(this.getTotalCollectedTypes());
            }
        }
    }

    processInput(button: Button): boolean {
        if (button === Button.ACTION && this.rowCursor === 1 && this.awaitingActionInput) {
            const option = this.options[this.cursor];
            if (option instanceof CollectedTypeModifierOption && !option.canAfford()) {
                this.getUi().playError();
                return true;
            }
        }
        return super.processInput(button);
    }

    protected meetsCondenseTrailTier(_typeOptions: any[]): boolean {
        return false;
    }

    clear() {
        if (this.collectedTypeDisplay) {
            this.collectedTypeDisplay.destroy();
            this.collectedTypeDisplay = null;
        }
        if (this.bgImage) {
            this.bgImage.clearTint();
        }

        super.clear();
    }
}

export class CollectedTypeModifierOption extends ModifierOption {
    private static readonly ESSENCE_COST_Y = 49.5;
    private static readonly ESSENCE_ICON_X = -16;
    private static readonly ESSENCE_ICON_SCALE = 0.14;
    private static readonly ESSENCE_TEXT_GAP = 3;
    private static readonly ESSENCE_FONT_SIZE = "42px";

    private collectedIcon: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption, showCost: boolean = true) {
        super(scene, x, y, modifierTypeOption, showCost);
        this.updateCostText();
    }

    protected getItemCostTextY(): number {
        return CollectedTypeModifierOption.ESSENCE_COST_Y;
    }

    public canAfford(knownTotal?: number): boolean {
        const cost = this.modifierTypeOption.cost || 0;
        if (cost === 0) {
            return true;
        }
        const total = knownTotal ?? getPartyCollectedTypeTotal(this.scene as BattleScene);
        return total >= cost;
    }

    private layoutEssenceCostRow(knownTotal?: number): void {
        const y = this.getItemCostTextY();
        const textX = CollectedTypeModifierOption.ESSENCE_ICON_X;

        if (!this.itemCostText) {
            return;
        }

        const cost = this.modifierTypeOption.cost;
        const canAfford = this.canAfford(knownTotal);
        const textStyle = canAfford ? TextStyle.MONEY : TextStyle.PARTY_RED;
        const battleScene = this.scene as BattleScene;

        this.itemCostText.setText(cost.toString());
        this.itemCostText.setFontSize(CollectedTypeModifierOption.ESSENCE_FONT_SIZE);
        this.itemCostText.setFontFamily("pkmnems");
        this.itemCostText.setOrigin(0, 0.5);
        this.itemCostText.setColor(getTextColor(textStyle, false, battleScene.uiTheme));
        this.itemCostText.setShadow(0, 0, undefined);
        this.itemCostText.setStroke("#424242", 14);
        this.itemCostText.setPosition(textX, y);

        const iconX = textX + this.itemCostText.displayWidth + 3;

        if (!this.collectedIcon) {
            this.collectedIcon = this.scene.add.sprite(iconX, y, "smitems", "modSoulCollected");
            this.collectedIcon.setScale(CollectedTypeModifierOption.ESSENCE_ICON_SCALE * 1.6);
            this.collectedIcon.setOrigin(0, 0.5);
            this.collectedIcon.setAlpha(0);
            this.add(this.collectedIcon);
        } else {
            this.collectedIcon.setPosition(iconX, y);
            this.collectedIcon.setScale(CollectedTypeModifierOption.ESSENCE_ICON_SCALE * 1.6);
            this.collectedIcon.setOrigin(0, 0.5);
        }
    }

    protected additionalDisplayTweens(): void {
        const y = this.getItemCostTextY();
        if (this.collectedIcon) {
            this.scene.tweens.add({
                targets: this.collectedIcon,
                duration: 500,
                alpha: 1,
                y,
                ease: "Cubic.easeInOut"
            });
        }
    }

    public forceReveal(): void {
        super.forceReveal();
        const y = this.getItemCostTextY();
        if (this.collectedIcon) {
            this.collectedIcon.setAlpha(1);
            this.collectedIcon.y = y;
        }
        this.layoutEssenceCostRow();
    }

    updateCostText(knownTotal?: number): void {
        if (this.showCost && this.modifierTypeOption.cost > 0) {
            this.layoutEssenceCostRow(knownTotal);
        }
    }
}