import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { BattleSpec } from "#app/enums/battle-spec.js";
import { DamageResult, EnemyPokemon, HitResult } from "#app/field/pokemon.js";
import * as Utils from "#app/utils.js";
import { PokemonPhase } from "./pokemon-phase";
import { QuietFormChangePhase } from "./quiet-form-change-phase";
import { CustomDialoguePhase } from "./custom-dialogue-phase";

export class DamagePhase extends PokemonPhase {
  private amount: integer;
  private damageResult: DamageResult;
  private critical: boolean;

  constructor(scene: BattleScene, battlerIndex: BattlerIndex, amount: integer, damageResult?: DamageResult, critical: boolean = false) {
    super(scene, battlerIndex);

    this.amount = amount;
    this.damageResult = damageResult || HitResult.EFFECTIVE;
    this.critical = critical;
  }

  start() {
    super.start();

    if (this.damageResult === HitResult.ONE_HIT_KO) {
      if (this.scene.moveAnimations) {
        this.scene.toggleInvert(true);
      }
      this.scene.time.delayedCall(Utils.fixedInt(1000), () => {
        this.scene.toggleInvert(false);
        this.applyDamage();
      });
      return;
    }

    this.applyDamage();
  }

  updateAmount(amount: integer): void {
    this.amount = amount;
  }
  applyDamage() {
    switch (this.damageResult) {
    case HitResult.EFFECTIVE:
      this.scene.playSound("se/hit");
      break;
    case HitResult.SUPER_EFFECTIVE:
    case HitResult.ONE_HIT_KO:
      this.scene.playSound("se/hit_strong");
      break;
    case HitResult.NOT_VERY_EFFECTIVE:
      this.scene.playSound("se/hit_weak");
      break;
    }

    if (this.amount) {
      this.scene.damageNumberHandler.add(this.getPokemon(), this.amount, this.damageResult, this.critical);
    }

    if (this.damageResult !== HitResult.OTHER) {
      const flashTimer = this.scene.time.addEvent({
        delay: 100,
        repeat: 5,
        startAt: 200,
        callback: () => {
          const pokemon = this.getPokemon();
          const visible = flashTimer.repeatCount % 2 === 0;
          pokemon.getSprite().setVisible(visible);
          if (!flashTimer.repeatCount) {
            this.getPokemon().updateInfo().then(() => this.end());
          }
        }
      });
    } else {
      this.getPokemon().updateInfo().then(() => this.end());
    }
  }

  override end() {
    if (this.scene.gameMode.isWavePreFinal(this.scene, this.scene.currentBattle.waveIndex) && this.getPokemon() instanceof EnemyPokemon && !this.getPokemon().is2ndStageBoss) {
      this.scene.initFinalBossPhaseTwo(this.getPokemon());
    } else if (this.shouldTriggerTutorialGlitch()) {
      this.triggerTutorialGlitch();
    } else {
      super.end();
    }
  }

  private shouldTriggerTutorialGlitch(): boolean {
    const script = this.scene.gameData.tutorialBattleScript;
    if (!script || script.tutorialGlitchTriggered) {
      return false;
    }
    if (!this.scene.gameData.tutorialOnboardActive) {
      return false;
    }
    const pokemon = this.getPokemon();
    if (!(pokemon instanceof EnemyPokemon)) {
      return false;
    }
    if (!pokemon.isBoss()) {
      return false;
    }
    return pokemon.bossSegmentIndex < 1;
  }

  private triggerTutorialGlitch(): void {
    const script = this.scene.gameData.tutorialBattleScript!;
    script.tutorialGlitchTriggered = true;

    const enemy = this.getPokemon() as EnemyPokemon;

    this.scene.unshiftPhase(new CustomDialoguePhase(
      this.scene,
      "blue",
      "dialogue:tutorial_blue.void_power.1",
      "Blue",
      () => {}
    ));

    if (enemy.species.forms?.length) {
      const glitchFormIndex = enemy.species.forms.findIndex(f => f.formKey?.includes("glitch"));
      if (glitchFormIndex >= 0) {
        const formChange = {
          speciesId: enemy.species.speciesId,
          preFormKey: enemy.getFormKey(),
          formKey: enemy.species.forms[glitchFormIndex].formKey,
          trigger: null as any,
          canChange: () => true
        };
        this.scene.unshiftPhase(new QuietFormChangePhase(this.scene, enemy, formChange));
      }
    }

    super.end();
  }
}