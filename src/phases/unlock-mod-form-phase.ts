import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { Species } from "#enums/species";
import { modStorage } from "../system/mod-storage";
import { getModPokemonName } from "../data/mod-glitch-form-utils";

export class UnlockModFormPhase extends Phase {
    private onComplete: () => void;
    private formName: string;
    private speciesId: Species;

    constructor(scene: BattleScene, formName: string, onComplete?: () => void) {
        super(scene);
        this.onComplete = onComplete || (() => this.end());
        this.speciesId = Species.NONE;
        this.formName = formName;
    }

    async start(): Promise<void> {
        try {
            const allMods = await modStorage.getAllMods();
            const matchingMod = allMods.find(mod => 
                mod.formName.toLowerCase() === this.formName.toLowerCase()
            );
            
            if (matchingMod) {
                this.speciesId = matchingMod.speciesId;
                
                const modName = getModPokemonName(matchingMod.speciesId, matchingMod.formName);
                this.formName = modName || matchingMod.formName;
            } 
        } catch (error) {
            console.error(`Error looking up mod data for ${this.formName}:`, error);
        }
        
        this.scene.time.delayedCall(2000, () => {

            const rewardConfig: RewardConfig = {
                type: RewardObtainedType.FORM,
                name: this.formName,
                isGlitch: false,
                isMod: true
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