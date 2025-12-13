import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType, RewardConfig } from "#app/ui/reward-obtained-ui-handler";

export interface SkillTreeRewardData {
  skillPoints?: number;
  tokens?: number;
  source: string;
  rarity?: string;
}

export class SkillTreeRewardPhase extends Phase {
  private readonly rewardData: SkillTreeRewardData;

  constructor(scene: BattleScene, rewardData: SkillTreeRewardData) {
    super(scene);
    this.rewardData = rewardData;
  }

  start(): void {
    super.start();

    const active = (this.scene.gameData as any)?.activeSkillTree;
    if (!active) {
      this.end();
      return;
    }

    const sp = Math.max(0, this.rewardData.skillPoints || 0);
    const tk = Math.max(0, this.rewardData.tokens || 0);

    if (tk > 0) {
      const cfg: RewardConfig = {
        type: RewardObtainedType.SKILL_TREE_TOKENS,
        amount: tk,
        skillTreeRarity: this.rewardData.rarity
      } as any;
      this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, cfg));
    }
    if (sp > 0) {
      const cfg: RewardConfig = {
        type: RewardObtainedType.SKILL_POINTS,
        amount: sp,
        skillTreeRarity: this.rewardData.rarity
      } as any;
      this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, cfg));
    }

    try { (this.scene.gameData as any).saveSystem?.(); } catch {}
    this.end();
  }
}

export default SkillTreeRewardPhase;