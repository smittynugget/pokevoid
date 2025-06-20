import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { RewardConfig, RewardObtainedType, UnlockModePokeSpriteType } from "#app/ui/reward-obtained-ui-handler.js";
import { Unlockables, getUnlockableName } from "#app/system/unlockables.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import { modifierTypes } from "#app/modifier/modifier-type.js";

export class UnlockPhase extends Phase {
    private unlockable: Unlockables;
    private onComplete: () => void;
    private sprite: string | null;
    private isModeUnlock: boolean;
    private unlockableSpriteType: UnlockModePokeSpriteType;
    constructor(scene: BattleScene, unlockable: Unlockables, sprite: string | null, isModeUnlock: boolean = false, unlockableSpriteType: UnlockModePokeSpriteType = UnlockModePokeSpriteType.GLITCH, onComplete?: () => void) {
        super(scene);
        this.unlockable = unlockable;
        this.onComplete = onComplete;
        this.sprite = sprite;
        this.isModeUnlock = isModeUnlock;
        this.unlockableSpriteType = unlockableSpriteType;
    }

    start(): void {
            this.scene.gameData.unlocks[this.unlockable] = true;

            const rewardConfig: RewardConfig = {
                type: RewardObtainedType.UNLOCK,
                name: getUnlockableName(this.unlockable),
                unlockable: this.unlockable,
                sprite: this.sprite || null,
                isModeUnlock: this.isModeUnlock,
                unlockableSpriteType: this.unlockableSpriteType,
            };

            if(this.unlockable === Unlockables.MANY_MORE_NUGGETS) {
                rewardConfig.modifierType = modifierTypes.PERMA_SHOW_REWARDS_1().generateType([]);
            }

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

    end(): void {
        super.end();
    }
}
