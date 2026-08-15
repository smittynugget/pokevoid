import BattleScene from "#app/battle-scene.js";
import { ExpNotification } from "#app/enums/exp-notification.js";
import { EvolutionPhase } from "#app/phases/evolution-phase.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { LevelAchv } from "#app/system/achv.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { PlayerPartyMemberPokemonPhase } from "./player-party-member-pokemon-phase";
import { LearnMovePhase } from "./learn-move-phase";
import {PermaType} from "#app/modifier/perma-modifiers";
import {Moves} from "#enums/moves";
import { getYuMoveRange, pickThreeYuMovesWithFallback } from "#app/data/yu-move-utils.js";
import { YuMovePhase } from "#app/phases/yu-move-phase.js";
import { BattleStat } from "#app/data/battle-stat.ts";
import { Unlockables } from "#app/system/unlockables";
import { ensureDuelmonBandRolled, isDuelmonSpecies } from "#app/data/duelmon-rankups";
import { RankUpPhase } from "#app/phases/rank-up-phase";
import { RandomRankUpPhase } from "#app/phases/random-rank-up-phase";
import Overrides from "../overrides";

export class LevelUpPhase extends PlayerPartyMemberPokemonPhase {
  private lastLevel: integer;
  private level: integer;

  constructor(scene: BattleScene, partyMemberIndex: integer, lastLevel: integer, level: integer) {
    super(scene, partyMemberIndex);

    this.lastLevel = lastLevel;
    this.level = level;
    this.scene = scene;
  }

  start() {
    super.start();

    if (this.level > this.scene.gameData.gameStats.highestLevel) {
      this.scene.gameData.gameStats.highestLevel = this.level;
    }

    this.scene.validateAchvs(LevelAchv, new Utils.IntegerHolder(this.level));

    const pokemon = this.getPokemon();
    let prevStats = [];
    if(pokemon) {
      prevStats = pokemon.stats.slice(0);
      pokemon.calculateStats();
      pokemon.updateInfo();
    }
    else {
      this.end();
      return;
    }
    if (this.scene.expParty === ExpNotification.DEFAULT) {
      this.scene.playSound("level_up_fanfare");
      this.scene.ui.showText(i18next.t("battle:levelUp", { pokemonName: getPokemonNameWithAffix(this.getPokemon()), level: this.level }), null, () => this.scene.ui.getMessageHandler().promptLevelUpStats(this.partyMemberIndex, prevStats, false).then(() => this.end()), null, true);
    } else if (this.scene.expParty === ExpNotification.SKIP) {
      this.end();
    } else {

      this.scene.ui.getMessageHandler().promptLevelUpStats(this.partyMemberIndex, prevStats, false).then(() => this.end());
    }
    const levelMoves = this.getPokemon().getLevelMoves(this.lastLevel + 1);
    for (const lm of levelMoves) {
      this.scene.unshiftPhase(new LearnMovePhase(this.scene, this.partyMemberIndex, lm[1]));
    }
    if(this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_METRONOME_LEVELUP) && (this.lastLevel + 1) % 7 === 0) {
      this.scene.unshiftPhase(new LearnMovePhase(this.scene, this.partyMemberIndex, Moves.METRONOME));
      this.scene.gameData.reducePermaModifierByType([
        PermaType.PERMA_METRONOME_LEVELUP,
      ], this.scene);
    }
    if(pokemon.isSmittyForm() && (this.lastLevel + 1) == 65 && this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
      if (pokemon.getBattleStat(BattleStat.SPATK) > pokemon.getBattleStat(BattleStat.ATK)) {
        this.scene.unshiftPhase(new LearnMovePhase(this.scene, this.partyMemberIndex, Moves.NUGGET_OF_SMITTY));
      } else {
        this.scene.unshiftPhase(new LearnMovePhase(this.scene, this.partyMemberIndex, Moves.SMITTY_NUGGETS));
      }
    }
    const speciesId = pokemon.species.speciesId;
    let queuedDuelmonRankUp = false;
    if (isDuelmonSpecies(speciesId) && !pokemon.isEvolutionLocked()) {
      ensureDuelmonBandRolled(this.scene, pokemon as PlayerPokemon);
      const nextSlot = pokemon.duelmonBandsConsumed;
      const threshold = pokemon.duelmonBandThresholds[nextSlot];
      const crossed = Overrides.FORCE_DUELMON_RANK_UP_OVERRIDE
        || (threshold !== undefined && this.lastLevel < threshold && threshold <= this.level);
      if (crossed) {
        queuedDuelmonRankUp = true;
        this.scene.unshiftPhase(new RankUpPhase(this.scene, pokemon as PlayerPokemon, this.lastLevel));
      }
    }
    let queuedRandomRankUp = false;
    if (!queuedDuelmonRankUp && !pokemon.isEvolutionLocked()) {
      const band = Math.floor((this.level - 1) / 30) as integer;

      const alreadyUsedThisBand = pokemon.randomRankUpBandUsed === band;
      const alreadyPendingThisBand = pokemon.randomRankUpBandPending === band;
      const partyBandConsumedOrPending = this.scene.getParty().some(p =>
        p.randomRankUpBandUsed === band || p.randomRankUpBandPending === band
      );
      const effectiveBst = pokemon.getSpeciesForm().baseTotal;

      if ((!alreadyUsedThisBand || Overrides.BYPASS_RANDOM_RANK_UP_BAND_OVERRIDE) && !alreadyPendingThisBand && !partyBandConsumedOrPending && effectiveBst < 800) {

        let chanceHit = false;
        this.scene.executeWithSeedOffset(() => {
          const rawDenom = Overrides.RANDOM_RANK_UP_CHANCE_DENOMINATOR_OVERRIDE || 100;
          const denom = Math.max(1, rawDenom);
          chanceHit = Overrides.FORCE_RANDOM_RANK_UP_OVERRIDE || !Utils.randSeedInt(denom);
        }, ((pokemon.id << 10) ^ (band << 4) ^ (this.level << 1) ^ this.lastLevel) as integer, this.scene.waveSeed);

        if (chanceHit) {
          pokemon.randomRankUpBandPending = band;
          queuedRandomRankUp = true;
          this.scene.unshiftPhase(new RandomRankUpPhase(this.scene, pokemon as PlayerPokemon, this.lastLevel, band));
        }
      }
    }

    if (!queuedDuelmonRankUp && !queuedRandomRankUp && isDuelmonSpecies(speciesId)) {
      const yuRange = getYuMoveRange(this.scene);
      if (yuRange >= 0 && pokemon.yuMoveRangePending === yuRange && pokemon.yuMoveRangeUsed !== yuRange) {
        let yuCheckPassed = false;
        if (Overrides.FORCE_YU_MOVE_CHECK_OVERRIDE) {
          yuCheckPassed = true;
        } else {
          this.scene.executeWithSeedOffset(() => {
            yuCheckPassed = Utils.randSeedInt(100) < 10;
          }, ((pokemon.id << 10) ^ (yuRange << 4) ^ (this.level << 1)) as integer, this.scene.waveSeed);
        }

        if (yuCheckPassed) {
          const choices = pickThreeYuMovesWithFallback(this.scene, pokemon as PlayerPokemon);
          if (choices.length >= 1) {
            this.scene.unshiftPhase(new YuMovePhase(this.scene, pokemon as PlayerPokemon, choices, () => {
              pokemon.yuMoveRangeUsed = yuRange;
              pokemon.yuMoveRangePending = null;
            }));
          } else {
            pokemon.yuMoveRangePending = null;
          }
        } else {
          pokemon.yuMoveRangePending = null;
        }
      }
    }

    if (!queuedRandomRankUp && (!pokemon.pauseEvolutions || Overrides.FORCE_EVOLUTION_OVERRIDE)) {
      const evolution = pokemon.getEvolution();
      if (evolution) {
        this.scene.unshiftPhase(new EvolutionPhase(this.scene, pokemon as PlayerPokemon, evolution, this.lastLevel));
      }
    }
  }
}