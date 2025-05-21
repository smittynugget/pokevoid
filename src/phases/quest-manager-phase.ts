import BattleScene from "#app/battle-scene";
import { Phase } from "#app/phase";
import { Mode } from "#app/ui/ui";
import { PermaRunQuestModifier } from "#app/modifier/modifier";
import { QuestUnlockables, getQuestUnlockableName } from "#app/system/game-data";
import i18next from "i18next";

interface ButtonAction {
    action: () => void | Promise<void>;
    label?: string;
}

export class QuestManagerPhase extends Phase {
    private questModifier: PermaRunQuestModifier;
    private buttonActions: ButtonAction[];
    private unlockPhaseDelay: number = 2000;
    private fadeDelay: number = 1500;

    constructor(
        scene: BattleScene,
        questModifier: PermaRunQuestModifier,
        buttonActions: ButtonAction[]
    ) {
        super(scene);
        this.questModifier = questModifier;
        this.buttonActions = buttonActions;
    }

    start(): void {
        this.scene.playSound("level_up_fanfare");
        this.showQuestUI();
    }


    private determineMode(): Mode {
        if (this.questModifier.questUnlockData?.questId) {
            if (this.questModifier.consoleCode) {
                if (this.scene.gameData.permaModifiers.isRivalBountyQuest(
                    this.questModifier.questUnlockData.questId
                )) {
                    return Mode.RIVAL_BOUNTY;
                }
                if (this.scene.gameData.permaModifiers.isSmittyBountyQuest(
                    this.questModifier.questUnlockData.questId
                )) {
                    return Mode.SMITTY_POKEMON_BOUNTY;
                }
                return Mode.QUEST_BOUNTY;
            }
            return Mode.QUEST_ACTIVE;
        }
        return Mode.QUEST_ACTIVE;
    }

    private showQuestUI(): void {
        const mode = this.determineMode();

        this.scene.ui.setOverlayMode(
            mode,
            {
                buttonActions: this.buttonActions.map(action => async () => {
                    action.action();
                    this.scene.ui.revertMode();
                    this.end();
                })
            },
            this.questModifier.consoleCode || null,
            this.questModifier,
            true,
            "Collect Rewards"
        );
    }

    end(): void {
        super.end();
    }
}