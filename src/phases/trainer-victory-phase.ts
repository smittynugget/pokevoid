import BattleScene from "#app/battle-scene.js";
import { getCharVariantFromDialogue } from "#app/data/dialogue.js";
import { TrainerType } from "#app/enums/trainer-type.js";
import { modifierTypes } from "#app/modifier/modifier-type.js";
import { vouchers } from "#app/system/voucher.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import { ModifierRewardPhase } from "./modifier-reward-phase";
import { MoneyRewardPhase } from "./money-reward-phase";
import { TrainerSlot } from "#app/data/trainer-config";
import { TRAINER_TYPES } from "#app/battle.js";

export class TrainerVictoryPhase extends BattlePhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    this.scene.disableMenu = true;

    this.scene.playBgm(this.scene.currentBattle.trainer?.config.victoryBgm);

    // this.scene.unshiftPhase(new MoneyRewardPhase(this.scene, this.scene.currentBattle.trainer?.config.moneyMultiplier!)); // TODO: is this bang correct?

    const modifierRewardFuncs = this.scene.currentBattle.trainer?.config.modifierRewardFuncs ?? []; // TODO: is this bang correct?
    for (const modifierRewardFunc of modifierRewardFuncs) {
      this.scene.unshiftPhase(new ModifierRewardPhase(this.scene, modifierRewardFunc));
    }

    const trainerType = this.scene.currentBattle.trainer?.config.trainerType!; // TODO: is this bang correct?
    
    this.incrementTrainerTypeStats(trainerType);
    
    if (vouchers.hasOwnProperty(TrainerType[trainerType])) {
      if (!this.scene.validateVoucher(vouchers[TrainerType[trainerType]]) && this.scene.currentBattle.trainer?.config.isBoss && !this.scene.currentBattle.trainer?.isDynamicRival) {
        this.scene.unshiftPhase(new ModifierRewardPhase(this.scene, [modifierTypes.VOUCHER, modifierTypes.VOUCHER, modifierTypes.VOUCHER_PLUS][vouchers[TrainerType[trainerType]].voucherType]));
      }
    }

    this.scene.ui.showText(i18next.t("battle:trainerDefeated", { trainerName: this.scene.currentBattle.trainer?.getName(TrainerSlot.NONE, true) }), null, () => {
      const victoryMessages = this.scene.currentBattle.trainer?.getVictoryMessages()!; // TODO: is this bang correct?
      let message: string;
      this.scene.executeWithSeedOffset(() => message = Utils.randSeedItem(victoryMessages), this.scene.currentBattle.waveIndex);
      message = message!; // tell TS compiler it's defined now

      const showMessage = () => {
        const originalFunc = showMessageOrEnd;
        showMessageOrEnd = () => this.scene.ui.showDialogue(message, this.scene.currentBattle.trainer?.getName(TrainerSlot.TRAINER, true), null, originalFunc);

        showMessageOrEnd();
      };
      let showMessageOrEnd = () => this.end();
      if (victoryMessages?.length) {
        if (this.scene.currentBattle.trainer?.config.hasCharSprite && !this.scene.ui.shouldSkipDialogue(message)) {
          const originalFunc = showMessageOrEnd;
          showMessageOrEnd = () => this.scene.charSprite.hide().then(() => this.scene.hideFieldOverlay(250).then(() => originalFunc()));
          const trainer = this.scene.currentBattle.trainer;
          if(trainer?.config.trainerType == TrainerType.SMITTY) {
            this.scene.showFieldOverlay(500).then(() => this.scene.charSprite.showCharacter("smitty_trainers", `${trainer?.config.smittyVariantIndex+1}`).then(() => showMessage())); // TODO: is this bang correct?
          }
          else {
          this.scene.showFieldOverlay(500).then(() => this.scene.charSprite.showCharacter(this.scene.currentBattle.trainer?.getKey()!, getCharVariantFromDialogue(victoryMessages[0])).then(() => showMessage())); // TODO: is this bang correct?
          }
        } else {
          showMessage();
        }
      } else {
        showMessageOrEnd();
      }
    }, null, true);

    this.showEnemyTrainer();
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
