import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyPreAttackAbAttrs, AddSecondStrikeAbAttr, IgnoreMoveEffectsAbAttr, applyPostDefendAbAttrs, PostDefendAbAttr, applyPostAttackAbAttrs, PostAttackAbAttr, MaxMultiHitAbAttr, AlwaysHitAbAttr } from "#app/data/ability.js";
import { ArenaTagSide, ConditionalProtectTag } from "#app/data/arena-tag.js";
import { MoveAnim } from "#app/data/battle-anims.js";
import { BattlerTagLapseType, ProtectedTag, SemiInvulnerableTag } from "#app/data/battler-tags.js";
import { MoveTarget, applyMoveAttrs, OverrideMoveEffectAttr, MultiHitAttr, AttackMove, FixedDamageAttr, VariableTargetAttr, MissEffectAttr, MoveFlags, applyFilteredMoveAttrs, MoveAttr, MoveEffectAttr, MoveEffectTrigger, ChargeAttr, MoveCategory, NoEffectAttr, HitsTagAttr } from "#app/data/move.js";
import { SpeciesFormChangePostMoveTrigger } from "#app/data/pokemon-forms.js";
import { BattlerTagType } from "#app/enums/battler-tag-type.js";
import { Moves } from "#app/enums/moves.js";
import Pokemon, { PokemonMove, MoveResult, HitResult } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { PokemonMultiHitModifier, FlinchChanceModifier, EnemyAttackStatusEffectChanceModifier, ContactHeldItemTransferChanceModifier, HitHealModifier } from "#app/modifier/modifier.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { PokemonPhase } from "./pokemon-phase";
import {PlayerPokemon} from "#app/field/pokemon";
import {PermaHitQuestModifier} from "#app/modifier/modifier";

export class MoveEffectPhase extends PokemonPhase {
  public move: PokemonMove;
  protected targets: BattlerIndex[];

  constructor(scene: BattleScene, battlerIndex: BattlerIndex, targets: BattlerIndex[], move: PokemonMove) {
    super(scene, battlerIndex);
    this.move = move;

    if (targets.includes(battlerIndex) && this.move.getMove().moveTarget === MoveTarget.ALL_NEAR_OTHERS) {
      const i = targets.indexOf(battlerIndex);
      targets.splice(i, i + 1);
    }
    this.targets = targets;
  }

  start() {
    super.start();
    const user = this.getUserPokemon();

    const targets = this.getTargets();
    if (!user?.isOnField()) {
      return super.end();
    }
    const overridden = new Utils.BooleanHolder(false);

    const move = this.move.getMove(user.isPlayer());
    applyMoveAttrs(OverrideMoveEffectAttr, user, this.getTarget() ?? null, move, overridden, this.move.virtual).then(() => {

      if (overridden.value) {
        return this.end();
      }

      user.lapseTags(BattlerTagLapseType.MOVE_EFFECT);
      if (user.turnData.hitsLeft === undefined) {
        const hitCount = new Utils.IntegerHolder(1);

        applyMoveAttrs(MultiHitAttr, user, this.getTarget() ?? null, move, hitCount);

        applyPreAttackAbAttrs(AddSecondStrikeAbAttr, user, null, move, false, targets.length, hitCount, new Utils.IntegerHolder(0));

        if (move instanceof AttackMove && !move.hasAttr(FixedDamageAttr)) {
          this.scene.applyModifiers(PokemonMultiHitModifier, user.isPlayer(), user, hitCount, new Utils.IntegerHolder(0));
        }

        user.turnData.hitCount = hitCount.value;
        user.turnData.hitsLeft = hitCount.value;
      }
      const moveHistoryEntry = { move: this.move.moveId, targets: this.targets, result: MoveResult.PENDING, virtual: this.move.virtual };
      const targetHitChecks = Object.fromEntries(targets.map(p => [p.getBattlerIndex(), this.hitCheck(p)]));
      const hasActiveTargets = targets.some(t => t.isActive(true));

      if (!hasActiveTargets || (!move.hasAttr(VariableTargetAttr) && !move.isMultiTarget() && !targetHitChecks[this.targets[0]])) {
        this.stopMultiHit();
        if (hasActiveTargets) {
          this.scene.queueMessage(i18next.t("battle:attackMissed", { pokemonNameWithAffix: this.getTarget()? getPokemonNameWithAffix(this.getTarget()!) : "" }));
          moveHistoryEntry.result = MoveResult.MISS;
          applyMoveAttrs(MissEffectAttr, user, null, move);
        } else {
          this.scene.queueMessage(i18next.t("battle:attackFailed"));
          moveHistoryEntry.result = MoveResult.FAIL;
        }
        user.pushMoveHistory(moveHistoryEntry);
        return this.end();
      }
      const applyAttrs: Promise<void>[] = [];
      new MoveAnim(move.id as Moves, user, this.getTarget()?.getBattlerIndex()!).play(this.scene, () => {

        let hasHit: boolean = false;
        for (const target of targets) {

          if (!targetHitChecks[target.getBattlerIndex()]) {
            this.stopMultiHit(target);
            this.scene.queueMessage(i18next.t("battle:attackMissed", { pokemonNameWithAffix: getPokemonNameWithAffix(target) }));
            if (moveHistoryEntry.result === MoveResult.PENDING) {
              moveHistoryEntry.result = MoveResult.MISS;
            }
            user.pushMoveHistory(moveHistoryEntry);
            applyMoveAttrs(MissEffectAttr, user, null, move);
            continue;
          }
          const targetSide = target.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

          const hasConditionalProtectApplied = new Utils.BooleanHolder(false);

          const bypassIgnoreProtect = new Utils.BooleanHolder(false);

          if (!this.move.getMove().isAllyTarget()) {
            this.scene.arena.applyTagsForSide(ConditionalProtectTag, targetSide, hasConditionalProtectApplied, user, target, move.id, bypassIgnoreProtect);
          }
          const isProtected = (bypassIgnoreProtect.value || !this.move.getMove(user.isPlayer()).checkFlag(MoveFlags.IGNORE_PROTECT, user, target))
              && (hasConditionalProtectApplied.value || target.findTags(t => t instanceof ProtectedTag).find(t => target.lapseTag(t.tagType)));
          const firstHit = (user.turnData.hitsLeft === user.turnData.hitCount);
          if (firstHit) {
            user.pushMoveHistory(moveHistoryEntry);

            if (user.isPlayer() && !this.move.virtual) {
              const moveType = move.type;
              if (!this.scene.gameData.gameStats.typeOfMovesUsed[moveType]) {
                this.scene.gameData.gameStats.typeOfMovesUsed[moveType] = 0;
              }
              this.scene.gameData.gameStats.typeOfMovesUsed[moveType]++;
            }
          }
          moveHistoryEntry.result = MoveResult.SUCCESS;
          const hitResult = !isProtected ? target.apply(user, move) : HitResult.NO_EFFECT;
          const dealsDamage = [
            HitResult.EFFECTIVE,
            HitResult.SUPER_EFFECTIVE,
            HitResult.NOT_VERY_EFFECTIVE,
            HitResult.ONE_HIT_KO
          ].includes(hitResult);
          const firstTarget = dealsDamage && !hasHit;
          if (firstTarget) {
            hasHit = true;
          }
          if(hitResult != HitResult.NO_EFFECT && hitResult != HitResult.IMMUNE && hitResult != HitResult.FAIL && hitResult != HitResult.MISS) {
              const move = this.move.getMove();
              targets.forEach(target => {
                this.scene.gameData.permaModifiers
                    .findModifiers(m => m instanceof PermaHitQuestModifier)
                    .forEach(modifier => modifier.apply([this.scene, user, target, move]));
              });
          }
          if (hitResult === HitResult.NO_EFFECT) {
            moveHistoryEntry.result = MoveResult.FAIL;
          }
          const lastHit = (user.turnData.hitsLeft === 1 || !this.getTarget()?.isActive());
          if (lastHit) {
            this.scene.triggerPokemonFormChange(user, SpeciesFormChangePostMoveTrigger);
          }
          applyAttrs.push(new Promise(resolve => {

            applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && attr.trigger === MoveEffectTrigger.PRE_APPLY && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit) && hitResult !== HitResult.NO_EFFECT,
              user, target, move).then(() => {

              if (hitResult !== HitResult.FAIL) {

                const chargeEffect = !!move.getAttrs(ChargeAttr).find(ca => ca.usedChargeEffect(user, this.getTarget() ?? null, move));

                Utils.executeIf(!chargeEffect, () => applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && attr.trigger === MoveEffectTrigger.POST_APPLY
                      && attr.selfTarget && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit), user, target, move)).then(() => {

                  if (hitResult !== HitResult.NO_EFFECT) {

                    applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && (attr as MoveEffectAttr).trigger === MoveEffectTrigger.POST_APPLY
                        && !(attr as MoveEffectAttr).selfTarget && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit), user, target, this.move.getMove(user.isPlayer())).then(() => {

                      if (dealsDamage && !target.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) {
                        const flinched = new Utils.BooleanHolder(false);
                        user.scene.applyModifiers(FlinchChanceModifier, user.isPlayer(), user, flinched);
                        if (flinched.value) {
                          target.addTag(BattlerTagType.FLINCHED, undefined, this.move.moveId, user.id);
                        }
                      }

                      Utils.executeIf(!isProtected && !chargeEffect, () => applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && (attr as MoveEffectAttr).trigger === MoveEffectTrigger.HIT
                            && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit) && (!attr.firstTargetOnly || firstTarget), user, target, this.move.getMove(user.isPlayer())).then(() => {

                        return Utils.executeIf(!target.isFainted() || target.canApplyAbility(), () => applyPostDefendAbAttrs(PostDefendAbAttr, target, user, this.move.getMove(user.isPlayer()), hitResult).then(() => {

                          target.lapseTag(BattlerTagType.BEAK_BLAST_CHARGING);
                          if (move.category === MoveCategory.PHYSICAL && user.isPlayer() !== target.isPlayer()) {
                            target.lapseTag(BattlerTagType.SHELL_TRAP);
                          }
                          if (!user.isPlayer() && this.move.getMove() instanceof AttackMove) {
                            user.scene.applyShuffledModifiers(this.scene, EnemyAttackStatusEffectChanceModifier, false, target);
                          }
                        })).then(() => {

                          applyPostAttackAbAttrs(PostAttackAbAttr, user, target, this.move.getMove(user.isPlayer()), hitResult).then(() => {

                            if (this.move.getMove(user.isPlayer()) instanceof AttackMove) {
                              this.scene.applyModifiers(ContactHeldItemTransferChanceModifier, this.player, user, target);
                            }
                            resolve();
                          });
                        });
                      })
                      ).then(() => resolve());
                    });
                  } else {
                    applyMoveAttrs(NoEffectAttr, user, null, move).then(() => resolve());
                  }
                });
              } else {
                resolve();
              }
            });
          }));
        }

        const postTarget = (user.turnData.hitsLeft === 1 || !this.getTarget()?.isActive()) ?
          applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && attr.trigger === MoveEffectTrigger.POST_TARGET, user, null, move) :
          null;

        if (!!postTarget) {
          if (applyAttrs.length) {
            applyAttrs[applyAttrs.length - 1]?.then(() => postTarget);
          } else {
            applyAttrs.push(postTarget);
          }
        }
        Promise.allSettled(applyAttrs).then(() => this.end());
      });
    });
  }

  end() {
    const user = this.getUserPokemon();

    if (user) {
      if (user.turnData.hitsLeft && --user.turnData.hitsLeft >= 1 && this.getTarget()?.isActive()) {
        this.scene.unshiftPhase(this.getNewHitPhase());
      } else {
        const hitsTotal = user.turnData.hitCount! - Math.max(user.turnData.hitsLeft!, 0);
        if (hitsTotal > 1 || (user.turnData.hitsLeft && user.turnData.hitsLeft > 0)) {

          this.scene.queueMessage(i18next.t("battle:attackHitsCount", { count: hitsTotal }));
        }
        this.scene.applyModifiers(HitHealModifier, this.player, user);
      }
    }

    super.end();
  }
  hitCheck(target: Pokemon): boolean {

    if ([MoveTarget.USER, MoveTarget.ENEMY_SIDE].includes(this.move.getMove(this.getUserPokemon()!.isPlayer()).moveTarget)) {
      return true;
    }

    const user = this.getUserPokemon()!;
    if (user.turnData.hitsLeft < user.turnData.hitCount) {
      if (!this.move.getMove(user.isPlayer()).hasFlag(MoveFlags.CHECK_ALL_HITS) || user.hasAbilityWithAttr(MaxMultiHitAbAttr)) {
        return true;
      }
    }

    if (user.hasAbilityWithAttr(AlwaysHitAbAttr) || target.hasAbilityWithAttr(AlwaysHitAbAttr)) {
      return true;
    }
    if (user.getTag(BattlerTagType.IGNORE_ACCURACY) && (user.getLastXMoves().find(() => true)?.targets || []).indexOf(target.getBattlerIndex()) !== -1) {
      return true;
    }

    if (target.getTag(BattlerTagType.ALWAYS_GET_HIT)) {
      return true;
    }

    const semiInvulnerableTag = target.getTag(SemiInvulnerableTag);
    if (semiInvulnerableTag && !this.move.getMove(user.isPlayer()).getAttrs(HitsTagAttr).some(hta => hta.tagType === semiInvulnerableTag.tagType)) {
      return false;
    }

    const moveAccuracy = this.move.getMove(user.isPlayer()).calculateBattleAccuracy(user!, target);

    if (moveAccuracy === -1) {
      return true;
    }

    const accuracyMultiplier = user.getAccuracyMultiplier(target, this.move.getMove(user.isPlayer()));
    const rand = user.randSeedInt(100, 1);

    return rand <= moveAccuracy * (accuracyMultiplier!);
  }
  getUserPokemon(): Pokemon | undefined {
    if (this.battlerIndex > BattlerIndex.ENEMY_2) {
      return this.scene.getPokemonById(this.battlerIndex) ?? undefined;
    }
    return (this.player ? this.scene.getPlayerField() : this.scene.getEnemyField())[this.fieldIndex];
  }
  getTargets(): Pokemon[] {
    return this.scene.getField(true).filter(p => this.targets.indexOf(p.getBattlerIndex()) > -1);
  }
  getTarget(): Pokemon | undefined {
    return this.getTargets()[0];
  }
  removeTarget(target: Pokemon): void {
    const targetIndex = this.targets.findIndex(ind => ind === target.getBattlerIndex());
    if (targetIndex !== -1) {
      this.targets.splice(this.targets.findIndex(ind => ind === target.getBattlerIndex()), 1);
    }
  }
  stopMultiHit(target?: Pokemon): void {

    if (target) {
      this.removeTarget(target);
    }

    if (!target || this.targets.length === 0 ) {
        this.getUserPokemon()!.turnData.hitCount = 1;
        this.getUserPokemon()!.turnData.hitsLeft = 1;
    }
  }
  getNewHitPhase() {
    return new MoveEffectPhase(this.scene, this.battlerIndex, this.targets, this.move);
  }
}