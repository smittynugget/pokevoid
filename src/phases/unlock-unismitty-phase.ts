import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import { Species } from "#enums/species";
import { pokemonFormChanges } from "#app/data/pokemon-forms";
import * as Utils from "#app/utils";

export class UnlockUniSmittyPhase extends Phase {
    private onComplete: () => void;
    private formName: string;

    constructor(scene: BattleScene, formName?: string, onComplete?: () => void) {
        super(scene);
        this.onComplete = onComplete || (() => this.end());
        
        if (formName) {
            this.formName = formName;
        } else {
            const unismittyForms = pokemonFormChanges[Species.NONE] || [];
            const lockedForms = unismittyForms.filter(form => {
                return form.trigger &&
                    typeof form.trigger === 'object' &&
                    'name' in form.trigger &&
                    !scene.gameData.isUniSmittyFormUnlocked(form.trigger.name);
            });
            const randomForm = Utils.randSeedItem(lockedForms);
            if (!randomForm?.trigger || typeof randomForm.trigger !== 'object' || !('name' in randomForm.trigger)) {
                throw new Error('No valid Unismitty form available to unlock');
            }

            this.formName = randomForm.trigger.name;
        }
    }

    start(): void {
        this.scene.time.delayedCall(2000, () => {
            this.scene.gameData.unlockUniSmittyForm(this.formName);

            const rewardConfig: RewardConfig = {
                type: RewardObtainedType.FORM,
                name: this.formName,
                isGlitch: false
            };

            const phase = new RewardObtainDisplayPhase(
                this.scene,
                rewardConfig,
                [() => {
                    this.scene.arenaBg.setVisible(true);
                    this.onComplete();
                }]
            );
            phase.scene = this.scene;
            this.scene.unshiftPhase(phase);
            this.end();
        });
    }
    end(): void {
        super.end();
    }
} 