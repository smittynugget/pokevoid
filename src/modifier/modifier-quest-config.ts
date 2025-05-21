import {ModifierType, QuestModifierTypeGenerator} from "./modifier-type";
import { RunType, RunDuration } from "../enums/quest-type-conditions";
import { Unlockables } from "../system/unlockables";
import {QuestUnlockables, QuestUnlockData} from "#app/system/game-data";


export interface QuestStage {
    runType: RunType;
    duration: RunDuration;
    condition: (...args: any[]) => boolean;
    goalCount: number;
    questUnlockData?: QuestUnlockData; // Optional stage-specific rewards
    task?: string;
}

export interface QuestModifierTypeConfig {
    name: string;
    runType: RunType;
    duration: RunDuration;
    condition: (...args: any[]) => boolean;
    goalCount: number;
    questUnlockData: QuestUnlockData;
    task?: string;
    resetOnFail?: boolean;
    startWave?: number;
    conditionUnlockable?: Unlockables;
    stages?: QuestStage[];
    currentStage?: number;
    consoleCode?: string;
}

export type QuestModifierFactory = (
    type: ModifierType,
    runType: RunType,
    duration: RunDuration,
    condition: (...args: any[]) => boolean,
    goalCount: number,
    questUnlockData: QuestUnlockData,
    task?: string,
    currentCount: number,
    resetOnFail?: boolean,
    startWave?: number,
    conditionUnlockable?: Unlockables,
    stages?: QuestStage[],
    currentStage?: number,
    consoleCode?: string
) => any;

export interface QuestModifierTypes {
    PERMA_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_HIT_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_USE_ABILITY_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_KNOCKOUT_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_FAINT_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_MOVE_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_WAVE_CHECK_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_WIN_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_RUN_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_SPECIAL_MOVE_QUEST: (id: string, config: QuestModifierTypeConfig & { conditionUnlockable: QuestUnlockables }) => QuestModifierTypeGenerator;
    PERMA_TAG_REMOVAL_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_COUNTDOWN_WAVE_CHECK_QUEST: (id: string, config: QuestModifierTypeConfig & { startWave: number }) => QuestModifierTypeGenerator;
    PERMA_CATCH_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_RIVAL_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;
    PERMA_FORM_CHANGE_QUEST: (id: string, config: QuestModifierTypeConfig) => QuestModifierTypeGenerator;

}