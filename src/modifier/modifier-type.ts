import * as Modifiers from "./modifier";
import Move, {
    AttackMove,
    allMoves,
    selfStatLowerMoves,
    MoveCategory, StatChangeAttr, MoveFlags,
    RecoilAttr,
    MultiHitAttr,
    StatusEffectAttr,
    MoveTarget,
    MoveAttr,
    HitHealAttr,
    MoveCondition
} from "../data/move";
import {
    MAX_PER_TYPE_POKEBALLS,
    PokeballType,
    getPokeballCatchMultiplier,
    getPokeballName
} from "../data/pokeball";
import Pokemon, {EnemyPokemon, PlayerPokemon, PokemonMove} from "../field/pokemon";
import {EvolutionItem, pokemonEvolutions, pokemonPrevolutions} from "../data/pokemon-evolutions";
import {Stat, getStatName} from "../data/pokemon-stat";
import {tmPoolTiers, tmSpecies} from "../data/tms";
import {Type} from "../data/type";
import PartyUiHandler, {PokemonMoveSelectFilter, PokemonSelectFilter} from "../ui/party-ui-handler";
import * as Utils from "../utils";
import {TempBattleStat, getTempBattleStatBoosterItemName, getTempBattleStatName} from "../data/temp-battle-stat";
import {getBerryEffectDescription, getBerryName} from "../data/berry";
import {StatusEffect, getStatusEffectDescriptor} from "../data/status-effect";
import {SpeciesFormKey, allSpecies, getPokemonSpecies, universalSmittyForms} from "../data/pokemon-species";
import BattleScene from "../battle-scene";
import {VoucherType, getVoucherTypeIcon, getVoucherTypeName} from "../system/voucher";
import {
    SpeciesFormChangeCondition,
    SpeciesFormChangeItemTrigger,
    pokemonFormChanges, SmittyFormTrigger, SMITTY_FORM_ITEMS, GlitchPieceTrigger
} from "../data/pokemon-forms";
import {FormChangeItem} from "#enums/form-change-items";
import {ModifierTier} from "./modifier-tier";
import {Nature, getNatureName, getNatureStatMultiplier} from "#app/data/nature";
import i18next from "i18next";
import {getModifierTierTextTint} from "#app/ui/text";
import Overrides from "#app/overrides";
import {Abilities} from "#enums/abilities";
import {BattlerTagType} from "#enums/battler-tag-type";
import {BerryType} from "#enums/berry-type";
import {Moves} from "#enums/moves";
import {Species} from "#enums/species";
import {getPokemonNameWithAffix} from "#app/messages.js";
import {Ability, allAbilities} from "#app/data/ability";
import {
    AbilitySacrificeModifier,
    AddPokemonModifier,
    AnyAbilityModifier,
    AnyPassiveAbilityModifier,
    CollectedTypeModifier,
    MoneyMultiplierModifier,
    StatSacrificeModifier,
    TypeSacrificeModifier,
    TypeSwitcherModifier,
    PermaMoneyModifier,
    RerollModifier,
    RunStartModifier,
    PermaQuestModifier,
    PermaPartyAbilityModifier, PermaModifier,
    PokemonFormChangeItemModifier, PermaBeatTrainerQuestModifier,
    GlitchPieceModifier,
    MoveSacrificeModifier,
    PassiveAbilitySacrificeModifier,
} from "./modifier";
import {RunType, RunDuration} from "#enums/quest-type-conditions";
import {
    QuestModifierFactory,
    QuestModifierTypeConfig,
    QuestModifierTypes
} from "#app/modifier/modifier-quest-config";
import {TrainerType} from "#enums/trainer-type";
import {GameData, QuestState, QuestUnlockables, RewardType} from "#app/system/game-data";
import {Unlockables} from "#app/system/unlockables";
import {GameModes} from "#app/game-mode";
import {PermaDuration, PermaType} from "#app/modifier/perma-modifiers";
import {randSeedInt} from "../utils";
import {RivalTrainerType} from "#app/data/trainer-config";
import {getPermaModifierRarity} from "#app/phases/modifier-reward-phase";
import { getModPokemonName } from "../data/mod-glitch-form-utils";

const outputModifierData = false;
const useMaxWeightForOutput = false;

type Modifier = Modifiers.Modifier;

export enum ModifierPoolType {
    PLAYER,
    WILD,
    TRAINER,
    ENEMY_BUFF,
    DAILY_STARTER,
    DRAFT
}

export enum PathNodeTypeFilter {
    NONE,
    MASTER_BALL_ITEMS,
    TYPE_SWITCHER,
    PASSIVE_ABILITY,
    ANY_TMS,
    MINTS,
    RELEASE_ITEMS,
    ABILITY_SWITCHERS,
    STAT_SWITCHERS,
    ROGUE_BALL_ITEMS,
    ITEM_BERRY,
    ITEM_TM,
    ADD_POKEMON,
    EXP_SHARE,
    COLLECTED_TYPE,
    DNA_SPLICERS,
    PP_MAX
}

type NewModifierFunc = (type: ModifierType, args: any[]) => Modifier;

export class ModifierType {
    public id: string;
    public localeKey: string;
    public iconImage: string;
    public group: string;
    public soundName: string;
    public tier: ModifierTier;
    protected newModifierFunc: NewModifierFunc | null;

    constructor(localeKey: string | null, iconImage: string | null, newModifierFunc: NewModifierFunc | null, group?: string, soundName?: string) {
        this.localeKey = localeKey!;
        this.iconImage = iconImage!;
        this.group = group!;
        this.soundName = soundName ?? "se/restore";
        this.newModifierFunc = newModifierFunc;
    }

    get name(): string {
        let text = i18next.t(`${this.localeKey}.name` as any);
        return text == undefined ? this.localeKey : text;
    }

    getDescription(scene: BattleScene): string {
        let text = i18next.t(`${this.localeKey}.description` as any);
        return text == undefined ? this.localeKey : text;
    }

    setTier(tier: ModifierTier): void {
        this.tier = tier;
    }

    getOrInferTier(poolType: ModifierPoolType = ModifierPoolType.PLAYER): ModifierTier | null {
        if (this.tier) {
            return this.tier;
        }
        if (!this.id) {
            return null;
        }
        let poolTypes: ModifierPoolType[];
        switch (poolType) {
            case ModifierPoolType.PLAYER:
                poolTypes = [poolType, ModifierPoolType.TRAINER, ModifierPoolType.WILD];
                break;
            case ModifierPoolType.WILD:
                poolTypes = [poolType, ModifierPoolType.PLAYER, ModifierPoolType.TRAINER];
                break;
            case ModifierPoolType.TRAINER:
                poolTypes = [poolType, ModifierPoolType.PLAYER, ModifierPoolType.WILD];
                break;
            default:
                poolTypes = [poolType];
                break;
        }
        
        for (const type of poolTypes) {
            const pool = getModifierPoolForType(type);
            for (const tier of Utils.getEnumValues(ModifierTier)) {
                if (!pool.hasOwnProperty(tier)) {
                    continue;
                }
                if (pool[tier].find(m => (m as WeightedModifierType).modifierType.id === this.id)) {
                    return (this.tier = tier);
                }
            }
        }
        return null;
    }

    withIdFromFunc(func: ModifierTypeFunc): ModifierType {
        this.id = Object.keys(modifierTypes).find(k => modifierTypes[k] === func)!; 
        return this;
    }

    /**
     * Populates the tier field by performing a reverse lookup on the modifier pool specified by {@linkcode poolType} using the
     * {@linkcode ModifierType}'s id.
     * @param poolType the {@linkcode ModifierPoolType} to look into to derive the item's tier; defaults to {@linkcode ModifierPoolType.PLAYER}
     */
    withTierFromPool(poolType: ModifierPoolType = ModifierPoolType.PLAYER): ModifierType {
        for (const tier of Object.values(getModifierPoolForType(poolType))) {
            for (const modifier of tier) {
                if (this.id === modifier.modifierType.id) {
                    this.tier = modifier.modifierType.tier;
                    break;
                }
            }
            if (this.tier) {
                break;
            }
        }
        return this;
    }

    newModifier(...args: any[]): Modifier | null {
        return this.newModifierFunc && this.newModifierFunc(this, args);
    }

    

}

type ModifierTypeGeneratorFunc = (party: Pokemon[], pregenArgs?: any[]) => ModifierType | null;

export class ModifierTypeGenerator extends ModifierType {
    
    protected genTypeFunc: ModifierTypeGeneratorFunc;

    constructor(genTypeFunc: ModifierTypeGeneratorFunc) {
        super(null, null, null);
        this.genTypeFunc = genTypeFunc;
    }

    generateType(party: Pokemon[], pregenArgs?: any[]) {
        const ret = this.genTypeFunc(party, pregenArgs);
        if (ret) {
            ret.id = this.id;
            ret.setTier(this.tier);
        }
        return ret;
    }
}

export interface GeneratedPersistentModifierType {
    getPregenArgs(): any[];
}

class AddPokeballModifierType extends ModifierType {
    private pokeballType: PokeballType;
    private count: integer;

    constructor(iconImage: string, pokeballType: PokeballType, count: integer) {
        super("", iconImage, (_type, _args) => new Modifiers.AddPokeballModifier(this, pokeballType, count), "pb", "se/pb_bounce_1");
        this.pokeballType = pokeballType;
        this.count = count;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AddPokeballModifierType.name", {
            "modifierCount": this.count,
            "pokeballName": getPokeballName(this.pokeballType),
        });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.AddPokeballModifierType.description", {
            "modifierCount": this.count,
            "pokeballName": getPokeballName(this.pokeballType),
            "catchRate": getPokeballCatchMultiplier(this.pokeballType) > -1 ? `${getPokeballCatchMultiplier(this.pokeballType)}x` : "100%",
            "pokeballAmount": `${scene.pokeballCounts[this.pokeballType]}`,
        });
    }
}

class AddVoucherModifierType extends ModifierType {
    private voucherType: VoucherType;
    private count: integer;

    constructor(voucherType: VoucherType, count: integer) {
        super("", getVoucherTypeIcon(voucherType), (_type, _args) => new Modifiers.AddVoucherModifier(this, voucherType, count), "voucher");
        this.count = count;
        this.voucherType = voucherType;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AddVoucherModifierType.name", {
            "modifierCount": this.count,
            "voucherTypeName": getVoucherTypeName(this.voucherType),
        });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.AddVoucherModifierType.description", {
            "modifierCount": this.count,
            "voucherTypeName": getVoucherTypeName(this.voucherType),
        });
    }
}

export class PokemonModifierType extends ModifierType {
    public selectFilter: PokemonSelectFilter | undefined;

    constructor(localeKey: string, iconImage: string, newModifierFunc: NewModifierFunc, selectFilter?: PokemonSelectFilter, group?: string, soundName?: string) {
        super(localeKey, iconImage, newModifierFunc, group, soundName);

        this.selectFilter = selectFilter;
    }
}

export class PokemonHeldItemModifierType extends PokemonModifierType {
    constructor(localeKey: string, iconImage: string, newModifierFunc: NewModifierFunc, group?: string, soundName?: string) {
        super(localeKey, iconImage, newModifierFunc, (pokemon: PlayerPokemon) => {
            const dummyModifier = this.newModifier(pokemon);
            const matchingModifier = pokemon.scene.findModifier(m => m instanceof Modifiers.PokemonHeldItemModifier && m.pokemonId === pokemon.id && m.matchType(dummyModifier)) as Modifiers.PokemonHeldItemModifier;
            const maxStackCount = dummyModifier.getMaxStackCount(pokemon.scene);
            if (!maxStackCount) {
                return i18next.t("modifierType:ModifierType.PokemonHeldItemModifierType.extra.inoperable", {"pokemonName": getPokemonNameWithAffix(pokemon)});
            }
            if (matchingModifier && matchingModifier.stackCount === maxStackCount) {
                return i18next.t("modifierType:ModifierType.PokemonHeldItemModifierType.extra.tooMany", {"pokemonName": getPokemonNameWithAffix(pokemon)});
            }
            return null;
        }, group, soundName);
    }

    newModifier(...args: any[]): Modifiers.PokemonHeldItemModifier {
        return super.newModifier(...args) as Modifiers.PokemonHeldItemModifier;
    }
}


export class TypeSwitcherModifierType extends PokemonModifierType {
    newPrimaryType: Type | null;
    newSecondaryType: Type | null;

    constructor(newPrimaryType: Type | null = null, newSecondaryType: Type | null = null) {
        super(
            "modifierType:ModifierType.TypeSwitcherModifierType",
            "glitchTypeSwitch",
            (_type, args) => new TypeSwitcherModifier(this, (args[0] as PlayerPokemon).id, newPrimaryType || this.newPrimaryType, newSecondaryType || this.newSecondaryType),
            undefined,
            "glitch"
        );
        this.newPrimaryType = newPrimaryType >= 0 ? newPrimaryType : this.newPrimaryType;
        this.newSecondaryType = newSecondaryType >= 0 ? newSecondaryType : this.newSecondaryType;
    }

    get name(): string {
        if (this.newPrimaryType != null && this.newSecondaryType != null) {
            return i18next.t("modifierType:ModifierType.TypeSwitcherModifierType.name", {
                type1: Type[this.newPrimaryType],
                type2: Type[this.newSecondaryType]
            });
        } else if (this.newPrimaryType != null) {
            return i18next.t("modifierType:ModifierType.PrimaryTypeSwitcherModifierType.name", {
                type1: Type[this.newPrimaryType]
            });
        } else if (this.newSecondaryType != null) {
            return i18next.t("modifierType:ModifierType.SecondaryTypeSwitcherModifierType.name", {
                type2: Type[this.newSecondaryType]
            });
        } else {
            return i18next.t("modifierType:ModifierType.TypeSwitcherModifierType.name", {
                type1: "X",
                type2: "X"
            });
        }
    }

    getDescription(scene: BattleScene): string {
        if (this.newPrimaryType != null && this.newSecondaryType != null) {
            return `${i18next.t("modifierType:ModifierType.TypeSwitcherModifierType.description", {
                type1: Type[this.newPrimaryType],
                type2: Type[this.newSecondaryType]
            })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        } else if (this.newPrimaryType != null) {
            return `${i18next.t("modifierType:ModifierType.PrimaryTypeSwitcherModifierType.description", {
                type1: Type[this.newPrimaryType]
            })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        } else if (this.newSecondaryType != null) {
            return `${i18next.t("modifierType:ModifierType.SecondaryTypeSwitcherModifierType.description", {
                type2: Type[this.newSecondaryType]
            })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        } else {
            return `${i18next.t("modifierType:ModifierType.TypeSwitcherModifierType.description", {
                type1: "X",
                type2: "X"
            })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        }
    }
}


export class AbilitySwitcherModifierType extends PokemonHeldItemModifierType {
    constructor(name: string, iconImage?: string, group?: string, soundName?: string) {
        super(
            "modifierType:ModifierType.AbilitySwitcherModifierType",
            "glitchAbilitySwitch",
            (_type, args) => new Modifiers.AbilitySwitcherModifier(this, (args[0] as PlayerPokemon).id),
            "glitch",
            soundName
        );
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AbilitySwitcherModifierType.name");
    }

    getDescription(scene: BattleScene): string {
        return `${i18next.t("modifierType:ModifierType.AbilitySwitcherModifierType.description")} ${i18next.t("modifierType:common.glitchPieceCost")}`;
    }
}

export class RandomStatSwitcherModifierType extends PokemonHeldItemModifierType {
    private stat1: Stat;
    private stat2: Stat;

    constructor(_stat1?: Stat, _stat2?: Stat) {
        let stat1: Stat;
        let stat2: Stat;
        if(_stat1 >= 0 && _stat2 >= 0) {
            stat1 = _stat1;
            stat2 = _stat2;
        }
        else {
            console.log(444);
        }

        const description = i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.description", {
            stat1: getStatName(stat1),
            stat2: getStatName(stat2)
        });

        super(
            "modifierType:ModifierType.RandomStatSwitcherModifierType",
            "glitchStatSwitch",
            (type, args) => new Modifiers.StatSwitcherModifier(type, (args[0] as PlayerPokemon).id, stat1, stat2),
            "glitch"
        );

        this.stat1 = stat1;
        this.stat2 = stat2;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.name", {
            stat1: getStatName(this.stat1),
            stat2: getStatName(this.stat2)
        });
    }

    getDescription(scene: BattleScene): string {
        return `${i18next.t("modifierType:ModifierType.RandomStatSwitcherModifierType.description", {
            stat1: getStatName(this.stat1),
            stat2: getStatName(this.stat2)
        })} ${i18next.t("modifierType:common.glitchPieceCost")}` ;
    }
}

export class AnyTmModifierType extends PokemonModifierType {
    public moveId: Moves;

    constructor(moveId: Moves) {
        const moveDetails = allMoves[moveId];
        const moveCategory = MoveCategory[moveDetails.category];
        let truncatedEffect = moveDetails.effect;
        let description = "";
        if (moveDetails.power > 0 || moveDetails.accuracy > 0) {
            truncatedEffect = truncatedEffect.length > 55 ? truncatedEffect.substring(0, 52) + "..." : truncatedEffect;
            description = `[${moveDetails.power > 0 ? `POW ${moveDetails.power} ` : ""}${moveDetails.accuracy > 0 ? `ACC ${moveDetails.accuracy} ` : ""}${moveCategory}] ${truncatedEffect} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        } else {
            truncatedEffect = truncatedEffect.length > 70 ? truncatedEffect.substring(0, 67) + "..." : truncatedEffect;
            description = `[${moveCategory}] ${truncatedEffect} ${i18next.t("modifierType:common.glitchPieceCost")}`;
        }

        super("modifierType:ModifierType.AnyTmModifierType", "glitchTm", (_type, args) => {
                const pokemon = args[0] as PlayerPokemon;
                const modifier = new Modifiers.AnyTmModifier(this, pokemon.id);
                return modifier;
            },
            (pokemon: PlayerPokemon) => {
                if (pokemon.getMoveset().filter(m => m?.moveId === moveId).length) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, "glitch");

        this.moveId = moveId;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AnyTmModifierType.name", {
            moveName: `${allMoves[this.moveId].name}`,
        });
    }

    getDescription(scene: BattleScene): string {
        return `${i18next.t(scene.enableMoveInfo ? "modifierType:ModifierType.AnyTmModifierTypeWithInfo.description" : "modifierType:ModifierType.AnyTmModifierType.description", {moveName: allMoves[this.moveId].name})} ${i18next.t("modifierType:common.glitchPieceCost")}`;
    }
}

class AnyTmModifierTypeGenerator extends ModifierTypeGenerator {
    constructor(tier: ModifierTier) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AnyTmModifierType(pregenArgs[0] as Moves);
            }
            const tierUniqueCompatibleTms = Object.keys(allMoves)
                .filter(moveId => tmPoolTiers[moveId] === tier && !allMoves[moveId].name.endsWith(" (N)"))
                .map(moveId => parseInt(moveId) as Moves)
                .filter((moveId, i, array) => array.indexOf(moveId) === i);

            if (!tierUniqueCompatibleTms.length) {
                return null;
            }

            const randTmIndex = Utils.randSeedInt(tierUniqueCompatibleTms.length);
            return new AnyTmModifierType(tierUniqueCompatibleTms[randTmIndex]);
        });
    }
}


export const REMOVED_ABILITIES = [
    Abilities.DISGUISE,          
    Abilities.FORECAST,          
    Abilities.FLOWER_GIFT,       
    Abilities.MULTITYPE,         
    Abilities.ZEN_MODE,          
    Abilities.STANCE_CHANGE,     
    Abilities.SCHOOLING,         
    Abilities.RKS_SYSTEM,        
    Abilities.AS_ONE_GLASTRIER,  
    Abilities.AS_ONE_SPECTRIER,  
    Abilities.BATTLE_BOND,       
    Abilities.POWER_CONSTRUCT,   
    Abilities.COMATOSE,          
    Abilities.HUNGER_SWITCH,     
    Abilities.GULP_MISSILE,      
    Abilities.ICE_FACE,          
    Abilities.ILLUSION,          
    Abilities.ZERO_TO_HERO,      
    Abilities.COMMANDER,         
    Abilities.TRUANT,           
    Abilities.SLOW_START,       
    Abilities.HEAVY_METAL,      
    Abilities.LIGHT_METAL,      
    Abilities.PLUS,             
    Abilities.MINUS,            
    Abilities.ILLUMINATE,       
    Abilities.ANTICIPATION,     
    Abilities.DEFEATIST,        
    Abilities.FRISK,            
    Abilities.LEAF_GUARD,       
];
const OP_ABILITIES = [
    Abilities.WONDER_GUARD,
    Abilities.HUGE_POWER,
    Abilities.PURE_POWER,
    Abilities.SIMPLE,
    Abilities.ADAPTABILITY,
    Abilities.NO_GUARD
];

const PARTY_OP_ABILITIES = [
    Abilities.MOXIE,
    Abilities.SPEED_BOOST,
    Abilities.PICKUP,
    Abilities.STURDY,
    Abilities.SERENE_GRACE,
    Abilities.SWIFT_SWIM,
    Abilities.CHLOROPHYLL,
    Abilities.GUTS,
    Abilities.MARVEL_SCALE,
    Abilities.ARENA_TRAP,
    Abilities.DOWNLOAD,
    Abilities.POISON_HEAL,
    Abilities.SKILL_LINK,
    Abilities.SOLAR_POWER,
    Abilities.SHEER_FORCE,
    Abilities.CONTRARY,
    Abilities.MULTISCALE,
    Abilities.TOXIC_BOOST,
    Abilities.FLARE_BOOST,
    Abilities.HARVEST,
    Abilities.REGENERATOR,
    Abilities.SAND_RUSH,
    Abilities.SAND_FORCE,
    Abilities.PROTEAN,
    Abilities.MAGICIAN,
    Abilities.FUR_COAT,
    Abilities.COMPETITIVE,
    Abilities.PARENTAL_BOND,
    Abilities.PRIMORDIAL_SEA,
    Abilities.DESOLATE_LAND,
    Abilities.DELTA_STREAM,
    Abilities.STAMINA,
    Abilities.MERCILESS,
    Abilities.SLUSH_RUSH,
    Abilities.BERSERK,
    Abilities.SOUL_HEART,
    Abilities.BEAST_BOOST,
    Abilities.POWER_OF_ALCHEMY,
    Abilities.NEUROFORCE,
    Abilities.INTREPID_SWORD,
    Abilities.DAUNTLESS_SHIELD,
    Abilities.LIBERO,
    Abilities.ICE_SCALES,
    Abilities.RIPEN,
    Abilities.GORILLA_TACTICS,
    Abilities.CHILLING_NEIGH,
    Abilities.GRIM_NEIGH,
    Abilities.PROTOSYNTHESIS,
    Abilities.QUARK_DRIVE,
    Abilities.GOOD_AS_GOLD,
    Abilities.VESSEL_OF_RUIN,
    Abilities.SWORD_OF_RUIN,
    Abilities.TABLETS_OF_RUIN,
    Abilities.BEADS_OF_RUIN,
    Abilities.ORICHALCUM_PULSE,
    Abilities.HADRON_ENGINE,
    Abilities.OPPORTUNIST,
    Abilities.SUPREME_OVERLORD,
    Abilities.TOXIC_CHAIN,
    Abilities.EMBODY_ASPECT_TEAL,
    Abilities.EMBODY_ASPECT_WELLSPRING,
    Abilities.EMBODY_ASPECT_HEARTHFLAME,
    Abilities.EMBODY_ASPECT_CORNERSTONE,
    Abilities.TERA_SHIFT,
    Abilities.TERA_SHELL,
    Abilities.TERAFORM_ZERO,
    Abilities.POISON_PUPPETEER,

]

export class AnyAbilityModifierType extends PokemonModifierType {
    public ability: Ability;

    constructor(ability: Abilities) {
        const abilityDetails = new Ability(ability, 0);
        super(
            "modifierType:ModifierType.AnyAbilityModifierType",
            'glitchAbilitySwitch',
            (_type, args) => new AnyAbilityModifier(this, (args[0] as PlayerPokemon).id, ability),
            null,
            'glitch'
        );
        this.ability = abilityDetails;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AnyAbilityModifierType.name", {
            abilityName: this.ability.name
        });
    }

    getDescription(scene: BattleScene): string {
        return `${i18next.t("modifierType:ModifierType.AnyAbilityModifierType.description", {
            abilityName: this.ability.name
        })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
    }
}

export class AnyAbilityModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AnyAbilityModifierType(pregenArgs[0] as Abilities);
            }

            const scene = party[0].scene;
            let maxAbilityIndex = 62;

            if (scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
                maxAbilityIndex = 310;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 248;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 186;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 124;
            }

            const abilities = Object.values(allAbilities)
                .filter((ability: any) =>
                    !ability.name.endsWith(" (N)") &&
                    ability.id > 0 &&
                    ability.id <= maxAbilityIndex &&
                    !REMOVED_ABILITIES.includes(ability.id) &&
                    (!OP_ABILITIES.includes(ability.id) || scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN])
                )
                .map((ability: any) => ability.id);

            if (abilities.length === 0) {
                 console.warn("No abilities found matching criteria for AnyAbilityModifierTypeGenerator");
                 return null;
            }

            let randomIndex = Utils.randSeedInt(abilities.length);
            let randomAbility = abilities[randomIndex];

             if (PARTY_OP_ABILITIES.includes(randomAbility)) {
                const abilityAlreadyExists = party.some(pokemon => {
                    const hasMainAbility = pokemon.getAbility().id === randomAbility;

                    const hasPassiveAbility = pokemon.hasPassive() &&
                        pokemon.getPassiveAbility().id === randomAbility;

                    return hasMainAbility || hasPassiveAbility;
                });

                if (abilityAlreadyExists) {
                    const availableAbilities = abilities.filter(id => id !== randomAbility);
                    if (availableAbilities.length > 0) {
                         randomIndex = Utils.randSeedInt(availableAbilities.length);
                         randomAbility = availableAbilities[randomIndex];
                    } else {
                        console.warn("PARTY_OP_ABILITY already exists and no other abilities available.");
                        return null;
                    }
                }
            }

            return new AnyAbilityModifierType(randomAbility as Abilities);
        });
    }
}

export class AnySmittyAbilityModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AnyAbilityModifierType(pregenArgs[0] as Abilities);
            }

            const scene = party[0].scene;

            const abilities = Object.values(allAbilities)
                .filter((ability: any) =>
                    !ability.name.endsWith(" (N)") &&
                    ability.id >= 311 &&
                    !REMOVED_ABILITIES.includes(ability.id)
                )
                .map((ability: any) => ability.id);

            if (abilities.length === 0) {
                 console.warn("No Smitty abilities found matching criteria for AnySmittyAbilityModifierTypeGenerator");
                 return null;
            }

            let randomIndex = Utils.randSeedInt(abilities.length);
            let randomAbility = abilities[randomIndex];

             if (PARTY_OP_ABILITIES.includes(randomAbility)) {
                const abilityAlreadyExists = party.some(pokemon => {
                    const hasMainAbility = pokemon.getAbility().id === randomAbility;

                    const hasPassiveAbility = pokemon.hasPassive() &&
                        pokemon.getPassiveAbility().id === randomAbility;

                    return hasMainAbility || hasPassiveAbility;
                });

                if (abilityAlreadyExists) {
                    const availableAbilities = abilities.filter(id => id !== randomAbility);
                    if (availableAbilities.length > 0) {
                         randomIndex = Utils.randSeedInt(availableAbilities.length);
                         randomAbility = availableAbilities[randomIndex];
                    } else {
                        console.warn("PARTY_OP_ABILITY already exists and no other Smitty abilities available.");
                        return null;
                    }
                }
            }


            return new AnyAbilityModifierType(randomAbility as Abilities);
        });
    }
}

export class PrimaryTypeSwitcherModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new TypeSwitcherModifierType(pregenArgs[0] as Type);
            }
            const validTypes = Utils.getEnumValues(Type).filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
            const primaryType = Utils.randSeedItem(validTypes);
            return new TypeSwitcherModifierType(primaryType);
        });
    }
}

export class SecondaryTypeSwitcherModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new TypeSwitcherModifierType(null, pregenArgs[1] as Type);
            }
            const validTypes = Utils.getEnumValues(Type).filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
            const secondaryType = Utils.randSeedItem(validTypes);
            return new TypeSwitcherModifierType(null, secondaryType);
        });
    }
}

export class TypeSwitcherModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new TypeSwitcherModifierType(pregenArgs[0] as Type, pregenArgs[1] as Type);
            }
            const validTypes = Utils.getEnumValues(Type).filter(t => t >= Type.NORMAL && t <= Type.FAIRY);
            const primaryType = Utils.randSeedItem(validTypes);
            const secondaryType = Utils.randSeedItem(validTypes.filter(t => t !== primaryType));
            return new TypeSwitcherModifierType(primaryType, secondaryType);
        });
    }
}

export class StatSwitcherModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new RandomStatSwitcherModifierType(pregenArgs[0] as Stat, pregenArgs[1] as Stat);
            }
            const stats = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
            const index1 = Utils.randSeedInt(stats.length);
            let index2 = Utils.randSeedInt(stats.length);
            while (index1 === index2) {
                index2 = Utils.randSeedInt(stats.length);
            }
            const stat1 = stats[index1];
            const stat2 = stats[index2];
        
            return new RandomStatSwitcherModifierType(stat1, stat2);
        });
    }
}

export class MoveUpgradeModifierType extends ModifierType implements GeneratedPersistentModifierType {
    private moveId: Moves;
    private powerBoost: integer;
    private typeChange: Type | null;
    private categoryChange: MoveCategory | null;
    private accuracyBoost: integer;
    private effectChange: string | null;
    private chanceChange: integer | null;
    private moveTargetChange: MoveTarget | null;
    private additionalAttrs: MoveAttr[];
    private additionalConditions: MoveCondition[];
    private flagsToAdd: integer;

    constructor(
        moveId: Moves,
        powerBoost: integer = 0,
        typeChange: Type | null = null,
        categoryChange: MoveCategory | null = null,
        accuracyBoost: integer = 0,
        effectChange: string | null = null,
        chanceChange: integer | null = null,
        moveTargetChange: MoveTarget | null = null,
        additionalAttrs: MoveAttr[] = [],
        additionalConditions: MoveCondition[] = [],
        flagsToAdd: integer = 0
    ) {
        super(
            `modifierType:MoveUpgradeModifier.${Moves[moveId]}`, 
            "smittyVoid", 
            (type, args) => new Modifiers.MoveUpgradeModifier(
                type,
                moveId,
                powerBoost,
                typeChange,
                categoryChange,
                accuracyBoost,
                effectChange,
                chanceChange,
                moveTargetChange,
                additionalAttrs,
                additionalConditions,
                flagsToAdd
            ),
            "glitch"
        );
        
        this.moveId = moveId;
        this.powerBoost = powerBoost;
        this.typeChange = typeChange;
        this.categoryChange = categoryChange;
        this.accuracyBoost = accuracyBoost;
        this.effectChange = effectChange;
        this.chanceChange = chanceChange;
        this.moveTargetChange = moveTargetChange;
        this.additionalAttrs = additionalAttrs;
        this.additionalConditions = additionalConditions;
        this.flagsToAdd = flagsToAdd;
        
        this.id = `MOVE_UPGRADE`;
    }

    get name(): string {
        let upgradeName = `${allMoves[this.moveId].name} Upgrade`;
        
        return upgradeName;
    }

    getDescription(scene: BattleScene): string {
        return this.effectChange;
    }

    getPregenArgs(): any[] {
        return [
            this.moveId,
            this.powerBoost,
            this.typeChange,
            this.categoryChange,
            this.accuracyBoost,
            this.effectChange,
            this.chanceChange,
            this.moveTargetChange,
            this.additionalAttrs,
            this.additionalConditions,
            this.flagsToAdd
        ];
    }
}

export class MoveUpgradeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs && pregenArgs.length >= 1) {
                const moveId = pregenArgs[0] as Moves;
                const powerBoost = pregenArgs[1] as integer || 0;
                const typeChange = pregenArgs[2] as Type || null;
                const categoryChange = pregenArgs[3] as MoveCategory || null;
                const accuracyBoost = pregenArgs[4] as integer || 0;
                const effectChange = pregenArgs[5] as string || null;
                const chanceChange = pregenArgs[6] as integer || null;
                const moveTargetChange = pregenArgs[7] as MoveTarget || null;
                const attrs = pregenArgs[8] as MoveAttr[] || [];
                const conditions = pregenArgs[9] as MoveCondition[] || [];
                const flags = pregenArgs[10] as integer || 0;

                return new MoveUpgradeModifierType(
                    moveId,
                    powerBoost,
                    typeChange,
                    categoryChange,
                    accuracyBoost,
                    effectChange,
                    chanceChange,
                    moveTargetChange,
                    attrs,
                    conditions,
                    flags
                );
            }
        });
    }

    getType(moveId?: Moves, powerBoost?: integer, typeChange?: Type, categoryChange?: MoveCategory, accuracyBoost?: integer, 
            effectChange?: string, chanceChange?: integer, moveTargetChange?: MoveTarget, attrs?: MoveAttr[], conditions?: MoveCondition[], flags?: integer): ModifierType {
        if (moveId === undefined) {
            return this;
        }
        
        return new MoveUpgradeModifierType(
            moveId,
            powerBoost || 0,
            typeChange || null,
            categoryChange || null,
            accuracyBoost || 0,
            effectChange || null,
            chanceChange || null,
            moveTargetChange || null,
            attrs || [],
            conditions || [],
            flags || 0
        );
    }
}

function createModifierTypeOption(modifierTypeFunc: ModifierTypeFunc, upgradeCount: number, cost: number = 500, scene?: BattleScene): ModifierTypeOption {
    const modifierType = modifierTypeFunc();
    if (modifierType instanceof QuestModifierTypeGenerator) {
        const GenModifierType = modifierType.generateType([], [0]); 
        if (!GenModifierType.id) {
            GenModifierType.withIdFromFunc(modifierTypeFunc);
        }
        return cost <= 0 ? new ModifierTypeOption(GenModifierType, upgradeCount) : new ModifierTypeOption(GenModifierType, upgradeCount, cost);
    }
    else if (modifierType instanceof PermaPartyAbilityModifierTypeGenerator) {
        if(scene) modifierType.assignScene(scene);
        const GenModifierType = modifierType.generateType([], [0]); 
        if (!GenModifierType.id) {
            GenModifierType.withIdFromFunc(modifierTypeFunc);
        }
        return cost <= 0 ? new ModifierTypeOption(GenModifierType, upgradeCount) : new ModifierTypeOption(GenModifierType, upgradeCount, cost);
    }
    else if (modifierType instanceof ModifierTypeGenerator) {
        const generatedType = modifierType.generateType([]);
        if (!generatedType.id) {
            generatedType.withIdFromFunc(modifierTypeFunc);
        }
        if (generatedType instanceof PermaModifierType) {
            return cost <= 0 ? new ModifierTypeOption(generatedType, upgradeCount) : new ModifierTypeOption(generatedType, upgradeCount, generatedType.cost);
        }
    }
    if (!modifierType.id) {
        modifierType.withIdFromFunc(modifierTypeFunc);
    }
    return cost <= 0 ? new ModifierTypeOption(modifierType, upgradeCount) : new ModifierTypeOption(modifierType, upgradeCount, cost);
}

export function getShopModifierTypeOptions(gameData: GameData, permaReward: boolean = false, scene?: BattleScene): ModifierTypeOption[] {

    let cost = permaReward ? -1 : 500;

    const getPermaModifiersByRarity = (rarity: number): ModifierTypeOption[] => {
        return Object.entries(modifierTypes)
            .filter(([key, factory]) => {
                if (key.includes('MONEY')) return false;

                if (!key.startsWith('PERMA_')) return false;

                return getPermaModifierRarity(key) === rarity;
            })
            .map(([key, factory]) => createModifierTypeOption(factory, 0, cost, scene));
    };

    const partyCost = permaReward ? 5000 : 10000;

    const baseOptions = getPermaModifiersByRarity(1);
    const partyAbilityOption1 = createModifierTypeOption(modifierTypes.PERMA_PARTY_ABILITY, 0, partyCost, scene);
    const partyAbilityOption2 = createModifierTypeOption(modifierTypes.PERMA_PARTY_ABILITY, 0, partyCost, scene);
    let options = baseOptions.concat(partyAbilityOption1, partyAbilityOption2);

    
    if (gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED) || gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
        options = [
            ...options,
            ...getPermaModifiersByRarity(2),
        ];
    }

    if (gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
        options = [
            ...options,
            ...getPermaModifiersByRarity(3),
        ];
    }

    if (permaReward) {
        return options;
    }

    const unlockedQuestOptions = Object.entries(gameData.questUnlockables)
        .filter(([_, questProgress]) => questProgress.state === QuestState.UNLOCKED)
        .map(([questId]) => {
            const questEnum = parseInt(questId) as QuestUnlockables;
            const modifierTypeKey = QuestUnlockables[questEnum];
            if (modifierTypes[modifierTypeKey]) {
                return createModifierTypeOption(modifierTypes[modifierTypeKey], 0, 1000);
            }
            return null;
        })  
        .filter((option): option is ModifierTypeOption => option !== null);


    return [...options, ...unlockedQuestOptions];
}

export class AnyPassiveAbilityModifierType extends PokemonModifierType {
    public ability: Ability;

    constructor(abilityDetails: Ability) {
        super(
            "modifierType:ModifierType.AnyPassiveAbilityModifierType",
            "modPassiveAbility",
            (_type, args) => new AnyPassiveAbilityModifier(this, (args[0] as PlayerPokemon).id, abilityDetails.id),
            null,
            'glitch'
        );
        this.ability = abilityDetails;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AnyPassiveAbilityModifierType.name", {
            abilityName: this.ability.name
        });
    }

    getDescription(scene: BattleScene): string {
        return `${i18next.t("modifierType:ModifierType.AnyPassiveAbilityModifierType.description", {
            abilityName: this.ability.name
        })} ${i18next.t("modifierType:common.glitchPieceCost")}`;
    }

    getPregenArgs(): any[] {
        return [this.ability];
    }
}

export class AnyPassiveAbilityModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AnyPassiveAbilityModifierType(pregenArgs[0]);
            }

            const scene = party[0].scene;
            let maxAbilityIndex = 62;

            if (scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
                maxAbilityIndex = 310;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 248;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 186;
            } else if (scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 124;
            }


            const abilities = Object.values(allAbilities)
                .filter(ability =>
                    (ability as any).name && !(ability as any).name.endsWith(" (N)") &&
                    (ability as any).id > 0 &&
                    (ability as any).id <= maxAbilityIndex &&
                    !REMOVED_ABILITIES.includes((ability as any).id) &&
                    (!OP_ABILITIES.includes((ability as any).id) || scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN])

                )
                .map(ability => (ability as any).id);

            if (abilities.length === 0) {
                console.warn("No passive abilities found matching criteria for AnyPassiveAbilityModifierTypeGenerator");
                return null; 
            }

            let randomIndex = Utils.randSeedInt(abilities.length);
            let abilityDetails = new Ability(abilities[randomIndex] as Abilities, 0);

             if (PARTY_OP_ABILITIES.includes(abilityDetails.id)) {
                const abilityAlreadyExists = party.some(pokemon => {
                    const hasMainAbility = pokemon.getAbility().id === abilityDetails.id;

                    const hasPassiveAbility = pokemon.hasPassive() &&
                        pokemon.getPassiveAbility().id === abilityDetails.id;

                    return hasMainAbility || hasPassiveAbility;
                });

                if (abilityAlreadyExists) {
                    const availableAbilities = abilities.filter(id => id !== abilityDetails.id);
                    if (availableAbilities.length > 0) {
                         randomIndex = Utils.randSeedInt(availableAbilities.length);
                         abilityDetails = new Ability(availableAbilities[randomIndex] as Abilities, 0);
                    } else {
                        console.warn("PARTY_OP_ABILITY already exists and no other abilities available.");
                        return null;
                    }
                }
            }

            return new AnyPassiveAbilityModifierType(abilityDetails);

        });
    }
}

export class AnySmittyPassiveAbilityModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AnyPassiveAbilityModifierType(pregenArgs[0]);
            }

            const scene = party[0].scene;

            const abilities = Object.values(allAbilities)
                .filter(ability =>
                    (ability as any).name && !(ability as any).name.endsWith(" (N)") &&
                    (ability as any).id >= 311 &&
                    !REMOVED_ABILITIES.includes((ability as any).id)
                )
                .map(ability => (ability as any).id);

            if (abilities.length === 0) {
                 console.warn("No Smitty passive abilities found matching criteria for AnySmittyPassiveAbilityModifierTypeGenerator");
                 return null;
            }

            const randomIndex = Utils.randSeedInt(abilities.length);
            const abilityDetails = new Ability(abilities[randomIndex] as Abilities, 0);

            return new AnyPassiveAbilityModifierType(abilityDetails);
        });
    }
}

export class SacrificeModifierType extends PokemonHeldItemModifierType {
    constructor(name: string, stat: Stat, boostMultiplier: number, iconImage?: string) {
        super(name, i18next.t("modifierType:ModifierType.SacrificeModifierType.description", { stat: getStatName(stat) }),
            (type, args) => new StatSacrificeModifier(type, (args[0] as PlayerPokemon).id, stat, args[1] as PlayerPokemon), iconImage);
    }
}


export class StatSacrificeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                const stat = pregenArgs[0] as Stat;
                return new StatSacrificeModifierType(i18next.t("modifierType:ModifierType.StatSacrificeModifierTypeGenerator.name", { stat: Stat[stat] }), stat);
            }
            const stats = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
            const randomStat = Utils.randSeedInt(stats.length) as Stat;
            return new StatSacrificeModifierType(i18next.t("modifierType:ModifierType.StatSacrificeModifierTypeGenerator.name", { stat: Stat[randomStat] }), randomStat);
        });
    }
}

export class StatSacrificeModifierType extends PokemonHeldItemModifierType {
    private stat: Stat;

    constructor(name: string, stat: Stat, iconImage?: string) {
        super(
            "modifierType:ModifierType.StatSacrificeModifierType",
            "modPokeSacrifice",
            (type, args) => new StatSacrificeModifier(type, (args[0] as PlayerPokemon).id, stat, args[1] as PlayerPokemon),
            "glitch"
        );
        this.stat = stat;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.StatSacrificeModifierType.name", { stat: getStatName(this.stat) });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.StatSacrificeModifierType.description", { stat: getStatName(this.stat) }) +
               " " + i18next.t("modifierType:common.glitchPieceCost");
    }
}

export class TypeSacrificeModifierType extends PokemonHeldItemModifierType {
    constructor(newPrimaryType: Type = Type.UNKNOWN, newSecondaryType: Type = Type.UNKNOWN) {
        super(
            "modifierType:ModifierType.TypeSacrificeModifierType",
            "modPokeSacrifice",
            (_type, args) => new TypeSacrificeModifier(_type, (args[0] as PlayerPokemon).id, newPrimaryType, newSecondaryType, args[1] as PlayerPokemon),
            "glitch"
        );
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.TypeSacrificeModifierType.name");
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.TypeSacrificeModifierType.description")+
               " " + i18next.t("modifierType:common.glitchPieceCost");
    }
}

export class TypeSacrificeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new TypeSacrificeModifierType(pregenArgs[0] as Type, pregenArgs[1] as Type);
            }
            return new TypeSacrificeModifierType();
        });
    }
}

export class MoveSacrificeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new MoveSacrificeModifierType();
            }
            return new MoveSacrificeModifierType();
        });
    }
}

export class MoveSacrificeModifierType extends PokemonHeldItemModifierType {
    constructor() {
        super(
            "modifierType:ModifierType.MoveSacrificeModifierType",
            "modPokeSacrifice",
            (_type, args) => new MoveSacrificeModifier(_type, (args[0] as PlayerPokemon).id, args[1] as PlayerPokemon),
            "glitch"
        );
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.MoveSacrificeModifierType.name");
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.MoveSacrificeModifierType.description") +
               " " + i18next.t("modifierType:common.glitchPieceCost");
    }
}

export class AbilitySacrificeModifierType extends PokemonHeldItemModifierType {
    constructor(ability?: Abilities) {
        super(
            "modifierType:ModifierType.AbilitySacrificeModifierType",
            "modPokeSacrifice",
            (type, args) => new AbilitySacrificeModifier(type, (args[0] as PlayerPokemon).id, ability, args[1] as PlayerPokemon),
            "glitch"
        );
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AbilitySacrificeModifierType.name");
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.AbilitySacrificeModifierType.description") +
               " " + i18next.t("modifierType:common.glitchPieceCost");
    }
}

export class AbilitySacrificeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new AbilitySacrificeModifierType(pregenArgs[0] as Abilities);
            }
            return new AbilitySacrificeModifierType();
        });
    }
}

export class PassiveAbilitySacrificeModifierType extends PokemonHeldItemModifierType {
    constructor(ability?: Abilities) {
        super(
            "modifierType:ModifierType.PassiveAbilitySacrificeModifierType",
            "modPokeSacrifice",
            (type, args) => new PassiveAbilitySacrificeModifier(type, (args[0] as PlayerPokemon).id, ability, args[1] as PlayerPokemon),
            "glitch"
        );
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.AnyPassiveAbilityModifierType.name", {
            abilityName: i18next.t("modifierType:ModifierType.AbilitySacrificeModifierType.name")
        });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PassiveAbilitySacrificeModifierType.description") +
               " " + i18next.t("modifierType:common.glitchPieceCost");
    }
}

export class PassiveAbilitySacrificeModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs) {
                return new PassiveAbilitySacrificeModifierType(pregenArgs[0] as Abilities);
            }
            return new PassiveAbilitySacrificeModifierType();
        });
    }
}



export class AddPokemonModifierType extends ModifierType {
    private newPokemon: PlayerPokemon;
    private isDraft: boolean;

    constructor(newPokemon: PlayerPokemon, isDraft: boolean = false) {
        const iconKey = newPokemon.getIconAtlasKey();
        super(
            "modifierType:AddPokemonModifierType",
            iconKey,
            (type, args) => this.newModifier(args),
            "pokemon"
        );
        this.newPokemon = newPokemon;
        this.isDraft = isDraft;

    }

    newModifier(args: any[]): Modifier {
        const scene = args[0] as BattleScene;
        return new AddPokemonModifier(this, scene, this.newPokemon);
    }

    get name(): string {
        return this.newPokemon.name;
    }

    getDescription(scene: BattleScene): string {
        const baseDescription = `Lvl ${this.newPokemon.level} ${this.newPokemon.name} ${getNatureName(this.newPokemon.nature)} ${this.newPokemon.getAbility().name} [${this.newPokemon.moveset.map(m => allMoves[m.moveId].name).join(', ')}]`;
        return this.isDraft 
            ? `${baseDescription} ${i18next.t("modifierType:common.moreInfo")}`
            : `${baseDescription} ${i18next.t("modifierType:common.moreInfo")} ${i18next.t("modifierType:common.glitchPieceCost")}`;
    }

    getPokemon(): Pokemon {
        return this.newPokemon;
    }
}


export class AddPokemonModifierTypeGenerator extends ModifierTypeGenerator {
    private isDraft: boolean;

    constructor(isDraft: boolean = false) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            const scene = party[0].scene; 
            const legendOrCatchableCheck = Utils.randSeedInt(600) <= 1;
            const allRandomPokemon = allSpecies.filter(s => 
                legendOrCatchableCheck 
                    ? !pokemonPrevolutions.hasOwnProperty(s.speciesId)
                    : (!s.legendary && !s.mythical && !s.subLegendary) && s.isCatchable() && !pokemonPrevolutions.hasOwnProperty(s.speciesId)
            );
            if (allRandomPokemon.length === 0) return null;

            const level = scene.currentBattle ? scene.currentBattle.getLvlForWave() : 5;
            let newPokemon = scene.addPlayerPokemon(Utils.randSeedItem(allRandomPokemon), level, 0, 0);
            return new AddPokemonModifierType(newPokemon, isDraft);
        });
        this.isDraft = isDraft;
    }
}

export class CollectedTypeModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    private collectedType: Type;

    constructor(collectedType: Type, playerPokemon?: PlayerPokemon) {
        super(
            "modifierType:ModifierType.CollectedTypeModifierType",
            "modSoulCollected",
            (_type, args) => new CollectedTypeModifier(_type, playerPokemon ? playerPokemon.id : (args[0] as PlayerPokemon).id, collectedType),
            'glitch'
        );
        this.collectedType = collectedType;
        this.id = "COLLECTED_TYPE";
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.CollectedTypeModifierType.name", { type: Type[this.collectedType] });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.CollectedTypeModifierType.description", { type: Type[this.collectedType] });
    }

    getPregenArgs(): any[] {
        return [this.collectedType];
    }
}

export function GeneratorInstanceCheck(generator: ModifierTypeGenerator): boolean {
    return (
        generator instanceof AnyAbilityModifierTypeGenerator ||
        generator instanceof AnyPassiveAbilityModifierTypeGenerator ||
        generator instanceof StatSwitcherModifierTypeGenerator ||
        generator instanceof AbilitySwitcherModifierType ||
        generator instanceof TypeSwitcherModifierTypeGenerator ||
        generator instanceof PrimaryTypeSwitcherModifierTypeGenerator ||
        generator instanceof SecondaryTypeSwitcherModifierTypeGenerator ||
        generator instanceof StatSacrificeModifierTypeGenerator ||
        generator instanceof MoveSacrificeModifierTypeGenerator ||
        generator instanceof TypeSacrificeModifierTypeGenerator ||
        generator instanceof AbilitySacrificeModifierTypeGenerator ||
        generator instanceof PassiveAbilitySacrificeModifierTypeGenerator
    );
}

function glitchPieceWeightAdjustment(party: Pokemon[]): integer {
    const glitchModifier = party[0].scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
    return glitchModifier && glitchModifier.getStackCount() >= 2 ? 6 : 0; 
}

function glitchSacrificeWeightAdjustment(party: Pokemon[]): integer {
    
    const glitchModifier = party[0].scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
    const sacrificeToggle = party[0].scene.findModifier(m => m instanceof Modifiers.SacrificeToggleModifier) as Modifiers.SacrificeToggleModifier;
    return glitchModifier && glitchModifier.getStackCount() >= 2 && !sacrificeToggle ? 6 : 0; 
}

function glitchUnlockWeightAdjustment(party: Pokemon[]): integer {
    const scene = party[0].scene;
    
    const glitchModifier = scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
    
    const isNuzlightQuestCompleted = scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
    
    return isNuzlightQuestCompleted && glitchModifier && glitchModifier.getStackCount() >= 2 ? 6 : 0;
}

function glitchPiecePermaMoneyWeightAdjustment(party: Pokemon[]): integer {
    const glitchModifier = party[0].scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
    return glitchModifier && glitchModifier.getStackCount() >= 4 ? 6 : 0; 
}

function glitchPiecePermaMidWeightAdjustment(party: Pokemon[]): integer {
    const glitchModifier = party[0].scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
    return glitchModifier && glitchModifier.getStackCount() >= 3 ? 6 : 0; 
}



export class PermaPartyAbilityModifierType extends ModifierType {
    public ability: Ability;

    constructor(abilityID: Abilities) {
        super(
            `modifierType:ModifierType.PermaModifierType.PERMA_PARTY_ABILITY`,
            'permaPartyAbility',
            (_type: ModifierType, args) =>
                new PermaPartyAbilityModifier(this, 30, PermaDuration.WAVE_BASED, abilityID),
            'perma'
        );
        this.ability = allAbilities[abilityID];
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_PARTY_ABILITY.name")
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_PARTY_ABILITY.description", {
            abilityName: this.ability.name
        }) + i18next.t("modifierType:common.moreInfo");
    }

    getTooltipDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_PARTY_ABILITY.description", {
            abilityName: this.ability.name
        })
    }

    getPregenArgs(): any[] {
        return [this.ability];
    }
}

export class PermaPartyAbilityModifierTypeGenerator extends ModifierTypeGenerator {
    private scene: BattleScene;
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs.length > 0 && pregenArgs[0]?.id >= 0) {
                return new PermaPartyAbilityModifierType(pregenArgs[0].id as Abilities);
            }

            let maxAbilityIndex = 62; 

            if (this.scene.gameData.unlocks[Unlockables.NIGHTMARE_MODE]) {
                maxAbilityIndex = 310;
            } else if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 248; 
            } else if (this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 186; 
            } else if (this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) {
                maxAbilityIndex = 124; 
            }

            const abilities = Object.values(allAbilities)
                .filter(ability =>
                    !ability.name.endsWith(" (N)") &&
                    ability.id > 0 &&
                    ability.id <= maxAbilityIndex &&
                    !REMOVED_ABILITIES.includes(ability.id) &&
                    !OP_ABILITIES.includes(ability.id) &&
                    (!PARTY_OP_ABILITIES.includes(ability.id) || this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) 
                )
                .map(ability => ability.id);

            const randomIndex = Utils.randSeedInt(abilities.length);
            const randomAbility = abilities[randomIndex];
            return new PermaPartyAbilityModifierType(randomAbility as Abilities);
        });
    }

    generateType(party: Pokemon[], pregenArgs?: any[]): PermaPartyAbilityModifierType {
        const ret = this.genTypeFunc(party, pregenArgs) as PermaPartyAbilityModifierType;
        if (ret) {
            ret.id = this.id;
        }
        return ret;
    }

    assignScene(scene: BattleScene): void {
        this.scene = scene;
    }
}

export class PermaModifierType extends ModifierType {

    private readonly permaTypeKey: string;
    constructor(
        public permaType: PermaType,
        public cost: number,
        public permaDuration: PermaDuration,
        public count: number
    ) {
        const permaTypeKey = PermaType[permaType];
    const iconKey = permaTypeKey.toLowerCase()
        .split('_')
        .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
        .replace(/\d+$/, ''); 

    super(
        `modifierType:ModifierType.PermaModifierType.${permaTypeKey}`,
        iconKey,
        (_type, args) => new PermaModifier(_type as PermaModifierType, permaType, count, permaDuration),
        "perma"
    );
    this.permaTypeKey = permaTypeKey;
    }

    getDescription(scene: BattleScene): string {
        const durationText = this.permaDuration === PermaDuration.WAVE_BASED ? i18next.t('common:waves') : i18next.t('common:uses');
    return `${i18next.t(`modifierType:ModifierType.PermaModifierType.${this.permaTypeKey}.description`, {
            count: this.count,
            duration: durationText
        })} [${durationText}:${this.count}]`;
    }

    get name(): string {
        return `${i18next.t(`modifierType:ModifierType.PermaModifierType.${this.permaTypeKey}.name`)} x${this.count}` ;
    }
}

export class PermaModifierTypeGenerator extends ModifierTypeGenerator {

    private readonly MIN_COUNT: number = 10;

    constructor(permaType: PermaType, baseCost: number = 500, defaultDuration?: PermaDuration) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            let duration: PermaDuration;
            let count: number;

            if (pregenArgs && pregenArgs.length >= 3) {
                [count, duration] = this.parsePregenArgs(pregenArgs);
            } else {
                duration = this.generateRandomDuration(defaultDuration);
                count = this.generateRandomCount();
            }

            const cost = this.calculateCost(baseCost, count, duration, permaType);

            return new PermaModifierType(permaType, cost, duration, count);
        });
    }
F
    private parsePregenArgs(pregenArgs: any[]): [number, PermaDuration] {
        const count = pregenArgs[1] as number;
        const duration = pregenArgs[2] as PermaDuration;

        if (!Object.values(PermaDuration).includes(duration) || typeof count !== 'number') {
            console.error('Invalid pregenArgs provided:', pregenArgs);
        }

        return [count, duration];
    }

    private generateRandomDuration(defaultDuration?: PermaDuration): PermaDuration {
        if (defaultDuration) return defaultDuration;
        return randSeedInt(2) === 0 ? PermaDuration.WAVE_BASED : PermaDuration.USE_BASED;
    }


    private generateRandomCount(): number {
        const COUNT_STEP = 5;
        const COUNT_RANGE = 7;
        return randSeedInt(COUNT_RANGE) * COUNT_STEP + this.MIN_COUNT;
    }

    private calculateCost(baseCost: number, count: number, duration: PermaDuration, permaType: PermaType): number {
        const durationMultiplier = duration === PermaDuration.WAVE_BASED ? 1.5 : 1.2;
        const rarity = getPermaModifierRarity(permaType);
        const rarityMultiplier = rarity >= 1 ? rarity * 1.5 : 1;
        return Math.round(baseCost * (count / this.MIN_COUNT) * durationMultiplier * rarityMultiplier);
    }
}


export class GlitchPieceModifierType extends ModifierType {
    constructor(stackCount?:integer) {
        super("modifierType:ModifierType.GlitchPieceModifierType", "glitchPiece", (type, _args) => new Modifiers.GlitchPieceModifier(type, stackCount), "glitch");
        this.id = "GLITCH_PIECE";
    }
}

export class SacrificeToggleModifierType extends ModifierType {
    constructor() {
        super("modifierType:ModifierType.SacrificeToggleModifierType", "modPokeSacrifice", (_type, _args) => new Modifiers.SacrificeToggleModifier(_type), "glitch");
        this.id = "SACRIFICE_TOGGLE";
    }
}
export class PermaMoneyModifierType extends ModifierType {
    private moneyAmount: number;

    constructor(localeKey: string, iconImage: string, moneyAmount: number, reduceGlitchPiece: boolean = false) {
        super(localeKey, "permaMoney", (_type, _args) => new PermaMoneyModifier(this, moneyAmount, reduceGlitchPiece), "glitch", "se/buy");
        this.moneyAmount = moneyAmount;
    }

    getDescription(scene: BattleScene): string {
        const formattedMoney = Utils.formatMoney(scene.moneyFormat, this.moneyAmount);
        return `${i18next.t("modifier:permaRunQuest.rewardTypes.permaMoney")} ${formattedMoney}`
    }

    get name(): string {
        return `${i18next.t("modifier:permaRunQuest.rewardTypes.permaMoney")} ${this.moneyAmount}`
    }
}



export class PokemonHpRestoreModifierType extends PokemonModifierType {
    protected restorePoints: integer;
    protected restorePercent: integer;
    protected healStatus: boolean;

    constructor(localeKey: string, iconImage: string, restorePoints: integer, restorePercent: integer, healStatus: boolean = false, newModifierFunc?: NewModifierFunc, selectFilter?: PokemonSelectFilter, group?: string) {
        super(localeKey, iconImage, newModifierFunc || ((_type, args) => new Modifiers.PokemonHpRestoreModifier(this, (args[0] as PlayerPokemon).id, this.restorePoints, this.restorePercent, this.healStatus, false)),
            selectFilter || ((pokemon: PlayerPokemon) => {
                if (!pokemon.hp || (pokemon.isFullHp() && (!this.healStatus || (!pokemon.status && !pokemon.getTag(BattlerTagType.CONFUSED))))) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }), group || "potion");

        this.restorePoints = restorePoints;
        this.restorePercent = restorePercent;
        this.healStatus = healStatus;
    }

    getDescription(scene: BattleScene): string {
        return this.restorePoints
            ? i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.description", {
                restorePoints: this.restorePoints,
                restorePercent: this.restorePercent,
            })
            : this.healStatus
                ? i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.extra.fullyWithStatus")
                : i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.extra.fully");
    }
}

export class PokemonReviveModifierType extends PokemonHpRestoreModifierType {
    constructor(localeKey: string, iconImage: string, restorePercent: integer) {
        super(localeKey, iconImage, 0, restorePercent, false, (_type, args) => new Modifiers.PokemonHpRestoreModifier(this, (args[0] as PlayerPokemon).id, 0, this.restorePercent, false, true),
            ((pokemon: PlayerPokemon) => {
                if (!pokemon.isFainted()) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }), "revive");

        this.selectFilter = (pokemon: PlayerPokemon) => {
            if (pokemon.hp) {
                return PartyUiHandler.NoEffectMessage;
            }
            return null;
        };
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonReviveModifierType.description", {restorePercent: this.restorePercent});
    }
}

export class PokemonStatusHealModifierType extends PokemonModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, ((_type, args) => new Modifiers.PokemonStatusHealModifier(this, (args[0] as PlayerPokemon).id)),
            ((pokemon: PlayerPokemon) => {
                if (!pokemon.hp || (!pokemon.status && !pokemon.getTag(BattlerTagType.CONFUSED))) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }));
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonStatusHealModifierType.description");
    }
}

export abstract class PokemonMoveModifierType extends PokemonModifierType {
    public moveSelectFilter: PokemonMoveSelectFilter | undefined;

    constructor(localeKey: string, iconImage: string, newModifierFunc: NewModifierFunc, selectFilter?: PokemonSelectFilter, moveSelectFilter?: PokemonMoveSelectFilter, group?: string) {
        super(localeKey, iconImage, newModifierFunc, selectFilter, group);

        this.moveSelectFilter = moveSelectFilter;
    }
}

export class PokemonPpRestoreModifierType extends PokemonMoveModifierType {
    protected restorePoints: integer;

    constructor(localeKey: string, iconImage: string, restorePoints: integer) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonPpRestoreModifier(this, (args[0] as PlayerPokemon).id, (args[1] as integer), this.restorePoints),
            (_pokemon: PlayerPokemon) => {
                return null;
            }, (pokemonMove: PokemonMove) => {
                if (!pokemonMove.ppUsed) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, "ether");

        this.restorePoints = restorePoints;
    }

    getDescription(scene: BattleScene): string {
        return this.restorePoints > -1
            ? i18next.t("modifierType:ModifierType.PokemonPpRestoreModifierType.description", {restorePoints: this.restorePoints})
            : i18next.t("modifierType:ModifierType.PokemonPpRestoreModifierType.extra.fully")
            ;
    }
}

export class PokemonAllMovePpRestoreModifierType extends PokemonModifierType {
    protected restorePoints: integer;

    constructor(localeKey: string, iconImage: string, restorePoints: integer) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonAllMovePpRestoreModifier(this, (args[0] as PlayerPokemon).id, this.restorePoints),
            (pokemon: PlayerPokemon) => {
                if (!pokemon.getMoveset().filter(m => m?.ppUsed).length) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, "elixir");

        this.restorePoints = restorePoints;
    }

    getDescription(scene: BattleScene): string {
        return this.restorePoints > -1
            ? i18next.t("modifierType:ModifierType.PokemonAllMovePpRestoreModifierType.description", {restorePoints: this.restorePoints})
            : i18next.t("modifierType:ModifierType.PokemonAllMovePpRestoreModifierType.extra.fully")
            ;
    }
}

export class PokemonPpUpModifierType extends PokemonMoveModifierType {
    protected upPoints: integer;

    constructor(localeKey: string, iconImage: string, upPoints: integer) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonPpUpModifier(this, (args[0] as PlayerPokemon).id, (args[1] as integer), this.upPoints),
            (_pokemon: PlayerPokemon) => {
                return null;
            }, (pokemonMove: PokemonMove) => {
                if (pokemonMove.getMove().pp < 5 || pokemonMove.ppUp >= 3) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, "ppUp");

        this.upPoints = upPoints;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonPpUpModifierType.description", {upPoints: this.upPoints});
    }
}

export class PokemonNatureChangeModifierType extends PokemonModifierType {
    public nature: Nature;

    constructor(nature: Nature) {
        super("", `mint_${Utils.getEnumKeys(Stat).find(s => getNatureStatMultiplier(nature, Stat[s]) > 1)?.toLowerCase() || "neutral"}`, ((_type, args) => new Modifiers.PokemonNatureChangeModifier(this, (args[0] as PlayerPokemon).id, this.nature)),
            ((pokemon: PlayerPokemon) => {
                if (pokemon.getNature() === this.nature) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }), "mint");

        this.nature = nature;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.PokemonNatureChangeModifierType.name", {natureName: getNatureName(this.nature)});
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonNatureChangeModifierType.description", {natureName: getNatureName(this.nature, true, true, true)});
    }
}

export class RememberMoveModifierType extends PokemonModifierType {
    constructor(localeKey: string, iconImage: string, group?: string) {
        super(localeKey, iconImage, (type, args) => new Modifiers.RememberMoveModifier(type, (args[0] as PlayerPokemon).id, (args[1] as integer)),
            (pokemon: PlayerPokemon) => {
                if (!pokemon.getLearnableLevelMoves().length) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, group);
    }
}

export class DoubleBattleChanceBoosterModifierType extends ModifierType {
    public battleCount: integer;

    constructor(localeKey: string, iconImage: string, battleCount: integer) {
        super(localeKey, iconImage, (_type, _args) => new Modifiers.DoubleBattleChanceBoosterModifier(this, this.battleCount), "lure");

        this.battleCount = battleCount;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.DoubleBattleChanceBoosterModifierType.description", {battleCount: this.battleCount});
    }
}

export class TempBattleStatBoosterModifierType extends ModifierType implements GeneratedPersistentModifierType {
    public tempBattleStat: TempBattleStat;

    constructor(tempBattleStat: TempBattleStat) {
        super("", getTempBattleStatBoosterItemName(tempBattleStat).replace(/\./g, "").replace(/[ ]/g, "_").toLowerCase(),
            (_type, _args) => new Modifiers.TempBattleStatBoosterModifier(this, this.tempBattleStat));

        this.tempBattleStat = tempBattleStat;
    }

    get name(): string {
        return i18next.t(`modifierType:TempBattleStatBoosterItem.${getTempBattleStatBoosterItemName(this.tempBattleStat).replace(/\./g, "").replace(/[ ]/g, "_").toLowerCase()}`);
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.TempBattleStatBoosterModifierType.description", {tempBattleStatName: getTempBattleStatName(this.tempBattleStat)});
    }

    getPregenArgs(): any[] {
        return [this.tempBattleStat];
    }
}

export class BerryModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    public berryType: BerryType;

    constructor(berryType: BerryType) {
        super("", `${BerryType[berryType].toLowerCase()}_berry`, (type, args) => new Modifiers.BerryModifier(type, (args[0] as Pokemon).id, berryType), "berry");

        this.berryType = berryType;
    }

    get name(): string {
        return getBerryName(this.berryType);
    }

    getDescription(scene: BattleScene): string {
        return getBerryEffectDescription(this.berryType);
    }

    getPregenArgs(): any[] {
        return [this.berryType];
    }
}

function getAttackTypeBoosterItemName(type: Type) {
    switch (type) {
        case Type.NORMAL:
            return "Silk Scarf";
        case Type.FIGHTING:
            return "Black Belt";
        case Type.FLYING:
            return "Sharp Beak";
        case Type.POISON:
            return "Poison Barb";
        case Type.GROUND:
            return "Soft Sand";
        case Type.ROCK:
            return "Hard Stone";
        case Type.BUG:
            return "Silver Powder";
        case Type.GHOST:
            return "Spell Tag";
        case Type.STEEL:
            return "Metal Coat";
        case Type.FIRE:
            return "Charcoal";
        case Type.WATER:
            return "Mystic Water";
        case Type.GRASS:
            return "Miracle Seed";
        case Type.ELECTRIC:
            return "Magnet";
        case Type.PSYCHIC:
            return "Twisted Spoon";
        case Type.ICE:
            return "Never-Melt Ice";
        case Type.DRAGON:
            return "Dragon Fang";
        case Type.DARK:
            return "Black Glasses";
        case Type.FAIRY:
            return "Fairy Feather";
    }
}

export class AttackTypeBoosterModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    public moveType: Type;
    public boostPercent: integer;

    constructor(moveType: Type, boostPercent: integer) {
        super("", `${getAttackTypeBoosterItemName(moveType)?.replace(/[ \-]/g, "_").toLowerCase()}`,
            (_type, args) => new Modifiers.AttackTypeBoosterModifier(this, (args[0] as Pokemon).id, moveType, boostPercent));

        this.moveType = moveType;
        this.boostPercent = boostPercent;
    }

    get name(): string {
        return i18next.t(`modifierType:AttackTypeBoosterItem.${getAttackTypeBoosterItemName(this.moveType)?.replace(/[ \-]/g, "_").toLowerCase()}`);
    }

    getDescription(scene: BattleScene): string {
        
        return i18next.t("modifierType:ModifierType.AttackTypeBoosterModifierType.description", {moveType: i18next.t(`pokemonInfo:Type.${Type[this.moveType]}`)});
    }

    getPregenArgs(): any[] {
        return [this.moveType];
    }
}

export type SpeciesStatBoosterItem = keyof typeof SpeciesStatBoosterModifierTypeGenerator.items;

/**
 * Modifier type for {@linkcode Modifiers.SpeciesStatBoosterModifier}
 * @extends PokemonHeldItemModifierType
 * @implements GeneratedPersistentModifierType
 */
export class SpeciesStatBoosterModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    private key: SpeciesStatBoosterItem;

    constructor(key: SpeciesStatBoosterItem) {
        const item = SpeciesStatBoosterModifierTypeGenerator.items[key];
        super(`modifierType:SpeciesBoosterItem.${key}`, key.toLowerCase(), (type, args) => new Modifiers.SpeciesStatBoosterModifier(type, (args[0] as Pokemon).id, item.stats, item.multiplier, item.species));

        this.key = key;
    }

    getPregenArgs(): any[] {
        return [this.key];
    }
}

export class PokemonLevelIncrementModifierType extends PokemonModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonLevelIncrementModifier(this, (args[0] as PlayerPokemon).id), (_pokemon: PlayerPokemon) => null);
    }

    getDescription(scene: BattleScene): string {
        let levels = 1;
        const hasCandyJar = scene.modifiers.find(modifier => modifier instanceof Modifiers.LevelIncrementBoosterModifier);
        if (hasCandyJar) {
            levels += hasCandyJar.stackCount;
        }
        return i18next.t("modifierType:ModifierType.PokemonLevelIncrementModifierType.description", {levels});
    }
}

export class AllPokemonLevelIncrementModifierType extends ModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, (_type, _args) => new Modifiers.PokemonLevelIncrementModifier(this, -1));
    }

    getDescription(scene: BattleScene): string {
        let levels = 1;
        const hasCandyJar = scene.modifiers.find(modifier => modifier instanceof Modifiers.LevelIncrementBoosterModifier);
        if (hasCandyJar) {
            levels += hasCandyJar.stackCount;
        }
        return i18next.t("modifierType:ModifierType.AllPokemonLevelIncrementModifierType.description", {levels});
    }
}

function getBaseStatBoosterItemName(stat: Stat) {
    switch (stat) {
        case Stat.HP:
            return "HP Up";
        case Stat.ATK:
            return "Protein";
        case Stat.DEF:
            return "Iron";
        case Stat.SPATK:
            return "Calcium";
        case Stat.SPDEF:
            return "Zinc";
        case Stat.SPD:
            return "Carbos";
    }
}

export class PokemonBaseStatBoosterModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    private localeName: string;
    private stat: Stat;

    constructor(localeName: string, stat: Stat) {
        super("", localeName.replace(/[ \-]/g, "_").toLowerCase(), (_type, args) => new Modifiers.PokemonBaseStatModifier(this, (args[0] as Pokemon).id, this.stat));

        this.localeName = localeName;
        this.stat = stat;
    }

    get name(): string {
        return i18next.t(`modifierType:BaseStatBoosterItem.${this.localeName.replace(/[ \-]/g, "_").toLowerCase()}`);
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonBaseStatBoosterModifierType.description", {statName: getStatName(this.stat)});
    }

    getPregenArgs(): any[] {
        return [this.stat];
    }
}

class AllPokemonFullHpRestoreModifierType extends ModifierType {
    private descriptionKey: string;

    constructor(localeKey: string, iconImage: string, descriptionKey?: string, newModifierFunc?: NewModifierFunc) {
        super(localeKey, iconImage, newModifierFunc || ((_type, _args) => new Modifiers.PokemonHpRestoreModifier(this, -1, 0, 100, false)));

        this.descriptionKey = descriptionKey!;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t(`${this.descriptionKey || "modifierType:ModifierType.AllPokemonFullHpRestoreModifierType"}.description` as any);
    }
}

class AllPokemonFullReviveModifierType extends AllPokemonFullHpRestoreModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, "modifierType:ModifierType.AllPokemonFullReviveModifierType", (_type, _args) => new Modifiers.PokemonHpRestoreModifier(this, -1, 0, 100, false, true));
    }
}

export class MoneyRewardModifierType extends ModifierType {
    private moneyMultiplier: number;
    private moneyMultiplierDescriptorKey: string;

    constructor(localeKey: string, iconImage: string, moneyMultiplier: number, moneyMultiplierDescriptorKey: string) {
        super(localeKey, iconImage, (_type, _args) => new Modifiers.MoneyRewardModifier(this, moneyMultiplier), "money", "se/buy");

        this.moneyMultiplier = moneyMultiplier;
        this.moneyMultiplierDescriptorKey = moneyMultiplierDescriptorKey;
    }

    getDescription(scene: BattleScene): string {
        const moneyAmount = new Utils.IntegerHolder(scene.getWaveMoneyAmount(this.moneyMultiplier));
        scene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);
        const formattedMoney = Utils.formatMoney(scene.moneyFormat, moneyAmount.value);

        return i18next.t("modifierType:ModifierType.MoneyRewardModifierType.description", {
            moneyMultiplier: i18next.t(this.moneyMultiplierDescriptorKey as any),
            moneyAmount: formattedMoney,
        });
    }
}

export class ExpBoosterModifierType extends ModifierType {
    private boostPercent: integer;

    constructor(localeKey: string, iconImage: string, boostPercent: integer) {
        super(localeKey, iconImage, () => new Modifiers.ExpBoosterModifier(this, boostPercent));

        this.boostPercent = boostPercent;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.ExpBoosterModifierType.description", {boostPercent: this.boostPercent});
    }
}

export class PokemonExpBoosterModifierType extends PokemonHeldItemModifierType {
    private boostPercent: integer;

    constructor(localeKey: string, iconImage: string, boostPercent: integer) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonExpBoosterModifier(this, (args[0] as Pokemon).id, boostPercent));

        this.boostPercent = boostPercent;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonExpBoosterModifierType.description", {boostPercent: this.boostPercent});
    }
}

export class PokemonFriendshipBoosterModifierType extends PokemonHeldItemModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonFriendshipBoosterModifier(this, (args[0] as Pokemon).id));
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonFriendshipBoosterModifierType.description");
    }
}

export class PokemonMoveAccuracyBoosterModifierType extends PokemonHeldItemModifierType {
    private amount: integer;

    constructor(localeKey: string, iconImage: string, amount: integer, group?: string, soundName?: string) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.PokemonMoveAccuracyBoosterModifier(this, (args[0] as Pokemon).id, amount), group, soundName);

        this.amount = amount;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonMoveAccuracyBoosterModifierType.description", {accuracyAmount: this.amount});
    }
}

export class PokemonMultiHitModifierType extends PokemonHeldItemModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, (type, args) => new Modifiers.PokemonMultiHitModifier(type as PokemonMultiHitModifierType, (args[0] as Pokemon).id));
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.PokemonMultiHitModifierType.description");
    }
}

export class TmModifierType extends PokemonModifierType {
    public moveId: Moves;

    constructor(moveId: Moves) {
        
        const moveDetails = allMoves[moveId];
        const moveCategory = MoveCategory[moveDetails.category];
        const description = `[${moveDetails.power > 0 ? `POW ${moveDetails.power} ` : ""}${moveDetails.accuracy > 0 ? `ACC ${moveDetails.accuracy} ` : ""}${moveCategory}] ${moveDetails.effect}`;

        super("", `tm_${Type[allMoves[moveId].type].toLowerCase()}`, (_type, args) => new Modifiers.TmModifier(this, (args[0] as PlayerPokemon).id),
            (pokemon: PlayerPokemon) => {
                if (pokemon.compatibleTms.indexOf(moveId) === -1 || pokemon.getMoveset().filter(m => m?.moveId === moveId).length) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            }, "tm");

        this.moveId = moveId;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.TmModifierType.name", {
            moveId: Utils.padInt(Object.keys(tmSpecies).indexOf(this.moveId.toString()) + 1, 3),
            moveName: allMoves[this.moveId].name,
        });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t(scene.enableMoveInfo ? "modifierType:ModifierType.TmModifierTypeWithInfo.description" : "modifierType:ModifierType.TmModifierType.description", {moveName: allMoves[this.moveId].name});
    }
}

export class EvolutionItemModifierType extends PokemonModifierType implements GeneratedPersistentModifierType {
    public evolutionItem: EvolutionItem;

    constructor(evolutionItem: EvolutionItem) {
        super("", EvolutionItem[evolutionItem].toLowerCase(), (_type, args) => new Modifiers.EvolutionItemModifier(this, (args[0] as PlayerPokemon).id),
            (pokemon: PlayerPokemon) => {
                if (pokemonEvolutions.hasOwnProperty(pokemon.species.speciesId) && pokemonEvolutions[pokemon.species.speciesId].filter(e => e.item === this.evolutionItem
                    && (!e.condition || e.condition.predicate(pokemon)) && (e.preFormKey === null || e.preFormKey === pokemon.getFormKey())).length && (pokemon.getFormKey() !== SpeciesFormKey.GIGANTAMAX)) {
                    return null;
                } else if (pokemon.isFusion() && pokemon.fusionSpecies && pokemonEvolutions.hasOwnProperty(pokemon.fusionSpecies.speciesId) && pokemonEvolutions[pokemon.fusionSpecies.speciesId].filter(e => e.item === this.evolutionItem
                    && (!e.condition || e.condition.predicate(pokemon)) && (e.preFormKey === null || e.preFormKey === pokemon.getFusionFormKey())).length && (pokemon.getFusionFormKey() !== SpeciesFormKey.GIGANTAMAX)) {
                    return null;
                }

                return PartyUiHandler.NoEffectMessage;
            });

        this.evolutionItem = evolutionItem;
    }

    get name(): string {
        return i18next.t(`modifierType:EvolutionItem.${EvolutionItem[this.evolutionItem]}`);
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.EvolutionItemModifierType.description");
    }

    getPregenArgs(): any[] {
        return [this.evolutionItem];
    }
}


export class FormChangeItemModifierType extends PokemonModifierType implements GeneratedPersistentModifierType {
    public formChangeItems: FormChangeItem[];

    constructor(formChangeItems: FormChangeItem | FormChangeItem[]) {
        
        const currentItem = Array.isArray(formChangeItems) ?
            formChangeItems[0] :
            formChangeItems;
        const isSmittyItem = currentItem >= FormChangeItem.SMITTY_AURA && currentItem <= FormChangeItem.SMITTY_VOID;
        const isGlitchChangeItem = currentItem >= FormChangeItem.GLITCHI_GLITCHI_FRUIT && currentItem <= FormChangeItem.GLITCH_MASTER_PARTS;

        const isSmittyGlitchItem = isSmittyItem || isGlitchChangeItem;
        const toCamelCase = (str: string) => {
            return str.toLowerCase().replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        };

        const iconKey = Array.isArray(formChangeItems) ?
            (isSmittyGlitchItem) ?
                toCamelCase(FormChangeItem[formChangeItems[0]]) :
                FormChangeItem[formChangeItems[0]].toLowerCase() :
            (isSmittyGlitchItem) ?
                toCamelCase(FormChangeItem[formChangeItems]) :
                FormChangeItem[formChangeItems].toLowerCase();

        super("", iconKey,
            (_type, args) => {
                const pokemon = args[0] as PlayerPokemon;
                const hasItem = pokemon.scene.findModifier(m =>
                    m instanceof PokemonFormChangeItemModifier &&
                    m.pokemonId === pokemon.id &&
                    m.formChangeItem === (Array.isArray(formChangeItems) ? formChangeItems[0] : formChangeItems)
                );

                if (hasItem) {
                    return null;
                }

                return new PokemonFormChangeItemModifier(
                    this,
                    pokemon.id,
                    Array.isArray(formChangeItems) ? formChangeItems[0] : formChangeItems,
                    true
                );
            },
            (pokemon: PlayerPokemon) => {
                const currentForm = pokemon.species.forms[pokemon.formIndex];
                const isSmittyForm = currentForm && (currentForm.formKey === SpeciesFormKey.SMITTY || currentForm.formKey === SpeciesFormKey.SMITTY_B);

             
                if (isSmittyForm && isSmittyItem) {
                    return PartyUiHandler.NoEffectMessage;
                }

                const universalForms = (pokemonFormChanges[Species.NONE] || []).filter(fc => {
                    const smittyTrigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                    return smittyTrigger && pokemon.scene.gameData.isUniSmittyFormUnlocked(smittyTrigger.name);
                });

                const formChanges = [
                    ...(pokemonFormChanges[pokemon.species.speciesId] || []),
                    ...(universalForms)
                ];

                const relevantFormChange = formChanges.find(fc => {
                    const smittyTrigger = fc.findTrigger(SmittyFormTrigger);
                    const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger);

                    if (smittyTrigger) {
                        
                        const currentItem = Array.isArray(this.formChangeItems) ?
                            this.formChangeItems[0] :
                            this.formChangeItems;

                        if (pokemonFormChanges[Species.NONE]?.includes(fc)) {
                            const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                            if (trigger && !pokemon.scene.gameData.isUniSmittyFormUnlocked(trigger.name)) {
                                return false;
                            }
                        }

                        return smittyTrigger.requiredItems.includes(currentItem) &&
                            !pokemon.scene.findModifier(m =>
                                m instanceof PokemonFormChangeItemModifier &&
                                m.pokemonId === pokemon.id &&
                                m.formChangeItem === currentItem
                            );
                    }

                    return itemTrigger && this.formChangeItems.includes((itemTrigger as SpeciesFormChangeItemTrigger).item);
                });

                if (!relevantFormChange) {
                    return PartyUiHandler.NoEffectMessage;
                }

                const formKey = relevantFormChange.formKey;
                const rewardTypeMap: { [key: string]: RewardType } = {
                    [SpeciesFormKey.GLITCH]: RewardType.GLITCH_FORM_A,
                    [SpeciesFormKey.GLITCH_B]: RewardType.GLITCH_FORM_B,
                    [SpeciesFormKey.GLITCH_C]: RewardType.GLITCH_FORM_C,
                    [SpeciesFormKey.GLITCH_D]: RewardType.GLITCH_FORM_D,
                    [SpeciesFormKey.GLITCH_E]: RewardType.GLITCH_FORM_E,
                };

                const isGlitchForm = rewardTypeMap.hasOwnProperty(formKey);
                if (isGlitchForm) {
                    const glitchTrigger = relevantFormChange.findTrigger(GlitchPieceTrigger) as GlitchPieceTrigger;
                    if ((!glitchTrigger || !glitchTrigger.canChange(pokemon))) {
                        return PartyUiHandler.NoEffectMessage;
                    }

                    if (pokemon.species.speciesId !== Species.NONE &&
                        (relevantFormChange.isModForm() && (!pokemon.scene.gameMode.isTestMod && !pokemon.scene.gameData.isModFormUnlocked(relevantFormChange.modFormName))) &&
                        !pokemon.scene.gameData.canUseGlitchOrSmittyForm(pokemon.species.speciesId, rewardTypeMap[formKey])
                        ) {
                        return PartyUiHandler.NoEffectMessage;
                    }
                }

                return null;
            }, isSmittyGlitchItem ?'glitch' : 'items');

        this.formChangeItems = Array.isArray(formChangeItems) ? formChangeItems : [formChangeItems];
    }

    get name(): string {
        const item = Array.isArray(this.formChangeItems) ?
            this.formChangeItems[0] :
            this.formChangeItems;
        return i18next.t(`modifierType:FormChangeItem.${FormChangeItem[item]}`);
    }

    getDescription(scene: BattleScene): string {
        const item = Array.isArray(this.formChangeItems) ?
            this.formChangeItems[0] :
            this.formChangeItems;
        if (FormChangeItem[item].startsWith("SMITTY")) {
            return i18next.t("modifierType:ModifierType.FormChangeItemModifierSmittyItem.description");
        }
        if (this.formChangeItems.length > 1) {
            return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description") +
                ` (Part of a set of ${this.formChangeItems.length} items)`;
        }
        return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description");
    }

    getPregenArgs(): any[] {
        return [this.formChangeItems];
    }
}

export class FusePokemonModifierType extends PokemonModifierType {
    constructor(localeKey: string, iconImage: string) {
        super(localeKey, iconImage, (_type, args) => new Modifiers.FusePokemonModifier(this, (args[0] as PlayerPokemon).id, (args[1] as PlayerPokemon).id),
            (pokemon: PlayerPokemon) => {
                if (pokemon.isFusion()) {
                    return PartyUiHandler.NoEffectMessage;
                }
                return null;
            });
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.FusePokemonModifierType.description");
    }
}

class AttackTypeBoosterModifierTypeGenerator extends ModifierTypeGenerator {
    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in Type)) {
                return new AttackTypeBoosterModifierType(pregenArgs[0] as Type, 20);
            }

            const attackMoveTypes = party.map(p => p.getMoveset().map(m => m?.getMove()).filter(m => m instanceof AttackMove).map(m => m.type)).flat();
            if (!attackMoveTypes.length) {
                return null;
            }


            const attackMoveTypeWeights = new Map<Type, integer>();
            let totalWeight = 0;
            for (const t of attackMoveTypes) {
                if (attackMoveTypeWeights.has(t)) {
                    if (attackMoveTypeWeights.get(t)! < 3) {
                        attackMoveTypeWeights.set(t, attackMoveTypeWeights.get(t)! + 1);
                    } else {
                        continue;
                    }
                } else {
                    attackMoveTypeWeights.set(t, 1);
                }
                totalWeight++;
            }

            if (!totalWeight) {
                return null;
            }

            let type: Type;

            const randInt = Utils.randSeedInt(totalWeight);
            let weight = 0;

            for (const t of attackMoveTypeWeights.keys()) {
                const typeWeight = attackMoveTypeWeights.get(t)!; 
                if (randInt <= weight + typeWeight) {
                    type = t;
                    break;
                }
                weight += typeWeight;
            }

            return new AttackTypeBoosterModifierType(type!, 20);
        });
    }
}

/**
 * Modifier type generator for {@linkcode SpeciesStatBoosterModifierType}, which
 * encapsulates the logic for weighting the most useful held item from
 * the current list of {@linkcode items}.
 * @extends ModifierTypeGenerator
 */
class SpeciesStatBoosterModifierTypeGenerator extends ModifierTypeGenerator {
    /** Object comprised of the currently available species-based stat boosting held items */
    public static items = {
        LIGHT_BALL: {stats: [Stat.ATK, Stat.SPATK], multiplier: 2, species: [Species.PIKACHU]},
        THICK_CLUB: {
            stats: [Stat.ATK],
            multiplier: 2,
            species: [Species.CUBONE, Species.MAROWAK, Species.ALOLA_MAROWAK]
        },
        METAL_POWDER: {stats: [Stat.DEF], multiplier: 2, species: [Species.DITTO]},
        QUICK_POWDER: {stats: [Stat.SPD], multiplier: 2, species: [Species.DITTO]},
    };

    constructor() {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            const items = SpeciesStatBoosterModifierTypeGenerator.items;
            if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in items)) {
                return new SpeciesStatBoosterModifierType(pregenArgs[0] as SpeciesStatBoosterItem);
            }

            const values = Object.values(items);
            const keys = Object.keys(items);
            const weights = keys.map(() => 0);

            for (const p of party) {
                const speciesId = p.getSpeciesForm(true).speciesId;
                const fusionSpeciesId = p.isFusion() ? p.getFusionSpeciesForm(true).speciesId : null;
                const hasFling = p.getMoveset(true).some(m => m?.moveId === Moves.FLING);

                for (const i in values) {
                    const checkedSpecies = values[i].species;
                    const checkedStats = values[i].stats;

                    // If party member already has the item being weighted currently, skip to the next item
                    const hasItem = p.getHeldItems().some(m => m instanceof Modifiers.SpeciesStatBoosterModifier
                        && (m as Modifiers.SpeciesStatBoosterModifier).contains(checkedSpecies[0], checkedStats[0]));

                    if (!hasItem) {
                        if (checkedSpecies.includes(speciesId) || (!!fusionSpeciesId && checkedSpecies.includes(fusionSpeciesId))) {
                            // Add weight if party member has a matching species or, if applicable, a matching fusion species
                            weights[i]++;
                        } else if (checkedSpecies.includes(Species.PIKACHU) && hasFling) {
                            // Add weight to Light Ball if party member has Fling
                            weights[i]++;
                        }
                    }
                }
            }

            let totalWeight = 0;
            for (const weight of weights) {
                totalWeight += weight;
            }

            if (totalWeight !== 0) {
                const randInt = Utils.randSeedInt(totalWeight, 1);
                let weight = 0;

                for (const i in weights) {
                    if (weights[i] !== 0) {
                        const curWeight = weight + weights[i];
                        if (randInt <= weight + weights[i]) {
                            return new SpeciesStatBoosterModifierType(keys[i] as SpeciesStatBoosterItem);
                        }
                        weight = curWeight;
                    }
                }
            }

            return null;
        });
    }
}

class TmModifierTypeGenerator extends ModifierTypeGenerator {
    constructor(tier: ModifierTier) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in Moves)) {
                return new TmModifierType(pregenArgs[0] as Moves);
            }
            const partyMemberCompatibleTms = party.map(p => (p as PlayerPokemon).compatibleTms.filter(tm => !p.moveset.find(m => m?.moveId === tm)));
            const tierUniqueCompatibleTms = partyMemberCompatibleTms.flat().filter(tm => tmPoolTiers[tm] === tier).filter(tm => !allMoves[tm].name.endsWith(" (N)")).filter((tm, i, array) => array.indexOf(tm) === i);
            if (!tierUniqueCompatibleTms.length) {
                return null;
            }
            const randTmIndex = Utils.randSeedInt(tierUniqueCompatibleTms.length);
            return new TmModifierType(tierUniqueCompatibleTms[randTmIndex]);
        });
    }
}

class EvolutionItemModifierTypeGenerator extends ModifierTypeGenerator {
    constructor(rare: boolean) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in EvolutionItem)) {
                return new EvolutionItemModifierType(pregenArgs[0] as EvolutionItem);
            }

            const evolutionItemPool = [
                party.filter(p => pokemonEvolutions.hasOwnProperty(p.species.speciesId)).map(p => {
                    const evolutions = pokemonEvolutions[p.species.speciesId];
                    return evolutions.filter(e => e.item !== EvolutionItem.NONE && (e.evoFormKey === null || (e.preFormKey || "") === p.getFormKey()) && (!e.condition || e.condition.predicate(p)));
                }).flat(),
                party.filter(p => p.isFusion() && p.fusionSpecies && pokemonEvolutions.hasOwnProperty(p.fusionSpecies.speciesId)).map(p => {
                    const evolutions = pokemonEvolutions[p.fusionSpecies!.speciesId];
                    return evolutions.filter(e => e.item !== EvolutionItem.NONE && (e.evoFormKey === null || (e.preFormKey || "") === p.getFusionFormKey()) && (!e.condition || e.condition.predicate(p)));
                }).flat()
            ].flat().flatMap(e => e.item).filter(i => (!!i && i > 50) === rare);

            if (!evolutionItemPool.length) {
                return null;
            }

            return new EvolutionItemModifierType(evolutionItemPool[Utils.randSeedInt(evolutionItemPool.length)]!);
        });
    }
}

class FormChangeItemModifierTypeGenerator extends ModifierTypeGenerator {
    constructor(private onlySmittyItems: boolean = false) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in FormChangeItem)) {
                return new FormChangeItemModifierType(pregenArgs[0] as FormChangeItem);
            }

            let formChangeItemPool = [];

            const glitchPieceModifier = party[0].scene.findModifier(m => m instanceof GlitchPieceModifier) as GlitchPieceModifier;
            const hasEnoughGlitchPieces = (glitchPieceModifier && glitchPieceModifier.getStackCount() >= 5);

            const hasIncompleteSpeciesSmittyForm = party.some(p => {

                if (p.getFormKey().includes(SpeciesFormKey.SMITTY)) {
                    return false;
                }

                const speciesFormChanges = pokemonFormChanges[p.species.speciesId] || [];
                const smittyFormChanges = speciesFormChanges.filter(fc => {
                    const trigger = fc.findTrigger(SmittyFormTrigger);
                    if (!trigger) return false;
                    return p.scene.gameData.canUseGlitchOrSmittyForm(p.species.speciesId, 
                        fc.formKey === SpeciesFormKey.SMITTY ? RewardType.SMITTY_FORM : RewardType.SMITTY_FORM_B
                    );
                });

                if (smittyFormChanges.length) {
                    const currentItems = p.scene.findModifiers(m =>
                        m instanceof Modifiers.PokemonFormChangeItemModifier &&
                        m.pokemonId === p.id
                    ).map(m => (m as Modifiers.PokemonFormChangeItemModifier).formChangeItem);

                    return smittyFormChanges.some(fc => {
                        const smittyTrigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                        const matchingItems = currentItems.filter(item =>
                            smittyTrigger.requiredItems.includes(item));
                        return matchingItems.length >= 2;
                    });
                }
                return false;
            });


            if (!this.onlySmittyItems) {
                formChangeItemPool = [...new Set(party.filter(p =>
                    pokemonFormChanges.hasOwnProperty(p.species.speciesId)
                ).map(p => {
                    const formChanges = pokemonFormChanges[p.species.speciesId] || [];
                    let items = [];

                    let formChangeItemTriggers = formChanges.filter(fc => {
                        const megaPrimalCondition = (fc.formKey.indexOf(SpeciesFormKey.MEGA) === -1 && fc.formKey.indexOf(SpeciesFormKey.PRIMAL) === -1) || party[0].scene.getModifiers(Modifiers.MegaEvolutionAccessModifier).length;
                        const gigantamaxEternamaxCondition = (fc.formKey.indexOf(SpeciesFormKey.GIGANTAMAX) === -1 && fc.formKey.indexOf(SpeciesFormKey.ETERNAMAX) === -1) || party[0].scene.getModifiers(Modifiers.GigantamaxAccessModifier).length;
                        const conditionsCheck = !fc.conditions.length || fc.conditions.filter(cond => cond instanceof SpeciesFormChangeCondition && cond.predicate(p)).length;
                        const formKeyCheck = fc.preFormKey === p.getFormKey();

                        const rewardTypeMap: { [key: string]: RewardType } = {
                            [SpeciesFormKey.GLITCH]: RewardType.GLITCH_FORM_A,
                            [SpeciesFormKey.GLITCH_B]: RewardType.GLITCH_FORM_B,
                            [SpeciesFormKey.GLITCH_C]: RewardType.GLITCH_FORM_C,
                            [SpeciesFormKey.GLITCH_D]: RewardType.GLITCH_FORM_D,
                            [SpeciesFormKey.GLITCH_E]: RewardType.GLITCH_FORM_E,
                            [SpeciesFormKey.SMITTY]: RewardType.SMITTY_FORM,
                            [SpeciesFormKey.SMITTY_B]: RewardType.SMITTY_FORM_B
                        };

                        let glitchFormCheck = true;

                        if  (rewardTypeMap.hasOwnProperty(fc.formKey)) {

                            const isGlitchForm = Object.keys(rewardTypeMap).slice(0, 5).includes(fc.formKey);

                            if(fc.isModForm()) {
                                const glitchTrigger = fc.findTrigger(GlitchPieceTrigger) as GlitchPieceTrigger;
                                glitchFormCheck = glitchTrigger && glitchTrigger.canChange(p) && (p.scene.gameMode.isTestMod || p.scene.gameData.isModFormUnlocked(fc.modFormName));
                            } else {
                            glitchFormCheck = party[0].scene.gameData.canUseGlitchOrSmittyForm(p.species.speciesId, rewardTypeMap[fc.formKey]);
                            
                            if(glitchFormCheck && isGlitchForm) {
                                const glitchTrigger = fc.findTrigger(GlitchPieceTrigger) as GlitchPieceTrigger;
                                    glitchFormCheck = glitchTrigger && glitchTrigger.canChange(p);
                                } 
                            }
                        }

                        return megaPrimalCondition && gigantamaxEternamaxCondition && conditionsCheck && formKeyCheck && glitchFormCheck;
                    });

                    if (p.species.speciesId === Species.NECROZMA) {
                        let necrozmaItems = new Set<FormChangeItem>();
                        let hasULTRA_Z = false,
                            hasN_LUNA = false,
                            hasN_SOLAR = false;

                        formChangeItemTriggers.forEach(fc => {
                            const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
                            if (itemTrigger && itemTrigger.active) {
                                switch (itemTrigger.item) {
                                    case FormChangeItem.ULTRANECROZIUM_Z:
                                        hasULTRA_Z = true;
                                        necrozmaItems.add(itemTrigger.item);
                                        break;
                                    case FormChangeItem.N_LUNARIZER:
                                        hasN_LUNA = true;
                                        necrozmaItems.add(itemTrigger.item);
                                        break;
                                    case FormChangeItem.N_SOLARIZER:
                                        hasN_SOLAR = true;
                                        necrozmaItems.add(itemTrigger.item);
                                        break;
                                }
                            }
                        });

                        if (hasULTRA_Z && hasN_LUNA && hasN_SOLAR) {
                            necrozmaItems.delete(FormChangeItem.ULTRANECROZIUM_Z);
                        }

                        items.push(...necrozmaItems);
                    } else {
                        formChangeItemTriggers.forEach(fc => {
                            const itemTrigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
                            const smittyTrigger = hasEnoughGlitchPieces ? fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger : null;

                            if (itemTrigger && itemTrigger.active && !p.scene.findModifier(m =>
                                m instanceof Modifiers.PokemonFormChangeItemModifier &&
                                m.pokemonId === p.id &&
                                m.formChangeItem === itemTrigger.item)) {
                                items.push(itemTrigger.item);
                            }

                            if (smittyTrigger) {
                                const currentItems = p.scene.findModifiers(m =>
                                    m instanceof Modifiers.PokemonFormChangeItemModifier &&
                                    m.pokemonId === p.id
                                ).map(m => (m as Modifiers.PokemonFormChangeItemModifier).formChangeItem);

                                const matchingItems = currentItems.filter(item =>
                                    smittyTrigger.requiredItems.includes(item));

                                if (matchingItems.length >= 2) {
                                    const remainingItems = smittyTrigger.requiredItems.filter(item =>
                                        !currentItems.includes(item)
                                    );

                                    if (remainingItems.length) {
                                        items.push(remainingItems[Utils.randSeedInt(remainingItems.length)]);
                                    }
                                } else if (Utils.randSeedInt(100) < 30) {
                                    const availableItems = smittyTrigger.requiredItems.filter(item =>
                                        !currentItems.includes(item)
                                    );
                                    if (availableItems.length) {
                                        items.push(availableItems[Utils.randSeedInt(availableItems.length)]);
                                    }
                                }
                            }
                        });
                    }

                    return items;
                }).flat())];
            }

            if (hasEnoughGlitchPieces && (Utils.randSeedInt(100) < 40 || hasIncompleteSpeciesSmittyForm)) {
                for (const pokemon of party) {
                    const currentItems = pokemon.scene.findModifiers(m =>
                        m instanceof Modifiers.PokemonFormChangeItemModifier &&
                        m.pokemonId === pokemon.id
                    ).map(m => (m as Modifiers.PokemonFormChangeItemModifier).formChangeItem);

                    const smittyItemSets = party[0].scene.gameData.uniSmittyUnlocks.flatMap(formName => {
                        const formChange = pokemonFormChanges[Species.NONE]?.find(fc => {
                            const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                            return trigger?.name === formName;
                        });
                        return formChange ? [formChange.findTrigger(SmittyFormTrigger) as SmittyFormTrigger] : [];
                    });

                    for (const smittyTrigger of smittyItemSets) {
                        const requiredItems = smittyTrigger.requiredItems;
                        const collectedItems = requiredItems.filter(item => currentItems.includes(item));
                        if (collectedItems.length === 3) {
                            const remainingItem = requiredItems.find(item => !currentItems.includes(item));
                            if (remainingItem) {
                                return new FormChangeItemModifierType(remainingItem);
                            }
                        }
                    }
                }

                    const universalSmittyItems = party[0].scene.gameData.uniSmittyUnlocks.flatMap(formName => {
                        const formChange = pokemonFormChanges[Species.NONE]?.find(fc => {
                            const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                            const hasForm = party.some(p => p.species.forms[p.formIndex]?.formName === formName);
                            return !hasForm && trigger?.name === formName;
                        });
                        return (formChange?.findTrigger(SmittyFormTrigger) as SmittyFormTrigger)?.requiredItems || [];
                    });

                    const speciesSpecificSmittyItems = party.flatMap(p => {
                        const speciesFormChanges = pokemonFormChanges[p.species.speciesId] || [];
                        return speciesFormChanges
                            .filter(fc => {
                                const trigger = fc.findTrigger(SmittyFormTrigger);
                                const currentForm = p.species.forms[p.formIndex];
                                if (!trigger || trigger?.name === currentForm.formName) return false;
                                return p.scene.gameData.canUseGlitchOrSmittyForm(
                                    p.species.speciesId,
                                    fc.formKey === SpeciesFormKey.SMITTY ? RewardType.SMITTY_FORM : RewardType.SMITTY_FORM_B
                                );
                            })
                            .flatMap(fc => {
                                const trigger = fc.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
                                return trigger.requiredItems;
                            });
                    });

                    const allSmittyItems = Utils.randSeedInt(100) < (hasIncompleteSpeciesSmittyForm ? 75 : 60)
                        ? speciesSpecificSmittyItems.length 
                            ? speciesSpecificSmittyItems 
                            : universalSmittyItems
                        : universalSmittyItems.length 
                            ? universalSmittyItems 
                            : speciesSpecificSmittyItems;


                if (allSmittyItems.length) {
                    formChangeItemPool.push(allSmittyItems[Utils.randSeedInt(allSmittyItems.length)] as FormChangeItem);
                }
            }

            if (!formChangeItemPool.length) {
                return null;
            }

            const selectedItem = formChangeItemPool[Utils.randSeedInt(formChangeItemPool.length)];
            return new FormChangeItemModifierType(selectedItem);
        });
    }
}

export class TerastallizeModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
    private teraType: Type;

    constructor(teraType: Type) {
        super("", `${Type[teraType].toLowerCase()}_tera_shard`, (type, args) => new Modifiers.TerastallizeModifier(type as TerastallizeModifierType, (args[0] as Pokemon).id, teraType), "tera_shard");

        this.teraType = teraType;
    }

    get name(): string {
        return i18next.t("modifierType:ModifierType.TerastallizeModifierType.name", {teraType: i18next.t(`pokemonInfo:Type.${Type[this.teraType]}`)});
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.TerastallizeModifierType.description", {teraType: i18next.t(`pokemonInfo:Type.${Type[this.teraType]}`)});
    }

    getPregenArgs(): any[] {
        return [this.teraType];
    }
}

export class ContactHeldItemTransferChanceModifierType extends PokemonHeldItemModifierType {
    private chancePercent: integer;

    constructor(localeKey: string, iconImage: string, chancePercent: integer, group?: string, soundName?: string) {
        super(localeKey, iconImage, (type, args) => new Modifiers.ContactHeldItemTransferChanceModifier(type, (args[0] as Pokemon).id, chancePercent), group, soundName);

        this.chancePercent = chancePercent;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.ContactHeldItemTransferChanceModifierType.description", {chancePercent: this.chancePercent});
    }
}

export class TurnHeldItemTransferModifierType extends PokemonHeldItemModifierType {
    constructor(localeKey: string, iconImage: string, group?: string, soundName?: string) {
        super(localeKey, iconImage, (type, args) => new Modifiers.TurnHeldItemTransferModifier(type, (args[0] as Pokemon).id), group, soundName);
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.TurnHeldItemTransferModifierType.description");
    }
}

export class EnemyAttackStatusEffectChanceModifierType extends ModifierType {
    private chancePercent: integer;
    private effect: StatusEffect;

    constructor(localeKey: string, iconImage: string, chancePercent: integer, effect: StatusEffect, stackCount?: integer) {
        super(localeKey, iconImage, (type, args) => new Modifiers.EnemyAttackStatusEffectChanceModifier(type, effect, chancePercent, stackCount), "enemy_status_chance");

        this.chancePercent = chancePercent;
        this.effect = effect;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.EnemyAttackStatusEffectChanceModifierType.description", {
            chancePercent: this.chancePercent,
            statusEffect: getStatusEffectDescriptor(this.effect),
        });
    }
}

export class EnemyEndureChanceModifierType extends ModifierType {
    private chancePercent: number;

    constructor(localeKey: string, iconImage: string, chancePercent: number) {
        super(localeKey, iconImage, (type, _args) => new Modifiers.EnemyEndureChanceModifier(type, chancePercent), "enemy_endure");

        this.chancePercent = chancePercent;
    }

    getDescription(scene: BattleScene): string {
        return i18next.t("modifierType:ModifierType.EnemyEndureChanceModifierType.description", {chancePercent: this.chancePercent});
    }
}

export type ModifierTypeFunc = () => ModifierType;
type WeightedModifierTypeWeightFunc = (party: Pokemon[], rerollCount?: integer) => integer;

/**
 * High order function that returns a WeightedModifierTypeWeightFunc that will only be applied on
 * classic and skip an ModifierType if current wave is greater or equal to the one passed down
 * @param wave - Wave where we should stop showing the modifier
 * @param defaultWeight - ModifierType default weight
 * @returns A WeightedModifierTypeWeightFunc
 */
function skipInClassicAfterWave(wave: integer, defaultWeight: integer): WeightedModifierTypeWeightFunc {
    return (party: Pokemon[]) => {
        const gameMode = party[0].scene.gameMode;
        const currentWave = party[0].scene.currentBattle.waveIndex;
        return gameMode.isClassic && currentWave >= wave ? 0 : defaultWeight;
    };
}

/**
 * High order function that returns a WeightedModifierTypeWeightFunc that will only be applied on
 * classic and it will skip a ModifierType if it is the last wave pull.
 * @param defaultWeight ModifierType default weight
 * @returns A WeightedModifierTypeWeightFunc
 */
function skipInLastClassicWaveOrDefault(defaultWeight: integer): WeightedModifierTypeWeightFunc {
    return skipInClassicAfterWave(199, defaultWeight);
}

class WeightedModifierType {
    public modifierType: ModifierType;
    public weight: integer | WeightedModifierTypeWeightFunc;
    public maxWeight: integer;

    constructor(modifierTypeFunc: ModifierTypeFunc, weight: integer | WeightedModifierTypeWeightFunc, maxWeight?: integer) {
        this.modifierType = modifierTypeFunc();
        this.modifierType.id = Object.keys(modifierTypes).find(k => modifierTypes[k] === modifierTypeFunc)!; // TODO: is this bang correct?
        this.weight = weight;
        this.maxWeight = maxWeight || (!(weight instanceof Function) ? weight : 0);
    }

    setTier(tier: ModifierTier) {
        this.modifierType.setTier(tier);
    }
}

type BaseModifierOverride = {
    name: Exclude<ModifierTypeKeys, GeneratorModifierOverride["name"]>;
    count?: number;
};

/** Type for modifiers and held items that are constructed via {@linkcode ModifierTypeGenerator}. */
export type GeneratorModifierOverride = {
    count?: number;
} & (
    | {
    name: keyof Pick<typeof modifierTypes, "SPECIES_STAT_BOOSTER">;
    type?: SpeciesStatBoosterItem;
}
    | {
    name: keyof Pick<typeof modifierTypes, "TEMP_STAT_BOOSTER">;
    type?: TempBattleStat;
}
    | {
    name: keyof Pick<typeof modifierTypes, "BASE_STAT_BOOSTER">;
    type?: Stat;
}
    | {
    name: keyof Pick<typeof modifierTypes, "MINT">;
    type?: Nature;
}
    | {
    name: keyof Pick<typeof modifierTypes, "ATTACK_TYPE_BOOSTER" | "TERA_SHARD">;
    type?: Type;
}
    | {
    name: keyof Pick<typeof modifierTypes, "BERRY">;
    type?: BerryType;
}
    | {
    name: keyof Pick<typeof modifierTypes, "EVOLUTION_ITEM" | "RARE_EVOLUTION_ITEM">;
    type?: EvolutionItem;
}
    | {
    name: keyof Pick<typeof modifierTypes, "FORM_CHANGE_ITEM">;
    type?: FormChangeItem;
}
    | {
    name: keyof Pick<typeof modifierTypes, "TM_COMMON" | "TM_GREAT" | "TM_ULTRA">;
    type?: Moves;
}
    );

/** Type used to construct modifiers and held items for overriding purposes. */
export type ModifierOverride = GeneratorModifierOverride | BaseModifierOverride;

export type ModifierTypeKeys = keyof typeof modifierTypes;

export const modifierTypes = {
    POKEBALL: () => new AddPokeballModifierType("pb", PokeballType.POKEBALL, 5),
    GREAT_BALL: () => new AddPokeballModifierType("gb", PokeballType.GREAT_BALL, 5),
    ULTRA_BALL: () => new AddPokeballModifierType("ub", PokeballType.ULTRA_BALL, 5),
    ROGUE_BALL: () => new AddPokeballModifierType("rb", PokeballType.ROGUE_BALL, 5),
    MASTER_BALL: () => new AddPokeballModifierType("mb", PokeballType.MASTER_BALL, 1),

    RARE_CANDY: () => new PokemonLevelIncrementModifierType("modifierType:ModifierType.RARE_CANDY", "rare_candy"),
    RARER_CANDY: () => new AllPokemonLevelIncrementModifierType("modifierType:ModifierType.RARER_CANDY", "rarer_candy"),

    EVOLUTION_ITEM: () => new EvolutionItemModifierTypeGenerator(false),
    RARE_EVOLUTION_ITEM: () => new EvolutionItemModifierTypeGenerator(true),
    FORM_CHANGE_ITEM: () => new FormChangeItemModifierTypeGenerator(),
    SMITTY_FORM_CHANGE_ITEM: () => new FormChangeItemModifierTypeGenerator(true),

    MEGA_BRACELET: () => new ModifierType("modifierType:ModifierType.MEGA_BRACELET", "mega_bracelet", (type, _args) => new Modifiers.MegaEvolutionAccessModifier(type)),
    DYNAMAX_BAND: () => new ModifierType("modifierType:ModifierType.DYNAMAX_BAND", "dynamax_band", (type, _args) => new Modifiers.GigantamaxAccessModifier(type)),
    TERA_ORB: () => new ModifierType("modifierType:ModifierType.TERA_ORB", "tera_orb", (type, _args) => new Modifiers.TerastallizeAccessModifier(type)),

    
    GLITCH_PIECE: () => new GlitchPieceModifierType(),
    SACRIFICE_TOGGLE: () => new SacrificeToggleModifierType(),
    
    STAT_SWITCHER: () => new StatSwitcherModifierTypeGenerator(),

    
    ABILITY_SWITCHER: () => new AbilitySwitcherModifierType("Ability Switcher"),

    
    TYPE_SWITCHER: () => new TypeSwitcherModifierTypeGenerator(),

    PRIMARY_TYPE_SWITCHER: () => new PrimaryTypeSwitcherModifierTypeGenerator(),

    SECONDARY_TYPE_SWITCHER: () => new SecondaryTypeSwitcherModifierTypeGenerator(),



    ANYTM_COMMON: () => new AnyTmModifierTypeGenerator(ModifierTier.COMMON),
    ANYTM_GREAT: () => new AnyTmModifierTypeGenerator(ModifierTier.GREAT),
    ANYTM_ULTRA: () => new AnyTmModifierTypeGenerator(ModifierTier.ULTRA),
    ANYTM_MASTER: () => new AnyTmModifierTypeGenerator(ModifierTier.MASTER),
    ANYTM_LUXURY: () => new AnyTmModifierTypeGenerator(ModifierTier.LUXURY),

    ANY_ABILITY: () => new AnyAbilityModifierTypeGenerator(),
    ANY_SMITTY_ABILITY: () => new AnySmittyAbilityModifierTypeGenerator(),
    ANY_PASSIVE_ABILITY: () => new AnyPassiveAbilityModifierTypeGenerator(),
    ANY_SMITTY_PASSIVE_ABILITY: () => new AnySmittyPassiveAbilityModifierTypeGenerator(),


    STAT_SACRIFICE: () => new StatSacrificeModifierTypeGenerator(),
    TYPE_SACRIFICE: () => new TypeSacrificeModifierTypeGenerator(),
    MOVE_SACRIFICE: () => new MoveSacrificeModifierTypeGenerator(),
    ABILITY_SACRIFICE: () => new AbilitySacrificeModifierTypeGenerator(),
    PASSIVE_ABILITY_SACRIFICE: () => new PassiveAbilitySacrificeModifierTypeGenerator(),

    ADD_POKEMON: () => new AddPokemonModifierTypeGenerator(),
    DRAFT_POKEMON: () => new AddPokemonModifierTypeGenerator(true),

    COLLECTED_TYPE: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && pregenArgs.length > 0) {
            return new CollectedTypeModifierType(pregenArgs[0] as Type);
        }
        return new CollectedTypeModifierType(Type.NORMAL);
    }),

    MOVE_UPGRADE: () => new MoveUpgradeModifierTypeGenerator(),

    PERMA_PARTY_ABILITY: () => new PermaPartyAbilityModifierTypeGenerator(),
    PERMA_NEW_NORMAL: () => new PermaModifierTypeGenerator(PermaType.PERMA_NEW_NORMAL, 500, PermaDuration.WAVE_BASED),
    PERMA_REROLL_COST_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_REROLL_COST_1, 750, PermaDuration.WAVE_BASED),
    PERMA_REROLL_COST_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_REROLL_COST_2, 750, PermaDuration.WAVE_BASED),
    PERMA_REROLL_COST_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_REROLL_COST_3, 750, PermaDuration.WAVE_BASED),
    PERMA_SHOW_REWARDS_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHOW_REWARDS_1, 750, PermaDuration.WAVE_BASED),
    PERMA_SHOW_REWARDS_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHOW_REWARDS_2, 750, PermaDuration.WAVE_BASED),
    PERMA_SHOW_REWARDS_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHOW_REWARDS_3, 750, PermaDuration.WAVE_BASED),
    PERMA_FUSION_INCREASE_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_FUSION_INCREASE_1, 750, PermaDuration.WAVE_BASED),
    PERMA_FUSION_INCREASE_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_FUSION_INCREASE_2, 750, PermaDuration.WAVE_BASED),
    PERMA_FUSION_INCREASE_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_FUSION_INCREASE_3, 750, PermaDuration.WAVE_BASED),
    PERMA_CATCH_RATE_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_CATCH_RATE_1, 750, PermaDuration.WAVE_BASED),
    PERMA_CATCH_RATE_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_CATCH_RATE_2, 750, PermaDuration.WAVE_BASED),
    PERMA_CATCH_RATE_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_CATCH_RATE_3, 750, PermaDuration.WAVE_BASED),
    PERMA_TRAINER_SNATCH_COST_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_TRAINER_SNATCH_COST_1, 750, PermaDuration.WAVE_BASED),
    PERMA_TRAINER_SNATCH_COST_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_TRAINER_SNATCH_COST_2, 750, PermaDuration.WAVE_BASED),
    PERMA_TRAINER_SNATCH_COST_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_TRAINER_SNATCH_COST_3, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REVIVE_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REVIVE_1, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REVIVE_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REVIVE_2, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REVIVE_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REVIVE_3, 750, PermaDuration.WAVE_BASED),
    PERMA_FREE_REROLL: () => new PermaModifierTypeGenerator(PermaType.PERMA_FREE_REROLL, 750, PermaDuration.USE_BASED),
    PERMA_BETTER_LUCK_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_BETTER_LUCK_2, 750, PermaDuration.WAVE_BASED),
    PERMA_BETTER_LUCK_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_BETTER_LUCK_3, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REWARD_CHOICE_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REWARD_CHOICE_1, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REWARD_CHOICE_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REWARD_CHOICE_2, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_REWARD_CHOICE_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_REWARD_CHOICE_3, 1000),
    PERMA_POST_BATTLE_MONEY_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_POST_BATTLE_MONEY_1, 750, PermaDuration.WAVE_BASED),
    PERMA_POST_BATTLE_MONEY_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_POST_BATTLE_MONEY_2, 750, PermaDuration.WAVE_BASED),
    PERMA_POST_BATTLE_MONEY_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_POST_BATTLE_MONEY_3, 750, PermaDuration.WAVE_BASED),
    PERMA_START_BALL_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_BALL_1, 750, PermaDuration.USE_BASED),
    PERMA_START_BALL_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_BALL_2, 750, PermaDuration.USE_BASED),
    PERMA_START_BALL_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_BALL_3, 750, PermaDuration.USE_BASED),
    PERMA_START_MONEY_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_MONEY_1, 500, PermaDuration.USE_BASED),
    PERMA_START_MONEY_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_MONEY_2, 750, PermaDuration.USE_BASED),
    PERMA_START_MONEY_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_MONEY_3, 750, PermaDuration.USE_BASED),
    PERMA_START_GLITCH_PIECES_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_GLITCH_PIECES_1, 750, PermaDuration.USE_BASED),
    PERMA_START_GLITCH_PIECES_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_GLITCH_PIECES_2, 750, PermaDuration.USE_BASED),
    PERMA_START_GLITCH_PIECES_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_START_GLITCH_PIECES_3, 750, PermaDuration.USE_BASED),
    PERMA_METRONOME_LEVELUP: () => new PermaModifierTypeGenerator(PermaType.PERMA_METRONOME_LEVELUP, 750, PermaDuration.WAVE_BASED),
    PERMA_NEW_ROUND_TERA: () => new PermaModifierTypeGenerator(PermaType.PERMA_NEW_ROUND_TERA, 750, PermaDuration.WAVE_BASED),
    PERMA_RUN_ANYTHING_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_RUN_ANYTHING_2, 750, PermaDuration.WAVE_BASED),
    PERMA_SHINY_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHINY_1, 750, PermaDuration.WAVE_BASED),
    PERMA_SHINY_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHINY_2, 750, PermaDuration.WAVE_BASED),
    PERMA_SHINY_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_SHINY_3, 750, PermaDuration.WAVE_BASED),
    PERMA_CHEAPER_FUSIONS_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_CHEAPER_FUSIONS_1, 750, PermaDuration.WAVE_BASED),
    PERMA_CHEAPER_FUSIONS_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_CHEAPER_FUSIONS_2, 750, PermaDuration.WAVE_BASED),
    PERMA_CHEAPER_FUSIONS_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_CHEAPER_FUSIONS_3, 750, PermaDuration.WAVE_BASED),
    PERMA_STARTER_POINT_LIMIT_INC_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_STARTER_POINT_LIMIT_INC_1, 750, PermaDuration.USE_BASED),
    PERMA_STARTER_POINT_LIMIT_INC_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_STARTER_POINT_LIMIT_INC_2, 750, PermaDuration.USE_BASED),
    PERMA_STARTER_POINT_LIMIT_INC_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_STARTER_POINT_LIMIT_INC_3, 750, PermaDuration.USE_BASED),
    PERMA_LONGER_TERA_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_TERA_1, 750, PermaDuration.WAVE_BASED),
    PERMA_LONGER_TERA_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_TERA_2, 750, PermaDuration.WAVE_BASED),
    PERMA_LONGER_TERA_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_TERA_3, 750, PermaDuration.WAVE_BASED),
    PERMA_LONGER_STAT_BOOSTS_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_STAT_BOOSTS_1, 750, PermaDuration.WAVE_BASED),
    PERMA_LONGER_STAT_BOOSTS_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_STAT_BOOSTS_2, 750, PermaDuration.WAVE_BASED),
    PERMA_LONGER_STAT_BOOSTS_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_LONGER_STAT_BOOSTS_3, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_GLITCH_PIECES_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_GLITCH_PIECES_1, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_GLITCH_PIECES_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_GLITCH_PIECES_2, 750, PermaDuration.WAVE_BASED),
    PERMA_MORE_GLITCH_PIECES_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_MORE_GLITCH_PIECES_3, 750, PermaDuration.WAVE_BASED),
    PERMA_GLITCH_PIECE_MAX_PLUS_1: () => new PermaModifierTypeGenerator(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_1, 750, PermaDuration.WAVE_BASED),
    PERMA_GLITCH_PIECE_MAX_PLUS_2: () => new PermaModifierTypeGenerator(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_2, 750, PermaDuration.WAVE_BASED),
    PERMA_GLITCH_PIECE_MAX_PLUS_3: () => new PermaModifierTypeGenerator(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_3, 750, PermaDuration.WAVE_BASED),
    PERMA_TRANSFER_TERA: () => new PermaModifierTypeGenerator(PermaType.PERMA_TRANSFER_TERA, 750, PermaDuration.WAVE_BASED),

    MAP: () => new ModifierType("modifierType:ModifierType.MAP", "map", (type, _args) => new Modifiers.MapModifier(type)),

    POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.POTION", "potion", 20, 10),
    SUPER_POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.SUPER_POTION", "super_potion", 50, 25),
    HYPER_POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.HYPER_POTION", "hyper_potion", 200, 50),
    MAX_POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.MAX_POTION", "max_potion", 0, 100),
    FULL_RESTORE: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.FULL_RESTORE", "full_restore", 0, 100, true),

    REVIVE: () => new PokemonReviveModifierType("modifierType:ModifierType.REVIVE", "revive", 50),
    MAX_REVIVE: () => new PokemonReviveModifierType("modifierType:ModifierType.MAX_REVIVE", "max_revive", 100),

    FULL_HEAL: () => new PokemonStatusHealModifierType("modifierType:ModifierType.FULL_HEAL", "full_heal"),

    SACRED_ASH: () => new AllPokemonFullReviveModifierType("modifierType:ModifierType.SACRED_ASH", "sacred_ash"),

    REVIVER_SEED: () => new PokemonHeldItemModifierType("modifierType:ModifierType.REVIVER_SEED", "reviver_seed", (type, args) => new Modifiers.PokemonInstantReviveModifier(type, (args[0] as Pokemon).id)),
    WHITE_HERB: () => new PokemonHeldItemModifierType("modifierType:ModifierType.WHITE_HERB", "white_herb", (type, args) => new Modifiers.PokemonResetNegativeStatStageModifier(type, (args[0] as Pokemon).id)),

    ETHER: () => new PokemonPpRestoreModifierType("modifierType:ModifierType.ETHER", "ether", 10),
    MAX_ETHER: () => new PokemonPpRestoreModifierType("modifierType:ModifierType.MAX_ETHER", "max_ether", -1),

    ELIXIR: () => new PokemonAllMovePpRestoreModifierType("modifierType:ModifierType.ELIXIR", "elixir", 10),
    MAX_ELIXIR: () => new PokemonAllMovePpRestoreModifierType("modifierType:ModifierType.MAX_ELIXIR", "max_elixir", -1),

    PP_UP: () => new PokemonPpUpModifierType("modifierType:ModifierType.PP_UP", "pp_up", 1),
    PP_MAX: () => new PokemonPpUpModifierType("modifierType:ModifierType.PP_MAX", "pp_max", 3),

    LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.LURE", "lure", 5),
    SUPER_LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.SUPER_LURE", "super_lure", 10),
    MAX_LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.MAX_LURE", "max_lure", 25),

    SPECIES_STAT_BOOSTER: () => new SpeciesStatBoosterModifierTypeGenerator(),

    TEMP_STAT_BOOSTER: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in TempBattleStat)) {
            return new TempBattleStatBoosterModifierType(pregenArgs[0] as TempBattleStat);
        }
        const randTempBattleStat = Utils.randSeedInt(6) as TempBattleStat;
        return new TempBattleStatBoosterModifierType(randTempBattleStat);
    }),
    DIRE_HIT: () => new TempBattleStatBoosterModifierType(TempBattleStat.CRIT),

    BASE_STAT_BOOSTER: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in Stat)) {
            const stat = pregenArgs[0] as Stat;
            return new PokemonBaseStatBoosterModifierType(getBaseStatBoosterItemName(stat), stat);
        }
        const randStat = Utils.randSeedInt(6) as Stat;
        return new PokemonBaseStatBoosterModifierType(getBaseStatBoosterItemName(randStat), randStat);
    }),

    ATTACK_TYPE_BOOSTER: () => new AttackTypeBoosterModifierTypeGenerator(),

    MINT: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in Nature)) {
            return new PokemonNatureChangeModifierType(pregenArgs[0] as Nature);
        }
        return new PokemonNatureChangeModifierType(Utils.randSeedInt(Utils.getEnumValues(Nature).length) as Nature);
    }),

    TERA_SHARD: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in Type)) {
            return new TerastallizeModifierType(pregenArgs[0] as Type);
        }
        if (!party[0].scene.getModifiers(Modifiers.TerastallizeAccessModifier).length) {
            return null;
        }
        let type: Type;
        if (!Utils.randSeedInt(3)) {
            const partyMemberTypes = party.map(p => p.getTypes(false, false, true)).flat();
            type = Utils.randSeedItem(partyMemberTypes);
        } else {
            type = Utils.randSeedInt(64) ? Utils.randSeedInt(18) as Type : Type.STELLAR;
        }
        return new TerastallizeModifierType(type);
    }),

    BERRY: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        if (pregenArgs && (pregenArgs.length === 1) && (pregenArgs[0] in BerryType)) {
            return new BerryModifierType(pregenArgs[0] as BerryType);
        }
        const berryTypes = Utils.getEnumValues(BerryType);
        let randBerryType: BerryType;
        const rand = Utils.randSeedInt(12);
        if (rand < 2) {
            randBerryType = BerryType.SITRUS;
        } else if (rand < 4) {
            randBerryType = BerryType.LUM;
        } else if (rand < 6) {
            randBerryType = BerryType.LEPPA;
        } else {
            randBerryType = berryTypes[Utils.randSeedInt(berryTypes.length - 3) + 2];
        }
        return new BerryModifierType(randBerryType);
    }),

    TM_COMMON: () => new TmModifierTypeGenerator(ModifierTier.COMMON),
    TM_GREAT: () => new TmModifierTypeGenerator(ModifierTier.GREAT),
    TM_ULTRA: () => new TmModifierTypeGenerator(ModifierTier.ULTRA),

    MEMORY_MUSHROOM: () => new RememberMoveModifierType("modifierType:ModifierType.MEMORY_MUSHROOM", "big_mushroom"),

    EXP_SHARE: () => new ModifierType("modifierType:ModifierType.EXP_SHARE", "exp_share", (type, _args) => new Modifiers.ExpShareModifier(type)),
    EXP_BALANCE: () => new ModifierType("modifierType:ModifierType.EXP_BALANCE", "exp_balance", (type, _args) => new Modifiers.ExpBalanceModifier(type)),

    OVAL_CHARM: () => new ModifierType("modifierType:ModifierType.OVAL_CHARM", "oval_charm", (type, _args) => new Modifiers.MultipleParticipantExpBonusModifier(type)),

    EXP_CHARM: () => new ExpBoosterModifierType("modifierType:ModifierType.EXP_CHARM", "exp_charm", 25),
    SUPER_EXP_CHARM: () => new ExpBoosterModifierType("modifierType:ModifierType.SUPER_EXP_CHARM", "super_exp_charm", 60),
    GOLDEN_EXP_CHARM: () => new ExpBoosterModifierType("modifierType:ModifierType.GOLDEN_EXP_CHARM", "golden_exp_charm", 100),

    LUCKY_EGG: () => new PokemonExpBoosterModifierType("modifierType:ModifierType.LUCKY_EGG", "lucky_egg", 40),
    GOLDEN_EGG: () => new PokemonExpBoosterModifierType("modifierType:ModifierType.GOLDEN_EGG", "golden_egg", 100),

    SOOTHE_BELL: () => new PokemonFriendshipBoosterModifierType("modifierType:ModifierType.SOOTHE_BELL", "soothe_bell"),

    SCOPE_LENS: () => new PokemonHeldItemModifierType("modifierType:ModifierType.SCOPE_LENS", "scope_lens", (type, args) => new Modifiers.CritBoosterModifier(type, (args[0] as Pokemon).id, 1)),
    LEEK: () => new PokemonHeldItemModifierType("modifierType:ModifierType.LEEK", "leek", (type, args) => new Modifiers.SpeciesCritBoosterModifier(type, (args[0] as Pokemon).id, 2, [Species.FARFETCHD, Species.GALAR_FARFETCHD, Species.SIRFETCHD])),

    EVIOLITE: () => new PokemonHeldItemModifierType("modifierType:ModifierType.EVIOLITE", "eviolite", (type, args) => new Modifiers.EvolutionStatBoosterModifier(type, (args[0] as Pokemon).id, [Stat.DEF, Stat.SPDEF], 1.5)),

    SOUL_DEW: () => new PokemonHeldItemModifierType("modifierType:ModifierType.SOUL_DEW", "soul_dew", (type, args) => new Modifiers.PokemonNatureWeightModifier(type, (args[0] as Pokemon).id)),

    NUGGET: () => new MoneyRewardModifierType("modifierType:ModifierType.NUGGET", "nugget", 1, "modifierType:ModifierType.MoneyRewardModifierType.extra.small"),
    BIG_NUGGET: () => new MoneyRewardModifierType("modifierType:ModifierType.BIG_NUGGET", "big_nugget", 2.5, "modifierType:ModifierType.MoneyRewardModifierType.extra.moderate"),
    RELIC_GOLD: () => new MoneyRewardModifierType("modifierType:ModifierType.RELIC_GOLD", "relic_gold", 10, "modifierType:ModifierType.MoneyRewardModifierType.extra.large"),

    AMULET_COIN: () => new ModifierType("modifierType:ModifierType.AMULET_COIN", "amulet_coin", (type, _args) => new Modifiers.MoneyMultiplierModifier(type)),
    GOLDEN_PUNCH: () => new PokemonHeldItemModifierType("modifierType:ModifierType.GOLDEN_PUNCH", "golden_punch", (type, args) => new Modifiers.DamageMoneyRewardModifier(type, (args[0] as Pokemon).id)),
    COIN_CASE: () => new ModifierType("modifierType:ModifierType.COIN_CASE", "coin_case", (type, _args) => new Modifiers.MoneyInterestModifier(type)),

    LOCK_CAPSULE: () => new ModifierType("modifierType:ModifierType.LOCK_CAPSULE", "lock_capsule", (type, _args) => new Modifiers.LockModifierTiersModifier(type)),

    GRIP_CLAW: () => new ContactHeldItemTransferChanceModifierType("modifierType:ModifierType.GRIP_CLAW", "grip_claw", 10),
    WIDE_LENS: () => new PokemonMoveAccuracyBoosterModifierType("modifierType:ModifierType.WIDE_LENS", "wide_lens", 5),

    MULTI_LENS: () => new PokemonMultiHitModifierType("modifierType:ModifierType.MULTI_LENS", "zoom_lens"),

    HEALING_CHARM: () => new ModifierType("modifierType:ModifierType.HEALING_CHARM", "healing_charm", (type, _args) => new Modifiers.HealingBoosterModifier(type, 1.1)),
    CANDY_JAR: () => new ModifierType("modifierType:ModifierType.CANDY_JAR", "candy_jar", (type, _args) => new Modifiers.LevelIncrementBoosterModifier(type)),

    BERRY_POUCH: () => new ModifierType("modifierType:ModifierType.BERRY_POUCH", "berry_pouch", (type, _args) => new Modifiers.PreserveBerryModifier(type)),

    FOCUS_BAND: () => new PokemonHeldItemModifierType("modifierType:ModifierType.FOCUS_BAND", "focus_band", (type, args) => new Modifiers.SurviveDamageModifier(type, (args[0] as Pokemon).id)),

    QUICK_CLAW: () => new PokemonHeldItemModifierType("modifierType:ModifierType.QUICK_CLAW", "quick_claw", (type, args) => new Modifiers.BypassSpeedChanceModifier(type, (args[0] as Pokemon).id)),

    KINGS_ROCK: () => new PokemonHeldItemModifierType("modifierType:ModifierType.KINGS_ROCK", "kings_rock", (type, args) => new Modifiers.FlinchChanceModifier(type, (args[0] as Pokemon).id)),

    LEFTOVERS: () => new PokemonHeldItemModifierType("modifierType:ModifierType.LEFTOVERS", "leftovers", (type, args) => new Modifiers.TurnHealModifier(type, (args[0] as Pokemon).id)),
    SHELL_BELL: () => new PokemonHeldItemModifierType("modifierType:ModifierType.SHELL_BELL", "shell_bell", (type, args) => new Modifiers.HitHealModifier(type, (args[0] as Pokemon).id)),

    TOXIC_ORB: () => new PokemonHeldItemModifierType("modifierType:ModifierType.TOXIC_ORB", "toxic_orb", (type, args) => new Modifiers.TurnStatusEffectModifier(type, (args[0] as Pokemon).id)),
    FLAME_ORB: () => new PokemonHeldItemModifierType("modifierType:ModifierType.FLAME_ORB", "flame_orb", (type, args) => new Modifiers.TurnStatusEffectModifier(type, (args[0] as Pokemon).id)),

    BATON: () => new PokemonHeldItemModifierType("modifierType:ModifierType.BATON", "baton", (type, args) => new Modifiers.SwitchEffectTransferModifier(type, (args[0] as Pokemon).id)),

    SHINY_CHARM: () => new ModifierType("modifierType:ModifierType.SHINY_CHARM", "shiny_charm", (type, _args) => new Modifiers.ShinyRateBoosterModifier(type)),
    ABILITY_CHARM: () => new ModifierType("modifierType:ModifierType.ABILITY_CHARM", "ability_charm", (type, _args) => new Modifiers.HiddenAbilityRateBoosterModifier(type)),

    IV_SCANNER: () => new ModifierType("modifierType:ModifierType.IV_SCANNER", "scanner", (type, _args) => new Modifiers.IvScannerModifier(type)),

    DNA_SPLICERS: () => new FusePokemonModifierType("modifierType:ModifierType.DNA_SPLICERS", "dna_splicers"),

    MINI_BLACK_HOLE: () => new TurnHeldItemTransferModifierType("modifierType:ModifierType.MINI_BLACK_HOLE", "mini_black_hole"),

    VOUCHER: () => new AddVoucherModifierType(VoucherType.REGULAR, 1),
    VOUCHER_PLUS: () => new AddVoucherModifierType(VoucherType.PLUS, 1),
    VOUCHER_PREMIUM: () => new AddVoucherModifierType(VoucherType.PREMIUM, 1),

    GOLDEN_POKEBALL: () => new ModifierType("modifierType:ModifierType.GOLDEN_POKEBALL", "pb_gold", (type, _args) => new Modifiers.ExtraModifierModifier(type), undefined, "se/pb_bounce_1"),

    ENEMY_DAMAGE_BOOSTER: () => new ModifierType("modifierType:ModifierType.ENEMY_DAMAGE_BOOSTER", "wl_item_drop", (type, _args) => new Modifiers.EnemyDamageBoosterModifier(type, 5)),
    ENEMY_DAMAGE_REDUCTION: () => new ModifierType("modifierType:ModifierType.ENEMY_DAMAGE_REDUCTION", "wl_guard_spec", (type, _args) => new Modifiers.EnemyDamageReducerModifier(type, 2.5)),
    ENEMY_HEAL: () => new ModifierType("modifierType:ModifierType.ENEMY_HEAL", "wl_potion", (type, _args) => new Modifiers.EnemyTurnHealModifier(type, 2, 10)),
    ENEMY_ATTACK_POISON_CHANCE: () => new EnemyAttackStatusEffectChanceModifierType("modifierType:ModifierType.ENEMY_ATTACK_POISON_CHANCE", "wl_antidote", 5, StatusEffect.POISON, 10),
    ENEMY_ATTACK_PARALYZE_CHANCE: () => new EnemyAttackStatusEffectChanceModifierType("modifierType:ModifierType.ENEMY_ATTACK_PARALYZE_CHANCE", "wl_paralyze_heal", 2.5, StatusEffect.PARALYSIS, 10),
    ENEMY_ATTACK_BURN_CHANCE: () => new EnemyAttackStatusEffectChanceModifierType("modifierType:ModifierType.ENEMY_ATTACK_BURN_CHANCE", "wl_burn_heal", 5, StatusEffect.BURN, 10),
    ENEMY_STATUS_EFFECT_HEAL_CHANCE: () => new ModifierType("modifierType:ModifierType.ENEMY_STATUS_EFFECT_HEAL_CHANCE", "wl_full_heal", (type, _args) => new Modifiers.EnemyStatusEffectHealChanceModifier(type, 2.5, 10)),
    ENEMY_ENDURE_CHANCE: () => new EnemyEndureChanceModifierType("modifierType:ModifierType.ENEMY_ENDURE_CHANCE", "wl_reset_urge", 2),
    ENEMY_FUSED_CHANCE: () => new ModifierType("modifierType:ModifierType.ENEMY_FUSED_CHANCE", "wl_custom_spliced", (type, _args) => new Modifiers.EnemyFusionChanceModifier(type, 1)),

    

    PERMA_MONEY_1: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 250),
    PERMA_MONEY_2: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 500),
    PERMA_MONEY_3: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 1000),
    PERMA_MONEY_4: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500),
    PERMA_MONEY_5: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 5000),

    SELECTABLE_PMONEY_1: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 250, true),
    SELECTABLE_PMONEY_2: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 500, true),
    SELECTABLE_PMONEY_3: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 1000, true),
    SELECTABLE_PMONEY_4: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500, true),
    SELECTABLE_PMONEY_5: () => new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 5000, true),

    SELECTABLE_PMONEY_4OR5: () => new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
        const moneyRand = Utils.randSeedInt(100);
        if (moneyRand < 50) {
            return new PermaMoneyModifierType("modifierType:PermaMoneyLarge", "coin", 5000, true);
        } else {
            return new PermaMoneyModifierType("modifierType:PermaMoneyLarge", "coin", 10000, true);
        }
    }),

    REROLL: () => new ModifierType("modifierType:ModifierType.REROLL", "reroll_icon", (type, _args) => new RerollModifier(type)),

    TAUROS_ELECTRIC_HIT_QUEST: () => taurosElectricHitModifier,
    KECLEON_COLOR_CHANGE_QUEST: () => kecleonColorChangeModifier,
    GLISCOR_DARK_MOVE_KNOCKOUT_QUEST: () => gliscorDarkMoveKnockoutModifier,
    MAROWAK_CUBONE_FAINT_QUEST: () => marowakCuboneFaintModifier,
    NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST: () => noivernDragonMoveKnockoutModifier,
    FERALIGATR_DRAGON_DEFEAT_QUEST: () => feraligatrDragonDefeatModifier,
    CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST: () => charizardGroundMoveKnockoutModifier,
    VENUSAUR_PSYCHIC_MOVE_USE_QUEST: () => venusaurPsychicMoveUseModifier,
    BLASTOISE_FAIRY_DEFEAT_QUEST: () => blastoiseFairyDefeatModifier,
    NIDOKING_DEFEAT_QUEST: () => nidokingDefeatModifier,
    GENGAR_SPECIAL_WAVE_QUEST: () => gengarSpecialWaveModifier,
    WEEZING_FIRE_MOVE_KNOCKOUT_QUEST: () => weezingFireMoveKnockoutModifier,
    HITMONLEE_NORMAL_WAVE_QUEST: () => hitmonleeNormalWaveModifier,
    HITMONCHAN_STAT_INCREASE_QUEST: () => hitmonchanStatIncreaseModifier,
    HITMON_DUO_WIN_QUEST: () => hitmonDuoWinModifier,
    KANGASKHAN_GHOST_MOVE_QUEST: () => kangaskhanGhostMoveModifier,
    SCYTHER_TRIO_WIN_QUEST: () => scytherTrioWinModifier,
    GRENINJA_TRIO_WIN_QUEST: () => greninjaTrioWinModifier,
    SIMISAGE_TRIO_WIN_QUEST: () => simisageTrioWinModifier,
    ELEMENTAL_MONKEY_WIN_QUEST: () => elementalMonkeyWinModifier,
    ELECTIVIREMAGMORTAR_WIN_QUEST: () => electiviremagmortarWinModifier,
    GYARADOS_GROUND_SWITCH_QUEST: () => gyaradosGroundSwitchModifier,
    LAPRAS_FIRE_MOVE_QUEST: () => laprasFireMoveModifier,
    PORYGON_Z_ANALYTIC_USE_QUEST: () => porygonZAnalyticUseModifier,
    DRAGONITE_LANCE_DEFEAT_QUEST: () => dragoniteLanceDefeatModifier,
    SUDOWOODO_WOOD_HAMMER_QUEST: () => sudowoodoWoodHammerModifier,
    AMBIPOM_GIGA_IMPACT_QUEST: () => ambipomGigaImpactModifier,
    MILTANK_STEEL_MOVE_KNOCKOUT_QUEST: () => miltankSteelMoveKnockoutModifier,
    SLAKING_RIVAL_DEFEAT_QUEST: () => slakingRivalDefeatModifier,
    SOLROCK_LUNATONE_WIN_QUEST: () => solrockLunatoneWinModifier,
    REGIGIGAS_REGI_DEFEAT_QUEST: () => regigigasRegiDefeatModifier,
    PIKACHU_RED_BLUE_WIN_QUEST: () => pikachuRedBlueWinModifier,
    SNORLAX_GRASS_KNOCKOUT_QUEST: () => snorlaxGrassKnockoutModifier,
    CLOYSTER_PRESENT_QUEST: () => cloysterPresentModifier,
    NUZLEAF_NOSEPASS_DEFEAT_QUEST: () => nuzleafNosepassDefeatModifier,
    CHANDELURE_REST_QUEST: () => chandelureRestModifier,
    SMEARGLE_DEFEAT_QUEST: () => smeargleDefeatModifier,
    MIMIKYU_CHARIZARD_KNOCKOUT_QUEST: () => mimikyuCharizardKnockoutModifier,
    MIMIKYU_GRENINJA_KNOCKOUT_QUEST: () => mimikyuGreninjaKnockoutModifier,
    MIMIKYU_RAICHU_KNOCKOUT_QUEST: () => mimikyuRaichuKnockoutModifier,
    MIMIKYU_MEWTWO_KNOCKOUT_QUEST: () => mimikyuMewtwoKnockoutModifier,
    MIMIKYU_REGIROCK_KNOCKOUT_QUEST: () => mimikyuRegirockKnockoutModifier,
    EISCUE_ROCK_KNOCKOUT_QUEST: () => eiscueRockKnockoutModifier,
    ZANGOOSE_SEVIPER_KNOCKOUT_QUEST: () => zangooseSeviperKnockoutModifier,
    SEVIPER_ZANGOOSE_KNOCKOUT_QUEST: () => seviperZangooseKnockoutModifier,
    TRUBBISH_POISON_DEFEAT_QUEST: () => trubbishPoisonDefeatModifier,
    HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST: () => hawluchaRivalChampionDefeatModifier,
    DITTO_DRAGONITE_TRANSFORM_QUEST: () => dittoDragoniteTransformModifier,
    DITTO_CHARIZARD_TRANSFORM_QUEST: () => dittoCharizardTransformModifier,
    DITTO_PIKACHU_TRANSFORM_QUEST: () => dittoPikachuTransformModifier,
    DITTO_MACHAMP_TRANSFORM_QUEST: () => dittoMachampTransformModifier,
    DITTO_MEWTWO_TRANSFORM_QUEST: () => dittoMewtwoTransformModifier,
    FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST: () => feraligatrRockMoveKnockoutModifier,
    WOBBUFFET_RIVAL_DEFEAT_QUEST: () => wobbuffetRivalDefeatModifier,
    MAGIKARP_DEFEAT_QUEST: () => magikarpDefeatModifier,
    KLINKLANG_GEAR_MOVE_QUEST: () => klinklangGearMoveModifier,
    SPINDA_CONFUSION_RECOVERY_QUEST: () => spindaConfusionRecoveryModifier,
    NINETALES_STORED_POWER_KNOCKOUT_QUEST: () => ninetalesStoredPowerKnockoutModifier,
    MUK_RED_DEFEAT_QUEST: () => mukRedDefeatModifier,
    SHUCKLE_DEFEAT_QUEST: () => shuckleDefeatModifier,
    TANGELA_RIVAL_DEFEAT_QUEST: () => tangelaRivalDefeatModifier,
    LICKITUNG_GIGGLE_KNOCKOUT_QUEST: () => lickitungGiggleKnockoutModifier,
    MAGICAL_PIKACHU_QUEST: () => pikachuMagicalModifier,
    CHARMANDER_UNDERTALE_QUEST: () => charmanderUndertaleModifier,
    MEOWTH_JESTER_QUEST: () => meowthTrioWinModifier,
    SHIFTRY_TENGU_QUEST: () => shiftryTenguModifier,
    CLAYDOL_POISON_QUEST: () => claydolPoisonMoveUseModifier,
    STARTER_CATCH_QUEST: () => starterCatchQuestModifier,
    NUZLIGHT_UNLOCK_QUEST: () => nuzlightUnlockQuestModifier,
    NUZLOCKE_UNLOCK_QUEST: () => nuzlockeUnlockQuestModifier,
    REVAROOM_EXTRA_QUEST: () => revaroomExtraModifier,
    NORMAL_EFFECTIVENESS_QUEST: () => normalEffectivenessModifier,
    MAGIKARP_NEW_MOVES_QUEST: () => magikarpNewMovesModifier,
    DITTO_NEW_MOVES_QUEST: () => dittoNewMovesModifier,
    WOBBUFFET_NEW_MOVES_QUEST: () => wobbuffetNewMovesModifier,
    SMEARGLE_NEW_MOVES_QUEST: () => smeargleNewMovesModifier,
    UNOWN_NEW_MOVES_QUEST: () => unownNewMovesModifier,
    TYROGUE_NEW_MOVES_QUEST: () => tyrogueNewMovesModifier,
    METAPOD_NEW_MOVES_QUEST: () => metapodNewMovesModifier,

    TAUROS_DARK_WAVE_QUEST: () => taurosDarkWaveModifier,
    DITTO_SPECIAL_WIN_QUEST: () => dittoSpecialWinModifier,
    MAROWAK_ZOMBIE_KNOCKOUT_QUEST: () => marowakZombieKnockoutModifier,
    GRENINJA_YOKAI_WAVE_QUEST: () => greninjaYokaiWaveModifier,
    RAYQUAZA_SPECIAL_WIN_QUEST: () => rayquazaSpecialWinModifier,
    LICKITUNG_HYPER_WAVE_QUEST: () => lickitungHyperWaveModifier,
    CHARMANDER_NIGHTMARE_WIN_QUEST: () => charmanderNightmareWinModifier,
    GASTLY_NIGHTMARE_WAVE_QUEST: () => gastlyNightmareWaveModifier,
    PIKACHU_PLUS_ULTRA_QUEST: () => pikachuPlusUltraModifier,
    CHARIZARD_HELLFLAME_QUEST: () => charizardHellflameModifier,
    EEVEE_NIGHTMARE_QUEST: () => eeveeNightmareModifier,
    SNORLAX_NIGHTMARE_QUEST: () => snorlaxNightmareModifier,
    MEWTWO_NIGHTMARE_QUEST: () => mewtwoNightmareModifier,
    TYRANITAR_NIGHTMARE_QUEST: () => tyranitarNightmareModifier,
    OCTILLERY_NIGHTMARE_QUEST: () => octilleryNightmareModifier,
    REGIROCK_NIGHTMARE_QUEST: () => regirockNightmareModifier,
    EEVEE_GHOST_QUEST: () => eeveeGhostModifier,
    EEVEE_STEEL_QUEST: () => eeveeSteelModifier,
    EEVEE_GROUND_QUEST: () => eeveeGroundModifier,
    SQUIRTLE_TORMENT_QUEST: () => squirtleTormentModifier,
    BULBASAUR_TERROR_QUEST: () => bulbasaurTerrorModifier,
    HYPNO_NIGHTMARE_QUEST: () => hypnoNightmareModifier,
    MAMOSWINE_NIGHTMARE_QUEST: () => mamoswineNightmareModifier,
    MORPEKO_NIGHTMARE_QUEST: () => morpekoNightmareModifier,
    CLEFABLE_GENGAR_QUEST: () => clefableGengarModifier,
    GOLEM_FIRE_QUEST: () => golemFireModifier,
    DEINO_NIGHTMARE_QUEST: () => deinoNightmareModifier,
    GOLURK_DREAD_QUEST: () => golurkDreadModifier,
    DUSCLOPS_NIGHTMARE_QUEST: () => dusclopsNightmareModifier,
    HARIYAMA_NIGHTMARE_QUEST: () => hariyamaNightmareModifier,
    SHARPEDO_NIGHTMARE_QUEST: () => sharpedoNightmareModifier,
    FARIGIRAF_NIGHTMARE_QUEST: () => farigirafNightmareModifier,
    KINGDRA_NIGHTMARE_QUEST: () => kingdraNightmareModifier,
    EXCADRILL_NIGHTMARE_QUEST: () => excadrillNightmareModifier,
    PIKACHU_ROBO_NIGHTMARE_QUEST: () => pikachuRoboNightmareModifier,
    LUCARIO_NIGHTMARE_QUEST: () => lucarioNightmareModifier,
    SUNFLORA_NIGHTMARE_QUEST: () => sunfloraNightmareModifier,
    DODRIO_NIGHTMARE_QUEST: () => dodrioNightmareModifier,
    LANTURN_NIGHTMARE_QUEST: () => lanturnNightmareModifier,

};

interface ModifierPool {
    [tier: string]: WeightedModifierType[]
}

/**
 * Used to check if the player has max of a given ball type in Classic
 * @param party The player's party, just used to access the scene
 * @param ballType The {@linkcode PokeballType} being checked
 * @returns boolean: true if the player has the maximum of a given ball type
 */
function hasMaximumBalls(party: Pokemon[], ballType: PokeballType): boolean {
    return (party[0].scene.gameMode.isClassic && party[0].scene.pokeballCounts[ballType] >= MAX_PER_TYPE_POKEBALLS);
}

function shouldHideHealingModifier(party: Pokemon[]): boolean {
    // If it's a boss wave (wave % 10 === 0), check if all enemies are fainted
    if (party[0].scene.currentBattle.waveIndex % 10 === 0) {
        const enemyParty = party[0].scene.getEnemyParty();
        const allEnemiesFainted = enemyParty.every(p => p.isFainted());
        return allEnemiesFainted;
    }
    return false;
}

const modifierPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.ANYTM_COMMON, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ANYTM_COMMON, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.ANYTM_GREAT, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ANYTM_GREAT, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 3),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ULTRA_BALL, 2),
        new WeightedModifierType(modifierTypes.TM_GREAT, 6),
        new WeightedModifierType(modifierTypes.TM_COMMON, 2),
        new WeightedModifierType(modifierTypes.POTION, (party: Pokemon[]) => {
             if (shouldHideHealingModifier(party)) return 0;
          const thresholdPartyMemberCount = Math.min(party.filter(p => (p.getInverseHp() >= 20 || p.getHpRatio() <= 0.8) && !p.isFainted()).length, 3);
          return thresholdPartyMemberCount * 3;
        }, 9),
        new WeightedModifierType(modifierTypes.SUPER_POTION, (party: Pokemon[]) => {
             if (shouldHideHealingModifier(party)) return 0;
          const thresholdPartyMemberCount = Math.min(party.filter(p => (p.getInverseHp() >= 40 || p.getHpRatio() <= 0.6) && !p.isFainted()).length, 3);
          return thresholdPartyMemberCount;
        }, 3),
      
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.ANYTM_GREAT, glitchPieceWeightAdjustment, 16),
        new WeightedModifierType(modifierTypes.ANYTM_GREAT, glitchPieceWeightAdjustment, 8),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, glitchPieceWeightAdjustment, 10),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, glitchPieceWeightAdjustment, 2),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.ABILITY_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0, 3),
        new WeightedModifierType(modifierTypes.TYPE_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0, 8),
        new WeightedModifierType(modifierTypes.ADD_POKEMON, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.ADD_POKEMON, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 1), 
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 1), 
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 1), 
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 1), 
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 10),
        new WeightedModifierType(modifierTypes.TEMP_STAT_BOOSTER, 1),
        new WeightedModifierType(modifierTypes.TM_COMMON, 4),
        new WeightedModifierType(modifierTypes.SOOTHE_BELL, 1),
        new WeightedModifierType(modifierTypes.FULL_HEAL, (party: Pokemon[]) => {
             if (shouldHideHealingModifier(party)) return 0;
            const statusEffectPartyMemberCount = Math.min(party.filter(p => p.hp && !!p.status && !p.getHeldItems().some(i => {
                if (i instanceof Modifiers.TurnStatusEffectModifier) {
                    return (i as Modifiers.TurnStatusEffectModifier).getStatusEffect() === p.status.effect;
                }
                return false;
            })).length, 3);
            return statusEffectPartyMemberCount * 6;
        }, 18),
        new WeightedModifierType(modifierTypes.REVIVE, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            const faintedPartyMemberCount = Math.min(party.filter(p => p.isFainted()).length, 3);
            return faintedPartyMemberCount * 9;
        }, 27),
        new WeightedModifierType(modifierTypes.MAX_REVIVE, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            const faintedPartyMemberCount = Math.min(party.filter(p => p.isFainted()).length, 3);
            return faintedPartyMemberCount * 3;
        }, 9),
        new WeightedModifierType(modifierTypes.SACRED_ASH, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            return party.filter(p => p.isFainted()).length >= Math.ceil(party.length / 2) ? 1 : 0;
        }, 1),
        new WeightedModifierType(modifierTypes.HYPER_POTION, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            const thresholdPartyMemberCount = Math.min(party.filter(p => (p.getInverseHp() >= 100 || p.getHpRatio() <= 0.625) && !p.isFainted()).length, 3);
            return thresholdPartyMemberCount * 3;
        }, 9),
        new WeightedModifierType(modifierTypes.MAX_POTION, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            const thresholdPartyMemberCount = Math.min(party.filter(p => (p.getInverseHp() >= 150 || p.getHpRatio() <= 0.5) && !p.isFainted()).length, 3);
            return thresholdPartyMemberCount;
        }, 3),
        new WeightedModifierType(modifierTypes.FULL_RESTORE, (party: Pokemon[]) => {
            if (shouldHideHealingModifier(party)) return 0;
            const statusEffectPartyMemberCount = Math.min(party.filter(p => p.hp && !!p.status && !p.getHeldItems().some(i => {
                if (i instanceof Modifiers.TurnStatusEffectModifier) {
                    return (i as Modifiers.TurnStatusEffectModifier).getStatusEffect() === p.status?.effect;
                }
                return false;
            })).length, 3);
            const thresholdPartyMemberCount = Math.floor((Math.min(party.filter(p => (p.getInverseHp() >= 150 || p.getHpRatio() <= 0.5) && !p.isFainted()).length, 3) + statusEffectPartyMemberCount) / 2);
            return thresholdPartyMemberCount;
        }, 3),
        
        new WeightedModifierType(modifierTypes.DIRE_HIT, 2),
        new WeightedModifierType(modifierTypes.BIG_NUGGET, skipInLastClassicWaveOrDefault(5)),
        new WeightedModifierType(modifierTypes.EVOLUTION_ITEM, (party: Pokemon[]) => {
            return Math.min(Math.ceil(party[0].scene.currentBattle.waveIndex / 15), 8);
        }, 8),
        new WeightedModifierType(modifierTypes.TM_GREAT, 6),
        new WeightedModifierType(modifierTypes.MEMORY_MUSHROOM, (party: Pokemon[]) => {
            if (!party.find(p => p.getLearnableLevelMoves().length)) {
                return 0;
            }
            const highestPartyLevel = party.map(p => p.level).reduce((highestLevel: integer, level: integer) => Math.max(highestLevel, level), 1);
            return Math.min(Math.ceil(highestPartyLevel / 20), 4);
        }, 4),
        new WeightedModifierType(modifierTypes.TERA_SHARD, 1),
        new WeightedModifierType(modifierTypes.VOUCHER, (party: Pokemon[], rerollCount: integer) => !party[0].scene.gameMode.isDaily ? Math.max(1 - rerollCount, 0) : 0, 1),
        new WeightedModifierType(modifierTypes.SELECTABLE_PMONEY_1, glitchPiecePermaMoneyWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.MOVE_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) && glitchUnlockWeightAdjustment(party) : 0, 3),

    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.ANYTM_GREAT, glitchPieceWeightAdjustment, 8),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 8),
        new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, glitchPieceWeightAdjustment, 1),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 14),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 14),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, glitchPieceWeightAdjustment, 6),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, glitchPieceWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.ABILITY_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0, 2),
        new WeightedModifierType(modifierTypes.TYPE_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0),
        new WeightedModifierType(modifierTypes.PASSIVE_ABILITY_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0, 3),
        new WeightedModifierType(modifierTypes.MOVE_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) && glitchUnlockWeightAdjustment(party) : 0, 6),
        new WeightedModifierType(modifierTypes.ADD_POKEMON, glitchPiecePermaMidWeightAdjustment, 14),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 4), 
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 4), 
        new WeightedModifierType(modifierTypes.BIG_NUGGET, 12),
        new WeightedModifierType(modifierTypes.PP_MAX, 2),
        new WeightedModifierType(modifierTypes.MINT, 4),
        new WeightedModifierType(modifierTypes.RARE_EVOLUTION_ITEM, (party: Pokemon[]) => Math.min(Math.ceil(party[0].scene.currentBattle.waveIndex / 15) * 4, 32), 8),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, (party: Pokemon[]) => Math.min(Math.ceil(party[0].scene.currentBattle.waveIndex / 15) * 4, 6), 8),
        new WeightedModifierType(modifierTypes.AMULET_COIN, skipInLastClassicWaveOrDefault(3)),
        new WeightedModifierType(modifierTypes.EVIOLITE, (party: Pokemon[]) => {
            if (!party[0].scene.gameMode.isFreshStartChallenge() && party[0].scene.gameData.unlocks[Unlockables.EVIOLITE]) {
                return party.some(p => ((p.getSpeciesForm(true).speciesId in pokemonEvolutions) || (p.isFusion() && (p.getFusionSpeciesForm(true).speciesId in pokemonEvolutions))) && !p.getHeldItems().some(i => i instanceof Modifiers.EvolutionStatBoosterModifier)) ? 10 : 0;
            }
            return 0;
        }),
        new WeightedModifierType(modifierTypes.SPECIES_STAT_BOOSTER, 12),
        new WeightedModifierType(modifierTypes.LEEK, (party: Pokemon[]) => {
            const checkedSpecies = [Species.FARFETCHD, Species.GALAR_FARFETCHD, Species.SIRFETCHD];
            return party.some(p => !p.getHeldItems().some(i => i instanceof Modifiers.SpeciesCritBoosterModifier) && (checkedSpecies.includes(p.getSpeciesForm(true).speciesId) || (p.isFusion() && checkedSpecies.includes(p.getFusionSpeciesForm(true).speciesId)))) ? 12 : 0;
        }, 12),
        new WeightedModifierType(modifierTypes.TOXIC_ORB, (party: Pokemon[]) => {
            const checkedAbilities = [Abilities.QUICK_FEET, Abilities.GUTS, Abilities.MARVEL_SCALE, Abilities.TOXIC_BOOST, Abilities.POISON_HEAL, Abilities.MAGIC_GUARD];
            const checkedMoves = [Moves.FACADE, Moves.TRICK, Moves.FLING, Moves.SWITCHEROO, Moves.PSYCHO_SHIFT];
            return party.some(p => !p.getHeldItems().some(i => i instanceof Modifiers.TurnStatusEffectModifier) && (checkedAbilities.some(a => p.hasAbility(a, false, true)) || p.getMoveset(true).some(m => m && checkedMoves.includes(m.moveId)))) ? 10 : 0;
        }, 10),
        new WeightedModifierType(modifierTypes.FLAME_ORB, (party: Pokemon[]) => {
            const checkedAbilities = [Abilities.QUICK_FEET, Abilities.GUTS, Abilities.MARVEL_SCALE, Abilities.FLARE_BOOST, Abilities.MAGIC_GUARD];
            const checkedMoves = [Moves.FACADE, Moves.TRICK, Moves.FLING, Moves.SWITCHEROO, Moves.PSYCHO_SHIFT];
            return party.some(p => !p.getHeldItems().some(i => i instanceof Modifiers.TurnStatusEffectModifier) && (checkedAbilities.some(a => p.hasAbility(a, false, true)) || p.getMoveset(true).some(m => m && checkedMoves.includes(m.moveId)))) ? 10 : 0;
        }, 10),
        new WeightedModifierType(modifierTypes.WHITE_HERB, (party: Pokemon[]) => {
            const checkedAbilities = [Abilities.WEAK_ARMOR, Abilities.CONTRARY, Abilities.MOODY, Abilities.ANGER_SHELL, Abilities.COMPETITIVE, Abilities.DEFIANT];
            const weightMultiplier = party.filter(
                p => !p.getHeldItems().some(i => i instanceof Modifiers.PokemonResetNegativeStatStageModifier && i.stackCount >= i.getMaxHeldItemCount(p)) &&
                    (checkedAbilities.some(a => p.hasAbility(a, false, true)) || p.getMoveset(true).some(m => m && selfStatLowerMoves.includes(m.moveId)))).length;
            return 0 * (weightMultiplier ? 2 : 1) + (weightMultiplier ? weightMultiplier * 0 : 0);
        }, 10),
        new WeightedModifierType(modifierTypes.REVIVER_SEED, 4),
        new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 8),
        new WeightedModifierType(modifierTypes.TM_ULTRA, 8),
        new WeightedModifierType(modifierTypes.GOLDEN_PUNCH, skipInLastClassicWaveOrDefault(4)),
        new WeightedModifierType(modifierTypes.IV_SCANNER, skipInLastClassicWaveOrDefault(1)),
        new WeightedModifierType(modifierTypes.EXP_SHARE, (party: Pokemon[]) => {
            if (party[0].scene.gameMode.isChaosMode) {
                return 14;
            }
            return skipInLastClassicWaveOrDefault(6)(party);
        }),
        new WeightedModifierType(modifierTypes.EXP_BALANCE, skipInLastClassicWaveOrDefault(4)),
        new WeightedModifierType(modifierTypes.TERA_ORB, (party: Pokemon[]) => Math.min(Math.max(Math.floor(party[0].scene.currentBattle.waveIndex / 50) * 2, 1), 4), 2),
        new WeightedModifierType(modifierTypes.QUICK_CLAW, 4),
        new WeightedModifierType(modifierTypes.VOUCHER, (party: Pokemon[], rerollCount: integer) => !party[0].scene.gameMode.isDaily ? Math.max(3 - rerollCount, 0) : 0, 2),
        new WeightedModifierType(modifierTypes.WIDE_LENS, 4),
        new WeightedModifierType(modifierTypes.SELECTABLE_PMONEY_2, glitchPiecePermaMoneyWeightAdjustment, 4),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.SELECTABLE_PMONEY_3, glitchPiecePermaMoneyWeightAdjustment, 1),
        new WeightedModifierType(modifierTypes.ROGUE_BALL, (party: Pokemon[]) => (hasMaximumBalls(party, PokeballType.ROGUE_BALL)) ? 0 : 8, 8),
        new WeightedModifierType(modifierTypes.RELIC_GOLD, skipInLastClassicWaveOrDefault(4)),
        new WeightedModifierType(modifierTypes.LEFTOVERS, 3),
        new WeightedModifierType(modifierTypes.SHELL_BELL, 3),
        new WeightedModifierType(modifierTypes.DNA_SPLICERS, (party: Pokemon[]) => !party[0].scene.gameMode.isSplicedOnly && party.filter(p => !p.fusionSpecies).length > 1 ? 1 : 0, 1),
        new WeightedModifierType(modifierTypes.BERRY_POUCH, 2),
        new WeightedModifierType(modifierTypes.GRIP_CLAW, 3),
        new WeightedModifierType(modifierTypes.SCOPE_LENS, 3),
        new WeightedModifierType(modifierTypes.BATON, 2),
        new WeightedModifierType(modifierTypes.ANYTM_MASTER, (party: Pokemon[]) => (glitchPieceWeightAdjustment(party)) ? 1 : 0, 1),
        new WeightedModifierType(modifierTypes.FOCUS_BAND, 3),
        new WeightedModifierType(modifierTypes.KINGS_ROCK, 3),
        new WeightedModifierType(modifierTypes.ANYTM_ULTRA, glitchPieceWeightAdjustment, 7),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 8),
        new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, glitchPieceWeightAdjustment, 12),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.ADD_POKEMON, glitchPiecePermaMidWeightAdjustment, 8),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 3), 
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, glitchUnlockWeightAdjustment, 3), 
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 3),
        new WeightedModifierType(modifierTypes.MAP, (party: Pokemon[]) => {
            const waveIndex = party[0].scene.currentBattle.waveIndex;
            if (party[0].scene.gameMode.isNightmare) {
                return waveIndex % 100 < 90 ? 1 : 0;
            }
            return waveIndex < 90 ? 1 : 0;
        }, 1),
        
        new WeightedModifierType(modifierTypes.VOUCHER_PLUS, (party: Pokemon[], rerollCount: integer) => !party[0].scene.gameMode.isDaily ? Math.max(5 - rerollCount * 2, 0) : 0, 2),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.SOUL_DEW, 1),
        new WeightedModifierType(modifierTypes.STAT_SACRIFICE, (party: Pokemon[]) => party.length > 1 ? glitchSacrificeWeightAdjustment(party) : 0, 1),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 1),
        new WeightedModifierType(modifierTypes.ANY_SMITTY_PASSIVE_ABILITY, glitchPieceWeightAdjustment, 1),
        new WeightedModifierType(modifierTypes.ANY_SMITTY_ABILITY, glitchPieceWeightAdjustment, 1),
        new WeightedModifierType(modifierTypes.CANDY_JAR, skipInLastClassicWaveOrDefault(3)),
        new WeightedModifierType(modifierTypes.SELECTABLE_PMONEY_4OR5, glitchPiecePermaMoneyWeightAdjustment, 8),
        new WeightedModifierType(modifierTypes.MEGA_BRACELET, (party: Pokemon[]) => Math.min(Math.ceil(party[0].scene.currentBattle.waveIndex / 15), 4) * 10, 1),
        new WeightedModifierType(modifierTypes.DYNAMAX_BAND, (party: Pokemon[]) => Math.min(Math.ceil(party[0].scene.currentBattle.waveIndex / 15), 4) * 10, 1),
        new WeightedModifierType(modifierTypes.MASTER_BALL, 1),
        new WeightedModifierType(modifierTypes.SHINY_CHARM, 8),
        new WeightedModifierType(modifierTypes.HEALING_CHARM, 12),
        new WeightedModifierType(modifierTypes.MULTI_LENS, 4),
        new WeightedModifierType(modifierTypes.VOUCHER_PREMIUM, (party: Pokemon[], rerollCount: integer) => !party[0].scene.gameMode.isDaily && !party[0].scene.gameMode.isEndless && !party[0].scene.gameMode.isSplicedOnly ? Math.max(5 - rerollCount * 2, 0) : 0, 1),
        new WeightedModifierType(modifierTypes.MINI_BLACK_HOLE, (party: Pokemon[]) => (!party[0].scene.gameMode.isFreshStartChallenge() && party[0].scene.gameData.unlocks[Unlockables.MINI_BLACK_HOLE]) ? 8 : 0, 8),
        new WeightedModifierType(modifierTypes.ANYTM_LUXURY, (party: Pokemon[]) => (glitchPieceWeightAdjustment(party) && party[0].scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) ? 14: 0, 14),
        new WeightedModifierType(modifierTypes.ANYTM_MASTER, (party: Pokemon[]) => (glitchPieceWeightAdjustment(party)) ? 18 : 0, 14),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const wildModifierPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.BERRY, 1)
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 1),
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 10),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 1, 1),
        new WeightedModifierType(modifierTypes.WHITE_HERB, 0),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 1, 1),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.LUCKY_EGG, 4),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 2, 2),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 2, 2),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 1, 1),
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 1, 1),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, 2),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.GOLDEN_EGG, 1),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 3, 3),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 1,  1),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, 2),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 2, 2),
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, (party: Pokemon[]) => party[0].scene.currentBattle.waveIndex == 500 ? 0 : 2, 2),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const trainerModifierPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.BERRY, 8),
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.BERRY, 8),
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.WHITE_HERB, 0),
        new WeightedModifierType(modifierTypes.TYPE_SWITCHER, 1),
        new WeightedModifierType(modifierTypes.STAT_SWITCHER, 1),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, 1),
        new WeightedModifierType(modifierTypes.WIDE_LENS, 1),
        new WeightedModifierType(modifierTypes.GRIP_CLAW, 1),
        new WeightedModifierType(modifierTypes.QUICK_CLAW, 1),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 1),
        new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 1),
        new WeightedModifierType(modifierTypes.FOCUS_BAND, 1),
        new WeightedModifierType(modifierTypes.LUCKY_EGG, 1),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, 1),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, 2),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, 1),
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, 1),
        new WeightedModifierType(modifierTypes.KINGS_ROCK, 1),
        new WeightedModifierType(modifierTypes.LEFTOVERS, 1),
        new WeightedModifierType(modifierTypes.SHELL_BELL, 1),
        new WeightedModifierType(modifierTypes.SCOPE_LENS, 1),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.KINGS_ROCK, 1),
        new WeightedModifierType(modifierTypes.LEFTOVERS, 1),
        new WeightedModifierType(modifierTypes.SHELL_BELL, 1),
        new WeightedModifierType(modifierTypes.SCOPE_LENS, 1),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, 3),
        new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, 1),
        new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, 1),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const enemyBuffModifierPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 9),
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 9),
        new WeightedModifierType(modifierTypes.ENEMY_ATTACK_POISON_CHANCE, 3),
        new WeightedModifierType(modifierTypes.ENEMY_ATTACK_PARALYZE_CHANCE, 3),
        new WeightedModifierType(modifierTypes.ENEMY_ATTACK_BURN_CHANCE, 3),
        new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 9),
        new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 4),
        new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 1)
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 5),
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 5),
        new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 5),
        new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 5),
        new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 1)
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 10),
        new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 10),
        new WeightedModifierType(modifierTypes.ENEMY_HEAL, 10),
        new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 10),
        new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 10),
        new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 5)
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [].map((m: WeightedModifierType) => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [].map((m: WeightedModifierType) => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const dailyStarterModifierPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 1),
        new WeightedModifierType(modifierTypes.BERRY, 3),
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 5),
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.REVIVER_SEED, 4),
        new WeightedModifierType(modifierTypes.SOOTHE_BELL, 1),
        new WeightedModifierType(modifierTypes.SOUL_DEW, 1),
        new WeightedModifierType(modifierTypes.GOLDEN_PUNCH, 1),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.GRIP_CLAW, 5),
        new WeightedModifierType(modifierTypes.BATON, 2),
        new WeightedModifierType(modifierTypes.FOCUS_BAND, 5),
        new WeightedModifierType(modifierTypes.QUICK_CLAW, 3),
        new WeightedModifierType(modifierTypes.KINGS_ROCK, 3),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.LEFTOVERS, 1),
        new WeightedModifierType(modifierTypes.SHELL_BELL, 1),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const debugPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.BERRY, 6),
        new WeightedModifierType(modifierTypes.BERRY, 6),
        new WeightedModifierType(modifierTypes.BERRY, 6),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 12),

    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.BERRY, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 12),
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, glitchPiecePermaMoneyWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.RARER_CANDY, glitchPiecePermaMoneyWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.RARER_CANDY, glitchPiecePermaMoneyWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, glitchPiecePermaMoneyWeightAdjustment, 4),
        new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, 6),
        new WeightedModifierType(modifierTypes.ANY_ABILITY, 6),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.GLITCH_PIECE, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 12),
        new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, 12),
        new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, 12),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 7),
        new WeightedModifierType(modifierTypes.POKEBALL, 6),
        new WeightedModifierType(modifierTypes.POKEBALL, 6),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 8),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 6),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 5),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 5),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 18),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 8),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 6),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 5),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 5),
        new WeightedModifierType(modifierTypes.FORM_CHANGE_ITEM, 18),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

const debugDraftPool: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 7),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 8),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 18),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 12),

    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 8),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 6),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 18),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 7),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 12),

    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 7),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 8),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 6),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 18),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 12),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 7),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 8),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 6),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 18),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 12),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 7),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 8),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 6),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 5),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 18),
        new WeightedModifierType(modifierTypes.DRAFT_POKEMON, 12),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};


const debugPool2: ModifierPool = {
    [ModifierTier.COMMON]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, 2),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 18),
    ].map(m => {
        m.setTier(ModifierTier.COMMON);
        return m;
    }),
    [ModifierTier.GREAT]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, 6),
        new WeightedModifierType(modifierTypes.RARER_CANDY, (party: Pokemon[]) => {
            const statusEffectPartyMemberCount = Math.min(party.filter(p => p.hp && !!p.status).length, 3);
            return statusEffectPartyMemberCount * 6;
        }, 18),
    ].map(m => {
        m.setTier(ModifierTier.GREAT);
        return m;
    }),
    [ModifierTier.ULTRA]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, 2),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 4),
    ].map(m => {
        m.setTier(ModifierTier.ULTRA);
        return m;
    }),
    [ModifierTier.ROGUE]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, 24),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 2),
    ].map(m => {
        m.setTier(ModifierTier.ROGUE);
        return m;
    }),
    [ModifierTier.MASTER]: [
        new WeightedModifierType(modifierTypes.RARER_CANDY, 24),
        new WeightedModifierType(modifierTypes.RARER_CANDY, 14),
    ].map(m => {
        m.setTier(ModifierTier.MASTER);
        return m;
    })
};

export function getModifierType(modifierTypeFunc: ModifierTypeFunc): ModifierType {
    let modifierType = modifierTypeFunc();
    if (modifierType instanceof ModifierTypeGenerator) {
        modifierType = modifierType.generateType([]);  // Pass empty party array
    }
    if (!modifierType.id) {
        modifierType.id = Object.keys(modifierTypes).find(k => modifierTypes[k] === modifierTypeFunc)!; // TODO: is this bang correct?
    }
    return modifierType;
}

let modifierPoolThresholds = {};
let ignoredPoolIndexes = {};

let dailyStarterModifierPoolThresholds = {};
let ignoredDailyStarterPoolIndexes = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

let enemyModifierPoolThresholds = {};
let enemyIgnoredPoolIndexes = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

let enemyBuffModifierPoolThresholds = {};
let enemyBuffIgnoredPoolIndexes = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

let draftModifierPoolThresholds = {};
let draftIgnoredPoolIndexes = {};

export function getModifierPoolForType(poolType: ModifierPoolType, isTestMod: boolean = false): ModifierPool {
    let pool: ModifierPool;
    switch (poolType) {
        case ModifierPoolType.PLAYER:
            pool = modifierPool;
            break;
        case ModifierPoolType.WILD:
            pool = wildModifierPool;
            break;
        case ModifierPoolType.TRAINER:
            pool = trainerModifierPool;
            break;
        case ModifierPoolType.ENEMY_BUFF:
            pool = enemyBuffModifierPool;
            break;
        case ModifierPoolType.DAILY_STARTER:
            pool = dailyStarterModifierPool;
            break;
        case ModifierPoolType.DRAFT:
            pool = debugDraftPool;
            break;
    }

    // return ModifierPoolType.DRAFT != poolType ? debugPool : pool;
    return isTestMod ? debugPool : pool;
}

const tierWeights = [768 / 1024, 195 / 1024, 48 / 1024, 12 / 1024, 1 / 1024];

export function regenerateModifierPoolThresholds(party: Pokemon[], poolType: ModifierPoolType, rerollCount: integer = 0) {
    const pool = getModifierPoolForType(poolType, party[0]?.scene.gameMode.isTestMod);

    const ignoredIndexes = {};
    const modifierTableData = {};
    const thresholds = Object.fromEntries(new Map(Object.keys(pool).map(t => {
        ignoredIndexes[t] = [];
        const thresholds = new Map();
        const tierModifierIds: string[] = [];
        let tierMaxWeight = 0;
        let i = 0;
        pool[t].reduce((total: integer, modifierType: WeightedModifierType) => {
            const weightedModifierType = modifierType as WeightedModifierType;
            const existingModifiers = party[0].scene.findModifiers(m => m.type.id === weightedModifierType.modifierType.id, poolType === ModifierPoolType.PLAYER);
            const itemModifierType = weightedModifierType.modifierType instanceof ModifierTypeGenerator
                ? weightedModifierType.modifierType.generateType(party)
                : weightedModifierType.modifierType;
            const weight = !existingModifiers.length
            || itemModifierType instanceof PokemonHeldItemModifierType
            || itemModifierType instanceof FormChangeItemModifierType
            || existingModifiers.find(m => m.stackCount < m.getMaxStackCount(party[0].scene, true))
                ? weightedModifierType.weight instanceof Function
                    ? (weightedModifierType.weight as Function)(party, rerollCount)
                    : weightedModifierType.weight as integer
                : 0;
            if (weightedModifierType.maxWeight) {
                const modifierId = weightedModifierType.modifierType.id;
                tierModifierIds.push(modifierId);
                const outputWeight = useMaxWeightForOutput ? weightedModifierType.maxWeight : weight;
                modifierTableData[modifierId] = {
                    weight: outputWeight,
                    tier: parseInt(t),
                    tierPercent: 0,
                    totalPercent: 0
                };
                tierMaxWeight += outputWeight;
            }
            if (weight) {
                total += weight;
            } else {
                ignoredIndexes[t].push(i++);
                return total;
            }
            thresholds.set(total, i++);
            return total;
        }, 0);
        for (const id of tierModifierIds) {
            modifierTableData[id].tierPercent = Math.floor((modifierTableData[id].weight / tierMaxWeight) * 10000) / 100;
        }
        return [t, Object.fromEntries(thresholds)];
    })));
    for (const id of Object.keys(modifierTableData)) {
        modifierTableData[id].totalPercent = Math.floor(modifierTableData[id].tierPercent * tierWeights[modifierTableData[id].tier] * 100) / 100;
        modifierTableData[id].tier = ModifierTier[modifierTableData[id].tier];
    }
    switch (poolType) {
        case ModifierPoolType.PLAYER:
            modifierPoolThresholds = thresholds;
            ignoredPoolIndexes = ignoredIndexes;
            break;
        case ModifierPoolType.WILD:
        case ModifierPoolType.TRAINER:
            enemyModifierPoolThresholds = thresholds;
            enemyIgnoredPoolIndexes = ignoredIndexes;
            break;
        case ModifierPoolType.ENEMY_BUFF:
            enemyBuffModifierPoolThresholds = thresholds;
            enemyBuffIgnoredPoolIndexes = ignoredIndexes;
            break;
        case ModifierPoolType.DAILY_STARTER:
            dailyStarterModifierPoolThresholds = thresholds;
            ignoredDailyStarterPoolIndexes = ignoredIndexes;
            break;
        
        case ModifierPoolType.DRAFT:
            draftModifierPoolThresholds = thresholds;
            draftIgnoredPoolIndexes = ignoredIndexes;
            break;
    }
}

export function getModifierTypeFuncById(id: string): ModifierTypeFunc {
    return modifierTypes[id];
}


export function getPlayerModifierTypeOptions(count: integer, party: PlayerPokemon[], modifierTiers?: ModifierTier[], isDraftMode: boolean = false, pathNodeFilter?: PathNodeTypeFilter): ModifierTypeOption[] {
    const options: ModifierTypeOption[] = [];
    const retryCount = Math.min(count * 5, 50);
    
    const modifierPoolType = isDraftMode ? ModifierPoolType.DRAFT : ModifierPoolType.PLAYER
    new Array(count).fill(0).map((_, i) => {
        let candidate = getNewModifierTypeOption(party, modifierPoolType, modifierTiers?.length > i ? modifierTiers[i] : undefined, undefined, 0, pathNodeFilter);
        let r = 0;
        while (candidate && options.length && ++r < retryCount && options.filter(o => o.type.name === candidate.type.name || o.type.group === candidate.type.group).length) {
            candidate = getNewModifierTypeOption(party, modifierPoolType, candidate.type.tier, candidate.upgradeCount, 0, pathNodeFilter);
        }
        if (candidate) {
            options.push(candidate);
        }
    });

    overridePlayerModifierTypeOptions(options, party);

    return options;
}

/**
 * Replaces the {@linkcode ModifierType} of the entries within {@linkcode options} with any
 * {@linkcode ModifierOverride} entries listed in {@linkcode Overrides.ITEM_REWARD_OVERRIDE}
 * up to the smallest amount of entries between {@linkcode options} and the override array.
 * @param options Array of naturally rolled {@linkcode ModifierTypeOption}s
 * @param party Array of the player's current party
 */
export function overridePlayerModifierTypeOptions(options: ModifierTypeOption[], party: PlayerPokemon[]) {
    const minLength = Math.min(options.length, Overrides.ITEM_REWARD_OVERRIDE.length);
    for (let i = 0; i < minLength; i++) {
        const override: ModifierOverride = Overrides.ITEM_REWARD_OVERRIDE[i];
        const modifierFunc = modifierTypes[override.name];
        let modifierType: ModifierType | null = modifierFunc();

        if (modifierType instanceof ModifierTypeGenerator) {
            const pregenArgs = ("type" in override) && (override.type !== null) ? [override.type] : undefined;
            modifierType = modifierType.generateType(party, pregenArgs);
        }

        if (modifierType) {
            options[i].type = modifierType.withIdFromFunc(modifierFunc).withTierFromPool();
        }
    }
}

export function getPlayerShopModifierTypeOptionsForWave(scene: BattleScene, baseCost: integer): ModifierTypeOption[] | null {
    const waveIndex = scene.gameMode.isNightmare ? scene.currentBattle.waveIndex % 100 : scene.currentBattle.waveIndex;
    if (Utils.randSeedInt(100) <= 1) {
        baseCost = 0;
    }

    const createOptionForGenerator = (typeFunc: ModifierTypeFunc, upgradeCount: number, cost: number): ModifierTypeOption => {


        const modifierType = typeFunc();
        if (modifierType instanceof ModifierTypeGenerator) {
            let generatedType: ModifierType | null = null;

            generatedType = modifierType.generateType(scene.getParty());


            if (!generatedType) {
                return null;
            }
            
            const finalType = generatedType ? generatedType : null;
            if (!finalType) {
                return null;
            }
            if (!finalType.id) {
                finalType.withIdFromFunc(typeFunc);
            }
            return new ModifierTypeOption(finalType, upgradeCount, cost);
        }
        return new ModifierTypeOption(modifierType, upgradeCount, cost);
    };


    const hasShop = scene.gameMode.hasShopCheck(scene) && waveIndex % 10 != 0;

    const isStarterQuestCompleted = scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED);
    const isNuzlightQuestCompleted = scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);

    const options = [
        [
            ...(hasShop ? [
                new ModifierTypeOption(modifierTypes.POTION(), 0, baseCost * 0.2),
                new ModifierTypeOption(modifierTypes.REVIVE(), 0, baseCost * 2),
            ] : []),
            new ModifierTypeOption(modifierTypes.ETHER(), 0, baseCost * 0.4),
            ...(isNuzlightQuestCompleted && (Utils.randSeedInt(100) < 50) && (() => {
                const glitchModifier = scene.findModifier(m => m instanceof Modifiers.GlitchPieceModifier) as Modifiers.GlitchPieceModifier;
                return !glitchModifier || glitchModifier.getStackCount() < glitchModifier.getMaxStackCount(scene);
            })() ? [new ModifierTypeOption(modifierTypes.GLITCH_PIECE(), 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 25 ? [createOptionForGenerator(modifierTypes.BERRY, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 25 ? [createOptionForGenerator(modifierTypes.MINT, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 10 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.TYPE_SACRIFICE, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 10 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ADD_POKEMON, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 10 ? [createOptionForGenerator(modifierTypes.TYPE_SWITCHER, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 10 ? [createOptionForGenerator(modifierTypes.ABILITY_SWITCHER, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) <= 2 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.PRIMARY_TYPE_SWITCHER, 0, baseCost * 2)] : []),
            ...(Utils.randSeedInt(100) <= 2 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.SECONDARY_TYPE_SWITCHER, 0, baseCost * 2)] : []),
            ...(Utils.randSeedInt(100) < 5 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.STAT_SACRIFICE, 0, baseCost * 2)] : []),
            ...(Utils.randSeedInt(100) < 5 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ABILITY_SACRIFICE, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) < 5 ? [createOptionForGenerator(modifierTypes.TM_GREAT, 0, baseCost * 2)] : []),
            ...(Utils.randSeedInt(100) < 10 ? [createOptionForGenerator(modifierTypes.TM_COMMON, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) <= 1 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.TM_ULTRA, 0, baseCost * 3)] : []),
            ...(Utils.randSeedInt(100) < 5 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ANYTM_GREAT, 0, baseCost * 2)] : []),
            ...(Utils.randSeedInt(100) < 10 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ANYTM_COMMON, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) <= 1 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ANYTM_ULTRA, 0, baseCost * 3)] : []),
            ...(Utils.randSeedInt(100) <= 2 ? [createOptionForGenerator(modifierTypes.ANY_ABILITY, 0, baseCost * 3)] : []),
            ...(Utils.randSeedInt(100) <= 5 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.COLLECTED_TYPE, 0, baseCost)] : []),
            ...(Utils.randSeedInt(100) <= 1 && isNuzlightQuestCompleted ? [createOptionForGenerator(modifierTypes.ANY_PASSIVE_ABILITY, 0, baseCost * 3)] : []),
            ...(Utils.randSeedInt(100) < 5 ? [new ModifierTypeOption(modifierTypes.BIG_NUGGET(), 0, 0)] : []),
        ],
        [
            ...(hasShop ? [
                new ModifierTypeOption(modifierTypes.SUPER_POTION(), 0, baseCost * 0.45)
            ] : []),
            new ModifierTypeOption(modifierTypes.FULL_HEAL(), 0, baseCost),
            new ModifierTypeOption(modifierTypes.ELIXIR(), 0, baseCost),
            new ModifierTypeOption(modifierTypes.MAX_ETHER(), 0, baseCost),
            ...(Utils.randSeedInt(100) < 15 ? 
                (() => {
                    const option = createOptionForGenerator(modifierTypes.SMITTY_FORM_CHANGE_ITEM, 0, baseCost * 1);
                    return option ? [option] : [];
                })() 
                : []),
            ...(Utils.randSeedInt(100) < 15 ? [new ModifierTypeOption(modifierTypes.SELECTABLE_PMONEY_2(), 0, baseCost * 3)] : []),
            ...(Utils.randSeedInt(500) < 5 ? [new ModifierTypeOption(modifierTypes.RELIC_GOLD(), 0, 0)] : []),
            ...(Utils.randSeedInt(100) <= 1 ? [new ModifierTypeOption(modifierTypes.RARER_CANDY(), 0, baseCost * 6)] : []),
             ...(Utils.randSeedInt(100) <= 10 && isNuzlightQuestCompleted && (!scene.gameMode.hasShopCheck(scene) || scene.gameMode.isNuzlockeActive(scene)) && scene.getParty().length < 6 ? [createOptionForGenerator(modifierTypes.DRAFT_POKEMON, 0, baseCost * 3)] : []),

        ],
        [
            ...(hasShop ? [
                new ModifierTypeOption(modifierTypes.HYPER_POTION(), 0, baseCost * 0.8),
                new ModifierTypeOption(modifierTypes.MAX_REVIVE(), 0, baseCost * 2.75)
            ] : []),
            new ModifierTypeOption(modifierTypes.MAX_ELIXIR(), 0, baseCost * 2.5),
            ...(isNuzlightQuestCompleted ? 
                [new ModifierTypeOption(modifierTypes.SACRIFICE_TOGGLE(), 0, baseCost * 10)] : []),
           ...(isStarterQuestCompleted ? [
                ...(Utils.randSeedInt(250) < 3 ? [new ModifierTypeOption(modifierTypes.DYNAMAX_BAND(), 0, baseCost * 8)] : []),
                ...(Utils.randSeedInt(250) < 3 ? [new ModifierTypeOption(modifierTypes.MEGA_BRACELET(), 0, baseCost * 8)] : []),
                ...(Utils.randSeedInt(250) < 3 ? [new ModifierTypeOption(modifierTypes.TERA_ORB(), 0, baseCost * 8)] : [])
            ] : []),
            ...(Utils.randSeedInt(100) < 10 ? [new ModifierTypeOption(modifierTypes.SELECTABLE_PMONEY_3(), 0, baseCost * 4)] : []),
        ],
        [
            ...(hasShop ? [
                new ModifierTypeOption(modifierTypes.MAX_POTION(), 0, baseCost * 1.5),
                new ModifierTypeOption(modifierTypes.FULL_RESTORE(), 0, baseCost * 2.25),
                new ModifierTypeOption(modifierTypes.SACRED_ASH(), 0, baseCost * 10),
            ] : []),
            ...(Utils.randSeedInt(100) < 5 ? [new ModifierTypeOption(modifierTypes.SELECTABLE_PMONEY_4(), 0, baseCost * 10)] : []),
        ]
    ];
    return options.slice(0, Math.floor(waveIndex / 20) + 1).flat().filter(option => option !== null && option !== undefined);

}


export function getEnemyBuffModifierForWave(tier: ModifierTier, enemyModifiers: Modifiers.PersistentModifier[], scene: BattleScene): Modifiers.EnemyPersistentModifier {
    let tierStackCount: number;
    switch (tier) {
        case ModifierTier.ULTRA:
            tierStackCount = 5;
            break;
        case ModifierTier.GREAT:
            tierStackCount = 3;
            break;
        default:
            tierStackCount = 1;
            break;
    }

    const retryCount = 50;
    let candidate = getNewModifierTypeOption([], ModifierPoolType.ENEMY_BUFF, tier);
    let r = 0;
    let matchingModifier: Modifiers.PersistentModifier | undefined;
    while (++r < retryCount && (matchingModifier = enemyModifiers.find(m => m.type.id === candidate?.type?.id)) && matchingModifier.getMaxStackCount(scene) < matchingModifier.stackCount + (r < 10 ? tierStackCount : 1)) {
        candidate = getNewModifierTypeOption([], ModifierPoolType.ENEMY_BUFF, tier);
    }

    const modifier = candidate?.type?.newModifier() as Modifiers.EnemyPersistentModifier;
    modifier.stackCount = tierStackCount;

    return modifier;
}

export function getEnemyModifierTypesForWave(waveIndex: integer, count: integer, party: EnemyPokemon[], poolType: ModifierPoolType.WILD | ModifierPoolType.TRAINER, upgradeChance: integer = 0): PokemonHeldItemModifierType[] {
    const ret = new Array(count).fill(0).map(() => getNewModifierTypeOption(party, poolType, undefined, upgradeChance && !Utils.randSeedInt(upgradeChance) ? 1 : 0)?.type as PokemonHeldItemModifierType);
    if (!(waveIndex % 1000)) {
        ret.push(getModifierType(modifierTypes.MINI_BLACK_HOLE) as PokemonHeldItemModifierType);
    }
    return ret;
}

export function getDailyRunStarterModifiers(party: PlayerPokemon[]): Modifiers.PokemonHeldItemModifier[] {
    const ret: Modifiers.PokemonHeldItemModifier[] = [];
    for (const p of party) {
        for (let m = 0; m < 3; m++) {
            const tierValue = Utils.randSeedInt(64);

            let tier: ModifierTier;
            if (tierValue > 25) {
                tier = ModifierTier.COMMON;
            } else if (tierValue > 12) {
                tier = ModifierTier.GREAT;
            } else if (tierValue > 4) {
                tier = ModifierTier.ULTRA;
            } else if (tierValue) {
                tier = ModifierTier.ROGUE;
            } else {
                tier = ModifierTier.MASTER;
            }

            const modifier = getNewModifierTypeOption(party, ModifierPoolType.DAILY_STARTER, tier)?.type?.newModifier(p) as Modifiers.PokemonHeldItemModifier;
            ret.push(modifier);
        }
    }

    return ret;
}

function getPathNodeModifiers(pathNodeFilter: PathNodeTypeFilter, _tier: ModifierTier, party: Pokemon[]): WeightedModifierType[] {
    const modifiers: WeightedModifierType[] = [];
    const pool = getModifierPoolForType(ModifierPoolType.PLAYER);

     const tierValue = Utils.randSeedInt(1024);
    let divisionFactor = 1.45;
    if (party[0]?.scene.gameData.hasPermaModifierByType(PermaType.PERMA_BETTER_LUCK_3)) {
        divisionFactor = 1;
    } else if (party[0]?.scene.gameData.hasPermaModifierByType(PermaType.PERMA_BETTER_LUCK_2)) {
        divisionFactor = 1.2;
    }
    
    const tier = tierValue > 900 / divisionFactor ? ModifierTier.COMMON :
                 tierValue > 224 / divisionFactor ? ModifierTier.GREAT :
                 tierValue > 112 / divisionFactor ? ModifierTier.ULTRA :
                 tierValue ? ModifierTier.ROGUE : ModifierTier.MASTER;

    if(Utils.randSeedInt(100) <= 50) {
            party[0].scene.gameData.reducePermaModifierByType([
                PermaType.PERMA_BETTER_LUCK_3,
                PermaType.PERMA_BETTER_LUCK_2
            ], party[0].scene);
    }
    
    switch (pathNodeFilter) {
        case PathNodeTypeFilter.MASTER_BALL_ITEMS:
            if (pool[ModifierTier.MASTER]) {
                return pool[ModifierTier.MASTER].slice();
            }
            break;
            
        case PathNodeTypeFilter.ROGUE_BALL_ITEMS:
            if (pool[ModifierTier.ROGUE]) {
                return pool[ModifierTier.ROGUE].slice();
            }
            break;
            
        case PathNodeTypeFilter.TYPE_SWITCHER:
            modifiers.push(new WeightedModifierType(modifierTypes.TYPE_SWITCHER, 3));
            modifiers.push(new WeightedModifierType(modifierTypes.PRIMARY_TYPE_SWITCHER, 2));
            modifiers.push(new WeightedModifierType(modifierTypes.SECONDARY_TYPE_SWITCHER, 2));
            break;
            
        case PathNodeTypeFilter.PASSIVE_ABILITY:
            modifiers.push(new WeightedModifierType(modifierTypes.ANY_PASSIVE_ABILITY, 3));
            break;
            
        case PathNodeTypeFilter.ANY_TMS:
            switch (tier) {
                case ModifierTier.COMMON:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_COMMON, 2));
                    modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_COMMON, 6));
                    break;
                case ModifierTier.GREAT:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_GREAT, 6));
                    modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_GREAT, 16));
                    break;
                case ModifierTier.ULTRA:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_ULTRA, 8));
                    modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_ULTRA, 8));
                    break;
                case ModifierTier.ROGUE:
                    modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_ULTRA, 7));
                    break;
                case ModifierTier.MASTER:
                    modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_MASTER, 18));
                    if (party[0]?.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
                        modifiers.push(new WeightedModifierType(modifierTypes.ANYTM_LUXURY, 14));
                    }
                    break;
            }
            break;
            
        case PathNodeTypeFilter.MINTS:
            modifiers.push(new WeightedModifierType(modifierTypes.MINT, 4));
            break;

        case PathNodeTypeFilter.STAT_SWITCHERS:
            modifiers.push(new WeightedModifierType(modifierTypes.STAT_SWITCHER, 4));
            break;

        case PathNodeTypeFilter.DNA_SPLICERS:
            modifiers.push(new WeightedModifierType(modifierTypes.DNA_SPLICERS, 4));
            break;
            
        case PathNodeTypeFilter.RELEASE_ITEMS:
            modifiers.push(new WeightedModifierType(modifierTypes.ABILITY_SACRIFICE, 3));
            modifiers.push(new WeightedModifierType(modifierTypes.TYPE_SACRIFICE, 8));
            modifiers.push(new WeightedModifierType(modifierTypes.MOVE_SACRIFICE, 3));
            if (tier === ModifierTier.MASTER || tier === ModifierTier.ROGUE) {
                modifiers.push(new WeightedModifierType(modifierTypes.PASSIVE_ABILITY_SACRIFICE, 3));
            }
            if (tier === ModifierTier.MASTER) {
                modifiers.push(new WeightedModifierType(modifierTypes.STAT_SACRIFICE, 6));
            }
            break;
            
        case PathNodeTypeFilter.ABILITY_SWITCHERS:
            modifiers.push(new WeightedModifierType(modifierTypes.ABILITY_SWITCHER, 3));
            modifiers.push(new WeightedModifierType(modifierTypes.ANY_ABILITY, 6));
            if (tier === ModifierTier.MASTER && party[0]?.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN]) {
                modifiers.push(new WeightedModifierType(modifierTypes.ANY_SMITTY_ABILITY, 2));
            }
            break;
            
        case PathNodeTypeFilter.ITEM_BERRY:
            modifiers.push(new WeightedModifierType(modifierTypes.BERRY, 1));
            break;
            
        case PathNodeTypeFilter.ITEM_TM:
            switch (tier) {
                case ModifierTier.COMMON:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_COMMON, 2));
                    break;
                case ModifierTier.GREAT:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_GREAT, 6));
                    break;
                case ModifierTier.ULTRA:
                    modifiers.push(new WeightedModifierType(modifierTypes.TM_ULTRA, 8));
                    break;
            }
            break;
            
        case PathNodeTypeFilter.ADD_POKEMON:
            modifiers.push(new WeightedModifierType(modifierTypes.ADD_POKEMON, 6));
            break;
            
        case PathNodeTypeFilter.EXP_SHARE:
            modifiers.push(new WeightedModifierType(modifierTypes.EXP_SHARE, party[0].scene.gameMode.isChaosMode ? 14 : skipInLastClassicWaveOrDefault(6)));
            break;
            
        case PathNodeTypeFilter.COLLECTED_TYPE:
            modifiers.push(new WeightedModifierType(modifierTypes.COLLECTED_TYPE, 1));
            break;
            
        case PathNodeTypeFilter.PP_MAX:
            modifiers.push(new WeightedModifierType(modifierTypes.PP_MAX, 2));
            break;
    }
    
    return modifiers;
}

function getNewModifierTypeOption(party: Pokemon[], poolType: ModifierPoolType, tier?: ModifierTier, upgradeCount?: integer, retryCount: integer = 0, pathNodeFilter?: PathNodeTypeFilter): ModifierTypeOption | null {
    const player = !poolType;
    const pool = getModifierPoolForType(poolType, party[0]?.scene.gameMode.isTestMod);
    let thresholds: object;
    switch (poolType) {
        case ModifierPoolType.PLAYER:
            thresholds = modifierPoolThresholds;
            break;
        case ModifierPoolType.WILD:
            thresholds = enemyModifierPoolThresholds;
            break;
        case ModifierPoolType.TRAINER:
            thresholds = enemyModifierPoolThresholds;
            break;
        case ModifierPoolType.ENEMY_BUFF:
            thresholds = enemyBuffModifierPoolThresholds;
            break;
        case ModifierPoolType.DAILY_STARTER:
            thresholds = dailyStarterModifierPoolThresholds;
            break;
        
        case ModifierPoolType.DRAFT:
            thresholds = draftModifierPoolThresholds;
            break;
    }
    if (tier === undefined) {
        const tierValue = Utils.randSeedInt(1024);
        if (!upgradeCount) {
            upgradeCount = 0;
        }
        if (player && tierValue) {
            const upgradeOdds = Math.floor(128 / ((5 + 4) / 4));
            let upgraded = false;
            do {
                upgraded = Utils.randSeedInt(upgradeOdds) < 4;
                if (upgraded) {
                    upgradeCount++;
                }
            } while (upgraded);
        }
        
        let divisionFactor = 1.45; 
        if (party[0].scene.gameData.hasPermaModifierByType(PermaType.PERMA_BETTER_LUCK_3)) {
            divisionFactor = 1;
        } else if (party[0].scene.gameData.hasPermaModifierByType(PermaType.PERMA_BETTER_LUCK_2)) {
            divisionFactor = 1.2;
        }

        if (poolType == ModifierPoolType.TRAINER) {
            tier = tierValue > 1024 / divisionFactor ? ModifierTier.COMMON :
                tierValue > 280 / divisionFactor ? ModifierTier.GREAT :
                    tierValue > 140 / divisionFactor ? ModifierTier.ULTRA :
                        tierValue ? ModifierTier.ROGUE : ModifierTier.MASTER;
        } else {
            tier = tierValue > 900 / divisionFactor ? ModifierTier.COMMON :
                tierValue > 224 / divisionFactor ? ModifierTier.GREAT :
                    tierValue > 112 / divisionFactor ? ModifierTier.ULTRA :
                        tierValue ? ModifierTier.ROGUE : ModifierTier.MASTER;
        }

         if(Utils.randSeedInt(100) <= 50) {
            party[0].scene.gameData.reducePermaModifierByType([
                PermaType.PERMA_BETTER_LUCK_3,
                PermaType.PERMA_BETTER_LUCK_2
            ], party[0].scene);
        }
        tier += upgradeCount;
        while (tier && (!modifierPool.hasOwnProperty(tier) || !modifierPool[tier].length)) {
            tier--;
            if (upgradeCount) {
                upgradeCount--;
            }
        }
    } else if (upgradeCount === undefined && player) {
        upgradeCount = 0;
        if (tier < ModifierTier.MASTER) {
            const upgradeOdds = Math.floor(32 / ((1 + 2) / 2));
            while (modifierPool.hasOwnProperty(tier + upgradeCount + 1) && modifierPool[tier + upgradeCount + 1].length) {
                if (!Utils.randSeedInt(upgradeOdds)) {
                    upgradeCount++;
                } else {
                    break;
                }
            }
            tier += upgradeCount;
        }
    } else if (retryCount === 10 && tier) {
        retryCount = 0;
        tier--;
    }

    if (pathNodeFilter && pathNodeFilter !== PathNodeTypeFilter.NONE) {
        const pathNodeModifiers = getPathNodeModifiers(pathNodeFilter, tier, party);
        
        if (!pathNodeModifiers || pathNodeModifiers.length === 0) {
            if (retryCount < 10) {
                return getNewModifierTypeOption(party, poolType, tier, upgradeCount, retryCount + 1, pathNodeFilter);
            }
            return null;
        }

        const pathNodeThresholds: { [key: string]: number } = {};
        let totalWeight = 0;
        pathNodeModifiers.forEach((weightedModifier, index) => {
            let weight = typeof weightedModifier.weight === 'function' 
                ? weightedModifier.weight(party, retryCount) 
                : weightedModifier.weight;
            
            if (weight === 0) {
                weight = 1;
            }
            
            totalWeight += weight;
            pathNodeThresholds[totalWeight.toString()] = index;
        });

        if (totalWeight === 0) {
            if (retryCount < 10) {
                return getNewModifierTypeOption(party, poolType, tier, upgradeCount, retryCount + 1, pathNodeFilter);
            }
            return null;
        }

        const value = Utils.randSeedInt(totalWeight);
        let index: integer | undefined;
        for (const threshold of Object.keys(pathNodeThresholds).map(k => parseInt(k)).sort((a, b) => a - b)) {
            if (value < threshold) {
                index = pathNodeThresholds[threshold.toString()];
                break;
            }
        }

        if (index === undefined) {
            if (retryCount < 10) {
                return getNewModifierTypeOption(party, poolType, tier, upgradeCount, retryCount + 1, pathNodeFilter);
            }
            return null;
        }

        let modifierType: ModifierType | null = pathNodeModifiers[index].modifierType;
        if (modifierType instanceof ModifierTypeGenerator) {
            modifierType = (modifierType as ModifierTypeGenerator).generateType(party);
            if (modifierType === null) {
                return getNewModifierTypeOption(party, poolType, tier, upgradeCount, ++retryCount, pathNodeFilter);
            }
        }

        return new ModifierTypeOption(modifierType as ModifierType, upgradeCount!);
    }

    const tierThresholds = Object.keys(thresholds[tier]);
    const totalWeight = parseInt(tierThresholds[tierThresholds.length - 1]);
    const value = Utils.randSeedInt(totalWeight);
    let index: integer | undefined;
    for (const t of tierThresholds) {
        const threshold = parseInt(t);
        if (value < threshold) {
            index = thresholds[tier][threshold];
            break;
        }
    }

    if (index === undefined) {
        return null;
    }

   
    let modifierType: ModifierType | null = (pool[tier][index]).modifierType;
    if (modifierType instanceof ModifierTypeGenerator) {
        modifierType = (modifierType as ModifierTypeGenerator).generateType(party);
        if (modifierType === null) {
            return getNewModifierTypeOption(party, poolType, tier, upgradeCount, ++retryCount);
        }
    }

    return new ModifierTypeOption(modifierType as ModifierType, upgradeCount!); // TODO: is this bang correct?
}





export function getDefaultModifierTypeForTier(tier: ModifierTier): ModifierType {
    let modifierType: ModifierType | WeightedModifierType = modifierPool[tier || ModifierTier.COMMON][0];
    if (modifierType instanceof WeightedModifierType) {
        modifierType = (modifierType as WeightedModifierType).modifierType;
    }
    return modifierType;
}

export class ModifierTypeOption {
    public id: string;
    public type: ModifierType;
    public upgradeCount: integer;
    public cost: integer;

    constructor(type: ModifierType, upgradeCount: integer, cost: number = 0) {
        this.id = Utils.randomString(16);
        this.type = type;
        this.upgradeCount = upgradeCount;
        this.cost = Math.min(Math.round(cost), Number.MAX_SAFE_INTEGER);
    }
}

export function getPartyLuckValue(party: Pokemon[]): integer {
    return Utils.randSeedInt(7, 1);
    const luck = Phaser.Math.Clamp(party.map(p => p.isFainted() ? 0 : p.getLuck())
        .reduce((total: integer, value: integer) => total += value, 0), 0, 14);
    return luck || 0;
}

export function getLuckString(luckValue: integer): string {
    return ["D", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "A++", "S", "S+", "SS", "SS+", "SSS"][luckValue];
}

export function getLuckTextTint(luckValue: integer): integer {
    let modifierTier: ModifierTier;
    if (luckValue > 11) {
        modifierTier = ModifierTier.LUXURY;
    } else if (luckValue > 9) {
        modifierTier = ModifierTier.MASTER;
    } else if (luckValue > 5) {
        modifierTier = ModifierTier.ROGUE;
    } else if (luckValue > 2) {
        modifierTier = ModifierTier.ULTRA;
    } else if (luckValue) {
        modifierTier = ModifierTier.GREAT;
    } else {
        modifierTier = ModifierTier.COMMON;
    }
    return getModifierTierTextTint(modifierTier);
}



export class QuestModifierType extends ModifierType {
    public config: QuestModifierTypeConfig;
    private modifierFactory: QuestModifierFactory;

    constructor(id: string, config: QuestModifierTypeConfig, modifierFactory: QuestModifierFactory) {
        super(config.name, "quest_icon", (_type, args) => {
            const currentCount = args && args.length > 6 ? args[6] as number : 0;
            const currentStage = args && args.length > 11 ? args[11] as number : 0;

            return modifierFactory(
                _type,
                config.runType,
                config.duration,
                config.condition,
                config.goalCount,
                config.questUnlockData,
                config.task,
                currentCount,
                config.resetOnFail ?? false,
                config.startWave,
                config.conditionUnlockable,
                config.stages,
                currentStage,
                config.consoleCode
        );
        });
        this.id = id;
        this.config = config;
        this.modifierFactory = modifierFactory;
    }

    get name(): string {
        return this.config.name;
    }

    get task(): string | undefined {
        return this.config.task;
    }

    getDescription(scene: BattleScene): string {
        if (this.config.task) {
            return `${this.config.task}`;
        }
        return this.config.name;
        return i18next.t("modifierType:ModifierType.QuestModifierType.description", {
            questName: this.config.name,
            goalCount: this.config.goalCount,
            currentCount: (this.modifierFactory as any).currentCount || 0
        });
    }

    getCondition(): (...args: any[]) => boolean {
        return this.config.condition;
    }
}

interface QuestPregenArgs {
    currentCount: number;
    currentStage: number;
}

export class QuestModifierTypeGenerator extends ModifierTypeGenerator {
    public id: string;
    public config: QuestModifierTypeConfig;
    private modifierFactory: QuestModifierFactory;

    constructor(id: string, config: QuestModifierTypeConfig, modifierFactory: QuestModifierFactory) {
        super((party: Pokemon[], pregenArgs?: any[]) => {
            const args = this.parsePregenArgs(pregenArgs);

      return new QuestModifierType(id, {
        ...config,
      }, (type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, startWave, conditionUnlockable, stages, currentStage,  consoleCode) =>
                modifierFactory(type, runType, duration, condition, goalCount, questUnlockData, task,
                    currentCount, resetOnFail, startWave, conditionUnlockable, stages,
                    currentStage, consoleCode)
            );
        });
        this.id = id;
        this.config = config;
        this.modifierFactory = modifierFactory;
    }

    private parsePregenArgs(pregenArgs?: any[]): QuestPregenArgs {
        return {
            currentCount: pregenArgs && pregenArgs.length > 6 ? pregenArgs[6] as number : 0,
            currentStage: pregenArgs && pregenArgs.length > 11 ? pregenArgs[11] as number : 0
        };
    }


    generateType(party: Pokemon[], pregenArgs?: any[]): QuestModifierType {
        return this.genTypeFunc(party, pregenArgs) as QuestModifierType;
    }
}


export const questModifierTypes: QuestModifierTypes = {
    PERMA_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaRunQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail,  stages, currentStageIndex, consoleCode)),

    PERMA_HIT_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaHitQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_USE_ABILITY_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaUseAbilityQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_KNOCKOUT_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaKnockoutQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_FAINT_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaFaintQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_MOVE_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaMoveQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_WIN_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaWinQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_RUN_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaRunQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_SPECIAL_MOVE_QUEST: (id: string, config: QuestModifierTypeConfig & { conditionUnlockable: QuestUnlockables }) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable = config.conditionUnlockable, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaSpecialMoveQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, startWave, conditionUnlockable, stages, currentStageIndex, consoleCode)),

    PERMA_TAG_REMOVAL_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaTagRemovalQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_WAVE_CHECK_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = true, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaWaveCheckQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_COUNTDOWN_WAVE_CHECK_QUEST: (id: string, config: QuestModifierTypeConfig & { startWave: number }) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = true, startWave = config.startWave, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaCountdownWaveCheckQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, startWave, conditionUnlockable, stages, currentStageIndex, consoleCode)),

    PERMA_CATCH_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaCatchQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),
    
    PERMA_RIVAL_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaBeatTrainerQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),

    PERMA_FORM_CHANGE_QUEST: (id: string, config: QuestModifierTypeConfig) =>
        new QuestModifierTypeGenerator(id, config,
            (_type, runType, duration, condition, goalCount, questUnlockData, task?, currentCount = 0, resetOnFail = false, startWave?, conditionUnlockable?, stages = config.stages, currentStageIndex = 0, consoleCode = "") =>
                new Modifiers.PermaFormChangeQuestModifier(_type, runType, duration, condition, goalCount, questUnlockData, task, currentCount, resetOnFail, null, null, stages, currentStageIndex, consoleCode)),
};



export const taurosElectricHitModifier = questModifierTypes.PERMA_HIT_QUEST("TAUROS_ELECTRIC_HIT_QUEST", {
    name: i18next.t("quests:TAUROS_ELECTRIC_HIT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        defender.species.speciesId === Species.TAUROS && move.type === Type.ELECTRIC,
    goalCount: 30,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.TAUROS,
        questId: QuestUnlockables.TAUROS_ELECTRIC_HIT_QUEST
    },
    task: `${i18next.t("quests:TAUROS_ELECTRIC_HIT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const kecleonColorChangeModifier = questModifierTypes.PERMA_USE_ABILITY_QUEST("KECLEON_COLOR_CHANGE_QUEST", {
    name: i18next.t("quests:KECLEON_COLOR_CHANGE_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, ability: Ability) =>
        pokemon.species.speciesId === Species.KECLEON && ability.id === Abilities.COLOR_CHANGE,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.KECLEON,
        questId: QuestUnlockables.KECLEON_COLOR_CHANGE_QUEST
    },
    task: `${i18next.t("quests:KECLEON_COLOR_CHANGE_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const gliscorDarkMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("GLISCOR_DARK_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:GLISCOR_DARK_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.GLISCOR && move.type === Type.DARK,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.GLISCOR,
        questId: QuestUnlockables.GLISCOR_DARK_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:GLISCOR_DARK_MOVE_KNOCKOUT_QUEST.task")
});
export const marowakCuboneFaintModifier = questModifierTypes.PERMA_FAINT_QUEST("MAROWAK_CUBONE_FAINT_QUEST", {
    name: i18next.t("quests:MAROWAK_CUBONE_FAINT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (pokemon: PlayerPokemon) =>
        pokemon.species.speciesId === Species.MAROWAK &&
        pokemon.scene.getParty().some(p => p.species.speciesId === Species.CUBONE),
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MAROWAK,
        questId: QuestUnlockables.MAROWAK_CUBONE_FAINT_QUEST
    },
    task: i18next.t("quests:MAROWAK_CUBONE_FAINT_QUEST.task")
});
export const noivernDragonMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.NOIVERN && move.type === Type.DRAGON,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.NOIVERN,
        questId: QuestUnlockables.NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST.task")
});
export const feraligatrDragonDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("FERALIGATR_DRAGON_DEFEAT_QUEST", {
    name: i18next.t("quests:FERALIGATR_DRAGON_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.FERALIGATR && defender.isOfType(Type.DRAGON),
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.FERALIGATR,
        questId: QuestUnlockables.FERALIGATR_DRAGON_DEFEAT_QUEST
    },
    task: i18next.t("quests:FERALIGATR_DRAGON_DEFEAT_QUEST.task")
});
export const charizardGroundMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.CHARIZARD && move.type === Type.GROUND,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.CHARIZARD,
        questId: QuestUnlockables.CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST.task")
});
export const venusaurPsychicMoveUseModifier = questModifierTypes.PERMA_MOVE_QUEST("VENUSAUR_PSYCHIC_MOVE_USE_QUEST", {
    name: i18next.t("quests:VENUSAUR_PSYCHIC_MOVE_USE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.VENUSAUR && move.type === Type.PSYCHIC,
    goalCount: 200,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.VENUSAUR,
        questId: QuestUnlockables.VENUSAUR_PSYCHIC_MOVE_USE_QUEST
    },
    task: i18next.t("quests:VENUSAUR_PSYCHIC_MOVE_USE_QUEST.task")
});
export const blastoiseFairyDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("BLASTOISE_FAIRY_DEFEAT_QUEST", {
    name: i18next.t("quests:BLASTOISE_FAIRY_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.BLASTOISE && defender.isOfType(Type.FAIRY),
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.BLASTOISE,
        questId: QuestUnlockables.BLASTOISE_FAIRY_DEFEAT_QUEST
    },
    task: i18next.t("quests:BLASTOISE_FAIRY_DEFEAT_QUEST.task")
});
export const nidokingDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("NIDOKING_DEFEAT_QUEST", {
    name: i18next.t("quests:NIDOKING_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.NIDOKING && defender.species.speciesId === Species.NIDOKING,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.NIDOKING,
        questId: QuestUnlockables.NIDOKING_DEFEAT_QUEST
    },
    task: i18next.t("quests:NIDOKING_DEFEAT_QUEST.task")
});
export const gengarSpecialWaveModifier = questModifierTypes.PERMA_WAVE_CHECK_QUEST("GENGAR_SPECIAL_WAVE_QUEST", {
    name: i18next.t("quests:GENGAR_SPECIAL_WAVE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const gengar = scene.getParty()[0];
        return gengar && gengar.species.speciesId === Species.GENGAR &&
            !gengar.moveset.some(m => m.getMove().type === Type.GHOST || m.getMove().type === Type.POISON) &&
            gengar.moveset.some(m => m.getMove().type === Type.ELECTRIC);
    },
    goalCount: 30,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.GENGAR,
        questId: QuestUnlockables.GENGAR_SPECIAL_WAVE_QUEST
    },
    task: i18next.t("quests:GENGAR_SPECIAL_WAVE_QUEST.task")
});
export const weezingFireMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("WEEZING_FIRE_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:WEEZING_FIRE_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.WEEZING && move.type === Type.FIRE,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.WEEZING,
        questId: QuestUnlockables.WEEZING_FIRE_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:WEEZING_FIRE_MOVE_KNOCKOUT_QUEST.task")
});
export const hitmonleeNormalWaveModifier = questModifierTypes.PERMA_WAVE_CHECK_QUEST("HITMONLEE_NORMAL_WAVE_QUEST", {
    name: i18next.t("quests:HITMONLEE_NORMAL_WAVE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        return party[0].species.speciesId === Species.HITMONLEE &&
            party.slice(1).every(p => p.isOfType(Type.NORMAL)) &&
            party[0].moveset.every(m => m.getMove().type === Type.NORMAL);
    },
    goalCount: 30,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.HITMONLEE,
        questId: QuestUnlockables.HITMONLEE_NORMAL_WAVE_QUEST
    },
    task: i18next.t("quests:HITMONLEE_NORMAL_WAVE_QUEST.task")
});
export const hitmonchanStatIncreaseModifier = questModifierTypes.PERMA_MOVE_QUEST("HITMONCHAN_STAT_INCREASE_QUEST", {
    name: i18next.t("quests:HITMONCHAN_STAT_INCREASE_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.HITMONCHAN && move.hasAttr(StatChangeAttr),
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.HITMONCHAN,
        questId: QuestUnlockables.HITMONCHAN_STAT_INCREASE_QUEST
    },
    task: `${i18next.t("quests:HITMONCHAN_STAT_INCREASE_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const hitmonDuoWinModifier = questModifierTypes.PERMA_WIN_QUEST("HITMON_DUO_WIN_QUEST", {
    name: i18next.t("quests:HITMON_DUO_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) =>
        scene.getParty().some(p => p.species.speciesId === Species.HITMONLEE) &&
        scene.getParty().some(p => p.species.speciesId === Species.HITMONCHAN),
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: [Species.HITMONLEE, Species.HITMONCHAN],
        questId: QuestUnlockables.HITMON_DUO_WIN_QUEST
    },
    task: i18next.t("quests:HITMON_DUO_WIN_QUEST.task")
});
export const kangaskhanGhostMoveModifier = questModifierTypes.PERMA_MOVE_QUEST("KANGASKHAN_GHOST_MOVE_QUEST", {
    name: i18next.t("quests:KANGASKHAN_GHOST_MOVE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.KANGASKHAN && move.type === Type.GHOST,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.KANGASKHAN,
        questId: QuestUnlockables.KANGASKHAN_GHOST_MOVE_QUEST
    },
    task: i18next.t("quests:KANGASKHAN_GHOST_MOVE_QUEST.task")
});
export const scytherTrioWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("SCYTHER_TRIO_WIN_QUEST", {
    name: i18next.t("quests:SCYTHER_TRIO_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        return scene.getParty().length <= 3 &&
            scene.getParty().some(p => p.species.speciesId === Species.SCYTHER);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SCYTHER,
        questId: QuestUnlockables.SCYTHER_TRIO_WIN_QUEST
    },
    task: i18next.t("quests:SCYTHER_TRIO_WIN_QUEST.task")
});
export const greninjaTrioWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("GRENINJA_TRIO_WIN_QUEST", {
    name: i18next.t("quests:GRENINJA_TRIO_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        return scene.getParty().length <= 3 &&
            scene.getParty().some(p => p.species.speciesId === Species.GRENINJA);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.GRENINJA,
        questId: QuestUnlockables.GRENINJA_TRIO_WIN_QUEST
    },
    task: i18next.t("quests:GRENINJA_TRIO_WIN_QUEST.task")
});
export const simisageTrioWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("SIMISAGE_TRIO_WIN_QUEST", {
    name: i18next.t("quests:SIMISAGE_TRIO_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        return scene.getParty().length <= 3 &&
            scene.getParty().some(p => p.species.speciesId === Species.SIMISAGE);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SIMISAGE,
        questId: QuestUnlockables.SIMISAGE_TRIO_WIN_QUEST
    },
    task: i18next.t("quests:SIMISAGE_TRIO_WIN_QUEST.task")
});
export const elementalMonkeyWinModifier = questModifierTypes.PERMA_WIN_QUEST("ELEMENTAL_MONKEY_WIN_QUEST", {
    name: i18next.t("quests:ELEMENTAL_MONKEY_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) => {
        const party = scene.getParty();
        const elementalMonkeys = party.filter(p => [Species.SIMISAGE, Species.SIMIPOUR, Species.SIMISEAR].includes(p.species.speciesId));
        if (elementalMonkeys.length === 0) return false;
        const requiredTypes = [Type.FLYING, Type.FIRE, Type.WATER, Type.GROUND];
        return elementalMonkeys.some(monkey => {
            const moveTypes = monkey.moveset.map(m => m.getMove().type);
            return requiredTypes.every(type => moveTypes.includes(type)) && moveTypes.length === 4;
        });
    },
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: [Species.SIMISAGE, Species.SIMIPOUR, Species.SIMISEAR],
        questId: QuestUnlockables.ELEMENTAL_MONKEY_WIN_QUEST
    },
    task: i18next.t("quests:ELEMENTAL_MONKEY_WIN_QUEST.task")
});
export const electiviremagmortarWinModifier = questModifierTypes.PERMA_WIN_QUEST("ELECTIVIREMAGMORTAR_WIN_QUEST", {
    name: i18next.t("quests:ELECTIVIREMAGMORTAR_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) =>
        scene.getParty().some(p => p.species.speciesId === Species.ELECTIVIRE) &&
        scene.getParty().some(p => p.species.speciesId === Species.MAGMORTAR),
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: [Species.ELECTIVIRE, Species.MAGMORTAR],
        questId: QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST
    },
    task: i18next.t("quests:ELECTIVIREMAGMORTAR_WIN_QUEST.task")
});
export const gyaradosGroundSwitchModifier = questModifierTypes.PERMA_HIT_QUEST("GYARADOS_GROUND_SWITCH_QUEST", {
    name: i18next.t("quests:GYARADOS_GROUND_SWITCH_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        defender.species.speciesId === Species.GYARADOS &&
        move.type === Type.GROUND,
    goalCount: 20,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.GYARADOS,
        questId: QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST
    },
    task: i18next.t("quests:GYARADOS_GROUND_SWITCH_QUEST.task")
});
export const laprasFireMoveModifier = questModifierTypes.PERMA_MOVE_QUEST("LAPRAS_FIRE_MOVE_QUEST", {
    name: i18next.t("quests:LAPRAS_FIRE_MOVE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.LAPRAS && move.type === Type.FIRE,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.LAPRAS,
        questId: QuestUnlockables.LAPRAS_FIRE_MOVE_QUEST
    },
    task: i18next.t("quests:LAPRAS_FIRE_MOVE_QUEST.task")
});
export const porygonZAnalyticUseModifier = questModifierTypes.PERMA_USE_ABILITY_QUEST("PORYGON_Z_ANALYTIC_USE_QUEST", {
    name: i18next.t("quests:PORYGON_Z_ANALYTIC_USE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, ability: Ability) =>
        pokemon.species.speciesId === Species.PORYGON_Z && ability.id === Abilities.ANALYTIC,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.PORYGON_Z,
        questId: QuestUnlockables.PORYGON_Z_ANALYTIC_USE_QUEST
    },
    task: i18next.t("quests:PORYGON_Z_ANALYTIC_USE_QUEST.task")
});
export const meowthTrioWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("MEOWTH_JESTER_QUEST", {
    name: i18next.t("quests:MEOWTH_JESTER_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        return scene.getParty().length <= 3 &&
            scene.getParty().some(p => p.species.speciesId === Species.MEOWTH);
    },
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MEOWTH,
        questId: QuestUnlockables.MEOWTH_JESTER_QUEST
    },
    startWave: 50,
    task: i18next.t("quests:MEOWTH_JESTER_QUEST.task")
});
export const dragoniteLanceDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("DRAGONITE_LANCE_DEFEAT_QUEST", {
    name: i18next.t("quests:DRAGONITE_LANCE_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.DRAGONITE &&
        (attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.LANCE),
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.DRAGONITE,
        questId: QuestUnlockables.DRAGONITE_LANCE_DEFEAT_QUEST
    },
    resetOnFail: true,
    task: i18next.t("quests:DRAGONITE_LANCE_DEFEAT_QUEST.task")
});
export const sudowoodoWoodHammerModifier = questModifierTypes.PERMA_MOVE_QUEST("SUDOWOODO_WOOD_HAMMER_QUEST", {
    name: i18next.t("quests:SUDOWOODO_WOOD_HAMMER_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.SUDOWOODO && move.id === Moves.WOOD_HAMMER,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SUDOWOODO,
        questId: QuestUnlockables.SUDOWOODO_WOOD_HAMMER_QUEST
    },
    task: i18next.t("quests:SUDOWOODO_WOOD_HAMMER_QUEST.task")
});
export const ambipomGigaImpactModifier = questModifierTypes.PERMA_MOVE_QUEST("AMBIPOM_GIGA_IMPACT_QUEST", {
    name: i18next.t("quests:AMBIPOM_GIGA_IMPACT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.SINGLE_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.AMBIPOM && move.id === Moves.GIGA_IMPACT,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.AMBIPOM,
        questId: QuestUnlockables.AMBIPOM_GIGA_IMPACT_QUEST
    },
    task: `${i18next.t("quests:AMBIPOM_GIGA_IMPACT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const miltankSteelMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MILTANK_STEEL_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MILTANK_STEEL_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.MILTANK && move.type === Type.STEEL,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MILTANK,
        questId: QuestUnlockables.MILTANK_STEEL_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MILTANK_STEEL_MOVE_KNOCKOUT_QUEST.task")
});
export const slakingRivalDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SLAKING_RIVAL_DEFEAT_QUEST", {
    name: i18next.t("quests:SLAKING_RIVAL_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SLAKING &&
        (attacker.scene.currentBattle.trainer?.isDynamicRival) &&
        !attacker.scene.currentBattle.hasPokemonBeenSwitchedOut(attacker.id),
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SLAKING,
        questId: QuestUnlockables.SLAKING_RIVAL_DEFEAT_QUEST
    },
    resetOnFail: true,
    task: i18next.t("quests:SLAKING_RIVAL_DEFEAT_QUEST.task")
});
export const solrockLunatoneWinModifier = questModifierTypes.PERMA_WIN_QUEST("SOLROCK_LUNATONE_WIN_QUEST", {
    name: i18next.t("quests:SOLROCK_LUNATONE_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) =>
        scene.getParty().some(p => p.species.speciesId === Species.SOLROCK) &&
        scene.getParty().some(p => p.species.speciesId === Species.LUNATONE),
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: [Species.SOLROCK, Species.LUNATONE],
        questId: QuestUnlockables.SOLROCK_LUNATONE_WIN_QUEST
    },
    task: i18next.t("quests:SOLROCK_LUNATONE_WIN_QUEST.task")
});
export const regigigasRegiDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("REGIGIGAS_REGI_DEFEAT_QUEST", {
    name: i18next.t("quests:REGIGIGAS_REGI_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.REGIGIGAS &&
        [Species.REGIROCK, Species.REGICE, Species.REGISTEEL, Species.REGIELEKI, Species.REGIDRAGO].includes(defender.species.speciesId),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.REGIGIGAS,
        questId: QuestUnlockables.REGIGIGAS_REGI_DEFEAT_QUEST
    },
    task: i18next.t("quests:REGIGIGAS_REGI_DEFEAT_QUEST.task")
});
export const pikachuRedBlueWinModifier = questModifierTypes.PERMA_WIN_QUEST("PIKACHU_RED_BLUE_WIN_QUEST", {
    name: i18next.t("quests:PIKACHU_RED_BLUE_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) =>
        (scene.currentBattle.trainer?.config.trainerType === TrainerType.RED ||
            scene.currentBattle.trainer?.config.trainerType === TrainerType.BLUE) &&
        scene.getParty().some(p => p.species.speciesId === Species.PIKACHU),
    goalCount: 2,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.PIKACHU,
        questId: QuestUnlockables.PIKACHU_RED_BLUE_WIN_QUEST
    },
    task: i18next.t("quests:PIKACHU_RED_BLUE_WIN_QUEST.task")
});
export const snorlaxGrassKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SNORLAX_GRASS_KNOCKOUT_QUEST", {
    name: i18next.t("quests:SNORLAX_GRASS_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.SNORLAX && move.type === Type.GRASS,
    goalCount: 20,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SNORLAX,
        questId: QuestUnlockables.SNORLAX_GRASS_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:SNORLAX_GRASS_KNOCKOUT_QUEST.task")
});
export const cloysterPresentModifier = questModifierTypes.PERMA_MOVE_QUEST("CLOYSTER_PRESENT_QUEST", {
    name: i18next.t("quests:CLOYSTER_PRESENT_QUEST.name"),
    runType: RunType.NUZLOCKE,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.CLOYSTER && move.id === Moves.PRESENT,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.CLOYSTER,
        questId: QuestUnlockables.CLOYSTER_PRESENT_QUEST
    },
    task: i18next.t("quests:CLOYSTER_PRESENT_QUEST.task")
});
export const nuzleafNosepassDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("NUZLEAF_NOSEPASS_DEFEAT_QUEST", {
    name: i18next.t("quests:NUZLEAF_NOSEPASS_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.NUZLEAF &&
        (defender.species.speciesId === Species.NOSEPASS || defender.species.speciesId === Species.PROBOPASS),
    goalCount: 20,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.NUZLEAF,
        questId: QuestUnlockables.NUZLEAF_NOSEPASS_DEFEAT_QUEST
    },
    task: i18next.t("quests:NUZLEAF_NOSEPASS_DEFEAT_QUEST.task")
});
export const chandelureRestModifier = questModifierTypes.PERMA_MOVE_QUEST("CHANDELURE_REST_QUEST", {
    name: i18next.t("quests:CHANDELURE_REST_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.SINGLE_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.CHANDELURE && move.id === Moves.REST,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.CHANDELURE,
        questId: QuestUnlockables.CHANDELURE_REST_QUEST
    },
    task: `${i18next.t("quests:CHANDELURE_REST_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const smeargleDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SMEARGLE_DEFEAT_QUEST", {
    name: i18next.t("quests:SMEARGLE_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SMEARGLE,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SMEARGLE,
        questId: QuestUnlockables.SMEARGLE_DEFEAT_QUEST
    },
    task: i18next.t("quests:SMEARGLE_DEFEAT_QUEST.task")
});
export const mimikyuCharizardKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MIMIKYU_CHARIZARD_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MIMIKYU_CHARIZARD_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MIMIKYU && defender.species.speciesId === Species.CHARIZARD,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MIMIKYU,
        questId: QuestUnlockables.MIMIKYU_CHARIZARD_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MIMIKYU_CHARIZARD_KNOCKOUT_QUEST.task")
});
export const mimikyuGreninjaKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MIMIKYU_GRENINJA_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MIMIKYU_GRENINJA_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MIMIKYU && defender.species.speciesId === Species.GRENINJA,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_B,
        rewardId: Species.MIMIKYU,
        questId: QuestUnlockables.MIMIKYU_GRENINJA_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MIMIKYU_GRENINJA_KNOCKOUT_QUEST.task")
});
export const mimikyuRaichuKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MIMIKYU_RAICHU_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MIMIKYU_RAICHU_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MIMIKYU && defender.species.speciesId === Species.RAICHU,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_C,
        rewardId: Species.MIMIKYU,
        questId: QuestUnlockables.MIMIKYU_RAICHU_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MIMIKYU_RAICHU_KNOCKOUT_QUEST.task")
});
export const mimikyuMewtwoKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MIMIKYU_MEWTWO_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MIMIKYU_MEWTWO_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MIMIKYU && defender.species.speciesId === Species.MEWTWO,
    goalCount: 2,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_D,
        rewardId: Species.MIMIKYU,
        questId: QuestUnlockables.MIMIKYU_MEWTWO_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MIMIKYU_MEWTWO_KNOCKOUT_QUEST.task")
});
export const mimikyuRegirockKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MIMIKYU_REGIROCK_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MIMIKYU_REGIROCK_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MIMIKYU && defender.species.speciesId === Species.REGIROCK,
    goalCount: 2,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_E,
        rewardId: Species.MIMIKYU,
        questId: QuestUnlockables.MIMIKYU_REGIROCK_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MIMIKYU_REGIROCK_KNOCKOUT_QUEST.task")
});
export const eiscueRockKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EISCUE_ROCK_KNOCKOUT_QUEST", {
    name: i18next.t("quests:EISCUE_ROCK_KNOCKOUT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.EISCUE && defender.isOfType(Type.ROCK),
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.EISCUE,
        questId: QuestUnlockables.EISCUE_ROCK_KNOCKOUT_QUEST
    },
    task: `${i18next.t("quests:EISCUE_ROCK_KNOCKOUT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const zangooseSeviperKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("ZANGOOSE_SEVIPER_KNOCKOUT_QUEST", {
    name: i18next.t("quests:ZANGOOSE_SEVIPER_KNOCKOUT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.ZANGOOSE && defender.species.speciesId === Species.SEVIPER,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.ZANGOOSE,
        questId: QuestUnlockables.ZANGOOSE_SEVIPER_KNOCKOUT_QUEST
    },
    task: `${i18next.t("quests:ZANGOOSE_SEVIPER_KNOCKOUT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const seviperZangooseKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SEVIPER_ZANGOOSE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:SEVIPER_ZANGOOSE_KNOCKOUT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SEVIPER && defender.species.speciesId === Species.ZANGOOSE,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SEVIPER,
        questId: QuestUnlockables.SEVIPER_ZANGOOSE_KNOCKOUT_QUEST
    },
    task: `${i18next.t("quests:SEVIPER_ZANGOOSE_KNOCKOUT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const trubbishPoisonDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("TRUBBISH_POISON_DEFEAT_QUEST", {
    name: i18next.t("quests:TRUBBISH_POISON_DEFEAT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.TRUBBISH && defender.isOfType(Type.POISON),
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.TRUBBISH,
        questId: QuestUnlockables.TRUBBISH_POISON_DEFEAT_QUEST
    },
    task: `${i18next.t("quests:TRUBBISH_POISON_DEFEAT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const hawluchaRivalChampionDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST", {
    name: i18next.t("quests:HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.HAWLUCHA &&
        (attacker.scene.currentBattle.trainer?.isDynamicRival ||
            attacker.scene.currentBattle.trainer?.config.title === "champion" ||
            attacker.scene.currentBattle.trainer?.config.title === "champion_female"),
    goalCount: 6,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.HAWLUCHA,
        questId: QuestUnlockables.HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST
    },
    task: i18next.t("quests:HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST.task")
});
export const dittoDragoniteTransformModifier = questModifierTypes.PERMA_MOVE_QUEST("DITTO_DRAGONITE_TRANSFORM_QUEST", {
    name: i18next.t("quests:DITTO_DRAGONITE_TRANSFORM_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.DITTO &&
        move.id === Moves.TRANSFORM &&
        pokemon.scene.getEnemyParty().some(enemyPokemon => enemyPokemon.species.speciesId === Species.DRAGONITE),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_DRAGONITE_TRANSFORM_QUEST
    },
    task: i18next.t("quests:DITTO_DRAGONITE_TRANSFORM_QUEST.task")
});
export const dittoCharizardTransformModifier = questModifierTypes.PERMA_MOVE_QUEST("DITTO_CHARIZARD_TRANSFORM_QUEST", {
    name: i18next.t("quests:DITTO_CHARIZARD_TRANSFORM_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.DITTO &&
        move.id === Moves.TRANSFORM &&
        pokemon.scene.getEnemyParty().some(enemyPokemon => enemyPokemon.species.speciesId === Species.CHARIZARD),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_B,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_CHARIZARD_TRANSFORM_QUEST
    },
    task: i18next.t("quests:DITTO_CHARIZARD_TRANSFORM_QUEST.task")
});
export const dittoPikachuTransformModifier = questModifierTypes.PERMA_MOVE_QUEST("DITTO_PIKACHU_TRANSFORM_QUEST", {
    name: i18next.t("quests:DITTO_PIKACHU_TRANSFORM_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.DITTO &&
        move.id === Moves.TRANSFORM &&
        pokemon.scene.getEnemyParty().some(enemyPokemon => enemyPokemon.species.speciesId === Species.PIKACHU),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_C,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_PIKACHU_TRANSFORM_QUEST
    },
    task: i18next.t("quests:DITTO_PIKACHU_TRANSFORM_QUEST.task")
});
export const dittoMachampTransformModifier = questModifierTypes.PERMA_MOVE_QUEST("DITTO_MACHAMP_TRANSFORM_QUEST", {
    name: i18next.t("quests:DITTO_MACHAMP_TRANSFORM_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.DITTO &&
        move.id === Moves.TRANSFORM &&
        pokemon.scene.getEnemyParty().some(enemyPokemon => enemyPokemon.species.speciesId === Species.MACHAMP),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_D,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_MACHAMP_TRANSFORM_QUEST
    },
    task: i18next.t("quests:DITTO_MACHAMP_TRANSFORM_QUEST.task")
});
export const dittoMewtwoTransformModifier = questModifierTypes.PERMA_MOVE_QUEST("DITTO_MEWTWO_TRANSFORM_QUEST", {
    name: i18next.t("quests:DITTO_MEWTWO_TRANSFORM_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.DITTO &&
        move.id === Moves.TRANSFORM &&
        pokemon.scene.getEnemyParty().some(enemyPokemon => enemyPokemon.species.speciesId === Species.MEWTWO),
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_E,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_MEWTWO_TRANSFORM_QUEST
    },
    task: i18next.t("quests:DITTO_MEWTWO_TRANSFORM_QUEST.task")
});
export const feraligatrRockMoveKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.FERALIGATR && move.type === Type.ROCK,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_B,
        rewardId: Species.FERALIGATR,
        questId: QuestUnlockables.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST.task")
});
export const wobbuffetRivalDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("WOBBUFFET_RIVAL_DEFEAT_QUEST", {
    name: i18next.t("quests:WOBBUFFET_RIVAL_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.WOBBUFFET &&
        attacker.scene.currentBattle.trainer?.isDynamicRival,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.WOBBUFFET,
        questId: QuestUnlockables.WOBBUFFET_RIVAL_DEFEAT_QUEST
    },
    task: i18next.t("quests:WOBBUFFET_RIVAL_DEFEAT_QUEST.task")
});
export const magikarpDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MAGIKARP_DEFEAT_QUEST", {
    name: i18next.t("quests:MAGIKARP_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MAGIKARP,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MAGIKARP,
        questId: QuestUnlockables.MAGIKARP_DEFEAT_QUEST
    },
    task: i18next.t("quests:MAGIKARP_DEFEAT_QUEST.task")
});
export const klinklangGearMoveModifier = questModifierTypes.PERMA_MOVE_QUEST("KLINKLANG_GEAR_MOVE_QUEST", {
    name: i18next.t("quests:KLINKLANG_GEAR_MOVE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.KLINKLANG &&
        (move.id === Moves.SHIFT_GEAR || move.id === Moves.GEAR_UP),
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.KLINKLANG,
        questId: QuestUnlockables.KLINKLANG_GEAR_MOVE_QUEST
    },
    task: i18next.t("quests:KLINKLANG_GEAR_MOVE_QUEST.task")
});
export const spindaConfusionRecoveryModifier = questModifierTypes.PERMA_TAG_REMOVAL_QUEST("SPINDA_CONFUSION_RECOVERY_QUEST", {
    name: i18next.t("quests:SPINDA_CONFUSION_RECOVERY_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, tag: BattlerTagType) =>
        pokemon.species.speciesId === Species.SPINDA && tag === BattlerTagType.CONFUSED,
    goalCount: 10,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SPINDA,
        questId: QuestUnlockables.SPINDA_CONFUSION_RECOVERY_QUEST
    },
    task: i18next.t("quests:SPINDA_CONFUSION_RECOVERY_QUEST.task")
});
export const ninetalesStoredPowerKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("NINETALES_STORED_POWER_KNOCKOUT_QUEST", {
    name: i18next.t("quests:NINETALES_STORED_POWER_KNOCKOUT_QUEST.name"),
    runType: RunType.NON_CLASSIC,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.NINETALES && move.id === Moves.STORED_POWER,
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.NINETALES,
        questId: QuestUnlockables.NINETALES_STORED_POWER_KNOCKOUT_QUEST
    },
    task: `${i18next.t("quests:NINETALES_STORED_POWER_KNOCKOUT_QUEST.task")} ${i18next.t("gameMode:notClassic")}`
});
export const shuckleDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SHUCKLE_DEFEAT_QUEST", {
    name: i18next.t("quests:SHUCKLE_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SHUCKLE,
    goalCount: 30,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SHUCKLE,
        questId: QuestUnlockables.SHUCKLE_DEFEAT_QUEST
    },
    task: i18next.t("quests:SHUCKLE_DEFEAT_QUEST.task")
});
export const tangelaRivalDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("TANGELA_RIVAL_DEFEAT_QUEST", {
    name: i18next.t("quests:TANGELA_RIVAL_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.TANGELA &&
        attacker.scene.currentBattle.trainer?.isDynamicRival,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.TANGELA,
        questId: QuestUnlockables.TANGELA_RIVAL_DEFEAT_QUEST
    },
    task: i18next.t("quests:TANGELA_RIVAL_DEFEAT_QUEST.task")
});
export const claydolPoisonMoveUseModifier = questModifierTypes.PERMA_MOVE_QUEST("CLAYDOL_POISON_QUEST", {
    name: i18next.t("quests:CLAYDOL_POISON_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: PlayerPokemon, move: Move) =>
        pokemon.species.speciesId === Species.CLAYDOL && move.type === Type.POISON,
    goalCount: 200,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.CLAYDOL,
        questId: QuestUnlockables.CLAYDOL_POISON_QUEST
    },
    task: i18next.t("quests:CLAYDOL_POISON_QUEST.task")
});
export const taurosDarkWaveModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("TAUROS_DARK_WAVE_QUEST", {
    name: i18next.t("quests:TAUROS_DARK_WAVE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const tauros = scene.getParty()[0];
        return tauros && tauros.species.speciesId === Species.TAUROS &&
            !tauros.moveset.some(m => m.getMove().type === Type.NORMAL) &&
            tauros.moveset.some(m => m.getMove().type === Type.DARK) &&
            tauros.moveset.some(m => m.getMove().type === Type.GHOST);
    },
    goalCount: 50,
    startWave: 300,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.TAUROS,
        questId: QuestUnlockables.TAUROS_DARK_WAVE_QUEST
    },
    task: i18next.t("quests:TAUROS_DARK_WAVE_QUEST.task")
});
export const dittoSpecialWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("DITTO_SPECIAL_WIN_QUEST", {
    name: i18next.t("quests:DITTO_SPECIAL_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        return scene.getParty().length === 3 &&
            scene.getParty().some(p => p.species.speciesId === Species.DITTO);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_SPECIAL_WIN_QUEST
    },
    task: i18next.t("quests:DITTO_SPECIAL_WIN_QUEST.task")
});
export const marowakZombieKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MAROWAK_ZOMBIE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:MAROWAK_ZOMBIE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.MAROWAK &&
        [Moves.OMINOUS_WIND, Moves.RAGE_FIST, Moves.GRUDGE, Moves.HEX, Moves.LAST_RESPECTS].includes(move.id),
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.MAROWAK,
        questId: QuestUnlockables.MAROWAK_ZOMBIE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:MAROWAK_ZOMBIE_KNOCKOUT_QUEST.task")
});
export const greninjaYokaiWaveModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("GRENINJA_YOKAI_WAVE_QUEST", {
    name: i18next.t("quests:GRENINJA_YOKAI_WAVE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const greninja = scene.getParty().find(p => p.species.speciesId === Species.GRENINJA);
        return greninja &&
            !greninja.moveset.some(m => m.getMove().type === Type.WATER) &&
            greninja.moveset.some(m => m.getMove().type === Type.GHOST) &&
            greninja.moveset.some(m => m.getMove().type === Type.DARK);
    },
    goalCount: 50,
    startWave: 300,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.GRENINJA,
        questId: QuestUnlockables.GRENINJA_YOKAI_WAVE_QUEST
    },
    task: i18next.t("quests:GRENINJA_YOKAI_WAVE_QUEST.task")
});
export const rayquazaSpecialWinModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("RAYQUAZA_SPECIAL_WIN_QUEST", {
    name: i18next.t("quests:RAYQUAZA_SPECIAL_WIN_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        const rayquaza = party.find(p => p.species.speciesId === Species.RAYQUAZA);
        return party.length <= 2 && rayquaza &&
            !rayquaza.moveset.some(m => m.getMove().type === Type.FLYING || m.getMove().type === Type.DRAGON);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.RAYQUAZA,
        questId: QuestUnlockables.RAYQUAZA_SPECIAL_WIN_QUEST
    },
    task: i18next.t("quests:RAYQUAZA_SPECIAL_WIN_QUEST.task")
});

export const lickitungGiggleKnockoutModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("LICKITUNG_GIGGLE_KNOCKOUT_QUEST", {
    name: i18next.t("quests:LICKITUNG_GIGGLE_KNOCKOUT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.LICKITUNG && move.id === Moves.LICK,
    goalCount: 300,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.LICKITUNG,
        questId: QuestUnlockables.LICKITUNG_GIGGLE_KNOCKOUT_QUEST
    },
    task: i18next.t("quests:LICKITUNG_GIGGLE_KNOCKOUT_QUEST.task")
});
export const lickitungHyperWaveModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("LICKITUNG_HYPER_WAVE_QUEST", {
    name: i18next.t("quests:LICKITUNG_HYPER_WAVE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const lickitung = scene.getParty().find(p => p.species.speciesId === Species.LICKITUNG);
        return lickitung &&
            !lickitung.moveset.some(m => m.getMove().type === Type.NORMAL) &&
            lickitung.moveset.some(m => m.getMove().type === Type.POISON) &&
            lickitung.moveset.some(m => m.getMove().type === Type.DARK);
    },
    goalCount: 50,
    startWave: 300,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.LICKITUNG,
        questId: QuestUnlockables.LICKITUNG_HYPER_WAVE_QUEST
    },
    task: i18next.t("quests:LICKITUNG_HYPER_WAVE_QUEST.task")
});
export const mukRedDefeatModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MUK_RED_DEFEAT_QUEST", {
    name: i18next.t("quests:MUK_RED_DEFEAT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MUK &&
        (attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.RED),
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.MUK,
        questId: QuestUnlockables.MUK_RED_DEFEAT_QUEST
    },
    resetOnFail: true,
    task: i18next.t("quests:MUK_RED_DEFEAT_QUEST.task")
});
export const charmanderNightmareWinModifier = questModifierTypes.PERMA_WIN_QUEST("CHARMANDER_NIGHTMARE_WIN_QUEST", {
    name: i18next.t("quests:CHARMANDER_NIGHTMARE_WIN_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) => {
        const charmander = scene.getParty().find(p => p.species.speciesId === Species.CHARMANDER);
        return charmander && charmander.species.formKey == SpeciesFormKey.GLITCH;
    },
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.CHARMANDER,
        questId: QuestUnlockables.CHARMANDER_NIGHTMARE_WIN_QUEST
    },
    task: i18next.t("quests:CHARMANDER_NIGHTMARE_WIN_QUEST.task")
});
export const gastlyNightmareWaveModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("GASTLY_NIGHTMARE_WAVE_QUEST", {
    name: i18next.t("quests:GASTLY_NIGHTMARE_WAVE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        const gastly = party.find(p => p.species.speciesId === Species.GASTLY);
        return party.length <= 3 && gastly;
    },
    goalCount: 50,
    startWave: 300,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.GASTLY,
        questId: QuestUnlockables.GASTLY_NIGHTMARE_WAVE_QUEST
    },
    task: i18next.t("quests:GASTLY_NIGHTMARE_WAVE_QUEST.task")
});
export const pikachuPlusUltraModifier = questModifierTypes.PERMA_WIN_QUEST("PIKACHU_PLUS_ULTRA_QUEST", {
    name: i18next.t("quests:PIKACHU_PLUS_ULTRA_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) => {
        return scene.getParty().some(p => p.species.speciesId === Species.PIKACHU);
    },
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.PIKACHU,
        questId: QuestUnlockables.PIKACHU_PLUS_ULTRA_QUEST
    },
    task: i18next.t("quests:PIKACHU_PLUS_ULTRA_QUEST.task")
});
export const charizardHellflameModifier = questModifierTypes.PERMA_MOVE_QUEST("CHARIZARD_HELLFLAME_QUEST", {
    name: i18next.t("quests:CHARIZARD_HELLFLAME_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.CHARIZARD &&
        move.id === Moves.BLAST_BURN,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.CHARIZARD,
        questId: QuestUnlockables.CHARIZARD_HELLFLAME_QUEST
    },
    task: i18next.t("quests:CHARIZARD_HELLFLAME_QUEST.task")
});
export const eeveeNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EEVEE_NIGHTMARE_QUEST", {
    name: i18next.t("quests:EEVEE_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.EEVEE &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BLUE &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.EEVEE,
        questId: QuestUnlockables.EEVEE_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:EEVEE_NIGHTMARE_QUEST.task")
});
export const snorlaxNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SNORLAX_NIGHTMARE_QUEST", {
    name: i18next.t("quests:SNORLAX_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SNORLAX &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.RED &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.SNORLAX,
        questId: QuestUnlockables.SNORLAX_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:SNORLAX_NIGHTMARE_QUEST.task")
});
export const mewtwoNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MEWTWO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:MEWTWO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MEWTWO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.GIOVANNI &&
        [400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.MEWTWO,
        questId: QuestUnlockables.MEWTWO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:MEWTWO_NIGHTMARE_QUEST.task")
});
export const tyranitarNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("TYRANITAR_NIGHTMARE_QUEST", {
    name: i18next.t("quests:TYRANITAR_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.TYRANITAR &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.MAXIE &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.TYRANITAR,
        questId: QuestUnlockables.TYRANITAR_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:TYRANITAR_NIGHTMARE_QUEST.task")
});
export const octilleryNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("OCTILLERY_NIGHTMARE_QUEST", {
    name: i18next.t("quests:OCTILLERY_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.OCTILLERY &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.WALLACE &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.OCTILLERY,
        questId: QuestUnlockables.OCTILLERY_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:OCTILLERY_NIGHTMARE_QUEST.task")
});
export const regirockNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("REGIROCK_NIGHTMARE_QUEST", {
    name: i18next.t("quests:REGIROCK_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.REGIROCK &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.STEVEN &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.REGIROCK,
        questId: QuestUnlockables.REGIROCK_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:REGIROCK_NIGHTMARE_QUEST.task")
});
export const eeveeGhostModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EEVEE_GHOST_QUEST", {
    name: i18next.t("quests:EEVEE_GHOST_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.EEVEE &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BLUE &&
        move.type === Type.GHOST,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.EEVEE,
        questId: QuestUnlockables.EEVEE_GHOST_QUEST
    },
    task: i18next.t("quests:EEVEE_GHOST_QUEST.task")
});
export const eeveeSteelModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EEVEE_STEEL_QUEST", {
    name: i18next.t("quests:EEVEE_STEEL_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.EEVEE &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BLUE &&
        move.type === Type.STEEL,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_B,
        rewardId: Species.EEVEE,
        questId: QuestUnlockables.EEVEE_STEEL_QUEST
    },
    task: i18next.t("quests:EEVEE_STEEL_QUEST.task")
});
export const eeveeGroundModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EEVEE_GROUND_QUEST", {
    name: i18next.t("quests:EEVEE_GROUND_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        attacker.species.speciesId === Species.EEVEE &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BLUE &&
        move.type === Type.GROUND,
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_C,
        rewardId: Species.EEVEE,
        questId: QuestUnlockables.EEVEE_GROUND_QUEST
    },
    task: i18next.t("quests:EEVEE_GROUND_QUEST.task")
});
export const pikachuMagicalModifier = questModifierTypes.PERMA_WIN_QUEST("MAGICAL_PIKACHU_QUEST", {
    name: i18next.t("quests:MAGICAL_PIKACHU_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) => {
        const pikachu = scene.getParty().find(p => p.species.speciesId === Species.PIKACHU);
        return pikachu &&
            pikachu.moveset.filter(m => m.getMove().type === Type.FAIRY).length >= 2;
    },
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_C,
        rewardId: Species.PIKACHU,
        questId: QuestUnlockables.MAGICAL_PIKACHU_QUEST
    },
    task: i18next.t("quests:MAGICAL_PIKACHU_QUEST.task")
});
export const charmanderUndertaleModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("CHARMANDER_UNDERTALE_QUEST", {
    name: i18next.t("quests:CHARMANDER_UNDERTALE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        return party.length <= 3 && party.some(p => p.species.speciesId === Species.CHARMANDER);
    },
    goalCount: 50,
    startWave: 50,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.CHARMANDER,
        questId: QuestUnlockables.CHARMANDER_UNDERTALE_QUEST
    },
    task: i18next.t("quests:CHARMANDER_UNDERTALE_QUEST.task")
});
export const squirtleTormentModifier = questModifierTypes.PERMA_FAINT_QUEST("SQUIRTLE_TORMENT_QUEST", {
    name: i18next.t("quests:SQUIRTLE_TORMENT_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (pokemon: Pokemon) => {
        const party = pokemon.scene.getParty();
        return pokemon.species.speciesId === Species.BLASTOISE &&
            party.some(p => p.species.speciesId === Species.SQUIRTLE);
    },
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.SQUIRTLE,
        questId: QuestUnlockables.SQUIRTLE_TORMENT_QUEST
    },
    task: i18next.t("quests:SQUIRTLE_TORMENT_QUEST.task")
});
export const bulbasaurTerrorModifier = questModifierTypes.PERMA_WAVE_CHECK_QUEST("BULBASAUR_TERROR_QUEST", {
    name: i18next.t("quests:BULBASAUR_TERROR_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        return party.length === 2 && party.some(p => p.species.speciesId === Species.BULBASAUR);
    },
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.BULBASAUR,
        questId: QuestUnlockables.BULBASAUR_TERROR_QUEST
    },
    task: i18next.t("quests:BULBASAUR_TERROR_QUEST.task")
});
export const shiftryTenguModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("SHIFTRY_TENGU_QUEST", {
    name: i18next.t("quests:SHIFTRY_TENGU_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) => {
        const party = scene.getParty();
        return party.length === 1 && party[0].species.speciesId === Species.SHIFTRY;
    },
    goalCount: 30,
    startWave: 30,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.SHIFTRY,
        questId: QuestUnlockables.SHIFTRY_TENGU_QUEST
    },
    task: i18next.t("quests:SHIFTRY_TENGU_QUEST.task")
});
export const hypnoNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("HYPNO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:HYPNO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.HYPNO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.SABRINA &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.HYPNO,
        questId: QuestUnlockables.HYPNO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:HYPNO_NIGHTMARE_QUEST.task")
});
export const mamoswineNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MAMOSWINE_NIGHTMARE_QUEST", {
    name: i18next.t("quests:MAMOSWINE_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) => {
        const wave = attacker.scene.currentBattle.waveIndex;
        return attacker.species.speciesId === Species.MAMOSWINE &&
            attacker.scene.currentBattle.trainer?.isDynamicRival &&
            ((wave >= 50 && wave <= 100) ||
                (wave >= 150 && wave <= 200) ||
                (wave >= 250 && wave <= 300) ||
                (wave >= 350 && wave <= 400) ||
                (wave >= 450 && wave <= 500));
    },
    goalCount: 50,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.MAMOSWINE,
        questId: QuestUnlockables.MAMOSWINE_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:MAMOSWINE_NIGHTMARE_QUEST.task")
});
export const starterCatchQuestModifier = questModifierTypes.PERMA_CATCH_QUEST("STARTER_CATCH_QUEST", {
    name: i18next.t("quests:STARTER_CATCH_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) => true,
    goalCount: 15,
    questUnlockData: {
        rewardType: RewardType.GAME_MODE,
        rewardId: GameModes.CLASSIC,
        questId: QuestUnlockables.STARTER_CATCH_QUEST,
        questSpriteId: Species.CATERPIE,
        rewardText: i18next.t("quests:STARTER_CATCH_QUEST.rewardText"), // Updated
    },
    task: i18next.t("quests:STARTER_CATCH_QUEST.task")
});
export const nuzlightUnlockQuestModifier = questModifierTypes.PERMA_WIN_QUEST("NUZLIGHT_UNLOCK_QUEST", {
    name: i18next.t("quests:NUZLIGHT_UNLOCK_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) => true,
    goalCount: 3,
    questUnlockData: {
        rewardType: RewardType.GAME_MODE,
        rewardId: GameModes.NUZLIGHT,
        questId: QuestUnlockables.NUZLIGHT_UNLOCK_QUEST,
        questSpriteId: Species.NUZLEAF,
        rewardText: i18next.t("quests:NUZLIGHT_UNLOCK_QUEST.rewardText"), // Updated
    },
    task: i18next.t("quests:NUZLIGHT_UNLOCK_QUEST.task")
});
export const nuzlockeUnlockQuestModifier = questModifierTypes.PERMA_WIN_QUEST("NUZLOCKE_UNLOCK_QUEST", {
    name: i18next.t("quests:NUZLOCKE_UNLOCK_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (scene: BattleScene) => scene.gameMode.isNuzlight,
    goalCount: 5,
    questUnlockData: {
        rewardType: RewardType.GAME_MODE,
        rewardId: GameModes.NUZLOCKE,
        questId: QuestUnlockables.NUZLOCKE_UNLOCK_QUEST,
        questSpriteId: Species.SHIFTRY,
        rewardText: i18next.t("quests:NUZLOCKE_UNLOCK_QUEST.rewardText"), // Updated
    },
    task: i18next.t("quests:NUZLOCKE_UNLOCK_QUEST.task")
});
export const morpekoNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MORPEKO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:MORPEKO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MORPEKO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.LUSAMINE &&
        [100, 200, 300].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.MORPEKO,
        questId: QuestUnlockables.MORPEKO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:MORPEKO_NIGHTMARE_QUEST.task")
});
export const clefableGengarModifier = questModifierTypes.PERMA_COUNTDOWN_WAVE_CHECK_QUEST("CLEFABLE_GENGAR_QUEST", {
    name: i18next.t("quests:CLEFABLE_GENGAR_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene, waveIndex: number) => {
        const party = scene.getParty();
        if (party.length !== 2) return false;
        const gengar = party.find(p => p.species.speciesId === Species.GENGAR);
        const clefable = party.find(p => p.species.speciesId === Species.CLEFABLE);
        return gengar && clefable &&
            gengar.moveset.some(m => m.getMove().type === Type.FAIRY) &&
            clefable.moveset.some(m => m.getMove().type === Type.GHOST);
    },
    startWave: 40,
    goalCount: 40,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: [Species.GENGAR, Species.CLEFABLE],
        questId: QuestUnlockables.CLEFABLE_GENGAR_QUEST
    },
    task: i18next.t("quests:CLEFABLE_GENGAR_QUEST.task")
});
export const revaroomExtraModifier = questModifierTypes.PERMA_WIN_QUEST("REVAROOM_EXTRA_QUEST", {
    name: i18next.t("quests:REVAROOM_EXTRA_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.SINGLE_RUN,
    condition: (scene: BattleScene) => {
        const party = scene.getParty();
        return party.length === 4 &&
            party.some(p => p.species.speciesId === Species.REVAVROOM) &&
            party.some(p => p.species.speciesId === Species.VAROOM) &&
            party.some(p => p.species.speciesId === Species.KLINK) &&
            party.some(p => p.species.speciesId === Species.KLANG);
    },
    goalCount: 1,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.REVAVROOM,
        questId: QuestUnlockables.REVAROOM_EXTRA_QUEST
    },
    task: i18next.t("quests:REVAROOM_EXTRA_QUEST.task")
});
export const golemFireModifier = questModifierTypes.PERMA_HIT_QUEST("GOLEM_FIRE_QUEST", {
    name: i18next.t("quests:GOLEM_FIRE_QUEST.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon, move: Move) =>
        defender.species.speciesId === Species.GOLEM && move.type === Type.FIRE,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.GOLEM,
        questId: QuestUnlockables.GOLEM_FIRE_QUEST
    },
    task: i18next.t("quests:GOLEM_FIRE_QUEST.task")
});
export const deinoNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("DEINO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:DEINO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.DEINO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.GHETSIS &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.DEINO,
        questId: QuestUnlockables.DEINO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:DEINO_NIGHTMARE_QUEST.task")
});
export const golurkDreadModifier = questModifierTypes.PERMA_FAINT_QUEST("GOLURK_DREAD_QUEST", {
    name: i18next.t("quests:GOLURK_DREAD_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (pokemon: Pokemon) => {
        return pokemon.scene.getParty().some(p => p.species.speciesId === Species.GOLURK) &&
            pokemon.species.speciesId !== Species.GOLURK;
    },
    goalCount: 100,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.GOLURK,
        questId: QuestUnlockables.GOLURK_DREAD_QUEST
    },
    task: i18next.t("quests:GOLURK_DREAD_QUEST.task")
});
export const dusclopsNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("DUSCLOPS_NIGHTMARE_QUEST", {
    name: i18next.t("quests:DUSCLOPS_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.DUSCLOPS &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.ALLISTER &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.DUSCLOPS,
        questId: QuestUnlockables.DUSCLOPS_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:DUSCLOPS_NIGHTMARE_QUEST.task")
});
export const hariyamaNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("HARIYAMA_NIGHTMARE_QUEST", {
    name: i18next.t("quests:HARIYAMA_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.HARIYAMA &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.LYSANDRE &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.HARIYAMA,
        questId: QuestUnlockables.HARIYAMA_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:HARIYAMA_NIGHTMARE_QUEST.task")
});
export const sharpedoNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SHARPEDO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:SHARPEDO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SHARPEDO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.ARCHIE &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.SHARPEDO,
        questId: QuestUnlockables.SHARPEDO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:SHARPEDO_NIGHTMARE_QUEST.task")
});
export const farigirafNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("FARIGIRAF_NIGHTMARE_QUEST", {
    name: i18next.t("quests:FARIGIRAF_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.FARIGIRAF &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.CYRUS &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.FARIGIRAF,
        questId: QuestUnlockables.FARIGIRAF_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:FARIGIRAF_NIGHTMARE_QUEST.task")
});
export const kingdraNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("KINGDRA_NIGHTMARE_QUEST", {
    name: i18next.t("quests:KINGDRA_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.KINGDRA &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.MISTY &&
        [100, 200, 300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 2,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.KINGDRA,
        questId: QuestUnlockables.KINGDRA_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:KINGDRA_NIGHTMARE_QUEST.task")
});
export const excadrillNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("EXCADRILL_NIGHTMARE_QUEST", {
    name: i18next.t("quests:EXCADRILL_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.EXCADRILL &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BROCK &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.EXCADRILL,
        questId: QuestUnlockables.EXCADRILL_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:EXCADRILL_NIGHTMARE_QUEST.task")
});
export const lanturnNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("LANTURN_NIGHTMARE_QUEST", {
    name: i18next.t("quests:LANTURN_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.LANTURN &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.BROCK &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_A,
        rewardId: Species.LANTURN,
        questId: QuestUnlockables.LANTURN_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:LANTURN_NIGHTMARE_QUEST.task")
});
export const pikachuRoboNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("PIKACHU_ROBO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:PIKACHU_ROBO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.PIKACHU &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.LT_SURGE &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.GLITCH_FORM_B,
        rewardId: Species.PIKACHU,
        questId: QuestUnlockables.PIKACHU_ROBO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:PIKACHU_ROBO_NIGHTMARE_QUEST.task")
});

export const dodrioNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("DODRIO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:DODRIO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.DODRIO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.LARRY &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.DODRIO,
        questId: QuestUnlockables.DODRIO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:DODRIO_NIGHTMARE_QUEST.task")
});

export const sunfloraNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SUNFLORA_NIGHTMARE_QUEST", {
    name: i18next.t("quests:SUNFLORA_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SUNFLORA &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.ROSE &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.SUNFLORA,
        questId: QuestUnlockables.SUNFLORA_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:SUNFLORA_NIGHTMARE_QUEST.task")
});

export const lucarioNightmareModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("LUCARIO_NIGHTMARE_QUEST", {
    name: i18next.t("quests:LUCARIO_NIGHTMARE_QUEST.name"),
    runType: RunType.NIGHTMARE,
    duration: RunDuration.SINGLE_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.LUCARIO &&
        attacker.scene.currentBattle.trainer?.config.trainerType === TrainerType.CYNTHIA &&
        [300, 400, 500].includes(attacker.scene.currentBattle.waveIndex),
    goalCount: 3,
    resetOnFail: true,
    questUnlockData: {
        rewardType: RewardType.SMITTY_FORM,
        rewardId: Species.LUCARIO,
        questId: QuestUnlockables.LUCARIO_NIGHTMARE_QUEST
    },
    task: i18next.t("quests:LUCARIO_NIGHTMARE_QUEST.task")
});

export const normalEffectivenessModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("NORMAL_EFFECTIVENESS_QUEST", {
    name: i18next.t("quests:NORMAL_STRENGTH.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.isOfType(Type.NORMAL),
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.UNLOCKABLE,
        rewardId: QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST,
        questId: QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST,
        questSpriteId: Species.BIDOOF,
        rewardText: i18next.t("quests:NORMAL_STRENGTH.rewardText"), 
    },
    task: i18next.t("quests:NORMAL_STRENGTH.task")
});
export const magikarpNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("MAGIKARP_NEW_MOVES_QUEST", {
    name: i18next.t("quests:MAGIKARP_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.MAGIKARP,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.MAGIKARP,
        questId: QuestUnlockables.MAGIKARP_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:MAGIKARP_NEW_MOVES.rewardText"), 
    },
    task: i18next.t("quests:MAGIKARP_NEW_MOVES.task")
});
export const dittoNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("DITTO_NEW_MOVES_QUEST", {
    name: i18next.t("quests:DITTO_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.DITTO,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.DITTO,
        questId: QuestUnlockables.DITTO_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:DITTO_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:DITTO_NEW_MOVES.task")
});
export const wobbuffetNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("WOBBUFFET_NEW_MOVES_QUEST", {
    name: i18next.t("quests:WOBBUFFET_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.WOBBUFFET,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.WOBBUFFET,
        questId: QuestUnlockables.WOBBUFFET_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:WOBBUFFET_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:WOBBUFFET_NEW_MOVES.task")
});
export const smeargleNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("SMEARGLE_NEW_MOVES_QUEST", {
    name: i18next.t("quests:SMEARGLE_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.SMEARGLE,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.SMEARGLE,
        questId: QuestUnlockables.SMEARGLE_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:SMEARGLE_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:SMEARGLE_NEW_MOVES.task")
});
// Additional Pokemon with limited movesets
export const unownNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("UNOWN_NEW_MOVES_QUEST", {
    name: i18next.t("quests:UNOWN_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.UNOWN,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.UNOWN,
        questId: QuestUnlockables.UNOWN_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:UNOWN_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:UNOWN_NEW_MOVES.task")
});
export const tyrogueNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("TYROGUE_NEW_MOVES_QUEST", {
    name: i18next.t("quests:TYROGUE_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.TYROGUE,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.TYROGUE,
        questId: QuestUnlockables.TYROGUE_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:TYROGUE_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:TYROGUE_NEW_MOVES.task")
});
export const metapodNewMovesModifier = questModifierTypes.PERMA_KNOCKOUT_QUEST("METAPOD_NEW_MOVES_QUEST", {
    name: i18next.t("quests:METAPOD_NEW_MOVES.name"),
    runType: RunType.ANY,
    duration: RunDuration.MULTI_RUN,
    condition: (attacker: Pokemon, defender: Pokemon) =>
        attacker.species.speciesId === Species.METAPOD,
    goalCount: 500,
    questUnlockData: {
        rewardType: RewardType.NEW_MOVES_FOR_SPECIES,
        rewardId: Species.METAPOD,
        questId: QuestUnlockables.METAPOD_NEW_MOVES_QUEST,
        rewardText: i18next.t("quests:METAPOD_NEW_MOVES.rewardText"),
    },
    task: i18next.t("quests:METAPOD_NEW_MOVES.task")
});

export const QUEST_CONSOLE_CODES: Partial<Record<string, keyof typeof modifierTypes>> = {
    "R7N9X4": modifierTypes.TAUROS_ELECTRIC_HIT_QUEST,
    "H2W5B9": modifierTypes.KECLEON_COLOR_CHANGE_QUEST,
    "P4M8V6": modifierTypes.GLISCOR_DARK_MOVE_KNOCKOUT_QUEST,
    "K3Y7L1": modifierTypes.MAROWAK_CUBONE_FAINT_QUEST,
    "T6C2Q8": modifierTypes.NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST,
    "W9F5D3": modifierTypes.FERALIGATR_DRAGON_DEFEAT_QUEST,
    "J1B4H7": modifierTypes.CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST,
    "L8M2X5": modifierTypes.VENUSAUR_PSYCHIC_MOVE_USE_QUEST,
    "G4K7P9": modifierTypes.BLASTOISE_FAIRY_DEFEAT_QUEST,
    "Y6T1W3": modifierTypes.NIDOKING_DEFEAT_QUEST,
    "N8C4V2": modifierTypes.GENGAR_SPECIAL_WAVE_QUEST,
    "Q5H3B7": modifierTypes.WEEZING_FIRE_MOVE_KNOCKOUT_QUEST,
    "Z2M6L9": modifierTypes.HITMONLEE_NORMAL_WAVE_QUEST,
    "F7X1K4": modifierTypes.HITMONCHAN_STAT_INCREASE_QUEST,
    "D3W8P5": modifierTypes.HITMON_DUO_WIN_QUEST,
    "B9T2H6": modifierTypes.KANGASKHAN_GHOST_MOVE_QUEST,
    "M4L7Y1": modifierTypes.SCYTHER_TRIO_WIN_QUEST,
    "V6Q8N3": modifierTypes.GRENINJA_TRIO_WIN_QUEST,
    "C1R5X7": modifierTypes.SIMISAGE_TRIO_WIN_QUEST,
    "H8K2W4": modifierTypes.ELEMENTAL_MONKEY_WIN_QUEST,
    "T5B9F6": modifierTypes.ELECTIVIREMAGMORTAR_WIN_QUEST,
    "L3G7M1": modifierTypes.GYARADOS_GROUND_SWITCH_QUEST,
    "P8Y2V4": modifierTypes.LAPRAS_FIRE_MOVE_QUEST,
    "W1D5H9": modifierTypes.PORYGON_Z_ANALYTIC_USE_QUEST,
    "Q7K3X6": modifierTypes.DRAGONITE_LANCE_DEFEAT_QUEST,
    "B4T8L2": modifierTypes.SUDOWOODO_WOOD_HAMMER_QUEST,
    "N6C1R5": modifierTypes.AMBIPOM_GIGA_IMPACT_QUEST,
    "F2H7W9": modifierTypes.MILTANK_STEEL_MOVE_KNOCKOUT_QUEST,
    "M5Y3V8": modifierTypes.SLAKING_RIVAL_DEFEAT_QUEST,
    "K1P4G6": modifierTypes.SOLROCK_LUNATONE_WIN_QUEST,
    "X8B2T7": modifierTypes.REGIGIGAS_REGI_DEFEAT_QUEST,
    "D6L9N3": modifierTypes.PIKACHU_RED_BLUE_WIN_QUEST,
    "R4W1H5": modifierTypes.SNORLAX_GRASS_KNOCKOUT_QUEST,
    "G8M2K7": modifierTypes.CLOYSTER_PRESENT_QUEST,
    "V3X6P9": modifierTypes.NUZLEAF_NOSEPASS_DEFEAT_QUEST,
    "Q1F5B4": modifierTypes.CHANDELURE_REST_QUEST,
    "T7C2L8": modifierTypes.SMEARGLE_DEFEAT_QUEST,
    "H4W9M3": modifierTypes.MIMIKYU_CHARIZARD_KNOCKOUT_QUEST,
    "Y6K1R5": modifierTypes.MIMIKYU_GRENINJA_KNOCKOUT_QUEST,
    "B8V2G7": modifierTypes.MIMIKYU_RAICHU_KNOCKOUT_QUEST,
    "N4X7P1": modifierTypes.MIMIKYU_MEWTWO_KNOCKOUT_QUEST,
    "L6T3F9": modifierTypes.MIMIKYU_REGIROCK_KNOCKOUT_QUEST,
    "W2H8Q5": modifierTypes.EISCUE_ROCK_KNOCKOUT_QUEST,
    "M1B4K7": modifierTypes.ZANGOOSE_SEVIPER_KNOCKOUT_QUEST,
    "C9R5X2": modifierTypes.SEVIPER_ZANGOOSE_KNOCKOUT_QUEST,
    "G3V7L4": modifierTypes.TRUBBISH_POISON_DEFEAT_QUEST,
    "P8D1W6": modifierTypes.HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST,
    "T2N5H9": modifierTypes.DITTO_DRAGONITE_TRANSFORM_QUEST,
    "K7F3B6": modifierTypes.DITTO_CHARIZARD_TRANSFORM_QUEST,
    "X4M8L1": modifierTypes.DITTO_PIKACHU_TRANSFORM_QUEST,
    "Q6Y2R7": modifierTypes.DITTO_MACHAMP_TRANSFORM_QUEST,
    "W9C4V5": modifierTypes.DITTO_MEWTWO_TRANSFORM_QUEST,
    "H1G8P3": modifierTypes.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST,
    "B5T2K7": modifierTypes.WOBBUFFET_RIVAL_DEFEAT_QUEST,
    "L4X7N9": modifierTypes.MAGIKARP_DEFEAT_QUEST,
    "R6M1W3": modifierTypes.KLINKLANG_GEAR_MOVE_QUEST,
    "F8Q2H5": modifierTypes.SPINDA_CONFUSION_RECOVERY_QUEST,
    "V3C7P4": modifierTypes.NINETALES_STORED_POWER_KNOCKOUT_QUEST,
    "Y9B1L6": modifierTypes.MUK_RED_DEFEAT_QUEST,
    "T5G8K2": modifierTypes.SHUCKLE_DEFEAT_QUEST,
    "W4X7M3": modifierTypes.TANGELA_RIVAL_DEFEAT_QUEST,
    "D6H1R9": modifierTypes.LICKITUNG_GIGGLE_KNOCKOUT_QUEST,
    "N2F5V8": modifierTypes.MAGICAL_PIKACHU_QUEST,
    "Q7L3B4": modifierTypes.CHARMANDER_UNDERTALE_QUEST,
    "K9P6W1": modifierTypes.MEOWTH_JESTER_QUEST,
    "C4T8X5": modifierTypes.SHIFTRY_TENGU_QUEST,
    "M2G7H3": modifierTypes.CLAYDOL_POISON_QUEST,
    "B8N4L6": modifierTypes.REVAROOM_EXTRA_QUEST,
    "W3K7P2": modifierTypes.NORMAL_EFFECTIVENESS_QUEST,
    "X9M4H8": modifierTypes.MAGIKARP_NEW_MOVES_QUEST,
    "L5R2N6": modifierTypes.DITTO_NEW_MOVES_QUEST,
    "B7T9F4": modifierTypes.WOBBUFFET_NEW_MOVES_QUEST,
    "Q6V8C3": modifierTypes.SMEARGLE_NEW_MOVES_QUEST,
    "J2Y5K7": modifierTypes.UNOWN_NEW_MOVES_QUEST,
    "H4D9P5": modifierTypes.TYROGUE_NEW_MOVES_QUEST,
    "Z8W3M6": modifierTypes.METAPOD_NEW_MOVES_QUEST,
    "F1X5Q8": modifierTypes.TAUROS_DARK_WAVE_QUEST,
    "H9C3M7": modifierTypes.DITTO_SPECIAL_WIN_QUEST,
    "T2B6L4": modifierTypes.MAROWAK_ZOMBIE_KNOCKOUT_QUEST,
    "V7R1W5": modifierTypes.GRENINJA_YOKAI_WAVE_QUEST,
    "K4G8P3": modifierTypes.RAYQUAZA_SPECIAL_WIN_QUEST,
    "Y6N2X9": modifierTypes.LICKITUNG_HYPER_WAVE_QUEST,
    "D5H1M8": modifierTypes.CHARMANDER_NIGHTMARE_WIN_QUEST,
    "Q3F7B4": modifierTypes.GASTLY_NIGHTMARE_WAVE_QUEST,
    "L9T2V6": modifierTypes.PIKACHU_PLUS_ULTRA_QUEST,
    "W1C5K7": modifierTypes.CHARIZARD_HELLFLAME_QUEST,
    "R8X4H2": modifierTypes.EEVEE_NIGHTMARE_QUEST,
    "M6P3G9": modifierTypes.SNORLAX_NIGHTMARE_QUEST,
    "B2Y7L4": modifierTypes.MEWTWO_NIGHTMARE_QUEST,
    "N5W1Q8": modifierTypes.TYRANITAR_NIGHTMARE_QUEST,
    "F3T6K7": modifierTypes.OCTILLERY_NIGHTMARE_QUEST,
    "V9H4M2": modifierTypes.REGIROCK_NIGHTMARE_QUEST,
    "C1X5R8": modifierTypes.EEVEE_GHOST_QUEST,
    "G7B3L6": modifierTypes.EEVEE_STEEL_QUEST,
    "P4W8N1": modifierTypes.EEVEE_GROUND_QUEST,
    "K2Y6H5": modifierTypes.SQUIRTLE_TORMENT_QUEST,
    "T9M4V7": modifierTypes.BULBASAUR_TERROR_QUEST,
    "Q1F5X3": modifierTypes.HYPNO_NIGHTMARE_QUEST,
    "L8C2B6": modifierTypes.MAMOSWINE_NIGHTMARE_QUEST,
    "W7R4G9": modifierTypes.MORPEKO_NIGHTMARE_QUEST,
    "H3P1K5": modifierTypes.CLEFABLE_GENGAR_QUEST,
    "Y8T2M4": modifierTypes.GOLEM_FIRE_QUEST,
    "D6X9V1": modifierTypes.DEINO_NIGHTMARE_QUEST,
    "N3B7L5": modifierTypes.GOLURK_DREAD_QUEST,
    "F2W4Q8": modifierTypes.DUSCLOPS_NIGHTMARE_QUEST,
    "K6H1R7": modifierTypes.HARIYAMA_NIGHTMARE_QUEST,
    "M9C3X5": modifierTypes.SHARPEDO_NIGHTMARE_QUEST,
    "T4G8P2": modifierTypes.FARIGIRAF_NIGHTMARE_QUEST,
    "B1Y5L7": modifierTypes.KINGDRA_NIGHTMARE_QUEST,
    "V6W3N4": modifierTypes.EXCADRILL_NIGHTMARE_QUEST,
    "J4R7N2": modifierTypes.PIKACHU_ROBO_NIGHTMARE_QUEST,
    "E9T1X6": modifierTypes.LUCARIO_NIGHTMARE_QUEST,
    "A5K8P3": modifierTypes.SUNFLORA_NIGHTMARE_QUEST,
    "G2W4H7": modifierTypes.DODRIO_NIGHTMARE_QUEST,
    "C7F9B1": modifierTypes.LANTURN_NIGHTMARE_QUEST
};

interface RivalQuestConfig {
    id: string;
    name: string;
    rivalType: RivalTrainerType;
    runType?: RunType;
    duration?: RunDuration;
    questId: QuestUnlockables;
    consoleCode: string;
}

interface StageConfig {
    stageNum: number;
    rewardType: RewardType;
    rewardId: keyof typeof modifierTypes;
}

type RivalRewardConfig = {
    rewardType: RewardType;
    rewardId: keyof typeof modifierTypes;
};

function getRivalStageReward(stageNum: number): RivalRewardConfig {
    const rand = Utils.randSeedInt(100);

   
    const stageProbs = {
        1: {
            money: 90,       
            modifier: 8,
            both: 2,
            moneyWeights: {
                small: 70,   
                medium: 30   
            }
        },
        2: {
            money: 75,       
            modifier: 15,
            both: 10,
            moneyWeights: {
                small: 30,
                medium: 50,
                large: 20
            }
        },
        3: {
            money: 60,       
            modifier: 25,
            both: 15,
            moneyWeights: {
                medium: 40,
                large: 40,
                giant: 20
            }
        },
        4: {
            money: 40,       
            modifier: 40,
            both: 20,
            moneyWeights: {
                large: 35,
                giant: 45,
                legend: 20
            }
        },
        5: {
            money: 25,       
            modifier: 45,
            both: 30,
            moneyWeights: {
                giant: 40,
                legend: 60
            }
        }
    };

    const stageConfig = stageProbs[stageNum as keyof typeof stageProbs];

   
    let rewardType: RewardType;
    if (rand < stageConfig.money) {
        rewardType = RewardType.PERMA_MONEY;
    } else if (rand < stageConfig.money + stageConfig.modifier) {
        rewardType = RewardType.PERMA_MODIFIER;
    } else {
        rewardType = RewardType.PERMA_MONEY_AND_MODIFIER;
    }

    
    let rewardId: keyof typeof modifierTypes;
    if (rewardType === RewardType.PERMA_MODIFIER || rewardType === RewardType.PERMA_MONEY_AND_MODIFIER) {
        rewardId = 'PERMA_NEW_ROUND_TERA';
    } else {
        
        const moneyRand = Utils.randSeedInt(100);
        const weights = stageConfig.moneyWeights;

        if (moneyRand < (weights.small || 0)) {
            rewardId = 'PERMA_MONEY_1';
        } else if (moneyRand < (weights.small || 0) + (weights.medium || 0)) {
            rewardId = 'PERMA_MONEY_2';
        } else if (moneyRand < (weights.small || 0) + (weights.medium || 0) + (weights.large || 0)) {
            rewardId = 'PERMA_MONEY_3';
        } else if (moneyRand < (weights.small || 0) + (weights.medium || 0) + (weights.large || 0) + (weights.giant || 0)) {
            rewardId = 'PERMA_MONEY_4';
        } else {
            rewardId = 'PERMA_MONEY_5';
        }
    }

    return {
        rewardType,
        rewardId
    };
}

export function createRivalStageQuest(config: RivalQuestConfig) {
    const {
        id,
        name,
        rivalType,
        runType = RunType.ANY,
        duration = RunDuration.SINGLE_RUN,
        questId,
        consoleCode
    } = config;

    
    const stageConfigs: {
        stageNum: number;
        cachedReward: RivalRewardConfig | null;
        getReward: () => RivalRewardConfig;
    }[] = Array.from({length: 5}, (_, i) => ({
        stageNum: i + 1,
        cachedReward: null,
        getReward() {
            if (!this.cachedReward) {
                this.cachedReward = getRivalStageReward(this.stageNum);
            }
            return this.cachedReward;
        }
    }));

    return questModifierTypes.PERMA_RIVAL_QUEST(id, {
        name,
        runType,
        duration,
        condition: () => true,
        goalCount: 1,
        questUnlockData: {
            get rewardType() {
                return stageConfigs[0].getReward().rewardType;
            },
            get rewardId() {
                return stageConfigs[0].getReward().rewardId;
            },
            questId: questId,
            questSpriteId: rivalType
        },
        stages: stageConfigs.map(stageConfig => ({
            runType,
            duration,
            condition: (scene: BattleScene) =>
                scene.currentBattle.trainer?.isDynamicRival &&
                scene.currentBattle.trainer?.dynamicRivalType === rivalType &&
                scene.currentBattle.trainer?.rivalStage >= stageConfig.stageNum,
            goalCount: 1,
            questUnlockData: {
                get rewardType() {
                    return stageConfig.getReward().rewardType;
                },
                get rewardId() {
                    return stageConfig.getReward().rewardId;
                },
                questId,
                questSpriteId: rivalType
            }
        })),
        consoleCode
    });
}


export const RIVAL_CONSOLE_CODES: Record<RivalTrainerType, string> = {
    [TrainerType.BLUE]: "X7K9P2",
    [TrainerType.LANCE]: "M4N8V5",
    [TrainerType.CYNTHIA]: "H2W6R9",
    [TrainerType.GIOVANNI]: "L5T3B8",
    [TrainerType.RED]: "Q9C4Y7",
    [TrainerType.BROCK]: "J6D1Z5",
    [TrainerType.STEVEN]: "K8F3X2",
    [TrainerType.CYRUS]: "W4H7M9",
    [TrainerType.LT_SURGE]: "P5N2V6",
    [TrainerType.HAU]: "T3B8L4",
    [TrainerType.LARRY]: "R7Y1K5",
    [TrainerType.WALLACE]: "G9M4W2",
    [TrainerType.ALDER]: "D6X8H3",
    [TrainerType.MISTY]: "C2P7T5",
    [TrainerType.BLAINE]: "V4L9N6",
    [TrainerType.ARCHIE]: "B8K2M7",
    [TrainerType.MAXIE]: "Y5W3R4",
    [TrainerType.GHETSIS]: "F1H6T9",
    [TrainerType.LYSANDRE]: "Z7N4X2",
    [TrainerType.ROSE]: "Q3V8P5",
    [TrainerType.GUZMA]: "M6L1W7",
    [TrainerType.LUSAMINE]: "K9R4H2",
    [TrainerType.NEMONA]: "T5B7Y3",
    [TrainerType.NORMAN]: "W4P1L5",
    [TrainerType.ALLISTER]: "H7M3V9",
    [TrainerType.IRIS]: "D2K8T4",
    [TrainerType.ROXIE]: "F6Y5N1",
    [TrainerType.SABRINA]: "R9W2X7"
} as const;

export const rivalQuestModifiers = Object.entries(RIVAL_CONSOLE_CODES).reduce((acc, [enumValue, consoleCode]) => {
    
    const trainerType = TrainerType[Number(enumValue)];
    const questId = QuestUnlockables[`${trainerType}_BOUNTY_QUEST` as keyof typeof QuestUnlockables];
    const trainerName = trainerType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    acc[consoleCode] = createRivalStageQuest({
        id: `${trainerType}_BOUNTY_QUEST`,
        name: `${trainerName}'s Challenge`,
        rivalType: Number(enumValue) as RivalTrainerType,
        questId,
        consoleCode
    });

    return acc;
}, {} as Record<string, ReturnType<typeof createRivalStageQuest>>);

export const SMITTY_CONSOLE_CODES: Record<string, string> = {
    'tartauros': 'XK94P2',
    'zamowak': 'QR7M3N',
    'greyokai': 'HJ5W8L',
    'jormunza': 'BV2T9C',
    'licthulhu': 'YN6K4D',
    'plasmist': 'ZF8R1M',
    'plustra': 'WP3H7G',
    'hellchar': 'KL9X5B',
    'feareon': 'DM4Q6T',
    'omninom': 'JC7V2N',
    'necromew': 'RH5B8K',
    'diablotar': 'TF1L9W',
    'smitom': 'GX6M3P',
    'zoomer': 'NQ2Y7D',
    'voidash': 'VK8C4H',
    'wahcky': 'LZ5T1R',
    'wahzebub': 'MB9W6F',
    'fineferno': 'PH3G2X',
    'sorbred': 'YQ7K5N',
    'corpanzee': 'WC4L8T',
    'plankling': 'DR1V6M',
    'timbrick': 'JX9B3H',
    'plankult': 'KF5P7G',
    'sorbobo': 'TN2W4R',
    'hamtaro': 'ZQ8M1C',
    'elmold': 'BH6Y3V',
    'funghomp': 'GL9T5K',
    'riddicus': 'XP4D7N',
    'boxecutive': 'MC2R8W',
    'patnius': 'VF6B1H',
    'tentacrim': 'YK3L9T',
    'undeadtunasmit': 'QW7G4M',
    'genomander': 'ZN5X2P',
    'tormentle': 'RH8C6B',
    'terrorbulb': 'JM1V3K',
    'scarablanc': 'WT4Y7D',
    'batmare': 'PL9Q5F',
    'dankitar': 'BX2H8N',
    'cephaloom': 'KC6T1R',
    'smitward': 'GV3M7W',
    'gastmoji': 'YF5B4P',
    'niteknite': 'DQ8L2X',
    'dignitier': 'ZR1C9H',
    'smitshade': 'NK7G3T',
    'smitspect': 'WM4V6B',
    'smitwraith': 'PX2Y8F',
    'smiternal': 'HL5Q1D',
    'smittyfish': 'TK9R7N',
    'smittellect': 'BC3W4M',
    'gallux': 'VF6P2X',
    'hostmitty': 'JQ8H5G',
    'smittynarie': 'YL1T7K',
    'batboxbaba': 'RN4B9C',
    'batboxbeyond': 'WX2M6D',
    'victainer': 'ZP5V3F',
    'noxabis': 'GK7Y1H',
    'floravora': 'QC8L4T',
    'chimerdrio': 'BW2R9N',
    'kakopier': 'MF6G3X',
    'karasu-me': 'VH1P7B',
    'bullktopus': 'YQ4T2K',
    'gumugumu': 'DN8C5W',
    'santoryu': 'ZL3M6R',
    'roostace': 'KX7B1F',
    'bogace': 'PV5H9G',
    'milliant': 'TW2Y4N',
    'terroragon': 'RC6Q8D',
    'godread': 'JF1L3M',
    'duschmare': 'GX9T7K',
    'abyssuma': 'NH4W2P',
    'clefangar': 'BK6V5R',
    'omnitto': 'YM8C1H',
    'umbraffe': 'WQ3G9F',
    'tartadra': 'ZP7B4X',
    'churry': 'DL2T6N',
    'gazorpsmitfield': 'VR5M8K',
    'hologrick': 'KC1H3W',
    'seekling': 'PX9Y7G',
    'picklisk': 'TF4Q2B',
    'bravehound': 'MN6L5D',
    'tengale': 'HW8R1V',
    'hyplagus': 'BQ3C7P',
    'demonoth': 'YK5G4X',
    'despeko': 'ZT2M9F',
    'missingno': 'RV7H1N'
} as const;

interface SmittyQuestConfig {
    id: string;
    name: string;
    formName: string;
    runType?: RunType;
    duration?: RunDuration;
    isUniversal: boolean;
    questId: QuestUnlockables;
    consoleCode: string;
}

type MoneyModifierType =
  | 'PERMA_MONEY_1'
  | 'PERMA_MONEY_2'
  | 'PERMA_MONEY_3'
  | 'PERMA_MONEY_4'
  | 'PERMA_MONEY_5';

export function getRandomRewardType(hasSpecies: boolean): {
    rewardType: RewardType,
    rewardId: keyof typeof modifierTypes
} {
    const rand = Utils.randSeedInt(100);

    if (hasSpecies) {
        if (rand < 70) { 
            const moneyTier = Utils.randSeedInt(100);
            let rewardId: MoneyModifierType;

            if (moneyTier < 40) rewardId = 'PERMA_MONEY_1';
            else if (moneyTier < 70) rewardId = 'PERMA_MONEY_2';
            else if (moneyTier < 85) rewardId = 'PERMA_MONEY_3';
            else if (moneyTier < 95) rewardId = 'PERMA_MONEY_4';
            else rewardId = 'PERMA_MONEY_5';

            return {
                rewardType: RewardType.PERMA_MONEY,
                rewardId
            };
        } else if (rand < 90) { 
            return {
                rewardType: RewardType.PERMA_MODIFIER,
                rewardId: 'PERMA_NEW_ROUND_TERA'
            };
        } else { 
            return {
                rewardType: RewardType.PERMA_MONEY_AND_MODIFIER,
                rewardId: 'PERMA_NEW_ROUND_TERA'
            };
        }
    } else {
        if (rand < 40) { 
            const moneyTier = Utils.randSeedInt(100);
            let rewardId: MoneyModifierType;

            if (moneyTier < 20) rewardId = 'PERMA_MONEY_1';
            else if (moneyTier < 50) rewardId = 'PERMA_MONEY_2';
            else if (moneyTier < 75) rewardId = 'PERMA_MONEY_3';
            else if (moneyTier < 90) rewardId = 'PERMA_MONEY_4';
            else rewardId = 'PERMA_MONEY_5';

            return {
                rewardType: RewardType.PERMA_MONEY,
                rewardId
            };
        } else if (rand < 80) { 
            return {
                rewardType: RewardType.PERMA_MODIFIER,
                rewardId: 'PERMA_NEW_ROUND_TERA'
            };
        } else { 
            return {
                rewardType: RewardType.PERMA_MONEY_AND_MODIFIER,
                rewardId: 'PERMA_NEW_ROUND_TERA'
            };
        }
    }
}

export function createCachedRewardHandler(easierRewardForSpecies: boolean, questId: string) {
    let cachedReward: {
        rewardType: RewardType,
        rewardId: keyof typeof modifierTypes
    } | null = null;

    const getReward = () => {
        if (!cachedReward) {
            cachedReward = getRandomRewardType(easierRewardForSpecies);
        }
        return cachedReward;
    };

    return {
        get rewardType() {
            return getReward().rewardType;
        },
        get rewardId() {
            return getReward().rewardId;
        },
        questId
    };
}

function createSmittyFormQuest(config: SmittyQuestConfig) {
    const {
        id,
        name,
        formName,
        isUniversal,
        runType = RunType.ANY,
        duration = RunDuration.MULTI_RUN,
        questId,
        consoleCode
    } = config;

    
    let cachedReward: {
        rewardType: RewardType,
        rewardId: keyof typeof modifierTypes
    } | null = null;

    return questModifierTypes.PERMA_FORM_CHANGE_QUEST(id, {
        name,
        runType,
        duration,
        condition: (pokemon: Pokemon) => {
            const currentForm = pokemon.getSpeciesForm();
            return currentForm.getFormKey() === SpeciesFormKey.SMITTY &&
                   currentForm.formName === formName;
        },
        goalCount: 1,
        questUnlockData: createCachedRewardHandler(!isUniversal, questId),
        consoleCode
    });
}


export const smittyFormQuestModifiers = Object.entries(SMITTY_CONSOLE_CODES).reduce((acc, [formName, consoleCode]) => {
    const isUniversal = universalSmittyForms.some(form => form.formName === formName);
    const questId = QuestUnlockables[`${formName.toUpperCase()}_SMITTY_QUEST`];

    const displayName = formName
        .split(/(?=[A-Z])/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    acc[consoleCode] = createSmittyFormQuest({
        id: `${formName.toUpperCase()}_SMITTY_QUEST`,
        name: `${displayName} Smitty Form`,
        formName,
        isUniversal,
        questId,
        consoleCode
    });

    return acc;
}, {} as Record<string, ReturnType<typeof createSmittyFormQuest>>);

export function generateModifierStats(gameData: GameData): { [key: string]: any } {
  const modifierStats: { [key: string]: any } = {};
  
  if (!gameData.gameStats.modifiersObtained) {
    return modifierStats;
  }

  for (const [localeKey, count] of Object.entries(gameData.gameStats.modifiersObtained)) {
    if (count > 0) {
      const displayName = i18next.exists(`${localeKey}.statLabel`) ? i18next.t(`${localeKey}.statLabel`) : 
                         (i18next.exists(`${localeKey}.name`) ? i18next.t(`${localeKey}.name`) : localeKey);
      
      modifierStats[localeKey] = {
        sourceFunc: (gameData: GameData) => gameData.gameStats.modifiersObtained[localeKey]?.toString() || "0",
        labelFunc: () => displayName
      };
    }
  }
  
  return modifierStats;
}

const modifierTypeCache = new Map<string, ModifierType | null>();

export function getModifierTypeByLocaleKey(localeKey: string): ModifierType | null {
  if (!modifierTypeCache.has(localeKey)) {
    let foundType: ModifierType | null = null;
    for (const modifierTypeFunc of Object.values(modifierTypes)) {
      const modifierType = modifierTypeFunc();
      
    if (modifierType.localeKey === localeKey) {
        foundType = modifierType;
        break;
      }
    }
    modifierTypeCache.set(localeKey, foundType);
  }
  return modifierTypeCache.get(localeKey) || null;
}

export function getCachedModifierType(localeKey: string): ModifierType | null {
  return getModifierTypeByLocaleKey(localeKey);
}

