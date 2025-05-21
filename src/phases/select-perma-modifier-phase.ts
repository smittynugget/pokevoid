import BattleScene from "#app/battle-scene.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import {
    regenerateModifierPoolThresholds,
    ModifierTypeOption,
    ModifierType,
    getShopModifierTypeOptions,
    ModifierPoolType
} from "#app/modifier/modifier-type.js";
import { Modifier } from "#app/modifier/modifier.js";
import ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import { PermaType } from "#app/modifier/perma-modifiers";
import {PersistentModifier} from "#app/modifier/modifier";

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
                this.scene.ui.showText(i18next.t("battle:skipItemQuestion"), null, () => {
                    this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                        this.scene.ui.revertMode();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                    }, () => this.scene.ui.setMode(Mode.SHOP_SELECT, true, typeOptions, modifierSelectCallback, this.getRerollCost()));
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