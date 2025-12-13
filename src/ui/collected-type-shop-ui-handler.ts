import BattleScene from "../battle-scene";
import ModifierSelectUiHandler, { ModifierOption } from "./modifier-select-ui-handler";
import { ModifierTypeOption } from "../modifier/modifier-type";
import { CollectedTypeModifier } from "../modifier/modifier";
import { Type } from "../data/type";
import { Button } from "../enums/buttons";
import i18next from "i18next";
import { addTextObject, TextStyle, setTextStyle, getTextColor } from "./text";

export class CollectedTypeShopUiHandler extends ModifierSelectUiHandler {
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
            i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }),
            TextStyle.WINDOW,
            { fontSize: "56px" }
        );
        this.collectedTypeTitle.setOrigin(0, 0.5);

        this.collectedTypeIcon = this.scene.add.sprite(5, 0, "smitems", "modSoulCollected");
        this.collectedTypeIcon.setScale(0.15);

        this.collectedTypeText = addTextObject(
            this.scene,
            15,
            0,
            "0",
            TextStyle.MONEY,
            { fontSize: "64px" }
        );
        this.collectedTypeText.setOrigin(0, 0.5);

        this.collectedTypeDisplay.add([this.collectedTypeTitle, this.collectedTypeIcon, this.collectedTypeText]);
        this.modifierContainer.add(this.collectedTypeDisplay);
    }

    show(args: any[]): boolean {
        const result = super.show(args);

        if (result) {
            this.setupCollectedTypeDisplay();
            this.updateCollectedTypeDisplay();
        }

        return result;
    }

    public updateCollectedTypeDisplay(): void {
        if (this.collectedTypeText) {
            const total = this.getTotalCollectedTypes();
            this.collectedTypeText.setText(total.toString());
        }

        if (this.options) {
            for (const option of this.options) {
                if (option instanceof CollectedTypeModifierOption) {
                    option.updateCostText();
                }
            }
        }
    }

    public getTotalCollectedTypes(): number {
        return this.getTotalCollectedTypesInternal();
    }

    private getTotalCollectedTypesInternal(): number {
        const party = this.scene.getParty();
        let total = 0;

        for (const pokemon of party) {
            const modifiers = this.scene.findModifiers(m =>
                m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id
            ) as CollectedTypeModifier[];

            for (const modifier of modifiers) {
                total += Object.values(modifier.collectedTypes).reduce((sum, count) => sum + count, 0);
            }
        }

        return total;
    }

    protected getShopTypeOptions(): ModifierTypeOption[] | null {
        return null;
    }

    protected createModifierOption(typeOptions: ModifierTypeOption[], index: number, optionsYOffset: number): ModifierOption {
        const layout = this.getShopLayout();
        const row = Math.floor(index / layout.itemsPerRow);
        const col = index % layout.itemsPerRow;

        const itemsInRow = Math.min(layout.itemsPerRow, typeOptions.length - row * layout.itemsPerRow);
        const sliceWidth = (this.scene.game.canvas.width / 6) / (itemsInRow + 2);

        const x = sliceWidth * (col + 1) + (sliceWidth * 0.5);
        const y = -this.scene.game.canvas.height / 12 - 60 + (row * 45);

        return new CollectedTypeModifierOption(this.scene, x, y, typeOptions[index], true);
    }

    protected getMainOptionsYOffset(shopTypeOptions: ModifierTypeOption[] | null): number {
        return -44;
    }

    protected getShopLayout(): { rows: number, itemsPerRow: number } {
        return { rows: 2, itemsPerRow: 4 };
    }

    setCursor(cursor: integer): boolean {
        const ui = this.getUi();
        const ret = super.setCursor(cursor);

        if (!this.cursorObj) {
            this.cursorObj = this.scene.add.image(0, 0, "cursor");
            this.modifierContainer.add(this.cursorObj);
        }

        if (this.rowCursor === 0) {
            const buttonLayout = this.getButtonLayout();
            const buttonInfo = buttonLayout[cursor];

            if (buttonInfo) {
                this.cursorObj.setPosition(buttonInfo.x, buttonInfo.y);
                this.cursorObj.setScale(1);
                ui.showText(i18next.t(buttonInfo.descKey));
                return ret;
            } else {
                this.cursor = Math.min(cursor, buttonLayout.length - 1);
                return this.setCursor(this.cursor);
            }
        }

        if (this.rowCursor === 1) {
            const options = this.options;

            if (!options || options.length === 0 || cursor >= options.length) {
                return false;
            }

            this.cursor = cursor;

            const layout = this.getShopLayout();
            const row = Math.floor(cursor / layout.itemsPerRow);
            const col = cursor % layout.itemsPerRow;

            const itemsInRow = Math.min(layout.itemsPerRow, options.length - row * layout.itemsPerRow);
            const sliceWidth = (this.scene.game.canvas.width / 6) / (itemsInRow + 2);

            const x = sliceWidth * (col + 1) + (sliceWidth * 0.5);
            const y = -this.scene.game.canvas.height / 12 - 60 + (row * 45);

            this.cursorObj.setPosition(x - 15, y);
            this.cursorObj.setScale(2);

            const option = options[cursor];
            if (option && option.modifierTypeOption) {
                const type = option.modifierTypeOption.type;
                const desc = type.getDescription(this.scene);
                ui.showText(desc);
            }
        }

        return ret;
    }

    processInput(button: Button): boolean {
        if (!this.awaitingActionInput) {
            return false;
        }

        const ui = this.getUi();
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
                    this.moveInfoOverlay.setVisible(false);
                    this.moveInfoOverlay.active = false;
                }
            }
        } else {
            if (this.rowCursor === 0) {
                switch (button) {
                    case Button.UP:
                        success = this.setRowCursor(1);
                        break;
                    case Button.DOWN:
                        if (this.lockRarityButtonContainer.visible && this.cursor === 0) {
                            success = this.setCursor(this.getRowItems(0) - 1);
                        }
                        break;
                    case Button.LEFT:
                        if (this.cursor > 0) {
                            success = this.setCursor(this.cursor - 1);
                        }
                        break;
                    case Button.RIGHT:
                        if (this.cursor < this.getRowItems(this.rowCursor) - 1) {
                            success = this.setCursor(this.cursor + 1);
                        }
                        break;
                }
            } else if (this.rowCursor === 1) {
                if (!this.options.length) {
                    return false;
                }

                const layout = this.getShopLayout();
                const currentRow = Math.floor(this.cursor / layout.itemsPerRow);
                const currentCol = this.cursor % layout.itemsPerRow;
                const totalRows = Math.ceil(this.options.length / layout.itemsPerRow);

                switch (button) {
                    case Button.UP:
                        if (currentRow > 0) {
                            const newRow = currentRow - 1;
                            const itemsInNewRow = Math.min(layout.itemsPerRow, this.options.length - newRow * layout.itemsPerRow);
                            const newCol = Math.min(currentCol, itemsInNewRow - 1);
                            const newCursor = newRow * layout.itemsPerRow + newCol;
                            success = this.setCursor(newCursor);
                        } else {
                            success = this.setRowCursor(0);
                        }
                        break;

                    case Button.DOWN:
                        if (currentRow < totalRows - 1) {
                            const newRow = currentRow + 1;
                            const itemsInNewRow = Math.min(layout.itemsPerRow, this.options.length - newRow * layout.itemsPerRow);
                            const newCol = Math.min(currentCol, itemsInNewRow - 1);
                            const newCursor = newRow * layout.itemsPerRow + newCol;
                            success = this.setCursor(newCursor);
                        } else {
                            success = this.setRowCursor(0);
                        }
                        break;

                    case Button.LEFT:
                        if (currentCol > 0) {
                            success = this.setCursor(this.cursor - 1);
                        } else if (currentRow > 0) {
                            const newRow = currentRow - 1;
                            const itemsInNewRow = Math.min(layout.itemsPerRow, this.options.length - newRow * layout.itemsPerRow);
                            const newCursor = newRow * layout.itemsPerRow + itemsInNewRow - 1;
                            success = this.setCursor(newCursor);
                        }
                        break;

                    case Button.RIGHT:
                        const itemsInCurrentRow = Math.min(layout.itemsPerRow, this.options.length - currentRow * layout.itemsPerRow);
                        if (currentCol < itemsInCurrentRow - 1) {
                            success = this.setCursor(this.cursor + 1);
                        } else if (currentRow < totalRows - 1) {
                            const newCursor = (currentRow + 1) * layout.itemsPerRow;
                            success = this.setCursor(newCursor);
                        }
                        break;
                }
            }
        }

        if (success) {
            ui.playSelect();
        }

        return success;
    }

    clear() {
        if (this.collectedTypeDisplay) {
            this.collectedTypeDisplay.destroy();
            this.collectedTypeDisplay = null;
        }

        super.clear();
    }
}

export class CollectedTypeModifierOption extends ModifierOption {
    private collectedIcon: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: BattleScene, x: number, y: number, modifierTypeOption: ModifierTypeOption, showCost: boolean = true) {
        super(scene, x, y, modifierTypeOption, showCost);
        this.updateCostText();
    }

    protected getItemCostTextY(): number {
        return 41;
    }

    private canAfford(): boolean {
        const cost = this.modifierTypeOption.cost || 0;
        if (cost === 0) return true;

        const total = this.getTotalCollectedTypes();
        return total >= cost;
    }

    private getTotalCollectedTypes(): number {
        const scene = this.scene as BattleScene;
        const uiHandler = scene.ui.getHandler();
        if (uiHandler instanceof CollectedTypeShopUiHandler) {
            return uiHandler.getTotalCollectedTypes();
        }

        const party = scene.getParty();
        let total = 0;

        for (const pokemon of party) {
            const modifiers = scene.findModifiers(m =>
                m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id
            ) as CollectedTypeModifier[];

            for (const modifier of modifiers) {
                total += Object.values(modifier.collectedTypes).reduce((sum, count) => sum + count, 0);
            }
        }

        return total;
    }

    protected additionalDisplayTweens(): void {
        if (this.collectedIcon) {
            this.scene.tweens.add({
                targets: this.collectedIcon,
                duration: 500,
                alpha: 1,
                y: 48,
                ease: "Cubic.easeInOut"
            });
        }
    }

    updateCostText(): void {
        if (this.showCost && this.modifierTypeOption.cost > 0) {
            if (this.itemCostText) {
                this.itemCostText.setText("");
            }

            if (!this.collectedIcon) {
                this.collectedIcon = this.scene.add.sprite(-10, 0, "smitems", "modSoulCollected");
                this.collectedIcon.setScale(0.185);
                this.collectedIcon.setAlpha(0);
                this.add(this.collectedIcon);
            }

            if (!this.itemCostText) {
                const canAfford = this.canAfford();
                const textStyle = canAfford ? TextStyle.MONEY : TextStyle.PARTY_RED;

                this.itemCostText = addTextObject(
                    this.scene,
                    25,
                    0,
                    this.modifierTypeOption.cost.toString(),
                    textStyle,
                    { fontSize: "78px" }
                );
                this.itemCostText.setOrigin(0, 0);
                this.add(this.itemCostText);
            } else {
                const canAfford = this.canAfford();
                const textStyle = canAfford ? TextStyle.MONEY : TextStyle.PARTY_RED;

                const battleScene = this.scene as BattleScene;
                this.itemCostText.setFontSize("82px");
                this.itemCostText.setPosition(5, 0);
                this.itemCostText.setColor(getTextColor(textStyle, false, battleScene.uiTheme));
                this.itemCostText.setShadow(3, 3, getTextColor(textStyle, true, battleScene.uiTheme));
                this.itemCostText.setText(this.modifierTypeOption.cost.toString());
            }
        }
    }
}