import BattleScene from "#app/battle-scene.js";
import {ModifierTier} from "#app/modifier/modifier-tier.js";
import {
    regenerateModifierPoolThresholds,
    ModifierTypeOption,
    ModifierType,
    getPlayerShopModifierTypeOptionsForWave,
    PokemonModifierType,
    FusePokemonModifierType,
    PokemonMoveModifierType,
    TmModifierType,
    RememberMoveModifierType,
    PokemonPpRestoreModifierType,
    PokemonPpUpModifierType,
    ModifierPoolType,
    getPlayerModifierTypeOptions,
    PassiveAbilitySacrificeModifierType
} from "#app/modifier/modifier-type.js";
import {BerryModifier, ExtraModifierModifier, Modifier, PokemonHeldItemModifier} from "#app/modifier/modifier.js";
import ModifierSelectUiHandler, {SHOP_OPTIONS_ROW_LIMIT} from "#app/ui/modifier-select-ui-handler.js";
import PartyUiHandler, {PartyUiMode, PartyOption} from "#app/ui/party-ui-handler.js";
import {Mode} from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import {BattlePhase} from "./battle-phase";
import Overrides from "#app/overrides";
import {
    AbilitySacrificeModifierType, AddPokemonModifierType,
    StatSacrificeModifierType,
    TypeSacrificeModifierType,
    MoveSacrificeModifierType
} from "#app/modifier/modifier-type";
import {PermaType} from "#app/modifier/perma-modifiers";
import {SelectPermaModifierPhase} from "#app/phases/select-perma-modifier-phase";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { EggLapsePhase } from "./egg-lapse-phase";
export class SelectModifierPhase extends BattlePhase {
    protected rerollCount: integer;
    private modifierTiers: ModifierTier[];
    
    private draftOnly: boolean;
    private onEndCallback: (() => void) | undefined;
    private cachedRerollCost: integer | null = null;

    private static shopOptionsCache: {
        waveIndex: integer | null;
        options: ModifierTypeOption[] | null;
        optionsRows: ModifierTypeOption[][] | null;
    } = {
        waveIndex: null,
        options: null,
        optionsRows: null
    };
    
    public static clearShopOptionsCache(): void {
        SelectModifierPhase.shopOptionsCache.waveIndex = null;
        SelectModifierPhase.shopOptionsCache.options = null;
        SelectModifierPhase.shopOptionsCache.optionsRows = null;
    }
    
    constructor(scene: BattleScene, rerollCount: integer = 0, modifierTiers?: ModifierTier[], draftOnly: boolean = false, onEndCallback?: () => void) {
        super(scene);

        this.rerollCount = rerollCount;
        this.modifierTiers = modifierTiers!;
        
        this.draftOnly = draftOnly;
        this.onEndCallback = onEndCallback;
    }

    start() {
        super.start();

        if (!this.rerollCount) {
            this.updateSeed();
        } else {
            this.scene.reroll = false;
        }

        this.clearCachedRerollCost();

        const party = this.scene.getParty();
        if(this.getPoolType() !== null) {
            regenerateModifierPoolThresholds(party, this.getPoolType(), this.rerollCount);
        }
        const modifierCount = new Utils.IntegerHolder(3);
        if (this.isPlayer()) {
            this.scene.applyModifiers(ExtraModifierModifier, true, modifierCount);
        }
        
        let moreRewardsIncrement = 1;

        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REWARD_CHOICE_3)) {
            moreRewardsIncrement = Utils.randSeedInt(4, 1);
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REWARD_CHOICE_2)) {
            moreRewardsIncrement = Utils.randSeedInt(3, 1);
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REWARD_CHOICE_1)) {
            moreRewardsIncrement = Utils.randSeedInt(2, 1);
        }


        if(Utils.randSeedInt(100, 1) <= 5) {
            moreRewardsIncrement += 1;
        }

        const typeOptions: ModifierTypeOption[] = this.getModifierTypeOptions(modifierCount.value + moreRewardsIncrement);

        
        this.scene.gameData.reducePermaModifierByType([
            PermaType.PERMA_MORE_REWARD_CHOICE_1,
            PermaType.PERMA_MORE_REWARD_CHOICE_2,
            PermaType.PERMA_MORE_REWARD_CHOICE_3
        ], this.scene);

        const modifierSelectCallback = (rowCursor: integer, cursor: integer) => {
            if (rowCursor < 0 || cursor < 0) {
                if (this.draftOnly && (this.scene.currentBattle.waveIndex === 1 || this.scene.currentBattle.waveIndex % 100 === 1)) {
                    this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                    this.scene.ui.playError();
                    return false;
                }
                this.scene.ui.showText(i18next.t("battle:skipItemQuestion"), null, () => {
                    this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                        this.scene.ui.revertMode();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                    }, () => this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly));
                });
                return false;
            }
            
            let modifierType: ModifierType | undefined;
            let cost: integer | undefined;
            
            switch (rowCursor) {
                case 0:
                    switch (cursor) {
                        case 0:
                            const rerollCost = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
                            if ((this.draftOnly && this.scene.gameData.permaMoney < rerollCost) || (!this.draftOnly && this.scene.money < rerollCost)) {
                                this.scene.ui.playError();
                                return false;
                            } else {
                                this.scene.reroll = true;
                                
                                 if(Utils.randSeedInt(100) <= 50) {
                                    this.scene.gameData.reducePermaModifierByType([PermaType.PERMA_REROLL_COST_1, PermaType.PERMA_REROLL_COST_2, PermaType.PERMA_REROLL_COST_3], this.scene);
                                 }
                                SelectModifierPhase.clearShopOptionsCache();
                                
                                this.scene.unshiftPhase(new SelectModifierPhase(this.scene, this.rerollCount + 1, typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[], this.draftOnly));
                                this.scene.ui.clearText();
                                this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                                if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                                    if(!this.draftOnly) {
                                        this.scene.money -= rerollCost;
                                        this.scene.updateMoneyText();
                                    }
                                    else {
                                        this.scene.addPermaMoney(-rerollCost);
                                    }
                                    this.scene.animateMoneyChanged(false);
                                }
                                this.scene.playSound("se/buy");
                            }
                            break;
                        case 1:
                            this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.MODIFIER_TRANSFER, -1, (fromSlotIndex: integer, itemIndex: integer, itemQuantity: integer, toSlotIndex: integer) => {
                                if (toSlotIndex !== undefined && fromSlotIndex < 6 && toSlotIndex < 6 && fromSlotIndex !== toSlotIndex && itemIndex > -1) {
                                    const itemModifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
                                        && m.isTransferrable && m.pokemonId === party[fromSlotIndex].id) as PokemonHeldItemModifier[];
                                    const itemModifier = itemModifiers[itemIndex];
                                    this.scene.tryTransferHeldItemModifier(itemModifier, party[toSlotIndex], true, itemQuantity);
                                } else {
                                    this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                                }
                            }, PartyUiHandler.FilterItemMaxStacks);
                            break;
                        case 2:
                            this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.CHECK, -1, () => {
                                this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                            });
                            break;
                        case 3:
                            this.scene.lockModifierTiers = !this.scene.lockModifierTiers;
                            const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;
                            uiHandler.setRerollCost(this.getRerollCost(typeOptions, this.scene.lockModifierTiers));
                            uiHandler.updateLockRaritiesText();
                            uiHandler.updateRerollCostText();
                            return false;
                    }
                    return true;
                case 1:
                    if (cursor < typeOptions.length && typeOptions[cursor]?.type) {
                        modifierType = typeOptions[cursor].type;
                    }
                    break;
                default:
                    const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;
                    const shopRowIndex = rowCursor - 2;

                    const adjustedShopRowIndex = uiHandler.shopOptionsRows.length > 1 
                    ? (uiHandler.shopOptionsRows.length - 1) - shopRowIndex 
                    : shopRowIndex;
                    
                    if (adjustedShopRowIndex >= 0 && adjustedShopRowIndex < uiHandler.shopOptionsRows.length) {
                        const shopRow = uiHandler.shopOptionsRows[adjustedShopRowIndex];
                        
                        if (cursor >= 0 && cursor < shopRow.length) {
                            const shopOption = shopRow[cursor];
                            if (shopOption?.modifierTypeOption?.type) {
                                modifierType = shopOption.modifierTypeOption.type;
                                cost = shopOption.modifierTypeOption.cost;
                            }
                        }
                    }
                    break;
            }

            if (cost && (this.scene.money < cost) && !Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
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
                
                const isShopItem = rowCursor >= 2;
                const result = this.scene.addModifier(modifier, false, playSound);
                
                if (isShopItem) {
                    result.then(success => {
                        if (success) {
                            if (cost && !Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                                this.scene.money -= cost;
                                this.scene.updateMoneyText();
                                this.scene.animateMoneyChanged(false);
                                this.scene.playSound("se/buy");
                            }

                            
                            SelectModifierPhase.clearShopOptionsCache();
                            
                            const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;

                            this.scene.ui.setMode(Mode.MESSAGE);
                            
                            this.scene.ui.setMode(
                                Mode.MODIFIER_SELECT, 
                                this.isPlayer(), 
                                typeOptions, 
                                modifierSelectCallback,
                                this.getRerollCost(typeOptions, this.scene.lockModifierTiers), 
                                this.draftOnly
                            );
                        } else {
                            this.scene.ui.playError();
                        }
                    });
                    return false;
                } else {
                    const doEnd = () => {
                        this.scene.ui.clearText();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                    };
                    if (result instanceof Promise) {
                        result.then(() => doEnd());
                    } else {
                        doEnd();
                    }
                    return true;
                }
            };

            if (modifierType instanceof PokemonModifierType) {
                if (modifierType instanceof FusePokemonModifierType) {
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.SPLICE, -1, (fromSlotIndex: integer, spliceSlotIndex: integer) => {
                        if (spliceSlotIndex !== undefined && fromSlotIndex < 6 && spliceSlotIndex < 6 && fromSlotIndex !== spliceSlotIndex) {
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer()).then(() => {
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
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, modifierType.selectFilter);
                }
                
                else if (modifierType instanceof StatSacrificeModifierType || modifierType instanceof TypeSacrificeModifierType || modifierType instanceof AbilitySacrificeModifierType || modifierType instanceof PassiveAbilitySacrificeModifierType || modifierType instanceof MoveSacrificeModifierType) {
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.SACRIFICE, -1, (fromSlotIndex: integer, targetSlotIndex: integer) => {
                        if (targetSlotIndex !== undefined && fromSlotIndex < 6 && targetSlotIndex < 6 && fromSlotIndex !== targetSlotIndex) {
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer()).then(() => {
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
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, modifierType.selectFilter);
                } else {
                    const pokemonModifierType = modifierType as PokemonModifierType;
                    const isMoveModifier = modifierType instanceof PokemonMoveModifierType;
                    const isTmModifier = modifierType instanceof TmModifierType;
                    const isRememberMoveModifier = modifierType instanceof RememberMoveModifierType;
                    const isPpRestoreModifier = (modifierType instanceof PokemonPpRestoreModifierType || modifierType instanceof PokemonPpUpModifierType);
                    const partyUiMode = isMoveModifier ? PartyUiMode.MOVE_MODIFIER
                        : isTmModifier ? PartyUiMode.TM_MODIFIER
                            : isRememberMoveModifier ? PartyUiMode.REMEMBER_MOVE_MODIFIER
                                : PartyUiMode.MODIFIER;
                    const tmMoveId = isTmModifier
                        ? (modifierType as TmModifierType).moveId
                        : undefined;
                    this.scene.ui.setModeWithoutClear(Mode.PARTY, partyUiMode, -1, (slotIndex: integer, option: PartyOption) => {
                        if (slotIndex < 6) {
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer()).then(() => {
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
                            this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, pokemonModifierType.selectFilter, modifierType instanceof PokemonMoveModifierType ? (modifierType as PokemonMoveModifierType).moveSelectFilter : undefined, tmMoveId, isPpRestoreModifier);
                }
            }
            
            else if (modifierType instanceof AddPokemonModifierType) {
                if (this.scene.getParty().length == 6) {
                    const promptRelease = () => {
                        this.scene.ui.showText(i18next.t("battle:partyFull", {pokemonName: modifierType.getPokemon().name}), null, () => {
                            this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                                this.scene.ui.revertMode();
                                this.scene.ui.setMode(Mode.PARTY, PartyUiMode.ADDPOKEMON, -1, (slotIndex: integer, _option: PartyOption) => {
                                    this.scene.ui.setMode(Mode.MESSAGE).then(() => {
                                        if (slotIndex < 6) {
                                            const newModifier = modifierType.newModifier([this.scene]);
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
                                this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly)
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
        }
        this.scene.ui.setMode(Mode.MODIFIER_SELECT, this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
        let introTutorials: EnhancedTutorial[] = [EnhancedTutorial.ROGUE_MODE];
        if(this.draftOnly) {
            introTutorials = [EnhancedTutorial.ROGUE_MODE];
        }
        else {
            introTutorials = [EnhancedTutorial.GLITCH_ITEMS_1];
            
            for (const option of typeOptions) {
                const modifierTypeName = option.type?.constructor?.name;
                
                if (modifierTypeName === 'AbilitySwitcherModifierType' || modifierTypeName === 'AnyAbilityModifierType') {
                    introTutorials.push(EnhancedTutorial.ABILITY_SWITCHER);
                }
                if(modifierTypeName === 'AddVoucherModifierType') {
                    introTutorials.push(EnhancedTutorial.EGGS_1);
                }
                if(modifierTypeName === 'AnyPassiveAbilityModifierType') {
                    introTutorials.push(EnhancedTutorial.PASSIVE_ABILITIES_1);
                }
                 if (modifierTypeName === 'TypeSwitcherModifierType') {
                    introTutorials.push(EnhancedTutorial.TYPE_SWITCHER);
                } if (modifierTypeName === 'PrimaryTypeSwitcherModifierType') {
                    introTutorials.push(EnhancedTutorial.PRIMARY_SWITCHER);
                } if (modifierTypeName === 'SecondaryTypeSwitcherModifierType') {
                    introTutorials.push(EnhancedTutorial.SECONDARY_SWITCHER);
                } if (modifierTypeName === 'StatSacrificeModifierType' || 
                           modifierTypeName === 'TypeSacrificeModifierType' || 
                           modifierTypeName === 'AbilitySacrificeModifierType' || 
                           modifierTypeName === 'PassiveAbilitySacrificeModifierType' || 
                           modifierTypeName === 'MoveSacrificeModifierType') {
                    introTutorials.push(EnhancedTutorial.RELEASE_ITEMS_1);
                } if (modifierTypeName === 'AnyTMModifierType') {
                    introTutorials.push(EnhancedTutorial.ANY_TMS);
                } if (modifierTypeName === 'AnyAbilityModifierType') {
                    introTutorials.push(EnhancedTutorial.ANY_ABILITIES);
                } if (modifierTypeName === 'StatSwitcherModifierType') {
                    introTutorials.push(EnhancedTutorial.STAT_SWITCHERS);
                }
                
                if (option.type?.id === "modifierType:ModifierType.MEGA_BRACELET" || 
                    option.type?.id === "modifierType:ModifierType.DYNAMAX_BAND") {
                    introTutorials.push(EnhancedTutorial.MEGA_DYNAMAX_1);
                }
            }
            if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
                this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
          }
          else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.INTRASHOP_1) && Utils.randSeedInt(100, 1) <= 10) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.INTRASHOP_1, true, false);
        }
          }
    }

    updateSeed(): void {
        this.scene.resetSeed();
        
        SelectModifierPhase.clearShopOptionsCache();
    }

    isPlayer(): boolean {
        return true;
    }

    getRerollCost(typeOptions: ModifierTypeOption[], lockRarities: boolean): number {
        if (this.scene.gameMode.isTestMod) {
            return 0;
        }
        if (this.cachedRerollCost !== null) {
            return this.cachedRerollCost;
        }


        let baseValue = 100;
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            this.cachedRerollCost = baseValue;
            return baseValue;
        } else if (lockRarities) {
            const tierValues = [50, 125, 300, 750, 2000];
            for (const opt of typeOptions) {
                baseValue += tierValues[opt.type.tier ?? 0];
            }
        } else {
            if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_3)) {
                baseValue = 25;
            } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_2)) {
                baseValue = 40;
            } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_1)) {
                baseValue = 60;
            } else {
                baseValue = 80;
            }
        }


        if(this.draftOnly) {
            baseValue *= 5;
        }

        if(Utils.randSeedInt(100, 1) <= 5) {
            this.cachedRerollCost = 0;
            return 0;
        }

        let wave = this.draftOnly && this.scene.gameMode.isNightmare ? this.scene.currentBattle.waveIndex % 100 : this.scene.currentBattle.waveIndex;

        this.cachedRerollCost = Math.min(Math.ceil(wave / 10) * baseValue * Math.pow(2, this.rerollCount), Number.MAX_SAFE_INTEGER);
        return this.cachedRerollCost;
    }

    getPoolType(): ModifierPoolType {
        
        if (this.draftOnly) {
            return ModifierPoolType.DRAFT;
        }
        return ModifierPoolType.PLAYER;
    }

    getModifierTypeOptions(modifierCount: integer): ModifierTypeOption[] {
        
        return getPlayerModifierTypeOptions(modifierCount, this.scene.getParty(), this.scene.lockModifierTiers ? this.modifierTiers : undefined, this.draftOnly);
    }

    addModifier(modifier: Modifier): Promise<boolean> {
        return this.scene.addModifier(modifier, false, true);
    }

    
    end() {
        if (this.onEndCallback) {
            this.onEndCallback();
        }
        super.end();
    }

    private clearCachedRerollCost(): void {
        this.cachedRerollCost = null;
    }
}


export function ShowRewards(scene: BattleScene, chance: integer = 20, overrideChance: boolean = true, unshiftRatherThanPush: boolean = true) {

    if (scene.gameMode.isTestMod) {
        for (const species of scene.gameData.testSpeciesForMod) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1));
        }
        return;
    }

    if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_3)) {
        chance = 14;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_2)) {
        chance = 16;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_1)) {
        chance = 18;
    }

    if (scene.currentBattle.waveIndex <= 1 ||
        Utils.randSeedInt(chance, 1) == 1 ||
        (overrideChance && (scene.currentBattle.trainer &&
            (scene.currentBattle.trainer.config.title == "Rival") ||
            scene.currentBattle.waveIndex % 10 == 0))
    ) {
        if(unshiftRatherThanPush) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1));
        }
        else {
            scene.pushPhase(new SelectModifierPhase(scene, 1));
        }

        scene.gameData.reducePermaModifierByType([PermaType.PERMA_SHOW_REWARDS_1, PermaType.PERMA_SHOW_REWARDS_2, PermaType.PERMA_SHOW_REWARDS_3], scene);
    }
}
