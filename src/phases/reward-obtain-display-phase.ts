import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import {randSeedInt} from "../utils";

export class RewardObtainDisplayPhase extends Phase {
    scene: BattleScene;
    private rewardConfig: RewardConfig;
    private buttonActions: (() => void)[];
    private fadeDelay: number = 1500;
    private restoreWithRevertMode: boolean = false;

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

        this.buttonActions = actionsArray?.length
            ? actionsArray.map(action => () => this.finishReward(action))
            : [() => this.finishReward()];
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) return false;

        if (args.length >= 2) {
            this.rewardConfig = args[1] as RewardConfig;
            const buttonAction = args[2];

            const actionsArray = typeof buttonAction === 'function' ? [buttonAction] : buttonAction;

            this.buttonActions = actionsArray?.length
                ? actionsArray.map(action => () => this.finishReward(action))
                : [() => this.finishReward()];

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

        const isCutsceneContext = this.scene.ui.getMode() === Mode.SLIDESHOW_CUTSCENE;
        if (isCutsceneContext) {
            this.scene.playSound("battle_anims/PRSFX- Oblivion Wing2", { volumeGroup: "se" });
            this.showRewardUI();
            return;
        }

        if (this.scene.finalBattleVictory) {
            this.scene.playSound("battle_anims/PRSFX- Quiver Dance", { volumeGroup: "se" });
            this.showRewardUI();
            return;
        }

        if (this.rewardConfig.skillTreeRarity) {
            const rarity = this.rewardConfig.skillTreeRarity;
            const REWARD_RARITY_SOUNDS: Record<string, string> = {
                "common": "battle_anims/PRSFX- Bestow2",
                "great": "battle_anims/PRSFX- Bestow2",
                "ultra": "battle_anims/PRSFX- Foresight2",
                "rogue": "battle_anims/PRSFX- Camouflage",
                "master": "battle_anims/PRSFX- Oblivion Wing2",
                "legendary": "battle_anims/PRSFX- Grudge",
            };
            const rewardSound = REWARD_RARITY_SOUNDS[rarity] || "battle_anims/PRSFX- Bestow2";
            this.scene.playSound(rewardSound, { volumeGroup: "se" });
        } else {
            if (this.rewardConfig.type === RewardObtainedType.SKILL_POINTS) {
                this.scene.playSound("battle_anims/PRSFX- Bestow2", { volumeGroup: "se" });
            } else if (this.rewardConfig.type === RewardObtainedType.SKILL_TREE_TOKENS
                || this.rewardConfig.type === RewardObtainedType.SKILL_TREE_UNLOCK) {
                this.scene.playSound("battle_anims/PRSFX- Oblivion Wing2", { volumeGroup: "se" });
            } else {
                this.scene.playSound("item_fanfare");
            }
        }
        this.showRewardUI();
    }

    private showRewardUI(): void {
        if (!this.scene?.ui) {
            throw new Error('Scene or UI is undefined in RewardObtainDisplayPhase showRewardUI');
        }

        this.restoreWithRevertMode = this.scene.ui.getMode() === Mode.SLIDESHOW_CUTSCENE;

        if(this.scene.ui.getMode() == Mode.REWARD_OBTAINED) {
            this.scene.ui.setMode(Mode.MESSAGE);
        }

        const cfg = this.restoreWithRevertMode
            ? ({ ...this.rewardConfig, cutsceneStyle: true } as any)
            : this.rewardConfig;

        this.scene.ui.setOverlayModeForceTransition(
            Mode.REWARD_OBTAINED,
            {
                buttonActions: this.buttonActions
            },
            cfg
        );
    }

    private finishReward(action?: () => void): void {
        try {
            action?.();
        } catch {
        }

        this.scene.ui.revertMode().then(() => this.end());
    }

    end(): void {
        super.end();
    }
}