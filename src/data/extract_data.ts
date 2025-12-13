import { allSpecies, speciesStarters, starterPassiveAbilities, getPokemonSpecies } from './pokemon-species';
import { SpeciesFormKey } from "#enums/species-form-key";
import { pokemonSpeciesLevelMoves } from './pokemon-level-moves';
import { speciesEggMoves } from './egg-moves';
import { tmSpecies, tmPoolTiers } from './tms';
import { biomePokemonPools } from './biomes';
import { pokemonPrevolutions } from './pokemon-evolutions';
import { Type } from './type';
import { Abilities } from '../enums/abilities';
import { Moves } from '../enums/moves';
import { Biome } from '../enums/biome';

const getEnumSize = (enumObj: any): number => {
  return Object.keys(enumObj).filter(key => !isNaN(Number(key))).length;
};

const TYPE_COUNT = getEnumSize(Type) - 3;
const MOVE_COUNT = getEnumSize(Moves) - 1;
const ABILITY_COUNT = getEnumSize(Abilities) - 1;
const BIOME_COUNT = getEnumSize(Biome);

function getTypeFID(typeId: number): number {
  return typeId;
}

function getAbilityFID(abilityId: number): number {
  return TYPE_COUNT + abilityId - 1;
}

function getMoveFID(moveId: number): number {
  return TYPE_COUNT + ABILITY_COUNT + moveId - 1;
}

function getBiomeFID(biomeId: number): number {
  return 1678 + biomeId;
}

function getGenFID(generation: number): number {
  return 1646 + generation - 1;
}

function getCostFID(cost: number): number {
  return 1655 + Math.min(cost - 1, 9);
}

function getGenderFID(): number {
  return 1665;
}

function getStarterFID(isStarter: boolean, cost: number): number | null {
  if (!isStarter) return null;
  if (cost <= 3) return 1666;
  if (cost <= 5) return 1667;
  return 1668;
}

function getEggTierFID(eggTier: number): number {
  return 1669 + eggTier;
}

function getVariantFID(hasVariants: boolean, variantTier?: number): number | null {
  if (!hasVariants) return null;
  return 1675 + (variantTier || 0);
}

function getEggTier(cost: number): number {
  if (cost <= 3) return 0;
  if (cost <= 5) return 1;
  if (cost <= 7) return 2;
  return 3;
}

function getImageName(speciesId: number, form: any, formIndex: number): string {
  if (formIndex === 0) {
    return speciesId.toString();
  }

  const formKey = form.formKey || '';
  const formName = form.formName || '';

  if (formKey === SpeciesFormKey.GLITCH ||
      formKey === SpeciesFormKey.GLITCH_B ||
      formKey === SpeciesFormKey.GLITCH_C ||
      formKey === SpeciesFormKey.GLITCH_D ||
      formKey === SpeciesFormKey.GLITCH_E) {
    return formName;
  }

  if (formKey === SpeciesFormKey.SMITTY ||
      formKey === SpeciesFormKey.SMITTY_B) {
    return formName;
  }

  if (formKey) {
    return `${speciesId}-${formKey}`;
  }

  return `${speciesId}_${formIndex}`;
}

function getFemaleDifsType(species: any, forms: any[]): number | undefined {
  if (forms.find(f => f.formKey === "female")) {
    return 2;
  }
  return species.genderDiffs ? 1 : undefined;
}

function getFamilyFID(speciesId: number): number {
  let rootSpeciesId = speciesId;

  while (pokemonPrevolutions.hasOwnProperty(rootSpeciesId)) {
    rootSpeciesId = pokemonPrevolutions[rootSpeciesId];
  }

  return 1712 + rootSpeciesId - 1;
}
function getBaseFormSpeciesId(speciesId: number): number {
  let baseSpeciesId = speciesId;

  while (pokemonPrevolutions.hasOwnProperty(baseSpeciesId)) {
    baseSpeciesId = pokemonPrevolutions[baseSpeciesId];
  }

  return baseSpeciesId;
}

function getEncounterValue(tier: number, timeOfDay: number): number {
  const rarities = [20, 40, 60, 80, 100, 120, 140, 160, 180];

  let baseValue = rarities[tier] || 20;

  const timeModifiers = [1, 2, 4, 8];
  if (timeOfDay >= 0 && timeOfDay < timeModifiers.length) {
    baseValue += timeModifiers[timeOfDay];
  }

  return baseValue;
}

function addMoveLearningData(data: any, speciesId: number): void {
  const levelMoves = pokemonSpeciesLevelMoves[speciesId] || [];
  levelMoves.forEach(([level, moveId]) => {
    const moveFID = getMoveFID(moveId);
    if (level === 0) {
      data[moveFID] = 0;
    } else if (level === -1) {
      data[moveFID] = -1;
    } else if (level >= 1 && level <= 200) {
      data[moveFID] = level;
    }
  });
  const baseFormSpeciesId = getBaseFormSpeciesId(speciesId);
  const eggMoves = speciesEggMoves[baseFormSpeciesId] || [];
  eggMoves.forEach(moveId => {
    const moveFID = getMoveFID(moveId);
    if (!data.hasOwnProperty(moveFID)) {
      data[moveFID] = 204;
    }
  });

  Object.keys(tmSpecies).forEach(moveIdStr => {
    const moveId = parseInt(moveIdStr);
    const compatibleSpecies = tmSpecies[moveId];

    if (compatibleSpecies.includes(speciesId)) {
      const moveFID = getMoveFID(moveId);
      if (!data.hasOwnProperty(moveFID)) {
        const tmTier = tmPoolTiers[moveId];
        const tmValue = tmTier === 0 ? 209 : tmTier === 1 ? 210 : 211;
        data[moveFID] = tmValue;
      }
    }
  });
}

function addBiomeEncounterData(data: any, speciesId: number): void {
  Object.keys(biomePokemonPools).forEach(biomeIdStr => {
    const biomeId = parseInt(biomeIdStr);
    const biomePools = biomePokemonPools[biomeId];

    Object.keys(biomePools).forEach(tierStr => {
      const tier = parseInt(tierStr);
      Object.keys(biomePools[tier]).forEach(todStr => {
        const encounters = biomePools[tier][todStr];

        encounters.forEach(entry => {
          if (typeof entry === 'number' && entry === speciesId) {
            const biomeFID = getBiomeFID(biomeId);
            if (!data[biomeFID]) data[biomeFID] = [];
            const encounterValue = getEncounterValue(tier, parseInt(todStr));
            data[biomeFID].push(encounterValue);
          } else if (typeof entry === 'object') {
            Object.values(entry).forEach(speciesArray => {
              if (Array.isArray(speciesArray) && speciesArray.includes(speciesId)) {
                const biomeFID = getBiomeFID(biomeId);
                if (!data[biomeFID]) data[biomeFID] = [];
                const encounterValue = getEncounterValue(tier, parseInt(todStr));
                data[biomeFID].push(encounterValue);
              }
            });
          }
        });
      });
    });
  });
}

function extractPokemonFormData(species: any, form: any, formIndex: number, row: number): any {
  const speciesId = species.speciesId;
  const baseFormSpeciesId = getBaseFormSpeciesId(speciesId);

  const baseData: any = {
    row: row,
    dex: speciesId,
    img: getImageName(speciesId, form, formIndex),
    t1: getTypeFID(form.type1),
    ...(form.type2 !== null && { t2: getTypeFID(form.type2) }),
    a1: getAbilityFID(form.ability1),
    ...(form.ability2 !== form.ability1 && { a2: getAbilityFID(form.ability2) }),
    ...(form.abilityHidden !== Abilities.NONE && { ha: getAbilityFID(form.abilityHidden) }),
    ...(starterPassiveAbilities[speciesId] && { pa: getAbilityFID(starterPassiveAbilities[speciesId]) }),

    bst: form.baseTotal,
    hp: form.baseStats[0],
    atk: form.baseStats[1],
    def: form.baseStats[2],
    spa: form.baseStats[3],
    spd: form.baseStats[4],
    spe: form.baseStats[5],

    co: speciesStarters[speciesId] || 1,

    et: getEggTier(speciesStarters[speciesId] || 1),

    ge: species.generation,

    sh: 0,

    ...(species.genderDiffs && { fe: getFemaleDifsType(species, species.forms || []) }),

    fa: getFamilyFID(speciesId),

    ...(form.isStarterSelectable && { st: 1 }),
  };
  const eggMoves = speciesEggMoves[baseFormSpeciesId] || [];
  eggMoves.slice(0, 4).forEach((moveId, index) => {
    baseData[`e${index + 1}`] = getMoveFID(moveId);
  });

  const fidMappings: any = {};

  addMoveLearningData(fidMappings, speciesId);

  fidMappings[getTypeFID(form.type1)] = 307;
  if (form.type2 !== null) {
    fidMappings[getTypeFID(form.type2)] = 308;
  }

  fidMappings[getAbilityFID(form.ability1)] = 309;
  if (form.ability2 !== form.ability1) {
    fidMappings[getAbilityFID(form.ability2)] = 310;
  }
  if (form.abilityHidden !== Abilities.NONE) {
    fidMappings[getAbilityFID(form.abilityHidden)] = 311;
  }

  if (starterPassiveAbilities[baseFormSpeciesId]) {
    fidMappings[getAbilityFID(starterPassiveAbilities[baseFormSpeciesId])] = 312;
  }
  fidMappings[getGenFID(species.generation)] = 350;
  fidMappings[getCostFID(speciesStarters[speciesId] || 1)] = 351;
  if (species.genderDiffs) {
    fidMappings[getGenderFID()] = 352;
  }
  const starterFID = getStarterFID(form.isStarterSelectable, speciesStarters[speciesId] || 1);
  if (starterFID) {
    fidMappings[starterFID] = 353;
  }
  fidMappings[getEggTierFID(getEggTier(speciesStarters[speciesId] || 1))] = 354;
  const hasVariants = getPokemonSpecies(speciesId).hasVariants();
  if (hasVariants) {
    fidMappings[getVariantFID(true, 0)] = 355;
  }
  fidMappings[getFamilyFID(speciesId)] = 356;

  addBiomeEncounterData(fidMappings, speciesId);

  const result: any = {};

  Object.keys(baseData).forEach(key => {
    result[key] = baseData[key];
  });

  Object.keys(fidMappings).forEach(key => {
    result[key] = fidMappings[key];
  });

  return result;
}

export function extractAllPokemonData(): any[] {
  const results: any[] = [];
  let rowCounter = 1;

  console.log(`Types: 0 to ${TYPE_COUNT - 1} (${TYPE_COUNT} types)`);
  console.log(`Abilities: ${TYPE_COUNT} to ${TYPE_COUNT + ABILITY_COUNT - 1} (${ABILITY_COUNT} abilities)`);
  console.log(`Moves: ${TYPE_COUNT + ABILITY_COUNT} to ${TYPE_COUNT + ABILITY_COUNT + MOVE_COUNT - 1} (${MOVE_COUNT} moves)`);
  console.log(`Biomes: 1678 to ${1678 + BIOME_COUNT - 1} (${BIOME_COUNT} biomes)`);

  for (const species of allSpecies) {
    const speciesId = species.speciesId;

    if (!speciesId || speciesId <= 0) continue;

    const forms = species.forms && species.forms.length > 0 ? species.forms : [species];

    for (let formIndex = 0; formIndex < forms.length; formIndex++) {
      const currentForm = forms[formIndex];
      const pokemonData = extractPokemonFormData(species, currentForm, formIndex, rowCounter);
      rowCounter++;

      if (pokemonData) {
        results.push(pokemonData);
      }
    }
  }

  return results;
}

export function outputPokemonData(outputToConsole: boolean = true): void {
  try {
    const pokemonData = extractAllPokemonData();

    const jsonOutput = JSON.stringify(pokemonData, (key, value) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const ordered: any = {};

        const alphaKeys = ['row', 'dex', 'img', 't1', 't2', 'a1', 'a2', 'ha', 'pa',
                          'bst', 'hp', 'atk', 'def', 'spa', 'spd', 'spe', 'co', 'et',
                          'ge', 'sh', 'fe', 'fa', 'st', 'e1', 'e2', 'e3', 'e4'];

        alphaKeys.forEach(alphaKey => {
          if (alphaKey in value) {
            ordered[alphaKey] = value[alphaKey];
          }
        });

        const numericKeys = Object.keys(value)
          .filter(k => !alphaKeys.includes(k) && !isNaN(Number(k)))
          .sort((a, b) => Number(a) - Number(b));

        numericKeys.forEach(numKey => {
          ordered[numKey] = value[numKey];
        });

        Object.keys(value).forEach(k => {
          if (!alphaKeys.includes(k) && isNaN(Number(k))) {
            ordered[k] = value[k];
          }
        });

        return ordered;
      }
      return value;
    }, 2);

    if (outputToConsole) {
      console.log('=== POKEMON DATA EXTRACTION ===');
      console.log(`Total entries: ${pokemonData.length}`);
      console.log('=== JSON OUTPUT ===');
      console.log(jsonOutput);
      console.log('=== END OUTPUT ===');
    } else {
      if (typeof window !== 'undefined') {
        const blob = new Blob([jsonOutput], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokevoid_pokemon_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Pokemon data saved to file successfully!');
      } else {
        console.log(jsonOutput);
      }
    }
  } catch (error) {
    console.error('Error extracting Pokemon data:', error);
  }
}