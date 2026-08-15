import BattleScene from "../battle-scene";
import { Phase } from "../phase";
import { PlayerPokemon } from "../field/pokemon";
import { Stat } from "../data/pokemon-stat";
import { Mode } from "../ui/ui";
import { ModifierTypeOption, AnyAbilityModifierType } from "../modifier/modifier-type";
import { AddPokemonModifierType } from "../modifier/modifier-type";
import { RandomStatSwitcherModifierType, REMOVED_ABILITIES } from "../modifier/modifier-type";
import { ModifierTier } from "../modifier/modifier-tier";
import { getAbilitiesForTypes } from "../system/type-ability-mappings";
import { allAbilities } from "../data/ability";
import { Type } from "../data/type";
import * as Utils from "../utils";
import i18next from "i18next";
import { assignTypeThemedMoves, getDefensiveWeaknesses, getCoverageTypes } from "../system/type-move-utils";

export class ShinyPowerPhase extends Phase {
  private shinyPokemon: PlayerPokemon[];
  private currentIndex: number = 0;

  constructor(scene: BattleScene) {
    super(scene);
    this.shinyPokemon = scene.getParty().filter(p => p && p.isShiny());
  }

  start(): void {
    super.start();
    if (this.scene.disableShinyPower || this.shinyPokemon.length === 0) {
      this.end();
      return;
    }
    this.processNext();
  }

  private processNext(): void {
    if (this.currentIndex >= this.shinyPokemon.length) {
      this.end();
      return;
    }
    const pokemon = this.shinyPokemon[this.currentIndex];
    this.currentIndex++;
    this.showVariantOptions(pokemon);
  }

  private generateVariant(original: PlayerPokemon): PlayerPokemon {
    const clone = this.scene.addPlayerPokemon(
      original.species,
      original.level,
      original.abilityIndex,
      original.formIndex,
      original.gender,
      original.shiny,
      original.variant,
      original.ivs,
      original.nature
    );
    clone.moveset = original.moveset.slice();
    clone.passive = original.passive;
    clone.altPassiveForRun = original.altPassiveForRun;

    if (original.isFusion() && original.fusionSpecies) {
      clone.fusionSpecies = original.fusionSpecies;
      clone.fusionFormIndex = original.fusionFormIndex;
      clone.fusionAbilityIndex = original.fusionAbilityIndex;
      clone.fusionShiny = original.fusionShiny;
      clone.fusionVariant = original.fusionVariant || 0;
      clone.fusionGender = original.fusionGender;
      clone.generateName();
    }

    const allStats = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const shuffled = [...allStats].sort(() => Utils.randSeedInt(3) - 1);

    const stat1From = shuffled[0];
    const stat1To = shuffled[1];
    const stat2From = shuffled[2];
    const stat2To = shuffled[3];

    const baseCopy = original.getSpeciesForm().baseStats.slice();
    const temp1 = baseCopy[stat1From];
    baseCopy[stat1From] = baseCopy[stat1To];
    baseCopy[stat1To] = temp1;

    const temp2 = baseCopy[stat2From];
    baseCopy[stat2From] = baseCopy[stat2To];
    baseCopy[stat2To] = temp2;

    (clone as any)._shinyPowerStatSwaps = [
      { from: stat1From, to: stat1To },
      { from: stat2From, to: stat2To }
    ];

    const types = original.getTypes(false).filter(t => t !== Type.UNKNOWN);
    const selectedType = types.length === 0 ? Type.NORMAL : (types.length === 1 ? types[0] : Utils.randSeedItem(types));
    let abilityPool = getAbilitiesForTypes([selectedType])
      .filter(id => {
        const ab: any = (allAbilities as any)?.[id];
        return !!ab && typeof ab.name === "string" && !ab.name.endsWith(" (N)");
      })
      .filter(id => !REMOVED_ABILITIES.includes(id));
    if (abilityPool.length === 0) {
      abilityPool = getAbilitiesForTypes(types)
        .filter(id => {
          const ab: any = (allAbilities as any)?.[id];
          return !!ab && typeof ab.name === "string" && !ab.name.endsWith(" (N)");
        })
        .filter(id => !REMOVED_ABILITIES.includes(id));
    }
    const shinyAbilityId = abilityPool.length > 0 ? Utils.randSeedItem(abilityPool) : null;
    (clone as any)._shinyPowerAbilityId = shinyAbilityId;

    if (shinyAbilityId != null) {
      clone.makeSpeciesUnique();
      if (clone.isFusion()) {
        clone.makeFusionSpeciesUnique();
      }
      const abilitySlot = clone.isFusion()
        ? clone.fusionAbilityIndex
        : clone.getCurrentAbilityIndex();
      clone.setAbility(shinyAbilityId, abilitySlot);
    }

    return clone;
  }

  private generateMoveVariant(original: PlayerPokemon): PlayerPokemon {
    const clone = this.scene.addPlayerPokemon(
      original.species,
      original.level,
      original.abilityIndex,
      original.formIndex,
      original.gender,
      original.shiny,
      original.variant,
      original.ivs,
      original.nature
    );
    clone.moveset = original.moveset.slice();
    clone.passive = original.passive;
    clone.altPassiveForRun = original.altPassiveForRun;

    if (original.isFusion() && original.fusionSpecies) {
      clone.fusionSpecies = original.fusionSpecies;
      clone.fusionFormIndex = original.fusionFormIndex;
      clone.fusionAbilityIndex = original.fusionAbilityIndex;
      clone.fusionShiny = original.fusionShiny;
      clone.fusionVariant = original.fusionVariant || 0;
      clone.fusionGender = original.fusionGender;
      clone.generateName();
    }

    const allStats = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const shuffled = [...allStats].sort(() => Utils.randSeedInt(3) - 1);
    const stat1From = shuffled[0];
    const stat1To = shuffled[1];
    const stat2From = shuffled[2];
    const stat2To = shuffled[3];

    (clone as any)._shinyPowerStatSwaps = [
      { from: stat1From, to: stat1To },
      { from: stat2From, to: stat2To }
    ];

    const types = original.getTypes(false).filter(t => t !== Type.UNKNOWN);
    const isDual = types.length >= 2;

    if (isDual) {
      assignTypeThemedMoves(this.scene, clone, [types[0], types[1]]);
    } else {
      const ownType = types[0] || Type.NORMAL;
      const weaknesses = getDefensiveWeaknesses([ownType]);
      const coverageTypes = getCoverageTypes(weaknesses);
      const bestCoverage = coverageTypes.length > 0
        ? Utils.randSeedItem(coverageTypes)
        : Type.NORMAL;
      assignTypeThemedMoves(this.scene, clone, [ownType, bestCoverage]);
    }

    (clone as any)._shinyPowerAbilityId = null;
    (clone as any)._shinyPowerMoveVariant = true;

    return clone;
  }

  private showVariantOptions(pokemon: PlayerPokemon): void {
    const variant1 = this.generateVariant(pokemon);
    const variant2 = this.generateVariant(pokemon);
    const variant3 = this.generateMoveVariant(pokemon);

    const originalOption = new ModifierTypeOption(new AddPokemonModifierType(pokemon, true), 0);
    const variant1Option = new ModifierTypeOption(new AddPokemonModifierType(variant1, true), 0);
    const variant2Option = new ModifierTypeOption(new AddPokemonModifierType(variant2, true), 0);
    const variant3Option = new ModifierTypeOption(new AddPokemonModifierType(variant3, true), 0);

    const typeOptions: ModifierTypeOption[] = [originalOption, variant1Option, variant2Option, variant3Option];
    for (const opt of typeOptions) {
      opt.type.setTier(ModifierTier.MASTER);
    }

    const callback = (rowCursor: number, cursor: number) => {
      if (rowCursor < 0 || cursor < 0) {
        this.scene.ui.setMode(
          Mode.LOOT_REWARD_SELECT, true, typeOptions, callback,
          { rerollCost: 0, permaRerollCost: 0 }, true,
          { title: i18next.t("shinyPower:title"), subtitle: i18next.t("shinyPower:subtitle"), hideShop: true, checkTeamOnly: true, isShinyPower: true }
        );
        this.scene.ui.playError();
        return false;
      }

      if (rowCursor !== 1) {
        this.scene.ui.playError();
        return false;
      }

      if (cursor < 0 || cursor > 3) {
        this.scene.ui.playError();
        return false;
      }

      const chosenPokemon = [pokemon, variant1, variant2, variant3][cursor];
      if (chosenPokemon && chosenPokemon !== pokemon) {
        const partyIndex = this.scene.getParty().indexOf(pokemon);
        if (partyIndex >= 0) {
          const swaps = (chosenPokemon as any)._shinyPowerStatSwaps;
          if (swaps) {
            for (const swap of swaps) {
              const statSwitcher = new RandomStatSwitcherModifierType(swap.from, swap.to);
              const modifier = statSwitcher.newModifier(pokemon);
              if (modifier) {
                this.scene.addModifier(modifier, false);
              }
            }
          }
          if ((chosenPokemon as any)._shinyPowerMoveVariant) {
            pokemon.moveset = chosenPokemon.moveset.slice();
          } else if ((chosenPokemon as any)._shinyPowerAbilityId != null) {
            const abilityMod = new AnyAbilityModifierType((chosenPokemon as any)._shinyPowerAbilityId).newModifier(pokemon);
            if (abilityMod) {
              this.scene.addModifier(abilityMod, false);
            }
          }
        }
      }

      [variant1, variant2, variant3].forEach(v => {
        if (v && v !== chosenPokemon) {
          try { v.destroy(); } catch (_e) {}
        }
      });

      this.scene.ui.clearText();
      this.scene.ui.setMode(Mode.MESSAGE);
      this.processNext();
      return true;
    };

    this.scene.ui.setMode(
      Mode.LOOT_REWARD_SELECT, true, typeOptions, callback,
      { rerollCost: 0, permaRerollCost: 0 }, true,
      { title: i18next.t("shinyPower:title"), subtitle: i18next.t("shinyPower:subtitle"), hideShop: true, checkTeamOnly: true, isShinyPower: true }
    );
  }
}