import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { Moves } from "#enums/moves";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import i18next from "i18next";

export class YuMovePhase extends Phase {
  private draftOnly: boolean;

  constructor(
    scene: BattleScene,
    private pokemon: PlayerPokemon,
    private moveChoices: Moves[],
    private onComplete?: () => void,
    draftOnly?: boolean
  ) {
    super(scene);
    this.draftOnly = draftOnly ?? false;
  }

  async start() {
    super.start();

    const { ModifierTypeOption, YuTmModifierType, PathNodeTypeFilter } = await import("#app/modifier/modifier-type.js");

    const targetPokemon = this.pokemon;
    const options = this.moveChoices.map(id =>
      new ModifierTypeOption(new YuTmModifierType(id, targetPokemon.id), 0, 0)
    );

    const phase = new SelectModifierPhase(
      this.scene,
      0,
      undefined,
      this.draftOnly,
      () => {
        this.onComplete?.();
      },
      PathNodeTypeFilter.NONE,
      0,
      options
    );
    phase.suppressReroll = true;
    phase.uiDisplayConfig = {
      title: i18next.t("modifierSelectUiHandler:yuMoveOfferTitle"),
      subtitle: i18next.t("modifierSelectUiHandler:yuMoveOfferSubtitle"),
      hideShop: true,
      isYuMovePhase: true,
    };

    this.scene.unshiftPhase(phase);
    this.end();
  }
}