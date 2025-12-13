import BattleScene from "#app/battle-scene.js";
import PartyUiHandler, { PartyUiMode, PartyOption } from "#app/ui/party-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import { BattlePhase } from "./battle-phase";
import { SwitchSummonPhase } from "./switch-summon-phase";
export class SwitchPhase extends BattlePhase {
  protected fieldIndex: integer;
  private isModal: boolean;
  private doReturn: boolean;
  constructor(scene: BattleScene, fieldIndex: integer, isModal: boolean, doReturn: boolean) {
    super(scene);

    this.fieldIndex = fieldIndex;
    this.isModal = isModal;
    this.doReturn = doReturn;
  }

  start() {
    super.start();
    if (this.isModal && !this.scene.getParty().filter(p => p.isAllowedInBattle() && !p.isActive(true)).length) {
      return super.end();
    }
    if (this.isModal && !this.doReturn && !this.scene.getParty()[this.fieldIndex].isFainted()) {
      return super.end();
    }
    if (this.isModal && this.scene.getPlayerField().filter(p => p.isAllowedInBattle() && p.isActive(true)).length >= this.scene.currentBattle.getBattlerCount()) {
      return super.end();
    }
    const fieldIndex = this.scene.currentBattle.getBattlerCount() === 1 || this.scene.getParty().filter(p => p.isAllowedInBattle()).length > 1 ? this.fieldIndex : 0;

    this.scene.ui.setMode(Mode.PARTY, this.isModal ? PartyUiMode.FAINT_SWITCH : PartyUiMode.POST_BATTLE_SWITCH, fieldIndex, (slotIndex: integer, option: PartyOption) => {
      if (slotIndex >= this.scene.currentBattle.getBattlerCount() && slotIndex < 6) {
        this.scene.unshiftPhase(new SwitchSummonPhase(this.scene, fieldIndex, slotIndex, this.doReturn, option === PartyOption.PASS_BATON));
      }
      this.scene.ui.setMode(Mode.MESSAGE).then(() => super.end());
    }, PartyUiHandler.FilterNonFainted);
  }
}