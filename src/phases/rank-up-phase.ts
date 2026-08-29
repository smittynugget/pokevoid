import BattleScene from "#app/battle-scene.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { Phase } from "#app/phase.js";
import i18next from "i18next";
import { Mode } from "#app/ui/ui";
import type { RankUpUiConfig } from "#app/ui/rank-up-ui-handler";
import * as Utils from "#app/utils.js";
import { allAbilities } from "#app/data/ability";
import { calculateStatsToTargetBstWithSwapping } from "#app/data/alt-build-stat-calculator";
import { getDuelmonRankUpDefinition, isDuelmonSpecies, ensureDuelmonBandRolled, pickTwoOtherDuelmonCandidatesByTagOverlap } from "#app/data/duelmon-rankups";
import { Gender } from "#app/data/gender";
import { getPokemonSpecies, getPokemonSpeciesForm, PokemonSpeciesForm } from "#app/data/pokemon-species";
import { getStatName, Stat } from "#app/data/pokemon-stat";
import { Type } from "#app/data/type";
import { Species } from "#enums/species";
import { TextStyle, getBBCodeFrag } from "#app/ui/text";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import { ModifierType, ModifierTypeOption } from "#app/modifier/modifier-type";
import { ModifierTier } from "#app/modifier/modifier-tier";
import { RankUpTransformPhase } from "./rank-up-transform-phase";
import { FormChangePhase } from "./form-change-phase";
import { SpeciesFormChange, SpeciesFormChangeManualTrigger } from "#app/data/pokemon-forms";
import { SpeciesFormKey } from "#app/enums/species-form-key";
export class RankUpPhase extends Phase {
  constructor(
    scene: BattleScene,
    private readonly pokemon: PlayerPokemon,
    private readonly lastLevel: integer
  ) {
    super(scene);
  }

  start() {
    super.start();

    if (!this.pokemon) {
      this.end();
      return;
    }

    const currentSpeciesId = this.pokemon.species?.speciesId as Species;
    if (!getDuelmonRankUpDefinition(currentSpeciesId)) {
      this.end();
      return;
    }

    const otherSpeciesIds = this.pickTwoOtherDuelmonCandidates(currentSpeciesId);

    const currentForm = this.pokemon.getSpeciesForm();
    const currentBaseStats = [...currentForm.baseStats];
    const currentBst = currentBaseStats.reduce((sum, s) => sum + s, 0);
    const deltaBst = this.clampInt(75, 75, 100);

    const selfFocus = this.getDefaultRankUpFocusStats(currentBaseStats);
    const selfTargetBst = currentBst + deltaBst;
    const selfAfterBaseStats = calculateStatsToTargetBstWithSwapping(currentBaseStats, selfFocus, selfTargetBst);
    const selfAfterBst = selfAfterBaseStats.reduce((sum, s) => sum + s, 0);
    const selfDeltaStats = selfAfterBaseStats.map((v, i) => v - currentBaseStats[i]);
    const selfDeltaTotal = selfAfterBst - currentBst;

    const otherPlans = otherSpeciesIds.map(sid => {
      const otherForm = getPokemonSpeciesForm(sid, 0);
      const otherBaseStats = [...otherForm.baseStats];
      const otherTargetBst = currentBst + deltaBst;
      const otherFocus = this.getDefaultRankUpFocusStats(otherBaseStats);
      const otherAfterBaseStats = calculateStatsToTargetBstWithSwapping(otherBaseStats, otherFocus, otherTargetBst);
      const otherAfterBst = otherAfterBaseStats.reduce((sum, s) => sum + s, 0);
      return {
        deltaStats: otherAfterBaseStats.map((v, i) => v - currentBaseStats[i]),
        deltaTotal: otherAfterBst - currentBst,
        afterBaseStats: otherAfterBaseStats,
      };
    });

    const config: RankUpUiConfig = {
      center: {
        label: this.pokemon.name,
        ...this.getIconModelForSpeciesForm(currentForm),
      },
      options: [
        this.buildSelfOptionModel(currentForm, selfDeltaStats, selfDeltaTotal),
        this.buildOtherOptionModel(otherSpeciesIds[0], otherPlans[0].deltaStats, otherPlans[0].deltaTotal, currentBaseStats, otherPlans[0].afterBaseStats),
        this.buildOtherOptionModel(otherSpeciesIds[1], otherPlans[1].deltaStats, otherPlans[1].deltaTotal, currentBaseStats, otherPlans[1].afterBaseStats),
      ],
      onSelect: async (choiceIdx: integer) => {
        const idx = Math.max(0, Math.min(2, Math.floor(choiceIdx))) as 0 | 1 | 2;
        const otherIdx = idx === 0 ? null : idx - 1;
        await this.scene.ui.setMode(Mode.MESSAGE);
        await this.applyChoice(
          idx,
          otherIdx !== null ? otherSpeciesIds[otherIdx] : this.pokemon.species.speciesId,
          selfAfterBaseStats,
          otherIdx !== null ? otherPlans[otherIdx].afterBaseStats : selfAfterBaseStats
        );
        this.end();
      },
    };

    const typeOptions = this.buildLootTypeOptions(config);
    const displayConfig = {
      title: config.title || i18next.t("battle:rankUpTitle", { defaultValue: "SOUL SURGE" }),
      subtitle: config.subtitle || i18next.t("battle:rankUpSubtitle", { defaultValue: "Darkness floods the soul, what will you do..." }),
      hideShop: true,
      checkTeamOnly: true,
      isRankUp: true,
    };

    this.scene.ui.setMode(
      Mode.LOOT_REWARD_SELECT,
      true,
      typeOptions,
      (rowCursor: number, cursor: number) => {
        if (cursor < 0) return false;
        if (rowCursor === 0) return false;
        config.onSelect(cursor);
        return true;
      },
      { rerollCost: 0, permaRerollCost: 0 },
      true,
      displayConfig
    );
  }

  private clampInt(value: number, min: number, max: number): integer {
    return Math.max(min, Math.min(max, Math.floor(value))) as integer;
  }

  private pickTwoOtherDuelmonCandidates(currentSpeciesId: Species): [Species, Species] {
    let picked: [Species, Species] = [currentSpeciesId, currentSpeciesId];
    this.scene.executeWithSeedOffset(() => {
      picked = pickTwoOtherDuelmonCandidatesByTagOverlap(currentSpeciesId, Utils.randSeedInt, this.pokemon.rankUpHistorySpeciesIds);
    }, ((this.pokemon.id << 8) ^ (this.pokemon.level << 1) ^ this.lastLevel) as integer, this.scene.waveSeed);
    return picked;
  }

  private getDefaultRankUpFocusStats(baseStats: integer[]): Stat[] {
    const candidates: Stat[] = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    candidates.sort((a, b) => (baseStats[b] ?? 0) - (baseStats[a] ?? 0));
    return candidates.slice(0, 2);
  }

  private getTypeName(type: Type): string {
    return i18next.t(`pokemonInfo:Type:${Type[type]}`);
  }

  private getAbilityInfoForSpeciesForm(form: PokemonSpeciesForm, abilityIndex: integer): { name: string; description: string } {
    const abilityCount = form.getAbilityCount();
    const clamped = abilityIndex >= abilityCount ? Math.max(abilityCount - 1, 0) : abilityIndex;
    const abilityId = form.getAbility(clamped);
    const ability = allAbilities[abilityId];
    return {
      name: ability?.name ?? i18next.t("modifierSelectUiHandler:none", { defaultValue: "None" }),
      description: ability?.description ?? "",
    };
  }

  private buildStatsDeltaLines(deltaStats: integer[], deltaTotal: integer): string[] {
    const uiTheme = (this.scene as BattleScene).uiTheme;
    const fmt = (stat: Stat) => {
      const val = deltaStats[stat];
      const sign = val >= 0 ? "+" : "";
      const style = val > 0 ? TextStyle.SUMMARY_GREEN : val < 0 ? TextStyle.SUMMARY_RED : TextStyle.WINDOW;
      return `${getBBCodeFrag(getStatName(stat, true), TextStyle.WINDOW, uiTheme)} ${getBBCodeFrag(`${sign}${val}`, style, uiTheme)}`;
    };
    const totalLabel = i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" });
    const totalSign = deltaTotal >= 0 ? "+" : "";
    const totalStyle = deltaTotal > 0 ? TextStyle.SUMMARY_GREEN : deltaTotal < 0 ? TextStyle.SUMMARY_RED : TextStyle.WINDOW;
    return [
      `${fmt(Stat.HP)} | ${fmt(Stat.ATK)} | ${fmt(Stat.DEF)}`,
      `${fmt(Stat.SPATK)} | ${fmt(Stat.SPDEF)} | ${fmt(Stat.SPD)}`,
      `${getBBCodeFrag(totalLabel, TextStyle.SUMMARY_GOLD, uiTheme)} ${getBBCodeFrag(`${totalSign}${deltaTotal}`, totalStyle, uiTheme)}`,
    ];
  }

  private getIconModelForSpeciesForm(form: PokemonSpeciesForm): { iconAtlasKey: string; iconFrame: string | number; iconScale?: number } {
    const female = this.pokemon.gender === Gender.FEMALE;
    return {
      iconAtlasKey: form.getIconAtlasKey(this.pokemon.formIndex, this.pokemon.shiny, this.pokemon.variant),
      iconFrame: form.getIconId(female, this.pokemon.formIndex, this.pokemon.shiny, this.pokemon.variant),
      iconScale: 0.6,
    };
  }

  private buildSelfOptionModel(currentForm: PokemonSpeciesForm, deltaStats: integer[], deltaTotal: integer) {
    const uiTheme = (this.scene as BattleScene).uiTheme;
    const type1 = this.getTypeName(currentForm.type1);
    const type2 = currentForm.type2 !== null ? this.getTypeName(currentForm.type2) : null;
    const liveAbility = this.pokemon.getAbility?.();
    const fallback = this.getAbilityInfoForSpeciesForm(currentForm, this.pokemon.abilityIndex);
    const abilityName = liveAbility?.name ?? fallback.name;
    const abilityDesc = liveAbility?.description ?? fallback.description;

    const typeLabel = i18next.t("battle:rankUpTooltipType", { defaultValue: "Type:" });
    const abilityLabel = i18next.t("starterSelectUiHandler:ability", { defaultValue: "Ability:" });
    const statsLabel = i18next.t("battle:rankUpTooltipStats", { defaultValue: "Stats:" });
    const desc = i18next.t("battle:rankUpSelfDesc", { defaultValue: "Consume the void's energy to strengthen {{pokemonName}}'s soul.", pokemonName: this.pokemon.name });

    const lines: string[] = [];
    lines.push(`${getBBCodeFrag(typeLabel, TextStyle.SUMMARY_GOLD, uiTheme)} ${getBBCodeFrag(type2 ? `${type1} / ${type2}` : type1, TextStyle.WINDOW, uiTheme)}`);
    lines.push(`${getBBCodeFrag(abilityLabel, TextStyle.SUMMARY_GOLD, uiTheme)} ${getBBCodeFrag(abilityName, TextStyle.WINDOW, uiTheme)}`);
    if (abilityDesc) {
      lines.push(getBBCodeFrag(abilityDesc, TextStyle.WINDOW, uiTheme));
    }
    lines.push("");
    lines.push(getBBCodeFrag(statsLabel, TextStyle.SUMMARY_GOLD, uiTheme));
    lines.push(...this.buildStatsDeltaLines(deltaStats, deltaTotal));
    lines.push("");
    lines.push(getBBCodeFrag(desc, TextStyle.WINDOW, uiTheme));

    const displayName = i18next.t("battle:rankUpSelfLabel", { defaultValue: "Embrace" });

    return {
      label: displayName,
      ...this.getIconModelForSpeciesForm(currentForm),
      tooltipTitle: displayName,
      tooltipBody: lines.join("\n"),
      tooltipSubtitle: displayName,
      tooltipRarity: SkillTreeRarity.LEGENDARY,
      tooltipData: {
        kind: "self" as const,
        types: currentForm.type2 !== null ? [currentForm.type1, currentForm.type2] : [currentForm.type1],
        abilities: [{ name: abilityName, description: abilityDesc }],
        baseStats: [...currentForm.baseStats],
        afterStats: [...currentForm.baseStats].map((v, i) => v + (deltaStats[i] ?? 0)),
        deltaStats: [...deltaStats],
        description: desc,
      },
    };
  }

  private buildOtherOptionModel(otherSpeciesId: Species, deltaStats: integer[], deltaTotal: integer, sourceBaseStats: integer[], afterBaseStats: integer[]) {
    const uiTheme = (this.scene as BattleScene).uiTheme;
    const species = getPokemonSpecies(otherSpeciesId);
    const form = (species.forms && species.forms.length > 0 ? species.forms[0] : species) as unknown as PokemonSpeciesForm;

    const type1 = this.getTypeName(form.type1);
    const type2 = form.type2 !== null ? this.getTypeName(form.type2) : null;
    const abilityInfo = this.getAbilityInfoForSpeciesForm(form, this.pokemon.abilityIndex);

    const typeLabel = i18next.t("battle:rankUpTooltipType", { defaultValue: "Type:" });
    const abilityLabel = i18next.t("starterSelectUiHandler:ability", { defaultValue: "Ability:" });
    const statsLabel = i18next.t("battle:rankUpTooltipStats", { defaultValue: "Stats:" });
    const desc = i18next.t("battle:rankUpOtherDesc", { defaultValue: "The void warps reality. Seize that power to reshape {{currentName}}'s soul into {{pokemonName}}.", pokemonName: species.name, currentName: this.pokemon.name });

    const lines: string[] = [];
    lines.push(`${getBBCodeFrag(typeLabel, TextStyle.SUMMARY_GOLD, uiTheme)} ${getBBCodeFrag(type2 ? `${type1} / ${type2}` : type1, TextStyle.WINDOW, uiTheme)}`);
    lines.push(`${getBBCodeFrag(abilityLabel, TextStyle.SUMMARY_GOLD, uiTheme)} ${getBBCodeFrag(abilityInfo.name, TextStyle.WINDOW, uiTheme)}`);
    if (abilityInfo.description) {
      lines.push(getBBCodeFrag(abilityInfo.description, TextStyle.WINDOW, uiTheme));
    }
    lines.push("");
    lines.push(getBBCodeFrag(statsLabel, TextStyle.SUMMARY_GOLD, uiTheme));
    lines.push(...this.buildStatsDeltaLines(deltaStats, deltaTotal));
    lines.push("");
    lines.push(getBBCodeFrag(desc, TextStyle.WINDOW, uiTheme));

    const female = this.pokemon.gender === Gender.FEMALE;
    const allAbilitiesForForm: { name: string; description: string }[] = [];
    const seenAbilityNames = new Set<string>();
    const abilityCount = form.getAbilityCount();
    for (let ai = 0; ai < abilityCount; ai++) {
      const info = this.getAbilityInfoForSpeciesForm(form, ai);
      if (!seenAbilityNames.has(info.name)) {
        seenAbilityNames.add(info.name);
        allAbilitiesForForm.push(info);
      }
    }

    return {
      label: i18next.t("battle:rankUpOtherLabel", { defaultValue: "Reshape" }),
      iconAtlasKey: form.getIconAtlasKey(0, this.pokemon.shiny, this.pokemon.variant),
      iconFrame: form.getIconId(female, 0, this.pokemon.shiny, this.pokemon.variant),
      iconScale: 0.6,
      tooltipTitle: i18next.t("battle:rankUpOtherTitle", { defaultValue: "Rank Up Option" }),
      tooltipBody: lines.join("\n"),
      tooltipSubtitle: species.name,
      tooltipRarity: SkillTreeRarity.LEGENDARY,
      tooltipData: {
        kind: "other" as const,
        types: form.type2 !== null ? [form.type1, form.type2] : [form.type1],
        abilities: allAbilitiesForForm,
        baseStats: [...sourceBaseStats],
        afterStats: [...afterBaseStats],
        deltaStats: [...deltaStats],
        description: desc,
        speciesName: species.name,
      },
    };
  }

  private async applyChoice(
    choiceIdx: 0 | 1 | 2,
    otherSpeciesId: Species,
    selfAfterBaseStats: integer[],
    otherAfterBaseStats: integer[]
  ): Promise<void> {
    try {
      this.pokemon.rankUpCount++;
      if (isDuelmonSpecies(this.pokemon.species.speciesId)) {
        this.pokemon.duelmonBandsConsumed++;
        this.pokemon.duelmonLastTriggerLevel = this.pokemon.level;
      }
      if (choiceIdx !== 0 && otherSpeciesId && otherSpeciesId !== this.pokemon.species.speciesId) {
        this.scene.unshiftPhase(new RankUpTransformPhase(
          this.scene,
          this.pokemon,
          otherSpeciesId,
          otherAfterBaseStats
        ));
      } else {
        const afterBaseStats = selfAfterBaseStats;
        const species = this.pokemon.makeSpeciesUnique();
        const currentForm = species.forms && species.forms.length > this.pokemon.formIndex ? species.forms[this.pokemon.formIndex] : species;
        currentForm.baseStats = [...afterBaseStats];
        currentForm.baseTotal = afterBaseStats.reduce((sum, s) => sum + s, 0);
        this.pokemon.calculateStats();
        if (isDuelmonSpecies(this.pokemon.species.speciesId)) {
          ensureDuelmonBandRolled(this.scene, this.pokemon as PlayerPokemon);
        }
        await this.pokemon.updateInfo(true);

        const soulRank = this.pokemon.rankUpCount + 1;
        const preStateSnapshot = {
          altBuildSpriteColors: this.pokemon.altBuildSpriteColors ? [...this.pokemon.altBuildSpriteColors] : null,
          altBuildTargetColors: this.pokemon.altBuildTargetColors ? [...this.pokemon.altBuildTargetColors] : null,
          altBuildBlendMode: this.pokemon.altBuildBlendMode,
          altBuildInversionFactor: this.pokemon.altBuildInversionFactor || 0.0,
          altBuildRank: this.pokemon.embracePaletteRank || 0
        };
        this.pokemon.embracePaletteRank = soulRank;
        this.pokemon.altBuildSpriteColors = undefined;
        this.pokemon.altBuildTargetColors = undefined;
        const rank = Math.min(10, soulRank);
        const embraceTarget = ["#1A0A2E", "#5A1BB2", "#0C0C0C", "#6340AB"];
        const embraceDark = ["#0C0C0C", "#4B0082", "#000000", "#371B58"];
        const basePalette = rank >= 6 ? embraceDark : embraceTarget;
        const colorIntensity = Math.min(1.0, 0.20 + (rank * 0.08));
        const adjustedPalette = basePalette.map(hex => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const gray = Math.round((r + g + b) / 3);
          const ar = Math.round(gray + (r - gray) * colorIntensity);
          const ag = Math.round(gray + (g - gray) * colorIntensity);
          const ab = Math.round(gray + (b - gray) * colorIntensity);
          return "#" + [ar, ag, ab].map(x => x.toString(16).padStart(2, "0")).join("");
        });
        const inversionFactor = Math.min(0.7, rank * 0.07);
        this.pokemon.updateAltBuildPalette({
          spriteColorPalette: { targetPalette: adjustedPalette, blendMode: "grayscale_overlay" },
          inversionFactor: inversionFactor,
        });

        (this.pokemon as any)._preStateAltBuildSnapshot = preStateSnapshot;

        const embraceFormChange = new SpeciesFormChange(
          this.pokemon.species.speciesId,
          this.pokemon.species.forms[this.pokemon.formIndex]?.formKey || "",
          SpeciesFormKey.ALT_BUILD,
          new SpeciesFormChangeManualTrigger()
        );
        this.scene.unshiftPhase(new FormChangePhase(
          this.scene,
          this.pokemon,
          embraceFormChange,
          false
        ));
      }
    } catch (err) {
      console.error("[RANK_UP] Failed to apply Rank Up choice:", err);
    }
  }

  private buildLootTypeOptions(config: RankUpUiConfig): ModifierTypeOption[] {
    return config.options.map((opt, i) => {
      const modType = new ModifierType(null, null, null, "rankup");
      modType.id = `rankup_${i}`;
      modType.setTier(
        opt.tooltipRarity === SkillTreeRarity.LEGENDARY ? ModifierTier.LUXURY :
        opt.tooltipRarity === SkillTreeRarity.MASTER ? ModifierTier.MASTER :
        opt.tooltipRarity === SkillTreeRarity.ULTRA ? ModifierTier.ULTRA :
        ModifierTier.ROGUE
      );
      (modType as any)._rankUpName = opt.label;
      (modType as any)._rankUpDescription = opt.tooltipBody?.replace(/\[color=[^\]]*\]/g, "").replace(/\[\/color\]/g, "") || opt.tooltipTitle;
      (modType as any)._rankUpIconAtlasKey = opt.iconAtlasKey;
      (modType as any)._rankUpIconFrame = opt.iconFrame;
      (modType as any)._rankUpTooltipData = (opt as any).tooltipData ?? null;

      Object.defineProperty(modType, 'name', {
        get() { return this._rankUpName; },
        configurable: true,
      });

      const origGetDescription = modType.getDescription.bind(modType);
      modType.getDescription = function(_scene: any) {
        return this._rankUpDescription ?? origGetDescription(_scene);
      };

      return new ModifierTypeOption(modType, 0, 0);
    });
  }
}