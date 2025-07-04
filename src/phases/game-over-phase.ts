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

    // Failsafe if players somehow skip floor 200 in classic mode
    if (this.scene.gameMode.isClassic && this.scene.currentBattle.waveIndex > 200) {
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
        this.scene.gameData.updateGameModeStats(this.scene.gameMode.modeId, this.victory);
        
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

  /**
   * This function mirrors game-data.ts' getSessionSaveData() to update the session data to reflect any changes that occurred within the last wave
   * This means that level ups, item usage, evolutions, etc. will all be accurately reflected.
   * @returns {@linkCode SessionSaveData} an updated version of the wave's SessionSaveData that accurately reflects the events of the wave
   */
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

