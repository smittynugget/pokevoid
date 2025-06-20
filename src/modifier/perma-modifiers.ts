import {PermaModifier, PermaQuestModifier, PermaRunQuestModifier, PersistentModifier} from "#app/modifier/modifier";
import BattleScene from "#app/battle-scene";
import {QuestState, QuestUnlockables} from "#app/system/game-data";
import * as Utils from "../utils";
import {createCachedRewardHandler, getRandomRewardType} from "#app/modifier/modifier-type";

export enum PermaType {
    PERMA_PARTY_ABILITY,
    PERMA_NEW_NORMAL,
    PERMA_REROLL_COST_1,
    PERMA_REROLL_COST_2,
    PERMA_REROLL_COST_3,
    PERMA_SHOW_REWARDS_1,
    PERMA_SHOW_REWARDS_2,
    PERMA_SHOW_REWARDS_3,
    PERMA_FUSION_INCREASE_1,
    PERMA_FUSION_INCREASE_2,
    PERMA_FUSION_INCREASE_3,
    PERMA_CATCH_RATE_1,
    PERMA_CATCH_RATE_2,
    PERMA_CATCH_RATE_3,
    PERMA_TRAINER_SNATCH_COST_1,
    PERMA_TRAINER_SNATCH_COST_2,
    PERMA_TRAINER_SNATCH_COST_3,
    PERMA_MORE_REVIVE_1,
    PERMA_MORE_REVIVE_2,
    PERMA_MORE_REVIVE_3,
    PERMA_FREE_REROLL,
    PERMA_BETTER_LUCK_2,
    PERMA_BETTER_LUCK_3,
    PERMA_MORE_REWARD_CHOICE_1,
    PERMA_MORE_REWARD_CHOICE_2,
    PERMA_MORE_REWARD_CHOICE_3,
    PERMA_POST_BATTLE_MONEY_1,
    PERMA_POST_BATTLE_MONEY_2,
    PERMA_POST_BATTLE_MONEY_3,
    PERMA_START_BALL_1,
    PERMA_START_BALL_2,
    PERMA_START_BALL_3,
    PERMA_START_MONEY_1,
    PERMA_START_MONEY_2,
    PERMA_START_MONEY_3,
    PERMA_START_GLITCH_PIECES_1,
    PERMA_START_GLITCH_PIECES_2,
    PERMA_START_GLITCH_PIECES_3,
    PERMA_METRONOME_LEVELUP,
    PERMA_NEW_ROUND_TERA,
    PERMA_RUN_ANYTHING_2,
    PERMA_SHINY_1,
    PERMA_SHINY_2,
    PERMA_SHINY_3,
    PERMA_CHEAPER_FUSIONS_1,
    PERMA_CHEAPER_FUSIONS_2,
    PERMA_CHEAPER_FUSIONS_3,
    PERMA_STARTER_POINT_LIMIT_INC_1,
    PERMA_STARTER_POINT_LIMIT_INC_2,
    PERMA_STARTER_POINT_LIMIT_INC_3,
    PERMA_LONGER_TERA_1,
    PERMA_LONGER_TERA_2,
    PERMA_LONGER_TERA_3,
    PERMA_LONGER_STAT_BOOSTS_1,
    PERMA_LONGER_STAT_BOOSTS_2,
    PERMA_LONGER_STAT_BOOSTS_3,
    PERMA_MORE_GLITCH_PIECES_1,
    PERMA_MORE_GLITCH_PIECES_2,
    PERMA_MORE_GLITCH_PIECES_3,
    PERMA_GLITCH_PIECE_MAX_PLUS_1,
    PERMA_GLITCH_PIECE_MAX_PLUS_2,
    PERMA_GLITCH_PIECE_MAX_PLUS_3,
    PERMA_TRANSFER_TERA
}

export enum PermaDuration {
    WAVE_BASED,
    USE_BASED
}

export enum BountyType {
    SMITTY,
    RIVAL,
    QUEST
}

export class PermaModifiers {
    private modifiers: PersistentModifier[] = [];
    private readonly QUEST_BOUNTY_LIMIT = 5;
    private readonly RIVAL_SMITTY_BOUNTY_LIMIT = 3;

    constructor(modifiers: PersistentModifier[] = []) {
        this.modifiers = modifiers;
    }

    addModifier(scene: BattleScene, _modifier: PersistentModifier): boolean {
        let modifier = _modifier;
        if (modifier instanceof PermaRunQuestModifier || modifier instanceof PermaModifier) {
        if (modifier instanceof PermaRunQuestModifier) {
            const quest = modifier.questUnlockData;

            if (quest) {
                if (modifier.consoleCode) {
                    if (this.isRivalBountyQuest(quest.questId)) {
                        const existingRivalBounties = this.modifiers.filter(m =>
                            m instanceof PermaRunQuestModifier &&
                            m.consoleCode &&
                            this.isRivalBountyQuest(m.questUnlockData.questId)
                        );

                        if (existingRivalBounties.length >= this.RIVAL_SMITTY_BOUNTY_LIMIT) {
                            const removeIndex = Math.floor(Utils.randSeedInt(existingRivalBounties.length));
                            this.removeModifier(existingRivalBounties[removeIndex]);
                        }

                    } else if (this.isSmittyBountyQuest(quest.questId)) {
                        const existingSmittyBounties = this.modifiers.filter(m =>
                            m instanceof PermaRunQuestModifier &&
                            m.consoleCode &&
                            this.isSmittyBountyQuest(m.questUnlockData.questId)
                        );

                        if (existingSmittyBounties.length >= this.RIVAL_SMITTY_BOUNTY_LIMIT) {
                            const removeIndex = Math.floor(Utils.randSeedInt(existingSmittyBounties.length));
                            this.removeModifier(existingSmittyBounties[removeIndex]);
                        }

                    } else if (this.isQuestBountyQuest(quest.questId)) {
                        const existingQuestBounties = this.modifiers.filter(m =>
                            m instanceof PermaRunQuestModifier &&
                            m.consoleCode &&
                            this.isQuestBountyQuest(m.questUnlockData.questId)
                        );

                        if (existingQuestBounties.length >= this.QUEST_BOUNTY_LIMIT) {
                            const removeIndex = Math.floor(Utils.randSeedInt(existingQuestBounties.length));
                            this.removeModifier(existingQuestBounties[removeIndex]);
                        }

                        if(!quest.cloned) {
                            modifier = _modifier.clone();
                            modifier.questUnlockData = createCachedRewardHandler(false, quest.questId);
                            modifier.questUnlockData.questSpriteId = quest.rewardId;
                            modifier.questUnlockData.cloned = true;
                        }
                    }
                }
                else if (quest.questId in QuestUnlockables) {
                    scene.gameData.setQuestState(quest.questId, QuestState.ACTIVE, quest);
                }
            }
        }
            const addedModifier = modifier.add(this.modifiers, false, scene);
            
            scene.ui.updatePermaModifierBar(this);
            return addedModifier;
        }
    }

    public isQuestBountyQuest(questId: QuestUnlockables): boolean {
        return questId >= QuestUnlockables.TAUROS_ELECTRIC_HIT_QUEST &&
            questId <= QuestUnlockables.LANTURN_NIGHTMARE_QUEST;
    }

  public isRivalBountyQuest(questId: QuestUnlockables): boolean {
    return questId >= QuestUnlockables.BLUE_BOUNTY_QUEST &&
        questId <= QuestUnlockables.SABRINA_BOUNTY_QUEST;
  }

  public isSmittyBountyQuest(questId: QuestUnlockables): boolean {
    return questId >= QuestUnlockables.TARTAUROS_SMITTY_QUEST &&
        questId <= QuestUnlockables.MISSINGNO_SMITTY_QUEST;
  }

    private removeExistingQuestModifiers(bountyType: BountyType): void {
        const isRelevantQuest = (questId: QuestUnlockables): boolean => {
            switch (bountyType) {
                case BountyType.RIVAL:
                    return this.isRivalBountyQuest(questId);
                case BountyType.SMITTY:
                    return this.isSmittyBountyQuest(questId);
                case BountyType.QUEST:
                    return this.isQuestBountyQuest(questId);
                default:
                    return false;
            }
        };

        const existingModifiers = this.modifiers.filter(m =>
            m instanceof PermaRunQuestModifier &&
            m.consoleCode &&
            isRelevantQuest(m.questUnlockData?.questId)
        );

        existingModifiers.forEach(modifier => this.removeModifier(modifier));
    }

    findModifier(predicate: (modifier: PersistentModifier) => boolean): PersistentModifier | undefined {
        return this.modifiers.find(predicate);
    }

    findModifiers(predicate: (modifier: PersistentModifier) => boolean): PersistentModifier[] | undefined {
        return this.modifiers.filter(predicate);
    }

    updateModifier(modifier: PersistentModifier): void {
        const index = this.modifiers.findIndex(m => m.match(modifier));
        if (index !== -1) {
            this.modifiers[index] = modifier;
        }
    }

    removeModifier(modifier: PersistentModifier, resetQuestStatus:boolean = false, scene?:BattleScene): void {
        const index = this.modifiers.findIndex(m => m.match(modifier));
        if (index !== -1) {
            this.modifiers.splice(index, 1);
            if (resetQuestStatus) {
                if(modifier instanceof PermaRunQuestModifier) {
                    scene.gameData.setQuestState(modifier.questUnlockData.questId, QuestState.UNLOCKED, modifier.questUnlockData);
                }
            }
        }
    }

    removeAllModifiers(): void {
        this.modifiers = [];
    }

    getModifiers(): PersistentModifier[] {
        return this.modifiers;
    }

    public getPermaModifiersByType(permaType: PermaType): PermaModifier[] {
        return this.modifiers.filter(m => m instanceof PermaModifier && (m as PermaModifier).permaType === permaType) as PermaModifier[];
    }

    public hasPermaModifierByType(permaType: PermaType): boolean {
        return this.modifiers.some(m => m instanceof PermaModifier && (m as PermaModifier).permaType === permaType);
    }

    public reducePermaModifierByType(permaTypes: PermaType | PermaType[], scene: BattleScene): void {
        const typesToReduce = Array.isArray(permaTypes) ? permaTypes : [permaTypes];

        const modifiersToReduce = this.modifiers.filter(m =>
            m instanceof PermaModifier && typesToReduce.includes((m as PermaModifier).permaType)
        ) as PermaModifier[];

        for (const modifier of modifiersToReduce) {
            modifier.reduceCount(scene);
        }
    }

    public reducePermaWaveModifiers(scene: BattleScene): void {
        const waveBasedModifiers = this.modifiers.filter(m =>
            m instanceof PermaModifier && (m as PermaModifier).permaDuration === PermaDuration.WAVE_BASED
        ) as PermaModifier[];

        for (const modifier of waveBasedModifiers) {
            modifier.reduceCount(scene);
        }
    }
}