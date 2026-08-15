import BattleScene from "#app/battle-scene.js";
import {BattlerIndex} from "#app/battle.js";
import {
    getPokeballCatchMultiplier,
    getPokeballAtlasKey,
    getPokeballTintColor,
    doPokeballBounceAnim,
    applyTypeBallRecolor,
    applyVoidBallRecolor
} from "#app/data/pokeball.js";
import { Type, getTypeRgb } from "#app/data/type.js";
import {getStatusEffectCatchRateMultiplier} from "#app/data/status-effect.js";
import {PokeballType} from "#app/enums/pokeball.js";
import {StatusEffect} from "#app/enums/status-effect.js";
import {addPokeballOpenParticles, addPokeballCaptureStars} from "#app/field/anims.js";
import {EnemyPokemon, PlayerPokemon, PokemonMove} from "#app/field/pokemon.js";
import {getPokemonNameWithAffix} from "#app/messages.js";
import {PokemonHeldItemModifier, TerastallizeAccessModifier, PokemonBaseStatModifier} from "#app/modifier/modifier.js";
import {achvs} from "#app/system/achv.js";
import {PartyUiMode, PartyOption} from "#app/ui/party-ui-handler.js";
import {SummaryUiMode} from "#app/ui/summary-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import {PokemonPhase} from "./pokemon-phase";
import {VictoryPhase} from "./victory-phase";
import {BattleType} from "#app/battle";
import {FaintPhase} from "#app/phases/faint-phase";
import {SwitchSummonPhase} from "#app/phases/switch-summon-phase";
import {ShowRewards} from "#app/utils/show-rewards.js";
import {BattlerTagLapseType} from "#app/data/battler-tags.js";
import {QuestUnlockPhase} from "#app/phases/quest-unlock-phase";
import {PermaCatchQuestModifier, TypeSwitcherModifier} from "#app/modifier/modifier";
import {QuestState, QuestUnlockables} from "#app/system/game-data";
import {PermaType} from "#app/modifier/perma-modifiers";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import { tmPoolTiers } from "#app/data/tms.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import {Gender} from "#app/data/gender";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import {starterCatchQuestModifier, TypeSwitcherModifierType} from "#app/modifier/modifier-type";
import * as Utils from "#app/utils";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { allMoves, MoveCategory, MoveFlags } from "#app/data/move.js";
import { Moves, isYuMove } from "#app/enums/moves.js";
export class AttemptCapturePhase extends PokemonPhase {
    private pokeballType: PokeballType;
    private typeBallTargetType?: Type;
    private pokeball: Phaser.GameObjects.Sprite;
    private originalY: number;

    constructor(scene: BattleScene, targetIndex: integer, pokeballType: PokeballType, typeBallTargetType?: Type) {
        super(scene, BattlerIndex.ENEMY + targetIndex);

        this.pokeballType = pokeballType;
        this.typeBallTargetType = typeBallTargetType;
    }

    start() {
        super.start();

        const pokemon = this.getPokemon() as EnemyPokemon;

        if (!pokemon?.hp) {
            return this.end();
        }

        if (this.pokeballType === PokeballType.TYPE_BALL && this.typeBallTargetType !== undefined) {
            this.scene.typeBallCounts[this.typeBallTargetType] = Math.max(
                (this.scene.typeBallCounts[this.typeBallTargetType] || 0) - 1, 0
            );
        } else {
            this.scene.pokeballCounts[this.pokeballType]--;
        }

        switch (this.pokeballType) {
            case PokeballType.POKEBALL:
                this.scene.gameData.gameStats.pokeballsThrown++;
                break;
            case PokeballType.GREAT_BALL:
                this.scene.gameData.gameStats.greatballsThrown++;
                break;
            case PokeballType.ULTRA_BALL:
                this.scene.gameData.gameStats.ultraballsThrown++;
                break;
            case PokeballType.ROGUE_BALL:
                this.scene.gameData.gameStats.rogueballsThrown++;
                break;
            case PokeballType.MASTER_BALL:
                this.scene.gameData.gameStats.masterballsThrown++;
                break;
            case PokeballType.TYPE_BALL:
                this.scene.gameData.gameStats.ultraballsThrown++;
                break;
            case PokeballType.VOID_BALL:
                this.scene.gameData.gameStats.masterballsThrown++;
                break;
        }

        this.originalY = pokemon.y;

        const _3m = 3 * pokemon.getMaxHp();
        const _2h = 2 * pokemon.hp;

        let catchRateMultiplier = 1.25;

        if (this.pokeballType !== PokeballType.VOID_BALL) {
          if((pokemon.isOPForm() && this.scene.currentBattle?.waveIndex <= 1000) || (this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.gameMode.checkIfRival(this.scene))) {
              catchRateMultiplier = 0.05;
          }
        }
        else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_CATCH_RATE_3)) {
            catchRateMultiplier = 2;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_CATCH_RATE_2)) {
            catchRateMultiplier = 1.75;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_CATCH_RATE_1)) {
            catchRateMultiplier = 1.5;
        }

        if(this.scene.dynamicMode) {
            catchRateMultiplier *= 0.15;
        }
        try {
            const addByType = (this.scene.gameData as any).activeSkillTree?.catchRateBonusByType as Partial<Record<Type, number>> | undefined;
            if (addByType) {
                const t1 = pokemon.species.type1 as Type;
                const t2 = (pokemon.species.type2 as Type) ?? undefined;
                const bonus = (addByType[t1] ?? 0) + (t2 ? (addByType[t2] ?? 0) : 0);

                catchRateMultiplier = Math.max(0, catchRateMultiplier + bonus);
            }
        } catch {

        }
        const catchRate = pokemon.species.catchRate * catchRateMultiplier;
        const pokeballMultiplier = getPokeballCatchMultiplier(this.pokeballType);
        const statusMultiplier = pokemon.status ? getStatusEffectCatchRateMultiplier(pokemon.status.effect) : 1;
        let x = 0, y = 0;
        if (pokeballMultiplier >= 0) {
          x = Math.round((((_3m - _2h) * catchRate * pokeballMultiplier) / _3m) * statusMultiplier);
          y = Math.round(65536 / Math.sqrt(Math.sqrt(255 / x)));
        }
        const fpOffset = pokemon.getFieldPositionOffset();

        const pokeballAtlasKey = getPokeballAtlasKey(this.pokeballType);
        this.pokeball = this.scene.addFieldSprite(16, 80, "pb", pokeballAtlasKey);
        this.pokeball.setOrigin(0.5, 0.625);

        if (this.pokeballType === PokeballType.TYPE_BALL && this.typeBallTargetType !== undefined) {
          applyTypeBallRecolor(this.scene, this.pokeball, this.typeBallTargetType);
        } else if (this.pokeballType === PokeballType.VOID_BALL) {
          applyVoidBallRecolor(this.scene, this.pokeball);
          this.pokeball.setAlpha(0.85);
        }

        this.scene.field.add(this.pokeball);

        this.scene.playSound("se/pb_throw");
        this.scene.time.delayedCall(300, () => {
            this.scene.field.moveBelow(this.pokeball as Phaser.GameObjects.GameObject, pokemon);
        });

        this.scene.tweens.add({
            targets: this.pokeball,
            x: {value: 236 + fpOffset[0], ease: "Linear"},
            y: {value: 16 + fpOffset[1], ease: "Cubic.easeOut"},
            duration: 500,
            onComplete: () => {
                this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
                this.scene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}_open`));
                this.scene.playSound("se/pb_rel");
                const captureTintColor = (this.pokeballType === PokeballType.TYPE_BALL && this.typeBallTargetType !== undefined)
                  ? Phaser.Display.Color.GetColor(...getTypeRgb(this.typeBallTargetType))
                  : (this.pokeballType === PokeballType.VOID_BALL ? 0x2d1450 : getPokeballTintColor(this.pokeballType));
                pokemon.tint(captureTintColor);

                addPokeballOpenParticles(this.scene, this.pokeball.x, this.pokeball.y, this.pokeballType);

                if (pokemon.portalSprite) {
                    pokemon.portalSprite.setVisible(false);
                }

                this.scene.tweens.add({
                    targets: pokemon,
                    duration: 500,
                    ease: "Sine.easeIn",
                    scale: 0.25,
                    y: 20,
                    onComplete: () => {
                        this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
                        pokemon.setVisible(false);
                        this.scene.playSound("se/pb_catch");
                        this.scene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}`));

                        const doShake = () => {
                            let shakeCount = 0;
                            const pbX = this.pokeball.x;
                            const shakeCounter = this.scene.tweens.addCounter({
                                from: 0,
                                to: 1,
                                repeat: 4,
                                yoyo: true,
                                ease: "Cubic.easeOut",
                                duration: 250,
                                repeatDelay: 500,
                                onUpdate: t => {
                                    if (shakeCount && shakeCount < 4) {
                                        const value = t.getValue();
                                        const directionMultiplier = shakeCount % 2 === 1 ? 1 : -1;
                                        this.pokeball.setX(pbX + value * 4 * directionMultiplier);
                                        this.pokeball.setAngle(value * 27.5 * directionMultiplier);
                                    }
                                },
                                onRepeat: () => {
                                    if (!pokemon.species.isObtainable() && pokeballMultiplier !== -2) {
                                        shakeCounter.stop();
                                        this.failCatch(shakeCount);
                                    } else if (shakeCount++ < 3) {
                                        if (pokeballMultiplier === -1 || pokeballMultiplier === -2 || pokemon.randSeedInt(65536) < y) {
                                            this.scene.playSound("se/pb_move");
                                        } else {
                                            shakeCounter.stop();
                                            this.failCatch(shakeCount);
                                        }
                                    } else {
                                        this.scene.playSound("se/pb_lock");
                                        addPokeballCaptureStars(this.scene, this.pokeball);

                                        const pbTint = this.scene.add.sprite(this.pokeball.x, this.pokeball.y, "pb", "pb");
                                        pbTint.setOrigin(this.pokeball.originX, this.pokeball.originY);
                                        pbTint.setTintFill(0);
                                        pbTint.setAlpha(0);
                                        this.scene.field.add(pbTint);
                                        this.scene.tweens.add({
                                            targets: pbTint,
                                            alpha: 0.375,
                                            duration: 200,
                                            easing: "Sine.easeOut",
                                            onComplete: () => {
                                                this.scene.tweens.add({
                                                    targets: pbTint,
                                                    alpha: 0,
                                                    duration: 200,
                                                    easing: "Sine.easeIn",
                                                    onComplete: () => pbTint.destroy()
                                                });
                                            }
                                        });
                                    }
                                },
                                onComplete: () => {
                                    const pokemon = this.getPokemon();
                                    if (pokemon.isFusion()) {
                                        this.scene.ui.setOverlayMode(Mode.REWARD_OBTAINED, {
                                            buttonActions: [
                                                () => {
                                                    this.scene.ui.getHandler().clear();
                                                    this.scene.gameData.setObtainedFusionUnlock(pokemon, pokemon.fusionSpecies!.speciesId)
                                                    this.scene.gameData.gameStats.fusionsCaptured++;
                                                    this.catch();
                                                }
                                            ]
                                        }, {
                                            name: pokemon.name,
                                            type: RewardObtainedType.FUSION,
                                            pokemon: pokemon
                                        });
                                    this.scene.playSound("level_up_fanfare");
                                    } else {
                                        this.catch();
                                    }
                                }
                            });
                        };

                        this.scene.time.delayedCall(250, () => doPokeballBounceAnim(this.scene, this.pokeball, 16, 72, 350, doShake));
                    }
                });
            }
        });
    }

    failCatch(shakeCount: integer) {
        const pokemon = this.getPokemon();

        this.scene.playSound("se/pb_rel");
        pokemon.setY(this.originalY);
        if (pokemon.status?.effect !== StatusEffect.SLEEP) {
            pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : {rate: 0.85});
        }
        const failTintColor = (this.pokeballType === PokeballType.TYPE_BALL && this.typeBallTargetType !== undefined)
          ? Phaser.Display.Color.GetColor(...getTypeRgb(this.typeBallTargetType))
          : (this.pokeballType === PokeballType.VOID_BALL ? 0x2d1450 : getPokeballTintColor(this.pokeballType));
        pokemon.tint(failTintColor);
        pokemon.setVisible(true);
        if (pokemon.portalSprite && pokemon.species?.generation === 20) {
            pokemon.portalSprite.setVisible(true);
        }
        pokemon.untint(250, "Sine.easeOut");

        const pokeballAtlasKey = getPokeballAtlasKey(this.pokeballType);
        this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
        this.scene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}_open`));

        this.scene.tweens.add({
            targets: pokemon,
            duration: 250,
            ease: "Sine.easeOut",
            scale: pokemon.getSpriteScale()
        });

        this.scene.currentBattle.lastUsedPokeball = this.pokeballType;
        this.removePb();
        this.end();
    }

    catch() {
        const pokemon = this.getPokemon() as EnemyPokemon;
        this.scene.recordRunEndSummaryCapture(pokemon);
        if (this.scene.currentBattle.battleType === BattleType.TRAINER) {

            const moneyToDeduct = this.scene.getRequiredMoneyForPokeBuy();
            this.scene.addMoney(-moneyToDeduct);

            this.scene.gameData.gameStats.trainerPokemonSnatched++;
            this.scene.gameData.gameStats.moneySpentFromSnatching += moneyToDeduct;

            this.scene.gameData.reducePermaModifierByType([
                PermaType.PERMA_TRAINER_SNATCH_COST_1,
                PermaType.PERMA_TRAINER_SNATCH_COST_2,
                PermaType.PERMA_TRAINER_SNATCH_COST_3
            ], this.scene);
        }
        this.scene.gameData.reducePermaModifierByType([
            PermaType.PERMA_CATCH_RATE_1,
            PermaType.PERMA_CATCH_RATE_2,
            PermaType.PERMA_CATCH_RATE_3
        ], this.scene);

        if (this.scene.gameData.getQuestState(QuestUnlockables.STARTER_CATCH_QUEST) == undefined) {
            this.scene.gameData.setQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.UNLOCKED);
            const starterQuestData = starterCatchQuestModifier.config.questUnlockData;
            this.scene.pushPhase(new QuestUnlockPhase(this.scene, starterQuestData, true));
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.NEW_QUESTS, true);
        }
        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaCatchQuestModifier)
            .forEach(modifier => modifier.apply([this.scene]));
        this.scene.findModifiers(m => m instanceof PermaCatchQuestModifier)
            .forEach(modifier => modifier.apply([this.scene]));
        const speciesForm = !pokemon.fusionSpecies ? pokemon.getSpeciesForm() : pokemon.getFusionSpeciesForm();

        if (speciesForm.abilityHidden && (pokemon.fusionSpecies ? pokemon.fusionAbilityIndex : pokemon.abilityIndex) === speciesForm.getAbilityCount() - 1) {
            this.scene.validateAchv(achvs.HIDDEN_ABILITY);
        }

        if (pokemon.species.subLegendary) {
            this.scene.validateAchv(achvs.CATCH_SUB_LEGENDARY);
        }

        if (pokemon.species.legendary) {
            this.scene.validateAchv(achvs.CATCH_LEGENDARY);
        }

        if (pokemon.species.mythical) {
            this.scene.validateAchv(achvs.CATCH_MYTHICAL);
        }

        const activeTree = (this.scene.gameData as any).activeSkillTree;
        if (activeTree && activeTree.legendaryEncounterChanceBySpecies) {
            const speciesId = pokemon.species.speciesId;
            if (activeTree.legendaryEncounterChanceBySpecies[speciesId] !== undefined) {
                console.log(`[Legendary] Removing species ${speciesId} from encounter chance map after capture`);
                delete activeTree.legendaryEncounterChanceBySpecies[speciesId];
            }
        }

        this.scene.pokemonInfoContainer.show(pokemon, true);

        this.scene.gameData.updateSpeciesDexIvs(pokemon.species.getRootSpeciesId(true), pokemon.ivs);
        this.scene.ui.setMode(Mode.MESSAGE).then(() => {
            this.scene.ui.showText(i18next.t("battle:pokemonCaught", {pokemonName: getPokemonNameWithAffix(pokemon)}), null, () => {
                let faintPhaseQueued = false;
                const end = () => {
                    if (!faintPhaseQueued) {
                        this.scene.unshiftPhase(new VictoryPhase(this.scene, this.battlerIndex));
                    }
                    this.scene.pokemonInfoContainer.hide();
                    this.removePb();
                    this.end();
                };
                const uniqueRemovePokemon = () => {
                    const capturedFieldIndex = this.fieldIndex;
                    if (this.scene.currentBattle.battleType != BattleType.TRAINER) {
                        removePokemon();
                    } else if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
                        if (this.scene.getEnemyParty().filter(p => !p.isFainted()).length > 1) {
                            if (this.scene.currentBattle.double) {
                                const allyPokemon = pokemon.getAlly();
                                if (allyPokemon) {
                                    this.scene.redirectPokemonMoves(pokemon, allyPokemon);
                                }
                            }
                            removePokemon();
                            this.scene.unshiftPhase(new VictoryPhase(this.scene, this.battlerIndex));
                            faintPhaseQueued = true;
                            const hasReservePartyMember = !!this.scene.getEnemyParty().filter(p => p.isActive() && !p.isOnField()).length;
                            if (hasReservePartyMember) {
                                ShowRewards(this.scene, undefined, false);
                                this.scene.pushPhase(new SwitchSummonPhase(this.scene, capturedFieldIndex, -1, false, false, false));
                            }
                        } else {
                            removePokemon();
                        }
                    }
                };
                const removePokemon = () => {
                    this.scene.addFaintedEnemyScore(pokemon);
                    this.scene.getPlayerField().filter(p => p.isActive(true)).forEach(playerPokemon => playerPokemon.removeTagsBySourceId(pokemon.id));
                    pokemon.hp = 0;
                    pokemon.trySetStatus(StatusEffect.FAINT);
                    pokemon.lapseTags(BattlerTagLapseType.FAINT);
                    this.scene.currentBattle.enemyFaints += 1;
                    const modifiersToRemove = this.scene.enemyModifiers.filter(
                        m => m instanceof PokemonHeldItemModifier && (m as PokemonHeldItemModifier).pokemonId === pokemon.id
                    );
                    for (const m of modifiersToRemove) {
                        this.scene.enemyModifiers.splice(this.scene.enemyModifiers.indexOf(m), 1);
                    }
                    this.scene.field.remove(pokemon);
                };
                const addToParty = () => {
                    const newPokemon = pokemon.addToParty(this.pokeballType, this.typeBallTargetType);

                    const modifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && !(m instanceof TerastallizeAccessModifier || m instanceof PokemonBaseStatModifier), false);
                    if (this.scene.getParty().filter(p => p.isShiny()).length === 6) {
                        this.scene.validateAchv(achvs.SHINY_PARTY);
                    }
                    uniqueRemovePokemon();
                        if (newPokemon) {
                            newPokemon.loadAssets().then(end);
                        } else {
                            end();
                        }
                    Promise.all(modifiers.map(m => this.scene.addModifier(m, true))).then(() => {
                        this.scene.updateModifiers(true);

                        if (newPokemon && this.pokeballType === PokeballType.TYPE_BALL && this.typeBallTargetType !== undefined) {
                          this.applyTypeBallEffect(newPokemon);
                        }
                    });
                };
                Promise.all([pokemon.hideInfo(), this.scene.gameData.setPokemonCaught(pokemon)]).then(() => {
                    if (this.scene.getParty().length === 6) {
                        const promptRelease = () => {
                            this.scene.ui.showText(i18next.t("battle:partyFull", {pokemonName: pokemon.getNameToRender()}), null, () => {
                                this.scene.pokemonInfoContainer.makeRoomForConfirmUi(1, true);
                                this.scene.ui.setMode(Mode.CONFIRM, () => {
                                    const newPokemon = this.scene.addPlayerPokemon(pokemon.species, pokemon.level, pokemon.abilityIndex, pokemon.formIndex, pokemon.gender, pokemon.shiny, pokemon.variant, pokemon.ivs, pokemon.nature, pokemon);
                                    this.scene.ui.setMode(Mode.SUMMARY, newPokemon, 0, SummaryUiMode.DEFAULT, () => {
                                        this.scene.ui.setMode(Mode.MESSAGE).then(() => {
                                            promptRelease();
                                        });
                                    }, false);
                                }, () => {
                                    this.scene.ui.setMode(Mode.PARTY, PartyUiMode.RELEASE, this.fieldIndex, (slotIndex: integer, _option: PartyOption) => {
                                        this.scene.ui.setMode(Mode.MESSAGE).then(() => {
                                            if (slotIndex < 6) {
                                                addToParty();
                                            } else {
                                                promptRelease();
                                            }
                                        });
                                    });
                                }, () => {
                                    this.scene.ui.setMode(Mode.MESSAGE).then(() => {

                                        uniqueRemovePokemon();
                                        end();
                                    });
                                }, "fullParty");
                            });
                        };
                        promptRelease();
                    } else {
                        addToParty();
                    }
                });
            }, 0, true);
        });
    }

    private applyTypeBallEffect(pokemon: PlayerPokemon): void {
        const targetType = this.typeBallTargetType;
        if (targetType === undefined || targetType === Type.UNKNOWN) return;

        const assignToPrimary = Utils.randSeedInt(2) === 0;

        const newPrimary = assignToPrimary ? targetType : null;
        const newSecondary = assignToPrimary ? null : targetType;

        const modType = new TypeSwitcherModifierType(newPrimary, newSecondary);
        modType.id = "TYPE_SWITCHER";
        const modifier = modType.newModifier(pokemon) as TypeSwitcherModifier;
        this.scene.addModifier(modifier, false);

        this.assignTypeBallMoves(pokemon, targetType);
    }

    private assignTypeBallMoves(pokemon: PlayerPokemon, targetType: Type): void {
        const currentMoveIds = pokemon.getMoveset().filter(pm => pm !== null).map(pm => pm.moveId);
        const movePool = Utils.getEnumValues(Moves).filter((m: Moves) => {
            const move = allMoves[m];
            return move && m !== Moves.NONE
                && !isYuMove(m)
                && move.type === targetType
                && !move.hasFlag(MoveFlags.IGNORE_VIRTUAL)
                && !move.name.endsWith(" (N)")
                && !currentMoveIds.includes(m);
        }) as Moves[];

        if (movePool.length === 0) return;

        const weightedPool: [Moves, number][] = movePool.map(m => {
            const tier = tmPoolTiers[m as integer];
            let weight: number;
            if (tier === undefined || tier <= ModifierTier.COMMON) weight = 40;
            else if (tier === ModifierTier.GREAT) weight = 30;
            else if (tier === ModifierTier.ULTRA) weight = 20;
            else if (tier === ModifierTier.ROGUE) weight = 10;
            else {
                weight = Utils.randSeedInt(5000) === 0 ? 1 : 0;
            }
            return [m, weight];
        }).filter(([, w]) => w > 0);

        if (weightedPool.length === 0) return;

        const selectWeightedMove = (pool: [Moves, number][]): Moves => {
            const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0);
            let rand = Utils.randSeedInt(totalWeight);
            for (const [moveId, weight] of pool) {
                if (rand < weight) return moveId;
                rand -= weight;
            }
            return pool[pool.length - 1][0];
        };

        const moveset = pokemon.getMoveset();
        const originalTypes = pokemon.species.type1 !== undefined
            ? [pokemon.species.type1, pokemon.species.type2].filter(t => t !== undefined && t !== Type.UNKNOWN)
            : [];

        let remainingPool = [...weightedPool];
        const selectedMoves: Moves[] = [];
        for (let i = 0; i < 3 && remainingPool.length > 0; i++) {
            const move = selectWeightedMove(remainingPool);
            selectedMoves.push(move);
            remainingPool = remainingPool.filter(([m]) => m !== move);
        }

        let slotsToReplace: number[] = [];

        for (let i = moveset.length; i < 4; i++) {
            slotsToReplace.push(i);
        }

        if (slotsToReplace.length < 3) {
            const nonTypeSlots = moveset
                .map((m, i) => ({ move: m, index: i }))
                .filter(({ move, index }) =>
                    move && !originalTypes.includes(allMoves[move.moveId].type)
                    && !slotsToReplace.includes(index)
                )
                .map(({ index }) => index);
            slotsToReplace.push(...nonTypeSlots);
        }

        if (slotsToReplace.length < 3) {
            const remainingSlots = moveset
                .map((_, i) => i)
                .filter(i => !slotsToReplace.includes(i));
            for (let i = remainingSlots.length - 1; i > 0; i--) {
                const j = Utils.randSeedInt(i + 1);
                [remainingSlots[i], remainingSlots[j]] = [remainingSlots[j], remainingSlots[i]];
            }
            slotsToReplace.push(...remainingSlots);
        }

        for (let i = 0; i < selectedMoves.length && i < slotsToReplace.length; i++) {
            const slotIdx = slotsToReplace[i];
            if (slotIdx < moveset.length) {
                pokemon.moveset[slotIdx] = new PokemonMove(selectedMoves[i], 0, 0);
            } else {
                pokemon.moveset.push(new PokemonMove(selectedMoves[i], 0, 0));
            }
        }
    }

    removePb() {
        this.scene.tweens.add({
            targets: this.pokeball,
            duration: 250,
            delay: 250,
            ease: "Sine.easeIn",
            alpha: 0,
            onComplete: () => this.pokeball.destroy()
        });
    }
}