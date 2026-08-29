import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyPreAttackAbAttrs, AddSecondStrikeAbAttr, MultiStrikeAbAttr, IgnoreMoveEffectsAbAttr, applyPostDefendAbAttrs, PostDefendAbAttr, applyPostAttackAbAttrs, PostAttackAbAttr, MaxMultiHitAbAttr, AlwaysHitAbAttr, PiercingProtectOnContactAbAttr, PreAttackBlowbackRouletteProcAbAttr, applyDeferredPostMoveUsedAbAttrs, clearAbilityAddedMoveFlags, PostMissStatAndHealAbAttr } from "#app/data/ability.js";
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

let _applyContactStatDropFn: ((defender: Pokemon, attacker: Pokemon, foeMove: any) => void) | null = null;

export function _bindContactStatDrop(fn: (defender: Pokemon, attacker: Pokemon, foeMove: any) => void): void {
  _applyContactStatDropFn = fn;
}

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
      if (user) {
        user.turnData.chainsOhkoThisHit = false;
        clearAbilityAddedMoveFlags(user, this.move.getMove());
      }
      return super.end();
    }
    const overridden = new Utils.BooleanHolder(false);
    const move = this.move.getMove(user.isPlayer(), user ? `${user.name} [${user.isPlayer() ? "player" : "enemy"}]` : undefined);
    applyMoveAttrs(OverrideMoveEffectAttr, user, this.getTarget() ?? null, move, overridden, this.move.virtual).catch(err => {
      console.error(`[MOVE-EFFECT ERROR] OverrideMoveEffectAttr:`, err);
    }).then(() => {

      if (overridden.value) {
        return this.end();
      }

      user.lapseTags(BattlerTagLapseType.MOVE_EFFECT);
      if (user.turnData.hitsLeft === undefined) {
        const hitCount = new Utils.IntegerHolder(1);

        applyMoveAttrs(MultiHitAttr, user, this.getTarget() ?? null, move, hitCount);

        applyPreAttackAbAttrs(MultiStrikeAbAttr, user, null, move, false, targets.length, hitCount, new Utils.IntegerHolder(0));
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
          const missTarget = this.getTarget();
          this.scene.queueMessage(i18next.t("battle:attackMissed", { pokemonNameWithAffix: missTarget ? getPokemonNameWithAffix(missTarget) : "" }));
          moveHistoryEntry.result = MoveResult.MISS;
          applyMoveAttrs(MissEffectAttr, user, null, move);
          if (missTarget) {
            applyPostAttackAbAttrs(PostMissStatAndHealAbAttr, user, missTarget, move, HitResult.MISS);
            applyPostDefendAbAttrs(PostDefendAbAttr, missTarget, user, move, HitResult.MISS);
          }
        } else {
          this.scene.queueMessage(i18next.t("battle:attackFailed"));
          moveHistoryEntry.result = MoveResult.FAIL;
        }
        user.pushMoveHistory(moveHistoryEntry);
        return this.end();
      }
      const applyAttrs: Promise<void>[] = [];
      new MoveAnim(move.id as Moves, user, this.getTarget()?.getBattlerIndex()!).play(this.scene, () => {
        let ended = false;
        const endOnce = () => {
          if (ended) return;
          ended = true;
          this.end();
        };
        try {

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
            applyPostAttackAbAttrs(PostMissStatAndHealAbAttr, user, target, move, HitResult.MISS);
            applyPostDefendAbAttrs(PostDefendAbAttr, target, user, move, HitResult.MISS);
            continue;
          }
          const targetSide = target.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

          const hasConditionalProtectApplied = new Utils.BooleanHolder(false);

          const bypassIgnoreProtect = new Utils.BooleanHolder(false);

          if (!this.move.getMove().isAllyTarget()) {
            this.scene.arena.applyTagsForSide(ConditionalProtectTag, targetSide, hasConditionalProtectApplied, user, target, move.id, bypassIgnoreProtect);
          }
          const isProtected = (bypassIgnoreProtect.value || !this.move.getMove().checkFlag(MoveFlags.IGNORE_PROTECT, user, target))
              && (hasConditionalProtectApplied.value || target.findTags(t => t instanceof ProtectedTag).find(t => target.lapseTag(t.tagType)));
          const firstHit = (user.turnData.hitsLeft === user.turnData.hitCount);

          if (firstHit) {
            applyPreAttackAbAttrs(PreAttackBlowbackRouletteProcAbAttr, user, target, move, false);
          }
          if (firstHit) {
            user.pushMoveHistory(moveHistoryEntry);
          }
          moveHistoryEntry.result = MoveResult.SUCCESS;
          let hitResult: HitResult;
          if (isProtected) {
            hitResult = HitResult.NO_EFFECT;
            if (move.checkFlag(MoveFlags.MAKES_CONTACT, user, target)) {
              _applyContactStatDropFn?.(target, user, move);
            }
          } else {
            target.turnData.subHitThisMove = false;
            try {
              hitResult = target.apply(user, move);
            } catch (err) {
              console.error(`[MOVE-EFFECT ERROR] target.apply ${move?.id}:`, err);
              this.stopMultiHit(target);
              hitResult = HitResult.FAIL;
            }
          }
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
                this.scene.findModifiers(m => m instanceof PermaHitQuestModifier)
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
                        && !(attr as MoveEffectAttr).selfTarget && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit), user, target, this.move.getMove()).then(() => {

                      if (dealsDamage && !target.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr) && !target.turnData.subHitThisMove) {
                        const flinched = new Utils.BooleanHolder(false);
                        user.scene.applyModifiers(FlinchChanceModifier, user.isPlayer(), user, flinched);
                        if (flinched.value) {
                          target.addTag(BattlerTagType.FLINCHED, undefined, this.move.moveId, user.id);
                        }
                      }

                      Utils.executeIf(!isProtected && !chargeEffect, () => applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && (attr as MoveEffectAttr).trigger === MoveEffectTrigger.HIT
                            && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit) && (!attr.firstTargetOnly || firstTarget), user, target, this.move.getMove()).then(() => {
                        return Utils.executeIf(!target.isFainted() || target.canApplyAbility(), () => applyPostDefendAbAttrs(PostDefendAbAttr, target, user, this.move.getMove(), hitResult).then(() => {
                          target.lapseTag(BattlerTagType.BEAK_BLAST_CHARGING);
                          if (move.category === MoveCategory.PHYSICAL && user.isPlayer() !== target.isPlayer()) {
                            target.lapseTag(BattlerTagType.SHELL_TRAP);
                          }
                          if (!user.isPlayer() && this.move.getMove() instanceof AttackMove && !target.turnData.subHitThisMove) {
                            user.scene.applyShuffledModifiers(this.scene, EnemyAttackStatusEffectChanceModifier, false, target);
                          }
                        })).then(() => {
                          return Utils.executeIf(!target.isFainted() && target.isOnField(), () => applyPostAttackAbAttrs(PostAttackAbAttr, user, target, this.move.getMove(), hitResult)).then(() => {
                            return applyFilteredMoveAttrs((attr: MoveAttr) => attr instanceof MoveEffectAttr && (attr as MoveEffectAttr).trigger === MoveEffectTrigger.POST_ATTACK
                              && (!attr.firstHitOnly || firstHit) && (!attr.lastHitOnly || lastHit) && (!attr.firstTargetOnly || firstTarget), user, target, this.move.getMove()).then(() => {
                              if (this.move.getMove() instanceof AttackMove) {
                                this.scene.applyModifiers(ContactHeldItemTransferChanceModifier, this.player, user, target);
                              }
                              resolve();
                            });
                          });
                        });
                      })
                      ).then((result) => {
                        if (result === null) {
                          resolve();
                        }
                      });
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
            applyAttrs[applyAttrs.length - 1] = applyAttrs[applyAttrs.length - 1]?.then(() => postTarget);
          } else {
            applyAttrs.push(postTarget);
          }
        }

        Promise.allSettled(applyAttrs).then(() => {
          if (user?.turnData?.hitsLeft === 1 || !this.getTarget()?.isActive()) {
            const deferredPromises: Promise<void>[] = [];
            this.scene.getPlayerField().forEach(pokemon => {
              deferredPromises.push(applyDeferredPostMoveUsedAbAttrs(pokemon, this.move, user, this.targets));
            });
            this.scene.getEnemyField().forEach(pokemon => {
              deferredPromises.push(applyDeferredPostMoveUsedAbAttrs(pokemon, this.move, user, this.targets));
            });
            Promise.allSettled(deferredPromises).then(() => endOnce());
          } else {
            endOnce();
          }
        }).catch(err => {
          console.error(`[MOVE-EFFECT ERROR] animation/effect chain:`, err);
          endOnce();
        });
        } catch (err) {
          console.error(`[MOVE-EFFECT ERROR] callback body:`, err);
          endOnce();
        }
      });
    });
  }

  end() {
    const user = this.getUserPokemon();

    if (user) {
      user.turnData.chainsOhkoThisHit = false;
      if (user.turnData.hitsLeft && --user.turnData.hitsLeft >= 1 && this.getTarget()?.isActive()) {
        this.scene.unshiftPhase(this.getNewHitPhase());
      } else {
        clearAbilityAddedMoveFlags(user, this.move.getMove());
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

    if ([MoveTarget.USER, MoveTarget.ENEMY_SIDE].includes(this.move.getMove().moveTarget)) {
      return true;
    }

    const user = this.getUserPokemon()!;
    if (user.turnData.hitsLeft < user.turnData.hitCount) {
      if (!this.move.getMove().hasFlag(MoveFlags.CHECK_ALL_HITS) || user.hasAbilityWithAttr(MaxMultiHitAbAttr)) {
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
    if (semiInvulnerableTag && !this.move.getMove().getAttrs(HitsTagAttr).some(hta => hta.tagType === semiInvulnerableTag.tagType)) {
      return false;
    }

    const moveAccuracy = this.move.getMove().calculateBattleAccuracy(user!, target);

    if (moveAccuracy === -1) {
      return true;
    }

    const accuracyMultiplier = user.getAccuracyMultiplier(target, this.move.getMove());
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