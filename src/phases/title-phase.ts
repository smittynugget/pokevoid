import {loggedInUser} from "#app/account.js";
import BattleScene from "#app/battle-scene.js";
import {BattleType, setupFixedBattles} from "#app/battle.js";
import {getDailyRunStarters, fetchDailyRunSeed} from "#app/data/daily-run.js";
import {Gender} from "#app/data/gender.js";
import {getBiomeKey} from "#app/field/arena.js";
import {GameModes, GameMode, getGameMode} from "#app/game-mode.js";
import {
    regenerateModifierPoolThresholds,
    ModifierPoolType,
    modifierTypes,
    getDailyRunStarterModifiers
} from "#app/modifier/modifier-type.js";
import {Phase} from "#app/phase.js";
import {SessionSaveData} from "#app/system/game-data.js";
import {Unlockables} from "#app/system/unlockables.js";
import {vouchers} from "#app/system/voucher.js";
import {OptionSelectItem, OptionSelectConfig} from "#app/ui/abstact-option-select-ui-handler.js";
import {SaveSlotUiMode} from "#app/ui/save-slot-select-ui-handler.js";
import {Mode} from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import {Modifier} from "#app/modifier/modifier.js";
import {CheckSwitchPhase} from "./check-switch-phase";
import {EncounterPhase} from "./encounter-phase";
import {SelectChallengePhase} from "./select-challenge-phase";
import {SelectStarterPhase} from "./select-starter-phase";
import {SummonPhase} from "./summon-phase";
import {SelectDraftPhase} from "#app/phases/select-draft-phase";
import {transferSave, transferLoad} from "#app/account";
import {SelectModifierPhase, ShowRewards} from "./select-modifier-phase";
import {ShopModifierSelectPhase} from "./shop-modifier-select-phase";
import ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler.js";
import {checkQuestState, QuestState, QuestUnlockables} from "#app/system/game-data";
import {TitleSummarySystem} from "#app/system/title-summary-system";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import {Species} from "#enums/species";
import {RewardObtainDisplayPhase} from "#app/phases/reward-obtain-display-phase";
import {setupNightmareFixedBattles} from "#app/battle";
import {TrainerType} from "#enums/trainer-type";
import {trainerConfigs, TrainerSlot} from "#app/data/trainer-config";
import {TrainerVariant} from "#app/field/trainer";
import {PlayerGender} from "#enums/player-gender";
import {getCharVariantFromDialogue, getSmitomDialogue} from "#app/data/dialogue";
import {EndCardPhase} from "#app/phases/end-card-phase";
import { UnlockPhase } from "./unlock-phase";
import TitleUiHandler from "#app/ui/title-ui-handler.ts";
import { EnhancedTutorial } from "#app/ui/tutorial-registry";
import { getAllRivalTrainerTypes } from "#app/data/trainer-config.js";
import { logNext30DaysLegendaryGachaSpecies } from "#app/data/egg";
import PokedexUiHandler from "#app/ui/pokedex-ui-handler.js";

export class TitlePhase extends Phase {
    private loaded: boolean;
    private lastSessionData: SessionSaveData;
    public gameMode: GameModes;
    private titleSummarySystem: TitleSummarySystem | null = null;
    private fromShop: boolean = false;

    constructor(scene: BattleScene, fromShop: boolean = false) {
        super(scene);

        this.loaded = false;
        this.titleSummarySystem = new TitleSummarySystem(scene);
        this.fromShop = fromShop;
    }

    start(): void {
        super.start();

        this.scene.ui.clearText();
        this.scene.ui.fadeIn(250);

        this.scene.playBgm("laboratory", true);

        this.titleSummarySystem = new TitleSummarySystem(this.scene);

        this.scene.gameData.getSession(loggedInUser?.lastSessionSlot ?? -1).then(sessionData => {
            this.scene.showTitleBG();
            this.showOptions();
            
        }).catch(err => {
            console.error(err);
            this.showOptions();
        });
        
    }

    showOptions(): void {
        const options: OptionSelectItem[] = [];

        if (this.scene.gameData.testSpeciesForMod.length > 0) {
            options.push({
                label: i18next.t("modGlitchCreateFormUi:testMods"),
                handler: () => {
                    setModeAndEnd(GameModes.TEST_MOD);
                    return true;
                }
            });
        }
        
        const lastSessionSlot = this.scene.gameData.getLastPlayedSessionSlot();
        if (loggedInUser && lastSessionSlot !== -1) {
            options.push({
                label: i18next.t("menu:continue"),
                handler: () => {
                    this.loadSaveSlot(lastSessionSlot);
                    return true;
                }
            });
        }
        const setModeAndEnd = (gameMode: GameModes) => {
            this.gameMode = gameMode;
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();
            this.end();
        };
        
        const shopNeedsRefresh = !this.scene.gameData.currentPermaShopOptions || 
                               Date.now() - this.scene.gameData.lastPermaShopRefreshTime >= 20 * 60 * 1000;
        
        const shopButton = document.getElementById("apadShop");
        if (shopButton) {
            shopButton.dataset.activeState = shopNeedsRefresh ? "true" : "false";
        }
        
        options.push({
                label: i18next.t("menu:newGame"),
                handler: () => {
                    const availableModes = [GameModes.DRAFT];

                    
                    if (this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
                        availableModes.push(GameModes.CLASSIC);
                    }
                    if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
                        availableModes.push(GameModes.NUZLIGHT);
                    }
                    if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
                        availableModes.push(GameModes.NUZLOCKE);
                    }

                    if(this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
                        availableModes.push(GameModes.NIGHTMARE);
                    }

                    if(this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
                        availableModes.push(GameModes.NUZLIGHT_DRAFT);
                    }

                    if(this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
                        availableModes.push(GameModes.NUZLOCKE_DRAFT);
                    }

                    const baseModesToShow = [
                        GameModes.DRAFT,
                        GameModes.CLASSIC,
                        GameModes.NUZLIGHT,
                        GameModes.NUZLOCKE
                    ];
                    
                    const advancedModesToShow = [
                        GameModes.NIGHTMARE,
                        GameModes.NUZLIGHT_DRAFT,
                        GameModes.NUZLOCKE_DRAFT
                    ];
                    
                    const nuzlockeUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
                    const modesToShow = [...baseModesToShow];
                    
                    if (nuzlockeUnlocked) {
                        modesToShow.push(...advancedModesToShow);
                    }
                    
                    const modeOptions = modesToShow.map(mode => {
                        const isAvailable = availableModes.includes(mode);
                        return {
                            label: isAvailable ? GameMode.getModeName(mode) : "???",
                            handler: () => {
                                if (isAvailable) {
                                    setModeAndEnd(mode);
                                    return true;
                                }
                                return false;
                            },
                            onHover: () => {
                                if (isAvailable) {
                                    this.scene.ui.showText(this.getModeDescription(mode));
                                } else {
                                    const hint = this.getUnlockHint(mode, availableModes);
                                    this.scene.ui.showText(hint);
                                }
                            }
                        };
                    });

                    modeOptions.push({
                        label: i18next.t("menu:cancel"),
                        handler: () => {
                            this.scene.clearPhaseQueue();
                            this.scene.pushPhase(new TitlePhase(this.scene));
                            super.end();
                            return true;
                        },
                        onHover: () => {
                            this.scene.ui.showText(i18next.t("menu:selectGameMode"));
                        }
                    });

                    this.scene.ui.showText(availableModes.length > 0 ? this.getModeDescription(availableModes[0]) : i18next.t("menu:selectGameMode"), null, () =>
                        this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {
                            options: modeOptions,
                            supportHover: true
                        })
                    );
                    return true;
                }
            },
            {
                label: i18next.t("menu:loadGame"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.SAVE_SLOT, SaveSlotUiMode.LOAD,
                        (slotId: integer) => {
                            if (slotId === -1) {
                                return this.showOptions();
                            }
                            this.loadSaveSlot(slotId);
                        });
                    return true;
                }
            },
            {
                label: i18next.t("menu:shop"),
                handler: () => {
                    setModeAndEnd(GameModes.SHOP);
                    return true;
                },
                item: shopNeedsRefresh ? 'exclamationMark' : undefined,
                itemArgs: ['smitems_192']
            },
            {
                label: i18next.t("menu:questsAndBounties"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, {
                        buttonActions: [
                            async () => {
                            },
                            () => {
                                this.scene.ui.revertMode();
                            }
                        ]
                    });
                    return true;
                },
                keepOpen: true
            },
            {
                label: "Discord",
                handler: () => {
                window.open("https://discord.gg/xsQummMK3H", "_blank")?.focus();
                return true;
                },
                keepOpen: true
            },
            {
                label: i18next.t("modGlitchCreateFormUi:mods"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.MOD_MANAGEMENT);
                    return true;
                },
                keepOpen: true
            },
            {
                label: i18next.t("menu:settings"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.SETTINGS);
                    return true;
                },
                keepOpen: true
            },
            {
                label: i18next.t("settings:tutorials"),
                handler: () => {
                    this.scene.gameData.tutorialService.showTutorialsByCategory('all', true);
                    return true;
                },
                keepOpen: true
            }
            );

        const config: OptionSelectConfig = {
            options: options,
            noCancel: true,
            yOffset: 60
        };
        this.scene.ui.setMode(Mode.TITLE, config);

        let introTutorials = [EnhancedTutorial.LEGENDARY_POKEMON_1, EnhancedTutorial.BUG_TYPES_1];
        let firstVictoryTutorials = [EnhancedTutorial.FIRST_VICTORY, EnhancedTutorial.NEW_QUESTS];
        let bountiesTutorials = [EnhancedTutorial.DAILY_BOUNTY, EnhancedTutorial.BOUNTIES_1];
        let menuAccess = [EnhancedTutorial.MENU_ACCESS, EnhancedTutorial.STATS, EnhancedTutorial.RUN_HISTORY_1];
        let testDetails = [EnhancedTutorial.EGG_SWAP_1, EnhancedTutorial.EGGS_1, EnhancedTutorial.UNLOCK_JOURNEY];

        // if(true || !this.scene.gameData.tutorialService.allTutorialsCompleted(testDetails)) {
        //         this.scene.gameData.tutorialService.showCombinedTutorial("", testDetails, true, false, true);
        // }

        if(!this.fromShop) {
        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
            if(this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.JOURNEY_1);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.TYPE_SWITCHER);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.ABILITY_SWITCHER);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.ANY_TMS);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.ANY_ABILITIES);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.ROGUE_MODE);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.UNLOCK_JOURNEY);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.ENDGAME);
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.STARTER_CATCH_QUEST);
            }
            if(this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.NUZLIGHT);
            }
            if(this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.NUZLOCKE);
            }
            if(this.scene.gameData.defeatedRivals.length > 0) {
                introTutorials.push(EnhancedTutorial.FIRST_VICTORY);
            }
            this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.NEW_QUESTS);
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1);
        }

         else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.POKEROGUE_1)) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.POKEROGUE_1, true, false);
        }

        else if(!this.scene.gameData.tutorialService.allTutorialsCompleted(firstVictoryTutorials) && this.scene.gameData.defeatedRivals.length > 0) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", firstVictoryTutorials, true, false, true);
        }

        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.JOURNEY_1) && this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.JOURNEY_1, true, false);
        }

       else if (!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.NUZLIGHT) && this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", [EnhancedTutorial.NUZLIGHT, EnhancedTutorial.NEW_QUESTS], true, false, true);
        }
        else if (!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.NUZLOCKE) && this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", [EnhancedTutorial.NUZLOCKE, EnhancedTutorial.NEW_QUESTS], true, false, true);
        }

        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.THE_VOID_UNLOCKED) && this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", [EnhancedTutorial.THE_VOID_UNLOCKED, EnhancedTutorial.NEW_QUESTS], true, false, true);
        }

        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.THE_VOID_OVERTAKEN) && this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", [EnhancedTutorial.THE_VOID_OVERTAKEN, EnhancedTutorial.NEW_QUESTS, EnhancedTutorial.SMITTY_FORM_UNLOCKED_1], true, false, true);
        }

        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.NEW_QUESTS) && this.scene.gameData.defeatedRivals.length > 0) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.NEW_QUESTS, true, false);
        }

        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1)) {
            if(this.scene.gameData.uniSmittyUnlocks.length > 0) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1, true, false);
            }
            else {
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1);
            }
        }
         
        else if(this.scene.gameData.isDailyBountyTime()) {
            if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.BOUNTIES_1)) {
                this.scene.gameData.tutorialService.showCombinedTutorial("", bountiesTutorials, true, false, true);
            }
            else {
            this.scene.gameData.tutorialService.showTutorial(EnhancedTutorial.DAILY_BOUNTY, false, false);
            }
            this.scene.gameData.updateDailyBountyCode();
            this.scene.gameData.localSaveAll(this.scene);
        }
        else if(Utils.randSeedInt(100, 1) <= 5) {
            if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SAVING_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SAVING_1, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SMITOM)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SMITOM, true, false);
            }
            else if(!this.scene.gameData.tutorialService.allTutorialsCompleted(menuAccess)) {
                this.scene.gameData.tutorialService.showCombinedTutorial("", menuAccess, true, false, true);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.RIVAL_QUESTS)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.RIVAL_QUESTS, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.ABILITIES_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.ABILITIES_1, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.NEW_FORMS_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.NEW_FORMS_1, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.GLITCH_FORMS_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.GLITCH_FORMS_1, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SMITTY_FORMS_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SMITTY_FORMS_1, true, false);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.DISCORD)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.DISCORD, true, false);
            }
        }
            
        }
            
        // this.scene.ui.setOverlayMode(Mode.POKEDEX);

        // const rivalConfig = trainerConfigs[TrainerType.RED];
        // const rivalName = i18next.t(`trainerClasses:${rivalConfig.getTitle(TrainerSlot.TRAINER, TrainerVariant.DEFAULT).toLowerCase().replace(/\s/g, "_")}`);
        //
        // this.scene.ui.setOverlayMode(Mode.REWARD_OBTAINED, {
        //     buttonActions: [
        //         () => {
        //             this.scene.ui.getHandler().clear();
        //             // Handle quest unlock after overlay is cleared
        //             // handleQuestUnlock();
        //         }
        //     ]
        // }, {
        //     name: "MONEY",
        //     amount: 100,
        //     type: RewardObtainedType.MONEY
        // });
    }


    loadSaveSlot(slotId: integer): void {
        this.scene.sessionSlotId = slotId > -1 || !loggedInUser ? slotId : loggedInUser.lastSessionSlot;
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.resetModeChain();
        this.scene.gameData.loadSession(this.scene, slotId, slotId === -1 ? this.lastSessionData : undefined).then((success: boolean) => {
            if (success) {
                this.loaded = true;
                this.scene.ui.showText(i18next.t("menu:sessionSuccess"), null, () => this.end());
            } else {
                this.end();
            }
        }).catch(err => {
            console.error(err);
            this.scene.ui.showText(i18next.t("menu:failedToLoadSession"), null);
        });
    }

    initDailyRun(): void {
        this.scene.ui.setMode(Mode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: integer) => {
            this.scene.clearPhaseQueue();
            if (slotId === -1) {
                this.scene.pushPhase(new TitlePhase(this.scene));
                return super.end();
            }
            this.scene.sessionSlotId = slotId;

            const generateDaily = (seed: string) => {
                this.scene.gameMode = getGameMode(GameModes.DAILY);

                this.scene.setSeed(seed);
                this.scene.resetSeed(1);

                this.scene.money = this.scene.gameMode.getStartingMoney();

                const starters = getDailyRunStarters(this.scene, seed);
                const startingLevel = this.scene.gameMode.getStartingLevel();

                const party = this.scene.getParty();
                const loadPokemonAssets: Promise<void>[] = [];
                for (const starter of starters) {
                    const starterProps = this.scene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
                    const starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
                    const starterGender = starter.species.malePercent !== null
                        ? !starterProps.female ? Gender.MALE : Gender.FEMALE
                        : Gender.GENDERLESS;
                    const starterPokemon = this.scene.addPlayerPokemon(starter.species, startingLevel, starter.abilityIndex, starterFormIndex, starterGender, starterProps.shiny, starterProps.variant, undefined, starter.nature);
                    starterPokemon.setVisible(false);
                    party.push(starterPokemon);
                    loadPokemonAssets.push(starterPokemon.loadAssets());
                }

                regenerateModifierPoolThresholds(party, ModifierPoolType.DAILY_STARTER);

                const modifiers: Modifier[] = Array(3).fill(null).map(() => modifierTypes.EXP_SHARE().withIdFromFunc(modifierTypes.EXP_SHARE).newModifier())
                    .concat(Array(3).fill(null).map(() => modifierTypes.GOLDEN_EXP_CHARM().withIdFromFunc(modifierTypes.GOLDEN_EXP_CHARM).newModifier()))
                    .concat(getDailyRunStarterModifiers(party))
                    .filter((m) => m !== null);

                for (const m of modifiers) {
                    this.scene.addModifier(m, true, false, false, true);
                }
                this.scene.updateModifiers(true, true);

                Promise.all(loadPokemonAssets).then(() => {
                    this.scene.time.delayedCall(500, () => this.scene.playBgm());
                    this.scene.gameData.gameStats.dailyRunSessionsPlayed++;
                    this.scene.newArena(this.scene.gameMode.getStartingBiome(this.scene));
                    this.scene.newBattle();
                    this.scene.arena.init();
                    this.scene.sessionPlayTime = 0;
                    this.scene.lastSavePlayTime = 0;
                    this.end();
                });
            };

            if (!Utils.isLocal) {
                fetchDailyRunSeed().then(seed => {
                    if (seed) {
                        generateDaily(seed);
                    } else {
                        throw new Error("Daily run seed is null!");
                    }
                }).catch(err => {
                    console.error("Failed to load daily run:\n", err);
                });
            } else {
                generateDaily(btoa(new Date().toISOString().substring(0, 10)));
            }
        });
    }

    end(): void {
        if (!this.loaded && !this.scene.gameMode.isDaily) {
            this.scene.arena.preloadBgm();
            this.scene.gameMode = getGameMode(this.gameMode);

            if (this.gameMode === GameModes.CHALLENGE) {
                this.scene.pushPhase(new SelectChallengePhase(this.scene));
            }
            else if(this.scene.gameMode.isTestMod) {
                this.scene.pushPhase(new SelectDraftPhase(this.scene, true));

                if (this.gameMode !== GameModes.SHOP) {
                    this.scene.newArena(this.scene.gameMode.getStartingBiome(this.scene));
                }

                setupFixedBattles(this.scene);
                this.scene.money = this.scene.gameMode.getStartingMoney();

                this.scene.pushPhase(new EncounterPhase(this.scene, this.loaded));

                super.end();
            }
            else if (this.scene.gameMode.isDraft && !this.scene.gameMode.isNightmare) {
                this.scene.ui.setOverlayMode(Mode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: integer) => {
                    if (slotId === -1) {
                        this.scene.clearPhaseQueue();
                        this.scene.pushPhase(new TitlePhase(this.scene));
                        super.end();
                        return;
                    }
                        this.scene.sessionSlotId = slotId;

                        this.scene.pushPhase(new SelectDraftPhase(this.scene));

                        if (this.gameMode !== GameModes.SHOP) {
                            this.scene.newArena(this.scene.gameMode.getStartingBiome(this.scene));
                        }

                        setupFixedBattles(this.scene);
                        this.scene.money = this.scene.gameMode.getStartingMoney();

                        this.scene.pushPhase(new EncounterPhase(this.scene, this.loaded));

                        super.end();
                });
                return; 
            } 
            else if (this.gameMode === GameModes.SHOP) {
                this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
                super.end();
                return;
            } else {
                if(this.gameMode === GameModes.NIGHTMARE) {
                    setupNightmareFixedBattles(this.scene);
                }
                this.scene.pushPhase(new SelectStarterPhase(this.scene));
            }

            if (this.gameMode !== GameModes.SHOP) {
                this.scene.newArena(this.scene.gameMode.getStartingBiome(this.scene));
            }
            if(this.gameMode != GameModes.NIGHTMARE) {
                setupFixedBattles(this.scene);
            }
        } else {
            this.scene.playBgm();
        }


        this.scene.pushPhase(new EncounterPhase(this.scene, this.loaded));

        if (this.loaded) {
            if (this.scene.gameMode.isNightmare) {
                setupNightmareFixedBattles(this.scene);
            }
            else {
                setupFixedBattles(this.scene);
            }

            const availablePartyMembers = this.scene.getParty().filter(p => p.isAllowedInBattle()).length;

            this.scene.pushPhase(new SummonPhase(this.scene, 0, true, true));
            if (this.scene.currentBattle.double && availablePartyMembers > 1) {
                this.scene.pushPhase(new SummonPhase(this.scene, 1, true, true));
            }

            if (this.scene.currentBattle.battleType !== BattleType.TRAINER && (this.scene.currentBattle.waveIndex > 1 || !this.scene.gameMode.isDaily)) {
                const minPartySize = this.scene.currentBattle.double ? 2 : 1;
                if (availablePartyMembers > minPartySize) {
                    this.scene.pushPhase(new CheckSwitchPhase(this.scene, 0, this.scene.currentBattle.double));
                    if (this.scene.currentBattle.double) {
                        this.scene.pushPhase(new CheckSwitchPhase(this.scene, 1, this.scene.currentBattle.double));
                    }
                }
            }
        }

        for (const achv of Object.keys(this.scene.gameData.achvUnlocks)) {
            if (vouchers.hasOwnProperty(achv) && achv !== "CLASSIC_VICTORY") {
                this.scene.validateVoucher(vouchers[achv]);
            }
        }

        super.end();
    }

    private getModeDescription(mode: GameModes): string {
        switch (mode) {
            case GameModes.DRAFT:
                return i18next.t("menu:selectRogueMode");
            case GameModes.CLASSIC:
                return i18next.t("menu:selectJourneyMode");
            case GameModes.NUZLIGHT:
                return i18next.t("menu:selectNuzlightMode");
            case GameModes.NUZLOCKE:
                return i18next.t("menu:selectNuzlockeMode");
            case GameModes.NIGHTMARE:
                return i18next.t("menu:selectNightmareMode");
            case GameModes.NUZLIGHT_DRAFT:
                return i18next.t("menu:selectNuzlightDraftMode");
            case GameModes.NUZLOCKE_DRAFT:
                return i18next.t("menu:selectNuzlockeDraftMode");
            default:
                return "";
        }
    }

    private getUnlockHint(mode: GameModes, availableModes: GameModes[]): string {
        const hasClassic = availableModes.includes(GameModes.CLASSIC);
        const hasNuzlight = availableModes.includes(GameModes.NUZLIGHT);
        const hasNuzlocke = availableModes.includes(GameModes.NUZLOCKE);
        const hasVoid = availableModes.includes(GameModes.NIGHTMARE);
        
        if (!hasClassic) {
            if (mode === GameModes.CLASSIC) {
                return i18next.t("menu:unlockHintClassic");
            }
            return "???";
        } else if (!hasNuzlight) {
            if (mode === GameModes.NUZLIGHT) {
                return i18next.t("menu:unlockHintNuzlight");
            }
            return "???";
        } else if (!hasNuzlocke) {
            if (mode === GameModes.NUZLOCKE) {
                return i18next.t("menu:unlockHintNuzlocke");
            }
            return "???";
        } else if (!hasVoid) {
            if (mode === GameModes.NIGHTMARE) {
                return i18next.t("menu:unlockHintVoid");
            }
            return "???";
        } else {
            if (mode === GameModes.NUZLIGHT_DRAFT || mode === GameModes.NUZLOCKE_DRAFT) {
                return i18next.t("menu:unlockHintDraftMode");
            }
            return "???";
        }
    }
}
