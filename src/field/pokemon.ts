import Phaser from "phaser";
import BattleScene, { AnySound } from "../battle-scene";
import { POKEMON_ALT_BUILDS, PokemonAltBuildId } from "#app/data/pokemon-alt-buid.ts";
import { Variant, VariantSet, variantColorCache, variantData } from "#app/data/variant";
import BattleInfo, { PlayerBattleInfo, EnemyBattleInfo } from "../ui/battle-info";
import Move, {
  HighCritAttr,
  HitsTagAttr,
  applyMoveAttrs,
  FixedDamageAttr,
  VariableAtkAttr,
  allMoves,
  MoveCategory,
  TypelessAttr,
  CritOnlyAttr,
  getMoveTargets,
  OneHitKOAttr,
  VariableMoveTypeAttr,
  VariableDefAttr,
  AttackMove,
  ModifiedDamageAttr,
  VariableMoveTypeMultiplierAttr,
  IgnoreOpponentStatChangesAttr,
  SacrificialAttr,
  VariableMoveCategoryAttr,
  CounterDamageAttr,
  StatChangeAttr,
  RechargeAttr,
  ChargeAttr,
  IgnoreWeatherTypeDebuffAttr,
  BypassBurnDamageReductionAttr,
  SacrificialAttrOnHit,
  OneHitKOAccuracyAttr,
  RespectAttackTypeImmunityAttr,
  RecoilAttr,
  BeakBlastHeaderAttr,
  MultiHitAttr,
  HitHealAttr,
  FirstMoveCondition
} from "../data/move";
import {
  default as PokemonSpecies,
  PokemonSpeciesForm,
  getFusedSpeciesName,
  getPokemonSpecies,
  getPokemonSpeciesForm,
  getStarterValueFriendshipCap,
  speciesStarters,
  starterPassiveAbilities,
  isGlitchFormKey, UniversalSmittyForm,
  PokemonForm,
  allSpecies
} from "../data/pokemon-species";
import { SpeciesFormKey } from "#enums/species-form-key";
import { Constructor } from "#app/utils";
import * as Utils from "../utils";
import {
  Type,
  TypeDamageMultiplier,
  getTypeDamageMultiplier,
  getTypeRgb
} from "../data/type";
import { getLevelTotalExp } from "../data/exp";
import { Stat } from "../data/pokemon-stat";

import {
  DamageMoneyRewardModifier,
  EnemyDamageBoosterModifier,
  EnemyDamageReducerModifier,
  EnemyEndureChanceModifier,
  EnemyFusionChanceModifier,
  HiddenAbilityRateBoosterModifier,
  PokemonBaseStatModifier,
  PlayerPokemonBaseStatBoosterModifier,
  PokemonFriendshipBoosterModifier,
  PokemonHeldItemModifier,
  ChampionPokemonStatBoosterModifier,
  PokemonNatureWeightModifier,
  ShinyRateBoosterModifier,
  SurviveDamageModifier,
  TempBattleStatBoosterModifier,
  StatBoosterModifier,
  CritBoosterModifier,
  TerastallizeModifier,
  AttackTypeBoosterModifier,
  PokemonMultiHitModifier,
  StatSacrificeModifier,
  StatSwitcherModifier, PermaTagRemovalQuestModifier, AnyPassiveAbilityModifier
} from "../modifier/modifier";
import { PokeballType } from "../data/pokeball";
import { Gender } from "../data/gender";
import { initMoveAnim, loadMoveAnimAssets } from "../data/battle-anims";
import { Status, StatusEffect, getRandomStatus } from "../data/status-effect";
import {
  pokemonEvolutions,
  pokemonPrevolutions,
  SpeciesFormEvolution,
  SpeciesEvolutionCondition,
  FusionSpeciesFormEvolution
} from "../data/pokemon-evolutions";
import { reverseCompatibleTms, tmSpecies, tmPoolTiers } from "../data/tms";
import { BattleStat } from "../data/battle-stat";
import {
  BattlerTag,
  BattlerTagLapseType,
  EncoreTag,
  GroundedTag,
  HighestStatBoostTag,
  TypeImmuneTag,
  getBattlerTag,
  SemiInvulnerableTag,
  TypeBoostTag,
  ExposedTag
} from "../data/battler-tags";
import { WeatherType } from "../data/weather";
import { TempBattleStat } from "../data/temp-battle-stat";
import { ArenaTagSide, NoCritTag, WeakenMoveScreenTag } from "../data/arena-tag";
import {
  Ability,
  AbAttr,
  BattleStatMultiplierAbAttr,
  BlockCritAbAttr,
  BonusCritAbAttr,
  BypassBurnDamageReductionAbAttr,
  FieldPriorityMoveImmunityAbAttr,
  IgnoreOpponentStatChangesAbAttr,
  MoveImmunityAbAttr,
  PreDefendFullHpEndureAbAttr,
  ReceivedMoveDamageMultiplierAbAttr,
  ReduceStatusEffectDurationAbAttr,
  StabBoostAbAttr,
  StatusEffectImmunityAbAttr,
  TypeImmunityAbAttr,
  WeightMultiplierAbAttr,
  allAbilities,
  applyAbAttrs,
  applyBattleStatMultiplierAbAttrs,
  applyPreApplyBattlerTagAbAttrs,
  applyPreAttackAbAttrs,
  applyPreDefendAbAttrs,
  applyPreSetStatusAbAttrs,
  UnsuppressableAbilityAbAttr,
  SuppressFieldAbilitiesAbAttr,
  NoFusionAbilityAbAttr,
  MultCritAbAttr,
  IgnoreTypeImmunityAbAttr,
  DamageBoostAbAttr,
  IgnoreTypeStatusEffectImmunityAbAttr,
  ConditionalCritAbAttr,
  applyFieldBattleStatMultiplierAbAttrs,
  FieldMultiplyBattleStatAbAttr,
  AddSecondStrikeAbAttr,
  IgnoreOpponentEvasionAbAttr,
  UserFieldStatusEffectImmunityAbAttr,
  UserFieldBattlerTagImmunityAbAttr,
  BattlerTagImmunityAbAttr,
  MoveTypeChangeAbAttr,
  AbilityActivationResult,
  AllyMoveCategoryPowerBoostAbAttr,
  FieldMoveTypePowerBoostAbAttr,
  MoveFlagChangeAttr,
  NeutralizeIncomingSuperEffectiveAbAttr,
  OctoHitMinMaxAbAttr,
  PreApplyBattlerTagAbAttr,
  PreAttackBoostIfCollectedTypeMatchAbAttr,
  PreAttackChangeMoveCategoryAbAttr,
  PreDefendSurviveAbAttr,
  PreDefendSurviveAndDamageAbAttr,
  SturdySpeedDropAbAttr,
  VariableMovePowerAbAttr
} from "../data/ability";
import PokemonData from "../system/pokemon-data";
import { BattlerIndex, DynamicModes } from "../battle";
import { Mode } from "../ui/ui";
import PartyUiHandler, { PartyOption, PartyUiMode } from "../ui/party-ui-handler";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import { LevelMoves } from "../data/pokemon-level-moves";
import { DamageAchv, achvs } from "../system/achv";
import { DexAttr, StarterDataEntry, StarterMoveset } from "../system/game-data";
import { QuantizerCelebi, argbFromRgba, rgbaFromArgb } from "@material/material-color-utilities";
import { Nature, getNatureStatMultiplier } from "../data/nature";
import {
  SpeciesFormChange,
  SpeciesFormChangeActiveTrigger,
  SpeciesFormChangeMoveLearnedTrigger,
  SpeciesFormChangePostMoveTrigger,
  SpeciesFormChangeStatusEffectTrigger,
  checkAndAddUniversalSmittyForms
} from "../data/pokemon-forms";
import { TerrainType } from "../data/terrain";
import { glitchText, TrainerSlot } from "../data/trainer-config";
import Overrides from "#app/overrides";
import i18next from "i18next";
import { speciesEggMoves } from "../data/egg-moves";
import { ModifierTier } from "../modifier/modifier-tier";
import { applyChallenges, ChallengeType } from "#app/data/challenge.js";
import { Abilities } from "#enums/abilities";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattleSpec } from "#enums/battle-spec";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { Biome } from "#enums/biome";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { Challenges } from "#enums/challenges";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { DamagePhase } from "#app/phases/damage-phase.js";
import { FaintPhase } from "#app/phases/faint-phase.js";
import { LearnMovePhase } from "#app/phases/learn-move-phase.js";
import { MoveEffectPhase } from "#app/phases/move-effect-phase.js";
import { MoveEndPhase } from "#app/phases/move-end-phase.js";
import { ObtainStatusEffectPhase } from "#app/phases/obtain-status-effect-phase.js";
import { StatChangePhase } from "#app/phases/stat-change-phase.js";
import { SwitchSummonPhase } from "#app/phases/switch-summon-phase.js";
import { ToggleDoublePositionPhase } from "#app/phases/toggle-double-position-phase.js";
import {PermaType} from "#app/modifier/perma-modifiers";
import {ModifierType, AnyPassiveAbilityModifierTypeGenerator, modifierTypes} from "#app/modifier/modifier-type";
import { TrainerType } from "#enums/trainer-type";
import { BattleType } from "../battle";
import { Unlockables } from "#app/system/unlockables.ts";
import { isIPhone } from "#app/loading-scene.js";
import { MoveUpgradeModifier } from "#app/modifier/modifier";
import { Command } from "#app/ui/command-ui-handler.js";

const ZA_NEW_MEGA_SCALE_SPECIES_IDS: Set<Species> = new Set<Species>([
  Species.CLEFABLE,
  Species.VICTREEBEL,
  Species.STARMIE,
  Species.DRAGONITE,
  Species.MEGANIUM,
  Species.FERALIGATR,
  Species.SKARMORY,
  Species.FROSLASS,
  Species.EMBOAR,
  Species.EXCADRILL,
  Species.SCOLIPEDE,
  Species.SCRAFTY,
  Species.EELEKTROSS,
  Species.CHANDELURE,
  Species.CHESNAUGHT,
  Species.DELPHOX,
  Species.GRENINJA,
  Species.PYROAR,
  Species.FLOETTE,
  Species.MALAMAR,
  Species.BARBARACLE,
  Species.DRAGALGE,
  Species.HAWLUCHA,
  Species.ZYGARDE,
  Species.DRAMPA,
  Species.FALINKS
]);

export enum FieldPosition {
  CENTER,
  LEFT,
  RIGHT
}

export default abstract class Pokemon extends Phaser.GameObjects.Container {
  public id: integer;
  public name: string;
  public nickname: string;
  public species: PokemonSpecies;
  public formIndex: integer;
  public abilityIndex: integer;
  public passive: boolean;
  public shiny: boolean;
  public variant: Variant;
  public pokeball: PokeballType;
  public typeBallType?: Type;
  protected battleInfo: BattleInfo;
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
  public wildFlee: boolean;

  public fusionSpecies: PokemonSpecies | null;
  public fusionFormIndex: integer;
  public fusionAbilityIndex: integer;
  public fusionShiny: boolean;
  public fusionVariant: Variant;
  public fusionGender: Gender;
  public fusionLuck: integer;
  public altPassiveForRun: Abilities | null;

  public isSignature: boolean = false;

  public universalSmittyForm?: UniversalSmittyForm;
  public altBuildChange: boolean = false;
  public altBuildSpriteColors?: number[][];
  public altBuildTargetColors?: number[][];
  public altBuildBlendMode?: string;
  public altBuildInversionFactor?: number;
  public altBuildId?: PokemonAltBuildId;
  public altBuildRank?: number;

  private summonDataPrimer: PokemonSummonData | null;

  public summonData: PokemonSummonData;
  public battleData: PokemonBattleData;
  public battleSummonData: PokemonBattleSummonData;
  public turnData: PokemonTurnData;

  public fieldPosition: FieldPosition;

  public maskEnabled: boolean;
  public maskSprite: Phaser.GameObjects.Sprite | null;
  public partyAbility: Ability | null;

  private shinySparkle: Phaser.GameObjects.Sprite;
  public abilityActivations: AbilityActivationResult[] = [];

  constructor(scene: BattleScene, x: number, y: number, species: PokemonSpecies, level: integer, abilityIndex?: integer, formIndex?: integer, gender?: Gender, shiny?: boolean, variant?: Variant, ivs?: integer[], nature?: Nature, dataSource?: Pokemon | PokemonData) {
    super(scene, x, y);

    if (!species.isObtainable() && this.isPlayer()) {
      throw `Cannot create a player Pokemon for species '${species.getName(formIndex)}'`;
    }

    const hiddenAbilityChance = new Utils.IntegerHolder(256);
    if (!this.hasTrainer()) {
      this.scene.applyModifiers(HiddenAbilityRateBoosterModifier, true, hiddenAbilityChance);
    }

    const hasHiddenAbility = !Utils.randSeedInt(hiddenAbilityChance.value);
    const randAbilityIndex = Utils.randSeedInt(2);

    this.species = species;
    this.pokeball = dataSource?.pokeball || PokeballType.POKEBALL;
    this.typeBallType = dataSource?.typeBallType;
    this.level = level;
    this.wildFlee = false;
    if (abilityIndex !== undefined) {
      this.abilityIndex = abilityIndex;
    } else {

      if (species.abilityHidden && hasHiddenAbility) {

        this.abilityIndex = 2;
      } else {

        this.abilityIndex = species.ability2 !== species.ability1 ? randAbilityIndex : 0;
      }
    }
    if (formIndex !== undefined) {
      this.formIndex = formIndex;
    }
    if (gender !== undefined) {
      this.gender = gender;
    }
    if (shiny !== undefined) {
      this.shiny = shiny;
    }
    if (variant !== undefined) {
      this.variant = variant;
    }
    this.exp = dataSource?.exp || getLevelTotalExp(this.level, species.growthRate);
    this.levelExp = dataSource?.levelExp || 0;

    this.altPassiveForRun = null;
    if (dataSource) {
      this.id = dataSource.id;
      this.hp = dataSource.hp;
      this.stats = dataSource.stats;
      this.ivs = dataSource.ivs;
      this.passive = !!dataSource.passive;
      if (this.variant === undefined) {
        this.variant = 0;
      }
      this.nature = dataSource.nature || 0 as Nature;
      this.nickname = dataSource.nickname;
      this.natureOverride = dataSource.natureOverride !== undefined ? dataSource.natureOverride : -1;
      this.moveset = dataSource.moveset;
      this.status = dataSource.status!;
      this.friendship = dataSource.friendship !== undefined ? dataSource.friendship : this.species.baseFriendship;
      this.metLevel = dataSource.metLevel || 5;
      this.luck = dataSource.luck;
      this.metBiome = dataSource.metBiome;
      this.metSpecies = dataSource.metSpecies ?? (this.metBiome !== -1 ? this.species.speciesId : this.species.getRootSpeciesId(true));
      this.pauseEvolutions = dataSource.pauseEvolutions;
      this.pokerus = !!dataSource.pokerus;
      this.fusionSpecies = dataSource.fusionSpecies instanceof PokemonSpecies ? dataSource.fusionSpecies : dataSource.fusionSpecies ? getPokemonSpecies(dataSource.fusionSpecies) : null;
      this.fusionFormIndex = dataSource.fusionFormIndex;
      this.fusionAbilityIndex = dataSource.fusionAbilityIndex;
      this.fusionShiny = dataSource.fusionShiny;
      this.fusionVariant = dataSource.fusionVariant || 0;
      this.fusionGender = dataSource.fusionGender;
      this.fusionLuck = dataSource.fusionLuck;
      this.universalSmittyForm = dataSource.universalSmittyForm;
      this.altBuildId = dataSource.altBuildId;
      this.altBuildRank = dataSource.altBuildRank;
      this.altPassiveForRun = dataSource.altPassiveForRun ?? null;

      if (dataSource instanceof Pokemon) {
        if ((dataSource as any).altBuildSpriteColors) {
          this.altBuildSpriteColors = (dataSource as any).altBuildSpriteColors;
        }
        if ((dataSource as any).altBuildTargetColors) {
          this.altBuildTargetColors = (dataSource as any).altBuildTargetColors;
        }
        if ((dataSource as any).altBuildBlendMode) {
          this.altBuildBlendMode = (dataSource as any).altBuildBlendMode;
        }
        if ((dataSource as any).altBuildInversionFactor !== undefined) {
          this.altBuildInversionFactor = (dataSource as any).altBuildInversionFactor;
        }
      }

      if (this.universalSmittyForm !== undefined) {
            PokemonForm.addUniversalSmittyForm(this,  this.universalSmittyForm, true);
            if(dataSource instanceof PokemonData) {
               this.formIndex = dataSource.formIndex;
            }
      }
    } else {
      this.id = Utils.randSeedInt(4294967296);
      this.ivs = ivs || Utils.getIvsFromId(this.id);

      if (this.gender === undefined) {
        this.generateGender();
      }

      if (this.formIndex === undefined) {
        if(this.scene.currentBattle && this.scene.gameMode.isWavePreFinal(this.scene)) {
          this.formIndex = 0
        }
        else {
          this.formIndex = this.scene.getSpeciesFormIndex(species, this.gender, this.nature, this.isPlayer());
        }
      }

      if (this.shiny === undefined) {
        this.trySetShiny();
      }

      if (this.variant === undefined) {
        this.variant = this.shiny ? this.generateVariant() : 0;
      }

      if (nature !== undefined) {
        this.setNature(nature);
      } else {
        this.generateNature();
      }

      this.natureOverride = -1;

      this.friendship = species.baseFriendship;
      this.metLevel = level;
      this.metBiome = scene.currentBattle ? scene.arena.biomeType : -1;
      this.metSpecies = species.speciesId;
      this.pokerus = false;
      if (level > 1) {

        let chance = 14;
        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_FUSION_INCREASE_3)) {
          chance = 8;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_FUSION_INCREASE_2)) {
          chance = 10;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_FUSION_INCREASE_1)) {
          chance = 12;
        }

        const fused =  this.scene.currentBattle?.waveIndex % 10 === 0 &&
             this.scene.currentBattle?.waveIndex % 100 !== 0 &&
             this.scene.currentBattle?.battleType !== BattleType.TRAINER ? Utils.randSeedInt(8, 1) : Utils.randSeedInt(chance, 1);

        if (!this.isPlayer() && fused == 1) {
          this.scene.applyModifier(EnemyFusionChanceModifier, false, fused);
        }
        if (fused == 1 && this.scene.currentBattle?.waveIndex > 1)  {
          this.calculateStats();
          this.generateFusionSpecies();
            this.scene.gameData.reducePermaModifierByType([
                PermaType.PERMA_FUSION_INCREASE_1,
                PermaType.PERMA_FUSION_INCREASE_2,
                PermaType.PERMA_FUSION_INCREASE_3
            ], this.scene);
        }
      }

      this.luck = (this.shiny ? this.variant + 1 : 0) + (this.fusionShiny ? this.fusionVariant + 1 : 0);
      this.fusionLuck = this.luck;
    }
    this.generateName();

    if (!species.isObtainable()) {
      this.shiny = false;
    }

    if (!dataSource) {
    this.calculateStats();
  }
  }
  getNameToRender() {
    try {
      if (this.nickname) {
        return decodeURIComponent(escape(atob(this.nickname)));
      }
      return this.name;
    } catch (err) {
      console.error(`Failed to decode nickname for ${this.name}`, err);
      return this.name;
    }
  }

  init(): void {
    this.fieldPosition = FieldPosition.CENTER;

    this.initBattleInfo();

    this.scene.fieldUI.addAt(this.battleInfo, 0);

    let isPlayer = this.isPlayer();

    const getSprite = (hasShadow?: boolean) => {
      const ret = this.scene.addPokemonSprite(this, 0, 0, `pkmn__${isPlayer ? "back__" : ""}sub`, undefined, true);
      ret.setOrigin(0.5, 1);
      let trainer = this.scene.currentBattle?.trainer;
      const shouldHaveShadow = !!hasShadow && !this.isGlitchOrSmittyForm() && !this.isShadowlessMegaForm();
      const isCorrupted = (!isPlayer && trainer?.isCorrupted) || false;
      const baseColor = [0, 0, 0];
      const teraColor = !isPlayer && trainer?.config.trainerType !== TrainerType.SMITTY && (this.scene.gameMode.isNightmare || isCorrupted) ? Utils.randSeedItem([
          getTypeRgb(Type.POISON),
          getTypeRgb(Type.DARK),
          [240, 48, 48],
          [50, 50, 50]
      ]) : getTypeRgb(this.getTeraType());

      ret.setPipeline(this.scene.spritePipeline, {
          tone: [0.0, 0.0, 0.0, 0.0],
          hasShadow: shouldHaveShadow,
          teraColor,
          baseColor: isCorrupted ? baseColor : undefined
      });
      return ret;
    };

    this.updateScale();

    const sprite = getSprite(true);
    const tintSprite = getSprite();

    tintSprite.setVisible(false);

    this.addAt(sprite, 0);
    this.addAt(tintSprite, 1);

    if (this.altBuildSpriteColors && this.altBuildTargetColors) {
      sprite.pipelineData["altBuildSpriteColors"] = this.altBuildSpriteColors;
      sprite.pipelineData["altBuildTargetColors"] = this.altBuildTargetColors;
      sprite.pipelineData["altBuildBlendMode"] = this.altBuildBlendMode || 'replace';
      sprite.pipelineData["altBuildInversionFactor"] = this.altBuildInversionFactor || 0.0;

      tintSprite.pipelineData["altBuildSpriteColors"] = this.altBuildSpriteColors;
      tintSprite.pipelineData["altBuildTargetColors"] = this.altBuildTargetColors;
      tintSprite.pipelineData["altBuildBlendMode"] = this.altBuildBlendMode || 'replace';
      tintSprite.pipelineData["altBuildInversionFactor"] = this.altBuildInversionFactor || 0.0;
    }

    if (this.isShiny() && !this.shinySparkle) {
      this.initShinySparkle();
    }
  }

  abstract initBattleInfo(): void;

  isOnField(): boolean {
    if (!this.scene) {
      return false;
    }
    return this.scene.field.getIndex(this) > -1;
  }

  isFainted(checkStatus?: boolean): boolean {
    return !this.hp && (!checkStatus || this.status?.effect === StatusEffect.FAINT);
  }
  isAllowedInBattle(): boolean {
    const challengeAllowed = new Utils.BooleanHolder(true);
    applyChallenges(this.scene.gameMode, ChallengeType.POKEMON_IN_BATTLE, this, challengeAllowed);
    return !this.isFainted() && !this.wildFlee && challengeAllowed.value;
  }

  isActive(onField?: boolean): boolean {
    if (!this.scene) {
      return false;
    }
    return this.isAllowedInBattle() && !!this.scene && (!onField || this.isOnField());
  }

  getDexAttr(): bigint {
    let ret = 0n;
    ret |= this.gender !== Gender.FEMALE ? DexAttr.MALE : DexAttr.FEMALE;
    ret |= !this.shiny ? DexAttr.NON_SHINY : DexAttr.SHINY;
    ret |= this.variant >= 2 ? DexAttr.VARIANT_3 : this.variant === 1 ? DexAttr.VARIANT_2 : DexAttr.DEFAULT_VARIANT;
    ret |= this.scene.gameData.getFormAttr(this.formIndex);
    return ret;
  }
  generateName(): void {
    let isPlayer = this.isPlayer();
    let trainer = this.scene.currentBattle?.trainer;
    if (!this.fusionSpecies) {
      this.name = !isPlayer && trainer?.isCorrupted ? glitchText(this.species.getName(this.formIndex)) : this.species.getName(this.formIndex);
      return;
    }
    this.name = !isPlayer && trainer?.isCorrupted ? glitchText(getFusedSpeciesName(this.species.getName(this.formIndex), this.fusionSpecies.getName(this.fusionFormIndex))) : getFusedSpeciesName(this.species.getName(this.formIndex), this.fusionSpecies.getName(this.fusionFormIndex));
    if (this.battleInfo) {
      this.updateInfo(true);
    }
  }

  abstract isPlayer(): boolean;

  abstract hasTrainer(): boolean;

  abstract getFieldIndex(): integer;

  abstract getBattlerIndex(): BattlerIndex;

  loadAssets(ignoreOverride: boolean = true): Promise<void> {
    return new Promise(resolve => {
        if (!this.scene) {
          console.warn('Scene reference lost during asset loading for Pokemon:', this.name);
          resolve();
          return;
        }
      const moveIds = this.getMoveset().map(m => {
        const move = m.getMove();
        if (move === undefined) {
          console.error(`getMove() returned undefined for move: ${m}`);
          return undefined;
        }
        return move.id;
      }).filter(id => id !== undefined);
      Promise.allSettled(moveIds.map(m => initMoveAnim(this.scene, m)))
        .then(() => {
          loadMoveAnimAssets(this.scene, moveIds);
          this.getSpeciesForm().loadAssets(this.scene, this.getGender() === Gender.FEMALE, this.formIndex, this.shiny, this.variant);
          if (this.isPlayer() || this.getFusionSpeciesForm()) {
            this.scene.loadPokemonAtlas(this.getBattleSpriteKey(true, ignoreOverride), this.getBattleSpriteAtlasPath(true, ignoreOverride));
          }
          if (this.getFusionSpeciesForm()) {
            this.getFusionSpeciesForm().loadAssets(this.scene, this.getFusionGender() === Gender.FEMALE, this.fusionFormIndex, this.fusionShiny, this.fusionVariant);
            this.scene.loadPokemonAtlas(this.getFusionBattleSpriteKey(true, ignoreOverride), this.getFusionBattleSpriteAtlasPath(true, ignoreOverride));
          }
          this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
            if (!this.scene) {
              console.warn('Scene reference lost during asset loading for Pokemon:', this.name);
              resolve();
              return;
            }
            if (this.isPlayer()) {
              const originalWarn = console.warn;
              console.warn = () => {};
              const battleSpriteKey = this.getBattleSpriteKey(true, ignoreOverride);
              const battleFrameNames = this.scene.anims.generateFrameNames(battleSpriteKey, { zeroPad: 4, suffix: ".png", start: 1, end: 400 });
              console.warn = originalWarn;
              if (!(this.scene.anims.exists(battleSpriteKey))) {
                if (battleFrameNames.length) {
                  this.scene.anims.create({
                    key: battleSpriteKey,
                    frames: battleFrameNames,
                    frameRate: 12,
                    repeat: -1
                  });
                } else {
                  const tex = this.scene.textures.exists(battleSpriteKey) ? this.scene.textures.get(battleSpriteKey) : null;
                  const firstFrameName = tex ? tex.getFrameNames()[0] : null;
                  this.scene.anims.create({
                    key: battleSpriteKey,
                    frames: firstFrameName ? [{ key: battleSpriteKey, frame: firstFrameName }] : [{ key: battleSpriteKey }],
                    frameRate: 1,
                    repeat: -1
                  });
                }
              }
            }
            this.playAnim();
            const updateFusionPaletteAndResolve = () => {
              this.updateFusionPalette();
              if (this.summonData?.speciesForm) {
                this.updateFusionPalette(true);
              }
              if (this.altBuildId && !this.altBuildSpriteColors) {
                const altBuild = POKEMON_ALT_BUILDS[this.altBuildId];
                if (altBuild?.spriteColorPalette) {
                  const rank = this.altBuildRank || 0;
                  const basePalette = (rank >= 6 && altBuild.spriteColorPalette.darkPalette)
                    ? altBuild.spriteColorPalette.darkPalette
                    : altBuild.spriteColorPalette.targetPalette;
                  const inversionFactor = rank >= 6 ? (rank - 5) / 5 * 0.7 : 0.0;
                  this.updateAltBuildPalette({
                    ...altBuild,
                    spriteColorPalette: {
                      ...altBuild.spriteColorPalette,
                      targetPalette: basePalette
                    },
                    inversionFactor: inversionFactor
                  });
                }
              }
              if ((this as any)._pendingTypeSwitcherPalette && !this.altBuildSpriteColors) {
                  this.updateAltBuildPalette((this as any)._pendingTypeSwitcherPalette);
                  delete (this as any)._pendingTypeSwitcherPalette;
              }
              resolve();
            };
            if (this.shiny) {
              const populateVariantColors = (key: string, back: boolean = false): Promise<void> => {
                return new Promise(resolve => {
                  const battleSpritePath = this.getBattleSpriteAtlasPath(back, ignoreOverride).replace("variant/", "").replace(/_[1-3]$/, "");
                  let config = variantData;
                  const useExpSprite = this.scene.experimentalSprites && this.scene.hasExpSprite(this.getBattleSpriteKey(back, ignoreOverride));
                  battleSpritePath.split("/").map(p => config ? config = config[p] : null);
                  const variantSet: VariantSet = config as VariantSet;
                  if (variantSet && variantSet[this.variant] === 1) {
                    if (variantColorCache.hasOwnProperty(key)) {
                      return resolve();
                    }
                    this.scene.cachedFetch(`./images/pokemon/variant/${useExpSprite ? "exp/" : ""}${battleSpritePath}.json`)
                      .then(res => {
                        if (!res.ok) {
                          console.error(`Could not load ${res.url}!`);
                          return null;
                        }
                        return res.json();
                      })
                      .then(c => {
                        if (c) {
                          variantColorCache[key] = c;
                        }
                        resolve();
                      })
                      .catch(() => resolve());
                  } else {
                    resolve();
                  }
                });
              };
              if (this.isPlayer()) {
                Promise.all([ populateVariantColors(this.getBattleSpriteKey(false)), populateVariantColors(this.getBattleSpriteKey(true), true) ]).then(() => updateFusionPaletteAndResolve());
              } else {
                populateVariantColors(this.getBattleSpriteKey(false)).then(() => updateFusionPaletteAndResolve());
              }
            } else {
              updateFusionPaletteAndResolve();
            }
          });
          if (!this.scene.load.isLoading()) {
            this.scene.load.start();
          }
        });
    });
  }

  getFormKey(): string {
    if (!this.species.forms.length || this.species.forms.length <= this.formIndex) {
      return "";
    }
    return this.species.forms[this.formIndex].formKey;
  }

  getFusionFormKey(): string | null {
    if (!this.fusionSpecies) {
      return null;
    }
    if (!this.fusionSpecies.forms.length || this.fusionSpecies.forms.length <= this.fusionFormIndex) {
      return "";
    }
    return this.fusionSpecies.forms[this.fusionFormIndex].formKey;
  }

  getSpriteAtlasPath(ignoreOverride?: boolean): string {
    const spriteId = this.getSpriteId(ignoreOverride).replace(/\_{2}/g, "/");
    return `${/_[1-3]$/.test(spriteId) ? "variant/" : ""}${spriteId}`;
  }

  getBattleSpriteAtlasPath(back?: boolean, ignoreOverride?: boolean): string {
    const spriteId = this.getBattleSpriteId(back, ignoreOverride).replace(/\_{2}/g, "/");
    return `${/_[1-3]$/.test(spriteId) ? "variant/" : ""}${spriteId}`;
  }

  getSpriteId(ignoreOverride?: boolean): string {
    return this.getSpeciesForm(ignoreOverride).getSpriteId(this.getGender(ignoreOverride) === Gender.FEMALE, this.formIndex, this.shiny, this.variant);
  }

  getBattleSpriteId(back?: boolean, ignoreOverride?: boolean): string {
    if (back === undefined) {
      back = this.isPlayer();
    }
    return this.getSpeciesForm(ignoreOverride).getSpriteId(this.getGender(ignoreOverride) === Gender.FEMALE, this.formIndex, this.shiny, this.variant, back);
  }

  getSpriteKey(ignoreOverride?: boolean): string {
    return this.getSpeciesForm(ignoreOverride).getSpriteKey(this.getGender(ignoreOverride) === Gender.FEMALE, this.formIndex, this.shiny, this.variant);
  }

  getBattleSpriteKey(back?: boolean, ignoreOverride?: boolean): string {
    return `pkmn__${this.getBattleSpriteId(back, ignoreOverride)}`;
  }

  getFusionSpriteId(ignoreOverride?: boolean): string {
    return this.getFusionSpeciesForm(ignoreOverride).getSpriteId(this.getFusionGender(ignoreOverride) === Gender.FEMALE, this.fusionFormIndex, this.fusionShiny, this.fusionVariant);
  }

  getFusionBattleSpriteId(back?: boolean, ignoreOverride?: boolean): string {
    if (back === undefined) {
      back = this.isPlayer();
    }
    return this.getFusionSpeciesForm(ignoreOverride).getSpriteId(this.getFusionGender(ignoreOverride) === Gender.FEMALE, this.fusionFormIndex, this.fusionShiny, this.fusionVariant, back);
  }

  getFusionBattleSpriteKey(back?: boolean, ignoreOverride?: boolean): string {
    return `pkmn__${this.getFusionBattleSpriteId(back, ignoreOverride)}`;
  }

  getFusionBattleSpriteAtlasPath(back?: boolean, ignoreOverride?: boolean): string {
    return this.getFusionBattleSpriteId(back, ignoreOverride).replace(/\_{2}/g, "/");
  }

  getIconAtlasKey(ignoreOverride?: boolean): string {
    return this.getSpeciesForm(ignoreOverride).getIconAtlasKey(this.formIndex, this.shiny, this.variant);
  }

  getFusionIconAtlasKey(ignoreOverride?: boolean): string {
    return this.getFusionSpeciesForm(ignoreOverride).getIconAtlasKey(this.fusionFormIndex, this.fusionShiny, this.fusionVariant);
  }

  getIconId(ignoreOverride?: boolean): string {
    return this.getSpeciesForm(ignoreOverride).getIconId(this.getGender(ignoreOverride) === Gender.FEMALE, this.formIndex, this.shiny, this.variant);
  }

  getFusionIconId(ignoreOverride?: boolean): string {
    return this.getFusionSpeciesForm(ignoreOverride).getIconId(this.getFusionGender(ignoreOverride) === Gender.FEMALE, this.fusionFormIndex, this.fusionShiny, this.fusionVariant);
  }

  getSpeciesForm(ignoreOverride?: boolean): PokemonSpeciesForm {
    if (!ignoreOverride && this.summonData?.speciesForm) {
      return this.summonData.speciesForm;
    }
    if (!this.species.forms?.length) {
      return this.species;
    }
    if (this.formIndex >= this.species.forms.length) {
      this.formIndex = this.species.forms.length - 1;
    }
    return this.species.forms[this.formIndex];
  }

  getFusionSpeciesForm(ignoreOverride?: boolean): PokemonSpeciesForm {
    if (!ignoreOverride && this.summonData?.speciesForm) {
      return this.summonData.fusionSpeciesForm;
    }
    if (!this.fusionSpecies?.forms?.length || this.fusionFormIndex >= this.fusionSpecies?.forms.length) {

      return this.fusionSpecies;
    }
    return this.fusionSpecies?.forms[this.fusionFormIndex];
  }

  getSprite(): Phaser.GameObjects.Sprite {
    return this.getAt(0) as Phaser.GameObjects.Sprite;
  }

  getTintSprite(): Phaser.GameObjects.Sprite | null {
    return !this.maskEnabled
      ? this.getAt(1) as Phaser.GameObjects.Sprite
      : this.maskSprite;
  }

  getSpriteScale(forField: boolean = false): number {
    const formKey = this.getFormKey();
    if(this.isGlitchOrSmittyForm() && !forField) {
      return 0.45;
    }
    if (!forField && formKey.indexOf(SpeciesFormKey.MEGA) > -1 && ZA_NEW_MEGA_SCALE_SPECIES_IDS.has(this.species.speciesId)) {
      return 0.45;
    }
    if (formKey.indexOf(SpeciesFormKey.GIGANTAMAX) > -1 || formKey.indexOf(SpeciesFormKey.ETERNAMAX) > -1) {
      return 1.5;
    }
    return 1;
  }

  getHeldItems(): PokemonHeldItemModifier[] {
    if (!this.scene) {
      return [];
    }
    return this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.pokemonId === this.id, this.isPlayer()) as PokemonHeldItemModifier[];
  }

  updateScale(): void {
      this.setScale(this.getSpriteScale());
  }

  updateSpritePipelineData(): void {
    const isPlayer = this.isPlayer();
    let trainer = this.scene.currentBattle?.trainer;
    const isCorrupted = (!isPlayer && trainer?.isCorrupted) || false;
    const baseColor = [0, 0, 0];
    const teraColor = !isPlayer && trainer?.config.trainerType !== TrainerType.SMITTY && (this.scene.gameMode.isNightmare || isCorrupted) ? Utils.randSeedItem([
        getTypeRgb(Type.POISON),
        getTypeRgb(Type.DARK),
        [240, 48, 48],
        [50, 50, 50]
    ]) : getTypeRgb(this.getTeraType());

    [ this.getSprite(), this.getTintSprite() ].filter(s => !!s).map(s => {
      s.pipelineData["teraColor"] = teraColor;
      if (isCorrupted) {
        s.pipelineData["baseColor"] = baseColor;
      }
    });
    this.updateInfo(true);
  }

  initShinySparkle(): void {
    const keySuffix = this.variant ? `_${this.variant + 1}` : "";
    const key = `shiny${keySuffix}`;
    const shinySparkle = this.scene.addFieldSprite(0, 0, key);
    shinySparkle.setVisible(false);
    shinySparkle.setOrigin(0.5, 1);
    const frameNames = this.scene.anims.generateFrameNames(key, { suffix: ".png", end: 34 });
    if (!(this.scene.anims.exists(`sparkle${keySuffix}`))) {
      this.scene.anims.create({
        key: `sparkle${keySuffix}`,
        frames: frameNames,
        frameRate: 32,
        showOnStart: true,
        hideOnComplete: true,
      });
    }
    this.add(shinySparkle);

    this.shinySparkle = shinySparkle;
  }
  tryPlaySprite(sprite: Phaser.GameObjects.Sprite, tintSprite: Phaser.GameObjects.Sprite, key: string): boolean {

    try {
      sprite.play(key);
      tintSprite.play(key);
    } catch (error: unknown) {
      console.error(`Couldn't play animation for '${key}'!\nIs the image for this Pokemon missing?\n`, error);

      return false;
    }

    return true;
  }

  playAnim(): void {
    const key = this.getBattleSpriteKey();
    if (!this.tryPlaySprite(this.getSprite(), this.getTintSprite()!, key)) {
        console.warn(`Using fallback frame for ${key}`);
        this.getSprite().setFrame(0);
    }
  }

  getFieldPositionOffset(): [ number, number ] {
    switch (this.fieldPosition) {
    case FieldPosition.CENTER:
        return [ 0, 0 ];
    case FieldPosition.LEFT:
        return [ -32, -8 ];
    case FieldPosition.RIGHT:
        return [ 32, 0 ];
    }
  }

  setFieldPosition(fieldPosition: FieldPosition, duration?: integer): Promise<void> {
    return new Promise(resolve => {
      if (fieldPosition === this.fieldPosition) {
        resolve();
        return;
      }

      const initialOffset = this.getFieldPositionOffset();

      this.fieldPosition = fieldPosition;

      this.battleInfo.setMini(fieldPosition !== FieldPosition.CENTER);
      this.battleInfo.setOffset(fieldPosition === FieldPosition.RIGHT);

      const newOffset = this.getFieldPositionOffset();

      const relX = newOffset[0] - initialOffset[0];
      const relY = newOffset[1] - initialOffset[1];

      if (duration) {
        this.scene.tweens.add({
          targets: this,
          x: (_target, _key, value: number) => value + relX,
          y: (_target, _key, value: number) => value + relY,
          duration: duration,
          ease: "Sine.easeOut",
          onComplete: () => {
            resolve() }
        });
      } else {
        this.x += relX;
        this.y += relY;
      }
    });
  }

  getStat(stat: Stat): integer {
    return this.stats[stat];
  }

  getBattleStat(stat: Stat, opponent?: Pokemon, move?: Move, isCritical: boolean = false): integer {
    if (stat === Stat.HP) {
      return this.getStat(Stat.HP);
    }
    const battleStat = (stat - 1) as BattleStat;
    const statLevel = new Utils.IntegerHolder(this.summonData.battleStats[battleStat]);
    if (opponent) {
      if (isCritical) {
        switch (stat) {
        case Stat.ATK:
        case Stat.SPATK:
          statLevel.value = Math.max(statLevel.value, 0);
          break;
        case Stat.DEF:
        case Stat.SPDEF:
          statLevel.value = Math.min(statLevel.value, 0);
          break;
        }
      }
      applyAbAttrs(IgnoreOpponentStatChangesAbAttr, opponent, null, false, statLevel);
      if (move) {
        applyMoveAttrs(IgnoreOpponentStatChangesAttr, this, opponent, move, statLevel);
      }
    }
    if (this.isPlayer()) {
      this.scene.applyModifiers(TempBattleStatBoosterModifier, this.isPlayer(), battleStat as integer as TempBattleStat, statLevel);
    }
    const statValue = new Utils.NumberHolder(this.getStat(stat));
    this.scene.applyModifiers(StatBoosterModifier, this.isPlayer(), this, stat, statValue);

    const fieldApplied = new Utils.BooleanHolder(false);
    for (const pokemon of this.scene.getField(true)) {
      applyFieldBattleStatMultiplierAbAttrs(FieldMultiplyBattleStatAbAttr, pokemon, stat, statValue, this, fieldApplied);
      if (fieldApplied.value) {
        break;
      }
    }
    applyBattleStatMultiplierAbAttrs(BattleStatMultiplierAbAttr, this, battleStat, statValue);
    let ret = statValue.value * (Math.max(2, 2 + statLevel.value) / Math.max(2, 2 - statLevel.value));
    switch (stat) {
    case Stat.ATK:
      if (this.getTag(BattlerTagType.SLOW_START)) {
        ret >>= 1;
      }
      break;
    case Stat.DEF:
      if (this.isOfType(Type.ICE) && this.scene.arena.weather?.weatherType === WeatherType.SNOW) {
        ret *= 1.5;
      }
      break;
    case Stat.SPATK:
      break;
    case Stat.SPDEF:
      if (this.isOfType(Type.ROCK) && this.scene.arena.weather?.weatherType === WeatherType.SANDSTORM) {
        ret *= 1.5;
      }
      break;
    case Stat.SPD:

      if    ((this.isPlayer() && this.scene.arena.getTagOnSide(ArenaTagType.TAILWIND, ArenaTagSide.PLAYER))
            ||  (!this.isPlayer() && this.scene.arena.getTagOnSide(ArenaTagType.TAILWIND, ArenaTagSide.ENEMY))) {
        ret *= 2;
      }

      if (this.getTag(BattlerTagType.SLOW_START)) {
        ret >>= 1;
      }
      if (this.status && this.status.effect === StatusEffect.PARALYSIS) {
        ret >>= 1;
      }
      break;
    }

    const highestStatBoost = this.findTag(t => t instanceof HighestStatBoostTag && (t as HighestStatBoostTag).stat === stat) as HighestStatBoostTag;
    if (highestStatBoost) {
      ret *= highestStatBoost.multiplier;
    }

    return Math.floor(ret);
  }

  calculateStats(): void {
    if (!this.stats) {
      this.stats = [ 0, 0, 0, 0, 0, 0 ];
    }
    const baseStats = this.getSpeciesForm().baseStats.slice(0);
    if (this.fusionSpecies) {
      const fusionBaseStats = this.getFusionSpeciesForm().baseStats;

      const nature = this.getNature();
      const natureStatsMultipliers = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD]
        .map(s => ({ stat: s, mult: getNatureStatMultiplier(nature, s) }));
      const boostedStat = natureStatsMultipliers.find(s => s.mult > 1)?.stat;
      const firstPickStatType = boostedStat !== undefined ? boostedStat : Stat.HP;

      const assignedStats = new Set<number>();
      const finalBaseStats = baseStats.slice(0);

      const firstPickValue = Math.max(baseStats[firstPickStatType], fusionBaseStats[firstPickStatType]);
      finalBaseStats[firstPickStatType] = firstPickValue;
      assignedStats.add(firstPickStatType);

      const primaryFullRanked: Array<{value: number, stat: number}> = [];
      const fusionFullRanked: Array<{value: number, stat: number}> = [];

      for (let s = 0; s < this.stats.length; s++) {
        primaryFullRanked.push({value: baseStats[s], stat: s});
        fusionFullRanked.push({value: fusionBaseStats[s], stat: s});
      }

      primaryFullRanked.sort((a, b) => b.value - a.value);
      fusionFullRanked.sort((a, b) => b.value - a.value);

      const allStatsEqual = primaryFullRanked.every(s => s.value === primaryFullRanked[0].value) &&
                            fusionFullRanked.every(s => s.value === fusionFullRanked[0].value) &&
                            primaryFullRanked[0].value === fusionFullRanked[0].value;

      let secondPickStat: number;
      let secondPickValue: number;

      if (allStatsEqual) {
        if (firstPickStatType === Stat.HP) {
          secondPickStat = Stat.SPD;
        } else {
          secondPickStat = Stat.HP;
        }
        secondPickValue = baseStats[secondPickStat];
      } else {
        const primaryMax = primaryFullRanked[0].value;
        const fusionMax = fusionFullRanked[0].value;

        const primarySecondHighest = primaryFullRanked.find(s => s.value < primaryMax) || primaryFullRanked[1];
        const fusionSecondHighest = fusionFullRanked.find(s => s.value < fusionMax) || fusionFullRanked[1];

        const primarySecondIsNatureStat = primarySecondHighest.stat === firstPickStatType;
        const fusionSecondIsNatureStat = fusionSecondHighest.stat === firstPickStatType;

        const primaryThirdCandidate = primaryFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== primaryFullRanked[0].stat) || null;
        const fusionThirdCandidate = fusionFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== fusionFullRanked[0].stat) || null;

        if (primarySecondIsNatureStat && fusionSecondIsNatureStat) {
          const p = primaryThirdCandidate ?? primarySecondHighest;
          const f = fusionThirdCandidate ?? fusionSecondHighest;
          if (p.value > f.value) {
            secondPickStat = p.stat;
            secondPickValue = p.value;
          } else {
            secondPickStat = f.stat;
            secondPickValue = f.value;
          }
        } else if (primarySecondIsNatureStat) {
          const p = primaryThirdCandidate ?? primarySecondHighest;
          if (p.value > fusionSecondHighest.value) {
            secondPickStat = p.stat;
            secondPickValue = p.value;
          } else {
            secondPickStat = fusionSecondHighest.stat;
            secondPickValue = fusionSecondHighest.value;
          }
        } else if (fusionSecondIsNatureStat) {
          const f = fusionThirdCandidate ?? fusionSecondHighest;
          if (f.value > primarySecondHighest.value) {
            secondPickStat = f.stat;
            secondPickValue = f.value;
          } else {
            secondPickStat = primarySecondHighest.stat;
            secondPickValue = primarySecondHighest.value;
          }
        } else {
          if (primarySecondHighest.value > fusionSecondHighest.value) {
            secondPickStat = primarySecondHighest.stat;
            secondPickValue = primarySecondHighest.value;
          } else if (fusionSecondHighest.value > primarySecondHighest.value) {
            secondPickStat = fusionSecondHighest.stat;
            secondPickValue = fusionSecondHighest.value;
          } else {
            secondPickStat = primarySecondHighest.stat;
            secondPickValue = primarySecondHighest.value;
          }
        }

        if (secondPickStat === firstPickStatType) {
          const primaryThird = primaryFullRanked.find(s => s.stat !== firstPickStatType);
          const fusionThird = fusionFullRanked.find(s => s.stat !== firstPickStatType);
          if (primaryThird && fusionThird) {
            if (primaryThird.value > fusionThird.value) {
              secondPickStat = primaryThird.stat;
              secondPickValue = primaryThird.value;
            } else {
              secondPickStat = fusionThird.stat;
              secondPickValue = fusionThird.value;
            }
          }
        }
      }

      finalBaseStats[secondPickStat] = secondPickValue;
      assignedStats.add(secondPickStat);

      for (let s = 0; s < this.stats.length; s++) {
        if (!assignedStats.has(s)) {
          finalBaseStats[s] = Math.ceil((baseStats[s] + fusionBaseStats[s]) / 2);
        }
      }

      for (let s = 0; s < this.stats.length; s++) {
        baseStats[s] = finalBaseStats[s];
      }
    } else if (this.scene.gameMode.isSplicedOnly) {
      for (let s = 0; s < this.stats.length; s++) {
        baseStats[s] = Math.ceil(baseStats[s] / 2);
      }
    }
    this.scene.applyModifiers(PokemonBaseStatModifier, this.isPlayer(), this, baseStats);
    this.scene.applyModifiers(PlayerPokemonBaseStatBoosterModifier, this.isPlayer(), this, baseStats);
    this.scene.applyModifiers(ChampionPokemonStatBoosterModifier, this.isPlayer(), this, baseStats);
    this.scene.applyModifiers(StatSacrificeModifier, this.isPlayer(), this, baseStats);
    this.scene.applyModifiers(StatSwitcherModifier, this.isPlayer(), this, baseStats);
    const stats = Utils.getEnumValues(Stat);
    for (const s of stats) {
      const isHp = s === Stat.HP;
      const baseStat = baseStats[s];
      let value = Math.floor(((2 * baseStat + this.ivs[s]) * this.level) * 0.01);
      if (isHp) {
        value = value + this.level + 10;
        if (this.hasAbility(Abilities.WONDER_GUARD, false, true)) {
          value = 1;
        }
        if (this.hp > value || this.hp === undefined) {
          this.hp = value;
        } else if (this.hp) {
          const lastMaxHp = this.getMaxHp();
          if (lastMaxHp && value > lastMaxHp) {
            this.hp += value - lastMaxHp;
          }
        }
      } else {
        value += 5;
        const natureStatMultiplier = new Utils.NumberHolder(getNatureStatMultiplier(this.getNature(), s));
        this.scene.applyModifier(PokemonNatureWeightModifier, this.isPlayer(), this, natureStatMultiplier);
        if (natureStatMultiplier.value !== 1) {
          value = Math.max(Math[natureStatMultiplier.value > 1 ? "ceil" : "floor"](value * natureStatMultiplier.value), 1);
        }
      }
      this.stats[s] = value;
    }

    if (this.isPlayer() && this.scene.dynamicMode?.statSwap) {
      const tempAtk = this.stats[Stat.ATK];
      const tempSpatk = this.stats[Stat.SPATK];
      this.stats[Stat.ATK] = this.stats[Stat.SPDEF];
      this.stats[Stat.SPATK] = this.stats[Stat.DEF];
      this.stats[Stat.SPDEF] = tempAtk;
      this.stats[Stat.DEF] = tempSpatk;
    }

  }
  getNature(): Nature {
    return this.natureOverride !== -1 ? this.natureOverride : this.nature;
  }

  setNature(nature: Nature): void {
    this.nature = nature;
    this.calculateStats();
  }

  generateNature(naturePool?: Nature[]): void {
    if (naturePool === undefined) {
      naturePool = Utils.getEnumValues(Nature);
    }
    const nature = naturePool[Utils.randSeedInt(naturePool.length)];
    this.setNature(nature);
  }

  isFullHp(): boolean {
    return this.hp >= this.getMaxHp();
  }

  getMaxHp(): integer {
    return this.getStat(Stat.HP);
  }

  getInverseHp(): integer {
    return this.getMaxHp() - this.hp;
  }

  getHpRatio(precise: boolean = false): number {
    return precise
      ? this.hp / this.getMaxHp()
      : Math.round((this.hp / this.getMaxHp()) * 100) / 100;
  }

  generateGender(): void {
    if (this.species.malePercent === null) {
      this.gender = Gender.GENDERLESS;
    } else {
      const genderChance = (this.id % 256) * 0.390625;
      if (genderChance < this.species.malePercent) {
        this.gender = Gender.MALE;
      } else {
        this.gender = Gender.FEMALE;
      }
    }
  }

  isFemale(): boolean {
    return this.gender === Gender.FEMALE;
  }

  getGender(ignoreOverride?: boolean): Gender {
    if (!ignoreOverride && this.summonData?.gender !== undefined) {
      return this.summonData.gender;
    }
    return this.gender;
  }

  getFusionGender(ignoreOverride?: boolean): Gender {
    if (!ignoreOverride && this.summonData?.fusionGender !== undefined) {
      return this.summonData.fusionGender;
    }
    return this.fusionGender;
  }

  isShiny(): boolean {
    return this.shiny || (this.isFusion() && this.fusionShiny);
  }

  getVariant(): Variant {
    return !this.isFusion() ? this.variant : Math.max(this.variant, this.fusionVariant) as Variant;
  }

  getLuck(): integer {
    return this.luck + (this.isFusion() ? this.fusionLuck : 0);
  }

  isFusion(): boolean {
    return !!this.fusionSpecies;
  }

  abstract isBoss(): boolean;

  getMoveset(ignoreOverride?: boolean): (PokemonMove | null)[] {
    const ret = !ignoreOverride && this.summonData?.moveset
        ? this.summonData.moveset
        : this.moveset;
    const overrideArray: Array<Moves> = this.isPlayer() ? Overrides.MOVESET_OVERRIDE : Overrides.OPP_MOVESET_OVERRIDE;
    if (overrideArray.length > 0) {
      overrideArray.forEach((move: Moves, index: number) => {
        const ppUsed = this.moveset[index]?.ppUsed || 0;
        this.moveset[index] = new PokemonMove(move, Math.min(ppUsed, allMoves[move].pp));
      });
    }

    return ret;
  }
  getUnlockedEggMoves(): Moves[] {
    const moves: Moves[] = [];
    const species = this.metSpecies in speciesEggMoves ? this.metSpecies : this.getSpeciesForm(true).getRootSpeciesId(true);
    if (species in speciesEggMoves) {
      for (let i = 0; i < 4; i++) {
        if (this.scene.gameData.starterData[species].eggMoves & (1 << i)) {
          moves.push(speciesEggMoves[species][i]);
        }
      }
    }
    return moves;
  }
  getLearnableLevelMoves(): Moves[] {
    let levelMoves = this.getLevelMoves(1, true, false, true).map(lm => lm[1]);
    if (this.metBiome === -1 && !this.scene.gameMode.isFreshStartChallenge() && !this.scene.gameMode.isDaily) {
      levelMoves = this.getUnlockedEggMoves().concat(levelMoves);
    }
    return levelMoves.filter(lm => !this.moveset.some(m => m?.moveId === lm));
  }
  getTypes(includeTeraType = false, forDefend: boolean = false, ignoreOverride?: boolean): Type[] {
    const types : Type[] = [];

    if (includeTeraType) {
      const teraType = this.getTeraType();
      if (teraType !== Type.UNKNOWN) {
        types.push(teraType);
      }
    }

    if (!types.length || !includeTeraType) {
      if (!ignoreOverride && this.summonData?.types && this.summonData.types.length !== 0) {
        this.summonData.types.forEach(t => types.push(t));
      } else {
        const speciesForm = this.getSpeciesForm(ignoreOverride);

        types.push(speciesForm.type1);

        const fusionSpeciesForm = this.getFusionSpeciesForm(ignoreOverride);
        if (fusionSpeciesForm) {
          if (fusionSpeciesForm.type2 !== null && fusionSpeciesForm.type2 !== speciesForm.type1) {
            types.push(fusionSpeciesForm.type2);
          } else if (fusionSpeciesForm.type1 !== speciesForm.type1) {
            types.push(fusionSpeciesForm.type1);
          }
        }

        if (types.length === 1 && speciesForm.type2 !== null) {
          types.push(speciesForm.type2);
        }
      }
    }
    if (!types.length) {
      types.push(Type.UNKNOWN);
    }

    if (types.length > 1 && types.includes(Type.UNKNOWN)) {
      const index = types.indexOf(Type.UNKNOWN);
      if (index !== -1) {
        types.splice(index, 1);
      }
    }

    return types;
  }

  isOfType(type: Type, includeTeraType: boolean = true, forDefend: boolean = false, ignoreOverride?: boolean): boolean {
    return !!this.getTypes(includeTeraType, forDefend, ignoreOverride).some(t => t === type);
  }
  getAbility(ignoreOverride?: boolean): Ability {
    if (!ignoreOverride && this.summonData?.ability) {
      return allAbilities[this.summonData.ability];
    }
    if (Overrides.ABILITY_OVERRIDE && this.isPlayer()) {
      return allAbilities[Overrides.ABILITY_OVERRIDE];
    }
    if (Overrides.OPP_ABILITY_OVERRIDE && !this.isPlayer()) {
      return allAbilities[Overrides.OPP_ABILITY_OVERRIDE];
    }
    if (this.isFusion()) {
      return allAbilities[this.getFusionSpeciesForm(ignoreOverride).getAbility(this.fusionAbilityIndex)];
    }
    let abilityId = this.getSpeciesForm(ignoreOverride).getAbility(this.abilityIndex);
    if (abilityId === Abilities.NONE) {
      abilityId = this.species.ability1;
    }
    return allAbilities[abilityId];
  }
  getPassiveAbility(): Ability {
    if (Overrides.PASSIVE_ABILITY_OVERRIDE && this.isPlayer()) {
      return allAbilities[Overrides.PASSIVE_ABILITY_OVERRIDE];
    }
    if (Overrides.OPP_PASSIVE_ABILITY_OVERRIDE && !this.isPlayer()) {
      return allAbilities[Overrides.OPP_PASSIVE_ABILITY_OVERRIDE];
    }

    let starterSpeciesId = this.species.speciesId;
    while (pokemonPrevolutions.hasOwnProperty(starterSpeciesId)) {
      starterSpeciesId = pokemonPrevolutions[starterSpeciesId];
    }
    if(this.altPassiveForRun != undefined) {
      return allAbilities[this.altPassiveForRun];
    }

    return allAbilities[starterPassiveAbilities[starterSpeciesId]];
  }
  getAbilityAttrs(attrType: { new(...args: any[]): AbAttr }, canApply: boolean = true, ignoreOverride?: boolean): AbAttr[] {
    const abilityAttrs: AbAttr[] = [];

    if (!canApply || this.canApplyAbility()) {
      abilityAttrs.push(...this.getAbility(ignoreOverride).getAttrs(attrType));
    }

    if (!canApply || this.canApplyAbility(true)) {
      abilityAttrs.push(...this.getPassiveAbility().getAttrs(attrType));
    }

    return abilityAttrs;
  }
  getCurrentAbilityIndex(): integer {
    const currentAbility = this.getAbility(true).id;
    const currentForm = this.isFusion() ? this.fusionSpecies!.forms[this.fusionFormIndex] || this.fusionSpecies : this.species.forms.length > 0 ? this.species.forms[this.formIndex] : this.species;
    return [currentForm.ability1, currentForm.ability2, currentForm.abilityHidden].indexOf(currentAbility);
  }

  setAbility(newAbility: Abilities, abilityIndex: integer): void {
    const currentForm = this.isFusion() ? this.fusionSpecies!.forms[this.fusionFormIndex] || this.fusionSpecies : this.species.forms.length > 0 ? this.species.forms[this.formIndex] : this.species;
    switch (abilityIndex) {
    case 0:
      currentForm.ability1 = newAbility;
      break;
    case 1:
      currentForm.ability2 = newAbility;
      break;
    case 2:
      currentForm.abilityHidden = newAbility;
      break;
    }
  }
  hasPassive(): boolean {

    if ((Overrides.PASSIVE_ABILITY_OVERRIDE !== Abilities.NONE && this.isPlayer()) ||
        (Overrides.OPP_PASSIVE_ABILITY_OVERRIDE !== Abilities.NONE && !this.isPlayer())) {
      return true;
    }
    if (!this.isPlayer() && this.scene.dynamicMode?.hasPassiveAbility) {
      return true;
    }
    const { currentBattle, gameMode } = this.scene;
    const waveIndex = currentBattle?.waveIndex;
    if (this instanceof EnemyPokemon &&
      (currentBattle?.battleSpec === BattleSpec.FINAL_BOSS ||
      gameMode.isEndlessMinorBoss(waveIndex) ||
      gameMode.isEndlessMajorBoss(waveIndex))) {
      return false;
    }

    return this.passive || this.isBoss();
  }
  canApplyAbility(passive: boolean = false, partyAbility: Ability = undefined): boolean {
    if (passive && !this.hasPassive()) {
      return false;
    }
    const ability = partyAbility || (!passive ? this.getAbility() : this.getPassiveAbility());

    if (this.isFusion() && ability.hasAttr(NoFusionAbilityAbAttr)) {
      return false;
    }
    if (this.scene?.arena.ignoreAbilities && ability.isIgnorable) {
      return false;
    }
    if (this.summonData?.abilitySuppressed && !ability.hasAttr(UnsuppressableAbilityAbAttr)) {
      return false;
    }
    if (this.isOnField() && !ability.hasAttr(SuppressFieldAbilitiesAbAttr)) {
      const suppressed = new Utils.BooleanHolder(false);
      this.scene.getField(true).filter(p => p !== this).map(p => {
        if (p.getAbility().hasAttr(SuppressFieldAbilitiesAbAttr) && p.canApplyAbility()) {
          p.getAbility().getAttrs(SuppressFieldAbilitiesAbAttr).map(a => a.apply(this, false, false, suppressed, [ability]));
        }
        if (p.getPassiveAbility().hasAttr(SuppressFieldAbilitiesAbAttr) && p.canApplyAbility(true)) {
          p.getPassiveAbility().getAttrs(SuppressFieldAbilitiesAbAttr).map(a => a.apply(this, true, false, suppressed, [ability]));
        }
      });
      if (suppressed.value) {
        return false;
      }
    }
    const ret = (!!this.hp || ability.isBypassFaint) && !ability.conditions.find(condition => !condition(this));
    return ret;
  }
  hasAbility(ability: Abilities, canApply: boolean = true, ignoreOverride?: boolean): boolean {
    if ((!canApply || this.canApplyAbility()) && this.getAbility(ignoreOverride).id === ability) {
      return true;
    }
    if (this.hasPassive() && (!canApply || this.canApplyAbility(true)) && this.getPassiveAbility().id === ability) {
      return true;
    }
    return false;
  }
  hasAbilityWithAttr(attrType: Constructor<AbAttr>, canApply: boolean = true, ignoreOverride?: boolean): boolean {
    if ((!canApply || this.canApplyAbility()) && this.getAbility(ignoreOverride).hasAttr(attrType)) {
      return true;
    }
    if (this.hasPassive() && (!canApply || this.canApplyAbility(true)) && this.getPassiveAbility().hasAttr(attrType)) {
      return true;
    }
    return false;
  }

  getWeight(): number {
    const weight = new Utils.NumberHolder(this.species.weight);

    applyAbAttrs(WeightMultiplierAbAttr, this, null, false, weight);
    return weight.value;
  }
  getTeraType(): Type {

    if (this.scene !== undefined) {
    const teraModifier = this.scene.findModifier(m => m instanceof TerastallizeModifier
        && m.pokemonId === this.id && !!m.getBattlesLeft(), this.isPlayer()) as TerastallizeModifier;

    if (teraModifier) {
      return teraModifier.teraType;
    }
    }

    return Type.UNKNOWN;
  }

  isTerastallized(): boolean {
    return this.getTeraType() !== Type.UNKNOWN;
  }

  isGrounded(): boolean {
    return !!this.getTag(GroundedTag) || (!this.isOfType(Type.FLYING, true, true) && !this.hasAbility(Abilities.LEVITATE) && !this.getTag(BattlerTagType.MAGNET_RISEN) && !this.getTag(SemiInvulnerableTag));
  }
  getMoveType(move: Move, simulated: boolean = true): Type {
    const moveTypeHolder = new Utils.NumberHolder(move.type);

    applyMoveAttrs(VariableMoveTypeAttr, this, null, move, moveTypeHolder);
    applyPreAttackAbAttrs(MoveTypeChangeAbAttr, this, null, move, simulated, moveTypeHolder);

    return moveTypeHolder.value as Type;
  }
  getMoveEffectiveness(source: Pokemon, move: Move, ignoreAbility: boolean = false, simulated: boolean = true, cancelled?: Utils.BooleanHolder): TypeDamageMultiplier {
    if (move.hasAttr(TypelessAttr)) {
      return 1;
    }
    const moveType = source.getMoveType(move);

    const typeMultiplier = new Utils.NumberHolder((move.category !== MoveCategory.STATUS || move.hasAttr(RespectAttackTypeImmunityAttr))
      ? this.getAttackTypeEffectiveness(moveType, source, false, simulated)
      : 1);

    applyMoveAttrs(VariableMoveTypeMultiplierAttr, source, this, move, typeMultiplier);
    if (this.getTypes().find(t => move.isTypeImmune(source, this, t))) {
      typeMultiplier.value = 0;
    }

    const cancelledHolder = cancelled ?? new Utils.BooleanHolder(false);
    if (!ignoreAbility) {
      applyPreDefendAbAttrs(TypeImmunityAbAttr, this, source, move, cancelledHolder, simulated, typeMultiplier);

      if (!cancelledHolder.value) {
        applyPreDefendAbAttrs(MoveImmunityAbAttr, this, source, move, cancelledHolder, simulated, typeMultiplier);
    }

      if (!cancelledHolder.value) {
        const defendingSidePlayField = this.isPlayer() ? this.scene.getPlayerField() : this.scene.getEnemyField();
        defendingSidePlayField.forEach((p) => applyPreDefendAbAttrs(FieldPriorityMoveImmunityAbAttr, p, source, move, cancelledHolder));
      }
  }

    const immuneTags = this.findTags(tag => tag instanceof TypeImmuneTag && tag.immuneType === moveType);
    for (const tag of immuneTags) {
      if (move && !move.getAttrs(HitsTagAttr).some(attr => attr.tagType === tag.tagType)) {
        typeMultiplier.value = 0;
        break;
      }
    }

    const ret = (!cancelledHolder.value ? typeMultiplier.value : 0) as TypeDamageMultiplier;
    return ret;
  }
  getAttackTypeEffectiveness(moveType: Type, source?: Pokemon, ignoreStrongWinds: boolean = false, simulated: boolean = true): TypeDamageMultiplier {
    if (moveType === Type.STELLAR) {
      return this.isTerastallized() ? 2 : 1;
    }
    const types = this.getTypes(true, true);
    const arena = this.scene.arena;
    if (moveType === Type.GROUND && (this.isGrounded() || arena.hasTag(ArenaTagType.GRAVITY))) {
      const flyingIndex = types.indexOf(Type.FLYING);
      if (flyingIndex > -1) {
        types.splice(flyingIndex, 1);
      }
    }

    let multiplier = types.map(defType => {
      if (source) {
        const ignoreImmunity = new Utils.BooleanHolder(false);
        if (source.isActive(true) && source.hasAbilityWithAttr(IgnoreTypeImmunityAbAttr)) {
          applyAbAttrs(IgnoreTypeImmunityAbAttr, source, ignoreImmunity, simulated, moveType, defType);
        }
        if (ignoreImmunity.value) {
          return 1;
        }

        const exposedTags = this.findTags(tag => tag instanceof ExposedTag) as ExposedTag[];
        if (exposedTags.some(t => t.ignoreImmunity(defType, moveType))) {
          return 1;
      }
      }
      const multiplier = new Utils.NumberHolder(getTypeDamageMultiplier(moveType, defType));
      applyChallenges(this.scene.gameMode, ChallengeType.TYPE_EFFECTIVENESS, multiplier);
      if (this.scene.dynamicMode?.noResistances && this.isPlayer() && multiplier.value < 1) {
        multiplier.value = 1;
      }
      if (this.scene.dynamicMode?.invertedTypes) {

        if (multiplier.value === 2) {
          multiplier.value = 0.5;
        } else if (multiplier.value === 0.5) {
          multiplier.value = 2;
        } else if (multiplier.value === 4) {
          multiplier.value = 0.25;
        } else if (multiplier.value === 0.25) {
          multiplier.value = 4;
        } else if (multiplier.value === 0) {
          multiplier.value = 2;
        }

      }

      return multiplier.value;
    }).reduce((acc, cur) => acc * cur, 1) as TypeDamageMultiplier;

    const typeMultiplierAgainstFlying = new Utils.NumberHolder(getTypeDamageMultiplier(moveType, Type.FLYING));
    applyChallenges(this.scene.gameMode, ChallengeType.TYPE_EFFECTIVENESS, typeMultiplierAgainstFlying);

    if (!ignoreStrongWinds && arena.weather?.weatherType === WeatherType.STRONG_WINDS && !arena.weather.isEffectSuppressed(this.scene) && this.isOfType(Type.FLYING) && typeMultiplierAgainstFlying.value === 2) {
      multiplier /= 2;
      if (!simulated) {
        this.scene.queueMessage(i18next.t("weather:strongWindsEffectMessage"));
    }
    }
    return multiplier as TypeDamageMultiplier;
  }
  getMatchupScore(opponent: Pokemon): number {
    const types = this.getTypes(true);
    const enemyTypes = opponent.getTypes(true, true);

    const outspeed = (this.isActive(true) ? this.getBattleStat(Stat.SPD, opponent) : this.getStat(Stat.SPD)) >= opponent.getBattleStat(Stat.SPD, this);

    let atkScore = opponent.getAttackTypeEffectiveness(types[0], this) * (outspeed ? 1.25 : 1);

    let defScore = 1 / Math.max(this.getAttackTypeEffectiveness(enemyTypes[0], opponent), 0.25);
    if (types.length > 1) {
      atkScore *= opponent.getAttackTypeEffectiveness(types[1], this);
    }
    if (enemyTypes.length > 1) {
      defScore *= (1 / Math.max(this.getAttackTypeEffectiveness(enemyTypes[1], opponent), 0.25));
    }

    let hpDiffRatio = this.getHpRatio() + (1 - opponent.getHpRatio());
    if (outspeed) {
      hpDiffRatio = Math.min(hpDiffRatio * 1.5, 1);
    }
    return (atkScore + defScore) * hpDiffRatio;
  }

  isEvolutionLocked(): boolean {
    return this.isSignature || !!this.altBuildId;
  }

  getEvolution(): SpeciesFormEvolution | null {
    if (this.isGlitchOrSmittyForm()) {
      return null;
    }
    if (this.isEvolutionLocked()) {
      return null;
    }
    if (pokemonEvolutions.hasOwnProperty(this.species.speciesId)) {
      const evolutions = pokemonEvolutions[this.species.speciesId];
      for (const e of evolutions) {
        if (!e.item && this.level >= e.level && (!e.preFormKey || this.getFormKey() === e.preFormKey)) {
          if (e.condition === null || (e.condition as SpeciesEvolutionCondition).predicate(this)) {
            return e;
          }
        }
      }
    }

    if (this.isFusion() && this.fusionSpecies && pokemonEvolutions.hasOwnProperty(this.fusionSpecies.speciesId)) {
      const fusionEvolutions = pokemonEvolutions[this.fusionSpecies.speciesId].map(e => new FusionSpeciesFormEvolution(this.species.speciesId, e));
      for (const fe of fusionEvolutions) {
        if (!fe.item && this.level >= fe.level && (!fe.preFormKey || this.getFusionFormKey() === fe.preFormKey)) {
          if (fe.condition === null || (fe.condition as SpeciesEvolutionCondition).predicate(this)) {
            return fe;
          }
        }
      }
    }

    return null;
  }
  getLevelMoves(startingLevel?: integer, includeEvolutionMoves: boolean = false, simulateEvolutionChain: boolean = false, includeRelearnerMoves: boolean = false, ignoreCurrentLevelFilter: boolean = false): LevelMoves {
    const ret: LevelMoves = [];
    let levelMoves: LevelMoves = [];
    if (!startingLevel) {
      startingLevel = this.level;
    }
    if (simulateEvolutionChain) {
      const evolutionChain = this.species.getSimulatedEvolutionChain(this.level, this.hasTrainer(), this.isBoss(), this.isPlayer());
      for (let e = 0; e < evolutionChain.length; e++) {

        const speciesLevelMoves = getPokemonSpeciesForm(evolutionChain[e][0], this.formIndex).getLevelMoves();
        if (includeRelearnerMoves) {
          levelMoves.push(...speciesLevelMoves);
    } else {
          levelMoves.push(...speciesLevelMoves.filter(lm => (includeEvolutionMoves && lm[0] === 0) || ((!e || lm[0] > 1) && (e === evolutionChain.length - 1 || lm[0] <= evolutionChain[e + 1][1]))));
        }
      }
    } else {
      levelMoves = this.getSpeciesForm(true).getLevelMoves().filter(lm => (includeEvolutionMoves && lm[0] === 0) || (includeRelearnerMoves && lm[0] === -1) || lm[0] > 0);
    }

    if (this.altBuildId) {
      const altBuildDef = POKEMON_ALT_BUILDS[this.altBuildId];
      if (altBuildDef && altBuildDef.moveReplacements) {
        const maxMoveLevel = this.getMaxMoveLevelForAltBuildRank(this.altBuildRank);

        if (altBuildDef.rank && altBuildDef.rank > 0 && Object.keys(altBuildDef.moveReplacements).length > 0) {
          const altLevelMoves: LevelMoves = [];
          for (const [levelKey, moveId] of Object.entries(altBuildDef.moveReplacements)) {
            const level = parseInt(levelKey);
            if (level <= maxMoveLevel) {
              altLevelMoves.push([level, moveId as Moves]);
            }
          }
          altLevelMoves.sort((a, b) => a[0] - b[0]);
          levelMoves = altLevelMoves;
        }
      }
    }

    if (this.fusionSpecies) {
      if (simulateEvolutionChain) {
        const fusionEvolutionChain = this.fusionSpecies.getSimulatedEvolutionChain(this.level, this.hasTrainer(), this.isBoss(), this.isPlayer());
        for (let e = 0; e < fusionEvolutionChain.length; e++) {

          const speciesLevelMoves = getPokemonSpeciesForm(fusionEvolutionChain[e][0], this.fusionFormIndex).getLevelMoves();
          if (includeRelearnerMoves) {
            levelMoves.push(...speciesLevelMoves.filter(lm => (includeEvolutionMoves && lm[0] === 0) || lm[0] !== 0));
          } else {
            levelMoves.push(...speciesLevelMoves.filter(lm => (includeEvolutionMoves && lm[0] === 0) || ((!e || lm[0] > 1) && (e === fusionEvolutionChain.length - 1 || lm[0] <= fusionEvolutionChain[e + 1][1]))));
        }
          }
      } else {
        levelMoves.push(...this.getFusionSpeciesForm(true).getLevelMoves().filter(lm => (includeEvolutionMoves && lm[0] === 0) || (includeRelearnerMoves && lm[0] === -1) || lm[0] > 0));
        }
      }
    levelMoves.sort((lma: [integer, integer], lmb: [integer, integer]) => lma[0] > lmb[0] ? 1 : lma[0] < lmb[0] ? -1 : 0);
    levelMoves = levelMoves.filter(lm => {
      const level = lm[0];
      const isRelearner = level < startingLevel;
      const allowedEvolutionMove = (level === 0) && includeEvolutionMoves;

      return (ignoreCurrentLevelFilter || !(level > this.level))
          && (includeRelearnerMoves || !isRelearner || allowedEvolutionMove);
    });
    if (levelMoves) {
      this.getUniqueMoves(levelMoves, ret);
    }

    return ret;
  }
  private getUniqueMoves(levelMoves: LevelMoves, ret: LevelMoves ): void {
    const uniqueMoves : Moves[] = [];
      for (const lm of levelMoves) {
      if (!uniqueMoves.find(m => m === lm[1])) {
        uniqueMoves.push(lm[1]);
        ret.push(lm);
      }
    }
  }
  setMove(moveIndex: integer, moveId: Moves): void {
    const move = moveId ? new PokemonMove(moveId) : null;
    this.moveset[moveIndex] = move;
    if (this.summonData?.moveset) {
      this.summonData.moveset[moveIndex] = move;
    }
  }
  trySetShiny(thresholdOverride?: integer): boolean {

    if (this.scene.gameMode.isEndless && this.scene.arena.biomeType === Biome.END) {
      return false;
    }

    if(this.scene.currentBattle) {
      const requiredMoney = this.scene.getRequiredMoneyForPokeBuy();

      const restrictedForms = [
        SpeciesFormKey.MEGA,
        SpeciesFormKey.MEGA_X,
        SpeciesFormKey.MEGA_Y,
        SpeciesFormKey.PRIMAL,
        SpeciesFormKey.ORIGIN,
        SpeciesFormKey.INCARNATE,
        SpeciesFormKey.THERIAN,
        SpeciesFormKey.GIGANTAMAX,
        SpeciesFormKey.GIGANTAMAX_SINGLE,
        SpeciesFormKey.GIGANTAMAX_RAPID,
        SpeciesFormKey.ETERNAMAX,
        SpeciesFormKey.GLITCH,
        SpeciesFormKey.GLITCH_B,
        SpeciesFormKey.GLITCH_C,
        SpeciesFormKey.GLITCH_D,
        SpeciesFormKey.GLITCH_E,
        SpeciesFormKey.SMITTY,
        SpeciesFormKey.SMITTY_B
      ];
      const hasRestrictedForm = this.scene.getEnemyField().some(p => p.isActive(true) && restrictedForms.includes(p.getFormKey() as SpeciesFormKey));

      const voidNotOvertaken = !this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN];

      if (this.scene.arena.biomeType === Biome.END ||
      (this.scene.gameMode.isWavePreFinal(this.scene) && voidNotOvertaken) ||
      this.scene.getEnemyField().some(p => p.isActive(true) && (p.species.legendary || p.species.subLegendary || p.species.mythical) && voidNotOvertaken) ||
      (voidNotOvertaken && hasRestrictedForm)) {
        return false;
      }

      else if (this.scene.currentBattle.battleType === BattleType.TRAINER && (this.scene.gameMode.checkIfRival(this.scene) || this.scene.money < requiredMoney)) {
        return false;
      }
    }

    const rand1 = (this.id & 0xFFFF0000) >>> 16;
    const rand2 = (this.id & 0x0000FFFF);

    const E = this.scene.gameData.trainerId ^ this.scene.gameData.secretId;
    const F = rand1 ^ rand2;

    let shinyThresholdValue = 32;

    if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHINY_3)) {
      shinyThresholdValue = 6554;
    } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHINY_2)) {
      shinyThresholdValue = 3277;
    } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHINY_1)) {
      shinyThresholdValue = 2185;
    }

    const shinyThreshold = new Utils.IntegerHolder(shinyThresholdValue);

    if (thresholdOverride === undefined) {
      if (this.scene.eventManager.isEventActive()) {
        shinyThreshold.value *= this.scene.eventManager.getShinyMultiplier();
      }
      if (!this.hasTrainer()) {
        this.scene.applyModifiers(ShinyRateBoosterModifier, true, shinyThreshold);
      }
    } else {
      shinyThreshold.value = thresholdOverride;
    }

    this.shiny = (E ^ F) < shinyThreshold.value;
    if ((E ^ F) < 32) {
      console.log("REAL SHINY!!");
    }

    if (this.shiny) {
      this.initShinySparkle();
    }

    if(Utils.randSeedInt(100) <= 50) {
      this.scene.gameData.reducePermaModifierByType([
        PermaType.PERMA_SHINY_1,
        PermaType.PERMA_SHINY_2,
        PermaType.PERMA_SHINY_3
      ], this.scene);
    }

    return this.shiny;
  }

  isOPForm(): boolean {
    const restrictedForms = [
      SpeciesFormKey.MEGA,
        SpeciesFormKey.MEGA_X,
        SpeciesFormKey.MEGA_Y,
        SpeciesFormKey.PRIMAL,
        SpeciesFormKey.ORIGIN,
        SpeciesFormKey.INCARNATE,
        SpeciesFormKey.THERIAN,
        SpeciesFormKey.GIGANTAMAX,
        SpeciesFormKey.GIGANTAMAX_SINGLE,
        SpeciesFormKey.GIGANTAMAX_RAPID,
        SpeciesFormKey.ETERNAMAX,
        SpeciesFormKey.GLITCH,
        SpeciesFormKey.GLITCH_B,
        SpeciesFormKey.GLITCH_C,
        SpeciesFormKey.GLITCH_D,
        SpeciesFormKey.GLITCH_E,
        SpeciesFormKey.SMITTY,
        SpeciesFormKey.SMITTY_B
    ];

    return restrictedForms.includes(this.getFormKey() as SpeciesFormKey);
  }
  generateVariant(): Variant {
    const formIndex: number = this.formIndex;
    let variantDataIndex: string | number = this.species.speciesId;
    if (this.species.forms.length > 0) {
      const formKey = this.species.forms[formIndex]?.formKey;
      if (formKey) {
        variantDataIndex = `${variantDataIndex}-${formKey}`;
      }
    }

    if (!this.shiny || (!variantData.hasOwnProperty(variantDataIndex) && !variantData.hasOwnProperty(this.species.speciesId))) {
      return 0;
    }
    const rand = Utils.randSeedInt(10);
    if (rand >= 4) {
      return 0;
    } else if (rand >= 1) {
      return 1;
    } else {
      return 2;
    }
  }

  generateFusionSpecies(forStarter?: boolean): void {
    const hiddenAbilityChance = new Utils.IntegerHolder(256);
    if (!this.hasTrainer()) {
      this.scene.applyModifiers(HiddenAbilityRateBoosterModifier, true, hiddenAbilityChance);
    }

    const hasHiddenAbility = !Utils.randSeedInt(hiddenAbilityChance.value);
    const randAbilityIndex = Utils.randSeedInt(2);

    const baseFilter = !forStarter ? this.species.getCompatibleFusionSpeciesFilter()
      : species => {
        return pokemonEvolutions.hasOwnProperty(species.speciesId)
              && !pokemonPrevolutions.hasOwnProperty(species.speciesId)
              && !species.pseudoLegendary
              && !species.legendary
              && !species.mythical
              && !species.isTrainerForbidden()
              && species.speciesId !== this.species.speciesId;
      };

    let chosenFilter = baseFilter;
    let usePreferredFilter = false;

    try {
      const fusionPriorityChanceByType = (this.scene.gameData as any).activeSkillTree?.fusionPriorityChanceByType || {};
      const fusionPriorityChanceBySpecies = (this.scene.gameData as any).activeSkillTree?.fusionPriorityChanceBySpecies || {};

      if (!forStarter && (Object.keys(fusionPriorityChanceByType).length > 0 || Object.keys(fusionPriorityChanceBySpecies).length > 0)) {
        const prefers = (s: PokemonSpecies) => {
          const speciesChance = fusionPriorityChanceBySpecies[s.speciesId] || 0;
          const type1Chance = fusionPriorityChanceByType[s.type1] || 0;
          const type2Chance = s.type2 !== undefined ? (fusionPriorityChanceByType[s.type2] || 0) : 0;
          return Math.max(speciesChance, type1Chance, type2Chance);
        };

        const hasPreferredCandidates = (allSpecies as PokemonSpecies[]).some((s: PokemonSpecies) => baseFilter(s) && prefers(s) > 0);

        if (hasPreferredCandidates) {
          const maxChance = Math.max(
            ...Object.values(fusionPriorityChanceByType),
            ...Object.values(fusionPriorityChanceBySpecies)
          );

          if (Utils.randSeedInt(100) < maxChance) {
            usePreferredFilter = true;
            chosenFilter = (s: PokemonSpecies) => baseFilter(s) && prefers(s) > 0;
          }
        }
      }
    } catch {
    }

    this.fusionSpecies = this.scene.randomSpecies(this.scene.currentBattle?.waveIndex || 0, this.level, false, chosenFilter, true);
    this.fusionAbilityIndex = (this.fusionSpecies.abilityHidden && hasHiddenAbility ? this.fusionSpecies.ability2 ? 2 : 1 : this.fusionSpecies.ability2 ? randAbilityIndex : 0);
    this.fusionShiny = this.shiny;
    this.fusionVariant = this.variant;

    if (this.fusionSpecies.malePercent === null) {
      this.fusionGender = Gender.GENDERLESS;
    } else {
      const genderChance = (this.id % 256) * 0.390625;
      if (genderChance < this.fusionSpecies.malePercent) {
        this.fusionGender = Gender.MALE;
      } else {
        this.fusionGender = Gender.FEMALE;
      }
    }

    this.fusionFormIndex = this.scene.getSpeciesFormIndex(this.fusionSpecies, this.fusionGender, this.getNature(), true);
    this.fusionLuck = this.luck;

    this.generateName();
  }
  generateFusionViaSpeciesID(speciesID: Species, forStarter: boolean = false): void {

    this.fusionSpecies = getPokemonSpecies(speciesID);
    this.fusionAbilityIndex = this.fusionSpecies.abilityHidden ? this.abilityIndex : (this.fusionSpecies.ability2 ? (this.abilityIndex === 2 ? 1 : this.abilityIndex) : 0);
    this.fusionShiny = this.shiny;
    this.fusionVariant = this.variant;

    if(forStarter) {
      this.fusionGender = Gender.FEMALE;
    }
    else {
      if (this.fusionSpecies.malePercent === null) {
        this.fusionGender = Gender.GENDERLESS;
      } else {
        const genderChance = (this.id % 256) * 0.390625;
        if (genderChance < this.fusionSpecies.malePercent) {
        } else {
          this.fusionGender = Gender.FEMALE;
        }
      }
    }

    this.fusionFormIndex = 0;
    this.fusionLuck = this.luck;

    this.generateName();
  }

  clearFusionSpecies(): void {
    this.fusionSpecies = null;
    this.fusionFormIndex = 0;
    this.fusionAbilityIndex = 0;
    this.fusionShiny = false;
    this.fusionVariant = 0;
    this.fusionGender = 0;
    this.fusionLuck = 0;

    this.generateName();
    this.calculateStats();
  }

  generateAndPopulateMoveset(): void {
    this.moveset = [];
    let movePool: [Moves, number][] = [];
    const allLevelMoves = this.getLevelMoves(1, true, true);
    if (!allLevelMoves) {
      console.log(this.species.speciesId, "ERROR");
      return;
    }

    for (let m = 0; m < allLevelMoves.length; m++) {
      const levelMove = allLevelMoves[m];
      if (this.level < levelMove[0]) {
        break;
      }
      let weight = levelMove[0];
      if (weight === 0) {
        weight = 50;
      }
      if (weight === 1 && allMoves[levelMove[1]].power >= 80) {
        weight = 40;
      }
      if (allMoves[levelMove[1]].name.endsWith(" (N)")) {
        weight /= 100;
      }
      if (!movePool.some(m => m[0] === levelMove[1])) {
        movePool.push([levelMove[1], weight]);
      }
    }

    if (this.hasTrainer()) {
      const tms = Object.keys(tmSpecies);
      for (const tm of tms) {
        const moveId = parseInt(tm) as Moves;
        let compatible = false;
        for (const p of tmSpecies[tm]) {
          if (Array.isArray(p)) {
            if (p[0] === this.species.speciesId || (this.fusionSpecies && p[0] === this.fusionSpecies.speciesId) && p.slice(1).indexOf(this.species.forms[this.formIndex]) > -1) {
              compatible = true;
              break;
            }
          } else if (p === this.species.speciesId || (this.fusionSpecies && p === this.fusionSpecies.speciesId)) {
            compatible = true;
            break;
          }
        }
        if (compatible && !movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
          if (tmPoolTiers[moveId] === ModifierTier.COMMON && this.level >= 15 && this.level < 30) {
            movePool.push([moveId, 4]);
          } else if (tmPoolTiers[moveId] === ModifierTier.GREAT && this.level >= 30) {
            movePool.push([moveId, 8]);
          } else if (tmPoolTiers[moveId] === ModifierTier.ULTRA && this.level >= 50) {
            movePool.push([moveId, 14]);
          }
        }
      }

      if (this.level >= 50) {
        for (let i = 0; i < 3; i++) {
          const moveId = speciesEggMoves[this.species.getRootSpeciesId()][i];
          if (!movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
            movePool.push([moveId, 40]);
          }
        }
        const moveId = speciesEggMoves[this.species.getRootSpeciesId()][3];
        if (this.level >= 170 && !movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)") && !this.isBoss()) {
          movePool.push([moveId, 30]);
        }
        if (this.fusionSpecies) {
          for (let i = 0; i < 3; i++) {
            const moveId = speciesEggMoves[this.fusionSpecies.getRootSpeciesId()][i];
            if (!movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
              movePool.push([moveId, 40]);
            }
          }
          const moveId = speciesEggMoves[this.fusionSpecies.getRootSpeciesId()][3];
          if (this.level >= 170 && !movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)") && !this.isBoss()) {
            movePool.push([moveId, 30]);
          }
        }
      }
    }

    if (this.isBoss()) {
      movePool = movePool.filter(m => !allMoves[m[0]].hasAttr(SacrificialAttr));
      movePool = movePool.filter(m => !allMoves[m[0]].hasAttr(OneHitKOAttr));
    }
    movePool = movePool.filter(m => !allMoves[m[0]].hasAttr(SacrificialAttrOnHit));
    if (this.hasTrainer()) {

      movePool = movePool.filter(m => !allMoves[m[0]].hasAttr(OneHitKOAttr));

      movePool = movePool.map(m => [m[0], m[1] * (!!allMoves[m[0]].hasAttr(SacrificialAttr) ? 0.35 : 1)]);
      movePool = movePool.map(m => [m[0], m[1] * (!!allMoves[m[0]].hasAttr(SacrificialAttrOnHit) ? 0.35 : 1)]);

      movePool = movePool.map(m => [m[0], m[1] * (allMoves[m[0]].getAttrs(StatChangeAttr).some(a => a.levels > 1 && a.selfTarget) ? 1.35 : 1)]);

      movePool = movePool.map(m => [m[0], m[1] * (!!allMoves[m[0]].hasAttr(ChargeAttr) || !!allMoves[m[0]].hasAttr(RechargeAttr) ? 0.5 : 1)]);
    }
    const maxPower = Math.min(movePool.reduce((v, m) => Math.max(allMoves[m[0]].power, v), 40), 90);
    movePool = movePool.map(m => [m[0], m[1] * (allMoves[m[0]].category === MoveCategory.STATUS ? 1 : Math.max(Math.min(allMoves[m[0]].power/maxPower, 1), 0.5))]);
    const worseCategory: MoveCategory = this.stats[Stat.ATK] > this.stats[Stat.SPATK] ? MoveCategory.SPECIAL : MoveCategory.PHYSICAL;
    const statRatio = worseCategory === MoveCategory.PHYSICAL ? this.stats[Stat.ATK]/this.stats[Stat.SPATK] : this.stats[Stat.SPATK]/this.stats[Stat.ATK];
    movePool = movePool.map(m => [m[0], m[1] * (allMoves[m[0]].category === worseCategory ? statRatio : 1)]);

    let weightMultiplier = 0.9;
    if (this.hasTrainer()) {
      weightMultiplier += 0.7;
    }
    if (this.isBoss()) {
      weightMultiplier += 0.4;
    }
    const baseWeights: [Moves, number][] = movePool.map(m => [m[0], Math.ceil(Math.pow(m[1], weightMultiplier)*100)]);

    if (this.hasTrainer() || this.isBoss()) {

      if(this.isSmittyForm() && this.level >= 60) {
        if(this.getBattleStat(BattleStat.ATK) >= this.getBattleStat(BattleStat.SPATK)) {
          this.moveset.push(new PokemonMove(Moves.SMITTY_NUGGETS, 0, 0));
        } else {
          this.moveset.push(new PokemonMove(Moves.NUGGET_OF_SMITTY, 0, 0));
        }
      }

      const stabMovePool = baseWeights.filter(m => allMoves[m[0]].category !== MoveCategory.STATUS && this.isOfType(allMoves[m[0]].type));

      if (stabMovePool.length) {
        const totalWeight = stabMovePool.reduce((v, m) => v + m[1], 0);
        let rand = Utils.randSeedInt(totalWeight);
        let index = 0;
        while (rand > stabMovePool[index][1]) {
          rand -= stabMovePool[index++][1];
        }
        this.moveset.push(new PokemonMove(stabMovePool[index][0], 0, 0));
      }
    } else {
      const attackMovePool = baseWeights.filter(m => allMoves[m[0]].category !== MoveCategory.STATUS);
      if (attackMovePool.length) {
        const totalWeight = attackMovePool.reduce((v, m) => v + m[1], 0);
        let rand = Utils.randSeedInt(totalWeight);
        let index = 0;
        while (rand > attackMovePool[index][1]) {
          rand -= attackMovePool[index++][1];
        }
        this.moveset.push(new PokemonMove(attackMovePool[index][0], 0, 0));
      }
    }

    while (baseWeights.length > this.moveset.length && this.moveset.length < 4) {
      if (this.hasTrainer()) {
        movePool = baseWeights.filter(m => !this.moveset.some(mo => m[0] === mo?.moveId)).map(m => [m[0], this.moveset.some(mo => mo?.getMove().category !== MoveCategory.STATUS && mo?.getMove().type === allMoves[m[0]].type) ? Math.ceil(Math.sqrt(m[1])) : allMoves[m[0]].category !== MoveCategory.STATUS ? Math.ceil(m[1]/Math.max(Math.pow(4, this.moveset.filter(mo => (mo?.getMove().power!) > 1).length)/8, 0.5) * (this.isOfType(allMoves[m[0]].type) ? 2 : 1)) : m[1]]);
      } else {
        movePool = baseWeights.filter(m => !this.moveset.some(mo => m[0] === mo?.moveId));
      }
      const totalWeight = movePool.reduce((v, m) => v + m[1], 0);
      let rand = Utils.randSeedInt(totalWeight);
      let index = 0;
      while (rand > movePool[index][1]) {
        rand -= movePool[index++][1];
      }
      this.moveset.push(new PokemonMove(movePool[index][0], 0, 0));
    }

    this.scene.triggerPokemonFormChange(this, SpeciesFormChangeMoveLearnedTrigger);
  }

  trySelectMove(moveIndex: integer, ignorePp?: boolean): boolean {
    const move = this.getMoveset().length > moveIndex
      ? this.getMoveset()[moveIndex]
      : null;
    return move?.isUsable(this, ignorePp)!;
  }

  showInfo(): void {
    if (!this.battleInfo.visible) {
      const otherBattleInfo = this.scene.fieldUI.getAll().slice(0, 4).filter(ui => ui instanceof BattleInfo && ((ui as BattleInfo) instanceof PlayerBattleInfo) === this.isPlayer()).find(() => true);
      if (!otherBattleInfo || !this.getFieldIndex()) {
        this.scene.fieldUI.sendToBack(this.battleInfo);
        this.scene.sendTextToBack();
      } else {
        this.scene.fieldUI.moveAbove(this.battleInfo, otherBattleInfo);
      }
      this.battleInfo.setX(this.battleInfo.x + (this.isPlayer() ? 150 : !this.isBoss() ? -150 : -198));
      this.battleInfo.setVisible(true);
      if (this.isPlayer()) {
        this.battleInfo.expMaskRect.x += 150;
      }
      this.scene.tweens.add({
        targets: [ this.battleInfo, this.battleInfo.expMaskRect ],
        x: this.isPlayer() ? "-=150" : `+=${!this.isBoss() ? 150 : 246}`,
        duration: 1000,
        ease: "Cubic.easeOut"
      });
    }
  }

  hideInfo(): Promise<void> {
    return new Promise(resolve => {
      if (this.battleInfo.visible) {
        this.scene.tweens.add({
          targets: [ this.battleInfo, this.battleInfo.expMaskRect ],
          x: this.isPlayer() ? "+=150" : `-=${!this.isBoss() ? 150 : 246}`,
          duration: 500,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (this.isPlayer()) {
              this.battleInfo.expMaskRect.x -= 150;
            }
            this.battleInfo.setVisible(false);
            this.battleInfo.setX(this.battleInfo.x - (this.isPlayer() ? 150 : !this.isBoss() ? -150 : -198));
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
  setWildFlee(status: boolean): void {
    this.wildFlee = status;
  }

  updateInfo(instant?: boolean): Promise<void> {
    return this.battleInfo.updateInfo(this, instant);
  }
  updateEffectiveness(effectiveness?: string) {
    this.battleInfo.updateEffectiveness(effectiveness);
  }

  updateMoveLevel(moveId?: number) {
    this.battleInfo.updateMoveLevel(this.id, moveId);
  }

  hideMoveLevelContainer() {
    this.battleInfo.hideMoveLevelContainer();
  }

  toggleStats(visible: boolean): void {
    this.battleInfo.toggleStats(visible);
  }
  toggleFlyout(visible: boolean): void {
    this.battleInfo.toggleFlyout(visible);
  }

  addExp(exp: integer) {
    const maxExpLevel = this.scene.getMaxExpLevel();
    const initialExp = this.exp;
    this.exp += exp;
    while (this.level < maxExpLevel && this.exp >= getLevelTotalExp(this.level + 1, this.species.growthRate)) {
      this.level++;
    }
    if (this.level >= maxExpLevel) {
      console.log(initialExp, this.exp, getLevelTotalExp(this.level, this.species.growthRate));
      this.exp = Math.max(getLevelTotalExp(this.level, this.species.growthRate), initialExp);
    }
    this.levelExp = this.exp - getLevelTotalExp(this.level, this.species.growthRate);
  }

  getOpponent(targetIndex: integer): Pokemon | null {
    const ret = this.getOpponents()[targetIndex];
    if (ret.summonData) {
      return ret;
    }
    return null;
  }

  getOpponents(): Pokemon[] {
    return ((this.isPlayer() ? this.scene.getEnemyField() : this.scene.getPlayerField()) as Pokemon[]).filter(p => p.isActive());
  }

  getOpponentDescriptor(): string {
    const opponents = this.getOpponents();
    if (opponents.length === 1) {
      return opponents[0].name;
    }
    return this.isPlayer() ? i18next.t("arenaTag:opposingTeam") : i18next.t("arenaTag:yourTeam");
  }

  getAlly(): Pokemon {
    return (this.isPlayer() ? this.scene.getPlayerField() : this.scene.getEnemyField())[this.getFieldIndex() ? 0 : 1];
  }
  getAlliedField(): Pokemon[] {
    return this instanceof PlayerPokemon ? this.scene.getPlayerField() : this.scene.getEnemyField();
  }
  getAccuracyMultiplier(target: Pokemon, sourceMove: Move): number {
    const isOhko = sourceMove.hasAttr(OneHitKOAccuracyAttr);
    if (isOhko) {
      return 1;
    }

    const userAccuracyLevel = new Utils.IntegerHolder(this.summonData.battleStats[BattleStat.ACC]);
    const targetEvasionLevel = new Utils.IntegerHolder(target.summonData.battleStats[BattleStat.EVA]);

    applyAbAttrs(IgnoreOpponentStatChangesAbAttr, target, null, false, userAccuracyLevel);
    applyAbAttrs(IgnoreOpponentStatChangesAbAttr, this, null, false, targetEvasionLevel);
    applyAbAttrs(IgnoreOpponentEvasionAbAttr, this, null, false, targetEvasionLevel);
    applyMoveAttrs(IgnoreOpponentStatChangesAttr, this, target, sourceMove, targetEvasionLevel);
    this.scene.applyModifiers(TempBattleStatBoosterModifier, this.isPlayer(), TempBattleStat.ACC, userAccuracyLevel);

    if (target.findTag(t => t instanceof ExposedTag)) {
      targetEvasionLevel.value = Math.min(0, targetEvasionLevel.value);
    }

    const accuracyMultiplier = new Utils.NumberHolder(1);
    if (userAccuracyLevel.value !== targetEvasionLevel.value) {
      accuracyMultiplier.value = userAccuracyLevel.value > targetEvasionLevel.value
        ? (3 + Math.min(userAccuracyLevel.value - targetEvasionLevel.value, 6)) / 3
        : 3 / (3 + Math.min(targetEvasionLevel.value - userAccuracyLevel.value, 6));
    }

    applyBattleStatMultiplierAbAttrs(BattleStatMultiplierAbAttr, this, BattleStat.ACC, accuracyMultiplier, false, sourceMove);

    const evasionMultiplier = new Utils.NumberHolder(1);
    applyBattleStatMultiplierAbAttrs(BattleStatMultiplierAbAttr, target, BattleStat.EVA, evasionMultiplier);

    accuracyMultiplier.value /= evasionMultiplier.value;

    return accuracyMultiplier.value;
  }
  apply(source: Pokemon, move: Move): HitResult {
    let result: HitResult;
    const damage = new Utils.NumberHolder(0);
    const defendingSide = this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    const variableCategory = new Utils.NumberHolder(move.category);
    applyMoveAttrs(VariableMoveCategoryAttr, source, this, move, variableCategory);
    const args: any[] = [];
    applyPreAttackAbAttrs(PreAttackChangeMoveCategoryAbAttr, source, this, move, false, args);
    const effectiveCategoryArg = args.find(arg => arg.effectiveCategory !== undefined);

    const moveCategory = effectiveCategoryArg ? effectiveCategoryArg.effectiveCategory : variableCategory.value as MoveCategory;
    const moveType = source.getMoveType(move);
    const typeChangeMovePowerMultiplier = new Utils.NumberHolder(1);
    applyPreAttackAbAttrs(MoveFlagChangeAttr, source, this, move, false, typeChangeMovePowerMultiplier);
    const cancelled = new Utils.BooleanHolder(false);
    const typeMultiplier = this.getMoveEffectiveness(source, move, false, false, cancelled);

    switch (moveCategory) {
    case MoveCategory.PHYSICAL:
    case MoveCategory.SPECIAL:
      const isPhysical = moveCategory === MoveCategory.PHYSICAL;
      const sourceTeraType = source.getTeraType();

      const power = new Utils.NumberHolder(move.calculateBattlePower(source, this));
      applyPreAttackAbAttrs(PreAttackBoostIfCollectedTypeMatchAbAttr, source, this, move, false, power);
      applyPreDefendAbAttrs(NeutralizeIncomingSuperEffectiveAbAttr, this, source, move, cancelled, false, power);

      if (cancelled.value) {

        source.stopMultiHit(this);
        return HitResult.NO_EFFECT;
      } else {
        const typeBoost = source.findTag(t => t instanceof TypeBoostTag && t.boostedType === moveType) as TypeBoostTag;
        if (typeBoost?.oneUse) {
            source.removeTag(typeBoost.tagType);
          }
        const arenaAttackTypeMultiplier = new Utils.NumberHolder(this.scene.arena.getAttackTypeMultiplier(moveType, source.isGrounded(), source));
        applyMoveAttrs(IgnoreWeatherTypeDebuffAttr, source, this, move, arenaAttackTypeMultiplier);
        const isTypeImmune = (typeMultiplier * arenaAttackTypeMultiplier.value) === 0;
        if (isTypeImmune) {

          source.stopMultiHit(this);
          result = (move.id === Moves.SHEER_COLD)
            ? HitResult.IMMUNE
            : HitResult.NO_EFFECT;

          if (result === HitResult.IMMUNE) {
            this.scene.queueMessage(i18next.t("battle:hitResultImmune", { pokemonName: this.name }));
          } else {
            this.scene.queueMessage(i18next.t("battle:hitResultNoEffect", { pokemonName: getPokemonNameWithAffix(this) }));
        }

          return result;
        }

        const glaiveRushModifier = new Utils.IntegerHolder(1);
        if (this.getTag(BattlerTagType.RECEIVE_DOUBLE_DAMAGE)) {
          glaiveRushModifier.value = 2;
        }
        let isCritical: boolean;
        const critOnly = new Utils.BooleanHolder(false);
        const critAlways = source.getTag(BattlerTagType.ALWAYS_CRIT);
        applyMoveAttrs(CritOnlyAttr, source, this, move, critOnly);
        applyAbAttrs(ConditionalCritAbAttr, source, null, false, critOnly, this, move);
        if (critOnly.value || critAlways) {
          isCritical = true;
        } else {
          const critLevel = new Utils.IntegerHolder(0);
          applyMoveAttrs(HighCritAttr, source, this, move, critLevel);
          this.scene.applyModifiers(CritBoosterModifier, source.isPlayer(), source, critLevel);
          this.scene.applyModifiers(TempBattleStatBoosterModifier, source.isPlayer(), TempBattleStat.CRIT, critLevel);
          const bonusCrit = new Utils.BooleanHolder(false);

          if (applyAbAttrs(BonusCritAbAttr, source, null, false, bonusCrit)) {
            if (bonusCrit.value) {
              critLevel.value += 1;
            }
          }
          if (source.getTag(BattlerTagType.CRIT_BOOST)) {
            critLevel.value += 2;
          }
          const critChance = [24, 8, 2, 1][Math.max(0, Math.min(critLevel.value, 3))];
          isCritical = critChance === 1 || !this.scene.randBattleSeedInt(critChance);
          if (Overrides.NEVER_CRIT_OVERRIDE) {
            isCritical = false;
          }
        }
        if (isCritical) {
          const noCritTag = this.scene.arena.getTagOnSide(NoCritTag, defendingSide);
          const blockCrit = new Utils.BooleanHolder(false);
          applyAbAttrs(BlockCritAbAttr, this, null, false, blockCrit);
          if (noCritTag || blockCrit.value) {
            isCritical = false;
          }
        }
        const sourceAtk = new Utils.IntegerHolder(source.getBattleStat(isPhysical ? Stat.ATK : Stat.SPATK, this, undefined, isCritical));
        const targetDef = new Utils.IntegerHolder(this.getBattleStat(isPhysical ? Stat.DEF : Stat.SPDEF, source, move, isCritical));
        const criticalMultiplier = new Utils.NumberHolder(isCritical ? 1.5 : 1);
        applyAbAttrs(MultCritAbAttr, source, null, false, criticalMultiplier);
        const screenMultiplier = new Utils.NumberHolder(1);
        if (!isCritical) {
          this.scene.arena.applyTagsForSide(WeakenMoveScreenTag, defendingSide, move.category, this.scene.currentBattle.double, screenMultiplier);
        }
        const sourceTypes = source.getTypes();
        const matchesSourceType = sourceTypes[0] === moveType || (sourceTypes.length > 1 && sourceTypes[1] === moveType);
        const stabMultiplier = new Utils.NumberHolder(1);
        if (this.scene.dynamicMode?.noSTAB && source.isPlayer()) {
          stabMultiplier.value = 1;
        } else {
          if (sourceTeraType === Type.UNKNOWN && matchesSourceType) {
            if (sourceTypes.length === 2 && sourceTypes[0] === sourceTypes[1] && sourceTypes[0] === moveType) {
              stabMultiplier.value += 1.0;
            }
            else {
              stabMultiplier.value += 0.5;
            }
          } else if (sourceTeraType !== Type.UNKNOWN && sourceTeraType === moveType) {
            stabMultiplier.value += 0.5;
          }

          applyAbAttrs(StabBoostAbAttr, source, null, false, stabMultiplier);

          if (sourceTeraType !== Type.UNKNOWN && matchesSourceType) {
            stabMultiplier.value = Math.min(stabMultiplier.value + 0.5, 2.25);
          }
        }
        const { targets, multiple } = getMoveTargets(source, move.id);
        const targetMultiplier = (multiple && targets.length > 1) ? 0.75 : 1;

        applyMoveAttrs(VariableAtkAttr, source, this, move, sourceAtk);
        applyMoveAttrs(VariableDefAttr, source, this, move, targetDef);

        const effectPhase = this.scene.getCurrentPhase();
        let numTargets = 1;
        if (effectPhase instanceof MoveEffectPhase) {
          numTargets = effectPhase.getTargets().length;
        }
        const twoStrikeMultiplier = new Utils.NumberHolder(1);
        applyPreAttackAbAttrs(AddSecondStrikeAbAttr, source, this, move, false, numTargets, new Utils.IntegerHolder(0), twoStrikeMultiplier);

        if (!isTypeImmune) {
          const levelMultiplier = (2 * source.level / 5 + 2);
          const randomMultiplier = ((this.scene.randBattleSeedInt(16) + 85) / 100);
          damage.value = Utils.toDmgValue((((levelMultiplier * power.value * sourceAtk.value / targetDef.value) / 50) + 2)
                                   * stabMultiplier.value
                                   * typeMultiplier
                                   * arenaAttackTypeMultiplier.value
                                   * screenMultiplier.value
                                   * twoStrikeMultiplier.value
                                   * targetMultiplier
                                   * criticalMultiplier.value
                                   * glaiveRushModifier.value
                                   * randomMultiplier);

          if (isPhysical && source.status && source.status.effect === StatusEffect.BURN) {
            if (!move.hasAttr(BypassBurnDamageReductionAttr)) {
              const burnDamageReductionCancelled = new Utils.BooleanHolder(false);
              applyAbAttrs(BypassBurnDamageReductionAbAttr, source, burnDamageReductionCancelled, false);
              if (!burnDamageReductionCancelled.value) {
                damage.value = Utils.toDmgValue(damage.value / 2);
              }
            }
          }

          applyPreAttackAbAttrs(DamageBoostAbAttr, source, this, move, false, damage);
          move.getAttrs(HitsTagAttr).filter(hta => hta.doubleDamage).forEach(hta => {
            if (this.getTag(hta.tagType)) {
              damage.value *= 2;
            }
          });
        }

        if (this.scene.arena.terrain?.terrainType === TerrainType.MISTY && this.isGrounded() && moveType === Type.DRAGON) {
          damage.value = Utils.toDmgValue(damage.value / 2);
        }

        const fixedDamage = new Utils.IntegerHolder(0);
        applyMoveAttrs(FixedDamageAttr, source, this, move, fixedDamage);
        if (!isTypeImmune && fixedDamage.value) {
          damage.value = fixedDamage.value;
          isCritical = false;
          result = HitResult.EFFECTIVE;
        }
        result = result!;

        if (!result) {
          const isOneHitKo = new Utils.BooleanHolder(false);
          applyMoveAttrs(OneHitKOAttr, source, this, move, isOneHitKo);
          if (isOneHitKo.value) {
              result = HitResult.ONE_HIT_KO;
              isCritical = false;
              damage.value = this.hp;
          } else if (typeMultiplier >= 2) {
              result = HitResult.SUPER_EFFECTIVE;
          } else if (typeMultiplier >= 1) {
              result = HitResult.EFFECTIVE;
            } else {
              result = HitResult.NOT_VERY_EFFECTIVE;
            }
          }

        const isOneHitKo = result === HitResult.ONE_HIT_KO;

        if (!fixedDamage.value && !isOneHitKo) {
          if (!source.isPlayer()) {
            this.scene.applyModifiers(EnemyDamageBoosterModifier, false, damage);
          }
          if (!this.isPlayer()) {
            this.scene.applyModifiers(EnemyDamageReducerModifier, false, damage);
          }

          applyPreDefendAbAttrs(ReceivedMoveDamageMultiplierAbAttr, this, source, move, cancelled, false, damage);
        }
        applyMoveAttrs(ModifiedDamageAttr, source, this, move, damage);

        if (this.scene.dynamicMode) {
          const dynamicMode = this.scene.dynamicMode;

          if (source.isPlayer() && dynamicMode.legendaryNerf && (source.species.isLegendSubOrMystical())) {
            damage.value = Math.floor(damage.value * 0.5);
          }

          if (!source.isPlayer() && this.isPlayer() && dynamicMode.typeExtraDamage !== undefined && typeof dynamicMode.typeExtraDamage !== 'boolean' && this.getTypes().includes(dynamicMode.typeExtraDamage)) {
            damage.value = Math.floor(damage.value * 1.5);
          }

          if (source.isPlayer() && dynamicMode.pokemonNerf !== undefined && source.species.speciesId === dynamicMode.pokemonNerf) {
            damage.value = Math.floor(damage.value * 0.5);
          }
        }

        console.log("damage", damage.value, move.name, power, sourceAtk, targetDef);
        const destinyTag = this.getTag(BattlerTagType.DESTINY_BOND);

        if (damage.value) {
          if (this.isFullHp()) {
            applyPreDefendAbAttrs(PreDefendFullHpEndureAbAttr, this, source, move, cancelled, false, damage);
          } else if (!this.isPlayer() && damage.value >= this.hp) {
            this.scene.applyModifiers(EnemyEndureChanceModifier, false, this);

            applyPreDefendAbAttrs(PreDefendSurviveAndDamageAbAttr, this, source, move, cancelled, false, damage);
            applyPreDefendAbAttrs(PreDefendSurviveAbAttr, this, source, move, cancelled, false, damage);
          }
          damage.value = this.damageAndUpdate(damage.value, result as DamageResult, isCritical, isOneHitKo, isOneHitKo, true);
          this.turnData.damageTaken += damage.value;
          if (isCritical) {
            this.scene.queueMessage(i18next.t("battle:hitResultCriticalHit"));
          }
          if (source.isPlayer()) {
            this.scene.validateAchvs(DamageAchv, damage);
            if (damage.value > this.scene.gameData.gameStats.highestDamage) {
              this.scene.gameData.gameStats.highestDamage = damage.value;
            }
          }
          source.turnData.damageDealt += damage.value;
          source.turnData.currDamageDealt = damage.value;
          this.battleData.hitCount++;
          const attackResult = { move: move.id, result: result as DamageResult, damage: damage.value, critical: isCritical, sourceId: source.id, sourceBattlerIndex: source.getBattlerIndex() };
          this.turnData.attacksReceived.unshift(attackResult);
          if (source.isPlayer() && !this.isPlayer()) {
            this.scene.applyModifiers(DamageMoneyRewardModifier, true, source, damage);
          }
        }
        if (source.turnData.hitsLeft === 1 || this.isFainted()) {
          switch (result) {
          case HitResult.SUPER_EFFECTIVE:
            this.scene.queueMessage(i18next.t("battle:hitResultSuperEffective"));
            break;
          case HitResult.NOT_VERY_EFFECTIVE:
            this.scene.queueMessage(i18next.t("battle:hitResultNotVeryEffective"));
            break;
          case HitResult.ONE_HIT_KO:
            this.scene.queueMessage(i18next.t("battle:hitResultOneHitKO"));
            break;
          case HitResult.IMMUNE:
          case HitResult.NO_EFFECT:
            console.error("Unhandled move immunity!");
            break;
          }
        }

        if (this.isFainted()) {

          this.scene.setPhaseQueueSplice();
          this.scene.unshiftPhase(new FaintPhase(this.scene, this.getBattlerIndex(), isOneHitKo));
          this.resetSummonData();
        }

        if (damage) {
          destinyTag?.lapse(source, BattlerTagLapseType.CUSTOM);
        }
      }
      break;
    case MoveCategory.STATUS:
      if (!cancelled.value && typeMultiplier === 0) {
        this.scene.queueMessage(i18next.t("battle:hitResultNoEffect", { pokemonName: getPokemonNameWithAffix(this) }));
      }
      result = (typeMultiplier === 0) ? HitResult.NO_EFFECT : HitResult.STATUS;
      break;
    }

    return result;
  }
  damage(damage: integer, ignoreSegments: boolean = false, preventEndure: boolean = false, ignoreFaintPhase: boolean = false): integer {
    if (this.isFainted()) {
      return 0;
    }
    const surviveDamage = new Utils.BooleanHolder(false);

    if (!preventEndure && this.hp - damage <= 0) {
      if (this.hp >= 1 && this.getTag(BattlerTagType.ENDURING)) {
        surviveDamage.value = this.lapseTag(BattlerTagType.ENDURING);
      } else if (this.hp > 1 && this.getTag(BattlerTagType.STURDY)) {
        surviveDamage.value = this.lapseTag(BattlerTagType.STURDY);
      }
      if (!surviveDamage.value) {
        this.scene.applyModifiers(SurviveDamageModifier, this.isPlayer(), this, surviveDamage);
      }
      if (surviveDamage.value) {
        damage = this.hp - 1;
      }
    }

    damage = Math.min(damage, this.hp);

    this.hp = this.hp - damage;
    if (this.isFainted() && !ignoreFaintPhase) {

      this.scene.setPhaseQueueSplice();
      this.scene.unshiftPhase(new FaintPhase(this.scene, this.getBattlerIndex(), preventEndure));
      this.resetSummonData();
    }

    return damage;
  }
  damageAndUpdate(damage: integer, result?: DamageResult, critical: boolean = false, ignoreSegments: boolean = false, preventEndure: boolean = false, ignoreFaintPhase: boolean = false): integer {
    const damagePhase = new DamagePhase(this.scene, this.getBattlerIndex(), damage, result as DamageResult, critical);
    this.scene.unshiftPhase(damagePhase);
    damage = this.damage(damage, ignoreSegments, preventEndure, ignoreFaintPhase);

    damagePhase.updateAmount(damage);
    return damage;
  }

  heal(amount: integer): integer {
    const healAmount = Math.min(amount, this.getMaxHp() - this.hp);
    this.hp += healAmount;
    return healAmount;
  }

  isBossImmune(): boolean {
    return this.isBoss();
  }

  isMax(): boolean {
    const maxForms = [SpeciesFormKey.GIGANTAMAX, SpeciesFormKey.GIGANTAMAX_RAPID, SpeciesFormKey.GIGANTAMAX_SINGLE, SpeciesFormKey.ETERNAMAX] as string[];
    return maxForms.includes(this.getFormKey()) || (!!this.getFusionFormKey() && maxForms.includes(this.getFusionFormKey()!));
  }

  isMega(): boolean {
    const megaForms = [SpeciesFormKey.MEGA, SpeciesFormKey.MEGA_X, SpeciesFormKey.MEGA_Y, SpeciesFormKey.PRIMAL] as string[];
    return megaForms.includes(this.getFormKey()) || (!!this.getFusionFormKey() && megaForms.includes(this.getFusionFormKey()!));
  }

  isShadowlessMegaForm(): boolean {
    return this.isMega() && ZA_NEW_MEGA_SCALE_SPECIES_IDS.has(this.species.speciesId);
  }

  canAddTag(tagType: BattlerTagType): boolean {
    if (this.getTag(tagType)) {
      return false;
    }

    const stubTag = new BattlerTag(tagType, 0, 0);

    const cancelled = new Utils.BooleanHolder(false);
    applyPreApplyBattlerTagAbAttrs(BattlerTagImmunityAbAttr, this, stubTag, cancelled, true);

    const userField = this.getAlliedField();
    userField.forEach(pokemon => applyPreApplyBattlerTagAbAttrs(UserFieldBattlerTagImmunityAbAttr, pokemon, stubTag, cancelled, true));

    return !cancelled.value;
  }

  addTag(tagType: BattlerTagType, turnCount: integer = 0, sourceMove?: Moves, sourceId?: integer): boolean {
    const existingTag = this.getTag(tagType);
    if (existingTag) {
      existingTag.onOverlap(this);
      return false;
    }

    const newTag = getBattlerTag(tagType, turnCount, sourceMove!, sourceId!);

    const cancelled = new Utils.BooleanHolder(false);
    applyPreApplyBattlerTagAbAttrs(BattlerTagImmunityAbAttr, this, newTag, cancelled);

    const userField = this.getAlliedField();
    userField.forEach(pokemon => applyPreApplyBattlerTagAbAttrs(UserFieldBattlerTagImmunityAbAttr, pokemon, newTag, cancelled));

    if (!cancelled.value && newTag.canAdd(this)) {
      this.summonData.tags.push(newTag);
      newTag.onAdd(this);

      return true;
    }

    return false;
  }
  getTag(tagType: BattlerTagType): BattlerTag | null;
  getTag<T extends BattlerTag>(tagType: Constructor<T>): T | null;

  getTag(tagType: BattlerTagType | Constructor<BattlerTag>): BattlerTag | null {
    if (!this.summonData) {
      return null;
    }
    return (tagType instanceof Function
      ? this.summonData.tags.find(t => t instanceof tagType)
      : this.summonData.tags.find(t => t.tagType === tagType)
    )!;
  }

  findTag(tagFilter: ((tag: BattlerTag) => boolean)) {
    if (!this.summonData) {
      return null;
    }
    return this.summonData.tags.find(t => tagFilter(t));
  }

  findTags(tagFilter: ((tag: BattlerTag) => boolean)): BattlerTag[] {
    if (!this.summonData) {
      return [];
    }
    return this.summonData.tags.filter(t => tagFilter(t));
  }

  lapseTag(tagType: BattlerTagType): boolean {
    const tags = this.summonData.tags;
    const tag = tags.find(t => t.tagType === tagType);
    if (tag && !(tag.lapse(this, BattlerTagLapseType.CUSTOM))) {
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
    return !!tag;
  }

  lapseTags(lapseType: BattlerTagLapseType): void {
    const tags = this.summonData.tags;
    tags.filter(t => lapseType === BattlerTagLapseType.FAINT || ((t.lapseTypes.some(lType => lType === lapseType)) && !(t.lapse(this, lapseType)))).forEach(t => {

      if (this instanceof PlayerPokemon) {
        this.scene.gameData.permaModifiers
            .findModifiers(m => m instanceof PermaTagRemovalQuestModifier)
            .forEach(modifier => {
              modifier.apply([this.scene, this, t.tagType]);
            });
      }
      t.onRemove(this);
      tags.splice(tags.indexOf(t), 1);
    });
  }

  removeTag(tagType: BattlerTagType): boolean {
    const tags = this.summonData.tags;
    const tag = tags.find(t => t.tagType === tagType);
    if (tag) {
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
    return !!tag;
  }

  findAndRemoveTags(tagFilter: ((tag: BattlerTag) => boolean)): boolean {
    if (!this.summonData) {
      return false;
    }
    const tags = this.summonData.tags;
    const tagsToRemove = tags.filter(t => tagFilter(t));
    for (const tag of tagsToRemove) {
      tag.turnCount = 0;
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
    return true;
  }

  removeTagsBySourceId(sourceId: integer): void {
    this.findAndRemoveTags(t => t.isSourceLinked() && t.sourceId === sourceId);
  }

  transferTagsBySourceId(sourceId: integer, newSourceId: integer): void {
    if (!this.summonData) {
      return;
    }
    const tags = this.summonData.tags;
    tags.filter(t => t.sourceId === sourceId).forEach(t => t.sourceId = newSourceId);
  }
  transferSummon(source: Pokemon): void {
    const battleStats = Utils.getEnumValues(BattleStat);
    for (const stat of battleStats) {
      this.summonData.battleStats[stat] = source.summonData.battleStats[stat];
    }
    for (const tag of source.summonData.tags) {
      const excludeTagTypes = new Set([BattlerTagType.DROWSY, BattlerTagType.INFATUATED, BattlerTagType.FIRE_BOOST]);

      if (excludeTagTypes.has(tag.tagType)) {
        continue;
      }

      this.summonData.tags.push(tag);
    }
    if (this instanceof PlayerPokemon && source.summonData.battleStats.find(bs => bs === 6)) {
      this.scene.validateAchv(achvs.TRANSFER_MAX_BATTLE_STAT);
    }
    this.updateInfo();
  }

  getMoveHistory(): TurnMove[] {
    return this.battleSummonData.moveHistory;
  }

  pushMoveHistory(turnMove: TurnMove) {
    turnMove.turn = this.scene.currentBattle?.turn;
    this.getMoveHistory().push(turnMove);
  }

  getLastXMoves(turnCount: integer = 0): TurnMove[] {
    const moveHistory = this.getMoveHistory();
    return moveHistory.slice(turnCount >= 0 ? Math.max(moveHistory.length - (turnCount || 1), 0) : 0, moveHistory.length).reverse();
  }

  getMoveQueue(): QueuedMove[] {
    return this.summonData?.moveQueue || [];
  }
  stopMultiHit(target?: Pokemon): void {
    const effectPhase = this.scene.getCurrentPhase();
    if (effectPhase instanceof MoveEffectPhase && effectPhase.getUserPokemon() === this) {
      effectPhase.stopMultiHit(target);
    }
  }

  changeForm(formChange: SpeciesFormChange): Promise<void> {
    return new Promise(resolve => {
      this.formIndex = Math.max(this.species.forms.findIndex(f => f.formKey === formChange.formKey && (formChange.formKey == SpeciesFormKey.SMITTY ? f.formName === formChange.trigger.name : true)), 0);
      this.generateName();
      const abilityCount = this.getSpeciesForm().getAbilityCount();
      if (this.abilityIndex >= abilityCount) {
        this.abilityIndex = abilityCount - 1;
      }
      this.scene.gameData.setPokemonSeen(this, false);
      this.updateScale();
      this.loadAssets().then(() => {
        this.calculateStats();
        this.scene.updateModifiers(this.isPlayer(), true);
        Promise.all([ this.updateInfo(), this.scene.updateFieldScale() ]).then(() => resolve());
      });
    });
  }

  cry(soundConfig?: Phaser.Types.Sound.SoundConfig, sceneOverride?: BattleScene): AnySound {
    const scene = sceneOverride || this.scene;

    if (this.species.speciesId === Species.ROTOM &&
        this.species.forms[this.formIndex].isSmittyForm(this.species.forms[this.formIndex].getFormKey())) {
        return scene.getRandomSmittySound(soundConfig, true);
    }

    const cry = this.getSpeciesForm().cry(scene, soundConfig);
    let duration = cry.totalDuration * 1000;
    if (this.fusionSpecies && this.getSpeciesForm() !== this.getFusionSpeciesForm()) {
      let fusionCry = this.getFusionSpeciesForm().cry(scene, soundConfig, true);
      duration = Math.min(duration, fusionCry.totalDuration * 1000);
      fusionCry.destroy();
      scene.time.delayedCall(Utils.fixedInt(Math.ceil(duration * 0.4)), () => {
        try {
          SoundFade.fadeOut(scene, cry, Utils.fixedInt(Math.ceil(duration * 0.2)));
          fusionCry = this.getFusionSpeciesForm().cry(scene, Object.assign({ seek: Math.max(fusionCry.totalDuration * 0.4, 0) }, soundConfig));
          SoundFade.fadeIn(scene, fusionCry, Utils.fixedInt(Math.ceil(duration * 0.2)), scene.masterVolume * scene.seVolume, 0);
        } catch (err) {
          console.error(err);
        }
      });
    }

    return cry;
  }

  faintCry(callback: Function): void {
    if (this.scene.skipFaintCry) {
      this.scene.time.delayedCall(0, () => {
        if (callback) {
          callback();
        }
      });
      return;
    }

    if (this.fusionSpecies && this.getSpeciesForm() !== this.getFusionSpeciesForm()) {
      return this.fusionFaintCry(callback);
    }

    let rate = 0.85;

    let key = "";

    if (this.species.speciesId === Species.ROTOM &&
        this.species.forms[this.formIndex].isSmittyForm(this.species.forms[this.formIndex].getFormKey())) {
      key = this.scene.getRandomSmittySoundKey(true);
    }
    else {
      key = `cry/${this.getSpeciesForm().getCryKey(this.formIndex)}`;
    }

    const cry = this.scene.playSound(key, { rate: rate }) as AnySound;
    let i = 0;
    let sprite: Phaser.GameObjects.Sprite;
    let tintSprite: Phaser.GameObjects.Sprite | undefined;
    try {
      sprite = this.getSprite();
      tintSprite = this.getTintSprite();
    } catch {
      if (callback) callback();
      return;
    }
    const soundObj = this.scene.sound.get(key);
    const delay = soundObj ? Math.max(soundObj.totalDuration * 50, 25) : 100;

    let frameProgress = 0;
    let frameThreshold: number;

    sprite.anims.pause();
    tintSprite?.anims.pause();

    let faintCryTimer : Phaser.Time.TimerEvent | null = this.scene.time.addEvent({
      delay: Utils.fixedInt(delay),
      repeat: -1,
      callback: () => {
        ++i;
        frameThreshold = sprite.anims.msPerFrame / rate;
        frameProgress += delay;
        while (frameProgress > frameThreshold) {
          if (sprite.anims.duration) {
            sprite.anims.nextFrame();
            tintSprite?.anims.nextFrame();
          }
          frameProgress -= frameThreshold;
        }
        if (cry && !cry.pendingRemove) {
          rate *= 0.99;
          cry.setRate(rate);
        } else {
          faintCryTimer?.destroy();
          faintCryTimer = null;
          if (callback) {
            callback();
          }
        }
      }
    });

    this.scene.time.delayedCall(Utils.fixedInt(3000), () => {
      if (!faintCryTimer || !this.scene) {
        return;
      }
      if (cry?.isPlaying) {
        cry.stop();
      }
      faintCryTimer.destroy();
      if (callback) {
        callback();
      }
    });
  }

  private fusionFaintCry(callback: Function): void {
    const key = `cry/${this.getSpeciesForm().getCryKey(this.formIndex)}`;
    let i = 0;
    let rate = 0.85;
    const cry = this.scene.playSound(key, { rate: rate }) as AnySound;
    const sprite = this.getSprite();
    const tintSprite = this.getTintSprite();
    let duration = cry.totalDuration * 1000;

    const fusionCryKey = `cry/${this.getFusionSpeciesForm().getCryKey(this.fusionFormIndex)}`;
    let fusionCry = this.scene.playSound(fusionCryKey, { rate: rate }) as AnySound;
    fusionCry.stop();
    duration = Math.min(duration, fusionCry.totalDuration * 1000);
    fusionCry.destroy();

    const delay = Math.max(duration * 0.05, 25);

    let transitionIndex = 0;
    let durationProgress = 0;

    const transitionThreshold = Math.ceil(duration * 0.4);
    while (durationProgress < transitionThreshold) {
      ++i;
      durationProgress += delay * rate;
      rate *= 0.99;
    }

    transitionIndex = i;

    i = 0;
    rate = 0.85;

    let frameProgress = 0;
    let frameThreshold: number;

    sprite.anims.pause();
    tintSprite?.anims.pause();

    let faintCryTimer: Phaser.Time.TimerEvent | null = this.scene.time.addEvent({
      delay: Utils.fixedInt(delay),
      repeat: -1,
      callback: () => {
        ++i;
        frameThreshold = sprite.anims.msPerFrame / rate;
        frameProgress += delay;
        while (frameProgress > frameThreshold) {
          if (sprite.anims.duration) {
            sprite.anims.nextFrame();
            tintSprite?.anims.nextFrame();
          }
          frameProgress -= frameThreshold;
        }
        if (i === transitionIndex) {
          SoundFade.fadeOut(this.scene, cry, Utils.fixedInt(Math.ceil((duration / rate) * 0.2)));
          fusionCry = this.scene.playSound(fusionCryKey, Object.assign({ seek: Math.max(fusionCry.totalDuration * 0.4, 0), rate: rate }));
          SoundFade.fadeIn(this.scene, fusionCry, Utils.fixedInt(Math.ceil((duration / rate) * 0.2)), this.scene.masterVolume * this.scene.seVolume, 0);
        }
        rate *= 0.99;
        if (cry && !cry.pendingRemove) {
          cry.setRate(rate);
        }
        if (fusionCry && !fusionCry.pendingRemove) {
          fusionCry.setRate(rate);
        }
        if ((!cry || cry.pendingRemove) && (!fusionCry || fusionCry.pendingRemove)) {
          faintCryTimer?.destroy();
          faintCryTimer = null;
          if (callback) {
            callback();
          }
        }
      }
    });
    this.scene.time.delayedCall(Utils.fixedInt(3000), () => {
      if (!faintCryTimer || !this.scene) {
        return;
      }
      if (cry?.isPlaying) {
        cry.stop();
      }
      if (fusionCry?.isPlaying) {
        fusionCry.stop();
      }
      faintCryTimer.destroy();
      if (callback) {
        callback();
      }
    });
  }

  isOppositeGender(pokemon: Pokemon): boolean {
    return this.gender !== Gender.GENDERLESS && pokemon.gender === (this.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE);
  }

  canSetStatus(effect: StatusEffect | undefined, quiet: boolean = false, overrideStatus: boolean = false, sourcePokemon: Pokemon | null = null): boolean {
    if (effect !== StatusEffect.FAINT) {
      if (overrideStatus ? this.status?.effect === effect : this.status) {
        return false;
      }
      if (this.isGrounded() && this.scene.arena.terrain?.terrainType === TerrainType.MISTY) {
        return false;
      }
    }

    const types = this.getTypes(true, true);

    switch (effect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:

      const poisonImmunity = types.map(defType => {

        if (defType !== Type.POISON && defType !== Type.STEEL) {
          return false;
        }
        const cancelImmunity = new Utils.BooleanHolder(false);
        if (sourcePokemon) {
          applyAbAttrs(IgnoreTypeStatusEffectImmunityAbAttr, sourcePokemon, cancelImmunity, false, effect, defType);
          if (cancelImmunity.value) {
            return false;
          }
        }

        return true;
      });

      if (this.isOfType(Type.POISON) || this.isOfType(Type.STEEL)) {
        if (poisonImmunity.includes(true)) {
          return false;
        }
      }
      break;
    case StatusEffect.PARALYSIS:
      if (this.isOfType(Type.ELECTRIC)) {
        return false;
      }
      break;
    case StatusEffect.SLEEP:
      if (this.isGrounded() && this.scene.arena.terrain?.terrainType === TerrainType.ELECTRIC) {
        return false;
      }
      break;
    case StatusEffect.FREEZE:
      if (this.isOfType(Type.ICE) || (this.scene?.arena?.weather?.weatherType &&[WeatherType.SUNNY, WeatherType.HARSH_SUN].includes(this.scene.arena.weather.weatherType))) {
        return false;
      }
      break;
    case StatusEffect.BURN:
      if (this.isOfType(Type.FIRE)) {
        return false;
      }
      break;
    }

    const cancelled = new Utils.BooleanHolder(false);
    applyPreSetStatusAbAttrs(StatusEffectImmunityAbAttr, this, effect, cancelled, quiet);

    const userField = this.getAlliedField();
    userField.forEach(pokemon => applyPreSetStatusAbAttrs(UserFieldStatusEffectImmunityAbAttr, pokemon, effect, cancelled, quiet));

    if (cancelled.value) {
      return false;
    }

    return true;
  }

  trySetStatus(effect: StatusEffect | undefined, asPhase: boolean = false, sourcePokemon: Pokemon | null = null, cureTurn: integer | null = 0, sourceText: string | null = null): boolean {
    if (!this.canSetStatus(effect, asPhase, false, sourcePokemon)) {
      return false;
    }
    if (effect === StatusEffect.SLEEP || effect === StatusEffect.FREEZE) {
      this.stopMultiHit();
    }

    if (asPhase) {
      this.scene.unshiftPhase(new ObtainStatusEffectPhase(this.scene, this.getBattlerIndex(), effect, cureTurn, sourceText!, sourcePokemon!));
      return true;
    }

    let statusCureTurn: Utils.IntegerHolder;

    if (effect === StatusEffect.SLEEP) {
      statusCureTurn = new Utils.IntegerHolder(this.randSeedIntRange(2, 4));
      applyAbAttrs(ReduceStatusEffectDurationAbAttr, this, null, false, effect, statusCureTurn);

      this.setFrameRate(4);
      const invulnerableTags = [
        BattlerTagType.UNDERGROUND,
        BattlerTagType.UNDERWATER,
        BattlerTagType.HIDDEN,
        BattlerTagType.FLYING
      ];

      const tag = invulnerableTags.find((t) => this.getTag(t));

      if (tag) {
        this.removeTag(tag);
        this.getMoveQueue().pop();
      }
    }

    statusCureTurn = statusCureTurn!;
    effect = effect!;
    this.status = new Status(effect, 0, statusCureTurn?.value);

    if (effect !== StatusEffect.FAINT) {
      this.scene.triggerPokemonFormChange(this, SpeciesFormChangeStatusEffectTrigger, true);
    }

    return true;
  }
  resetStatus(revive: boolean = true, confusion: boolean = false, reloadAssets: boolean = false): void {
    const lastStatus = this.status?.effect;
    if (!revive && lastStatus === StatusEffect.FAINT) {
      return;
    }
    this.status = null;
    if (lastStatus === StatusEffect.SLEEP) {
      this.setFrameRate(12);
      if (this.getTag(BattlerTagType.NIGHTMARE)) {
        this.lapseTag(BattlerTagType.NIGHTMARE);
      }
    }
    if (confusion) {
      if (this.getTag(BattlerTagType.CONFUSED)) {
        this.lapseTag(BattlerTagType.CONFUSED);
      }
    }
    if (reloadAssets) {
      this.loadAssets(false).then(() => this.playAnim());
    }
  }

  primeSummonData(summonDataPrimer: PokemonSummonData): void {
    this.summonDataPrimer = summonDataPrimer;
  }

  resetSummonData(): void {
    if (this.summonData?.speciesForm) {
      this.summonData.speciesForm = null;
      this.updateFusionPalette();
    }
    this.summonData = new PokemonSummonData();

    this.fieldPosition = FieldPosition.CENTER;

    if (!this.battleData) {
      this.resetBattleData();
    }
    this.resetBattleSummonData();
    if (this.summonDataPrimer) {
      for (const k of Object.keys(this.summonData)) {
        if (this.summonDataPrimer[k]) {
          this.summonData[k] = this.summonDataPrimer[k];
        }
      }
      this.summonDataPrimer = null;
    }
    this.updateInfo();
  }

  resetBattleData(): void {
    this.battleData = new PokemonBattleData();
  }

  resetBattleSummonData(): void {
    this.battleSummonData = new PokemonBattleSummonData();
    if (this.getTag(BattlerTagType.SEEDED)) {
      this.lapseTag(BattlerTagType.SEEDED);
    }
    if (this.scene) {
      this.scene.triggerPokemonFormChange(this, SpeciesFormChangePostMoveTrigger, true);
    }
  }

  resetTurnData(): void {
    this.turnData = new PokemonTurnData();
  }

  getExpValue(): integer {

    return ((this.getSpeciesForm().getBaseExp() * this.level) / 5 + 1);
  }

  setFrameRate(frameRate: integer) {
    this.scene.anims.get(this.getBattleSpriteKey()).frameRate = frameRate;
    this.getSprite().play(this.getBattleSpriteKey());
    this.getTintSprite()?.play(this.getBattleSpriteKey());
  }

  tint(color: number, alpha?: number, duration?: integer, ease?: string) {
    const tintSprite = this.getTintSprite();
    tintSprite?.setTintFill(color);
    tintSprite?.setVisible(true);

    if (duration) {
      tintSprite?.setAlpha(0);

      this.scene.tweens.add({
        targets: tintSprite,
        alpha: alpha || 1,
        duration: duration,
        ease: ease || "Linear"
      });
    } else {
      tintSprite?.setAlpha(alpha);
    }
  }

  untint(duration: integer, ease?: string) {
    const tintSprite = this.getTintSprite();

    if (duration) {
      this.scene.tweens.add({
        targets: tintSprite,
        alpha: 0,
        duration: duration,
        ease: ease || "Linear",
        onComplete: () => {
          tintSprite?.setVisible(false);
          tintSprite?.setAlpha(1);
        }
      });
    } else {
      tintSprite?.setVisible(false);
      tintSprite?.setAlpha(1);
    }
  }

  enableMask() {
    if (!this.maskEnabled) {
      this.maskSprite = this.getTintSprite();
      this.maskSprite?.setVisible(true);
      this.maskSprite?.setPosition(this.x * this.parentContainer.scale + this.parentContainer.x,
        this.y * this.parentContainer.scale + this.parentContainer.y);
      this.maskSprite?.setScale(this.getSpriteScale() * this.parentContainer.scale);
      this.maskEnabled = true;
    }
  }

  disableMask() {
    if (this.maskEnabled) {
      this.maskSprite?.setVisible(false);
      this.maskSprite?.setPosition(0, 0);
      this.maskSprite?.setScale(this.getSpriteScale());
      this.maskSprite = null;
      this.maskEnabled = false;
    }
  }

  sparkle(): void {
    if (this.shinySparkle) {
      this.shinySparkle.play(`sparkle${this.variant ? `_${this.variant + 1}` : ""}`);
      this.scene.playSound("se/sparkle");
    }
  }

  updateFusionPalette(ignoreOveride?: boolean): void {
    if (!this.getFusionSpeciesForm(ignoreOveride)) {
      [ this.getSprite(), this.getTintSprite() ].filter(s => !!s).map(s => {
        s.pipelineData[`spriteColors${ignoreOveride && this.summonData?.speciesForm ? "Base" : ""}`] = [];
        s.pipelineData[`fusionSpriteColors${ignoreOveride && this.summonData?.speciesForm ? "Base" : ""}`] = [];
      });
      return;
    }

    const speciesForm = this.getSpeciesForm(ignoreOveride);
    const fusionSpeciesForm = this.getFusionSpeciesForm(ignoreOveride);

    const spriteKey = speciesForm.getSpriteKey(this.getGender(ignoreOveride) === Gender.FEMALE, speciesForm.formIndex, this.shiny, this.variant);
    const backSpriteKey = speciesForm.getSpriteKey(this.getGender(ignoreOveride) === Gender.FEMALE, speciesForm.formIndex, this.shiny, this.variant).replace("pkmn__", "pkmn__back__");
    const fusionSpriteKey = fusionSpeciesForm.getSpriteKey(this.getFusionGender(ignoreOveride) === Gender.FEMALE, fusionSpeciesForm.formIndex, this.fusionShiny, this.fusionVariant);
    const fusionBackSpriteKey = fusionSpeciesForm.getSpriteKey(this.getFusionGender(ignoreOveride) === Gender.FEMALE, fusionSpeciesForm.formIndex, this.fusionShiny, this.fusionVariant).replace("pkmn__", "pkmn__back__");

    const sourceTexture = this.scene.textures.get(spriteKey);
    const sourceBackTexture = this.scene.textures.get(backSpriteKey);
    const fusionTexture = this.scene.textures.get(fusionSpriteKey);
    const fusionBackTexture = this.scene.textures.get(fusionBackSpriteKey);

    const [ sourceFrame, sourceBackFrame, fusionFrame, fusionBackFrame ] = [ sourceTexture, sourceBackTexture, fusionTexture, fusionBackTexture ].map(texture => texture.frames[texture.firstFrame]);
    const [ sourceImage, sourceBackImage, fusionImage, fusionBackImage ] = [ sourceTexture, sourceBackTexture, fusionTexture, fusionBackTexture ].map(i => i.getSourceImage() as HTMLImageElement);

    const canvas = document.createElement("canvas");
    const backCanvas = document.createElement("canvas");
    const fusionCanvas = document.createElement("canvas");
    const fusionBackCanvas = document.createElement("canvas");

    const spriteColors: integer[][] = [];
    const pixelData: Uint8ClampedArray[] = [];

    [ canvas, backCanvas, fusionCanvas, fusionBackCanvas ].forEach((canv: HTMLCanvasElement, c: integer) => {
      const context = canv.getContext("2d");
      const frame = [ sourceFrame, sourceBackFrame, fusionFrame, fusionBackFrame ][c];
      canv.width = frame.width;
      canv.height = frame.height;

      if (context) {
      context.drawImage([ sourceImage, sourceBackImage, fusionImage, fusionBackImage ][c], frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
      const imageData = context.getImageData(frame.cutX, frame.cutY, frame.width, frame.height);
      pixelData.push(imageData.data);
      }
    });

    for (let f = 0; f < 2; f++) {
      const variantColors = variantColorCache[!f ? spriteKey : backSpriteKey];
      const variantColorSet = new Map<integer, integer[]>();
      if (this.shiny && variantColors && variantColors[this.variant]) {
        Object.keys(variantColors[this.variant]).forEach(k => {
          variantColorSet.set(Utils.rgbaToInt(Array.from(Object.values(Utils.rgbHexToRgba(k)))), Array.from(Object.values(Utils.rgbHexToRgba(variantColors[this.variant][k]))));
        });
      }

      for (let i = 0; i < pixelData[f].length; i += 4) {
        if (pixelData[f][i + 3]) {
          const pixel = pixelData[f].slice(i, i + 4);
          let [ r, g, b, a ] = pixel;
          if (variantColors) {
            const color = Utils.rgbaToInt([r, g, b, a]);
            if (variantColorSet.has(color)) {
              const mappedPixel = variantColorSet.get(color);
              if (mappedPixel) {
              [ r, g, b, a ] = mappedPixel;
            }
          }
          }
          if (!spriteColors.find(c => c[0] === r && c[1] === g && c[2] === b)) {
            spriteColors.push([ r, g, b, a ]);
          }
        }
      }
    }

    const fusionSpriteColors = JSON.parse(JSON.stringify(spriteColors));

    const pixelColors: number[] = [];
    for (let f = 0; f < 2; f++) {
      for (let i = 0; i < pixelData[f].length; i += 4) {
        const total = pixelData[f].slice(i, i + 3).reduce((total: integer, value: integer) => total + value, 0);
        if (!total) {
          continue;
        }
        pixelColors.push(argbFromRgba({ r: pixelData[f][i], g: pixelData[f][i + 1], b: pixelData[f][i + 2], a: pixelData[f][i + 3] }));
      }
    }

    const fusionPixelColors : number[] = [];
    for (let f = 0; f < 2; f++) {
      const variantColors = variantColorCache[!f ? fusionSpriteKey : fusionBackSpriteKey];
      const variantColorSet = new Map<integer, integer[]>();
      if (this.fusionShiny && variantColors && variantColors[this.fusionVariant]) {
        Object.keys(variantColors[this.fusionVariant]).forEach(k => {
          variantColorSet.set(Utils.rgbaToInt(Array.from(Object.values(Utils.rgbHexToRgba(k)))), Array.from(Object.values(Utils.rgbHexToRgba(variantColors[this.fusionVariant][k]))));
        });
      }
      for (let i = 0; i < pixelData[2 + f].length; i += 4) {
        const total = pixelData[2 + f].slice(i, i + 3).reduce((total: integer, value: integer) => total + value, 0);
        if (!total) {
          continue;
        }
        let [ r, g, b, a ] = [ pixelData[2 + f][i], pixelData[2 + f][i + 1], pixelData[2 + f][i + 2], pixelData[2 + f][i + 3] ];
        if (variantColors) {
          const color = Utils.rgbaToInt([r, g, b, a]);
          if (variantColorSet.has(color)) {
            const mappedPixel = variantColorSet.get(color);
            if (mappedPixel) {
            [ r, g, b, a ] = mappedPixel;
          }
        }
        }
        fusionPixelColors.push(argbFromRgba({ r, g, b, a }));
      }
    }

    let paletteColors: Map<number, number>;
    let fusionPaletteColors: Map<number, number>;

    const originalRandom = Math.random;
    Math.random = () => Phaser.Math.RND.realInRange(0, 1);

    this.scene.executeWithSeedOffset(() => {
      paletteColors = QuantizerCelebi.quantize(pixelColors, 4);
      fusionPaletteColors = QuantizerCelebi.quantize(fusionPixelColors, 4);
    }, 0, "This result should not vary");

    Math.random = originalRandom;

    paletteColors = paletteColors!;
    fusionPaletteColors = fusionPaletteColors!;
    const [ palette, fusionPalette ] = [ paletteColors, fusionPaletteColors ]
      .map(paletteColors => {
        let keys = Array.from(paletteColors.keys()).sort((a: integer, b: integer) => paletteColors.get(a)! < paletteColors.get(b)! ? 1 : -1);
        let rgbaColors: Map<number, integer[]>;
        let hsvColors: Map<number, number[]>;

        const mappedColors = new Map<integer, integer[]>();

        do {
          mappedColors.clear();

          rgbaColors = keys.reduce((map: Map<number, integer[]>, k: number) => {
            map.set(k, Object.values(rgbaFromArgb(k))); return map;
          }, new Map<number, integer[]>());
          hsvColors = Array.from(rgbaColors.keys()).reduce((map: Map<number, number[]>, k: number) => {
            const rgb = rgbaColors.get(k)!.slice(0, 3);
            map.set(k, Utils.rgbToHsv(rgb[0], rgb[1], rgb[2]));
            return map;
          }, new Map<number, number[]>());

          for (let c = keys.length - 1; c >= 0; c--) {
            const hsv = hsvColors.get(keys[c])!;
            for (let c2 = 0; c2 < c; c2++) {
              const hsv2 = hsvColors.get(keys[c2])!;
              const diff = Math.abs(hsv[0] - hsv2[0]);
              if (diff < 30 || diff >= 330) {
                if (mappedColors.has(keys[c])) {
                  mappedColors.get(keys[c])!.push(keys[c2]);
                } else {
                  mappedColors.set(keys[c], [ keys[c2] ]);
                }
                break;
              }
            }
          }

          mappedColors.forEach((values: integer[], key: integer) => {
            const keyColor = rgbaColors.get(key)!;
            const valueColors = values.map(v => rgbaColors.get(v)!);
            const color = keyColor.slice(0);
            let count = paletteColors.get(key)!;
            for (const value of values) {
              const valueCount = paletteColors.get(value);
              if (!valueCount) {
                continue;
              }
              count += valueCount;
            }

            for (let c = 0; c < 3; c++) {
              color[c] *= (paletteColors.get(key)! / count);
              values.forEach((value: integer, i: integer) => {
                if (paletteColors.has(value)) {
                  const valueCount = paletteColors.get(value)!;
                  color[c] += valueColors[i][c] * (valueCount / count);
                }
              });
              color[c] = Math.round(color[c]);
            }

            paletteColors.delete(key);
            for (const value of values) {
              paletteColors.delete(value);
              if (mappedColors.has(value)) {
                mappedColors.delete(value);
              }
            }

            paletteColors.set(argbFromRgba({ r: color[0], g: color[1], b: color[2], a: color[3] }), count);
          });

          keys = Array.from(paletteColors.keys()).sort((a: integer, b: integer) => paletteColors.get(a)! < paletteColors.get(b)! ? 1 : -1);
        } while (mappedColors.size);

        return keys.map(c => Object.values(rgbaFromArgb(c)));
      }
      );

    const paletteDeltas: number[][] = [];

    spriteColors.forEach((sc: integer[], i: integer) => {
      paletteDeltas.push([]);
      for (let p = 0; p < palette.length; p++) {
        paletteDeltas[i].push(Utils.deltaRgb(sc, palette[p]));
      }
    });

    const easeFunc = Phaser.Tweens.Builders.GetEaseFunction("Cubic.easeIn");

    for (let sc = 0; sc < spriteColors.length; sc++) {
      const delta = Math.min(...paletteDeltas[sc]);
      const paletteIndex = Math.min(paletteDeltas[sc].findIndex(pd => pd === delta), fusionPalette.length - 1);
      if (delta < 255) {
        const ratio = easeFunc(delta / 255);
        const color = [ 0, 0, 0, fusionSpriteColors[sc][3] ];
        for (let c = 0; c < 3; c++) {
          color[c] = Math.round((fusionSpriteColors[sc][c] * ratio) + (fusionPalette[paletteIndex][c] * (1 - ratio)));
        }
        fusionSpriteColors[sc] = color;
      }
    }

    [ this.getSprite(), this.getTintSprite() ].filter(s => !!s).map(s => {
      s.pipelineData[`spriteColors${ignoreOveride && this.summonData?.speciesForm ? "Base" : ""}`] = spriteColors;
      s.pipelineData[`fusionSpriteColors${ignoreOveride && this.summonData?.speciesForm ? "Base" : ""}`] = fusionSpriteColors;
    });

    canvas.remove();
    fusionCanvas.remove();
  }

  extractActualSpriteColors(spriteKey: string): Map<string, number[]> {
    const texture = this.scene.textures.get(spriteKey);
    if (!texture || !texture.frames[texture.firstFrame]) {
      console.warn(`❌ Cannot extract colors: sprite ${spriteKey} not loaded`);
      return new Map();
    }

    const frame = texture.frames[texture.firstFrame];
    const image = texture.getSourceImage() as HTMLImageElement;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn(`❌ Cannot create canvas context`);
      return new Map();
    }

    canvas.width = frame.width;
    canvas.height = frame.height;

    ctx.drawImage(image, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
    const imageData = ctx.getImageData(0, 0, frame.width, frame.height);

    const colorMap = new Map<string, number[]>();
    const colorFrequency = new Map<string, number>();

    for (let i = 0; i < imageData.data.length; i += 4) {
      const [r, g, b, a] = [
        imageData.data[i],
        imageData.data[i + 1],
        imageData.data[i + 2],
        imageData.data[i + 3]
      ];

      if (a > 0) {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

        if (!colorMap.has(hex)) {
          colorMap.set(hex, [r, g, b, a]);
          colorFrequency.set(hex, 1);
        } else {
          colorFrequency.set(hex, (colorFrequency.get(hex) || 0) + 1);
        }
      }
    }

    console.log(`🎨 Extracted ${colorMap.size} unique colors from ${spriteKey}`);
    const sortedColors = Array.from(colorMap.entries()).sort((a, b) => (colorFrequency.get(b[0]) || 0) - (colorFrequency.get(a[0]) || 0));
    console.log("📊 Top 20 most common colors:");
    sortedColors.slice(0, 20).forEach(([hex, rgba], idx) => {
      console.log(`  [${idx}] ${hex} → RGBA[${rgba.join(', ')}] (${colorFrequency.get(hex)} pixels)`);
    });

    canvas.remove();
    return colorMap;
  }

  private getMaxMoveLevelForAltBuildRank(rank?: number): number {
    if (!rank) return 25;
    if (rank >= 4) return 75;
    if (rank >= 2) return 50;
    return 25;
  }

  updateAltBuildPalette(altBuild: any): void {
    if (!altBuild.spriteColorPalette) {
      return;
    }

    const palette = altBuild.spriteColorPalette;
    const spriteKey = this.getSpriteKey();
    const backSpriteKey = spriteKey.replace("pkmn__", "pkmn__back__");

    const sourceTexture = this.scene.textures.get(spriteKey);
    const sourceBackTexture = this.scene.textures.get(backSpriteKey);

    if (!sourceTexture || !sourceBackTexture) {
      return;
    }

    const [sourceFrame, sourceBackFrame] = [sourceTexture, sourceBackTexture].map(t => t.frames[t.firstFrame]);
    const [sourceImage, sourceBackImage] = [sourceTexture, sourceBackTexture].map(t => t.getSourceImage() as HTMLImageElement);

    const canvas = document.createElement("canvas");
    const backCanvas = document.createElement("canvas");

    const extractColorsFromCanvas = (canv: HTMLCanvasElement, frame: any, image: HTMLImageElement): Set<string> => {
      const ctx = canv.getContext("2d");
      if (!ctx) return new Set();

      canv.width = frame.width;
      canv.height = frame.height;
      ctx.drawImage(image, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
      const imageData = ctx.getImageData(0, 0, frame.width, frame.height);

      const colorSet = new Set<string>();
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3]) {
          const hex = `#${imageData.data[i].toString(16).padStart(2, '0')}${imageData.data[i + 1].toString(16).padStart(2, '0')}${imageData.data[i + 2].toString(16).padStart(2, '0')}`.toUpperCase();
          colorSet.add(hex);
        }
      }
      return colorSet;
    };

    const allColors = new Set([
      ...extractColorsFromCanvas(canvas, sourceFrame, sourceImage),
      ...extractColorsFromCanvas(backCanvas, sourceBackFrame, sourceBackImage)
    ]);

    const altBuildSpriteColors: number[][] = [];
    const altBuildTargetColors: number[][] = [];

    const hexToRgba = (hex: string): number[] => {
      hex = hex.replace(/^#/, '');
      return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
        255
      ];
    };

    const pixelColors: number[] = [];
    for (let f = 0; f < 2; f++) {
      const frame = [sourceFrame, sourceBackFrame][f];
      const canv = [canvas, backCanvas][f];
      const context = canv.getContext("2d");
      if (!context) continue;

      const imageData = context.getImageData(0, 0, frame.width, frame.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const total = imageData.data.slice(i, i + 3).reduce((total: integer, value: integer) => total + value, 0);
        if (!total) continue;
        pixelColors.push(argbFromRgba({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2], a: imageData.data[i + 3] }));
      }
    }

    const originalRandom = Math.random;
    Math.random = () => Phaser.Math.RND.realInRange(0, 1);

    let paletteColors: Map<number, number>;
    this.scene.executeWithSeedOffset(() => {
      paletteColors = QuantizerCelebi.quantize(pixelColors, 4);
    }, 0, "Alt build palette quantization");

    Math.random = originalRandom;

    const quantizedPalette = Array.from(paletteColors!.keys())
      .sort((a: integer, b: integer) => paletteColors!.get(a)! < paletteColors!.get(b)! ? 1 : -1)
      .map(c => Object.values(rgbaFromArgb(c)));

    const targetPaletteRgba = palette.targetPalette.map((hex: string) => {
      hex = hex.replace(/^#/, '');
      return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
        255
      ];
    });

    const spriteColors: integer[][] = [];
    for (const color of allColors) {
      const rgba = hexToRgba(color);
      spriteColors.push(rgba);
    }

    const paletteDeltas: number[][] = [];
    spriteColors.forEach((sc: integer[], i: integer) => {
      paletteDeltas.push([]);
      for (let p = 0; p < quantizedPalette.length; p++) {
        paletteDeltas[i].push(Utils.deltaRgb(sc, quantizedPalette[p] as number[]));
      }
    });

    const easeFunc = Phaser.Tweens.Builders.GetEaseFunction("Cubic.easeIn");

    for (let sc = 0; sc < spriteColors.length; sc++) {
      const delta = Math.min(...paletteDeltas[sc]);
      const paletteIndex = Math.min(paletteDeltas[sc].findIndex(pd => pd === delta), targetPaletteRgba.length - 1);
      if (delta < 255) {
        const ratio = easeFunc(delta / 255);
        const color = [0, 0, 0, spriteColors[sc][3]];
        for (let c = 0; c < 3; c++) {
          color[c] = Math.round((spriteColors[sc][c] * ratio) + (targetPaletteRgba[paletteIndex][c] * (1 - ratio)));
        }

        altBuildSpriteColors.push(spriteColors[sc]);
        altBuildTargetColors.push(color);
      }
    }

    this.altBuildSpriteColors = altBuildSpriteColors;
    this.altBuildTargetColors = altBuildTargetColors;
    this.altBuildBlendMode = palette.blendMode || 'grayscale_overlay';
    this.altBuildInversionFactor = altBuild.inversionFactor || 0.0;

    [this.getSprite(), this.getTintSprite()].filter(s => !!s).map(s => {
      s.pipelineData["altBuildSpriteColors"] = altBuildSpriteColors;
      s.pipelineData["altBuildTargetColors"] = altBuildTargetColors;
      s.pipelineData["altBuildBlendMode"] = palette.blendMode || 'grayscale_overlay';
      s.pipelineData["altBuildInversionFactor"] = this.altBuildInversionFactor;
    });

    canvas.remove();
    backCanvas.remove();
  }

  randSeedInt(range: integer, min: integer = 0): integer {
    return this.scene.currentBattle
      ? this.scene.randBattleSeedInt(range, min)
      : Utils.randSeedInt(range, min);
  }

  randSeedIntRange(min: integer, max: integer): integer {
    return this.randSeedInt((max - min) + 1, min);
  }
  leaveField(clearEffects: boolean = true, hideInfo: boolean = true) {
    this.resetTurnData();
    if (clearEffects) {
      this.resetSummonData();
      this.resetBattleData();
    }
    if (hideInfo) {
      this.hideInfo();
    }
    this.setVisible(false);
    this.scene.field.remove(this);
    this.scene.triggerPokemonFormChange(this, SpeciesFormChangeActiveTrigger, true);
  }

  destroy(removeTexture: boolean = false): void {
    this.battleInfo?.destroy();
    if (isIPhone() && removeTexture) {
      const keys: string[] = [];
      keys.push(this.getBattleSpriteKey());
      if (this.getFusionSpeciesForm()) {
        keys.push(this.getFusionBattleSpriteKey());
      }
      keys.forEach(key => {
        this.removeTextureCompletely(key);
      });
    }
    super.destroy();
  }

  private removeTextureCompletely(key: string): void {
    if (!this.scene) return;

    if (this.scene.anims.exists(key)) {
      this.scene.anims.remove(key);
    }

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    if (this.scene.cache.json.exists(key)) {
      this.scene.cache.json.remove(key);
    }
  }

  getBattleInfo(): BattleInfo {
    return this.battleInfo;
  }
  hasSameAbilityInRootForm(abilityIndex: number): boolean {
    const currentAbilityIndex = this.abilityIndex;
    const rootForm = getPokemonSpecies(this.species.getRootSpeciesId());
    return rootForm.getAbility(abilityIndex) === rootForm.getAbility(currentAbilityIndex);
  }
  hasGlitchForm(): boolean {
    const hasGlitchFormInSpecies = this.species.forms?.some(form => isGlitchFormKey(form.formKey));
    if (hasGlitchFormInSpecies) {
      return true;
    }
    return false;
  }

  isGlitchForm(): boolean {
     if (!this.species.forms?.length) {
      return false;
    }
    const currentForm = this.species.forms[this.formIndex];
    return currentForm.isGlitchForm(currentForm.getFormKey());
  }

  isSmittyForm(): boolean {
    if (!this.species.forms?.length) {
      return false;
    }
    const currentForm = this.species.forms[this.formIndex];
    return currentForm.isSmittyForm(currentForm.getFormKey());
  }

  isGlitchOrSmittyForm(): boolean {
    if (!this.species.forms?.length) {
      return false;
    }
    const currentForm = this.species.forms[this.formIndex];
    return currentForm.isGlitchOrSmittyForm(currentForm.getFormKey());
  }

  toggleShadow(hasShadow: boolean): void {
    const sprite = this.getSprite();
    if (sprite) {
      sprite.setPipeline(this.scene.spritePipeline, {
        ...sprite.pipelineData,
        hasShadow: hasShadow && !this.isGlitchOrSmittyForm() && !this.isShadowlessMegaForm()
      });
    }
  }
  public checkAndAddUniversalSmittyForms() : SpeciesFormChange | null {
    return checkAndAddUniversalSmittyForms(this);
  }
  public assignSmittyPassiveAbility(): void {
    const existingModifier = this.scene.findModifier(m =>
        m instanceof AnyPassiveAbilityModifier &&
        m.pokemonId === this.id
    );
    if (existingModifier) {
      this.scene.removeModifier(existingModifier);
    }

    const generator = modifierTypes.ANY_PASSIVE_ABILITY();
    generator.withIdFromFunc(modifierTypes.ANY_PASSIVE_ABILITY);

    const modifierType = generator.generateType([this]);

    if (modifierType) {
      const modifier = modifierType.newModifier(this);
      if (modifier) {
        this.scene.addModifier(modifier);
      }
    }
  }

  public makeSpeciesUnique(): PokemonSpecies {
    if (this.species.unique) {
      return this.species;
    }
    const originalSpecies = this.species;
    const species = new PokemonSpecies(
        originalSpecies.speciesId,
        originalSpecies.generation,
        originalSpecies.subLegendary || false,
        originalSpecies.legendary || false,
        originalSpecies.mythical || false,
        originalSpecies.species || "",
        originalSpecies.type1,
        originalSpecies.type2,
        originalSpecies.height,
        originalSpecies.weight,
        originalSpecies.ability1,
        originalSpecies.ability2,
        originalSpecies.abilityHidden,
        originalSpecies.baseTotal,
        originalSpecies.baseStats[0],
        originalSpecies.baseStats[1],
        originalSpecies.baseStats[2],
        originalSpecies.baseStats[3],
        originalSpecies.baseStats[4],
        originalSpecies.baseStats[5],
        originalSpecies.catchRate,
        originalSpecies.baseFriendship,
        originalSpecies.baseExp,
        originalSpecies.growthRate,
        originalSpecies.malePercent,
        originalSpecies.genderDiffs || false,
        originalSpecies.canChangeForm
    );

    species.name = originalSpecies.name;
    species.obtainedFusionSpecies = [...(originalSpecies.obtainedFusionSpecies || [])];
    species.fusionIndex = originalSpecies.fusionIndex || 0;

    species.forms = originalSpecies.forms.map(form => {
            const newForm = new PokemonForm(
                form.formName,
                form.formKey,
                form.type1,
                form.type2,
                form.height,
                form.weight,
                form.ability1,
                form.ability2,
                form.abilityHidden,
                form.baseTotal,
                form.baseStats[0],
                form.baseStats[1],
                form.baseStats[2],
                form.baseStats[3],
                form.baseStats[4],
                form.baseStats[5],
                form.catchRate,
                form.baseFriendship,
                form.baseExp,
                form.genderDiffs,
                form.formSpriteKey,
                form.isStarterSelectable
            );
            newForm.speciesId = form.speciesId;
            newForm.formIndex = form.formIndex;
            newForm.generation = form.generation;
            return newForm;
        });

    this.species = species;
    this.species.unique = true;
    return species;
  }
}

export default interface Pokemon {
  scene: BattleScene
}

export class PlayerPokemon extends Pokemon {
  public compatibleTms: Moves[];

  constructor(scene: BattleScene, species: PokemonSpecies, level: integer, abilityIndex?: integer, formIndex?: integer, gender?: Gender, shiny?: boolean, variant?: Variant, ivs?: integer[], nature?: Nature, dataSource?: Pokemon | PokemonData) {
    super(scene, 106, 148, species, level, abilityIndex, formIndex, gender, shiny, variant, ivs, nature, dataSource);

    if (Overrides.STATUS_OVERRIDE) {
      this.status = new Status(Overrides.STATUS_OVERRIDE);
    }

    if (Overrides.SHINY_OVERRIDE) {
      this.shiny = true;
      this.initShinySparkle();
      if (Overrides.VARIANT_OVERRIDE) {
        this.variant = Overrides.VARIANT_OVERRIDE;
      }
    }

    if (!dataSource) {

      this.generateAndPopulateMoveset();
    }
    this.generateCompatibleTms();
  }

  initBattleInfo(): void {
    this.battleInfo = new PlayerBattleInfo(this.scene);
    this.battleInfo.initInfo(this);
  }

  isPlayer(): boolean {
    return true;
  }

  hasTrainer(): boolean {
    return true;
  }

  isBoss(): boolean {
    return false;
  }

  getFieldIndex(): integer {
    return this.scene.getPlayerField().indexOf(this);
  }

  getBattlerIndex(): BattlerIndex {
    return this.getFieldIndex();
  }

  generateCompatibleTms(): void {
    this.compatibleTms = [];

    const allTmKeys = new Set([...Object.keys(tmSpecies), ...Object.keys(tmPoolTiers)]);
    for (const tm of allTmKeys) {
      const moveId = parseInt(tm) as Moves;
      let compatible = false;
      if (tmSpecies[tm]) {
        for (const p of tmSpecies[tm]) {
          if (Array.isArray(p)) {
            if (p[0] === this.species.speciesId || (this.fusionSpecies && p[0] === this.fusionSpecies.speciesId) && p.slice(1).indexOf(this.species.forms[this.formIndex]) > -1) {
              compatible = true;
              break;
            }
          } else if (p === this.species.speciesId || (this.fusionSpecies && p === this.fusionSpecies.speciesId)) {
            compatible = true;
            break;
          }
        }
      }
      if (!compatible) {
        const moveType = allMoves[moveId]?.type;
        if (moveType !== undefined && moveType !== Type.UNKNOWN) {
          if (this.isOfType(moveType, false, false, true)) {
            compatible = true;
          }
        }
      }
      if (reverseCompatibleTms.indexOf(moveId) > -1) {
        compatible = !compatible;
      }
      if (compatible) {
        this.compatibleTms.push(moveId);
      }
    }
  }

  tryPopulateMoveset(moveset: StarterMoveset): boolean {

    if (!this.getSpeciesForm().validateStarterMoveset(moveset, this.scene.gameData.starterData[this.species.getRootSpeciesId()].eggMoves) && !this.isFusion()) {
      return false;
    }

    this.moveset = moveset.map(m => new PokemonMove(m));

    return true;
  }
  switchOut(batonPass: boolean): Promise<void> {
    return new Promise(resolve => {
      this.leaveField(!batonPass);

      this.scene.ui.setMode(Mode.PARTY, PartyUiMode.FAINT_SWITCH, this.getFieldIndex(), (slotIndex: integer, option: PartyOption) => {
        if (slotIndex >= this.scene.currentBattle.getBattlerCount() && slotIndex < 6) {
          this.scene.prependToPhase(new SwitchSummonPhase(this.scene, this.getFieldIndex(), slotIndex, false, batonPass), MoveEndPhase);
        }
        this.scene.ui.setMode(Mode.MESSAGE).then(resolve);
      }, PartyUiHandler.FilterNonFainted);
    });
  }

  addFriendship(friendship: integer): void {
    const starterSpeciesId = this.species.getRootSpeciesId();
    const fusionStarterSpeciesId = this.isFusion() && this.fusionSpecies ? this.fusionSpecies.getRootSpeciesId() : 0;
    const starterData = [
      this.scene.gameData.starterData[starterSpeciesId],
      fusionStarterSpeciesId ? this.scene.gameData.starterData[fusionStarterSpeciesId] : null
    ].filter(d => !!d);
    const amount = new Utils.IntegerHolder(friendship);
    const starterAmount = new Utils.IntegerHolder(Math.floor(friendship * (this.scene.gameMode.isClassic && friendship > 0 ? 2 : 1) / (fusionStarterSpeciesId ? 2 : 1)));
    if (amount.value > 0) {
      this.scene.applyModifier(PokemonFriendshipBoosterModifier, true, this, amount);
      this.scene.applyModifier(PokemonFriendshipBoosterModifier, true, this, starterAmount);

      this.friendship = Math.min(this.friendship + amount.value, 255);
      if (this.friendship === 255) {
        this.scene.validateAchv(achvs.MAX_FRIENDSHIP);
      }
      starterData.forEach((sd: StarterDataEntry, i: integer) => {
        const speciesId = !i ? starterSpeciesId : fusionStarterSpeciesId as Species;
        sd.friendship = (sd.friendship || 0) + starterAmount.value;
        if (sd.friendship >= getStarterValueFriendshipCap(speciesStarters[speciesId])) {
          this.scene.gameData.addStarterCandy(getPokemonSpecies(speciesId), 1);
          sd.friendship = 0;
        }
      });
    } else {
      this.friendship = Math.max(this.friendship + amount.value, 0);
      for (const sd of starterData) {
        sd.friendship = Math.max((sd.friendship || 0) + starterAmount.value, 0);
      }
    }
  }

  revivalBlessing(): Promise<void> {
    return new Promise(resolve => {
      this.scene.ui.setMode(Mode.PARTY, PartyUiMode.REVIVAL_BLESSING, this.getFieldIndex(), (slotIndex:integer, option: PartyOption) => {
        if (slotIndex >= 0 && slotIndex<6) {
          const pokemon = this.scene.getParty()[slotIndex];
          if (!pokemon || !pokemon.isFainted()) {
            resolve();
          }

          pokemon.resetTurnData();
          pokemon.resetStatus();
          pokemon.heal(Math.min(Utils.toDmgValue(0.5 * pokemon.getMaxHp()), pokemon.getMaxHp()));
          this.scene.queueMessage(i18next.t("moveTriggers:revivalBlessing", {pokemonName: pokemon.name}), 0, true);

          if (this.scene.currentBattle.double && this.scene.getParty().length > 1) {
            const allyPokemon = this.getAlly();
            if (slotIndex<=1) {

              this.scene.unshiftPhase(new SwitchSummonPhase(this.scene, pokemon.getFieldIndex(), slotIndex, false, false, true));
              this.scene.unshiftPhase(new ToggleDoublePositionPhase(this.scene, true));
            } else if (allyPokemon.isFainted()) {

              this.scene.unshiftPhase(new SwitchSummonPhase(this.scene, allyPokemon.getFieldIndex(), slotIndex, false, false, true));
              this.scene.unshiftPhase(new ToggleDoublePositionPhase(this.scene, true));
            }
          }

        }
        this.scene.ui.setMode(Mode.MESSAGE).then(() => resolve());
      }, PartyUiHandler.FilterFainted);
    });
  }

  getPossibleEvolution(evolution: SpeciesFormEvolution | null): Promise<Pokemon> {
    if (!evolution) {
      return new Promise(resolve => resolve(this));
    }
    return new Promise(resolve => {
      const evolutionSpecies = getPokemonSpecies(evolution.speciesId);
      const isFusion = evolution instanceof FusionSpeciesFormEvolution;
      let ret: PlayerPokemon;
      if (isFusion) {
        const originalFusionSpecies = this.fusionSpecies;
        const originalFusionFormIndex = this.fusionFormIndex;
        this.fusionSpecies = evolutionSpecies;
        this.fusionFormIndex = evolution.evoFormKey !== null ? Math.max(evolutionSpecies.forms.findIndex(f => f.formKey === evolution.evoFormKey), 0) : this.fusionFormIndex;
        ret = this.scene.addPlayerPokemon(this.species, this.level, this.abilityIndex, this.formIndex, this.gender, this.shiny, this.variant, this.ivs, this.nature, this);
        this.fusionSpecies = originalFusionSpecies;
        this.fusionFormIndex = originalFusionFormIndex;
      } else {
        const formIndex = evolution.evoFormKey !== null && !isFusion ? Math.max(evolutionSpecies.forms.findIndex(f => f.formKey === evolution.evoFormKey), 0) : this.formIndex;
        ret = this.scene.addPlayerPokemon(!isFusion ? evolutionSpecies : this.species, this.level, this.abilityIndex, formIndex, this.gender, this.shiny, this.variant, this.ivs, this.nature, this);
      }
      ret.loadAssets().then(() => resolve(ret));
    });
  }

  evolve(evolution: SpeciesFormEvolution | null, preEvolution: PokemonSpeciesForm): Promise<void> {
    if (!evolution) {
      return new Promise(resolve => resolve());
    }
    return new Promise(resolve => {
      this.pauseEvolutions = false;

      this.handleSpecialEvolutions(evolution);
      const isFusion = evolution instanceof FusionSpeciesFormEvolution;
      if (!isFusion) {
        this.species = getPokemonSpecies(evolution.speciesId);
      } else {
        this.fusionSpecies = getPokemonSpecies(evolution.speciesId);
      }
      if (evolution.preFormKey !== null) {
        const formIndex = Math.max((!isFusion || !this.fusionSpecies ? this.species : this.fusionSpecies).forms.findIndex(f => f.formKey === evolution.evoFormKey), 0);
        if (!isFusion) {
          this.formIndex = formIndex;
        } else {
          this.fusionFormIndex = formIndex;
        }
      }
      this.generateName();
      if (!isFusion) {
        const abilityCount = this.getSpeciesForm().getAbilityCount();
        const preEvoAbilityCount = preEvolution.getAbilityCount();
        if ([0, 1, 2].includes(this.abilityIndex)) {

          if (this.abilityIndex === 2 && preEvoAbilityCount === 3 && abilityCount === 2) {
            this.abilityIndex = 1;
          }
        } else {
          console.warn("this.abilityIndex is somehow an illegal value, please report this");
          console.warn(this.abilityIndex);
          this.abilityIndex = 0;
        }
      } else {
        const abilityCount = this.getFusionSpeciesForm().getAbilityCount();
        const preEvoAbilityCount = preEvolution.getAbilityCount();
        if ([0, 1, 2].includes(this.fusionAbilityIndex)) {
          if (this.fusionAbilityIndex === 2 && preEvoAbilityCount === 3 && abilityCount === 2) {
            this.fusionAbilityIndex = 1;
        }
      } else {
          console.warn("this.fusionAbilityIndex is somehow an illegal value, please report this");
          console.warn(this.fusionAbilityIndex);
          this.fusionAbilityIndex = 0;
        }
      }
      this.compatibleTms.splice(0, this.compatibleTms.length);
      this.generateCompatibleTms();
      const updateAndResolve = () => {
        this.loadAssets().then(() => {
          this.calculateStats();
          this.updateInfo(true).then(() => resolve());
        });
      };
      if (!this.scene.gameMode.isDaily || this.metBiome > -1) {
        this.scene.gameData.updateSpeciesDexIvs(this.species.speciesId, this.ivs);
        this.scene.gameData.setPokemonSeen(this, false);
        this.scene.gameData.setPokemonCaught(this, false).then(() => updateAndResolve());
      } else {
        updateAndResolve();
      }
    });
  }

  private handleSpecialEvolutions(evolution: SpeciesFormEvolution) {
    const isFusion = evolution instanceof FusionSpeciesFormEvolution;

    const evoSpecies = (!isFusion ? this.species : this.fusionSpecies);
    if (evoSpecies?.speciesId === Species.NINCADA && evolution.speciesId === Species.NINJASK) {
      const newEvolution = pokemonEvolutions[evoSpecies.speciesId][1];

      if (newEvolution.condition?.predicate(this)) {
        const newPokemon = this.scene.addPlayerPokemon(this.species, this.level, this.abilityIndex, this.formIndex, undefined, this.shiny, this.variant, this.ivs, this.nature);
        newPokemon.natureOverride = this.natureOverride;
        newPokemon.passive = this.passive;
        newPokemon.moveset = this.moveset.slice();
        newPokemon.moveset = this.copyMoveset();
        newPokemon.luck = this.luck;
        newPokemon.fusionSpecies = this.fusionSpecies;
        newPokemon.fusionFormIndex = this.fusionFormIndex;
        newPokemon.fusionAbilityIndex = this.fusionAbilityIndex;
        newPokemon.fusionShiny = this.fusionShiny;
        newPokemon.fusionVariant = this.fusionVariant;
        newPokemon.fusionGender = this.fusionGender;
        newPokemon.fusionLuck = this.fusionLuck;
        newPokemon.altPassiveForRun = this.altPassiveForRun;

        this.scene.getParty().push(newPokemon);
        newPokemon.evolve((!isFusion ? newEvolution : new FusionSpeciesFormEvolution(this.id, newEvolution)), evoSpecies);
        const modifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
          && m.pokemonId === this.id, true) as PokemonHeldItemModifier[];
        modifiers.forEach(m => {
          const clonedModifier = m.clone() as PokemonHeldItemModifier;
          clonedModifier.pokemonId = newPokemon.id;
          this.scene.addModifier(clonedModifier, true);
        });
        this.scene.updateModifiers(true);
      }
    }
  }

  getPossibleForm(formChange: SpeciesFormChange): Promise<Pokemon> {
    return new Promise(resolve => {
      const formIndex = Math.max(this.species.forms.findIndex(f => f.formKey === formChange.formKey && (formChange.formKey == SpeciesFormKey.SMITTY ? f.formName === formChange.trigger.name : true)), 0);
      const ret = this.scene.addPlayerPokemon(this.species, this.level, this.abilityIndex, formIndex, this.gender, this.shiny, this.variant, this.ivs, this.nature, this);
      ret.loadAssets().then(() => resolve(ret));
    });
  }
  changeForm(formChange: SpeciesFormChange): Promise<void> {
    return new Promise(resolve => {
      this.formIndex = Math.max(this.species.forms.findIndex(f => f.formKey === formChange.formKey && (formChange.formKey == SpeciesFormKey.SMITTY ? f.formName === formChange.trigger.name : true)), 0);
      this.generateName();
      const abilityCount = this.getSpeciesForm().getAbilityCount();
      if (this.abilityIndex >= abilityCount) {
        this.abilityIndex = abilityCount - 1;
      }

      if (formChange.formKey === SpeciesFormKey.SMITTY) {
        this.assignSmittyPassiveAbility();
      }

      this.loadAssets().then(() => {
        this.calculateStats();
        this.scene.updateModifiers(this.isPlayer(), true);

      this.compatibleTms.splice(0, this.compatibleTms.length);
      this.generateCompatibleTms();
      this.updateScale();
      const updateAndResolve = () => {
        this.loadAssets().then(() => {
          this.calculateStats();
          this.scene.updateModifiers(true, true);
          Promise.all([ this.updateInfo(true), this.scene.updateFieldScale() ]).then(() => resolve());

        });
      };
      if (!this.scene.gameMode.isDaily || this.metBiome > -1) {
        this.scene.gameData.setPokemonSeen(this, false);
        this.scene.gameData.setPokemonCaught(this, false).then(() => updateAndResolve());
      } else {
        updateAndResolve();
      }
    });
  })
  }

  clearFusionSpecies(): void {
    super.clearFusionSpecies();
    this.generateCompatibleTms();
  }
  fuse(pokemon: PlayerPokemon): Promise<void> {
    return new Promise(resolve => {
      this.fusionSpecies = pokemon.species;
      this.fusionFormIndex = pokemon.formIndex;
      this.fusionAbilityIndex = pokemon.abilityIndex;
      this.fusionShiny = pokemon.shiny;
      this.fusionVariant = pokemon.variant;
      this.fusionGender = pokemon.gender;
      this.fusionLuck = pokemon.luck;

      this.scene.validateAchv(achvs.SPLICE);
      this.scene.gameData.gameStats.pokemonFused++;
      const newHpPercent = ((pokemon.hp / pokemon.stats[Stat.HP]) + (this.hp / this.stats[Stat.HP])) / 2;

      this.generateName();
      this.calculateStats();
      this.hp = Math.round(this.stats[Stat.HP] * newHpPercent);
      if (!this.isFainted()) {

        this.hp = Math.min(this.hp, this.stats[Stat.HP]);
        this.status = getRandomStatus(this.status, pokemon.status);
      } else if (!pokemon.isFainted()) {

        this.hp = Math.max(this.hp, 1);
        this.status = pokemon.status;
      }

      this.generateCompatibleTms();
      this.updateInfo(true);
      const fusedPartyMemberIndex = this.scene.getParty().indexOf(pokemon);
      let partyMemberIndex = this.scene.getParty().indexOf(this);
      if (partyMemberIndex > fusedPartyMemberIndex) {
        partyMemberIndex--;
      }
      const fusedPartyMemberHeldModifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
        && m.pokemonId === pokemon.id, true) as PokemonHeldItemModifier[];
      const transferModifiers: Promise<boolean>[] = [];
      for (const modifier of fusedPartyMemberHeldModifiers) {
        transferModifiers.push(this.scene.tryTransferHeldItemModifier(modifier, this, false, modifier.getStackCount(), true, true));
      }
      Promise.allSettled(transferModifiers).then(() => {
        this.scene.updateModifiers(true, true).then(() => {
          this.scene.removePartyMemberModifiers(fusedPartyMemberIndex);
          this.scene.getParty().splice(fusedPartyMemberIndex, 1)[0];
          const newPartyMemberIndex = this.scene.getParty().indexOf(this);
          pokemon.getMoveset(true).map(m => this.scene.unshiftPhase(new LearnMovePhase(this.scene, newPartyMemberIndex, m!.getMove().id)));
          pokemon.destroy();
          this.updateFusionPalette();
          resolve();
        });
      });
    });
  }

  unfuse(): Promise<void> {
    return new Promise(resolve => {
      this.clearFusionSpecies();

      this.updateInfo(true).then(() => resolve());
      this.updateFusionPalette();
    });
  }
  copyMoveset(): PokemonMove[] {
    const newMoveset : PokemonMove[] = [];
    this.moveset.forEach(move =>
      newMoveset.push(new PokemonMove(move!.moveId, 0, move!.ppUp, move!.virtual)));

    return newMoveset;
  }
  sacrifice(stat: Stat, boostMultiplier: number, sacrificePokemon: PlayerPokemon): Promise<void> {
    return new Promise(resolve => {
      const statValue = this.stats[stat];
      this.stats[stat] = Math.floor(statValue * (1 + boostMultiplier));

      const party = this.scene.getParty();
      const index = party.indexOf(sacrificePokemon);
      if (index > -1) {
        party.splice(index, 1);
        sacrificePokemon.destroy();
      }

      this.updateInfo(true).then(() => resolve());
    });
  }
}

export class EnemyPokemon extends Pokemon {
  public trainerSlot: TrainerSlot;
  public aiType: AiType;
  public bossSegments: integer;
  public bossSegmentIndex: integer;

  public readonly isPopulatedFromDataSource: boolean;
  public is2ndStageBoss: boolean = false;

  constructor(scene: BattleScene, species: PokemonSpecies, level: integer, trainerSlot: TrainerSlot, boss: boolean, dataSource?: PokemonData) {
    super(scene, 236, 84, species, level, dataSource?.abilityIndex, dataSource?.formIndex,
      dataSource?.gender, dataSource ? dataSource.shiny : false, dataSource ? dataSource.variant : undefined, undefined, dataSource ? dataSource.nature : undefined, dataSource);

    this.trainerSlot = trainerSlot;
    this.isPopulatedFromDataSource = !!dataSource;
    if (boss) {
      this.setBoss(boss, dataSource?.bossSegments);
      if (dataSource?.bossSegmentIndex !== undefined && dataSource.bossSegmentIndex < this.bossSegments) {
        this.bossSegmentIndex = dataSource.bossSegmentIndex;
      }
    }

    if (Overrides.OPP_STATUS_OVERRIDE) {
      this.status = new Status(Overrides.OPP_STATUS_OVERRIDE);
    }

    if (Overrides.OPP_GENDER_OVERRIDE) {
      this.gender = Overrides.OPP_GENDER_OVERRIDE;
    }

    const speciesId = this.species.speciesId;

    if (speciesId in Overrides.OPP_FORM_OVERRIDES
      && Overrides.OPP_FORM_OVERRIDES[speciesId]
      && this.species.forms[Overrides.OPP_FORM_OVERRIDES[speciesId]]) {
      this.formIndex = Overrides.OPP_FORM_OVERRIDES[speciesId] ?? 0;
    }

    if (!dataSource) {
      this.generateAndPopulateMoveset();

      this.trySetShiny();
      if (Overrides.OPP_SHINY_OVERRIDE) {
        this.shiny = true;
        this.initShinySparkle();
      }
      if (this.shiny) {
        this.variant = this.generateVariant();
        if (Overrides.OPP_VARIANT_OVERRIDE) {
          this.variant = Overrides.OPP_VARIANT_OVERRIDE;
        }
      }

      this.luck = (this.shiny ? this.variant + 1 : 0) + (this.fusionShiny ? this.fusionVariant + 1 : 0);

      let prevolution: Species;
      let speciesId = species.speciesId;
      while ((prevolution = pokemonPrevolutions[speciesId])) {
        const evolution = pokemonEvolutions[prevolution].find(pe => pe.speciesId === speciesId && (!pe.evoFormKey || pe.evoFormKey === this.getFormKey()));
        if (evolution?.condition?.enforceFunc) {
          evolution.condition.enforceFunc(this);
        }
        speciesId = prevolution;
      }
    }

    this.aiType = boss || this.hasTrainer() ? AiType.SMART : AiType.SMART_RANDOM;
  }

  initBattleInfo(): void {
    if (!this.battleInfo) {
      this.battleInfo = new EnemyBattleInfo(this.scene);
      this.battleInfo.updateBossSegments(this);
      this.battleInfo.initInfo(this);
    } else {
      this.battleInfo.updateBossSegments(this);
    }
  }
  setBoss(boss: boolean = true, bossSegments: integer = 0): void {
    if (boss) {
      this.bossSegments = bossSegments || this.scene.getEncounterBossSegments(this.scene.currentBattle.waveIndex, this.level, this.species, true);
      this.bossSegmentIndex = this.bossSegments - 1;
    } else {
      this.bossSegments = 0;
      this.bossSegmentIndex = 0;
    }
  }

  generateAndPopulateMoveset(formIndex?: integer): void {
    switch (true) {
    case (this.species.speciesId === Species.SMEARGLE):
      this.moveset = [
        new PokemonMove(Moves.SKETCH),
        new PokemonMove(Moves.SKETCH),
        new PokemonMove(Moves.SKETCH),
        new PokemonMove(Moves.SKETCH)
      ];
      break;
    case (this.species.speciesId === Species.ETERNATUS):
      this.moveset = (formIndex !== undefined ? formIndex : this.formIndex)
        ? [
          new PokemonMove(Moves.DYNAMAX_CANNON),
          new PokemonMove(Moves.CROSS_POISON),
          new PokemonMove(Moves.FLAMETHROWER),
          new PokemonMove(Moves.RECOVER, 0, -4)
        ]
        : [
          new PokemonMove(Moves.ETERNABEAM),
          new PokemonMove(Moves.SLUDGE_BOMB),
          new PokemonMove(Moves.FLAMETHROWER),
          new PokemonMove(Moves.COSMIC_POWER)
        ];
      if (this.scene.gameMode.hasChallenge(Challenges.INVERSE_BATTLE)) {
        this.moveset[2] = new PokemonMove(Moves.THUNDERBOLT);
      }
      break;
    default:
      super.generateAndPopulateMoveset();
      break;
    }
  }
  getNextMove(): QueuedMove {

    const queuedMove = this.getMoveQueue().length
      ? this.getMoveset().find(m => m?.moveId === this.getMoveQueue()[0].move)
      : null;
    if (queuedMove) {
      if (queuedMove.isUsable(this, this.getMoveQueue()[0].ignorePP)) {
        return { move: queuedMove.moveId, targets: this.getMoveQueue()[0].targets, ignorePP: this.getMoveQueue()[0].ignorePP };
      } else {
        this.getMoveQueue().shift();
        return this.getNextMove();
      }
    }
    const movePool = this.getMoveset().filter(m => m?.isUsable(this));

    if (movePool.length) {

      if (movePool.length === 1) {
        return { move: movePool[0]!.moveId, targets: this.getNextTargets(movePool[0]!.moveId) };
      }

      const encoreTag = this.getTag(EncoreTag) as EncoreTag;
      if (encoreTag) {
        const encoreMove = movePool.find(m => m?.moveId === encoreTag.moveId);
        if (encoreMove) {
          return { move: encoreMove.moveId, targets: this.getNextTargets(encoreMove.moveId) };
        }
      }
      switch (this.aiType) {
      case AiType.RANDOM:
        const moveId = movePool[this.scene.randBattleSeedInt(movePool.length)]!.moveId;
        return { move: moveId, targets: this.getNextTargets(moveId) };
      case AiType.SMART_RANDOM:
      case AiType.SMART:

        const moveScores = movePool.map(() => 0);
        const moveTargets = Object.fromEntries(movePool.map(m => [ m!.moveId, this.getNextTargets(m!.moveId) ]));
        for (const m in movePool) {
          const pokemonMove = movePool[m]!;
          const move = pokemonMove.getMove();

          let moveScore = moveScores[m];
          const targetScores: integer[] = [];

          for (const mt of moveTargets[move.id]) {

            if (mt === BattlerIndex.ATTACKER) {
              break;
            }

            const target = this.scene.getField()[mt];

            let targetScore = move.getUserBenefitScore(this, target, move) + move.getTargetBenefitScore(this, target, move) * (mt < BattlerIndex.ENEMY === this.isPlayer() ? 1 : -1);
            if (Number.isNaN(targetScore)) {
              console.error(`Move ${move.name} returned score of NaN`);
              targetScore = 0;
            }

            if ((move.name.endsWith(" (N)") || !move.applyConditions(this, target, move)) && ![Moves.SUCKER_PUNCH, Moves.UPPER_HAND, Moves.THUNDERCLAP].includes(move.id)) {
              targetScore = -20;
            } else if (move instanceof AttackMove) {

              const effectiveness = target.getMoveEffectiveness(this, move, !target.battleData?.abilityRevealed);
              if (target.isPlayer() !== this.isPlayer()) {
                targetScore *= effectiveness;
                if (this.isOfType(move.type)) {
                  targetScore *= 1.5;
                }
              } else if (effectiveness) {
                targetScore /= effectiveness;
                if (this.isOfType(move.type)) {
                  targetScore /= 1.5;
                }
              }

              if (!targetScore) {
                targetScore = -20;
              }
            }
            targetScores.push(targetScore);
          }

          moveScore += Math.max(...targetScores);
          moveScores[m] = moveScore;
        }
        const sortedMovePool = movePool.slice(0);
        sortedMovePool.sort((a, b) => {
          const scoreA = moveScores[movePool.indexOf(a)];
          const scoreB = moveScores[movePool.indexOf(b)];
          return scoreA < scoreB ? 1 : scoreA > scoreB ? -1 : 0;
        });
        let r = 0;
        if (this.aiType === AiType.SMART_RANDOM) {

          while (r < sortedMovePool.length - 1 && this.scene.randBattleSeedInt(8) >= 5) {
            r++;
          }
        } else if (this.aiType === AiType.SMART) {

          while (r < sortedMovePool.length - 1 && (moveScores[movePool.indexOf(sortedMovePool[r + 1])] / moveScores[movePool.indexOf(sortedMovePool[r])]) >= 0
            && this.scene.randBattleSeedInt(100) < Math.round((moveScores[movePool.indexOf(sortedMovePool[r + 1])] / moveScores[movePool.indexOf(sortedMovePool[r])]) * 50)) {
            r++;
          }
        }
        return { move: sortedMovePool[r]!.moveId, targets: moveTargets[sortedMovePool[r]!.moveId] };
      }
    }

    return { move: Moves.STRUGGLE, targets: this.getNextTargets(Moves.STRUGGLE) };
  }
  getNextTargets(moveId: Moves): BattlerIndex[] {
    const moveTargets = getMoveTargets(this, moveId);
    const targets = this.scene.getField(true).filter(p => moveTargets.targets.indexOf(p.getBattlerIndex()) > -1);

    if (moveTargets.multiple) {
      return targets.map(p => p.getBattlerIndex());
    }

    const move = allMoves[moveId];
    const benefitScores = targets
      .map(p => [ p.getBattlerIndex(), move.getTargetBenefitScore(this, p, move) * (p.isPlayer() === this.isPlayer() ? 1 : -1) ]);

    const sortedBenefitScores = benefitScores.slice(0);
    sortedBenefitScores.sort((a, b) => {
      const scoreA = a[1];
      const scoreB = b[1];
      return scoreA < scoreB ? 1 : scoreA > scoreB ? -1 : 0;
    });

    if (!sortedBenefitScores.length) {
      if (move.hasAttr(CounterDamageAttr)) {
        return [BattlerIndex.ATTACKER];
      }

      return [];
    }

    let targetWeights = sortedBenefitScores.map(s => s[1]);
    const lowestWeight = targetWeights[targetWeights.length - 1];
    if (lowestWeight < 1) {
      for (let w = 0; w < targetWeights.length; w++) {
        targetWeights[w] += Math.abs(lowestWeight - 1);
      }
    }
    const benefitCutoffIndex = targetWeights.findIndex(s => s < targetWeights[0] / 2);
    if (benefitCutoffIndex > -1) {
      targetWeights = targetWeights.slice(0, benefitCutoffIndex);
    }

    const thresholds: integer[] = [];
    let totalWeight: integer = 0;
    targetWeights.reduce((total: integer, w: integer) => {
      total += w;
      thresholds.push(total);
      totalWeight = total;
      return total;
    }, 0);
    const randValue = this.scene.randBattleSeedInt(totalWeight);
    let targetIndex: integer = 0;

    thresholds.every((t, i) => {
      if (randValue >= t) {
        return true;
      }

      targetIndex = i;
      return false;
    });

    return [ sortedBenefitScores[targetIndex][0] ];
  }

  isPlayer() {
    return false;
  }

  hasTrainer(): boolean {
    return !!this.trainerSlot;
  }

  isBoss(): boolean {
    return !!this.bossSegments;
  }

  getBossSegmentIndex(): integer {
    const segments = (this as EnemyPokemon).bossSegments;
    const segmentSize = this.getMaxHp() / segments;
    for (let s = segments - 1; s > 0; s--) {
      const hpThreshold = Math.round(segmentSize * s);
      if (this.hp > hpThreshold) {
        return s;
      }
    }

    return 0;
  }

  damage(damage: integer, ignoreSegments: boolean = false, preventEndure: boolean = false, ignoreFaintPhase: boolean = false): integer {
    if (this.isFainted()) {
      return 0;
    }

    let clearedBossSegmentIndex = this.isBoss()
      ? this.bossSegmentIndex + 1
      : 0;

    if (this.isBoss() && !ignoreSegments) {
      const segmentSize = this.getMaxHp() / this.bossSegments;
      for (let s = this.bossSegmentIndex; s > 0; s--) {
        const hpThreshold = segmentSize * s;
        const roundedHpThreshold = Math.round(hpThreshold);
        if (this.hp >= roundedHpThreshold) {
          if (this.hp - damage <= roundedHpThreshold) {
            const hpRemainder = this.hp - roundedHpThreshold;
            let segmentsBypassed = 0;
            while (segmentsBypassed < this.bossSegmentIndex && this.canBypassBossSegments(segmentsBypassed + 1) && (damage - hpRemainder) >= Math.round(segmentSize * Math.pow(2, segmentsBypassed + 1))) {
              segmentsBypassed++;

            }

            damage = hpRemainder + Math.round(segmentSize * segmentsBypassed);
            clearedBossSegmentIndex = s - segmentsBypassed;
          }
          break;
        }
      }
    }

    switch (this.scene.currentBattle.battleSpec) {
    case BattleSpec.FINAL_BOSS:
      if (!this.is2ndStageBoss && this.bossSegmentIndex < 1) {
        damage = Math.min(damage, this.hp - 1);
      }
    }

    const ret = super.damage(damage, ignoreSegments, preventEndure, ignoreFaintPhase);

    if (this.isBoss()) {
      if (ignoreSegments) {
        const segmentSize = this.getMaxHp() / this.bossSegments;
        clearedBossSegmentIndex = Math.ceil(this.hp / segmentSize);
      }
      if (clearedBossSegmentIndex <= this.bossSegmentIndex) {
        this.handleBossSegmentCleared(clearedBossSegmentIndex);
      }
      this.battleInfo.updateBossSegments(this);
    }

    return ret;
  }

  canBypassBossSegments(segmentCount: integer = 1): boolean {
    if (this.scene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      if (!this.is2ndStageBoss && (this.bossSegmentIndex - segmentCount) < 1) {
        return false;
      }
    }

    return true;
  }

  handleBossSegmentCleared(segmentIndex: integer): void {
    while (segmentIndex - 1 < this.bossSegmentIndex) {
      if(!this.scene.gameMode.isWavePreFinal(this.scene, this.scene.currentBattle.waveIndex)) {
      let boostedStat = BattleStat.RAND;

      const battleStats = Utils.getEnumValues(BattleStat).slice(0, -3);
      const statWeights = new Array().fill(battleStats.length).filter((bs: BattleStat) => this.summonData.battleStats[bs] < 6).map((bs: BattleStat) => this.getStat(bs + 1));
      const statThresholds: integer[] = [];
      let totalWeight = 0;
      for (const bs of battleStats) {
        totalWeight += statWeights[bs];
        statThresholds.push(totalWeight);
      }

      const randInt = Utils.randSeedInt(totalWeight);

      for (const bs of battleStats) {
        if (randInt < statThresholds[bs]) {
          boostedStat = bs;
          break;
        }
      }

      let statLevels = 1;

      switch (segmentIndex) {
      case 1:
        if (this.bossSegments >= 3) {
          statLevels++;
        }
        break;
      case 2:
        if (this.bossSegments >= 5) {
          statLevels++;
        }
        break;
      }

      this.scene.unshiftPhase(new StatChangePhase(this.scene, this.getBattlerIndex(), true, [ boostedStat ], statLevels, true, true));
      }
      this.bossSegmentIndex--;
    }
  }

  heal(amount: integer): integer {
    if (this.isBoss()) {
      const amountRatio = amount / this.getMaxHp();
      const segmentBypassCount = Math.floor(amountRatio / (1 / this.bossSegments));
      const segmentSize = this.getMaxHp() / this.bossSegments;
      for (let s = 1; s < this.bossSegments; s++) {
        const hpThreshold = segmentSize * s;
        if (this.hp <= Math.round(hpThreshold)) {
          const healAmount = Math.min(amount, this.getMaxHp() - this.hp, Math.round(hpThreshold + (segmentSize * segmentBypassCount) - this.hp));
          this.hp += healAmount;
          return healAmount;
        } else if (s >= this.bossSegmentIndex) {
          return super.heal(amount);
        }
      }
    }

    return super.heal(amount);
  }

  getFieldIndex(): integer {
    return this.scene.getEnemyField().indexOf(this);
  }

  getBattlerIndex(): BattlerIndex {
    return BattlerIndex.ENEMY + this.getFieldIndex();
  }

  addToParty(pokeballType: PokeballType, typeBallType?: Type) {
    const party = this.scene.getParty();
    let ret: PlayerPokemon | null = null;

    if (party.length < 6) {
      this.pokeball = pokeballType;
      this.typeBallType = typeBallType;
      this.metLevel = this.level;
      this.metBiome = this.scene.arena.biomeType;
      this.metSpecies = this.species.speciesId;
      const newPokemon = this.scene.addPlayerPokemon(this.species, this.level, this.abilityIndex, this.formIndex, this.gender, this.shiny, this.variant, this.ivs, this.nature, this);
      party.push(newPokemon);
      ret = newPokemon;
      this.scene.triggerPokemonFormChange(newPokemon, SpeciesFormChangeActiveTrigger, true);
    }

    return ret;
  }
}

export interface TurnMove {
  move: Moves;
  targets?: BattlerIndex[];
  result: MoveResult;
  virtual?: boolean;
  turn?: integer;
}

export interface QueuedMove {
  move: Moves;
  targets: BattlerIndex[];
  ignorePP?: boolean;
}

export interface AttackMoveResult {
  move: Moves;
  result: DamageResult;
  damage: integer;
  critical: boolean;
  sourceId: integer;
  sourceBattlerIndex: BattlerIndex;
}

export class PokemonSummonData {
  public battleStats: integer[] = [ 0, 0, 0, 0, 0, 0, 0 ];
  public moveQueue: QueuedMove[] = [];
  public disabledMove: Moves = Moves.NONE;
  public disabledTurns: integer = 0;
  public tags: BattlerTag[] = [];
  public abilitySuppressed: boolean = false;
  public abilitiesApplied: Abilities[] = [];

  public speciesForm: PokemonSpeciesForm | null;
  public fusionSpeciesForm: PokemonSpeciesForm;
  public ability: Abilities = Abilities.NONE;
  public gender: Gender;
  public fusionGender: Gender;
  public stats: integer[];
  public moveset: (PokemonMove | null)[];
  public types: Type[] = [];
}

export class PokemonBattleData {
  public hitCount: integer = 0;
  public endured: boolean = false;
  public berriesEaten: BerryType[] = [];
  public abilitiesApplied: Abilities[] = [];
  public abilityRevealed: boolean = false;
}

export class PokemonBattleSummonData {

  public turnCount: integer = 1;

  public moveHistory: TurnMove[] = [];
}

export class PokemonTurnData {
  public flinched: boolean;
  public acted: boolean;
  public hitCount: integer;
  public hitsLeft: integer;
  public damageDealt: integer = 0;
  public currDamageDealt: integer = 0;
  public damageTaken: integer = 0;
  public attacksReceived: AttackMoveResult[] = [];
  public order: number;
}

export enum AiType {
  RANDOM,
  SMART_RANDOM,
  SMART
}

export enum MoveResult {
  PENDING,
  SUCCESS,
  FAIL,
  MISS,
  OTHER
}

export enum HitResult {
  EFFECTIVE = 1,
  SUPER_EFFECTIVE,
  NOT_VERY_EFFECTIVE,
  ONE_HIT_KO,
  NO_EFFECT,
  STATUS,
  HEAL,
  FAIL,
  MISS,
  OTHER,
  IMMUNE
}

export type DamageResult = HitResult.EFFECTIVE | HitResult.SUPER_EFFECTIVE | HitResult.NOT_VERY_EFFECTIVE | HitResult.ONE_HIT_KO | HitResult.OTHER;
export class PokemonMove {
  public moveId: Moves;
  public ppUsed: integer;
  public ppUp: integer;
  public virtual: boolean;

  constructor(moveId: Moves, ppUsed?: integer, ppUp?: integer, virtual?: boolean) {
    this.moveId = moveId;
    this.ppUsed = ppUsed || 0;
    this.ppUp = ppUp || 0;
    this.virtual = !!virtual;
  }

  isUsable(pokemon: Pokemon, ignorePp?: boolean): boolean {
    if (this.moveId && pokemon.summonData?.disabledMove === this.moveId) {
      return false;
    }

    if (pokemon.scene.dynamicMode && pokemon.isPlayer()) {
      const move = this.getMove();

      const isRestrictionActive = pokemon.scene.challengeRestrictionActive !== DynamicModes.NONE;

      if (pokemon.scene.dynamicMode.noStatusMoves && move.category === MoveCategory.STATUS) {
        if (!isRestrictionActive) {
          pokemon.scene.challengeRestrictionActive = DynamicModes.NO_STATUS_MOVES;
        }
        return false;
      }

      if (move.id !== Moves.STRUGGLE && pokemon.scene.dynamicMode.noPhysicalMoves && move.category === MoveCategory.PHYSICAL) {
        if (!isRestrictionActive) {
          pokemon.scene.challengeRestrictionActive = DynamicModes.NO_PHYSICAL_MOVES;
        }
        return false;
      }

      if (pokemon.scene.dynamicMode.noSpecialMoves && move.category === MoveCategory.SPECIAL) {
        if (!isRestrictionActive) {
          pokemon.scene.challengeRestrictionActive = DynamicModes.NO_SPECIAL_MOVES;
        }
        return false;
      }

      if (move.id !== Moves.STRUGGLE && pokemon.scene.dynamicMode.autoTorment) {
        const lastMove = pokemon.getLastXMoves(1);
        if (lastMove.length > 0 && lastMove[0].move === this.moveId && lastMove[0].result === MoveResult.SUCCESS) {
          if (!isRestrictionActive) {
            pokemon.scene.challengeRestrictionActive = DynamicModes.AUTO_TORMENT;
          }
          return false;
        }
      }
    }

    return (ignorePp || this.ppUsed < this.getMovePp() || this.getMove().pp === -1) && !this.getMove().name.endsWith(" (N)");
  }

  getMove(isPlayerMove: boolean = true): Move {
    const baseMove = allMoves[this.moveId];
    if(this.virtual === false) {
      const scene = BattleScene.currentScene;
      if(scene) {
        return scene.getUpgradedMove(baseMove, isPlayerMove);
      }
    }
    return baseMove;
  }
  usePp(count: number = 1) {
    this.ppUsed = Math.min(this.ppUsed + count, this.getMovePp());
  }

  getMovePp(): integer {
    return this.getMove().pp + this.ppUp * Utils.toDmgValue(this.getMove().pp / 5);
  }

  getPpRatio(): number {
    return 1 - (this.ppUsed / this.getMovePp());
  }

  getName(): string {
    return this.getMove().name;
  }
  static loadMove(source: PokemonMove | any): PokemonMove {
    return new PokemonMove(source.moveId, source.ppUsed, source.ppUp, source.virtual);
  }

}