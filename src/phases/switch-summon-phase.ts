import BattleScene from "#app/battle-scene.js";
import { applyPreSwitchOutAbAttrs, PreSwitchOutAbAttr } from "#app/data/ability.js";
import { allMoves, ForceSwitchOutAttr } from "#app/data/move.js";
import { getPokeballTintColor } from "#app/data/pokeball.js";
import { getTypeRgb } from "#app/data/type.js";
import { PokeballType } from "#enums/pokeball";
import { SpeciesFormChangeActiveTrigger } from "#app/data/pokemon-forms.js";
import { TrainerSlot } from "#app/data/trainer-config.js";
import Pokemon from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { SwitchEffectTransferModifier } from "#app/modifier/modifier.js";
import { Command } from "#app/ui/command-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import { SummonPhase } from "./summon-phase";
import { PostSummonPhase } from "./post-summon-phase";
import { isNuzlockeActive } from "#app/game-mode.js";
export class SwitchSummonPhase extends SummonPhase {
  private slotIndex: integer;
  private doReturn: boolean;
  private batonPass: boolean;
  private releaseSwitchedOut: boolean;

  private lastPokemon: Pokemon;
  constructor(scene: BattleScene, fieldIndex: integer, slotIndex: integer, doReturn: boolean, batonPass: boolean, player?: boolean, releaseSwitchedOut: boolean = false) {
    super(scene, fieldIndex, player !== undefined ? player : true);

    this.slotIndex = slotIndex;
    this.doReturn = doReturn;
    this.batonPass = batonPass;
    this.releaseSwitchedOut = releaseSwitchedOut;
  }

  start(): void {
    super.start();
  }

  preSummon(): void {
    this.scene.ui.setMode(Mode.MESSAGE).then(() => {
      if (!this.player) {
        if (this.slotIndex === -1) {

          this.slotIndex = this.scene.currentBattle.trainer?.getNextSummonIndex( TrainerSlot.TRAINER);
        }
        if (this.slotIndex > -1) {
          this.showEnemyTrainer(TrainerSlot.TRAINER);
          this.scene.pbTrayEnemy.showPbTray(this.scene.getEnemyParty());
        }
      }

      if (!this.doReturn || (this.slotIndex !== -1 && !(this.player ? this.scene.getParty() : this.scene.getEnemyParty())[this.slotIndex])) {
        if (this.player) {
          this.switchAndSummon();
        } else {
          this.scene.time.delayedCall(750, () => this.switchAndSummon());
        }
        return;
      }

      const pokemon = this.getPokemon();

      if (!this.batonPass) {
        (this.player ? this.scene.getEnemyField() : this.scene.getPlayerField()).forEach(enemyPokemon => enemyPokemon.removeTagsBySourceId(pokemon.id));
      }

      this.scene.ui.showText(this.player ?
        i18next.t("battle:playerComeBack", { pokemonName: getPokemonNameWithAffix(pokemon) }) :
        i18next.t("battle:trainerComeBack", {
          trainerName: this.scene.currentBattle.trainer?.getName(!(this.fieldIndex % 2) ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER),
          pokemonName: getPokemonNameWithAffix(pokemon)
        })
      );
      this.scene.playSound("se/pb_rel");
      pokemon.hideInfo();
      const switchTint = pokemon.typeBallType !== undefined
        ? Phaser.Display.Color.GetColor(...getTypeRgb(pokemon.typeBallType))
        : (pokemon.pokeball === PokeballType.VOID_BALL ? 0x2d1450 : getPokeballTintColor(pokemon.pokeball));
      pokemon.tint(switchTint, 1, 250, "Sine.easeIn");
      this.scene.tweens.add({
        targets: pokemon,
        duration: 250,
        ease: "Sine.easeIn",
        scale: 0.5,
        onComplete: () => {
          pokemon.leaveField(!this.batonPass, false);
          this.scene.time.delayedCall(750, () => this.switchAndSummon());
        }
      });
    });
  }

  switchAndSummon() {
    const party = this.player ? this.getParty() : this.scene.getEnemyParty();
    const switchedInPokemon = party[this.slotIndex];
    this.lastPokemon = this.getPokemon();
    if(this.player) {
      this.scene.currentBattle.markPokemonAsSwitchedOut(this.lastPokemon.id);
      this.scene.gameData.gameStats.pokemonSwitched++;
    }

    applyPreSwitchOutAbAttrs(PreSwitchOutAbAttr, this.lastPokemon);
    if (this.batonPass && switchedInPokemon) {
      (this.player ? this.scene.getEnemyField() : this.scene.getPlayerField()).forEach(enemyPokemon => enemyPokemon.transferTagsBySourceId(this.lastPokemon.id, switchedInPokemon.id));
      if (!this.scene.findModifier(m => m instanceof SwitchEffectTransferModifier && (m as SwitchEffectTransferModifier).pokemonId === switchedInPokemon.id)) {
        const batonPassModifier = this.scene.findModifier(m => m instanceof SwitchEffectTransferModifier
            && (m as SwitchEffectTransferModifier).pokemonId === this.lastPokemon.id) as SwitchEffectTransferModifier;
        if (batonPassModifier && !this.scene.findModifier(m => m instanceof SwitchEffectTransferModifier && (m as SwitchEffectTransferModifier).pokemonId === switchedInPokemon.id)) {
          this.scene.tryTransferHeldItemModifier(batonPassModifier, switchedInPokemon, false);
        }
      }
    }
    if (switchedInPokemon) {
      party[this.slotIndex] = this.lastPokemon;
      party[this.fieldIndex] = switchedInPokemon;
      const showTextAndSummon = () => {
        this.scene.ui.showText(this.player ?
          i18next.t("battle:playerGo", { pokemonName: getPokemonNameWithAffix(switchedInPokemon) }) :
          i18next.t("battle:trainerGo", {
            trainerName: this.scene.currentBattle.trainer?.getName(!(this.fieldIndex % 2) ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER),
            pokemonName: this.getPokemon().getNameToRender()
          })
        );

        if (!this.batonPass) {
          switchedInPokemon.resetBattleData();
          switchedInPokemon.resetSummonData();
        }
        this.summon();
      };
      if (this.player) {
        showTextAndSummon();
      } else {
        this.scene.time.delayedCall(1500, () => {
          this.hideEnemyTrainer();
          this.scene.pbTrayEnemy.hide();
          showTextAndSummon();
        });
      }
    } else {
      this.end();
    }
  }

  onEnd(): void {
    super.onEnd();

    const pokemon = this.getPokemon();

    const moveId = this.lastPokemon?.scene.currentBattle.lastMove;
    const lastUsedMove = moveId ? allMoves[moveId] : undefined;

    const currentCommand = pokemon.scene.currentBattle.turnCommands[this.fieldIndex]?.command;
    const lastPokemonIsForceSwitchedAndNotFainted = lastUsedMove?.hasAttr(ForceSwitchOutAttr) && !this.lastPokemon.isFainted();
    if (currentCommand === Command.POKEMON || lastPokemonIsForceSwitchedAndNotFainted) {
      pokemon.battleSummonData.turnCount--;
    }

    if (this.batonPass && pokemon) {
      pokemon.transferSummon(this.lastPokemon);
    }

    this.lastPokemon?.resetSummonData();

    if (this.releaseSwitchedOut && this.player && this.lastPokemon) {
      const party = this.scene.getParty();
      const releaseIndex = party.findIndex(p => p.id === this.lastPokemon.id);
      if (releaseIndex > -1) {
        this.scene.currentBattle?.removeFaintedParticipant(this.lastPokemon as any);
        this.scene.removePartyMemberModifiers(releaseIndex);
        const releasedPokemon = party.splice(releaseIndex, 1)[0];
        releasedPokemon.destroy();
      }
    }

    this.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeActiveTrigger, true);
    if (this.scene.gameMode.isNuzlockeActive(this.scene)) {
      this.scene.getParty().forEach((pokemon, index) => {
        if (pokemon.isFainted()) {
          const pokemonIndex = this.scene.getParty().indexOf(pokemon);
          this.scene.removePartyMemberModifiers(pokemonIndex);
          this.scene.getParty().splice(pokemonIndex, 1)[0];
          pokemon.destroy();

        }
      });
    }
    this.scene.arena.triggerWeatherBasedFormChanges();
  }

  queuePostSummon(): void {
    this.scene.unshiftPhase(new PostSummonPhase(this.scene, this.getPokemon().getBattlerIndex()));
  }
}