import BattleScene from "#app/battle-scene";
import * as Utils from "#app/utils";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { ChampionManager } from "#app/system/champion-manager";
import { SkillCategory, PlayableChampionData, ChampionSkillDef } from "#app/system/playable-champions";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { UpgradePath } from "#enums/upgrade-path";
import { FormChangeItem } from "#enums/form-change-items";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { PermaType } from "#app/modifier/perma-modifiers";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { ChampionLevelUpPhase } from "#app/phases/champion-level-up-phase";
import { Mode } from "#app/ui/ui";
import { QuestUnlockables } from "#app/system/game-data";
import { allSpecies } from "#app/data/pokemon-species";
import { ChampionUtils } from "#app/system/champion-utils";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS } from "#app/data/pokemon-alt-buid";

export class ChampionXPManager {
	static getRequiredEssenceWeightsForLevel(scene: BattleScene, championId: string, championData: PlayableChampionData): Array<{ type: Type; amount: number }> | null {
		try {
			const nextLevel = Math.max(1, (championData?.level || 1) + 1);
			const def: any = (ChampionManager as any).getInstance?.().getChampionData(championId) || championData;
			const totalRequired = Math.max(1, SkillTreeUtils.getRequiredEssenceForLevel(championData.level || 1));
			const skillDefs = (def?.lockedSkills) || {};
			const target = Object.values(skillDefs).find((s: any) => (s?.unlockLevel) === nextLevel) as any;
			const weights = target?.requiredEssenceWeights as Array<{ type: Type; percent: number }> | undefined;
			if (!weights || !weights.length) return null;

			const norm = weights.map(w => ({ type: w.type, percent: Math.max(0, w.percent) }));
			const percentSum = norm.reduce((a, b) => a + b.percent, 0) || 0;
			if (percentSum <= 0) return null;
			const scaled = norm.map(w => ({ type: w.type, raw: (w.percent / percentSum) * totalRequired }));
			const base = scaled.map(s => ({ type: s.type, amount: Math.floor(s.raw), frac: s.raw - Math.floor(s.raw) }));
			let remainder = totalRequired - base.reduce((a, b) => a + b.amount, 0);

			base.sort((a, b) => b.frac - a.frac);
			for (let i = 0; i < base.length && remainder > 0; i++, remainder--) base[i].amount += 1;

			return base.map(({ type, amount }) => ({ type, amount }));
		} catch { return null; }
	}
	static getEssenceProgress(championData: { level?: number; essence?: number; levelEssence?: Partial<Record<Type, number>> }): { current: number; required: number; percentage: number } {
		const level = Math.max(1, championData.level || 1);
		const required = Math.max(1, SkillTreeUtils.getRequiredEssenceForLevel(level));

		const levelEssence = (championData as any).levelEssence || {};
		const current = Math.max(0, Math.floor(Object.values(levelEssence).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0)));
		const percentage = Math.max(0, Math.min(100, (current / required) * 100));
		return { current, required, percentage };
	}
	static getPerTypeRequiredForLevel(championData: PlayableChampionData): Array<{ types: Type[]; amount: number }> | null {
		try {
			const nextLevel = Math.max(1, (championData?.level || 1) + 1);
			const def: any = ChampionManager.getInstance().getChampionData(championData.id) || championData;
			const total = Math.max(1, SkillTreeUtils.getRequiredEssenceForLevel(championData.level || 1));
			const skills = (def?.lockedSkills) || {};
			const target = Object.values(skills).find((s: any) => (s?.unlockLevel) === nextLevel) as any;
			const weights = target?.requiredEssenceWeights as Array<{ type: Type | Type[]; percent?: number; amount?: number }> | undefined;
			if (!weights || !weights.length) return null;
		const excludedTypes = new Set([Type.UNKNOWN, (Type as any).ALL, Type.STELLAR]);
		const normalizedWeights = weights.map(w => ({
			types: Array.isArray(w.type) ? w.type : [w.type],
			percent: w.percent,
			amount: w.amount
		})).filter(w => w.types.length > 0 && w.types.every(t =>
			typeof t === "number" && !excludedTypes.has(t)
		));

			if (normalizedWeights.length === 0) return null;

			const fixed = normalizedWeights.filter(w => (w.amount || 0) > 0).map(w => ({
				types: w.types,
				amount: Math.max(0, Math.floor(w.amount!))
			}));
			const fixedSum = fixed.reduce((a, x) => a + x.amount, 0);
			const remainder = Math.max(0, total - fixedSum);

			const percents = normalizedWeights.filter(w => (w.percent || 0) > 0).map(w => ({
				types: w.types,
				p: Math.max(0, w.percent!)
			}));
			const pSum = percents.reduce((a, x) => a + x.p, 0);
			const scaled = (pSum > 0) ? percents.map(e => ({ types: e.types, raw: (e.p / pSum) * remainder })) : [];
			const base = scaled.map(s => ({ types: s.types, amount: Math.floor(s.raw), frac: s.raw - Math.floor(s.raw) }));
			let leftover = remainder - base.reduce((a, b) => a + b.amount, 0);
			base.sort((a, b) => b.frac - a.frac);
			for (let i = 0; i < base.length && leftover > 0; i++, leftover--) base[i].amount += 1;
			return [...fixed, ...base.map(({ types, amount }) => ({ types, amount }))];
		} catch { return null; }
	}
	static getNextUnlockableSkills(championData: PlayableChampionData): ChampionSkillDef[] {
		const lockedSkillIds = Object.keys(championData.lockedSkills || {});
		return lockedSkillIds
			.filter(skillId => {
				const def = championData.lockedSkills[skillId];
				return def && def.unlockLevel === (championData.level || 1) + 1;
			})
			.map(skillId => championData.lockedSkills[skillId]);
	}
	static tryConsumeEssenceForLevel(scene: BattleScene, championId: string, essenceType: Type, amount: number = 1): boolean {
		try {
			const gameData = scene.gameData;
			const available = gameData.getEssenceCount(essenceType);
			if (available < amount) return false;

			const championData = ChampionManager.getInstance().getChampionData(championId);
			const perTypeReq = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(championData) as Array<{ types: Type[]; amount: number }> | null;
			if (perTypeReq && perTypeReq.length) {
				const allowed = new Set(perTypeReq.flatMap(r => r.types));
				if (!allowed.has(essenceType)) return false;
			} else {
				const def: any = ChampionManager.getInstance().getChampionData(championId);
				const fallbackAllowed = [def?.type1, def?.type2].filter((t: any) => typeof t !== "undefined") as Type[];
				if (fallbackAllowed.length && !fallbackAllowed.includes(essenceType)) return false;
			}
			const levelEssence = (championData as any).levelEssence = (championData as any).levelEssence || {};
			let missingForType = 0;

			if (perTypeReq && perTypeReq.length) {

				for (const segment of perTypeReq) {
					if (!segment.types.includes(essenceType)) continue;
					const segmentCurrent = segment.types.reduce((sum, type) => sum + (levelEssence[type] || 0), 0);
					const segmentMissing = Math.max(0, segment.amount - segmentCurrent);
					missingForType += segmentMissing;
				}
			} else {

				const totalRequired = Math.max(1, SkillTreeUtils.getRequiredEssenceForLevel(championData.level || 1));
				const currentTotal = Object.values(levelEssence).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
				missingForType = Math.max(0, totalRequired - (currentTotal as number));
			}
			const amountToConsume = Math.min(amount, available, missingForType);
			if (amountToConsume <= 0) return false;
			if (!gameData.tryConsumeEssence(essenceType, amountToConsume)) return false;
			levelEssence[essenceType] = (levelEssence[essenceType] || 0) + amountToConsume;
			this.checkChampionEssenceLevelUp(scene, championData);
			return true;
		} catch (_e) {
			return false;
		}
	}
	private static handleChampionLevelUp(scene: BattleScene, championData: PlayableChampionData): void {
		const lockedIds = Object.keys(championData.lockedSkills || {});
		if (lockedIds.length === 0) return;
		const available = lockedIds.filter(id => {
			const def = championData.lockedSkills[id];
			if (!def) return false;
			if (def.unlockLevel > (championData.level || 1)) return false;
			return this.checkSkillPrerequisites(championData, def);
		});
		if (available.length === 0) return;

		const currentLevel = (championData.level || 1);
		const exact = available.filter(id => (championData.lockedSkills[id]?.unlockLevel) === currentLevel);
		const selectedSkillId = exact.length === 1 ? exact[0] : Utils.randSeedItem(available);
		const skillDef = championData.lockedSkills[selectedSkillId];
		championData.unlockedSkills[selectedSkillId] = { skillId: selectedSkillId, unlockedAt: Date.now(), level: championData.level || 1 } as any;
		delete championData.lockedSkills[selectedSkillId];
		this.applyPermanentSkillUnlock(scene, championData, skillDef);
		this.addPendingLevelUp(scene, championData, skillDef);

    if (scene.ui.getMode() !== Mode.CHAMPION_SELECT) {
		  scene.unshiftPhase(new ChampionLevelUpPhase(scene, championData.id, skillDef));
    }
	}

	private static checkSkillPrerequisites(championData: PlayableChampionData, skillDef: ChampionSkillDef): boolean {
		if (skillDef?.prerequisites?.all) {
			const allMet = skillDef.prerequisites.all.every(p => (championData.unlockedSkills as any)[p] || p === "start");
			if (!allMet) return false;
		}
		if (skillDef?.prerequisites?.any) {
			const anyMet = skillDef.prerequisites.any.some(p => (championData.unlockedSkills as any)[p] || p === "start");
			if (!anyMet) return false;
		}
		return true;
	}

	private static applyPermanentSkillUnlock(scene: BattleScene, championData: PlayableChampionData, skillDef: ChampionSkillDef): void {
		const targetIds = [championData.id];
		if (['apollo', 'diana', 'apollo_diana'].includes(championData.id)) {
			const group = ['apollo', 'diana', 'apollo_diana'];
			group.forEach(id => {
				if (!targetIds.includes(id)) targetIds.push(id);
			});
		}

		for (const id of targetIds) {
			let target = championData;
			if (id !== championData.id) {
				target = ChampionManager.getInstance().getChampionData(id);
			}
			this.applyUnlockToTarget(scene, target, skillDef);
		}
	}

	private static applyUnlockToTarget(scene: BattleScene, championData: PlayableChampionData, skillDef: ChampionSkillDef): void {

		console.log(`[DIAGNOSTIC] ===== applyUnlockToTarget START =====`, {
			championId: championData.id || "unknown",
			skillCategory: skillDef.category,
			unlockableId: skillDef.unlockableId,
			unlockLevel: skillDef.unlockLevel
		});
		if (skillDef.category === SkillCategory.PASSIVE_ABILITIES && skillDef.unlockableId >= 311) {
			console.error(`[DIAGNOSTIC] 🔴 CRITICAL: PASSIVE_ABILITIES category used with Smitty ability!`, {
				championId: championData.id || "unknown",
				abilityId: skillDef.unlockableId,
				skillCategory: skillDef.category
			});
		}

		switch (skillDef.category) {
			case SkillCategory.TMS:
				if (!(championData.unlockedTMs || []).includes(skillDef.unlockableId as Moves)) {
					(championData.unlockedTMs = championData.unlockedTMs || []).push(skillDef.unlockableId as Moves);
				}
				break;
			case SkillCategory.XMS:
				if (!(championData.unlockedXMs || []).includes(skillDef.unlockableId as Moves)) {
					(championData.unlockedXMs = championData.unlockedXMs || []).push(skillDef.unlockableId as Moves);
				}
				break;
			case SkillCategory.ABILITY_POOL:
				if (!(championData.unlockedAbilities || []).includes(skillDef.unlockableId as Abilities)) {

					const isSmitty = skillDef.unlockableId >= 311;
					console.log(`[DIAGNOSTIC] Unlocking ability via ABILITY_POOL:`, {
						championId: championData.id || "unknown",
						abilityId: skillDef.unlockableId,
						isSmittyAbility: isSmitty,
						WARNING: isSmitty ? "⚠️ SMITTY ABILITY IN ABILITY_POOL!" : undefined
					});
					(championData.unlockedAbilities = championData.unlockedAbilities || []).push(skillDef.unlockableId as Abilities);
				}
				break;
			case SkillCategory.MEGA_STONES:
				if (!(championData.unlockedMegaStones || []).includes(skillDef.unlockableId as FormChangeItem)) {
					(championData.unlockedMegaStones = championData.unlockedMegaStones || []).push(skillDef.unlockableId as FormChangeItem);
				}
				break;
			case SkillCategory.DYNA_MUSHROOMS:
				(championData as any).unlockedMaxMushrooms = true;
				break;

			case SkillCategory.GLITCH_CHANGE:
				(championData as any).unlockedGlitchChange = true;
				break;
		case SkillCategory.TRAINER_BOND_ABILITIES:
			if (!(championData.unlockedConditionalAbilities || []).includes(skillDef.unlockableId as Abilities)) {
				(championData.unlockedConditionalAbilities = championData.unlockedConditionalAbilities || []).push(skillDef.unlockableId as Abilities);
			}
			break;
			case SkillCategory.MOVE_UPGRADES:
				if (!(championData.unlockedMoveUpgrades || []).includes(skillDef.unlockableId as UpgradePath)) {
					(championData.unlockedMoveUpgrades = championData.unlockedMoveUpgrades || []).push(skillDef.unlockableId as UpgradePath);
				}
				break;
			case SkillCategory.SIGNATURE_POKEMON: {
				const species = skillDef.unlockableId as Species;
				(championData as any).unlockedSignaturePokemon = (championData as any).unlockedSignaturePokemon || [];
				const arr = (championData as any).unlockedSignaturePokemon as Species[];
				if (!arr.includes(species)) arr.push(species);
				try {
					const altBuildId = ChampionUtils.getAutoUnlockAltBuildId(species, championData);
					if (altBuildId) {
						championData.unlockedAltBuilds = championData.unlockedAltBuilds || [];
						if (!championData.unlockedAltBuilds.includes(altBuildId)) {
							championData.unlockedAltBuilds.push(altBuildId);
						}
					}
				} catch {}
				break;
			}
			case SkillCategory.LEGENDARY_POKEMON: {
				const species = skillDef.unlockableId as Species;
				(championData as any).unlockedLegendaryPokemon = (championData as any).unlockedLegendaryPokemon || [];
				const arr = (championData as any).unlockedLegendaryPokemon as Species[];
				if (!arr.includes(species)) arr.push(species);
				break;
			}
			case SkillCategory.STAT_BOOSTS:
				if (!(championData.unlockedStatBoosts || []).includes(skillDef.unlockableId as any)) {
					(championData.unlockedStatBoosts = championData.unlockedStatBoosts || []).push(skillDef.unlockableId as any);
				}
				break;
			case SkillCategory.POKEMON_ALT_BUILDS:
				if (!(championData.unlockedAltBuilds || []).includes(skillDef.unlockableId as any)) {
					(championData.unlockedAltBuilds = championData.unlockedAltBuilds || []).push(skillDef.unlockableId as any);
				}
				break;
			case SkillCategory.TYPE_SWITCHERS:
				if (!(championData.unlockedTypeSwitchers || []).includes(skillDef.unlockableId as Type)) {
					(championData.unlockedTypeSwitchers = championData.unlockedTypeSwitchers || []).push(skillDef.unlockableId as Type);
				}
				break;
			case SkillCategory.ESSENCE_BUNDLES:
				if (!(championData.unlockedEssenceBundles || []).includes(skillDef.unlockableId as Type)) {
					(championData.unlockedEssenceBundles = championData.unlockedEssenceBundles || []).push(skillDef.unlockableId as Type);
				}
				break;
		case SkillCategory.PERMA_ITEMS:
			if (!(championData.unlockedPermaItems || []).includes(skillDef.unlockableId as PermaType)) {
				(championData.unlockedPermaItems = championData.unlockedPermaItems || []).push(skillDef.unlockableId as PermaType);
			}
			break;
		case SkillCategory.GLITCH_FORMS: {
			const questId = skillDef.unlockableId as QuestUnlockables;
			if (!questId) break;

			try {
				const questData = scene.gameData.getQuestUnlockDataFromModifierTypes(questId);
				if (!questData || !questData.rewardId) break;

				const species = (allSpecies as any)?.[questData.rewardId - 1];
				if (!species) break;

				const formKey = species.getGlitchFormName?.(true, undefined, questData.rewardType);
				if (!formKey || formKey === "unknown") break;

				championData.unlockedGlitchForms = championData.unlockedGlitchForms || [];
				championData.glitchFormUnlockableIds = championData.glitchFormUnlockableIds || {};

				if (!championData.unlockedGlitchForms.includes(formKey.toLowerCase())) {
					championData.unlockedGlitchForms.push(formKey.toLowerCase());
				}

				championData.glitchFormUnlockableIds[formKey.toLowerCase()] = questId;
			} catch (error) {
				console.error(`[GLITCH] Failed to process glitch form unlock:`, error);
			}
			break;
		}
		default:
			break;
		}
	}

	private static addPendingLevelUp(
		scene: BattleScene,
		championData: PlayableChampionData,
		skillDef: ChampionSkillDef
	): void {
		const gameData: any = scene.gameData;
		if (!gameData.pendingChampionLevelUps) {
			gameData.pendingChampionLevelUps = {} as Record<string, any[]>;
		}
		if (!gameData.pendingChampionLevelUps[championData.id]) {
			gameData.pendingChampionLevelUps[championData.id] = [] as any[];
		}
		gameData.pendingChampionLevelUps[championData.id].push({
			skill: skillDef,
			level: championData.level,
			timestamp: Date.now()
		});
	}
	private static checkChampionEssenceLevelUp(scene: BattleScene, championData: PlayableChampionData): void {

		const perTypeReq = (ChampionXPManager as any).getPerTypeRequiredForLevel?.(championData) as Array<{ types: Type[]; amount: number }> | null;
		if (!perTypeReq || perTypeReq.length === 0) {

			const levelEssence = (championData as any).levelEssence = (championData as any).levelEssence || {};
			let requiredEssence = SkillTreeUtils.getRequiredEssenceForLevel(championData.level || 1);
			let totalEssence = Object.values(levelEssence).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);

			while (totalEssence >= requiredEssence) {

				let remainingToDrain = requiredEssence;
				const typeKeys = Object.keys(levelEssence).map(k => parseInt(k)).sort((a, b) => a - b);

				for (const typeKey of typeKeys) {
					if (remainingToDrain <= 0) break;
					const available = levelEssence[typeKey] || 0;
					const toDrain = Math.min(available, remainingToDrain);
					levelEssence[typeKey] = available - toDrain;
					remainingToDrain -= toDrain;
					if (levelEssence[typeKey] <= 0) {
						delete levelEssence[typeKey];
					}
				}

				championData.level = (championData.level || 1) + 1;
				this.handleChampionLevelUp(scene, championData);
				totalEssence = Object.values(levelEssence).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
				requiredEssence = SkillTreeUtils.getRequiredEssenceForLevel(championData.level || 1);
			}
		} else {
			const levelEssence = (championData as any).levelEssence = (championData as any).levelEssence || {};
			const canLevel = () => {
				for (const segment of perTypeReq) {
					const available = segment.types.reduce((sum, type) => sum + (levelEssence[type] || 0), 0);
					if (available < segment.amount) return false;
				}
				return true;
			};

			while (canLevel()) {

				for (const segment of perTypeReq) {
					let remainingToDrain = segment.amount;
					const availableTypes = segment.types.filter(type => (levelEssence[type] || 0) > 0);
					for (const type of availableTypes) {
						if (remainingToDrain <= 0) break;
						const available = levelEssence[type] || 0;
						const toDrain = Math.min(available, remainingToDrain);
						levelEssence[type] = available - toDrain;
						remainingToDrain -= toDrain;

						if (levelEssence[type] <= 0) delete levelEssence[type];
					}
				}

				championData.level = (championData.level || 1) + 1;
				this.handleChampionLevelUp(scene, championData);
			}
			return;
		}
	}

	static processPendingLevelUps(scene: BattleScene, championId: string): void {
    const gameData: any = scene.gameData;
    const pending = (gameData.pendingChampionLevelUps && gameData.pendingChampionLevelUps[championId]) || [];
    if (pending.length === 0) return;
    console.log(`Processing ${pending.length} pending level ups for champion ${championId}`);
    const BACKOFF_MS = 2500;
    pending.forEach((levelUp: any, index: number) => {
        scene.time.delayedCall(index * BACKOFF_MS, () => {
            try {
                scene.unshiftPhase(new ChampionLevelUpPhase(scene, championId, levelUp.skill));
            } catch (_) {}
        });
    });
    delete gameData.pendingChampionLevelUps[championId];
    gameData.saveSystem?.();
	}
	applyEssenceWeighting(type: Type, weight: number): void {
		const active = (this as any).scene?.gameData?.activeSkillTree;
		if (!active) return;
		active.essenceTypeWeights = active.essenceTypeWeights || {} as any;
		(active.essenceTypeWeights as any)[type] = ((active.essenceTypeWeights as any)[type] || 0) + weight;
	}

	applyAdditiveCatchBonus(amount: number, types?: Type[]): void {
		const active = (this as any).scene?.gameData?.activeSkillTree;
		if (!active) return;
		active.catchRateBonusByType = active.catchRateBonusByType || {} as any;
		const targetTypes = (types && types.length) ? types : [];
		if (targetTypes.length === 0) return;
		for (const t of targetTypes) {
			(active.catchRateBonusByType as any)[t] = ((active.catchRateBonusByType as any)[t] || 0) + amount;
		}
	}

	applyReviveBoost(targets: { types?: Type[]; species?: Species[]; amount?: number }): void {
		const active = (this as any).scene?.gameData?.activeSkillTree;
		if (!active) return;
		const cur = active.reviveBoost || { types: [], species: [], amount: 0 };
		cur.types = [...(cur.types || []), ...((targets.types || []))];
		cur.species = [...(cur.species || []), ...((targets.species || []))];
		cur.amount = (cur.amount || 0) + (targets.amount || 1);
		active.reviveBoost = cur;
	}
}

export default ChampionXPManager;