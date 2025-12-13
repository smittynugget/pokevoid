import * as Utils from "#app/utils";
import BattleScene from "#app/battle-scene";
import { Type } from "#app/data/type";
import { TrainerType } from "#enums/trainer-type";
import { PathNodeType } from "#app/battle";
import { SkillTreeProgression } from "#app/system/skill-tree-progression";
import { ChampionManager } from "#app/system/champion-manager";
import { allSpecies } from "#app/data/pokemon-species";

export class SkillPointSources {
	private scene: BattleScene;

	constructor(scene: BattleScene) {
		this.scene = scene;
	}

	checkBattleVictoryReward(): void {
		if (!this.scene.gameData.activeSkillTree) return;
		if (Utils.randSeedInt(100) < 20) {
			this.awardSkillPoints(1, "battle_victory");
		}
		if (Utils.randSeedInt(100) < 20) {
			this.awardTokens(1, "battle_victory");
		}
	}

	checkWaveMilestoneReward(waveIndex: number): void {
		if (!this.scene.gameData.activeSkillTree) return;
		if (waveIndex % 10 === 0) {
			this.awardTokens(1, `wave_${waveIndex}_milestone`);
		}
	}

	checkCollectorTradeReward(essenceType: Type, amount: number): void {
	}

    checkRareItemNodeReward(nodeType?: PathNodeType): void {
        if (!this.scene.gameData.activeSkillTree) return;
        const sceneAny = this.scene as any;
        const resolvedNodeType = (nodeType ?? (sceneAny?.selectedNodeType as PathNodeType | undefined));
        if (resolvedNodeType === undefined || resolvedNodeType === null) return;
        switch (resolvedNodeType) {
			case PathNodeType.ITEM_GENERAL:
				if (Utils.randSeedInt(100) < 10) this.awardSkillPoints(1, "rare_item_node");
				break;
			case PathNodeType.ITEM_TM:
				if (Utils.randSeedInt(100) < 15) this.awardSkillPoints(1, "tm_node");
				break;
			case PathNodeType.ADD_POKEMON:
				if (Utils.randSeedInt(100) < 20) this.awardTokens(1, "pokemon_node");
				break;
		}
	}

	checkBossVictoryReward(trainerType: TrainerType): void {
		if (!this.scene.gameData.activeSkillTree) return;
		switch (trainerType) {
			case TrainerType.ELITE_FOUR:
				this.awardTokens(1, "elite_four_victory");
				break;
			case TrainerType.CHAMPION:
				this.awardTokens(3, "champion_victory");
				break;
			case TrainerType.RIVAL:
				this.awardTokens(1, "rival_victory");
				break;
		}
	}

	private isGymLeader(trainerType: TrainerType): boolean {
		return trainerType >= TrainerType.BROCK && trainerType < TrainerType.LORELEI;
	}

	checkLegendaryEncounterReward(species: number): void {
		if (!this.scene.gameData.activeSkillTree) return;
		const speciesData = (allSpecies as any)[species];
		if (speciesData?.legendary || speciesData?.mythical) {
			const championData = ChampionManager.getInstance().getChampionData(this.scene.gameData.activeSkillTree.championId);
			if (championData.legendaryPokemon.includes(species as any)) {
				this.awardTokens(1, "champion_legendary_encounter");
			}
		}
	}

	public awardSkillPoints(amount: number, source: string): void {
		new SkillTreeProgression(this.scene).awardSkillPoints(amount, source);
	}

	public awardTokens(amount: number, source: string): void {
		new SkillTreeProgression(this.scene).awardTokens(amount, source);
	}
}

export default SkillPointSources;