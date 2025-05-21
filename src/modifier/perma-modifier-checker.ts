import {GameData, QuestState, QuestUnlockables} from '#app/system/game-data';
import {PermaType} from '#app/modifier/perma-modifiers';

let gameDataInstance: GameData | null = null;

export function initializePermaModifierChecker(gameData: GameData) {
    gameDataInstance = gameData;
}

export function hasPermaModifierByType(permaType: PermaType): boolean {
    if (!gameDataInstance) {
        throw new Error("PermaModifierChecker not initialized");
    }
    return gameDataInstance.hasPermaModifierByType(permaType);
}

export function isQuestCompleted(quest: QuestUnlockables): boolean {
    if (!gameDataInstance) {
        throw new Error("PermaModifierChecker not initialized");
    }
    return gameDataInstance.checkQuestState(quest, QuestState.COMPLETED);
}

export function isNormalQuestCompleted(): boolean {
    if (!gameDataInstance) {
        throw new Error("PermaModifierChecker not initialized");
    }
    return gameDataInstance.checkQuestState(QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST, QuestState.COMPLETED);
}