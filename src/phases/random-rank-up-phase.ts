import BattleScene from "#app/battle-scene.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { Phase } from "#app/phase.js";
import i18next from "i18next";
import { Mode } from "#app/ui/ui";
import type { RankUpUiConfig } from "#app/ui/rank-up-ui-handler";
import * as Utils from "#app/utils.js";
import { allAbilities } from "#app/data/ability";
import { pickRandomRankUpTypeCandidates } from "#app/data/random-rankups";
import { isDuelmonSpecies, pickTwoOtherDuelmonCandidatesByTagOverlap } from "#app/data/duelmon-rankups";
import { Gender } from "#app/data/gender";
import { getPokemonSpecies, PokemonSpeciesForm, allSpecies } from "#app/data/pokemon-species";
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
export class RandomRankUpPhase extends Phase {
  constructor(
    scene: BattleScene,
    private readonly pokemon: PlayerPokemon,
    private readonly lastLevel: integer,
    private readonly band: integer
  ) {
    super(scene);
  }

  start() {
    super.start();

    if (!this.pokemon) {
      this.end();
      return;
    }

    if (this.pokemon.randomRankUpBandUsed === this.band) {
      this.pokemon.randomRankUpBandPending = null;
      this.end();
      return;
    }
    if (this.pokemon.randomRankUpBandPending !== this.band) {
      this.pokemon.randomRankUpBandPending = this.band;
    }

    const currentSpeciesId = this.pokemon.species?.speciesId as Species;
    const currentForm = this.pokemon.getSpeciesForm();

    const plan = this.pokemon.computeRandomRankUpStatPlan(this.band, this.lastLevel);
    const sourceBst = currentForm.baseStats.reduce((sum: number, s: number) => sum + s, 0);
    const otherSpeciesIds = this.pickTwoOtherCandidates(currentSpeciesId, currentForm, sourceBst);

    const title = i18next.t("battle:randomRankUpTitle", { defaultValue: "SOUL SURGE" });
    const subtitle = i18next.t("battle:randomRankUpSubtitle", { defaultValue: "Darkness floods the soul, what will you do..." });

    const config: RankUpUiConfig = {
      title,
      subtitle,
      center: {
        label: this.pokemon.name,
        ...this.getIconModelForSpeciesForm(currentForm),
      },
      options: [
        this.buildSelfOptionModel(currentForm, plan.deltaStats, plan.deltaTotal),
        this.buildOtherOptionModel(otherSpeciesIds[0], plan.deltaStats, plan.deltaTotal, currentForm.baseStats, plan.afterBaseStats),
        this.buildOtherOptionModel(otherSpeciesIds[1], plan.deltaStats, plan.deltaTotal, currentForm.baseStats, plan.afterBaseStats),
      ],
      onSelect: async (choiceIdx: integer) => {
        const idx = Math.max(0, Math.min(2, Math.floor(choiceIdx))) as integer;
        const chosenSpeciesId = idx === 0 ? null : (otherSpeciesIds[idx - 1] ?? null);

        await this.scene.ui.setMode(Mode.MESSAGE);
        this.pokemon.rankUpCount++;

        if (chosenSpeciesId && chosenSpeciesId !== this.pokemon.species.speciesId) {
          const plan = this.pokemon.computeRandomRankUpStatPlan(this.band, this.lastLevel);
          this.scene.unshiftPhase(new RankUpTransformPhase(
            this.scene,
            this.pokemon as PlayerPokemon,
            chosenSpeciesId,
            plan.afterBaseStats,
            () => {
              this.pokemon.randomRankUpBandUsed = this.band;
              this.pokemon.randomRankUpBandPending = null;
            }
          ));
        } else {
          const preStateSnapshot = {
            altBuildSpriteColors: this.pokemon.altBuildSpriteColors ? [...this.pokemon.altBuildSpriteColors] : null,
            altBuildTargetColors: this.pokemon.altBuildTargetColors ? [...this.pokemon.altBuildTargetColors] : null,
            altBuildBlendMode: this.pokemon.altBuildBlendMode,
            altBuildInversionFactor: this.pokemon.altBuildInversionFactor || 0.0,
            altBuildRank: this.pokemon.embracePaletteRank || 0
          };
          await this.pokemon.applyRandomRankUpSelection(this.band, this.lastLevel, null);
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
        this.end();
      },
    };

    const typeOptions = this.buildLootTypeOptions(config);
    const displayConfig = {
      title: config.title || "RANDOM RANK UP",
      subtitle: config.subtitle || "A rare surge of power! Choose one option.",
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

  private pickTwoOtherCandidates(currentSpeciesId: Species, currentForm: PokemonSpeciesForm, sourceBst?: number): [Species, Species] {
    let picked: Species[] = [];

    this.scene.executeWithSeedOffset(() => {
      if (isDuelmonSpecies(currentSpeciesId)) {
        picked = pickTwoOtherDuelmonCandidatesByTagOverlap(currentSpeciesId, Utils.randSeedInt, [currentSpeciesId]);
      } else {
        picked = pickRandomRankUpTypeCandidates(currentForm.type1, currentForm.type2, Utils.randSeedInt, [currentSpeciesId], sourceBst);
      }

      const excluded = new Set<Species>([currentSpeciesId, ...picked]);
      while (picked.length < 2) {
        const pool = allSpecies.filter(s => s.isCatchable() && !excluded.has(s.speciesId));
        if (!pool.length) {
          break;
        }
        const next = pool[Utils.randSeedInt(pool.length)]?.speciesId as Species | undefined;
        if (next === undefined || excluded.has(next)) {
          continue;
        }
        picked.push(next);
        excluded.add(next);
      }

      picked = Array.from(new Set(picked)).filter(sid => sid !== currentSpeciesId);
      while (picked.length < 2) {
        const pool = allSpecies.filter(s => s.isCatchable() && s.speciesId !== currentSpeciesId);
        if (!pool.length) break;
        const next = pool[Utils.randSeedInt(pool.length)]?.speciesId as Species | undefined;
        if (next !== undefined && !picked.includes(next)) {
          picked.push(next);
        }
      }
    }, ((this.pokemon.id << 10) ^ (this.band << 4) ^ (this.pokemon.level << 1) ^ this.lastLevel) as integer, this.scene.waveSeed);

    const a = (picked[0] ?? currentSpeciesId) as Species;
    const b = (picked[1] ?? currentSpeciesId) as Species;
    return [a, b];
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
    const desc = i18next.t("battle:randomRankUpSelfDesc", { defaultValue: "Consume the void's energy to strengthen {{pokemonName}}'s soul.", pokemonName: this.pokemon.name });

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

    const displayName = i18next.t("battle:randomRankUpSelfLabel", { defaultValue: "Embrace" });

    return {
      label: displayName,
      ...this.getIconModelForSpeciesForm(currentForm),
      tooltipTitle: displayName,
      tooltipBody: lines.join("\n"),
      tooltipSubtitle: displayName,
      tooltipRarity: SkillTreeRarity.MASTER,
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

  private buildOtherOptionModel(otherSpeciesId: Species, deltaStats: integer[], deltaTotal: integer, sourceBaseStats?: integer[], afterBaseStats?: integer[]) {
    const uiTheme = (this.scene as BattleScene).uiTheme;
    const species = getPokemonSpecies(otherSpeciesId);
    const form = (species.forms && species.forms.length > 0 ? species.forms[0] : species) as unknown as PokemonSpeciesForm;

    const type1 = this.getTypeName(form.type1);
    const type2 = form.type2 !== null ? this.getTypeName(form.type2) : null;
    const abilityInfo = this.getAbilityInfoForSpeciesForm(form, this.pokemon.abilityIndex);

    const typeLabel = i18next.t("battle:rankUpTooltipType", { defaultValue: "Type:" });
    const abilityLabel = i18next.t("starterSelectUiHandler:ability", { defaultValue: "Ability:" });
    const statsLabel = i18next.t("battle:rankUpTooltipStats", { defaultValue: "Stats:" });
    const desc = i18next.t("battle:randomRankUpOtherDesc", { defaultValue: "The void warps reality. Seize that power to reshape {{currentName}}'s soul into {{pokemonName}}.", pokemonName: species.name, currentName: this.pokemon.name });

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
      label: i18next.t("battle:randomRankUpOtherLabel", { defaultValue: "Reshape" }),
      iconAtlasKey: form.getIconAtlasKey(0, this.pokemon.shiny, this.pokemon.variant),
      iconFrame: form.getIconId(female, 0, this.pokemon.shiny, this.pokemon.variant),
      iconScale: 0.6,
      tooltipTitle: i18next.t("battle:randomRankUpOtherTitle", { defaultValue: "Random Rank Up Option" }),
      tooltipBody: lines.join("\n"),
      tooltipSubtitle: species.name,
      tooltipRarity: SkillTreeRarity.MASTER,
      tooltipData: {
        kind: "other" as const,
        types: form.type2 !== null ? [form.type1, form.type2] : [form.type1],
        abilities: allAbilitiesForForm,
        baseStats: sourceBaseStats ? [...sourceBaseStats] : [...form.baseStats],
        afterStats: afterBaseStats ? [...afterBaseStats] : [...form.baseStats].map((v, i) => v + (deltaStats[i] ?? 0)),
        deltaStats: [...deltaStats],
        description: desc,
        speciesName: species.name,
      },
    };
  }

  private buildLootTypeOptions(config: RankUpUiConfig): ModifierTypeOption[] {
    return config.options.map((opt, i) => {
      const modType = new ModifierType(null, null, null, "rankup");
      modType.id = `rankup_${i}`;
      modType.setTier(
        opt.tooltipRarity === SkillTreeRarity.MASTER ? ModifierTier.MASTER :
        opt.tooltipRarity === SkillTreeRarity.LEGENDARY ? ModifierTier.LUXURY :
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