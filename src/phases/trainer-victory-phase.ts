import BattleScene from "#app/battle-scene.js";
import { getCharVariantFromDialogue } from "#app/data/dialogue.js";
import { TrainerType } from "#app/enums/trainer-type.js";
import { modifierTypes, CollectedTypeModifierType } from "#app/modifier/modifier-type.js";
import { Type } from "#app/data/type.js";
import { vouchers } from "#app/system/voucher.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import { ModifierRewardPhase } from "./modifier-reward-phase";
import { MoneyRewardPhase } from "./money-reward-phase";
import { TrainerSlot } from "#app/data/trainer-config.js";
import { TRAINER_TYPES, PathNodeType } from "#app/battle.js";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { UnlockUniSmittyPhase } from "./unlock-unismitty-phase";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { universalSmittyForms } from "#app/data/pokemon-species.js";
import Overrides from "#app/overrides.js";
import { playTrainerPortalFaintAnim } from "#app/field/portal-anim.js";

export class TrainerVictoryPhase extends BattlePhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    this.scene.disableMenu = true;

    const isFinalBattle = this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex);
    if (isFinalBattle) {
      this.scene.playBgm("battle_galar_champion");
    } else {
      this.scene.playBgm(this.scene.currentBattle.trainer?.config.victoryBgm);
    }
    const trainerType = this.scene.currentBattle.trainer?.config.trainerType!;

    const shouldQueueMysteryCutscene = trainerType === TrainerType.SMITTY && !isFinalBattle && !this.scene.disableCutscenes;
    let shouldQueueUniSmittyUnlock = false;
    let shouldQueueMergedMysteryThenPowerCutscene = false;

    if (trainerType === TrainerType.SMITTY && !isFinalBattle && this.scene.gameMode.isChaosMode) {
      const wave = this.scene.currentBattle.waveIndex;
      const isMilestoneWave = wave > 200 && wave % 100 === 0;

      if (isMilestoneWave || Overrides.FORCE_UNISMITTY_UNLOCK_ON_SMITTY_VICTORY) {
        const uniTotal = universalSmittyForms.length;
        const uniUnlocked = new Set<string>((this.scene.gameData.uniSmittyUnlocks ?? []) as string[]).size;
        shouldQueueUniSmittyUnlock = uniTotal > 0 && uniUnlocked < uniTotal;
        shouldQueueMergedMysteryThenPowerCutscene = shouldQueueUniSmittyUnlock && !this.scene.disableCutscenes;
      }
    }

    if (shouldQueueMergedMysteryThenPowerCutscene) {
      const def = STORY_CUTSCENES.smitty_post_battle;
      let currentImageKey: string | null = null;

      this.scene.beginPowerUnlockDeferral();
      this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
      this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
        slides: def.slides,
        bgmKey: def.bgmKey,
        canSkip: true,
        pauseAfterText: 1000,
        resumeBgmOnEnd: true,
        onSlideChange: (index) => {
          currentImageKey = def.slides[index]?.imageKey ?? null;
        },
        onTextComplete: (controller) => {
          if (currentImageKey === "power") {
            runPowerUnlockOverlays(this.scene, controller);
          }
        },
        onComplete: () => {
          this.scene.endPowerUnlockDeferral();
        },
      }));
    } else if (shouldQueueUniSmittyUnlock) {
      this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
    } else if (shouldQueueMysteryCutscene) {
      const def = STORY_CUTSCENES.smitty_post_battle;
      this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
        slides: def.slides,
        bgmKey: def.bgmKey,
        canSkip: true,
        pauseAfterText: 1000,
        resumeBgmOnEnd: true,
      }));
    }

    const modifierRewardFuncs = this.scene.currentBattle.trainer?.config.modifierRewardFuncs ?? [];
    for (const modifierRewardFunc of modifierRewardFuncs) {
      this.scene.unshiftPhase(new ModifierRewardPhase(this.scene, modifierRewardFunc));
    }

    this.incrementTrainerTypeStats(trainerType);

    const nodeType = this.scene.selectedNodeType;
    const isRivalNode = nodeType === PathNodeType.RIVAL_BATTLE || nodeType === PathNodeType.CHALLENGE_RIVAL;
    const waveIndex = this.scene.currentBattle.waveIndex;
    const isWaveBoundary = waveIndex % 100 === 0;
    const rivalStage = this.scene.currentBattle.trainer?.rivalStage ?? -1;
    if (isRivalNode && rivalStage === 6 && isWaveBoundary) {
      this.scene.recordRunEndSummaryRivalDefeat(trainerType);
    }

    if (trainerType === TrainerType.SMITTY) {
      const trainer = this.scene.currentBattle.trainer;
      const idx = trainer?.config?.smittyVariantIndex;
      if (typeof idx === "number" && Number.isFinite(idx)) {
        const frame = String(idx + 1);
        if (!this.scene.gameData.defeatedSmittyFoes.includes(frame)) {
          this.scene.gameData.defeatedSmittyFoes.push(frame);
        }
        this.scene.recordRunEndSummarySmittyDefeat(frame);
      }
      this.scene.unshiftPhase(new ModifierRewardPhase(
        this.scene,
        () => new CollectedTypeModifierType(Type.SMITTY)
      ));
    }

    if (vouchers.hasOwnProperty(TrainerType[trainerType])) {
      if (!this.scene.validateVoucher(vouchers[TrainerType[trainerType]]) && this.scene.currentBattle.trainer?.config.isBoss && !this.scene.currentBattle.trainer?.isDynamicRival) {
        this.scene.unshiftPhase(new ModifierRewardPhase(this.scene, [modifierTypes.VOUCHER, modifierTypes.VOUCHER, modifierTypes.VOUCHER_PLUS][vouchers[TrainerType[trainerType]].voucherType]));
      }
    }

    const trainerRef = this.scene.currentBattle.trainer;
    const isPortalFaintTrainer = trainerRef?.isCorrupted || trainerRef?.config.trainerType === TrainerType.SMITTY;

    this.showEnemyTrainer();

    this.scene.ui.showText(i18next.t("battle:trainerDefeated", { trainerName: this.scene.currentBattle.trainer?.getName(TrainerSlot.NONE, true) }), null, () => {
      const victoryMessages = this.scene.currentBattle.trainer?.getVictoryMessages()!;
      let message: string;
      this.scene.executeWithSeedOffset(() => message = Utils.randSeedItem(victoryMessages), this.scene.currentBattle.waveIndex);
      message = message!;

      const showMessage = () => {
        const originalFunc = showMessageOrEnd;
        showMessageOrEnd = () => this.scene.ui.showDialogue(message, this.scene.currentBattle.trainer?.getName(TrainerSlot.TRAINER, true), null, originalFunc);

        showMessageOrEnd();
      };
      let showMessageOrEnd = () => {
        if (isPortalFaintTrainer && trainerRef) {
          this.scene.time.delayedCall(Utils.fixedInt(750), () => {
            playTrainerPortalFaintAnim(this.scene, trainerRef).then(() => {
              trainerRef.setVisible(false);
              if (trainerRef.portalSprite) {
                this.scene.tweens.add({
                  targets: trainerRef.portalSprite,
                  alpha: 0,
                  duration: Utils.fixedInt(800),
                  onComplete: () => {
                    trainerRef.portalSprite?.destroy();
                    trainerRef.portalSprite = null;
                    this.end();
                  }
                });
              } else {
                this.end();
              }
            });
          });
        } else {
          this.end();
        }
      };
      if (victoryMessages?.length) {
        if (this.scene.currentBattle.trainer?.config.hasCharSprite && !this.scene.ui.shouldSkipDialogue(message)) {
          const originalFunc = showMessageOrEnd;
          showMessageOrEnd = () => {
            this.scene.ui.getMessageHandler().hideNameText();
            const glitchPromise = this.scene.ui.getMessageHandler().glitchOutDialogue(350);
            glitchPromise.then(() => {
              this.scene.ui.showMessageChrome();
              this.scene.ui.clearText();
              this.scene.ui.getMessageHandler().restoreDefaultPanelStyle();
            });
            Promise.all([
              glitchPromise,
              this.scene.charSprite.hide(),
              this.scene.hideFieldOverlay(750),
            ]).then(() => {
              originalFunc();
            });
          };
          const trainer = this.scene.currentBattle.trainer;
          this.scene.ui.getMessageHandler().applySmitomPanelStyle();
          if(trainer?.config.trainerType == TrainerType.SMITTY) {
            this.scene.showFieldOverlay(500, { withDialogueBg: true, bgTextureKey: "smitom_dialogue_bg" }).then(() => this.scene.charSprite.showCharacter("smitty_trainers", `${trainer?.config.smittyVariantIndex+1}`).then(() => showMessage()));
          }
          else {
            this.scene.showFieldOverlay(500, { withDialogueBg: true, bgTextureKey: "smitom_dialogue_bg" }).then(() => this.scene.charSprite.showCharacter(this.scene.currentBattle.trainer?.getKey()!, getCharVariantFromDialogue(victoryMessages[0])).then(() => showMessage()));
          }
        } else {
          showMessage();
        }
      } else {
        showMessageOrEnd();
      }
    }, null, true);
  }

  private incrementTrainerTypeStats(trainerType: TrainerType): void {
    if (TRAINER_TYPES.ELITE_FOUR.FIRST.includes(trainerType) ||
        TRAINER_TYPES.ELITE_FOUR.SECOND.includes(trainerType) ||
        TRAINER_TYPES.ELITE_FOUR.THIRD.includes(trainerType) ||
        TRAINER_TYPES.ELITE_FOUR.FOURTH.includes(trainerType)) {
      this.scene.gameData.gameStats.elite4Defeated++;
    }
    else if (TRAINER_TYPES.ELITE_FOUR.CHAMPION.includes(trainerType)) {
      this.scene.gameData.gameStats.championsDefeated++;
    }
    else if (TRAINER_TYPES.EVIL_TEAM_GRUNTS.includes(trainerType)) {
      this.scene.gameData.gameStats.gruntsDefeated++;
    }
    else if (TRAINER_TYPES.EVIL_TEAM_ADMINS.some(admins =>
               Array.isArray(admins) ? admins.includes(trainerType) : admins === trainerType)) {
      this.scene.gameData.gameStats.evilAdminsDefeated++;
    }
    else if (TRAINER_TYPES.EVIL_TEAM_BOSSES.FIRST.includes(trainerType) ||
               TRAINER_TYPES.EVIL_TEAM_BOSSES.SECOND.includes(trainerType)) {
      this.scene.gameData.gameStats.evilBossesDefeated++;
    }
    else if (trainerType === TrainerType.SMITTY) {
      this.scene.gameData.gameStats.smittysDefeated++;
    }
  }
}