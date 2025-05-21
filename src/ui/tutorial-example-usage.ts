// import BattleScene from "../battle-scene";
// import { Tutorial } from "../tutorial";
// import { EnhancedTutorial } from "./tutorial-registry";
// import { TutorialService } from "./tutorial-service";

// export function showTutorialsByCategory(scene: BattleScene, category: string, isFromMenu: boolean = false): Promise<void> {
//     const tutorialService = new TutorialService(scene);
    
//     let tutorials: (Tutorial | EnhancedTutorial)[] = [];
//     let title = "";
    
//     console.log(`Showing tutorials for category: ${category}`);
    
//     const categoryMap = {
//         basics: {
//             title: "Game Basics",
//             tutorials: [
//                 EnhancedTutorial.MENU_ACCESS,
//                 EnhancedTutorial.SAVING_1,
//                 EnhancedTutorial.SAVING_2,
//                 EnhancedTutorial.STATS,
//                 EnhancedTutorial.RUN_HISTORY_1,
//                 EnhancedTutorial.RUN_HISTORY_2,
//                 EnhancedTutorial.EGGS_1,
//                 EnhancedTutorial.EGGS_2
//             ]
//         },
//         battles: {
//             title: "Battle Features",
//             tutorials: [
//                 EnhancedTutorial.ABILITIES_1,
//                 EnhancedTutorial.ABILITIES_2,
//                 EnhancedTutorial.PASSIVE_ABILITIES_1,
//                 EnhancedTutorial.PASSIVE_ABILITIES_2,
//                 EnhancedTutorial.PARTY_ABILITY_1,
//                 EnhancedTutorial.PARTY_ABILITY_2,
//                 EnhancedTutorial.MEGA_DYNAMAX_1,
//                 EnhancedTutorial.MEGA_DYNAMAX_2,
//                 EnhancedTutorial.MEGA_DYNAMAX_3,
//                 EnhancedTutorial.MOVE_UPGRADES_1,
//                 EnhancedTutorial.FIRST_MOVE_UPGRADE_1
//             ]
//         },
//         pokemon: {
//             title: "Pokémon Types",
//             tutorials: [
//                 EnhancedTutorial.LEGENDARY_POKEMON_1,
//                 EnhancedTutorial.LEGENDARY_POKEMON_2,
//                 EnhancedTutorial.LEGENDARY_POKEMON_3,
//                 EnhancedTutorial.FUSION_POKEMON_1,
//                 EnhancedTutorial.FUSION_POKEMON_2,
//                 EnhancedTutorial.TRAINER_POKEMON_1,
//                 EnhancedTutorial.TRAINER_POKEMON_2,
//                 EnhancedTutorial.NEW_FORMS_1,
//                 EnhancedTutorial.NEW_FORMS_2,
//                 EnhancedTutorial.BUG_TYPES_1,
//                 EnhancedTutorial.BUG_TYPES_2
//             ]
//         },
//         progression: {
//             title: "Game Progression",
//             tutorials: [
//                 EnhancedTutorial.RIVALS_1,
//                 EnhancedTutorial.RIVALS_2,
//                 EnhancedTutorial.GLITCH_RIVALS_1,
//                 EnhancedTutorial.GLITCH_RIVALS_2,
//                 EnhancedTutorial.RIVAL_QUESTS,
//                 EnhancedTutorial.ENDGAME,
//                 EnhancedTutorial.NUZLIGHT,
//                 EnhancedTutorial.NUZLOCKE,
//                 EnhancedTutorial.JOURNEY_1,
//                 EnhancedTutorial.JOURNEY_2,
//                 EnhancedTutorial.UNLOCK_JOURNEY,
//                 EnhancedTutorial.ROGUE_MODE,
//                 EnhancedTutorial.FIRST_VICTORY,
//                 EnhancedTutorial.THE_VOID_UNLOCKED,
//                 EnhancedTutorial.THE_VOID_OVERTAKEN
//             ]
//         },
//         items: {
//             title: "Items & Currency",
//             tutorials: [
//                 EnhancedTutorial.GLITCH_ITEMS_1,
//                 EnhancedTutorial.GLITCH_ITEMS_2,
//                 EnhancedTutorial.PERMA_MONEY_1,
//                 EnhancedTutorial.PERMA_MONEY_2,
//                 EnhancedTutorial.ABILITY_SWITCHER,
//                 EnhancedTutorial.TYPE_SWITCHER,
//                 EnhancedTutorial.PRIMARY_SWITCHER,
//                 EnhancedTutorial.SECONDARY_SWITCHER,
//                 EnhancedTutorial.RELEASE_ITEMS_1,
//                 EnhancedTutorial.RELEASE_ITEMS_2,
//                 EnhancedTutorial.ANY_TMS,
//                 EnhancedTutorial.ANY_ABILITIES,
//                 EnhancedTutorial.STAT_SWITCHERS,
//                 EnhancedTutorial.SMITTY_ITEMS_1,
//                 EnhancedTutorial.SMITTY_ITEMS_2
//             ]
//         },
//         community: {
//             title: "Community Features",
//             tutorials: [
//                 EnhancedTutorial.BOUNTIES_1,
//                 EnhancedTutorial.BOUNTIES_2,
//                 EnhancedTutorial.DAILY_BOUNTY,
//                 EnhancedTutorial.DISCORD,
//                 EnhancedTutorial.NEW_QUESTS,
//                 EnhancedTutorial.MODE_UNLOCKS
//             ]
//         },
//         smitom: {
//             title: "Smitom Features",
//             tutorials: [
//                 EnhancedTutorial.SMITOM,
//                 EnhancedTutorial.SMITOM_2,
//                 EnhancedTutorial.SMITTY_FORMS_1,
//                 EnhancedTutorial.SMITTY_FORMS_2,
//                 EnhancedTutorial.SMITTY_FORMS_3,
//                 EnhancedTutorial.SMITTY_FORM_UNLOCKED_1,
//                 EnhancedTutorial.SMITTY_FORM_UNLOCKED_2,
//                 EnhancedTutorial.SMITTY_FORM_UNLOCKED_3
//             ]
//         }
//     };

//     const lowerCategory = category.toLowerCase();
//     if (lowerCategory === "all") {
//         title = "All Tutorials";
//         tutorials = Object.values(categoryMap).flatMap(c => c.tutorials);
//     } else if (categoryMap.hasOwnProperty(lowerCategory)) {
//         const categoryData = categoryMap[lowerCategory];
//         title = categoryData.title;
//         tutorials = categoryData.tutorials;
//     } else {
//         console.log(`Unknown category: ${category}`);
//         return Promise.resolve();
//     }
    
//     console.log(`Preparing to show ${tutorials.length} tutorials for category: ${category} with title: ${title}`);
    
//     // Don't proceed if no tutorials are defined for this category
//     if (tutorials.length === 0) {
//         console.log("No tutorials defined for this category");
//         return Promise.resolve();
//     }
    
//     // Show tutorials for the selected category without saving completion flags
//     // Pass isFromMenu parameter to keep hub context when appropriate
//     return tutorialService.showCombinedTutorial(title, tutorials, false, isFromMenu);
// }
