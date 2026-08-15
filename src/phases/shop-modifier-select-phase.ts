import BattleScene from "#app/battle-scene.js";
import {ModifierTier} from "#app/modifier/modifier-tier.js";
import {ModifierTypeOption, ModifierType, getShopModifierTypeOptions, PermaPartyAbilityModifierType} from "#app/modifier/modifier-type.js";
import {Modifier} from "#app/modifier/modifier.js";
import { Mode } from "#app/ui/mode.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import {Phase} from "../phase";
import Overrides from "#app/overrides";
import {TitlePhase} from "./title-phase";
import {PermaRunQuestModifier, PersistentModifier, RerollModifier} from "#app/modifier/modifier";
import {ModifierTypeGenerator} from "#app/modifier/modifier-type";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";

export class ShopModifierSelectPhase extends Phase {
    private modifierTiers: ModifierTier[];
    private onEndCallback: (() => void) | undefined;
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
        this.scene.gameData.hasSeenCurrentShopItems = true;

        if (this.rerollCount > 0) {
            this.scene.reroll = false;
        }

        this.scene.gameData.localSaveAll(this.scene);

        const typeOptions: ModifierTypeOption[] = this.getAvailableModifierOptions();

        await this.scene.ui.setMode(Mode.SHOP_SELECT, true, typeOptions, this.modifierSelectCallback, this.getRerollCost());

        const uiHandler = this.scene.ui.getHandler() as any;
        if (uiHandler && (uiHandler as any).isPermaShopHandler) {
            uiHandler.setRefreshFunction(() => this.refreshPhase());
            uiHandler.setRerollCost(this.getRerollCost());
            uiHandler.updateRerollCostText();
        } else {
            console.error("PermaShopUiHandler not found or incorrect type!");
        }

        let permaTutorials = [EnhancedTutorial.SMITTY_ITEMS_1, EnhancedTutorial.PARTY_ABILITY_1, EnhancedTutorial.PERMA_MONEY_1];

        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(permaTutorials)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", permaTutorials, true, false, true);
        }

    }

    modifierSelectCallback = (rowCursor: integer, cursor: integer) => {
        const typeOptions: ModifierTypeOption[] = this.getAvailableModifierOptions();
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
            ui.showText(i18next.t("starterSelectUiHandler:confirmExit"), null, () => {
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
                    if ((handler as any).isPermaShopHandler && handler.active) {
                        handler.awaitingActionInput = true;
                        handler.onActionInput = this.modifierSelectCallback;
                    } else {
                        ui.setMode(Mode.SHOP_SELECT, true, typeOptions, this.modifierSelectCallback, this.getRerollCost());
                    }
                });
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
        }

        if (cost && this.scene.gameData.permaMoney < cost) {
            this.scene.ui.playError();
            return false;
        }

        const shopUiHandler = this.scene.ui.getHandler() as any;

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
        const refreshInterval = 10 * 60 * 1000;

        if (!this.scene.gameData.currentPermaShopOptions ||
            currentTime - this.scene.gameData.lastPermaShopRefreshTime >= refreshInterval) {
            this.refreshShopOptions();
            this.scene.gameData.resetPermaShopReroll();
        }
        return this.scene.gameData.currentPermaShopOptions!;
    }

    refreshShopOptions(refreshTime: boolean = true): void {
        const allOptions = getShopModifierTypeOptions(this.scene.gameData, false, this.scene);

        const isQuestOption = (option: ModifierTypeOption): boolean => {
            return option.type.constructor.name.includes('Quest') ||
                   (option.type.id && option.type.id.includes('QUEST'));
        };

        const isPartyAbilityOption = (option: ModifierTypeOption): boolean => {
            return option.type instanceof PermaPartyAbilityModifierType;
        };

        const questOptions = allOptions.filter(isQuestOption);
        const partyAbilityOptions = allOptions.filter(isPartyAbilityOption);

        const guaranteedOptions: ModifierTypeOption[] = [];
        const usedOptions = new Set<ModifierTypeOption>();

        if (questOptions.length > 0) {
            const randomQuestOption = Utils.randSeedShuffle(questOptions)[0];
            guaranteedOptions.push(randomQuestOption);
            usedOptions.add(randomQuestOption);
        }

        if (partyAbilityOptions.length > 0) {
            const availablePartyOptions = partyAbilityOptions.filter(option => !usedOptions.has(option));
            const selectedPartyOptions = Utils.randSeedShuffle(availablePartyOptions).slice(0, 2);
            for (const partyOption of selectedPartyOptions) {
                guaranteedOptions.push(partyOption);
                usedOptions.add(partyOption);
            }
        }

        const remainingOptions = allOptions.filter(option => !usedOptions.has(option));
        const remainingSlots = Math.max(0, 5 - guaranteedOptions.length);
        const additionalOptions = Utils.randSeedShuffle(remainingOptions).slice(0, remainingSlots);

        const newOptions = [...guaranteedOptions, ...additionalOptions];

        const partyAbilityIndices: number[] = [];
        for (let i = 0; i < newOptions.length; i++) {
            if (isPartyAbilityOption(newOptions[i])) {
                partyAbilityIndices.push(i);
            }
        }
        if (partyAbilityIndices.length >= 2) {
            const secondIndex = partyAbilityIndices[1];
            const optionToMove = newOptions.splice(secondIndex, 1)[0];
            const firstIndex = partyAbilityIndices[0];
            let newIndex = Utils.randSeedInt(newOptions.length + 1);
            if (newIndex === firstIndex + 1) {
                newIndex = (newIndex + 1) % (newOptions.length + 1);
            }
            newOptions.splice(newIndex, 0, optionToMove);
        }

        this.scene.gameData.updatePermaShopOptions(newOptions);
        if (refreshTime) {
            this.scene.gameData.lastPermaShopRefreshTime = Date.now();
            this.scene.gameData.hasSeenCurrentShopItems = false;
        }
    }

    reroll(): void {
        this.scene.reroll = true;
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

            this.rerollCount = isReroll ? this.rerollCount + 1 : 0;

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

    getRerollCost(): number {
        if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            return 0;
        }
        const baseValue = 375;
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