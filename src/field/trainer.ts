import BattleScene, { RecoveryBossMode } from "../battle-scene";
import {pokemonPrevolutions} from "../data/pokemon-evolutions";
import PokemonSpecies, {getPokemonSpecies} from "../data/pokemon-species";
import {
  TrainerConfig,
  TrainerPartyCompoundTemplate,
  TrainerPartyTemplate,
  TrainerPoolTier,
  TrainerSlot,
  trainerConfigs,
  trainerPartyTemplates,
  signatureSpecies,
  RivalTrainerType,
  trainerPokemonPools, getNightmarePartyTemplate,
  glitchText
} from "../data/trainer-config";
import {EnemyPokemon} from "./pokemon";
import * as Utils from "../utils";
import {PersistentModifier} from "../modifier/modifier";
import {trainerNamePools} from "../data/trainer-names";
import {ArenaTagSide, ArenaTrapTag} from "#app/data/arena-tag";
import {getIsInitialized, initI18n} from "#app/plugins/i18n";
import i18next from "i18next";
import { PartyMemberStrength } from "#enums/party-member-strength";
import { Species } from "#enums/species";
import { TrainerType } from "#enums/trainer-type";
import {GameModes} from "#app/game-mode";
import {TRAINER_TYPES} from "#app/battle";
import { NightmareRivalInfo } from "#app/battle.ts";
import { getTypeRgb, Type } from "#app/data/type.ts";
import { Unlockables } from "#app/system/unlockables.ts";
import Overrides from "#app/overrides";
import { DEBUG_FORCE_TRAINER_CORRUPTED } from "#app/overrides";
import { DUELMON_SPECIES } from "#app/data/duelmon-rankups";
import { getEligibleDuelmonSpeciesForWave } from "#app/data/duelmon-bst-utils";
import { applyTrainerDualColorAltBuild, getTrainerSpriteCluster4 } from "../utils/trainer-dualcolor-recolor";

export enum TrainerVariant {
  DEFAULT,
  FEMALE,
  DOUBLE
}

export default class Trainer extends Phaser.GameObjects.Container {
  public config: TrainerConfig;
  public variant: TrainerVariant;
  public partyTemplateIndex: integer;
  public name: string;
  public partnerName: string;
  public isDynamicRival: boolean;
  public dynamicRivalType: RivalTrainerType | null;
  public rivalConfig: TrainerConfig | null;
  public rivalStage: number;
  private nightmareTemplate: TrainerPartyTemplate | null;
  public isCorrupted: boolean;
  public portalSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: BattleScene, trainerType: TrainerType, variant: TrainerVariant, partyTemplateIndex?: integer, name?: string, partnerName?: string, rivalConfig?: TrainerConfig, rivalStage?: number, isCorrupted?: boolean) {
    super(scene, -72, 80);

    this.rivalStage = rivalStage || -1;
    this.isDynamicRival = rivalStage >= 1
    this.dynamicRivalType = null;
    this.isCorrupted = (DEBUG_FORCE_TRAINER_CORRUPTED && trainerType !== TrainerType.SMITTY) || (trainerType !== TrainerType.SMITTY && (isCorrupted || (!this.scene.gameData.tutorialOnboardActive && ((!this.scene.gameMode.isNightmare && Utils.randSeedChance(5) && !this.isDynamicRival) || (this.scene.gameData.defeatedRivals?.includes(trainerType) && !this.scene.gameData.unlocks[Unlockables.THE_VOID_OVERTAKEN])))));

    if (this.isDynamicRival && rivalConfig) {
      this.config = this.rivalConfig = rivalConfig;
      this.dynamicRivalType = this.config.trainerType as RivalTrainerType;
      trainerType = this.dynamicRivalType;
    } else {
      this.config = trainerConfigs.hasOwnProperty(trainerType)
          ? trainerConfigs[trainerType]
          : trainerConfigs[TrainerType.ACE_TRAINER];
    }
    this.variant = variant;

    if (this.isDynamicRival) {
      this.partyTemplateIndex = 0;
    } else {
      this.partyTemplateIndex = Math.min(partyTemplateIndex !== undefined ? partyTemplateIndex : Utils.randSeedWeightedItem(this.config.partyTemplates.map((_, i) => i)),
          this.config.partyTemplates.length - 1);
    }

    if (trainerNamePools.hasOwnProperty(trainerType)) {
      const namePool = trainerNamePools[trainerType];
      this.name = name || Utils.randSeedItem(Array.isArray(namePool[0]) ? namePool[variant === TrainerVariant.FEMALE ? 1 : 0] : namePool);
      if (variant === TrainerVariant.DOUBLE) {
        if (this.config.doubleOnly) {
          if (partnerName) {
            this.partnerName = partnerName;
          } else {
            [this.name, this.partnerName] = this.name.split(" & ");
          }
        } else {
          this.partnerName = partnerName || Utils.randSeedItem(Array.isArray(namePool[0]) ? namePool[1] : namePool);
        }
      }
    }

    switch (this.variant) {
    case TrainerVariant.FEMALE:
      if (!this.config.hasGenders) {
        variant = TrainerVariant.DEFAULT;
      }
      break;
    case TrainerVariant.DOUBLE:
      if (!this.config.hasDouble) {
        variant = TrainerVariant.DEFAULT;
      }
      break;
    }
    const getSprite = (hasShadow?: boolean, forceFemale?: boolean) => {
      let ret = null;
      if(this.config.trainerType == TrainerType.SMITTY) {
        ret = this.scene.addFieldSprite(0, 5, "smitty_trainers", this.config.getSpriteKey(variant === TrainerVariant.FEMALE || forceFemale,this.isDouble()));
        ret.setPipeline(this.scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0], hasShadow: false});
        ret.setScale(0.59);
      } else if (this.config.trainerType === TrainerType.PEGASUS || this.config.trainerType === TrainerType.PEGASUS_2) {
        ret = this.scene.addFieldSprite(0, 0, this.config.getSpriteKey(variant === TrainerVariant.FEMALE || forceFemale, this.isDouble()));
        ret.setPipeline(this.scene.spritePipeline, { tone: [0.0, 0.0, 0.0, 0.0], hasShadow: false });
        ret.setScale(0.44);
      } else {
        ret = this.scene.addFieldSprite(0, 0, this.config.getSpriteKey(variant === TrainerVariant.FEMALE || forceFemale, this.isDouble()));
        ret.setPipeline(this.scene.spritePipeline, {
            tone: [0.0, 0.0, 0.0, 0.0],
            hasShadow: !!hasShadow
        });
      }
      ret.setOrigin(0.5, 1);
      return ret;
    };

    const sprite = getSprite(true);
    const tintSprite = getSprite();

    tintSprite.setVisible(false);

    this.add(sprite);
    this.add(tintSprite);

    let partnerSprite: Phaser.GameObjects.Sprite | null = null;
    let partnerTintSprite: Phaser.GameObjects.Sprite | null = null;
    if (variant === TrainerVariant.DOUBLE && !this.config.doubleOnly) {
      partnerSprite = getSprite(true, true);
      partnerTintSprite = getSprite(false, true);

      partnerTintSprite.setVisible(false);

      sprite.x = -4;
      tintSprite.x = -4;
      partnerSprite.x = 28;
      partnerTintSprite.x = 28;

      this.add(partnerSprite);
      this.add(partnerTintSprite);
    }

    if ((this.scene.gameMode.isNightmare || this.isCorrupted) && this.config.trainerType !== TrainerType.SMITTY) {
        if (this.isCorrupted) {
            const corruptedPalettes = [
                ["#0C0C0C", "#5A1BB2", "#000000", "#330066"],
                ["#000000", "#4B0082", "#0C0C0C", "#6340AB"],
                ["#0C0C0C", "#6A0DAD", "#000000", "#371B58"],
            ];
            const chosenPalette = Utils.randSeedItem(corruptedPalettes);
            const targetColors = chosenPalette.map(hex => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return [r, g, b, 255];
            });
            const allSprites = [sprite, tintSprite, partnerSprite, partnerTintSprite].filter(s => !!s);
            allSprites.forEach(s => {
                const quantized = getTrainerSpriteCluster4(this.scene, s);
                const sourceColors = quantized || targetColors.map(() => [128, 128, 128, 255]);
                s.pipelineData["altBuildSpriteColors"] = sourceColors;
                s.pipelineData["altBuildTargetColors"] = targetColors;
                s.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
                s.pipelineData["altBuildInversionFactor"] = 0.7;
                delete s.pipelineData["teraColor"];
                delete s.pipelineData["baseColor"];
            });
        } else if (this.scene.gameMode.isNightmare) {
            const teraColor = Utils.randSeedItem([
                getTypeRgb(Type.POISON),
                getTypeRgb(Type.DARK),
                [240, 48, 48],
                [12, 12, 18]
            ]);
            [sprite, tintSprite, partnerSprite, partnerTintSprite]
            .filter(s => !!s)
            .forEach(s => {
                s.pipelineData["teraColor"] = teraColor;
                s.setPipelineData({ teraColor });
            });
        }
    }

    const dualColorCorruptedPriority = this.isCorrupted;
    this.getSprites()
      .concat(this.getTintSprites())
      .filter(s => !!s)
      .forEach(s => applyTrainerDualColorAltBuild(this.scene, s, dualColorCorruptedPriority));
  }

  getKey(forceFemale?: boolean): string {
    return this.config.getSpriteKey(this.variant === TrainerVariant.FEMALE || forceFemale,this.isDouble());
  }
  getName(trainerSlot: TrainerSlot = TrainerSlot.NONE, includeTitle: boolean = false): string {
    let name = this.config.getTitle(trainerSlot, this.variant);
    let title = includeTitle && this.config.title ? this.config.title : null;
    const evilTeamTitles = ["grunt"];
    if (this.name === "" && evilTeamTitles.some(t => name.toLocaleLowerCase().includes(t))) {

      title = i18next.t(`trainerClasses:${name.toLowerCase().replace(/\s/g, "_")}`);
      console.log("Localized grunt name: " + title);

      return title;
    }
    if (this.name) {

      if (includeTitle) {

        if (!getIsInitialized()) {

          initI18n();
        }
        title = i18next.t(`trainerClasses:${name.toLowerCase().replace(/\s/g, "_")}`);
      }
      if (!trainerSlot) {

        name = this.name;

        if (this.partnerName) {
          name = `${name} & ${this.partnerName}`;
        }
      } else {
        name = trainerSlot === TrainerSlot.TRAINER ? this.name : this.partnerName || this.name;
      }
    }

    if (this.config.titleDouble && this.variant === TrainerVariant.DOUBLE && !this.config.doubleOnly) {
      title = this.config.titleDouble;
      name = i18next.t(`trainerNames:${this.config.nameDouble.toLowerCase().replace(/\s/g, "_")}`);
    }
    return title ? `${title} ${name}` : name;
  }

  getNextHundred(wave: number): number {
    const hundred = Math.ceil(wave / 100) * 100;
    return hundred === 500 ? 499 : hundred;
}

  isSegmentRival(trainer: Trainer, wave: number, rivalInfo: Record<number, NightmareRivalInfo>): boolean {
      const nextHundred = this.getNextHundred(wave);
      const expected = rivalInfo[nextHundred];
      return !!expected && trainer.config.trainerType === expected.trainerType;
  }
  isDouble(): boolean {
    return this.config.doubleOnly || this.variant === TrainerVariant.DOUBLE;
  }

  getMixedBattleBgm(): string {
    return this.config.mixedBattleBgm;
  }

  getBattleBgm(): string {
    return this.config.battleBgm;
  }

  getEncounterBgm(): string {
    return !this.variant ? this.config.encounterBgm : (this.variant === TrainerVariant.DOUBLE ? this.config.doubleEncounterBgm : this.config.femaleEncounterBgm) || this.config.encounterBgm;
  }

  getEncounterMessages(): string[] {
    return !this.variant ? this.config.encounterMessages : (this.variant === TrainerVariant.DOUBLE ? this.config.doubleEncounterMessages : this.config.femaleEncounterMessages) || this.config.encounterMessages;
  }

  getVictoryMessages(): string[] {
    return !this.variant ? this.config.victoryMessages : (this.variant === TrainerVariant.DOUBLE ? this.config.doubleVictoryMessages : this.config.femaleVictoryMessages) || this.config.victoryMessages;
  }

  getDefeatMessages(): string[] {
    return !this.variant ? this.config.defeatMessages : (this.variant === TrainerVariant.DOUBLE ? this.config.doubleDefeatMessages : this.config.femaleDefeatMessages) || this.config.defeatMessages;
  }

  getPartyTemplate(): TrainerPartyTemplate {
    if (this.nightmareTemplate) {
      return this.nightmareTemplate;
    }
    if (this.config.partyTemplateFunc) {
      return this.config.partyTemplateFunc(this.scene);
    }
    return this.config.partyTemplates[this.partyTemplateIndex];
  }

  setNightmareTemplate(template: TrainerPartyTemplate): void {
    this.nightmareTemplate = template;
  }

  getPartyLevels(waveIndex: integer): integer[] {
    if (Overrides.OPP_ONE_POKEMON) {
      return [1];
    }
    const isBoostedLevelBoost = this.scene.dynamicMode?.boostedTrainer ? 4 : 0;
    const isRecoveryBossLevelBoost = this.scene.recoveryBossMode === RecoveryBossMode.FACING_BOSS && (this.scene.currentBattle?.waveIndex > 90 || Utils.randSeedInt(100) < 15) ? 1 : 0;
    if (isBoostedLevelBoost || isRecoveryBossLevelBoost || this.config.trainerType === TrainerType.SMITTY || (this.scene.gameMode.modeId === GameModes.NIGHTMARE && this.scene.currentBattle?.waveIndex > 300)) {
      const playerParty = this.scene.getParty();
      const highestPlayerLevel = Math.max(...playerParty.map(p => p.level));
      const boostedLevel = highestPlayerLevel + isBoostedLevelBoost + isRecoveryBossLevelBoost;

      const ret: number[] = [];
      let partyTemplate = this.getPartyTemplate();

      for (let i = 0; i < partyTemplate.size; i++) {
        ret.push(boostedLevel);
      }

      return ret;
    }
    const ret: number[] = [];
    let partyTemplate = this.getPartyTemplate();

    if (this.scene.gameMode.isNightmare) {
        const segment = Math.floor(waveIndex / 100);
        const remainder = waveIndex % 100;
        waveIndex = remainder === 0 ? 100 : remainder;

    }

    if (this.scene.gameMode.isChaosMode && this.scene.lastBattleNodeWave > 0 && this.scene.lastBattleNodeWave < waveIndex) {
      waveIndex = Math.ceil((this.scene.lastBattleNodeWave + waveIndex) / 2);
    }

    const difficultyWaveIndex = this.scene.gameMode.getWaveForDifficulty(waveIndex);
    const baseLevel = 1 + difficultyWaveIndex / 2 + Math.pow(difficultyWaveIndex / 25, 2);

    if (this.isDouble() && partyTemplate.size < 2) {
        partyTemplate.size = 2;
    }
    for (let i = 0; i < partyTemplate.size; i++) {
        let multiplier = 1;
        const strength = partyTemplate.getStrength(i);
        switch (strength) {
            case PartyMemberStrength.WEAKER:
            case PartyMemberStrength.WEAK:
            case PartyMemberStrength.AVERAGE:
            case PartyMemberStrength.STRONG:
            case PartyMemberStrength.STRONGER:
                if (this.scene.gameMode.isNightmare) {
                    if (waveIndex >= 25) {
                        multiplier = 1.25;
                    } else {
                        multiplier = Phaser.Math.FloatBetween(1.22, 1.25);
                    }
                } else if (waveIndex > 80) {
                    multiplier = 1.25;
                } else {
                    multiplier = Phaser.Math.FloatBetween(1.22, 1.25);
                }
                break;
        }

        let levelOffset = 0;
        const level = Math.ceil(baseLevel * multiplier) + levelOffset;
        ret.push(level);
    }

    return ret;
  }

  genPartyMember(index: integer): EnemyPokemon {
    const battle = this.scene.currentBattle;
    const level = battle.enemyLevels?.[index]!;

    let ret: EnemyPokemon;

    this.scene.executeWithSeedOffset(() => {
      const template = this.getPartyTemplate();
      const strength: PartyMemberStrength = template.getStrength(index);
      if (!(this.config.trainerTypeDouble && this.isDouble() && !this.config.doubleOnly)) {

        if (this.config.partyMemberFuncs.hasOwnProperty(index)) {
          ret = this.config.partyMemberFuncs[index](this.scene, level, strength);
          return;
        }
        if (this.config.partyMemberFuncs.hasOwnProperty(index - template.size)) {
          ret = this.config.partyMemberFuncs[index - template.size](this.scene, level, template.getStrength(index));
          return;
        }
      }
      let offset = 0;

      if (template instanceof TrainerPartyCompoundTemplate) {
        for (const innerTemplate of template.templates) {
          if (offset + innerTemplate.size > index) {
            break;
          }
          offset += innerTemplate.size;
        }
      }
      let newSpeciesPool: Species[] = [];
      let useNewSpeciesPool = false;
      if (this.config.trainerTypeDouble && this.isDouble() && !this.config.doubleOnly) {
        useNewSpeciesPool = true;
        const speciesPoolPartner = signatureSpecies[TrainerType[this.config.trainerTypeDouble]];
        const speciesPool = signatureSpecies[TrainerType[this.config.trainerType]];
        const AlreadyUsedSpecies = battle.enemyParty.map(p => p.species.speciesId);
        const speciesPoolFiltered = speciesPool.filter(species => {

          if (Array.isArray(species)) {
            return !species.some(s => AlreadyUsedSpecies.includes(s));
          }
          return !AlreadyUsedSpecies.includes(species);
        }).flat();
        const speciesPoolPartnerFiltered = speciesPoolPartner.filter(species => {

          if (Array.isArray(species)) {
            return !species.some(s => AlreadyUsedSpecies.includes(s));
          }
          return !AlreadyUsedSpecies.includes(species);
        }).flat();
        if (!(index % 2)) {

          if (index === 0 && (TrainerType[this.config.trainerType] === TrainerType[TrainerType.TATE])) {
            newSpeciesPool = [Species.SOLROCK];
          } else if (index === 0 && (TrainerType[this.config.trainerType] === TrainerType[TrainerType.LIZA])) {
            newSpeciesPool = [Species.LUNATONE];
          } else {
            newSpeciesPool = speciesPoolFiltered;
          }
        } else {
          if (index === 1 && (TrainerType[this.config.trainerTypeDouble] === TrainerType[TrainerType.TATE])) {
            newSpeciesPool = [Species.SOLROCK];
          } else if (index === 1 && (TrainerType[this.config.trainerTypeDouble] === TrainerType[TrainerType.LIZA])) {
            newSpeciesPool = [Species.LUNATONE];
          } else {
            newSpeciesPool = speciesPoolPartnerFiltered;
          }
        }

        if (newSpeciesPool.length === 0) {

          useNewSpeciesPool = false;
        }
      }

    let species = null
    if (this.isDynamicRival && this.dynamicRivalType) {
      let dynamicSpeciesPool = trainerPokemonPools[this.dynamicRivalType][index] || [];
      if (!this.scene.duelmonsEnabledForRun) {
        dynamicSpeciesPool = dynamicSpeciesPool.filter(s => getPokemonSpecies(s).generation !== 20);
      }
      if (dynamicSpeciesPool.length > 0) {
        species = getPokemonSpecies(Utils.randSeedItem(dynamicSpeciesPool));
        species = getPokemonSpecies(species.getSpeciesForLevel(level, true, true, strength, battle.waveIndex, this.scene.gameMode.isNightmare));
      } else {
        species = useNewSpeciesPool
        ? getPokemonSpecies(newSpeciesPool[Math.floor(Math.random() * newSpeciesPool.length)])
        : template.isSameSpecies(index) && index > offset
            ? getPokemonSpecies(battle.enemyParty[offset].species.getTrainerSpeciesForLevel(level, false, template.getStrength(offset), battle.waveIndex, this.scene.gameMode.isNightmare))
            : this.genNewPartyMemberSpecies(level, strength);
      }
    } else {
      species = useNewSpeciesPool
        ? getPokemonSpecies(newSpeciesPool[Math.floor(Math.random() * newSpeciesPool.length)])
        : template.isSameSpecies(index) && index > offset
          ? getPokemonSpecies(battle.enemyParty[offset].species.getTrainerSpeciesForLevel(level, false, template.getStrength(offset), battle.waveIndex, this.scene.gameMode.isNightmare))
          : this.genNewPartyMemberSpecies(level, strength);

      if (newSpeciesPool) {
        species = getPokemonSpecies(species.getSpeciesForLevel(level, true, true, strength, this.scene.currentBattle.waveIndex, this.scene.gameMode.isNightmare));
      }
    }

      ret = this.scene.addEnemyPokemon(species, level, TrainerSlot.TRAINER);
    }, this.config.hasStaticParty ? this.calculateStaticPartySeedOffset(index) : this.scene.currentBattle.waveIndex + (this.config.getDerivedType() << 10) + (((!this.config.useSameSeedForAllMembers ? index : 0) + 1) << 8));
    if (this.scene.currentBattle.waveIndex > 60 && ret.species.forms.length > 1 && Utils.randSeedInt(this.isDynamicRival ? 2 : 3, 1) == 1 && this.config.trainerType !== TrainerType.SMITTY ) {
      ret.formIndex = Utils.randSeedInt(ret.species.forms.length -1, 1);
      ret.generateName();
      if(ret.isGlitchOrSmittyForm()) {
        ret.toggleShadow(false);
      }
    }

    return ret!;
  }

  private calculateStaticPartySeedOffset(index: integer): number {
    const battle = this.scene.currentBattle;
    const baseOffset = this.config.getDerivedType() + ((index + 1) << 8);

    if (this.scene.gameMode.isNightmare && this.config.hasStaticParty) {
      const waveIndex = battle.waveIndex;
      const blockIndex = Math.floor((waveIndex - 1) / 100) * 100;

      const nightmareSeeds = this.scene.gameData.nightmareBattleSeeds;
      if (nightmareSeeds?.rivalPokemon?.[blockIndex]) {
        return baseOffset + (nightmareSeeds.rivalPokemon[blockIndex] << 16);
      }
    }

    return baseOffset;
  }

  genNewPartyMemberSpecies(level: integer, strength: PartyMemberStrength, attempt?: integer): PokemonSpecies {
    const battle = this.scene.currentBattle;
    const template = this.getPartyTemplate();

    let species: PokemonSpecies;
    if (Overrides.FORCE_DUELMON_ENCOUNTERS_OVERRIDE) {
      const eligible = getEligibleDuelmonSpeciesForWave(DUELMON_SPECIES, battle.waveIndex);
      species = getPokemonSpecies(eligible[Utils.randSeedInt(eligible.length)]);
    } else if (this.config.speciesPools) {
      const tierValue = Utils.randSeedInt(512);
      let tier = tierValue >= 156 ? TrainerPoolTier.COMMON : tierValue >= 32 ? TrainerPoolTier.UNCOMMON : tierValue >= 6 ? TrainerPoolTier.RARE : tierValue >= 1 ? TrainerPoolTier.SUPER_RARE : TrainerPoolTier.ULTRA_RARE;
      console.log(TrainerPoolTier[tier]);
      while (!this.config.speciesPools.hasOwnProperty(tier) || !this.config.speciesPools[tier].length) {
        console.log(`Downgraded trainer Pokemon rarity tier from ${TrainerPoolTier[tier]} to ${TrainerPoolTier[tier - 1]}`);
        tier--;
      }
      const tierPool = this.config.speciesPools[tier];
      species = getPokemonSpecies(Utils.randSeedItem(tierPool));
      console.log(this.config.trainerType);
      console.log(this.name);
      console.log(this);
      console.log(tierPool);
    } else {
      species = this.scene.randomSpecies(battle.waveIndex, level, false, this.config.speciesFilter);
    }

    let ret = getPokemonSpecies(species.getTrainerSpeciesForLevel(level, true, strength, this.scene.currentBattle.waveIndex, this.scene.gameMode.isNightmare));
    let retry = false;
    if (pokemonPrevolutions.hasOwnProperty(species.speciesId) && ret.speciesId !== species.speciesId) {
      retry = true;
    } else if (template.isBalanced(battle.enemyParty.length)) {
      const partyMemberTypes = battle.enemyParty.map(p => p.getTypes(true)).flat();
      if (partyMemberTypes.indexOf(ret.type1) > -1 || (ret.type2 !== null && partyMemberTypes.indexOf(ret.type2) > -1)) {
        retry = true;
      }
    }

    if (!retry && this.config.specialtyTypes.length && !this.config.specialtyTypes.find(t => ret.isOfType(t))) {
      retry = true;
      console.log("Attempting reroll of species evolution to fit specialty type...");
      let evoAttempt = 0;
      while (retry && evoAttempt++ < 10) {
        ret = getPokemonSpecies(species.getTrainerSpeciesForLevel(level, true, strength, this.scene.currentBattle.waveIndex, this.scene.gameMode.isNightmare));
        console.log(ret.name);
        if (this.config.specialtyTypes.find(t => ret.isOfType(t))) {
          retry = false;
        }
      }
    }

    if (retry && (attempt || 0) < 10) {
      console.log("Rerolling party member...");
      ret = this.genNewPartyMemberSpecies(level, strength, (attempt || 0) + 1);
    }

    return ret;
  }

  getPartyMemberMatchupScores(trainerSlot: TrainerSlot = TrainerSlot.NONE, forSwitch: boolean = false): [integer, integer][] {
    if (trainerSlot) {
      trainerSlot = TrainerSlot.NONE;
    }

    const party = this.scene.getEnemyParty();
    const nonFaintedLegalPartyMembers = party.slice(this.scene.currentBattle.getBattlerCount()).filter(p => p.isAllowedInBattle())
    const partyMemberScores = nonFaintedLegalPartyMembers.map(p => {
      const playerField = this.scene.getPlayerField().filter(p => p.isAllowedInBattle());
      let score = 0;

      if (playerField.length > 0) {
      for (const playerPokemon of playerField) {
        score += p.getMatchupScore(playerPokemon);
        if (playerPokemon.species.legendary) {
          score /= 2;
        }
      }
      score /= playerField.length;
      if (forSwitch && !p.isOnField()) {
        this.scene.arena.findTagsOnSide(t => t instanceof ArenaTrapTag, ArenaTagSide.ENEMY).map(t => score *= (t as ArenaTrapTag).getMatchupScoreMultiplier(p));
      }
      }

      return [party.indexOf(p), score];
    }) as [integer, integer][];

    return partyMemberScores;
  }

  getSortedPartyMemberMatchupScores(partyMemberScores: [integer, integer][] = this.getPartyMemberMatchupScores()) {
    const sortedPartyMemberScores = partyMemberScores.slice(0);
    sortedPartyMemberScores.sort((a, b) => {
      const scoreA = a[1];
      const scoreB = b[1];
      return scoreA < scoreB ? 1 : scoreA > scoreB ? -1 : 0;
    });

    return sortedPartyMemberScores;
  }

  getNextSummonIndex(trainerSlot: TrainerSlot = TrainerSlot.NONE, partyMemberScores: [integer, integer][] = this.getPartyMemberMatchupScores(trainerSlot)): integer {
    if (trainerSlot) {
      trainerSlot = TrainerSlot.NONE;
    }

    if (partyMemberScores.length === 0) {
      return -1;
    }

    const sortedPartyMemberScores = this.getSortedPartyMemberMatchupScores(partyMemberScores);

    const maxScorePartyMemberIndexes = partyMemberScores.filter(pms => pms[1] === sortedPartyMemberScores[0][1]).map(pms => pms[0]);

    if (maxScorePartyMemberIndexes.length > 1) {
      let rand: integer;
      this.scene.executeWithSeedOffset(() => rand = Utils.randSeedInt(maxScorePartyMemberIndexes.length), this.scene.currentBattle.turn << 2);
      return maxScorePartyMemberIndexes[rand!];
    }

    return maxScorePartyMemberIndexes[0];
  }

  getPartyMemberModifierChanceMultiplier(index: integer): number {
    switch (this.getPartyTemplate().getStrength(index)) {
    case PartyMemberStrength.WEAKER:
      return 0.75;
    case PartyMemberStrength.WEAK:
      return 0.675;
    case PartyMemberStrength.AVERAGE:
      return 0.5625;
    case PartyMemberStrength.STRONG:
      return 0.45;
    case PartyMemberStrength.STRONGER:
      return 0.375;
    default:
      console.warn("getPartyMemberModifierChanceMultiplier not defined. Using default 0");
      return 0;
    }
  }

  genModifiers(party: EnemyPokemon[]): PersistentModifier[] {
    if (this.config.genModifiersFunc) {
      return this.config.genModifiersFunc(party);
    }
    return [];
  }

  loadAssets(): Promise<void> {
    return this.config.loadAssets(this.scene, this.variant);
  }

  initSprite(): void {
    if (this.config.trainerType == TrainerType.SMITTY) {
      this.getSprites().map((sprite, i) => sprite.setTexture("smitty_trainers", this.getKey(!!i)));
      this.getTintSprites().map((tintSprite, i) => tintSprite.setTexture("smitty_trainers", this.getKey(!!i)));
    } else {
      this.getSprites().map((sprite, i) => sprite.setTexture(this.getKey(!!i)).setFrame(0));
      this.getTintSprites().map((tintSprite, i) => tintSprite.setTexture(this.getKey(!!i)).setFrame(0));
    }

    if (this.isCorrupted) {
        const corruptedPalettes = [
            ["#0C0C0C", "#5A1BB2", "#000000", "#330066"],
            ["#000000", "#4B0082", "#0C0C0C", "#6340AB"],
            ["#0C0C0C", "#6A0DAD", "#000000", "#371B58"],
        ];
        const chosenPalette = Utils.randSeedItem(corruptedPalettes);
        const targetColors = chosenPalette.map(hex => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b, 255];
        });
        this.getSprites().concat(this.getTintSprites()).filter(s => !!s).forEach(s => {
            const quantized = getTrainerSpriteCluster4(this.scene, s);
            const sourceColors = quantized || targetColors.map(() => [128, 128, 128, 255]);
            s.pipelineData["altBuildSpriteColors"] = sourceColors;
            s.pipelineData["altBuildTargetColors"] = targetColors;
            s.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
            s.pipelineData["altBuildInversionFactor"] = 0.7;
            delete s.pipelineData["teraColor"];
            delete s.pipelineData["baseColor"];
        });
    }

    const dualColorCorruptedPriority = this.isCorrupted;
    this.getSprites()
      .concat(this.getTintSprites())
      .filter(s => !!s)
      .forEach(s => applyTrainerDualColorAltBuild(this.scene, s, dualColorCorruptedPriority));
  }
  tryPlaySprite(sprite: Phaser.GameObjects.Sprite, tintSprite: Phaser.GameObjects.Sprite, animConfig: Phaser.Types.Animations.PlayAnimationConfig): boolean {
    if (sprite.texture.key === "__MISSING") {
      console.error(`No texture found for '${animConfig.key}'!`);
      return false;
    }
    if (sprite.texture.frameTotal <= 1) {
      return false;
    }

    try {
      sprite.play(animConfig);
      tintSprite.play(animConfig);
    } catch (error: unknown) {
      console.warn(`[Trainer] Animation failed for '${animConfig.key}':`, error);
      return false;
    }

    if (
      !this.isCorrupted
      && this.scene.trainerDualColorRecolorEnabledForRun
      && this.scene.trainerDualColorAForRun
      && this.scene.trainerDualColorBForRun
    ) {
      let lastFrameName: string | null = sprite.frame?.name ?? null;
      const onUpdate = (_anim: any, frame: any) => {
        const nextFrameName = (frame?.textureFrame ?? sprite.frame?.name) as (string | undefined);
        if (!nextFrameName || nextFrameName === lastFrameName) return;
        lastFrameName = nextFrameName;
        applyTrainerDualColorAltBuild(this.scene, sprite, false);
        applyTrainerDualColorAltBuild(this.scene, tintSprite, false);
      };
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        sprite.off("animationupdate", onUpdate);
        sprite.off("animationcomplete", cleanup);
        sprite.off("destroy", cleanup);
      };
      sprite.on("animationupdate", onUpdate);
      sprite.once("animationcomplete", cleanup);
      sprite.once("destroy", cleanup);
      applyTrainerDualColorAltBuild(this.scene, sprite, false);
      applyTrainerDualColorAltBuild(this.scene, tintSprite, false);
    }

    return true;
  }

  playAnim(): Promise<void> {
    return new Promise((resolve) => {
      const trainerAnimConfig: Phaser.Types.Animations.PlayAnimationConfig = {
        key: this.getKey(),
        repeat: 0,
        startFrame: 0,
        frameRate: 100
      };
      const sprites = this.getSprites();
      const tintSprites = this.getTintSprites();

      let animationsToComplete = this.variant === TrainerVariant.DOUBLE && !this.config.doubleOnly ? 2 : 1;
      let completedAnimations = 0;

      const onAnimComplete = () => {
        completedAnimations++;
        if (completedAnimations >= animationsToComplete) {
          resolve();
        }
      };

      if (sprites[0] && tintSprites[0]) {
        const success = this.tryPlaySprite(sprites[0], tintSprites[0], trainerAnimConfig);
        if (success) {
          sprites[0].once('animationcomplete', onAnimComplete);
        } else {
          onAnimComplete();
        }
      } else {
        onAnimComplete();
      }

      if (this.variant === TrainerVariant.DOUBLE && !this.config.doubleOnly) {
        const partnerConfig: Phaser.Types.Animations.PlayAnimationConfig = {
          key: this.getKey(true),
          repeat: 0,
          startFrame: 0,
          frameRate: 15
        };

        if (sprites[1] && tintSprites[1]) {
          const success = this.tryPlaySprite(sprites[1], tintSprites[1], partnerConfig);
          if (success) {
            sprites[1].once('animationcomplete', onAnimComplete);
          } else {
            onAnimComplete();
          }
        } else {
          onAnimComplete();
        }
      }
    });
  }

  getSprites(): Phaser.GameObjects.Sprite[] {
    const ret: Phaser.GameObjects.Sprite[] = [
      this.getAt(0)
    ];
    if (this.variant === TrainerVariant.DOUBLE && !this.config.doubleOnly) {
      ret.push(this.getAt(2));
    }
    return ret;
  }

  getTintSprites(): Phaser.GameObjects.Sprite[] {
    const ret: Phaser.GameObjects.Sprite[] = [
      this.getAt(1)
    ];
    if (this.variant === TrainerVariant.DOUBLE && !this.config.doubleOnly) {
      ret.push(this.getAt(3));
    }
    return ret;
  }

  tint(color: number, alpha?: number, duration?: integer, ease?: string): void {
    const tintSprites = this.getTintSprites();
    tintSprites.map(tintSprite => {
      tintSprite.setTintFill(color);
      tintSprite.setVisible(true);

      if (duration) {
        tintSprite.setAlpha(0);

        this.scene.tweens.add({
          targets: tintSprite,
          alpha: alpha || 1,
          duration: duration,
          ease: ease || "Linear"
        });
      } else {
        tintSprite.setAlpha(alpha);
      }
    });
  }

  untint(duration: integer, ease?: string): void {
    const tintSprites = this.getTintSprites();
    tintSprites.map(tintSprite => {
      if (duration) {
        this.scene.tweens.add({
          targets: tintSprite,
          alpha: 0,
          duration: duration,
          ease: ease || "Linear",
          onComplete: () => {
            tintSprite.setVisible(false);
            tintSprite.setAlpha(1);
          }
        });
      } else {
        tintSprite.setVisible(false);
        tintSprite.setAlpha(1);
      }
    });
  }

  destroy(removeTextures: boolean = false): void {
    if (this.portalSprite) {
      this.portalSprite.destroy();
      this.portalSprite = null;
    }
    super.destroy();
  }
}

export default interface Trainer {
  scene: BattleScene
}