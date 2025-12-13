import BattleScene from "#app/battle-scene";
import { Phase } from "#app/phase";
import { Mode } from "#app/ui/ui";
import { ChampionSkillDef, PlayableChampionData } from "#app/system/playable-champions";
import { ChampionManager } from "#app/system/champion-manager";

export class ChampionLevelUpPhase extends Phase {
  private championId: string;
  private newSkill: ChampionSkillDef;

  constructor(scene: BattleScene, championId: string, newSkill: ChampionSkillDef) {
    super(scene);
    this.championId = championId;
    this.newSkill = newSkill;
  }

  start(): void {
    super.start();

    const championData = ChampionManager.getInstance().getChampionData(this.championId);
    this.scene.ui.setMode(Mode.CHAMPION_LEVEL_UP, {
      championData,
      newSkill: this.newSkill,
      onAcknowledged: () => {
        this.handleLevelUpAcknowledged();
      }
    });
  }

  private handleLevelUpAcknowledged(): void {

    this.scene.ui.revertMode();
    this.clearPendingLevelUp();
    this.end();
  }

  private clearPendingLevelUp(): void {
    const gameData = this.scene.gameData;
    if (gameData.pendingChampionLevelUps && gameData.pendingChampionLevelUps[this.championId]) {

      gameData.pendingChampionLevelUps[this.championId] =
        gameData.pendingChampionLevelUps[this.championId].filter(levelUp =>
          levelUp.skill !== this.newSkill
        );
            if (gameData.pendingChampionLevelUps[this.championId].length === 0) {
              delete gameData.pendingChampionLevelUps[this.championId];
            }
          }
    gameData.saveSystem();
  }
}