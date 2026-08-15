import BattleScene from "#app/battle-scene.js";
import { BattlerIndex, BattleType } from "#app/battle.js";
import { applyPostFaintAbAttrs, PostFaintAbAttr, applyPostKnockOutAbAttrs, PostKnockOutAbAttr, applyPostVictoryAbAttrs, PostVictoryAbAttr } from "#app/data/ability.js";
import { BattlerTagLapseType } from "#app/data/battler-tags.js";
import { battleSpecDialogue } from "#app/data/dialogue.js";
import { allMoves, PostVictoryStatChangeAttr } from "#app/data/move.js";
import { BattleSpec } from "#app/enums/battle-spec.js";
import { StatusEffect } from "#app/enums/status-effect.js";
import { Type } from "#app/data/type.js";
import { PokemonMove, EnemyPokemon, PlayerPokemon, HitResult, PokemonBattleSummonData } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { PokemonInstantReviveModifier } from "#app/modifier/modifier.js";
import i18next from "i18next";
import { DamagePhase } from "./damage-phase";
import { PokemonPhase } from "./pokemon-phase";
import { SwitchSummonPhase } from "./switch-summon-phase";
import { ToggleDoublePositionPhase } from "./toggle-double-position-phase";
import { GameOverPhase } from "./game-over-phase";
import { RunInfoPhase } from "./run-info-phase";
import { SwitchPhase } from "./switch-phase";
import { VictoryPhase } from "./victory-phase";
import { playPortalFaintAnim } from "#app/field/portal-anim.js";
import { TrainerType } from "#enums/trainer-type";
import { STORY_CUTSCENES, getLossWhiteoutHomebaseSlidesRandomized } from "#app/system/story-cutscenes.js";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { ShowRewards } from "#app/utils/show-rewards.js";
import * as Utils from "#app/utils";
import {PokemonReviveModifierType} from "#app/modifier/modifier-type";
import {PermaFaintQuestModifier, PermaKnockoutQuestModifier} from "#app/modifier/modifier";
import {PermaType} from "#app/modifier/perma-modifiers";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import { CollectedTypeModifierType } from "#app/modifier/modifier-type.ts";
import { isDuelmonSpecies } from "#app/data/duelmon-rankups.js";
import { getYuMoveRange } from "#app/data/yu-move-utils.js";
import Overrides from "#app/overrides.js";
import { TitlePhase } from "./title-phase";

export class FaintPhase extends PokemonPhase {
  private preventEndure: boolean;
  private hasEnded: boolean = false;

  constructor(scene: BattleScene, battlerIndex: BattlerIndex, preventEndure?: boolean) {
    super(scene, battlerIndex);

    this.preventEndure = preventEndure!;
  }

  start() {
    super.start();

    if (!this.preventEndure) {
      const instantReviveModifier = this.scene.applyModifier(PokemonInstantReviveModifier, this.player, this.getPokemon()) as PokemonInstantReviveModifier;

      if (instantReviveModifier) {
        if (!--instantReviveModifier.stackCount) {
          this.scene.removeModifier(instantReviveModifier);
        }
        this.scene.updateModifiers(this.player);
        if (this.scene.gameData.tutorialOnboardActive) {
          const script = this.scene.gameData.tutorialBattleScript;
          if (script?.step === "pending_hp_trigger" && script.rewardSubstep === "idle") {
            script.reviverSeedPendingTrigger = true;
          }
        }
        return this.end();
      }
      else if (this.player) {
        let baseReviveChance = 5.5;
        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_3)) {
          baseReviveChance = 10.0;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_2)) {
          baseReviveChance = 7.7;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_1)) {
          baseReviveChance = 6.7;
        }

        let additionalChance = 0;

        try {
          const pokemon = this.getPokemon();
          const reviveChanceByType = (this.scene.gameData as any).activeSkillTree?.reviveChanceByType || {};
          const reviveChanceBySpecies = (this.scene.gameData as any).activeSkillTree?.reviveChanceBySpecies || {};

          if (pokemon) {
            const speciesId = pokemon.species.speciesId;
            const type1 = pokemon.species.type1;
            const type2 = pokemon.species.type2;

            if (reviveChanceBySpecies[speciesId] !== undefined) {
              additionalChance = Math.max(additionalChance, reviveChanceBySpecies[speciesId]);
            }

            if (reviveChanceByType[type1] !== undefined) {
              additionalChance = Math.max(additionalChance, reviveChanceByType[type1]);
            }

            if (type2 !== undefined && reviveChanceByType[type2] !== undefined) {
              additionalChance = Math.max(additionalChance, reviveChanceByType[type2]);
            }
          }
        } catch {
        }

        const totalReviveChance = baseReviveChance + additionalChance;

        if (Utils.randSeedInt(100) < totalReviveChance) {
          const pokemon = this.getPokemon();

          const reviveModifierType = new PokemonReviveModifierType("modifierType:ModifierType.REVIVE", "miracle revive", 50);
          const reviveModifier = new PokemonInstantReviveModifier(reviveModifierType, pokemon.id);
          reviveModifier.apply([pokemon]);
          this.scene.gameData.reducePermaModifierByType([
            PermaType.PERMA_MORE_REVIVE_1,
            PermaType.PERMA_MORE_REVIVE_2,
            PermaType.PERMA_MORE_REVIVE_3
          ], this.scene);

          return this.end();
        }
      }
    }

    if (!this.tryOverrideForBattleSpec()) {
      this.doFaint();
    }
  }
  doFaint(): void {
    const pokemon = this.getPokemon();
    if (pokemon.isPlayer()) {
      this.scene.currentBattle.playerFaints += 1;
      this.scene.currentBattle.lastAllyFaintTurnPlayer = this.scene.currentBattle.turn;
    } else {
      this.scene.currentBattle.enemyFaints += 1;
      this.scene.currentBattle.lastAllyFaintTurnEnemy = this.scene.currentBattle.turn;
    }

    this.scene.queueMessage(i18next.t("battle:fainted", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }), null, true);

    if (pokemon.turnData?.triggerRevive) {
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() / 2));
      pokemon.hp = healAmount;
      pokemon.resetStatus();
      pokemon.battleData.wasRevived = true;
      pokemon.turnData.triggerRevive = undefined;
      pokemon.updateInfo();
      pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` was revived!`);
    }

    if (pokemon.turnData?.attacksReceived?.length) {
      const lastAttack = pokemon.turnData.attacksReceived[0];
      const attacker = this.scene.getPokemonById(lastAttack.sourceId);
      if (attacker) {
        applyPostFaintAbAttrs(PostFaintAbAttr, pokemon, attacker, new PokemonMove(lastAttack.move).getMove(), lastAttack.result);
      } else {
        applyPostFaintAbAttrs(PostFaintAbAttr, pokemon, pokemon, allMoves[1], HitResult.OTHER);
      }
    } else {
      applyPostFaintAbAttrs(PostFaintAbAttr, pokemon, pokemon, allMoves[1], HitResult.OTHER);
    }
    if (!pokemon.isFainted()) {
      this.hasEnded = true;
      return this.end();
    }

    pokemon.cleanupBattleTooltipHover();

    const alivePlayField = this.scene.getField(true);
    alivePlayField.forEach(p => applyPostKnockOutAbAttrs(PostKnockOutAbAttr, p, pokemon));
    this.scene.getParty(pokemon.isPlayer()).forEach(p => {
      if (p !== pokemon && p.battleData) {
        p.battleData.allyFaintsThisBattle = (p.battleData.allyFaintsThisBattle ?? 0) + 1;
      }
    });
    if (pokemon.turnData?.attacksReceived?.length) {
      const defeatSource = this.scene.getPokemonById(pokemon.turnData.attacksReceived[0].sourceId);
      if (defeatSource) {
        if (!defeatSource.battleSummonData) {
          defeatSource.battleSummonData = new PokemonBattleSummonData();
        }
        defeatSource.battleSummonData.lastKoFoeTypes = [...pokemon.getTypes(true)];
        if (defeatSource.isOnField()) {
        applyPostVictoryAbAttrs(PostVictoryAbAttr, defeatSource);

        if (pokemon instanceof EnemyPokemon) {
          this.scene.gameData.permaModifiers
              .findModifiers(m => m instanceof PermaKnockoutQuestModifier)
              .forEach(modifier => modifier.apply([this.scene, defeatSource, pokemon, allMoves[pokemon.turnData.attacksReceived[0].move]]));
          this.scene.findModifiers(m => m instanceof PermaKnockoutQuestModifier)
              .forEach(modifier => modifier.apply([this.scene, defeatSource, pokemon, allMoves[pokemon.turnData.attacksReceived[0].move]]));

          if (defeatSource && defeatSource.isPlayer() && Utils.randSeedChance(30) ) {
            let randomType: Type;
            if (pokemon.isGlitchForm()) {
              randomType = Type.GLITCH;
            } else if (pokemon.species.generation === 1 && Utils.randSeedInt(2) === 0) {
              randomType = (Type as any).GEN_ONE;
            } else {
              randomType = Utils.randItem(pokemon.getTypes());
            }

            this.scene.unshiftPhase(new ModifierRewardPhase(
              this.scene,
              () => new CollectedTypeModifierType(randomType, defeatSource as PlayerPokemon)
            ));
          }
        }

        if (pokemon instanceof EnemyPokemon && defeatSource.isPlayer()) {
          const duelmon = defeatSource as PlayerPokemon;
          if (isDuelmonSpecies(duelmon.species.speciesId)) {
            const range = getYuMoveRange(this.scene);
            if (range >= 0 && duelmon.yuMoveRangeUsed !== range && duelmon.yuMoveRangePending !== range) {
              const trainer = this.scene.currentBattle.trainer;
              const isSpecial = !!trainer && (
                !!(trainer as any).isDynamicRival
                || (trainer.config && trainer.config.isBoss)
              );
              const chance = isSpecial ? 50 : 10;

              if (Overrides.FORCE_YU_MOVE_FLAG_OVERRIDE) {
                duelmon.yuMoveRangePending = range;
              } else {
                this.scene.executeWithSeedOffset(() => {
                  if (Utils.randSeedInt(100) < chance) {
                    duelmon.yuMoveRangePending = range;
                  }
                }, ((duelmon.id << 10) ^ (pokemon.id << 1) ^ this.scene.currentBattle.turn) as integer,
                  this.scene.waveSeed);
              }
            }
          }
        }

        const pvmove = allMoves[pokemon.turnData.attacksReceived[0].move];
        if (pvmove) {
          const pvattrs = pvmove.getAttrs(PostVictoryStatChangeAttr);
          if (pvattrs.length) {
            for (const pvattr of pvattrs) {
              pvattr.applyPostVictory(defeatSource, pokemon, pvmove);
            }
          }
        }
        }
      }
    }
    if (pokemon instanceof PlayerPokemon) {
      this.scene.gameData.permaModifiers
        .findModifiers(m => m instanceof PermaFaintQuestModifier)
        .forEach(modifier => modifier.apply([this.scene, pokemon]));
      this.scene.findModifiers(m => m instanceof PermaFaintQuestModifier)
        .forEach(modifier => modifier.apply([this.scene, pokemon]));
    }

    if (this.player) {

      const legalPlayerPokemon = this.scene.getParty().filter(p => p.isAllowedInBattle());

      const legalPlayerPartyPokemon = legalPlayerPokemon.filter(p => !p.isActive(true));
      if (!legalPlayerPokemon.length) {
        this.scene._inBattleTurn = false;
        if (this.scene.pegasusDebugBattleActive || this.scene.smittyDebugBattleActive || this.scene.wave35SmitomDebugActive || this.scene.wave100DebugActive) {
          this.scene.pegasusDebugBattleActive = false;
          this.scene.smittyDebugBattleActive = false;
          this.scene.wave35SmitomDebugActive = false;
          this.scene.wave100DebugActive = false;
          this.scene.disableStatSwitchers = false;
          this.scene.disableMoveUpgrades = false;
          this.scene.disableReleaseItems = false;
          this.scene.skillTreeEnabledForRun = true;
          this.scene.wave35UnlockedThisRun = false;
          this.scene.clearAllPhaseQueues();
          this.scene.reset(true);
          this.scene.unshiftPhase(new TitlePhase(this.scene));
          this.scene.shiftPhase();
          return;
        }
        if (this.scene.gameData.tutorialOnboardActive) {
          this.end();
          return;
        }
        if (!this.scene.disableCutscenes && !this.scene.lossWhiteoutPreSummaryQueued) {
          this.scene.lossWhiteoutPreSummaryQueued = true;
          const def = STORY_CUTSCENES.loss_whiteout_homebase;
          const slides = getLossWhiteoutHomebaseSlidesRandomized();
          this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
            slides,
            bgmKey: def.bgmKey,
            canSkip: true,
            pauseAfterText: 1000,
            resumeBgmOnEnd: false,
          }));
          this.scene.unshiftPhase(new RunInfoPhase(this.scene, false));
        } else {
          this.scene.unshiftPhase(new RunInfoPhase(this.scene, false));
        }
      } else if (this.scene.currentBattle.double && legalPlayerPokemon.length === 1 && legalPlayerPartyPokemon.length === 0) {

        this.scene.unshiftPhase(new ToggleDoublePositionPhase(this.scene, true));
      } else if (legalPlayerPartyPokemon.length > 0) {

        this.scene.pushPhase(new SwitchPhase(this.scene, this.fieldIndex, true, false));
      }
    } else {
      this.scene.unshiftPhase(new VictoryPhase(this.scene, this.battlerIndex));
      if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
        const hasReservePartyMember = !!this.scene.getEnemyParty().filter(p => p.isActive() && !p.isOnField()).length;
        if (hasReservePartyMember) {

          ShowRewards(this.scene, undefined, false);
          this.scene.pushPhase(new SwitchSummonPhase(this.scene, this.fieldIndex, -1, false, false, false));
        }
      }
    }
    if (this.scene.currentBattle.double) {
      const allyPokemon = pokemon.getAlly();
      this.scene.redirectPokemonMoves(pokemon, allyPokemon);
    }

    pokemon.lapseTags(BattlerTagLapseType.FAINT);
    this.scene.getField(true).filter(p => p !== pokemon).forEach(p => p.removeTagsBySourceId(pokemon.id));

    const usePortalFaint = pokemon.species?.generation === 20 ||
      (!pokemon.isPlayer() && (this.scene.currentBattle?.trainer?.isCorrupted ||
       this.scene.currentBattle?.trainer?.config.trainerType === TrainerType.SMITTY));

    const faintSafetyTimeout = setTimeout(() => {
      if (!this.hasEnded) {
        console.warn(`FaintPhase: faintCry callback timeout for battlerIndex ${this.battlerIndex}, forcing end`);
        pokemon.setVisible(false);
        this.scene.field.remove(pokemon);
        this.hasEnded = true;
        this.end();
      }
    }, usePortalFaint ? 7000 : 5000);

    pokemon.faintCry(() => {
      clearTimeout(faintSafetyTimeout);
      if (this.hasEnded) return;
      if (usePortalFaint) {
        if (pokemon instanceof PlayerPokemon) {
          pokemon.addFriendship(-3);
        }
        pokemon.hideInfo();
        if (!this.scene.skipFaintCry) {
          this.scene.playSound("se/faint");
        }
        playPortalFaintAnim(this.scene, pokemon).then(() => {
          if (this.hasEnded) return;
          pokemon.setVisible(false);
          pokemon.trySetStatus(StatusEffect.FAINT);
          if (pokemon.isPlayer()) {
            this.scene.currentBattle.removeFaintedParticipant(pokemon as PlayerPokemon);
          } else {
            this.scene.addFaintedEnemyScore(pokemon as EnemyPokemon);
            this.scene.currentBattle.addPostBattleLoot(pokemon as EnemyPokemon);
            if (!pokemon.isPlayer()) {
              const enemyPokemon = pokemon as EnemyPokemon;
              const enemyTypes = enemyPokemon.getTypes();
              enemyTypes.forEach(type => {
                if (!this.scene.gameData.gameStats.typeOfDefeated[type]) {
                  this.scene.gameData.gameStats.typeOfDefeated[type] = 0;
                }
                this.scene.gameData.gameStats.typeOfDefeated[type]++;
              });
            }
            if (!pokemon.isPlayer() && pokemon.turnData?.attacksReceived?.length) {
              const lastAttack = pokemon.turnData.attacksReceived[0];
              const attackingPokemon = this.scene.getPokemonById(lastAttack.sourceId);
              if (attackingPokemon && attackingPokemon.isPlayer()) {
                const playerTypes = attackingPokemon.getTypes();
                playerTypes.forEach(type => {
                  if (!this.scene.gameData.gameStats.playerKnockoutType[type]) {
                    this.scene.gameData.gameStats.playerKnockoutType[type] = 0;
                  }
                  this.scene.gameData.gameStats.playerKnockoutType[type]++;
                });
              }
            }
          }
          this.scene.field.remove(pokemon);
          this.hasEnded = true;
          this.end();
        });
        return;
      }
      if (pokemon instanceof PlayerPokemon) {
        pokemon.addFriendship(-3);
      }
      pokemon.hideInfo();
      if (!this.scene.skipFaintCry) {
        this.scene.playSound("se/faint");
      }
      this.scene.tweens.add({
        targets: pokemon,
        duration: 500,
        y: pokemon.y + 150,
        ease: "Sine.easeIn",
        onComplete: () => {
          if (this.hasEnded) return;
          pokemon.setVisible(false);
          pokemon.y -= 150;
          pokemon.trySetStatus(StatusEffect.FAINT);
          if (pokemon.isPlayer()) {
            this.scene.currentBattle.removeFaintedParticipant(pokemon as PlayerPokemon);
                  } else {
          this.scene.addFaintedEnemyScore(pokemon as EnemyPokemon);
          this.scene.currentBattle.addPostBattleLoot(pokemon as EnemyPokemon);

          if (!pokemon.isPlayer()) {
            const enemyPokemon = pokemon as EnemyPokemon;
            const enemyTypes = enemyPokemon.getTypes();
            enemyTypes.forEach(type => {
              if (!this.scene.gameData.gameStats.typeOfDefeated[type]) {
                this.scene.gameData.gameStats.typeOfDefeated[type] = 0;
              }
              this.scene.gameData.gameStats.typeOfDefeated[type]++;
            });
          }

          if (!pokemon.isPlayer() && pokemon.turnData?.attacksReceived?.length) {
            const lastAttack = pokemon.turnData.attacksReceived[0];
            const attackingPokemon = this.scene.getPokemonById(lastAttack.sourceId);
            if (attackingPokemon && attackingPokemon.isPlayer()) {
              const playerTypes = attackingPokemon.getTypes();
              playerTypes.forEach(type => {
                if (!this.scene.gameData.gameStats.playerKnockoutType[type]) {
                  this.scene.gameData.gameStats.playerKnockoutType[type] = 0;
                }
                this.scene.gameData.gameStats.playerKnockoutType[type]++;
              });
            }
          }
        }
          this.scene.field.remove(pokemon);
          this.hasEnded = true;
          this.end();
        }
      });
    });
  }

  tryOverrideForBattleSpec(): boolean {
    if (this.scene.gameMode.isWavePreFinal(this.scene, this.scene.currentBattle.waveIndex)) {
      if (!this.player) {
        const enemy = this.getPokemon();
        if (enemy.is2ndStageBoss && enemy.hp === 0) {
          this.scene.ui.showDialogue(battleSpecDialogue[BattleSpec.FINAL_BOSS].secondStageWin, enemy.species.name, null, () => this.doFaint());
        }
        else {
          this.end();
        }
        return true;
      }
    }

    return false;
  }
}