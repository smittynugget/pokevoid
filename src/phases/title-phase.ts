import {loggedInUser} from "#app/account.js";
import BattleScene from "#app/battle-scene.js";
import Battle, {BattleType, setupFixedBattlePaths, setupFixedBattles, resetBattlePathGlobalState, getCurrentBattlePath, setCurrentBattlePath, reconstructBattlePathFromLayers} from "#app/battle.js";
import {getDailyRunStarters, fetchDailyRunSeed} from "#app/data/daily-run.js";
import {Gender} from "#app/data/gender.js";
import {getPokemonSpecies} from "#app/data/pokemon-species.js";
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
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import {vouchers} from "#app/system/voucher.js";
import {OptionSelectItem, OptionSelectConfig} from "#app/ui/abstact-option-select-ui-handler.js";
import {SaveSlotUiMode} from "#app/ui/save-slot-select-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import {Modifier, applySignatureTypeSwitcher} from "#app/modifier/modifier.js";
import {CheckSwitchPhase} from "./check-switch-phase";
import {EncounterPhase} from "./encounter-phase";
import {SelectChallengePhase} from "./select-challenge-phase";
import {SelectStarterPhase} from "./select-starter-phase";
import {SummonPhase} from "./summon-phase";
import {SelectDraftPhase} from "#app/phases/select-draft-phase.js";
import {transferSave, transferLoad} from "#app/account.js";
import { SelectModifierPhase } from "./select-modifier-phase";
import { ShowRewards } from "#app/utils/show-rewards.js";
import {ShopModifierSelectPhase} from "./shop-modifier-select-phase";
import {SkillTreePhase, SkillTreeMode} from "./skill-tree-phase";
import ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler.js";
import Overrides from "#app/overrides";
import {checkQuestState, QuestState, QuestUnlockables} from "#app/system/game-data.js";
import {TitleSummarySystem} from "#app/system/title-summary-system.js";
import {RewardObtainedType, UnlockModePokeSpriteType} from "#app/ui/reward-obtained-ui-handler.js";
import type { RewardConfig } from "#app/ui/reward-obtained-ui-handler.js";
import {Species} from "#app/enums/species.js";
import {RewardObtainDisplayPhase} from "#app/phases/reward-obtain-display-phase.js";
import {setupNightmareFixedBattles} from "#app/battle.js";
import {TrainerType} from "#app/enums/trainer-type.js";
import {trainerConfigs, TrainerSlot} from "#app/data/trainer-config.js";
import {TrainerVariant} from "#app/field/trainer.js";
import {PlayerGender} from "#app/enums/player-gender.js";
import {getCharVariantFromDialogue, getSmitomDialogue} from "#app/data/dialogue.js";
import {EndCardPhase} from "#app/phases/end-card-phase.js";
import { UnlockPhase } from "./unlock-phase";
import TitleUiHandler from "#app/ui/title-ui-handler.js";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { getAllRivalTrainerTypes } from "#app/data/trainer-config.js";
import { logNext30DaysLegendaryGachaSpecies } from "#app/data/egg.js";
import { BattlePathPhase } from "./battle-path-phase";
import MenuUiHandler from "#app/ui/menu-ui-handler.js";

import { GameMechanicsID, GameMechanicsVersion } from "#app/enums/gameMechanicsID.js";
import { ChampionModeIntegration, setupBattleFlow } from "#app/system/champion-mode-integration.js";
import { ChampionSelectPhase } from "#app/phases/champion-select-phase.js";
import { ChampionManager } from "#app/system/champion-manager.js";
import { ChampionUtils } from "#app/system/champion-utils.js";
import { POKEMON_ALT_BUILDS, PokemonAltBuildId } from "#app/data/pokemon-alt-buid.js";
import { PokemonAltBuildModifier } from "#app/modifier/modifier.js";
import { PokemonAltBuildModifierType } from "#app/modifier/modifier-type.js";
import { SlideshowCutscenePhase } from "./slideshow-cutscene-phase";
import { DEBUG_TEST_RUN_END_SUMMARY, DEBUG_TEST_SLIDESHOW_CUTSCENE, DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";
import { addCorruptedRivalOverlay, playCutsceneFaintAnim } from "#app/utils/story-cutscene-overlays.js";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { SmitomTutorialPhase } from "#app/phases/smitom-tutorial-phase.js";
import { TutorialBattlePhase } from "#app/phases/tutorial-battle-phase.js";

export class TitlePhase extends Phase {
    private loaded: boolean;
    private lastSessionData: SessionSaveData;
    public gameMode: GameModes;
    private titleSummarySystem: TitleSummarySystem | null = null;
    private fromShop: boolean = false;
    private skipReturnCondense: boolean = false;
    private fromVictoryRun: boolean = false;
    private debugModeActive: boolean = false;
    private static debugCutsceneShown: boolean = false;
    private static debugRunEndSummaryShown: boolean = false;
    private static titleStoryCutsceneTriggered: boolean = false;
    private static debugCutsceneMenuDisabled: boolean = false;
    private static firstTimeFtlAutoStartPending: boolean = false;
    public static tutorialBattlePending: boolean = false;
    public static debugTutorialFlowActive: boolean = false;
    public static tutorialBattleAttempted: boolean = false;
    public smitomTipShownThisVisit: boolean = false;

    constructor(scene: BattleScene, fromShop: boolean = false, skipReturnCondense: boolean = false, fromVictoryRun: boolean = false) {
        super(scene);

        this.loaded = false;
        this.titleSummarySystem = new TitleSummarySystem(scene);
        this.fromShop = fromShop;
        this.skipReturnCondense = skipReturnCondense;
        this.fromVictoryRun = fromVictoryRun;
    }

    start(): void {
        super.start();

        if (DEBUG_TEST_SLIDESHOW_CUTSCENE && !TitlePhase.debugCutsceneMenuDisabled) {
            this.scene.clearAllPhaseQueues();
            this.scene.ui.clearText();
            this.scene.ui.fadeIn(250);
            this.scene.playBgm("laboratory", true);
            this.scene.showTitleBG();
            this.scene.resetRunUnlockRewards();
            this.showDebugCutsceneMenu();
            return;
        }

        if (TitlePhase.tutorialBattlePending && !TitlePhase.tutorialBattleAttempted) {
            if (!this.scene._bootGateResolvers) {
                this.beginTutorialBattleFlow();
                return;
            }
            const pollGate = () => {
                if (!this.scene._bootGateResolvers) {
                    if (TitlePhase.tutorialBattlePending && !TitlePhase.tutorialBattleAttempted) {
                        this.beginTutorialBattleFlow();
                    }
                } else {
                    this.scene.time.delayedCall(100, pollGate);
                }
            };
            this.scene.time.delayedCall(100, pollGate);
            return;
        }

        if (!TitlePhase.tutorialBattleAttempted
            && !this.scene.gameData.gameStats.onboardingTutorialComplete
            && this.scene.gameData.gameStats.cutsceneTitleAShown === true
            && !TitlePhase.tutorialBattlePending
            && !this.scene._bootGateResolvers) {
            TitlePhase.tutorialBattleAttempted = true;
            this.beginTutorialBattleFlow();
            return;
        }

        this.scene.ui.resetModeChain();
        this.scene.ui.setMode(Mode.MESSAGE);
        const isReturnToTitle = !this.fromShop && !this.skipReturnCondense && !this.scene._bootGateResolvers && !this.scene.scene.isActive("loading");
        if (isReturnToTitle) {
            this.scene.playReturnCondense();
        } else {
            this.scene.showTitleBG();
        }

        this.scene.ui.clearText();
        this.scene.ui.fadeIn(250);

        this.scene.playBgm("laboratory", true);

        this.titleSummarySystem = new TitleSummarySystem(this.scene);

        this.scene.gameData.checkAndCreateBackups();

        if(this.debugModeActive) {
            if (false) {
                this.debugMistySkillTree();
                return;
            }
            if (true) {
                this.debugChampionSelect();
                return;
            }
        }

        this.scene.gameData.getSession(loggedInUser?.lastSessionSlot ?? -1).then(sessionData => {
            this.showOptions();
            if (DEBUG_TEST_RUN_END_SUMMARY && !TitlePhase.debugRunEndSummaryShown) {
                TitlePhase.debugRunEndSummaryShown = true;
                this.scene.ui.setOverlayMode(Mode.RUN_END_SUMMARY, { debug: true });
            }
        }).catch(err => {
            console.error(err);
            this.showOptions();
        });
    }

    private beginAutoStartToStarterSelect(): void {
        const scene = this.scene;

        scene.ui.clearText();
        scene.ui.fadeIn(250);
        scene.playBgm("menu", true);

        this.gameMode = GameModes.CHAOS_JOURNEY_FTL;
        scene.gameMode = getGameMode(GameModes.CHAOS_JOURNEY_FTL);
        scene.gameData.selectedChampionId = undefined;

        scene.gameMechanicTracking[GameMechanicsID.CHAMPION_MODE] = GameMechanicsVersion.CHAMPION_V1;

        scene.arena.preloadBgm();

        ChampionModeIntegration.initializeChampionSelection(scene, GameModes.CHAOS_JOURNEY_FTL, {
            onChampionReady: () => {},
            skipToChampionId: "apollo"
        });

        super.end();
    }

    private beginFirstTimeFtlAutoStartFlow(): void {
        TitlePhase.firstTimeFtlAutoStartPending = false;

        const scene = this.scene;

        scene.clearAllPhaseQueues();
        scene.ui.resetModeChain();
        scene.ui.clearText();
        scene.ui.fadeIn(250);
        scene.playBgm("laboratory", true);

        scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
        scene.sessionSlotId = 0;

        const championId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
        scene.gameData.selectedChampionId = championId;
        scene.gameData.initializeSkillTree(championId);

        scene.unshiftPhase(new SkillTreePhase(scene as any, {
            mode: SkillTreeMode.POKEMON_SELECTION,
            requiredSelections: 2,
            onComplete: (selections?: Array<{ species: number; isSignature: boolean }>) => {
                if (selections && selections.length) {
                    const active = (scene as any).gameData?.activeSkillTree;
                    if (active) {
                        active.selectedPokemonPicks = selections.map(s => ({
                            species: s.species as any,
                            isSignature: s.isSignature
                        }));
                    }
                }
                setupBattleFlow(scene, false);
            }
        }));

        super.end();
        scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.FIRST_TIME_FTL_SKILLTREE_SELECTION, true, false, 350);
    }

    private beginTutorialBattleFlow(): void {
        TitlePhase.tutorialBattlePending = false;
        TitlePhase.tutorialBattleAttempted = true;

        const scene = this.scene;

        scene.clearAllPhaseQueues();
        scene.ui.resetModeChain();
        scene.ui.clearText();
        scene.ui.fadeIn(250);

        scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
        scene.sessionSlotId = -1;
        scene.skillTreeEnabledForRun = false;

        scene.gameData.tutorialOnboardActive = true;
        scene.gameData.tutorialBattleScript = {
            step: "pending_hp_trigger",
            turnsSinceLastReward: 0,
            rewardSubstep: "idle",
            tutorialGlitchTriggered: false,
            wakeUpTriggered: false,
            voidCaptureTipTriggered: false,
            reviverSeedPendingTrigger: false,
            playerStarterSpecies: null,
            foeSpecies: null
        };

        if (scene.gameData.gender === PlayerGender.UNSET) {
            scene.gameData.gender = PlayerGender.MALE;
        }

        scene.gameData.selectedChampionId = null;

        const championId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
        scene.gameData.initializeSkillTree(championId);

        scene.unshiftPhase(new TutorialBattlePhase(scene));

        super.end();
    }

    private static deferredCutsceneConsumed = false;

    private onTitleFullyComposed(): void {
        this.scene.runDeferredBootTutorials();

        if (TitlePhase.deferredCutsceneConsumed) return;
        if (!this.shouldShowTitleCutscene()) return;
        TitlePhase.deferredCutsceneConsumed = true;
        this.scene.time.delayedCall(500, () => {
            TitlePhase.titleStoryCutsceneTriggered = true;
            this.triggerTitleCutscene();
        });
    }

    private static smitomDebugShown = false;

    private triggerSmitomTipIfNeeded(): boolean {
        const flags = this.scene.gameData.smitomTutorialFlags;
        if (DEBUG_FORCE_SMITOM_TUTORIAL && !TitlePhase.smitomDebugShown) {
            TitlePhase.smitomDebugShown = true;
            flags["title_welcome"] = false;
        }
        if (!flags["title_welcome"]) {
            this.scene.unshiftPhase(new SmitomTutorialPhase(
                this.scene,
                "title_welcome",
                i18next.t("tutorial:smitomTip.skillTree.title"),
                [
                    i18next.t("tutorial:smitomTip.skillTree.1"),
                    i18next.t("tutorial:smitomTip.skillTree.2"),
                ],
                true
            ));
            this.scene.pushPhase(new TitlePhase(this.scene, this.fromShop, true));
            this.scene.shiftPhase();
            return true;
        }
        return false;
    }

    private triggerSmitomTalks4Tip(
        tutorialKey: string,
        titleKey: string,
        textKeys: string[],
        offerReplay = true
    ): boolean {
        const flags = this.scene.gameData.smitomTutorialFlags;
        if (flags[tutorialKey]) return false;
        if (this.smitomTipShownThisVisit) return false;
        this.smitomTipShownThisVisit = true;
        this.scene.unshiftPhase(new SmitomTutorialPhase(
            this.scene,
            tutorialKey,
            i18next.t(titleKey),
            textKeys.map(k => i18next.t(k)),
            offerReplay
        ));
        const resumePhase = new TitlePhase(this.scene, this.fromShop, true);
        resumePhase.smitomTipShownThisVisit = true;
        this.scene.pushPhase(resumePhase);
        this.scene.shiftPhase();
        return true;
    }

    private showDebugCutsceneMenu(): void {
        const options: OptionSelectItem[] = [];

        const seedPowerRewards = (cutsceneId?: string) => {
            this.scene.resetRunUnlockRewards();
            const rewards: RewardConfig[] = (cutsceneId === "nightmare_century")
                ? [
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Draft Mode", gameMode: GameModes.DRAFT } as any,
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nuzlight Mode", gameMode: GameModes.NUZLIGHT } as any,
                ]
                : [
                    { type: RewardObtainedType.UNLOCK, name: "Unlock" } as any,
                    { type: RewardObtainedType.FORM, name: "smitom", isGlitch: true, unlockableSpriteType: UnlockModePokeSpriteType.GLITCH } as any,
                    { type: RewardObtainedType.QUEST_UNLOCK, name: "Quest Unlock", questSpriteId: Species.BULBASAUR, isInitialQuestUnlock: true } as any,
                    { type: RewardObtainedType.RIVAL_TO_VOID, name: "Rival To Void", rivalType: TrainerType.BLUE } as any,
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Draft Mode", gameMode: GameModes.DRAFT } as any,
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nightmare Mode", gameMode: GameModes.NIGHTMARE } as any,
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nuzlocke Mode", gameMode: GameModes.NUZLOCKE } as any,
                    { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nuzlight Mode", gameMode: GameModes.NUZLIGHT } as any,
                ];
            for (const r of rewards) {
                this.scene.recordRunUnlockReward(r);
            }
            this.scene.runUnlockRewardsShownIndex = 0;
        };

        const playCutscene = (slides: any[], bgmKey: string, mode: "default" | "rival" | "champion" | "power_only", cutsceneId?: string) => {
            const scene = this.scene;
            let currentSlideKey: string | null = null;
            let overlay: Phaser.GameObjects.Sprite | null = null;
            let championRewardScheduled: boolean = false;
            let championRewardTimer: Phaser.Time.TimerEvent | null = null;
            let flameFadeDone: boolean = false;
            let flameTextDone: boolean = false;
            let flameMinPauseDone: boolean = false;
            let flameDidAdvance: boolean = false;
            let flameMinPauseTimer: Phaser.Time.TimerEvent | null = null;
            let flameAppearTimer: Phaser.Time.TimerEvent | null = null;
            const maybeAdvanceFlame = (controller: any) => {
                if (mode !== "rival" || flameDidAdvance || currentSlideKey !== "flame") {
                    return;
                }
                if (!flameFadeDone || !flameTextDone || !flameMinPauseDone) {
                    return;
                }
                flameDidAdvance = true;
                controller.next();
            };

            const introKeys = [
                "cutscene:title_a_peace",
                "cutscene:title_a_voidbreak",
                "cutscene:title_a_voidbreak2",
                "cutscene:title_a_locked",
                "cutscene:title_a_shadows",
                "cutscene:title_a_you",
                "cutscene:title_a_choose",
                "cutscene:title_a_journey",
            ];
            const debugSlidesBase = slides.map((s, i) => ({
                ...s,
                textKey: s?.textKey ?? introKeys[Math.min(i, introKeys.length - 1)]
            }));
            const debugSlides = (mode === "default" || mode === "power_only")
                ? debugSlidesBase.map((s, i) => {
                    if (i < 3) {
                        const out = { ...s, fadeDuration: 100 };
                        if (i < 2) {
                            out.transitionCadenceMs = 1000;
                        }
                        return out;
                    }
                    return s;
                })
                : debugSlidesBase;
            const finalSlides = (mode === "champion" && debugSlides[0]?.imageKey === "unlocked")
                ? debugSlides.map((s, i) => i === 0 ? { ...s, pauseAfterText: 9999999 } : s)
                : debugSlides;

            scene.clearAllPhaseQueues();
            if (mode === "rival" || mode === "power_only") {
                seedPowerRewards(cutsceneId);
                scene.beginPowerUnlockDeferral();
            }

            scene.pushPhase(new TitlePhase(scene, this.fromShop, true));
            scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
                slides: finalSlides,
                bgmKey: bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                defaultCharSound: "ui/select",
                resumeBgmOnEnd: false,
                onSlideChange: (index, controller) => {
                    currentSlideKey = finalSlides[index]?.imageKey ?? null;
                    if (overlay) {
                        scene.tweens.killTweensOf(overlay);
                        overlay.destroy();
                        overlay = null;
                    }
                    if (championRewardTimer) {
                        championRewardTimer.remove();
                        championRewardTimer = null;
                    }
                    championRewardScheduled = false;
                    if (flameMinPauseTimer) {
                        flameMinPauseTimer.remove();
                        flameMinPauseTimer = null;
                    }
                    if (flameAppearTimer) {
                        flameAppearTimer.remove();
                        flameAppearTimer = null;
                    }
                    const container = controller.getContainer();
                    if (!container) {
                        return;
                    }
                    if (mode === "rival" && currentSlideKey === "flame") {
                        flameFadeDone = false;
                        flameTextDone = false;
                        flameMinPauseDone = false;
                        flameDidAdvance = false;
                        overlay = addCorruptedRivalOverlay(scene, container, TrainerType.BLUE);
                        if (overlay) {
                            overlay.setAlpha(1);
                            playCutsceneFaintAnim(scene, container, overlay).then(() => {
                                if (mode !== "rival" || currentSlideKey !== "flame") {
                                    return;
                                }
                                flameFadeDone = true;
                                if (flameMinPauseTimer) {
                                    flameMinPauseTimer.remove();
                                    flameMinPauseTimer = null;
                                }
                                flameMinPauseDone = false;
                                flameMinPauseTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
                                    if (mode !== "rival" || currentSlideKey !== "flame") {
                                        return;
                                    }
                                    flameMinPauseDone = true;
                                    maybeAdvanceFlame(controller);
                                });
                                maybeAdvanceFlame(controller);
                            });
                        } else {
                            flameFadeDone = true;
                            flameMinPauseDone = false;
                            flameMinPauseTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
                                if (mode !== "rival" || currentSlideKey !== "flame") {
                                    return;
                                }
                                flameMinPauseDone = true;
                                maybeAdvanceFlame(controller);
                            });
                        }
                    } else {
                        flameFadeDone = false;
                        flameTextDone = false;
                        flameMinPauseDone = false;
                        flameDidAdvance = false;
                    }
                },
                onTextComplete: (controller) => {
                    if (mode === "champion" && currentSlideKey === "unlocked" && !championRewardScheduled) {
                        championRewardScheduled = true;
                        const container = controller.getContainer();
                        const prevDepth = container?.depth ?? 0;
                        const messageHandler = scene.ui.getMessageHandler();
                        const prevMsgBgVisible = messageHandler.bg.visible;
                        const prevNameBoxVisible = messageHandler.nameBoxContainer.visible;
                        messageHandler.bg.setVisible(false);
                        messageHandler.nameBoxContainer.setVisible(false);
                        scene.ui.clearText();
                        if (container) {
                            container.setDepth(1.5);
                        }

                        const name = "Brock";
                        const rewardText = i18next.t("championSelect:characterUnlocked", { name, defaultValue: `${name}\nUNLOCKED!` });
                        const reward: RewardConfig = {
                            type: RewardObtainedType.UNLOCK,
                            name: rewardText,
                            customAtlas: "brock",
                            cutsceneStyle: true,
                        } as any;

                        championRewardTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
                            if (currentSlideKey !== "unlocked") {
                                return;
                            }
                            scene.ui.setOverlayModeForceTransition(
                                Mode.REWARD_OBTAINED,
                                {
                                    buttonActions: [
                                        () => {
                                            scene.ui.revertMode().then(() => {
                                                if (container) {
                                                    container.setDepth(prevDepth);
                                                }
                                                messageHandler.bg.setVisible(prevMsgBgVisible);
                                                messageHandler.nameBoxContainer.setVisible(prevNameBoxVisible);
                                                controller.next();
                                            });
                                        },
                                    ],
                                },
                                reward
                            );
                        });
                        return;
                    }
                    if (mode === "rival" && currentSlideKey === "flame") {
                        flameTextDone = true;
                        maybeAdvanceFlame(controller);
                    }
                    const rewardSlideKey = (cutsceneId === "nightmare_century" || cutsceneId === "nightmare_wave_400") ? "choose" : "power";
                    if (currentSlideKey === rewardSlideKey) {
                        runPowerUnlockOverlays(scene, controller);
                    }
                },
                onComplete: () => {
                    if (overlay) {
                        scene.tweens.killTweensOf(overlay);
                        overlay.destroy();
                        overlay = null;
                    }
                    if (championRewardTimer) {
                        championRewardTimer.remove();
                        championRewardTimer = null;
                    }
                    if (flameMinPauseTimer) {
                        flameMinPauseTimer.remove();
                        flameMinPauseTimer = null;
                    }
                    if (flameAppearTimer) {
                        flameAppearTimer.remove();
                        flameAppearTimer = null;
                    }
                    scene.endPowerUnlockDeferral();
                }
            }));
            super.end();
        };

        options.push({
            label: "debug_power_overlays",
            handler: () => {
                playCutscene([{ imageKey: "power", textKey: "cutscene:rival_power", pauseAfterText: 9999999 }], "evolution", "power_only");
                return true;
            }
        });

        const ids = Object.keys(STORY_CUTSCENES);
        for (const id of ids) {
            options.push({
                label: id,
                handler: () => {
                    const def: any = (STORY_CUTSCENES as any)[id];
                    const slides = def?.slides || [];
                    const bgmKey = def?.bgmKey || "evolution";
                    if (id === "rival_defeat" || id === "rival_defeat_final") {
                        playCutscene(slides, bgmKey, "rival", id);
                    } else if (id === "champion_unlock") {
                        playCutscene(slides, bgmKey, "champion", id);
                    } else {
                        const hasPower = slides.some((s: any) => s?.imageKey === "power");
                        playCutscene(slides, bgmKey, hasPower ? "power_only" : "default", id);
                    }
                    return true;
                }
            });
        }

        options.push({
            label: "debug_menu_disable",
            handler: () => {
                TitlePhase.debugCutsceneMenuDisabled = true;
                this.showOptions();
                return true;
            },
            keepOpen: true
        });

        const config: OptionSelectConfig = {
            options: options,
            maxOptions: 5,
            noCancel: true,
            yOffset: 20
        };
        this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
    }

    showOptions(): void {
        this.scene.ui.clearText();
        const options: OptionSelectItem[] = [];

        const setModeAndEnd = (gameMode: GameModes) => {
            this.gameMode = gameMode;
            this.scene.ui.resetModeChain();
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();
            this.end();
        };
        const lastSessionSlot = this.scene.gameData.getLastPlayedSessionSlot();
        if (loggedInUser && lastSessionSlot !== -1) {
            options.push({
                label: i18next.t("menu:continue"),
                handler: () => {
                    if (Overrides.SKIP_TO_STARTER_SELECT_OVERRIDE) {
                        this.beginAutoStartToStarterSelect();
                        return true;
                    }
                    this.promptRestorePointThenLoad(lastSessionSlot);
                    return true;
                }
            });
        }

        if (this.scene.gameData.testSpeciesForMod.length > 0) {
            if(this.scene.gameData.testModsCount > 0) {
                this.scene.gameData.testModsCount--;
                options.push({
                    label: i18next.t("modGlitchCreateFormUi:testMods"),
                    handler: () => {
                        setModeAndEnd(GameModes.TEST_MOD);
                        return true;
                        }
                    });
            }
            else {
                this.scene.gameData.testSpeciesForMod = [];
            }
        }
        else if(this.scene.gameData.testModsCount > 0) {
            this.scene.gameData.testModsCount = 0;
        }

        const shopNeedsRefresh = !this.scene.gameData.currentPermaShopOptions ||
        Date.now() - this.scene.gameData.lastPermaShopRefreshTime >= 10 * 60 * 1000;

        const shopButton = document.getElementById("apadShop");
        if (shopButton) {
            shopButton.dataset.activeState = shopNeedsRefresh ? "true" : "false";
        }

        options.push({
                label: i18next.t("menu:newGame"),
                handler: () => {
                    if (!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.CHAOS_AND_GAUNTLET_MODES)) {
                        this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.CHAOS_AND_GAUNTLET_MODES, true, false, 0).then(() => {
                            this.showGameModeSelection();
                        });
                        return true;
                    } else {
                        this.showGameModeSelection();
                        return true;
                    }
                }
            },
            {
                label: i18next.t("menu:loadGame"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.SAVE_SLOT, SaveSlotUiMode.LOAD,
                        (slotId: integer) => {
                            if (slotId === -1) {
                                this.scene.ui.clearText();
                                return this.showOptions();
                            }
                            this.promptRestorePointThenLoad(slotId);
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
                itemArgs: ['smitems']
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
                label: i18next.t("modGlitchCreateFormUi:wikiMods"),
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
            yOffset: 60,
            postComposeCallback: () => this.onTitleFullyComposed(),
        };
        this.scene.ui.setMode(Mode.TITLE, config);

        if (this.shouldShowTitleCutscene()) return;

        let introTutorials = [EnhancedTutorial.LEGENDARY_POKEMON_1, EnhancedTutorial.BUG_TYPES_1];
        let firstVictoryTutorials = [EnhancedTutorial.FIRST_VICTORY, EnhancedTutorial.NEW_QUESTS];
        let menuAccess = [EnhancedTutorial.MENU_ACCESS, EnhancedTutorial.STATS, EnhancedTutorial.RUN_HISTORY_1];
        let testDetails = [EnhancedTutorial.EGG_SWAP_1, EnhancedTutorial.EGGS_1, EnhancedTutorial.UNLOCK_JOURNEY];
        let v2UpdateTutorials = [
            EnhancedTutorial.POKEVOID_V2_UPDATE,
            EnhancedTutorial.FTL_MODE_SELECT,
            EnhancedTutorial.CHAMPION_SELECT_ESSENCE,
            EnhancedTutorial.SPECIAL_ESSENCES_INTRO,
            EnhancedTutorial.SPECIAL_ESSENCES_GLITCH,
            EnhancedTutorial.SPECIAL_ESSENCES_SMITTY,
            EnhancedTutorial.SKILLTREE_APOLLO_DIANA_TYPES,
            EnhancedTutorial.SKILLTREE_SET_TYPES,
            EnhancedTutorial.SKILLTREE_PROGRESSION,
            EnhancedTutorial.STARTER_SELECT_CATCH_REQUIREMENTS,
            EnhancedTutorial.STARTER_SELECT_SIGNATURE,
            EnhancedTutorial.COMMAND_UI_NEW_COMMANDS
        ];
        if(!this.fromShop) {
        if(this.fromVictoryRun && this.triggerSmitomTalks4Tip(
            "post_run_win",
            "tutorial:smitomTip.postRunWin.title",
            ["tutorial:smitomTip.postRunWin.1", "tutorial:smitomTip.postRunWin.2"]
        )) {}
        else if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
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
            this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true, 0, 1);
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.NEW_QUESTS);
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1);
        }

        else if(this.triggerSmitomTalks4Tip(
            "pokerogue",
            "tutorial:smitomTip.pokerogue.title",
            ["tutorial:smitomTip.pokerogue.1"]
        )) {}

        else if(this.scene.gameData.defeatedRivals.length > 0 && this.triggerSmitomTalks4Tip(
            "first_victory",
            "tutorial:smitomTip.firstVictory.title",
            ["tutorial:smitomTip.firstVictory.1"]
        )) {}

        else if(this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED) && this.triggerSmitomTalks4Tip(
            "unlock_journey",
            "tutorial:smitomTip.unlockJourney.title",
            ["tutorial:smitomTip.unlockJourney.1", "tutorial:smitomTip.unlockJourney.2"]
        )) {}
        else if(this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE] && this.triggerSmitomTalks4Tip(
            "the_void_unlocked",
            "tutorial:smitomTip.theVoidUnlocked.title",
            ["tutorial:smitomTip.theVoidUnlocked.1"]
        )) {}

        else if(this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN] && this.triggerSmitomTalks4Tip(
            "the_void_overtaken",
            "tutorial:smitomTip.theVoidOvertaken.title",
            ["tutorial:smitomTip.theVoidOvertaken.1"]
        )) {}
        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1)) {
            if(this.scene.gameData.uniSmittyUnlocks.length > 0) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1, true, false, 0);
            }
            else {
                this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1);
            }
        }

        else if(Utils.randSeedInt(100, 1) <= 1) {
            if(this.triggerSmitomTalks4Tip(
                "smitom",
                "tutorial:smitomTip.smitom.title",
                ["tutorial:smitomTip.smitom.1", "tutorial:smitomTip.smitom.2"]
            )) {}
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SAVING_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SAVING_1, true, false, 0);
            }
            else if(this.triggerSmitomTalks4Tip(
                "access_menu",
                "tutorial:smitomTip.accessMenu.title",
                ["tutorial:smitomTip.accessMenu.1"]
            )) {}
            else if(this.triggerSmitomTalks4Tip(
                "stats",
                "tutorial:smitomTip.stats.title",
                ["tutorial:smitomTip.stats.1"]
            )) {}
            else if(this.triggerSmitomTalks4Tip(
                "run_history",
                "tutorial:smitomTip.runHistory.title",
                ["tutorial:smitomTip.runHistory.1", "tutorial:smitomTip.runHistory.2"]
            )) {}
            else if(this.triggerSmitomTalks4Tip(
                "rival_quests",
                "tutorial:smitomTip.rivalQuests.title",
                ["tutorial:smitomTip.rivalQuests.1"]
            )) {}
            else if(this.triggerSmitomTalks4Tip(
                "new_forms",
                "tutorial:smitomTip.newForms.title",
                ["tutorial:smitomTip.newForms.1", "tutorial:smitomTip.newForms.2", "tutorial:smitomTip.newForms.3", "tutorial:smitomTip.newForms.4"]
            )) {}
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.ABILITIES_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.ABILITIES_1, true, false, 0);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.GLITCH_FORMS_1)) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.GLITCH_FORMS_1, true, false, 0);
            }
            else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.SMITTY_FORMS_1) && this.scene.gameData.uniSmittyUnlocks.length > 0) {
                this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.SMITTY_FORMS_1, true, false, 0);
            }
            else if(this.scene.gameData.gameStats.playTime >= 30 * 3600 && this.triggerSmitomTalks4Tip(
                "thank_you",
                "tutorial:smitomTip.thankYou.title",
                ["tutorial:smitomTip.thankYou.1", "tutorial:smitomTip.thankYou.2"]
            )) {}
            else if(this.triggerSmitomTalks4Tip(
                "discord",
                "tutorial:smitomTip.discord.title",
                ["tutorial:smitomTip.discord.1"]
            )) {}
        }

        }
    }

    private openManageData(): void {
        const menuHandler = this.scene.ui.handlers[Mode.MENU] as MenuUiHandler;
        const config = menuHandler.getManageDataConfig();
        this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
    }

    private showGameModeSelection(): void {
        const startTypeOptions = [
            {
                label: i18next.t("menu:chaos"),
                handler: () => {
                    this.scene.gameData.selectedChampionId = undefined;
                    this.showChaosModes();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:chaosDescription"));
                }
            },
            {
                label: i18next.t("menu:gauntlet"),
                handler: () => {
                    this.scene.gameData.selectedChampionId = undefined;
                    this.showGauntletModes();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:gauntletDescription"));
                }
            },
            {
                label: i18next.t("menu:manageSaves"),
                handler: () => {
                    this.openManageData();
                    return true;
                },
                keepOpen: true,
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:manageSavesDescription"));
                }
            },
            {
                label: i18next.t("menu:cancel"),
                handler: () => {
                    this.scene.ui.hideMessageChrome();
                    this.scene.clearPhaseQueue();
                    this.scene.pushPhase(new TitlePhase(this.scene, false, true));
                    super.end();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:selectGameMode"));
                }
            }
        ];

        this.scene.ui.ensureMessageVisibleForOverlay();
        this.scene.ui.showText(i18next.t("menu:choosePath"), null, () =>
            this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {
                options: startTypeOptions,
                supportHover: true
            })
        );
    }

    loadSaveSlot(slotId: integer): void {
        this.scene.sessionSlotId = slotId > -1 || !loggedInUser ? slotId : loggedInUser.lastSessionSlot;
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.resetModeChain();
        this.scene.gameData.loadSession(this.scene, slotId, slotId === -1 ? this.lastSessionData : undefined).then((success: boolean) => {
            if (success) {
                this.loaded = true;
                this.scene.gameData.ensureActiveSkillTreeOnLegacyLoad(this.scene);
                this.scene.ui.showText(i18next.t("menu:sessionSuccess"), null, () => this.end());
            } else {
                this.end();
            }
        }).catch(err => {
            console.error(err);
            this.scene.ui.showText(i18next.t("menu:failedToLoadSession"), null);
        });
    }

    promptRestorePointThenLoad(slotId: integer): void {
        const gd = this.scene.gameData;
        const hasPrimary = gd.checkSessionExists(slotId);
        const hasBattle = gd.hasBattleCheckpoint(slotId);

        if (hasPrimary && hasBattle) {
            if (this.scene.loadBattleFromMode === 1) {
                this.loadSaveSlot(slotId);
                return;
            }
            const ui = this.scene.ui;
            ui.setMode(Mode.MESSAGE);
            ui.resetModeChain();
            ui.showText(i18next.t("menu:selectSavePoint"), null, () =>
                ui.setOverlayMode(Mode.OPTION_SELECT, {
                    options: [
                        {
                            label: i18next.t("settings:atTurnStart"),
                            handler: () => {
                                ui.revertMode();
                                ui.clearText();
                                this.loadSaveSlot(slotId);
                                return true;
                            }
                        },
                        {
                            label: i18next.t("settings:atBattleStart"),
                            handler: () => {
                                ui.revertMode();
                                ui.clearText();
                                this.loadBattleCheckpoint(slotId);
                                return true;
                            }
                        },
                        {
                            label: i18next.t("menu:manageSaves"),
                            handler: () => {
                                this.openManageData();
                                return true;
                            },
                            keepOpen: true
                        },
                        {
                            label: i18next.t("menu:cancel"),
                            handler: () => {
                                ui.clearText();
                                this.showOptions();
                                return true;
                            }
                        }
                    ],
                    supportHover: true
                })
            );
            return;
        }

        if (hasPrimary) {
            this.loadSaveSlot(slotId);
        } else if (hasBattle) {
            this.loadBattleCheckpoint(slotId);
        }
    }

    loadBattleCheckpoint(slotId: integer): void {
        const data = this.scene.gameData.getBattleCheckpointData(slotId);
        if (!data) {
            this.loadSaveSlot(slotId);
            return;
        }
        this.scene.sessionSlotId = slotId;
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.resetModeChain();
        this.scene.gameData.loadSession(this.scene, slotId, data).then((success: boolean) => {
            if (success) {
                this.loaded = true;
                this.scene.gameData.ensureActiveSkillTreeOnLegacyLoad(this.scene);
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
                this.scene.pushPhase(new TitlePhase(this.scene, false, true));
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
                    this.scene.moveUpgradesEnabledForRun = !this.scene.disableMoveUpgrades;
                    this.scene.statSwitchersEnabledForRun = !this.scene.disableStatSwitchers;
                    this.scene.releaseItemsEnabledForRun = !this.scene.disableReleaseItems;
                    this.scene.ivScannerEnabledForRun = !this.scene.disableIvScanner;
                    this.scene.mapEnabledForRun = !this.scene.disableMap;
                    this.scene.duelmonsEnabledForRun = !this.scene.disableDuelmons;
                    this.scene.wave35UnlockedThisRun = false;
                    this.scene.resetRunEndSummaryRunData();
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
        if (this.debugModeActive) {
            super.end();
            return;
        }

        if (this.gameMode === GameModes.SHOP) {
            this.scene.gameMode = getGameMode(this.gameMode);
            this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
            super.end();
            return;
        }

        if (this.gameMode === GameModes.TEST_MOD) {
            this.scene.gameMode = getGameMode(this.gameMode);
            this.scene.sessionSlotId = -1;
            this.scene.newArena(this.scene.gameMode.getStartingBiome(this.scene));
            setupFixedBattles(this.scene);
            this.scene.money = this.scene.gameMode.getStartingMoney();
            this.scene.pushPhase(new SelectDraftPhase(this.scene, true));
            this.scene.pushPhase(new EncounterPhase(this.scene, false));
            super.end();
            return;
        }

        if (!this.loaded && !this.scene.gameMode.isDaily && !this.scene.gameData.selectedChampionId) {
            this.scene.arena.preloadBgm();
            this.scene.gameMode = getGameMode(this.gameMode);

            this.scene.gameMechanicTracking[GameMechanicsID.CHAMPION_MODE] = GameMechanicsVersion.CHAMPION_V1;

            this.initializeChampionMode(() => {
            });
        } else {
            this.scene.playBgm();
            if (this.scene.gameMode.isChaosMode) {

                if (!this.loaded && this.scene.battlePathWave === 1) {
                    this.scene.gameData.resetBattlePathData();
                    resetBattlePathGlobalState();
                }

                const startWave = this.scene.battlePathWave > 1000 ? Math.floor(this.scene.battlePathWave / 1000) * 1000 + 1 : 1;

                if (!this.scene.gameData.battlePath || !getCurrentBattlePath()) {
                    setupFixedBattlePaths(this.scene, startWave);
                } else {
                    const reconstructedPath = reconstructBattlePathFromLayers(this.scene.gameData.battlePath);
                    setCurrentBattlePath(reconstructedPath);
                    this.scene.gameData.battlePath = reconstructedPath;
                }

                const enemyParty = this.scene.getEnemyParty();
                const hasActiveBattle = this.scene.currentBattle && (enemyParty && enemyParty.filter(p => !p.isFainted()).length > 0);

                if (hasActiveBattle) {
                    this.scene.pushPhase(new EncounterPhase(this.scene, true));
                } else {
                    this.scene.pushPhase(new BattlePathPhase(this.scene));
                }

            } else {
                if (this.scene.gameMode.isNightmare) {
                    setupNightmareFixedBattles(this.scene);
                } else {
                    setupFixedBattles(this.scene);
                }
                this.scene.pushPhase(new EncounterPhase(this.scene, true));
            }

        }
        super.end();
    }

    private initializeChampionMode(onReady: (availableStarters: Species[]) => void): void {
        this.scene.gameData.selectedChampionId = undefined;
        ChampionModeIntegration.initializeChampionSelection(this.scene, this.gameMode, {
            onChampionReady: (_championId: string, availableStarters: Species[]) => {
                onReady(availableStarters);
            }
        });
    }
    private showGauntletModes(): void {
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

        if(this.scene.gameData.unlocks[Unlockables.NUZLIGHT_DRAFT_MODE] || this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            availableModes.push(GameModes.NUZLIGHT_DRAFT);
        }

        if(this.scene.gameData.unlocks[Unlockables.NUZLOCKE_DRAFT_MODE] || this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            availableModes.push(GameModes.NUZLOCKE_DRAFT);
        }

        const modesToShow = [GameModes.DRAFT, GameModes.CLASSIC, GameModes.NUZLIGHT, GameModes.NUZLOCKE];

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED) || this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            modesToShow.push(GameModes.NUZLIGHT_DRAFT);
        }

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED) || this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            modesToShow.push(GameModes.NUZLOCKE_DRAFT);
        }

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
            modesToShow.push(GameModes.NIGHTMARE);
        }

        const setModeAndEnd = (gameMode: GameModes) => {
            this.gameMode = gameMode;
            this.scene.ui.resetModeChain();
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();
            this.end();
        };

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
                this.scene.ui.clearText();
                this.showOptions();
                return true;
            },
            onHover: () => {
                this.scene.ui.showText(i18next.t("menu:selectGameMode"));
            }
        });

        this.scene.ui.revertMode().then(() => {
            this.scene.ui.showText(availableModes.length > 0 ? this.getModeDescription(availableModes[0]) : i18next.t("menu:selectGameMode"), null, () =>
                this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {
                    options: modeOptions,
                    supportHover: true
                })
            );
        });
    }

    private showChaosModes(): void {
        const proceed = () => {
            if (this.scene.gameData.isNewPlayer) {
                this.showNewPlayerChaosModes();
                return;
            }
            this.showExistingPlayerChaosModes();
        };

        const hasWonAnySession = (this.scene.gameData.gameStats.sessionsWon || 0) > 0;

        if (!hasWonAnySession) {
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.FTL_MODE_SELECT);
            proceed();
            return;
        }
        proceed();
    }

    private showNewPlayerChaosModes(): void {
        const availableModes = this.getAvailableChaosModeCategories();
        const modesToShow = this.getChaosModeCategoriesToShow();

        const modeOptions = modesToShow.map(baseModeKey => {
            const isAvailable = availableModes.includes(baseModeKey);
            return {
                label: isAvailable ? GameMode.getChaosBaseName(baseModeKey) : "???",
                handler: () => {
                    if (isAvailable) {
                        this.handleNewPlayerModeSelection(baseModeKey);
                        return true;
                    }
                    return false;
                },
                onHover: () => {
                    if (isAvailable) {
                        this.scene.ui.showText(this.getModeDescription(this.getFTLVariant(baseModeKey)));
                    } else {
                        this.scene.ui.showText(this.getChaosUnlockHint(baseModeKey));
                    }
                }
            };
        });

        const firstAvailable = availableModes.length > 0 ? availableModes[0] : null;
        this.showModeSelectionUI(modeOptions, firstAvailable ? this.getModeDescription(this.getFTLVariant(firstAvailable)) : i18next.t("menu:selectChaosMode"));
    }

    private handleNewPlayerModeSelection(baseModeKey: string): void {
        const hasCompletedFTL = this.hasCompletedFTLMode(baseModeKey);
        const hasCompletedShort = this.hasCompletedShortMode(baseModeKey);
        const hasCompletedLong = this.hasCompletedLongMode(baseModeKey);

        if (hasCompletedShort || hasCompletedFTL || hasCompletedLong) {
            this.showMidnightAbyssFTLChoice(baseModeKey);
        } else {
            this.gameMode = this.getFTLVariant(baseModeKey);
            this.scene.ui.resetModeChain();
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();
            this.end();

        }
    }

    private showExistingPlayerChaosModes(): void {
        const availableModes = this.getAvailableChaosModeCategories();
        const modesToShow = this.getChaosModeCategoriesToShow();

        const modeOptions = modesToShow.map(baseModeKey => {
            const isAvailable = availableModes.includes(baseModeKey);
            const hasCompletedFTL = this.hasCompletedFTLMode(baseModeKey);
            const hasCompletedShort = this.hasCompletedShortMode(baseModeKey);
            const hasCompletedLong = this.hasCompletedLongMode(baseModeKey);
            return {
                label: isAvailable ? GameMode.getChaosBaseName(baseModeKey) : "???",
                handler: () => {
                    if (isAvailable) {
                        if (hasCompletedShort || hasCompletedFTL || hasCompletedLong) {
                            this.showMidnightAbyssFTLChoice(baseModeKey);
                        } else {
                            this.gameMode = this.getFTLVariant(baseModeKey);
                            this.scene.ui.resetModeChain();
                            this.scene.ui.setMode(Mode.MESSAGE);
                            this.scene.ui.clearText();
                            this.end();
                        }
                        return true;
                    }
                    return false;
                },
                onHover: () => {
                    if (isAvailable) {
                        this.scene.ui.showText(this.getModeDescription(this.getFTLVariant(baseModeKey)));
                    } else {
                        this.scene.ui.showText(this.getChaosUnlockHint(baseModeKey));
                    }
                }
            };
        });

        const firstAvailable = availableModes.length > 0 ? availableModes[0] : null;
        this.showModeSelectionUI(modeOptions, firstAvailable ? this.getModeDescription(this.getFTLVariant(firstAvailable)) : i18next.t("menu:selectChaosMode"));
    }

    private showMidnightAbyssFTLChoice(baseModeKey: string): void {
        const ftlMode = this.getFTLVariant(baseModeKey);
        const shortMode = this.getShortVariant(baseModeKey);
        const longMode = this.getLongVariant(baseModeKey);
        const modeName = GameMode.getChaosBaseName(baseModeKey);
        const hasWonShort = this.hasCompletedShortMode(baseModeKey);
        const hasWonLong = this.hasCompletedLongMode(baseModeKey);
        const hasWonFTL = this.hasCompletedFTLMode(baseModeKey);

        const variantOptions = [
            {
                label: i18next.t("menu:ftl", { mode: modeName }),
                handler: () => {
                    this.gameMode = ftlMode;
                    this.scene.ui.resetModeChain();
                    this.scene.ui.setMode(Mode.MESSAGE);
                    this.scene.ui.clearText();
                    this.end();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:ftlDescription", { mode: modeName }));
                }
            },
            {
                label: i18next.t("menu:midnight", { mode: modeName }),
                handler: () => {
                    this.gameMode = shortMode;
                    this.scene.ui.resetModeChain();
                    this.scene.ui.setMode(Mode.MESSAGE);
                    this.scene.ui.clearText();
                    this.end();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:midnightDescription", { mode: modeName }));
                }
            }
        ];

        if (hasWonShort || hasWonLong || hasWonFTL) {
            variantOptions.push({
                label: i18next.t("menu:abyss", { mode: modeName }),
                handler: () => {
                    this.gameMode = longMode;
                    this.scene.ui.resetModeChain();
                    this.scene.ui.setMode(Mode.MESSAGE);
                    this.scene.ui.clearText();
                    this.end();
                    return true;
                },
                onHover: () => {
                    this.scene.ui.showText(i18next.t("menu:abyssDescription", { mode: modeName }));
                }
            });
        }

        this.showModeSelectionUI(variantOptions, i18next.t("menu:ftlDescription", { mode: modeName }));
    }

    private hasCompletedShortMode(baseModeKey: string): boolean {
        const stats = this.scene.gameData.gameStats;

        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return stats.chaosRogueShortSessionsWon > 0;
            case "CHAOS_JOURNEY":
                return stats.chaosJourneyShortSessionsWon > 0;
            case "CHAOS_NUZLIGHT":
                return stats.chaosNuzlightShortSessionsWon > 0;
            case "CHAOS_NUZLOCKE":
                return stats.chaosNuzlockeShortSessionsWon > 0;
            case "CHAOS_NUZLIGHT_DRAFT":
                return stats.chaosNuzlightDraftShortSessionsWon > 0;
            case "CHAOS_NUZLOCKE_DRAFT":
                return stats.chaosNuzlockeDraftShortSessionsWon > 0;
            case "CHAOS_VOID":
                return stats.chaosVoidShortSessionsWon > 0;
            case "CHAOS_ROGUE_VOID":
                return stats.chaosRogueVoidShortSessionsWon > 0;
            default:
                return false;
        }
    }

    private hasCompletedFTLMode(baseModeKey: string): boolean {
        const stats = this.scene.gameData.gameStats;

        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return stats.chaosRogueFTLSessionsWon > 0;
            case "CHAOS_JOURNEY":
                return stats.chaosJourneyFTLSessionsWon > 0;
            case "CHAOS_NUZLIGHT":
                return stats.chaosNuzlightFTLSessionsWon > 0;
            case "CHAOS_NUZLOCKE":
                return stats.chaosNuzlockeFTLSessionsWon > 0;
            case "CHAOS_NUZLIGHT_DRAFT":
                return stats.chaosNuzlightDraftFTLSessionsWon > 0;
            case "CHAOS_NUZLOCKE_DRAFT":
                return stats.chaosNuzlockeDraftFTLSessionsWon > 0;
            case "CHAOS_VOID":
                return stats.chaosVoidFTLSessionsWon > 0;
            case "CHAOS_ROGUE_VOID":
                return stats.chaosRogueVoidFTLSessionsWon > 0;
            default:
                return false;
        }
    }

    private hasCompletedLongMode(baseModeKey: string): boolean {
        const stats = this.scene.gameData.gameStats;

        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return stats.chaosRogueSessionsWon > 0;
            case "CHAOS_JOURNEY":
                return stats.chaosJourneySessionsWon > 0;
            case "CHAOS_NUZLIGHT":
                return stats.chaosNuzlightSessionsWon > 0;
            case "CHAOS_NUZLOCKE":
                return stats.chaosNuzlockeSessionsWon > 0;
            case "CHAOS_NUZLIGHT_DRAFT":
                return stats.chaosNuzlightDraftSessionsWon > 0;
            case "CHAOS_NUZLOCKE_DRAFT":
                return stats.chaosNuzlockeDraftSessionsWon > 0;
            case "CHAOS_VOID":
                return stats.chaosVoidSessionsWon > 0;
            case "CHAOS_ROGUE_VOID":
                return stats.chaosRogueVoidSessionsWon > 0;
            default:
                return false;
        }
    }

    private getAvailableChaosModeCategories(): string[] {
        const categories = ["CHAOS_ROGUE"];

        if (this.scene.gameData.unlocks[Unlockables.CHAOS_JOURNEY_MODE]) {
            categories.push("CHAOS_JOURNEY");
        }

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
            categories.push("CHAOS_NUZLIGHT");
            categories.push("CHAOS_NUZLIGHT_DRAFT");
        }

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
            categories.push("CHAOS_NUZLOCKE");
            categories.push("CHAOS_NUZLOCKE_DRAFT");
        }

        if (this.scene.gameData.unlocks[Unlockables.CHAOS_VOID_MODE]) {
            categories.push("CHAOS_VOID");
        }

        if (this.scene.gameData.unlocks[Unlockables.CHAOS_ROGUE_VOID_MODE]) {
            categories.push("CHAOS_ROGUE_VOID");
        }

        if (this.scene.gameData.unlocks[Unlockables.CHAOS_INFINITE_MODE]) {
            categories.push("CHAOS_INFINITE");
        }

        if (this.scene.gameData.unlocks[Unlockables.CHAOS_INFINITE_ROGUE_MODE]) {
            categories.push("CHAOS_INFINITE_ROGUE");
        }

        return categories;
    }

    private getChaosModeCategoriesToShow(): string[] {
        const modesToShow = ["CHAOS_ROGUE", "CHAOS_JOURNEY"];

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
            modesToShow.push("CHAOS_NUZLIGHT");
            modesToShow.push("CHAOS_NUZLIGHT_DRAFT");
        }

        if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
            modesToShow.push("CHAOS_NUZLOCKE");
            modesToShow.push("CHAOS_NUZLOCKE_DRAFT");
        }

        if (this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
            modesToShow.push("CHAOS_VOID");
            if (this.scene.gameData.gameStats.nightmareSessionsWon >= 1) {
                modesToShow.push("CHAOS_ROGUE_VOID");
            }
            if (this.scene.gameData.gameStats.chaosJourneySessionsWon >= 1) {
                modesToShow.push("CHAOS_INFINITE");
            }
            if (this.scene.gameData.gameStats.chaosRogueVoidSessionsWon >= 1) {
                modesToShow.push("CHAOS_INFINITE_ROGUE");
            }
        }

        return modesToShow;
    }

    private getShortVariant(baseModeKey: string): GameModes {
        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return GameModes.CHAOS_ROGUE_SHORT;
            case "CHAOS_JOURNEY":
                return GameModes.CHAOS_JOURNEY_SHORT;
            case "CHAOS_NUZLIGHT":
                return GameModes.CHAOS_NUZLIGHT_SHORT;
            case "CHAOS_NUZLOCKE":
                return GameModes.CHAOS_NUZLOCKE_SHORT;
            case "CHAOS_NUZLIGHT_DRAFT":
                return GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT;
            case "CHAOS_NUZLOCKE_DRAFT":
                return GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT;
            case "CHAOS_VOID":
                return GameModes.CHAOS_VOID_SHORT;
            case "CHAOS_ROGUE_VOID":
                return GameModes.CHAOS_ROGUE_VOID_SHORT;
            default:
                return GameModes.CHAOS_ROGUE_SHORT;
        }
    }

    private getFTLVariant(baseModeKey: string): GameModes {
        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return GameModes.CHAOS_ROGUE_FTL;
            case "CHAOS_JOURNEY":
                return GameModes.CHAOS_JOURNEY_FTL;
            case "CHAOS_NUZLIGHT":
                return GameModes.CHAOS_NUZLIGHT_FTL;
            case "CHAOS_NUZLOCKE":
                return GameModes.CHAOS_NUZLOCKE_FTL;
            case "CHAOS_NUZLIGHT_DRAFT":
                return GameModes.CHAOS_NUZLIGHT_DRAFT_FTL;
            case "CHAOS_NUZLOCKE_DRAFT":
                return GameModes.CHAOS_NUZLOCKE_DRAFT_FTL;
            case "CHAOS_VOID":
                return GameModes.CHAOS_VOID_FTL;
            case "CHAOS_ROGUE_VOID":
                return GameModes.CHAOS_ROGUE_VOID_FTL;
            case "CHAOS_INFINITE":
                return GameModes.CHAOS_INFINITE;
            case "CHAOS_INFINITE_ROGUE":
                return GameModes.CHAOS_INFINITE_ROGUE;
            default:
                return GameModes.CHAOS_ROGUE_FTL;
        }
    }

    private getLongVariant(baseModeKey: string): GameModes {
        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return GameModes.CHAOS_ROGUE;
            case "CHAOS_JOURNEY":
                return GameModes.CHAOS_JOURNEY;
            case "CHAOS_NUZLIGHT":
                return GameModes.CHAOS_NUZLIGHT;
            case "CHAOS_NUZLOCKE":
                return GameModes.CHAOS_NUZLOCKE;
            case "CHAOS_NUZLIGHT_DRAFT":
                return GameModes.CHAOS_NUZLIGHT_DRAFT;
            case "CHAOS_NUZLOCKE_DRAFT":
                return GameModes.CHAOS_NUZLOCKE_DRAFT;
            case "CHAOS_VOID":
                return GameModes.CHAOS_VOID;
            case "CHAOS_ROGUE_VOID":
                return GameModes.CHAOS_ROGUE_VOID;
            case "CHAOS_INFINITE":
                return GameModes.CHAOS_INFINITE;
            case "CHAOS_INFINITE_ROGUE":
                return GameModes.CHAOS_INFINITE_ROGUE;
            default:
                return GameModes.CHAOS_ROGUE;
        }
    }

    private showModeSelectionUI(options: any[], headerText: string): void {
        options.push({
            label: i18next.t("menu:cancel"),
            handler: () => {
                this.scene.ui.hideMessageChrome();
                this.scene.ui.clearText();
                this.showOptions();
                return true;
            },
            onHover: () => {
                this.scene.ui.showText(i18next.t("menu:selectGameMode"));
            }
        });

        this.scene.ui.revertMode().then(() => {
            this.scene.ui.ensureMessageVisibleForOverlay();
            this.scene.ui.showText(headerText, null, () =>
                this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {
                    options: options,
                    supportHover: true
                })
            );
        });
    }

    private getModeDescription(mode: GameModes): string {
        switch (mode) {
            case GameModes.DRAFT:
                return i18next.t("menu:selectRogueMode");
            case GameModes.CHAOS_ROGUE:
                return i18next.t("menu:selectChaosRogueMode");
            case GameModes.CLASSIC:
                return i18next.t("menu:selectJourneyMode");
            case GameModes.CHAOS_JOURNEY:
                return i18next.t("menu:selectChaosJourneyMode");
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
            case GameModes.CHAOS_VOID:
                return i18next.t("menu:selectChaosVoidMode");
            case GameModes.CHAOS_ROGUE_VOID:
                return i18next.t("menu:selectChaosRogueVoidMode");
            case GameModes.CHAOS_INFINITE:
                return i18next.t("menu:selectChaosInfiniteMode");
            case GameModes.CHAOS_INFINITE_ROGUE:
                return i18next.t("menu:selectChaosInfiniteRogueMode");
            case GameModes.CHAOS_NUZLIGHT:
                return i18next.t("menu:selectChaosNuzlightMode");
            case GameModes.CHAOS_NUZLOCKE:
                return i18next.t("menu:selectChaosNuzlockeMode");
            case GameModes.CHAOS_NUZLIGHT_DRAFT:
                return i18next.t("menu:selectChaosNuzlightDraftMode");
            case GameModes.CHAOS_NUZLOCKE_DRAFT:
                return i18next.t("menu:selectChaosNuzlockeDraftMode");
            case GameModes.CHAOS_ROGUE_SHORT:
                return i18next.t("menu:selectChaosRogueMode");
            case GameModes.CHAOS_JOURNEY_SHORT:
                return i18next.t("menu:selectChaosJourneyMode");
            case GameModes.CHAOS_VOID_SHORT:
                return i18next.t("menu:selectChaosVoidMode");
            case GameModes.CHAOS_ROGUE_VOID_SHORT:
                return i18next.t("menu:selectChaosRogueVoidMode");
            case GameModes.CHAOS_NUZLIGHT_SHORT:
                return i18next.t("menu:selectChaosNuzlightMode");
            case GameModes.CHAOS_NUZLOCKE_SHORT:
                return i18next.t("menu:selectChaosNuzlockeMode");
            case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
                return i18next.t("menu:selectChaosNuzlightDraftMode");
            case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
                return i18next.t("menu:selectChaosNuzlockeDraftMode");
            case GameModes.CHAOS_ROGUE_FTL:
                return i18next.t("menu:selectChaosRogueMode");
            case GameModes.CHAOS_JOURNEY_FTL:
                return i18next.t("menu:selectChaosJourneyMode");
            case GameModes.CHAOS_VOID_FTL:
                return i18next.t("menu:selectChaosVoidMode");
            case GameModes.CHAOS_ROGUE_VOID_FTL:
                return i18next.t("menu:selectChaosRogueVoidMode");
            case GameModes.CHAOS_NUZLIGHT_FTL:
                return i18next.t("menu:selectChaosNuzlightMode");
            case GameModes.CHAOS_NUZLOCKE_FTL:
                return i18next.t("menu:selectChaosNuzlockeMode");
            case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
                return i18next.t("menu:selectChaosNuzlightDraftMode");
            case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
                return i18next.t("menu:selectChaosNuzlockeDraftMode");
            default:
                return "";
        }
    }

    private getUnlockHint(mode: GameModes, availableModes: GameModes[]): string {
        const gd = this.scene.gameData;
        switch (mode) {
            case GameModes.CLASSIC:
                return i18next.t("menu:unlockHintClassic");
            case GameModes.NUZLIGHT:
                return i18next.t("menu:unlockHintNuzlight");
            case GameModes.NUZLOCKE:
                return i18next.t("menu:unlockHintNuzlocke");
            case GameModes.NIGHTMARE:
                return i18next.t("menu:unlockHintVoid");
            case GameModes.NUZLIGHT_DRAFT: {
                const raw = Math.max(
                    gd.gameStats.nuzlightSessionsWon || 0,
                    gd.gameStats.chaosNuzlightSessionsWon || 0,
                    gd.gameStats.chaosNuzlightShortSessionsWon || 0
                );
                const cur = Math.min(raw, 2);
                return `${i18next.t("menu:unlockHintNuzlightDraft")} (${cur}/2)`;
            }
            case GameModes.NUZLOCKE_DRAFT: {
                const raw = Math.max(
                    gd.gameStats.nuzlockeSessionsWon || 0,
                    gd.gameStats.chaosNuzlockeSessionsWon || 0,
                    gd.gameStats.chaosNuzlockeShortSessionsWon || 0
                );
                const cur = Math.min(raw, 2);
                return `${i18next.t("menu:unlockHintNuzlockeDraft")} (${cur}/2)`;
            }
            default:
                return "???";
        }
    }

    private hasWonChaosMode(baseModeKey: string): boolean {
        const stats = this.scene.gameData.gameStats;

        switch (baseModeKey) {
            case "CHAOS_ROGUE":
                return stats.chaosRogueSessionsWon > 0 || stats.chaosRogueShortSessionsWon > 0 || stats.chaosRogueFTLSessionsWon > 0;
            case "CHAOS_JOURNEY":
                return stats.chaosJourneySessionsWon > 0 || stats.chaosJourneyShortSessionsWon > 0 || stats.chaosJourneyFTLSessionsWon > 0;
            case "CHAOS_NUZLIGHT":
                return stats.chaosNuzlightSessionsWon > 0 || stats.chaosNuzlightShortSessionsWon > 0 || stats.chaosNuzlightFTLSessionsWon > 0;
            case "CHAOS_NUZLOCKE":
                return stats.chaosNuzlockeSessionsWon > 0 || stats.chaosNuzlockeShortSessionsWon > 0 || stats.chaosNuzlockeFTLSessionsWon > 0;
            case "CHAOS_NUZLIGHT_DRAFT":
                return stats.chaosNuzlightDraftSessionsWon > 0 || stats.chaosNuzlightDraftShortSessionsWon > 0 || stats.chaosNuzlightDraftFTLSessionsWon > 0;
            case "CHAOS_NUZLOCKE_DRAFT":
                return stats.chaosNuzlockeDraftSessionsWon > 0 || stats.chaosNuzlockeDraftShortSessionsWon > 0 || stats.chaosNuzlockeDraftFTLSessionsWon > 0;
            case "CHAOS_VOID":
                return stats.chaosVoidSessionsWon > 0 || stats.chaosVoidShortSessionsWon > 0 || stats.chaosVoidFTLSessionsWon > 0;
            case "CHAOS_ROGUE_VOID":
                return stats.chaosRogueVoidSessionsWon > 0 || stats.chaosRogueVoidShortSessionsWon > 0 || stats.chaosRogueVoidFTLSessionsWon > 0;
            case "CHAOS_INFINITE":
                return stats.chaosInfiniteSessionsWon > 0;
            case "CHAOS_INFINITE_ROGUE":
                return stats.chaosInfiniteRogueSessionsWon > 0;
            default:
                return false;
        }
    }

    private getChaosUnlockHint(baseModeKey?: string): string {
        if (baseModeKey) {
            switch (baseModeKey) {
                case "CHAOS_ROGUE":
                    return i18next.t("menu:unlockHintChaosRogue");
                case "CHAOS_JOURNEY":
                    return i18next.t("menu:unlockHintChaosJourney");
                case "CHAOS_VOID":
                    return i18next.t("menu:unlockHintChaosVoid");
                case "CHAOS_ROGUE_VOID":
                    return i18next.t("menu:unlockHintChaosRogueVoid");
                case "CHAOS_INFINITE":
                    return i18next.t("menu:unlockHintChaosInfinite");
                case "CHAOS_INFINITE_ROGUE":
                    return i18next.t("menu:unlockHintChaosInfiniteRogue");
                default:
                    return "???";
            }
        }

        const nuzlightUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
        const nuzlockeUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
        const nuzlightDraftUnlocked = this.scene.gameData.gameStats.nuzlightSessionsWon >= 2;
        const nuzlockeDraftUnlocked = this.scene.gameData.gameStats.nuzlockeSessionsWon >= 2;
        const nightmareUnlocked = this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE];

        if (!nuzlightDraftUnlocked && !nuzlockeUnlocked) {
            return i18next.t("menu:unlockHintChaos1");
        } else if (nuzlightDraftUnlocked && !nuzlockeDraftUnlocked) {
            return i18next.t("menu:unlockHintChaos2");
        } else if (nuzlockeUnlocked || nightmareUnlocked) {
            return i18next.t("menu:unlockHintChaos3");
        }

        return "???";
    }

    private isChaosUnlocked(): boolean {
        return true;
        const nuzlightUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
        const nuzlockeUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
        const nuzlightDraftUnlocked = this.scene.gameData.gameStats.nuzlightSessionsWon >= 2;
        const nuzlockeDraftUnlocked = this.scene.gameData.gameStats.nuzlockeSessionsWon >= 2;
        const nightmareUnlocked = this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE];

        if (!nuzlightDraftUnlocked && !nuzlockeUnlocked) {
            return this.scene.gameData.gameStats.draftSessionsWon >= 3 || this.scene.gameData.gameStats.nuzlightSessionsWon >= 1;
        } else if (nuzlightDraftUnlocked && !nuzlockeDraftUnlocked) {
            return this.scene.gameData.gameStats.nuzlightDraftSessionsWon >= 2 || this.scene.gameData.gameStats.nuzlockeSessionsWon >= 1;
        } else if (nuzlockeUnlocked || nightmareUnlocked) {
            return this.scene.gameData.gameStats.nuzlockeSessionsWon >= 2 || this.scene.gameData.gameStats.nuzlockeDraftSessionsWon >= 1;
        }

        return false;
    }

    private debugMistySkillTree(): void {

        this.debugModeActive = true;

        const USE_POKEMON_SELECTION_MODE = false;
        const USE_ENHANCED_DEBUG_MODE = false;
        const DEBUG_SKILL_POINTS = 1000;
        const DEBUG_MAX_DEPTH = 10;

        try {
            const championId = "misty";
            this.scene.gameData.selectedChampionId = championId;

            const manager = ChampionManager.initialize(this.scene.gameData);
            const mistyData = manager.getChampionData(championId);

            const activeSkillTree = this.scene.gameData.initializeSkillTree(championId);

            if (USE_ENHANCED_DEBUG_MODE) {
                activeSkillTree.skillPoints = DEBUG_SKILL_POINTS;
                activeSkillTree.maxVisibleDepth = DEBUG_MAX_DEPTH;
                activeSkillTree.tokens = 100;
            } else {
                activeSkillTree.maxVisibleDepth = 3;
            }
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();

            const debugModeFunc = () => {
                if(true) {
                    const party = this.scene.getParty();
                    const onixPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(Species.STARYU), 30, undefined, undefined, undefined, false);
                    onixPokemon.setVisible(false);
                    party.push(onixPokemon);
                    onixPokemon.loadAssets();

                    const signatureBuild = POKEMON_ALT_BUILDS[PokemonAltBuildId.STARYU_CHRONOS_GEAR];
                    if (signatureBuild) {
                    const modifier = new PokemonAltBuildModifier(
                        null,
                        onixPokemon.id,
                        { ...signatureBuild, rank: 9 }
                    );
                    modifier.applyAltBuildToPokemon(onixPokemon);
                    this.scene.unshiftPhase(new SkillTreePhase(this.scene, {
                                    mode: SkillTreeMode.INITIAL_ACCESS,
                                    onComplete: () => {
                                        setupBattleFlow(this.scene, false);
                                    },
                                    showLoading: true
                                }));
                    }
                }
                else if (false) {
                    this.scene.unshiftPhase(new SkillTreePhase(this.scene, {
                        mode: SkillTreeMode.POKEMON_SELECTION,
                        requiredSelections: 2,
                        onComplete: (selections?: Array<{ species: number; isSignature: boolean }>) => {
                            this.scene.clearPhaseQueue();
                            if (selections && selections.length) {
                                const active = this.scene.gameData.activeSkillTree;
                                if (active) {
                                    const sig = selections.find(s => s.isSignature)?.species;
                                    const gen = selections.find(s => !s.isSignature)?.species;
                                    active.selectedPokemon = { signature: sig as any, general: gen as any };
                                }
                            }
                            this.scene.sessionSlotId = -1;
                            setupBattleFlow(this.scene, false);
                        },
                        showLoading: true,
                        onCancel: () => {
                            this.scene.clearPhaseQueue();
                            this.scene.pushPhase(new TitlePhase(this.scene, false, true));
                        }
                    }));

                    this.gameMode = GameModes.CLASSIC;
                    this.scene.gameMode = getGameMode(this.gameMode);
                } else {
                    this.gameMode = GameModes.CHAOS_ROGUE;
                    this.scene.gameMode = getGameMode(this.gameMode);

                    const championId = this.scene.gameData.selectedChampionId || "brock";
                    this.scene.gameData.selectedChampionId = championId;
                    const championData = (this.scene.gameData as any).championData?.[championId] || {};
                    const result = ChampionUtils.filterStartersByChampion(
                        this.scene,
                        championData,
                        this.scene.gameMode
                    );
                    const availableStarters: Species[] = result.allStarters;

                    this.scene.unshiftPhase(new SelectStarterPhase(this.scene, {
                        availableStarters: availableStarters,
                        onStarterSelected: (starterInput: any) => {
                            const starters = Array.isArray(starterInput) ? starterInput : [starterInput];

                            if (this.scene.gameData.activeSkillTree) {
                                this.scene.gameData.activeSkillTree.starterPokemon = starters[0].species.speciesId;
                            }

                            this.scene.sessionSlotId = -1;

                            const party = this.scene.getParty();
                            const loadPokemonAssets: Promise<void>[] = [];

                            starters.forEach((starter, index) => {
                                const starterProps = this.scene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
                                const starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
                                const starterGender = starter.species.malePercent !== null
                                    ? !starterProps.female ? Gender.MALE : Gender.FEMALE
                                    : Gender.GENDERLESS;
                                const starterIvs = this.scene.gameData.dexData[starter.species.speciesId].ivs.slice(0);

                                const starterPokemon = this.scene.addPlayerPokemon(
                                    starter.species,
                                    this.scene.gameMode.getStartingLevel(),
                                    starter.abilityIndex,
                                    starterFormIndex,
                                    starterGender,
                                    starterProps.shiny,
                                    starterProps.variant,
                                    starterIvs,
                                    starter.nature
                                );

                                if (starter.moveset) {
                                    starterPokemon.tryPopulateMoveset(starter.moveset);
                                }
                                if (starter.passive) {
                                    starterPokemon.passive = true;
                                }
                                starterPokemon.luck = this.scene.gameData.getDexAttrLuck(this.scene.gameData.dexData[starter.species.speciesId].caughtAttr);
                                if (starter.pokerus) {
                                    starterPokemon.pokerus = true;
                                }
                                if (starter.nickname) {
                                    starterPokemon.nickname = starter.nickname;
                                }
                                const championId = this.scene.gameData.selectedChampionId;
                                let selectedIsSignature = false;
                                let altBuildId: PokemonAltBuildId | null = null;

                                if (championId) {
                                    const championData = (this.scene.gameData as any).championData?.[championId];
                                    if (championData) {
                                        const inBaseList = championData.signaturePokemon?.includes(starter.species.speciesId) || false;

                                        const unlockedSignatures = (championData as any).unlockedSignaturePokemon as Species[] | undefined;
                                        const inUnlockedList = unlockedSignatures?.includes(starter.species.speciesId) || false;

                                        selectedIsSignature = (inBaseList || inUnlockedList) && starter.isSignature !== false;

                                        if (selectedIsSignature) {
                                            altBuildId = ChampionUtils.getSignatureAltBuildId(starter.species.speciesId, championData);
                                        }
                                    }
                                }

                                if (selectedIsSignature) {
                                    starterPokemon.isSignature = true;
                                }

                                if (!selectedIsSignature) {
                                    if (Overrides.STARTER_FUSION_SPECIES_OVERRIDE) {
                                        starterPokemon.generateFusionViaSpeciesID(Overrides.STARTER_FUSION_SPECIES_OVERRIDE as Species, true);
                                    } else if (starter.fusionIndex > -1) {
                                        starterPokemon.generateFusionViaSpeciesID(this.scene.gameData.starterData[starter.species.speciesId].obtainedFusions[starter.fusionIndex]);
                                    }
                                }

                                starterPokemon.setVisible(false);
                                party.push(starterPokemon);
                                applySignatureTypeSwitcher(this.scene, starterPokemon);
                                if (starterPokemon.isSignature && altBuildId) {
                                    const def = POKEMON_ALT_BUILDS[altBuildId];
                                    if (def) {
                                        const rank = starterPokemon.altBuildRank ?? def.rank ?? 1;
                                        const modType = new PokemonAltBuildModifierType(def, rank);
                                        modType.id = "POKEMON_ALT_BUILD";
                                        this.scene.addModifier(modType.newModifier(starterPokemon), true);
                                    }
                                }
                                loadPokemonAssets.push(starterPokemon.loadAssets());

                            });
                            Promise.all(loadPokemonAssets).then(() => {
                                this.scene.unshiftPhase(new SkillTreePhase(this.scene, {
                                    mode: SkillTreeMode.INITIAL_ACCESS,
                                    onComplete: () => {
                                        setupBattleFlow(this.scene, false);
                                    },
                                    showLoading: true
                                }));

                                this.end();
                            });
                        }
                    }));
                }
                this.end();

            }

            debugModeFunc()
        } catch (error) {
            this.showOptions();
            return;
        }
    }

    private debugChampionSelect(): void {
        this.debugModeActive = true;

        const DEBUG_GAME_MODE = GameModes.CHAOS_ROGUE;

        try {
            this.gameMode = DEBUG_GAME_MODE;
            this.scene.gameMode = getGameMode(this.gameMode);

            this.scene.arena.preloadBgm();

            this.scene.gameMechanicTracking[GameMechanicsID.CHAMPION_MODE] = GameMechanicsVersion.CHAMPION_V1;

            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.clearText();

            ChampionModeIntegration.initializeChampionSelection(this.scene, this.gameMode, {
                onChampionReady: (championId: string, availableStarters: Species[]) => {
                }
            });

            this.end();

        } catch (error) {
            this.debugModeActive = false;
            this.showOptions();
        }
    }

    private autoApplyAltBuildModifiers(): void {
        const DEBUG_AUTO_ALT_BUILD = false;
        if (!DEBUG_AUTO_ALT_BUILD) return;

        this.scene.getParty().forEach((pokemon, index) => {
        });

        const onixPokemon = this.scene.getParty().find(pokemon => pokemon.species.speciesId === Species.ONIX);
        if (onixPokemon) {
            onixPokemon.extractActualSpriteColors("pkmn__95");
            onixPokemon.extractActualSpriteColors("pkmn__back__95");

            const altBuild = POKEMON_ALT_BUILDS[PokemonAltBuildId.ONIX_CRYSTAL_LEVIATHAN];
            if (altBuild) {
                const altBuildType = new PokemonAltBuildModifierType(altBuild);
                const altBuildModifier = new PokemonAltBuildModifier(altBuildType, onixPokemon.id, altBuild);
                this.scene.addModifier(altBuildModifier, true, false, false, true);
            }
        }
    }

    private shouldShowTitleCutscene(): boolean {
        if (this.scene.disableCutscenes) return false;
        const allSmittysComplete = this.scene.gameData.gameStats.cutsceneAllSmittysCompleteVictoryShown === true;
        const voidOvertaken = this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN] === true;
        const nightmareUnlocked = this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE] === true;

        if (allSmittysComplete) return this.scene.gameData.gameStats.cutsceneTitleDShown === false;
        if (voidOvertaken) return this.scene.gameData.gameStats.cutsceneTitleCShown === false;
        if (nightmareUnlocked) return this.scene.gameData.gameStats.cutsceneTitleBShown === false;
        return this.scene.gameData.gameStats.cutsceneTitleAShown === false;
    }

    private triggerTitleCutscene(): void {
        const allSmittysComplete = this.scene.gameData.gameStats.cutsceneAllSmittysCompleteVictoryShown === true;
        const voidOvertaken = this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN] === true;
        const nightmareUnlocked = this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE] === true;

        let def;
        let flagSetter: () => void;

        if (allSmittysComplete) {
            def = STORY_CUTSCENES.title_intro_d;
            flagSetter = () => { this.scene.gameData.gameStats.cutsceneTitleDShown = true; };
        } else if (voidOvertaken) {
            def = STORY_CUTSCENES.title_intro_c;
            flagSetter = () => { this.scene.gameData.gameStats.cutsceneTitleCShown = true; };
        } else if (nightmareUnlocked) {
            def = STORY_CUTSCENES.title_intro_b;
            flagSetter = () => { this.scene.gameData.gameStats.cutsceneTitleBShown = true; };
        } else {
            def = STORY_CUTSCENES.title_intro_a;
            flagSetter = () => { this.scene.gameData.gameStats.cutsceneTitleAShown = true; };
        }

        const slides = def.slides;

        this.scene.pushPhase(new TitlePhase(this.scene, this.fromShop, true));
        this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
            slides,
            bgmKey: def.bgmKey,
            canSkip: false,
            pauseAfterText: 1000,
            defaultCharSound: "ui/select",
            resumeBgmOnEnd: false,
            onComplete: () => {
                if (!this.scene.disableCutscenes) {
                    flagSetter();
                }

                const gd = this.scene.gameData;
                if (!gd.gameStats.onboardingTutorialComplete) {
                    TitlePhase.tutorialBattlePending = true;
                    gd.saveSystem();
                }

                TitlePhase.titleStoryCutsceneTriggered = false;
            }
        }));
        super.end();
    }
}