import BattleScene from "#app/battle-scene";
import { BattleType, BattlerIndex } from "#app/battle";
import { applyAbAttrs, SyncEncounterNatureAbAttr } from "#app/data/ability";
import { getCharVariantFromDialogue } from "#app/data/dialogue";
import { TrainerSlot } from "#app/data/trainer-config";
import { getRandomWeatherType } from "#app/data/weather";
import { BattleSpec } from "#app/enums/battle-spec";
import { PlayerGender } from "#app/enums/player-gender";
import { Species } from "#app/enums/species";
import { EncounterPhaseEvent } from "#app/events/battle-scene";
import Pokemon, { FieldPosition } from "#app/field/pokemon";
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
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import * as Utils from "#app/utils";
import { CheckSwitchPhase } from "./check-switch-phase";
import { GameOverPhase } from "./game-over-phase";
import { PostSummonPhase } from "./post-summon-phase";
import { ReturnPhase } from "./return-phase";
import { ScanIvsPhase } from "./scan-ivs-phase";
import { ShinySparklePhase } from "./shiny-sparkle-phase";
import { SummonPhase } from "./summon-phase";
import { ToggleDoublePositionPhase } from "./toggle-double-position-phase";
import {ShowRewards} from "#app/phases/select-modifier-phase";
import {TrainerType} from "#enums/trainer-type";
import {randSeedInt} from "#app/utils";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {PermaType} from "#app/modifier/perma-modifiers";
import {PokeballType} from "#enums/pokeball";
import {isNonQuestBountyModifier, QuestUnlockables} from "#app/system/game-data";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import {applyUniversalSmittyForm, pokemonFormChanges, SmittyFormTrigger} from "#app/data/pokemon-forms";
import { GameDataType } from "#enums/game-data-type";

export class EncounterPhase extends BattlePhase {
  protected loaded: boolean;

  constructor(scene: BattleScene, loaded?: boolean) {
    super(scene);
    this.loaded = !!loaded;
  }

  start() {
    super.start();

    this.scene.updateGameInfo();

    this.scene.initSession();

    this.scene.eventTarget.dispatchEvent(new EncounterPhaseEvent());

    if (this.scene.gameMode.isClassic && this.scene.currentBattle.waveIndex > 90) {
      this.scene.unshiftPhase(new GameOverPhase(this.scene));
    }

    const loadEnemyAssets: Promise<void>[] = [];

    const battle = this.scene.currentBattle;

    let totalBst = 0;

    if(this.loaded) {
      this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
      this.scene.currentBattle.initBattleSpec();
    }
    else {
      if (battle.waveIndex > 1) {
        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaWaveCheckQuestModifier && !(m instanceof PermaCountdownWaveCheckQuestModifier))
            .forEach(modifier => modifier.apply([this.scene, this.scene]));

        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaCountdownWaveCheckQuestModifier)
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
          battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!; // TODO:: is the bang correct here?
        } else {
          const enemySpecies = this.scene.randomSpecies(battle.waveIndex, level, true);
          battle.enemyParty[e] = this.scene.addEnemyPokemon(enemySpecies, level, TrainerSlot.NONE, !!this.scene.getEncounterBossSegments(battle.waveIndex, level, enemySpecies));
          if (this.scene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
            battle.enemyParty[e].ivs = new Array(6).fill(31);
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
          // enemyPokemon.formIndex = 1;
          // if(enemyPokemon.isGlitchOrSmittyForm()) {
            // enemyPokemon.toggleShadow(false);
          // }
          // enemyPokemon.updateScale();
          const bossMBH = this.scene.findModifier(m => m instanceof TurnHeldItemTransferModifier && m.pokemonId === enemyPokemon.id, false) as TurnHeldItemTransferModifier;
          this.scene.removeModifier(bossMBH!);
          bossMBH?.setTransferrableFalse();
          this.scene.addEnemyModifier(bossMBH!);
        }
      // }

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
      loadEnemyAssets.push(battle.trainer?.loadAssets().then(() => battle.trainer?.initSprite())!); // TODO: is this bang correct?
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

    Promise.all(loadEnemyAssets).then(() => {
      battle.enemyParty.forEach((enemyPokemon, e) => {
        if (e < (battle.double ? 2 : 1)) {
          if (battle.battleType === BattleType.WILD) {
            this.scene.field.add(enemyPokemon);
            battle.seenEnemyPartyMemberIds.add(enemyPokemon.id);
            const playerPokemon = this.scene.getPlayerPokemon();
            if (playerPokemon?.visible) {
              this.scene.field.moveBelow(enemyPokemon as Pokemon, playerPokemon);
            }
            enemyPokemon.tint(0, 0.5);
          } else if (battle.battleType === BattleType.TRAINER) {
            enemyPokemon.setVisible(false);
            this.scene.currentBattle.trainer?.tint(0, 0.5);
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

      this.scene.ui.setMode(Mode.MESSAGE).then(() => {
        if (!this.loaded) {
          //@ts-ignore
          this.scene.gameData.saveAll(this.scene, true, this.scene.lastSavePlayTime >= 300).then(success => { // TODO: get rid of ts-ignore
            this.scene.disableMenu = false;

            if (!success) {
              return this.scene.reset(true);
            }
            this.doEncounter();
          });
        } else {
          this.doEncounter();
        }
      });
    });
  }

  doEncounter() {
    this.scene.playBgm(undefined, true);
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
      duration: 2000,
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
    const enemyField = this.scene.getEnemyField();

    if (this.scene.currentBattle.battleType === BattleType.WILD) {
      enemyField.forEach(enemyPokemon => {
        enemyPokemon.untint(100, "Sine.easeOut");
        enemyPokemon.cry();
        enemyPokemon.showInfo();
        if (enemyPokemon.isShiny()) {
          this.scene.validateAchv(achvs.SEE_SHINY);
        }
      });
      this.scene.updateFieldScale();
      if (showEncounterMessage) {
        this.scene.ui.showText(this.getEncounterMessage(), null, () => this.end(), 1500);
      } else {
        this.end();
      }
    } else if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
      const trainer = this.scene.currentBattle.trainer;
      trainer?.untint(100, "Sine.easeOut");
      
      // Only play animation immediately if we don't have a character sprite
      if (!this.scene.currentBattle.trainer?.config.hasCharSprite) {
        trainer?.playAnim();
      }
      
      const doSummon = () => {
        this.scene.currentBattle.started = true;
        this.scene.playBgm(undefined);
        this.scene.pbTray.showPbTray(this.scene.getParty());
        this.scene.pbTrayEnemy.showPbTray(this.scene.getEnemyParty());
        const doTrainerSummon = () => {
          this.hideEnemyTrainer();
          const availablePartyMembers = this.scene.getEnemyParty().filter(p => !p.isFainted()).length;
          this.scene.unshiftPhase(new SummonPhase(this.scene, 0, false));
          if (this.scene.currentBattle.double && availablePartyMembers > 1) {
            this.scene.unshiftPhase(new SummonPhase(this.scene, 1, false));
          }
          this.end();
        };
        if (showEncounterMessage) {
          this.scene.ui.showText(this.getEncounterMessage(), null, doTrainerSummon, 1500, true);
        } else {
          doTrainerSummon();
        }
      };

      const encounterMessages = this.scene.currentBattle.trainer?.getEncounterMessages();

      if (!encounterMessages?.length) {
        doSummon();
      } else {
        let message: string;
        this.scene.executeWithSeedOffset(() => message = Utils.randSeedItem(encounterMessages), this.scene.currentBattle.waveIndex);
        message = message!;
        const showDialogueAndSummon = () => {
          this.scene.ui.showDialogue(message, trainer?.getName(TrainerSlot.NONE, true), null, () => {
            this.scene.charSprite.hide().then(() => this.scene.hideFieldOverlay(250).then(() => doSummon()));
          });
        };
        
        if (this.scene.currentBattle.trainer?.config.hasCharSprite && !this.scene.ui.shouldSkipDialogue(message)) {
          // For trainers with character sprites, wait for animation to complete before showing overlay
          (async () => {
            if (trainer && trainer.config.trainerType != TrainerType.SMITTY) {
              await trainer.playAnim(); // Play and wait for animation here
            }
            this.scene.showFieldOverlay(500)
              .then(() => {
                  if(trainer.config.trainerType == TrainerType.SMITTY) {
                    this.scene.charSprite.showCharacter("smitty_trainers", `${trainer?.config.smittyVariantIndex+1}`);
                  }
                  else {
                    this.scene.charSprite.showCharacter(trainer?.getKey()!, getCharVariantFromDialogue(encounterMessages[0]));
                  }
              }).then(() => showDialogueAndSummon());
          })();
        } else {
          showDialogueAndSummon();
        }
      }
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
        // if there is not a player party, we can't continue
        if (!this.scene.getParty()?.length) {
          return false;
        }
        // how many player pokemon are on the field ?
        const pokemonsOnFieldCount = this.scene.getParty().filter(p => p.isOnField()).length;
        // if it's a 2vs1, there will never be a 2nd pokemon on our field even
        const requiredPokemonsOnField = Math.min(this.scene.getParty().filter((p) => !p.isFainted()).length, 2);
        // if it's a double, there should be 2, otherwise 1
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

    if (!this.loaded) {
      const availablePartyMembers = this.scene.getParty().filter(p => p.isAllowedInBattle());

      if (!availablePartyMembers[0].isOnField()) {
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
          this.scene.pushPhase(new ReturnPhase(this.scene, 1));
        }
        this.scene.pushPhase(new ToggleDoublePositionPhase(this.scene, false));
      }

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

    if (this.scene.currentBattle.waveIndex === 1) {
      ShowRewards(this.scene);
      ShowRewards(this.scene);
      ShowRewards(this.scene);
    }
    else {
      ShowRewards(this.scene);
    }
  }

  tryOverrideForBattleSpec(): boolean {
    if (this.scene.gameMode.isWavePreFinal(this.scene, this.scene.currentBattle.waveIndex)) {
      const enemy = this.scene.getEnemyPokemon();
      this.scene.ui.showText(this.getEncounterMessage(), null, () => {
        const localizationKey = "battleSpecDialogue:encounter";
        if (this.scene.ui.shouldSkipDialogue(localizationKey)) {
          // Logging mirrors logging found in dialogue-ui-handler
          console.log(`Dialogue ${localizationKey} skipped`);
          this.doEncounterCommon(false);
        } else {
          const count = 821093 + this.scene.gameData.gameStats.sessionsPlayed;
          // The line below checks if an English ordinal is necessary or not based on whether an entry for encounterLocalizationKey exists in the language or not.
          const ordinalUsed = !i18next.exists(localizationKey, {fallbackLng: []}) || i18next.resolvedLanguage === "en" ? i18next.t("battleSpecDialogue:key", { count: count, ordinal: true }) : "";
          const cycleCount = count.toLocaleString() + ordinalUsed;
          const genderIndex = this.scene.gameData.gender ?? PlayerGender.UNSET;
          const genderStr = PlayerGender[genderIndex].toLowerCase();
          const encounterDialogue = i18next.t(localizationKey, { context: genderStr, cycleCount: cycleCount });
          if (!this.scene.gameData.getSeenDialogues()[localizationKey]) {
            this.scene.gameData.saveSeenDialogue(localizationKey);
          }
          this.scene.ui.showDialogue(encounterDialogue, enemy?.species.name, null, () => {
            this.doEncounterCommon(false);
          });
        }
      }, 1500, true);
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
