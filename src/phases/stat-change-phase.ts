import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyPreStatChangeAbAttrs, ProtectStatAbAttr, applyAbAttrs, FieldPreventOpponentStatBoostAbAttr, StatChangeMultiplierAbAttr, StatChangeCopyAbAttr, applyPostStatChangeAbAttrs, PostStatChangeAbAttr } from "#app/data/ability.js";
import { MistTag, ArenaTagSide } from "#app/data/arena-tag.js";
import { BattleStat, getBattleStatName, getBattleStatLevelChangeDescription } from "#app/data/battle-stat.js";
import Pokemon from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { PokemonResetNegativeStatStageModifier } from "#app/modifier/modifier.js";
import { handleTutorial, Tutorial } from "#app/tutorial.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import { playStatChangeVisual } from "#app/field/stat-change-visual";
import { PokemonPhase } from "./pokemon-phase";

export type StatChangeCallback = (target: Pokemon | null, changed: BattleStat[], relativeChanges: number[]) => void;

export class StatChangePhase extends PokemonPhase {
  private stats: BattleStat[];
  private selfTarget: boolean;
  private levels: integer;
  private showMessage: boolean;
  private ignoreAbilities: boolean;
  private canBeCopied: boolean;
  private onChange: StatChangeCallback | null;
  constructor(scene: BattleScene, battlerIndex: BattlerIndex, selfTarget: boolean, stats: BattleStat[], levels: integer, showMessage: boolean = true, ignoreAbilities: boolean = false, canBeCopied: boolean = true, onChange: StatChangeCallback | null = null) {
    super(scene, battlerIndex);

    this.selfTarget = selfTarget;
    this.stats = stats;
    this.levels = levels;
    this.showMessage = showMessage;
    this.ignoreAbilities = ignoreAbilities;
    this.canBeCopied = canBeCopied;
    this.onChange = onChange;
  }

  start() {
    const pokemon = this.getPokemon();

    if (!pokemon) {
      return this.end();
    }

    if (this.scene.dynamicMode?.noStatBoosts && this.player && this.levels > 0) {
      this.end();
      return;
    }

    let random = false;

    if (this.stats.length === 1 && this.stats[0] === BattleStat.RAND) {
      this.stats[0] = this.getRandomStat();
      random = true;
    }

    this.aggregateStatChanges(random);

    if (!pokemon.isActive(true)) {
      return this.end();
    }

    const filteredStats = this.stats.map(s => s !== BattleStat.RAND ? s : this.getRandomStat()).filter(stat => {
      const cancelled = new Utils.BooleanHolder(false);

      if (!this.selfTarget && this.levels < 0) {
        this.scene.arena.applyTagsForSide(MistTag, pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY, cancelled);
      }

      if (!cancelled.value && !this.selfTarget && this.levels < 0) {
        applyPreStatChangeAbAttrs(ProtectStatAbAttr, this.getPokemon(), stat, cancelled);
      }

      return !cancelled.value;
    });

    if (!this.ignoreAbilities && this.levels > 0 && filteredStats.length) {
      const cancelled = new Utils.BooleanHolder(false);
      for (const opponent of pokemon.getOpponents()) {
        applyAbAttrs(FieldPreventOpponentStatBoostAbAttr, opponent, cancelled, false, pokemon, this.levels);
        if (cancelled.value) {
          return this.end();
        }
      }
    }

    const levels = new Utils.IntegerHolder(this.levels);

    if (!this.ignoreAbilities) {
      applyAbAttrs(StatChangeMultiplierAbAttr, pokemon, null, false, levels);
    }

    const battleStats = this.getPokemon().summonData.battleStats;
    const relLevels = filteredStats.map(stat => (levels.value >= 1 ? Math.min(battleStats![stat] + levels.value, 6) : Math.max(battleStats![stat] + levels.value, -6)) - battleStats![stat]);

    this.onChange && this.onChange(this.getPokemon(), filteredStats, relLevels);

    const end = () => {
      if (this.showMessage) {
        const messages = this.getStatChangeMessages(filteredStats, levels.value, relLevels);
        for (const message of messages) {
          this.scene.queueMessage(message);
        }
      }

      for (const stat of filteredStats) {
        pokemon.summonData.battleStats[stat] = Math.max(Math.min(pokemon.summonData.battleStats[stat] + levels.value, 6), -6);
        if (levels.value > 0 && pokemon.summonData.battleStats[stat] > 0) {
          if (!pokemon.summonData.statsEverBoosted) {
            pokemon.summonData.statsEverBoosted = [ false, false, false, false, false, false, false ];
          }
          pokemon.summonData.statsEverBoosted[stat] = true;
        }
      }

      if (levels.value > 0 && this.canBeCopied) {
        for (const opponent of pokemon.getOpponents()) {
          applyAbAttrs(StatChangeCopyAbAttr, opponent, null, false, this.stats, levels.value);
        }
      }

      applyPostStatChangeAbAttrs(PostStatChangeAbAttr, pokemon, filteredStats, this.levels, this.selfTarget);
      const existingPhase = this.scene.findPhase(p => p instanceof StatChangePhase && p.battlerIndex === this.battlerIndex);
      if (!(existingPhase instanceof StatChangePhase)) {

        const whiteHerb = this.scene.applyModifier(PokemonResetNegativeStatStageModifier, this.player, pokemon) as PokemonResetNegativeStatStageModifier;

        if (whiteHerb) {
          --whiteHerb.stackCount;
          if (whiteHerb.stackCount <= 0) {
            this.scene.removeModifier(whiteHerb);
          }
          this.scene.updateModifiers(this.player);
        }
      }

      pokemon.updateInfo();

      handleTutorial(this.scene, Tutorial.Stat_Change).then(() => super.end());
    };

    if (relLevels.filter(l => l).length && this.scene.moveAnimations) {
      const direction = levels.value >= 1 ? "up" : "down";
      playStatChangeVisual(this.scene, pokemon, direction, () => end());
    } else {
      end();
    }
  }

  getRandomStat(): BattleStat {
    const allStats = Utils.getEnumValues(BattleStat);
    return this.getPokemon() ? allStats[this.getPokemon()!.randSeedInt(BattleStat.SPD + 1)] : BattleStat.ATK;
  }

  aggregateStatChanges(random: boolean = false): void {
    const isAccEva = [BattleStat.ACC, BattleStat.EVA].some(s => this.stats.includes(s));
    let existingPhase: StatChangePhase;
    if (this.stats.length === 1) {
      while ((existingPhase = (this.scene.findPhase(p => p instanceof StatChangePhase && p.battlerIndex === this.battlerIndex && p.stats.length === 1
        && (p.stats[0] === this.stats[0] || (random && p.stats[0] === BattleStat.RAND))
        && p.selfTarget === this.selfTarget && p.showMessage === this.showMessage && p.ignoreAbilities === this.ignoreAbilities) as StatChangePhase))) {
        if (existingPhase.stats[0] === BattleStat.RAND) {
          existingPhase.stats[0] = this.getRandomStat();
          if (existingPhase.stats[0] !== this.stats[0]) {
            continue;
          }
        }
        this.levels += existingPhase.levels;

        if (!this.scene.tryRemovePhase(p => p === existingPhase)) {
          break;
        }
      }
    }
    while ((existingPhase = (this.scene.findPhase(p => p instanceof StatChangePhase && p.battlerIndex === this.battlerIndex && p.selfTarget === this.selfTarget
      && ([BattleStat.ACC, BattleStat.EVA].some(s => p.stats.includes(s)) === isAccEva)
      && p.levels === this.levels && p.showMessage === this.showMessage && p.ignoreAbilities === this.ignoreAbilities) as StatChangePhase))) {
      this.stats.push(...existingPhase.stats);
      if (!this.scene.tryRemovePhase(p => p === existingPhase)) {
        break;
      }
    }
  }

  getStatChangeMessages(stats: BattleStat[], levels: integer, relLevels: integer[]): string[] {
    const messages: string[] = [];

    const relLevelStatIndexes = {};
    for (let rl = 0; rl < relLevels.length; rl++) {
      const relLevel = relLevels[rl];
      if (!relLevelStatIndexes[relLevel]) {
        relLevelStatIndexes[relLevel] = [];
      }
      relLevelStatIndexes[relLevel].push(rl);
    }

    Object.keys(relLevelStatIndexes).forEach(rl => {
      const relLevelStats = stats.filter((_, i) => relLevelStatIndexes[rl].includes(i));
      let statsFragment = "";

      if (relLevelStats.length > 1) {
        statsFragment = relLevelStats.length >= 5
          ? i18next.t("battle:stats")
          : `${relLevelStats.slice(0, -1).map(s => getBattleStatName(s)).join(", ")}${relLevelStats.length > 2 ? "," : ""} ${i18next.t("battle:statsAnd")} ${getBattleStatName(relLevelStats[relLevelStats.length - 1])}`;
        messages.push(getBattleStatLevelChangeDescription(getPokemonNameWithAffix(this.getPokemon()), statsFragment, Math.abs(parseInt(rl)), levels >= 1, relLevelStats.length));
      } else {
        statsFragment = getBattleStatName(relLevelStats[0]);
        messages.push(getBattleStatLevelChangeDescription(getPokemonNameWithAffix(this.getPokemon()), statsFragment, Math.abs(parseInt(rl)), levels >= 1, relLevelStats.length));
      }
    });

    return messages;
  }
}