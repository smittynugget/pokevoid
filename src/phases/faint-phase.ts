import BattleScene from "#app/battle-scene.js";
import { BattlerIndex, BattleType } from "#app/battle.js";
import { applyPostFaintAbAttrs, PostFaintAbAttr, applyPostKnockOutAbAttrs, PostKnockOutAbAttr, applyPostVictoryAbAttrs, PostVictoryAbAttr } from "#app/data/ability.js";
import { BattlerTagLapseType } from "#app/data/battler-tags.js";
import { battleSpecDialogue } from "#app/data/dialogue.js";
import { allMoves, PostVictoryStatChangeAttr } from "#app/data/move.js";
import { BattleSpec } from "#app/enums/battle-spec.js";
import { StatusEffect } from "#app/enums/status-effect.js";
import { PokemonMove, EnemyPokemon, PlayerPokemon, HitResult } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { PokemonInstantReviveModifier } from "#app/modifier/modifier.js";
import i18next from "i18next";
import { DamagePhase } from "./damage-phase";
import { PokemonPhase } from "./pokemon-phase";
import { SwitchSummonPhase } from "./switch-summon-phase";
import { ToggleDoublePositionPhase } from "./toggle-double-position-phase";
import { GameOverPhase } from "./game-over-phase";
import { SwitchPhase } from "./switch-phase";
import { VictoryPhase } from "./victory-phase";
import {ShowRewards} from "#app/phases/select-modifier-phase";
import * as Utils from "#app/utils";
import {PokemonReviveModifierType} from "#app/modifier/modifier-type";
import {PermaFaintQuestModifier, PermaKnockoutQuestModifier} from "#app/modifier/modifier";
import {PermaType} from "#app/modifier/perma-modifiers";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import { CollectedTypeModifierType } from "#app/modifier/modifier-type.ts";

export class FaintPhase extends PokemonPhase {
  private preventEndure: boolean;

  constructor(scene: BattleScene, battlerIndex: BattlerIndex, preventEndure?: boolean) {
    super(scene, battlerIndex);

    this.preventEndure = preventEndure!; // TODO: is this bang correct?
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
        return this.end();
      }

      
      else if (this.player) {
        let reviveChance = 18;

        
        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_3)) {
          reviveChance = 10;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_2)) {
          reviveChance = 13;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_MORE_REVIVE_1)) {
          reviveChance = 15;
        }

        if (Utils.randSeedInt(reviveChance, 1) == 1) {
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


    // Track total times pokemon have been KO'd for supreme overlord/last respects
    if (pokemon.isPlayer()) {
      this.scene.currentBattle.playerFaints += 1;
    } else {
      this.scene.currentBattle.enemyFaints += 1;
    }

    this.scene.queueMessage(i18next.t("battle:fainted", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }), null, true);

    if (pokemon.turnData?.attacksReceived?.length) {
      const lastAttack = pokemon.turnData.attacksReceived[0];
      applyPostFaintAbAttrs(PostFaintAbAttr, pokemon, this.scene.getPokemonById(lastAttack.sourceId)!, new PokemonMove(lastAttack.move).getMove(), lastAttack.result); // TODO: is this bang correct?
    }

    const alivePlayField = this.scene.getField(true);
    alivePlayField.forEach(p => applyPostKnockOutAbAttrs(PostKnockOutAbAttr, p, pokemon));
    if (pokemon.turnData?.attacksReceived?.length) {
      const defeatSource = this.scene.getPokemonById(pokemon.turnData.attacksReceived[0].sourceId);
      if (defeatSource?.isOnField()) {
        applyPostVictoryAbAttrs(PostVictoryAbAttr, defeatSource);
        
        if (pokemon instanceof EnemyPokemon) {
          this.scene.gameData.permaModifiers
              .findModifiers(m => m instanceof PermaKnockoutQuestModifier)
              .forEach(modifier => modifier.apply([this.scene, defeatSource, pokemon, allMoves[pokemon.turnData.attacksReceived[0].move]]));
          
          if (defeatSource && defeatSource.isPlayer() && Utils.randSeedChance(30) ) {
            const randomType = Utils.randItem(pokemon.getTypes());
            this.scene.unshiftPhase(new ModifierRewardPhase(
              this.scene, 
              () => new CollectedTypeModifierType(randomType, defeatSource as PlayerPokemon)
            ));
          }
        }

        const pvmove = allMoves[pokemon.turnData.attacksReceived[0].move];
        const pvattrs = pvmove.getAttrs(PostVictoryStatChangeAttr);
        if (pvattrs.length) {
          for (const pvattr of pvattrs) {
            pvattr.applyPostVictory(defeatSource, defeatSource, pvmove);
          }
        }
      }
    }

    
    if (pokemon instanceof PlayerPokemon) {
      this.scene.gameData.permaModifiers
        .findModifiers(m => m instanceof PermaFaintQuestModifier)
        .forEach(modifier => modifier.apply([this.scene, pokemon]));
    }

    if (this.player) {
      /** The total number of Pokemon in the player's party that can legally fight */
      const legalPlayerPokemon = this.scene.getParty().filter(p => p.isAllowedInBattle());
      /** The total number of legal player Pokemon that aren't currently on the field */
      const legalPlayerPartyPokemon = legalPlayerPokemon.filter(p => !p.isActive(true));
      if (!legalPlayerPokemon.length) {
        /** If the player doesn't have any legal Pokemon, end the game */
        this.scene.unshiftPhase(new GameOverPhase(this.scene));
      } else if (this.scene.currentBattle.double && legalPlayerPokemon.length === 1 && legalPlayerPartyPokemon.length === 0) {
        /**
         * If the player has exactly one Pokemon in total at this point in a double battle, and that Pokemon
         * is already on the field, unshift a phase that moves that Pokemon to center position.
         */
        this.scene.unshiftPhase(new ToggleDoublePositionPhase(this.scene, true));
      } else if (legalPlayerPartyPokemon.length > 0) {
        /**
         * If previous conditions weren't met, and the player has at least 1 legal Pokemon off the field,
         * push a phase that prompts the player to summon a Pokemon from their party.
         */
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

    // in double battles redirect potential moves off fainted pokemon
    if (this.scene.currentBattle.double) {
      const allyPokemon = pokemon.getAlly();
      this.scene.redirectPokemonMoves(pokemon, allyPokemon);
    }

    pokemon.lapseTags(BattlerTagLapseType.FAINT);
    this.scene.getField(true).filter(p => p !== pokemon).forEach(p => p.removeTagsBySourceId(pokemon.id));

    pokemon.faintCry(() => {
      if (pokemon instanceof PlayerPokemon) {
        pokemon.addFriendship(-10);
      }
      pokemon.hideInfo();
      this.scene.playSound("se/faint");
      this.scene.tweens.add({
        targets: pokemon,
        duration: 500,
        y: pokemon.y + 150,
        ease: "Sine.easeIn",
        onComplete: () => {
          pokemon.setVisible(false);
          pokemon.y -= 150;
          pokemon.trySetStatus(StatusEffect.FAINT);
          if (pokemon.isPlayer()) {
            this.scene.currentBattle.removeFaintedParticipant(pokemon as PlayerPokemon);
          } else {
            this.scene.addFaintedEnemyScore(pokemon as EnemyPokemon);
            this.scene.currentBattle.addPostBattleLoot(pokemon as EnemyPokemon);
          }
          this.scene.field.remove(pokemon);
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
