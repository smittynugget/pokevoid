import BattleScene from "#app/battle-scene.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import {
    ModifierTypeOption,
    ModifierType,
    getShopModifierTypeOptions,
} from "#app/modifier/modifier-type.js";
import { Mode } from "#app/ui/mode.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import {PersistentModifier} from "#app/modifier/modifier";
import Overrides from "#app/overrides";

export class SelectPermaModifierPhase extends BattlePhase {
    private rerollCount: integer;
    private modifierTiers: ModifierTier[];
    private onEndCallback: (() => void) | undefined;

    constructor(scene: BattleScene, rerollCount: integer = 0, modifierTiers?: ModifierTier[], onEndCallback?: () => void) {
        super(scene);
        this.rerollCount = rerollCount;
        this.modifierTiers = modifierTiers!;
        this.onEndCallback = onEndCallback;
    }

    start() {
        super.start();

        if (!this.rerollCount) {
            this.updateSeed();
        }

        const modifierCount = 4;
        const typeOptions = this.getPermaOptions(modifierCount);

        const modifierSelectCallback = (rowCursor: integer, cursor: integer) => {
            if (rowCursor < 0 || cursor < 0) {
                const ui = this.scene.ui;
                const msgHandler = ui.getMessageHandler() as any;
                if (msgHandler?.bg) {
                    msgHandler.bg.setVisible(true);
                    ui.bringToTop(msgHandler.bg);
                }
                if (msgHandler?._messageBgPattern) {
                    if (msgHandler._messageBgPattern.layers) {
                        msgHandler._messageBgPattern.layers.forEach((l: any) => {
                            l.setVisible(true);
                            ui.bringToTop(l);
                        });
                    }
                }
                if (msgHandler?.messageContainer) {
                    msgHandler.messageContainer.setVisible(true);
                    ui.bringToTop(msgHandler.messageContainer);
                }
                ui.showText(i18next.t("battle:skipItemQuestion"), null, () => {
                    ui.setOverlayMode(Mode.CONFIRM, () => {
                        ui.revertMode();
                        ui.hideMessageChrome();
                        ui.clearText();
                        ui.setMode(Mode.MESSAGE);
                        this.end();
                    }, () => {
                        ui.revertMode();
                        ui.hideMessageChrome();
                        ui.clearText();
                        const handler = ui.getHandler();
                        if ((handler as any).isLootRewardHandler && handler.active) {
                            handler.awaitingActionInput = true;
                            handler.onActionInput = modifierSelectCallback;
                        } else {
                            ui.setMode(Mode.SHOP_SELECT, true, typeOptions, modifierSelectCallback, this.getRerollCost());
                        }
                    });
                });
                return false;
            }

            let modifierType: ModifierType;
            switch (rowCursor) {
                case 0:
                    if (cursor === 0) {
                        const rerollCost = this.getRerollCost();
                        if (this.scene.gameData.permaMoney < rerollCost) {
                            this.scene.ui.playError();
                            return false;
                        } else {
                            this.scene.gameData.gameStats.permaReroll++;

                            this.scene.addPermaMoney(-(rerollCost)!);
                            this.scene.updateUIPermaMoneyText();
                            this.scene.unshiftPhase(new SelectPermaModifierPhase(
                                this.scene,
                                this.rerollCount + 1,
                                typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[]
                            ));
                            this.scene.ui.clearText();
                            this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                            this.scene.playSound("se/buy");
                        }
                    }
                    return true;
                case 1:
                    if (typeOptions[cursor].type) {
                        modifierType = typeOptions[cursor].type;
                    }
                    break;
            }

            if (modifierType) {
                const modifier = modifierType.newModifier();
                if (modifier) {
                    const result = this.scene.addPermaModifier(modifier as PersistentModifier);
                    if (result instanceof Promise) {
                        result.then(() => {
                            this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
                            this.scene.playSound("se/buy");
                            this.scene.ui.clearText();
                            this.scene.ui.setMode(Mode.MESSAGE);
                            this.end();
                        });
                    } else {
                        this.scene.ui.clearText();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                    }
                }
            }
            return true;
        };

        this.scene.ui.setMode(Mode.SHOP_SELECT, true, typeOptions, modifierSelectCallback, this.getRerollCost());
    }

    private getPermaOptions(modifierCount: number): ModifierTypeOption[] {
        const allOptions = getShopModifierTypeOptions(this.scene.gameData, true, this.scene);
        return Utils.randSeedShuffle(allOptions).slice(0, modifierCount);
    }

    updateSeed(): void {
        this.scene.resetSeed();
    }

    getRerollCost(): number {
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            return 0;
        }
        const baseValue = 1000;
        return Math.min(baseValue * Math.pow(2, this.rerollCount), Number.MAX_SAFE_INTEGER);
    }

    end() {
        if (this.onEndCallback) {
            this.onEndCallback();
        }

        super.end();
    }
}