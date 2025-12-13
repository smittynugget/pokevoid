import { PlayableChampionData } from "#app/system/playable-champions";
import { ActiveSkillTreeData } from "#app/system/skill-tree-data";
import { GameData } from "#app/system/game-data";

export class SkillTreeValidation {
  static validateChampionData(championData: PlayableChampionData): boolean {
    if (!championData || !championData.id || typeof championData.id !== "string") {
      console.error("Champion data missing or invalid ID");
      return false;
    }
    if ((championData.level ?? 0) < 1) {
      console.error("Champion data has invalid level");
      return false;
    }
    if (!Array.isArray(championData.signaturePokemon)) {
      console.error("Champion data missing signature Pokemon array");
      return false;
    }
    return true;
  }

  static validateActiveSkillTree(activeSkillTree: ActiveSkillTreeData): boolean {
    if (!activeSkillTree || !activeSkillTree.championId) {
      console.error("Active skill tree missing champion ID");
      return false;
    }
    if ((activeSkillTree.treeLevel ?? 0) < 1 || (activeSkillTree.maxVisibleDepth ?? 0) < 2) {
      console.error("Active skill tree has invalid tree level or depth");
      return false;
    }
    if ((activeSkillTree.skillPoints ?? 0) < 0 || (activeSkillTree.tokens ?? 0) < 0) {
      console.error("Active skill tree has negative currency values");
      return false;
    }
    return true;
  }

  static validateSaveDataIntegrity(gameData: GameData): boolean {
    if (gameData.championData) {
      for (const [championId, champion] of Object.entries(gameData.championData)) {
        if (!this.validateChampionData(champion as PlayableChampionData)) {
          console.error(`Invalid champion data for ${championId}`);
          return false;
        }
      }
    }
    if (gameData.activeSkillTree) {
      if (!this.validateActiveSkillTree(gameData.activeSkillTree)) {
        console.error("Invalid active skill tree data");
        return false;
      }
    }
    return true;
  }
}