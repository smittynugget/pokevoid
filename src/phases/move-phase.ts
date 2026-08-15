import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyAbAttrs, RedirectMoveAbAttr, BlockRedirectAbAttr, IncreasePpAbAttr, applyPreAttackAbAttrs, PokemonTypeChangeAbAttr, applyPostMoveUsedAbAttrs, PostMoveUsedAbAttr, PostAnyMoveUsedAbAttr, PostStatusMoveUsedAbAttr } from "#app/data/ability.js";
import { CommonAnim } from "#app/data/battle-anims.js";
import { CenterOfAttentionTag, BattlerTagLapseType } from "#app/data/battler-tags.js";
import { MoveFlags, MoveCategory, BypassRedirectAttr, allMoves, CopyMoveAttr, applyMoveAttrs, BypassSleepAttr, HealStatusEffectAttr, ChargeAttr, PreMoveMessageAttr } from "#app/data/move.js";
import { SpeciesFormChangePreMoveTrigger } from "#app/data/pokemon-forms.js";
import { getStatusEffectActivationText, getStatusEffectHealText } from "#app/data/status-effect.js";
import { Type } from "#app/data/type.js";
import { getTerrainBlockMessage } from "#app/data/weather.js";
import { Abilities } from "#app/enums/abilities.js";
import { BattlerTagType } from "#app/enums/battler-tag-type.js";
import { Moves } from "#app/enums/moves.js";
import { StatusEffect } from "#app/enums/status-effect.js";
import { MoveUsedEvent } from "#app/events/battle-scene.js";
import Pokemon, { PokemonMove, MoveResult, TurnMove } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { BattlePhase } from "./battle-phase";
import { CommonAnimPhase } from "./common-anim-phase";
import { MoveEffectPhase } from "./move-effect-phase";
import { MoveEndPhase } from "./move-end-phase";
import { ShowAbilityPhase } from "./show-ability-phase";
import { IncreasePpTwoAbAttr} from "#app/data/ability.js";
import {PlayerPokemon} from "#app/field/pokemon";
import {PermaMoveQuestModifier, PermaSpecialMoveQuestModifier} from "#app/modifier/modifier";

import { MoveUpgradeModifier } from "#app/modifier/modifier.js";
export class MovePhase extends BattlePhase {
  public pokemon: Pokemon;
  public move: PokemonMove;
  public targets: BattlerIndex[];
  protected followUp: boolean;
  protected ignorePp: boolean;
  protected failed: boolean;
  protected cancelled: boolean;
  protected playerMove: boolean;

  constructor(scene: BattleScene, pokemon: Pokemon, targets: BattlerIndex[], move: PokemonMove, followUp?: boolean, ignorePp?: boolean) {
    super(scene);

    this.pokemon = pokemon;
    this.targets = targets;
    this.move = move;
    this.followUp = !!followUp;
    this.ignorePp = !!ignorePp;
    this.failed = false;
    this.cancelled = false;
    this.playerMove = pokemon.isPlayer();
  }

  canMove(): boolean {
    return this.pokemon.isActive(true) && this.move.isUsable(this.pokemon, this.ignorePp) && !!this.targets.length;
  }
  fail(): void {
    this.failed = true;
  }
  cancel(): void {
    this.cancelled = true;
  }

  start() {
    super.start();

    if (!this.pokemon.isPlayer() && this.pokemon.battleData && this.move?.moveId) {
      this.pokemon.battleData.revealedMoves.add(this.move.moveId);
    }

    if (!this.canMove()) {
      if (this.move.moveId && this.pokemon.summonData?.disabledMove === this.move.moveId) {
        this.scene.queueMessage(i18next.t("battle:moveDisabled", { moveName: this.move.getName() }));
      }
      if (this.pokemon.isActive(true) && this.move.ppUsed >= this.move.getMovePp()) {
        this.fail();
        this.showMoveText();
        this.showFailedText();
      }
      return this.end();
    }
    this.pokemon.turnData.moveTypeCache?.clear();

    if (!this.followUp) {
      if (this.move.getMove(this.playerMove).checkFlag(MoveFlags.IGNORE_ABILITIES, this.pokemon, null)) {
        this.scene.arena.setIgnoreAbilities();
      }
    } else {
      this.pokemon.turnData.hitsLeft = 0;
      this.pokemon.turnData.hitCount = 0;
    }
    const moveTarget = this.targets.length === 1
      ? new Utils.IntegerHolder(this.targets[0])
      : null;
    if (moveTarget) {
      const oldTarget = moveTarget.value;
      this.scene.getField(true).filter(p => p !== this.pokemon).forEach(p => applyAbAttrs(RedirectMoveAbAttr, p, null, false, this.move.moveId, moveTarget));
      this.pokemon.getOpponents().forEach(p => {
        const redirectTag = p.getTag(CenterOfAttentionTag) as CenterOfAttentionTag;
        if (redirectTag && (!redirectTag.powder || (!this.pokemon.isOfType(Type.GRASS) && !this.pokemon.hasAbility(Abilities.OVERCOAT)))) {
          moveTarget.value = p.getBattlerIndex();
        }
      });

      if ((this.pokemon.hasAbilityWithAttr(BlockRedirectAbAttr) || this.move.getMove(this.playerMove).hasAttr(BypassRedirectAttr))) {

        if ((this.pokemon.hasAbilityWithAttr(BlockRedirectAbAttr) && !this.move.getMove(this.playerMove).hasAttr(BypassRedirectAttr)) && oldTarget !== moveTarget.value) {
          this.scene.unshiftPhase(new ShowAbilityPhase(this.scene, this.pokemon.getBattlerIndex(), this.pokemon.getPassiveAbility().hasAttr(BlockRedirectAbAttr)));
        }
        moveTarget.value = oldTarget;
      }
      this.targets[0] = moveTarget.value;
    }
    if (this.targets.length === 1 && this.targets[0] === BattlerIndex.ATTACKER) {
      if (this.pokemon.turnData.attacksReceived.length) {
        const attack = this.pokemon.turnData.attacksReceived[0];
        this.targets[0] = attack.sourceBattlerIndex;
        if (this.scene.currentBattle.double && this.move.getMove(this.playerMove).hasFlag(MoveFlags.REDIRECT_COUNTER)) {
          if (this.scene.getField()[this.targets[0]].hp === 0) {
            const opposingField = this.pokemon.isPlayer() ? this.scene.getEnemyField() : this.scene.getPlayerField();

            this.targets[0] = opposingField.find(p => p.hp > 0)?.getBattlerIndex();
          }
        }
      }
      if (this.targets[0] === BattlerIndex.ATTACKER) {
        this.fail();
        this.showMoveText();
        this.showFailedText();
      }
    }

    const targets = this.scene.getField(true).filter(p => {
      if (this.targets.indexOf(p.getBattlerIndex()) > -1) {
        return true;
      }
      return false;
    });

    const doMove = () => {
      this.pokemon.turnData.acted = true;
      if (this.pokemon instanceof PlayerPokemon) {
        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaMoveQuestModifier || m instanceof PermaSpecialMoveQuestModifier)
            .forEach(modifier => modifier.apply([this.scene, this.pokemon, this.move.getMove(this.playerMove)]));
        this.scene.findModifiers(m => m instanceof PermaMoveQuestModifier || m instanceof PermaSpecialMoveQuestModifier)
            .forEach(modifier => modifier.apply([this.scene, this.pokemon, this.move.getMove(this.playerMove)]));
      }

      this.pokemon.lapseTags(BattlerTagLapseType.PRE_MOVE);

      let ppUsed = 1;

      const targetedOpponents = this.pokemon.getOpponents().filter(o => this.targets.includes(o.getBattlerIndex()));
      for (const opponent of targetedOpponents) {
        if (this.move.ppUsed + ppUsed >= this.move.getMovePp()) {
          break;
        }
        if (opponent.hasAbilityWithAttr(IncreasePpAbAttr)) {
          ppUsed++;
        }

        else if(opponent.hasAbilityWithAttr(IncreasePpTwoAbAttr)) {
          ppUsed += 2;
        }
      }
      if (this.pokemon.isPlayer() && this.scene.dynamicMode?.autoPressured) {
        ppUsed += 1;
      }

      if (!this.followUp && this.canMove() && !this.cancelled) {
        this.pokemon.lapseTags(BattlerTagLapseType.MOVE);
      }

      const moveQueue = this.pokemon.getMoveQueue();
      if (this.cancelled || this.failed) {
        if (this.failed) {
          this.move.usePp(ppUsed);
          this.scene.eventTarget.dispatchEvent(new MoveUsedEvent(this.pokemon?.id, this.move.getMove(this.playerMove), this.move.ppUsed));
        }
        this.pokemon.pushMoveHistory({ move: Moves.NONE, result: MoveResult.FAIL });

        this.pokemon.lapseTags(BattlerTagLapseType.MOVE_EFFECT);
        moveQueue.shift();
        return this.end();
      }

      this.scene.triggerPokemonFormChange(this.pokemon, SpeciesFormChangePreMoveTrigger);

      if (this.move.moveId) {
        this.showMoveText();
      }
      if ((moveQueue.length && moveQueue[0].move === Moves.NONE) || !targets.length) {
        this.showFailedText();
        this.cancel();
        this.pokemon.pushMoveHistory({ move: Moves.NONE, result: MoveResult.FAIL });

        this.pokemon.lapseTags(BattlerTagLapseType.MOVE_EFFECT);

        moveQueue.shift();
        return this.end();
      }

      if (!moveQueue.length || !moveQueue.shift()?.ignorePP) {
        this.move.usePp(ppUsed);
        this.scene.eventTarget.dispatchEvent(new MoveUsedEvent(this.pokemon?.id, this.move.getMove(this.playerMove), this.move.ppUsed));
      }

      if (!allMoves[this.move.moveId].hasAttr(CopyMoveAttr)) {
        this.scene.currentBattle.lastMove = this.move.moveId;
      }

      const resolvedMove = this.move.getMove(this.playerMove);

      let success = resolvedMove.applyConditions(this.pokemon, targets[0], resolvedMove);
      const cancelled = new Utils.BooleanHolder(false);
      let failedText = resolvedMove.getFailedText(this.pokemon, targets[0], resolvedMove, cancelled);
      if (success && this.scene.arena.isMoveWeatherCancelled(this.pokemon, resolvedMove)) {
        success = false;
      } else if (success && this.scene.arena.isMoveTerrainCancelled(this.pokemon, this.targets, resolvedMove)) {
        success = false;
        if (failedText === null) {
          failedText = getTerrainBlockMessage(targets[0], this.scene.arena.terrain?.terrainType!);
        }
      }
      if (success || [Moves.ROAR, Moves.WHIRLWIND, Moves.TRICK_OR_TREAT, Moves.FORESTS_CURSE].includes(this.move.moveId)) {
        applyPreAttackAbAttrs(PokemonTypeChangeAbAttr, this.pokemon, null, resolvedMove);
      }

      if (success) {
        this.scene.unshiftPhase(this.getEffectPhase());
      } else {
        this.pokemon.pushMoveHistory({ move: this.move.moveId, targets: this.targets, result: MoveResult.FAIL, virtual: this.move.virtual });
        if (!cancelled.value) {
          this.showFailedText(failedText);
        }
      }

      if (resolvedMove.hasFlag(MoveFlags.DANCE_MOVE) && !this.followUp) {
        this.scene.getPlayerField().forEach(pokemon => {
          applyPostMoveUsedAbAttrs(PostMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
        });
        this.scene.getEnemyField().forEach(pokemon => {
          applyPostMoveUsedAbAttrs(PostMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
        });
      }
      this.scene.getPlayerField().forEach(pokemon => {
        applyPostMoveUsedAbAttrs(PostAnyMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
      });
      this.scene.getEnemyField().forEach(pokemon => {
        applyPostMoveUsedAbAttrs(PostAnyMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
      });
      if (resolvedMove.category === MoveCategory.STATUS) {
        this.scene.getPlayerField().forEach(pokemon => {
          applyPostMoveUsedAbAttrs(PostStatusMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
        });
        this.scene.getEnemyField().forEach(pokemon => {
          applyPostMoveUsedAbAttrs(PostStatusMoveUsedAbAttr, pokemon, this.move, this.pokemon, this.targets);
        });
      }
      this.end();
    };

    if (!this.followUp && this.pokemon.status && !this.pokemon.status.isPostTurn()) {
      this.pokemon.status.incrementTurn();
      let activated = false;
      let healed = false;

      switch (this.pokemon.status.effect) {
      case StatusEffect.PARALYSIS:
        if (!this.pokemon.randSeedInt(4)) {
          activated = true;
          this.cancelled = true;
          this.pokemon.turnData.fullParaThisTurn = true;
        }
        break;
      case StatusEffect.SLEEP:
        applyMoveAttrs(BypassSleepAttr, this.pokemon, null, this.move.getMove(this.playerMove));
        healed = this.pokemon.status.turnCount === this.pokemon.status.cureTurn;
        activated = !healed && !this.pokemon.getTag(BattlerTagType.BYPASS_SLEEP);
        this.cancelled = activated;
        break;
      case StatusEffect.FREEZE:
        healed = !!this.move.getMove(this.playerMove).findAttr(attr => attr instanceof HealStatusEffectAttr && attr.selfTarget && attr.isOfEffect(StatusEffect.FREEZE)) || !this.pokemon.randSeedInt(5);
        activated = !healed;
        this.cancelled = activated;
        break;
      }

      if (activated) {
        this.scene.queueMessage(getStatusEffectActivationText(this.pokemon.status.effect, getPokemonNameWithAffix(this.pokemon)));
        this.scene.unshiftPhase(new CommonAnimPhase(this.scene, this.pokemon.getBattlerIndex(), undefined, CommonAnim.POISON + (this.pokemon.status.effect - 1)));
        doMove();
      } else {
        if (healed) {
          this.scene.queueMessage(getStatusEffectHealText(this.pokemon.status.effect, getPokemonNameWithAffix(this.pokemon)));
          this.pokemon.resetStatus();
          this.pokemon.updateInfo();
        }
        doMove();
      }
    } else {
      doMove();
    }
  }

  getEffectPhase(): MoveEffectPhase {
    return new MoveEffectPhase(this.scene, this.pokemon.getBattlerIndex(), this.targets, this.move);
  }

  showMoveText(): void {
    if (this.move.getMove(this.playerMove).hasAttr(ChargeAttr)) {
      const lastMove = this.pokemon.getLastXMoves() as TurnMove[];
      if (!lastMove.length || lastMove[0].move !== this.move.getMove(this.playerMove).id || lastMove[0].result !== MoveResult.OTHER) {
        this.scene.queueMessage(i18next.t("battle:useMove", {
          pokemonNameWithAffix: getPokemonNameWithAffix(this.pokemon),
          moveName: this.move.getName()
        }), 500);
        return;
      }
    }

    if (this.pokemon.getTag(BattlerTagType.RECHARGING) || this.pokemon.getTag(BattlerTagType.INTERRUPTED)) {
      return;
    }

    this.scene.queueMessage(i18next.t("battle:useMove", {
      pokemonNameWithAffix: getPokemonNameWithAffix(this.pokemon),
      moveName: this.move.getName()
    }), 500);
    applyMoveAttrs(PreMoveMessageAttr, this.pokemon, this.pokemon.getOpponents().find(() => true)!, this.move.getMove(this.playerMove));
  }

  showFailedText(failedText: string | null = null): void {
    this.scene.queueMessage(failedText || i18next.t("battle:attackFailed"));
  }

  end() {
    if (!this.followUp && this.canMove()) {
      this.scene.unshiftPhase(new MoveEndPhase(this.scene, this.pokemon.getBattlerIndex()));
    }

    super.end();
  }
}