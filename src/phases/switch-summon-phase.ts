import BattleScene from "#app/battle-scene.js";
import { applyPostFaintReplacementAbAttrs, applyPreSwitchOutAbAttrs, PostFaintReplacementAbAttr, PreSwitchOutAbAttr } from "#app/data/ability.js";
import { StealHeldItemChanceAttr } from "#app/data/move.js";
import { getPokeballTintColor } from "#app/data/pokeball.js";
import { getTypeRgb } from "#app/data/type.js";
import { BattlerTagType } from "#app/enums/battler-tag-type.js";
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
import { StatChangePhase } from "./stat-change-phase";
import { PokemonHealPhase } from "./pokemon-heal-phase";
import { isNuzlockeActive } from "#app/game-mode.js";
import * as Utils from "../utils";
import { SubstituteTag } from "#app/data/battler-tags.js";
export class SwitchSummonPhase extends SummonPhase {
  private slotIndex: integer;
  private doReturn: boolean;
  private batonPass: boolean;
  private releaseSwitchedOut: boolean;
  private preSwitchOutAbilityApplied: boolean = false;
  private preSwitchOutSummonSnapshot: any = null;

  private lastPokemon: Pokemon;
  constructor(scene: BattleScene, fieldIndex: integer, slotIndex: integer, doReturn: boolean, batonPass: boolean, player?: boolean, releaseSwitchedOut: boolean = false, preSwitchOutAlreadyApplied: boolean = false) {
    super(scene, fieldIndex, player !== undefined ? player : true);

    this.slotIndex = slotIndex;
    this.doReturn = doReturn;
    this.batonPass = batonPass;
    this.releaseSwitchedOut = releaseSwitchedOut;
    this.preSwitchOutAbilityApplied = preSwitchOutAlreadyApplied;
  }

  start(): void {
    super.start();
  }

  preSummon(): void {
    const replayActive = false;
    const run = () => {
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
          const party = this.player ? this.getParty() : this.scene.getEnemyParty();
          const switchedIn = party[this.slotIndex];
          applyPreSwitchOutAbAttrs(PreSwitchOutAbAttr, pokemon, false, switchedIn);
          this.preSwitchOutAbilityApplied = true;
          this.preSwitchOutSummonSnapshot = pokemon.summonData ? {
            switchOutAllyStatBoost: pokemon.summonData.switchOutAllyStatBoost,
            incomingStatBoostTag: pokemon.summonData.incomingStatBoostTag,
            incomingAllyHealRatio: pokemon.summonData.incomingAllyHealRatio,
            incomingAllyCureStatus: pokemon.summonData.incomingAllyCureStatus,
            retainSubstituteForAlly: pokemon.summonData.retainSubstituteForAlly,
            stealItemOnSwitch: pokemon.summonData.stealItemOnSwitch,
            stealItemOnSwitchBeneficiaryId: pokemon.summonData.stealItemOnSwitchBeneficiaryId,
            spawnMigrationSourceId: pokemon.summonData.spawnMigrationSourceId,
          } : null;
          pokemon.leaveField(!this.batonPass, false);
          this.scene.time.delayedCall(750, () => this.switchAndSummon());
        }
      });
    };
    if (replayActive) {
      run();
      return;
    }
    this.scene.ui.setMode(Mode.MESSAGE).then(run);
  }

  switchAndSummon() {
    const party = this.player ? this.getParty() : this.scene.getEnemyParty();
    const switchedInPokemon = party[this.slotIndex];
    this.lastPokemon = this.getPokemon();
    if(this.player) {
      this.scene.currentBattle.markPokemonAsSwitchedOut(this.lastPokemon.id);
      this.scene.gameData.gameStats.pokemonSwitched++;
    }

    if (!this.preSwitchOutAbilityApplied) {
      applyPreSwitchOutAbAttrs(PreSwitchOutAbAttr, this.lastPokemon, false, switchedInPokemon);
    }
    const outgoing = this.lastPokemon;
    const sd = this.preSwitchOutSummonSnapshot || outgoing?.summonData;
    if (sd?.switchOutAllyStatBoost && switchedInPokemon) {
      const { stat, levels } = sd.switchOutAllyStatBoost;
      this.scene.unshiftPhase(new StatChangePhase(this.scene, switchedInPokemon.getBattlerIndex(), true, [stat], levels));
    }
    if (sd?.incomingStatBoostTag && switchedInPokemon) {
      const { stat, levels } = sd.incomingStatBoostTag;
      this.scene.unshiftPhase(new StatChangePhase(this.scene, switchedInPokemon.getBattlerIndex(), true, [stat], levels));
    }
    if (sd?.incomingAllyHealRatio && switchedInPokemon) {
      const heal = Utils.toDmgValue(switchedInPokemon.getMaxHp() * sd.incomingAllyHealRatio);
      this.scene.unshiftPhase(new PokemonHealPhase(this.scene, switchedInPokemon.getBattlerIndex(), heal, "", true, true));
    }
    if (sd?.incomingAllyCureStatus && switchedInPokemon) {
      switchedInPokemon.resetStatus(true, true);
      switchedInPokemon.updateInfo();
    }
    if (sd?.retainSubstituteForAlly && switchedInPokemon) {
      const sub = outgoing.getTag(BattlerTagType.SUBSTITUTE) as SubstituteTag;
      if (sub) {
        outgoing.removeTag(BattlerTagType.SUBSTITUTE);
        const xfer = new SubstituteTag(sub.sourceMove, sub.sourceId);
        xfer.hp = sub.hp;
        switchedInPokemon.summonData.tags.push(xfer);
      }
    }
    if (sd?.stealItemOnSwitch && switchedInPokemon) {
      const beneficiaryId = sd.stealItemOnSwitchBeneficiaryId;
      const beneficiary = beneficiaryId !== undefined
        ? this.scene.getPokemonById(beneficiaryId) ?? outgoing
        : outgoing;
      new StealHeldItemChanceAttr(1).apply(beneficiary, switchedInPokemon, null as any, []);
    }
    if (sd?.spawnMigrationSourceId !== undefined && switchedInPokemon) {
      const sourceMove = outgoing.getTag(BattlerTagType.SEEDED)?.sourceMove;
      if (sourceMove !== undefined) {
        switchedInPokemon.addTag(BattlerTagType.SEEDED, 0, sourceMove, sd.spawnMigrationSourceId);
      }
    } else if (outgoing?.battleSummonData?.pendingSpawnMigrationSourceId !== undefined && switchedInPokemon) {
      const sourceMove = outgoing.battleSummonData.pendingSpawnMigrationMove;
      if (sourceMove !== undefined) {
        switchedInPokemon.addTag(BattlerTagType.SEEDED, 0, sourceMove, outgoing.battleSummonData.pendingSpawnMigrationSourceId);
      }
      outgoing.battleSummonData.pendingSpawnMigrationSourceId = undefined;
      outgoing.battleSummonData.pendingSpawnMigrationMove = undefined;
    }
    if (outgoing?.summonData) {
      outgoing.summonData.switchOutAllyStatBoost = undefined;
      outgoing.summonData.incomingStatBoostTag = undefined;
      outgoing.summonData.incomingAllyHealRatio = undefined;
      outgoing.summonData.incomingAllyCureStatus = undefined;
      outgoing.summonData.retainSubstituteForAlly = undefined;
      outgoing.summonData.stealItemOnSwitch = undefined;
      outgoing.summonData.stealItemOnSwitchBeneficiaryId = undefined;
      outgoing.summonData.spawnMigrationSourceId = undefined;
    }
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
    if (pokemon?.battleSummonData) {
      pokemon.battleSummonData.enteredFromKnockOut = !!this.lastPokemon?.isFainted();
    }

    const currentCommand = pokemon.scene.currentBattle.turnCommands[this.fieldIndex]?.command;
    if (currentCommand === Command.POKEMON) {
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

    if (this.lastPokemon?.isFainted()) {
      applyPostFaintReplacementAbAttrs(PostFaintReplacementAbAttr, this.lastPokemon, this.getPokemon());
    }
    this.scene.unshiftPhase(new PostSummonPhase(this.scene, this.getPokemon().getBattlerIndex()));
  }
}