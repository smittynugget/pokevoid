import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { QuestUnlockables, getQuestUnlockableName, RewardType, QuestUnlockData } from "#app/system/game-data.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { Species } from "#enums/species";
import { getPokemonSpecies } from "#app/data/pokemon-species";

export class QuestUnlockPhase extends Phase {
    private questUnlockData: QuestUnlockData;
    private onComplete: () => void = () => {};
    private isQuestInitialUnlock: boolean;

    constructor(scene: BattleScene, questUnlockData: QuestUnlockData, isQuestInitialUnlock: boolean = false, onComplete?: () => void) {
        super(scene);
        this.questUnlockData = questUnlockData;
        this.onComplete = onComplete;
        this.isQuestInitialUnlock = isQuestInitialUnlock;
    }

    start(): void {
        const rewardId = Array.isArray(this.questUnlockData.rewardId) ? this.questUnlockData.rewardId[0] : this.questUnlockData.rewardId;
        const isGlitchForm = this.isGlitchFormReward();
        const isSmittyForm = this.isSmittyFormReward();
        const rewardConfig: RewardConfig =
            !this.isQuestInitialUnlock && (isGlitchForm || isSmittyForm) ?
                {
                    type: RewardObtainedType.FORM,
                    name: isGlitchForm ? getPokemonSpecies(rewardId as Species)
                        .getGlitchFormName(true).toLowerCase() : getPokemonSpecies(rewardId as Species)
                        .getSmittyFormName(true).toLowerCase(),
                    isGlitch: isGlitchForm,
                    isInitialQuestUnlock: this.isQuestInitialUnlock
                } : 
            {
                type: RewardObtainedType.QUEST_UNLOCK,
                name: this.isGlitchOrSmittyFormReward() ? i18next.t("questUi:bounty.quest.activeQuest.rewards.unlockForm", {
                    pokemonName: getPokemonSpecies(rewardId).name
                })  : this.questUnlockData.rewardText,
                questSpriteId: this.questUnlockData.questSpriteId || rewardId,
                isInitialQuestUnlock: this.isQuestInitialUnlock
            };

        const phase = new RewardObtainDisplayPhase(
            this.scene,
            rewardConfig,
            [() => {
                this.scene.arenaBg.setVisible(true);
                if(this.onComplete) {
                    this.onComplete();
                }
            }]
        );
        phase.scene = this.scene;
        this.scene.unshiftPhase(phase);
        this.end();
    }

    private isGlitchOrSmittyFormReward(): boolean {
        return [
            RewardType.GLITCH_FORM_A,
            RewardType.GLITCH_FORM_B,
            RewardType.GLITCH_FORM_C,
            RewardType.GLITCH_FORM_D,
            RewardType.GLITCH_FORM_E,
            RewardType.SMITTY_FORM,
            RewardType.SMITTY_FORM_B
        ].includes(this.questUnlockData.rewardType);
    }

    private isGlitchFormReward(): boolean {
        return this.questUnlockData.rewardType === RewardType.GLITCH_FORM_A || this.questUnlockData.rewardType === RewardType.GLITCH_FORM_B || this.questUnlockData.rewardType === RewardType.GLITCH_FORM_C || this.questUnlockData.rewardType === RewardType.GLITCH_FORM_D || this.questUnlockData.rewardType === RewardType.GLITCH_FORM_E;
    }

    private isSmittyFormReward(): boolean {
        return this.questUnlockData.rewardType === RewardType.SMITTY_FORM || this.questUnlockData.rewardType === RewardType.SMITTY_FORM_B;
    }
}