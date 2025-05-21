import BattleScene from "../battle-scene";
import TutorialUiHandler from "./tutorial-ui-handler";
import { Mode } from "./ui";
import { Tutorial } from "../tutorial";
import { EnhancedTutorial, TutorialRegistry } from "./tutorial-registry";

/**
 * Service for showing tutorials using the enum-based system
 */
export class TutorialService {
    private scene: BattleScene;
    private registry: TutorialRegistry;
    
    constructor(scene: BattleScene) {
        this.scene = scene;
        this.registry = TutorialRegistry.getInstance();
    }
    
    public showNewTutorial(
        tutorial: Tutorial | EnhancedTutorial,
        saveCompletionFlag: boolean = true,
        isFromMenu: boolean = false
    ): Promise<void> {
        return new Promise<void>(resolve => {
            if (isFromMenu && !this.isTutorialCompleted(tutorial)) {
                console.log(`Tutorial ${tutorial} not completed and trying to show from menu, skipping`);
                return resolve();
            }
           
            if (!isFromMenu && this.isTutorialCompleted(tutorial)) {
                console.log(`Tutorial ${tutorial} already completed, skipping`);
                return resolve();
            }
            
            this.showTutorial(tutorial, saveCompletionFlag, isFromMenu).then(resolve);
        });
    }

    public showTutorial(
        tutorial: Tutorial | EnhancedTutorial, 
        saveCompletionFlag: boolean = true,
        isFromMenu: boolean = false
    ): Promise<void> {
        return new Promise<void>(resolve => {
            console.log(`Attempting to show tutorial: ${tutorial}`);
            
            this.ensureTutorialHandlerRegistered();
            
            const tutorialConfig = this.registry.getTutorialConfig(tutorial);
            if (!tutorialConfig) {
                console.error(`Tutorial config not found for: ${tutorial}`);
                return resolve();
            }
            
            console.log(`Found tutorial config with ${tutorialConfig.stages?.length || 0} stages`);
            
            const onCompleteOriginal = tutorialConfig.onComplete;
            const enhancedConfig = {
                ...tutorialConfig,
                isFromMenu,
                onComplete: () => {
                    console.log(`Tutorial ${tutorial} completed`);
                    
                    if (onCompleteOriginal) {
                        onCompleteOriginal();
                    }
                    
                    if (saveCompletionFlag) {
                        this.saveTutorialFlag(tutorial);
                    }
                    
                    resolve();
                }
            };
            
            this.scene.ui.setOverlayMode(Mode.TUTORIAL, {
                buttonActions: [
                    () => {
                        console.log("Back button pressed");
                    },
                    () => {
                        console.log("Next/Complete button pressed");
                        const handler = this.scene.ui.getHandler() as TutorialUiHandler;
                        if (handler && handler instanceof TutorialUiHandler) {
                           
                            const isLastStage = handler['currentStageIndex'] === enhancedConfig.stages.length - 1;
                            if (isLastStage && enhancedConfig.onComplete) {
                                enhancedConfig.onComplete();
                                
                                if (!isFromMenu) {
                                    this.scene.ui.revertMode();
                                }
                            }
                        }
                    },
                    () => {
                        console.log("Cancel button pressed");
                        
                        if (!isFromMenu) {
                            this.scene.ui.revertMode();
                        }
                        resolve();
                    }
                ]
            }, enhancedConfig);
        });
    }
    
    public showCombinedTutorial(
        title: string,
        tutorials: (Tutorial | EnhancedTutorial)[],
        saveCompletionFlags: boolean = true,
        isFromMenu: boolean = false,
        newOnly: boolean = false
    ): Promise<void> {
        return new Promise<void>(resolve => {
            let filteredTutorials = [...tutorials];
            if (isFromMenu) {
                filteredTutorials = filteredTutorials.filter(t => this.isTutorialCompleted(t));
                if (!filteredTutorials.length) {
                    console.log(`No completed tutorials in "${title}" to show in hub/menu, skipping`);
                    return resolve();
                }
            } else if (newOnly) {
                filteredTutorials = filteredTutorials.filter(t => !this.isTutorialCompleted(t));
                if (!filteredTutorials.length) {
                    console.log(`No new tutorials in "${title}", skipping`);
                    return resolve();
                }
            } else if (!isFromMenu && filteredTutorials.every(t => this.isTutorialCompleted(t))) {
                console.log(`All tutorials in "${title}" already completed, skipping`);
                return resolve();
            }

            console.log(`Attempting to show combined tutorial "${title}" with ${filteredTutorials.length} tutorials`);
            this.ensureTutorialHandlerRegistered();
            const displayTitle = title || "Tutorial";
            
            const combinedConfig = this.registry.combineTutorials(
                displayTitle,
                filteredTutorials,
                () => {
                    console.log(`Combined tutorial "${displayTitle}" completed`);
                    
                    if (saveCompletionFlags) {
                        filteredTutorials.forEach(tutorial => this.saveTutorialFlag(tutorial));
                    }
                    
                    resolve();
                },
                true,
                isFromMenu
            );
            
            console.log(`Combined tutorial has ${combinedConfig.stages?.length || 0} total stages`);
            console.log(`Setting tutorial title to: "${combinedConfig.title}"`);
            const buttonActions = [
                () => {
                    console.log("Back button pressed");
                },
                () => {
                    console.log("Next/Complete button pressed");
                    
                   
                    const handler = this.scene.ui.getHandler() as TutorialUiHandler;
                    if (handler && handler instanceof TutorialUiHandler) {
                       
                        const isLastStage = handler['currentStageIndex'] === combinedConfig.stages.length - 1;
                        if (isLastStage && combinedConfig.onComplete) {
                            combinedConfig.onComplete();
                            
                            if (!isFromMenu) {
                                this.scene.ui.revertMode();
                            }
                        }
                    }
                },
                () => {
                    console.log("Cancel button pressed");
                    
                    if (!isFromMenu) {
                        this.scene.ui.revertMode();
                    }
                    resolve();
                }
            ];
            
            this.scene.ui.setOverlayMode(Mode.TUTORIAL, {
                buttonActions
            }, combinedConfig);
        });
    }
    
    public isTutorialCompleted(tutorial: Tutorial | EnhancedTutorial): boolean {
        const flags = this.getTutorialFlags();
        return !!flags[tutorial];
    }

    public allTutorialsCompleted(tutorials: (Tutorial | EnhancedTutorial)[]): boolean {
        const flags = this.getTutorialFlags();
        return tutorials.every(tutorial => !!flags[tutorial]);
    }
    
    private sanitizeTutorialKey(key: string): string {
       
        return key.replace(/^"+|"+$/g, '').trim();
    }

    private cleanUpEnhancedTutorialFlags(): void {
        const key = this.getTutorialStorageKey();
        const raw = localStorage.getItem(key);
        if (!raw) {
            return;
        }

       
        let repairedRaw = raw;
        try {
           
            repairedRaw = raw.replace(/{""([^"]+)"/g, '{"$1"');
            repairedRaw = repairedRaw.replace(/,""([^"]+)"/g, ',"$1"');
        } catch (e) {
            console.warn('[TutorialService] Error during string repair:', e);
        }

        let tutorialFlags = {};
        try {
            tutorialFlags = JSON.parse(repairedRaw);
        } catch (e) {
           
            console.warn('[TutorialService] Corrupted enhancedTutorials localStorage, removing:', raw, 'Error:', e);
            localStorage.removeItem(key);
            return;
        }

        const cleanedFlags = {};
        for (const k in tutorialFlags) {
            const sanitized = this.sanitizeTutorialKey(k);
            cleanedFlags[sanitized] = tutorialFlags[k];
        }
       
        localStorage.setItem(key, JSON.stringify(cleanedFlags));
    }

    public saveTutorialFlag(tutorial: Tutorial | EnhancedTutorial, resetTutorial: boolean = false): void {
       
        if (Object.values(Tutorial).includes(tutorial as Tutorial)) {
            this.scene.gameData.saveTutorialFlag(tutorial as Tutorial, true);
            return;
        }

        this.cleanUpEnhancedTutorialFlags();

       
        const key = this.getTutorialStorageKey();
        let tutorialFlags = {};

       
        if (localStorage.hasOwnProperty(key)) {
            tutorialFlags = JSON.parse(localStorage.getItem(key));
        }

       
        const sanitizedKey = this.sanitizeTutorialKey(String(tutorial));
        tutorialFlags[sanitizedKey] = !resetTutorial;

       
        localStorage.setItem(key, JSON.stringify(tutorialFlags));
    }
    
    private getTutorialFlags(): Record<string, boolean> {
        this.cleanUpEnhancedTutorialFlags();

       
        const legacyFlags = this.scene.gameData.getTutorialFlags();

       
        const key = this.getTutorialStorageKey();
        let enhancedFlags = {};

        if (localStorage.hasOwnProperty(key)) {
            enhancedFlags = JSON.parse(localStorage.getItem(key));
        }

       
        return { ...legacyFlags, ...enhancedFlags };
    }
    
    private getTutorialStorageKey(): string {
        return "enhancedTutorials";
    }
    
    private ensureTutorialHandlerRegistered(): void {
        const tutorialHandlerIndex = this.scene.ui.handlers.findIndex(h => h instanceof TutorialUiHandler);
        if (tutorialHandlerIndex === -1) {
            this.scene.ui.handlers.push(new TutorialUiHandler(this.scene, Mode.OPTION_SELECT));
        }
    }

    public showTutorialsByCategory(category: string, isFromMenu: boolean = false): Promise<void> {
        let tutorials: (Tutorial | EnhancedTutorial)[] = [];
        let title = "";
        
        const categoryMap = {
            essentials: {
                title: "Essentials",
                tutorials: [
                    EnhancedTutorial.MENU_ACCESS,
                    EnhancedTutorial.SAVING_1,
                    EnhancedTutorial.STATS,
                    EnhancedTutorial.RUN_HISTORY_1
                ]
            },
            gameModes: {
                title: "Game Modes",
                tutorials: [
                    EnhancedTutorial.JOURNEY_1,
                    EnhancedTutorial.ROGUE_MODE,
                    EnhancedTutorial.NUZLOCKE,
                    EnhancedTutorial.NUZLIGHT,
                    EnhancedTutorial.UNLOCK_JOURNEY,
                    EnhancedTutorial.ENDGAME,
                    EnhancedTutorial.MODE_UNLOCKS,
                    EnhancedTutorial.FIRST_VICTORY
                ]
            },
            specialPokemon: {
                title: "Special Pokemon",
                tutorials: [
                    EnhancedTutorial.LEGENDARY_POKEMON_1,
                    EnhancedTutorial.FUSION_POKEMON_1,
                    EnhancedTutorial.TRAINER_POKEMON_1,
                    EnhancedTutorial.EGGS_1,
                    EnhancedTutorial.EGG_SWAP_1
                ]
            },
            progression: {
                title: "Progression",
                tutorials: [
                    EnhancedTutorial.RIVALS_1,
                    EnhancedTutorial.GLITCH_RIVALS_1,
                    EnhancedTutorial.RIVAL_QUESTS,
                    EnhancedTutorial.THE_VOID_UNLOCKED,
                    EnhancedTutorial.THE_VOID_OVERTAKEN,
                    EnhancedTutorial.NEW_QUESTS
                ]
            },
            permanentFeatures: {
                title: "Permanent Features",
                tutorials: [
                    EnhancedTutorial.PERMA_MONEY_1,
                    EnhancedTutorial.BOUNTIES_1,
                    EnhancedTutorial.DAILY_BOUNTY,
                    EnhancedTutorial.SMITTY_ITEMS_1
                ]
            },
            glitchSystem: {
                title: "Glitch System",
                tutorials: [
                    EnhancedTutorial.GLITCH_ITEMS_1,
                    EnhancedTutorial.ABILITY_SWITCHER,
                    EnhancedTutorial.TYPE_SWITCHER,
                    EnhancedTutorial.PRIMARY_SWITCHER,
                    EnhancedTutorial.SECONDARY_SWITCHER,
                    EnhancedTutorial.RELEASE_ITEMS_1,
                    EnhancedTutorial.ANY_TMS,
                    EnhancedTutorial.ANY_ABILITIES,
                    EnhancedTutorial.STAT_SWITCHERS
                ]
            },
            battleMechanics: {
                title: "Battle Mechanics",
                tutorials: [
                    EnhancedTutorial.ABILITIES_1,
                    EnhancedTutorial.PASSIVE_ABILITIES_1,
                    EnhancedTutorial.PARTY_ABILITY_1,
                    EnhancedTutorial.BUG_TYPES_1,
                    EnhancedTutorial.MOVE_UPGRADES_1,
                    EnhancedTutorial.FIRST_MOVE_UPGRADE_1
                ]
            },
            formChanges: {
                title: "Form Changes",
                tutorials: [
                    EnhancedTutorial.NEW_FORMS_1,
                    EnhancedTutorial.SMITTY_FORMS_1,
                    EnhancedTutorial.SMITTY_FORM_UNLOCKED_1,
                    EnhancedTutorial.MEGA_DYNAMAX_1
                ]
            },
            communityFeatures: {
                title: "Community Features",
                tutorials: [
                    EnhancedTutorial.DISCORD,
                    EnhancedTutorial.SMITOM
                ]
            },
            smittyForms: {
                title: "Smitty Forms",
                tutorials: [
                    EnhancedTutorial.SMITOM,
                    EnhancedTutorial.SMITTY_FORMS_1,
                    EnhancedTutorial.SMITTY_FORM_UNLOCKED_1
                ]
            }
        };

        if (category === "all") {
            title = "All Tutorials";
            tutorials = Object.values(categoryMap).flatMap(c => c.tutorials);
        } else if (categoryMap.hasOwnProperty(category)) {
            const categoryData = categoryMap[category];
            title = categoryData.title;
            tutorials = categoryData.tutorials;
        } else {
            console.log(`Unknown category: ${category}`);
            return Promise.resolve();
        }
        
       
        if (isFromMenu) {
           
            const completedTutorials = tutorials.filter(tutorial => this.isTutorialCompleted(tutorial));
            
           
            if (completedTutorials.length === 0) {
                console.log(`No completed tutorials to show for category: ${category}`);
                return Promise.resolve();
            }
            
            tutorials = completedTutorials;
        }
        
        console.log(`Preparing to show ${tutorials.length} tutorials for category: ${category} with title: ${title}`);
        
        if (tutorials.length === 0) {
            console.log("No tutorials defined for this category");
            return Promise.resolve();
        }
        
        return this.showCombinedTutorial(title, tutorials, false, isFromMenu);
    }
} 