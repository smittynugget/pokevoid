import i18next from "i18next";
import BattleScene from "#app/battle-scene";
import Pokemon from "#app/field/pokemon";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { Stat, getStatName } from "#app/data/pokemon-stat";
import { allAbilities } from "#app/data/ability";
import * as Utils from "#app/utils";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { PlayableChampionData, PokemonAltBuildId } from "#app/system/playable-champions";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import {
  ModifierType,
  ModifierTypeGenerator,
  PokemonModifierType,
  modifierTypes,
  AddPokemonModifierType,
  AnyAbilityModifierType,
  TmModifierType, GeneratedPersistentModifierType,
} from "#app/modifier/modifier-type";
import {ChampionUtils} from "#app/system/champion-utils";
import { PlayerGender } from "#enums/player-gender";