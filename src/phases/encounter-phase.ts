import BattleScene from "#app/battle-scene";
import { BattleType, BattlerIndex } from "#app/battle";
import { FaintPhase } from "./faint-phase";
import { applyAbAttrs, SyncEncounterNatureAbAttr } from "#app/data/ability";
import { getCharVariantFromDialogue } from "#app/data/dialogue";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import { TrainerSlot } from "#app/data/trainer-config";
import { getRandomWeatherType } from "#app/data/weather";
import { BattleSpec } from "#app/enums/battle-spec";
import { StatusEffect } from "#app/enums/status-effect";
import { PlayerGender } from "#app/enums/player-gender";
import { Species } from "#app/enums/species";
import { EncounterPhaseEvent } from "#app/events/battle-scene";
import Pokemon, { FieldPosition, DUELMON_PORTAL_WORLD_SCALE } from "#app/field/pokemon";
import { playPortalSummonAnim, playTrainerPortalSummonAnim } from "#app/field/portal-anim";
import { getPokemonNameWithAffix } from "#app/messages";
import {
  regenerateModifierPoolThresholds,
  ModifierPoolType,
  modifierTypes,
  GlitchPieceModifierType
} from "#app/modifier/modifier-type";
import {
  IvScannerModifier,
  TurnHeldItemTransferModifier,
  PermaCountdownWaveCheckQuestModifier,
  PermaWaveCheckQuestModifier,
  PersistentModifier,
  PermaRunQuestModifier,
  PermaFormChangeQuestModifier, PermaBeatTrainerQuestModifier
} from "#app/modifier/modifier";
import { achvs } from "#app/system/achv";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { Mode } from "#app/ui/ui";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import * as Utils from "#app/utils";
import Overrides, { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides";
import { CheckSwitchPhase } from "./check-switch-phase";
import { GameOverPhase } from "./game-over-phase";
import { PostSummonPhase } from "./post-summon-phase";
import { getReturnPhase } from "./encounter-phase-cache";
import { ScanIvsPhase } from "./scan-ivs-phase";
import { ShinySparklePhase } from "./shiny-sparkle-phase";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { SummonPhase } from "./summon-phase";
import { ToggleDoublePositionPhase } from "./toggle-double-position-phase";
import { ShowRewards } from "#app/utils/show-rewards.js";
import {TrainerType} from "#enums/trainer-type";
import {randSeedInt} from "#app/utils";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {PermaType} from "#app/modifier/perma-modifiers";
import {PokeballType} from "#enums/pokeball";
import { getActiveChampionData } from "#app/data/pokeball";
import { Type } from "#app/data/type";
import {isNonQuestBountyModifier, QuestUnlockables} from "#app/system/game-data";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import {applyUniversalSmittyForm, pokemonFormChanges, SmittyFormTrigger} from "#app/data/pokemon-forms";
import { GameDataType } from "#enums/game-data-type";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";

export class EncounterPhase extends BattlePhase {
  private static _smitomSmittyDebugShown = false;
  protected loaded: boolean;

  constructor(scene: BattleScene, loaded?: boolean) {
    super(scene);
    this.loaded = !!loaded;
  }

  start() {
    super.start();

    const bScene = this.scene as BattleScene;
    if (bScene._commonAnimsReady) {
      bScene._commonAnimsReady.then(() => {
        bScene._commonAnimsReady = null;
        this.doStart();
      });
    } else {
      this.doStart();
    }
  }

  private doStart() {
    let battle = this.scene.currentBattle;
    if (!this.scene.disableCutscenes &&
      !this.loaded &&
      battle?.battleType === BattleType.TRAINER &&
      battle?.trainer?.config?.trainerType === TrainerType.SMITTY) {
      const wave = battle.waveIndex;
      const battleAny: any = battle as any;

      if (this.scene.gameMode.isNightmare && wave === 500 && !battleAny.voidSmittyBattleCutsceneShown) {
        battleAny.voidSmittyBattleCutsceneShown = true;
        this.scene.gameData.gameStats.cutsceneFirstSmittyBattleShown = true;
        const def = STORY_CUTSCENES.void_smitty_battle;
        this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
          slides: def.slides,
          bgmKey: def.bgmKey,
          canSkip: true,
          pauseAfterText: 1000,
          resumeBgmOnEnd: true,
        }));
        const ResumePhase = this.constructor as new (scene: BattleScene, loaded?: boolean) => EncounterPhase;
        this.scene.unshiftPhase(new ResumePhase(this.scene, this.loaded));
        super.end();
        return;
      }

      if ((!this.scene.gameMode.isNightmare || wave !== 500) && !battleAny.smittyBattleCutsceneShown) {
        battleAny.smittyBattleCutsceneShown = true;
        this.scene.gameData.gameStats.cutsceneFirstSmittyBattleShown = true;
        const def = STORY_CUTSCENES.smitty_battle_first;
        this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
          slides: def.slides,
          bgmKey: def.bgmKey,
          canSkip: true,
          pauseAfterText: 1000,
          resumeBgmOnEnd: true,
        }));
        const ResumePhase = this.constructor as new (scene: BattleScene, loaded?: boolean) => EncounterPhase;
        this.scene.unshiftPhase(new ResumePhase(this.scene, this.loaded));
        super.end();
        return;
      }
    }

    this.scene.updateGameInfo();

    this.scene.initSession();

    this.scene.eventTarget.dispatchEvent(new EncounterPhaseEvent());
    this.scene.ui.updatePermaMoneyText(this.scene);

    const finalWave = this.scene.gameMode.getFinalWave();
    if (finalWave > 0 && this.scene.currentBattle.waveIndex > finalWave && !this.scene.gameMode.isEndless && !this.scene.gameMode.isChaosMode) {
      this.scene.unshiftPhase(new GameOverPhase(this.scene));
    }

    const loadEnemyAssets: Promise<void>[] = [];

    battle = this.scene.currentBattle;

    let totalBst = 0;

    if(this.loaded) {
      this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
      this.scene.currentBattle.initBattleSpec();
      if (this.scene.gameData.resumeInBattle) {
        if (Overrides.DEBUG_SAVE_TRACE) {
          console.debug("[SAVE_TRACE] EncounterPhase loaded resumeInBattle short-circuit", {
            autoSaveMode: this.scene.autoSaveMode,
            waveIndex: battle?.waveIndex,
            battleTurn: battle?.turn,
            encounterInitComplete: this.scene.encounterInitComplete
          });
        }
        this.scene.gameData.resumeInBattle = false;
        this.scene.currentBattle.started = true;
        this.scene.playBgm(undefined);
        this.scene.pbTray.hide();
        this.scene.pbTrayEnemy.hide();
        if (this.scene.arenaPlayer.x !== 0) {
          this.scene.arenaPlayer.setX(0);
        }
        if (this.scene.arenaEnemy.x !== 20) {
          this.scene.arenaEnemy.setX(20);
        }
        if (this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.currentBattle.trainer) {
          if (this.scene.currentBattle.trainer.x < 0) {
            this.scene.currentBattle.trainer.setX(this.scene.currentBattle.trainer.x + 300);
          }
          this.hideEnemyTrainer();
        }
        this.hydrateActiveBattlersToField();
        super.end();
        return;
      }
      if (Overrides.DEBUG_SAVE_TRACE) {
        console.debug("[SAVE_TRACE] EncounterPhase loaded continue (resumeInBattle false)", {
          autoSaveMode: this.scene.autoSaveMode,
          waveIndex: battle?.waveIndex,
          battleTurn: battle?.turn,
          encounterInitComplete: this.scene.encounterInitComplete
        });
      }
    }
    else {
      if (battle.waveIndex > 1) {
        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaWaveCheckQuestModifier && !(m instanceof PermaCountdownWaveCheckQuestModifier))
            .forEach(modifier => modifier.apply([this.scene, this.scene]));
        this.scene.findModifiers(m => m instanceof PermaWaveCheckQuestModifier && !(m instanceof PermaCountdownWaveCheckQuestModifier))
            .forEach(modifier => modifier.apply([this.scene, this.scene]));

        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaCountdownWaveCheckQuestModifier)
            .forEach(modifier => {
              if (battle.waveIndex >= this.scene.gameMode.getFinalWave() - (modifier as PermaCountdownWaveCheckQuestModifier).startWave) {
                modifier.apply([this.scene, this.scene]);
              }
            });
        this.scene.findModifiers(m => m instanceof PermaCountdownWaveCheckQuestModifier)
            .forEach(modifier => {
              if (battle.waveIndex >= this.scene.gameMode.getFinalWave() - (modifier as PermaCountdownWaveCheckQuestModifier).startWave) {
                modifier.apply([this.scene, this.scene]);
              }
            });

        if(this.scene.currentBattle.waveIndex >= 50) {
          this.scene.gameData.reducePermaWaveModifiers(this.scene);
        }

        if(battle.waveIndex === 2 && !this.scene.gameMode.isChaosMode) {
          this.scene.gameData.updateGameModeStats(this.scene.gameMode.modeId);
        }
      }
      else if (!this.scene.gameMode.isTestMod) {
        let glitchPieces = 0;

        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_GLITCH_PIECES_3)) {
          glitchPieces = 4;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_GLITCH_PIECES_2)) {
          glitchPieces = 3;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_GLITCH_PIECES_1)) {
          glitchPieces = 2;
        }

        if(glitchPieces) {
          this.scene.unshiftPhase(new ModifierRewardPhase(this.scene, () => new GlitchPieceModifierType(glitchPieces)));
        }

        this.scene.gameData.reducePermaModifierByType([
          PermaType.PERMA_START_GLITCH_PIECES_1,
          PermaType.PERMA_START_GLITCH_PIECES_2,
          PermaType.PERMA_START_GLITCH_PIECES_3
        ], this.scene);
        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_BALL_3)) {
          this.scene.pokeballCounts[PokeballType.MASTER_BALL] += 1;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_BALL_2)) {
          this.scene.pokeballCounts[PokeballType.ROGUE_BALL] += 5;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_START_BALL_1)) {
          this.scene.pokeballCounts[PokeballType.ULTRA_BALL] += 5;
        }

        this.scene.gameData.reducePermaModifierByType([
          PermaType.PERMA_START_BALL_1,
          PermaType.PERMA_START_BALL_2,
          PermaType.PERMA_START_BALL_3
        ], this.scene);

        const championData = getActiveChampionData(this.scene);
        if (championData) {
          const hasType1 = championData.type1 !== undefined && championData.type1 !== Type.UNKNOWN;
          const hasType2 = championData.type2 !== undefined && championData.type2 !== Type.UNKNOWN;
          if (hasType1 && hasType2) {
            this.scene.typeBallCounts[championData.type1!] = (this.scene.typeBallCounts[championData.type1!] || 0) + 3;
            this.scene.typeBallCounts[championData.type2!] = (this.scene.typeBallCounts[championData.type2!] || 0) + 3;
          } else if (hasType1) {
            this.scene.typeBallCounts[championData.type1!] = (this.scene.typeBallCounts[championData.type1!] || 0) + 6;
          } else {
            this.scene.typeBallCounts[Type.NORMAL] = (this.scene.typeBallCounts[Type.NORMAL] || 0) + 6;
          }
        }
      }
    }
    if (battle.waveIndex === 1 || battle.waveIndex % 10 === 1) {
      if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_NEW_ROUND_TERA)) {
        const teraApplied = this.addRandomTeraModifierToPlayer();
        if (teraApplied) {
          this.scene.gameData.reducePermaModifierByType([PermaType.PERMA_NEW_ROUND_TERA], this.scene);
        }
      }
    }

    battle.enemyLevels?.forEach((level, e) => {
      if (!this.loaded) {
        if (battle.battleType === BattleType.TRAINER) {
          battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
        } else {
          let enemySpecies = this.scene.randomSpecies(battle.waveIndex, level, true);

          if (this.scene.currentBattle.battleSpec !== BattleSpec.FINAL_BOSS) {
            const isBossEncounter = !!this.scene.getEncounterBossSegments(battle.waveIndex, level);
            if (isBossEncounter) {
              const encounterChanceMap = (this.scene.gameData as any).activeSkillTree?.legendaryEncounterChanceBySpecies || {};
              const speciesWithChances = Object.keys(encounterChanceMap);

              if (speciesWithChances.length > 0) {
                for (const speciesIdStr of speciesWithChances) {
                  const speciesId = parseInt(speciesIdStr, 10);
                  const chance = encounterChanceMap[speciesId];

                if (chance > 0 && Utils.randSeedInt(100) < chance) {
                  enemySpecies = getPokemonSpecies(speciesId);
                  break;
                }
                }
              }
            }
          }
          battle.enemyParty[e] = this.scene.addEnemyPokemon(enemySpecies, level, TrainerSlot.NONE, !!this.scene.getEncounterBossSegments(battle.waveIndex, level, enemySpecies));
          if (this.scene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS && battle.waveIndex < 1001) {
            battle.enemyParty[e].ivs = new Array(6).fill(31);
          }

          const waveIndex = this.scene.gameMode.isNightmare ? battle.waveIndex % 100 : battle.waveIndex;

          if (waveIndex >= (this.scene.gameMode.isChaosMode ? 100 : 40) &&
              !!this.scene.getEncounterBossSegments(waveIndex, level, enemySpecies) &&
              this.scene.currentBattle.battleSpec !== BattleSpec.FINAL_BOSS) {
            const enemyPokemon = battle.enemyParty[e];
            if (enemyPokemon.species.forms.length > 1) {
              let formChance: number;
              if (this.scene.gameMode.isChaosMode) {
                if (this.scene.gameMode.isChaosFTL) {
                  formChance = waveIndex >= 60 ? 70 : 50;
                } else if (this.scene.gameMode.isChaosShort) {
                  formChance = waveIndex >= 120 ? 70 : 50;
                } else {
                  formChance = waveIndex >= 135 ? 70 : 50;
                }
              } else {
                formChance = waveIndex >= 60 ? 70 : 50;
              }
              if (Utils.randSeedInt(100) < formChance) {
                const maxForm = enemyPokemon.species.forms.length - 1;
                if (maxForm > 0) {
                  enemyPokemon.formIndex = Utils.randSeedInt(maxForm) + 1;
                  const spriteId = enemyPokemon.species.getSpriteId(false, enemyPokemon.formIndex);
                  if (!this.scene.textures.exists(`pkmn__${spriteId}`)) {
                    enemyPokemon.formIndex = 0;
                  }
                }
                enemyPokemon.generateName();
                enemyPokemon.updateScale();
                if (enemyPokemon.isGlitchOrSmittyForm()) {
                  enemyPokemon.toggleShadow(false);
                }
              }
            }
          }

          this.scene.getParty().slice(0, !battle.double ? 1 : 2).reverse().forEach(playerPokemon => {
            applyAbAttrs(SyncEncounterNatureAbAttr, playerPokemon, null, false, battle.enemyParty[e]);
          });
        }
      }
      const enemyPokemon = this.scene.getEnemyParty()[e];
      if (e < (battle.double ? 2 : 1) && !battle.trainer?.isDynamicRival) {
        enemyPokemon.setX(-66 + enemyPokemon.getFieldPositionOffset()[0]);
        enemyPokemon.resetSummonData();
      }

      if (!this.loaded) {
        this.scene.gameData.setPokemonSeen(enemyPokemon, true, battle.battleType === BattleType.TRAINER);
      }
        if (!this.loaded) {
        if (battle.battleSpec === BattleSpec.FINAL_BOSS || this.scene.gameMode.isWavePreFinal(this.scene)) {

            if (this.scene.gameMode.isNightmare && battle.waveIndex >= 300) {
              const universalSmittyForms = pokemonFormChanges[Species.NONE] || [];

              if (universalSmittyForms.length > 0) {
                const randomUniversalForm = universalSmittyForms[Utils.randSeedInt(universalSmittyForms.length)];

                const trigger = randomUniversalForm.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                if (trigger) {
                  applyUniversalSmittyForm(trigger.name, enemyPokemon);
                  enemyPokemon.updateScale();
                  enemyPokemon.generateName();
                  enemyPokemon.toggleShadow(false);
                }
              }
            enemyPokemon.updateScale();
          }
          enemyPokemon.setBoss();
          enemyPokemon.initBattleInfo();
        }
        else if (!(battle.waveIndex % 1000)) {
          const bossMBH = this.scene.findModifier(m => m instanceof TurnHeldItemTransferModifier && m.pokemonId === enemyPokemon.id, false) as TurnHeldItemTransferModifier;
          this.scene.removeModifier(bossMBH!);
          bossMBH?.setTransferrableFalse();
          this.scene.addEnemyModifier(bossMBH!);
        }
        }
      totalBst += enemyPokemon.getSpeciesForm().baseTotal;

      if(!battle.trainer?.isDynamicRival) {
        loadEnemyAssets.push(enemyPokemon.loadAssets());
      }

    });

    if (battle.battleType === BattleType.TRAINER && this.scene.dynamicMode?.multiBoss && !this.loaded) {
      const nonBossPokemon = battle.enemyParty.filter(pokemon => !pokemon.isBoss());
      if (nonBossPokemon.length > 0) {
        const randomIndex = Utils.randSeedInt(nonBossPokemon.length);
        const selectedPokemon = nonBossPokemon[randomIndex];
        const bossSegments = this.scene.getEncounterBossSegments(battle.waveIndex, selectedPokemon.level, selectedPokemon.species, true);
        selectedPokemon.setBoss(true, bossSegments);
        selectedPokemon.initBattleInfo();
      }
    }

    if (this.scene.getParty().filter(p => p.isShiny()).length === 6) {
      this.scene.validateAchv(achvs.SHINY_PARTY);
    }

    if (battle.battleType === BattleType.TRAINER) {
      loadEnemyAssets.push(battle.trainer?.loadAssets().then(() => battle.trainer?.initSprite())!);
      if (battle.enemyParty.filter(p => p.isBoss()).length > 1) {
        for (const enemyPokemon of battle.enemyParty) {
          if (enemyPokemon.isBoss() && (!enemyPokemon.isPopulatedFromDataSource && !battle.trainer?.isDynamicRival)) {
            enemyPokemon.setBoss(true, enemyPokemon.bossSegments);
          }
            enemyPokemon.initBattleInfo();
        }
      }
    }

    if (battle.battleType === BattleType.TRAINER && battle.trainer?.isDynamicRival) {
      for (let i = battle.enemyParty.length - 1; i > 0; i--) {
        const j = randSeedInt(i + 1);
        [battle.enemyParty[i], battle.enemyParty[j]] = [battle.enemyParty[j], battle.enemyParty[i]];
      }
      battle.enemyParty.forEach((enemyPokemon, index) => {
        if (index < (battle.double ? 2 : 1)) {
          enemyPokemon.setX(-66 + enemyPokemon.getFieldPositionOffset()[0]);
          enemyPokemon.resetSummonData();
        }
        loadEnemyAssets.push(enemyPokemon.loadAssets());
      });
    }

    Promise.all(loadEnemyAssets).catch(err => { console.error('[ENCOUNTER] Asset load failed:', err); }).then(() => {
      battle.enemyParty.forEach((enemyPokemon, e) => {
        if (e < (battle.double ? 2 : 1)) {
          if (battle.battleType === BattleType.WILD) {
            this.scene.field.add(enemyPokemon);
            battle.seenEnemyPartyMemberIds.add(enemyPokemon.id);
            const playerPokemon = this.scene.getPlayerPokemon();
            if (playerPokemon?.visible && this.scene.field.getIndex(playerPokemon) > -1) {
              this.scene.field.moveBelow(enemyPokemon as Pokemon, playerPokemon);
            }
            if (enemyPokemon.species?.generation === 20 ||
              battle.battleSpec === BattleSpec.FINAL_BOSS) {
              enemyPokemon.setVisible(false);
              enemyPokemon.getSprite().setVisible(false);
              if (enemyPokemon.portalSprite) {
                enemyPokemon.portalSprite.setAlpha(0);
              }
            } else {
              enemyPokemon.tint(0, 0.5);
            }
          } else if (battle.battleType === BattleType.TRAINER) {
            enemyPokemon.setVisible(false);
            const trainerRef = this.scene.currentBattle.trainer;
            if (trainerRef?.isCorrupted || trainerRef?.config.trainerType === TrainerType.SMITTY) {
              trainerRef.setAlpha(0);
              trainerRef.getSprites().forEach(s => s.setPipelineData("hasShadow", false));
            } else {
              trainerRef?.tint(0, 0.5);
            }
          }
          if (battle.double) {
            enemyPokemon.setFieldPosition(e ? FieldPosition.RIGHT : FieldPosition.LEFT);
          }
        }
      });

      if (!this.loaded) {
        regenerateModifierPoolThresholds(this.scene.getEnemyField(), battle.battleType === BattleType.TRAINER ? ModifierPoolType.TRAINER : ModifierPoolType.WILD);
        this.scene.generateEnemyModifiers();
      }

      if (!this.loaded) {
        if (Overrides.DEBUG_SAVE_TRACE) {
          console.debug("[SAVE_TRACE] EncounterPhase battle-start saveAll", {
            autoSaveMode: this.scene.autoSaveMode,
            waveIndex: this.scene.currentBattle?.waveIndex,
            battleTurn: this.scene.currentBattle?.turn,
            encounterInitComplete: this.scene.encounterInitComplete
          });
        }

        this.scene.gameData.saveAll(this.scene, true, this.scene.lastSavePlayTime >= 300).then(success => {
          this.scene.disableMenu = false;
          if (!success && !this.scene.gameData?.lastSaveHitQuota && !this.scene.gameData?.tutorialOnboardActive) {
            return this.scene.reset(true);
          }
          this.doEncounter();
        });
      } else {
        this.doEncounter();
      }
    });
  }

  private hydrateActiveBattlersToField(): void {
    const place = (pokemon: Pokemon, player: boolean, fieldIndex: integer, availableCount: integer) => {
      if (pokemon.isOnField()) {
        if (!pokemon.summonData) {
          pokemon.resetSummonData();
        }
        pokemon.setVisible(true);
        pokemon.getSprite().setVisible(true);
        return;
      }
      if (fieldIndex === 1) {
        pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
      } else {
        const position = !this.scene.currentBattle.double || availableCount === 1 ? FieldPosition.CENTER : FieldPosition.LEFT;
        pokemon.setFieldPosition(position, 0);
      }
      this.scene.add.existing(pokemon);
      this.scene.field.add(pokemon);
      if (!player) {
        const playerPokemon = this.scene.getPlayerPokemon();
        if (playerPokemon?.visible && this.scene.field.getIndex(playerPokemon) > -1) {
          this.scene.field.moveBelow(pokemon as Pokemon, playerPokemon);
        }
        this.scene.currentBattle.seenEnemyPartyMemberIds.add(pokemon.id);
      }
      this.scene.updateModifiers(player);
      this.scene.updateFieldScale();
      pokemon.showInfo();
      pokemon.playAnim();
      pokemon.setVisible(true);
      pokemon.getSprite().setVisible(true);
      if (pokemon.usesCustomFieldSpriteLayout()) {
        pokemon.finalizeSummonSpriteLayout();
      } else {
        pokemon.updateScale();
      }
      this.scene.updateFieldScale();
      pokemon.resetSummonData();
      pokemon.resetTurnData();
    };

    const battle = this.scene.currentBattle;
    const battlerCount = battle?.getBattlerCount?.() ?? (battle?.double ? 2 : 1);
    const party = this.scene.getParty();
    const enemyParty = this.scene.getEnemyParty();
    const availablePartyMembers = party.filter(p => p.isAllowedInBattle()).length;
    const availableEnemyMembers = enemyParty.filter(p => !p.isFainted()).length;

    for (let i = 0; i < Math.min(battlerCount, party.length); i++) {
      const pokemon = party[i];
      if (pokemon) {
        place(pokemon, true, i, availablePartyMembers);
      }
    }
    for (let i = 0; i < Math.min(battlerCount, enemyParty.length); i++) {
      const pokemon = enemyParty[i];
      if (pokemon) {
        place(pokemon, false, i, availableEnemyMembers);
      }
    }

    for (let i = 0; i < Math.min(battlerCount, enemyParty.length); i++) {
      const enemy = enemyParty[i];
      if (enemy && enemy.isFainted() && enemy.isOnField()) {
        this.scene.unshiftPhase(
          new FaintPhase(this.scene, enemy.getBattlerIndex())
        );
      }
    }

    for (const p of [...party, ...enemyParty]) {
      if (p && !p.hp && (!p.status || p.status.effect !== StatusEffect.FAINT)) {
        p.trySetStatus(StatusEffect.FAINT);
      }
    }
  }

  doEncounter() {
    this.scene.clearExplicitBgmKey();
    this.scene.playBgm(this.scene.currentBattle?.getBgmOverride(this.scene) || this.scene.arena?.bgm, true);
    this.scene.updateModifiers(false);
    this.scene.setFieldScale(1);
    for (const pokemon of this.scene.getParty()) {
      if (pokemon) {
        pokemon.resetBattleData();
      }
    }

    if (!this.loaded) {
      this.scene.arena.trySetWeather(getRandomWeatherType(this.scene.arena), false);
    }

    const enemyField = this.scene.getEnemyField();
    this.scene.tweens.add({
      targets: [this.scene.arenaEnemy, this.scene.currentBattle.trainer, enemyField, this.scene.arenaPlayer, this.scene.trainer].flat(),
      x: (_target, _key, value, fieldIndex: integer) => fieldIndex < 2 + (enemyField.length) ? value + 300 : value - 300,
      duration: this.loaded ? (this.scene.gameData.tutorialOnboardActive ? 2000 : 100) : 2000,
      onComplete: () => {
        if (!this.tryOverrideForBattleSpec()) {
          this.doEncounterCommon();
        }
      }
    });
  }

  getEncounterMessage(): string {
    const enemyField = this.scene.getEnemyField();

    if (this.scene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      return i18next.t("battle:bossAppeared", { bossName: getPokemonNameWithAffix(enemyField[0])});
    }

    if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
      if (this.scene.currentBattle.double) {
        return i18next.t("battle:trainerAppearedDouble", { trainerName: this.scene.currentBattle.trainer?.getName(TrainerSlot.NONE, true) });

      } else {
        return i18next.t("battle:trainerAppeared", { trainerName: this.scene.currentBattle.trainer?.getName(TrainerSlot.NONE, true) });
      }
    }

    return enemyField.length === 1
      ? i18next.t("battle:singleWildAppeared", { pokemonName: enemyField[0].getNameToRender() })
      : i18next.t("battle:multiWildAppeared", { pokemonName1: enemyField[0].getNameToRender(), pokemonName2: enemyField[1].getNameToRender() });
  }

  doEncounterCommon(showEncounterMessage: boolean = true) {
    this.scene.ui.setMode(Mode.MESSAGE);
    const enemyField = this.scene.getEnemyField();

    if (this.scene.currentBattle.battleType === BattleType.WILD) {
      const portalPromises: Promise<void>[] = [];
      enemyField.forEach(enemyPokemon => {
        if (enemyPokemon.species?.generation === 20 ||
            this.scene.currentBattle?.battleSpec === BattleSpec.FINAL_BOSS) {
          enemyPokemon.finalizeSummonSpriteLayout();
          if (enemyPokemon.portalSprite) {
            enemyPokemon.portalSprite.setAlpha(0);
          }
          const p = playPortalSummonAnim(this.scene, enemyPokemon).then(() => {
            enemyPokemon.setVisible(true);
            enemyPokemon.getSprite().setVisible(true);
            enemyPokemon.cry();
            enemyPokemon.showInfo();
            if (enemyPokemon.usesCustomFieldSpriteLayout()) {
              enemyPokemon.finalizeSummonSpriteLayout();
            }
            if (enemyPokemon.isShiny()) {
              this.scene.validateAchv(achvs.SEE_SHINY);
            }
          });
          portalPromises.push(p);
        } else {
          enemyPokemon.untint(100, "Sine.easeOut");
          enemyPokemon.cry();
          enemyPokemon.showInfo();
          if (enemyPokemon.usesCustomFieldSpriteLayout()) {
            enemyPokemon.finalizeSummonSpriteLayout();
          }
          if (enemyPokemon.isShiny()) {
            this.scene.validateAchv(achvs.SEE_SHINY);
          }
        }
      });
      this.scene.updateFieldScale();
      this.scene.currentBattle.started = true;
      if (portalPromises.length > 0) {
        Promise.all(portalPromises).then(() => {
          if (showEncounterMessage && !this.loaded) {
            this.scene.ui.showText(this.getEncounterMessage(), null, () => this.end(), 1500);
          } else {
            this.end();
          }
        });
      } else if (showEncounterMessage && !this.loaded) {
        this.scene.ui.showText(this.getEncounterMessage(), null, () => this.end(), 1500);
      } else {
        this.end();
      }
    } else if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
      const trainer = this.scene.currentBattle.trainer;
      let trainerPortalDone: Promise<void> = Promise.resolve();

      const isSmittyTrainer = trainer?.config.trainerType === TrainerType.SMITTY;
      if (trainer?.isCorrupted || isSmittyTrainer) {
        trainer.setAlpha(0);
        const portalYOffset = isSmittyTrainer ? 15 : 10;
        const portalSpr = this.scene.add.sprite(trainer.x + 6, trainer.y + portalYOffset, "yu_portal_7");
        portalSpr.setOrigin(0.5, 1);
        portalSpr.setVisible(false);
        portalSpr.setScale(DUELMON_PORTAL_WORLD_SCALE * 0.9);
        this.scene.field.add(portalSpr);
        this.scene.field.moveBelow(portalSpr, trainer);
        trainer.portalSprite = portalSpr;
        trainerPortalDone = playTrainerPortalSummonAnim(this.scene, trainer, portalSpr).then(() => {
          trainer.untint(100, "Sine.easeOut");
        });
      } else {
        trainer?.untint(100, "Sine.easeOut");
      }

      const proceedAfterPortal = () => {
        if (!this.scene.currentBattle.trainer?.config.hasCharSprite) {
          if (!trainer?.isCorrupted && trainer?.config.trainerType !== TrainerType.SMITTY) {
            trainer?.playAnim();
          }
        }

        const doSummon = () => {
          this.scene.currentBattle.started = true;
          this.scene.playBgm(undefined);
          this.scene.pbTray.showPbTray(this.scene.getParty());
          this.scene.pbTrayEnemy.showPbTray(this.scene.getEnemyParty());
          const doTrainerSummon = () => {
            this.hideEnemyTrainer();
            const availablePartyMembers = this.scene.getEnemyParty().filter(p => !p.isFainted()).length;
            if (this.scene.currentBattle.double && availablePartyMembers > 1) {
              this.scene.unshiftPhase(new SummonPhase(this.scene, 1, false));
            }
            this.scene.unshiftPhase(new SummonPhase(this.scene, 0, false));
            this.end();
          };
          if (showEncounterMessage && !this.loaded) {
            this.scene.ui.showText(this.getEncounterMessage(), null, doTrainerSummon, 1500, true);
          } else {
            doTrainerSummon();
          }
        };

        if (this.loaded) {
          if (this.scene.gameData.tutorialOnboardActive && this.scene.currentBattle.trainer) {
            const trainer = this.scene.currentBattle.trainer;
            const tutorialMessage = "dialogue:tutorial_blue.encounter.1";
            const afterDialogue = () => {
              const cb = this.scene.gameData.tutorialStarterSelectCallback;
              if (cb) {
                this.scene.gameData.tutorialStarterSelectCallback = null;
                cb();
                this.end();
                return;
              }
              doSummon();
            };
            if (trainer.config.hasCharSprite) {
              (async () => {

                this.scene.ui.getMessageHandler().clear();
                this.scene.ui.getMessageHandler().clearText();
                await trainer.playAnim();
                this.scene.ui.getMessageHandler().applySmitomPanelStyle();
                this.scene.showFieldOverlay(500, { withDialogueBg: true, bgTextureKey: "smitom_dialogue_bg" }).then(() => {
                  this.scene.charSprite.showCharacter(trainer.getKey()!, getCharVariantFromDialogue(tutorialMessage)).then(() => {
                    this.scene.ui.showDialogue(tutorialMessage, trainer.getName(TrainerSlot.NONE, true), null, () => {
                      this.scene.ui.getMessageHandler().hideNameText();
                      const glitchPromise = this.scene.ui.getMessageHandler().glitchOutDialogue(350);
                      glitchPromise.then(() => {
                        this.scene.ui.showMessageChrome();
                        this.scene.ui.clearText();
                        this.scene.ui.getMessageHandler().restoreDefaultPanelStyle();
                      });
                      Promise.all([
                        glitchPromise,
                        this.scene.charSprite.hide(),
                        this.scene.hideFieldOverlay(750),
                      ]).then(() => {
                        afterDialogue();
                      });
                    });
                  });
                });
              })();
            } else {
              this.scene.ui.showDialogue(tutorialMessage, trainer.getName(TrainerSlot.NONE, true), null, () => {
                afterDialogue();
              });
            }
            return;
          }
          doSummon();
          return;
        }

        const proceedToDialogue = () => {
          const encounterMessages = this.scene.currentBattle.trainer?.getEncounterMessages();

          if (!encounterMessages?.length) {
            doSummon();
          } else {
            let message: string;
            this.scene.executeWithSeedOffset(() => message = Utils.randSeedItem(encounterMessages), this.scene.currentBattle.waveIndex);
            message = message!;
            if (this.scene.currentBattle.trainer?.config.hasCharSprite && !this.scene.ui.shouldSkipDialogue(message)) {
              const showDialogueAndSummon = () => {
                this.scene.ui.showDialogue(message, trainer?.getName(TrainerSlot.NONE, true), null, () => {
                  this.scene.ui.getMessageHandler().hideNameText();
                  const glitchPromise = this.scene.ui.getMessageHandler().glitchOutDialogue(350);
                  glitchPromise.then(() => {
                    this.scene.ui.showMessageChrome();
                    this.scene.ui.clearText();
                    this.scene.ui.getMessageHandler().restoreDefaultPanelStyle();
                  });
                  Promise.all([
                    glitchPromise,
                    this.scene.charSprite.hide(),
                    this.scene.hideFieldOverlay(750),
                  ]).then(() => {
                    doSummon();
                  });
                });
              };
              (async () => {
                this.scene.ui.getMessageHandler().clear();
                this.scene.ui.getMessageHandler().clearText();
                if (trainer && trainer.config.trainerType != TrainerType.SMITTY) {
                  await trainer.playAnim();
                }
                this.scene.ui.getMessageHandler().applySmitomPanelStyle();
                this.scene.showFieldOverlay(500, { withDialogueBg: true, bgTextureKey: "smitom_dialogue_bg" })
                  .then(() => {
                      if(trainer.config.trainerType == TrainerType.SMITTY) {
                        return this.scene.charSprite.showCharacter("smitty_trainers", `${trainer?.config.smittyVariantIndex+1}`);
                      }
                      else {
                        return this.scene.charSprite.showCharacter(trainer?.getKey()!, getCharVariantFromDialogue(encounterMessages[0]));
                      }
                  }).then(() => showDialogueAndSummon());
              })();
            } else {
              this.scene.ui.showDialogue(message, trainer?.getName(TrainerSlot.NONE, true), null, () => {
                doSummon();
              });
            }
          }
        };

        if (isSmittyTrainer) {
          const smitFlags = this.scene.gameData.smitomTutorialFlags;
          if (DEBUG_FORCE_SMITOM_TUTORIAL && !EncounterPhase._smitomSmittyDebugShown) {
            EncounterPhase._smitomSmittyDebugShown = true;
            smitFlags["smitty_encounter"] = false;
          }
          if (this.scene.gameData.tutorialOnboardActive || !smitFlags["smitty_encounter"]) {
            const tipConfig: SmitomTipConfig = {
              tutorialKey: "smitty_encounter",
              title: i18next.t("tutorial:smitomTip.smittyEncounter.title"),
              texts: [
                i18next.t("tutorial:smitomTip.smittyEncounter.1"),
                i18next.t("tutorial:smitomTip.smittyEncounter.2"),
              ],
              offerReplay: false,
              onComplete: () => {
                if (!this.scene.gameData.tutorialOnboardActive) {
                  this.scene.gameData.smitomTutorialFlags["smitty_encounter"] = true;
                  this.scene.gameData.saveSystem();
                }
                proceedToDialogue();
              },
            };
            this.scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
            return;
          }
        }

        proceedToDialogue();
      };

      trainerPortalDone.then(() => proceedAfterPortal());
    }
  }

  end() {
    const enemyField = this.scene.getEnemyField();

    enemyField.forEach((enemyPokemon, e) => {
      if (enemyPokemon.isShiny()) {
        this.scene.unshiftPhase(new ShinySparklePhase(this.scene, BattlerIndex.ENEMY + e));
      }
    });

    if (this.scene.currentBattle.battleType !== BattleType.TRAINER) {
      enemyField.map(p => this.scene.pushConditionalPhase(new PostSummonPhase(this.scene, p.getBattlerIndex()), () => {

        if (!this.scene.getParty()?.length) {
          return false;
        }

        const pokemonsOnFieldCount = this.scene.getParty().filter(p => p.isOnField()).length;

        const requiredPokemonsOnField = Math.min(this.scene.getParty().filter((p) => !p.isFainted()).length, 2);

        if (!this.scene.currentBattle) {
          return true;
        }
        if (this.scene.currentBattle.double) {
          return pokemonsOnFieldCount === requiredPokemonsOnField;
        }
        return pokemonsOnFieldCount === 1;
      }));
      const ivScannerModifier = this.scene.findModifier(m => m instanceof IvScannerModifier);
      if (ivScannerModifier) {
        enemyField.map(p => this.scene.pushPhase(new ScanIvsPhase(this.scene, p.getBattlerIndex(), Math.min(ivScannerModifier.getStackCount() * 2, 6))));
      }
    }

    if (this.scene.debugGauntletAutoCycle && !this.scene.getParty()?.length) {
      import("./command-phase").then(({ CommandPhase }) => {
        this.scene.pushPhase(new CommandPhase(this.scene, 0));
        handleTutorial(this.scene, Tutorial.Access_Menu).then(() => super.end());
      });
      return;
    }

    const availablePartyMembers = this.scene.getParty().filter(p => p.isAllowedInBattle());

    const isTutorialPreStarter = this.scene.gameData.tutorialOnboardActive
      && this.loaded
      && this.scene.gameData.tutorialBattleScript?.playerStarterSpecies === null;

    if (!isTutorialPreStarter && availablePartyMembers.length > 0 && !availablePartyMembers[0].isOnField()) {
      this.scene.pushPhase(new SummonPhase(this.scene, 0));
    }

    if (this.scene.currentBattle.double) {
      if (availablePartyMembers.length > 1) {
        this.scene.pushPhase(new ToggleDoublePositionPhase(this.scene, true));
        if (!availablePartyMembers[1].isOnField()) {
          this.scene.pushPhase(new SummonPhase(this.scene, 1));
        }
      }
    } else {
      if (availablePartyMembers.length > 1 && availablePartyMembers[1].isOnField()) {
        const ReturnPhase = getReturnPhase();
        this.scene.pushPhase(new ReturnPhase(this.scene, 1));
      }
      this.scene.pushPhase(new ToggleDoublePositionPhase(this.scene, false));
    }

    if (!this.loaded) {
      if (this.scene.gameMode.isNuzlockeActive(this.scene) || !this.scene.gameMode.hasShopCheck(this.scene) || this.scene.currentBattle.battleType !== BattleType.TRAINER && (this.scene.currentBattle.waveIndex > 1 || !this.scene.gameMode.isDaily)) {
        const minPartySize = this.scene.currentBattle.double ? 2 : 1;
        if (availablePartyMembers.length > minPartySize) {
          this.scene.pushPhase(new CheckSwitchPhase(this.scene, 0, this.scene.currentBattle.double));
          if (this.scene.currentBattle.double) {
            this.scene.pushPhase(new CheckSwitchPhase(this.scene, 1, this.scene.currentBattle.double));
          }
        }
      }
    }
    handleTutorial(this.scene, Tutorial.Access_Menu).then(() => super.end());

    if (!this.scene.gameData.tutorialOnboardActive) {
      if (this.scene.currentBattle.waveIndex === 1) {
        ShowRewards(this.scene);
        ShowRewards(this.scene);
        ShowRewards(this.scene);
      }
      else {
        ShowRewards(this.scene, 20, false);
      }
    }
  }

  tryOverrideForBattleSpec(): boolean {
    if (this.scene.gameMode.isWavePreFinal(this.scene, this.scene.currentBattle.waveIndex)) {
      if (this.loaded) {
        this.doEncounterCommon(false);
        return true;
      }

      this.scene.ui.setMode(Mode.MESSAGE);
      const enemyField = this.scene.getEnemyField();
      const portalPromises: Promise<void>[] = [];

      enemyField.forEach(enemyPokemon => {
        if (enemyPokemon.species?.generation === 20 ||
            this.scene.currentBattle?.battleSpec === BattleSpec.FINAL_BOSS) {
          enemyPokemon.finalizeSummonSpriteLayout();
          if (enemyPokemon.portalSprite) {
            enemyPokemon.portalSprite.setAlpha(0);
          }
          const p = playPortalSummonAnim(this.scene, enemyPokemon).then(() => {
            enemyPokemon.setVisible(true);
            enemyPokemon.getSprite().setVisible(true);
            enemyPokemon.cry();
            enemyPokemon.showInfo();
            if (enemyPokemon.usesCustomFieldSpriteLayout()) {
              enemyPokemon.finalizeSummonSpriteLayout();
            }
            if (enemyPokemon.isShiny()) {
              this.scene.validateAchv(achvs.SEE_SHINY);
            }
          });
          portalPromises.push(p);
        }
      });

      this.scene.updateFieldScale();
      this.scene.currentBattle.started = true;

      const showBossDialogue = () => {
        const enemy = this.scene.getEnemyPokemon();
        this.scene.ui.showText(this.getEncounterMessage(), null, () => {
          const variantIndex = this.scene.currentBattle.finalBossDialogueVariant ?? 0;
          const localizationKey = `battleSpecDialogue:encounter_${variantIndex}`;
          if (this.scene.ui.shouldSkipDialogue(localizationKey)) {
            this.end();
          } else {
            const count = this.scene.gameData.gameStats.sessionsPlayed;
            const ordinalUsed = !i18next.exists(localizationKey, {fallbackLng: []}) || i18next.resolvedLanguage === "en" ? i18next.t("battleSpecDialogue:key", { count: count, ordinal: true }) : "";
            const cycleCount = count.toLocaleString() + ordinalUsed;
            const genderIndex = this.scene.gameData.gender ?? PlayerGender.UNSET;
            const genderStr = PlayerGender[genderIndex].toLowerCase();
            const encounterDialogue = i18next.t(localizationKey, { context: genderStr, cycleCount: cycleCount });
            if (!this.scene.gameData.getSeenDialogues()[localizationKey]) {
              this.scene.gameData.saveSeenDialogue(localizationKey);
            }
            this.scene.ui.showDialogue(encounterDialogue, enemy?.species.name, null, () => {
              this.end();
            });
          }
        }, 1500, true);
      };

      if (portalPromises.length > 0) {
        Promise.all(portalPromises).then(() => showBossDialogue());
      } else {
        showBossDialogue();
      }

      return true;
    }
    return false;
  }

  addRandomTeraModifierToPlayer(): boolean {
    const party = this.scene.getParty();
  if (party.length === 0) return false;

  const nonTerastallizedPokemon = party.filter(pokemon => !pokemon.isTerastallized());

  if (nonTerastallizedPokemon.length === 0) return false;

  const randomPokemon = Utils.randSeedItem(nonTerastallizedPokemon);
    const pokemonTypes = randomPokemon.getTypes();
    const randomType = Utils.randSeedItem(pokemonTypes);

    const teraModifier = modifierTypes.TERA_SHARD().generateType([], [randomType])!
        .withIdFromFunc(modifierTypes.TERA_SHARD)
        .newModifier(randomPokemon) as PersistentModifier;

    this.scene.addModifier(teraModifier);
  return true;
  }
}