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
    PassiveAbilitySacrificeModifierType,
    PathNodeTypeFilter
} from "#app/modifier/modifier-type.js";
import {BerryModifier, ExtraModifierModifier, Modifier, PokemonHeldItemModifier, PermaModifier, PersistentModifier} from "#app/modifier/modifier.js";
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
import { SkillTreeNode, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { PlayableChampionData } from "#app/system/playable-champions";
import { SkillTreeModifierPhase } from "./skill-tree-modifier-phase";
export class SelectModifierPhase extends BattlePhase {
    protected rerollCount: integer;
    private skillTreeNode?: SkillTreeNode;
    private championData?: PlayableChampionData;
    protected permaRerollCount: integer;
    private modifierTiers: ModifierTier[];
    protected pathNodeFilter: PathNodeTypeFilter;
    protected draftOnly: boolean;
    protected onEndCallback: (() => void) | undefined;
    private cachedRerollCost: integer | null = null;
    private cachedPermaRerollCost: integer | null = null;
    private currentTypeOptions: ModifierTypeOption[] = [];
    private bypassPoolGeneration: boolean = false;
    private preGeneratedOptions: ModifierTypeOption[] | null = null;
    private refreshing: boolean = false;

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

    public getCurrentRewardOptions(): ModifierTypeOption[] {
        return this.currentTypeOptions || [];
    }

    protected getUIMode(): Mode {
        return Mode.MODIFIER_SELECT;
    }

    constructor(scene: BattleScene, rerollCount: integer = 0, modifierTiers?: ModifierTier[], draftOnly: boolean = false, onEndCallback?: () => void, pathNodeFilter: PathNodeTypeFilter = PathNodeTypeFilter.NONE, permaRerollCount: integer = 0, preGeneratedOptions?: ModifierTypeOption[], skillTreeNode?: SkillTreeNode, championData?: PlayableChampionData) {
        super(scene);

        this.rerollCount = rerollCount;
        this.modifierTiers = modifierTiers || [];

        this.draftOnly = draftOnly;
        this.onEndCallback = onEndCallback;
        this.pathNodeFilter = pathNodeFilter;
        this.permaRerollCount = permaRerollCount;
        this.skillTreeNode = skillTreeNode;
        this.championData = championData;
        if (preGeneratedOptions && preGeneratedOptions.length > 0) {
            this.bypassPoolGeneration = true;
            this.preGeneratedOptions = preGeneratedOptions;
        }
    }
    start() {
        super.start();

        if (!this.rerollCount && !this.permaRerollCount) {
            this.updateSeed();
        } else {
            this.scene.reroll = false;
        }

        this.clearCachedRerollCost();

        const party = this.scene.getParty();
        const tierOnlyFilter = this.pathNodeFilter === PathNodeTypeFilter.MASTER_BALL_ITEMS ||
            this.pathNodeFilter === PathNodeTypeFilter.ROGUE_BALL_ITEMS ||
            this.pathNodeFilter === PathNodeTypeFilter.GREAT_BALL_ITEMS ||
            this.pathNodeFilter === PathNodeTypeFilter.ULTRA_BALL_ITEMS;
        const shouldRegeneratePool = this.getPoolType() !== null &&
            ((!this.pathNodeFilter || this.pathNodeFilter === PathNodeTypeFilter.NONE) || tierOnlyFilter);
        if (shouldRegeneratePool) {
            regenerateModifierPoolThresholds(party, this.getPoolType(), Math.max(this.rerollCount, this.permaRerollCount));
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
        this.currentTypeOptions = typeOptions;
        this.scene.gameData.reducePermaModifierByType([
            PermaType.PERMA_MORE_REWARD_CHOICE_1,
            PermaType.PERMA_MORE_REWARD_CHOICE_2,
            PermaType.PERMA_MORE_REWARD_CHOICE_3
        ], this.scene);

        const modifierSelectCallback = (rowCursor: integer, cursor: integer) => {
            if (rowCursor < 0 || cursor < 0) {
                if (this.draftOnly && (this.scene.currentBattle.waveIndex === 1 || this.scene.currentBattle.waveIndex % 100 === 1)) {
                    this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                    this.scene.ui.playError();
                    return false;
                }
                this.scene.ui.showText(i18next.t("battle:skipItemQuestion"), null, () => {
                    this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                        this.scene.ui.revertMode();
                        this.scene.ui.setMode(Mode.MESSAGE);
                        this.end();
                    }, () => this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly));
                });
                return false;
            }

            let modifierType: ModifierType | undefined;
            let cost: integer | undefined;

            switch (rowCursor) {
                case 0:
                    return this.handleButtonAction(cursor, typeOptions, modifierSelectCallback, party);

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

            if (cost && !this.canAffordCost(cost) && !Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
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
                if (this.skillTreeNode) {
                    (modifier as any).skillTreeTooltip = {
                        nodeId: this.skillTreeNode.id,
                        rarity: this.skillTreeNode.rarity,
                        title: this.skillTreeNode.name,
                        body: this.skillTreeNode.description,
                        rewardData: this.skillTreeNode.rewardData,
                        championId: this.championData?.id
                    };
                }

                const isShopItem = rowCursor >= 2;
                const isPermaModifier = modifier instanceof PermaModifier;
                const result = isPermaModifier
                  ? this.scene.addPermaModifier(modifier as PersistentModifier)
                  : this.scene.addModifier(modifier, false, playSound);
                if (isPermaModifier) {
                  result.then(success => {
                    if (success) {
                      this.scene.gameData.localSaveAll(this.scene);
                    }
                  });
                }
                const recordSkillTreeSelection = (success: any) => {
                    if (!this.skillTreeNode) return;
                    if (success === false) return;
                    try {
                        const t: any = (modifier as any)?.type;
                        if (t && typeof t.getPokemon === "function") {
                            const p = t.getPokemon();
                            const species = p?.species?.speciesId;
                            if (typeof species === "number") {
                                this.scene.recordRunEndSummarySkillNodeObtained(this.skillTreeNode.id, this.skillTreeNode.rewardData?.type as any, { species });
                                const ast: any = (this.scene as any).gameData?.activeSkillTree;
                                const rt = this.skillTreeNode.rewardData?.type as any;
                                if (ast && (rt === SkillTreeRewardType.SIGNATURE_POKEMON || rt === SkillTreeRewardType.GENERAL_POKEMON)) {
                                    const isSignature = rt === SkillTreeRewardType.SIGNATURE_POKEMON;
                                    if (!Array.isArray(ast.selectedPokemonPicks)) {
                                        ast.selectedPokemonPicks = [];
                                    }
                                    let updated = false;
                                    for (let i = ast.selectedPokemonPicks.length - 1; i >= 0; i--) {
                                        const pick = ast.selectedPokemonPicks[i];
                                        if (pick && !!pick.isSignature === isSignature) {
                                            pick.species = species;
                                            updated = true;
                                            break;
                                        }
                                    }
                                    if (!updated) {
                                        ast.selectedPokemonPicks.push({ species, isSignature });
                                    }
                                }
                            }
                        }
                    } catch {}
                };

                if (isShopItem) {
                    result.then(success => {
                        recordSkillTreeSelection(success);
                        if (success) {
                            if (cost && !Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                                this.handlePurchase(cost);
                            }
                            SelectModifierPhase.clearShopOptionsCache();

                            const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;

                            this.scene.ui.setMode(Mode.MESSAGE);

                            this.scene.ui.setMode(
                                this.getUIMode(),
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
                        result.then((success: any) => {
                            recordSkillTreeSelection(success);
                            doEnd();
                        });
                    } else {
                        recordSkillTreeSelection(true);
                        doEnd();
                    }
                    return true;
                }
            };

            if (modifierType instanceof PokemonModifierType) {
                if (modifierType instanceof FusePokemonModifierType) {
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.hideTransientOverlays?.();
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
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, modifierType.selectFilter);
                }

                else if (modifierType instanceof StatSacrificeModifierType || modifierType instanceof TypeSacrificeModifierType || modifierType instanceof AbilitySacrificeModifierType || modifierType instanceof PassiveAbilitySacrificeModifierType || modifierType instanceof MoveSacrificeModifierType) {
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.hideTransientOverlays?.();
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
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
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
                    (this.scene.ui.getHandler() as ModifierSelectUiHandler)?.hideTransientOverlays?.();
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
                            this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                        }
                    }, pokemonModifierType.selectFilter, modifierType instanceof PokemonMoveModifierType ? (modifierType as PokemonMoveModifierType).moveSelectFilter : undefined, tmMoveId, isPpRestoreModifier);
                }
            }

            else if (modifierType instanceof AddPokemonModifierType) {
                if (this.scene.getParty().length == 6) {
                    const promptRelease = () => {
                        this.scene.ui.showText(i18next.t("battle:partyFull", {pokemonName: (modifierType as AddPokemonModifierType).getPokemon().name}), null, () => {
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
                                this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly)
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
        const costs = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
        this.scene.ui.setMode(this.getUIMode(), this.isPlayer(), typeOptions, modifierSelectCallback, costs, this.draftOnly);

        const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;
        uiHandler.setPermaRerollCost(costs.permaRerollCost);
        uiHandler.updatePermaRerollCostText();
        let introTutorials: EnhancedTutorial[] = [];
        if(this.draftOnly) {

            introTutorials = [];
        }
        else {
            introTutorials = [EnhancedTutorial.GLITCH_ITEMS_1];

            const tutorialSet = new Set<EnhancedTutorial>(introTutorials);

            for (const option of typeOptions) {
                const modifierTypeName = option.type?.constructor?.name;
                if(modifierTypeName === 'AnyPassiveAbilityModifierType') {
                    tutorialSet.add(EnhancedTutorial.PASSIVE_ABILITIES_1);
                }
            }

            introTutorials = Array.from(tutorialSet);
            if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
                this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
          }
          else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.INTRASHOP_1) && Utils.randSeedInt(100, 1) <= 10) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.INTRASHOP_1, true, false);
        }
          }
    }

    updateSeed(): void {
        if (this.skillTreeNode) {

            const nodeHash = this.skillTreeNode.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const seedOffset = nodeHash * 1000;
            this.scene.executeWithSeedOffset(() => {
                this.scene.resetSeed();
            }, seedOffset);
        } else {

            this.scene.resetSeed();
        }

        SelectModifierPhase.clearShopOptionsCache();
    }

    isPlayer(): boolean {
        return true;
    }

    getRerollCost(typeOptions: ModifierTypeOption[], lockRarities: boolean): { rerollCost: number; permaRerollCost: number } {
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            return { rerollCost: 0, permaRerollCost: 0 };
        }
        if (this.scene.gameMode.isTestMod) {
            return { rerollCost: 0, permaRerollCost: 0 };
        }
        if (this.cachedRerollCost !== null && this.cachedPermaRerollCost !== null) {
            return { rerollCost: this.cachedRerollCost, permaRerollCost: this.cachedPermaRerollCost };
        }

        let baseValue = 100;
        if (this.constructor.name === 'CollectedTypeShopPhase') {
            baseValue = 1500;
        } else if (this.pathNodeFilter !== PathNodeTypeFilter.NONE) {
            const isHighTier = this.pathNodeFilter === PathNodeTypeFilter.MASTER_BALL_ITEMS || this.pathNodeFilter === PathNodeTypeFilter.ROGUE_BALL_ITEMS;
            baseValue = isHighTier ? 1500 : 300;
        }
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            this.cachedRerollCost = baseValue;
        } else if (lockRarities) {
            const tierValues = [50, 125, 300, 750, 2000];
            for (const opt of typeOptions) {
                baseValue += tierValues[opt.type.tier ?? 0];
            }
        } else {
            if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_3)) {
                baseValue *= .19;
            } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_2)) {
                baseValue *= .30;
            } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_REROLL_COST_1)) {
                baseValue *= .45;
            } else {
                baseValue *= .60;
            }
        }

        const isCollectedTypeShop = this.constructor.name === 'CollectedTypeShopPhase';
        if(this.draftOnly) {
            baseValue *= 5;
        }

        if(!isCollectedTypeShop && Utils.randSeedInt(100, 1) <= 5) {
            this.cachedRerollCost = 0;
        } else {
            let wave = this.draftOnly && this.scene.gameMode.isNightmare ? this.scene.currentBattle.waveIndex % 100 : this.scene.currentBattle.waveIndex;
            this.cachedRerollCost = Math.min(Math.ceil(wave / 10) * baseValue * Math.pow(2, this.rerollCount), Number.MAX_SAFE_INTEGER);
        }
        let hasFilter = this.pathNodeFilter !== PathNodeTypeFilter.NONE;
        let permaBaseValue = 300;
        if (this.constructor.name === 'CollectedTypeShopPhase') {
            permaBaseValue = 1250;
        } else if (hasFilter) {
            const isHighTierPerma = this.pathNodeFilter === PathNodeTypeFilter.MASTER_BALL_ITEMS || this.pathNodeFilter === PathNodeTypeFilter.ROGUE_BALL_ITEMS;
            permaBaseValue = isHighTierPerma ? 1250 : 900;
        }

        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            this.cachedPermaRerollCost = permaBaseValue;
        } else {
            const wave = this.scene.currentBattle.waveIndex;
            this.cachedPermaRerollCost = Math.min(Math.ceil(wave / 10) * permaBaseValue * Math.pow(hasFilter ? 1.2 : 1.5, this.permaRerollCount), Number.MAX_SAFE_INTEGER);
        }

        return { rerollCost: this.cachedRerollCost, permaRerollCost: this.cachedPermaRerollCost };
    }
    getPoolType(): ModifierPoolType | null {

        if (this.bypassPoolGeneration) {
            return null;
        }

        if (this.draftOnly) {
            return ModifierPoolType.DRAFT;
        }
        return ModifierPoolType.PLAYER;
    }

    getModifierTypeOptions(modifierCount: integer): ModifierTypeOption[] {
        const effectivePathNodeFilter = (!this.scene.moveUpgradesEnabledForRun &&
            (this.pathNodeFilter === PathNodeTypeFilter.MOVE_UPGRADE || this.pathNodeFilter === PathNodeTypeFilter.LOW_TIER_MOVE_UPGRADE))
            ? PathNodeTypeFilter.NONE
            : this.pathNodeFilter;

        let forcedTier: ModifierTier | null = null;
        switch (effectivePathNodeFilter) {
            case PathNodeTypeFilter.MASTER_BALL_ITEMS:
                forcedTier = ModifierTier.MASTER;
                break;
            case PathNodeTypeFilter.ROGUE_BALL_ITEMS:
                forcedTier = ModifierTier.ROGUE;
                break;
            case PathNodeTypeFilter.GREAT_BALL_ITEMS:
                forcedTier = ModifierTier.GREAT;
                break;
            case PathNodeTypeFilter.ULTRA_BALL_ITEMS:
                forcedTier = ModifierTier.ULTRA;
                break;
        }
        if (this.bypassPoolGeneration && this.preGeneratedOptions) {
            if (!this.scene.moveUpgradesEnabledForRun) {
                return this.preGeneratedOptions.filter(o => o.type?.id !== "MOVE_UPGRADE" && o.type?.id !== "LOW_TIER_MOVE_UPGRADE");
            }
            return this.preGeneratedOptions;
        }

        const party = this.scene.getParty();
        if (forcedTier !== null) {
            if (this.scene.moveUpgradesEnabledForRun) {
                const tiers = new Array(modifierCount).fill(forcedTier) as ModifierTier[];
                return getPlayerModifierTypeOptions(modifierCount, party, tiers, this.draftOnly, PathNodeTypeFilter.NONE);
            }

            const baseCount = modifierCount + 4;
            const baseTiers = new Array(baseCount).fill(forcedTier) as ModifierTier[];
            const baseOptions = getPlayerModifierTypeOptions(baseCount, party, baseTiers, this.draftOnly, PathNodeTypeFilter.NONE);
            const filtered = baseOptions.filter(o => o.type?.id !== "MOVE_UPGRADE" && o.type?.id !== "LOW_TIER_MOVE_UPGRADE").slice(0, modifierCount);

            let attempts = 0;
            while (filtered.length < modifierCount && attempts < 25) {
                const extra = getPlayerModifierTypeOptions(1, party, [forcedTier], this.draftOnly, PathNodeTypeFilter.NONE);
                const next = extra[0];
                if (next && next.type?.id !== "MOVE_UPGRADE" && next.type?.id !== "LOW_TIER_MOVE_UPGRADE") {
                    filtered.push(next);
                }
                attempts++;
            }

            return filtered;
        }

        if (this.scene.moveUpgradesEnabledForRun) {
            return getPlayerModifierTypeOptions(modifierCount, party, this.scene.lockModifierTiers ? this.modifierTiers : undefined, this.draftOnly, effectivePathNodeFilter);
        }

        const baseOptions = getPlayerModifierTypeOptions(modifierCount + 4, party, this.scene.lockModifierTiers ? this.modifierTiers : undefined, this.draftOnly, effectivePathNodeFilter);
        const filtered = baseOptions.filter(o => o.type?.id !== "MOVE_UPGRADE" && o.type?.id !== "LOW_TIER_MOVE_UPGRADE").slice(0, modifierCount);

        let attempts = 0;
        while (filtered.length < modifierCount && attempts < 25) {
            const extra = getPlayerModifierTypeOptions(1, party, this.scene.lockModifierTiers ? this.modifierTiers : undefined, this.draftOnly, effectivePathNodeFilter);
            const next = extra[0];
            if (next && next.type?.id !== "MOVE_UPGRADE" && next.type?.id !== "LOW_TIER_MOVE_UPGRADE") {
                filtered.push(next);
            }
            attempts++;
        }

        return filtered;
    }

    addModifier(modifier: Modifier): Promise<boolean> {
        return this.scene.addModifier(modifier, false, true);
    }
    end() {
        if (this.onEndCallback && !this.refreshing) {
            this.onEndCallback();
        }
        super.end();
    }

    private clearCachedRerollCost(): void {
        this.cachedRerollCost = null;
        this.cachedPermaRerollCost = null;
    }

    protected canAffordCost(cost: number): boolean {
        return this.scene.money >= cost;
    }

    protected handlePurchase(cost: number): void {
        this.scene.money -= cost;
        this.scene.updateMoneyText();
        this.scene.animateMoneyChanged(false);
        this.scene.playSound("se/buy");
    }

    protected handleButtonAction(cursor: integer, typeOptions: ModifierTypeOption[], modifierSelectCallback: Function, party: any[]): boolean {
        const uiHandler = this.scene.ui.getHandler() as ModifierSelectUiHandler;
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
                } else {
                    this.refreshing = true;
                    this.scene.reroll = true;

                    this.scene.gameData.gameStats.reroll++;

                     if(Utils.randSeedInt(100) <= 50) {
                        this.scene.gameData.reducePermaModifierByType([PermaType.PERMA_REROLL_COST_1, PermaType.PERMA_REROLL_COST_2, PermaType.PERMA_REROLL_COST_3], this.scene);
                     }
                    SelectModifierPhase.clearShopOptionsCache();

                    let rerollBypassOptions: ModifierTypeOption[] | undefined;
                    if (this.skillTreeNode && this.championData) {
                      const phase = new SkillTreeModifierPhase(this.scene, this.skillTreeNode, this.championData);
                      const nodeHash = this.skillTreeNode.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const baseNodeOffset = nodeHash * 1000;
                      const rerollOffset = (this.rerollCount + 1) * 10000;
                      this.scene.executeWithSeedOffset(() => {
                        rerollBypassOptions = (phase as any).createSkillTreeModifierOptions();
                      }, baseNodeOffset + rerollOffset);
                    }

                    this.scene.unshiftPhase(new SelectModifierPhase(this.scene, this.rerollCount + 1, typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[], this.draftOnly, this.onEndCallback, this.pathNodeFilter, this.permaRerollCount, rerollBypassOptions, this.skillTreeNode, this.championData));
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
                }
                break;

            case "modifierSelectUiHandler:permaRerollDesc":
                const permaRerollCosts = this.getRerollCost(typeOptions, this.scene.lockModifierTiers);
                const permaRerollCost = permaRerollCosts.permaRerollCost;
                if (this.scene.gameData.permaMoney < permaRerollCost) {
                    this.scene.ui.playError();
                    return false;
                } else {
                    this.refreshing = true;
                    this.scene.reroll = true;
                    this.scene.gameData.gameStats.permaReroll++;

                    SelectModifierPhase.clearShopOptionsCache();

                    let permaRerollBypassOptions: ModifierTypeOption[] | undefined;
                    if (this.skillTreeNode && this.championData) {
                      const phase = new SkillTreeModifierPhase(this.scene, this.skillTreeNode, this.championData);
                      const nodeHash = this.skillTreeNode.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const baseNodeOffset = nodeHash * 1000;
                      const permaOffset = (this.permaRerollCount + 1) * 20000;
                      this.scene.executeWithSeedOffset(() => {
                        permaRerollBypassOptions = (phase as any).createSkillTreeModifierOptions();
                      }, baseNodeOffset + permaOffset);
                    }

                    this.scene.unshiftPhase(new SelectModifierPhase(this.scene, this.rerollCount, typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[], this.draftOnly, this.onEndCallback, this.pathNodeFilter, this.permaRerollCount + 1, permaRerollBypassOptions, this.skillTreeNode, this.championData));
                    this.scene.ui.clearText();
                    this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                    if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                        this.scene.addPermaMoney(-permaRerollCost);
                        this.scene.animateMoneyChanged(false);
                    }
                    this.scene.playSound("se/buy");
                }
                break;

            case "modifierSelectUiHandler:transferDesc":
                uiHandler.setCallbackContext(typeOptions, modifierSelectCallback, this.getRerollCost(typeOptions, this.scene.lockModifierTiers), this.draftOnly);
                uiHandler.showTransferSubmenu();
                break;

            case "modifierSelectUiHandler:checkTeamDesc":
                uiHandler.hideTransientOverlays();
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
                this.scene.ui.playError();
                return false;
        }

        return true;
    }
}