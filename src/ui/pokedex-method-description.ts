import i18next from "i18next";
import { pokemonEvolutions, pokemonPrevolutions, SpeciesFormEvolution, EvolutionItem, SpeciesEvolutionCondition, SpeciesFriendshipEvolutionCondition } from "../data/pokemon-evolutions";
import { pokemonFormChanges, SpeciesFormChange, SpeciesFormChangeItemTrigger, SpeciesFormChangeWeatherTrigger, SpeciesFormChangeCompoundTrigger, SpeciesFormChangeManualTrigger, GlitchPieceTrigger, SmittyFormTrigger, AltBuildTrigger } from "../data/pokemon-forms";
import { FormChangeItem } from "../enums/form-change-items";
import { Species } from "../enums/species";
import { WeatherType } from "../enums/weather-type";

function getLocalizedFormChangeItemName(item: FormChangeItem): string {
  const itemKey = FormChangeItem[item];
  return i18next.t(`modifierType:FormChangeItem.${itemKey}`, itemKey);
}

function getFormChangeToThisPokemon(speciesId: Species, formKey: string): SpeciesFormChange | null {
  const formChanges = pokemonFormChanges[speciesId];
  if (!formChanges) {
    return null;
  }
  return formChanges.find(fc => fc.formKey === formKey) || null;
}

function parseFormChangeTrigger(formChange: SpeciesFormChange): string {
  const trigger: any = formChange.trigger;

  if (trigger instanceof SpeciesFormChangeCompoundTrigger) {
    const triggers = trigger.triggers;
    const itemTrigger = triggers.find(t => t instanceof SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger | undefined;
    const glitchTrigger = triggers.find(t => t instanceof GlitchPieceTrigger) as GlitchPieceTrigger | undefined;

    if (glitchTrigger && itemTrigger) {
      const itemName = getLocalizedFormChangeItemName(itemTrigger.item);
      return i18next.t("pokedex:glitchForm", { count: 5, item: itemName });
    }

    if (itemTrigger) {
      const itemName = getLocalizedFormChangeItemName(itemTrigger.item);
      return i18next.t("pokedex:megaEvolution", { megaStone: itemName });
    }
  }

  if (trigger instanceof SpeciesFormChangeItemTrigger) {
    const itemKey = FormChangeItem[trigger.item];
    const itemName = getLocalizedFormChangeItemName(trigger.item);

    if (trigger.item === FormChangeItem.MAX_MUSHROOMS) {
      return i18next.t("pokedex:gigantamax");
    }

    if (trigger.item === FormChangeItem.BLUE_ORB) {
      return i18next.t("pokedex:primalReversion", { orb: itemName });
    }

    if (trigger.item === FormChangeItem.RED_ORB) {
      return i18next.t("pokedex:primalReversion", { orb: itemName });
    }

    if (itemKey && (itemKey.includes("ITE") || itemKey.includes("ite"))) {
      return i18next.t("pokedex:megaEvolution", { megaStone: itemName });
    }

    return i18next.t("pokedex:useItem", { item: itemName || "Special Item" });
  }

  if (trigger instanceof SpeciesFormChangeWeatherTrigger) {
    const weathers = trigger.weathers;
    const weatherNames = weathers.map(w => WeatherType[w]).join("/");
    return i18next.t("pokedex:weatherForm", { weather: weatherNames });
  }

  if (trigger instanceof GlitchPieceTrigger) {
    const glitchItem = getLocalizedFormChangeItemName(FormChangeItem.GLITCHI_GLITCHI_FRUIT);
    return i18next.t("pokedex:glitchForm", { count: 5, item: glitchItem });
  }

  if (trigger instanceof SmittyFormTrigger) {
    const items = trigger.requiredItems;
    if (items && items.length >= 4) {
      return i18next.t("pokedex:smittyForm", {
        item1: getLocalizedFormChangeItemName(items[0]),
        item2: getLocalizedFormChangeItemName(items[1]),
        item3: getLocalizedFormChangeItemName(items[2]),
        item4: getLocalizedFormChangeItemName(items[3])
      });
    }
    return i18next.t("pokedex:smittyForm", { item1: "?", item2: "?", item3: "?", item4: "?" });
  }

  if (trigger instanceof AltBuildTrigger) {
    return i18next.t("pokedex:altBuild");
  }

  if (trigger instanceof SpeciesFormChangeManualTrigger) {
    return i18next.t("pokedex:abilityForm");
  }

  return i18next.t("pokedex:useItem", { item: "Special Item" });
}

function getEvolutionToThisPokemon(speciesId: Species, evoFormKey?: string): SpeciesFormEvolution | null {
  const preEvoSpecies = pokemonPrevolutions[speciesId];
  if (!preEvoSpecies) {
    return null;
  }
  const evolutions = pokemonEvolutions[preEvoSpecies];
  if (!evolutions) {
    return null;
  }
  if (evoFormKey) {
    const formMatch = evolutions.find(ev => ev.speciesId === speciesId && ev.evoFormKey === evoFormKey);
    if (formMatch) return formMatch;
  }
  return evolutions.find(ev => ev.speciesId === speciesId) || null;
}

function parseEvolutionCondition(condition: SpeciesEvolutionCondition, level: number): string | null {
  if (condition instanceof SpeciesFriendshipEvolutionCondition) {
    const friendshipCond = condition as SpeciesFriendshipEvolutionCondition;
    const amount = friendshipCond.friendshipAmount.toString();
    if (friendshipCond.secondaryPredicate) {
      const secondaryStr = friendshipCond.secondaryPredicate.toString();
      if (secondaryStr.includes("TimeOfDay.DAY") || secondaryStr.includes("TimeOfDay.DAWN")) {
        return i18next.t("pokedex:friendshipAtTime", { amount, time: i18next.t("pokedex:timeDay") });
      }
      if (secondaryStr.includes("TimeOfDay.NIGHT") || secondaryStr.includes("TimeOfDay.DUSK")) {
        return i18next.t("pokedex:friendshipAtTime", { amount, time: i18next.t("pokedex:timeNight") });
      }
      if (secondaryStr.includes("Type.FAIRY")) {
        return i18next.t("pokedex:friendshipWithMoveType", { amount, type: "Fairy" });
      }
    }
    return i18next.t("pokedex:friendship", { amount });
  }

  const predicateStr = condition.predicate.toString();
  if (predicateStr.includes("getTimeOfDay")) {
    if (predicateStr.includes("TimeOfDay.DAWN")) {
      return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDawn") });
    } else if (predicateStr.includes("TimeOfDay.DAY")) {
      return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDay") });
    } else if (predicateStr.includes("TimeOfDay.DUSK")) {
      return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeDusk") });
    } else if (predicateStr.includes("TimeOfDay.NIGHT")) {
      return i18next.t("pokedex:levelUpAtTime", { level: level > 1 ? level : "", time: i18next.t("pokedex:timeNight") });
    }
  }

  if (predicateStr.includes("Gender.MALE")) {
    return i18next.t("pokedex:genderRequired", { gender: i18next.t("pokedex:male") });
  } else if (predicateStr.includes("Gender.FEMALE")) {
    return i18next.t("pokedex:genderRequired", { gender: i18next.t("pokedex:female") });
  }

  if (predicateStr.includes("stats[Stat.ATK]") && predicateStr.includes("stats[Stat.DEF]")) {
    let comparison = "=";
    if (/ATK\]\s*>\s*p/.test(predicateStr)) comparison = ">";
    else if (/ATK\]\s*<\s*p/.test(predicateStr)) comparison = "<";
    return i18next.t("pokedex:statComparison", { stat1: "ATK", comparison, stat2: "DEF" });
  }

  if (predicateStr.includes("biomeType")) {
    const biomeMatches = predicateStr.match(/Biome\.([A-Z_]+)/g);
    if (biomeMatches && biomeMatches.length > 0) {
      const biomeNames = biomeMatches.map(match => {
        const biomeName = match.replace("Biome.", "");
        return i18next.t(`biome:${biomeName}`, biomeName);
      });
      return i18next.t("pokedex:inBiome", { biome: biomeNames.join("/") });
    }
    return i18next.t("pokedex:inBiome", { biome: "specific biome" });
  }

  if (predicateStr.includes("WeatherType")) {
    if (predicateStr.includes("RAIN") || predicateStr.includes("FOG")) {
      return i18next.t("pokedex:duringWeather", { weather: i18next.t("pokedex:weatherRain") + "/" + i18next.t("pokedex:weatherFog") });
    }
    return i18next.t("pokedex:duringWeather", { weather: i18next.t("pokedex:weatherRain") });
  }

  if (predicateStr.includes("Type.DARK") && predicateStr.includes("getParty")) {
    return i18next.t("pokedex:partyHasType", { type: "Dark" });
  }

  if (predicateStr.includes("getParty().length < 6") && predicateStr.includes("pokeballCounts")) {
    return i18next.t("pokedex:partySpaceAndBall");
  }

  if (predicateStr.includes("dexData") && predicateStr.includes("caughtAttr")) {
    const speciesMatch = predicateStr.match(/Species\.(\w+)/);
    if (speciesMatch) {
      return i18next.t("pokedex:speciesCaught", { species: speciesMatch[1] });
    }
  }

  if (predicateStr.includes("moveset") || predicateStr.includes("moveId")) {
    const moveMatch = predicateStr.match(/Moves\.(\w+)/);
    if (moveMatch) {
      return i18next.t("pokedex:withMove", { move: moveMatch[1].replace(/_/g, " ") });
    }
  }

  if (predicateStr.includes("getMove().type") && predicateStr.includes("Type.STEEL")) {
    return i18next.t("pokedex:withMoveType", { type: "Steel" });
  }

  if (predicateStr.includes("Nature.")) {
    return i18next.t("pokedex:withNature", { nature: "specific" });
  }

  if (predicateStr.includes("randSeedInt")) {
    const percentMatch = predicateStr.match(/randSeedInt\((\d+)\)/);
    if (percentMatch) {
      const percent = Math.round(100 / parseInt(percentMatch[1]));
      return i18next.t("pokedex:randomChance", { percent });
    }
  }

  if (predicateStr.includes("formIndex")) {
    return i18next.t("pokedex:specificForm");
  }

  return null;
}

function getEvolutionDescription(evolution: SpeciesFormEvolution): string {
  const parts: string[] = [];
  if (evolution.level > 1) {
    parts.push(i18next.t("pokedex:levelUp", { level: evolution.level }));
  }
  const evolutionItem: any = (evolution as any).item;
  if (evolutionItem && evolutionItem !== EvolutionItem.NONE) {
    const itemKey = EvolutionItem[evolutionItem];
    const itemName = i18next.t(`modifierType:EvolutionItem.${itemKey}`, itemKey);
    if (parts.length > 0) {
      parts[0] += ` + ${itemName}`;
    } else {
      parts.push(i18next.t("pokedex:useItem", { item: itemName }));
    }
  }
  if (evolution.condition) {
    const conditionDesc = parseEvolutionCondition(evolution.condition, evolution.level);
    if (conditionDesc) {
      parts.push(conditionDesc);
    }
  }
  return parts.join(" + ") || i18next.t("pokedex:levelUp", { level: evolution.level });
}

export function getPokedexMethodDescription(speciesId: Species, formKey?: string): string | null {
  let description: string | null = null;
  if (formKey) {
    const formChange = getFormChangeToThisPokemon(speciesId, formKey);
    if (formChange) {
      description = parseFormChangeTrigger(formChange);
    }
  }
  if (!description) {
    const evolution = getEvolutionToThisPokemon(speciesId, formKey);
    if (evolution) {
      description = getEvolutionDescription(evolution);
    }
  }
  return description;
}