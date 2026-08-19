import { SelectModifierPhase } from "./select-modifier-phase";
import { ModifierPoolType, getPlayerModifierTypeOptions, ModifierTypeOption, PathNodeTypeFilter, getTierFromModifierID, regenerateModifierPoolThresholds, getDisabledModifierIds } from "../modifier/modifier-type";
import { ModifierTier } from "../modifier/modifier-tier";
import BattleScene from "../battle-scene";
import { Type } from "../data/type";
import { SkillPointSources } from "../system/skill-point-sources";
import { Mode } from "../ui/ui";
import { CollectedTypeShopUiHandler } from "../ui/collected-type-shop-ui-handler";
import { PartyUiMode } from "../ui/party-ui-handler";
import ModifierSelectUiHandler from "../ui/modifier-select-ui-handler";
import LootRewardSelectUiHandler from "../ui/loot-reward-select-ui-handler";
import { ModifierType } from "../modifier/modifier-type";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import * as Utils from "../utils";
import { Modifier, PersistentModifier, CollectedTypeModifier } from "../modifier/modifier";
import Overrides from "#app/overrides";
import { canAffordCollectedTypeCost } from "#app/utils/collected-type-totals.js";
import {
    PokemonModifierType,
    PokemonMoveModifierType,
    TmModifierType,
    AnyTmModifierType,
    RememberMoveModifierType,
    PokemonPpRestoreModifierType,
    PokemonPpUpModifierType,
    FusePokemonModifierType,
    StatSacrificeModifierType,
    TypeSacrificeModifierType,
    AbilitySacrificeModifierType,
    PassiveAbilitySacrificeModifierType,
    MoveSacrificeModifierType,
    AddPokemonModifierType
} from "../modifier/modifier-type";
import { PartyOption } from "../ui/party-ui-handler";
import { PermaType } from "#app/modifier/perma-modifiers.js";

export class CollectedTypeShopPhase extends SelectModifierPhase {

    constructor(scene: BattleScene, rerollCount: integer = 0, modifierTiers?: ModifierTier[], draftOnly: boolean = false, onEndCallback?: () => void, pathNodeFilter: PathNodeTypeFilter = PathNodeTypeFilter.NONE, permaRerollCount: integer = 0) {
        super(scene, rerollCount, modifierTiers, draftOnly, onEndCallback, pathNodeFilter, permaRerollCount);
    }

    protected getUIMode(): Mode {
        return Mode.COLLECTED_TYPE_SELECT;
    }

    private updateCollectedTypeUI(): void {
        const uiHandler = this.scene.ui.getHandler() as CollectedTypeShopUiHandler;
        if (uiHandler && uiHandler.updateCollectedTypeDisplay) {
            uiHandler.updateCollectedTypeDisplay();
        }
    }

    start() {
        BattlePhase.prototype.start.call(this);

        if (!this.rerollCount && !this.permaRerollCount) {
            this.updateSeed();
        } else {
            this.scene.reroll = false;
        }

        this['clearCachedRerollCost']();

        const party = this.scene.getParty();
        if(this.getPoolType() !== null) {
            regenerateModifierPoolThresholds(party, this.getPoolType(), Math.max(this.rerollCount, this.permaRerollCount));
        }

        const typeOptions: ModifierTypeOption[] = this.getModifierTypeOptions(8);

        const modifierSelectCallback = this.getCollectedTypeShopCallback(typeOptions, party);
        const costs = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);

        this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, costs, this.draftOnly);

        setTimeout(() => {
            this.updateCollectedTypeUI();
        }, 100);
    }

    private getCollectedTypeShopCallback(typeOptions: ModifierTypeOption[], party: any[]) {
        return (rowCursor: integer, cursor: integer) => {
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
                        if (handler instanceof LootRewardSelectUiHandler && handler.active) {
                            handler.awaitingActionInput = true;
                            handler.onActionInput = this.getCollectedTypeShopCallback(typeOptions, party);
                        } else {
                            ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    });
                });
                return false;
            }

            let modifierType: ModifierType | undefined;
            let cost: integer | undefined;

            switch (rowCursor) {
                case 0:
                    return this.handleButtonAction(cursor, typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), party);

                case 1:
                    if (cursor < typeOptions.length && typeOptions[cursor]) {
                        modifierType = typeOptions[cursor].type;
                        cost = typeOptions[cursor].cost;
                    }
                    break;
                default:
                    this.scene.ui.playError();
                    return false;
            }

            if (cost > 0 && !this.canAffordCost(cost)) {
                this.scene.ui.playError();
                return false;
            }

            if (!modifierType) {
                console.warn(`No valid modifier type found at rowCursor: ${rowCursor}, cursor: ${cursor}`);
                this.scene.ui.playError();
                return false;
            }

            const applyModifier = (modifier: Modifier | undefined, playSound: boolean = false) => {
                if (!modifier) {
                    console.warn("Attempted to apply undefined modifier");
                    this.scene.ui.playError();
                    return false;
                }

                const refreshShopAfterPurchase = () => {
                    const updatedTypeOptions = typeOptions.filter((_, index) => index !== cursor);

                    if (updatedTypeOptions.length === 0) {
                        this.scene.ui.clearText();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                        return;
                    }

                    this.scene.ui.clearText();
                    this.scene.ui.setMode(Mode.MESSAGE);

                    this['currentTypeOptions'] = updatedTypeOptions;
                    setTimeout(() => {
                        this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), updatedTypeOptions, this.getCollectedTypeShopCallback(updatedTypeOptions, party), this.getRerollCost(updatedTypeOptions, this.scene.lockModifierTiers), this.draftOnly);
                    }, 100);
                };

                this.scene.addModifier(modifier, false, playSound).then(success => {
                    if (cost) {
                        const purchased = this.handlePurchase(cost);
                        if (!purchased) {
                            if (modifier instanceof PersistentModifier) {
                                this.scene.removeModifier(modifier);
                            }
                            this.scene.ui.playError();
                            const handler = this.scene.ui.getHandler();
                            if (handler?.active) {
                              handler.awaitingActionInput = true;
                              handler.onActionInput = this.getCollectedTypeShopCallback(typeOptions, party);
                            }
                            return;
                        }
                    }
                    refreshShopAfterPurchase();
                }).catch(() => {
                    const handler = this.scene.ui.getHandler();
                    if (handler?.active) {
                      handler.awaitingActionInput = true;
                      handler.onActionInput = this.getCollectedTypeShopCallback(typeOptions, party);
                    }
                });
                return true;
            };

            if (modifierType instanceof PokemonModifierType) {
                if (modifierType instanceof FusePokemonModifierType) {
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.suspendForOverlay?.();
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.SPLICE, -1, (fromSlotIndex: integer, spliceSlotIndex: integer) => {
                        if (spliceSlotIndex !== undefined && fromSlotIndex < 6 && spliceSlotIndex < 6 && fromSlotIndex !== spliceSlotIndex) {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer()).then(() => {
                                const modifier = modifierType.newModifier(party[fromSlotIndex], party[spliceSlotIndex]);
                                if (modifier) {
                                    return applyModifier(modifier, true);
                                } else {
                                    console.warn("Failed to create fusion modifier");
                                    this.scene.ui.playError();
                                    return false;
                                }
                            });
                        } else {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, modifierType.selectFilter);
                }

                else if (modifierType instanceof StatSacrificeModifierType || modifierType instanceof TypeSacrificeModifierType || modifierType instanceof AbilitySacrificeModifierType || modifierType instanceof PassiveAbilitySacrificeModifierType || modifierType instanceof MoveSacrificeModifierType) {
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.suspendForOverlay?.();
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.SACRIFICE, -1, (fromSlotIndex: integer, targetSlotIndex: integer) => {
                        if (targetSlotIndex !== undefined && fromSlotIndex < 6 && targetSlotIndex < 6 && fromSlotIndex !== targetSlotIndex) {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer()).then(() => {
                                const modifier = modifierType.newModifier(party[fromSlotIndex], party[targetSlotIndex]);
                                if (modifier) {
                                    return applyModifier(modifier, true);
                                } else {
                                    console.warn("Failed to create sacrifice modifier");
                                    this.scene.ui.playError();
                                    return false;
                                }
                            });
                        } else {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, modifierType.selectFilter);
                } else {
                    const pokemonModifierType = modifierType as PokemonModifierType;
                    const isMoveModifier = modifierType instanceof PokemonMoveModifierType;
                    const isTmModifier = modifierType instanceof TmModifierType || modifierType instanceof AnyTmModifierType;
                    const isRememberMoveModifier = modifierType instanceof RememberMoveModifierType;
                    const isPpRestoreModifier = (modifierType instanceof PokemonPpRestoreModifierType || modifierType instanceof PokemonPpUpModifierType);
                    const partyUiMode = isMoveModifier ? PartyUiMode.MOVE_MODIFIER
                        : isTmModifier ? PartyUiMode.TM_MODIFIER
                            : isRememberMoveModifier ? PartyUiMode.REMEMBER_MOVE_MODIFIER
                                : PartyUiMode.MODIFIER;
                    const tmMoveId = isTmModifier
                        ? (modifierType instanceof TmModifierType ? (modifierType as TmModifierType).moveId : (modifierType as AnyTmModifierType).moveId)
                        : undefined;
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.suspendForOverlay?.();
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, partyUiMode, -1, (slotIndex: integer, option: PartyOption) => {
                        if (slotIndex < 6) {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer()).then(() => {
                                let modifier;
                                if (!isMoveModifier && !isRememberMoveModifier) {
                                    modifier = modifierType.newModifier(party[slotIndex]);
                                } else if (isRememberMoveModifier) {
                                    modifier = modifierType.newModifier(party[slotIndex], option as integer);
                                } else {
                                    modifier = modifierType.newModifier(party[slotIndex], option - PartyOption.MOVE_1);
                                }

                                if (modifier) {
                                    return applyModifier(modifier, true);
                                } else {
                                    console.warn("Failed to create pokemon modifier");
                                    this.scene.ui.playError();
                                    return false;
                                }
                            });
                        } else {
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, pokemonModifierType.selectFilter, modifierType instanceof PokemonMoveModifierType ? (modifierType as PokemonMoveModifierType).moveSelectFilter : undefined, tmMoveId, isPpRestoreModifier);
                }
            }

            else if (modifierType instanceof AddPokemonModifierType) {
                (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.suspendForOverlay?.();
                if (this.scene.getParty().length == 6) {
                    const promptRelease = () => {
                        this.scene.ui.showText(i18next.t("battle:partyFull", {pokemonName: (modifierType as AddPokemonModifierType).getPokemon().name}), null, () => {
                            this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                                this.scene.ui.revertMode();
                                this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.ADDPOKEMON, -1, (slotIndex: integer, _option: PartyOption) => {
                                    this.scene.ui.setMode(Mode.MESSAGE).then(() => {
                                        if (slotIndex < 6) {
                                            const newModifier = modifierType.newModifier(this.scene);
                                            if (newModifier) {
                                                return applyModifier(newModifier);
                                            } else {
                                                console.warn("Failed to create add pokemon modifier");
                                                this.scene.ui.playError();
                                                return false;
                                            }
                                        } else {
                                            promptRelease();
                                            return false;
                                        }
                                    });
                                });
                            }, () => {
                                this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, this.getCollectedTypeShopCallback(typeOptions, party), this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly)
                            });
                        });
                    };
                    promptRelease();
                    return false;
                } else {
                    const newModifier = modifierType.newModifier(this.scene);
                    if (newModifier) {
                        return applyModifier(newModifier);
                    } else {
                        console.warn("Failed to create add pokemon modifier");
                        this.scene.ui.playError();
                        return false;
                    }
                }
            } else {
                const newModifier = modifierType.newModifier();
                if (newModifier) {
                    return applyModifier(newModifier);
                } else {
                    console.warn("Failed to create modifier");
                    this.scene.ui.playError();
                    return false;
                }
            }

            return false;
        };
    }

    getModifierTypeOptions(modifierCount: integer = 8): ModifierTypeOption[] {
        let options = getPlayerModifierTypeOptions(modifierCount, this.scene.getParty(), undefined, false, PathNodeTypeFilter.NONE, ModifierPoolType.COLLECTOR);
        const disabledIds = getDisabledModifierIds(this.scene);
        if (disabledIds.size > 0) {
            options = options.filter(o => !o.type?.id || !disabledIds.has(o.type.id));
            const maxRefillAttempts = 3;
            let refillAttempt = 0;
            while (options.length < modifierCount && refillAttempt < maxRefillAttempts) {
                const existingIds = new Set(options.map(o => o.type?.id).filter(Boolean));
                const extra = getPlayerModifierTypeOptions(modifierCount - options.length, this.scene.getParty(), undefined, false, PathNodeTypeFilter.NONE, ModifierPoolType.COLLECTOR);
                const filtered = extra.filter(o => {
                    const id = o.type?.id;
                    if (!id) return true;
                    return !disabledIds.has(id) && !existingIds.has(id);
                });
                if (filtered.length === 0) break;
                options = options.concat(filtered);
                refillAttempt++;
            }
            options = options.slice(0, modifierCount);
        }

        return options.map(option => {
            const tier = option.type.tier || ModifierTier.COMMON;
            const cost = this.calculateCollectedTypeCost(tier);
            return new ModifierTypeOption(option.type, option.upgradeCount, cost);
        });
    }

    private calculateCollectedTypeCost(tier: ModifierTier): number {
        const baseCosts = {
            [ModifierTier.COMMON]: 2,
            [ModifierTier.GREAT]: 4,
            [ModifierTier.ULTRA]: 6,
            [ModifierTier.ROGUE]: 10,
            [ModifierTier.MASTER]: 25,
        };
        return baseCosts[tier] || 8;
    }

    private deductCollectedTypes(amount: number): Map<Type, number> | null {
        const party = this.scene.getParty();
        let remaining = amount;
        const deducted = new Map<Type, number>();

        for (const pokemon of party) {
            if (remaining <= 0) break;

            const modifiers = this.scene.findModifiers(m =>
                m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id
            ) as CollectedTypeModifier[];

            for (const modifier of modifiers) {
                if (remaining <= 0) break;

                if (modifier.hasEnoughCollected(remaining)) {
                    if (modifier.reduceCollected(remaining)) {
                        const current = deducted.get(modifier.type) || 0;
                        deducted.set(modifier.type, current + remaining);
                        remaining = 0;
                    }
                } else {
                    const available = Object.values(modifier.collectedTypes).reduce((sum, count) => sum + count, 0);
                    if (available > 0 && modifier.reduceCollected(available)) {
                        const current = deducted.get(modifier.type) || 0;
                        deducted.set(modifier.type, current + available);
                        remaining -= available;
                    }
                }
            }
        }

        return remaining === 0 ? deducted : null;
    }

    protected canAffordCost(cost: number): boolean {
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            return true;
        }
        return canAffordCollectedTypeCost(this.scene, cost);
    }

    protected handlePurchase(cost: number): boolean {
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            this.scene.playSound("se/buy");
            this.updateCollectedTypeUI();
            return true;
        }
        const deductedTypes = this.deductCollectedTypes(cost);
        if (!deductedTypes) {
            console.warn(`Collected type deduct failed for cost ${cost}`);
            return false;
        }
        this.scene.playSound("se/buy");

        const skillPointSources = new SkillPointSources(this.scene);
        for (const [type, amount] of deductedTypes.entries()) {
            skillPointSources.checkCollectorTradeReward(type, amount);
        }

        this.updateCollectedTypeUI();
        return true;
    }

    protected handleButtonAction(cursor: integer, typeOptions: ModifierTypeOption[], modifierSelectCallback: Function, party: any[]): boolean {
        const uiHandler = this.scene.ui.getHandler() as CollectedTypeShopUiHandler;
        const buttonLayout = uiHandler.getButtonLayout();

        if (cursor >= buttonLayout.length) {
            this.scene.ui.playError();
            return false;
        }

        const buttonInfo = buttonLayout[cursor];

        switch (buttonInfo.descKey) {
            case "modifierSelectUiHandler:rerollDesc":
                const rerollCosts = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
                if ((this.draftOnly && this.scene.gameData.permaMoney < rerollCosts.rerollCost) || (!this.draftOnly && this.scene.money < rerollCosts.rerollCost)) {
                    this.scene.ui.playError();
                    return false;
                }
                    this.scene.reroll = true;

                    this.scene.gameData.gameStats.reroll++;

                     if(Utils.randSeedInt(100) <= 50) {
                        this.scene.gameData.reducePermaModifierByType([PermaType.PERMA_REROLL_COST_1, PermaType.PERMA_REROLL_COST_2, PermaType.PERMA_REROLL_COST_3], this.scene);
                     }

                    this.scene.unshiftPhase(new CollectedTypeShopPhase(this.scene, this.rerollCount + 1, typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[], this.draftOnly, undefined, this.pathNodeFilter, this.permaRerollCount));
                    this.scene.ui.clearText();
                    this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                    if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                        if(!this.draftOnly) {
                            this.scene.money -= rerollCosts.rerollCost;
                            this.scene.updateMoneyText();
                        }
                        else {
                            this.scene.addPermaMoney(-rerollCosts.rerollCost);
                        }
                        this.scene.animateMoneyChanged(false);
                    }
                    this.scene.playSound("se/buy");
                break;

            case "modifierSelectUiHandler:permaRerollDesc":
                const permaRerollCosts = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
                const permaRerollCost = permaRerollCosts.permaRerollCost;
                if (this.scene.gameData.permaMoney < permaRerollCost) {
                    this.scene.ui.playError();
                    return false;
                } else {
                    this.scene.reroll = true;
                    this.scene.gameData.gameStats.permaReroll++;

                    this.scene.unshiftPhase(new CollectedTypeShopPhase(this.scene, this.rerollCount, typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[], this.draftOnly, undefined, this.pathNodeFilter, this.permaRerollCount + 1));
                    this.scene.ui.clearText();
                    this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                    if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                        this.scene.addPermaMoney(-permaRerollCost);
                        this.scene.animateMoneyChanged(false);
                    }
                    this.scene.playSound("se/buy");
                }
                break;

            case "modifierSelectUiHandler:checkTeamDesc":
                uiHandler.suspendForOverlay();
                this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.CHECK, -1, () => {
                    this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                });
                break;

            case "modifierSelectUiHandler:lockRaritiesDesc":
                this.scene.lockModifierTiers = !this.scene.lockModifierTiers;
                const lockCosts = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
                uiHandler.setRerollCost(lockCosts.rerollCost);
                uiHandler.setPermaRerollCost(lockCosts.permaRerollCost);
                uiHandler.updateLockRaritiesText();
                uiHandler.updateRerollCostText();
                uiHandler.updatePermaRerollCostText();
                return false;

            default:
                return super.handleButtonAction(cursor, typeOptions, modifierSelectCallback, party);
        }

        return true;
    }

    updateSeed(): void {
        this.scene.resetSeed();
        SelectModifierPhase.clearShopOptionsCache();
    }

    getPoolType(): ModifierPoolType {
        if (this.draftOnly) {
            return ModifierPoolType.DRAFT;
        }
        return ModifierPoolType.COLLECTOR;
    }

    isPlayer(): boolean {
        return true;
    }

    public getCurrentTypeOptions(): ModifierTypeOption[] {
        return this.getCurrentRewardOptions();
    }
}