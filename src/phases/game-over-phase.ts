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
import { STORY_CUTSCENES, getLossWhiteoutHomebaseSlidesRandomized } from "#app/system/story-cutscenes.js";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
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
    this.scene._inBattleTurn = false;

    const waveIndex = this.scene.currentBattle?.waveIndex ?? 0;
    const finalWave = this.scene.gameMode.getFinalWave();
    if (finalWave > 0 && waveIndex > finalWave && !this.scene.gameMode.isEndless && !this.scene.gameMode.isChaosMode) {
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
          void e;
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
            if (this.scene.currentBattle?.trainer) {
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
            this.scene.pushPhase(new PostGameOverPhase(this.scene, endCardPhase, this.victory));
            this.end();
          };

          if (!this.victory && !this.scene.disableCutscenes) {
            if (this.scene.lossWhiteoutPreSummaryQueued) {
              clear();
              return;
            }
            this.scene.lossWhiteoutPreSummaryQueued = true;
            const def = STORY_CUTSCENES.loss_whiteout_homebase;
            const slides = getLossWhiteoutHomebaseSlidesRandomized();
            this.scene.pushPhase(new PostGameOverPhase(this.scene, undefined, this.victory));
            this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
              slides,
              bgmKey: def.bgmKey,
              canSkip: true,
              pauseAfterText: 1000,
              resumeBgmOnEnd: false,
            }));
            this.end();
            return;
          }

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
    return this.scene.gameData.getSessionSaveData(this.scene);
  }
}