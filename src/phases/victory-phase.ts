import BattleScene from "../battle-scene.js";
import {BATTLE_WAVES, BattlerIndex, BattleType, majorBossWaves} from "../battle.js";
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
import { SelectModifierPhase, ShowRewards } from "./select-modifier-phase";
import { ShowPartyExpBarPhase } from "./show-party-exp-bar-phase";
import { TrainerVictoryPhase } from "./trainer-victory-phase";
import {TrainerType} from "#enums/trainer-type";
import {GameModes} from "../game-mode";
import { SelectNightmareDraftPhase } from "./select-nightmare-draft-phase";
import { SelectPermaModifierPhase } from "./select-perma-modifier-phase";
import { UnlockUniSmittyPhase } from "./unlock-unismitty-phase";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import {QuestUnlockPhase} from "#app/phases/quest-unlock-phase";
import {QuestState, QuestUnlockables} from "#app/system/game-data";
import {Unlockables} from "#app/system/unlockables";
import {UnlockPhase} from "#app/phases/unlock-phase";
import {pokemonEvolutions} from "#app/data/pokemon-evolutions";
import {getAllRivalTrainerTypes} from "#app/data/trainer-config";
import {GameOverModifierRewardPhase} from "#app/phases/game-over-modifier-reward-phase";
import {achvs} from "#app/system/achv";
import {RibbonModifierRewardPhase} from "#app/phases/ribbon-modifier-reward-phase";
import Pokemon from "#app/field/pokemon";
import PokemonSpecies, {getPokemonSpecies} from "#app/data/pokemon-species";

export class VictoryPhase extends PokemonPhase {

  private firstRibbons: PokemonSpecies[] = [];

  constructor(scene: BattleScene, battlerIndex: BattlerIndex) {
    super(scene, battlerIndex);
  }

  start() {
    super.start();

    if (this.scene.gameMode.isTestMod) {
      this.scene.unshiftPhase(new GameOverPhase(this.scene, false));
      this.end();
      return;
    }

    this.scene.gameData.gameStats.pokemonDefeated++;

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
          partyMember.addFriendship(2);
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

    if (!this.scene.getEnemyParty().find(p => this.scene.currentBattle.battleType ? !p?.isFainted(true) : p.isOnField())) {
      this.scene.pushPhase(new BattleEndPhase(this.scene));
      if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
        this.scene.unshiftPhase(new TrainerVictoryPhase(this.scene));
      }
      let trainerIsRival = this.scene.currentBattle.trainer != undefined ? this.scene.currentBattle.trainer.isDynamicRival : false;
      if (trainerIsRival) {
        this.scene.gameData.permaModifiers.findModifiers(m =>
            m instanceof PermaBeatTrainerQuestModifier
        ).forEach(modifier => { 
          modifier.apply([this.scene, this.scene]);
        });

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
        
        

        
        this.scene.pushPhase(new SelectModifierPhase(this.scene));
        ShowRewards(this.scene, 20, false, false);
        if (this.scene.currentBattle.waveIndex % 10 === 0 || trainerIsRival) {
          this.scene.pushPhase(new SelectModifierPhase(this.scene, 1));
        }


        if (this.scene.currentBattle.waveIndex % 100 === 1) {
          this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE));
        }
        if (this.scene.gameMode.isDaily) {
          this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_CHARM));
          if (this.scene.currentBattle.waveIndex > 10 && !this.scene.gameMode.isWaveFinal(this.scene.currentBattle.waveIndex)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GOLDEN_POKEBALL));
          }
        } else {
          const superExpWave = !this.scene.gameMode.isEndless ? (this.scene.offsetGym ? 0 : 20) : 10;
          if(Utils.randSeedInt(100, 1) <= 2) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GLITCH_PIECE));
          }
          else if(Utils.randSeedInt(100, 1) <= 1) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.RELIC_GOLD));
          }
          else if(Utils.randSeedInt(100, 1) <= 2) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.BIG_NUGGET));
          }
          if (this.scene.gameMode.isEndless && this.scene.currentBattle.waveIndex === 10) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE));
          }
          if (this.scene.currentBattle.waveIndex <= 750 && ((this.scene.currentBattle.waveIndex <= 500 && this.scene.currentBattle.waveIndex % 3 === 0) || (this.scene.currentBattle.waveIndex % 30) === superExpWave)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_CHARM));
          }
          if (!(this.scene.currentBattle.waveIndex % 40)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.GOLDEN_POKEBALL));
          }
          if (this.scene.currentBattle.waveIndex % 100 === 8 || this.scene.currentBattle.waveIndex % 100 === 15) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, modifierTypes.EXP_SHARE));
          }
          if (this.scene.gameMode.isEndless && !(this.scene.currentBattle.waveIndex % 50)) {
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, !(this.scene.currentBattle.waveIndex % 250) ? modifierTypes.VOUCHER_PREMIUM : modifierTypes.VOUCHER_PLUS));
            this.scene.pushPhase(new AddEnemyBuffModifierPhase(this.scene));
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
            this.scene.pushPhase(new ModifierRewardPhase(this.scene, voucherType));
          }
        }
        this.scene.pushPhase(new NewBattlePhase(this.scene));
      } else {
        this.scene.currentBattle.battleType = BattleType.CLEAR;
        this.scene.score += this.scene.gameMode.getClearScoreBonus();
        this.scene.updateScoreText();

        if (this.scene.gameMode.isNightmare) {
          if (!this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.THE_VOID_OVERTAKEN, "smitom", true));
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.SMITTY_NUGGET, "tm_electric"));
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUGGET_OF_SMITTY, "tm_ice"));
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.MANY_MORE_NUGGETS, "permaShowRewards", true));
          }
          this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
        }
        else {
          this.scene.gameData.handleQuestUnlocks(this.scene);
          this.handleUnlocks();
        }

         this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaWinQuestModifier)
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

        this.scene.pushPhase(new GameOverPhase(this.scene, true));
      }

      if (!this.scene.gameMode.isNightmare && this.scene.gameMode.isWavePreFinal(this.scene)) {
        this.scene.unshiftPhase(new SelectPermaModifierPhase(this.scene));
    }

      if (this.scene.gameMode.isNightmare) {
          const currentWave = this.scene.currentBattle.waveIndex;
          const isCenturyWave = currentWave % 100 === 0 && currentWave < 500;
          const isMajorBossWave = majorBossWaves.includes(currentWave);

          if (isCenturyWave || isMajorBossWave) {
              this.scene.unshiftPhase(new SelectPermaModifierPhase(this.scene));
          }

          const isNuzlight = !(this.scene.gameMode.hasShopCheck(this.scene));
          const isNuzlocke = this.scene.gameMode.isNuzlockeActive(this.scene);

          if(isCenturyWave) {
            this.scene.pushPhase(new RewardObtainDisplayPhase(
                  this.scene,
                  {
                      type: RewardObtainedType.NIGHTMARE_MODE_CHANGE,
                      gameMode: GameModes.DRAFT
                  },
                  () => {
                      this.scene.ui.revertMode();
                  }
              ));

              const modifiersToRemove = this.scene.modifiers.filter(m => m instanceof PersistentModifier);
              for (const m of modifiersToRemove) {
                this.scene.modifiers.splice(this.scene.modifiers.indexOf(m), 1);
              }
              this.scene.updateModifiers(true).then(() => this.scene.updateUIPositions());
          }

          if ((isNuzlight || isNuzlocke) && isCenturyWave) {
              let targetMode = GameModes.CLASSIC; 
              if (isNuzlight && isNuzlocke) {
                  targetMode = GameModes.NIGHTMARE;
              } else if (isNuzlight) {
                  targetMode = GameModes.NUZLIGHT;
              } else if (isNuzlocke) {
                  targetMode = GameModes.NUZLOCKE;
              }

              this.scene.pushPhase(new RewardObtainDisplayPhase(
                  this.scene,
                  {
                      type: RewardObtainedType.NIGHTMARE_MODE_CHANGE,
                      gameMode: targetMode
                  },
                  () => {
                      this.scene.ui.revertMode();
                  }
              ));
          }

          if(isCenturyWave) {
            if (currentWave >= 200 && Utils.randSeedFloat(0, 1) < 0.05) {
              this.scene.unshiftPhase(new UnlockUniSmittyPhase(this.scene));
            } else {
              this.scene.gameData.handleQuestUnlocks(this.scene, this.scene.currentBattle.trainer.dynamicRivalType);
            }
            this.scene.pushPhase(new SelectNightmareDraftPhase(this.scene));
          }
      }
    }

    this.end();
  }

  awardRibbon(pokemon: Pokemon, forStarter: boolean = false): void {
    const speciesId = getPokemonSpecies(pokemon.species.speciesId);
    const speciesRibbonCount = this.scene.gameData.incrementRibbonCount(speciesId, forStarter);
    if (speciesRibbonCount === 1) {
      this.firstRibbons.push(getPokemonSpecies(pokemon.species.getRootSpeciesId(forStarter)));
    }
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
        this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NIGHTMARE_MODE, "tengale", true));
      }
    }
  }
}
