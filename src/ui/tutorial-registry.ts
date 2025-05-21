import BattleScene from "../battle-scene";
import { Species } from "../enums/species";
import { getPokemonSpecies } from "../data/pokemon-species";
import { Tutorial } from "../tutorial";
import { TutorialConfig, TutorialStage, TutorialSprite } from "./tutorial-ui-handler";
import i18next from "i18next";


export enum EnhancedTutorial {
    LEGENDARY_POKEMON_1 = "LEGENDARY_POKEMON_1",
    RIVALS_1 = "RIVALS_1",
    RIVAL_QUESTS = "RIVAL_QUESTS",
    SMITOM = "SMITOM",
    ABILITIES_1 = "ABILITIES_1",
    NEW_FORMS_1 = "NEW_FORMS_1",
    BUG_TYPES_1 = "BUG_TYPES_1",
    INTRASHOP_1 = "INTRASHOP_1",
    STARTER_CATCH_QUEST = "STARTER_CATCH_QUEST",
    MOVE_UPGRADES_1 = "MOVE_UPGRADES_1",
    FIRST_MOVE_UPGRADE_1 = "FIRST_MOVE_UPGRADE_1",
    NUZLIGHT = "NUZLIGHT",
    NUZLOCKE = "NUZLOCKE",
    JOURNEY_1 = "JOURNEY_1",
    UNLOCK_JOURNEY = "UNLOCK_JOURNEY",
    ROGUE_MODE = "ROGUE_MODE",
    ENDGAME = "ENDGAME",
    
    PASSIVE_ABILITIES_1 = "PASSIVE_ABILITIES_1",
    GLITCH_ITEMS_1 = "GLITCH_ITEMS_1",
    FUSION_POKEMON_1 = "FUSION_POKEMON_1",
    TRAINER_POKEMON_1 = "TRAINER_POKEMON_1",
    PARTY_ABILITY_1 = "PARTY_ABILITY_1",
    PERMA_MONEY_1 = "PERMA_MONEY_1",
    SAVING_1 = "SAVING_1",
    STATS = "STATS",
    RUN_HISTORY_1 = "RUN_HISTORY_1",
    EGGS_1 = "EGGS_1",
    EGG_SWAP_1 = "EGG_SWAP_1",
    RUN_DETAILS_1 = "RUN_DETAILS_1",
    
    BOUNTIES_1 = "BOUNTIES_1",
    DAILY_BOUNTY = "DAILY_BOUNTY",
    DISCORD = "DISCORD",
    SMITTY_FORMS_1 = "SMITTY_FORMS_1",
    SMITTY_FORM_UNLOCKED_1 = "SMITTY_FORM_UNLOCKED_1",
    SMITTY_ITEMS_1 = "SMITTY_ITEMS_1",
    MENU_ACCESS = "MENU_ACCESS",
    GLITCH_RIVALS_1 = "GLITCH_RIVALS_1",
    POKEROGUE_1 = "POKEROGUE_1",
    
    ABILITY_SWITCHER = "ABILITY_SWITCHER",
    TYPE_SWITCHER = "TYPE_SWITCHER",
    PRIMARY_SWITCHER = "PRIMARY_SWITCHER",
    SECONDARY_SWITCHER = "SECONDARY_SWITCHER",
    RELEASE_ITEMS_1 = "RELEASE_ITEMS_1",
    ANY_TMS = "ANY_TMS",
    ANY_ABILITIES = "ANY_ABILITIES",
    STAT_SWITCHERS = "STAT_SWITCHERS",
    
    NEW_QUESTS = "NEW_QUESTS",
    MODE_UNLOCKS = "MODE_UNLOCKS",
    FIRST_VICTORY = "FIRST_VICTORY",
    THE_VOID_UNLOCKED = "THE_VOID_UNLOCKED",
    THE_VOID_OVERTAKEN = "THE_VOID_OVERTAKEN",
    MEGA_DYNAMAX_1 = "MEGA_DYNAMAX_1",

}

/**
 * A registry that manages all tutorial configurations
 */
export class TutorialRegistry {
    private static instance: TutorialRegistry;
    private tutorialConfigs: Map<string, TutorialConfig> = new Map();
    
    private constructor() {
        this.registerAllTutorials();
    }
    
    public static getInstance(): TutorialRegistry {
        if (!TutorialRegistry.instance) {
            TutorialRegistry.instance = new TutorialRegistry();
        }
        return TutorialRegistry.instance;
    }
    
    /**
     * Get a tutorial configuration for a specific enum
     */
    public getTutorialConfig(tutorial: Tutorial | EnhancedTutorial): TutorialConfig | undefined {
        return this.tutorialConfigs.get(tutorial);
    }
    
    /**
     * Combines multiple tutorials into a single multi-stage tutorial
     */
    public combineTutorials(
        title: string, 
        tutorials: (Tutorial | EnhancedTutorial)[], 
        onComplete?: () => void, 
        isTipActive: boolean = true,
        isFromMenu: boolean = false
    ): TutorialConfig {
        console.log(`Combining ${tutorials.length} tutorials under title "${title}"`);
        
        const combinedTitle = title || "Tutorial";
        
        const stages: TutorialStage[] = [];
        
        for (const tutorial of tutorials) {
            const config = this.getTutorialConfig(tutorial);
            if (config && config.stages) {
                console.log(`Adding ${config.stages.length} stages from tutorial: ${tutorial}`);
                
                const configStages = [...config.stages].map(stage => {
                    if (!stage.title && config.title) {
                        return {
                            ...stage,
                            title: config.title
                        };
                    }
                    return stage;
                });
                
                stages.push(...configStages);
            } else {
                console.warn(`Tutorial config not found for: ${tutorial}`);
            }
        }
        
        console.log(`Combined tutorial has ${stages.length} total stages`);
        
        let finalTitle = combinedTitle;
        if (isFromMenu && !finalTitle && stages.length > 0 && stages[0].title) {
            finalTitle = stages[0].title;
            console.log(`Using first stage title for hub mode: ${finalTitle}`);
        }
        
        return {
            title: finalTitle,
            stages,
            onComplete,
            isTipActive,
            isFromMenu
        };
    }
    
    /**
     * Register all tutorial configurations
     */
    private registerAllTutorials(): void {
        this.registerLegacyTutorials();
        
        this.registerLegendaryPokemonTutorials();
        this.registerRivalsTutorials();
        this.registerRivalQuestsTutorial();
        this.registerSmitomTutorials();
        this.registerAbilitiesTutorials();
        this.registerNewFormsTutorials();
        this.registerBugTypesTutorials();
        this.registerIntrashopTutorials();
        
        this.registerNuzlightTutorial();
        this.registerNuzlockeTutorial();
        this.registerJourneyTutorials();
        this.registerUnlockJourneyTutorial();
        this.registerRogueModeTutorial();
        this.registerEndgameTutorial();
        
        this.registerPassiveAbilitiesTutorials();
        this.registerGlitchItemsTutorials();
        this.registerFusionPokemonTutorials();
        this.registerTrainerPokemonTutorials();
        this.registerPartyAbilityTutorials();
        this.registerPermaMoneyTutorials();
        this.registerSavingTutorials();
        this.registerStatsTutorial();
        this.registerRunHistoryTutorials();
        this.registerEggsTutorials();
        this.registerEggSwapTutorials();
        this.registerRunDetailsTutorial();
        this.registerMoveUpgradesTutorials();
        this.registerFirstMoveUpgradeTutorials();
        
        this.registerBountiesTutorials();
        this.registerDailyBountyTutorial();
        this.registerDiscordTutorial();
        this.registerSmittyFormsTutorials();
        this.registerSmittyFormsUnlockedTutorials();
        this.registerSmittyItemsTutorials();
        this.registerMenuAccessTutorial();
        this.registerGlitchRivalsTutorials();
        this.registerPokerogueTutorial();
        
        this.registerAbilitySwitcherTutorial();
        this.registerTypeSwitcherTutorial();
        this.registerPrimarySwitcherTutorial();
        this.registerSecondarySwitcherTutorial();
        this.registerReleaseItemsTutorials();
        this.registerAnyTMsTutorial();
        this.registerAnyAbilitiesTutorial();
        this.registerStatSwitchersTutorial();
        
        this.registerNewQuestsTutorial();
        this.registerModeUnlocksTutorial();
        this.registerFirstVictoryTutorial();
        this.registerTheVoidUnlockedTutorial();
        this.registerTheVoidOvertakenTutorial();
        this.registerMegaDynamaxTutorials();
    }
    
    /**
     * Register original tutorials from the Tutorial enum
     */
    private registerLegacyTutorials(): void {
        this.tutorialConfigs.set(Tutorial.Access_Menu, {
            title: i18next.t("tutorial:accessMenu.title"),
            stages: [{
                sprites: [{ key: "ui_button_atlas", frame: "menu_button", scale: 1.0 }],
                text: i18next.t("tutorial:accessMenu"),
                title: i18next.t("tutorial:accessMenu.title")
            }],
            isTipActive: false
        });
    }

    private registerMenuAccessTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.MENU_ACCESS, {
            title: i18next.t("tutorial:accessMenu.title"),
            stages: [{
                sprites: [{ 
                    spriteType: 'smitty_logo',
                    smittyLogoId: 38,
                    scale: 0.25,
                    key: "smitty_logo"
                }],
                text: i18next.t("tutorial:accessMenu.text"),
                title: i18next.t("tutorial:accessMenu.title")
            }],
            isTipActive: false
        });
    }

    private registerGlitchRivalsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.GLITCH_RIVALS_1, {
            title: i18next.t("tutorial:glitchRivals.title"),
            stages: [{
                sprites: [
                    { key: "red", scale: 0.6, x: -40 },
                    { key: "misty", scale: 0.6, x: 0 },
                    { key: "brock", scale: 0.6, x: 40 }
                ],
                text: i18next.t("tutorial:glitchRivals.text.1"),
                title: i18next.t("tutorial:glitchRivals.title")
            },
            {
                sprites: [
                    { key: "red", scale: 0.7, x: -40, alpha: 0.85 },
                    { key: "misty", scale: 0.7, x: 0, alpha: 0.85 },
                    { key: "brock", scale: 0.7, x: 40, alpha: 0.85 }
                ],
                text: i18next.t("tutorial:glitchRivals.text.2"),
                title: i18next.t("tutorial:glitchRivals.title")
            }],
            isTipActive: false
        });
    }

    private registerMoveUpgradesTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.MOVE_UPGRADES_1, {
            title: i18next.t("tutorial:moveUpgrades.title"),
            stages: [{
                sprites: [
                    { key: "items", frame: "tm_dragon", scale: 1, x: 0, y: 0 },
                    { key: "smitems_192", frame: "permaLongerStatBoosts", scale: 0.16, x: 20, y: 0, flipX: true },
                ],
                text: i18next.t("tutorial:moveUpgrades.text.1"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "smittyVoid", scale: 0.12, x: -40, y: 0 },
                    { key: "smitems_192", frame: "smittyVoid", scale: 0.12, x: 0, y: 0 },
                    { key: "smitems_192", frame: "smittyVoid", scale: 0.12, x: 40, y: 0 },
                ],
                text: i18next.t("tutorial:moveUpgrades.text.2"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                    { key: "items", frame: "tm_dragon", scale: 1, x: 0, y: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.10, x: 10, y: 0 },

                ],
                text: i18next.t("tutorial:moveUpgrades.text.3"),
                title: i18next.t("tutorial:moveUpgrades.title")
            }
            ],
            isTipActive: false
        });
    }

    private registerFirstMoveUpgradeTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.FIRST_MOVE_UPGRADE_1, {
            title: i18next.t("tutorial:firstMoveUpgrade.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaStarterPointLimitInc", scale: 0.16, x: 0, y: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 15, y: 0 },
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.1"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.1")
            },
            {
                sprites: [
                   { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 111,
                        scale: 0.23,
                        x: 0,
                        key: "smitty_logo"
                    },
                    { 
                        key: getPokemonSpecies(Species.CATERPIE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CATERPIE).getIconId(false), 
                        scale: 0.9, 
                        x: -20,
                        y: -20
                    },
                    { 
                        key: getPokemonSpecies(Species.SPINARAK).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.SPINARAK).getIconId(false), 
                        scale: 0.9, 
                        x: 20,
                        y: -20 
                    },
                    { 
                        key: getPokemonSpecies(Species.WEEDLE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.WEEDLE).getIconId(false), 
                        scale: 0.9, 
                        x: 0,
                        y: 15 
                    }
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.2"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.2")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaTransferTera", scale: 0.20, x: 0, y: 0 },

                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.3"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.2")
            },
            {
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 72,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.4"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.2")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaFreeReroll", scale: 0.16, x: 0, y: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 15, y: 0 },
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.5"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.5")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "glitchStatSwitch", scale: 0.20, x: 0, y: 0 },
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.6"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.6")
            }
            
            ],
            isTipActive: false
        });
    }

    private registerLegendaryPokemonTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.LEGENDARY_POKEMON_1, {
            title: i18next.t("tutorial:legendary.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaLongerStatBoosts", scale: 0.16, x: -20, y: -10 },
                    { key: "smitems_192", frame: "permaStarterPointLimitInc", scale: 0.16, x: 20, y: -10 },
                    { 
                        key: getPokemonSpecies(Species.CATERPIE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CATERPIE).getIconId(false), 
                        scale: 1.1, 
                        x: 0 
                    },
                    
                ],
                text: i18next.t("tutorial:legendary.text.1"),
                title: i18next.t("tutorial:legendary.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "glitchStatSwitch", scale: 0.16, x: -50 },
                    { key: "smitems_192", frame: "glitchTm", scale: 0.16, x: -15 },
                    { key: "smitems_192", frame: "modPassiveAbility", scale: 0.16, x: 20 },
                    { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.16, x: 55 }
                ],
                text: i18next.t("tutorial:legendary.text.2"),
                title: i18next.t("tutorial:legendary.title")
            },
            {
                sprites: [
                    { key: "red", scale: 0.7, x: 0 },
                    { key: "smitems_192", frame: "smittyVoid", scale: 0.16, x: 20 }
                ],
                text: i18next.t("tutorial:legendary.text.3"),
                title: i18next.t("tutorial:legendary.title")
            }],
            isTipActive: false
        });
    }

    private registerRivalsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.RIVALS_1, {
            title: i18next.t("tutorial:rivals.title"),
            stages: [{
                sprites: [
                    { key: "giovanni", scale: 0.6, x: -40 },
                    { key: "lance", scale: 0.6, x: 0 },
                    { key: "blue", scale: 0.6, x: 40 }
                ],
                text: i18next.t("tutorial:rivals.text.1"),
                title: i18next.t("tutorial:rivals.title")
            },
            {
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "nidorath", scale: 0.8, x: -40 },
                    { key: "pokemon_icons_glitch", frame: "dragonking", scale: 0.8, x: 0 },
                    { key: "pokemon_icons_glitch", frame: "enchantoise", scale: 0.8, x: 40 }
                ],
                text: i18next.t("tutorial:rivals.text.2"),
                title: i18next.t("tutorial:rivals.title")
            }],
            isTipActive: false
        });
    }

    private registerRivalQuestsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.RIVAL_QUESTS, {
            title: i18next.t("tutorial:rivalQuests.title"),
            stages: [{
                sprites: [
                    { key: "red", scale: 0.7, x: 0 },
                    { key: "smitems_192", frame: "quest", scale: 0.16, x: 10 },
                    { 
                        key: getPokemonSpecies(Species.PIKACHU).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.PIKACHU).getIconId(false), 
                        scale: 0.6, 
                        x: 10 
                    },
                    
                ],
                text: i18next.t("tutorial:rivalQuests.text"),
                title: i18next.t("tutorial:rivalQuests.title")
            }],
            isTipActive: false
        });
    }

    private registerSmitomTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SMITOM, {
            title: i18next.t("tutorial:smitom.title"),
            stages: [{
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "smitom", scale: 0.8 }
                ],
                text: i18next.t("tutorial:smitom.text.1"),
                title: i18next.t("tutorial:smitom.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.16, x: -30 },
                    { key: "smitems_192", frame: "permaMoney", scale: 0.16, x: 30 }
                ],
                text: i18next.t("tutorial:smitom.text.2"),
                title: i18next.t("tutorial:smitom.title")
            }],
            isTipActive: false
        });
    }

    private registerEggsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.EGGS_1, {
            title: i18next.t("tutorial:eggs.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'egg',
                        eggStage: 0,
                        scale: 0.5,
                        x: -30,
                        key: "egg"
                    },
                    { 
                        key: getPokemonSpecies(Species.TOGEPI).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.TOGEPI).getIconId(false), 
                        scale: 0.9, 
                        x: 30 
                    }
                ],
                text: i18next.t("tutorial:eggs.text.1"),
                title: i18next.t("tutorial:eggs.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.ROARING_MOON).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.ROARING_MOON).getIconId(false), 
                        scale: 0.9, 
                        x: -30 
                    },
                    { 
                        key: getPokemonSpecies(Species.MEWTWO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.MEWTWO).getIconId(false), 
                        scale: 0.9, 
                        x: 30 
                    }
                ],
                text: i18next.t("tutorial:eggs.text.2"),
                title: i18next.t("tutorial:eggs.title")
            },
            {
                sprites: [
                    { 
                        spriteType: 'egg',
                        eggStage: 0,
                        scale: 1,
                        x: 0,
                        key: "egg"
                    },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 10 }

                ],
                text: i18next.t("tutorial:eggs.text.3"),
                title: i18next.t("tutorial:eggs.title")
            }],
            isTipActive: false
        });
    }

    private registerEggSwapTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.EGG_SWAP_1, {
            title: i18next.t("tutorial:eggSwap.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'egg',
                        eggStage: 0,
                        scale: 0.5,
                        x: 0,
                        key: "egg"
                    },
                    { key: "smitems_192", frame: "permaTransferTera", scale: 0.12, x: 10, y: 0 }
                ],
                text: i18next.t("tutorial:eggSwap.text.1"),
                title: i18next.t("tutorial:eggSwap.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.MEWTWO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.MEWTWO).getIconId(true, 1), 
                        scale: 0.8, 
                        x: -40 
                    },
                    { 
                        key: getPokemonSpecies(Species.RILLABOOM).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.RILLABOOM).getIconId(true, 1), 
                        scale: 0.8, 
                        x: -20
                    },
                    { 
                            key: getPokemonSpecies(Species.DARKRAI).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.DARKRAI).getIconId(false), 
                            scale: 0.8, 
                            x: 0 
                    },
                    { 
                        key: getPokemonSpecies(Species.CHARIZARD).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CHARIZARD).getIconId(true, 2), 
                        scale: 0.8, 
                        x: 20 
                    }
                ],
                text: i18next.t("tutorial:eggSwap.text.2"),
                title: i18next.t("tutorial:eggSwap.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.TOGEPI).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.TOGEPI).getIconId(false), 
                        scale: 0.9, 
                        x: -30 
                    },
                    { 
                        key: getPokemonSpecies(Species.TOGEPI).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.TOGEPI).getIconId(false), 
                        scale: 0.9, 
                        x: 0 
                    },
                    { 
                        key: getPokemonSpecies(Species.TOGEPI).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.TOGEPI).getIconId(false), 
                        scale: 0.9, 
                        x: 30 
                    }
                ],
                text: i18next.t("tutorial:eggSwap.text.3"),
                title: i18next.t("tutorial:eggSwap.title")
            }
            ],
            isTipActive: false
        });
    }

    private registerStatsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.STATS, {
            title: i18next.t("tutorial:stats.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaMoreRewardChoice", scale: 0.16 }
                ],
                text: i18next.t("tutorial:stats.text"),
                title: i18next.t("tutorial:stats.title")
            }],
            isTipActive: false
        });
    }

    private registerRunHistoryTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.RUN_HISTORY_1, {
            title: i18next.t("tutorial:runHistory.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaRunAnything", scale: 0.16 }
                ],
                text: i18next.t("tutorial:runHistory.text.1"),
                title: i18next.t("tutorial:runHistory.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "modPassiveAbility", scale: 0.16, x: -30 },
                    { key: "smitems_192", frame: "permaStartBall", scale: 0.16, x: 30 }
                ],
                text: i18next.t("tutorial:runHistory.text.2"),
                title: i18next.t("tutorial:runHistory.title")
            }],
            isTipActive: false
        });
    }

    private registerRunDetailsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.RUN_DETAILS_1, {
            title: i18next.t("tutorial:runDetails.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaRunAnything", scale: 0.16, x: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 15 }
                ],
                text: i18next.t("tutorial:runDetails.text.1"),
                title: i18next.t("tutorial:runDetails.title")
            }],
            isTipActive: false
        });
    }

    private registerIntrashopTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.INTRASHOP_1, {
            title: i18next.t("tutorial:intrashop.title"),
            stages: [{
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.KECLEON).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.KECLEON).getIconId(false), 
                        scale: 1, 
                        x: 0,
                        flipX: true
                    }
                ],
                text: i18next.t("tutorial:intrashop.text.1"),
                title: i18next.t("tutorial:intrashop.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.KECLEON).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.KECLEON).getIconId(false), 
                        scale: 1,
                        x: -25,
                        flipX: true
                    },
                    { key: "smitems_192", frame: "permaFreeReroll", scale: 0.12, x: -10, y: 5 },
                    { key: "items", frame: "big_nugget", scale: 0.7, x: 10, y: 5 },
                    { key: "items", frame: "relic_gold", scale: 0.7, x: 25, y: 5 }
                ],
                text: i18next.t("tutorial:intrashop.text.2"),
                title: i18next.t("tutorial:intrashop.title")
            }],
            isTipActive: false
        });
    }

    private registerAbilitiesTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ABILITIES_1, {
            title: i18next.t("tutorial:abilities.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchAbilitySwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:abilities.text.1"),
                title: i18next.t("tutorial:abilities.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.SEEDOT).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.SEEDOT).getIconId(false), 
                        scale: 0.9, 
                        x: -40 
                    },
                    { 
                        key: getPokemonSpecies(Species.NUZLEAF).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.NUZLEAF).getIconId(false), 
                        scale: 0.9, 
                        x: 0 
                    },
                    { 
                        key: getPokemonSpecies(Species.SHIFTRY).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.SHIFTRY).getIconId(false), 
                        scale: 0.9, 
                        x: 40 
                    }
                ],
                text: i18next.t("tutorial:abilities.text.2"),
                title: i18next.t("tutorial:abilities.title")
            }],
            isTipActive: false
        });
    }

    private registerNewFormsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.NEW_FORMS_1, {
            title: i18next.t("tutorial:newForms.title"),
            stages: [{
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "regimeteor", scale: 0.4, x: -80, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "necromew", scale: 0.4, x: -40, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "charisand", scale: 0.4, x: 0, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "mentasaur", scale: 0.4, x: 40, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "enchantoise", scale: 0.4, x: 80, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "picklisk", scale: 0.4, x: -80, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "bogace", scale: 0.4, x: -40, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "kakopier", scale: 0.4, x: 0, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "voidash", scale: 0.4, x: 40, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "plankling", scale: 0.4, x: 80, y: 10 }
                ],
                text: i18next.t("tutorial:newForms.text.1"),
                title: i18next.t("tutorial:newForms.title")
            },
            {
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "ririkyu", scale: 0.8, x: 0 },
                    { key: "smitems_192", frame: "quest", scale: 0.16, x: 15 }
                ],
                text: i18next.t("tutorial:newForms.text.2"),
                title: i18next.t("tutorial:newForms.title")
            }],
            isTipActive: false
        });
    }

    private registerBugTypesTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.BUG_TYPES_1, {
            title: i18next.t("tutorial:bugs.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 111,
                        scale: 0.23,
                        x: 0,
                        key: "smitty_logo"
                    },
                    { 
                        key: getPokemonSpecies(Species.CATERPIE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CATERPIE).getIconId(false), 
                        scale: 0.9, 
                        x: -20,
                        y: -20
                    },
                    { 
                        key: getPokemonSpecies(Species.SPINARAK).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.SPINARAK).getIconId(false), 
                        scale: 0.9, 
                        x: 20,
                        y: -20 
                    },
                    { 
                        key: getPokemonSpecies(Species.WEEDLE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.WEEDLE).getIconId(false), 
                        scale: 0.9, 
                        x: 0,
                        y: 15 
                    }
                ],
                text: i18next.t("tutorial:bugs.text.1"),
                title: i18next.t("tutorial:bugs.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaShiny", scale: 0.16 }
                ],
                text: i18next.t("tutorial:bugs.text.2"),
                title: i18next.t("tutorial:bugs.title")
            }],
            isTipActive: false
        });
    }

    private registerNuzlightTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.NUZLIGHT, {
            title: i18next.t("tutorial:nuzlight.title"),
            stages: [{
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.SEEDOT).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.SEEDOT).getIconId(false), 
                        scale: 0.9 
                    }
                ],
                text: i18next.t("tutorial:nuzlight.text"),
                title: i18next.t("tutorial:nuzlight.title")
            }],
            isTipActive: false
        });
    }

    private registerNuzlockeTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.NUZLOCKE, {
            title: i18next.t("tutorial:nuzlocke.title"),
            stages: [{
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.NUZLEAF).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.NUZLEAF).getIconId(false), 
                        scale: 0.9 
                    }
                ],
                text: i18next.t("tutorial:nuzlocke.text"),
                title: i18next.t("tutorial:nuzlocke.title")
            }],
            isTipActive: false
        });
    }

    private registerJourneyTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.JOURNEY_1, {
            title: i18next.t("tutorial:journey.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaStartBall", scale: 0.16 }
                ],
                text: i18next.t("tutorial:journey.text.1"),
                title: i18next.t("tutorial:journey.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaStarterPointLimitInc", scale: 0.16, x: -30 },
                    { key: "smitems_192", frame: "permaCheaperFusions", scale: 0.16, x: 30 }
                ],
                text: i18next.t("tutorial:journey.text.2"),
                title: i18next.t("tutorial:journey.title")
            }],
            isTipActive: false
        });
    }

    private registerUnlockJourneyTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.UNLOCK_JOURNEY, {
            title: i18next.t("tutorial:unlockJourney.title"),
            stages: [{
                sprites: [
                    { key: "red", scale: 0.7, x: -20 },
                    { 
                        key: getPokemonSpecies(Species.PIKACHU).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.PIKACHU).getIconId(false), 
                        scale: 0.9, 
                        x: 20 
                    }
                ],
                text: i18next.t("tutorial:unlockJourney.text.1"),
                title: i18next.t("tutorial:unlockJourney.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "quest", scale: 0.16, x: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 10 }
                ],
                text: i18next.t("tutorial:unlockJourney.text.2"),
                title: i18next.t("tutorial:unlockJourney.title")
            }
            ],
            isTipActive: false
        });
    }

    private registerRogueModeTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ROGUE_MODE, {
            title: i18next.t("tutorial:rogueMode.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "draftMode", scale: 0.2 }
                ],
                text: i18next.t("tutorial:rogueMode.text"),
                title: i18next.t("tutorial:rogueMode.title")
            }],
            isTipActive: false
        });
    }

    private registerEndgameTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ENDGAME, {
            title: i18next.t("tutorial:bosses.title"),
            stages: [{
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.MEWTWO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.MEWTWO).getIconId(false), 
                        scale: 0.9, 
                        x: -40 
                    },
                    { 
                        key: getPokemonSpecies(Species.MEWTWO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.MEWTWO).getIconId(true, 1), 
                        scale: 0.9, 
                        x: 0 
                    },
                    { 
                        key: getPokemonSpecies(Species.MEWTWO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.MEWTWO).getIconId(true, 2), 
                        scale: 0.9, 
                        x: 40 
                    }
                ],
                text: i18next.t("tutorial:bosses.text"),
                title: i18next.t("tutorial:bosses.title")
            }],
            isTipActive: false
        });
    }

    private registerPassiveAbilitiesTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.PASSIVE_ABILITIES_1, {
            title: i18next.t("tutorial:passiveAbilities.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "modPassiveAbility", scale: 0.16 }
                ],
                text: i18next.t("tutorial:passiveAbilities.text.1"),
                title: i18next.t("tutorial:passiveAbilities.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "modPassiveAbility", scale: 0.16, x: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.16, x: 15 }
                ],
                text: i18next.t("tutorial:passiveAbilities.text.2"),
                title: i18next.t("tutorial:passiveAbilities.title")
            }],
            isTipActive: false
        });
    }

    private registerGlitchItemsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.GLITCH_ITEMS_1, {
            title: i18next.t("tutorial:glitchItems.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchPiece", scale: 0.16 }
                ],
                text: i18next.t("tutorial:glitchItems.text.1"),
                title: i18next.t("tutorial:glitchItems.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "glitchTm", scale: 0.16, x: -52 },
                    { key: "smitems_192", frame: "glitchAbilitySwitch", scale: 0.16, x: -17 },
                    { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.16, x: 18 },
                    { key: "smitems_192", frame: "glitchStatSwitch", scale: 0.16, x: 53 }
                ],
                text: i18next.t("tutorial:glitchItems.text.2"),
                title: i18next.t("tutorial:glitchItems.title")
            }],
            isTipActive: false
        });
    }

    private registerFusionPokemonTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.FUSION_POKEMON_1, {
            title: i18next.t("tutorial:fusionPokemon.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 110,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:fusionPokemon.text.1"),
                title: i18next.t("tutorial:fusionPokemon.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaFusionIncrease", scale: 0.16 }
                ],
                text: i18next.t("tutorial:fusionPokemon.text.2"),
                title: i18next.t("tutorial:fusionPokemon.title")
            }],
            isTipActive: false
        });
    }

    private registerTrainerPokemonTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.TRAINER_POKEMON_1, {
            title: i18next.t("tutorial:trainerPokemon.title"),
            stages: [{
                sprites: [
                    
                    { key: "rocket_grunt_m", scale: 0.6, x: 0 }
                ],
                text: i18next.t("tutorial:trainerPokemon.text.1"),
                title: i18next.t("tutorial:trainerPokemon.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaTrainerSnatchCost", scale: 0.16 }
                ],
                text: i18next.t("tutorial:trainerPokemon.text.2"),
                title: i18next.t("tutorial:trainerPokemon.title")
            }],
            isTipActive: false
        });
    }

    private registerPartyAbilityTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.PARTY_ABILITY_1, {
            title: i18next.t("tutorial:partyAbility.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaPartyAbility", scale: 0.16 }
                ],
                text: i18next.t("tutorial:partyAbility.text.1"),
                title: i18next.t("tutorial:partyAbility.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaPartyAbility", scale: 0.12, x: 0, y: -15 },
                    { 
                        key: getPokemonSpecies(Species.CLOYSTER).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CLOYSTER).getIconId(false), 
                        scale: 0.7, 
                        x: -40, 
                        y: 10
                    },
                    { 
                        key: getPokemonSpecies(Species.LUCARIO).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.LUCARIO).getIconId(false), 
                        scale: 0.7, 
                        x: 0, 
                        y: 10
                    },
                    { 
                        key: getPokemonSpecies(Species.BLAZIKEN).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.BLAZIKEN).getIconId(false), 
                        scale: 0.7, 
                        x: 40, 
                        y: 10
                    }
                ],
                text: i18next.t("tutorial:partyAbility.text.2"),
                title: i18next.t("tutorial:partyAbility.title")
            }],
            isTipActive: false
        });
    }

    private registerPermaMoneyTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.PERMA_MONEY_1, {
            title: i18next.t("tutorial:permaMoney.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaMoney", scale: 0.16 }
                ],
                text: i18next.t("tutorial:permaMoney.text.1"),
                title: i18next.t("tutorial:permaMoney.title")
            },
            {
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "smitom", scale: 0.8, x: -30 },
                    { spriteType: "save", scale: 1, x: 30, key: "save" }
                ],
                text: i18next.t("tutorial:permaMoney.text.2"),
                title: i18next.t("tutorial:permaMoney.title")
            }],
            isTipActive: false
        });
    }

    private registerSavingTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SAVING_1, {
            title: i18next.t("tutorial:saving.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 99,
                        scale: 0.25,
                        x: 0,
                        key: "smitty_logo"
                    },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.16, x: 15 }
                ],
                text: i18next.t("tutorial:saving.text.1"),
                title: i18next.t("tutorial:saving.title")
            },
            {
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 11,
                        scale: 0.25,
                        x: 0,
                        key: "smitty_logo"
                    },
                    { key: "smitems_192", frame: "permaMoney", scale: 0.16, x: 15 }
                ],
                text: i18next.t("tutorial:saving.text.2"),
                title: i18next.t("tutorial:saving.title")
            }],
            isTipActive: false
        });
    }

    private registerBountiesTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.BOUNTIES_1, {
            title: i18next.t("tutorial:bounties.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaPostBattleMoney", scale: 0.16 }
                ],
                text: i18next.t("tutorial:bounties.text.1"),
                title: i18next.t("tutorial:bounties.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaStartMoney", scale: 0.16 }
                ],
                text: i18next.t("tutorial:bounties.text.2"),
                title: i18next.t("tutorial:bounties.title")
            }],
            isTipActive: false
        });
    }

    private registerDailyBountyTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.DAILY_BOUNTY, {
            title: i18next.t("tutorial:dailyBounty.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaPostBattleMoney", scale: 0.16 }
                ],
                text: i18next.t("tutorial:dailyBounty.text"),
                title: i18next.t("tutorial:dailyBounty.title")
            }],
            isTipActive: false
        });
    }

    private registerDiscordTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.DISCORD, {
            title: i18next.t("tutorial:discord.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 68,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:discord.text"),
                title: i18next.t("tutorial:discord.title")
            }],
            isTipActive: false
        });
    }

    private registerSmittyFormsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SMITTY_FORMS_1, {
            title: i18next.t("tutorial:smittyForms.title"),
            stages: [{
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "plustra", scale: 0.8 }
                ],
                text: i18next.t("tutorial:smittyForms.text.1"),
                title: i18next.t("tutorial:smittyForms.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.ROTOM).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.ROTOM).getIconId(false), 
                        scale: 0.9, 
                        x: -30 
                    },
                    { key: "pokemon_icons_glitch", frame: "smitom", scale: 0.8, x: 30 }
                ],
                text: i18next.t("tutorial:smittyForms.text.2"),
                title: i18next.t("tutorial:smittyForms.title")
            },
            {
                sprites: [
                    { 
                        key: getPokemonSpecies(Species.CATERPIE).getIconAtlasKey(), 
                        frame: getPokemonSpecies(Species.CATERPIE).getIconId(false), 
                        scale: 0.9, 
                        x: -30 
                    },
                    { key: "pokemon_icons_glitch", frame: "picklisk", scale: 0.8, x: 30 }
                ],
                text: i18next.t("tutorial:smittyForms.text.3"),
                title: i18next.t("tutorial:smittyForms.title")
            }],
            isTipActive: false
        });
    }

    private registerSmittyFormsUnlockedTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1, {
            title: i18next.t("tutorial:smittyFormUnlocked.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.16 }
                ],
                text: i18next.t("tutorial:smittyFormUnlocked.text.1"),
                title: i18next.t("tutorial:smittyFormUnlocked.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "smittyMask", scale: 0.16, x: -45 },
                    { key: "smitems_192", frame: "smittyFuel", scale: 0.16, x: -15 },
                    { key: "smitems_192", frame: "smittyEssence", scale: 0.16, x: 15 },
                    { key: "smitems_192", frame: "smittyEnergy", scale: 0.16, x: 45 }
                ],
                text: i18next.t("tutorial:smittyFormUnlocked.text.2"),
                title: i18next.t("tutorial:smittyFormUnlocked.title")
            },
            {
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 96,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:smittyFormUnlocked.text.3"),
                title: i18next.t("tutorial:smittyFormUnlocked.title")
            }],
            isTipActive: false
        });
    }

    private registerSmittyItemsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SMITTY_ITEMS_1, {
            title: i18next.t("tutorial:smittyItems.title"),
            stages: [
            {
                sprites: [
                    { key: "smitems_192", frame: "permaMoney", scale: 0.16, x: -40 },
                    { key: "smitems_192", frame: "permaMetronomeLevelup", scale: 0.16, x: 0 },
                    { key: "smitems_192", frame: "permaMoreRewardChoice", scale: 0.16, x: 40 }
                ],
                text: i18next.t("tutorial:smittyItems.text.1"),
                title: i18next.t("tutorial:smittyItems.title")
            },
            {
                sprites: [
                    { key: "smitems_192", frame: "permaShiny", scale: 0.16, x: -45 },
                    { key: "smitems_192", frame: "permaCatchRate", scale: 0.16, x: -15 },
                    { key: "smitems_192", frame: "permaFusionIncrease", scale: 0.16, x: 15 },
                    { key: "smitems_192", frame: "permaTrainerSnatchCost", scale: 0.16, x: 45 }
                ],
                text: i18next.t("tutorial:smittyItems.text.2"),
                title: i18next.t("tutorial:smittyItems.title")
            }],
            isTipActive: false
        });
    }

    private registerAbilitySwitcherTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ABILITY_SWITCHER, {
            title: i18next.t("tutorial:abilitySwitcher.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchAbilitySwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:abilitySwitcher.text"),
                title: i18next.t("tutorial:abilitySwitcher.title")
            }],
            isTipActive: false
        });
    }

    private registerTypeSwitcherTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.TYPE_SWITCHER, {
            title: i18next.t("tutorial:typeSwitcher.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:typeSwitcher.text"),
                title: i18next.t("tutorial:typeSwitcher.title")
            }],
            isTipActive: false
        });
    }

    private registerPrimarySwitcherTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.PRIMARY_SWITCHER, {
            title: i18next.t("tutorial:primarySwitcher.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:primarySwitcher.text"),
                title: i18next.t("tutorial:primarySwitcher.title")
            }],
            isTipActive: false
        });
    }

    private registerSecondarySwitcherTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SECONDARY_SWITCHER, {
            title: i18next.t("tutorial:secondarySwitcher.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchTypeSwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:secondarySwitcher.text"),
                title: i18next.t("tutorial:secondarySwitcher.title")
            }],
            isTipActive: false
        });
    }

    private registerReleaseItemsTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.RELEASE_ITEMS_1, {
            title: i18next.t("tutorial:releaseItems.title"),
            stages: [
                {
                    sprites: [
                        { key: "smitems_192", frame: "modPokeSacrifice", scale: 0.16 }
                    ],
                    text: i18next.t("tutorial:releaseItems.text.1"),
                    title: i18next.t("tutorial:releaseItems.title")
                },
                {
                    sprites: [
                        { key: "smitems_192", frame: "modSoulCollected", scale: 0.16 }
                    ],
                    text: i18next.t("tutorial:releaseItems.text.2"),
                    title: i18next.t("tutorial:releaseItems.title")
                }
            ],
            isTipActive: false
        });
    }

    private registerAnyTMsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ANY_TMS, {
            title: i18next.t("tutorial:anyTMs.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchTm", scale: 0.16 }
                ],
                text: i18next.t("tutorial:anyTMs.text"),
                title: i18next.t("tutorial:anyTMs.title")
            }],
            isTipActive: false
        });
    }

    private registerAnyAbilitiesTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.ANY_ABILITIES, {
            title: i18next.t("tutorial:anyAbilities.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchAbilitySwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:anyAbilities.text"),
                title: i18next.t("tutorial:anyAbilities.title")
            }],
            isTipActive: false
        });
    }

    private registerStatSwitchersTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.STAT_SWITCHERS, {
            title: i18next.t("tutorial:statSwitchers.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "glitchStatSwitch", scale: 0.16 }
                ],
                text: i18next.t("tutorial:statSwitchers.text"),
                title: i18next.t("tutorial:statSwitchers.title")
            }],
            isTipActive: false
        });
    }

    private registerNewQuestsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.NEW_QUESTS, {
            title: i18next.t("tutorial:newQuests.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "quest", scale: 0.16, x: 0 },
                    { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 10 }
                ],
                text: i18next.t("tutorial:newQuests.text"),
                title: i18next.t("tutorial:newQuests.title")
            }],
            isTipActive: false
        });
    }

    private registerModeUnlocksTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.MODE_UNLOCKS, {
            title: i18next.t("tutorial:modeUnlocks.title"),
            stages: [{
                sprites: [
                    { key: "smitems_192", frame: "permaShowRewards", scale: 0.16 }
                ],
                text: i18next.t("tutorial:modeUnlocks.text"),
                title: i18next.t("tutorial:modeUnlocks.title")
            }],
            isTipActive: false
        });
    }

    private registerFirstVictoryTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.FIRST_VICTORY, {
            title: i18next.t("tutorial:firstVictory.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 45,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:firstVictory.text"),
                title: i18next.t("tutorial:firstVictory.title")
            }],
            isTipActive: false
        });
    }

    private registerTheVoidUnlockedTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.THE_VOID_UNLOCKED, {
            title: i18next.t("tutorial:theVoidUnlocked.title"),
            stages: [{
                sprites: [
                     { key: "pokemon_icons_glitch", frame: "tengale", scale: 0.8 }
                ],
                text: i18next.t("tutorial:theVoidUnlocked.text"),
                title: i18next.t("tutorial:theVoidUnlocked.title")
            }],
            isTipActive: false
        });
    }

    private registerTheVoidOvertakenTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.THE_VOID_OVERTAKEN, {
            title: i18next.t("tutorial:theVoidOvertaken.title"),
            stages: [{
                sprites: [
                    { 
                        spriteType: 'smitty_logo',
                        smittyLogoId: 21,
                        scale: 0.25,
                        key: "smitty_logo"
                    }
                ],
                text: i18next.t("tutorial:theVoidOvertaken.text"),
                title: i18next.t("tutorial:theVoidOvertaken.title")
            }],
            isTipActive: false
        });
    }

    private registerMegaDynamaxTutorials(): void {
        this.tutorialConfigs.set(EnhancedTutorial.MEGA_DYNAMAX_1, {
            title: i18next.t("tutorial:megaDynamax.title"),
            stages: [
                {
                    sprites: [
                        { key: "items", frame: "dynamax_band", scale: 1, x: -30 },
                        { key: "items", frame: "mega_bracelet", scale: 1, x: 30 }
                    ],
                    text: i18next.t("tutorial:megaDynamax.text.1"),
                    title: i18next.t("tutorial:megaDynamax.title")
                },
                {
                    sprites: [
                        { 
                            key: getPokemonSpecies(Species.ALAKAZAM).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.ALAKAZAM).getIconId(false), 
                            scale: 0.9, 
                            x: 0
                        },
                        { key: "items", frame: "alakazite", scale: .8, x: 10 }
                    ],
                    text: i18next.t("tutorial:megaDynamax.text.2"),
                    title: i18next.t("tutorial:megaDynamax.title")
                },
                {
                    sprites: [
                        { key: "items", frame: "dynamax_band", scale: 1, x: 0, y: -10 },
                        { key: "items", frame: "mega_bracelet", scale: 1, x: 0, y: 10 },
                        { key: "smitems_192", frame: "exclamationMark", scale: 0.12, x: 10 }
                    ],
                    text: i18next.t("tutorial:megaDynamax.text.3"),
                    title: i18next.t("tutorial:megaDynamax.title")
                }
            ],
            isTipActive: false
        });
    }

    private registerPokerogueTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.POKEROGUE_1, {
            title: i18next.t("tutorial:pokerogue.title"),
            stages: [
                {
                    sprites: [
                        { 
                            key: getPokemonSpecies(Species.KINGAMBIT).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.KINGAMBIT).getIconId(false), 
                            scale: 1.0, 
                            x: 0,
                            y: -5
                        },
                        { 
                            key: getPokemonSpecies(Species.PAWNIARD).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.PAWNIARD).getIconId(false), 
                            scale: 0.7, 
                            x: -25,
                            flipX: true
                        }
                    ],
                    text: i18next.t("tutorial:pokerogue.text.1"),
                    title: i18next.t("tutorial:pokerogue.title")
                },
                {
                    sprites: [
                        { 
                            key: getPokemonSpecies(Species.ARCEUS).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.ARCEUS).getIconId(false), 
                            scale: 1, 
                            x: 0 
                        }
                    ],
                    text: i18next.t("tutorial:pokerogue.text.2"),
                    title: i18next.t("tutorial:pokerogue.title")
                },
                {
                    sprites: [
                        { 
                            key: getPokemonSpecies(Species.DARKRAI).getIconAtlasKey(), 
                            frame: getPokemonSpecies(Species.DARKRAI).getIconId(false), 
                            scale: 1, 
                            x: 0 
                        }
                    ],
                    text: i18next.t("tutorial:pokerogue.text.3"),
                    title: i18next.t("tutorial:pokerogue.title")
                },
                {
                    sprites: [
                        { 
                            spriteType: 'smitty_logo',
                            smittyLogoId: 60,
                            scale: 0.25,
                            key: "smitty_logo"
                        }
                    ],
                    text: i18next.t("tutorial:pokerogue.text.4"),
                    title: i18next.t("tutorial:pokerogue.title")
                }
            ],
            isTipActive: false
        });
    }
} 