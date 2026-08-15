import { BattleType } from "../battle";
import BattleScene from "../battle-scene";
import { Gender } from "../data/gender";
import { Nature } from "../data/nature";
import { PokeballType } from "../data/pokeball";
import {getPokemonSpecies, PokemonForm, UniversalSmittyForm, universalSmittyForms} from "../data/pokemon-species";
import { Status } from "../data/status-effect";
import Pokemon, { EnemyPokemon, PokemonMove, PokemonSummonData } from "../field/pokemon";
import { TrainerSlot } from "../data/trainer-config";
import { Variant } from "#app/data/variant";
import { loadBattlerTag } from "../data/battler-tags";
import { Biome } from "#enums/biome";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { PokemonAltBuildId } from "#app/data/pokemon-alt-buid.ts";
import { Abilities } from "#enums/abilities";

export default class PokemonData {
  public id: integer;
  public player: boolean;
  public species: Species;
  public nickname: string;
  public formIndex: integer;
  public formKey?: string;
  public abilityIndex: integer;
  public passive: boolean;
  public shiny: boolean;
  public variant: Variant;
  public pokeball: PokeballType;
  public typeBallType?: number;
  public level: integer;
  public exp: integer;
  public levelExp: integer;
  public gender: Gender;
  public hp: integer;
  public stats: integer[];
  public ivs: integer[];
  public nature: Nature;
  public natureOverride: Nature | -1;
  public moveset: (PokemonMove | null)[];
  public status: Status | null;
  public friendship: integer;
  public metLevel: integer;
  public metBiome: Biome | -1;
  public metSpecies: Species;
  public luck: integer;
  public pauseEvolutions: boolean;
  public pokerus: boolean;

  public fusionSpecies: Species;
  public fusionFormIndex: integer;
  public fusionAbilityIndex: integer;
  public fusionShiny: boolean;
  public fusionVariant: Variant;
  public fusionGender: Gender;
  public fusionLuck: integer;
  public universalSmittyForm?: UniversalSmittyForm;
  public altBuildId?: PokemonAltBuildId;
  public altBuildRank?: number;
  public altPassiveForRun?: Abilities;
  public isSignature?: boolean;
  public rankUpHistorySpeciesIds: Species[];
  public rankUpCount: number;
  public embracePaletteRank?: number;
  public reshapeSourceSpeciesId?: Species;
  public randomRankUpBandUsed: number | null;
  public randomRankUpBandPending: number | null;
  public yuMoveRangeUsed: number | null;
  public yuMoveRangePending: number | null;
  public duelmonBandThresholds: number[];
  public duelmonBandsConsumed: number;
  public duelmonLastTriggerLevel: number;
  public rankUpBaseStats?: integer[];

  public boss: boolean;
  public bossSegments?: integer;
  public bossSegmentIndex: integer;

  public summonData: PokemonSummonData;

  constructor(source: Pokemon | any, forHistory: boolean = false) {
    const sourcePokemon = source instanceof Pokemon ? source : null;
    this.id = source.id;
    this.player = sourcePokemon ? sourcePokemon.isPlayer() : source.player;
    this.species = sourcePokemon ? sourcePokemon.species.speciesId : source.species;
    this.nickname = sourcePokemon ? sourcePokemon.nickname : source.nickname;
    this.formIndex = source.formIndex;
    this.formKey = sourcePokemon ? sourcePokemon.getFormKey() : source.formKey;
    if (typeof this.formKey !== "string" || this.formKey.length === 0) {
      this.formKey = undefined;
    }
    this.abilityIndex = source.abilityIndex;
    this.passive = source.passive;
    this.shiny = source.shiny;
    this.variant = source.variant;
    this.pokeball = source.pokeball;
    this.typeBallType = source.typeBallType;
    this.level = source.level;
    this.exp = source.exp;
    if (!forHistory) {
      this.levelExp = source.levelExp;
    }
    this.gender = source.gender;
    if (!forHistory) {
      this.hp = source.hp;
    }
    this.stats = source.stats;
    this.ivs = source.ivs;
    this.nature = source.nature !== undefined ? source.nature : 0 as Nature;
    this.natureOverride = source.natureOverride !== undefined ? source.natureOverride : -1;
    this.friendship = source.friendship !== undefined ? source.friendship : getPokemonSpecies(this.species).baseFriendship;
    this.metLevel = source.metLevel || 5;
    this.metBiome = source.metBiome !== undefined ? source.metBiome : -1;
    this.metSpecies = source.metSpecies;
    this.luck = source.luck !== undefined ? source.luck : (source.shiny ? (source.variant + 1) : 0);
    if (!forHistory) {
      this.pauseEvolutions = !!source.pauseEvolutions;
    }
    this.pokerus = !!source.pokerus;

    this.fusionSpecies = sourcePokemon ? sourcePokemon.fusionSpecies?.speciesId : source.fusionSpecies;
    this.fusionFormIndex = source.fusionFormIndex;
    this.fusionAbilityIndex = source.fusionAbilityIndex;
    this.fusionShiny = source.fusionShiny;
    this.fusionVariant = source.fusionVariant;
    this.fusionGender = source.fusionGender;
    this.fusionLuck = source.fusionLuck !== undefined ? source.fusionLuck : (source.fusionShiny ? source.fusionVariant + 1 : 0);

    this.universalSmittyForm = source.universalSmittyForm;
    this.altBuildId = source.altBuildId;
    this.altBuildRank = source.altBuildRank;
    this.altPassiveForRun = source.altPassiveForRun;
    this.isSignature = sourcePokemon ? sourcePokemon.isSignature : source.isSignature;

    const dsRankUpHistory = sourcePokemon ? (sourcePokemon as any).rankUpHistorySpeciesIds : source.rankUpHistorySpeciesIds;
    if (Array.isArray(dsRankUpHistory)) {
      const normalized = dsRankUpHistory.filter((v: unknown) => typeof v === "number") as Species[];
      this.rankUpHistorySpeciesIds = Array.from(new Set(normalized));
    } else {
      this.rankUpHistorySpeciesIds = [];
    }
    if (!this.rankUpHistorySpeciesIds.length) {
      this.rankUpHistorySpeciesIds = [this.species];
    } else if (!this.rankUpHistorySpeciesIds.includes(this.species)) {
      this.rankUpHistorySpeciesIds.push(this.species);
    }

    const dsRankUpCount = sourcePokemon ? (sourcePokemon as any).rankUpCount : source.rankUpCount;
    this.rankUpCount = typeof dsRankUpCount === "number" && dsRankUpCount >= 0 ? Math.floor(dsRankUpCount) : Math.max(0, this.rankUpHistorySpeciesIds.length - 1);

    const dsEmbracePaletteRank = sourcePokemon ? (sourcePokemon as any).embracePaletteRank : source.embracePaletteRank;
    this.embracePaletteRank = typeof dsEmbracePaletteRank === "number" && dsEmbracePaletteRank > 0 ? dsEmbracePaletteRank : undefined;

    const dsReshapeSourceSpeciesId = sourcePokemon ? (sourcePokemon as any).reshapeSourceSpeciesId : source.reshapeSourceSpeciesId;
    this.reshapeSourceSpeciesId = typeof dsReshapeSourceSpeciesId === "number" && dsReshapeSourceSpeciesId > 0 ? dsReshapeSourceSpeciesId : undefined;

    const dsRandomRankUpBandUsed = sourcePokemon ? (sourcePokemon as any).randomRankUpBandUsed : source.randomRankUpBandUsed;
    this.randomRankUpBandUsed = typeof dsRandomRankUpBandUsed === "number" ? dsRandomRankUpBandUsed : null;
    const dsRandomRankUpBandPending = sourcePokemon ? (sourcePokemon as any).randomRankUpBandPending : source.randomRankUpBandPending;
    this.randomRankUpBandPending = typeof dsRandomRankUpBandPending === "number" ? dsRandomRankUpBandPending : null;
    const dsYuMoveRangeUsed = sourcePokemon ? (sourcePokemon as any).yuMoveRangeUsed : source.yuMoveRangeUsed;
    this.yuMoveRangeUsed = typeof dsYuMoveRangeUsed === "number" ? dsYuMoveRangeUsed : null;
    const dsYuMoveRangePending = sourcePokemon ? (sourcePokemon as any).yuMoveRangePending : source.yuMoveRangePending;
    this.yuMoveRangePending = typeof dsYuMoveRangePending === "number" ? dsYuMoveRangePending : null;

    const dsDuelmonBandThresholds = sourcePokemon
      ? (sourcePokemon as any).duelmonBandThresholds
      : source.duelmonBandThresholds;
    if (Array.isArray(dsDuelmonBandThresholds)) {
      this.duelmonBandThresholds = dsDuelmonBandThresholds.filter(
        (v: unknown) => typeof v === "number"
      );
    } else {
      this.duelmonBandThresholds = [];
    }

    const dsDuelmonBandsConsumed = sourcePokemon
      ? (sourcePokemon as any).duelmonBandsConsumed
      : source.duelmonBandsConsumed;
    if (typeof dsDuelmonBandsConsumed === "number" && dsDuelmonBandsConsumed >= 0) {
      this.duelmonBandsConsumed = Math.floor(dsDuelmonBandsConsumed);
    } else {
      this.duelmonBandsConsumed = 0;
    }

    const dsDuelmonLastTriggerLevel = sourcePokemon
      ? (sourcePokemon as any).duelmonLastTriggerLevel
      : source.duelmonLastTriggerLevel;
    if (typeof dsDuelmonLastTriggerLevel === "number" && dsDuelmonLastTriggerLevel >= 0) {
      this.duelmonLastTriggerLevel = Math.floor(dsDuelmonLastTriggerLevel);
    } else {
      this.duelmonLastTriggerLevel = 0;
    }

    if (sourcePokemon?.species?.unique) {
      this.rankUpBaseStats = sourcePokemon.getSpeciesForm().baseStats.slice();
    } else if (Array.isArray(source.rankUpBaseStats) && source.rankUpBaseStats.length === 6) {
      this.rankUpBaseStats = source.rankUpBaseStats.slice();
    } else {
      this.rankUpBaseStats = undefined;
    }

    if (!forHistory) {
      this.boss = (source instanceof EnemyPokemon && !!source.bossSegments) || (!this.player && !!source.boss);
      this.bossSegments = source.bossSegments;
      this.bossSegmentIndex = (source as any).bossSegmentIndex ?? (this.bossSegments ? this.bossSegments - 1 : 0);
    }

    if (sourcePokemon) {
      this.moveset = sourcePokemon.moveset;
      if (!forHistory) {
        this.status = sourcePokemon.status;
        this.summonData = sourcePokemon.summonData;
      }
    } else {
      this.moveset = (source.moveset || [ new PokemonMove(Moves.TACKLE), new PokemonMove(Moves.GROWL) ]).filter(m => m).map((m: any) => new PokemonMove(m.moveId, m.ppUsed, m.ppUp));
      if (!forHistory) {
        this.status = source.status
          ? new Status(source.status.effect, source.status.turnCount, source.status.cureTurn)
          : null;
      }

      this.summonData = new PokemonSummonData();
      if (!forHistory && source.summonData) {
        this.summonData.battleStats = source.summonData.battleStats;
        this.summonData.moveQueue = source.summonData.moveQueue;
        this.summonData.disabledMove = source.summonData.disabledMove;
        this.summonData.disabledTurns = source.summonData.disabledTurns;
        this.summonData.abilitySuppressed = source.summonData.abilitySuppressed;
        this.summonData.abilitySuppressTurns = source.summonData.abilitySuppressTurns;
        this.summonData.abilitiesApplied = source.summonData.abilitiesApplied;

        this.summonData.ability = source.summonData.ability;
        this.summonData.moveset = source.summonData.moveset?.map(m => PokemonMove.loadMove(m));
        this.summonData.types = source.summonData.types;

        if (source.summonData.tags) {
          this.summonData.tags = source.summonData.tags?.map(t => loadBattlerTag(t));
        } else {
          this.summonData.tags = [];
        }
      }
    }
  }

  toPokemon(scene: BattleScene, battleType?: BattleType, partyMemberIndex: integer = 0, double: boolean = false): Pokemon {
    const species = getPokemonSpecies(this.species);
    const forms = species.forms && species.forms.length > 0 ? species.forms : null;
    let resolvedFormIndex = this.formIndex;
    if (this.formKey && forms) {
      const idx = forms.findIndex(f => f.formKey === this.formKey);
      if (idx >= 0) {
        resolvedFormIndex = idx;
      }
    } else if (!this.formKey && forms && resolvedFormIndex >= 0 && resolvedFormIndex < forms.length) {
      const currentKey = forms[resolvedFormIndex]?.formKey || "";
      const isMega = typeof currentKey === "string" && currentKey.toLowerCase().includes("mega");
      if (isMega) {
        const glitchIdx = forms.findIndex(f => typeof f.formKey === "string" && f.formKey.includes("glitch"));
        resolvedFormIndex = glitchIdx >= 0 ? glitchIdx : 0;
      }
    }
    if (forms && (resolvedFormIndex < 0 || resolvedFormIndex >= forms.length || !forms[resolvedFormIndex])) {
      resolvedFormIndex = 0;
    }
    this.formIndex = resolvedFormIndex;
    const ret: Pokemon = this.player
      ? scene.addPlayerPokemon(species, this.level, this.abilityIndex, this.formIndex, this.gender, this.shiny, this.variant, this.ivs, this.nature, this, (playerPokemon) => {
        if (this.nickname) {
          playerPokemon.nickname = this.nickname;
        }
      })
      : scene.addEnemyPokemon(species, this.level, battleType === BattleType.TRAINER ? !double || !(partyMemberIndex % 2) ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER : TrainerSlot.NONE, this.boss, this);
    if (this.rankUpBaseStats?.length === 6) {
      const uniqueSpecies = ret.makeSpeciesUnique();
      const currentForm = uniqueSpecies.forms && uniqueSpecies.forms.length > ret.formIndex
        ? uniqueSpecies.forms[ret.formIndex]
        : uniqueSpecies;
      currentForm.baseStats = [...this.rankUpBaseStats];
      currentForm.baseTotal = this.rankUpBaseStats.reduce((sum, s) => sum + s, 0);
    }

    if (this.summonData) {
      ret.primeSummonData(this.summonData);
    }
    return ret;
  }
}