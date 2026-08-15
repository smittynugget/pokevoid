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
    MOVE_UPGRADES_EX = "MOVE_UPGRADES_EX",
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
    CHAOS_AND_GAUNTLET_MODES = "CHAOS_AND_GAUNTLET_MODES",
    THANK_YOU = "THANK_YOU",

    POKEVOID_V2_UPDATE = "POKEVOID_V2_UPDATE",
    FTL_MODE_SELECT = "FTL_MODE_SELECT",
    FIRST_TIME_FTL_SKILLTREE_SELECTION = "FIRST_TIME_FTL_SKILLTREE_SELECTION",
    CHAMPION_SELECT_ESSENCE = "CHAMPION_SELECT_ESSENCE",
    CHAMPION_SELECT_SPECIAL_ESSENCES = "CHAMPION_SELECT_SPECIAL_ESSENCES",
    SPECIAL_ESSENCES_INTRO = "SPECIAL_ESSENCES_INTRO",
    SPECIAL_ESSENCES_GLITCH = "SPECIAL_ESSENCES_GLITCH",
    SPECIAL_ESSENCES_SMITTY = "SPECIAL_ESSENCES_SMITTY",
    SKILLTREE_APOLLO_DIANA_TYPES = "SKILLTREE_APOLLO_DIANA_TYPES",
    SKILLTREE_SET_TYPES = "SKILLTREE_SET_TYPES",
    SKILLTREE_PROGRESSION = "SKILLTREE_PROGRESSION",
    STARTER_SELECT_CATCH_REQUIREMENTS = "STARTER_SELECT_CATCH_REQUIREMENTS",
    STARTER_SELECT_SIGNATURE = "STARTER_SELECT_SIGNATURE",
    COMMAND_UI_NEW_COMMANDS = "COMMAND_UI_NEW_COMMANDS",
}
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
    public getTutorialConfig(tutorial: Tutorial | EnhancedTutorial): TutorialConfig | undefined {
        return this.tutorialConfigs.get(tutorial);
    }
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
        this.registerChaosAndGauntletModesTutorial();
        this.registerThankYouTutorial();

        this.registerPokevoidV2UpdateTutorial();
        this.registerFTLModeSelectTutorial();
        this.registerFirstTimeFtlSkillTreeSelectionTutorial();
        this.registerChampionSelectEssenceTutorial();
        this.registerChampionSelectSpecialEssencesTutorial();
        this.registerSpecialEssencesIntroTutorial();
        this.registerSpecialEssencesGlitchTutorial();
        this.registerSpecialEssencesSmittyTutorial();
        this.registerSkillTreeApolloDianaTypesTutorial();
        this.registerSkillTreeSetTypesTutorial();
        this.registerSkillTreeProgressionTutorial();
        this.registerStarterSelectCatchRequirementsTutorial();
        this.registerStarterSelectSignatureTutorial();
        this.registerCommandUINewCommandsTutorial();
    }
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
                sprites: [{ key: "logo", scale: 0.2 }],
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
        this.tutorialConfigs.set(EnhancedTutorial.MOVE_UPGRADES_EX, {
            title: i18next.t("tutorial:moveUpgrades.title"),
            stages: [{
                sprites: [
                    { key: "smitems", frame: "smittyCrystal", scale: 0.36, x: -40, y: 0 },
                    { key: "smitems", frame: "smittyHumor", scale: 0.36, x: 0, y: 0 },
                    { key: "smitems", frame: "smittyCrystal", scale: 0.36, x: 40, y: 0 },
                ],
                text: i18next.t("tutorial:moveUpgrades.text.1"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                    { key: "items", frame: "tm_dragon", scale: 1, x: 0, y: 0 },
                    { key: "smitems", frame: "permaLongerStatBoosts", scale: 0.52, x: 20, y: 0, flipX: true },
                ],
                text: i18next.t("tutorial:moveUpgrades.text.2"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52, x: -10 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }

                ],
                text: i18next.t("tutorial:moveUpgrades.text.3"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                    {
                        key: getPokemonSpecies(Species.MAGIKARP).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.MAGIKARP).getIconId(false),
                        scale: 0.9,
                        x: -30
                    },
                    {
                        key: getPokemonSpecies(Species.MAGIKARP).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.MAGIKARP).getIconId(false),
                        scale: 0.9,
                        x: 0
                    },
                    {
                        key: getPokemonSpecies(Species.MAGIKARP).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.MAGIKARP).getIconId(false),
                        scale: 0.9,
                        x: 30
                    }

                ],
                text: i18next.t("tutorial:moveUpgrades.text.4"),
                title: i18next.t("tutorial:moveUpgrades.title")
            },
            {
                sprites: [
                   {

                        key: getPokemonSpecies(Species.GYARADOS).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.GYARADOS).getIconId(true, 1),
                        scale: 1.2,
                        x: 0
                    }
                ],
                text: i18next.t("tutorial:moveUpgrades.text.5"),
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
                    { key: "smitems", frame: "permaStarterPointLimitInc", scale: 0.52, x: 0, y: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 15, y: 0 },
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.1"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.1")
            },
            {
                sprites: [
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
                    { key: "smitems", frame: "permaTransferTera", scale: 0.20, x: 0, y: 0 },

                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.3"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.2")
            },
            {
                sprites: [
                    { key: "discord", scale: 0.125 }
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.4"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.2")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaFreeReroll", scale: 0.52, x: 0, y: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 15, y: 0 },
                ],
                text: i18next.t("tutorial:firstMoveUpgrade.text.5"),
                title: i18next.t("tutorial:firstMoveUpgrade.title.5")
            },
            {
                sprites: [
                    { key: "smitems", frame: "glitchStatSwitch", scale: 0.20, x: 0, y: 0 },
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
                    { key: "smitems", frame: "permaLongerStatBoosts", scale: 0.52, x: -20, y: -10 },
                    { key: "smitems", frame: "permaStarterPointLimitInc", scale: 0.52, x: 20, y: -10 },
                    {
                        key: getPokemonSpecies(Species.UMBREON).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.UMBREON).getIconId(false),
                        scale: 1.1,
                        x: 0
                    },

                ],
                text: i18next.t("tutorial:legendary.text.1"),
                title: i18next.t("tutorial:legendary.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "glitchStatSwitch", scale: 0.52, x: -50 },
                    { key: "smitems", frame: "glitchTm", scale: 0.52, x: -15 },
                    { key: "smitems", frame: "modPassiveAbility", scale: 0.52, x: 20 },
                    { key: "smitems", frame: "glitchTypeSwitch", scale: 0.52, x: 55 }
                ],
                text: i18next.t("tutorial:legendary.text.2"),
                title: i18next.t("tutorial:legendary.title")
            },
            {
                sprites: [
                    { key: "red", scale: 0.7, x: 0 },
                    { key: "smitems", frame: "smittyVoid", scale: 0.52, x: 20 }
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
                    { key: "smitems", frame: "quest", scale: 0.52, x: 10 },
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
                    { key: "smitems", frame: "exclamationMark", scale: 0.52, x: -30 },
                    { key: "smitems", frame: "permaMoney", scale: 0.52, x: 30 }
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
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }

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
                    { key: "smitems", frame: "permaTransferTera", scale: 0.36, x: 10, y: 0 }
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
                    { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.52 }
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
                    { key: "smitems", frame: "permaRunAnything", scale: 0.52 }
                ],
                text: i18next.t("tutorial:runHistory.text.1"),
                title: i18next.t("tutorial:runHistory.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "modPassiveAbility", scale: 0.52, x: -30 },
                    { key: "smitems", frame: "permaStartBall", scale: 0.52, x: 30 }
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
                    { key: "smitems", frame: "permaRunAnything", scale: 0.52, x: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 15 }
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
                    { key: "smitems", frame: "permaFreeReroll", scale: 0.36, x: -10, y: 5 },
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
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52 }
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
                    { key: "pokemon_icons_glitch", frame: "regimeteor", scale: 0.36, x: -80, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "necromew", scale: 0.36, x: -40, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "charisand", scale: 0.36, x: 0, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "mentasaur", scale: 0.36, x: 40, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "enchantoise", scale: 0.36, x: 80, y: -10 },
                    { key: "pokemon_icons_glitch", frame: "picklisk", scale: 0.36, x: -80, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "bogace", scale: 0.36, x: -40, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "kakopier", scale: 0.36, x: 0, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "voidash", scale: 0.36, x: 40, y: 10 },
                    { key: "pokemon_icons_glitch", frame: "plankling", scale: 0.36, x: 80, y: 10 }
                ],
                text: i18next.t("tutorial:newForms.text.1"),
                title: i18next.t("tutorial:newForms.title")
            },
            {
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "ririkyu", scale: 0.8, x: 0 },
                    { key: "smitems", frame: "quest", scale: 0.52, x: 15 }
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
                    { key: "discord", scale: 0.125, x: 0 },
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
                    { key: "smitems", frame: "permaShiny", scale: 0.52 }
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
                    { key: "smitems", frame: "permaStartBall", scale: 0.52 }
                ],
                text: i18next.t("tutorial:journey.text.1"),
                title: i18next.t("tutorial:journey.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaStarterPointLimitInc", scale: 0.52, x: -30 },
                    { key: "smitems", frame: "permaCheaperFusions", scale: 0.52, x: 30 }
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
                    { key: "smitems", frame: "quest", scale: 0.52, x: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
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
                    { key: "smitems", frame: "draftMode", scale: 0.2 }
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
                    { key: "smitems", frame: "modPassiveAbility", scale: 0.52 }
                ],
                text: i18next.t("tutorial:passiveAbilities.text.1"),
                title: i18next.t("tutorial:passiveAbilities.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "modPassiveAbility", scale: 0.52, x: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.52, x: 15 }
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
                    { key: "smitems", frame: "glitchPiece", scale: 0.52 }
                ],
                text: i18next.t("tutorial:glitchItems.text.1"),
                title: i18next.t("tutorial:glitchItems.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "glitchTm", scale: 0.52, x: -52 },
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52, x: -17 },
                    { key: "smitems", frame: "glitchTypeSwitch", scale: 0.52, x: 18 },
                    { key: "smitems", frame: "glitchStatSwitch", scale: 0.52, x: 53 }
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
                    { key: "smitems", frame: "permaFusionIncrease", scale: 0.52 }
                ],
                text: i18next.t("tutorial:fusionPokemon.text.1"),
                title: i18next.t("tutorial:fusionPokemon.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaFusionIncrease", scale: 0.52 }
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
                    { key: "smitems", frame: "permaTrainerSnatchCost", scale: 0.52 }
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
                    { key: "smitems", frame: "permaPartyAbility", scale: 0.52 }
                ],
                text: i18next.t("tutorial:partyAbility.text.1"),
                title: i18next.t("tutorial:partyAbility.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaPartyAbility", scale: 0.36, x: 0, y: -15 },
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
                    { key: "smitems", frame: "permaMoney", scale: 0.52 }
                ],
                text: i18next.t("tutorial:permaMoney.text.1"),
                title: i18next.t("tutorial:permaMoney.title")
            },
            {
                sprites: [
                    { key: "pokemon_icons_glitch", frame: "smitom", scale: 0.8, x: -30 },
                    { spriteType: "save", scale: 2, x: 30, key: "save" }
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
                    { spriteType: "save", scale: 2, x: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.52, x: 15 }
                ],
                text: i18next.t("tutorial:saving.text.1"),
                title: i18next.t("tutorial:saving.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaMoney", scale: 0.52, x: 15 }
                ],
                text: i18next.t("tutorial:saving.text.2"),
                title: i18next.t("tutorial:saving.title")
            }],
            isTipActive: false
        });
    }

    private registerDiscordTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.DISCORD, {
            title: i18next.t("tutorial:discord.title"),
            stages: [{
                sprites: [
                    { key: "discord", scale: 0.125 }
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
                    { key: "smitems", frame: "exclamationMark", scale: 0.52 }
                ],
                text: i18next.t("tutorial:smittyFormUnlocked.text.1"),
                title: i18next.t("tutorial:smittyFormUnlocked.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "smittyMask", scale: 0.52, x: -45 },
                    { key: "smitems", frame: "smittyFuel", scale: 0.52, x: -15 },
                    { key: "smitems", frame: "smittyEssence", scale: 0.52, x: 15 },
                    { key: "smitems", frame: "smittyEnergy", scale: 0.52, x: 45 }
                ],
                text: i18next.t("tutorial:smittyFormUnlocked.text.2"),
                title: i18next.t("tutorial:smittyFormUnlocked.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "smittyEssence", scale: 0.52 }
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
                    { key: "smitems", frame: "permaMoney", scale: 0.52, x: -40 },
                    { key: "smitems", frame: "permaMetronomeLevelup", scale: 0.52, x: 0 },
                    { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.52, x: 40 }
                ],
                text: i18next.t("tutorial:smittyItems.text.1"),
                title: i18next.t("tutorial:smittyItems.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaShiny", scale: 0.52, x: -45 },
                    { key: "smitems", frame: "permaCatchRate", scale: 0.52, x: -15 },
                    { key: "smitems", frame: "permaFusionIncrease", scale: 0.52, x: 15 },
                    { key: "smitems", frame: "permaTrainerSnatchCost", scale: 0.52, x: 45 }
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
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchTypeSwitch", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchTypeSwitch", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchTypeSwitch", scale: 0.52 }
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
                        { key: "smitems", frame: "modPokeSacrifice", scale: 0.52 }
                    ],
                    text: i18next.t("tutorial:releaseItems.text.1"),
                    title: i18next.t("tutorial:releaseItems.title")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "modSoulCollected", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchTm", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52 }
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
                    { key: "smitems", frame: "glitchStatSwitch", scale: 0.52 }
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
                    { key: "smitems", frame: "quest", scale: 0.52, x: 0 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
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
                    { key: "smitems", frame: "permaShowRewards", scale: 0.52 }
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
                    { key: "items", frame: "ribbon_gen9" }
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
                    { key: "void_portal", scale: 0.28 }
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
                        { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
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
                        { key: "logo", scale: 0.25 }
                    ],
                    text: i18next.t("tutorial:pokerogue.text.4"),
                    title: i18next.t("tutorial:pokerogue.title")
                }
            ],
            isTipActive: false
        });
    }

    private registerChaosAndGauntletModesTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.CHAOS_AND_GAUNTLET_MODES, {
            title: i18next.t("tutorial:chaosAndGauntletModes.title.1"),
            stages: [{
                sprites: [
                    { key: "smitems", frame: "glitchAbilitySwitch", scale: 0.52, x: -10 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
                ],
                text: i18next.t("tutorial:chaosAndGauntletModes.text.1"),
                title: i18next.t("tutorial:chaosAndGauntletModes.title.1")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaMoreRevive", scale: 0.52, x: -10 },
                    { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
                ],
                text: i18next.t("tutorial:chaosAndGauntletModes.text.2"),
                title: i18next.t("tutorial:chaosAndGauntletModes.title.2")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaPostBattleMoney", scale: 0.52 }
                ],
                text: i18next.t("tutorial:chaosAndGauntletModes.text.3"),
                title: i18next.t("tutorial:chaosAndGauntletModes.title.3")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaMetronomeLevelup", scale: 0.52 }
                ],
                text: i18next.t("tutorial:chaosAndGauntletModes.text.4"),
                title: i18next.t("tutorial:chaosAndGauntletModes.title.4")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaLongerStatBoosts", scale: 0.52, x: -20, y: -10 },
                    { key: "smitems", frame: "permaStarterPointLimitInc", scale: 0.52, x: 20, y: -10 },
                    {
                        key: getPokemonSpecies(Species.CHARIZARD).getIconAtlasKey(),
                        frame: getPokemonSpecies(Species.CHARIZARD).getIconId(false),
                        scale: 1.1,
                        x: 0
                    }
                ],
                text: i18next.t("tutorial:chaosAndGauntletModes.text.5"),
                title: i18next.t("tutorial:chaosAndGauntletModes.title.5")
            }
            ],
            isTipActive: false,
        });
    }

    private registerThankYouTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.THANK_YOU, {
            title: i18next.t("tutorial:thankYou.title"),
            stages: [{
                sprites: [
                    { key: "logo", scale: 0.25 }
                ],
                text: i18next.t("tutorial:thankYou.text.1"),
                title: i18next.t("tutorial:thankYou.title")
            },
            {
                sprites: [
                    { key: "smitems", frame: "permaPartyAbility", scale: 0.36, x: 0, y: -15 },
                    { key: "player_m", scale: 0.36, x: -40, y: 10 },
                    { key: "player_f", scale: 0.36, x: -13, y: 10 },
                    { key: "brock", scale: 0.36, x: 13, y: 10 },
                    { key: "misty", scale: 0.36, x: 40, y: 10 }
                ],
                text: i18next.t("tutorial:thankYou.text.2"),
                title: i18next.t("tutorial:thankYou.title")
            }],
            isTipActive: false,

        });
    }

    private registerPokevoidV2UpdateTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.POKEVOID_V2_UPDATE, {
            title: i18next.t("tutorial:pokevoidV2Update.title"),
            stages: [
                {
                    sprites: [
                        { key: "smitems", frame: "permaLongerStatBoosts", scale: 0.65, x: 0, y: -7 },
                        { key: "logo", scale: 0.13, x: 0, y: 5 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.1"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.1")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "permaNewNormal", scale: 0.52, x: -30 },
                        { key: "items", frame: "ribbon_gen9", scale: 0.7, x: 0 },
                        { key: "smitems", frame: "permaShowRewards", scale: 0.52, x: 30 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.2"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.2")
                },
                {
                    sprites: [
                        { key: "player_m", scale: 0.3, x: -10 },
                        {
                            key: getPokemonSpecies(Species.SOLROCK).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.SOLROCK).getIconId(false),
                            scale: 0.9,
                            x: 10,
                            flipX: true
                        }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.3a"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.3a")
                },
                {
                    sprites: [
                        { key: "player_f", scale: 0.3, x: -10 },
                        {
                            key: getPokemonSpecies(Species.LUNATONE).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.LUNATONE).getIconId(false),
                            scale: 0.9,
                            x: 10,
                            flipX: true
                        }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.3b"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.3b")
                },
                {
                    sprites: [
                        { key: "player_m", scale: 0.22, x: -36 },
                        { key: "brock", scale: 0.45, x: -12, alpha: 0.85 },
                        { key: "player_f", scale: 0.22, x: 12 },
                        { key: "misty", scale: 0.45, x: 36, alpha: 0.85 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.4"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.4")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "permaMoreRevive", scale: 0.52 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.5"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.5")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "smittyChaos", scale: 0.52, x: -20 },
                        { key: "smitems", frame: "smittyEnergy", scale: 0.52, x: 20 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.6"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.6")
                },
                {
                    sprites: [
                        { key: "items", frame: "map", scale: 0.7, x: -30, y: -15 },
                        { key: "items", frame: "scanner", scale: 0.7, x: 0, y: -15 },
                        { key: "smitems", frame: "permaMoreRevive", scale: 0.26, x: 30, y: -15 },
                        { key: "smitems", frame: "permaMoney", scale: 0.26, x: -30, y: 15 },
                        { spriteType: 'egg', eggStage: 0, scale: 0.35, x: 0, y: 15, key: "egg" },
                        { key: "smitems", frame: "permaPartyAbility", scale: 0.26, x: 30, y: 15 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.7"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.7")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.52, x: -15 },
                        { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.52, x: 0, inverted: true },
                        { key: "smitems", frame: "permaMoreRewardChoice", scale: 0.52, x: 15 }
                    ],
                    text: i18next.t("tutorial:pokevoidV2Update.text.8"),
                    title: i18next.t("tutorial:pokevoidV2Update.title.8")
                }
            ],
            isTipActive: false
        });
    }

    private registerFTLModeSelectTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.FTL_MODE_SELECT, {
            title: i18next.t("tutorial:ftlModeSelect.title"),
            stages: [
                {
                    sprites: [
                        { key: "smitems", frame: "smittyChaos", scale: 0.52, x: -20 },
                        { key: "smitems", frame: "smittyEnergy", scale: 0.52, x: 20 }
                    ],
                    text: i18next.t("tutorial:ftlModeSelect.text.1"),
                    title: i18next.t("tutorial:ftlModeSelect.title.1")
                }
            ],
            isTipActive: false
        });
    }

    private registerFirstTimeFtlSkillTreeSelectionTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.FIRST_TIME_FTL_SKILLTREE_SELECTION, {
            title: i18next.t("tutorial:firstTimeFtlSkillTree.title"),
            stages: [
                {
                    sprites: [
                        { key: "smitems", frame: "draftMode", scale: 0.52, x: -10 },
                        { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 15 }
                    ],
                    text: i18next.t("tutorial:firstTimeFtlSkillTree.text.1"),
                    title: i18next.t("tutorial:firstTimeFtlSkillTree.title.1")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "draftMode", scale: 0.52, x: -20, inverted: true },
                        { key: "smitems", frame: "draftMode", scale: 0.52, x: 20 }
                    ],
                    text: i18next.t("tutorial:firstTimeFtlSkillTree.text.2"),
                    title: i18next.t("tutorial:firstTimeFtlSkillTree.title.2")
                }
            ],
            isTipActive: false
        });
    }

    private registerChampionSelectEssenceTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.CHAMPION_SELECT_ESSENCE, {
            title: i18next.t("tutorial:championSelectEssence.title"),
            stages: [
                {
                    sprites: [{ key: "player_m", scale: 0.22, x: -30 }, { key: "player_f", scale: 0.22, x: 30 }],
                    text: i18next.t("tutorial:championSelectEssence.text.1"),
                    title: i18next.t("tutorial:championSelectEssence.title.1")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "permaLongerStatBoosts", scale: 0.65, x: 0 },
                        { key: "smitems", frame: "permaMoreRevive", scale: 0.40, x: 15, y:-3 }
                    ],
                    text: i18next.t("tutorial:championSelectEssence.text.3"),
                    title: i18next.t("tutorial:championSelectEssence.title.3")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "modSoulCollected", scale: 0.52, x: -20 },
                        { key: "smitems", frame: "modSoulCollected", scale: 0.52, x: 0, inverted: true },
                        { key: "smitems", frame: "modSoulCollected", scale: 0.52, x: 20 }
                    ],
                    text: i18next.t("tutorial:championSelectEssence.text.2"),
                    title: i18next.t("tutorial:championSelectEssence.title.2")
                }
            ],
            isTipActive: false
        });
    }

    private registerChampionSelectSpecialEssencesTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.CHAMPION_SELECT_SPECIAL_ESSENCES, {
            title: i18next.t("tutorial:championSelectSpecialEssences.title"),
            stages: [
                {
                    sprites: [
                        { key: "smitems", frame: "glitchPiece", scale: 0.36, x: -25 },
                        { key: "smitems", frame: "modSoulCollected", scale: 0.65, x: 0, inverted: true },
                        { key: "smitems", frame: "smittyEssence", scale: 0.36, x: 25 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.1"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.1")
                },
                {
                    sprites: [
                        { key: "pokemon_icons_glitch", frame: "charisand", scale: 0.8, x: -35 },
                        { key: "pokemon_icons_glitch", frame: "mentasaur", scale: 0.85, x: 0 },
                        { key: "pokemon_icons_glitch", frame: "enchantoise", scale: 0.85, x: 35 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.2"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.2")
                },
                {
                    sprites: [
                        { key: "smitty_trainers", frame: "1", scale: 0.35, x: -30 },
                        { key: "smitty_trainers", frame: "3", scale: 0.35, x: 0 },
                        { key: "smitty_trainers", frame: "5", scale: 0.35, x: 30 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.3"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.3")
                }
            ],
            isTipActive: false
        });
    }

    private registerSpecialEssencesIntroTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SPECIAL_ESSENCES_INTRO, {
            title: i18next.t("tutorial:championSelectSpecialEssences.title.1"),
            stages: [
                {
                    sprites: [
                        { key: "smitems", frame: "glitchPiece", scale: 0.36, x: -25 },
                        { key: "smitems", frame: "modSoulCollected", scale: 0.65, x: 0, inverted: true },
                        { key: "smitems", frame: "smittyEssence", scale: 0.36, x: 25 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.1"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.1")
                }
            ],
            isTipActive: false
        });
    }

    private registerSpecialEssencesGlitchTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SPECIAL_ESSENCES_GLITCH, {
            title: i18next.t("tutorial:championSelectSpecialEssences.title.2"),
            stages: [
                {
                    sprites: [
                        { key: "pokemon_icons_glitch", frame: "charisand", scale: 0.8, x: -35 },
                        { key: "pokemon_icons_glitch", frame: "mentasaur", scale: 0.85, x: 0 },
                        { key: "pokemon_icons_glitch", frame: "enchantoise", scale: 0.85, x: 35 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.2"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.2")
                }
            ],
            isTipActive: false
        });
    }

    private registerSpecialEssencesSmittyTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SPECIAL_ESSENCES_SMITTY, {
            title: i18next.t("tutorial:championSelectSpecialEssences.title.3"),
            stages: [
                {
                    sprites: [
                        { key: "smitty_trainers", frame: "1", scale: 0.35, x: -30 },
                        { key: "smitty_trainers", frame: "3", scale: 0.35, x: 0 },
                        { key: "smitty_trainers", frame: "5", scale: 0.35, x: 30 }
                    ],
                    text: i18next.t("tutorial:championSelectSpecialEssences.text.3"),
                    title: i18next.t("tutorial:championSelectSpecialEssences.title.3")
                }
            ],
            isTipActive: false
        });
    }

    private registerSkillTreeApolloDianaTypesTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SKILLTREE_APOLLO_DIANA_TYPES, {
            title: i18next.t("tutorial:skillTreeApolloDianaTypes.title"),
            stages: [
                {
                    sprites: [
                        { key: "player_m", scale: 0.3, x: -20 },
                        { key: "player_f", scale: 0.3, x: 20 }
                    ],
                    text: i18next.t("tutorial:skillTreeApolloDianaTypes.text.1"),
                    title: i18next.t("tutorial:skillTreeApolloDianaTypes.title.1")
                }
            ],
            isTipActive: false
        });
    }

    private registerSkillTreeSetTypesTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SKILLTREE_SET_TYPES, {
            title: i18next.t("tutorial:skillTreeSetTypes.title"),
            stages: [
                {
                    sprites: [{ key: "brock", scale: 0.6, x: -30 }, { key: "misty", scale: 0.6, x: 30 }],
                    text: i18next.t("tutorial:skillTreeSetTypes.text.1"),
                    title: i18next.t("tutorial:skillTreeSetTypes.title.1")
                },
                {
                    sprites: [{ key: "brock", scale: 0.7, x: 0 }],
                    text: i18next.t("tutorial:skillTreeSetTypes.text.2"),
                    title: i18next.t("tutorial:skillTreeSetTypes.title.2")
                },
                {
                    sprites: [
                        {
                            key: getPokemonSpecies(Species.TYPE_NULL).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.TYPE_NULL).getIconId(false),
                            scale: 1.0,
                            x: 0
                        },
                        { key: "items", frame: "charcoal", scale: 0.5, x: -25, y: -10 },
                        { key: "items", frame: "mystic_water", scale: 0.5, x: 25, y: -10 },
                        { key: "items", frame: "magnet", scale: 0.5, x: -25, y: 10 },
                        { key: "items", frame: "never_melt_ice", scale: 0.5, x: 25, y: 10 }
                    ],
                    text: i18next.t("tutorial:skillTreeSetTypes.text.3"),
                    title: i18next.t("tutorial:skillTreeSetTypes.title.3")
                }
            ],
            isTipActive: false
        });
    }

    private registerSkillTreeProgressionTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.SKILLTREE_PROGRESSION, {
            title: i18next.t("tutorial:skillTreeProgression.title"),
            stages: [
                {
                    sprites: [{ key: "items", frame: "ribbon_gen9", scale: 0.9 }],
                    text: i18next.t("tutorial:skillTreeProgression.text.1"),
                    title: i18next.t("tutorial:skillTreeProgression.title.1")
                },
                {
                    sprites: [{ key: "smitems", frame: "permaMoreRevive", scale: 0.52 }],
                    text: i18next.t("tutorial:skillTreeProgression.text.2"),
                    title: i18next.t("tutorial:skillTreeProgression.title.2")
                }
            ],
            isTipActive: false
        });
    }

    private registerStarterSelectCatchRequirementsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.STARTER_SELECT_CATCH_REQUIREMENTS, {
            title: i18next.t("tutorial:starterSelectCatchRequirements.title"),
            stages: [
                {
                    sprites: [
                        { key: "player_m", scale: 0.3, x: -23 },
                        {
                            key: getPokemonSpecies(Species.SOLROCK).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.SOLROCK).getIconId(false),
                            scale: 0.9,
                            x: -8
                        },
                        { key: "player_f", scale: 0.3, x: 22, flipX: true },
                        {
                            key: getPokemonSpecies(Species.LUNATONE).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.LUNATONE).getIconId(false),
                            scale: 0.9,
                            x: 37,
                            flipX: true
                        }
                    ],
                    text: i18next.t("tutorial:starterSelectCatchRequirements.text.1"),
                    title: i18next.t("tutorial:starterSelectCatchRequirements.title.1")
                },
                {
                    sprites: [
                        { key: "brock", scale: 0.5, x: -13 },
                        {
                            key: getPokemonSpecies(Species.ONIX).getIconAtlasKey(),
                            frame: getPokemonSpecies(Species.ONIX).getIconId(false),
                            scale: 1.05,
                            x: 17,
                            flipX: true
                        }
                    ],
                    text: i18next.t("tutorial:starterSelectCatchRequirements.text.2"),
                    title: i18next.t("tutorial:starterSelectCatchRequirements.title.2")
                },
                {
                    sprites: [{ key: "smitems", frame: "draftMode", scale: 0.52 }],
                    text: i18next.t("tutorial:starterSelectCatchRequirements.text.3"),
                    title: i18next.t("tutorial:starterSelectCatchRequirements.title.3")
                },
                {
                    sprites: [
                        { key: "items", frame: "rb", scale: 1, x: -5 },
                        { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
                    ],
                    text: i18next.t("tutorial:starterSelectCatchRequirements.text.4"),
                    title: i18next.t("tutorial:starterSelectCatchRequirements.title.4")
                }
            ],
            isTipActive: false
        });
    }

    private registerStarterSelectSignatureTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.STARTER_SELECT_SIGNATURE, {
            title: i18next.t("tutorial:starterSelectSignature.title"),
            stages: [
                {
                    sprites: [
                        { key: "pokemon_icons_1", frame: "95", scale: 1.1, x: 0, inverted: true }
                    ],
                    text: i18next.t("tutorial:starterSelectSignature.text.1"),
                    title: i18next.t("tutorial:starterSelectSignature.title.1")
                },
                {
                    sprites: [
                        { key: "pokemon_icons_1", frame: "95", scale: 0.9, x: -5, inverted: true },
                        { key: "smitems", frame: "exclamationMark", scale: 0.36, x: 10 }
                    ],
                    text: i18next.t("tutorial:starterSelectSignature.text.2"),
                    title: i18next.t("tutorial:starterSelectSignature.title.2")
                }
            ],
            isTipActive: false
        });
    }

    private registerCommandUINewCommandsTutorial(): void {
        this.tutorialConfigs.set(EnhancedTutorial.COMMAND_UI_NEW_COMMANDS, {
            title: i18next.t("tutorial:commandUINewCommands.title"),
            stages: [
                {
                    sprites: [
                        { key: "items", frame: "map", scale: 0.7, x: -30, y: -15 },
                        { key: "items", frame: "scanner", scale: 0.7, x: 0, y: -15 },
                        { key: "smitems", frame: "permaMoreRevive", scale: 0.26, x: 30, y: -15 },
                        { key: "smitems", frame: "permaMoney", scale: 0.26, x: -30, y: 15 },
                        { spriteType: 'egg', eggStage: 0, scale: 0.35, x: 0, y: 15, key: "egg" },
                        { key: "smitems", frame: "permaPartyAbility", scale: 0.26, x: 30, y: 15 }
                    ],
                    text: i18next.t("tutorial:commandUINewCommands.text.1"),
                    title: i18next.t("tutorial:commandUINewCommands.title.1")
                },
                {
                    sprites: [{ key: "smitems", frame: "permaPartyAbility", scale: 0.52 }],
                    text: i18next.t("tutorial:commandUINewCommands.text.2"),
                    title: i18next.t("tutorial:commandUINewCommands.title.2")
                },
                {
                    sprites: [
                        { key: "items", frame: "ribbon_gen9", scale: 0.7, x: -20 },
                        { key: "smitems", frame: "permaMoreRevive", scale: 0.52, x: 20 }
                    ],
                    text: i18next.t("tutorial:commandUINewCommands.text.3"),
                    title: i18next.t("tutorial:commandUINewCommands.title.3")
                },
                {
                    sprites: [
                        { key: "items", frame: "scanner", scale: 0.9 }
                    ],
                    text: i18next.t("tutorial:commandUINewCommands.text.4"),
                    title: i18next.t("tutorial:commandUINewCommands.title.4")
                },
                {
                    sprites: [{ spriteType: 'egg', eggStage: 0, scale: 0.5, x: 0, key: "egg" }],
                    text: i18next.t("tutorial:commandUINewCommands.text.5"),
                    title: i18next.t("tutorial:commandUINewCommands.title.5")
                },
                {
                    sprites: [
                        { key: "smitems", frame: "permaMoney", scale: 0.52, x: -20 },
                        { key: "items", frame: "big_nugget", scale: 0.7, x: 20 }
                    ],
                    text: i18next.t("tutorial:commandUINewCommands.text.6"),
                    title: i18next.t("tutorial:commandUINewCommands.title.6")
                },
                {
                    sprites: [{ key: "items", frame: "map", scale: 0.9 }],
                    text: i18next.t("tutorial:commandUINewCommands.text.7"),
                    title: i18next.t("tutorial:commandUINewCommands.title.7")
                }
            ],
            isTipActive: false
        });
    }
}