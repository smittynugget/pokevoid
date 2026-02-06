import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import * as Utils from "#app/utils.js";
import { modStorage } from "../system/mod-storage";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { getModFormSystemName } from "#app/data/mod-glitch-form-data.js";
import type { RivalTrainerType } from "#app/data/trainer-config";

export class RivalModUnlockPhase extends Phase {
  private rivalType: RivalTrainerType;

  constructor(scene: BattleScene, rivalType: RivalTrainerType) {
    super(scene);
    this.rivalType = rivalType;
  }

  async start(): Promise<void> {
    try {
      const allMods = await modStorage.getAllMods();
      const rivalMods = allMods.filter(mod =>
        (mod.jsonData.unlockConditions?.rivalTrainerTypes?.includes(this.rivalType) ?? false) || this.scene.gameMode.isChaosMode
      );
      const uncompleted = rivalMods.filter(mod =>
        !this.scene.gameData.isModFormUnlocked(getModFormSystemName(mod.speciesId, mod.formName))
      );
      if (!uncompleted.length) {
        this.end();
        return;
      }

      const chosen = Utils.randSeedItem(uncompleted);
      const systemName = getModFormSystemName(chosen.speciesId, chosen.formName);
      this.scene.gameData.unlockModForm(systemName);

      const rewardConfig: RewardConfig = {
        type: RewardObtainedType.FORM,
        name: getModPokemonName(chosen.speciesId, chosen.formName) || chosen.formName,
        isGlitch: false,
        isMod: true
      };

      this.scene.recordRunUnlockReward(rewardConfig);
      if (!this.scene.disableCutscenes && this.scene.deferUnlockPopupsToPowerSlide && this.scene.shouldDeferPowerUnlockReward(rewardConfig)) {
        this.scene.arenaBg.setVisible(true);
        this.end();
        return;
      }

      const phase = new RewardObtainDisplayPhase(this.scene, rewardConfig, [() => {}]);
      phase.scene = this.scene;
      this.scene.unshiftPhase(phase);
      this.end();
    } catch (e) {
      console.error("Error resolving rival mod unlock:", e);
      this.end();
    }
  }
}
