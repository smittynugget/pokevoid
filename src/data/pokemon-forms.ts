import {PokemonFormChangeItemModifier, GlitchPieceModifier, reduceGlitchPieceModifier} from "../modifier/modifier";
import Pokemon from "../field/pokemon";
import {
  allSpecies,
  isGlitchFormKey,
  PokemonForm,
  SpeciesFormKey,
  UniversalSmittyForm,
  universalSmittyForms,
    pokemonSmittyForms,
} from "./pokemon-species";
import { StatusEffect } from "./status-effect";
import { MoveCategory, allMoves } from "./move";
import { Constructor } from "#app/utils";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { TimeOfDay } from "#enums/time-of-day";
import { getPokemonNameWithAffix } from "#app/messages.js";
import i18next from "i18next";
import { WeatherType } from "./weather";
import {getMinNightmareTypeValue, setNightmareTypeInteractions, Type} from "#app/data/type";
import {FormChangeItem} from "#enums/form-change-items";
import { ModGlitchFormData, modGlitchFormData } from "./mod-glitch-form-data";


export type SpeciesFormChangeConditionPredicate = (p: Pokemon) => boolean;
export type SpeciesFormChangeConditionEnforceFunc = (p: Pokemon) => void;

export class SpeciesFormChange {
  public speciesId: Species;
  public preFormKey: string;
  public formKey: string;
  public trigger: SpeciesFormChangeTrigger;
  public quiet: boolean;
  public readonly conditions: SpeciesFormChangeCondition[];
  public modFormName: string;


  constructor(speciesId: Species, preFormKey: string, evoFormKey: string, trigger: SpeciesFormChangeTrigger, quiet: boolean = false, ...conditions: SpeciesFormChangeCondition[]) {
    this.speciesId = speciesId;
    this.preFormKey = preFormKey;
    this.formKey = evoFormKey;
    this.trigger = trigger;
    this.quiet = quiet;
    this.conditions = conditions;
  }

  canChange(pokemon: Pokemon): boolean {
    if (pokemon.species.speciesId !== this.speciesId) {
      return false;
    }

    if (!pokemon.species.forms.length) {
      return false;
    }

    const formKeys = pokemon.species.forms.map(f => f.formKey);
    if ((formKeys[pokemon.formIndex] !== this.preFormKey && pokemon.species.getGlitchFormName(false, pokemon.scene) == null) || isGlitchFormKey(pokemon.species.forms[pokemon.formIndex].formKey)) {
      return false;
    }

    if (formKeys[pokemon.formIndex] === this.formKey) {
      return false;
    }

    for (const condition of this.conditions) {
      if (!condition.predicate(pokemon)) {
        return false;
      }
    }

    if (!this.trigger.canChange(pokemon)) {
      return false;
    }

    return true;
  }

  findTrigger(triggerType: Constructor<SpeciesFormChangeTrigger>): SpeciesFormChangeTrigger | null {
    if (!this.trigger.hasTriggerType(triggerType)) {
      return null;
    }

    const trigger = this.trigger;

    if (trigger instanceof SpeciesFormChangeCompoundTrigger) {
      return trigger.triggers.find(t => t.hasTriggerType(triggerType))!; // TODO: is this bang correct?
    }

    return trigger;
  }

    hasMatchingItemTrigger(item: FormChangeItem): boolean {
        if (this.trigger instanceof SpeciesFormChangeItemTrigger) {
            return this.trigger.item === item;
        } else if (this.trigger instanceof SpeciesFormChangeCompoundTrigger) {
            return this.trigger.triggers.some(t =>
                t instanceof SpeciesFormChangeItemTrigger && t.item === item
            );
        }
        return false;
    }

  isModForm(): boolean {
    return this.modFormName !== "";
  }
}

export class SpeciesFormChangeCondition {
  public predicate: SpeciesFormChangeConditionPredicate;
  public enforceFunc: SpeciesFormChangeConditionEnforceFunc | null;

  constructor(predicate: SpeciesFormChangeConditionPredicate, enforceFunc?: SpeciesFormChangeConditionEnforceFunc) {
    this.predicate = predicate;
    this.enforceFunc = enforceFunc!; // TODO: is this bang correct?
  }
}

export abstract class SpeciesFormChangeTrigger {
  canChange(pokemon: Pokemon): boolean {
    return true;
  }

  hasTriggerType(triggerType: Constructor<SpeciesFormChangeTrigger>): boolean {
    return this instanceof triggerType;
  }
}

export class SpeciesFormChangeManualTrigger extends SpeciesFormChangeTrigger {
  canChange(pokemon: Pokemon): boolean {
    return true;
  }
}

export class SpeciesFormChangeCompoundTrigger {
  public triggers: SpeciesFormChangeTrigger[];

  constructor(...triggers: SpeciesFormChangeTrigger[]) {
    this.triggers = triggers;
  }

  canChange(pokemon: Pokemon): boolean {
    for (const trigger of this.triggers) {
      if (!trigger.canChange(pokemon)) {
        return false;
      }
    }

    return true;
  }

  hasTriggerType(triggerType: Constructor<SpeciesFormChangeTrigger>): boolean {
    return !!this.triggers.find(t => t.hasTriggerType(triggerType));
  }
}

export class SpeciesFormChangeItemTrigger extends SpeciesFormChangeTrigger {
  public item: FormChangeItem;
  public active: boolean;

  constructor(item: FormChangeItem, active: boolean = true) {
    super();
    this.item = item;
    this.active = active;
  }

  canChange(pokemon: Pokemon): boolean {
    return !!pokemon.scene.findModifier(m => m instanceof PokemonFormChangeItemModifier && m.pokemonId === pokemon.id && m.formChangeItem === this.item && m.active === this.active);
  }
}


export class GlitchPieceTrigger extends SpeciesFormChangeTrigger {
  private requiredCount: number;

  constructor(requiredCount: number) {
    super();
    this.requiredCount = requiredCount;
  }

  canChange(pokemon: Pokemon): boolean {
    const glitchPieceModifier = pokemon.scene.findModifier(m => m instanceof GlitchPieceModifier) as GlitchPieceModifier;
    if ((glitchPieceModifier && glitchPieceModifier.getStackCount() >= this.requiredCount) && !pokemon.species.forms[pokemon.formIndex].formKey.includes("glitch")) {
      
      // reduceGlitchPieceModifier(pokemon, this.requiredCount);
      return true;
    }
    return false;
  }
}


export class SmittyFormTrigger extends SpeciesFormChangeTrigger {
  public requiredItems: FormChangeItem[];
  public name: string;

  constructor(requiredItems: FormChangeItem[], name: string = '') {
    super();
    this.requiredItems = requiredItems;
    this.name = name;
  }

  hasTriggerType(triggerType: Constructor<SpeciesFormChangeTrigger>): boolean {
    return this instanceof triggerType ||
        (triggerType === SpeciesFormChangeItemTrigger && this.requiredItems.length > 0);
  }

  matchesName(name: string): boolean {
    return this.name === name;
  }

  canChange(pokemon: Pokemon): boolean {
    const currentModifiers = pokemon.scene.findModifiers(m =>
        m instanceof PokemonFormChangeItemModifier &&
        m.pokemonId === pokemon.id
    ) as PokemonFormChangeItemModifier[];

    const currentItems = currentModifiers.map(m => m.formChangeItem);

    
    return this.requiredItems.every(requiredItem =>
        currentItems.includes(requiredItem)
    );
  }
}

export class SpeciesFormChangeTimeOfDayTrigger extends SpeciesFormChangeTrigger {
  public timesOfDay: TimeOfDay[];

  constructor(...timesOfDay: TimeOfDay[]) {
    super();
    this.timesOfDay = timesOfDay;
  }

  canChange(pokemon: Pokemon): boolean {
    return this.timesOfDay.indexOf(pokemon.scene.arena.getTimeOfDay()) > -1;
  }
}

export class SpeciesFormChangeActiveTrigger extends SpeciesFormChangeTrigger {
  public active: boolean;

  constructor(active: boolean = false) {
    super();
    this.active = active;
  }

  canChange(pokemon: Pokemon): boolean {
    return pokemon.isActive(true) === this.active;
  }
}

export class SpeciesFormChangeStatusEffectTrigger extends SpeciesFormChangeTrigger {
  public statusEffects: StatusEffect[];
  public invert: boolean;

  constructor(statusEffects: StatusEffect | StatusEffect[], invert: boolean = false) {
    super();
    if (!Array.isArray(statusEffects)) {
      statusEffects = [ statusEffects ];
    }
    this.statusEffects = statusEffects;
    this.invert = invert;
  }

  canChange(pokemon: Pokemon): boolean {
    return (this.statusEffects.indexOf(pokemon.status?.effect || StatusEffect.NONE) > -1) !== this.invert;
  }
}

export class SpeciesFormChangeMoveLearnedTrigger extends SpeciesFormChangeTrigger {
  public move: Moves;
  public known: boolean;

  constructor(move: Moves, known: boolean = true) {
    super();
    this.move = move;
    this.known = known;
  }

  canChange(pokemon: Pokemon): boolean {
    return (!!pokemon.moveset.filter(m => m?.moveId === this.move).length) === this.known;
  }
}

export abstract class SpeciesFormChangeMoveTrigger extends SpeciesFormChangeTrigger {
  public movePredicate: (m: Moves) => boolean;
  public used: boolean;

  constructor(move: Moves | ((m: Moves) => boolean), used: boolean = true) {
    super();
    this.movePredicate = typeof move === "function" ? move : (m: Moves) => m === move;
    this.used = used;
  }
}

export class SpeciesFormChangePreMoveTrigger extends SpeciesFormChangeMoveTrigger {
  canChange(pokemon: Pokemon): boolean {
    const command = pokemon.scene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
    return !!command?.move && this.movePredicate(command.move.move) === this.used;
  }
}

export class SpeciesFormChangePostMoveTrigger extends SpeciesFormChangeMoveTrigger {
  canChange(pokemon: Pokemon): boolean {
    return pokemon.summonData && !!pokemon.getLastXMoves(1).filter(m => this.movePredicate(m.move)).length === this.used;
  }
}

export class SpeciesDefaultFormMatchTrigger extends SpeciesFormChangeTrigger {
  private formKey: string;

  constructor(formKey: string) {
    super();
    this.formKey = formKey;
  }

  canChange(pokemon: Pokemon): boolean {
    return this.formKey === pokemon.species.forms[pokemon.scene.getSpeciesFormIndex(pokemon.species, pokemon.gender, pokemon.getNature(), true)].formKey;
  }
}

/**
 * Class used for triggering form changes based on weather.
 * Used by Castform.
 * @extends SpeciesFormChangeTrigger
 */
export class SpeciesFormChangeWeatherTrigger extends SpeciesFormChangeTrigger {
  /** The ability that  triggers the form change */
  public ability: Abilities;
  /** The list of weathers that trigger the form change */
  public weathers: WeatherType[];

  constructor(ability: Abilities, weathers: WeatherType[]) {
    super();
    this.ability = ability;
    this.weathers = weathers;
  }

  /**
   * Checks if the Pokemon has the required ability and is in the correct weather while
   * the weather or ability is also not suppressed.
   * @param {Pokemon} pokemon the pokemon that is trying to do the form change
   * @returns `true` if the Pokemon can change forms, `false` otherwise
   */
  canChange(pokemon: Pokemon): boolean {
    const currentWeather = pokemon.scene.arena.weather?.weatherType ?? WeatherType.NONE;
    const isWeatherSuppressed = pokemon.scene.arena.weather?.isEffectSuppressed(pokemon.scene);
    const isAbilitySuppressed = pokemon.summonData.abilitySuppressed;

    return !isAbilitySuppressed && !isWeatherSuppressed && (pokemon.hasAbility(this.ability) && this.weathers.includes(currentWeather));
  }
}

/**
 * Class used for reverting to the original form when the weather runs out
 * or when the user loses the ability/is suppressed.
 * Used by Castform.
 * @extends SpeciesFormChangeTrigger
 */
export class SpeciesFormChangeRevertWeatherFormTrigger extends SpeciesFormChangeTrigger {
  /** The ability that triggers the form change*/
  public ability: Abilities;
  /** The list of weathers that will also trigger a form change to original form */
  public weathers: WeatherType[];

  constructor(ability: Abilities, weathers: WeatherType[]) {
    super();
    this.ability = ability;
    this.weathers = weathers;
  }

  /**
   * Checks if the Pokemon has the required ability and the weather is one that will revert
   * the Pokemon to its original form or the weather or ability is suppressed
   * @param {Pokemon} pokemon the pokemon that is trying to do the form change
   * @returns `true` if the Pokemon will revert to its original form, `false` otherwise
   */
  canChange(pokemon: Pokemon): boolean {
    if (pokemon.hasAbility(this.ability, false, true)) {
      const currentWeather = pokemon.scene.arena.weather?.weatherType ?? WeatherType.NONE;
      const isWeatherSuppressed = pokemon.scene.arena.weather?.isEffectSuppressed(pokemon.scene);
      const isAbilitySuppressed = pokemon.summonData.abilitySuppressed;
      const summonDataAbility = pokemon.summonData.ability;
      const isAbilityChanged = summonDataAbility !== this.ability && summonDataAbility !== Abilities.NONE;

      if (this.weathers.includes(currentWeather) || isWeatherSuppressed || isAbilitySuppressed || isAbilityChanged) {
        return true;
      }
    }
    return false;
  }
}

export function getSpeciesFormChangeMessage(pokemon: Pokemon, formChange: SpeciesFormChange, preName: string): string {
  const isMega = formChange.formKey.indexOf(SpeciesFormKey.MEGA) > -1;
  const isGmax = formChange.formKey.indexOf(SpeciesFormKey.GIGANTAMAX) > -1;
  const isEmax = formChange.formKey.indexOf(SpeciesFormKey.ETERNAMAX) > -1;
  const isRevert = !isMega && formChange.formKey === pokemon.species.forms[0].formKey;
  if (isMega) {
    return i18next.t("battlePokemonForm:megaChange", { preName, pokemonName: pokemon.name });
  }
  if (isGmax) {
    return i18next.t("battlePokemonForm:gigantamaxChange", { preName, pokemonName: pokemon.name });
  }
  if (isEmax) {
    return i18next.t("battlePokemonForm:eternamaxChange", { preName, pokemonName: pokemon.name });
  }
  if (isRevert) {
    return i18next.t("battlePokemonForm:revertChange", { pokemonName: getPokemonNameWithAffix(pokemon) });
  }
  if (pokemon.getAbility().id === Abilities.DISGUISE) {
    return i18next.t("battlePokemonForm:disguiseChange");
  }
  return i18next.t("battlePokemonForm:formChange", { preName });
}

/**
 * Gives a condition for form changing checking if a species is registered as caught in the player's dex data.
 * Used for fusion forms such as Kyurem and Necrozma.
 * @param species {@linkcode Species}
 * @returns A {@linkcode SpeciesFormChangeCondition} checking if that species is registered as caught
 */
function getSpeciesDependentFormChangeCondition(species: Species): SpeciesFormChangeCondition {
  return new SpeciesFormChangeCondition(p => !!p.scene.gameData.dexData[species].caughtAttr);
}

interface PokemonFormChanges {
  [key: string]: SpeciesFormChange[]
}

export const pokemonFormChanges: PokemonFormChanges = {
  [Species.VENUSAUR]: [
    new SpeciesFormChange(Species.VENUSAUR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.VENUSAURITE)),
    new SpeciesFormChange(Species.VENUSAUR, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.BLASTOISE]: [
    new SpeciesFormChange(Species.BLASTOISE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.BLASTOISINITE)),
    new SpeciesFormChange(Species.BLASTOISE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.CHARIZARD]: [
    new SpeciesFormChange(Species.CHARIZARD, "", SpeciesFormKey.MEGA_X, new SpeciesFormChangeItemTrigger(FormChangeItem.CHARIZARDITE_X)),
    new SpeciesFormChange(Species.CHARIZARD, "", SpeciesFormKey.MEGA_Y, new SpeciesFormChangeItemTrigger(FormChangeItem.CHARIZARDITE_Y)),
    new SpeciesFormChange(Species.CHARIZARD, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
  ],
  [Species.BUTTERFREE]: [
    new SpeciesFormChange(Species.BUTTERFREE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.BEEDRILL]: [
    new SpeciesFormChange(Species.BEEDRILL, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.BEEDRILLITE))
  ],
  [Species.PIDGEOT]: [
    new SpeciesFormChange(Species.PIDGEOT, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.PIDGEOTITE))
  ],
  [Species.PIKACHU]: [
    new SpeciesFormChange(Species.PIKACHU, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.PIKACHU, "partner", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.MEOWTH]: [
    new SpeciesFormChange(Species.MEOWTH, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.ALAKAZAM]: [
    new SpeciesFormChange(Species.ALAKAZAM, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.ALAKAZITE))
  ],
  [Species.MACHAMP]: [
    new SpeciesFormChange(Species.MACHAMP, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.SLOWBRO]: [
    new SpeciesFormChange(Species.SLOWBRO, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SLOWBRONITE))
  ],
  [Species.GENGAR]: [
    new SpeciesFormChange(Species.GENGAR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GENGARITE)),
    new SpeciesFormChange(Species.GENGAR, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.KINGLER]: [
    new SpeciesFormChange(Species.KINGLER, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.KANGASKHAN]: [
    new SpeciesFormChange(Species.KANGASKHAN, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.KANGASKHANITE))
  ],
  [Species.PINSIR]: [
    new SpeciesFormChange(Species.PINSIR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.PINSIRITE))
  ],
  [Species.GYARADOS]: [
    new SpeciesFormChange(Species.GYARADOS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GYARADOSITE))
  ],
  [Species.LAPRAS]: [
    new SpeciesFormChange(Species.LAPRAS, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.EEVEE]: [
    new SpeciesFormChange(Species.EEVEE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.EEVEE, "partner", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.SNORLAX]: [
    new SpeciesFormChange(Species.SNORLAX, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.AERODACTYL]: [
    new SpeciesFormChange(Species.AERODACTYL, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.AERODACTYLITE))
  ],
  [Species.MEWTWO]: [
    new SpeciesFormChange(Species.MEWTWO, "", SpeciesFormKey.MEGA_X, new SpeciesFormChangeItemTrigger(FormChangeItem.MEWTWONITE_X)),
    new SpeciesFormChange(Species.MEWTWO, "", SpeciesFormKey.MEGA_Y, new SpeciesFormChangeItemTrigger(FormChangeItem.MEWTWONITE_Y))
  ],
  [Species.AMPHAROS]: [
    new SpeciesFormChange(Species.AMPHAROS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.AMPHAROSITE))
  ],
  [Species.STEELIX]: [
    new SpeciesFormChange(Species.STEELIX, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.STEELIXITE))
  ],
  [Species.SCIZOR]: [
    new SpeciesFormChange(Species.SCIZOR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SCIZORITE))
  ],
  [Species.HERACROSS]: [
    new SpeciesFormChange(Species.HERACROSS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.HERACRONITE))
  ],
  [Species.HOUNDOOM]: [
    new SpeciesFormChange(Species.HOUNDOOM, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.HOUNDOOMINITE))
  ],
  [Species.TYRANITAR]: [
    new SpeciesFormChange(Species.TYRANITAR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.TYRANITARITE))
  ],
  [Species.SCEPTILE]: [
    new SpeciesFormChange(Species.SCEPTILE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SCEPTILITE))
  ],
  [Species.BLAZIKEN]: [
    new SpeciesFormChange(Species.BLAZIKEN, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.BLAZIKENITE))
  ],
  [Species.SWAMPERT]: [
    new SpeciesFormChange(Species.SWAMPERT, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SWAMPERTITE))
  ],
  [Species.GARDEVOIR]: [
    new SpeciesFormChange(Species.GARDEVOIR, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GARDEVOIRITE))
  ],
  [Species.SABLEYE]: [
    new SpeciesFormChange(Species.SABLEYE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SABLENITE))
  ],
  [Species.MAWILE]: [
    new SpeciesFormChange(Species.MAWILE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.MAWILITE))
  ],
  [Species.AGGRON]: [
    new SpeciesFormChange(Species.AGGRON, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.AGGRONITE))
  ],
  [Species.MEDICHAM]: [
    new SpeciesFormChange(Species.MEDICHAM, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.MEDICHAMITE))
  ],
  [Species.MANECTRIC]: [
    new SpeciesFormChange(Species.MANECTRIC, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.MANECTITE))
  ],
  [Species.SHARPEDO]: [
    new SpeciesFormChange(Species.SHARPEDO, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SHARPEDONITE))
  ],
  [Species.CAMERUPT]: [
    new SpeciesFormChange(Species.CAMERUPT, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.CAMERUPTITE))
  ],
  [Species.ALTARIA]: [
    new SpeciesFormChange(Species.ALTARIA, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.ALTARIANITE))
  ],
  [Species.BANETTE]: [
    new SpeciesFormChange(Species.BANETTE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.BANETTITE))
  ],
  [Species.ABSOL]: [
    new SpeciesFormChange(Species.ABSOL, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.ABSOLITE))
  ],
  [Species.GLALIE]: [
    new SpeciesFormChange(Species.GLALIE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GLALITITE))
  ],
  [Species.SALAMENCE]: [
    new SpeciesFormChange(Species.SALAMENCE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.SALAMENCITE))
  ],
  [Species.METAGROSS]: [
    new SpeciesFormChange(Species.METAGROSS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.METAGROSSITE))
  ],
  [Species.LATIAS]: [
    new SpeciesFormChange(Species.LATIAS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.LATIASITE))
  ],
  [Species.LATIOS]: [
    new SpeciesFormChange(Species.LATIOS, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.LATIOSITE))
  ],
  [Species.KYOGRE]: [
    new SpeciesFormChange(Species.KYOGRE, "", SpeciesFormKey.PRIMAL, new SpeciesFormChangeItemTrigger(FormChangeItem.BLUE_ORB))
  ],
  [Species.GROUDON]: [
    new SpeciesFormChange(Species.GROUDON, "", SpeciesFormKey.PRIMAL, new SpeciesFormChangeItemTrigger(FormChangeItem.RED_ORB))
  ],
  [Species.RAYQUAZA]: [
    new SpeciesFormChange(Species.RAYQUAZA, "", SpeciesFormKey.MEGA, new SpeciesFormChangeCompoundTrigger(new SpeciesFormChangeItemTrigger(FormChangeItem.RAYQUAZITE), new SpeciesFormChangeMoveLearnedTrigger(Moves.DRAGON_ASCENT)))
  ],
  [Species.DEOXYS]: [
    new SpeciesFormChange(Species.DEOXYS, "normal", "attack", new SpeciesFormChangeItemTrigger(FormChangeItem.SHARP_METEORITE)),
    new SpeciesFormChange(Species.DEOXYS, "normal", "defense", new SpeciesFormChangeItemTrigger(FormChangeItem.HARD_METEORITE)),
    new SpeciesFormChange(Species.DEOXYS, "normal", "speed", new SpeciesFormChangeItemTrigger(FormChangeItem.SMOOTH_METEORITE))
  ],
  [Species.LOPUNNY]: [
    new SpeciesFormChange(Species.LOPUNNY, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.LOPUNNITE))
  ],
  [Species.GARCHOMP]: [
    new SpeciesFormChange(Species.GARCHOMP, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GARCHOMPITE))
  ],
  [Species.LUCARIO]: [
    new SpeciesFormChange(Species.LUCARIO, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.LUCARIONITE))
  ],
  [Species.ABOMASNOW]: [
    new SpeciesFormChange(Species.ABOMASNOW, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.ABOMASITE))
  ],
  [Species.GALLADE]: [
    new SpeciesFormChange(Species.GALLADE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.GALLADITE))
  ],
  [Species.AUDINO]: [
    new SpeciesFormChange(Species.AUDINO, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.AUDINITE))
  ],
  [Species.DIALGA]: [
    new SpeciesFormChange(Species.DIALGA, "", SpeciesFormKey.ORIGIN, new SpeciesFormChangeItemTrigger(FormChangeItem.ADAMANT_CRYSTAL))
  ],
  [Species.PALKIA]: [
    new SpeciesFormChange(Species.PALKIA, "", SpeciesFormKey.ORIGIN, new SpeciesFormChangeItemTrigger(FormChangeItem.LUSTROUS_GLOBE))
  ],
  [Species.GIRATINA]: [
    new SpeciesFormChange(Species.GIRATINA, "altered", SpeciesFormKey.ORIGIN, new SpeciesFormChangeItemTrigger(FormChangeItem.GRISEOUS_CORE))
  ],
  [Species.SHAYMIN]: [
    new SpeciesFormChange(Species.SHAYMIN, "land", "sky", new SpeciesFormChangeItemTrigger(FormChangeItem.GRACIDEA)),
  ],
  [Species.ARCEUS]: [
    new SpeciesFormChange(Species.ARCEUS, "normal", "fighting", new SpeciesFormChangeItemTrigger(FormChangeItem.FIST_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "flying", new SpeciesFormChangeItemTrigger(FormChangeItem.SKY_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "poison", new SpeciesFormChangeItemTrigger(FormChangeItem.TOXIC_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "ground", new SpeciesFormChangeItemTrigger(FormChangeItem.EARTH_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "rock", new SpeciesFormChangeItemTrigger(FormChangeItem.STONE_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "bug", new SpeciesFormChangeItemTrigger(FormChangeItem.INSECT_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "ghost", new SpeciesFormChangeItemTrigger(FormChangeItem.SPOOKY_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "steel", new SpeciesFormChangeItemTrigger(FormChangeItem.IRON_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "fire", new SpeciesFormChangeItemTrigger(FormChangeItem.FLAME_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "water", new SpeciesFormChangeItemTrigger(FormChangeItem.SPLASH_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "grass", new SpeciesFormChangeItemTrigger(FormChangeItem.MEADOW_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "electric", new SpeciesFormChangeItemTrigger(FormChangeItem.ZAP_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "psychic", new SpeciesFormChangeItemTrigger(FormChangeItem.MIND_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "ice", new SpeciesFormChangeItemTrigger(FormChangeItem.ICICLE_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "dragon", new SpeciesFormChangeItemTrigger(FormChangeItem.DRACO_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "dark", new SpeciesFormChangeItemTrigger(FormChangeItem.DREAD_PLATE)),
    new SpeciesFormChange(Species.ARCEUS, "normal", "fairy", new SpeciesFormChangeItemTrigger(FormChangeItem.PIXIE_PLATE))
  ],
  [Species.DARMANITAN]: [
    new SpeciesFormChange(Species.DARMANITAN, "", "zen", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.DARMANITAN, "zen", "", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.GARBODOR]: [
    new SpeciesFormChange(Species.GARBODOR, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.TORNADUS]: [
    new SpeciesFormChange(Species.TORNADUS, SpeciesFormKey.INCARNATE, SpeciesFormKey.THERIAN, new SpeciesFormChangeItemTrigger(FormChangeItem.REVEAL_GLASS))
  ],
  [Species.THUNDURUS]: [
    new SpeciesFormChange(Species.THUNDURUS, SpeciesFormKey.INCARNATE, SpeciesFormKey.THERIAN, new SpeciesFormChangeItemTrigger(FormChangeItem.REVEAL_GLASS))
  ],
  [Species.LANDORUS]: [
    new SpeciesFormChange(Species.LANDORUS, SpeciesFormKey.INCARNATE, SpeciesFormKey.THERIAN, new SpeciesFormChangeItemTrigger(FormChangeItem.REVEAL_GLASS))
  ],
  [Species.KYUREM]: [
    new SpeciesFormChange(Species.KYUREM, "", "black", new SpeciesFormChangeItemTrigger(FormChangeItem.DARK_STONE), false, getSpeciesDependentFormChangeCondition(Species.ZEKROM)),
    new SpeciesFormChange(Species.KYUREM, "", "white", new SpeciesFormChangeItemTrigger(FormChangeItem.LIGHT_STONE), false, getSpeciesDependentFormChangeCondition(Species.RESHIRAM))
  ],
  [Species.KELDEO]: [
    new SpeciesFormChange(Species.KELDEO, "ordinary", "resolute", new SpeciesFormChangeMoveLearnedTrigger(Moves.SECRET_SWORD)),
    new SpeciesFormChange(Species.KELDEO, "resolute", "ordinary", new SpeciesFormChangeMoveLearnedTrigger(Moves.SECRET_SWORD, false))
  ],
  [Species.MELOETTA]: [
    new SpeciesFormChange(Species.MELOETTA, "aria", "pirouette", new SpeciesFormChangePostMoveTrigger(Moves.RELIC_SONG), true),
    new SpeciesFormChange(Species.MELOETTA, "pirouette", "aria", new SpeciesFormChangePostMoveTrigger(Moves.RELIC_SONG), true),
    new SpeciesFormChange(Species.MELOETTA, "pirouette", "aria", new SpeciesFormChangeActiveTrigger(false), true)
  ],
  [Species.GENESECT]: [
    new SpeciesFormChange(Species.GENESECT, "", "shock", new SpeciesFormChangeItemTrigger(FormChangeItem.SHOCK_DRIVE)),
    new SpeciesFormChange(Species.GENESECT, "", "burn", new SpeciesFormChangeItemTrigger(FormChangeItem.BURN_DRIVE)),
    new SpeciesFormChange(Species.GENESECT, "", "chill", new SpeciesFormChangeItemTrigger(FormChangeItem.CHILL_DRIVE)),
    new SpeciesFormChange(Species.GENESECT, "", "douse", new SpeciesFormChangeItemTrigger(FormChangeItem.DOUSE_DRIVE))
  ],
  [Species.GRENINJA]: [
    new SpeciesFormChange(Species.GRENINJA, "battle-bond", "ash", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.GRENINJA, "ash", "battle-bond", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.PALAFIN] : [
    new SpeciesFormChange(Species.PALAFIN, "zero", "hero", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.PALAFIN, "hero", "zero", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.AEGISLASH]: [
    new SpeciesFormChange(Species.AEGISLASH, "blade", "shield", new SpeciesFormChangePreMoveTrigger(Moves.KINGS_SHIELD), true, new SpeciesFormChangeCondition(p => p.hasAbility(Abilities.STANCE_CHANGE))),
    new SpeciesFormChange(Species.AEGISLASH, "shield", "blade", new SpeciesFormChangePreMoveTrigger(m => allMoves[m].category !== MoveCategory.STATUS), true, new SpeciesFormChangeCondition(p => p.hasAbility(Abilities.STANCE_CHANGE))),
    new SpeciesFormChange(Species.AEGISLASH, "blade", "shield", new SpeciesFormChangeActiveTrigger(false), true)
  ],
  [Species.XERNEAS]: [
    new SpeciesFormChange(Species.XERNEAS, "neutral", "active", new SpeciesFormChangeActiveTrigger(true), true),
    new SpeciesFormChange(Species.XERNEAS, "active", "neutral", new SpeciesFormChangeActiveTrigger(false), true)
  ],
  [Species.ZYGARDE]: [
    new SpeciesFormChange(Species.ZYGARDE, "50-pc", "complete", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.ZYGARDE, "complete", "50-pc", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.ZYGARDE, "10-pc", "complete", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.ZYGARDE, "complete", "10-pc", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.DIANCIE]: [
    new SpeciesFormChange(Species.DIANCIE, "", SpeciesFormKey.MEGA, new SpeciesFormChangeItemTrigger(FormChangeItem.DIANCITE))
  ],
  [Species.HOOPA]: [
    new SpeciesFormChange(Species.HOOPA, "", "unbound", new SpeciesFormChangeItemTrigger(FormChangeItem.PRISON_BOTTLE))
  ],
  [Species.WISHIWASHI]: [
    new SpeciesFormChange(Species.WISHIWASHI, "", "school", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.WISHIWASHI, "school", "", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.SILVALLY]: [
    new SpeciesFormChange(Species.SILVALLY, "normal", "fighting", new SpeciesFormChangeItemTrigger(FormChangeItem.FIGHTING_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "flying", new SpeciesFormChangeItemTrigger(FormChangeItem.FLYING_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "poison", new SpeciesFormChangeItemTrigger(FormChangeItem.POISON_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "ground", new SpeciesFormChangeItemTrigger(FormChangeItem.GROUND_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "rock", new SpeciesFormChangeItemTrigger(FormChangeItem.ROCK_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "bug", new SpeciesFormChangeItemTrigger(FormChangeItem.BUG_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "ghost", new SpeciesFormChangeItemTrigger(FormChangeItem.GHOST_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "steel", new SpeciesFormChangeItemTrigger(FormChangeItem.STEEL_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "fire", new SpeciesFormChangeItemTrigger(FormChangeItem.FIRE_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "water", new SpeciesFormChangeItemTrigger(FormChangeItem.WATER_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "grass", new SpeciesFormChangeItemTrigger(FormChangeItem.GRASS_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "electric", new SpeciesFormChangeItemTrigger(FormChangeItem.ELECTRIC_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "psychic", new SpeciesFormChangeItemTrigger(FormChangeItem.PSYCHIC_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "ice", new SpeciesFormChangeItemTrigger(FormChangeItem.ICE_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "dragon", new SpeciesFormChangeItemTrigger(FormChangeItem.DRAGON_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "dark", new SpeciesFormChangeItemTrigger(FormChangeItem.DARK_MEMORY)),
    new SpeciesFormChange(Species.SILVALLY, "normal", "fairy", new SpeciesFormChangeItemTrigger(FormChangeItem.FAIRY_MEMORY))
  ],
  [Species.MINIOR]: [
    new SpeciesFormChange(Species.MINIOR, "red-meteor", "red", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "red", "red-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "orange-meteor", "orange", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "orange", "orange-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "yellow-meteor", "yellow", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "yellow", "yellow-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "green-meteor", "green", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "green", "green-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "blue-meteor", "blue", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "blue", "blue-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "indigo-meteor", "indigo", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "indigo", "indigo-meteor", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "violet-meteor", "violet", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MINIOR, "violet", "violet-meteor", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.MIMIKYU]: [
    new SpeciesFormChange(Species.MIMIKYU, "disguised", "busted", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MIMIKYU, "busted", "disguised", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.NECROZMA]: [
    new SpeciesFormChange(Species.NECROZMA, "", "dawn-wings", new SpeciesFormChangeItemTrigger(FormChangeItem.N_LUNARIZER), false, getSpeciesDependentFormChangeCondition(Species.LUNALA)),
    new SpeciesFormChange(Species.NECROZMA, "", "dusk-mane", new SpeciesFormChangeItemTrigger(FormChangeItem.N_SOLARIZER), false, getSpeciesDependentFormChangeCondition(Species.SOLGALEO)),
    new SpeciesFormChange(Species.NECROZMA, "dawn-wings", "ultra", new SpeciesFormChangeItemTrigger(FormChangeItem.ULTRANECROZIUM_Z)),
    new SpeciesFormChange(Species.NECROZMA, "dusk-mane", "ultra", new SpeciesFormChangeItemTrigger(FormChangeItem.ULTRANECROZIUM_Z))
  ],
  [Species.MELMETAL]: [
    new SpeciesFormChange(Species.MELMETAL, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.RILLABOOM]: [
    new SpeciesFormChange(Species.RILLABOOM, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.CINDERACE]: [
    new SpeciesFormChange(Species.CINDERACE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.INTELEON]: [
    new SpeciesFormChange(Species.INTELEON, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.CORVIKNIGHT]: [
    new SpeciesFormChange(Species.CORVIKNIGHT, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.ORBEETLE]: [
    new SpeciesFormChange(Species.ORBEETLE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.DREDNAW]: [
    new SpeciesFormChange(Species.DREDNAW, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.COALOSSAL]: [
    new SpeciesFormChange(Species.COALOSSAL, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.FLAPPLE]: [
    new SpeciesFormChange(Species.FLAPPLE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.APPLETUN]: [
    new SpeciesFormChange(Species.APPLETUN, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.SANDACONDA]: [
    new SpeciesFormChange(Species.SANDACONDA, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.TOXTRICITY]: [
    new SpeciesFormChange(Species.TOXTRICITY, "amped", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.TOXTRICITY, "lowkey", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.TOXTRICITY, SpeciesFormKey.GIGANTAMAX, "amped", new SpeciesFormChangeCompoundTrigger(new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS, false), new SpeciesDefaultFormMatchTrigger("amped"))),
    new SpeciesFormChange(Species.TOXTRICITY, SpeciesFormKey.GIGANTAMAX, "lowkey", new SpeciesFormChangeCompoundTrigger(new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS, false), new SpeciesDefaultFormMatchTrigger("lowkey")))
  ],
  [Species.CENTISKORCH]: [
    new SpeciesFormChange(Species.CENTISKORCH, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.HATTERENE]: [
    new SpeciesFormChange(Species.HATTERENE, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.GRIMMSNARL]: [
    new SpeciesFormChange(Species.GRIMMSNARL, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.ALCREMIE]: [
    new SpeciesFormChange(Species.ALCREMIE, "vanilla-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "ruby-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "matcha-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "mint-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "lemon-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "salted-cream", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "ruby-swirl", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "caramel-swirl", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.ALCREMIE, "rainbow-swirl", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.MORPEKO]: [
    new SpeciesFormChange(Species.MORPEKO, "full-belly", "hangry", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.MORPEKO, "hangry", "full-belly", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.COPPERAJAH]: [
    new SpeciesFormChange(Species.COPPERAJAH, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.DURALUDON]: [
    new SpeciesFormChange(Species.DURALUDON, "", SpeciesFormKey.GIGANTAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.ZACIAN]: [
    new SpeciesFormChange(Species.ZACIAN, "hero-of-many-battles", "crowned", new SpeciesFormChangeItemTrigger(FormChangeItem.RUSTED_SWORD))
  ],
  [Species.ZAMAZENTA]: [
    new SpeciesFormChange(Species.ZAMAZENTA, "hero-of-many-battles", "crowned", new SpeciesFormChangeItemTrigger(FormChangeItem.RUSTED_SHIELD))
  ],
  [Species.ETERNATUS]: [
    new SpeciesFormChange(Species.ETERNATUS, "", SpeciesFormKey.ETERNAMAX, new SpeciesFormChangeManualTrigger()),
    new SpeciesFormChange(Species.ETERNATUS, "", SpeciesFormKey.ETERNAMAX, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.URSHIFU]: [
    new SpeciesFormChange(Species.URSHIFU, "single-strike", SpeciesFormKey.GIGANTAMAX_SINGLE, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS)),
    new SpeciesFormChange(Species.URSHIFU, "rapid-strike", SpeciesFormKey.GIGANTAMAX_RAPID, new SpeciesFormChangeItemTrigger(FormChangeItem.MAX_MUSHROOMS))
  ],
  [Species.CALYREX]: [
    new SpeciesFormChange(Species.CALYREX, "", "ice", new SpeciesFormChangeItemTrigger(FormChangeItem.ICY_REINS_OF_UNITY), false, getSpeciesDependentFormChangeCondition(Species.GLASTRIER)),
    new SpeciesFormChange(Species.CALYREX, "", "shadow", new SpeciesFormChangeItemTrigger(FormChangeItem.SHADOW_REINS_OF_UNITY), false, getSpeciesDependentFormChangeCondition(Species.SPECTRIER))
  ],
  [Species.ENAMORUS]: [
    new SpeciesFormChange(Species.ENAMORUS, SpeciesFormKey.INCARNATE, SpeciesFormKey.THERIAN, new SpeciesFormChangeItemTrigger(FormChangeItem.REVEAL_GLASS))
  ],
  [Species.OGERPON]: [
    new SpeciesFormChange(Species.OGERPON, "teal-mask", "wellspring-mask", new SpeciesFormChangeItemTrigger(FormChangeItem.WELLSPRING_MASK)),
    new SpeciesFormChange(Species.OGERPON, "teal-mask", "hearthflame-mask", new SpeciesFormChangeItemTrigger(FormChangeItem.HEARTHFLAME_MASK)),
    new SpeciesFormChange(Species.OGERPON, "teal-mask", "cornerstone-mask", new SpeciesFormChangeItemTrigger(FormChangeItem.CORNERSTONE_MASK)),
    new SpeciesFormChange(Species.OGERPON, "teal-mask", "teal-mask-tera", new SpeciesFormChangeManualTrigger(), true), //When holding a Grass Tera Shard
    new SpeciesFormChange(Species.OGERPON, "teal-mask-tera", "teal-mask", new SpeciesFormChangeManualTrigger(), true), //When no longer holding a Grass Tera Shard
    new SpeciesFormChange(Species.OGERPON, "wellspring-mask", "wellspring-mask-tera", new SpeciesFormChangeManualTrigger(), true), //When holding a Water Tera Shard
    new SpeciesFormChange(Species.OGERPON, "wellspring-mask-tera", "wellspring-mask", new SpeciesFormChangeManualTrigger(), true), //When no longer holding a Water Tera Shard
    new SpeciesFormChange(Species.OGERPON, "hearthflame-mask", "hearthflame-mask-tera", new SpeciesFormChangeManualTrigger(), true), //When holding a Fire Tera Shard
    new SpeciesFormChange(Species.OGERPON, "hearthflame-mask-tera", "hearthflame-mask", new SpeciesFormChangeManualTrigger(), true), //When no longer holding a Fire Tera Shard
    new SpeciesFormChange(Species.OGERPON, "cornerstone-mask", "cornerstone-mask-tera", new SpeciesFormChangeManualTrigger(), true), //When holding a Rock Tera Shard
    new SpeciesFormChange(Species.OGERPON, "cornerstone-mask-tera", "cornerstone-mask", new SpeciesFormChangeManualTrigger(), true) //When no longer holding a Rock Tera Shard
  ],
  [Species.TERAPAGOS]: [
    new SpeciesFormChange(Species.TERAPAGOS, "", "terastal", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.TERAPAGOS, "terastal", "stellar", new SpeciesFormChangeManualTrigger(), true), //When holding a Stellar Tera Shard
    new SpeciesFormChange(Species.TERAPAGOS, "stellar", "terastal", new SpeciesFormChangeManualTrigger(), true) //When no longer holding a Stellar Tera Shard
  ],
  [Species.GALAR_DARMANITAN]: [
    new SpeciesFormChange(Species.GALAR_DARMANITAN, "", "zen", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.GALAR_DARMANITAN, "zen", "", new SpeciesFormChangeManualTrigger(), true)
  ],
  [Species.EISCUE]: [
    new SpeciesFormChange(Species.EISCUE, "", "no-ice", new SpeciesFormChangeManualTrigger(), true),
    new SpeciesFormChange(Species.EISCUE, "no-ice", "", new SpeciesFormChangeManualTrigger(), true),
  ],
  [Species.CRAMORANT]: [
    new SpeciesFormChange(Species.CRAMORANT, "", "gulping", new SpeciesFormChangeManualTrigger, true, new SpeciesFormChangeCondition(p => p.getHpRatio() >= .5)),
    new SpeciesFormChange(Species.CRAMORANT, "", "gorging", new SpeciesFormChangeManualTrigger, true, new SpeciesFormChangeCondition(p => p.getHpRatio() < .5)),
    new SpeciesFormChange(Species.CRAMORANT, "gulping", "", new SpeciesFormChangeManualTrigger, true),
    new SpeciesFormChange(Species.CRAMORANT, "gorging", "", new SpeciesFormChangeManualTrigger, true),
    new SpeciesFormChange(Species.CRAMORANT, "gulping", "", new SpeciesFormChangeActiveTrigger(false), true),
    new SpeciesFormChange(Species.CRAMORANT, "gorging", "", new SpeciesFormChangeActiveTrigger(false), true),
  ],
  [Species.CASTFORM]: [
    new SpeciesFormChange(Species.CASTFORM, "", "sunny", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.SUNNY, WeatherType.HARSH_SUN]), true),
    new SpeciesFormChange(Species.CASTFORM, "rainy", "sunny", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.SUNNY, WeatherType.HARSH_SUN]), true),
    new SpeciesFormChange(Species.CASTFORM, "snowy", "sunny", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.SUNNY, WeatherType.HARSH_SUN]), true),
    new SpeciesFormChange(Species.CASTFORM, "", "rainy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.RAIN, WeatherType.HEAVY_RAIN]), true),
    new SpeciesFormChange(Species.CASTFORM, "sunny", "rainy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.RAIN, WeatherType.HEAVY_RAIN]), true),
    new SpeciesFormChange(Species.CASTFORM, "snowy", "rainy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.RAIN, WeatherType.HEAVY_RAIN]), true),
    new SpeciesFormChange(Species.CASTFORM, "", "snowy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.HAIL, WeatherType.SNOW]), true),
    new SpeciesFormChange(Species.CASTFORM, "sunny", "snowy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.HAIL, WeatherType.SNOW]), true),
    new SpeciesFormChange(Species.CASTFORM, "rainy", "snowy", new SpeciesFormChangeWeatherTrigger(Abilities.FORECAST, [WeatherType.HAIL, WeatherType.SNOW]), true),
    new SpeciesFormChange(Species.CASTFORM, "sunny", "", new SpeciesFormChangeRevertWeatherFormTrigger(Abilities.FORECAST, [WeatherType.NONE, WeatherType.SANDSTORM, WeatherType.STRONG_WINDS, WeatherType.FOG]), true),
    new SpeciesFormChange(Species.CASTFORM, "rainy", "", new SpeciesFormChangeRevertWeatherFormTrigger(Abilities.FORECAST, [WeatherType.NONE, WeatherType.SANDSTORM, WeatherType.STRONG_WINDS, WeatherType.FOG]), true),
    new SpeciesFormChange(Species.CASTFORM, "snowy", "", new SpeciesFormChangeRevertWeatherFormTrigger(Abilities.FORECAST, [WeatherType.NONE, WeatherType.SANDSTORM, WeatherType.STRONG_WINDS, WeatherType.FOG]), true),
    new SpeciesFormChange(Species.CASTFORM, "sunny", "", new SpeciesFormChangeActiveTrigger(), true),
    new SpeciesFormChange(Species.CASTFORM, "rainy", "", new SpeciesFormChangeActiveTrigger(), true),
    new SpeciesFormChange(Species.CASTFORM, "snowy", "", new SpeciesFormChangeActiveTrigger(), true),
  ],
};

export const SMITTY_FORM_ITEMS = {
  
  'tartauros': [
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_TOUCH
  ],

  
  'zamowak': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_GLITCH
  ],

  
  'greyokai': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_SHARD,
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_CUBE
  ],

  
  'jormunza': [
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_CRYSTAL
  ],

  
  'licthulhu': [
    FormChangeItem.SMITTY_SHARD,
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_ORB
  ],

  
  'plasmist': [
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_FLUX,
    FormChangeItem.SMITTY_DARK,
    FormChangeItem.SMITTY_CORE
  ],

  
  'plustra': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_CRYSTAL
  ],

  
  'hellchar': [
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_FIBER
  ],

  
  'feareon': [
    FormChangeItem.SMITTY_PULSE,
    FormChangeItem.SMITTY_RELIC,
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_SHARD
  ],

  
  'omninom': [
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_NEBULA
  ],

  
  'necromew': [
    FormChangeItem.SMITTY_CORE,
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_DREAMS
  ],

  
  'diablotar': [
    FormChangeItem.SMITTY_PLASMA,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_MASK
  ],

  
  'smitom': [
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_FUEL
  ],
  
  'zoomer': [
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_CRYSTAL,
    FormChangeItem.SMITTY_FLUX
  ],

  
  'voidash': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_MASK,
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_PRISM
  ],

  
  'wahcky': [
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_CRYSTAL,
    FormChangeItem.SMITTY_POISON
  ],

  
  'wahzebub': [
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_RELIC
  ],

  
  'fineferno': [
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_HEART
  ],

  
  'sorbred': [
    FormChangeItem.SMITTY_FUEL,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_CRYSTAL
  ],

  
  'corpanzee': [
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_HEART,
    FormChangeItem.SMITTY_FEAR
  ],

  
  'plankling': [
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_PULSE
  ],

  
  'timbrick': [
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_PULSE
  ],

  
  'plankult': [
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_PULSE,
    FormChangeItem.SMITTY_ORB
  ],

  
  'sorbobo': [
    FormChangeItem.SMITTY_FLUX,
    FormChangeItem.SMITTY_SHARD,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_PLASMA
  ],

  
  'hamtaro': [
    FormChangeItem.SMITTY_ERROR,
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_JUICE
  ],
  
  'elmold': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_FLUX,
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_DREAMS
  ],

  'funghomp': [
    FormChangeItem.SMITTY_MASK,
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_SOUL
  ],

  
  'riddicus': [
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_RELIC,
    FormChangeItem.SMITTY_AURA
  ],

  
  'boxecutive': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_DREAMS
  ],

  
  'patnius': [
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_RELIC
  ],

  
  'tentacrim': [
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_FLUX,
    FormChangeItem.SMITTY_NEBULA
  ],

  
  'undeadtunasmit': [
    FormChangeItem.SMITTY_CORE,
    FormChangeItem.SMITTY_MASK,
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_NEBULA
  ],

  
  'genomander': [
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_ERROR,
    FormChangeItem.SMITTY_SHARD,
    FormChangeItem.SMITTY_FIBER
  ],

  
  'tormentle': [
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_PLASMA
  ],

  
  'terrorbulb': [
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_CORE,
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_CIRCUIT
  ],

  
  'scarablanc': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_JUICE
  ],

  
  'batmare': [
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_ERROR
  ],

  
  'dankitar': [
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_SHARD,
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_ERROR
  ],
  
  'cephaloom': [
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_FUEL,
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_AURA
  ],

  
  'smitward': [
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_CORE
  ],

  
  'gastmoji': [
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_TOUCH,
    FormChangeItem.SMITTY_HUMOR
  ],

  
  'niteknite': [
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_PLASMA,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_CRYSTAL
  ],

  
  'dignitier': [
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_PLASMA,
    FormChangeItem.SMITTY_HEART
  ],

  
  'smitshade': [
    FormChangeItem.SMITTY_HEART,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_DARK
  ],

  'smitspect': [
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_SLIME
  ],

  'smitwraith': [
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_SOUL
  ],

  'smiternal': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_ERROR
  ],

  
  'smittyfish': [
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_ERROR,
    FormChangeItem.SMITTY_MASK,
    FormChangeItem.SMITTY_LIQUID
  ],

  
  'smittellect': [
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_CRYSTAL
  ],

  
  'gallux': [
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_HEART
  ],

  
  'hostmitty': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_DARK
  ],

  
  'smittynarie': [
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_ERROR
  ],

  
  'batboxbaba': [
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_CORE
  ],
  
  'batboxbeyond': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_VOICE,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_CHAIN
  ],

  
  'victainer': [
    FormChangeItem.SMITTY_RELIC,
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_PLASMA
  ],

  
  'noxabis': [
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_DARK,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_FLUX
  ],

  
  'floravora': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_POISON,
    FormChangeItem.SMITTY_SHARD
  ],

  
  'chimerdrio': [
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_VOICE
  ],

  
  'kakopier': [
    FormChangeItem.SMITTY_PULSE,
    FormChangeItem.SMITTY_DREAMS,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_AURA
  ],

  
  'karasu-me': [
    FormChangeItem.SMITTY_DARK,
    FormChangeItem.SMITTY_FIRE,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_HEART
  ],

  
  'bullktopus': [
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_CRYSTAL,
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_FLUX
  ],

  
  'gumugumu': [
    FormChangeItem.SMITTY_HEART,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_DARK,
    FormChangeItem.SMITTY_CUBE
  ],

  
  'santoryu': [
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_CORE,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_MASK
  ],

  
  'roostace': [
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_CHAIN,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_FUEL
  ],

  
  'bogace': [
    FormChangeItem.SMITTY_PLASMA,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_ESSENCE
  ],

  
  'milliant': [
    FormChangeItem.SMITTY_MIST,
    FormChangeItem.SMITTY_ESSENCE,
    FormChangeItem.SMITTY_VOID,
    FormChangeItem.SMITTY_DARK
  ],

  
  'terroragon': [
    FormChangeItem.SMITTY_METAL,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_MIST
  ],

  
  'godread': [
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_PULSE,
    FormChangeItem.SMITTY_TOUCH
  ],

  
  'duschmare': [
    FormChangeItem.SMITTY_PLASMA,
    FormChangeItem.SMITTY_ENERGY,
    FormChangeItem.SMITTY_PULSE,
    FormChangeItem.SMITTY_SLIME
  ],

  
  'abyssuma': [
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_CORE,
    FormChangeItem.SMITTY_FUEL
  ],

  'clefangar': [
    FormChangeItem.SMITTY_SURGE,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_HUMOR,
    FormChangeItem.SMITTY_FUEL
  ],

  
  'omnitto': [
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_CUBE,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_MIST
  ],

  
  'umbraffe': [
    FormChangeItem.SMITTY_RELIC,
    FormChangeItem.SMITTY_SHADOW,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_MASK
  ],

  
  'tartadra': [
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_MASK,
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_SURGE
  ],

  
  'churry': [
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_HEART,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_SURGE
  ],

  
  'gazorpsmitfield': [
    FormChangeItem.SMITTY_ORB,
    FormChangeItem.SMITTY_DARK,
    FormChangeItem.SMITTY_MIST,
    FormChangeItem.SMITTY_ERROR
  ],

  
  'hologrick': [
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_MIST,
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_RELIC
  ],

  
  'seekling': [
    FormChangeItem.SMITTY_FUEL,
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_AURA,
    FormChangeItem.SMITTY_MIST
  ],

  
  'picklisk': [
    FormChangeItem.SMITTY_FEAR,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_LIQUID,
    FormChangeItem.SMITTY_MIST
  ],

  
  'bravehound': [
    FormChangeItem.SMITTY_HEART,
    FormChangeItem.SMITTY_FLUX,
    FormChangeItem.SMITTY_MIST,
    FormChangeItem.SMITTY_VOID
  ],

  
  'tengale': [
    FormChangeItem.SMITTY_SLIME,
    FormChangeItem.SMITTY_GLITCH,
    FormChangeItem.SMITTY_FIBER,
    FormChangeItem.SMITTY_FUEL
  ],

  
  'hyplagus': [
    FormChangeItem.SMITTY_BRAIN,
    FormChangeItem.SMITTY_NEBULA,
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_DARK
  ],

  
  'demonoth': [
    FormChangeItem.SMITTY_SOUL,
    FormChangeItem.SMITTY_CIRCUIT,
    FormChangeItem.SMITTY_PRISM,
    FormChangeItem.SMITTY_PULSE
  ],

  'despeko': [
    FormChangeItem.SMITTY_JUICE,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_ERROR,
    FormChangeItem.SMITTY_SHARD
  ],

  
  'missingno': [
    FormChangeItem.SMITTY_MIST,
    FormChangeItem.SMITTY_RELIC,
    FormChangeItem.SMITTY_CHAOS,
    FormChangeItem.SMITTY_SHADOW
  ]
}

export function getSmittyItems(formName: string): FormChangeItem[] {
    const items = SMITTY_FORM_ITEMS[formName];
    if (!items) {
        console.error(`No predefined items found for form: ${formName}`);
        return [];
    }
    return items;
}

export function addSmittyFormChange(speciesId: Species | null, formKey: SpeciesFormKey, requiredItems: FormChangeItem[], name: string = '') {
  const smittyFormChange = new SpeciesFormChange(
      speciesId ?? Species.NONE,
      "",
      formKey,
      new SmittyFormTrigger(requiredItems, name),
      false
  );

  if (speciesId !== null) {
    if (!pokemonFormChanges[speciesId]) {
      pokemonFormChanges[speciesId] = [];
    }
    pokemonFormChanges[speciesId].push(smittyFormChange);
  } else {
    if (!pokemonFormChanges[Species.NONE]) {
      pokemonFormChanges[Species.NONE] = [];
    }
    pokemonFormChanges[Species.NONE].push(smittyFormChange);
  }
}

export function applyUniversalSmittyForm(formName: string, pokemon: Pokemon, limitForms: boolean = false): void {
  const universalForm = universalSmittyForms.find(form => form.formName === formName);
  if (universalForm) {
    PokemonForm.addUniversalSmittyForm(pokemon, universalForm, false, limitForms);
  }
}

export function checkAndAddUniversalSmittyForms(pokemon: Pokemon): SpeciesFormChange | null {
  if (!pokemonFormChanges[Species.NONE]) return null;

  const smittyModifiers = pokemon.scene.findModifiers(m =>
      m instanceof PokemonFormChangeItemModifier &&
      m.pokemonId === pokemon.id &&
      m.formChangeItem >= FormChangeItem.SMITTY_AURA &&
      m.formChangeItem <= FormChangeItem.SMITTY_VOID
  );

  if (smittyModifiers.length < 4) return null;

  for (const universalFormChange of pokemonFormChanges[Species.NONE]) {
    const trigger = universalFormChange.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
    if (trigger && trigger.canChange(pokemon)) {
      applyUniversalSmittyForm(trigger.name, pokemon);
      return universalFormChange;
    }
  }

  return null;
}

function addSmittyForm(speciesEnum: Species | Species[], formName: string, formKey: SpeciesFormKey, primaryType: Type | null, secondaryType: Type | null, ability1: Abilities, ability2: Abilities, abilityHidden: Abilities, totalStats: number, hp: number, attack: number, defense: number, spAttack: number, spDefense: number, speed: number, requiredItems: FormChangeItem[], typeInteractions: {strengths: Type[], weaknesses: Type[], unaffectedByAtk: Type[], unaffectedToDef: Type[]} | null = null, height: number | null = null, weight: number | null = null, catchRate: number | null = null, baseFriendship: number | null = null, baseExp: number | null = null) {
  const speciesArray = Array.isArray(speciesEnum) ? speciesEnum : [speciesEnum];

  speciesArray.forEach(currentSpecies => {
    const species = allSpecies.find(s => s.speciesId === currentSpecies);
    if (species) {
      if (species.forms.length === 0) {
        const normalForm = new PokemonForm(
            "Normal",
            "",
            species.type1,
            species.type2,
            species.height,
            species.weight,
            species.ability1,
            species.ability2,
            species.abilityHidden,
            species.baseTotal,
            species.baseStats[0],
            species.baseStats[1],
            species.baseStats[2],
            species.baseStats[3],
            species.baseStats[4],
            species.baseStats[5],
            species.catchRate,
            species.baseFriendship,
            species.baseExp,
        );
        normalForm.speciesId = species.speciesId;
        normalForm.formIndex = 0;
        normalForm.generation = species.generation;
        species.forms.push(normalForm);
      }
      const baseForm = species;
      if(secondaryType == null && baseForm == undefined) {
        console.log(0);
      }
      const newForm = new PokemonForm(
          formName,
          formKey,
          primaryType !== null ? primaryType : baseForm.type1,

          secondaryType !== null ? secondaryType : baseForm.type2,
          height ?? species.height,
          weight ?? species.weight,
          ability1,
          ability2,
          abilityHidden,
          totalStats,
          hp,
          attack,
          defense,
          spAttack,
          spDefense,
          speed,
          catchRate ?? species.catchRate,
          baseFriendship ?? species.baseFriendship,
          baseExp ?? species.baseExp
      );
      newForm.speciesId = species.speciesId;
      newForm.formIndex = species.forms.length;
      newForm.generation = species.generation;
      species.forms.push(newForm);

      if (!pokemonSmittyForms.has(currentSpecies)) {
        pokemonSmittyForms.set(currentSpecies, []);
      }
      pokemonSmittyForms.get(currentSpecies)!.push(newForm);

      addSmittyFormChange(currentSpecies, formKey, requiredItems, formName);

      if (typeInteractions) {
        if (primaryType !== null && primaryType >= getMinNightmareTypeValue()) {
          setNightmareTypeInteractions(primaryType, typeInteractions);
        } else if (secondaryType !== null && secondaryType >= getMinNightmareTypeValue()) {
          setNightmareTypeInteractions(secondaryType, typeInteractions);
        }
      }
    } else {
      console.error(`Species with enum ${Species[currentSpecies]} not found.`);
    }
  });
}

export function addUniversalSmittyForm(form: UniversalSmittyForm) {
  universalSmittyForms.push(form);
  addSmittyFormChange(null, form.formKey, form.requiredItems, form.formName);
}

export function initSmittyForms() {
  addSmittyForm(Species.TAUROS, "tartauros", SpeciesFormKey.SMITTY, Type.DARK, null, Abilities.DARK_STAMPEDE, Abilities.OPPORTUNIST, Abilities.NIGHTMARATE, 582, 66, 147, 78, 98, 114, 79, getSmittyItems("tartauros"));
  addSmittyForm(Species.MAROWAK, "zamowak", SpeciesFormKey.SMITTY, Type.GROUND, null, Abilities.GRAVE_POWER, Abilities.UNDEAD, Abilities.NIGHTMARATE, 563, 64, 131, 153, 62, 112, 41, getSmittyItems("zamowak"));
  addSmittyForm(Species.GRENINJA, "greyokai", SpeciesFormKey.SMITTY, Type.WATER, null, Abilities.TECHNICIAN, Abilities.NIGHTMARATE, Abilities.NEUROFORCE, 655, 67, 119, 72, 168, 74, 155, getSmittyItems("greyokai"));
  addSmittyForm(Species.RAYQUAZA, "jormunza", SpeciesFormKey.SMITTY, Type.DRAGON, null, Abilities.NIGHTMARATE, Abilities.AERILATE, Abilities.EARTH_EATER, 792, 162, 139, 97, 189, 102, 102, getSmittyItems("jormunza"));
  addSmittyForm(Species.LICKITUNG, "licthulhu", SpeciesFormKey.SMITTY, Type.NORMAL, null, Abilities.PIXELATED_TONGUE, Abilities.NIGHTMARATE, Abilities.STATIC_TASTE, 608, 168, 109, 81, 73, 131, 45, getSmittyItems("licthulhu"));
  addSmittyForm(Species.GASTLY, "plasmist", SpeciesFormKey.SMITTY, Type.GHOST, null, Abilities.ECTOPLASMIC_TOUCH, Abilities.HAUNTING_BROADCAST, Abilities.ECTOPLASMIC_TOUCH, 530, 50, 50, 60, 157, 95, 119, getSmittyItems("plasmist"));
  addSmittyForm(Species.PIKACHU, "plustra", SpeciesFormKey.SMITTY, Type.ELECTRIC, null, Abilities.NIGHTMARATE, Abilities.NO_GUARD, Abilities.DOWNLOAD, 567, 56, 129, 55, 94, 62, 171, getSmittyItems("plustra"));
  addSmittyForm(Species.CHARIZARD, "hellchar", SpeciesFormKey.SMITTY, Type.FIRE, null, Abilities.HELL_FLAME, Abilities.UNLEASHED, Abilities.NIGHTMARATE, 655, 82, 115, 73, 164, 85, 136, getSmittyItems("hellchar"));
  addSmittyForm(Species.EEVEE, "feareon", SpeciesFormKey.SMITTY, Type.GHOST, null, Abilities.NIGHTMARATE, Abilities.SHADOW_SYNC, Abilities.FRIGHTFUL_CUTE, 555, 52, 106, 133, 67, 150, 47, getSmittyItems("feareon"));
  addSmittyForm(Species.SNORLAX, "omninom", SpeciesFormKey.SMITTY, Type.NORMAL, null, Abilities.NIGHTMARATE, Abilities.ALL_CONSUMING, Abilities.TERRIFY, 643, 199, 137, 76, 74, 100, 56, getSmittyItems("omninom"));
  addSmittyForm(Species.MEWTWO, "necromew", SpeciesFormKey.SMITTY, Type.PSYCHIC, null, Abilities.NIGHTMARATE, Abilities.CORRUPT, Abilities.CORRUPT, 768, 88, 126, 90, 202, 90, 173, getSmittyItems("necromew"));
  addSmittyForm(Species.TYRANITAR, "diablotar", SpeciesFormKey.SMITTY, Type.ROCK, null, Abilities.NIGHTMARATE, Abilities.SAND_CORRUPTION, Abilities.SAND_CORRUPTION, 673, 73, 144, 125, 157, 99, 74, getSmittyItems("diablotar"));
  addSmittyForm(Species.ROTOM, "smitom", SpeciesFormKey.SMITTY, Type.ELECTRIC, null, Abilities.LIFE_ADVICE, Abilities.ADAPTIVE_AI, Abilities.SMITTYXTV_VIRUS, 577, 56, 68, 70, 145, 127, 111, getSmittyItems("smitom"));
  addSmittyForm(Species.CHARMANDER, "genomander", SpeciesFormKey.SMITTY, Type.FIRE, Type.GHOST, Abilities.EIGHT_BIT_TERROR, Abilities.CORRUPTION_BLAZE, Abilities.NIGHTMARATE, 629, 74, 77, 101, 177, 132, 68, getSmittyItems("genomander"));
  addSmittyForm(Species.SQUIRTLE, "tormentle", SpeciesFormKey.SMITTY, Type.WATER, null, Abilities.OAKS_MISTAKE, Abilities.SHELL_SHOCK, Abilities.NIGHTMARATE, 623, 130, 113, 151, 84, 88, 57, getSmittyItems("tormentle"));
  addSmittyForm(Species.BULBASAUR, "terrorbulb", SpeciesFormKey.SMITTY, Type.GRASS, null, Abilities.OAKS_MISTAKE, Abilities.DARK_SEED, Abilities.NIGHTMARATE, 612, 72, 77, 98, 158, 134, 73, getSmittyItems("terrorbulb"));
  addSmittyForm(Species.TYRANITAR, "dankitar", SpeciesFormKey.SMITTY, Type.ROCK, Type.DARK, Abilities.MEME_ARMOR, Abilities.MEMEIFIED, Abilities.HUNGRY_TROLL, 600, 100, 134, 110, 95, 100, 61, getSmittyItems("dankitar"));
  addSmittyForm(Species.GASTLY, "gastmoji", SpeciesFormKey.SMITTY, Type.GHOST, Type.FAIRY, Abilities.CHARMING_MIST, Abilities.ANIMIFIED, Abilities.ECTOPLASMIC_CHARM, 310, 30, 35, 30, 100, 35, 80, getSmittyItems("gastmoji"));
  addSmittyForm(Species.LUCARIO, "noxabis", SpeciesFormKey.SMITTY, Type.FIGHTING, Type.DARK, Abilities.ABYSSAL_STANCE, Abilities.UNJUSTIFIED, Abilities.NIGHTMARATE, 581, 97, 151, 68, 124, 68, 73, getSmittyItems("noxabis"));
  addSmittyForm(Species.SUNFLORA, "floravora", SpeciesFormKey.SMITTY, Type.GRASS, null, Abilities.LEAFY_LURE, Abilities.VORACIOUS_VEGETATION, Abilities.SOLAR_POWER_PLUS, 547, 94, 125, 64, 139, 76, 49, getSmittyItems("floravora"));
  addSmittyForm(Species.DODRIO, "chimerdrio", SpeciesFormKey.SMITTY, Type.NORMAL, Type.FIRE, Abilities.MULTI_MIND, Abilities.WAKA_FLOCKA_FLAME, Abilities.SKILL_LINK, 640, 82, 146, 82, 146, 75, 109, getSmittyItems("chimerdrio"));
  addSmittyForm([Species.GENGAR, Species.CLEFABLE], "clefangar", SpeciesFormKey.SMITTY, Type.GHOST, Type.FAIRY, Abilities.FAIRY_FEAR, Abilities.SHADOW_CHARM, Abilities.YIN_YANG, 596, 71, 75, 96, 165, 124, 66, getSmittyItems("clefangar"));
  addSmittyForm(Species.HYDREIGON, "terroragon", SpeciesFormKey.SMITTY, Type.DARK, Type.DRAGON, Abilities.TRIPLE_THREAT, Abilities.DRAGON_WRATH, Abilities.HYDRA_RESILIENCE, 695, 85, 176, 85, 118, 78, 153, getSmittyItems("terroragon"));
  addSmittyForm(Species.GOLURK, "godread", SpeciesFormKey.SMITTY, Type.GROUND, Type.GHOST, Abilities.ANCIENT_AUTOMATON, Abilities.SHADOW_OF_COLOSSUS, Abilities.NIGHTMARATE, 604, 80, 166, 138, 58, 113, 48, getSmittyItems("godread"));
  addSmittyForm(Species.DUSKNOIR, "duschmare", SpeciesFormKey.SMITTY, Type.GHOST, Type.FIGHTING, Abilities.NIGHTMARATE, Abilities.TRUE_FEAR, Abilities.SOUL_COLLECTOR, 586, 56, 108, 159, 81, 135, 47, getSmittyItems("duschmare"));
  addSmittyForm(Species.HARIYAMA, "abyssuma", SpeciesFormKey.SMITTY, Type.FIGHTING, Type.DARK, Abilities.SUMO_MASTER, Abilities.STEADFAST_BULK, Abilities.BIG_GUTS, 582, 144, 171, 91, 56, 71, 49, getSmittyItems("abyssuma"));
  addSmittyForm(Species.DITTO, "omnitto", SpeciesFormKey.SMITTY, Type.FAIRY, null, Abilities.ULTIMATE_ADAPTATION, Abilities.PSEUDO_PERFECTION, Abilities.DNA_CHANGE, 634, 123, 123, 123, 88, 88, 88, getSmittyItems("omnitto"));
  addSmittyForm(Species.FARIGIRAF, "umbraffe", SpeciesFormKey.SMITTY, Type.NORMAL, null, Abilities.REVERSED_PSYCHOLOGY, Abilities.TAIL_COMMAND, Abilities.CONTRARY, 611, 149, 132, 77, 114, 73, 66, getSmittyItems("umbraffe"));
  addSmittyForm(Species.KINGDRA, "tartadra", SpeciesFormKey.SMITTY, Type.DRAGON, null, Abilities.ABYSSAL_AQUA, Abilities.NIGHTMARATE, Abilities.OMNISCALE, 629, 71, 81, 107, 153, 134, 83, getSmittyItems("tartadra"));
  addSmittyForm(Species.SHIFTRY, "tengale", SpeciesFormKey.SMITTY, Type.GRASS, Type.FLYING, Abilities.SPIRIT_WINDS, Abilities.LEAF_DANCER, Abilities.SLAYER_SENSEI, 618, 84, 128, 72, 142, 80, 112, getSmittyItems("tengale"));
  addSmittyForm(Species.HYPNO, "hyplagus", SpeciesFormKey.SMITTY, Type.PSYCHIC, null, Abilities.PLAGUE_PSYCHE, Abilities.TOXIC_TRANCE, Abilities.NIGHTMARATE, 588, 72, 108, 124, 63, 86, 135, getSmittyItems("hyplagus"));
  addSmittyForm(Species.MAMOSWINE, "demonoth", SpeciesFormKey.SMITTY, Type.ICE, Type.GROUND, Abilities.PERMAFROST_ARMOR, Abilities.GLACIAL_PACE, Abilities.ICE_KING, 620, 121, 172, 151, 61, 62, 53, getSmittyItems("demonoth"));
  addSmittyForm(Species.MORPEKO, "despeko", SpeciesFormKey.SMITTY, Type.DARK, null, Abilities.DESPAIR, Abilities.OHAYOGOSUMASU, Abilities.TRUE_FEAR, 599, 137, 171, 98, 66, 69, 58, getSmittyItems("despeko"));

  addUniversalSmittyForm({ formName: "zoomer", formKey: SpeciesFormKey.SMITTY, primaryType: Type.ELECTRIC, secondaryType: null, ability1: Abilities.GOTTA_GO_FAST, ability2: Abilities.IM_BLUE, abilityHidden: Abilities.NOT_SHADOW, totalStats: 647, hp: 78, attack: 104, defense: 58, spAttack: 142, spDefense: 78, speed: 188, requiredItems: getSmittyItems("zoomer") });
  addUniversalSmittyForm({ formName: "voidash", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: null, ability1: Abilities.NIGHTMARATE, ability2: Abilities.SHADOW_SLAYER, abilityHidden: Abilities.NIGHTMARE_EMERALD, totalStats: 623, hp: 65, attack: 111, defense: 72, spAttack: 163, spDefense: 76, speed: 136, requiredItems: getSmittyItems("voidash") });
  addUniversalSmittyForm({ formName: "wahcky", formKey: SpeciesFormKey.SMITTY, primaryType: Type.POISON, secondaryType: Type.DARK, ability1: Abilities.ANIMIFIED, ability2: Abilities.LONG_FORGOTTEN, abilityHidden: Abilities.WAAAA, totalStats: 530, hp: 68, attack: 120, defense: 66, spAttack: 110, spDefense: 74, speed: 93, requiredItems: getSmittyItems("wahcky") });
  addUniversalSmittyForm({ formName: "wahzebub", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: null, ability1: Abilities.NIGHTMARATE, ability2: Abilities.TOO_LATE, abilityHidden: Abilities.MEMORIES_OF_TENNIS, totalStats: 671, hp: 87, attack: 118, defense: 93, spAttack: 151, spDefense: 169, speed: 52, requiredItems: getSmittyItems("wahzebub") });
  addUniversalSmittyForm({ formName: "fineferno", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FIRE, secondaryType: Type.NORMAL, ability1: Abilities.FIRE_RAF_RAF, ability2: Abilities.POSITIVITY, abilityHidden: Abilities.UNFAZED, totalStats: 654, hp: 93, attack: 154, defense: 72, spAttack: 138, spDefense: 78, speed: 119, requiredItems: getSmittyItems("fineferno") });
  addUniversalSmittyForm({ formName: "sorbred", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: null, ability1: Abilities.NIGHTMARE_SAUCE, ability2: Abilities.HASH_SLINGING_SLASHER, abilityHidden: Abilities.LIFE_ADVICE, totalStats: 605, hp: 83, attack: 122, defense: 78, spAttack: 104, spDefense: 150, speed: 67, requiredItems: getSmittyItems("sorbred") });
  addUniversalSmittyForm({ formName: "corpanzee", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.FIGHTING, ability1: Abilities.SOLID_KONG, ability2: Abilities.TECHNICIAN, abilityHidden: Abilities.BEAST_BOOST, totalStats: 577, hp: 78, attack: 72, defense: 67, spAttack: 135, spDefense: 122, speed: 103, requiredItems: getSmittyItems("corpanzee") });
  addUniversalSmittyForm({ formName: "plankling", formKey: SpeciesFormKey.SMITTY, primaryType: Type.GRASS, secondaryType: Type.FIGHTING, ability1: Abilities.IMAGINARY, ability2: Abilities.SPLINTER_SKIN, abilityHidden: Abilities.ANIMIFIED, totalStats: 544, hp: 70, attack: 141, defense: 122, spAttack: 48, spDefense: 102, speed: 61, requiredItems: getSmittyItems("plankling") });
  addUniversalSmittyForm({ formName: "timbrick", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.STEEL, ability1: Abilities.WOOD_CUTTER, ability2: Abilities.ANIMIFIED, abilityHidden: Abilities.AXE, totalStats: 618, hp: 105, attack: 187, defense: 129, spAttack: 53, spDefense: 68, speed: 76, requiredItems: getSmittyItems("timbrick") });
  addUniversalSmittyForm({ formName: "plankult", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: Type.GRASS, ability1: Abilities.NIGHTMARATE, ability2: Abilities.DARK_SIDE, abilityHidden: Abilities.PUPPET_MASTER, totalStats: 556, hp: 66, attack: 107, defense: 153, spAttack: 70, spDefense: 123, speed: 38, requiredItems: getSmittyItems("plankult") });
  addUniversalSmittyForm({ formName: "sorbobo", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.GHOST, ability1: Abilities.BLACK_AND_RED, ability2: Abilities.ZOMBIE_EXPERIENCE, abilityHidden: Abilities.LAST_HOPE, totalStats: 590, hp: 80, attack: 123, defense: 76, spAttack: 104, spDefense: 134, speed: 73, requiredItems: getSmittyItems("sorbred") });
  addUniversalSmittyForm({ formName: "hamtaro", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.POISON, ability1: Abilities.UGLY, ability2: Abilities.BLAND_CARDBOARD_EATER, abilityHidden: Abilities.BORING, totalStats: 538, hp: 52, attack: 144, defense: 101, spAttack: 48, spDefense: 125, speed: 68, requiredItems: getSmittyItems("hamtaro") });
  addUniversalSmittyForm({ formName: "elmold", formKey: SpeciesFormKey.SMITTY, primaryType: Type.POISON, secondaryType: Type.FAIRY, ability1: Abilities.MOLDY_TOUCH, ability2: Abilities.ETERNAL_GIGGLE, abilityHidden: Abilities.RED_MENACE, totalStats: 581, hp: 99, attack: 141, defense: 79, spAttack: 58, spDefense: 130, speed: 74, requiredItems: getSmittyItems("elmold") });
  addUniversalSmittyForm({ formName: "funghomp", formKey: SpeciesFormKey.SMITTY, primaryType: Type.POISON, secondaryType: Type.GHOST, ability1: Abilities.GHOSTLY_MOLD, ability2: Abilities.PAC_FUNGUS, abilityHidden: Abilities.ALL_CONSUMING, totalStats: 572, hp: 120, attack: 68, defense: 70, spAttack: 101, spDefense: 80, speed: 133, requiredItems: getSmittyItems("funghomp") });
  addUniversalSmittyForm({ formName: "riddicus", formKey: SpeciesFormKey.SMITTY, primaryType: Type.PSYCHIC, secondaryType: Type.DARK, ability1: Abilities.SECRET_SAUCE, ability2: Abilities.MCPUZZLE, abilityHidden: Abilities.MAY_I_TAKE_YOUR_ORDER, totalStats: 575, hp: 60, attack: 45, defense: 80, spAttack: 124, spDefense: 160, speed: 106, requiredItems: getSmittyItems("riddicus") });
  addUniversalSmittyForm({ formName: "boxecutive", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: Type.NORMAL, ability1: Abilities.STEALTH_SHIPPING, ability2: Abilities.CARDBOARD_EMPIRE, abilityHidden: Abilities.A_WINNER, totalStats: 648, hp: 76, attack: 163, defense: 119, spAttack: 138, spDefense: 67, speed: 86, requiredItems: getSmittyItems("boxecutive") });
  addUniversalSmittyForm({ formName: "patnius", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.DARK, ability1: Abilities.SMUG_AURA, ability2: Abilities.DEEP_THOUGHTS, abilityHidden: Abilities.INTELLY_LECT_ALLY, totalStats: 595, hp: 72, attack: 71, defense: 100, spAttack: 140, spDefense: 152, speed: 61, requiredItems: getSmittyItems("patnius") });
  addUniversalSmittyForm({ formName: "tentacrim", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.GHOST, ability1: Abilities.INSOMNIA_INK, ability2: Abilities.NIGHTMARE_CLARINET, abilityHidden: Abilities.JELLYFISH_FEVER, totalStats: 590, hp: 80, attack: 123, defense: 76, spAttack: 104, spDefense: 134, speed: 73, requiredItems: getSmittyItems("tentacrim") });
  addUniversalSmittyForm({ formName: "undeadtunasmit", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.GHOST, ability1: Abilities.ABYSSAL_AQUA, ability2: Abilities.DEEP_SEA_VIRUS, abilityHidden: Abilities.BUBBLING_BRAINS, totalStats: 582, hp: 129, attack: 143, defense: 112, spAttack: 60, spDefense: 65, speed: 73, requiredItems: getSmittyItems("undeadtunasmit") });
  addUniversalSmittyForm({ formName: "scarablanc", formKey: SpeciesFormKey.SMITTY, primaryType: Type.BUG, secondaryType: null, ability1: Abilities.SOUL_EATER, ability2: Abilities.CURSED_SHELL, abilityHidden: Abilities.NIGHTMARATE, totalStats: 607, hp: 73, attack: 173, defense: 150, spAttack: 63, spDefense: 112, speed: 35, requiredItems: getSmittyItems("scarablanc") });
  addUniversalSmittyForm({ formName: "batmare", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: null, ability1: Abilities.GOTHAMS_NIGHTMARE, ability2: Abilities.DOOM_GADGETS, abilityHidden: Abilities.NIGHTMARATE, totalStats: 632, hp: 82, attack: 106, defense: 132, spAttack: 71, spDefense: 78, speed: 163, requiredItems: getSmittyItems("batmare") });
  // addUniversalSmittyForm({ formName: "cephaloom", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.NORMAL, ability1: Abilities.MONOTONE_MOOD, ability2: Abilities.BOREDOM_AURA, abilityHidden: Abilities.SQUIDLY_STEP, totalStats: 606, hp: 72, attack: 83, defense: 75, spAttack: 140, spDefense: 128, speed: 107, requiredItems: getSmittyItems("cephaloom") });
  addUniversalSmittyForm({ formName: "smitward", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: null, ability1: Abilities.NIGHTMARE_INK, ability2: Abilities.ABYSSAL_MELODY, abilityHidden: Abilities.NIGHTMARATE, totalStats: 665, hp: 82, attack: 118, defense: 76, spAttack: 171, spDefense: 154, speed: 64, requiredItems: getSmittyItems("smitward") });
  addUniversalSmittyForm({ formName: "niteknite", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: Type.STEEL, ability1: Abilities.SUPER_HUNGRY, ability2: Abilities.FOOLS_GOLD, abilityHidden: Abilities.SHOW_AND_TELL, totalStats: 566, hp: 64, attack: 126, defense: 111, spAttack: 76, spDefense: 111, speed: 78, requiredItems: getSmittyItems("niteknite") });
  addUniversalSmittyForm({ formName: "dignitier", formKey: SpeciesFormKey.SMITTY, primaryType: Type.GROUND, secondaryType: Type.STEEL, ability1: Abilities.KNIGHTS_SHOVEL, ability2: Abilities.HEROIC_LEAP, abilityHidden: Abilities.DIG_CHAMPION, totalStats: 614, hp: 103, attack: 173, defense: 151, spAttack: 57, spDefense: 77, speed: 53, requiredItems: getSmittyItems("dignitier") });
  addUniversalSmittyForm({ formName: "cephaloom", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: Type.DARK, ability1: Abilities.SOUL_DRAIN, ability2: Abilities.EIGHT_BIT_HUNGER, abilityHidden: Abilities.NIGHTMARATE, totalStats: 625, hp: 77, attack: 132, defense: 105, spAttack: 150, spDefense: 80, speed: 81, requiredItems: getSmittyItems("cephaloom") });
  addUniversalSmittyForm({ formName: "smitshade", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: null, ability1: Abilities.STATIC_SHOCK, ability2: Abilities.HORROR_SHOW, abilityHidden: Abilities.NIGHTMARATE, totalStats: 598, hp: 65, attack: 77, defense: 107, spAttack: 145, spDefense: 79, speed: 125, requiredItems: getSmittyItems("smitshade") });
  addUniversalSmittyForm({ formName: "smitspect", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: null, ability1: Abilities.STATIC_SHOCK, ability2: Abilities.HORROR_SHOW, abilityHidden: Abilities.NIGHTMARATE, totalStats: 598, hp: 65, attack: 77, defense: 107, spAttack: 145, spDefense: 79, speed: 125, requiredItems: getSmittyItems("smitspect") });
  addUniversalSmittyForm({ formName: "smitwraith", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: null, ability1: Abilities.STATIC_SHOCK, ability2: Abilities.HORROR_SHOW, abilityHidden: Abilities.NIGHTMARATE, totalStats: 598, hp: 65, attack: 77, defense: 107, spAttack: 145, spDefense: 79, speed: 125, requiredItems: getSmittyItems("smitwraith") });
  addUniversalSmittyForm({ formName: "smiternal", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: null, ability1: Abilities.STATIC_SHOCK, ability2: Abilities.HORROR_SHOW, abilityHidden: Abilities.NIGHTMARATE, totalStats: 598, hp: 65, attack: 77, defense: 107, spAttack: 145, spDefense: 79, speed: 125, requiredItems: getSmittyItems("smiternal") });
  addUniversalSmittyForm({ formName: "smittyfish", formKey: SpeciesFormKey.SMITTY, primaryType: Type.WATER, secondaryType: null, ability1: Abilities.SCREEN_SWIM, ability2: Abilities.DARK_WATERS, abilityHidden: Abilities.NIGHTMARATE, totalStats: 592, hp: 104, attack: 163, defense: 55, spAttack: 78, spDefense: 55, speed: 138, requiredItems: getSmittyItems("smittyfish") });
  addUniversalSmittyForm({ formName: "smittellect", formKey: SpeciesFormKey.SMITTY, primaryType: Type.PSYCHIC, secondaryType: null, ability1: Abilities.EXPERIMENT_ERROR, ability2: Abilities.NIGHTMARATE, abilityHidden: Abilities.ROUNDING_ERROR, totalStats: 650, hp: 127, attack: 110, defense: 80, spAttack: 176, spDefense: 85, speed: 73, requiredItems: getSmittyItems("smittellect") });
  addUniversalSmittyForm({ formName: "gallux", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FIGHTING, secondaryType: Type.FLYING, ability1: Abilities.COCKADOODLE_YES, ability2: Abilities.CARNIVORE, abilityHidden: Abilities.WAKA_FLOCKA_FLAME, totalStats: 619, hp: 79, attack: 72, defense: 133, spAttack: 176, spDefense: 106, speed: 53, requiredItems: getSmittyItems("gallux") });
  addUniversalSmittyForm({ formName: "hostmitty", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: null, ability1: Abilities.NIGHTMARE_HOST, ability2: Abilities.NIGHT_SHOW, abilityHidden: Abilities.PRESSURE_PLAY, totalStats: 535, hp: 97, attack: 60, defense: 50, spAttack: 134, spDefense: 78, speed: 116, requiredItems: getSmittyItems("hostmitty") });
  addUniversalSmittyForm({ formName: "smittynarie", formKey: SpeciesFormKey.SMITTY, primaryType: Type.PSYCHIC, secondaryType: null, ability1: Abilities.PRESSURE_PLAY, ability2: Abilities.A_B_C_OR_D, abilityHidden: Abilities.NIGHTMARE_HOST, totalStats: 564, hp: 60, attack: 60, defense: 52, spAttack: 133, spDefense: 99, speed: 160, requiredItems: getSmittyItems("smittynarie") });
  addUniversalSmittyForm({ formName: "batboxbaba", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: Type.FIGHTING, ability1: Abilities.MIDNIGHT_COOKIES, ability2: Abilities.HORRIBLE_CARDBOARD, abilityHidden: Abilities.THE_ELDER_SHADOWS, totalStats: 622, hp: 111, attack: 77, defense: 150, spAttack: 66, spDefense: 83, speed: 135, requiredItems: getSmittyItems("batboxbaba") });
  addUniversalSmittyForm({ formName: "batboxbeyond", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FIGHTING, secondaryType: Type.GHOST, ability1: Abilities.HORRIBLE_GHOST_CARDBOARD, ability2: Abilities.THE_ELDER_SHADOWS, abilityHidden: Abilities.MIDNIGHT_COOKIES_OF_DEATH, totalStats: 661, hp: 89, attack: 84, defense: 73, spAttack: 157, spDefense: 116, speed: 142, requiredItems: getSmittyItems("batboxbeyond") });
  addUniversalSmittyForm({ formName: "victainer", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: null, ability1: Abilities.INFOMERCIAL_FAME, ability2: Abilities.WINNERS_GRIN, abilityHidden: Abilities.FANCY_CARDBOARD, totalStats: 570, hp: 82, attack: 140, defense: 125, spAttack: 53, spDefense: 104, speed: 66, requiredItems: getSmittyItems("victainer") });
  addUniversalSmittyForm({ formName: "kakopier", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.ELECTRIC, ability1: Abilities.COPYCAT_NINJA, ability2: Abilities.HOKAGE, abilityHidden: Abilities.SHARINGAN_ACTIVATED, totalStats: 617, hp: 73, attack: 133, defense: 57, spAttack: 110, spDefense: 82, speed: 162, requiredItems: getSmittyItems("kakopier") });
  addUniversalSmittyForm({ formName: "karasu-me", formKey: SpeciesFormKey.SMITTY, primaryType: Type.DARK, secondaryType: Type.FIRE, ability1: Abilities.CROW_CLONE, ability2: Abilities.SHARINGAN_MASTERY, abilityHidden: Abilities.FOREHEAD_TAP, totalStats: 596, hp: 123, attack: 157, defense: 106, spAttack: 73, spDefense: 69, speed: 69, requiredItems: getSmittyItems("karasu-me") });
  addUniversalSmittyForm({ formName: "bullktopus", formKey: SpeciesFormKey.SMITTY, primaryType: Type.STEEL, secondaryType: Type.ELECTRIC, ability1: Abilities.EIGHT_TAILS, ability2: Abilities.RAPPING_RAMPAGE, abilityHidden: Abilities.BEAST_MODE, totalStats: 546, hp: 68, attack: 143, defense: 100, spAttack: 62, spDefense: 128, speed: 45, requiredItems: getSmittyItems("bullktopus") });
  addUniversalSmittyForm({ formName: "gumugumu", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FIGHTING, secondaryType: Type.NORMAL, ability1: Abilities.RUBBER_MAN, ability2: Abilities.CONQUEROR_HAKI, abilityHidden: Abilities.STRETCHY, totalStats: 629, hp: 114, attack: 160, defense: 87, spAttack: 57, spDefense: 74, speed: 137, requiredItems: getSmittyItems("gumugumu") });
  addUniversalSmittyForm({ formName: "santoryu", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FIGHTING, secondaryType: Type.STEEL, ability1: Abilities.DEMON_SWORDSMAN, ability2: Abilities.CURSED_BLADES, abilityHidden: Abilities.STRAWHAT, totalStats: 602, hp: 64, attack: 120, defense: 137, spAttack: 58, spDefense: 153, speed: 70, requiredItems: getSmittyItems("santoryu") });
  addUniversalSmittyForm({ formName: "roostace", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.DARK, ability1: Abilities.STUBBORN_STANCE, ability2: Abilities.MISERY_TOUCH, abilityHidden: Abilities.JUST_A_JERK, totalStats: 562, hp: 115, attack: 160, defense: 89, spAttack: 65, spDefense: 68, speed: 65, requiredItems: getSmittyItems("roostace") });
  addUniversalSmittyForm({ formName: "bogace", formKey: SpeciesFormKey.SMITTY, primaryType: Type.POISON, secondaryType: null, ability1: Abilities.BUGABUGABUGA, ability2: Abilities.MISERY_TOUCH, abilityHidden: Abilities.JUST_A_MASKED_JERK, totalStats: 602, hp: 132, attack: 147, defense: 101, spAttack: 73, spDefense: 75, speed: 74, requiredItems: getSmittyItems("bogace") });
  addUniversalSmittyForm({ formName: "milliant", formKey: SpeciesFormKey.SMITTY, primaryType: Type.BUG, secondaryType: null, ability1: Abilities.INSECT_INFUSION, ability2: Abilities.SENTIENT_ANT, abilityHidden: Abilities.ANT_REGEN, totalStats: 620, hp: 68, attack: 142, defense: 162, spAttack: 76, spDefense: 68, speed: 104, requiredItems: getSmittyItems("milliant") });
  addUniversalSmittyForm({ formName: "churry", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.FAIRY, ability1: Abilities.SUGAR_RUSH, ability2: Abilities.LIVING_DELICACY, abilityHidden: Abilities.ABANDONED, totalStats: 605, hp: 73, attack: 78, defense: 102, spAttack: 147, spDefense: 132, speed: 72, requiredItems: getSmittyItems("churry") });
  addUniversalSmittyForm({ formName: "gazorpsmitfield", formKey: SpeciesFormKey.SMITTY, primaryType: Type.NORMAL, secondaryType: Type.DARK, ability1: Abilities.LAZY_MIGHT, ability2: Abilities.LASAGNA, abilityHidden: Abilities.ALIEN_CAT, totalStats: 513, hp: 88, attack: 49, defense: 56, spAttack: 116, spDefense: 59, speed: 145, requiredItems: getSmittyItems("gazorpsmitfield") });
  addUniversalSmittyForm({ formName: "hologrick", formKey: SpeciesFormKey.SMITTY, primaryType: Type.ELECTRIC, secondaryType: Type.PSYCHIC, ability1: Abilities.ADAPTIVE_AI, ability2: Abilities.VIRTUAL_TACOS, abilityHidden: Abilities.PHASER, totalStats: 616, hp: 73, attack: 106, defense: 123, spAttack: 156, spDefense: 85, speed: 73, requiredItems: getSmittyItems("hologrick") });
  addUniversalSmittyForm({ formName: "seekling", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FAIRY, secondaryType: Type.PSYCHIC, ability1: Abilities.HEY_LOOK_AT_ME, ability2: Abilities.LIMITED_TIME, abilityHidden: Abilities.BOX_BORN, totalStats: 547, hp: 52, attack: 63, defense: 65, spAttack: 101, spDefense: 149, speed: 117, requiredItems: getSmittyItems("seekling") });
  addUniversalSmittyForm({ formName: "picklisk", formKey: SpeciesFormKey.SMITTY, primaryType: Type.GRASS, secondaryType: Type.FIGHTING, ability1: Abilities.IM_A_PICKLE, ability2: Abilities.RESOURCEFUL, abilityHidden: Abilities.DEADLY_BRINE, totalStats: 624, hp: 68, attack: 175, defense: 150, spAttack: 56, spDefense: 76, speed: 99, requiredItems: getSmittyItems("picklisk") });
  addUniversalSmittyForm({ formName: "bravehound", formKey: SpeciesFormKey.SMITTY, primaryType: Type.PSYCHIC, secondaryType: Type.FAIRY, ability1: Abilities.SPOOKY_SENSE, ability2: Abilities.UNYIELDING_COURAGE, abilityHidden: Abilities.LOVE_POWER, totalStats: 697, hp: 154, attack: 92, defense: 92, spAttack: 121, spDefense: 97, speed: 141, requiredItems: getSmittyItems("bravehound") });
  addUniversalSmittyForm({ formName: "missingno", formKey: SpeciesFormKey.SMITTY, primaryType: Type.FAIRY, secondaryType: null, ability1: Abilities.ABILITY_TEXT_HERE, ability2: Abilities.EXCEPTION_CAUGHT, abilityHidden: Abilities.FOUR_O_FOUR, totalStats: 589, hp: 68, attack: 125, defense: 71, spAttack: 153, spDefense: 73, speed: 99, requiredItems: getSmittyItems("missingno") });
}

export function addGlitchFormChange(speciesId: Species, modFormName: string = "")  {
  const glitchFormChange = new SpeciesFormChange(
      speciesId,
      "",
      SpeciesFormKey.GLITCH,
      new SpeciesFormChangeCompoundTrigger(
          new GlitchPieceTrigger(5),
          new SpeciesFormChangeItemTrigger(FormChangeItem.GLITCHI_GLITCHI_FRUIT)
      )
  );

  glitchFormChange.modFormName = modFormName;

  if (!pokemonFormChanges[speciesId]) {
    pokemonFormChanges[speciesId] = [];
  }

  pokemonFormChanges[speciesId].push(glitchFormChange);
}
export function addGlitchFormChangeAlt(speciesId: Species, formKey: SpeciesFormKey, formChangeItem: FormChangeItem, modFormName: string = "") {
  const glitchFormChange = new SpeciesFormChange(
      speciesId,
      "",
      formKey,
      new SpeciesFormChangeCompoundTrigger(
          new GlitchPieceTrigger(5),
          new SpeciesFormChangeItemTrigger(formChangeItem)
      )
  );

  glitchFormChange.modFormName = modFormName;

  if (!pokemonFormChanges[speciesId]) {
    pokemonFormChanges[speciesId] = [];
  }

  pokemonFormChanges[speciesId].push(glitchFormChange);
}
const glitchFormSpecies = [
  Species.CHARIZARD,
  Species.MUK,
  Species.KECLEON,
  Species.GLISCOR,
  Species.NOIVERN,
  Species.LICKITUNG,
  Species.ONIX,
  Species.VENUSAUR,
  Species.BLASTOISE,
  Species.NIDOKING,
  Species.GENGAR,
  Species.WEEZING,
  Species.HITMONCHAN,
  Species.KANGASKHAN,
  Species.SCYTHER,
  Species.GYARADOS,
  Species.LAPRAS,
  Species.PORYGON_Z,
  Species.DRAGONITE,
  Species.TYRANITAR,
  Species.SUDOWOODO,
  Species.AMBIPOM,
  Species.UNOWN,
  Species.OCTILLERY,
  Species.MILTANK,
  Species.SLAKING,
  Species.REGIROCK,
  Species.REGIGIGAS,
  Species.MAROWAK,
  Species.TAUROS,
  Species.GRENINJA,
  Species.CHARMANDER,
  Species.SNORLAX,
  Species.CLOYSTER,
  Species.LANTURN,
  Species.NUZLEAF,
  Species.CHANDELURE,
  Species.SIMISAGE,
  Species.SMEARGLE,
  Species.REVAVROOM,
  Species.CLAYDOL,
  Species.EISCUE,
  Species.GOLEM,
  Species.ZANGOOSE,
  Species.TRUBBISH,
  Species.HAWLUCHA,
  Species.SHARPEDO,
  Species.WOBBUFFET,
  Species.MAGIKARP,
  Species.EXCADRILL,
  Species.SCRAFTY,
  Species.SEVIPER,
  Species.KLINKLANG,
  Species.SPINDA,
  Species.MEOWTH,
  Species.NINETALES,
  Species.SHUCKLE,
  Species.TANGELA,
  Species.ELECTIVIRE,
  Species.MAGMORTAR,
  Species.SOLROCK,
  Species.LUNATONE,
  Species.SIMISAGE,
  Species.SIMISEAR,
  Species.SIMIPOUR,
  Species.HITMONLEE,
  Species.EEVEE,     
  Species.MIMIKYU,   
  Species.DITTO,     
  Species.FERALIGATR, 
  Species.PIKACHU    
];

const glitchAltFormSpecies = [
  Species.HITMONLEE,
  Species.EEVEE,
  Species.MIMIKYU,
  Species.DITTO,
  Species.SIMISAGE,
  Species.FERALIGATR,
  Species.PIKACHU,
];

function addGlitchFormChanges() {
  glitchFormSpecies.forEach(speciesId => {
    addGlitchFormChange(speciesId);
  });
}
addGlitchFormChanges();

function addGlitchAltFormChanges() {

  addGlitchFormChangeAlt(Species.HITMONLEE, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_COMMAND_SEAL);

  addGlitchFormChangeAlt(Species.EEVEE, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_MOD_SOUL); // cybeon
  addGlitchFormChangeAlt(Species.EEVEE, SpeciesFormKey.GLITCH_C, FormChangeItem.GLITCH_MASTER_PARTS); // teraeon

  addGlitchFormChangeAlt(Species.MIMIKYU, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_SHOUT); // ninjukyu
  addGlitchFormChangeAlt(Species.MIMIKYU, SpeciesFormKey.GLITCH_C, FormChangeItem.GLITCH_MOD_SOUL); // mewmewni
  addGlitchFormChangeAlt(Species.MIMIKYU, SpeciesFormKey.GLITCH_D, FormChangeItem.GLITCH_MASTER_PARTS); // ririkyu
  addGlitchFormChangeAlt(Species.MIMIKYU, SpeciesFormKey.GLITCH_E, FormChangeItem.GLITCH_COMMAND_SEAL); // regirokuy

  addGlitchFormChangeAlt(Species.DITTO, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_SHOUT); // chamelezard
  addGlitchFormChangeAlt(Species.DITTO, SpeciesFormKey.GLITCH_C, FormChangeItem.GLITCH_MASTER_PARTS); // pikatto
  addGlitchFormChangeAlt(Species.DITTO, SpeciesFormKey.GLITCH_D, FormChangeItem.GLITCH_MOD_SOUL); // machitto
  addGlitchFormChangeAlt(Species.DITTO, SpeciesFormKey.GLITCH_E, FormChangeItem.GLITCH_COMMAND_SEAL); // mewtate

  addGlitchFormChangeAlt(Species.SIMISAGE, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_MOD_SOUL); // silvaback

  addGlitchFormChangeAlt(Species.FERALIGATR, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_SHOUT); // yabbagatr
  addGlitchFormChangeAlt(Species.PIKACHU, SpeciesFormKey.GLITCH_B, FormChangeItem.GLITCH_MASTER_PARTS); // rokachubo
}

addGlitchFormChanges();
addGlitchAltFormChanges();

export function initPokemonForms() {
  const formChangeKeys = Object.keys(pokemonFormChanges);
  formChangeKeys.forEach(pk => {
    const formChanges = pokemonFormChanges[pk];
    const newFormChanges: SpeciesFormChange[] = [];
    for (const fc of formChanges) {
      const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
      if (itemTrigger && !formChanges.find(c => fc.formKey === c.preFormKey && fc.preFormKey === c.formKey)) {
        newFormChanges.push(new SpeciesFormChange(fc.speciesId, fc.formKey, fc.preFormKey, new SpeciesFormChangeItemTrigger(itemTrigger.item, false)));
      }
    }
    formChanges.push(...newFormChanges);
  });
}
