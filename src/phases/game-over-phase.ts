import { clientSessionId } from "#app/account";
import BattleScene from "#app/battle-scene";
import { BattleType } from "#app/battle";
import PokemonSpecies, { getPokemonSpecies } from "#app/data/pokemon-species";
import { achvs, ChallengeAchv } from "#app/system/achv";
import { Unlockables } from "#app/system/unlockables";
import { Mode } from "#app/ui/ui";
import { GameModes } from "../game-mode";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import { EndCardPhase } from "./end-card-phase";
import { PostGameOverPhase } from "./post-game-over-phase";
import { ChampionManager } from "#app/system/champion-manager";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import ChampionXPManager from "#app/system/champion-xp-manager";
import { ChampionLevelUpPhase } from "#app/phases/champion-level-up-phase";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { SkillCategory } from "#app/system/playable-champions";
import {
  SessionSaveData,
} from "../system/game-data";
import TrainerData from "../system/trainer-data";
import PokemonData from "../system/pokemon-data";
import PersistentModifierData from "../system/modifier-data";
import ChallengeData from "../system/challenge-data";
import ArenaData from "../system/arena-data";

export class GameOverPhase extends BattlePhase {
  private victory: boolean;
  private firstRibbons: PokemonSpecies[] = [];

  constructor(scene: BattleScene, victory?: boolean) {
    super(scene);

    this.victory = !!victory;
  }

  start() {
    super.start();
    if (this.scene.gameMode.isClassic && this.scene.currentBattle.waveIndex > 90 && !this.scene.gameMode.isChaosMode) {
      this.victory = true;
    }

    if (this.victory && this.scene.gameMode.isEndless) {
      this.scene.ui.showDialogue(i18next.t("PGMmiscDialogue:ending_endless"), i18next.t("PGMmiscDialogue:ending_name"), 0, () => this.handleGameOver());
    }
    else {
      this.handleGameOver();
    }
  }

  handleGameOver(): void {
    const doGameOver = (newClear: boolean) => {
      this.scene.disableMenu = true;
      this.scene.time.delayedCall(1000, () => {
        try {
          ChampionXPManager.finalizeEndOfRunLevelUps(this.scene);
          try {
            const gd: any = this.scene.gameData;
            const champId: string | undefined = gd?.selectedChampionId || gd?.activeSkillTree?.championId;
            const next = this.scene.getNextPhase();
            if (next && next instanceof ChampionLevelUpPhase) {
              this.scene.unshiftPhase(this);
              return;
            }
            if (champId && gd.pendingChampionLevelUps && gd.pendingChampionLevelUps[champId]?.length > 0) {

              this.scene.unshiftPhase(this);
              ChampionXPManager.processPendingLevelUps(this.scene, champId);
              return;
            }
          } catch (_) {  }
        } catch (e) {
          console.warn("Champion XP finalize failed:", e);
        }

        if (this.victory && newClear && this.scene.gameMode.isClassic) {
          this.scene.validateAchv(achvs.UNEVOLVED_CLASSIC_VICTORY);
        }

        if (!this.scene.gameMode.isTestMod) {
          this.scene.gameData.saveRunHistory(this.scene, this.getFinalSessionData(), this.victory);
        }
        const fadeDuration = this.victory ? 10000 : 5000;
        this.scene.fadeOutBgm(fadeDuration, true);
        const activeBattlers = this.scene.getField().filter(p => p?.isActive(true));
        activeBattlers.map(p => p.hideInfo());
        this.scene.ui.fadeOut(fadeDuration).then(() => {
            this.scene.ui.getMessageHandler().nameBoxContainer.setVisible(false);
            if(this.scene.currentBattle.trainer) {
              this.scene.currentBattle.trainer.destroy();
            }
            this.scene.gameData.playerRival = null;
            activeBattlers.map(a => a.setVisible(false));
          this.scene.setFieldScale(1, true);
          this.scene.clearPhaseQueue();
          this.scene.ui.clearText();

          if (this.victory && this.scene.gameMode.isChallenge) {
            this.scene.gameMode.challenges.forEach(c => this.scene.validateAchvs(ChallengeAchv, c));
          }

          const clear = (endCardPhase?: EndCardPhase) => {
            if (newClear) {

            }
            this.scene.pushPhase(new PostGameOverPhase(this.scene, endCardPhase));
            this.end();
          };

          clear();
        });
      });
    };

    if (this.victory) {
      this.scene.gameData.offlineNewClear(this.scene).then(result => {
        doGameOver(result);
      });
    } else {
      doGameOver(false);
    }
  }
  private getFinalSessionData(): SessionSaveData {
    return {
      seed: this.scene.seed,
      playTime: this.scene.sessionPlayTime,
      gameMode: this.scene.gameMode.modeId,
      party: this.scene.getParty().map(p => new PokemonData(p)),
      enemyParty: this.scene.getEnemyParty().map(p => new PokemonData(p)),
      modifiers: this.scene.findModifiers(() => true).map(m => new PersistentModifierData(m, true)),
      enemyModifiers: this.scene.findModifiers(() => true, false).map(m => new PersistentModifierData(m, false)),
      arena: new ArenaData(this.scene.arena),
      pokeballCounts: this.scene.pokeballCounts,
      money: this.scene.money,
      score: this.scene.score,
      waveIndex: this.scene.currentBattle.waveIndex,
      battleType: this.scene.currentBattle.battleType,
      trainer: this.scene.currentBattle.battleType === BattleType.TRAINER ? new TrainerData(this.scene.currentBattle.trainer) : null,
      gameVersion: this.scene.game.config.gameVersion,
      timestamp: new Date().getTime(),
      challenges: this.scene.gameMode.challenges.map(c => new ChallengeData(c))
    } as SessionSaveData;
  }
}