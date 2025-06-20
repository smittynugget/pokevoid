import BattleScene from "#app/battle-scene.js";
import {ModifierTier} from "#app/modifier/modifier-tier.js";
import {ModifierTypeOption, ModifierType, getShopModifierTypeOptions} from "#app/modifier/modifier-type.js";
import {Modifier, ReduceShopCostModifier} from "#app/modifier/modifier.js";
import ShopSelectUiHandler, {SHOP_OPTIONS_ROW_LIMIT} from "#app/ui/shop-select-ui-handler.js";
import {Mode} from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import {Phase} from "../phase";
import Overrides from "#app/overrides";
import {TitlePhase} from "./title-phase";
import {PermaRunQuestModifier, PersistentModifier, RerollModifier} from "#app/modifier/modifier";
import {ModifierTypeGenerator} from "#app/modifier/modifier-type";
import { CommandPhase } from "./command-phase";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";

export class ShopModifierSelectPhase extends Phase {
    private modifierTiers: ModifierTier[];
    private onEndCallback: (() => void) | undefined;
    private lastRefreshTime: number;
    private selectionMade: boolean = false;
    private currentOptions: ModifierTypeOption[] | null = null;
    private refreshing: boolean = false;

    constructor(
        scene: BattleScene,
        modifierTiers?: ModifierTier[],
        onEndCallback?: () => void,
        currentOptions?: ModifierTypeOption[] | null
    ) {
        super(scene);

        this.modifierTiers = modifierTiers || [];
        this.onEndCallback = onEndCallback;
        this.lastRefreshTime = Date.now();
        this.currentOptions = currentOptions || null;
    }

    public get rerollCount() :number {
        return this.scene.gameData.permaShopRerollCount;
    }
    public set rerollCount(value:number) {
        this.scene.gameData.permaShopRerollCount = value;
    }

    async start() {
        super.start();

        this.scene.gameData.localSaveAll(this.scene);

        const typeOptions: ModifierTypeOption[] = this.getAvailableModifierOptions();

        await this.scene.ui.setMode(Mode.SHOP_SELECT, true, typeOptions, this.modifierSelectCallback, this.getRerollCost());

        const uiHandler = this.scene.ui.getHandler() as ShopSelectUiHandler;
        if (uiHandler && uiHandler instanceof ShopSelectUiHandler) {
            uiHandler.setRefreshFunction(() => this.refreshPhase());
            uiHandler.setRerollCost(this.getRerollCost());
            uiHandler.updateRerollCostText();
        } else {
            console.error("ShopSelectUiHandler not found or is of incorrect type!");
        }

        let permaTutorials = [EnhancedTutorial.SMITTY_ITEMS_1, EnhancedTutorial.PARTY_ABILITY_1, EnhancedTutorial.PERMA_MONEY_1];

        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(permaTutorials)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", permaTutorials, true, false, true);
        }

    }

    modifierSelectCallback = (rowCursor: integer, cursor: integer) => {
        const typeOptions: ModifierTypeOption[] = this.getAvailableModifierOptions();
        if (rowCursor < 0 || cursor < 0) {
            this.scene.ui.showText(i18next.t("starterSelectUiHandler:confirmExit"), null, () => {
                this.scene.ui.setOverlayMode(Mode.CONFIRM, () => {
                    this.scene.ui.revertMode();
                    this.scene.ui.setMode(Mode.MESSAGE);
                    this.end();
                }, () => this.scene.ui.setMode(Mode.SHOP_SELECT, true, typeOptions, this.modifierSelectCallback, this.getRerollCost()));
            });
            return false;
        }

        let modifierType: ModifierType | undefined;
        let cost: integer | undefined;

        switch (rowCursor) {
            case 0:
                switch (cursor) {
                    case 0:
                        const rerollCost = this.getRerollCost();
                        if (this.scene.gameData.permaMoney < rerollCost) {
                            this.scene.ui.playError();
                            return false;
                        } else {
                            this.reroll();
                        }
                        break;
                    case 1:
                        break;
                }
                return true;
            case 1:
                if (typeOptions[cursor]?.type) {
                    modifierType = typeOptions[cursor].type;
                    cost = typeOptions[cursor].cost;
                }
                break;
            default:
                const shopOptions = getShopModifierTypeOptions(this.scene.gameData, false, this.scene);
                const shopOption = shopOptions[rowCursor > 2 || shopOptions.length <= SHOP_OPTIONS_ROW_LIMIT ? cursor : cursor + SHOP_OPTIONS_ROW_LIMIT];
                if (shopOption?.type) {
                    modifierType = shopOption.type;
                    cost = shopOption.cost;
                }
                break;
        }

        if (cost && this.scene.gameData.permaMoney < cost) {
            this.scene.ui.playError();
            return false;
        }

        const shopUiHandler = this.scene.ui.getHandler() as ShopSelectUiHandler;

        const applyModifier = (modifier: Modifier, playSound: boolean = false) => {
            const result = this.scene.addPermaModifier(modifier as PersistentModifier);
            if (cost) {
                result.then(success => {
                    if (success) {
                        if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
                            this.scene.addPermaMoney(-cost!);
                            this.scene.updateUIPermaMoneyText();
                            if (!(modifier instanceof RerollModifier)) {
                                this.scene.gameData.gameStats.permaItemsBought++;
                            }
                            if (modifier instanceof RerollModifier) {
                                this.refreshShopOptions();
                                this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene, this.modifierTiers, this.onEndCallback));
                                this.scene.ui.clearText();
                                this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                                return;
                            }
                        }
                        this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
                        this.scene.playSound("se/buy");
                        shopUiHandler.updateCostText();
                        this.scene.gameData.localSaveAll(this.scene);
                    } else {
                        this.scene.ui.playError();
                    }
                });
            }
            const doEnd = () => {
                this.scene.ui.clearText();
                this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
            };
            if (result instanceof Promise) {
                result.then(() => doEnd());
            } else {
                doEnd();
            }
        };

        if (modifierType) {
            this.selectionMade = true;

        shopUiHandler.setSelectedOption(typeOptions[cursor]);

            const party = this.scene.getParty();

            if (modifierType instanceof ModifierTypeGenerator) {
                const generatedType = modifierType.generateType(party);
                if (!generatedType) return false;
                modifierType = generatedType;
            }

            const modifier = modifierType.newModifier();

            if (modifier instanceof PermaRunQuestModifier &&
                this.scene.gameData.permaModifiers.isQuestBountyQuest(modifier.questUnlockData?.questId)) {

                const existingQuest = this.scene.gameData.permaModifiers.findModifier(m =>
                    m instanceof PermaRunQuestModifier &&
                    m.questUnlockData?.questId === modifier.questUnlockData?.questId &&
                    m.consoleCode === modifier.consoleCode
                ) as PermaRunQuestModifier;

                if (existingQuest) {
                    this.scene.ui.setOverlayMode(Mode.QUEST_ACTIVE, {
                        buttonActions: [
                            () => {
                                this.selectionMade = false;
                                this.scene.ui.revertMode();
                            }
                        ]
                    }, null, existingQuest, true); 
                } else {

                    this.scene.ui.setOverlayMode(Mode.QUEST_ACTIVE, {
                        buttonActions: [
                            () => {
                                this.scene.ui.revertMode();
                                applyModifier(modifier, true);
                                shopUiHandler.removeSelectedOption(); 
                                this.scene.ui.clearText();
                            },
                            () => {
                                this.selectionMade = false;
                                this.scene.ui.revertMode();
                            }
                        ]
                    }, null, modifier, false);

                    return !cost;
                }
            }

            else {
                applyModifier(modifier, true);
        shopUiHandler.removeSelectedOption();
                this.scene.ui.clearText();
            }
        }
        return !cost;
    };

    getAvailableModifierOptions(): ModifierTypeOption[] {
        const currentTime = Date.now();
        const refreshInterval = 20 * 60 * 1000; 

        if (!this.scene.gameData.currentPermaShopOptions ||
            currentTime - this.scene.gameData.lastPermaShopRefreshTime >= refreshInterval) {
            this.refreshShopOptions();
            this.scene.gameData.resetPermaShopReroll();
        }
        return this.scene.gameData.currentPermaShopOptions!;
    }

    refreshShopOptions(refreshTime: boolean = true): void {
        const allOptions = getShopModifierTypeOptions(this.scene.gameData, false, this.scene);
        const newOptions = Utils.randSeedShuffle(allOptions).slice(0, 4);

        this.scene.gameData.updatePermaShopOptions(newOptions);
        if (refreshTime) {
            this.scene.gameData.lastPermaShopRefreshTime = Date.now();
        }
    }

    calculateModifierCost(option: ModifierTypeOption): number {
        const baseCost = 100;
        const rarityMultiplier = option.type.tier ? Math.pow(2, option.type.tier - 1) : 1;
        let cost = Math.round(baseCost * rarityMultiplier);

        const reduceShopCostModifier = this.scene.findModifier(m => m instanceof ReduceShopCostModifier) as ReduceShopCostModifier;
        if (reduceShopCostModifier) {
            const costHolder = new Utils.NumberHolder(cost);
            reduceShopCostModifier.apply([costHolder]);
            cost = costHolder.value;
        }

        return cost;
    }

    reroll(): void {
        this.scene.addPermaMoney(-(this.getRerollCost())!);
        this.scene.updateUIPermaMoneyText();
        this.scene.playSound("se/buy");
        this.refreshPhase(true);
    }

    refreshPhase(isReroll: boolean = false): void {
        this.refreshShopOptions(!isReroll);    

        if (this.scene.getCurrentPhase() instanceof ShopModifierSelectPhase) {

            this.refreshing = true;

            this.scene.ui.clearText();

            this.rerollCount = isReroll ? this.rerollCount + 1 : 1;
            
            const newPhase = new ShopModifierSelectPhase(
                this.scene,
                this.modifierTiers,
                this.onEndCallback,
                !isReroll ? this.scene.gameData.currentPermaShopOptions : null
            );

            this.scene.ui.setMode(Mode.MESSAGE).then(() => {
                this.scene.unshiftPhase(newPhase);
                this.end();
            });
        }
    }

    updateSeed(): void {
        this.scene.resetSeed();
    }

    getRerollCost(): number {
        const baseValue = 500; 
        return Math.min(Math.ceil(baseValue * Math.pow(2, this.rerollCount)), Number.MAX_SAFE_INTEGER);
    }

    end() {
        if (this.onEndCallback && !this.selectionMade && !this.refreshing) {
            this.onEndCallback();
        }
        if (this.selectionMade) {
            this.scene.ui.clearText();
            this.scene.unshiftPhase(new ShopModifierSelectPhase(
                this.scene,
                this.modifierTiers, 
                this.onEndCallback, 
                this.currentOptions
            ));
        } else if (!this.refreshing && !this.scene.currentBattle && !(this.scene.getNextPhase() instanceof TitlePhase)) { 
            this.scene.clearPhaseQueue();
            this.scene.unshiftPhase(new TitlePhase(this.scene, true));
        }

        this.scene.gameData.localSaveAll(this.scene);

        super.end();
    }
}