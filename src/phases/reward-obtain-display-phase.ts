import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import { RewardConfig } from "#app/ui/reward-obtained-ui-handler.js";
import {randSeedInt} from "../utils";

export class RewardObtainDisplayPhase extends Phase {
    scene: BattleScene;
    private rewardConfig: RewardConfig;
    private buttonActions: (() => void)[];
    private fadeDelay: number = 1500;

    constructor(
        scene: BattleScene,
        rewardConfig: RewardConfig,
        buttonActions: (() => void)[] | (() => void) = []
    ) {
        super(scene);
        this.scene = scene;

        if (!scene) {
            throw new Error('Scene is required for RewardObtainDisplayPhase');
        }

        this.rewardConfig = rewardConfig;

        const actionsArray = typeof buttonActions === 'function' ? [buttonActions] : buttonActions;
        
        this.buttonActions = actionsArray?.length ? actionsArray.map(action => () => {
            action();
            this.scene.ui.setMode(Mode.MESSAGE);
            this.end();
        }) : [
            () => {
                this.end();
            }
        ];
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) return false;

        if (args.length >= 2) {
            this.rewardConfig = args[1] as RewardConfig;
            const buttonAction = args[2];

            const actionsArray = typeof buttonAction === 'function' ? [buttonAction] : buttonAction;
            
            this.buttonActions = actionsArray?.length ? actionsArray.map(action => () => {
                action();
                this.end();
            }) : [
                () => {
                    this.end();
                }
            ];

            this.showRewardUI();
            return true;
        }
        return false;
    }

    start(): void {
        super.start();

        if (!this.scene) {
            throw new Error('Scene is undefined in RewardObtainDisplayPhase start');
        }

        this.scene.playSound("item_fanfare");
        this.showRewardUI();
    }

    private showRewardUI(): void {
        if (!this.scene?.ui) {
            throw new Error('Scene or UI is undefined in RewardObtainDisplayPhase showRewardUI');
        }

        if(this.scene.ui.getMode() == Mode.REWARD_OBTAINED) {
            this.scene.ui.setMode(Mode.MESSAGE);
        }

        this.scene.ui.setOverlayModeForceTransition(
            Mode.REWARD_OBTAINED,
            {
                buttonActions: this.buttonActions
            },
            this.rewardConfig
        );
    }

    end(): void {
        super.end();
    }
}