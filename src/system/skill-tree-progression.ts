import i18next from "#app/plugins/i18n";
import BattleScene from "#app/battle-scene";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { SkillTreeNode, SkillTreeNodeState } from "#app/system/skill-tree-data";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { Type } from "#app/data/type";
import { Mode as ModeEnum } from "#app/ui/ui";

export class SkillTreeProgression {
  private scene: BattleScene;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  canLevelUpTree(): boolean {
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (!activeSkillTree) {
      return false;
    }
    const currentLevel = activeSkillTree.treeLevel;
    const cost = SkillTreeUtils.getTokenCostForNextLevel(currentLevel);
    return activeSkillTree.tokens >= cost && currentLevel < 10;
  }

  levelUpTree(): boolean {
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (!activeSkillTree || !this.canLevelUpTree()) {
      return false;
    }
    const currentLevel = activeSkillTree.treeLevel;
    const cost = SkillTreeUtils.getTokenCostForNextLevel(currentLevel);
    activeSkillTree.tokens -= cost;
    activeSkillTree.treeLevel += 1;
    const newDepth = SkillTreeUtils.getMaxDepthForLevel(activeSkillTree.treeLevel);
    activeSkillTree.maxVisibleDepth = newDepth;
    this.triggerTreeExpansionEffects();
    this.scene.gameData.saveSystem();
    return true;
  }

  private triggerTreeExpansionEffects(): void {
    const activeSkillTree = this.scene.gameData.activeSkillTree!;
    const ui: any = this.scene.ui as any;
    const modeGetter = ui?.getMode?.bind(ui);
    const mode = modeGetter ? modeGetter() : undefined;
    if (mode !== ModeEnum.SKILL_TREE) {
      this.scene.ui.showText(
        i18next.t("skillTree:treeLeveledUp", {
          level: activeSkillTree.treeLevel,
          newDepth: activeSkillTree.maxVisibleDepth
        }),
        null, () => {}, null, true
      );
    }
  }

  updateNodeVisibility(): void {
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (!activeSkillTree) {
      return;
    }
    const skillTreeNodes: SkillTreeNode[] | undefined = (this.scene.gameData as any).tempSkillTreeNodes;
    if (!skillTreeNodes) {
      return;
    }
    skillTreeNodes.forEach(node => {
      const wasVisible = node.state !== SkillTreeNodeState.LOCKED_HIDDEN;
      const shouldBeVisible = node.depth <= activeSkillTree.maxVisibleDepth;
      if (shouldBeVisible && !wasVisible) {
        node.state = SkillTreeNodeState.LOCKED_DETAILS;
        this.triggerNodeRevealEffect(node);
      } else if (!shouldBeVisible && wasVisible) {
        node.state = SkillTreeNodeState.LOCKED_HIDDEN;
      }
    });
  }

  private triggerNodeRevealEffect(node: SkillTreeNode): void {
    console.log(`Node revealed at depth ${node.depth}: ${node.name}`);
  }

  awardTokens(amount: number, source: string): void {
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (!activeSkillTree) {
      return;
    }
    const oldTokens = activeSkillTree.tokens || 0;
    activeSkillTree.tokens = Math.max(0, oldTokens + amount);
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, {
      type: RewardObtainedType.SKILL_TREE_TOKENS,
      amount,
      name: i18next.t("skillTree:rewards.tokens", { amount, source })
    }));
    if (this.canLevelUpTree()) {
      this.showLevelUpPrompt();
    }
  }

  private showLevelUpPrompt(): void {
    const activeSkillTree = this.scene.gameData.activeSkillTree!;
    const cost = SkillTreeUtils.getTokenCostForNextLevel(activeSkillTree.treeLevel);
    this.scene.ui.showText(
      i18next.t("skillTree:levelUpAvailable", {
        cost,
        currentLevel: activeSkillTree.treeLevel,
        nextLevel: activeSkillTree.treeLevel + 1
      }),
      null, () => {}, null, true
    );
  }

  awardSkillPoints(amount: number, source: string): void {
    const activeSkillTree = this.scene.gameData.activeSkillTree;
    if (!activeSkillTree) {
      return;
    }
    const oldPoints = activeSkillTree.skillPoints || 0;
    activeSkillTree.skillPoints = Math.max(0, oldPoints + amount);
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, {
      type: RewardObtainedType.SKILL_POINTS,
      amount,
      name: i18next.t("skillTree:rewards.skillPoints", { amount, source })
    }));
  }

  private awardEssenceBundle(type: Type, amount: number): void {
    const gameData = this.scene.gameData as any;
    gameData.addEssence(type, amount);
    this.scene.ui.showText(
      i18next.t("skillTree:rewards.essenceBundle", { amount, type: (Type as any)[type] }),
      null, () => {}, null, true
    );
    try {
      console.log(`Awarded ${amount} ${(Type as any)[type]} essences. Total: ${gameData.getEssenceCount(type)}`);
    } catch {}
  }
}

export default SkillTreeProgression;
