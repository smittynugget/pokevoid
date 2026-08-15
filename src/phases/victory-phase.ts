import BattleScene, { RecoveryBossMode } from "../battle-scene.js";
import {BATTLE_WAVES, BattlerIndex, BattleType, majorBossWaves, setupFixedBattlePaths, PathNodeType} from "../battle.js";
import {modifierTypes, nuzlightUnlockQuestModifier, nuzlockeUnlockQuestModifier} from "../modifier/modifier-type.js";
import { ExpShareModifier, ExpBalanceModifier, MultipleParticipantExpBonusModifier, PokemonExpBoosterModifier, PermaRivalWinQuestModifier, PermaBeatTrainerQuestModifier, PermaWinQuestModifier, PersistentModifier} from "../modifier/modifier.js";
import * as Utils from "../utils.js";
import Overrides from "../overrides";
import { BattleEndPhase } from "./battle-end-phase";
import { NewBattlePhase } from "./new-battle-phase";
import {PokemonPhase} from "./pokemon-phase";
import { AddEnemyBuffModifierPhase } from "./add-enemy-buff-modifier-phase";
import { EggLapsePhase } from "./egg-lapse-phase";
import { ExpPhase } from "./exp-phase";
import {GameOverPhase} from "./game-over-phase";
import { ModifierRewardPhase } from "./modifier-reward-phase";
import { SelectModifierPhase } from "./select-modifier-phase";
import { ShowRewards } from "#app/utils/show-rewards.js";
import { ShowPartyExpBarPhase } from "./show-party-exp-bar-phase";
import { TrainerVictoryPhase } from "./trainer-victory-phase";
import { TutorialBlueDefeatPhase } from "./tutorial-blue-defeat-phase";
import {TrainerType} from "#enums/trainer-type";
import {GameModes} from "../game-mode";
import { SelectNightmareDraftPhase } from "./select-nightmare-draft-phase";
import { SelectPermaModifierPhase } from "./select-perma-modifier-phase";
import { UnlockUniSmittyPhase } from "./unlock-unismitty-phase";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase";
import {RewardObtainedType, type RewardConfig} from "#app/ui/reward-obtained-ui-handler";
import { isRogueMode } from "#app/game-mode";
import i18next from "i18next";
import {QuestUnlockPhase} from "#app/phases/quest-unlock-phase";
import {QuestState, QuestUnlockables} from "#app/system/game-data";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import {Unlockables} from "#app/system/unlockables";
import {UnlockPhase} from "#app/phases/unlock-phase";
import {pokemonEvolutions} from "#app/data/pokemon-evolutions";
import {getAllRivalTrainerTypes} from "#app/data/trainer-config";
import {GameOverModifierRewardPhase} from "#app/phases/game-over-modifier-reward-phase";
import {achvs} from "#app/system/achv";
import {RibbonModifierRewardPhase} from "#app/phases/ribbon-modifier-reward-phase";
import Pokemon from "#app/field/pokemon";
import PokemonSpecies, {getPokemonSpecies, universalSmittyForms} from "#app/data/pokemon-species";
import {PathNodeTypeFilter} from "#app/modifier/modifier-type";
import { BattlePathPhase } from "./battle-path-phase";

import { PathNodeContext } from "#app/battle";
import { SkillPointSources } from "#app/system/skill-point-sources";
import { HallOfFamePhase } from "./hall-of-fame-phase";
import { SlideshowCutscenePhase } from "./slideshow-cutscene-phase.js";
import { loggedInUser } from "#app/account.js";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { TitlePhase } from "./title-phase";

export class VictoryPhase extends PokemonPhase {

  private firstRibbons: PokemonSpecies[] = [];

  constructor(scene: BattleScene, battlerIndex: BattlerIndex) {
    super(scene, battlerIndex);
  }

  start() {
    super.start();
    this.scene._inBattleTurn = false;

    if (this.scene.gameMode.isTestMod) {
      this.scene.unshiftPhase(new GameOverPhase(this.scene, false));
      this.end();
      return;
    }

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

    const unresolvedPlayerFaint = this.scene.getField(true).some(p => p && p.isPlayer() && p.hp <= 0 && !p.isFainted(true));
    if (unresolvedPlayerFaint) {
      this.scene.pushPhase(new VictoryPhase(this.scene, this.battlerIndex));
      this.end();
      return;
    }

    this.scene.gameData.gameStats.pokemonDefeated++;

    const defeatedPokemon = this.getPokemon();
    this.scene.recordRunEndSummaryDefeat(defeatedPokemon);
    if (this.scene.selectedNodeType === PathNodeType.MAJOR_BOSS_BATTLE || this.scene.selectedNodeType === PathNodeType.CHALLENGE_BOSS) {
      this.scene.recordRunEndSummaryMajorBossDefeat(this.scene.currentBattle.waveIndex, defeatedPokemon.species.speciesId);
    }
    if (defeatedPokemon.isGlitchForm()) {
      this.scene.gameData.gameStats.glitchFormsDefeated++;
    }
    if (defeatedPokemon.isSmittyForm()) {
      this.scene.gameData.gameStats.smittyFormsDefeated++;
    }

    const participantIds = this.scene.currentBattle.playerParticipantIds;
    const party = this.scene.getParty();
    const expShareModifier = this.scene.findModifier(m => m instanceof ExpShareModifier) as ExpShareModifier;
    const expBalanceModifier = this.scene.findModifier(m => m instanceof ExpBalanceModifier) as ExpBalanceModifier;
    const multipleParticipantExpBonusModifier = this.scene.findModifier(m => m instanceof MultipleParticipantExpBonusModifier) as MultipleParticipantExpBonusModifier;
    const nonFaintedPartyMembers = party.filter(p => p.hp);
    const expPartyMembers = nonFaintedPartyMembers.filter(p => p.level < this.scene.getMaxExpLevel());
    const partyMemberExp: number[] = [];

    if (participantIds.size) {
      let expValue = this.getPokemon().getExpValue();
      if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
        expValue = Math.floor(expValue * 1.5);
      }
      for (const partyMember of nonFaintedPartyMembers) {
        const pId = partyMember.id;
        const participated = participantIds.has(pId);
        if (participated) {
          partyMember.addFriendship(6);
        }
        if (!expPartyMembers.includes(partyMember)) {
          continue;
        }
        if (!participated && !expShareModifier) {
          partyMemberExp.push(0);
          continue;
        }
        let expMultiplier = 0;
        if (participated) {
          expMultiplier += (1 / participantIds.size);
          if (participantIds.size > 1 && multipleParticipantExpBonusModifier) {
            expMultiplier += multipleParticipantExpBonusModifier.getStackCount() * 0.2;
          }
        } else if (expShareModifier) {
          expMultiplier += (expShareModifier.getStackCount() * 0.2) / participantIds.size;
        }
        if (partyMember.pokerus) {
          expMultiplier *= 1.5;
        }
        if (Overrides.XP_MULTIPLIER_OVERRIDE !== null) {
          expMultiplier = Overrides.XP_MULTIPLIER_OVERRIDE;
        }
        const pokemonExp = new Utils.NumberHolder(expValue * expMultiplier);
        this.scene.applyModifiers(PokemonExpBoosterModifier, true, partyMember, pokemonExp);
        partyMemberExp.push(Math.floor(pokemonExp.value));
      }

      if (expBalanceModifier) {
        let totalLevel = 0;
        let totalExp = 0;
        expPartyMembers.forEach((expPartyMember, epm) => {
          totalExp += partyMemberExp[epm];
          totalLevel += expPartyMember.level;
        });

        const medianLevel = Math.floor(totalLevel / expPartyMembers.length);

        const recipientExpPartyMemberIndexes: number[] = [];
        expPartyMembers.forEach((expPartyMember, epm) => {
          if (expPartyMember.level <= medianLevel) {
            recipientExpPartyMemberIndexes.push(epm);
          }
        });

        const splitExp = Math.floor(totalExp / recipientExpPartyMemberIndexes.length);

        expPartyMembers.forEach((_partyMember, pm) => {
          partyMemberExp[pm] = Phaser.Math.Linear(partyMemberExp[pm], recipientExpPartyMemberIndexes.indexOf(pm) > -1 ? splitExp : 0, 0.2 * expBalanceModifier.getStackCount());
        });
      }

      for (let pm = 0; pm < expPartyMembers.length; pm++) {
        const exp = partyMemberExp[pm];

        if (exp) {
          const partyMemberIndex = party.indexOf(expPartyMembers[pm]);
          this.scene.unshiftPhase(expPartyMembers[pm].isOnField() ? new ExpPhase(this.scene, partyMemberIndex, exp) : new ShowPartyExpBarPhase(this.scene, partyMemberIndex, exp));
        }
      }
    }

    if (!this.scene.getEnemyParty().find(p => this.scene.currentBattle.battleType ? !p?.isFainted() : p.isOnField())) {
      this.scene.pushPhase(new BattleEndPhase(this.scene));
      if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
        if (this.scene.gameData.tutorialOnboardActive) {
          this.scene.unshiftPhase(new TutorialBlueDefeatPhase(this.scene));
          this.end();
          return;
        }
        this.scene.unshiftPhase(new TrainerVictoryPhase(this.scene));
      }
      let trainerIsRival = this.scene.currentBattle.trainer != undefined ? this.scene.currentBattle.trainer.isDynamicRival : false;
      if (trainerIsRival) {
        this.scene.gameData.permaModifiers.findModifiers(m =>
            m instanceof PermaBeatTrainerQuestModifier
        ).forEach(modifier => {
          modifier.apply([this.scene, this.scene]);
        });
        this.scene.findModifiers(m => m instanceof PermaBeatTrainerQuestModifier)
          .forEach(modifier => modifier.apply([this.scene, this.scene]));

        if (this.scene.gameData.getQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST) == undefined && this.scene.currentBattle.waveIndex >= BATTLE_WAVES.RIVAL.FOURTH ) {
          this.scene.gameData.setQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.UNLOCKED);
          const nuzlightQuestData = nuzlightUnlockQuestModifier.config.questUnlockData;
          this.scene.pushPhase(new QuestUnlockPhase(this.scene, nuzlightQuestData, true));
        }

        else if (this.scene.gameMode.isNuzlight && this.scene.gameData.getQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST) == undefined && this.scene.currentBattle.waveIndex >= BATTLE_WAVES.RIVAL.FOURTH ) {
          this.scene.gameData.setQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.UNLOCKED);
          const nuzlockeQuestData = nuzlockeUnlockQuestModifier.config.questUnlockData;
          this.scene.pushPhase(new QuestUnlockPhase(this.scene, nuzlockeQuestData, true));
        }
      }

      if (this.scene.gameMode.isEndless || !this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex)) {
        this.scene.pushPhase(new EggLapsePhase(this.scene));

        this.scene.pushPhase(new SelectModifierPhase(this.scene, 0, undefined, false, undefined, PathNodeTypeFilter.NONE));
        ShowRewards(this.scene, 20, false, false);
        if ((this.scene.currentBattle.waveIndex % 10 === 0 && !this.scene.gameMode.isChaosMode) || trainerIsRival || this.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {
          if(this.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS) {
            this.scene.recoveryBossMode = RecoveryBossMode.RECOVERY_OBTAINED;
          }
          this.scene.pushPhase(new SelectModifierPhase(this.scene, 1, undefined, false, undefined, PathNodeTypeFilter.NONE));

        if (this.scene.moveUpgradesEnabledForRun && (this.scene.dynamicMode || trainerIsRival)) {
          this.scene.pushPhase(new SelectModifierPhase(this.scene, 0, undefined, false, undefined, PathNodeTypeFilter.MOVE_UPGRADE));
        }
        }
        if (this.scene.currentBattle.waveIndex % 100 === 1) {
          this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE, false));
        }
        if (this.scene.gameMode.isDaily) {
          this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_CHARM, false));
          if (this.scene.currentBattle.waveIndex > 10 && !this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GOLDEN_POKEBALL, false));
          }
        } else {
          const superExpWave = !this.scene.gameMode.isEndless ? (this.scene.offsetGym ? 0 : 20) : 10;

          if(Utils.randSeedInt(100, 1) <= 2) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GLITCH_PIECE, false));
          }
          else if(Utils.randSeedInt(100, 1) <= 1) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.RELIC_GOLD, false));
          }
          else if(Utils.randSeedInt(100, 1) <= 2) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.BIG_NUGGET, false));
          }
          if (this.scene.gameMode.isEndless && this.scene.currentBattle.waveIndex === 10) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE, false));
          }
          if (this.scene.currentBattle.waveIndex % 40 === 0 && !this.scene.gameMode.isChaosMode) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GOLDEN_POKEBALL, false));
          }
          if (!!this.scene.gameMode.isChaosMode && (this.scene.currentBattle.waveIndex % 100 === 8 || this.scene.currentBattle.waveIndex % 100 === 15)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE, false));
          }
          if (this.scene.gameMode.isEndless && !(this.scene.currentBattle.waveIndex % 50)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, !(this.scene.currentBattle.waveIndex % 250) ? modifierTypes.VOUCHER_PREMIUM : modifierTypes.VOUCHER_PLUS, false));
            this.scene.pushPhase(new AddEnemyBuffModifierPhase(this.scene));
          }
          try {
            if (this.scene.gameData.activeSkillTree) {
              this.checkSkillTreeRewards();
            }
          } catch (e) {
            console.warn("Skill tree reward grant failed:", e);
          }
          if (!(this.scene.currentBattle.waveIndex % 50)) {
            const rand = Utils.randSeedInt(100);
            let voucherType;
              if (rand < 95) {
                voucherType = modifierTypes.VOUCHER;
              } else if (rand < 99) {
                voucherType = modifierTypes.VOUCHER_PLUS;
              } else {
                voucherType = modifierTypes.VOUCHER_PREMIUM;
              }
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, voucherType, false));
          }
        }

        const pathContext = (this.scene as any).pathNodeContext;
        if (this.scene.gameMode.isChaosMode && pathContext === PathNodeContext.BATTLE_NODE) {
          if (this.scene.gameMode.isInfinite && this.scene.currentBattle.waveIndex % 1000 === 0) {
            this.scene.gameData.selectedPath = undefined;
            setupFixedBattlePaths(this.scene, this.scene.currentBattle.waveIndex + 1);
          }
            this.scene.pushPhase(new BattlePathPhase(this.scene));
        } else {
          this.scene.pushPhase(new NewBattlePhase(this.scene));
        }
      } else {
        this.scene.finalBattleVictory = true;
        this.scene.currentBattle.battleType = BattleType.CLEAR;
        this.scene.score += this.scene.gameMode.getClearScoreBonus();
        this.scene.updateScoreText();
        this.scene.gameData.updateGameModeStats(this.scene.gameMode.modeId, true);

        const shouldPlayAllSmittysCompleteVictory = this.shouldPlayAllSmittysCompleteVictoryCutscene();

        if (this.scene.gameMode.isNightmare) {
          if (shouldPlayAllSmittysCompleteVictory) {
            if (!this.scene.disableCutscenes) {
              const def = STORY_CUTSCENES.all_smittys_complete_victory;
              this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
                slides: def.slides,
                bgmKey: def.bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                resumeBgmOnEnd: true,
                onComplete: () => {
                  this.scene.gameData.gameStats.cutsceneAllSmittysCompleteVictoryShown = true;
                }
              }));
            }
          }

          const shouldPlayVoidVictoryCutscene =
            !shouldPlayAllSmittysCompleteVictory &&
            !this.scene.gameData.gameStats.cutsceneTheVoidVictoryShown;

          if (shouldPlayVoidVictoryCutscene) {
            this.scene.beginPowerUnlockDeferral();

            if (!this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
              const userKey = `pokevoid_void_overtaken_${loggedInUser?.username ?? "guest"}`;
              try {
                localStorage.setItem(userKey, 'true');
              } catch {}
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.THE_VOID_OVERTAKEN, "smitom", true));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.SMITTY_NUGGET, "tm_electric"));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUGGET_OF_SMITTY, "tm_ice"));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.MANY_MORE_NUGGETS, "permaShowRewards", true));
            }

            const uniTotal = universalSmittyForms.length;
            const uniUnlocked = new Set<string>((this.scene.gameData.uniSmittyUnlocks ?? []) as string[]).size;
            if (uniTotal > 0 && uniUnlocked < uniTotal) {
              this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
            }

            if (!this.scene.disableCutscenes) {
              const def = STORY_CUTSCENES.void_victory;
              let currentSlideKey: string | null = null;
              this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
                slides: def.slides,
                bgmKey: def.bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                resumeBgmOnEnd: true,
                onSlideChange: (index) => {
                  currentSlideKey = def.slides[index]?.imageKey;
                },
                onTextComplete: (controller) => {
                  if (currentSlideKey === "power") {
                    runPowerUnlockOverlays(this.scene, controller);
                  }
                },
                onComplete: () => {
                  this.scene.gameData.gameStats.cutsceneTheVoidVictoryShown = true;
                  this.scene.endPowerUnlockDeferral();
                }
              }));
            } else {
              this.scene.endPowerUnlockDeferral();
            }
          } else {
            if (!this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
              const userKey = `pokevoid_void_overtaken_${loggedInUser?.username ?? "guest"}`;
              try {
                localStorage.setItem(userKey, 'true');
              } catch {}
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.THE_VOID_OVERTAKEN, "smitom", true));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.SMITTY_NUGGET, "tm_electric"));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUGGET_OF_SMITTY, "tm_ice"));
              this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.MANY_MORE_NUGGETS, "permaShowRewards", true));
            }

            const uniTotal = universalSmittyForms.length;
            const uniUnlocked = new Set<string>((this.scene.gameData.uniSmittyUnlocks ?? []) as string[]).size;
            if (uniTotal > 0 && uniUnlocked < uniTotal) {
              this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
            }
          }
        }
        else {
          const isSmittyBattle = this.scene.currentBattle.trainer?.config.trainerType === TrainerType.SMITTY;
          if (shouldPlayAllSmittysCompleteVictory) {
            if (!this.scene.disableCutscenes) {
              const def = STORY_CUTSCENES.all_smittys_complete_victory;
              this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
                slides: def.slides,
                bgmKey: def.bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                resumeBgmOnEnd: true,
                onComplete: () => {
                  this.scene.gameData.gameStats.cutsceneAllSmittysCompleteVictoryShown = true;
                }
              }));
            }

            if (!isSmittyBattle) {
              const t = this.scene.currentBattle?.trainer;
              if (t?.isDynamicRival && t.dynamicRivalType) {
                this.scene.gameData.handleQuestUnlocks(this.scene, t.dynamicRivalType, true);
              } else {
                this.scene.gameData.handleQuestUnlocks(this.scene, null, true);
              }
            }
            this.handleUnlocks();
          } else if (isSmittyBattle) {
            this.scene.beginPowerUnlockDeferral();

            const uniTotal = universalSmittyForms.length;
            const uniUnlocked = new Set<string>((this.scene.gameData.uniSmittyUnlocks ?? []) as string[]).size;
            if (uniTotal > 0 && uniUnlocked < uniTotal) {
              this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
            }
            this.handleUnlocks();

            if (!this.scene.disableCutscenes) {
              const def = STORY_CUTSCENES.smitty_victory;
              let currentSlideKey: string | null = null;
              this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
                slides: def.slides,
                bgmKey: def.bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                resumeBgmOnEnd: true,
                onSlideChange: (index) => {
                  currentSlideKey = def.slides[index]?.imageKey;
                },
                onTextComplete: (controller) => {
                  if (currentSlideKey === "power") {
                    runPowerUnlockOverlays(this.scene, controller);
                  }
                },
                onComplete: () => {
                  this.scene.gameData.gameStats.cutsceneSmittyVictoryShown = true;
                  this.scene.endPowerUnlockDeferral();
                }
              }));
            } else {
              this.scene.endPowerUnlockDeferral();
            }
          } else {
            const t = this.scene.currentBattle?.trainer;
            if (t?.isDynamicRival && t.dynamicRivalType) {
              this.scene.gameData.handleQuestUnlocks(this.scene, t.dynamicRivalType, false, true);
            } else {
              this.scene.gameData.handleQuestUnlocks(this.scene);
            }
            this.handleUnlocks();
          }
        }

         this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaWinQuestModifier)
            .forEach(modifier => modifier.apply([this.scene, this.scene]));
         this.scene.findModifiers(m => m instanceof PermaWinQuestModifier)
            .forEach(modifier => modifier.apply([this.scene, this.scene]));
        for (const pokemon of this.scene.getParty()) {
          this.awardRibbon(pokemon);

          if (pokemon.species.getRootSpeciesId() !== pokemon.species.getRootSpeciesId(true)) {
            this.awardRibbon(pokemon, true);
          }
        }
        if(this.scene.gameMode.isClassic && !this.scene.validateAchv(achvs.CLASSIC_VICTORY)) {
          this.scene.unshiftPhase(new GameOverModifierRewardPhase(this.scene, modifierTypes.VOUCHER_PREMIUM));
        }

        this.scene.pushPhase(new HallOfFamePhase(this.scene));
      }

      if (!this.scene.gameMode.isNightmare && this.scene.gameMode.isWavePreFinal(this.scene)) {
        this.scene.gameData.gameStats.majorBossesDefeated++;
        this.scene.recordRunEndSummaryMajorBossDefeat(this.scene.currentBattle.waveIndex, defeatedPokemon.species.speciesId);
        this.scene.unshiftPhase(new SelectPermaModifierPhase(this.scene));
    }

      if (this.scene.gameMode.isNightmare) {
          const currentWave = this.scene.currentBattle.waveIndex;
          const isCenturyWave = currentWave % 100 === 0 && currentWave < 500;
          const isMajorBossWave = majorBossWaves.includes(currentWave);

          if (isMajorBossWave) {
            this.scene.gameData.gameStats.majorBossesDefeated++;
            this.scene.recordRunEndSummaryMajorBossDefeat(this.scene.currentBattle.waveIndex, defeatedPokemon.species.speciesId);
          }

          if (isCenturyWave || isMajorBossWave) {
              this.scene.unshiftPhase(new SelectPermaModifierPhase(this.scene));
          }

          const isNuzlight = !(this.scene.gameMode.hasShopCheck(this.scene));
          const isNuzlocke = this.scene.gameMode.isNuzlockeActive(this.scene);

          if(isCenturyWave) {
            this.scene.beginPowerUnlockDeferral();

            let targetMode: GameModes | null = null;
            if (isNuzlight || isNuzlocke) {
              targetMode = GameModes.CLASSIC;
              if (isNuzlight && isNuzlocke) {
                targetMode = GameModes.NIGHTMARE;
              } else if (isNuzlight) {
                targetMode = GameModes.NUZLIGHT;
              } else if (isNuzlocke) {
                targetMode = GameModes.NUZLOCKE;
              }
            }
            this.scene.recordRunUnlockReward({
              type: RewardObtainedType.NIGHTMARE_MODE_CHANGE,
              gameMode: GameModes.DRAFT
            });
            if (targetMode) {
              this.scene.recordRunUnlockReward({
                type: RewardObtainedType.NIGHTMARE_MODE_CHANGE,
                gameMode: targetMode
              });
            }

            if (!this.scene.disableCutscenes) {
              const def = currentWave === 400 ? STORY_CUTSCENES.nightmare_wave_400 : STORY_CUTSCENES.nightmare_century;
              let currentSlideKey: string | null = null;
              this.scene.pushPhase(new SlideshowCutscenePhase(this.scene, {
                slides: def.slides,
                bgmKey: def.bgmKey,
                canSkip: true,
                pauseAfterText: 1000,
                resumeBgmOnEnd: true,
                onSlideChange: (index) => {
                  currentSlideKey = def.slides[index]?.imageKey;
                },
                onTextComplete: (controller) => {
                  if (currentSlideKey === "choose") {
                    runPowerUnlockOverlays(this.scene, controller);
                  }
                },
                onComplete: () => {
                  this.scene.endPowerUnlockDeferral();
                }
              }));
            } else {
              this.scene.endPowerUnlockDeferral();
            }

            const modifiersToRemove = this.scene.modifiers.slice();
            for (const m of modifiersToRemove) {
              this.scene.removeModifier(m);
            }
            this.scene.updateModifiers(true).then(() => this.scene.updateUIPositions());

            if(currentWave >= 200) {
              if (currentWave >= 300 && Utils.randSeedFloat(0, 1) < 0.05) {
                this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
              } else {
                this.scene.gameData.handleQuestUnlocks(this.scene, this.scene.currentBattle.trainer.dynamicRivalType);
              }
            }

            this.scene.pushPhase(new SelectNightmareDraftPhase(this.scene));
          }
      }

      const isSmittyBattle = this.scene.currentBattle.trainer?.config.trainerType === TrainerType.SMITTY;
      if(this.scene.gameMode.isChaosMode && this.scene.currentBattle.isStage6RivalWave() && this.scene.currentBattle.trainer?.isDynamicRival && !isSmittyBattle) {
        const dynamicRivalType = this.scene.currentBattle.trainer.dynamicRivalType;
        this.scene.gameData.handleQuestUnlocks(this.scene, dynamicRivalType);
        if(!this.scene.gameMode.isChaosShort && !this.scene.gameMode.isChaosFTL) {
        const eligibleRivals = this.scene.gameData.chaosAltRivals.filter(r => r !== dynamicRivalType);

        if (eligibleRivals.length > 0) {
            const randomRival1 = Utils.randSeedItem(eligibleRivals);
            this.scene.gameData.handleQuestUnlocks(this.scene, randomRival1);

            if (this.scene.gameData.chaosAltRivals.length > 2) {
                const remainingEligible = eligibleRivals.filter(r => r !== randomRival1);
                if (remainingEligible.length > 0) {
                    const randomRival2 = Utils.randSeedItem(remainingEligible);
                    this.scene.gameData.handleQuestUnlocks(this.scene, randomRival2);
                }
            }
        }
        }
          this.handleUnlocks();
      }
    }

    this.end();
  }

  private checkSkillTreeRewards(): void {

    if (!this.scene.gameData.activeSkillTree) {
      return;
    }

    const skillPointSources = new SkillPointSources(this.scene);
    skillPointSources.checkBattleVictoryReward();
    skillPointSources.checkWaveMilestoneReward(this.scene.currentBattle.waveIndex);
    if (this.scene.currentBattle.trainer) {
      skillPointSources.checkBossVictoryReward(this.scene.currentBattle.trainer.config.trainerType);
    }
    const enemyPokemon = this.scene.getEnemyPokemon();
    if (enemyPokemon) {
      skillPointSources.checkLegendaryEncounterReward(enemyPokemon.species.speciesId);
    }
  }

  awardRibbon(pokemon: Pokemon, forStarter: boolean = false): void {
    const speciesId = getPokemonSpecies(pokemon.species.speciesId);
    const speciesRibbonCount = this.scene.gameData.incrementRibbonCount(speciesId, forStarter);
    if (speciesRibbonCount === 1) {
      this.firstRibbons.push(getPokemonSpecies(pokemon.species.getRootSpeciesId(forStarter)));
    }
  }

  private shouldPlayAllSmittysCompleteVictoryCutscene(): boolean {
    if (this.scene.gameData.gameStats.cutsceneAllSmittysCompleteVictoryShown) {
      return false;
    }
    if (!this.scene.textures.exists("smitty_trainers")) {
      return false;
    }

    const frames = this.scene.textures
      .get("smitty_trainers")
      .getFrameNames()
      .filter(f => {
        const m = f.match(/\d+/);
        if (!m) return false;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) && n > 0;
      });

    if (!frames.length) {
      return false;
    }

    const defeated = new Set<string>((this.scene.gameData.defeatedSmittyFoes ?? []) as string[]);
    let defeatedCount = 0;
    for (const f of frames) {
      if (defeated.has(f)) {
        defeatedCount++;
      }
    }

    return defeatedCount >= frames.length;
  }

  handleUnlocks(): void {
    if (!this.scene.gameData.unlocks[Unlockables.MINI_BLACK_HOLE]) {
      this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.MINI_BLACK_HOLE, "mini_black_hole"));
    }
    if (!this.scene.gameData.unlocks[Unlockables.EVIOLITE] && this.scene.getParty().some(p => p.getSpeciesForm(true).speciesId in pokemonEvolutions)) {
      this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.EVIOLITE, "eviolite"));
    }
    if (!this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
      const allRivals = getAllRivalTrainerTypes();
      const allDefeated = allRivals.every(rival => this.scene.gameData.defeatedRivals.includes(rival));

      if (allDefeated) {
        if (!this.scene.disableCutscenes) {
          const def = STORY_CUTSCENES.nightmare_start;
          this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
            slides: def.slides,
            bgmKey: def.bgmKey,
            canSkip: true,
            pauseAfterText: 1000,
            defaultCharSound: "ui/select",
            resumeBgmOnEnd: true,
            onComplete: () => {
              this.scene.gameData.gameStats.cutsceneAllRivalsDefeatedShown = true;
              this.scene.gameData.gameStats.cutsceneTitleBShown = true;
            }
          }));
        }
        this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NIGHTMARE_MODE, "tengale", true));
      }
    }
  }
}