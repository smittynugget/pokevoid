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

export function hasTerastallizeAccess(): boolean {
    if (!gameDataInstance) {
        throw new Error("PermaModifierChecker not initialized");
    }
    const scene = (gameDataInstance as any).scene;
    if (!scene) {
        return false;
    }
    return scene.modifiers.filter((modifier: any) => modifier.constructor.name === 'TerastallizeAccessModifier').length > 0;
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