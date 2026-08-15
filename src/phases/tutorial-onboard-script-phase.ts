import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { SmitomTutorialPhase } from "#app/phases/smitom-tutorial-phase.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { ShopModifierSelectPhase } from "#app/phases/shop-modifier-select-phase.js";
import { ModifierTypeOption } from "#app/modifier/modifier-type.js";
import { TypeSwitcherModifierType, AnyPassiveAbilityModifierType, AnyTmModifierType } from "#app/modifier/modifier-type.js";
import { Type } from "#app/data/type.js";
import { Abilities } from "#enums/abilities";
import { allAbilities } from "#app/data/ability.js";
import { Moves } from "#enums/moves";
import { PathNodeTypeFilter } from "#app/modifier/modifier-type.js";
import { Species } from "#enums/species";
import i18next from "i18next";

export function getResistantTypes(foeSpecies: number): { primary: Type; secondary: Type } {
  switch (foeSpecies) {
    case Species.BLASTOISE: return { primary: Type.GRASS, secondary: Type.STEEL };
    case Species.CHARIZARD: return { primary: Type.WATER, secondary: Type.BUG };
    case Species.VENUSAUR:  return { primary: Type.FIRE, secondary: Type.STEEL };
    default:                return { primary: Type.WATER, secondary: Type.ROCK };
  }
}

function getStabMoveForType(type: Type): Moves {
  switch (type) {
    case Type.WATER: return Moves.SURF;
    case Type.GRASS: return Moves.ENERGY_BALL;
    case Type.FIRE: return Moves.FLAMETHROWER;
    default: return Moves.FLAMETHROWER;
  }
}

export function queueSmitomThenReward(
  scene: BattleScene,
  tutorialKey: string,
  title: string,
  texts: string[],
  options: ModifierTypeOption[],
  onComplete: () => void
): void {
  scene.unshiftPhase(new SmitomTutorialPhase(scene, tutorialKey, title, texts, false));
  const rewardPhase = new SelectModifierPhase(
    scene,
    0,
    undefined,
    true,
    () => {
      onComplete();
    },
    PathNodeTypeFilter.NONE,
    0,
    options
  );
  rewardPhase.suppressReroll = true;
  rewardPhase.allowSkip = true;
  scene.unshiftPhase(rewardPhase);
}

export function queueSmitomThenShop(
  scene: BattleScene,
  tutorialKey: string,
  title: string,
  texts: string[],
  onEndCallback?: () => void
): void {
  scene.unshiftPhase(new SmitomTutorialPhase(scene, tutorialKey, title, texts, false));
  scene.unshiftPhase(new ShopModifierSelectPhase(scene, undefined, onEndCallback));
}

export class TutorialOnboardScriptPhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();
    const script = this.scene.gameData.tutorialBattleScript;
    if (!script || script.step === "complete" || script.rewardSubstep !== "idle") {
      this.end();
      return;
    }

    if (script.step.endsWith("_given")) {
      script.turnsSinceLastReward++;
    }

    const player = this.scene.getPlayerPokemon();

    switch (script.step) {
      case "pending_hp_trigger":
        if (player && player.getHpRatio() < 0.5) {
          script.rewardSubstep = "smitom";
          const { primary, secondary } = getResistantTypes(script.foeSpecies!);
          queueSmitomThenReward(
            this.scene,
            "tutorial_battle_type_tip",
            i18next.t("tutorial:smitomTip.tutorialBattleType.title"),
            [i18next.t("tutorial:smitomTip.tutorialBattleType.1")],
            [new ModifierTypeOption(new TypeSwitcherModifierType(primary, secondary), 0, 0)],
            () => {
              script.step = "type_switcher_given";
              script.turnsSinceLastReward = 0;
              script.rewardSubstep = "idle";
            }
          );
        }
        break;

      case "type_switcher_given":
        if (script.turnsSinceLastReward >= 1) {
          script.rewardSubstep = "smitom";
          queueSmitomThenReward(
            this.scene,
            "tutorial_battle_heal_tip",
            i18next.t("tutorial:smitomTip.tutorialBattleHeal.title"),
            [i18next.t("tutorial:smitomTip.tutorialBattleHeal.1")],
            [new ModifierTypeOption(new AnyPassiveAbilityModifierType(allAbilities[Abilities.LEFTOVERS_POWER]), 0, 0)],
            () => {
              script.step = "heal_ability_given";
              script.turnsSinceLastReward = 0;
              script.rewardSubstep = "idle";
            }
          );
        }
        break;

      case "heal_ability_given":
        if (script.turnsSinceLastReward >= 1) {
          script.rewardSubstep = "smitom";
          const { primary: stabType } = getResistantTypes(script.foeSpecies!);
          const stabMove = getStabMoveForType(stabType);
          queueSmitomThenReward(
            this.scene,
            "tutorial_battle_xm_tip",
            i18next.t("tutorial:smitomTip.tutorialBattleXM.title"),
            [i18next.t("tutorial:smitomTip.tutorialBattleXM.1")],
            [new ModifierTypeOption(new AnyTmModifierType(stabMove), 0, 0)],
            () => {
              script.step = "complete";
              script.turnsSinceLastReward = 0;
              script.rewardSubstep = "idle";
            }
          );
        }
        break;
    }

    this.end();
  }
}