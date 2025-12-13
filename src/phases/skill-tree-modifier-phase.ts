import BattleScene from "#app/battle-scene";
import { Phase } from "#app/phase";
import { PokemonAltBuildModifier } from "#app/modifier/modifier";
import { Mode } from "#app/ui/ui";
import { SkillTreeRewardType, SkillTreeNodeState } from "#app/system/skill-tree-data";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { PathNodeTypeFilter, ModifierTypeOption, modifierTypes, MoveUpgradeModifierTypeGenerator, AddPokemonModifierType, TrainerBondAbilityModifierTypeGenerator, ChampionPokemonStatBoosterModifierTypeGenerator, TeraAbilityModifierTypeGenerator } from "#app/modifier/modifier-type";
import * as Utils from "#app/utils";
import { Abilities } from "#enums/abilities";
import { allAbilities } from "#app/data/ability";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { VoucherType } from "#app/system/voucher";
import { FormChangeItem } from "#enums/form-change-items";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import { QuestUnlockables, QuestState } from "#app/system/game-data.js";
import { PokemonAltBuildDefinition, POKEMON_ALT_BUILDS, PokemonAltBuildId } from "#app/data/pokemon-alt-buid";
import { PlayerPokemon } from "#app/field/pokemon";
import Battle, { BattleType } from "#app/battle";
import { GameModes, getGameMode } from "#app/game-mode";
import { PlayableChampionData } from "#app/system/playable-champions.js";
import { SkillTreeNode } from "#app/system/skill-tree-data.js";
import { SkillTreePhase, SkillTreePhaseConfig, SkillTreeMode, PokemonSelection } from "#app/phases/skill-tree-phase";
import { SkillTreeConfig } from "#app/ui/skill-tree-ui-handler";
import { PermaType } from "#app/modifier/perma-modifiers";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";

interface SkillTreeNodeLike { rewardData: { type: SkillTreeRewardType, data?: any }; name?: string }

export class SkillTreeModifierPhase extends Phase {
  private node: SkillTreeNode;
  private championData: PlayableChampionData;
  private placeholderPokemon: PlayerPokemon | null = null;
  private createdDummyBattle: boolean = false;
  private dummyBattle: Battle | null = null;

  constructor(scene: BattleScene, node: SkillTreeNode, championData: PlayableChampionData) {
    super(scene);
    this.node = node;
    this.championData = championData;
  }

  start(): void {
    super.start();
    this.scene.skillTreeModifierContext = true;
    this.createDummyBattle();
    this.addPlaceholderPokemon();

    if (this.node.rewardData.type === SkillTreeRewardType.ROGUEBALL_RARITY_SELECT) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene,
        0,
        undefined,
        false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.ROGUE_BALL_ITEMS,
        0,
        undefined,
        this.node,
        this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.MASTERBALL_RARITY_SELECT) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene,
        0,
        undefined,
        false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.MASTER_BALL_ITEMS,
        0,
        undefined,
        this.node,
        this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.HEALING_ITEMS) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.HEAL_ITEMS,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.BERRY_ITEMS) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.ITEM_BERRY,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.ABILITY_SWITCHER) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.ABILITY_SWITCHERS,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.GENERAL_ITEMS) {
      this.scene.unshiftPhase(new SelectModifierPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.NONE,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }

    let modifierOptions: ModifierTypeOption[] = [];
    const nodeOffset = this.calculateNodeSeedOffset();
    this.scene.executeWithSeedOffset(() => {
      modifierOptions = this.createSkillTreeModifierOptions();
    }, nodeOffset);

    if (modifierOptions.length === 0) {
      this.removePlaceholderPokemon();
      this.returnToSkillTree();
      this.end();
      return;
    }

     this.scene.unshiftPhase(new SelectModifierPhase(
       this.scene,
       0,
       undefined,
       false,
       () => this.returnToSkillTree(),
       PathNodeTypeFilter.NONE,
       0,
       modifierOptions,
       this.node,
       this.championData
     ));

    this.end();
  }

  private calculateNodeSeedOffset(): number {
    const nodeHash = this.node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = nodeHash * 1000;
    return offset;
  }

  private createSkillTreeModifierOptions(): ModifierTypeOption[] {
    const options: ModifierTypeOption[] = [];

    switch (this.node.rewardData.type) {
      case SkillTreeRewardType.PP_MAX_ITEM:
        options.push(...this.createPPMaxOption());
        break;

      case SkillTreeRewardType.TM_FILTERED:
        const tmOption = this.createTmModifierOption();
        if (tmOption) {
          options.push(tmOption);
        } else {
          const opt = this.getIncompatibleNodeFallbackOption();
          if (opt) options.push(opt);
        }
        break;

      case SkillTreeRewardType.XM_FILTERED:
        const xmOption = this.createXmModifierOption();
        if (xmOption) options.push(xmOption);
        break;

      case SkillTreeRewardType.SIGNATURE_POKEMON:
        const signaturePokemonOptions = this.createMultiplePokemonOptions(() => this.createSignaturePokemonOption(), 4);
        options.push(...signaturePokemonOptions);
        break;

      case SkillTreeRewardType.GENERAL_POKEMON:
        const generalPokemonOptions = this.createMultiplePokemonOptions(() => this.createGeneralPokemonOption(), 3);
        options.push(...generalPokemonOptions);
        break;

      case SkillTreeRewardType.LEGENDARY_POKEMON:
        const legendaryPokemonOption = this.createLegendaryPokemonOption();
        if (legendaryPokemonOption) options.push(legendaryPokemonOption);
        break;

      case SkillTreeRewardType.ABILITY_GRANT:
        const abilityOption = this.createAbilityModifierOption();
        if (abilityOption) options.push(abilityOption);
        break;
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
        const passiveAbilityOption = this.createPassiveAbilityOption();
        if (passiveAbilityOption) options.push(passiveAbilityOption);
        break;

      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        const trainerBondOption = this.createTrainerBondAbilityOption();
        if (trainerBondOption) options.push(trainerBondOption);
        break;

      case SkillTreeRewardType.STAT_BOOST:
        const statBoostOption = this.createStatBoostModifierOption();
        if (statBoostOption) options.push(statBoostOption);
        break;

      case SkillTreeRewardType.MOVE_UPGRADE:
        const moveUpgradeOption = this.createMoveUpgradeOption();
        if (moveUpgradeOption) {
          options.push(moveUpgradeOption);
        } else {
          const moveUpgradeFallback = this.getIncompatibleNodeFallbackOption();
          if (moveUpgradeFallback) options.push(moveUpgradeFallback);
        }
        break;
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC:
        const moveUpgradeSpecificOption = this.createMoveUpgradeSpecificOption();
        if (moveUpgradeSpecificOption) {
          options.push(moveUpgradeSpecificOption);
        } else {
          const moveUpgradeSpecificFallback = this.getIncompatibleNodeFallbackOption();
          if (moveUpgradeSpecificFallback) options.push(moveUpgradeSpecificFallback);
        }
        break;

      case SkillTreeRewardType.MEGA_STONE:
        const megaStoneOption = this.createMegaStoneOption();
        if (megaStoneOption) options.push(megaStoneOption);
        break;
      case SkillTreeRewardType.DYNA_MUSHROOM:
        const dynamaxOption = this.createDynamaxOption();
        if (dynamaxOption) options.push(dynamaxOption);
        break;
      case SkillTreeRewardType.GLITCH_CHANGE:
        const glitchChangeOption = this.createGlitchChangeOption();
        if (glitchChangeOption) options.push(glitchChangeOption);
        break;

      case SkillTreeRewardType.POKEMON_ALT_BUILD:
        const altBuildOption = this.createAltBuildOption();
        if (altBuildOption) options.push(altBuildOption);
        break;

      case SkillTreeRewardType.PERMA_ITEM:
        const permaItemOption = this.createPermaItemOption();
        if (permaItemOption) options.push(permaItemOption);
        break;
      case SkillTreeRewardType.PERMA_MONEY:
        options.push(...this.createPermaMoneyOption());
        break;
      case SkillTreeRewardType.MONEY_REWARD:
        options.push(...this.createMoneyRewardOption());
        break;

      case SkillTreeRewardType.TERA_ABILITY: {
        const opt = this.createTeraAbilityOption();
        if (opt) options.push(opt);
        break;
      }

      case SkillTreeRewardType.SMITTY_ABILITY: {
        const opt = this.createSmittyAbilityOption();
        if (opt) options.push(opt);
        break;
      }

      case SkillTreeRewardType.TYPE_SWITCHER: {
        const opt = this.createTypeSwitcherOption();
        if (opt) options.push(opt);
        break;
      }

      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        this.grantGlitchFormUnlockImmediate();
        break;
      }

      case SkillTreeRewardType.ESSENCE_BUNDLE: {
        this.grantEssenceBundleImmediate();
        break;
      }

      case SkillTreeRewardType.SKILL_POINTS: {
        this.grantSkillPointsImmediate();
        break;
      }

      case SkillTreeRewardType.SKILL_TREE_TOKENS: {
        this.grantSkillTreeTokensImmediate();
        break;
      }

      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
        options.push(...this.createTypeBoosterOption());
        break;
      case SkillTreeRewardType.GOLDEN_POKEBALL:
        options.push(...this.createGoldenPokeballOption());
        break;
      case SkillTreeRewardType.MASTER_BALL:
        options.push(...this.createMasterBallOption());
        break;
      case SkillTreeRewardType.EGG_VOUCHER:
        options.push(...this.createEggVoucherOption());
        break;
      case SkillTreeRewardType.TERA_TYPE:
        options.push(...this.createTeraTypeOption());
        break;

      case SkillTreeRewardType.MEMORY_MUSHROOM:
        options.push(...this.createMemoryMushroomOption());
        break;

      case SkillTreeRewardType.BATON_ITEM:
        options.push(...this.createBatonOption());
        break;

      case SkillTreeRewardType.ROGUE_BALL:
        options.push(...this.createRogueBallOption());
        break;
    }

    return options;
  }

  private createTmModifierOption(): ModifierTypeOption | null {
    const moveId = this.node.rewardData.data.moveId;
    const party = this.scene.getParty();

    const canAnyPokemonLearn = party.some(pokemon => {
      if (!pokemon) return false;
      if (!pokemon.compatibleTms || pokemon.compatibleTms.indexOf(moveId) === -1) return false;
      if (pokemon.getMoveset().some(m => m?.moveId === moveId)) return false;
      return true;
    });

    if (!canAnyPokemonLearn) {
      return null;
    }

    const generator = modifierTypes.CHAMPION_TM(this.championData);
    const tmModifierType = generator.generateType(party, [moveId]);

    if (tmModifierType) {
      return new ModifierTypeOption(tmModifierType, 0, 0);
    }
    return null;
  }

  private createXmModifierOption(): ModifierTypeOption | null {
    try {
      const anyTmGen = (modifierTypes as any).ANY_TM as (() => any);
      if (typeof anyTmGen === "function") {
        const gen = anyTmGen();
        const xmType = gen.generateType(this.scene.getParty(), [this.node.rewardData?.data?.moveId]);
        if (xmType) return new ModifierTypeOption(xmType, 0, 0);
      }
    } catch {}
    try {
      const generator = modifierTypes.CHAMPION_XM(this.championData);
      const xmModifierType = generator.generateType(this.scene.getParty(), [this.node.rewardData?.data?.moveId]);
      if (xmModifierType) return new ModifierTypeOption(xmModifierType, 0, 0);
    } catch {}
    return null;
  }

  private createSignaturePokemonOption(): ModifierTypeOption | null {
    const generator = modifierTypes.CHAMPION_SIGNATURE_POKEMON(this.championData);
    const pokemonModifierType = generator.generateType(this.scene.getParty(), [this.node.rewardData.data.species]);

    if (pokemonModifierType) {
      return new ModifierTypeOption(pokemonModifierType, 0, 0);
    }
    return null;
  }

  private createGeneralPokemonOption(): ModifierTypeOption | null {
    const generator = modifierTypes.CHAMPION_GENERAL_POKEMON(this.championData);
    const pokemonModifierType = generator.generateType(this.scene.getParty());

    if (pokemonModifierType) {
      return new ModifierTypeOption(pokemonModifierType, 0, 0);
    }
    return null;
  }

  private createLegendaryPokemonOption(): ModifierTypeOption | null {
    const addPokemonType = new AddPokemonModifierType(this.node.rewardData.data.species);
    return new ModifierTypeOption(addPokemonType, 0, 0);
  }

  private createMultiplePokemonOptions(createOptionFn: () => ModifierTypeOption | null, count: number = 4): ModifierTypeOption[] {
    const options: ModifierTypeOption[] = [];
    const baseOffset = (this.scene as any).rngOffset || 0;
    for (let i = 0; i < count; i++) {
      let option: ModifierTypeOption | null = null;
      const iterationOffset = i * 100;
      this.scene.executeWithSeedOffset(() => {
        option = createOptionFn();
        if (option && option.type) {
          const pokemonType = option.type as any;
          if (pokemonType.getPokemon && typeof pokemonType.getPokemon === 'function') {
            const pokemon = pokemonType.getPokemon();
            if (pokemon) {
            }
          }
        }
      }, baseOffset + iterationOffset);
      if (option) {
        options.push(option);
      }
    }
    return options;
  }

  private createAbilityModifierOption(): ModifierTypeOption | null {
    const generator = modifierTypes.CHAMPION_ABILITY(this.championData);
    const abilityModifierType = generator.generateType(this.scene.getParty(), [this.node.rewardData.data.abilityId]);
    if (abilityModifierType) {
      if (!abilityModifierType.id) {
        abilityModifierType.withIdFromFunc(() => modifierTypes.CHAMPION_ABILITY(this.championData));
      }
      return new ModifierTypeOption(abilityModifierType, 0, 0);
    }
    return null;
  }

  private createPassiveAbilityOption(): ModifierTypeOption | null {
    const provided = this.node.rewardData?.data?.abilityId as Abilities | undefined;
    const chosen = provided ?? SkillTreeSelectors.pickPassiveAbility(this.championData);
    const gen = (modifierTypes as any).ANY_PASSIVE_ABILITY?.();
    if (!gen) return null;
    const type = gen.generateType(this.scene.getParty(), chosen != null ? [allAbilities[chosen]] : undefined);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc((modifierTypes as any).ANY_PASSIVE_ABILITY);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createPermaMoneyOption(): ModifierTypeOption[] {
    const t = (modifierTypes as any).SELECTABLE_PMONEY_3?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }
  private createMoneyRewardOption(): ModifierTypeOption[] {
    const t = (modifierTypes as any).RELIC_GOLD?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }
  private createTypeBoosterOption(): ModifierTypeOption[] {
    const gen = (modifierTypes as any).ATTACK_TYPE_BOOSTER?.();
    if (!gen) return [];
    const providedType = this.node.rewardData?.data?.type as Type | undefined;
    const selectedType = providedType ?? SkillTreeSelectors.pickTypeBoosterType(this.championData);
    const t = gen.generateType(this.scene.getParty(), [selectedType]);
    if (t) {
      if (!t.id) {
        t.withIdFromFunc((modifierTypes as any).ATTACK_TYPE_BOOSTER);
      }
      return [new ModifierTypeOption(t, 0, 0)];
    }
    return [];
  }
  private createGoldenPokeballOption(): ModifierTypeOption[] {
    const t = (modifierTypes as any).GOLDEN_POKEBALL?.();
    if (t && !t.id) {
      t.withIdFromFunc(modifierTypes.GOLDEN_POKEBALL);
    }
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }
  private createEggVoucherOption(): ModifierTypeOption[] {
    const tier = this.node.rewardData.data.tier;
    let key: keyof typeof modifierTypes = 'VOUCHER';
    if (tier === VoucherType.PLUS) key = 'VOUCHER_PLUS' as any;
    if (tier === VoucherType.PREMIUM) key = 'VOUCHER_PREMIUM' as any;
    const t = (modifierTypes as any)[key]?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }
  private createTeraTypeOption(): ModifierTypeOption[] {
    const gen = (modifierTypes as any).TERA_SHARD?.();
    if (!gen?.generateType) return [];
    const providedType = this.node.rewardData?.data?.type as Type | undefined;
    const selectedType = providedType ?? (this.championData.preferredTeraTypes?.[0] ?? this.championData.type1);
    const t = gen.generateType(this.scene.getParty(), [selectedType]);
    if (t) {
      if (!t.id) {
        t.withIdFromFunc((modifierTypes as any).TERA_SHARD);
      }
      return [new ModifierTypeOption(t, 0, 0)];
    }
    return [];
  }

  private createMemoryMushroomOption(): ModifierTypeOption[] {
    const t = modifierTypes.MEMORY_MUSHROOM?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }

  private createBatonOption(): ModifierTypeOption[] {
    const t = modifierTypes.BATON?.();
    if (t && !t.id) {
      t.withIdFromFunc(modifierTypes.BATON);
    }
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }

  private createRogueBallOption(): ModifierTypeOption[] {
    const t = modifierTypes.ROGUE_BALL?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }

  private createPPMaxOption(): ModifierTypeOption[] {
    const t = modifierTypes.PP_MAX?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }

  private createTrainerBondAbilityOption(): ModifierTypeOption | null {
    const gen = modifierTypes.TRAINER_BOND_ABILITY();
    const gender = this.scene.gameData?.gender;
    const type = gen.generateType(this.scene.getParty(), [
      this.championData.id,
      this.node.rewardData.data.abilityId,
      this.node.rewardData.data.activationChance || 0.15,
      gender
    ]);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(modifierTypes.TRAINER_BOND_ABILITY);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createStatBoostModifierOption(): ModifierTypeOption | null {
    const gen = modifierTypes.CHAMPION_POKEMON_STAT_BOOST();
    const championTypes = [this.championData.type1, this.championData.type2].filter(Boolean) as Type[];
    const type = gen.generateType(this.scene.getParty(), [
      this.championData.id,
      this.node.rewardData.data.stats,
      this.node.rewardData.data.boostPercent || 0.01,
      championTypes
    ]);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(modifierTypes.CHAMPION_POKEMON_STAT_BOOST);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createMoveUpgradeOption(): ModifierTypeOption | null {
    const filterUpgrades = this.node.rewardData.data.filterUpgrades;
    if (!filterUpgrades) return null;
    const gen = modifierTypes.MOVE_UPGRADE();
    const type = gen.generateType(this.scene.getParty());
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(modifierTypes.MOVE_UPGRADE);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createMoveUpgradeSpecificOption(): ModifierTypeOption | null {
    const data = this.node.rewardData?.data;
    const filterUpgrades = data?.filterUpgrades ?? data;
    if (!filterUpgrades) return null;
    const gen = modifierTypes.MOVE_UPGRADE();
    const type = gen.generateType(this.scene.getParty());
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(modifierTypes.MOVE_UPGRADE);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createMegaStoneOption(): ModifierTypeOption | null {
    const megaStone = this.node.rewardData.data.megaStone;
    const formChangeGenFactory = (modifierTypes as any).FORM_CHANGE_ITEM?.();
    if (formChangeGenFactory) {
      const formChangeType = formChangeGenFactory.generateType(this.scene.getParty(), [megaStone]);
      if (formChangeType) {
        if (!formChangeType.id) {
          formChangeType.withIdFromFunc((modifierTypes as any).FORM_CHANGE_ITEM);
        }
        return new ModifierTypeOption(formChangeType, 0, 0);
      }
    }
    return null;
  }

  private createDynamaxOption(): ModifierTypeOption | null {
    const formChangeGenFactory = (modifierTypes as any).FORM_CHANGE_ITEM?.();
    if (formChangeGenFactory) {
      const formChangeType = formChangeGenFactory.generateType(this.scene.getParty(), [FormChangeItem.MAX_MUSHROOMS]);
      if (formChangeType) {
        if (!formChangeType.id) {
          formChangeType.withIdFromFunc((modifierTypes as any).FORM_CHANGE_ITEM);
        }
        return new ModifierTypeOption(formChangeType, 0, 0);
      }
    }
    return null;
  }
  private createGlitchChangeOption(): ModifierTypeOption | null {
    const formChangeGenFactory = (modifierTypes as any).FORM_CHANGE_ITEM?.();
    if (formChangeGenFactory) {
      const formChangeType = formChangeGenFactory.generateType(this.scene.getParty(), [FormChangeItem.GLITCHI_GLITCHI_FRUIT]);
      if (formChangeType) {
        if (!formChangeType.id) {
          formChangeType.withIdFromFunc((modifierTypes as any).FORM_CHANGE_ITEM);
        }
        return new ModifierTypeOption(formChangeType, 0, 0);
      }
    }
    return null;
  }

  private createAltBuildOption(): ModifierTypeOption | null {
    const altBuildData = this.createAltBuildDefinition();
    const altBuildId = this.node.rewardData.data.altBuildId as PokemonAltBuildId;
    const storedRank = this.node.rewardData.data.rank || 1;

    let proposedRank = storedRank;
    const party = this.scene.getParty();
    const matchingPokemon = party.find(p => p.altBuildId === altBuildId);

    if (matchingPokemon && matchingPokemon.altBuildRank) {
      const currentRank = matchingPokemon.altBuildRank;
      proposedRank = Math.max(currentRank + 1, storedRank);
    }

    if (proposedRank > 10) {
      const rarerCandyType = modifierTypes.RARER_CANDY?.();
      return rarerCandyType ? new ModifierTypeOption(rarerCandyType, 0, 0) : null;
    }

    const effectiveRank = Math.min(10, proposedRank);
    const gen = modifierTypes.POKEMON_ALT_BUILD();
    const type = gen.generateType(party, [altBuildId, effectiveRank]);
    if (type && !type.id) {
      type.withIdFromFunc(modifierTypes.POKEMON_ALT_BUILD);
    }
    return type ? new ModifierTypeOption(type, 0, 0) : null;
  }

  private createPermaItemOption(): ModifierTypeOption | null {
    const permaType = this.node.rewardData.data.permaType as PermaType;
    const permaFactoryName = this.resolvePermaFactoryName(permaType);
    const permaFactory = (modifierTypes as any)[permaFactoryName] as (() => any) | undefined;
    if (permaFactory) {
      const gen = permaFactory();
      if (gen && gen.generateType) {
        const type = gen.generateType(this.scene.getParty());
        if (type && !type.id) {
          type.withIdFromFunc(permaFactory);
        }
        return type ? new ModifierTypeOption(type, 0, 0) : null;
      }
      return null;
    }
    return null;
  }

  private resolvePermaFactoryName(permaType: PermaType): string {
    switch (permaType) {
      case PermaType.PERMA_NEW_NORMAL: return "PERMA_NEW_NORMAL";
      case PermaType.PERMA_PARTY_ABILITY: return "PERMA_PARTY_ABILITY";
      case PermaType.PERMA_REROLL_COST_1: return "PERMA_REROLL_COST_1";
      case PermaType.PERMA_SHOW_REWARDS_1: return "PERMA_SHOW_REWARDS_1";
      default: return "PERMA_NEW_NORMAL";
    }
  }

  private createAltBuildDefinition(): PokemonAltBuildDefinition {
    const altBuildId = this.node.rewardData.data.altBuildId as PokemonAltBuildId;
    return POKEMON_ALT_BUILDS[altBuildId];
  }

  private checkCompletionRequirements(config: any): boolean {
    if (config.mode !== SkillTreeMode.POKEMON_SELECTION) {
      return false;
    }

    const activeSkillTree = config.activeSkillTree;
    const nodes = config.nodes;

    if (!activeSkillTree?.unlockedNodes || !nodes) {
      return false;
    }

    const hasSignature = nodes.some((n: any) =>
      activeSkillTree.unlockedNodes.has(n.id) &&
      n.rewardData.type === SkillTreeRewardType.SIGNATURE_POKEMON
    );
    const hasGeneral = nodes.some((n: any) =>
      activeSkillTree.unlockedNodes.has(n.id) &&
      n.rewardData.type === SkillTreeRewardType.GENERAL_POKEMON
    );

    return hasSignature && hasGeneral;
  }

  private returnToSkillTree(): void {
    this.scene.skillTreeModifierContext = false;
    if (!this.scene.reroll) {
      this.removePlaceholderPokemon();
    }

    const originalConfig = (this.scene.gameData as any).tempSkillTreeConfig as SkillTreeConfig;

    if (originalConfig) {

      const isPokemonSelectionComplete = (originalConfig.mode === SkillTreeMode.POKEMON_SELECTION || originalConfig.mode === "POKEMON_SELECTION")
        && this.checkCompletionRequirements(originalConfig);

      if (isPokemonSelectionComplete) {
        const activeSkillTree = originalConfig.activeSkillTree;
        const nodes = originalConfig.nodes;

        if (activeSkillTree && nodes) {
          const unlockedPokemonNodes = nodes.filter((n: any) =>
            n.depth === 1 &&
            [SkillTreeRewardType.SIGNATURE_POKEMON, SkillTreeRewardType.GENERAL_POKEMON].includes(n.rewardData.type) &&
            !activeSkillTree.unlockedNodes.has(n.id)
          );

          unlockedPokemonNodes.forEach((node: any) => {
            activeSkillTree.unlockedNodes.add(node.id);
            node.state = SkillTreeNodeState.UNLOCKED;
            node.unlocked = true;
          });
        }
      }

      const phaseConfig: SkillTreePhaseConfig = {
        mode: (originalConfig.mode === SkillTreeMode.POKEMON_SELECTION || originalConfig.mode === "POKEMON_SELECTION")
          ? (isPokemonSelectionComplete
              ? SkillTreeMode.INITIAL_ACCESS
              : SkillTreeMode.POKEMON_SELECTION)
          : originalConfig.mode,
        requiredSelections: originalConfig.requiredSelections,
        onComplete: (selections?: PokemonSelection[]) => {
          this.cleanupDummyBattle();
          if (originalConfig.phaseOnComplete) {
            originalConfig.phaseOnComplete(selections);
          } else if (originalConfig.onSelectionsComplete) {
            originalConfig.onSelectionsComplete();
          } else if (originalConfig.onClose && originalConfig.mode !== SkillTreeMode.BATTLE_ACCESS) {
            originalConfig.onClose();
          }
          (this.scene.gameData as any).tempSkillTreeConfig = undefined;
        },
        onCancel: () => {
          this.cleanupDummyBattle();
          if (originalConfig.onCancel) {
            originalConfig.onCancel();
          }
          (this.scene.gameData as any).tempSkillTreeConfig = undefined;
        }
      };

      const nextPhase = this.scene.getNextPhase();
      const pendingSkillTree = nextPhase instanceof SkillTreePhase || !!this.scene.findPhase(p => p instanceof SkillTreePhase);
      const isBattleAccess = originalConfig.mode === SkillTreeMode.BATTLE_ACCESS;
      if (!pendingSkillTree || !isBattleAccess) {
        this.scene.unshiftPhase(new SkillTreePhase(this.scene, phaseConfig));
      }
    } else {
      const activeSkillTree = this.scene.gameData.activeSkillTree;
      if (activeSkillTree) {
        const fallbackConfig: SkillTreeConfig = {
          mode: SkillTreeMode.POKEMON_SELECTION,
          activeSkillTree,
          championData: this.championData,
        };
        this.scene.ui.setMode(Mode.SKILL_TREE, fallbackConfig);
      }
    }
  }

  private createDummyBattle(): void {
    if (!this.scene.currentBattle) {
      this.scene.currentBattle = new Battle(
        getGameMode(GameModes.CLASSIC),
        1,
        BattleType.WILD,
        null,
        false,
        this.scene
      );
      this.createdDummyBattle = true;
      this.dummyBattle = this.scene.currentBattle;
    }
  }

  private addPlaceholderPokemon(): void {
    const party = this.scene.getParty();

    if (party.length === 0) {

      this.placeholderPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(Species.UNOWN), 1, undefined, undefined, undefined, false);
      this.placeholderPokemon.setVisible(false);
      party.push(this.placeholderPokemon);
      this.placeholderPokemon.loadAssets();
    }
  }

  private removePlaceholderPokemon(): void {
    if (this.placeholderPokemon) {
      const party = this.scene.getParty();
      const index = party.indexOf(this.placeholderPokemon);
      if (index !== -1) {
        party.splice(index, 1);
        this.placeholderPokemon.destroy();
      }
      this.placeholderPokemon = null;
    }
  }

  private cleanupDummyBattle(): void {
    if (this.createdDummyBattle) {
      if (this.scene.currentBattle === this.dummyBattle) {
        this.scene.currentBattle = null;
      }
      this.createdDummyBattle = false;
      this.dummyBattle = null;
    }
  }

  private createTeraAbilityOption(): ModifierTypeOption | null {
    const abilityId = this.node.rewardData.data.abilityId as Abilities;
    const teraType = this.node.rewardData.data.type as Type;
    const activationChance = this.node.rewardData.data.activationChance ?? 0.15;
    const gen = modifierTypes.TERA_ABILITY();
    const type = gen.generateType(this.scene.getParty(), [this.championData.id, abilityId, teraType, activationChance]);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(modifierTypes.TERA_ABILITY);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createSmittyAbilityOption(): ModifierTypeOption | null {
    const provided = this.node.rewardData?.data?.abilityId as Abilities | undefined;
    const gen = modifierTypes.CHAMPION_SMITTY_ABILITY(this.championData);
    const type = gen.generateType(this.scene.getParty(), provided != null ? [provided] : undefined);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc(() => modifierTypes.CHAMPION_SMITTY_ABILITY(this.championData));
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createTypeSwitcherOption(): ModifierTypeOption | null {
    const data = this.node.rewardData.data || {};
    const provided: Type[] | undefined = Array.isArray(data.types)
      ? data.types as Type[]
      : (data.type != null ? [data.type as Type] : undefined);
    const chosen = provided ?? SkillTreeSelectors.pickTypeSwitcherTypes(this.championData);
    const primary = chosen[0] ?? null;
    const secondary = chosen[1] ?? null;
    const gen = (modifierTypes as any).TYPE_SWITCHER();
    const type = gen.generateType(this.scene.getParty(), [primary, secondary]);
    if (type) {
      if (!type.id) {
        type.withIdFromFunc((modifierTypes as any).TYPE_SWITCHER);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private grantGlitchFormUnlockImmediate(): void {
    const questId = this.node.rewardData?.data?.unlockableId as QuestUnlockables;

    if (questId && questId in QuestUnlockables) {
        const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(questId);

        if (!this.scene.gameData.activeSkillTree.sessionQuestUnlockables) {
            this.scene.gameData.activeSkillTree.sessionQuestUnlockables = {};
        }
        this.scene.gameData.activeSkillTree.sessionQuestUnlockables[questId] = {
            questUnlockData: questUnlockData
        };

        const species = getPokemonSpecies(questUnlockData.rewardId as Species);
        const formName = species.getGlitchFormName(true, undefined, questUnlockData.rewardType)?.toLowerCase();

        this.scene.ui.setMode(Mode.REWARD_OBTAINED, {
            type: RewardObtainedType.FORM,
            name: formName,
            isGlitch: true
        });
    }
  }

  private grantEssenceBundleImmediate(): void {
    const provided = this.node.rewardData?.data;
    const picked = provided?.type != null && provided?.amount != null
      ? { type: provided.type as Type, amount: provided.amount as number }
      : SkillTreeSelectors.pickEssenceBundle(this.championData);
    this.scene.ui.setMode(Mode.REWARD_OBTAINED, { type: RewardObtainedType.ESSENCE_BUNDLE, amount: picked.amount });
  }

  private grantSkillPointsImmediate(): void {
    const amount = this.node.rewardData?.data?.amount ?? SkillTreeSelectors.pickSkillPoints();
    this.scene.ui.setMode(Mode.REWARD_OBTAINED, { type: RewardObtainedType.SKILL_POINTS, amount });
  }

  private grantSkillTreeTokensImmediate(): void {
    const amount = this.node.rewardData?.data?.amount ?? SkillTreeSelectors.pickSkillTreeTokens();
    this.scene.ui.setMode(Mode.REWARD_OBTAINED, { type: RewardObtainedType.SKILL_TREE_TOKENS, amount });
  }

  private getIncompatibleNodeFallbackOption(): ModifierTypeOption | null {
    const fallbackPool = [
      { type: modifierTypes.RARER_CANDY, weight: 2000 },
      { type: modifierTypes.REVIVER_SEED, weight: 1800 },
      { type: modifierTypes.VOUCHER, weight: 1500 },
      { type: modifierTypes.SCOPE_LENS, weight: 1700 },
      { type: modifierTypes.ROGUE_BALL, weight: 1500 },
      { type: modifierTypes.CANDY_JAR, weight: 400 },
      { type: modifierTypes.TERA_ORB, weight: 350 },
      { type: modifierTypes.VOUCHER_PLUS, weight: 338 },
      { type: modifierTypes.MASTER_BALL, weight: 10 },
      { type: modifierTypes.MEGA_BRACELET, weight: 1 },
      { type: modifierTypes.DYNAMAX_BAND, weight: 1 }
    ];

    const totalWeight = fallbackPool.reduce((sum, item) => sum + item.weight, 0);
    let r = Utils.randSeedInt(totalWeight);

    for (const item of fallbackPool) {
      r -= item.weight;
      if (r < 0) {
        const t = item.type();
        return t ? new ModifierTypeOption(t, 0, 0) : null;
      }
    }

    const t = modifierTypes.RARER_CANDY();
    return t ? new ModifierTypeOption(t, 0, 0) : null;
  }
}