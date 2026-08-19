import i18next from "#app/plugins/i18n";
import BattleScene from "#app/battle-scene";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { SkillTreeNode, SkillTreeNodeState } from "#app/system/skill-tree-data";
import { Type } from "#app/data/type";
import * as Modifiers from "#app/modifier/modifier";
import { modifierTypes } from "#app/modifier/modifier-type";

export class SkillTreeProgression {
	private scene: BattleScene;

	constructor(scene: BattleScene) {
		this.scene = scene;
	}

	updateNodeVisibility(): void {
		const activeSkillTree = this.scene.gameData.activeSkillTree;
		if (!activeSkillTree) return;
		const skillTreeNodes: SkillTreeNode[] | undefined = (this.scene.gameData as any).tempSkillTreeNodes;
		if (!skillTreeNodes) return;
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

	grantTokens(amount: number): boolean {
		const activeSkillTree = this.scene.gameData.activeSkillTree;
		if (!activeSkillTree) {
			return false;
		}
		const oldTokens = activeSkillTree.tokens || 0;
		if (oldTokens >= 2) return false;
		activeSkillTree.tokens = Math.min(2, Math.max(0, oldTokens + amount));
		const gd = this.scene.gameData;
		if (!gd.skillTreeAutoOpenConsumed && !gd.pendingSkillTreeAutoOpen
			&& this.scene.skillTreeEnabledForRun && gd.activeSkillTree
			&& !gd.tutorialOnboardActive
			&& oldTokens < 2 && gd.activeSkillTree.tokens >= 2) {
			gd.pendingSkillTreeAutoOpen = true;
		}
		const tracker = this.scene.findModifier(m => m instanceof Modifiers.SkillTreeTokenTrackerModifier);
		if (tracker) {
			(tracker as Modifiers.SkillTreeTokenTrackerModifier).stackCount = activeSkillTree.tokens;
			this.scene.updateModifiers(true);
		}
		return true;
	}
	consumeTokens(): void {
		const activeSkillTree = this.scene.gameData.activeSkillTree;
		if (!activeSkillTree) {
			return;
		}
		activeSkillTree.tokens = 0;
		const tracker = this.scene.findModifier(m => m instanceof Modifiers.SkillTreeTokenTrackerModifier);
		if (tracker) {
			(tracker as Modifiers.SkillTreeTokenTrackerModifier).stackCount = 0;
			this.scene.updateModifiers(true);
		}
	}

	awardTokens(amount: number, source: string): void {
		if (!this.grantTokens(amount)) {
			return;
		}
		this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, {
			type: RewardObtainedType.SKILL_TREE_TOKENS,
			amount,
			name: i18next.t("skillTree:rewards.tokens", { amount, source })
		}));
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
		try { console.log(`Awarded ${amount} ${(Type as any)[type]} essences. Total: ${gameData.getEssenceCount(type)}`); } catch {}
	}
}

export function ensureSkillTreeTokenTracker(scene: BattleScene): void {
	if (!scene.skillTreeEnabledForRun || !scene.gameData?.activeSkillTree) return;
	const existing = scene.findModifier(m => m instanceof Modifiers.SkillTreeTokenTrackerModifier);
	if (existing) {
		(existing as Modifiers.SkillTreeTokenTrackerModifier).stackCount = scene.gameData.activeSkillTree.tokens ?? 0;
		scene.updateModifiers(true);
	} else {
		if (!modifierTypes.SKILL_TREE_TOKEN_TRACKER) return;
		const type = modifierTypes.SKILL_TREE_TOKEN_TRACKER().withIdFromFunc(modifierTypes.SKILL_TREE_TOKEN_TRACKER);
		const tracker = type.newModifier();
		if (!tracker) return;
		tracker.stackCount = scene.gameData.activeSkillTree.tokens ?? 0;
		scene.addModifier(tracker, true, false, false, true);
		scene.updateModifiers(true, true);
	}
	const gd = scene.gameData;
	if (!gd.pendingSkillTreeAutoOpen
		&& scene.skillTreeEnabledForRun && gd.activeSkillTree
		&& !gd.tutorialOnboardActive
		&& (gd.activeSkillTree.tokens ?? 0) >= 2) {
		gd.pendingSkillTreeAutoOpen = true;
	}
}

export default SkillTreeProgression;